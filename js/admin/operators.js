'use strict';

/**
 * js/admin/operators.js — Statistikat e operatorëve
 */

window.AdminOperators = (() => {
    let currentFilter = 'today';
    let cachedData = [];

    // ═══ INIT ═══
    function init() {
        console.log('👥 AdminOperators: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('👥 Duke ngarkuar operatorët...', currentFilter);
        await renderAll();
    }

    // ═══ FILTER ═══
    function filter(f, btn) {
        currentFilter = f;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAll();
    }

    // ═══ RENDER ═══
    async function renderAll() {
        const el = document.getElementById('operators-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            // Range datash
            const range = getDateRange(currentFilter);

            // Merr operatorët
            const operatorsSnap = await db.collection('operators').get();
            const operators = operatorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Merr porositë
            const ordersSnap = await db.collection('orders')
                .where('createdAtLocal', '>=', range.from)
                .where('createdAtLocal', '<=', range.to)
                .get();
            const orders = ordersSnap.docs.map(d => d.data());

            // Llogarit statistikat
            const stats = calculateStats(operators, orders);
            cachedData = stats;

            // Render
            renderStats(stats, range);
            renderTable(stats);

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
            case 'today':
                start.setHours(0, 0, 0, 0);
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
        }

        return { from: start.getTime(), to: end.getTime() };
    }

    // ═══ LLOGARIT STATISTIKAT ═══
    function calculateStats(operators, orders) {
        return operators.map(op => {
            const opOrders = orders.filter(o => o.operatorId === op.id);

            const total = opOrders.length;
            const completed = opOrders.filter(o => o.status === 'completed').length;
            const cancelled = opOrders.filter(o => o.status === 'cancelled').length;
            const waiting = opOrders.filter(o => o.status === 'waiting').length;

            const revenue = opOrders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

            // Caktimet
            const auto = opOrders.filter(o => o.dispatchMode === 'auto' || !o.dispatchMode).length;
            const closest = opOrders.filter(o => o.dispatchMode === 'closest').length;
            const manual = opOrders.filter(o => o.dispatchMode === 'manual').length;

            return {
                id: op.id,
                name: op.name || 'I panjohur',
                email: op.email || '',
                role: op.role || 'dispatcher',
                avatar: op.avatar || (op.name || 'OP').slice(0, 2).toUpperCase(),
                total,
                completed,
                cancelled,
                waiting,
                revenue: +revenue.toFixed(2),
                avgPrice: completed > 0 ? +(revenue / completed).toFixed(2) : 0,
                successRate: total > 0 ? +((completed / total) * 100).toFixed(1) : 0,
                dispatch: { auto, closest, manual },
                active: op.active !== false
            };
        }).sort((a, b) => b.total - a.total);
    }

    // ═══ RENDER STATS ═══
    function renderStats(stats, range) {
        const el = document.getElementById('operators-content');

        const totalOrders = stats.reduce((s, o) => s + o.total, 0);
        const totalRevenue = stats.reduce((s, o) => s + o.revenue, 0);
        const totalCompleted = stats.reduce((s, o) => s + o.completed, 0);
        const activeOps = stats.filter(o => o.active).length;

        const filterLabel = {
            today: 'Sot',
            week: 'Kjo javë',
            month: 'Ky muaj',
            year: 'Ky vit'
        }[currentFilter];

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Të ardhura (${filterLabel})</div>
                    <div class="kpi-value green">€${totalRevenue.toFixed(2)}</div>
                    <div class="kpi-sub">${totalCompleted} porosi të kryera</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-clipboard-list"></i> Porosi totale</div>
                    <div class="kpi-value blue">${totalOrders}</div>
                    <div class="kpi-sub">${filterLabel}</div>
                </div>
                <div class="kpi-card purple">
                    <div class="kpi-label"><i class="fa-solid fa-headset"></i> Operatorë</div>
                    <div class="kpi-value" style="color:var(--accent-purple);">${stats.length}</div>
                    <div class="kpi-sub">${activeOps} aktivë</div>
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
                            <th>Operatori</th>
                            <th>Roli</th>
                            <th>Porosi</th>
                            <th>Realizuar</th>
                            <th>Anuluar</th>
                            <th>Auto / Afër / Manual</th>
                            <th>Suksesi</th>
                            <th>Të ardhura</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.length === 0
                            ? `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted);">Nuk ka të dhëna</td></tr>`
                            : stats.map((op, idx) => `
                                <tr>
                                    <td class="mono">${idx + 1}</td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:10px;">
                                            <div style="width:34px;height:34px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:white;font-family:var(--font-mono);flex-shrink:0;">${op.avatar}</div>
                                            <div>
                                                <div style="font-weight:700;color:var(--text-primary);">${op.name}</div>
                                                <div style="font-size:10px;color:var(--text-muted);">${op.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span class="admin-badge purple">${op.role}</span></td>
                                    <td class="mono" style="color:var(--text-primary);font-weight:800;">${op.total}</td>
                                    <td class="green">${op.completed}</td>
                                    <td class="red">${op.cancelled}</td>
                                    <td class="mono" style="font-size:11px;">
                                        <span style="color:var(--accent-purple);">${op.dispatch.auto}</span> /
                                        <span style="color:var(--accent-green);">${op.dispatch.closest}</span> /
                                        <span style="color:#60a5fa;">${op.dispatch.manual}</span>
                                    </td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <div style="flex:1;height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden;min-width:50px;">
                                                <div style="height:100%;width:${op.successRate}%;background:linear-gradient(90deg,#22c55e,#16a34a);"></div>
                                            </div>
                                            <span class="mono" style="font-size:11px;color:var(--accent-green);font-weight:800;">${op.successRate}%</span>
                                        </div>
                                    </td>
                                    <td class="green" style="font-size:13px;">€${op.revenue.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ═══ RENDER TABLE (e veçantë) ═══
    function renderTable(stats) {
        // Pjesa e tabelës u bë direkt në renderStats
    }

    // ═══ KARTO STATISTIKAT E NJË OPERATORI (Modal) ═══
    async function viewDetails(operatorId) {
        const op = cachedData.find(o => o.id === operatorId);
        if (!op) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-operator-detail';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-user-tie"></i>
                        <h3>${op.name}</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-operator-detail').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display:flex;align-items:center;gap:14px;padding:16px;background:var(--bg-tertiary);border-radius:12px;border-left:4px solid var(--accent-purple);margin-bottom:20px;">
                        <div style="width:60px;height:60px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:white;font-family:var(--font-mono);">${op.avatar}</div>
                        <div>
                            <div style="font-size:16px;font-weight:800;">${op.name}</div>
                            <div style="font-size:12px;color:var(--text-muted);">${op.email}</div>
                            <span class="admin-badge purple" style="margin-top:6px;">${op.role}</span>
                        </div>
                    </div>

                    <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
                        <i class="fa-solid fa-chart-simple"></i> STATISTIKAT (${currentFilter})
                    </div>

                    <div class="kpi-grid" style="margin-bottom:20px;">
                        <div class="kpi-card blue"><div class="kpi-label">Porosi totale</div><div class="kpi-value blue">${op.total}</div></div>
                        <div class="kpi-card green"><div class="kpi-label">Realizuar</div><div class="kpi-value green">${op.completed}</div></div>
                        <div class="kpi-card pink"><div class="kpi-label">Anuluar</div><div class="kpi-value pink">${op.cancelled}</div></div>
                        <div class="kpi-card yellow"><div class="kpi-label">Të ardhura</div><div class="kpi-value yellow">€${op.revenue.toFixed(2)}</div></div>
                    </div>

                    <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
                        <i class="fa-solid fa-robot"></i> CAKTIMET
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
                        <div style="padding:12px;background:rgba(168,85,247,.1);border-radius:10px;text-align:center;">
                            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Auto</div>
                            <div style="font-size:22px;font-weight:800;font-family:var(--font-mono);color:var(--accent-purple);">${op.dispatch.auto}</div>
                        </div>
                        <div style="padding:12px;background:rgba(34,197,94,.1);border-radius:10px;text-align:center;">
                            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Afër</div>
                            <div style="font-size:22px;font-weight:800;font-family:var(--font-mono);color:var(--accent-green);">${op.dispatch.closest}</div>
                        </div>
                        <div style="padding:12px;background:rgba(59,130,246,.1);border-radius:10px;text-align:center;">
                            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Manual</div>
                            <div style="font-size:22px;font-weight:800;font-family:var(--font-mono);color:#60a5fa;">${op.dispatch.manual}</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-operator-detail').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ EXPORT CSV ═══
    function exportCsv() {
        if (!cachedData.length) {
            showToast('warning', 'Nuk ka të dhëna', 'Nuk mund të eksportohet');
            return;
        }

        const rows = cachedData.map(op => ({
            'Emri': op.name,
            'Email': op.email,
            'Roli': op.role,
            'Porosi': op.total,
            'Realizuar': op.completed,
            'Anuluar': op.cancelled,
            'Auto': op.dispatch.auto,
            'Afër': op.dispatch.closest,
            'Manual': op.dispatch.manual,
            'Suksesi (%)': op.successRate,
            'Të ardhura (€)': op.revenue
        }));

        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `operatoret-${currentFilter}-${Date.now()}.csv`);
            showToast('success', '📥 U shkarkua', 'CSV u eksportua');
        }
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return { init, load, filter, exportCsv, viewDetails };
})();

console.log('✅ admin/operators.js ngarkuar');
