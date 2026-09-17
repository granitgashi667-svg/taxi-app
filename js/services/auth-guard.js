'use strict';

/**
 * js/services/auth-guard.js
 * Mbrojtje për faqet admin/director
 */

window.TaxiAuthGuard = (() => {
    function init(options = {}) {
        const requiredRoles = options.roles || ['operator', 'dispatcher', 'supervisor', 'manager', 'director', 'admin'];
        const loginUrl = options.loginUrl || 'index.html';
        const roleName = options.roleName || 'admin';

        console.log(`🛡️ AuthGuard për ${roleName}...`);

        // Fshih faqen fillimisht
        document.body.style.visibility = 'hidden';

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) {
                console.warn('⚠️ Nuk je i kyçur → redirect');
                showDenied('Nuk je i kyçur. Ridrejtohu te login...', loginUrl);
                setTimeout(() => location.href = loginUrl, 2000);
                return;
            }

            try {
                const tokenResult = await user.getIdTokenResult(true);
                const role = tokenResult.claims.role || 'client';

                if (!requiredRoles.includes(role)) {
                    console.warn(`⚠️ Roli "${role}" nuk ka leje për ${roleName}`);
                    showDenied(`Roli "${role}" nuk ka leje për këtë panel.`, loginUrl);
                    return;
                }

                console.log(`✅ Roli "${role}" ka leje`);
                document.body.style.visibility = 'visible';
            } catch (e) {
                console.error('❌ AuthGuard:', e);
                showDenied('Gabim gjatë verifikimit. Provo përsëri.', loginUrl);
            }
        });
    }

    function showDenied(message, redirectUrl) {
        document.body.style.visibility = 'visible';
        document.body.innerHTML = `
            <div style="position:fixed;inset:0;background:#0a0416;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;padding:20px;">
                <div style="text-align:center;max-width:400px;">
                    <div style="font-size:64px;margin-bottom:20px;">🔒</div>
                    <h1 style="color:#ef4444;font-size:22px;font-weight:800;margin-bottom:12px;">Akses i Refuzuar</h1>
                    <p style="color:#94a3b8;font-size:14px;margin-bottom:24px;">${message}</p>
                    <a href="${redirectUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#a855f7,#ec4899);color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
                        ← Kthehu te Login
                    </a>
                </div>
            </div>
        `;
    }

    return { init };
})();

console.log('✅ services/auth-guard.js ngarkuar');
