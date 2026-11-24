import { CREAM, DYE, INK, drawLiving, paintSmall } from './figures'
import { isEverything, type Idea } from './learner'
import { ellipse, flat, soft, type G, type Sprites } from './litho'
import { REST } from './motion'
import { THINGS, thingOf, type Kind, type ThingId } from './things'
import { SIZE } from './layout'

// What he thinks, as a picture of the very things in the house: a pool of the
// colour, the bare shape of the kind, a patch with spots, a pair of eyes, and
// for everything all the kinds in a heap. Drawn in a square of 120 about its
// middle, once for each idea.

const BARE = '#8b8375'
const BOX = [-66, -66, 132, 132] as const

function paintFigure(c: G, s: Sprites, kind: Kind, size: number): void {
  const { h, w } = SIZE[kind]
  const k = size / Math.max(h, w)
  c.save()
  c.translate(0, size * 0.48)
  c.scale(k, k)
  drawLiving(kind, { g: c, s, pose: { ...REST }, gaze: { x: 0, y: 0.1 }, t: 0, place: 'bed' })
  c.restore()
}

function eyes(c: G, x: number, y: number, r: number): void {
  for (const side of [-1, 1]) {
    flat(c, ellipse(x + side * r * 1.1, y, r, r * 1.15), '#fffaf0', [0, 0, 1, 1], 0)
    flat(c, ellipse(x + side * r * 1.1, y + 1, r * 0.48, r * 0.5), INK, [0, 0, 1, 1], 0)
  }
}

function paint(c: G, s: Sprites, idea: Idea): void {
  const spot = (dots: readonly (readonly [number, number, number])[]) => {
    c.fillStyle = CREAM
    for (const [x, y, r] of dots) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill() }
  }
  if (isEverything(idea)) {
    const heap: readonly (readonly [Kind, number, number, number, string])[] = [['king', 22, -26, 62, ''], ['queen', -26, -28, 66, ''], ['cat', -38, 20, 44, ''], ['piglet', 40, 22, 46, '']]
    for (const [kind, x, y, size] of heap) { c.save(); c.translate(x, y); paintFigure(c, s, kind, size); c.restore() }
    const small: readonly (readonly [Kind, number, number, keyof typeof DYE, boolean])[] = [['hat', 0, 46, 'red', true], ['sock', -20, 56, 'blue', true], ['teapot', 24, 56, 'yellow', false]]
    for (const [kind, x, y, colour, spots] of small) { c.save(); c.translate(x, y); c.scale(0.42, 0.42); paintSmall(c, kind, DYE[colour], spots); c.restore() }
    return
  }
  const colour = idea.colour ? DYE[idea.colour] : BARE
  if (idea.kind) {
    if (idea.kind === 'sock' || idea.kind === 'hat' || idea.kind === 'teapot') {
      c.save(); c.translate(0, 44); c.scale(0.98, 0.98); paintSmall(c, idea.kind, colour, idea.spots === true, idea.colour ? 0.55 : 0.2); c.restore()
      return
    }
    paintFigure(c, s, idea.kind, 112)
    if (!idea.colour) {
      // His idea is the shape and not its colour.
      c.globalCompositeOperation = 'source-atop'
      c.globalAlpha = 0.86
      c.fillStyle = BARE
      c.fillRect(-66, -66, 132, 132)
      c.globalAlpha = 1
      c.globalCompositeOperation = 'source-over'
    }
    return
  }
  if (idea.colour || idea.spots) {
    const pool = soft([-34, -42], [6, -54], [46, -36], [54, 2], [36, 40], [-4, 52], [-44, 36], [-56, -4])
    if (idea.colour) flat(c, pool, colour, [-54, -52, 108, 104], 0.4)
    else flat(c, soft([-46, -46], [46, -46], [50, 46], [-50, 46]), BARE, [-48, -46, 96, 92], 0.2)
    if (idea.spots) spot([[-22, -22, 10], [14, -30, 9], [34, -4, 10], [-34, 12, 9], [0, 4, 11], [22, 30, 10], [-14, 34, 9]])
    if (idea.alive) eyes(c, 0, -2, 18)
    return
  }
  eyes(c, 0, 0, 27)
}

export function drawIdea(g: G, s: Sprites, idea: Idea): void {
  const key = `idea ${idea.colour ?? ''} ${idea.kind ?? ''} ${idea.spots ?? ''} ${idea.alive ?? ''}`
  s.stamp(g, key, BOX, (c) => paint(c, s, idea))
}

/** One thing small, as it is thought or dreamed of, about its middle in a square of `size`. */
export function drawMini(g: G, s: Sprites, id: ThingId, size: number): void {
  const thing = thingOf(id)
  s.stamp(g, `mini ${id} ${Math.round(size)}`, [-size * 0.62, -size * 0.66, size * 1.24, size * 1.3], (c) => {
    if (THINGS.some((one) => one.id === id && !one.alive)) {
      const k = size / Math.max(SIZE[thing.kind].h, SIZE[thing.kind].w)
      c.translate(0, size * 0.46)
      c.scale(k, k)
      paintSmall(c, thing.kind, DYE[thing.colour!], thing.spots)
    } else paintFigure(c, s, thing.kind, size)
  })
}
