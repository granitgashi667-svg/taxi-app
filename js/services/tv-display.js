'use strict';

/**
 * tv-display.js — TV Display (ekran i madh për zyrë)
 */

window.TaxiTvDisplay = (() => {
    let settings = {
        showDriverName: true,
        showVehicleNum: true,
        showPlate: false,
        showSpeed: false,
        showStatus: true,
        showDestination: false,
        vehicleFilter: 'all',
        selectedVehicles: [],
        darkMode: true,
        neonGlow: true,
        showTraffic: false
    };

    // ═══ INIT ═══
    function init() {
        loadSettings();
        console.log('✅ TV Display aktivizuar');
    }

    // ═══ LOAD SETTINGS ═══
    function loadSettings() {
        const saved = window.TaxiStorage?.get('taxi.tv_settings');
        if (saved) {
            settings = { ...settings, ...saved };
        }
    }

    function saveSettings() {
        window.TaxiStorage?.set('taxi.tv_settings', settings);
    }

    // ═══ UPDATE SETTING ═══
    function set(key, value) {
        settings[key] = value;
        saveSettings();
        console.log(`📺 TV: ${key} = ${value}`);
    }

    function get(key) {
        return settings[key];
    }

    // ═══ RENDER PANEL ═══
    function renderPanel() {
        const el = document.getElementById('tv-control-panel');
        if (!el) return;

        el.innerHTML = `
            <div class="tv-panel-header">
                <i class="fa-solid fa-tv"></i>
                <h3>Kontrolli i TV</h3>
            </div>

            <div class="tv-panel-body">
                <div class="tv-section">
                    <div class="tv-section-title">Shfaq në hartë:</div>
                    <label class="tv-check">
                        <input type="checkbox" ${settings.showDriverName ? 'checked' : ''} onchange="TaxiTvDisplay.set('showDriverName', this.checked); TaxiTvDisplay.rerender();">
                        <span>Emri i shoferit</span>
                    </label>
                    <label class="tv-check">
                        <input type="checkbox" ${settings.showVehicleNum ? 'checked' : ''} onchange="TaxiTvDisplay.set('showVehicleNum', this.checked); TaxiTvDisplay.rerender();">
                        <span>Numri i veturës</span>
                    </label>
                    <label class="tv-check">
                        <input type="checkbox" ${settings.showPlate ? 'checked' : ''} onchange="TaxiTvDisplay.set('showPlate', this.checked); TaxiTvDisplay.rerender();">
                        <span>Targa</span>
                    </label>
                    <label class="tv-check">
                        <input type="checkbox" ${settings.showSpeed ? 'checked' : ''} onchange="TaxiTvDisplay.set('showSpeed', this.checked); TaxiTvDisplay.rerender();">
                        <span>Shpejtësia</span>
                    </label>
                    <label class="tv-check">
                        <input type="checkbox" ${settings.showStatus ? 'checked' : ''} onchange="TaxiTvDisplay.set('showStatus', this.checked); TaxiTvDisplay.rerender();">
                        <span>Statusi</span>
                    </label>
                    <label class="tv-check">
                        <input type="checkbox" ${settings.showDestination ? 'checked' : ''} onchange="TaxiTvDisplay.set('showDestination', this.checked); TaxiTvDisplay.rerender();">
                        <span>Destinacioni</span>
                    </label>
                </div>

                <div class="tv-section">
                    <div class="tv-section-title">Filtro veturat:</div>
                    <select class="input-field" onchange="TaxiTvDisplay.set('vehicleFilter', this.value); TaxiTvDisplay.rerender();">
                        <option value="all" ${settings.vehicleFilter === 'all' ? 'selected' : ''}>Të gjitha</option>
                        <option value="free" ${settings.vehicleFilter === 'free' ? 'selected' : ''}>Vetëm të lirët</option>
                        <option value="busy" ${settings.vehicleFilter === 'busy' ? 'selected' : ''}>Vetëm në udhëtim</option>
                        <option value="pause" ${settings.vehicleFilter === 'pause' ? 'selected' : ''}>Vetëm pushim</option>
                    </select>
                </div>

                <div class="tv-section">
                    <div class="tv-section-title">Pamja:</div>
                    <label class="tv-check">
                        <input type="checkbox" ${settings.darkMode ? 'checked' : ''} onchange="TaxiTvDisplay.set('darkMode', this.checked); TaxiTvDisplay.applyTheme();">
                        <span>Dark mode</span>
                    </label>
                    <label class="tv-check">
                        <input type="checkbox" ${settings.neonGlow ? 'checked' : ''} onchange="TaxiTvDisplay.set('neonGlow', this.checked); TaxiTvDisplay.applyTheme();">
                        <span>Neon glow</span>
                    </label>
                    <label class="tv-check">
                        <input type="checkbox" ${settings.showTraffic ? 'checked' : ''} onchange="TaxiTvDisplay.set('showTraffic', this.checked); TaxiTvDisplay.rerender();">
                        <span>Trafik live</span>
                    </label>
                </div>

                <button class="btn-primary" style="width:100%;margin-top:12px;" onclick="TaxiTvDisplay.resetSettings()">
                    <i class="fa-solid fa-rotate"></i> Reset
                </button>
            </div>
        `;
    }

    // ═══ APPLY THEME ═══
    function applyTheme() {
        const container = document.getElementById('tv-container');
        if (!container) return;

        container.classList.toggle('tv-dark', settings.darkMode);
        container.classList.toggle('tv-neon', settings.neonGlow);
    }

    // ═══ RERENDER ═══
    function rerender() {
        // Nëse ekziston index.html → rifresko markerat
        if (window.AppState?.map) {
            // Fshij të gjithë markerat
            AppState.vehicleMarkers.forEach(m => {
                AppState.map.removeLayer(m);
            });
            AppState.vehicleMarkers.clear();

            // Ri-shto me filtër
            const drivers = getFilteredDrivers();
            drivers.forEach(d => {
                // Logjika e renderVehiclesOnMap por me filtra
            });
        }
    }

    function getFilteredDrivers() {
        const drivers = window.AppState?.drivers || [];

        if (settings.vehicleFilter === 'all') return drivers;
        if (settings.vehicleFilter === 'free') return drivers.filter(d => d.mode === 'free');
        if (settings.vehicleFilter === 'busy') return drivers.filter(d => d.mode === 'taximeter' || d.mode === 'fixed');
        if (settings.vehicleFilter === 'pause') return drivers.filter(d => d.mode === 'pause');

        return drivers;
    }

    // ═══ RESET ═══
    function resetSettings() {
        if (!confirm('Reset cilësimet e TV?')) return;

        settings = {
            showDriverName: true,
            showVehicleNum: true,
            showPlate: false,
            showSpeed: false,
            showStatus: true,
            showDestination: false,
            vehicleFilter: 'all',
            selectedVehicles: [],
            darkMode: true,
            neonGlow: true,
            showTraffic: false
        };
        saveSettings();
        renderPanel();
        applyTheme();
        rerender();
        console.log('✅ TV cilësimet u reset');
    }

    // ═══ POPULATE VEHICLES ═══
    function getVehicleLabel(driver) {
        const parts = [];
        if (settings.showVehicleNum) parts.push(`🚗 ${String(driver.vehicleId).padStart(2, '0')}`);
        if (settings.showDriverName) parts.push(driver.name);
        if (settings.showPlate) {
            const v = window.AppState?.vehicles?.find(x => x.id === driver.vehicleId);
            if (v) parts.push(v.plate);
        }
        if (settings.showSpeed) parts.push(`${driver.speed || 0} km/h`);
        if (settings.showStatus) parts.push(getStatusEmoji(driver.mode));
        return parts.join(' · ');
    }

    function getStatusEmoji(mode) {
        return { free: '🟢', taximeter: '🔵', fixed: '🔴', pause: '🟡', inactive: '⚪' }[mode] || '⚪';
    }

    return {
        init, set, get, renderPanel, applyTheme, rerender,
        resetSettings, getFilteredDrivers, getVehicleLabel,
        get settings() { return settings; }
    };
})();

console.log('✅ tv-display.js ngarkuar');
