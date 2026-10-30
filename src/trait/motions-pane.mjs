import {MOTIONS,createMotionDocument,insertMotion} from './motions.mjs';
import {COLORS,insertCharacter} from './character.mjs';
import {previewBounds,paintPreview} from './preview.mjs';
import {node,button,field} from './ui.mjs';

export function motionsPane(content,{editor,dialog,safe,say,toast,getCharacter,setCharacter}) {
  let selected='run',character=getCharacter(),mirror=false,travel=false,frames=24,doc,bounds,raf,last=-1,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,position=0,start=performance.now();
  const grid=node('div','trait-motion-layout'),left=node('div','trait-motion-list'),right=node('div','trait-motion-detail'),canvas=node('canvas','trait-preview');canvas.width=760;canvas.height=460;canvas.setAttribute('aria-label','Aperçu du mouvement');
  const options=node('div','trait-options'),duration=field('Durée du cycle (images)',frames,'number',{min:8,max:600,step:1}),swatches=node('div','trait-swatches');
  const transport=node('div','trait-transport'),scrub=field('Image du mouvement',0,'range',{min:0,max:frames-1,step:1}),readout=node('output'),hint=node('p','trait-hint');
  const play=button(playing?'Pause':'Lire',()=>{playing=!playing;if(position>=frames-1)position=0;start=performance.now()-position/doc.fps*1000;play.textContent=playing?'Pause':'Lire';});
  const settings=()=>({...character,frames,mirror,travel,fps:Math.min(120,editor.report.fps)});
  const rebuild=()=>{try{doc=createMotionDocument(selected,settings());bounds=previewBounds(doc);position=0;start=performance.now();last=-1;scrub.input.max=frames-1;say('');travelInput.disabled=!['walk','run'].includes(selected);hint.textContent=`${character.name} · ${frames} images éditables. ${travel&&!travelInput.disabled?'Déplacement en un passage.':'Ouvre le clip pour retoucher ses poses.'}`;}catch(e){doc=null;say(e.message);}};
  for(const motion of MOTIONS){const b=button('',()=>{selected=motion.id;for(const c of left.children)c.setAttribute('aria-pressed',String(c===b));rebuild();});b.classList.add('trait-motion-card');b.setAttribute('aria-pressed',String(motion.id===selected));b.dataset.motion=motion.id;b.append(node('strong',null,motion.name),node('span',null,motion.subtitle));left.append(b);}
  for(const hex of COLORS){const b=button('●',()=>{character={...character,color:hex};setCharacter(character);for(const c of swatches.children)c.setAttribute('aria-pressed',String(c===b));rebuild();});b.style.color=hex;b.setAttribute('aria-label',`Couleur ${hex}`);b.setAttribute('aria-pressed',String(hex===character.color));swatches.append(b);}
  function checkbox(label,value,onChange) {const box=node('label','trait-check'),input=node('input');input.type='checkbox';input.checked=value;input.addEventListener('change',()=>onChange(input.checked));box.append(input,node('span',null,label));options.append(box);return input;}
  options.append(duration.box,swatches);
  checkbox('Membres souples',character.soft,value=>{character={...character,soft:value};setCharacter(character);rebuild();});
  checkbox('Inverser la direction',mirror,value=>{mirror=value;rebuild();});
  const travelInput=checkbox('Avancer dans la scène',travel,value=>{travel=value;rebuild();});
  duration.input.addEventListener('change',()=>{frames=Number(duration.input.value);rebuild();});
  scrub.input.addEventListener('input',()=>{position=Number(scrub.input.value);playing=false;play.textContent='Lire';});
  const insert=button('Insérer le mouvement',safe(()=>{insertMotion(editor,selected,settings());dialog.close('inserted');toast('Mouvement inséré. Ouvre le clip pour retoucher ses poses.');}),'primary');insert.id='trait-insert-motion';
  const add=button('Ajouter un personnage',safe(()=>{insertCharacter(editor,{...character,mirror});dialog.close('figure');}));add.id='trait-insert-figure';
  const foot=node('div','trait-actions');foot.append(add,insert);transport.append(play,scrub.box,readout);
  right.append(canvas,transport,options,hint,foot);grid.append(left,right);content.append(grid);rebuild();
  const paint=now=>{
    if(!dialog.element.open)return;
    if(doc){
      if(playing){position=Math.floor((now-start)/1000*doc.fps);const loop=MOTIONS.find(m=>m.id===selected).loop&&!(travel&&!travelInput.disabled);if(loop&&position>=frames){position%=frames;start=now-position/doc.fps*1000;}else if(!loop&&position>=frames-1){position=frames-1;playing=false;play.textContent='Lire';}}
      if(position!==last){last=position;scrub.input.value=position;readout.value=`${position+1} / ${frames}`;paintPreview(canvas,doc,{tick:position,bounds});}
    }
    raf=requestAnimationFrame(paint);
  };
  raf=requestAnimationFrame(paint);return ()=>cancelAnimationFrame(raf);
}
