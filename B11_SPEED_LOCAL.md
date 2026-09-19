# Bài 11 – Tính tốc độ từ khoảng cách TAG 112 → TAG 113

- Tab GIÁO VIÊN có công cụ nhập khoảng cách thực tế giữa TAG 112 và TAG 113.
- Dữ liệu lưu bằng localStorage với khóa gắn với XE CỤC BỘ của thiết bị. Không gọi Google Apps Script để lưu khoảng cách.
- Khi TAG 112 xuất hiện: bắt đầu đo thời gian; dùng khoảng cách cục bộ đã lưu cho xe.
- Khi TAG 113 xuất hiện: tốc độ = khoảng cách(m) / thời gian(s) × 3,6.
- Hiển thị khoảng cách và tốc độ tính được trên trạng thái thi.
- Ngưỡng hiện tại giữ nguyên 25 km/h: >=25 PASS, <25 LOW_SPEED.
- Quá 120 giây trước TAG 113: timeout theo luật B11 hiện tại.
