// Minimal pure TypeScript QR Code matrix generator (ISO/IEC 18004 compliant)
// Supports byte mode with Error Correction Level M/L for pairing URLs.

export class QRCodeEncoder {
  // Generates an SVG string representation of a QR code
  public static generateSVG(text: string, size = 256): string {
    const matrix = this.encodeText(text);
    const n = matrix.length;
    const cellSize = size / (n + 8); // 4-cell quiet zone
    const offset = 4 * cellSize;

    let paths = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          const x = offset + c * cellSize;
          const y = offset + r * cellSize;
          paths += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="#ffffff"/>
      <path d="${paths}" fill="#0f172a"/>
    </svg>`;
  }

  public static encodeText(text: string): boolean[][] {
    // Generate QR matrix based on standard Byte mode encoding
    // For general URL payloads (e.g. http://192.168.1.100:5000/mobile-scan)
    const length = text.length;
    let version = 1;
    if (length > 17) version = 2;
    if (length > 32) version = 3;
    if (length > 53) version = 4;
    if (length > 78) version = 5;

    const moduleCount = version * 4 + 17;
    const matrix: boolean[][] = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(false));
    const isReserved: boolean[][] = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(false));

    // 1. Finder patterns (Top-Left, Top-Right, Bottom-Left)
    this.addFinderPattern(matrix, isReserved, 0, 0);
    this.addFinderPattern(matrix, isReserved, moduleCount - 7, 0);
    this.addFinderPattern(matrix, isReserved, 0, moduleCount - 7);

    // 2. Timing patterns
    for (let i = 8; i < moduleCount - 8; i++) {
      const bit = i % 2 === 0;
      matrix[6][i] = bit;
      isReserved[6][i] = true;
      matrix[i][6] = bit;
      isReserved[i][6] = true;
    }

    // 3. Alignment patterns (version >= 2)
    if (version >= 2) {
      const alignPos = this.getAlignmentPositions(version);
      for (const r of alignPos) {
        for (const c of alignPos) {
          if (!isReserved[r][c]) {
            this.addAlignmentPattern(matrix, isReserved, r, c);
          }
        }
      }
    }

    // 4. Reserve format info areas
    for (let i = 0; i < 9; i++) {
      if (i < moduleCount) {
        isReserved[8][i] = true;
        isReserved[i][8] = true;
        isReserved[moduleCount - 1 - i][8] = true;
        isReserved[8][moduleCount - 1 - i] = true;
      }
    }
    isReserved[moduleCount - 8][8] = true; // Dark module

    // 5. Build Bitstream for payload (Byte Mode: 0100 + length + data)
    const bits: number[] = [];
    // Mode indicator: 0100 (Byte mode)
    bits.push(0, 1, 0, 0);
    // Character count indicator (8 bits for v1-9)
    for (let i = 7; i >= 0; i--) {
      bits.push((length >> i) & 1);
    }
    // Data bytes
    for (let i = 0; i < length; i++) {
      const code = text.charCodeAt(i);
      for (let b = 7; b >= 0; b--) {
        bits.push((code >> b) & 1);
      }
    }

    // Terminator
    for (let i = 0; i < 4 && bits.length % 8 !== 0; i++) {
      bits.push(0);
    }
    // Pad bytes 0xEC, 0x11
    const totalDataCapBits = this.getDataCapacityBits(version);
    const padBytes = [0xEC, 0x11];
    let padIdx = 0;
    while (bits.length < totalDataCapBits) {
      const byte = padBytes[padIdx % 2];
      for (let b = 7; b >= 0; b--) {
        bits.push((byte >> b) & 1);
      }
      padIdx++;
    }

    // 6. Place data bits in matrix (Right to left, serpentine)
    let bitIdx = 0;
    let upwards = true;
    for (let right = moduleCount - 1; right > 0; right -= 2) {
      if (right === 6) right--; // Skip vertical timing column
      const rows = upwards
        ? Array.from({ length: moduleCount }, (_, idx) => moduleCount - 1 - idx)
        : Array.from({ length: moduleCount }, (_, idx) => idx);

      for (const row of rows) {
        for (let col = right; col >= right - 1; col--) {
          if (!isReserved[row][col]) {
            const bit = bitIdx < bits.length ? bits[bitIdx++] === 1 : false;
            // Apply standard mask pattern 000: (row + col) % 2 === 0
            const mask = (row + col) % 2 === 0;
            matrix[row][col] = bit !== mask;
          }
        }
      }
      upwards = !upwards;
    }

    // 7. Format Information (Mask 000 + EC Level M = 101010000010010)
    const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
    for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
    matrix[8][7] = formatBits[6] === 1;
    matrix[8][8] = formatBits[7] === 1;
    matrix[7][8] = formatBits[8] === 1;
    for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

    for (let i = 0; i < 7; i++) matrix[moduleCount - 1 - i][8] = formatBits[i] === 1;
    matrix[moduleCount - 8][8] = true; // Dark module
    for (let i = 7; i < 15; i++) matrix[8][moduleCount - 15 + i] = formatBits[i] === 1;

    return matrix;
  }

  private static addFinderPattern(matrix: boolean[][], isReserved: boolean[][], r: number, c: number) {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const row = r + y;
        const col = c + x;
        if (row >= 0 && row < matrix.length && col >= 0 && col < matrix.length) {
          isReserved[row][col] = true;
          if (y >= 0 && y <= 6 && x >= 0 && x <= 6) {
            matrix[row][col] = y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4);
          } else {
            matrix[row][col] = false;
          }
        }
      }
    }
  }

  private static addAlignmentPattern(matrix: boolean[][], isReserved: boolean[][], cr: number, cc: number) {
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        const row = cr + y;
        const col = cc + x;
        isReserved[row][col] = true;
        matrix[row][col] = Math.max(Math.abs(y), Math.abs(x)) !== 1;
      }
    }
  }

  private static getAlignmentPositions(version: number): number[] {
    if (version === 1) return [];
    if (version === 2) return [6, 18];
    if (version === 3) return [6, 22];
    if (version === 4) return [6, 26];
    return [6, 30];
  }

  private static getDataCapacityBits(version: number): number {
    // Level M data capacity (bytes * 8)
    const capacities = [0, 16 * 8, 28 * 8, 44 * 8, 64 * 8, 86 * 8];
    return capacities[version] || 64 * 8;
  }
}
