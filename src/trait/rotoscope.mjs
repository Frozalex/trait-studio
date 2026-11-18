// Video tracing is a draft until insertion; the native editor owns history and playback.
import {emptyDocument, createObject, createFrame} from '../demo.mjs';
import {movieclipFigure} from '../movieclips.mjs';

export const TRACE_JOINTS = Object.freeze(['Tête','Cou','Épaule gauche','Coude gauche','Poignet gauche','Épaule droite','Coude droit','Poignet droit','Hanche gauche','Genou gauche','Cheville gauche','Hanche droite','Genou droit','Cheville droite']);
export const TRACE_LINKS = Object.freeze([[1,2],[2,3],[3,4],[1,5],[5,6],[6,7],[8,9],[9,10],[11,12],[12,13]]);
export const TRACE_LIMIT = 900;
export function tracePlan({start=0,end,duration,fps}) {
  if(![start,end,duration,fps].every(Number.isFinite)||start<0||end<=start||end>duration+.001||!Number.isInteger(fps)||fps<1||fps>120)throw new Error('Choisis un extrait valide et une cadence entre 1 et 120 images/s.');
  const count=Math.ceil((end-start)*fps-1e-7);
  if(end-start>30||count>TRACE_LIMIT)throw new Error('Choisis au plus 30 secondes et 900 images par extrait.');
  return {start,end,fps,count,times:Array.from({length:count},(_,i)=>start+i/fps)};
}
export function traceTemplate() {
  return [[.5,.18],[.5,.28],[.42,.3],[.36,.42],[.32,.55],[.58,.3],[.64,.42],[.68,.55],[.45,.55],[.43,.72],[.41,.9],[.55,.55],[.57,.72],[.59,.9]];
}
export function validateTracePoints(points) {
  if(!Array.isArray(points)||points.length!==TRACE_JOINTS.length||points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1)))throw new Error('Les 14 articulations doivent se trouver dans la vidéo.');
  return points;
}
export function correctTrace(samples,frame,joint,point) {
  if(!samples[frame]||!Number.isInteger(joint)||joint<0||joint>=TRACE_JOINTS.length)throw new Error('Articulation inconnue.');
  const points=samples[frame].points.map(p=>[...p]);points[joint]=point;
  validateTracePoints(points);
  // Following positions were tracked from the old pose; they must be retraced.
  const next=samples.slice(0,frame+1);
  next[frame]={...samples[frame],points,uncertain:samples[frame].uncertain.filter(i=>i!==joint),manual:[...new Set([...(samples[frame].manual||[]),joint])]};
  return next;
}
const parents=[0,1,1,3,4,1,6,7,0,9,10,0,12,13];
function pose(points,width,height,scale,offset) {
  const p=points.map(([x,y])=>[x*width*scale+offset[0],y*height*scale+offset[1]]);
  return [[(p[8][0]+p[11][0])/2,(p[8][1]+p[11][1])/2],p[1],[2*p[0][0]-p[1][0],2*p[0][1]-p[1][1]],...p.slice(2)];
}
export function createTraceDocument({samples,plan,width,height,canvasWidth=width,canvasHeight=height,color='#53c7b5'}) {
  if(!Array.isArray(samples)||!samples.length||samples.length>TRACE_LIMIT||samples.length>plan?.count||![width,height,canvasWidth,canvasHeight].every(v=>Number.isFinite(v)&&v>0&&v<=8192)||!/^#[0-9a-f]{6}$/i.test(color))throw new Error('Capture invalide.');
  tracePlan({start:plan.start,end:plan.end,duration:plan.end,fps:plan.fps});
  samples.forEach((s,i)=>{validateTracePoints(s.points);if(Math.abs(s.time-plan.times[i])>1e-6||!Number.isFinite(s.time)||!Array.isArray(s.uncertain))throw new Error('Les images doivent conserver leur ordre et leur timing.');});
  const scale=Math.min(canvasWidth/width,canvasHeight/height),offset=[(canvasWidth-width*scale)/2,(canvasHeight-height*scale)/2];
  const first=pose(samples[0].points,width,height,scale,offset),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  const segments=parents.map((parent,i)=>({segment_id:i+1,parent_id:parent,name:TRACE_JOINTS[i===0?1:i===1?0:i],length:Math.hypot(first[i+1][0]-first[parent][0],first[i+1][1]-first[parent][1]),angle_rad:Math.atan2(first[i+1][1]-first[parent][1],first[i+1][0]-first[parent][0]),thickness:Math.max(2,Math.min(canvasWidth,canvasHeight)*.009),bend_rad:0,primitive_code:i===1?1:0,aux_code:0,flags:i===1?1:0,segment_type:i===1?'circle':'line',segment_kind:i===1?'circle':'line',color_rgb:rgb,transparency:0,visible:true,z_order:i+1}));
  const figure={figure_type_id:1,name:'Trait · Rotoscopie',segment_count:segments.length,segments,polyfills:[],image_assets:[],text_assets:[]};
  const report=emptyDocument();report.canvas_width=canvasWidth;report.canvas_height=canvasHeight;report.fps=plan.fps;report.figure_types=[figure];
  report._styk.name='Vidéo → stickman';
  report._styk.traitTrace={version:1,method:'manual-pyramidal-lk',width,height,sourceStart:plan.start,sourceEnd:Math.min(plan.end,plan.start+samples.length/plan.fps),samples:samples.map(s=>({time:s.time,uncertain:[...s.uncertain],manual:[...(s.manual||[])]}))};
  let previous;
  report.keyframes=[...samples,samples.at(-1)].map(sample=>{
    const p=pose(sample.points,width,height,scale,offset),angles=parents.map((parent,i)=>Math.atan2(p[i+1][1]-p[parent][1],p[i+1][0]-p[parent][0]));
    if(previous)angles.forEach((angle,i)=>{angles[i]=angle+2*Math.PI*Math.round((previous[i]-angle)/(2*Math.PI));});previous=angles;
    const lengths=parents.map((parent,i)=>Math.hypot(p[i+1][0]-p[parent][0],p[i+1][1]-p[parent][1]));
    return {...createFrame([createObject(figure,1,...p[0],{angles,len_flag:1,lengths})],1),_styk:{easing:{interpolation:'hold'}}};
  });return report;
}
export function insertTrace(editor,capture) {
  if(editor.report.fps!==capture.plan.fps)throw new Error('La cadence du projet a changé. Recommence la capture à cette cadence.');
  const document=createTraceDocument({...capture,canvasWidth:editor.report.canvas_width,canvasHeight:editor.report.canvas_height}),duration=capture.samples.length,start=editor.tick;
  const figure=movieclipFigure(1,'Trait · Vidéo → stickman',document,{duration,pivot:{x:document.canvas_width/2,y:document.canvas_height/2}});
  const asset=emptyDocument();asset.fps=document.fps;asset.figure_types=[figure];asset.keyframes=[createFrame([createObject(figure,1,0,0,{_stykMovieclip:{start:0,end:duration,offset:0,speed:1,mode:'once'}})])];
  return editor.movieclipBatch('Insert video tracing',()=>{
    const object=editor.importFigure(asset);
    if(editor.report._styk?.layerSheet){const layer=editor.layerForUid(object.unique_id),span=editor.sheetSpan(layer,start);if(span.end<start+duration)editor.sheetSetDuration(start+duration-span.start,layer,start);}
    editor.seek(start);editor.select(object.unique_id);return object;
  });
}
