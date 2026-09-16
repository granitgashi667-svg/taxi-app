'use strict';

window.ClientLoyalty = (() => {
    let myCard = null;

    function init() { console.log('💳 ClientLoyalty: Init...'); }

    async function load() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const phone = user.phoneNumber || '';
            let snap = await db.collection('loyalty_cards').where('phone', '==', phone).limit(1).get();

            if (snap.empty && user.uid) {
                snap = await db.collection('loyalty_cards').where('clientId', '==', user.uid).limit(1).get();
            }

            myCard = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
            render();
        } catch (e) { console.error('❌ load loyalty:', e); }
    }

    function render() {
        let el = document.getElementById('client-loyalty-page');
        if (!el) {
            el = document.createElement('div');
            el.id = 'client-loyalty-page';
            el.className = 'client-page';
            el.dataset.page = 'loyalty';
            document.getElementById('screen-main')?.appendChild(el);
        }

        if (!myCard) {
            el.innerHTML = `
                <div style="padding:16px;">
                    <h2 style="font-size:20px;font-weight:800;color:#f1f5f9;margin-bottom:16px;">
                        <i class="fa-solid fa-id-card" style="color:#a855f7;"></i> Karta ime
                    </h2>
                    <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
                        <i class="fa-solid fa-id-card" style="font-size:64px;opacity:.2;margin-bottom:16px;display:block;color:#a855f7;"></i>
                        <h3 style="color:#f1f5f9;font-size:16px;margin-bottom:6px;">Nuk ke kartë besnikërie</h3>
                        <p style="font-size:12px;">Bëj porosinë e parë për të marrë kartën!</p>
                    </div>
                </div>
            `;
            return;
        }

        const points = myCard.points || 0;
        const level = getLevel(points);
        const nextLevel = getNextLevel(points);
        const progress = getProgress(points);

        el.innerHTML = `
            <div style="padding:16px;">
                <h2 style="font-size:20px;font-weight:800;color:#f1f5f9;margin-bottom:16px;">
                    <i class="fa-solid fa-id-card" style="color:#a855f7;"></i> Karta ime
                </h2>

                <div style="background:linear-gradient(135deg,${level.color1},${level.color2});border-radius:20px;padding:24px;color:white;box-shadow:0 20px 40px ${level.color1}40;margin-bottom:20px;position:relative;overflow:hidden;">
                    <div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;background:rgba(255,255,255,.08);border-radius:50%;"></div>
                    <div style="position:absolute;bottom:-40px;left:-20px;width:160px;height:160px;background:rgba(255,255,255,.05);border-radius:50%;"></div>

                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;position:relative;">
                        <div>
                            <div style="font-size:10px;opacity:.85;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">${level.icon} ${level.label}</div>
                            <div style="font-size:11px;opacity:.75;margin-top:4px;">${myCard.name || 'Klient'}</div>
                        </div>
                        <i class="fa-solid fa-id-card" style="font-size:32px;opacity:.4;"></i>
                    </div>

                    <div style="font-size:42px;font-weight:800;font-family:var(--font-mono);letter-spacing:-2px;position:relative;">${points.toLocaleString()}</div>
                    <div style="font-size:11px;opacity:.85;margin-top:2px;">pikë · vlera €${(points / 100).toFixed(2)}</div>

                    ${nextLevel ? `
                        <div style="margin-top:20px;position:relative;">
                            <div style="display:flex;justify-content:space-between;font-size:10px;opacity:.85;margin-bottom:6px;">
                                <span>${level.label}</span>
                                <span>${nextLevel.label}</span>
                            </div>
                            <div style="background:rgba(0,0,0,.25);border-radius:10px;height:8px;overflow:hidden;">
                                <div style="background:white;height:100%;width:${progress}%;transition:width .5s;"></div>
                            </div>
                            <div style="font-size:10px;opacity:.85;margin-top:6px;text-align:center;">
                                Edhe ${nextLevel.needed - points} pikë për ${nextLevel.icon} ${nextLevel.label}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="db-panel" style="margin-bottom:16px;">
                    <div class="db-panel-header"><i class="fa-solid fa-gift"></i><h3>Zbritje</h3></div>
                    <div class="db-panel-body">
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                            <div style="padding:14px;background:#1e293b;border-radius:10px;text-align:center;">
                                <div style="font-size:24px;font-weight:800;color:#10b981;">€1</div>
                                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">100 pikë</div>
                            </div>
                            <div style="padding:14px;background:#1e293b;border-radius:10px;text-align:center;">
                                <div style="font-size:24px;font-weight:800;color:#10b981;">€5</div>
                                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">500 pikë</div>
                            </div>
                            <div style="padding:14px;background:#1e293b;border-radius:10px;text-align:center;">
                                <div style="font-size:24px;font-weight:800;color:#10b981;">€10</div>
                                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">1000 pikë</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-clock-rotate-left"></i><h3>Historiku i pikëve</h3></div>
                    <div class="db-panel-body" id="client-loyalty-history">
                        <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                </div>
            </div>
        `;

        loadHistory();
    }

    async function loadHistory() {
        const el = document.getElementById('client-loyalty-history');
        const db = window.TaxiFirebase?.db;
        if (!el || !db || !myCard) return;

        try {
            const snap = await db.collection('loyalty_transactions')
                .where('cardId', '==', myCard.id).limit(50).get();

            let txs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            if (!txs.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Pa transaksione</p></div>';
                return;
            }

            el.innerHTML = txs.map(t => `
                <div style="display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid #1e293b;">
                    <div style="width:32px;height:32px;background:${t.points > 0 ? '#10b98122' : '#ef444422'};color:${t.points > 0 ? '#10b981' : '#ef4444'};border-radius:8px;display:flex;align-items:center;justify-content:center;">
                        <i class="fa-solid ${t.points > 0 ? 'fa-plus' : 'fa-minus'}"></i>
                    </div>
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:12px;color:#f1f5f9;">${t.reason || (t.points > 0 ? 'Pikë të shtuara' : 'Zbritje')}</div>
                        <div style="font-size:10px;color:#64748b;font-family:var(--font-mono);">${formatDate(t.createdAt)}</div>
                    </div>
                    <div style="font-weight:800;font-family:var(--font-mono);color:${t.points > 0 ? '#10b981' : '#ef4444'};">
                        ${t.points > 0 ? '+' : ''}${t.points}
                    </div>
                </div>
            `).join('');
        } catch {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Pa transaksione</p></div>';
        }
    }

    const LEVELS = {
        bronze:   { label: 'Bronze',   icon: '🥉', min: 0,    color1: '#cd7f32', color2: '#8b5a2b' },
        silver:   { label: 'Silver',   icon: '🥈', min: 100,  color1: '#94a3b8', color2: '#64748b' },
        gold:     { label: 'Gold',     icon: '🥇', min: 500,  color1: '#f59e0b', color2: '#d97706' },
        platinum: { label: 'Platinum', icon: '💎', min: 1000, color1: '#a855f7', color2: '#7c3aed' }
    };

    function getLevel(points) {
        if (points >= 1000) return LEVELS.platinum;
        if (points >= 500) return LEVELS.gold;
        if (points >= 100) return LEVELS.silver;
        return LEVELS.bronze;
    }

    function getNextLevel(points) {
        if (points < 100) return { ...LEVELS.silver, needed: 100 };
        if (points < 500) return { ...LEVELS.gold, needed: 500 };
        if (points < 1000) return { ...LEVELS.platinum, needed: 1000 };
        return null;
    }

    function getProgress(points) {
        if (points < 100) return (points / 100) * 100;
        if (points < 500) return ((points - 100) / 400) * 100;
        if (points < 1000) return ((points - 500) / 500) * 100;
        return 100;
    }

    function formatDate(ts) {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }

    return { init, load, render };
})();

console.log('✅ client/loyalty.js ngarkuar');
