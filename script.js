'use strict';

const AppState = {
    orders: [], waitingOrders: [], preOrders: [], completedOrders: [], incomingCalls: [], messages: [],
    drivers: [], vehicles: [], zones: [], addresses: [], config: {},
    map: null, vehicleMarkers: new Map(), currentDispatchMode: 'auto', soundEnabled: true,
    currentPage: 'dispatch',
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
    setupNavRail();
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

    // Aktivizo context menu
    setTimeout(() => {
        if (window.TaxiMapContextMenu) {
            window.TaxiMapContextMenu.init();
            window.TaxiMapContextMenu.attachToMap(AppState.map);
        }
    }, 500);
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
                <button class="btn-primary" style="width:100%;margin-top:8px;padding:6px;font-size:11px;" onclick="openControlUnit('${driver.id}')">
                    <i class="fa-solid fa-sliders"></i> Kontroll
                </button>
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

    // Panel min/max
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

    // Butonat e modaleve
    setTimeout(() => {
        document.getElementById('btn-cancel-order')?.addEventListener('click', async () => {
            const firestoreId = window.TaxiTargetEdit?.getCurrentOrderId?.();
            if (!firestoreId) { showToast('error', 'Gabim', 'Nuk ka porosi aktive'); return; }
            if (!confirm('A jeni i sigurt që dëshironi të ANULONI porosinë?')) return;
            if (window.TaxiOrdersBridge) await window.TaxiOrdersBridge.cancelOrderFs(firestoreId);
            if (window.TaxiEvents) window.TaxiEvents.emit('operator:cancelled');
            document.getElementById('modal-order-detail')?.classList.remove('active');
            showToast('info', 'Anuluar', 'Porosia u anulua');
        });

        document.getElementById('btn-complete-order')?.addEventListener('click', () => completeOrderFromModal());
    }, 500);
}

// ═══ NAV RAIL ═══
function setupNavRail() {
    const railItems = document.querySelectorAll('.rail-nav .rail-item');
    railItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            railItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const nav = item.dataset.nav;
            switchPage(nav);
        });
    });
}

// ═══ ROUTER ═══
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.querySelector(`.page[data-page="${pageName}"]`);
    if (!page) return;
    page.classList.add('active');
    AppState.currentPage = pageName;

    document.querySelectorAll('.rail-nav .rail-item').forEach(i => {
        i.classList.toggle('active', i.dataset.nav === pageName);
    });

    // Render sipas faqes
    if (pageName === 'calls') { if (window.TaxiCallCenter) window.TaxiCallCenter.render(); }
    else if (pageName === 'orders') renderOrdersPage();
    else if (pageName === 'drivers') renderDriversPage();
    else if (pageName === 'vehicles') renderVehiclesPage();
    else if (pageName === 'map') renderMapPage();
    else if (pageName === 'zones') { if (window.TaxiZonesUI) window.TaxiZonesUI.renderPage(); }
    else if (pageName === 'clients') renderClientsPage();
    else if (pageName === 'history') { if (window.TaxiTargetHistory) window.TaxiTargetHistory.renderPage('today'); }
    else if (pageName === 'reports') renderReportsPage();
    else if (pageName === 'blacklist') { if (window.TaxiBlacklist) window.TaxiBlacklist.renderPage(); }
    else if (pageName === 'settings') renderSettingsPage();
    else if (pageName === 'finance') renderFinancePage();

    if (pageName === 'dispatch') {
        setTimeout(() => AppState.map?.invalidateSize(), 300);
    }
}

// ═══ PAGE RENDERERS ═══

function renderOrdersPage() {
    const el = document.querySelector('.page[data-page="orders"]');
    if (!el) return;
    const all = [...AppState.orders, ...AppState.waitingOrders, ...AppState.preOrders, ...AppState.completedOrders];
    const completed = AppState.completedOrders || [];
    const revenue = completed.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

    el.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <i class="fa-solid fa-clipboard-list"></i>
                <div><h2>Porositë</h2><p>Historiku i plotë · ${all.length} total</p></div>
            </div>
            <div class="filter-bar">
                <button class="filter-btn active" onclick="filterOrdersPage('all', this)">Të gjitha</button>
                <button class="filter-btn" onclick="filterOrdersPage('active', this)">Aktive</button>
                <button class="filter-btn" onclick="filterOrdersPage('waiting', this)">Në pritje</button>
                <button class="filter-btn" onclick="filterOrdersPage('preorder', this)">Me termin</button>
                <button class="filter-btn" onclick="filterOrdersPage('completed', this)">Të përfunduara</button>
            </div>
        </div>
        <div class="kpi-grid">
            <div class="kpi-card green"><div class="kpi-label"><i class="fa-solid fa-euro-sign"></i> Të ardhura</div><div class="kpi-value green">€${revenue.toFixed(2)}</div><div class="kpi-sub">${completed.length} porosi</div></div>
            <div class="kpi-card blue"><div class="kpi-label"><i class="fa-solid fa-car"></i> Aktive</div><div class="kpi-value blue">${AppState.orders.length}</div></div>
            <div class="kpi-card yellow"><div class="kpi-label"><i class="fa-solid fa-hourglass-half"></i> Në pritje</div><div class="kpi-value yellow">${AppState.waitingOrders.length}</div></div>
            <div class="kpi-card pink"><div class="kpi-label"><i class="fa-solid fa-check"></i> Të përfunduara</div><div class="kpi-value pink">${completed.length}</div></div>
        </div>
        <div class="page-table-wrap">
            <table class="orders-table">
                <thead><tr><th>Ora</th><th>Statusi</th><th>Vetura</th><th>Telefon</th><th>Marrja</th><th>Destinacioni</th><th>Shoferi</th><th>Shënim</th><th>Çmimi</th></tr></thead>
                <tbody id="orders-page-tbody">${renderOrdersPageRows(all)}</tbody>
            </table>
        </div>
    `;
}

function renderOrdersPageRows(orders) {
    if (!orders.length) return `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted);">Asnjë porosi</td></tr>`;
    const lbl = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', delay: 'Vonesë', completed: 'Përfunduar', waiting: 'Në pritje', arrived: 'Në vend', taximeter: 'Taksimetër', fixed: 'Fiks', preorder: 'Me termin', cancelled: 'Anuluar' };
    return orders.map(o => `
        <tr onclick="openOrderDetail('${o.firestoreId || o.id}')" style="cursor:pointer;">
            <td class="time">${o.createdTimeStr || o.time || '—'}</td>
            <td><span class="status-badge ${o.status}">${lbl[o.status] || o.status}</span></td>
            <td>${o.vehicleNum || o.vehicle ? `<span class="vehicle-badge">${o.vehicleNum || o.vehicle}</span>` : '—'}</td>
            <td class="phone">${o.phone}</td>
            <td class="location">${o.pickup}</td>
            <td class="location">${o.destination || '—'}</td>
            <td>${o.driverName || '—'}</td>
            <td class="remark-cell">${o.remark || '—'}</td>
            <td style="color:var(--accent-green);font-weight:800;font-family:var(--font-mono);">${o.price ? '€' + parseFloat(o.price).toFixed(2) : '—'}</td>
        </tr>
    `).join('');
}

function filterOrdersPage(filter, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    let list = [];
    if (filter === 'all') list = [...AppState.orders, ...AppState.waitingOrders, ...AppState.preOrders, ...AppState.completedOrders];
    else if (filter === 'active') list = AppState.orders;
    else if (filter === 'waiting') list = AppState.waitingOrders;
    else if (filter === 'preorder') list = AppState.preOrders;
    else if (filter === 'completed') list = AppState.completedOrders;
    const tbody = document.getElementById('orders-page-tbody');
    if (tbody) tbody.innerHTML = renderOrdersPageRows(list);
}

function renderDriversPage() {
    const el = document.querySelector('.page[data-page="drivers"]');
    if (!el) return;
    const drivers = AppState.drivers;
    const active = drivers.filter(d => d.mode !== 'inactive').length;
    const free = drivers.filter(d => d.mode === 'free').length;
    const busy = drivers.filter(d => d.mode === 'taximeter' || d.mode === 'fixed').length;

    el.innerHTML = `
        <div class="page-header">
            <div class="page-title"><i class="fa-solid fa-users"></i><div><h2>Shoferët</h2><p>${drivers.length} shoferë</p></div></div>
        </div>
        <div class="kpi-grid">
            <div class="kpi-card green"><div class="kpi-label">Aktiv</div><div class="kpi-value green">${active}</div></div>
            <div class="kpi-card blue"><div class="kpi-label">Të lirë</div><div class="kpi-value blue">${free}</div></div>
            <div class="kpi-card yellow"><div class="kpi-label">Në udhëtim</div><div class="kpi-value yellow">${busy}</div></div>
            <div class="kpi-card pink"><div class="kpi-label">Joaktiv</div><div class="kpi-value pink">${drivers.length - active}</div></div>
        </div>
        <div class="cards-grid">
            ${drivers.map(d => {
                const v = AppState.vehicles.find(x => x.id === d.vehicleId);
                const num = String(d.vehicleId || 0).padStart(2, '0');
                const modeLabel = { free: 'Lirë', taximeter: 'Në udhëtim', fixed: 'Fiks', pause: 'Pushim', inactive: 'Joaktiv' }[d.mode] || 'Joaktiv';
                return `
                    <div class="info-card">
                        <div class="info-card-header">
                            <div class="info-card-avatar ${d.mode}">${d.avatar || d.name?.slice(0,2).toUpperCase() || '?'}</div>
                            <div style="flex:1;"><div class="info-card-name">${d.name}</div><div class="info-card-sub">🚗 ${num} · ${v ? v.plate : 'N/A'}</div></div>
                            <button class="filter-btn" style="padding:5px 10px;font-size:10px;" onclick="openControlUnit('${d.id}')">
                                <i class="fa-solid fa-sliders"></i>
                            </button>
                        </div>
                        <div class="info-card-body">
                            <div class="info-card-row"><span><i class="fa-solid fa-circle" style="color:${getModeColor(d.mode)};font-size:8px;"></i> Statusi</span><span>${modeLabel}</span></div>
                            <div class="info-card-row"><span><i class="fa-solid fa-star"></i> Vlerësimi</span><span>⭐ ${d.rating || '5.0'}</span></div>
                            <div class="info-card-row"><span><i class="fa-solid fa-phone"></i> Telefon</span><span>${d.phone || '—'}</span></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderVehiclesPage() {
    const el = document.querySelector('.page[data-page="vehicles"]');
    if (!el) return;
    const vehicles = AppState.vehicles;
    const active = vehicles.filter(v => {
        const d = AppState.drivers.find(x => x.vehicleId === v.id);
        return d && d.mode !== 'inactive';
    }).length;

    el.innerHTML = `
        <div class="page-header">
            <div class="page-title"><i class="fa-solid fa-car-side"></i><div><h2>Veturat</h2><p>${vehicles.length} vetura</p></div></div>
        </div>
        <div class="kpi-grid">
            <div class="kpi-card green"><div class="kpi-label">Aktive</div><div class="kpi-value green">${active}</div></div>
            <div class="kpi-card pink"><div class="kpi-label">Joaktive</div><div class="kpi-value pink">${vehicles.length - active}</div></div>
        </div>
        <div class="page-table-wrap">
            <table class="orders-table">
                <thead><tr><th>Nr.</th><th>Targa</th><th>Modeli</th><th>Shoferi</th><th>Statusi</th></tr></thead>
                <tbody>
                    ${vehicles.map(v => {
                        const d = AppState.drivers.find(x => x.vehicleId === v.id);
                        const num = String(v.id).padStart(2, '0');
                        const modeLabel = d ? ({ free: '🟢 Lirë', taximeter: '🔵 Në udhëtim', fixed: '🔴 Fiks', pause: '🟡 Pushim', inactive: '⚪ Joaktiv' }[d.mode] || d.mode) : '—';
                        return `<tr>
                            <td><span class="vehicle-badge">${num}</span></td>
                            <td><strong style="font-family:var(--font-mono);color:var(--accent-purple);">${v.plate}</strong></td>
                            <td>${v.model}</td>
                            <td>${d ? d.name : '—'}</td>
                            <td>${modeLabel}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderMapPage() {
    const el = document.querySelector('.page[data-page="map"]');
    if (!el) return;
    el.innerHTML = `
        <div class="page-header">
            <div class="page-title"><i class="fa-solid fa-map"></i><div><h2>Harta Live</h2><p>${AppState.drivers.length} vetura live</p></div></div>
            <div class="filter-bar">
                <button class="filter-btn" onclick="if(window.TaxiRewindUI) TaxiRewindUI.openPanel()">
                    <i class="fa-solid fa-clock-rotate-left"></i> Rewind
                </button>
            </div>
        </div>
        <div class="page-table-wrap" style="padding:0;height:calc(100% - 100px);">
            <div id="map-page-container" style="width:100%;height:100%;border-radius:var(--radius-lg);"></div>
        </div>
    `;

    setTimeout(() => {
        const el2 = document.getElementById('map-page-container');
        if (!el2 || !window.L) return;
        const map2 = L.map('map-page-container').setView([42.6629, 21.1655], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(map2);
        AppState.drivers.forEach(driver => {
            const vehicle = AppState.vehicles.find(v => v.id === driver.vehicleId);
            if (!vehicle) return;
            const num = String(driver.vehicleId).padStart(2, '0');
            const icon = L.divIcon({
                className: 'vehicle-marker',
                html: `<div class="vehicle-marker-inner ${driver.mode}" data-number="${num}"></div>`,
                iconSize: [28, 28], iconAnchor: [14, 14]
            });
            L.marker([driver.lat, driver.lng], { icon }).addTo(map2);
        });
    }, 300);
}

function renderClientsPage() {
    const el = document.querySelector('.page[data-page="clients"]');
    if (!el) return;
    el.innerHTML = `
        <div class="page-header">
            <div class="page-title"><i class="fa-solid fa-address-book"></i><div><h2>Klientët</h2><p>Kërkim historiku</p></div></div>
        </div>
        <div class="page-table-wrap" style="padding:20px;">
            <div style="text-align:center;padding:40px;">
                <i class="fa-solid fa-search" style="font-size:48px;opacity:0.3;color:var(--accent-purple);"></i>
                <h3 style="margin-top:16px;color:var(--text-secondary);">Kërko klientin</h3>
                <p style="color:var(--text-muted);font-size:12px;margin-top:6px;">Shkruaj numrin e telefonit</p>
                <div style="max-width:400px;margin:20px auto 0;">
                    <input type="tel" id="clients-search" placeholder="+383 44 123 456" class="input-field" style="text-align:center;font-size:16px;padding:14px;">
                </div>
                <div id="clients-result" style="margin-top:20px;"></div>
            </div>
        </div>
    `;
    const search = document.getElementById('clients-search');
    let timer;
    search.addEventListener('input', (e) => {
        clearTimeout(timer);
        const val = e.target.value.trim();
        if (val.length < 6) { document.getElementById('clients-result').innerHTML = ''; return; }
        timer = setTimeout(async () => {
            if (window.TaxiClients) {
                const r = await window.TaxiClients.searchByPhone(val);
                const result = document.getElementById('clients-result');
                if (!r || !r.orders.length) {
                    result.innerHTML = '<p style="color:var(--text-muted);">Klient i re</p>';
                    return;
                }
                const s = r.stats;
                result.innerHTML = `
                    <div class="kpi-grid" style="max-width:600px;margin:0 auto;">
                        <div class="kpi-card"><div class="kpi-label">Totali</div><div class="kpi-value">${s.total}</div></div>
                        <div class="kpi-card green"><div class="kpi-label">Realizuar</div><div class="kpi-value green">${s.completed}</div></div>
                        <div class="kpi-card pink"><div class="kpi-label">Të ardhura</div><div class="kpi-value pink">€${s.revenue.toFixed(2)}</div></div>
                    </div>
                `;
            }
        }, 500);
    });
}

function renderReportsPage() {
    const el = document.querySelector('.page[data-page="reports"]');
    if (!el) return;
    const all = [...AppState.orders, ...AppState.completedOrders, ...AppState.waitingOrders];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = all.filter(o => (o.createdAtLocal || 0) >= today.getTime());
    const todayRevenue = todayOrders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

    el.innerHTML = `
        <div class="page-header">
            <div class="page-title"><i class="fa-solid fa-chart-line"></i><div><h2>Raporte</h2><p>Statistika</p></div></div>
        </div>
        <div class="kpi-grid">
            <div class="kpi-card green"><div class="kpi-label">Sot</div><div class="kpi-value green">€${todayRevenue.toFixed(2)}</div><div class="kpi-sub">${todayOrders.length} porosi</div></div>
        </div>
        <div class="page-table-wrap" style="padding:20px;">
            <h3 style="font-size:14px;margin-bottom:12px;color:var(--accent-purple);text-transform:uppercase;">Porositë sot</h3>
            <table class="orders-table">
                <thead><tr><th>Ora</th><th>Telefon</th><th>Marrja</th><th>Çmimi</th><th>Statusi</th></tr></thead>
                <tbody>
                    ${todayOrders.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">Nuk ka porosi sot</td></tr>' :
                        todayOrders.map(o => `
                            <tr>
                                <td class="time">${o.time || o.createdTimeStr}</td>
                                <td class="phone">${o.phone}</td>
                                <td>${o.pickup}</td>
                                <td style="color:var(--accent-green);font-weight:800;">${o.price ? '€' + parseFloat(o.price).toFixed(2) : '—'}</td>
                                <td><span class="status-badge ${o.status}">${o.status}</span></td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderFinancePage() {
    const el = document.querySelector('.page[data-page="finance"]');
    if (!el) return;
    const completed = AppState.completedOrders || [];
    const totalRevenue = completed.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
    const avgPrice = completed.length ? totalRevenue / completed.length : 0;

    el.innerHTML = `
        <div class="page-header">
            <div class="page-title"><i class="fa-solid fa-coins"></i><div><h2>Financa</h2><p>Përmbledhje</p></div></div>
        </div>
        <div class="kpi-grid">
            <div class="kpi-card green"><div class="kpi-label">Total</div><div class="kpi-value green">€${totalRevenue.toFixed(2)}</div><div class="kpi-sub">${completed.length} porosi</div></div>
            <div class="kpi-card blue"><div class="kpi-label">Mesatarja</div><div class="kpi-value blue">€${avgPrice.toFixed(2)}</div></div>
            <div class="kpi-card pink"><div class="kpi-label">Komisioni (10%)</div><div class="kpi-value pink">€${(totalRevenue * 0.10).toFixed(2)}</div></div>
            <div class="kpi-card yellow"><div class="kpi-label">Për shoferët</div><div class="kpi-value yellow">€${(totalRevenue * 0.90).toFixed(2)}</div></div>
        </div>
    `;
}

function renderSettingsPage() {
    const el = document.querySelector('.page[data-page="settings"]');
    if (!el) return;
    el.innerHTML = `
        <div class="page-header">
            <div class="page-title"><i class="fa-solid fa-sliders"></i><div><h2>Cilësimet</h2></div></div>
        </div>
        <div class="cards-grid">
            <div class="info-card">
                <div class="info-card-header">
                    <div class="info-card-avatar"><i class="fa-solid fa-palette"></i></div>
                    <div><div class="info-card-name">Tema</div><div class="info-card-sub">Dark/Light</div></div>
                </div>
                <div class="info-card-body">
                    <div class="info-card-row"><span>Mode</span><span>${window.TaxiDarkMode?.get() || 'dark'}</span></div>
                </div>
            </div>
            <div class="info-card">
                <div class="info-card-header">
                    <div class="info-card-avatar"><i class="fa-solid fa-tv"></i></div>
                    <div><div class="info-card-name">TV Display</div><div class="info-card-sub">Ekrani i zyrës</div></div>
                </div>
                <div class="info-card-body">
                    <button class="btn-primary" style="width:100%;" onclick="window.open('tv.html', '_blank')">
                        <i class="fa-solid fa-external-link"></i> Hap TV Display
                    </button>
                </div>
            </div>
            <div class="info-card">
                <div class="info-card-header">
                    <div class="info-card-avatar"><i class="fa-solid fa-database"></i></div>
                    <div><div class="info-card-name">Backup</div></div>
                </div>
                <div class="info-card-body">
                    <div class="info-card-row"><span>Firebase</span><span style="color:var(--accent-green);">✅ Lidhur</span></div>
                    <button class="btn-primary" onclick="backupData()" style="margin-top:8px;width:100%;">
                        <i class="fa-solid fa-download"></i> Shkarko
                    </button>
                </div>
            </div>
        </div>
    `;
}

function backupData() {
    if (window.TaxiBackup) {
        window.TaxiBackup.download();
        showToast('success', 'Backup', 'U shkarkua');
    }
}

// ═══ CONTROL UNIT ═══
function openControlUnit(driverId) {
    if (window.TaxiControlUnit?.openControlModal) {
        window.TaxiControlUnit.openControlModal(driverId);
    } else {
        showToast('warning', 'Kontrolli', 'Nuk është gati');
    }
}

// ═══ TARGET EDIT ═══
function setupTargetEditButtons() {
    setTimeout(() => {
        const btnSave = document.getElementById('btn-save-order');
        const btnDelete = document.getElementById('btn-delete-order');
        if (btnSave) btnSave.addEventListener('click', () => window.TaxiTargetEdit?.save());
        if (btnDelete) btnDelete.addEventListener('click', () => window.TaxiTargetEdit?.remove());
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

// ═══ RENDER ALL ═══
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
    c.innerHTML = AppState.incomingCalls.map((call, index) => `
        <div class="call-card ${call.ringing ? 'ringing' : ''}" onclick="acceptCall(${call.id})" style="cursor:pointer;position:relative;">
            ${index === 0 ? `<div style="position:absolute;top:6px;right:8px;background:var(--accent-green);color:white;font-size:8px;font-weight:800;padding:2px 6px;border-radius:4px;letter-spacing:0.5px;">F1</div>` : ''}
            <div class="call-header"><span class="call-phone">${call.phone}</span><span class="call-time">${call.time}</span></div>
            ${call.name ? `<div class="call-name">${call.name}</div>` : ''}
            ${call.lastAddress ? `<div class="call-location"><i class="fa-solid fa-clock-rotate-left"></i> ${call.lastAddress}</div>` : ''}
            <div class="call-actions">
                <button class="btn-accept" onclick="event.stopPropagation(); acceptCall(${call.id})"><i class="fa-solid fa-phone"></i> KRIJO</button>
                <button class="btn-reject" onclick="event.stopPropagation(); rejectCall(${call.id})"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
    `).join('');
}

function acceptCall(callId) {
    const call = AppState.incomingCalls.find(c => c.id === callId);
    if (!call) return;
    const phoneField = document.getElementById('client-phone');
    const nameField = document.getElementById('client-name');
    const pickupField = document.getElementById('pickup-address');

    if (phoneField) phoneField.value = call.phone || '';
    if (nameField && call.name) nameField.value = call.name;
    if (pickupField && call.lastAddress) pickupField.value = call.lastAddress;

    AppState.incomingCalls = AppState.incomingCalls.filter(c => c.id !== callId);
    renderIncomingCalls();
    stopRing();
    if (window.TaxiSound) window.TaxiSound.stopRing();

    if (window.TaxiCallCenter) {
        window.TaxiCallCenter.addToQueue({
            id: call.id, phone: call.phone, name: call.name, lastAddress: call.lastAddress
        });
    }

    if (phoneField) { phoneField.focus(); phoneField.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    showToast('success', '📞 Thirrja u pranua', `${call.phone} — plotëso porosinë`);
    if (window.TaxiEvents) window.TaxiEvents.emit('operator:call_taken');
}

function rejectCall(callId) {
    const call = AppState.incomingCalls.find(c => c.id === callId);
    AppState.incomingCalls = AppState.incomingCalls.filter(c => c.id !== callId);
    renderIncomingCalls();
    stopRing();
    if (window.TaxiSound) window.TaxiSound.stopRing();
    if (window.TaxiCallCenter && call) window.TaxiCallCenter.missCall(call);
}

// ═══ SOUND ═══
let ringInterval = null;
function playRing() {
    if (window.TaxiSound) { window.TaxiSound.playRing(); return; }
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
        tb.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Asnjë porosi në pritje</td></tr>`;
        return;
    }
    tb.innerHTML = AppState.waitingOrders.map(o => {
        const wsec = Math.floor((Date.now() - (o.waitStart || Date.now())) / 1000);
        const wmin = Math.floor(wsec / 60);
        const cls = wmin < 1 ? 'fresh' : wmin < 3 ? 'medium' : 'old';
        return `<tr onclick="openOrderDetail('${o.firestoreId || o.id}')" class="row-waiting" style="cursor:pointer;">
            <td><strong>#${String(o.firestoreId || o.id).slice(-6)}</strong></td>
            <td class="time">${o.time || o.createdTimeStr}</td>
            <td class="phone">${o.phone}</td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(o.pickup)}"></i><span>${o.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(o.destination)}"></i><span>${o.destination}</span></div></td>
            <td class="remark-cell ${o.remark ? '' : 'empty'}">${o.remark || '—'}</td>
            <td><span class="wait-time ${cls}">${wmin}min</span></td>
            <td onclick="event.stopPropagation()"><div class="action-buttons">
                <button class="action-btn auto" onclick="autoAssignWaiting('${o.firestoreId || o.id}')">AUTO</button>
                <button class="action-btn manual" onclick="manualAssignWaiting('${o.firestoreId || o.id}')">MANUAL</button>
                <button class="action-btn closest" onclick="closestAssignWaiting('${o.firestoreId || o.id}')">AFËRTI</button>
            </div></td>
        </tr>`;
    }).join('');
}

async function autoAssignWaiting(firestoreId) {
    if (window.TaxiDispatch) {
        const result = await window.TaxiDispatch.assignOrder(firestoreId, 'auto');
        if (result) showToast('success', 'Auto-caktuar', `🚗 ${result.vehicle} — ${result.driver.name}`);
        else showToast('warning', 'Nuk ka taksi', 'Të gjitha të zëna');
    }
}

function manualAssignWaiting(firestoreId) {
    AppState.manualAssignOrderId = firestoreId;
    const o = AppState.waitingOrders.find(x => (x.firestoreId || x.id) === firestoreId);
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
    const o = AppState.waitingOrders.find(x => (x.firestoreId || x.id) === firestoreId);
    if (!o) return;
    const target = AppState.addresses.find(a => a.name === o.pickup);
    const lat = target ? target.lat : 42.6629;
    const lng = target ? target.lng : 21.1655;
    if (window.TaxiDispatch) {
        const result = await window.TaxiDispatch.assignOrder(firestoreId, 'closest', lat, lng);
        if (result) showToast('success', 'Më i afërti', `🚗 ${result.vehicle} — ${result.driver.name}`);
        else showToast('warning', 'Nuk ka taksi', 'Asnjë e lirë');
    }
}

// ═══ ORDERS ═══
function renderOrders() {
    const tb = document.getElementById('orders-tbody');
    const cnt = document.getElementById('orders-count');
    if (cnt) cnt.textContent = AppState.orders.length;
    if (!tb) return;
    if (!AppState.orders.length) { tb.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text-muted);">Asnjë porosi aktive</td></tr>`; return; }

    const lbl = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', delay: 'Vonesë', completed: 'Kryer', waiting: 'Pritje', arrived: 'Në vend', taximeter: 'Taksimetër', fixed: 'Fiks' };

    tb.innerHTML = AppState.orders.map(o => {
        let rowClass = '';
        if (o.status === 'waiting' || o.status === 'pending' || o.status === 'new') rowClass = 'row-waiting';
        else if (o.status === 'assigned') rowClass = 'row-assigned';
        else if (o.status === 'onroute' || o.status === 'delay') rowClass = 'row-onroute';
        else if (o.status === 'arrived') rowClass = 'row-arrived';
        else if (o.status === 'taximeter') rowClass = 'row-taximeter';
        else if (o.status === 'fixed') rowClass = 'row-fixed';
        else if (o.status === 'cancelled') rowClass = 'row-cancelled';
        else if (o.status === 'completed') rowClass = 'row-completed';

        let finishBtn = '';
        if (o.status === 'fixed') {
            finishBtn = `<button class="btn-finish" onclick="event.stopPropagation(); finishOrder('${o.firestoreId || o.id}')"><i class="fa-solid fa-lock"></i> PËRFUNDO FIKS</button>`;
        } else if (o.status === 'taximeter') {
            finishBtn = `<button class="btn-finish" onclick="event.stopPropagation(); finishOrder('${o.firestoreId || o.id}')"><i class="fa-solid fa-gauge"></i> PËRFUNDO</button>`;
        } else if (o.status === 'onroute' || o.status === 'arrived') {
            finishBtn = `<button class="btn-finish" onclick="event.stopPropagation(); finishOrder('${o.firestoreId || o.id}')"><i class="fa-solid fa-check"></i> PËRFUNDO</button>`;
        }

        const hasEta = o.driverId && (o.status === 'assigned' || o.status === 'onroute' || o.status === 'arrived');
        const etaCell = hasEta ? `<span class="eta-badge" data-eta-order="${o.firestoreId || o.id}"><i class="fa-solid fa-spinner fa-spin"></i></span>` : `<span class="eta-badge empty">—</span>`;

        return `<tr onclick="openOrderDetail('${o.firestoreId || o.id}')" class="${rowClass}" style="cursor:pointer;">
            <td><span class="status-badge ${o.status}">${lbl[o.status] || o.status}</span></td>
            <td class="time">${o.time || o.createdTimeStr}</td>
            <td>${o.vehicle || o.vehicleNum ? `<span class="vehicle-badge">${o.vehicle || o.vehicleNum}</span>` : `<span class="vehicle-badge empty">—</span>`}</td>
            <td class="phone">${o.phone}</td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-location-dot ${getLocationIcon(o.pickup)}"></i><span>${o.pickup}</span></div></td>
            <td class="location"><div class="location-cell"><i class="fa-solid fa-flag-checkered ${getLocationIcon(o.destination)}"></i><span>${o.destination}</span></div></td>
            <td>${o.driverName || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td>${etaCell}</td>
            <td class="remark-cell ${o.remark ? '' : 'empty'}">${o.remark || '—'}</td>
            <td class="actions-cell" onclick="event.stopPropagation()">
                <div class="row-actions">${finishBtn}</div>
            </td>
        </tr>`;
    }).join('');

    setTimeout(updateEtasForOrders, 500);
}

// ═══ ETA ═══
async function updateEtasForOrders() {
    if (!window.TaxiMaps) return;
    const activeOrders = AppState.orders.filter(o => o.driverId && (o.status === 'assigned' || o.status === 'onroute' || o.status === 'arrived'));
    for (const o of activeOrders) {
        const etaEl = document.querySelector(`[data-eta-order="${o.firestoreId || o.id}"]`);
        if (!etaEl) continue;
        try {
            const eta = await window.TaxiMaps.getEtaForOrder(o);
            if (!eta) { etaEl.innerHTML = '<span style="color:var(--text-muted);font-size:10px;">—</span>'; continue; }
            const trafficIcon = eta.hasTraffic ? (eta.trafficDelay > 120 ? '🔴' : eta.trafficDelay > 60 ? '🟡' : '🟢') : '⚪';
            etaEl.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;font-family:var(--font-mono);color:var(--accent-cyan);">${trafficIcon} ${eta.etaMinutes}min</span>`;
        } catch (e) { etaEl.innerHTML = '—'; }
    }
}
setInterval(() => { if (window.TaxiMaps) updateEtasForOrders(); }, 60000);

// ═══ FINISH ORDER ═══
async function finishOrder(firestoreId) {
    const o = AppState.orders.find(x => (x.firestoreId || x.id) === firestoreId);
    if (!o) return;
    let suggestedPrice = o.price || 4.5;
    const priceStr = prompt('Çmimi final (€):', suggestedPrice.toString());
    if (priceStr === null) return;
    const price = parseFloat(priceStr);
    if (isNaN(price)) return;

    if (window.TaxiOrdersBridge) {
        await window.TaxiOrdersBridge.assignOrder(firestoreId, {
            status: 'completed', price: price, completedAt: Date.now(), completedAtStr: new Date().toLocaleString('sq-AL')
        });
    }
    if (window.TaxiEvents) window.TaxiEvents.emit('operator:revenue', price);
    if (o.driverId) {
        const driver = AppState.drivers.find(d => d.id === o.driverId);
        if (driver) { driver.mode = 'free'; driver.status = 'available'; updateVehicleMarker(driver.id); }
    }
    showToast('success', '✅ U përfundua', `€${price.toFixed(2)}`);
}

async function completeOrderFromModal() {
    const firestoreId = window.TaxiTargetEdit?.getCurrentOrderId?.();
    if (!firestoreId) return;
    const priceField = document.getElementById('edit-price');
    let price = parseFloat(priceField?.value) || 0;
    if (price <= 0) {
        const priceStr = prompt('Çmimi final (€):', '4.50');
        if (priceStr === null) return;
        price = parseFloat(priceStr);
    }
    if (isNaN(price)) return;
    if (!confirm(`Përfundo me €${price.toFixed(2)}?`)) return;
    if (window.TaxiOrdersBridge) {
        await window.TaxiOrdersBridge.assignOrder(firestoreId, {
            status: 'completed', price: price, completedAt: Date.now()
        });
    }
    if (window.TaxiEvents) window.TaxiEvents.emit('operator:revenue', price);
    document.getElementById('modal-order-detail')?.classList.remove('active');
    showToast('success', '✅ Përfundoi', `€${price.toFixed(2)}`);
}

function openOrderDetail(firestoreId) {
    const o = AppState.orders.find(x => (x.firestoreId || x.id) === firestoreId)
           || AppState.waitingOrders.find(x => (x.firestoreId || x.id) === firestoreId)
           || AppState.preOrders.find(x => (x.firestoreId || x.id) === firestoreId)
           || AppState.completedOrders.find(x => (x.firestoreId || x.id) === firestoreId);
    if (!o) return;
    if (window.TaxiTargetEdit) window.TaxiTargetEdit.open(o);
}

function filterOrders(q) {
    if (!q) { renderOrders(); return; }
    const lower = q.toLowerCase();
    const tb = document.getElementById('orders-tbody');
    if (!tb) return;
    const f = AppState.orders.filter(o => o.phone.includes(lower) || o.pickup.toLowerCase().includes(lower) || (o.destination || '').toLowerCase().includes(lower));
    if (!f.length) { tb.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text-muted);">Nuk u gjet</td></tr>`; return; }
    const lbl = { new: 'E Re', pending: 'Pritje', assigned: 'Caktuar', onroute: 'Në rrugë', delay: 'Vonesë', completed: 'Kryer', waiting: 'Pritje' };
    tb.innerHTML = f.map(o => `
        <tr onclick="openOrderDetail('${o.firestoreId || o.id}')" style="cursor:pointer;">
            <td><span class="status-badge ${o.status}">${lbl[o.status] || o.status}</span></td>
            <td class="time">${o.time || o.createdTimeStr}</td>
            <td>${o.vehicle || o.vehicleNum ? `<span class="vehicle-badge">${o.vehicle || o.vehicleNum}</span>` : '—'}</td>
            <td class="phone">${o.phone}</td>
            <td class="location">${o.pickup}</td>
            <td class="location">${o.destination}</td>
            <td>${o.driverName || '—'}</td>
            <td></td>
            <td class="remark-cell">${o.remark || '—'}</td>
            <td></td>
        </tr>
    `).join('');
}

// ═══ PRE-ORDERS ═══
function renderPreOrders() {
    const tb = document.getElementById('preorders-tbody');
    const cnt = document.getElementById('preorders-count');
    if (!tb) return;
    if (cnt) cnt.textContent = AppState.preOrders.length;
    if (!AppState.preOrders.length) { tb.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Asnjë pre-order</td></tr>`; return; }
    tb.innerHTML = AppState.preOrders.map(o => `
        <tr onclick="openOrderDetail('${o.firestoreId || o.id}')" style="cursor:pointer;">
            <td><span class="preorder-date">${o.date || o.terminDate || '—'}</span></td>
            <td class="time">${o.terminTime || o.time}</td>
            <td class="phone">${o.phone}</td>
            <td class="location">${o.pickup}</td>
            <td class="location">${o.destination}</td>
            <td onclick="event.stopPropagation()"><div class="action-buttons">
                <button class="action-btn auto" onclick="activatePre('${o.firestoreId || o.id}')">AKTIVIZO</button>
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

    if (window.TaxiEvents) window.TaxiEvents.emit('operator:call_taken');

    if (isPreorder) {
        const dateStr = terminDate.split('-').reverse().slice(0, 2).join('/');
        if (window.TaxiOrdersBridge) {
            window.TaxiOrdersBridge.createFromData({
                phone, name: name || 'Klient', pickup, destination: dest || 'N/A',
                zone: zone === 'auto' ? 'zona1' : zone, tariff: tariff || 'standard',
                remark: remark || '', status: 'preorder',
                isPreorder: true, terminDate: dateStr, terminTime: terminTime,
                terminLead, terminRepeat
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
    const online = AppState.drivers.filter(d => d.mode !== 'inactive').length;
    const pending = AppState.waitingOrders.length;
    const allOrders = [...AppState.orders, ...AppState.waitingOrders, ...AppState.preOrders, ...AppState.completedOrders];
    const trips = allOrders.length;
    const revenue = AppState.completedOrders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
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
    t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${msg || ''}</div></div>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(400px)'; setTimeout(() => t.remove(), 300); }, 3500);
    if (window.TaxiSound) {
        if (type === 'success') window.TaxiSound.playSuccess();
        else if (type === 'error') window.TaxiSound.playError();
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
window.openOrderDetail = openOrderDetail;
window.activatePre = activatePre;
window.finishOrder = finishOrder;
window.completeOrderFromModal = completeOrderFromModal;
window.switchPage = switchPage;
window.filterOrdersPage = filterOrdersPage;
window.backupData = backupData;
window.openControlUnit = openControlUnit;

console.log('✅ TaxiDispatch Pro Ready');
