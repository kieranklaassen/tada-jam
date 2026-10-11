import { describe, expect, it } from 'vitest'
import { DOOR_AJAR, FRAME_JUMPS, SET, compose, glowSpots, gooseInScene, handTarget, raccoonLooksAt, raccoonSeen, lineAt, showing, type Item, type Stamp } from './frame'
import { IdleLadder, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, GLOW_RAMP } from './guidance'
import { GOOSE_AT, HANG, LOOKS, MOUND, WATER } from './looks'
import { FRAME_SETTLES, LEAF_SLIDES, POKE_AT } from './motion'
import { SETTLE_SECONDS, Yard, freshYard, type Cue, type YardSave } from './model'
import { GOES_IN, GRID, SENDS, type Act, type Cell } from './pairings'
import { CARDS, EYES, type CardId } from './sprites'
import { FEET, LEG, gooseAt, PLACES, PLACE_IDS, RING, ROUND, ROWS, START, THINGS, bushAt, clampToRow, type PlaceId, type ThingId } from './yard'

const FRAME = 1 / 60

/** A yard with the raccoon standing at a place with a thing in its paws, the other places as given, and the egg out of the way. */
function atPlace(thing: ThingId, place: PlaceId, held: Partial<Record<PlaceId, ThingId>> = {}): Yard {
  const save: YardSave = freshYard()
  save.things.egg = { at: 'floor', x: 430, row: 2 }
  for (const id of PLACE_IDS) { const holds = held[id]; if (holds) save.things[holds] = { at: id } }
  save.things[thing] = { at: 'paws' }
  save.raccoon = { ...PLACES[place].stand }
  // She walks where she cannot see the raccoon at this place: two grooves away from it.
  save.goose = PLACES[place].stand.row === 0 ? { leg: LEG.right, along: 0.1 } : { leg: LEG.toNest, along: 0 }
  return new Yard(save)
}
const tapOn = (place: PlaceId): { x: number; y: number } => ({ x: PLACES[place].hit.x + PLACES[place].hit.w / 2, y: PLACES[place].hit.y + PLACES[place].hit.h / 2 })

/** Starts the pairing and plays it to `t` seconds of the scene, returning the sounds it made and when. */
function playTo(yard: Yard, place: PlaceId, t: number): { at: number; cue: Cue }[] {
  const heard: { at: number; cue: Cue }[] = []
  yard.press(tapOn(place))
  yard.takeCues()
  // The raccoon already stands there: the scene starts on the first step.
  let started = false
  for (let guard = 0; guard < 2000; guard++) {
    yard.step(FRAME)
    if (!started && yard.scene) started = true
    for (const cue of yard.takeCues()) if (yard.scene || cue.name === 'act' || cue.name === 'land') heard.push({ at: yard.scene ? yard.scene.t : -1, cue })
    if (!yard.scene || yard.scene.t >= t) break
  }
  expect(started).toBe(true)
  return heard
}

const stamps = (items: readonly Item[], who: string): Stamp[] => items.filter((item): item is Stamp => item.kind === 'stamp' && item.who === who)
const print = (items: readonly Item[], who: string): string => JSON.stringify(stamps(items, who).map((s) => [s.card, Math.round(s.x * 10), Math.round(s.y * 10), Math.round(s.tilt * 1000), Math.round(s.sx * 1000), Math.round(s.sy * 1000), Math.round(s.alpha * 100)]))

/** Runs `inside` with one act taken out of a cell, and puts it back. */
function without<T>(cell: Cell, act: Act, inside: () => T): T {
  const holder = cell as { acts: readonly Act[] }
  const all = holder.acts
  holder.acts = all.filter((other) => other !== act)
  try { return inside() } finally { holder.acts = all }
}

const makerOf = (act: Act, thing: ThingId): string => (act.who === 'thing' ? thing : act.who)

describe('a sound and its maker', () => {
  it('draws the maker of every sound of every pairing doing it while it sounds: the picture changes when the act is taken away', () => {
    let checked = 0
    for (const thing of THINGS) for (const place of PLACE_IDS) {
      const cell = GRID[thing][place]
      for (const act of cell.acts) {
        if (!act.sound) continue
        const who = makerOf(act, thing)
        let differs = false, drawn = false
        for (const part of [0.3, 0.6]) {
          const t = GOES_IN + act.at + part * act.len
          const run = (): string => { const yard = atPlace(thing, place); playTo(yard, place, t); expect(yard.scene, `${thing} ${place} still playing at ${act.does}`).not.toBeNull(); return print(compose(yard, null), who) }
          const withIt = run(), withoutIt = without(cell, act, run)
          if (withIt !== '[]') drawn = true
          if (withIt !== withoutIt) differs = true
        }
        expect(drawn, `${thing} in ${place}: ${who} is drawn while "${act.sound}" sounds`).toBe(true)
        expect(differs, `${thing} in ${place}: ${who} is drawn doing "${act.does}" while "${act.sound}" sounds`).toBe(true)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(110)
  }, 120000)

  it('sounds every act of a pairing at the moment it starts, and nothing else', () => {
    for (const thing of THINGS) for (const place of PLACE_IDS) {
      const cell = GRID[thing][place]
      const yard = atPlace(thing, place)
      const heard = playTo(yard, place, 60).filter((entry) => entry.cue.name === 'act')
      const expected = [{ t: 0, sound: 'putIn' }, ...cell.acts.filter((act) => act.sound).map((act) => ({ t: GOES_IN + act.at, sound: act.sound! }))].sort((a, b) => a.t - b.t)
      expect(heard.map((entry) => entry.cue.sound), `${thing} ${place}`).toEqual(expected.map((entry) => entry.sound))
      heard.forEach((entry, i) => { if (entry.at >= 0) expect(Math.abs(entry.at - expected[i].t), `${thing} ${place} ${entry.cue.sound}`).toBeLessThan(FRAME * 1.5) })
      expect(yard.scene).toBeNull()
    }
  })

  it('draws the maker of every sound of a round doing it: each short form, the owner who sends the old thing on, and the last thing landing on the floor', () => {
    for (const thing of THINGS) for (const place of PLACE_IDS) {
      const old = THINGS.find((id) => id !== thing && id !== 'egg')!
      const cell = GRID[thing][place], [w0, w1] = cell.short
      for (const act of cell.acts) {
        if (!act.sound || act.at < w0 || act.at >= w1) continue
        const who = makerOf(act, thing)
        const t = GOES_IN + (act.at - w0) + Math.min(0.4 * act.len, (w1 - act.at) * 0.5)
        const run = (): string => { const yard = atPlace(thing, place, { [place]: old }); playTo(yard, place, t); expect(yard.scene?.plan.round).toBe(true); return print(compose(yard, null), who) }
        expect(run(), `${thing} in ${place}, short: ${who} doing "${act.does}"`).not.toBe(without(cell, act, run))
      }
    }
    for (const place of PLACE_IDS) {
      const sender = SENDS[place]
      const run = (): string => { const yard = atPlace('cabbage', place, { [place]: 'ball' }); playTo(yard, place, GOES_IN * 0.5); return print(compose(yard, null), sender.who) }
      const holder = SENDS as Record<PlaceId, Act>
      const withIt = run()
      holder[place] = { ...sender, does: 'nothing' }
      const withoutIt = run()
      holder[place] = sender
      expect(withIt, `${place}: ${sender.who} sends the old thing on`).not.toBe(withoutIt)
    }
    // The raccoon leans in as it puts the thing in, and stands straight afterwards.
    const yard = atPlace('ball', 'nest')
    playTo(yard, 'nest', GOES_IN * 0.5)
    const leaning = stamps(compose(yard, null), 'raccoon')[0].tilt
    for (let i = 0; i < 60; i++) yard.step(FRAME)
    expect(Math.abs(leaning)).toBeGreaterThan(0.1)
    expect(Math.abs(leaning - stamps(compose(yard, null), 'raccoon')[0].tilt)).toBeGreaterThan(0.1)
  }, 120000)

  it('lands the thing that comes round onto the floor with its own landing as it arrives, and it is seen landing', () => {
    const yard = atPlace('cabbage', 'nest', { nest: 'ball', pond: 'potato', bowl: 'boot', line: 'clock', scarecrow: 'egg' })
    const heard = playTo(yard, 'nest', 60)
    const land = heard.filter((entry) => entry.cue.name === 'land')
    expect(land).toHaveLength(1)
    expect(land[0].cue.n).toBe(THINGS.indexOf('egg'))
    expect(yard.things.egg.at).toBe('floor')
  })
})

describe('the boot hat', () => {
  // The boot reaches the scarecrow from the paws, or from the line in the middle of a round; the pond is full or empty.
  const cases: [string, ThingId, PlaceId, Partial<Record<PlaceId, ThingId>>][] = [
    ['from the paws, pond empty', 'boot', 'scarecrow', {}],
    ['from the paws, pond full', 'boot', 'scarecrow', { pond: 'ball' }],
    ['through a round, pond empty', 'clock', 'line', { line: 'boot' }],
    ['through a round, pond full', 'clock', 'line', { line: 'boot', pond: 'ball' }],
    ['through a round that began at the nest', 'cabbage', 'nest', { nest: 'ball', pond: 'potato', bowl: 'clock', line: 'boot', scarecrow: 'egg' }],
  ]
  for (const [name, thing, place, held] of cases) {
    it(`is the same every time, ${name}: she squawks, dives with a great splash that is drawn, sends on what is in the pond, and climbs out`, () => {
      const yard = atPlace(thing, place, held)
      yard.press(tapOn(place))
      yard.takeCues()
      const acts: string[] = []
      let splashed = 0, inPond = 0, climbing = 0, lifted = 0, guard = 0
      const wasInPond = held.pond ?? (place === 'nest' ? held.nest : undefined)
      while (guard++ < 4000) {
        yard.step(FRAME)
        if (!yard.scene) break
        for (const cue of yard.takeCues()) if (cue.name === 'act') acts.push(cue.sound!)
        const items = compose(yard, null)
        const goose = gooseInScene(yard)
        const bolt = yard.scene.plan.timed.find((step) => step.thing === 'boot' && step.place === 'scarecrow')!
        const u = yard.scene.t - bolt.at - GOES_IN + bolt.w0
        const dive = GRID.boot.scarecrow.acts.find((act) => act.does === 'dive')!, climb = GRID.boot.scarecrow.acts.find((act) => act.does === 'climbOut')!
        if (u >= dive.at && u < dive.at + dive.len) {
          inPond++
          expect(goose.x, name).toBe(GOOSE_AT.pond.x)
          if (stamps(items, 'splash').some((item) => item.card === 'splash' && item.x === GOOSE_AT.pond.x)) splashed++
        }
        if (u >= climb.at && u < climb.at + climb.len) { climbing++; if (goose.lifted) lifted++; expect(goose.x, name).toBe(GOOSE_AT.pond.x) }
      }
      expect(yard.scene, name).toBeNull()
      expect(acts, name).toEqual(expect.arrayContaining(['squawk', 'greatSplash', 'shakeDry']))
      expect(inPond, name).toBeGreaterThan(20)
      expect(splashed, name).toBe(inPond)
      // She climbs out on her own feet in the short form too: no lift on her wire while she does.
      expect(climbing, name).toBeGreaterThan(20)
      expect(lifted, name).toBe(0)
      expect(yard.things.boot, name).toEqual({ at: 'scarecrow' })
      // Whatever was in the pond when she landed has been sent on, and she is back on her lane.
      if (wasInPond) expect(yard.things[wasInPond].at, name).not.toBe('pond')
      expect(yard.goose.mode, name).not.toBe('scene')
      expect(yard.goose.leg, name).toBe(LEG.right)
      const all = THINGS.map((id) => JSON.stringify(yard.things[id]))
      expect(new Set(all).size, name).toBe(THINGS.length)
    })
  }
})

describe('a scene is a view of an outcome that is already saved', () => {
  it('saves the whole outcome when it starts, at once: a pairing, and a round with the thing that comes round on the floor', () => {
    const one = atPlace('ball', 'pond')
    one.press(tapOn('pond'))
    one.step(FRAME)
    expect(one.scene).not.toBeNull()
    expect(one.takeDirty()).toBe(2)
    expect(one.toSave().things.ball).toEqual({ at: 'pond' })

    const round = atPlace('cabbage', 'nest', { nest: 'ball', pond: 'potato', bowl: 'boot', line: 'clock', scarecrow: 'egg' })
    round.press(tapOn('nest'))
    round.step(FRAME)
    expect(round.takeDirty()).toBe(2)
    const saved = round.toSave().things
    expect([saved.cabbage, saved.ball, saved.potato, saved.boot, saved.clock].map((loc) => loc.at)).toEqual(['nest', 'pond', 'bowl', 'line', 'scarecrow'])
    expect(saved.egg.at).toBe('floor')
    for (const id of THINGS) expect(saved[id].at).not.toBe('paws')
  })

  it('is found done when the game is put away in the middle of it: nothing plays on load', () => {
    const yard = atPlace('boot', 'scarecrow', { pond: 'ball' })
    playTo(yard, 'scarecrow', 1.2)
    const saved = JSON.parse(JSON.stringify(yard.toSave())) as YardSave
    expect(saved.things.boot).toEqual({ at: 'scarecrow' })
    expect(saved.things.ball).toEqual({ at: 'bowl' })
    // She is never saved in the pond: she is on her round, where she will climb out to.
    expect(saved.goose.leg).toBe(LEG.right)
    const again = new Yard(saved)
    expect(again.scene).toBeNull()
    const heard: Cue[] = []
    for (let t = 0; t < 8; t += FRAME) { again.step(FRAME); heard.push(...again.takeCues()) }
    expect(heard.filter((cue) => cue.name === 'act' || cue.name === 'land')).toEqual([])
    expect(again.goose.mode).toBe('round')
    // What it shows is the last picture, rebuilt from which thing is in which place.
    const rest = showing(again)
    expect(rest.at.scarecrow).toMatchObject({ thing: 'boot', u: Infinity })
    expect(rest.at.bowl).toMatchObject({ thing: 'ball', u: Infinity })
  })

  it('gives way to any touch: the rest of it stays quiet, what was sounding is hushed, and the touch is an ordinary one', () => {
    const yard = atPlace('clock', 'nest')
    playTo(yard, 'nest', 1)
    yard.takeCues()
    yard.press({ x: 600, y: ROWS[1] - 34 })
    expect(yard.scene).toBeNull()
    const cues = yard.takeCues()
    expect(cues[0]).toEqual({ name: 'hush', n: 0 })
    expect(cues.some((cue) => cue.name === 'aim')).toBe(true)
    expect(yard.target).toEqual({ kind: 'floor', x: 600, row: 1 })
    expect(yard.things.clock).toEqual({ at: 'nest' })
    const heard: Cue[] = []
    for (let t = 0; t < 6; t += FRAME) { yard.step(FRAME); heard.push(...yard.takeCues()) }
    expect(heard.filter((cue) => cue.name === 'act')).toEqual([])
    expect(yard.goose.mode).not.toBe('scene')
  })

  it('leaves the pond empty after the boot hat unless the round itself tips a thing into it, and never leaves the goose in it', () => {
    const plain = atPlace('boot', 'scarecrow', { pond: 'ball' })
    playTo(plain, 'scarecrow', 60)
    expect(plain.heldBy('pond')).toBeNull()
    expect(plain.goose.leg).toBe(LEG.right)
    const tipped = atPlace('boot', 'scarecrow', { pond: 'ball', scarecrow: 'cabbage', nest: 'potato' })
    playTo(tipped, 'scarecrow', 60)
    expect(tipped.heldBy('pond')).toBe('potato')
    expect(tipped.heldBy('bowl')).toBe('ball')
  })

  it('takes a thing out of a place whole and plain, and shows each thing once at every moment of every pairing', () => {
    for (const thing of THINGS) for (const place of PLACE_IDS) {
      const yard = atPlace(thing, place, { [RING[place]]: THINGS.find((id) => id !== thing && id !== 'egg')! })
      yard.press(tapOn(place))
      for (let t = 0; t < 7; t += FRAME * 3) {
        yard.step(FRAME * 3)
        const items = compose(yard, null)
        for (const id of THINGS) {
          const count = stamps(items, id).length
          const buried = id === 'egg' && yard.things.egg.at === 'bowl'
          expect(count, `${id} during ${thing} in ${place} at ${t.toFixed(2)}`).toBeLessThanOrEqual(1)
          if (!buried) expect(count, `${id} during ${thing} in ${place} at ${t.toFixed(2)}`).toBe(1)
        }
      }
      // Taken out again, it is the plain thing in the paws.
      yard.press(tapOn(place))
      for (let i = 0; i < 40; i++) yard.step(FRAME)
      expect(yard.carried(), `${thing} out of ${place}`).toBe(thing)
      const carried = stamps(compose(yard, null), thing)
      expect(carried.map((s) => s.card)).toEqual([thing])
    }
  }, 60000)
})

describe('nothing is drawn through anything', () => {
  const box = (s: Stamp): { l: number; r: number; t: number; b: number } => {
    const card = CARDS[s.card as CardId]
    const l = s.x - (s.sx >= 0 ? card.ax : card.w - card.ax) * Math.abs(s.sx), t = s.y - card.ay * s.sy
    return { l, r: l + card.w * Math.abs(s.sx), t, b: Math.min(s.cutBelow ?? Infinity, t + card.h * s.sy) }
  }
  const over = (a: Stamp, b: Stamp): number => {
    const A = box(a), B = box(b)
    return Math.max(0, Math.min(A.r, B.r) - Math.max(A.l, B.l)) * Math.max(0, Math.min(A.b, B.b) - Math.max(A.t, B.t)) > 0 ? Math.min(A.r, B.r) - Math.max(A.l, B.l) : 0
  }

  it('lays what lies about in front of its own groove and behind the next: a figure in the same groove is drawn before it, a figure one groove forward after it', () => {
    const save = freshYard()
    save.things.ball = { at: 'floor', x: 600, row: 1 }
    save.raccoon = { x: 600, row: 1 }
    save.goose = { leg: LEG.right, along: 0.5 }
    const behind = compose(new Yard(save), null)
    const order = (items: Item[], who: string): number => items.findIndex((item) => item.kind === 'stamp' && item.who === who)
    expect(order(behind, 'raccoon')).toBeLessThan(order(behind, 'ball'))
    save.raccoon = { x: 600, row: 2 }
    save.goose = { leg: LEG.left, along: 0.9 }
    const front = compose(new Yard(save), null)
    expect(order(front, 'ball')).toBeLessThan(order(front, 'raccoon'))
    const ball = stamps(front, 'ball')[0]
    expect(ball.y).toBeGreaterThan(ROWS[1])
    expect(ball.y).toBeLessThan(ROWS[2] - 40)
  })

  it('keeps the washing clear of itself, of the prop and of what hangs on the line, as it hangs and when it has slid to the potato', () => {
    const rest = stamps(compose(new Yard(), null), 'line')
    expect(rest).toHaveLength(SET.washing.length)
    for (let i = 1; i < rest.length; i++) expect(over(rest[i - 1], rest[i]), `washing ${i}`).toBe(0)
    const pole = stamps(compose(new Yard(), null), 'pole')[0]
    expect(over(pole, rest[0])).toBe(0)
    for (const thing of THINGS) {
      const save = freshYard()
      save.things.egg = { at: 'floor', x: 430, row: 2 }
      save.things[thing] = { at: 'line' }
      const items = compose(new Yard(save), null)
      const hung = stamps(items, thing)[0], washing = stamps(items, 'line')
      for (let i = 1; i < washing.length; i++) expect(over(washing[i - 1], washing[i]), `${thing}: washing ${i}`).toBe(0)
      // The ball is the knee of the long johns, pegged into the leg: it alone lies on a piece of washing.
      for (const [i, piece] of washing.entries()) if (!(thing === 'ball' && i === 0)) expect(over(hung, piece), `${thing} on washing ${i}`).toBeLessThanOrEqual(2)
    }
    expect(lineAt(HANG.u, 1).y).toBeGreaterThan(lineAt(HANG.u, 0).y + 50)
  })

  it('floats things between the reeds and the lily pad, and lands the goose in the pond clear of the frog', () => {
    for (const thing of THINGS) {
      const look = LOOKS.pond[thing], card = CARDS[look.card ?? thing]
      expect(look.x + (card.w - card.ax) * look.scale, thing).toBeLessThanOrEqual(SET.lily.x - CARDS.lily.ax)
    }
    const yard = atPlace('boot', 'scarecrow')
    yard.press(tapOn('scarecrow'))
    let inPond = 0
    for (let t = 0; t < 7; t += FRAME) {
      yard.step(FRAME)
      const items = compose(yard, null)
      const goose = stamps(items, 'goose')[0], frog = stamps(items, 'frog')[0]
      if (goose.cutBelow === WATER) { inPond++; expect(over(goose, frog), `at ${t.toFixed(2)}`).toBe(0) }
    }
    expect(inPond).toBeGreaterThan(30)
    expect(GOOSE_AT.pond.x).toBeLessThan(SET.frog.x - 100)
  })

  it('never draws the raccoon and the goose over each other while a pairing has her at the nest or under the line, right beside it', () => {
    let set = 0
    for (const [thing, place] of [['ball', 'nest'], ['egg', 'line'], ['potato', 'nest'], ['clock', 'nest'], ['boot', 'nest'], ['cabbage', 'nest'], ['egg', 'nest']] as const) {
      const yard = atPlace(thing, place)
      yard.press(tapOn(place))
      for (let t = 0; t < 6.5; t += FRAME * 2) {
        yard.step(FRAME * 2)
        if (!yard.scene) break
        const items = compose(yard, null)
        const goose = stamps(items, 'goose')[0], raccoon = stamps(items, 'raccoon')[0]
        // Lifted from one spot to another she passes over everything; set down where the pairing has her, her card is clear of the raccoon's.
        const at = gooseInScene(yard)
        const sameLayer = !at.lifted && [GOOSE_AT.nest, GOOSE_AT.under].some((spot) => spot.x === at.x && spot.y === at.y)
        if (sameLayer) set++
        if (sameLayer) expect(over(goose, raccoon), `${thing} ${place} at ${t.toFixed(2)}`).toBe(0)
      }
    }
    expect(set).toBeGreaterThan(200)
  })
})

describe('a place whose thing is taken out', () => {
  it('has its owner tip over from the picture it was in and settle, with no jump between two frames', () => {
    const cases: [ThingId, PlaceId, string][] = [['cabbage', 'bowl', 'dog'], ['ball', 'pond', 'frog'], ['egg', 'scarecrow', 'crow']]
    for (const [thing, place, who] of cases) {
      const save = freshYard()
      save.things.egg = { at: 'floor', x: 180, row: 3 }
      save.things[thing] = { at: place }
      save.raccoon = { ...PLACES[place].stand }
      save.goose = PLACES[place].stand.row === 0 ? { leg: LEG.right, along: 0.1 } : { leg: LEG.toNest, along: 0 }
      const yard = new Yard(save)
      const seen = (): Stamp => stamps(compose(yard, null), who)[0]
      const held = seen()
      yard.press(tapOn(place))
      const frames: Stamp[] = [held]
      for (let i = 0; i < Math.ceil(SETTLE_SECONDS / FRAME) + 2; i++) { yard.step(FRAME); frames.push(seen()) }
      expect(yard.carried(), who).toBe(thing)
      // No step between two frames is more than a part of the whole way, in place or in tilt.
      const far = Math.hypot(frames[frames.length - 1].x - held.x, frames[frames.length - 1].y - held.y)
      for (let i = 1; i < frames.length; i++) {
        expect(Math.hypot(frames[i].x - frames[i - 1].x, frames[i].y - frames[i - 1].y), `${who} frame ${i}`).toBeLessThanOrEqual(far * 0.2 + 3)
        // A whole turn is the same picture, so the tilt is compared as an angle.
        const turned = frames[i].tilt - frames[i - 1].tilt
        expect(Math.abs(Math.atan2(Math.sin(turned), Math.cos(turned))), `${who} frame ${i}`).toBeLessThan(0.5)
      }
      expect(yard.left[place], who).toBeNull()
    }
  })
})

describe('what is sounded is drawn', () => {
  /** A raccoon with empty paws at an empty place, poked: the frames after the poke sounds, with their age. */
  function poked(place: PlaceId): { yard: Yard; frames: { since: number; items: Item[] }[] } {
    const save = freshYard()
    save.things.egg = { at: 'floor', x: 180, row: 3 }
    save.things.ball = { at: 'floor', x: 300, row: 1 }
    save.raccoon = { ...PLACES[place].stand }
    save.goose = PLACES[place].stand.row === 0 ? { leg: LEG.right, along: 0.1 } : { leg: LEG.toNest, along: 0 }
    const yard = new Yard(save)
    yard.press(tapOn(place))
    const frames: { since: number; items: Item[] }[] = []
    let since = -1
    for (let i = 0; i < 200 && since < 1.2; i++) {
      yard.step(FRAME)
      if (yard.takeCues().some((cue) => cue.name === 'poke')) since = 0
      else if (since >= 0) since += FRAME
      if (since >= 0) frames.push({ since, items: compose(yard, null) })
    }
    expect(since).toBeGreaterThan(1)
    return { yard, frames }
  }

  it('lifts the crow\'s head for its caw when the scarecrow is tickled, while the caw sounds and not before', () => {
    const { frames } = poked('scarecrow')
    const cawing = frames.filter((f) => f.since >= POKE_AT.caw + 0.05 && f.since < POKE_AT.caw + POKE_AT.cawLasts - 0.05)
    expect(cawing.length).toBeGreaterThan(8)
    for (const f of cawing) expect(stamps(f.items, 'crow')[0].sx).toBeGreaterThan(1.01)
    for (const f of frames.filter((f) => f.since < POKE_AT.caw - 0.02 || f.since > POKE_AT.caw + POKE_AT.cawLasts + 0.02)) expect(stamps(f.items, 'crow')[0].sx).toBe(1)
  })

  it('has the raccoon\'s tongue flick drops out of the empty bowl as the lick sounds, and the dog lean over it for his growl', () => {
    const { frames } = poked('bowl')
    const drops = (f: { items: Item[] }): number => f.items.filter((item) => item.kind === 'stamp' && item.card === 'drop').length
    expect(drops(frames[2])).toBeGreaterThan(0)
    for (const f of frames.filter((f) => f.since > POKE_AT.lick + POKE_AT.lickLasts + 0.02)) expect(drops(f)).toBe(0)
    const lean = (f: { items: Item[] }): number => stamps(f.items, 'dog')[0].tilt
    const middle = frames.find((f) => f.since >= POKE_AT.growl + POKE_AT.growlLasts / 2)!
    const rest = frames[frames.length - 1]
    expect(lean(middle)).toBeLessThan(lean(rest) - 0.06)
  })

  it('lets one leaf slide off a cabbage that is set down, as the rustle sounds', () => {
    const save = freshYard()
    save.things.cabbage = { at: 'paws' }
    save.raccoon = { x: 600, row: 3 }
    save.goose = { leg: LEG.toNest, along: 0 }
    const yard = new Yard(save)
    yard.press({ x: 700, y: ROWS[3] - 34 })
    const leaves: number[] = []
    let since = -1
    for (let i = 0; i < 400 && since < 1.2; i++) {
      yard.step(FRAME)
      if (yard.takeCues().some((cue) => cue.name === 'land')) since = 0
      else if (since >= 0) since += FRAME
      if (since >= 0 && compose(yard, null).some((item) => item.kind === 'stamp' && item.card === 'leaf')) leaves.push(since)
    }
    expect(since).toBeGreaterThan(1)
    expect(leaves.length).toBeGreaterThan(15)
    expect(Math.min(...leaves)).toBeGreaterThanOrEqual(LEAF_SLIDES.at - 0.02)
    expect(Math.max(...leaves)).toBeLessThanOrEqual(LEAF_SLIDES.at + LEAF_SLIDES.lasts + 0.02)
  })
})

describe('the raccoon\'s eyes', () => {
  it('are on the thing that lies nearest while the goose is far off, on what it carries, and on the goose when she is near or alarmed', () => {
    const far = freshYard()
    far.goose = { leg: LEG.lookRight, along: 0 }
    const calm = new Yard(far)
    expect(raccoonLooksAt(calm)).toEqual(handTarget(calm))
    const ball = START.ball as { x: number }
    expect(Math.abs(raccoonLooksAt(calm).x - ball.x)).toBeLessThan(1)

    const held = freshYard()
    held.goose = { leg: LEG.lookRight, along: 0 }
    held.things.potato = { at: 'paws' }
    const carrying = new Yard(held)
    expect(raccoonLooksAt(carrying).y).toBeLessThan(ROWS[2] - 100)
    expect(Math.abs(raccoonLooksAt(carrying).x - 150)).toBeLessThan(40)

    const near = freshYard()
    near.goose = { leg: LEG.right, along: 0 }
    near.raccoon = { x: 700, row: 2 }
    const watched = new Yard(near)
    const g = watched.gooseNow()
    expect(raccoonLooksAt(watched)).toEqual({ x: g.x, y: g.y - 150 })
  })
})

describe('the goose sees what is drawn on the floor, and nothing else', () => {
  /** The test's own reading of "inside a shape": crossings of a line going right from the point. */
  const within = (shape: readonly { x: number; y: number }[], x: number, y: number): boolean => {
    let crossings = 0
    shape.forEach((a, i) => {
      const b = shape[(i + 1) % shape.length]
      if ((a.y > y) === (b.y > y)) return
      if (a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x) > x) crossings++
    })
    return crossings % 2 === 1
  }
  /** For a yard whose goose is in some state: every open spot of the floor is seen exactly when it lies under a drawn shape. */
  function agrees(yard: Yard, name: string): { seen: number; shapes: number } {
    const shapes = compose(yard, null).filter((item): item is Extract<Item, { kind: 'gaze' }> => item.kind === 'gaze').map((item) => item.points)
    const wrong: string[] = []
    let seen = 0
    for (let row = 0; row < ROWS.length; row++) {
      for (let x = 112; x <= 1070; x += 7) {
        if (clampToRow(row, x) !== x || bushAt(x, row) >= 0) continue
        yard.raccoon.x = x
        yard.raccoon.row = row
        const drawn = shapes.some((shape) => within(shape, x, ROWS[row] - FEET))
        if (yard.sees()) seen++
        if (yard.sees() !== drawn && wrong.length < 4) wrong.push(`${name}: x ${x} groove ${row} seen ${yard.sees()} drawn ${drawn}`)
      }
    }
    expect(wrong).toEqual([])
    return { seen, shapes: shapes.length }
  }

  it('on every leg of her round, at every point along it: walking, looking into the nest, looking about, and hopping', () => {
    for (let leg = 0; leg < ROUND.length; leg++) {
      for (const along of [0, 0.2, 0.45, 0.55, 0.8, 0.999]) {
        const save = freshYard()
        save.goose = { leg, along }
        save.raccoon = { x: 150, row: 2 }
        const yard = new Yard(save)
        // The child has touched the screen: a tap on the curtain moves nothing.
        yard.press({ x: 20, y: 400 })
        const { seen, shapes } = agrees(yard, `leg ${leg} at ${along}`)
        expect(seen, `leg ${leg}`).toBeGreaterThan(10)
        // Before a hop and during it the patch she will land on is drawn too, and is part of what she sees.
        const kind = ROUND[leg].kind, next = ROUND[(leg + 1) % ROUND.length].kind
        expect(shapes, `leg ${leg}`).toBe(kind === 'hop' || (kind === 'look' && next === 'hop') ? 2 : 1)
      }
    }
  })

  it('in the middle of a double-take, and sees nothing at all before the child has touched the screen or while she is not watching', () => {
    const save = freshYard()
    save.goose = { leg: LEG.lookLeft, along: 0 }
    save.raccoon = { x: 250, row: 1 }
    const taking = new Yard(save)
    taking.press({ x: 20, y: 400 })
    for (let i = 0; i < 12; i++) taking.step(FRAME)
    expect(taking.goose.mode).toBe('take')
    expect(agrees(taking, 'double-take').seen).toBeGreaterThan(10)

    // Untouched, as after a load: the wedge lies on the floor and she notices nothing under it.
    const asleep = new Yard(save)
    expect(asleep.sees()).toBe(false)
    expect(compose(asleep, null).some((item) => item.kind === 'gaze')).toBe(true)
  })
})

describe('the barn door', () => {
  it('stays shut while the farmer dozes, is pushed ajar while a tap has him awake, and stands open while he tidies', () => {
    const yard = new Yard()
    const widths = (seconds: number): number[] => {
      const seen: number[] = []
      for (let t = 0; t < seconds; t += FRAME) { yard.step(FRAME); seen.push(stamps(compose(yard, null), 'door')[0].sx) }
      return seen
    }
    expect(Math.min(...widths(1))).toBe(1)
    yard.press({ x: 1000, y: 330 })
    // The creak sounds in the frame the door starts to swing, and at no other time.
    const awake: number[] = [], creaks: number[] = []
    for (let i = 0; i < 150; i++) {
      yard.step(FRAME)
      if (yard.takeCues().some((cue) => cue.name === 'creak')) creaks.push(i)
      awake.push(stamps(compose(yard, null), 'door')[0].sx)
    }
    expect(creaks).toHaveLength(2)
    for (const i of creaks) { expect(awake[i - 1]).toBe(1); expect(awake[i + 2]).toBeLessThan(1) }
    expect(Math.min(...awake)).toBeCloseTo(1 - 0.86 * DOOR_AJAR, 2)
    expect(stamps(compose(yard, null), 'farmer')[0].card).toBe('farmerPeek')
    yard.press({ x: 1000, y: 330 })
    expect(Math.min(...widths(0.5))).toBeCloseTo(0.14, 2)
  })
})

describe('the idle ladder', () => {
  it('glows on the things while the paws are empty and on the five places while they are full, and shows nothing over a scene', () => {
    const empty = new Yard()
    expect(glowSpots(empty)).toHaveLength(THINGS.length)
    const full = atPlace('ball', 'nest')
    const spots = glowSpots(full)
    expect(spots).toHaveLength(PLACE_IDS.length)
    PLACE_IDS.forEach((id, i) => expect(spots[i].x).toBe(PLACES[id].holds.x))
    const glowing = new IdleLadder(0).update(IDLE_BEFORE_GLOW + GLOW_RAMP)
    expect(compose(full, glowing).filter((item) => item.kind === 'glow')).toHaveLength(PLACE_IDS.length)
    playTo(full, 'nest', 1)
    expect(glowSpots(full)).toHaveLength(0)
    const hand = new IdleLadder(0).update(IDLE_BEFORE_DEMO + 1)
    expect(compose(full, hand).some((item) => item.kind === 'stamp' && item.card === 'hand')).toBe(false)
  })

  it('taps the thing nearest the raccoon with empty paws, and with a thing in the paws one of the five places, a different one each time', () => {
    const empty = new Yard()
    const nearest = handTarget(empty)!
    const ball = START.ball
    expect(ball.at === 'floor' && Math.abs(nearest.x - ball.x) < 1).toBe(true)
    const full = atPlace('ball', 'nest')
    // Before any showing has come up there is no place to show.
    expect(handTarget(full)).toBeNull()
    /** One more showing of the hand, in a new idle stretch every third time, and the place it shows. */
    const next = (yard: Yard, i: number): PlaceId => { yard.showHand(-1); yard.showHand(i % 3); yard.showHand(i % 3); const at = handTarget(yard)!; return PLACE_IDS.find((id) => PLACES[id].holds.x === at.x)! }
    const shown = Array.from({ length: 12 }, (_, i) => next(full, i))
    // Never the same place twice running, across idle stretches too, and every place gets its turn.
    for (let i = 1; i < shown.length; i++) expect(shown[i]).not.toBe(shown[i - 1])
    expect(new Set(shown).size).toBe(PLACE_IDS.length)
    // The first one shown is the place nearest the raccoon, so it is not always the nest.
    expect(shown[0]).toBe('nest')
    expect(next(atPlace('ball', 'bowl'), 0)).toBe('bowl')
    expect(next(atPlace('ball', 'scarecrow'), 0)).toBe('scarecrow')
    // Showings with empty paws use up no place: from the home bush the first showing with full paws is the same
    // place, the one nearest the raccoon, however many times the hand came up before the thing was lifted.
    const firstFrom = (emptyShowings: number): PlaceId => {
      const yard = new Yard()
      for (let i = 0; i < emptyShowings; i++) { yard.showHand(-1); yard.showHand(i % 3) }
      yard.things.ball = { at: 'paws' }
      return next(yard, 0)
    }
    const home = new Yard().raccoon
    const nearestHome = [...PLACE_IDS].sort((a, b) => Math.hypot(PLACES[a].stand.x - home.x, (PLACES[a].stand.row - home.row) * 90) - Math.hypot(PLACES[b].stand.x - home.x, (PLACES[b].stand.row - home.row) * 90))[0]
    expect(firstFrom(0)).toBe(nearestHome)
    for (const n of [1, 2, 3, 7]) expect(firstFrom(n), `${n} showings with empty paws`).toBe(nearestHome)
    // While she looks into the nest the hand never lies over her, and still never shows a place twice running.
    const save = freshYard()
    save.things.ball = { at: 'paws' }
    save.raccoon = { ...PLACES.nest.stand }
    save.goose = { leg: LEG.nest, along: 0.5 }
    const atNest = new Yard(save)
    const round = Array.from({ length: 10 }, (_, i) => next(atNest, i))
    expect(round).not.toContain('nest')
    for (let i = 1; i < round.length; i++) expect(round[i]).not.toBe(round[i - 1])
  })
})

describe('the setting answers a tap as itself', () => {
  const stamps = (yard: Yard, card: CardId): Stamp[] => compose(yard, null).filter((item): item is Stamp => item.kind === 'stamp' && item.card === card)

  it('whirls the sun, drops an apple from the tree, sends a sparrow along the fence and bumps the frame, each drawn in the frame the finger lands and gone again after', () => {
    const yard = new Yard()
    const rest = { sun: stamps(yard, 'sun')[0], apron: stamps(yard, 'apron')[0], pelmet: stamps(yard, 'pelmet')[0], count: compose(yard, null).length }
    expect(stamps(yard, 'apple')).toHaveLength(0)
    yard.press({ x: 384, y: 128 })
    yard.press({ x: 160, y: 110 })
    yard.press({ x: 780, y: 392 })
    yard.press({ x: 600, y: 800 })
    yard.step(FRAME * 3)
    expect(stamps(yard, 'sun')[0].tilt).not.toBeCloseTo(rest.sun.tilt, 2)
    expect(stamps(yard, 'apple')).toHaveLength(1)
    expect(stamps(yard, 'apple')[0].x).toBe(160)
    expect(stamps(yard, 'sparrow')).toHaveLength(1)
    // The apron jumps down, away from the floor, and the pelmet that was not knocked stays.
    expect(stamps(yard, 'apron')[0].y).toBeGreaterThan(rest.apron.y)
    expect(stamps(yard, 'pelmet')[0].y).toBe(rest.pelmet.y)
    expect(compose(yard, null).length).toBe(rest.count + 2)
    for (let i = 0; i < 90; i++) yard.step(FRAME)
    expect(stamps(yard, 'apple')).toHaveLength(0)
    expect(stamps(yard, 'sparrow')).toHaveLength(0)
    expect(stamps(yard, 'apron')[0].y).toBe(rest.apron.y)
    expect(compose(yard, null).length).toBe(rest.count)
    yard.press({ x: 600, y: 20 })
    yard.step(FRAME * 3)
    expect(stamps(yard, 'pelmet')[0].y).toBeLessThan(rest.pelmet.y)
    expect(stamps(yard, 'apron')[0].y).toBe(rest.apron.y)
  })

  it('draws the ears going up over the lean of a creep when the tap lands in the middle of one', () => {
    const save = freshYard()
    save.goose = { leg: LEG.lookLeft, along: 0 }
    save.raccoon = { x: 600, row: 3 }
    const yard = new Yard(save)
    yard.press({ x: 940, y: ROWS[3] - 34 })
    for (let i = 0; i < 20; i++) yard.step(FRAME)
    expect(yard.raccoon.mode).not.toBe('still')
    yard.press({ x: 300, y: ROWS[3] - 34 })
    yard.step(FRAME * 4)
    const perked = raccoonSeen(yard)
    yard.stir.perk = 99
    const plain = raccoonSeen(yard)
    expect(perked.face).toBe(-1)
    expect(perked.y).toBeLessThan(plain.y)
  })
})

describe('a place is touched wherever it is drawn', () => {
  /** A yard at rest with one thing in one place, the egg out of the nest, and the goose walking clear of that place. */
  function resting(thing: ThingId, place: PlaceId): Yard {
    const save: YardSave = freshYard()
    if (thing !== 'egg') save.things.egg = { at: 'floor', x: 430, row: 2 }
    // The boot starts beside the pond: it is moved, so that it is the pond that is touched there.
    if (place === 'pond' && thing !== 'boot') save.things.boot = { at: 'floor', x: 760, row: 1 }
    save.things[thing] = { at: place }
    save.goose = place === 'nest' ? { leg: LEG.lookLeft, along: 0 } : PLACES[place].stand.row === 0 ? { leg: LEG.right, along: 0.1 } : { leg: LEG.toNest, along: 0 }
    return new Yard(save)
  }
  /** The middle of a card as it is drawn: its pin, its size and its turn. What is under the water is not counted. */
  function middle(s: Stamp): { x: number; y: number } {
    const card = CARDS[s.card]
    const mx = (card.w / 2 - card.ax) * s.sx, my = (card.h / 2 - card.ay) * s.sy
    const y = s.y + mx * Math.sin(s.tilt) + my * Math.cos(s.tilt)
    return { x: s.x + mx * Math.cos(s.tilt) - my * Math.sin(s.tilt), y: s.cutBelow !== undefined ? Math.min(y, s.cutBelow - 4) : y }
  }
  const drawn = (yard: Yard, who: Stamp['who']): Stamp[] => compose(yard, null).filter((item): item is Stamp => item.kind === 'stamp' && item.who === who)
  const reached = (yard: Yard, at: { x: number; y: number }): unknown => { yard.press(at); return yard.target }

  it('reaches the place from the middle of the thing drawn in it, for every thing in every place, as its last picture leaves it', () => {
    const wrong: string[] = []
    for (const place of PLACE_IDS) for (const thing of THINGS) for (const later of [0, 1.3]) {
      const yard = resting(thing, place)
      for (let t = 0; t < later; t += FRAME) yard.step(FRAME)
      const stamps = drawn(yard, thing)
      // Nothing of the egg the dog buried is drawn: the mound it lies under is what is touched.
      const at = stamps.length ? middle(stamps[0]) : { x: MOUND.x, y: MOUND.y - 20 }
      if (stamps.length !== (thing === 'egg' && place === 'bowl' ? 0 : 1)) wrong.push(`${thing} in ${place}: drawn ${stamps.length} times`)
      const target = reached(yard, at)
      if (JSON.stringify(target) !== JSON.stringify({ kind: 'place', id: place })) wrong.push(`${thing} in ${place} at ${Math.round(at.x)},${Math.round(at.y)}: ${JSON.stringify(target)}`)
    }
    expect(wrong).toEqual([])
  })

  it('reaches the place from its owner as each of the thirty last pictures leaves it, from the middle of its card and from its eyes: the crow on the ball, the frog on the ball or in the boot, the dog on his back', () => {
    const owners: Record<PlaceId, Stamp['who'][]> = { scarecrow: ['scarecrow', 'crow'], pond: ['frog'], bowl: ['dog', 'tail', 'bowl'], nest: ['nest'], line: ['line', 'pole'] }
    /** The eye holes of a card as it is drawn, turned with it. */
    const eyes = (s: Stamp): { x: number; y: number }[] => (EYES[s.card] ?? []).map((eye) => {
      const card = CARDS[s.card], lx = (eye.x - card.ax) * s.sx, ly = (eye.y - card.ay) * s.sy
      return { x: s.x + lx * Math.cos(s.tilt) - ly * Math.sin(s.tilt), y: s.y + lx * Math.sin(s.tilt) + ly * Math.cos(s.tilt) }
    })
    const wrong: string[] = []
    let crowHighest = Infinity
    for (const place of PLACE_IDS) for (const thing of [null, ...THINGS]) for (const later of [0, 1.3]) {
      const yard = thing ? resting(thing, place) : resting('egg', place === 'nest' ? 'pond' : 'nest')
      for (let t = 0; t < later; t += FRAME) yard.step(FRAME)
      for (const who of owners[place]) {
        const stamps = drawn(yard, who)
        if (!stamps.length) wrong.push(`${thing} in ${place}: no ${who} drawn`)
        for (const stamp of stamps) {
          if (who === 'crow') crowHighest = Math.min(crowHighest, middle(stamp).y)
          for (const at of [middle(stamp), ...eyes(stamp)]) {
            // The nest stands in front of the washing, and the goose, the door and what lies on the floor in front of everything.
            if (who === 'line' && at.y > 372 && at.x > 580 && at.x < 720) continue
            const target = reached(yard, at)
            if (JSON.stringify(target) !== JSON.stringify({ kind: 'place', id: place })) wrong.push(`${who} with ${thing} in ${place} at ${Math.round(at.x)},${Math.round(at.y)}: ${JSON.stringify(target)}`)
          }
        }
      }
    }
    expect(wrong).toEqual([])
    // The crow is drawn above the scarecrow's own patch in some picture, which is what this holds.
    expect(crowHighest).toBeLessThan(PLACES.scarecrow.hit.y)
  })

  it('takes the washing line as its rope, its washing and its prop, and not as the sky above the rope or the hills under it', () => {
    const yard = new Yard()
    const heard = (at: { x: number; y: number }): string[] => { yard.press(at); return yard.takeCues().map((cue) => cue.name) }
    for (const u of [0.02, 0.3, 0.5, 0.7, 0.98]) { const at = lineAt(u); expect(reached(yard, at), `the rope at ${u}`).toEqual({ kind: 'place', id: 'line' }) }
    yard.takeCues()
    expect(heard({ x: 560, y: lineAt(0.4).y - 60 })).toEqual(['cloud'])
    expect(heard({ x: 570, y: 330 })).toEqual(['hill'])
    // The farmhouse on the far hills, where it shows under the rope.
    expect(heard({ x: 600, y: 304 })).toEqual(['hill'])
  })

  it('reaches the washing line from every piece of washing and from its prop, wherever the washing has slid to, and the scarecrow from his hands', () => {
    const wrong: string[] = []
    for (const thing of [null, ...THINGS]) {
      const yard = thing ? resting(thing, 'line') : new Yard()
      const pieces = [...drawn(yard, 'line'), ...drawn(yard, 'pole')]
      if (pieces.length !== SET.washing.length + 1) wrong.push(`${thing}: ${pieces.length} pieces`)
      for (const piece of pieces) {
        const at = middle(piece), target = reached(yard, at)
        // The nest stands in front of the washing: where a sheet hangs behind it, the nest is what is touched.
        if (JSON.stringify(target) !== JSON.stringify({ kind: 'place', id: 'line' })) wrong.push(`${thing} on the line, ${piece.card} at ${Math.round(at.x)},${Math.round(at.y)}: ${JSON.stringify(target)}`)
      }
    }
    expect(wrong).toEqual([])
    const yard = new Yard()
    for (const hand of [{ x: 132, y: 286 }, { x: 368, y: 286 }]) expect(reached(yard, hand)).toEqual({ kind: 'place', id: 'scarecrow' })
    // And the other owners where they reach out of their patch: the foot of the scarecrow's pole, the kennel's roof, the reeds, the ends of the rope.
    expect(reached(yard, { x: 250, y: 456 })).toEqual({ kind: 'place', id: 'scarecrow' })
    expect(reached(yard, { x: 1046, y: 574 })).toEqual({ kind: 'place', id: 'bowl' })
    expect(reached(yard, { x: 262, y: 700 })).toEqual({ kind: 'place', id: 'pond' })
    expect(reached(yard, { x: 370, y: 252 })).toEqual({ kind: 'place', id: 'line' })
    expect(reached(yard, { x: 858, y: 216 })).toEqual({ kind: 'place', id: 'line' })
  })

  it('lays the glow and the ghost hand inside what is touched: on a thing in a place they reach that place, and with a thing in the paws each of the five places', () => {
    const wrong: string[] = []
    for (const place of PLACE_IDS) for (const thing of THINGS) {
      const yard = resting(thing, place)
      const spots = glowSpots(yard)
      // One spot for each thing that can be lifted, and each reaches its thing: on the floor the thing, in a place the place.
      const reachedBy = spots.map((spot) => JSON.stringify(reached(yard, spot)))
      if (!reachedBy.includes(JSON.stringify({ kind: 'place', id: place }))) wrong.push(`glow, ${thing} in ${place}: ${reachedBy.join(' ')}`)
      if (reachedBy.some((target) => !target.includes('thing') && !target.includes('place'))) wrong.push(`glow off its target, ${thing} in ${place}: ${reachedBy.join(' ')}`)
      // The hand taps the thing nearest the raccoon: stand the raccoon at the place, so that is the thing in it.
      const save = yard.toSave()
      save.raccoon = { ...PLACES[place].stand }
      for (const other of THINGS) if (other !== thing && save.things[other].at === 'floor') save.things[other] = { at: 'floor', x: place === 'bowl' || place === 'pond' ? 200 : 1000, row: place === 'bowl' || place === 'pond' ? 0 : 3 }
      const near = new Yard(save)
      const hand = handTarget(near)!
      const target = JSON.stringify(reached(near, hand))
      if (target !== JSON.stringify({ kind: 'place', id: place })) wrong.push(`hand, ${thing} in ${place} at ${Math.round(hand.x)},${Math.round(hand.y)}: ${target}`)
    }
    for (const place of PLACE_IDS) {
      const yard = atPlace('ball', place)
      for (const spot of glowSpots(yard)) { const target = reached(new Yard(yard.toSave()), spot) as { kind: string } | null; if (target?.kind !== 'place') wrong.push(`glow with full paws at ${spot.x},${spot.y}: ${JSON.stringify(target)}`) }
      yard.showHand(0)
      const hand = handTarget(yard)!
      const target = reached(new Yard(yard.toSave()), hand) as { kind: string } | null
      if (target?.kind !== 'place') wrong.push(`hand with full paws at ${hand.x},${hand.y}: ${JSON.stringify(target)}`)
    }
    expect(wrong).toEqual([])
  })
})

describe('a game parked is a game loaded', () => {
  const door = { x: 1000, y: 330 }
  /** Each kind of thing that can be playing when the game is parked, driven to its middle. */
  const middles: [string, () => Yard][] = [
    ['a scene', () => {
      const yard = atPlace('ball', 'pond')
      yard.press(tapOn('pond'))
      while (!yard.scene || yard.scene.t < 1) yard.step(FRAME)
      return yard
    }],
    ['a punt', () => {
      const save = freshYard()
      save.goose = { leg: LEG.lookLeft, along: 0 }
      save.raccoon = { x: 250, row: 1 }
      const yard = new Yard(save)
      yard.press({ x: 20, y: 400 })
      while (yard.goose.mode !== 'dash') yard.step(FRAME)
      return yard
    }],
    ['a tidy', () => {
      const save = freshYard()
      save.things.ball = { at: 'pond' }
      save.things.boot = { at: 'floor', x: 700, row: 3 }
      const yard = new Yard(save)
      yard.press(door)
      yard.step(0.3)
      yard.press(door)
      while (yard.tidy.t < 0.9) yard.step(FRAME)
      return yard
    }],
    ['a glare', () => {
      const save = freshYard()
      save.goose = { leg: LEG.right, along: 0.3 }
      save.raccoon = { x: 460, row: 2 }
      const yard = new Yard(save)
      const goose = gooseAt(LEG.right, 0.3)
      yard.press({ x: goose.x, y: goose.y - 100 })
      while (yard.goose.mode !== 'glare') yard.step(FRAME)
      return yard
    }],
    ['a farmer woken by one tap, and a raccoon on an errand', () => {
      const yard = atPlace('ball', 'nest')
      yard.press(door)
      yard.press(tapOn('bowl'))
      for (let i = 0; i < 30; i++) yard.step(FRAME)
      return yard
    }],
  ]

  for (const [what, make] of middles) {
    it(`ends ${what} without a sound, exactly as a load of the same save finds the yard, and one tap on the door after it only wakes the farmer`, () => {
      const parked = make()
      parked.takeCues()
      const save = JSON.parse(JSON.stringify(parked.toSave())) as YardSave
      parked.putAway()
      // Nothing is left queued to sound: the Mount cuts what had started as the game goes to rest.
      expect(parked.takeCues()).toEqual([])
      expect(parked.toSave()).toEqual(save)
      const loaded = new Yard(save)
      loaded.time = parked.time
      expect(compose(parked, null)).toEqual(compose(loaded, null))
      // Back again, with no touch: the two play on alike, sound for sound and picture for picture.
      for (let i = 0; i < 300; i++) {
        parked.step(FRAME)
        loaded.step(FRAME)
        expect(parked.takeCues()).toEqual(loaded.takeCues())
      }
      expect(parked.scene).toBeNull()
      expect(compose(parked, null)).toEqual(compose(loaded, null))
      expect(parked.toSave()).toEqual(loaded.toSave())
      for (const yard of [parked, loaded]) {
        yard.press(door)
        expect(yard.takeCues().map((cue) => cue.name)).toEqual(['wake'])
        expect(yard.tidy.t).toBeLessThan(0)
      }
    })
  }
})

describe('what is sounded at a tap is drawn at it', () => {
  const stampsOf = (yard: Yard, card: CardId): Stamp[] => compose(yard, null).filter((item): item is Stamp => item.kind === 'stamp' && item.card === card)

  it('jumps the gilt frame far enough to see, away from the stage, and settles it: the apron down, the pelmet up', () => {
    const yard = new Yard()
    const rest = { apron: stampsOf(yard, 'apron')[0].y, pelmet: stampsOf(yard, 'pelmet')[0].y }
    yard.press({ x: 600, y: 800 })
    expect(yard.takeCues().map((cue) => cue.name)).toEqual(['frame'])
    // Already on its way in the frame the finger lands in.
    expect(stampsOf(yard, 'apron')[0].y).toBeGreaterThan(rest.apron + 1)
    let most = 0, seen = 0
    for (let t = 0; t < FRAME_SETTLES; t += FRAME) {
      yard.step(FRAME)
      const jump = stampsOf(yard, 'apron')[0].y - rest.apron
      expect(jump).toBeGreaterThanOrEqual(0)
      most = Math.max(most, jump)
      if (jump >= 6) seen += FRAME
    }
    expect(most).toBeGreaterThanOrEqual(FRAME_JUMPS - 1)
    // Out by six stage units or more for a fifth of a second: a jump, not a flicker.
    expect(seen).toBeGreaterThanOrEqual(0.2)
    yard.step(FRAME * 2)
    expect(stampsOf(yard, 'apron')[0].y).toBe(rest.apron)
    yard.press({ x: 74, y: 62 })
    yard.step(0.12)
    expect(stampsOf(yard, 'pelmet')[0].y).toBeLessThan(rest.pelmet - 10)
    expect(stampsOf(yard, 'apron')[0].y).toBe(rest.apron)
  })

  it('drops the apple from where the finger was on the crown, in front of the scarecrow and everything that stands before the tree', () => {
    const yard = new Yard()
    yard.press({ x: 240, y: 130 })
    expect(yard.takeCues().map((cue) => cue.name)).toEqual(['apple'])
    const items = compose(yard, null)
    const apple = items.findIndex((item) => item.kind === 'stamp' && item.card === 'apple')
    expect(items[apple]).toMatchObject({ x: 240, y: 130, alpha: 1 })
    // Only the gilt frame and the curtains are drawn after it.
    const after = items.slice(apple + 1).map((item) => (item.kind === 'stamp' ? item.card : item.kind))
    expect(after).toEqual(['curtain', 'curtain', 'pelmet', 'apron'])
    yard.step(0.4)
    expect(stampsOf(yard, 'apple')[0].y).toBeGreaterThan(160)
  })

  it('shakes two feathers loose over a goose tapped on her round, as the ruffle sounds', () => {
    const save = freshYard()
    save.goose = { leg: LEG.right, along: 0.3 }
    const yard = new Yard(save)
    expect(stampsOf(yard, 'feather')).toHaveLength(0)
    const goose = gooseAt(LEG.right, 0.3)
    yard.press({ x: goose.x, y: goose.y - 100 })
    expect(yard.takeCues().map((cue) => cue.name)).toContain('ruffle')
    const feathers = stampsOf(yard, 'feather')
    expect(feathers).toHaveLength(2)
    for (const feather of feathers) { expect(Math.abs(feather.x - goose.x)).toBeLessThan(80); expect(feather.y).toBeLessThan(goose.y - 60) }
    yard.step(0.8)
    expect(stampsOf(yard, 'feather')).toHaveLength(0)
  })

  it('shakes the half-door at a knock on the barn, asleep or awake, and a farmer who is up jumps', () => {
    const wall = { x: 900, y: 300 }, door = { x: 1000, y: 330 }
    const asleep = new Yard()
    const still = stampsOf(asleep, 'halfDoor')[0]
    asleep.press(wall)
    expect(stampsOf(asleep, 'halfDoor')[0].x).not.toBe(still.x)
    expect(stampsOf(asleep, 'farmerPeek')).toHaveLength(1)
    const awake = new Yard()
    awake.press(door)
    awake.step(0.3)
    const up = stampsOf(awake, 'farmerPeek')[0].y
    awake.press(wall)
    expect(awake.takeCues().map((cue) => cue.name)).toEqual(['wake', 'knock'])
    expect(stampsOf(awake, 'halfDoor')[0].x).not.toBe(still.x)
    expect(stampsOf(awake, 'farmerPeek')[0].y).toBeLessThan(up - 4)
    awake.step(0.5)
    expect(stampsOf(awake, 'halfDoor')[0].x).toBe(still.x)
  })

  it('sends a small bird up out of the far hills from where they were tapped', () => {
    const yard = new Yard()
    yard.press({ x: 350, y: 340 })
    expect(yard.takeCues().map((cue) => cue.name)).toEqual(['hill'])
    const bird = stampsOf(yard, 'sparrow')[0]
    expect(bird).toMatchObject({ x: 350, y: 340 })
    yard.step(0.5)
    expect(stampsOf(yard, 'sparrow')[0].y).toBeLessThan(300)
    yard.step(0.7)
    expect(stampsOf(yard, 'sparrow')).toHaveLength(0)
  })

  it('lifts the ears of a raccoon that is tapped in the middle of a hop between two grooves', () => {
    const save = freshYard()
    save.goose = { leg: LEG.lookLeft, along: 0 }
    save.raccoon = { x: 600, row: 3 }
    const yard = new Yard(save)
    yard.press({ x: 600, y: ROWS[2] - 34 })
    while (yard.raccoon.mode !== 'hop') yard.step(FRAME)
    yard.step(FRAME * 3)
    yard.press({ x: 900, y: ROWS[2] - 34 })
    yard.step(FRAME * 4)
    expect(yard.raccoon.mode).toBe('hop')
    const perked = raccoonSeen(yard)
    yard.stir.perk = 99
    expect(perked.y).toBeLessThan(raccoonSeen(yard).y)
  })
})
