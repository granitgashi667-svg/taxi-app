'use strict';

/**
 * firebase.js — Lidhja me Firebase (Auth + Firestore) me persistence
 */

window.TaxiFirebase = (() => {
    let app = null;
    let auth = null;
    let db = null;
    let ready = false;
    let persistenceSet = false;

    function init() {
        if (ready) return { app, auth, db };

        if (!window.firebase) {
            console.error('❌ Firebase SDK nuk u ngarkua!');
            return null;
        }

        if (!window.FIREBASE_CONFIG) {
            console.error('❌ FIREBASE_CONFIG mungon!');
            return null;
        }

        try {
            app  = firebase.initializeApp(window.FIREBASE_CONFIG);
            auth = firebase.auth();
            db   = firebase.firestore();

            // 🔑 PERSISTENCE: Mbaj sesionin edhe pas rifreskimit
            if (!persistenceSet) {
                persistenceSet = true;

                auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                    .then(() => {
                        console.log('✅ Session persistence: LOCAL');
                    })
                    .catch((err) => {
                        console.warn('⚠️ Persistence error:', err);
                    });
            }

            // Firestore offline persistence
            db.enablePersistence({ synchronizeTabs: true })
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn('⚠️ Persistence: shumë tabs');
                    } else if (err.code === 'unimplemented') {
                        console.warn('⚠️ Persistence: browser nuk e mbështet');
                    }
                });

            ready = true;
            console.log('✅ Firebase u inicializua');
            console.log('   Project:', window.FIREBASE_CONFIG.projectId);
            return { app, auth, db };

        } catch (e) {
            console.error('❌ Gabim në inicializimin:', e);
            return null;
        }
    }

    return {
        init,
        get app()  { return app; },
        get auth() { return auth; },
        get db()   { return db; },
        get ready() { return ready; },
        collection: (name) => db.collection(name),
        doc: (path) => db.doc(path),
        serverTime: () => firebase.firestore.FieldValue.serverTimestamp()
    };
})();

console.log('✅ firebase.js ngarkuar');
