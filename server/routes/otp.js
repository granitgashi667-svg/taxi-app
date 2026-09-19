'use strict';

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const db = require('../database');

// ═══════════════════════════════════════════════════════
// KONFIGURIMI I EMAIL
// ═══════════════════════════════════════════════════════
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ═══════════════════════════════════════════════════════
// GJENERO KOD 6-SHIFROR
// ═══════════════════════════════════════════════════════
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ═══════════════════════════════════════════════════════
// DËRGO OTP
// ═══════════════════════════════════════════════════════
router.post('/send', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Email i pavlefshëm' });
        }

        // Rate limit — max 3/orë
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recent = db.prepare(`
            SELECT COUNT(*) as count FROM otp_codes
            WHERE email = ? AND created_at > ?
        `).get(email, oneHourAgo);

        if (recent.count >= 3) {
            return res.status(429).json({ error: 'Shumë kërkesa. Provo pas 1 ore.' });
        }

        // Fshij kodet e vjetra
        db.prepare('DELETE FROM otp_codes WHERE email = ? OR expires_at < CURRENT_TIMESTAMP').run(email);

        // Krijo kod
        const code = generateOTP();
        const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

        db.prepare(`
            INSERT INTO otp_codes (email, code, expires_at)
            VALUES (?, ?, ?)
        `).run(email, code, expires);

        // Dërgo email
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'TaxiApp <noreply@taxiapp.com>',
            to: email,
            subject: 'Kodi i verifikimit - TaxiApp',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px;">
                    <h1 style="color: #a855f7; text-align: center;">🚕 TaxiApp</h1>
                    <h2 style="text-align: center; color: #333;">Verifikimi i llogarisë</h2>
                    <p style="font-size: 16px; color: #666; text-align: center;">
                        Kodi jote i verifikimit është:
                    </p>
                    <div style="background: #f5f0ff; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 42px; font-weight: 800; letter-spacing: 8px; color: #a855f7; font-family: monospace;">
                            ${code}
                        </span>
                    </div>
                    <p style="font-size: 13px; color: #999; text-align: center;">
                        Ky kod skadon pas 5 minutash.
                    </p>
                    <p style="font-size: 11px; color: #bbb; text-align: center; margin-top: 30px;">
                        Nëse nuk e kërkove këtë kod, injoroje këtë email.
                    </p>
                </div>
            `
        });

        console.log(`📧 OTP dërguar te ${email}: ${code}`);

        res.json({ success: true, message: 'Kodi u dërgua në email' });
    } catch (e) {
        console.error('❌ OTP send:', e);
        res.status(500).json({ error: 'Gabim gjatë dërgimit të email-it' });
    }
});

// ═══════════════════════════════════════════════════════
// VERIFIKO OTP
// ═══════════════════════════════════════════════════════
router.post('/verify', (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email dhe kod janë të detyrueshme' });
    }

    const otp = db.prepare(`
        SELECT * FROM otp_codes
        WHERE email = ? AND used = 0
        ORDER BY created_at DESC LIMIT 1
    `).get(email);

    if (!otp) {
        return res.status(400).json({ error: 'Nuk ka kod aktiv' });
    }

    if (otp.attempts >= 3) {
        return res.status(429).json({ error: 'Shumë tentativa të gabuara' });
    }

    if (new Date(otp.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Kodi ka skaduar' });
    }

    if (otp.code !== code) {
        db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(otp.id);
        return res.status(400).json({ error: 'Kod i gabuar' });
    }

    // Shëno si përdorur
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otp.id);

    res.json({ success: true, verified: true, email });
});

module.exports = router;
