# V1.3.4 — Quy tắc vị trí chung B02 / B03 / B10 / B12

- B02: TAG 21 -> TAG 22
- B03: TAG 31 -> TAG 32
- B10: TAG 101 -> TAG 102
- B12: TAG 121 -> TAG 123

Sau TAG kiểm tra ổn định:
1. Phát `dungxe.mp3`.
2. Hiện nút `GHI NHẬN ĐÚNG VỊ TRÍ — BÀI XX`.
3. Nút chỉ ghi diện tích hiện tại làm mốc trên điện thoại/xe cục bộ.
4. Mốc lưu riêng cho từng bài + mã xe cục bộ.
5. Sai số ±5%:
   - <95%: CHƯA ĐẾN -> `chuaden.mp3`
   - 95%-105%: ĐÚNG VỊ TRÍ -> không phát cảnh báo
   - >105%: QUÁ VỊ TRÍ -> `quavitri.mp3`

Không tự động chấm đạt/kết thúc chỉ vì bấm nút.
