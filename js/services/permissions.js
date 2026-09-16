'use strict';

window.TaxiPermissions = (() => {
    const ROLES = {
        dispatcher: 1,
        supervisor: 2,
        manager: 2,
        admin: 3,
        director: 3
    };

    const PERMISSIONS = {
        // Dispatcher (nivel 1)
        view_orders: 1,
        create_orders: 1,
        assign_orders: 1,
        view_map: 1,
        view_calls: 1,
        send_messages: 1,

        // Supervisor/Manager (nivel 2)
        view_all_operators: 2,
        view_all_drivers: 2,
        view_reports: 2,
        approve_vacations: 2,
        manage_drivers: 2,
        view_financials: 2,

        // Director/Admin (nivel 3)
        view_salaries: 3,
        manage_users: 3,
        system_settings: 3,
        backup_restore: 3,
        view_all_data: 3
    };

    function getUserRole() {
        return window.TaxiState?.get('currentOperator')?.role || 'dispatcher';
    }

    function getLevel(role) {
        return ROLES[role] || 1;
    }

    function can(permission) {
        const role = getUserRole();
        const level = getLevel(role);
        const required = PERMISSIONS[permission] || 999;
        return level >= required;
    }

    function check(permission) {
        if (!can(permission)) {
            if (typeof showToast === 'function') {
                showToast('error', 'Nuk ke qasje', 'Nuk ke leje për këtë veprim');
            }
            return false;
        }
        return true;
    }

    function list(role) {
        const level = getLevel(role);
        return Object.keys(PERMISSIONS).filter(p => PERMISSIONS[p] <= level);
    }

    return { can, check, list, ROLES, PERMISSIONS, getUserRole, getLevel };
})();

console.log('✅ permissions.js ngarkuar');
