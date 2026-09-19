/* SA HÌNH AI — full browser/PWA port of the Python central loop + B01..B13 + KT + THKC. */
const DEPLOY_VERSION='V1.4.8';
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
 b12:{announce:12,start:121,backupStart:212,check:123,name:'Bài 12: Ghép xe ngang vào nơi đỗ',limit:120},
 b13:{announce:13,start:131,backupStart:213,name:'Bài 13: Qua ngã tư có tín hiệu điều khiển giao thông',limit:20},
 KT:{announce:14,start:141,backupStart:214,name:'Kết thúc bài thi',limit:999}
};
const ORDER=Object.keys(COURSE_DEFS);
const STABLE_MS=1200,DISTANCE_THRESHOLD=12,AREA_THRESHOLD=1500,ALPHA=.7;
const $=id=>document.getElementById(id);
const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
const now=()=>performance.now();

function hideSecondaryTimer(){
  const box=$('secondaryTimerBox');
  if(box) box.classList.add('hidden');
}
function showSecondaryTimer(label,remainingMs,hint='') {
  const box=$('secondaryTimerBox');
  if(!box) return;
  const remain=Math.max(0,Number(remainingMs)||0);
  const totalSec=Math.max(0,Math.ceil(remain/1000));
  set('secondaryTimerLabel',label||'THỜI GIAN PHỤ');
  set('secondaryTimerValue',`${totalSec}s`);
  set('secondaryTimerHint',hint||'');
  box.classList.remove('hidden');
  box.classList.toggle('danger',totalSec<=10 && totalSec>0);
  box.classList.toggle('expired',totalSec===0);
}

let video,workCanvas,workCtx,overlay,overlayCtx,adapter;
let engine=null,raf=0,processing=false;
let total18Ticker=0;

function renderTotal18Timer(engineRef){
  if(!engineRef||!engineRef.total18StartAt||!engineRef.total18DeadlineAt) return;
  const nowMs=performance.now();
  const remain=Math.max(0,engineRef.total18DeadlineAt-nowMs);
  const totalSec=Math.max(0,Math.ceil(remain/1000));
  const mm=Math.floor(totalSec/60);
  const ss=totalSec%60;
  const display=`${mm}:${String(ss).padStart(2,'0')}`;
  set('totalTimer',display);
  set('totalTimerBig',display);
}
function stopTotal18Ticker(){
  if(total18Ticker){clearInterval(total18Ticker);total18Ticker=0;}
}
function startTotal18Ticker(engineRef){
  stopTotal18Ticker();
  renderTotal18Timer(engineRef);
  total18Ticker=setInterval(()=>{
    if(!engineRef || engineRef!==engine || engineRef.result!=='RUNNING'){
      stopTotal18Ticker();
      return;
    }
    renderTotal18Timer(engineRef);
  },200);
}

// KET NOI DUY NHAT VOI GOOGLE SHEET: dang nhap giao vien.
// Am thanh chay truc tiep tu thu muc PWA, khong qua Google Drive/GAS.
const SAHINH_API_URL = window.SAHINH_API_URL || localStorage.getItem('sahinh_api_url_v1') || '';
const audioMem = new Map();
let audioUnlocked = false;
let activeAudio = null;
let audioPlaySeq = 0;
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
    for(const f of ['baobai.mp3','batdau.mp3','batdau.mp3','dung.mp3','chuaden.mp3','quavitri.mp3','dungxe.mp3','tutdoc.mp3','quagio.mp3','quatg1.mp3','quatg30.mp3','quatgbai.mp3','thieutoc.mp3','tunv.mp3','doilenh.mp3']) list.push(`./audio/${dir}/${f}`);
    if(c==='b01'){
      list.push('./audio/b01/qua30s.mp3');
    }
  }
  list.push('./audio/THKC/THKC.mp3','./audio/THKC/saiquytrinh.mp3','./audio/KT/hoanthanh.mp3','./audio/quatong.mp3','./audio/thitruot.mp3');
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

  const seq=++audioPlaySeq;
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

    if(seq!==audioPlaySeq){
      try{a.pause();a.currentTime=0;}catch(_){}
      return false;
    }

    set('status', `🔊 ĐANG PHÁT: ${src}`);
    return true;
  }catch(e){
    if(seq===audioPlaySeq){
      reportAudioError(src,e,'Kiểm tra file MP3 và đường dẫn trên GitHub Pages');
    }
    return false;
  }
}
function play(course,file){return playDirect(course,file);}
async function playSharedAudio(file){
  const src=`./audio/${String(file||'').trim()}`;
  if(!file){reportAudioError('./audio/<empty>',null,'Thiếu tên file audio dùng chung');return false;}
  try{
    let a=audioMem.get(src);
    if(!a){a=new Audio();a.preload='auto';a.playsInline=true;a.src=src;audioMem.set(src,a);}
    if(activeAudio&&activeAudio!==a){try{activeAudio.pause();activeAudio.currentTime=0;}catch(_){} }
    activeAudio=a;a.currentTime=0;a.muted=false;await a.play();
    set('status',`🔊 ĐANG PHÁT: ${src}`);return true;
  }catch(e){reportAudioError(src,e,'Kiểm tra file MP3 và đường dẫn trong thư mục audio/');return false;}
}

async function playErrorSequence(course,primary,text=''){
  // Phát âm thanh lỗi chính hoàn tất rồi mới phát THI TRƯỢT.
  const src=localAudioPath(course,primary);
  const seqBefore=audioPlaySeq;
  const ok=await playDirect(course,primary,text);
  if(!ok)return false;
  const a=src?audioMem.get(src):null;
  if(a && !a.ended){
    await new Promise(resolve=>{
      let settled=false;
      const finish=()=>{
        if(settled)return;
        settled=true;
        a.removeEventListener('ended',finish);
        a.removeEventListener('error',finish);
        resolve();
      };
      a.addEventListener('ended',finish,{once:true});
      a.addEventListener('error',finish,{once:true});
      const watchdog=setInterval(()=>{
        if(settled){clearInterval(watchdog);return;}
        if(audioPlaySeq!==seqBefore+1){clearInterval(watchdog);finish();}
      },100);
    });
  }
  if(audioPlaySeq!==seqBefore+1)return false;
  return playSharedAudio('thitruot.mp3');
}
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
function selectNearestTag(ds){
  if(!Array.isArray(ds)||!ds.length)return [];
  // Các TAG được in cùng kích thước: TAG gần camera nhất có diện tích ảnh lớn nhất.
  // Chỉ đưa đúng TAG gần nhất vào engine; TAG ở xa không được xử lý luật/âm thanh.
  let nearest=null;
  for(const d of ds){
    const area=Number(d?.area)||0;
    if(!nearest || area>nearest.area) nearest={...d,area};
  }
  return nearest?[nearest]:[];
}

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

const LOCAL_VEHICLE_ID_KEY='sahinh_vehicle_local_id_v1';
const POSITION_REFERENCE_PREFIX='sahinh_position_reference_v1_';
const POSITION_RULE_COURSES=new Set(['b02','b03','b10']);

function getLocalVehicleId(){
  let id=localStorage.getItem(LOCAL_VEHICLE_ID_KEY);
  if(!id){
    const bytes=new Uint8Array(4);
    if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(bytes);
    else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
    const hex=Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
    id=`XE-${hex}`;
    localStorage.setItem(LOCAL_VEHICLE_ID_KEY,id);
  }
  return id;
}

function isPositionRuleCourse(course){
  return POSITION_RULE_COURSES.has(course);
}

function getPositionReferenceKey(course,vehicleId=getLocalVehicleId()){
  return `${POSITION_REFERENCE_PREFIX}${course}_${vehicleId}`;
}

function loadPositionReference(course,vehicleId=getLocalVehicleId()){
  try{
    let raw=localStorage.getItem(getPositionReferenceKey(course,vehicleId));

    // Migrate the old B02-only key once.
    if(!raw&&course==='b02'){
      const old=localStorage.getItem('sahinh_b02_reference_area');
      if(old&&Number(old)>0){
        const migrated={
          course:'b02',
          vehicleId,
          tag:22,
          area:Number(old),
          tolerancePct:5,
          minAllowed:Number(old)*0.95,
          maxAllowed:Number(old)*1.05,
          updatedAt:new Date().toISOString(),
          migratedFrom:'sahinh_b02_reference_area'
        };
        localStorage.setItem(getPositionReferenceKey('b02',vehicleId),JSON.stringify(migrated));
        raw=JSON.stringify(migrated);
      }
    }

    const data=raw?JSON.parse(raw):null;
    return data&&Number(data.area)>0?data:null;
  }catch(_){
    return null;
  }
}

function savePositionReference(course,tag,area){
  const vehicleId=getLocalVehicleId();
  const data={
    course,
    vehicleId,
    tag:Number(tag),
    area:Number(area),
    tolerancePct:5,
    minAllowed:Number(area)*0.95,
    maxAllowed:Number(area)*1.05,
    updatedAt:new Date().toISOString()
  };
  localStorage.setItem(getPositionReferenceKey(course,vehicleId),JSON.stringify(data));
  return data;
}

function comparePositionReference(course,currentArea){
  const ref=Number(engine?.current?.positionReferenceArea||0);
  if(!(ref>0)||!(currentArea>0))return null;
  const min=ref*0.95;
  const max=ref*1.05;
  if(currentArea<min)return {result:'CHUA_DEN',ref,currentArea,min,max,audio:'chuaden.mp3'};
  if(currentArea>max)return {result:'QUA_VI_TRI',ref,currentArea,min,max,audio:'quavitri.mp3'};
  return {result:'DUNG_VI_TRI',ref,currentArea,min,max,audio:null};
}

function showLocalVehicleProfile(){
  const el=$('vehicleProfileBadge');
  if(el)el.textContent=`XE CỤC BỘ: ${getLocalVehicleId()}`;
}

function showPositionConfirm(show,course=''){
  const btn=$('confirmPositionBtn');
  if(!btn)return;
  if(show){
    btn.classList.remove('hidden');
    btn.disabled=false;
    btn.textContent=course
      ? `✅ ĐÚNG VỊ TRÍ — ${String(course).toUpperCase()}`
      : '✅ ĐÚNG VỊ TRÍ';
  }else{
    btn.classList.add('hidden');
    btn.disabled=false;
    btn.textContent='✅ ĐÚNG VỊ TRÍ';
  }
}

function capturePositionReference(){
  const btn=$('confirmPositionBtn');
  if(btn?.disabled)return;
  if(!engine||engine.result!=='RUNNING'||!engine.current)return;
  const r=engine.current;
  if(!isPositionRuleCourse(r.key))return;
  if(r.positionConfirmedByUser){
    showPositionConfirm(false);
    return;
  }

  // Khóa nút ngay lập tức để tránh chạm nhiều lần.
  if(btn){btn.disabled=true;btn.textContent='⏳ ĐANG XÁC NHẬN...';}

  const area=Number(r.cachedArea||0);
  const tag=Number(r.d.check||0);
  if(!(area>0)||!(tag>0)){
    if(btn){btn.disabled=false;btn.textContent=`✅ ĐÚNG VỊ TRÍ — ${r.key.toUpperCase()}`;}
    set('status',`⚠️ ${r.key.toUpperCase()} — CHƯA CÓ DIỆN TÍCH TAG KIỂM TRA`);
    alertMsg('Chưa có diện tích TAG kiểm tra ổn định để xác nhận vị trí.',3500);
    return;
  }

  r.positionReferenceArea=area;
  r.positionReferenceTag=tag;
  r.positionResult='DUNG_VI_TRI';
  r.positionCorrect=true;
  r.positionConfirmedByUser=true;

  savePositionReference(r.key,tag,area);
  event('POSITION_REFERENCE_CONFIRMED',{
    course:r.key,
    vehicleId:getLocalVehicleId(),
    storage:'localStorage',
    tag,
    area:Math.round(area),
    tolerancePct:5,
    minAllowed:Math.round(area*0.95),
    maxAllowed:Math.round(area*1.05),
    userConfirmed:true
  });

  set('status',`✅ ${r.key.toUpperCase()} — ĐÃ XÁC NHẬN ĐÚNG VỊ TRÍ`);
  alertMsg(`✅ ${r.key.toUpperCase()} — ĐÃ XÁC NHẬN ĐÚNG VỊ TRÍ`,3000);
  showPositionConfirm(false);
}
class CourseRule{
 constructor(key){this.key=key;this.d={...COURSE_DEFS[key]};this.reset()}
 reset(){
  this.state=0;
  this.is_finished=false;
  this.startedAt=0;
  this.areaHistory=[];
  this.cachedArea=0;
  this.warnedTimeout=false;
  this.warnedRollback=false;
  this.stopFrameCount=0;
  this.lastCx=-1;
  this.lastCy=-1;
  this.delayAt=0;
  this.distanceMeters=this.d.distanceMeters||30;
  this.result=null;
  this.commandPlayed=false;
  this.total18StartAt=0;
  this.total18DeadlineAt=0;
  this.positionChecked=false;
  this.positionCorrect=false;
  this.positionConfirmedByUser=false;
  this.stopConfirmed=false;
  this.positionReferenceArea=0;
  this.repeatStartTagCount=0;
  this.repeatStartWaitingReturn=false;
  this.repeatStartAt=0;
  this.repeatStartDeadlineAt=0;
  this.repeatStartDone=false;
  this.checkAudioPlayed=false;
  this.checkAudioPending=false;
  this.positionReferenceTag=0;
  this.positionResult=null;
  this.positionCorrect=false;
  try{
    if(isPositionRuleCourse(this.key)){
      const ref=loadPositionReference(this.key);
      if(ref){
        this.positionReferenceArea=Number(ref.area);
        this.positionReferenceTag=Number(ref.tag||this.d.check||0);
      }
    }
  }catch(_){}
}
 init(t){
  this.reset();
  this.loadCalib();
  if(this.key==='b01'){
    this.startedAt=t;
    this.state=1;
    this.audio('doilenh.mp3');
  }else{
    // TAG BÁO BÀI đã được ExamEngine.announce() xác nhận.
    // Chỉ tại đây mới phát baobai.mp3. Không phát batdau.mp3 ở bước này.
    this.audio('baobai.mp3');
    event('COURSE_ANNOUNCE_AUDIO',{
      course:this.key,
      announceTag:this.d.announce,
      audio:'baobai.mp3'
    });

    if(isPositionRuleCourse(this.key)){
      if(this.positionReferenceArea>0){
        set('status',`${this.key.toUpperCase()} — MỐC XE ${getLocalVehicleId()}: ${Math.round(this.positionReferenceArea)} — ±5%`);
      }
      showPositionConfirm(false);
    }
  }
  event('COURSE_INIT',{course:this.key,localVehicleId:getLocalVehicleId()});
}
 loadCalib(){try{const c=JSON.parse(localStorage.getItem('sahinh_calib_'+this.key)||'null');if(c){if(c.areaMin)this.d.areaMin=c.areaMin;if(c.areaMax)this.d.areaMax=c.areaMax;}}catch(_){} }
 audio(file,text){return play(this.key,file,text)}
 elapsed(t=Date.now()){return this.startedAt?((t-this.startedAt)/1000):0}
 matchesStart(tag){ return tag===this.d.start || tag===this.d.backupStart; }
 process(tag,area,visible,center,t){
   const sec=t/1000;
   if(this.key==='b01')return this.b01(tag,visible,t);
   if(isPositionRuleCourse(this.key))return this.positionRule(tag,area,visible,t);
   if(this.key==='b08'||this.key==='b12')return this.repeatTimedNoPosition(tag,visible,t);
   if(this.key==='b04'||this.key==='b06')return this.simpleTimed(tag,visible,t);
   if(['b05','b07','b09','b13'].includes(this.key))return this.instant(tag,visible,t);
   if(this.key==='b10')return this.b10(tag,area,visible,center,t);
   if(this.key==='b11')return this.b11(tag,visible,t);
   if(this.key==='KT')return this.kt(tag,visible,t);
   return null;
 }
 b01(tag,visible,t){
   if(this.state===1){
     if(t-this.startedAt<20000)return 'LOCKED_20S';
     if(!this.commandPlayed){
       this.commandPlayed=true;
       this.state=2;
       this.startedAt=t;
       // ĐỒNG HỒ TỔNG 18 PHÚT BẮT ĐẦU NGAY CÙNG LÚC GỌI PHÁT baobai.mp3.
       // Không chờ Promise của audio; mốc thời gian dùng chính tick t này.
       const totalStarted=engine&&engine.startTotal18();
       const p=this.audio('baobai.mp3');
       if(totalStarted){
         set('startBtn','⏳ ĐANG THI — 18 PHÚT TOÀN BÀI');
         set('totalTimer','18:00');set('totalTimerBig','18:00');set('totalClockHint','Bắt đầu khi phát báo bài B01');
         event('B01_BA0BAI_COMMAND',{
           afterMs:Math.max(0,Math.round(t-this.initAtForCommand)),
           totalLimitMs:18*60*1000,
           timerStartsSameTick:true
         });
       }
       Promise.resolve(p).catch(()=>{});
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
 positionRule(tag,area,visible,t){
   const exactStartTag=(tag===this.d.start);
   const exactCheckTag=(tag===this.d.check);

   // B03 vẫn dùng quy tắc vị trí tại TAG 32, đồng thời giám sát tụt dốc.
   if(this.key==='b03' && this.state>=1 && exactCheckTag && visible && Number(area)>0){
     this.areaHistory.push(Number(area));
     if(this.areaHistory.length>15)this.areaHistory.shift();
     this.cachedArea=Number(area);
     this.rollback(area);

     // Chỉ khi TAG 32 còn được quét sau đủ 30s kể từ lúc báo DỪNG XE mới lỗi quá 30s.
     if(this.state===2 && this.delayAt>0 && t-this.delayAt>=30000 && !this.warnedTimeout){
       this.warnedTimeout=true;
       this.audio('qua30s.mp3');
       event('B03_TIMEOUT_30S',{checkTag:this.d.check,afterMs:Math.round(t-this.delayAt)});
       set('status','⛔ B03 — QUÁ 30s — VẪN CÒN TAG 32');
       this.finish('TIMEOUT','Còn quét thấy TAG 32 sau 30 giây');
       return 'TIMEOUT_30S';
     }
   }

   // IMPORTANT:
   // TAG báo bài (ví dụ 02/03/08/10/12) chỉ phát baobai.mp3 trong init().
   // TAG vào bài (21/31/81/101/121) mới được phép phát batdau.mp3.
   if(this.state===0&&exactStartTag&&visible){
     this.audio('batdau.mp3');
     event('COURSE_START_AUDIO',{
       course:this.key,
       startTag:tag,
       announceTag:this.d.announce,
       audio:'batdau.mp3'
     });

     this.state=1;
     this.startedAt=t;

  if(this.key==='b03'){
       this.areaHistory=[];
       this.warnedTimeout=false;
       this.warnedRollback=false;
       this.delayAt=0;
       this.stopConfirmed=false;
       this.positionResult=null;
       this.positionCorrect=false;
     }

     if(isRepeatTimed){
       this.repeatStartTagCount=1;
       this.repeatStartWaitingReturn=true;
       this.repeatStartAt=t;
       this.repeatStartDeadlineAt=t+120000;
       this.repeatStartDone=false;

       set('status',`${this.key.toUpperCase()} — VÀO BÀI — 120s — CHỜ TAG ${this.d.start} LẦN 2`);
       event('POSITION_RULE_START',{
         course:this.key,
         startTag:tag,
         checkTag:this.d.check,
         timed120s:true,
         deadlineMs:120000
       });
     }else{
       set('status',`${this.key.toUpperCase()} — VÀO BÀI — CHỜ TAG ${this.d.check}`);
       event('POSITION_RULE_START',{
         course:this.key,
         startTag:tag,
         checkTag:this.d.check,
         timed120s:false
       });
     }
     return 'POSITION_START';
   }

   if(this.state===1){
     if(exactCheckTag&&visible){
       this.cachedArea=area;
     }
   }

   return 'WAITING';
 }
 repeatTimedNoPosition(tag,visible,t){
   const exactStartTag=(tag===this.d.start);
   const exactCheckTag=(tag===this.d.check);

   // B08/B12: KHÔNG kiểm tra vị trí. TAG kiểm tra chỉ dùng để phát DỪNG XE.
   // Sau TAG vào bài lần 1, bộ đếm 120s chờ TAG vào bài lần 2.
   if(this.state===0&&exactStartTag&&visible){
     this.audio('batdau.mp3');
     this.state=1;
     this.startedAt=t;
     this.repeatStartTagCount=1;
     this.repeatStartWaitingReturn=true;
     this.repeatStartAt=t;
     this.repeatStartDeadlineAt=t+120000;
     this.repeatStartDone=false;
     this.checkAudioPlayed=false;
     this.checkAudioPending=false;

     set('status',`${this.key.toUpperCase()} — VÀO BÀI — 120s — CHỜ TAG ${this.d.start} LẦN 2`);
     event('REPEAT_120S_NO_POSITION_START',{
       course:this.key,
       startTag:tag,
       checkTag:this.d.check,
       timed120s:true,
       positionCheck:false,
       deadlineMs:120000
     });
     return 'REPEAT_START';
   }

   if(this.state===1){
     // TAG kiểm tra (82/123) chỉ phát DỪNG XE một lần, tuyệt đối không so sánh diện tích.
     // Chỉ chốt cờ khi phát audio thành công; nếu lần đầu lỗi/tạm thời chưa phát được,
     // các frame tiếp theo còn thấy đúng TAG sẽ tự thử lại.
     if(exactCheckTag&&visible&&!this.checkAudioPlayed&&!this.checkAudioPending){
       this.checkAudioPending=true;
       this.cachedArea=Number(area||0);
       const playResult=this.audio('dungxe.mp3');
       Promise.resolve(playResult).then(ok=>{
         this.checkAudioPending=false;
         if(ok){
           this.checkAudioPlayed=true;
           set('status',`${this.key.toUpperCase()} — TAG ${tag} — ĐÃ PHÁT dungxe.mp3`);
           event('REPEAT_CHECK_TAG_STOP_AUDIO',{
             course:this.key,
             checkTag:tag,
             area:this.cachedArea>0?Math.round(this.cachedArea):null,
             positionCheck:false,
             audio:'dungxe.mp3',
             audioPath:`./audio/${this.key}/dungxe.mp3`,
             playOk:true
           });
         }else{
           event('REPEAT_CHECK_TAG_STOP_AUDIO_RETRY',{
             course:this.key,
             checkTag:tag,
             audio:'dungxe.mp3',
             audioPath:`./audio/${this.key}/dungxe.mp3`,
             playOk:false
           });
         }
       }).catch(err=>{
         this.checkAudioPending=false;
         reportAudioError(`./audio/${this.key}/dungxe.mp3`,err,'B08/B12 TAG kiểm tra — sẽ tự thử lại khi TAG vẫn còn');
       });
       set('status',`${this.key.toUpperCase()} — TAG ${tag} — PHÁT dungxe.mp3...`);
       return 'CHECK_STOP_AUDIO';
     }

     // TAG vào bài lần 2 chỉ được chốt khi TAG lần 1 đã rời khung hình.
     if(exactStartTag&&visible){
       if(this.repeatStartWaitingReturn)return 'WAITING';
       this.repeatStartTagCount=2;
       this.repeatStartDone=true;
       this.repeatStartDeadlineAt=0;
       event('REPEAT_SECOND_START_TAG',{
         course:this.key,
         startTag:tag,
         checkTag:this.d.check,
         elapsedMs:Math.max(0,t-(this.repeatStartAt||t)),
         positionCheck:false
       });
       set('status',`${this.key.toUpperCase()} — TAG ${tag} LẦN 2 — HOÀN THÀNH`);
       this.finish('PASS',`Hoàn thành ${this.key.toUpperCase()} — đủ 2 lần TAG vào bài`);
       return 'FINISHED';
     }
   }
   return 'WAITING';
 }
 b11(tag,visible,t){if(this.state===1&&t-this.startedAt>=this.d.limit*1000){if(!this.warnedTimeout){this.audio('quagio.mp3');this.warnedTimeout=true;this.finish('TIMEOUT','Quá thời gian bài 11')}return}if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3');this.startedAt=t;this.state=1}else if(this.state===1&&tag===113&&visible){const duration=Math.max(.1,(t-this.startedAt)/1000),speed=(this.distanceMeters/duration)*3.6;this.result=speed>=25?'PASS':'LOW_SPEED';this.audio(speed>=25?'tunv.mp3':'thieutoc.mp3',speed>=25?'Tunv':'Sai tốc độ quy định');event('SPEED_RESULT',{course:'b11',speedKmh:Number(speed.toFixed(1)),duration:Number(duration.toFixed(2))});this.finish(this.result,speed>=25?'Đạt tốc độ':'Sai tốc độ');this.state=2}}
 kt(tag,visible,t){if(this.state===0&&this.matchesStart(tag)&&visible){this.audio('batdau.mp3');this.startedAt=t;this.state=1}else if(this.state===1&&t-this.startedAt>=5000){this.audio('hoanthanh.mp3');this.finish('FINAL','Hoàn thành sa hình');this.state=2}}
 checkTarget(area,t=performance.now()){
   if(this.is_finished)return;

   if(this.key==='b03'){
     const a=Number(area||this.cachedArea||0);
     if(!(a>0))return;
     this.cachedArea=a;

     // TAG 32 ổn định: báo DỪNG XE và bắt đầu đúng 30 giây tính thời gian dốc.
     if(!this.stopConfirmed){
       this.stopConfirmed=true;
       this.positionChecked=true;
       this.positionReferenceTag=Number(this.d.check||32);
       this.delayAt=t;
       this.state=2;
       this.audio('dungxe.mp3');
       event('B03_STOP_CONFIRMED',{tag:this.d.check,area:Math.round(a),timerMs:30000,stableMs:STABLE_MS});
       set('status','B03 — DỪNG XE — BẮT ĐẦU ĐẾM 30s');
     }

     if(!this.positionConfirmedByUser)showPositionConfirm(true,this.key);

     // B03 vẫn có luật vị trí ±5% như điểm dừng: CHƯA ĐẾN / ĐÚNG VỊ TRÍ / QUÁ VỊ TRÍ.
     if(this.positionReferenceArea>0){
       const ev=comparePositionReference(this.key,a);
       if(ev){
         const changed=this.positionResult!==ev.result;
         this.positionResult=ev.result;
         this.positionCorrect=(ev.result==='DUNG_VI_TRI');

         if(changed){
           if(ev.result==='QUA_VI_TRI'){
             this.playErrorSequence('quavitri.mp3','Quá vị trí');
           }else if(ev.result==='CHUA_DEN'){
             this.audio('chuaden.mp3');
           }

           set('status',
             ev.result==='DUNG_VI_TRI'
               ? `✅ B03 — ĐÚNG VỊ TRÍ (${Math.round(ev.currentArea)})`
               : ev.result==='CHUA_DEN'
                 ? `⚠️ B03 — CHƯA ĐẾN VỊ TRÍ (${Math.round(ev.currentArea)})`
                 : `⛔ B03 — QUÁ VỊ TRÍ (${Math.round(ev.currentArea)}) — THI TRƯỢT`
           );

           event('POSITION_COMPARE',{
             course:this.key,
             refArea:Math.round(ev.ref),
             currentArea:Math.round(ev.currentArea),
             minAllowed:Math.round(ev.min),
             maxAllowed:Math.round(ev.max),
             tolerancePct:5,
             result:ev.result,
             audio:ev.audio||'none',
             followedBy:ev.result==='QUA_VI_TRI'?'thitruot.mp3':null
           });
         }
       }
     }else{
       set('status',`B03 — DIỆN TÍCH HIỆN TẠI: ${Math.round(a)} — NHẤN ✅ ĐÚNG VỊ TRÍ ĐỂ XÁC NHẬN`);
     }
     return;
   }

   if(isPositionRuleCourse(this.key)){
     const a=this.cachedArea>0?this.cachedArea:area;
     const checkTag=Number(this.d.check||0);

     // TAG kiểm tra + ổn định: phát DỪNG XE một lần.
     if(!this.stopConfirmed){
       this.stopConfirmed=true;
       this.positionChecked=true;
       this.positionReferenceTag=checkTag;
       this.audio('dungxe.mp3');
       event('POSITION_STOP_CONFIRMED',{
         course:this.key,
         tag:checkTag,
         area:Math.round(a),
         stableMs:STABLE_MS
       });
     }

     // Nút xác nhận chỉ ghi diện tích chuẩn cho BÀI hiện tại.
     if(!this.positionConfirmedByUser)showPositionConfirm(true,this.key);

     // Nếu chưa có mốc: chờ người dùng nhấn nút.
     if(this.positionReferenceArea>0){
       const ev=comparePositionReference(this.key,a);
       if(ev){
         const changed=this.positionResult!==ev.result;
         this.positionResult=ev.result;
         this.positionCorrect=(ev.result==='DUNG_VI_TRI');

         if(changed){
           if(ev.audio)this.audio(ev.audio);

           set('status',
             ev.result==='DUNG_VI_TRI'
               ? `✅ ${this.key.toUpperCase()} — ĐÚNG VỊ TRÍ (${Math.round(ev.currentArea)})`
               : ev.result==='CHUA_DEN'
                 ? `⚠️ ${this.key.toUpperCase()} — CHƯA ĐẾN VỊ TRÍ (${Math.round(ev.currentArea)})`
                 : `⚠️ ${this.key.toUpperCase()} — QUÁ VỊ TRÍ (${Math.round(ev.currentArea)})`
           );

           event('POSITION_COMPARE',{
             course:this.key,
             refArea:Math.round(ev.ref),
             currentArea:Math.round(ev.currentArea),
             minAllowed:Math.round(ev.min),
             maxAllowed:Math.round(ev.max),
             tolerancePct:5,
             result:ev.result,
             audio:ev.audio||'none'
           });
         }
       }
     }else{
       set('status',`${this.key.toUpperCase()} — DIỆN TÍCH HIỆN TẠI: ${Math.round(a)} — NHẤN ✅ ĐÚNG VỊ TRÍ ĐỂ XÁC NHẬN`);
     }
     return;
   }
 }
 rollback(area){
   const a=Number(area||0);
   if(!(a>0)||this.areaHistory.length<5||this.warnedRollback)return;
   const prior=this.areaHistory.slice(0,-1);
   if(!prior.length)return;
   const avg=prior.reduce((sum,v)=>sum+v,0)/prior.length;
   // Dấu hiệu tụt dốc: diện tích TAG 32 giảm mạnh so với trung bình các mẫu trước đó.
   if(a<avg*0.9){
     this.warnedRollback=true;
     this.playErrorSequence('tutdoc.mp3','Tụt dốc');
     event('B03_ROLLBACK',{tag:this.d.check,area:Math.round(a),averagePriorArea:Math.round(avg),threshold:Math.round(avg*0.9)});
     set('status','⛔ B03 — PHÁT HIỆN TỤT DỐC — THI TRƯỢT');
   }
 }
 areaResult(a){let result='PASS';if(a<this.d.areaMin){result='EARLY';this.audio('chuaden.mp3')}else if(a<=this.d.areaMax){this.audio('dung.mp3')}else{result='LATE';this.audio('quavitri.mp3')}this.result=result;event('TARGET_RESULT',{course:this.key,area:Math.round(a),areaMin:this.d.areaMin,areaMax:this.d.areaMax,result});}
 finish(result='PASS',message='Hoàn thành'){if(this.is_finished)return;this.result=result;this.is_finished=true;event('COURSE_COMPLETED',{course:this.key,result,message});set('status',result==='PASS'||result==='FINAL'?'ĐẠT':'CẢNH BÁO');}
}

class ExamEngine{
 constructor(){this.rules=ORDER.map(k=>new CourseRule(k));this.ruleByKey=Object.fromEntries(this.rules.map(r=>[r.key,r]));this.current=null;this.index=-1;this.lastAnnounce=-1;this.lastChecked=-1;this.lastCx=-1;this.lastCy=-1;this.lastArea=0;this.stableAt=0;this.result='RUNNING';this.startedAt=Date.now();this.initAtForCommand=this.startedAt;this.events=[];this.emergencySpot=this.nextEmergencySpot();this.emergencyTriggered=false;this.emergencyPendingAt=0;this.tagLockUntil=0;this.totalElapsed=0;this.total18StartAt=0;this.total18DeadlineAt=0;this.tag141Seen=false;this.total18Expired=false;this.total18NextReminderAt=0;}
 startTotal18(){
   if(this.total18StartAt||this.tag141Seen)return false;
   const startAt=performance.now();
   this.total18StartAt=startAt;
   this.total18DeadlineAt=startAt+18*60*1000;
   this.total18Expired=false;
   this.total18NextReminderAt=0;
   set('totalTimer','18:00');set('totalTimerBig','18:00');set('totalClockHint','Bắt đầu khi phát báo bài B01');
   startTotal18Ticker(this);
   event('TOTAL18_STARTED',{source:'B01_baobai',totalLimitMs:18*60*1000});
   return true;
 }
 nextEmergencySpot(){const spots=['b05','b10','b12'];let i=Number(localStorage.getItem('sahinh_thkc_index_v2')||0);localStorage.setItem('sahinh_thkc_index_v2',String((i+1)%spots.length));return spots[i%spots.length]}
 announce(id,t){if(t<this.tagLockUntil)return false;const idx=ORDER.findIndex(k=>COURSE_DEFS[k].announce===id);if(idx<0)return false;if(this.index>=0&&idx!==this.index+1)return false;if(id===this.lastAnnounce)return false;const key=ORDER[idx];this.index=idx;this.current=this.ruleByKey[key];this.current.init(t);this.lastAnnounce=id;this.lastChecked=-1;this.lastCx=this.lastCy=-1;this.lastArea=0;this.stableAt=0;set('course',key.toUpperCase());showPositionConfirm(false);event('COURSE_ANNOUNCED',{course:key,tag:id});if(key===this.emergencySpot&&!this.emergencyTriggered){this.emergencyPendingAt=t+5000;event('THKC_SCHEDULED',{course:key,delayMs:5000})}if(key==='b01')this.tagLockUntil=t+20000;return true}
 handle(d,t){if(this.result!=='RUNNING')return;if(t<this.tagLockUntil)return;const id=d.id;set('tag',id);
   if(this.current&&(this.current.key==='b08'||this.current.key==='b12')&&id!==this.current.d.start){
     this.current.repeatStartWaitingReturn=false;
   }
   if(id===141){
     const wasExpired=this.total18Expired;
     this.tag141Seen=true;
     this.total18NextReminderAt=0;
     stopTotal18Ticker();
     event('TAG_141_SEEN',{
       atMs:Math.max(0,t-(this.total18StartAt||t)),
       before18Min:!this.total18DeadlineAt||t<=this.total18DeadlineAt,
       after18Min:wasExpired
     });
     if(wasExpired){
       set('status','✅ ĐÃ THẤY TAG 141 — DỪNG NHẮC QUÁ TỔNG THỜI GIAN');
       event('TOTAL18_REMINDER_STOP',{reason:'TAG_141_SEEN'});
     }
   }
   this.announce(id,t);if(!this.current)return;const key=this.current.key;const ret=this.current.process(id,d.area,true,d.center,t);if(this.current.d.check===id||COURSE_DEFS[key].check===id){const moved=this.lastCx<0?0:Math.hypot(d.center.x-this.lastCx,d.center.y-this.lastCy),ad=Math.abs(d.area-this.lastArea);this.lastCx=d.center.x;this.lastCy=d.center.y;this.lastArea=d.area;if(moved<DISTANCE_THRESHOLD&&ad<AREA_THRESHOLD){if(!this.stableAt)this.stableAt=t;const stable=t-this.stableAt;set('stable',`${(stable/1000).toFixed(1)}s`);if(stable>=STABLE_MS&&this.lastChecked!==id){this.lastChecked=id;this.current.checkTarget(d.area,t);this.stableAt=0}}else this.stableAt=0}
   if(this.current.is_finished){
     const finished=this.current.key;
     if(finished==='KT'){
       this.result='COMPLETED';
       this.totalElapsed=Date.now()-this.startedAt;
       event('EXAM_COMPLETED',{elapsedMs:this.totalElapsed,result:'COMPLETED'});
       set('status','HOÀN THÀNH');
       alertMsg('🏆 HOÀN THÀNH SA HÌNH',7000);
       set('course','HOÀN THÀNH');
       set('startBtn','✅ HOÀN THÀNH — THI LẠI ĐỂ BẮT ĐẦU');
       this.current=null;
     }else{
       set('status',this.current.result==='PASS'?'ĐẠT — TIẾP TỤC BÀI TIẾP THEO':'CÓ LỖI — TIẾP TỤC BÀI TIẾP THEO');
       if(finished==='b01' && this.total18StartAt && !this.tag141Seen){
         // TAG 111 chỉ kết thúc B01, tuyệt đối không kết thúc bộ đếm 18 phút.
         const remain=Math.max(0,this.total18DeadlineAt-t); set('totalTimer',fmtTotal18Countdown(this.total18DeadlineAt,t));
         event('B01_FINISHED_GLOBAL_TIMER_CONTINUES',{remainMs:remain});
       }
       const rb=$('retryBtn');if(rb)rb.classList.remove('hidden');
       this.current=null;
     }
   }
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
   // TỔNG 18 PHÚT: tính từ lúc phát baobai.mp3, áp dụng cho toàn bộ bài thi.
   // Khi thấy TAG 141 thì dừng kiểm soát timeout 18 phút.
   // INVARIANT: total18StartAt chỉ được set một lần bởi B01/baobai.mp3; các TAG/Bài sau không reset.
   if(this.total18StartAt&&!this.tag141Seen&&!this.total18Expired){
     const remain=Math.max(0,this.total18DeadlineAt-performance.now());
     // Đồng hồ tổng được điều khiển bởi total18Ticker độc lập với detector.
     if(remain<=0){
       this.total18Expired=true;
       set('totalTimer','00:00');set('totalTimerBig','00:00');set('totalClockHint','Đã hết 18 phút — đang chờ TAG 141');
       stopTotal18Ticker();
       if(!this.total18NextReminderAt){
         this.total18NextReminderAt=t;
         event('TOTAL_18MIN_TIMEOUT',{message:'Hết 18 phút nhưng chưa thấy TAG 141'});
         set('status','⛔ HẾT 18 PHÚT — CHƯA THẤY TAG 141 — NHẮC MỖI 5 GIÂY');
         set('courseTimer','HẾT GIỜ');
         alertMsg('⏰ HẾT 18 PHÚT — CHƯA THẤY TAG 141',7000);
       }
     }
   }

   // Sau khi hết 18 phút: phát "Quá tổng thời gian" ngay và lặp lại mỗi 5 giây
   // cho đến khi camera nhận TAG 141. Không dừng camera/engine để vẫn có thể nhận TAG 141.
   if(this.total18Expired&&!this.tag141Seen&&this.total18NextReminderAt&&t>=this.total18NextReminderAt){
     playSharedAudio('quatong.mp3');
     event('TOTAL18_REMINDER',{intervalMs:5000,atMs:t-(this.total18StartAt||t)});
     this.total18NextReminderAt=t+5000;
     set('status','⛔ QUÁ TỔNG THỜI GIAN — CHỜ TAG 141');
   }
   if(this.current&&this.current.startedAt){
     if((this.current.key==='b08'||this.current.key==='b12')&&this.current.repeatStartDeadlineAt&&!this.current.repeatStartDone){
       const remainRepeat=Math.max(0,this.current.repeatStartDeadlineAt-t);
       const sec=Math.ceil(remainRepeat/1000);
       set('courseTimer',`${sec}s`);
       showSecondaryTimer('⏱ THỜI GIAN PHỤ — 120 GIÂY',remainRepeat,`${this.current.key.toUpperCase()} — chờ TAG ${this.current.d.start} lần 2`);
       if(remainRepeat<=0&&!this.current.is_finished){
         this.current.audio('quatgbai.mp3');
         this.current.repeatStartDone=true;
         this.current.repeatStartDeadlineAt=0;
         event('POSITION_RULE_120S_TIMEOUT',{
           course:this.current.key,
           startTag:this.current.d.start,
           message:'Quá 120 giây chưa thấy TAG vào bài lần 2'
         });
         set('status',`${this.current.key.toUpperCase()} — QUÁ 120s — PHÁT QUATGBAI`);
         this.current.finish('TIMEOUT',`Quá 120s — chưa thấy TAG ${this.current.d.start} lần 2`);
       }
     }else if(this.current.key==='b03' && this.current.delayAt>0){
       const remain30=Math.max(0,30000-(t-this.current.delayAt));
       const sec=Math.ceil(remain30/1000);
       set('courseTimer',`${sec}s`);
       showSecondaryTimer('⏱ THỜI GIAN PHỤ — 30 GIÂY',remain30,'B03 — thời gian sau DỪNG XE, giám sát TAG 32');
       if(remain30<=0 && !this.current.warnedTimeout && !this.current.is_finished){
         // Chỉ xử lý quá 30s khi detector của vòng handle còn thấy chính TAG 32.
         // Không tự phát cảnh báo nếu TAG 32 đã rời khung.
       }
     }else if(this.current.key==='b01'){
       if(this.current.state===1){
         const remain=Math.max(0,20000-(t-this.current.startedAt));
         set('courseTimer',`${Math.ceil(remain/1000)}s`);
         hideSecondaryTimer();
         set('startBtn',`⏳ ĐỢI XUẤT PHÁT — ${Math.ceil(remain/1000)}s`);
         if(remain<=0){this.current.b01(null,true,t);this.tagLockUntil=0;set('status','ĐÃ PHÁT LỆNH XUẤT PHÁT — CHỜ TAG 111 (30s)');}
       }else if(this.current.state===2){
         const remain30=Math.max(0,30000-(t-this.current.startedAt));
         const sec=Math.ceil(remain30/1000);
         set('courseTimer',`${sec}s`);
         showSecondaryTimer('⏱ THỜI GIAN PHỤ — 30 GIÂY',remain30,'B01 — chờ TAG 111');
         if(remain30<=0&&!this.current.is_finished){
           this.current.b01(null,true,t);
         }
       }
     }else{
       hideSecondaryTimer();
       const remain=Math.max(0,this.current.d.limit*1000-(t-this.current.startedAt));
       set('courseTimer',`${Math.ceil(remain/1000)}s`);
     }
   }else{
     hideSecondaryTimer();
   }
 }
}
function fmtTotal18Countdown(deadlineMs, nowMs){
  const remainingMs=Math.max(0,deadlineMs-nowMs);
  const totalSec=Math.max(0,Math.ceil(remainingMs/1000));
  const mm=Math.floor(totalSec/60);
  const ss=totalSec%60;
  return `${mm}:${String(ss).padStart(2,'0')}`;
}
function fmt(ms){const s=Math.floor(ms/1000),m=Math.floor(s/60),ss=s%60;return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`}

function switchAppTab(tab){
  const exam=$('examTabPanel'), teacher=$('teacherTabPanel');
  const eb=$('tabExamBtn'), tb=$('tabTeacherBtn');
  const isTeacher=tab==='teacher';
  if(exam)exam.classList.toggle('hidden',isTeacher);
  if(teacher)teacher.classList.toggle('hidden',!isTeacher);
  if(eb)eb.classList.toggle('active',!isTeacher);
  if(tb)tb.classList.toggle('active',isTeacher);
}
function initAppTabs(){
  const tabs=$('appTabs');
  if(!tabs)return;
  $('tabExamBtn')?.addEventListener('click',()=>switchAppTab('exam'));
  $('tabTeacherBtn')?.addEventListener('click',()=>switchAppTab('teacher'));
}
initAppTabs();

async function startExam(){
  switchAppTab('exam');
  showLocalVehicleProfile();
  stopTotal18Ticker();
  showPositionConfirm(false);
  if(!window.currentTeacher){alertMsg('Chưa đăng nhập giáo viên');return}
  const sb=$('startBtn');
  // Chuyển ngay sang trạng thái ĐỢI XUẤT PHÁT khi bấm nút.
  if(sb){sb.disabled=true;sb.textContent='⏳ ĐỢI XUẤT PHÁT';sb.classList.add('running')}
  set('status','ĐỢI XUẤT PHÁT — ĐANG MỞ CAMERA');
  const rb=$('retryBtn');if(rb)rb.classList.remove('hidden');
  if(!await openCamera()){
    if(sb){sb.disabled=false;sb.textContent='▶ BẮT ĐẦU';sb.classList.remove('running')}
    return
  }
  const audioOk=await unlockAudio();
  if(!audioOk){
    if(sb){sb.disabled=false;sb.textContent='▶ BẮT ĐẦU';sb.classList.remove('running')}
    return
  }
  engine=new ExamEngine();
  set('status','ĐỢI XUẤT PHÁT — CHỜ TAG 01');
  set('course','WAITING');set('tag','--');set('timer','00:00');set('stable','0.0s');set('courseTimer','--');hideSecondaryTimer();set('totalTimer','18:00');set('totalTimerBig','18:00');set('totalClockHint','Bắt đầu khi phát báo bài B01');
  persist();event('EXAM_STARTED',{teacher:window.currentTeacher});alertMsg('🚗 BẮT ĐẦU — CHỜ TAG 01');
}
async function retryExam(){
  switchAppTab('exam');
  showLocalVehicleProfile();
  stopTotal18Ticker();
  showPositionConfirm(false);
  const rb=$('retryBtn');
  const sb=$('startBtn');
  if(rb){rb.disabled=true;rb.textContent='⏳ ĐANG THI LẠI...';}
  try{
    // Dừng phiên cũ + audio + camera.
    if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0;}catch(_){} }
    activeAudio=null;
    if(engine){engine.result='STOPPED';}
    stopCamera();
  }catch(e){console.warn('Retry cleanup:',e)}

  // Xóa hoàn toàn phiên cũ để không còn bộ đếm/khóa TAG cũ.
  engine=null;
  try{localStorage.removeItem('sahinh_exam_v2')}catch(_){}
  set('course','WAITING');
  set('tag','--');
  set('status','ĐANG THI LẠI — CHUẨN BỊ NHẬN TAG 01');
  set('timer','00:00');
  set('stable','0.0s');
  set('courseTimer','--');
  hideSecondaryTimer();
  set('totalTimer','18:00');set('totalTimerBig','18:00');set('totalClockHint','Bắt đầu khi phát báo bài B01');
  const alert=$('alert');
  if(alert){alert.classList.add('hidden');alert.textContent='';}
  try{clearOverlay()}catch(_){}

  // THI LẠI = bắt đầu lại ngay, không cần bấm BẮT ĐẦU lần nữa.
  if(sb){
    sb.style.display=window.currentTeacher?'block':'none';
    sb.textContent='⏳ ĐỢI XUẤT PHÁT';
    sb.disabled=true;
    sb.classList.add('running');
  }
  try{
    if(!window.currentTeacher) throw Error('Chưa đăng nhập giáo viên');
    const cameraOk=await openCamera();
    if(!cameraOk) throw Error('Không mở được camera');
    const audioOk=await unlockAudio();
    if(!audioOk) throw Error('Không khởi tạo được audio MP3');
    engine=new ExamEngine();
    set('status','ĐỢI XUẤT PHÁT — SẴN SÀNG NHẬN TAG 01');
    set('course','WAITING');
    set('tag','--');
    set('timer','00:00');
    set('courseTimer','--');
    hideSecondaryTimer();
    set('totalTimer','18:00');set('totalTimerBig','18:00');set('totalClockHint','Bắt đầu khi phát báo bài B01');
    persist();
    event('RETRY_EXAM',{resetAllTimers:true,nextCourse:'B01',nextTag:1,autoStart:true});
  }catch(e){
    engine=null;
    if(sb){sb.textContent='▶ BẮT ĐẦU';sb.disabled=false;sb.classList.remove('running')}
    set('status','❌ THI LẠI LỖI: '+(e.message||e.name||'Không xác định'));
    alertMsg('❌ THI LẠI LỖI: '+(e.message||e.name||'Không xác định'),7000);
  }finally{
    if(rb){rb.disabled=false;rb.textContent='🔄 THI LẠI';}
  }
}
window.retryExam=retryExam;
function finishLocal(){showPositionConfirm(false);stopTotal18Ticker();if(engine){event('EXAM_STOPPED',{result:'STOPPED'});engine.result='STOPPED';persist()}stopCamera();}
async function loop(t){
  if(video&&video.readyState>=2&&engine&&adapter?.ready&&!processing){
    processing=true;
    try{
      const vw=video.videoWidth||640, vh=video.videoHeight||360;
      if(workCanvas.width!==vw) workCanvas.width=vw;
      if(workCanvas.height!==vh) workCanvas.height=vh;
      workCtx.drawImage(video,0,0,vw,vh);
      const detected=await adapter.detectFrame(workCanvas);
      const ds=selectNearestTag(detected);
      drawDetections(ds);
      if(ds.length){
        set('tag',ds[0].id);
        set('status','🟢 NHẬN TAG GẦN NHẤT '+ds[0].id);
        engine.handle(ds[0],t);
      }else{
        if(engine?.current&&(engine.current.key==='b08'||engine.current.key==='b12')){
          engine.current.repeatStartWaitingReturn=false;
        }
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
  showLocalVehicleProfile();
  video=$('video');overlay=$('overlay');overlayCtx=overlay.getContext('2d');workCanvas=document.createElement('canvas');workCtx=workCanvas.getContext('2d',{willReadFrequently:true});
  const KEY='sahinh_teacher_session_v1';
  const id=x=>document.getElementById(x);
  function show(t){id('loginOverlay').style.display=t?'none':'flex';const tabs=id('appTabs');if(tabs)tabs.classList.toggle('hidden',!t);switchAppTab('exam');if(t){id('startBtn').style.display='block';id('teacherName').textContent='Xin chào, '+(t.hoTen||t.name||'Giáo viên');id('teacherCode').textContent=' • '+(t.maGV||t.code||'');}else{id('startBtn').style.display='none';}}
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
  $('retryBtn').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();retryExam();});
  $('confirmPositionBtn').addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    capturePositionReference();
  });
  try{adapter=new AprilTagAdapter();await adapter.init();set('status','SẴN SÀNG — AprilTag 36h11')}catch(e){console.error(e);set('status','LỖI APRILTAG');alertMsg(e.message,7000)}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
  raf=requestAnimationFrame(loop);
});
