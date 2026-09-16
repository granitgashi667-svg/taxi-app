'use strict';

/**
 * export.js — Eksportim CSV / Excel / PDF (bazik)
 */

window.TaxiExport = (() => {

    // Eksporto në CSV
    function toCsv(data, filename = 'export.csv') {
        if (!data || !data.length) return;

        const headers = Object.keys(data[0]);
        const rows = data.map(obj =>
            headers.map(h => {
                const v = obj[h];
                if (v === null || v === undefined) return '';
                const s = String(v).replace(/"/g, '""');
                return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
            }).join(',')
        );

        const csv = [headers.join(','), ...rows].join('\n');
        downloadFile(csv, filename, 'text/csv');
    }

    // Eksporto në JSON
    function toJson(data, filename = 'export.json') {
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, filename, 'application/json');
    }

    // Eksporto në HTML (print as PDF)
    function toPrintableHtml(title, data, filename = 'report.html') {
        if (!data || !data.length) return;
        const headers = Object.keys(data[0]);
        const html = `
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8"><title>${title}</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                h1 { color: #a855f7; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #a855f7; color: white; padding: 10px; text-align: left; }
                td { padding: 8px; border-bottom: 1px solid #eee; }
                tr:nth-child(even) { background: #f9f9f9; }
            </style></head><body>
                <h1>${title}</h1>
                <p>Data: ${new Date().toLocaleString('sq-AL')}</p>
                <table>
                    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </body></html>
        `;
        downloadFile(html, filename, 'text/html');
    }

    // Download ndihmës
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        console.log('📥 File u shkarkua:', filename);
    }

    // Printo
    function printData() {
        window.print();
    }

    return { toCsv, toJson, toPrintableHtml, downloadFile, printData };
})();

console.log('✅ export.js ngarkuar');
