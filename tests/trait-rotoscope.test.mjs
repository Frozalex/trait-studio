import test from 'node:test';
import assert from 'node:assert/strict';
import {Editor} from '../src/editor.mjs';
import {buildGeometry} from '../src/pivot/geometry.mjs';
import {grayPyramid,trackPoints} from '../src/trait/optical-flow.mjs';
import {tracePlan,traceTemplate,correctTrace,createTraceDocument,insertTrace} from '../src/trait/rotoscope.mjs';

function image(dx=0,dy=0,{blank=false,width=160,height=120}={}) {
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,px=x-dx,py=y-dy;
    const value=blank?100:128+45*Math.sin(px*.31)*Math.cos(py*.27)+35*Math.sin(px*.17+py*.21);
    data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }return grayPyramid(data,width,height);
}
test('classical tracking follows known pixel motion and rejects textureless/occluded points',()=>{
  const points=[[.4,.5],[.6,.6]],result=trackPoints(image(),image(3,-2),points);
  assert.deepEqual(result.uncertain,[]);
  result.points.forEach((p,i)=>{assert.ok(Math.abs(p[0]*160-points[i][0]*160-3)<.15);assert.ok(Math.abs(p[1]*120-points[i][1]*120+2)<.15);});
  const blank=trackPoints(image(),image(0,0,{blank:true}),points);assert.deepEqual(blank.uncertain,[0,1]);assert.deepEqual(blank.points,points);
  assert.deepEqual(trackPoints(image(0,0,{blank:true}),image(),points).uncertain,[0,1]);
  assert.deepEqual(trackPoints(image(),image(),[[0,0]]).uncertain,[0]);
});
const capture=()=>{const plan=tracePlan({start:1.2,end:1.7,duration:2,fps:24});return {plan,width:640,height:480,samples:plan.times.map((time,i)=>({time,points:traceTemplate().map(([x,y],j)=>[x+i*.002,y+(j===4?i*.003:0)]),uncertain:[],manual:[]}))};};
test('capture samples from absolute timestamps and enforces bounded excerpts',()=>{
  const p=tracePlan({start:2.7,end:3.31,duration:4,fps:30});assert.equal(p.count,19);assert.equal(p.times[12],2.7+12/30);assert.ok(p.times.at(-1)<p.end);
  for(const args of [{start:0,end:31,duration:40,fps:24},{start:0,end:20,duration:30,fps:120},{start:-1,end:1,duration:2,fps:24},{start:0,end:3,duration:2,fps:24}])assert.throws(()=>tracePlan(args));
});
test('native keyframes preserve joint coordinates, changing limb lengths and timing',()=>{
  const c=capture(),doc=createTraceDocument(c);assert.equal(doc.keyframes.length,c.samples.length+1);assert.equal(doc.fps,24);
  for(const [i,sample] of c.samples.entries()){
    const geometry=buildGeometry(doc,doc.keyframes[i]),object=geometry.objects.values().next().value;
    for(let j=2;j<14;j++){
      const end=object.segments[j].end;
      assert.ok(Math.abs(end.x-sample.points[j][0]*c.width)<.0002,`joint ${j} x`);
      assert.ok(Math.abs(end.y-sample.points[j][1]*c.height)<.0002,`joint ${j} y`);
    }
  }
  assert.notDeepEqual(doc.keyframes[0].objects[0].lengths,doc.keyframes[5].objects[0].lengths);
  const e=new Editor({demo:false});e.load(doc);const saved=e.serialize();const next=new Editor({demo:false});next.load(saved);assert.deepEqual(next.serialize(),saved);
});
test('manual corrections invalidate dependent tracking without mutating the previous draft',()=>{
  const {samples}=capture();samples[3].uncertain=[4,7];const before=structuredClone(samples),next=correctTrace(samples,3,4,[.6,.4]);
  assert.equal(next.length,4);assert.deepEqual(next[3].points[4],[.6,.4]);assert.deepEqual(next[3].uncertain,[7]);assert.deepEqual(samples,before);
  assert.throws(()=>correctTrace(samples,3,4,[NaN,0]));
});
test('insertion is atomic, editable, serializable and preserves prior artwork with undo/redo',()=>{
  const e=new Editor({demo:false,propertyChannels:true,layerTimeline:true}).newDocument(),before=e.serialize(),history=e._undo.length;
  const object=insertTrace(e,capture());assert.equal(e._undo.length,history+1);assert.equal(e.totalTicks,12);assert.ok(e.selectionFrame.objects.some(o=>o.unique_id===1));
  assert.equal(e.figure._styk.movieclip.document.figure_types[0].segments.length,14);
  assert.equal(e.figure._styk.movieclip.document._styk.traitTrace.method,'manual-pyramidal-lk');
  const saved=e.serialize();e.undo();assert.deepEqual(e.serialize(),before);e.redo();assert.equal(e.selectedUid,object.unique_id);assert.deepEqual(e.serialize(),saved);
  const next=new Editor({demo:false});next.load(saved);assert.deepEqual(next.serialize(),saved);
  const malformed=capture();malformed.samples[1].points[0][0]=Infinity;assert.throws(()=>insertTrace(e,malformed));assert.deepEqual(e.serialize(),saved);
});
