const MAX_SIDE = 1024 // photos are shrunk to this size: faster cutouts, smaller storage

export function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This image could not be read. Try a different photo.'))
    }
    img.src = url
  })
}

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('The image could not be saved.'))),
      type,
      quality
    )
  })
}

// Shrinks the photo (keeping its orientation) and returns a JPEG blob.
export async function downscale(file) {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  return canvasToBlob(canvas, 'image/jpeg', 0.9)
}

// Free, open-source AI model that runs inside the browser.
// To trade quality for speed, change the model to 'isnet_quint8' (smaller and faster).
const MODEL = 'isnet_fp16'

export async function cutout(photoBlob, onProgress) {
  const { removeBackground } = await import('@imgly/background-removal')
  return removeBackground(photoBlob, {
    model: MODEL,
    output: { format: 'image/png' },
    progress: (key, current, total) => onProgress?.(key, current, total),
  })
}

// Crops away empty transparent borders so the clothing fills its card.
export async function trimTransparent(blob, pad = 16) {
  const bmp = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bmp.width
  canvas.height = bmp.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 40) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return blob // nothing visible; leave as is

  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const w = maxX - minX + 1
  const h = maxY - minY + 1

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, w, h)
  return canvasToBlob(out)
}

// ---------- Colour detection ----------

// Maps any RGB colour to the closest friendly name from our palette.
export function nameColor(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }

  if (l < 0.12) return 'Black'
  if (s < 0.14) {
    if (l < 0.22) return 'Black'
    if (l > 0.85) return 'White'
    return 'Grey'
  }
  if (h < 15 || h >= 345) return l > 0.7 ? 'Pink' : 'Red'
  if (h < 40) {
    if (l < 0.4) return 'Brown'
    if (s < 0.45 && l > 0.65) return 'Beige'
    return 'Orange'
  }
  if (h < 65) {
    if (l < 0.4) return 'Olive'
    if (s < 0.4 && l > 0.65) return 'Beige'
    return 'Yellow'
  }
  if (h < 80) return l < 0.45 ? 'Olive' : 'Green'
  if (h < 165) return 'Green'
  if (h < 195) return 'Teal'
  if (h < 255) return l < 0.3 ? 'Navy' : 'Blue'
  if (h < 290) return 'Purple'
  return l > 0.55 ? 'Pink' : 'Purple'
}

// Finds the main colour of a cutout (ignores transparent pixels).
export async function dominantColor(blob) {
  const bmp = await createImageBitmap(blob)
  const scale = Math.min(1, 80 / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const counts = {}
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue
    const name = nameColor(data[i], data[i + 1], data[i + 2])
    counts[name] = (counts[name] || 0) + 1
  }
  let best = null
  for (const [name, n] of Object.entries(counts)) {
    if (!best || n > counts[best]) best = name
  }
  return best
}

// ---------- v0.8: smaller files, faster screens ----------

// Small preview used in grids. Decoding a 360 px picture is far cheaper than a 1024 px one,
// which is what keeps scrolling smooth and the phone cool.
export async function makeThumb(blob, max = 360) {
  const bmp = await createImageBitmap(blob)
  try {
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, 0, 0, w, h)
    // browsers that cannot write WebP quietly give back a PNG, which is fine too
    return await canvasToBlob(canvas, 'image/webp', 0.85)
  } finally {
    bmp.close?.()
  }
}

// Re-saves a cutout as WebP (keeps transparency, usually 4-6x smaller than PNG).
// If the browser cannot do it, or it would not be smaller, the original is kept.
export async function compactImage(blob) {
  try {
    const bmp = await createImageBitmap(blob)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = bmp.width
      canvas.height = bmp.height
      canvas.getContext('2d').drawImage(bmp, 0, 0)
      const out = await canvasToBlob(canvas, 'image/webp', 0.92)
      return out.type === 'image/webp' && out.size < blob.size ? out : blob
    } finally {
      bmp.close?.()
    }
  } catch {
    return blob
  }
}
