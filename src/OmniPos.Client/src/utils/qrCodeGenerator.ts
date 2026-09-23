import QRCode from 'qrcode';

/**
 * Standard-compliant QR Code generator using ISO/IEC 18004 Reed-Solomon ECC.
 * Generates verified, scanner-readable QR Codes for Mobile Scanner pairing and QRIS.
 */
export class QRCodeEncoder {
  /**
   * Generates a base64 PNG data URL of the QR code (widely supported by all browsers and cameras).
   */
  public static async generateDataURL(text: string, size = 256): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('[QRCodeEncoder] Error generating DataURL:', err);
      return '';
    }
  }

  /**
   * Generates an SVG string representation of the QR code.
   */
  public static async generateSVG(text: string, size = 256): Promise<string> {
    try {
      return await QRCode.toString(text, {
        type: 'svg',
        width: size,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('[QRCodeEncoder] Error generating SVG:', err);
      return '';
    }
  }
}
