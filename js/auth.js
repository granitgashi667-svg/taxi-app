'use strict';

/**
 * js/auth.js — Auth manager me JWT
 */

window.TaxiAuth = (() => {
    let currentUser = null;
    let loginTime = null;
    let heartbeatTimer = null;

    // ═══════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════
    async function init() {
        console.log('🔐 TaxiAuth: Init...');

        if (!window.TaxiAPI) {
            console.error('❌ TaxiAPI nuk është i ngarkuar');
            return false;
        }

        // Nëse ka token → verifiko
        if (window.TaxiAPI.isAuthenticated()) {
            try {
                const { user } = await window.TaxiAPI.auth.me();
                currentUser = user;
                loginTime = Date.now();
                startHeartbeat();
                window.TaxiSocket?.connect();
                console.log(`✅ Sesion aktiv: ${user.name} (${user.role})`);
                return true;
            } catch (e) {
                console.warn('⚠️ Sesioni ka skaduar');
                window.TaxiAPI.setToken(null);
            }
        }

        return false;
    }

    // ═══════════════════════════════════════════════════════
    // LOGIN
    // ═══════════════════════════════════════════════════════
    async function login(username, password, tenantCode = 'default') {
        try {
            const result = await window.TaxiAPI.auth.login(username, password, tenantCode);

            if (result.success && result.user) {
                currentUser = result.user;
                loginTime = Date.now();

                // Fillo heartbeat + socket
                startHeartbeat();
                window.TaxiSocket?.connect();

                // Log në audit (opsionale)
                console.log(`✅ Login: ${currentUser.name} (${currentUser.role})`);

                return { success: true, user: currentUser };
            }

            return { success: false, error: 'Login i pasuksesshëm' };
        } catch (e) {
            console.error('❌ Login:', e);
            return { success: false, error: e.message };
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
                await window.TaxiAPI.auth.logout();
            } else {
                window.TaxiAPI.setToken(null);
            }

            currentUser = null;
            loginTime = null;

            if (!silent) {
                location.reload();
            }
        } catch (e) {
            console.error('❌ Logout:', e);
            location.reload();
        }
    }

    // ═══════════════════════════════════════════════════════
    // HEARTBEAT — përditëso last_login çdo 2 minuta
    // ═══════════════════════════════════════════════════════
    function startHeartbeat() {
        stopHeartbeat();
        heartbeatTimer = setInterval(async () => {
            try {
                await window.TaxiAPI.auth.me();
            } catch (e) {
                console.warn('⚠️ Heartbeat dështoi:', e.message);
            }
        }, 2 * 60 * 1000); // 2 minuta
    }

    function stopHeartbeat() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }

    // ═══════════════════════════════════════════════════════
    // CURRENT USER
    // ═══════════════════════════════════════════════════════
    function getUser() { return currentUser; }
    function getRole() { return currentUser?.role || null; }
    function getUserId() { return currentUser?.id || null; }
    function getTenantId() { return currentUser?.tenantId || null; }
    function isAuthenticated() { return !!currentUser; }

    // ═══════════════════════════════════════════════════════
    // ROLE HELPERS
    // ═══════════════════════════════════════════════════════
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
        const allowed = permissions[permission] || [];
        return allowed.includes(currentUser?.role);
    }

    // ═══════════════════════════════════════════════════════
    // GET LOGIN DURATION
    // ═══════════════════════════════════════════════════════
    function getLoginDuration() {
        if (!loginTime) return 0;
        return Date.now() - loginTime;
    }

    function getLoginDurationFormatted() {
        const ms = getLoginDuration();
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    return {
        init,
        login,
        logout,
        getUser, getRole, getUserId, getTenantId,
        isAuthenticated,
        isAdmin, isDirector, isManager, isSupervisor, isOperator, isDriver,
        can,
        getLoginDuration,
        getLoginDurationFormatted
    };
})();

console.log('✅ js/auth.js ngarkuar');
