// Original Trait Studio choreography, GPL-3.0-or-later.
// Poses are ordinary native lines/circles, editable with the existing tools.
import {emptyDocument, createObject, createFrame} from '../demo.mjs';
import {movieclipFigure} from '../movieclips.mjs';

export const MOTIONS = Object.freeze([
  {id:'run', name:'Course', subtitle:'Contact, poussée, suspension', loop:true},
  {id:'walk', name:'Marche', subtitle:'Une foulée posée, huit poses', loop:true},
  {id:'jump', name:'Saut', subtitle:'Anticipation et amorti', loop:false},
  {id:'wave', name:'Salut', subtitle:'Un geste expressif', loop:true},
  {id:'idle', name:'Respiration', subtitle:'Un personnage qui reste vivant', loop:true},
  {id:'moonwalk', name:'Moonwalk', subtitle:'Glisse et transfert de poids', loop:true},
]);
export const COLORS = ['#53c7b5','#f2ac57','#91a8ff','#ed7ca5','#343c50'];
const parents = [0,1,1,3,1,5,0,7,0,9];
const names = ['Buste','Tête','Bras gauche','Avant-bras gauche','Bras droit','Avant-bras droit','Cuisse gauche','Jambe gauche','Cuisse droite','Jambe droite'];
const RUN_FOOT = [[52,0],[25,0],[-6,0],[-38,0],[-58,-18],[-40,-57],[3,-70],[43,-29]];
const RUN_KNEE = [[28,-58],[23,-51],[8,-55],[-11,-62],[-35,-70],[-18,-91],[25,-97],[46,-76]];
const RUN_ELBOW = [[-20,-126],[-11,-118],[12,-120],[37,-133],[44,-140],[30,-138],[11,-134],[-9,-132]];
const RUN_HAND = [[-4,-104],[20,-104],[44,-129],[57,-157],[51,-167],[30,-164],[11,-157],[-3,-133]];
const lerp=(a,b,t)=>a+(b-a)*t;
function sample(points,phase){const p=((phase%1)+1)%1*points.length,i=Math.floor(p),a=points[i],b=points[(i+1)%points.length];return a.map((v,n)=>lerp(v,b[n],p-i));}
export function motionPoints(id,phase){
  if(!MOTIONS.some(m=>m.id===id))throw new Error('Unknown motion.');
  const p=((phase%1)+1)%1, s=Math.sin(p*Math.PI*2);
  let hip=[0,-112],neck=[0,-166],el=[-27,-137],hl=[-34,-107],er=[27,-137],hr=[34,-107],kl=[-19,-58],fl=[-24,0],kr=[19,-58],fr=[24,0];
  if(id==='run'){
    hip=[8,-110-Math.sin(p*Math.PI*4)*4];neck=[26,hip[1]-48];
    kl=sample(RUN_KNEE,p);fl=sample(RUN_FOOT,p);kr=sample(RUN_KNEE,p+.5);fr=sample(RUN_FOOT,p+.5);
    el=sample(RUN_ELBOW,p);hl=sample(RUN_HAND,p);er=sample(RUN_ELBOW,p+.5);hr=sample(RUN_HAND,p+.5);
  }else if(id==='walk'){
    hip=[0,-112+Math.cos(p*Math.PI*4)*2];neck=[4,hip[1]-54];
    const foot=q=>q<.5?[44-176*q,0]:[-44+176*(q-.5),-Math.sin((q-.5)*Math.PI*2)*24];
    fl=foot(p);fr=foot((p+.5)%1);kl=[fl[0]*.4+8,-57+fl[1]*.35];kr=[fr[0]*.4+8,-57+fr[1]*.35];
    el=[-s*17,-136];hl=[-s*35,-109];er=[s*17,-136];hr=[s*35,-109];
  }else if(id==='jump'){
    const crouch=Math.max(0,1-Math.abs(p-.15)/.15)*26+Math.max(0,1-Math.abs(p-.84)/.14)*19;
    const lift=p>.25&&p<.75?Math.sin((p-.25)/.5*Math.PI)*93:0;
    hip=[0,-112+crouch-lift];neck=[crouch*.22,hip[1]-54];
    kl=[-23-crouch*.45,-58+crouch*.32-lift];kr=[23+crouch*.45,-58+crouch*.32-lift];fl=[-28,-lift];fr=[28,-lift];
    const up=lift/93;el=[-30,neck[1]+30-up*55];er=[30,neck[1]+30-up*55];hl=[-45,neck[1]+60-up*110];hr=[45,neck[1]+60-up*110];
  }else if(id==='wave'){
    neck=[s*2,-166];er=[39,-174];hr=[48+s*16,-217];
  }else if(id==='idle'){
    neck=[0,-166-s*2];el[1]-=s;er[1]-=s;
  }else if(id==='moonwalk'){
    const foot=q=>q<.5?[35-140*q,0]:[-35+140*(q-.5),-Math.sin((q-.5)*Math.PI*2)*7];
    hip=[-9,-109];neck=[-20,-162];fl=foot(p);fr=foot((p+.5)%1);kl=[fl[0]*.4-22,-55];kr=[fr[0]*.4-22,-55];
    el=[-48,-140];hl=[-56,-114];er=[7,-137];hr=[12,-110];
  }
  return [hip,neck,[neck[0],neck[1]-38],el,hl,er,hr,kl,fl,kr,fr];
}
function rgb(hex){if(!/^#[0-9a-f]{6}$/i.test(hex))throw new Error('Choose a six-digit hex colour.');return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
export function figureAt(id='idle',phase=0,{color=COLORS[0],soft=true,mirror=false}={}){
  const points=motionPoints(id,phase).map(([x,y])=>[mirror?-x:x,y]);
  const hip=points[0],segments=parents.map((parent,i)=>{
    const from=points[parent],to=points[i+1],head=i===1;
    return {segment_id:i+1,parent_id:parent,name:names[i],length:Math.hypot(to[0]-from[0],to[1]-from[1]),angle_rad:Math.atan2(to[1]-from[1],to[0]-from[0]),thickness:head?6: i===0?7.5:6.5,bend_rad:soft&&!head?(i%2?-.07:.07)*(mirror?-1:1):0,primitive_code:head?1:0,aux_code:0,flags:head?1:0,segment_type:head?'circle':'line',segment_kind:head?'circle':'line',color_rgb:rgb(color),transparency:0,visible:true,z_order:i+1};
  });
  const figure={figure_type_id:1,name:'Trait · Élan',segment_count:10,segments,polyfills:[],image_assets:[],text_assets:[]};
  return {figure,object:createObject(figure,1,hip[0],hip[1])};
}
export function createFigureDocument(options={}){
  const {figure,object}=figureAt('idle',0,options),report=emptyDocument();
  report.figure_types=[figure];report.keyframes=[createFrame([object],1)];return report;
}
export function createMotionDocument(id,{frames=24,fps=24,...style}={}){
  if(!Number.isInteger(frames)||frames<8||frames>600)throw new RangeError('A motion must contain 8–600 frames.');
  if(!Number.isInteger(fps)||fps<1||fps>120)throw new RangeError('Choose a frame rate from 1 to 120.');
  const report=emptyDocument(),first=figureAt(id,0,style),ticks=Array.from({length:9},(_,i)=>Math.round(i*frames/8));
  report.fps=fps;report.figure_types=[first.figure];report._styk.name=MOTIONS.find(m=>m.id===id).name;
  report.keyframes=ticks.map((tick,i)=>{
    const {object,figure}=figureAt(id,i/8,style);
    object.len_flag=1;object.lengths=figure.segments.map(s=>s.length);object.bend_flag=1;object.bends=figure.segments.map(s=>s.bend_rad);
    return {...createFrame([object],i===8?1:ticks[i+1]-tick),_styk:{easing:{interpolation:'linear'}}};
  });return report;
}
export function createMotionAsset(id,options={}){
  const document=createMotionDocument(id,options),duration=options.frames??24;
  const figure=movieclipFigure(1,`Trait · ${document._styk.name}`,document,{duration,pivot:{x:0,y:-112}});
  const result=emptyDocument();result.fps=document.fps;result.figure_types=[figure];result.keyframes=[createFrame([createObject(figure,1,0,0,{_stykMovieclip:{start:0,end:duration,offset:0,speed:1,mode:MOTIONS.find(m=>m.id===id).loop?'loop':'once'}})])];return result;
}
export function insertMotion(editor,id,options={}){
  const frames=options.frames??24,start=editor.tick;
  return editor.movieclipBatch('Insert Trait motion',()=>{
    const object=editor.importFigure(createMotionAsset(id,{...options,fps:editor.report.fps}));
    if(editor.report._styk?.layerSheet){
      const layer=editor.layerForUid(object.unique_id),span=editor.sheetSpan(layer,start);
      if(span.end<start+frames)editor.sheetSetDuration(start+frames-span.start,layer,start);
    }
    editor.seek(start);editor.select(object.unique_id);return object;
  });
}
