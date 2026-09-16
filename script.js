'use strict';

const AppState = {
    orders: [], waitingOrders: [], preOrders: [], incomingCalls: [], messages: [],
    drivers: [], vehicles: [], zones: [], addresses: [], config: {},
    map: null, vehicleMarkers: new Map(), currentDispatchMode: 'auto', soundEnabled: true,
    currentOperator: {
        name: 'Granit Gashi', initials: 'GD', loggedIn: false, loginTime: null,
        stats: { callsTaken: 0, callsWaiting: 0, callsOpened: 0, revenue: 0, trips: 0, cancelled: 0 }
    },
    manualAssignOrderId: null, audioContext: null
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => document.getElementById('loading-overlay')?.classList.add('hidden'), 600);
    loadData();
    initClock();
    initMap();
    initEventListeners();
    renderAll();
    setupTargetEditButtons();
    startCallSimulation();
    startOrderSimulation();
});

// ═══ DATA ═══
function loadData() {
    if (!window.TaxiData) { console.error('TaxiData missing'); return; }
    AppState.addresses = window.TaxiData.addresses || [];
    AppState.zones = window.TaxiData.zones || [];
    AppState.drivers = JSON.parse(JSON.stringify(window.TaxiData.drivers || []));
    AppState.vehicles = window.TaxiData.vehicles || [];
    AppState.config = window.TaxiData.config || {};

    if (window.TaxiState) {
        window.TaxiState.set('drivers', AppState.drivers);
        window.TaxiState.set('vehicles', AppState.vehicles);
        window.TaxiState.set('zones', AppState.zones);
        window.TaxiState.set('addresses', AppState.addresses);
    }

    const manualSelect = document.getElementById('manual-vehicle-select');
    if (manualSelect) {
        AppState.vehicles.forEach(v => {
            const driver = AppState.drivers.find(d => d.vehicleId === v.id);
            const num = String(v.id).padStart(2, '0');
            const opt = document.createElement('option');
            opt.value = num;
            opt.textContent = `🚗 ${num} — ${v.plate} — ${driver ? driver.name : 'N/A'}`;
            manualSelect.appendChild(opt);
        });
    }
}

// ═══ CLOCK ═══
function initClock() {
    const update = () => {
        const now = new Date();
        const t = document.getElementById('clock-time');
        const d = document.getElementById('clock-date');
        if (t) t.textContent = now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (d) d.textContent = now.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    update();
    setInterval(update, 1000);
}

// ═══ MAP ═══
function initMap() {
    const el = document.getElementById('map');
    if (!el) return;
    AppState.map = L.map('map', { center: [42.6629, 21.1655], zoom: 13, zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(AppState.map);
    renderZonesOnMap();
    renderVehiclesOnMap();
    renderAddressMarkers();

    if (window.TaxiState) window.TaxiState.set('map', AppState.map);
}

function renderZonesOnMap() {
    AppState.zones.forEach(zone => {
        L.polygon(zone.polygon, { color: zone.color, fillColor: zone.color, fillOpacity: 0.06, weight: 2, dashArray: '6,4' }).addTo(AppState.map);
    });
}

function renderAddressMarkers() {
    AppState.addresses.forEach(addr => {
        const cat = window.TaxiData.addressCategories[addr.category] || { icon: 'fa-location-dot', color: '#6b7280' };
        const icon = L.divIcon({
            className: 'address-marker',
            html: `<div style="background:${cat.color};width:8px;height:8px;border-radius:50%;border:1px solid white;box-shadow:0 0 4px ${cat.color};"></div>`,
            iconSize: [8, 8], iconAnchor: [4, 4]
        });
        L.marker([addr.lat, addr.lng], { icon }).addTo(AppState.map).bindPopup(`<b>${addr.name}</b><br><small>${cat.label || ''}</small>`);
    });
}

function renderVehiclesOnMap() {
    AppState.drivers.forEach(driver => {
        const vehicle = AppState.vehicles.find(v => v.id === driver.vehicleId);
        if (!vehicle) return;
        const num = String(driver.vehicleId).padStart(2, '0');
        const mode = driver.mode || 'inactive';
        const icon = L.divIcon({
            className: 'vehicle-marker',
            html: `<div class="vehicle-marker-inner ${mode}" data-number="${num}"></div>`,
            iconSize: [28, 28], iconAnchor: [14, 14]
        });
        const marker = L.marker([driver.lat, driver.lng], { icon, title: `${num} - ${driver.name}` }).addTo(AppState.map);
        marker.bindPopup(`
            <div style="min-width:200px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${getModeColor(mode)};color:white;font-weight:800;font-family:monospace;font-size:13px;">${num}</span>
                    <div><div style="font-weight:700;font-size:13px;">${driver.name}</div><div style="font-size:11px;color:#8b7aa8;">${vehicle.plate}</div></div>
                </div>
                <div style="font-size:11px;color:#b8a8d9;">📞 ${driver.phone}<br>⭐ ${driver.rating}</div>
            </div>
        `);
        AppState.vehicleMarkers.set(driver.id, marker);
    });
    const cnt = document.getElementById('map-counter');
    if (cnt) cnt.textContent = `${AppState.drivers.length} taksí`;
}

function getModeColor(mode) {
    const c = { free: '#22c55e', taximeter: '#3b82f6', fixed: '#ef4444', pause: '#facc15', inactive: '#6b7280' };
    return c[mode] || c.inactive;
}

function updateVehicleMarker(driverId) {
    const driver = AppState.drivers.find(d => d.id === driverId);
    const marker = AppState.vehicleMarkers.get(driverId);
    if (!driver || !marker) return;
    const num = String(driver.vehicleId).padStart(2, '0');
    const icon = L.divIcon({
        className: 'vehicle-marker',
        html: `<div class="vehicle-marker-inner ${driver.mode}" data-number="${num}"></div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
    });
    marker.setIcon(icon);
}

// ═══ EVENT LISTENERS ═══
function initEventListeners() {
    document.getElementById('order-form')?.addEventListener('submit', (e) => { e.preventDefault(); submitOrder(); });
    document.getElementById('btn-submit-order')?.addEventListener('click', (e) => { e.preventDefault(); submitOrder(); });

    document.querySelectorAll('.dispatch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dispatch-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentDispatchMode = btn.dataset.dispatch;
            const picker = document.getElementById('manual-vehicle-picker');
            if (picker) picker.style.display = btn.dataset.dispatch === 'manual' ? 'block' : 'none';
        });
    });

    setupAutocomplete('pickup-address', 'pickup-suggestions');
    setupAutocomplete('destination-address', 'destination-suggestions');

    document.getElementById('order-search')?.addEventListener('input', (e) => filterOrders(e.target.value));

    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
    });

    document.getElementById('btn-sound-toggle')?.addEventListener('click', (e) => {
        AppState.soundEnabled = !AppState.soundEnabled;
        if (window.TaxiSound) window.TaxiSound.toggle();
        const btn = e.currentTarget;
        btn.classList.toggle('sound-on', AppState.soundEnabled);
        btn.classList.toggle('sound-off', !AppState.soundEnabled);
        btn.querySelector('i').className = AppState.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
        showToast('info', 'Zëri', AppState.soundEnabled ? 'Aktivizuar' : 'Çaktivizuar');
    });

    document.querySelectorAll('[data-panel-min]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const panel = document.getElementById(btn.dataset.panelMin);
            if (!panel) return;
            panel.classList.toggle('minimized');
            const icon = btn.querySelector('i');
            if (icon) icon.className = panel.classList.contains('minimized') ? 'fa-solid fa-plus' : 'fa-solid fa-minus';
            setTimeout(() => AppState.map?.invalidateSize(), 400);
        });
    });
    document.querySelectorAll('[data-panel-max]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const panel = document.getElementById(btn.dataset.panelMax);
            if (!panel) return;
            const isMax = panel.classList.contains('maximized');
            document.querySelectorAll('.panel.maximized').forEach(p => {
                p.classList.remove('maximized');
                const ic = p.querySelector('[data-panel-max] i');
                if (ic) ic.className = 'fa-solid fa-expand';
            });
            if (!isMax) {
                panel.classList.add('maximized');
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-compress';
            }
            setTimeout(() => AppState.map?.invalidateSize(), 400);
        });
    });

    document.getElementById('btn-confirm-manual-assign')?.addEventListener('click', confirmManualAssign);
    document.getElementById('assign-vehicle-select')?.addEventListener('change', (e) => {
        const num = e.target.value;
        const vehicle = AppState.vehicles.find(v => String(v.id).padStart(2, '0') === num);
        const driver = vehicle ? AppState.drivers.find(d => d.vehicleId === vehicle.id) : null;
        document.getElementById('assign-driver-name').value = driver ? driver.name : '';
    });

    document.getElementById('btn-toggle-termin')?.addEventListener('click', () => {
        document.getElementById('termin-options')?.classList.toggle('active');
    });
    document.getElementById('btn-close-termin')?.addEventListener('click', () => {
        document.getElementById('termin-options')?.classList.remove('active');
    });
}

// ═══ TARGET EDIT BUTTONS ═══
function setupTargetEditButtons() {
    setTimeout(() => {
        const btnSave = document.getElementById('btn-save-order');
        const btnDelete = document.getElementById('btn-delete-order');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                if (window.TaxiTargetEdit) window.TaxiTargetEdit.save();
            });
        }
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                if (window.TaxiTargetEdit) window.TaxiTargetEdit.remove();
            });
        }
    }, 500);
}

// ═══ AUTOCOMPLETE ═══
function setupAutocomplete(inputId, suggestId) {
    const input = document.getElementById(inputId);
    const sug = document.getElementById(suggestId);
    if (!input || !sug) return;
    input.addEventListener('input', (e) => {
        const q = e.target.value;
        if (q.length < 2) { sug.classList.remove('active'); return; }
        const results = window.TaxiData?.searchAddresses(q) || [];
        if (!results.length) { sug.classList.remove('active'); return; }
        sug.innerHTML = results.map(a => {
            const cat = window.TaxiData.addressCategories[a.category] || { icon: 'fa-location-dot', label: a.category };
            return `<div class="autocomplete-item" data-address="${a.name}"><i class="fa-solid ${cat.icon}"></i><div><div style="font-weight:600;">${a.name}</div><div style="font-size:10px;color:#8b7aa8;">${cat.label}</div></div></div>`;
        }).join('');
        sug.classList.add('active');
        sug.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => { input.value = item.dataset.address; sug.classList.remove('active'); });
        });
    });
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !sug.contains(e.target)) sug.classList.remove('active');
    });
}

// ═══ LOCATION ICON ═══
function getLocationIcon(address) {
    const a = (address || '').toLowerCase();
    if (a.includes('hotel') || a.includes('grandi') || a.includes('swiss') || a.includes('sirius') || a.includes('emerald')) return 'hotel';
    if (a.includes('aeroport')) return 'airport';
    if (a.includes('qkuk') || a.includes('spital')) return 'hospital';
    if (a.includes('mall') || a.includes('albi') || a.includes('kalabria')) return 'mall';
    return 'other';
}

// ═══ RENDER ═══
function renderAll() {
    renderIncomingCalls();
    renderWaitingOrders();
    renderOrders();
    renderPreOrders();
    updateStats();
}

// ═══ CALLS ═══
function renderIncomingCalls() {
    const c = document.getElementById('calls-list');
    const cnt = document.getElementById('calls-count');
    if (cnt) cnt.textContent = AppState.incomingCalls.length;
    if (!c) return;
    if (!AppState.incomingCalls.length) {
        c.innerHTML = `<div style="text-align:center;padding:30px 16px;color:var(--text-muted);font-size:12px;"><i class="fa-solid fa-phone-slash" style="font-size:24px;opacity:0.3;display:block;margin-bottom:8px;"></i>Nuk ka thirrje</div>`;
        return;
    }
    c.innerHTML = AppState.incomingCalls.map(call => `
        <div class="call-card ${call.ringing ? 'ringing' : ''}">
            <div class="call-header"><span class="call-phone">${call.phone}</span><span class="call-time">${call.time}</span></div>
            ${call.name ? `<div class="call-name">${call.name}</div>` : ''}
            ${call.lastAddress ? `<div class="call-location"><i class="fa-solid fa-clock-rotate-left"></i> ${call.lastAddress}</div>` : ''}
            <div class="call-actions">
                <button class="btn-accept" onclick="acceptCall(${call.id})"><i class="fa-solid fa-phone"></i> KRIJO</button>
                <button class="btn-reject" onclick="rejectCall(${call.id})"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
    `).join('');
}

function acceptCall(callId) {
    const call = AppState.incomingCalls.find(c => c.id === callId);
    if (!call) return;
    document.getElementById('client-phone').value = call.phone;
    if (call.name) document.getElementById('client-name').value = call.name;
    if (call.lastAddress) document.getElementById('pickup-address').value = call.lastAddress;
    AppState.incomingCalls = AppState.incomingCalls.filter(c => c.id !== callId);
    renderIncomingCalls();
    stopRing();
    if (window.TaxiEvents) window.TaxiEvents.emit('operator:call_taken');
}

function rejectCall(callId) {
    AppState.incomingCalls = AppState.incomingCalls.filter(c => c.id !== callId);
    renderIncomingCalls();
    stopRing();
}

// ═══ SOUND ═══
let ringInterval = null;
function playRing() {
    if (window.TaxiSound) {
        window.TaxiSound.playRing();
        return;
    }
}
function startRing() {
    if (ringInterval) return;
    playRing();
    ringInterval = setInterval(playRing, 2000);
}
function stopRing() { if (ringInterval) { clearInterval(ringInterval); ringInterval = null; } }

// ═══ WAITING ═══
function renderWaitingOrders() {
    const tb = document.getElementById('waiting-tbody');
    const cnt = document.getElementById('waiting-count');
    if (!tb) return;
    if (cnt) cnt.textContent = AppState.waitingOrders.length;
    if (!AppState.waitingOrders.length) {
        tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Asnjë porosi në pritje</td></tr>`;
        return;
    }
    tb.innerHTML = AppState.waitingOrders.map(o => {
        const wsec = Math.floor((Date.now() - (o.waitStart || Date.now())) / 1000);
        const wmin = Math.floor(wsec / 60);
        const cls = wmin < 1 ? 'fresh' : wmin < 3 ? 'medium' : 'old';
        return `<tr>
            <td><strong>#${String(o.firestoreId).slice(-6)}</strong></td>
            <td class="time">${o.time}</td>
            <td class="phone">${o.phone}</td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(o.pickup)}"></i><span>${o.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(o.destination)}"></i><span>${o.destination}</span></div></td>
            <td><span class="wait-time ${cls}">${wmin}min</span></td>
            <td><div class="action-buttons">
                <button class="action-btn auto" onclick="autoAssignWaiting('${o.firestoreId}')">AUTO</button>
                <button class="action-btn manual" onclick="manualAssignWaiting('${o.firestoreId}')">MANUAL</button>
                <button class="action-btn closest" onclick="closestAssignWaiting('${o.firestoreId}')">AFËRTI</button>
                <button class="action-btn cancel" onclick="cancelWaiting('${o.firestoreId}')">X</button>
            </div></td>
        </tr>`;
    }).join('');
}

async function autoAssignWaiting(firestoreId) {
    if (window.TaxiDispatch) {
        const result = await window.TaxiDispatch.assignOrder(firestoreId, 'auto');
        if (result) {
            showToast('success', 'Auto-caktuar', `🚗 ${result.vehicle} — ${result.driver.name}`);
        } else {
            showToast('warning', 'Nuk ka taksi', 'Të gjitha të zëna');
        }
    }
}

function manualAssignWaiting(firestoreId) {
    AppState.manualAssignOrderId = firestoreId;
    const o = AppState.waitingOrders.find(x => x.firestoreId === firestoreId);
    if (!o) return;
    const sel = document.getElementById('assign-vehicle-select');
    sel.innerHTML = '<option value="">-- Zgjedh --</option>';
    AppState.vehicles.forEach(v => {
        const d = AppState.drivers.find(x => x.vehicleId === v.id);
        const num = String(v.id).padStart(2, '0');
        const opt = document.createElement('option');
        opt.value = num;
        opt.textContent = `🚗 ${num} — ${v.plate} — ${d ? d.name : ''}`;
        sel.appendChild(opt);
    });
    const wsec = Math.floor((Date.now() - (o.waitStart || Date.now())) / 1000);
    document.getElementById('assign-wait-time').value = `${Math.floor(wsec / 60)} minuta`;
    document.getElementById('assign-driver-name').value = '';
    document.getElementById('modal-manual-assign')?.classList.add('active');
}

async function confirmManualAssign() {
    const num = document.getElementById('assign-vehicle-select').value;
    if (!num) { showToast('error', 'Gabim', 'Zgjedh një veturë'); return; }
    const firestoreId = AppState.manualAssignOrderId;
    if (!firestoreId) return;

    if (window.TaxiDispatch) {
        const result = await window.TaxiDispatch.assignOrder(firestoreId, 'manual', null, null, num);
        if (result) {
            document.getElementById('modal-manual-assign')?.classList.remove('active');
            showToast('success', 'Manual', `🚗 ${num} caktuar`);
        }
    }
}

async function closestAssignWaiting(firestoreId) {
    const o = AppState.waitingOrders.find(x => x.firestoreId === firestoreId);
    if (!o) return;
    const target = AppState.addresses.find(a => a.name === o.pickup);
    const lat = target ? target.lat : 42.6629;
    const lng = target ? target.lng : 21.1655;

    if (window.TaxiDispatch) {
        const result = await window.TaxiDispatch.assignOrder(firestoreId, 'closest', lat, lng);
        if (result) {
            showToast('success', 'Më i afërti', `🚗 ${result.vehicle} — ${result.driver.name}`);
        } else {
            showToast('warning', 'Nuk ka taksi', 'Asnjë e lirë në afërsi');
        }
    }
}

async function cancelWaiting(firestoreId) {
    if (window.TaxiOrdersBridge) {
        await window.TaxiOrdersBridge.cancelOrderFs(firestoreId);
    }
    if (window.TaxiEvents) window.TaxiEvents.emit('operator:cancelled');
    showToast('info', 'Anuluar', `Porosia u anulua`);
}

// ═══ ORDERS ═══
function renderOrders() {
    const tb = document.getElementById('orders-tbody');
    const cnt = document.getElementById('orders-count');
    if (cnt) cnt.textContent = AppState.orders.length;
    if (!tb) return;
    if (!AppState.orders.length) { tb.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">Asnjë porosi aktive</td></tr>`; return; }
    const lbl = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', delay: 'Vonesë', completed: 'Kryer', waiting: 'Pritje', arrived: 'Në vend', taximeter: 'Taksimetër', fixed: 'Fiks' };
    tb.innerHTML = AppState.orders.map(o => `
        <tr onclick="openOrderDetail('${o.firestoreId}')">
            <td><span class="status-badge ${o.status}">${lbl[o.status] || o.status}</span></td>
            <td class="time">${o.time}</td>
            <td>${o.vehicle ? `<span class="vehicle-badge">${o.vehicle}</span>` : `<span class="vehicle-badge empty">—</span>`}</td>
            <td class="phone">${o.phone}</td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(o.pickup)}"></i><span>${o.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(o.destination)}"></i><span>${o.destination}</span></div></td>
            <td>${o.driverName || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td onclick="event.stopPropagation()"><div class="row-actions">
                <button class="row-btn danger" onclick="cancelOrder('${o.firestoreId}')"><i class="fa-solid fa-xmark"></i></button>
            </div></td>
        </tr>
    `).join('');
}

function openOrderDetail(firestoreId) {
    const o = AppState.orders.find(x => x.firestoreId === firestoreId)
           || AppState.waitingOrders.find(x => x.firestoreId === firestoreId)
           || AppState.preOrders.find(x => x.firestoreId === firestoreId);
    if (!o) return;

    if (window.TaxiTargetEdit) {
        window.TaxiTargetEdit.open(o);
    }
}

async function cancelOrder(firestoreId) {
    if (window.TaxiOrdersBridge) await window.TaxiOrdersBridge.cancelOrderFs(firestoreId);
    if (window.TaxiEvents) window.TaxiEvents.emit('operator:cancelled');
    showToast('info', 'Anuluar', `Porosia u anulua`);
}

function filterOrders(q) {
    if (!q) { renderOrders(); return; }
    const lower = q.toLowerCase();
    const tb = document.getElementById('orders-tbody');
    if (!tb) return;
    const f = AppState.orders.filter(o => o.phone.includes(lower) || o.pickup.toLowerCase().includes(lower) || (o.destination || '').toLowerCase().includes(lower));
    if (!f.length) { tb.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">Nuk u gjet</td></tr>`; return; }
    const lbl = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', delay: 'Vonesë', completed: 'Kryer', waiting: 'Pritje' };
    tb.innerHTML = f.map(o => `
        <tr onclick="openOrderDetail('${o.firestoreId}')">
            <td><span class="status-badge ${o.status}">${lbl[o.status] || o.status}</span></td>
            <td class="time">${o.time}</td>
            <td>${o.vehicle ? `<span class="vehicle-badge">${o.vehicle}</span>` : '—'}</td>
            <td class="phone">${o.phone}</td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(o.pickup)}"></i><span>${o.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(o.destination)}"></i><span>${o.destination}</span></div></td>
            <td>${o.driverName || '—'}</td>
            <td onclick="event.stopPropagation()"><div class="row-actions"><button class="row-btn danger" onclick="cancelOrder('${o.firestoreId}')"><i class="fa-solid fa-xmark"></i></button></div></td>
        </tr>
    `).join('');
}

// ═══ PRE-ORDERS ═══
function renderPreOrders() {
    const tb = document.getElementById('preorders-tbody');
    const cnt = document.getElementById('preorders-count');
    if (!tb) return;
    if (cnt) cnt.textContent = AppState.preOrders.length;
    if (!AppState.preOrders.length) { tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Asnjë pre-order</td></tr>`; return; }
    tb.innerHTML = AppState.preOrders.map(o => `
        <tr onclick="openOrderDetail('${o.firestoreId}')" style="cursor:pointer;">
            <td><span class="preorder-date">${o.date || '—'}</span></td>
            <td class="time">${o.terminTime || o.time}</td>
            <td class="phone">${o.phone}</td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(o.pickup)}"></i><span>${o.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(o.destination)}"></i><span>${o.destination}</span></div></td>
            <td onclick="event.stopPropagation()">${o.vehicle ? `<span class="vehicle-badge">${o.vehicle}</span>` : '—'}</td>
            <td onclick="event.stopPropagation()"><div class="action-buttons">
                <button class="action-btn auto" onclick="activatePre('${o.firestoreId}')">AKTIVIZO</button>
                <button class="action-btn cancel" onclick="cancelPre('${o.firestoreId}')">X</button>
            </div></td>
        </tr>
    `).join('');
}

async function activatePre(firestoreId) {
    if (window.TaxiOrdersBridge) {
        await window.TaxiOrdersBridge.assignOrder(firestoreId, { status: 'waiting' });
    }
    showToast('info', 'Aktivizuar', `Pre-order u aktivizua`);
}

async function cancelPre(firestoreId) {
    if (window.TaxiOrdersBridge) await window.TaxiOrdersBridge.cancelOrderFs(firestoreId);
    if (window.TaxiEvents) window.TaxiEvents.emit('operator:cancelled');
    showToast('info', 'Anuluar', `Pre-order u anulua`);
}

// ═══ NEW ORDER ═══
function submitOrder() {
    const phone = document.getElementById('client-phone')?.value.trim();
    const name = document.getElementById('client-name')?.value.trim();
    const pickup = document.getElementById('pickup-address')?.value.trim();
    const dest = document.getElementById('destination-address')?.value.trim();
    const zone = document.getElementById('order-zone')?.value;
    const tariff = document.getElementById('order-tariff')?.value;
    const remark = document.getElementById('order-note')?.value.trim();

    if (!phone || !pickup) { showToast('error', 'Gabim', 'Plotëso numrin dhe adresën'); return; }

    const terminActive = document.getElementById('termin-options')?.classList.contains('active');
    const terminDate = document.getElementById('termin-date')?.value;
    const terminTime = document.getElementById('termin-time')?.value;
    const terminLead = parseInt(document.getElementById('termin-lead')?.value) || 15;
    const terminRepeat = document.getElementById('termin-repeat')?.value || 'none';
    const isPreorder = terminActive && terminDate && terminTime;

    if (isPreorder) {
        const terminDT = new Date(`${terminDate}T${terminTime}`);
        if (terminDT < new Date()) { showToast('error', 'Gabim', 'Data është në të kaluarën'); return; }
    }

    if (window.TaxiEvents) window.TaxiEvents.emit('operator:call_taken');

    if (isPreorder) {
        const dateStr = terminDate.split('-').reverse().slice(0, 2).join('/');
        if (window.TaxiOrdersBridge) {
            window.TaxiOrdersBridge.createFromData({
                phone, name: name || 'Klient', pickup, destination: dest || 'N/A',
                zone: zone === 'auto' ? 'zona1' : zone, tariff: tariff || 'standard',
                remark: remark || '', status: 'preorder',
                isPreorder: true, terminDate: dateStr, terminTime: terminTime,
                terminLead, terminRepeat,
                terminDateTime: new Date(`${terminDate}T${terminTime}`).getTime()
            });
        }
        showToast('success', 'Termini u ruajt', `${phone} — ${dateStr} në ${terminTime}`);
    } else {
        if (window.TaxiOrdersBridge) {
            window.TaxiOrdersBridge.createFromData({
                phone, name: name || 'Klient', pickup, destination: dest || 'N/A',
                zone: zone === 'auto' ? 'zona1' : zone, tariff: tariff || 'standard',
                remark: remark || '', status: 'waiting'
            });
        }
        showToast('success', 'Porosia u shtua', `${phone} — ${pickup}`);
    }

    document.getElementById('order-form')?.reset();
    document.getElementById('manual-vehicle-picker').style.display = 'none';
    document.getElementById('termin-options')?.classList.remove('active');
    const chp = document.getElementById('client-history-panel');
    if (chp) chp.style.display = 'none';
}

// ═══ STATS ═══
function updateStats() {
    const online = AppState.drivers.filter(d => d.mode === 'free').length;
    const pending = AppState.waitingOrders.length;
    const trips = AppState.orders.length;
    const revenue = AppState.orders.reduce((s, o) => s + (o.price || (o.tariff === 'airport' ? 15 : 4.5)), 0);
    setText('stat-online', online);
    setText('stat-pending', pending);
    setText('stat-trips', trips);
    setText('stat-revenue', `€${revenue.toFixed(0)}`);
}

function setText(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }

// ═══ TOAST ═══
function showToast(type, title, msg) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${msg}</div></div>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(400px)'; setTimeout(() => t.remove(), 300); }, 3500);

    if (window.TaxiSound) {
        if (type === 'success') window.TaxiSound.playSuccess();
        else if (type === 'error') window.TaxiSound.playError();
        else window.TaxiSound.playNotification();
    }
}

// ═══ SIMULATION ═══
function startCallSimulation() {
    setTimeout(() => generateCall(), 5000);
    setInterval(() => { if (AppState.incomingCalls.length < 3) generateCall(); }, 30000);
}

function generateCall() {
    const phones = ['+383 44 111 001', '+383 44 222 002', '+383 49 333 003', '+383 45 444 004'];
    const names = ['Klient i Ri', 'Ardit Krasniqi', 'Blerim Hoxha', 'Driton Berisha'];
    const addrs = ['Grand Hotel Prishtina', 'Newborn Monument', 'Rr. UÇK Dardani', 'Albi Mall'];
    const i = Math.floor(Math.random() * phones.length);
    const call = {
        id: Date.now(), phone: phones[i],
        name: Math.random() > 0.4 ? names[i] : '',
        lastAddress: Math.random() > 0.5 ? addrs[Math.floor(Math.random() * addrs.length)] : '',
        time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
        ringing: true
    };
    AppState.incomingCalls.push(call);
    renderIncomingCalls();
    startRing();
    setTimeout(() => { call.ringing = false; renderIncomingCalls(); }, 5000);
}

function startOrderSimulation() {
    setInterval(() => {
        AppState.vehicleMarkers.forEach((m, id) => {
            const d = AppState.drivers.find(x => x.id === id);
            if (!d || d.mode === 'inactive') return;
            const p = m.getLatLng();
            const nl = p.lat + (Math.random() - 0.5) * 0.0015;
            const ng = p.lng + (Math.random() - 0.5) * 0.0015;
            m.setLatLng([nl, ng]);
            d.lat = nl; d.lng = ng;
        });
    }, 4000);
    setInterval(() => { if (AppState.waitingOrders.length > 0) renderWaitingOrders(); }, 10000);
}

// ═══ GLOBAL ═══
window.acceptCall = acceptCall;
window.rejectCall = rejectCall;
window.autoAssignWaiting = autoAssignWaiting;
window.manualAssignWaiting = manualAssignWaiting;
window.closestAssignWaiting = closestAssignWaiting;
window.cancelWaiting = cancelWaiting;
window.cancelOrder = cancelOrder;
window.openOrderDetail = openOrderDetail;
window.activatePre = activatePre;
window.cancelPre = cancelPre;

console.log('✅ TaxiDispatch Pro Ready');
