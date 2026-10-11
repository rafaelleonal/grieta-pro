import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { normalizeDraftImage } from "../lib/server-image";
import { ApiError } from "../lib/http";

test("server normalizes a real image to bounded dimensions and removes metadata", async () => {
  const original = await sharp({
    create: { width: 2048, height: 1024, channels: 3, background: "#315eff" },
  })
    .withMetadata()
    .png()
    .toBuffer();
  const normalized = await normalizeDraftImage(
    `data:image/png;base64,${original.toString("base64")}`,
  );
  assert.match(normalized, /^data:image\/webp;base64,/);
  const bytes = Buffer.from(normalized.split(",", 2)[1], "base64");
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, 1024);
  assert.equal(metadata.height, 512);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
  assert.ok(bytes.length <= 1_500_000);
});

test("a small compressed upload cannot bypass the server pixel limit", async () => {
  const original = await sharp({
    create: { width: 4096, height: 4097, channels: 3, background: "#000" },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
  assert.ok(original.length < 2_500_000, "The valid compressed PNG fits the existing byte limit");
  await assert.rejects(
    normalizeDraftImage(`data:image/png;base64,${original.toString("base64")}`),
    (error: unknown) => error instanceof ApiError && error.status === 400,
  );
});

test("declared MIME and magic bytes alone never make a corrupt image billable", async () => {
  const corrupt = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(40)]);
  await assert.rejects(
    normalizeDraftImage(`data:image/png;base64,${corrupt.toString("base64")}`),
    (error: unknown) => error instanceof ApiError && error.status === 400,
  );
});
