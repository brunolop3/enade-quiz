/**
 * One-shot script: generate a minimal 16x16 favicon.ico in /public/favicon.ico.
 *
 * Modern browsers accept PNG content with .ico extension. We generate a tiny
 * 16x16 PNG with a solid color (matches our brand) and write it to disk.
 *
 * Run with: bun scripts/gen-favicon.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

// PNG with a single IDAT chunk containing a 16x16 RGBA image.
// We use raw zlib compression (no filtering) for simplicity.
function makePng(width: number, height: number, rgba: Buffer): Buffer {
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  function chunk(type: string, data: Buffer): Buffer {
    const typeBuf = Buffer.from(type, 'ascii')
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const crcBuf = Buffer.alloc(4)
    // CRC32 of type + data
    const crc = crc32(Buffer.concat([typeBuf, data]))
    crcBuf.writeUInt32BE(crc >>> 0, 0)
    return Buffer.concat([len, typeBuf, data, crcBuf])
  }

  function crc32(buf: Buffer): number {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) {
      c = c ^ buf[i]
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
      }
    }
    return c ^ 0xffffffff
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // IDAT: each scanline starts with a filter byte (0 = none), then RGBA bytes
  const scanlines: Buffer[] = []
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4)
    line[0] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      line[1 + x * 4 + 0] = rgba[src + 0]
      line[1 + x * 4 + 1] = rgba[src + 1]
      line[1 + x * 4 + 2] = rgba[src + 2]
      line[1 + x * 4 + 3] = rgba[src + 3]
    }
    scanlines.push(line)
  }
  const raw = Buffer.concat(scanlines)
  const idat = zlib.deflateSync(raw, { level: 9 })

  // IEND
  const iend = Buffer.alloc(0)

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', iend),
  ])
}

// ICO wrapping a PNG (works in all modern browsers)
function makeIco(png: Buffer): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = ICO
  header.writeUInt16LE(1, 4) // count: 1 image

  const entry = Buffer.alloc(16)
  entry[0] = 16 // width (0 = 256)
  entry[1] = 16 // height
  entry[2] = 0 // colors in palette
  entry[3] = 0 // reserved
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png.length, 8) // image size
  entry.writeUInt32LE(6 + 16, 12) // image offset (header + 1 entry)

  return Buffer.concat([header, entry, png])
}

// Build a 16x16 RGBA buffer with a stylized "E" letter on a navy background.
// Color palette (matches the ENADE Quiz brand):
//   - Background: deep navy (#0f172a) → RGB(15, 23, 42)
//   - Letter "E": amber/yellow (#f59e0b) → RGB(245, 158, 11)
//   - Transparent border: 1px ring
function makeIcon(): Buffer {
  const W = 16
  const H = 16
  const rgba = Buffer.alloc(W * H * 4)

  // Pattern: 5x7 "E" letter, centered, on navy background
  // E pattern (rows of 5 pixels, 1 = letter, 0 = background):
  // 11111
  // 10000
  // 10000
  // 11110
  // 10000
  // 10000
  // 11111
  const ePattern = [
    '11111',
    '10000',
    '10000',
    '11110',
    '10000',
    '10000',
    '11111',
  ]
  const eW = 5
  const eH = 7
  const offX = Math.floor((W - eW) / 2) // 5
  const offY = Math.floor((H - eH) / 2) // 4

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4
      // 1px transparent border
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        rgba[idx + 0] = 15
        rgba[idx + 1] = 23
        rgba[idx + 2] = 42
        rgba[idx + 3] = 255 // fully opaque (avoid alpha-edge artifacts)
      } else {
        const px = x - offX
        const py = y - offY
        let isLetter = false
        if (px >= 0 && px < eW && py >= 0 && py < eH) {
          isLetter = ePattern[py][px] === '1'
        }
        if (isLetter) {
          rgba[idx + 0] = 245
          rgba[idx + 1] = 158
          rgba[idx + 2] = 11
          rgba[idx + 3] = 255
        } else {
          rgba[idx + 0] = 15
          rgba[idx + 1] = 23
          rgba[idx + 2] = 42
          rgba[idx + 3] = 255
        }
      }
    }
  }

  return rgba
}

const rgba = makeIcon()
const png = makePng(16, 16, rgba)
const ico = makeIco(png)

const outDir = path.join(process.cwd(), 'public')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'favicon.ico')
fs.writeFileSync(outFile, ico)
console.log(`✓ Wrote ${outFile} (${ico.length} bytes)`)

// Also write the PNG version (some tools prefer it)
const pngFile = path.join(outDir, 'favicon.png')
fs.writeFileSync(pngFile, png)
console.log(`✓ Wrote ${pngFile} (${png.length} bytes)`)
