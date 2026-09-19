# V1.4.4 — Luật Bài 08 / Bài 12

## Bài 08
- TAG 08: `baobai.mp3`.
- TAG 81 lần 1: `batdau.mp3`, bắt đầu bộ đếm phụ 120s.
- TAG 82: **không kiểm tra vị trí**; phát `dungxe.mp3`.
- Sau khi TAG 81 lần 1 rời khung hình, TAG 81 lần 2 kết thúc bài.
- Quá 120s chưa thấy TAG 81 lần 2: `quatgbai.mp3` và TIMEOUT.

## Bài 12
- TAG 12: `baobai.mp3`.
- TAG 121 lần 1: `batdau.mp3`, bắt đầu bộ đếm phụ 120s.
- TAG 123: **không kiểm tra vị trí**; phát `dungxe.mp3`.
- Sau khi TAG 121 lần 1 rời khung hình, TAG 121 lần 2 kết thúc bài.
- Quá 120s chưa thấy TAG 121 lần 2: `quatgbai.mp3` và TIMEOUT.

### Loại bỏ
- Không dùng mốc vị trí localStorage cho B08/B12.
- Không so sánh ±5%.
- Không hiển thị nút `GHI NHẬN ĐÚNG VỊ TRÍ` cho B08/B12.
