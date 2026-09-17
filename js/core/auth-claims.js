'use strict';

/**
 * js/core/auth-claims.js
 * Leximi i rolit nga Custom Claims (token)
 */

window.TaxiAuthClaims = (() => {
    let currentRole = null;
    let currentClaims = null;
    let listeners = [];

    async function init() {
        console.log('🔐 TaxiAuthClaims: Init...');
        const user = firebase.auth().currentUser;
        if (user) await loadClaims(user);
    }

    async function loadClaims(user) {
        try {
            const tokenResult = await user.getIdTokenResult(true);
            currentClaims = tokenResult.claims;
            currentRole = tokenResult.claims.role || 'client';
            console.log(`🔐 Roli: ${currentRole}`);
            notifyListeners();
            return currentRole;
        } catch (e) {
            console.error('❌ loadClaims:', e);
            currentRole = 'client';
            return currentRole;
        }
    }

    function getRole() {
        return currentRole || 'client';
    }

    function getClaims() {
        return currentClaims || {};
    }

    function hasRole(roles) {
        if (typeof roles === 'string') roles = [roles];
        return roles.includes(currentRole);
    }

    function can(action) {
        const permissions = {
            'view_dashboard': ['operator', 'dispatcher', 'supervisor', 'manager', 'director', 'admin'],
            'create_order': ['operator', 'dispatcher', 'supervisor', 'manager', 'director', 'admin'],
            'edit_orders': ['dispatcher', 'supervisor', 'manager', 'director', 'admin'],
            'delete_orders': ['manager', 'director', 'admin'],
            'view_reports': ['supervisor', 'manager', 'director', 'admin'],
            'manage_workers': ['manager', 'director', 'admin'],
            'manage_targets': ['manager', 'director', 'admin'],
            'manage_loyalty': ['operator', 'dispatcher', 'supervisor', 'manager', 'director', 'admin'],
            'manage_fuel': ['manager', 'director', 'admin'],
            'manage_salaries': ['manager', 'director', 'admin'],
            'manage_settings': ['director', 'admin'],
            'manage_admin': ['admin']
        };
        const allowed = permissions[action] || [];
        return allowed.includes(currentRole);
    }

    async function refresh() {
        const user = firebase.auth().currentUser;
        if (!user) return null;
        return await loadClaims(user);
    }

    function onChange(callback) {
        listeners.push(callback);
        return () => {
            listeners = listeners.filter(l => l !== callback);
        };
    }

    function notifyListeners() {
        listeners.forEach(cb => {
            try { cb(currentRole); } catch (e) { console.error(e); }
        });
    }

    // Auto-load kur ndryshon useri
    if (window.firebase?.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await loadClaims(user);
            } else {
                currentRole = null;
                currentClaims = null;
                notifyListeners();
            }
        });
    }

    return {
        init, getRole, getClaims, hasRole, can, refresh, onChange
    };
})();

console.log('✅ core/auth-claims.js ngarkuar');
