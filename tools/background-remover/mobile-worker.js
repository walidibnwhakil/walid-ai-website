// Small general-purpose subject matting in a worker, isolated from the page.
// Model: U²-Netp (Apache-2.0), supplied by BritishWerewolf/U-2-Netp.
// No photo bytes are uploaded to a server; the public ONNX model is fetched locally.
const ORT_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
const MODEL_URL = 'https://huggingface.co/BritishWerewolf/U-2-Netp/resolve/becee72/onnx/model.onnx';
const SIDE = 320;
const MAX_PIXELS = 1_200_000;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
let sessionPromise = null;
let ortPromise = null;

function report(message) { self.postMessage({ type: 'status', text: message }); }
function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
function rgbaToTensor(pixels, width, height) {
  const scale = Math.min(SIDE / width, SIDE / height);
  const fitWidth = Math.max(1, Math.round(width * scale));
  const fitHeight = Math.max(1, Math.round(height * scale));
  const left = Math.floor((SIDE - fitWidth) / 2);
  const top = Math.floor((SIDE - fitHeight) / 2);
  const plane = SIDE * SIDE;
  const input = new Float32Array(plane * 3);
  // Neutral padding avoids introducing an artificial dark object around the photo.
  for (let c = 0; c < 3; c++) input.fill((0.5 - MEAN[c]) / STD[c], c * plane, (c + 1) * plane);
  for (let y = 0; y < fitHeight; y++) {
    const srcY = clamp(Math.round((y + 0.5) * height / fitHeight - 0.5), 0, height - 1);
    for (let x = 0; x < fitWidth; x++) {
      const srcX = clamp(Math.round((x + 0.5) * width / fitWidth - 0.5), 0, width - 1);
      const sourceIndex = (srcY * width + srcX) * 4;
      const targetIndex = (top + y) * SIDE + (left + x);
      for (let c = 0; c < 3; c++) input[c * plane + targetIndex] =
        (pixels[sourceIndex + c] / 255 - MEAN[c]) / STD[c];
    }
  }
  return { input, fitWidth, fitHeight, left, top };
}
function compositeMask(pixels, width, height, mask, fit) {
  const plane = SIDE * SIDE;
  if (!mask || mask.length < plane) throw Error('The AI model returned an invalid mask.');
  // rembg U²-Net matting normalizes the saliency mask using its actual range.
  let minimum = Infinity, maximum = -Infinity;
  for (let y = 0; y < fit.fitHeight; y++) {
    const start = (fit.top + y) * SIDE + fit.left;
    for (let x = 0; x < fit.fitWidth; x++) {
      const value = Number(mask[start + x]);
      if (!Number.isFinite(value)) throw Error('The AI model returned invalid pixels.');
      minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
    }
  }
  if (maximum - minimum < 0.0001) throw Error('Could not separate the subject from the background.');
  const range = maximum - minimum;
  const normalized = new Float32Array(plane);
  for (let i = 0; i < plane; i++) normalized[i] = clamp((mask[i] - minimum) / range, 0, 1);
  const output = new Uint8ClampedArray(pixels.length);
  output.set(pixels);
  let transparent = 0, solid = 0;
  for (let y = 0; y < height; y++) {
    const scaledY = fit.top + (y + 0.5) * fit.fitHeight / height - 0.5;
    const y0 = clamp(Math.floor(scaledY), fit.top, fit.top + fit.fitHeight - 1);
    const y1 = clamp(y0 + 1, fit.top, fit.top + fit.fitHeight - 1);
    const wy = clamp(scaledY - y0, 0, 1);
    for (let x = 0; x < width; x++) {
      const scaledX = fit.left + (x + 0.5) * fit.fitWidth / width - 0.5;
      const x0 = clamp(Math.floor(scaledX), fit.left, fit.left + fit.fitWidth - 1);
      const x1 = clamp(x0 + 1, fit.left, fit.left + fit.fitWidth - 1);
      const wx = clamp(scaledX - x0, 0, 1);
      const topA = normalized[y0 * SIDE + x0] * (1 - wx) + normalized[y0 * SIDE + x1] * wx;
      const bottomA = normalized[y1 * SIDE + x0] * (1 - wx) + normalized[y1 * SIDE + x1] * wx;
      const confidence = clamp(topA * (1 - wy) + bottomA * wy, 0, 1);
      // Soft edges reduce halos while keeping antialiasing; no white fill is added.
      const matte = clamp((confidence - 0.035) / 0.93, 0, 1);
      const eased = matte * matte * (3 - 2 * matte);
      const index = (y * width + x) * 4 + 3;
      output[index] = Math.round(pixels[index] * eased);
      if (output[index] < 24) transparent++;
      if (output[index] > 220) solid++;
    }
  }
  // Do not ever label a fully opaque (or fully erased) picture as "background removed".
  const count = width * height;
  if (transparent < count * 0.005 || solid < count * 0.005)
    throw Error('Background could not be separated cleanly. Try an image with a clear subject.');
  return output;
}

async function openModel() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      report('Preparing background removal…');
      if (!ortPromise) ortPromise = import(ORT_BASE + 'ort.wasm.min.mjs');
      const ort = await ortPromise;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = ORT_BASE;
      const response = await fetch(MODEL_URL, { mode: 'cors', cache: 'force-cache' });
      if (!response.ok) throw Error('The image-processing model could not be downloaded.');
      const weights = await response.arrayBuffer();
      report('Starting background removal…');
      const session = await ort.InferenceSession.create(weights, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        intraOpNumThreads: 1,
        interOpNumThreads: 1
      });
      return { ort, session };
    })().catch(error => { sessionPromise = null; throw error; });
  }
  return sessionPromise;
}

self.onmessage = async event => {
  if (event.data?.type !== 'remove') return;
  const { width, height, pixels } = event.data;
  try {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        width * height > MAX_PIXELS ||
        !(pixels instanceof ArrayBuffer) || pixels.byteLength !== width * height * 4)
      throw Error('The selected image is too large or invalid.');
    const source = new Uint8ClampedArray(pixels);
    const { ort, session } = await openModel();
    report('Removing background…');
    const fit = rgbaToTensor(source, width, height);
    const feed = { [session.inputNames[0]]: new ort.Tensor('float32', fit.input, [1, 3, SIDE, SIDE]) };
    const result = await session.run(feed);
    const maskTensor = result[session.outputNames[0]];
    if (!maskTensor?.data) throw Error('The model returned no background mask.');
    const output = compositeMask(source, width, height, maskTensor.data, fit);
    self.postMessage({ type: 'complete', width, height, pixels: output.buffer }, [output.buffer]);
  } catch (error) {
    self.postMessage({ type: 'error', message: String(error?.message || 'Background removal failed.') });
  }
};
