'use strict';

/**
 * auth.js — Login/Logout me TaxiAPI (SQLite)
 */

window.TaxiAuth = (() => {
    let _currentUser = null;

    async function login(email, password) {
        if (!window.TaxiAPI) {
            throw new Error('TaxiAPI nuk është gati');
        }

        try {
            const result = await window.TaxiAPI.auth.login(email, password);

            // Struktura e përgjigjes: { token, user } ose { token, operator } ose user direkt
            const user = result.user || result.operator || result;

            _currentUser = {
                uid: user.id || user.uid,
                email: user.email,
                name: user.name || (user.email || '').split('@')[0] || 'Operator',
                role: user.role || 'dispatcher'
            };

            // Ruaj për rifreskim faqe
            try {
                localStorage.setItem('taxi_current_user', JSON.stringify(_currentUser));
            } catch (e) {}

            console.log('✅ Login i suksesshëm:', _currentUser.email);
            return _currentUser;
        } catch (e) {
            console.error('❌ Gabim login:', e.message || e);
            throw e;
        }
    }

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

    function onAuthChange(callback) {
        // Nëse ka token → verifiko me serverin
        if (window.TaxiAPI?.isAuthenticated()) {
            window.TaxiAPI.auth.me()
                .then((result) => {
                    const user = result.user || result.operator || result;
                    _currentUser = {
                        uid: user.id || user.uid,
                        email: user.email,
                        name: user.name || (user.email || '').split('@')[0] || 'Operator',
                        role: user.role || 'dispatcher'
                    };
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