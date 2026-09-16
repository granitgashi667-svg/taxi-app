'use strict';

/**
 * map-context-menu.js — Klik i djathtë në hartë
 */

window.TaxiMapContextMenu = (() => {
    let menuEl = null;
    let currentCoords = null;

    // ═══ INIT ═══
    function init() {
        // Krijo menunë
        createMenu();

        // Event listener global
        document.addEventListener('click', (e) => {
            if (menuEl && !menuEl.contains(e.target)) {
                hideMenu();
            }
        });

        // Fshij kur skrollon
        document.addEventListener('scroll', hideMenu, true);

        console.log('✅ Map Context Menu aktivizuar');
    }

    // ═══ KRIJO MENUNË ═══
    function createMenu() {
        if (menuEl) return;

        menuEl = document.createElement('div');
        menuEl.className = 'map-context-menu';
        menuEl.style.display = 'none';
        menuEl.innerHTML = `
            <div class="mcm-header">
                <i class="fa-solid fa-location-dot"></i>
                <span id="mcm-coords">0, 0</span>
            </div>
            <div class="mcm-item" data-action="new-location">
                <i class="fa-solid fa-plus"></i>
                <span>Shto lokacion të re</span>
            </div>
            <div class="mcm-item" data-action="order-here">
                <i class="fa-solid fa-taxi"></i>
                <span>Porosi taxi nga këtu</span>
            </div>
            <div class="mcm-item" data-action="copy-coords">
                <i class="fa-solid fa-copy"></i>
                <span>Kopjo koordinatat</span>
            </div>
            <div class="mcm-item" data-action="measure">
                <i class="fa-solid fa-ruler"></i>
                <span>Masa distancën</span>
            </div>
            <div class="mcm-divider"></div>
            <div class="mcm-item" data-action="google-maps">
                <i class="fa-solid fa-map"></i>
                <span>Hap në Google Maps</span>
            </div>
            <div class="mcm-item" data-action="what-is-here">
                <i class="fa-solid fa-search"></i>
                <span>Çka është këtu?</span>
            </div>
            <div class="mcm-divider"></div>
            <div class="mcm-item" data-action="mark-interest">
                <i class="fa-solid fa-star"></i>
                <span>Shëno pikë interesi</span>
            </div>
            <div class="mcm-item" data-action="driver-here">
                <i class="fa-solid fa-car"></i>
                <span>Dërgo shoferin këtu</span>
            </div>
        `;
        document.body.appendChild(menuEl);

        // Event listeners për itemat
        menuEl.querySelectorAll('.mcm-item').forEach(item => {
            item.addEventListener('click', () => {
                handleAction(item.dataset.action);
            });
        });
    }

    // ═══ SHFAQ MENUNË ═══
    function showMenu(lat, lng, x, y) {
        if (!menuEl) createMenu();

        currentCoords = { lat, lng };

        document.getElementById('mcm-coords').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        // Pozicioni i menut
        menuEl.style.left = `${x}px`;
        menuEl.style.top = `${y}px`;
        menuEl.style.display = 'block';

        // Kontrollo nëse del jashtë ekranit
        const rect = menuEl.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menuEl.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menuEl.style.top = `${y - rect.height}px`;
        }
    }

    function hideMenu() {
        if (menuEl) menuEl.style.display = 'none';
    }

    // ═══ HANDLE ACTIONS ═══
    async function handleAction(action) {
        if (!currentCoords) return;
        const { lat, lng } = currentCoords;
        hideMenu();

        switch (action) {
            case 'new-location':
                openNewLocationModal(lat, lng);
                break;
            case 'order-here':
                createOrderFromMap(lat, lng);
                break;
            case 'copy-coords':
                await copyCoords(lat, lng);
                break;
            case 'measure':
                startMeasure(lat, lng);
                break;
            case 'google-maps':
                window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                break;
            case 'what-is-here':
                window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
                break;
            case 'mark-interest':
                markAsInterest(lat, lng);
                break;
            case 'driver-here':
                sendDriverHere(lat, lng);
                break;
        }
    }

    // ═══ SHTO LOKACION TË RE ═══
    function openNewLocationModal(lat, lng) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-new-location';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-plus"></i>
                        <h3>Shto lokacion të re</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-new-location').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="padding:10px 12px;background:rgba(168,85,247,.1);border-radius:8px;font-size:11px;color:var(--text-secondary);margin-bottom:14px;">
                        <i class="fa-solid fa-location-dot" style="color:var(--accent-purple);"></i>
                        Koordinatat: <strong style="color:var(--accent-purple);font-family:monospace;">${lat.toFixed(5)}, ${lng.toFixed(5)}</strong>
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-tag"></i> Emri i lokacionit *</label>
                        <input type="text" id="nl-name" class="input-field" placeholder="P.sh. Grand Hotel">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-list"></i> Kategoria</label>
                        <select id="nl-category" class="input-field">
                            <option value="hotel">Hotel</option>
                            <option value="restaurant">Restorant</option>
                            <option value="shopping">Qendër tregtare</option>
                            <option value="hospital">Spital</option>
                            <option value="institution">Institucion</option>
                            <option value="neighborhood">Lagje</option>
                            <option value="street">Rrugë</option>
                            <option value="other">Të tjera</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-map-location-dot"></i> Zona</label>
                        <select id="nl-zone" class="input-field">
                            <option value="zona1">Zona 1 - Qendra</option>
                            <option value="zona2">Zona 2 - Dardania</option>
                            <option value="zona3">Zona 3 - Aeroporti</option>
                            <option value="zona4">Zona 4 - Arbëria</option>
                            <option value="zona5">Zona 5 - Kalabria</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fa-solid fa-note-sticky"></i> Shënim</label>
                        <input type="text" id="nl-notes" class="input-field" placeholder="P.sh. Hyrja kryesore">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-new-location').remove()">Anulo</button>
                    <button class="btn-primary" onclick="TaxiMapContextMenu.saveLocation(${lat}, ${lng})">
                        <i class="fa-solid fa-save"></i> Ruaj
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function saveLocation(lat, lng) {
        const name = document.getElementById('nl-name')?.value.trim();
        const category = document.getElementById('nl-category')?.value;
        const zone = document.getElementById('nl-zone')?.value;
        const notes = document.getElementById('nl-notes')?.value.trim();

        if (!name) {
            showToast('error', 'Gabim', 'Shkruaj emrin');
            return;
        }

        if (window.TaxiGeocoding) {
            const result = await window.TaxiGeocoding.addLocation({
                name, category, lat, lng, zone, notes
            });
            if (result) {
                showToast('success', '✅ U ruajt', name);
                document.getElementById('modal-new-location')?.remove();
            }
        }
    }

    // ═══ POROSI NGA HARTA ═══
    function createOrderFromMap(lat, lng) {
        // Plotëso formën e porosisë me këto koordinata
        if (window.AppState) {
            const pickupField = document.getElementById('pickup-address');
            if (pickupField) {
                pickupField.value = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                pickupField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                pickupField.focus();
            }
        }
        showToast('info', '📍 Lokacioni u vendos', 'Plotëso detajet e porosisë');
    }

    // ═══ KOPJO KOORDINATAT ═══
    async function copyCoords(lat, lng) {
        const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        if (window.TaxiUtils) {
            const ok = await window.TaxiUtils.copy(text);
            if (ok) showToast('success', '📋 U kopjua', text);
            else showToast('error', 'Gabim', 'Nuk mund të kopjohet');
        }
    }

    // ═══ MASA DISTANCËN ═══
    let measureStart = null;
    let measureLine = null;

    function startMeasure(lat, lng) {
        if (!window.AppState?.map) return;

        if (!measureStart) {
            measureStart = { lat, lng };
            showToast('info', '📏 Masa', 'Kliko pikën e dytë për të matur');
        } else {
            const dist = window.TaxiUtils?.distanceKm(measureStart.lat, measureStart.lng, lat, lng);
            showToast('success', '📏 Distanca', `${dist.toFixed(2)} km`);

            // Vizato linjën
            if (measureLine) window.AppState.map.removeLayer(measureLine);
            measureLine = L.polyline(
                [[measureStart.lat, measureStart.lng], [lat, lng]],
                { color: '#a855f7', weight: 3, dashArray: '10,5' }
            ).addTo(window.AppState.map);

            setTimeout(() => {
                if (measureLine) window.AppState.map.removeLayer(measureLine);
                measureLine = null;
                measureStart = null;
            }, 5000);
        }
    }

    // ═══ SHËNO PIKË INTERESI ═══
    function markAsInterest(lat, lng) {
        const interests = window.TaxiStorage?.get('taxi.interests', []) || [];
        interests.push({
            id: Date.now(),
            lat, lng,
            name: `Pikë ${interests.length + 1}`,
            createdAt: Date.now()
        });
        window.TaxiStorage?.set('taxi.interests', interests);
        showToast('success', '⭐ U shënua', 'Pikë interesi u ruajt');
    }

    // ═══ DËRGO SHOFRIN ═══
    function sendDriverHere(lat, lng) {
        if (!window.TaxiMessages) return;

        const drivers = window.AppState?.drivers || [];
        const freeDrivers = drivers.filter(d => d.mode === 'free');

        if (!freeDrivers.length) {
            showToast('warning', 'Nuk ka shoferë të lirë', '');
            return;
        }

        const driverList = freeDrivers.map(d => `${d.name} (${String(d.vehicleId).padStart(2, '0')})`).join(', ');
        if (!confirm(`Dërgo shoferin te ky lokacion?\n\nShoferë të lirë: ${driverList}`)) return;

        showToast('info', '📤 Duke dërguar...', `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }

    // ═══ SHTO NË HARTË ═══
    function attachToMap(map) {
        if (!map) return;

        map.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            showMenu(e.latlng.lat, e.latlng.lng, e.originalEvent.clientX, e.originalEvent.clientY);
        });

        console.log('✅ Klik i djathtë u aktivizua në hartë');
    }

    function showToast(type, title, msg) {
        if (typeof window.showToast === 'function') window.showToast(type, title, msg);
    }

    return {
        init, attachToMap,
        showMenu, hideMenu,
        saveLocation, copyCoords, openNewLocationModal
    };
})();

console.log('✅ map-context-menu.js ngarkuar');
