SA HINH AI - V3.1
FIX HIEN THI ANH HOC VIEN TAI GIAO DIEN THI CHINH THUC

Da cap nhat:
- Tach phan thong tin hoc vien va khung anh rieng.
- Tra cuu anh qua API getstudentphoto neu payload tra cuu chua co photoData.
- Backend nhan dien them cac ten cot anh pho bien va chuan hoa Drive File ID/URL.
- Kiem tra MIME theo Drive file va ho tro JPEG/PNG/WebP toi da 1.8 MB.
- Cap nhat nhan phien ban V3.1 va cache service worker de tranh dung app.js cu.

Cach cap nhat:
1. Sao luu ban dang chay.
2. Cap nhat PWA tu thu muc sahinhtag trong goi nay.
3. Cap nhat GAS_BACKEND/Code.gs len cung project Google Apps Script.
4. Luu va trien khai New version cua Web App GAS.
5. Tai lai PWA; neu van hien ban cu, dong tab va mo lai de service worker V3.1 kich hoat.

Luu y:
- Khong sua logic MODE LUYEN TAP.
- Khong sua quy tac TAG, timer, diem thi hay am thanh.
- Khong tu dong cap nhat Google Sheet/Drive va khong tu dong trien khai.
- Da kiem tra cu phap JavaScript va cau truc ZIP; chua the kiem thu ket noi Google Drive/GAS live.


BO SUNG V3.1 - GIAO DIEN TAP TRUNG KHI VAO THI
Sau khi API beginexam xac nhan thanh cong:
- An thanh dieu huong SA HINH / GIAO VIEN.
- An khoi CHE DO HOAT DONG va toan bo phan tra cuu/thong tin hoc vien.
- An nut XAC NHAN - VAO THI vi da bat dau.
- Giu lai diem thi, dong ho 18 phut, dong ho phu, camera/sa hinh, bai, TAG va trang thai.
- Chi ap dung cho THI SA HINH chinh thuc; MODE LUYEN TAP khong bi thay doi.
Neu camera/audio/API khong san sang hoac beginexam that bai, giao dien khong bi an.
