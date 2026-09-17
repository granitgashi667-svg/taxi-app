'use strict';

/**
 * setup-admin.js — Ekzekuto VETËM NJË HERË, pastaj fshije
 * 
 * Si të përdoret:
 * 1. Shkarko serviceAccountKey.json nga Firebase Console
 *    (Project Settings → Service Accounts → Generate New Private Key)
 * 2. Ruaje në të njëjtin folder me këtë file
 * 3. Në terminal:
 *    npm init -y
 *    npm install firebase-admin
 *    node setup-admin.js EMAILI_YT@email.com
 * 4. Pas ekzekutimit, fshij serviceAccountKey.json dhe setup-admin.js
 */

const admin = require('firebase-admin');

const email = process.argv[2];

if (!email) {
    console.error('❌ Përdorimi: node setup-admin.js emaili@domain.com');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

(async () => {
    try {
        const user = await admin.auth().getUserByEmail(email);

        await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });

        // Ruaj edhe në operators
        await admin.firestore().collection('operators').doc(user.uid).set({
            email: user.email,
            role: 'admin',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            setup: true
        }, { merge: true });

        console.log('✅ Sukses!');
        console.log(`   Email: ${email}`);
        console.log(`   UID:   ${user.uid}`);
        console.log(`   Roli:  admin`);
        console.log('');
        console.log('🔐 Tani: fshij serviceAccountKey.json dhe setup-admin.js');
        console.log('🔐 Pastaj: logout + login në aplikacion');
    } catch (e) {
        console.error('❌ Gabim:', e.message);
        process.exit(1);
    }
    process.exit(0);
})();
