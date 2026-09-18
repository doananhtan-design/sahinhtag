/* SA HÌNH AI — full browser/PWA port of the Python central loop + B01..B13 + KT + THKC. */
const DEPLOY_VERSION='V1.1.7-B01-MP3-ONLY';
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
let engine=null,raf=0,processing=false;

// KET NOI DUY NHAT VOI GOOGLE SHEET: dang nhap giao vien.
// Am thanh chay truc tiep tu thu muc PWA, khong qua Google Drive/GAS.
const SAHINH_API_URL = window.SAHINH_API_URL || localStorage.getItem('sahinh_api_url_v1') || '';
const audioMem = new Map();
let audioUnlocked = false;
let activeAudio = null;
const AUDIO_COURSE_DIR = {b01:'b01',b02:'b02',b03:'b03',b04:'b04',b05:'b05',b06:'b06',b07:'b07',b08:'b08',b09:'b09',b10:'b10',b11:'b11',b12:'b12',b13:'b13',KT:'KT',thkc:'THKC'};

function localAudioPath(course,file){
  const c=String(course||'').toLowerCase();
  const dir=AUDIO_COURSE_DIR[c] || (c==='thkc'?'THKC':null);
  if(!dir) return null;
  let name=String(file||'').trim();
  if(!name) return null;
  // THKC dung file rieng.
  if(c==='thkc') name='THKC.mp3';
  const p=`./audio/${dir}/${name}`;
  return p;
}
async function unlockAudio(){
  if(audioUnlocked) return true;
  const files=['doilenh.mp3','baobai.mp3','batdau.mp3','qua30s.mp3'];
  let ok=true;
  for(const f of files){
    const src=`./audio/b01/${f}`;
    try{
      let a=audioMem.get(src);
      if(!a){a=new Audio();a.preload='auto';a.src=src;a.playsInline=true;audioMem.set(src,a);}
      a.muted=true;
      await a.play();
      a.pause();
      a.currentTime=0;
      a.muted=false;
    }catch(e){
      ok=false;
      reportAudioError(src,e,'Không mở được file MP3 khi khởi tạo');
    }
  }
  audioUnlocked=ok;
  return ok;
}
function preloadLocalAudio(){
  const list=[];
  for(const c of Object.keys(AUDIO_COURSE_DIR)){
    if(c==='thkc') continue;
    const dir=AUDIO_COURSE_DIR[c];
    for(const f of ['baobai.mp3','batdau.mp3','dung.mp3','chuaden.mp3','quavitri.mp3','dungxe.mp3','tutdoc.mp3','quagio.mp3','quatg1.mp3','quatg30.mp3','thieutoc.mp3','tunv.mp3','doilenh.mp3']) list.push(`./audio/${dir}/${f}`);
    if(c==='b01'){
      list.push('./audio/b01/qua30s.mp3');
    }
  }
  list.push('./audio/THKC/THKC.mp3','./audio/THKC/saiquytrinh.mp3','./audio/KT/hoanthanh.mp3');
  [...new Set(list)].forEach(src=>{const a=new Audio();a.preload='auto';a.src=src;});
}
function reportAudioError(src, err, note=''){
  const code = err?.name || 'AudioError';
  const msg = `❌ LỖI ÂM THANH: ${src} — ${code}${note ? ` — ${note}` : ''}`;
  console.error(msg, err || '');
  try{
    set('status', msg);
    set('alert', msg);
    event('AUDIO_ERROR',{src,code,note});
  }catch(_){}
}
async function playDirect(course,file){
  let src=localAudioPath(course,file);
  if(file==='hoanthanh.mp3') src='./audio/KT/hoanthanh.mp3';
  if(file==='THKC.mp3') src='./audio/THKC/THKC.mp3';
  if(!src){
    reportAudioError(`./audio/${course}/${file}`, null, 'Sai đường dẫn hoặc chưa cấu hình thư mục audio');
    return false;
  }
  try{
    let a=audioMem.get(src);
    if(!a){
      a=new Audio();
      a.preload='auto';
      a.playsInline=true;
      a.src=src;
      audioMem.set(src,a);
    }
    if(activeAudio && activeAudio!==a){
      try{activeAudio.pause();activeAudio.currentTime=0;}catch(_){}
    }
    activeAudio=a;
    a.currentTime=0;
    a.muted=false;
    await a.play();
    set('status', `🔊 ĐANG PHÁT: ${src}`);
    return true;
  }catch(e){
    reportAudioError(src,e,'Kiểm tra file MP3 và đường dẫn trên GitHub Pages');
    return false;
  }
}
function play(course,file){return playDirect(course,file);}
function initGasConfig(){
  const input=$('gasUrl'), btn=$('saveGasBtn');
  if(input) input.value=SAHINH_API_URL||'';
  if(btn) btn.onclick=()=>{
    const v=String(input?.value||'').trim();
    if(!v){alertMsg('Chưa nhập URL Google Apps Script');return;}
    localStorage.setItem('sahinh_api_url_v1',v);
    window.SAHINH_API_URL=v;
    alertMsg('Đã lưu kết nối Google Sheet / Apps Script');
  };
}
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
  overlayCtx.lineWidth=Math.max(3,video.videoWidth/500);overlayCtx.font='bold 26px system-ui';
  for(const d of ds){const pts=d.corners;if(pts.length===4){overlayCtx.beginPath();overlayCtx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<4;i++)overlayCtx.lineTo(pts[i][0],pts[i][1]);overlayCtx.closePath();overlayCtx.strokeStyle='#00e5ff';overlayCtx.stroke();}overlayCtx.fillStyle='#00e5ff';overlayCtx.fillText(String(d.id),d.center.x+10,d.center.y-10)}
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
 init(t){this.reset();this.loadCalib();if(this.key==='b01'){this.startedAt=t;this.state=1;this.audio('doilenh.mp3')}else{play(this.key,'baobai.mp3',this.d.name)}event('COURSE_INIT',{course:this.key});}
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
   if(this.state===1){
     if(t-this.startedAt<20000)return 'LOCKED_20S';
     if(!this.commandPlayed){
       this.audio('baobai.mp3');
       this.commandPlayed=true;
       this.state=2;
       this.startedAt=t;
       // TỔNG 18 PHÚT bắt đầu đúng thời điểm phát baobai.mp3.
       this.total18StartAt=t;
       this.total18DeadlineAt=t+18*60*1000;
       set('totalTimer','18:00');
       set('startBtn','⏱ 18:00');
       event('B01_BA0BAI_COMMAND',{afterMs:20000,totalLimitMs:18*60*1000});
     }
   }
   if(this.state===2){
     if(tag===111&&visible){
       this.audio('batdau.mp3');
       event('B01_TAG_111_START',{tag});
       this.finish('PASS','Bài 01 hoàn thành');
       return 'FINISHED';
     }
     if(t-this.startedAt>=30000){
       this.audio('qua30s.mp3');
       event('B01_TAG_111_TIMEOUT',{afterMs:30000});
       this.finish('TIMEOUT','Không thấy TAG 111 trong 30 giây');
       return 'TIMEOUT_30S';
     }
   }
   return 'WAITING';
 }
 simpleTimed(tag,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3');this.state=1;this.startedAt=t;return}if(this.state===1){if(t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3');this.warnedTimeout=true;this.finish('TIMEOUT','Quá thời gian')}}if(this.d.end&&tag===this.d.end&&visible)this.finish('PASS','Hoàn thành bài')} }
 instant(tag,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3');this.finish('PASS','Hoàn thành bài');this.state=1}}
 b02(tag,area,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3');this.state=1;this.startedAt=t;return}if(this.state===1){if(t-this.startedAt>=this.d.limit*1000){this.audio('qua 20s.mp3');this.startedAt=t}if(tag===22&&visible)this.cachedArea=area}}
 b03(tag,area,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3');this.state=1;this.startedAt=t;return}if(this.state===1){if(t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3');this.warnedTimeout=true;this.startedAt=t}}if(tag===32&&visible){this.areaHistory.push(area);if(this.areaHistory.length>15)this.areaHistory.shift();this.rollback(area)}}else if(this.state===2){if(tag===32&&visible){this.areaHistory.push(area);if(this.areaHistory.length>15)this.areaHistory.shift();this.rollback(area)}const e=t-this.delayAt;if(e>=20000&&!this.warnedTimeout&&tag===32&&visible){this.audio('quagio.mp3');this.warnedTimeout=true}if(e>=20000)this.finish('PASS','Hết thời gian giám sát dốc') }}
 rollback(area){if(this.areaHistory.length>=5&&!this.warnedRollback){const avg=this.areaHistory.slice(0,-1).reduce((a,b)=>a+b,0)/(this.areaHistory.length-1);if(area<avg*.9){this.audio('tutdoc.mp3');this.warnedRollback=true;event('FAULT',{course:this.key,code:'TUT_DOC'})}}}
 b08(tag,visible,t){if((this.state===1||this.state===2)&&this.startedAt&&t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3');this.warnedTimeout=true;this.finish('TIMEOUT','Quá thời gian bài 8');this.state=3}return}if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3');this.startedAt=t;this.state=1}else if(this.state===1&&tag===82&&visible){this.audio('dung.mp3');this.state=2}else if(this.state===2&&this.matchesStart(tag)&&visible){this.finish('PASS','Hoàn thành bài 8');this.state=3}}
 b10(tag,area,visible,center,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3');this.startedAt=t;this.state=1;return 'LOCK_NO_TAG'}if(this.state===1){if(t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3');this.warnedTimeout=true;this.finish('TIMEOUT','Quá thời gian bài 10')}return 'FINISHED'}if(tag===102&&visible){this.areaHistory.push(area);if(this.areaHistory.length>20)this.areaHistory.shift();if(area>=this.d.areaMin*.7){const dist=this.lastCx<0?0:Math.hypot(center.x-this.lastCx,center.y-this.lastCy);this.lastCx=center.x;this.lastCy=center.y;if(dist<8)this.stopFrameCount++;else this.stopFrameCount=0;if(this.stopFrameCount>=45){this.stopFrameCount=0;return 'ALLOW_COUNT'}}else this.stopFrameCount=0;return 'LOCK_AREA'}return 'LOCK_NO_TAG'}return 'FINISHED'}
 b11(tag,visible,t){if(this.state===1&&t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3');this.warnedTimeout=true;this.finish('TIMEOUT','Quá thời gian bài 11')}return}if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3');this.startedAt=t;this.state=1}else if(this.state===1&&tag===113&&visible){const duration=Math.max(.1,(t-this.startedAt)/1000),speed=(this.distanceMeters/duration)*3.6;this.result=speed>=25?'PASS':'LOW_SPEED';this.audio(speed>=25?'tunv.mp3':'thieutoc.mp3',speed>=25?'Tunv':'Sai tốc độ quy định');event('SPEED_RESULT',{course:'b11',speedKmh:Number(speed.toFixed(1)),duration:Number(duration.toFixed(2))});this.finish(this.result,speed>=25?'Đạt tốc độ':'Sai tốc độ');this.state=2}}
 kt(tag,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3');this.startedAt=t;this.state=1}else if(this.state===1&&t-this.startedAt>=5000){this.audio('hoanthanh.mp3');this.finish('FINAL','Hoàn thành sa hình');this.state=2}}
 checkTarget(area){if(this.is_finished)return;if(this.key==='b02'){const a=this.cachedArea>0?this.cachedArea:area;this.areaResult(a)}else if(this.key==='b03'&&this.state===1){const a=this.areaHistory.length?this.areaHistory.reduce((x,y)=>x+y,0)/this.areaHistory.length:area;this.areaResult(a);this.state=2;this.delayAt=performance.now();this.warnedRollback=false;this.warnedTimeout=false}else if(this.key==='b10'&&this.state===1){const a=this.areaHistory.length?this.areaHistory.reduce((x,y)=>x+y,0)/this.areaHistory.length:area;this.areaResult(a);this.state=2}}
 areaResult(a){let result='PASS';if(a<this.d.areaMin){result='EARLY';this.audio('chuaden.mp3')}else if(a<=this.d.areaMax){this.audio('dung.mp3')}else{result='LATE';this.audio('quavitri.mp3')}this.result=result;event('TARGET_RESULT',{course:this.key,area:Math.round(a),areaMin:this.d.areaMin,areaMax:this.d.areaMax,result});}
 finish(result='PASS',message='Hoàn thành'){if(this.is_finished)return;this.result=result;this.is_finished=true;event('COURSE_COMPLETED',{course:this.key,result,message});set('status',result==='PASS'||result==='FINAL'?'ĐẠT':'CẢNH BÁO');}
}

class ExamEngine{
 constructor(){this.rules=ORDER.map(k=>new CourseRule(k));this.ruleByKey=Object.fromEntries(this.rules.map(r=>[r.key,r]));this.current=null;this.index=-1;this.lastAnnounce=-1;this.lastChecked=-1;this.lastCx=-1;this.lastCy=-1;this.lastArea=0;this.stableAt=0;this.result='RUNNING';this.startedAt=Date.now();this.events=[];this.emergencySpot=this.nextEmergencySpot();this.emergencyTriggered=false;this.emergencyPendingAt=0;this.tagLockUntil=0;this.totalElapsed=0;}
 nextEmergencySpot(){const spots=['b05','b10','b12'];let i=Number(localStorage.getItem('sahinh_thkc_index_v2')||0);localStorage.setItem('sahinh_thkc_index_v2',String((i+1)%spots.length));return spots[i%spots.length]}
 announce(id,t){if(t<this.tagLockUntil)return false;const idx=ORDER.findIndex(k=>COURSE_DEFS[k].announce===id);if(idx<0)return false;if(this.index>=0&&idx!==this.index+1)return false;if(id===this.lastAnnounce)return false;const key=ORDER[idx];this.index=idx;this.current=this.ruleByKey[key];this.current.init(t);this.lastAnnounce=id;this.lastChecked=-1;this.lastCx=this.lastCy=-1;this.lastArea=0;this.stableAt=0;set('course',key.toUpperCase());event('COURSE_ANNOUNCED',{course:key,tag:id});if(key===this.emergencySpot&&!this.emergencyTriggered){this.emergencyPendingAt=t+5000;event('THKC_SCHEDULED',{course:key,delayMs:5000})}if(key==='b01')this.tagLockUntil=t+20000;return true}
 handle(d,t){if(this.result!=='RUNNING')return;if(t<this.tagLockUntil)return;const id=d.id;set('tag',id);this.announce(id,t);if(!this.current)return;const key=this.current.key;const ret=this.current.process(id,d.area,true,d.center,t);if(this.current.d.check===id||COURSE_DEFS[key].check===id){const moved=this.lastCx<0?0:Math.hypot(d.center.x-this.lastCx,d.center.y-this.lastCy),ad=Math.abs(d.area-this.lastArea);this.lastCx=d.center.x;this.lastCy=d.center.y;this.lastArea=d.area;if(moved<DISTANCE_THRESHOLD&&ad<AREA_THRESHOLD){if(!this.stableAt)this.stableAt=t;const stable=t-this.stableAt;set('stable',`${(stable/1000).toFixed(1)}s`);if(stable>=STABLE_MS&&this.lastChecked!==id){this.lastChecked=id;this.current.checkTarget(d.area);this.stableAt=0}}else this.stableAt=0}
   if(this.current.is_finished){const finished=this.current.key;if(finished==='KT'){this.result='COMPLETED';this.totalElapsed=Date.now()-this.startedAt;event('EXAM_COMPLETED',{elapsedMs:this.totalElapsed,result:'COMPLETED'});set('status','HOÀN THÀNH');alertMsg('🏆 HOÀN THÀNH SA HÌNH',7000);set('course','HOÀN THÀNH');this.current=null}else{set('status',this.current.result==='PASS'?'ĐẠT':'CÓ LỖI');set('startBtn','🔄 THI LẠI');this.current=null}}
 }
 update(t){
   if(this.result!=='RUNNING')return;
   if(this.emergencyPendingAt&&t>=this.emergencyPendingAt&&!this.emergencyTriggered){
     this.emergencyPendingAt=0;this.emergencyTriggered=true;this.tagLockUntil=t+10000;
     event('THKC_TRIGGERED',{spot:this.emergencySpot});
     alertMsg('🚨 TÌNH HUỐNG KHẨN CẤP — DỪNG XE NGAY',10000);
     play('THKC','THKC.mp3','CÒI KHẨN CẤP — DỪNG XE NGAY');
   }
   set('timer',fmt(Date.now()-this.startedAt));
   if(this.current&&this.current.startedAt){
     if(this.current.key==='b01'){
       if(this.current.state===1){
         const remain=Math.max(0,20000-(t-this.current.startedAt));
         set('courseTimer',`${Math.ceil(remain/1000)}s`);
         if(remain<=0){this.current.b01(null,true,t);this.tagLockUntil=0;set('status','ĐÃ PHÁT LỆNH XUẤT PHÁT — CHỜ TAG 111 (30s)');}
       }else if(this.current.state===2){
         const remain30=Math.max(0,30000-(t-this.current.startedAt));
         set('courseTimer',`${Math.ceil(remain30/1000)}s`);
         const remain18=Math.max(0,(this.current.total18DeadlineAt||0)-t);
         const mm=Math.floor(remain18/60000),ss=Math.ceil((remain18%60000)/1000);
         const totalText=`${mm}:${String(ss).padStart(2,'0')}`;
         set('totalTimer',totalText);
         set('startBtn',`⏱ ${totalText}`);
         if(remain18<=0&&!this.current.is_finished){
           this.current.audio('quagio.mp3');
           this.current.finish('TIMEOUT','Hết tổng thời gian 18 phút');
           set('startBtn','🔄 THI LẠI');
         }else if(remain30<=0&&!this.current.is_finished){
           this.current.b01(null,true,t);
         }
       }
     }else{
       const remain=Math.max(0,this.current.d.limit*1000-(t-this.current.startedAt));
       set('courseTimer',`${Math.ceil(remain/1000)}s`);
     }
   }
 }
}
function fmt(ms){const s=Math.floor(ms/1000),m=Math.floor(s/60),ss=s%60;return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`}

async function startExam(){if(!window.currentTeacher){alertMsg('Chưa đăng nhập giáo viên');return}await unlockAudio();if(!await openCamera())return;engine=new ExamEngine();set('status','ĐANG THI — CHỜ TAG 01');set('course','WAITING');set('tag','--');set('timer','00:00');set('stable','0.0s');set('courseTimer','--');set('totalTimer','18:00');persist();event('EXAM_STARTED',{teacher:window.currentTeacher});alertMsg('🚗 BẮT ĐẦU BÀI THI');}
function finishLocal(){if(engine){event('EXAM_STOPPED',{result:'STOPPED'});engine.result='STOPPED';persist()}stopCamera();}
async function loop(t){
  if(video&&video.readyState>=2&&engine&&adapter?.ready&&!processing){
    processing=true;
    try{
      const vw=video.videoWidth||640, vh=video.videoHeight||360;
      if(workCanvas.width!==vw) workCanvas.width=vw;
      if(workCanvas.height!==vh) workCanvas.height=vh;
      workCtx.drawImage(video,0,0,vw,vh);
      const ds=await adapter.detectFrame(workCanvas);
      drawDetections(ds);
      if(ds.length){
        set('tag',ds[0].id);
        set('status','🟢 NHẬN TAG '+ds[0].id);
        engine.handle(ds[0],t);
      }else{
        set('status','🔎 ĐANG QUÉT APRILTAG 36h11...');
      }
    }catch(e){
      console.warn('AprilTag detect error',e);
      set('status','LỖI QUÉT TAG — '+(e.message||e.name||'Detector'));
    }finally{processing=false}
  }
  if(engine) engine.update(t);
  raf=requestAnimationFrame(loop);
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
  try{const t=JSON.parse(localStorage.getItem(KEY)||'null');if(t){window.currentTeacher=t;show(t)}else show(null)}catch(_){show(null)}
  $('startBtn').onclick=startExam;
  try{adapter=new AprilTagAdapter();await adapter.init();set('status','SẴN SÀNG — AprilTag 36h11')}catch(e){console.error(e);set('status','LỖI APRILTAG');alertMsg(e.message,7000)}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
  raf=requestAnimationFrame(loop);
});
