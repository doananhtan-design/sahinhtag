/*
 * AprilTag 36h11 adapter for browser/PWA.
 * Uses js-aruco2 in the browser; no video is uploaded to a server.
 * js-aruco2 exposes AR.Detector and supports AprilTag dictionaries.
 */
class AprilTagAdapter {
  constructor(){
    this.detector=null;
    this.ready=false;
    this.busy=false;
    this.lastRun=0;
    this.intervalMs=55;
  }
  async init(){
    if(!window.AR || !window.AR.Detector) throw new Error('Chưa tải được bộ nhận dạng AprilTag.');
    if(!window.AR.DICTIONARIES || !window.AR.DICTIONARIES.APRILTAG_36h11){
      throw new Error('Chưa tải dictionary tag36h11.');
    }
    this.detector=new AR.Detector({dictionaryName:'APRILTAG_36h11', maxHammingDistance:3});
    this.ready=true;
  }

  preprocessTagCanvas(canvas){
    // Tăng khả năng nhận TAG khi hình camera hơi tối/thiếu tương phản.
    // Không thay đổi ID, dictionary hay luật bài thi.
    const w=canvas.width,h=canvas.height;
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const x=c.getContext('2d',{willReadFrequently:true});
    x.drawImage(canvas,0,0,w,h);
    const im=x.getImageData(0,0,w,h), p=im.data;
    for(let i=0;i<p.length;i+=4){
      const y=0.299*p[i]+0.587*p[i+1]+0.114*p[i+2];
      const v=Math.max(0,Math.min(255,(y-128)*1.18+128));
      p[i]=p[i+1]=p[i+2]=v;
    }
    x.putImageData(im,0,0);
    return c;
  }

  async detectFrame(canvas){
    if(!this.ready || this.busy) return [];
    const now=performance.now();
    if(now-this.lastRun<this.intervalMs) return [];
    this.lastRun=now;
    this.busy=true;
    try{
      const w=canvas.width,h=canvas.height;
      if(!w||!h) return [];

      const toMarkers=(markers,ox=0,oy=0,sx=1,sy=1)=>{
        return (markers||[]).map(m=>{
          const corners=(m.corners||[]).map(p=>({x:Number(p.x)*sx+ox,y:Number(p.y)*sy+oy}));
          const center=corners.length?{
            x:corners.reduce((q,p)=>q+p.x,0)/corners.length,
            y:corners.reduce((q,p)=>q+p.y,0)/corners.length
          }:{x:0,y:0};
          let area=0;
          for(let i=0;i<corners.length;i++){
            const aa=corners[i],bb=corners[(i+1)%corners.length];
            area+=aa.x*bb.y-bb.x*aa.y;
          }
          return {id:Number(m.id),center,corners:corners.map(p=>[p.x,p.y]),area:Math.abs(area)/2};
        });
      };

      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const original=ctx.getImageData(0,0,w,h);
      let markers=this.detector.detect(original)||[];
      if(markers.length) return toMarkers(markers);

      // Pass 2: grayscale + local contrast.
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      const cx=c.getContext('2d',{willReadFrequently:true});
      cx.drawImage(canvas,0,0);
      const im=cx.getImageData(0,0,w,h), p=im.data;
      for(let i=0;i<p.length;i+=4){
        const y=.299*p[i]+.587*p[i+1]+.114*p[i+2];
        const v=Math.max(0,Math.min(255,(y-128)*1.35+128));
        p[i]=p[i+1]=p[i+2]=v;
      }
      cx.putImageData(im,0,0);
      markers=this.detector.detect(im)||[];
      if(markers.length) return toMarkers(markers);

      // Pass 3: enlarged central scan region. This helps when the TAG is small.
      const rw=Math.floor(w*.78), rh=Math.floor(h*.78);
      const ox=Math.floor((w-rw)/2), oy=Math.floor((h-rh)/2);
      const z=2;
      const roi=document.createElement('canvas'); roi.width=rw*z; roi.height=rh*z;
      const rx=roi.getContext('2d',{willReadFrequently:true});
      rx.imageSmoothingEnabled=false;
      rx.drawImage(canvas,ox,oy,rw,rh,0,0,roi.width,roi.height);
      const rim=rx.getImageData(0,0,roi.width,roi.height);
      markers=this.detector.detect(rim)||[];
      if(markers.length) return toMarkers(markers,ox,oy,1/z,1/z);

      // Pass 4: enlarged contrast ROI.
      const rp=rim.data;
      for(let i=0;i<rp.length;i+=4){
        const y=.299*rp[i]+.587*rp[i+1]+.114*rp[i+2];
        const v=Math.max(0,Math.min(255,(y-128)*1.45+128));
        rp[i]=rp[i+1]=rp[i+2]=v;
      }
      markers=this.detector.detect(rim)||[];
      if(markers.length) return toMarkers(markers,ox,oy,1/z,1/z);

      return [];
    }finally{
      this.busy=false;
    }
  }}
window.AprilTagAdapter=AprilTagAdapter;
