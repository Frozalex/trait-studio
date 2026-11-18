// Classical pyramidal Lucas–Kanade tracking. No learned model or remote service.
// Forward/backward consistency and patch error reject ambiguous motion; they
// cannot certify anatomical correctness. Users remain responsible for tracing.
const R=5,ITERATIONS=18;
export function grayPyramid(rgba,width,height) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||width*height>960*960||rgba.length!==width*height*4)throw new Error('Image de suivi invalide.');
  const data=new Float32Array(width*height);
  for(let i=0;i<data.length;i++)data[i]=(.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2])/255;
  const levels=[{data,width,height}];
  while(levels.length<4&&Math.min(width,height)>=48){
    const last=levels.at(-1);width=Math.floor(width/2);height=Math.floor(height/2);const data=new Float32Array(width*height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=2*y*last.width+2*x;data[y*width+x]=(last.data[i]+last.data[i+1]+last.data[i+last.width]+last.data[i+last.width+1])/4;}
    levels.push({data,width,height});
  }return levels;
}
const inside=(image,x,y)=>x>=R+2&&y>=R+2&&x<image.width-R-3&&y<image.height-R-3;
function pixel({data,width},x,y) {const ix=Math.floor(x),iy=Math.floor(y),dx=x-ix,dy=y-iy,i=iy*width+ix;return (data[i]*(1-dx)+data[i+1]*dx)*(1-dy)+(data[i+width]*(1-dx)+data[i+width+1]*dx)*dy;}
function track(a,b,point) {
  let dx=0,dy=0,used=false,error=1;
  for(let level=a.length-1;level>=0;level--){
    if(used){dx*=2;dy*=2;}
    const factor=2**level,x=point[0]/factor,y=point[1]/factor,from=a[level],to=b[level];
    if(!inside(from,x,y)||!inside(to,x+dx,y+dy)){if(level===0)return null;continue;}
    const patch=[];let xx=0,xy=0,yy=0;
    for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){
      const value=pixel(from,x+i,y+j),gx=(pixel(from,x+i+1,y+j)-pixel(from,x+i-1,y+j))/2,gy=(pixel(from,x+i,y+j+1)-pixel(from,x+i,y+j-1))/2;
      patch.push([i,j,value,gx,gy]);xx+=gx*gx;xy+=gx*gy;yy+=gy*gy;
    }
    const determinant=xx*yy-xy*xy,eigen=(xx+yy-Math.hypot(xx-yy,2*xy))/2/patch.length;
    if(eigen<.00008||determinant<1e-9){if(level===0)return null;continue;}
    used=true;
    for(let iteration=0;iteration<ITERATIONS;iteration++){
      if(!inside(to,x+dx,y+dy))return null;
      let bx=0,by=0;error=0;
      for(const [i,j,value,gx,gy] of patch){const difference=value-pixel(to,x+dx+i,y+dy+j);bx+=gx*difference;by+=gy*difference;error+=Math.abs(difference);}
      const sx=(yy*bx-xy*by)/determinant,sy=(xx*by-xy*bx)/determinant;
      if(!Number.isFinite(sx+sy)||Math.hypot(sx,sy)>5)return null;
      dx+=sx;dy+=sy;error/=patch.length;
      if(sx*sx+sy*sy<.0004)break;
    }
  }
  return used&&inside(b[0],point[0]+dx,point[1]+dy)?{point:[point[0]+dx,point[1]+dy],error}:null;
}
export function trackPoints(previous,current,points) {
  if(previous.length!==current.length||previous.some((p,i)=>p.width!==current[i].width||p.height!==current[i].height))throw new Error('La taille de la vidéo a changé.');
  const {width,height}=previous[0],uncertain=[];
  const next=points.map((p,i)=>{
    const start=[p[0]*width,p[1]*height],forward=track(previous,current,start),back=forward&&track(current,previous,forward.point);
    if(!back||forward.error>.10||Math.hypot(back.point[0]-start[0],back.point[1]-start[1])>1.25){uncertain.push(i);return [...p];}
    return [forward.point[0]/width,forward.point[1]/height];
  });return {points:next,uncertain};
}
