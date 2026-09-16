'use strict';

/**
 * js/director/finance.js — Financa të plota
 */

window.DirectorFinance = (() => {
    let currentFilter = 'today';
    let cachedOrders = [];

    // ═══ INIT ═══
    function init() {
        console.log('💰 DirectorFinance: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('💰 Duke ngarkuar financat...', currentFilter);
        await renderAll();
    }

    // ═══ FILTER ═══
    function filter(f, btn) {
        currentFilter = f;
        document.querySelectorAll('.filter-btn[data-ffilter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAll();
    }

    // ═══ RENDER ALL ═══
    async function renderAll() {
        const el = document.getElementById('finance-content');
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

            const range = getDateRange(currentFilter);

            const snap = await db.collection('orders')
                .where('createdAtLocal', '>=', range.from)
                .where('createdAtLocal', '<=', range.to)
                .get();

            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            cachedOrders = orders;

            const stats = calculateStats(orders, commission);

            renderLayout(stats, range, commission);

        } catch (e) {
            console.error('❌ renderAll:', e);
            el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim: ${e.message}</p></div>`;
        }
    }

    // ═══ RANGE ═══
    function getDateRange(filter) {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        switch (filter) {
            case 'today': start.setHours(0, 0, 0, 0); break;
            case 'week':
                start.setDate(start.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'year':
                start.setMonth(0, 1);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'all':
                start.setFullYear(2020, 0, 1);
                break;
        }
        return { from: start.getTime(), to: end.getTime() };
    }

    // ═══ STATS ═══
    function calculateStats(orders, commission) {
        const total = orders.length;
        const completed = orders.filter(o => o.status === 'completed');
        const cancelled = orders.filter(o => o.status === 'cancelled');

        const totalRevenue = completed.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
        const companyShare = totalRevenue * (commission / 100);
        const driversShare = totalRevenue - companyShare;

        const avgOrder = completed.length > 0 ? totalRevenue / completed.length : 0;

        // Grupim sipas tarifës
        const byTariff = {};
        completed.forEach(o => {
            const t = o.tariff || 'standard';
            if (!byTariff[t]) byTariff[t] = { count: 0, revenue: 0 };
            byTariff[t].count++;
            byTariff[t].revenue += parseFloat(o.price) || 0;
        });

        // Grupim sipas orës
        const byHour = Array(24).fill(0);
        completed.forEach(o => {
            if (o.createdAtLocal) {
                const h = new Date(o.createdAtLocal).getHours();
                byHour[h]++;
            }
        });

        return {
            total,
            completed: completed.length,
            cancelled: cancelled.length,
            totalRevenue: +totalRevenue.toFixed(2),
            companyShare: +companyShare.toFixed(2),
            driversShare: +driversShare.toFixed(2),
            avgOrder: +avgOrder.toFixed(2),
            commission,
            byTariff,
            byHour
        };
    }

    // ═══ LAYOUT ═══
    function renderLayout(stats, range, commission) {
        const el = document.getElementById('finance-content');
        const labels = { today: 'Sot', week: '7 ditë', month: 'Ky muaj', year: 'Ky vit', all: 'Të gjitha' };
        const dateFrom = new Date(range.from).toLocaleDateString('sq-AL');
        const dateTo = new Date(range.to).toLocaleDateString('sq-AL');

        el.innerHTML = `
            <div class="page-actions" style="margin-bottom:16px;">
                <div class="filter-bar">
                    <button class="filter-btn ${currentFilter === 'today' ? 'active' : ''}" data-ffilter="today" onclick="DirectorFinance.filter('today', this)">Sot</button>
                    <button class="filter-btn ${currentFilter === 'week' ? 'active' : ''}" data-ffilter="week" onclick="DirectorFinance.filter('week', this)">7 ditë</button>
                    <button class="filter-btn ${currentFilter === 'month' ? 'active' : ''}" data-ffilter="month" onclick="DirectorFinance.filter('month', this)">Ky muaj</button>
                    <button class="filter-btn ${currentFilter === 'year' ? 'active' : ''}" data-ffilter="year" onclick="DirectorFinance.filter('year', this)">Ky vit</button>
                    <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-ffilter="all" onclick="DirectorFinance.filter('all', this)">Të gjitha</button>
                </div>
                <button class="filter-btn" style="padding:9px 14px;" onclick="DirectorFinance.exportCsv()">
                    <i class="fa-solid fa-download"></i> Eksporto
                </button>
            </div>

            <div style="padding:12px 16px;background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.25);border-radius:10px;margin-bottom:20px;font-size:12px;color:var(--text-secondary);">
                <i class="fa-solid fa-calendar"></i> ${labels[currentFilter]} · ${dateFrom} → ${dateTo}
                · Komisioni: <strong style="color:var(--accent-green);">${commission}%</strong>
            </div>

            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Të ardhura totale</div>
                    <div class="kpi-value green">€${stats.totalRevenue.toFixed(2)}</div>
                    <div class="kpi-sub">${stats.completed} porosi të kryera</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-percent"></i> Komisioni (${commission}%)</div>
                    <div class="kpi-value blue">€${stats.companyShare.toFixed(2)}</div>
                    <div class="kpi-sub">Fitimi i kompanisë</div>
                </div>
                <div class="kpi-card purple">
                    <div class="kpi-label"><i class="fa-solid fa-hand-holding-dollar"></i> Pagat (${100 - commission}%)</div>
                    <div class="kpi-value" style="color:#c084fc;">€${stats.driversShare.toFixed(2)}</div>
                    <div class="kpi-sub">Për shoferët</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-chart-line"></i> Mesatarja</div>
                    <div class="kpi-value yellow">€${stats.avgOrder.toFixed(2)}</div>
                    <div class="kpi-sub">Për porosi</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-chart-pie"></i>
                        <h3>Sipas tarifës</h3>
                    </div>
                    <div class="db-panel-body">
                        ${Object.keys(stats.byTariff).length === 0
                            ? '<div class="empty-state"><p>Nuk ka të dhëna</p></div>'
                            : Object.entries(stats.byTariff).map(([key, val]) => `
                                <div style="padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;margin-bottom:8px;">
                                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                                        <span style="font-weight:700;text-transform:capitalize;">${key}</span>
                                        <span style="font-family:var(--font-mono);color:var(--accent-green);font-weight:800;">€${val.revenue.toFixed(2)}</span>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);">
                                        <span>${val.count} porosi</span>
                                        <span>€${(val.revenue / val.count).toFixed(2)} / porosi</span>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>

                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-clock"></i>
                        <h3>Orët më të ngarkuara</h3>
                    </div>
                    <div class="db-panel-body">
                        ${stats.byHour.every(h => h === 0)
                            ? '<div class="empty-state"><p>Nuk ka të dhëna</p></div>'
                            : (() => {
                                const sorted = stats.byHour.map((c, h) => ({ h, c })).sort((a, b) => b.c - a.c).slice(0, 5);
                                return sorted.map(s => `
                                    <div style="display:flex;align-items:center;gap:12px;padding:8px 0;">
                                        <div style="font-family:var(--font-mono);font-weight:800;color:var(--accent-purple);min-width:50px;">${String(s.h).padStart(2, '0')}:00</div>
                                        <div style="flex:1;height:8px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden;">
                                            <div style="height:100%;width:${(s.c / Math.max(...stats.byHour)) * 100}%;background:linear-gradient(90deg,#a855f7,#ec4899);"></div>
                                        </div>
                                        <div style="font-family:var(--font-mono);font-weight:800;font-size:13px;">${s.c}</div>
                                    </div>
                                `).join('');
                            })()
                        }
                    </div>
                </div>
            </div>

            <div class="admin-table-wrap">
                <div style="padding:14px 18px;background:var(--bg-tertiary);border-bottom:1px solid var(--border-color);">
                    <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--accent-purple);">
                        <i class="fa-solid fa-list"></i> Porositë e përfunduara (${stats.completed})
                    </div>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Ora</th>
                            <th>Vetura</th>
                            <th>Telefon</th>
                            <th>Shoferi</th>
                            <th>Tarifa</th>
                            <th>Çmimi</th>
                            <th>Komisioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cachedOrders.filter(o => o.status === 'completed').slice(0, 100).map(o => {
                            const price = parseFloat(o.price) || 0;
                            const com = price * (commission / 100);
                            return `
                                <tr>
                                    <td class="mono" style="font-size:11px;">${o.createdDateStr || '—'}</td>
                                    <td class="mono" style="font-size:11px;">${o.createdTimeStr || '—'}</td>
                                    <td>${o.vehicleNum ? `<span class="vehicle-badge">${o.vehicleNum}</span>` : '—'}</td>
                                    <td class="phone">${o.phone}</td>
                                    <td>${o.driverName || '—'}</td>
                                    <td style="text-transform:capitalize;">${o.tariff || 'standard'}</td>
                                    <td class="green" style="font-family:var(--font-mono);font-weight:800;">€${price.toFixed(2)}</td>
                                    <td style="font-family:var(--font-mono);color:var(--accent-purple);font-weight:800;">€${com.toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('') || '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">Nuk ka porosi të përfunduara</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ═══ EXPORT ═══
    function exportCsv() {
        if (!cachedOrders.length) {
            showToast('warning', 'Nuk ka të dhëna', '');
            return;
        }

        const rows = cachedOrders.map(o => ({
            'Data': o.createdDateStr || '',
            'Ora': o.createdTimeStr || '',
            'Statusi': o.status || '',
            'Vetura': o.vehicleNum || '',
            'Telefon': o.phone || '',
            'Shoferi': o.driverName || '',
            'Tarifa': o.tariff || '',
            'Çmimi': o.price || 0
        }));

        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `financa-${currentFilter}-${Date.now()}.csv`);
            showToast('success', '📥 U shkarkua', '');
        }
    }

    function showToast(type, title, msg) {
        if (window.DirectorApp?.showToast) window.DirectorApp.showToast(type, title, msg);
    }

    return { init, load, filter, exportCsv };
})();

console.log('✅ director/finance.js ngarkuar');
