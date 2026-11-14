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
