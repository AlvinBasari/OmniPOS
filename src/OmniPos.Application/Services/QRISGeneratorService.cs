using System.Text;
using OmniPos.Application.DTOs;

namespace OmniPos.Application.Services;

public class QRISGeneratorService
{
    public DynamicQrisResponse GenerateDynamicQris(string nmid, string merchantName, string city, decimal amount, string invoiceNumber)
    {
        // Standard EMVCo QRIS Payload Builder for Indonesia (QRIS MPM)
        var amountStr = ((long)amount).ToString();
        var sb = new StringBuilder();

        // Tag 00: Payload Format Indicator
        AppendTag(sb, "00", "01");
        // Tag 01: Point of Initiation Method (12 = Dynamic QR)
        AppendTag(sb, "01", "12");
        
        // Tag 51: Merchant Account Info (QRIS National Standard)
        var tag51Content = new StringBuilder();
        AppendTag(tag51Content, "00", "ID.OR.GPN.WWW");
        AppendTag(tag51Content, "01", nmid.PadLeft(15, '0'));
        AppendTag(tag51Content, "02", "01");
        AppendTag(sb, "51", tag51Content.ToString());

        // Tag 52: Merchant Category Code (5812 = Eating places and restaurants / Retail)
        AppendTag(sb, "52", "5812");
        // Tag 53: Transaction Currency (360 = IDR Rupiah)
        AppendTag(sb, "53", "360");
        // Tag 54: Transaction Amount
        AppendTag(sb, "54", amountStr);
        // Tag 58: Country Code (ID)
        AppendTag(sb, "58", "ID");
        // Tag 59: Merchant Name
        AppendTag(sb, "59", merchantName.Length > 25 ? merchantName[..25] : merchantName);
        // Tag 60: Merchant City
        AppendTag(sb, "60", city.Length > 15 ? city[..15] : city);

        // Tag 62: Additional Data Field (Invoice Ref)
        var tag62Content = new StringBuilder();
        AppendTag(tag62Content, "01", invoiceNumber);
        AppendTag(sb, "62", tag62Content.ToString());

        // Tag 63: CRC-16 Checksum Placeholder
        sb.Append("6304");
        var rawPayload = sb.ToString();
        var crc = ComputeCrc16Ccitt(Encoding.ASCII.GetBytes(rawPayload));
        var finalQris = rawPayload + crc;

        return new DynamicQrisResponse(
            QrisPayload: finalQris,
            Amount: amount,
            ReferenceNumber: $"QRIS-{DateTime.UtcNow:yyyyMMddHHmmss}",
            InvoiceNumber: invoiceNumber
        );
    }

    private static void AppendTag(StringBuilder sb, string tag, string value)
    {
        sb.Append(tag);
        sb.Append(value.Length.ToString("D2"));
        sb.Append(value);
    }

    private static string ComputeCrc16Ccitt(byte[] bytes)
    {
        ushort crc = 0xFFFF;
        const ushort polynomial = 0x1021;

        foreach (byte b in bytes)
        {
            for (int i = 0; i < 8; i++)
            {
                bool bit = ((b >> (7 - i)) & 1) == 1;
                bool c15 = ((crc >> 15) & 1) == 1;
                crc <<= 1;
                if (c15 ^ bit) crc ^= polynomial;
            }
        }

        return crc.ToString("X4");
    }
}
