# 📱 SMS Gateway — Dokument Teknik

Specifikim për aplikacionin Android që dërgon SMS nga telefoni i zyrës.

---

## 🎯 Qëllimi

Një aplikacion Android që:
1. Lexon queue-n e SMS-ve nga Firebase Firestore
2. Dërgon SMS përmes SIM kartës lokale
3. Përditëson statusin në Firestore

**Përfitimi:** Kosto €0.03/SMS në vend të €0.23 me Twilio.

---

## 🏗️ Arkitektura
