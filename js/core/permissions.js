'use strict';

/**
 * permissions.js — Rolet + Lejet e përdoruesve
 * 5 role: dispatcher, supervisor, manager, director, admin
 */

window.TaxiPermissions = (() => {
    // ═══ ROLET DHE NIVELET ═══
    const ROLES = {
        dispatcher: { level: 1, label: 'Dispeçer', color: '#22c55e' },
        supervisor: { level: 2, label: 'Supervizor', color: '#3b82f6' },
        manager:    { level: 3, label: 'Menagjer', color: '#a855f7' },
        director:   { level: 4, label: 'Drejtor', color: '#f59e0b' },
        admin:      { level: 5, label: 'Admin', color: '#ef4444' }
    };

    // ═══ LEJET SIPAS NIVELIT ═══
    // 1=dispatcher, 2=supervisor, 3=manager, 4=director, 5=admin
    const PERMISSIONS = {
        // ─── Porositë ───
        view_orders:          1,
        create_orders:        1,
        assign_orders:        1,
        edit_orders:          2,
        cancel_orders:        2,
        delete_orders:        3,
        edit_prices:          2,

        // ─── Thirrjet ───
        view_calls:           1,
        pickup_calls:         1,
        transfer_calls:       1,
        hold_calls:           1,

        // ─── Harta ───
        view_map:             1,
        click_right_map:      1,
        add_locations:        2,

        // ─── Klientët ───
        view_clients:         1,
        edit_clients:         2,
        block_clients:        2,
        delete_clients:       3,

        // ─── Shoferët ───
        view_drivers:         1,
        edit_drivers:         2,
        pause_drivers:        2,
        kick_drivers:         3,
        block_drivers:        3,
        add_drivers:          2,
        delete_drivers:       4,

        // ─── Veturat ───
        view_vehicles:        1,
        edit_vehicles:        2,
        add_vehicles:         3,
        delete_vehicles:      4,

        // ─── Zonat ───
        view_zones:           1,
        edit_zones:           3,
        add_zones:            3,
        delete_zones:         4,

        // ─── Raporte ───
        view_reports_daily:   1,
        view_reports_weekly:  2,
        view_reports_monthly: 3,
        view_reports_yearly:  4,
        export_reports:       2,

        // ─── Financa ───
        view_finance:         3,
        view_salaries:        4,
        edit_salaries:        5,
        view_commission:      3,
        edit_commission:      5,

        // ─── Statistikat ───
        view_own_stats:       1,
        view_operator_stats:  2,
        view_driver_stats:    2,
        view_all_stats:       3,

        // ─── Pushimet ───
        view_own_vacations:   1,
        view_all_vacations:   2,
        approve_vacations:    3,
        edit_vacations:       4,

        // ─── Mesazhet ───
        send_messages:        1,
        send_broadcast:       3,
        view_messages:        1,
        delete_messages:      4,

        // ─── SMS ───
        view_sms:             1,
        send_sms:             1,
        edit_sms_templates:   3,

        // ─── Blacklist ───
        view_blacklist:       1,
        add_blacklist:        2,
        remove_blacklist:     3,

        // ─── Control Unit ───
        control_vehicles:     2,
        control_broadcast:    3,

        // ─── Përdoruesit ───
        view_users:           4,
        add_users:            5,
        edit_users:           5,
        delete_users:         5,
        change_roles:         5,

        // ─── Cilësimet ───
        view_settings:        3,
        edit_settings:        5,
        system_settings:      5,

        // ─── Backup ───
        create_backup:        4,
        restore_backup:       5,
        view_logs:            4,

        // ─── Tatimet / Raporte fiskale ───
        view_tax:             4,
        edit_tax:             5,

        // ─── API / Integrime ───
        view_api_keys:        5,
        edit_api_keys:        5,

        // ─── Rewind / Histori ───
        view_rewind_1h:       2,
        view_rewind_1d:       3,
        view_rewind_1w:       3,
        view_rewind_1m:       4,
        view_rewind_1y:       5
    };

    let currentRole = 'dispatcher';

    // ═══ MERR ROLIN AKTUAL ═══
    function getRole() {
        // Prioritet: TaxiState > AppState > default
        const op = window.TaxiState?.get('currentOperator');
        if (op?.role && ROLES[op.role]) return op.role;

        const appOp = window.AppState?.currentOperator;
        if (appOp?.role && ROLES[appOp.role]) return appOp.role;

        return currentRole;
    }

    function setRole(role) {
        if (ROLES[role]) {
            currentRole = role;
            console.log('🔐 Roli u ndryshua:', role, '(' + ROLES[role].label + ')');
            if (window.TaxiEvents) {
                window.TaxiEvents.emit('permissions:role_changed', { role });
            }
            return true;
        }
        console.warn('⚠️ Rol i pavlefshëm:', role);
        return false;
    }

    function getLevel(role) {
        const r = role || getRole();
        return ROLES[r]?.level || 1;
    }

    // ═══ KONTROLLO LEJEN ═══
    function can(permission, role = null) {
        const level = getLevel(role);
        const required = PERMISSIONS[permission];
        if (required === undefined) {
            console.warn('⚠️ Leje e panjohur:', permission);
            return false;
        }
        return level >= required;
    }

    // ═══ KONTROLLO + SHFAQ GABIM ═══
    function check(permission, showError = true) {
        if (can(permission)) return true;

        if (showError && typeof showToast === 'function') {
            const role = getRole();
            showToast('error', '🔒 Nuk ke qasje',
                `Roli "${ROLES[role]?.label}" nuk lejon këtë veprim`);
        }

        // Log tentativën
        if (window.TaxiLogger) {
            window.TaxiLogger.warn('permission_denied', { permission, role: getRole() });
        }

        return false;
    }

    // ═══ LISTA E LEJEVE PËR ROLIN AKTUAL ═══
    function list(role = null) {
        const level = getLevel(role);
        return Object.keys(PERMISSIONS).filter(p => PERMISSIONS[p] <= level);
    }

    // ═══ KONTROLLO A ËSHTË NJË ROL I CAKTUAR ═══
    function is(role) {
        return getRole() === role;
    }

    function isAtLeast(role) {
        return getLevel() >= getLevel(role);
    }

    function isAtMost(role) {
        return getLevel() <= getLevel(role);
    }

    // ═══ NDIHMA PËR UI ═══
    function getRoleInfo(role = null) {
        const r = role || getRole();
        return ROLES[r] || ROLES.dispatcher;
    }

    function getRoleBadge(role = null) {
        const info = getRoleInfo(role);
        return `<span class="role-badge" style="background:${info.color}22;color:${info.color};border:1px solid ${info.color}55;">${info.label}</span>`;
    }

    // ═══ FSHIH/SHFAQ ELEMENTE SIPAS LEJES ═══
    function applyToUI() {
        document.querySelectorAll('[data-permission]').forEach(el => {
            const perm = el.dataset.permission;
            if (can(perm)) {
                el.style.display = '';
                el.removeAttribute('disabled');
            } else {
                el.style.display = 'none';
                el.setAttribute('disabled', 'disabled');
            }
        });
        console.log('🔐 UI u përditësua sipas lejeve');
    }

    // ═══ INIT ═══
    function init() {
        const role = getRole();
        console.log('🔐 Permissions aktivizuar — Roli:', role, '(' + ROLES[role].label + ')');

        // Dëgjo ndryshimet e rolit
        if (window.TaxiEvents) {
            window.TaxiEvents.on('operator:login', () => {
                setTimeout(applyToUI, 500);
            });
        }
    }

    return {
        init,
        can, check, list,
        is, isAtLeast, isAtMost,
        getRole, setRole, getLevel,
        getRoleInfo, getRoleBadge,
        applyToUI,
        ROLES, PERMISSIONS
    };
})();

console.log('✅ permissions.js ngarkuar');
