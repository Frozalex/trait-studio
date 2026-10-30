// Original Trait choreography compiled to editable native keyframes.
import {emptyDocument, createObject, createFrame} from '../demo.mjs';
import {movieclipFigure} from '../movieclips.mjs';
import {characterAt,createCharacterDocument,dimensions,limb} from './character.mjs';
export {COLORS} from './character.mjs';

export const MOTIONS = Object.freeze([
  {id:'run',name:'Course',subtitle:'Poussée, suspension et réception',loop:true},
  {id:'walk',name:'Marche',subtitle:'Appuis au sol et transfert du poids',loop:true},
  {id:'jump',name:'Saut',subtitle:'Anticipation et amorti',loop:false},
  {id:'wave',name:'Salut',subtitle:'Un geste expressif',loop:true},
  {id:'idle',name:'Respiration',subtitle:'Un personnage qui reste vivant',loop:true},
  {id:'moonwalk',name:'Moonwalk',subtitle:'Glisse et transfert de poids',loop:true},
]);
const TAU=Math.PI*2,cycle=p=>((p%1)+1)%1,smooth=t=>t*t*(3-2*t);
function foot(phase,stance,span,lift) {
  const p=cycle(phase);
  if(p<=stance)return [span*(1-2*p/stance),0];
  const t=(p-stance)/(1-stance);
  // The swing matches the stance velocity at both contacts, avoiding a snap.
  const slope=-(1-stance)/stance;
  const x=span*(-1+2*smooth(t)+2*slope*(t*t*t*2-t*t*3+t));
  return [x,-lift*Math.sin(Math.PI*t)**2];
}
export function motionPoints(id,phase,options={}) {
  if(!MOTIONS.some(m=>m.id===id)||!Number.isFinite(phase))throw new Error('Mouvement invalide.');
  const d=dimensions(options),p=cycle(phase),s=Math.sin(TAU*p),walk=id==='walk',run=id==='run';
  let hip=[0,-d.leg*(.94+.006*s)],lean=.015*s,fl=[-d.leg*.22,0],fr=[d.leg*.22,0],leftSide=1,rightSide=-1;
  let armLeft=[-d.arm*.36,d.arm*.88],armRight=[d.arm*.36,d.arm*.88],armAngles=null;
  if(walk||run||id==='moonwalk') {
    const stance=run?.38:walk?.6:.5,span=d.leg*(run?.36:walk?.28:.27),lift=d.leg*(run?.52:walk?.18:.06);
    hip=[0,-d.leg*(run?.83-.05*Math.cos(2*TAU*(p-.19)):walk?.89+.025*Math.cos(2*TAU*(p-.3)):.90)];
    lean=run?.23:walk?.055:-.14;fl=foot(p,stance,span,lift);fr=foot(p+.5,stance,span,lift);leftSide=rightSide=-1;
    const swing=Math.cos(TAU*p)* (run?.85:.48);
    armAngles=[-swing,swing,run?1.4:.16];
  } else if(id==='jump') {
    const t=Math.min(1,Math.max(0,phase));
    const pulse=(a,b,c)=>t<a||t>c?0:t<=b?smooth((t-a)/(b-a)):1-smooth((t-b)/(c-b));
    const crouch=.28*pulse(0,.18,.32)+.20*pulse(.69,.82,1);
    const air=t>.30&&t<.73?Math.sin(Math.PI*(t-.30)/.43)**2:0,lift=air*d.leg*.90;
    hip=[0,-d.leg*(.94-crouch)-lift];lean=crouch*.8;
    fl=[-d.leg*.22,-lift];fr=[d.leg*.22,-lift];
    const angle=.40+2.0*pulse(.18,.47,.86);
    armLeft=[-Math.sin(angle)*d.arm*.92,Math.cos(angle)*d.arm*.92];armRight=[-armLeft[0],armLeft[1]];
  } else if(id==='wave') {
    armRight=[d.arm*(.61+.10*Math.sin(TAU*p*2)),-d.arm*(.58+.06*Math.cos(TAU*p*2))];
  }
  const neck=[hip[0]+Math.sin(lean)*d.torso,hip[1]-Math.cos(lean)*d.torso];
  let [el,hl]=limb(neck,[neck[0]+armLeft[0],neck[1]+armLeft[1]],d.arm,1);
  let [er,hr]=limb(neck,[neck[0]+armRight[0],neck[1]+armRight[1]],d.arm,-1);
  if(armAngles) {
    const chain=angle=>{const elbow=[neck[0]+Math.sin(angle)*d.arm/2,neck[1]+Math.cos(angle)*d.arm/2];return [elbow,[elbow[0]+Math.sin(angle+armAngles[2])*d.arm/2,elbow[1]+Math.cos(angle+armAngles[2])*d.arm/2]];};
    [el,hl]=chain(armAngles[0]);[er,hr]=chain(armAngles[1]);
  }
  const [kl,leftFoot]=limb(hip,fl,d.leg,leftSide),[kr,rightFoot]=limb(hip,fr,d.leg,rightSide);
  const points=[hip,neck,[neck[0]+Math.sin(lean)*d.head,neck[1]-Math.cos(lean)*d.head],el,hl,er,hr,kl,leftFoot,kr,rightFoot];
  if(options.travel&&(walk||run)) {
    const stride=2*d.leg*(run?.36:.28)/(run?.38:.6);
    for(const point of points)point[0]+=stride*phase;
  }
  return points;
}
export function figureAt(id='idle',phase=0,options={}) {
  return characterAt(motionPoints(id,phase,options),options,{mirror:options.mirror});
}
export const createFigureDocument=createCharacterDocument;
export function createMotionDocument(id,{frames=24,fps=24,...style}={}) {
  if(!Number.isInteger(frames)||frames<8||frames>600)throw new RangeError('Un mouvement doit contenir 8 à 600 images.');
  if(!Number.isInteger(fps)||fps<1||fps>120)throw new RangeError('Choisis une cadence entre 1 et 120 images/s.');
  const report=emptyDocument(),first=figureAt(id,0,style);let previous;
  const motion=MOTIONS.find(m=>m.id===id),once=!motion.loop||(style.travel&&['walk','run'].includes(id));
  report.fps=fps;report.figure_types=[first.figure];report._styk.name=motion.name;
  // Bake each displayed frame: no changing bone lengths or interpolated foot drift.
  report.keyframes=Array.from({length:frames+1},(_,tick)=>{
    const {object}=figureAt(id,Math.min(1,tick/(once?frames-1:frames)),style);
    if(previous)object.angles=object.angles.map((angle,i)=>angle+TAU*Math.round((previous[i]-angle)/TAU));
    previous=object.angles;
    return {...createFrame([object],1),_styk:{easing:{interpolation:'linear'}}};
  });return report;
}
export function createMotionAsset(id,options={}) {
  const document=createMotionDocument(id,options),duration=options.frames??24,leg=dimensions(options).leg;
  const figure=movieclipFigure(1,`Trait · ${document._styk.name}`,document,{duration,pivot:{x:0,y:-leg}});
  const loop=MOTIONS.find(m=>m.id===id).loop&&!(options.travel&&['walk','run'].includes(id));
  const result=emptyDocument();result.fps=document.fps;result.figure_types=[figure];result.keyframes=[createFrame([createObject(figure,1,0,0,{_stykMovieclip:{start:0,end:duration,offset:0,speed:1,mode:loop?'loop':'once'}})])];return result;
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
