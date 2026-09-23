using System.IO.Ports;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace OmniPos.Infrastructure.Services.Hardware;

public interface IDigitalScaleDriver
{
    Task<ScaleReadResult> ReadWeightAsync(string portName, int baudRate = 9600, int timeoutMs = 1500, CancellationToken ct = default);
    List<string> GetAvailableSerialPorts();
}

public class ScaleReadResult
{
    public bool Success { get; set; }
    public decimal WeightKg { get; set; }
    public string RawResponse { get; set; } = string.Empty;
    public string Protocol { get; set; } = "UNKNOWN";
    public string Message { get; set; } = string.Empty;
    public string? Error { get; set; }
    public bool IsRealHardware { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class DigitalScaleDriver : IDigitalScaleDriver
{
    private readonly ILogger<DigitalScaleDriver> _logger;

    public DigitalScaleDriver(ILogger<DigitalScaleDriver> logger)
    {
        _logger = logger;
    }

    public List<string> GetAvailableSerialPorts()
    {
        var ports = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // 1. Standard .NET SerialPort detection
        try
        {
            foreach (var p in SerialPort.GetPortNames())
            {
                ports.Add(p);
            }
        }
        catch {}

        // 2. Linux /dev/ttyUSB* and /dev/ttyACM* search
        try
        {
            if (Directory.Exists("/dev"))
            {
                foreach (var f in Directory.GetFiles("/dev", "ttyUSB*")) ports.Add(f);
                foreach (var f in Directory.GetFiles("/dev", "ttyACM*")) ports.Add(f);
                foreach (var f in Directory.GetFiles("/dev", "ttyS*"))
                {
                    if (File.Exists(f)) ports.Add(f);
                }
            }
        }
        catch {}

        return ports.OrderBy(p => p).ToList();
    }

    public async Task<ScaleReadResult> ReadWeightAsync(string portName, int baudRate = 9600, int timeoutMs = 1500, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(portName))
        {
            return new ScaleReadResult
            {
                Success = false,
                Error = "Nama port serial belum ditentukan. Pilih port timbangan di menu Pengaturan Hardware.",
                Message = "Port serial kosong."
            };
        }

        // Genuine physical serial port read
        return await Task.Run(() =>
        {
            SerialPort? serial = null;
            try
            {
                serial = new SerialPort
                {
                    PortName = portName,
                    BaudRate = baudRate > 0 ? baudRate : 9600,
                    DataBits = 8,
                    Parity = Parity.None,
                    StopBits = StopBits.One,
                    ReadTimeout = timeoutMs,
                    WriteTimeout = 1000,
                    Handshake = Handshake.None,
                    DtrEnable = true,
                    RtsEnable = true
                };

                serial.Open();

                // Send common weight poll requests to wake up or query scale:
                // 'W\r' (Toledo), 'Q\r\n' (CAS), 'S\r\n' (Avery/NCI), ENQ (ASCII 5)
                try
                {
                    serial.Write(new byte[] { 0x05 }, 0, 1); // ENQ
                    serial.Write("W\r");
                    serial.Write("Q\r\n");
                }
                catch {}

                // Read buffer
                var rawBuilder = new StringBuilder();
                var startTime = DateTime.UtcNow;
                var buffer = new byte[256];

                while ((DateTime.UtcNow - startTime).TotalMilliseconds < timeoutMs)
                {
                    if (ct.IsCancellationRequested) break;

                    if (serial.BytesToRead > 0)
                    {
                        var bytesRead = serial.Read(buffer, 0, Math.Min(buffer.Length, serial.BytesToRead));
                        if (bytesRead > 0)
                        {
                            var chunk = Encoding.ASCII.GetString(buffer, 0, bytesRead);
                            rawBuilder.Append(chunk);

                            // Check if full line or weight parsed
                            var parsed = TryParseWeight(rawBuilder.ToString());
                            if (parsed != null)
                            {
                                return new ScaleReadResult
                                {
                                    Success = true,
                                    WeightKg = parsed.Value.weight,
                                    RawResponse = rawBuilder.ToString().Trim(),
                                    Protocol = parsed.Value.protocol,
                                    Message = $"Timbangan merespon data fisik normal ({parsed.Value.weight:F3} kg via protokol {parsed.Value.protocol}).",
                                    IsRealHardware = true
                                };
                            }
                        }
                    }
                    Thread.Sleep(50);
                }

                var remainingRaw = rawBuilder.ToString().Trim();
                if (!string.IsNullOrEmpty(remainingRaw))
                {
                    var parsed = TryParseWeight(remainingRaw);
                    if (parsed != null)
                    {
                        return new ScaleReadResult
                        {
                            Success = true,
                            WeightKg = parsed.Value.weight,
                            RawResponse = remainingRaw,
                            Protocol = parsed.Value.protocol,
                            Message = $"Timbangan merespon ({parsed.Value.weight:F3} kg).",
                            IsRealHardware = true
                        };
                    }

                    return new ScaleReadResult
                    {
                        Success = false,
                        RawResponse = remainingRaw,
                        Error = $"Timbangan merespon data mentah: '{remainingRaw}', namun format angka berat tidak teridentifikasi.",
                        Message = "Format data serial tidak sesuai."
                    };
                }

                return new ScaleReadResult
                {
                    Success = false,
                    Error = $"Port '{portName}' berhasil dibuka, namun timbangan tidak mengirimkan data berat dalam batas waktu {timeoutMs}ms. Pastikan kabel data timbangan terpasang kuat, kabel ground/RX-TX sesuai, dan baud rate {baudRate} cocok dengan setelan timbangan.",
                    Message = "Timbangan tidak merespon (Timeout)."
                };
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Permission denied accessing serial port {Port}", portName);
                return new ScaleReadResult
                {
                    Success = false,
                    Error = $"Izin akses port '{portName}' ditolak oleh OS (Permission Denied). Pada Linux, jalankan perintah: 'sudo usermod -aG dialout $USER' atau 'sudo chmod 666 {portName}' lalu mulai ulang aplikasi.",
                    Message = "Izin port serial ditolak."
                };
            }
            catch (FileNotFoundException ex)
            {
                _logger.LogWarning(ex, "Serial port {Port} not found", portName);
                return new ScaleReadResult
                {
                    Success = false,
                    Error = $"Port fisik '{portName}' tidak ditemukan di sistem. Pastikan konverter USB-to-RS232 tercolok ke port USB komputer.",
                    Message = "Port serial tidak ditemukan."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading from scale port {Port}", portName);
                return new ScaleReadResult
                {
                    Success = false,
                    Error = $"Gagal membaca port timbangan '{portName}': {ex.Message}",
                    Message = "Gagal membuka port serial."
                };
            }
            finally
            {
                try
                {
                    if (serial != null && serial.IsOpen)
                    {
                        serial.Close();
                    }
                }
                catch {}
            }
        }, ct);
    }

    private static (decimal weight, string protocol)? TryParseWeight(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;

        // 1. NCI / Avery Berkel Format: ST,GS,+   1.250kg or US,GS, 1.250
        var matchNci = Regex.Match(raw, @"(?:ST|US|OL|SD),GS,([+\-\s0-9\.]+)\s*(?:kg|g|lb)?", RegexOptions.IgnoreCase);
        if (matchNci.Success && decimal.TryParse(matchNci.Groups[1].Value.Trim().Replace(" ", ""), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var nciVal))
        {
            return (nciVal, "NCI_Standard");
        }

        // 2. CAS Protocol: ST,NT,  1.250 kg or 01,  1.250 kg
        var matchCas = Regex.Match(raw, @"(?:ST|US|NT)[,\s]+([+\-\s0-9\.]+)\s*(?:kg|g|lb)?", RegexOptions.IgnoreCase);
        if (matchCas.Success && decimal.TryParse(matchCas.Groups[1].Value.Trim().Replace(" ", ""), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var casVal))
        {
            return (casVal, "CAS_Scale");
        }

        // 3. Toledo / Mettler Toledo Protocol: S  1.250 kg or 01  001.250kg
        var matchToledo = Regex.Match(raw, @"(?:S|SD|ST)[ \t]+([+\-\s0-9\.]+)\s*(?:kg|g|lb)", RegexOptions.IgnoreCase);
        if (matchToledo.Success && decimal.TryParse(matchToledo.Groups[1].Value.Trim().Replace(" ", ""), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var toledoVal))
        {
            return (toledoVal, "Mettler_Toledo");
        }

        // 4. DIGI / Continuous decimal pattern: e.g. "WN001.250KG" or "=01.250" or "W: 1.250kg"
        var matchGeneral = Regex.Match(raw, @"([0-9]+\.[0-9]{2,3})\s*(?:kg|g)?", RegexOptions.IgnoreCase);
        if (matchGeneral.Success && decimal.TryParse(matchGeneral.Groups[1].Value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var genVal))
        {
            return (genVal, "Continuous_Decimal");
        }

        return null;
    }
}
