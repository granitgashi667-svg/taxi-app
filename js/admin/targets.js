'use strict';

/**
 * js/admin/targets.js — Menu Targets (5 nënmenu)
 */

window.AdminTargets = (() => {
    let currentTab = 'company';

    // ═══ INIT ═══
    function init() {
        console.log('🎯 AdminTargets: Init...');
    }

    // ═══ LOAD ═══
    function load() {
        renderPage();
    }

    // ═══ RENDER FAQJA ═══
    function renderPage() {
        const el = document.querySelector('.admin-page[data-page="targets"]');
        if (!el) return;

        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;">
                <div class="page-title">
                    <i class="fa-solid fa-bullseye"></i>
                    <div>
                        <h2>Targets</h2>
                        <p>Menaxhimi i porosive sipas kategorive</p>
                    </div>
                </div>
            </div>

            <div class="filter-bar" style="margin-bottom:20px;">
                <button class="filter-btn ${currentTab === 'company' ? 'active' : ''}" onclick="AdminTargets.switchTab('company')">
                    <i class="fa-solid fa-building"></i> Company orders
                </button>
                <button class="filter-btn ${currentTab === 'history' ? 'active' : ''}" onclick="AdminTargets.switchTab('history')">
                    <i class="fa-solid fa-clock-rotate-left"></i> Target history
                </button>
                <button class="filter-btn ${currentTab === 'preorders' ? 'active' : ''}" onclick="AdminTargets.switchTab('preorders')">
                    <i class="fa-solid fa-calendar-clock"></i> Preorders
                </button>
                <button class="filter-btn ${currentTab === 'ipay' ? 'active' : ''}" onclick="AdminTargets.switchTab('ipay')">
                    <i class="fa-solid fa-credit-card"></i> iPay orders
                </button>
                <button class="filter-btn ${currentTab === 'mobile' ? 'active' : ''}" onclick="AdminTargets.switchTab('mobile')">
                    <i class="fa-solid fa-mobile-screen"></i> Mobile orders
                </button>
            </div>

            <div id="targets-content">
                <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>
            </div>
        `;

        loadTab(currentTab);
    }

    // ═══ SWITCH TAB ═══
    function switchTab(tab) {
        currentTab = tab;
        renderPage();
    }

    // ═══ LOAD TAB ═══
    async function loadTab(tab) {
        const el = document.getElementById('targets-content');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>';

        switch (tab) {
            case 'company': await loadCompanyOrders(el); break;
            case 'history': await loadHistory(el); break;
            case 'preorders': await loadPreorders(el); break;
            case 'ipay': await loadIpay(el); break;
            case 'mobile': await loadMobile(el); break;
        }
    }

    // ═══ COMPANY ORDERS ═══
    async function loadCompanyOrders(el) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('orders')
                .where('company', '!=', null)
                .orderBy('company')
                .orderBy('createdAtLocal', 'desc')
                .limit(100)
                .get()
                .catch(() => db.collection('orders').where('source', '==', 'company').limit(100).get());

            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (!orders.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-building"></i><p>Nuk ka porosi nga kompanitë</p></div>';
                return;
            }

            el.innerHTML = renderOrdersTable(orders, 'Company');
        } catch (e) {
            console.error('❌ loadCompanyOrders:', e);
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka porosi kompanie</p></div>';
        }
    }

    // ═══ HISTORY ═══
    async function loadHistory(el) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('orders')
                .orderBy('createdAtLocal', 'desc')
                .limit(200)
                .get();

            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (!orders.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clock"></i><p>Nuk ka histori</p></div>';
                return;
            }

            el.innerHTML = `
                <div class="filter-bar" style="margin-bottom:16px;">
                    <button class="filter-btn active" onclick="AdminTargets.filterHistory('all', this)">Të gjitha</button>
                    <button class="filter-btn" onclick="AdminTargets.filterHistory('completed', this)">Të përfunduara</button>
                    <button class="filter-btn" onclick="AdminTargets.filterHistory('cancelled', this)">Anuluar</button>
                </div>
                ${renderOrdersTable(orders, 'History')}
            `;
        } catch (e) {
            console.error('❌ loadHistory:', e);
        }
    }

    function filterHistory(filter, btn) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Riload
        loadTab('history');
    }

    // ═══ PREORDERS ═══
    async function loadPreorders(el) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('orders')
                .where('status', '==', 'preorder')
                .orderBy('terminDateTime', 'asc')
                .limit(100)
                .get()
                .catch(() => db.collection('orders').where('status', '==', 'preorder').limit(100).get());

            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (!orders.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-calendar-clock"></i><p>Nuk ka preorders</p></div>';
                return;
            }

            el.innerHTML = renderOrdersTable(orders, 'Preorder');
        } catch (e) {
            console.error('❌ loadPreorders:', e);
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka preorders</p></div>';
        }
    }

    // ═══ iPAY ═══
    async function loadIpay(el) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('orders')
                .where('paymentMethod', '==', 'ipay')
                .orderBy('createdAtLocal', 'desc')
                .limit(100)
                .get()
                .catch(() => db.collection('orders').where('paid', '==', true).limit(100).get());

            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (!orders.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-credit-card"></i><p>Nuk ka porosi iPay</p></div>';
                return;
            }

            el.innerHTML = renderOrdersTable(orders, 'iPay');
        } catch (e) {
            console.error('❌ loadIpay:', e);
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka porosi iPay</p></div>';
        }
    }

    // ═══ MOBILE ═══
    async function loadMobile(el) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('orders')
                .where('source', '==', 'mobile_app')
                .orderBy('createdAtLocal', 'desc')
                .limit(100)
                .get();

            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (!orders.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-mobile-screen"></i><p>Nuk ka porosi mobile</p></div>';
                return;
            }

            el.innerHTML = renderOrdersTable(orders, 'Mobile');
        } catch (e) {
            console.error('❌ loadMobile:', e);
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka porosi mobile</p></div>';
        }
    }

    // ═══ RENDER TABLE ═══
    function renderOrdersTable(orders, label) {
        const lbl = {
            new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë',
            delay: 'Vonesë', completed: 'Përfunduar', waiting: 'Në pritje',
            arrived: 'Në vend', taximeter: 'Taksimetër', fixed: 'Fiks',
            cancelled: 'Anuluar', preorder: 'Termin'
        };

        return `
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Ora</th>
                            <th>Statusi</th>
                            <th>Telefon</th>
                            <th>Klienti</th>
                            <th>Marrja</th>
                            <th>Destinacioni</th>
                            <th>Vetura</th>
                            <th>Çmimi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(o => `
                            <tr>
                                <td class="mono" style="font-size:10px;">${o.createdDateStr || (o.terminDate || '—')}</td>
                                <td class="mono" style="font-size:10px;">${o.createdTimeStr || o.time || '—'}</td>
                                <td><span class="status-badge ${o.status}">${lbl[o.status] || o.status}</span></td>
                                <td class="phone">${o.phone}</td>
                                <td>${o.name || 'Klient'}</td>
                                <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.pickup || '—'}</td>
                                <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.destination || '—'}</td>
                                <td>${o.vehicleNum ? `<span class="vehicle-badge">${o.vehicleNum}</span>` : '—'}</td>
                                <td class="green mono" style="font-weight:800;">${o.price ? '€' + parseFloat(o.price).toFixed(2) : '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    return { init, load, switchTab };
})();

console.log('✅ admin/targets.js ngarkuar');
