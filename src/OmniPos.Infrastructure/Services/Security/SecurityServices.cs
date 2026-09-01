using System.Security.Cryptography;
using System.Text;
using OmniPos.Core.Interfaces;

namespace OmniPos.Infrastructure.Services.Security;

public class Aes256Encryptor : IEncryptor
{
    private const int KeySize = 32; // 256 bits
    private const int NonceSize = 12; // 96 bits for GCM
    private const int TagSize = 16; // 128 bits
    private const int SaltSize = 16;
    private const int Iterations = 50_000;

    private static byte[] DeriveKey(string password, byte[] salt)
    {
        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);
        return pbkdf2.GetBytes(KeySize);
    }

    public byte[] EncryptBytes(byte[] plainData, string masterKey)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] nonce = RandomNumberGenerator.GetBytes(NonceSize);
        byte[] key = DeriveKey(masterKey, salt);

        byte[] cipherData = new byte[plainData.Length];
        byte[] tag = new byte[TagSize];

        using (var aesGcm = new AesGcm(key, TagSize))
        {
            aesGcm.Encrypt(nonce, plainData, cipherData, tag);
        }

        // Layout: [Salt (16)] + [Nonce (12)] + [Tag (16)] + [CipherData (N)]
        byte[] result = new byte[SaltSize + NonceSize + TagSize + cipherData.Length];
        Buffer.BlockCopy(salt, 0, result, 0, SaltSize);
        Buffer.BlockCopy(nonce, 0, result, SaltSize, NonceSize);
        Buffer.BlockCopy(tag, 0, result, SaltSize + NonceSize, TagSize);
        Buffer.BlockCopy(cipherData, 0, result, SaltSize + NonceSize + TagSize, cipherData.Length);

        return result;
    }

    public byte[] DecryptBytes(byte[] cipherDataWithHeader, string masterKey)
    {
        if (cipherDataWithHeader.Length < SaltSize + NonceSize + TagSize)
            throw new ArgumentException("Cipher data payload is too short or invalid.");

        byte[] salt = new byte[SaltSize];
        byte[] nonce = new byte[NonceSize];
        byte[] tag = new byte[TagSize];
        int cipherLen = cipherDataWithHeader.Length - SaltSize - NonceSize - TagSize;
        byte[] cipherData = new byte[cipherLen];

        Buffer.BlockCopy(cipherDataWithHeader, 0, salt, 0, SaltSize);
        Buffer.BlockCopy(cipherDataWithHeader, SaltSize, nonce, 0, NonceSize);
        Buffer.BlockCopy(cipherDataWithHeader, SaltSize + NonceSize, tag, 0, TagSize);
        Buffer.BlockCopy(cipherDataWithHeader, SaltSize + NonceSize + TagSize, cipherData, 0, cipherLen);

        byte[] key = DeriveKey(masterKey, salt);
        byte[] plainData = new byte[cipherLen];

        using (var aesGcm = new AesGcm(key, TagSize))
        {
            aesGcm.Decrypt(nonce, cipherData, tag, plainData);
        }

        return plainData;
    }

    public async Task EncryptFileAsync(string inputFilePath, string outputEncryptedPath, string masterKey)
    {
        byte[] fileBytes = await File.ReadAllBytesAsync(inputFilePath);
        byte[] encryptedBytes = EncryptBytes(fileBytes, masterKey);
        await File.WriteAllBytesAsync(outputEncryptedPath, encryptedBytes);
    }

    public async Task DecryptFileAsync(string inputEncryptedPath, string outputDecryptedPath, string masterKey)
    {
        byte[] encryptedBytes = await File.ReadAllBytesAsync(inputEncryptedPath);
        byte[] decryptedBytes = DecryptBytes(encryptedBytes, masterKey);
        await File.WriteAllBytesAsync(outputDecryptedPath, decryptedBytes);
    }
}

public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 50_000;

    public static string Hash(string rawText)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        using var pbkdf2 = new Rfc2898DeriveBytes(rawText, salt, Iterations, HashAlgorithmName.SHA256);
        byte[] key = pbkdf2.GetBytes(KeySize);

        // Format: {saltBase64}:{hashBase64}
        return $"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(key)}";
    }

    public static bool Verify(string rawText, string hashedPasswordWithSalt)
    {
        var parts = hashedPasswordWithSalt.Split(':');
        if (parts.Length != 2) return false;

        byte[] salt = Convert.FromBase64String(parts[0]);
        byte[] expectedKey = Convert.FromBase64String(parts[1]);

        using var pbkdf2 = new Rfc2898DeriveBytes(rawText, salt, Iterations, HashAlgorithmName.SHA256);
        byte[] actualKey = pbkdf2.GetBytes(KeySize);

        return CryptographicOperations.FixedTimeEquals(actualKey, expectedKey);
    }
}
