/* Утилиты экспорта отчётов в CSV, Excel, Word, PDF */

function download(filename: string, content: string | Blob, mime: string) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeCSV(v: unknown): string {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
}

function escapeHTML(v: unknown): string {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ============ CSV ============ */
export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const lines = [
        headers.join(','),
        ...rows.map(r => headers.map(h => escapeCSV(r[h])).join(','))
    ];
    download(filename + '.csv', '\uFEFF' + lines.join('\n'), 'text/csv;charset=utf-8;');
}

/* ============ Excel (SpreadsheetML — открывается в Excel) ============ */
export function exportExcel(filename: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const th = headers.map(h => `<th>${escapeHTML(h)}</th>`).join('');
    const trs = rows.map(r =>
        '<tr>' + headers.map(h => `<td>${escapeHTML(r[h])}</td>`).join('') + '</tr>'
    ).join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>Отчёт</x:Name><x:WorksheetOptions><x:DisplayGridlines/>
    </x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; }
      th, td { border: 1px solid #14a37f; padding: 6px 12px; }
      th { background: #14a37f; color: #fff; font-weight: 700; }
    </style></head>
    <body><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;

    download(filename + '.xls', html, 'application/vnd.ms-excel;charset=utf-8;');
}

/* ============ Word ============ */
export function exportWord(filename: string, rows: Record<string, unknown>[], title = 'Отчёт') {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const th = headers.map(h => `<th>${escapeHTML(h)}</th>`).join('');
    const trs = rows.map(r =>
        '<tr>' + headers.map(h => `<td>${escapeHTML(r[h])}</td>`).join('') + '</tr>'
    ).join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
    <title>${escapeHTML(title)}</title>
    <style>
      body { font-family: 'Times New Roman', serif; font-size: 12pt; }
      h1 { font-size: 18pt; color: #14a37f; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #14a37f; padding: 6px 10px; }
      th { background: #14a37f; color: #fff; }
    </style></head>
    <body>
      <h1>${escapeHTML(title)}</h1>
      <p>Дата формирования: ${new Date().toLocaleString('ru-RU')}</p>
      <table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>
    </body></html>`;

    download(filename + '.doc', html, 'application/msword;charset=utf-8;');
}

/* ============ PDF (через печать браузера) ============ */
export function exportPDF(rows: Record<string, unknown>[], title = 'Отчёт') {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const th = headers.map(h => `<th>${escapeHTML(h)}</th>`).join('');
    const trs = rows.map(r =>
        '<tr>' + headers.map(h => `<td>${escapeHTML(r[h])}</td>`).join('') + '</tr>'
    ).join('');

    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
    <title>${escapeHTML(title)}</title>
    <style>
      body { font-family: 'Inter', Arial, sans-serif; padding: 24px; color: #1a2620; }
      h1 { color: #14a37f; font-size: 22px; }
      .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; font-size: 12px; }
      th, td { border: 1px solid #c4ebdf; padding: 6px 10px; text-align: left; }
      th { background: #14a37f; color: #fff; }
      tr:nth-child(even) { background: #f5f3ee; }
      @media print { body { padding: 0; } }
    </style></head>
    <body>
      <h1>${escapeHTML(title)}</h1>
      <div class="meta">Дата формирования: ${new Date().toLocaleString('ru-RU')} · Записей: ${rows.length}</div>
      <table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>
      <script>window.onload = () => { window.print(); };</script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
}