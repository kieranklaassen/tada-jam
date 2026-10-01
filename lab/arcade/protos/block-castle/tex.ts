// Every surface in the room is painted here, once, onto small canvases that
// the scene hands to three.js as textures: planed wood with grain, bark, sawn
// end grain, floorboards, a colour-washed wall, wicker, dressed stone, roof
// tiles and the evening sky. Nothing here touches the DOM until it is called
// from inside `create`.

export type Rand = () => number
type G = CanvasRenderingContext2D

export function rng(seed: number): Rand {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.lineCap = 'round'
  g.lineJoin = 'round'
  return [c, g]
}

// Soft uneven pools of a colour, the way a wash dries. `rgb` is "r,g,b"; the
// pool fades to the same colour with no strength, never toward black.
function blotches(g: G, r: Rand, w: number, h: number, n: number, rgb: string, alpha: number, size: number): void {
  for (let i = 0; i < n; i++) {
    const x = r() * w
    const y = r() * h
    const rad = size * (0.4 + r())
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, `rgba(${rgb},1)`)
    grad.addColorStop(0.5, `rgba(${rgb},0.45)`)
    grad.addColorStop(1, `rgba(${rgb},0)`)
    g.globalAlpha = alpha * (0.4 + r() * 0.6)
    g.fillStyle = grad
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  g.globalAlpha = 1
}

// Long wavering lines along x: the figure of planed wood.
function grainLines(g: G, r: Rand, w: number, h: number, strength: number): void {
  for (let y = -4; y < h + 4; y += 2 + r() * 5.5) {
    const amp = 1 + r() * 4
    const len = 50 + r() * 120
    const ph = r() * 7
    g.beginPath()
    for (let x = -8; x <= w + 8; x += 8) g.lineTo(x, y + Math.sin(x / len + ph) * amp + Math.sin(x / (len * 0.31) + ph * 2) * amp * 0.25)
    g.strokeStyle = `rgba(92,54,22,${(0.05 + r() * 0.13) * strength})`
    g.lineWidth = 0.7 + r() * 1.8
    g.stroke()
  }
}

export const WOODS = ['#edd3a8', '#e4bd8c', '#d6a379', '#e0c59c', '#cfa97c'] as const

export function paintWood(base: string, seed: number): HTMLCanvasElement {
  const r = rng(seed)
  const [c, g] = canvas(256, 256)
  g.fillStyle = base
  g.fillRect(0, 0, 256, 256)
  // Broad bands of early and late wood.
  for (let i = 0; i < 7; i++) {
    const y = r() * 256
    const hgt = 14 + r() * 50
    const grad = g.createLinearGradient(0, y - hgt, 0, y + hgt)
    const tint = r() < 0.5 ? '255,244,214' : '120,70,30'
    grad.addColorStop(0, `rgba(${tint},0)`)
    grad.addColorStop(0.5, `rgba(${tint},${0.07 + r() * 0.09})`)
    grad.addColorStop(1, `rgba(${tint},0)`)
    g.fillStyle = grad
    g.fillRect(0, y - hgt, 256, hgt * 2)
  }
  grainLines(g, r, 256, 256, 1)
  if (r() < 0.6) {
    // A small knot, with the grain swept round it.
    const kx = 50 + r() * 150
    const ky = 50 + r() * 150
    for (let k = 5; k >= 0; k--) {
      g.beginPath()
      g.ellipse(kx, ky, 5 + k * 3.4, 3 + k * 1.9, 0, 0, Math.PI * 2)
      g.strokeStyle = `rgba(92,54,22,${0.2 - k * 0.028})`
      g.lineWidth = 1.2
      g.stroke()
    }
    g.beginPath()
    g.ellipse(kx, ky, 4.5, 2.8, 0, 0, Math.PI * 2)
    g.fillStyle = 'rgba(98,58,28,0.5)'
    g.fill()
  }
  blotches(g, r, 256, 256, 8, '255,246,224', 0.1, 70)
  return c
}

// The sawn end of a block or a branch: growth rings round an off-centre pith.
export function paintEndGrain(base: string, seed: number, bark = false): HTMLCanvasElement {
  const r = rng(seed)
  const [c, g] = canvas(128, 128)
  g.fillStyle = base
  g.fillRect(0, 0, 128, 128)
  const cx = 64 + (r() - 0.5) * 22
  const cy = 64 + (r() - 0.5) * 22
  for (let rad = 3; rad < 100; rad += 2.5 + r() * 4) {
    g.beginPath()
    for (let a = 0; a <= 6.4; a += 0.2) {
      const rr = rad * (1 + Math.sin(a * 3 + rad) * 0.03)
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.96)
    }
    g.strokeStyle = `rgba(96,58,24,${0.1 + r() * 0.16})`
    g.lineWidth = 0.8 + r() * 1.4
    g.stroke()
  }
  for (let i = 0; i < 5; i++) {
    const a = r() * 6.3
    g.beginPath()
    g.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6)
    g.lineTo(cx + Math.cos(a) * (30 + r() * 30), cy + Math.sin(a) * (30 + r() * 30))
    g.strokeStyle = 'rgba(96,58,24,0.14)'
    g.lineWidth = 1
    g.stroke()
  }
  if (bark) {
    g.beginPath()
    g.arc(64, 64, 62, 0, Math.PI * 2)
    g.strokeStyle = '#5c4334'
    g.lineWidth = 9
    g.stroke()
    g.beginPath()
    g.arc(64, 64, 56.5, 0, Math.PI * 2)
    g.strokeStyle = 'rgba(150,104,66,0.6)'
    g.lineWidth = 2.5
    g.stroke()
  }
  return c
}

export function paintBark(seed: number): HTMLCanvasElement {
  const r = rng(seed)
  const [c, g] = canvas(256, 256)
  g.fillStyle = '#7a5e4a'
  g.fillRect(0, 0, 256, 256)
  blotches(g, r, 256, 256, 14, '60,40,30', 0.3, 60)
  // Furrows run up the branch (v), so they are drawn top to bottom.
  for (let i = 0; i < 90; i++) {
    const x = r() * 256
    let y = r() * 256 - 40
    const len = 40 + r() * 120
    const dark = r() < 0.6
    g.beginPath()
    g.moveTo(x, y)
    let xx = x
    for (let k = 0; k < len; k += 10) {
      xx += (r() - 0.5) * 5
      y += 10
      g.lineTo(xx, y)
    }
    g.strokeStyle = dark ? `rgba(48,32,24,${0.25 + r() * 0.35})` : `rgba(176,142,110,${0.15 + r() * 0.25})`
    g.lineWidth = dark ? 1.5 + r() * 3 : 1 + r() * 2
    g.stroke()
  }
  // Lichen.
  for (let i = 0; i < 16; i++) {
    g.beginPath()
    g.ellipse(r() * 256, r() * 256, 3 + r() * 7, 2 + r() * 5, r() * 3, 0, Math.PI * 2)
    g.fillStyle = `rgba(${150 + r() * 40},${170 + r() * 30},${130 + r() * 30},${0.2 + r() * 0.25})`
    g.fill()
  }
  return c
}

// The floor of the room, painted whole so no board repeats: boards run left
// to right, butt-jointed, each a slightly different honey.
export function paintFloor(seed: number): HTMLCanvasElement {
  const r = rng(seed)
  const W = 2048
  const H = 1024
  const [c, g] = canvas(W, H)
  g.fillStyle = '#c99862'
  g.fillRect(0, 0, W, H)
  const rows = 8
  const bh = H / rows
  const tones = ['#d3a46e', '#c99660', '#d9ad78', '#c48f58', '#cfa069', '#dbb07a']
  for (let row = 0; row < rows; row++) {
    let x = -r() * 500
    while (x < W) {
      const len = 420 + r() * 520
      g.save()
      g.beginPath()
      g.rect(x, row * bh, len, bh)
      g.clip()
      g.fillStyle = tones[Math.floor(r() * tones.length)]!
      g.fillRect(x, row * bh, len, bh)
      g.translate(x, row * bh)
      grainLines(g, r, len, bh, 0.85)
      blotches(g, r, len, bh, 3, '255,240,208', 0.12, 120)
      if (r() < 0.35) {
        const kx = r() * len
        const ky = bh * (0.2 + r() * 0.6)
        for (let k = 4; k >= 0; k--) {
          g.beginPath()
          g.ellipse(kx, ky, 6 + k * 5, 4 + k * 2.6, 0, 0, Math.PI * 2)
          g.strokeStyle = `rgba(92,54,22,${0.18 - k * 0.03})`
          g.lineWidth = 1.4
          g.stroke()
        }
      }
      g.restore()
      // The butt joint.
      g.fillStyle = 'rgba(70,40,18,0.4)'
      g.fillRect(x + len - 1.5, row * bh, 2.5, bh)
      x += len
    }
    // The seam between rows, with a worn light edge below it.
    g.fillStyle = 'rgba(66,38,16,0.5)'
    g.fillRect(0, row * bh - 1.5, W, 3)
    g.fillStyle = 'rgba(255,236,200,0.16)'
    g.fillRect(0, row * bh + 1.5, W, 2)
  }
  // Darker toward the far wall and the corners.
  const far = g.createLinearGradient(0, 0, 0, H)
  far.addColorStop(0, 'rgba(70,36,14,0.3)')
  far.addColorStop(0.3, 'rgba(70,36,14,0)')
  g.fillStyle = far
  g.fillRect(0, 0, W, H)
  return c
}

// A wall colour-washed in thin layers (lazure): apricot with rose and gold
// drifting through it, lighter where the window light reaches.
export function paintWall(seed: number): HTMLCanvasElement {
  const r = rng(seed)
  const W = 1024
  const H = 512
  const [c, g] = canvas(W, H)
  const base = g.createLinearGradient(0, 0, 0, H)
  base.addColorStop(0, '#f3cfa6')
  base.addColorStop(1, '#f8e2c2')
  g.fillStyle = base
  g.fillRect(0, 0, W, H)
  blotches(g, r, W, H, 26, '236,160,130', 0.22, 170)
  blotches(g, r, W, H, 22, '250,214,140', 0.26, 190)
  blotches(g, r, W, H, 14, '255,246,226', 0.3, 150)
  blotches(g, r, W, H, 10, '214,150,150', 0.12, 220)
  // Brush drag: broad, faint, crossing.
  for (let i = 0; i < 70; i++) {
    const x = r() * W
    const y = r() * H
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + 60 + r() * 60, y - 40 + r() * 80, x + 120 + r() * 140, y - 30 + r() * 60)
    g.strokeStyle = r() < 0.5 ? `rgba(255,248,232,${0.02 + r() * 0.03})` : `rgba(232,160,120,${0.015 + r() * 0.025})`
    g.lineWidth = 30 + r() * 50
    g.stroke()
  }
  return c
}

// Four panes of sun, soft at the edges. Drawn pale on clear; the scene lays
// it on the floor and the wall and tints it.
export function paintPanes(): HTMLCanvasElement {
  const [c, g] = canvas(512, 512)
  g.shadowColor = 'rgba(255,238,200,1)'
  g.shadowBlur = 26
  g.fillStyle = 'rgba(255,238,200,1)'
  const m = 44
  const gap = 20
  const s = (512 - m * 2 - gap) / 2
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.fillRect(m + i * (s + gap), m + j * (s + gap), s, s)
  g.shadowBlur = 0
  return c
}

// The shadow of a branch outside the window, to lie across one corner of the
// light and stir. Painted white: the scene tints it with the colour of the
// unlit floor or wall, so a leaf simply takes the sun away.
export function paintLeaves(seed: number): HTMLCanvasElement {
  const r = rng(seed)
  const [c, g] = canvas(256, 256)
  for (let i = 0; i < 44; i++) {
    const t = r()
    const x = 150 + t * 84 + (r() - 0.5) * 50
    const y = 22 + t * 86 + (r() - 0.5) * 60
    const rad = 7 + r() * 12
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, 'rgba(255,255,255,0.8)')
    grad.addColorStop(0.6, 'rgba(255,255,255,0.45)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.beginPath()
    g.ellipse(x, y, rad, rad * 0.62, r() * 3, 0, Math.PI * 2)
    g.fill()
  }
  return c
}

export function paintWeave(seed: number): HTMLCanvasElement {
  const r = rng(seed)
  const W = 256
  const H = 128
  const [c, g] = canvas(W, H)
  g.fillStyle = '#8d6338'
  g.fillRect(0, 0, W, H)
  const rows = 8
  const rh = H / rows
  const cols = 16
  const cw = W / cols
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Each strand goes over one stake and under the next.
      const overStake = (row + col) % 2 === 0
      const x = col * cw
      const y = row * rh
      const light = 0.5 + r() * 0.5
      const grad = g.createLinearGradient(0, y, 0, y + rh)
      const hi = overStake ? `rgb(${Math.round(214 + 22 * light)},${Math.round(168 + 22 * light)},${Math.round(104 + 20 * light)})` : `rgb(${Math.round(176 + 16 * light)},${Math.round(130 + 16 * light)},${Math.round(76 + 14 * light)})`
      grad.addColorStop(0, 'rgba(96,62,30,1)')
      grad.addColorStop(0.25, hi)
      grad.addColorStop(0.7, hi)
      grad.addColorStop(1, 'rgba(96,62,30,1)')
      g.fillStyle = grad
      g.beginPath()
      g.roundRect(x - (overStake ? 1.5 : -1.5), y + 0.6, cw + (overStake ? 3 : -3), rh - 1.2, rh * 0.42)
      g.fill()
      g.beginPath()
      g.moveTo(x + 2, y + rh * 0.45)
      g.lineTo(x + cw - 2, y + rh * 0.45)
      g.strokeStyle = 'rgba(255,236,196,0.22)'
      g.lineWidth = 1
      g.stroke()
    }
  }
  return c
}

// Dressed stone in courses, pale so each tower can be tinted its own colour.
// It tiles: four courses to the unit, bonds staggered.
export function paintStone(seed: number): HTMLCanvasElement {
  const r = rng(seed)
  const S = 256
  const [c, g] = canvas(S, S)
  g.fillStyle = '#e4dccd'
  g.fillRect(0, 0, S, S)
  const rows = 4
  const rh = S / rows
  for (let row = 0; row < rows; row++) {
    const n = 2 + (row % 2)
    const off = (row % 2) * 40 + r() * 20
    for (let i = 0; i < n; i++) {
      const x0 = off + (i * S) / n
      const w = S / n
      for (const wrap of [0, -S]) {
        const shade = r()
        g.fillStyle = shade < 0.5 ? `rgba(255,250,240,${0.1 + r() * 0.2})` : `rgba(120,104,110,${0.05 + r() * 0.13})`
        g.beginPath()
        g.roundRect(x0 + wrap + 2.5, row * rh + 2.5, w - 5, rh - 5, 7)
        g.fill()
      }
      // The upright joint.
      for (const wrap of [0, -S]) {
        g.beginPath()
        g.moveTo(x0 + wrap, row * rh + 2)
        g.quadraticCurveTo(x0 + wrap + (r() - 0.5) * 3, row * rh + rh / 2, x0 + wrap, row * rh + rh - 2)
        g.strokeStyle = 'rgba(104,88,96,0.42)'
        g.lineWidth = 2.6
        g.stroke()
      }
    }
    g.beginPath()
    for (let x = 0; x <= S; x += 16) g.lineTo(x, row * rh + Math.sin(x / 21 + row * 2) * 1.1)
    g.strokeStyle = 'rgba(104,88,96,0.45)'
    g.lineWidth = 2.8
    g.stroke()
  }
  blotches(g, r, S, S, 12, '160,140,150', 0.12, 60)
  blotches(g, r, S, S, 10, '255,250,236', 0.14, 50)
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(90,76,84,${0.04 + r() * 0.08})`
    g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2)
  }
  return c
}

// Rows of rounded tiles, pale, tinted per roof. Tiles.
export function paintTiles(seed: number): HTMLCanvasElement {
  const r = rng(seed)
  const S = 256
  const [c, g] = canvas(S, S)
  g.fillStyle = '#cdbfb4'
  g.fillRect(0, 0, S, S)
  const rows = 6
  const rh = S / rows
  const cols = 6
  const cw = S / cols
  for (let row = -1; row < rows; row++) {
    for (let col = -1; col <= cols; col++) {
      const x = col * cw + (row % 2 ? cw / 2 : 0)
      const y = row * rh
      const l = r()
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + cw, y)
      g.lineTo(x + cw, y + rh * 0.9)
      g.quadraticCurveTo(x + cw / 2, y + rh * 1.75, x, y + rh * 0.9)
      g.closePath()
      g.fillStyle = `rgb(${Math.round(226 + l * 26)},${Math.round(214 + l * 26)},${Math.round(204 + l * 26)})`
      g.fill()
      g.strokeStyle = 'rgba(92,70,70,0.4)'
      g.lineWidth = 2.2
      g.stroke()
    }
  }
  return c
}

// The evening the wall turns into, painted wet in wet: deep blue sinking
// through violet and rose to a gold afterglow, a moon in its halo, stars, and
// hills laid in as soft washes that bleed into the sky.
export function paintNight(seed: number): HTMLCanvasElement {
  const r = rng(seed)
  const W = 1024
  const H = 512
  const [c, g] = canvas(W, H)
  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#1d2760')
  sky.addColorStop(0.3, '#2c387c')
  sky.addColorStop(0.55, '#55549a')
  sky.addColorStop(0.72, '#9a6f9c')
  sky.addColorStop(0.84, '#dc9484')
  sky.addColorStop(0.93, '#f3ba82')
  sky.addColorStop(1, '#f6cf94')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  blotches(g, r, W, H * 0.6, 22, '104,116,196', 0.2, 150)
  blotches(g, r, W, H * 0.5, 14, '22,26,84', 0.2, 170)
  blotches(g, r, W, H * 0.9, 9, '226,150,170', 0.12, 190)
  // Long thin clouds catching the last light.
  for (let i = 0; i < 9; i++) {
    const x = r() * W
    const y = H * (0.5 + r() * 0.32)
    const w = 120 + r() * 240
    const grad = g.createRadialGradient(x, y, 0, x, y, w)
    grad.addColorStop(0, `rgba(255,${190 + r() * 30},${160 + r() * 30},0.3)`)
    grad.addColorStop(1, 'rgba(255,200,170,0)')
    g.save()
    g.translate(x, y)
    g.scale(1, 0.07 + r() * 0.05)
    g.translate(-x, -y)
    g.fillStyle = grad
    g.fillRect(x - w, y - w, w * 2, w * 2)
    g.restore()
  }
  // Stars: a few large and soft, many small.
  for (let i = 0; i < 170; i++) {
    const x = r() * W
    const y = r() * H * 0.62
    const big = r() < 0.1
    const rad = big ? 2 + r() * 1.4 : 0.8 + r() * 1
    const fade = 1 - (y / (H * 0.62)) * 0.6
    if (big) {
      const halo = g.createRadialGradient(x, y, 0, x, y, rad * 6)
      halo.addColorStop(0, 'rgba(255,244,210,0.4)')
      halo.addColorStop(1, 'rgba(255,244,210,0)')
      g.fillStyle = halo
      g.fillRect(x - rad * 6, y - rad * 6, rad * 12, rad * 12)
    }
    g.beginPath()
    g.arc(x, y, rad, 0, Math.PI * 2)
    g.fillStyle = `rgba(255,${238 + r() * 14},${200 + r() * 40},${(0.55 + r() * 0.45) * fade})`
    g.fill()
  }
  // The moon.
  const mx = 250
  const my = 208
  const halo = g.createRadialGradient(mx, my, 18, mx, my, 170)
  halo.addColorStop(0, 'rgba(255,240,200,0.5)')
  halo.addColorStop(0.35, 'rgba(255,236,196,0.14)')
  halo.addColorStop(1, 'rgba(255,236,196,0)')
  g.fillStyle = halo
  g.fillRect(mx - 170, my - 170, 340, 340)
  g.beginPath()
  g.arc(mx, my, 30, 0, Math.PI * 2)
  g.fillStyle = '#fff4d6'
  g.fill()
  g.save()
  g.clip()
  for (let i = 0; i < 5; i++) {
    g.beginPath()
    g.arc(mx - 18 + r() * 36, my - 18 + r() * 36, 4 + r() * 8, 0, Math.PI * 2)
    g.fillStyle = 'rgba(222,196,160,0.3)'
    g.fill()
  }
  g.restore()
  // Hills: each a soft-edged wash, lighter and mistier the farther it is.
  const hill = (y0: number, amp: number, rgb: string, ph: number, blur: number, alpha: number) => {
    g.save()
    g.shadowColor = `rgba(${rgb},${alpha})`
    g.shadowBlur = blur
    g.shadowOffsetX = 3000
    g.fillStyle = '#000'
    g.beginPath()
    g.moveTo(-3040, H + 40)
    for (let x = -40; x <= W + 40; x += 16) g.lineTo(x - 3000, y0 + Math.sin(x / 170 + ph) * amp + Math.sin(x / 67 + ph * 3) * amp * 0.28)
    g.lineTo(W + 40 - 3000, H + 40)
    g.closePath()
    g.fill()
    g.restore()
  }
  hill(H * 0.87, 15, '122,100,158', 0.4, 22, 0.75)
  hill(H * 0.915, 12, '86,84,146', 2.1, 16, 0.85)
  hill(H * 0.955, 9, '56,62,120', 4, 10, 0.95)
  // A wood along the near hill, dabbed in.
  for (let x = 0; x < W; x += 7 + r() * 22) {
    if (Math.sin(x / 90) < -0.2) continue
    const y = H * 0.955 + Math.sin(x / 170 + 4) * 9 + Math.sin(x / 67 + 12) * 2.5
    const rad = 7 + r() * 10
    const grad = g.createRadialGradient(x, y - rad * 0.5, 0, x, y - rad * 0.5, rad * 1.5)
    grad.addColorStop(0, 'rgba(44,50,104,0.8)')
    grad.addColorStop(0.6, 'rgba(44,50,104,0.5)')
    grad.addColorStop(1, 'rgba(44,50,104,0)')
    g.fillStyle = grad
    g.fillRect(x - rad * 2, y - rad * 2.2, rad * 4, rad * 3.4)
  }
  // The foot of the sky sinks into the dusk of the floor.
  const foot = g.createLinearGradient(0, H * 0.94, 0, H)
  foot.addColorStop(0, 'rgba(52,56,112,0)')
  foot.addColorStop(1, 'rgba(52,56,112,0.85)')
  g.fillStyle = foot
  g.fillRect(0, H * 0.94, W, H * 0.06)
  return c
}

// A round soft light.
export function paintGlow(): HTMLCanvasElement {
  const [c, g] = canvas(128, 128)
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,226,150,1)')
  grad.addColorStop(0.25, 'rgba(255,196,110,0.55)')
  grad.addColorStop(0.6, 'rgba(255,160,80,0.14)')
  grad.addColorStop(1, 'rgba(255,150,70,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return c
}

// A soft dark pool for whatever stands on the floor.
export function paintBlob(): HTMLCanvasElement {
  const [c, g] = canvas(128, 128)
  g.shadowColor = 'rgba(52,28,12,1)'
  g.shadowBlur = 18
  g.shadowOffsetX = 300
  g.fillStyle = '#000'
  g.beginPath()
  g.roundRect(26 - 300, 26, 76, 76, 12)
  g.fill()
  return c
}

// A small arched window with a lamp lit behind it.
export function paintWindow(): HTMLCanvasElement {
  const [c, g] = canvas(64, 96)
  const shape = () => {
    g.beginPath()
    g.moveTo(8, 90)
    g.lineTo(8, 34)
    g.arc(32, 34, 24, Math.PI, 0)
    g.lineTo(56, 90)
    g.closePath()
  }
  shape()
  const grad = g.createLinearGradient(0, 8, 0, 92)
  grad.addColorStop(0, '#fff0b8')
  grad.addColorStop(0.6, '#ffc868')
  grad.addColorStop(1, '#f09a48')
  g.fillStyle = grad
  g.fill()
  g.strokeStyle = 'rgba(110,70,50,0.9)'
  g.lineWidth = 5
  g.stroke()
  g.beginPath()
  g.moveTo(32, 12)
  g.lineTo(32, 90)
  g.moveTo(9, 52)
  g.lineTo(55, 52)
  g.strokeStyle = 'rgba(110,70,50,0.75)'
  g.lineWidth = 3.5
  g.stroke()
  return c
}

// Inside a lit gateway: lamplight on the far wall and a flagged floor.
export function paintHall(): HTMLCanvasElement {
  const [c, g] = canvas(128, 128)
  const grad = g.createRadialGradient(64, 52, 4, 64, 64, 96)
  grad.addColorStop(0, '#fff0b4')
  grad.addColorStop(0.35, '#ffc266')
  grad.addColorStop(1, '#b8603a')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return c
}
