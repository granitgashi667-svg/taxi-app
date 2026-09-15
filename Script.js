/* ============================================================
   TaxiDispatch Pro - Core Application Logic
   Version: 2.0 Professional
   ============================================================ */

'use strict';

// ============================================================
// 1. STATE MANAGEMENT
// ============================================================
const AppState = {
    orders: [],
    drivers: [],
    vehicles: [],
    zones: [],
    addresses: [],
    parkingPoints: [],
    tariffs: [],
    config: {},
    filter: 'all',
    currentView: 'monitor',
    map: null,
    zonesMap: null,
    vehicleMarkers: new Map(),
    zoneLayers: new Map(),
    selectedOrderId: null,
    selectedDriverId: null,
    dispatchMode: 'auto',
    mapMode: 'all',
    contextTarget: null,
    autoSimulation: true,
    simulationInterval: null,
    theme: 'dark'
};

// ============================================================
// 2. INICIALIZIMI
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Ndalim loading overlay
    setTimeout(() => {
        document.getElementById('loading-overlay')?.classList.add('hidden');
    }, 600);

    loadData();
    initClock();
    initTheme();
    initMap();
    initZonesMap();
    initEventListeners();
    renderAll();
    startSimulation();

    console.log('%c✅ TaxiDispatch Pro initialized', 'color:#10b981;font-size:14px;font-weight:bold;');
});

// ============================================================
// 3. NGARKIMI I TË DHËNAVE
// ============================================================
function loadData() {
    if (window.TaxiData) {
        AppState.addresses = window.TaxiData.addresses || [];
        AppState.zones = window.TaxiData.zones || [];
        AppState.drivers = window.TaxiData.drivers || [];
        AppState.vehicles = window.TaxiData.vehicles || [];
        AppState.parkingPoints = window.TaxiData.parkingPoints || [];
        AppState.tariffs = window.TaxiData.tariffs || [];
        AppState.config = window.TaxiData.config || {};
        AppState.orders = JSON.parse(JSON.stringify(window.TaxiData.mockOrders || []));
    }
}

// ============================================================
// 4. ORA DHE DATA
// ============================================================
function initClock() {
    const updateClock = () => {
        const now = new Date();
        const timeEl = document.getElementById('clock-time');
        const dateEl = document.getElementById('clock-date');
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('sq-AL', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('sq-AL', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        }
    };
    updateClock();
    setInterval(updateClock, 1000);
}

// ============================================================
// 5. TEMA (DARK / LIGHT)
// ============================================================
function initTheme() {
    const saved = localStorage.getItem('taxi-theme') || 'dark';
    setTheme(saved);

    document.getElementById('btn-theme')?.addEventListener('click', () => {
        const newTheme = AppState.theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('taxi-theme', newTheme);
    });
}

function setTheme(theme) {
    AppState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('#btn-theme i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
}

// ============================================================
// 6. HARTA KRYESORE (LEAFLET)
// ============================================================
function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    AppState.map = L.map('map', {
        center: AppState.config.mapCenter || [42.6629, 21.1655],
        zoom: AppState.config.mapZoom || 13,
        zoomControl: false,
        attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'map-tiles'
    }).addTo(AppState.map);

    renderZonesOnMap();
    renderDriversOnMap();
    renderParkingPoints();
}

function renderZonesOnMap() {
    if (!AppState.map) return;

    AppState.zones.forEach(zone => {
        const layer = L.polygon(zone.polygon, {
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '6,4'
        }).addTo(AppState.map);

        layer.bindPopup(`
            <div style="font-family:Inter,sans-serif;">
                <b style="color:${zone.color};font-size:13px;">${zone.name}</b><br>
                <small style="color:#8b949e;">${zone.description}</small><br>
                <span style="color:#06b6d4;font-weight:700;">Tarifa: €${zone.tariff.toFixed(2)}</span>
            </div>
        `);

        AppState.zoneLayers.set(zone.id, layer);
    });
}

function renderDriversOnMap() {
    if (!AppState.map) return;

    AppState.drivers.forEach(driver => {
        const color = driver.status === 'available' ? '#10b981' :
                      driver.status === 'busy' ? '#ef4444' :
                      driver.status === 'break' ? '#f59e0b' : '#6b7280';

        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-pulse" style="
                background:${color};
                width:16px;height:16px;
                border-radius:50%;
                border:2px solid white;
                box-shadow:0 0 12px ${color};
                color:${color};
            "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const marker = L.marker([driver.lat, driver.lng], {
            icon: icon,
            title: driver.name
        }).addTo(AppState.map);

        const vehicle = AppState.vehicles.find(v => v.id === driver.vehicleId);
        marker.bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:180px;">
                <b style="color:#06b6d4;font-size:13px;">${driver.name}</b><br>
                <small style="color:#8b949e;">📞 ${driver.phone}</small><br>
                <small style="color:#8b949e;">🚗 ${vehicle ? vehicle.plate : 'N/A'}</small><br>
                <div style="margin-top:6px;">
                    <span style="color:${color};font-weight:700;text-transform:uppercase;font-size:11px;">
                        ${driver.status}
                    </span>
                    <span style="color:#f59e0b;">⭐ ${driver.rating}</span>
                </div>
            </div>
        `);

        marker.on('click', () => {
            AppState.selectedDriverId = driver.id;
        });

        AppState.vehicleMarkers.set(driver.id, marker);
    });
}

function renderParkingPoints() {
    if (!AppState.map) return;

    AppState.parkingPoints.forEach(pp => {
        const icon = L.divIcon({
            className: 'parking-marker',
            html: `<div style="
                background:#3b82f6;
                width:22px;height:22px;
                border-radius:4px;
                border:2px solid white;
                display:flex;align-items:center;justify-content:center;
                color:white;font-size:11px;font-weight:700;
                box-shadow:0 2px 8px rgba(59,130,246,0.5);
            ">P</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });

        L.marker([pp.lat, pp.lng], { icon }).addTo(AppState.map)
            .bindPopup(`
                <div style="font-family:Inter,sans-serif;">
                    <b style="color:#3b82f6;">${pp.name}</b><br>
                    <small>Kapaciteti: ${pp.occupied}/${pp.capacity}</small>
                </div>
            `);
    });
}

// ============================================================
// 7. HARTA E ZONAVE
// ============================================================
function initZonesMap() {
    const el = document.getElementById('zones-map');
    if (!el) return;

    AppState.zonesMap = L.map('zones-map', {
        center: [42.6629, 21.1655],
        zoom: 12,
        zoomControl: true,
        attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(AppState.zonesMap);

    AppState.zones.forEach(zone => {
        L.polygon(zone.polygon, {
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: 0.2,
            weight: 3
        }).addTo(AppState.zonesMap)
          .bindPopup(`<b>${zone.name}</b><br>Tarifa: €${zone.tariff.toFixed(2)}`);
    });
}

// ============================================================
// 8. EVENT LISTENERS
// ============================================================
function initEventListeners() {
    // Menuja mobile
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Collapse sidebar
    document.getElementById('sidebar-collapse')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('collapsed');
    });

    // Navigimi
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            if (view) switchView(view);
        });
    });

    // Modal - Porosi e Re
    document.getElementById('btn-new-order')?.addEventListener('click', openNewOrderModal);
    document.getElementById('fab-main')?.addEventListener('click', openNewOrderModal);
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.close;
            closeModal(modalId);
        });
    });

    // Mbyllje me klik jashtë
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    // Forma e porosisë
    document.getElementById('order-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        submitOrder();
    });

    document.getElementById('btn-submit-order')?.addEventListener('click', (e) => {
        e.preventDefault();
        submitOrder();
    });

    // Dispatch buttons
    document.querySelectorAll('.dispatch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dispatch-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.dispatchMode = btn.dataset.dispatch;
        });
    });

    // Autocomplete - Marrja
    setupAutocomplete('pickup-address', 'pickup-suggestions');
    setupAutocomplete('destination-address', 'destination-suggestions');

    // Filtrat e porosive
    document.querySelectorAll('.filter-btn, .panel-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.filter = btn.dataset.filter || 'all';
            } else {
                document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.filter = btn.dataset.tab || 'all';
            }
            renderOrders();
        });
    });

    // Kërkimi i porosive
    document.getElementById('order-search')?.addEventListener('input', (e) => {
        filterOrdersFeed(e.target.value);
    });

    // Kërkimi global
    document.getElementById('global-search')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') globalSearch(e.target.value);
    });

    // Butonat e topbar
    document.getElementById('btn-notifications')?.addEventListener('click', () => {
        showToast('info', 'Njoftime', 'Keni 3 njoftime të reja');
    });

    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    });

    // Broadcast
    document.getElementById('btn-send-broadcast')?.addEventListener('click', () => {
        openModal('modal-broadcast');
    });

    document.getElementById('btn-send-broadcast-confirm')?.addEventListener('click', () => {
        const msg = document.getElementById('broadcast-message')?.value;
        if (msg) {
            showToast('success', 'U dërgua', 'Njoftimi u dërgua te shoferët');
            closeModal('modal-broadcast');
        }
    });

    // Kontrollet e hartës
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => AppState.map?.zoomIn());
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => AppState.map?.zoomOut());
    document.getElementById('btn-center')?.addEventListener('click', () => {
        AppState.map?.setView(AppState.config.mapCenter || [42.6629, 21.1655], 13);
    });

    // Filtrat e hartës
    document.querySelectorAll('[data-map-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-map-mode]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.mapMode = btn.dataset.mapMode;
            filterMapMarkers(AppState.mapMode);
        });
    });

    // Context menu
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('contextmenu', (e) => {
        const target = e.target.closest('[data-context]');
        if (target) {
            e.preventDefault();
            AppState.contextTarget = target.dataset.context;
            showContextMenu(e.clientX, e.clientY);
        }
    });

    document.querySelectorAll('.context-item').forEach(item => {
        item.addEventListener('click', () => {
            handleContextAction(item.dataset.action);
        });
    });

    // Sort tabela
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            sortOrdersTable(th.dataset.sort);
        });
    });

    // Butonat e ndryshëm
    document.getElementById('btn-orders-refresh')?.addEventListener('click', () => {
        renderOrdersTable();
        showToast('info', 'Rifreskuar', 'Lista e porosive u rifreskua');
    });

    document.getElementById('btn-orders-export')?.addEventListener('click', exportOrdersCSV);

    document.getElementById('btn-view-all-orders')?.addEventListener('click', () => switchView('orders'));

    document.getElementById('btn-add-driver')?.addEventListener('click', () => {
        showToast('info', 'Së shpejti', 'Funksioni për shtimin e shoferëve');
    });

    document.getElementById('btn-add-zone')?.addEventListener('click', () => {
        openModal('modal-zone-editor');
    });

    // Kërkime
    document.getElementById('search-driver')?.addEventListener('input', (e) => {
        filterDrivers(e.target.value);
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
            hideContextMenu();
        }
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            document.getElementById('global-search')?.focus();
        }
    });

    // Shfaqja e pamjes fillestare
    switchView('monitor');
}

// ============================================================
// 9. NAVIGIMI MIDIS PAMJEVE
// ============================================================
function switchView(view) {
    AppState.currentView = view;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');

    const titles = {
        monitor: ['Monitor Live', 'Pamje e përgjithshme e operacioneve'],
        orders: ['Porositë', 'Menaxho të gjitha porositë'],
        callcenter: ['Call Center', 'Menaxhimi i thirrjeve'],
        history: ['Historiku', 'Porositë e kaluara'],
        drivers: ['Shoferët', 'Menaxho shoferët'],
        vehicles: ['Veturat', 'Flota e veturave'],
        zones: ['Zonat', 'Zonat gjeografike'],
        parking: ['Pikat e Parkimit', 'Vendet e parkimit'],
        reports: ['Raporte', 'Analitika dhe statistika'],
        finance: ['Financa', 'Të ardhurat dhe shpenzimet'],
        statistics: ['Statistika', 'Analiza e të dhënave'],
        settings: ['Cilësimet', 'Konfigurimi i sistemit'],
        users: ['Përdoruesit', 'Menaxho përdoruesit'],
        logs: ['Logs', 'Historiku i veprimeve'],
        help: ['Ndihmë', 'Udhëzues dhe mbështetje']
    };

    const [title, subtitle] = titles[view] || ['Paneli', ''];
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;

    // Rifresko maps kur hapet
    setTimeout(() => {
        AppState.map?.invalidateSize();
        AppState.zonesMap?.invalidateSize();
    }, 100);

    // Ngarko të dhënat specifike
    if (view === 'drivers') renderDrivers();
    if (view === 'orders') renderOrdersTable();
    if (view === 'zones') renderZonesList();
}

// ============================================================
// 10. RENDER ALL
// ============================================================
function renderAll() {
    renderOrders();
    updateStats();
    renderTopDrivers();
}

// ============================================================
// 11. RENDER ORDERS FEED
// ============================================================
function renderOrders() {
    const feed = document.getElementById('orders-feed');
    if (!feed) return;

    let filtered = [...AppState.orders];

    if (AppState.filter === 'active') {
        filtered = filtered.filter(o => ['new', 'assigned', 'onroute', 'delay'].includes(o.status));
    } else if (AppState.filter === 'queue') {
        filtered = filtered.filter(o => o.status === 'pending' || o.status === 'new');
    } else if (AppState.filter === 'done') {
        filtered = filtered.filter(o => o.status === 'completed');
    } else if (AppState.filter !== 'all') {
        filtered = filtered.filter(o => o.status === AppState.filter);
    }

    if (filtered.length === 0) {
        feed.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-size:13px;">
                <i class="fa-solid fa-inbox" style="font-size:32px;margin-bottom:12px;opacity:0.4;display:block;"></i>
                Nuk ka porosi për këtë filtër
            </div>
        `;
        return;
    }

    feed.innerHTML = filtered.map(order => orderCardHTML(order)).join('');
}

function orderCardHTML(order) {
    const statusInfo = window.TaxiData?.orderStatuses?.[order.status] || { label: order.status, color: '#06b6d4' };
    const priorityIcon = order.priority === 'high'
        ? '<i class="fa-solid fa-fire" style="color:#ef4444;" title="Prioritet i lartë"></i>'
        : '';

    return `
        <div class="order-card status-${order.status}" data-order-id="${order.id}" data-context="order">
            <div class="order-card-header">
                <span class="order-card-phone">${order.phone}</span>
                <span class="order-card-time">${order.time}</span>
            </div>
            <div class="order-card-address">
                <i class="fa-solid fa-location-dot"></i>
                <span>${order.pickup}</span>
                ${priorityIcon}
            </div>
            <div class="order-card-address destination">
                <i class="fa-solid fa-flag-checkered"></i>
                <span>${order.destination || 'N/A'}</span>
            </div>
            <div class="order-card-footer">
                <span class="order-status-badge" style="background:${statusInfo.color}20;color:${statusInfo.color};">
                    <i class="fa-solid ${statusInfo.icon}"></i>
                    ${statusInfo.label}
                </span>
                <span class="order-card-taxi">
                    <i class="fa-solid fa-car"></i>
                    ${order.taxi}
                </span>
            </div>
        </div>
    `;
}

function filterOrdersFeed(query) {
    if (!query) { renderOrders(); return; }
    const q = query.toLowerCase();
    const feed = document.getElementById('orders-feed');
    if (!feed) return;

    const filtered = AppState.orders.filter(o =>
        o.phone.toLowerCase().includes(q) ||
        o.pickup.toLowerCase().includes(q) ||
        (o.destination || '').toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
        feed.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Nuk u gjet asnjë porosi</div>`;
        return;
    }

    feed.innerHTML = filtered.map(o => orderCardHTML(o)).join('');
}

// ============================================================
// 12. RENDER TABELA E POROSIVE
// ============================================================
function renderOrdersTable() {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    const statusFilter = document.getElementById('filter-status')?.value || 'all';
    const zoneFilter = document.getElementById('filter-zone')?.value || 'all';

    let filtered = [...AppState.orders];
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);
    if (zoneFilter !== 'all') filtered = filtered.filter(o => o.zone === zoneFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted);">Nuk ka porosi</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(order => {
        const statusInfo = window.TaxiData?.orderStatuses?.[order.status] || { label: order.status, color: '#06b6d4' };
        return `
            <tr data-order-id="${order.id}">
                <td><input type="checkbox"></td>
                <td><strong>#${order.id}</strong></td>
                <td>${order.time}</td>
                <td>${order.phone}</td>
                <td>${order.pickup}</td>
                <td>${order.destination || 'N/A'}</td>
                <td>${order.zone || '-'}</td>
                <td>${order.taxi}</td>
                <td>
                    <span class="order-status-badge" style="background:${statusInfo.color}20;color:${statusInfo.color};">
                        ${statusInfo.label}
                    </span>
                </td>
                <td>
                    <button class="icon-btn" title="Shiko" onclick="viewOrder(${order.id})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    const shown = document.getElementById('rows-shown');
    const total = document.getElementById('rows-total');
    if (shown) shown.textContent = filtered.length;
    if (total) total.textContent = AppState.orders.length;
}

function viewOrder(id) {
    const order = AppState.orders.find(o => o.id === id);
    if (order) {
        showToast('info', `Porosia #${id}`, `${order.pickup} → ${order.destination}`);
    }
}

// ============================================================
// 13. RENDER SHOFRËT
// ============================================================
function renderDrivers() {
    const grid = document.getElementById('drivers-grid');
    if (!grid) return;

    grid.innerHTML = AppState.drivers.map(driver => {
        const vehicle = AppState.vehicles.find(v => v.id === driver.vehicleId);
        return `
            <div class="driver-card status-${driver.status}" data-driver-id="${driver.id}" data-context="driver">
                <span class="driver-status-pill ${driver.status}">${driver.status}</span>
                <div class="driver-header">
                    <div class="driver-avatar">${driver.avatar}</div>
                    <div class="driver-info">
                        <div class="driver-name">${driver.name}</div>
                        <div class="driver-meta">
                            <i class="fa-solid fa-phone"></i>
                            ${driver.phone}
                        </div>
                    </div>
                </div>
                <div class="driver-meta">
                    <i class="fa-solid fa-car"></i>
                    ${vehicle ? `${vehicle.plate} · ${vehicle.model}` : 'N/A'}
                </div>
                <div class="driver-stats">
                    <div class="driver-stat">
                        <span class="driver-stat-label">Vlerësimi</span>
                        <span class="driver-stat-value" style="color:var(--accent-yellow);">
                            ⭐ ${driver.rating}
                        </span>
                    </div>
                    <div class="driver-stat">
                        <span class="driver-stat-label">Udhëtime</span>
                        <span class="driver-stat-value">${driver.trips}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterDrivers(query) {
    if (!query) { renderDrivers(); return; }
    const q = query.toLowerCase();
    const grid = document.getElementById('drivers-grid');
    if (!grid) return;

    const filtered = AppState.drivers.filter(d =>
        d.name.toLowerCase().includes(q) || d.phone.includes(q)
    );

    grid.innerHTML = filtered.length === 0
        ? `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">Nuk u gjet asnjë shofer</div>`
        : filtered.map(driver => {
            const vehicle = AppState.vehicles.find(v => v.id === driver.vehicleId);
            return `
                <div class="driver-card status-${driver.status}" data-driver-id="${driver.id}">
                    <span class="driver-status-pill ${driver.status}">${driver.status}</span>
                    <div class="driver-header">
                        <div class="driver-avatar">${driver.avatar}</div>
                        <div class="driver-info">
                            <div class="driver-name">${driver.name}</div>
                            <div class="driver-meta"><i class="fa-solid fa-phone"></i>${driver.phone}</div>
                        </div>
                    </div>
                    <div class="driver-meta"><i class="fa-solid fa-car"></i>${vehicle ? vehicle.plate : 'N/A'}</div>
                </div>
            `;
        }).join('');
}

// ============================================================
// 14. RENDER ZONAT
// ============================================================
function renderZonesList() {
    const list = document.getElementById('zones-list');
    if (!list) return;

    list.innerHTML = AppState.zones.map(zone => {
        const driverCount = AppState.drivers.filter(d => d.zone === zone.id).length;
        return `
            <div class="zone-item" style="border-left-color:${zone.color};" data-zone-id="${zone.id}">
                <div class="zone-item-header">
                    <span class="zone-item-name">${zone.name}</span>
                    <span class="zone-item-tariff">€${zone.tariff.toFixed(2)}</span>
                </div>
                <div class="zone-item-desc">${zone.description}</div>
                <div class="zone-item-stats">
                    <span><i class="fa-solid fa-car"></i> ${driverCount} taksi</span>
                    <span><i class="fa-solid fa-shield"></i> Backup: ${zone.backupZones.length}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================
// 15. STATISTIKA
// ============================================================
function updateStats() {
    const online = AppState.drivers.filter(d => d.status === 'available').length;
    const busy = AppState.drivers.filter(d => d.status === 'busy').length;
    const pending = AppState.orders.filter(o => o.status === 'new' || o.status === 'pending').length;
    const trips = AppState.orders.filter(o => o.status === 'completed' || o.status === 'onroute').length;
    const revenue = (trips * 4.5).toFixed(2);

    setText('stat-online', online);
    setText('stat-pending', pending);
    setText('stat-trips', trips);
    setText('stat-revenue', `€${revenue}`);
    setText('orders-badge', pending);
    setText('drivers-online', online);
    setText('active-count', AppState.orders.filter(o => ['new', 'assigned', 'onroute', 'delay'].includes(o.status)).length);
    setText('queue-count', AppState.orders.filter(o => ['new', 'pending'].includes(o.status)).length);
    setText('overlay-drivers', `${AppState.drivers.length} taksí`);
    setText('overlay-zones', `${AppState.zones.length} zona`);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function renderTopDrivers() {
    const container = document.getElementById('top-drivers');
    if (!container) return;

    const sorted = [...AppState.drivers].sort((a, b) => b.trips - a.trips).slice(0, 4);
    const medals = ['gold', 'silver', 'bronze', ''];

    container.innerHTML = sorted.map((driver, i) => `
        <div class="driver-rank">
            <span class="rank-number ${medals[i]}">${i + 1}</span>
            <span class="rank-name">${driver.name}</span>
            <span class="rank-value">${driver.trips} udhëtime</span>
        </div>
    `).join('');
}

// ============================================================
// 16. MODAL HANDLING
// ============================================================
function openModal(id) {
    document.getElementById(id)?.classList.add('active');
}
function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
}
function openNewOrderModal() {
    openModal('modal-new-order');
    document.getElementById('client-phone')?.focus();
}

// ============================================================
// 17. AUTCOMPLETE
// ============================================================
function setupAutocomplete(inputId, suggestId) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestId);
    if (!input || !suggestions) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length < 2) {
            suggestions.classList.remove('active');
            return;
        }

        const results = window.TaxiData?.searchAddresses(query) || [];
        if (results.length === 0) {
            suggestions.classList.remove('active');
            return;
        }

        suggestions.innerHTML = results.map(addr => {
            const cat = window.TaxiData.addressCategories[addr.category] || { label: addr.category, icon: 'fa-location-dot' };
            return `
                <div class="autocomplete-item" data-address="${addr.name}" data-lat="${addr.lat}" data-lng="${addr.lng}">
                    <i class="fa-solid ${cat.icon}"></i>
                    <div class="autocomplete-item-main">
                        <div class="autocomplete-item-name">${addr.name}</div>
                        <div class="autocomplete-item-cat">${cat.label}</div>
                    </div>
                    <span class="autocomplete-item-zone">${addr.zone}</span>
                </div>
            `;
        }).join('');

        suggestions.classList.add('active');

        suggestions.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.address;
                input.dataset.lat = item.dataset.lat;
                input.dataset.lng = item.dataset.lng;
                suggestions.classList.remove('active');
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.remove('active');
        }
    });
}

// ============================================================
// 18. KRIJIMI I POROSISË
// ============================================================
function submitOrder() {
    const phone = document.getElementById('client-phone')?.value.trim();
    const name = document.getElementById('client-name')?.value.trim();
    const pickup = document.getElementById('pickup-address')?.value.trim();
    const destination = document.getElementById('destination-address')?.value.trim();
    const zone = document.getElementById('order-zone')?.value;
    const tariff = document.getElementById('order-tariff')?.value;
    const note = document.getElementById('order-note')?.value.trim();
    const priority = document.getElementById('order-priority')?.checked ? 'high' : 'normal';

    if (!phone || !pickup) {
        showToast('error', 'Gabim', 'Plotëso numrin e telefonit dhe adresën e marrjes');
        return;
    }

    const newOrder = {
        id: Date.now(),
        phone,
        name: name || 'Klient',
        pickup,
        destination: destination || 'N/A',
        status: AppState.dispatchMode === 'manual' ? 'pending' : 'new',
        taxi: AppState.dispatchMode === 'manual' ? 'N/A' : 'Auto',
        time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
        zone: zone === 'auto' ? findNearestZone(pickup) : zone,
        tariff,
        priority,
        note,
        createdAt: new Date().toISOString()
    };

    AppState.orders.unshift(newOrder);
    renderOrders();
    updateStats();
    renderOrdersTable();
    closeModal('modal-new-order');
    document.getElementById('order-form')?.reset();

    showToast('success', 'Porosia u shtua', `Për ${phone} — ${pickup}`);

    // Njofto shoferin më të afërt nëse automatik
    if (AppState.dispatchMode === 'auto') {
        setTimeout(() => assignDriver(newOrder), 800);
    }
}

function findNearestZone(addressName) {
    const addr = AppState.addresses.find(a => a.name === addressName);
    return addr ? addr.zone : 'zona1';
}

function assignDriver(order) {
    const available = AppState.drivers.filter(d => d.status === 'available');
    if (available.length === 0) {
        showToast('warning', 'Nuk ka taksi', 'Të gjitha taksitë janë të zëna');
        return;
    }

    const targetAddr = AppState.addresses.find(a => a.name === order.pickup);
    const targetLat = targetAddr ? targetAddr.lat : 42.6629;
    const targetLng = targetAddr ? targetAddr.lng : 21.1655;

    let nearest = available[0];
    let minDist = Infinity;

    available.forEach(driver => {
        const dist = window.TaxiUtils.calculateDistance(driver.lat, driver.lng, targetLat, targetLng);
        if (dist < minDist) {
            minDist = dist;
            nearest = driver;
        }
    });

    const vehicle = AppState.vehicles.find(v => v.id === nearest.vehicleId);

    order.status = 'assigned';
    order.taxi = vehicle ? vehicle.plate : `Nr. ${nearest.id}`;
    order.driverName = nearest.name;

    nearest.status = 'busy';
    renderOrders();
    updateStats();
    renderOrdersTable();

    showToast('success', 'U caktua!', `${nearest.name} — ${minDist.toFixed(2)} km`);
}

// ============================================================
// 19. CONTEXT MENU
// ============================================================
function showContextMenu(x, y) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('active');
}

function hideContextMenu() {
    document.getElementById('context-menu')?.classList.remove('active');
}

function handleContextAction(action) {
    const id = AppState.contextTarget;
    hideContextMenu();

    switch (action) {
        case 'view':
            showToast('info', 'Shiko', `Detajet e ${id}`);
            break;
        case 'edit':
            showToast('info', 'Modifiko', 'Funksioni së shpejti');
            break;
        case 'assign':
            showToast('info', 'Cakto', 'Zgjidh një shofer');
            break;
        case 'call':
            showToast('success', 'Telefono', 'Duke telefonuar...');
            break;
        case 'delete':
            showToast('warning', 'Fshirë', 'Elementi u fshi');
            break;
    }
}

// ============================================================
// 20. KËRKIMI GLOBAL
// ============================================================
function globalSearch(query) {
    if (!query) return;
    const q = query.toLowerCase();

    const driverFound = AppState.drivers.find(d => d.name.toLowerCase().includes(q));
    if (driverFound) {
        switchView('drivers');
        showToast('info', 'U gjet', `Shoferi: ${driverFound.name}`);
        return;
    }

    const orderFound = AppState.orders.find(o =>
        o.phone.includes(q) || o.pickup.toLowerCase().includes(q)
    );
    if (orderFound) {
        switchView('orders');
        showToast('info', 'U gjet', `Porosia: ${orderFound.phone}`);
        return;
    }

    showToast('warning', 'Nuk u gjet', `Asnjë rezultat për "${query}"`);
}

// ============================================================
// 21. FILTRI I MARKERAVE NË HARTË
// ============================================================
function filterMapMarkers(mode) {
    AppState.vehicleMarkers.forEach((marker, driverId) => {
        const driver = AppState.drivers.find(d => d.id === driverId);
        if (!driver) return;

        let show = true;
        if (mode === 'available') show = driver.status === 'available';
        else if (mode === 'busy') show = driver.status === 'busy';
        else if (mode === 'break') show = driver.status === 'break';

        if (show) {
            if (!AppState.map.hasLayer(marker)) marker.addTo(AppState.map);
        } else {
            if (AppState.map.hasLayer(marker)) AppState.map.removeLayer(marker);
        }
    });
}

// ============================================================
// 22. SORTIMI I TABELËS
// ============================================================
let sortDirection = {};
function sortOrdersTable(field) {
    sortDirection[field] = !sortDirection[field];
    AppState.orders.sort((a, b) => {
        const valA = a[field] ?? '';
        const valB = b[field] ?? '';
        if (valA < valB) return sortDirection[field] ? -1 : 1;
        if (valA > valB) return sortDirection[field] ? 1 : -1;
        return 0;
    });
    renderOrdersTable();
}

// ============================================================
// 23. EKSPORTIMI CSV
// ============================================================
function exportOrdersCSV() {
    const headers = ['ID', 'Ora', 'Telefoni', 'Marrja', 'Destinacioni', 'Zona', 'Taksi', 'Statusi'];
    const rows = AppState.orders.map(o => [
        o.id, o.time, o.phone, o.pickup, o.destination, o.zone, o.taxi, o.status
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `porosite_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    showToast('success', 'U eksportua', 'Skedari CSV u shkarkua');
}

// ============================================================
// 24. TOAST NOTIFICATIONS
// ============================================================
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.info}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================================
// 25. SIMULIMI (DEMO)
// ============================================================
function startSimulation() {
    if (!AppState.autoSimulation) return;

    // Porosi të reja çdo 45 sekonda
    AppState.simulationInterval = setInterval(() => {
        if (AppState.orders.length > 30) return;

        const phones = ['+383 44', '+383 45', '+383 49'];
        const pickup = AppState.addresses[Math.floor(Math.random() * AppState.addresses.length)];
        const destination = AppState.addresses[Math.floor(Math.random() * AppState.addresses.length)];

        const newOrder = {
            id: Date.now(),
            phone: `${phones[Math.floor(Math.random() * phones.length)]} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`,
            name: 'Klient i re',
            pickup: pickup.name,
            destination: destination.name,
            status: 'new',
            taxi: 'Auto',
            time: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
            zone: pickup.zone,
            tariff: 'standard',
            priority: Math.random() > 0.85 ? 'high' : 'normal',
            note: ''
        };

        AppState.orders.unshift(newOrder);
        renderOrders();
        updateStats();
        renderOrdersTable();

        showToast('info', 'Porosi e re', `${newOrder.pickup} → ${newOrder.destination}`);
    }, 45000);

    // Lëvizja e taksive
    setInterval(() => {
        AppState.vehicleMarkers.forEach((marker, driverId) => {
            const driver = AppState.drivers.find(d => d.id === driverId);
            if (!driver || driver.status === 'offline') return;

            const pos = marker.getLatLng();
            const newLat = pos.lat + (Math.random() - 0.5) * 0.002;
            const newLng = pos.lng + (Math.random() - 0.5) * 0.002;

            marker.setLatLng([newLat, newLng]);
            driver.lat = newLat;
            driver.lng = newLng;
        });
    }, 5000);

    // Ndryshimi i statuseve
    setInterval(() => {
        const available = AppState.drivers.filter(d => d.status === 'available');
        if (available.length > 3) {
            const d = available[Math.floor(Math.random() * available.length)];
            if (Math.random() > 0.7) {
                d.status = 'busy';
                updateStats();
                const marker = AppState.vehicleMarkers.get(d.id);
                if (marker) {
                    const newIcon = L.divIcon({
                        className: 'custom-marker',
                        html: `<div class="marker-pulse" style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 12px #ef4444;color:#ef4444;"></div>`,
                        iconSize: [16, 16], iconAnchor: [8, 8]
                    });
                    marker.setIcon(newIcon);
                }
            }
        }

        // Kthe disa në available
        AppState.drivers.filter(d => d.status === 'busy').forEach(d => {
            if (Math.random() > 0.85) d.status = 'available';
        });

        updateStats();
    }, 15000);
}

// ============================================================
// 26. FUNKSIONE GLOBALE
// ============================================================
window.viewOrder = viewOrder;
window.switchView = switchView;
window.showToast = showToast;

console.log('%c✅ TaxiDispatch Pro - Script Loaded', 'color:#10b981;font-size:14px;font-weight:bold;');
