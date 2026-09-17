'use strict';

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// ═══════════════════════════════════════════════════════
// 1. KUR KRIJOHET LLOGARI E RE → jep rolin 'client'
// ═══════════════════════════════════════════════════════
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    // Kontrollo nëse ka operators/{uid} me role të caktuar nga Cloud Function tjetër
    const opDoc = await db.collection('operators').doc(user.uid).get();
    let role = 'client';

    if (opDoc.exists && opDoc.data().role) {
      role = opDoc.data().role;
    }

    // Vendos custom claim
    await auth.setCustomUserClaims(user.uid, { role });

    // Audit log
    await db.collection('audit_log').add({
      action: 'user_created',
      userId: user.uid,
      email: user.email || '',
      phone: user.phoneNumber || '',
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ User ${user.uid} → role: ${role}`);
  } catch (e) {
    console.error('❌ onUserCreate:', e);
  }
});

// ═══════════════════════════════════════════════════════
// 2. SETUSERROLE — vetëm manager+ mund të ndryshojë role
// ═══════════════════════════════════════════════════════
exports.setUserRole = functions.https.onCall(async (data, context) => {
  // Kontrollo auth
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Duhet të jesh i kyçur');
  }

  const callerRole = context.auth.token.role;
  const allowedRoles = ['manager', 'director', 'admin'];

  if (!allowedRoles.includes(callerRole)) {
    throw new functions.https.HttpsError('permission-denied', 'Nuk ke leje');
  }

  const { targetUserId, newRole } = data;

  if (!targetUserId || !newRole) {
    throw new functions.https.HttpsError('invalid-argument', 'Mungon targetUserId ose newRole');
  }

  const validRoles = ['client', 'driver', 'operator', 'dispatcher', 'supervisor', 'manager', 'director', 'admin'];

  if (!validRoles.includes(newRole)) {
    throw new functions.https.HttpsError('invalid-argument', 'Rol i pavlefshëm');
  }

  // Vetëm admin mund të krijojë admin/director
  if (['admin', 'director'].includes(newRole) && callerRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Vetëm admin mund të krijojë admin/director');
  }

  try {
    // Vendos claim
    await auth.setCustomUserClaims(targetUserId, { role: newRole });

    // Përditëso operators doc nëse ekziston
    await db.collection('operators').doc(targetUserId).set({
      role: newRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid
    }, { merge: true });

    // Audit log
    await db.collection('audit_log').add({
      action: 'role_changed',
      targetUserId,
      newRole,
      oldRole: 'unknown',
      by: context.auth.uid,
      byEmail: context.auth.token.email || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, role: newRole };
  } catch (e) {
    console.error('❌ setUserRole:', e);
    throw new functions.https.HttpsError('internal', e.message);
  }
});

// ═══════════════════════════════════════════════════════
// 3. SEND SMS — vetëm dispatcher+ mund të thërrasë
// ═══════════════════════════════════════════════════════
exports.sendSMS = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Duhet të jesh i kyçur');
  }

  const role = context.auth.token.role;
  if (!['operator', 'dispatcher', 'supervisor', 'manager', 'director', 'admin'].includes(role)) {
    throw new functions.https.HttpsError('permission-denied', 'Nuk ke leje');
  }

  const { to, message, templateId, orderId } = data;

  if (!to || !message) {
    throw new functions.https.HttpsError('invalid-argument', 'Mungon numri ose mesazhi');
  }

  try {
    // Ruaj në queue për t'u dërguar nga sistemi SMS
    const docRef = await db.collection('sms_queue').add({
      to,
      message,
      templateId: templateId || null,
      orderId: orderId || null,
      status: 'pending',
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log
    await db.collection('sms_log').add({
      to,
      message,
      orderId: orderId || null,
      sentBy: context.auth.uid,
      status: 'queued',
      queueId: docRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, queueId: docRef.id };
  } catch (e) {
    console.error('❌ sendSMS:', e);
    throw new functions.https.HttpsError('internal', e.message);
  }
});

// ═══════════════════════════════════════════════════════
// 4. CALCULATE PRICE — çmimi llogaritet server-side
// ═══════════════════════════════════════════════════════
exports.calculatePrice = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Duhet të jesh i kyçur');
  }

  const { distanceKm, durationMin, tariff, zone, isNight } = data;

  // Tarifat bazë (mund të lexohen nga settings)
  const tariffs = {
    standard: { base: 2.00, perKm: 0.80, perMin: 0.15 },
    vip:      { base: 3.50, perKm: 1.20, perMin: 0.25 },
    airport:  { base: 5.00, perKm: 0.90, perMin: 0.15 },
    night:    { base: 3.00, perKm: 1.00, perMin: 0.20 },
    van:      { base: 4.00, perKm: 1.00, perMin: 0.20 }
  };

  const t = tariffs[tariff] || tariffs.standard;

  let price = t.base + (distanceKm * t.perKm) + (durationMin * t.perMin);

  // Night mode multiplier
  if (isNight) price *= 1.25;

  // Zone multiplier
  if (zone) {
    const zoneMultipliers = { zona1: 1.0, zona2: 1.1, zona3: 1.2, zona4: 1.3, zona5: 1.4 };
    price *= zoneMultipliers[zone] || 1.0;
  }

  // Min 2.50
  price = Math.max(2.50, Math.round(price * 100) / 100);

  return {
    price,
    breakdown: {
      base: t.base,
      distance: +(distanceKm * t.perKm).toFixed(2),
      time: +(durationMin * t.perMin).toFixed(2),
      nightMultiplier: isNight ? 1.25 : 1.0,
      zoneMultiplier: zone ? 1.0 : 1.0
    }
  };
});

// ═══════════════════════════════════════════════════════
// 5. ASSIGN ORDER — dispatch server-side
// ═══════════════════════════════════════════════════════
exports.assignOrderServer = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Duhet të jesh i kyçur');
  }

  const role = context.auth.token.role;
  if (!['operator', 'dispatcher', 'supervisor', 'manager', 'director', 'admin'].includes(role)) {
    throw new functions.https.HttpsError('permission-denied', 'Nuk ke leje');
  }

  const { orderId, mode } = data;

  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Mungon orderId');
  }

  try {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Porosia nuk ekziston');
    }

    const order = orderDoc.data();

    // Gjej shoferin më të mirë
    let driverQuery = db.collection('drivers')
      .where('online', '==', true)
      .where('mode', '==', 'free');

    const driversSnap = await driverQuery.get();
    const drivers = driversSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (drivers.length === 0) {
      throw new functions.https.HttpsError('failed-precondition', 'Nuk ka shoferë të lirë');
    }

    // Zgjedh sipas modalitetit
    let selected;
    if (mode === 'closest' && order.pickupLat && order.pickupLng) {
      selected = drivers.sort((a, b) => {
        const da = Math.hypot(a.lat - order.pickupLat, a.lng - order.pickupLng);
        const db_ = Math.hypot(b.lat - order.pickupLat, b.lng - order.pickupLng);
        return da - db_;
      })[0];
    } else {
      selected = drivers[0]; // FIFO
    }

    // Update order
    await db.collection('orders').doc(orderId).update({
      driverId: selected.id,
      driverName: selected.name || '',
      vehicleId: selected.vehicleId || '',
      vehicleNum: selected.vehicleNum || '',
      status: 'assigned',
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedBy: context.auth.uid
    });

    // Update driver
    await db.collection('drivers').doc(selected.id).update({
      mode: 'taximeter',
      currentOrderId: orderId
    });

    return { success: true, driver: selected };
  } catch (e) {
    console.error('❌ assignOrderServer:', e);
    throw new functions.https.HttpsError('internal', e.message);
  }
});

// ═══════════════════════════════════════════════════════
// 6. SYNC DRIVERS_PUBLIC — sinkronizo koleksionin publik
// ═══════════════════════════════════════════════════════
exports.syncDriverPublic = functions.firestore
  .document('drivers/{driverId}')
  .onWrite(async (change, context) => {
    const driverId = context.params.driverId;

    if (!change.after.exists) {
      await db.collection('drivers_public').doc(driverId).delete().catch(() => {});
      return;
    }

    const data = change.after.data();

    // Vetëm fushat publike
    const publicData = {
      name: data.name || '',
      vehicleNum: data.vehicleNum || '',
      plate: data.plate || '',
      rating: data.rating || 5.0,
      mode: data.mode || 'inactive',
      lat: data.lat || null,
      lng: data.lng || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('drivers_public').doc(driverId).set(publicData, { merge: true });
  });

// ═══════════════════════════════════════════════════════
// 7. CLEANUP POSITIONS_HISTORY — TTL 90 ditë
// ═══════════════════════════════════════════════════════
exports.cleanupPositions = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Europe/Belgrade')
  .onRun(async () => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const snap = await db.collection('positions_history')
      .where('createdAt', '<', cutoff)
      .limit(1000)
      .get();

    if (snap.empty) {
      console.log('✅ Nuk ka pozicione për fshirje');
      return null;
    }

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`🗑️ Fshirë ${snap.size} pozicione të vjetra`);
    return null;
  });

// ═══════════════════════════════════════════════════════
// 8. AUDIT LOG AUTO — nga triggers (opcionale)
// ═══════════════════════════════════════════════════════
exports.auditOrderCreate = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    await db.collection('audit_log').add({
      action: 'order_created',
      orderId: context.params.orderId,
      phone: snap.data().phone || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

console.log('✅ Cloud Functions gati');
