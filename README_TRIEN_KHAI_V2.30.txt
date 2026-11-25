SA HINH AI — V2.30

CẬP NHẬT
- Đồng bộ phiên bản app.js, index.html, Code.gs, VERSION.txt và cache PWA.
- Thêm hàng đợi phát âm thanh tuần tự; mỗi file được phát hết trước khi file tiếp theo bắt đầu; chống gọi trùng cùng file trong 180ms.
- B02, B03, B10 chỉ gọi checkTarget/phát dungxe.mp3 sau khi TAG kiểm tra duy trì ổn định qua cửa sổ mẫu khoảng 1,9 giây (ít nhất 15 mẫu), tâm TAG không dao động quá 9 px và diện tích không biến thiên quá 4,5%. Mất TAG quá 260ms sẽ xóa mẫu xác nhận.
- Giữ nguyên thứ tự bài, luật thi chính thức, B08/B12 và vòng xoay THKC B05 → B10 → B12.
- Khi có nhiều TAG, ưu tiên TAG có diện tích chiếu lớn hơn; có ngưỡng 12% để tránh nhảy TAG do nhiễu. Đây là ước lượng gần camera khi các TAG cùng kích thước, KHÔNG phải đo pose/depth 3D đã hiệu chuẩn.

GIỚI HẠN KIỂM THỬ
- Đã kiểm tra cú pháp JavaScript và cấu trúc ZIP.
- Chưa kiểm thử camera thật, xe chạy nhanh, camera rung, nhiều TAG ngoài sân, âm lượng/loa điện thoại hoặc Apps Script đang triển khai.
- Xác nhận dừng xe dựa trên chuyển động TAG tương đối với camera; camera bị rung hoặc xe di chuyển rất chậm trong vùng sai số vẫn cần thử thực địa. Muốn đo khoảng cách 3D chính xác cần kích thước TAG thực tế và hiệu chuẩn camera.

TRIỂN KHAI
1. Giải nén toàn bộ gói, không chỉ chép riêng app.js.
2. Đưa các file PWA lên cùng thư mục hosting/HTTPS.
3. Cập nhật GAS_BACKEND/Code.gs lên Apps Script nếu dùng đăng nhập/ghi kết quả, sau đó triển khai phiên bản web app mới.
4. Mở PWA, tải lại cứng hoặc đóng/mở lại ứng dụng để service worker cũ được thay bằng cache V2.30.
5. Kiểm thử sân: nhiều TAG; xe dừng hẳn; xe lăn chậm; xe chạy qua; mất TAG; âm thanh nối tiếp; B08/B12 và THKC.


PATCH V2.30 — RESTORE BÀI 02, 03, 10 THEO V2.30
- Khôi phục nhận TAG kiểm tra theo độ ổn định tâm và diện tích TAG (STABLE_MS / DISTANCE_THRESHOLD / AREA_THRESHOLD).
- Sau khi TAG kiểm tra ổn định đủ thời gian, gọi checkTarget() như V2.30.
- Bỏ nhánh confirmVehicleStationary() mới cho B02/B03/B10 và bỏ reset stop-candidate riêng của ba bài.
- Giữ nguyên các phần khác của V2.30, bao gồm quy trình kết thúc TAG 141 / RESET ALL.


CAP NHAT V2.30 — B08/B12 VA BAI 11 (2026-11-25)
- B08/B12: qua 120 giay chi phat canh bao, khong khoa TAG 82/123; van cho TAG dung xe va TAG vao bai lan 2.
- Bai 11: moc thoi gian lay ngay sau khi detector tra ket qua, giam sai so do thoi gian xu ly frame.
- Khoang cach mac dinh B11 dong bo 30m theo baseline cu va giao dien; gia tri tuy chinh khac duoc giu. Gia tri 50m do migration V2.30 cu tu ghi se duoc chuyen ve 30m.
- Nguong dat giu nguyen >=25 km/h; cong thuc: khoang cach thuc (m) / thoi gian TAG 112 den TAG 113 (s) * 3.6.


CAP NHAT V2.30 — B08/B12 LUYEN TAP LAP TAG KHONG GIOI HAN (2026-11-25)
- Trong che do Luyen tap, B08/B12 cho phep lap lai chu ky TAG dau (81/121) -> TAG kiem tra (82/123) -> TAG dau lan tiep theo khong gioi han.
- Dong ho 120 giay chi bat dau mot lan tai lan dau tien nhan TAG dau cua bai trong phien.
- Cac chu ky lap lai khong khoi dong lai, khong lam moi han 120 giay.
- Het 120 giay phat canh bao mot lan; tiep tuc cho phep nhan TAG va luyen tap khong gioi han.
- Thi chinh thuc giu nguyen quy trinh va gioi han 120 giay hien co.
- Cache Service Worker duoc doi ten de trinh duyet tai bo app.js moi.
