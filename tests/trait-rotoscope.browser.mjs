// End-to-end local video decoding + real tracking worker; no model/service mocks.
import {chromium} from './support/playwright.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts',{recursive:true});
const port=Number(process.env.STYK_TEST_PORT||47839),url=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/serve.mjs','--port',String(port)],{stdio:['ignore','pipe','pipe']});
let diagnostic='';for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{diagnostic=(diagnostic+data).slice(-4000);});
let browser;
try{
  let ready=false;for(let i=0;i<100;i++){try{ready=(await fetch(url)).ok;}catch{}if(ready)break;if(server.exitCode!==null)throw new Error(diagnostic);await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,diagnostic);
  const width=320,height=240,frames=12,raw=Buffer.alloc(width*height*3*frames);
  for(let f=0;f<frames;f++)for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const px=x-f,py=y,at=((f*height+y)*width+x)*3,v=128+45*Math.sin(px*.31)*Math.cos(py*.27)+35*Math.sin(px*.17+py*.21);
    raw[at]=raw[at+1]=raw[at+2]=v;
  }
  const fixture='artifacts/trace-motion.webm';
  execFileSync('ffmpeg',['-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size',`${width}x${height}`,'-framerate','24','-i','pipe:0','-c:v','libvpx-vp9','-crf','10','-b:v','0',fixture],{input:raw});
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(url))external.push(r.url());});
  await page.goto(url);await page.waitForFunction(()=>window.styk?.ready&&window.trait);
  const before=await page.evaluate(()=>styk.editor.serialize());
  const open=async()=>{await page.locator('#trait-workshop-button').click();await page.getByRole('tab',{name:'Vidéo → stickman',exact:true}).click();};
  const follow=page.getByRole('button',{name:'Suivre depuis cette pose',exact:true}),insert=page.locator('#trait-insert-trace'),frame=page.getByLabel('Image de la capture',{exact:true});
  await open();await page.getByLabel('Vidéo de référence',{exact:true}).setInputFiles(fixture);
  await follow.waitFor();await page.waitForFunction(()=>!document.querySelector('#trait-pane-trace input[type="range"]').disabled);
  assert.equal(await insert.isEnabled(),true);
  await follow.click();await page.getByRole('button',{name:'Arrêter le suivi',exact:true}).waitFor({state:'hidden'});
  assert.equal(await frame.getAttribute('max'),'11');assert.equal(await insert.isEnabled(),true);
  await page.screenshot({path:'artifacts/trait-rotoscope.png'});
  // Correct an earlier joint via the keyboard; all dependent samples are removed.
  await frame.fill('4');await page.waitForFunction(()=>document.querySelector('#trait-pane-trace output').value==='5 / 12');
  const x=page.getByLabel('Position X (%)',{exact:true}),oldX=Number(await x.inputValue());
  await page.locator('.trait-trace-canvas').focus();await page.keyboard.press('ArrowRight');
  assert.ok(Number(await x.inputValue())>oldX);assert.equal(await frame.getAttribute('max'),'4');
  await follow.click();await page.getByRole('button',{name:'Arrêter le suivi',exact:true}).waitFor({state:'hidden'});
  assert.equal(await frame.getAttribute('max'),'11');
  await page.setViewportSize({width:390,height:844});
  const overflow=await page.locator('.trait-content').evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(overflow,false);
  await page.screenshot({path:'artifacts/trait-rotoscope-mobile.png'});
  await insert.click();
  const inserted=await page.evaluate(()=>{const clip=styk.editor.figure._styk.movieclip;return {duration:clip.duration,trace:clip.document._styk.traitTrace,first:clip.document.keyframes[0].objects[0],last:clip.document.keyframes[11].objects[0]};});
  assert.equal(inserted.duration,12);assert.equal(inserted.trace.samples.length,12);assert.ok(inserted.last.root_x>inserted.first.root_x+20);
  await page.evaluate(()=>styk.editor.undo());assert.deepEqual(await page.evaluate(()=>styk.editor.serialize()),before);await page.evaluate(()=>styk.editor.redo());
  const saved=await page.evaluate(()=>styk.editor.serialize());await page.evaluate(value=>styk.editor.load(value),saved);assert.deepEqual(await page.evaluate(()=>styk.editor.serialize()),saved);
  // Cancel an active capture, then recover without modifying the document.
  await page.setViewportSize({width:1440,height:1000});await open();await page.getByLabel('Vidéo de référence',{exact:true}).setInputFiles(fixture);await follow.waitFor();
  await page.waitForFunction(()=>!document.querySelector('#trait-insert-trace').disabled);
  await follow.click();await page.getByRole('button',{name:'Arrêter le suivi',exact:true}).click();
  await page.getByRole('button',{name:'Arrêter le suivi',exact:true}).waitFor({state:'hidden'});assert.deepEqual(await page.evaluate(()=>styk.editor.serialize()),saved);
  await page.getByRole('button',{name:'Préparer cet extrait',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#trait-insert-trace').disabled);
  await page.getByRole('button',{name:'Tracer l’image suivante',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#trait-pane-trace output').value==='2 / 2');
  assert.equal(await insert.isEnabled(),false);await page.getByRole('button',{name:'Confirmer cette pose',exact:true}).click();assert.equal(await insert.isEnabled(),true);
  await page.getByRole('tab',{name:'Personnage',exact:true}).click();
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS: real WebM/worker tracking, corrections, review, cancellation, insertion, undo, save/reload, mobile layout and local-only processing.');
}finally{await browser?.close();server.kill();}
