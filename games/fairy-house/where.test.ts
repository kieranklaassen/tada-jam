import { describe, expect, it } from 'vitest'
import { FOLK, HELD, PERSONALITY } from './folk'
import { FOUND, HILL_AIR, HOLLOW, ROOTS, ceilingY, rootUnder } from './kinds'
import { hillTop } from './art'
import { FINGER, drawnBox, touchBox, type Lying } from './lie'
import { CORNER } from './overlay'
import { fit } from './stage'
import { freshSave } from './save'
import { MOTH_LOOP, OWL_AT, SNAIL_PATH, SUN_AT, Toy, placeOf, sunX } from './toy'

// Where things stand on the surface. The jam's home control is 48 px round,
// 10 px from the top at the top centre, in the surface's own pixels, and the
// grown-up's corner is the top right 72 px. The stage is fitted into the
// surface, so what is clear of them at one size need not be at another: this
// holds every touchable thing clear at each surface a tablet, a laptop or a
// phone gives.

/** Surfaces from a large tablet down to a small phone, both ways up. */
const SURFACES: readonly (readonly [number, number])[] = [
  [1180, 820], [1366, 1024], [1024, 768], [1366, 700], [1194, 834], [820, 1180], [768, 1024], [1920, 1080], [2560, 1080],
  [844, 390], [667, 375], [640, 480], [568, 320], [390, 844], [320, 568], [480, 320],
]

const HOME = { r: 24, top: 10, grace: 8 }

/** A box of the stage, in the surface's pixels. */
function onSurface(box: { x: number; y: number; w: number; h: number }, width: number, height: number): { x0: number; y0: number; x1: number; y1: number } {
  const by = fit(width, height)
  return { x0: by.x + box.x * by.scale, y0: by.y + box.y * by.scale, x1: by.x + (box.x + box.w) * by.scale, y1: by.y + (box.y + box.h) * by.scale }
}

/** Whether a box of the surface is clear of the round home control at the top centre. */
function clearOfHome(b: { x0: number; y0: number; x1: number; y1: number }, width: number): boolean {
  const cx = width / 2, cy = HOME.top + HOME.r
  const dx = Math.max(b.x0 - cx, 0, cx - b.x1), dy = Math.max(b.y0 - cy, 0, cy - b.y1)
  return Math.hypot(dx, dy) > HOME.r + HOME.grace
}

const loose = (id: number): Lying => ({ kind: FOUND[id].kind, form: 'loose', x: FOUND[id].home.x, y: FOUND[id].home.y, angle: FOUND[id].home.angle, side: 1, swing: 0, sx: 1, sy: 1, snapped: false })
/** The round shape a finger takes the sun by, as the box round it. */
const sunBox = (y: number): { x: number; y: number; w: number; h: number } => ({ x: SUN_AT.x - SUN_AT.r, y: y - SUN_AT.r, w: 2 * SUN_AT.r, h: 2 * SUN_AT.r })

describe('the home control at the top centre', () => {
  it.each(SURFACES)('covers nothing a child touches on a surface of %i by %i', (width, height) => {
    // Every found thing at its place on the forest floor, where a finger takes it.
    for (const found of FOUND) expect(clearOfHome(onSurface(touchBox(loose(found.id)), width, height), width), `thing ${found.id}`).toBe(true)
    // The sun, anywhere on its track.
    for (let y = SUN_AT.y; y <= SUN_AT.under; y += 20) expect(clearOfHome(onSurface(sunBox(y), width, height), width), `sun at ${y}`).toBe(true)
    // The whole hollow, up to the top of its arch: wherever a thing can be set down or lie.
    const hollow = { x: HOLLOW.left - 24, y: ceilingY(HOLLOW.archX) - 36, w: HOLLOW.right - HOLLOW.left + 48, h: HOLLOW.floorY + 44 - (ceilingY(HOLLOW.archX) - 36) }
    expect(clearOfHome(onSurface(hollow, width, height), width), 'the hollow').toBe(true)
    // The three at their places, and the three who have nothing to do with the house.
    for (const who of FOLK) {
      const { feet, reach } = PERSONALITY[who]
      expect(clearOfHome(onSurface({ x: feet.x - reach.halfWidth, y: feet.y - reach.height, w: 2 * reach.halfWidth, h: reach.height }, width, height), width), who).toBe(true)
    }
    expect(clearOfHome(onSurface({ x: OWL_AT.x - OWL_AT.r, y: OWL_AT.y - OWL_AT.r, w: 2 * OWL_AT.r, h: 2 * OWL_AT.r }, width, height), width), 'the owl').toBe(true)
    expect(clearOfHome(onSurface({ x: SNAIL_PATH.fromX - SNAIL_PATH.r, y: SNAIL_PATH.toY - 16 - SNAIL_PATH.r, w: SNAIL_PATH.toX - SNAIL_PATH.fromX + 2 * SNAIL_PATH.r, h: SNAIL_PATH.fromY - SNAIL_PATH.toY + 2 * SNAIL_PATH.r }, width, height), width), 'the snail').toBe(true)
    expect(clearOfHome(onSurface({ x: MOTH_LOOP.x - MOTH_LOOP.rx - MOTH_LOOP.r, y: MOTH_LOOP.y - MOTH_LOOP.ry - MOTH_LOOP.r, w: 2 * (MOTH_LOOP.rx + MOTH_LOOP.r), h: 2 * (MOTH_LOOP.ry + MOTH_LOOP.r) }, width, height), width), 'the moth').toBe(true)
  })

  it('is far from the sun at any size at all, since the sun stands over the hill at the right', () => {
    for (let width = 200; width <= 3000; width += 137) for (let height = 200; height <= 2000; height += 173) {
      const b = onSurface(sunBox(SUN_AT.y), width, height)
      // The sun is in the right half of the surface, well right of the control's edge.
      expect(b.x0 - (width / 2 + HOME.r), `${width} by ${height}`).toBeGreaterThan(0)
    }
  })
})

describe('the three who have nothing to do with the house', () => {
  it.each([[820, 1180], [768, 1024], [1024, 768], [1180, 820]] as const)('are each found by a finger in a shape 48 px across or more on a tablet of %i by %i', (width, height) => {
    const { scale } = fit(width, height)
    for (const [name, r] of [['the snail', SNAIL_PATH.r], ['the owl', OWL_AT.r], ['the moth', MOTH_LOOP.r]] as const) expect(2 * r * scale, name).toBeGreaterThanOrEqual(48)
    // Like the found things, whose box is never less than a finger's room.
    expect(FINGER.w * scale).toBeGreaterThanOrEqual(48)
    expect(FINGER.h * scale).toBeGreaterThanOrEqual(48)
  })

  it('answer a touch at the very edge of that shape, and not beyond it', () => {
    for (const [name, r, at] of [['snail', SNAIL_PATH.r, null], ['owl', OWL_AT.r, OWL_AT]] as const) {
      const toy = new Toy(freshSave(7), 3)
      const snail = toy.show(null).snail
      const centre = at ?? { x: snail.x, y: snail.y - 16 }
      toy.press(centre.x - r + 1, centre.y)
      expect(toy.sounds.map((sound) => sound.from), name).toEqual([name])
      toy.release()
      toy.sounds.length = 0
      toy.press(centre.x - r - 2, centre.y)
      expect(toy.sounds.map((sound) => sound.from), name).not.toContain(name)
      toy.release()
    }
    const toy = new Toy(freshSave(7), 3), moth = toy.show(null).moth
    toy.press(moth.x + MOTH_LOOP.r - 1, moth.y)
    expect(toy.sounds.map((sound) => sound.from)).toEqual(['moth'])
  })
})

describe('what one of the three holds or wears', () => {
  it('answers as the one whose it is, at every corner of its pencil: the dustpan, the whole hat, the brush', () => {
    let seen = 0
    for (const who of FOLK) for (const [name, part] of Object.entries(HELD[who]) as [string, { at: { x: number; y: number }; ink: { x: number; y: number; w: number; h: number } }][]) {
      const feet = PERSONALITY[who].feet, { at, ink } = part
      for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]] as const) {
        const toy = new Toy(freshSave(7), 3)
        toy.press(feet.x + at.x + ink.x + 1 + fx * (ink.w - 2), feet.y + at.y + ink.y + 1 + fy * (ink.h - 2))
        expect(toy.sounds.map((sound) => sound.from), `${who}'s ${name} at ${fx}, ${fy}`).toEqual([`folk ${who}`])
        seen += 1
      }
    }
    expect(seen).toBe(20)
  })

  it('reaches past the body it belongs to, so the body alone would not answer there', () => {
    const pan = HELD.tidy.pan, hat = HELD.tiny.hat
    expect(pan.at.x + pan.ink.x).toBeLessThan(-PERSONALITY.tidy.reach.halfWidth - 40)
    expect(hat.at.y + hat.ink.y).toBeLessThan(-PERSONALITY.tiny.reach.height - 20)
  })
})

describe('the hill and the left root', () => {
  /** The three sizes the game is looked at: a tablet lying, a tablet standing, and a smaller tablet lying. */
  const SIZES = [[1180, 820], [820, 1180], [1024, 768]] as const
  const grid = (box: { x: number; y: number; w: number; h: number }): [number, number][] => {
    const all: [number, number][] = []
    for (let x = box.x; x <= box.x + box.w; x += box.w / 12) for (let y = box.y; y <= box.y + box.h; y += box.h / 12) all.push([x, y])
    return all
  }

  it('gives a finger 48 px or more each way on the hill by day, at all three sizes: beside the tidy one, under the sun, over the bushes', () => {
    const tidy = PERSONALITY.tidy
    // From the tidy one's hat to the stage's edge, and from the air over the hill's back down to the bush in front of it.
    const box = { x: tidy.feet.x + tidy.reach.head!.right + 8.5, y: HILL_AIR.fromY, w: 0, h: 0 }
    box.w = 1180 - box.x
    box.h = 436 - box.y
    for (const [width, height] of SIZES) {
      const { scale } = fit(width, height)
      expect(box.w * scale, `${width} by ${height}`).toBeGreaterThanOrEqual(48)
      expect(box.h * scale, `${width} by ${height}`).toBeGreaterThanOrEqual(48)
    }
    // Every point of it is the hill, the sun by day does not reach down into it, and a finger there gets the hill's answer.
    expect(SUN_AT.y + SUN_AT.r).toBeLessThan(box.y)
    for (const [x, y] of grid(box)) {
      expect(placeOf(x, y), `${x}, ${y}`).toBe('hill')
      const toy = new Toy(freshSave(7), 3)
      toy.press(x, y)
      expect(toy.sounds.map((sound) => sound.from), `${x}, ${y}`).toEqual(['hill'])
    }
    // The air over the hill is the hill's only from its crest to the right: left of that the sky is the sky.
    expect(placeOf(HILL_AIR.fromX - 2, HILL_AIR.fromY + 10)).toBe('sky')
    expect(placeOf(1150, HILL_AIR.fromY - 2)).toBe('sky')
  })

  it('gives a finger 48 px or more each way on the left root at all three sizes, between the fat one, the snail on its top and the earth under it', () => {
    const fat = PERSONALITY.fat
    const box = { x: fat.feet.x + fat.reach.halfWidth + 8.5, y: SNAIL_PATH.fromY - 16 + SNAIL_PATH.r + 0.5, w: 0, h: 0 }
    box.w = ROOTS.left - 0.5 - box.x
    box.h = Math.min(rootUnder(box.x), rootUnder(ROOTS.left)) - 0.5 - box.y
    for (const [width, height] of SIZES) {
      const { scale } = fit(width, height)
      expect(box.w * scale, `${width} by ${height}`).toBeGreaterThanOrEqual(48)
      expect(box.h * scale, `${width} by ${height}`).toBeGreaterThanOrEqual(48)
    }
    // Every point of it is the root, and clear of the snail's round wherever the snail is on its path.
    for (const [x, y] of grid(box)) {
      expect(placeOf(x, y), `${x}, ${y}`).toBe('root')
      for (const [sx, sy] of [[SNAIL_PATH.fromX, SNAIL_PATH.fromY], [SNAIL_PATH.toX, SNAIL_PATH.toY]]) expect(Math.hypot(x - sx, y - (sy - 16)), `${x}, ${y}`).toBeGreaterThan(SNAIL_PATH.r)
    }
    // With the found things carried off it, a finger anywhere in it gets the root's knock.
    const none = new Toy({ ...freshSave(7), things: FOUND.filter((found) => found.kind === 'twig' || found.kind === 'cap').map((found, index) => ({ id: found.id, x: 520 + index * 50 })) }, 3)
    for (const [x, y] of grid(box)) {
      none.press(x, y)
      none.release()
    }
    expect(new Set(none.sounds.map((sound) => sound.from))).toEqual(new Set(['root']))
  })

  it('answers beside the tidy one\'s head as the wood behind it, and on its coat, its head and its hat as the tidy one', () => {
    const { feet, reach } = PERSONALITY.tidy
    const answer = (x: number, y: number): string[] => { const toy = new Toy(freshSave(7), 3); toy.press(x, y); return toy.sounds.map((sound) => sound.from) }
    // The hat's brim and the head, at their widest.
    for (const [x, y] of [[feet.x + 33, feet.y - 264], [feet.x - 37, feet.y - 264], [feet.x + 29, feet.y - 240], [feet.x, feet.y - 320]]) expect(answer(x, y), `${x}, ${y}`).toEqual(['folk tidy'])
    // The coat, at its widest.
    for (const x of [feet.x - 45, feet.x + 45]) expect(answer(x, feet.y - 120)).toEqual(['folk tidy'])
    // Beside the head on the right, where the coat's width would reach and nothing of it is drawn.
    expect(answer(feet.x + reach.head!.right + 12, feet.y - 250)).not.toContain('folk tidy')
    expect(reach.halfWidth).toBeGreaterThan(reach.head!.right + 20)
  })
})

describe('the sun over the hill', () => {
  /** The drawn sun: its disc, without its rays. */
  const DISC = 38

  it('stands at the right of the frame with its whole touch shape on the stage, and sinks onto the hill line', () => {
    expect(SUN_AT.x).toBeGreaterThan(1180 * 0.9)
    expect(SUN_AT.x + SUN_AT.r).toBeLessThanOrEqual(1180)
    expect(SUN_AT.y - SUN_AT.r).toBeGreaterThan(100)
    expect(SUN_AT.setY - SUN_AT.y).toBeGreaterThan(150)
    // At evening it lies on the hill line, half behind the hill; its track ends where it is wholly behind it.
    expect(Math.abs(SUN_AT.setY - SUN_AT.hill)).toBeLessThanOrEqual(2)
    expect(SUN_AT.under).toBeGreaterThanOrEqual(SUN_AT.hill + DISC)
    for (const who of FOLK) {
      const { feet, reach } = PERSONALITY[who]
      const top = feet.y - reach.height
      // The sun as it is drawn is clear of the three at their places.
      expect(SUN_AT.x - DISC > feet.x + reach.halfWidth || SUN_AT.y + DISC < top, who).toBe(true)
      // The ring of room round it reaches over the tidy one's hat by a sliver at its lower edge, where the tidy one answers
      // first: the middle of the sun, and a finger's width about it, is the sun's alone.
      const into = SUN_AT.x - SUN_AT.r > feet.x + reach.halfWidth ? 0 : Math.max(0, SUN_AT.y + SUN_AT.r - top)
      expect(into, who).toBeLessThanOrEqual(16)
      expect(SUN_AT.y + 48 < top || SUN_AT.x - 48 > feet.x + reach.halfWidth, who).toBe(true)
    }
  })

  it('agrees with the hill as the wood draws it, at every width of surface', () => {
    for (const [width, height] of SURFACES) {
      const by = fit(width, height)
      const seen = { x: -by.x / by.scale, y: -by.y / by.scale, w: width / by.scale, h: height / by.scale }
      // The hill line under the sun where it is drawn at evening: it leans out to the right as it goes down.
      expect(Math.abs(hillTop(sunX(SUN_AT.setY), seen) - SUN_AT.hill), `${width} by ${height}`).toBeLessThanOrEqual(3)
    }
  })

  it('is drawn inside the round a finger takes it by, at every height of its track, and where the toy says it is', () => {
    expect(sunX(SUN_AT.y)).toBe(SUN_AT.x)
    for (let y = SUN_AT.y; y <= SUN_AT.under; y += 1) {
      expect(sunX(y) - SUN_AT.x + DISC, `sun at ${y}`).toBeLessThanOrEqual(SUN_AT.r)
      expect(sunX(y) + DISC, `sun at ${y}`).toBeLessThanOrEqual(1180)
      // It leans out a little at a time: no jump along the way.
      expect(Math.abs(sunX(y + 1) - sunX(y)), `sun at ${y}`).toBeLessThan(1)
    }
    const toy = new Toy({ ...freshSave(7), finished: true, asleep: [] }, 1)
    expect(toy.show(null).sun).toMatchObject({ x: sunX(SUN_AT.setY), y: SUN_AT.setY })
  })

  it.each(SURFACES)('has no part of its touch shape in the grown-up corner, anywhere on its track, on a surface of %i by %i', (width, height) => {
    for (let y = SUN_AT.y; y <= SUN_AT.under; y += 10) {
      const b = onSurface(sunBox(y), width, height)
      expect(b.x1 < width - CORNER || b.y0 > CORNER, `sun at ${y}`).toBe(true)
    }
  })

  it('stays out of the corner at any size of surface from 320 px high', () => {
    for (let width = 320; width <= 3000; width += 67) for (let height = 320; height <= 2000; height += 71) {
      const b = onSurface(sunBox(SUN_AT.y), width, height)
      expect(b.x1 < width - CORNER || b.y0 > CORNER, `${width} by ${height}`).toBe(true)
    }
  })

  it('gives a finger 48 px or more each way on the sun, on a tablet and on a phone', () => {
    for (const [width, height] of SURFACES) {
      const by = fit(width, height)
      const b = onSurface(sunBox(SUN_AT.y), width, height)
      // The whole shape is on the surface: none of it is cut off at an edge.
      expect(b.x0).toBeGreaterThanOrEqual(0)
      expect(b.x1).toBeLessThanOrEqual(width + 0.01)
      // 48 px from a phone of 390 by 844 up. On the smallest surface held here, 320 by 568, it is 39 px.
      if (Math.min(width, height) >= 375 || by.scale >= 0.33) expect(b.x1 - b.x0, `${width} by ${height}`).toBeGreaterThanOrEqual(48)
      expect(b.x1 - b.x0, `${width} by ${height}`).toBeGreaterThanOrEqual(39)
    }
  })
})

describe('what a finger is given', () => {
  /** A tablet surface: 700 px or more on its short side. */
  const TABLETS = SURFACES.filter(([width, height]) => Math.min(width, height) >= 700)

  it('is 48 px or more each way on every found thing, on every tablet surface, with no grace added', () => {
    expect(TABLETS.length).toBeGreaterThanOrEqual(8)
    for (const [width, height] of TABLETS) {
      const by = fit(width, height)
      expect(FINGER.w * by.scale, `${width} by ${height}`).toBeGreaterThanOrEqual(48)
      expect(FINGER.h * by.scale, `${width} by ${height}`).toBeGreaterThanOrEqual(48)
      for (const found of FOUND) {
        const b = onSurface(touchBox(loose(found.id)), width, height)
        expect(b.x1 - b.x0, `thing ${found.id} on ${width} by ${height}`).toBeGreaterThanOrEqual(48)
        expect(b.y1 - b.y0, `thing ${found.id} on ${width} by ${height}`).toBeGreaterThanOrEqual(48)
      }
    }
  })

  it('holds the whole picture of a thing, and things at their places lie apart', () => {
    for (const found of FOUND) {
      const box = touchBox(loose(found.id))
      expect(box.w).toBeGreaterThanOrEqual(FINGER.w)
      expect(box.h).toBeGreaterThanOrEqual(FINGER.h)
      // Where it is touched is where it is drawn: the box holds the whole picture.
      const drawn = drawnBox(loose(found.id))
      expect(drawn.x).toBeGreaterThanOrEqual(box.x - 0.01)
      expect(drawn.x + drawn.w).toBeLessThanOrEqual(box.x + box.w + 0.01)
      expect(drawn.y).toBeGreaterThanOrEqual(box.y - 0.01)
      expect(drawn.y + drawn.h).toBeLessThanOrEqual(box.y + box.h + 0.01)
      // The middle of each is nearer to its own box's middle than to any other's: a finger on a thing takes that thing.
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2
      for (const other of FOUND) {
        if (other.id === found.id) continue
        const o = touchBox(loose(other.id))
        expect(Math.hypot(cx - (o.x + o.w / 2), cy - (o.y + o.h / 2)), `${found.id} and ${other.id}`).toBeGreaterThan(60)
      }
    }
  })

  it('takes a thing at the middle and at the upper edge of its box, and not above or below the box', () => {
    for (const found of FOUND) {
      const box = touchBox(loose(found.id))
      for (const [x, y, takes] of [[box.x + box.w / 2, box.y + box.h / 2, true], [box.x + box.w / 2, box.y + 2, true], [box.x + box.w / 2, box.y - 3, false], [box.x + box.w / 2, box.y + box.h + 3, false]] as const) {
        const toy = new Toy(freshSave(7), 1)
        toy.press(x, y)
        // Just outside it the finger is on bare ground or on another thing, never on this one.
        expect((toy.sounds[0]?.from ?? '') === `lift ${found.id}`, `thing ${found.id} at ${x}, ${y}`).toBe(takes)
      }
    }
  })

  it('takes a thing in the hollow only where it is seen through the opening: behind the trunk the bark answers', () => {
    // A slab on the root step against the left wall: its upper corner is behind the trunk, above the foot of the arch.
    const bark = FOUND.find((thing) => thing.kind === 'bark')!
    const toy = new Toy({ ...freshSave(7), things: [{ id: bark.id, x: HOLLOW.left + 4 }] }, 1)
    const shown = toy.show(null).things.find((thing) => thing.id === bark.id)!
    const box = touchBox(shown)
    const x = box.x + 5, y = ceilingY(x) - 6
    // The point is in the slab's box, but above the arch there.
    expect(x).toBeGreaterThan(HOLLOW.archX - HOLLOW.archRx)
    expect(y).toBeGreaterThan(box.y)
    expect(y).toBeLessThan(box.y + box.h)
    toy.press(x, y)
    expect(toy.sounds.map((sound) => sound.from)).toEqual(['wood'])
    toy.release()
    toy.sounds.length = 0
    // A little lower, under the arch, the slab is seen and is taken.
    expect(box.y + 10).toBeGreaterThan(ceilingY(x + 30))
    toy.press(x + 30, box.y + 10)
    expect(toy.sounds.map((sound) => sound.from)).toEqual([`lift ${bark.id}`])
  })
})
