// Repair small selected areas without blocking the image editor.
import { repairSelectedArea } from './inpaint.js?v=20261120-wm2';
self.onmessage=event=>{
  if(event.data?.type!=='repair')return;
  try{
    const {pixels,width,height,selection}=event.data;
    if(!(pixels instanceof ArrayBuffer)||!Number.isInteger(width)||!Number.isInteger(height)||
       width<1||height<1||width*height>2_500_000||pixels.byteLength!==width*height*4)
      throw Error('Choose a smaller image or selected area.');
    const bytes=new Uint8ClampedArray(pixels);
    repairSelectedArea(bytes,width,height,selection);
    self.postMessage({type:'complete',width,height,pixels:bytes.buffer},[bytes.buffer]);
  }catch(error){
    self.postMessage({type:'error',message:String(error?.message||'Could not edit this image.')});
  }
};