# V1.3.7 — Tách TAG báo bài và TAG vào bài

Nguyên tắc áp dụng cho B02/B03/B08/B10/B12:

- TAG báo bài:
  - B02 = 02
  - B03 = 03
  - B08 = 08
  - B10 = 10
  - B12 = 12
  -> chỉ phát `baobai.mp3`.

- TAG vào bài:
  - B02 = 21
  - B03 = 31
  - B08 = 81
  - B10 = 101
  - B12 = 121
  -> chỉ phát `vaobai.mp3`.

Hai TAG ở hai vị trí độc lập; không được phát `vaobai.mp3` khi chỉ vừa nhận TAG báo bài.

B08/B12:
- TAG vào bài lần 1 bắt đầu 120 giây.
- TAG vào bài lần 2 kết thúc 120 giây.
- Hết 120 giây -> `quatgbai.mp3`.
