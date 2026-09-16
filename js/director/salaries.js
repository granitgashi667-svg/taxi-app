'use strict';

/**
 * js/director/salaries.js — Pagat e stafit
 */

window.DirectorSalaries = (() => {
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let cachedOperators = [];
    let cachedDrivers = [];

    // ═══ INIT ═══
    function init() {
        console.log('💵 DirectorSalaries: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('💵 Duke ngarkuar pagat...');
        await renderAll();
    }

    // ═══ CHANGE MONTH ═══
    function changeMonth(delta) {
        currentMonth += delta;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderAll();
    }

    // ═══ RENDER ALL ═══
    async function renderAll() {
        const el = document.getElementById('salaries-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            // Merr komisionin
            let commission = 10;
            try {
                const sett = await db.collection('settings').doc('commission').get();
                if (sett.exists) commission = sett.data().percentage || 10;
            } catch (e) {}

            // Range i muajit
            const monthStart = new Date(currentYear, currentMonth, 1).getTime();
            const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).getTime();

            // Operatorët
            const opSnap = await db.collection('operators').get();
            const operators = opSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Shoferët
            const drSnap = await db.collection('drivers').get();
            const drivers = drSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Porositë e muajit
            const ordersSnap = await db.collection('orders')
                .where('createdAtLocal', '>=', monthStart)
                .where('createdAtLocal', '<=', monthEnd)
                .where('status', '==', 'completed')
                .get();

            const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            cachedOperators = operators;
            cachedDrivers = drivers;

            // Llogarit pagat
            const operatorStats = calculateOperatorStats(operators, orders, commission);
            const driverStats = calculateDriverStats(drivers, orders, commission);

            renderLayout(operatorStats, driverStats, commission);

        } catch (e) {
            console.error('❌ renderAll:', e);
            el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim: ${e.message}</p></div>`;
        }
    }

    // ═══ STATS OPERATORËT ═══
    function calculateOperatorStats(operators, orders, commission) {
        return operators.map(op => {
            const opOrders = orders.filter(o => o.operatorId === op.id);
            const revenue = opOrders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
            const companyShare = revenue * (commission / 100);

            // Paga: bazë + bonus
            const baseSalary = op.baseSalary || 300; // Pagë bazë mujore
            const bonus = companyShare * 0.3; // 30% e komisionit si bonus
            const total = baseSalary + bonus;

            return {
                id: op.id,
                name: op.name,
                role: op.role || 'dispatcher',
                orders: opOrders.length,
                revenue: +revenue.toFixed(2),
                baseSalary,
                bonus: +bonus.toFixed(2),
                total: +total.toFixed(2)
            };
        }).sort((a, b) => b.total - a.total);
    }

    // ═══ STATS SHOFRËT ═══
    function calculateDriverStats(drivers, orders, commission) {
        return drivers.map(d => {
            const drOrders = orders.filter(o => o.driverId === d.id);
            const revenue = drOrders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
            const driverShare = revenue * ((100 - commission) / 100);

            return {
                id: d.id,
                name: d.name,
                vehicleNum: String(d.vehicleId || 0).padStart(2, '0'),
                orders: drOrders.length,
                revenue: +revenue.toFixed(2),
                total: +driverShare.toFixed(2)
            };
        }).sort((a, b) => b.total - a.total);
    }

    // ═══ LAYOUT ═══
    function renderLayout(operatorStats, driverStats, commission) {
        const el = document.getElementById('salaries-content');
        const monthName = new Date(currentYear, currentMonth).toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' });

        const totalOperatorsPay = operatorStats.reduce((s, o) => s + o.total, 0);
        const totalDriversPay = driverStats.reduce((s, d) => s + d.total, 0);
        const totalPay = totalOperatorsPay + totalDriversPay;

        el.innerHTML = `
            <div class="page-actions" style="margin-bottom:16px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <button class="filter-btn" style="padding:9px 14px;" onclick="DirectorSalaries.changeMonth(-1)">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <div style="font-size:14px;font-weight:800;text-transform:capitalize;color:var(--accent-purple);min-width:180px;text-align:center;">
                        <i class="fa-solid fa-calendar"></i> ${monthName}
                    </div>
                    <button class="filter-btn" style="padding:9px 14px;" onclick="DirectorSalaries.changeMonth(1)">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
                <button class="filter-btn" style="padding:9px 14px;" onclick="DirectorSalaries.exportCsv()">
                    <i class="fa-solid fa-download"></i> Eksporto
                </button>
            </div>

            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-wallet"></i> Total pagesave</div>
                    <div class="kpi-value green">€${totalPay.toFixed(2)}</div>
                    <div class="kpi-sub">Komisioni: ${commission}%</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-headset"></i> Për operatorët</div>
                    <div class="kpi-value blue">€${totalOperatorsPay.toFixed(2)}</div>
                    <div class="kpi-sub">${operatorStats.length} operatorë</div>
                </div>
                <div class="kpi-card purple">
                    <div class="kpi-label"><i class="fa-solid fa-car"></i> Për shoferët</div>
                    <div class="kpi-value" style="color:#c084fc;">€${totalDriversPay.toFixed(2)}</div>
                    <div class="kpi-sub">${driverStats.length} shoferë</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-percent"></i> Fitimi kompanisë</div>
                    <div class="kpi-value yellow">€${((totalOperatorsPay + totalDriversPay) * commission / 100).toFixed(2)}</div>
                    <div class="kpi-sub">Pas pagesave</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="admin-table-wrap">
                    <div style="padding:14px 18px;background:var(--bg-tertiary);border-bottom:1px solid var(--border-color);">
                        <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--accent-purple);">
                            <i class="fa-solid fa-headset"></i> Operatorët (${operatorStats.length})
                        </div>
                    </div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Operatori</th>
                                <th>Porosi</th>
                                <th>Bazë</th>
                                <th>Bonus</th>
                                <th>Totali</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${operatorStats.length === 0
                                ? '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">Nuk ka operatorë</td></tr>'
                                : operatorStats.map(o => `
                                    <tr>
                                        <td><strong style="color:var(--text-primary);">${o.name}</strong><br><small style="color:var(--text-muted);font-size:10px;">${o.role}</small></td>
                                        <td class="mono" style="font-weight:800;">${o.orders}</td>
                                        <td class="mono">€${o.baseSalary.toFixed(2)}</td>
                                        <td class="mono" style="color:var(--accent-green);">€${o.bonus.toFixed(2)}</td>
                                        <td class="mono" style="color:var(--accent-purple);font-weight:800;font-size:13px;">€${o.total.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="admin-table-wrap">
                    <div style="padding:14px 18px;background:var(--bg-tertiary);border-bottom:1px solid var(--border-color);">
                        <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#c084fc;">
                            <i class="fa-solid fa-car"></i> Shoferët (${driverStats.length})
                        </div>
                    </div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Nr.</th>
                                <th>Shoferi</th>
                                <th>Porosi</th>
                                <th>Të ardhura</th>
                                <th>Pagа</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${driverStats.length === 0
                                ? '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">Nuk ka shoferë</td></tr>'
                                : driverStats.map(d => `
                                    <tr>
                                        <td><span class="vehicle-badge">${d.vehicleNum}</span></td>
                                        <td><strong style="color:var(--text-primary);">${d.name}</strong></td>
                                        <td class="mono" style="font-weight:800;">${d.orders}</td>
                                        <td class="mono">€${d.revenue.toFixed(2)}</td>
                                        <td class="mono" style="color:#c084fc;font-weight:800;font-size:13px;">€${d.total.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ═══ EXPORT ═══
    function exportCsv() {
        const monthName = new Date(currentYear, currentMonth).toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' });
        const rows = [];

        // Operatorët
        cachedOperators.forEach(op => {
            rows.push({
                'Tipi': 'Operator',
                'Emri': op.name,
                'Roli': op.role,
                'Porosi': '',
                'Të ardhura': '',
                'Paga (€)': ''
            });
        });

        if (window.TaxiExport) {
            showToast('info', '📥 Duke u përgatitur', 'Eksporti do të jetë gati së shpejti');
        }
    }

    function showToast(type, title, msg) {
        if (window.DirectorApp?.showToast) window.DirectorApp.showToast(type, title, msg);
    }

    return { init, load, changeMonth, exportCsv };
})();

console.log('✅ director/salaries.js ngarkuar');
