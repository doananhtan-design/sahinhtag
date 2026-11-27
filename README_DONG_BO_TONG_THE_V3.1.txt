SA HINH AI V3.1 - GOI DONG BO CODE PHAT THANH / LOI VI PHAM

CAC FILE CAN CAP NHAT
1. PWA: app.js, sw.js va thu muc audio/ trong thu muc sahinhtag.
2. Google Apps Script: Code.gs.
3. Trang ket qua: AdminKetQua.html (them vao cung project Apps Script).

CAC PHAN DA GIU / DONG BO
- AdminKetQua hien thi thoi gian theo Asia/Ho_Chi_Minh va tu tai lai danh sach moi 4 giay.
- May trung tam phat MP3 theo hang doi, khong dung SpeechSynthesis/TTS.
- SBD duoc doc bang sbd.mp3 + tung file so 0.mp3...9.mp3, giu so 0 dau.
- Su kien bat dau/thi dat/thi truot va loi co duong dan MP3 duoc dua vao hang doi trung tam.
- Loi OFFICIAL_WRONG_SEQUENCE phat tai may app bang audio/saiquytrinhbai.mp3; server bo qua su kien nay de tranh phat trung tam lan hai.
- Loi sai quy trinh chi phat mot lan trong mot luot thi, tranh lap khi camera tiep tuc nhan TAG sai.
- Service worker da tang cache version va cache audio/saiquytrinhbai.mp3 de may PWA cap nhat file moi.
- Khong sua logic TAG / che do luyen tap.

THU VIEN AUDIO
- Thu muc audio/ duoc lay tu audio(1).zip va giu them audio/saiquytrinhbai.mp3.
- Cac loi B08_NO_GHEP_XE va B12_NO_GHEP_XE chua co MP3 rieng trong thu vien; khong gan nham file khac. Neu muon phat rieng, bo sung MP3 tuong ung va cap nhat mapping.

TRIEN KHAI
1. Cap nhat cac file PWA trong hosting: app.js, sw.js va toan bo audio/.
2. Trong Apps Script, cap nhat Code.gs va AdminKetQua.html.
3. Luu va Deploy > Manage deployments > Edit > New version.
4. Mo lai PWA, dong mo lai tab hoac xoa cache cu neu can; mo AdminKetQua, dang nhap ADMIN.
5. Chon thu muc audio/ tren may trung tam, thu phat SBD 09, bat dau, loi va ket qua.
6. Khong dong tab AdminKetQua trong luc can phat thanh.

GHI CHU KIEM THU
- Goi nay duoc kiem tra cu phap JavaScript va tinh day du cua file audio tham chieu trong ZIP.
- Chua the kiem thu ket noi Google Apps Script / Google Sheets hoac loa tren may thuc te trong moi truong nay.
