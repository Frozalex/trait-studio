import {createDialog} from '../ui/ui-dialog.mjs';
import {buildGeometry,drawGeometry,evaluatedFrame,timeline} from '../pivot/geometry.mjs';
import {MOTIONS,COLORS,createMotionDocument,createFigureDocument,insertMotion} from './motions.mjs';
import {PoseBank,DesktopPoseBank,capturePose,applyPose} from './poses.mjs';
import {rhythmOf,setRhythm,beatGrid,tapTempo} from './rhythm.mjs';

const node=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const button=(text,fn,variant='outline')=>{const b=node('button','ui-button',text);b.type='button';b.dataset.variant=variant;b.addEventListener('click',fn);return b;};
function field(label,value,type='number',attrs={}){const box=node('label','trait-field'),input=node('input','ui-input');input.type=type;input.value=value;Object.assign(input,attrs);box.append(node('span',null,label),input);return {box,input};}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function frameAt(report,tick){const rows=timeline(report);let i=0;while(i+1<rows.length&&rows[i+1].start<=tick)i++;const row=rows[i];return evaluatedFrame(report,i,row.count?(tick-row.start)/row.count:0,tick);}

/** Uses the existing document, clipboard and history. No parallel editor state. */
export function installTraitStudio({editor,actions,pause,finishEdit,fail,toast,overlays}){
  const bank=window.stykDesktop?.getTraitPoses ? new DesktopPoseBank(window.stykDesktop) : new PoseBank(globalThis.localStorage);let active=null;
  async function ready(){await bank.ready;pause();await finishEdit();if(window.styk?.builder?.active)throw new Error('Termine la création du personnage avant d’ouvrir l’atelier.');}
  function open(){
    if(active){active.element.focus();return;}
    const body=node('div','trait-workshop'),tabs=node('div','trait-tabs'),content=node('div','trait-content'),status=node('p','trait-message');
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Outils de l’atelier');status.setAttribute('role','status');
    body.append(tabs,content,status);let disposePane=()=>{},pane='motions';
    const dialog=createDialog({id:'trait-workshop',className:'trait-dialog',size:'lg',title:'Atelier Trait',description:'Des poses au mouvement. Chaque image reste à toi.',body,overlays,actions:[{label:'Retour à la scène',value:'close',variant:'primary'}]});active=dialog;
    const say=message=>{status.textContent=message;};
    const safe=fn=>async()=>{try{say('');await ready();await fn();}catch(error){say(error.message);}};
    const show=id=>{disposePane();disposePane=()=>{};pane=id;content.replaceChildren();say('');for(const t of tabs.children){const selected=t.dataset.pane===id;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;}content.id=`trait-pane-${id}`;content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby',`trait-tab-${id}`);
      if(id==='motions')motions();else if(id==='poses')poses();else rhythm();};
    for(const [id,label] of [['motions','Mouvements'],['poses','Mes poses'],['rhythm','Rythme']]){
      const b=button(label,()=>show(id),'ghost');b.id=`trait-tab-${id}`;b.dataset.pane=id;b.setAttribute('role','tab');b.setAttribute('aria-controls',`trait-pane-${id}`);tabs.append(b);
    }
    tabs.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const all=[...tabs.children],i=all.findIndex(b=>b.dataset.pane===pane),next=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;all[next].click();all[next].focus();});
    function motions(){
      let selected='run',color=COLORS[0],soft=true,mirror=false,frames=24,doc,raf,last=-1;
      const grid=node('div','trait-motion-layout'),left=node('div','trait-motion-list'),right=node('div','trait-motion-detail'),canvas=node('canvas','trait-preview');canvas.width=760;canvas.height=460;canvas.setAttribute('aria-label','Aperçu du mouvement');
      const options=node('div','trait-options'),duration=field('Durée du cycle (images)',frames,'number',{min:'8',max:'600',step:'1'}),swatches=node('div','trait-swatches');
      const rebuild=()=>{try{doc=createMotionDocument(selected,{frames,color,soft,mirror,fps:Math.min(120,editor.report.fps)});last=-1;say('');}catch(e){say(e.message);}};
      for(const motion of MOTIONS){const b=button('',()=>{selected=motion.id;for(const c of left.children)c.setAttribute('aria-pressed',String(c===b));rebuild();});b.classList.add('trait-motion-card');b.setAttribute('aria-pressed',String(motion.id===selected));b.dataset.motion=motion.id;b.append(node('strong',null,motion.name),node('span',null,motion.subtitle));left.append(b);}
      for(const hex of COLORS){const b=button('●',()=>{color=hex;for(const c of swatches.children)c.setAttribute('aria-pressed',String(c===b));rebuild();});b.style.color=hex;b.setAttribute('aria-label',`Couleur ${hex}`);b.setAttribute('aria-pressed',String(hex===color));swatches.append(b);}
      const softLabel=node('label','trait-check'),softInput=node('input');softInput.type='checkbox';softInput.checked=true;softInput.addEventListener('change',()=>{soft=softInput.checked;rebuild();});softLabel.append(softInput,node('span',null,'Membres souples'));
      const mirrorLabel=node('label','trait-check'),mirrorInput=node('input');mirrorInput.type='checkbox';mirrorInput.addEventListener('change',()=>{mirror=mirrorInput.checked;rebuild();});mirrorLabel.append(mirrorInput,node('span',null,'Inverser la direction'));
      duration.input.addEventListener('change',()=>{frames=Number(duration.input.value);rebuild();});
      const insert=button('Insérer le mouvement',safe(()=>{insertMotion(editor,selected,{frames,color,soft,mirror});dialog.close('inserted');toast('Mouvement inséré. Ouvre le clip pour retoucher ses poses.');}),'primary');insert.id='trait-insert-motion';
      const add=button('Ajouter un personnage',safe(()=>{editor.importFigure(createFigureDocument({color,soft,mirror}));for(const joint of [3,5,7,9]){editor.select(editor.selectedUid,joint);editor.setNodeIK({enabled:true,pinned:false,chainLength:2,bendDirection:0});}editor.select(editor.selectedUid);dialog.close('figure');}));add.id='trait-insert-figure';
      options.append(duration.box,swatches,softLabel,mirrorLabel);const foot=node('div','trait-actions');foot.append(add,insert);
      right.append(canvas,options,node('p','trait-hint','Le clip contient huit poses clés. Double-clique dessus dans la scène pour les ajuster.'),foot);grid.append(left,right);content.append(grid);rebuild();
      const ctx=canvas.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,start=performance.now();
      const paint=now=>{if(!dialog.element.open)return;const tick=reduce?0:Math.floor((now-start)/1000*editor.report.fps)%Math.max(8,frames);if(doc&&tick!==last){last=tick;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(canvas.width/2,canvas.height-52);ctx.scale(1.7,1.7);drawGeometry(ctx,buildGeometry(doc,frameAt(doc,tick)));ctx.restore();}if(!reduce)raf=requestAnimationFrame(paint);};
      raf=requestAnimationFrame(paint);disposePane=()=>cancelAnimationFrame(raf);
    }
    function poses(){
      const intro=node('p','trait-hint','Enregistre une pose, puis réapplique-la au même squelette. La position et la couleur du personnage restent les siennes.'),toolbar=node('div','trait-actions'),name=field('Nom de la pose','Ma pose','text',{maxLength:60}),list=node('div','trait-pose-list');
      const refresh=()=>{list.replaceChildren();if(!bank.poses.length)list.append(node('p','trait-empty','Ta bibliothèque attend sa première pose. Sélectionne un personnage dans la scène, puis enregistre sa pose.'));
        for(const pose of bank.poses){const row=node('div','trait-pose-row');row.append(node('strong',null,pose.name),button('Appliquer',safe(()=>{applyPose(editor,pose);say(`Pose « ${pose.name} » appliquée.`);})),button('Insérer',safe(()=>{editor.importFigure(pose.document);dialog.close('pose');})),button('Retirer',async()=>{try{await bank.remove(pose.id);refresh();say('Pose retirée de la bibliothèque locale.');}catch(e){say(e.message);}}));list.append(row);}
      };
      const save=button('Enregistrer la pose',safe(async()=>{await bank.add(capturePose(editor,name.input.value));refresh();say('Pose enregistrée dans ce navigateur ou cette application.');}),'primary');save.id='trait-save-pose';
      const upload=node('input');upload.type='file';upload.accept='.json';upload.hidden=true;upload.addEventListener('change',async()=>{try{const f=upload.files[0];if(!f)return;if(f.size>4*1024*1024)throw new Error('Le fichier dépasse 4 Mo.');await bank.import(await f.text());refresh();say('Bibliothèque importée.');}catch(e){say(e.message);}finally{upload.value='';}});
      toolbar.append(save,button('Exporter les poses',()=>download('trait-poses.json',bank.export())),button('Importer',()=>upload.click()));content.append(intro,name.box,toolbar,list,upload);refresh();if(bank.error)say('La bibliothèque locale n’a pas pu être lue. Exporte une copie avant de la remplacer.');
    }
    function rhythm(){
      let value=structuredClone(rhythmOf(editor)),taps=[],windowStart=0;
      const options=node('div','trait-options'),bpm=field('Tempo (BPM)',value.bpm,'number',{min:'20',max:'300',step:'.1'}),offset=field('Début du rythme (secondes)',value.offset,'number',{min:'0',max:'36000',step:'.001'}),meter=field('Temps par mesure',value.beatsPerBar,'number',{min:'1',max:'12',step:'1'}),grid=node('div','trait-beat-grid'),markers=node('div','trait-markers'),label=field('Nom du repère','Accent','text',{maxLength:60}),counter=node('p','trait-hint');
      const sync=()=>{value={...rhythmOf(editor),bpm:Number(bpm.input.value),offset:Number(offset.input.value),beatsPerBar:Number(meter.input.value)};};
      const refresh=()=>{grid.replaceChildren();const beats=beatGrid(value,editor.report.fps,editor.totalTicks,{start:windowStart,limit:64});counter.textContent=`${editor.report.fps} images/s · ${editor.totalTicks} images · image actuelle ${Math.round(editor.tick)+1}`;
        for(const beat of beats){const b=button(`${beat.bar}.${beat.beat}`,()=>{pause();editor.seek(beat.tick);counter.textContent=`Mesure ${beat.bar}, temps ${beat.beat} · image ${beat.tick+1}`;});b.dataset.downbeat=String(beat.beat===1);b.title=`Image ${beat.tick+1} · ${(beat.tick/editor.report.fps).toFixed(3)} s`;grid.append(b);}
        if(!beats.length)grid.append(node('p','trait-hint','Aucun temps dans cette plage. Allonge la scène ou ajuste le début du rythme.'));
        markers.replaceChildren();for(const marker of value.markers){const row=node('div','trait-pose-row');row.append(button(`${marker.label} · ${marker.tick+1}`,()=>{pause();editor.seek(marker.tick);}),button('Retirer',safe(()=>{setRhythm(editor,{...rhythmOf(editor),markers:rhythmOf(editor).markers.filter(m=>m.tick!==marker.tick)});value=structuredClone(rhythmOf(editor));refresh();})));markers.append(row);}
      };
      options.append(bpm.box,offset.box,meter.box);const actionsRow=node('div','trait-actions');
      actionsRow.append(button('Taper le tempo',()=>{const now=performance.now();if(taps.length&&now-taps.at(-1)>3000)taps=[];taps=[...taps.slice(-7),now];const tempo=tapTempo(taps);if(tempo)bpm.input.value=tempo;say(tempo?`${tempo} BPM · applique la grille pour l’enregistrer.`:'Continue à taper au rythme de la musique.');}),button('Début = image actuelle',()=>{offset.input.value=(editor.tick/editor.report.fps).toFixed(3);}),button('Appliquer la grille',safe(()=>{sync();setRhythm(editor,value);refresh();say('Grille enregistrée avec le projet.');}),'primary'));
      const pagination=node('div','trait-actions');pagination.append(button('Début',()=>{windowStart=0;refresh();}),button('Autour du curseur',()=>{windowStart=Math.floor(editor.tick);refresh();}),button('Suite',()=>{const current=beatGrid(value,editor.report.fps,editor.totalTicks,{start:windowStart,limit:64});if(current.length)windowStart=current.at(-1).tick+1;refresh();}));
      const add=button('Poser un repère',safe(()=>{const current=rhythmOf(editor),tick=Math.round(editor.tick),entry={tick,label:label.input.value.trim().slice(0,60)||'Accent'};setRhythm(editor,{...current,markers:[...current.markers.filter(m=>m.tick!==tick),entry].sort((a,b)=>a.tick-b.tick)});value=structuredClone(rhythmOf(editor));refresh();}));add.id='trait-add-marker';
      content.append(node('p','trait-hint','Importe ta musique avec le bouton Audio de la timeline. Règle le tempo et le début du rythme, puis clique sur un temps pour placer le curseur.'),options,actionsRow,counter,grid,pagination,label.box,add,markers);refresh();
    }
    show('motions');void dialog.showModal().finally(()=>{disposePane();active=null;});
  }
  actions['trait-workshop']=async()=>{try{await ready();open();}catch(error){fail(error);}};
  actions.privacy=()=>{const d=createDialog({title:'Trait Studio · Confidentialité',description:'Les projets, les poses et les fichiers audio sont traités localement. Cette version ne transmet aucune télémétrie et ne se connecte pas aux services du projet amont.',overlays,actions:[{label:'Fermer',value:'close',variant:'primary'}]});void d.showModal();};
  actions.feedback=()=>window.open('https://github.com/Frozalex/trait-studio/issues','_blank','noopener,noreferrer');
  const launch=document.getElementById('trait-workshop-button');launch?.addEventListener('click',()=>actions['trait-workshop']());
  window.trait={openWorkshop:actions['trait-workshop'],bank};
  return {open,dispose(){active?.close();}};
}
