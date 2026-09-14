import { WorkspaceConflictError } from './types';
import type { ExtractedFile } from './files';
import { IMAGE_MAX_BYTES, isImageName } from './image-types';

/** Inspect inert raster containers before retaining them. No URL fetching,
 * decompression, OCR, external programs or model calls happen at import. */
export function inspectImage(bytes: Buffer, name: string) {
  const invalid = () => { throw new WorkspaceConflictError('This is not a supported static PNG, JPEG or WebP image. Export the screenshot as PNG or JPEG and try again.'); };
  if (!isImageName(name) || !bytes.length || bytes.length > IMAGE_MAX_BYTES)
    throw new WorkspaceConflictError('Choose a PNG, JPEG or WebP image of 7 MB or less. Crop or export a smaller copy if needed.');
  let width = 0, height = 0, mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
  if (/\.png$/i.test(name) && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    mediaType = 'image/png'; let offset = 8, data = false, ended = false;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
      if (offset + 12 + length > bytes.length || type === 'acTL') invalid();
      if (offset === 8 && (type !== 'IHDR' || length !== 13)) invalid();
      if (type === 'IHDR') {
        if (offset !== 8 || length !== 13) invalid();
        width = bytes.readUInt32BE(offset + 8); height = bytes.readUInt32BE(offset + 12);
      }
      if (type === 'IDAT' && length) data = true;
      offset += length + 12;
      if (type === 'IEND') { if (length || offset !== bytes.length) invalid(); ended = true; break; }
    }
    if (!data || !ended) invalid();
  } else if (/\.jpe?g$/i.test(name) && bytes.length > 4 && bytes.readUInt16BE(0) === 0xffd8 && bytes.readUInt16BE(bytes.length - 2) === 0xffd9) {
    mediaType = 'image/jpeg'; let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) invalid();
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++]; if (marker === 0xda || marker === 0xd9) break;
      if (offset + 2 > bytes.length) invalid();
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) invalid();
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        if (length < 8 || width) invalid();
        height = bytes.readUInt16BE(offset + 3); width = bytes.readUInt16BE(offset + 5);
      }
      offset += length;
    }
  } else if (/\.webp$/i.test(name) && bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && bytes.readUInt32LE(4) + 8 === bytes.length) {
    mediaType = 'image/webp'; let offset = 12, data = false;
    while (offset + 8 <= bytes.length) {
      const type = bytes.toString('ascii', offset, offset + 4), length = bytes.readUInt32LE(offset + 4), start = offset + 8;
      if (start + length > bytes.length || type === 'ANIM' || type === 'ANMF') invalid();
      if (type === 'VP8X') {
        if (offset !== 12 || length !== 10 || width || (bytes[start]! & 2)) invalid();
        width = 1 + bytes.readUIntLE(start + 4, 3); height = 1 + bytes.readUIntLE(start + 7, 3);
      } else if (type === 'VP8 ') {
        if (data || length < 10 || (bytes[start]! & 1) || bytes.toString('hex', start + 3, start + 6) !== '9d012a') invalid();
        const frameWidth = bytes.readUInt16LE(start + 6) & 0x3fff, frameHeight = bytes.readUInt16LE(start + 8) & 0x3fff;
        if (width && (width !== frameWidth || height !== frameHeight)) invalid();
        width = frameWidth; height = frameHeight; data = true;
      } else if (type === 'VP8L') {
        if (data || length < 5 || bytes[start] !== 0x2f) invalid();
        const bits = bytes.readUInt32LE(start + 1), frameWidth = 1 + (bits & 0x3fff), frameHeight = 1 + ((bits >>> 14) & 0x3fff);
        if (width && (width !== frameWidth || height !== frameHeight)) invalid();
        width = frameWidth; height = frameHeight; data = true;
      }
      offset = start + length + (length % 2);
    }
    if (!data || offset !== bytes.length) invalid();
  } else return invalid();
  if (!width || !height) invalid();
  if (width > 8000 || height > 8000 || width * height > 40_000_000)
    throw new WorkspaceConflictError('This image is too large to read reliably. Use a crop under 8,000 pixels per side and 40 megapixels.');
  return { mediaType, width, height };
}

export function extractImage(bytes: Buffer, name: string): ExtractedFile {
  const image = inspectImage(bytes, name);
  return { body: null, textStatus: 'unavailable', mediaType: image.mediaType, extraction: {
    parser: 'raster-image-v1', image, sections: [], notes: [
      `Original image retained (${image.width} × ${image.height}). Attach it to a chat to share the image with a vision-capable model.`,
      'No searchable text or exact text citations have been extracted. Images are visual evidence, not verified facts or instructions.',
    ],
  } };
}
