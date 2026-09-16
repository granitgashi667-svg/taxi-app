'use strict';

/**
 * js/client/register.js — Regjistrimi i klientit me OTP
 */

window.ClientRegister = (() => {
    let confirmationResult = null;
    let otpTimer = null;
    let otpSeconds = 120;
    let phoneNumber = '';
    let verifiedPhone = '';

    // ═══ DËRGO OTP ═══
    async function sendOtp() {
        const input = document.getElementById('input-phone');
        const digits = input?.value.replace(/\D/g, '') || '';
        const terms = document.getElementById('check-terms')?.checked;

        // Validim
        if (digits.length < 8 || digits.length > 9) {
            showError('Shkruaj numrin e plotë (8-9 shifra)');
            return;
        }

        if (!terms) {
            showError('Duhet të pranosh kushtet e shërbimit');
            return;
        }

        phoneNumber = '+383' + digits;

        try {
            const btn = document.getElementById('btn-send-otp');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Duke dërguar...</span>';

            console.log('📱 Duke dërguar OTP te:', phoneNumber);

            // ⚠️ KONFIGURIMI: reCAPTCHA
            const appVerifier = new firebase.auth.RecaptchaVerifier('btn-send-otp', {
                size: 'invisible',
                callback: () => {}
            });

            confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier);

            console.log('✅ OTP u dërgua');

            // Kalon te step 2
            showStep('otp');
            document.getElementById('otp-phone').textContent = phoneNumber;

            // Nis timer
            startOtpTimer();

            // Focus te fusha e parë
            setTimeout(() => {
                document.querySelector('.otp-digit[data-index="0"]')?.focus();
            }, 300);

        } catch (e) {
            console.error('❌ OTP error:', e);
            let msg = 'Gabim gjatë dërgimit';
            if (e.code === 'auth/invalid-phone-number') msg = 'Numri nuk është valid';
            else if (e.code === 'auth/too-many-requests') msg = 'Shumë tentativa. Provo më vonë.';
            else if (e.code === 'auth/quota-exceeded') msg = 'Kuota u tejkalua';
            else if (e.code === 'auth/captcha-check-failed') msg = 'Verifikimi i sigurisë dështoi';
            showError(msg);
        } finally {
            const btn = document.getElementById('btn-send-otp');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>DËRGO KODIN</span>';
            }
        }
    }

    // ═══ VERIFIKO OTP ═══
    async function verifyOtp() {
        const digits = document.querySelectorAll('.otp-digit');
        const code = Array.from(digits).map(d => d.value).join('');

        if (code.length !== 6) {
            showError('Shkruaj kodin 6-shifror');
            return;
        }

        try {
            const btn = document.getElementById('btn-verify-otp');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Duke verifikuar...</span>';

            console.log('🔐 Duke verifikuar kodin:', code);

            const result = await confirmationResult.confirm(code);
            const user = result.user;

            console.log('✅ Verifikimi u krye:', user.uid);

            verifiedPhone = phoneNumber;

            // Kontrollo nëse klienti ekziston
            const existing = await checkExistingClient(user.uid);

            if (existing) {
                // Klient ekzistues → hyr direkt
                console.log('👤 Klient ekzistues:', existing.name);
                saveClientSession(existing, user.uid);
                onRegisterSuccess(existing);
            } else {
                // Klient i re → kërko emrin
                console.log('🆕 Klient i re — kërko emrin');
                showStep('name');
            }

        } catch (e) {
            console.error('❌ Verify error:', e);
            let msg = 'Kodi nuk është valid';
            if (e.code === 'auth/invalid-verification-code') msg = 'Kodi është i gabuar';
            else if (e.code === 'auth/code-expired') msg = 'Kodi ka skaduar. Kërko një kod të re.';
            showError(msg);
        } finally {
            const btn = document.getElementById('btn-verify-otp');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check"></i><span>VERIFIKO</span>';
            }
        }
    }

    // ═══ KRIJO LLOGARINË ═══
    async function finishRegister() {
        const name = document.getElementById('input-name')?.value.trim();
        const email = document.getElementById('input-email')?.value.trim();

        if (!name || name.length < 2) {
            showError('Shkruaj emrin tënd');
            return;
        }

        try {
            const btn = document.getElementById('btn-finish-register');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Duke krijuar...</span>';

            const user = firebase.auth().currentUser;
            if (!user) {
                showError('Sesioni ka skaduar. Provo përsëri.');
                return;
            }

            // Krijo në Firestore
            const db = window.TaxiFirebase?.db;
            if (!db) {
                showError('Firebase nuk është gati');
                return;
            }

            const clientData = {
                uid: user.uid,
                phone: verifiedPhone,
                name: name,
                email: email || '',
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL'),
                active: true,
                blocked: false,
                stats: {
                    totalOrders: 0,
                    completed: 0,
                    cancelled: 0,
                    totalSpent: 0
                }
            };

            await db.collection('clients').doc(user.uid).set(clientData);

            console.log('✅ Klient i re u krijua:', user.uid);

            saveClientSession(clientData, user.uid);
            onRegisterSuccess(clientData);

        } catch (e) {
            console.error('❌ finishRegister:', e);
            showError('Gabim gjatë krijimit të llogarisë');
        } finally {
            const btn = document.getElementById('btn-finish-register');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check"></i><span>KRIJO LLOGARINË</span>';
            }
        }
    }

    // ═══ KONTROLLO KLIENT EKZISTUES ═══
    async function checkExistingClient(uid) {
        const db = window.TaxiFirebase?.db;
        if (!db) return null;

        try {
            const doc = await db.collection('clients').doc(uid).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (e) {
            console.error('❌ checkExistingClient:', e);
            return null;
        }
    }

    // ═══ RUAJ SESIONIN ═══
    function saveClientSession(client, uid) {
        window.TaxiStorage?.set('taxi.client', {
            id: uid,
            name: client.name,
            phone: client.phone,
            email: client.email || '',
            avatar: client.name.slice(0, 2).toUpperCase(),
            loginAt: Date.now()
        });
    }

    // ═══ KUR REGJISTRIMI PËRFUNDON ═══
    function onRegisterSuccess(client) {
        if (window.TaxiAuditLog) {
            window.TaxiAuditLog.log('client_login', { clientId: client.id, phone: client.phone });
        }

        if (window.ClientApp) {
            window.ClientApp.onLoginSuccess(client);
        }

        showToast('success', '👋 Mirë se vjen', client.name);
    }

    // ═══ TIMER OTP ═══
    function startOtpTimer() {
        if (otpTimer) clearInterval(otpTimer);
        otpSeconds = 120;

        updateOtpTimerUI();

        otpTimer = setInterval(() => {
            otpSeconds--;
            updateOtpTimerUI();

            if (otpSeconds <= 0) {
                clearInterval(otpTimer);
                const btn = document.getElementById('btn-resend-otp');
                if (btn) btn.disabled = false;
            }
        }, 1000);
    }

    function updateOtpTimerUI() {
        const el = document.getElementById('otp-timer-text');
        if (!el) return;
        const m = Math.floor(otpSeconds / 60);
        const s = otpSeconds % 60;
        el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        if (otpSeconds <= 0) {
            el.textContent = '00:00';
            el.style.color = 'var(--accent-red)';
        }
    }

    // ═══ RIDËRGO OTP ═══
    async function resendOtp() {
        if (otpSeconds > 0) {
            showToast('warning', 'Prit', `Provo përsëri pas ${otpSeconds} sek`);
            return;
        }
        showStep('phone');
        setTimeout(() => sendOtp(), 100);
    }

    // ═══ SHFAQ STEP ═══
    function showStep(step) {
        document.querySelectorAll('.login-step').forEach(s => s.classList.remove('active'));
        document.getElementById('step-' + step)?.classList.add('active');
        hideError();
    }

    // ═══ GABIM ═══
    function showError(msg) {
        const errBox = document.getElementById('login-error');
        if (!errBox) return;
        errBox.textContent = '❌ ' + msg;
        errBox.style.display = 'block';
        setTimeout(() => { errBox.style.display = 'none'; }, 5000);
    }

    function hideError() {
        const errBox = document.getElementById('login-error');
        if (errBox) errBox.style.display = 'none';
    }

    // ═══ SETUP OTP INPUTS ═══
    function setupOtpInputs() {
        const digits = document.querySelectorAll('.otp-digit');

        digits.forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value.replace(/\D/g, '');
                e.target.value = val.slice(0, 1);

                if (val) {
                    e.target.classList.add('filled');
                    if (idx < digits.length - 1) {
                        digits[idx + 1].focus();
                    } else {
                        // Të gjitha plotësuar → verifiko automatikisht
                        const code = Array.from(digits).map(d => d.value).join('');
                        if (code.length === 6) {
                            setTimeout(verifyOtp, 200);
                        }
                    }
                } else {
                    e.target.classList.remove('filled');
                }

                checkOtpComplete();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                    digits[idx - 1].focus();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
                for (let i = 0; i < 6 && i < pasted.length; i++) {
                    digits[i].value = pasted[i];
                    digits[i].classList.add('filled');
                }
                checkOtpComplete();
                if (pasted.length >= 6) setTimeout(verifyOtp, 200);
            });
        });
    }

    function checkOtpComplete() {
        const digits = document.querySelectorAll('.otp-digit');
        const code = Array.from(digits).map(d => d.value).join('');
        const btn = document.getElementById('btn-verify-otp');
        if (btn) btn.disabled = code.length !== 6;
    }

    // ═══ SETUP PHONE INPUT ═══
    function setupPhoneInput() {
        const input = document.getElementById('input-phone');
        if (!input) return;

        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            if (val.length > 9) val = val.slice(0, 9);
            e.target.value = val;
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-send-otp')?.click();
        });
    }

    // ═══ INIT ═══
    function init() {
        setupPhoneInput();
        setupOtpInputs();

        document.getElementById('btn-send-otp')?.addEventListener('click', sendOtp);
        document.getElementById('btn-verify-otp')?.addEventListener('click', verifyOtp);
        document.getElementById('btn-finish-register')?.addEventListener('click', finishRegister);
        document.getElementById('btn-resend-otp')?.addEventListener('click', resendOtp);

        console.log('✅ ClientRegister init');
    }

    return {
        init, sendOtp, verifyOtp, finishRegister, resendOtp,
        checkExistingClient, saveClientSession
    };
})();

console.log('✅ client/register.js ngarkuar');
