import { INK } from './lookInk'
import { wispNow, type Extra, type Wisp } from './wisps'

// Steam, shimmer, a cloud, smoke and a rolling seed, in the look: flat ink with
// hard edges. Steam is a carved curl of bare paper, like the heat marks over
// the oven; a cloud is a scalloped patch of paper; smoke is the same in key
// block with a cleared rim, so that it reads on the dark wall; none of them
// fades: each thins and shrinks away. A handful of small paths a frame.

type G = CanvasRenderingContext2D

/** A wavy ribbon rising from (x, y): `wide` at its middle, pointed at both ends. */
function curl(g: G, x: number, y: number, tall: number, wide: number, lean: number, phase: number): void {
  const n = 9
  for (let side = 0; side < 2; side++) for (let i = 0; i <= n; i++) {
    const s = side === 0 ? i / n : 1 - i / n, w = Math.sin(Math.PI * s) * wide * (side === 0 ? 1 : -1)
    const px = x + Math.sin(s * 5.2 + phase) * lean + w, py = y - s * tall
    if (side === 0 && i === 0) g.moveTo(px, py); else g.lineTo(px, py)
  }
  g.closePath()
}

/** A scalloped patch: five lobes round a middle. */
function puff(g: G, x: number, y: number, r: number): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4, lobe = r * (0.52 + 0.1 * ((i * 7) % 3))
    g.moveTo(x + Math.cos(a) * r * 0.5 + lobe, y + Math.sin(a) * r * 0.36)
    g.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.36, lobe, 0, Math.PI * 2)
  }
}

/**
 * Draws the wisps. `px` and `py` take reference units to logical pixels and
 * `unit` is logical pixels per reference unit. Returns how many fills it made.
 */
export function drawWisps(g: G, wisps: readonly Wisp[], px: (x: number) => number, py: (y: number) => number, unit: number): number {
  if (wisps.length === 0) return 0
  let fills = 0
  const paper = (draw: () => void) => { g.fillStyle = INK.paper; g.beginPath(); draw(); g.fill(); fills++ }
  const key = (draw: () => void) => { g.fillStyle = INK.key; g.beginPath(); draw(); g.fill(); fills++ }
  const of = (kind: Wisp['kind']) => wisps.filter((wisp) => wisp.kind === kind)
  const steam = of('steam'), shimmer = of('shimmer'), clouds = of('cloud'), smoke = of('smoke'), seeds = of('seed')
  if (steam.length + shimmer.length > 0) paper(() => {
    for (const wisp of steam) { const now = wispNow(wisp), s = wisp.size * unit; curl(g, px(now.x), py(now.y), 34 * s * (0.5 + 0.5 * now.full), 4.2 * s * now.full, 7 * s, wisp.age * 4 + wisp.sway * 9) }
    for (const wisp of shimmer) {
      const now = wispNow(wisp), s = wisp.size * unit
      for (const side of [-1, 0, 1]) curl(g, px(now.x) + side * 20 * s, py(now.y), 22 * s, 2.4 * s * now.full, 4 * s, wisp.age * 7 + side * 2)
    }
  })
  if (clouds.length > 0) paper(() => { for (const wisp of clouds) { const now = wispNow(wisp); puff(g, px(now.x), py(now.y), 30 * wisp.size * unit * (0.35 + 0.65 * now.full)) } })
  if (smoke.length > 0) {
    // The cleared rim first, then the key block inside it.
    paper(() => { for (const wisp of smoke) { const now = wispNow(wisp); puff(g, px(now.x), py(now.y), (24 * (0.35 + 0.65 * now.full) + 3.5) * wisp.size * unit) } })
    key(() => { for (const wisp of smoke) { const now = wispNow(wisp); puff(g, px(now.x), py(now.y), 24 * wisp.size * unit * (0.35 + 0.65 * now.full)) } })
  }
  const sheens = of('sheen')
  if (sheens.length > 0) key(() => {
    // A thin dark crescent on the pale dough: the carved sheen mark, sliding once across it.
    for (const wisp of sheens) {
      const now = wispNow(wisp), r = 20 * wisp.size * unit, cx = px(now.x), cy = py(now.y), thick = 3.2 * wisp.size * unit * now.full
      g.moveTo(cx + r * Math.cos(3.6), cy + r * Math.sin(3.6))
      g.arc(cx, cy, r, 3.6, 5.2)
      g.arc(cx, cy + thick, r, 5.2, 3.6, true)
      g.closePath()
    }
  })
  const frost = of('frost')
  if (frost.length > 0) paper(() => {
    // A small fern of frost: a stem with two nicks to either side, none crossing it.
    for (const wisp of frost) {
      const now = wispNow(wisp), s = wisp.size * unit * now.full, a = -Math.PI / 2 + now.turn, ux = Math.cos(a), uy = Math.sin(a), cx = px(now.x), cy = py(now.y)
      const nick = (x: number, y: number, angle: number, long: number, wide: number) => {
        const dx = Math.cos(angle), dy = Math.sin(angle)
        g.moveTo(x - dy * wide, y + dx * wide); g.lineTo(x + dx * long, y + dy * long); g.lineTo(x + dy * wide, y - dx * wide); g.closePath()
      }
      nick(cx, cy, a, 20 * s, 2.2 * s)
      for (const at of [6, 12]) for (const side of [-1, 1]) nick(cx + ux * at * s, cy + uy * at * s, a + side * 0.9, (11 - at * 0.4) * s, 1.6 * s)
    }
  })
  if (seeds.length > 0) {
    paper(() => { for (const wisp of seeds) { const now = wispNow(wisp); g.ellipse(px(now.x), py(now.y), 6.4 * wisp.size * unit, 4.2 * wisp.size * unit, now.turn, 0, Math.PI * 2) } })
    key(() => { for (const wisp of seeds) { const now = wispNow(wisp); g.moveTo(px(now.x), py(now.y)); g.ellipse(px(now.x), py(now.y), 4.6 * wisp.size * unit, 2.6 * wisp.size * unit, now.turn, 0, Math.PI * 2) } })
  }
  return fills
}

/** Draws the extras. Returns how many fills it made. */
export function drawExtras(g: G, extras: readonly Extra[], px: (x: number) => number, py: (y: number) => number, unit: number): number {
  let fills = 0
  for (const extra of extras) {
    g.beginPath()
    if (extra.kind === 'strings') {
      // Three strings of dough from the teeth to the hatch, each sagging its own way, thinning as they stretch.
      g.fillStyle = INK.paper
      const ax = px(extra.x0), ay = py(extra.y0), bx = px(extra.x1), by = py(extra.y1), w = extra.thick * unit
      for (const [off, sag] of [[-7, 0.16], [0, -0.1], [8, 0.22]] as const) {
        const mx = (ax + bx) / 2 + (by - ay) * sag, my = (ay + by) / 2 - (bx - ax) * sag, o = off * unit
        g.moveTo(ax + o - w, ay); g.quadraticCurveTo(mx + o - w * 0.3, my, bx + o * 0.4 - w, by)
        g.lineTo(bx + o * 0.4 + w, by); g.quadraticCurveTo(mx + o + w * 0.3, my, ax + o + w, ay)
        g.closePath()
      }
    } else if (extra.kind === 'seed') {
      g.fillStyle = INK.paper
      g.ellipse(px(extra.x), py(extra.y), 7 * extra.size * unit, 4.6 * extra.size * unit, extra.turn, 0, Math.PI * 2)
      g.fill(); fills++
      g.beginPath()
      g.fillStyle = INK.key
      g.ellipse(px(extra.x), py(extra.y), 5 * extra.size * unit, 2.8 * extra.size * unit, extra.turn, 0, Math.PI * 2)
    } else {
      // Soot: a ragged smudge of key block, with no rim.
      g.fillStyle = INK.key
      const r = 9 * extra.size * unit, cx = px(extra.x), cy = py(extra.y)
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, d = r * (0.7 + 0.3 * ((i * 5) % 3) / 2); if (i === 0) g.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); else g.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d) }
      g.closePath()
    }
    g.fill(); fills++
  }
  return fills
}
