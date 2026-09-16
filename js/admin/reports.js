'use strict';

/**
 * js/admin/reports.js — Raporte të plota (ditor/javor/mujor/vjetor)
 */

window.AdminReports = (() => {
    let currentReport = 'daily';
    let charts = {};
    let cachedOrders = [];

    // ═══ INIT ═══
    function init() {
        console.log('📊 AdminReports: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('📊 Duke ngarkuar raportet...', currentReport);
        await renderAll();
    }

    // ═══ CHANGE REPORT ═══
    function changeReport(type, btn) {
        currentReport = type;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
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

            const range = getDateRange(currentReport);

            const snap = await db.collection('orders')
                .where('createdAtLocal', '>=', range.from)
                .where('createdAtLocal', '<=', range.to)
                .get();

            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            cachedOrders = orders;

            const stats = calculateStats(orders);
            const dailyData = calculateDaily(orders, range);
            const hourlyData = calculateHourly(orders);
            const zoneData = calculateZones(orders);
            const tariffData = calculateTariffs(orders);
            const topOperators = calculateTopOperators(orders);
            const topDrivers = calculateTopDrivers(orders);

            renderLayout(stats, range);
            renderCharts(dailyData, hourlyData, zoneData, tariffData);
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

    // ═══ DAILY DATA (per grafik) ═══
    function calculateDaily(orders, range) {
        const days = {};
        const daysCount = Math.ceil((range.to - range.from) / 86400000);

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

    // ═══ HOURLY DATA ═══
    function calculateHourly(orders) {
        const hours = Array(24).fill(0);
        orders.forEach(o => {
            if (!o.createdAtLocal) return;
            const h = new Date(o.createdAtLocal).getHours();
            hours[h]++;
        });
        return {
            labels: hours.map((_, i) => `${String(i).padStart(2, '0')}:00`),
            counts: hours
        };
    }

    // ═══ ZONES ═══
    function calculateZones(orders) {
        const zones = {};
        orders.forEach(o => {
            const z = o.zone || 'auto';
            if (!zones[z]) zones[z] = { count: 0, revenue: 0 };
            zones[z].count++;
            zones[z].revenue += parseFloat(o.price) || 0;
        });
        return zones;
    }

    // ═══ TARIFFS ═══
    function calculateTariffs(orders) {
        const tariffs = {};
        orders.forEach(o => {
            const t = o.tariff || 'standard';
            if (!tariffs[t]) tariffs[t] = { count: 0, revenue: 0 };
            tariffs[t].count++;
            tariffs[t].revenue += parseFloat(o.price) || 0;
        });
        return tariffs;
    }

    // ═══ TOP OPERATORS ═══
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

    // ═══ TOP DRIVERS ═══
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

    // ═══ LAYOUT ═══
    function renderLayout(stats, range) {
        const el = document.getElementById('reports-content');
        const labels = { daily: 'Ditor', weekly: 'Javor', monthly: 'Mujor', yearly: 'Vjetor' };
        const dateFrom = new Date(range.from).toLocaleDateString('sq-AL');
        const dateTo = new Date(range.to).toLocaleDateString('sq-AL');

        el.innerHTML = `
            <div class="page-actions" style="margin-bottom:20px;">
                <div class="filter-bar">
                    <button class="filter-btn ${currentReport === 'daily' ? 'active' : ''}" onclick="AdminReports.changeReport('daily', this)">Ditor</button>
                    <button class="filter-btn ${currentReport === 'weekly' ? 'active' : ''}" onclick="AdminReports.changeReport('weekly', this)">Javor</button>
                    <button class="filter-btn ${currentReport === 'monthly' ? 'active' : ''}" onclick="AdminReports.changeReport('monthly', this)">Mujor</button>
                    <button class="filter-btn ${currentReport === 'yearly' ? 'active' : ''}" onclick="AdminReports.changeReport('yearly', this)">Vjetor</button>
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
                    <div class="db-panel-header">
                        <i class="fa-solid fa-chart-line"></i>
                        <h3>Porositë gjatë kohës</h3>
                    </div>
                    <div class="db-panel-body">
                        <canvas id="chart-daily" height="180"></canvas>
                    </div>
                </div>
                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-clock"></i>
                        <h3>Porositë sipas orës</h3>
                    </div>
                    <div class="db-panel-body">
                        <canvas id="chart-hourly" height="180"></canvas>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-trophy"></i>
                        <h3>Top Operatorët</h3>
                    </div>
                    <div class="db-panel-body" id="top-operators-report">
                        <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                </div>
                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-car"></i>
                        <h3>Top Shoferët</h3>
                    </div>
                    <div class="db-panel-body" id="top-drivers-report">
                        <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                </div>
            </div>
        `;
    }

    // ═══ CHARTS ═══
    function renderCharts(dailyData, hourlyData) {
        // Fshij grafikët e vjetër
        Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
        charts = {};

        const ctx1 = document.getElementById('chart-daily');
        if (ctx1) {
            charts.daily = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: dailyData.labels,
                    datasets: [{
                        label: 'Porosi',
                        data: dailyData.counts,
                        borderColor: '#a855f7',
                        backgroundColor: 'rgba(168, 85, 247, 0.15)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#a855f7'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#8b7aa8', font: { size: 9 } }, grid: { color: 'rgba(45, 26, 74, 0.5)' } },
                        y: { ticks: { color: '#8b7aa8', font: { size: 9 } }, grid: { color: 'rgba(45, 26, 74, 0.5)' }, beginAtZero: true }
                    }
                }
            });
        }

        const ctx2 = document.getElementById('chart-hourly');
        if (ctx2) {
            charts.hourly = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: hourlyData.labels,
                    datasets: [{
                        label: 'Porosi',
                        data: hourlyData.counts,
                        backgroundColor: 'rgba(236, 72, 153, 0.6)',
                        borderColor: '#ec4899',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#8b7aa8', font: { size: 8 } }, grid: { display: false } },
                        y: { ticks: { color: '#8b7aa8', font: { size: 9 } }, grid: { color: 'rgba(45, 26, 74, 0.5)' }, beginAtZero: true }
                    }
                }
            });
        }
    }

    // ═══ TABLES ═══
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

    // ═══ EXPORT CSV ═══
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
            'Marrja': o.pickup || '',
            'Destinacioni': o.destination || '',
            'Shoferi': o.driverName || '',
            'Operatori': o.operatorName || '',
            'Çmimi': o.price || 0
        }));
        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `raport-${currentReport}-${Date.now()}.csv`);
            showToast('success', '📥 U shkarkua', '');
        }
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return { init, load, changeReport, exportCsv };
})();

console.log('✅ admin/reports.js ngarkuar');
