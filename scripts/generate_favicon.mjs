/**
 * generate_favicon.mjs
 *
 * Generates a valid multi-size ICO file from public/logo.png.
 * Uses sharp to resize to PNG buffers, then manually constructs
 * the ICO binary container (ICO format spec: ICONDIR + ICONDIRENTRY[] + image data).
 *
 * ICO file format:
 *   ICONDIR header: 6 bytes  (reserved=0, type=1, count=N)
 *   ICONDIRENTRY[N]: 16 bytes each
 *     width(1), height(1), colorCount(1), reserved(1),
 *     planes(2), bitCount(2), sizeInBytes(4), imageOffset(4)
 *   Image data: PNG blobs (modern ICO supports embedded PNG for sizes >= 32)
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SIZES = [16, 32, 48];

async function generateFavicon() {
  const src = path.resolve(__dirname, '..', 'public', 'logo.png');
  const out = path.resolve(__dirname, '..', 'public', 'favicon.ico');

  // 1. Generate a PNG buffer for each size using sharp
  const pngBuffers = await Promise.all(
    SIZES.map(size =>
      sharp(src)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toBuffer()
    )
  );

  // 2. Build ICO binary container
  const icoBuffer = buildIco(SIZES, pngBuffers);

  // 3. Write to disk
  fs.writeFileSync(out, icoBuffer);
  console.log(`favicon.ico written to ${out}`);
  console.log(`  Sizes: ${SIZES.join(', ')} px`);
  console.log(`  Total file size: ${icoBuffer.length} bytes`);

  // 4. Verify ICO magic bytes
  const magic = icoBuffer.readUInt16LE(0).toString(16).padStart(4, '0')
    + ' ' + icoBuffer.readUInt16LE(2).toString(16).padStart(4, '0');
  const count = icoBuffer.readUInt16LE(4);
  console.log(`  ICO header: reserved=${icoBuffer.readUInt16LE(0)} type=${icoBuffer.readUInt16LE(2)} count=${count}`);
  console.log(`  Magic bytes (hex): ${icoBuffer.slice(0, 6).toString('hex')}`);
}

/**
 * Build a binary ICO buffer from an array of PNG buffers.
 * Modern ICO format stores full PNG streams for sizes >= 32px.
 * @param {number[]} sizes - pixel sizes matching pngBuffers
 * @param {Buffer[]} pngBuffers - one PNG buffer per size
 * @returns {Buffer}
 */
function buildIco(sizes, pngBuffers) {
  const count = sizes.length;

  // ICONDIR: 6 bytes
  const ICONDIR_SIZE = 6;
  // ICONDIRENTRY: 16 bytes each
  const ENTRY_SIZE = 16;

  // Data section starts after header + all directory entries
  const dataOffset = ICONDIR_SIZE + ENTRY_SIZE * count;

  // Compute cumulative offsets for each image
  const imageOffsets = [];
  let currentOffset = dataOffset;
  for (const buf of pngBuffers) {
    imageOffsets.push(currentOffset);
    currentOffset += buf.length;
  }

  const totalSize = currentOffset;
  const ico = Buffer.alloc(totalSize);

  // Write ICONDIR header
  ico.writeUInt16LE(0, 0);          // reserved (must be 0)
  ico.writeUInt16LE(1, 2);          // type: 1 = icon
  ico.writeUInt16LE(count, 4);      // number of images

  // Write ICONDIRENTRY for each image
  for (let i = 0; i < count; i++) {
    const entryStart = ICONDIR_SIZE + i * ENTRY_SIZE;
    const size = sizes[i];
    const buf = pngBuffers[i];

    // In ICO format, width/height of 256 is encoded as 0
    ico.writeUInt8(size >= 256 ? 0 : size, entryStart);       // width
    ico.writeUInt8(size >= 256 ? 0 : size, entryStart + 1);   // height
    ico.writeUInt8(0, entryStart + 2);                         // colorCount (0 = no palette)
    ico.writeUInt8(0, entryStart + 3);                         // reserved
    ico.writeUInt16LE(1, entryStart + 4);                      // planes
    ico.writeUInt16LE(32, entryStart + 6);                     // bitCount (32 = RGBA)
    ico.writeUInt32LE(buf.length, entryStart + 8);             // sizeInBytes
    ico.writeUInt32LE(imageOffsets[i], entryStart + 12);       // imageOffset
  }

  // Write image data (PNG blobs)
  for (let i = 0; i < count; i++) {
    pngBuffers[i].copy(ico, imageOffsets[i]);
  }

  return ico;
}

generateFavicon().catch(err => {
  console.error('Error generating favicon:', err.message);
  process.exit(1);
});
