SA HINH AI V2.30 - CONG CU NHAP XML RIENG CHO THI SA HINH
==========================================================

PHAM VI
- Cong cu nay chi phuc vu che do THI SA HINH.
- Nhap hoc vien tu XML vao sheet danh_sach_hoc_vien cua Sa Hinh AI.
- KHONG dung chung danh sach voi cong cu mo phong 120 tinh huong.
- KHONG doc, ghi, cap nhat hay tach/chuyen du lieu cua cong cu mo phong 120.
- Ket qua thi Sa Hinh tiep tuc luu theo cau truc ket qua hien co.

DU LIEU DOC TU XML
- SO_BAO_DANH -> SBD
- HO_TEN_IN (neu rong thi dung HO_TEN) -> HO_TEN
- SO_CMT -> CCCD (luu dang text, giu so 0 dau)
- NGAY_SINH -> NGAY_SINH
- HANG_GPLX -> HANG_THI
- KY_SAT_HACH / TEN_KY_SAT_HACH -> KY_SAT_HACH / KHOA_HOC
- MA_DANG_KY, QUOC_TICH, NOI_CT
- ANH_CHAN_DUNG -> luu anh vao thu muc Drive SA_HINH_AI_ANH_HOC_VIEN;
  ma file luu vao cot ANH_FILE_ID cua sheet Sa Hinh.

QUY TAC NHAP
- Doi chieu trung theo CCCD truoc, sau do theo SBD.
- Da co thi cap nhat hoc vien Sa Hinh, khong tao dong trung.
- Khong ghi de TRANG_THAI va TRANG_THAI_THI da duoc ADMIN cai dat.
- Hoc vien moi mac dinh CHUA THI neu sheet co cot TRANG_THAI_THI.
- SBD va CCCD duoc luu dang text de khong mat so 0 dau.
- Import khong xoa hoc vien cu va khong xoa ket qua thi.
- Moi dot gui toi da 5 hoc vien.

CAI DAT
1. Mo dung Google Apps Script project dang phuc vu Sa Hinh AI.
2. Cap nhat Code.gs bang GAS_BACKEND/Code.gs trong goi nay.
3. Tao file HTML ten chinh xac ImportXML va dan GAS_BACKEND/ImportXML.html.
4. Luu project, Deploy > Manage deployments > Edit > New version > Deploy.
5. Mo URL Web App hien tai va them ?mode=importxml.
6. Dang nhap ADMIN, chon XML, bam DOC VA KIEM TRA XML, xem truoc, sau do NHAP VAO DANH SACH HOC VIEN.

SHEET
- Cong cu tim sheet Sa Hinh co ten danh_sach_hoc_vien (khong phan biet hoa/thuong).
- Neu sheet chua co, tao danh_sach_hoc_vien trong Spreadsheet cua Sa Hinh.
- Chi bo sung cot con thieu vao sheet Sa Hinh; khong sua sheet cua cong cu mo phong 120.
- Anh duoc luu trong thu muc Drive rieng cua Sa Hinh.

PHIEN BAN
- Giu nguyen V2.30.
- Goi nay khong thay doi ma/du lieu cua cong cu mo phong 120 tinh huong.
