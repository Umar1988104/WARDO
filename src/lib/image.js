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
