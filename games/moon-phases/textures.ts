// Procedural canvas textures: nothing is downloaded. Spheres are painted in
// equirectangular layout from 3D noise sampled on the sphere, so there is no
// seam where the map wraps around.

function hash(x: number, y: number, z: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144665) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
const smooth = (t: number) => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

function valueNoise(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi)
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz, seed)
  return mix(
    mix(mix(c(0, 0, 0), c(1, 0, 0), xf), mix(c(0, 1, 0), c(1, 1, 0), xf), yf),
    mix(mix(c(0, 0, 1), c(1, 0, 1), xf), mix(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  )
}

export function fbm(x: number, y: number, z: number, seed: number, octaves = 5) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, z * freq, seed + i * 17)
    norm += amp; amp *= 0.5; freq *= 2.03
  }
  return sum / norm
}

type Painter = (nx: number, ny: number, nz: number, lat: number) => [number, number, number, number]

function paintSphere(width: number, height: number, paint: Painter) {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(width, height)
  for (let y = 0; y < height; y++) {
    const lat = (0.5 - (y + 0.5) / height) * Math.PI
    const cl = Math.cos(lat), sl = Math.sin(lat)
    for (let x = 0; x < width; x++) {
      const lon = ((x + 0.5) / width) * Math.PI * 2
      const [r, g, b, a] = paint(cl * Math.cos(lon), sl, cl * Math.sin(lon), lat)
      const i = (y * width + x) * 4
      image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = b; image.data[i + 3] = a
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

const lerp3 = (a: number[], b: number[], t: number): [number, number, number] => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

/** Earth's colour, roughness (shiny oceans, matte land) and night lights, painted together. */
export function earthCanvases(size = 1024) {
  const deep = [22, 64, 128], shallow = [46, 128, 178], grass = [86, 150, 76], forest = [48, 108, 62], sand = [214, 190, 128], ice = [236, 244, 250]
  const height = size / 2
  const rough = new Uint8ClampedArray(new ArrayBuffer(size * height * 4)), lights = new Uint8ClampedArray(new ArrayBuffer(size * height * 4))
  let i = 0
  const color = paintSphere(size, height, (x, y, z, lat) => {
    const n = fbm(x * 1.7 + 3, y * 1.7, z * 1.7, 11)
    const detail = fbm(x * 6, y * 6, z * 6, 23, 3)
    const polar = Math.abs(lat) / (Math.PI / 2)
    const land = n + detail * 0.08 - 0.56
    let rgb: [number, number, number], r = 235, glow = 0
    if (polar > 0.86 - detail * 0.08) rgb = [ice[0], ice[1], ice[2]]
    else if (land < 0) {
      const t = clamp01(1 + land * 9)
      rgb = lerp3(deep, shallow, t * t); r = 60
    } else {
      const dry = clamp01((1 - polar * 1.6) * 1.2 - 0.25 + (detail - 0.5) * 0.8)
      const base = lerp3(forest, grass, clamp01(detail * 1.4 - 0.2))
      rgb = lerp3(lerp3(base, sand, dry * 0.8), sand, clamp01(1 - land * 30) * 0.5)
      // Towns cluster near coasts and in temperate bands.
      const towns = fbm(x * 40, y * 40, z * 40, 29, 2)
      glow = clamp01((towns - 0.62) * 9) * clamp01(1 - land * 6) * clamp01(1.2 - polar * 1.4)
    }
    rough[i] = rough[i + 1] = rough[i + 2] = r; rough[i + 3] = 255
    lights[i] = 255 * glow; lights[i + 1] = 196 * glow; lights[i + 2] = 120 * glow; lights[i + 3] = 255
    i += 4
    return [rgb[0], rgb[1], rgb[2], 255]
  })
  const fromPixels = (data: Uint8ClampedArray<ArrayBuffer>) => {
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = height
    canvas.getContext('2d')!.putImageData(new ImageData(data, size, height), 0, 0)
    return canvas
  }
  return { color, rough: fromPixels(rough), lights: fromPixels(lights) }
}

/** An engraved brass ring for the moon's path: fine degree ticks, bold marks at the eight phases. */
export function scaleCanvas(size: number, inner: number, outer: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2, k = size / 2 / outer
  ctx.translate(c, c)
  // Brushed brass band.
  const band = ctx.createRadialGradient(0, 0, inner * k, 0, 0, outer * k)
  band.addColorStop(0, '#8a6232'); band.addColorStop(0.15, '#d9a95a'); band.addColorStop(0.5, '#f0cf8a'); band.addColorStop(0.85, '#c8964a'); band.addColorStop(1, '#7a5428')
  ctx.fillStyle = band
  ctx.beginPath(); ctx.arc(0, 0, outer * k, 0, Math.PI * 2); ctx.arc(0, 0, inner * k, 0, Math.PI * 2, true); ctx.fill()
  ctx.strokeStyle = '#4a3216'
  for (let d = 0; d < 360; d++) {
    const a = (d / 360) * Math.PI * 2, major = d % 45 === 0, mid = d % 5 === 0
    const r1 = outer * k * (major ? 0.62 : mid ? 0.8 : 0.88), r2 = outer * k * 0.97
    ctx.lineWidth = major ? 3.2 : mid ? 1.6 : 0.8
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke()
  }
  ctx.lineWidth = 2
  for (const r of [inner * k + 3, outer * k - 3]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke() }
  return canvas
}

export function cloudCanvas(size = 512) {
  return paintSphere(size, size / 2, (x, y, z) => {
    const n = fbm(x * 2.4 + 9, y * 3.2, z * 2.4, 41, 5)
    const a = clamp01((n - 0.52) * 4.2)
    return [255, 255, 255, Math.round(a * 220)]
  })
}

// Craters in unit-sphere coordinates, fixed so every child sees the same moon.
const CRATERS = Array.from({ length: 70 }, (_, i) => {
  const u = hash(i, 1, 2, 7), v = hash(i, 3, 4, 7)
  const theta = u * Math.PI * 2, phi = Math.acos(2 * v - 1)
  const size = 0.03 + Math.pow(hash(i, 5, 6, 7), 3) * 0.16
  return { x: Math.sin(phi) * Math.cos(theta), y: Math.cos(phi), z: Math.sin(phi) * Math.sin(theta), size }
})

/** Returns [colour canvas, bump canvas]. */
export function moonCanvases(size = 1024) {
  const height = (x: number, y: number, z: number) => {
    const maria = clamp01((fbm(x * 1.3 + 5, y * 1.3, z * 1.3, 61, 4) - 0.55) * 5)
    let h = -maria * 0.35 + (fbm(x * 9, y * 9, z * 9, 67, 3) - 0.5) * 0.15
    for (const c of CRATERS) {
      const reach = c.size * 1.25
      if (Math.abs(x - c.x) > reach || Math.abs(y - c.y) > reach) continue
      const d = Math.hypot(x - c.x, y - c.y, z - c.z) / c.size
      // A bowl with a raised rim that fades out just past the edge.
      if (d < 1) h += -0.5 * (1 - d * d) + 0.55 * Math.pow(d, 6)
      else if (d < 1.25) h += 0.55 * (1.25 - d) / 0.25
    }
    return { h, maria }
  }
  const bumps: number[] = []
  const color = paintSphere(size, size / 2, (x, y, z) => {
    const { h, maria } = height(x, y, z)
    bumps.push(h)
    const base = 196 - maria * 70 + (fbm(x * 14, y * 14, z * 14, 71, 2) - 0.5) * 30
    const v = Math.max(60, Math.min(235, base))
    return [v, v * 0.985, v * 0.96, 255]
  })
  const bump = document.createElement('canvas')
  bump.width = size; bump.height = size / 2
  const ctx = bump.getContext('2d')!, image = ctx.createImageData(size, size / 2)
  bumps.forEach((h, i) => {
    const v = Math.round(clamp01(0.55 + h * 0.6) * 255)
    image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = v; image.data[i * 4 + 3] = 255
  })
  ctx.putImageData(image, 0, 0)
  return [color, bump] as const
}

/** Table top: a round slab seen from above, with growth rings and grain. */
export function woodCanvas(size = 768) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!, image = ctx.createImageData(size, size)
  const dark = [70, 40, 22], light = [138, 88, 50]
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size - 0.5, v = y / size - 0.5
    // Planks of straight grain with a few soft knots, not a record's rings.
    const plank = Math.floor((v + 0.5) * 7)
    const warp = fbm(u * 3, v * 3, plank * 1.7, 91, 3)
    const grain = fbm(u * 2.2 + warp * 0.8, v * 55, plank * 3.1, 97, 3)
    const streak = Math.sin((v * 90 + warp * 6) * Math.PI) * 0.5 + 0.5
    const seam = Math.min(1, Math.abs(((v + 0.5) * 7) % 1 - 0.5) * 40)
    const t = clamp01((grain * 0.7 + streak * 0.18 + (hash(plank, 0, 0, 3) - 0.5) * 0.25) * (0.75 + seam * 0.25))
    const [r, g, b] = lerp3(dark, light, t)
    const i = (y * size + x) * 4
    image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = b; image.data[i + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

export function glowCanvas(inner: string, outer: string, size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner); g.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.55)')); g.addColorStop(1, outer)
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size)
  return canvas
}

/** The sun lamp's surface: hot, grainy and bright enough to read as a light. */
export function sunCanvas(size = 512) {
  return paintSphere(size, size / 2, (x, y, z) => {
    const n = fbm(x * 5, y * 5, z * 5, 131, 4)
    const cells = fbm(x * 18, y * 18, z * 18, 137, 2)
    const t = clamp01(n * 0.7 + cells * 0.5 - 0.1)
    const [r, g, b] = lerp3([255, 170, 60], [255, 244, 200], t)
    return [r, g, b, 255]
  })
}
