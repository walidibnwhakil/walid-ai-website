// Local image repair for a selected small area. No image data leaves the browser.
// Work in-place to avoid duplicating a full-resolution photo in memory.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function pixel(source,width,x,y,channel){return source[(y*width+x)*4+channel]}
export function repairSelectedArea(source,width,height,selection){
  if(!(source instanceof Uint8ClampedArray)||source.length!==width*height*4)
    throw Error('Please select an image and try again.');
  if(!selection)throw Error('Select the area to remove first.');
  const sx=clamp(Math.floor(selection.x),0,width-1),sy=clamp(Math.floor(selection.y),0,height-1);
  const sw=clamp(Math.ceil(selection.w),1,width-sx),sh=clamp(Math.ceil(selection.h),1,height-sy);
  if(sw<3||sh<3)throw Error('Select a slightly larger area.');
  if(sw>width*0.45||sh>height*0.45||sw*sh>320_000)
    throw Error('Select a smaller area for better results.');
  // Include antialiasing at the edge of the selected mark.
  const margin=Math.min(3,Math.max(1,Math.round(Math.min(sw,sh)*0.02)));
  const x=clamp(sx-margin,0,width-1),y=clamp(sy-margin,0,height-1);
  const right=clamp(sx+sw+margin,1,width),bottom=clamp(sy+sh+margin,1,height);
  const w=right-x,h=bottom-y;
  const hasL=x>0,hasR=x+w<width,hasT=y>0,hasB=y+h<height;
  if(!(hasL||hasR||hasT||hasB))throw Error('Choose a smaller area.');
  const strengthH=1/Math.max(1,w),strengthV=1/Math.max(1,h);
  function estimate(xx,yy,c){
    let hValue=0,vValue=0,wh=0,wv=0;
    if(hasL||hasR){
      const left=hasL?pixel(source,width,x-1,y+yy,c):0;
      const rightValue=hasR?pixel(source,width,x+w,y+yy,c):0;
      hValue=hasL&&hasR?left+(rightValue-left)*(xx+1)/(w+1):(hasL?left:rightValue);
      wh=strengthH;
    }
    if(hasT||hasB){
      const top=hasT?pixel(source,width,x+xx,y-1,c):0;
      const bottomValue=hasB?pixel(source,width,x+xx,y+h,c):0;
      vValue=hasT&&hasB?top+(bottomValue-top)*(yy+1)/(h+1):(hasT?top:bottomValue);
      wv=strengthV;
    }
    return (hValue*wh+vValue*wv)/(wh+wv);
  }
  // Compare the repaired border with the untouched pixels surrounding the mark.
  const stepX=Math.max(1,Math.floor(w/14)),stepY=Math.max(1,Math.floor(h/14));
  function score(sample,locationX,locationY){
    let sum=0,count=0;
    function compare(tx,ty,fromX,fromY){
      for(let c=0;c<3;c++){
        const a=pixel(source,width,tx,ty,c),b=sample(fromX,fromY,c);
        const diff=a-b;sum+=diff*diff;count++;
      }
    }
    if(hasL)for(let dy=0;dy<h;dy+=stepY)compare(x-1,y+dy,locationX,locationY+dy);
    if(hasR)for(let dy=0;dy<h;dy+=stepY)compare(x+w,y+dy,locationX+w-1,locationY+dy);
    if(hasT)for(let dx=0;dx<w;dx+=stepX)compare(x+dx,y-1,locationX+dx,locationY);
    if(hasB)for(let dx=0;dx<w;dx+=stepX)compare(x+dx,y+h,locationX+dx,locationY+h-1);
    return count?sum/count:Infinity;
  }
  const smoothScore=score((xx,yy,c)=>estimate(xx-x,yy-y,c),x,y);
  let bestScore=Infinity,best=null;
  const radius=Math.max(36,Math.min(230,Math.round(Math.max(w,h)*1.65)));
  const step=Math.max(2,Math.round(Math.min(w,h)/35));
  const minX=Math.max(0,x-radius),maxX=Math.min(width-w,x+radius);
  const minY=Math.max(0,y-radius),maxY=Math.min(height-h,y+radius);
  for(let yy=minY;yy<=maxY;yy+=step){
    for(let xx=minX;xx<=maxX;xx+=step){
      // Never sample pixels from the marked rectangle itself.
      if(xx<x+w+2&&xx+w>x-2&&yy<y+h+2&&yy+h>y-2)continue;
      const value=score((px,py,c)=>pixel(source,width,px,py,c),xx,yy);
      const movement=Math.hypot(xx-x,yy-y);
      const adjusted=value+movement*0.08;
      if(adjusted<bestScore){bestScore=adjusted;best={x:xx,y:yy}}
    }
  }
  const usePatch=best&&bestScore<smoothScore*0.78&&bestScore<3600;
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    const destination=((y+yy)*width+x+xx)*4;
    for(let c=0;c<4;c++){
      source[destination+c]=Math.round(usePatch
        ?pixel(source,width,best.x+xx,best.y+yy,c)
        :estimate(xx,yy,c));
    }
  }
  return {x,y,w,h,method:usePatch?'nearby':'smooth'};
}
