import {chromium} from './support/playwright.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.STYK_URL||'http://127.0.0.1:47831';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],checks=[];
page.setDefaultTimeout(30000);
page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);console.log('PASS',name);};
try{
  await page.goto(url);await page.waitForFunction(()=>window.styk?.ready&&window.trait);
  await page.locator('#trait-workshop-button').click();await page.locator('#trait-workshop[open]').waitFor();
  check('Motion workshop opens',await page.getByRole('tab',{name:'Mouvements',exact:true}).getAttribute('aria-selected')==='true');
  await page.screenshot({path:'artifacts/trait-motions.png'});
  await page.locator('#trait-insert-motion').click();await page.locator('#trait-workshop').waitFor({state:'detached'});
  check('Motion is a real editable clip',await page.evaluate(()=>Boolean(styk.editor.figure._styk.movieclip)&&styk.editor.totalTicks===24));
  await page.evaluate(()=>styk.editor.undo());check('Undo removes motion',await page.evaluate(()=>styk.editor.report.figure_types.length===1&&styk.editor.totalTicks===10));
  await page.locator('#trait-workshop-button').click();await page.locator('#trait-insert-figure').click();
  check('Original figure has four IK controls',await page.evaluate(()=>styk.editor.figure.name==='Trait · Élan'&&Object.keys(styk.editor.object._stykIK).length===4));
  await page.locator('#trait-workshop-button').click();await page.getByRole('tab',{name:'Mes poses',exact:true}).click();
  await page.getByLabel('Nom de la pose',{exact:true}).fill('Pose de test');await page.locator('#trait-save-pose').click();
  check('Pose saved from UI',await page.locator('.trait-pose-row strong').textContent()==='Pose de test');
  check('Pose thumbnail contains rendered artwork',await page.locator('.trait-pose-preview').evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)));
  await page.getByRole('button',{name:'Renommer',exact:true}).click();
  await page.getByLabel('Nouveau nom',{exact:true}).fill('Pose de contact');
  await page.getByRole('button',{name:'Enregistrer le nom',exact:true}).click();
  await page.getByLabel('Rechercher une pose',{exact:true}).fill('introuvable');
  check('Pose search filters by name',await page.locator('.trait-pose-card').count()===0);
  await page.getByLabel('Rechercher une pose',{exact:true}).fill('contact');
  await page.screenshot({path:'artifacts/trait-poses.png'});
  await page.getByRole('button',{name:'Appliquer',exact:true}).click();
  check('Pose applied through the editor',await page.locator('.trait-message').textContent()==='Pose « Pose de contact » appliquée.');
  await page.getByRole('tab',{name:'Rythme',exact:true}).click();await page.getByLabel('Tempo (BPM)',{exact:true}).fill('140');
  await page.getByRole('button',{name:'Appliquer la grille',exact:true}).click();
  check('Rhythm metadata saved',await page.evaluate(()=>styk.editor.report._styk.traitRhythm.bpm===140));
  await page.locator('#trait-add-marker').click();check('Marker saved',await page.locator('.trait-markers .trait-pose-row').count()===1);
  await page.locator('.trait-markers').getByRole('button',{name:'Retirer',exact:true}).click();
  check('Marker removal persists',await page.evaluate(()=>styk.editor.report._styk.traitRhythm.markers.length===0));
  await page.evaluate(async()=>{
    const {AudioEngine}=await import('/src/audio-engine.mjs'),{pcmWave}=await import('/src/audio-pcm.mjs');
    const rate=8000,channel=new Float32Array(rate*16);
    for(let i=0;i<channel.length;i++){const t=i/rate,p=(t-3)%0.5;channel[i]=t<3?.08*Math.sin(2*Math.PI*1800*t):p<.12?.8*Math.exp(-p*40)*Math.sin(2*Math.PI*70*p):0;}
    const engine=new AudioEngine();
    try{const asset=await engine.import(new File([pcmWave([channel],rate)],'rhythm-test.wav',{type:'audio/wav'}));styk.editor.importAudio(asset,{start:0});}
    finally{engine.dispose();}
  });
  await page.locator('#trait-analyze-audio').click();
  await page.getByRole('button',{name:'Utiliser la suggestion',exact:true}).waitFor();
  check('Worker analysis finds the generated rhythm',/120.*BPM/.test(await page.locator('.trait-analysis-result').textContent()));
  await page.getByRole('button',{name:'Utiliser la suggestion',exact:true}).click();
  check('Analysis applies bass marker and offset',await page.evaluate(()=>{const r=styk.editor.report._styk.traitRhythm;return Math.abs(r.bpm-120)<1&&Math.abs(r.offset-3)<.04&&r.markers.some(m=>m.label==='Entrée des basses');}));
  await page.screenshot({path:'artifacts/trait-rhythm.png'});
  await page.evaluate(()=>styk.editor.undo());
  check('Analysis application is one undo step',await page.evaluate(()=>styk.editor.report._styk.traitRhythm.bpm===140&&styk.editor.report._styk.traitRhythm.offset===0));
  await page.evaluate(()=>styk.editor.redo());
  const audioChecks=await page.evaluate(async()=>{
    const {AudioEngine}=await import('/src/audio-engine.mjs');const engine=new AudioEngine(),controller=new AbortController();
    const pending=engine.analyzeRhythm(styk.editor.report,{signal:controller.signal});controller.abort();
    let aborted=false;try{await pending;}catch(e){aborted=e.name==='AbortError';}
    await engine.prepare(styk.editor.report);const active=new AbortController();
    const analysis=engine.analyzeRhythm(styk.editor.report,{signal:active.signal});setTimeout(()=>active.abort(),5);
    let activeAborted=false;try{await analysis;}catch(e){activeAborted=e.name==='AbortError';}
    const recovered=await engine.analyzeRhythm(styk.editor.report);
    const track=styk.editor.report._styk.audio.tracks[0];styk.editor.setAudioTrack(track.id,{mute:true});
    let muted=false;try{await engine.analyzeRhythm(styk.editor.report);}catch(e){muted=/active sa piste/.test(e.message);}
    styk.editor.setAudioTrack(track.id,{mute:false});engine.dispose();return {aborted:aborted&&activeAborted&&Math.abs(recovered.bpm-120)<1,muted};
  });
  check('Audio analysis respects cancellation and mute',audioChecks.aborted&&audioChecks.muted);
  await page.getByRole('button',{name:'Retour à la scène',exact:true}).click();
  const saved=await page.evaluate(()=>styk.editor.serialize());await page.evaluate(document=>styk.editor.load(document),saved);
  check('Save/reload retains rhythm',await page.evaluate(()=>Math.abs(styk.editor.report._styk.traitRhythm.bpm-120)<1));
  await page.reload();await page.waitForFunction(()=>window.styk?.ready&&window.trait);
  check('Pose bank survives restart',await page.evaluate(()=>trait.bank.poses.some(p=>p.name==='Pose de contact')));
  await page.setViewportSize({width:900,height:720});await page.locator('#trait-workshop-button').click();
  check('Workshop fits a laptop viewport',await page.evaluate(()=>{const r=document.querySelector('#trait-workshop').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
  await page.screenshot({path:'artifacts/trait-compact.png'});
  await page.setViewportSize({width:390,height:844});
  check('Workshop content fits a phone width',await page.locator('.trait-motion-layout').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&el.scrollWidth<=el.clientWidth+1;}));
  await page.screenshot({path:'artifacts/trait-phone.png'});
  check('No application errors',errors.length===0);
  await writeFile('artifacts/trait-browser-verification.json',JSON.stringify({checks,errors},null,2));
}catch(error){await page.screenshot({path:'artifacts/trait-failure.png'});console.error(errors);throw error;}finally{await browser.close();}
