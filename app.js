const APP_VERSION = 'V1.0.2-BATDAU-CAMERA';
/* SA HÌNH AI — full browser/PWA port of the Python central loop + B01..B13 + KT + THKC. */
const COURSE_DEFS={
 b01:{announce:1,start:111,backupStart:201,name:'Bài 01: Xuất phát',limit:20},
 b02:{announce:2,start:21,backupStart:202,check:22,name:'Bài 02: Dừng xe nhường đường',limit:120,areaMin:1781,areaMax:6781},
 b03:{announce:3,start:31,backupStart:203,check:32,name:'Bài 03: Dừng và khởi hành xe trên dốc',limit:30,areaMin:2049,areaMax:7049,delayClose:20},
 b04:{announce:4,start:41,backupStart:204,end:42,name:'Bài 04: Qua vệt bánh xe và đường vòng vuông góc',limit:120},
 b05:{announce:5,start:51,backupStart:205,name:'Bài 05: Qua ngã tư có tín hiệu điều khiển giao thông',limit:20},
 b06:{announce:6,start:61,backupStart:206,end:62,name:'Bài 06: Đường vòng quanh co',limit:120},
 b07:{announce:7,start:71,backupStart:207,name:'Bài 07: Qua ngã tư có tín hiệu điều khiển giao thông',limit:20},
 b08:{announce:8,start:81,backupStart:208,check:82,name:'Bài 08: Ghép xe dọc vào nơi đỗ',limit:120},
 b09:{announce:9,start:91,backupStart:209,name:'Bài 09: Qua ngã tư có tín hiệu điều khiển giao thông',limit:20},
 b10:{announce:10,start:101,backupStart:210,check:102,name:'Bài 10: Dừng xe nơi đường sắt giao nhau',limit:120,areaMin:12000,areaMax:18000},
 b11:{announce:11,start:112,backupStart:211,end:113,name:'Bài 11: Thay đổi số trên đường thẳng',limit:120,distanceMeters:30},
 b12:{announce:12,start:121,backupStart:212,name:'Bài 12: Ghép xe ngang vào nơi đỗ',limit:120},
 b13:{announce:13,start:131,backupStart:213,name:'Bài 13: Qua ngã tư có tín hiệu điều khiển giao thông',limit:20},
 KT:{announce:14,start:141,backupStart:214,name:'Kết thúc bài thi',limit:999}
};
const ORDER=Object.keys(COURSE_DEFS);
const STABLE_MS=1200,DISTANCE_THRESHOLD=12,AREA_THRESHOLD=1500,ALPHA=.7;
const $=id=>document.getElementById(id);
const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
const now=()=>performance.now();
let video,workCanvas,workCtx,overlay,overlayCtx,adapter;
let engine=null,raf=0,processing=false,detectorErrorShown=false;

// KET NOI DUY NHAT VOI GOOGLE SHEET: dang nhap giao vien.
// Am thanh chay truc tiep tu thu muc PWA, khong qua Google Drive/GAS.
const SAHINH_API_URL = window.SAHINH_API_URL || localStorage.getItem('sahinh_api_url_v1') || '';
const audioMem = new Map();
const AUDIO_COURSE_DIR = {b01:'b01',b02:'b02',b03:'b03',b04:'b04',b05:'b05',b06:'b06',b07:'b07',b08:'b08',b09:'b09',b10:'b10',b11:'b11',b12:'b12',b13:'b13',KT:'KT',thkc:'THKC'};

function speak(text){try{if('speechSynthesis' in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='vi-VN';u.rate=.95;speechSynthesis.speak(u)}}catch(_){} }
function localAudioPath(course,file){
  const c=String(course||'').toLowerCase();
  let name=String(file||'').trim();
  if(!name) return null;
  if(c==='thkc' && name==='THKC.mp3') name='THKC.mp3';
  const key=(name==='baobai.mp3') ? 'shared__baobai.mp3' :
             (name==='batdau.mp3') ? 'shared__batdau.mp3' :
             (c==='thkc'?'thkc':c)+'__'+name;
  const flat={
    "shared__baobai.mp3": "baobai.mp3",
    "shared__batdau.mp3": "batdau.mp3",
    "b09__chuaden.mp3": "b09__chuaden.mp3",
    "b09__dung.mp3": "b09__dung.mp3",
    "b09__quatg1.mp3": "b09__quatg1.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    "b09__quavitri.mp3": "b09__quavitri.mp3",
    "b09__dungxe.mp3": "b09__dungxe.mp3",
    "b09__tutdoc.mp3": "b09__tutdoc.mp3",
    "b09__quatg30.mp3": "b09__quatg30.mp3",
    
    "shared__baobai.mp3": "baobai.mp3",
    
    "b02__chuaden.mp3": "b02__chuaden.mp3",
    "b02__khongdung.mp3": "b02__khongdung.mp3",
    "b02__dung.mp3": "b02__dung.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    "b02__quavitri.mp3": "b02__quavitri.mp3",
    "b02__dungxe.mp3": "b02__dungxe.mp3",
    
    "thkc__THKC.mp3": "thkc__THKC.mp3",
    "thkc__saiquytrinh.mp3": "thkc__saiquytrinh.mp3",
    "b08__chuaden.mp3": "b08__chuaden.mp3",
    "b08__dung.mp3": "b08__dung.mp3",
    "b08__quatg1.mp3": "b08__quatg1.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    "b08__quavitri.mp3": "b08__quavitri.mp3",
    "b08__dungxe.mp3": "b08__dungxe.mp3",
    "b08__tutdoc.mp3": "b08__tutdoc.mp3",
    "b08__quatg30.mp3": "b08__quatg30.mp3",
    
    "shared__baobai.mp3": "baobai.mp3",
    
    "b10__chuaden.mp3": "b10__chuaden.mp3",
    "b10__quagio.mp3": "b10__quagio.mp3",
    "b10__dung.mp3": "b10__dung.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    "b10__quavitri.mp3": "b10__quavitri.mp3",
    "b10__dungxe.mp3": "b10__dungxe.mp3",
    "b10__tutdoc.mp3": "b10__tutdoc.mp3",
    
    "b06__quatg1.mp3": "b06__quatg1.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    
    "b13__chuaden.mp3": "b13__chuaden.mp3",
    "b13__quagio.mp3": "b13__quagio.mp3",
    "b13__dung.mp3": "b13__dung.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    "b13__quavitri.mp3": "b13__quavitri.mp3",
    "b13__dungxe.mp3": "b13__dungxe.mp3",
    "b13__tutdoc.mp3": "b13__tutdoc.mp3",
    
    "b11__chuaden.mp3": "b11__chuaden.mp3",
    "b11__quagio.mp3": "b11__quagio.mp3",
    "b11__dung.mp3": "b11__dung.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    "b11__quavitri.mp3": "b11__quavitri.mp3",
    "b11__thieutoc.mp3": "b11__thieutoc.mp3",
    "b11__dungxe.mp3": "b11__dungxe.mp3",
    "b11__tutdoc.mp3": "b11__tutdoc.mp3",
    
    "b12__chuaden.mp3": "b12__chuaden.mp3",
    "b12__quagio.mp3": "b12__quagio.mp3",
    "b12__dung.mp3": "b12__dung.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    "b12__quavitri.mp3": "b12__quavitri.mp3",
    "b12__dungxe.mp3": "b12__dungxe.mp3",
    "b12__tutdoc.mp3": "b12__tutdoc.mp3",
    
    "kt__chuaden.mp3": "kt__chuaden.mp3",
    "kt__quagio.mp3": "kt__quagio.mp3",
    "kt__hoanthanh.mp3": "kt__hoanthanh.mp3",
    "kt__dung.mp3": "kt__dung.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    "kt__quavitri.mp3": "kt__quavitri.mp3",
    "kt__dungxe.mp3": "kt__dungxe.mp3",
    "kt__tutdoc.mp3": "kt__tutdoc.mp3",
    
    "b01__doilenh.mp3": "b01__doilenh.mp3",
    "qua30s.mp3": "qua30s.mp3",
    "b01_XP.mp3": "b01_XP.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    
    "b03__chuaden.mp3": "b03__chuaden.mp3",
    "b03__quagio.mp3": "b03__quagio.mp3",
    "b03__dung.mp3": "b03__dung.mp3",
    "shared__baobai.mp3": "baobai.mp3",
    "b03__quavitri.mp3": "b03__quavitri.mp3",
    "b03__dungxe.mp3": "b03__dungxe.mp3",
    "b03__tutdoc.mp3": "b03__tutdoc.mp3",
    
    "shared__baobai.mp3": "baobai.mp3",
    
  };
  const f=flat[key];
  return f ? './'+f : null;
}
function preloadLocalAudio(){
  const files=["b09__chuaden.mp3", "b09__dung.mp3", "b09__quatg1.mp3", "baobai.mp3", "b09__quavitri.mp3", "b09__dungxe.mp3", "b09__tutdoc.mp3", "b09__quatg30.mp3", "batdau.mp3", "baobai.mp3", "batdau.mp3", "b02__chuaden.mp3", "b02__khongdung.mp3", "b02__dung.mp3", "baobai.mp3", "b02__quavitri.mp3", "b02__dungxe.mp3", "batdau.mp3", "thkc__THKC.mp3", "thkc__saiquytrinh.mp3", "b08__chuaden.mp3", "b08__dung.mp3", "b08__quatg1.mp3", "baobai.mp3", "b08__quavitri.mp3", "b08__dungxe.mp3", "b08__tutdoc.mp3", "b08__quatg30.mp3", "batdau.mp3", "baobai.mp3", "batdau.mp3", "b10__chuaden.mp3", "b10__quagio.mp3", "b10__dung.mp3", "baobai.mp3", "b10__quavitri.mp3", "b10__dungxe.mp3", "b10__tutdoc.mp3", "batdau.mp3", "b06__quatg1.mp3", "baobai.mp3", "batdau.mp3", "b13__chuaden.mp3", "b13__quagio.mp3", "b13__dung.mp3", "baobai.mp3", "b13__quavitri.mp3", "b13__dungxe.mp3", "b13__tutdoc.mp3", "batdau.mp3", "b11__chuaden.mp3", "b11__quagio.mp3", "b11__dung.mp3", "baobai.mp3", "b11__quavitri.mp3", "b11__thieutoc.mp3", "b11__dungxe.mp3", "b11__tutdoc.mp3", "batdau.mp3", "b12__chuaden.mp3", "b12__quagio.mp3", "b12__dung.mp3", "baobai.mp3", "b12__quavitri.mp3", "b12__dungxe.mp3", "b12__tutdoc.mp3", "batdau.mp3", "kt__chuaden.mp3", "kt__quagio.mp3", "kt__hoanthanh.mp3", "kt__dung.mp3", "baobai.mp3", "kt__quavitri.mp3", "kt__dungxe.mp3", "kt__tutdoc.mp3", "batdau.mp3", "b01__doilenh.mp3", "qua30s.mp3", "b01_XP.mp3", "baobai.mp3", "batdau.mp3", "b03__chuaden.mp3", "b03__quagio.mp3", "b03__dung.mp3", "baobai.mp3", "b03__quavitri.mp3", "b03__dungxe.mp3", "b03__tutdoc.mp3", "batdau.mp3", "baobai.mp3", "batdau.mp3"];
  files.forEach(src=>{const a=new Audio('./'+src);a.preload='auto';});
}
async function playDirect(course,file,fallback=''){
  let src=localAudioPath(course,file);
  // Mot so file dac biet chi co o thu muc KT/THKC.
  if(file==='hoanthanh.mp3') src='./kt__hoanthanh.mp3';
  if(file==='THKC.mp3') src='./thkc__THKC.mp3';
  if(file==='quagio.mp3' && course==='b01') src='./b10__quagio.mp3';
  if(!src){if(fallback)speak(fallback);return;}
  try{
    let a=audioMem.get(src);
    if(!a){a=new Audio(src);a.preload='auto';audioMem.set(src,a);}
    a.currentTime=0;
    await a.play();
  }catch(e){console.warn('Audio local:',src,e);if(fallback)speak(fallback);}
}
function play(course,file,fallback){playDirect(course,file,fallback);}

async function apiPost(body){
  if(!SAHINH_API_URL) throw Error('Chua cau hinh URL Google Apps Script de dang nhap giao vien');
  const r=await fetch(SAHINH_API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});
  if(!r.ok) throw Error('API HTTP '+r.status);
  return await r.json();
}
function event(type,data={}){if(!engine)return;engine.events.push({at:new Date().toISOString(),type,...data});persist();}
function persist(){if(engine)localStorage.setItem('sahinh_exam_v2',JSON.stringify(engine));}
function alertMsg(text,ms=3500){const e=$('alert');e.textContent=text;e.classList.remove('hidden');clearTimeout(alertMsg.t);alertMsg.t=setTimeout(()=>e.classList.add('hidden'),ms)}
function clearOverlay(){if(!overlayCtx)return;overlayCtx.clearRect(0,0,overlay.width,overlay.height)}
function drawDetections(ds){
  if(!overlayCtx||!video.videoWidth)return;
  overlay.width=video.videoWidth;overlay.height=video.videoHeight;clearOverlay();
  // Khung định vị TAG: luôn hiện để người lái đưa TAG vào đúng vùng quét.
  const cx=overlay.width/2,cy=overlay.height/2;
  const fw=Math.min(overlay.width*.58,520),fh=Math.min(overlay.height*.58,420);
  overlayCtx.lineWidth=4;overlayCtx.strokeStyle='rgba(0,229,255,.9)';
  overlayCtx.strokeRect(cx-fw/2,cy-fh/2,fw,fh);
  overlayCtx.font='bold 22px system-ui';overlayCtx.fillStyle='rgba(0,229,255,.95)';
  overlayCtx.fillText('ĐƯA TAG VÀO KHUNG',Math.max(12,cx-fw/2),Math.max(28,cy-fh/2-10));
  overlayCtx.lineWidth=Math.max(3,video.videoWidth/500);overlayCtx.font='bold 28px system-ui';
  for(const d of ds){
    const pts=d.corners;
    if(pts.length===4){
      overlayCtx.beginPath();overlayCtx.moveTo(pts[0][0],pts[0][1]);
      for(let i=1;i<4;i++)overlayCtx.lineTo(pts[i][0],pts[i][1]);
      overlayCtx.closePath();overlayCtx.strokeStyle='#00ff66';overlayCtx.stroke();
    }
    overlayCtx.fillStyle='#00ff66';
    overlayCtx.fillText('TAG '+String(d.id),d.center.x+10,d.center.y-10);
  }
}

async function openCamera(){
  if(!window.isSecureContext){set('cameraMsg','Camera cần HTTPS.');return false}
  if(!navigator.mediaDevices?.getUserMedia){set('cameraMsg','Trình duyệt không hỗ trợ camera.');return false}
  try{
    if(video.srcObject)return true;
    let stream;
    try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})}
    catch(_){stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})}
    video.srcObject=stream;await video.play();set('cameraMsg','');$('cameraMsg').style.display='none';set('status','CAMERA OK');return true;
  }catch(e){set('cameraMsg','Không mở được camera sau: '+(e.message||e.name));set('status','LỖI CAMERA');return false}
}
function stopCamera(){if(video?.srcObject){video.srcObject.getTracks().forEach(t=>t.stop());video.srcObject=null}if($('cameraMsg')){$('cameraMsg').style.display='grid';set('cameraMsg','Camera đã dừng')}if(engine?.result==='RUNNING'){event('CAMERA_STOPPED')}set('status','CHỜ THI')}

class CourseRule{
 constructor(key){this.key=key;this.d={...COURSE_DEFS[key]};this.reset()}
 reset(){this.state=0;this.is_finished=false;this.startedAt=0;this.areaHistory=[];this.cachedArea=0;this.warnedTimeout=false;this.warnedRollback=false;this.stopFrameCount=0;this.lastCx=-1;this.lastCy=-1;this.delayAt=0;this.distanceMeters=this.d.distanceMeters||30;this.result=null;this.commandPlayed=false;this.total18StartAt=0;this.total18DeadlineAt=0}
 init(t){this.reset();this.loadCalib();if(this.key==='b01'){this.startedAt=t;this.state=1;this.audio('doilenh.mp3','Xin hãy đợi lệnh xuất phát')}else{play(this.key,'baobai.mp3',this.d.name)}event('COURSE_INIT',{course:this.key});}
 loadCalib(){try{const c=JSON.parse(localStorage.getItem('sahinh_calib_'+this.key)||'null');if(c){if(c.areaMin)this.d.areaMin=c.areaMin;if(c.areaMax)this.d.areaMax=c.areaMax;}}catch(_){} }
 audio(file,text){play(this.key,file,text)}
 elapsed(t=Date.now()){return this.startedAt?((t-this.startedAt)/1000):0}
 matchesStart(tag){ return tag===this.d.start || tag===this.d.backupStart; }
 process(tag,area,visible,center,t){
   const sec=t/1000;
   if(this.key==='b01')return this.b01(tag,visible,t);
   if(this.key==='b02')return this.b02(tag,area,visible,t);
   if(this.key==='b03')return this.b03(tag,area,visible,t);
   if(this.key==='b04'||this.key==='b06')return this.simpleTimed(tag,visible,t);
   if(['b05','b07','b09','b12','b13'].includes(this.key))return this.instant(tag,visible,t);
   if(this.key==='b08')return this.b08(tag,visible,t);
   if(this.key==='b10')return this.b10(tag,area,visible,center,t);
   if(this.key==='b11')return this.b11(tag,visible,t);
   if(this.key==='KT')return this.kt(tag,visible,t);
   return null;
 }
 b01(tag,visible,t){
   // B01: TAG 01 -> lệnh chờ -> khóa TAG 20s -> XP -> mở cửa sổ TAG 111 trong 30s.
   if(this.state===1){
     if(t-this.startedAt<20000) return 'WAIT_20S';
     if(!this.commandPlayed){
       // Âm thanh XP riêng của B01.
       this.audio('b01_XP.mp3','Lệnh xuất phát');
        this.total18StartAt=t;
        this.total18DeadlineAt=t+18*60*1000;
       this.commandPlayed=true;
       event('B01_XP_COMMAND',{afterMs:Math.round(t-this.startedAt)});
       this.state=2;
       this.startedAt=t; // bắt đầu bộ đếm 30s sau lệnh XP
     }
   }
   if(this.state===2){
     if(this.matchesStart(tag)&&visible){
       this.audio('batdau.mp3','Bính bong');
       event('B01_TAG_111_START',{tag});
       this.finish('PASS','Bài 01 hoàn thành');
       return 'FINISHED';
     }
     if(t-this.startedAt>=30000){
       this.audio('qua30s.mp3','Quá 30 giây chưa thấy TAG 111');
       event('B01_TAG_111_TIMEOUT',{afterMs:Math.round(t-this.startedAt)});
       this.finish('TIMEOUT','Không thấy TAG 111 trong 30 giây');
       return 'TIMEOUT_30S';
     }
   }
   return 'WAITING';
 }
 simpleTimed(tag,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3','Bính bong');this.state=1;this.startedAt=t;return}if(this.state===1){if(t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3','Quá thời gian bài thi');this.warnedTimeout=true;this.finish('TIMEOUT','Quá thời gian')}}if(this.d.end&&tag===this.d.end&&visible)this.finish('PASS','Hoàn thành bài')} }
 instant(tag,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3','Bính bong');this.finish('PASS','Hoàn thành bài');this.state=1}}
 b02(tag,area,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3','Bính bong');this.state=1;this.startedAt=t;return}if(this.state===1){if(t-this.startedAt>=this.d.limit*1000){this.audio('qua 20s.mp3','Quá thời gian');this.startedAt=t}if(tag===22&&visible)this.cachedArea=area}}
 b03(tag,area,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3','Bính bong');this.state=1;this.startedAt=t;return}if(this.state===1){if(t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3','Quá thời gian bài thi');this.warnedTimeout=true;this.startedAt=t}}if(tag===32&&visible){this.areaHistory.push(area);if(this.areaHistory.length>15)this.areaHistory.shift();this.rollback(area)}}else if(this.state===2){if(tag===32&&visible){this.areaHistory.push(area);if(this.areaHistory.length>15)this.areaHistory.shift();this.rollback(area)}const e=t-this.delayAt;if(e>=20000&&!this.warnedTimeout&&tag===32&&visible){this.audio('quagio.mp3','Quá 20 giây chưa khởi hành qua khỏi dốc');this.warnedTimeout=true}if(e>=20000)this.finish('PASS','Hết thời gian giám sát dốc') }}
 rollback(area){if(this.areaHistory.length>=5&&!this.warnedRollback){const avg=this.areaHistory.slice(0,-1).reduce((a,b)=>a+b,0)/(this.areaHistory.length-1);if(area<avg*.9){this.audio('tutdoc.mp3','Cảnh báo, xe bị tụt dốc');this.warnedRollback=true;event('FAULT',{course:this.key,code:'TUT_DOC'})}}}
 b08(tag,visible,t){if((this.state===1||this.state===2)&&this.startedAt&&t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3','Quá thời gian bài thi');this.warnedTimeout=true;this.finish('TIMEOUT','Quá thời gian bài 8');this.state=3}return}if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3','Bính bong');this.startedAt=t;this.state=1}else if(this.state===1&&tag===82&&visible){this.audio('dung.mp3','Tun');this.state=2}else if(this.state===2&&this.matchesStart(tag)&&visible){this.finish('PASS','Hoàn thành bài 8');this.state=3}}
 b10(tag,area,visible,center,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3','Bính bong');this.startedAt=t;this.state=1;return 'LOCK_NO_TAG'}if(this.state===1){if(t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3','Quá thời gian bài thi');this.warnedTimeout=true;this.finish('TIMEOUT','Quá thời gian bài 10')}return 'FINISHED'}if(tag===102&&visible){this.areaHistory.push(area);if(this.areaHistory.length>20)this.areaHistory.shift();if(area>=this.d.areaMin*.7){const dist=this.lastCx<0?0:Math.hypot(center.x-this.lastCx,center.y-this.lastCy);this.lastCx=center.x;this.lastCy=center.y;if(dist<8)this.stopFrameCount++;else this.stopFrameCount=0;if(this.stopFrameCount>=45){this.stopFrameCount=0;return 'ALLOW_COUNT'}}else this.stopFrameCount=0;return 'LOCK_AREA'}return 'LOCK_NO_TAG'}return 'FINISHED'}
 b11(tag,visible,t){if(this.state===1&&t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3','Quá thời gian bài thi');this.warnedTimeout=true;this.finish('TIMEOUT','Quá thời gian bài 11')}return}if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3','Bính bong');this.startedAt=t;this.state=1}else if(this.state===1&&tag===113&&visible){const duration=Math.max(.1,(t-this.startedAt)/1000),speed=(this.distanceMeters/duration)*3.6;this.result=speed>=25?'PASS':'LOW_SPEED';this.audio(speed>=25?'tunv.mp3':'thieutoc.mp3',speed>=25?'Tunv':'Sai tốc độ quy định');event('SPEED_RESULT',{course:'b11',speedKmh:Number(speed.toFixed(1)),duration:Number(duration.toFixed(2))});this.finish(this.result,speed>=25?'Đạt tốc độ':'Sai tốc độ');this.state=2}}
 kt(tag,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3','Bính bong');this.startedAt=t;this.state=1}else if(this.state===1&&t-this.startedAt>=5000){this.audio('hoanthanh.mp3','Bạn đã kết thúc bài tập sa hình');this.finish('FINAL','Hoàn thành sa hình');this.state=2}}
 checkTarget(area){if(this.is_finished)return;if(this.key==='b02'){const a=this.cachedArea>0?this.cachedArea:area;this.areaResult(a)}else if(this.key==='b03'&&this.state===1){const a=this.areaHistory.length?this.areaHistory.reduce((x,y)=>x+y,0)/this.areaHistory.length:area;this.areaResult(a);this.state=2;this.delayAt=performance.now();this.warnedRollback=false;this.warnedTimeout=false}else if(this.key==='b10'&&this.state===1){const a=this.areaHistory.length?this.areaHistory.reduce((x,y)=>x+y,0)/this.areaHistory.length:area;this.areaResult(a);this.state=2}}
 areaResult(a){let result='PASS';if(a<this.d.areaMin){result='EARLY';this.audio('chuaden.mp3','Dừng xe chưa đến vị trí')}else if(a<=this.d.areaMax){this.audio('dung.mp3','Dừng xe chính xác')}else{result='LATE';this.audio('quavitri.mp3','Dừng xe quá vị trí')}this.result=result;event('TARGET_RESULT',{course:this.key,area:Math.round(a),areaMin:this.d.areaMin,areaMax:this.d.areaMax,result});}
 finish(result='PASS',message='Hoàn thành'){if(this.is_finished)return;this.result=result;this.is_finished=true;event('COURSE_COMPLETED',{course:this.key,result,message});set('status',result==='PASS'||result==='FINAL'?'ĐẠT':'CẢNH BÁO');}
}

class ExamEngine{
 constructor(){this.rules=ORDER.map(k=>new CourseRule(k));this.ruleByKey=Object.fromEntries(this.rules.map(r=>[r.key,r]));this.current=null;this.index=-1;this.lastAnnounce=-1;this.lastChecked=-1;this.lastCx=-1;this.lastCy=-1;this.lastArea=0;this.stableAt=0;this.result='RUNNING';this.startedAt=Date.now();this.events=[];this.emergencySpot=this.nextEmergencySpot();this.emergencyTriggered=false;this.emergencyPendingAt=0;this.tagLockUntil=0;this.totalElapsed=0;this.b01CommandAt=0;this.b01DeadlineAt=0;}
 nextEmergencySpot(){const spots=['b05','b10','b12'];let i=Number(localStorage.getItem('sahinh_thkc_index_v2')||0);localStorage.setItem('sahinh_thkc_index_v2',String((i+1)%spots.length));return spots[i%spots.length]}
 announce(id,t){if(t<this.tagLockUntil)return false;const idx=ORDER.findIndex(k=>COURSE_DEFS[k].announce===id);if(idx<0)return false;if(this.index>=0&&idx!==this.index+1)return false;if(id===this.lastAnnounce)return false;const key=ORDER[idx];this.index=idx;this.current=this.ruleByKey[key];this.current.init(t);this.lastAnnounce=id;this.lastChecked=-1;this.lastCx=this.lastCy=-1;this.lastArea=0;this.stableAt=0;set('course',key.toUpperCase());event('COURSE_ANNOUNCED',{course:key,tag:id});if(key===this.emergencySpot&&!this.emergencyTriggered){this.emergencyPendingAt=t+5000;event('THKC_SCHEDULED',{course:key,delayMs:5000})}
   if(key==='b01'){
     this.tagLockUntil=t+20000;
     this.b01CommandAt=t+20000;
     set('status','B01 — XIN HÃY ĐỢI LỆNH XUẤT PHÁT (20s)');
     set('courseTimer','20s');
   }
   return true}
 handle(d,t){
   if(this.result!=='RUNNING')return;
   const id=d.id;
   set('tag',id);
   if(t<this.tagLockUntil) return;
   this.announce(id,t);
   if(!this.current)return;
   const key=this.current.key;
   const ret=this.current.process(id,d.area,true,d.center,t);if(this.current.d.check===id||COURSE_DEFS[key].check===id){const moved=this.lastCx<0?0:Math.hypot(d.center.x-this.lastCx,d.center.y-this.lastCy),ad=Math.abs(d.area-this.lastArea);this.lastCx=d.center.x;this.lastCy=d.center.y;this.lastArea=d.area;if(moved<DISTANCE_THRESHOLD&&ad<AREA_THRESHOLD){if(!this.stableAt)this.stableAt=t;const stable=t-this.stableAt;set('stable',`${(stable/1000).toFixed(1)}s`);if(stable>=STABLE_MS&&this.lastChecked!==id){this.lastChecked=id;this.current.checkTarget(d.area);this.stableAt=0}}else this.stableAt=0}
   if(this.current.is_finished){const finished=this.current.key;if(finished==='KT'){this.result='COMPLETED';this.totalElapsed=Date.now()-this.startedAt;event('EXAM_COMPLETED',{elapsedMs:this.totalElapsed,result:'COMPLETED'});set('status','HOÀN THÀNH');alertMsg('🏆 HOÀN THÀNH SA HÌNH',7000);set('course','HOÀN THÀNH');this.current=null;const sb=$('startBtn');if(sb){sb.textContent='🔄 THI LẠI';sb.disabled=false;sb.classList.remove('running')}}else{set('status',this.current.result==='PASS'?'ĐẠT':'CÓ LỖI');this.current=null}}
 }
  resetToB01(){
    this.rules=ORDER.map(k=>new CourseRule(k));
    this.ruleByKey=Object.fromEntries(this.rules.map(r=>[r.key,r]));
    this.index=-1;
    this.current=null;
    this.finished=false;
    this.tagLockUntil=0;
    this.b01CommandAt=0;
    this.b01DeadlineAt=0;
    this.total18StartAt=0;
    this.total18DeadlineAt=0;
    set('status','SẴN SÀNG — BẮT ĐẦU LẠI TỪ BÀI 01');
    set('tag','--');
    set('courseTimer','--');
    set('totalTimer','18:00');
    event('RESET_TO_B01',{});
  }

  update(t){
   if(this.result!=='RUNNING')return;
   if(this.b01CommandAt&&t>=this.b01CommandAt&&this.current?.key==='b01'&&this.current.state===1){
     // Hết 20s: phát XP và chuyển sang cửa sổ chờ TAG 111 = 30s.
     this.current.b01(null,true,t);
     this.b01CommandAt=0;
     this.tagLockUntil=0;
     set('status','🟢 ĐÃ PHÁT LỆNH XUẤT PHÁT — CHỜ TAG 111 (30s)');
     set('courseTimer','30s');
   }
   if(this.current?.key==='b01'&&this.current.state===2&&this.current.startedAt){
     const elapsed=t-this.current.startedAt;
     const remain=Math.max(0,30000-elapsed);
     set('courseTimer',`${Math.ceil(remain/1000)}s`);
     // Hết 30s phải xử lý ngay cả khi camera không nhìn thấy TAG 111.
     if(elapsed>=30000&&!this.current.is_finished){
       this.current.audio('qua30s.mp3','Quá 30 giây chưa thấy TAG 111');
       event('B01_TAG_111_TIMEOUT',{afterMs:Math.round(elapsed)});
       this.current.finish('TIMEOUT','Không thấy TAG 111 trong 30 giây');
       this.current=null;
       this.tagLockUntil=0;
       this.b01DeadlineAt=0;
       set('status','🔴 B01 — QUÁ 30 GIÂY, KHÔNG THẤY TAG 111');
       set('courseTimer','HẾT GIỜ');
       return;
     }
     return;
   }
   if(this.emergencyPendingAt&&t>=this.emergencyPendingAt&&!this.emergencyTriggered){this.emergencyPendingAt=0;this.emergencyTriggered=true;this.tagLockUntil=t+10000;event('THKC_TRIGGERED',{spot:this.emergencySpot});alertMsg('🚨 TÌNH HUỐNG KHẨN CẤP — DỪNG XE NGAY',10000);play('THKC','THKC.mp3','CÒI KHẨN CẤP — DỪNG XE NGAY');}
   set('timer',fmt(Date.now()-this.startedAt));
   if(this.current?.key==='b01'&&this.current.total18DeadlineAt){
    const remain=Math.max(0,this.current.total18DeadlineAt-t);
    const mm=Math.floor(remain/60000);
    const ss=Math.ceil((remain%60000)/1000);
    set('totalTimer',`${mm}:${String(ss).padStart(2,'0')}`);
    if(remain<=0){
      event('B01_TOTAL_18MIN_TIMEOUT',{afterMs:18*60*1000});
      this.current.finish('TIMEOUT','Hết tổng thời gian 18 phút');
      this.current=null;
      set('status','HẾT TỔNG THỜI GIAN 18 PHÚT');
    }
  }
  if(this.current&&this.current.startedAt){const remain=Math.max(0,this.current.d.limit*1000-(t-this.current.startedAt));set('courseTimer',`${Math.ceil(remain/1000)}s`)}
 }
}
function fmt(ms){const s=Math.floor(ms/1000),m=Math.floor(s/60),ss=s%60;return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`}

async function startExam(){if(!window.currentTeacher){alertMsg('Chưa đăng nhập giáo viên');return}if(engine&&engine.result==='RUNNING')return;if(!await openCamera())return;engine=new ExamEngine();detectorErrorShown=false;const sb=$('startBtn');if(sb){sb.textContent='🔴 ĐANG THI';sb.disabled=true;sb.classList.add('running')}set('status','ĐANG THI — BẮT ĐẦU QUÉT APRILTAG');set('course','WAITING');set('tag','--');set('timer','00:00');set('stable','0.0s');persist();event('EXAM_STARTED',{teacher:window.currentTeacher});alertMsg('🚗 BẮT ĐẦU BÀI THI');}
function finishLocal(){if(engine){event('EXAM_STOPPED',{result:'STOPPED'});engine.result='STOPPED';persist()}stopCamera();const sb=$('startBtn');if(sb){sb.textContent='🔄 THI LẠI';sb.disabled=false;sb.classList.remove('running')}}
async function loop(t){
  if(video&&video.readyState>=2&&engine&&adapter?.ready&&!processing){
    processing=true;
    try{
      workCanvas.width=video.videoWidth||640;
      workCanvas.height=video.videoHeight||360;
      workCtx.drawImage(video,0,0,workCanvas.width,workCanvas.height);
      const ds=await adapter.detectFrame(workCanvas);
      drawDetections(ds);
      set('status', ds.length ? 'NHẬN TAG '+ds[0].id : 'ĐANG QUÉT APRILTAG...');
      if(ds.length){
        const d=ds[0];
        engine.handle(d,t);
      }
    }catch(e){
      console.error('AprilTag detect error:',e);
      if(!detectorErrorShown){
        detectorErrorShown=true;
        set('status','LỖI NHẬN TAG: '+(e?.message||e));
        alertMsg('Lỗi bộ nhận diện AprilTag: '+(e?.message||e),8000);
      }
    }finally{processing=false}
  }
  if(engine)engine.update(t);
  raf=requestAnimationFrame(loop)
}

document.addEventListener('DOMContentLoaded',async()=>{
  video=$('video');overlay=$('overlay');overlayCtx=overlay.getContext('2d');workCanvas=document.createElement('canvas');workCtx=workCanvas.getContext('2d',{willReadFrequently:true});
  const KEY='sahinh_teacher_session_v1';
  const id=x=>document.getElementById(x);
  function show(t){id('loginOverlay').style.display=t?'none':'flex';id('userBox').style.display=t?'block':'none';id('startBtn').style.display=t?'block':'none';if(t){id('teacherName').textContent='Xin chào, '+(t.hoTen||t.name||'Giáo viên');id('teacherCode').textContent=' • '+(t.maGV||t.code||'')}}
  async function doLogin(){
    const u=id('loginUser').value.trim(),p=id('loginPass').value,e=id('loginError');
    if(!u||!p){e.textContent='Nhập tài khoản và mật khẩu.';e.style.display='block';return}
    try{
      const d=await apiPost({action:'login',taiKhoan:u,matKhau:p});
      if(!d.success)throw Error(d.message||'Đăng nhập thất bại');
      const teacher=d.teacher||d.data||d;teacher.loginAt=Date.now();localStorage.setItem(KEY,JSON.stringify(teacher));window.currentTeacher=teacher;show(teacher);e.style.display='none';
    }catch(x){e.textContent=x.message||'Đăng nhập thất bại';e.style.display='block'}
  }
  id('loginBtn').onclick=doLogin;id('loginPass').onkeydown=e=>{if(e.key==='Enter')doLogin()};
  id('logoutBtn').onclick=()=>{localStorage.removeItem(KEY);window.currentTeacher=null;finishLocal();show(null)};
  window.addEventListener('online',()=>set('net','● ONLINE'));window.addEventListener('offline',()=>set('net','● OFFLINE'));
  set('net',navigator.onLine?'● ONLINE':'● OFFLINE');
  // Am thanh la file noi bo cua PWA, khong dong bo tu Drive.
  preloadLocalAudio();
  // Chi goi Google Apps Script khi giao vien dang nhap.
  try{const t=JSON.parse(localStorage.getItem(KEY)||'null');if(t){window.currentTeacher=t;show(t);setTimeout(autoStartExam,150)}else show(null)}catch(_){show(null)}
  $('startBtn').onclick=startExam;$('stopCamera').onclick=finishLocal;
  // BẢN AUTO: đăng nhập xong hoặc có phiên giáo viên -> tự mở camera và bắt đầu quét TAG.
  async function autoStartExam(){
    if(!window.currentTeacher || (engine&&engine.result==='RUNNING')) return;
    await startExam();
  }
  try{adapter=new AprilTagAdapter();await adapter.init();set('status','SẴN SÀNG — AprilTag 36h11')}catch(e){console.error(e);set('status','LỖI APRILTAG');alertMsg(e.message,7000)}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
  raf=requestAnimationFrame(loop);
});

window.resetToB01 = function(){
  try{
    if(window.engine && typeof window.engine.resetToB01==='function'){
      window.engine.resetToB01();
      return;
    }
    location.reload();
  }catch(e){ location.reload(); }
};

window.APP_VERSION=APP_VERSION;
