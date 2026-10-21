SA HINH AI V2.1.5 — THI SA HINH, KHÓA HỌC VIÊN SAU THI

THAY ĐỔI
- Thêm chọn chế độ LUYỆN TẬP / THI SA HÌNH; mặc định vẫn là LUYỆN TẬP.
- Thi chính thức yêu cầu tra cứu học viên theo SBD trước khi bắt đầu.
- Backend Google Apps Script kiểm tra trạng thái và khóa lượt thi; học viên đã thi hoặc đang có lượt thi không thể bắt đầu lượt mới.
- Khi hoàn tất bài thi (sự kiện EXAM_COMPLETED ở bài KT), lưu một dòng vào KET_QUA_THI_SA_HINH và đổi trạng thái học viên thành DA THI.
- Chỉ tài khoản có quyen=ADMIN mới thấy chức năng mở khóa; mở khóa đổi trạng thái về CHUA THI, không xóa lịch sử cũ.
- Thi chính thức không cho nút THI LẠI hoạt động. Luyện tập giữ hành vi hiện có.
- Đổi tên cache Service Worker để thiết bị tải bản cập nhật.

CẤU TRÚC SHEET
DANH_SACH_HOC_VIEN: cần có hàng tiêu đề với cột SBD (hoặc SO BAO DANH), HO TEN; có thể có CCCD. Nếu chưa có cột TRANG_THAI_THI, backend sẽ tự thêm. Trạng thái dùng: CHUA THI, DANG THI, DA THI.
KET_QUA_THI_SA_HINH: backend tự tạo với các cột MA_LUOT_THI, SBD, HO_TEN, CCCD, GIAO_VIEN, BAT_DAU, KET_THUC, KET_QUA, CHI_TIET_JSON.

TRIỂN KHAI BẮT BUỘC
1. Sao lưu Google Sheet và mã Apps Script hiện tại.
2. Cập nhật Code.gs trong đúng dự án Apps Script được URL trong gas-config.js trỏ tới. Lưu và triển khai phiên bản mới (Deploy > Manage deployments > Edit > New version > Deploy).
3. Đảm bảo sheet DANH_SACH_HOC_VIEN có SBD và HỌ TÊN đúng hàng tiêu đề; không xóa hoặc đổi tên sheet kết quả.
4. Đưa các file PWA trong ZIP lên GitHub Pages, giữ nguyên cấu trúc thư mục. Mở lại PWA/refresh để Service Worker tải cache mới.
5. Tài khoản ADMIN trong GIAO_VIEN phải có cột quyen là ADMIN.

LƯU Ý
- Chưa thể kiểm thử trực tiếp với Google Sheet/Apps Script thực tế. Phải thử trước với một học viên kiểm thử.
- Nếu điện thoại mất mạng hoặc đóng trang giữa lượt thi, trạng thái sẽ là DANG THI để tránh cho thi lại ngoài ý muốn; ADMIN có thể mở khóa sau khi xác minh.
- Học viên chỉ chuyển sang DA THI khi app nhận sự kiện hoàn tất bài KT và backend ghi kết quả thành công. Nếu lưu lỗi, cần kiểm tra mạng và xử lý với ADMIN.
