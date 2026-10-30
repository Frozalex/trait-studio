import {CHARACTER_PRESETS,characterOptions,createCharacterDocument,insertCharacter} from './character.mjs';
import {paintPreview} from './preview.mjs';
import {node,button,field} from './ui.mjs';

export function characterPane(content,{editor,dialog,safe,say,getCharacter,setCharacter,testFigure,editFigure}) {
  let options=getCharacter();
  const layout=node('div','trait-character-layout'),preview=node('div','trait-character-preview'),controls=node('div','trait-character-controls'),presets=node('div','trait-actions');
  const canvas=node('canvas','trait-preview');canvas.width=760;canvas.height=600;canvas.setAttribute('aria-label','Aperçu du personnage et de ses articulations');
  const paint=()=>paintPreview(canvas,createCharacterDocument(options),{joints:true});
  function update(key,value){try{options=characterOptions({...options,[key]:value});setCharacter(options);paint();say('');}catch(error){say(error.message);}}
  function reset(value){options=characterOptions(value);setCharacter(options);renderControls();paint();}
  for(const preset of CHARACTER_PRESETS)presets.append(button(preset.name,()=>reset(preset.options)));
  const reuse=button('Reprendre le modèle sélectionné',()=>{try{reset(editor.figure._styk.traitCharacter.options);say('Proportions initiales reprises. Les retouches manuelles restent dans la scène.');}catch(error){say(error.message);}});
  reuse.disabled=!editor.figure?._styk?.traitCharacter;presets.append(reuse);
  function renderControls() {
    controls.replaceChildren();
    const name=field('Nom du personnage',options.name,'text',{maxLength:60});name.input.addEventListener('change',()=>update('name',name.input.value));controls.append(name.box);
    for(const [key,label,choices] of [['headShape','Forme de la tête',[['outline','Cercle vide'],['circle','Disque'],['rectangle','Rectangle'],['triangle','Triangle']]],['bodyShape','Forme du buste',[['line','Segment'],['rectangle','Rectangle'],['triangle','Triangle']]]]) {
      const box=node('label','trait-field'),select=node('select','ui-input');select.setAttribute('aria-label',label);
      for(const [value,text] of choices){const option=node('option',null,text);option.value=value;select.append(option);}select.value=options[key];
      select.addEventListener('change',()=>update(key,select.value));box.append(node('span',null,label),select);controls.append(box);
    }
    for(const [key,label,min,max,step] of [['size','Taille',50,180,1],['arms','Bras',65,145,1],['legs','Jambes',65,145,1],['torso','Buste',65,145,1],['head','Tête',60,160,1],['thickness','Épaisseur',2,20,.5]]) {
      const f=field(label,options[key],'range',{min,max,step}),output=node('output');f.input.setAttribute('aria-label',label);output.value=`${options[key]}${key==='thickness'?' px':' %'}`;
      f.input.addEventListener('input',()=>{update(key,Number(f.input.value));output.value=`${options[key]}${key==='thickness'?' px':' %'}`;});f.box.append(output);controls.append(f.box);
    }
    for(const [key,label] of [['color','Couleur des membres'],['accent','Couleur du buste']]) {
      const f=field(label,options[key],'color');f.input.addEventListener('input',()=>update(key,f.input.value));controls.append(f.box);
    }
    const soft=field('Membres souples','','checkbox');soft.input.checked=options.soft;soft.input.addEventListener('change',()=>update('soft',soft.input.checked));controls.append(soft.box);
  }
  const actions=node('div','trait-actions');
  const insert=button('Insérer le personnage',safe(()=>{insertCharacter(editor,options);dialog.close('character');}),'primary');insert.id='trait-insert-character';
  const test=button('Tester les articulations',safe(()=>{const report=createCharacterDocument(options);dialog.close('test');testFigure(report);}));test.id='trait-test-character';
  actions.append(test,insert,button('Insérer et retoucher les formes',safe(()=>{insertCharacter(editor,options);dialog.close('edit');editFigure();})));
  preview.append(canvas,node('p','trait-hint','Les points sont les articulations. Teste-les sans modifier ta scène, puis retouche chaque forme dans le mode Construction.'),actions);
  layout.append(preview,controls);content.append(presets,layout,node('p','trait-hint','Ces proportions servent aussi aux six mouvements de l’atelier. Les modèles insérés restent entièrement éditables.'));
  renderControls();paint();
}
