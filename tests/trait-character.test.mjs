import test from 'node:test';
import assert from 'node:assert/strict';
import {Editor} from '../src/editor.mjs';
import {buildGeometry} from '../src/pivot/geometry.mjs';
import {CHARACTER_PRESETS,characterOptions,createCharacterDocument,insertCharacter,dimensions,PARENTS} from '../src/trait/character.mjs';
import {MOTIONS,motionPoints,createMotionDocument,createMotionAsset} from '../src/trait/motions.mjs';
const near=(a,b,label,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${label}: ${a} != ${b}`);
const editor=()=>new Editor({demo:false,propertyChannels:true,layerTimeline:true}).newDocument();

test('geometric presets remain native, editable and durable with four IK controls and one undo',()=>{
  for(const preset of CHARACTER_PRESETS){
    const options={...preset.options,size:145,arms:65,legs:145},e=editor(),before=e.serialize(),history=e._undo.length;
    insertCharacter(e,options);const uid=e.selectedUid;
    assert.equal(e._undo.length,history+1);assert.equal(Object.keys(e.object._stykIK).length,4);
    assert.equal(e.figure.polyfills.length,preset.id==='elan'?0:2);
    const saved=e.serialize(),loaded=editor();loaded.load(saved);loaded.select(uid);
    assert.equal(loaded.figure._styk.traitCharacter.options.size,145);
    const geometry=loaded.geometry.objects.get(loaded.selectionFrame.objects.findIndex(o=>o.unique_id===uid));
    assert.ok(geometry.segments.length>=10);
    for(const s of geometry.segments)assert.ok([s.end.x,s.end.y,s.start.x,s.start.y].every(Number.isFinite));
    loaded.select(uid,3);const angle=loaded.object.angles[3];loaded.updateSegment({angle_rad:angle+.4});assert.notEqual(loaded.object.angles[3],angle);
    e.undo();assert.deepEqual(e.serialize(),before);e.redo();assert.equal(e.selectedUid,uid);
  }
});
test('character validation rejects unbounded geometry and malformed options',()=>{
  for(const options of [{size:NaN},{size:181},{arms:1},{head:Infinity},{thickness:0},{name:' '},{color:'url(x)'},{headShape:'script'},{soft:'true'}])assert.throws(()=>createCharacterDocument(options));
  assert.equal(characterOptions({unknown:'ignored'}).unknown,undefined);
});
test('all motions preserve limb lengths across phases and extreme proportions',()=>{
  for(const options of [{},{size:50,legs:65,arms:145,torso:65,head:160},{size:180,legs:145,arms:65,torso:145,head:60}])for(const motion of MOTIONS){
    const d=dimensions(options),expected=[d.torso,d.head,d.arm/2,d.arm/2,d.arm/2,d.arm/2,d.leg/2,d.leg/2,d.leg/2,d.leg/2];
    for(let i=0;i<=120;i++){
      const points=motionPoints(motion.id,i/120,options);
      for(let j=0;j<10;j++)near(Math.hypot(points[j+1][0]-points[PARENTS[j]][0],points[j+1][1]-points[PARENTS[j]][1]),expected[j],`${motion.id} bone ${j}`);
      for(const foot of [points[8],points[10]])assert.ok(foot[1]<=1e-7,'feet cannot pass below the floor');
    }
    const start=motionPoints(motion.id,0,options),end=motionPoints(motion.id,1,options);
    for(let j=0;j<11;j++)for(let axis=0;axis<2;axis++)near(start[j][axis],end[j][axis],`${motion.id} cycle seam`);
  }
});
test('travelling walk and run hold each stance foot in world space for varied proportions',()=>{
  for(const id of ['walk','run'])for(const legs of [65,100,145]){
    const stance=id==='walk'?.6:.38,options={legs,travel:true};
    for(const [joint,offset] of [[8,0],[10,.5]]){
      const first=motionPoints(id,offset,options)[joint];
      for(let i=0;i<=30;i++){
        const foot=motionPoints(id,offset+i*stance/30,options)[joint];
        near(foot[0],first[0],`${id} locked contact x`);near(foot[1],0,`${id} grounded foot`);
      }
    }
    const asset=createMotionAsset(id,options);assert.equal(asset.keyframes[0].objects[0]._stykMovieclip.mode,'once');
  }
});
test('baked native frames reproduce target contacts, polygon shapes and mirrored travel after reload',()=>{
  for(const preset of CHARACTER_PRESETS)for(const mirror of [false,true]){
    const options={...preset.options,frames:60,travel:true,mirror,legs:145,arms:65},document=createMotionDocument('walk',options),e=editor();e.load(document);
    const saved=e.serialize(),loaded=editor();loaded.load(saved);
    for(let tick=0;tick<=60;tick++){
      const frame=loaded.report.keyframes[tick],g=buildGeometry(loaded.report,frame).objects.get(0),expected=motionPoints('walk',Math.min(1,tick/59),options);
      for(let i=0;i<10;i++){near(g.segments[i].end.x,expected[i+1][0]*(mirror?-1:1),'native x',1e-4);near(g.segments[i].end.y,expected[i+1][1],'native y',1e-4);}
      assert.equal(frame.objects[0].len_flag,0);
      if(tick)for(let i=0;i<frame.objects[0].angles.length;i++)assert.ok(Math.abs(frame.objects[0].angles[i]-loaded.report.keyframes[tick-1].objects[0].angles[i])<=Math.PI,'continuous angles');
    }
  }
});

test('one-shot motions reach their final pose on the last displayed frame',()=>{
  for(const id of ['jump','walk','run']){
    const options={frames:24,travel:true},doc=createMotionDocument(id,options),g=buildGeometry(doc,doc.keyframes[23]).objects.get(0),end=motionPoints(id,1,options);
    for(const joint of [8,10]){near(g.segments[joint-1].end.x,end[joint][0],'final contact x',1e-4);near(g.segments[joint-1].end.y,end[joint][1],'final contact y',1e-4);}
  }
});
