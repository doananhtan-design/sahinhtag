# V2.1.1 — CHỈ SỬA CODE LIÊN QUAN ĐĂNG NHẬP

## PWA files changed
- `index.html`: removed editable Apps Script URL + Save Connection button.
- `app.js`: fixed response parsing (`ok/success/data`), fixed token session handling, revalidation on startup/visibility/every 15 minutes, validation before starting exam, locked-account message. No exam/TAG/audio/B11/B12 logic was intentionally changed.
- `gas-config.js`: fixed the `/exec` URL provided by the user.

## Apps Script
- `APPSCRIPT_Code.gs_LOGIN_FIXED_FULL.gs`: full Code.gs based on the current Apps Script Code.gs snapshot, with only authentication sections replaced. Supports sheet columns `maGV | taiKhoan | matKhau | hoTen | quyen | trangThai | ghiChu` and also `matKhauHash` if present; 24-hour/new-day expiry; locked account recheck; login/validate/logout API.

## Important
Replace the Apps Script `Code.gs` with `APPSCRIPT_Code.gs_LOGIN_FIXED_FULL.gs`, then Save and redeploy the same Web App `/exec`.
For PWA, replace only the three changed files in the V2.1.1 PWA: `index.html`, `app.js`, `gas-config.js`.
All other V2.1.1 files stay unchanged.
