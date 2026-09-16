'use strict';

/**
 * js/admin/auto-dispatch.js — Auto-Dispatch Settings
 * Konfigurimi i shpërndarjes automatike të porosive
 */

window.AdminAutoDispatch = (() => {
    let settings = {
        enabled: false,
        mode: 'nearest',           // nearest | roundrobin | zone | fixed
        maxDistanceKm: 5,
        maxWaitSeconds: 30,
        maxOffersPerOrder: 3,
        autoAssignAfterSeconds: 0, // 0 = off
        zonesEnabled: false,
        zones: [],
        priority: 'fifo',          // fifo | rating | earnings
        excludeOffline: true,
        excludeOnTrip: true,
        requireRating: 0,
        nightModeBoost: false,
        testMode: false
    };
    let settingsDocId = null;

    // ═══ INIT ═══
    function init() {
        console.log('⚙️ AdminAutoDispatch: Init...');
    }

    async function load() {
        await renderPage();
        await loadSettings();
    }

    // ═══ LOAD SETTINGS ═══
    async function loadSettings() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('settings').doc('auto_dispatch').get();
            if (snap.exists) {
                settingsDocId = snap.id;
                settings = { ...settings, ...snap.data() };
            }
            renderForm();
        } catch (e) {
            console.error('❌ loadSettings:', e);
            renderForm();
        }
    }

    // ═══ RENDER FAQJA ═══
    function renderPage() {
        const el = document.querySelector('.admin-page[data-page="auto-dispatch"]');
        if (!el) return;

        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title">
                    <i class="fa-solid fa-robot"></i>
                    <div>
                        <h2>Auto-Dispatch</h2>
                        <p>Konfigurimi i shpërndarjes automatike të porosive</p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-secondary" onclick="AdminAutoDispatch.reload()">
                        <i class="fa-solid fa-rotate"></i> Rifresko
                    </button>
                    <button class="btn-primary" onclick="AdminAutoDispatch.save()">
                        <i class="fa-solid fa-save"></i> Ruaj
                    </button>
                </div>
            </div>

            <div id="autodispatch-form">
                <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>
            </div>
        `;
        renderForm();
    }

    // ═══ RENDER FORM ═══
    function renderForm() {
        const el = document.getElementById('autodispatch-form');
        if (!el) return;

        el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-power-off"></i>
                        <h3>Statusi</h3>
                    </div>
                    <div class="db-panel-body">
                        <label style="display:flex;align-items:center;gap:12px;padding:12px;background:#1e293b;border-radius:8px;cursor:pointer;margin-bottom:10px;">
                            <input type="checkbox" id="ad-enabled" ${settings.enabled ? 'checked' : ''}
                                style="width:20px;height:20px;" onchange="AdminAutoDispatch.toggleEnabled(this.checked)">
                            <div style="flex:1;">
                                <div style="font-weight:800;font-size:13px;">Auto-Dispatch aktiv</div>
                                <div style="font-size:11px;color:#94a3b8;">Shpërndarja automatike e porosive</div>
                            </div>
                            <span style="padding:4px 10px;border-radius:6px;font-size:10px;font-weight:800;text-transform:uppercase;
                                background:${settings.enabled ? 'rgba(16,185,129,.15)' : 'rgba(100,116,139,.15)'};
                                color:${settings.enabled ? '#10b981' : '#94a3b8'};">
                                ${settings.enabled ? '● LIVE' : '○ OFF'}
                            </span>
                        </label>

                        <label style="display:flex;align-items:center;gap:12px;padding:12px;background:#1e293b;border-radius:8px;cursor:pointer;">
                            <input type="checkbox" id="ad-testmode" ${settings.testMode ? 'checked' : ''}
                                style="width:18px;height:18px;" onchange="AdminAutoDispatch.set('testMode', this.checked)">
                            <div style="flex:1;">
                                <div style="font-weight:700;font-size:12px;">Test mode</div>
                                <div style="font-size:10px;color:#94a3b8;">Regjistro pa dërguar oferta reale</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-diagram-project"></i>
                        <h3>Mënyra e shpërndarjes</h3>
                    </div>
                    <div class="db-panel-body">
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            ${renderRadio('nearest', 'Shoferi më i afërt', 'Gjej shoferin më të afërt me pickup-in')}
                            ${renderRadio('roundrobin', 'Round-Robin', 'Shpërndarje e barabartë mes shoferëve')}
                            ${renderRadio('zone', 'Sipas zonës', 'Vetëm shoferët në zonën e porosisë')}
                            ${renderRadio('fixed', 'Fixed routes', 'Për rrugë me çmim fiks')}
                        </div>
                    </div>
                </div>

                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-sliders"></i>
                        <h3>Parametrat</h3>
                    </div>
                    <div class="db-panel-body" style="display:flex;flex-direction:column;gap:12px;">
                        <label style="font-size:11px;color:#94a3b8;">
                            Distanca maksimale (km)
                            <input type="number" id="ad-maxdist" class="input" min="0" step="0.5"
                                value="${settings.maxDistanceKm}" style="width:100%;margin-top:4px;"
                                onchange="AdminAutoDispatch.set('maxDistanceKm', parseFloat(this.value) || 0)">
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">
                            Koha max pritje (sekonda)
                            <input type="number" id="ad-maxwait" class="input" min="0"
                                value="${settings.maxWaitSeconds}" style="width:100%;margin-top:4px;"
                                onchange="AdminAutoDispatch.set('maxWaitSeconds', parseInt(this.value) || 0)">
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">
                            Oferta max për porosi
                            <input type="number" id="ad-maxoffers" class="input" min="1" max="10"
                                value="${settings.maxOffersPerOrder}" style="width:100%;margin-top:4px;"
                                onchange="AdminAutoDispatch.set('maxOffersPerOrder', parseInt(this.value) || 1)">
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">
                            Auto-assign pas (sekonda, 0=off)
                            <input type="number" id="ad-autoassign" class="input" min="0"
                                value="${settings.autoAssignAfterSeconds}" style="width:100%;margin-top:4px;"
                                onchange="AdminAutoDispatch.set('autoAssignAfterSeconds', parseInt(this.value) || 0)">
                        </label>
                    </div>
                </div>

                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-filter"></i>
                        <h3>Prioriteti & Filtrat</h3>
                    </div>
                    <div class="db-panel-body" style="display:flex;flex-direction:column;gap:12px;">
                        <label style="font-size:11px;color:#94a3b8;">
                            Prioriteti
                            <select id="ad-priority" class="input" style="width:100%;margin-top:4px;"
                                onchange="AdminAutoDispatch.set('priority', this.value)">
                                <option value="fifo" ${settings.priority === 'fifo' ? 'selected' : ''}>FIFO (radhë)</option>
                                <option value="rating" ${settings.priority === 'rating' ? 'selected' : ''}>Rating më i lartë</option>
                                <option value="earnings" ${settings.priority === 'earnings' ? 'selected' : ''}>Fitimet më të ulëta</option>
                            </select>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;padding:10px;background:#1e293b;border-radius:8px;cursor:pointer;">
                            <input type="checkbox" ${settings.excludeOffline ? 'checked' : ''}
                                style="width:16px;height:16px;" onchange="AdminAutoDispatch.set('excludeOffline', this.checked)">
                            <span style="font-size:12px;">Përjashto shoferët offline</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;padding:10px;background:#1e293b;border-radius:8px;cursor:pointer;">
                            <input type="checkbox" ${settings.excludeOnTrip ? 'checked' : ''}
                                style="width:16px;height:16px;" onchange="AdminAutoDispatch.set('excludeOnTrip', this.checked)">
                            <span style="font-size:12px;">Përjashto shoferët në udhëtim</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;padding:10px;background:#1e293b;border-radius:8px;cursor:pointer;">
                            <input type="checkbox" ${settings.nightModeBoost ? 'checked' : ''}
                                style="width:16px;height:16px;" onchange="AdminAutoDispatch.set('nightModeBoost', this.checked)">
                            <span style="font-size:12px;">🌙 Boost në orët e natës (22:00-06:00)</span>
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">
                            Rating minimal i kërkuar
                            <input type="number" id="ad-rating" class="input" min="0" max="5" step="0.1"
                                value="${settings.requireRating}" style="width:100%;margin-top:4px;"
                                onchange="AdminAutoDispatch.set('requireRating', parseFloat(this.value) || 0)">
                        </label>
                    </div>
                </div>

            </div>

            <div class="db-panel" style="margin-top:16px;">
                <div class="db-panel-header">
                    <i class="fa-solid fa-map-location-dot"></i>
                    <h3>Zonat</h3>
                    <label style="margin-left:auto;display:flex;align-items:center;gap:8px;font-size:11px;color:#94a3b8;cursor:pointer;">
                        <input type="checkbox" ${settings.zonesEnabled ? 'checked' : ''}
                            onchange="AdminAutoDispatch.set('zonesEnabled', this.checked); AdminAutoDispatch.renderZones();">
                        Zonat aktive
                    </label>
                </div>
                <div class="db-panel-body">
                    <div id="ad-zones-body"></div>
                </div>
            </div>

            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;">
                <button class="btn-secondary" onclick="AdminAutoDispatch.reload()">
                    <i class="fa-solid fa-rotate"></i> Anulo
                </button>
                <button class="btn-primary" onclick="AdminAutoDispatch.save()">
                    <i class="fa-solid fa-save"></i> Ruaj konfigurimin
                </button>
            </div>
        `;

        renderZones();
    }

    function renderRadio(value, label, desc) {
        const checked = settings.mode === value;
        return `
            <label style="display:flex;align-items:center;gap:12px;padding:12px;background:#1e293b;border-radius:8px;cursor:pointer;border:2px solid ${checked ? '#a855f7' : 'transparent'};">
                <input type="radio" name="ad-mode" value="${value}" ${checked ? 'checked' : ''}
                    style="width:18px;height:18px;" onchange="AdminAutoDispatch.set('mode', '${value}'); AdminAutoDispatch.renderForm();">
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:12px;">${label}</div>
                    <div style="font-size:10px;color:#94a3b8;">${desc}</div>
                </div>
            </label>
        `;
    }

    function renderZones() {
        const el = document.getElementById('ad-zones-body');
        if (!el) return;

        if (!settings.zones?.length) {
            el.innerHTML = `
                <div class="empty-state" style="padding:20px;">
                    <i class="fa-solid fa-map"></i>
                    <p>Nuk ka zona të konfiguruara</p>
                    <button class="btn-secondary" style="margin-top:10px;" onclick="AdminAutoDispatch.addZone()">
                        <i class="fa-solid fa-plus"></i> Shto zonë
                    </button>
                </div>
            `;
            return;
        }

        el.innerHTML = `
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Emri</th><th>Qendra (lat,lng)</th><th>Rrezja (km)</th><th>Boost</th><th></th></tr></thead>
                    <tbody>
                        ${settings.zones.map((z, i) => `
                            <tr>
                                <td><strong>${z.name || '—'}</strong></td>
                                <td class="mono" style="font-size:10px;">${z.lat || '?'}, ${z.lng || '?'}</td>
                                <td class="mono">${z.radius || 0} km</td>
                                <td class="mono">${z.boost ? '+€' + z.boost : '—'}</td>
                                <td>
                                    <button class="btn-icon danger" onclick="AdminAutoDispatch.removeZone(${i})">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <button class="btn-secondary" style="margin-top:10px;" onclick="AdminAutoDispatch.addZone()">
                <i class="fa-solid fa-plus"></i> Shto zonë
            </button>
        `;
    }

    // ═══ ACTIONS ═══
    function set(key, value) {
        settings[key] = value;
        console.log(`⚙️ set ${key} = ${value}`);
    }

    function toggleEnabled(val) {
        settings.enabled = val;
        renderForm();
    }

    function addZone() {
        if (!settings.zones) settings.zones = [];
        const name = prompt('Emri i zonës:');
        if (!name) return;
        const lat = parseFloat(prompt('Latitude (p.sh. 42.6629):') || '0');
        const lng = parseFloat(prompt('Longitude (p.sh. 21.1655):') || '0');
        const radius = parseFloat(prompt('Rrezja në km:', '5') || '5');
        const boost = parseFloat(prompt('Boost çmimi € (opsional):', '0') || '0');

        settings.zones.push({ name, lat, lng, radius, boost });
        renderZones();
    }

    function removeZone(i) {
        if (!confirm('Fshij këtë zonë?')) return;
        settings.zones.splice(i, 1);
        renderZones();
    }

    // ═══ SAVE ═══
    async function save() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');

        try {
            // Lexo direkt nga inputet për siguri
            settings.maxDistanceKm = parseFloat(document.getElementById('ad-maxdist')?.value || '5');
            settings.maxWaitSeconds = parseInt(document.getElementById('ad-maxwait')?.value || '30');
            settings.maxOffersPerOrder = parseInt(document.getElementById('ad-maxoffers')?.value || '3');
            settings.autoAssignAfterSeconds = parseInt(document.getElementById('ad-autoassign')?.value || '0');
            settings.priority = document.getElementById('ad-priority')?.value || 'fifo';
            settings.requireRating = parseFloat(document.getElementById('ad-rating')?.value || '0');

            await db.collection('settings').doc('auto_dispatch').set({
                ...settings,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            }, { merge: true });

            showToast('success', '✅ U ruajt', settings.enabled ? 'Auto-Dispatch aktiv' : 'Auto-Dispatch joaktiv');
        } catch (e) {
            console.error('❌ save:', e);
            alert('Gabim: ' + e.message);
        }
    }

    async function reload() {
        await load();
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return {
        init, load, reload,
        set, toggleEnabled,
        addZone, removeZone, renderZones,
        renderForm, save
    };
})();

console.log('✅ admin/auto-dispatch.js ngarkuar');
