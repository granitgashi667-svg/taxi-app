'use strict';

/**
 * orders.js — Menaxhimi i porosive me TaxiAPI (SQLite)
 * Mapimi Firebase ↔ SQLite bëhet BRENDA këtij file-i.
 * Frontend-i vazhdon t'i thërrasë njësoj si më parë.
 */

window.TaxiOrders = (() => {
    let pollInterval = null;
    let lastOrders = new Map();
    const listeners = { added: [], updated: [], removed: [] };

    // ═══════════════════════════════════════════════════════
    // MAPIM: Frontend → Server
    // ═══════════════════════════════════════════════════════
    function toServer(front) {
        // Bashko datën + orën për preorder
        let preorderDate = null;
        if (front.terminDateTime) {
            preorderDate = front.terminDateTime;
        } else if (front.terminDate && front.terminTime) {
            preorderDate = `${front.terminDate}T${front.terminTime}:00`;
        } else if (front.terminDate) {
            preorderDate = front.terminDate;
        }

        return {
            phone: front.phone || '',
            clientName: front.name || 'Klient',
            pickup: front.pickup || '',
            destination: front.destination || '',
            zone: front.zone || 'auto',
            tariffId: front.tariff || null,     // SQLite ruan edhe string
            remark: front.remark || '',
            status: front.status || 'waiting',
            isPreorder: front.isPreorder ? 1 : 0,
            preorderDate: preorderDate,
            preorderNote: front.terminRepeat && front.terminRepeat !== 'none'
                ? `repeat:${front.terminRepeat};lead:${front.terminLead || 15}`
                : null
        };
    }

    // ═══════════════════════════════════════════════════════
    // MAPIM: Server → Frontend (ruan strukturën e vjetër)
    // ═══════════════════════════════════════════════════════
    function fromServer(s) {
        if (!s) return null;

        const createdAt = s.created_at ? new Date(s.created_at) : new Date();
        const preorderAt = s.preorder_date ? new Date(s.preorder_date) : null;

        return {
            id: s.id,
            orderCode: s.order_code,
            phone: s.phone,
            name: s.client_name || 'Klient',
            pickup: s.pickup || '',
            destination: s.destination || '',
            pickupLat: s.pickup_lat,
            pickupLng: s.pickup_lng,
            destLat: s.dest_lat,
            destLng: s.dest_lng,
            zone: s.zone || 'auto',
            tariff: s.tariff_id,
            remark: s.remark || '',

            status: s.status || 'waiting',

            vehicleId: s.vehicle_id,
            vehicleNum: s.vehicle_number || null,
            driverId: s.driver_id,
            driverName: s.driver_name || null,
            dispatchMode: 'auto',

            isPreorder: !!s.is_preorder,
            terminDate: preorderAt ? preorderAt.toISOString().slice(0, 10) : null,
            terminTime: preorderAt ? preorderAt.toISOString().slice(11, 16) : null,
            terminDateTime: s.preorder_date,
            terminLead: 15,
            terminRepeat: 'none',

            createdAt: s.created_at,
            createdAtLocal: createdAt.getTime(),
            createdTimeStr: createdAt.toTimeString().slice(0, 8),
            createdDateStr: createdAt.toISOString().slice(0, 10),
            assignedAt: s.assigned_at,
            completedAt: s.completed_at,

            operatorId: s.created_by,
            operatorName: s.operator_name || 'Operator',

            price: s.price || 0,
            distance: s.distance_km || 0,
            duration: 0,
            version: 1
        };
    }

    // ═══════════════════════════════════════════════════════
    // CREATE
    // ═══════════════════════════════════════════════════════
    async function create(orderData) {
        if (!window.TaxiAPI) throw new Error('TaxiAPI nuk është gati');

        try {
            const payload = toServer(orderData);
            const result = await window.TaxiAPI.orders.create(payload);
            console.log('✅ Porosia u ruajt:', result.order?.id);
            return fromServer(result.order);
        } catch (e) {
            console.error('❌ Gabim ruajtje porosie:', e);
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════
    // UPDATE
    // ═══════════════════════════════════════════════════════
    async function update(orderId, changes) {
        if (!window.TaxiAPI) throw new Error('TaxiAPI nuk është gati');

        // Vetëm fushat që serveri pranon
        const allowed = ['status', 'remark', 'price', 'destination', 'pickup'];
        const serverChanges = {};
        allowed.forEach(k => {
            if (changes[k] !== undefined) serverChanges[k] = changes[k];
        });

        try {
            const result = await window.TaxiAPI.orders.update(orderId, serverChanges);
            console.log('✅ Porosia u përditësua:', orderId);
            return fromServer(result.order);
        } catch (e) {
            console.error('❌ Gabim update:', e);
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════
    // REMOVE
    // ═══════════════════════════════════════════════════════
    async function remove(orderId) {
        if (!window.TaxiAPI) throw new Error('TaxiAPI nuk është gati');
        try {
            await window.TaxiAPI.orders.delete(orderId);
            console.log('✅ Porosia u fshi:', orderId);
        } catch (e) {
            console.error('❌ Gabim fshirje:', e);
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════
    // ASSIGN (i ri, por i nevojshëm për dispatch)
    // ═══════════════════════════════════════════════════════
    async function assign(orderId, driverId, mode = 'manual') {
        if (!window.TaxiAPI) throw new Error('TaxiAPI nuk është gati');
        try {
            const result = await window.TaxiAPI.orders.assign(orderId, driverId, mode);
            console.log('✅ Porosia u caktua:', orderId, '→', driverId);
            return fromServer(result.order);
        } catch (e) {
            console.error('❌ Gabim assign:', e);
            throw e;
        }
    }

    async function cancel(orderId, reason) {
        if (!window.TaxiAPI) throw new Error('TaxiAPI nuk është gati');
        try {
            const result = await window.TaxiAPI.orders.cancel(orderId, reason);
            console.log('✅ Porosia u anulua:', orderId);
            return fromServer(result.order);
        } catch (e) {
            console.error('❌ Gabim cancel:', e);
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════
    // FETCH ALL
    // ═══════════════════════════════════════════════════════
    async function fetchAll() {
        try {
            const result = await window.TaxiAPI.orders.list({ limit: 200 });
            const arr = result.orders || [];
            return arr.map(fromServer).filter(Boolean);
        } catch (e) {
            console.error('❌ Gabim leximi orders:', e);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════
    // POLLING (do zëvendësohet me socket.io më vonë)
    // ═══════════════════════════════════════════════════════
    async function pollOnce() {
        const orders = await fetchAll();
        const newMap = new Map();
        const added = [], updated = [], removed = [];

        orders.forEach(o => {
            const id = o.id;
            if (!id) return;
            newMap.set(id, o);

            if (!lastOrders.has(id)) {
                added.push(o);
            } else {
                const prev = lastOrders.get(id);
                try {
                    if (JSON.stringify(prev) !== JSON.stringify(o)) updated.push(o);
                } catch { updated.push(o); }
            }
        });

        lastOrders.forEach((o, id) => {
            if (!newMap.has(id)) removed.push(o);
        });

        lastOrders = newMap;

        if (added.length) {
            listeners.added.forEach(fn => fn(added));
            window.TaxiEvents?.emit('firestore:order_added', added);
        }
        if (updated.length) {
            listeners.updated.forEach(fn => fn(updated));
            window.TaxiEvents?.emit('firestore:order_updated', updated);
        }
        if (removed.length) {
            listeners.removed.forEach(fn => fn(removed));
            window.TaxiEvents?.emit('firestore:order_removed', removed);
        }
    }

    // ═══════════════════════════════════════════════════════
    // SUBSCRIBE
    // ═══════════════════════════════════════════════════════
    function subscribe() {
        if (pollInterval) clearInterval(pollInterval);

        // Nëse ka socket-client, mund të regjistrohemi aty
        if (window.TaxiSocket?.on) {
            window.TaxiSocket.on('order_created', () => pollOnce());
            window.TaxiSocket.on('order_updated', () => pollOnce());
            window.TaxiSocket.on('order_assigned', () => pollOnce());
            window.TaxiSocket.on('order_cancelled', () => pollOnce());
        }

        // Gjithmonë polling si fallback
        pollOnce().catch(e => console.warn('Poll init:', e));
        pollInterval = setInterval(() => {
            pollOnce().catch(e => console.warn('Poll:', e));
        }, 3000);

        console.log('✅ orders.js: Duke dëgjuar porositë...');
        return () => unsubscribeAll();
    }

    function unsubscribeAll() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    async function getAll() {
        return fetchAll();
    }

    return {
        create,
        update,
        remove,
        assign,
        cancel,
        subscribe,
        unsubscribeAll,
        getAll,
        on: (event, fn) => {
            if (listeners[event]) listeners[event].push(fn);
        }
    };
})();

console.log('✅ orders.js ngarkuar');
