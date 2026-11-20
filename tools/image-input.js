// Decode common image files locally. The browser's native decoder is preferred.
// Load optional decoders only if a HEIC/HEIF or TIFF photo cannot open natively.
const scripts=new Map();
const EXTRAS=/\.(?:heic|heif|tif|tiff|jfif|jpe|bmp|gif|avif|svg|ico|jp2|j2k|jxl|psd|raw|dng|arw|cr2|nef|orf|raf)$/i;
export function isImageCandidate(file){
  return !!file && (String(file.type||'').toLowerCase().startsWith('image/')||EXTRAS.test(String(file.name||'')));
}
function loadLibrary(url,key){
  if(!scripts.has(url)){
    const promise=new Promise((resolve,reject)=>{
      const existing=globalThis[key];if(existing){resolve(existing);return}
      const script=document.createElement('script');script.src=url;script.async=true;
      script.crossOrigin='anonymous';
      script.onload=()=>{if(globalThis[key])resolve(globalThis[key]);else reject(Error('Unable to read this image format.'))};
      script.onerror=()=>reject(Error('Unable to open this image. Check your connection and try again.'));
      document.head.appendChild(script);
    }).catch(err=>{scripts.delete(url);throw err});
    scripts.set(url,promise);
  }
  return scripts.get(url);
}
function nativeLoad(blob){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(blob),image=new Image();
    const release=()=>URL.revokeObjectURL(url);
    image.onload=()=>resolve({image,release});
    image.onerror=()=>{release();reject(Error('Unsupported image format.'))};
    image.src=url;
  });
}
async function heicDecode(file){
  const convert=await loadLibrary('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js','heic2any');
  const result=await convert({blob:file,toType:'image/png'});
  const blob=Array.isArray(result)?result[0]:result;
  if(!(blob instanceof Blob))throw Error('Unable to read this image format.');
  return nativeLoad(blob);
}
async function tiffDecode(file,maxPixels){
  const UTIF=await loadLibrary('https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js','UTIF');
  const buffer=await file.arrayBuffer();
  const pages=UTIF.decode(buffer);
  if(!pages.length)throw Error('Unable to read this image format.');
  const page=pages[0],width=Number(page.width),height=Number(page.height);
  if(!width||!height||width*height>maxPixels||width>10000||height>10000)
    throw Error('This image is too large. Choose a smaller image.');
  UTIF.decodeImage(buffer,page);
  const rgba=UTIF.toRGBA8(page);
  if(!rgba||rgba.length!==width*height*4)throw Error('Unable to read this image format.');
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba),width,height),0,0);
  return {image:canvas,release(){}};
}
export async function openImageFile(file,{maxPixels=25_000_000}={}){
  if(!isImageCandidate(file))throw Error('Choose an image file.');
  // Avoid loading very large photographs or decoder inputs on memory-limited phones.
  if(file.size>45*1024*1024)throw Error('This image file is too large. Choose a smaller one.');
  let opened;
  try{opened=await nativeLoad(file);}catch{
    const suffix=String(file.name||'').toLowerCase();
    try{
      if(/\.(heic|heif)$/.test(suffix)||/image\/hei[cf]/.test(file.type))opened=await heicDecode(file);
      else if(/\.(tif|tiff)$/.test(suffix)||/image\/tiff/.test(file.type))opened=await tiffDecode(file,maxPixels);
      else throw Error('This image format is not supported in your browser.');
    }catch(error){
      if(/^This image (file )?is too large/.test(error.message)||/connection/i.test(error.message))throw error;
      throw Error('This image format could not be opened. Try another picture.');
    }
  }
  const width=Number(opened.image.naturalWidth||opened.image.width);
  const height=Number(opened.image.naturalHeight||opened.image.height);
  if(!width||!height||width*height>maxPixels||width>10000||height>10000){
    opened.release();throw Error('This image is too large. Choose a smaller one.');
  }
  return {image:opened.image,width,height,release:opened.release};
}
