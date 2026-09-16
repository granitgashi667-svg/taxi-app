'use strict';

window.AdminMobileUsers = (() => {
    let usersCache = [];
    let filters = { search: '', status: 'all', sort: 'recent' };

    function init() { console.log('📱 AdminMobileUsers: Init...'); }
    async function load() { await renderPage(); await loadUsers(); }

    async function loadUsers() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            const snap = await db.collection('mobile_users').orderBy('createdAt', 'desc').limit(1000).get();
            usersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            const snap = await db.collection('mobile_users').limit(1000).get();
            usersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        renderStats();
        renderList();
    }

    function renderPage() {
        const el = document.querySelector('.admin-page[data-page="mobile-users"]');
        if (!el) return;
        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title"><i class="fa-solid fa-mobile-screen-button"></i>
                    <div><h2>Mobile Users</h2><p>Përdoruesit e aplikacionit mobil</p></div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-secondary" onclick="AdminMobileUsers.exportCsv()"><i class="fa-solid fa-download"></i> CSV</button>
                    <button class="btn-secondary" onclick="AdminMobileUsers.openBroadcast()"><i class="fa-solid fa-bullhorn"></i> Broadcast</button>
                    <button class="btn-primary" onclick="AdminMobileUsers.openModal()"><i class="fa-solid fa-plus"></i> Shto</button>
                </div>
            </div>

            <div id="mob-stats"></div>

            <div class="db-panel">
                <div class="db-panel-header"><i class="fa-solid fa-list"></i><h3>Përdoruesit</h3></div>
                <div class="db-panel-body">
                    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                        <input type="text" id="mob-search" class="input-sm" placeholder="🔍 Kërko emër / telefon / email..."
                            style="flex:1;min-width:200px;" value="${filters.search}"
                            oninput="AdminMobileUsers.applyFilters()">
                        <select id="mob-status" class="input-sm" onchange="AdminMobileUsers.applyFilters()">
                            <option value="all" ${filters.status === 'all' ? 'selected' : ''}>Të gjithë</option>
                            <option value="active" ${filters.status === 'active' ? 'selected' : ''}>Aktiv</option>
                            <option value="blocked" ${filters.status === 'blocked' ? 'selected' : ''}>Bllokuar</option>
                        </select>
                        <select id="mob-sort" class="input-sm" onchange="AdminMobileUsers.applyFilters()">
                            <option value="recent" ${filters.sort === 'recent' ? 'selected' : ''}>Më të rejat</option>
                            <option value="name" ${filters.sort === 'name' ? 'selected' : ''}>Emri</option>
                            <option value="orders" ${filters.sort === 'orders' ? 'selected' : ''}>Porosi</option>
                        </select>
                        <button class="btn-secondary" onclick="AdminMobileUsers.resetFilters()"><i class="fa-solid fa-rotate"></i></button>
                    </div>
                    <div id="mob-list"></div>
                </div>
            </div>

            <div id="mob-modal-root"></div>
        `;
    }

    function renderStats() {
        const el = document.getElementById('mob-stats');
        if (!el) return;
        const total = usersCache.length;
        const active = usersCache.filter(u => u.blocked !== true).length;
        const blocked = total - active;
        const withPush = usersCache.filter(u => u.fcmToken).length;
        const totalOrders = usersCache.reduce((s, u) => s + (u.ordersCount || 0), 0);
        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card blue"><div class="kpi-label"><i class="fa-solid fa-users"></i> Përdorues</div><div class="kpi-value blue">${total}</div><div class="kpi-sub">total</div></div>
                <div class="kpi-card green"><div class="kpi-label"><i class="fa-solid fa-check"></i> Aktiv</div><div class="kpi-value green">${active}</div><div class="kpi-sub">${blocked} bllokuar</div></div>
                <div class="kpi-card yellow"><div class="kpi-label"><i class="fa-solid fa-bell"></i> Push aktiv</div><div class="kpi-value yellow">${withPush}</div><div class="kpi-sub">kanë FCM</div></div>
                <div class="kpi-card pink"><div class="kpi-label"><i class="fa-solid fa-list"></i> Porosi totale</div><div class="kpi-value pink">${totalOrders}</div><div class="kpi-sub">nga mobile</div></div>
            </div>
        `;
    }

    function renderList() {
        const el = document.getElementById('mob-list');
        if (!el) return;
        let list = [...usersCache];
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(u =>
                (u.name || '').toLowerCase().includes(q) ||
                (u.phone || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
            );
        }
        if (filters.status === 'active') list = list.filter(u => u.blocked !== true);
        if (filters.status === 'blocked') list = list.filter(u => u.blocked === true);
        if (filters.sort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        else if (filters.sort === 'orders') list.sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0));
        else list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (!list.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-mobile-screen"></i><p>Nuk ka përdorues</p></div>';
            return;
        }

        el.innerHTML = `
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Emri</th><th>Telefon</th><th>Email</th><th>Porosi</th><th>Push</th><th>Statusi</th><th>Regjistruar</th><th>Veprime</th></tr></thead>
                    <tbody>
                        ${list.map(u => `
                            <tr>
                                <td><strong>${u.name || 'Anonim'}</strong></td>
                                <td class="phone">${u.phone || '—'}</td>
                                <td style="font-size:11px;">${u.email || '—'}</td>
                                <td class="mono">${u.ordersCount || 0}</td>
                                <td>${u.fcmToken ? '🔔' : '—'}</td>
                                <td><span class="status-badge ${u.blocked !== true ? 'completed' : 'cancelled'}">${u.blocked !== true ? 'Aktiv' : 'Bllokuar'}</span></td>
                                <td class="mono" style="font-size:10px;">${formatDate(u.createdAt)}</td>
                                <td>
                                    <button class="btn-icon" title="Dërgo push" onclick="AdminMobileUsers.openPush('${u.id}')"><i class="fa-solid fa-bell"></i></button>
                                    <button class="btn-icon ${u.blocked ? '' : 'danger'}" title="${u.blocked ? 'Zhblloko' : 'Blloko'}" onclick="AdminMobileUsers.toggleBlock('${u.id}')">
                                        <i class="fa-solid fa-${u.blocked ? 'unlock' : 'ban'}"></i>
                                    </button>
                                    <button class="btn-icon danger" title="Fshij" onclick="AdminMobileUsers.deleteUser('${u.id}')"><i class="fa-solid fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function applyFilters() {
        filters.search = document.getElementById('mob-search')?.value || '';
        filters.status = document.getElementById('mob-status')?.value || 'all';
        filters.sort = document.getElementById('mob-sort')?.value || 'recent';
        renderList();
    }
    function resetFilters() {
        filters = { search: '', status: 'all', sort: 'recent' };
        renderPage();
    }

    function openModal() {
        let root = document.getElementById('mob-modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'mob-modal-root'; document.body.appendChild(root); }
        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminMobileUsers.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:480px;">
                    <h3><i class="fa-solid fa-mobile-screen"></i> Përdorues i re</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                        <label style="font-size:11px;color:#94a3b8;">Emri *<input type="text" id="mu-name" class="input" style="width:100%;margin-top:4px;"></label>
                        <label style="font-size:11px;color:#94a3b8;">Telefoni *<input type="text" id="mu-phone" class="input" placeholder="+383..." style="width:100%;margin-top:4px;"></label>
                        <label style="font-size:11px;color:#94a3b8;">Email<input type="email" id="mu-email" class="input" style="width:100%;margin-top:4px;"></label>
                        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                            <button class="btn-secondary" onclick="AdminMobileUsers.closeModal()">Anulo</button>
                            <button class="btn-primary" onclick="AdminMobileUsers.save()"><i class="fa-solid fa-save"></i> Ruaj</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function save() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');
        const data = {
            name: document.getElementById('mu-name')?.value?.trim(),
            phone: document.getElementById('mu-phone')?.value?.trim(),
            email: document.getElementById('mu-email')?.value?.trim() || '',
            blocked: false,
            ordersCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!data.name || !data.phone) return alert('Plotëso emrin dhe telefonin');
        try {
            await db.collection('mobile_users').add(data);
            closeModal();
            if (window.AdminApp?.showToast) window.AdminApp.showToast('success', '✅ U krijua', data.name);
            await loadUsers();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    function openPush(id) {
        const u = usersCache.find(x => x.id === id);
        if (!u) return;
        if (!u.fcmToken) return alert('Ky përdorues nuk ka FCM token');

        let root = document.getElementById('mob-modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'mob-modal-root'; document.body.appendChild(root); }
        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminMobileUsers.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:480px;">
                    <h3><i class="fa-solid fa-bell"></i> Push — ${u.name}</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                        <label style="font-size:11px;color:#94a3b8;">Titulli *<input type="text" id="push-title" class="input" value="TaxiApp" style="width:100%;margin-top:4px;"></label>
                        <label style="font-size:11px;color:#94a3b8;">Mesazhi *<textarea id="push-body" class="input" rows="3" style="width:100%;margin-top:4px;"></textarea></label>
                        <div style="display:flex;gap:8px;justify-content:flex-end;">
                            <button class="btn-secondary" onclick="AdminMobileUsers.closeModal()">Anulo</button>
                            <button class="btn-primary" onclick="AdminMobileUsers.sendPush('${id}')"><i class="fa-solid fa-paper-plane"></i> Dërgo</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function sendPush(id) {
        const db = window.TaxiFirebase?.db;
        const u = usersCache.find(x => x.id === id);
        if (!db || !u) return;
        const title = document.getElementById('push-title')?.value?.trim();
        const body = document.getElementById('push-body')?.value?.trim();
        if (!title || !body) return alert('Plotëso titullin dhe mesazhin');
        try {
            await db.collection('push_queue').add({
                to: u.fcmToken, userId: id, title, body, type: 'manual',
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });
            closeModal();
            if (window.AdminApp?.showToast) window.AdminApp.showToast('success', '🔔 Push u radhit', u.name);
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    function openBroadcast() {
        let root = document.getElementById('mob-modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'mob-modal-root'; document.body.appendChild(root); }
        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminMobileUsers.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:520px;">
                    <h3><i class="fa-solid fa-bullhorn"></i> Broadcast</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                        <label style="font-size:11px;color:#94a3b8;">Titulli *<input type="text" id="bc-title" class="input" value="TaxiApp" style="width:100%;margin-top:4px;"></label>
                        <label style="font-size:11px;color:#94a3b8;">Mesazhi *<textarea id="bc-body" class="input" rows="3" style="width:100%;margin-top:4px;"></textarea></label>
                        <label style="font-size:11px;color:#94a3b8;">Grupi
                            <select id="bc-group" class="input" style="width:100%;margin-top:4px;">
                                <option value="all">Të gjithë</option>
                                <option value="active">Vetëm aktivë</option>
                                <option value="with_push">Vetëm me push</option>
                            </select>
                        </label>
                        <div style="display:flex;gap:8px;justify-content:flex-end;">
                            <button class="btn-secondary" onclick="AdminMobileUsers.closeModal()">Anulo</button>
                            <button class="btn-primary" onclick="AdminMobileUsers.sendBroadcast()"><i class="fa-solid fa-paper-plane"></i> Dërgo</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function sendBroadcast() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        const title = document.getElementById('bc-title')?.value?.trim();
        const body = document.getElementById('bc-body')?.value?.trim();
        const group = document.getElementById('bc-group')?.value;
        if (!title || !body) return alert('Plotëso');

        let targets = usersCache;
        if (group === 'active') targets = targets.filter(u => u.blocked !== true);
        if (group === 'with_push') targets = targets.filter(u => u.fcmToken);

        if (!targets.length) return alert('Nuk ka target');
        if (!confirm(`Dërgo broadcast tek ${targets.length} përdorues?`)) return;

        try {
            const batch = db.batch();
            targets.forEach(u => {
                const ref = db.collection('push_queue').doc();
                batch.set(ref, {
                    to: u.fcmToken || '', userId: u.id, title, body, type: 'broadcast',
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
                });
            });
            await batch.commit();
            closeModal();
            if (window.AdminApp?.showToast) window.AdminApp.showToast('success', `📢 U radhit për ${targets.length}`, '');
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    async function toggleBlock(id) {
        const u = usersCache.find(x => x.id === id);
        if (!u) return;
        try {
            await window.TaxiFirebase.db.collection('mobile_users').doc(id).update({
                blocked: u.blocked !== true
            });
            await loadUsers();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    async function deleteUser(id) {
        const u = usersCache.find(x => x.id === id);
        if (!u || !confirm(`Fshij ${u.name}?`)) return;
        try {
            await window.TaxiFirebase.db.collection('mobile_users').doc(id).delete();
            await loadUsers();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    function exportCsv() {
        if (!usersCache.length) return;
        const rows = usersCache.map(u => ({
            'Emri': u.name || '', 'Telefon': u.phone || '', 'Email': u.email || '',
            'Porosi': u.ordersCount || 0,
            'Push': u.fcmToken ? 'Po' : 'Jo',
            'Statusi': u.blocked !== true ? 'Aktiv' : 'Bllokuar',
            'Regjistruar': formatDate(u.createdAt)
        }));
        if (window.TaxiExport) window.TaxiExport.toCsv(rows, `mobile-users-${Date.now()}.csv`);
    }

    function closeModal(e) {
        if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
        const root = document.getElementById('mob-modal-root');
        if (root) root.innerHTML = '';
    }

    function formatDate(ts) {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    return {
        init, load, applyFilters, resetFilters,
        openModal, save,
        openPush, sendPush, openBroadcast, sendBroadcast,
        toggleBlock, deleteUser, exportCsv, closeModal
    };
})();
console.log('✅ admin/mobile-users.js ngarkuar');
