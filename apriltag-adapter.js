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
  async detectFrame(canvas){
    if(!this.ready || this.busy) return [];
    const now=performance.now();
    if(now-this.lastRun<this.intervalMs) return [];
    this.lastRun=now;
    this.busy=true;
    try{
      const w=canvas.width,h=canvas.height;
      if(!w||!h) return [];
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const imageData=ctx.getImageData(0,0,w,h);
      const markers=this.detector.detect(imageData)||[];
      return markers.map(m=>{
        const corners=(m.corners||[]).map(p=>({x:Number(p.x),y:Number(p.y)}));
        const center=corners.length?{
          x:corners.reduce((s,p)=>s+p.x,0)/corners.length,
          y:corners.reduce((s,p)=>s+p.y,0)/corners.length
        }:{x:0,y:0};
        let area=0;
        for(let i=0;i<corners.length;i++){
          const a=corners[i],b=corners[(i+1)%corners.length];
          area+=a.x*b.y-b.x*a.y;
        }
        area=Math.abs(area)/2;
        return {id:Number(m.id),center,corners:corners.map(p=>[p.x,p.y]),area};
      });
    }finally{this.busy=false;}
  }
}
window.AprilTagAdapter=AprilTagAdapter;
