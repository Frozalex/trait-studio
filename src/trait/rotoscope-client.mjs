export const abortError=()=>new DOMException('Capture annulée.','AbortError');
function mediaEvent(video,event,signal,action) {
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(abortError());return;}
    const cleanup=()=>{clearTimeout(timer);video.removeEventListener(event,done);video.removeEventListener('error',failed);signal?.removeEventListener('abort',aborted);};
    const done=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(new Error('Vidéo illisible. Essaie un fichier MP4 (H.264) ou WebM pris en charge par ton appareil.'));},aborted=()=>{cleanup();reject(abortError());};
    const timer=setTimeout(()=>{cleanup();reject(new Error('La lecture de cette image a pris trop de temps.'));},15000);
    video.addEventListener(event,done,{once:true});video.addEventListener('error',failed,{once:true});signal?.addEventListener('abort',aborted,{once:true});
    try{action();}catch(error){cleanup();reject(error);}
  });
}
export async function openTraceVideo(file,signal) {
  if(!file||file.size>256*1024*1024||file.size===0)throw new Error('Choisis une vidéo non vide de moins de 256 Mo.');
  const video=document.createElement('video'),url=URL.createObjectURL(file);video.muted=true;video.playsInline=true;video.preload='auto';
  const dispose=()=>{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);};
  try{
    await mediaEvent(video,'loadeddata',signal,()=>{video.src=url;video.load();});
    if(!Number.isFinite(video.duration)||video.duration<=0||Math.min(video.videoWidth,video.videoHeight)<16||Math.max(video.videoWidth,video.videoHeight)>8192)throw new Error('La durée ou les dimensions de cette vidéo ne sont pas prises en charge.');
    return {video,width:video.videoWidth,height:video.videoHeight,duration:video.duration,dispose};
  }catch(error){dispose();throw error;}
}
export async function seekTraceVideo(video,time,signal) {
  if(signal?.aborted)throw abortError();
  if(!video.seeking&&video.readyState>=2&&Math.abs(video.currentTime-time)<.00001)return;
  await mediaEvent(video,'seeked',signal,()=>{video.currentTime=time;});
  if(signal?.aborted)throw abortError();
}
export class TraceTracker {
  constructor(signal) {
    if(signal?.aborted)throw abortError();
    this.worker=new Worker(new URL('./rotoscope-worker.mjs',import.meta.url),{type:'module'});this.serial=0;this.pending=null;this.signal=signal;
    this.abort=()=>this.dispose();signal?.addEventListener('abort',this.abort,{once:true});
    this.worker.onmessage=({data})=>{if(this.pending?.id!==data.id)return;const {resolve,reject,timer}=this.pending;this.pending=null;clearTimeout(timer);data.error?reject(new Error(data.error)):resolve(data.result);};
    this.worker.onerror=()=>this.dispose(new Error('Le suivi a été interrompu. Tu peux continuer à placer les poses manuellement.'));
  }
  async frame(video,points) {
    if(!this.worker)throw abortError();
    if(this.pending)throw new Error('Une image est déjà en cours de suivi.');
    const scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));
    const bitmap=await createImageBitmap(video,{resizeWidth:Math.max(16,Math.round(video.videoWidth*scale)),resizeHeight:Math.max(16,Math.round(video.videoHeight*scale)),resizeQuality:'high'});
    if(!this.worker){bitmap.close();throw abortError();}
    return new Promise((resolve,reject)=>{
      const id=++this.serial,timer=setTimeout(()=>this.dispose(new Error('Le suivi ne répond plus. Réessaie avec un extrait plus court.')),15000);
      this.pending={id,resolve,reject,timer};
      try{this.worker.postMessage({id,bitmap,points},[bitmap]);}catch(error){bitmap.close();this.dispose(error);}
    });
  }
  dispose(error=abortError()) {
    this.signal?.removeEventListener('abort',this.abort);this.worker?.terminate();this.worker=null;
    if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}
  }
}
