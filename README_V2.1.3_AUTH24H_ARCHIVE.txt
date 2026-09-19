SA HÌNH AI — V2.1.3 AUTH24H

1. PWA không còn cho người dùng nhập URL Apps Script. URL xác thực nằm trong gas-config.js.
2. Đăng nhập hiển thị tiến trình: kết nối → xác thực → kiểm tra quyền → thành công.
3. Tài khoản bị khóa từ sheet GIAO_VIEN sẽ nhận thông báo và số ADMIN 0914.531.591.
4. Sau đăng nhập, PWA gọi validate lại token trước khi mở quyền sử dụng.
5. Trong quá trình sử dụng, server kiểm tra trạng thái định kỳ 15 phút, khi đổi ngày hoặc hết 24 giờ phải đăng nhập lại.
6. Trước BẮT ĐẦU và THI LẠI, PWA bắt buộc kiểm tra server.
7. Logo/icon giữ nguyên theo V2.1.2.

Triển khai Apps Script:
- Cập nhật Code.gs.
- Deploy phiên bản mới của Web App.
- Kiểm tra URL /exec trong gas-config.js.
