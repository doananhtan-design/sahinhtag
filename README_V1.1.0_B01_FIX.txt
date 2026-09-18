SA HINH AI — V1.1.0-B01-FIX

NEN:
- Bat dau tu code chuan.zip.
- GIU NGUYEN 100% apriltag-adapter.js / code nhan TAG.
- AprilTag 36h11, detect truc tiep nhu ban code chuan.

LOGIC B01 DA THONG NHAT:
1. TAG 01 -> phat audio/b01/doilenh.mp3.
2. Khoa TAG 20 giay.
3. Het 20 giay -> phat audio/b01/b01_XP.mp3.
4. Ngay sau lenh XP -> bat dau tong dem nguoc 18:00.
5. Dong thoi mo cua so 30 giay cho TAG 111.
6. TAG 111 -> phat audio/b01/batdau.mp3 -> B01 hoan thanh.
7. Het 30 giay khong co TAG 111 -> phat audio/b01/qua30s.mp3 -> B01 loi.
8. Tong 18 phut het -> ket thuc bai thi theo timer tong.

AUDIO RIENG TUNG BAI:
- audio/b01/
- audio/b02/ ... audio/b13/
- audio/KT/
- audio/THKC/

ZIP NAY KHONG CHUA MP3. Audio hien co tren PWA/GitHub duoc giu nguyen.
Google Apps Script chi dung cho dang nhap giao vien.
