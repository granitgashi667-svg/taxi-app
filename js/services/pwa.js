'use strict';

/**
 * pwa.js — Progressive Web App (instalim, offline, updates)
 */

window.TaxiPWA = (() => {
    let installPrompt = null;
    let isInstalled = false;
    let swRegistration = null;

    // ═══ INIT ═══
    async function init() {
        // Kontrollo nëse është e instaluar
        isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone === true;

        if (isInstalled) {
            console.log('📱 PWA: E instaluar');
        } else {
            console.log('📱 PWA: Në browser');
        }

        // Regjistro Service Worker
        await registerServiceWorker();

        // Dëgjo event për install prompt
        setupInstallPrompt();

        // Update check
        checkForUpdates();

        console.log('✅ PWA gati');
    }

    // ═══ SERVICE WORKER ═══
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Worker nuk mbështetet');
            return;
        }

        try {
            swRegistration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            console.log('✅ Service Worker u regjistrua');

            // Kontrollo për updates
            swRegistration.addEventListener('updatefound', () => {
                const newWorker = swRegistration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('🔄 Version i re i disponueshëm');
                        showUpdateNotification();
                    }
                });
            });

        } catch (e) {
            console.warn('❌ Service Worker error:', e);
        }
    }

    // ═══ INSTALL PROMPT ═══
    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            installPrompt = e;
            console.log('📱 Install prompt i disponueshëm');
            showInstallBanner();
        });

        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA u instalua');
            installPrompt = null;
            isInstalled = true;
            hideInstallBanner();
            if (typeof showToast === 'function') {
                showToast('success', '📱 U instalua!', 'TaxiApp është gati në desktop');
            }
        });
    }

    // ═══ SHFAQ BANNER INSTALIMI ═══
    function showInstallBanner() {
        // Mos shfaq nëse është i instaluar ose është hequr
        if (isInstalled) return;
        if (window.TaxiStorage?.get('taxi.install_dismissed')) return;

        const banner = document.createElement('div');
        banner.className = 'pwa-install-banner';
        banner.id = 'pwa-install-banner';
        banner.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;flex:1;">
                <div style="width:44px;height:44px;background:var(--gradient-primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;color:white;flex-shrink:0;">
                    🚕
                </div>
                <div style="flex:1;">
                    <div style="font-size:13px;font-weight:800;color:var(--text-primary);">Instalo TaxiApp</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Hap më shpejt, punon edhe offline</div>
                </div>
            </div>
            <button class="btn-primary" style="padding:8px 14px;font-size:11px;" onclick="TaxiPWA.install()">
                INSTALO
            </button>
            <button style="background:transparent;border:none;color:var(--text-muted);font-size:18px;padding:4px 8px;cursor:pointer;" onclick="TaxiPWA.dismissInstall()">
                &times;
            </button>
        `;
        document.body.appendChild(banner);
    }

    function hideInstallBanner() {
        document.getElementById('pwa-install-banner')?.remove();
    }

    // ═══ INSTALO ═══
    async function install() {
        if (!installPrompt) {
            // Nëse nuk ka prompt automatik → udhëzo manualisht
            showManualInstallInstructions();
            return;
        }

        installPrompt.prompt();
        const result = await installPrompt.userChoice;
        console.log('📱 Zgjedhja:', result.outcome);

        if (result.outcome === 'accepted') {
            hideInstallBanner();
        }
        installPrompt = null;
    }

    function dismissInstall() {
        hideInstallBanner();
        window.TaxiStorage?.set('taxi.install_dismissed', true);
    }

    // ═══ UDHËZIME MANUALE ═══
    function showManualInstallInstructions() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-pwa-install';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-mobile-screen"></i>
                        <h3>Si të instalosh</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-pwa-install').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display:flex;flex-direction:column;gap:12px;">
                        <div style="padding:14px;background:var(--bg-tertiary);border-radius:10px;border-left:3px solid var(--accent-purple);">
                            <div style="font-size:12px;font-weight:800;color:var(--accent-purple);margin-bottom:6px;">📱 Android (Chrome)</div>
                            <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">
                                1. Kliko ikonën ⋮ (3 pikat) lart djathtas<br>
                                2. Zgjedh "Instalo aplikacionin" ose "Shto në ekran"<br>
                                3. Konfirmo
                            </div>
                        </div>
                        <div style="padding:14px;background:var(--bg-tertiary);border-radius:10px;border-left:3px solid var(--accent-pink);">
                            <div style="font-size:12px;font-weight:800;color:var(--accent-pink);margin-bottom:6px;">🍎 iPhone (Safari)</div>
                            <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">
                                1. Kliko butonin Share (⬆️)<br>
                                2. Zgjedh "Shto në Home Screen"<br>
                                3. Konfirmo
                            </div>
                        </div>
                        <div style="padding:14px;background:var(--bg-tertiary);border-radius:10px;border-left:3px solid var(--accent-green);">
                            <div style="font-size:12px;font-weight:800;color:var(--accent-green);margin-bottom:6px;">💻 PC / Laptop (Chrome, Edge)</div>
                            <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">
                                1. Kliko ikonën ⊕ në adresë-bar<br>
                                2. Kliko "Instalo"<br>
                                3. Ikona shfaqet në Desktop
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-pwa-install').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ UPDATE NOTIFICATION ═══
    function showUpdateNotification() {
        if (typeof showToast === 'function') {
            const toast = showToast('info', '🔄 Version i re', 'Kliko për të rifreskuar');
        }

        // Krijo toast me buton
        const c = document.getElementById('toast-container');
        if (!c) return;

        const t = document.createElement('div');
        t.className = 'toast info';
        t.innerHTML = `
            <i class="fa-solid fa-rotate"></i>
            <div class="toast-content" style="flex:1;">
                <div class="toast-title">🔄 Version i re i disponueshëm</div>
                <div class="toast-message">Kliko për të rifreskuar</div>
            </div>
            <button class="btn-primary" style="padding:6px 12px;font-size:11px;" onclick="TaxiPWA.applyUpdate()">
                RIFRESKO
            </button>
        `;
        c.appendChild(t);
    }

    function applyUpdate() {
        if (swRegistration?.waiting) {
            swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        setTimeout(() => location.reload(), 500);
    }

    // ═══ CHECK FOR UPDATES ═══
    function checkForUpdates() {
        if (swRegistration) {
            setInterval(() => {
                swRegistration.update();
            }, 60 * 60 * 1000); // Çdo 1 orë
        }
    }

    // ═══ STATUS ═══
    function getStatus() {
        return {
            installed: isInstalled,
            hasPrompt: !!installPrompt,
            swActive: !!swRegistration
        };
    }

    return {
        init, install, dismissInstall,
        showManualInstallInstructions,
        applyUpdate, getStatus
    };
})();

console.log('✅ pwa.js ngarkuar');
