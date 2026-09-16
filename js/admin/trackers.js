'use strict';

window.AdminTrackers = (() => {
    let trackersCache = [];
    let positionsCache = [];
    let selectedTracker = null;
    let refreshTimer = null;

    function init() { console.log('📍 AdminTrackers: Init...'); }
    async function load() { await renderPage(); await loadTrackers(); startAutoRefresh(); }

    function startAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => {
            if (document.querySelector('.admin-page[data-page="trackers"]')?.offsetParent) {
                loadTrackers(true);
            }
        }, 30000);
    }

    async function loadTrackers(silent = false) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            const snap = await db.collection('trackers').limit(500).get();
            trackersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (!silent) renderStats();
            renderList();
            if (selectedTracker) loadPositions(selectedTracker);
        } catch (e) { console.error(e); }
    }

    async function loadPositions(trackerId, silent = false) {
        const db = window.TaxiFirebase?.db;
        if (!db) return;
        try {
            const snap = await db.collection('tracker_positions')
                .where('trackerId', '==', trackerId)
                .orderBy('timestamp', 'desc')
                .limit(100).get();
            positionsCache = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
            if (!silent) renderDetail();
        } catch {
            try {
                const snap = await db.collection('tracker_positions')
                    .where('trackerId', '==', trackerId).limit(100).get();
                positionsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
                if (!silent) renderDetail();
            } catch {}
        }
    }

    function renderPage() {
        const el = document.querySelector('.admin-page[data-page="trackers"]');
        if (!el) return;
        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title"><i class="fa-solid fa-satellite-dish"></i>
                    <div><h2>Trackers</h2><p>GPS tracking live</p></div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-secondary" onclick="AdminTrackers.load()"><i class="fa-solid fa-rotate"></i> Rifresko</button>
                    <button class="btn-primary" onclick="AdminTrackers.openModal()"><i class="fa-solid fa-plus"></i> Tracker i re</button>
                </div>
            </div>
            <div id="trk-stats"></div>
            <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:16px;">
                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-list"></i><h3>Trackers</h3></div>
                    <div class="db-panel-body" id="trk-list"></div>
                </div>
                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-map-location-dot"></i><h3 id="trk-detail-title">Zgjidh një tracker</h3></div>
                    <div class="db-panel-body" id="trk-detail"></div>
                </div>
            </div>
            <div id="trk-modal-root"></div>
        `;
    }

    function renderStats() {
        const el = document.getElementById('trk-stats');
        if (!el) return;
        const total = trackersCache.length;
        const online = trackersCache.filter(t => isOnline(t)).length;
        const offline = total - online;
        const moving = trackersCache.filter(t => (parseFloat(t.speed) || 0) > 2).length;
        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card blue"><div class="kpi-label"><i class="fa-solid fa-satellite-dish"></i> Trackers</div><div class="kpi-value blue">${total}</div><div class="kpi-sub">total</div></div>
                <div class="kpi-card green"><div class="kpi-label"><i class="fa-solid fa-circle"></i> Online</div><div class="kpi-value green">${online}</div><div class="kpi-sub">aktiv</div></div>
                <div class="kpi-card pink"><div class="kpi-label"><i class="fa-solid fa-circle-xmark"></i> Offline</div><div class="kpi-value pink">${offline}</div><div class="kpi-sub">joaktiv</div></div>
                <div class="kpi-card yellow"><div class="kpi-label"><i class="fa-solid fa-gauge-high"></i> Në lëvizje</div><div class="kpi-value yellow">${moving}</div><div class="kpi-sub">> 2 km/h</div></div>
            </div>
        `;
    }

    function isOnline(t) {
        if (!t.lastSeen) return false;
        const ts = t.lastSeen.toDate ? t.lastSeen.toDate() : new Date(t.lastSeen.seconds ? t.lastSeen.seconds * 1000 : t.lastSeen);
        return (Date.now() - ts.getTime()) < 5 * 60 * 1000;
    }

    function renderList() {
        const el = document.getElementById('trk-list');
        if (!el) return;
        if (!trackersCache.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-satellite-dish"></i><p>Nuk ka trackers</p></div>';
            return;
        }
        el.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:8px;max-height:520px;overflow-y:auto;">
                ${trackersCache.map(t => {
                    const online = isOnline(t);
                    const sel = selectedTracker === t.id;
                    return `
                        <div onclick="AdminTrackers.selectTracker('${t.id}')" style="padding:12px;background:${sel ? 'rgba(168,85,247,.15)' : '#1e293b'};border:1px solid ${sel ? '#a855f7' : 'transparent'};border-radius:10px;cursor:pointer;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                <strong style="font-size:13px;">${t.name || t.plate || t.id}</strong>
                                <span style="width:8px;height:8px;border-radius:50%;background:${online ? '#10b981' : '#64748b'};"></span>
                            </div>
                            <div style="font-size:10px;color:#94a3b8;">
                                ${t.plate ? '🚗 ' + t.plate + ' · ' : ''}${t.driverName || '—'}
                            </div>
                            <div style="font-size:10px;color:#64748b;margin-top:4px;font-family:monospace;">
                                ${t.lat ? t.lat.toFixed(4) + ', ' + t.lng.toFixed(4) : 'Pa pozicion'}
                                ${t.speed ? ' · ' + parseFloat(t.speed).toFixed(0) + ' km/h' : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function selectTracker(id) {
        selectedTracker = id;
        positionsCache = [];
        renderList();
        loadPositions(id);
    }

    function renderDetail() {
        const el = document.getElementById('trk-detail');
        const titleEl = document.getElementById('trk-detail-title');
        if (!el || !titleEl) return;

        const t = trackersCache.find(x => x.id === selectedTracker);
        if (!t) {
            titleEl.textContent = 'Zgjidh një tracker';
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-map-location-dot"></i><p>Kliko një tracker për detaje</p></div>';
            return;
        }
        titleEl.textContent = t.name || t.plate || t.id;

        el.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;">
                <div style="background:#1e293b;padding:10px;border-radius:8px;">
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Latitude</div>
                    <div style="font-size:14px;font-weight:800;font-family:monospace;">${t.lat ? t.lat.toFixed(6) : '—'}</div>
                </div>
                <div style="background:#1e293b;padding:10px;border-radius:8px;">
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Longitude</div>
                    <div style="font-size:14px;font-weight:800;font-family:monospace;">${t.lng ? t.lng.toFixed(6) : '—'}</div>
                </div>
                <div style="background:#1e293b;padding:10px;border-radius:8px;">
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Shpejtësia</div>
                    <div style="font-size:14px;font-weight:800;font-family:monospace;">${t.speed ? parseFloat(t.speed).toFixed(0) + ' km/h' : '0 km/h'}</div>
                </div>
                <div style="background:#1e293b;padding:10px;border-radius:8px;">
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Statusi</div>
                    <div style="font-size:14px;font-weight:800;color:${isOnline(t) ? '#10b981' : '#64748b'};">${isOnline(t) ? '● Online' : '○ Offline'}</div>
                </div>
            </div>
            <div style="padding:12px;background:rgba(59,130,246,.08);border-radius:8px;font-size:11px;color:#94a3b8;margin-bottom:16px;">
                <i class="fa-solid fa-info-circle"></i> Për hartë live, integro Google Maps ose Leaflet në këtë panel me koordinatat më lart.
            </div>
            <h4 style="font-size:12px;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">
                <i class="fa-solid fa-clock-rotate-left"></i> Historik pozicionesh (${positionsCache.length})
            </h4>
            ${positionsCache.length ? `
                <div class="admin-table-wrap" style="max-height:280px;overflow-y:auto;">
                    <table class="admin-table">
                        <thead><tr><th>Koha</th><th>Lat</th><th>Lng</th><th>Shpejtësia</th></tr></thead>
                        <tbody>
                            ${positionsCache.slice().reverse().map(p => `
                                <tr>
                                    <td class="mono" style="font-size:10px;">${formatTime(p.timestamp)}</td>
                                    <td class="mono" style="font-size:10px;">${p.lat ? p.lat.toFixed(5) : '—'}</td>
                                    <td class="mono" style="font-size:10px;">${p.lng ? p.lng.toFixed(5) : '—'}</td>
                                    <td class="mono" style="font-size:10px;">${p.speed ? parseFloat(p.speed).toFixed(0) + ' km/h' : '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka pozicione</p></div>'}
        `;
    }

    function openModal() {
        let root = document.getElementById('trk-modal-root');
        if (!root) { root = document.createElement('div'); root.id = 'trk-modal-root'; document.body.appendChild(root); }
        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminTrackers.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:480px;">
                    <h3><i class="fa-solid fa-satellite-dish"></i> Tracker i re</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                        <label style="font-size:11px;color:#94a3b8;">Emri *<input type="text" id="trk-name" class="input" placeholder="p.sh. TX-001" style="width:100%;margin-top:4px;"></label>
                        <label style="font-size:11px;color:#94a3b8;">Targa<input type="text" id="trk-plate" class="input" style="width:100%;margin-top:4px;"></label>
                        <label style="font-size:11px;color:#94a3b8;">Shoferi<input type="text" id="trk-driver" class="input" style="width:100%;margin-top:4px;"></label>
                        <label style="font-size:11px;color:#94a3b8;">Device ID / IMEI<input type="text" id="trk-device" class="input" style="width:100%;margin-top:4px;"></label>
                        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                            <button class="btn-secondary" onclick="AdminTrackers.closeModal()">Anulo</button>
                            <button class="btn-primary" onclick="AdminTrackers.save()"><i class="fa-solid fa-save"></i> Ruaj</button>
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
            name: document.getElementById('trk-name')?.value?.trim(),
            plate: document.getElementById('trk-plate')?.value?.trim() || '',
            driverName: document.getElementById('trk-driver')?.value?.trim() || '',
            deviceId: document.getElementById('trk-device')?.value?.trim() || '',
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!data.name) return alert('Shkruaj emrin');
        try {
            await db.collection('trackers').add(data);
            closeModal();
            if (window.AdminApp?.showToast) window.AdminApp.showToast('success', '✅ U krijua', data.name);
            await loadTrackers();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    function closeModal(e) {
        if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
        const root = document.getElementById('trk-modal-root');
        if (root) root.innerHTML = '';
    }

    function formatTime(ts) {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    return { init, load, selectTracker, openModal, save, closeModal };
})();
console.log('✅ admin/trackers.js ngarkuar');
