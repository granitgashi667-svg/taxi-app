'use strict';

/**
 * js/director/login.js — Login për drejtorin
 */

window.DirectorLogin = (() => {

    // ═══ LOGIN ═══
    async function login(email, password) {
        if (!email || !password) {
            showError('Shkruaj email dhe fjalëkalim');
            return null;
        }

        try {
            const btn = document.getElementById('btn-login');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Duke hyrë...</span>';

            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            console.log('✅ Login OK:', user.email);

            // Kontrollo a është drejtor
            const operator = await getOperatorByEmail(user.email);

            if (!operator) {
                await firebase.auth().signOut();
                showError('Ky account nuk ka qasje në panel.');
                return null;
            }

            // VETËM director dhe admin mund të hyjnë
            const allowedRoles = ['director', 'admin'];
            if (!allowedRoles.includes(operator.role)) {
                await firebase.auth().signOut();
                showError('Vetëm drejtori ka qasje në këtë panel.');
                return null;
            }

            if (operator.active === false) {
                await firebase.auth().signOut();
                showError('Accounti juaj është bllokuar.');
                return null;
            }

            // Ruaj në storage
            window.TaxiStorage?.set('taxi.director', {
                id: operator.id,
                name: operator.name,
                email: operator.email,
                role: operator.role,
                avatar: operator.avatar || operator.name.slice(0, 2).toUpperCase(),
                loginAt: Date.now()
            });

            console.log('✅ Drejtori u ngarkua:', operator.name);
            return operator;

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

    // ═══ GJEO OPERATORIN ═══
    async function getOperatorByEmail(email) {
        const db = window.TaxiFirebase?.db;
        if (!db) return null;

        try {
            const snap = await db.collection('operators').where('email', '==', email).limit(1).get();
            if (snap.empty) return null;

            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (e) {
            console.error('❌ getOperator:', e);
            return null;
        }
    }

    // ═══ KONTROLLO SESION ═══
    async function checkExistingSession() {
        const saved = window.TaxiStorage?.get('taxi.director');
        if (!saved || !saved.id) return null;

        const currentUser = firebase.auth?.().currentUser;
        if (!currentUser) return null;

        const db = window.TaxiFirebase?.db;
        if (!db) return saved;

        try {
            const doc = await db.collection('operators').doc(saved.id).get();
            if (!doc.exists) return null;

            const operator = { id: doc.id, ...doc.data() };

            const allowedRoles = ['director', 'admin'];
            if (!allowedRoles.includes(operator.role) || operator.active === false) {
                await firebase.auth().signOut();
                window.TaxiStorage.remove('taxi.director');
                return null;
            }

            return operator;
        } catch (e) {
            console.warn('Session check error:', e);
            return saved;
        }
    }

    // ═══ GABIM ═══
    function showError(msg) {
        const errBox = document.getElementById('login-error');
        if (!errBox) return;
        errBox.textContent = '❌ ' + msg;
        errBox.style.display = 'block';
        setTimeout(() => { errBox.style.display = 'none'; }, 5000);
    }

    // ═══ INIT ═══
    function init() {
        document.getElementById('btn-login')?.addEventListener('click', async () => {
            const email = document.getElementById('login-email')?.value.trim();
            const password = document.getElementById('login-password')?.value;

            const operator = await login(email, password);
            if (operator && window.DirectorApp) {
                window.DirectorApp.onLoginSuccess(operator);
            }
        });

        document.getElementById('login-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-login')?.click();
        });

        console.log('✅ DirectorLogin init');
    }

    return { init, login, checkExistingSession, getOperatorByEmail };
})();

console.log('✅ director/login.js ngarkuar');
