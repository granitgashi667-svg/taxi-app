'use strict';

/**
 * target-history.js — Historiku i porosive me filtra
 */

window.TaxiTargetHistory = (() => {
    const COLLECTION = 'orders';
    const cache = new Map();

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ FILTRAT E SHPEJTË ═══
    function getDateRange(filter) {
        const now = new Date();
        const start = new Date();
        const end = new Date();

        switch (filter) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'yesterday':
                start.setDate(start.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(end.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'week':
                start.setDate(start.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start.setDate(start.getDate() - 30);
                start.setHours(0, 0, 0, 0);
                break;
            case 'year':
                start.setMonth(0, 1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'thisMonth':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'thisYear':
                start.setMonth(0, 1);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            default:
                start.setHours(0, 0, 0, 0);
        }

        return { from: start.getTime(), to: end.getTime() };
    }

    // ═══ KËRKO POROSI ═══
    async function query(filters = {}) {
        const database = db();
        if (!database) return [];

        try {
            let q = database.collection(COLLECTION);

            // Filtra në Firestore
            if (filters.from) q = q.where('createdAtLocal', '>=', filters.from);
            if (filters.to) q = q.where('createdAtLocal', '<=', filters.to);
            if (filters.status) q = q.where('status', '==', filters.status);
            if (filters.phone) q = q.where('phone', '==', filters.phone);
            if (filters.driverId) q = q.where('driverId', '==', filters.driverId);
            if (filters.zone) q = q.where('zone', '==', filters.zone);

            q = q.orderBy('createdAtLocal', 'desc').limit(filters.limit || 500);

            const snap = await q.get();
            let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filtra client-side
            if (filters.search) {
                const s = filters.search.toLowerCase();
                results = results.filter(o =>
                    (o.phone || '').includes(s) ||
                    (o.pickup || '').toLowerCase().includes(s) ||
                    (o.destination || '').toLowerCase().includes(s) ||
                    (o.driverName || '').toLowerCase().includes(s)
                );
            }

            if (filters.minPrice !== undefined) {
                results = results.filter(o => (parseFloat(o.price) || 0) >= filters.minPrice);
            }

            return results;
        } catch (e) {
            console.error('❌ history query:', e);
            return [];
        }
    }

    // ═══ STATISTIKA NGA LISTA ═══
    function summary(orders) {
        const completed = orders.filter(o => o.status === 'completed').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;
        const revenue = orders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
        const avgPrice = completed > 0 ? revenue / completed : 0;

        return {
            total: orders.length,
            completed,
            cancelled,
            revenue: +revenue.toFixed(2),
            avgPrice: +avgPrice.toFixed(2),
            successRate: orders.length > 0 ? +((completed / orders.length) * 100).toFixed(1) : 0
        };
    }

    // ═══ RENDER FAQJA ═══
    async function renderPage(filter = 'today') {
        const el = document.querySelector('.page[data-page="history"]');
        if (!el) return;

        el.innerHTML = `
            <div class="page-header">
                <div class="page-title">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <div>
                        <h2>Historiku i Porosive</h2>
                        <p>Filtro dhe shiko porositë · ${filter}</p>
                    </div>
                </div>
            </div>

            <div class="filter-bar" style="margin-bottom:16px;flex-wrap:wrap;">
                <button class="filter-btn ${filter === 'today' ? 'active' : ''}" onclick="TaxiTargetHistory.renderPage('today')">Sot</button>
                <button class="filter-btn ${filter === 'yesterday' ? 'active' : ''}" onclick="TaxiTargetHistory.renderPage('yesterday')">Dje</button>
                <button class="filter-btn ${filter === 'week' ? 'active' : ''}" onclick="TaxiTargetHistory.renderPage('week')">7 ditë</button>
                <button class="filter-btn ${filter === 'month' ? 'active' : ''}" onclick="TaxiTargetHistory.renderPage('month')">30 ditë</button>
                <button class="filter-btn ${filter === 'thisMonth' ? 'active' : ''}" onclick="TaxiTargetHistory.renderPage('thisMonth')">Ky muaj</button>
                <button class="filter-btn ${filter === 'thisYear' ? 'active' : ''}" onclick="TaxiTargetHistory.renderPage('thisYear')">Ky vit</button>
                <button class="filter-btn ${filter === 'year' ? 'active' : ''}" onclick="TaxiTargetHistory.renderPage('year')">Viti</button>
            </div>

            <div class="filter-bar" style="margin-bottom:16px;">
                <input type="text" id="history-search" class="input-field" placeholder="Kërko (telefon, adresë, shofer)..." style="flex:1;min-width:200px;">
                <select id="history-status" class="input-field" style="max-width:160px;">
                    <option value="">Të gjitha statuset</option>
                    <option value="completed">Të përfunduara</option>
                    <option value="cancelled">Anuluar</option>
                    <option value="waiting">Në pritje</option>
                    <option value="assigned">Caktuar</option>
                    <option value="onroute">Në rrugë</option>
                </select>
                <button class="btn-primary" onclick="TaxiTargetHistory.applyFilters('${filter}')">
                    <i class="fa-solid fa-search"></i> Kërko
                </button>
            </div>

            <div id="history-stats" class="kpi-grid"></div>

            <div id="history-table-wrap" class="page-table-wrap">
                <div style="text-align:center;padding:40px;color:var(--text-muted);">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size:24px;"></i>
                    <p style="margin-top:10px;">Duke ngarkuar...</p>
                </div>
            </div>
        `;

        await loadData(filter);
    }

    async function loadData(filter, extraFilters = {}) {
        const range = getDateRange(filter);
        const filters = { ...range, ...extraFilters };

        const orders = await query(filters);
        cache.set(filter, orders);

        renderStats(orders);
        renderTable(orders);
    }

    function renderStats(orders) {
        const el = document.getElementById('history-stats');
        if (!el) return;
        const s = summary(orders);

        el.innerHTML = `
            <div class="kpi-card green">
                <div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Të ardhura</div>
                <div class="kpi-value green">€${s.revenue.toFixed(2)}</div>
                <div class="kpi-sub">${s.completed} porosi</div>
            </div>
            <div class="kpi-card blue">
                <div class="kpi-label"><i class="fa-solid fa-list"></i> Total</div>
                <div class="kpi-value blue">${s.total}</div>
                <div class="kpi-sub">Porosi totale</div>
            </div>
            <div class="kpi-card pink">
                <div class="kpi-label"><i class="fa-solid fa-xmark"></i> Anuluar</div>
                <div class="kpi-value pink">${s.cancelled}</div>
                <div class="kpi-sub">Të anuluara</div>
            </div>
            <div class="kpi-card yellow">
                <div class="kpi-label"><i class="fa-solid fa-percent"></i> Suksesi</div>
                <div class="kpi-value yellow">${s.successRate}%</div>
                <div class="kpi-sub">Normë suksesi</div>
            </div>
        `;
    }

    function renderTable(orders) {
        const wrap = document.getElementById('history-table-wrap');
        if (!wrap) return;

        const lbl = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', delay: 'Vonesë', completed: 'Përfunduar', waiting: 'Në pritje', arrived: 'Në vend', taximeter: 'Taksimetër', fixed: 'Fiks', cancelled: 'Anuluar', preorder: 'Termin' };

        wrap.innerHTML = `
            <table class="orders-table">
                <thead>
                    <tr><th>Data</th><th>Ora</th><th>Statusi</th><th>Vetura</th><th>Telefon</th><th>Marrja</th><th>Destinacioni</th><th>Shoferi</th><th>Shënim</th><th>Çmimi</th></tr>
                </thead>
                <tbody>
                    ${orders.length === 0
                        ? `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted);">Nuk u gjet asnjë porosi</td></tr>`
                        : orders.map(o => `
                            <tr onclick="openOrderDetail('${o.id}')" style="cursor:pointer;">
                                <td class="time">${o.createdDateStr || '—'}</td>
                                <td class="time">${o.createdTimeStr || o.time || '—'}</td>
                                <td><span class="status-badge ${o.status}">${lbl[o.status] || o.status}</span></td>
                                <td>${o.vehicleNum ? `<span class="vehicle-badge">${o.vehicleNum}</span>` : '—'}</td>
                                <td class="phone">${o.phone}</td>
                                <td class="location">${o.pickup}</td>
                                <td class="location">${o.destination || '—'}</td>
                                <td>${o.driverName || '—'}</td>
                                <td class="remark-cell">${o.remark || '—'}</td>
                                <td style="color:var(--accent-green);font-weight:800;font-family:var(--font-mono);">${o.price ? '€' + parseFloat(o.price).toFixed(2) : '—'}</td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        `;
    }

    async function applyFilters(filter) {
        const search = document.getElementById('history-search')?.value.trim() || '';
        const status = document.getElementById('history-status')?.value || '';

        const range = getDateRange(filter);
        const filters = { ...range };
        if (search) filters.search = search;
        if (status) filters.status = status;

        const orders = await query(filters);
        renderStats(orders);
        renderTable(orders);
    }

    function init() {
        console.log('✅ Target History aktivizuar');
    }

    return { init, renderPage, query, summary, getDateRange };
})();

console.log('✅ target-history.js ngarkuar');
