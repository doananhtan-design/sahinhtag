/* SA HÌNH AI — V2.1.1 LOGIN FIX ONLY
   Apply ONLY to the authentication functions in the existing Apps Script Code.gs.
   Do not change the exam engine, TAG rules, audio, B11, B12 or other unrelated code.
*/

const AUTH24H_TTL_MS = 24 * 60 * 60 * 1000;
const AUTH24H_PREFIX = 'AUTH24_';

function todayKey_(){
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}

function hashPassword_(text){
  const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(text),Utilities.Charset.UTF_8);
  return bytes.map(function(b){const n=b<0?b+256:b;const x=n.toString(16);return x.length===1?'0'+x:x;}).join('');
}

function teacherRowByAccount_(account){
  const sh=SpreadsheetApp.getActive().getSheetByName(APP.SHEET_TEACHER);
  if(!sh) return null;
  const v=sh.getDataRange().getValues();
  if(v.length<2) return null;
  const h=v[0].map(function(x){return String(x||'').trim().toLowerCase();});
  const ix={};h.forEach(function(x,i){ix[x]=i;});
  const key=String(account||'').trim().toLowerCase();
  for(let i=1;i<v.length;i++){
    const r=v[i];
    const username=String(r[ix['taikhoan']??ix['taiKhoan']]||'').trim().toLowerCase();
    const ma=String(r[ix['magv']??ix['maGV']]||'').trim().toLowerCase();
    if(username===key || ma===key){
      return {
        row:i+1,
        maGV:String(r[ix['magv']??ix['maGV']]||''),
        taiKhoan:String(r[ix['taikhoan']??ix['taiKhoan']]||''),
        matKhau:String(r[ix['matkhau']??ix['matKhau']]||''),
        matKhauHash:String(r[ix['matkhauhash']??ix['matKhauHash']]||''),
        hoTen:String(r[ix['hoten']??ix['hoTen']]||''),
        quyen:String(r[ix['quyen']]||'GIAOVIEN'),
        trangThai:String(r[ix['trangthai']??ix['trangThai']]||'')
      };
    }
  }
  return null;
}

function saveAuthSession_(token,session){
  PropertiesService.getScriptProperties().setProperty(AUTH24H_PREFIX+token,JSON.stringify(session));
}
function getAuthSession_(token){
  const raw=PropertiesService.getScriptProperties().getProperty(AUTH24H_PREFIX+String(token||''));
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e){return null;}
}
function removeAuthSession_(token){
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

  const plain=row.matKhau;
  const hash=row.matKhauHash;
  const passHash=hashPassword_(pass);
  const matched=(plain && plain===pass) || (hash && hash.toLowerCase()===passHash.toLowerCase());
  if(!matched)return {ok:false,code:'INVALID_CREDENTIALS',message:'Sai tài khoản hoặc mật khẩu.'};

  // Tự chuẩn hóa mật khẩu sang SHA-256 nếu sheet đang còn lưu plaintext trong cột matKhau.
  try{
    const sh=SpreadsheetApp.getActive().getSheetByName(APP.SHEET_TEACHER);
    const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(function(x){return String(x||'').trim().toLowerCase();});
    const ixPlain=headers.indexOf('matkhau');
    const ixHash=headers.indexOf('matkhauhash');
    if(ixHash>=0 && ixPlain>=0 && !hash){
      sh.getRange(row.row,ixHash+1).setValue(passHash);
    }
  }catch(e){}

  const token=Utilities.getUuid();
  const now=Date.now();
  const session={
    maGV:row.maGV,taiKhoan:row.taiKhoan,hoTen:row.hoTen,quyen:row.quyen,
    loginAt:now,expiresAt:now+AUTH24H_TTL_MS,dayKey:todayKey_()
  };
  saveAuthSession_(token,session);
  return {ok:true,token:token,teacher:{maGV:row.maGV,taiKhoan:row.taiKhoan,hoTen:row.hoTen,quyen:row.quyen},loginAt:session.loginAt,expiresAt:session.expiresAt,dayKey:session.dayKey};
}

function validateSession(token){
  const t=String(token||'').trim();
  if(!t)return {ok:false,code:'NO_SESSION',message:'Thiếu mã phiên đăng nhập.'};
  const s=getAuthSession_(t);
  if(!s)return {ok:false,code:'SESSION_EXPIRED',message:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'};
  if(Number(s.expiresAt||0)<=Date.now()){
    removeAuthSession_(t);
    return {ok:false,code:'SESSION_EXPIRED',message:'Phiên đăng nhập đã hết 24 giờ. Vui lòng đăng nhập lại.'};
  }
  if(String(s.dayKey||'')!==todayKey_()){
    removeAuthSession_(t);
    return {ok:false,code:'NEW_DAY',message:'Đã sang ngày mới. Vui lòng đăng nhập lại.'};
  }
  const row=teacherRowByAccount_(s.taiKhoan);
  if(String(s.quyen||'').toUpperCase()!=='ADMIN' && (!row || String(row.trangThai).toUpperCase()!=='HOAT_DONG')){
    removeAuthSession_(t);
    return {ok:false,code:'ACCOUNT_LOCKED',message:'Tài khoản đã bị khóa. Vui lòng liên hệ ADMIN (0914.531.591).'};
  }
  return {ok:true,teacher:{maGV:s.maGV,taiKhoan:s.taiKhoan,hoTen:s.hoTen,quyen:s.quyen},loginAt:s.loginAt,expiresAt:s.expiresAt,dayKey:s.dayKey};
}

function logout(token){removeAuthSession_(String(token||'').trim());return {ok:true};}

function doPost(e){
  try{
    var body={};
    if(e&&e.postData&&e.postData.contents)body=JSON.parse(e.postData.contents);
    var action=String(body.action||'').toLowerCase();
    var result;
    if(action==='login'){
      result=teacherLogin(String(body.username||body.taiKhoan||''),String(body.password||body.matKhau||''));
    }else if(action==='validate'){
      result=validateSession(String(body.token||''));
    }else if(action==='logout'){
      result=logout(String(body.token||''));
    }else{
      return ContentService.createTextOutput(JSON.stringify({ok:false,success:false,error:'ACTION_KHONG_HOP_LE',message:'Yêu cầu không hợp lệ.'})).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ok:result.ok===true,success:result.ok===true,data:result,message:result.message||'',code:result.code||''})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({ok:false,success:false,error:String(err&&err.message||err),message:String(err&&err.message||err)})).setMimeType(ContentService.MimeType.JSON);
  }
}
