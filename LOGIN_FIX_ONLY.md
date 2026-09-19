# V2.1.1 — LOGIN FIX ONLY

Base is the original V2.1.1. Exam/TAG/audio/B11/B12 logic is unchanged.

Changed only authentication-related code:
- PWA uses fixed Apps Script /exec URL from gas-config.js.
- Removed editable URL + LUU KET NOI from login UI.
- PWA accepts Apps Script responses using ok/success and nested data.
- PWA stores token + teacher session and revalidates on startup, every 15 minutes, and when tab becomes visible.
- Backend patch supports sheet schema: maGV | taiKhoan | matKhau | hoTen | quyen | trangThai | ghiChu, and also matKhauHash if present.
- Backend patch enforces 24h session and new-day login; locked account returns ACCOUNT_LOCKED.
