'use strict';

/**
 * js/admin/dashboard.js — Dashboard i plotë me statistikat e modulet e reja
 */

window.AdminDashboard = (() => {
    let refreshTimer = null;

    function init() {
        console.log('📊 AdminDashboard: Init...');
    }

    async function load() {
        await renderDashboard();
        startAutoRefresh();
    }

    function startAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => {
            if (document.querySelector('.admin-page[data-page="dashboard"]')?.offsetParent) {
                loadQuickStats();
            }
        }, 60000); // çdo minutë
    }

    // ═══ RENDER DASHBOARD ═══
    async function renderDashboard() {
        const el = document.querySelector('.admin-page[data-page="dashboard"]');
        if (!el) return;

        el.innerHTML = `
            <!-- KPI KRYESORE -->
            <div class="kpi-grid" id="dash-kpi-main">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Të ardhura sot</div>
                    <div class="kpi-value green" id="dash-revenue">€0.00</div>
                    <div class="kpi-sub" id="dash-revenue-sub">0 porosi</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-route"></i> Udhëtime sot</div>
                    <div class="kpi-value blue" id="dash-trips">0</div>
                    <div class="kpi-sub" id="dash-trips-sub">0 të realizuara</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-headset"></i> Operatorë aktivë</div>
                    <div class="kpi-value pink" id="dash-operators">0</div>
                    <div class="kpi-sub">Tani në punë</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-car"></i> Shoferë aktivë</div>
                    <div class="kpi-value yellow" id="dash-drivers">0</div>
                    <div class="kpi-sub" id="dash-drivers-sub">0 online</div>
                </div>
            </div>

            <!-- KPI TË REJA (nga modulet) -->
            <div class="kpi-grid" id="dash-kpi-modules" style="margin-top:16px;">
                <div class="kpi-card" style="border-left:4px solid #a855f7;">
                    <div class="kpi-label"><i class="fa-solid fa-bullseye" style="color:#a855f7;"></i> Targete aktive</div>
                    <div class="kpi-value" id="dash-targets">—</div>
                    <div class="kpi-sub" id="dash-targets-sub">Duke ngarkuar...</div>
                </div>
                <div class="kpi-card" style="border-left:4px solid #10b981;">
                    <div class="kpi-label"><i class="fa-solid fa-id-card" style="color:#10b981;"></i> Loyalty Cards</div>
                    <div class="kpi-value" id="dash-loyalty">—</div>
                    <div class="kpi-sub" id="dash-loyalty-sub">Duke ngarkuar...</div>
                </div>
                <div class="kpi-card" style="border-left:4px solid #f59e0b;">
                    <div class="kpi-label"><i class="fa-solid fa-gas-pump" style="color:#f59e0b;"></i> Fuel sot</div>
                    <div class="kpi-value" id="dash-fuel">—</div>
                    <div class="kpi-sub" id="dash-fuel-sub">Duke ngarkuar...</div>
                </div>
                <div class="kpi-card" style="border-left:4px solid #06b6d4;">
                    <div class="kpi-label"><i class="fa-solid fa-money-bill-wave" style="color:#06b6d4;"></i> Pagat (muaj)</div>
                    <div class="kpi-value" id="dash-salaries">—</div>
                    <div class="kpi-sub" id="dash-salaries-sub">Duke ngarkuar...</div>
                </div>
                <div class="kpi-card" style="border-left:4px solid #8b5cf6;">
                    <div class="kpi-label"><i class="fa-solid fa-mobile-screen" style="color:#8b5cf6;"></i> Mobile Users</div>
                    <div class="kpi-value" id="dash-mobile">—</div>
                    <div class="kpi-sub" id="dash-mobile-sub">Duke ngarkuar...</div>
                </div>
                <div class="kpi-card" style="border-left:4px solid #ef4444;">
                    <div class="kpi-label"><i class="fa-solid fa-satellite-dish" style="color:#ef4444;"></i> Trackers online</div>
                    <div class="kpi-value" id="dash-trackers">—</div>
                    <div class="kpi-sub" id="dash-trackers-sub">Duke ngarkuar...</div>
                </div>
            </div>

            <!-- GRAFIKË -->
            <div class="dashboard-grid" style="margin-top:20px;">
                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-chart-line"></i>
                        <h3>Porositë sot sipas orës</h3>
                    </div>
                    <div class="db-panel-body" style="padding:20px;">
                        <canvas id="dash-chart-hourly" height="160"></canvas>
                    </div>
                </div>
                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-chart-pie"></i>
                        <h3>Statusi i porosive</h3>
                    </div>
                    <div class="db-panel-body" style="padding:20px;">
                        <canvas id="dash-chart-status" height="160"></canvas>
                    </div>
                </div>
            </div>

            <!-- TOP LISTAT -->
            <div class="dashboard-grid" style="margin-top:20px;">
                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-trophy"></i>
                        <h3>Top Operatorët (Sot)</h3>
                    </div>
                    <div class="db-panel-body" id="dash-top-operators">
                        <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                </div>
                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-car-side"></i>
                        <h3>Top Shoferët (Sot)</h3>
                    </div>
                    <div class="db-panel-body" id="dash-top-drivers">
                        <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                </div>
            </div>

            <!-- AKTIVITETI I FUNDIT -->
            <div class="db-panel full" style="margin-top:20px;">
                <div class="db-panel-header">
                    <i class="fa-solid fa-clock"></i>
                    <h3>Aktiviteti i fundit</h3>
                </div>
                <div class="db-panel-body" id="dash-recent-activity">
                    <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                </div>
            </div>

            <!-- ALERTA -->
            <div class="db-panel" style="margin-top:20px;border-color:#f59e0b;">
                <div class="db-panel-header" style="background:linear-gradient(90deg,rgba(245,158,11,.08),transparent);">
                    <i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;"></i>
                    <h3>Alerta & Kujtime</h3>
                </div>
                <div class="db-panel-body" id="dash-alerts">
                    <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                </div>
            </div>
        `;

        // Ngarko të dhënat
        await Promise.all([
            loadMainStats(),
            loadQuickStats(),
            loadRecentActivity(),
            loadAlerts()
        ]);
    }

    // ═══ MAIN STATS (porositë + shoferët) ═══
    async function loadMainStats() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTs = today.getTime();

            // Porositë e sotme
            let orders = [];
            try {
                const snap = await db.collection('orders')
                    .where('createdAtLocal', '>=', todayTs)
                    .get();
                orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {
                const snap = await db.collection('orders').limit(500).get();
                orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter(o => (o.createdAtLocal || 0) >= todayTs);
            }

            const completed = orders.filter(o => o.status === 'completed');
            const revenue = completed.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

            setText('dash-revenue', `€${revenue.toFixed(2)}`);
            setText('dash-revenue-sub', `${completed.length} porosi të kryera`);
            setText('dash-trips', orders.length);
            setText('dash-trips-sub', `${completed.length} të realizuara`);

            // Shoferët aktivë
            try {
                const drSnap = await db.collection('drivers').get();
                const drivers = drSnap.docs.map(d => d.data());
                const online = drivers.filter(d => d.mode && d.mode !== 'inactive').length;
                setText('dash-drivers', online);
                setText('dash-drivers-sub', `${online} online / ${drivers.length} total`);
            } catch {}

            // Operatorët aktivë
            try {
                const opSnap = await db.collection('operators').get();
                const ops = opSnap.docs.map(d => d.data());
                const active = ops.filter(o => o.online || o.status === 'online').length;
                setText('dash-operators', active || ops.length);
            } catch {}

            // GRAFIKËT
            renderHourlyChart(orders);
            renderStatusChart(orders);
            renderTopOperators(orders);
            renderTopDrivers(orders);

        } catch (e) {
            console.error('❌ loadMainStats:', e);
        }
    }

    // ═══ QUICK STATS (modulet e reja) ═══
    async function loadQuickStats() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        // TARGETS
        try {
            const snap = await db.collection('targets').limit(100).get();
            const targets = snap.docs.map(d => d.data());
            setText('dash-targets', targets.length);
            setText('dash-targets-sub', `${targets.length} targete aktive`);
        } catch {
            setText('dash-targets', '0');
            setText('dash-targets-sub', 'Pa targete');
        }

        // LOYALTY
        try {
            const snap = await db.collection('loyalty_cards').limit(500).get();
            const cards = snap.docs.map(d => d.data());
            const totalPoints = cards.reduce((s, c) => s + (c.points || 0), 0);
            setText('dash-loyalty', cards.length);
            setText('dash-loyalty-sub', `${totalPoints.toLocaleString()} pikë totale`);
        } catch {
            setText('dash-loyalty', '0');
            setText('dash-loyalty-sub', 'Pa karta');
        }

        // FUEL
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTs = today.getTime();

            const snap = await db.collection('fuel_refills').limit(100).get();
            const refills = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(r => (r.createdAt?.seconds ? r.createdAt.seconds * 1000 : 0) >= todayTs);
            const totalCost = refills.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0);
            setText('dash-fuel', `€${totalCost.toFixed(2)}`);
            setText('dash-fuel-sub', `${refills.length} refill-e sot`);
        } catch {
            setText('dash-fuel', '€0.00');
            setText('dash-fuel-sub', 'Pa refill-e');
        }

        // SALARIES
        try {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const snap = await db.collection('salaries').limit(200).get();
            const salaries = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(s => s.month === month);
            const totalNet = salaries.reduce((s, x) => s + (parseFloat(x.net) || 0), 0);
            const pending = salaries.filter(s => s.status !== 'paid').length;
            setText('dash-salaries', `€${totalNet.toFixed(0)}`);
            setText('dash-salaries-sub', `${pending} në pritje / ${salaries.length} total`);
        } catch {
            setText('dash-salaries', '€0');
            setText('dash-salaries-sub', 'Pa paga');
        }

        // MOBILE USERS
        try {
            const snap = await db.collection('mobile_users').limit(1000).get();
            const users = snap.docs.map(d => d.data());
            const active = users.filter(u => u.blocked !== true).length;
            setText('dash-mobile', users.length);
            setText('dash-mobile-sub', `${active} aktivë`);
        } catch {
            setText('dash-mobile', '0');
            setText('dash-mobile-sub', 'Pa përdorues');
        }

        // TRACKERS
        try {
            const snap = await db.collection('trackers').limit(200).get();
            const trackers = snap.docs.map(d => d.data());
            const now = Date.now();
            const online = trackers.filter(t => {
                if (!t.lastSeen) return false;
                const ts = t.lastSeen.toDate ? t.lastSeen.toDate().getTime() : (t.lastSeen.seconds ? t.lastSeen.seconds * 1000 : 0);
                return (now - ts) < 5 * 60 * 1000;
            }).length;
            setText('dash-trackers', `${online}/${trackers.length}`);
            setText('dash-trackers-sub', `${online} online`);
        } catch {
            setText('dash-trackers', '0/0');
            setText('dash-trackers-sub', 'Pa trackers');
        }
    }

    // ═══ GRAFIKË ═══
    function renderHourlyChart(orders) {
        const ctx = document.getElementById('dash-chart-hourly');
        if (!ctx || !window.Chart) return;

        const hours = Array(24).fill(0);
        orders.forEach(o => {
            if (!o.createdAtLocal) return;
            const h = new Date(o.createdAtLocal).getHours();
            hours[h]++;
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours.map((_, i) => `${String(i).padStart(2, '0')}:00`),
                datasets: [{
                    label: 'Porosi',
                    data: hours,
                    backgroundColor: 'rgba(168, 85, 247, 0.6)',
                    borderColor: '#a855f7',
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

    function renderStatusChart(orders) {
        const ctx = document.getElementById('dash-chart-status');
        if (!ctx || !window.Chart) return;

        const counts = {
            completed: orders.filter(o => o.status === 'completed').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            waiting: orders.filter(o => o.status === 'waiting' || o.status === 'pending').length,
            active: orders.filter(o => ['assigned', 'onroute', 'arrived', 'taximeter'].includes(o.status)).length
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Përfunduar', 'Anuluar', 'Në pritje', 'Aktive'],
                datasets: [{
                    data: [counts.completed, counts.cancelled, counts.waiting, counts.active],
                    backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#b8a8d9', font: { size: 11 }, padding: 10 }
                    }
                }
            }
        });
    }

    // ═══ TOP LISTS ═══
    function renderTopOperators(orders) {
        const el = document.getElementById('dash-top-operators');
        if (!el) return;

        const map = {};
        orders.forEach(o => {
            if (!o.operatorId) return;
            if (!map[o.operatorId]) map[o.operatorId] = { name: o.operatorName || '?', orders: 0, revenue: 0 };
            map[o.operatorId].orders++;
            map[o.operatorId].revenue += parseFloat(o.price) || 0;
        });

        const top = Object.values(map).sort((a, b) => b.orders - a.orders).slice(0, 5);

        if (!top.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Pa të dhëna</p></div>';
            return;
        }

        el.innerHTML = top.map((op, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#ec4899);color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;">${i + 1}</div>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:12px;">${op.name}</div>
                    <div style="font-size:10px;color:var(--text-muted);">${op.orders} porosi</div>
                </div>
                <div style="color:#10b981;font-weight:800;font-family:var(--font-mono);">€${op.revenue.toFixed(2)}</div>
            </div>
        `).join('');
    }

    function renderTopDrivers(orders) {
        const el = document.getElementById('dash-top-drivers');
        if (!el) return;

        const map = {};
        orders.forEach(o => {
            if (!o.driverId) return;
            if (!map[o.driverId]) map[o.driverId] = { name: o.driverName || '?', vehicle: o.vehicleNum || '', orders: 0, revenue: 0 };
            map[o.driverId].orders++;
            map[o.driverId].revenue += parseFloat(o.price) || 0;
        });

        const top = Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

        if (!top.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Pa të dhëna</p></div>';
            return;
        }

        el.innerHTML = top.map((d, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#06b6d4);color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;">${i + 1}</div>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:12px;">${d.name} ${d.vehicle ? `<span style="color:#a855f7;font-family:var(--font-mono);font-size:10px;">🚗 ${d.vehicle}</span>` : ''}</div>
                    <div style="font-size:10px;color:var(--text-muted);">${d.orders} udhëtime</div>
                </div>
                <div style="color:#10b981;font-weight:800;font-family:var(--font-mono);">€${d.revenue.toFixed(2)}</div>
            </div>
        `).join('');
    }

    // ═══ RECENT ACTIVITY ═══
    async function loadRecentActivity() {
        const el = document.getElementById('dash-recent-activity');
        const db = window.TaxiFirebase?.db;
        if (!el || !db) return;

        try {
            const snap = await db.collection('orders').limit(15).get();
            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAtLocal || 0) - (a.createdAtLocal || 0))
                .slice(0, 10);

            if (!orders.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Pa aktivitet</p></div>';
                return;
            }

            const statusLbl = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', completed: 'Përfunduar', cancelled: 'Anuluar', waiting: 'Në pritje', arrived: 'Në vend', taximeter: 'Taksimetër', fixed: 'Fiks' };
            const statusColor = { completed: '#10b981', cancelled: '#ef4444', pending: '#f59e0b', waiting: '#f59e0b', assigned: '#3b82f6', onroute: '#06b6d4', arrived: '#facc15', taximeter: '#3b82f6', fixed: '#ef4444', new: '#a855f7' };

            el.innerHTML = orders.map(o => `
                <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                    <div style="width:6px;height:6px;border-radius:50%;background:${statusColor[o.status] || '#64748b'};box-shadow:0 0 6px ${statusColor[o.status] || '#64748b'};"></div>
                    <div style="flex:1;font-size:12px;">
                        <strong>${o.phone || '—'}</strong>
                        <span style="color:var(--text-muted);margin-left:8px;font-size:11px;">${o.pickup || '—'}</span>
                    </div>
                    <div style="font-size:10px;font-weight:700;color:${statusColor[o.status] || '#64748b'};text-transform:uppercase;">${statusLbl[o.status] || o.status}</div>
                    <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);min-width:60px;text-align:right;">${o.createdTimeStr || o.time || '—'}</div>
                </div>
            `).join('');
        } catch (e) {
            console.error('❌ loadRecentActivity:', e);
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Pa aktivitet</p></div>';
        }
    }

    // ═══ ALERTS ═══
    async function loadAlerts() {
        const el = document.getElementById('dash-alerts');
        const db = window.TaxiFirebase?.db;
        if (!el || !db) return;

        const alerts = [];

        // 1. Kartat e loyalty me 0 pikë
        try {
            const snap = await db.collection('loyalty_cards').limit(100).get();
            const inactive = snap.docs.map(d => d.data()).filter(c => (c.points || 0) === 0).length;
            if (inactive > 0) {
                alerts.push({ type: 'info', icon: 'fa-id-card', text: `${inactive} karta loyalty pa pikë`, color: '#a855f7' });
            }
        } catch {}

        // 2. Refill-e pa regjistruar këtë javë
        try {
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const snap = await db.collection('fuel_refills').limit(50).get();
            const recent = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(r => (r.createdAt?.seconds ? r.createdAt.seconds * 1000 : 0) >= weekAgo);
            if (recent.length === 0) {
                alerts.push({ type: 'warning', icon: 'fa-gas-pump', text: 'Pa refill-e këtë javë', color: '#f59e0b' });
            }
        } catch {}

        // 3. Pagat në pritje
        try {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const snap = await db.collection('salaries').limit(100).get();
            const pending = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(s => s.month === month && s.status !== 'paid').length;
            if (pending > 0) {
                alerts.push({ type: 'warning', icon: 'fa-money-bill-wave', text: `${pending} paga në pritje për ${month}`, color: '#06b6d4' });
            }
        } catch {}

        // 4. Trackers offline
        try {
            const snap = await db.collection('trackers').limit(100).get();
            const now = Date.now();
            const offline = snap.docs.map(d => d.data()).filter(t => {
                if (!t.lastSeen) return true;
                const ts = t.lastSeen.toDate ? t.lastSeen.toDate().getTime() : (t.lastSeen.seconds ? t.lastSeen.seconds * 1000 : 0);
                return (now - ts) > 30 * 60 * 1000;
            }).length;
            if (offline > 0) {
                alerts.push({ type: 'error', icon: 'fa-satellite-dish', text: `${offline} trackers offline > 30 min`, color: '#ef4444' });
            }
        } catch {}

        // 4. SMS templates që nuk përdoren
        try {
            const snap = await db.collection('sms_templates').limit(50).get();
            const unused = snap.docs.map(d => d.data()).filter(t => !t.usageCount || t.usageCount === 0).length;
            if (unused > 0) {
                alerts.push({ type: 'info', icon: 'fa-comment-sms', text: `${unused} SMS template të papërdorura`, color: '#8b5cf6' });
            }
        } catch {}

        // 5. Mobile users të bllokuar
        try {
            const snap = await db.collection('mobile_users').limit(500).get();
            const blocked = snap.docs.map(d => d.data()).filter(u => u.blocked === true).length;
            if (blocked > 0) {
                alerts.push({ type: 'info', icon: 'fa-ban', text: `${blocked} përdorues mobil të bllokuar`, color: '#f59e0b' });
            }
        } catch {}

        if (!alerts.length) {
            el.innerHTML = `
                <div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fa-solid fa-circle-check" style="font-size:32px;color:#10b981;opacity:0.6;margin-bottom:10px;display:block;"></i>
                    <div style="font-weight:700;color:#10b981;">Krejt në rregull!</div>
                    <div style="font-size:11px;margin-top:4px;">Nuk ka alerta aktive</div>
                </div>
            `;
            return;
        }

        el.innerHTML = alerts.map(a => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px;background:${a.color}15;border-left:3px solid ${a.color};border-radius:6px;margin-bottom:8px;">
                <i class="fa-solid ${a.icon}" style="color:${a.color};font-size:14px;"></i>
                <div style="font-size:12px;color:var(--text-secondary);">${a.text}</div>
            </div>
        `).join('');
    }

    function setText(id, val) {
        const e = document.getElementById(id);
        if (e) e.textContent = val;
    }

    return { init, load, loadQuickStats };
})();

console.log('✅ admin/dashboard.js ngarkuar');
