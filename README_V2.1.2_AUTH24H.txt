SA HÌNH AI – V2.1.2 AUTH 24H
====================================
Nền engine: V1.4.15
Phát triển: V2.1.x

1. XÁC THỰC GIÁO VIÊN
- Phiên đăng nhập tối đa 24 giờ kể từ lúc đăng nhập.
- Sang ngày mới: phiên cũ tự mất hiệu lực, phải đăng nhập lại.
- Trạng thái tài khoản được kiểm tra trực tiếp trên Google Sheet qua Apps Script.
- PWA kiểm tra khi mở app, khi quay lại app, khi online trở lại, trước khi BẮT ĐẦU/THI LẠI và mỗi 15 phút khi app đang mở.
- Nếu ADMIN đổi trạngThai -> khóa tài khoản, PWA sẽ buộc đăng nhập lại ở lần kiểm tra kế tiếp.
- Session server dùng PropertiesService thay cho CacheService để giữ được thời hạn 24 giờ.

2. LOGO + ICON
- logo-original.jpg: đúng logo người dùng cung cấp.
- logo.png: logo dùng ở màn hình đăng nhập.
- logo-mark.png: logo thu gọn cho thanh đầu ứng dụng.
- icon-192.png / icon-512.png: icon PWA.
- apple-touch-icon.png: icon iPhone/iPad.

3. DEPLOY GOOGLE APPS SCRIPT
- Mở Apps Script backend.
- Thay Code.gs bằng Code.gs trong gói này.
- Deploy > New deployment > Web app.
- Execute as: Me.
- Who has access: Anyone.
- Dùng URL /exec mới trong PWA.
- Sau khi cập nhật backend, đăng nhập lại giáo viên một lần.

4. DEPLOY PWA
- Giữ nguyên cấu trúc thư mục.
- Upload toàn bộ nội dung gói lên GitHub Pages / repo PWA hiện tại.
- Đã tăng Service Worker cache lên V2.1.2 để tránh giữ JS cũ.

5. LƯU Ý BẢO MẬT
- Client không được coi là nguồn xác thực cuối cùng; server Apps Script mới là nơi quyết định tài khoản còn hoạt động hay đã bị khóa.
- Không có ứng dụng web nào có thể bảo đảm “chống hack 100%”; bản này bổ sung kiểm tra quyền phía server và ép đăng nhập lại khi phiên hết hạn/khóa tài khoản.
