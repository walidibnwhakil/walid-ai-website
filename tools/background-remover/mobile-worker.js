// Low-memory mobile background removal in a dedicated worker.
// MODNet (Xenova/modnet, Apache-2.0): small WASM model instead of heavyweight BiRefNet.
const CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2';
let removerPromise = null;
function status(text){self.postMessage({type:'status',text})}
self.onmessage=async event=>{
 if(event.data?.type!=='remove')return;
 const {width,height,pixels}=event.data;
 try{
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>1_200_000)throw Error('Image exceeds the mobile processing limit.');
  if(!(pixels instanceof ArrayBuffer)||pixels.byteLength!==width*height*4)throw Error('Image pixel data is invalid.');
  status('Loading the mobile-friendly background model…');
  const lib=await import(CDN);
  lib.env.allowLocalModels=false;
  lib.env.useBrowserCache=true;
  if(lib.env.backends?.onnx?.wasm)lib.env.backends.onnx.wasm.numThreads=1;
  if(!removerPromise){
   removerPromise=lib.pipeline('background-removal','Xenova/modnet',{
    device:'wasm',dtype:'uint8',
    progress_callback:update=>{
      if(update?.status==='progress'||update?.status==='progress_total'){
       const pct=Math.max(0,Math.min(100,Math.round(Number(update.progress)||0)));
       status('Loading the mobile-friendly background model… '+pct+'%');
      }
    }
   }).catch(error=>{removerPromise=null;throw error});
  }
  const remover=await removerPromise;
  status('Removing background in low-memory mode…');
  const input=new Uint8ClampedArray(pixels);
  const image=new lib.RawImage(input,width,height,4);
  const results=await remover(image);
  const result=Array.isArray(results)?results[0]:results;
  if(!result?.data||result.width!==width||result.height!==height)throw Error('The mobile model did not return a valid cutout.');
  const channels=Number(result.channels)||0;
  const bytes=new Uint8ClampedArray(width*height*4);
  if(channels===4){
   if(result.data.length!==bytes.length)throw Error('The model returned an unexpected image size.');
   bytes.set(result.data);
  }else if(channels===1){
   for(let i=0,j=0;i<result.data.length;i++,j+=4){
    bytes[j]=input[j];bytes[j+1]=input[j+1];bytes[j+2]=input[j+2];bytes[j+3]=Math.round(input[j+3]*result.data[i]/255);
   }
  }else{throw Error('The model returned an unsupported pixel format.');}
  self.postMessage({type:'complete',width,height,pixels:bytes.buffer},[bytes.buffer]);
 }catch(error){
  self.postMessage({type:'error',message:String(error?.message||'Mobile background removal could not finish.')});
 }
};