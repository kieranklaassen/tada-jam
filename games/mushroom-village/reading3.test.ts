import { describe, expect, it } from 'vitest'
import { PARP_S } from './answers'
import { FULL, TAP_S, TIERS } from './config'
import { GNOMES, HOME_REACH, SEATS, atLog, footFor, kindAt, mossBottom, mossTop, groundAt, onHat, pebbleMay, stepOff, type GnomeId } from './ground'
import { hand, lift } from './finger'
import { ForgivingTouch, LIFT_GRACE_MS, type Point } from './input'
import { freshSave } from './save'
import { snailPebbles } from './scenes'
import { FINGER, SMALL_HOUSE, bodyBox, boxesMeet, capHit, doorBox, doorHit, doorOf, doorstepped, inBox, onStage, stepAt, type Box } from './shapes'
import { fit, toStage } from './stage'
import { BELL, FRAME, LOOSEN_S, PUFF, RED, carry, chestOf, fromLog, liftPath, middle, pullUp, run, tap, village, type At } from './testkit'
import { DRIFT, LOOSE_S, OUT, OUT_AT_ONCE, footAt } from './touch'
import { BUCKET_WATER, GladeView } from './view'
import type { Shown, Village } from './village'
import { World } from './world'

// What the third fresh reading of this folder found: thirteen slight points
// and two lookalikes, one named section for each point, each failing on the
// game as that reader read it. The two lookalikes (the shortest bell's rope
// and the log's grain) are held in marks.test.ts, and the phone on its side
// is also in overlap.test.ts, which no longer leaves it out.

const NOBODY = { tall: null, sleepy: null, sneezy: null, baker: null } as const
const KINDS = ['red', 'bell', 'puff'] as const
const HOUSE = { red: RED, bell: BELL, puff: PUFF } as const
const SIZES = Array.from({ length: FULL }, (_, i) => i + 1)
const pebbleCount = (v: Village): number => v.toSave().paths.reduce((sum, path) => sum + path.length, 0)
const sounded = (v: Village): boolean => v.takeNotes().length > 0
const far = (a: At, b: At): number => Math.hypot(a.x - b.x, a.y - b.y)
/** Steps the village frame by frame and hands each frame to `each`. */
function frames(v: Village, seconds: number, each: () => void): void {
  for (let t = 0; t < seconds - 1e-9; t += FRAME) { v.step(FRAME); each() }
}
/** A house of a kind and a size with the sneezy gnome in it, and the middle of its painted door. */
function house(kind: (typeof KINDS)[number], size: number) {
  const kept = { ...HOUSE[kind], size, door: true }
  const v = village({ mushrooms: [kept], homes: { ...NOBODY, sneezy: kept.id } })
  const m = v.show().mushrooms[0]
  return { v, m, painted: onStage(m, doorOf(kind, size)) }
}

describe('1. the small-house rule holds for the three smallest bells and puffballs, and for no red house', () => {
  it('calls a house too small for both only where its door is painted on its cap and it is one of the three smallest', () => {
    expect(SMALL_HOUSE).toBe(3)
    for (const size of SIZES) {
      expect(doorstepped('red', size), `red ${size}`).toBe(false)
      expect(doorstepped('bell', size), `bell ${size}`).toBe(size <= 3)
      expect(doorstepped('puff', size), `puff ${size}`).toBe(size <= 3)
    }
  })

  it('gives every other house a door and a cap that are a finger high each, the door over its whole painted height', () => {
    for (const kind of KINDS) for (const size of SIZES) {
      if (doorstepped(kind, size)) continue
      const door = doorHit(kind, size), painted = doorOf(kind, size), cap = capHit(kind, size)
      expect(door.y0, `${kind} ${size}`).toBeLessThanOrEqual(painted.y0)
      expect(door.y1, `${kind} ${size}`).toBeGreaterThanOrEqual(painted.y1)
      expect(door.y1 - door.y0, `${kind} ${size}: the door high`).toBeGreaterThanOrEqual(FINGER)
      expect(cap.y1 - cap.y0, `${kind} ${size}: the cap high`).toBeGreaterThanOrEqual(FINGER)
    }
  })

  it.each(SIZES)('takes the door off a red house of size %i by a drag straight up, and never stretches or removes the house', (size) => {
    const { v, painted } = house('red', size)
    const on = middle(painted)
    v.press(on)
    for (let up = 6; up <= OUT_AT_ONCE + 30; up += 6) v.drag({ x: on.x, y: on.y - up })
    // The door is in the hand, and the house has not been pulled at all.
    expect(v.show().door).not.toBeNull()
    expect(v.show().mushrooms[0].pull).toBe(0)
    // Held there for as long as it takes a cap to come loose, and longer: the house stands.
    run(v, LOOSEN_S + 1)
    expect(v.count).toBe(1)
    expect(v.toSave().homes.sneezy).toBe(1)
    v.lift()
    run(v, 1)
    expect(v.count).toBe(1)
  })

  it.each((['bell', 'puff'] as const).flatMap((kind) => [1, 2, 3].map((size) => [kind, size] as const)))('keeps the door on a small %s of size %i under a finger that goes up from its doorstep: that finger is on its way to a pull', (kind, size) => {
    const { v, m } = house(kind, size)
    // Just under the foot, where no waiting gnome's hat is in front of the doorstep.
    const step = { x: middle(doorBox(m)).x, y: m.y + 14 }
    v.press(step)
    // Past where a door is carried off, and short of where a pull begins.
    for (let up = 4; up <= DRIFT - 2; up += 4) {
      v.drag({ x: step.x, y: step.y - up })
      expect(v.show().door, `${up} up`).toBeNull()
    }
    v.drag({ x: step.x, y: step.y - OUT - 8 })
    expect(v.show().door).toBeNull()
    expect(v.show().mushrooms[0].pull).toBeGreaterThan(0)
    v.takeAway()
    expect(v.toSave().mushrooms[0].door).toBe(true)
  })

  it('never removes a house of any kind that has a real door by a drag straight up off that door', () => {
    for (const kind of KINDS) for (const size of SIZES) {
      if (doorstepped(kind, size)) continue
      const { v, painted } = house(kind, size)
      const on = middle(painted)
      v.press(on)
      for (let up = 6; up <= 120; up += 6) v.drag({ x: on.x, y: on.y - up })
      run(v, LOOSEN_S + 0.5)
      expect(v.show().door, `${kind} ${size}`).not.toBeNull()
      v.lift()
      run(v, 0.5)
      expect(v.count, `${kind} ${size}`).toBe(1)
    }
  })
})

describe('2. on a bell of size 5 and up the painted door is the door over its whole painted height', () => {
  it.each(SIZES.filter((size) => size > SMALL_HOUSE))('finds the door at every point of the painted door of a bell of size %i, its top edge included', (size) => {
    const w = new World({ ...freshSave(6), mushrooms: [{ ...BELL, size, door: true }], shown: ['cart', 'pebbles'] }, 1)
    const painted = onStage(w.mushrooms[0], doorOf('bell', size))
    for (let x = painted.x0; x <= painted.x1; x += 2) for (let y = painted.y0; y <= painted.y1; y += 2) expect(w.hit(x, y).what, `${Math.round(x)}, ${Math.round(y)}`).toBe('door')
    // And just above the door it is the bell again.
    expect(w.hit((painted.x0 + painted.x1) / 2, painted.y0 - 8).what).toBe('mushroom')
  })

  it('brings the gnome out at a tap on the top of the painted door of a bell of size 5, where the cap used to ring', () => {
    const { v, painted } = house('bell', 5)
    tap(v, { x: (painted.x0 + painted.x1) / 2, y: painted.y0 + 3 })
    expect(v.sceneRunning).toBe(true)
    expect(v.show().gnomes.sneezy.where).toBe('out')
  })

  it('does the same on a puffball from size 4', () => {
    for (const size of SIZES.filter((s) => s > SMALL_HOUSE)) {
      const { v, painted } = house('puff', size)
      tap(v, { x: (painted.x0 + painted.x1) / 2, y: painted.y0 + 3 })
      expect(v.sceneRunning, `puff ${size}`).toBe(true)
    }
  })
})

describe('3. a finger that drifts a little while it holds is still holding, before the first step too', () => {
  const cap = { x: RED.x, y: RED.y - 60 }

  it.each([16, 30, DRIFT - 2])('swells a mushroom that stood under a finger that drifted %i units up before its first step', (drift) => {
    const v = village({ mushrooms: [{ ...RED, size: 3 }] })
    v.press(cap)
    run(v, 0.1)
    v.drag({ x: cap.x + 3, y: cap.y - drift })
    expect(v.show().mushrooms[0].pull).toBe(0)
    run(v, 1.2)
    expect(v.toSave().mushrooms[0].size).toBeGreaterThan(4)
    expect(v.show().mushrooms[0].pull).toBe(0)
    v.lift()
    expect(v.count).toBe(1)
  })

  it('begins the pull past a finger\'s width, from nothing and with no jump, and has caught the finger up before the cap can come loose', () => {
    const v = village({ mushrooms: [{ ...RED, size: 6 }] })
    v.press(cap)
    let before = 0
    for (let up = 2; up <= OUT_AT_ONCE; up += 2) {
      v.drag({ x: cap.x, y: cap.y - up })
      const pull = v.show().mushrooms[0].pull
      if (up <= DRIFT) expect(pull, `at ${up}`).toBe(0)
      expect(pull - before, `at ${up}`).toBeLessThanOrEqual(6.01)
      expect(pull).toBeGreaterThanOrEqual(before)
      if (up >= DRIFT * 1.5) expect(pull, `at ${up}`).toBe(up)
      before = pull
    }
    expect(DRIFT * 1.5).toBeLessThan(OUT + DRIFT / 2)
  })
})

describe('4. a path that comes to a foot from above or level ends at the doorstep', () => {
  /** Pebbles from the log up the gap at 520 and along a row to a place right of the stream. */
  const rowTo = (to: At): At[] => fromLog(to)
  const lies = (v: Village, at: At, reach: number): boolean => v.toSave().paths.some((path) => path.some((p) => far(p, at) <= reach))
  const underFoot = (v: Village): number => {
    const w = new World(v.toSave(), 1)
    return v.toSave().paths.reduce((sum, path) => sum + path.filter((p) => footAt(w, p) !== undefined).length, 0)
  }

  it.each([
    ['from above', { x: 1000, y: 340 }, { x: 1008, y: 506 }],
    ['from above and to one side', { x: 920, y: 400 }, { x: 1002, y: 504 }],
    ['level, from the left', { x: 900, y: 500 }, { x: 1000, y: 508 }],
  ] as const)('lays the last pebbles round to the doorstep of a house with a door, %s: the step is drawn and somebody comes', (_name, end, into) => {
    const way = rowTo(end)
    // The sleepy one lives elsewhere, so nobody comes to this house over the moss.
    const v = village({ mushrooms: [{ ...RED, door: true }, { ...PUFF, door: true }], paths: [way], homes: { ...NOBODY, sleepy: PUFF.id } })
    const red = () => v.show().mushrooms.find((m) => m.id === RED.id)!
    expect(red().stone).toBeNull()
    // The path goes on from its last pebble, into the foot.
    const last = way[way.length - 1]
    carry(v, last, into, 10)
    expect(lies(v, stepAt(RED), 34)).toBe(true)
    expect(underFoot(v)).toBe(0)
    expect(red().stone).toBe('step')
    // The pebble that reached the door ended the stroke and started the move.
    expect(Object.values(v.toSave().homes)).toContain(RED.id)
    expect(v.sceneRunning).toBe(true)
    expect(v.drawing).toBe(false)
    v.lift()
  })

  it('does the same with no door yet: the pile is drawn against the stem and the mushroom hiccups', () => {
    const way = rowTo({ x: 1000, y: 340 })
    const v = village({ mushrooms: [RED], paths: [way] })
    v.press(way[way.length - 1])
    for (let i = 1; i <= 12; i++) v.drag({ x: 1000, y: 340 + i * 10 })
    expect(v.show().mushrooms[0].stone).toBeNull()
    v.takeNotes()
    for (let i = 1; i <= 5; i++) v.drag({ x: 1000 + i * 1.6, y: 460 + i * 9.2 })
    expect(v.show().mushrooms[0].stone).toBe('pile')
    expect(sounded(v)).toBe(true)
    expect(underFoot(v)).toBe(0)
    v.lift()
  })

  it('goes on round the foot and out on the other side when the finger does, as one path', () => {
    const way = rowTo({ x: 1000, y: 340 })
    const v = village({ mushrooms: [RED], paths: [way] })
    carry(v, way[way.length - 1], { x: 1010, y: 600 }, 26)
    v.lift()
    expect(v.toSave().paths.length).toBe(1)
    expect(lies(v, { x: 1000, y: 600 }, 12)).toBe(true)
    expect(underFoot(v)).toBe(0)
    // Every pebble is a neighbour of the one before it: the path is whole.
    const path = v.toSave().paths[0]
    for (let i = 1; i < path.length; i++) expect(far(path[i], path[i - 1]), `pebble ${i}`).toBeLessThanOrEqual(29)
  })
})

describe('5. rolling a path away is as deliberate as removing a house', () => {
  const ROW: At[] = Array.from({ length: 10 }, (_, i) => ({ x: 820 + i * 20, y: 600 }))
  const FAR_END = ROW[ROW.length - 1]
  const GRIP = ROW[3]
  const rolling = (v: Village): boolean => v.show().props.some((prop) => prop.what === 'rolling')

  it.each([1, 3, 12])('leaves the path where it lies under an upward drag of any length made in %i moves with no rest on the pebble', (moves) => {
    for (const up of [OUT + 4, OUT + 40, 140]) {
      const v = village({ paths: [ROW] })
      carry(v, GRIP, { x: GRIP.x, y: GRIP.y - up }, moves)
      v.lift()
      for (const p of ROW) expect(v.toSave().paths.some((path) => path.some((q) => q.x === p.x && q.y === p.y)), `${up} up`).toBe(true)
      expect(rolling(v)).toBe(false)
      // The finger was drawing: pebbles lie where it went.
      expect(pebbleCount(v)).toBeGreaterThan(ROW.length)
    }
  })

  it.each([0, 1, 2])('does not roll the snail\'s three pebbles away under a drag from pebble %i up to a house', (index) => {
    const three = snailPebbles(900)
    const v = village({ mushrooms: [{ id: 1, x: 520, y: 420, size: 6, door: true }], paths: [three], homes: { ...NOBODY, baker: 1 } })
    const from = three[index]
    carry(v, from, { x: 520, y: 440 }, 9)
    v.lift()
    for (const p of three) expect(v.toSave().paths.some((path) => path.some((q) => q.x === p.x && q.y === p.y))).toBe(true)
    expect(rolling(v)).toBe(false)
  })

  it('lifts the path only by a finger that has rested on a pebble longer than a tap, and shows and sounds the loosening before anything goes', () => {
    const v = village({ paths: [ROW] })
    v.press(GRIP)
    run(v, TAP_S + 0.05)
    v.takeNotes()
    // Below the height it comes loose at, the far end of the path still lies in the moss.
    v.drag({ x: GRIP.x, y: GRIP.y - OUT + 8 })
    const farEnd = () => v.show().pebbles.find((p) => p.x === FAR_END.x)!
    const tight = { ...farEnd() }
    v.takeNotes()
    // Past it, every pebble of the path leaves the moss and turns, with a rattle: the far end jumps up and askew.
    v.drag({ x: GRIP.x, y: GRIP.y - OUT - 10 })
    expect(sounded(v)).toBe(true)
    expect(farEnd().up - tight.up).toBeGreaterThan(8)
    expect(Math.abs(farEnd().turn) - Math.abs(tight.turn)).toBeGreaterThan(0.3)
    // Let go at once, in the first moment of it, the path drops back and stays.
    run(v, LOOSE_S - 0.05)
    v.lift()
    expect(v.toSave().paths).toEqual([ROW])
    expect(rolling(v)).toBe(false)
  })

  it('rolls the path away when it is let go after it has been loose for a moment, and sits it again when it is brought back down', () => {
    const gone = village({ paths: [ROW] })
    liftPath(gone, GRIP, OUT + 10)
    gone.lift()
    expect(gone.toSave().paths).toEqual([])
    expect(rolling(gone)).toBe(true)
    const back = village({ paths: [ROW] })
    liftPath(back, GRIP, OUT + 10)
    back.takeNotes()
    const loose = back.show().pebbles.find((p) => p.x === FAR_END.x)!.up
    back.drag({ x: GRIP.x, y: GRIP.y - 20 })
    expect(sounded(back)).toBe(true)
    expect(loose - back.show().pebbles.find((p) => p.x === FAR_END.x)!.up).toBeGreaterThan(8)
    run(back, 0.5)
    back.lift()
    expect(back.toSave().paths).toEqual([ROW])
  })

  it('takes a lift that runs on, far up or off to a side, for a drag: the path drops back and the finger draws', () => {
    for (const to of [{ x: GRIP.x, y: GRIP.y - OUT_AT_ONCE - 30 }, { x: GRIP.x + OUT + 30, y: GRIP.y - OUT - 20 }]) {
      const v = village({ paths: [ROW] })
      liftPath(v, GRIP, OUT + 10)
      for (let i = 1; i <= 8; i++) v.drag({ x: GRIP.x + ((to.x - GRIP.x) * i) / 8, y: GRIP.y - OUT - 10 + ((to.y - (GRIP.y - OUT - 10)) * i) / 8 })
      expect(v.drawing).toBe(true)
      v.lift()
      for (const p of ROW) expect(v.toSave().paths.some((path) => path.some((q) => q.x === p.x && q.y === p.y))).toBe(true)
      expect(rolling(v)).toBe(false)
    }
  })

  it('rolls a path of one pebble away by the same rule, and draws it further under a finger that moves off it', () => {
    const one = [{ x: 900, y: 600 }]
    const gone = village({ paths: [one] })
    liftPath(gone, one[0], OUT + 10)
    gone.lift()
    expect(gone.toSave().paths).toEqual([])
    expect(rolling(gone)).toBe(true)
    // With no rest on it, upward or sideways, the finger draws from it.
    for (const to of [{ x: 900, y: 500 }, { x: 1000, y: 600 }]) {
      const drawn = village({ paths: [one] })
      carry(drawn, one[0], to, 6)
      drawn.lift()
      expect(drawn.toSave().paths.length).toBe(1)
      expect(pebbleCount(drawn)).toBeGreaterThan(3)
    }
  })

  it('keeps the last pebble of a longer path as the place the path goes on from, rested on or not', () => {
    const v = village({ paths: [ROW] })
    const last = ROW[ROW.length - 1]
    v.press(last)
    run(v, TAP_S + 0.05)
    for (let up = 6; up <= OUT + 30; up += 6) v.drag({ x: last.x, y: last.y - up })
    expect(v.drawing).toBe(true)
    v.lift()
    expect(v.toSave().paths.length).toBe(1)
    expect(pebbleCount(v)).toBeGreaterThan(ROW.length + 2)
  })
})

describe('6. a gnome walking back takes pebbles where they lead his way, and otherwise wades or hops, heard at every step', () => {
  /** A red house right of the stream with one gnome in it, pulled up: he stands at where his door was and walks back. */
  function turnedOut(who: GnomeId, paths: At[][] = []) {
    const v = village({ mushrooms: [{ ...RED, door: true }], paths, homes: { ...NOBODY, [who]: RED.id } })
    pullUp(v, { x: RED.x, y: RED.y - 80 }, OUT + 30)
    v.lift()
    expect(v.count).toBe(0)
    expect(v.show().gnomes[who].where).toBe('out')
    v.takeNotes()
    return v
  }
  /** Walks him home frame by frame: how often a step sounded, the most rings on the water, how high he left the straight line, and where he went. */
  function walkHome(v: Village, who: GnomeId) {
    const from = stepAt(RED), to = stepOff(who)
    let steps = 0, rings = 0, lifted = 0
    const went: At[] = []
    frames(v, 30, () => {
      const g = v.show().gnomes[who]
      if (g.where !== 'out' || g.scale > 0.4) return
      if (v.takeNotes().length > 0) steps += 1
      rings = Math.max(rings, v.show().rings.length)
      const line = from.y + ((to.y - from.y) * (g.x - from.x)) / (to.x - from.x)
      lifted = Math.max(lifted, line - g.y)
      went.push({ x: g.x, y: g.y })
    })
    expect(v.show().gnomes[who].where).toBe('log')
    return { steps, rings, lifted, went }
  }

  it('lets the tall one wade the stream on his way back, a sound at every stride and a ring at every step in the water', () => {
    const { steps, rings } = walkHome(turnedOut('tall'), 'tall')
    // About 850 units in strides of 46.
    expect(steps).toBeGreaterThanOrEqual(14)
    expect(rings).toBeGreaterThan(0)
  })

  it('lets the baker hop the stream on his way back, with his own steps on the moss', () => {
    const { steps, lifted } = walkHome(turnedOut('baker'), 'baker')
    expect(steps).toBeGreaterThanOrEqual(12)
    expect(lifted).toBeGreaterThan(25)
  })

  it('takes the pebbles that lead from his feet towards the log, stepping stones and all, and only then the moss', () => {
    const way = fromLog(stepAt(RED))
    const { went, steps } = walkHome(turnedOut('tall', [way]), 'tall')
    // He passes over the pebbles of the path, the ones in the water included; at a corner he may step across it.
    const off = way.map((p) => Math.min(...went.map((at) => far(at, p))))
    way.forEach((p, i) => expect(off[i], `the pebble at ${p.x}, ${p.y}`).toBeLessThan(16))
    expect(off.filter((d) => d >= 6).length).toBeLessThanOrEqual(1)
    for (const [i, p] of way.entries()) if (groundAt(p.x, p.y).what === 'water') expect(off[i]).toBeLessThan(6)
    // The stones sound, and so does the moss he crosses from the path's end to his place.
    expect(steps).toBeGreaterThanOrEqual(5)
  })

  it('leaves pebbles that do not lead his way where they lie, and goes his own way', () => {
    // A path from his feet straight down the bank: its far end is hardly nearer the log than he is.
    const from = stepAt(RED), x = Math.round(from.x / 20) * 20, y = Math.round(from.y / 20) * 20
    const aside = [1, 2, 3, 4].map((i) => ({ x, y: y + 20 * i }))
    const v = turnedOut('sneezy', [aside])
    expect(far(aside[0], from)).toBeLessThan(44)
    expect(pebbleCount(v)).toBe(aside.length)
    const { went } = walkHome(v, 'sneezy')
    // He never goes down the pebbles: he is on his own straight way from the first stride.
    expect(Math.max(...went.filter((at) => at.x > x - 60).map((at) => at.y))).toBeLessThan(y + 40)
  })
})

describe('7. a hat\'s touch shape covers its paint, and the brim belongs to the hat', () => {
  const hit = (x: number, y: number) => new World({ ...freshSave(6), shown: ['cart', 'pebbles'] }, 1).hit(x, y)
  const sleepy = SEATS.sleepy, baker = SEATS.baker

  it('finds the sleepy one\'s hat on the end of his nightcap that has fallen over, and on its tassel', () => {
    // The end hangs out to about 90 units right of his seat's middle; the tassel is a dab about 28 across at 92, 562.
    for (const [dx, y] of [[60, 530], [80, 540], [92, 552], [92, 562], [104, 566], [84, 574]]) expect(hit(sleepy.x + dx, y), `${dx}, ${y}`).toEqual({ what: 'gnome', who: 'sleepy', hat: true })
  })

  it('finds the baker\'s hat over its whole width, out to its two side puffs', () => {
    for (const dx of [-64, -50, 0, 50, 64]) for (const y of [490, 520, 550]) expect(hit(baker.x + dx, y), `${dx}, ${y}`).toEqual({ what: 'gnome', who: 'baker', hat: true })
  })

  it.each(GNOMES)('gives the brim of the %s gnome\'s hat to the hat, down to its lower edge, and what is under it to him', (who) => {
    const seat = SEATS[who]
    // The hat sits 192 units above his seat and its brim is painted to about 176.
    for (const up of [200, 190, 184, 178]) expect(hit(seat.x, seat.y - up), `${up} up`).toEqual({ what: 'gnome', who, hat: true })
    for (const up of [168, 150, 100]) expect(hit(seat.x, seat.y - up), `${up} up`).toEqual({ what: 'gnome', who, hat: false })
  })

  it('lays no pebble and grows no mushroom under a finger that lands on the tassel or beside the baker\'s hat and goes off', () => {
    for (const from of [{ x: sleepy.x + 92, y: 560 }, { x: baker.x + 62, y: 500 }, { x: baker.x - 62, y: 500 }]) {
      const v = village()
      carry(v, from, { x: from.x + 30, y: from.y - 160 }, 10)
      v.lift()
      run(v, 0.5)
      expect(pebbleCount(v), `${from.x}, ${from.y}`).toBe(0)
      expect(v.count).toBe(0)
    }
  })

  it('keeps a pointed hat\'s shape to the hat: a finger wide at its tip, and the moss beside the tip is moss', () => {
    const tall = SEATS.tall
    expect(onHat('tall', tall.x + 18, tall.top + 4)).toBe(true)
    let across = 0
    for (let x = 0; x <= 300; x += 1) if (onHat('tall', x, tall.top + 4)) across += 1
    expect(across).toBeGreaterThanOrEqual(FINGER)
    expect(across).toBeLessThan(70)
    expect(hit(tall.x - 58, 360).what).toBe('moss')
    // Every hat is at least a finger across at every height.
    for (const who of GNOMES) for (let y = SEATS[who].top; y < SEATS[who].y - 176; y += 6) {
      let wide = 0
      for (let x = SEATS[who].x - 140; x <= SEATS[who].x + 140; x += 1) if (onHat(who, x, y)) wide += 1
      expect(wide, `the ${who} gnome's hat at ${y}`).toBeGreaterThanOrEqual(FINGER)
    }
  })
})

describe('8. a cap let go in the first moment of its lean sits tight again', () => {
  const cap = { x: RED.x, y: RED.y - 80 }

  it('snaps back when the finger lifts before the cap has leaned for a moment, and comes out when it lifts after', () => {
    const early = village({ mushrooms: [RED] })
    early.press(cap)
    early.drag({ x: cap.x, y: cap.y - OUT - 30 })
    // Longer than a tap: the cap comes loose and leans, now.
    run(early, TAP_S + 0.02)
    expect(Math.abs(early.show().mushrooms[0].swing)).toBeGreaterThan(0)
    early.lift()
    expect(early.count).toBe(1)
    expect(early.show().mushrooms[0].pull).toBe(0)
    const late = village({ mushrooms: [RED] })
    late.press(cap)
    late.drag({ x: cap.x, y: cap.y - OUT - 30 })
    run(late, TAP_S + LOOSE_S + 0.03)
    late.lift()
    expect(late.count).toBe(0)
  })
})

describe('9. the wait after a stroke ends beside a gnome is seen', () => {
  function finger(v: Village) {
    const touch = new ForgivingTouch()
    const same = (at: Point): Point => at
    let t = 0
    return {
      down: (at: At) => { t += 16; hand(v, touch.down(1, at, t), same) },
      move: (at: At) => { t += 16; hand(v, touch.move(1, at), same) },
      up: (at: At) => { t += 16; hand(v, lift(touch, v.drawing, 1, at, t), same) },
      wait: (ms: number) => { t += ms; hand(v, touch.advance(t), same); run(v, ms / 1000) },
    }
  }
  const draw = (f: ReturnType<typeof finger>, from: At, to: At, steps = 12): void => {
    for (let i = 1; i <= steps; i++) f.move({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps })
  }

  it('has the gnome the path was drawn from look at the finger\'s last place and shift his weight, with a sound, while the stroke waits', () => {
    const v = village()
    const f = finger(v), chest = chestOf('sneezy'), end = { x: 560, y: 470 }
    f.down(chest)
    draw(f, chest, end)
    v.takeNotes(); v.takeFired()
    f.up(end)
    // The stroke waits for the finger, and that is seen and heard at the lift.
    expect(v.drawing).toBe(true)
    expect(v.takeNotes().length).toBeGreaterThan(0)
    expect(v.takeFired().some((beat) => beat.what.includes('gnome') && beat.moved)).toBe(true)
    expect(v.show().gaze).toEqual(end)
    f.wait(LIFT_GRACE_MS / 2)
    // He leans towards where the finger was: to his right.
    expect(v.show().gnomes.sneezy.lean).toBeGreaterThan(0.03)
    expect(v.show().gaze).toEqual(end)
    expect(v.sceneRunning).toBe(false)
    f.wait(LIFT_GRACE_MS)
    // Then he tests the first pebble with his toe and sets off.
    expect(v.sceneRunning).toBe(true)
  })

  it('leans him towards the side the finger left on', () => {
    const lean = (end: At): number => {
      const v = village()
      const f = finger(v), chest = chestOf('sneezy')
      f.down(chest)
      draw(f, chest, end)
      f.up(end)
      f.wait(LIFT_GRACE_MS * 0.8)
      return v.show().gnomes.sneezy.lean
    }
    const seat = SEATS.sneezy
    expect(lean({ x: seat.x + 150, y: 470 }) - lean({ x: seat.x - 150, y: 470 })).toBeGreaterThan(0.04)
  })

  it('has the one whose door a path has just reached stir behind his window while the stroke waits, before his walk', () => {
    const way = fromLog({ x: 900, y: 520 })
    const v = village({ mushrooms: [{ ...RED, door: true }], paths: [way], homes: { ...NOBODY, sleepy: RED.id } })
    const f = finger(v), last = way[way.length - 1], end = { x: 1000, y: 548 }
    f.down(last)
    draw(f, last, end, 8)
    expect(v.drawing).toBe(true)
    v.takeNotes()
    f.up(end)
    expect(v.takeNotes().length).toBeGreaterThan(0)
    v.step(FRAME)
    expect(Math.abs(v.show().mushrooms[0].jerk)).toBeGreaterThan(0)
    expect(v.sceneRunning).toBe(false)
    f.wait(LIFT_GRACE_MS + 50)
    expect(v.sceneRunning).toBe(true)
    expect(v.show().gnomes.sleepy.where).toBe('out')
  })

  it('says nothing at the lift of a stroke that no gnome has to do with, and nothing at the lift of any other drag', () => {
    const v = village({ mushrooms: [RED] })
    const f = finger(v), from = { x: 820, y: 600 }, to = { x: 940, y: 600 }
    f.down(from)
    draw(f, from, to)
    v.takeNotes()
    f.up(to)
    expect(v.takeNotes().length).toBe(0)
  })
})

// ---------------------------------------------------------------- what is painted

type Stamp = { source: unknown; at: readonly number[] }
type Blob = { paint: string; x: number; y: number }
/** A canvas whose context accepts any call and does nothing. */
function standIn(width: number, height: number): HTMLCanvasElement {
  const context: Record<string | symbol, unknown> = {}
  const proxy = new Proxy(context, {
    get: (target, key) => (key in target ? target[key] : key === 'createPattern' ? () => null : () => undefined),
    set: (target, key, value) => { target[key] = value; return true },
  })
  return { width, height, getContext: () => proxy } as unknown as HTMLCanvasElement
}
/** A view that draws into a context which writes down every sprite it stamps and where, and every round dab it fills, with its paint and its place on the canvas. */
function watching() {
  let stamps: Stamp[] = [], blobs: Blob[] = [], pending: { x: number; y: number }[] = []
  let at: readonly number[] = [1, 0, 0, 1, 0, 0]
  const place = (x: number, y: number) => ({ x: at[0] * x + at[2] * y + at[4], y: at[1] * x + at[3] * y + at[5] })
  const context: Record<string | symbol, unknown> = {
    setTransform: (...m: number[]) => { at = m },
    beginPath: () => { pending = [] },
    arc: (x: number, y: number) => { pending.push(place(x, y)) },
    ellipse: (x: number, y: number) => { pending.push(place(x, y)) },
    fill: () => { for (const p of pending) blobs.push({ paint: String(context.fillStyle), ...p }) },
    drawImage: (source: unknown) => { stamps.push({ source, at }) },
  }
  const proxy = new Proxy(context, {
    get: (target, key) => (key in target ? target[key] : key === 'createPattern' ? () => null : () => undefined),
    set: (target, key, value) => { target[key] = value; return true },
  })
  const made = new GladeView({ width: 2360, height: 1640, getContext: () => proxy } as unknown as HTMLCanvasElement, standIn)
  made.resize(1180, 820, 2)
  made.setTier(TIERS[0])
  return (shown: Shown): { stamps: Stamp[]; blobs: Blob[]; draws: number } => {
    stamps = []; blobs = []
    const counts = made.draw(shown, null)
    return { stamps, blobs, draws: counts.stamps + counts.strokes }
  }
}

describe('10. a puffball pulled goes flat, with one long parp', () => {
  const cap = { x: PUFF.x, y: PUFF.y - 60 }
  /** The one stamp that differs between two frames of the same moment: the mushroom's own. */
  const changed = (a: Stamp[], b: Stamp[]): [Stamp, Stamp] => {
    const pairs = a.map((stamp, i) => [stamp, b[i]] as [Stamp, Stamp]).filter(([x, y]) => x.at.some((n, k) => Math.abs(n - y.at[k]) > 1e-6))
    expect(pairs.length).toBe(1)
    return pairs[0]
  }

  it('is painted wider and lower the farther it is pulled, and hangs from the finger off the moss', () => {
    const v = village({ mushrooms: [PUFF] })
    const frame = watching()
    const rest = frame(v.show()).stamps
    v.press(cap)
    v.drag({ x: cap.x, y: cap.y - 100 })
    const [before, after] = changed(rest, frame(v.show()).stamps)
    // Wider, and under two thirds as high.
    expect(Math.abs(after.at[0])).toBeGreaterThan(Math.abs(before.at[0]) * 1.2)
    expect(after.at[3]).toBeLessThan(before.at[3] * 0.67)
    // Its foot has left the moss: it is drawn higher up the canvas.
    expect(before.at[5] - after.at[5]).toBeGreaterThan(100)
  })

  it('leaves a red mushroom and a bell to stretch like gum, taller and thinner, with the foot in the moss', () => {
    for (const kept of [RED, BELL]) {
      const v = village({ mushrooms: [kept] })
      const frame = watching()
      const rest = frame(v.show()).stamps
      const on = { x: kept.x, y: kept.y - 60 }
      v.press(on)
      v.drag({ x: on.x, y: on.y - 100 })
      const [before, after] = changed(rest, frame(v.show()).stamps)
      expect(after.at[3]).toBeGreaterThan(before.at[3] * 1.3)
      expect(Math.abs(after.at[0])).toBeLessThan(Math.abs(before.at[0]))
      expect(after.at[5]).toBeCloseTo(before.at[5], 6)
    }
  })

  it('sounds once for the whole pull: one long note that falls, and nothing more per notch, however the finger wavers', () => {
    const v = village({ mushrooms: [PUFF] })
    v.press(cap)
    v.takeNotes()
    const heard: { frequency: number; glideTo?: number; attack: number; decay: number }[][] = []
    const to = (up: number) => { v.drag({ x: cap.x, y: cap.y - up }); const notes = v.takeNotes(); if (notes.length > 0) heard.push(notes) }
    for (let up = 4; up <= OUT + 60; up += 4) to(up)
    for (let up = OUT + 60; up >= DRIFT + 4; up -= 4) to(up)
    for (let up = DRIFT + 4; up <= OUT + 60; up += 4) to(up)
    expect(heard.length).toBe(1)
    const parp = heard[0][0]
    expect(parp.attack + parp.decay).toBeGreaterThanOrEqual(PARP_S)
    expect(PARP_S).toBeGreaterThanOrEqual(0.8)
    expect(parp.glideTo).toBeLessThan(parp.frequency)
    // A red mushroom still squeals a notch at a time.
    const red = village({ mushrooms: [RED] })
    red.press({ x: RED.x, y: RED.y - 60 })
    red.takeNotes()
    let squeals = 0
    for (let up = 4; up <= OUT + 60; up += 4) { red.drag({ x: RED.x, y: RED.y - 60 - up }); if (red.takeNotes().length > 0) squeals += 1 }
    expect(squeals).toBeGreaterThan(3)
  })
})

describe('11. a path from a gnome starts at his feet, in sight', () => {
  it('has each gnome step off the log beside himself, on moss that shows: on no gnome, his hat included', () => {
    const places = GNOMES.map((who) => stepOff(who))
    expect(new Set(places.map((p) => p.x + ',' + p.y)).size).toBe(GNOMES.length)
    for (const who of GNOMES) {
      const at = stepOff(who), seat = SEATS[who]
      // No hat lies over it or beside it, and of no gnome's body more than the very edge: at least half the pebble shows.
      for (const other of GNOMES) {
        for (const [dx, dy] of [[0, 0], [-9, 0], [9, 0], [0, -7], [0, 7]]) expect(onHat(other, at.x + dx, at.y + dy), `the ${who} gnome's place, under the ${other} gnome's hat`).toBe(false)
        expect(Math.abs(at.x - SEATS[other].x), `the ${who} gnome's place, under the ${other} gnome`).toBeGreaterThanOrEqual(SEATS[other].half)
      }
      // It is a place a pebble may lie, at the log, on the pebbles' grid, below every foot the moss gives.
      expect(pebbleMay(at.x, at.y)).toBe(true)
      expect(atLog(at.x, at.y)).toBe(true)
      expect(at.x % 20).toBe(0)
      expect(at.y % 20).toBe(0)
      expect(at.y).toBeGreaterThan(mossBottom(at.x) + 40)
      // Beside him: nearer his own seat than any other gnome's, and no farther off than he is wide.
      for (const other of GNOMES) if (other !== who) expect(Math.abs(at.x - seat.x), `${who} and ${other}`).toBeLessThan(Math.abs(at.x - SEATS[other].x))
      expect(Math.abs(at.x - seat.x)).toBeLessThanOrEqual(seat.half * 1.2)
      // At his feet: within his own height, below his brow.
      expect(at.y).toBeGreaterThan(seat.y - 172)
    }
  })

  it.each(GNOMES)('lays the first pebble of a path drawn from the %s gnome\'s body there, with a sound, as soon as the finger leaves where it landed', (who) => {
    const v = village()
    const chest = chestOf(who)
    v.press(chest)
    v.takeNotes()
    v.drag({ x: chest.x + 10, y: chest.y - DRIFT - 6 })
    const first = v.toSave().paths[0][0]
    expect(first).toEqual(stepOff(who))
    expect(sounded(v)).toBe(true)
    expect(v.show().pebbles.some((p) => p.x === first.x && p.y === first.y)).toBe(true)
    v.takeAway()
  })
})

describe('12. nothing a child touches lies under the home control, on a phone on its side either', () => {
  const PHONE = { width: 667, height: 375 }
  /** The jam's round home control with a finger's slack round it, in stage units on a surface. */
  const homeOn = (s: { width: number; height: number }): Box => {
    const by = fit(s.width, s.height), a = toStage({ x: s.width / 2 - 32, y: 0 }, by), b = toStage({ x: s.width / 2 + 32, y: 66 }, by)
    return { x0: a.x, y0: a.y, x1: b.x, y1: b.y }
  }

  it('knows how far the control reaches into the stage on the phone, and no larger surface the tests name reaches farther', () => {
    for (const surface of [PHONE, { width: 1024, height: 768 }, { width: 1180, height: 820 }]) {
      const home = homeOn(surface)
      expect(home.x0).toBeGreaterThanOrEqual(HOME_REACH.x - HOME_REACH.half)
      expect(home.x1).toBeLessThanOrEqual(HOME_REACH.x + HOME_REACH.half)
      expect(home.y1).toBeLessThanOrEqual(HOME_REACH.down)
    }
    expect(homeOn(PHONE).y1).toBeGreaterThan(HOME_REACH.down - 4)
  })

  it('grows no mushroom there: wherever a finger lands, the whole of the tallest mushroom it can grow stays out from under the control', () => {
    const home = homeOn(PHONE)
    let feet = 0
    for (let x = 0; x <= 1180; x += 6) for (let y = 250; y <= 620; y += 6) {
      const foot = footFor(x, y)
      if (!foot) continue
      feet += 1
      for (const flip of [false, true]) {
        const body = bodyBox({ ...foot, kind: kindAt(foot.x, foot.y), size: FULL, flip })
        expect(boxesMeet(body, home), `a full mushroom at ${foot.x}, ${foot.y}`).toBe(false)
        // Pulled as far as a cap can be before it is out, it still stays clear of the control's own disc.
        expect(body.y0, `at ${foot.x}, ${foot.y}`).toBeGreaterThanOrEqual(mossTop(foot.x) - 244)
      }
      // A door there, and the hat beside it, stay clear too.
      for (const size of [1, 6, FULL]) expect(boxesMeet(doorBox({ ...foot, kind: kindAt(foot.x, foot.y), size, flip: false }), home)).toBe(false)
    }
    expect(feet).toBeGreaterThan(2000)
    // Under the control the band's upper edge lies lower than beside it.
    expect(mossTop(HOME_REACH.x)).toBeGreaterThan(mossTop(HOME_REACH.x - 300))
    expect(inBox(home, HOME_REACH.x, 100)).toBe(true)
  })
})

describe('13. a gnome out on the moss follows the finger with his eyes, and a bucket with water shows its water', () => {
  const DARK = '#2b2440'
  /** A village in which a gnome stands out on the moss, on his way back to the log. */
  function outOnMoss(who: GnomeId): Shown {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { ...NOBODY, [who]: RED.id } })
    pullUp(v, { x: RED.x, y: RED.y - 80 }, OUT + 30)
    v.lift()
    run(v, 1.5)
    const shown = v.show()
    expect(shown.gnomes[who].where).toBe('out')
    return shown
  }
  /** Where his two pupils are drawn on the canvas: the dark dabs nearest his head. */
  const pupils = (shown: Shown, who: GnomeId, gaze: At | null): { x: number; y: number } => {
    const g = shown.gnomes[who], head = { x: g.x * 2, y: (g.y - 110) * 2 }
    const dabs = watching()({ ...shown, gaze }).blobs.filter((blob) => blob.paint === DARK && Math.hypot(blob.x - head.x, blob.y - head.y) < 80)
    expect(dabs.length).toBe(2)
    return { x: (dabs[0].x + dabs[1].x) / 2, y: (dabs[0].y + dabs[1].y) / 2 }
  }

  it.each(['tall', 'baker'] as const)('turns the %s gnome\'s eyes to a finger on either side of him, above and below, while he is out', (who) => {
    const shown = outOnMoss(who), g = shown.gnomes[who]
    const left = pupils(shown, who, { x: g.x - 400, y: g.y - 80 }), right = pupils(shown, who, { x: g.x + 400, y: g.y - 80 })
    const above = pupils(shown, who, { x: g.x, y: g.y - 500 }), below = pupils(shown, who, { x: g.x, y: g.y + 300 })
    expect(right.x - left.x).toBeGreaterThan(3)
    expect(below.y - above.y).toBeGreaterThan(3)
  })

  it('paints water in the baker\'s bucket while he carries some, and none while it is empty', () => {
    const shown = outOnMoss('baker')
    const frame = watching()
    const empty = frame({ ...shown, gnomes: { ...shown.gnomes, baker: { ...shown.gnomes.baker, carries: false } } })
    const full = frame({ ...shown, gnomes: { ...shown.gnomes, baker: { ...shown.gnomes.baker, carries: true } } })
    expect(empty.blobs.some((blob) => blob.paint === BUCKET_WATER.paint)).toBe(false)
    const water = full.blobs.filter((blob) => blob.paint === BUCKET_WATER.paint)
    expect(water.length).toBe(1)
    // It lies in the bucket he holds out: beside him, at about the height of his middle.
    const g = shown.gnomes.baker
    expect(Math.abs(water[0].x - g.x * 2)).toBeLessThan(120)
    expect(Math.abs(water[0].x - g.x * 2)).toBeGreaterThan(20)
    expect(g.y * 2 - water[0].y).toBeGreaterThan(20)
    // One fill more, and no more.
    expect(full.draws - empty.draws).toBe(1)
  })

  it('has him carry water in his bucket on the way home from the stream', () => {
    const way = fromLog(stepAt(RED))
    const v = village({ mushrooms: [{ ...RED, door: true }], paths: [way], homes: { ...NOBODY, baker: RED.id } })
    tap(v, middle(doorBox(v.show().mushrooms[0])))
    let carried = 0
    const frame = watching()
    frames(v, 12, () => { if (v.show().gnomes.baker.carries && carried++ === 5) expect(frame(v.show()).blobs.some((blob) => blob.paint === BUCKET_WATER.paint)).toBe(true) })
    expect(carried).toBeGreaterThan(10)
  })
})
