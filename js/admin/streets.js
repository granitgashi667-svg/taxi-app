'use strict';

window.AdminStreets = (() => {
    let streetsCache = [];
    let standsCache = [];
    let currentTab = 'streets';
    let filters = { search: '' };

    function init() { console.log('🛣️ AdminStreets: Init...'); }
    async function load() { await renderPage(); await loadData(); }

    async function loadData() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            const [s1, s2] = await Promise.all([
                db.collection('streets').limit(1000).get().catch(() => ({ docs: [] })),
                db.collection('stands').limit(1000).get().catch(() => ({ docs: [] }))
            ]);
            streetsCache = s1.docs.map(d => ({ id: d.id, ...d.data() }));
            standsCache = s2.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) { console.error(e); }
        renderStats();
        renderList();
    }

    function renderPage() {
        const el = document.querySelector('.admin-page[data-page="streets"]');
        if (!el) return;
        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title"><i class="fa-solid fa-road"></i>
                    <div><h2>Streets & Stands</h2><p>Rrugët dhe stendat e taksi</p></div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-secondary" onclick="AdminStreets.exportCsv()"><i class="fa-solid fa-download"></i> CSV</button>
                    <button class="btn-primary" onclick="AdminStreets.openModal()"><i class="fa-solid fa-plus"></i> Shto</button>
                </div>
            </div>

            <div class="filter-bar" style="margin-bottom:20px;">
                <button class="filter-btn ${currentTab === 'streets' ? 'active' : ''}" onclick="AdminStreets.switchTab('streets')">
                    <i class="fa-solid fa-road"></i> Rrugët (${streetsCache.length})
                </button>
                <button class="filter-btn ${currentTab === 'stands' ? 'active' : ''}" onclick="AdminStreets.switchTab('stands')">
                    <i class="fa-solid fa-map-pin"></i> Stendat (${standsCache.length})
                </button>
            </div>

            <div id="str-stats"></div>

            <div class="db-panel">
                <div class="db-panel-header"><i class="fa-solid fa-list"></i><h3 id="str-list-title">Lista</h3></div>
                <div class="db-panel-body">
                    <input type="text" id="str-search" class="input-sm" placeholder="🔍 Kërko..."
                        style="width:100%;margin-bottom:16px;" value="${filters.search}"
                        oninput="AdminStreets.applyFilters()">
                    <div id="str-list"></div>
                </div>
            </div>

            <div id="str-modal-root"></div>
        `;
    }

    function switchTab(tab) { currentTab = tab; renderPage(); renderStats(); renderList(); }

    function renderStats() {
        const el = document.getElementById('str-stats');
        if (!el) return;
        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card blue"><div class="kpi-label"><i class="fa-solid fa-road"></i> Rrugë</div><div class="kpi-value blue">${streetsCache.length}</div><div class="kpi-sub">total</div></div>
                <div class="kpi-card green"><div class="kpi-label"><i class="fa-solid fa-map-pin"></i> Stenda</div><div class="kpi-value green">${standsCache.length}</div><div class="kpi-sub">total</div></div>
                <div class="kpi-card yellow"><div class="kpi-label"><i class="fa-solid fa-check"></i> Aktive</div><div class="kpi-value yellow">${streetsCache.filter(s => s.active !== false).length + standsCache.filter(s => s.active !== false).length}</div><div class="kpi-sub">të dyja</div></div>
                <div class="kpi-card pink"><div class="kpi-label"><i class="fa-solid fa-xmark"></i> Joaktive</div><div class="kpi-value pink">${streetsCache.filter(s => s.active === false).length + standsCache.filter(s => s.active === false).length}</div><div class="kpi-sub">të dyja</div></div>
            </div>
        `;
    }

    function renderList() {
        const el = document.getElementById('str-list');
        const titleEl = document.getElementById('str-list-title');
        if (!el) return;
        const isStreet = currentTab === 'streets';
        if (titleEl) titleEl.textContent = isStreet ? 'Rrugët' : 'Stendat';

        let list = isStreet ? [...streetsCache] : [...standsCache];
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(x => (x.name || '').toLowerCase().includes(q) || (x.zone || '').toLowerCase().includes(q));
        }

        if (!list.length) {
            el.innerHTML = `<div class="empty-state"><i class="fa-solid ${isStreet ? 'fa-road' : 'fa-map-pin'}"></i><p>Nuk ka ${isStreet ? 'rrugë' : 'stenda'}</p></div>`;
            return;
        }

        el.innerHTML = `
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Emri</th><th>Zona</th><th>Koordinata</th>${isStreet ? '<th>Gjatësi</th>' : '<th>Kapaciteti</th>'}<th>Statusi</th><th>Veprime</th></tr></thead>
                    <tbody>
                        ${list.map(x => `
                            <tr>
                                <td><strong>${x.name || '—'}</strong></td>
                                <td>${x.zone || '—'}</td>
                                <td class="mono" style="font-size:10px;">${x.lat ? x.lat.toFixed(4) + ', ' + x.lng.toFixed(4) : '—'}</td>
                                <td class="mono">${isStreet ? (x.length || 0) + ' m' : (x.capacity || 0)}</td>
                                <td><span class="status-badge ${x.active !== false ? 'completed' : 'cancelled'}">${x.active !== false ? 'Aktiv' : 'Joaktiv'}</span></td>
                                <td>
                                    <button class="btn-icon" onclick="AdminStreets.openModal('${x.id}')"><i class="fa-solid fa-pen"></i></button>
                                    <button class="btn-icon danger" onclick="AdminStreets.deleteItem('${x.id}')"><i class="fa-solid fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function applyFilters() {
        filters.search = document.getElementById('str-search')?.value || '';
        renderList();
    }

    function openModal(id) {
        const isStreet = currentTab === 'streets';
        const coll = isStreet ? streetsCache : standsCache;
        const x = id ? coll.find(i => i.id === id) : null;

        let root = document.getElementById('str-modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'str-modal-root'; document.body.appendChild(root); }
        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminStreets.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:480px;">
                    <h3><i class="fa-solid ${isStreet ? 'fa-road' : 'fa-map-pin'}"></i> ${x ? 'Ndrysho' : 'Shto'} ${isStreet ? 'rrugë' : 'stendë'}</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                        <label style="font-size:11px;color:#94a3b8;">Emri *<input type="text" id="str-name" class="input" value="${x?.name || ''}" style="width:100%;margin-top:4px;"></label>
                        <label style="font-size:11px;color:#94a3b8;">Zona<input type="text" id="str-zone" class="input" value="${x?.zone || ''}" style="width:100%;margin-top:4px;"></label>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                            <label style="font-size:11px;color:#94a3b8;">Latitude<input type="number" id="str-lat" class="input" step="0.0001" value="${x?.lat || 42.6629}" style="width:100%;margin-top:4px;"></label>
                            <label style="font-size:11px;color:#94a3b8;">Longitude<input type="number" id="str-lng" class="input" step="0.0001" value="${x?.lng || 21.1655}" style="width:100%;margin-top:4px;"></label>
                        </div>
                        ${isStreet
                            ? `<label style="font-size:11px;color:#94a3b8;">Gjatësia (m)<input type="number" id="str-length" class="input" value="${x?.length || 0}" style="width:100%;margin-top:4px;"></label>`
                            : `<label style="font-size:11px;color:#94a3b8;">Kapaciteti<input type="number" id="str-capacity" class="input" value="${x?.capacity || 0}" style="width:100%;margin-top:4px;"></label>`
                        }
                        <label style="font-size:11px;color:#94a3b8;">Statusi<select id="str-status" class="input" style="width:100%;margin-top:4px;">
                            <option value="true" ${x?.active !== false ? 'selected' : ''}>Aktiv</option>
                            <option value="false" ${x?.active === false ? 'selected' : ''}>Joaktiv</option>
                        </select></label>
                        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                            <button class="btn-secondary" onclick="AdminStreets.closeModal()">Anulo</button>
                            <button class="btn-primary" onclick="AdminStreets.save('${id || ''}')"><i class="fa-solid fa-save"></i> Ruaj</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function save(id) {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');
        const isStreet = currentTab === 'streets';
        const data = {
            name: document.getElementById('str-name')?.value?.trim() || '',
            zone: document.getElementById('str-zone')?.value?.trim() || '',
            lat: parseFloat(document.getElementById('str-lat')?.value || '0'),
            lng: parseFloat(document.getElementById('str-lng')?.value || '0'),
            active: document.getElementById('str-status')?.value === 'true',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (isStreet) data.length = parseFloat(document.getElementById('str-length')?.value || '0');
        else data.capacity = parseInt(document.getElementById('str-capacity')?.value || '0');
        if (!data.name) return alert('Shkruaj emrin');

        const coll = isStreet ? 'streets' : 'stands';
        try {
            if (id) await db.collection(coll).doc(id).update(data);
            else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection(coll).add(data);
            }
            closeModal();
            if (window.AdminApp?.showToast) window.AdminApp.showToast('success', id ? '✅ U përditësua' : '✅ U shtua', data.name);
            await loadData();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    async function deleteItem(id) {
        if (!confirm('Fshij?')) return;
        const coll = currentTab === 'streets' ? 'streets' : 'stands';
        try {
            await window.TaxiFirebase.db.collection(coll).doc(id).delete();
            await loadData();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    function exportCsv() {
        const isStreet = currentTab === 'streets';
        const data = isStreet ? streetsCache : standsCache;
        if (!data.length) return;
        const rows = data.map(x => ({
            'Emri': x.name || '', 'Zona': x.zone || '',
            'Lat': x.lat || 0, 'Lng': x.lng || 0,
            'Gjatësia/Kapaciteti': isStreet ? (x.length || 0) : (x.capacity || 0),
            'Aktiv': x.active !== false ? 'Po' : 'Jo'
        }));
        if (window.TaxiExport) window.TaxiExport.toCsv(rows, `${currentTab}-${Date.now()}.csv`);
    }

    function closeModal(e) {
        if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
        const root = document.getElementById('str-modal-root');
        if (root) root.innerHTML = '';
    }

    return { init, load, switchTab, applyFilters, openModal, save, deleteItem, exportCsv, closeModal };
})();
console.log('✅ admin/streets.js ngarkuar');
