'use strict';

window.ClientProfile = (() => {
    let profile = null;

    function init() { console.log('👤 ClientProfile: Init...'); }

    async function load() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const db = window.TaxiFirebase?.db;
        if (!db) return;

        try {
            const snap = await db.collection('clients').doc(user.uid).get();
            profile = snap.exists ? snap.data() : {};
            render();
        } catch (e) { console.error('❌ load profile:', e); }
    }

    function render() {
        let el = document.getElementById('client-profile-page');
        if (!el) {
            el = document.createElement('div');
            el.id = 'client-profile-page';
            el.className = 'client-page';
            el.dataset.page = 'profile';
            document.getElementById('screen-main')?.appendChild(el);
        }

        const user = firebase.auth().currentUser;
        const initials = (profile?.name || 'K').slice(0, 2).toUpperCase();

        el.innerHTML = `
            <div style="padding:16px;">
                <h2 style="font-size:20px;font-weight:800;color:#f1f5f9;margin-bottom:16px;">
                    <i class="fa-solid fa-user" style="color:#a855f7;"></i> Profili
                </h2>

                <div style="background:linear-gradient(135deg,#a855f7,#ec4899);border-radius:20px;padding:30px 20px;text-align:center;color:white;margin-bottom:20px;">
                    <div style="width:80px;height:80px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;margin:0 auto 16px;border:3px solid rgba(255,255,255,.3);">
                        ${initials}
                    </div>
                    <div style="font-size:20px;font-weight:800;">${profile?.name || 'Klient'}</div>
                    <div style="font-size:12px;opacity:.85;font-family:var(--font-mono);margin-top:4px;">${user?.phoneNumber || '—'}</div>
                </div>

                <div class="db-panel" style="margin-bottom:16px;">
                    <div class="db-panel-header"><i class="fa-solid fa-user-edit"></i><h3>Ndrysho profilin</h3></div>
                    <div class="db-panel-body" style="display:flex;flex-direction:column;gap:12px;">
                        <label style="font-size:11px;color:#94a3b8;">Emri
                            <input type="text" id="cp-name" class="input" value="${profile?.name || ''}" style="width:100%;margin-top:4px;">
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">Email
                            <input type="email" id="cp-email" class="input" value="${profile?.email || ''}" style="width:100%;margin-top:4px;">
                        </label>
                        <label style="font-size:11px;color:#94a3b8;">Adresa e preferuar
                            <input type="text" id="cp-address" class="input" value="${profile?.defaultAddress || ''}" placeholder="p.sh. Rr. Nëna Terezë" style="width:100%;margin-top:4px;">
                        </label>
                        <button class="btn-primary" onclick="ClientProfile.save()">
                            <i class="fa-solid fa-save"></i> Ruaj
                        </button>
                    </div>
                </div>

                <div class="db-panel" style="margin-bottom:16px;">
                    <div class="db-panel-body" style="padding:0;">
                        <button onclick="ClientProfile.logout()" style="width:100%;padding:16px;background:transparent;border:none;color:#ef4444;font-weight:700;font-size:13px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                            <i class="fa-solid fa-sign-out-alt"></i> Dil nga llogaria
                        </button>
                    </div>
                </div>

                <div style="text-align:center;padding:20px;color:#64748b;font-size:11px;">
                    TaxiApp 3.0 · Klient
                </div>
            </div>
        `;
    }

    async function save() {
        const user = firebase.auth().currentUser;
        const db = window.TaxiFirebase?.db;
        if (!user || !db) return;

        const data = {
            name: document.getElementById('cp-name')?.value?.trim() || '',
            email: document.getElementById('cp-email')?.value?.trim() || '',
            defaultAddress: document.getElementById('cp-address')?.value?.trim() || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('clients').doc(user.uid).set(data, { merge: true });
            profile = { ...profile, ...data };
            render();
            if (window.ClientApp?.showToast) window.ClientApp.showToast('success', '✅ Profili u ruajt', '');
        } catch (e) { alert('Gabim: ' + e.message); }
    }

    async function logout() {
        if (!confirm('A jeni i sigurt që dëshironi të dilni?')) return;
        await firebase.auth().signOut();
        window.TaxiStorage?.remove('taxi.client');
        location.reload();
    }

    return { init, load, render, save, logout };
})();

console.log('✅ client/profile.js ngarkuar');
