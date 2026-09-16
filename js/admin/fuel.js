'use strict';

/**
 * js/admin/fuel.js — Fuel Prices / Refill
 * Çmimet e karburantit + regjistrimi i refill-eve për vetura
 */

window.AdminFuel = (() => {
    let pricesCache = [];   // fuel_prices
    let refillsCache = [];  // fuel_refills
    let vehiclesCache = []; // vehicles
    let filters = { from: '', to: '', vehicle: 'all', fuelType: 'all', sort: 'recent' };

    // ═══ INIT ═══
    function init() {
        console.log('⛽ AdminFuel: Init...');
    }

    async function load() {
        await renderPage();
    }

    // ═══ RENDER FAQJA ═══
    async function renderPage() {
        const el = document.querySelector('.admin-page[data-page="fuel"]');
        if (!el) return;

        el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Duke ngarkuar...</p></div>';

        try {
            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            await Promise.all([
                loadPrices(db),
                loadRefills(db),
                loadVehicles(db)
            ]);

            el.innerHTML = renderLayout();
            renderStatsBlock();
            renderPricesBlock();
            renderRefillsBlock();
        } catch (e) {
            console.error('❌ Fuel render:', e);
            el.innerHTML = errBox('Gabim: ' + e.message);
        }
    }

    async function loadPrices(db) {
        try {
            const snap = await db.collection('fuel_prices').orderBy('updatedAt', 'desc').limit(50).get();
            pricesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            const snap = await db.collection('fuel_prices').limit(50).get();
            pricesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    }

    async function loadRefills(db) {
        try {
            const snap = await db.collection('fuel_refills').orderBy('createdAt', 'desc').limit(500).get();
            refillsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            const snap = await db.collection('fuel_refills').limit(500).get();
            refillsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    }

    async function loadVehicles(db) {
        try {
            const snap = await db.collection('vehicles').limit(500).get();
            vehiclesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            vehiclesCache = [];
        }
    }

    // ═══ LAYOUT ═══
    function renderLayout() {
        return `
            <div class="page-header" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div class="page-title">
                    <i class="fa-solid fa-gas-pump"></i>
                    <div>
                        <h2>Fuel / Refill</h2>
                        <p>Çmimet e karburantit dhe regjistrimi i refill-eve</p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-secondary" onclick="AdminFuel.exportCsv()">
                        <i class="fa-solid fa-download"></i> CSV
                    </button>
                    <button class="btn-secondary" onclick="AdminFuel.openPriceModal()">
                        <i class="fa-solid fa-tag"></i> Çmim i re
                    </button>
                    <button class="btn-primary" onclick="AdminFuel.openRefillModal()">
                        <i class="fa-solid fa-plus"></i> Refill i re
                    </button>
                </div>
            </div>

            <div id="fuel-stats"></div>

            <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:16px;margin-bottom:20px;">
                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-tag"></i>
                        <h3>Çmimet aktuale</h3>
                    </div>
                    <div class="db-panel-body" id="fuel-prices-body">
                        <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                </div>

                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-list"></i>
                        <h3>Refill-et</h3>
                    </div>
                    <div class="db-panel-body">
                        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                            <input type="date" id="fuel-from" class="input-sm" value="${filters.from}"
                                onchange="AdminFuel.applyFilters()">
                            <input type="date" id="fuel-to" class="input-sm" value="${filters.to}"
                                onchange="AdminFuel.applyFilters()">
                            <select id="fuel-vehicle" class="input-sm" onchange="AdminFuel.applyFilters()">
                                <option value="all">Të gjitha veturat</option>
                                ${vehiclesCache.map(v => `
                                    <option value="${v.id}" ${filters.vehicle === v.id ? 'selected' : ''}>
                                        ${v.plate || v.vehicleNum || v.id}
                                    </option>
                                `).join('')}
                            </select>
                            <select id="fuel-type" class="input-sm" onchange="AdminFuel.applyFilters()">
                                <option value="all" ${filters.fuelType === 'all' ? 'selected' : ''}>Të gjitha llojet</option>
                                <option value="diesel" ${filters.fuelType === 'diesel' ? 'selected' : ''}>Diesel</option>
                                <option value="gasoline" ${filters.fuelType === 'gasoline' ? 'selected' : ''}>Benzinë</option>
                                <option value="lpg" ${filters.fuelType === 'lpg' ? 'selected' : ''}>LPG</option>
                                <option value="electric" ${filters.fuelType === 'electric' ? 'selected' : ''}>Elektrik</option>
                            </select>
                            <button class="btn-secondary" onclick="AdminFuel.resetFilters()">
                                <i class="fa-solid fa-rotate"></i>
                            </button>
                        </div>
                        <div id="fuel-refills-body"></div>
                    </div>
                </div>
            </div>

            <div id="fuel-modal-root"></div>
        `;
    }

    // ═══ STATS ═══
    function renderStatsBlock() {
        const el = document.getElementById('fuel-stats');
        if (!el) return;

        const filtered = applyRefillFilters(refillsCache);
        const totalLiters = filtered.reduce((s, r) => s + (parseFloat(r.liters) || 0), 0);
        const totalCost = filtered.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0);
        const totalKm = filtered.reduce((s, r) => s + (parseFloat(r.km) || 0), 0);
        const avgPrice = totalLiters ? (totalCost / totalLiters) : 0;

        el.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Total shpenzuar</div>
                    <div class="kpi-value green">€${totalCost.toFixed(2)}</div>
                    <div class="kpi-sub">${filtered.length} refill-e</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-droplet"></i> Litra totale</div>
                    <div class="kpi-value blue">${totalLiters.toFixed(2)} L</div>
                    <div class="kpi-sub">Mesatarja €${avgPrice.toFixed(2)}/L</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-label"><i class="fa-solid fa-road"></i> KM të regjistruara</div>
                    <div class="kpi-value yellow">${totalKm.toLocaleString()}</div>
                    <div class="kpi-sub">${totalLiters && totalKm ? (totalKm / totalLiters).toFixed(2) + ' km/L' : '—'}</div>
                </div>
                <div class="kpi-card pink">
                    <div class="kpi-label"><i class="fa-solid fa-calculator"></i> Kosto/KM</div>
                    <div class="kpi-value pink">${totalKm ? '€' + (totalCost / totalKm).toFixed(3) : '€0.000'}</div>
                    <div class="kpi-sub">Kosto mesatare</div>
                </div>
            </div>
        `;
    }

    // ═══ ÇMIMET ═══
    function renderPricesBlock() {
        const el = document.getElementById('fuel-prices-body');
        if (!el) return;

        // Marrim çmimin më të re për çdo lloj
        const latest = {};
        pricesCache.forEach(p => {
            const t = p.fuelType || 'diesel';
            if (!latest[t] || (p.updatedAt?.seconds || 0) > (latest[t].updatedAt?.seconds || 0)) {
                latest[t] = p;
            }
        });

        const types = ['diesel', 'gasoline', 'lpg', 'electric'];
        const meta = {
            diesel: { label: 'Diesel', icon: '🛢️', color: '#f59e0b' },
            gasoline: { label: 'Benzinë', icon: '⛽', color: '#ef4444' },
            lpg: { label: 'LPG', icon: '💨', color: '#06b6d4' },
            electric: { label: 'Elektrik', icon: '⚡', color: '#10b981' }
        };

        el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                ${types.map(t => {
                    const p = latest[t];
                    const m = meta[t];
                    return `
                        <div style="background:#1e293b;border-radius:10px;padding:14px;border-left:4px solid ${m.color};">
                            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;">
                                ${m.icon} ${m.label}
                            </div>
                            <div style="font-size:22px;font-weight:800;color:#f1f5f9;margin-top:6px;">
                                ${p ? '€' + parseFloat(p.price).toFixed(3) : '—'}
                            </div>
                            <div style="font-size:10px;color:#64748b;margin-top:4px;">
                                ${p ? 'Përditësuar: ' + formatDate(p.updatedAt) : 'Pa çmim'}
                            </div>
                            ${p ? `
                                <button class="btn-icon danger" style="margin-top:8px;"
                                    onclick="AdminFuel.deletePrice('${p.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="margin-top:12px;padding:10px;background:rgba(168,85,247,.08);border-radius:8px;font-size:10px;color:#94a3b8;">
                <i class="fa-solid fa-info-circle"></i> Çmimi më i fundit për secilin lloj përdoret automatikisht në refill.
            </div>
        `;
    }

    // ═══ REFILLS ═══
    function renderRefillsBlock() {
        const el = document.getElementById('fuel-refills-body');
        if (!el) return;

        const filtered = applyRefillFilters(refillsCache);

        if (!filtered.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-gas-pump"></i><p>Nuk ka refill-e</p></div>';
            return;
        }

        el.innerHTML = `
            <div class="admin-table-wrap" style="max-height:520px;overflow-y:auto;">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Vetura</th>
                            <th>Lloji</th>
                            <th>Litra</th>
                            <th>Çmim/L</th>
                            <th>Total €</th>
                            <th>KM</th>
                            <th>Stacioni</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(r => `
                            <tr>
                                <td class="mono" style="font-size:10px;">${formatDate(r.createdAt)}</td>
                                <td><strong>${r.vehiclePlate || r.vehicleNum || '—'}</strong></td>
                                <td>
                                    <span style="background:rgba(59,130,246,.15);color:#3b82f6;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;">
                                        ${r.fuelType || 'diesel'}
                                    </span>
                                </td>
                                <td class="mono">${parseFloat(r.liters || 0).toFixed(2)} L</td>
                                <td class="mono">€${parseFloat(r.pricePerLiter || 0).toFixed(3)}</td>
                                <td class="green mono" style="font-weight:800;">€${parseFloat(r.cost || 0).toFixed(2)}</td>
                                <td class="mono">${r.km ? r.km.toLocaleString() : '—'}</td>
                                <td style="font-size:11px;">${r.station || '—'}</td>
                                <td>
                                    <button class="btn-icon danger" onclick="AdminFuel.deleteRefill('${r.id}')">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ═══ FILTRA ═══
    function applyRefillFilters(arr) {
        let out = [...arr];

        if (filters.from) {
            const fromTs = new Date(filters.from + 'T00:00:00').getTime();
            out = out.filter(r => (r.createdAt?.seconds ? r.createdAt.seconds * 1000 : 0) >= fromTs);
        }
        if (filters.to) {
            const toTs = new Date(filters.to + 'T23:59:59').getTime();
            out = out.filter(r => (r.createdAt?.seconds ? r.createdAt.seconds * 1000 : 0) <= toTs);
        }
        if (filters.vehicle !== 'all') {
            out = out.filter(r => r.vehicleId === filters.vehicle);
        }
        if (filters.fuelType !== 'all') {
            out = out.filter(r => r.fuelType === filters.fuelType);
        }

        out.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        return out;
    }

    function applyFilters() {
        filters.from = document.getElementById('fuel-from')?.value || '';
        filters.to = document.getElementById('fuel-to')?.value || '';
        filters.vehicle = document.getElementById('fuel-vehicle')?.value || 'all';
        filters.fuelType = document.getElementById('fuel-type')?.value || 'all';
        renderStatsBlock();
        renderRefillsBlock();
    }

    function resetFilters() {
        filters = { from: '', to: '', vehicle: 'all', fuelType: 'all', sort: 'recent' };
        renderPage();
    }

    // ═══ MODAL: ÇMIM I RE ═══
    function openPriceModal() {
        showModal(`
            <h3><i class="fa-solid fa-tag"></i> Çmim i re i karburantit</h3>
            <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                <label style="font-size:11px;color:#94a3b8;">
                    Lloji *
                    <select id="fp-type" class="input" style="width:100%;margin-top:4px;">
                        <option value="diesel">Diesel</option>
                        <option value="gasoline">Benzinë</option>
                        <option value="lpg">LPG</option>
                        <option value="electric">Elektrik</option>
                    </select>
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Çmimi për litër (€) *
                    <input type="number" id="fp-price" class="input" step="0.001" min="0" value="1.500" style="width:100%;margin-top:4px;">
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Shënime
                    <input type="text" id="fp-notes" class="input" placeholder="p.sh. Ndryshim javor" style="width:100%;margin-top:4px;">
                </label>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                    <button class="btn-secondary" onclick="AdminFuel.closeModal()">Anulo</button>
                    <button class="btn-primary" onclick="AdminFuel.savePrice()"><i class="fa-solid fa-save"></i> Ruaj</button>
                </div>
            </div>
        `, 460);
    }

    async function savePrice() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');

        const fuelType = document.getElementById('fp-type')?.value;
        const price = parseFloat(document.getElementById('fp-price')?.value || '0');
        const notes = document.getElementById('fp-notes')?.value?.trim() || '';

        if (!price || price <= 0) return alert('Shkruaj çmimin');

        try {
            await db.collection('fuel_prices').add({
                fuelType, price, notes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });

            closeModal();
            showToast('success', '✅ Çmimi u ruajt', `${fuelType}: €${price}`);
            await renderPage();
        } catch (e) {
            console.error('❌ savePrice:', e);
            alert('Gabim: ' + e.message);
        }
    }

    async function deletePrice(id) {
        if (!confirm('Fshij këtë çmim?')) return;
        try {
            await window.TaxiFirebase.db.collection('fuel_prices').doc(id).delete();
            await renderPage();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    // ═══ MODAL: REFILL ═══
    function openRefillModal() {
        // Çmimi i fundit për diesel default
        const latest = {};
        pricesCache.forEach(p => {
            const t = p.fuelType || 'diesel';
            if (!latest[t] || (p.updatedAt?.seconds || 0) > (latest[t].updatedAt?.seconds || 0)) {
                latest[t] = p;
            }
        });

        showModal(`
            <h3><i class="fa-solid fa-gas-pump"></i> Refill i re</h3>
            <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                <label style="font-size:11px;color:#94a3b8;">
                    Vetura *
                    <select id="fr-vehicle" class="input" style="width:100%;margin-top:4px;" onchange="AdminFuel.onVehicleChange()">
                        <option value="">— Zgjidh veturën —</option>
                        ${vehiclesCache.map(v => `
                            <option value="${v.id}" data-plate="${v.plate || v.vehicleNum || ''}"
                                data-km="${v.km || v.odometer || 0}">
                                ${v.plate || v.vehicleNum || v.id} ${v.driverName ? '· ' + v.driverName : ''}
                            </option>
                        `).join('')}
                    </select>
                </label>
                <label style="font-size:11px;color:#94a3b8;">
                    Lloji i karburantit *
                    <select id="fr-type" class="input" style="width:100%;margin-top:4px;" onchange="AdminFuel.onFuelTypeChange()">
                        <option value="diesel" data-price="${latest.diesel?.price || 1.50}">Diesel</option>
                        <option value="gasoline" data-price="${latest.gasoline?.price || 1.55}">Benzinë</option>
                        <option value="lpg" data-price="${latest.lpg?.price || 0.85}">LPG</option>
                        <option value="electric" data-price="${latest.electric?.price || 0.35}">Elektrik</option>
                    </select>
                </label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label style="font-size:11px;color:#94a3b8;">
                        Litra *
                        <input type="number" id="fr-liters" class="input" step="0.01" min="0" value="40"
                            style="width:100%;margin-top:4px;" oninput="AdminFuel.calcTotal()">
                    </label>
                    <label style="font-size:11px;color:#94a3b8;">
                        Çmimi/L (€) *
                        <input type="number" id="fr-ppl" class="input" step="0.001" min="0"
                            value="${latest.diesel?.price || 1.500}"
                            style="width:100%;margin-top:4px;" oninput="AdminFuel.calcTotal()">
                    </label>
                </div>
                <div style="padding:12px;background:rgba(16,185,129,.1);border-radius:8px;text-align:center;">
                    Total: <strong id="fr-total" style="color:#10b981;font-size:20px;">€0.00</strong>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label style="font-size:11px;color:#94a3b8;">
                        KM (odometer)
                        <input type="number" id="fr-km" class="input" min="0" style="width:100%;margin-top:4px;">
                    </label>
                    <label style="font-size:11px;color:#94a3b8;">
                        Stacioni
                        <input type="text" id="fr-station" class="input" placeholder="p.sh. Petrol" style="width:100%;margin-top:4px;">
                    </label>
                </div>
                <label style="font-size:11px;color:#94a3b8;">
                    Shënime
                    <input type="text" id="fr-notes" class="input" style="width:100%;margin-top:4px;">
                </label>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                    <button class="btn-secondary" onclick="AdminFuel.closeModal()">Anulo</button>
                    <button class="btn-primary" onclick="AdminFuel.saveRefill()"><i class="fa-solid fa-save"></i> Ruaj</button>
                </div>
            </div>
        `, 520);

        setTimeout(() => calcTotal(), 50);
    }

    function onFuelTypeChange() {
        const sel = document.getElementById('fr-type');
        const ppl = document.getElementById('fr-ppl');
        if (sel && ppl) {
            const opt = sel.options[sel.selectedIndex];
            ppl.value = opt.getAttribute('data-price') || '1.500';
            calcTotal();
        }
    }

    function onVehicleChange() {
        const sel = document.getElementById('fr-vehicle');
        const km = document.getElementById('fr-km');
        if (sel && km) {
            const opt = sel.options[sel.selectedIndex];
            const vkm = parseFloat(opt.getAttribute('data-km') || '0');
            if (vkm) km.value = vkm;
        }
    }

    function calcTotal() {
        const liters = parseFloat(document.getElementById('fr-liters')?.value || '0');
        const ppl = parseFloat(document.getElementById('fr-ppl')?.value || '0');
        const total = liters * ppl;
        const el = document.getElementById('fr-total');
        if (el) el.textContent = '€' + total.toFixed(2);
    }

    async function saveRefill() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');

        const vehicleSel = document.getElementById('fr-vehicle');
        const vehicleId = vehicleSel?.value;
        const vehicleOpt = vehicleSel?.options[vehicleSel.selectedIndex];
        const vehiclePlate = vehicleOpt?.getAttribute('data-plate') || '';

        const fuelType = document.getElementById('fr-type')?.value;
        const liters = parseFloat(document.getElementById('fr-liters')?.value || '0');
        const pricePerLiter = parseFloat(document.getElementById('fr-ppl')?.value || '0');
        const cost = +(liters * pricePerLiter).toFixed(2);
        const km = parseFloat(document.getElementById('fr-km')?.value || '0') || 0;
        const station = document.getElementById('fr-station')?.value?.trim() || '';
        const notes = document.getElementById('fr-notes')?.value?.trim() || '';

        if (!vehicleId) return alert('Zgjidh veturën');
        if (!liters || liters <= 0) return alert('Shkruaj litrat');
        if (!pricePerLiter || pricePerLiter <= 0) return alert('Shkruaj çmimin');

        try {
            await db.collection('fuel_refills').add({
                vehicleId, vehiclePlate, fuelType,
                liters, pricePerLiter, cost, km, station, notes,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });

            // Përditëso km e veturës
            if (km > 0) {
                try {
                    await db.collection('vehicles').doc(vehicleId).update({
                        km, lastRefillAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch {}
            }

            closeModal();
            showToast('success', '✅ Refill u ruajt', `€${cost}`);
            await renderPage();
        } catch (e) {
            console.error('❌ saveRefill:', e);
            alert('Gabim: ' + e.message);
        }
    }

    async function deleteRefill(id) {
        if (!confirm('Fshij këtë refill?')) return;
        try {
            await window.TaxiFirebase.db.collection('fuel_refills').doc(id).delete();
            await renderPage();
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    // ═══ EXPORT CSV ═══
    function exportCsv() {
        const filtered = applyRefillFilters(refillsCache);
        if (!filtered.length) return showToast('warning', 'Nuk ka të dhëna', '');

        const rows = filtered.map(r => ({
            'Data': formatDate(r.createdAt),
            'Vetura': r.vehiclePlate || r.vehicleNum || '',
            'Lloji': r.fuelType || '',
            'Litra': parseFloat(r.liters || 0).toFixed(2),
            'Çmim/L': parseFloat(r.pricePerLiter || 0).toFixed(3),
            'Total €': parseFloat(r.cost || 0).toFixed(2),
            'KM': r.km || 0,
            'Stacioni': r.station || '',
            'Shënime': r.notes || ''
        }));

        if (window.TaxiExport) {
            window.TaxiExport.toCsv(rows, `fuel-refills-${new Date().toISOString().slice(0,10)}.csv`);
            showToast('success', '📥 CSV u shkarkua', '');
        }
    }

    // ═══ MODAL HELPERS ═══
    function showModal(html, maxWidth = 520) {
        let root = document.getElementById('fuel-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'fuel-modal-root';
            document.body.appendChild(root);
        }
        root.innerHTML = `
            <div class="modal-overlay" onclick="AdminFuel.closeModal(event)">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:${maxWidth}px;max-height:85vh;overflow-y:auto;">
                    ${html}
                </div>
            </div>
        `;
    }

    function closeModal(e) {
        if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
        const root = document.getElementById('fuel-modal-root');
        if (root) root.innerHTML = '';
    }

    function formatDate(ts) {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function showToast(type, title, msg) {
        if (window.AdminApp?.showToast) window.AdminApp.showToast(type, title, msg);
    }

    function errBox(msg) {
        return `<div class="empty-state" style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i><p>${msg}</p></div>`;
    }

    return {
        init, load,
        applyFilters, resetFilters,
        openPriceModal, savePrice, deletePrice,
        openRefillModal, saveRefill, deleteRefill,
        onVehicleChange, onFuelTypeChange, calcTotal,
        exportCsv, closeModal
    };
})();

console.log('✅ admin/fuel.js ngarkuar');
