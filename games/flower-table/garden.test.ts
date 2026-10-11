import { describe, expect, it } from 'vitest'
import { Garden, REACH, arrange } from './garden'
import { BOOT, PATH, PATH_HOLDS, VASE, VISITOR, maxLean } from './layout'
import { BED, MIN_PIECE, MIN_STALK, SOIL_Y, fullOf, headOf } from './plants'
import { makeRng } from './rng'
import { deserialize, serialize, type Saved } from './save'

const fresh = (seed = 1): Garden => new Garden(deserialize(null, null), seed)
/** What ctx.storage hands back on the next visit. */
const stored = (garden: Garden): unknown => JSON.parse(JSON.stringify(serialize(garden.toSave())))
/** Lets everything that is on its way come to rest. */
const settle = (garden: Garden, seconds = 3): void => { for (let t = 0; t < seconds; t += 0.05) garden.step(0.05) }
/** A finger lands on the stem at `index`, `up` above the earth, and lets go at (x, y). */
const cutAndLetGo = (garden: Garden, index: number, up: number, x: number, y: number): void => {
  garden.press(BED[index].x, SOIL_Y - up)
  garden.move(x, y)
  garden.lift(x, y)
}
const OVER_BOOT = { x: BOOT.x, y: BOOT.mouthY - 80 }
/** Every piece of every stem, wherever it is, with what still stands in the bed: nothing is ever lost or made. */
const lengthOf = (saved: Saved, stem: number): number => saved.bed[stem] + [...saved.vase, ...saved.path].filter((piece) => piece.stem === stem).reduce((sum, piece) => sum + piece.len, 0)

describe('the cut', () => {
  it('cuts a stem exactly where the finger lands, at once, and the piece is in the hand', () => {
    const garden = fresh()
    garden.press(BED[0].x, SOIL_Y - 200)
    expect(garden.stems[0].height).toBe(200)
    expect(garden.hand).toMatchObject({ stem: 0, base: 200, len: fullOf(0) - 200, head: true })
    expect(garden.sounds.length).toBeGreaterThan(0)
    expect(garden.dirty).toBe('now')
  })

  it('cuts just under the flower when the finger lands on the flower', () => {
    const garden = fresh()
    garden.press(BED[0].x + 30, SOIL_Y - fullOf(0) + 40)
    expect(garden.stems[0].height).toBe(fullOf(0) - headOf(0) - 8)
    expect(garden.hand?.head).toBe(true)
  })

  it('leaves a stalk in the earth however low the finger lands', () => {
    const garden = fresh()
    garden.press(BED[4].x, SOIL_Y + 3)
    expect(garden.stems[4].height).toBe(MIN_STALK)
  })

  it('cuts the first stem the finger crosses, where it crosses, and no other in that touch', () => {
    const garden = fresh()
    // Down on bare wall between the thistles and the ivy, then across the ivy and on over the dandelions.
    garden.press(510, 600)
    expect(garden.hand).toBeNull()
    garden.move(560, 590)
    expect(garden.stems[8].height).toBeCloseTo(SOIL_Y - 595, 0)
    expect(garden.hand?.stem).toBe(8)
    garden.move(680, 600)
    expect(garden.stems[9].height).toBe(fullOf(9))
    expect(garden.stems[10].height).toBe(fullOf(10))
  })

  it('answers a finger on nothing with the blades alone and changes nothing', () => {
    const garden = fresh()
    garden.press(520, 160)
    expect(garden.scissors.open).toBeGreaterThan(0)
    expect(garden.sounds.length).toBeGreaterThan(0)
    garden.lift(520, 160)
    expect(garden.dirty).toBe('no')
    expect(stored(garden)).toEqual(stored(fresh()))
  })

  it('gives every stem a place a finger can land', () => {
    for (let index = 0; index < BED.length; index++) {
      const garden = fresh()
      garden.press(BED[index].x + (index % 2 ? REACH - 3 : 3 - REACH) * 0.4, SOIL_Y - fullOf(index) * 0.4)
      expect(garden.hand?.stem).toBe(index)
    }
  })

  it('cuts a piece that lies on the path where the blades cross it', () => {
    const garden = fresh()
    cutAndLetGo(garden, 0, 200, 420, 500)
    settle(garden)
    const lying = garden.path[0]
    const middle = lying.x + Math.sin(lying.rot) * lying.len * 0.5
    garden.press(middle, 716)
    expect(garden.hand).toBeNull()
    garden.move(middle, 800)
    expect(garden.hand?.stem).toBe(0)
    expect(garden.path[0].len + garden.hand!.len).toBeCloseTo(fullOf(0) - 200, 5)
    expect(garden.path[0].head).toBe(false)
    expect(garden.hand!.head).toBe(true)
    garden.lift(middle, 800)
    settle(garden)
    expect(lengthOf(garden.toSave(), 0)).toBeCloseTo(fullOf(0), 5)
  })
})

describe('letting go', () => {
  it('stands the piece in the vase when it is let go over it', () => {
    const garden = fresh()
    cutAndLetGo(garden, 2, 100, OVER_BOOT.x - 20, OVER_BOOT.y)
    expect(garden.hand).toBeNull()
    expect(garden.vase).toHaveLength(1)
    expect(garden.toSave().vase[0]).toMatchObject({ stem: 2, base: 100, at: -6 })
    expect(garden.dirty).toBe('now')
  })

  it('finishes the way to the vase for a piece let go at least half way there', () => {
    const garden = fresh()
    cutAndLetGo(garden, 6, 140, 660, 520)
    expect(garden.vase).toHaveLength(1)
    const short = fresh()
    cutAndLetGo(short, 6, 140, 500, 550)
    expect(short.vase).toHaveLength(0)
    expect(short.path).toHaveLength(1)
  })

  it('drops the piece onto the path under where it was let go, inside the frame', () => {
    const garden = fresh()
    cutAndLetGo(garden, 0, 30, 20, 300)
    const lying = garden.toSave().path[0]
    expect(lying.y).toBeGreaterThanOrEqual(PATH.top)
    expect(lying.y).toBeLessThanOrEqual(PATH.bottom)
    for (const end of [lying.x, lying.x + Math.sin(lying.rot) * lying.len]) {
      expect(end).toBeGreaterThanOrEqual(PATH.left - 45)
      expect(end).toBeLessThanOrEqual(PATH.right + 45)
    }
  })

  it('takes the petals off a poppy that falls, and leaves them on one that goes into the vase', () => {
    const garden = fresh()
    cutAndLetGo(garden, 2, 100, 300, 400)
    expect(garden.toSave().path[0].spent).toBe(true)
    cutAndLetGo(garden, 3, 100, OVER_BOOT.x, OVER_BOOT.y)
    expect(garden.toSave().vase[0].spent).toBe(false)
  })

  it('stands a thistle upright where it falls, and lays every other plant down', () => {
    const garden = fresh()
    cutAndLetGo(garden, 6, 100, 300, 400)
    cutAndLetGo(garden, 4, 100, 500, 400)
    const [thistle, onion] = garden.toSave().path
    expect(Math.abs(thistle.rot)).toBeLessThan(0.2)
    expect(Math.abs(onion.rot)).toBeGreaterThan(1.4)
  })

  it('holds seven in the vase: an eighth springs off and lands on the path', () => {
    const garden = fresh()
    for (let index = 0; index < 8; index++) { cutAndLetGo(garden, index, 60, OVER_BOOT.x, OVER_BOOT.y); settle(garden, 1) }
    expect(garden.vase).toHaveLength(BOOT.holds)
    expect(garden.path).toHaveLength(1)
    expect(garden.path[0].stem).toBe(7)
  })

  it('draws a piece out of the vase by its top and stands it back where it was if it is not moved', () => {
    const garden = fresh()
    for (const index of [0, 4, 8]) { cutAndLetGo(garden, index, 60, OVER_BOOT.x + (index - 4) * 4, OVER_BOOT.y); settle(garden, 1) }
    const before = stored(garden)
    const piece = garden.vase[1]
    const tip = { x: piece.px + Math.sin(piece.prot) * 130, y: piece.py - Math.cos(piece.prot) * 130 }
    expect(tip.y).toBeLessThan(BOOT.mouthY)
    garden.press(tip.x, tip.y)
    expect(garden.hand).not.toBeNull()
    expect(garden.vase).toHaveLength(2)
    // Put away with the piece in the hand: it is saved where it came from.
    expect(stored(garden)).toEqual(before)
    garden.lift(tip.x, tip.y)
    expect(stored(garden)).toEqual(before)
  })

  it('puts the piece back where it came from when the touch is taken away', () => {
    const garden = fresh()
    cutAndLetGo(garden, 0, 200, OVER_BOOT.x, OVER_BOOT.y)
    settle(garden, 1)
    const before = stored(garden)
    const piece = garden.vase[0]
    garden.press(piece.px, BOOT.mouthY - 60)
    garden.move(300, 300)
    garden.putBack()
    expect(garden.hand).toBeNull()
    expect(stored(garden)).toEqual(before)
    // A stem cut and then taken away is cut all the same: its piece lies by the bed.
    garden.press(BED[4].x, SOIL_Y - 100)
    garden.putBack()
    expect(garden.stems[4].height).toBe(100)
    expect(garden.path).toHaveLength(1)
  })
})

describe('growing back', () => {
  it('grows a cut stalk back to its full height at a touch, and keeps what was cut from it', () => {
    const garden = fresh()
    cutAndLetGo(garden, 10, 50, OVER_BOOT.x, OVER_BOOT.y)
    garden.press(BED[10].x, SOIL_Y - 30)
    garden.lift(BED[10].x, SOIL_Y - 30)
    expect(garden.hand).toBeNull()
    expect(garden.toSave().bed[10]).toBe(fullOf(10))
    expect(garden.vase).toHaveLength(1)
    expect(garden.busy).toBe(true)
    settle(garden)
    expect(garden.busy).toBe(false)
    // Once it is grown it can be cut again.
    garden.press(BED[10].x, SOIL_Y - 50)
    expect(garden.hand?.head).toBe(true)
  })

  it('does not answer a finger while the stalk is still shooting up', () => {
    const garden = fresh()
    cutAndLetGo(garden, 10, 50, 300, 300)
    garden.press(BED[10].x, SOIL_Y - 30)
    garden.lift(BED[10].x, SOIL_Y - 30)
    garden.step(0.05)
    garden.press(BED[10].x, SOIL_Y - 30)
    expect(garden.hand).toBeNull()
    expect(garden.stems[10].height).toBe(fullOf(10))
  })
})

describe('the path and the robin', () => {
  it('holds sixteen pieces: one more, and the robin takes the oldest away', () => {
    const garden = fresh()
    let made = 0
    while (made <= PATH_HOLDS) {
      for (let index = 0; index < BED.length && made <= PATH_HOLDS; index++, made++) { cutAndLetGo(garden, index, 60, 40 + (made % 5) * 8, 790); settle(garden, 1) }
      for (let index = 0; index < BED.length; index++) if (garden.stems[index].height < fullOf(index)) { garden.press(BED[index].x, SOIL_Y - 30); garden.lift(BED[index].x, SOIL_Y - 30) }
      settle(garden, 1)
    }
    settle(garden, 4)
    expect(garden.path).toHaveLength(PATH_HOLDS)
    expect(garden.taken).toBeNull()
    expect(garden.robin.state).toBe('perch')
    expect(garden.toSave().path).toHaveLength(PATH_HOLDS)
  })
})

describe('the creatures', () => {
  it('answer a finger with a sound of their own and change nothing', () => {
    const garden = fresh()
    garden.press(VISITOR.x, VISITOR.y)
    expect(garden.actors.goat.act?.name).toBe('poke')
    expect(garden.sounds.length).toBeGreaterThan(0)
    expect(garden.scissors.seen).toBe(0)
    garden.move(VISITOR.x - 300, VISITOR.y + 200)
    garden.lift(VISITOR.x - 300, VISITOR.y + 200)
    expect(garden.dirty).toBe('no')
    expect(stored(garden)).toEqual(stored(fresh()))
  })

  it('look up at a snip', () => {
    const garden = fresh()
    garden.press(BED[0].x, SOIL_Y - 200)
    expect(garden.goat.perk).toBe(1)
    expect(garden.cat.eye).toBeGreaterThan(0)
  })
})

describe('how pieces stand in a vase', () => {
  const piece = (at: number, len: number, kind: (typeof BED)[number]['kind'] = 'onion', head = false) => ({ at, len, kind, head, scale: 1 })

  it('leans each piece to the side it was let go, no further than the rim allows', () => {
    const looks = arrange([piece(-10, 200), piece(0, 200), piece(10, 200)], BOOT)
    expect(looks[0].lean).toBeLessThan(looks[1].lean)
    expect(looks[1].lean).toBeLessThan(looks[2].lean)
    for (const look of looks) expect(Math.abs(look.lean)).toBeLessThanOrEqual(maxLean(BOOT) + 1e-9)
  })

  it('keeps two pieces let go at the same place apart', () => {
    const looks = arrange([piece(3, 200), piece(3, 200)], BOOT)
    expect(Math.abs(looks[0].lean - looks[1].lean)).toBeGreaterThan(0.05)
  })

  it('stands a thistle stiff and makes its neighbour lean round it', () => {
    const [thistle, other] = arrange([piece(4, 200, 'thistle'), piece(4, 200)], BOOT)
    const [alone] = arrange([piece(4, 200, 'thistle')], BOOT)
    expect(thistle.lean).toBeCloseTo(alone.lean, 9)
    expect(Math.abs(other.lean - thistle.lean)).toBeGreaterThan(0.05)
  })

  it('tips the head of a piece that stands out by more than the vase is tall, to the side it leans', () => {
    const [long, short] = arrange([piece(6, 330), piece(-6, 150)], VASE.vase)
    expect(long.droop).toBeGreaterThan(0)
    expect(short.droop).toBe(0)
    expect(arrange([piece(-6, 330)], VASE.vase)[0].droop).toBeLessThan(0)
    // In the shallow jar the same piece tips sooner.
    expect(arrange([piece(6, 150)], VASE.jar)[0].droop).toBeGreaterThan(0)
  })

  it('holds any length upright in the boot: no head tips there, however long the piece', () => {
    for (const len of [60, 150, 330, 372]) for (const at of [-10, -6, 0, 6, 10]) expect(arrange([piece(at, len)], BOOT)[0].droop, `${len} at ${at}`).toBe(0)
    const full = arrange([-9, -6, -3, 0, 3, 6, 9].map((at) => piece(at, 372)), BOOT)
    expect(full.every((stance) => stance.droop === 0)).toBe(true)
  })

  it('lets a short piece sink until only its top shows, and never out of sight', () => {
    const [short] = arrange([piece(0, MIN_PIECE)], BOOT)
    expect(short.sink).toBeLessThan(BOOT.depth)
    expect(MIN_PIECE - short.sink).toBeGreaterThan(0)
    const [long] = arrange([piece(0, 300)], BOOT)
    expect(long.sink).toBe(BOOT.depth)
  })
})

describe('the idle ladder', () => {
  it('shows a cut across a stem that still has its flower, and a lying piece on its way to the vase, the one not yet done first', () => {
    const garden = fresh()
    const first = garden.hint(0)
    expect(first?.cut).toBe(true)
    expect(BED.some((spot) => first!.fromX < spot.x && first!.toX > spot.x)).toBe(true)
    cutAndLetGo(garden, 0, 200, 300, 400)
    settle(garden)
    // With a piece on the path and nothing in the boot yet, the carry is what is shown first, and the cut after it.
    expect(garden.hint(0)).toMatchObject({ toX: BOOT.x, cut: false })
    expect(garden.hint(1)?.cut).toBe(true)
    // Once something stands in the boot the cut comes first again, and the carry second.
    cutAndLetGo(garden, 4, 200, OVER_BOOT.x, OVER_BOOT.y)
    settle(garden)
    expect(garden.hint(0)?.cut).toBe(true)
    expect(garden.hint(1)).toMatchObject({ toX: BOOT.x, cut: false })
  })

  it('still has a move to show when every stem is a stalk', () => {
    const garden = fresh()
    for (let index = 0; index < BED.length; index++) cutAndLetGo(garden, index, 20, OVER_BOOT.x, OVER_BOOT.y)
    const hint = garden.hint(0)
    expect(hint).not.toBeNull()
    expect(hint!.cut).toBe(false)
  })

  it('is busy only while something is on its way', () => {
    const garden = fresh()
    expect(garden.busy).toBe(false)
    cutAndLetGo(garden, 0, 200, 300, 400)
    expect(garden.busy).toBe(true)
    settle(garden)
    expect(garden.busy).toBe(false)
  })
})

describe('found as left', () => {
  it('opens a saved garden at rest: nothing moves, nothing sounds, nothing is written', () => {
    const garden = fresh()
    cutAndLetGo(garden, 0, 200, OVER_BOOT.x, OVER_BOOT.y)
    cutAndLetGo(garden, 2, 90, 300, 400)
    const again = new Garden(deserialize(stored(garden), null), 9)
    expect(again.busy).toBe(false)
    expect(again.sounds).toEqual([])
    expect(again.dirty).toBe('no')
    expect(again.bits).toEqual([])
    expect(stored(again)).toEqual(stored(garden))
    again.step(0.016)
    expect(again.sounds).toEqual([])
    expect(again.dirty).toBe('no')
  })

  it('can be put away at any instant of any play and comes back the same, with nothing lost or made', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const chance = makeRng(seed)
      const garden = fresh(seed)
      const somewhere = (): [number, number] => [20 + chance.next() * 1140, 150 + chance.next() * 650]
      for (let turn = 0; turn < 160; turn++) {
        const act = chance.next()
        if (act < 0.3) garden.press(...somewhere())
        else if (act < 0.6) garden.move(...somewhere())
        else if (act < 0.85) garden.lift(...(chance.next() < 0.4 ? [OVER_BOOT.x + (chance.next() - 0.5) * 60, OVER_BOOT.y] as [number, number] : somewhere()))
        else if (act < 0.9) garden.putBack()
        else garden.step(chance.next() * 0.3)
        const saved = stored(garden)
        const read = deserialize(saved, null)
        // What was written is read back whole: no piece was damaged, out of place or over the count.
        expect(JSON.parse(JSON.stringify(serialize(read)))).toEqual(saved)
        expect(read.vase.length).toBeLessThanOrEqual(BOOT.holds)
        expect(read.path.length).toBeLessThanOrEqual(PATH_HOLDS)
        for (const piece of [...read.vase, ...read.path]) expect(piece.len).toBeGreaterThanOrEqual(MIN_PIECE)
        // And a garden opened from it would write the same again.
        expect(stored(new Garden(read, seed + 100))).toEqual(saved)
      }
    }
  })

  it('never loses or makes a length of stem while nothing is grown back and the robin is not called', () => {
    const garden = fresh()
    cutAndLetGo(garden, 0, 200, 420, 500)
    cutAndLetGo(garden, 4, 80, OVER_BOOT.x, OVER_BOOT.y)
    cutAndLetGo(garden, 5, 30, OVER_BOOT.x + 10, OVER_BOOT.y)
    settle(garden)
    const standing = garden.vase[0]
    garden.press(standing.px - 60, BOOT.mouthY - 50)
    garden.move(standing.px + 60, BOOT.mouthY - 50)
    garden.lift(standing.px + 60, BOOT.mouthY - 50)
    settle(garden)
    const saved = garden.toSave()
    for (let index = 0; index < BED.length; index++) expect(lengthOf(saved, index)).toBeCloseTo(fullOf(index), 5)
  })

  it('plays the same garden from the same seed', () => {
    const play = (seed: number): unknown => {
      const garden = fresh(seed)
      for (const index of [0, 3, 5, 7, 9, 11]) cutAndLetGo(garden, index, 70, 260 + index * 50, 420)
      return stored(garden)
    }
    expect(play(7)).toEqual(play(7))
    expect(play(7)).not.toEqual(play(8))
  })
})
