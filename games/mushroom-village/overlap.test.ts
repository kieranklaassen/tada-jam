import { describe, expect, it } from 'vitest'
import { FULL } from './config'
import { CART, GNOMES, MOSS, SEATS, SNAIL, SUN, SUN_DOWN_Y, footFor, kindAt, mossBottom, mossTop, onGnome, pebbleMay, under } from './ground'
import { CORNER } from './overlay'
import { PEBBLE_REACH, pebbleAt } from './paths'
import { freshSave } from './save'
import { snailPebbles } from './scenes'
import { bodyBox, boxesMeet, doorBox, hatBox, inBox, shapeOf, type Box } from './shapes'
import { STAGE, fit, toStage } from './stage'
import { World } from './world'

// Nothing the game sets down covers a thing a finger must reach, and nothing
// a child must reach lies under the jam's home control or in the grown-up's
// corner. The stage is fitted whole into the surface, so both are checked on
// the surface the stills are taken at and on the two narrowest the game
// names: a small tablet, and a phone on its side.

const SURFACES = [{ name: 'the stage itself', width: 1180, height: 820 }, { name: 'a small tablet', width: 1024, height: 768 }, { name: 'a phone on its side', width: 667, height: 375 }] as const
/** The jam's round home control: 48 px across at the top centre, 10 px from the top, with a finger's slack round it. */
const HOME = { across: 48, fromTop: 10, slack: 8 }

/** A box of the surface, in stage units. */
function onStage(surface: { width: number; height: number }, x0: number, y0: number, x1: number, y1: number): Box {
  const by = fit(surface.width, surface.height), a = toStage({ x: x0, y: y0 }, by), b = toStage({ x: x1, y: y1 }, by)
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y }
}
const homeOn = (s: { width: number; height: number }): Box => onStage(s, s.width / 2 - HOME.across / 2 - HOME.slack, 0, s.width / 2 + HOME.across / 2 + HOME.slack, HOME.fromTop + HOME.across + HOME.slack)
const cornerOn = (s: { width: number; height: number }): Box => onStage(s, s.width - CORNER, 0, s.width, CORNER)

const KINDS = ['red', 'bell', 'puff'] as const
/** Every foot the moss can give, a few units apart, as a full mushroom of the kind its ground gives. */
function everyFoot(step = 14): { x: number; y: number; kind: (typeof KINDS)[number]; size: number; flip: boolean }[] {
  const feet = []
  for (let x = MOSS.left; x <= MOSS.right; x += step) for (let y = Math.ceil(mossTop(x)); y <= mossBottom(x); y += step) {
    const foot = footFor(x, y)
    if (foot && foot.x === x && foot.y === y) for (const flip of [false, true]) feet.push({ x, y, kind: kindAt(x, y), size: FULL, flip })
  }
  return feet
}
const CART_BOX: Box = { x0: CART.left, y0: CART.top, x1: CART.right, y1: CART.bottom }
const SUN_WAY: Box = { x0: SUN.x - SUN.r, y0: SUN.y - SUN.r, x1: SUN.x + SUN.r, y1: SUN_DOWN_Y }

describe.each(SURFACES)('on $name ($width by $height)', (surface) => {
  const home = homeOn(surface), corner = cornerOn(surface)

  it('has nothing but leaves and sky under the home control and in the grown-up corner', () => {
    for (const box of [home, corner]) {
      for (let x = Math.max(0, box.x0); x <= Math.min(STAGE.width, box.x1); x += 6) for (let y = Math.max(0, box.y0); y <= Math.min(STAGE.height, box.y1); y += 6) {
        expect(under(x, y).what, `${Math.round(x)}, ${Math.round(y)}`).toBe('leaves')
      }
    }
  })

  it('keeps the sun, and the whole way it is pulled down, out from under both', () => {
    expect(boxesMeet(SUN_WAY, home)).toBe(false)
    expect(boxesMeet(SUN_WAY, corner)).toBe(false)
  })

  it('keeps the cart, the snail, the gnomes, the snail\'s pebbles and every foot the moss can give out from under both', () => {
    const things: Box[] = [CART_BOX, { x0: SNAIL.x - SNAIL.r, y0: SNAIL.y - SNAIL.r, x1: SNAIL.x + SNAIL.r, y1: SNAIL.y + SNAIL.r }]
    for (const who of GNOMES) things.push({ x0: SEATS[who].x - SEATS[who].half, y0: SEATS[who].top, x1: SEATS[who].x + SEATS[who].half, y1: SEATS[who].y })
    for (const x of [200, 900]) for (const p of snailPebbles(x)) things.push({ x0: p.x - 12, y0: p.y - 12, x1: p.x + 12, y1: p.y + 12 })
    // Every mushroom the moss can give, whole, on every surface, the phone on its side included: the band's upper edge lies lower under the control.
    for (const m of everyFoot(14)) things.push(bodyBox(m), hatBox({ ...m, size: 2 }))
    for (const thing of things) {
      expect(boxesMeet(thing, home)).toBe(false)
      expect(boxesMeet(thing, corner)).toBe(false)
    }
  })

  it('leaves every target at least as large as a small finger needs', () => {
    const scale = fit(surface.width, surface.height).scale
    // On the stage itself and the tablet a target is 48 px or more; on a phone the stage is fitted whole and is smaller with it.
    const least = surface.width >= 1024 ? 48 : 25
    expect((CART.right - CART.left) * scale).toBeGreaterThanOrEqual(least)
    expect(SUN.r * 2 * scale).toBeGreaterThanOrEqual(least)
    expect(SNAIL.r * 2 * scale).toBeGreaterThanOrEqual(least)
    for (const who of GNOMES) expect(SEATS[who].half * 2 * scale).toBeGreaterThanOrEqual(least)
    // A door and a pebble are the small things of the glade: each is touched in a shape of the full 48 px, whatever its size as drawn.
    for (const kind of KINDS) for (let size = 1; size <= FULL; size++) {
      const door = doorBox({ x: 600, y: 450, kind, size, flip: false })
      expect(Math.min(door.x1 - door.x0, door.y1 - door.y0) * scale, `the door of a ${kind} mushroom of size ${size}`).toBeGreaterThanOrEqual(least)
    }
    expect(PEBBLE_REACH * 2 * scale).toBeGreaterThanOrEqual(least)
  })

  it('finds a pebble under a finger anywhere in its touch shape, and not beyond it', () => {
    const lone = [[{ x: 500, y: 600 }]]
    for (const [dx, dy] of [[PEBBLE_REACH, 0], [-PEBBLE_REACH, 0], [0, PEBBLE_REACH], [0, -PEBBLE_REACH], [19, 19]]) expect(pebbleAt(lone, 500 + dx, 600 + dy)).toEqual({ path: 0, index: 0 })
    expect(pebbleAt(lone, 500 + PEBBLE_REACH + 2, 600)).toBeNull()
  })
})

describe('the sizes of what a finger aims at', () => {
  it('makes what the youngest must find first about a hundred units across: a standing mushroom, the gnomes, the cart, the sun and the snail', () => {
    for (const kind of KINDS) for (const size of [1, 6, FULL]) {
      const body = bodyBox({ x: 600, y: 450, kind, size, flip: false })
      expect(body.x1 - body.x0, `a ${kind} mushroom of size ${size}`).toBeGreaterThanOrEqual(100)
      expect(body.y1 - body.y0, `a ${kind} mushroom of size ${size}`).toBeGreaterThanOrEqual(92)
    }
    for (const who of GNOMES) { expect(SEATS[who].half * 2).toBeGreaterThanOrEqual(100); expect(SEATS[who].y - SEATS[who].top).toBeGreaterThanOrEqual(100) }
    expect(CART.right - CART.left).toBeGreaterThanOrEqual(100)
    expect(CART.bottom - CART.top).toBeGreaterThanOrEqual(92)
    expect(SUN.r * 2).toBeGreaterThanOrEqual(100)
    expect(SNAIL.r * 2).toBeGreaterThanOrEqual(100)
  })

  it('gives the door and the pebble, which come later, a touch shape of 48 px on a small tablet', () => {
    const scale = fit(1024, 768).scale
    for (const kind of KINDS) for (let size = 1; size <= FULL; size++) {
      const door = doorBox({ x: 600, y: 450, kind, size, flip: false })
      expect((door.x1 - door.x0) * scale).toBeGreaterThanOrEqual(48)
      expect((door.y1 - door.y0) * scale).toBeGreaterThanOrEqual(48)
    }
    expect(PEBBLE_REACH * 2 * scale).toBeGreaterThanOrEqual(48)
  })
})

describe('what the game sets down covers no target', () => {
  it('stands the cart where no mushroom can: below every foot at the right edge, clear of every cap and door', () => {
    for (const m of everyFoot()) for (const size of [1, 6, FULL]) {
      // As it is drawn: the stem from the foot up, and the cap on top of it.
      const shape = shapeOf(m.kind, size), side = m.flip ? -1 : 1
      const stem: Box = { x0: m.x - shape.stemWidth / 2 - Math.abs(shape.lean), y0: m.y - shape.stemHeight, x1: m.x + shape.stemWidth / 2 + Math.abs(shape.lean), y1: m.y + 8 }
      const cap: Box = { x0: m.x + side * shape.lean - shape.capWidth / 2, y0: m.y - shape.height, x1: m.x + side * shape.lean + shape.capWidth / 2, y1: m.y - shape.height + shape.capHeight }
      expect(boxesMeet(stem, CART_BOX), `a stem at ${m.x}, ${m.y}`).toBe(false)
      expect(boxesMeet(cap, CART_BOX), `a cap at ${m.x}, ${m.y}`).toBe(false)
      expect(boxesMeet(doorBox({ ...m, size }), CART_BOX)).toBe(false)
    }
    for (const who of GNOMES) for (let x = CART.left; x <= CART.right; x += 10) for (let y = CART.top; y <= CART.bottom; y += 10) expect(onGnome(who, x, y)).toBe(false)
    expect(Math.hypot(CART.x - SNAIL.x, (CART.top + CART.bottom) / 2 - SNAIL.y)).toBeGreaterThan(SNAIL.r)
  })

  it('lays the snail\'s three pebbles where no mushroom\'s foot stands, whichever way they lead', () => {
    for (const x of [100, 429, 430, 1100]) for (const p of snailPebbles(x)) {
      expect(pebbleMay(p.x, p.y)).toBe(true)
      expect(p.y).toBeGreaterThan(mossBottom(p.x) + 14)
      expect(under(p.x, p.y).what).not.toBe('water')
      for (const who of GNOMES) expect(onGnome(who, p.x, p.y)).toBe(false)
    }
  })

  it('lays a hat beside the door and never on it, wherever the low house stands', () => {
    for (const m of everyFoot()) for (const size of [1, 2, 3]) {
      const low = { ...m, size }
      const hat = hatBox(low)
      expect(boxesMeet(hat, doorBox(low)), `a foot at ${m.x}, ${m.y}`).toBe(false)
    }
  })

  it('lays the hat on the side where more of it shows, and a gnome who sits in front of it is the one a finger finds', () => {
    // Away from the log, the whole hat shows.
    for (const m of everyFoot()) if (m.y < 420 && m.x > 160) {
      const hat = hatBox({ ...m, size: 2 })
      expect(hat.x0 >= 0 && hat.x1 <= STAGE.width, `a hat at ${m.x}, ${m.y}`).toBe(true)
      for (const who of GNOMES) for (const x of [hat.x0, (hat.x0 + hat.x1) / 2, hat.x1]) expect(onGnome(who, x, hat.y1 - 2), `a hat at ${m.x}, ${m.y} behind the ${who} gnome`).toBe(false)
    }
    // Just above the heads of the gnomes who wait, the tip of a hat may lie behind one of them: he is in front, and he is found.
    const low = { id: 2, x: 520, y: 500, size: 2, door: true }
    const w = new World({ ...freshSave(6), mushrooms: [low], homes: { tall: 2, sleepy: null, sneezy: null, baker: null }, hatOff: true, shown: ['cart', 'pebbles'] }, 1)
    const hat = hatBox({ ...low, kind: kindAt(low.x, low.y), flip: true })
    const found = new Set<string>()
    for (let x = hat.x0 + 2; x <= hat.x1 - 2; x += 4) found.add(w.hit(x, (hat.y0 + hat.y1) / 2).what)
    expect([...found].sort()).toEqual(['gnome', 'hat'])
  })

  it('takes a tap on the cart, on a snail\'s pebble and on the hat for that thing, with a mushroom right behind it', () => {
    const behindCart = { id: 1, x: 1094, y: 540, size: FULL, door: true }, low = { id: 2, x: 900, y: 500, size: 2, door: true }
    const w = new World({ ...freshSave(6), mushrooms: [behindCart, low], paths: [snailPebbles(520)], homes: { tall: 2, sleepy: null, sneezy: null, baker: null }, hatOff: true, shown: ['cart', 'pebbles'] }, 1)
    for (let x = CART.left + 6; x <= CART.right - 6; x += 12) for (let y = CART.top + 6; y <= CART.bottom - 6; y += 12) expect(w.hit(x, y).what, `the cart at ${x}, ${y}`).toBe('cart')
    for (const p of snailPebbles(520)) expect(w.hit(p.x, p.y).what).toBe('pebble')
    const hat = hatBox({ ...low, kind: kindAt(low.x, low.y), flip: low.id % 2 === 0 })
    for (let x = hat.x0 + 4; x <= hat.x1 - 4; x += 10) for (let y = hat.y0 + 4; y <= hat.y1 - 4; y += 8) expect(w.hit(x, y).what, `the hat at ${x}, ${y}`).toBe('hat')
    // And the door beside the hat is still the door.
    const door = doorBox({ ...low, kind: kindAt(low.x, low.y), flip: low.id % 2 === 0 })
    expect(inBox(hat, (door.x0 + door.x1) / 2, (door.y0 + door.y1) / 2)).toBe(false)
    expect(w.hit((door.x0 + door.x1) / 2, (door.y0 + door.y1) / 2).what).toBe('door')
  })

  it('gives the front one of two mushrooms that overlap to the finger, and a door before the cap behind it', () => {
    const back = { id: 1, x: 900, y: 440, size: FULL, door: false }, front = { id: 2, x: 960, y: 520, size: FULL, door: true }
    const w = new World({ ...freshSave(6), mushrooms: [back, front], shown: ['cart', 'pebbles'] }, 1)
    const shared = { x: 930, y: 400 }
    const hit = w.hit(shared.x, shared.y)
    expect(hit.what === 'mushroom' && hit.mushroom.id).toBe(2)
    const door = doorBox({ ...front, kind: kindAt(front.x, front.y), flip: true })
    const at = w.hit((door.x0 + door.x1) / 2, (door.y0 + door.y1) / 2)
    expect(at.what === 'door' && at.mushroom.id).toBe(2)
  })
})
