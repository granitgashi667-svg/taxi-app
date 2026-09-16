'use strict';

/**
 * Firebase Cloud Functions për TaxiApp 2.0
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// ═══════════════════════════════════════════════════════════
// 1. KRIJO ACCOUNT PËR PËRDORUES (nga aplikacioni)
// ═══════════════════════════════════════════════════════════
exports.createUser = functions.https.onCall(async (data, context) => {
    // Kontrollo auth
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Duhet të jesh i loguar');
    }

    // Kontrollo rolin
    const callerDoc = await db.collection('operators').doc(context.auth.uid).get();
    if (!callerDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'Nuk ka qasje');
    }

    const callerRole = callerDoc.data().role;
    if (!['director', 'admin'].includes(callerRole)) {
        throw new functions.https.HttpsError('permission-denied', 'Vetëm drejtori mund të krijojë përdorues');
    }

    const { email, password, name, role, phone, vehicleId, baseSalary } = data;

    // Validim
    if (!email || !password || !name || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'Të dhënat mungojnë');
    }

    // Validim i rolit
    const validRoles = ['dispatcher', 'supervisor', 'manager', 'director', 'admin'];
    if (!validRoles.includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Rol i pavlefshëm');
    }

    try {
        // 1. Krijo user në Firebase Auth
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: name,
            emailVerified: false
        });

        // 2. Krijo dokument në Firestore
        const userData = {
            uid: userRecord.uid,
            email: email,
            name: name,
            phone: phone || '',
            role: role,
            active: true,
            avatar: name.slice(0, 2).toUpperCase(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAtLocal: Date.now(),
            createdBy: context.auth.uid,
            createdByName: callerDoc.data().name || 'Drejtori',
            stats: {
                totalMinutes: 0,
                callsTaken: 0,
                callsCancelled: 0,
                trips: 0,
                revenue: 0
            },
            vacations: {
                totalDays: 22,
                usedDays: 0,
                remainingDays: 22
            }
        };

        if (baseSalary) userData.baseSalary = baseSalary;
        if (vehicleId) userData.vehicleId = vehicleId;

        await db.collection('operators').doc(userRecord.uid).set(userData);

        // 3. Audit log
        await db.collection('audit_log').add({
            action: 'user_created',
            details: { email, role },
            userId: context.auth.uid,
            userEmail: context.auth.token.email,
            userName: callerDoc.data().name || 'Drejtori',
            userRole: callerRole,
            level: 'success',
            timestamp: Date.now(),
            timestampStr: new Date().toLocaleString('sq-AL')
        });

        return {
            success: true,
            uid: userRecord.uid,
            message: `Përdoruesi ${name} u krijua me sukses`
        };

    } catch (error) {
        console.error('Gabim në krijim user:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ═══════════════════════════════════════════════════════════
// 2. FSHIJ PËRDORUES
// ═══════════════════════════════════════════════════════════
exports.deleteUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Duhet të jesh i loguar');
    }

    const callerDoc = await db.collection('operators').doc(context.auth.uid).get();
    if (!callerDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'Nuk ka qasje');
    }

    const callerRole = callerDoc.data().role;
    if (!['director', 'admin'].includes(callerRole)) {
        throw new functions.https.HttpsError('permission-denied', 'Vetëm drejtori mund të fshijë');
    }

    const { uid } = data;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'UID mungon');
    }

    // Nuk mund ta fshish veten
    if (uid === context.auth.uid) {
        throw new functions.https.HttpsError('invalid-argument', 'Nuk mund të fshish veten');
    }

    try {
        // 1. Fshij nga Auth
        await auth.deleteUser(uid);

        // 2. Fshij nga Firestore
        await db.collection('operators').doc(uid).delete();

        // 3. Audit
        await db.collection('audit_log').add({
            action: 'user_deleted',
            details: { uid },
            userId: context.auth.uid,
            userEmail: context.auth.token.email,
            userName: callerDoc.data().name,
            userRole: callerRole,
            level: 'warn',
            timestamp: Date.now(),
            timestampStr: new Date().toLocaleString('sq-AL')
        });

        return { success: true, message: 'Përdoruesi u fshi' };

    } catch (error) {
        console.error('Gabim në fshirje:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ═══════════════════════════════════════════════════════════
// 3. NDRYSHO PASSWORD
// ═══════════════════════════════════════════════════════════
exports.changePassword = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Duhet të jesh i loguar');
    }

    const { uid, newPassword } = data;

    // Vetëm vetja ose director
    const callerDoc = await db.collection('operators').doc(context.auth.uid).get();
    const callerRole = callerDoc.exists ? callerDoc.data().role : null;
    const isSelf = uid === context.auth.uid;

    if (!isSelf && !['director', 'admin'].includes(callerRole)) {
        throw new functions.https.HttpsError('permission-denied', 'Nuk ka leje');
    }

    if (!newPassword || newPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Password duhet të ketë min 6 karaktere');
    }

    try {
        await auth.updateUser(uid, { password: newPassword });
        return { success: true, message: 'Password u ndryshua' };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ═══════════════════════════════════════════════════════════
// 4. DËRGO SMS — Kur porosia caktohet (SMS #1)
// ═══════════════════════════════════════════════════════════
exports.onOrderAssigned = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Vetëm kur statusi ndryshon në 'assigned'
        if (before.status === after.status) return null;
        if (after.status !== 'assigned') return null;

        // Kontrollo a ka klient
        if (!after.phone) return null;

        try {
            // Ndërto link tracking
            const trackingLink = `https://taxiapp-xxxx.web.app/track/${context.params.orderId}`;

            // Shto në SMS queue
            await db.collection('sms_queue').add({
                to: after.phone,
                text: `Taxi ju njofton se vetura ${after.vehicleNum} është nisur drejt jush. Ndjekeni live: ${trackingLink}`,
                type: 'assigned',
                orderId: context.params.orderId,
                status: 'pending',
                createdAt: Date.now()
            });

            console.log('✅ SMS #1 u vu në queue për:', after.phone);
            return null;

        } catch (error) {
            console.error('❌ Gabim SMS #1:', error);
            return null;
        }
    });

// ═══════════════════════════════════════════════════════════
// 5. DËRGO SMS #2 — Kur shoferi është 20m larg
// ═══════════════════════════════════════════════════════════
exports.onOrderArrived = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        if (before.status === after.status) return null;
        if (after.status !== 'arrived') return null;
        if (!after.phone) return null;

        try {
            // Merr veturën
            const vehicleDoc = await db.collection('drivers').doc(after.driverId).get();
            const vehiclePlate = vehicleDoc.exists ? (vehicleDoc.data().vehiclePlate || '') : '';

            await db.collection('sms_queue').add({
                to: after.phone,
                text: `Taxi ju njofton se vetura ${after.vehicleNum} me targa ${vehiclePlate} është duke ju pritur. Ju dëshirojmë udhëtim të këndshëm!`,
                type: 'arrived',
                orderId: context.params.orderId,
                status: 'pending',
                createdAt: Date.now()
            });

            console.log('✅ SMS #2 u vu në queue për:', after.phone);
            return null;

        } catch (error) {
            console.error('❌ Gabim SMS #2:', error);
            return null;
        }
    });

// ═══════════════════════════════════════════════════════════
// 6. BACKUP AUTOMATIK — Çdo ditë në 03:00
// ═══════════════════════════════════════════════════════════
exports.dailyBackup = functions.pubsub
    .schedule('0 3 * * *')
    .timeZone('Europe/Belgrade')
    .onRun(async (context) => {
        console.log('🗄️ Filloi backup-i ditor...');

        try {
            const collections = ['orders', 'operators', 'drivers', 'clients', 'messages'];
            const backupData = {};
            let totalRecords = 0;

            for (const col of collections) {
                const snap = await db.collection(col).get();
                backupData[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                totalRecords += snap.size;
            }

            // Ruaj metadata
            await db.collection('backups').add({
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL'),
                createdBy: 'sistemi',
                createdByName: 'Auto-Backup',
                collections: collections.length,
                totalRecords: totalRecords,
                size: Math.round(JSON.stringify(backupData).length / 1024),
                type: 'automatic'
            });

            console.log('✅ Backup ditor u krye:', totalRecords, 'rekorde');
            return null;

        } catch (error) {
            console.error('❌ Gabim në backup:', error);
            return null;
        }
    });

// ═══════════════════════════════════════════════════════════
// 7. PASTRO TË DHËNAT E VJETRA — Çdo javë
// ═══════════════════════════════════════════════════════════
exports.cleanupOldData = functions.pubsub
    .schedule('0 4 * * 0')
    .timeZone('Europe/Belgrade')
    .onRun(async (context) => {
        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);

        try {
            const snap = await db.collection('positions_history')
                .where('timestamp', '<', oneYearAgo)
                .limit(500)
                .get();

            const batch = db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            console.log(`🧹 U fshinë ${snap.size} pozicione të vjetra`);
            return null;

        } catch (error) {
            console.error('❌ Gabim në pastrim:', error);
            return null;
        }
    });

// ═══════════════════════════════════════════════════════════
// 8. STATISTIKA DITORE — Çdo ditë në 23:59
// ═══════════════════════════════════════════════════════════
exports.dailyStats = functions.pubsub
    .schedule('59 23 * * *')
    .timeZone('Europe/Belgrade')
    .onRun(async (context) => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        try {
            const snap = await db.collection('orders')
                .where('createdAtLocal', '>=', todayStart.getTime())
                .get();

            const orders = snap.docs.map(d => d.data());
            const completed = orders.filter(o => o.status === 'completed');
            const revenue = completed.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

            await db.collection('daily_stats').doc(new Date().toISOString().slice(0, 10)).set({
                date: new Date().toISOString().slice(0, 10),
                totalOrders: orders.length,
                completedOrders: completed.length,
                revenue: revenue,
                cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
                timestamp: Date.now()
            });

            console.log('📊 Statistikat ditore u ruajtën');
            return null;

        } catch (error) {
            console.error('❌ Gabim statistikat:', error);
            return null;
        }
    });

// ═══════════════════════════════════════════════════════════
// 9. KRIJO OPERATORIN E PARË (vetëm një herë)
// ═══════════════════════════════════════════════════════════
exports.seedFirstAdmin = functions.https.onCall(async (data, context) => {
    // Kontrollo nëse ka operatorë
    const snap = await db.collection('operators').limit(1).get();
    if (!snap.empty) {
        throw new functions.https.HttpsError('already-exists', 'Sistemi ka tashmë operatorë');
    }

    const { email, password, name } = data;

    try {
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: name
        });

        await db.collection('operators').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: email,
            name: name,
            role: 'director',
            active: true,
            avatar: name.slice(0, 2).toUpperCase(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAtLocal: Date.now(),
            stats: { totalMinutes: 0, callsTaken: 0, trips: 0, revenue: 0, callsCancelled: 0 },
            vacations: { totalDays: 22, usedDays: 0, remainingDays: 22 }
        });

        return { success: true, uid: userRecord.uid };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

console.log('✅ Cloud Functions u ngarkuan');
