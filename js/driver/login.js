'use strict';

/**
 * js/driver/login.js — Login për shoferët
 */

window.DriverLogin = (() => {

    // ═══ LOGIN ═══
    async function login(email, password) {
        if (!email || !password) {
            showError('Shkruaj email dhe fjalëkalim');
            return null;
        }

        try {
            const btn = document.getElementById('btn-login');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Duke hyrë...';

            // Firebase Auth
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            console.log('✅ Login OK:', user.email);

            // Kontrollo a është shofer
            const driver = await getDriverByEmail(user.email);

            if (!driver) {
                await firebase.auth().signOut();
                showError('Ky account nuk është shofer. Kontakto zyrën.');
                return null;
            }

            if (driver.active === false) {
                await firebase.auth().signOut();
                showError('Accounti juaj është bllokuar. Kontakto zyrën.');
                return null;
            }

            // Ruaj shoferin në storage
            window.TaxiStorage?.set('taxi.driver', {
                id: driver.id,
                name: driver.name,
                email: driver.email,
                phone: driver.phone,
                vehicleId: driver.vehicleId,
                avatar: driver.avatar,
                loginAt: Date.now()
            });

            console.log('✅ Shofer u ngarkua:', driver.name);
            return driver;

        } catch (e) {
            console.error('❌ Login error:', e);
            let msg = 'Gabim gjatë login-it';
            if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                msg = 'Email ose fjalëkalim i gabuar';
            } else if (e.code === 'auth/invalid-email') {
                msg = 'Email-i nuk është valid';
            } else if (e.code === 'auth/too-many-requests') {
                msg = 'Shumë tentativa. Provo më vonë.';
            } else if (e.code === 'auth/network-request-failed') {
                msg = 'Problem me internetin';
            }
            showError(msg);
            return null;
        } finally {
            const btn = document.getElementById('btn-login');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-sign-in-alt"></i><span>HYR</span>';
            }
        }
    }

    // ═══ GJEO SHOFRIN NË FIRESTORE ═══
    async function getDriverByEmail(email) {
        const db = window.TaxiFirebase?.db;
        if (!db) return null;

        try {
            // Provo sipas email
            let snap = await db.collection('drivers').where('email', '==', email).limit(1).get();

            if (snap.empty) {
                // Provo sipas username (para @)
                const username = email.split('@')[0];
                snap = await db.collection('drivers').where('name', '==', username).limit(1).get();
            }

            if (snap.empty) return null;

            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() };

        } catch (e) {
            console.error('❌ getDriver:', e);
            return null;
        }
    }

    // ═══ KONTROLLO SESION AKTUAL ═══
    async function checkExistingSession() {
        const saved = window.TaxiStorage?.get('taxi.driver');
        if (!saved || !saved.id) return null;

        // Kontrollo me Firebase nëse user është i loguar
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return null;

        // Verifiko që shoferi ekziston
        const db = window.TaxiFirebase?.db;
        if (!db) return saved;

        try {
            const doc = await db.collection('drivers').doc(saved.id).get();
            if (!doc.exists) return null;

            const driver = { id: doc.id, ...doc.data() };

            // Verifiko që është aktiv
            if (driver.active === false) {
                await firebase.auth().signOut();
                window.TaxiStorage.remove('taxi.driver');
                return null;
            }

            return driver;
        } catch (e) {
            console.warn('Session check error:', e);
            return saved;
        }
    }

    // ═══ SHFAQ GABIM ═══
    function showError(msg) {
        const errBox = document.getElementById('login-error');
        if (!errBox) return;
        errBox.textContent = '❌ ' + msg;
        errBox.style.display = 'block';
        setTimeout(() => { errBox.style.display = 'none'; }, 5000);
    }

    // ═══ INIT ═══
    function init() {
        // Klik button
        document.getElementById('btn-login')?.addEventListener('click', async () => {
            const email = document.getElementById('login-email')?.value.trim();
            const password = document.getElementById('login-password')?.value;

            const driver = await login(email, password);
            if (driver && window.DriverApp) {
                window.DriverApp.onLoginSuccess(driver);
            }
        });

        // Enter
        document.getElementById('login-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-login')?.click();
        });

        console.log('✅ DriverLogin init');
    }

    return { init, login, checkExistingSession, getDriverByEmail };
})();

console.log('✅ driver/login.js ngarkuar');
