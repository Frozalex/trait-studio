// Exports real videos from the desktop app and decodes each result, on any OS and
// with no private sample files. It answers "does export actually work here", which
// the capability probe in smoke-boot.mjs (what is offered) does not.
//
//   node scripts/smoke-video-export.mjs                 the source tree
//   node scripts/smoke-video-export.mjs --packaged      release/<platform>-unpacked
//
// The app's own export commands run against an editable Trait motion (24 frames) through
// the bundled encoder. Only the native save dialog is replaced, by a fixed path:
// production IPC still receives no caller-selected write path. Each file is then
// decoded by the same ffmpeg; a file that does not decode, or has no frames, fails.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { _electron as electron } from '../tests/support/playwright.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packaged = process.argv.includes('--packaged');
const unpacked = process.platform === 'win32' ? ['win-unpacked', 'Trait Studio.exe']
  : process.platform === 'darwin' ? [process.arch === 'arm64' ? 'mac-arm64' : 'mac', 'Trait Studio.app', 'Contents', 'MacOS', 'Trait Studio']
  : [process.arch === 'arm64' ? 'linux-arm64-unpacked' : 'linux-unpacked', 'trait-studio'];
const executablePath = packaged ? process.env.STYK_PACKAGED_EXECUTABLE || path.join(appRoot, 'release', ...unpacked) : undefined;
const resources = packaged ? path.join(path.dirname(executablePath), 'resources') : path.join(appRoot, 'build');
const ffmpeg = path.join(resources, 'video-encoder', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
if (!existsSync(ffmpeg)) { console.error(`The bundled encoder is missing (${ffmpeg}). Run npm run build:video-encoder.`); process.exit(2); }

const EXPORTS = [['export-mp4', 'mp4'], ['export-video', 'webm'], ['export-avi', 'avi'], ['export-wmv', 'wmv'], ['export-gif', 'gif'], ['export-mp4', 'mp4', true]];
const work = await mkdtemp(path.join(os.tmpdir(), 'styk-video-'));
await writeFile(path.join(work, 'telemetry-state.json'), JSON.stringify({ decided: true, consent: { analytics: false, diagnostics: false, policyVersion: '2026-09-10', updatedAt: Date.now() } }));
const failures = [];
let app;
try {
  app = await electron.launch({ executablePath, args: packaged ? [] : [appRoot], cwd: appRoot, timeout: 60000, env: { ...process.env, STYK_USER_DATA_DIR: work } });
  const page = await app.firstWindow({ timeout: 60000 });
  await page.waitForFunction(() => window.styk?.ready === true, undefined, { timeout: 60000 });
  await page.evaluate(async () => {
    const {insertMotion} = await import('/src/trait/motions.mjs');
    insertMotion(window.styk.editor, 'run', {frames: 24});
  });
  const evidence = [];
  for (const [action, extension, long] of EXPORTS) {
    if (long) await page.evaluate(async () => {
      const {insertMotion} = await import('/src/trait/motions.mjs');
      const {AudioEngine} = await import('/src/audio-engine.mjs');
      const {pcmWave} = await import('/src/audio-pcm.mjs');
      const {setRhythm, defaultRhythm} = await import('/src/trait/rhythm.mjs');
      const editor = window.styk.editor; editor.newDocument(); editor.updateProject({canvas_width:320,canvas_height:240,fps:24});
      insertMotion(editor, 'run', {frames:24}); editor.sheetSetDuration(2160);
      setRhythm(editor, {...defaultRhythm(),offset:3,markers:[{tick:72,label:'Basses'}]});
      const channel = new Float32Array(8000 * 90);
      for (let i=0;i<channel.length;i++) {const t=i/8000,p=(t-3)%0.5;channel[i]=t<3?.08*Math.sin(2*Math.PI*1800*t):p<.12?.5*Math.exp(-p*40)*Math.sin(2*Math.PI*70*p):0;}
      const audio = new AudioEngine();
      try {editor.importAudio(await audio.import(new File([pcmWave([channel],8000)],'ninety-seconds.wav',{type:'audio/wav'})),{start:0});}
      finally {audio.dispose();}
      const saved=editor.serialize();editor.load(saved);
      if(editor.totalTicks!==2160||editor.report._styk.traitRhythm.markers[0].tick!==72)throw new Error('Long project failed to reload.');
    });
    const target = path.join(work, `${long ? 'long-audio' : 'clip'}.${extension}`);
    await app.evaluate(({ dialog }, file) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: file }); }, target);
    const started = Date.now();
    let problem = '';
    try {
      await page.evaluate((id) => window.styk.actions[id](), action);
      const deadline = Date.now() + (long ? 300000 : 120000);
      while (!existsSync(target) && Date.now() < deadline) await delay(100);
      if (!existsSync(target)) throw new Error('no file was written');
      let size = -1;
      for (let stable = 0; stable < 3 && Date.now() < deadline;) { const now = (await stat(target)).size; stable = now === size ? stable + 1 : 0; size = now; await delay(150); }
      const decoded = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-i', target, '-f', 'null', '-'], { encoding: 'utf8' });
      const frames = Number([...decoded.stderr.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1] ?? 0);
      if (decoded.status !== 0) throw new Error(`ffmpeg could not decode it: ${decoded.stderr.trim().split('\n').at(-1)}`);
      if (!(frames >= 5)) throw new Error(`decoded ${frames} frames`);
      if (long) {
        if (frames !== 2160) throw new Error(`90-second export decoded ${frames} frames instead of 2160`);
        const images=spawnSync(ffmpeg,['-hide_banner','-nostdin','-i',target,'-vf','select=eq(n\\,0)+eq(n\\,6)+eq(n\\,1206)','-vsync','0','-an','-f','framemd5','-'],{encoding:'utf8'});
        const hashes=images.stdout.split('\n').filter(line=>/^0,/.test(line)).map(line=>line.split(',').at(-1).trim());
        if(images.status!==0||hashes.length!==3||new Set(hashes).size<2)throw new Error('Long export contains no visible animation');
        if (!/Audio:/.test(decoded.stderr)) throw new Error('90-second export has no audio stream');
        const audio = spawnSync(ffmpeg, ['-hide_banner','-nostdin','-i',target,'-vn','-ac','1','-ar','8000','-f','f32le','-'], {maxBuffer:8*1024*1024});
        if (audio.status !== 0 || audio.stdout.length < 89*8000*4) throw new Error('The soundtrack is incomplete');
        let energy=0;for(let i=0;i<audio.stdout.length;i+=4)energy+=audio.stdout.readFloatLE(i)**2;
        if(energy/audio.stdout.length<.00001)throw new Error('The exported soundtrack is silent');
      }
      evidence.push({format:extension,long:Boolean(long),bytes:size,frames,milliseconds:Date.now()-started,audio:long ? 'decoded non-silent soundtrack' : 'none'});
      console.log(`PASS ${long ? '90s audio ' : ''}${extension.padEnd(4)} ${String(size).padStart(8)} bytes, ${frames} frames, ${Date.now() - started} ms`);
    } catch (error) { problem = error.message; }
    if (problem) { failures.push(`${extension}: ${problem}`); console.log(`FAIL ${extension} — ${problem}`); }
  }
  await writeFile(path.join(appRoot,'artifacts','trait-video-exports.json'),JSON.stringify({platform:process.platform,packaged,checks:evidence,failures},null,2));
} finally {
  // This test owns its temporary scene: discard it when the ordinary close
  // protection asks, otherwise a successful export waits on a native dialog.
  await app?.evaluate(({dialog}) => { dialog.showMessageBox = async () => ({response: 2}); }).catch(() => {});
  await app?.close().catch(() => {});
  await rm(work, { recursive: true, force: true });
}
if (failures.length) { console.error(`\n${failures.length} export(s) failed:\n - ${failures.join('\n - ')}`); process.exitCode = 1; }
else console.log('\nEvery export decoded.');
