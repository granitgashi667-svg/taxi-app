'use strict';

/**
 * js/admin/targets.js — Menu Targets (5 nënmenu)
 * Company orders | Target history | Preorders | iPay | Mobile
 */

window.AdminTargets = (() => {
    let currentTab = 'company';
    let cache = { company: [], history: [], preorders: [], ipay: [], mobile: [] };
    let filters = {
        history: { status: 'all', from: '', to: '', company: '' },
        preorders: { from: '', to: '' },
        ipay: { from: '', to: '' },
        mobile: { from: '', to: '' }
    };

    const STATUS_LBL = {
        new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë',
        delay: 'Vonesë', completed: 'Përfunduar', waiting: 'Në pritje',
        arrived: 'Në vend', taximeter: 'Taksimetër', fixed: 'Fiks',
        cancelled: 'Anuluar', preorder: 'Termin'
    };

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
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title">
                    <i class="fa-solid fa-bullseye"></i>
                    <div>
                        <h2>Targets</h2>
                        <p>Menaxhimi i porosive sipas kategorive</p>
                    </div>
                </div>
                <button class="btn-primary" onclick="AdminTargets.openTargetModal()">
                    <i class="fa-solid fa-plus"></i> Target i re
                </button>
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

            <div id="targets-modal-root"></div>
        `;

        loadTab(currentTab);
    }

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

    // ═══ HELPER: DATĖ ═══
    function dateStr(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toISOString().slice(0, 10);
    }
    function inRange(o, from, to) {
        if (!from && !to) return true;
        const d = o.createdAtLocal?.toDate ? o.createdAtLocal.toDate() :
                  o.createdAtLocal ? new Date(o.createdAtLocal) : null;
        if (!d) return true;
        const ds = d.toISOString().slice(0, 10);
        if (from && ds < from) return false;
        if (to && ds > to) return false;
        return true;
    }
    function sumPrice(orders) {
        return orders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
    }

    // ═══ COMPANY ORDERS ═══
    async function loadCompanyOrders(el) {
        const db = window.TaxiFirebase?.db;
        if (!db) { el.innerHTML = errBox('Firebase nuk është gati'); return; }

        try {
            let orders = [];
            try {
                const snap = await db.collection('orders')
                    .where('source', '==', 'company')
                    .orderBy('createdAtLocal', 'desc').limit(200).get();
                orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
                const snap = await db.collection('orders')
                    .orderBy('createdAtLocal', 'desc').limit(200).get();
                orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter(o => o.company || o.source === 'company');
            }

            cache.company = orders;

            const total = sumPrice(orders);
            const targetSnap = await db.collection('targets').limit(50).get().catch(() => null);
            const targets = targetSnap ? targetSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];

            el.innerHTML = `
                ${renderStats([
                    { label: 'Porosi kompanie', value: orders.length, icon: 'fa-building', color: '#3b82f6' },
                    { label: 'Total €', value: '€' + total.toFixed(2), icon: 'fa-euro-sign', color: '#10b981' },
                    { label: 'Targete aktive', value: targets.length, icon: 'fa-bullseye', color: '#f59e0b' }
                ])}
                ${targets.length ? `
                    <div class="admin-table-wrap" style="margin-bottom:20px;">
                        <table class="admin-table">
                            <thead><tr><th>Kompania</th><th>Targeti</th><th>Arritur</th><th>Progres</th><th>Data</th><th></th></tr></thead>
                            <tbody>
                                ${targets.map(t => {
                                    const done = orders.filter(o => o.company === t.company).length;
                                    const pct = t.target ? Math.min(100, Math.round(done / t.target * 100)) : 0;
                                    return `
                                        <tr>
                                            <td><strong>${t.company || '—'}</strong></td>
                                            <td class="mono">${t.target || 0}</td>
                                            <td class="mono">${done}</td>
                                            <td>
                                                <div style="background:#1e293b;border-radius:6px;height:8px;width:120px;overflow:hidden;">
                                                    <div style="background:${pct >= 100 ? '#10b981' : '#3b82f6'};height:100%;width:${pct}%"></div>
                                                </div>
                                                <span style="font-size:10px;color:#94a3b8;">${pct}%</span>
                                            </td>
                                            <td class="mono" style="font-size:10px;">${t.date || '—'}</td>
                                            <td>
                                                <button class="btn-icon danger" onclick="AdminTargets.deleteTarget('${t.id}')">
                                                    <i class="fa-solid fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                ${orders.length ? renderOrdersTable(orders, 'Company') : emptyBox('fa-building', 'Nuk ka porosi nga kompanitë')}
            `;
        } catch (e) {
            console.error('❌ loadCompanyOrders:', e);
            el.innerHTML = errBox('Gabim: ' + e.message);
        }
    }

    // ═══ HISTORY ═══
    async function loadHistory(el) {
        const db = window.TaxiFirebase?.db;
        if (!db) { el.innerHTML = errBox('Firebase nuk është gati'); return; }

        try {
            const f = filters.history;
            let q = db.collection('orders').orderBy('createdAtLocal', 'desc').limit(500);
            if (f.status && f.status !== 'all') q = q.where('status', '==', f.status);

            const snap = await q.get().catch(() => db.collection('orders').limit(500).get());
            let orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(o => inRange(o, f.from, f.to))
                .filter(o => !f.company || (o.company || '').toLowerCase().includes(f.company.toLowerCase()));

            cache.history = orders;

            el.innerHTML = `
                <div class="filter-bar" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <select id="hist-status" class="input-sm" onchange="AdminTargets.applyHistoryFilter()">
                        <option value="all" ${f.status === 'all' ? 'selected' : ''}>Të gjitha statuset</option>
                        <option value="completed" ${f.status === 'completed' ? 'selected' : ''}>Të përfunduara</option>
                        <option value="cancelled" ${f.status === 'cancelled' ? 'selected' : ''}>Anuluar</option>
                        <option value="pending" ${f.status === 'pending' ? 'selected' : ''}>Në pritje</option>
                        <option value="onroute" ${f.status === 'onroute' ? 'selected' : ''}>Në rrugë</option>
                    </select>
                    <input type="date" id="hist-from" class="input-sm" value="${f.from}" onchange="AdminTargets.applyHistoryFilter()">
                    <input type="date" id="hist-to" class="input-sm" value="${f.to}" onchange="AdminTargets.applyHistoryFilter()">
                    <input type="text" id="hist-company" class="input-sm" placeholder="Kompania..." value="${f.company}" onchange="AdminTargets.applyHistoryFilter()">
                    <button class="btn-secondary" onclick="AdminTargets.resetHistoryFilter()"><i class="fa-solid fa-rotate"></i> Reset</button>
                    <button class="btn-secondary" onclick="AdminTargets.exportCSV('history')"><i class="fa-solid fa-download"></i> CSV</button>
                </div>

                ${renderStats([
                    { label: 'Porosi', value: orders.length, icon: 'fa-list', color: '#3b82f6' },
                    { label: 'Të përfunduara', value: orders.filter(o => o.status === 'completed').length, icon: 'fa-check', color: '#10b981' },
                    { label: 'Anuluar', value: orders.filter(o => o.status === 'cancelled').length, icon: 'fa-xmark', color: '#ef4444' },
                    { label: 'Total €', value: '€' + sumPrice(orders).toFixed(2), icon: 'fa-euro-sign', color: '#f59e0b' }
                ])}

                ${orders.length ? renderOrdersTable(orders, 'History') : emptyBox('fa-clock', 'Nuk ka histori me këto filtra')}
            `;
        } catch (e) {
            console.error('❌ loadHistory:', e);
            el.innerHTML = errBox('Gabim: ' + e.message);
        }
    }

    function applyHistoryFilter() {
        filters.history.status = document.getElementById('hist-status')?.value || 'all';
        filters.history.from = document.getElementById('hist-from')?.value || '';
        filters.history.to = document.getElementById('hist-to')?.value || '';
        filters.history.company = document.getElementById('hist-company')?.value || '';
        loadTab('history');
    }
    function resetHistoryFilter() {
        filters.history = { status: 'all', from: '', to: '', company: '' };
        loadTab('history');
    }

    // ═══ PREORDERS ═══
    async function loadPreorders(el) {
        const db = window.TaxiFirebase?.db;
        if (!db) { el.innerHTML = errBox('Firebase nuk është gati'); return; }

        try {
            const f = filters.preorders;
            const snap = await db.collection('orders')
                .where('status', '==', 'preorder').limit(300).get()
                .catch(() => db.collection('orders').limit(300).get());

            let orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(o => o.status === 'preorder' || o.terminDateTime)
                .filter(o => inRange(o, f.from, f.to))
                .sort((a, b) => {
                    const ta = a.terminDateTime?.toDate ? a.terminDateTime.toDate().getTime() : new Date(a.terminDateTime || 0).getTime();
                    const tb = b.terminDateTime?.toDate ? b.terminDateTime.toDate().getTime() : new Date(b.terminDateTime || 0).getTime();
                    return ta - tb;
                });

            cache.preorders = orders;

            el.innerHTML = `
                <div class="filter-bar" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <input type="date" id="pre-from" class="input-sm" value="${f.from}" onchange="AdminTargets.applyPreFilter()">
                    <input type="date" id="pre-to" class="input-sm" value="${f.to}" onchange="AdminTargets.applyPreFilter()">
                    <button class="btn-secondary" onclick="AdminTargets.resetPreFilter()"><i class="fa-solid fa-rotate"></i> Reset</button>
                    <button class="btn-secondary" onclick="AdminTargets.exportCSV('preorders')"><i class="fa-solid fa-download"></i> CSV</button>
                </div>

                ${renderStats([
                    { label: 'Preorders', value: orders.length, icon: 'fa-calendar-clock', color: '#8b5cf6' },
                    { label: 'Sot', value: orders.filter(o => dateStr(o.terminDateTime) === new Date().toISOString().slice(0, 10)).length, icon: 'fa-calendar-day', color: '#f59e0b' },
                    { label: 'Total €', value: '€' + sumPrice(orders).toFixed(2), icon: 'fa-euro-sign', color: '#10b981' }
                ])}

                ${orders.length ? renderOrdersTable(orders, 'Preorder') : emptyBox('fa-calendar-clock', 'Nuk ka preorders')}
            `;
        } catch (e) {
            console.error('❌ loadPreorders:', e);
            el.innerHTML = errBox('Gabim: ' + e.message);
        }
    }
    function applyPreFilter() {
        filters.preorders.from = document.getElementById('pre-from')?.value || '';
        filters.preorders.to = document.getElementById('pre-to')?.value || '';
        loadTab('preorders');
    }
    function resetPreFilter() {
        filters.preorders = { from: '', to: '' };
        loadTab('preorders');
    }

    // ═══ iPAY ═══
    async function loadIpay(el) {
        const db = window.TaxiFirebase?.db;
        if (!db) { el.innerHTML = errBox('Firebase nuk është gati'); return; }

        try {
            const f = filters.ipay;
            let orders = [];
            try {
                const snap = await db.collection('orders')
                    .where('paymentMethod', '==', 'ipay').limit(300).get();
                orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {
                const snap = await db.collection('orders').limit(300).get();
                orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter(o => o.paymentMethod === 'ipay' || o.paid === true);
            }

            orders = orders.filter(o => inRange(o, f.from, f.to));
            cache.ipay = orders;

            const total = sumPrice(orders);

            el.innerHTML = `
                <div class="filter-bar" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <input type="date" id="ipay-from" class="input-sm" value="${f.from}" onchange="AdminTargets.applyIpayFilter()">
                    <input type="date" id="ipay-to" class="input-sm" value="${f.to}" onchange="AdminTargets.applyIpayFilter()">
                    <button class="btn-secondary" onclick="AdminTargets.resetIpayFilter()"><i class="fa-solid fa-rotate"></i> Reset</button>
                    <button class="btn-secondary" onclick="AdminTargets.exportCSV('ipay')"><i class="fa-solid fa-download"></i> CSV</button>
                </div>

                ${renderStats([
                    { label: 'Transaksione', value: orders.length, icon: 'fa-credit-card', color: '#06b6d4' },
                    { label: 'Total €', value: '€' + total.toFixed(2), icon: 'fa-euro-sign', color: '#10b981' },
                    { label: 'Mesatare €', value: orders.length ? '€' + (total / orders.length).toFixed(2) : '€0.00', icon: 'fa-chart-line', color: '#f59e0b' }
                ])}

                ${orders.length ? renderOrdersTable(orders, 'iPay') : emptyBox('fa-credit-card', 'Nuk ka porosi iPay')}
            `;
        } catch (e) {
            console.error('❌ loadIpay:', e);
            el.innerHTML = errBox('Gabim: ' + e.message);
        }
    }
    function applyIpayFilter() {
        filters.ipay.from = document.getElementById('ipay-from')?.value || '';
        filters.ipay.to = document.getElementById('ipay-to')?.value || '';
        loadTab('ipay');
    }
    function resetIpayFilter() {
        filters.ipay = { from: '', to: '' };
        loadTab('ipay');
    }

    // ═══ MOBILE ═══
    async function loadMobile(el) {
        const db = window.TaxiFirebase?.db;
        if (!db) { el.innerHTML = errBox('Firebase nuk është gati'); return; }

        try {
            const f = filters.mobile;
            let orders = [];
            try {
                const snap = await db.collection('orders')
                    .where('source', '==', 'mobile_app').limit(300).get();
                orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {
                const snap = await db.collection('orders').limit(300).get();
                orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter(o => o.source === 'mobile_app' || o.source === 'mobile');
            }

            orders = orders.filter(o => inRange(o, f.from, f.to));
            cache.mobile = orders;

            let users = [];
            try {
                const us = await db.collection('mobile_users').limit(500).get();
                users = us.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {}

            el.innerHTML = `
                <div class="filter-bar" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <input type="date" id="mob-from" class="input-sm" value="${f.from}" onchange="AdminTargets.applyMobileFilter()">
                    <input type="date" id="mob-to" class="input-sm" value="${f.to}" onchange="AdminTargets.applyMobileFilter()">
                    <button class="btn-secondary" onclick="AdminTargets.resetMobileFilter()"><i class="fa-solid fa-rotate"></i> Reset</button>
                    <button class="btn-secondary" onclick="AdminTargets.exportCSV('mobile')"><i class="fa-solid fa-download"></i> CSV</button>
                </div>

                ${renderStats([
                    { label: 'Porosi mobile', value: orders.length, icon: 'fa-mobile-screen', color: '#8b5cf6' },
                    { label: 'Përdorues', value: users.length, icon: 'fa-users', color: '#3b82f6' },
                    { label: 'Total €', value: '€' + sumPrice(orders).toFixed(2), icon: 'fa-euro-sign', color: '#10b981' }
                ])}

                ${orders.length ? renderOrdersTable(orders, 'Mobile') : emptyBox('fa-mobile-screen', 'Nuk ka porosi mobile')}
            `;
        } catch (e) {
            console.error('❌ loadMobile:', e);
            el.innerHTML = errBox('Gabim: ' + e.message);
        }
    }
    function applyMobileFilter() {
        filters.mobile.from = document.getElementById('mob-from')?.value || '';
        filters.mobile.to = document.getElementById('mob-to')?.value || '';
        loadTab('mobile');
    }
    function resetMobileFilter() {
        filters.mobile = { from: '', to: '' };
        loadTab('mobile');
    }

    // ═══ MODAL: TARGET I RE ═══
    function openTargetModal() {
        const root = document.getElementById('targets-modal-root');
        if (!root) return;
        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminTargets.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:480px;">
                    <h3><i class="fa-solid fa-bullseye"></i> Target i re</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                        <label>Kompania
                            <input type="text" id="tgt-company" class="input" placeholder="p.sh. Albi Trans">
                        </label>
                        <label>Targeti (numri i porosive)
                            <input type="number" id="tgt-target" class="input" min="1" value="50">
                        </label>
                        <label>Data
                            <input type="date" id="tgt-date" class="input" value="${new Date().toISOString().slice(0,10)}">
                        </label>
                        <label>Shënime
                            <textarea id="tgt-notes" class="input" rows="2"></textarea>
                        </label>
                        <div style="display:flex;gap:8px;justify-content:flex-end;">
                            <button class="btn-secondary" onclick="AdminTargets.closeModal()">Anulo</button>
                            <button class="btn-primary" onclick="AdminTargets.saveTarget()"><i class="fa-solid fa-save"></i> Ruaj</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    function closeModal(e) {
        if (e && e.target && e.target.className !== 'modal-overlay') return;
        const root = document.getElementById('targets-modal-root');
        if (root) root.innerHTML = '';
    }

    async function saveTarget() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');

        const company = document.getElementById('tgt-company')?.value?.trim();
        const target = parseInt(document.getElementById('tgt-target')?.value || '0', 10);
        const date = document.getElementById('tgt-date')?.value;
        const notes = document.getElementById('tgt-notes')?.value?.trim() || '';

        if (!company) return alert('Shkruaj kompaninë');
        if (!target || target < 1) return alert('Targeti duhet > 0');

        try {
            await db.collection('targets').add({
                company, target, date, notes,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });
            closeModal();
            alert('✅ Target u ruajt');
            loadTab('company');
        } catch (e) {
            console.error('❌ saveTarget:', e);
            alert('Gabim: ' + e.message);
        }
    }

    async function deleteTarget(id) {
        if (!confirm('Fshij target-in?')) return;
        const db = window.TaxiFirebase?.db;
        try {
            await db.collection('targets').doc(id).delete();
            loadTab('company');
        } catch (e) {
            alert('Gabim: ' + e.message);
        }
    }

    // ═══ EXPORT CSV ═══
    function exportCSV(which) {
        const data = cache[which] || [];
        if (!data.length) return alert('Nuk ka të dhëna');

        const headers = ['Data', 'Ora', 'Statusi', 'Telefon', 'Klienti', 'Marrja', 'Destinacioni', 'Vetura', 'Çmimi'];
        const rows = data.map(o => [
            o.createdDateStr || '',
            o.createdTimeStr || o.time || '',
            STATUS_LBL[o.status] || o.status || '',
            o.phone || '',
            o.name || '',
            (o.pickup || '').replace(/,/g, ' '),
            (o.destination || '').replace(/,/g, ' '),
            o.vehicleNum || '',
            o.price || ''
        ]);

        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `targets-${which}-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ═══ RENDER STATS ═══
    function renderStats(items) {
        return `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px;">
                ${items.map(s => `
                    <div style="background:#1e293b;border-radius:12px;padding:16px;border-left:4px solid ${s.color};">
                        <div style="display:flex;align-items:center;gap:10px;color:#94a3b8;font-size:11px;text-transform:uppercase;font-weight:700;">
                            <i class="fa-solid ${s.icon}" style="color:${s.color};"></i> ${s.label}
                        </div>
                        <div style="font-size:24px;font-weight:800;color:#f1f5f9;margin-top:8px;">${s.value}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ═══ RENDER TABLE ═══
    function renderOrdersTable(orders, label) {
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
                                <td><span class="status-badge ${o.status || ''}">${STATUS_LBL[o.status] || o.status || '—'}</span></td>
                                <td class="phone">${o.phone || '—'}</td>
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

    function emptyBox(icon, msg) {
        return `<div class="empty-state"><i class="fa-solid ${icon}"></i><p>${msg}</p></div>`;
    }
    function errBox(msg) {
        return `<div class="empty-state" style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i><p>${msg}</p></div>`;
    }

    return {
        init, load, switchTab,
        applyHistoryFilter, resetHistoryFilter,
        applyPreFilter, resetPreFilter,
        applyIpayFilter, resetIpayFilter,
        applyMobileFilter, resetMobileFilter,
        openTargetModal, closeModal, saveTarget, deleteTarget,
        exportCSV
    };
})();

console.log('✅ admin/targets.js ngarkuar');
