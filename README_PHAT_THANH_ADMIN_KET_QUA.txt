SA HINH AI V3.1 - PHAT THANH MP3 DONG BO LOI VI PHAM

1. Trang AdminKetQua la may phat thanh trung tam, may thi chi gui su kien len Apps Script.
2. Chon thu muc audio tren may phat (thu muc chua sbd.mp3, 0.mp3-9.mp3, batdau.mp3, thidat.mp3, thitruot.mp3 va cac thu muc b01-b13, KT, THKC).
3. Bam THU PHAT MP3 de kiem tra SBD 09 va batdau.mp3; sau do bam BAT PHAT THANH.
4. Khi bat dau thi: sbd.mp3 -> cac file so theo SBD -> batdau.mp3.
5. Khi thi dat/truot: sbd.mp3 -> cac file so -> thidat.mp3/thitruot.mp3.
6. Khi vi pham: sbd.mp3 -> cac file so -> file loi tuong ung bai thi (audioPath duoc server xac dinh tu event).
7. Phat thanh dung hang doi, khong chong tieng. Da tat hoan toan SpeechSynthesis/TTS.
8. Loi khong co MP3 rieng trong thu vien se khong bi gan nham file; ket qua truot van duoc phat bang thitruot.mp3.
9. Trinh duyet can chon lai thu muc audio moi khi mo tab phat thanh moi. Khong tu dong truy cap file tren may tinh khi chua duoc ADMIN cap quyen.
10. Cap nhat Code.gs va AdminKetQua.html trong Apps Script, giu nguyen app.js/index.html va cac file PWA khac. Sau do Deploy > Manage deployments > Edit > New version.

MAP LOI DANG HO TRO:
- B01_TAG_111_TIMEOUT -> audio/b01/qua30s.mp3
- B03_TIMEOUT_30S -> audio/b03/qua30s.mp3
- B03_ROLLBACK -> audio/b03/tutdoc.mp3
- POSITION_COMPARE -> audio/<bai>/quavitri.mp3 hoac chuaden.mp3 theo ket qua
- SPEED_RESULT thap hon nguong -> audio/b11/thieutoc.mp3
- TIMED_WARNING_ONLY / POSITION_RULE_120S_TIMEOUT -> audio/<bai>/quatg1.mp3
- OFFICIAL_WRONG_SEQUENCE -> audio/THKC/saiquytrinh.mp3
- B08/B12 khong ghep xe: thu vien hien tai khong co file loi rieng; he thong phat SBD va thong bao ket qua truot, khong gan nham MP3.
