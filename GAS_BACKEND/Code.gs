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
  VERSION: 'V3.1',
  AUDIO_FOLDER_NAME: 'SA_HINH_AI_AUDIO',
  SHEET_TEACHER: 'GIAO_VIEN',
  SHEET_AUDIO: 'AUDIO_CONFIG',
  SHEET_CONFIG: 'SYSTEM_CONFIG',
  SHEET_EXAM: 'BAI_THI_CONFIG',
  // Phiên giáo viên chỉ hết hiệu lực khi sang ngày mới.
};

function doGet(e) {
  // PWA, giao diện quản trị cũ và trang kết quả dùng chung backend.
  var mode = String(e && e.parameter && e.parameter.mode || '').toLowerCase();
  if (mode === 'results') {
    return HtmlService.createHtmlOutputFromFile('AdminKetQua')
      .setTitle('Quản lý kết quả thi Sa Hình AI')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var manage = mode === 'manage';
  var tpl = HtmlService.createTemplateFromFile('Index');
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
    APP_VERSION: 'V3.1'
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

function todayKey_() {
  const tz = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
}

function normalizeHeader_(v) {
  return String(v == null ? '' : v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/Đ/g,'D')
    .toLowerCase().replace(/[^a-z0-9]/g,'');
}

function findHeaderIndex_(headers, aliases) {
  const map = {};
  (headers || []).forEach((h,i)=>{ map[normalizeHeader_(h)] = i; });
  for (const a of aliases) {
    const idx = map[normalizeHeader_(a)];
    if (idx !== undefined) return idx;
  }
  return -1;
}

function teacherSheetSchema_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(APP.SHEET_TEACHER);
  if (!sh) return null;
  const v = sh.getDataRange().getValues();
  const h = v[0] || [];
  return {
    sh, v,
    maGV: findHeaderIndex_(h,['maGV','Mã GV','Mã giáo viên','id']),
    taiKhoan: findHeaderIndex_(h,['taiKhoan','Tài khoản','Tên đăng nhập','username','user','sdt','Số điện thoại']),
    matKhauHash: findHeaderIndex_(h,['matKhauHash','Mật khẩu hash','passwordhash','hashedpassword']),
    matKhauPlain: findHeaderIndex_(h,['matKhau','Mật khẩu','password','pass']),
    hoTen: findHeaderIndex_(h,['hoTen','Họ tên','Họ và tên','fullname','name']),
    quyen: findHeaderIndex_(h,['quyen','Quyền','role']),
    trangThai: findHeaderIndex_(h,['trangThai','Trạng thái','status','state']),
    ghiChu: findHeaderIndex_(h,['ghiChu','Ghi chú','note'])
  };
}

function teacherRowByAccount_(username) {
  const schema = teacherSheetSchema_();
  if (!schema) return null;
  const q = String(username || '').trim().toLowerCase();
  if (!q) return null;
  for (let i=1;i<schema.v.length;i++) {
    const r=schema.v[i];
    const account = schema.taiKhoan >= 0 ? String(r[schema.taiKhoan] == null ? '' : r[schema.taiKhoan]).trim().toLowerCase() : '';
    const maGV = schema.maGV >= 0 ? String(r[schema.maGV] == null ? '' : r[schema.maGV]).trim().toLowerCase() : '';
    if (q!==account && q!==maGV) continue;
    const statusRaw = schema.trangThai >= 0 ? String(r[schema.trangThai] == null ? '' : r[schema.trangThai]).trim().toUpperCase() : 'HOAT_DONG';
    const hash = schema.matKhauHash >= 0 ? String(r[schema.matKhauHash] == null ? '' : r[schema.matKhauHash]).trim() : '';
    const plain = schema.matKhauPlain >= 0 && schema.matKhauPlain !== schema.matKhauHash
      ? String(r[schema.matKhauPlain] == null ? '' : r[schema.matKhauPlain])
      : '';
    return {
      rowNumber:i+1,
      maGV:schema.maGV >= 0 ? String(r[schema.maGV] == null ? '' : r[schema.maGV]).trim() : '',
      taiKhoan:account ? String(r[schema.taiKhoan] == null ? '' : r[schema.taiKhoan]).trim() : (maGV ? String(r[schema.maGV] == null ? '' : r[schema.maGV]).trim() : ''),
      hoTen:schema.hoTen >= 0 ? String(r[schema.hoTen] == null ? '' : r[schema.hoTen]).trim() : '',
      quyen:schema.quyen >= 0 ? String(r[schema.quyen] == null ? '' : r[schema.quyen]).trim().toUpperCase() || 'GIAOVIEN' : 'GIAOVIEN',
      trangThai:statusRaw || 'HOAT_DONG',
      matKhauHash:hash,
      matKhauPlain:plain,
      _schema:schema
    };
  }
  return null;
}

function putSession_(token, data) {
  PropertiesService.getScriptProperties().setProperty('SESSION_' + token, JSON.stringify(data));
}

function removeSession_(token) {
  if (token) PropertiesService.getScriptProperties().deleteProperty('SESSION_' + token);
}

function activeSessionKey_(username) {
  const normalized = String(username || '').trim().toLowerCase();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalized, Utilities.Charset.UTF_8);
  const hex = digest.map(b => { const x = b < 0 ? b + 256 : b; return ('0' + x.toString(16)).slice(-2); }).join('');
  return 'ACTIVE_TEACHER_SESSION_' + hex;
}

function teacherLogin(username, password) {
  ensureSystem_();
  username = String(username || '').trim();
  password = String(password || '');
  if (!username || !password) return {ok:false, message:'Vui lòng nhập tài khoản và mật khẩu.'};

  const row = teacherRowByAccount_(username);
  if (!row) return {ok:false, code:'ACCOUNT_NOT_FOUND', message:'Không tìm thấy tài khoản giáo viên. Vui lòng kiểm tra lại tài khoản.'};
  if (row.trangThai !== 'HOAT_DONG') return {ok:false, code:'ACCOUNT_LOCKED', message:'Tài khoản đã bị khóa. Vui lòng liên hệ ADMIN (0914.531.591).'};

  const suppliedHash = sha256_(password).toLowerCase();
  const storedHash = String(row.matKhauHash || '').replace(/^sha256:/i,'').trim().toLowerCase();
  let passwordOk = false;

  // 1) Nếu có cột hash: so sánh SHA-256.
  if (storedHash && isSha256Hex_(storedHash)) {
    passwordOk = storedHash === suppliedHash;
  }

  // 2) Nếu sheet hiện tại của trung tâm dùng cột 'matKhau':
  //    - cho phép mật khẩu plain-text hiện tại (ví dụ 123456);
  //    - nếu ô đã được nâng cấp thành SHA-256 thì cũng chấp nhận.
  if (!passwordOk && row.matKhauPlain) {
    const storedCredential = String(row.matKhauPlain).trim();
    if (isSha256Hex_(storedCredential)) {
      passwordOk = storedCredential.toLowerCase() === suppliedHash;
    } else {
      passwordOk = storedCredential === password;
      if (passwordOk) {
        // Nâng cấp tự động từ mật khẩu plain-text sang SHA-256.
        // Header vẫn giữ nguyên 'matKhau', nên các tài khoản cũ không cần sửa thủ công.
        const sh = row._schema.sh;
        if (row._schema.matKhauHash >= 0) {
          sh.getRange(row.rowNumber, row._schema.matKhauHash + 1).setValue(suppliedHash);
        } else if (row._schema.matKhauPlain >= 0) {
          sh.getRange(row.rowNumber, row._schema.matKhauPlain + 1).setValue(suppliedHash);
        }
      }
    }
  }

  if (!passwordOk) return {ok:false, code:'PASSWORD_INVALID', message:'Sai mật khẩu. Vui lòng kiểm tra lại mật khẩu.'};

  // Mỗi tài khoản chỉ có một token hoạt động. Đăng nhập trên điện thoại khác
  // sẽ thu hồi token trước đó; khóa để tránh hai lần đăng nhập đồng thời cùng thắng.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getScriptProperties();
    const activeKey = activeSessionKey_(row.taiKhoan);
    const previousToken = props.getProperty(activeKey);
    if (previousToken) removeSession_(previousToken);
    const now=Date.now(), token=Utilities.getUuid();
    const session={
      maGV:row.maGV,taiKhoan:row.taiKhoan,hoTen:row.hoTen,quyen:row.quyen,
      loginAt:now,dayKey:todayKey_()
    };
    putSession_(token,session);
    props.setProperty(activeKey,token);
    return {ok:true,token,teacher:{maGV:row.maGV,taiKhoan:row.taiKhoan,hoTen:row.hoTen,quyen:row.quyen},
      loginAt:session.loginAt,dayKey:session.dayKey};
  } finally { lock.releaseLock(); }
}

function adminAutoLogin() {
  const token=Utilities.getUuid(), now=Date.now(), dayKey=todayKey_();
  const teacher={maGV:'ADMIN',taiKhoan:'admin',hoTen:'Quản trị hệ thống',quyen:'ADMIN'};
  putSession_(token,{...teacher,loginAt:now,dayKey});
  return {ok:true,token,teacher,loginAt:now,dayKey};
}

function validateSession(token) {
  token=String(token||'').trim();
  if (!token) return {ok:false,message:'Thiếu mã phiên đăng nhập.'};
  const s=getSession_(token);
  if (!s) return {ok:false,message:'Phiên đăng nhập đã hết hạn hoặc không tồn tại.'};
  if (String(s.quyen||'').toUpperCase() !== 'ADMIN') {
    const activeToken = PropertiesService.getScriptProperties().getProperty(activeSessionKey_(s.taiKhoan));
    if (activeToken !== token) { removeSession_(token); return {ok:false,code:'SESSION_REPLACED',message:'Tài khoản này đã đăng nhập trên thiết bị khác. Phiên trên thiết bị này đã bị đăng xuất.'}; }
  }
  if (String(s.dayKey||'')!==todayKey_()) {removeSession_(token);return {ok:false,code:'NEW_DAY',message:'Đã sang ngày mới. Vui lòng đăng nhập lại.'};}
  if (String(s.quyen||'').toUpperCase()!=='ADMIN') {
    const row=teacherRowByAccount_(s.taiKhoan);
    if (!row || row.trangThai!=='HOAT_DONG') {removeSession_(token);return {ok:false,code:'ACCOUNT_LOCKED',message:'Tài khoản đã bị khóa. Vui lòng liên hệ ADMIN (0914.531.591).'};}
  }
  return {ok:true,teacher:{maGV:String(s.maGV||''),taiKhoan:String(s.taiKhoan||''),hoTen:String(s.hoTen||''),quyen:String(s.quyen||'GIAOVIEN')},
    loginAt:Number(s.loginAt||0),dayKey:String(s.dayKey||'')};
}

function logout(token) {
  token=String(token||'').trim();
  const s=getSession_(token);
  if (s && String(s.quyen||'').toUpperCase() !== 'ADMIN') {
    const props=PropertiesService.getScriptProperties(), key=activeSessionKey_(s.taiKhoan);
    if (props.getProperty(key) === token) props.deleteProperty(key);
  }
  removeSession_(token);
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
  const raw=PropertiesService.getScriptProperties().getProperty('SESSION_' + token);
  if (!raw) return null;
  try {
    const s=JSON.parse(raw);
    if (!s) {removeSession_(token);return null;}
    if (String(s.dayKey||'') !== todayKey_()) {removeSession_(token);return null;}
    return s;
  } catch(e) { removeSession_(token); return null; }
}

function requireAdmin_(token) {
  const s = getSession_(token);
  if (!s) throw new Error('Phiên đăng nhập hết hạn.');
  if (String(s.quyen).toUpperCase() !== 'ADMIN') throw new Error('Chỉ ADMIN được thực hiện thao tác này.');
  return s;
}

function isSha256Hex_(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || '').trim());
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



/* ===== THI SA HÌNH: khóa lượt thi phía máy chủ =====
 * Sheet DANH_SACH_HOC_VIEN: SBD | CCCD | Họ và Tên | Ngày sinh | Hạng Thi | Khóa học | Kỳ kiểm tra ngày | Trạng thái (cho phép thi) | TRANG_THAI_THI (trạng thái lượt thi)
 * Sheet KET_QUA_THI_SA_HINH: MA_LUOT_THI | SBD | HO_TEN | CCCD | GIAO_VIEN | BAT_DAU | KET_THUC | KET_QUA | CHI_TIET_JSON
 */
function examEnsureSheets_(){
  var ss=SpreadsheetApp.getActive();
  var roster=ss.getSheetByName('DANH_SACH_HOC_VIEN');
  if(!roster) roster=ss.insertSheet('DANH_SACH_HOC_VIEN');
  if(roster.getLastRow()===0) roster.appendRow(['SBD','HO_TEN','CCCD','TRANG_THAI_THI','CAP_NHAT_LUC','CAP_NHAT_BOI']);
  var head=roster.getLastRow()>0?roster.getRange(1,1,1,roster.getLastColumn()).getDisplayValues()[0].map(examNormalizeHeader_):[];
  if(head.indexOf('TRANGTHAITHI')<0){roster.getRange(1,roster.getLastColumn()+1).setValue('TRANG_THAI_THI');}
  var results=ss.getSheetByName('KET_QUA_THI_SA_HINH');
  if(!results) results=ss.insertSheet('KET_QUA_THI_SA_HINH');
  if(results.getLastRow()===0) results.appendRow(['MA_LUOT_THI','SBD','HO_TEN','CCCD','GIAO_VIEN','BAT_DAU','KET_THUC','KET_QUA','CHI_TIET_JSON']);
  return {roster:roster,results:results};
}
function examSession_(token){
  var t=String(token||'').trim(); if(!t)return null;
  var v=validateSession(t); if(!v||!v.ok)return null;
  var s=getSession_(t); return s||null;
}
function examNormalizeHeader_(value){
  return String(value||'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/[^A-Z0-9]/g,'');
}
function examHeaders_(sh){
  var n=Math.max(1,sh.getLastColumn()); return sh.getRange(1,1,1,n).getDisplayValues()[0].map(examNormalizeHeader_);
}
function examCol_(headers,names){var normalized=names.map(examNormalizeHeader_);for(var i=0;i<headers.length;i++)if(normalized.indexOf(headers[i])>=0)return i;return -1;}
function examFindStudent_(sbd){
  var sh=examEnsureSheets_().roster, h=examHeaders_(sh), cS=examCol_(h,['SBD','Số báo danh','MAHOCVIEN']), cN=examCol_(h,['Họ và Tên','Họ tên','Tên học viên','Tên']), cC=examCol_(h,['CCCD','Số CCCD','Số căn cước','CMND']), cDOB=examCol_(h,['Ngày sinh','Ngày tháng năm sinh','DOB','DateOfBirth']), cCourse=examCol_(h,['Khóa học','Khoa','Course']), cT=examCol_(h,['TRANG_THAI_THI']), cPhoto=examCol_(h,['ANH_FILE_ID','PHOTO_FILE_ID','HINH_ANH_FILE_ID','ANH_CHAN_DUNG_FILE_ID','ANH_HOC_VIEN_FILE_ID','ANH_DAI_DIEN_FILE_ID','AVATAR_FILE_ID','IMAGE_FILE_ID','PHOTO_ID','AVATAR','PHOTO','HINH_ANH','ANH']);
  var cPermission=examCol_(h,['Trạng thái','Trạng thái học viên','Quyền thi']);
  if(cS<0)return {error:'Thiếu cột SBD (hoặc CCCD) trong sheet DANH_SACH_HOC_VIEN.'};
  if(sh.getLastRow()<2)return {error:'Sheet DANH_SACH_HOC_VIEN chưa có dữ liệu học viên.'};
  var rows=sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues(), key=String(sbd||'').trim().toUpperCase();
  for(var i=0;i<rows.length;i++)if(String(rows[i][cS]||'').trim().toUpperCase()===key){return {sh:sh,row:i+2,sbd:String(rows[i][cS]||''),hoTen:cN>=0?String(rows[i][cN]||''):'',cccd:cC>=0?String(rows[i][cC]||''):'',ngaySinh:cDOB>=0?String(rows[i][cDOB]||''):'',khoaHoc:cCourse>=0?String(rows[i][cCourse]||''):'',status:cT>=0?examNormalizeHeader_(String(rows[i][cT]||'CHUA THI')):'CHUATHI',permission:cPermission>=0?String(rows[i][cPermission]||'').trim():'',photoFileId:cPhoto>=0?examNormalizeDriveFileId_(rows[i][cPhoto]):'',statusCol:cT,headers:h};}
  return null;
}

function examNormalizeDriveFileId_(value){
  var s=String(value||'').trim(); if(!s)return '';
  var m=s.match(/\/file\/d\/([A-Za-z0-9_-]+)/); if(m)return m[1];
  m=s.match(/[?&]id=([A-Za-z0-9_-]+)/); if(m)return m[1];
  return s;
}
function examPhotoDataUri_(fileId){
  fileId=examNormalizeDriveFileId_(fileId); if(!fileId)return '';
  try{
    var f=DriveApp.getFileById(fileId), blob=f.getBlob();
    var mime=String(f.getMimeType()||blob.getContentType()||'').toLowerCase();
    if(mime==='image/jpg')mime='image/jpeg';
    if(mime!=='image/jpeg'&&mime!=='image/png'&&mime!=='image/webp'){
      var name=String(f.getName()||'').toLowerCase();
      if(/\.jpe?g$/.test(name))mime='image/jpeg';
      else if(/\.png$/.test(name))mime='image/png';
      else if(/\.webp$/.test(name))mime='image/webp';
      else return '';
    }
    var bytes=blob.getBytes(); if(bytes.length>1800000)return '';
    return 'data:'+mime+';base64,'+Utilities.base64Encode(bytes);
  }catch(e){return '';}
}

function examLookupStudent_(token,sbd){
  if(!examSession_(token))return {ok:false,message:'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'};
  var st=examFindStudent_(sbd); if(!st)return {ok:false,message:'Không tìm thấy học viên theo số báo danh.'}; if(st.error)return {ok:false,message:st.error};
  var studentInfo={sbd:st.sbd,hoTen:st.hoTen,cccd:st.cccd,ngaySinh:st.ngaySinh,khoaHoc:st.khoaHoc,status:st.status==='CHUATHI'?'CHUA THI':st.status,permission:st.permission,photoData:examPhotoDataUri_(st.photoFileId)};
  if(st.permission && examNormalizeHeader_(st.permission)!=='CHOPHEPTHI' && examNormalizeHeader_(st.permission)!=='DUOCPHEPTHI')return {ok:false,code:'NOT_ALLOWED',message:'Học viên chưa được cho phép thi theo cột Trạng thái.',student:studentInfo};
  if(st.status==='DATHI'||st.status==='DANGTHI')return {ok:false,code:st.status==='DANGTHI'?'EXAM_IN_PROGRESS':'ALREADY_TAKEN',message:st.status.indexOf('DANG')===0?'Học viên đang có lượt thi chưa kết thúc. Liên hệ ADMIN nếu lượt thi bị gián đoạn.':'Học viên đã thi. Chỉ ADMIN mới được mở khóa.',student:studentInfo};
  return {ok:true,student:studentInfo};
}
function examBegin_(token,sbd){
  var sess=examSession_(token); if(!sess)return {ok:false,message:'Phiên đăng nhập không hợp lệ.'};
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    var st=examFindStudent_(sbd);if(!st)return {ok:false,message:'Không tìm thấy học viên.'};if(st.error)return {ok:false,message:st.error};
    if(st.status==='DATHI'||st.status==='DANGTHI')return {ok:false,code:'STUDENT_LOCKED',message:st.status==='DANGTHI'?'Học viên đang có lượt thi chưa kết thúc. Liên hệ ADMIN.':'Học viên đã thi. Chỉ ADMIN mới được mở khóa.'};
    var headers=st.headers, cT=st.statusCol;
    if(cT<0){cT=headers.length;st.sh.getRange(1,cT+1).setValue('TRANG_THAI_THI');}
    var examId=Utilities.getUuid(), now=new Date();
    st.sh.getRange(st.row,cT+1).setValue('DANG THI');
    var cAt2=examCol_(headers,['CAPNHATLUC']);if(cAt2>=0)st.sh.getRange(st.row,cAt2+1).setValue(now);
    var resultSheet=examEnsureSheets_().results;resultSheet.appendRow([examId,st.sbd,st.hoTen,st.cccd,sess.taiKhoan,now,'','DANG THI - DANG CAP NHAT',JSON.stringify({photoFileId:st.photoFileId||''})]);
    PropertiesService.getScriptProperties().setProperty('EXAM_ACTIVE_'+examId,JSON.stringify({sbd:st.sbd,hoTen:st.hoTen,teacher:sess.taiKhoan,startedAt:now.toISOString(),status:'RUNNING',photoFileId:st.photoFileId||''}));
    examQueueAnnouncement_(examId,st.sbd,st.hoTen,'THI_BAT_DAU',examAnnouncementEventText_('THI_BAT_DAU',{sbd:st.sbd,hoTen:st.hoTen}),'START_'+examId);
    return {ok:true,examId:examId,student:{sbd:st.sbd,hoTen:st.hoTen,cccd:st.cccd},startedAt:now.toISOString()};
  }finally{lock.releaseLock();}
}
function examEventKey_(ev){
  if(!ev)return '';
  if(ev.eventId)return String(ev.eventId);
  return [ev.at||ev.time||ev.timestamp||'',ev.type||ev.event||ev.code||'',ev.course||ev.bai||'',ev.tag||ev.checkTag||'',ev.result||'',ev.message||ev.faultText||''].join('|');
}
function examMergeEvents_(oldEvents,newEvents){
  var map={},out=[];
  (Array.isArray(oldEvents)?oldEvents:[]).concat(Array.isArray(newEvents)?newEvents:[]).forEach(function(ev){
    if(!ev||typeof ev!=='object')return;
    var key=examEventKey_(ev);if(!key)return;
    if(!map[key]){map[key]=true;out.push(ev);}else{
      // Incoming copies may contain richer scoring/error metadata; merge without losing earlier fields.
      for(var i=0;i<out.length;i++){if(examEventKey_(out[i])===key){out[i]=Object.assign({},out[i],ev);break;}}
    }
  });
  return out.slice(-500);
}
function examMergeDetail_(oldDetail,newDetail){
  oldDetail=oldDetail&&typeof oldDetail==='object'?oldDetail:{};
  newDetail=newDetail&&typeof newDetail==='object'?newDetail:{};
  var merged=Object.assign({},oldDetail,newDetail);
  merged.events=examMergeEvents_(oldDetail.events,newDetail.events);
  if(oldDetail.directFail && !newDetail.directFail)merged.directFail=true;
  if(oldDetail.directFailReason && !newDetail.directFailReason)merged.directFailReason=oldDetail.directFailReason;
  if(oldDetail.directFailCourse && !newDetail.directFailCourse)merged.directFailCourse=oldDetail.directFailCourse;
  merged.lastUpdate=newDetail.lastUpdate||new Date().toISOString();
  return merged;
}
function examSerializeDetail_(detail){
  var copy=JSON.parse(JSON.stringify(detail||{}));
  var json=JSON.stringify(copy);
  while(json.length>45000 && Array.isArray(copy.events) && copy.events.length>1){copy.events.shift();copy.eventsTruncated=true;json=JSON.stringify(copy);}
  if(json.length>45000){
    // Keep a valid JSON object instead of truncating JSON mid-string.
    copy={result:copy.result||'',score:copy.score, directFail:!!copy.directFail,
      directFailReason:copy.directFailReason||'',directFailCourse:copy.directFailCourse||'',
      events:(copy.events||[]).slice(-20),eventsTruncated:true,
      detailWarning:'CHI_TIET_JSON vượt giới hạn ô tính; đã giữ các sự kiện gần nhất.'};
    json=JSON.stringify(copy);
  }
  return json;
}
function examFindResultRow_(sh,examId){
  if(sh.getLastRow()<2)return -1;
  var ids=sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues();
  for(var i=0;i<ids.length;i++)if(String(ids[i][0])===String(examId))return i+2;
  return -1;
}
function examComplete_(token,examId,detail){
  var sess=examSession_(token);if(!sess)return {ok:false,message:'Phiên đăng nhập không hợp lệ.'};
  var props=PropertiesService.getScriptProperties(),key='EXAM_ACTIVE_'+String(examId||''),raw=props.getProperty(key);if(!raw)return {ok:false,message:'Không tìm thấy lượt thi đang hoạt động.'};
  var active=JSON.parse(raw);if(active.teacher!==sess.taiKhoan)return {ok:false,message:'Lượt thi không thuộc giáo viên hiện tại.'};if(active.status==='COMPLETED')return {ok:true,duplicate:true};
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    // Re-read active state after obtaining lock.
    raw=props.getProperty(key);active=raw?JSON.parse(raw):null;if(!active)return {ok:false,message:'Không tìm thấy lượt thi đang hoạt động.'};if(active.teacher!==sess.taiKhoan)return {ok:false,message:'Lượt thi không thuộc giáo viên hiện tại.'};if(active.status==='COMPLETED')return {ok:true,duplicate:true};
    var st=examFindStudent_(active.sbd);if(!st)return {ok:false,message:'Không tìm thấy học viên khi lưu kết quả.'};
    var sh=examEnsureSheets_().results,end=new Date(),result=detail||{},resultRow=examFindResultRow_(sh,examId),oldDetail={};
    if(resultRow>0){try{oldDetail=JSON.parse(sh.getRange(resultRow,9).getValue()||'{}');}catch(e){oldDetail={};}}
    var merged=examMergeDetail_(oldDetail,result);
    merged.result=String(result.result||merged.result||'HOAN_THANH');
    merged.completedAt=result.completedAt||end.toISOString();
    if(String(merged.result).toUpperCase()==='LOAI_TRUC_TIEP'){
      merged.directFail=true;
      merged.directFailReason=merged.directFailReason||result.reason||result.directFailReason||'Lỗi loại trực tiếp';
      merged.directFailCourse=merged.directFailCourse||result.course||'';
      merged.score=0;
    }
    var outcome=String(merged.result).toUpperCase()==='LOAI_TRUC_TIEP'?'KHONG DAT - LOAI TRUC TIEP':(result.result||'HOAN_THANH');
    var json=examSerializeDetail_(merged);
    if(resultRow<0){sh.appendRow([examId,st.sbd,st.hoTen,st.cccd,sess.taiKhoan,active.startedAt,end,outcome,json]);}
    else{sh.getRange(resultRow,6,1,4).setValues([[sh.getRange(resultRow,6).getValue()||active.startedAt,end,outcome,json]]);}
    var cT=st.statusCol;if(cT<0){cT=st.headers.length;st.sh.getRange(1,cT+1).setValue('TRANG_THAI_THI');}
    st.sh.getRange(st.row,cT+1).setValue('DA THI');
    var cAt=examCol_(st.headers,['CAPNHATLUC']);if(cAt>=0)st.sh.getRange(st.row,cAt+1).setValue(end);
    var cBy=examCol_(st.headers,['CAPNHATBOI']);if(cBy>=0)st.sh.getRange(st.row,cBy+1).setValue(sess.taiKhoan);
    active.status='COMPLETED';active.completedAt=end.toISOString();props.setProperty(key,JSON.stringify(active));
    // Ket qua cuoi chi phat mot lan. Neu da phat truot tuc thoi khi diem xuong duoi 80 thi khong lap lai.
    var passed=!merged.directFail && Number(merged.score||0)>=80;
    var announceType=passed?'THI_DAT':'THI_TRUOT';
    examQueueAnnouncement_(examId,st.sbd,st.hoTen,announceType,examAnnouncementEventText_(announceType,{sbd:st.sbd,hoTen:st.hoTen,score:merged.score}), 'RESULT_'+examId);
    return {ok:true,status:'DA THI',eventsSaved:(merged.events||[]).length,directFail:!!merged.directFail};
  }finally{lock.releaseLock();}
}
function examProgress_(token,examId,detail){
  var sess=examSession_(token);if(!sess)return {ok:false,message:'Phiên đăng nhập không hợp lệ.'};
  var props=PropertiesService.getScriptProperties(),key='EXAM_ACTIVE_'+String(examId||''),raw=props.getProperty(key);
  if(!raw)return {ok:false,message:'Không tìm thấy lượt thi đang hoạt động.'};
  var active=JSON.parse(raw);if(active.teacher!==sess.taiKhoan)return {ok:false,message:'Lượt thi không thuộc giáo viên hiện tại.'};
  if(active.status!=='RUNNING')return {ok:false,message:'Lượt thi đã kết thúc.'};
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    raw=props.getProperty(key);active=raw?JSON.parse(raw):null;if(!active||active.status!=='RUNNING')return {ok:false,message:'Lượt thi đã kết thúc.'};
    var sh=examEnsureSheets_().results,row=examFindResultRow_(sh,examId);if(row<0)return {ok:false,message:'Thiếu bản ghi lượt thi.'};
    var old={};try{old=JSON.parse(sh.getRange(row,9).getValue()||'{}');}catch(e){old={};}
    var merged=examMergeDetail_(old,detail||{});var json=examSerializeDetail_(merged);
    sh.getRange(row,9).setValue(json);sh.getRange(row,8).setValue('DANG THI - DANG CAP NHAT');
    active.lastProgressAt=new Date().toISOString();props.setProperty(key,JSON.stringify(active));return {ok:true,eventsSaved:(merged.events||[]).length};
  }finally{lock.releaseLock();}
}
function examResolveViolationAudioPath_(ev){
  ev=ev||{};
  var type=String(ev.type||''),course=String(ev.course||ev.bai||'').toLowerCase();
  if(type==='B01_TAG_111_TIMEOUT')course='b01';
  if(type==='B03_TIMEOUT_30S'||type==='B03_ROLLBACK')course='b03';
  var result=String(ev.result||'').toUpperCase(),file=String(ev.audio||'').split('/').pop();
  if(type==='OFFICIAL_WRONG_SEQUENCE')return ''; // MP3 sai quy trinh duoc phat tai may app, tranh phat trung tu may trung tam.
  if(type==='B01_TAG_111_TIMEOUT')file='qua30s.mp3';
  else if(type==='B03_TIMEOUT_30S')file='qua30s.mp3';
  else if(type==='B03_ROLLBACK')file='tutdoc.mp3';
  else if(type==='SPEED_RESULT' && Number(ev.speedKmh)<(Number(ev.effectiveMinSpeedKmh)||23.75))file='thieutoc.mp3';
  else if(type==='POSITION_RULE_120S_TIMEOUT'||type==='TIMED_WARNING_ONLY'||(type==='COURSE_COMPLETED'&&result==='TIMEOUT'))file=file&&file!=='none'?file:'quatg1.mp3';
  else if(type==='POSITION_COMPARE'){
    if(file==='none'||!file)file=result==='QUA_VI_TRI'?'quavitri.mp3':(result==='CHUA_DEN'?'chuaden.mp3':'');
  }
  if(!file||file==='none')return '';
  // Chỉ trả đường dẫn có thư viện tương ứng; không gán nhầm âm thanh của bài khác.
  if(!/^b\d{2}$/.test(course))return '';
  return 'audio/'+course+'/'+file;
}

function examLogEvent_(token,examId,event){
  var sess=examSession_(token);if(!sess)return {ok:false,message:'Phiên đăng nhập không hợp lệ.'};
  var props=PropertiesService.getScriptProperties(),key='EXAM_ACTIVE_'+String(examId||''),raw=props.getProperty(key);
  if(!raw)return {ok:false,message:'Không tìm thấy lượt thi đang hoạt động.'};
  var active=JSON.parse(raw);if(active.teacher!==sess.taiKhoan)return {ok:false,message:'Lượt thi không thuộc giáo viên hiện tại.'};
  if(active.status!=='RUNNING')return {ok:false,message:'Lượt thi đã kết thúc.'};
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    raw=props.getProperty(key);active=raw?JSON.parse(raw):null;if(!active||active.status!=='RUNNING')return {ok:false,message:'Lượt thi đã kết thúc.'};
    var sh=examEnsureSheets_().results,row=examFindResultRow_(sh,examId);if(row<0)return {ok:false,message:'Thiếu bản ghi lượt thi.'};
    var old={};try{old=JSON.parse(sh.getRange(row,9).getValue()||'{}');}catch(e){old={};}
    var ev=event&&typeof event==='object'?event:{};if(!ev.eventId)ev.eventId=Utilities.getUuid();
    var merged=examMergeDetail_(old,{events:[ev],lastUpdate:new Date().toISOString()});
    if(ev.directFail){merged.directFail=true;merged.directFailReason=merged.directFailReason||ev.message||ev.faultText||ev.type||'Lỗi loại trực tiếp';merged.directFailCourse=merged.directFailCourse||ev.course||'';merged.score=0;}
    var events=merged.events||[];
    var directTypes=['B01_TAG_111_TIMEOUT','B03_TIMEOUT_30S','B03_ROLLBACK','B08_NO_GHEP_XE','B12_NO_GHEP_XE','OFFICIAL_WRONG_SEQUENCE'];
    var minusTypes=['POSITION_COMPARE','TIMED_WARNING_ONLY','POSITION_RULE_120S_TIMEOUT','SPEED_RESULT','COURSE_COMPLETED'];
    function isMinus5_(x){var c=String(x.course||'').toLowerCase(),r=String(x.result||'').toUpperCase();
      if(x.type==='POSITION_COMPARE')return (['b02','b10'].indexOf(c)>=0&&['QUA_VI_TRI','CHUA_DEN'].indexOf(r)>=0)||(c==='b03'&&r==='CHUA_DEN');
      if(x.type==='SPEED_RESULT')return c==='b11'&&Number(x.speedKmh)<(Number(x.effectiveMinSpeedKmh)||23.75);
      if(x.type==='TIMED_WARNING_ONLY')return ['b04','b06','b08','b12'].indexOf(c)>=0&&Number(x.limitMs||0)>=120000;
      if(x.type==='POSITION_RULE_120S_TIMEOUT')return ['b08','b12'].indexOf(c)>=0;
      if(x.type==='COURSE_COMPLETED')return ['b08','b12'].indexOf(c)>=0&&r==='TIMEOUT';return false;}
    var minusSeen={},minusCount=0,directSeen={},directCount=0;
    events.forEach(function(x){if(!x)return;var c=String(x.course||'').toLowerCase();if(minusTypes.indexOf(x.type)>=0&&isMinus5_(x)){var cat=x.type==='POSITION_COMPARE'?'POSITION_'+String(x.result||''):(['TIMED_WARNING_ONLY','POSITION_RULE_120S_TIMEOUT','COURSE_COMPLETED'].indexOf(x.type)>=0?'TIMEOUT':x.type);var k=c+'|'+cat;if(!minusSeen[k]){minusSeen[k]=true;minusCount++;}}
      if(x.directFail||directTypes.indexOf(x.type)>=0){var dk=String(x.type||'')+'|'+c+'|'+String(x.tag||x.checkTag||'')+'|'+String(x.afterMs||'');if(!directSeen[dk]){directSeen[dk]=true;directCount++;}}});
    var score=merged.directFail?0:Math.max(0,100-5*minusCount-25*directCount);merged.score=score;
    sh.getRange(row,9).setValue(examSerializeDetail_(merged));
    active.lastEventAt=new Date().toISOString();props.setProperty(key,JSON.stringify(active));
    var sbd=String(active.sbd||''),name=String(active.hoTen||'');
    var violationAudioPath=examResolveViolationAudioPath_(ev);
    if(ev.directFail){if(type!=='OFFICIAL_WRONG_SEQUENCE')examQueueAnnouncement_(examId,sbd,name,'LOAI_TRUC_TIEP',examAnnouncementEventText_('LOAI_TRUC_TIEP',{sbd:sbd,hoTen:name,message:ev.message||ev.faultText||ev.type||'Lỗi loại trực tiếp'}),'FAULT_'+String(ev.eventId),violationAudioPath);}
    else if(ev.errorCategory==='TRU_DIEM'||(ev.isError&&Number(ev.penalty||ev.diemTru||0)===5)){
      examQueueAnnouncement_(examId,sbd,name,'LOI_TRU_5',examAnnouncementEventText_('LOI_TRU_5',{sbd:sbd,course:ev.course||ev.bai||'',message:ev.message||ev.faultText||ev.errorText||ev.type||'Lỗi vi phạm',score:score}),'FAULT_'+String(ev.eventId),violationAudioPath);
    }
    if((merged.directFail||score<80)&&!examAnnouncementHasEvent_('RESULT_'+examId)){
      examQueueAnnouncement_(examId,sbd,name,'THI_TRUOT',examAnnouncementEventText_('THI_TRUOT',{sbd:sbd,hoTen:name,score:score}),'RESULT_'+examId);
    }
    return {ok:true,eventSaved:true,eventsSaved:events.length,score:score,announcementQueued:true};
  }finally{lock.releaseLock();}
}

/* ===== V3.1: HỆ THỐNG PHÁT THANH SA HÌNH TẬP TRUNG ===== */
function examAnnouncementSheet_(){
  var ss=SpreadsheetApp.getActive();
  var sh=ss.getSheetByName('PHAT_THANH_SA_HINH');
  if(!sh){sh=ss.insertSheet('PHAT_THANH_SA_HINH');sh.appendRow(['THOI_GIAN','MA_LUOT_THI','SBD','HO_TEN','LOAI_SU_KIEN','NOI_DUNG','EVENT_ID','AUDIO_PATH']);sh.setFrozenRows(1);}
  else if(sh.getLastColumn()<8){sh.getRange(1,8).setValue('AUDIO_PATH');}
  return sh;
}
function examAnnouncementHasEvent_(eventId){
  var sh=examAnnouncementSheet_(),last=sh.getLastRow();if(last<2)return false;
  var ids=sh.getRange(2,7,last-1,1).getDisplayValues();
  for(var i=0;i<ids.length;i++)if(String(ids[i][0])===String(eventId))return true;
  return false;
}
function examQueueAnnouncement_(examId,sbd,hoTen,type,message,eventId,audioPath){
  if(eventId&&examAnnouncementHasEvent_(eventId))return -1;
  var sh=examAnnouncementSheet_();
  var row=sh.getLastRow()+1;
  sh.getRange(row,1,1,8).setValues([[new Date(),String(examId||''),String(sbd||''),String(hoTen||''),String(type||''),String(message||''),String(eventId||Utilities.getUuid()),String(audioPath||'')]]);
  sh.getRange(row,3).setNumberFormat('@').setValue(String(sbd||''));
  return row-1;
}
function examAnnouncementPoll_(token,afterId,initialize){
  var sess=examSession_(token);
  if(!sess||String(sess.quyen||'').toUpperCase()!=='ADMIN')return {ok:false,message:'Chỉ ADMIN mới được điều khiển hệ thống phát thanh.'};
  var sh=examAnnouncementSheet_(),lastId=Math.max(0,sh.getLastRow()-1);
  if(initialize)return {ok:true,cursor:lastId,events:[]};
  var cursor=Math.max(0,Number(afterId||0));
  if(lastId<=cursor)return {ok:true,cursor:lastId,events:[]};
  var start=cursor+1,count=Math.min(50,lastId-start+1);
  var rows=sh.getRange(start+1,1,count,8).getDisplayValues();
  var events=rows.map(function(r,i){return {id:start+i,time:r[0],examId:r[1],sbd:r[2],hoTen:r[3],type:r[4],message:r[5],eventId:r[6],audioPath:r[7]||''};});
  return {ok:true,cursor:start+count-1,events:events};
}
function examAnnouncementEventText_(type,detail){
  var t=String(type||''),d=detail||{};
  var sbd=String(d.sbd||'').trim(),name=String(d.hoTen||'').trim();
  if(t==='THI_BAT_DAU')return 'Mời thí sinh số báo danh '+sbd+' bắt đầu thi Sa Hình.';
  if(t==='THI_DAT')return 'Thí sinh số báo danh '+sbd+' thi đạt. Xin chúc mừng!';
  if(t==='THI_TRUOT')return 'Thí sinh số báo danh '+sbd+' thi không đạt.';
  if(t==='KHONG_GHEP_XE')return 'Thí sinh số báo danh '+sbd+' không hoàn thành nội dung ghép xe.';
  var msg=String(d.message||'').trim();
  if(t==='LOI_TRU_5')return 'Thí sinh số báo danh '+sbd+', lỗi '+String(d.course||'')+'. '+msg+'. Trừ 5 điểm. Điểm còn lại '+String(d.score==null?'':d.score)+'.';
  if(t==='LOAI_TRUC_TIEP')return 'Thí sinh số báo danh '+sbd+' mắc lỗi loại trực tiếp. '+(msg?'Lý do: '+msg+'.':'');
  return 'Thí sinh số báo danh '+sbd+' bị lỗi trong quá trình thi. '+(msg?'Lý do: '+msg+'.':'');
}

function examAdminReset_(token,sbd){
  var sess=examSession_(token);if(!sess||String(sess.quyen||'').toUpperCase()!=='ADMIN')return {ok:false,message:'Chỉ ADMIN mới được mở khóa học viên.'};
  var lock=LockService.getScriptLock();lock.waitLock(10000);try{
    var st=examFindStudent_(sbd);if(!st)return {ok:false,message:'Không tìm thấy học viên.'};if(st.error)return {ok:false,message:st.error};
    var cT=st.statusCol;if(cT<0){cT=st.headers.length;st.sh.getRange(1,cT+1).setValue('TRANG_THAI_THI');}
    st.sh.getRange(st.row,cT+1).setValue('CHUA THI');var cAt=examCol_(st.headers,['CAPNHATLUC']);if(cAt>=0)st.sh.getRange(st.row,cAt+1).setValue(new Date());var cBy=examCol_(st.headers,['CAPNHATBOI']);if(cBy>=0)st.sh.getRange(st.row,cBy+1).setValue(sess.taiKhoan);
    return {ok:true,message:'Đã mở khóa học viên '+st.sbd+'. Kết quả thi cũ được giữ nguyên.'};
  }finally{lock.releaseLock();}
}

/** ADMIN: mo khoa de hoc vien thi lai, giu nguyen lich su cac lan thi cu. */
function adminAllowRetakeForResults(token, sbd){
  var v=adminValidateForResults(token);
  if(!v||!v.ok)return v||{ok:false,message:'Chi ADMIN duoc phep mo thi lai.'};
  sbd=String(sbd||'').trim();
  if(!sbd)return {ok:false,message:'Thieu so bao danh.'};
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    var st=examFindStudent_(sbd);
    if(!st)return {ok:false,message:'Khong tim thay hoc vien theo SBD.'};
    if(st.error)return {ok:false,message:st.error};
    // Khong mo khoa neu hoc vien van con mot luot thi dang chay.
    var props=PropertiesService.getScriptProperties().getProperties();
    for(var key in props){
      if(key.indexOf('EXAM_ACTIVE_')!==0)continue;
      try{var active=JSON.parse(props[key]||'{}');
        if(String(active.sbd||'').trim().toUpperCase()===sbd.toUpperCase() && active.status!=='COMPLETED')
          return {ok:false,message:'Hoc vien dang co luot thi chua ket thuc. Khong the mo thi lai luc nay.'};
      }catch(e){}
    }
    var cT=st.statusCol;
    if(cT<0){cT=st.headers.length;st.sh.getRange(1,cT+1).setValue('TRANG_THAI_THI');}
    st.sh.getRange(st.row,cT+1).setValue('CHUA THI');
    var cAt=examCol_(st.headers,['CAPNHATLUC']);if(cAt>=0)st.sh.getRange(st.row,cAt+1).setValue(new Date());
    var cBy=examCol_(st.headers,['CAPNHATBOI']);if(cBy>=0)st.sh.getRange(st.row,cBy+1).setValue(String(v.teacher&&(v.teacher.taiKhoan||v.teacher.maGV)||'ADMIN'));
    return {ok:true,message:'Da mo quyen thi lai cho SBD '+st.sbd+'. Lich su cac lan thi cu van duoc giu nguyen.'};
  }finally{lock.releaseLock();}
}

/** ADMIN: xoa toan bo dong du lieu hoc vien va ket qua Sa Hinh; giu hang tieu de. */
function adminDeleteAllStudentsAndResultsForResults(token, confirmation){
  var v=adminValidateForResults(token);
  if(!v||!v.ok)return v||{ok:false,message:'Chi ADMIN duoc phep xoa du lieu.'};
  if(String(confirmation||'')!=='XOA TOAN BO')return {ok:false,message:'Xac nhan khong hop le.'};
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    var props=PropertiesService.getScriptProperties(),all=props.getProperties();
    for(var key in all){
      if(key.indexOf('EXAM_ACTIVE_')!==0)continue;
      try{var active=JSON.parse(all[key]||'{}');
        if(active.status!=='COMPLETED')return {ok:false,message:'Dang co hoc vien trong luot thi chua ket thuc. Hay ket thuc hoac xu ly luot thi do truoc khi xoa.'};
      }catch(e){return {ok:false,message:'Khong the xac minh trang thai mot luot thi. Tam dung xoa de bao toan du lieu.'};}
    }
    var sheets=examEnsureSheets_(), roster=sheets.roster, results=sheets.results;
    var studentCount=Math.max(0,roster.getLastRow()-1), resultCount=Math.max(0,results.getLastRow()-1);
    if(studentCount>0)roster.getRange(2,1,studentCount,roster.getLastColumn()).clearContent();
    if(resultCount>0)results.getRange(2,1,resultCount,results.getLastColumn()).clearContent();
    // Don cac khoa luot thi da hoan tat; khong dong den session giao vien hay mode luyen tap.
    for(var k in all)if(k.indexOf('EXAM_ACTIVE_')===0)props.deleteProperty(k);
    return {ok:true,studentsDeleted:studentCount,resultsDeleted:resultCount,message:'Da xoa '+studentCount+' hoc vien va '+resultCount+' luot ket qua Sa Hinh. Da giu hang tieu de va khong tac dong MODE LUYEN TAP.'};
  }finally{lock.releaseLock();}
}

function adminGetResultPhotoForResults(token, examId){
  var v=adminValidateForResults(token); if(!v||!v.ok)return v||{ok:false,message:'Không có quyền ADMIN.'};
  examId=String(examId||'').trim(); if(!examId)return {ok:false,message:'Thiếu mã lượt thi.'};
  var sh=examEnsureSheets_().results, last=sh.getLastRow(); if(last<2)return {ok:true,photoData:''};
  var rows=sh.getRange(2,1,last-1,9).getDisplayValues();
  for(var i=0;i<rows.length;i++){
    if(String(rows[i][0])===examId){
      var d={};try{d=JSON.parse(rows[i][8]||'{}')||{};}catch(e){}
      return {ok:true,photoData:examPhotoDataUri_(d.photoFileId||'')};
    }
  }
  return {ok:false,message:'Không tìm thấy lượt thi.'};
}

function examFormatVietnamDateTime_(value){
  if(value===null||value===undefined||value==='')return '';
  var d=value instanceof Date?value:new Date(value);
  if(!d||isNaN(d.getTime()))return String(value);
  // Hiển thị thống nhất theo giờ Việt Nam, không phụ thuộc múi giờ trình duyệt/máy chủ.
  return Utilities.formatDate(d,'Asia/Ho_Chi_Minh','dd/MM/yyyy HH:mm:ss');
}
function examAdminListResults_(token, query){
  var sess=examSession_(token);
  if(!sess || String(sess.quyen||'').toUpperCase()!=='ADMIN') return {ok:false,message:'Chỉ ADMIN mới được xem kết quả thi.'};
  var sh=examEnsureSheets_().results;
  var last=sh.getLastRow();
  if(last<2) return {ok:true,results:[]};
  // Dùng display values cho SBD/CCCD để giữ số 0 đầu; dùng Date gốc cho BAT_DAU/KET_THUC.
  var range=sh.getRange(2,1,last-1,9), values=range.getDisplayValues(), raw=range.getValues();
  var q=String(query||'').trim().toUpperCase();
  var out=values.map(function(r,i){
    var detail={}; try{detail=JSON.parse(r[8]||'{}');}catch(e){}
    var events=Array.isArray(detail.events)?detail.events:[];
    var score=(typeof detail.score==='number')?detail.score:(detail.directFail?0:null);
    var errors=events.filter(function(ev){return ev && (ev.isError || ev.errorCategory || ev.penalty || ev.directFail || ev.loaiTrucTiep || /ERROR|FAULT|LOI|WRONG|NO_GHEP|TIMEOUT|QUA_VI_TRI|CHUA_DEN|DIRECT.?FAIL|LOAI.?TRUC.?TIEP/i.test(String(ev.type||ev.event||ev.code||'')));}).map(function(ev){
      return {time:ev.time||ev.at||ev.timestamp||'',course:ev.course||'',type:ev.type||ev.event||ev.code||'',message:ev.message||ev.faultText||ev.errorText||ev.reason||'',penalty:Number(ev.penalty||0),directFail:!!ev.directFail};
    });
    return {examId:r[0],sbd:r[1],hoTen:r[2],cccd:r[3],giaoVien:r[4],batDau:examFormatVietnamDateTime_(raw[i][5]||r[5]),ketThuc:examFormatVietnamDateTime_(raw[i][6]||r[6]),ketQua:r[7],score:score,events:events,errors:errors,detail:detail};
  }).filter(function(x){return !q || [x.examId,x.sbd,x.hoTen,x.giaoVien,x.ketQua].join(' ').toUpperCase().indexOf(q)>=0;});
  out.reverse();
  return {ok:true,results:out.slice(0,1000),serverTime:examFormatVietnamDateTime_(new Date())};
}

function examAdminList_(token){
  var sess=examSession_(token);if(!sess||String(sess.quyen||'').toUpperCase()!=='ADMIN')return {ok:false,message:'Chỉ ADMIN mới được xem danh sách.'};
  var sh=examEnsureSheets_().roster,h=examHeaders_(sh),cS=examCol_(h,['SBD','SOBDANH','SOBAODANH','MAHOCVIEN','CCCD']),cN=examCol_(h,['HOTEN','HOVATEN','TENHOCVIEN','TEN']),cT=examCol_(h,['TRANGTHAITHI','TRANGTHAI']);if(cS<0)return {ok:false,message:'Thiếu cột SBD.'};
  var data=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues():[];
  return {ok:true,students:data.map(function(r){return {sbd:r[cS]||'',hoTen:cN>=0?r[cN]:'',status:cT>=0?r[cT]||'CHUA THI':'CHUA THI'};}).filter(function(x){return x.sbd;})};
}

/** API cho PWA GitHub Pages: chỉ dùng để kiểm tra đăng nhập giáo viên. */
function doPost(e) {
  try {
    var body={};
    if(e&&e.postData&&e.postData.contents)body=JSON.parse(e.postData.contents);
    var action=String(body.action||'').toLowerCase(), result;
    if(action==='login'){
      result=teacherLogin(String(body.taiKhoan||body.username||''),String(body.matKhau||body.password||''));
    }else if(action==='validate'||action==='validatesession'||action==='checksession'){
      result=validateSession(String(body.token||''));
    }else if(action==='logout'){
      result=logout(String(body.token||''));
    }else if(action==='lookupstudent'){
      result=examLookupStudent_(String(body.token||''),String(body.sbd||''));
    }else if(action==='getstudentphoto'){
      var photoSess=examSession_(String(body.token||''));
      if(!photoSess) result={ok:false,message:'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'};
      else {
        var photoStudent=examFindStudent_(String(body.sbd||''));
        result=(!photoStudent||photoStudent.error)?{ok:false,message:'Không tìm thấy hồ sơ ảnh học viên.'}:{ok:true,photoData:examPhotoDataUri_(photoStudent.photoFileId||'')};
      }
    }else if(action==='beginexam'){
      result=examBegin_(String(body.token||''),String(body.sbd||''));
    }else if(action==='completeexam'){
      result=examComplete_(String(body.token||''),String(body.examId||''),body.result||{});
    }else if(action==='examprogress'){
      result=examProgress_(String(body.token||''),String(body.examId||''),body.detail||{});
    }else if(action==='logexamevent'){
      result=examLogEvent_(String(body.token||''),String(body.examId||''),body.event||{});
    }else if(action==='announcementpoll'){
      result=examAnnouncementPoll_(String(body.token||''),body.afterId,!!body.initialize);
    }else if(action==='adminresetstudent'){
      result=examAdminReset_(String(body.token||''),String(body.sbd||''));
    }else if(action==='adminliststudents'){
      result=examAdminList_(String(body.token||''));
    }else if(action==='adminlistresults'){
      result=examAdminListResults_(String(body.token||''),String(body.query||''));
    }else{
      result={ok:false,message:'ACTION_KHONG_HOP_LE'};
    }
    return ContentService.createTextOutput(JSON.stringify({success:!!result.ok,ok:!!result.ok,data:result})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({success:false,ok:false,message:String(err&&err.message||err)})).setMimeType(ContentService.MimeType.JSON);
  }
}




/* ===== V2.1.14: API quản trị kết quả dùng trong cùng dự án Apps Script ===== */
function adminLoginForResults(username, password) {
  var r = teacherLogin(String(username || ''), String(password || ''));
  if (!r || !r.ok) return {ok:false, message:(r && r.message) || 'Đăng nhập thất bại.'};
  var token = r.token || (r.data && r.data.token);
  if (!token) return {ok:false, message:'Không nhận được phiên đăng nhập.'};
  var v = validateSession(token);
  var teacher = v && (v.teacher || v.data && v.data.teacher);
  if (!v || !v.ok || !teacher || String(teacher.quyen || '').toUpperCase() !== 'ADMIN') {
    try { logout(token); } catch (e) {}
    return {ok:false, message:'Chỉ tài khoản ADMIN được truy cập trang quản lý kết quả.'};
  }
  return {ok:true, token:token};
}
function adminValidateForResults(token) {
  var v = validateSession(String(token || ''));
  if (!v || !v.ok) return {ok:false, message:(v && v.message) || 'Phiên đăng nhập hết hạn.'};
  var teacher = v.teacher || (v.data && v.data.teacher);
  if (!teacher || String(teacher.quyen || '').toUpperCase() !== 'ADMIN') return {ok:false, message:'Chỉ ADMIN được truy cập.'};
  return {ok:true, teacher:teacher};
}
function adminListResultsForResults(token, query) {
  var v = adminValidateForResults(token);
  if (!v.ok) return v;
  return examAdminListResults_(String(token || ''), String(query || ''));
}
function adminPollAnnouncementsForResults(token, afterId, initialize) {
  var v = adminValidateForResults(token);
  if (!v || !v.ok) return v || {ok:false,message:'Phiên ADMIN không hợp lệ.'};
  return examAnnouncementPoll_(String(token || ''), afterId, !!initialize);
}

function adminLogoutForResults(token) {
  return logout(String(token || ''));
}



/** ADMIN: chỉnh điểm thủ công và lưu vào CHI_TIET_JSON của lượt thi. */
function adminEditResultScoreForResults(token, examId, newScore) {
  var v = adminValidateForResults(token);
  if (!v || !v.ok) return {ok:false, message:(v && v.message) || 'Chỉ ADMIN được sửa điểm.'};
  var score = Number(newScore);
  if (!isFinite(score) || score < 0 || score > 100) return {ok:false, message:'Điểm phải nằm trong khoảng 0 đến 100.'};
  if (Math.round(score * 100) !== score * 100) return {ok:false, message:'Điểm chỉ được tối đa 2 chữ số thập phân.'};
  examId = String(examId || '').trim();
  if (!examId) return {ok:false, message:'Thiếu mã lượt thi.'};
  var sh = examEnsureSheets_().results;
  if (sh.getLastRow() < 2) return {ok:false, message:'Chưa có kết quả thi.'};
  var ids = sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues();
  var row = -1;
  for (var i=0; i<ids.length; i++) if (String(ids[i][0]) === examId) { row = i + 2; break; }
  if (row < 0) return {ok:false, message:'Không tìm thấy mã lượt thi.'};
  var raw = sh.getRange(row,9).getDisplayValue();
  var detail = {};
  try { detail = JSON.parse(raw || '{}') || {}; } catch (e) { detail = {rawDetail:raw}; }
  detail.score = score;
  detail.adminEditedScore = true;
  detail.adminEditedBy = String(v.teacher && (v.teacher.taiKhoan || v.teacher.maGV) || 'ADMIN');
  detail.adminEditedAt = new Date().toISOString();
  sh.getRange(row,9).setValue(JSON.stringify(detail).slice(0,45000));
  return {ok:true, score:score, message:'Đã cập nhật điểm vào Google Sheets.'};
}


/* ===== NHAP HOC VIEN TU XML - CHI DANH CHO THI SA HINH ===== */
var XML_IMPORT_PHOTO_FOLDER = 'SA_HINH_AI_ANH_HOC_VIEN';
function importXmlAdminLogin(username,password){
  var r=teacherLogin(String(username||''),String(password||''));
  if(!r||!r.ok)return {ok:false,message:(r&&r.message)||'Đăng nhập thất bại.'};
  var v=validateSession(r.token);
  if(!v||!v.ok||!v.teacher||String(v.teacher.quyen||'').toUpperCase()!=='ADMIN'){
    try{logout(r.token);}catch(e){}
    return {ok:false,message:'Chỉ tài khoản ADMIN được nhập danh sách học viên.'};
  }
  return {ok:true,token:r.token,teacher:v.teacher};
}
function importXmlRequireAdmin_(token){
  var v=validateSession(String(token||''));
  if(!v||!v.ok||!v.teacher||String(v.teacher.quyen||'').toUpperCase()!=='ADMIN')throw new Error('Phiên ADMIN không hợp lệ hoặc đã hết hạn.');
  return v.teacher;
}
function importXmlPhotoFolder_(){
  var it=DriveApp.getFoldersByName(XML_IMPORT_PHOTO_FOLDER);
  if(it.hasNext())return it.next();
  return DriveApp.createFolder(XML_IMPORT_PHOTO_FOLDER);
}
function importXmlEnsureColumns_(sh){
  var required=['SBD','HO_TEN','CCCD','NGAY_SINH','HANG_THI','KHOA_HOC','KY_SAT_HACH','MA_DANG_KY','QUOC_TICH','NOI_CT','ANH_FILE_ID','TRANG_THAI','TRANG_THAI_THI','CAP_NHAT_LUC','CAP_NHAT_BOI'];
  if(sh.getLastColumn()===0){sh.getRange(1,1,1,required.length).setValues([required]);}
  var headers=examHeaders_(sh);
  required.forEach(function(h){
    if(headers.indexOf(examNormalizeHeader_(h))<0){
      sh.getRange(1,sh.getLastColumn()+1).setValue(h);
      headers=examHeaders_(sh);
    }
  });
  sh.setFrozenRows(1);
  return headers;
}
function importXmlColMap_(headers){
  return {
    sbd:examCol_(headers,['SBD','SO_BAO_DANH','SOBAODANH']),
    name:examCol_(headers,['HO_TEN','HO_TEN_IN','HOTEN','HOVATEN','TENHOCVIEN']),
    cccd:examCol_(headers,['CCCD','SO_CMT','SOCMT','SOCCCD','CMND']),
    dob:examCol_(headers,['NGAY_SINH','NGAYSINH','DOB']),
    className:examCol_(headers,['HANG_THI','HANG_GPLX','HANGGPLX','HANG']),
    course:examCol_(headers,['KHOA_HOC','TEN_KY_SAT_HACH','TENKYSATHACH']),
    session:examCol_(headers,['KY_SAT_HACH','KYSATHACH']),
    registration:examCol_(headers,['MA_DANG_KY','MADANGKY']),
    nationality:examCol_(headers,['QUOC_TICH','QUOCTICH']),
    address:examCol_(headers,['NOI_CT','NOICT','DIA_CHI']),
    photo:examCol_(headers,['ANH_FILE_ID','PHOTO_FILE_ID','HINH_ANH_FILE_ID','ANH_CHAN_DUNG_FILE_ID']),
    permission:examCol_(headers,['TRANG_THAI','TRANG_THAI_HOC_VIEN','QUYEN_THI']),
    examStatus:examCol_(headers,['TRANG_THAI_THI']),
    updatedAt:examCol_(headers,['CAP_NHAT_LUC']),
    updatedBy:examCol_(headers,['CAP_NHAT_BOI'])
  };
}
function importXmlFindExistingRow_(rows,map,sbd,cccd){
  // Ưu tiên CCCD để giữ định danh ổn định khi SBD thay đổi; sau đó mới dò SBD.
  if(map.cccd>=0&&cccd){
    for(var i=0;i<rows.length;i++)if(String(rows[i][map.cccd]||'').trim()===cccd)return i+2;
  }
  if(map.sbd>=0&&sbd){
    for(var j=0;j<rows.length;j++)if(String(rows[j][map.sbd]||'').trim()===sbd)return j+2;
  }
  return 0;
}
function importXmlSavePhoto_(student,folder,existingFileId){
  var b64=String(student.photoBase64||'').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/,'').replace(/\s/g,'');
  if(!b64)return existingFileId||'';
  var bytes=Utilities.base64Decode(b64);
  if(bytes.length>700000)throw new Error('Ảnh học viên '+student.sbd+' vượt quá 700 KB.');
  var mime=String(student.photoMime||'image/jpeg').toLowerCase();
  if(mime!=='image/jpeg'&&mime!=='image/png')mime='image/jpeg';
  var ext=mime==='image/png'?'png':'jpg';
  var safeSbd=String(student.sbd||'NO_SBD').replace(/[^A-Za-z0-9_-]/g,'_');
  var blob=Utilities.newBlob(bytes,mime,'HV_'+safeSbd+'.'+ext);
  var file=folder.createFile(blob);
  // DriveApp.File.setContent() chỉ phù hợp nội dung văn bản; ảnh nhị phân được thay bằng file mới.
  if(existingFileId){
    try{DriveApp.getFileById(existingFileId).setTrashed(true);}catch(e){}
  }
  return file.getId();
}
function importXmlStudentsBatch(token,students){
  var admin=importXmlRequireAdmin_(token);
  if(!Array.isArray(students)||!students.length||students.length>5)throw new Error('Mỗi lần chỉ gửi từ 1 đến 5 học viên.');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var sh=examEnsureSheets_().roster;
    var headers=importXmlEnsureColumns_(sh), map=importXmlColMap_(headers);
    if(map.sbd<0||map.name<0||map.cccd<0)throw new Error('Sheet danh_sach_hoc_vien cần có cột SBD, HO_TEN và CCCD.');
    var last=sh.getLastRow(), width=sh.getLastColumn();
    var rows=last>1?sh.getRange(2,1,last-1,width).getDisplayValues():[];
    var folder=importXmlPhotoFolder_(), now=new Date(), added=0, updated=0, photoCount=0, errors=[];
    students.forEach(function(raw){
      try{
        var sbd=String(raw.sbd||'').trim(), name=String(raw.hoTen||'').trim(), cccd=String(raw.cccd||'').trim();
        if(!sbd||!name||!cccd)throw new Error('Thiếu SBD, họ tên hoặc CCCD.');
        var row=importXmlFindExistingRow_(rows,map,sbd,cccd);
        var isNew=!row, existing=row?sh.getRange(row,1,1,width).getValues()[0]:new Array(width).fill('');
        var oldPhoto=map.photo>=0?String(existing[map.photo]||''):'';
        var photoId=importXmlSavePhoto_(raw,folder,oldPhoto);
        if(map.photo>=0&&photoId)photoCount++;
        var values={
          sbd:sbd,name:name,cccd:cccd,dob:String(raw.ngaySinh||''),
          className:String(raw.hangGPLX||''),course:String(raw.tenKySatHach||raw.kySatHach||''),
          session:String(raw.kySatHach||''),registration:String(raw.maDangKy||''),
          nationality:String(raw.quocTich||''),address:String(raw.noiCt||''),
          photo:photoId,updatedAt:now,updatedBy:String(admin.taiKhoan||'ADMIN')
        };
        Object.keys(values).forEach(function(k){
          var col=map[k]; if(col>=0 && (k!=='photo'||photoId))existing[col]=values[k];
        });
        if(map.examStatus>=0&&!String(existing[map.examStatus]||'').trim())existing[map.examStatus]='CHUA THI';
        // Không ghi đè quyền thi/trạng thái cho phép thi đã được ADMIN thiết lập.
        var targetRow=isNew?sh.getLastRow()+1:row;
        // SBD/CCCD luôn lưu dạng văn bản để không mất số 0 ở đầu.
        sh.getRange(targetRow,map.sbd+1).setNumberFormat('@');
        sh.getRange(targetRow,map.cccd+1).setNumberFormat('@');
        sh.getRange(targetRow,1,1,width).setValues([existing]);
        if(isNew)added++;else updated++;
        // Cập nhật cache dò trùng trong chính batch hiện tại.
        var cacheRow=existing.map(function(v){return v instanceof Date?Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss'):String(v==null?'':v);});
        if(isNew)rows.push(cacheRow);else rows[row-2]=cacheRow;
      }catch(err){errors.push({sbd:String(raw&&raw.sbd||''),message:String(err&&err.message||err)});}
    });
    return {ok:true,added:added,updated:updated,photos:photoCount,errors:errors,
      total:students.length,message:'Đã xử lý '+students.length+' học viên: thêm '+added+', cập nhật '+updated+'.'};
  }finally{lock.releaseLock();}
}
