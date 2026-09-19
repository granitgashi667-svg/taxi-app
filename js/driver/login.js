'use strict';

/**
 * js/driver/login.js — Login për shoferët
 */

window.DriverLogin = (() => {

    function init() {
        console.log('🔐 DriverLogin: Init...');

        // Butoni login
        document.getElementById('btn-login')?.addEventListener('click', doLogin);

        // Enter në password
        document.getElementById('login-password')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doLogin();
        });

        // Kontrollo sesion ekzistues
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await checkAndLogin(user);
            } else {
                console.log('Nuk ka sesion aktiv');
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    // LOGIN
    // ═══════════════════════════════════════════════════════
    async function doLogin() {
        const email = document.getElementById('login-email')?.value.trim();
        const password = document.getElementById('login-password')?.value;
        const errorEl = document.getElementById('login-error');

        if (!email || !password) {
            showError('Plotëso email dhe fjalëkalimin');
            return;
        }

        if (errorEl) errorEl.style.display = 'none';

        const btn = document.getElementById('btn-login');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Duke hyrë...';
        }

        try {
            const result = await firebase.auth().signInWithEmailAndPassword(email, password);
            await checkAndLogin(result.user);
        } catch (e) {
            console.error('❌ Login:', e);
            let msg = 'Email ose fjalëkalim i gabuar';
            if (e.code === 'auth/user-not-found') msg = 'Përdoruesi nuk ekziston';
            if (e.code === 'auth/wrong-password') msg = 'Fjalëkalim i gabuar';
            if (e.code === 'auth/too-many-requests') msg = 'Shumë tentativa. Provo pas 5 minutash';
            showError(msg);

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-sign-in-alt"></i> <span>HYR</span>';
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // KONTROLLO DHE HYR
    // ═══════════════════════════════════════════════════════
    async function checkAndLogin(user) {
        try {
            // Kontrollo nëse është shofer
            let driverData = null;

            // Provo collection "drivers"
            try {
                const doc = await firebase.firestore().collection('drivers').doc(user.uid).get();
                if (doc.exists) driverData = { id: user.uid, ...doc.data() };
            } catch (e) {}

            // Nëse nuk u gjet, kontrollo "users" me role=driver
            if (!driverData) {
                try {
                    const snap = await firebase.firestore().collection('users')
                        .where('email', '==', user.email)
                        .where('role', '==', 'driver')
                        .limit(1).get();
                    if (!snap.empty) {
                        const doc = snap.docs[0];
                        driverData = { id: doc.id, ...doc.data() };
                    }
                } catch (e) {}
            }

            if (!driverData) {
                showError('Kjo llogari nuk është e shoferit');
                await firebase.auth().signOut();
                return;
            }

            if (driverData.blocked) {
                showError('Llogaria jote është e bllokuar');
                await firebase.auth().signOut();
                return;
            }

            // Sukses
            console.log('✅ Shoferi hyri:', driverData.name);
            if (window.DriverApp) {
                DriverApp.onLoginSuccess(driverData);
            }
        } catch (e) {
            console.error('❌ Check login:', e);
            showError('Gabim gjatë verifikimit');
        }
    }

    // ═══════════════════════════════════════════════════════
    // SHFAQ GABIM
    // ═══════════════════════════════════════════════════════
    function showError(msg) {
        const el = document.getElementById('login-error');
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }

    return { init, doLogin };
})();

console.log('✅ js/driver/login.js ngarkuar');
