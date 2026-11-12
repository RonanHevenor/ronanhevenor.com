// Runs in the browser before a project image is uploaded (logos, title images, pictures pasted
// into a write-up). Redraws it on a canvas, which:
// - drops all metadata (EXIF, GPS, camera details);
// - with `trim`, crops away fully transparent margins (an app icon's padding, empty space
//   around a wordmark), so what you see is what gets sized and rounded;
// - scales it to at most `maxEdge` px on its long side (SVGs are drawn at that size, so they
//   come out sharp, and arrive as an image rather than as SVG markup);
// - saves PNG if any pixel is transparent, otherwise JPEG.

export async function processImage(
  file: File,
  { maxEdge = 2400, trim = false }: { maxEdge?: number; trim?: boolean } = {},
): Promise<File> {
  const img = await loadImage(file);
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  let w = img.naturalWidth || 1200;
  let h = img.naturalHeight || Math.round(w * 0.5);
  // vectors: draw at full size; bitmaps: never enlarge
  const scale = isSvg ? maxEdge / Math.max(w, h) : Math.min(1, maxEdge / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas not available");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  let { data } = ctx.getImageData(0, 0, w, h);
  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) { hasAlpha = true; break; }
  }

  let out = canvas;
  if (trim && hasAlpha) {
    const box = opaqueBounds(data, w, h);
    if (box && (box.w < w || box.h < h)) {
      out = document.createElement("canvas");
      out.width = box.w;
      out.height = box.h;
      out.getContext("2d")!.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
      // trimming may have removed every transparent pixel (e.g. a square tile on padding)
      data = out.getContext("2d")!.getImageData(0, 0, box.w, box.h).data;
      hasAlpha = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) { hasAlpha = true; break; }
      }
    }
  }

  const type = hasAlpha ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error("could not encode image"))), type, 0.88),
  );
  const name = file.name.replace(/\.[^.]+$/, "") + (hasAlpha ? ".png" : ".jpg");
  return new File([blob], name, { type });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`couldn't read ${file.name} as an image`)); };
    img.src = url;
  });
}

// The smallest box holding every pixel that isn't (almost) fully transparent.
function opaqueBounds(data: Uint8ClampedArray, w: number, h: number) {
  let top = h, left = w, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}
