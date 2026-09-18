# B02 — Mốc diện tích lưu cục bộ theo xe/điện thoại

V1.3.3 lưu tham số diện tích TAG 22 trong **localStorage của chính điện thoại**.

Mỗi điện thoại tự có một mã hồ sơ xe cục bộ, ví dụ `XE-A1B2C3D4`.
Mốc được lưu theo:
`sahinh_b02_reference_v1_<MA_XE_CUC_BO>`

Dữ liệu lưu:
- TAG 22
- Diện tích mốc
- Sai số ±5%
- Cận dưới 95%
- Cận trên 105%
- Thời gian ghi mốc

Mục đích:
- dùng đúng mốc của chiếc xe/điện thoại đó để xác định CHƯA ĐẾN / ĐÚNG VỊ TRÍ / QUÁ VỊ TRÍ;
- không phụ thuộc Google Sheet;
- không gửi mốc diện tích lên server.

Nếu xóa dữ liệu trình duyệt/app trên điện thoại thì mốc cục bộ cũng bị xóa.
Bản này có di chuyển (migration) mốc cũ `sahinh_b02_reference_area` sang hồ sơ xe cục bộ trong lần chạy đầu tiên.
