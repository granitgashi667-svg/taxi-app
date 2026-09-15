'use strict';

/**
 * auth.js — Login/Logout me Firebase Authentication
 */

window.TaxiAuth = (() => {

    function getAuth() {
        return window.TaxiFirebase?.auth || null;
    }

    async function login(email, password) {
        const auth = getAuth();
        if (!auth) {
            throw new Error('Firebase nuk është gati');
        }

        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            const user = result.user;

            // Merr të dhënat e operatorit nga Firestore
            let profile = null;
            try {
                const doc = await window.TaxiFirebase.db
                    .collection('operators')
                    .doc(user.uid)
                    .get();
                if (doc.exists) profile = doc.data();
            } catch (e) {
                console.warn('Nuk u gjet profili në Firestore:', e);
            }

            console.log('✅ Login i suksesshëm:', user.email);
            return {
                uid: user.uid,
                email: user.email,
                name: profile?.name || user.email.split('@')[0],
                role: profile?.role || 'dispatcher'
            };
        } catch (e) {
            console.error('❌ Gabim login:', e.code, e.message);
            throw e;
        }
    }

    async function logout() {
        const auth = getAuth();
        if (!auth) return;
        await auth.signOut();
        console.log('✅ Logout i suksesshëm');
    }

    function onAuthChange(callback) {
        const auth = getAuth();
        if (!auth) return;
        auth.onAuthStateChanged(callback);
    }

    function currentUser() {
        const auth = getAuth();
        return auth ? auth.currentUser : null;
    }

    return {
        login,
        logout,
        onAuthChange,
        currentUser
    };
})();

console.log('✅ auth.js ngarkuar');
