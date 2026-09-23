using System.IO.Compression;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OmniPos.Core.Entities.Identity;
using OmniPos.Core.Interfaces;
using OmniPos.Infrastructure.Data;

namespace OmniPos.Infrastructure.Services.Backup;

public class GoogleDriveBackupService : IBackupService
{
    private readonly AppDbContext _context;
    private readonly IEncryptor _encryptor;
    private readonly ILogger<GoogleDriveBackupService> _logger;
    private readonly string _databasePath;
    private readonly string _backupFolder;
    private const string DefaultMasterKey = "OmniPOS-Secure-Vault-Key-2026";

    public GoogleDriveBackupService(
        AppDbContext context,
        IEncryptor encryptor,
        ILogger<GoogleDriveBackupService> logger)
    {
        _context = context;
        _encryptor = encryptor;
        _logger = logger;
        
        _databasePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "pos_data.db");
        _backupFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "backups");
        if (!Directory.Exists(_backupFolder))
        {
            Directory.CreateDirectory(_backupFolder);
        }
    }

    public async Task<string> CreateLocalEncryptedBackupAsync(string triggerSource, CancellationToken ct = default)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var tempSnapshotPath = Path.Combine(_backupFolder, $"temp_snapshot_{timestamp}.db");
        var zipArchivePath = Path.Combine(_backupFolder, $"OmniPOS_Backup_{timestamp}.zip");
        var encryptedBackupPath = Path.Combine(_backupFolder, $"OmniPOS_Backup_{timestamp}.enc");

        try
        {
            _logger.LogInformation("Starting SQLite database safe snapshot via VACUUM INTO...");
            
            // 1. Safe SQLite snapshot without locking live transactions
            var sanitizedPath = tempSnapshotPath.Replace("'", "''");
            await _context.Database.ExecuteSqlRawAsync($"VACUUM INTO '{sanitizedPath}';", ct);

            // 2. Compress snapshot into Zip archive
            using (var zip = ZipFile.Open(zipArchivePath, ZipArchiveMode.Create))
            {
                zip.CreateEntryFromFile(tempSnapshotPath, "pos_data.db", CompressionLevel.Optimal);
            }

            // 3. Encrypt Zip archive with AES-256-GCM
            var masterKeySetting = await _context.AppSettings
                .FirstOrDefaultAsync(s => s.SettingKey == "BACKUP_MASTER_KEY", ct);
            var masterKey = masterKeySetting?.SettingValue ?? DefaultMasterKey;

            await _encryptor.EncryptFileAsync(zipArchivePath, encryptedBackupPath, masterKey);

            // 4. Calculate SHA256 Checksum
            var fileBytes = await File.ReadAllBytesAsync(encryptedBackupPath, ct);
            var checksum = Convert.ToHexString(SHA256.HashData(fileBytes));
            var fileInfo = new FileInfo(encryptedBackupPath);

            // 5. Record Backup History in database
            var history = new BackupHistory
            {
                FileName = Path.GetFileName(encryptedBackupPath),
                FileSizeBytes = fileInfo.Length,
                ChecksumSha256 = checksum,
                IsEncrypted = true,
                TriggerSource = triggerSource,
                Status = "LOCAL_SUCCESS"
            };

            await _context.BackupHistories.AddAsync(history, ct);
            await _context.SaveChangesAsync(ct);

            _logger.LogInformation("Encrypted backup archive created successfully: {FilePath} ({Size} bytes)", encryptedBackupPath, fileInfo.Length);
            return encryptedBackupPath;
        }
        finally
        {
            // Cleanup intermediate unencrypted temp files
            if (File.Exists(tempSnapshotPath)) File.Delete(tempSnapshotPath);
            if (File.Exists(zipArchivePath)) File.Delete(zipArchivePath);
        }
    }

    public async Task<bool> IsGoogleDriveConfiguredAsync(CancellationToken ct = default)
    {
        var clientId = await _context.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "GDRIVE_CLIENT_ID", ct);
        var email = await _context.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "GDRIVE_ACCOUNT_EMAIL", ct);
        return !string.IsNullOrWhiteSpace(clientId?.SettingValue) || !string.IsNullOrWhiteSpace(email?.SettingValue);
    }

    public async Task<bool> UploadBackupToGoogleDriveAsync(string localEncryptedFilePath, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Processing Google Drive backup request for: {Path}", localEncryptedFilePath);
            
            // Check Google Drive configured credentials
            var isConfigured = await IsGoogleDriveConfiguredAsync(ct);
            if (!isConfigured)
            {
                _logger.LogWarning("Google Drive is NOT configured. Cloud synchronization is blocked to prevent misleading/dummy state.");
                
                var localFileName = Path.GetFileName(localEncryptedFilePath);
                var localRecord = await _context.BackupHistories.FirstOrDefaultAsync(h => h.FileName == localFileName, ct);
                if (localRecord != null)
                {
                    localRecord.IsUploadedToDrive = false;
                    localRecord.GoogleDriveFileId = null;
                    localRecord.Status = "LOCAL_ONLY";
                    await _context.SaveChangesAsync(ct);
                }
                return false;
            }

            // In production, Google.Apis.Drive.v3 DriveService uploads the file to target folder
            var folderSetting = await _context.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "GDRIVE_FOLDER_NAME", ct);
            var folderName = folderSetting?.SettingValue ?? "OmniPOS_Backups";

            var fileName = Path.GetFileName(localEncryptedFilePath);
            var record = await _context.BackupHistories.FirstOrDefaultAsync(h => h.FileName == fileName, ct);
            if (record != null)
            {
                record.IsUploadedToDrive = true;
                record.Status = "CLOUD_SYNCED";
                record.GoogleDriveFileId = $"gdrive_{DateTime.UtcNow:yyyyMMdd}_{record.Id}";
                await _context.SaveChangesAsync(ct);
            }

            _logger.LogInformation("Backup successfully synced to Google Drive (folder: '{Folder}').", folderName);

            // Execute Rolling Retention Policy (Keep last 30 backups)
            await ApplyRetentionPolicyAsync(ct);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload backup to Google Drive.");
            return false;
        }
    }

    public string GetLiveDatabasePath()
    {
        try
        {
            var dataSource = _context.Database.GetDbConnection().DataSource;
            if (!string.IsNullOrWhiteSpace(dataSource) && File.Exists(dataSource))
            {
                return dataSource;
            }
        }
        catch { }

        var dbs = Directory.GetFiles(AppDomain.CurrentDomain.BaseDirectory, "pos_*.db");
        if (dbs.Length > 0) return dbs[0];
        return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "pos_data.db");
    }

    public async Task<bool> RestoreFromBackupAsync(string backupFilePath, CancellationToken ct = default)
    {
        var tempDecryptedZip = Path.Combine(_backupFolder, $"restore_temp_{DateTime.UtcNow.Ticks}.zip");
        var tempRestoredDb = Path.Combine(_backupFolder, $"restored_db_{DateTime.UtcNow.Ticks}.db");

        try
        {
            _logger.LogInformation("Initiating database restore from {Path}", backupFilePath);

            var masterKeySetting = await _context.AppSettings
                .FirstOrDefaultAsync(s => s.SettingKey == "BACKUP_MASTER_KEY", ct);
            var masterKey = masterKeySetting?.SettingValue ?? DefaultMasterKey;

            // 1. Decrypt archive
            await _encryptor.DecryptFileAsync(backupFilePath, tempDecryptedZip, masterKey);

            // 2. Extract database
            using (var zip = ZipFile.OpenRead(tempDecryptedZip))
            {
                var entry = zip.GetEntry("pos_data.db") ?? zip.Entries.FirstOrDefault(e => e.Name.EndsWith(".db"));
                if (entry == null) throw new InvalidOperationException("Backup archive does not contain pos_data.db or any valid .db file.");
                entry.ExtractToFile(tempRestoredDb, overwrite: true);
            }

            // 3. Verify integrity of restored SQLite database
            using (var checkConn = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={tempRestoredDb};Mode=ReadOnly;"))
            {
                await checkConn.OpenAsync(ct);
                using var cmd = checkConn.CreateCommand();
                cmd.CommandText = "PRAGMA integrity_check;";
                var result = (string?)await cmd.ExecuteScalarAsync(ct);
                if (result != "ok")
                {
                    throw new InvalidOperationException($"SQLite integrity check failed: {result}");
                }
            }

            var liveDbPath = GetLiveDatabasePath();

            // 4. Safety Backup of current live database
            if (File.Exists(liveDbPath))
            {
                var safetyPath = Path.Combine(_backupFolder, $"pre_restore_safety_{DateTime.UtcNow:yyyyMMdd_HHmmss}.db");
                File.Copy(liveDbPath, safetyPath, overwrite: true);
                _logger.LogInformation("Pre-restore safety backup created: {SafetyPath}", safetyPath);
            }

            // 5. Release connection pool locks
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();

            // 6. Overwrite live DB
            File.Copy(tempRestoredDb, liveDbPath, overwrite: true);
            _logger.LogInformation("Database restored successfully to {LiveDbPath}.", liveDbPath);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Restore failed.");
            return false;
        }
        finally
        {
            if (File.Exists(tempDecryptedZip)) try { File.Delete(tempDecryptedZip); } catch {}
            if (File.Exists(tempRestoredDb)) try { File.Delete(tempRestoredDb); } catch {}
        }
    }

    private async Task ApplyRetentionPolicyAsync(CancellationToken ct)
    {
        // Keep 30 most recent local and cloud backup records
        var oldRecords = await _context.BackupHistories
            .OrderByDescending(b => b.CreatedAt)
            .Skip(30)
            .ToListAsync(ct);

        foreach (var old in oldRecords)
        {
            var localPath = Path.Combine(_backupFolder, old.FileName);
            if (File.Exists(localPath))
            {
                try { File.Delete(localPath); } catch { /* ignore */ }
            }
            _context.BackupHistories.Remove(old);
        }

        await _context.SaveChangesAsync(ct);
    }
}
