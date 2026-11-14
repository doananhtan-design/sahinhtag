SA HINH AI V2.1.25 — PHUC HOI NHAN DIEN DUNG XE BAI 02/03/10

- Bai 02, 03, 10 dung lai dung cach xac nhan cua V2.1.7:
  + TAG kiem tra phai la TAG dang duoc chon xu ly chinh (nearest-tag flow).
  + Do on dinh 1200 ms.
  + Do dich tam giua hai frame lien tiep < 12 px.
  + Do thay doi dien tich giua hai frame lien tiep < 1500.
  + Khi dat dieu kien, goi checkTarget() mot lan cho TAG do.
- Bo bo loc cua so mau 1900 ms / 15 mau va nhanh xu ly TAG kiem tra khong-phai-nearest cua V2.1.23/24.
- Bo thanh truot va thanh theo doi moi vi chung dieu khien bo loc da duoc thay the; nguong V2.1.7 duoc co dinh.
- B08/B12 van giu nhanh xu ly TAG phu khong-nearest nhu ban moi.
- B04 va cac luat bai khac khong chu dong sua.
- Cac thay doi KT auto reset, timer va audio tu ban V2.1.24 duoc giu lai.

Kiem tra: node --check app.js va unzip -t. Chua kiem thu camera/xe that.
