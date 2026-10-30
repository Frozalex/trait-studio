import test from 'node:test';
import assert from 'node:assert/strict';
import {Editor} from '../src/editor.mjs';
import {timeline,buildGeometry,evaluatedFrame} from '../src/pivot/geometry.mjs';
import {MOTIONS,createMotionDocument,createFigureDocument,insertMotion} from '../src/trait/motions.mjs';
import {capturePose,applyPose,PoseBank} from '../src/trait/poses.mjs';
import {beatGrid,defaultRhythm,setRhythm,rhythmOf,tapTempo} from '../src/trait/rhythm.mjs';
const editor=()=>new Editor({demo:false,propertyChannels:true,layerTimeline:true}).newDocument();

test('all six original motions produce finite editable artwork and exact cycle lengths',()=>{
  for(const motion of MOTIONS)for(const frames of [8,23,60,600]){
    const report=createMotionDocument(motion.id,{frames,mirror:true}),rows=timeline(report);
    assert.equal(rows.at(-1).start,frames);assert.equal(report.keyframes.length,9);
    const e=new Editor({demo:false});e.load(report);e.serialize();
    for(const [i,row] of rows.entries()){
      const geometry=buildGeometry(report,evaluatedFrame(report,i,0,row.start));
      assert.ok(geometry.drawables.length>=10);
      for(const o of report.keyframes[i].objects)assert.ok([...o.angles,...o.lengths,...o.bends,o.root_x,o.root_y].every(Number.isFinite));
    }
  }
});
test('motion insertion extends the layer, retains the existing figure, and undoes atomically',()=>{
  const e=editor(),before=e.serialize(),history=e._undo.length;
  const object=insertMotion(e,'run',{frames:48});assert.equal(e.totalTicks,48);assert.equal(e._undo.length,history+1);
  assert.ok(e.selectionFrame.objects.some(o=>o.unique_id===1));
  assert.equal(e.figure._styk.movieclip.duration,48);const uid=object.unique_id;
  e.undo();assert.deepEqual(e.serialize(),before);e.redo();assert.equal(e.totalTicks,48);assert.equal(e.selectedUid,uid);e.serialize();
});
test('pose application preserves location and colour, rejects topology mismatch, and supports undo',()=>{
  const e=editor();e.importFigure(createFigureDocument());const uid=e.selectedUid;
  const pose=capturePose(e,'Contact');e.transaction('Change pose',frame=>{const o=frame.objects.find(o=>o.unique_id===uid);o.root_x+=100;o.angles[2]+=.6;});
  const before=e.serialize(),x=e.object.root_x;applyPose(e,pose);assert.equal(e.object.root_x,x);assert.equal(e.object.angles[2],pose.document.keyframes[0].objects[0].angles[2]);
  e.undo();assert.deepEqual(e.serialize(),before);e.select(1);assert.throws(()=>applyPose(e,pose),/structure/);
});
test('pose library round-trips; failed writes and invalid imports preserve the previous bank',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const e=editor(),bank=new PoseBank(storage);bank.add(capturePose(e,'Salutation'));
  const exported=bank.export(),restored=new PoseBank(storage);assert.equal(restored.poses[0].name,'Salutation');restored.import(exported);assert.equal(restored.poses.length,1);
  assert.throws(()=>restored.import('{broken'));assert.equal(restored.export(),exported);
  storage.setItem=()=>{throw new Error('quota');};assert.throws(()=>restored.add(capturePose(e,'Autre')),/quota/);assert.equal(restored.poses.length,1);
});
test('rhythm grid rounds from absolute time without cumulative drift and honours intro offset',()=>{
  const r={...defaultRhythm(),bpm:139.85,offset:3.716};const beats=beatGrid(r,60,6000);
  assert.equal(beats[0].tick,223);for(const b of beats)assert.equal(b.tick,Math.round((3.716+b.index*60/139.85)*60));
  assert.equal(beats[4].bar,2);assert.equal(beats[4].beat,1);
  assert.equal(new Set(beatGrid({...r,bpm:300,offset:0},1,100).map(b=>b.tick)).size,100);
  assert.throws(()=>beatGrid({...r,bpm:0},60,60));
});
test('rhythm metadata survives save/reload and undo/redo without modifying artwork',()=>{
  const e=editor(),frames=structuredClone(e.report.keyframes),r={...defaultRhythm(),markers:[{tick:9,label:'Accent'}]};
  setRhythm(e,r);assert.ok(e.dirty);assert.deepEqual(e.report.keyframes,frames);
  const saved=e.serialize();e.undo();assert.equal(rhythmOf(e).markers.length,0);e.redo();assert.equal(rhythmOf(e).markers[0].label,'Accent');
  const next=editor();next.load(saved);assert.deepEqual(rhythmOf(next),r);
});
test('tap tempo uses a robust median and ignores implausible gaps',()=>{
  assert.equal(tapTempo([0,500,1000,1500]),120);assert.equal(tapTempo([0,500,1000,1600,2100]),120);assert.equal(tapTempo([0,1]),null);
});

test('desktop pose storage persists across hosts and does not commit failed writes', async () => {
  const {DesktopPoseBank} = await import('../src/trait/poses.mjs');
  let saved = {};
  const desktop = {getTraitPoses: async () => structuredClone(saved), setTraitPoses: async value => {saved = structuredClone(value);}};
  const bank = new DesktopPoseBank(desktop); await bank.ready;
  const e = editor(); e.importFigure(createFigureDocument());
  const pose = capturePose(e, 'Durable');
  await bank.add(pose);
  const restarted = new DesktopPoseBank(desktop); await restarted.ready;
  assert.equal(restarted.poses[0].name, 'Durable');
  desktop.setTraitPoses = async () => {throw new Error('disk full');};
  await assert.rejects(restarted.remove(pose.id), /disk full/);
  assert.equal(restarted.poses.length, 1);
  assert.equal(saved.poses.length, 1);
  desktop.setTraitPoses = async value => { saved = structuredClone(value); };
  await Promise.all([restarted.add({...pose, id: 'second'}), restarted.add({...pose, id: 'third'})]);
  assert.equal(saved.poses.length, 3);
});
