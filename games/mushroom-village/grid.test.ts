import { describe, expect, it } from 'vitest'
import { GATE_S, HAT_OFF_S, KNOCKED_S, RAFT_S } from './answers'
import { CART, SEATS, SUN, SUN_DOWN_Y } from './ground'
import { MOST_POINTS, countPoints, type Path } from './paths'
import { hatBox, stepAt } from './shapes'
import { OUT } from './village'
import { BELL, FRAME, ON_CART, PUFF, RED, carry, doorOf, fromLog, liftPath, hatOf, middle, pullUp, run, stroke, tap, village, type At } from './testkit'

// The object-by-action grid of the design sheet, cell by cell: what each
// thing does when a door is dropped on it and when a path is drawn onto it,
// and what the stream, a path and a gnome do under a hold, a tap and a pull.
// (A mushroom held, tapped and pulled is in village.test.ts.) Every cell is
// answered with a sound in the same call as the touch, and with something to
// see.

const sounded = (v: ReturnType<typeof village>): boolean => v.takeNotes().length > 0
const row = (y: number, from: number, to: number): Path => { const path: Path = []; for (let x = from; x <= to; x += 20) path.push({ x, y }); return path }
const ROW = row(600, 860, 980)

describe('a door dropped on a mushroom', () => {
  it.each([[RED], [BELL], [PUFF]])('goes into it, with a sound, and is kept at once', (kept) => {
    const v = village({ mushrooms: [kept] })
    carry(v, ON_CART, { x: kept.x, y: kept.y - 30 })
    expect(v.show().door).not.toBeNull()
    v.takeNotes(); v.takeChange()
    v.lift()
    expect(v.show().door).toBeNull()
    expect(v.toSave().mushrooms[0].door).toBe(true)
    expect(v.takeChange()).toBe('now')
    expect(sounded(v)).toBe(true)
  })

  it('makes each kind a house in its own way: a chimney and smoke on the red, a ladder down the bell, a sag and a plump on the puffball', () => {
    const red = village({ mushrooms: [RED] }), bell = village({ mushrooms: [BELL] }), puff = village({ mushrooms: [PUFF] })
    for (const [v, kept] of [[red, RED], [bell, BELL], [puff, PUFF]] as const) { carry(v, ON_CART, { x: kept.x, y: kept.y - 30 }); v.lift() }
    let smoke = false, ladder: number[] = [], sag = 0
    for (let i = 0; i < 80; i++) {
      for (const v of [red, bell, puff]) v.step(FRAME)
      smoke ||= red.show().specks.some((s) => s.what === 'smoke')
      ladder.push(bell.show().mushrooms[0].built)
      sag = Math.min(sag, puff.show().mushrooms[0].puff)
    }
    expect(red.show().mushrooms[0].built).toBeGreaterThan(0.9)
    expect(smoke).toBe(true)
    expect(ladder[10]).toBeLessThan(0.3)
    expect(ladder[79]).toBeGreaterThan(0.9)
    expect(sag).toBeLessThan(-0.3)
  })

  it('is sent to the nearest mushroom that has none by a tap on the cart, and rattles when every mushroom has one', () => {
    const v = village({ mushrooms: [RED, BELL] })
    tap(v, ON_CART)
    expect(v.toSave().mushrooms.find((m) => m.id === RED.id)!.door).toBe(true)
    expect(v.toSave().mushrooms.find((m) => m.id === BELL.id)!.door).toBe(false)
    expect(v.show().mushrooms.find((m) => m.id === RED.id)!.door).toBe(false)
    run(v, 0.4)
    expect(v.show().mushrooms.find((m) => m.id === RED.id)!.door).toBe(true)
    const full = village({ mushrooms: [{ ...RED, door: true }] })
    tap(full, ON_CART)
    expect(sounded(full)).toBe(true)
    expect(full.toSave().mushrooms[0].door).toBe(true)
  })

  it('clacks against a door that is already there and goes back to the cart', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }] })
    carry(v, ON_CART, { x: RED.x, y: RED.y - 100 })
    v.takeNotes()
    v.lift()
    expect(sounded(v)).toBe(true)
    expect(v.toSave().mushrooms).toEqual([{ ...RED, door: true }])
  })

  it('comes off a house when the finger carries it away, and its gnome is back on the log with his bundle', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { tall: null, sleepy: null, sneezy: 1, baker: null } })
    expect(v.show().gnomes.sneezy.where).toBe('home')
    carry(v, doorOf(v, 1), { x: 880, y: 620 })
    // In the hand it is still kept in the house, with the gnome at home.
    expect(v.toSave().mushrooms[0].door).toBe(true)
    expect(v.toSave().homes.sneezy).toBe(1)
    expect(v.show().mushrooms[0].door).toBe(false)
    v.lift()
    expect(v.toSave().mushrooms[0].door).toBe(false)
    expect(v.toSave().homes.sneezy).toBeNull()
    expect(v.takeChange()).toBe('now')
    // He is seen walking back, and arrives.
    expect(v.show().gnomes.sneezy.where).toBe('out')
    run(v, 8)
    expect(v.show().gnomes.sneezy.where).toBe('log')
  })
})

describe('a path drawn onto a mushroom', () => {
  it('piles against a red stem with no door and the mushroom hiccups; with a door the last pebble is a step', () => {
    for (const door of [false, true]) {
      const v = village({ mushrooms: [{ ...RED, door }], homes: { tall: null, sleepy: null, sneezy: null, baker: null } })
      stroke(v, { x: 860, y: 620 }, { x: RED.x, y: stepAt(RED).y })
      const fired = v.takeFired()
      expect(fired.some((f) => f.what === 'mushroom' && f.sound && f.moved)).toBe(true)
      // With a door in it a gnome who waits takes the first pebble as his way home, which is another test.
      if (!door) { run(v, 0.1); expect(Math.abs(v.show().mushrooms[0].squash)).toBeGreaterThan(0.01) }
      // No pebble lies under the foot.
      expect(v.toSave().paths.flat().some((p) => Math.abs(p.x - RED.x) < 30 && Math.abs(p.y - RED.y) < 14)).toBe(false)
    }
  })

  it('rings a bell a little louder with each pebble that lands nearer, and sets it swinging at the end', () => {
    const v = village({ mushrooms: [BELL] })
    v.press({ x: 460, y: 600 })
    const peaks: number[] = []
    for (let i = 1; i <= 16; i++) {
      v.drag({ x: 460 + ((BELL.x - 460) * i) / 16, y: 520 + ((stepAt(BELL).y - 520) * i) / 16 })
      const loud = v.takeNotes().filter((n) => n.frequency > 1500).map((n) => n.peak)
      if (loud.length > 0) peaks.push(Math.max(...loud))
    }
    v.lift()
    expect(peaks.length).toBeGreaterThan(3)
    expect(peaks[peaks.length - 1]).toBeGreaterThan(peaks[0])
    run(v, 0.2)
    expect(Math.abs(v.show().mushrooms[0].swing)).toBeGreaterThan(0.05)
  })

  it('sinks into a puffball\'s soft foot and squeezes spores out of it', () => {
    const v = village({ mushrooms: [PUFF] })
    stroke(v, { x: 430, y: 600 }, { x: PUFF.x + 10, y: stepAt(PUFF).y + 6 })
    expect(v.show().specks.some((s) => s.what === 'spore')).toBe(true)
    expect(v.takeFired().some((f) => f.what === 'mushroom' && f.sound && f.moved)).toBe(true)
  })
})

describe('the stream', () => {
  const POND = { x: 870, y: 742 }

  it('is drawn up like toffee by a finger that pulls, and falls back with a splat', () => {
    const v = village()
    carry(v, POND, { x: POND.x, y: POND.y - 120 })
    expect(v.show().column!.up).toBeGreaterThan(90)
    expect(v.show().frog).toBeNull()
    v.takeNotes()
    v.lift()
    expect(v.show().column).toBeNull()
    expect(sounded(v)).toBe(true)
    expect(v.count).toBe(0)
  })

  it('floats a door off as a raft and has it back on the cart', () => {
    const v = village({ mushrooms: [RED] })
    carry(v, ON_CART, POND)
    v.lift()
    expect(v.show().props.some((p) => p.what === 'raft')).toBe(true)
    expect(v.toSave().mushrooms[0].door).toBe(false)
    v.takeNotes()
    run(v, RAFT_S + 0.1)
    expect(v.show().props.length).toBe(0)
    expect(sounded(v)).toBe(true)
  })

  it('turns the pebbles that reach it into stepping stones, each with a ring', () => {
    const v = village()
    stroke(v, { x: 590, y: 600 }, { x: 800, y: 520 }, 20)
    const wet = v.show().pebbles.filter((p) => p.wet)
    expect(wet.length).toBeGreaterThan(1)
    expect(v.show().rings.length).toBeGreaterThan(0)
    expect(v.show().pebbles.some((p) => !p.wet)).toBe(true)
  })

  it('brings the frog up clear of where the baker holds his bucket', () => {
    const v = village()
    v.press({ x: 730, y: 740 })
    run(v, 0.6)
    expect(v.show().frog!.x).toBeGreaterThan(SEATS.baker.x + 200)
  })
})

describe('a pebble path', () => {
  const MID: At = { x: 920, y: 600 }

  it('see-saws under a finger that rests on a pebble: that one sinks and the ones beside it rise', () => {
    const v = village({ paths: [ROW] })
    v.press(MID)
    expect(sounded(v)).toBe(true)
    const at = (x: number) => v.show().pebbles.find((p) => p.x === x)!.up
    expect(at(920)).toBeLessThan(0)
    expect(at(900)).toBeGreaterThan(0)
    expect(at(940)).toBeGreaterThan(0)
    run(v, 0.6)
    v.takeNotes()
    v.lift()
    expect(sounded(v)).toBe(true)
    expect(v.toSave().paths).toEqual([ROW])
  })

  it('runs a hop along the path both ways from a tap, every pebble with its own note in its own moment', () => {
    const v = village({ paths: [ROW] })
    tap(v, MID)
    const pitches = new Set<number>()
    let moments = 0
    for (let i = 0; i < 30; i++) {
      const notes = v.takeNotes().filter((n) => n.kind === 'tone')
      if (notes.length > 0) moments += 1
      for (const n of notes) pitches.add(n.frequency)
      v.step(FRAME)
    }
    expect(moments).toBeGreaterThanOrEqual(3)
    expect(pitches.size).toBeGreaterThanOrEqual(3)
  })

  it('lifts by one pebble like a string of beads, drops back from low and rolls away from high', () => {
    const low = village({ paths: [ROW] })
    liftPath(low, MID, OUT - 14)
    expect(low.show().pebbles.find((p) => p.x === 920)!.up).toBeGreaterThan(25)
    expect(low.show().pebbles.find((p) => p.x === 900)!.up).toBeGreaterThan(10)
    low.lift()
    expect(low.toSave().paths).toEqual([ROW])
    const high = village({ paths: [ROW] })
    liftPath(high, MID, OUT + 30)
    high.takeNotes(); high.takeChange()
    high.lift()
    expect(high.toSave().paths).toEqual([])
    expect(high.takeChange()).toBe('now')
    expect(sounded(high)).toBe(true)
    expect(high.show().props.some((p) => p.what === 'rolling')).toBe(true)
  })

  it('stands a door up as a gate to nowhere, which opens, shuts, falls flat and goes back to the cart', () => {
    const v = village({ paths: [ROW] })
    carry(v, ON_CART, MID)
    v.lift()
    const phases = new Set<string>()
    for (let i = 0; i < (GATE_S + 0.1) / FRAME; i++) { for (const p of v.show().props) if (p.what === 'gate') phases.add(p.phase); v.step(FRAME) }
    expect([...phases]).toEqual(['up', 'open', 'shut', 'flat', 'home'])
    expect(v.show().props.length).toBe(0)
    expect(v.toSave().paths).toEqual([ROW])
  })

  it('shuffles its pebbles round where a second path meets it', () => {
    const v = village({ paths: [ROW] })
    stroke(v, { x: 920, y: 540 }, { x: 920, y: 660 })
    expect(v.show().knots).toEqual([{ x: 920, y: 600 }])
    expect(v.takeFired().some((f) => f.what === 'pebble' && f.sound && f.moved)).toBe(true)
  })

  it('is carried on from its end by a finger that starts on its last pebble', () => {
    const v = village({ paths: [ROW] })
    stroke(v, { x: 980, y: 600 }, { x: 980, y: 680 })
    expect(v.toSave().paths.length).toBe(1)
    expect(v.toSave().paths[0].length).toBeGreaterThan(ROW.length + 2)
  })
})

describe('bare moss under a finger that is drawn across it', () => {
  it('slips the button back that the finger had started, and starts the pebbles where the finger landed', () => {
    const v = village()
    v.press({ x: 520, y: 460 })
    expect(v.count).toBe(1)
    v.drag({ x: 600, y: 460 })
    expect(v.count).toBe(0)
    expect(v.toSave().paths[0][0]).toEqual({ x: 520, y: 460 })
    expect(v.show().props.some((p) => p.what === 'slip')).toBe(true)
    v.lift()
    expect(v.takeChange()).toBe('now')
  })

  it('keeps every pebble as it is laid, on the grid, and writes that the child has drawn a path', () => {
    const v = village({ shown: ['cart'] })
    carry(v, { x: 860, y: 620 }, { x: 960, y: 620 })
    expect(v.toSave().paths[0].length).toBeGreaterThan(4)
    expect(v.toSave().paths.flat().every((p) => p.x % 20 === 0 && p.y % 20 === 0)).toBe(true)
    expect(v.toSave().shown).toContain('pebbles')
    expect(v.takeChange()).not.toBe('none')
  })

  it('still answers where no more pebbles can be laid: one hops up with a clack and drops back', () => {
    const rows = [360, 380, 400, 420, 440].map((y) => row(y, 40, 1140)).flat().slice(0, MOST_POINTS)
    const v = village({ paths: [rows] })
    run(v, 1)
    carry(v, { x: 880, y: 620 }, { x: 960, y: 620 }, 4)
    expect(countPoints(v.toSave().paths)).toBe(MOST_POINTS)
    expect(v.show().props.some((p) => p.what === 'loose')).toBe(true)
    expect(sounded(v)).toBe(true)
  })
})

describe('a gnome who waits', () => {
  const BAKER: At = { x: SEATS.baker.x, y: SEATS.baker.y - 100 }

  it('has his hat pulled off with a pop, covers his bare head with both hands, and gets it back when the finger lets go', () => {
    const v = village()
    const hat = hatOf('baker')
    carry(v, hat, { x: hat.x, y: hat.y - 70 })
    run(v, 0.3)
    // Stretched, and still on his head: it comes off where the finger lets go.
    expect(v.show().gnomes.baker.hatPull).toBeGreaterThan(40)
    expect(v.show().gnomes.baker.hands).toBe(false)
    v.takeNotes()
    v.lift()
    expect(sounded(v)).toBe(true)
    let up = 0
    for (let t = 0; t < 0.4; t += FRAME) { v.step(FRAME); up = Math.max(up, v.show().gnomes.baker.hatUp) }
    expect(up).toBeGreaterThan(30)
    expect(v.show().gnomes.baker.hands).toBe(true)
    run(v, HAT_OFF_S)
    expect(v.show().gnomes.baker.hands).toBe(false)
  })

  it('knocks twice on a door he is handed, looks behind it and hands it back', () => {
    const v = village({ mushrooms: [RED] })
    carry(v, ON_CART, BAKER)
    v.lift()
    const phases = new Set<string>()
    for (let i = 0; i < (KNOCKED_S + 0.1) / FRAME; i++) { for (const p of v.show().props) if (p.what === 'knocked') phases.add(p.phase); v.step(FRAME) }
    expect([...phases]).toEqual(['held', 'knock', 'look', 'home'])
    expect(v.toSave().mushrooms[0].door).toBe(false)
    expect(v.show().gnomes.baker.where).toBe('log')
  })

  it('walks a path that is drawn onto him to its end, scratches his head and walks back to the log; nothing of it is kept', () => {
    const v = village()
    stroke(v, { x: 880, y: 600 }, { x: 640, y: 540 }, 20)
    const kept = JSON.stringify(v.toSave())
    expect(v.sceneRunning).toBe(true)
    let out = false, farthest = 0
    for (let i = 0; i < 14 / FRAME && v.sceneRunning; i++) {
      v.step(FRAME)
      const baker = v.show().gnomes.baker
      if (baker.where === 'out') { out = true; farthest = Math.max(farthest, baker.x) }
      expect(JSON.stringify(v.toSave())).toBe(kept)
    }
    expect(out).toBe(true)
    expect(farthest).toBeGreaterThan(820)
    expect(v.show().gnomes.baker.where).toBe('log')
    expect(v.sceneRunning).toBe(false)
  })
})

describe('the state stays, and changes with the one thing the child changes', () => {
  it('sends a gnome back to the log, unhurt and with his bundle, when his house is pulled up', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { tall: null, sleepy: null, sneezy: 1, baker: null } })
    pullUp(v, { x: RED.x, y: RED.y - 110 }, OUT + 30)
    // Until it is out, the house and its gnome are kept where they stand.
    expect(v.toSave().homes.sneezy).toBe(1)
    v.takeChange()
    v.lift()
    expect(v.toSave().mushrooms).toEqual([])
    expect(v.toSave().homes.sneezy).toBeNull()
    expect(v.takeChange()).toBe('now')
    run(v, 8)
    expect(v.show().gnomes.sneezy.where).toBe('log')
  })

  it('takes the tall gnome\'s hat in off the step when his low house is held taller, and changes how he carries himself at once', () => {
    const low = { ...RED, size: 3, door: true }
    const v = village({ mushrooms: [low], homes: { tall: 1, sleepy: null, sneezy: null, baker: null }, hatOff: true })
    expect(v.show().mushrooms[0].manner).toBe('crawled')
    v.press({ x: RED.x + 34, y: RED.y - 70 })
    run(v, 0.9)
    expect(v.toSave().mushrooms[0].size).toBeGreaterThan(3)
    expect(v.toSave().hatOff).toBe(false)
    expect(v.show().hat).toBeNull()
    expect(v.show().mushrooms[0].manner).toBe('stooped')
    run(v, 1.2)
    v.lift()
    expect(v.show().mushrooms[0].manner).toBe('upright')
  })

  it('lets the sleepy one sleep again when the path to his door is rolled away, and wakes him when one is drawn', () => {
    const way = fromLog(stepAt(RED))
    const v = village({ mushrooms: [{ ...RED, door: true }], paths: [way], homes: { tall: null, sleepy: 1, sneezy: null, baker: null } })
    expect(v.show().mushrooms[0].manner).toBe('woken')
    const grip = way[Math.floor(way.length / 2)]
    liftPath(v, grip, OUT + 40)
    v.lift()
    expect(v.toSave().paths).toEqual([])
    expect(v.show().mushrooms[0].manner).toBe('asleep')
  })
})

describe('the sun and the snail', () => {
  it('goes down on a tap and comes up on a tap, with a shimmer each time', () => {
    const v = village()
    tap(v, SUN)
    expect(v.toSave().night).toBe(true)
    expect(sounded(v)).toBe(true)
    run(v, 7)
    expect(v.show().sun.asleep).toBe(true)
    tap(v, { x: SUN.x, y: SUN_DOWN_Y - 40 })
    expect(v.toSave().night).toBe(false)
  })

  it('puffs out its cheeks and hums under a finger that stays, and stays up', () => {
    const v = village()
    v.press(SUN)
    v.takeNotes()
    run(v, 1)
    expect(v.show().sun.cheeks).toBeGreaterThan(0.5)
    expect(sounded(v)).toBe(true)
    v.lift()
    expect(v.toSave().night).toBe(false)
    run(v, 0.6)
    expect(v.show().sun.cheeks).toBeLessThan(0.2)
  })

  it('brings the night when it is pulled down far enough, and springs back when it is not', () => {
    const little = village()
    carry(little, SUN, { x: SUN.x, y: SUN.y + 40 })
    expect(little.show().sun.y).toBeGreaterThan(SUN.y + 30)
    little.lift()
    expect(little.toSave().night).toBe(false)
    expect(little.show().sun.y).toBe(SUN.y)
    const far = village()
    carry(far, SUN, { x: SUN.x, y: SUN.y + 90 })
    far.lift()
    expect(far.toSave().night).toBe(true)
    expect(far.show().sun.y).toBeGreaterThan(SUN.y + 60)
  })

  it('comes up when it is pulled up at night', () => {
    const v = village({ night: true })
    carry(v, { x: SUN.x, y: SUN_DOWN_Y - 40 }, { x: SUN.x, y: SUN_DOWN_Y - 110 })
    v.lift()
    expect(v.toSave().night).toBe(false)
  })
})

describe('things are touched where they are drawn', () => {
  it('takes a tap on a door as the door and a tap on the cap as the mushroom, at every size', () => {
    for (const size of [1, 6, 12]) {
      const v = village({ mushrooms: [{ ...RED, size, door: true }], homes: { tall: null, sleepy: null, sneezy: 1, baker: null } })
      tap(v, doorOf(v, 1))
      expect(v.sceneRunning, `a door at size ${size}`).toBe(true)
      const other = village({ mushrooms: [{ ...RED, size, door: true }], homes: { tall: null, sleepy: null, sneezy: 1, baker: null } })
      tap(other, { x: RED.x, y: RED.y - 40 - 13 * size })
      expect(other.sceneRunning, `a cap at size ${size}`).toBe(false)
    }
  })

  it('rocks the hat on the doorstep under a tap, and takes that tap for neither the door nor the mushroom', () => {
    const low = { ...RED, size: 3, door: true }
    const v = village({ mushrooms: [low], homes: { tall: 1, sleepy: null, sneezy: null, baker: null }, hatOff: true })
    const hat = v.show().hat!
    expect(hat.box).toEqual(hatBox({ ...low, kind: 'red', flip: false }))
    tap(v, middle(hat.box))
    expect(v.sceneRunning).toBe(false)
    run(v, 0.1)
    expect(Math.abs(v.show().hat!.rock)).toBeGreaterThan(0.05)
    expect(v.toSave().mushrooms[0].size).toBe(3)
  })

  it('does not find a gnome on the log who is at home: a finger on his seat knocks on the log', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { tall: null, sleepy: null, sneezy: null, baker: 1 } })
    v.press({ x: SEATS.baker.x, y: SEATS.baker.y + 10 })
    run(v, 0.8)
    expect(v.show().gnomes.baker.press).toBe(0)
    expect(v.show().gnomes.baker.where).toBe('home')
  })

  it('finds the cart only once it has come', () => {
    const before = village({ shown: [] })
    expect(before.show().cart).toBeNull()
    before.press(ON_CART)
    before.drag({ x: ON_CART.x - 80, y: ON_CART.y - 60 })
    expect(before.show().door).toBeNull()
    expect(village().show().cart).toEqual({ x: CART.x, hop: 0 })
  })
})
