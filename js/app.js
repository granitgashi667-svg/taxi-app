'use strict';

/**
 * js/app.js — Bootstrap: Nisja e të gjitha moduleve
 */

window.TaxiApp = (() => {
    let initialized = false;

    async function init() {
        if (initialized) return;
        initialized = true;

        console.log('🚀 TaxiApp: Fillimi i inicializimit...');

        // ═══ 1. CORE MODULES ═══
        try {
            if (window.TaxiLocale) window.TaxiLocale.init();
            if (window.TaxiThemes) window.TaxiThemes.init();
            if (window.TaxiOffline) window.TaxiOffline.init();
            if (window.TaxiSound) window.TaxiSound.init();
        } catch (e) { console.warn('Core init:', e); }

        // ═══ 2. FIREBASE ═══
        if (!window.TaxiFirebase) {
            console.error('❌ TaxiFirebase mungon');
            return;
        }
        window.TaxiFirebase.init();

        // ═══ 3. PERMISSIONS ═══
        if (window.TaxiPermissions) window.TaxiPermissions.init();

        // ═══ 4. ORDER BRIDGE (para subscribe) ═══
        if (window.TaxiOrdersBridge) window.TaxiOrdersBridge.init();

        // ═══ 5. SUBSCRIBE FIRESTORE ═══
        if (window.TaxiOrders) window.TaxiOrders.subscribe();
        if (window.TaxiMessages) window.TaxiMessages.subscribe();

        // ═══ 6. BLACKLIST CACHE ═══
        if (window.TaxiBlacklist) window.TaxiBlacklist.loadCache();

        // ═══ 7. GEOFENCING ═══
        if (window.TaxiGeofencing) window.TaxiGeofencing.start();

        // ═══ 8. AUTO-SYNC ═══
        if (window.TaxiSync) window.TaxiSync.startAutoSync(5 * 60 * 1000);

        // ═══ 9. CALL CENTER ═══
        if (window.TaxiCallCenter) window.TaxiCallCenter.init();

        // ═══ 10. MAPS ═══
        if (window.TaxiMaps) window.TaxiMaps.init();

        // ═══ 11. AUDIT LOG ═══
        if (window.TaxiAuditLog) console.log('🔐 Audit Log gati');

        // ═══ 12. IP WHITELIST ═══
        if (window.TaxiIpWhitelist) {
            // Bypass në dev mode
            window.TaxiIpWhitelist.setBypass(true);
            window.TaxiIpWhitelist.init();
        }

        // ═══ 13. SESSION (auto-logout) ═══
        if (window.TaxiSession) window.TaxiSession.init();

        // ═══ 14. EMERGENCY (SOS listener) ═══
        if (window.TaxiEmergency) window.TaxiEmergency.init();

        // ═══ 15. REWIND ═══
        if (window.TaxiRewindUI) window.TaxiRewindUI.init();

        // ═══ 16. ZONES UI ═══
        if (window.TaxiZonesUI) window.TaxiZonesUI.init();

        // ═══ 17. TV DISPLAY ═══
        if (window.TaxiTvDisplay) window.TaxiTvDisplay.init();

        // ═══ 18. AUTH STATE ═══
        if (window.TaxiAuth) {
            window.TaxiAuth.onAuthChange(async (user) => {
                if (user) {
                    console.log('👤 User aktiv:', user.email);

                    if (window.TaxiOperators) {
                        const operator = await window.TaxiOperators.getOrCreate({
                            uid: user.uid,
                            email: user.email
                        });

                        if (operator) {
                            updateRailUser(operator.name);
                            window.TaxiOperators.setupTracking();

                            if (window.TaxiState) {
                                window.TaxiState.set('currentOperator', {
                                    ...window.TaxiState.get('currentOperator'),
                                    id: operator.uid,
                                    name: operator.name,
                                    email: operator.email,
                                    role: operator.role,
                                    loggedIn: true,
                                    loginTime: Date.now()
                                });
                            }

                            // Set role in permissions
                            if (window.TaxiPermissions) {
                                window.TaxiPermissions.setRole(operator.role || 'dispatcher');
                                setTimeout(() => window.TaxiPermissions.applyToUI(), 500);
                            }

                            if (window.TaxiLogger) {
                                window.TaxiLogger.success('login', { email: user.email });
                            }
                        }
                    }
                } else {
                    console.log('👤 Asnjë user aktiv');
                    if (window.TaxiOperators) window.TaxiOperators.stopSession();
                    resetRailUser();
                }
            });
        }

        // ═══ 19. RAIL USER KLIK ═══
        setupRailUserClick();

        // ═══ 20. LOGIN / LOGOUT ═══
        setupLoginButton();
        setupLogoutButton();

        // ═══ 21. MODAL CLOSE ═══
        setupModalClose();

        // ═══ 22. CLIENT AUTO-SEARCH ═══
        setupClientSearch();

        // ═══ 23. NOTIFICATIONS ═══
        if (window.TaxiNotifications) {
            window.TaxiNotifications.requestPermission();
        }

        // ═══ 24. MAP CONTEXT MENU ═══
        if (window.TaxiMapContextMenu && window.AppState?.map) {
            window.TaxiMapContextMenu.init();
            window.TaxiMapContextMenu.attachToMap(window.AppState.map);
        }

        // ═══ 25. VOICE COMMANDS ═══
        if (window.TaxiVoice) {
            window.TaxiVoice.init();
            document.getElementById('btn-voice-toggle')?.addEventListener('click', () => {
                window.TaxiVoice.toggle();
            });
        }

        // ═══ 26. DARK MODE TOGGLE ═══
        document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
            if (window.TaxiDarkMode) window.TaxiDarkMode.toggle();
        });

        // ═══ 27. EVENT LISTENERS ═══
        setupEventListeners();

        // ═══ 28. PWA ═══
        if (window.TaxiPWA) window.TaxiPWA.init();

        // ═══ 29. RESPONSIVE ═══
        if (window.TaxiResponsive) window.TaxiResponsive.init();

        // ═══ 30. SHORTCUTS ═══
        if (window.TaxiShortcuts) window.TaxiShortcuts.init();

        // ═══ 31. DARK MODE ═══
        if (window.TaxiDarkMode) window.TaxiDarkMode.init();

        // ═══ 32. 2FA ═══
        if (window.TaxiTwoFactor) window.TaxiTwoFactor.init();

        console.log('✅ TaxiApp: Init komplet përfundoi');
    }

    // ═══ HELPER: Rail User ═══
    function updateRailUser(name) {
        const el = document.getElementById('rail-user');
        if (el) {
            el.textContent = (name || 'OP').slice(0, 2).toUpperCase();
            el.title = name || 'Operator';
        }
    }

    function resetRailUser() {
        const el = document.getElementById('rail-user');
        if (el) {
            el.textContent = 'GD';
            el.title = 'Login';
        }
    }

    // ═══ RAIL USER KLIK ═══
    function setupRailUserClick() {
        const railUser = document.getElementById('rail-user');
        if (!railUser) return;
        railUser.addEventListener('click', () => {
            if (window.TaxiAuth?.currentUser()) {
                showOperatorStats();
            } else {
                document.getElementById('modal-login')?.classList.add('active');
                setTimeout(() => document.getElementById('login-email')?.focus(), 200);
            }
        });
    }

    // ═══ LOGIN BUTTON ═══
    function setupLoginButton() {
        const btn = document.getElementById('btn-do-login');
        if (!btn) return;

        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const errBox = document.getElementById('login-error');

            errBox.style.display = 'none';

            if (!email || !password) {
                errBox.textContent = 'Shkruaj email dhe fjalëkalim';
                errBox.style.display = 'block';
                return;
            }

            try {
                newBtn.disabled = true;
                newBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Duke hyrë...';

                const user = await window.TaxiAuth.login(email, password);
                console.log('✅ U loguat:', user);

                document.getElementById('modal-login')?.classList.remove('active');

                if (typeof showToast === 'function') {
                    showToast('success', 'U loguat', `Mirë se vjen, ${user.name}!`);
                }

                document.getElementById('login-email').value = '';
                document.getElementById('login-password').value = '';

            } catch (e) {
                let msg = 'Gabim gjatë login-it';
                if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-login-credentials') {
                    msg = 'Email ose fjalëkalim i gabuar';
                } else if (e.code === 'auth/user-not-found') {
                    msg = 'Ky user nuk ekziston';
                } else if (e.code === 'auth/invalid-email') {
                    msg = 'Email-i nuk është valid';
                } else if (e.code === 'auth/network-request-failed') {
                    msg = 'Problem me internetin';
                }
                errBox.textContent = '❌ ' + msg;
                errBox.style.display = 'block';
            } finally {
                newBtn.disabled = false;
                newBtn.innerHTML = '<i class="fa-solid fa-sign-in-alt"></i> Hyr';
            }
        });

        document.getElementById('login-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') newBtn.click();
        });
    }

    // ═══ LOGOUT ═══
    function setupLogoutButton() {
        const btn = document.getElementById('btn-logout');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            if (confirm('A jeni i sigurt që dëshironi të dilni?')) {
                await window.TaxiAuth.logout();
                document.getElementById('modal-operator-stats')?.classList.remove('active');
                if (typeof showToast === 'function') {
                    showToast('info', 'U dilni', 'Deri herën tjetër!');
                }
            }
        });
    }

    // ═══ MODAL CLOSE ═══
    function setupModalClose() {
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById(btn.dataset.close)?.classList.remove('active');
            });
        });
        document.querySelectorAll('.modal-overlay').forEach(ov => {
            ov.addEventListener('click', (e) => {
                if (e.target === ov) ov.classList.remove('active');
            });
        });
    }

    // ═══ CLIENT AUTO-SEARCH ═══
    function setupClientSearch() {
        const phoneInput = document.getElementById('client-phone');
        if (!phoneInput || !window.TaxiClients) return;

        let searchTimer = null;
        phoneInput.addEventListener('input', (e) => {
            const phone = e.target.value.trim();
            clearTimeout(searchTimer);
            if (phone.length < 6) {
                const p = document.getElementById('client-history-panel');
                if (p) p.style.display = 'none';
                return;
            }
            searchTimer = setTimeout(async () => {
                const result = await window.TaxiClients.searchByPhone(phone);
                window.TaxiClients.renderPanel(phone, result);
                if (result && result.lastOrder && result.lastOrder.name && !document.getElementById('client-name').value) {
                    document.getElementById('client-name').value = result.lastOrder.name;
                }
            }, 500);
        });
    }

    // ═══ EVENT LISTENERS ═══
    function setupEventListeners() {
        if (window.TaxiEvents) {
            window.TaxiEvents.on('firestore:order_added', (orders) => {
                orders.forEach(o => {
                    if (window.TaxiNotifications) window.TaxiNotifications.orderNew(o);
                });
            });

            // Kur porosia arrin në 20m → njoftim
            window.TaxiEvents.on('order:arrived', (data) => {
                console.log('📍 Porosia arriti:', data.orderId);
                if (typeof showToast === 'function') {
                    showToast('info', '📍 Shoferi arriti', `${data.distance}m larg`);
                }
            });
        }
    }

    // ═══ OPERATOR STATS ═══
    async function showOperatorStats() {
        const user = window.TaxiAuth?.currentUser();
        if (!user) return;

        const body = document.getElementById('operator-stats-body');
        if (!body) return;

        body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">Duke ngarkuar...</div>';
        document.getElementById('modal-operator-stats')?.classList.add('active');

        const stats = await window.TaxiOperators.getStats(user.uid);
        if (!stats) {
            body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--accent-red);">Nuk u gjetën statistikat</div>';
            return;
        }

        function fmt(min) {
            const h = Math.floor(min / 60), m = min % 60;
            return h > 0 ? `${h}h ${m}min` : `${m}min`;
        }

        const box = (label, val, color) => `
            <div style="background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:10px;padding:14px;">
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">${label}</div>
                <div style="font-size:22px;font-weight:800;font-family:monospace;color:${color};margin-top:4px;">${val}</div>
            </div>`;

        body.innerHTML = `
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:16px;background:var(--bg-tertiary);border-radius:12px;border-left:4px solid var(--accent-purple);">
                <div style="width:56px;height:56px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:white;">
                    ${(stats.name || 'OP').slice(0, 2).toUpperCase()}
                </div>
                <div>
                    <div style="font-size:16px;font-weight:800;">${stats.name}</div>
                    <div style="font-size:12px;color:var(--text-muted);">${stats.email} · ${stats.role}</div>
                    <div style="font-size:11px;color:var(--accent-green);margin-top:4px;">
                        <i class="fa-solid fa-circle" style="font-size:6px;"></i> Aktiv tani
                    </div>
                </div>
            </div>

            <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
                <i class="fa-solid fa-clock"></i> KOHËT
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                ${box('⏱️ Sesioni', fmt(stats.sessionMinutes), 'var(--accent-purple)')}
                ${box('📊 Total', fmt(stats.totalMinutes), 'var(--accent-purple)')}
            </div>

            <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
                <i class="fa-solid fa-phone"></i> THIRRJET
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                ${box('📞 Të marra', stats.callsTaken, 'var(--accent-pink)')}
                ${box('🚗 Udhëtime', stats.trips, 'var(--accent-green)')}
                ${box('❌ Anuluar', stats.callsCancelled, 'var(--accent-red)')}
                ${box('💰 Të ardhura', '€' + (stats.revenue || 0).toFixed(2), 'var(--accent-green)')}
            </div>

            <div style="font-size:11px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
                <i class="fa-solid fa-umbrella-beach"></i> PUSHIMET
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
                ${box('Total', stats.vacations.totalDays, 'var(--text-primary)')}
                ${box('Shfrytëzuar', stats.vacations.usedDays, 'var(--accent-yellow)')}
                ${box('Mbetura', stats.vacations.remainingDays, 'var(--accent-green)')}
            </div>

            <div style="text-align:center;padding:12px;background:rgba(168,85,247,.08);border-radius:8px;font-size:11px;color:var(--text-muted);">
                <i class="fa-solid fa-clock"></i> Hyrja e fundit: ${stats.lastLogin || '—'}
            </div>
        `;
    }

    return { init, showOperatorStats };
})();

console.log('✅ app.js ngarkuar');
