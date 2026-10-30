import {posesPane} from './poses-pane.mjs';
import {createDialog} from '../ui/ui-dialog.mjs';
import {buildGeometry,drawGeometry,evaluatedFrame,timeline} from '../pivot/geometry.mjs';
import {MOTIONS,COLORS,createMotionDocument,createFigureDocument,insertMotion} from './motions.mjs';
import {PoseBank,DesktopPoseBank} from './poses.mjs';
import {rhythmPane} from './rhythm-pane.mjs';
import {node,button,field} from './ui.mjs';

function frameAt(report,tick){const rows=timeline(report);let i=0;while(i+1<rows.length&&rows[i+1].start<=tick)i++;const row=rows[i];return evaluatedFrame(report,i,row.count?(tick-row.start)/row.count:0,tick);}

/** Uses the existing document, clipboard and history. No parallel editor state. */
export function installTraitStudio({editor,actions,pause,finishEdit,fail,toast,overlays,audioEngine}){
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
    const show=id=>{disposePane();disposePane=()=>{};pane=id;content.replaceChildren();say('');for(const t of tabs.children){const selected=t.dataset.pane===id;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;}content.id=`trait-pane-${id}`;content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby',`trait-tab-${id}`);body.closest('.ui-dialog-body')?.scrollTo(0,0);
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
    function poses(){posesPane(content,{bank,editor,dialog,safe,say});}
    function rhythm(){disposePane=rhythmPane(content,{editor,pause,safe,say,audioEngine});}
    show('motions');void dialog.showModal().finally(()=>{disposePane();active=null;});
  }
  actions['trait-workshop']=async()=>{try{await ready();open();}catch(error){fail(error);}};
  actions.privacy=()=>{const d=createDialog({title:'Trait Studio · Confidentialité',description:'Les projets, les poses et les fichiers audio sont traités localement. Cette version ne transmet aucune télémétrie et ne se connecte pas aux services du projet amont.',overlays,actions:[{label:'Fermer',value:'close',variant:'primary'}]});void d.showModal();};
  actions.feedback=()=>window.open('https://github.com/Frozalex/trait-studio/issues','_blank','noopener,noreferrer');
  const launch=document.getElementById('trait-workshop-button');launch?.addEventListener('click',()=>actions['trait-workshop']());
  window.trait={openWorkshop:actions['trait-workshop'],bank};
  return {open,dispose(){active?.close();}};
}
