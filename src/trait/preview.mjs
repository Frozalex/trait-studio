import {buildGeometry,drawGeometry} from '../pivot/geometry.mjs';
import {objectBounds} from '../renderer-geometry.mjs';

/** A fixed view across the whole cycle preserves visible movement and contacts. */
export function previewBounds(report) {
  let x=Infinity,y=Infinity,right=-Infinity,bottom=0;
  const count=report.keyframes.length,steps=Math.min(32,count-1);
  for(let i=0;i<=steps;i++) {
    const frame=report.keyframes[steps?Math.round(i*(count-1)/steps):0],b=objectBounds(buildGeometry(report,frame).drawables);
    x=Math.min(x,b.x);y=Math.min(y,b.y);right=Math.max(right,b.x+b.width);bottom=Math.max(bottom,b.y+b.height);
  }
  return {x,y,width:Math.max(1,right-x),height:Math.max(1,bottom-y)};
}
export function paintPreview(canvas,report,{tick=0,bounds=previewBounds(report),joints=false}={}) {
  const ctx=canvas.getContext('2d'),geometry=buildGeometry(report,report.keyframes[Math.min(report.keyframes.length-1,tick)]);
  const scale=Math.min((canvas.width-80)/bounds.width,(canvas.height-80)/bounds.height);
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
  ctx.translate(canvas.width/2-(bounds.x+bounds.width/2)*scale,canvas.height/2-(bounds.y+bounds.height/2)*scale);ctx.scale(scale,scale);
  ctx.strokeStyle='#87929f';ctx.lineWidth=1/scale;ctx.setLineDash([5/scale,6/scale]);ctx.beginPath();ctx.moveTo(bounds.x-24,0);ctx.lineTo(bounds.x+bounds.width+24,0);ctx.stroke();ctx.setLineDash([]);
  drawGeometry(ctx,geometry);
  if(joints)for(const object of geometry.objects.values())for(const segment of object.segments) {
    if(segment.seg.aux_code===1)continue;
    ctx.fillStyle='#ffffff';ctx.strokeStyle='#343c50';ctx.lineWidth=1.5/scale;ctx.beginPath();ctx.arc(segment.end.x,segment.end.y,4/scale,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  ctx.restore();
}
