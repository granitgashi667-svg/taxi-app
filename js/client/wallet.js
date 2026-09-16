'use strict';

window.ClientWallet = (() => {
    let balance = 0;
    let transactions = [];

    function init() { console.log('💰 ClientWallet: Init...'); }

    async function load() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        const el = document.getElementById('client-wallet-page');
        if (el) el.innerHTML = '<div style="text-align:center;padding:60px;color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;"></i></div>';

        try {
            const snap = await db.collection('wallets').doc(user.uid).get();
            if (snap.exists) {
                balance = snap.data().balance || 0;
            } else {
                await db.collection('wallets').doc(user.uid).set({
                    balance: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                balance = 0;
            }

            const txSnap = await db.collection('wallets').doc(user.uid).collection('transactions').limit(50).get();
            transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            render();
        } catch (e) {
            console.error('❌ load wallet:', e);
            render();
        }
    }

    function render() {
        const el = document.getElementById('client-wallet-page');
        if (!el) return;

        el.innerHTML = `
            <div style="padding:16px;">
                <h2 style="font-size:20px;font-weight:800;color:#f1f5f9;margin-bottom:16px;">
                    <i class="fa-solid fa-wallet" style="color:#10b981;"></i> Portofoli
                </h2>

                <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:20px;padding:28px;color:white;box-shadow:0 20px 40px rgba(16,185,129,.3);margin-bottom:20px;position:relative;overflow:hidden;">
                    <div style="position:absolute;top:-30px;right:-30px;width:140px;height:140px;background:rgba(255,255,255,.08);border-radius:50%;"></div>

                    <div style="font-size:10px;opacity:.85;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;position:relative;">
                        <i class="fa-solid fa-wallet"></i> Balanca ime
                    </div>
                    <div style="font-size:48px;font-weight:800;font-family:var(--font-mono);letter-spacing:-2px;margin-top:12px;position:relative;">
                        €${balance.toFixed(2)}
                    </div>

                    <div style="display:flex;gap:8px;margin-top:20px;position:relative;">
                        <button onclick="ClientWallet.topup()" style="flex:1;padding:12px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:10px;color:white;font-weight:700;font-size:12px;cursor:pointer;">
                            <i class="fa-solid fa-plus"></i> Mbush
                        </button>
                        <button onclick="ClientWallet.withdraw()" style="flex:1;padding:12px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:10px;color:white;font-weight:700;font-size:12px;cursor:pointer;">
                            <i class="fa-solid fa-arrow-up"></i> Tërhiq
                        </button>
                    </div>
                </div>

                <div class="db-panel">
                    <div class="db-panel-header"><i class="fa-solid fa-receipt"></i><h3>Transaksionet</h3></div>
                    <div class="db-panel-body">
                        ${transactions.length ? transactions.map(t => `
                            <div style="display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid #1e293b;">
                                <div style="width:32px;height:32px;background:${t.amount > 0 ? '#10b98122' : '#ef444422'};color:${t.amount > 0 ? '#10b981' : '#ef4444'};border-radius:8px;display:flex;align-items:center;justify-content:center;">
                                    <i class="fa-solid ${t.amount > 0 ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                                </div>
                                <div style="flex:1;">
                                    <div style="font-weight:700;font-size:12px;color:#f1f5f9;">${t.description || (t.amount > 0 ? 'Mbushje' : 'Pagesë')}</div>
                                    <div style="font-size:10px;color:#64748b;font-family:var(--font-mono);">${formatDate(t.createdAt)}</div>
                                </div>
                                <div style="font-weight:800;font-family:var(--font-mono);color:${t.amount > 0 ? '#10b981' : '#ef4444'};">
                                    ${t.amount > 0 ? '+' : ''}€${Math.abs(t.amount).toFixed(2)}
                                </div>
                            </div>
                        `).join('') : `
                            <div style="text-align:center;padding:40px 20px;color:#94a3b8;">
                                <i class="fa-solid fa-receipt" style="font-size:40px;opacity:.3;margin-bottom:12px;display:block;"></i>
                                <div style="font-size:12px;">Pa transaksione</div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    async function topup() {
        const amount = parseFloat(prompt('Sa dëshiron të mbushësh? (€):', '10') || '0');
        if (!amount || amount <= 0) return;

        const user = firebase.auth().currentUser;
        const db = window.TaxiFirebase?.db;
        if (!user || !db) return;

        try {
            await db.collection('wallets').doc(user.uid).update({
                balance: firebase.firestore.FieldValue.increment(amount)
            });
            await db.collection('wallets').doc(user.uid).collection('transactions').add({
                amount: amount,
                description: 'Mbushje me kartë',
                type: 'topup',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            balance += amount;
            await load();
            if (window.ClientApp?.showToast) window.ClientApp.showToast('success', '✅ U mbush', `€${amount.toFixed(2)}`);
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    function withdraw() {
        alert('Tërheqja do jetë e mundur së shpejti');
    }

    function formatDate(ts) {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    return { init, load, render, topup, withdraw };
})();

console.log('✅ client/wallet.js ngarkuar');
