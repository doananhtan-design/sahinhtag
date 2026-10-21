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
  // Phiên giáo viên chỉ hết hiệu lực khi sang ngày mới.
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
 * Sheet DANH_SACH_HOC_VIEN: SBD | HO_TEN | CCCD | TRANG_THAI_THI | CAP_NHAT_LUC | CAP_NHAT_BOI
 * Sheet KET_QUA_THI_SA_HINH: MA_LUOT_THI | SBD | HO_TEN | CCCD | GIAO_VIEN | BAT_DAU | KET_THUC | KET_QUA | CHI_TIET_JSON
 */
function examEnsureSheets_(){
  var ss=SpreadsheetApp.getActive();
  var roster=ss.getSheetByName('DANH_SACH_HOC_VIEN');
  if(!roster) roster=ss.insertSheet('DANH_SACH_HOC_VIEN');
  if(roster.getLastRow()===0) roster.appendRow(['SBD','HO_TEN','CCCD','TRANG_THAI_THI','CAP_NHAT_LUC','CAP_NHAT_BOI']);
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
function examHeaders_(sh){
  var n=Math.max(1,sh.getLastColumn()); return sh.getRange(1,1,1,n).getDisplayValues()[0].map(function(x){return String(x||'').trim().toUpperCase().replace(/[\s_-]+/g,'');});
}
function examCol_(headers,names){for(var i=0;i<headers.length;i++)if(names.indexOf(headers[i])>=0)return i;return -1;}
function examFindStudent_(sbd){
  var sh=examEnsureSheets_().roster, h=examHeaders_(sh), cS=examCol_(h,['SBD','SOBDANH','SOBAODANH','MAHOCVIEN','CCCD']), cN=examCol_(h,['HOTEN','TENHOCVIEN','HO&TEN','TEN']), cC=examCol_(h,['CCCD','SOCANCUOC','CMND']), cT=examCol_(h,['TRANGTHAITHI','TRANGTHAI','THI']);
  if(cS<0)return {error:'Thiếu cột SBD (hoặc CCCD) trong sheet DANH_SACH_HOC_VIEN.'};
  if(sh.getLastRow()<2)return {error:'Sheet DANH_SACH_HOC_VIEN chưa có dữ liệu học viên.'};
  var rows=sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues(), key=String(sbd||'').trim().toUpperCase();
  for(var i=0;i<rows.length;i++)if(String(rows[i][cS]||'').trim().toUpperCase()===key){return {sh:sh,row:i+2,sbd:String(rows[i][cS]||''),hoTen:cN>=0?String(rows[i][cN]||''):'',cccd:cC>=0?String(rows[i][cC]||''):'',status:cT>=0?String(rows[i][cT]||'CHUA THI').trim().toUpperCase():'CHUA THI',statusCol:cT,headers:h};}
  return null;
}
function examLookupStudent_(token,sbd){
  if(!examSession_(token))return {ok:false,message:'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'};
  var st=examFindStudent_(sbd); if(!st)return {ok:false,message:'Không tìm thấy học viên theo số báo danh.'}; if(st.error)return {ok:false,message:st.error};
  if(st.status==='DA THI'||st.status==='ĐÃ THI'||st.status==='DANG THI'||st.status==='ĐANG THI')return {ok:false,code:st.status.indexOf('DANG')===0?'EXAM_IN_PROGRESS':'ALREADY_TAKEN',message:st.status.indexOf('DANG')===0?'Học viên đang có lượt thi chưa kết thúc. Liên hệ ADMIN nếu lượt thi bị gián đoạn.':'Học viên đã thi. Chỉ ADMIN mới được mở khóa.',student:{sbd:st.sbd,hoTen:st.hoTen,cccd:st.cccd,status:st.status}};
  return {ok:true,student:{sbd:st.sbd,hoTen:st.hoTen,cccd:st.cccd,status:st.status||'CHUA THI'}};
}
function examBegin_(token,sbd){
  var sess=examSession_(token); if(!sess)return {ok:false,message:'Phiên đăng nhập không hợp lệ.'};
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    var st=examFindStudent_(sbd);if(!st)return {ok:false,message:'Không tìm thấy học viên.'};if(st.error)return {ok:false,message:st.error};
    if(st.status==='DA THI'||st.status==='ĐÃ THI'||st.status==='DANG THI'||st.status==='ĐANG THI')return {ok:false,code:'STUDENT_LOCKED',message:st.status.indexOf('DANG')===0?'Học viên đang có lượt thi chưa kết thúc. Liên hệ ADMIN.':'Học viên đã thi. Chỉ ADMIN mới được mở khóa.'};
    var headers=st.headers, cT=st.statusCol;
    if(cT<0){cT=headers.length;st.sh.getRange(1,cT+1).setValue('TRANG_THAI_THI');}
    var examId=Utilities.getUuid(), now=new Date();
    st.sh.getRange(st.row,cT+1).setValue('DANG THI');
    var cAt2=examCol_(headers,['CAPNHATLUC']);if(cAt2>=0)st.sh.getRange(st.row,cAt2+1).setValue(now);
    PropertiesService.getScriptProperties().setProperty('EXAM_ACTIVE_'+examId,JSON.stringify({sbd:st.sbd,teacher:sess.taiKhoan,startedAt:now.toISOString(),status:'RUNNING'}));
    return {ok:true,examId:examId,student:{sbd:st.sbd,hoTen:st.hoTen,cccd:st.cccd},startedAt:now.toISOString()};
  }finally{lock.releaseLock();}
}
function examComplete_(token,examId,detail){
  var sess=examSession_(token);if(!sess)return {ok:false,message:'Phiên đăng nhập không hợp lệ.'};
  var props=PropertiesService.getScriptProperties(),key='EXAM_ACTIVE_'+String(examId||''),raw=props.getProperty(key);if(!raw)return {ok:false,message:'Không tìm thấy lượt thi đang hoạt động.'};
  var active=JSON.parse(raw);if(active.teacher!==sess.taiKhoan)return {ok:false,message:'Lượt thi không thuộc giáo viên hiện tại.'};if(active.status==='COMPLETED')return {ok:true,duplicate:true};
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    var st=examFindStudent_(active.sbd);if(!st)return {ok:false,message:'Không tìm thấy học viên khi lưu kết quả.'};
    var sh=examEnsureSheets_().results, end=new Date(), result=detail||{};
    sh.appendRow([examId,st.sbd,st.hoTen,st.cccd,sess.taiKhoan,active.startedAt,end,result.result||'HOAN_THANH',JSON.stringify(result).slice(0,45000)]);
    var cT=st.statusCol;if(cT<0){cT=st.headers.length;st.sh.getRange(1,cT+1).setValue('TRANG_THAI_THI');}
    st.sh.getRange(st.row,cT+1).setValue('DA THI');
    var cAt=examCol_(st.headers,['CAPNHATLUC']);if(cAt>=0)st.sh.getRange(st.row,cAt+1).setValue(end);
    var cBy=examCol_(st.headers,['CAPNHATBOI']);if(cBy>=0)st.sh.getRange(st.row,cBy+1).setValue(sess.taiKhoan);
    active.status='COMPLETED';active.completedAt=end.toISOString();props.setProperty(key,JSON.stringify(active));return {ok:true,status:'DA THI'};
  }finally{lock.releaseLock();}
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
function examAdminList_(token){
  var sess=examSession_(token);if(!sess||String(sess.quyen||'').toUpperCase()!=='ADMIN')return {ok:false,message:'Chỉ ADMIN mới được xem danh sách.'};
  var sh=examEnsureSheets_().roster,h=examHeaders_(sh),cS=examCol_(h,['SBD','SOBDANH','SOBAODANH','MAHOCVIEN','CCCD']),cN=examCol_(h,['HOTEN','TENHOCVIEN','TEN']),cT=examCol_(h,['TRANGTHAITHI','TRANGTHAI']);if(cS<0)return {ok:false,message:'Thiếu cột SBD.'};
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
    }else if(action==='beginexam'){
      result=examBegin_(String(body.token||''),String(body.sbd||''));
    }else if(action==='completeexam'){
      result=examComplete_(String(body.token||''),String(body.examId||''),body.result||{});
    }else if(action==='adminresetstudent'){
      result=examAdminReset_(String(body.token||''),String(body.sbd||''));
    }else if(action==='adminliststudents'){
      result=examAdminList_(String(body.token||''));
    }else{
      result={ok:false,message:'ACTION_KHONG_HOP_LE'};
    }
    return ContentService.createTextOutput(JSON.stringify({success:!!result.ok,ok:!!result.ok,data:result})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({success:false,ok:false,message:String(err&&err.message||err)})).setMimeType(ContentService.MimeType.JSON);
  }
}
