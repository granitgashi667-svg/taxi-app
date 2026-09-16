'use strict';

/**
 * referral.js — Sistemi Refer-a-Friend
 */

window.TaxiReferral = (() => {
    const COLLECTION = 'referrals';
    const BONUS_AMOUNT = 5; // €5 bonus për referuesin
    const WELCOME_BONUS = 3; // €3 për klientin e re

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ GJENERO KODIN E REFERIMIT ═══
    function generateCode(userId) {
        const short = userId.slice(-6).toUpperCase();
        return `TAXI${short}`;
    }

    // ═══ KRIJO REFERIM ═══
    async function createReferral(referrerId, newUserId, code) {
        const database = db();
        if (!database) return null;

        try {
            const referral = {
                referrerId,
                newUserId,
                code,
                bonusAmount: BONUS_AMOUNT,
                welcomeAmount: WELCOME_BONUS,
                status: 'pending',
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL')
            };

            const ref = await database.collection(COLLECTION).add(referral);

            // Bonus për referuesin
            if (window.TaxiWallet) {
                await window.TaxiWallet.addBalance(referrerId, BONUS_AMOUNT, 'Referim i suksesshëm');
                await window.TaxiWallet.addBalance(newUserId, WELCOME_BONUS, 'Bonus mirëseardhje');
            }

            // Update status
            await database.collection(COLLECTION).doc(ref.id).update({
                status: 'completed',
                completedAt: Date.now()
            });

            console.log('✅ Referral u regjistrua');
            return { id: ref.id, ...referral };

        } catch (e) {
            console.error('❌ createReferral:', e);
            return null;
        }
    }

    // ═══ KONTROLLO KODIN ═══
    async function validateCode(code) {
        const database = db();
        if (!database || !code) return null;

        try {
            // Gjej userin me këtë kod
            const snap = await database.collection('clients')
                .where('referralCode', '==', code)
                .limit(1)
                .get();

            if (snap.empty) return null;
            return { id: snap.docs[0].id, ...snap.docs[0].data() };

        } catch (e) {
            console.error('❌ validateCode:', e);
            return null;
        }
    }

    // ═══ STATS ═══
    async function getUserReferrals(userId) {
        const database = db();
        if (!database) return [];

        try {
            const snap = await database.collection(COLLECTION)
                .where('referrerId', '==', userId)
                .get();

            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            return [];
        }
    }

    async function getReferralStats(userId) {
        const referrals = await getUserReferrals(userId);
        const completed = referrals.filter(r => r.status === 'completed');

        return {
            total: referrals.length,
            completed: completed.length,
            totalEarned: completed.reduce((s, r) => s + (r.bonusAmount || 0), 0)
        };
    }

    return {
        generateCode, createReferral, validateCode,
        getUserReferrals, getReferralStats,
        BONUS_AMOUNT, WELCOME_BONUS
    };
})();

console.log('✅ referral.js ngarkuar');
