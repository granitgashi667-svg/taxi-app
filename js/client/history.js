'use strict';

window.ClientHistory = (() => {
    let ordersCache = [];
    let filter = 'all';

    function init() { console.log('📋 ClientHistory: Init...'); }

    async function load() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            let snap;
            try {
                snap = await db.collection('orders').where('clientId', '==', user.uid).limit(100).get();
            } catch {
                const phone = user.phoneNumber || '';
                snap = await db.collection('orders').where('phone', '==', phone).limit(100).get();
            }
            ordersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAtLocal || 0) - (a.createdAtLocal || 0));
            render();
        } catch (e) { console.error('❌ load history:', e); }
    }

    function render() {
        let el = document.getElementById('client-history-page');
        if (!el) {
            el = document.createElement('div');
            el.id = 'client-history-page';
            el.className = 'client-page';
            el.dataset.page = 'history';
            document.getElementById('screen-main')?.appendChild(el);
        }

        let list = ordersCache;
        if (filter === 'completed') list = ordersCache.filter(o => o.status === 'completed');
        if (filter === 'cancelled') list = ordersCache.filter(o => o.status === 'cancelled');
        if (filter === 'active') list = ordersCache.filter(o => ['waiting', 'assigned', 'onroute', 'arrived', 'pending'].includes(o.status));

        const total = ordersCache.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

        el.innerHTML = `
            <div style="padding:16px;">
                <h2 style="font-size:20px;font-weight:800;color:#f1f5f9;margin-bottom:16px;">
                    <i class="fa-solid fa-clock-rotate-left" style="color:#a855f7;"></i> Historiku
                </h2>

                <div class="kpi-grid" style="margin-bottom:16px;">
                    <div class="kpi-card blue"><div class="kpi-label">Porosi</div><div class="kpi-value blue">${ordersCache.length}</div></div>
                    <div class="kpi-card green"><div class="kpi-label">Shpenzuar</div><div class="kpi-value green">€${total.toFixed(2)}</div></div>
                    <div class="kpi-card yellow"><div class="kpi-label">Mesatarja</div><div class="kpi-value yellow">€${ordersCache.length ? (total / ordersCache.length).toFixed(2) : '0.00'}</div></div>
                </div>

                <div class="filter-bar" style="margin-bottom:12px;">
                    <button class="filter-btn ${filter === 'all' ? 'active' : ''}" onclick="ClientHistory.setFilter('all')">Të gjitha</button>
                    <button class="filter-btn ${filter === 'active' ? 'active' : ''}" onclick="ClientHistory.setFilter('active')">Aktive</button>
                    <button class="filter-btn ${filter === 'completed' ? 'active' : ''}" onclick="ClientHistory.setFilter('completed')">Përfunduar</button>
                    <button class="filter-btn ${filter === 'cancelled' ? 'active' : ''}" onclick="ClientHistory.setFilter('cancelled')">Anuluar</button>
                </div>

                ${list.length ? list.map(o => `
                    <div style="background:#1e293b;border-radius:12px;padding:14px;margin-bottom:10px;border-left:3px solid ${statusColor(o.status)};">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <span class="status-badge ${o.status}">${statusLabel(o.status)}</span>
                            <span style="font-size:11px;color:#64748b;font-family:var(--font-mono);">${formatDate(o.createdAtLocal)}</span>
                        </div>
                        <div style="font-size:13px;color:#f1f5f9;font-weight:600;margin-bottom:4px;">
                            <i class="fa-solid fa-location-dot" style="color:#a855f7;"></i> ${o.pickup || '—'}
                        </div>
                        <div style="font-size:13px;color:#94a3b8;margin-bottom:10px;">
                            <i class="fa-solid fa-flag-checkered" style="color:#ec4899;"></i> ${o.destination || '—'}
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="font-size:11px;color:#64748b;">
                                ${o.vehicleNum ? `🚗 ${o.vehicleNum}` : ''} ${o.driverName ? '· ' + o.driverName : ''}
                            </div>
                            <div style="font-size:18px;font-weight:800;color:#10b981;font-family:var(--font-mono);">
                                ${o.price ? '€' + parseFloat(o.price).toFixed(2) : '—'}
                            </div>
                        </div>
                        ${o.status === 'completed' ? `
                            <button onclick="ClientRatings.open('${o.id}')" style="width:100%;margin-top:12px;padding:8px;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);border-radius:8px;color:#a855f7;font-weight:700;font-size:12px;cursor:pointer;">
                                <i class="fa-solid fa-star"></i> Vlerëso
                            </button>
                        ` : ''}
                    </div>
                `).join('') : `
                    <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
                        <i class="fa-solid fa-inbox" style="font-size:48px;opacity:.3;margin-bottom:16px;display:block;"></i>
                        <div style="font-size:13px;">Nuk ka porosi</div>
                    </div>
                `}
            </div>
        `;
    }

    function setFilter(f) { filter = f; render(); }

    function statusColor(s) {
        return { completed: '#10b981', cancelled: '#ef4444', waiting: '#f59e0b', pending: '#f59e0b', assigned: '#3b82f6', onroute: '#06b6d4', arrived: '#facc15' }[s] || '#64748b';
    }

    function statusLabel(s) {
        return { new: 'E Re', pending: 'Pritje', waiting: 'Në pritje', assigned: 'Caktuar', onroute: 'Në rrugë', arrived: 'Në vend', completed: 'Përfunduar', cancelled: 'Anuluar' }[s] || s;
    }

    function formatDate(ts) {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    return { init, load, render, setFilter };
})();

console.log('✅ client/history.js ngarkuar');
