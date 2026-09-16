'use strict';

/**
 * js/admin/orders.js — Historiku i plotë i porosive
 */

window.AdminOrders = (() => {
    let currentFilter = 'today';
    let currentStatus = '';
    let currentSearch = '';
    let cachedOrders = [];

    // ═══ INIT ═══
    function init() {
        console.log('📋 AdminOrders: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('📋 Duke ngarkuar porositë...', currentFilter);
        await renderAll();
    }

    // ═══ FILTER ═══
    function filter(f, btn) {
        currentFilter = f;
        document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAll();
    }

    // ═══ APPLY FILTERS ═══
    function applyFilters() {
        currentSearch = document.getElementById('orders-search')?.value.trim() || '';
        currentStatus = document.getElementById('orders-status')?.value || '';
        renderAll();
    }

    // ═══ RENDER ALL ═══
    async function renderAll() {
        const el = document.getElementById('orders-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            // Range datash
            const range = getDateRange(currentFilter);

            // Query
            let q = db.collection('orders')
                .where('createdAtLocal', '>=', range.from)
                .where('createdAtLocal', '<=', range.to)
                .orderBy('createdAtLocal', 'desc')
                .limit(500);

            const snap = await q.get();
            let orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Filter status
            if (currentStatus) {
                orders = orders.filter(o => o.status === currentStatus);
            }

            // Filter search
            if (currentSearch) {
                const s = currentSearch.toLowerCase();
                orders = orders.filter(o =>
                    (o.phone || '').includes(s) ||
                    (o.pickup || '').toLowerCase().includes(s) ||
                    (o.destination || '').toLowerCase().includes(s) ||
                    (o.driverName || '').toLowerCase().includes(s) ||
                    (o.operatorName || '').toLowerCase().includes(s)
                );
            }

            cachedOrders = orders;

            renderStats(orders);
            renderFilters();
            renderTable(orders);

        } catch (e) {
            console.error('❌ renderAll:', e);
            el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim: ${e.message}</p></div>`;
        }
    }

    // ═══ RANGE DATASH ═══
    function getDateRange(filter) {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        switch (filter) {
            case 'today': start.setHours(0, 0, 0, 0); break;
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
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
        }
        return { from: start.getTime(), to: end.getTime() };
    }

    // ═══ STATS ═══
    function renderStats(orders) {
        const el = document.getElementById('orders-content');

        const total = orders.length;
        const completed = orders.filter(o => o.status === 'completed').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;
        const waiting = orders.filter(o => o.status === 'waiting').length;
        const revenue = orders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

        const filterLabel = {
            today: 'Sot',
            yesterday: 'Dje',
            week: '7 ditët',
            month: '30 ditët',
            year: 'Viti'
        }[currentFilter];

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Të ardhura (${filterLabel})</div>
                    <div class="kpi-value green">€${revenue.toFixed(2)}</div>
                    <div class="kpi-sub">${completed} porosi të kryera</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-clipboard-list"></i> Total porosi</div>
                    <div class="kpi-value blue">${total}</div>
                    <div class="kpi-sub">${filterLabel}</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-xmark"></i> Anuluar</div>
                    <div class="kpi-value pink">${cancelled}</div>
                    <div class="kpi-sub">${total > 0 ? ((cancelled / total) * 100).toFixed(1) : 0}%</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-hourglass-half"></i> Në pritje</div>
                    <div class="kpi-value yellow">${waiting}</div>
                    <div class="kpi-sub">Pa caktim</div>
                </div>
            </div>

            <div class="page-actions" style="margin-bottom:16px;flex-wrap:wrap;">
                <div class="filter-bar">
                    <button class="filter-btn ${currentFilter === 'today' ? 'active' : ''}" data-filter="today" onclick="AdminOrders.filter('today', this)">Sot</button>
                    <button class="filter-btn ${currentFilter === 'yesterday' ? 'active' : ''}" data-filter="yesterday" onclick="AdminOrders.filter('yesterday', this)">Dje</button>
                    <button class="filter-btn ${currentFilter === 'week' ? 'active' : ''}" data-filter="week" onclick="AdminOrders.filter('week', this)">7 ditë</button>
                    <button class="filter-btn ${currentFilter === 'month' ? 'active' : ''}" data-filter="month" onclick="AdminOrders.filter('month', this)">30 ditë</button>
                    <button class="filter-btn ${currentFilter === 'year' ? 'active' : ''}" data-filter="year" onclick="AdminOrders.filter('year', this)">Viti</button>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <input type="text" id="orders-search" class="input-field" placeholder="Kërko (telefon, adresë, shofer)..." value="${currentSearch}" style="min-width:220px;padding:9px 14px;font-size:12px;">
                    <select id="orders-status" class="input-field" style="min-width:140px;padding:9px 14px;font-size:12px;">
                        <option value="">Të gjitha</option>
                        <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Të përfunduara</option>
                        <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>Anuluar</option>
                        <option value="waiting" ${currentStatus === 'waiting' ? 'selected' : ''}>Në pritje</option>
                        <option value="assigned" ${currentStatus === 'assigned' ? 'selected' : ''}>Caktuar</option>
                        <option value="onroute" ${currentStatus === 'onroute' ? 'selected' : ''}>Në rrugë</option>
                    </select>
                    <button class="btn-primary" style="padding:9px 16px;font-size:12px;" onclick="AdminOrders.applyFilters()">
                        <i class="fa-solid fa-search"></i> Kërko
                    </button>
                    <button class="filter-btn" style="padding:9px 14px;font-size:12px;" onclick="AdminOrders.exportCsv()">
                        <i class="fa-solid fa-download"></i> Eksporto
                    </button>
                </div>
            </div>

            <div class="admin-table-wrap" id="orders-table-wrap"></div>
        `;
    }

    // ═══ FILTERS (bosh, të gjitha inline në renderStats) ═══
    function renderFilters() {}

    // ═══ TABLE ═══
    function renderTable(orders) {
        const wrap = document.getElementById('orders-table-wrap');
        if (!wrap) return;

        const lbl = {
            new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë',
            delay: 'Vonesë', completed: 'Përfunduar', waiting: 'Në pritje',
            arrived: 'Në vend', taximeter: 'Taksimetër', fixed: 'Fiks',
            cancelled: 'Anuluar', preorder: 'Termin'
        };

        wrap.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Ora</th>
                        <th>Statusi</th>
                        <th>Vetura</th>
                        <th>Telefon</th>
                        <th>Marrja</th>
                        <th>Destinacioni</th>
                        <th>Shoferi</th>
                        <th>Operatori</th>
                        <th>Shënim</th>
                        <th>Çmimi</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.length === 0
                        ? '<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted);">Nuk u gjet asnjë porosi</td></tr>'
                        : orders.map(o => `
                            <tr>
                                <td class="mono" style="font-size:11px;">${o.createdDateStr || '—'}</td>
                                <td class="mono" style="font-size:11px;">${o.createdTimeStr || o.time || '—'}</td>
                                <td><span class="status-badge ${o.status}">${lbl[o.status] || o.status}</span></td>
                                <td>${o.vehicleNum ? `<span class="vehicle-badge">${o.vehicleNum}</span>` : '—'}</td>
                                <td class="phone">${o.phone}</td>
                                <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.pickup || '—'}</td>
                                <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.destination || '—'}</td>
                                <td>${o.driverName || '—'}</td>
                                <td>${o.operatorName || '—'}</td>
                                <td class="remark-cell" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:italic;color:var(--text-muted);">${o.remark || '—'}</td>
                                <td class="${o.price ? 'green' : ''}" style="font-family:var(--font-mono);font-weight:800;">${o.price ? '€' + parseFloat(o.price).toFixed(2) : '—'}</td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        `;
    }

    // ═══ EXPORT CSV ═══
    function exportCsv() {
        if (!cachedOrders.length) {
            showToast('warning', 'Nuk ka të dhëna', 'Nuk mund të eksportohet');
            return;
        }

        const rows = cachedOrders.map(o => ({
            'Data': o.createdDateStr || '',
            'Ora': o.createdTimeStr || o.time || '',
            'Statusi': o.status || '',
            'Vetura': o.vehicleNum || '',
            'Telefon': o.phone || '',
            'Marrja': o.pickup || '',
            'Destinacioni': o.destination || '',
            'Shoferi': o.driverName || '',
            'Operatori': o.operatorName || '',
            'Shënim': o.remark || '',
            'Çmimi (€)': o.price || 0
        }));

        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `porosite-${currentFilter}-${Date.now()}.csv`);
            showToast('success', '📥 U shkarkua', `${cachedOrders.length} porosi u eksportuan`);
        }
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return { init, load, filter, applyFilters, exportCsv };
})();

console.log('✅ admin/orders.js ngarkuar');
