/**
 * SA HÌNH AI - Google Apps Script backend
 * ------------------------------------------------------------
 * Spreadsheet cần các sheet:
 *  - GIAO_VIEN: maGV | taiKhoan | matKhauHash | hoTen | quyen | trangThai | ghiChu
 *  - AUDIO_CONFIG: audio_id | audio_name | file_id | enabled | volume | version | ghiChu
 *  - SYSTEM_CONFIG: key | value
 *
 * Lần đầu chạy setupSystem() để tạo cấu trúc.
 *
 * Mật khẩu mẫu sau setup:
 *   admin / 123456
 *   gv001 / 123456
 *   gv002 / 123456
 *
 * Production: đổi toàn bộ mật khẩu mẫu.
 */

const APP = {
  NAME: 'SA HÌNH AI',
  AUDIO_FOLDER_NAME: 'SA_HINH_AI_AUDIO',
  SHEET_TEACHER: 'GIAO_VIEN',
  SHEET_AUDIO: 'AUDIO_CONFIG',
  SHEET_CONFIG: 'SYSTEM_CONFIG',
  SHEET_EXAM: 'BAI_THI_CONFIG',
  SESSION_MINUTES: 480
};

function doGet(e) {
  // mode=manage được xác định ở server vì query string có thể không còn nằm
  // trong location.search của iframe HtmlService.
  const manage = !!(e && e.parameter && String(e.parameter.mode || '').toLowerCase() === 'manage');
  const tpl = HtmlService.createTemplateFromFile('Index');
  tpl.MANAGE_MODE = manage;
  return tpl.evaluate()
    .setTitle(APP.NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* =========================
   SETUP
   ========================= */

function setupSystem() {
  const ss = SpreadsheetApp.getActive();

  const gv = getOrCreateSheet_(ss, APP.SHEET_TEACHER,
    ['maGV','taiKhoan','matKhauHash','hoTen','quyen','trangThai','ghiChu']);
  const au = getOrCreateSheet_(ss, APP.SHEET_AUDIO,
    ['audio_id','audio_name','file_id','enabled','volume','version','ghiChu']);
  const cf = getOrCreateSheet_(ss, APP.SHEET_CONFIG,
    ['key','value']);
  const ex = getOrCreateSheet_(ss, APP.SHEET_EXAM,
    ['course','event','tag','action','audio_id','error_code','error_message','ghiChu']);
  seedExamConfig_(ex);

  // Chỉ thêm mẫu nếu sheet đang trống.
  if (gv.getLastRow() < 2) {
    gv.getRange(2,1,3,7).setValues([
      ['ADMIN','admin',sha256_('123456'),'Quản trị hệ thống','ADMIN','HOAT_DONG','Đổi mật khẩu sau khi cài đặt'],
      ['GV001','gv001',sha256_('123456'),'Giáo viên Demo','GIAOVIEN','HOAT_DONG',''],
      ['GV002','gv002',sha256_('123456'),'Giáo viên 2','GIAOVIEN','HOAT_DONG','']
    ]);
  }

  const defaults = {
    AUDIO_ROOT_FOLDER_ID: '',
    AUDIO_ROOT_FOLDER_NAME: APP.AUDIO_FOLDER_NAME,
    AUDIO_VERSION: '1',
    AUTO_SYNC_AUDIO: 'TRUE',
    COMPANY_NAME: 'TRUNG TÂM ĐÀO TẠO LÁI XE',
    APP_VERSION: '1.0.0'
  };

  const existing = {};
  if (cf.getLastRow() >= 2) {
    cf.getRange(2,1,cf.getLastRow()-1,2).getValues()
      .forEach(r => existing[String(r[0])] = String(r[1]));
  }

  const rows = [];
  Object.keys(defaults).forEach(k => {
    if (!(k in existing)) rows.push([k, defaults[k]]);
  });
  if (rows.length) cf.getRange(cf.getLastRow()+1,1,rows.length,2).setValues(rows);

  [gv,au,cf].forEach(s => {
    s.setFrozenRows(1);
    s.autoResizeColumns(1, s.getLastColumn());
  });

  return {ok:true, message:'Đã tạo cấu trúc hệ thống.'};
}

/* =========================
   BOOT / CONFIG
   ========================= */

function getBootConfig() {
  ensureSystem_();
  const cfg = readConfig_();
  const audio = syncAudioConfig_();

  return {
    ok: true,
    app: APP.NAME,
    version: cfg.APP_VERSION || '1.0.0',
    autoSyncAudio: String(cfg.AUTO_SYNC_AUDIO || 'TRUE').toUpperCase() === 'TRUE',
    audioVersion: cfg.AUDIO_VERSION || '1',
    audio: audio,
    exam: readExamConfig_(),
    time: new Date().toISOString()
  };
}

/**
 * Quét thư mục SA_HINH_AI_AUDIO và các thư mục con.
 * Tên file nên bắt đầu bằng audio_id:
 *   A001_Binh_Bong.mp3
 *   A002_Tung.mp3
 *   A008_Bai_08.mp3
 */
function syncAudioConfig() {
  ensureSystem_();
  return {ok:true, audio:syncAudioConfig_()};
}

function syncAudioConfig_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(APP.SHEET_AUDIO);
  const cfg = readConfig_();

  let folderId = String(cfg.AUDIO_ROOT_FOLDER_ID || '').trim();
  let root;

  if (folderId) {
    try { root = DriveApp.getFolderById(folderId); } catch(e) { root = null; }
  }

  if (!root) {
    const it = DriveApp.getFoldersByName(String(cfg.AUDIO_ROOT_FOLDER_NAME || APP.AUDIO_FOLDER_NAME));
    if (it.hasNext()) {
      root = it.next();
      folderId = root.getId();
      setConfig_('AUDIO_ROOT_FOLDER_ID', folderId);
    }
  }

  if (!root) return readAudioSheet_();

  const found = [];
  scanAudioFolder_(root, '', found);

  // Ghi lại AUDIO_CONFIG theo file thực tế.
  const rows = [
    ['audio_id','audio_name','file_id','enabled','volume','version','ghiChu']
  ];

  found.sort((a,b) => a.audio_id.localeCompare(b.audio_id));
  found.forEach(x => rows.push([
    x.audio_id, x.audio_name, x.file_id, true, 1, String(cfg.AUDIO_VERSION || '1'),
    x.folder || ''
  ]));

  sh.clearContents();
  sh.getRange(1,1,rows.length,rows[0].length).setValues(rows);
  sh.setFrozenRows(1);

  return found.map(x => ({
    audio_id:x.audio_id,
    audio_name:x.audio_name,
    file_id:x.file_id,
    enabled:true,
    volume:1,
    version:String(cfg.AUDIO_VERSION || '1'),
    folder:x.folder || ''
  }));
}

function scanAudioFolder_(folder, relative, out) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    const name = f.getName();
    const m = name.match(/^(A\d+)[ _-](.+)$/i);
    if (!m) continue;

    const id = m[1].toUpperCase();
    const cleanName = m[2].replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim();

    out.push({
      audio_id:id,
      audio_name:cleanName || name,
      file_id:f.getId(),
      folder:relative
    });
  }

  const dirs = folder.getFolders();
  while (dirs.hasNext()) {
    const d = dirs.next();
    const child = relative ? relative + '/' + d.getName() : d.getName();
    scanAudioFolder_(d, child, out);
  }
}

function readAudioSheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(APP.SHEET_AUDIO);
  if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getValues();
  const h = v[0];
  const ix = {};
  h.forEach((x,i)=>ix[String(x)] = i);

  return v.slice(1).filter(r => r[ix.audio_id]).map(r => ({
    audio_id:String(r[ix.audio_id]),
    audio_name:String(r[ix.audio_name] || ''),
    file_id:String(r[ix.file_id] || ''),
    enabled:r[ix.enabled] !== false && String(r[ix.enabled]).toUpperCase() !== 'FALSE',
    volume:Number(r[ix.volume] || 1),
    version:String(r[ix.version] || '1'),
    folder:String(r[ix.ghiChu] || '')
  }));
}

/**
 * Trả audio dưới dạng base64.
 * Dùng cho bộ nhớ offline của PWA.
 */
function getAudioData(audioId) {
  ensureSystem_();
  const list = readAudioSheet_();
  const item = list.find(x => x.audio_id === String(audioId).toUpperCase());
  if (!item || !item.enabled || !item.file_id) {
    throw new Error('Không tìm thấy âm thanh ' + audioId);
  }

  const file = DriveApp.getFileById(item.file_id);
  const blob = file.getBlob();
  return {
    ok:true,
    audio_id:item.audio_id,
    audio_name:item.audio_name,
    mime:blob.getContentType() || 'audio/mpeg',
    version:item.version,
    base64:Utilities.base64Encode(blob.getBytes())
  };
}

/* =========================
   TEACHER LOGIN
   ========================= */

function teacherLogin(username, password) {
  ensureSystem_();
  username = String(username || '').trim();
  password = String(password || '');

  if (!username || !password) {
    return {ok:false, message:'Vui lòng nhập tài khoản và mật khẩu.'};
  }

  const sh = SpreadsheetApp.getActive().getSheetByName(APP.SHEET_TEACHER);
  const v = sh.getDataRange().getValues();
  const h = v[0];
  const ix = {};
  h.forEach((x,i)=>ix[String(x)] = i);

  for (let i=1; i<v.length; i++) {
    const r = v[i];
    if (String(r[ix.taiKhoan] || '').trim().toLowerCase() !== username.toLowerCase()) continue;

    const status = String(r[ix.trangThai] || '').trim().toUpperCase();
    if (status !== 'HOAT_DONG') {
      return {ok:false, message:'Tài khoản đang bị khóa hoặc không hoạt động.'};
    }

    const hash = String(r[ix.matKhauHash] || '');
    if (hash !== sha256_(password)) {
      return {ok:false, message:'Sai tài khoản hoặc mật khẩu.'};
    }

    const token = Utilities.getUuid();
    CacheService.getScriptCache().put('SESSION_' + token, JSON.stringify({
      maGV:String(r[ix.maGV] || ''),
      taiKhoan:String(r[ix.taiKhoan] || ''),
      hoTen:String(r[ix.hoTen] || ''),
      quyen:String(r[ix.quyen] || 'GIAOVIEN')
    }), APP.SESSION_MINUTES * 60);

    return {
      ok:true,
      token:token,
      teacher:{
        maGV:String(r[ix.maGV] || ''),
        taiKhoan:String(r[ix.taiKhoan] || ''),
        hoTen:String(r[ix.hoTen] || ''),
        quyen:String(r[ix.quyen] || 'GIAOVIEN')
      }
    };
  }

  return {ok:false, message:'Sai tài khoản hoặc mật khẩu.'};
}

function adminAutoLogin() {
  // Chế độ QUẢN LÝ: không hiển thị màn hình đăng nhập ADMIN.
  // Tạo session ADMIN tự động cho trang quản lý.
  const token = Utilities.getUuid();
  const teacher = {
    maGV: 'ADMIN',
    taiKhoan: 'admin',
    hoTen: 'Quản trị hệ thống',
    quyen: 'ADMIN'
  };
  CacheService.getScriptCache().put(
    'SESSION_' + token,
    JSON.stringify(teacher),
    APP.SESSION_MINUTES * 60
  );
  return {ok:true, token:token, teacher:teacher};
}

function validateSession(token) {
  const s = getSession_(token);
  return s ? {ok:true, teacher:s} : {ok:false, message:'Phiên đăng nhập đã hết hạn.'};
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove('SESSION_' + token);
  return {ok:true};
}

/* =========================
   ADMIN: TẠO / SỬA GIÁO VIÊN
   ========================= */

function adminCreateTeacher(token, data) {
  const session = requireAdmin_(token);
  data = data || {};

  const maGV = String(data.maGV || '').trim();
  const taiKhoan = String(data.taiKhoan || '').trim();
  const matKhau = String(data.matKhau || '');
  const hoTen = String(data.hoTen || '').trim();

  if (!maGV || !taiKhoan || !matKhau || !hoTen) {
    throw new Error('Thiếu thông tin giáo viên.');
  }

  const sh = SpreadsheetApp.getActive().getSheetByName(APP.SHEET_TEACHER);
  const v = sh.getDataRange().getValues();

  for (let i=1;i<v.length;i++) {
    if (String(v[i][0]).trim() === maGV || String(v[i][1]).trim().toLowerCase() === taiKhoan.toLowerCase()) {
      throw new Error('Mã giáo viên hoặc tài khoản đã tồn tại.');
    }
  }

  sh.appendRow([
    maGV, taiKhoan, sha256_(matKhau), hoTen,
    String(data.quyen || 'GIAOVIEN').toUpperCase(),
    'HOAT_DONG',
    String(data.ghiChu || '')
  ]);

  return {ok:true, message:'Đã tạo tài khoản ' + taiKhoan};
}

function adminListTeachers(token) {
  requireAdmin_(token);
  const sh = SpreadsheetApp.getActive().getSheetByName(APP.SHEET_TEACHER);
  const v = sh.getDataRange().getValues();
  return v.slice(1).map(r => ({
    maGV:String(r[0]||''), taiKhoan:String(r[1]||''),
    hoTen:String(r[3]||''), quyen:String(r[4]||''),
    trangThai:String(r[5]||''), ghiChu:String(r[6]||'')
  }));
}



/* =========================
   CẤU HÌNH 14 BÀI + SỰ KIỆN/LỖI
   ========================= */
function getExamConfig() {
  ensureSystem_();
  return {ok:true, exam:readExamConfig_()};
}

function seedExamConfig_(sh) {
  if (sh.getLastRow() >= 2) return;
  const rows = [
    ['B01','ANNOUNCE','1','Báo bài 01','A003','','',''],
    ['B01','START','111','Vào bài','A001','','','Khóa TAG 01 trong 20 giây'],
    ['B02','ANNOUNCE','2','Báo bài 02','A004','','',''],
    ['B02','START','21','Vào bài','A001','','',''],
    ['B02','END','22','Kết thúc/kiểm tra','A002','','',''],
    ['B03','ANNOUNCE','3','Báo bài 03','A005','','',''],
    ['B03','START','31','Vào bài','A001','','',''],
    ['B03','END','32','Kết thúc/kiểm tra','A002','','',''],
    ['B04','ANNOUNCE','4','Báo bài 04','A006','','',''],
    ['B04','START','41','Vào bài','A001','','',''],
    ['B04','END','42','Kết thúc','A002','','',''],
    ['B05','ANNOUNCE','5','Báo bài 05','A007','','',''],
    ['B05','START','51','Vào bài','A001','','',''],
    ['B06','ANNOUNCE','6','Báo bài 06','A008','','',''],
    ['B06','START','61','Vào bài','A001','','',''],
    ['B06','END','62','Kết thúc','A002','','',''],
    ['B07','ANNOUNCE','7','Báo bài 07','A009','','',''],
    ['B07','START','71','Vào bài','A001','','',''],
    ['B08','ANNOUNCE','8','Báo bài 08','A008','','',''],
    ['B08','ENTER_FIRST','81','Vào bài - bính bong','A001','','','Bắt đầu 120 giây'],
    ['B08','POSITION','82','Xác nhận vị trí - tùng','A002','','','Không dừng timer'],
    ['B08','EXIT_SECOND','81','Ra bài - báo B09','A009','','','Chỉ tính khi TAG 81 đã mất rồi xuất hiện lại'],
    ['B08','TIMEOUT','120','Quá thời gian 1 bài thi','A020','TIMEOUT_B08','Quá 120 giây ở B08','Không trừ điểm'],
    ['B09','ANNOUNCE','9','Báo bài 09','A010','','',''],
    ['B09','START','91','Vào bài','A001','','',''],
    ['B10','ANNOUNCE','10','Báo bài 10','A011','','',''],
    ['B10','START','101','Vào bài','A001','','',''],
    ['B10','END','102','Kết thúc/kiểm tra','A002','','',''],
    ['B11','ANNOUNCE','11','Báo bài 11','A012','','',''],
    ['B11','START','112','Vào bài','A001','','',''],
    ['B11','END','113','Kết thúc','A002','','',''],
    ['B12','ANNOUNCE','12','Báo bài 12','A012','','',''],
    ['B12','ENTER_FIRST','121','Vào bài - bính bong','A001','','','Bắt đầu 120 giây'],
    ['B12','POSITION','TBD','Xác nhận vị trí - tùng','A002','CONFIG_B12_END_TAG','Chưa chốt TAG kết thúc B12','Cần thay TBD bằng TAG thực tế'],
    ['B12','EXIT_SECOND','121','Ra bài - báo B13','A013','','','Chỉ tính khi TAG 121 đã mất rồi xuất hiện lại'],
    ['B12','TIMEOUT','120','Quá thời gian 1 bài thi','A020','TIMEOUT_B12','Quá 120 giây ở B12','Không trừ điểm'],
    ['B13','ANNOUNCE','13','Báo bài 13','A013','','',''],
    ['B13','START','131','Vào bài','A001','','',''],
    ['KT','ANNOUNCE','14','Báo bài kiểm tra','A014','','',''],
    ['KT','START','141','Vào kiểm tra','A001','','','Mốc cuối của tổng thời gian 18 phút'],
    ['ALL','TOTAL_TIMER','','Tổng thời gian','A021','TOTAL_TIMEOUT','Quá 18 phút mà chưa vào TAG 141','Không trừ điểm'],
    ['ALL','ANTI_JUMP','','Chống nhảy bài','','WRONG_SEQUENCE','TAG không đúng bài kế tiếp','Không cho chuyển bài; ghi nhận lỗi'],
    ['ALL','TAG_LOST','','Mất TAG','','TAG_LOST','TAG bị mất trước khi đủ điều kiện ổn định','Không chốt sự kiện'],
    ['ALL','TAG_UNSTABLE','','TAG không ổn định','','TAG_UNSTABLE','TAG chưa ổn định đủ thời gian','Tiếp tục chờ'],
    ['ALL','CAMERA','','Camera lỗi','','CAMERA_ERROR','Không đọc được camera/khung hình','Dừng engine và báo giáo viên']
  ];
  sh.getRange(2,1,rows.length,8).setValues(rows);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1,8);
}

function readExamConfig_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(APP.SHEET_EXAM);
  if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getValues();
  const h = v[0]; const ix={}; h.forEach((x,i)=>ix[String(x)]=i);
  return v.slice(1).filter(r=>String(r[ix.course]||'').trim()).map(r=>(
    {course:String(r[ix.course]||''),event:String(r[ix.event]||''),tag:String(r[ix.tag]||''),action:String(r[ix.action]||''),audio_id:String(r[ix.audio_id]||''),error_code:String(r[ix.error_code]||''),error_message:String(r[ix.error_message]||''),ghiChu:String(r[ix.ghiChu]||'')}
  ));
}

/* =========================
   HELPERS
   ========================= */

function ensureSystem_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(APP.SHEET_TEACHER) ||
      !ss.getSheetByName(APP.SHEET_AUDIO) ||
      !ss.getSheetByName(APP.SHEET_CONFIG) ||
      !ss.getSheetByName(APP.SHEET_EXAM)) {
    setupSystem();
  }
}

function getOrCreateSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  return sh;
}

function readConfig_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(APP.SHEET_CONFIG);
  const out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2,1,sh.getLastRow()-1,2).getValues().forEach(r => {
    if (r[0]) out[String(r[0]).trim()] = String(r[1] == null ? '' : r[1]).trim();
  });
  return out;
}

function setConfig_(key,value) {
  const sh = SpreadsheetApp.getActive().getSheetByName(APP.SHEET_CONFIG);
  const v = sh.getDataRange().getValues();
  for (let i=1;i<v.length;i++) {
    if (String(v[i][0]).trim() === key) {
      sh.getRange(i+1,2).setValue(value);
      return;
    }
  }
  sh.appendRow([key,value]);
}

function getSession_(token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get('SESSION_' + token);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

function requireAdmin_(token) {
  const s = getSession_(token);
  if (!s) throw new Error('Phiên đăng nhập hết hạn.');
  if (String(s.quyen).toUpperCase() !== 'ADMIN') throw new Error('Chỉ ADMIN được thực hiện thao tác này.');
  return s;
}

function sha256_(text) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text),
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => {
    const x = (b < 0 ? b + 256 : b).toString(16);
    return x.length === 1 ? '0' + x : x;
  }).join('');
}

/** API cho PWA GitHub Pages: chỉ dùng để kiểm tra đăng nhập giáo viên. */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = String(body.action || '').toLowerCase();
    if (action === 'login') {
      var result = teacherLogin(String(body.username || ''), String(body.password || ''));
      return ContentService
        .createTextOutput(JSON.stringify({ok:true, data:result}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ok:false, error:'ACTION_KHONG_HOP_LE'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ok:false, error:String(err && err.message || err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
