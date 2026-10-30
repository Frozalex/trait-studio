import {posesPane} from './poses-pane.mjs';
import {createDialog} from '../ui/ui-dialog.mjs';
import {motionsPane} from './motions-pane.mjs';
import {characterPane} from './character-pane.mjs';
import {CHARACTER_DEFAULTS} from './character.mjs';
import {PoseBank,DesktopPoseBank} from './poses.mjs';
import {rhythmPane} from './rhythm-pane.mjs';
import {node,button} from './ui.mjs';

/** Uses the existing document, clipboard and history. No parallel editor state. */
export function installTraitStudio({editor,actions,pause,finishEdit,fail,toast,overlays,audioEngine,testFigure}){
  const bank=window.stykDesktop?.getTraitPoses ? new DesktopPoseBank(window.stykDesktop) : new PoseBank(globalThis.localStorage);let active=null,character={...CHARACTER_DEFAULTS};
  const getCharacter=()=>({...character}),setCharacter=value=>{character={...value};};
  async function ready(){await bank.ready;pause();await finishEdit();if(window.styk?.builder?.active)throw new Error('Termine la création du personnage avant d’ouvrir l’atelier.');}
  function open(startPane='motions'){
    if(active){active.element.focus();return;}
    const body=node('div','trait-workshop'),tabs=node('div','trait-tabs'),content=node('div','trait-content'),status=node('p','trait-message');
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Outils de l’atelier');status.setAttribute('role','status');
    body.append(tabs,content,status);let disposePane=()=>{},pane='motions';
    const dialog=createDialog({id:'trait-workshop',className:'trait-dialog',size:'lg',title:'Atelier Trait',description:'Des poses au mouvement. Chaque image reste à toi.',body,overlays,actions:[{label:'Retour à la scène',value:'close',variant:'primary'}]});active=dialog;
    const say=message=>{status.textContent=message;};
    const safe=fn=>async()=>{try{say('');await ready();await fn();}catch(error){say(error.message);}};
    const show=id=>{disposePane();disposePane=()=>{};pane=id;content.replaceChildren();say('');for(const t of tabs.children){const selected=t.dataset.pane===id;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;}content.id=`trait-pane-${id}`;content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby',`trait-tab-${id}`);body.closest('.ui-dialog-body')?.scrollTo(0,0);
      if(id==='motions')motions();else if(id==='character')characters();else if(id==='poses')poses();else rhythm();};
    for(const [id,label] of [['motions','Mouvements'],['character','Personnage'],['poses','Mes poses'],['rhythm','Rythme']]){
      const b=button(label,()=>show(id),'ghost');b.id=`trait-tab-${id}`;b.dataset.pane=id;b.setAttribute('role','tab');b.setAttribute('aria-controls',`trait-pane-${id}`);tabs.append(b);
    }
    tabs.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const all=[...tabs.children],i=all.findIndex(b=>b.dataset.pane===pane),next=event.key==='Home'?0:event.key==='End'?all.length-1:(i+(event.key==='ArrowRight'?1:all.length-1))%all.length;all[next].click();all[next].focus();});
    function motions(){disposePane=motionsPane(content,{editor,dialog,safe,say,toast,getCharacter,setCharacter});}
    function characters(){characterPane(content,{editor,dialog,safe,say,getCharacter,setCharacter,testFigure:report=>testFigure(report,()=>open('character')),editFigure:()=>actions['edit-in-build-mode']()});}
    function poses(){posesPane(content,{bank,editor,dialog,safe,say});}
    function rhythm(){disposePane=rhythmPane(content,{editor,pause,safe,say,audioEngine});}
    show(startPane);void dialog.showModal().finally(()=>{disposePane();active=null;});
  }
  actions['trait-workshop']=async()=>{try{await ready();open();}catch(error){fail(error);}};
  actions.privacy=()=>{const d=createDialog({title:'Trait Studio · Confidentialité',description:'Les projets, les poses et les fichiers audio sont traités localement. Cette version ne transmet aucune télémétrie et ne se connecte pas aux services du projet amont.',overlays,actions:[{label:'Fermer',value:'close',variant:'primary'}]});void d.showModal();};
  actions.feedback=()=>window.open('https://github.com/Frozalex/trait-studio/issues','_blank','noopener,noreferrer');
  const launch=document.getElementById('trait-workshop-button');launch?.addEventListener('click',()=>actions['trait-workshop']());
  window.trait={openWorkshop:actions['trait-workshop'],bank};
  return {open,dispose(){active?.close();}};
}
