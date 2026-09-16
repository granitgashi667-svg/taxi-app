'use strict';

/**
 * js/admin/reports.js — Raporte të plota
 * Ditor | Javor | Mujor | Vjetor | Punëtorët (me filtra datë)
 */

window.AdminReports = (() => {
    let currentReport = 'daily';
    let charts = {};
    let cachedOrders = [];
    let workersCache = [];
    let workerFilters = { from: '', to: '', workerId: 'all', sort: 'orders' };

    // ═══ INIT ═══
    function init() {
        console.log('📊 AdminReports: Init...');
    }

    async function load() {
        console.log('📊 Duke ngarkuar raportet...', currentReport);
        if (currentReport === 'workers') {
            await loadWorkersList();
        }
        await renderAll();
    }

    function changeReport(type, btn) {
        currentReport = type;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        renderAll();
    }

    // ═══ RENDER ALL ═══
    async function renderAll() {
        const el = document.getElementById('reports-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            if (currentReport === 'workers') {
                await renderWorkersView(db, el);
                return;
            }

            const range = getDateRange(currentReport);
            const snap = await db.collection('orders')
                .where('createdAtLocal', '>=', range.from)
                .where('createdAtLocal', '<=', range.to)
                .get()
                .catch(() => db.collection('orders').limit(1000).get());

            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(o => {
                    if (!o.createdAtLocal) return false;
                    const t = new Date(o.createdAtLocal).getTime();
                    return t >= range.from && t <= range.to;
                });

            cachedOrders = orders;

            const stats = calculateStats(orders);
            const dailyData = calculateDaily(orders, range);
            const hourlyData = calculateHourly(orders);
            const topOperators = calculateTopOperators(orders);
            const topDrivers = calculateTopDrivers(orders);

            renderLayout(stats, range);
            renderCharts(dailyData, hourlyData);
            renderTables(topOperators, topDrivers);

        } catch (e) {
            console.error('❌ renderAll:', e);
            el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim: ${e.message}</p></div>`;
        }
    }

    // ═══ RANGE ═══
    function getDateRange(type) {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        switch (type) {
            case 'daily': start.setHours(0, 0, 0, 0); break;
            case 'weekly':
                start.setDate(start.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                break;
            case 'monthly':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'yearly':
                start.setMonth(0, 1);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
        }
        return { from: start.getTime(), to: end.getTime() };
    }

    // ═══ STATS ═══
    function calculateStats(orders) {
        const total = orders.length;
        const completed = orders.filter(o => o.status === 'completed').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;
        const waiting = orders.filter(o => o.status === 'waiting').length;
        const revenue = orders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
        const avgPrice = completed > 0 ? revenue / completed : 0;

        return {
            total, completed, cancelled, waiting,
            revenue: +revenue.toFixed(2),
            avgPrice: +avgPrice.toFixed(2),
            successRate: total > 0 ? +((completed / total) * 100).toFixed(1) : 0
        };
    }

    function calculateDaily(orders, range) {
        const days = {};
        const daysCount = Math.min(90, Math.ceil((range.to - range.from) / 86400000));
        for (let i = 0; i < daysCount; i++) {
            const d = new Date(range.from + i * 86400000);
            const key = d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' });
            days[key] = { count: 0, revenue: 0 };
        }
        orders.forEach(o => {
            if (!o.createdAtLocal) return;
            const d = new Date(o.createdAtLocal);
            const key = d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' });
            if (days[key]) {
                days[key].count++;
                days[key].revenue += parseFloat(o.price) || 0;
            }
        });
        return {
            labels: Object.keys(days),
            counts: Object.values(days).map(d => d.count),
            revenues: Object.values(days).map(d => +d.revenue.toFixed(2))
        };
    }

    function calculateHourly(orders) {
        const hours = Array(24).fill(0);
        orders.forEach(o => {
            if (!o.createdAtLocal) return;
            const h = new Date(o.createdAtLocal).getHours();
            hours[h]++;
        });
        return { labels: hours.map((_, i) => `${String(i).padStart(2, '0')}:00`), counts: hours };
    }

    function calculateTopOperators(orders) {
        const map = {};
        orders.forEach(o => {
            if (!o.operatorId) return;
            if (!map[o.operatorId]) map[o.operatorId] = { name: o.operatorName || '?', orders: 0, revenue: 0 };
            map[o.operatorId].orders++;
            map[o.operatorId].revenue += parseFloat(o.price) || 0;
        });
        return Object.values(map).sort((a, b) => b.orders - a.orders).slice(0, 10);
    }

    function calculateTopDrivers(orders) {
        const map = {};
        orders.forEach(o => {
            if (!o.driverId) return;
            if (!map[o.driverId]) map[o.driverId] = { name: o.driverName || '?', vehicleNum: o.vehicleNum || '', orders: 0, revenue: 0 };
            map[o.driverId].orders++;
            map[o.driverId].revenue += parseFloat(o.price) || 0;
        });
        return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }

    // ═══ WORKERS: LISTA ═══
    async function loadWorkersList() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            let workers = [];
            try {
                const s = await db.collection('workers').limit(500).get();
                workers = s.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {}
            if (!workers.length) {
                try {
                    const s = await db.collection('users').where('role', 'in', ['operator', 'dispatcher']).limit(500).get();
                    workers = s.docs.map(d => ({ id: d.id, ...d.data() }));
                } catch {}
            }
            if (!workers.length) {
                // Nga orders — nxjerrim vetë operatorët
                const s = await db.collection('orders').limit(1000).get();
                const seen = {};
                s.docs.forEach(d => {
                    const o = d.data();
                    if (o.operatorId && !seen[o.operatorId]) {
                        seen[o.operatorId] = { id: o.operatorId, name: o.operatorName || o.operatorId };
                    }
                });
                workers = Object.values(seen);
            }
            workersCache = workers;
        } catch (e) {
            console.error('❌ loadWorkersList:', e);
        }
    }

    // ═══ WORKERS VIEW ═══
    async function renderWorkersView(db, el) {
        // Default: sot
        if (!workerFilters.from) {
            const today = new Date().toISOString().slice(0, 10);
            workerFilters.from = today;
            workerFilters.to = today;
        }

        const fromTs = new Date(workerFilters.from + 'T00:00:00').getTime();
        const toTs = new Date(workerFilters.to + 'T23:59:59').getTime();

        const snap = await db.collection('orders')
            .where('createdAtLocal', '>=', fromTs)
            .where('createdAtLocal', '<=', toTs)
            .get()
            .catch(async () => {
                const all = await db.collection('orders').limit(2000).get();
                return all;
            });

        let orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(o => {
                if (!o.createdAtLocal) return true;
                const t = new Date(o.createdAtLocal).getTime();
                return t >= fromTs && t <= toTs;
            });

        if (workerFilters.workerId !== 'all') {
            orders = orders.filter(o => o.operatorId === workerFilters.workerId);
        }

        cachedOrders = orders;

        const workerStats = calculateWorkerStats(orders);
        const sorted = sortWorkerStats(workerStats, workerFilters.sort);

        el.innerHTML = `
            <div class="page-actions" style="margin-bottom:20px;flex-wrap:wrap;">
                <div class="filter-bar" style="flex-wrap:wrap;">
                    <button class="filter-btn ${currentReport === 'daily' ? 'active' : ''}" onclick="AdminReports.changeReport('daily', this)">Ditor</button>
                    <button class="filter-btn ${currentReport === 'weekly' ? 'active' : ''}" onclick="AdminReports.changeReport('weekly', this)">Javor</button>
                    <button class="filter-btn ${currentReport === 'monthly' ? 'active' : ''}" onclick="AdminReports.changeReport('monthly', this)">Mujor</button>
                    <button class="filter-btn ${currentReport === 'yearly' ? 'active' : ''}" onclick="AdminReports.changeReport('yearly', this)">Vjetor</button>
                    <button class="filter-btn ${currentReport === 'workers' ? 'active' : ''}" onclick="AdminReports.changeReport('workers', this)">
                        <i class="fa-solid fa-user-tie"></i> Punëtorët
                    </button>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="filter-btn" style="padding:9px 14px;" onclick="AdminReports.exportWorkersCsv()">
                        <i class="fa-solid fa-download"></i> CSV
                    </button>
                    <button class="filter-btn" style="padding:9px 14px;" onclick="window.print()">
                        <i class="fa-solid fa-print"></i> Printo
                    </button>
                </div>
            </div>

            <div class="db-panel" style="margin-bottom:20px;">
                <div class="db-panel-header"><i class="fa-solid fa-filter"></i><h3>Filtra</h3></div>
                <div class="db-panel-body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                    <label style="font-size:11px;color:var(--text-secondary);">
                        Nga data
                        <input type="date" id="rep-from" class="input-sm" style="width:100%;margin-top:4px;"
                            value="${workerFilters.from}" onchange="AdminReports.applyWorkerFilters()">
                    </label>
                    <label style="font-size:11px;color:var(--text-secondary);">
                        Deri data
                        <input type="date" id="rep-to" class="input-sm" style="width:100%;margin-top:4px;"
                            value="${workerFilters.to}" onchange="AdminReports.applyWorkerFilters()">
                    </label>
                    <label style="font-size:11px;color:var(--text-secondary);">
                        Punëtori
                        <select id="rep-worker" class="input-sm" style="width:100%;margin-top:4px;"
                            onchange="AdminReports.applyWorkerFilters()">
                            <option value="all">Të gjithë</option>
                            ${workersCache.map(w => `
                                <option value="${w.id}" ${workerFilters.workerId === w.id ? 'selected' : ''}>
                                    ${w.name || w.email || w.id}
                                </option>
                            `).join('')}
                        </select>
                    </label>
                    <label style="font-size:11px;color:var(--text-secondary);">
                        Rendit sipas
                        <select id="rep-sort" class="input-sm" style="width:100%;margin-top:4px;"
                            onchange="AdminReports.applyWorkerFilters()">
                            <option value="orders" ${workerFilters.sort === 'orders' ? 'selected' : ''}>Porosi</option>
                            <option value="revenue" ${workerFilters.sort === 'revenue' ? 'selected' : ''}>Të ardhura</option>
                            <option value="success" ${workerFilters.sort === 'success' ? 'selected' : ''}>Suksesi</option>
                            <option value="name" ${workerFilters.sort === 'name' ? 'selected' : ''}>Emri</option>
                        </select>
                    </label>
                    <div style="display:flex;align-items:flex-end;gap:8px;">
                        <button class="btn-secondary" style="padding:9px 14px;" onclick="AdminReports.quickRange('today')">Sot</button>
                        <button class="btn-secondary" style="padding:9px 14px;" onclick="AdminReports.quickRange('week')">Java</button>
                        <button class="btn-secondary" style="padding:9px 14px;" onclick="AdminReports.quickRange('month')">Muaji</button>
                        <button class="btn-secondary" style="padding:9px 14px;" onclick="AdminReports.resetWorkerFilters()"><i class="fa-solid fa-rotate"></i></button>
                    </div>
                </div>
            </div>

            ${renderWorkerSummary(workerStats, orders)}

            <div class="db-panel" style="margin-top:20px;">
                <div class="db-panel-header">
                    <i class="fa-solid fa-user-tie"></i>
                    <h3>Statistikat për punëtorë</h3>
                    <span style="margin-left:auto;font-size:11px;color:var(--text-secondary);">${sorted.length} punëtorë</span>
                </div>
                <div class="db-panel-body" style="padding:0;">
                    ${sorted.length ? renderWorkersTable(sorted) : '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka punëtorë me këto filtra</p></div>'}
                </div>
            </div>
        `;
    }

    // ═══ WORKERS STATS ═══
    function calculateWorkerStats(orders) {
        const map = {};
        orders.forEach(o => {
            const id = o.operatorId || o.createdBy || 'unknown';
            const name = o.operatorName || o.createdByName || id;
            if (!map[id]) {
                map[id] = {
                    id, name,
                    orders: 0, completed: 0, cancelled: 0, pending: 0,
                    revenue: 0, hours: new Set(), byHour: Array(24).fill(0)
                };
            }
            const w = map[id];
            w.orders++;
            if (o.status === 'completed') w.completed++;
            else if (o.status === 'cancelled') w.cancelled++;
            else w.pending++;
            w.revenue += parseFloat(o.price) || 0;
            if (o.createdAtLocal) {
                const d = new Date(o.createdAtLocal);
                w.hours.add(d.getHours());
                w.byHour[d.getHours()]++;
            }
        });

        return Object.values(map).map(w => ({
            ...w,
            revenue: +w.revenue.toFixed(2),
            avg: w.orders ? +(w.revenue / w.orders).toFixed(2) : 0,
            success: w.orders ? +((w.completed / w.orders) * 100).toFixed(1) : 0,
            hoursWorked: w.hours.size
        }));
    }

    function sortWorkerStats(arr, sort) {
        const s = [...arr];
        switch (sort) {
            case 'revenue': return s.sort((a, b) => b.revenue - a.revenue);
            case 'success': return s.sort((a, b) => b.success - a.success);
            case 'name': return s.sort((a, b) => a.name.localeCompare(b.name));
            default: return s.sort((a, b) => b.orders - a.orders);
        }
    }

    function renderWorkerSummary(stats, orders) {
        const totalOrders = stats.reduce((s, w) => s + w.orders, 0);
        const totalRevenue = stats.reduce((s, w) => s + w.revenue, 0);
        const totalCompleted = stats.reduce((s, w) => s + w.completed, 0);
        const top = [...stats].sort((a, b) => b.orders - a.orders)[0];

        return `
            <div class="kpi-grid">
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-user-tie"></i> Punëtorë aktivë</div>
                    <div class="kpi-value blue">${stats.length}</div>
                    <div class="kpi-sub">${stats.filter(w => w.orders > 0).length} me porosi</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Total €</div>
                    <div class="kpi-value green">€${totalRevenue.toFixed(2)}</div>
                    <div class="kpi-sub">${totalCompleted} të kryera</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-list"></i> Porosi</div>
                    <div class="kpi-value yellow">${totalOrders}</div>
                    <div class="kpi-sub">Mesatarja ${stats.length ? (totalOrders / stats.length).toFixed(1) : 0}/punëtor</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-trophy"></i> Top punëtori</div>
                    <div class="kpi-value pink" style="font-size:16px;">${top?.name || '—'}</div>
                    <div class="kpi-sub">${top ? `${top.orders} porosi · €${top.revenue}` : ''}</div>
                </div>
            </div>
        `;
    }

    function renderWorkersTable(stats) {
        return `
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Punëtori</th>
                            <th>Porosi</th>
                            <th>Të kryera</th>
                            <th>Anuluar</th>
                            <th>Suksesi</th>
                            <th>Orë pune</th>
                            <th>Mesatare</th>
                            <th>Total €</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.map((w, i) => `
                            <tr>
                                <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                                <td><strong>${w.name}</strong></td>
                                <td class="mono">${w.orders}</td>
                                <td class="mono green">${w.completed}</td>
                                <td class="mono" style="color:#ef4444;">${w.cancelled}</td>
                                <td>
                                    <span class="status-badge ${w.success >= 80 ? 'completed' : w.success >= 50 ? 'pending' : 'cancelled'}">
                                        ${w.success}%
                                    </span>
                                </td>
                                <td class="mono">${w.hoursWorked}h</td>
                                <td class="mono">€${w.avg}</td>
                                <td class="mono green" style="font-weight:800;">€${w.revenue}</td>
                                <td>
                                    <button class="btn-icon" onclick="AdminReports.openWorkerDetail('${w.id}')">
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

    // ═══ DETAIL PUNËTORI ═══
    function openWorkerDetail(workerId) {
        const w = calculateWorkerStats(cachedOrders).find(x => x.id === workerId);
        if (!w) return;

        const workerOrders = cachedOrders.filter(o => (o.operatorId || 'unknown') === workerId);
        const hourly = w.byHour.map((c, h) => ({ h, c })).filter(x => x.c > 0);

        const modalHtml = `
            <div class="modal-overlay" onclick="AdminReports.closeWorkerDetail(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:720px;max-height:85vh;overflow-y:auto;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h3><i class="fa-solid fa-user-tie"></i> ${w.name}</h3>
                        <button class="btn-icon" onclick="AdminReports.closeWorkerDetail()"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:20px;">
                        <div style="background:#1e293b;padding:12px;border-radius:8px;border-left:3px solid #3b82f6;">
                            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Porosi</div>
                            <div style="font-size:20px;font-weight:800;">${w.orders}</div>
                        </div>
                        <div style="background:#1e293b;padding:12px;border-radius:8px;border-left:3px solid #10b981;">
                            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Të kryera</div>
                            <div style="font-size:20px;font-weight:800;color:#10b981;">${w.completed}</div>
                        </div>
                        <div style="background:#1e293b;padding:12px;border-radius:8px;border-left:3px solid #ef4444;">
                            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Anuluar</div>
                            <div style="font-size:20px;font-weight:800;color:#ef4444;">${w.cancelled}</div>
                        </div>
                        <div style="background:#1e293b;padding:12px;border-radius:8px;border-left:3px solid #f59e0b;">
                            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Suksesi</div>
                            <div style="font-size:20px;font-weight:800;color:#f59e0b;">${w.success}%</div>
                        </div>
                        <div style="background:#1e293b;padding:12px;border-radius:8px;border-left:3px solid #a855f7;">
                            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Total €</div>
                            <div style="font-size:20px;font-weight:800;color:#a855f7;">€${w.revenue}</div>
                        </div>
                    </div>

                    <h4 style="margin-bottom:10px;font-size:13px;color:#94a3b8;text-transform:uppercase;">
                        <i class="fa-solid fa-clock"></i> Aktiviteti sipas orës
                    </h4>
                    <div style="display:flex;gap:4px;align-items:flex-end;height:80px;margin-bottom:20px;">
                        ${w.byHour.map((c, h) => {
                            const max = Math.max(...w.byHour, 1);
                            const pct = (c / max) * 100;
                            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;" title="${h}:00 → ${c}">
                                <div style="width:100%;background:${c > 0 ? 'linear-gradient(180deg,#a855f7,#7c3aed)' : '#1e293b'};height:${Math.max(pct, 4)}%;border-radius:3px;"></div>
                                <span style="font-size:8px;color:#64748b;">${h}</span>
                            </div>`;
                        }).join('')}
                    </div>

                    <h4 style="margin-bottom:10px;font-size:13px;color:#94a3b8;text-transform:uppercase;">
                        <i class="fa-solid fa-list"></i> Porositë (${workerOrders.length})
                    </h4>
                    <div class="admin-table-wrap" style="max-height:300px;overflow-y:auto;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Ora</th>
                                    <th>Statusi</th>
                                    <th>Telefon</th>
                                    <th>Çmimi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${workerOrders.slice(0, 100).map(o => `
                                    <tr>
                                        <td class="mono" style="font-size:10px;">${o.createdDateStr || '—'}</td>
                                        <td class="mono" style="font-size:10px;">${o.createdTimeStr || o.time || '—'}</td>
                                        <td><span class="status-badge ${o.status || ''}">${o.status || '—'}</span></td>
                                        <td class="phone">${o.phone || '—'}</td>
                                        <td class="green mono">${o.price ? '€' + parseFloat(o.price).toFixed(2) : '—'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        let root = document.getElementById('worker-detail-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'worker-detail-root';
            document.body.appendChild(root);
        }
        root.innerHTML = modalHtml;
    }

    function closeWorkerDetail(e) {
        if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
        const root = document.getElementById('worker-detail-root');
        if (root) root.innerHTML = '';
    }

    // ═══ FILTERS ═══
    function applyWorkerFilters() {
        workerFilters.from = document.getElementById('rep-from')?.value || '';
        workerFilters.to = document.getElementById('rep-to')?.value || '';
        workerFilters.workerId = document.getElementById('rep-worker')?.value || 'all';
        workerFilters.sort = document.getElementById('rep-sort')?.value || 'orders';
        renderAll();
    }

    function resetWorkerFilters() {
        workerFilters = { from: '', to: '', workerId: 'all', sort: 'orders' };
        renderAll();
    }

    function quickRange(type) {
        const today = new Date();
        let from = new Date(today);
        let to = new Date(today);

        if (type === 'week') {
            from.setDate(from.getDate() - 6);
        } else if (type === 'month') {
            from.setDate(1);
        }

        workerFilters.from = from.toISOString().slice(0, 10);
        workerFilters.to = to.toISOString().slice(0, 10);
        renderAll();
    }

    // ═══ LAYOUT (raportet normale) ═══
    function renderLayout(stats, range) {
        const el = document.getElementById('reports-content');
        const labels = { daily: 'Ditor', weekly: 'Javor', monthly: 'Mujor', yearly: 'Vjetor' };
        const dateFrom = new Date(range.from).toLocaleDateString('sq-AL');
        const dateTo = new Date(range.to).toLocaleDateString('sq-AL');

        el.innerHTML = `
            <div class="page-actions" style="margin-bottom:20px;flex-wrap:wrap;">
                <div class="filter-bar" style="flex-wrap:wrap;">
                    <button class="filter-btn ${currentReport === 'daily' ? 'active' : ''}" onclick="AdminReports.changeReport('daily', this)">Ditor</button>
                    <button class="filter-btn ${currentReport === 'weekly' ? 'active' : ''}" onclick="AdminReports.changeReport('weekly', this)">Javor</button>
                    <button class="filter-btn ${currentReport === 'monthly' ? 'active' : ''}" onclick="AdminReports.changeReport('monthly', this)">Mujor</button>
                    <button class="filter-btn ${currentReport === 'yearly' ? 'active' : ''}" onclick="AdminReports.changeReport('yearly', this)">Vjetor</button>
                    <button class="filter-btn" onclick="AdminReports.changeReport('workers', this)">
                        <i class="fa-solid fa-user-tie"></i> Punëtorët
                    </button>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="filter-btn" style="padding:9px 14px;" onclick="AdminReports.exportCsv()">
                        <i class="fa-solid fa-download"></i> CSV
                    </button>
                    <button class="filter-btn" style="padding:9px 14px;" onclick="window.print()">
                        <i class="fa-solid fa-print"></i> Printo
                    </button>
                </div>
            </div>

            <div style="padding:12px 16px;background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.25);border-radius:10px;margin-bottom:20px;font-size:12px;color:var(--text-secondary);">
                <i class="fa-solid fa-calendar"></i> Raporti <strong style="color:var(--accent-purple);">${labels[currentReport]}</strong>
                · Nga <strong>${dateFrom}</strong> deri <strong>${dateTo}</strong>
            </div>

            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Të ardhura</div>
                    <div class="kpi-value green">€${stats.revenue.toFixed(2)}</div>
                    <div class="kpi-sub">Mesatarja €${stats.avgPrice.toFixed(2)}/porosi</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-clipboard-list"></i> Porosi totale</div>
                    <div class="kpi-value blue">${stats.total}</div>
                    <div class="kpi-sub">${stats.completed} të kryera</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-xmark"></i> Anuluar</div>
                    <div class="kpi-value pink">${stats.cancelled}</div>
                    <div class="kpi-sub">${stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(1) : 0}%</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-percent"></i> Suksesi</div>
                    <div class="kpi-value yellow">${stats.successRate}%</div>
                    <div class="kpi-sub">Normë suksesi</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-chart-line"></i><h3>Porositë gjatë kohës</h3></div>
                    <div class="db-panel-body"><canvas id="chart-daily" height="180"></canvas></div>
                </div>
                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-clock"></i><h3>Porositë sipas orës</h3></div>
                    <div class="db-panel-body"><canvas id="chart-hourly" height="180"></canvas></div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-trophy"></i><h3>Top Operatorët</h3></div>
                    <div class="db-panel-body" id="top-operators-report"><div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div></div>
                </div>
                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-car"></i><h3>Top Shoferët</h3></div>
                    <div class="db-panel-body" id="top-drivers-report"><div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div></div>
                </div>
            </div>
        `;
    }

    function renderCharts(dailyData, hourlyData) {
        Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
        charts = {};

        const ctx1 = document.getElementById('chart-daily');
        if (ctx1 && window.Chart) {
            charts.daily = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: dailyData.labels,
                    datasets: [{
                        label: 'Porosi', data: dailyData.counts,
                        borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.15)',
                        borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#a855f7'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#8b7aa8', font: { size: 9 } }, grid: { color: 'rgba(45, 26, 74, 0.5)' } },
                        y: { ticks: { color: '#8b7aa8', font: { size: 9 } }, grid: { color: 'rgba(45, 26, 74, 0.5)' }, beginAtZero: true }
                    }
                }
            });
        }

        const ctx2 = document.getElementById('chart-hourly');
        if (ctx2 && window.Chart) {
            charts.hourly = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: hourlyData.labels,
                    datasets: [{
                        label: 'Porosi', data: hourlyData.counts,
                        backgroundColor: 'rgba(236, 72, 153, 0.6)', borderColor: '#ec4899', borderWidth: 1, borderRadius: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#8b7aa8', font: { size: 8 } }, grid: { display: false } },
                        y: { ticks: { color: '#8b7aa8', font: { size: 9 } }, grid: { color: 'rgba(45, 26, 74, 0.5)' }, beginAtZero: true }
                    }
                }
            });
        }
    }

    function renderTables(operators, drivers) {
        const elOp = document.getElementById('top-operators-report');
        if (elOp) {
            if (!operators.length) {
                elOp.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka të dhëna</p></div>';
            } else {
                elOp.innerHTML = operators.map((op, i) => `
                    <div class="top-list-item rank-${i < 3 ? i + 1 : ''}">
                        <div class="tli-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
                        <div class="tli-info">
                            <div class="tli-name">${op.name}</div>
                            <div class="tli-meta"><span><i class="fa-solid fa-list"></i> ${op.orders} porosi</span></div>
                        </div>
                        <div class="tli-value">€${op.revenue.toFixed(2)}</div>
                    </div>
                `).join('');
            }
        }

        const elDr = document.getElementById('top-drivers-report');
        if (elDr) {
            if (!drivers.length) {
                elDr.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka të dhëna</p></div>';
            } else {
                elDr.innerHTML = drivers.map((d, i) => `
                    <div class="top-list-item rank-${i < 3 ? i + 1 : ''}">
                        <div class="tli-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
                        <div class="tli-info">
                            <div class="tli-name">${d.name} ${d.vehicleNum ? `<span style="color:var(--accent-purple);font-family:var(--font-mono);font-size:11px;">🚗 ${d.vehicleNum}</span>` : ''}</div>
                            <div class="tli-meta"><span><i class="fa-solid fa-route"></i> ${d.orders} udhëtime</span></div>
                        </div>
                        <div class="tli-value">€${d.revenue.toFixed(2)}</div>
                    </div>
                `).join('');
            }
        }
    }

    // ═══ EXPORT ═══
    function exportCsv() {
        if (!cachedOrders.length) return showToast('warning', 'Nuk ka të dhëna', '');
        const rows = cachedOrders.map(o => ({
            'Data': o.createdDateStr || '', 'Ora': o.createdTimeStr || '',
            'Statusi': o.status || '', 'Vetura': o.vehicleNum || '',
            'Telefon': o.phone || '', 'Marrja': o.pickup || '',
            'Destinacioni': o.destination || '', 'Shoferi': o.driverName || '',
            'Operatori': o.operatorName || '', 'Çmimi': o.price || 0
        }));
        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `raport-${currentReport}-${Date.now()}.csv`);
            showToast('success', '📥 U shkarkua', '');
        }
    }

    function exportWorkersCsv() {
        const stats = sortWorkerStats(calculateWorkerStats(cachedOrders), workerFilters.sort);
        if (!stats.length) return showToast('warning', 'Nuk ka të dhëna', '');

        const rows = stats.map(w => ({
            'Punëtori': w.name,
            'Porosi': w.orders,
            'Të kryera': w.completed,
            'Anuluar': w.cancelled,
            'Suksesi %': w.success,
            'Orë pune': w.hoursWorked,
            'Mesatare €': w.avg,
            'Total €': w.revenue
        }));

        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `punetoret-${workerFilters.from}_${workerFilters.to}.csv`);
            showToast('success', '📥 U shkarkua', '');
        }
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return {
        init, load, changeReport,
        applyWorkerFilters, resetWorkerFilters, quickRange,
        openWorkerDetail, closeWorkerDetail,
        exportCsv, exportWorkersCsv
    };
})();

console.log('✅ admin/reports.js ngarkuar');
