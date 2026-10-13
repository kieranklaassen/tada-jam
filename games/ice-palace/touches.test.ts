import { describe, expect, it } from 'vitest'
import { BALL, ICICLE, ON_BANK_Y, SMALL_BALL, restOf, widthOf, type Kind, type Rest } from './blocks'
import { AT } from './cast'
import { BERRY } from './first'
import { BLOCK_H, BOUGH, DRIFT, MIN_LEN, POND, type Hole } from './ground'
import { fit } from './stage'
import { bare, copy, drag, faults, fingerOf, frame, letGo, moveTo, names, press, run, surface, takeAway } from './testing'
import { glintOf } from './things'
import { STEP, Toy, type World } from './toy'
import { icicleAt } from './toyTouch'
import { pieceAt } from './toyPieces'
import { Bits } from './viewBits'

// What a finger gets back, held through the same calls the Mount makes
// (testing.ts): a second stroke, a second touch, a press that cannot start a
// line, the size of everything a child reaches for, a put-away with a block
// in the hand, and the answers that travel: a splash's drops and a moved
// block's light.

const row = (n: number): number => ON_BANK_Y - n * BLOCK_H
const on = (kind: Kind, len: number, x: number, n: number): Rest => restOf(kind, len, x, row(n), 'built')
const world = (blocks: Rest[], night = false, holes: Hole[] = []): World => ({ ...bare(night), blocks: [{ ...BERRY }, ...blocks], holes })

describe('a second stroke, a second touch', () => {
  it('a new stroke is a new line, however soon and however near: the block that was cut stays cut', () => {
    const toy = new Toy(bare(), 1)
    drag(toy, 400, 668, 500, 668)
    letGo(toy)
    run(toy, 0.1)
    expect(toy.holes).toHaveLength(1)
    // A tenth of a second later the finger lands 124 units from where it lifted, which is not the line's end.
    press(toy, 620, 700)
    expect(toy.lastCut).toBeNull()
    expect(names(toy)).toContain('bite')
    moveTo(toy, 720, 700)
    expect(toy.holes).toHaveLength(1)
    expect(toy.cut).toMatchObject({ from: { x: 620, y: 700 }, len: 100 })
    letGo(toy)
    run(toy, 0.6)
    expect(toy.holes.map((hole) => hole.len)).toEqual([100, 100])
    expect(toy.pieces).toHaveLength(3)
  })

  it('a finger that comes straight back onto the line’s end carries that line on', () => {
    const toy = new Toy(bare(), 1)
    drag(toy, 400, 668, 500, 668)
    letGo(toy)
    run(toy, 0.1)
    press(toy, 512, 672)
    moveTo(toy, 580, 668)
    expect(toy.holes).toHaveLength(0)
    letGo(toy)
    run(toy, 0.6)
    expect(toy.holes.map((hole) => hole.len)).toEqual([180])
  })

  it.each([
    ['King Winter', AT.king.x, AT.king.y - 150, 'harrumph'],
    ['the snow', 700, 400, 'puff'],
    ['open water', 600, 668, 'plip'],
  ] as const)('a quick second touch after a poke that slid is answered: %s', (_, x, y, sound) => {
    const toy = new Toy(world([], false, [{ x: 600, y: 668, angle: 0, len: 120 }]), 1)
    press(toy, x, y)
    moveTo(toy, x + 60, y + 4)
    moveTo(toy, x + 20, y + 4)
    // The poke slid: it is a drag to the tracker, which would wait for the finger to come back.
    expect(fingerOf(toy).touch.active).toBe(true)
    letGo(toy)
    expect(fingerOf(toy).touch.active).toBe(false)
    toy.takeSounds()
    frame(toy)
    press(toy, x, y)
    expect(names(toy)).toEqual([sound])
    letGo(toy)
  })
})

describe('a stroke too short to set the saw’s direction', () => {
  it.each([15, 20, 27, 30])('of %i units is answered when the finger lifts, as a very short line is: the tooth’s mark, chips and a squeak, and no block', (far) => {
    const toy = new Toy(world([]), 1)
    press(toy, 600, 700)
    moveTo(toy, 600 + far, 700)
    toy.takeSounds()
    toy.takeMotions()
    letGo(toy)
    expect(names(toy)).toEqual(['squeak'])
    const shown = toy.takeMotions().map((motion) => motion.type)
    expect(shown).toContain('scratch')
    expect(shown).toContain('chips')
    expect(toy.pieces).toHaveLength(1)
    expect(toy.holes).toEqual([])
  })
})

describe('a press on the pond that cannot start a line', () => {
  const pond = (): Toy => new Toy(world([restOf('clear', 100, 400, 668, 'lying')], false, [{ x: 600, y: 668, angle: 0, len: 120 }]), 1)

  it('beside open water shows the water: a plip and a ripple at the water’s edge, from the edge out to where a line can start', () => {
    for (const off of [6, 18, 27]) {
      const toy = pond()
      press(toy, 600, 668 + BLOCK_H / 2 + off)
      expect(names(toy), `${off} from the water`).toEqual(['plip'])
      expect(toy.takeMotions()).toEqual([{ type: 'ripple', x: 600, y: 668 + BLOCK_H / 2 }])
      expect(toy.cut).toBeNull()
      letGo(toy)
    }
    const toy = pond()
    press(toy, 600, 668 + BLOCK_H / 2 + 31)
    expect(names(toy)).toEqual(['bite'])
    expect(toy.cut).not.toBeNull()
  })

  it('beside a lying block shows the block: the saw clonks against it and it rocks', () => {
    const toy = pond()
    const block = toy.pieces.find((p) => p.kind === 'clear')!
    press(toy, 400, 668 + BLOCK_H / 2 + 20)
    expect(toy.hand).toBeNull()
    expect(names(toy)).toEqual(['clonk'])
    expect(block.wobbleV).toBeGreaterThan(0)
    expect(toy.takeMotions().map((m) => m.type)).toEqual(['chips'])
    expect(toy.cut).toBeNull()
  })

  it('on the pond’s snowed-over rim gives a puff of snow, as snow does', () => {
    const toy = pond()
    press(toy, POND.cx, POND.cy + POND.ry - 10)
    expect(names(toy)).toEqual(['puff'])
    expect(toy.cut).toBeNull()
  })
})

describe('the size of what a finger reaches for', () => {
  const SIZES = [[1180, 820], [1024, 768], [820, 1180]] as const
  /** How many whole stage units in a row, through `from` along one axis, give `hit`. */
  const span = (hit: (x: number, y: number) => boolean, from: { x: number; y: number }, across: boolean): number => {
    let n = hit(from.x, from.y) ? 1 : 0
    for (const way of [-1, 1]) for (let d = 1; d < 200; d++) {
      if (!hit(from.x + (across ? way * d : 0), from.y + (across ? 0 : way * d))) break
      n++
    }
    return n
  }

  it.each(SIZES)('on a surface of %i by %i every thing, an open hole and each icicle on the bough is 48 px or more each way', (width, height) => {
    const scale = fit(width, height).scale
    const toy = new Toy(world([restOf('clear', MIN_LEN, 420, 600, 'lying'), restOf('ball', BALL, 560, 600, 'lying'), restOf('icicle', ICICLE, 700, 600, 'lying'), on('snow', MIN_LEN, 500, 0)]), 1)
    for (const piece of toy.pieces) {
      const hit = (x: number, y: number): boolean => pieceAt(toy, { x, y }) === piece
      expect(span(hit, piece, true) * scale, `a ${piece.kind} thing, across`).toBeGreaterThanOrEqual(48)
      expect(span(hit, piece, false) * scale, `a ${piece.kind} thing, up and down`).toBeGreaterThanOrEqual(48)
      // The drawing stays as small as it is: the touch shape is the padded one.
      expect(widthOf(piece)).toBeLessThanOrEqual(piece.len)
    }
    // The shortest hole the saw can leave, lying level and standing on end.
    for (const angle of [0, Math.PI / 2]) {
      const holed = new Toy(world([], false, [{ x: 600, y: 680, angle, len: MIN_LEN }]), 1)
      const wet = (x: number, y: number): boolean => {
        press(holed, x, y)
        const heard = names(holed)
        letGo(holed)
        holed.takeMotions()
        return heard.length === 1 && heard[0] === 'plip'
      }
      expect(span(wet, { x: 600, y: 680 }, true) * scale, 'an open hole, across').toBeGreaterThanOrEqual(48)
      expect(span(wet, { x: 600, y: 680 }, false) * scale, 'an open hole, up and down').toBeGreaterThanOrEqual(48)
    }
    BOUGH.forEach((root, index) => {
      // Each icicle's own touch shape, measured with the others plucked; where two shapes meet, the nearer icicle is taken.
      const alone = new Toy({ ...bare(), icicles: [0, 1, 2, 3, 4].filter((i) => i !== index) }, 1)
      const hit = (x: number, y: number): boolean => icicleAt(alone, { x, y }) === index
      const middle = { x: root.x, y: root.y + ICICLE / 2 }
      expect(span(hit, middle, true) * scale, `icicle ${index}, across`).toBeGreaterThanOrEqual(48)
      expect(span(hit, middle, false) * scale, `icicle ${index}, up and down`).toBeGreaterThanOrEqual(48)
      const all = new Toy(bare(), 1)
      for (let dx = -34; dx <= 34; dx += 2) expect(icicleAt(all, { x: root.x + dx, y: middle.y })).toBeGreaterThanOrEqual(0)
    })
  })

  it.each(SIZES)('on a surface of %i by %i the seat under the seated king and a hat on his head are 48 px or more each way', (width, height) => {
    const scale = fit(width, height).scale
    const toy = new Toy(world([on('clear', 64, 400, 0), on('clear', 64, 560, 0), on('clear', 224, 480, 1), restOf('cloudy', 70, 700, 600, 'lying')], true), 1)
    const seat = toy.pieces.find((p) => p.len === 224)!, hat = toy.pieces.find((p) => p.kind === 'cloudy')!
    expect(toy.king).toMatchObject({ where: 'seat', sat: 1, x: seat.x, y: seat.y - BLOCK_H / 2 })
    /** What a finger landing here takes hold of, asked as a child's finger asks: a press, taken away again. */
    const taken = (x: number, y: number): unknown => {
      press(toy, x, y)
      const got = toy.hand?.piece
      takeAway(toy)
      toy.takeSounds()
      toy.takeMotions()
      return got
    }
    const isSeat = (x: number, y: number): boolean => taken(x, y) === seat
    expect(span(isSeat, seat, true) * scale, 'his seat, across').toBeGreaterThanOrEqual(48)
    expect(span(isSeat, seat, false) * scale, 'his seat, up and down').toBeGreaterThanOrEqual(48)
    // A touch on him is still never taken for the block under him.
    expect(taken(seat.x, seat.y - BLOCK_H / 2 - 40)).toBeUndefined()
    drag(toy, 700, 600, toy.king.x + 10, toy.king.y - 220, 8)
    letGo(toy)
    run(toy, 0.6)
    expect(hat.mode).toBe('hat')
    const isHat = (x: number, y: number): boolean => taken(x, y) === hat
    expect(span(isHat, hat, true) * scale, 'his hat, across').toBeGreaterThanOrEqual(48)
    expect(span(isHat, hat, false) * scale, 'his hat, up and down').toBeGreaterThanOrEqual(48)
    expect(hat.mode).toBe('hat')
  })
})

describe('put away with a block in the hand that bore others', () => {
  it('leaves what a load shows: what stood on it has come down, and the save has the block on top of what fell', () => {
    const toy = new Toy(world([on('clear', 100, 500, 0), on('cloudy', 100, 500, 1), on('snow', 90, 500, 2)]), 1)
    drag(toy, 500, row(0), 700, 300, 8)
    run(toy, 0.2)
    // Already while it is carried, the save has it where it would go back to: on top of what fell, and inside nothing.
    expect(faults(toy.world())).toEqual([])
    expect(toy.world().blocks.find((b) => b.kind === 'clear')).toMatchObject({ x: 500, y: row(2), place: 'built' })
    const finger = fingerOf(toy)
    finger.rest(finger.seconds)
    const saved = copy(toy.world())
    expect(faults(saved)).toEqual([])
    expect(saved.blocks.filter((b) => b.place === 'built').map((b) => [b.kind, b.y])).toEqual([['clear', row(2)], ['cloudy', row(0)], ['snow', row(1)]])
    const loaded = new Toy(copy(saved), 2)
    expect(surface(toy)).toEqual(surface(loaded))
    run(toy, 3)
    run(loaded, 3)
    expect(names(toy)).toEqual([])
    expect(toy.world()).toEqual(loaded.world())
  })
})

describe('a snowball', () => {
  it('rumbles only when it rolls: set on the bare bank it lands with a pat and nothing else', () => {
    const toy = new Toy(world([restOf('ball', BALL, 600, 600, 'lying')]), 1)
    drag(toy, 600, 600, 600, 300, 8)
    letGo(toy)
    toy.takeSounds()
    run(toy, 1.5)
    const heard = names(toy)
    expect(heard).toContain('pat')
    expect(heard).not.toContain('rumble')
    expect(toy.pieces.find((p) => p.kind === 'ball')!.rest).toMatchObject({ x: 600, y: ON_BANK_Y, place: 'built' })
  })
})

describe('a splash', () => {
  it('sends drops to whoever it wets, and each answers in the step its drops arrive', () => {
    const toy = new Toy(world([restOf('clear', 80, 600, 590, 'lying')], false, [{ x: 600, y: 668, angle: 0, len: 120 }]), 1)
    drag(toy, 600, 590, 600, 668, 8)
    toy.takeMotions()
    letGo(toy)
    const sprays = toy.takeMotions().filter((m) => m.type === 'spray')
    expect(sprays).toHaveLength(2)
    const cast = [['king', 'wet'], ['peeper', 'soaked']] as const
    const due = sprays.map((spray) => (spray.type === 'spray' ? Math.round(spray.lasts / STEP) : 0))
    expect(Math.min(...due)).toBeGreaterThan(10)
    const began = [-1, -1]
    for (let step = 1; step <= 80; step++) {
      frame(toy)
      cast.forEach(([who, what], i) => { if (began[i] < 0 && toy.cast[who].what === what) began[i] = step })
    }
    expect(began).toEqual(due)
    // And the drops are seen to get there: the view's drops are at the one they wet when their time is up.
    for (const spray of sprays) {
      if (spray.type !== 'spray') continue
      const bits = new Bits()
      bits.take(spray)
      const drops = (bits as unknown as { bits: { x: number; y: number }[] }).bits
      expect(drops.length).toBeGreaterThanOrEqual(5)
      for (let step = 0; step < Math.round(spray.lasts / STEP); step++) bits.age(STEP)
      for (const drop of drops) expect(Math.hypot(drop.x - spray.to.x, drop.y - spray.to.y)).toBeLessThan(24)
      bits.age(0.1)
      expect(bits.many).toBe(0)
    }
  })
})

describe('the light at night', () => {
  const lit = (): Toy => new Toy(world([on('clear', 64, 400, 0), on('clear', 64, 560, 0), on('clear', 224, 480, 1), on('clear', 100, 650, 0)], true), 1)

  it('moves with its block in the same call: taken up, the block’s light is gone from the snow; landed, it lies before the block’s new place in that step', () => {
    const toy = lit()
    const block = toy.pieces.find((p) => p.len === 100)!, index = (): number => toy.pieces.filter((p) => p.mode === 'rest' && (p.rest.place === 'built' || p.rest.place === 'hung')).indexOf(block)
    const patchOf = (): { x0: number; x1: number } | undefined => toy.nightNow.patches.find((patch) => patch.of === index())
    const before = patchOf()!
    expect((before.x0 + before.x1) / 2).toBeGreaterThan(620)
    press(toy, 650, row(0))
    moveTo(toy, 650, 300)
    // No step has been played: the wall's light is already without it.
    expect(index()).toBe(-1)
    expect(toy.nightNow.patches.every((patch) => (patch.x0 + patch.x1) / 2 < 620)).toBe(true)
    moveTo(toy, 300, 300)
    letGo(toy)
    let landed = -1, shone = -1
    for (let step = 1; step <= 90; step++) {
      frame(toy)
      if (landed < 0 && block.mode === 'rest') landed = step
      if (shone < 0 && index() >= 0 && patchOf()) shone = step
    }
    expect(landed).toBeGreaterThan(0)
    expect(shone).toBe(landed)
    const after = patchOf()!
    expect((after.x0 + after.x1) / 2).toBeLessThan(330)
  })

  it('lays a snowball’s unlit spot as large as the ball is drawn: shrunk under a thumb, the spot is the small ball in that call', () => {
    const toy = new Toy(world([on('clear', 64, 400, 0), on('clear', 64, 560, 0), on('clear', 224, 480, 1), restOf('ball', BALL, 650, row(0), 'built')], true), 1)
    const ball = toy.pieces.find((p) => p.kind === 'ball')!
    const spot = (): { len: number; x0: number; x1: number; y0: number; y1: number; tone: string } => {
      const index = toy.pieces.filter((p) => p.mode === 'rest' && (p.rest.place === 'built' || p.rest.place === 'hung')).indexOf(ball)
      return toy.nightNow.patches.find((patch) => patch.of === index)!
    }
    const before = spot()
    expect(before).toMatchObject({ tone: 'dark', len: BALL })
    press(toy, ball.x, ball.y)
    let shrunk = false
    for (let step = 0; step < 240 && !shrunk; step++) {
      frame(toy)
      shrunk = ball.len === SMALL_BALL
      // In no step is the ball one size and its spot another.
      expect(spot().len).toBe(ball.len)
    }
    expect(shrunk).toBe(true)
    letGo(toy)
    const after = spot()
    expect(after.tone).toBe('dark')
    expect(before.x1 - before.x0 - (after.x1 - after.x0)).toBeGreaterThan((BALL - SMALL_BALL) * 0.8)
    expect(before.y1 - before.y0 - (after.y1 - after.y0)).toBeGreaterThan(0)
  })

  it('is not covered by a block fresh from the pond: it comes to lie clear of every patch', () => {
    const toy = lit()
    const patches = toy.nightNow.patches
    expect(patches.length).toBeGreaterThanOrEqual(4)
    // A line right under the left post's light, whose block would otherwise hop up onto it.
    drag(toy, 350, 628, 450, 628)
    letGo(toy)
    run(toy, 0.6)
    const block = toy.pieces.find((p) => p.rest.place === 'lying' && p.kind !== 'berry')!
    expect(block.len).toBe(100)
    for (const patch of toy.nightNow.patches) {
      const apart = Math.abs(block.rest.x - (patch.x0 + patch.x1) / 2) >= (block.len + patch.x1 - patch.x0) / 2 || Math.abs(block.rest.y - (patch.y0 + patch.y1) / 2) >= (BLOCK_H + patch.y1 - patch.y0) / 2
      expect(apart, `the block at ${block.rest.x}, ${block.rest.y} lies on the light of thing ${patch.of}`).toBe(true)
    }
    // By day there is no light to keep clear of, and the same line's block lies where the light was.
    const day = new Toy(world([on('clear', 64, 400, 0)]), 1)
    drag(day, 350, 628, 450, 628)
    letGo(day)
    run(day, 0.6)
    const lies = day.pieces.find((p) => p.rest.place === 'lying' && p.kind !== 'berry')!
    expect(Math.abs(lies.rest.y - 568)).toBeLessThan(12)
  })
})

describe('the shine on a block', () => {
  it('is not the same mark on every block of a wall: neighbours differ in which end it turns down, how far it runs and how far it comes down', () => {
    const marks = [0, 1, 2].flatMap((n) => [260, 370, 480, 590, 700].map((x) => ({ n, x, ...glintOf(110, x + n * 20, row(n)) })))
    const same = (a: (typeof marks)[number], b: (typeof marks)[number]): boolean => a.side === b.side && Math.abs(a.along - b.along) < 4 && Math.abs(a.down - b.down) < 2
    for (const a of marks) for (const b of marks) {
      const beside = a.n === b.n && b.x - a.x === 110, above = b.n === a.n + 1 && b.x === a.x
      if (beside || above) expect(same(a, b), `blocks at ${a.x}, row ${a.n} and ${b.x}, row ${b.n}`).toBe(false)
    }
    expect(new Set(marks.map((m) => m.side)).size).toBe(2)
    expect(DRIFT.cx).toBeGreaterThan(0)
  })
})
