import {translateIKTargets} from '../ik.mjs';
import {nativeFigureDocument} from '../native-figure.mjs';
import {isMovieclip} from '../movieclips.mjs';
import {layerLocked} from '../layers.mjs';

export const POSE_LIMIT=48;
const KEY='trait-studio.poses.v1';
const signature=figure=>figure.segments.map(s=>`${s.segment_id}:${s.parent_id}:${s.segment_kind}`).join('|');
export function capturePose(editor,name){
  if(editor.selectedUids.size!==1||!editor.object||isMovieclip(editor.figure))throw new Error('Sélectionne un seul personnage articulé. Entre dans le clip pour poser son personnage.');
  if(editor.figure.segments.length>256)throw new Error('La pose doit contenir au maximum 256 segments.');
  const doc=nativeFigureDocument(editor.report,{figureUid:editor.selectedUid,tick:editor.tick,sourceFrame:editor.selectionFrame});
  return {id:crypto.randomUUID(),name:String(name).trim().slice(0,60)||'Pose',signature:signature(editor.figure),document:structuredClone(doc)};
}
export function validatePose(pose){
  if(!pose||typeof pose.id!=='string'||pose.id.length>80||typeof pose.name!=='string'||pose.name.length>60)throw new Error('Invalid pose metadata.');
  const fig=pose.document?.figure_types?.[0],obj=pose.document?.keyframes?.[0]?.objects?.[0];
  if(!fig||!obj||isMovieclip(fig)||!Array.isArray(fig.segments)||!fig.segments.length||fig.segments.length>256||signature(fig)!==pose.signature)throw new Error('Invalid pose topology.');
  for(const values of [obj.angles,obj.lengths,obj.bends])if(!Array.isArray(values)||values.length>256||values.some(v=>!Number.isFinite(v)))throw new Error('Invalid pose values.');
  if(obj.angles.length!==fig.segments.length||obj.len_flag&&obj.lengths.length!==fig.segments.length||obj.bend_flag&&obj.bends.length!==fig.segments.length)throw new Error('Incomplete pose.');
  if(!Number.isFinite(obj.root_x)||!Number.isFinite(obj.root_y))throw new Error('Invalid pose position.');
  return pose;
}
export function applyPose(editor,pose){
  validatePose(pose);
  if(editor.selectedUids.size!==1||!editor.object||signature(editor.figure)!==pose.signature)throw new Error('Choisis un personnage avec la même structure que cette pose.');
  const uid=editor.selectedUid;if(layerLocked(editor.report,uid))throw new Error('Déverrouille le calque avant d’appliquer la pose.');
  const source=pose.document.keyframes[0].objects[0];
  return editor.transaction('Apply saved Trait pose',frame=>{
    const target=frame.objects.find(o=>o.unique_id===uid);if(!target)throw new Error('Le personnage n’est pas présent à cette image.');
    for(const key of ['angles','lengths','len_flag','bends','bend_flag'])target[key]=structuredClone(source[key]);
    if(source._stykIK){target._stykIK=structuredClone(source._stykIK);translateIKTargets(target,target.root_x-source.root_x,target.root_y-source.root_y);}
    else delete target._stykIK;
  });
}
export class PoseBank{
  constructor(storage){this.storage=storage;this.poses=[];this.error=null;
    try{const raw=storage?.getItem(KEY);if(raw){this.raw=raw;this.poses=this.parse(raw);}}catch(e){this.error=e;}
  }
  parse(raw){
    if(typeof raw!=='string'||raw.length>4*1024*1024)throw new Error('La bibliothèque dépasse 4 Mo.');
    const value=JSON.parse(raw);if(value.version!==1||!Array.isArray(value.poses)||value.poses.length>POSE_LIMIT)throw new Error('Invalid pose library.');
    const ids=new Set();for(const p of value.poses){validatePose(p);if(ids.has(p.id))throw new Error('Duplicate pose ID.');ids.add(p.id);}
    return value.poses;
  }
  save(next){const raw=JSON.stringify({version:1,poses:next});this.parse(raw);this.storage?.setItem(KEY,raw);this.poses=next;this.error=null;}
  add(pose){if(this.error)throw new Error('Exporte ou importe la bibliothèque avant d’ajouter une pose.');if(this.poses.length>=POSE_LIMIT)throw new Error('La bibliothèque contient déjà 48 poses.');return this.save([...this.poses,validatePose(pose)]);}
  rename(id,name){const title=String(name).trim();if(!title||title.length>60)throw new Error('Choisis un nom entre 1 et 60 caractères.');if(!this.poses.some(p=>p.id===id))throw new Error('Pose introuvable.');return this.save(this.poses.map(p=>p.id===id?{...p,name:title}:p));}
  remove(id){return this.save(this.poses.filter(p=>p.id!==id));}
  export(){if(this.error)return this.raw;return JSON.stringify({version:1,poses:this.poses},null,2);}
  import(raw){const poses=this.parse(raw),ids=new Set(this.poses.map(p=>p.id));return this.save([...this.poses,...poses.filter(p=>!ids.has(p.id))]);}
}

/** Desktop hosts change loopback origin on restart, so poses belong in the native profile. */
export class DesktopPoseBank extends PoseBank {
  constructor(desktop) {
    super(null); this.desktop = desktop;
    this.ready = desktop.getTraitPoses().then(value => {
      if (!Object.keys(value).length) return;
      this.raw = JSON.stringify(value); this.poses = this.parse(this.raw);
    }).catch(error => { this.error = error; });
  }
  enqueue(operation) {
    const pending = (this.pending || this.ready).then(operation);
    this.pending = pending.catch(() => {});
    return pending;
  }
  add(pose) { return this.enqueue(() => super.add(pose)); }
  rename(id, name) { return this.enqueue(() => super.rename(id, name)); }
  remove(id) { return this.enqueue(() => super.remove(id)); }
  import(raw) { return this.enqueue(() => super.import(raw)); }
  async save(next) {
    const raw = JSON.stringify({version: 1, poses: next}); this.parse(raw);
    await this.desktop.setTraitPoses(JSON.parse(raw));
    this.poses = next; this.raw = raw; this.error = null;
  }
}
