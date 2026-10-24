SA HINH AI — V2.1.17-PRACTICE-RESET-TAG-ORDER
Ngày đóng gói: 24/10/2026

CÁC TỆP ĐÃ CẬP NHẬT
- app.js: logic luyện tập nhận TAG không theo thứ tự; xử lý dự phòng khi nhận TAG 141 nhưng bỏ sót TAG 14; tự đặt lại vòng sau khi hoàn tất KT; làm mới trạng thái THKC cho vòng luyện tập kế tiếp.
- index.html: nhãn phiên bản trên giao diện đổi thành V2.1.17.
- sw.js: đổi tên cache sang V2.1.17 để trình duyệt cài cache mới, tránh tiếp tục dùng bộ app.js cũ.
- VERSION.txt: cập nhật mốc phiên bản chính thức của gói mã nguồn.

PHẠM VI GIỮ NGUYÊN
- Giữ nguyên CSS, âm thanh, manifest, cấu hình và các tệp Apps Script hiện có trong gói gốc.
- Chế độ thi chính thức vẫn giữ quy tắc kiểm tra thứ tự TAG; thay đổi cho phép nhận TAG không tuần tự chỉ áp dụng chế độ luyện tập.

CÁCH TRIỂN KHAI
1. Sao lưu bản đang chạy.
2. Đưa các tệp trong thư mục sahinhhtag lên đúng vị trí đang triển khai, bao gồm app.js, index.html, sw.js và VERSION.txt.
3. Mở lại PWA khi có mạng để service worker nhận cache mới. Nếu vẫn hiện bản cũ, đóng hẳn PWA/trình duyệt rồi mở lại hoặc xóa dữ liệu trang của website và đăng nhập lại.
4. Kiểm tra nhãn V2.1.17 ở đầu trang, rồi thử chế độ luyện tập và chế độ thi chính thức.

KIỂM TRA
- Cần chạy node --check app.js để kiểm tra cú pháp.
- Chưa thực hiện thử nghiệm thực tế với camera, TAG và thiết bị xe trong gói này; cần kiểm tra tại thiết bị trước khi phát hành chính thức.
