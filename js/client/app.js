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

        if (window.TaxiLocale) window.TaxiLocale.init();
        if (window.TaxiOffline) window.TaxiOffline.init();
        if (window.TaxiSound) window.TaxiSound.init();
        if (window.TaxiFirebase) window.TaxiFirebase.init();

        // Init modules e reja
        if (window.ClientLoyalty) ClientLoyalty.init();
        if (window.ClientWallet) ClientWallet.init();
        if (window.ClientHistory) ClientHistory.init();
        if (window.ClientProfile) ClientProfile.init();

        if (window.ClientRegister) window.ClientRegister.init();

        const existing = window.TaxiStorage?.get('taxi.client');
        const authUser = firebase.auth?.().currentUser;

        if (existing && authUser) {
            const client = await window.ClientRegister?.checkExistingClient(authUser.uid);
            if (client && !client.blocked) {
                onLoginSuccess(client);
            } else {
                showWelcome();
            }
        } else {
            showWelcome();
        }

        setTimeout(() => {
            document.getElementById('loading-overlay')?.classList.add('hidden');
        }, 600);

        setupEventListeners();

        console.log('✅ Client App gati');
    }

    function setupEventListeners() {
        document.getElementById('input-phone')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-send-otp')?.click();
        });
    }

    function showWelcome() {
        showScreen('welcome');
        currentStep = 'welcome';
    }

    function goToWelcome() {
        showWelcome();
    }

    function goToLogin() {
        showScreen('login');
        currentStep = 'login';

        document.querySelectorAll('.login-step').forEach(s => s.classList.remove('active'));
        document.getElementById('step-phone')?.classList.add('active');

        setTimeout(() => document.getElementById('input-phone')?.focus(), 300);
    }

    function onLoginSuccess(client) {
        currentClient = client;

        updateClientUI(client);
        showScreen('main');

        if (window.ClientOrder) window.ClientOrder.init();
        if (window.ClientTracking) window.ClientTracking.init();

        console.log('✅ Klienti u ngarkua:', client.name);

        showToast('success', '👋 Mirë se vjen', client.name);
    }

    function updateClientUI(client) {
        document.getElementById('client-avatar').textContent = client.avatar || (client.name || 'K').slice(0, 2).toUpperCase();
        document.getElementById('client-name').textContent = client.name || 'Klient';
    }

    function showScreen(name) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`screen-${name}`)?.classList.add('active');
    }

    // ═══ SWITCH TAB ═══
    function switchTab(tab) {
        currentTab = tab;

        // Update nav active
        document.querySelectorAll('.nav-item').forEach(i => {
            i.classList.toggle('active', i.dataset.tab === tab);
        });

        // Fshih TË GJITHA client-page
        document.querySelectorAll('.client-page').forEach(p => {
            p.classList.remove('active');
            p.style.display = '';
        });

        // Fshih seksionet e home
        const orderSection = document.getElementById('order-section');
        const trackingSection = document.getElementById('tracking-section');
        const rateSection = document.getElementById('rate-section');
        if (orderSection) orderSection.style.display = 'none';
        if (trackingSection) trackingSection.style.display = 'none';
        if (rateSection) rateSection.style.display = 'none';

        // Home page
        const homePage = document.getElementById('client-home-page');

        if (tab === 'home') {
            if (homePage) homePage.classList.add('active');

            if (window.ClientTracking?.hasActiveOrder()) {
                if (trackingSection) trackingSection.style.display = 'block';
            } else if (window.ClientTracking?.hasCompletedOrder()) {
                if (rateSection) rateSection.style.display = 'block';
            } else {
                if (orderSection) orderSection.style.display = 'block';
            }
            return;
        }

        // Fshih home
        if (homePage) homePage.classList.remove('active');

        // Shfaq faqen përkatëse
        if (tab === 'loyalty') {
            const el = document.getElementById('client-loyalty-page');
            if (el) { el.classList.add('active'); if (window.ClientLoyalty) ClientLoyalty.load(); }
        } else if (tab === 'wallet') {
            const el = document.getElementById('client-wallet-page');
            if (el) { el.classList.add('active'); if (window.ClientWallet) ClientWallet.load(); }
        } else if (tab === 'history') {
            const el = document.getElementById('client-history-page');
            if (el) { el.classList.add('active'); if (window.ClientHistory) ClientHistory.load(); }
        } else if (tab === 'profile') {
            const el = document.getElementById('client-profile-page');
            if (el) { el.classList.add('active'); if (window.ClientProfile) ClientProfile.load(); }
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

                let bestName = `Lokacioni im (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
                let bestDist = Infinity;

                if (window.TaxiData?.addresses) {
                    window.TaxiData.addresses.forEach(a => {
                        const d = window.TaxiUtils?.distanceKm(latitude, longitude, a.lat, a.lng) || 999;
                        if (d < bestDist && d < 0.1) {
                            bestDist = d;
                            bestName = a.name;
                        }
                    });
                }

                if (input) input.value = bestName;

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

    function activateSOS() {
        if (window.TaxiEmergency?.activate) {
            window.TaxiEmergency.activate();
        } else {
            if (confirm('Aktivizo SOS? Do kontaktohet menjëherë zyra.')) {
                showToast('warning', '🚨 SOS', 'U dërgua kërkesa për ndihmë');
            }
        }
    }

    async function logout() {
        if (!confirm('A jeni i sigurt që dëshironi të dilni?')) return;

        try {
            await firebase.auth().signOut();
            window.TaxiStorage?.remove('taxi.client');

            if (window.ClientTracking) window.ClientTracking.stop();

            setTimeout(() => location.reload(), 300);
        } catch (e) {
            console.error('Logout error:', e);
        }
    }

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
        switchTab, useMyLocation, activateSOS, showToast,
        get currentClient() { return currentClient; }
    };
})();

console.log('✅ client/app.js ngarkuar');
