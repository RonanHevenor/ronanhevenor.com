// Runs in the browser before upload. Full-size camera and drone photos are
// often 20–40 MB, which is over the server's request limit, and they carry
// EXIF (including GPS). Redrawing onto a canvas and re-encoding fixes both:
// the result is a JPEG of at most MAX_EDGE px on its long side, with no
// metadata at all.

export const MAX_EDGE = 3000;
const QUALITY = 0.86;

export async function shrinkImage(file: File): Promise<File> {
  // "from-image" applies the EXIF rotation, since the rotation tag itself
  // won't survive the re-encode.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas not available");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("could not encode image"))),
        "image/jpeg",
        QUALITY,
      ),
    );
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
