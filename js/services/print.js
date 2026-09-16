'use strict';

/**
 * print.js — Print functionality për raporte dhe fatura
 */

window.TaxiPrint = (() => {

    // ═══ PRINTO FAQEN ═══
    function printPage() {
        window.print();
    }

    // ═══ PRINTO ELEMENT ═══
    function printElement(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Printo</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; padding: 20px; color: #000; background: #fff; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #a855f7; color: white; padding: 10px; text-align: left; }
                    td { padding: 8px; border-bottom: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    h1 { color: #a855f7; margin-bottom: 10px; }
                    h2 { color: #333; font-size: 16px; margin-top: 20px; }
                    .no-print { display: none; }
                    .header { border-bottom: 2px solid #a855f7; padding-bottom: 10px; margin-bottom: 20px; }
                    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🚕 TaxiApp 2.0</h1>
                    <div style="font-size: 12px; color: #666;">Raport i gjeneruar: ${new Date().toLocaleString('sq-AL')}</div>
                </div>
                ${el.innerHTML}
                <div class="footer">
                    © 2026 TaxiDispatch Pro — Të gjitha të drejtat e rezervuara
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }

    // ═══ PRINTO RAPORT ═══
    function printReport(title, columns, rows) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #a855f7; margin-bottom: 6px; }
                    .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th { background: #a855f7; color: white; padding: 10px; text-align: left; font-size: 12px; }
                    td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
                </style>
            </head>
            <body>
                <h1>🚕 ${title}</h1>
                <div class="meta">Gjeneruar: ${new Date().toLocaleString('sq-AL')}</div>
                <table>
                    <thead>
                        <tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    © 2026 TaxiDispatch Pro — Konfidencial
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }

    // ═══ PRINTO FATURË ═══
    function printInvoice(order) {
        const price = parseFloat(order.price) || 0;
        const total = price;
        const commission = price * 0.10;
        const driver = price - commission;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Fatura #${order.id}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #a855f7; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { color: #a855f7; font-size: 28px; }
                    .header p { font-size: 12px; color: #666; margin-top: 4px; }
                    .invoice-num { font-family: monospace; font-size: 20px; text-align: right; margin-bottom: 20px; color: #a855f7; font-weight: bold; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .info-section h3 { font-size: 12px; color: #a855f7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
                    .info-section p { font-size: 13px; margin-bottom: 4px; }
                    .info-section p strong { color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #f3e8ff; color: #6b21a8; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
                    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
                    .totals { margin-top: 20px; text-align: right; }
                    .totals div { padding: 6px 0; font-size: 14px; }
                    .totals .grand-total { font-size: 22px; font-weight: bold; color: #22c55e; border-top: 2px solid #22c55e; padding-top: 12px; margin-top: 12px; }
                    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🚕 TaxiApp 2.0</h1>
                    <p>Fatura zyrtare e udhëtimit</p>
                </div>

                <div class="invoice-num">#${order.firestoreId || order.id}</div>

                <div class="info-grid">
                    <div class="info-section">
                        <h3>Klienti</h3>
                        <p><strong>${order.name || 'Klient'}</strong></p>
                        <p>📞 ${order.phone}</p>
                    </div>
                    <div class="info-section">
                        <h3>Data</h3>
                        <p>${order.createdDateStr || new Date().toLocaleDateString('sq-AL')}</p>
                        <p>Ora: ${order.createdTimeStr || order.time || ''}</p>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-section">
                        <h3>Rrugëtimi</h3>
                        <p>📍 ${order.pickup}</p>
                        <p>🏁 ${order.destination || '—'}</p>
                    </div>
                    <div class="info-section">
                        <h3>Vetura</h3>
                        <p>🚗 ${order.vehicleNum || order.vehicle || '—'}</p>
                        <p>👤 ${order.driverName || '—'}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Përshkrimi</th>
                            <th style="text-align:right;">Çmimi</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Shërbimi i taxit</td>
                            <td style="text-align:right;">€${price.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Tarifa: ${order.tariff || 'standard'}</td>
                            <td style="text-align:right;">—</td>
                        </tr>
                    </tbody>
                </table>

                <div class="totals">
                    <div>Nëntotali: <strong>€${price.toFixed(2)}</strong></div>
                    <div class="grand-total">Totali: €${total.toFixed(2)}</div>
                </div>

                <div class="footer">
                    Faleminderit që zgjodhët TaxiApp!<br>
                    © 2026 TaxiDispatch Pro · www.taxiapp.com
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }

    // ═══ PRINTO RAPORT DITOR ═══
    function printDailyReport(stats, date) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Raporti Ditor ${date}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    h1 { color: #a855f7; margin-bottom: 6px; }
                    .meta { color: #666; font-size: 12px; margin-bottom: 30px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
                    .stat-box { border: 1px solid #ddd; border-left: 4px solid #a855f7; padding: 16px; }
                    .stat-box .label { font-size: 11px; color: #666; text-transform: uppercase; }
                    .stat-box .value { font-size: 26px; font-weight: bold; color: #a855f7; font-family: monospace; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #666; }
                </style>
            </head>
            <body>
                <h1>📊 Raporti Ditor</h1>
                <div class="meta">${date}</div>

                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="label">💰 Të ardhura</div>
                        <div class="value">€${(stats.revenue || 0).toFixed(2)}</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">📞 Porosi totale</div>
                        <div class="value">${stats.total || 0}</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">✅ Të përfunduara</div>
                        <div class="value">${stats.completed || 0}</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">❌ Anuluar</div>
                        <div class="value">${stats.cancelled || 0}</div>
                    </div>
                </div>

                <div class="footer">
                    © 2026 TaxiDispatch Pro · Raport automatik
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }

    return {
        printPage, printElement, printReport,
        printInvoice, printDailyReport
    };
})();

console.log('✅ print.js ngarkuar');
