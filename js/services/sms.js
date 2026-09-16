'use strict';

/**
 * sms.js — SMS Automatike (#1 me link tracking, #2 kur 20m larg)
 */

window.TaxiSms = (() => {
    const COLLECTION = 'sms_log';
    const QUEUE_COLLECTION = 'sms_queue';

    // ═══ TEMPLATES ═══
    const TEMPLATES = {
        // SMS #1 — Kur shoferi pranon porosinë
        assigned: (d) => `Taxi ju njofton se vetura ${d.vehicle} është n
