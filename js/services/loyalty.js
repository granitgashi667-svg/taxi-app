'use strict';

/**
 * loyalty.js — Karta Besnikërie (Loyalty Cards)
 */

window.TaxiLoyalty = (() => {
    const COLLECTION = 'loyalty_cards';
    const POINTS_PER_EURO = 1;
    const REWARD_THRESHOLD = 100; // 100 pikë = 1 udhëtim falas

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ MERR KARTËN ═══
    async function getCard(clientId) {
        const database = db();
        if (!database) return null;

        try {
            const doc = await database.collection(COLLECTION).doc(clientId).get();
            if (doc.exists) return { id: doc.id, ...doc.data() };

            const newCard = {
                clientId,
                points: 0,
                totalPoints: 0,
                totalSpent: 0,
                totalOrders: 0,
                freeRides: 0,
                level: 'bronze',
                history: [],
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL')
            };

            await database.collection(COLLECTION).doc(clientId).set(newCard);
            return { id: clientId, ...newCard };
        } catch (e) {
            console.error('❌ getCard:', e);
            return null;
        }
    }

    // ═══ SHTO PIKË ═══
    async function addPoints(clientId, amount, orderId = null) {
        const database = db();
        if (!database) return null;

        try {
            const cardRef = database.collection(COLLECTION).doc(clientId);
            const points = Math.floor(amount * POINTS_PER_EURO);

            await database.runTransaction(async (transaction) => {
                const doc = await transaction.get(cardRef);
                let card = doc.exists ? doc.data() : {
                    clientId, points: 0, totalPoints: 0, totalSpent: 0,
                    totalOrders: 0, freeRides: 0, level: 'bronze', history: []
                };

                card.points = (card.points || 0) + points;
                card.totalPoints = (card.totalPoints || 0) + points;
                card.totalSpent = (card.totalSpent || 0) + amount;
                card.totalOrders = (card.totalOrders || 0) + 1;

                // Update level
                card.level = calculateLevel(card.totalPoints);

                card.history = card.history || [];
                card.history.unshift({
                    id: Date.now(),
                    type: 'earn',
                    points,
                    amount,
                    orderId,
                    timestamp: Date.now(),
                    timestampStr: new Date().toLocaleString('sq-AL')
                });

                // Limit
                if (card.history.length > 100) card.history = card.history.slice(0, 100);

                transaction.set(cardRef, card, { merge: true });
            });

            console.log(`⭐ +${points} pikë → ${clientId}`);
            return { success: true, points };
        } catch (e) {
            console.error('❌ addPoints:', e);
            return null;
        }
    }

    // ═══ PËRDOR PIKË ═══
    async function redeemPoints(clientId, points, reward) {
        const database = db();
        if (!database) return null;

        try {
            const cardRef = database.collection(COLLECTION).doc(clientId);
            let success = false;

            await database.runTransaction(async (transaction) => {
                const doc = await transaction.get(cardRef);
                if (!doc.exists) throw new Error('Karta nuk ekziston');

                const card = doc.data();
                if (card.points < points) throw new Error('Pikë të pamjaftueshme');

                card.points -= points;
                card.freeRides = (card.freeRides || 0) + 1;
                card.history.unshift({
                    id: Date.now(),
                    type: 'redeem',
                    points: -points,
                    reward,
                    timestamp: Date.now(),
                    timestampStr: new Date().toLocaleString('sq-AL')
                });

                transaction.set(cardRef, card, { merge: true });
                success = true;
            });

            return { success };
        } catch (e) {
            console.error('❌ redeemPoints:', e);
            return { success: false, error: e.message };
        }
    }

    // ═══ NIVELI ═══
    function calculateLevel(totalPoints) {
        if (totalPoints >= 1000) return 'platinum';
        if (totalPoints >= 500) return 'gold';
        if (totalPoints >= 200) return 'silver';
        return 'bronze';
    }

    function getLevelInfo(level) {
        const levels = {
            bronze: { label: 'Bronz', color: '#cd7f32', icon: '🥉', discount: 0 },
            silver: { label: 'Argjend', color: '#c0c0c0', icon: '🥈', discount: 5 },
            gold: { label: 'Ar', color: '#ffd700', icon: '🥇', discount: 10 },
            platinum: { label: 'Platin', color: '#e5e4e2', icon: '💎', discount: 15 }
        };
        return levels[level] || levels.bronze;
    }

    // ═══ RENDER FAQJA ═══
    async function renderPage() {
        const el = document.querySelector('.page[data-page="loyalty"]');
        if (!el) return;

        el.innerHTML = `
            <div class="page-header">
                <div class="page-title">
                    <i class="fa-solid fa-gift"></i>
                    <div><h2>Karta Besnikërie</h2><p>Programi i besnikërisë</p></div>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card purple">
                    <div class="kpi-label"><i class="fa-solid fa-star"></i> Pikë për €1</div>
                    <div class="kpi-value" style="color:var(--accent-purple);">${POINTS_PER_EURO}</div>
                    <div class="kpi-sub">Për çdo €1 të shpenzuar</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-label"><i class="fa-solid fa-gift"></i> Udhëtim falas</div>
                    <div class="kpi-value green">${REWARD_THRESHOLD} pikë</div>
                    <div class="kpi-sub">Për 1 udhëtim falas</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-label"><i class="fa-solid fa-users"></i> Anëtarë</div>
                    <div class="kpi-value blue">0</div>
                    <div class="kpi-sub">Me kartë aktive</div>
                </div>
            </div>

            <div class="admin-table-wrap" style="margin-top:20px;">
                <div style="padding:14px 18px;background:var(--bg-tertiary);border-bottom:1px solid var(--border-color);">
                    <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--accent-purple);">
                        <i class="fa-solid fa-list"></i> Kërko klientin për kartë
                    </div>
                </div>
                <div style="padding:20px;text-align:center;">
                    <input type="tel" id="loyalty-search" class="input-field" placeholder="+383 44 123 456" style="max-width:400px;text-align:center;">
                    <div id="loyalty-result" style="margin-top:20px;"></div>
                </div>
            </div>
        `;

        setupSearch();
    }

    function setupSearch() {
        const search = document.getElementById('loyalty-search');
        let timer;
        search?.addEventListener('input', (e) => {
            clearTimeout(timer);
            const val = e.target.value.trim();
            if (val.length < 6) { document.getElementById('loyalty-result').innerHTML = ''; return; }
            timer = setTimeout(async () => {
                const result = await searchCardByPhone(val);
                renderCardResult(result);
            }, 500);
        });
    }

    async function searchCardByPhone(phone) {
        const database = db();
        if (!database) return null;

        try {
            const clientsSnap = await database.collection('clients').where('phone', '==', phone).limit(1).get();
            if (clientsSnap.empty) return null;
            const client = { id: clientsSnap.docs[0].id, ...clientsSnap.docs[0].data() };
            const card = await getCard(client.id);
            return { client, card };
        } catch (e) { return null; }
    }

    function renderCardResult(result) {
        const el = document.getElementById('loyalty-result');
        if (!el) return;

        if (!result) {
            el.innerHTML = '<p style="color:var(--text-muted);">Klient nuk u gjet</p>';
            return;
        }

        const { client, card } = result;
        const levelInfo = getLevelInfo(card.level);

        el.innerHTML = `
            <div style="max-width:500px;margin:0 auto;text-align:left;">
                <div style="background:linear-gradient(135deg,${levelInfo.color},${levelInfo.color}cc);border-radius:16px;padding:24px;color:white;box-shadow:0 10px 30px rgba(0,0,0,.3);">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-size:11px;opacity:.9;text-transform:uppercase;letter-spacing:1px;">Karta e Besnikërisë</div>
                            <div style="font-size:20px;font-weight:800;margin-top:6px;">${client.name || 'Klient'}</div>
                        </div>
                        <div style="font-size:40px;">${levelInfo.icon}</div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;">
                        <div>
                            <div style="font-size:10px;opacity:.8;text-transform:uppercase;">Pikët</div>
                            <div style="font-size:28px;font-weight:800;font-family:monospace;">${card.points}</div>
                        </div>
                        <div>
                            <div style="font-size:10px;opacity:.8;text-transform:uppercase;">Nivel</div>
                            <div style="font-size:28px;font-weight:800;">${levelInfo.label}</div>
                        </div>
                    </div>
                    <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.2);font-size:11px;opacity:.9;">
                        🎁 ${REWARD_THRESHOLD - (card.points % REWARD_THRESHOLD)} pikë deri në udhëtim falas
                    </div>
                </div>
            </div>
        `;
    }

    return {
        getCard, addPoints, redeemPoints,
        getLevelInfo, calculateLevel,
        renderPage, searchCardByPhone,
        POINTS_PER_EURO, REWARD_THRESHOLD
    };
})();

console.log('✅ loyalty.js ngarkuar');
