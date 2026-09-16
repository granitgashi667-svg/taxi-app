'use strict';

/**
 * js/director/settings.js — Cilësimet e sistemit
 */

window.DirectorSettings = (() => {
    let currentSettings = {};

    // ═══ INIT ═══
    function init() {
        console.log('⚙️ DirectorSettings: Init...');
    }

    // ═══ LOAD ═══
    async function load() {
        console.log('⚙️ Duke ngarkuar cilësimet...');
        await loadSettings();
        renderLayout();
    }

    // ═══ LOAD SETTINGS ═══
    async function loadSettings() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('settings').get();
            currentSettings = {};
            snap.forEach(doc => {
                currentSettings[doc.id] = doc.data();
            });

            console.log('✅ Cilësimet u ngarkuan:', Object.keys(currentSettings).length);
        } catch (e) {
            console.error('❌ loadSettings:', e);
        }
    }

    // ═══ LAYOUT ═══
    function renderLayout() {
        const el = document.getElementById('settings-content');
        if (!el) return;

        const commission = currentSettings.commission?.percentage ?? 10;
        const tariffs = currentSettings.tariffs || {};
        const general = currentSettings.general || {};

        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;">
                <div class="page-title">
                    <i class="fa-solid fa-sliders"></i>
                    <div>
                        <h2>Cilësimet e Sistemit</h2>
                        <p>Konfigurimi global i kompanisë</p>
                    </div>
                </div>
            </div>

            <div class="cards-grid">
                <!-- KOMISIONI -->
                <div class="info-card">
                    <div class="info-card-header">
                        <div class="info-card-avatar"><i class="fa-solid fa-percent"></i></div>
                        <div>
                            <div class="info-card-name">Komisioni i kompanisë</div>
                            <div class="info-card-sub">Përqindja që merr kompania</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <div class="form-group">
                            <label>Përqindja (%)</label>
                            <input type="number" id="set-commission" class="input-field" value="${commission}" min="0" max="100" step="1">
                        </div>
                        <button class="btn-primary" style="width:100%;margin-top:8px;" onclick="DirectorSettings.saveCommission()">
                            <i class="fa-solid fa-save"></i> Ruaj
                        </button>
                    </div>
                </div>

                <!-- TARIFAT -->
                <div class="info-card">
                    <div class="info-card-header">
                        <div class="info-card-avatar"><i class="fa-solid fa-money-bill-wave"></i></div>
                        <div>
                            <div class="info-card-name">Tarifat Standarde</div>
                            <div class="info-card-sub">Çmimet për km</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <div class="form-group">
                            <label>Standard (€/km)</label>
                            <input type="number" id="set-tariff-standard" class="input-field" value="${tariffs.standard?.perKm || 0.80}" step="0.10" min="0">
                        </div>
                        <div class="form-group">
                            <label>VIP (€/km)</label>
                            <input type="number" id="set-tariff-vip" class="input-field" value="${tariffs.vip?.perKm || 1.50}" step="0.10" min="0">
                        </div>
                        <div class="form-group">
                            <label>Aeroport (€ fiks)</label>
                            <input type="number" id="set-tariff-airport" class="input-field" value="${tariffs.airport?.min || 15.00}" step="0.50" min="0">
                        </div>
                        <button class="btn-primary" style="width:100%;margin-top:8px;" onclick="DirectorSettings.saveTariffs()">
                            <i class="fa-solid fa-save"></i> Ruaj
                        </button>
                    </div>
                </div>

                <!-- INFO KOMPANISË -->
                <div class="info-card">
                    <div class="info-card-header">
                        <div class="info-card-avatar"><i class="fa-solid fa-building"></i></div>
                        <div>
                            <div class="info-card-name">Info Kompanisë</div>
                            <div class="info-card-sub">Emri, kontakti</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <div class="form-group">
                            <label>Emri i kompanisë</label>
                            <input type="text" id="set-company-name" class="input-field" value="${general.companyName || 'Taxi Prishtina'}">
                        </div>
                        <div class="form-group">
                            <label>Telefoni</label>
                            <input type="tel" id="set-company-phone" class="input-field" value="${general.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="set-company-email" class="input-field" value="${general.email || ''}">
                        </div>
                        <button class="btn-primary" style="width:100%;margin-top:8px;" onclick="DirectorSettings.saveGeneral()">
                            <i class="fa-solid fa-save"></i> Ruaj
                        </button>
                    </div>
                </div>

                <!-- SISTEMI -->
                <div class="info-card">
                    <div class="info-card-header">
                        <div class="info-card-avatar"><i class="fa-solid fa-server"></i></div>
                        <div>
                            <div class="info-card-name">Statusi i Sistemit</div>
                            <div class="info-card-sub">Informacione teknike</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <div class="info-card-row"><span>Firebase</span><span style="color:var(--accent-green);">✅ Lidhur</span></div>
                        <div class="info-card-row"><span>Project ID</span><span>${window.TaxiConfig?.APP?.name || 'TaxiDispatch'}</span></div>
                        <div class="info-card-row"><span>Version</span><span>${window.TaxiConfig?.APP?.version || '2.0.0'}</span></div>
                        <div class="info-card-row"><span>Shoferë</span><span id="set-drivers-count">—</span></div>
                        <div class="info-card-row"><span>Vetura</span><span id="set-vehicles-count">—</span></div>
                        <div class="info-card-row"><span>Klientë</span><span id="set-clients-count">—</span></div>
                    </div>
                </div>

                <!-- VEPRIME TË RREZIKSHME -->
                <div class="info-card" style="border-color:rgba(244,63,94,.3);">
                    <div class="info-card-header">
                        <div class="info-card-avatar" style="background:linear-gradient(135deg,#f43f5e,#be123c);"><i class="fa-solid fa-triangle-exclamation"></i></div>
                        <div>
                            <div class="info-card-name">Veprime të Rrezikshme</div>
                            <div class="info-card-sub">Vetëm drejtori mund t'i kryejë</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <button class="btn-primary" style="width:100%;background:linear-gradient(135deg,#f59e0b,#d97706);margin-bottom:8px;" onclick="DirectorSettings.clearCache()">
                            <i class="fa-solid fa-broom"></i> Pastro cache
                        </button>
                        <button class="btn-primary" style="width:100%;background:linear-gradient(135deg,#f43f5e,#be123c);" onclick="DirectorSettings.factoryReset()">
                            <i class="fa-solid fa-bomb"></i> Reset fabrika
                        </button>
                    </div>
                </div>

                <!-- LOGOUT -->
                <div class="info-card">
                    <div class="info-card-header">
                        <div class="info-card-avatar"><i class="fa-solid fa-right-from-bracket"></i></div>
                        <div>
                            <div class="info-card-name">Sesioni</div>
                            <div class="info-card-sub">Dil nga sistemi</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <button class="btn-primary" style="width:100%;background:linear-gradient(135deg,#f43f5e,#be123c);" onclick="DirectorApp.logout()">
                            <i class="fa-solid fa-sign-out-alt"></i> Dil nga paneli
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Ngarko counts
        loadCounts();
    }

    // ═══ COUNTS ═══
    async function loadCounts() {
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const [drivers, vehicles, clients] = await Promise.all([
                db.collection('drivers').get(),
                db.collection('vehicles').get(),
                db.collection('clients').get()
            ]);

            const el1 = document.getElementById('set-drivers-count');
            const el2 = document.getElementById('set-vehicles-count');
            const el3 = document.getElementById('set-clients-count');

            if (el1) el1.textContent = drivers.size;
            if (el2) el2.textContent = vehicles.size || (window.TaxiData?.vehicles?.length || 0);
            if (el3) el3.textContent = clients.size;
        } catch (e) {
            console.warn(e);
        }
    }

    // ═══ SAVE COMMISSION ═══
    async function saveCommission() {
        const value = parseFloat(document.getElementById('set-commission')?.value);
        if (isNaN(value) || value < 0 || value > 100) {
            showToast('error', 'Gabim', 'Vlera duhet 0-100');
            return;
        }

        try {
            const db = window.TaxiFirebase?.db;
            await db.collection('settings').doc('commission').set({
                percentage: value,
                updatedAt: Date.now(),
                updatedBy: window.DirectorApp?.currentOperator?.name || 'Drejtori'
            }, { merge: true });

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('commission_changed', { value });
            }

            showToast('success', '✅ Komisioni u ruajt', `${value}%`);
        } catch (e) {
            console.error('❌ saveCommission:', e);
            showToast('error', 'Gabim', '');
        }
    }

    // ═══ SAVE TARIFFS ═══
    async function saveTariffs() {
        const standard = parseFloat(document.getElementById('set-tariff-standard')?.value) || 0.80;
        const vip = parseFloat(document.getElementById('set-tariff-vip')?.value) || 1.50;
        const airport = parseFloat(document.getElementById('set-tariff-airport')?.value) || 15.00;

        try {
            const db = window.TaxiFirebase?.db;
            await db.collection('settings').doc('tariffs').set({
                standard: { perKm: standard },
                vip: { perKm: vip },
                airport: { min: airport },
                updatedAt: Date.now()
            }, { merge: true });

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('tariffs_changed', { standard, vip, airport });
            }

            showToast('success', '✅ Tarifat u ruajtën', '');
        } catch (e) {
            console.error('❌ saveTariffs:', e);
            showToast('error', 'Gabim', '');
        }
    }

    // ═══ SAVE GENERAL ═══
    async function saveGeneral() {
        const companyName = document.getElementById('set-company-name')?.value.trim();
        const phone = document.getElementById('set-company-phone')?.value.trim();
        const email = document.getElementById('set-company-email')?.value.trim();

        try {
            const db = window.TaxiFirebase?.db;
            await db.collection('settings').doc('general').set({
                companyName,
                phone,
                email,
                updatedAt: Date.now()
            }, { merge: true });

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('settings_general_changed', { companyName });
            }

            showToast('success', '✅ Info u ruajt', companyName);
        } catch (e) {
            console.error('❌ saveGeneral:', e);
            showToast('error', 'Gabim', '');
        }
    }

    // ═══ CLEAR CACHE ═══
    function clearCache() {
        if (!confirm('Pastro cache-in? Kjo nuk fshin të dhënat e databazës.')) return;

        try {
            localStorage.clear();
            sessionStorage.clear();
            showToast('success', '✅ Cache u pastrua', 'Rifresko faqen');
        } catch (e) {
            console.error('❌ clearCache:', e);
        }
    }

    // ═══ FACTORY RESET ═══
    async function factoryReset() {
        const confirmText = prompt('SHËNIM: Kjo fshin TË GJITHA të dhënat!\n\nPër të konfirmuar, shkruaj: KONFIRMO');

        if (confirmText !== 'KONFIRMO') {
            showToast('info', 'Anuluar', '');
            return;
        }

        if (!confirm('A jeni ABSOLUTISHT i sigurt? Nuk mund të kthehet!')) return;

        showToast('warning', '⚠️ Nuk është implementuar', 'Kërkon server-side function');
    }

    function showToast(type, title, msg) {
        if (window.DirectorApp?.showToast) window.DirectorApp.showToast(type, title, msg);
    }

    return { init, load, saveCommission, saveTariffs, saveGeneral, clearCache, factoryReset };
})();

console.log('✅ director/settings.js ngarkuar');
