'use strict';

/**
 * shifts.js — Orari i punës + pushimet
 */

window.TaxiShifts = (() => {
    const COLLECTION = 'shifts';

    function db() { return window.TaxiFirebase?.db || null; }

    // ─── ORARI ───
    async function startShift(operatorId, operatorName) {
        const database = db();
        if (!database) return null;
        try {
            const shift = {
                operatorId,
                operatorName,
                startTime: new Date().getTime(),
                startTimeStr: new Date().toLocaleString('sq-AL'),
                endTime: null,
                endTimeStr: null,
                duration: 0,
                active: true,
                createdAt: new Date().getTime()
            };
            const ref = await database.collection(COLLECTION).add(shift);
            console.log('✅ Sesioni filloi:', ref.id);
            return { id: ref.id, ...shift };
        } catch (e) { console.error('❌ startShift:', e); return null; }
    }

    async function endShift(shiftId) {
        const database = db();
        if (!database) return;
        try {
            const shift = await database.collection(COLLECTION).doc(shiftId).get();
            const start = shift.data()?.startTime || Date.now();
            const duration = Math.floor((Date.now() - start) / 60000); // në minuta

            await database.collection(COLLECTION).doc(shiftId).update({
                endTime: new Date().getTime(),
                endTimeStr: new Date().toLocaleString('sq-AL'),
                duration,
                active: false
            });
            console.log('✅ Sesioni mbaroi:', duration, 'min');
            return duration;
        } catch (e) { console.error('❌ endShift:', e); }
    }

    async function getActiveShift(operatorId) {
        const database = db();
        if (!database) return null;
        try {
            const snap = await database.collection(COLLECTION)
                .where('operatorId', '==', operatorId)
                .where('active', '==', true)
                .limit(1)
                .get();
            if (snap.empty) return null;
            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (e) { return null; }
    }

    // ─── PUSHIMET ───
    async function requestVacation(operatorId, operatorName, dateFrom, dateTo, reason = '') {
        const database = db();
        if (!database) return null;
        try {
            const days = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1;
            const vacation = {
                operatorId,
                operatorName,
                dateFrom,
                dateTo,
                days,
                reason,
                status: 'pending', // pending, approved, rejected
                requestedAt: new Date().getTime(),
                requestedAtStr: new Date().toLocaleString('sq-AL'),
                approvedBy: null,
                approvedAt: null
            };
            const ref = await database.collection('vacations').add(vacation);
            console.log('✅ Kërkesë pushimi u dërgua:', days, 'ditë');
            return { id: ref.id, ...vacation };
        } catch (e) { console.error('❌ requestVacation:', e); return null; }
    }

    async function approveVacation(vacationId, approved = true) {
        const database = db();
        if (!database) return;
        try {
            await database.collection('vacations').doc(vacationId).update({
                status: approved ? 'approved' : 'rejected',
                approvedBy: window.TaxiAuth?.currentUser()?.uid || null,
                approvedAt: new Date().getTime()
            });
            console.log('✅ Pushimi u', approved ? 'aprovua' : 'refuzua');
        } catch (e) { console.error('❌ approveVacation:', e); }
    }

    async function getVacations(operatorId = null) {
        const database = db();
        if (!database) return [];
        try {
            let query = database.collection('vacations');
            if (operatorId) query = query.where('operatorId', '==', operatorId);
            query = query.orderBy('requestedAt', 'desc').limit(50);
            const snap = await query.get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { console.error('❌ getVacations:', e); return []; }
    }

    // Statistika pushimesh
    async function getVacationStats(operatorId) {
        const vacations = await getVacations(operatorId);
        const approved = vacations.filter(v => v.status === 'approved');
        const usedDays = approved.reduce((s, v) => s + (v.days || 0), 0);
        const totalDays = 22;
        return {
            total: totalDays,
            used: usedDays,
            remaining: totalDays - usedDays,
            pending: vacations.filter(v => v.status === 'pending').length
        };
    }

    return {
        startShift, endShift, getActiveShift,
        requestVacation, approveVacation, getVacations, getVacationStats
    };
})();

console.log('✅ shifts.js ngarkuar');
