# Bài 03 — Dốc cầu (V1.4.0)

- TAG 03: báo bài, phát `baobai.mp3`.
- TAG 31: vào bài, phát `batdau.mp3`.
- TAG 32: khi đứng yên ổn định theo bộ lọc camera, phát `dungxe.mp3` và bắt đầu bộ đếm 30 giây.
- B03 **vẫn dùng quy tắc vị trí** tại TAG 32 theo mốc cục bộ ±5%:
  - Chưa đến vị trí: phát `chuaden.mp3`.
  - Đúng vị trí: không phát cảnh báo lỗi.
  - Quá vị trí: phát `quavitri.mp3`, sau đó phát `thitruot.mp3`.
- Trong thời gian theo dõi, tiếp tục ghi nhận diện tích TAG 32 để phát hiện dấu hiệu **tụt dốc**. Khi phát hiện tụt dốc, phát `tutdoc.mp3`, sau đó phát `thitruot.mp3`.
- Hết 30 giây kể từ lúc báo DỪNG XE: chỉ khi camera **vẫn còn quét thấy TAG 32** mới phát `qua30s.mp3` và kết thúc Bài 03 với TIMEOUT.
- Âm thanh `thitruot.mp3` chỉ được phát **sau** khi âm thanh lỗi chính đã phát xong.

## Âm thanh B03 cần có
`audio/b03/batdau.mp3`
`audio/b03/dungxe.mp3`
`audio/b03/chuaden.mp3`
`audio/b03/quavitri.mp3`
`audio/b03/tutdoc.mp3`
`audio/thitruot.mp3`
`audio/b03/qua30s.mp3`
