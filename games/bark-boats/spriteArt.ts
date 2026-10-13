import type { Spot } from './layout'
import { BREATH } from './pokeActs'
import { INK, flat, grained, line, oval, printOnce, stamp, trace, wiped, type G, type Stamp } from './print'
import type { SpriteRig } from './rig'

// The water sprite, up to her waist in the brook among the rushes. She
// has no weight: she sways like weed. Her body, her hair that runs like the
// water's lines and her head are printed once as one sheet. Her cheeks, her
// eyes, her mouth, her poking arm, the water round her and her breath are
// the pen's, one path each.

export type SpriteStamps = { body: Stamp }

/** Her mouth, from where the water meets her; the same spot the breath is measured from (layout.ts). */
const MOUTH = { x: -54, y: -98 } as const

export function printSprite(density: number): SpriteStamps {
  const body = printOnce(260, 240, 134, 214, density, (g) => {
    // Her hair: one long fall down her back and into the brook.
    trace(g, [-30, -186, 30, -190, 70, -150, 84, -90, 80, -40, 104, 4, 60, 10, 44, -30, 36, -90, 20, -140], true)
    wiped(g, INK.spriteDeep, INK.indigo, -190, 10)
    line(g, 2.4)
    // It runs like the brook's own lines: long strands that curl at their ends, each of its own length.
    for (const [x, long, curl] of [[40, 150, 12], [52, 120, -8], [64, 136, 10], [76, 84, -6]] as const) {
      trace(g, [x - 8, -150 + (x - 40), x + 4, -150 + long * 0.5, x + 18, -150 + long * 0.9, x + 18 + curl, -150 + long])
      line(g, 2, x % 24 === 4 ? INK.line : 'rgba(246,240,222,0.85)')
    }
    // A slim body from the shoulders down, in the water to the waist.
    trace(g, [-30, -72, 0, -78, 30, -72, 40, -30, 42, 8, -42, 8, -40, -30], true)
    wiped(g, INK.sprite, INK.spriteDeep, -78, 8)
    line(g, 2.4)
    // Her far arm, at her side.
    trace(g, [28, -60, 54, -30, 44, 0])
    line(g, 19, INK.line)
    line(g, 14.5, INK.sprite)
    // The head: round, with room for cheeks, and the whites of her eyes.
    oval(g, -6, -122, 60, 58)
    wiped(g, '#c4e6df', INK.sprite, -180, -64)
    line(g, 2.4)
    for (const side of [-1, 1]) {
      oval(g, -12 + side * 22, -138, 8, 9)
      flat(g, INK.white)
      line(g, 1.5)
    }
    // A crown of three reed leaves, each at its own lean.
    for (const [x, turn, long] of [[-24, -0.6, 18], [-1, 0.05, 23], [21, 0.5, 16]] as const) {
      oval(g, x, -182, 7, long, turn)
      flat(g, INK.moss)
      line(g, 1.6)
    }
    grained(g, -134, -214, 260, 240, 0.16)
  })
  return { body }
}

/** Draws the sprite where the water meets her at `at`. Every field of her rig is read here. */
export function drawSprite(g: G, stamps: SpriteStamps, r: SpriteRig, at: Spot): void {
  const x = at.x + r.dx, y = at.y + r.sink
  g.save()
  // She sinks into the water she stands in, and nothing of her shows below it.
  g.beginPath()
  g.rect(x - 400, at.y - 420, 800, 430)
  g.clip()
  stamp(g, stamps.body, x, y, r.sway)
  g.translate(x, y)
  g.rotate(r.sway)
  // Her near arm: trailing in the water, or reached out to poke.
  g.beginPath()
  g.moveTo(-26, -60)
  g.quadraticCurveTo(-66 - 30 * r.arm, -36 - 20 * r.arm, -92 - 70 * r.arm, -4 - 34 * r.arm)
  line(g, 15, INK.sprite)
  // Cheeks: half full at rest, full to bursting before she blows, and dark when she has blown too long.
  const round = 15 + r.cheeks * 15
  g.beginPath()
  for (const side of [-1, 1]) {
    const cx = -10 + side * 36 - r.cheeks * 4
    g.moveTo(cx + round, -104)
    g.ellipse(cx, -104, round, round * 0.92, 0, 0, Math.PI * 2)
  }
  flat(g, r.dark > 0.5 ? '#b0524f' : r.dark > 0.15 ? '#d97a72' : '#f0a79a')
  // Eyes: pupils that follow, or lids squeezed shut to blow.
  g.beginPath()
  for (const side of [-1, 1]) {
    const ex = -12 + side * 22, ey = -138
    if (r.lids > 0.3) {
      g.moveTo(ex + r.lookX * 3.5 + 4, ey + r.lookY * 3.5)
      g.ellipse(ex + r.lookX * 3.5, ey + r.lookY * 3.5, 4, 4.4 * r.lids, 0, 0, Math.PI * 2)
    } else {
      g.moveTo(ex - 10, ey - 9)
      g.lineTo(ex + 10, ey - 9)
      g.lineTo(ex + 10, ey + 3)
      g.quadraticCurveTo(ex, ey + 9, ex - 10, ey + 3)
    }
  }
  flat(g, r.lids > 0.3 ? INK.line : '#a9d6d0')
  // The mouth: a small smile, or a round hole on the downstream side of her face.
  if (r.mouth > 0.1) {
    oval(g, MOUTH.x * r.mouth - 10 * (1 - r.mouth), MOUTH.y, 4 + 6 * r.mouth, 4 + 8 * r.mouth)
    flat(g, INK.line)
  } else {
    trace(g, [-22, -98, -10, -92, 2, -98])
    line(g, 2.2)
  }
  g.restore()
  // The water where she stands: two arcs of unequal reach, one inside the other.
  g.beginPath()
  g.ellipse(at.x + r.dx - 20, at.y + 2, 82, 13, 0, 0.1, Math.PI - 0.1)
  g.moveTo(at.x + r.dx + 62, at.y + 12)
  g.ellipse(at.x + r.dx - 34, at.y + 10, 96, 14, 0, 0.3, Math.PI - 0.5)
  line(g, 2, 'rgba(246,240,222,0.85)')
  // Her breath: three curled lines that run downstream as far as it has gone.
  if (r.breath > 0.01) {
    const from = at.x + MOUTH.x - 14, my = at.y + MOUTH.y, far = Math.max(60, BREATH.reach * r.breath)
    g.beginPath()
    for (const [dy, part] of [[-18, 1], [0, 0.86], [18, 0.7]] as const) {
      const end = from - far * part
      g.moveTo(from, my + dy * 0.3)
      g.quadraticCurveTo((from + end) / 2, my + dy * 1.5, end, my + dy * 1.2 + 26)
      g.quadraticCurveTo(end - 16, my + dy * 1.2 + 6, end + 2, my + dy * 1.2 + 12)
    }
    line(g, 2.6, 'rgba(246,240,222,0.9)')
  }
}
