// Parameterized characters compile to ordinary native segments and polygon fills.
import {emptyDocument, createObject, createFrame} from '../demo.mjs';
import {solveIKPoints} from '../ik.mjs';

export const COLORS = ['#53c7b5','#f2ac57','#91a8ff','#ed7ca5','#343c50'];
export const CHARACTER_DEFAULTS = Object.freeze({name:'Élan',size:100,arms:100,legs:100,torso:100,head:100,thickness:6.5,headShape:'outline',bodyShape:'line',color:COLORS[0],accent:'#343c50',soft:true});
export const CHARACTER_PRESETS = Object.freeze([
  {id:'elan',name:'Élan',options:{}},
  {id:'robot',name:'Robot',options:{name:'Robot',headShape:'rectangle',bodyShape:'rectangle',soft:false,thickness:12,color:'#91a8ff',accent:'#343c50'}},
  {id:'triangle',name:'Triangle',options:{name:'Triangle',headShape:'triangle',bodyShape:'triangle',arms:110,legs:110,thickness:7,color:'#f2ac57',accent:'#343c50'}},
]);
export const PARENTS = Object.freeze([0,1,1,3,1,5,0,7,0,9]);
const NAMES = ['Buste','Tête','Bras gauche','Avant-bras gauche','Bras droit','Avant-bras droit','Cuisse gauche','Jambe gauche','Cuisse droite','Jambe droite'];
const LIMITS = {size:[50,180],arms:[65,145],legs:[65,145],torso:[65,145],head:[60,160],thickness:[2,20]};
export function characterOptions(input={}) {
  const out={...CHARACTER_DEFAULTS};
  for(const key of Object.keys(out))if(input[key]!==undefined)out[key]=input[key];
  for(const [key,[min,max]] of Object.entries(LIMITS))if(!Number.isFinite(out[key])||out[key]<min||out[key]>max)throw new Error(`Proportion invalide : ${key}.`);
  for(const key of ['color','accent'])if(typeof out[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(out[key]))throw new Error('Choisis une couleur au format #RRGGBB.');
  if(typeof out.name!=='string'||!out.name.trim()||out.name.length>60)throw new Error('Choisis un nom entre 1 et 60 caractères.');
  if(!['outline','circle','rectangle','triangle'].includes(out.headShape)||!['line','rectangle','triangle'].includes(out.bodyShape)||typeof out.soft!=='boolean')throw new Error('Forme de personnage invalide.');
  out.name=out.name.trim();return out;
}
export function dimensions(input={}) {
  const p=characterOptions(input),scale=p.size/100;
  return {leg:112*p.legs/100*scale,arm:62*p.arms/100*scale,torso:54*p.torso/100*scale,head:38*p.head/100*scale,width:32*scale,thickness:p.thickness*scale};
}
export function limb(base,target,total,side=-1) {
  const points=[{x:base[0],y:base[1]},{x:base[0]+total*.2,y:base[1]+total*.45},{x:target[0],y:target[1]}];
  solveIKPoints(points,[total*.5,total*.5],{x:target[0],y:target[1]},side);
  return points.slice(1).map(p=>[p.x,p.y]);
}
export function standingPoints(input={}) {
  const d=dimensions(input),hip=[0,-d.leg*.94],neck=[0,hip[1]-d.torso];
  const [el,hl]=limb(neck,[-d.arm*.36,neck[1]+d.arm*.88],d.arm,1);
  const [er,hr]=limb(neck,[d.arm*.36,neck[1]+d.arm*.88],d.arm,-1);
  const [kl,fl]=limb(hip,[-d.leg*.22,0],d.leg,1),[kr,fr]=limb(hip,[d.leg*.22,0],d.leg,-1);
  return [hip,neck,[neck[0],neck[1]-d.head],el,hl,er,hr,kl,fl,kr,fr];
}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
export function characterAt(points,input={}, {mirror=false}={}) {
  const p=characterOptions(input),d=dimensions(p),positions=points.map(([x,y])=>[mirror?-x:x,y]);
  const segments=PARENTS.map((parent,i)=>{
    const from=positions[parent],to=positions[i+1],head=i===1,circle=head&&['circle','outline'].includes(p.headShape);
    const bend=p.soft&&!head?(i%2?-.035:.035)*(mirror?-1:1):0;
    // Native length is arc length; the requested joint distance is its chord.
    const chord=Math.hypot(to[0]-from[0],to[1]-from[1]);
    return {segment_id:i+1,parent_id:parent,name:NAMES[i],length:bend?chord*bend/(2*Math.sin(bend/2)):chord,angle_rad:Math.atan2(to[1]-from[1],to[0]-from[0])-bend/2,
      thickness:head?(circle?d.thickness:0):i===0&&p.bodyShape!=='line'?0:d.thickness,
      bend_rad:bend,primitive_code:circle?(p.headShape==='circle'?3:1):0,aux_code:0,flags:circle?(p.headShape==='circle'?3:1):0,
      segment_type:circle?'circle':'line',segment_kind:circle?(p.headShape==='circle'?'circleFill':'circle'):'line',color_rgb:rgb(p.color),transparency:0,visible:true,z_order:i+1};
  });
  const polyfills=[];
  function shape(owner,kind,width,color) {
    const base=positions[PARENTS[owner-1]],tip=positions[owner],length=Math.hypot(tip[0]-base[0],tip[1]-base[1]);
    const u=[(tip[0]-base[0])/length,(tip[1]-base[1])/length],v=[-u[1],u[0]],ids=[];
    const vertices=kind==='rectangle'?[[0,-.5],[1,-.5],[1,.5],[0,.5]]:owner===1?[[0,0],[1,-.5],[1,.5]]:[[0,-.5],[1,0],[0,.5]];
    for(const [along,across] of vertices){
      const x=base[0]+along*length*u[0]+across*width*v[0],y=base[1]+along*length*u[1]+across*width*v[1],id=segments.length+1;
      segments.push({segment_id:id,parent_id:owner,name:`${NAMES[owner-1]} · contour ${ids.length+1}`,length:Math.hypot(x-tip[0],y-tip[1]),angle_rad:Math.atan2(y-tip[1],x-tip[0]),thickness:0,bend_rad:0,primitive_code:0,aux_code:1,flags:256,is_static:true,segment_type:'line',segment_kind:'line',color_rgb:rgb(color),transparency:0,visible:true,z_order:id});ids.push(id);
    }
    polyfills.push({polyfill_id:polyfills.length+1,segment_ids:ids,color_rgb:rgb(color),color_alpha:1,alpha_raw:0,z_order:owner-.1});
  }
  if(['rectangle','triangle'].includes(p.headShape))shape(2,p.headShape,d.head,p.color);
  if(p.bodyShape!=='line')shape(1,p.bodyShape,d.width,p.accent);
  const figure={figure_type_id:1,name:`Trait · ${p.name}`,segment_count:segments.length,segments,polyfills,image_assets:[],text_assets:[],_styk:{traitCharacter:{version:1,options:p}}};
  return {figure,object:createObject(figure,1,...positions[0])};
}
export function createCharacterDocument(input={}) {
  const p=characterOptions(input),{figure,object}=characterAt(standingPoints(p),p,{mirror:input.mirror}),report=emptyDocument();
  report.figure_types=[figure];report.keyframes=[createFrame([object],1)];return report;
}
export function insertCharacter(editor,input={}) {
  return editor.movieclipBatch('Insert Trait character',()=>{
    const object=editor.importFigure(createCharacterDocument(input)),uid=object.unique_id;
    for(const joint of [3,5,7,9]){editor.select(uid,joint);editor.setNodeIK({enabled:true,pinned:false,chainLength:2,bendDirection:0});}
    editor.select(uid);return object;
  });
}
