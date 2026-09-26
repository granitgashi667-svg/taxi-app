'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { initSocket } = require('./socket');
const { errorHandler } = require('./middleware');
const db = require('./database');

const app = express();
const server = http.createServer(app);

// ═══ MIDDLEWARE ═══
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ═══ STATIC (shërben HTML/CSS/JS nga root-i) ═══
app.use(express.static(path.join(__dirname, '..')));

// ═══ HEALTH CHECK ═══
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '3.0.0',
        db: 'connected',
        time: new Date().toISOString()
    });
});

// ═══ ROUTES ═══
app.use('/api', require('./routes'));

// ═══ ERROR HANDLER ═══
app.use(errorHandler);

// ═══ SOCKET.IO ═══
initSocket(server);

// ═══ NIS SERVERIN ═══
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('');
    console.log('🚕 TaxiApp 3.0 — Server Lokal');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Server:   http://localhost:${PORT}`);
    console.log(`📊 Health:   http://localhost:${PORT}/api/health`);
    console.log(`📁 DB:       ${process.env.DB_PATH || './data/taxiapp.db'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Hap:  http://localhost:3000/index.html');
    console.log('');
});

// ═══ GRACEFUL SHUTDOWN ═══
process.on('SIGINT', () => {
    console.log('\n🛑 Duke mbyllur serverin...');
    server.close(() => {
        try { db.close(); } catch (e) {}
        process.exit(0);
    });
});

module.exports = app;
