'use strict';

/**
 * auth.js — Login/Logout me TaxiAPI (SQLite)
 * Mapimi bëhet BRENDA këtij file-i.
 */

window.TaxiAuth = (() => {
    let _currentUser = null;

    // ═══ MAPIM: Server → Frontend ═══
    function fromServer(user) {
        if (!user) return null;
        return {
            uid: user.id || user.uid,
            id: user.id || user.uid,
            username: user.username,
            email: user.email || user.username,
            name: user.name || (user.username || '').replace(/^./, c => c.toUpperCase()),
            surname: user.surname,
            role: user.role || 'dispatcher',
            phone: user.phone,
            tenantId: user.tenant_id
        };
    }

    // ═══ LOGIN ═══
    async function login(emailOrUsername, password) {
        if (!window.TaxiAPI) throw new Error('TaxiAPI nuk është gati');

        try {
            const result = await window.TaxiAPI.auth.login(emailOrUsername, password);

            // Serveri mund të kthejë: { token, user } ose { token, operator } ose user direkt
            const userData = result.user || result.operator || result;
            _currentUser = fromServer(userData);

            try {
                localStorage.setItem('taxi_current_user', JSON.stringify(_currentUser));
            } catch (e) {}

            console.log('✅ Login i suksesshëm:', _currentUser.username);
            return _currentUser;
        } catch (e) {
            console.error('❌ Gabim login:', e.message || e);
            throw e;
        }
    }

    // ═══ LOGOUT ═══
    async function logout() {
        if (!window.TaxiAPI) return;
        try {
            await window.TaxiAPI.auth.logout();
        } catch (e) {
            console.warn('Logout API:', e.message);
        }
        _currentUser = null;
        try { localStorage.removeItem('taxi_current_user'); } catch (e) {}
        console.log('✅ Logout i suksesshëm');
    }

    // ═══ ON AUTH CHANGE ═══
    function onAuthChange(callback) {
        // Nëse ka token, verifiko me serverin
        if (window.TaxiAPI?.isAuthenticated()) {
            window.TaxiAPI.auth.me()
                .then(result => {
                    const userData = result.user || result.operator || result;
                    _currentUser = fromServer(userData);
                    try { localStorage.setItem('taxi_current_user', JSON.stringify(_currentUser)); } catch (e) {}
                    callback(_currentUser);
                })
                .catch(() => {
                    _currentUser = null;
                    try { localStorage.removeItem('taxi_current_user'); } catch (e) {}
                    callback(null);
                });
            return;
        }

        // Nëse s'ka token, provo prej localStorage
        try {
            const saved = localStorage.getItem('taxi_current_user');
            if (saved) {
                _currentUser = JSON.parse(saved);
                callback(_currentUser);
                return;
            }
        } catch (e) {}

        callback(null);
    }

    function currentUser() {
        return _currentUser;
    }

    return {
        login,
        logout,
        onAuthChange,
        currentUser
    };
})();

console.log('✅ auth.js ngarkuar');
