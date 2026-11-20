// General-purpose, lightweight subject segmentation for mobile browsers.
// U²-NetP weights: Apache-2.0 (Xuebin Qin et al.); do not use portrait-only MODNet.
const ORT_VERSION = '1.20.1';
const ORT_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ORT_VERSION + '/dist/';
const MODEL_URL = 'https://huggingface.co/nfa04/u2netp-onnx/resolve/main/u2netp.onnx';
const SIDE = 320;
const MAX_PIXELS = 1_200_000;
let modelPromise = null;
function progress(message){self.postMessage({type:'status',text:message})}
function bound(value,min,max){return Math.max(min,Math.min(max,value))}
function prepareInput(bytes,width,height){
  const input = new Float32Array(3 * SIDE * SIDE);
  const means = [0.485,0.456,0.406], deviations = [0.229,0.224,0.225];
  const samples=SIDE*SIDE;
  for(let y=0;y<SIDE;y++){
    const sy=(y+0.5)*height/SIDE-0.5,y0=bound(Math.floor(sy),0,height-1),y1=Math.min(y0+1,height-1),fy=bound(sy-y0,0,1);
    for(let x=0;x<SIDE;x++){
      const sx=(x+0.5)*width/SIDE-0.5,x0=bound(Math.floor(sx),0,width-1),x1=Math.min(x0+1,width-1),fx=bound(sx-x0,0,1);
      const tl=(y0*width+x0)*4,tr=(y0*width+x1)*4,bl=(y1*width+x0)*4,br=(y1*width+x1)*4;
      for(let channel=0;channel<3;channel++){
        const sample=index=>255+(bytes[index+channel]-255)*bytes[index+3]/255;
        const top=sample(tl)*(1-fx)+sample(tr)*fx, bottom=sample(bl)*(1-fx)+sample(br)*fx;
        input[channel*samples+y*SIDE+x]=((top*(1-fy)+bottom*fy)/255-means[channel])/deviations[channel];
      }
    }
  }
  return input;
}
function cutout(original,width,height,rawMask){
  if(!rawMask||rawMask.length!==SIDE*SIDE)throw Error('Invalid segmentation result.');
  let low=Infinity,high=-Infinity;
  for(const value of rawMask){if(!Number.isFinite(value))throw Error('Invalid segmentation confidence.');low=Math.min(low,value);high=Math.max(high,value)}
  if(high-low<0.0001)throw Error('The subject could not be separated from this background.');
  const inverse=1/(high-low);
  const result=new Uint8ClampedArray(width*height*4);
  let opaque=0,samples=0;
  for(let y=0;y<height;y++){
    const sy=(y+0.5)*SIDE/height-0.5,y0=bound(Math.floor(sy),0,SIDE-1),y1=Math.min(SIDE-1,y0+1),fy=bound(sy-y0,0,1);
    for(let x=0;x<width;x++){
      const sx=(x+0.5)*SIDE/width-0.5,x0=bound(Math.floor(sx),0,SIDE-1),x1=Math.min(SIDE-1,x0+1),fx=bound(sx-x0,0,1);
      const top=rawMask[y0*SIDE+x0]*(1-fx)+rawMask[y0*SIDE+x1]*fx;
      const bottom=rawMask[y1*SIDE+x0]*(1-fx)+rawMask[y1*SIDE+x1]*fx;
      const normalized=bound(((top*(1-fy)+bottom*fy)-low)*inverse,0,1);
      const offset=(y*width+x)*4;
      result[offset]=original[offset];result[offset+1]=original[offset+1];result[offset+2]=original[offset+2];
      const alpha=bound(normalized*255,0,255);
      result[offset+3]=Math.round(original[offset+3]*alpha/255);
      samples++;if(result[offset+3]>127)opaque++;
    }
  }
  const coverage=opaque/Math.max(1,samples);
  // Reject nearly-empty and nearly-unchanged outputs rather than offering broken PNGs.
  if(coverage<0.025||coverage>0.95)throw Error('The subject could not be separated clearly. Please try a different photo.');
  return result;
}
async function getModel(){
 if(!modelPromise){
  modelPromise=(async()=>{
    progress('Preparing image…');
    const ort=await import(ORT_BASE+'ort.wasm.min.mjs');
    ort.env.wasm.wasmPaths=ORT_BASE;
    ort.env.wasm.numThreads=1;
    const response=await fetch(MODEL_URL,{cache:'force-cache',mode:'cors'});
    if(!response.ok)throw Error('Could not load the image processor.');
    const modelBytes=await response.arrayBuffer();
    if(modelBytes.byteLength<1000000||modelBytes.byteLength>10000000)throw Error('The image processor returned an unexpected file.');
    const session=await ort.InferenceSession.create(modelBytes,{executionProviders:['wasm'],graphOptimizationLevel:'basic'});
    return {ort,session};
  })().catch(err=>{modelPromise=null;throw err});
 }
 return modelPromise;
}
self.onmessage=async event=>{
 if(event.data?.type!=='remove')return;
 const {width,height,pixels}=event.data;
 try{
   if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>MAX_PIXELS)
     throw Error('Choose a smaller image to continue.');
   if(!(pixels instanceof ArrayBuffer)||pixels.byteLength!==width*height*4)
     throw Error('The image could not be read.');
   const bytes=new Uint8ClampedArray(pixels);
   const model=await getModel();
   progress('Removing background…');
   const input=prepareInput(bytes,width,height);
   const feeds={[model.session.inputNames[0]]:new model.ort.Tensor('float32',input,[1,3,SIDE,SIDE])};
   const outputs=await model.session.run(feeds,[model.session.outputNames[0]]);
   const mask=outputs[model.session.outputNames[0]]?.data;
   const result=cutout(bytes,width,height,mask);
   self.postMessage({type:'complete',width,height,pixels:result.buffer},[result.buffer]);
 }catch(err){
   self.postMessage({type:'error',message:String(err?.message||'Could not remove the background. Please try another photo.')});
 }
};
