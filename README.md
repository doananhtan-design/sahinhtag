SA HÌNH AI - BẢN FIX LOGIN

PWA:
- index.html, app.js, app.css, AprilTag chạy tại trình duyệt.
- MP3 chạy trực tiếp từ PWA.
- URL Google Apps Script đã tích hợp sẵn trong index.html.

Google Apps Script:
- Code.gs chỉ dùng API doPost(action=login) để kiểm tra tài khoản giáo viên trong Sheet GIAO_VIEN.
- Không dùng GAS cho audio hoặc luật thi.

QUAN TRỌNG:
Sau khi thay Code.gs trong Apps Script, vào Deploy > Manage deployments > Edit deployment > New version > Deploy. Giữ Web app URL cũ.
