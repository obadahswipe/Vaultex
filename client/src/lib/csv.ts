// Minimal CSV export. Quotes any cell containing a comma, quote, or newline.

function escape(cell: unknown): string {
  if (cell == null) return '';
  const s = String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(headers: string[], rows: Array<Array<unknown>>): string {
  const head = headers.map(escape).join(',');
  const body = rows.map((r) => r.map(escape).join(',')).join('\n');
  return `${head}\n${body}\n`;
}

export function downloadCSV(filename: string, headers: string[], rows: Array<Array<unknown>>): void {
  const csv = toCSV(headers, rows);
  // Add BOM so Excel renders UTF-8 (Arabic) correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Download a list of objects; the keys of the first object become the columns. */
export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>): void {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  downloadCSV(filename, headers, rows.map((r) => headers.map((h) => r[h])));
}
