'use strict';

const { Server } = require('socket.io');
const { verifyToken } = require('./auth');

let io = null;
const connectedUsers = new Map(); // userId -> socketId

function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // ═══ AUTH MIDDLEWARE PËR SOCKET ═══
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Token mungon'));

        const decoded = verifyToken(token);
        if (!decoded) return next(new Error('Token i pavlefshëm'));

        socket.user = decoded;
        next();
    });

    // ═══ KUR LIDHET KLIENTI ═══
    io.on('connection', (socket) => {
        const { userId, username, role, tenantId } = socket.user;
        console.log(`🔌 Lidhur: ${username} (${role})`);

        // Ruaj lidhjen
        connectedUsers.set(userId, socket.id);
        socket.join(`tenant-${tenantId}`);
        socket.join(`role-${role}`);
        socket.join(`user-${userId}`);

        // Njofto të tjerët
        io.to(`tenant-${tenantId}`).emit('user_online', { userId, username, role });

        // ═══ DËRGO STATUSIN E USERIT ═══
        socket.on('update_status', (data) => {
            io.to(`tenant-${tenantId}`).emit('user_status', {
                userId, username, ...data
            });
        });

        // ═══ DËRGO LOKACIONIN (shoferi) ═══
        socket.on('driver_location', (data) => {
            io.to(`tenant-${tenantId}`).emit('driver_location_update', {
                driverId: userId,
                username,
                ...data,
                timestamp: Date.now()
            });
        });

        // ═══ POROSI E RE ═══
        socket.on('new_order', (order) => {
            io.to(`tenant-${tenantId}`).emit('order_created', order);
        });

        // ═══ POROSI E PËRDITËSUAR ═══
        socket.on('update_order', (data) => {
            io.to(`tenant-${tenantId}`).emit('order_updated', data);
        });

        // ═══ MESAZH DRIVER ↔ OPERATOR ═══
        socket.on('driver_message', (data) => {
            io.to(`tenant-${tenantId}`).emit('new_driver_message', {
                from: { id: userId, username, role },
                ...data,
                timestamp: Date.now()
            });
        });

        // ═══ CHAT ═══
        socket.on('chat_message', (data) => {
            io.to(`tenant-${tenantId}`).emit('chat_message', {
                from: { id: userId, username, role },
                ...data,
                timestamp: Date.now()
            });
        });

        // ═══ SOS ═══
        socket.on('sos_alert', (data) => {
            io.to(`role-admin`).to(`role-manager`).to(`role-operator`).emit('sos', {
                from: { id: userId, username, role },
                ...data,
                timestamp: Date.now()
            });
        });

        // ═══ SHKËPUTJA ═══
        socket.on('disconnect', () => {
            console.log(`🔌 Shkëputur: ${username}`);
            connectedUsers.delete(userId);
            io.to(`tenant-${tenantId}`).emit('user_offline', { userId, username });
        });
    });

    console.log('✅ Socket.io u inicializua');
    return io;
}

function getIO() {
    if (!io) throw new Error('Socket.io nuk është inicializuar');
    return io;
}

function emitToUser(userId, event, data) {
    if (!io) return;
    const socketId = connectedUsers.get(userId);
    if (socketId) {
        io.to(socketId).emit(event, data);
    }
}

function emitToTenant(tenantId, event, data) {
    if (!io) return;
    io.to(`tenant-${tenantId}`).emit(event, data);
}

function emitToRole(role, event, data) {
    if (!io) return;
    io.to(`role-${role}`).emit(event, data);
}

module.exports = {
    initSocket,
    getIO,
    emitToUser,
    emitToTenant,
    emitToRole
};
