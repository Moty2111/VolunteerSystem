/* Утилиты экспорта отчётов: CSV, Excel, Word и настоящий PDF (pdfmake) */

import type { TDocumentDefinitions } from 'pdfmake/interfaces';

type Vfs = Record<string, string>;

let fontsReady = false;

/* pdfmake грузим лениво — пакет со шрифтами тяжёлый, на старт приложения не нужен */
async function loadPdfMake() {
    const [pdfNs, vfsNs] = await Promise.all([
        import('pdfmake'),
        import('pdfmake/build/vfs_fonts')
    ]);
    /* pdfmake и vfs — UMD/CJS: нужные экспорты лежат в .default */
    const pdf = ((pdfNs as unknown as { default?: typeof pdfNs }).default ?? pdfNs);
    const fontVfs: Vfs =
        ((vfsNs as unknown as { default?: Vfs }).default ?? (vfsNs as unknown as Vfs));
    if (!fontsReady) {
        pdf.addVirtualFileSystem(fontVfs);
        fontsReady = true;
    }
    return pdf;
}

function download(filename: string, content: string | Blob, mime: string) {
    const dated = filename.replace(/(\.[a-z0-9]+)$/i, `_${stamp()}$1`);
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = dated;
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

/* дата в имени файла: отчёт_2026-09-28.pdf */
function stamp(): string {
    return new Date().toISOString().slice(0, 10);
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

/* ============ PDF (настоящий файл .pdf через pdfmake) ============
   Никакого window.print() и окна печати — ошибка «media_size»
   возникает именно в диалоге печати Chromium. Файл скачивается сразу. */
export async function exportPDF(filename: string, rows: Record<string, unknown>[], title = 'Отчёт') {
    if (rows.length === 0) return;
    const pdf = await loadPdfMake();

    const headers = Object.keys(rows[0]);
    const body: Array<Array<{ text: string; style: 'th' | 'td' }>> = [
        headers.map(h => ({ text: h, style: 'th' as const })),
        ...rows.map(r => headers.map(h => ({ text: String(r[h] ?? ''), style: 'td' as const })))
    ];

    const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [28, 76, 28, 46],
        defaultStyle: { font: 'Roboto', fontSize: 9, color: '#20262b' },
        info: { title, author: 'VolunteerSystem', creator: 'VolunteerSystem' },
        content: [
            { text: title, fontSize: 19, bold: true, color: '#c2185b' },
            {
                text: `VolunteerSystem · Дата формирования: ${new Date().toLocaleString('ru-RU')} · Записей: ${rows.length}`,
                fontSize: 9.5,
                color: '#7a7f87',
                margin: [0, 3, 0, 4]
            },
            {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 785, y2: 0, lineWidth: 2.5, lineColor: '#ff4d8d' }],
                margin: [0, 2, 0, 12]
            },
            {
                table: {
                    headerRows: 1,
                    widths: headers.map(() => '*'),
                    body
                },
                layout: {
                    fillColor: (rowIndex: number) =>
                        rowIndex === 0 ? '#ff4d8d' : rowIndex % 2 === 0 ? '#fff5f9' : '#ffffff',
                    hLineColor: () => '#f2c6d8',
                    vLineColor: () => '#f2c6d8',
                    hLineWidth: () => 0.6,
                    vLineWidth: () => 0.6,
                    paddingLeft: () => 6,
                    paddingRight: () => 6,
                    paddingTop: () => 4,
                    paddingBottom: () => 4
                }
            }
        ],
        styles: {
            th: { bold: true, color: '#ffffff', fontSize: 9 },
            td: { fontSize: 9 }
        },
        footer: (currentPage: number, pageCount: number) => ({
            columns: [
                { text: 'VolunteerSystem — система управления волонтёрами', fontSize: 8, color: '#9aa0a6' },
                { text: `Страница ${currentPage} из ${pageCount}`, fontSize: 8, color: '#9aa0a6', alignment: 'right' as const }
            ],
            margin: [28, 0, 28, 0] as [number, number, number, number]
        })
    };

    pdf.createPdf(docDefinition).download(`${filename}_${stamp()}.pdf`);
}
