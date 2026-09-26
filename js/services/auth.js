'use strict';

/**
 * auth.js — Auth manager me TaxiAPI (SQLite)
 * Bashkon: init + heartbeat + permissions + onAuthChange
 */

window.TaxiAuth = (() => {
    let currentUser = null;
    let loginTime = null;
    let heartbeatTimer = null;

    // ═══ MAPIM: Server → Frontend ═══
    function fromServer(user) {
        if (!user) return null;
        return {
            id: user.id || user.uid,
            uid: user.id || user.uid,
            username: user.username,
            email: user.email || user.username,
            name: user.name || (user.username || '').replace(/^./, c => c.toUpperCase()),
            surname: user.surname,
            role: user.role || 'dispatcher',
            phone: user.phone,
            tenantId: user.tenant_id || user.tenantId
        };
    }

    // ═══════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════
    async function init() {
        if (!window.TaxiAPI) {
            console.error('❌ TaxiAPI nuk është i ngarkuar');
            return false;
        }

        if (window.TaxiAPI.isAuthenticated()) {
            try {
                const { user } = await window.TaxiAPI.auth.me();
                currentUser = fromServer(user);
                loginTime = Date.now();
                startHeartbeat();
                window.TaxiSocket?.connect();
                console.log(`✅ Sesion aktiv: ${currentUser.name} (${currentUser.role})`);
                return true;
            } catch (e) {
                window.TaxiAPI.setToken(null);
            }
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════
    // LOGIN (kthen user direkt - përputhet me app.js)
    // ═══════════════════════════════════════════════════════
    async function login(username, password, tenantCode = 'default') {
        if (!window.TaxiAPI) throw new Error('TaxiAPI nuk është gati');

        try {
            const result = await window.TaxiAPI.auth.login(username, password, tenantCode);
            const userData = result.user || result.operator || result;

            currentUser = fromServer(userData);
            loginTime = Date.now();

            try { localStorage.setItem('taxi_current_user', JSON.stringify(currentUser)); } catch (e) {}

            startHeartbeat();
            window.TaxiSocket?.connect();

            console.log(`✅ Login: ${currentUser.name} (${currentUser.role})`);
            return currentUser;
        } catch (e) {
            console.error('❌ Login:', e.message || e);
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════
    // LOGOUT
    // ═══════════════════════════════════════════════════════
    async function logout(silent = false) {
        try {
            stopHeartbeat();
            window.TaxiSocket?.disconnect();
            if (!silent) {
                try { await window.TaxiAPI.auth.logout(); } catch (e) {}
            } else {
                window.TaxiAPI.setToken(null);
            }
        } catch (e) {
            console.error('❌ Logout:', e);
        }
        currentUser = null;
        loginTime = null;
        try { localStorage.removeItem('taxi_current_user'); } catch (e) {}
    }

    // ═══════════════════════════════════════════════════════
    // ON AUTH CHANGE (përputhet me app.js)
    // ═══════════════════════════════════════════════════════
    function onAuthChange(callback) {
        if (window.TaxiAPI?.isAuthenticated()) {
            window.TaxiAPI.auth.me()
                .then(result => {
                    const userData = result.user || result.operator || result;
                    currentUser = fromServer(userData);
                    loginTime = Date.now();
                    try { localStorage.setItem('taxi_current_user', JSON.stringify(currentUser)); } catch (e) {}
                    callback(currentUser);
                })
                .catch(() => {
                    currentUser = null;
                    try { localStorage.removeItem('taxi_current_user'); } catch (e) {}
                    callback(null);
                });
            return;
        }

        try {
            const saved = localStorage.getItem('taxi_current_user');
            if (saved) {
                currentUser = JSON.parse(saved);
                callback(currentUser);
                return;
            }
        } catch (e) {}

        callback(null);
    }

    // ═══ HEARTBEAT ═══
    function startHeartbeat() {
        stopHeartbeat();
        heartbeatTimer = setInterval(async () => {
            try { await window.TaxiAPI.auth.me(); }
            catch (e) { console.warn('⚠️ Heartbeat:', e.message); }
        }, 2 * 60 * 1000);
    }
    function stopHeartbeat() {
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    }

    // ═══ GETTERS ═══
    function getUser() { return currentUser; }
    function currentUserFn() { return currentUser; }
    function getRole() { return currentUser?.role || null; }
    function getUserId() { return currentUser?.id || null; }
    function getTenantId() { return currentUser?.tenantId || null; }
    function isAuthenticated() { return !!currentUser; }

    // ═══ ROLE HELPERS ═══
    function isAdmin() { return currentUser?.role === 'admin'; }
    function isDirector() { return currentUser?.role === 'director'; }
    function isManager() { return ['admin', 'director', 'manager'].includes(currentUser?.role); }
    function isSupervisor() { return ['admin', 'director', 'manager', 'supervisor'].includes(currentUser?.role); }
    function isOperator() { return ['operator', 'dispatcher'].includes(currentUser?.role); }
    function isDriver() { return currentUser?.role === 'driver'; }

    function can(permission) {
        const permissions = {
            'manage_workers': ['admin', 'director', 'manager'],
            'manage_vehicles': ['admin', 'director', 'manager'],
            'manage_clients': ['admin', 'director', 'manager', 'supervisor'],
            'manage_zones': ['admin', 'director', 'manager'],
            'manage_stands': ['admin', 'director', 'manager'],
            'manage_tariffs': ['admin', 'director', 'manager'],
            'view_stats': ['admin', 'director', 'manager', 'supervisor'],
            'view_hours': ['admin', 'director', 'manager', 'supervisor'],
            'delete_orders': ['admin', 'director', 'manager'],
            'create_orders': ['admin', 'director', 'manager', 'supervisor', 'operator', 'dispatcher'],
            'dispatch': ['admin', 'director', 'manager', 'supervisor', 'operator', 'dispatcher'],
            'manage_tenants': ['admin']
        };
        return (permissions[permission] || []).includes(currentUser?.role);
    }

    function getLoginDuration() { return loginTime ? Date.now() - loginTime : 0; }
    function getLoginDurationFormatted() {
        const ms = getLoginDuration();
        return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
    }

    return {
        init,
        login,
        logout,
        onAuthChange,
        currentUser: currentUserFn,
        getUser, getRole, getUserId, getTenantId,
        isAuthenticated,
        isAdmin, isDirector, isManager, isSupervisor, isOperator, isDriver,
        can,
        getLoginDuration,
        getLoginDurationFormatted
    };
})();

console.log('✅ js/services/auth.js ngarkuar');
