SA HINH AI V2.1.6 - THI CHINH THUC

Thay doi:
- Trong chế độ Thi Sa Hình, thông tin học viên được giữ hiển thị trong suốt lượt thi.
- Nút XÁC NHẬN — VÀO THI bị khóa cho đến khi tra cứu SBD thành công.
- Khi bắt đầu lượt thi, máy chủ tạo dòng trong KET_QUA_THI_SA_HINH ngay lập tức và khóa trạng thái học viên DANG THI.
- PWA gửi cập nhật tiến trình/sự kiện mỗi 10 giây; cột CHI_TIET_JSON được cập nhật liên tục.
- Tự động kết thúc sau 18 phút tính từ lúc bắt đầu lượt thi; kết quả cuối cùng cập nhật vào dòng đã tạo, trạng thái học viên thành DA THI.
- Kết quả thi cũ không bị tạo dòng trùng khi hoàn tất; mỗi examId có một dòng.

Cập nhật triển khai:
1. Sao lưu Google Sheet và mã hiện tại.
2. Cập nhật Code.gs lên dự án Apps Script đang dùng; triển khai Web App phiên bản mới, giữ URL /exec.
3. Cập nhật app.js, index.html và sw.js lên GitHub Pages. Nếu cache cũ vẫn còn, đổi CACHE_NAME trong sw.js sang tên mới hoặc xóa dữ liệu site/PWA rồi mở lại.
4. Thử với học viên kiểm thử trước khi thi thật.

Giới hạn:
- Cập nhật sheet theo nhịp 10 giây khi thiết bị còn kết nối mạng. Mất mạng có thể làm chậm cập nhật; sự kiện còn nằm cục bộ cho tới khi kết nối lại, nhưng bản này chưa có cơ chế tự đồng bộ bù toàn bộ sau mất mạng.
- Bộ đếm 18 phút và tự hoàn tất chạy trên thiết bị đang mở PWA; không thể bảo đảm tự động hoàn tất đúng hạn nếu ứng dụng bị đóng hoặc thiết bị tắt. Cần bổ sung bộ quét máy chủ theo thời gian nếu muốn hoàn tất ngay cả khi thiết bị ngoại tuyến/đóng ứng dụng.
- Đã kiểm tra cú pháp tĩnh; chưa chạy thử với Google Sheet/Apps Script thực tế.
