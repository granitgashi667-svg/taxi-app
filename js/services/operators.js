'use strict';

/**
 * operators.js — Menaxhimi i operatorëve + statistikat e tyre
 */

window.TaxiOperators = (() => {
    const COLLECTION = 'operators';
    let currentOperatorId = null;
    let sessionStart = null;
    let heartbeatInterval = null;

    function db() {
        return window.TaxiFirebase?.db || null;
    }

    // ─── KRIJO OSE MERR OPERATORIN ───
    async function getOrCreate(user) {
        const database = db();
        if (!database || !user) return null;

        const ref = database.collection(COLLECTION).doc(user.uid);

        try {
            const doc = await ref.get();

            if (doc.exists) {
                // Update lastLogin
                await ref.update({
                    lastLogin: new Date().getTime(),
                    lastLoginDate: new Date().toLocaleString('sq-AL')
                });

                const data = doc.data();
                currentOperatorId = user.uid;

                // Fillim sesion
                sessionStart = Date.now();
                startHeartbeat();

                console.log('✅ Operator u ngarkua:', data.name);
                return { id: user.uid, ...data };
            } else {
                // Krijo operator të re
                const newOperator = {
                    uid: user.uid,
                    email: user.email,
                    name: user.email.split('@')[0],
                    role: 'dispatcher',
                    active: true,
                    createdAt: new Date().getTime(),
                    createdAtDate: new Date().toLocaleString('sq-AL'),
                    lastLogin: new Date().getTime(),
                    lastLoginDate: new Date().toLocaleString('sq-AL'),

                    // Statistikat
                    stats: {
                        totalMinutes: 0,
                        callsTaken: 0,
                        callsWaiting: 0,
                        callsOpened: 0,
                        callsCancelled: 0,
                        trips: 0,
                        revenue: 0
                    },

                    // Pushimet
                    vacations: {
                        totalDays: 22,
                        usedDays: 0,
                        remainingDays: 22
                    }
                };

                await ref.set(newOperator);
                currentOperatorId = user.uid;
                sessionStart = Date.now();
                startHeartbeat();

                console.log('✅ Operator i re u krijua:', newOperator.name);
                return { id: user.uid, ...newOperator };
            }
        } catch (e) {
            console.error('❌ Gabim operators:', e);
            return null;
        }
    }

    // ─── HEARTBEAT — përditëso kohën aktive çdo 60 sek ───
    function startHeartbeat() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);

        heartbeatInterval = setInterval(async () => {
            if (!sessionStart || !currentOperatorId) return;

            const minutesPassed = Math.floor((Date.now() - sessionStart) / 60000);

            // Update statistikat live në state
            if (window.TaxiState) {
                const op = window.TaxiState.get('currentOperator');
                op.stats = op.stats || {};
                op.stats.totalMinutes = (op.stats.totalMinutes || 0) + 1;
                window.TaxiState.set('currentOperator', op);
            }

            // Update Firestore çdo 5 minuta (jo çdo minutë, për të ulur kostot)
            if (minutesPassed > 0 && minutesPassed % 5 === 0) {
                await incrementStats(currentOperatorId, { totalMinutes: 5 });
            }
        }, 60000);

        console.log('💓 Heartbeat aktivizuar (çdo 60 sek)');
    }

    // ─── SHTO STATISTIKA ───
    async function incrementStats(uid, increments) {
        const database = db();
        if (!database || !uid) return;

        try {
            const updates = {};
            Object.entries(increments).forEach(([key, value]) => {
                updates[`stats.${key}`] = firebase.firestore.FieldValue.increment(value);
            });

            await database.collection(COLLECTION).doc(uid).update(updates);
        } catch (e) {
            console.error('❌ Gabim incrementStats:', e);
        }
    }

    // ─── EVENT LISTENERS nga biznesi ───
    function setupTracking() {
        // Kur shtohet porosi → +1 callsTaken
        window.TaxiEvents.on('operator:call_taken', () => {
            if (currentOperatorId) incrementStats(currentOperatorId, { callsTaken: 1 });
        });

        window.TaxiEvents.on('operator:trip_done', () => {
            if (currentOperatorId) incrementStats(currentOperatorId, { trips: 1 });
        });

        window.TaxiEvents.on('operator:cancelled', () => {
            if (currentOperatorId) incrementStats(currentOperatorId, { callsCancelled: 1 });
        });

        window.TaxiEvents.on('operator:revenue', (amount) => {
            if (currentOperatorId) incrementStats(currentOperatorId, { revenue: amount });
        });

        console.log('✅ Setup tracking për operatorin');
    }

    // ─── MERR STATISTIKAT E PLOTA ───
    async function getStats(uid) {
        const database = db();
        if (!database || !uid) return null;

        try {
            const doc = await database.collection(COLLECTION).doc(uid).get();
            if (!doc.exists) return null;

            const data = doc.data();
            const stats = data.stats || {};

            // Koha aktive në minutat e fundit
            const sessionMinutes = sessionStart ? Math.floor((Date.now() - sessionStart) / 60000) : 0;

            return {
                name: data.name,
                email: data.email,
                role: data.role,

                // Kohët
                totalMinutes: stats.totalMinutes || 0,
                sessionMinutes: sessionMinutes,
                lastLogin: data.lastLoginDate,

                // Thirrjet
                callsTaken: stats.callsTaken || 0,
                callsWaiting: stats.callsWaiting || 0,
                callsOpened: stats.callsOpened || 0,
                callsCancelled: stats.callsCancelled || 0,

                // Udhëtimet
                trips: stats.trips || 0,
                revenue: stats.revenue || 0,

                // Pushime
                vacations: data.vacations || { totalDays: 22, usedDays: 0, remainingDays: 22 }
            };
        } catch (e) {
            console.error('❌ Gabim getStats:', e);
            return null;
        }
    }

    // ─── NDALO SESIONIN ───
    async function stopSession() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }

        if (currentOperatorId && sessionStart) {
            const minutes = Math.floor((Date.now() - sessionStart) / 60000);
            if (minutes > 0) {
                await incrementStats(currentOperatorId, { totalMinutes: minutes });
            }
        }

        currentOperatorId = null;
        sessionStart = null;
        console.log('⏹️ Sesioni u ndal');
    }

    return {
        getOrCreate,
        incrementStats,
        getStats,
        setupTracking,
        stopSession
    };
})();

console.log('✅ operators.js ngarkuar');
