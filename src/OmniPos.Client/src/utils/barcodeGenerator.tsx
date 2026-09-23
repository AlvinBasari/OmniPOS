import React from 'react';

/**
 * Standard Code 128 (Subtype B) Patterns Table (107 patterns).
 * Each pattern encodes 6 alternating bar/space widths, summing to 11 modules.
 * Stop code has 7 alternating bar/space widths, summing to 13 modules.
 */
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (104=StartB, 106=Stop)
];

/**
 * Standard EAN-13 Patterns & Parity
 */
const EAN_L_CODES = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011'
];
const EAN_G_CODES = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111'
];
const EAN_R_CODES = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100'
];
const EAN_PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
];

/**
 * Encodes text into Code 128 (Subtype B) module string ('1' = bar, '0' = space).
 */
export function encodeCode128B(rawText: string): string {
  const text = rawText || '0000';
  const codes = [104]; // Start Code B
  let sum = 104;

  for (let i = 0; i < text.length; i++) {
    let val = text.charCodeAt(i) - 32;
    if (val < 0 || val > 95) {
      val = 0; // Fallback to space if character out of ASCII range
    }
    codes.push(val);
    sum += val * (i + 1);
  }

  const check = sum % 103;
  codes.push(check);
  codes.push(106); // Stop Code

  let modules = '0000000000'; // 10 modules Quiet Zone
  for (let i = 0; i < codes.length; i++) {
    const pattern = CODE128_PATTERNS[codes[i]];
    if (!pattern) continue;
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10);
      const isBar = j % 2 === 0;
      modules += (isBar ? '1' : '0').repeat(width);
    }
  }
  modules += '0000000000'; // 10 modules Quiet Zone
  return modules;
}

/**
 * Encodes 12 or 13 digits into standard EAN-13 module string.
 */
export function encodeEan13(rawDigits: string): string | null {
  const clean = rawDigits.replace(/\D/g, '');
  if (clean.length !== 12 && clean.length !== 13) return null;

  let digits = clean;
  if (clean.length === 12) {
    // Calculate 13th check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? d : d * 3;
    }
    const check = (10 - (sum % 10)) % 10;
    digits = clean + check.toString();
  }

  const firstDigit = parseInt(digits[0], 10);
  const parity = EAN_PARITY[firstDigit];

  let modules = '000000000'; // 9 modules quiet zone
  modules += '101'; // Left guard

  // 6 left digits
  for (let i = 1; i <= 6; i++) {
    const d = parseInt(digits[i], 10);
    const useG = parity[i - 1] === 'G';
    modules += useG ? EAN_G_CODES[d] : EAN_L_CODES[d];
  }

  modules += '01010'; // Center guard

  // 6 right digits
  for (let i = 7; i <= 12; i++) {
    const d = parseInt(digits[i], 10);
    modules += EAN_R_CODES[d];
  }

  modules += '101'; // Right guard
  modules += '000000000'; // 9 modules quiet zone

  return modules;
}

export interface RealBarcodeProps {
  code: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
  forceFormat?: 'code128' | 'ean13';
}

/**
 * Standards-Compliant Barcode Component (Code-128 & EAN-13).
 * Renders precise SVG bars compliant with optical barcode readers.
 */
export const RealBarcodeSvg: React.FC<RealBarcodeProps> = ({
  code,
  width = 160,
  height = 42,
  showText = false,
  className = '',
  forceFormat
}) => {
  const rawCode = (code || '').trim();
  if (!rawCode) {
    return (
      <div className={`flex items-center justify-center text-[10px] text-text-muted ${className}`} style={{ width, height }}>
        [Barcode Kosong]
      </div>
    );
  }

  // Auto-detect EAN-13 if 12-13 digits, otherwise use universal Code-128
  let modules: string | null = null;
  const isAllDigits = /^\d{12,13}$/.test(rawCode);

  if (forceFormat === 'ean13' || (!forceFormat && isAllDigits)) {
    modules = encodeEan13(rawCode);
  }

  if (!modules) {
    modules = encodeCode128B(rawCode);
  }

  const moduleCount = modules.length;
  const barWidth = width / moduleCount;

  // Optimize SVG: group consecutive 1s into single wider <rect> elements
  const rects: Array<{ x: number; w: number }> = [];
  let inBar = false;
  let startX = 0;

  for (let i = 0; i < moduleCount; i++) {
    const is1 = modules[i] === '1';
    if (is1 && !inBar) {
      inBar = true;
      startX = i * barWidth;
    } else if (!is1 && inBar) {
      inBar = false;
      const w = i * barWidth - startX;
      rects.push({ x: startX, w });
    }
  }
  if (inBar) {
    rects.push({ x: startX, w: moduleCount * barWidth - startX });
  }

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
        className="block"
      >
        <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
        {rects.map((r, idx) => (
          <rect
            key={idx}
            x={r.x}
            y={0}
            width={r.w}
            height={height}
            fill="#000000"
          />
        ))}
      </svg>
      {showText && (
        <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-900 mt-0.5">
          {rawCode}
        </span>
      )}
    </div>
  );
};

/**
 * Generates an standalone SVG HTML string suitable for embedding into print popups / thermal print templates.
 */
export function generateBarcodeSvgString(
  code: string,
  width = 140,
  height = 36,
  forceFormat?: 'code128' | 'ean13'
): string {
  const rawCode = (code || '').trim();
  if (!rawCode) return '<div style="font-size:9px;color:#888;">[Barcode Kosong]</div>';

  let modules: string | null = null;
  const isAllDigits = /^\d{12,13}$/.test(rawCode);

  if (forceFormat === 'ean13' || (!forceFormat && isAllDigits)) {
    modules = encodeEan13(rawCode);
  }

  if (!modules) {
    modules = encodeCode128B(rawCode);
  }

  const moduleCount = modules.length;
  const barWidth = width / moduleCount;

  let rectsSvg = '';
  let inBar = false;
  let startX = 0;

  for (let i = 0; i < moduleCount; i++) {
    const is1 = modules[i] === '1';
    if (is1 && !inBar) {
      inBar = true;
      startX = i * barWidth;
    } else if (!is1 && inBar) {
      inBar = false;
      const w = i * barWidth - startX;
      rectsSvg += `<rect x="${startX.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}" fill="#000000"/>`;
    }
  }
  if (inBar) {
    const w = moduleCount * barWidth - startX;
    rectsSvg += `<rect x="${startX.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}" fill="#000000"/>`;
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" style="display:block;margin:0 auto;background:#ffffff;"><rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>${rectsSvg}</svg>`;
}

export default RealBarcodeSvg;
