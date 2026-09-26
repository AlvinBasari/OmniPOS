/**
 * OmniPOS Enterprise Universal Print Helper
 * 
 * Provides isolated, clean printing for both Thermal Slips (58mm/80mm) and
 * Formal Documents (A4/F4) without leaking the application UI (sidebar, header, buttons).
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Executes printing via a dedicated, hidden iframe to completely isolate
 * print content from the application UI and prevent popup blocker issues.
 */
export function executeIframePrint(htmlContent: string) {
  let iframe = document.getElementById('omnipos-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'omnipos-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);
  }

  const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!frameDoc) {
    // Ultimate fallback if iframe document is not accessible
    window.print();
    return;
  }

  frameDoc.open();
  frameDoc.write(htmlContent);
  frameDoc.close();

  // Allow styles, fonts, and SVG images time to render before triggering print dialog
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print():', err);
      window.print();
    }
  }, 250);
}

/**
 * Prints a thermal receipt from formatted monospace text (ESC/POS preview).
 */
export function printThermalReceipt(
  receiptText: string,
  options: {
    title?: string;
    paperSize?: '58mm' | '80mm';
    storeName?: string;
  } = {}
) {
  const is58 = options.paperSize === '58mm';
  const paperWidth = is58 ? '58mm' : '80mm';
  const printableWidth = is58 ? '48mm' : '72mm';
  const fontSize = is58 ? '10px' : '11px';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(options.title || options.storeName || 'Struk Kasir')}</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Courier New', Courier, Consolas, monospace;
      font-size: ${fontSize};
      line-height: 1.35;
      color: #000000;
      background: #ffffff;
      width: ${printableWidth};
      margin: 0 auto;
      padding: 8px 4px 16px 4px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    pre {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
    }
  </style>
</head>
<body>
  <pre>${escapeHtml(receiptText)}</pre>
</body>
</html>`;

  executeIframePrint(html);
}

/**
 * Prints a specific DOM element by ID or Element reference,
 * preserving all active Tailwind CSS and layout styles while isolating the document.
 */
export function printElement(
  target: string | HTMLElement,
  options: {
    title?: string;
    pageSize?: 'A4' | '80mm' | '58mm';
    orientation?: 'portrait' | 'landscape';
    customStyles?: string;
  } = {}
) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) {
    console.error(`printElement: target element "${target}" not found.`);
    return;
  }

  const pageSize = options.pageSize || (el.id.includes('thermal') || el.id.includes('receipt') ? '80mm' : 'A4');
  const orientation = options.orientation || 'portrait';

  // Extract all stylesheets and style blocks from parent document
  const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(tag => tag.outerHTML)
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(options.title || 'Dokumen OmniPOS')}</title>
  ${headStyles}
  <style>
    @page {
      size: ${pageSize} ${orientation};
      margin: ${pageSize === 'A4' ? '12mm' : '0'};
    }
    html, body {
      background: #ffffff !important;
      color: #000000 !important;
      margin: 0 !important;
      padding: ${pageSize === 'A4' ? '0' : '4mm'} !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* Hide interactive elements, buttons, and scrollbars */
    button, input, select, textarea, .no-print, [data-no-print="true"] {
      display: none !important;
    }
    /* Remove modal shadow, fixed overlays, and max heights */
    * {
      box-shadow: none !important;
      max-height: none !important;
    }
    ${options.customStyles || ''}
  </style>
</head>
<body class="bg-white text-black">
  <div class="printable-wrapper">
    ${el.outerHTML}
  </div>
</body>
</html>`;

  executeIframePrint(html);
}

/**
 * Prints custom raw HTML content in an isolated environment.
 */
export function printHtml(
  bodyHtml: string,
  options: {
    title?: string;
    pageSize?: 'A4' | '80mm' | '58mm';
    orientation?: 'portrait' | 'landscape';
    customStyles?: string;
  } = {}
) {
  const pageSize = options.pageSize || 'A4';
  const orientation = options.orientation || 'portrait';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(options.title || 'Dokumen OmniPOS')}</title>
  <style>
    @page {
      size: ${pageSize} ${orientation};
      margin: ${pageSize === 'A4' ? '14mm' : '0'};
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11px;
      margin: 0 !important;
      padding: ${pageSize === 'A4' ? '0' : '6px'} !important;
      width: 100% !important;
      height: auto !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 6px 8px;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .no-print {
      display: none !important;
    }
    ${options.customStyles || ''}
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;

  executeIframePrint(html);
}
