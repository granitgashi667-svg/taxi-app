'use strict';

/**
 * control-unit.js — Kontrolli i veturave (pause, kick, transfer)
 */

window.TaxiControlUnit = (() => {

    // Vendos veturën në pauzë
    async function pauseVehicle(driverId, reason = '') {
        if (window.TaxiDrivers) {
            await window.TaxiDrivers.setPause(driverId, true);
        }
        logControl(driverId, 'pause', reason);
        console.log('⏸️ Veturë në pauzë:', driverId);
    }

    // Aktivizo veturën
    async function activateVehicle(driverId) {
        if (window.TaxiDrivers) {
            await window.TaxiDrivers.setPause(driverId, false);
        }
        logControl(driverId, 'activate');
        console.log('✅ Veturë aktive:', driverId);
    }

    // Shkyç shoferin
    async function kickDriver(driverId, reason = '') {
        if (window.TaxiDrivers) {
            await window.TaxiDrivers.setMode(driverId, 'inactive');
        }
        logControl(driverId, 'kick', reason);
        console.log('🚪 Shoferi u shkyç:', driverId);
    }

    // Blloko shoferin
    async function blockDriver(driverId, reason = '') {
        if (window.TaxiDrivers) {
            await window.TaxiDrivers.setActive(driverId, false);
        }
        logControl(driverId, 'block', reason);
        console.log('🚫 Shoferi u bllokua:', driverId);
    }

    // Lejo login tjetër
    async function allowNewLogin(driverId) {
        logControl(driverId, 'allow_new_login');
        console.log('🔓 Login i re i lejuar:', driverId);
    }

    // Dërgo mesazh grupit
    async function broadcast(message) {
        if (window.TaxiMessages) {
            await window.TaxiMessages.sendToAll(message, 'broadcast');
        }
        console.log('📢 Broadcast:', message);
    }

    // Regjistro veprimin
    async function logControl(driverId, action, reason = '') {
        const database = window.TaxiFirebase?.db;
        if (!database) return;
        try {
            await database.collection('controlLog').add({
                driverId,
                action,
                reason,
                operatorId: window.TaxiAuth?.currentUser()?.uid || null,
                operatorName: window.TaxiState?.get('currentOperator')?.name || 'Operator',
                at: new Date().getTime(),
                atStr: new Date().toLocaleString('sq-AL')
            });
        } catch (e) { console.error('❌ logControl:', e); }
    }

    return { pauseVehicle, activateVehicle, kickDriver, blockDriver, allowNewLogin, broadcast };
})();

console.log('✅ control-unit.js ngarkuar');
