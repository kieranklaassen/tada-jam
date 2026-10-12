import { HAND } from './layout'
import type { Fx } from './rig'
import { INK, flat, line, oval, printOnce, shape, trace, wiped, type G, type Stamp } from './print'

// The small printed things that are not makings: the ladder's glow and its
// ghost hand, the water's curl along a hull, the gnome's lamp shut and lit,
// the beetle, a knock's petals. And the short-lived marks of the pen: a
// splash, bubbles, drops, a puff, a spout. Each of those is one path and one
// stroke or fill, whatever it holds.

export type PropStamps = { halo: Stamp; hand: Stamp; curl: Stamp; lamp: Stamp; lit: Stamp; beetle: Stamp; petals: Stamp; fly: Stamp }

/** How far the ghost hand reaches from its fingertip: left, right, up and down. The view keeps the whole of it on the stage. */
export { HAND }

export function printProps(density: number): PropStamps {
  /** The glow on what can be picked up: a warm ring that is clear at its middle, so the thing itself stays plain. */
  const halo = printOnce(200, 200, 100, 100, density, (g) => {
    const ring = g.createRadialGradient(0, 0, 30, 0, 0, 100)
    ring.addColorStop(0, 'rgba(255,214,90,0)')
    ring.addColorStop(0.62, 'rgba(255,214,90,0.85)')
    ring.addColorStop(0.8, 'rgba(255,244,200,0.55)')
    ring.addColorStop(1, 'rgba(255,244,200,0)')
    g.fillStyle = ring
    g.fillRect(-100, -100, 200, 200)
  })
  /** The ghost hand that shows one move: a pale mitten with one finger out, its tip at the anchor. */
  const hand = printOnce(HAND.left + HAND.right + 8, HAND.up + HAND.down + 8, HAND.left + 4, HAND.up + 4, density, (g) => {
    trace(g, [0, 0, 10, 4, 12, 40, 30, 38, 46, 50, 48, 84, 30, 104, 2, 102, -14, 80, -18, 54, -10, 44, -10, 6], true)
    flat(g, 'rgba(246,240,222,0.94)')
    line(g, 2.4)
    trace(g, [12, 44, 13, 54, 11, 63])
    line(g, 1.6)
  })
  /** The water along a hull afloat: one white curl with the key line under its ends, printed for a hull one unit long. */
  const curl = printOnce(360, 26, 180, 12, density, (g) => {
    trace(g, [-170, 4, -120, -3, -40, -6, 40, -5, 118, -2, 168, 5, 120, 9, 0, 6, -122, 9], true)
    flat(g, 'rgba(246,240,222,0.95)')
    trace(g, [-172, 6, -150, 11, -128, 8])
    line(g, 2)
    trace(g, [126, 9, 152, 12, 172, 6])
    line(g, 2)
  })
  /** The gnome's lamp, shut: a small ochre box with a hoop to carry it by. */
  const lamp = printOnce(40, 52, 20, 44, density, (g) => lantern(g, false))
  /** The lamp lit: its pane yellow, and a flat pale disc of light round it. */
  const lit = printOnce(120, 120, 60, 76, density, (g) => {
    oval(g, 0, -16, 56, 56)
    flat(g, 'rgba(250,226,140,0.5)')
    oval(g, 0, -16, 34, 34)
    flat(g, 'rgba(252,238,180,0.7)')
    lantern(g, true)
  })
  const beetle = printOnce(30, 24, 15, 16, density, (g) => {
    oval(g, 0, -4, 10, 8)
    flat(g, INK.line)
    oval(g, -3, -7, 3, 2)
    flat(g, 'rgba(246,240,222,0.8)')
    trace(g, [8, -6, 12, -10, 13, -14])
    line(g, 1.4)
  })
  /** A knock's petals, as they lie when they have flown out: the view stamps them growing. */
  const petals = printOnce(120, 80, 60, 40, density, (g) => {
    for (const [x, y, turn, pale] of [[-40, -6, 0.4, 1], [-12, -26, 1.2, 0], [22, -20, 2.2, 1], [44, 4, 0.2, 0], [4, 16, 2.8, 1], [-26, 20, 1.7, 0]] as const) {
      oval(g, x, y, 7, 4, turn)
      flat(g, pale ? INK.white : '#f3b9a8')
    }
  })
  /** The dragonfly's body: a teal dart with a dark head. Its wings are the pen's. */
  const fly = printOnce(44, 14, 22, 7, density, (g) => {
    trace(g, [-20, 0, -4, 1, 12, 0])
    line(g, 4.4, INK.line)
    line(g, 2.8, INK.teal)
    oval(g, 14, 0, 4.6, 4.6)
    flat(g, INK.line)
  })
  return { halo, hand, curl, lamp, lit, beetle, petals, fly }
}

function lantern(g: G, lit: boolean): void {
  oval(g, 0, -34, 6, 6)
  line(g, 2)
  shape(g, [-12, -28, 12, -28, 14, 0, -14, 0])
  wiped(g, INK.ochre, '#a9792c', -28, 0)
  line(g, 1.8)
  shape(g, [-7, -23, 7, -23, 8, -5, -8, -5])
  flat(g, lit ? '#fff1a8' : INK.barkDeep)
  line(g, 1.4)
}

/** A short-lived mark, as one path: `k` runs 0 to 1 over its life. */
export function drawFx(g: G, fx: Fx): void {
  const { x, y, k, size } = fx
  g.globalAlpha = Math.max(0, 1 - k * k)
  g.beginPath()
  if (fx.kind === 'splash') {
    // A crown of water: curls thrown up and out from one spot, each falling back.
    for (let i = 0; i < 6; i++) {
      const way = (i - 2.5) / 2.5, reach = (30 + 54 * k) * size, up = Math.sin(k * Math.PI) * (58 + 22 * Math.abs(way)) * size
      g.moveTo(x + way * 10, y)
      g.quadraticCurveTo(x + way * reach * 0.6, y - up * 1.3, x + way * reach, y - up * 0.6)
    }
    line(g, 4 * Math.min(1.6, size), INK.white)
  } else if (fx.kind === 'bubbles') {
    for (let i = 0; i < 5; i++) {
      const bx = x + Math.sin(i * 2.4) * 16 * size, by = y - k * (50 + i * 16) * size, r = (3 + (i % 3) * 2) * size
      g.moveTo(bx + r, by)
      g.arc(bx, by, r, 0, Math.PI * 1.6)
    }
    line(g, 1.8, INK.white)
  } else if (fx.kind === 'drops') {
    for (let i = 0; i < 6; i++) {
      const way = (i - 2.5) / 2.5, dx = x + way * (20 + 40 * k) * size, dy = y - Math.sin(k * Math.PI) * 40 * size + k * k * 90 * size + (i % 2) * 10
      g.moveTo(dx + 3 * size, dy)
      g.ellipse(dx, dy, 3 * size, 5 * size, way * 0.5, 0, Math.PI * 2)
    }
    flat(g, INK.white)
  } else {
    // A spout: one thin arc of water blown up and over.
    const up = 70 * size
    g.moveTo(x, y)
    g.quadraticCurveTo(x - 6 * size, y - up, x - (26 + 30 * k) * size, y - up * (1 - k) * 0.9)
    line(g, 4 * size, INK.white)
  }
  g.globalAlpha = 1
}
