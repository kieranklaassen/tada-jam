import { BASKET, COUNTER, LANTERNS, POT, STICK, WINDOW } from './hall'
import { DARK, GLOW, alpha, brush, daub, dot, dryBrush, mix, oval, pool, slab, type Light, type Pen } from './paint'
import { makeRng } from './rng'

// What is the same at every place in the hall, painted once for each size of
// the surface and stamped whole each frame: the back wall in its dark state
// with the light of every flame painted into it, the window, the garland, the
// counter and the cloth down its front. Each place's own bench and its front
// are in bays.ts. What moves (the wax, the snow, the flames, the fair-goers)
// is drawn over it by the view.

export const WALL = '#3a2416'
export const BEAM = '#24160e'
export const WOOD = '#6b4426'
const CLOTH = '#27402f'
export const COPPER = '#b0562c'
export const FIR = '#1f3a2a'
export const NIGHT = '#1d2f55'
export const WICKER = '#8a5a2c'

/** The colours of the three waxes, lit: gold, red and green. */
export const WAX = ['#f0b03c', '#cf4a36', '#5f9a4c'] as const
export const WAX_PALE = ['#ffe6a0', '#f4a58e', '#b9dc9a'] as const

/** The stage rect the painting must cover: the stage and whatever of the surface shows beyond it. */
export type Extent = { x: number; y: number; w: number; h: number }

/**
 * The hall as a list of steps, each a part of the painting: the view lays them into one sprite, all at once on
 * load and one a frame when the surface changes size or sharpness, so no frame carries the whole of it.
 */
export function hallSteps(extent: Extent): ((g: Pen) => void)[] {
  const rng = makeRng(20241201)
  const { x: X, y: Y, w: W, h: H } = extent
  return [
    (g) => {
      // The back wall: brown dark, brushed.
      g.fillStyle = WALL
      g.fillRect(X, Y, W, H)
      dryBrush(g, X, Y, W, COUNTER.back - Y, '#5a3a22', 150, rng, 150, 30, 0.2)
      dryBrush(g, X, Y, W, COUNTER.back - Y, DARK, 120, rng, 170, 34, 0.24)
      // Planks of the wall, barely there.
      for (let x = X + 40; x < X + W; x += 118) brush(g, [x, Y, x + 4, 300, x - 3, COUNTER.back], alpha(DARK, 0.3), 5)
    },
    (g) => {
      // The window: a round arch in a dark frame, and through it the night, the moon, a fir and a roof under snow.
      const wx = WINDOW.x, wy = WINDOW.y, ww = WINDOW.w, wh = WINDOW.h
      slab(g, wx - 14, wy + 44, ww + 28, wh - 28, BEAM)
      daub(g, oval(wx + ww / 2, wy + 46, ww / 2 + 14, 66, undefined, 0, 14), BEAM)
      slab(g, wx, wy + 46, ww, wh - 46, NIGHT)
      daub(g, oval(wx + ww / 2, wy + 48, ww / 2 - 2, 52, undefined, 0, 14), NIGHT)
      dryBrush(g, wx, wy + 10, ww, wh - 20, '#34518a', 14, rng, 70, 20, 0.28)
      dot(g, wx + 46, wy + 66, 13, '#e6ebf6')
      daub(g, [wx, wy + wh, wx, wy + 196, wx + 64, wy + 180, wx + ww, wy + 204, wx + ww, wy + wh], '#a9b7d2')
      // A house as wide as its roof, with a chimney at one side and snow lying round on it: a lump, not a point.
      slab(g, wx + 90, wy + 152, 70, 44, '#172340')
      slab(g, wx + 140, wy + 122, 11, 24, '#172340')
      daub(g, [wx + 84, wy + 158, wx + 94, wy + 138, wx + 118, wy + 130, wx + 148, wy + 137, wx + 166, wy + 158], '#cbd6e8')
      dot(g, wx + 114, wy + 178, 7, '#f1b24a')
      daub(g, [wx + 16, wy + 198, wx + 42, wy + 118, wx + 68, wy + 198], '#14304a')
      // Snow on the fir: three round dabs in a lump, never a bent stroke.
      for (const [dx, dy, r] of [[32, 165, 5], [42, 158, 6.5], [53, 166, 5]] as const) dot(g, wx + dx, wy + dy, r, '#cbd6e8')
      slab(g, wx - 20, wy + wh, ww + 40, 14, '#4a2f1c')
      // The glazing bars.
      brush(g, [wx + ww / 2, wy, wx + ww / 2, wy + wh], mix(NIGHT, '#0c0806', 0.7), 7)
      brush(g, [wx, wy + 120, wx + ww, wy + 120], mix(NIGHT, '#0c0806', 0.7), 7)
    },
    (g) => {
      // Light painted into the wall: a pool round every lantern and the great glow of the bench.
      g.save()
      g.globalCompositeOperation = 'lighter'
      for (const lantern of LANTERNS) pool(g, lantern.x, lantern.y + 30, 230, GLOW, 0.24)
      pool(g, POT.x, POT.y - 40, 520, '#ff9a3c', 0.26)
      pool(g, POT.x, POT.y - 10, 250, '#ffc45e', 0.24)
      g.restore()
      // The canopy beam.
      g.fillStyle = BEAM
      g.fillRect(X, Y, W, 44 - Y)
      dryBrush(g, X, Y, W, 44 - Y, '#4a2f1c', 40, rng, 200, 12, 0.3)
    },
    (g) => {
      // The garland slung under the beam, and the cords of the lanterns.
      for (let i = 0; i < 4; i++) {
        const x0 = 20 + i * 290, x1 = x0 + 270, sag = 54 + (i % 2) * 14
        brush(g, [x0, 40, (x0 + x1) / 2, 40 + sag * 2 - 40, x1, 40], FIR, 30)
        for (let k = 0; k < 16; k++) {
          const t = (k + 0.5) / 16, x = x0 + (x1 - x0) * t, y = 40 + Math.sin(t * Math.PI) * (sag - 6)
          brush(g, [x, y - 4, x + (rng.next() - 0.5) * 30, y + 14 + rng.next() * 16], mix(FIR, '#4f7a4a', rng.next() * 0.6), 5)
        }
      }
      // Paper stars on the garland, dull in the dark: they hang too high to be handled.
      for (const [sx, sy, c] of [[250, 92, '#8a3a2c'], [1010, 84, '#9a7a34'], [884, 66, '#5d7a50']] as const) {
        const star: number[] = []
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2, r = k % 2 ? 9 : 21
          star.push(sx + Math.cos(a) * r, sy + Math.sin(a) * r)
        }
        daub(g, star, c)
      }
      for (const lantern of LANTERNS) brush(g, [lantern.x, 40, lantern.x, lantern.y - 26], BEAM, 3)
    },
    (g) => {
      // The counter: its top, lit from the bench, and the cloth that hangs down its front to the floor.
      const top = [X, COUNTER.back, X + W, COUNTER.back, X + W, COUNTER.front + 8, X, COUNTER.front + 8]
      daub(g, top, WOOD)
      dryBrush(g, X, COUNTER.back, W, COUNTER.front - COUNTER.back, '#8f6238', 50, rng, 220, 7, 0.24)
      dryBrush(g, X, COUNTER.back, W, COUNTER.front - COUNTER.back, DARK, 30, rng, 240, 5, 0.16)
      g.fillStyle = CLOTH
      g.fillRect(X, COUNTER.front, W, Y + H - COUNTER.front)
      dryBrush(g, X, COUNTER.front, W, Y + H - COUNTER.front, '#3f6247', 60, rng, 130, 22, 0.14)
      dryBrush(g, X, COUNTER.front, W, Y + H - COUNTER.front, DARK, 40, rng, 140, 24, 0.16)
      // Folds of the cloth.
      for (let x = X + 30; x < X + W; x += 96) brush(g, [x, COUNTER.front + 6, x + 8, 760, x - 2, Y + H], alpha(DARK, 0.26), 16)
      brush(g, [X, COUNTER.front + 2, X + W, COUNTER.front + 2], alpha(DARK, 0.5), 5)
    },
    (g) => {
      // A swag of fir along the cloth, with small red apples tied in.
      for (let i = 0; i < 5; i++) {
        const x0 = X + ((i * W) / 5), x1 = x0 + W / 5
        brush(g, [x0, COUNTER.front + 8, (x0 + x1) / 2, COUNTER.front + 48, x1, COUNTER.front + 8], FIR, 18)
        for (let k = 0; k < 12; k++) {
          const t = (k + 0.5) / 12, x = x0 + (x1 - x0) * t, y = COUNTER.front + 8 + Math.sin(t * Math.PI) * 20
          brush(g, [x, y - 6, x + (rng.next() - 0.5) * 24, y + 8 + rng.next() * 10], mix(FIR, '#4f7a4a', rng.next() * 0.6), 5)
        }
        // An apple where two swags meet, each its own size and a little off the join, and none at the middle one.
        if (i !== 2) dot(g, x0 + [4, -9, 0, 12, -3][i], COUNTER.front + [16, 20, 0, 13, 19][i], [9, 7, 0, 10, 8][i], '#9a3526')
      }
      // The bench's glow on the counter and the cloth.
      g.save()
      g.globalCompositeOperation = 'lighter'
      pool(g, POT.x, POT.y + 30, 330, '#ff9a3c', 0.24)
      g.restore()
    },
    (g) => {
      // The dark corners: the light falls off into brown.
      const fall = g.createRadialGradient(POT.x, POT.y - 110, 250, POT.x, POT.y - 110, 800)
      fall.addColorStop(0, alpha(DARK, 0))
      fall.addColorStop(0.6, alpha(DARK, 0.5))
      fall.addColorStop(1, alpha(DARK, 0.88))
      g.fillStyle = fall
      g.fillRect(X, Y, W, H)
    },
  ]
}

/** The basket's far side and its dark inside: what stands in it is drawn over this and under its near side. */
export function paintBasketBack(g: Pen): void {
  const rng = makeRng(77)
  daub(g, oval(BASKET.x, BASKET.y, BASKET.rx, BASKET.ry, rng, 0, 14), mix(WICKER, DARK, 0.72))
  brush(g, [BASKET.x - BASKET.rx, BASKET.y, BASKET.x, BASKET.y - BASKET.ry - 4, BASKET.x + BASKET.rx, BASKET.y], mix(WICKER, DARK, 0.3), 9)
}

/** The basket's near side: woven wicker, lit from the pot on its left. */
export function paintBasketFront(g: Pen): void {
  const rng = makeRng(78)
  const x = BASKET.x, y = BASKET.y, rx = BASKET.rx, b = BASKET.bottom
  daub(g, [x - rx, y, x - rx + 14, b - 18, x - rx + 36, b, x + rx - 36, b, x + rx - 14, b - 18, x + rx, y, x, y + BASKET.ry + 6], WICKER, { x: -1, y: -0.2 }, rng)
  // The weave: rows of short strokes, each row shifted by half a stitch.
  for (let row = 0; row < 5; row++) {
    const ry = y + 26 + row * 17, inset = 6 + row * 5
    for (let k = 0; k < 9; k++) {
      const sx = x - rx + inset + (k + (row % 2) * 0.5) * ((rx * 2 - inset * 2) / 9.5)
      brush(g, [sx, ry, sx + 15, ry + 2], mix(WICKER, k < 4 ? '#e2a55a' : DARK, 0.4), 6)
    }
  }
  brush(g, [x - rx, y, x, y + BASKET.ry + 6, x + rx, y], mix(WICKER, '#f0b874', 0.5), 10)
}

/** A lit lantern: a small tin house on a cord, with its flame behind the panes. The handle is where it hangs. */
export function paintLantern(g: Pen): void {
  brush(g, [0, 0, 0, 10], BEAM, 3)
  daub(g, [-16, 22, 0, 6, 16, 22], '#5a4a3a')
  daub(g, [-13, 24, 13, 24, 13, 56, -13, 56], '#ffcf7a')
  g.save()
  g.translate(0, 54)
  g.scale(0.62, 0.62)
  paintFlame(g)
  g.restore()
  brush(g, [-13, 24, -13, 56], '#3a2c20', 4)
  brush(g, [13, 24, 13, 56], '#3a2c20', 4)
  brush(g, [-16, 58, 16, 58], '#3a2c20', 6)
}

/** A flame: pale at the heart, orange at the edge. The handle is at its foot. */
export function paintFlame(g: Pen): void {
  daub(g, [0, 0, -8, -10, -5, -22, 0, -34, 5, -22, 8, -10], '#ff9a2e')
  daub(g, [0, -2, -4.5, -10, -2, -19, 0, -25, 2, -19, 4.5, -10], '#fff0b0')
}

/** The dipping stick: a short peeled branch with the wick knotted round its middle. The handle is the knot. */
export function paintStick(g: Pen): void {
  const rng = makeRng(5)
  daub(g, [-STICK.half, -6, -STICK.half - 4, 2, -STICK.half + 4, 8, STICK.half - 2, 7, STICK.half + 4, 0, STICK.half - 4, -7], '#c79a62', { x: 0, y: 1 }, rng, 0.8)
  dot(g, -STICK.half + 14, 0, 3, '#7a5630')
  dot(g, STICK.half - 22, 1, 2.5, '#7a5630')
  dot(g, 0, 0, 5.5, '#efe4c8')
}

/** The wax in the pot, seen a little from above: brightest in the middle, deep at the rim. The handle is its middle. */
export function paintWax(g: Pen, colour: number): void {
  g.save()
  g.scale(1, POT.ry / POT.rx)
  const fade = g.createRadialGradient(-30, -30, 10, 0, 0, POT.rx)
  fade.addColorStop(0, WAX_PALE[colour])
  fade.addColorStop(0.45, mix(WAX_PALE[colour], WAX[colour], 0.7))
  fade.addColorStop(0.85, WAX[colour])
  fade.addColorStop(1, mix(WAX[colour], '#7a3a10', 0.45))
  g.fillStyle = fade
  g.beginPath()
  g.arc(0, 0, POT.rx, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** The flakes that fall behind the window: two windows high, so one stamp of it scrolls without a seam. */
export function paintSnow(g: Pen): void {
  const rng = makeRng(9)
  for (let i = 0; i < 46; i++) {
    const x = rng.next() * WINDOW.w, y = rng.next() * WINDOW.h, r = 1.6 + rng.next() * 2.2, c = alpha('#eef3ff', 0.5 + rng.next() * 0.4)
    dot(g, x, y, r, c)
    dot(g, x, y + WINDOW.h, r, c)
  }
}

/** The ghost hand of the idle ladder: an open hand in the hall's own paint, lit like everything else. The handle is the tip of its first finger. */
export function paintHand(g: Pen): void {
  const rng = makeRng(61), L: Light = { x: -0.5, y: -1 }, skin = '#f2c9a0'
  // The cuff of a sleeve, the palm, the thumb out to one side and four fingers spread.
  daub(g, [-8, 118, -4, 92, 62, 92, 66, 118], '#b9482f', L, rng, 0.7)
  daub(g, oval(30, 66, 34, 34, rng), skin, L, rng, 0.8)
  brush(g, [58, 62, 78, 40, 84, 22], skin, 15)
  for (const [x0, y0, x1, y1, w] of [[6, 46, 0, 6, 15], [22, 40, 22, -8, 16], [40, 40, 44, -4, 15], [54, 48, 62, 14, 13]] as const) brush(g, [x0, y0, x1, y1], skin, w)
  for (const [x, y] of [[0, 6], [22, -8], [44, -4], [62, 14]] as const) dot(g, x, y + 3, 4, mix(skin, '#ffffff', 0.5))
  brush(g, [14, 74, 30, 84, 48, 76], alpha('#a8704c', 0.6), 3)
}

/** The cloth that lies over a stall's second and third colour: a folded linen with a stitched edge. The handle is its top left corner. */
export function paintCloth(g: Pen, w: number, h: number): void {
  const rng = makeRng(71)
  daub(g, [0, 12, w * 0.3, 0, w * 0.7, 6, w, 14, w + 4, h, -4, h], '#d8ccb4', { x: -0.3, y: -1 }, rng, 0.6)
  for (let x = 24; x < w; x += 44) brush(g, [x, 10, x + 6, h * 0.6, x - 2, h], alpha('#8a7a5c', 0.4), 9)
  for (let x = 10; x < w; x += 18) brush(g, [x, 18, x + 8, 18], '#b9482f', 3)
}
