"use client";

export const MAX_SOURCE_IMAGE_BYTES = 30_000_000;
export const MAX_TRANSPORT_IMAGE_BYTES = 2_500_000;
const MAX_IMAGE_EDGE = 2560;

export type PreparedImage = {
  dataUrl: string;
  originalBytes: number;
  processedBytes: number;
  wasCompressed: boolean;
};

type SourceImage = { type: string; size: number; name: string };
type ImageDimensions = { width: number; height: number };
type SupportedMime = "image/png" | "image/jpeg" | "image/webp";

class ImageUploadError extends Error {}

const imageExtension = /\.(?:png|jpe?g|webp|avif|gif|bmp|heic|heif|tiff?)$/i;
const heicImage = /(?:heic|heif)/i;

export function validateSourceImage(file: SourceImage): void {
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new ImageUploadError("La foto está vacía o no se puede leer. Elige otra imagen.");
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new ImageUploadError("La foto supera 30 MB. Elige una imagen más pequeña.");
  }
  if (file.type ? !file.type.toLowerCase().startsWith("image/") : !imageExtension.test(file.name)) {
    throw new ImageUploadError("Elige una foto o captura de pantalla, como JPG, PNG o WebP.");
  }
}

export function chooseImageDimensions(
  width: number,
  height: number,
  maxEdge = MAX_IMAGE_EDGE,
): ImageDimensions {
  if (![width, height, maxEdge].every((value) => Number.isFinite(value) && value >= 1)) {
    throw new ImageUploadError("No pudimos leer las dimensiones de la imagen. Elige otra foto.");
  }
  const scale = Math.min(1, Math.floor(maxEdge) / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function getDataUrlByteLength(dataUrl: string): number {
  const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match || match[1].length % 4 !== 0) {
    throw new ImageUploadError(
      "No pudimos preparar la imagen. Elige otra foto o una captura JPG o PNG.",
    );
  }
  const base64 = match[1];
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

function detectSupportedMime(bytes: Uint8Array): SupportedMime | undefined {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte))
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (
    [82, 73, 70, 70].every((byte, index) => bytes[index] === byte) &&
    [87, 69, 66, 80].every((byte, index) => bytes[index + 8] === byte)
  )
    return "image/webp";
  return undefined;
}

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new ImageUploadError("No pudimos leer la foto. Vuelve a seleccionarla."));
    reader.onabort = () =>
      reject(new ImageUploadError("Se interrumpió la carga de la foto. Vuelve a seleccionarla."));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new ImageUploadError("No pudimos leer la foto. Vuelve a seleccionarla."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(image: HTMLImageElement, url: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(
        new ImageUploadError(
          heicImage.test(`${file.type} ${file.name}`)
            ? "Tu navegador no puede abrir esta foto HEIC/HEIF. Elige una JPG o PNG, o usa la opción Más compatible de la cámara del teléfono."
            : "No pudimos abrir esta imagen. Elige otra foto o una captura JPG o PNG.",
        ),
      );
    image.src = url;
  });
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new ImageUploadError(
                "No pudimos preparar la foto. Inténtalo con una captura JPG o PNG.",
              ),
            ),
      "image/jpeg",
      quality,
    );
  });
}

function checkPreparedDataUrl(dataUrl: string): number {
  const bytes = getDataUrlByteLength(dataUrl);
  if (bytes <= 0 || bytes > MAX_TRANSPORT_IMAGE_BYTES) {
    throw new ImageUploadError(
      "No pudimos reducir la foto para enviarla. Recorta la imagen o elige una captura más pequeña.",
    );
  }
  return bytes;
}

/** Decode and optimize in the browser; the original photo never needs to be uploaded. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  validateSourceImage(file);
  const image = new Image();
  const url = URL.createObjectURL(file);
  let canvas: HTMLCanvasElement | undefined;

  try {
    await loadImage(image, url, file);
    const originalDimensions = { width: image.naturalWidth, height: image.naturalHeight };
    const dimensions = chooseImageDimensions(originalDimensions.width, originalDimensions.height);
    const sourceMime = detectSupportedMime(new Uint8Array(await file.slice(0, 12).arrayBuffer()));

    if (
      sourceMime &&
      file.size <= MAX_TRANSPORT_IMAGE_BYTES &&
      dimensions.width === originalDimensions.width &&
      dimensions.height === originalDimensions.height
    ) {
      // The signature decides the MIME, including phone files with an empty or inaccurate type.
      const dataUrl = await readDataUrl(file.slice(0, file.size, sourceMime));
      return {
        dataUrl,
        originalBytes: file.size,
        processedBytes: checkPreparedDataUrl(dataUrl),
        wasCompressed: false,
      };
    }

    canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context)
      throw new ImageUploadError(
        "Tu navegador no pudo preparar la foto. Prueba con una captura JPG o PNG.",
      );

    // A bounded sequence retains detail first, then reduces resolution when necessary.
    for (const maxEdge of [MAX_IMAGE_EDGE, 2048, 1600, 1280, 1024]) {
      const target = chooseImageDimensions(
        originalDimensions.width,
        originalDimensions.height,
        maxEdge,
      );
      canvas.width = target.width;
      canvas.height = target.height;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.9, 0.82, 0.74, 0.66]) {
        const blob = await encodeJpeg(canvas, quality);
        if (blob.size <= 0 || blob.size > MAX_TRANSPORT_IMAGE_BYTES) continue;
        const dataUrl = await readDataUrl(blob);
        return {
          dataUrl,
          originalBytes: file.size,
          processedBytes: checkPreparedDataUrl(dataUrl),
          wasCompressed: true,
        };
      }
    }
    throw new ImageUploadError(
      "No pudimos reducir la foto para enviarla. Recorta la imagen o elige una captura más pequeña.",
    );
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError(
      "No pudimos preparar la foto. Vuelve a seleccionarla o prueba una captura JPG o PNG.",
    );
  } finally {
    image.onload = null;
    image.onerror = null;
    image.src = "";
    URL.revokeObjectURL(url);
    // Release canvas memory promptly on mobile, including failed conversions.
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
