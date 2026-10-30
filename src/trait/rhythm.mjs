// Rhythm metadata belongs to the document and is restored by its own small history command.
export function validateRhythm(value){
  if(!value||value.version!==1||!Number.isFinite(value.bpm)||value.bpm<20||value.bpm>300||!Number.isFinite(value.offset)||value.offset<0||value.offset>36000||!Number.isInteger(value.beatsPerBar)||value.beatsPerBar<1||value.beatsPerBar>12||!Array.isArray(value.markers)||value.markers.length>256)throw new Error('Réglages de rythme invalides.');
  if(value.visible!==undefined&&typeof value.visible!=='boolean')throw new Error('Visibilité du rythme invalide.');
  for(const m of value.markers)if(!Number.isInteger(m.tick)||m.tick<0||m.tick>10000000||typeof m.label!=='string'||m.label.length>60)throw new Error('Repère invalide.');
  return value;
}
export const defaultRhythm=()=>({version:1,bpm:120,offset:0,beatsPerBar:4,markers:[]});
export function rhythmOf(editor){return editor.report._styk?.traitRhythm??defaultRhythm();}
export function beatGrid({bpm,offset,beatsPerBar},fps,total,{start=0,limit=256}={}){
  if(!Number.isFinite(fps)||fps<1||fps>1000||!Number.isFinite(total))throw new Error('Invalid timing.');
  validateRhythm({version:1,bpm,offset,beatsPerBar,markers:[]});
  const interval=fps*60/bpm,origin=offset*fps,first=Math.max(0,Math.ceil((start-origin)/interval)),result=[];
  for(let i=first;result.length<Math.min(1024,Math.max(0,limit));i++){
    const tick=Math.round(origin+i*interval);if(tick>=total)break;if(tick<start)continue;
    if(result.at(-1)?.tick===tick)continue;
    result.push({tick,index:i,bar:Math.floor(i/beatsPerBar)+1,beat:i%beatsPerBar+1});
  }return result;
}
export function setRhythm(editor,value){
  validateRhythm(value);const before=editor.report._styk.traitRhythm??null,after=structuredClone(value);
  if(JSON.stringify(before)===JSON.stringify(after))return false;
  editor.report._styk.traitRhythm=after;
  editor._record({kind:'trait-rhythm',label:'Edit rhythm guide',before,after,precomputedBytes:JSON.stringify([before,after]).length*2+256});
  editor._emit('edit',{label:'Edit rhythm guide',traitRhythm:true});return true;
}
export function applyTraitHistory(editor,command,direction){
  if(command.kind!=='trait-rhythm')return false;
  if(command[direction])editor.report._styk.traitRhythm=command[direction];else delete editor.report._styk.traitRhythm;
  editor._revision=command[`${direction}Revision`];editor._emit('history',{label:command.label,traitRhythm:true});return true;
}
export function tapTempo(times){
  if(times.length<3)return null;const gaps=times.slice(1).map((t,i)=>t-times[i]).filter(t=>t>=200&&t<=3000).sort((a,b)=>a-b);
  if(gaps.length<2)return null;const mid=Math.floor(gaps.length/2),median=gaps.length%2?gaps[mid]:(gaps[mid-1]+gaps[mid])/2;
  return Math.round(60000/median*10)/10;
}
