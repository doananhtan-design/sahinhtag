SA HÌNH AI — V2.1.4 AUTH24H

THAY ĐỔI CHÍNH
1. URL Apps Script cố định trong gas-config.js:
   https://script.google.com/macros/s/AKfycbzlb8ov5LaFKfYOjryDJolfQXOkKyjI9h99oQ8vtWRXa6-z3pArHeNIkI0B4gvsU70G/exec
2. index.html không còn ô URL Apps Script, không còn nút LƯU KẾT NỐI và không còn fallback đọc URL từ localStorage.
3. Đăng nhập phản hồi theo từng bước: kết nối → xác thực → kiểm tra quyền → thành công.
4. Tài khoản bị khóa: báo “Tài khoản đã bị khóa. Vui lòng liên hệ ADMIN (0914.531.591).”
5. Phiên giáo viên tối đa 24 giờ và hết hiệu lực khi sang ngày mới.
6. Kiểm tra lại quyền định kỳ 15 phút, khi app quay lại foreground/online, và trước BẮT ĐẦU/THI LẠI.
7. Giữ nguyên engine AprilTag 36h11, luật 14 bài, audio và các sửa lỗi V2.1.1.
8. Cache PWA đổi sang V2.1.4 để buộc nhận index mới.

DEPLOY
- Google Apps Script: cập nhật Code.gs rồi Deploy bản Web App mới, Execute as Me, Who has access Anyone. Giữ URL /exec ở trên.
- GitHub Pages: chép toàn bộ file trong thư mục này lên root branch main.
- Sau deploy, mở PWA, reload một lần để nhận Service Worker V2.1.4.
