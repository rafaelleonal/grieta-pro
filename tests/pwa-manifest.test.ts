import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import manifest from "../app/manifest";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test("the install manifest references actual correctly sized PNGs in the application scope", async () => {
  const metadata = manifest();
  assert.equal(metadata.id, "/");
  assert.equal(metadata.start_url, "/");
  assert.equal(metadata.scope, "/");
  assert.equal(metadata.display, "standalone");
  assert.equal(metadata.lang, "es-MX");
  assert.ok(metadata.icons?.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"));
  assert.ok(metadata.icons?.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
  assert.ok(
    metadata.icons?.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"),
  );

  for (const icon of metadata.icons ?? []) {
    assert.equal(icon.type, "image/png");
    assert.match(icon.src, /^\/icons\/[a-z0-9-]+\.png$/);
    const file = await readFile(new URL(`../public${icon.src}`, import.meta.url));
    assert.deepEqual(file.subarray(0, 8), pngSignature);
    const width = file.readUInt32BE(16);
    const height = file.readUInt32BE(20);
    assert.equal(icon.sizes, `${width}x${height}`);
  }

  const appleIcon = await readFile(
    new URL("../public/icons/apple-touch-icon.png", import.meta.url),
  );
  assert.deepEqual(appleIcon.subarray(0, 8), pngSignature);
  assert.equal(appleIcon.readUInt32BE(16), 180);
  assert.equal(appleIcon.readUInt32BE(20), 180);
});

test("the maskable icon is opaque and its foreground stays within the safe circle", async () => {
  const { data, info } = await sharp(
    new URL("../public/icons/maskable-512.png", import.meta.url).pathname,
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const center = info.width / 2;
  const safeRadius = info.width * 0.4;
  let foregroundPixels = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const pixel = (y * info.width + x) * 4;
      assert.equal(data[pixel + 3], 255, "Maskable icons need an opaque edge-to-edge background");
      // Brand lime background (#c6f36b); anything else is the mark.
      const isForeground =
        data[pixel] !== 198 || data[pixel + 1] !== 243 || data[pixel + 2] !== 107;
      if (!isForeground) continue;
      foregroundPixels++;
      assert.ok(
        Math.hypot(x + 0.5 - center, y + 0.5 - center) <= safeRadius,
        "The brand mark must survive circular and rounded device masks",
      );
    }
  }
  assert.ok(foregroundPixels > 1_000, "The icon must contain a visible brand mark");
});
