'use strict';

/**
 * firebase.js — Lidhja me Firebase (Auth + Firestore)
 */

window.TaxiFirebase = (() => {
    let app = null;
    let auth = null;
    let db = null;
    let ready = false;

    function init() {
        if (ready) return { app, auth, db };

        if (!window.firebase) {
            console.error('❌ Firebase SDK nuk u ngarkua! Kontrollo index.html');
            return null;
        }

        if (!window.FIREBASE_CONFIG) {
            console.error('❌ FIREBASE_CONFIG mungon! Kontrollo firebase-config.js');
            return null;
        }

        try {
            // Inicializo Firebase (compat)
            app  = firebase.initializeApp(window.FIREBASE_CONFIG);
            auth = firebase.auth();
            db   = firebase.firestore();

            // Aktivizo persistence offline
            db.enablePersistence({ synchronizeTabs: true })
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn('⚠️ Persistence: shumë tabs të hapura');
                    } else if (err.code === 'unimplemented') {
                        console.warn('⚠️ Persistence: browser nuk e mbështet');
                    }
                });

            ready = true;
            console.log('✅ Firebase u inicializua');
            console.log('   Project:', window.FIREBASE_CONFIG.projectId);
            return { app, auth, db };

        } catch (e) {
            console.error('❌ Gabim në inicializimin e Firebase:', e);
            return null;
        }
    }

    return {
        init,
        get app()  { return app; },
        get auth() { return auth; },
        get db()   { return db; },
        get ready() { return ready; },

        // Shkurtesa
        collection: (name) => db.collection(name),
        doc: (path) => db.doc(path),
        serverTime: () => firebase.firestore.FieldValue.serverTimestamp()
    };
})();

console.log('✅ firebase.js ngarkuar');
