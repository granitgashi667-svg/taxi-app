'use strict';

/**
 * app.js — Bootstrap: Nisja e të gjitha moduleve
 * Kjo thirret NGA index.html pas ngarkimit të të gjithë file-ave.
 */

window.TaxiApp = (() => {
    let initialized = false;

    async function init() {
        if (initialized) {
            console.warn('⚠️ App.js u thirr përsëri');
            return;
        }
        initialized = true;

        console.log('🚀 TaxiApp: Fillimi i inicializimit...');

        // ═══ 1. FIREBASE ═══
        if (!window.TaxiFirebase) {
            console.error('❌ TaxiFirebase nuk u ngarkua');
            return;
        }
        window.TaxiFirebase.init();

        // ═══ 2. ORDER BRIDGE (para subscribe) ═══
        if (window.TaxiOrdersBridge) {
            window.TaxiOrdersBridge.init();
        }

        // ═══ 3. FIRESTORE SUBSCRIBE ═══
        if (window.TaxiOrders) {
            window.TaxiOrders.subscribe();
        }

        // ═══ 4. MESSAGES SUBSCRIBE ═══
        if (window.TaxiMessages) {
            window.TaxiMessages.subscribe();
        }

        // ═══ 5. AUTH STATE ═══
        if (window.TaxiAuth) {
            window.TaxiAuth.onAuthChange(async (user) => {
                if (user) {
                    console.log('👤 User aktiv:', user.email);

                    // Operator
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
                        }
                    }
                } else {
                    console.log('👤 Asnjë user aktiv');
                    if (window.TaxiOperators) window.TaxiOperators.stopSession();
                    resetRailUser();
                }
            });
        }

        // ═══ 6. RAIL USER KLIK ═══
        const railUser = document.getElementById('rail-user');
        if (railUser) {
            railUser.addEventListener('click', () => {
                if (window.TaxiAuth?.currentUser()) {
                    showOperatorStats();
                } else {
                    document.getElementById('modal-login')?.classList.add('active');
                    setTimeout(() => document.getElementById('login-email')?.focus(), 200);
                }
            });
        }

        // ═══ 7. LOGIN BUTTON ═══
        setupLoginButton();

        // ═══ 8. LOGOUT BUTTON ═══
        setupLogoutButton();

        // ═══ 9. MODAL CLOSE ═══
        setupModalClose();

        // ═══ 10. CLIENT AUTO-SEARCH ═══
        setupClientSearch();

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

    // ═══ LOGIN ═══
    function setupLoginButton() {
        const btn = document.getElementById('btn-do-login');
        if (!btn) return;

        // Hiq listener-at e vjetër
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

                // Pastro
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

        // Enter në password
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
                console.log('🔍 Kërkim klienti:', phone);
                const result = await window.TaxiClients.searchByPhone(phone);
                window.TaxiClients.renderPanel(phone, result);

                if (result && result.lastOrder && result.lastOrder.name && !document.getElementById('client-name').value) {
                    document.getElementById('client-name').value = result.lastOrder.name;
                }
            }, 500);
        });

        console.log('✅ Client auto-search aktivizuar');
    }

    // ═══ OPERATOR STATS MODAL ═══
    async function showOperatorStats() {
        const user = window.TaxiAuth?.currentUser();
        if (!user) return;

        const body = document.getElementById('operator-stats-body');
        if (!body) return;

        body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">Duke ngarkuar statistikat...</div>';
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
                ${box('⏱️ Sesioni aktual', fmt(stats.sessionMinutes), 'var(--accent-purple)')}
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
                ${box('Të mbetura', stats.vacations.remainingDays, 'var(--accent-green)')}
            </div>

            <div style="text-align:center;padding:12px;background:rgba(168,85,247,.08);border-radius:8px;font-size:11px;color:var(--text-muted);">
                <i class="fa-solid fa-clock"></i> Hyrja e fundit: ${stats.lastLogin || '—'}
            </div>
        `;
    }

    return { init, showOperatorStats };
})();

console.log('✅ app.js ngarkuar');
