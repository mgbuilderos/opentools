/**
 * Pure client-side Microsoft ICO binary encoder and multi-resolution favicon pack builder.
 * Governed by standard W3C Web App Manifest and Microsoft Icon Format (ICO) specifications.
 */

export interface IcoFrame {
  width: number;
  height: number;
  pngBytes: Uint8Array;
}

/**
 * Encodes multiple PNG image frames (e.g. 16x16, 32x32, 48x48) into a valid binary .ico file.
 */
export function encodeIco(frames: readonly IcoFrame[]): Uint8Array {
  if (!frames.length) {
    throw new Error(
      'At least one image frame is required to encode an ICO file.',
    );
  }

  const headerSize = 6;
  const dirEntrySize = 16;
  const dirTotalSize = frames.length * dirEntrySize;
  let currentOffset = headerSize + dirTotalSize;

  let totalSize = currentOffset;
  for (const frame of frames) {
    totalSize += frame.pngBytes.length;
  }

  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  // 1. ICO Header (6 bytes)
  view.setUint16(0, 0, true); // Reserved (0)
  view.setUint16(2, 1, true); // Type (1 for ICO)
  view.setUint16(4, frames.length, true); // Number of images

  // 2. Directory Entries
  let entryOffset = headerSize;
  for (const frame of frames) {
    const widthByte = frame.width >= 256 ? 0 : frame.width;
    const heightByte = frame.height >= 256 ? 0 : frame.height;

    buffer[entryOffset] = widthByte;
    buffer[entryOffset + 1] = heightByte;
    buffer[entryOffset + 2] = 0; // Color count (0 = 256 or truecolor)
    buffer[entryOffset + 3] = 0; // Reserved
    view.setUint16(entryOffset + 4, 1, true); // Color planes
    view.setUint16(entryOffset + 6, 32, true); // Bits per pixel (32-bit RGBA)
    view.setUint32(entryOffset + 8, frame.pngBytes.length, true); // Size of image data
    view.setUint32(entryOffset + 12, currentOffset, true); // Offset of image data

    // Copy PNG data into payload position
    buffer.set(frame.pngBytes, currentOffset);
    currentOffset += frame.pngBytes.length;
    entryOffset += dirEntrySize;
  }

  return buffer;
}
