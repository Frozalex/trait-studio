import test from 'node:test';
import assert from 'node:assert/strict';
import {RhythmEnvelope, analyzeMix} from '../src/trait/audio-analysis.mjs';
import {visibleRhythm, markerNear, addRhythmMarker, adjacentMarker} from '../src/trait/timeline-rhythm.mjs';
import {defaultRhythm} from '../src/trait/rhythm.mjs';
import {Editor} from '../src/editor.mjs';

const rate = 8000;
function drums(bpm, seconds = 16, intro = 3) {
  const pcm = new Float32Array(seconds * rate * 2);
  for (let i = 0; i < pcm.length / 2; i++) {
    const time = i / rate, phase = (time - intro) % (60 / bpm);
    const sample = time < intro ? .08 * Math.sin(2 * Math.PI * 1800 * time) :
      phase < .12 ? .8 * Math.exp(-phase * 40) * Math.sin(2 * Math.PI * 70 * phase) : 0;
    pcm[i * 2] = pcm[i * 2 + 1] = sample;
  }
  return pcm;
}
for (const bpm of [90, 120, 150, 180]) test(`local audio analysis recognises ${bpm} BPM after a treble intro`, () => {
  const e = new RhythmEnvelope(rate); e.push(drums(bpm)); const result = e.finish();
  assert.ok(Math.abs(result.bpm - bpm) < 1, JSON.stringify(result));
  assert.ok(Math.abs(result.bassEntry - 3) <= .04, JSON.stringify(result));
  assert.ok(result.attacks.length >= 10); assert.ok(result.confidence > 60);
});
test('chunk boundaries preserve timing and silent audio does not invent a tempo', () => {
  const pcm = drums(120), whole = new RhythmEnvelope(rate), chunks = new RhythmEnvelope(rate); whole.push(pcm);
  for (let i = 0; i < pcm.length; i += 1318) chunks.push(pcm.subarray(i, i + 1318));
  assert.deepEqual(chunks.finish(), whole.finish());
  const silence = new RhythmEnvelope(rate); silence.push(new Float32Array(rate * 8));
  assert.deepEqual(silence.finish(), {bpm:null,alternatives:[],confidence:0,bassEntry:null,attacks:[],seconds:4});
});
test('analysis yields for cancellation and never asks the mixer for more than one second', async () => {
  let cancelled = false, reads = 0;
  await assert.rejects(analyzeMix(async (start, frames) => {assert.ok(frames <= rate); reads++; cancelled = true; return new Float32Array(frames * 2);}, 90, {sampleRate:rate,isCancelled:()=>cancelled}), {name:'AbortError'});
  assert.equal(reads, 1);
});
test('timeline rhythm stays bounded at extreme zoom and uses imported frame timing', () => {
  const report = {fps:60,frame_delay_ms:40,_styk:{traitRhythm:{...defaultRhythm(),offset:2,markers:[{tick:50,label:'Bass'}]}}};
  const normal = visibleRhythm(report,{first:0,last:100});
  assert.equal(normal.beats[0].tick,50); assert.equal(normal.markers[0].label,'Bass');
  const far = visibleRhythm(report,{first:9000000,last:10000000,pixelsPerTick:.001});
  assert.ok(far.beats.length < 100); assert.ok(far.beats.every(b=>b.tick>=9000000));
  assert.equal(markerNear(report,50).label,'Bass');
  report._styk.traitRhythm.visible=false;
  assert.deepEqual(visibleRhythm(report,{first:0,last:100}),{beats:[],markers:[]});
  assert.equal(markerNear(report,50),null);
});
test('named markers seek in order and retain native undo semantics', () => {
  const editor = new Editor({demo:false}).newDocument();
  addRhythmMarker(editor,30,'Bass'); addRhythmMarker(editor,5,'Intro');
  assert.equal(adjacentMarker(editor,1).tick,5);
  editor.seek(50,{allowBeyondEnd:true}); assert.equal(adjacentMarker(editor,-1).tick,30);
  editor.undo(); assert.equal(editor.report._styk.traitRhythm.markers.length,1);
  editor.redo(); assert.equal(editor.report._styk.traitRhythm.markers.length,2);
});

test('opposite stereo phases still retain bass attacks', () => {
  const pcm=drums(120); for(let i=1;i<pcm.length;i+=2)pcm[i]*=-1;
  const envelope=new RhythmEnvelope(rate);envelope.push(pcm);const result=envelope.finish();
  assert.ok(Math.abs(result.bpm-120)<1);assert.ok(Math.abs(result.bassEntry-3)<.04);
});

test('a track that starts with bass does not invent an intro', () => {
  const envelope=new RhythmEnvelope(rate);envelope.push(drums(120,16,0));
  const result=envelope.finish();assert.ok(result.bassEntry<=.03,JSON.stringify(result));
});
