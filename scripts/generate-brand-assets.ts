/**
 * Genera los iconos PWA, favicons, imagen social y mascota públicos de Elociencia
 * a partir de brand/elociencia. Uso: pnpm exec tsx scripts/generate-brand-assets.ts
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BRAND = "brand/elociencia";
const LIME = "#c6f36b";

const svg = (name: string) => readFile(`${BRAND}/svg/${name}.svg`);
const render = (source: Buffer, size: number) =>
  sharp(source, { density: 1200 }).resize(size, size).png().toBuffer();

/** Mark centered on an opaque square; `scale` is the mark's share of the side. */
async function onBackground(source: Buffer, size: number, scale: number, background: string) {
  const mark = await render(source, Math.round(size * scale));
  const offset = Math.round((size - Math.round(size * scale)) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, left: offset, top: offset }])
    .flatten({ background })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** ICO container with embedded PNG images (supported by every current browser). */
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

async function main() {
  const [lime, small48, small24] = await Promise.all([
    svg("a-icon-lime"),
    svg("a-icon-48"),
    svg("a-icon-24"),
  ]);
  await mkdir("public/icons", { recursive: true });
  await mkdir("public/brand", { recursive: true });

  // "any": the full tile, with its own rounded corners.
  for (const size of [192, 512])
    await writeFile(`public/icons/icon-${size}.png`, await render(lime, size));
  // Maskable: opaque lime and only the simplified «El» glyph inside the 80 % safe circle.
  // The tile's own rounded rect is dropped so no anti-aliased edge reaches the corners.
  const glyph = Buffer.from(small48.toString("utf8").replace(/<rect[^>]*\/>/, ""));
  for (const size of [192, 512])
    await writeFile(
      `public/icons/maskable-${size}.png`,
      await onBackground(glyph, size, 0.8, LIME),
    );
  // iOS rounds the icon itself and needs it opaque.
  await writeFile("public/icons/apple-touch-icon.png", await onBackground(lime, 180, 1, LIME));

  const favicons = [
    { size: 16, data: await render(small24, 16) },
    { size: 32, data: await render(small48, 32) },
    { size: 48, data: await render(small48, 48) },
  ];
  for (const { size, data } of favicons) await writeFile(`public/icons/favicon-${size}.png`, data);
  await writeFile("app/favicon.ico", ico(favicons));
  await writeFile("app/icon.svg", small48);

  await copyFile(`${BRAND}/png/og-image.png`, "app/opengraph-image.png");
  // The mascot is almost black: public copies always carry a lime or cream sticker edge.
  for (const variant of ["lima", "crema"])
    for (const size of [256, 512])
      await writeFile(
        `public/brand/mascota-${variant}-${size}.png`,
        await sharp(`${BRAND}/mascota/mascota-sticker-${variant}.png`)
          .resize(size, size)
          .png({ compressionLevel: 9 })
          .toBuffer(),
      );
  await copyFile(`${BRAND}/svg/a-lockup.svg`, "public/brand/lockup.svg");
  await copyFile(`${BRAND}/svg/a-tile.svg`, "public/brand/tile.svg");
  await copyFile(`${BRAND}/svg/word.svg`, "public/brand/word.svg");
  console.info("Recursos de marca de Elociencia generados.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
