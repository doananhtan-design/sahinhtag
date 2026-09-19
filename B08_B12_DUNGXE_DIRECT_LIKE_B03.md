# B08/B12 DUNGXE – dùng cùng cơ chế phát trực tiếp như B03

- B03 đã xác nhận phát `dungxe.mp3` ổn định.
- B08 TAG 82 và B12 TAG 123 nay gọi trực tiếp `this.audio('dungxe.mp3')`, không chờ Promise để tránh khóa pending làm mất lần phát.
- File dùng cục bộ: `audio/b08/dungxe.mp3` và `audio/b12/dungxe.mp3`.
- Không thay đổi luật 120s, TAG lần 2, hoặc lọc TAG gần nhất.
