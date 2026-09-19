# V1.4.6 — Luật Bài 08 / Bài 12

- B08: TAG 81 lần 1 → batdau.mp3 → bộ đếm 120 giây.
- B08: TAG 82 → phát `audio/b08/dungxe.mp3`, không kiểm tra vị trí. Nếu lần đầu phát lỗi/tạm thời chưa phát được thì tiếp tục thử lại khi TAG 82 vẫn được quét.
- B08: TAG 81 lần 2 chỉ được chốt sau khi TAG 81 lần 1 đã rời khung hình.
- B12: TAG 121 lần 1 → batdau.mp3 → bộ đếm 120 giây.
- B12: TAG 123 → phát `audio/b12/dungxe.mp3`, không kiểm tra vị trí, có cơ chế thử lại audio tương tự B08.
- B12: TAG 121 lần 2 chỉ được chốt sau khi TAG 121 lần 1 đã rời khung hình.
- Quá 120 giây → `quatgbai.mp3`.
- Đã xóa hàm `b08()` cũ không còn được sử dụng.
