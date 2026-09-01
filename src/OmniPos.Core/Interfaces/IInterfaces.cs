using System.Linq.Expressions;
using OmniPos.Core.Entities;

namespace OmniPos.Core.Interfaces;

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<T> AddAsync(T entity, CancellationToken ct = default);
    Task UpdateAsync(T entity, CancellationToken ct = default);
    Task DeleteAsync(T entity, CancellationToken ct = default);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default);
}

public interface IUnitOfWork : IDisposable
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitTransactionAsync(CancellationToken ct = default);
    Task RollbackTransactionAsync(CancellationToken ct = default);
}

public interface IBackupService
{
    Task<string> CreateLocalEncryptedBackupAsync(string triggerSource, CancellationToken ct = default);
    Task<bool> UploadBackupToGoogleDriveAsync(string localEncryptedFilePath, CancellationToken ct = default);
    Task<bool> RestoreFromBackupAsync(string backupFilePath, CancellationToken ct = default);
}

public interface IPrintingService
{
    Task<bool> PrintReceiptAsync(string orderId, CancellationToken ct = default);
    Task<bool> PrintKitchenTicketAsync(string orderId, string? station = null, CancellationToken ct = default);
    Task<bool> OpenCashDrawerAsync(CancellationToken ct = default);
    Task<bool> PrintTestSlipAsync(CancellationToken ct = default);
}

public interface IEncryptor
{
    byte[] EncryptBytes(byte[] plainData, string masterKey);
    byte[] DecryptBytes(byte[] cipherData, string masterKey);
    Task EncryptFileAsync(string inputFilePath, string outputEncryptedPath, string masterKey);
    Task DecryptFileAsync(string inputEncryptedPath, string outputDecryptedPath, string masterKey);
}
