'use strict';

/**
 * js/api.js — Klient API për serverin TaxiApp
 */

window.TaxiAPI = (() => {
    const BASE_URL = window.TAXI_CONFIG?.API_URL || 'http://localhost:3000';
    let token = localStorage.getItem('taxi_token') || null;

    // ═══════════════════════════════════════════════════════
    // HELPER: FETCH ME TOKEN
    // ═══════════════════════════════════════════════════════
    async function request(method, endpoint, data = null, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const config = {
            method,
            headers,
            ...(data && { body: JSON.stringify(data) })
        };

        try {
            const response = await fetch(url, config);
            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Nëse 401 → fshij token dhe ridrejto
                if (response.status === 401) {
                    setToken(null);
                    if (window.TaxiAuth) window.TaxiAuth.logout(true);
                    throw new Error('Sesioni ka skaduar');
                }
                throw new Error(result.error || `Gabim ${response.status}`);
            }

            return result;
        } catch (e) {
            console.error(`❌ API ${method} ${endpoint}:`, e.message);
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════
    // TOKEN
    // ═══════════════════════════════════════════════════════
    function setToken(newToken) {
        token = newToken;
        if (newToken) {
            localStorage.setItem('taxi_token', newToken);
        } else {
            localStorage.removeItem('taxi_token');
        }
    }

    function getToken() { return token; }

    function isAuthenticated() { return !!token; }

    // ═══════════════════════════════════════════════════════
    // HEALTH CHECK
    // ═══════════════════════════════════════════════════════
    async function health() {
        return request('GET', '/api/health');
    }

    // ═══════════════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════════════
    const auth = {
        async login(username, password, tenantCode = 'default') {
            const result = await request('POST', '/api/auth/login', { username, password, tenantCode });
            if (result.token) setToken(result.token);
            return result;
        },

        async logout() {
            try { await request('POST', '/api/auth/logout'); } catch {}
            setToken(null);
        },

        async me() {
            return request('GET', '/api/auth/me');
        },

        async changePassword(oldPassword, newPassword) {
            return request('POST', '/api/auth/change-password', { oldPassword, newPassword });
        }
    };

    // ═══════════════════════════════════════════════════════
    // WORKERS
    // ═══════════════════════════════════════════════════════
    const workers = {
        list: () => request('GET', '/api/workers'),
        status: () => request('GET', '/api/workers/status'),
        create: (data) => request('POST', '/api/workers', data)
    };

    // ═══════════════════════════════════════════════════════
    // ORDERS
    // ═══════════════════════════════════════════════════════
    const orders = {
        list: (filters = {}) => {
            const q = new URLSearchParams(filters).toString();
            return request('GET', `/api/orders${q ? '?' + q : ''}`);
        },
        waiting: () => request('GET', '/api/orders/waiting'),
        preorders: () => request('GET', '/api/orders/preorders'),
        get: (id) => request('GET', `/api/orders/${id}`),
        create: (data) => request('POST', '/api/orders', data),
        assign: (id, driverId, mode = 'manual') =>
            request('POST', `/api/orders/${id}/assign`, { driverId, mode }),
        update: (id, data) => request('PUT', `/api/orders/${id}`, data),
        cancel: (id, reason) => request('POST', `/api/orders/${id}/cancel`, { reason }),
        delete: (id) => request('DELETE', `/api/orders/${id}`)
    };

    // ═══════════════════════════════════════════════════════
    // DRIVERS
    // ═══════════════════════════════════════════════════════
    const drivers = {
        list: () => request('GET', '/api/drivers'),
        status: () => request('GET', '/api/drivers/status'),
        create: (data) => request('POST', '/api/drivers', data),
        update: (id, data) => request('PUT', `/api/drivers/${id}`, data),
        delete: (id) => request('DELETE', `/api/drivers/${id}`)
    };

    // ═══════════════════════════════════════════════════════
    // VEHICLES
    // ═══════════════════════════════════════════════════════
    const vehicles = {
        list: () => request('GET', '/api/vehicles'),
        create: (data) => request('POST', '/api/vehicles', data),
        update: (id, data) => request('PUT', `/api/vehicles/${id}`, data),
        delete: (id) => request('DELETE', `/api/vehicles/${id}`)
    };

    // ═══════════════════════════════════════════════════════
    // CLIENTS
    // ═══════════════════════════════════════════════════════
    const clients = {
        list: (filters = {}) => {
            const q = new URLSearchParams(filters).toString();
            return request('GET', `/api/clients${q ? '?' + q : ''}`);
        },
        get: (id) => request('GET', `/api/clients/${id}`),
        create: (data) => request('POST', '/api/clients', data),
        update: (id, data) => request('PUT', `/api/clients/${id}`, data),
        toggleBlock: (id) => request('POST', `/api/clients/${id}/toggle-block`),
        delete: (id) => request('DELETE', `/api/clients/${id}`)
    };

    // ═══════════════════════════════════════════════════════
    // ZONES
    // ═══════════════════════════════════════════════════════
    const zones = {
        list: () => request('GET', '/api/zones'),
        create: (data) => request('POST', '/api/zones', data),
        update: (id, data) => request('PUT', `/api/zones/${id}`, data),
        delete: (id) => request('DELETE', `/api/zones/${id}`)
    };

    // ═══════════════════════════════════════════════════════
    // STANDS
    // ═══════════════════════════════════════════════════════
    const stands = {
        list: () => request('GET', '/api/stands'),
        create: (data) => request('POST', '/api/stands', data),
        update: (id, data) => request('PUT', `/api/stands/${id}`, data),
        delete: (id) => request('DELETE', `/api/stands/${id}`)
    };

    // ═══════════════════════════════════════════════════════
    // LOCATIONS
    // ═══════════════════════════════════════════════════════
    const locations = {
        list: (filters = {}) => {
            const q = new URLSearchParams(filters).toString();
            return request('GET', `/api/locations${q ? '?' + q : ''}`);
        },
        create: (data) => request('POST', '/api/locations', data),
        update: (id, data) => request('PUT', `/api/locations/${id}`, data),
        delete: (id) => request('DELETE', `/api/locations/${id}`)
    };

    // ═══════════════════════════════════════════════════════
    // TARIFFS
    // ═══════════════════════════════════════════════════════
    const tariffs = {
        list: () => request('GET', '/api/tariffs'),
        create: (data) => request('POST', '/api/tariffs', data),
        update: (id, data) => request('PUT', `/api/tariffs/${id}`, data),
        delete: (id) => request('DELETE', `/api/tariffs/${id}`)
    };

    // ═══════════════════════════════════════════════════════
    // MESSAGES
    // ═══════════════════════════════════════════════════════
    const messages = {
        threads: () => request('GET', '/api/messages/threads'),
        getThread: (threadId) => request('GET', `/api/messages/threads/${threadId}/messages`),
        createThread: (driverId) => request('POST', '/api/messages/threads', { driverId }),
        send: (threadId, text) => request('POST', `/api/messages/threads/${threadId}/send`, { text }),
        markRead: (threadId) => request('POST', `/api/messages/threads/${threadId}/read`),
        deleteThread: (threadId) => request('DELETE', `/api/messages/threads/${threadId}`),
        predefined: (forRole) => request('GET', `/api/messages/predefined${forRole ? '?forRole=' + forRole : ''}`),
        createPredefined: (message, forRole) => request('POST', '/api/messages/predefined', { message, forRole }),
        deletePredefined: (id) => request('DELETE', `/api/messages/predefined/${id}`),
        remarks: () => request('GET', '/api/messages/remarks'),
        createRemark: (remark, category) => request('POST', '/api/messages/remarks', { remark, category }),
        deleteRemark: (id) => request('DELETE', `/api/messages/remarks/${id}`)
    };

    // ═══════════════════════════════════════════════════════
    // OTP
    // ═══════════════════════════════════════════════════════
    const otp = {
        send: (email) => request('POST', '/api/otp/send', { email }),
        verify: (email, code) => request('POST', '/api/otp/verify', { email, code })
    };

    // ═══════════════════════════════════════════════════════
    // STATS
    // ═══════════════════════════════════════════════════════
    const stats = {
        daily: (date) => request('GET', `/api/stats/daily${date ? '?date=' + date : ''}`),
        driversDaily: (date) => request('GET', `/api/stats/drivers-daily${date ? '?date=' + date : ''}`),
        topOperators: (period = 'today') => request('GET', `/api/stats/top-operators?period=${period}`),
        topDrivers: (period = 'today') => request('GET', `/api/stats/top-drivers?period=${period}`),
        overview: () => request('GET', '/api/stats/overview'),
        hoursSummary: (from, to) => {
            const q = new URLSearchParams({ from, to }).toString();
            return request('GET', `/api/stats/hours-summary?${q}`);
        },
        userHours: (userId, from, to) => {
            const q = new URLSearchParams({ from, to }).toString();
            return request('GET', `/api/stats/hours/${userId}?${q}`);
        },
        revenue: (filters = {}) => {
            const q = new URLSearchParams(filters).toString();
            return request('GET', `/api/stats/revenue${q ? '?' + q : ''}`);
        }
    };

    // ═══════════════════════════════════════════════════════
    // TENANTS
    // ═══════════════════════════════════════════════════════
    const tenants = {
        list: () => request('GET', '/api/tenants'),
        create: (data) => request('POST', '/api/tenants', data)
    };

    // ═══════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════
    return {
        BASE_URL,
        health,
        setToken, getToken, isAuthenticated,

        auth,
        workers,
        orders,
        drivers,
        vehicles,
        clients,
        zones,
        stands,
        locations,
        tariffs,
        messages,
        otp,
        stats,
        tenants
    };
})();

console.log('✅ js/api.js ngarkuar');
