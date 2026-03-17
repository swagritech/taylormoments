const MAX_DIMENSION_PX = 1600;
const JPEG_QUALITY = 0.82;

function isVectorOrAnimated(file: File) {
  const contentType = file.type.toLowerCase();
  return contentType.includes("svg") || contentType.includes("gif");
}

function withJpgExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) {
    return `${fileName}.jpg`;
  }
  return `${fileName.slice(0, dot)}.jpg`;
}

async function decodeImage(file: File) {
  if (typeof window !== "undefined" && "createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to decode image."));
      img.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function optimizeWineryUploadImage(file: File) {
  if (!file.type.startsWith("image/") || isVectorOrAnimated(file)) {
    return file;
  }

  const decoded = await decodeImage(file);
  const originalWidth = "width" in decoded ? decoded.width : 0;
  const originalHeight = "height" in decoded ? decoded.height : 0;
  if (!originalWidth || !originalHeight) {
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(originalWidth, originalHeight));
  const targetWidth = Math.max(1, Math.round(originalWidth * scale));
  const targetHeight = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }
  context.drawImage(decoded, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });
  if (!blob) {
    return file;
  }

  if ("close" in decoded && typeof decoded.close === "function") {
    decoded.close();
  }

  if (blob.size >= file.size) {
    return file;
  }

  return new File([blob], withJpgExtension(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
