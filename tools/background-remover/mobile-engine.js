// Keep image AI off the mobile page's main thread to maintain UI responsiveness.
const MOBILE_TIMEOUT_MS = 180_000;
let activeWorker=null;
let abortActive=null;
export function cancelMobileBackgroundRemoval(){
 if(abortActive)abortActive(new Error('Background removal cancelled.'));
}
export async function removeMobileBackground(source,target,{onStatus=()=>{}}={}){
 if(!source?.width||!source?.height)throw Error('Choose an image first.');
 if(source.width*source.height>1_200_000)throw Error('This image is too large for the mobile background remover.');
 if(typeof Worker==='undefined')throw Error('This browser does not support background processing. Try a newer browser.');
 if(activeWorker)throw Error('A background-removal job is already running.');
 const context=source.getContext('2d',{willReadFrequently:true});
 const data=context.getImageData(0,0,source.width,source.height);
 const worker=new Worker('/tools/background-remover/mobile-worker.js?v=20261120-3',{type:'module'});
 activeWorker=worker;
 try{
  return await new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(err,done)=>{
    if(settled)return;
    settled=true;
    clearTimeout(timeout);
    worker.terminate();
    activeWorker=null;abortActive=null;
    if(err)reject(err);else resolve(done);
   };
   abortActive=error=>finish(error);
   const timeout=setTimeout(()=>finish(Error('The mobile model is taking too long. Try a smaller image or a different browser.')),MOBILE_TIMEOUT_MS);
   worker.onerror=()=>finish(Error('The mobile model could not start. Please try another browser.'));
   worker.onmessage=event=>{
     const message=event.data||{};
     if(message.type==='status'){onStatus(message.text||'Processing…');return}
     if(message.type==='error'){finish(Error('Mobile background removal failed: '+message.message));return}
     if(message.type==='complete'){
       try{
         if(message.width!==source.width||message.height!==source.height||!(message.pixels instanceof ArrayBuffer)||
           message.pixels.byteLength!==source.width*source.height*4)throw Error('The mobile model returned invalid pixels.');
         target.width=message.width;target.height=message.height;
         target.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(message.pixels),message.width,message.height),0,0);
         finish(null,{tier:'mobile-modnet',device:'wasm',width:message.width,height:message.height});
       }catch(error){finish(error)}
     }
   };
   worker.postMessage({type:'remove',width:source.width,height:source.height,pixels:data.data.buffer},[data.data.buffer]);
  });
 }finally{
  if(activeWorker===worker){worker.terminate();activeWorker=null;abortActive=null;}
 }
}