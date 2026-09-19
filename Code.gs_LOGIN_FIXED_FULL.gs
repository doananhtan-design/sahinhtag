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
   TEACHER LOGIN — V2.1.1 LOGIN FIX ONLY
   ========================= */

const AUTH24H_TTL_MS = 24 * 60 * 60 * 1000;
const AUTH24H_PREFIX = 'AUTH24_';

function todayKey_(){
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}

function teacherHeaderMap_(headers){
  const ix={};
  headers.forEach((x,i)=>ix[String(x||'').trim().toLowerCase()]=i);
  return ix;
}

function teacherRowByAccount_(account){
  const sh=SpreadsheetApp.getActive().getSheetByName(APP.SHEET_TEACHER);
  if(!sh) return null;
  const v=sh.getDataRange().getValues();
  if(v.length<2) return null;
  const ix=teacherHeaderMap_(v[0]);
  const key=String(account||'').trim().toLowerCase();
  const findIx=function(a,b){
    if(ix[a]!=null)return ix[a];
    if(ix[b]!=null)return ix[b];
    return -1;
  };
  const iMa=findIx('magv','maGV'.toLowerCase());
  const iUser=findIx('taikhoan','taiKhoan'.toLowerCase());
  const iPass=findIx('matkhau','matKhau'.toLowerCase());
  const iHash=findIx('matkhauhash','matKhauHash'.toLowerCase());
  const iName=findIx('hoten','hoTen'.toLowerCase());
  const iRole=ix['quyen']!=null?ix['quyen']:-1;
  const iStatus=findIx('trangthai','trangThai'.toLowerCase());
  for(let r=1;r<v.length;r++){
    const row=v[r];
    const username=iUser>=0?String(row[iUser]||'').trim().toLowerCase():'';
    const maGV=iMa>=0?String(row[iMa]||'').trim().toLowerCase():'';
    if(username!==key && maGV!==key)continue;
    return {
      rowNumber:r+1,
      maGV:iMa>=0?String(row[iMa]||''):'',
      taiKhoan:iUser>=0?String(row[iUser]||''):'',
      matKhau:iPass>=0?String(row[iPass]||''):'',
      matKhauHash:iHash>=0?String(row[iHash]||''):'',
      hoTen:iName>=0?String(row[iName]||''):'',
      quyen:iRole>=0?String(row[iRole]||'GIAOVIEN'):'GIAOVIEN',
      trangThai:iStatus>=0?String(row[iStatus]||''):'',
      passCol:iPass,
      hashCol:iHash
    };
  }
  return null;
}

function saveAuth24Session_(token,session){
  PropertiesService.getScriptProperties().setProperty(AUTH24H_PREFIX+token,JSON.stringify(session));
}
function getAuth24Session_(token){
  const raw=PropertiesService.getScriptProperties().getProperty(AUTH24H_PREFIX+String(token||''));
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e){return null;}
}
function removeAuth24Session_(token){
  if(token)PropertiesService.getScriptProperties().deleteProperty(AUTH24H_PREFIX+String(token));
}

function teacherLogin(username,password){
  ensureSystem_();
  const account=String(username||'').trim();
  const pass=String(password||'');
  if(!account||!pass)return {ok:false,code:'MISSING_LOGIN',message:'Vui lòng nhập tài khoản và mật khẩu.'};

  const row=teacherRowByAccount_(account);
  if(!row)return {ok:false,code:'INVALID_CREDENTIALS',message:'Sai tài khoản hoặc mật khẩu.'};

  if(String(row.trangThai||'').trim().toUpperCase()!=='HOAT_DONG'){
    return {ok:false,code:'ACCOUNT_LOCKED',message:'Tài khoản đã bị khóa. Vui lòng liên hệ ADMIN (0914.531.591).'};
  }

  const passHash=sha256_(pass).toLowerCase();
  const plain=String(row.matKhau||'');
  const hash=String(row.matKhauHash||'').toLowerCase();
  const matched=(plain && plain===pass) || (hash && hash===passHash);
  if(!matched)return {ok:false,code:'INVALID_CREDENTIALS',message:'Sai tài khoản hoặc mật khẩu.'};

  // Nếu Sheet đang có cột matKhauHash nhưng hiện chỉ lưu plaintext ở matKhau,
  // tự chuẩn hóa thêm hash; không xóa mật khẩu cũ để giữ tương thích.
  try{
    if(row.hashCol>=0 && row.passCol>=0 && !row.matKhauHash){
      SpreadsheetApp.getActive().getSheetByName(APP.SHEET_TEACHER)
        .getRange(row.rowNumber,row.hashCol+1).setValue(passHash);
    }
  }catch(e){}

  const token=Utilities.getUuid();
  const now=Date.now();
  const session={
    maGV:row.maGV,
    taiKhoan:row.taiKhoan,
    hoTen:row.hoTen,
    quyen:row.quyen,
    loginAt:now,
    expiresAt:now+AUTH24H_TTL_MS,
    dayKey:todayKey_()
  };
  saveAuth24Session_(token,session);

  return {
    ok:true,
    token:token,
    teacher:{maGV:row.maGV,taiKhoan:row.taiKhoan,hoTen:row.hoTen,quyen:row.quyen},
    loginAt:session.loginAt,
    expiresAt:session.expiresAt,
    dayKey:session.dayKey
  };
}

function validateSession(token){
  const t=String(token||'').trim();
  if(!t)return {ok:false,code:'NO_SESSION',message:'Thiếu mã phiên đăng nhập.'};
  const s=getAuth24Session_(t);
  if(!s)return {ok:false,code:'SESSION_EXPIRED',message:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'};
  if(Number(s.expiresAt||0)<=Date.now()){
    removeAuth24Session_(t);
    return {ok:false,code:'SESSION_EXPIRED',message:'Phiên đăng nhập đã hết 24 giờ. Vui lòng đăng nhập lại.'};
  }
  if(String(s.dayKey||'')!==todayKey_()){
    removeAuth24Session_(t);
    return {ok:false,code:'NEW_DAY',message:'Đã sang ngày mới. Vui lòng đăng nhập lại.'};
  }
  if(String(s.quyen||'').toUpperCase()!=='ADMIN'){
    const row=teacherRowByAccount_(s.taiKhoan);
    if(!row || String(row.trangThai||'').trim().toUpperCase()!=='HOAT_DONG'){
      removeAuth24Session_(t);
      return {ok:false,code:'ACCOUNT_LOCKED',message:'Tài khoản đã bị khóa. Vui lòng liên hệ ADMIN (0914.531.591).'};
    }
  }
  return {
    ok:true,
    teacher:{maGV:s.maGV,taiKhoan:s.taiKhoan,hoTen:s.hoTen,quyen:s.quyen},
    loginAt:s.loginAt,
    expiresAt:s.expiresAt,
    dayKey:s.dayKey
  };
}

function logout(token){
  removeAuth24Session_(String(token||'').trim());
  // Giữ tương thích với ADMIN session cũ nếu token đó tồn tại.
  if(token)CacheService.getScriptCache().remove('SESSION_'+String(token));
  return {ok:true};
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
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    var action = String(body.action || '').toLowerCase();
    var result;
    if (action === 'login') {
      result = teacherLogin(String(body.username || body.taiKhoan || ''), String(body.password || body.matKhau || ''));
    } else if (action === 'validate') {
      result = validateSession(String(body.token || ''));
    } else if (action === 'logout') {
      result = logout(String(body.token || ''));
    } else {
      return ContentService.createTextOutput(JSON.stringify({ok:false,success:false,error:'ACTION_KHONG_HOP_LE',message:'Yêu cầu không hợp lệ.'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({
      ok: result.ok === true,
      success: result.ok === true,
      data: result,
      message: result.message || '',
      code: result.code || ''
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok:false,success:false,error:String(err && err.message || err),message:String(err && err.message || err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
