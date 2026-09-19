# B04 / B06 timeout 120s

- TAG 41 / 61: phát `batdau.mp3`, bắt đầu 120 giây.
- TAG 42 / 62 trong 120 giây: hoàn thành bài.
- Hết 120 giây mà chưa thấy TAG 42 / 62: phát `quatg1.mp3`, kết thúc TIMEOUT.
- B04 không có `audio/b04/quatg1.mp3` trong bộ audio full; hệ thống thử đường dẫn B04 trước và fallback sang `audio/b06/quatg1.mp3`.
