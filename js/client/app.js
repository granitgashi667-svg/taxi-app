'use strict';

/**
 * js/client/app.js — Logjika kryesore e App-it të Klientit
 */

window.ClientApp = (() => {
    let currentClient = null;
    let currentTab = 'home';
    let currentStep = 'welcome';

    // ═══ INIT ═══
    async function init() {
        console.log('📱 Client App: Init...');

        // Init modulet
        if (window.TaxiLocale) window.TaxiLocale.init();
        if (window.TaxiOffline) window.TaxiOffline.init();
        if (window.TaxiSound) window.TaxiSound.init();

        // Firebase
        if (window.TaxiFirebase) window.TaxiFirebase.init();

        // ClientRegister init
        if (window.ClientRegister) window.ClientRegister.init();

        // Kontrollo sesion ekzistues
        const existing = window.TaxiStorage?.get('taxi.client');
        const authUser = firebase.auth?.().currentUser;

        if (existing && authUser) {
            // Verifiko nëse klienti ekziston në Firestore
            const client = await window.ClientRegister?.checkExistingClient(authUser.uid);
            if (client && !client.blocked) {
                onLoginSuccess(client);
            } else {
                showWelcome();
            }
        } else {
            showWelcome();
        }

        // Fshij loading
        setTimeout(() => {
            document.getElementById('loading-overlay')?.classList.add('hidden');
        }, 600);

        // Event listeners
        setupEventListeners();

        console.log('✅ Client App gati');
    }

    // ═══ SETUP EVENT LISTENERS ═══
    function setupEventListeners() {
        // Enter në phone
        document.getElementById('input-phone')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-send-otp')?.click();
        });
    }

    // ═══ SHFAQ WELCOME ═══
    function showWelcome() {
        showScreen('welcome');
        currentStep = 'welcome';
    }

    function goToWelcome() {
        showWelcome();
    }

    // ═══ SHFAQ LOGIN ═══
    function goToLogin() {
        showScreen('login');
        currentStep = 'login';

        // Reset step
        document.querySelectorAll('.login-step').forEach(s => s.classList.remove('active'));
        document.getElementById('step-phone')?.classList.add('active');

        setTimeout(() => document.getElementById('input-phone')?.focus(), 300);
    }

    // ═══ KUR LOGIN ME SUKSES ═══
    function onLoginSuccess(client) {
        currentClient = client;

        // Update UI
        updateClientUI(client);

        // Switch screen
        showScreen('main');

        // Setup maps
        if (window.ClientOrder) window.ClientOrder.init();
        if (window.ClientTracking) window.ClientTracking.init();

        console.log('✅ Klienti u ngarkua:', client.name);

        showToast('success', '👋 Mirë se vjen', client.name);
    }

    // ═══ UPDATE UI ═══
    function updateClientUI(client) {
        document.getElementById('client-avatar').textContent = client.avatar || (client.name || 'K').slice(0, 2).toUpperCase();
        document.getElementById('client-name').textContent = client.name || 'Klient';
    }

    // ═══ SHFAQ SCREEN ═══
    function showScreen(name) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`screen-${name}`)?.classList.add('active');
    }

    // ═══ SWITCH TAB ═══
    function switchTab(tab) {
        currentTab = tab;

        document.querySelectorAll('.nav-item').forEach(i => {
            i.classList.toggle('active', i.dataset.tab === tab);
        });

        // Shfaq/fsheh seksionet
        const orderSection = document.getElementById('order-section');
        const trackingSection = document.getElementById('tracking-section');
        const rateSection = document.getElementById('rate-section');

        if (tab === 'home') {
            // Nëse ka porosi aktive → shfaq tracking
            if (window.ClientTracking?.hasActiveOrder()) {
                if (orderSection) orderSection.style.display = 'none';
                if (trackingSection) trackingSection.style.display = 'block';
                if (rateSection) rateSection.style.display = 'none';
            } else if (window.ClientTracking?.hasCompletedOrder()) {
                if (orderSection) orderSection.style.display = 'none';
                if (trackingSection) trackingSection.style.display = 'none';
                if (rateSection) rateSection.style.display = 'block';
            } else {
                if (orderSection) orderSection.style.display = 'block';
                if (trackingSection) trackingSection.style.display = 'none';
                if (rateSection) rateSection.style.display = 'none';
            }
        } else {
            // Tab tjera → fshih të gjitha
            if (orderSection) orderSection.style.display = 'none';
            if (trackingSection) trackingSection.style.display = 'none';
            if (rateSection) rateSection.style.display = 'none';

            // Shfaq toast për tab
            if (tab === 'history') {
                showToast('info', '📋 Historiku', 'Porositë e mëparshme');
            } else if (tab === 'profile') {
                showToast('info', '👤 Profili', currentClient?.name || 'Klient');
            }
        }
    }

    // ═══ PËRDOR LOKACIONIN TIM ═══
    async function useMyLocation() {
        if (!navigator.geolocation) {
            showToast('error', 'Gabim', 'GPS nuk mbështetet');
            return;
        }

        const input = document.getElementById('pickup-input');
        if (input) input.value = 'Duke gjetur lokacionin...';

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;

                // Kërko adresën më të afërt nga DB
                let bestName = `Lokacioni im (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
                let bestDist = Infinity;

                if (window.TaxiData?.addresses) {
                    window.TaxiData.addresses.forEach(a => {
                        const d = window.TaxiUtils?.distanceKm(latitude, longitude, a.lat, a.lng) || 999;
                        if (d < bestDist && d < 0.1) { // 100m
                            bestDist = d;
                            bestName = a.name;
                        }
                    });
                }

                if (input) input.value = bestName;

                // Ruaj koordinatat
                if (window.ClientOrder) {
                    window.ClientOrder.setPickupCoords(latitude, longitude);
                }

                showToast('success', '📍 Lokacioni u gjet', bestName);
            },
            (err) => {
                console.error('GPS error:', err);
                if (input) input.value = '';
                showToast('error', 'Gabim', 'Nuk mund të gjej lokacionin');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    // ═══ LOGOUT ═══
    async function logout() {
        if (!confirm('A jeni i sigurt që dëshironi të dilni?')) return;

        try {
            await firebase.auth().signOut();
            window.TaxiStorage?.remove('taxi.client');

            // Pastro state
            if (window.ClientTracking) window.ClientTracking.stop();

            // Reload
            setTimeout(() => location.reload(), 300);
        } catch (e) {
            console.error('Logout error:', e);
        }
    }

    // ═══ TOAST ═══
    function showToast(type, title, msg) {
        const c = document.getElementById('toast-container');
        if (!c) return;
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${msg || ''}</div></div>`;
        c.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateY(-20px)';
            setTimeout(() => t.remove(), 300);
        }, 3500);
        if (window.TaxiSound) {
            if (type === 'success') window.TaxiSound.playSuccess();
            else if (type === 'error') window.TaxiSound.playError();
        }
    }

    return {
        init, onLoginSuccess, logout,
        showWelcome, goToWelcome, goToLogin,
        switchTab, useMyLocation, showToast,
        get currentClient() { return currentClient; }
    };
})();

console.log('✅ client/app.js ngarkuar');
