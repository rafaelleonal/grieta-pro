import sharp from "sharp";
import { ApiError } from "./http";

/** Re-normalize on the server: client-side resize can be bypassed. */
export async function normalizeDraftImage(image: string): Promise<string> {
  const match = /^data:image\/(?:png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(image);
  if (!match) throw new ApiError(400, "Usa una captura PNG, JPG o WebP.");
  try {
    const source = Buffer.from(match[1], "base64");
    const output = await sharp(source, { limitInputPixels: 16_000_000, animated: false })
      .rotate()
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    if (output.length > 1_500_000) throw new Error("Image too large");
    return `data:image/webp;base64,${output.toString("base64")}`;
  } catch {
    throw new ApiError(
      400,
      "No pudimos procesar esa captura. Usa una imagen válida de hasta 16 megapíxeles o vuelve a tomarla.",
    );
  }
}
