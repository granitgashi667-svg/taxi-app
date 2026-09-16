'use strict';

/**
 * js/admin/administration.js — Menu Administration (25 nënmenu)
 */

window.AdminAdministration = (() => {
    const MENUS = [
        { id: 'drivers', icon: 'fa-users', label: 'Shoferët', color: '#a855f7' },
        { id: 'vehicles', icon: 'fa-car-side', label: 'Veturat', color: '#ec4899' },
        { id: 'units', icon: 'fa-building', label: 'Njësitë', color: '#3b82f6' },
        { id: 'clients', icon: 'fa-address-book', label: 'Klientët', color: '#22c55e' },
        { id: 'street', icon: 'fa-road', label: 'Rrugët', color: '#f59e0b' },
        { id: 'custom-location', icon: 'fa-map-pin', label: 'Vendndodhje', color: '#06b6d4' },
        { id: 'stands', icon: 'fa-square-parking', label: 'Stacione', color: '#8b5cf6' },
        { id: 'zones', icon: 'fa-map-location-dot', label: 'Zonat', color: '#a855f7' },
        { id: 'trip', icon: 'fa-route', label: 'Udhëtimet', color: '#ec4899' },
        { id: 'salaries', icon: 'fa-money-bill-wave', label: 'Pagat', color: '#22c55e' },
        { id: 'fuel-prices', icon: 'fa-gas-pump', label: 'Çmimet karburantit', color: '#f59e0b' },
        { id: 'fuel-refill', icon: 'fa-gas-pump', label: 'Karburanti', color: '#3b82f6' },
        { id: 'users', icon: 'fa-user-shield', label: 'Përdoruesit', color: '#ef4444' },
        { id: 'sms', icon: 'fa-sms', label: 'SMS', color: '#06b6d4' },
        { id: 'remarks', icon: 'fa-note-sticky', label: 'Shënime', color: '#8b5cf6' },
        { id: 'mobile-users', icon: 'fa-mobile-screen', label: 'Përdorues mobile', color: '#a855f7' },
        { id: 'loyalty', icon: 'fa-gift', label: 'Karta besnikërie', color: '#ec4899' },
        { id: 'autodispatch', icon: 'fa-robot', label: 'Auto-dispatch', color: '#22c55e' },
        { id: 'sms-service', icon: 'fa-comment-dots', label: 'SMS Shërbimi', color: '#f59e0b' },
        { id: 'predefined-msg', icon: 'fa-comments', label: 'Mesazhe të gatshme', color: '#3b82f6' },
        { id: 'tariff', icon: 'fa-tags', label: 'Tarifat', color: '#06b6d4' },
        { id: 'system-settings', icon: 'fa-gears', label: 'Cilësimet e sistemit', color: '#8b5cf6' },
        { id: 'viber', icon: 'fa-comment', label: 'Viber', color: '#a855f7' },
        { id: 'importing', icon: 'fa-file-import', label: 'Import', color: '#ec4899' },
        { id: 'fixed-price', icon: 'fa-lock', label: 'Çmim fiks', color: '#22c55e' }
    ];

    // ═══ INIT ═══
    function init() {
        console.log('⚙️ AdminAdministration: Init...');
    }

    // ═══ LOAD ═══
    function load() {
        renderMenu();
    }

    // ═══ RENDER MENU ═══
    function renderMenu() {
        const el = document.querySelector('.admin-page[data-page="administration"]');
        if (!el) return;

        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;">
                <div class="page-title">
                    <i class="fa-solid fa-cogs"></i>
                    <div>
                        <h2>Administration</h2>
                        <p>Konfigurimi i plotë i sistemit · ${MENUS.length} module</p>
                    </div>
                </div>
            </div>

            <div class="admin-cards-grid">
                ${MENUS.map(m => `
                    <div class="admin-card" onclick="AdminAdministration.openMenu('${m.id}')" style="cursor:pointer;border-left:3px solid ${m.color};">
                        <div class="ac-header" style="border-bottom:none;margin-bottom:0;padding-bottom:0;">
                            <div class="ac-avatar" style="background:linear-gradient(135deg, ${m.color}, ${m.color}cc);">
                                <i class="fa-solid ${m.icon}"></i>
                            </div>
                            <div class="ac-info">
                                <div class="ac-name">${m.label}</div>
                                <div class="ac-role">Kliko për të hapur</div>
                            </div>
                            <i class="fa-solid fa-chevron-right" style="color:var(--text-muted);"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ═══ HAP MENUNË ═══
    function openMenu(menuId) {
        const menu = MENUS.find(m => m.id === menuId);
        if (!menu) return;

        console.log('⚙️ Duke hapur:', menu.label);

        // Dërgo te modulet përkatëse ose hap modal
        switch (menuId) {
            case 'drivers':
                if (window.AdminDrivers) window.AdminApp.switchPage('drivers');
                else openGenericModal(menu);
                break;
            case 'vehicles':
                if (window.AdminVehicles) window.AdminApp.switchPage('vehicles');
                else openGenericModal(menu);
                break;
            case 'clients':
                openClientsModal(menu);
                break;
            case 'zones':
                openZonesModal(menu);
                break;
            case 'salaries':
                openSalariesModal(menu);
                break;
            case 'users':
                openUsersModal(menu);
                break;
            case 'tariff':
                openTariffModal(menu);
                break;
            case 'system-settings':
                openSystemSettingsModal(menu);
                break;
            case 'remarks':
                openRemarksModal(menu);
                break;
            case 'predefined-msg':
                openPredefinedMsgModal(menu);
                break;
            case 'autodispatch':
                openAutoDispatchModal(menu);
                break;
            case 'sms':
                openSmsModal(menu);
                break;
            case 'fixed-price':
                openFixedPriceModal(menu);
                break;
            default:
                openGenericModal(menu);
        }
    }

    // ═══ MODAL GENERIK ═══
    function openGenericModal(menu) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-admin-generic';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid ${menu.icon}"></i>
                        <h3>${menu.label}</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-admin-generic').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align:center;padding:40px 20px;">
                        <i class="fa-solid ${menu.icon}" style="font-size:60px;opacity:0.3;color:${menu.color};display:block;margin-bottom:20px;"></i>
                        <h3 style="font-size:16px;font-weight:800;color:var(--text-secondary);margin-bottom:8px;">${menu.label}</h3>
                        <p style="color:var(--text-muted);font-size:12px;line-height:1.6;">
                            Ky modul do të jetë i disponueshëm së shpejti.<br>
                            Për më shumë detaje, kontakto administratorin.
                        </p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-admin-generic').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ KLIENTËT ═══
    async function openClientsModal(menu) {
        const db = window.TaxiFirebase?.db;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-admin-clients';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-address-book"></i><h3>Klientët</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-admin-clients').remove()">&times;</button>
                </div>
                <div class="modal-body" id="clients-modal-body">
                    <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        try {
            const snap = await db.collection('clients').limit(100).get();
            const clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const body = document.getElementById('clients-modal-body');
            if (!clients.length) {
                body.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka klientë</p></div>';
                return;
            }

            body.innerHTML = `
                <div class="admin-table-wrap">
                    <table class="admin-table">
                        <thead><tr><th>Emri</th><th>Telefon</th><th>Porosi</th><th>Veprime</th></tr></thead>
                        <tbody>
                            ${clients.map(c => `
                                <tr>
                                    <td><strong style="color:var(--text-primary);">${c.name || '—'}</strong></td>
                                    <td class="phone">${c.phone || '—'}</td>
                                    <td class="mono">${c.stats?.totalOrders || 0}</td>
                                    <td>
                                        <button class="filter-btn" style="padding:5px 10px;font-size:10px;background:rgba(244,63,94,.15);border-color:var(--accent-red);color:var(--accent-red);"
                                            onclick="AdminAdministration.blockClient('${c.phone}')">
                                            <i class="fa-solid fa-ban"></i> Blloko
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (e) {
            document.getElementById('clients-modal-body').innerHTML = `<div class="empty-state"><p>Gabim: ${e.message}</p></div>`;
        }
    }

    // ═══ BLLOKO KLIENT ═══
    async function blockClient(phone) {
        if (!confirm(`Blloko klientin ${phone}?`)) return;
        if (window.TaxiBlacklist) {
            await window.TaxiBlacklist.block(phone, 'Bllokuar nga administration', null, 30);
            showToast('success', '🚫 U bllokua', phone);
        }
    }

    // ═══ ZONAT ═══
    function openZonesModal(menu) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-admin-zones';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-map-location-dot"></i><h3>Zonat</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-admin-zones').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead><tr><th>ID</th><th>Emri</th><th>Tarifa</th><th>Veprime</th></tr></thead>
                            <tbody>
                                ${(window.TaxiData?.zones || []).map(z => `
                                    <tr>
                                        <td class="mono">${z.id}</td>
                                        <td><strong style="color:var(--text-primary);">${z.name}</strong></td>
                                        <td class="green mono">€${z.tariff.toFixed(2)}</td>
                                        <td>
                                            <button class="filter-btn" style="padding:5px 10px;font-size:10px;">
                                                <i class="fa-solid fa-pen"></i> Edito
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ PAGAT ═══
    function openSalariesModal(menu) {
        showToast('info', '💵 Pagat', 'Shko te Director Panel → Salaries');
    }

    // ═══ PËRDORUESIT ═══
    function openUsersModal(menu) {
        showToast('info', '👥 Përdoruesit', 'Shko te Director Panel → Users');
    }

    // ═══ TARIFAT ═══
    async function openTariffModal(menu) {
        const db = window.TaxiFirebase?.db;
        let tariffs = {};

        try {
            const doc = await db.collection('settings').doc('tariffs').get();
            if (doc.exists) tariffs = doc.data();
        } catch (e) {}

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-admin-tariff';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-tags"></i><h3>Tarifat</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-admin-tariff').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Standard (€/km)</label>
                        <input type="number" id="adm-tariff-standard" class="input-field" value="${tariffs.standard?.perKm || 0.80}" step="0.10">
                    </div>
                    <div class="form-group">
                        <label>VIP (€/km)</label>
                        <input type="number" id="adm-tariff-vip" class="input-field" value="${tariffs.vip?.perKm || 1.50}" step="0.10">
                    </div>
                    <div class="form-group">
                        <label>Aeroport (€ fiks)</label>
                        <input type="number" id="adm-tariff-airport" class="input-field" value="${tariffs.airport?.min || 15.00}" step="0.50">
                    </div>
                    <div class="form-group">
                        <label>Natë (€/km)</label>
                        <input type="number" id="adm-tariff-night" class="input-field" value="${tariffs.night?.perKm || 1.00}" step="0.10">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-admin-tariff').remove()">Anulo</button>
                    <button class="btn-primary" onclick="AdminAdministration.saveTariffs()">
                        <i class="fa-solid fa-save"></i> Ruaj
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function saveTariffs() {
        const db = window.TaxiFirebase?.db;
        try {
            await db.collection('settings').doc('tariffs').set({
                standard: { perKm: parseFloat(document.getElementById('adm-tariff-standard')?.value) || 0.80 },
                vip: { perKm: parseFloat(document.getElementById('adm-tariff-vip')?.value) || 1.50 },
                airport: { min: parseFloat(document.getElementById('adm-tariff-airport')?.value) || 15.00 },
                night: { perKm: parseFloat(document.getElementById('adm-tariff-night')?.value) || 1.00 },
                updatedAt: Date.now()
            }, { merge: true });

            document.getElementById('modal-admin-tariff')?.remove();
            showToast('success', '✅ Tarifat u ruajtën', '');
        } catch (e) {
            showToast('error', 'Gabim', e.message);
        }
    }

    // ═══ SYSTEM SETTINGS ═══
    function openSystemSettingsModal(menu) {
        showToast('info', '⚙️ Cilësimet', 'Shko te Director Panel → Settings');
    }

    // ═══ REMARKS ═══
    async function openRemarksModal(menu) {
        const db = window.TaxiFirebase?.db;
        let remarks = [];

        try {
            const snap = await db.collection('settings').doc('remarks').get();
            if (snap.exists) remarks = snap.data().list || [];
        } catch (e) {}

        if (!remarks.length) {
            remarks = [
                'PAK ME POSHT', 'CMIMIN 15 EURO', '20 METRA ME LARG',
                'TE LILYS', 'PRET ME POSHT', 'TE JAPANI', 'HYRJA A',
                'VETURA E MADHE', 'KA BAGAZH', 'KA FEMIJE'
            ];
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-admin-remarks';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-note-sticky"></i><h3>Shënime Standarde</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-admin-remarks').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
                        Shënime që operatori mund të zgjedhë me 1 klik.
                    </p>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
                        ${remarks.map(r => `
                            <span style="padding:6px 12px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:20px;font-size:11px;font-weight:600;">
                                ${r}
                            </span>
                        `).join('')}
                    </div>
                    <div class="form-group">
                        <label>Shto shënim të re</label>
                        <input type="text" id="adm-new-remark" class="input-field" placeholder="Shënim i re...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-admin-remarks').remove()">Mbyll</button>
                    <button class="btn-primary" onclick="AdminAdministration.addRemark()">
                        <i class="fa-solid fa-plus"></i> Shto
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function addRemark() {
        const val = document.getElementById('adm-new-remark')?.value.trim();
        if (!val) return;

        const db = window.TaxiFirebase?.db;
        try {
            const doc = await db.collection('settings').doc('remarks').get();
            const list = doc.exists ? (doc.data().list || []) : [];
            list.push(val);

            await db.collection('settings').doc('remarks').set({ list }, { merge: true });
            document.getElementById('adm-new-remark').value = '';
            showToast('success', '✅ U shtua', val);
        } catch (e) {
            showToast('error', 'Gabim', e.message);
        }
    }

    // ═══ PREDEFINED MSG ═══
    async function openPredefinedMsgModal(menu) {
        const msg = [
            'A mundesh me lajmru',
            'Kërkesë për pauzë',
            'Në punë jam',
            'Jasht veture',
            'Duke pritur',
            'Ndihmë',
            'Shko në bazë',
            'Kthehu në zonë'
        ];

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-admin-pmsg';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-comments"></i><h3>Mesazhe të Gatshme</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-admin-pmsg').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
                        Mesazhe që shoferët mund t'i dërgojnë me 1 klik.
                    </p>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${msg.map(m => `
                            <div style="padding:10px 14px;background:var(--bg-tertiary);border-radius:10px;border-left:3px solid var(--accent-purple);font-size:12px;">
                                💬 ${m}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-admin-pmsg').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ AUTO-DISPATCH ═══
    function openAutoDispatchModal(menu) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-admin-autodisp';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-robot"></i><h3>Auto-Dispatch</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-admin-autodisp').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Rreze max për caktim (km)</label>
                        <input type="number" class="input-field" value="5" min="1" max="50">
                    </div>
                    <div class="form-group">
                        <label>Timeout pranimi (sekonda)</label>
                        <input type="number" class="input-field" value="30" min="10" max="120">
                    </div>
                    <div class="form-group">
                        <label>Max distanca për auto-caktim</label>
                        <input type="number" class="input-field" value="10" min="1" max="100">
                    </div>
                    <div class="form-group" style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" checked id="adm-auto-rotate">
                        <label for="adm-auto-rotate" style="margin:0;">Rrotullo shoferët automatikisht</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-admin-autodisp').remove()">Anulo</button>
                    <button class="btn-primary" onclick="document.getElementById('modal-admin-autodisp').remove(); showToast('success','✅ U ruajt','');">
                        <i class="fa-solid fa-save"></i> Ruaj
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ SMS ═══
    function openSmsModal(menu) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-admin-sms';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-sms"></i><h3>SMS Konfigurimi</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-admin-sms').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>SMS #1 (kur shoferi pranon)</label>
                        <textarea class="input-field" rows="3">Taxi ju njofton se vetura {vehicle} është nisur drejt jush. Ndjekeni live: {link}</textarea>
                    </div>
                    <div class="form-group">
                        <label>SMS #2 (kur 20m larg)</label>
                        <textarea class="input-field" rows="3">Taxi ju njofton se vetura {vehicle} me targa {plate} eshte duke ju pritur.</textarea>
                    </div>
                    <div class="form-group">
                        <label>Gateway (Android)</label>
                        <select class="input-field">
                            <option>Android + SIM (Netcab style)</option>
                            <option>Twilio</option>
                            <option>ASPSMS</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-admin-sms').remove()">Mbyll</button>
                    <button class="btn-primary" onclick="document.getElementById('modal-admin-sms').remove(); showToast('success','✅ U ruajt','');">
                        <i class="fa-solid fa-save"></i> Ruaj
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ FIXED PRICE ═══
    function openFixedPriceModal(menu) {
        const routes = [
            { from: 'Grand Hotel', to: 'Aeroporti', price: 15.00 },
            { from: 'QKUK', to: 'Aeroporti', price: 18.00 },
            { from: 'Qendra', to: 'Fushë Kosova', price: 8.00 },
            { from: 'Albi Mall', to: 'Qendra', price: 5.00 }
        ];

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-admin-fixed';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-lock"></i><h3>Çmime Fikse</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-admin-fixed').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead><tr><th>Nga</th><th>Destinacioni</th><th>Çmimi</th><th>Veprime</th></tr></thead>
                            <tbody>
                                ${routes.map(r => `
                                    <tr>
                                        <td>${r.from}</td>
                                        <td>${r.to}</td>
                                        <td class="green mono">€${r.price.toFixed(2)}</td>
                                        <td><button class="filter-btn" style="padding:5px 10px;font-size:10px;"><i class="fa-solid fa-pen"></i></button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-admin-fixed').remove()">Mbyll</button>
                    <button class="btn-primary" onclick="showToast('info','➕','Shto rrugë të re')">
                        <i class="fa-solid fa-plus"></i> Shto rrugë
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    return { init, load, openMenu, saveTariffs, addRemark, blockClient };
})();

console.log('✅ admin/administration.js ngarkuar');
