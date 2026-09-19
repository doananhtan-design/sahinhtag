# B04 / B06 – kiểm soát thời gian 120 giây

- TAG 41 (B04) / TAG 61 (B06): phát `batdau.mp3`, bắt đầu đồng hồ phụ 120 giây.
- TAG 42 / TAG 62 trong thời gian: hoàn thành bài.
- Hết 120 giây mà chưa thấy TAG 42 / TAG 62: chỉ phát cảnh báo `quatg1.mp3` một lần và đánh dấu cảnh báo.
- Không kết thúc bài, không chuyển sang bài khác, không dừng camera.
- Tiếp tục chờ TAG 42 / TAG 62. Khi nhận được TAG kết thúc thì bài vẫn có thể hoàn thành.
- Timeout được kiểm soát trong `engine.update()` nên vẫn chạy khi khung hình không có TAG.
