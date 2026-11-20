// Local photo repair. Browser-only, with a bounded working area.
// Marked pixels are replaced with nearby clean samples, never blurred source text.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const inside=(x,y,r)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
const index=(x,y,width)=>(y*width+x)*4;
const MAX_AREA=320000;
function fitPlane(data,width,height,rect){
  // Fit gentle backgrounds using known pixels around the selection.
  let n=0,sx=0,sy=0,sxx=0,syy=0,sxy=0;
  const values=[0,0,0,0],xc=[0,0,0,0],yc=[0,0,0,0];
  const xc0=rect.x+rect.w/2,yc0=rect.y+rect.h/2;
  const radius=Math.max(5,Math.min(14,Math.round(Math.min(rect.w,rect.h)*0.15)));
  const stride=Math.max(1,Math.floor(Math.min(rect.w,rect.h)/100));
  for(let yy=Math.max(0,rect.y-radius);yy<Math.min(height,rect.y+rect.h+radius);yy+=stride){
    for(let xx=Math.max(0,rect.x-radius);xx<Math.min(width,rect.x+rect.w+radius);xx+=stride){
      if(inside(xx,yy,rect))continue;
      // Only use the nearest clean ring around the erased area.
      const d=Math.max(rect.x-xx,0,xx-(rect.x+rect.w-1))+
              Math.max(rect.y-yy,0,yy-(rect.y+rect.h-1));
      if(d>radius*1.5)continue;
      const px=xx-xc0,py=yy-yc0,o=index(xx,yy,width);
      n++;sx+=px;sy+=py;sxx+=px*px;syy+=py*py;sxy+=px*py;
      for(let c=0;c<4;c++){values[c]+=data[o+c];xc[c]+=px*data[o+c];yc[c]+=py*data[o+c];}
    }
  }
  if(n<8)throw Error('Select a smaller area so the surrounding image is visible.');
  function solve(c){
    // 3x3 Gaussian elimination for [constant, horizontal, vertical].
    const m=[[n,sx,sy,values[c]],[sx,sxx,sxy,xc[c]],[sy,sxy,syy,yc[c]]];
    for(let j=0;j<3;j++){
      let pivot=j;
      for(let k=j+1;k<3;k++)if(Math.abs(m[k][j])>Math.abs(m[pivot][j]))pivot=k;
      if(Math.abs(m[pivot][j])<1e-7)return [values[c]/n,0,0];
      [m[j],m[pivot]]=[m[pivot],m[j]];
      const v=m[j][j];for(let k=j;k<4;k++)m[j][k]/=v;
      for(let row=0;row<3;row++)if(row!==j){const f=m[row][j];for(let k=j;k<4;k++)m[row][k]-=f*m[j][k]}
    }
    return [m[0][3],m[1][3],m[2][3]];
  }
  const coeff=[solve(0),solve(1),solve(2),solve(3)];
  const color=(x,y,c)=>clamp(coeff[c][0]+coeff[c][1]*(x-xc0)+coeff[c][2]*(y-yc0),0,255);
  let err=0,count=0;
  for(let yy=Math.max(0,rect.y-radius);yy<Math.min(height,rect.y+rect.h+radius);yy+=stride)
    for(let xx=Math.max(0,rect.x-radius);xx<Math.min(width,rect.x+rect.w+radius);xx+=stride){
      if(inside(xx,yy,rect))continue;
      const d=Math.max(rect.x-xx,0,xx-(rect.x+rect.w-1))+
              Math.max(rect.y-yy,0,yy-(rect.y+rect.h-1));
      if(d>radius*1.5)continue;
      const o=index(xx,yy,width);
      for(let c=0;c<4;c++){const diff=data[o+c]-color(xx,yy,c);err+=diff*diff;count++}
    }
  return {color,rmse:Math.sqrt(err/Math.max(1,count))};
}
function chooseDonors(raw,width,height,rect,limit=240){
  const pad=8;
  const step=Math.max(4,Math.round(Math.max(width,height)/85));
  const donors=[];
  for(let y=pad;y<height-pad;y+=step)
    for(let x=pad;x<width-pad;x+=step){
      if(x<rect.x+rect.w+pad&&x>rect.x-pad&&y<rect.y+rect.h+pad&&y>rect.y-pad)continue;
      donors.push({x,y});
    }
  // Evenly span the clean image to avoid a cluster of identical donors.
  if(donors.length<=limit)return donors;
  const sampled=[];
  for(let i=0;i<limit;i++)sampled.push(donors[Math.floor(i*(donors.length-1)/Math.max(1,limit-1))]);
  return sampled;
}
function tryWholePatch(raw,width,height,rect){
  // When a clean nearby region repeats the texture, use it as one intact piece
  // rather than many small tiles. This preserves stripes, text backgrounds, and edges.
  const {x,y,w,h}=rect;
  const area=(width-w)*(height-h);
  if(area<=0)return null;
  const step=Math.max(2,Math.floor(Math.sqrt(area/6500)));
  const sampleX=Math.max(1,Math.floor(w/28)),sampleY=Math.max(1,Math.floor(h/22));
  const samples=[];
  for(let xx=0;xx<w;xx+=sampleX){
    if(y>0)samples.push([xx,-1]);
    if(y+h<height)samples.push([xx,h]);
  }
  for(let yy=0;yy<h;yy+=sampleY){
    if(x>0)samples.push([-1,yy]);
    if(x+w<width)samples.push([w,yy]);
  }
  if(samples.length<12)return null;
  function score(px,py){
    if(px<1||py<1||px+w>=width-1||py+h>=height-1)return Infinity;
    if(px<x+w+2&&px+w>x-2&&py<y+h+2&&py+h>y-2)return Infinity;
    let err=0;
    for(const [ox,oy] of samples){
      const a=index(x+ox,y+oy,width),b=index(px+ox,py+oy,width);
      for(let c=0;c<3;c++){const d=raw[a+c]-raw[b+c];err+=d*d;}
    }
    return err/(samples.length*3);
  }
  const winners=[];
  for(let py=1;py+h<height-1;py+=step){
    for(let px=1;px+w<width-1;px+=step){
      const value=score(px,py);
      if(!Number.isFinite(value))continue;
      if(winners.length<6||value<winners[winners.length-1].score){
        winners.push({x:px,y:py,score:value});
        winners.sort((a,b)=>a.score-b.score);
        if(winners.length>6)winners.pop();
      }
    }
  }
  if(!winners.length)return null;
  let best=winners[0];
  // Search exact pixel alignment around coarse candidates.
  for(const candidate of winners)for(let dy=-step-2;dy<=step+2;dy++)
    for(let dx=-step-2;dx<=step+2;dx++){
      const px=candidate.x+dx,py=candidate.y+dy,value=score(px,py);
      if(value<best.score)best={x:px,y:py,score:value};
    }
  if(best.score>145)return null;
  const output=new Uint8ClampedArray(raw);
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    const dest=index(x+xx,y+yy,width),src=index(best.x+xx,best.y+yy,width);
    for(let c=0;c<4;c++)output[dest+c]=raw[src+c];
  }
  return output;
}
function fillTexturedRegion(raw,width,height,rect,plane){
  const output=new Uint8ClampedArray(raw);
  const xEnd=rect.x+rect.w,yEnd=rect.y+rect.h;
  const tile=rect.w*rect.h>70000?9:7;
  const donors=chooseDonors(raw,width,height,rect,240);
  if(!donors.length)throw Error('Please select a smaller area.');
  const known=new Uint8Array(rect.w*rect.h);
  const completed=(x,y)=>!inside(x,y,rect)||!!known[(y-rect.y)*rect.w+(x-rect.x)];
  const cells=[];
  for(let y=rect.y;y<yEnd;y+=tile)for(let x=rect.x;x<xEnd;x+=tile){
    const w=Math.min(tile,xEnd-x),h=Math.min(tile,yEnd-y);
    const shell=Math.min(x-rect.x,y-rect.y,xEnd-(x+w),yEnd-(y+h));
    cells.push({x,y,w,h,shell});
  }
  cells.sort((a,b)=>a.shell-b.shell);
  const pad=4;
  let edgeTotal=0,edgeCount=0;
  for(const cell of cells){
    const samples=[];
    for(let dy=-pad;dy<cell.h+pad;dy+=2)for(let dx=-pad;dx<cell.w+pad;dx+=2){
      if(dx>=0&&dx<cell.w&&dy>=0&&dy<cell.h)continue;
      const px=cell.x+dx,py=cell.y+dy;
      if(px<0||py<0||px>=width||py>=height||!completed(px,py))continue;
      samples.push({dx,dy,target:index(px,py,width)});
    }
    if(!samples.length){
      // A disconnected interior tile can be matched to a neighboring filled tile.
      for(const [dx,dy] of [[-1,0],[0,-1],[cell.w,0],[0,cell.h]])
        if(cell.x+dx>=0&&cell.x+dx<width&&cell.y+dy>=0&&cell.y+dy<height&&completed(cell.x+dx,cell.y+dy))
          samples.push({dx,dy,target:index(cell.x+dx,cell.y+dy,width)});
    }
    let choice=null,best=Infinity;
    const cx=cell.x+cell.w/2,cy=cell.y+cell.h/2;
    function evaluate(sx,sy){
      if(sx-pad<0||sy-pad<0||sx+cell.w+pad>=width||sy+cell.h+pad>=height)return Infinity;
      if(sx-pad<rect.x+rect.w&&sx+cell.w+pad>rect.x&&sy-pad<rect.y+rect.h&&sy+cell.h+pad>rect.y)return Infinity;
      let error=0,compares=0;
      for(const point of samples){
        const a=point.target,b=index(sx+point.dx,sy+point.dy,width);
        for(let c=0;c<3;c++){const diff=output[a+c]-raw[b+c];error+=diff*diff;compares++;}
      }
      const base=index(sx+Math.floor(cell.w/2),sy+Math.floor(cell.h/2),width);
      for(let c=0;c<3;c++){const d=raw[base+c]-plane.color(cx,cy,c);error+=d*d*.20;}
      return error/Math.max(1,compares)+Math.hypot(sx-cell.x,sy-cell.y)*.012;
    }
    for(const donor of donors){
      const sx=donor.x-Math.floor(cell.w/2),sy=donor.y-Math.floor(cell.h/2);
      const score=evaluate(sx,sy);
      if(score<best){best=score;choice={x:sx,y:sy};}
    }
    // Refine a coarse donor position to the nearest matching texture phase.
    // This avoids visible seams in repeating patterns and text over stripes.
    if(choice){
      const coarse=choice;
      for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
        const sx=coarse.x+dx,sy=coarse.y+dy,score=evaluate(sx,sy);
        if(score<best){best=score;choice={x:sx,y:sy};}
      }
    }
    if(!choice)throw Error('Could not repair this area. Try a smaller selection.');
    // Match donor brightness to the existing border, without blurring its texture.
    const diff=[0,0,0];let count=0;
    for(const p of samples){
      const t=p.target,b=index(choice.x+p.dx,choice.y+p.dy,width);
      for(let c=0;c<3;c++)diff[c]+=output[t+c]-raw[b+c];
      count++;
    }
    if(count){for(let c=0;c<3;c++)diff[c]=clamp(diff[c]/count,-35,35);}
    for(let yy=0;yy<cell.h;yy++)for(let xx=0;xx<cell.w;xx++){
      const t=index(cell.x+xx,cell.y+yy,width),from=index(choice.x+xx,choice.y+yy,width);
      for(let c=0;c<3;c++)output[t+c]=clamp(Math.round(raw[from+c]+diff[c]*.7),0,255);
      // Copy existing transparency; never add a solid color underneath.
      output[t+3]=raw[from+3];
      known[(cell.y+yy-rect.y)*rect.w+(cell.x+xx-rect.x)]=1;
    }
    if(cell.shell===0&&samples.length){edgeTotal+=best;edgeCount++;}
  }
  if(edgeCount>4&&edgeTotal/edgeCount>5000)throw Error('This area is too detailed. Try a smaller selection.');
  return output;
}
export function repairSelectedArea(source,width,height,selection){
  if(!(source instanceof Uint8ClampedArray)||source.length!==width*height*4)
    throw Error('Choose an image and try again.');
  if(!selection)throw Error('Select an area to remove first.');
  const sx=clamp(Math.floor(selection.x),0,width-1),sy=clamp(Math.floor(selection.y),0,height-1);
  const sw=clamp(Math.ceil(selection.w),1,width-sx),sh=clamp(Math.ceil(selection.h),1,height-sy);
  if(sw<3||sh<3||sw>width*.7||sh>height*.7||sw*sh>MAX_AREA)
    throw Error('Select a smaller area for better results.');
  const margin=Math.min(3,Math.max(1,Math.round(Math.min(sw,sh)*.03)));
  const rect={x:Math.max(0,sx-margin),y:Math.max(0,sy-margin)};
  rect.w=Math.min(width-rect.x,sx+sw+margin-rect.x);
  rect.h=Math.min(height-rect.y,sy+sh+margin-rect.y);
  const plane=fitPlane(source,width,height,rect);
  if(plane.rmse<=14){
    const output=new Uint8ClampedArray(source);
    for(let y=rect.y;y<rect.y+rect.h;y++)for(let x=rect.x;x<rect.x+rect.w;x++){
      const o=index(x,y,width);
      for(let c=0;c<4;c++)output[o+c]=Math.round(plane.color(x,y,c));
      // Reconstruct alpha from the clean surrounding pixels; do not keep an opaque text silhouette.
    }
    source.set(output);
    return {x:rect.x,y:rect.y,w:rect.w,h:rect.h,method:'clean'};
  }
  const whole=tryWholePatch(source,width,height,rect);
  if(whole){source.set(whole);return {x:rect.x,y:rect.y,w:rect.w,h:rect.h,method:'matching texture'}}
  const textured=fillTexturedRegion(source,width,height,rect,plane);
  source.set(textured);
  return {x:rect.x,y:rect.y,w:rect.w,h:rect.h,method:'texture'};
}
const activeJobs=new Set();
export function cancelWatermarkRepair(){
  for(const job of activeJobs)job.cancel();
}
export async function repairWatermark(context,width,height,selection){
  if(!selection)throw Error('Select an area to remove first.');
  const x=Math.max(0,Math.floor(selection.x)),y=Math.max(0,Math.floor(selection.y));
  const w=Math.min(width-x,Math.ceil(selection.w)),h=Math.min(height-y,Math.ceil(selection.h));
  if(w<3||h<3||w>width*.45||h>height*.45||w*h>MAX_AREA)
    throw Error('Select a smaller area for better results.');
  const pad=Math.min(260,Math.max(70,Math.round(Math.max(w,h)*1.4)));
  const rx=Math.max(0,x-pad),ry=Math.max(0,y-pad);
  const rw=Math.min(width, x+w+pad)-rx,rh=Math.min(height,y+h+pad)-ry;
  if(rw*rh>2500000)throw Error('Select a smaller area for better results.');
  const data=context.getImageData(rx,ry,rw,rh);
  if(typeof Worker==='undefined')throw Error('This feature is unavailable in this browser.');
  const worker=new Worker('/tools/watermark-remover/inpaint-worker.js?v=20261120-wm2',{type:'module'});
  return new Promise((resolve,reject)=>{
    let complete=false;
    const job={cancel(){end(Error('Image editing cancelled.'))}};
    activeJobs.add(job);
    const finishTimer=setTimeout(()=>end(Error('Editing is taking too long. Try a smaller area.')),60000);
    function end(error,result){
      if(complete)return;
      complete=true;clearTimeout(finishTimer);worker.terminate();activeJobs.delete(job);
      if(error){reject(error);return}
      try{
        if(result.width!==rw||result.height!==rh||!(result.pixels instanceof ArrayBuffer)||
          result.pixels.byteLength!==rw*rh*4)throw Error('Could not finish editing this image.');
        context.putImageData(new ImageData(new Uint8ClampedArray(result.pixels),rw,rh),rx,ry);
        resolve();
      }catch(err){reject(err)}
    }
    worker.onerror=()=>end(Error('Could not edit this image. Try a smaller selection.'));
    worker.onmessage=event=>{
      const msg=event.data;
      if(msg?.type==='complete')end(null,msg);
      else if(msg?.type==='error')end(Error(msg.message||'Could not edit this image.'));
    };
    worker.postMessage({type:'repair',width:rw,height:rh,pixels:data.data.buffer,
      selection:{x:x-rx,y:y-ry,w,h}},[data.data.buffer]);
  });
}
