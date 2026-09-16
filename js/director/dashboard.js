'use strict';

/**
 * js/director/dashboard.js — Dashboard Ekzekutiv
 */

window.DirectorDashboard = (() => {
    let trendChart = null;
    let refreshInterval = null;

    // ═══ INIT ═══
    function init() {
        console.log('📊 DirectorDashboard: Init...');
        startAutoRefresh();
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('📊 Duke ngarkuar dashboard ekzekutiv...');
        await loadKPIs();
        await loadCommission();
        await loadStaff();
        await loadTrend();
    }

    // ═══ KPI ═══
    async function loadKPIs() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            // Të gjitha porositë e përfunduara
            const snap = await db.collection('orders')
                .where('status', '==', 'completed')
                .get();

            let totalRevenue = 0;
            let todayRevenue = 0;
            let monthRevenue = 0;
            let yearRevenue = 0;
            let todayCount = 0;
            let monthCount = 0;
            let yearCount = 0;

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

            snap.forEach(doc => {
                const o = doc.data();
                const price = parseFloat(o.price) || 0;
                const ts = o.createdAtLocal || o.completedAt || 0;

                totalRevenue += price;

                if (ts >= todayStart) { todayRevenue += price; todayCount++; }
                if (ts >= monthStart) { monthRevenue += price; monthCount++; }
                if (ts >= yearStart) { yearRevenue += price; yearCount++; }
            });

            document.getElementById('kpi-total-revenue').textContent = `€${totalRevenue.toFixed(2)}`;
            document.getElementById('kpi-total-revenue-sub').textContent = `${snap.size} porosi totale`;

            document.getElementById('kpi-today-revenue').textContent = `€${todayRevenue.toFixed(2)}`;
            document.getElementById('kpi-today-revenue-sub').textContent = `${todayCount} porosi sot`;

            document.getElementById('kpi-month-revenue').textContent = `€${monthRevenue.toFixed(2)}`;
            document.getElementById('kpi-month-revenue-sub').textContent = `${monthCount} porosi këtë muaj`;

            document.getElementById('kpi-year-revenue').textContent = `€${yearRevenue.toFixed(2)}`;
            document.getElementById('kpi-year-revenue-sub').textContent = `${yearCount} porosi këtë vit`;

        } catch (e) {
            console.error('❌ loadKPIs:', e);
        }
    }

    // ═══ KOMISIONI ═══
    async function loadCommission() {
        const db = window.TaxiFirebase?.db;
        const el = document.getElementById('commission-panel');
        if (!db || !el) return;

        try {
            const settingsDoc = await db.collection('settings').doc('commission').get();
            const commission = settingsDoc.exists ? (settingsDoc.data().percentage || 10) : 10;

            const snap = await db.collection('orders').where('status', '==', 'completed').get();
            let total = 0;
            snap.forEach(doc => total += parseFloat(doc.data().price) || 0);

            const companyShare = total * (commission / 100);
            const driversShare = total - companyShare;

            el.innerHTML = `
                <div style="padding:16px;background:rgba(34,197,94,.1);border-radius:12px;margin-bottom:12px;">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Komisioni i kompanisë (${commission}%)</div>
                    <div style="font-size:26px;font-weight:800;font-family:var(--font-mono);color:var(--accent-green);margin-top:4px;">€${companyShare.toFixed(2)}</div>
                </div>
                <div style="padding:16px;background:rgba(59,130,246,.1);border-radius:12px;margin-bottom:12px;">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Për shoferët (${100 - commission}%)</div>
                    <div style="font-size:26px;font-weight:800;font-family:var(--font-mono);color:#60a5fa;margin-top:4px;">€${driversShare.toFixed(2)}</div>
                </div>
                <div style="padding:12px;background:var(--bg-tertiary);border-radius:10px;font-size:12px;color:var(--text-secondary);">
                    <i class="fa-solid fa-info-circle" style="color:var(--accent-purple);"></i>
                    Total i qarkullimit: <strong style="color:var(--text-primary);">€${total.toFixed(2)}</strong>
                </div>
            `;

        } catch (e) {
            console.error('❌ loadCommission:', e);
        }
    }

    // ═══ STAFI ═══
    async function loadStaff() {
        const db = window.TaxiFirebase?.db;
        const el = document.getElementById('staff-panel');
        if (!db || !el) return;

        try {
            // Operatorët
            const opSnap = await db.collection('operators').get();
            const operators = opSnap.docs.map(d => d.data());
            const activeOps = operators.filter(o => o.active !== false).length;

            // Shoferët
            const drSnap = await db.collection('drivers').get();
            const drivers = drSnap.docs.map(d => d.data());
            const activeDrivers = drivers.filter(d => d.mode !== 'inactive').length;
            const freeDrivers = drivers.filter(d => d.mode === 'free').length;

            // Menagjerët & Drejtorët
            const managers = operators.filter(o => o.role === 'manager').length;
            const directors = operators.filter(o => o.role === 'director' || o.role === 'admin').length;
            const dispatchers = operators.filter(o => o.role === 'dispatcher' || !o.role).length;

            el.innerHTML = `
                <div class="top-list-item">
                    <div class="tli-rank" style="background:rgba(168,85,247,.15);color:var(--accent-purple);">
                        <i class="fa-solid fa-headset"></i>
                    </div>
                    <div class="tli-info">
                        <div class="tli-name">Dispeçerë</div>
                        <div class="tli-meta"><span>${activeOps} aktivë nga ${operators.length}</span></div>
                    </div>
                    <div class="tli-value" style="color:var(--accent-purple);">${dispatchers}</div>
                </div>
                <div class="top-list-item">
                    <div class="tli-rank" style="background:rgba(59,130,246,.15);color:#60a5fa;">
                        <i class="fa-solid fa-user-tie"></i>
                    </div>
                    <div class="tli-info">
                        <div class="tli-name">Menagjerë</div>
                        <div class="tli-meta"><span>Qasje në Admin Panel</span></div>
                    </div>
                    <div class="tli-value" style="color:#60a5fa;">${managers}</div>
                </div>
                <div class="top-list-item">
                    <div class="tli-rank" style="background:rgba(250,204,21,.15);color:#facc15;">
                        <i class="fa-solid fa-crown"></i>
                    </div>
                    <div class="tli-info">
                        <div class="tli-name">Drejtorë / Admin</div>
                        <div class="tli-meta"><span>Qasje totale</span></div>
                    </div>
                    <div class="tli-value" style="color:#facc15;">${directors}</div>
                </div>
                <div class="top-list-item" style="border-top:1px solid var(--border-color);margin-top:8px;padding-top:12px;">
                    <div class="tli-rank" style="background:rgba(34,197,94,.15);color:var(--accent-green);">
                        <i class="fa-solid fa-car"></i>
                    </div>
                    <div class="tli-info">
                        <div class="tli-name">Shoferë</div>
                        <div class="tli-meta"><span>${activeDrivers} aktivë · ${freeDrivers} të lirë</span></div>
                    </div>
                    <div class="tli-value" style="color:var(--accent-green);">${drivers.length}</div>
                </div>
            `;

        } catch (e) {
            console.error('❌ loadStaff:', e);
        }
    }

    // ═══ TREND 30 DITOR ═══
    async function loadTrend() {
        const db = window.TaxiFirebase?.db;
        const canvas = document.getElementById('chart-trend');
        if (!db || !canvas) return;

        try {
            const now = new Date();
            const start = new Date(now);
            start.setDate(start.getDate() - 30);
            start.setHours(0, 0, 0, 0);

            const snap = await db.collection('orders')
                .where('createdAtLocal', '>=', start.getTime())
                .where('status', '==', 'completed')
                .get();

            // Grupim sipas datës
            const days = {};
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' });
                days[key] = { count: 0, revenue: 0 };
            }

            snap.forEach(doc => {
                const o = doc.data();
                const ts = o.createdAtLocal;
                if (!ts) return;
                const d = new Date(ts);
                const key = d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' });
                if (days[key]) {
                    days[key].count++;
                    days[key].revenue += parseFloat(o.price) || 0;
                }
            });

            const labels = Object.keys(days);
            const revenues = Object.values(days).map(d => +d.revenue.toFixed(2));
            const counts = Object.values(days).map(d => d.count);

            // Fshij chart-in e vjetër
            if (trendChart) { try { trendChart.destroy(); } catch(e){} }

            trendChart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Të ardhura (€)',
                            data: revenues,
                            borderColor: '#22c55e',
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 2,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Porosi',
                            data: counts,
                            borderColor: '#a855f7',
                            backgroundColor: 'rgba(168, 85, 247, 0.15)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            pointRadius: 2,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#b8a8d9', font: { size: 11 } } }
                    },
                    scales: {
                        x: { ticks: { color: '#8b7aa8', font: { size: 9 } }, grid: { color: 'rgba(45,26,74,.5)' } },
                        y: {
                            position: 'left',
                            ticks: { color: '#22c55e', font: { size: 9 } },
                            grid: { color: 'rgba(45,26,74,.5)' },
                            beginAtZero: true
                        },
                        y1: {
                            position: 'right',
                            ticks: { color: '#a855f7', font: { size: 9 } },
                            grid: { display: false },
                            beginAtZero: true
                        }
                    }
                }
            });

        } catch (e) {
            console.error('❌ loadTrend:', e);
        }
    }

    // ═══ AUTO-REFRESH ═══
    function startAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            if (window.DirectorApp?.currentPage === 'dashboard') {
                loadKPIs();
            }
        }, 60000); // Çdo 60 sek
    }

    function stop() {
        if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
        if (trendChart) { try { trendChart.destroy(); } catch(e){} trendChart = null; }
    }

    return { init, load, stop };
})();

console.log('✅ director/dashboard.js ngarkuar');
