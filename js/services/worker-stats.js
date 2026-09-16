'use strict';

/**
 * worker-stats.js — Statistika të plota me datë/filtra për çdo punëtor
 */

window.TaxiWorkerStats = (() => {
    let currentFilter = 'today';
    let currentCustomFrom = null;
    let currentCustomTo = null;

    // ═══ FILTRAT ═══
    function getDateRange(filter = null) {
        const f = filter || currentFilter;
        const now = new Date();
        const start = new Date();
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        switch (f) {
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
            case 'custom':
                return {
                    from: currentCustomFrom || Date.now() - 86400000,
                    to: currentCustomTo || Date.now()
                };
        }
        return { from: start.getTime(), to: end.getTime() };
    }

    // ═══ MERR STATISTIKAT E PUNËTORËVE ═══
    async function getWorkerStats(type = 'operators', filter = null) {
        const db = window.TaxiFirebase?.db;
        if (!db) return [];

        const range = getDateRange(filter);

        try {
            // Merr të gjithë punëtorët
            const workersSnap = await db.collection(type).get();
            const workers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Merr porositë në range
            const ordersSnap = await db.collection('orders')
                .where('createdAtLocal', '>=', range.from)
                .where('createdAtLocal', '<=', range.to)
                .get();

            const orders = ordersSnap.docs.map(d => d.data());

            // Llogarit për secilin
            const stats = workers.map(w => {
                const workerOrders = type === 'operators'
                    ? orders.filter(o => o.operatorId === w.id)
                    : orders.filter(o => o.driverId === w.id);

                const completed = workerOrders.filter(o => o.status === 'completed');
                const cancelled = workerOrders.filter(o => o.status === 'cancelled');
                const waiting = workerOrders.filter(o => o.status === 'waiting');
                const revenue = completed.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

                // Caktimet (vetëm për operatorët)
                const auto = workerOrders.filter(o => o.dispatchMode === 'auto' || !o.dispatchMode).length;
                const closest = workerOrders.filter(o => o.dispatchMode === 'closest').length;
                const manual = workerOrders.filter(o => o.dispatchMode === 'manual').length;

                // Minutat aktive (nga stats e ruajtura)
                const stats2 = w.stats || {};
                const totalMinutes = stats2.totalMinutes || 0;
                const pauseMinutes = stats2.pauseMinutes || 0;

                return {
                    id: w.id,
                    name: w.name || 'I panjohur',
                    email: w.email || '',
                    role: w.role || type,
                    avatar: w.avatar || (w.name || 'OP').slice(0, 2).toUpperCase(),
                    phone: w.phone || '',
                    status: w.status || 'inactive',
                    rating: w.rating || 5.0,
                    // Statistikat
                    total: workerOrders.length,
                    completed: completed.length,
                    cancelled: cancelled.length,
                    waiting: waiting.length,
                    revenue: +revenue.toFixed(2),
                    avgPrice: completed.length > 0 ? +(revenue / completed.length).toFixed(2) : 0,
                    successRate: workerOrders.length > 0 ? +((completed.length / workerOrders.length) * 100).toFixed(1) : 0,
                    dispatch: { auto, closest, manual },
                    totalMinutes,
                    pauseMinutes,
                    activeMinutes: totalMinutes - pauseMinutes,
                    // Pushimet
                    vacations: w.vacations || { totalDays: 22, usedDays: 0, remainingDays: 22 }
                };
            });

            return stats.sort((a, b) => b.total - a.total);

        } catch (e) {
            console.error('❌ getWorkerStats:', e);
            return [];
        }
    }

    // ═══ RENDER FAQJA ═══
    async function renderPage(type = 'operators') {
        const el = document.querySelector(`.page[data-page="worker-stats-${type}"]`) ||
                   document.querySelector('.page[data-page="operators"]');

        if (!el) return;

        el.innerHTML = `
            <div class="page-header">
                <div class="page-title">
                    <i class="fa-solid fa-chart-simple"></i>
                    <div>
                        <h2>Statistikat e Plota</h2>
                        <p>Analiza e detajuar · ${type === 'operators' ? 'Operatorët' : 'Shoferët'}</p>
                    </div>
                </div>
            </div>

            <div class="filter-bar" style="margin-bottom:16px;flex-wrap:wrap;">
                <button class="filter-btn ${currentFilter === 'today' ? 'active' : ''}" onclick="TaxiWorkerStats.setFilter('today', '${type}')">Sot</button>
                <button class="filter-btn ${currentFilter === 'yesterday' ? 'active' : ''}" onclick="TaxiWorkerStats.setFilter('yesterday', '${type}')">Dje</button>
                <button class="filter-btn ${currentFilter === 'week' ? 'active' : ''}" onclick="TaxiWorkerStats.setFilter('week', '${type}')">7 ditë</button>
                <button class="filter-btn ${currentFilter === 'month' ? 'active' : ''}" onclick="TaxiWorkerStats.setFilter('month', '${type}')">Ky muaj</button>
                <button class="filter-btn ${currentFilter === 'year' ? 'active' : ''}" onclick="TaxiWorkerStats.setFilter('year', '${type}')">Ky vit</button>
                <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="TaxiWorkerStats.setFilter('all', '${type}')">Të gjitha</button>
                <button class="filter-btn" onclick="TaxiWorkerStats.openCustomRange('${type}')">
                    <i class="fa-solid fa-calendar"></i> Custom
                </button>
            </div>

            <div id="worker-stats-content">
                <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>
            </div>
        `;

        await loadData(type);
    }

    async function loadData(type = 'operators') {
        const el = document.getElementById('worker-stats-content');
        if (!el) return;

        const stats = await getWorkerStats(type);

        if (!stats.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka të dhëna</p></div>';
            return;
        }

        // KPI totals
        const totalRevenue = stats.reduce((s, w) => s + w.revenue, 0);
        const totalOrders = stats.reduce((s, w) => s + w.total, 0);
        const totalCompleted = stats.reduce((s, w) => s + w.completed, 0);
        const totalMinutes = stats.reduce((s, w) => s + w.totalMinutes, 0);

        const filterLabel = {
            today: 'Sot', yesterday: 'Dje', week: '7 ditët',
            month: 'Ky muaj', year: 'Ky vit', all: 'Të gjitha', custom: 'Custom'
        }[currentFilter];

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Të ardhura (${filterLabel})</div>
                    <div class="kpi-value green">€${totalRevenue.toFixed(2)}</div>
                    <div class="kpi-sub">Nga ${stats.length} punëtorë</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-clipboard-list"></i> Porosi totale</div>
                    <div class="kpi-value blue">${totalOrders}</div>
                    <div class="kpi-sub">${totalCompleted} të kryera</div>
                </div>
                <div class="kpi-card purple">
                    <div class="kpi-label"><i class="fa-solid fa-clock"></i> Minuta aktive</div>
                    <div class="kpi-value" style="color:var(--accent-purple);">${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min</div>
                    <div class="kpi-sub">Totali për të gjithë</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-percent"></i> Normë suksesi</div>
                    <div class="kpi-value yellow">${totalOrders > 0 ? ((totalCompleted / totalOrders) * 100).toFixed(1) : 0}%</div>
                    <div class="kpi-sub">Mesatarja</div>
                </div>
            </div>

            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Punëtori</th>
                            <th>Roli</th>
                            <th>Porosi</th>
                            <th>Realizuar</th>
                            <th>Anuluar</th>
                            <th>Suksesi</th>
                            <th>Minuta</th>
                            <th>Pushime</th>
                            <th>Të ardhura</th>
                            <th>Detaje</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.map((w, idx) => `
                            <tr>
                                <td class="mono">${idx + 1}</td>
                                <td>
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <div style="width:34px;height:34px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:white;font-family:var(--font-mono);flex-shrink:0;">${w.avatar}</div>
                                        <div>
                                            <div style="font-weight:700;color:var(--text-primary);">${w.name}</div>
                                            <div style="font-size:10px;color:var(--text-muted);">${w.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="admin-badge purple">${w.role}</span></td>
                                <td class="mono" style="font-weight:800;">${w.total}</td>
                                <td class="green">${w.completed}</td>
                                <td class="red">${w.cancelled}</td>
                                <td>
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        <div style="flex:1;height:5px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden;min-width:40px;">
                                            <div style="height:100%;width:${w.successRate}%;background:linear-gradient(90deg,#22c55e,#16a34a);"></div>
                                        </div>
                                        <span class="mono" style="font-size:10px;color:var(--accent-green);font-weight:800;">${w.successRate}%</span>
                                    </div>
                                </td>
                                <td class="mono" style="font-size:11px;">${Math.floor(w.totalMinutes / 60)}h ${w.totalMinutes % 60}min</td>
                                <td>
                                    <span class="admin-badge ${w.vacations.remainingDays > 10 ? 'green' : 'yellow'}">
                                        🏖️ ${w.vacations.remainingDays}d
                                    </span>
                                </td>
                                <td class="green mono" style="font-weight:800;">€${w.revenue.toFixed(2)}</td>
                                <td>
                                    <button class="filter-btn" style="padding:5px 10px;font-size:10px;" onclick="TaxiWorkerStats.showDetails('${w.id}', '${type}')">
                                        <i class="fa-solid fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ═══ SET FILTER ═══
    function setFilter(filter, type) {
        currentFilter = filter;
        renderPage(type);
    }

    // ═══ CUSTOM RANGE ═══
    function openCustomRange(type) {
        const from = prompt('Nga data (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
        if (!from) return;
        const to = prompt('Deri data (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
        if (!to) return;

        currentCustomFrom = new Date(from).getTime();
        currentCustomTo = new Date(to).setHours(23, 59, 59, 999);
        currentFilter = 'custom';
        renderPage(type);
    }

    // ═══ SHFAQ DETAJET ═══
    async function showDetails(workerId, type) {
        const stats = await getWorkerStats(type);
        const w = stats.find(x => x.id === workerId);
        if (!w) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-worker-detail';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-user"></i>
                        <h3>${w.name}</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-worker-detail').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display:flex;align-items:center;gap:14px;padding:16px;background:var(--bg-tertiary);border-radius:12px;border-left:4px solid var(--accent-purple);margin-bottom:20px;">
                        <div style="width:60px;height:60px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:white;font-family:var(--font-mono);">${w.avatar}</div>
                        <div>
                            <div style="font-size:16px;font-weight:800;">${w.name}</div>
                            <div style="font-size:12px;color:var(--text-muted);">${w.email}</div>
                            <span class="admin-badge purple" style="margin-top:6px;">${w.role}</span>
                        </div>
                    </div>

                    <div class="kpi-grid">
                        <div class="kpi-card green"><div class="kpi-label">Të ardhura</div><div class="kpi-value green">€${w.revenue.toFixed(2)}</div></div>
                        <div class="kpi-card blue"><div class="kpi-label">Porosi</div><div class="kpi-value blue">${w.total}</div></div>
                        <div class="kpi-card pink"><div class="kpi-label">Anuluar</div><div class="kpi-value pink">${w.cancelled}</div></div>
                        <div class="kpi-card yellow"><div class="kpi-label">Suksesi</div><div class="kpi-value yellow">${w.successRate}%</div></div>
                    </div>

                    <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px;">
                        <i class="fa-solid fa-clock"></i> KOHËT
                    </div>
                    <div class="kpi-grid">
                        <div class="kpi-card"><div class="kpi-label">Total</div><div class="kpi-value">${Math.floor(w.totalMinutes / 60)}h ${w.totalMinutes % 60}min</div></div>
                        <div class="kpi-card"><div class="kpi-label">Aktive</div><div class="kpi-value">${Math.floor(w.activeMinutes / 60)}h ${w.activeMinutes % 60}min</div></div>
                        <div class="kpi-card"><div class="kpi-label">Pauzë</div><div class="kpi-value">${w.pauseMinutes}min</div></div>
                    </div>

                    ${type === 'operators' ? `
                    <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px;">
                        <i class="fa-solid fa-robot"></i> CAKTIMET
                    </div>
                    <div class="kpi-grid">
                        <div class="kpi-card purple"><div class="kpi-label">Auto</div><div class="kpi-value" style="color:var(--accent-purple);">${w.dispatch.auto}</div></div>
                        <div class="kpi-card blue"><div class="kpi-label">Afër</div><div class="kpi-value blue">${w.dispatch.closest}</div></div>
                        <div class="kpi-card pink"><div class="kpi-label">Manual</div><div class="kpi-value pink">${w.dispatch.manual}</div></div>
                    </div>
                    ` : ''}

                    <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px;">
                        <i class="fa-solid fa-umbrella-beach"></i> PUSHIMET
                    </div>
                    <div class="kpi-grid">
                        <div class="kpi-card"><div class="kpi-label">Total</div><div class="kpi-value">${w.vacations.totalDays}</div></div>
                        <div class="kpi-card yellow"><div class="kpi-label">Shfrytëzuar</div><div class="kpi-value yellow">${w.vacations.usedDays}</div></div>
                        <div class="kpi-card green"><div class="kpi-label">Mbetura</div><div class="kpi-value green">${w.vacations.remainingDays}</div></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-worker-detail').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    return {
        renderPage, setFilter, openCustomRange,
        showDetails, getWorkerStats, getDateRange
    };
})();

console.log('✅ worker-stats.js ngarkuar');
