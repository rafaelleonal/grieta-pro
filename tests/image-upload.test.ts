import { strict as assert } from "node:assert";
import test from "node:test";
import {
  chooseImageDimensions,
  getDataUrlByteLength,
  MAX_SOURCE_IMAGE_BYTES,
  MAX_TRANSPORT_IMAGE_BYTES,
  prepareImage,
  validateSourceImage,
} from "../lib/image-upload";

const jpegBytes = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 2, 3, 4]);
const jpegFile = () => new File([jpegBytes], "draft.jpg", { type: "image/jpeg" });

test("allows original photos through exactly 30 MB, while retaining the smaller transport limit", () => {
  assert.equal(MAX_SOURCE_IMAGE_BYTES, 30_000_000);
  assert.equal(MAX_TRANSPORT_IMAGE_BYTES, 2_500_000);
  assert.doesNotThrow(() =>
    validateSourceImage({ name: "photo.jpg", type: "image/jpeg", size: MAX_SOURCE_IMAGE_BYTES }),
  );
  assert.throws(
    () =>
      validateSourceImage({
        name: "photo.jpg",
        type: "image/jpeg",
        size: MAX_SOURCE_IMAGE_BYTES + 1,
      }),
    /supera 30 MB/,
  );
  for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => validateSourceImage({ name: "photo.jpg", type: "image/jpeg", size }),
      /vacía/,
    );
  }
});

test("accepts mobile image formats and missing phone MIME types, but rejects unrelated files", () => {
  for (const [name, type] of [
    ["photo.HEIC", "image/heic"],
    ["photo.avif", "image/avif"],
    ["camera.jpg", ""],
    ["camera.heif", ""],
  ]) {
    assert.doesNotThrow(() => validateSourceImage({ name, type, size: 1000 }));
  }
  for (const [name, type] of [
    ["photo.jpg", "application/pdf"],
    ["document.pdf", ""],
    ["document.txt", "text/plain"],
  ]) {
    assert.throws(() => validateSourceImage({ name, type, size: 1000 }), /Elige una foto/);
  }
});

test("preserves aspect ratio, bounds large photos, and never enlarges small images", () => {
  assert.deepEqual(chooseImageDimensions(4032, 3024), { width: 2560, height: 1920 });
  assert.deepEqual(chooseImageDimensions(3024, 4032, 2048), { width: 1536, height: 2048 });
  assert.deepEqual(chooseImageDimensions(640, 480), { width: 640, height: 480 });
  assert.deepEqual(chooseImageDimensions(10000, 1), { width: 2560, height: 1 });
  assert.throws(() => chooseImageDimensions(0, 480), /dimensiones/);
  assert.throws(() => chooseImageDimensions(Number.NaN, 480), /dimensiones/);
});

test("counts actual encoded image bytes including base64 padding", () => {
  for (const size of [1, 2, 3, 14, MAX_TRANSPORT_IMAGE_BYTES, MAX_TRANSPORT_IMAGE_BYTES + 1]) {
    assert.equal(
      getDataUrlByteLength(`data:image/jpeg;base64,${Buffer.alloc(size).toString("base64")}`),
      size,
    );
  }
  for (const invalid of [
    "data:image/jpeg;base64,not_valid",
    "data:image/jpeg;base64,A",
    "data:image/svg+xml;base64,AAAA",
    "https://example.com/photo.jpg",
  ]) {
    assert.throws(() => getDataUrlByteLength(invalid), /preparar/);
  }
});

type BrowserOptions = {
  width?: number;
  height?: number;
  decodeFailure?: boolean;
  encode?: (attempt: number) => Blob | null;
  encodedDataUrl?: string;
};

async function withBrowser<T>(
  options: BrowserOptions,
  run: (state: {
    revoked: string[];
    attempts: { width: number; height: number; quality: number }[];
    canvas: { width: number; height: number };
  }) => Promise<T>,
): Promise<T> {
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  const revoked: string[] = [];
  const attempts: { width: number; height: number; quality: number }[] = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ fillStyle: "", fillRect() {}, drawImage() {} }),
    toBlob(callback: BlobCallback, _mime: string, quality: number) {
      attempts.push({ width: this.width, height: this.height, quality });
      queueMicrotask(() =>
        callback(
          options.encode
            ? options.encode(attempts.length)
            : new Blob([jpegBytes], { type: "image/jpeg" }),
        ),
      );
    },
  };
  class MockImage {
    naturalWidth = options.width ?? 1280;
    naturalHeight = options.height ?? 720;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) {
      if (value) queueMicrotask(() => (options.decodeFailure ? this.onerror?.() : this.onload?.()));
    }
  }
  class MockReader {
    result: string | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    readAsDataURL(blob: Blob) {
      void blob.arrayBuffer().then((bytes) => {
        this.result =
          options.encodedDataUrl ??
          `data:${blob.type};base64,${Buffer.from(bytes).toString("base64")}`;
        this.onload?.();
      });
    }
  }
  for (const [key, value] of Object.entries({
    Image: MockImage,
    FileReader: MockReader,
    document: { createElement: () => canvas },
  })) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  URL.createObjectURL = () => "blob:prepared-photo";
  URL.revokeObjectURL = (url) => {
    revoked.push(url);
  };
  try {
    return await run({ revoked, attempts, canvas });
  } finally {
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test("keeps a supported small capture unchanged and revokes its preview URL", async () => {
  await withBrowser({}, async ({ attempts, revoked }) => {
    const file = jpegFile();
    const result = await prepareImage(file);
    assert.equal(
      result.dataUrl,
      `data:image/jpeg;base64,${Buffer.from(jpegBytes).toString("base64")}`,
    );
    assert.equal(result.originalBytes, file.size);
    assert.equal(result.processedBytes, file.size);
    assert.equal(result.wasCompressed, false);
    assert.equal(attempts.length, 0);
    assert.deepEqual(revoked, ["blob:prepared-photo"]);
  });
});

test("resizes phone photos and lowers quality when the first encoded result is still too large", async () => {
  const oversized = new Blob([new Uint8Array(MAX_TRANSPORT_IMAGE_BYTES + 1)], {
    type: "image/jpeg",
  });
  await withBrowser(
    {
      width: 4032,
      height: 3024,
      encode: (attempt) =>
        attempt === 1 ? oversized : new Blob([jpegBytes], { type: "image/jpeg" }),
    },
    async ({ attempts, revoked, canvas }) => {
      const result = await prepareImage(jpegFile());
      assert.equal(result.wasCompressed, true);
      assert.ok(result.processedBytes <= MAX_TRANSPORT_IMAGE_BYTES);
      assert.deepEqual(attempts, [
        { width: 2560, height: 1920, quality: 0.9 },
        { width: 2560, height: 1920, quality: 0.82 },
      ]);
      assert.deepEqual(revoked, ["blob:prepared-photo"]);
      assert.deepEqual({ width: canvas.width, height: canvas.height }, { width: 0, height: 0 });
    },
  );
});

test("compresses an original at the 30 MB boundary before preparing its transport payload", async () => {
  await withBrowser({}, async ({ attempts }) => {
    const file = new File(
      [jpegBytes, new Uint8Array(MAX_SOURCE_IMAGE_BYTES - jpegBytes.length)],
      "camera.jpg",
      { type: "image/jpeg" },
    );
    const result = await prepareImage(file);
    assert.equal(result.originalBytes, MAX_SOURCE_IMAGE_BYTES);
    assert.equal(result.processedBytes, jpegBytes.length);
    assert.equal(result.wasCompressed, true);
    assert.equal(attempts.length, 1);
  });
});

test("converts browser-decodable HEIC photos and gives an actionable fallback when decoding fails", async () => {
  const file = new File([new Uint8Array(100)], "camera.heic", { type: "image/heic" });
  await withBrowser({}, async () => {
    const result = await prepareImage(file);
    assert.equal(result.wasCompressed, true);
    assert.match(result.dataUrl, /^data:image\/jpeg;/);
  });
  await withBrowser({ decodeFailure: true }, async ({ revoked }) => {
    await assert.rejects(prepareImage(file), /HEIC\/HEIF.*JPG o PNG.*Más compatible/);
    assert.deepEqual(revoked, ["blob:prepared-photo"]);
  });
});

test("stops after bounded optimization attempts and frees mobile canvas memory on failure", async () => {
  const oversized = new Blob([new Uint8Array(MAX_TRANSPORT_IMAGE_BYTES + 1)], {
    type: "image/jpeg",
  });
  await withBrowser(
    { width: 8000, height: 6000, encode: () => oversized },
    async ({ attempts, revoked, canvas }) => {
      await assert.rejects(prepareImage(jpegFile()), /Recorta la imagen/);
      assert.equal(attempts.length, 20);
      assert.deepEqual(attempts.at(-1), { width: 1024, height: 768, quality: 0.66 });
      assert.deepEqual(revoked, ["blob:prepared-photo"]);
      assert.equal(canvas.width, 0);
      assert.equal(canvas.height, 0);
    },
  );
});

test("refuses a generated data URL above the transport cap even if its blob reported a small size", async () => {
  const encodedDataUrl = `data:image/jpeg;base64,${Buffer.alloc(MAX_TRANSPORT_IMAGE_BYTES + 1).toString("base64")}`;
  await withBrowser({ width: 4032, height: 3024, encodedDataUrl }, async ({ revoked }) => {
    await assert.rejects(prepareImage(jpegFile()), /Recorta la imagen/);
    assert.deepEqual(revoked, ["blob:prepared-photo"]);
  });
});
