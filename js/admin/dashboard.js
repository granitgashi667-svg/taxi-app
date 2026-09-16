'use strict';

/**
 * js/admin/dashboard.js — Dashboard live me statistika
 */

window.AdminDashboard = (() => {
    let refreshInterval = null;
    let unsubscribeOrders = null;

    // ═══ INIT ═══
    function init() {
        console.log('📊 AdminDashboard: Init...');

        // Dëgjo porositë në kohë reale
        subscribeToOrders();

        // Auto-refresh
        startAutoRefresh();
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('📊 Duke ngarkuar dashboard...');
        await loadKPIs();
        await loadTopOperators();
        await loadTopDrivers();
        await loadRecentActivity();
    }

    // ═══ KPI ═══
    async function loadKPIs() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            // Porositë e sotme
            const ordersSnap = await db.collection('orders')
                .where('createdAtLocal', '>=', todayStart.getTime())
                .get();

            const orders = ordersSnap.docs.map(d => d.data());
            const completed = orders.filter(o => o.status === 'completed');
            const revenue = completed.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

            document.getElementById('kpi-revenue').textContent = `€${revenue.toFixed(2)}`;
            document.getElementById('kpi-revenue-sub').textContent = `${completed.length} porosi të kryera`;

            document.getElementById('kpi-trips').textContent = orders.length;
            document.getElementById('kpi-trips-sub').textContent = `${completed.length} të realizuara`;

            // Operatorët aktivë
            const operatorsSnap = await db.collection('operators')
                .where('active', '==', true)
                .get();
            document.getElementById('kpi-operators').textContent = operatorsSnap.size;

            // Shoferët aktivë
            const driversSnap = await db.collection('drivers').get();
            const drivers = driversSnap.docs.map(d => d.data());
            const activeDrivers = drivers.filter(d => d.mode !== 'inactive').length;
            const onlineDrivers = drivers.filter(d => d.mode === 'free').length;

            document.getElementById('kpi-drivers').textContent = activeDrivers;
            document.getElementById('kpi-drivers-sub').textContent = `${onlineDrivers} online · ${drivers.length} total`;

        } catch (e) {
            console.error('❌ loadKPIs:', e);
        }
    }

    // ═══ TOP OPERATORS ═══
    async function loadTopOperators() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        const el = document.getElementById('top-operators-list');
        if (!el) return;

        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            // Të gjitha porositë e sotme
            const ordersSnap = await db.collection('orders')
                .where('createdAtLocal', '>=', todayStart.getTime())
                .get();

            // Grupim sipas operatorId
            const operatorStats = {};
            ordersSnap.docs.forEach(doc => {
                const o = doc.data();
                if (!o.operatorId) return;

                if (!operatorStats[o.operatorId]) {
                    operatorStats[o.operatorId] = {
                        name: o.operatorName || 'I panjohur',
                        orders: 0,
                        revenue: 0,
                        completed: 0
                    };
                }

                operatorStats[o.operatorId].orders++;
                if (o.status === 'completed') {
                    operatorStats[o.operatorId].completed++;
                    operatorStats[o.operatorId].revenue += parseFloat(o.price) || 0;
                }
            });

            // Sorto sipas porosive
            const top = Object.entries(operatorStats)
                .map(([id, s]) => ({ id, ...s }))
                .sort((a, b) => b.orders - a.orders)
                .slice(0, 5);

            if (!top.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka aktivitet sot</p></div>';
                return;
            }

            el.innerHTML = top.map((op, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                const initials = op.name.slice(0, 2).toUpperCase();
                return `
                    <div class="top-list-item rank-${idx + 1}">
                        <div class="tli-rank">${idx < 3 ? medal : idx + 1}</div>
                        <div class="tli-info">
                            <div class="tli-name">${op.name}</div>
                            <div class="tli-meta">
                                <span><i class="fa-solid fa-clipboard-list"></i> ${op.orders} porosi</span>
                                <span><i class="fa-solid fa-check"></i> ${op.completed}</span>
                            </div>
                        </div>
                        <div class="tli-value">€${op.revenue.toFixed(2)}</div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            console.error('❌ loadTopOperators:', e);
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim</p></div>';
        }
    }

    // ═══ TOP DRIVERS ═══
    async function loadTopDrivers() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        const el = document.getElementById('top-drivers-list');
        if (!el) return;

        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const ordersSnap = await db.collection('orders')
                .where('createdAtLocal', '>=', todayStart.getTime())
                .get();

            const driverStats = {};
            ordersSnap.docs.forEach(doc => {
                const o = doc.data();
                if (!o.driverId) return;

                if (!driverStats[o.driverId]) {
                    driverStats[o.driverId] = {
                        name: o.driverName || 'I panjohur',
                        vehicleNum: o.vehicleNum || '',
                        orders: 0,
                        revenue: 0,
                        completed: 0
                    };
                }

                driverStats[o.driverId].orders++;
                if (o.status === 'completed') {
                    driverStats[o.driverId].completed++;
                    driverStats[o.driverId].revenue += parseFloat(o.price) || 0;
                }
            });

            const top = Object.entries(driverStats)
                .map(([id, s]) => ({ id, ...s }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            if (!top.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka aktivitet sot</p></div>';
                return;
            }

            el.innerHTML = top.map((d, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                return `
                    <div class="top-list-item rank-${idx + 1}">
                        <div class="tli-rank">${idx < 3 ? medal : idx + 1}</div>
                        <div class="tli-info">
                            <div class="tli-name">${d.name} ${d.vehicleNum ? `<span style="color:var(--accent-purple);font-family:var(--font-mono);font-size:11px;">🚗 ${d.vehicleNum}</span>` : ''}</div>
                            <div class="tli-meta">
                                <span><i class="fa-solid fa-route"></i> ${d.completed} udhëtime</span>
                            </div>
                        </div>
                        <div class="tli-value">€${d.revenue.toFixed(2)}</div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            console.error('❌ loadTopDrivers:', e);
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim</p></div>';
        }
    }

    // ═══ RECENT ACTIVITY ═══
    async function loadRecentActivity() {
        const el = document.getElementById('recent-activity-list');
        if (!el) return;

        try {
            // Merr nga audit log
            if (!window.TaxiAuditLog) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka aktivitet</p></div>';
                return;
            }

            const logs = await window.TaxiAuditLog.getRecent(15);

            if (!logs.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka aktivitet</p></div>';
                return;
            }

            el.innerHTML = logs.map(log => {
                const info = getActivityInfo(log);
                return `
                    <div class="activity-item">
                        <div class="ai-icon ${info.color}">
                            <i class="fa-solid ${info.icon}"></i>
                        </div>
                        <div class="ai-content">
                            <div class="ai-text">${info.text}</div>
                            <div class="ai-time">${log.timestampStr || ''}</div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            console.error('❌ loadRecentActivity:', e);
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim</p></div>';
        }
    }

    // ═══ INTERPRETO LOGUN ═══
    function getActivityInfo(log) {
        const user = log.userName || 'Operator';
        const d = log.details || {};

        const map = {
            'order_created': { icon: 'fa-plus', color: 'green', text: `<strong>${user}</strong> krijoi porosi të re` },
            'order_cancelled': { icon: 'fa-xmark', color: 'red', text: `<strong>${user}</strong> anuloi porosinë` },
            'order_deleted': { icon: 'fa-trash', color: 'red', text: `<strong>${user}</strong> fshiu porosi` },
            'order_assigned': { icon: 'fa-car', color: 'blue', text: `<strong>${user}</strong> caktoi porosi` },
            'order_completed': { icon: 'fa-check', color: 'green', text: `Porosia u përfundua` },
            'order_arrived': { icon: 'fa-location-dot', color: 'yellow', text: `Shoferi arriti` },
            'client_login': { icon: 'fa-user', color: 'purple', text: `Klient i re: <strong>${d.phone || ''}</strong>` },
            'client_created_order': { icon: 'fa-mobile', color: 'purple', text: `Porosi nga klienti <strong>${d.phone || ''}</strong>` },
            'driver_login': { icon: 'fa-car', color: 'blue', text: `Shofer <strong>${d.name || ''}</strong> u logua` },
            'driver_accepted_order': { icon: 'fa-check', color: 'green', text: `Shofer pranoi porosi` },
            'driver_status_change': { icon: 'fa-toggle-on', color: 'yellow', text: `Shofer ndryshoi statusin: <strong>${d.status || ''}</strong>` },
            'admin_login': { icon: 'fa-user-tie', color: 'purple', text: `<strong>${user}</strong> hyri në panel` },
            'admin_logout': { icon: 'fa-right-from-bracket', color: 'gray', text: `<strong>${user}</strong> doli` },
            'blacklist_add': { icon: 'fa-ban', color: 'red', text: `Numri <strong>${d.phone || ''}</strong> u bllokua` },
            'broadcast_sent': { icon: 'fa-bullhorn', color: 'yellow', text: `<strong>${user}</strong> dërgoi broadcast` },
            'backup_created': { icon: 'fa-database', color: 'green', text: `Backup u krijua` }
        };

        return map[log.action] || { icon: 'fa-circle-info', color: 'gray', text: `${user}: ${log.action}` };
    }

    // ═══ SUBSCRIBE POROSITË ═══
    function subscribeToOrders() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        if (unsubscribeOrders) unsubscribeOrders();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        unsubscribeOrders = db.collection('orders')
            .where('createdAtLocal', '>=', todayStart.getTime())
            .onSnapshot(() => {
                // Rifresko KPI kur ndryshon
                if (window.AdminApp?.currentPage === 'dashboard') {
                    loadKPIs();
                    loadTopOperators();
                    loadTopDrivers();
                }
            }, (err) => console.warn('Dashboard subscribe:', err));
    }

    // ═══ AUTO-REFRESH ═══
    function startAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);

        refreshInterval = setInterval(() => {
            if (window.AdminApp?.currentPage === 'dashboard') {
                loadKPIs();
            }
        }, 30000); // Çdo 30 sek
    }

    // ═══ STOP ═══
    function stop() {
        if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
        if (unsubscribeOrders) { unsubscribeOrders(); unsubscribeOrders = null; }
    }

    return { init, load, stop };
})();

console.log('✅ admin/dashboard.js ngarkuar');
