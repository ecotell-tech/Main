import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Export a dataset as a PDF via a clean print window (FR-06d).
 *
 * Opens a new browser tab containing a styled HTML table, then triggers the
 * browser's native print/Save-as-PDF dialog. No third-party dependency needed.
 *
 * @param {string}   title   - Report heading shown in the print view
 * @param {object[]} rows    - Array of plain objects (each key becomes a column)
 */
export function printReportAsPDF(title, rows) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const date    = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const headerHTML = headers
    .map((h) => `<th>${h}</th>`)
    .join('');

  const rowsHTML = rows
    .map((r) =>
      `<tr>${headers.map((h) => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; padding: 24px; }
    h1  { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: #14532d; }
    p   { font-size: 10px; color: #6b7280; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th  { background: #14532d; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    td  { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) td { background: #f9fafb; }
    @media print {
      body { padding: 0; }
      @page { margin: 16mm; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated on ${date} &nbsp;·&nbsp; Pruthashakti Profit Farming Portal</p>
  <table>
    <thead><tr>${headerHTML}</tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'noopener');
  if (!win) return; // popup blocked
  win.document.write(html);
  win.document.close();
}
