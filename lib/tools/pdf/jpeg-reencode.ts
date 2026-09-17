/**
 * Re-encodes a JPEG through the browser's own image pipeline.
 *
 * Kept out of `engine.ts` so the engine stays runnable under Node, where there
 * is no canvas. The engine treats this as optional: without it, compression
 * falls back to the lossless pass and says so.
 */
export type ReencodedJpeg = {
  bytes: Uint8Array;
  width: number;
  height: number;
};

export type JpegReencoder = (
  bytes: Uint8Array,
  options: { quality: number; maxDimension: number },
) => Promise<ReencodedJpeg | null>;

/** True when this runtime can decode and re-encode images off the main thread. */
export function canReencodeImages() {
  return (
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap === 'function'
  );
}

/**
 * Returns null whenever the image cannot be re-encoded safely — an undecodable
 * bitmap, a zero dimension, or a result that is not actually smaller. A null
 * means "leave the original alone", never "drop the image".
 */
export const reencodeJpegWithCanvas: JpegReencoder = async (
  bytes,
  { quality, maxDimension },
) => {
  if (!canReencodeImages()) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(
      new Blob([bytes as BlobPart], { type: 'image/jpeg' }),
    );
  } catch {
    return null;
  }

  try {
    const { width: sourceWidth, height: sourceHeight } = bitmap;
    if (sourceWidth < 1 || sourceHeight < 1) return null;

    const scale = Math.min(
      1,
      maxDimension / Math.max(sourceWidth, sourceHeight),
    );
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) return null;
    // JPEG has no alpha. Compose onto white so a transparent source does not
    // come back with black edges.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality / 100,
    });
    // An engine that cannot write JPEG hands back its own format; the caller
    // would then store non-JPEG bytes under a /DCTDecode filter.
    if (blob.type !== 'image/jpeg') return null;

    const encoded = new Uint8Array(await blob.arrayBuffer());
    if (encoded.length < 1 || encoded.length >= bytes.length) return null;
    return { bytes: encoded, width, height };
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
};
