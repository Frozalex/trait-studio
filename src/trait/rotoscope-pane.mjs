import {node,button,field} from './ui.mjs';
import {TRACE_JOINTS,TRACE_LINKS,tracePlan,traceTemplate,correctTrace,insertTrace} from './rotoscope.mjs';
import {openTraceVideo,seekTraceVideo,TraceTracker} from './rotoscope-client.mjs';

export function rotoscopePane(content,{editor,dialog,safe,say,toast,getCharacter}) {
  let source=null,plan=null,samples=[],index=0,joint=0,operation=null,disposed=false,dragging=false;
  const intro=node('p','trait-hint','Sans IA · Place les 14 articulations sur la personne, puis lance le suivi. Les pixels guident le mouvement ; les passages ambigus demandent une correction. Gauche et droite désignent celles du personnage.');
  const upload=field('Vidéo de référence','','file',{accept:'video/*'}),start=field('Début (secondes)',0,'number',{min:0,step:.01}),end=field('Fin (secondes)',5,'number',{min:0,step:.01});
  const setup=node('div','trait-options'),apply=button('Préparer cet extrait',()=>void run(prepare));setup.append(upload.box,start.box,end.box,apply);
  const canvas=node('canvas','trait-trace-canvas');canvas.width=800;canvas.height=450;canvas.tabIndex=0;canvas.setAttribute('aria-label','Articulation sélectionnée : déplace-la avec les flèches ou sur la vidéo.');
  const empty=node('p','trait-empty','Choisis une vidéo, puis aligne le squelette sur sa première image. Le traitement reste sur ton appareil.');
  const stage=node('div','trait-trace-stage');stage.append(canvas,empty);
  const choose=node('label','trait-field'),select=node('select','ui-input');TRACE_JOINTS.forEach((name,i)=>{const option=node('option',null,name);option.value=i;select.append(option);});choose.append(node('span',null,'Articulation à placer'),select);
  const x=field('Position X (%)',50,'number',{min:0,max:100,step:.1}),y=field('Position Y (%)',18,'number',{min:0,max:100,step:.1}),opacity=field('Vidéo visible (%)',70,'range',{min:0,max:100,step:5});
  const poseControls=node('div','trait-options');poseControls.append(choose,x.box,y.box,opacity.box);
  const scrub=field('Image de la capture',0,'range',{min:0,max:0,step:1}),readout=node('output'),transport=node('div','trait-transport');transport.append(scrub.box,readout);
  const report=node('p','trait-hint');report.setAttribute('role','status');
  const follow=button('Suivre depuis cette pose',()=>void run(track),'primary'),next=button('Tracer l’image suivante',()=>void run(manualNext));
  const confirm=button('Confirmer cette pose',()=>{samples[index]={...samples[index],uncertain:[],manual:TRACE_JOINTS.map((_,i)=>i)};refresh();});
  const cancel=button('Arrêter le suivi',()=>operation?.abort());
  const insert=button('Insérer le clip',safe(()=>{insertTrace(editor,{samples,plan,width:source.width,height:source.height,color:getCharacter().color});dialog.close('traced');toast('Capture insérée. Ouvre le clip pour retoucher ses articulations.');}),'primary');insert.id='trait-insert-trace';
  const actions=node('div','trait-actions');actions.append(follow,next,confirm,cancel,insert);
  content.append(intro,setup,stage,poseControls,transport,report,actions,node('p','trait-hint','Extraits de 30 s / 900 images maximum. Corriger une ancienne pose efface son suivi ultérieur. Insère le clip avant de quitter cet onglet : la vidéo et ce brouillon ne sont pas enregistrés avec le projet.'));
  async function run(fn) {
    if(disposed||operation)return;
    let controller=new AbortController();operation=controller;refresh();say('');
    try{await fn(controller.signal);}catch(error){if(!disposed)say(error.name==='AbortError'?'Suivi arrêté. Les poses déjà obtenues restent disponibles.':error.message);}
    finally{
      // A cancelled seek may have advanced the reference without adding a pose.
      if(!disposed&&plan&&samples[index]&&(source.video.seeking||Math.abs(source.video.currentTime-plan.times[index])>.00001)){
        controller=new AbortController();operation=controller;
        try{await seekTraceVideo(source.video,plan.times[index],controller.signal);}catch(error){if(!disposed&&error.name!=='AbortError')say(error.message);}
      }
      if(operation===controller)operation=null;if(!disposed)refresh();
    }
  }
  function refresh() {
    const busy=!!operation,ready=!!plan&&!!samples.length,sample=samples[index];
    for(const control of [upload.input,start.input,end.input,apply,select,x.input,y.input,opacity.input,scrub.input])control.disabled=busy||(!source&&control!==upload.input);
    for(const control of [select,x.input,y.input,scrub.input])control.disabled=busy||!ready;
    follow.disabled=busy||!ready||index>=plan.count-1||!!sample?.uncertain.length;
    next.disabled=busy||!ready||index>=plan.count-1;confirm.hidden=!sample?.uncertain.length;confirm.disabled=busy;
    insert.disabled=busy||!ready||samples.some(s=>s.uncertain.length>0);cancel.hidden=!busy;
    canvas.setAttribute('aria-disabled',String(busy||!ready));canvas.hidden=!source;empty.hidden=!!source;
    if(ready){scrub.input.max=samples.length-1;scrub.input.value=index;readout.value=`${index+1} / ${samples.length}`;x.input.value=(sample.points[joint][0]*100).toFixed(2);y.input.value=(sample.points[joint][1]*100).toFixed(2);
      report.textContent=sample.uncertain.length?`Suivi incertain : ${sample.uncertain.map(i=>TRACE_JOINTS[i]).join(', ')}. Points conservés à leur dernière position : replace-les ou confirme la pose après vérification.`:`${samples.length} / ${plan.count} images · ${plan.fps} images/s · ${(samples.length/plan.fps).toFixed(2)} s. ${index===0?'Aligne les points sur la personne avant de suivre.':'Vérifie aussi les points non signalés.'}`;
      insert.textContent=`Insérer ${samples.length} image${samples.length>1?'s':''}`;
    }else{report.textContent='';readout.value='';}
    paint();
  }
  function paint() {
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);if(!source)return;
    ctx.globalAlpha=Number(opacity.input.value)/100;ctx.drawImage(source.video,0,0,canvas.width,canvas.height);ctx.globalAlpha=1;
    const sample=samples[index];if(!sample||source.video.seeking||Math.abs(source.video.currentTime-sample.time)>.00001)return;const points=sample.points.map(([a,b])=>[a*canvas.width,b*canvas.height]);
    ctx.strokeStyle='#53c7b5';ctx.lineWidth=Math.max(3,canvas.width*.006);ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();for(const [a,b] of TRACE_LINKS){ctx.moveTo(...points[a]);ctx.lineTo(...points[b]);}
    const hip=[(points[8][0]+points[11][0])/2,(points[8][1]+points[11][1])/2];
    for(const target of [1,8,11]){ctx.moveTo(...hip);ctx.lineTo(...points[target]);}ctx.stroke();
    ctx.beginPath();ctx.arc(...points[0],Math.hypot(points[0][0]-points[1][0],points[0][1]-points[1][1]),0,Math.PI*2);ctx.stroke();
    points.forEach((p,i)=>{ctx.beginPath();ctx.arc(...p,i===joint?9:6,0,Math.PI*2);ctx.fillStyle=sample.uncertain.includes(i)?'#f2ac57':i===joint?'#ffffff':'#53c7b5';ctx.fill();ctx.strokeStyle='#343c50';ctx.lineWidth=2;ctx.stroke();});
  }
  async function prepare(signal) {
    if(!source)return;
    const nextPlan=tracePlan({start:Number(start.input.value),end:Number(end.input.value),duration:source.duration,fps:editor.report.fps});
    await seekTraceVideo(source.video,nextPlan.start,signal);
    plan=nextPlan;samples=[{time:plan.start,points:traceTemplate(),uncertain:[],manual:[]}];index=0;
  }
  upload.input.addEventListener('change',()=>void run(async signal=>{
    const file=upload.input.files?.[0];if(!file)return;
    const loaded=await openTraceVideo(file,signal);if(signal.aborted||disposed){loaded.dispose();return;}
    source?.dispose();source=loaded;plan=null;samples=[];index=0;
    const scale=Math.min(1,960/Math.max(source.width,source.height));canvas.width=Math.round(source.width*scale);canvas.height=Math.round(source.height*scale);
    start.input.value=0;end.input.value=Math.min(source.duration,5);start.input.max=end.input.max=source.duration;
    await prepare(signal);
  }));
  async function track(signal) {
    const tracker=new TraceTracker(signal);samples=samples.slice(0,index+1);
    try{
      await seekTraceVideo(source.video,plan.times[index],signal);await tracker.frame(source.video,samples[index].points);
      for(let i=index+1;i<plan.count;i++){
        await seekTraceVideo(source.video,plan.times[i],signal);const result=await tracker.frame(source.video,samples.at(-1).points);
        if(signal.aborted)return;samples.push({...result,time:plan.times[i],manual:[]});index=i;refresh();
        if(result.uncertain.length)break;
      }
    }finally{tracker.dispose();}
  }
  async function manualNext(signal) {
    const i=index+1;await seekTraceVideo(source.video,plan.times[i],signal);
    samples=samples.slice(0,i);samples.push({time:plan.times[i],points:samples.at(-1).points.map(p=>[...p]),uncertain:TRACE_JOINTS.map((_,j)=>j),manual:[]});index=i;
  }
  scrub.input.addEventListener('input',()=>{const value=Number(scrub.input.value);void run(async signal=>{await seekTraceVideo(source.video,plan.times[value],signal);index=value;});});
  select.addEventListener('change',()=>{joint=Number(select.value);refresh();});opacity.input.addEventListener('input',paint);
  function move(point) {if(operation||!samples[index])return;try{samples=correctTrace(samples,index,joint,point);refresh();}catch(error){say(error.message);refresh();}}
  for(const input of [x.input,y.input])input.addEventListener('change',()=>move([Number(x.input.value)/100,Number(y.input.value)/100]));
  function pointer(event) {const box=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),Math.max(0,Math.min(1,(event.clientY-box.top)/box.height))];}
  canvas.addEventListener('pointerdown',event=>{
    if(operation||!samples[index])return;event.preventDefault();canvas.focus();const p=pointer(event),box=canvas.getBoundingClientRect();
    const hit=samples[index].points.map((v,i)=>({i,d:Math.hypot((v[0]-p[0])*box.width,(v[1]-p[1])*box.height)})).sort((a,b)=>a.d-b.d)[0];
    if(hit.d<18){joint=hit.i;select.value=joint;refresh();}else move(p);
    dragging=true;canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{if(dragging)move(pointer(event));});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{dragging=false;});
  canvas.addEventListener('keydown',event=>{
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!delta||operation||!samples[index])return;event.preventDefault();const p=samples[index].points[joint],step=event.shiftKey?10:1;
    move([Math.max(0,Math.min(1,p[0]+delta[0]*step/source.width)),Math.max(0,Math.min(1,p[1]+delta[1]*step/source.height))]);
  });
  refresh();return ()=>{disposed=true;operation?.abort();source?.dispose();};
}
