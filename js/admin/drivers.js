'use strict';

/**
 * js/admin/drivers.js — Menaxhimi i shoferëve
 */

window.AdminDrivers = (() => {
    let cachedDrivers = [];
    let cachedStats = {};

    // ═══ INIT ═══
    function init() {
        console.log('🚗 AdminDrivers: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('🚗 Duke ngarkuar shoferët...');
        await renderAll();
    }

    // ═══ RENDER ALL ═══
    async function renderAll() {
        const el = document.getElementById('drivers-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            // Merr shoferët
            const driversSnap = await db.collection('drivers').get();
            const drivers = driversSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Merr statistikat (porositë e sotme)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const ordersSnap = await db.collection('orders')
                .where('createdAtLocal', '>=', todayStart.getTime())
                .get();
            const orders = ordersSnap.docs.map(d => d.data());

            // Llogarit statistikat për çdo shofer
            const stats = {};
            orders.forEach(o => {
                if (!o.driverId) return;
                if (!stats[o.driverId]) stats[o.driverId] = { orders: 0, completed: 0, revenue: 0 };
                stats[o.driverId].orders++;
                if (o.status === 'completed') {
                    stats[o.driverId].completed++;
                    stats[o.driverId].revenue += parseFloat(o.price) || 0;
                }
            });

            cachedDrivers = drivers;
            cachedStats = stats;

            renderKPIs(drivers);
            renderList(drivers, stats);

        } catch (e) {
            console.error('❌ renderAll:', e);
            el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gabim: ${e.message}</p></div>`;
        }
    }

    // ═══ KPI ═══
    function renderKPIs(drivers) {
        const el = document.getElementById('drivers-content');

        const total = drivers.length;
        const free = drivers.filter(d => d.mode === 'free').length;
        const busy = drivers.filter(d => d.mode === 'taximeter' || d.mode === 'fixed').length;
        const pause = drivers.filter(d => d.mode === 'pause').length;
        const inactive = drivers.filter(d => d.mode === 'inactive' || !d.mode).length;

        // Ruaj totalin në një global të përkohshëm
        window.__driversKPI = { total, free, busy, pause, inactive };
    }

    // ═══ LIST ═══
    function renderList(drivers, stats) {
        const el = document.getElementById('drivers-content');
        const kpi = window.__driversKPI || {};

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-users"></i> Total</div>
                    <div class="kpi-value green">${kpi.total || 0}</div>
                    <div class="kpi-sub">Shoferë të regjistruar</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-circle"></i> Të lirë</div>
                    <div class="kpi-value blue">${kpi.free || 0}</div>
                    <div class="kpi-sub">Presin porosi</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-route"></i> Në udhëtim</div>
                    <div class="kpi-value yellow">${kpi.busy || 0}</div>
                    <div class="kpi-sub">Me klient</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-pause"></i> Pushim / Offline</div>
                    <div class="kpi-value pink">${(kpi.pause || 0) + (kpi.inactive || 0)}</div>
                    <div class="kpi-sub">${kpi.pause || 0} pushim · ${kpi.inactive || 0} offline</div>
                </div>
            </div>

            <div class="admin-cards-grid">
                ${drivers.length === 0
                    ? '<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-inbox"></i><p>Nuk ka shoferë</p></div>'
                    : drivers.map(d => {
                        const s = stats[d.id] || { orders: 0, completed: 0, revenue: 0 };
                        const vehicle = window.AppState?.vehicles?.find(v => v.id === d.vehicleId);
                        const num = String(d.vehicleId || 0).padStart(2, '0');
                        const modeLabel = {
                            free: 'Lirë',
                            taximeter: 'Në udhëtim',
                            fixed: 'Çmim fiks',
                            pause: 'Pushim',
                            inactive: 'Joaktiv'
                        }[d.mode] || 'Joaktiv';
                        const modeClass = d.mode === 'free' ? 'green' : d.mode === 'pause' ? 'yellow' : d.mode === 'inactive' ? 'gray' : 'blue';
                        const avatar = d.avatar || (d.name || '?').slice(0, 2).toUpperCase();

                        return `
                            <div class="admin-card">
                                <div class="ac-header">
                                    <div class="ac-avatar">${avatar}</div>
                                    <div class="ac-info">
                                        <div class="ac-name">${d.name || 'I panjohur'}</div>
                                        <div class="ac-role">🚗 ${num} · ${vehicle ? vehicle.plate : 'Pa veturë'}</div>
                                    </div>
                                    <span class="admin-badge ${modeClass}">${modeLabel}</span>
                                </div>
                                <div class="ac-body">
                                    <div class="ac-row">
                                        <span><i class="fa-solid fa-phone"></i> Telefon</span>
                                        <span>${d.phone || '—'}</span>
                                    </div>
                                    <div class="ac-row">
                                        <span><i class="fa-solid fa-star"></i> Vlerësimi</span>
                                        <span>⭐ ${d.rating || '5.0'}</span>
                                    </div>
                                    <div class="ac-row">
                                        <span><i class="fa-solid fa-clipboard-list"></i> Porosi sot</span>
                                        <span>${s.orders} (${s.completed} kryer)</span>
                                    </div>
                                    <div class="ac-row">
                                        <span><i class="fa-solid fa-euro-sign"></i> Të ardhura sot</span>
                                        <span style="color:var(--accent-green);">€${s.revenue.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px;">
                                    <button class="filter-btn" onclick="AdminDrivers.viewDetails('${d.id}')" style="padding:8px;">
                                        <i class="fa-solid fa-chart-simple"></i> Detaje
                                    </button>
                                    <button class="filter-btn" onclick="AdminDrivers.openControl('${d.id}')" style="padding:8px;">
                                        <i class="fa-solid fa-sliders"></i> Kontroll
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        `;
    }

    // ═══ VIEW DETAILS ═══
    async function viewDetails(driverId) {
        const d = cachedDrivers.find(x => x.id === driverId);
        if (!d) return;

        const db = window.TaxiFirebase?.db;
        const vehicle = window.AppState?.vehicles?.find(v => v.id === d.vehicleId);
        const num = String(d.vehicleId || 0).padStart(2, '0');

        // Merr historikun e plotë
        let totalOrders = 0, totalCompleted = 0, totalRevenue = 0;
        try {
            const snap = await db.collection('orders').where('driverId', '==', driverId).get();
            snap.forEach(doc => {
                const o = doc.data();
                totalOrders++;
                if (o.status === 'completed') {
                    totalCompleted++;
                    totalRevenue += parseFloat(o.price) || 0;
                }
            });
        } catch (e) { console.warn(e); }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-driver-detail';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-car"></i>
                        <h3>${d.name}</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-driver-detail').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display:flex;align-items:center;gap:14px;padding:16px;background:var(--bg-tertiary);border-radius:12px;border-left:4px solid var(--accent-purple);margin-bottom:20px;">
                        <div style="width:60px;height:60px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:white;font-family:var(--font-mono);">${d.avatar || d.name.slice(0, 2).toUpperCase()}</div>
                        <div>
                            <div style="font-size:16px;font-weight:800;">${d.name}</div>
                            <div style="font-size:12px;color:var(--text-muted);">🚗 ${num} · ${vehicle ? vehicle.plate + ' · ' + vehicle.model : 'Pa veturë'}</div>
                            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">📞 ${d.phone || '—'}</div>
                        </div>
                    </div>

                    <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
                        <i class="fa-solid fa-chart-simple"></i> STATISTIKAT TOTALE
                    </div>

                    <div class="kpi-grid" style="margin-bottom:20px;">
                        <div class="kpi-card blue"><div class="kpi-label">Porosi totale</div><div class="kpi-value blue">${totalOrders}</div></div>
                        <div class="kpi-card green"><div class="kpi-label">Realizuar</div><div class="kpi-value green">${totalCompleted}</div></div>
                        <div class="kpi-card yellow"><div class="kpi-label">Suksesi</div><div class="kpi-value yellow">${totalOrders > 0 ? ((totalCompleted / totalOrders) * 100).toFixed(1) : 0}%</div></div>
                        <div class="kpi-card pink"><div class="kpi-label">Të ardhura</div><div class="kpi-value pink">€${totalRevenue.toFixed(2)}</div></div>
                    </div>

                    <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
                        <i class="fa-solid fa-info-circle"></i> INFORMACION
                    </div>
                    <div class="ac-body" style="padding:14px;background:var(--bg-tertiary);border-radius:10px;">
                        <div class="ac-row"><span>Email</span><span>${d.email || '—'}</span></div>
                        <div class="ac-row"><span>Statusi</span><span>${d.mode || 'inactive'}</span></div>
                        <div class="ac-row"><span>Vlerësimi</span><span>⭐ ${d.rating || '5.0'}</span></div>
                        <div class="ac-row"><span>Veturë ID</span><span>${d.vehicleId || '—'}</span></div>
                        <div class="ac-row"><span>Aktiv</span><span>${d.active !== false ? '✅ Po' : '❌ Jo'}</span></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-driver-detail').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ OPEN CONTROL (Control Unit) ═══
    function openControl(driverId) {
        if (window.TaxiControlUnit?.openControlModal) {
            window.TaxiControlUnit.openControlModal(driverId);
        } else {
            showToast('warning', 'Kontrolli', 'Control Unit nuk është gati');
        }
    }

    // ═══ SHOW TOAST ═══
    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return { init, load, viewDetails, openControl };
})();

console.log('✅ admin/drivers.js ngarkuar');
