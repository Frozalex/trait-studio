import {grayPyramid,trackPoints} from './optical-flow.mjs';
let previous;
self.onmessage=({data:{id,bitmap,points}})=>{
  try{
    const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
    const current=grayPyramid(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
    const result=previous?trackPoints(previous,current,points):{points,uncertain:[]};previous=current;
    self.postMessage({id,result});
  }catch(error){self.postMessage({id,error:error.message});}finally{bitmap.close();}
};
