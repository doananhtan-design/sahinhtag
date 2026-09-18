# B02 — Mốc diện tích đúng vị trí (V1.3.2)

Nút **GHI NHẬN ĐÚNG VỊ TRÍ** chỉ lấy diện tích TAG 22 hiện tại làm `referenceArea`.
Nút không chấm đạt và không kết thúc Bài 02.

So sánh tại TAG 22:
- current < reference × 0.95 -> CHƯA ĐẾN -> `chuaden.mp3`
- reference × 0.95 <= current <= reference × 1.05 -> ĐÚNG VỊ TRÍ -> không phát cảnh báo
- current > reference × 1.05 -> QUÁ VỊ TRÍ -> `quavitri.mp3`

Sai số chấp nhận: ±5%.
Mốc được lưu LocalStorage key `sahinh_b02_reference_area`.
