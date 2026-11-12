import { PDFDocument, degrees, rgb, BlendMode } from "https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.3.2/+esm";

const BENGALI_FONT_URL = "/fonts/NotoSansBengali-Regular.ttf";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const tool = params.get("tool") || "edit";
const MAX_BYTES = 80 * 1024 * 1024;
const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

const state = {
  tool,
  bytes: null,
  password: "",
  encrypted: false,
  fileName: "",
  doc: null,
  pages: [],
  index: 0,
  view: null,
  seq: 0,
  selectedId: null,
  editTool: "text",
  renderToken: 0,
  renderTask: null,
  liveUrls: [],
  images: [],
  signature: null,
  drag: null
};

const panels = {
  edit: "panelEdit",
  organize: "panelOrganize",
  numbers: "panelNumbers",
  watermark: "panelWatermark",
  sign: "panelSign",
  protect: "panelProtect",
  image: "panelImage",
  compress: "panelCompress",
  ocr: "panelOcr"
};

function setStatus(text) {
  $("status").textContent = text || "";
}

function notifyEditor(active) {
  if (window.parent === window) return;
  window.parent.postMessage({ type: "walid-tool-editor-state", active: !!active }, location.origin);
  window.parent.postMessage({ type: "walid-tool-frame-height", height: document.documentElement.scrollHeight }, location.origin);
}

function walidName(name) {
  const clean = String(name || "document.pdf");
  return clean.startsWith("Walid AI_") ? clean : "Walid AI_" + clean;
}

function baseName() {
  const stem = (state.fileName || "document").replace(/\.[^.]+$/, "");
  const safe = stem.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "");
  return safe || "document";
}

function downloadBlob(blob, filename) {
  const link = $("download");
  if (link.href) URL.revokeObjectURL(link.href);
  link.href = URL.createObjectURL(blob);
  link.download = walidName(filename);
  link.textContent = "Download " + link.download;
  link.hidden = false;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

async function ensureFont() {
  if (state.fontReady) return;
  const face = new FontFace("Noto Sans Bengali", "url(/fonts/NotoSansBengali-Regular.ttf)");
  await face.load();
  document.fonts.add(face);
  await document.fonts.load('22px "Noto Sans Bengali"');
  state.fontReady = true;
}

function fontSpec(size) {
  return `${size}px "Noto Sans Bengali", "Times New Roman", Times, serif`;
}

function totalRotation(page) {
  return ((page.baseRotation || 0) + (page.rotation || 0) + 360) % 360;
}

function visualRectToPdf(view, x, y, w, h) {
  const [x1, y1] = view.convertToPdfPoint(x, y);
  const [x2, y2] = view.convertToPdfPoint(x + w, y + h);
  return {
    left: Math.min(x1, x2),
    bottom: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  };
}

function rotateCanvas(source, clockwise) {
  const deg = ((clockwise % 360) + 360) % 360;
  if (!deg) return source;
  const swap = deg === 90 || deg === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? source.height : source.width;
  canvas.height = swap ? source.width : source.height;
  const context = canvas.getContext("2d");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((deg * Math.PI) / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(Error("The page image could not be created."))), type, quality);
  });
}

async function canvasPng(canvas) {
  return new Uint8Array(await (await canvasBlob(canvas, "image/png")).arrayBuffer());
}

function measureWidth(text, fontSize) {
  const canvas = measureWidth.canvas || (measureWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = fontSpec(fontSize);
  return context.measureText(text).width;
}

function wrapLines(text, fontSize, maxWidth) {
  const lines = [];
  for (const paragraph of String(text || "").split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    const tokens = paragraph.split(/(\s+)/).flatMap((token) => (measureWidth(token, fontSize) <= maxWidth ? [token] : [...token]));
    for (const token of tokens) {
      const trial = line + token;
      if (line && measureWidth(trial, fontSize) > maxWidth) {
        lines.push(line.replace(/\s+$/g, ""));
        line = token.trimStart();
      } else line = trial;
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
}

function renderLabel(ann, raster = 2) {
  const pad = ann.type === "note" ? 8 : 2;
  const lines = wrapLines(ann.text, ann.fontSize, Math.max(8, ann.w - pad * 2));
  const lineHeight = ann.fontSize * 1.35;
  const height = Math.max(ann.h, pad * 2 + lines.length * lineHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(ann.w * raster));
  canvas.height = Math.max(1, Math.round(height * raster));
  const context = canvas.getContext("2d");
  context.scale(raster, raster);
  if (ann.type === "note") {
    context.fillStyle = "#fff4a8";
    context.fillRect(0, 0, ann.w, height);
    context.strokeStyle = "#e2c85a";
    context.strokeRect(0.5, 0.5, ann.w - 1, height - 1);
  }
  context.font = fontSpec(ann.fontSize);
  context.fillStyle = ann.color || "#14241f";
  context.textBaseline = "top";
  lines.forEach((line, index) => context.fillText(line, pad, pad + index * lineHeight));
  return { canvas, height };
}

function makeWatermarkCanvas(text, fontSize, angle, color) {
  const width = Math.max(1, measureWidth(text, fontSize));
  const height = fontSize * 1.4;
  const rad = (angle * Math.PI) / 180;
  const boxW = Math.ceil(width * Math.abs(Math.cos(rad)) + height * Math.abs(Math.sin(rad)) + 8);
  const boxH = Math.ceil(width * Math.abs(Math.sin(rad)) + height * Math.abs(Math.cos(rad)) + 8);
  const canvas = document.createElement("canvas");
  canvas.width = boxW;
  canvas.height = boxH;
  const context = canvas.getContext("2d");
  context.translate(boxW / 2, boxH / 2);
  context.rotate(rad);
  context.font = fontSpec(fontSize);
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 0, 0);
  return canvas;
}

function currentPage() {
  return state.pages[state.index];
}

async function viewportFor(page, scale = 1) {
  const pdfPage = await state.doc.getPage(page.sourceIndex + 1);
  return { pdfPage, view: pdfPage.getViewport({ scale, rotation: totalRotation(page) }) };
}

function revokeLiveUrls() {
  const previous = state.liveUrls;
  state.liveUrls = [];
  requestAnimationFrame(() => previous.forEach((url) => URL.revokeObjectURL(url)));
}

function objectUrl(bytes, mime) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime || "image/png" }));
  state.liveUrls.push(url);
  return url;
}

function renderAnnotations() {
  revokeLiveUrls();
  const overlay = $("overlay");
  const view = state.view;
  overlay.replaceChildren();
  if (!view) return;
  const page = currentPage();
  for (const ann of page?.annotations || []) {
    const el = document.createElement("div");
    const kind = ann.type === "ink" ? "ink" : ann.type === "highlight" ? "highlight" : ann.type === "note" ? "note" : ann.type === "text" ? "text" : "image";
    el.className = "ann ann-" + kind;
    if (ann.id === state.selectedId) el.classList.add("selected");
    el.style.left = (ann.x / view.width) * 100 + "%";
    el.style.top = (ann.y / view.height) * 100 + "%";
    el.style.width = (ann.w / view.width) * 100 + "%";
    el.style.height = (ann.h / view.height) * 100 + "%";
    if (ann.type === "text" || ann.type === "note") {
      el.contentEditable = "true";
      el.dataset.placeholder = ann.type === "note" ? "Note" : "বাংলা লিখুন";
      el.textContent = ann.text || "";
      el.style.fontSize = (ann.fontSize * ($("stage").clientWidth / view.width)) + "px";
      el.style.color = ann.color || "#14241f";
      el.addEventListener("input", () => {
        ann.text = el.innerText || "";
        const lines = wrapLines(ann.text || " ", ann.fontSize, Math.max(8, ann.w - (ann.type === "note" ? 16 : 4)));
        ann.h = Math.max(ann.fontSize * 1.4, (ann.type === "note" ? 16 : 4) + lines.length * ann.fontSize * 1.35);
        el.style.height = (ann.h / view.height) * 100 + "%";
      });
    } else if (ann.type === "image") {
      const img = document.createElement("img");
      img.alt = "";
      img.src = objectUrl(ann.bytes, ann.mime || "image/png");
      el.style.opacity = String(ann.opacity ?? 1);
      el.append(img);
    } else if (ann.type === "ink") {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${ann.w} ${ann.h}`);
      svg.setAttribute("preserveAspectRatio", "none");
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke", ann.color || "#14241f");
      poly.setAttribute("stroke-width", String(ann.stroke || 2));
      poly.setAttribute("stroke-linecap", "round");
      poly.setAttribute("stroke-linejoin", "round");
      poly.setAttribute("points", ann.points.map((point) => `${point.x - ann.x},${point.y - ann.y}`).join(" "));
      svg.append(poly);
      el.append(svg);
    }
    if (ann.id === state.selectedId) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "ann-delete";
      remove.setAttribute("aria-label", "Remove");
      remove.textContent = "×";
      remove.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        event.preventDefault();
        removeAnnotation(ann.id);
      });
      el.append(remove);
      if (ann.type !== "ink") {
        const handle = document.createElement("span");
        handle.className = "resize";
        handle.addEventListener("pointerdown", (event) => startResize(event, ann));
        el.append(handle);
      }
    }
    el.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".resize, .ann-delete")) return;
      event.stopPropagation();
      const already = state.selectedId === ann.id;
      state.selectedId = ann.id;
      if (event.target.isContentEditable) {
        if (!already) {
          renderAnnotations();
          const selected = $("overlay").querySelector(".ann.selected");
          if (selected?.isContentEditable) selected.focus();
        }
        return;
      }
      startDrag(event, ann);
    });
    overlay.append(el);
  }
}

function removeAnnotation(id) {
  const page = currentPage();
  if (!page) return;
  page.annotations = page.annotations.filter((ann) => ann.id !== id);
  if (state.selectedId === id) state.selectedId = null;
  renderAnnotations();
}

function pointerPos(event) {
  const rect = $("stage").getBoundingClientRect();
  const view = state.view;
  return {
    x: ((event.clientX - rect.left) / rect.width) * view.width,
    y: ((event.clientY - rect.top) / rect.height) * view.height
  };
}

function startDrag(event, ann) {
  event.preventDefault();
  const start = pointerPos(event);
  state.drag = {
    kind: "move",
    ann,
    originX: ann.x,
    originY: ann.y,
    grabX: start.x,
    grabY: start.y,
    points: ann.points?.map((point) => ({ ...point }))
  };
  $("stage").setPointerCapture?.(event.pointerId);
}

function startResize(event, ann) {
  event.stopPropagation();
  event.preventDefault();
  const start = pointerPos(event);
  state.drag = { kind: "resize", ann, x: start.x, y: start.y, w: ann.w, h: ann.h };
}

function addAnnotation(partial) {
  const ann = { id: "a" + (++state.seq), ...partial };
  currentPage().annotations.push(ann);
  state.selectedId = ann.id;
  renderAnnotations();
  return ann;
}

async function renderPage() {
  const page = currentPage();
  if (!page || !state.doc) return;
  const token = ++state.renderToken;
  state.renderTask?.cancel?.();
  const { pdfPage, view } = await viewportFor(page, 1);
  if (token !== state.renderToken) return;
  state.view = view;
  const stage = $("stage");
  stage.hidden = false;
  stage.dataset.viewWidth = String(view.width);
  stage.dataset.viewHeight = String(view.height);
  const cssWidth = stage.clientWidth || 640;
  const scale = Math.min(2, (cssWidth * (window.devicePixelRatio || 1)) / view.width);
  const renderView = pdfPage.getViewport({ scale: Math.max(scale, 0.2), rotation: totalRotation(page) });
  const canvas = $("pageCanvas");
  canvas.width = Math.ceil(renderView.width);
  canvas.height = Math.ceil(renderView.height);
  const task = pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport: renderView });
  state.renderTask = task;
  try {
    await task.promise;
  } catch (error) {
    if (error?.name === "RenderingCancelledException") return;
    throw error;
  }
  if (token !== state.renderToken) return;
  $("pageLabel").textContent = (state.index + 1) + " / " + state.pages.length;
  $("pageBar").hidden = false;
  renderAnnotations();
  notifyEditor(true);
}

function boundsOf(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(1, Math.max(...xs) - Math.min(...xs)),
    h: Math.max(1, Math.max(...ys) - Math.min(...ys))
  };
}

function onOverlayPointerDown(event) {
  if (!state.view || event.target !== $("overlay")) return;
  const point = pointerPos(event);
  if (state.editTool === "select" || tool === "sign") {
    state.selectedId = null;
    renderAnnotations();
    return;
  }
  if (state.editTool === "text" || state.editTool === "note") {
    const fontSize = Number($("fontSize").value) || 22;
    addAnnotation({
      type: state.editTool,
      text: "",
      fontSize,
      color: $("textColor").value,
      x: point.x,
      y: point.y,
      w: state.editTool === "note" ? 160 : 180,
      h: state.editTool === "note" ? 90 : fontSize * 1.6
    });
    $("overlay").querySelector(".ann.selected")?.focus();
    return;
  }
  if (state.editTool === "image") {
    if (!state.pendingImage) {
      $("placeImage").click();
      state.placeAt = point;
      setStatus("Choose an image, then it is placed on the page.");
      return;
    }
    placePendingImage(point);
    return;
  }
  if (state.editTool === "highlight" || state.editTool === "ink") {
    state.drag = { kind: state.editTool, start: point, points: [point] };
    $("stage").setPointerCapture?.(event.pointerId);
  }
}

function onPointerMove(event) {
  const drag = state.drag;
  if (!drag || !state.view) return;
  const point = pointerPos(event);
  if (drag.kind === "move") {
    const view = state.view;
    const x = Math.max(0, Math.min(view.width - drag.ann.w, drag.originX + (point.x - drag.grabX)));
    const y = Math.max(0, Math.min(view.height - drag.ann.h, drag.originY + (point.y - drag.grabY)));
    drag.ann.x = x;
    drag.ann.y = y;
    if (drag.ann.points && drag.points) {
      drag.ann.points = drag.points.map((item) => ({ x: item.x + (x - drag.originX), y: item.y + (y - drag.originY) }));
    }
    renderAnnotations();
  } else if (drag.kind === "resize") {
    drag.ann.w = Math.max(12, drag.w + (point.x - drag.x));
    drag.ann.h = Math.max(12, drag.h + (point.y - drag.y));
    renderAnnotations();
  } else if (drag.kind === "highlight") {
    let ghost = $("overlay").querySelector(".ghost");
    if (!ghost) {
      ghost = document.createElement("div");
      ghost.className = "ghost";
      $("overlay").append(ghost);
    }
    const x = Math.min(drag.start.x, point.x);
    const y = Math.min(drag.start.y, point.y);
    ghost.style.left = (x / state.view.width) * 100 + "%";
    ghost.style.top = (y / state.view.height) * 100 + "%";
    ghost.style.width = (Math.abs(point.x - drag.start.x) / state.view.width) * 100 + "%";
    ghost.style.height = (Math.abs(point.y - drag.start.y) / state.view.height) * 100 + "%";
  } else if (drag.kind === "ink") {
    drag.points.push(point);
    const page = currentPage();
    const temp = {
      id: "temp",
      type: "ink",
      color: $("inkColor").value,
      stroke: Number($("inkWidth").value) || 2,
      points: drag.points,
      ...boundsOf(drag.points)
    };
    page.annotations.push(temp);
    renderAnnotations();
    page.annotations.pop();
  }
}

function onPointerUp(event) {
  const drag = state.drag;
  if (!drag) return;
  state.drag = null;
  if (drag.kind === "highlight") {
    const point = pointerPos(event);
    const x = Math.min(drag.start.x, point.x);
    const y = Math.min(drag.start.y, point.y);
    const w = Math.abs(point.x - drag.start.x);
    const h = Math.abs(point.y - drag.start.y);
    if (w > 4 && h > 4) addAnnotation({ type: "highlight", x, y, w, h });
    else renderAnnotations();
  } else if (drag.kind === "ink" && drag.points.length > 1) {
    addAnnotation({
      type: "ink",
      color: $("inkColor").value,
      stroke: Number($("inkWidth").value) || 2,
      points: drag.points,
      ...boundsOf(drag.points)
    });
  }
}

async function placePendingImage(point) {
  const image = state.pendingImage;
  if (!image || !state.view) return;
  const maxW = Math.min(state.view.width * 0.45, 260);
  const scale = maxW / image.width;
  addAnnotation({
    type: "image",
    bytes: image.bytes,
    mime: image.mime,
    x: point?.x ?? (state.view.width - image.width * scale) / 2,
    y: point?.y ?? 48,
    w: image.width * scale,
    h: image.height * scale,
    opacity: 1
  });
  state.pendingImage = null;
  setStatus("");
}

async function loadImageFile(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  if (mime === "image/jpeg") {
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const blob = await canvasBlob(canvas, mime, 0.92);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime, width: canvas.width, height: canvas.height, name: file.name };
}

async function retargetPage(page, oldView, newView) {
  for (const ann of page.annotations) {
    const map = (x, y) => {
      const [px, py] = oldView.convertToPdfPoint(x, y);
      const [vx, vy] = newView.convertToViewportPoint(px, py);
      return { x: vx, y: vy };
    };
    if (ann.points) {
      ann.points = ann.points.map((point) => map(point.x, point.y));
      Object.assign(ann, boundsOf(ann.points));
    } else {
      const corners = [map(ann.x, ann.y), map(ann.x + ann.w, ann.y), map(ann.x, ann.y + ann.h), map(ann.x + ann.w, ann.y + ann.h)];
      const xs = corners.map((corner) => corner.x);
      const ys = corners.map((corner) => corner.y);
      ann.x = Math.min(...xs);
      ann.y = Math.min(...ys);
      ann.w = Math.max(8, Math.max(...xs) - ann.x);
      ann.h = Math.max(8, Math.max(...ys) - ann.y);
    }
  }
}

async function rotateBy(delta) {
  const page = currentPage();
  if (!page) return;
  const old = await viewportFor(page, 1);
  page.rotation = ((page.rotation || 0) + delta + 360) % 360;
  const next = await viewportFor(page, 1);
  await retargetPage(page, old.view, next.view);
  if (tool !== "organize") await renderPage();
}

function movePage(from, to) {
  if (from === to || from < 0 || to < 0 || from >= state.pages.length || to >= state.pages.length) return;
  const [page] = state.pages.splice(from, 1);
  state.pages.splice(to, 0, page);
  state.index = to;
}

async function deleteCurrentPage() {
  if (state.pages.length < 2) {
    setStatus("A PDF needs at least one page.");
    return;
  }
  state.pages.splice(state.index, 1);
  state.index = Math.min(state.index, state.pages.length - 1);
  if (tool === "organize") renderOrganize();
  else await renderPage();
}

function hexRgb(hex) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const num = Number.parseInt(full, 16);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

async function embedBengaliFont(pdfDoc) {
  if (pdfDoc.__walidBengaliFont) return pdfDoc.__walidBengaliFont;
  const response = await fetch(BENGALI_FONT_URL, { cache: "force-cache" });
  if (!response.ok) throw new Error("Bengali font could not be loaded.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  const fontkitModule = await import("https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm");
  const fontkit = fontkitModule.default || fontkitModule;
  pdfDoc.registerFontkit(fontkit);
  pdfDoc.__walidBengaliFont = await pdfDoc.embedFont(bytes, { subset: true });
  return pdfDoc.__walidBengaliFont;
}

async function drawTextAnnotation(pdfDoc, page, view, ann) {
  const font = await embedBengaliFont(pdfDoc);
  const pad = ann.type === "note" ? 8 : 2;
  const lines = wrapLines(ann.text, ann.fontSize, Math.max(8, ann.w - pad * 2));
  const lineHeight = ann.fontSize * 1.35;
  const boxHeight = Math.max(ann.h, pad * 2 + lines.length * lineHeight);
  const box = visualRectToPdf(view, ann.x, ann.y, ann.w, boxHeight);
  if (ann.type === "note") {
    page.drawRectangle({
      x: box.left,
      y: box.bottom,
      width: box.width,
      height: box.height,
      color: rgb(1, 0.956, 0.66),
      borderColor: rgb(0.886, 0.784, 0.353),
      borderWidth: 0.8
    });
  }
  for (let index = 0; index < lines.length; index += 1) {
    const [x, baseline] = view.convertToPdfPoint(ann.x + pad, ann.y + pad + index * lineHeight + ann.fontSize);
    page.drawText(lines[index], {
      x,
      y: baseline - ann.fontSize * 0.18,
      size: ann.fontSize,
      font,
      color: hexRgb(ann.color || "#14241f"),
      opacity: ann.opacity ?? 1
    });
  }
  return true;
}

async function drawAnnotation(pdfDoc, page, view, ann, rotation) {
  if ((ann.type === "text" || ann.type === "note") && !String(ann.text || "").trim()) return;
  if (ann.type === "highlight") {
    const box = visualRectToPdf(view, ann.x, ann.y, ann.w, ann.h);
    page.drawRectangle({
      x: box.left,
      y: box.bottom,
      width: box.width,
      height: box.height,
      color: rgb(1, 0.9, 0.2),
      opacity: 0.45,
      blendMode: BlendMode.Multiply
    });
    return;
  }
  if (ann.type === "ink") {
    const color = hexRgb(ann.color || "#14241f");
    for (let index = 1; index < ann.points.length; index += 1) {
      const [x1, y1] = view.convertToPdfPoint(ann.points[index - 1].x, ann.points[index - 1].y);
      const [x2, y2] = view.convertToPdfPoint(ann.points[index].x, ann.points[index].y);
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: ann.stroke || 2, color });
    }
    return;
  }
  if (ann.type === "text" || ann.type === "note") {
    try {
      await drawTextAnnotation(pdfDoc, page, view, ann);
      return;
    } catch (error) {
      console.warn("Selectable Bengali export unavailable; using raster fallback.", error);
    }
  }
  let canvas;
  let boxHeight = ann.h;
  if (ann.type === "text" || ann.type === "note") {
    const rendered = renderLabel(ann);
    canvas = rendered.canvas;
    boxHeight = rendered.height;
    ann.h = rendered.height;
  } else {
    const bitmap = await createImageBitmap(new Blob([ann.bytes], { type: ann.mime || "image/png" }));
    canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    bitmap.close?.();
  }
  const png = await canvasPng(rotateCanvas(canvas, (360 - rotation) % 360));
  const image = await pdfDoc.embedPng(png);
  const box = visualRectToPdf(view, ann.x, ann.y, ann.w, boxHeight);
  page.drawImage(image, {
    x: box.left,
    y: box.bottom,
    width: box.width,
    height: box.height,
    opacity: ann.opacity ?? 1
  });
}

async function buildEditedPdf() {
  await ensureFont();
  const src = await PDFDocument.load(state.bytes.slice(0), state.password ? { password: state.password } : {});
  const out = await PDFDocument.create();
  for (const info of state.pages) {
    const [copied] = await out.copyPages(src, [info.sourceIndex]);
    const page = out.addPage(copied);
    const rotation = totalRotation(info);
    page.setRotation(degrees(rotation));
    if (!info.annotations.length) continue;
    const { view } = await viewportFor(info, 1);
    for (const ann of info.annotations) await drawAnnotation(out, page, view, ann, rotation);
  }
  return out.save();
}

async function saveEdited(suffix) {
  if (!state.bytes || !state.pages.length) {
    setStatus("Choose a PDF file first.");
    return;
  }
  setStatus("Preparing the PDF…");
  const bytes = await buildEditedPdf();
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), baseName() + suffix + ".pdf");
  setStatus("Done." + (state.encrypted ? " The download is not password protected." : ""));
}

function bengaliDigits(value) {
  return String(value).replace(/\d/g, (digit) => BENGALI_DIGITS[digit]);
}

async function applyNumbers() {
  if (!state.bytes || !state.pages.length) {
    setStatus("Choose a PDF file first.");
    return;
  }
  await ensureFont();
  const start = Math.max(1, Number($("numberStart").value) || 1);
  const size = Math.min(48, Math.max(8, Number($("numberSize").value) || 12));
  const skip = $("numberSkip").checked;
  const bengali = $("numberBengali").checked;
  const position = $("numberPosition").value;
  let count = 0;
  for (let index = 0; index < state.pages.length; index += 1) {
    if (skip && index === 0) continue;
    const number = bengali ? bengaliDigits(start + count) : String(start + count);
    count += 1;
    state.pages[index].annotations = state.pages[index].annotations.filter((ann) => ann.kind !== "number");
    const { view } = await viewportFor(state.pages[index], 1);
    const width = Math.max(size, measureWidth(number, size) + 4);
    const height = size * 1.5;
    const margin = Math.min(36, view.width * 0.06, view.height * 0.06);
    let x = (view.width - width) / 2;
    let y = view.height - height - margin;
    if (position.endsWith("right")) x = view.width - width - margin;
    if (position.endsWith("left")) x = margin;
    if (position.startsWith("top")) y = margin;
    state.pages[index].annotations.push({
      id: "n" + index,
      kind: "number",
      type: "text",
      text: number,
      fontSize: size,
      color: "#202326",
      x, y, w: width, h: height
    });
  }
  await saveEdited("-numbered");
}

async function applyWatermark() {
  if (!state.bytes || !state.pages.length) {
    setStatus("Choose a PDF file first.");
    return;
  }
  await ensureFont();
  const text = $("watermarkText").value.trim();
  if (!text) {
    setStatus("Enter the watermark text.");
    return;
  }
  const opacity = (Number($("watermarkOpacity").value) || 18) / 100;
  const angle = Number($("watermarkAngle").value) || 0;
  const tile = $("watermarkTile").checked;
  for (const info of state.pages) {
    const { view } = await viewportFor(info, 1);
    const fontSize = Math.max(18, Math.min(72, view.width / 12));
    const canvas = makeWatermarkCanvas(text, fontSize, angle, "#006a4e");
    const scale = tile ? 1 : Math.min(1, (view.width * 0.85) / canvas.width, (view.height * 0.5) / canvas.height);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    const png = await canvasPng(canvas);
    info.annotations = info.annotations.filter((ann) => ann.kind !== "watermark");
    const spots = [];
    if (tile) {
      for (let y = 8; y < view.height; y += h * 1.35) {
        for (let x = 8; x < view.width; x += w * 1.15) spots.push({ x, y });
      }
    } else spots.push({ x: (view.width - w) / 2, y: (view.height - h) / 2 });
    for (const spot of spots) {
      info.annotations.push({
        id: "w" + (++state.seq),
        kind: "watermark",
        type: "image",
        bytes: png,
        mime: "image/png",
        x: spot.x,
        y: spot.y,
        w, h,
        opacity
      });
    }
  }
  await saveEdited("-watermarked");
}

async function openPdf(password) {
  try {
    const doc = await pdfjs.getDocument({ data: state.bytes.slice(0), password: password || undefined }).promise;
    state.doc?.destroy?.();
    state.doc = doc;
    state.password = password || "";
    state.pages = [];
    for (let number = 1; number <= doc.numPages; number += 1) {
      const page = await doc.getPage(number);
      state.pages.push({ sourceIndex: number - 1, baseRotation: page.rotate || 0, rotation: 0, annotations: [] });
    }
    state.index = 0;
    $("passwordBox").hidden = true;
    return true;
  } catch (error) {
    if (error?.name === "PasswordException") {
      $("passwordBox").hidden = false;
      $("passwordHint").textContent = error.code === 2 ? "That password did not open the PDF." : "This PDF asks for a password to open.";
      setStatus("");
      return false;
    }
    throw error;
  }
}

async function detectEncrypted(bytes) {
  try {
    await PDFDocument.load(bytes.slice(0));
    return false;
  } catch (error) {
    if (/encrypt/i.test(error.message || "")) return true;
    throw error;
  }
}

function showWork(label) {
  $("drop").hidden = true;
  $("work").hidden = false;
  $("fileLabel").textContent = label;
  notifyEditor(true);
}

function resetAll() {
  state.renderTask?.cancel?.();
  state.doc?.destroy?.();
  state.doc = null;
  state.bytes = null;
  state.pages = [];
  state.images = [];
  state.signature = null;
  state.password = "";
  state.encrypted = false;
  state.selectedId = null;
  $("file").value = "";
  $("work").hidden = true;
  $("drop").hidden = false;
  $("download").hidden = true;
  $("downloadText").hidden = true;
  $("stage").hidden = true;
  $("organizeGrid").hidden = true;
  $("imageList").hidden = true;
  $("ocrField").hidden = true;
  $("passwordBox").hidden = true;
  setStatus("");
  notifyEditor(false);
}

async function afterPdfOpened() {
  showWork(state.fileName);
  if (tool === "organize") {
    $("stage").hidden = true;
    $("pageBar").hidden = true;
    renderOrganize();
    return;
  }
  if (tool === "edit" || tool === "sign") {
    await renderPage();
    return;
  }
  $("stage").hidden = true;
  $("pageBar").hidden = true;
  setStatus(state.pages.length + " page" + (state.pages.length === 1 ? "" : "s") + " ready.");
}

async function acceptPdfFile(file) {
  if (!file) return;
  if (file.size > MAX_BYTES) {
    setStatus("This file is too large for the browser tool. Try a smaller PDF.");
    return;
  }
  state.fileName = file.name;
  state.bytes = new Uint8Array(await file.arrayBuffer());
  // Encryption detection is only needed by the protect workflow. Running a second
  // full PDF parse here made ordinary tools, including compression, stall before
  // their PDF.js document was ready.
  state.encrypted = tool === "protect" ? await detectEncrypted(state.bytes) : false;
  showWork(file.name);
  if (tool === "protect") {
    $("stage").hidden = true;
    $("pageBar").hidden = true;
    setStatus(state.encrypted ? "This PDF is locked. Use Unlock and the password that opens it." : "This PDF is not locked. Use Lock to add a password.");
    return;
  }
  if (await openPdf("")) await afterPdfOpened();
  else showWork(file.name);
}

function renderOrganize() {
  const grid = $("organizeGrid");
  grid.hidden = false;
  grid.replaceChildren();
  state.pages.forEach((info, index) => {
    const card = document.createElement("article");
    card.className = "page-card";
    card.draggable = true;
    const canvas = document.createElement("canvas");
    const label = document.createElement("span");
    label.className = "thumb-label";
    label.textContent = "Page " + (index + 1);
    const actions = document.createElement("div");
    actions.className = "card-actions";
    for (const [text, delta] of [["Left", -90], ["Right", 90]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "minor";
      button.textContent = text;
      button.addEventListener("click", async () => {
        state.index = index;
        await rotateBy(delta);
        renderOrganize();
      });
      actions.append(button);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "minor";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      state.index = index;
      await deleteCurrentPage();
    });
    actions.append(remove);
    card.append(canvas, label, actions);
    card.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", String(index)));
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("drop-target");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drop-target"));
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("drop-target");
      movePage(Number(event.dataTransfer.getData("text/plain")), index);
      renderOrganize();
    });
    grid.append(card);
    viewportFor(info, 1).then(({ pdfPage, view }) => {
      const thumb = pdfPage.getViewport({ scale: 140 / view.width, rotation: totalRotation(info) });
      canvas.width = Math.ceil(thumb.width);
      canvas.height = Math.ceil(thumb.height);
      return pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport: thumb }).promise;
    }).catch(() => {});
  });
  notifyEditor(true);
}

function renderImageList() {
  const list = $("imageList");
  list.hidden = false;
  list.replaceChildren();
  state.images.forEach((image, index) => {
    const row = document.createElement("div");
    row.className = "image-row";
    const name = document.createElement("strong");
    name.textContent = image.name;
    const buttons = document.createElement("span");
    const up = document.createElement("button");
    up.type = "button";
    up.className = "minor";
    up.textContent = "Up";
    up.disabled = index === 0;
    up.addEventListener("click", () => {
      [state.images[index - 1], state.images[index]] = [state.images[index], state.images[index - 1]];
      renderImageList();
    });
    const down = document.createElement("button");
    down.type = "button";
    down.className = "minor";
    down.textContent = "Down";
    down.disabled = index === state.images.length - 1;
    down.addEventListener("click", () => {
      [state.images[index + 1], state.images[index]] = [state.images[index], state.images[index + 1]];
      renderImageList();
    });
    buttons.append(up, down);
    row.append(name, buttons);
    list.append(row);
  });
}

async function acceptImages(fileList) {
  const list = [...fileList].filter((file) => /^image\/(png|jpeg|webp)$/.test(file.type));
  if (!list.length) {
    setStatus("Choose a PNG, JPG, or WebP image.");
    return;
  }
  setStatus("Reading images…");
  for (const file of list) state.images.push(await loadImageFile(file));
  showWork(state.images.length + " image" + (state.images.length === 1 ? "" : "s"));
  $("stage").hidden = true;
  $("pageBar").hidden = true;
  renderImageList();
  setStatus("");
}

async function createImagePdf() {
  if (!state.images.length) {
    setStatus("Choose an image first.");
    return;
  }
  setStatus("Creating the PDF…");
  const doc = await PDFDocument.create();
  const mode = $("imagePageSize").value;
  for (const image of state.images) {
    const embedded = image.mime === "image/jpeg" ? await doc.embedJpg(image.bytes) : await doc.embedPng(image.bytes);
    let pageW;
    let pageH;
    let drawW;
    let drawH;
    let x;
    let y;
    if (mode === "a4") {
      pageW = 595.28;
      pageH = 841.89;
      const scale = Math.min((pageW - 72) / image.width, (pageH - 72) / image.height);
      drawW = image.width * scale;
      drawH = image.height * scale;
      x = (pageW - drawW) / 2;
      y = (pageH - drawH) / 2;
    } else {
      const scale = Math.min(0.75, 1440 / Math.max(image.width, image.height));
      pageW = drawW = image.width * scale;
      pageH = drawH = image.height * scale;
      x = 0;
      y = 0;
    }
    doc.addPage([pageW, pageH]).drawImage(embedded, { x, y, width: drawW, height: drawH });
  }
  downloadBlob(new Blob([await doc.save()], { type: "application/pdf" }), "images.pdf");
  setStatus("Done.");
}

async function compressPdf() {
  if (!state.doc || !state.pages.length) {
    setStatus("Choose a PDF file first.");
    return;
  }
  const choice = $("compressQuality").value;
  const preset = choice === "small" ? { scale: 0.9, quality: 0.42 } : choice === "clear" ? { scale: 1.6, quality: 0.78 } : { scale: 1.15, quality: 0.58 };
  setStatus("Resampling pages…");
  const doc = await PDFDocument.create();
  for (let index = 0; index < state.pages.length; index += 1) {
    const info = state.pages[index];
    const { pdfPage, view } = await viewportFor(info, 1);
    const scale = Math.min(preset.scale, 1800 / Math.max(view.width, view.height));
    const renderView = pdfPage.getViewport({ scale, rotation: totalRotation(info) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(renderView.width);
    canvas.height = Math.ceil(renderView.height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await pdfPage.render({ canvasContext: context, viewport: renderView }).promise;
    const jpg = await doc.embedJpg(new Uint8Array(await (await canvasBlob(canvas, "image/jpeg", preset.quality)).arrayBuffer()));
    doc.addPage([view.width, view.height]).drawImage(jpg, { x: 0, y: 0, width: view.width, height: view.height });
    setStatus("Resampling page " + (index + 1) + " of " + state.pages.length + "…");
  }
  const bytes = await doc.save();
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), baseName() + "-compressed.pdf");
  const smaller = bytes.length < state.bytes.length;
  setStatus("Original " + formatSize(state.bytes.length) + ". Download " + formatSize(bytes.length) + "." + (smaller ? "" : " The new file is not smaller. Keep the original if you need the smaller one."));
}

async function runOcr() {
  if (!state.doc && !state.images.length) {
    setStatus("Choose a PDF or an image first.");
    return;
  }
  $("ocrField").hidden = false;
  $("ocrOutput").value = "";
  setStatus("Loading Bengali OCR…");
  const tesseractModule = await import("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js");
  const tesseract = tesseractModule.createWorker ? tesseractModule : tesseractModule.default;
  let worker;
  try {
    worker = await tesseract.createWorker("ben+eng", 1, {
      logger: (message) => {
        if (!message?.status) return;
        const progress = typeof message.progress === "number" ? " " + Math.round(message.progress * 100) + "%" : "";
        setStatus(message.status + progress);
      }
    });
    const parts = [];
    if (state.doc) {
      const total = Math.min(state.pages.length, 10);
      for (let index = 0; index < total; index += 1) {
        setStatus("Reading page " + (index + 1) + " of " + total + "…");
        const { pdfPage, view } = await viewportFor(state.pages[index], 1);
        const renderView = pdfPage.getViewport({
          scale: Math.min(2, 1600 / Math.max(view.width, view.height)),
          rotation: totalRotation(state.pages[index])
        });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(renderView.width);
        canvas.height = Math.ceil(renderView.height);
        await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport: renderView }).promise;
        const result = await worker.recognize(canvas);
        parts.push("Page " + (index + 1) + "\n" + (result.data.text || "").trim());
      }
      if (state.pages.length > 10) parts.push("Stopped after 10 pages.");
    } else {
      for (let index = 0; index < state.images.length; index += 1) {
        setStatus("Reading image " + (index + 1) + " of " + state.images.length + "…");
        const result = await worker.recognize(new Blob([state.images[index].bytes], { type: state.images[index].mime }));
        parts.push((state.images[index].name || "Image " + (index + 1)) + "\n" + (result.data.text || "").trim());
      }
    }
    const text = parts.join("\n\n").trim();
    $("ocrOutput").value = text || "No Bengali text was found.";
    const link = $("downloadText");
    if (link.href) URL.revokeObjectURL(link.href);
    link.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    link.download = walidName(baseName() + "-bengali.txt");
    link.textContent = "Download " + link.download;
    link.hidden = !text;
    setStatus(text ? "Done." : "No Bengali text was found.");
  } finally {
    await worker?.terminate();
  }
}

function cropSignature() {
  const pad = $("signPad");
  const context = pad.getContext("2d", { willReadFrequently: true });
  const { width, height } = pad;
  const data = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        found = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (!found) return null;
  minX = Math.max(0, minX - 6);
  minY = Math.max(0, minY - 6);
  maxX = Math.min(width - 1, maxX + 6);
  maxY = Math.min(height - 1, maxY + 6);
  const canvas = document.createElement("canvas");
  canvas.width = maxX - minX + 1;
  canvas.height = maxY - minY + 1;
  canvas.getContext("2d").drawImage(pad, minX, minY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function placeSignature() {
  if (!state.view) {
    setStatus("Choose a PDF file first.");
    return;
  }
  let bytes;
  let width;
  let height;
  if (state.signature?.bytes) {
    ({ bytes, width, height } = state.signature);
  } else {
    const cropped = cropSignature();
    if (!cropped) {
      setStatus("Draw a signature or choose an image first.");
      return;
    }
    bytes = await canvasPng(cropped);
    width = cropped.width;
    height = cropped.height;
  }
  const page = currentPage();
  page.annotations = page.annotations.filter((ann) => !ann.signature);
  const targetW = Math.min(Number($("signWidth").value) || 160, state.view.width * 0.8);
  const targetH = targetW * (height / width);
  addAnnotation({
    type: "image",
    bytes,
    mime: "image/png",
    signature: true,
    x: Math.max(12, state.view.width - targetW - 48),
    y: Math.max(12, state.view.height - targetH - 48),
    w: targetW,
    h: targetH,
    opacity: 1
  });
  setStatus("Drag the signature, then download.");
}

function bindSignPad() {
  const pad = $("signPad");
  const context = pad.getContext("2d");
  let drawing = false;
  let last = null;
  const pos = (event) => {
    const rect = pad.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * pad.width,
      y: ((event.clientY - rect.top) / rect.height) * pad.height
    };
  };
  pad.addEventListener("pointerdown", (event) => {
    drawing = true;
    last = pos(event);
    pad.setPointerCapture(event.pointerId);
  });
  pad.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    const point = pos(event);
    context.strokeStyle = "#14241f";
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(last.x, last.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    last = point;
    state.signature = null;
  });
  pad.addEventListener("pointerup", () => { drawing = false; });
  $("clearSign").addEventListener("click", () => {
    context.clearRect(0, 0, pad.width, pad.height);
    state.signature = null;
  });
}

async function applyProtect() {
  const mode = document.querySelector('input[name="protectMode"]:checked').value;
  const password = $("protectPassword").value;
  if (password.length < 4 || password.length > 120) {
    setStatus("Use a password of 4 to 120 characters.");
    return;
  }
  if (!state.bytes) {
    setStatus("Choose a PDF file first.");
    return;
  }
  setStatus("Working…");
  if (mode === "lock") {
    if ($("protectConfirm").value !== password) {
      setStatus("The passwords do not match.");
      return;
    }
    if (state.encrypted) {
      setStatus("This PDF is already locked. Unlock it first.");
      return;
    }
    const doc = await PDFDocument.load(state.bytes.slice(0));
    doc.encrypt({ userPassword: password });
    downloadBlob(new Blob([await doc.save()], { type: "application/pdf" }), baseName() + "-protected.pdf");
    setStatus("Done. The password is required to open the PDF.");
    return;
  }
  if (!state.encrypted) {
    setStatus("This PDF does not have a password.");
    return;
  }
  try {
    const doc = await PDFDocument.load(state.bytes.slice(0), { password });
    downloadBlob(new Blob([await doc.save()], { type: "application/pdf" }), baseName() + "-unlocked.pdf");
    setStatus("Done. The download opens without a password.");
  } catch (error) {
    setStatus(/password/i.test(error.message || "") ? "That password did not open the PDF." : (error.message || "The PDF could not be unlocked."));
  }
}

function configureChooser() {
  const file = $("file");
  if (tool === "image") {
    file.accept = "image/png,image/jpeg,image/webp";
    file.multiple = true;
    $("chooseLabel").textContent = "Select image files";
    $("dropHint").textContent = "or drop images here";
  } else if (tool === "ocr") {
    file.accept = "application/pdf,.pdf,image/png,image/jpeg,image/webp";
    file.multiple = true;
    $("chooseLabel").textContent = "Select a PDF or image";
    $("dropHint").textContent = "or drop a PDF or image here";
  } else {
    file.accept = "application/pdf,.pdf";
    file.multiple = false;
    $("chooseLabel").textContent = "Select PDF file";
    $("dropHint").textContent = "or drop a PDF here";
  }
  const panel = panels[tool];
  if (panel) $(panel).hidden = false;
  else setStatus("This tool is not available.");
  $("previewColumn").hidden = !["edit", "sign", "organize", "image", "ocr"].includes(tool);
}

function bindDrop(zone, input) {
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", async (event) => {
    event.preventDefault();
    zone.classList.remove("dragover");
    const files = [...event.dataTransfer.files];
    if (tool === "image" || (tool === "ocr" && files[0] && /^image\//.test(files[0].type))) await acceptImages(files);
    else await acceptPdfFile(files[0]);
  });
  input.addEventListener("change", async () => {
    const files = [...input.files];
    if (tool === "image" || (tool === "ocr" && files[0] && /^image\//.test(files[0].type))) await acceptImages(files);
    else await acceptPdfFile(files[0]);
  });
}

function markEditTool(name) {
  state.editTool = name;
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.edit === name));
  });
}

async function busy(button, job) {
  button.disabled = true;
  try {
    await job();
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "The file could not be processed.");
  } finally {
    button.disabled = false;
  }
}

configureChooser();
$("choose").addEventListener("click", () => $("file").click());
$("clearFile").addEventListener("click", resetAll);
$("submitPassword").addEventListener("click", () => busy($("submitPassword"), async () => {
  if (await openPdf($("openPassword").value)) await afterPdfOpened();
}));
$("openPassword").addEventListener("keydown", (event) => {
  if (event.key === "Enter") $("submitPassword").click();
});
document.querySelectorAll("[data-edit]").forEach((button) => {
  button.addEventListener("click", () => markEditTool(button.dataset.edit));
});
markEditTool("text");
$("overlay").addEventListener("pointerdown", onOverlayPointerDown);
$("stage").addEventListener("pointermove", onPointerMove);
$("stage").addEventListener("pointerup", onPointerUp);
$("stage").addEventListener("pointercancel", onPointerUp);
$("pagePrev").addEventListener("click", async () => {
  if (state.index > 0) {
    state.index -= 1;
    await renderPage();
  }
});
$("pageNext").addEventListener("click", async () => {
  if (state.index < state.pages.length - 1) {
    state.index += 1;
    await renderPage();
  }
});
$("rotateLeft").addEventListener("click", () => rotateBy(-90));
$("rotateRight").addEventListener("click", () => rotateBy(90));
$("moveEarlier").addEventListener("click", async () => {
  movePage(state.index, state.index - 1);
  await renderPage();
});
$("moveLater").addEventListener("click", async () => {
  movePage(state.index, state.index + 1);
  await renderPage();
});
$("deletePage").addEventListener("click", deleteCurrentPage);
$("addImages").addEventListener("click", () => $("moreImages").click());
$("moreImages").addEventListener("change", () => acceptImages($("moreImages").files));
$("placeImage").addEventListener("change", async () => {
  const file = $("placeImage").files?.[0];
  if (!file) return;
  state.pendingImage = await loadImageFile(file);
  await placePendingImage(state.placeAt);
  state.placeAt = null;
});
$("uploadSign").addEventListener("click", () => $("signImage").click());
$("signImage").addEventListener("change", async () => {
  const file = $("signImage").files?.[0];
  if (!file) return;
  state.signature = await loadImageFile(file);
  setStatus("Image ready. Place the signature.");
});
document.querySelectorAll('input[name="protectMode"]').forEach((input) => {
  input.addEventListener("change", () => {
    const lock = document.querySelector('input[name="protectMode"]:checked').value === "lock";
    $("confirmWrap").hidden = !lock;
    $("applyProtect").textContent = lock ? "Protect PDF" : "Unlock PDF";
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Delete" && event.key !== "Backspace") return;
  if (event.target.closest("input, textarea, [contenteditable='true']")) return;
  if (!state.selectedId) return;
  event.preventDefault();
  removeAnnotation(state.selectedId);
});
bindDrop($("drop"), $("file"));
bindSignPad();
for (const [id, job] of [
  ["saveEdit", () => saveEdited("-edited")],
  ["saveOrganize", () => saveEdited("-organized")],
  ["applyNumbers", applyNumbers],
  ["applyWatermark", applyWatermark],
  ["applyCompress", compressPdf],
  ["applyOcr", runOcr],
  ["applyImages", createImagePdf],
  ["placeSign", placeSignature],
  ["saveSign", () => saveEdited("-signed")],
  ["applyProtect", applyProtect]
]) {
  const button = $(id);
  button?.addEventListener("click", () => busy(button, job));
}
ensureFont().catch(() => setStatus("Noto Sans Bengali could not be loaded."));

