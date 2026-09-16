'use strict';

window.AdminFixedRoutes = (() => {
    let routesCache = [];
    let filters = { search: '', active: 'all' };

    function init() { console.log('🛣️ AdminFixedRoutes: Init...'); }
    async function load() { await renderPage(); await loadRoutes(); }

    async function loadRoutes() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            const snap = await db.collection('fixed_price_routes').orderBy('createdAt', 'desc').limit(500).get();
            routesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            const snap = await db.collection('fixed_price_routes').limit(500).get();
            routesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        renderList();
        renderStats();
    }

    function renderPage() {
        const el = document.querySelector('.admin-page[data-page="fixed-routes"]');
        if (!el) return;
        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title"><i class="fa-solid fa-route"></i><div><h2>Fixed Price Routes</h2><p>Rrugë me çmim fiks</p></div></div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-secondary" onclick="AdminFixedRoutes.exportCsv()"><i class="fa-solid fa-download"></i> CSV</button>
                    <button class="btn-primary" onclick="AdminFixedRoutes.openModal()"><i class="fa-solid fa-plus"></i> Rrugë e re</button>
                </div>
            </div>
            <div id="frx-stats"></div>
            <div class="db-panel">
                <div class="db-panel-header"><i class="fa-solid fa-list"></i><h3>Rrugët</h3></div>
                <div class="db-panel-body">
                    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                        <input type="text" id="frx-search" class="input-sm" placeholder="🔍 Kërko rrugë..." style="flex:1;min-width:200px;"
                            value="${filters.search}" oninput="AdminFixedRoutes.applyFilters()">
                        <select id="frx-active" class="input-sm" onchange="AdminFixedRoutes.applyFilters()">
                            <option value="all" ${filters.active === 'all' ? 'selected' : ''}>Të gjitha</option>
                            <option value="active" ${filters.active === 'active' ? 'selected' : ''}>Aktive</option>
                            <option value="inactive" ${filters.active === 'inactive' ? 'selected' : ''}>Joaktive</option>
                        </select>
                        <button class="btn-secondary" onclick="AdminFixedRoutes.resetFilters()"><i class="fa-solid fa-rotate"></i></button>
                    </div>
                    <div id="frx-list"></div>
                </div>
            </div>
            <div id="frx-modal-root"></div>
        `;
    }

    function renderStats() {
        const el = document.getElementById('frx-stats');
        if (!el) return;
        const total = routesCache.length;
        const active = routesCache.filter(r => r.active !== false).length;
        const avgPrice = total ? routesCache.reduce((s, r) => s + (parseFloat(r.price) || 0), 0) / total : 0;
        const maxPrice = total ? Math.max(...routesCache.map(r => parseFloat(r.price) || 0)) : 0;
        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card blue"><div class="kpi-label"><i class="fa-solid fa-route"></i> Rrugë totale</div><div class="kpi-value blue">${total}</div><div class="kpi-sub">${active} aktive</div></div>
                <div class="kpi-card green"><div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Çmimi mesatar</div><div class="kpi-value green">€${avgPrice.toFixed(2)}</div><div class="kpi-sub">për rrugë</div></div>
                <div class="kpi-card yellow"><div class="kpi-label"><i class="fa-solid fa-arrow-up"></i> Çmimi max</div><div class="kpi-value yellow">€${maxPrice.toFixed(2)}</div><div class="kpi-sub">më i shtrenjti</div></div>
                <div class="kpi-card pink"><div class="kpi-label"><i class="fa-solid fa-clock"></i> Kohë mesatare</div><div class="kpi-value pink">${total ? Math.round(routesCache.reduce((s, r) => s + (parseFloat(r.duration) || 0), 0) / total) : 0} min</div><div class="kpi-sub">kohëzgjatja</div></div>
            </div>
        `;
    }

    function renderList() {
        const el = document.getElementById('frx-list');
        if (!el) return;
        let list = [...routesCache];
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(r =>
                (r.from || '').toLowerCase().includes(q) ||
                (r.to || '').toLowerCase().includes(q) ||
                (r.name || '').toLowerCase().includes(q)
            );
        }
        if (filters.active === 'active') list = list.filter(r => r.active !== false);
        if (filters.active === 'inactive') list = list.filter(r => r.active === false);

        if (!list.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-route"></i><p>Nuk ka rrugë</p></div>';
            return;
        }

        el.innerHTML = `
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Emri</th><th>Nga</th><th>Deri</th><th>Distanca</th><th>Kohë</th><th>Çmimi €</th><th>Statusi</th><th>Veprime</th></tr></thead>
                    <tbody>
                        ${list.map(r => `
                            <tr>
                                <td><strong>${r.name || '—'}</strong></td>
                                <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.from || '—'}</td>
                                <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.to || '—'}</td>
                                <td class="mono">${r.distance ? r.distance + ' km' : '—'}</td>
                                <td class="mono">${r.duration ? r.duration + ' min' : '—'}</td>
                                <td class="green mono" style="font-weight:800;">€${(parseFloat(r.price) || 0).toFixed(2)}</td>
                                <td><span class="status-badge ${r.active !== false ? 'completed' : 'cancelled'}">${r.active !== false ? 'Aktiv' : 'Joaktiv'}</span></td>
                                <td>
                                    <button class="btn-icon" onclick="AdminFixedRoutes.openModal('${r.id}')"><i class="fa-solid fa-pen"></i></button>
                                    <button class="btn-icon danger" onclick="AdminFixedRoutes.deleteRoute('${r.id}')"><i class="fa-solid fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function applyFilters() {
        filters.search = document.getElementById('frx-search')?.value || '';
        filters.active = document.getElementById('frx-active')?.value || 'all';
        renderList();
    }
    function resetFilters() {
        filters = { search: '', active: 'all' };
        renderPage();
    }

    function openModal(id) {
        const r = id ? routesCache.find(x => x.id === id) : null;
        let root = document.getElementById('frx-modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'frx-modal-root'; document.body.appendChild(root); }
        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminFixedRoutes.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:520px;">
                    <h3><i class="fa-solid fa-route"></i> ${r ? 'Ndrysho' : 'Rrugë e re'}</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                        <label style="font-size:11px;color:#94a3b8;">Emri<input type="text" id="frx-name" class="input" value="${r?.name || ''}" style="width:100%;margin-top:4px;"></label>
                        <label style="font-size:11px;color:#94a3b8;">Nga<input type="text" id="frx-from" class="input" value="${r?.from || ''}" placeholder="p.sh. Aeroporti" style="width:100%;margin-top:4px;"></label>
                        <label style="font-size:11px;color:#94a3b8;">Deri<input type="text" id="frx-to" class="input" value="${r?.to || ''}" placeholder="p.sh. Qendra" style="width:100%;margin-top:4px;"></label>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                            <label style="font-size:11px;color:#94a3b8;">Distanca km<input type="number" id="frx-dist" class="input" step="0.1" value="${r?.distance || 0}" style="width:100%;margin-top:4px;"></label>
                            <label style="font-size:11px;color:#94a3b8;">Kohë min<input type="number" id="frx-dur" class="input" value="${r?.duration || 0}" style="width:100%;margin-top:4px;"></label>
                            <label style="font-size:11px;color:#94a3b8;">Çmimi € *<input type="number" id="frx-price" class="input" step="0.01" value="${r?.price || 0}" style="width:100%;margin-top:4px;"></label>
                        </div>
                        <label style="font-size:11px;color:#94a3b8;">Statusi<select id="frx-status" class="input" style="width:100%;margin-top:4px;">
                            <option value="true" ${r?.active !== false ? 'selected' : ''}>Aktiv</option>
                            <option value="false" ${r?.active === false ? 'selected' : ''}>Joaktiv</option>
                        </select></label>
                        <label style="font-size:11px;color:#94a3b8;">Shënime<textarea id="frx-notes" class="input" rows="2" style="width:100%;margin-top:4px;">${r?.notes || ''}</textarea></label>
                        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                            <button class="btn-secondary" onclick="AdminFixedRoutes.closeModal()">Anulo</button>
                            <button class="btn-primary" onclick="AdminFixedRoutes.save('${id || ''}')"><i class="fa-solid fa-save"></i> Ruaj</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function save(id) {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');
        const data = {
            name: document.getElementById('frx-name')?.value?.trim() || '',
            from: document.getElementById('frx-from')?.value?.trim() || '',
            to: document.getElementById('frx-to')?.value?.trim() || '',
            distance: parseFloat(document.getElementById('frx-dist')?.value || '0'),
            duration: parseFloat(document.getElementById('frx-dur')?.value || '0'),
            price: parseFloat(document.getElementById('frx-price')?.value || '0'),
            active: document.getElementById('frx-status')?.value === 'true',
            notes: document.getElementById('frx-notes')?.value?.trim() || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!data.from || !data.to) return alert('Plotëso nga/deri');
        if (!data.price || data.price <= 0) return alert('Çmimi i pavlefshëm');
        try {
            if (id) await db.collection('fixed_price_routes').doc(id).update(data);
            else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                data.createdBy = window.TaxiFirebase?.auth?.currentUser?.email || 'admin';
                await db.collection('fixed_price_routes').add(data);
            }
            closeModal();
            if (window.AdminApp?.showToast) window.AdminApp.showToast('success', id ? '✅ U përditësua' : '✅ U krijua', data.name);
            await loadRoutes();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    async function deleteRoute(id) {
        const r = routesCache.find(x => x.id === id);
        if (!r || !confirm(`Fshij "${r.name || r.from + ' → ' + r.to}"?`)) return;
        try {
            await window.TaxiFirebase.db.collection('fixed_price_routes').doc(id).delete();
            await loadRoutes();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    function exportCsv() {
        if (!routesCache.length) return;
        const rows = routesCache.map(r => ({
            'Emri': r.name || '', 'Nga': r.from || '', 'Deri': r.to || '',
            'Distanca km': r.distance || 0, 'Kohë min': r.duration || 0,
            'Çmimi €': r.price || 0, 'Aktiv': r.active !== false ? 'Po' : 'Jo'
        }));
        if (window.TaxiExport) window.TaxiExport.toCsv(rows, `fixed-routes-${Date.now()}.csv`);
    }

    function closeModal(e) {
        if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
        const root = document.getElementById('frx-modal-root');
        if (root) root.innerHTML = '';
    }

    return { init, load, applyFilters, resetFilters, openModal, save, deleteRoute, exportCsv, closeModal };
})();
console.log('✅ admin/fixed-routes.js ngarkuar');
