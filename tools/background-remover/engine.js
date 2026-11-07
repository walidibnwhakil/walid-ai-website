import { applyMatte, fillEnclosedHoles, pasteAlpha, pickTiles, refineAlpha, subjectCrop } from './refine.js?v=20261107-bg4';

// BiRefNet lite weights are MIT (Peng Zheng; browser exports by wonfy and Studio Ludens).
// RMBG-1.4 is not used: those weights are non-commercial, and this site runs AdSense.
// @imgly/background-removal is AGPL-3.0, so it is not used either.
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2';
const MAX_PIXELS = 16_000_000;

const MODEL_1024 = {
  tier: '1024',
  id: 'wonfy/BiRefNet_lite-ONNX-webgpu',
  revision: 'c40eaa22fb1af9edcf75c7b79d25ed8a8e901140',
  device: 'webgpu',
  dtype: 'fp32',
  model_file_name: 'model_fp16',
};

const MODEL_512 = {
  tier: '512',
  id: 'studioludens/birefnet-lite-512',
  revision: '962e67969ec6acec9c19fab76acee4f5e22e990c',
  dtype: 'fp16',
};

let transformersPromise = null;
let session = null;
let forceWasm = false;

function skip1024() {
  try { return sessionStorage.getItem('walid-bg-skip-1024') === '1'; }
  catch { return false; }
}

function rememberSkip1024() {
  try { sessionStorage.setItem('walid-bg-skip-1024', '1'); }
  catch { /* session storage can be blocked; the in-memory session is enough */ }
}

async function hasWebGPU() {
  if (forceWasm || !navigator.gpu?.requestAdapter) return false;
  try { return !!(await navigator.gpu.requestAdapter()); }
  catch { return false; }
}

async function webgpuSupportsFp16() {
  if (!navigator.gpu?.requestAdapter) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!(adapter && adapter.features.has('shader-f16'));
  } catch { return false; }
}

function progressText(update) {
  if (!update) return '';
  if (update.status === 'progress_total' || update.status === 'progress') {
    const pct = Math.max(0, Math.min(100, Math.round(Number(update.progress) || 0)));
    return `Downloading the background model… ${pct}%`;
  }
  if (update.status === 'initiate' || update.status === 'download') return 'Downloading the background model…';
  return '';
}

async function loadTransformers() {
  if (!transformersPromise) {
    transformersPromise = import(TRANSFORMERS_URL).then(mod => {
      mod.env.allowLocalModels = false;
      mod.env.useBrowserCache = true;
      const wasm = mod.env.backends?.onnx?.wasm;
      if (wasm) wasm.numThreads = 1;
      return mod;
    }).catch(error => {
      transformersPromise = null;
      throw error;
    });
  }
  return transformersPromise;
}

async function loadSpec(mod, spec, onStatus) {
  const options = {
    device: spec.device,
    dtype: spec.dtype,
    revision: spec.revision,
    progress_callback: update => {
      const text = progressText(update);
      if (text) onStatus(text);
    },
  };
  if (spec.model_file_name) options.model_file_name = spec.model_file_name;
  onStatus(spec.device === 'webgpu' ? 'Preparing the background model on this GPU…' : 'Preparing the background model…');
  const model = await mod.AutoModel.from_pretrained(spec.id, options);
  const processor = await mod.AutoProcessor.from_pretrained(spec.id, { revision: spec.revision });
  return { ...spec, model, processor, transformers: mod };
}

async function dispose(current) {
  try { await current?.model?.dispose?.(); }
  catch { /* the next session replaces it */ }
}

async function createSession(onStatus) {
  const mod = await loadTransformers();
  const webgpu = await hasWebGPU();
  const fp16 = webgpu && await webgpuSupportsFp16();
  // WebGPU without 16-bit shaders cannot run these graphs, and a 32-bit
  // WebGPU session on a software adapter blocks the page. Use WASM there.
  const attempts = [];
  if (fp16 && !skip1024()) attempts.push(MODEL_1024);
  if (fp16) attempts.push({ ...MODEL_512, device: 'webgpu', dtype: 'fp16' });
  attempts.push({ ...MODEL_512, device: 'wasm', dtype: 'fp16' });
  attempts.push({ ...MODEL_512, device: 'wasm', dtype: 'fp32' });
  let lastError = null;
  for (const spec of attempts) {
    try { return await loadSpec(mod, spec, onStatus); }
    catch (error) {
      lastError = error;
      console.warn(`Background model ${spec.id} ${spec.device} ${spec.dtype} did not load`, error);
      if (spec.tier === '1024') rememberSkip1024();
      if (spec.device === 'webgpu' && spec.tier !== '1024') forceWasm = true;
    }
  }
  throw lastError || new Error('The background model could not be loaded.');
}

function firstTensor(result) {
  if (!result || typeof result !== 'object') return result;
  if (result.data && (result.dims || result.shape)) return result;
  for (const value of Object.values(result)) {
    if (value?.data && (value.dims || value.shape)) return value;
    if (Array.isArray(value) && value[0]?.data) return value[0];
  }
  return null;
}

function tensorToAlpha(tensor) {
  const data = tensor?.data ?? tensor;
  const dims = [...(tensor?.dims ?? tensor?.shape ?? [])];
  const height = dims.length >= 2 ? dims[dims.length - 2] : Math.round(Math.sqrt(data.length));
  const width = dims.length >= 2 ? dims[dims.length - 1] : height;
  const count = width * height;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < count; i++) {
    const value = data[i];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const logits = min < -0.001 || max > 1.001;
  const alpha = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const value = logits ? 1 / (1 + Math.exp(-data[i])) : data[i];
    alpha[i] = value < 0 ? 0 : value > 1 ? 1 : value;
  }
  return { alpha, width, height };
}

async function inferAlpha(current, canvas) {
  const image = current.transformers.RawImage.fromCanvas(canvas);
  const processed = await current.processor(image);
  const pixelValues = processed.pixel_values ?? processed;
  let result;
  try {
    result = await current.model({ input_image: pixelValues });
  } catch (error) {
    if (!/input_image|missing|required/i.test(String(error?.message || error))) throw error;
    result = await current.model(pixelValues);
  }
  const tensor = result?.logits ?? result?.output_image ?? result?.output ?? firstTensor(result);
  if (!tensor?.data) throw new Error('The background model returned no mask.');
  return tensorToAlpha(tensor);
}

function workingCanvas(source) {
  const width = source.width;
  const height = source.height;
  if (width * height <= MAX_PIXELS) return source;
  const scale = Math.sqrt(MAX_PIXELS / (width * height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function cropOf(source, rect) {
  const canvas = document.createElement('canvas');
  canvas.width = rect.w;
  canvas.height = rect.h;
  canvas.getContext('2d').drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return canvas;
}

function upsample(alpha, srcW, srcH, dstW, dstH) {
  if (srcW === dstW && srcH === dstH) return alpha;
  const src = document.createElement('canvas');
  src.width = srcW;
  src.height = srcH;
  const srcContext = src.getContext('2d');
  const pixels = srcContext.createImageData(srcW, srcH);
  for (let i = 0; i < alpha.length; i++) {
    const value = Math.round((alpha[i] < 0 ? 0 : alpha[i] > 1 ? 1 : alpha[i]) * 255);
    const p = i * 4;
    pixels.data[p] = value;
    pixels.data[p + 1] = value;
    pixels.data[p + 2] = value;
    pixels.data[p + 3] = 255;
  }
  srcContext.putImageData(pixels, 0, 0);
  const dst = document.createElement('canvas');
  dst.width = dstW;
  dst.height = dstH;
  const dstContext = dst.getContext('2d', { willReadFrequently: true });
  dstContext.imageSmoothingEnabled = true;
  dstContext.imageSmoothingQuality = 'high';
  dstContext.drawImage(src, 0, 0, dstW, dstH);
  const scaled = dstContext.getImageData(0, 0, dstW, dstH).data;
  const out = new Float32Array(dstW * dstH);
  for (let i = 0; i < out.length; i++) out[i] = scaled[i * 4] / 255;
  return out;
}

async function render(current, source, target, onStatus) {
  const work = workingCanvas(source);
  onStatus('Removing the background…');
  const mask = await inferAlpha(current, work);
  let alpha = upsample(mask.alpha, mask.width, mask.height, work.width, work.height);
  if (current.tier === '512') {
    const crop = subjectCrop(alpha, work.width, work.height);
    if (crop) {
      onStatus('Refining the subject…');
      const local = await inferAlpha(current, cropOf(work, crop));
      const localAlpha = upsample(local.alpha, local.width, local.height, crop.w, crop.h);
      const feather = Math.max(8, Math.round(Math.min(crop.w, crop.h) * 0.06));
      pasteAlpha(alpha, work.width, work.height, localAlpha, crop.w, crop, feather, null);
    }
    const longSide = Math.max(work.width, work.height);
    if (longSide >= 900) {
      const tile = Math.round(Math.min(1100, Math.max(640, longSide * 0.55)));
      const tiles = pickTiles(alpha, work.width, work.height, 3, tile);
      for (let index = 0; index < tiles.length; index++) {
        onStatus(`Refining edges (${index + 1} of ${tiles.length})…`);
        const rect = tiles[index];
        const local = await inferAlpha(current, cropOf(work, rect));
        const localAlpha = upsample(local.alpha, local.width, local.height, rect.w, rect.h);
        const feather = Math.max(10, Math.round(Math.min(rect.w, rect.h) * 0.07));
        pasteAlpha(alpha, work.width, work.height, localAlpha, rect.w, rect, feather, null);
      }
    }
    fillEnclosedHoles(alpha, work.width, work.height, 1800);
  }
  onStatus('Cleaning the outline…');
  const image = work.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, work.width, work.height);
  const refined = refineAlpha(alpha, image.data, image.width, image.height);
  const matted = applyMatte(image.data, refined);
  target.width = source.width;
  target.height = source.height;
  const targetContext = target.getContext('2d');
  targetContext.clearRect(0, 0, target.width, target.height);
  if (work.width === source.width && work.height === source.height) {
    targetContext.putImageData(new ImageData(matted, image.width, image.height), 0, 0);
    return;
  }
  const temp = document.createElement('canvas');
  temp.width = image.width;
  temp.height = image.height;
  temp.getContext('2d').putImageData(new ImageData(matted, image.width, image.height), 0, 0);
  targetContext.imageSmoothingEnabled = true;
  targetContext.imageSmoothingQuality = 'high';
  targetContext.drawImage(temp, 0, 0, target.width, target.height);
}

export async function removeBackground(source, target, { onStatus = () => {}, onRuntime = () => {} } = {}) {
  if (!source?.width || !source?.height) throw new Error('Choose an image first.');
  try {
    if (!session) session = await createSession(onStatus);
    onRuntime({ tier: session.tier, device: session.device, id: session.id, revision: session.revision });
    try {
      await render(session, source, target, onStatus);
    } catch (error) {
      console.error(error);
      if (session.tier === '1024') {
        rememberSkip1024();
        await dispose(session);
        session = null;
        onStatus('Switching to the compatible model…');
        session = await createSession(onStatus);
        onRuntime({ tier: session.tier, device: session.device, id: session.id, revision: session.revision });
        await render(session, source, target, onStatus);
        return;
      }
      if (session.device === 'webgpu') {
        forceWasm = true;
        await dispose(session);
        session = null;
        onStatus('Switching to the compatible model…');
        session = await createSession(onStatus);
        onRuntime({ tier: session.tier, device: session.device, id: session.id, revision: session.revision });
        await render(session, source, target, onStatus);
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error(error);
    await dispose(session);
    session = null;
    throw new Error('The background could not be removed. Check the connection and try again.');
  }
}
