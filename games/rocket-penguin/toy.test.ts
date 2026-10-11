import { describe, expect, it } from 'vitest'
import type { Body, Fish } from './flight'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder } from './guidance'
import { freshSave, serialize, type Save } from './save'
import { BARE_PAPER, bolt, heardAt, heardFrom, newToy, play, playHome, playUntil, pullAndLetGo, pullAt, slotAt, staged, still, type Played } from './testing'
import { BOLTING, PILOT_FLAME, SNAP, TAKE, found, type Frame, type Pose } from './toy'
import { BALLOON, BASKET, BERG, CATAPULT, CHICK, CLOUD, DRIFT, ICE_Y, IGLOO, KIT, PARTS, PENGUIN, PUFFIN, SEALS, SEA_Y, SPOUT, WALRUS, WHALE, WHALE_EYE, WHALE_TAIL, thingAt, type Friend, type Part, type Thing } from './world'

const names = (sounds: { name: string }[]): string[] => sounds.map((sound) => sound.name)

// Where a body is put for each of the five things of the grid, a step away from meeting it.
/** Bare ice between the kit and the near seal, clear of both. */
const ICE = { x: 238, y: ICE_Y - PENGUIN.r - 12 }
const OVER = (which: 0 | 1): { x: number; y: number } => ({ x: SEALS[which].x, y: SEALS[which].y - SEALS[which].r - PENGUIN.r - 12 })
const OVER_DRIFT = { x: DRIFT.x + 5, y: DRIFT.y - DRIFT.ry - 34 }
const IN_SPOUT = { x: SPOUT.x, y: 420 }
const OVER_CLOUD = { x: CLOUD[2].x, y: CLOUD[2].y - CLOUD[2].r - 18 }
/** The friends' places: the ice before the igloo, the top of the iceberg, the side of the basket. */
const AT_CHICK = { x: 540, y: ICE_Y - PENGUIN.r - 2 }
const AT_WALRUS = { x: 1150, y: BERG.y0 - PENGUIN.r - 2 }
const AT_PUFFIN = { x: BASKET.x0 - PENGUIN.r - 2, y: (BASKET.y0 + BASKET.y1) / 2 }
const OVER_SEA = { x: 965, y: SEA_Y - PENGUIN.r - 60 }
const DOWN = Math.PI / 2

describe('the pull, which the finger does most', () => {
  it('answers in the call that brings the finger down: a sound, and the penguin in hand', () => {
    const { toy } = newToy()
    const before = still(toy.show())
    toy.press(CATAPULT.rest.x + 20, CATAPULT.rest.y + 10)
    expect(names(toy.takeSounds())).toEqual(['grip'])
    expect(toy.phase).toBe('pull')
    const after = toy.show()
    // Before any time has gone by: its eyes are wide and everyone looks at the finger.
    expect(after.pilot.wide).toBeGreaterThan(before.pilot.wide)
    expect(after.focus).toEqual({ x: CATAPULT.rest.x + 20, y: CATAPULT.rest.y + 10 })
    // And one frame on it has given under the finger.
    toy.step(1 / 60)
    expect(toy.show().pilot.squash).toBeLessThan(1)
  })

  it('takes hold anywhere within the grip of the pouch, and not beyond it', () => {
    const near = newToy(), beyond = newToy()
    near.toy.press(CATAPULT.rest.x - CATAPULT.grip + 2, CATAPULT.rest.y)
    beyond.toy.press(CATAPULT.rest.x - CATAPULT.grip - 30, CATAPULT.rest.y - 60)
    expect(near.toy.phase).toBe('pull')
    expect(beyond.toy.phase).toBe('loaded')
    expect(CATAPULT.grip * 2).toBeGreaterThanOrEqual(48)
  })

  it('keeps the pouch where it was taken hold of: the penguin does not jump to the finger', () => {
    const { toy } = newToy()
    toy.press(CATAPULT.rest.x + 30, CATAPULT.rest.y - 20)
    toy.step(1 / 60)
    expect(toy.show().pouch.x).toBeCloseTo(CATAPULT.rest.x, 3)
    expect(toy.show().pouch.y).toBeCloseTo(CATAPULT.rest.y, 3)
  })

  it('creaks as the bands stretch, higher the further they go, and is silent while the finger rests', () => {
    const { toy } = newToy()
    toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    toy.takeSounds()
    const levels: number[] = []
    for (let reach = 60; reach <= 190; reach += 10) {
      toy.drag(pullAt(40, reach).x, pullAt(40, reach).y)
      for (const sound of toy.takeSounds()) {
        expect(sound.name).toBe('creak')
        levels.push(sound.level)
      }
    }
    expect(levels.length).toBeGreaterThan(8)
    expect([...levels].sort((a, b) => a - b)).toEqual(levels)
    toy.drag(pullAt(40, 190).x, pullAt(40, 190).y)
    expect(toy.takeSounds()).toEqual([])
  })

  it('stretches, bends the fork and lifts the sledge more the harder the pull', () => {
    const light = newToy(), hard = newToy()
    for (const [played, reach] of [[light, 90], [hard, 190]] as const) {
      played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
      played.toy.drag(pullAt(40, reach).x, pullAt(40, reach).y)
      play(played, 0.5)
    }
    const a = light.toy.show(), b = hard.toy.show()
    expect(b.stretch).toBeGreaterThan(a.stretch)
    expect(Math.abs(b.fork)).toBeGreaterThan(Math.abs(a.fork))
    expect(b.sledge).toBeGreaterThan(a.sledge)
    expect(b.pilot.squash).toBeLessThan(a.pilot.squash)
  })

  it('trembles, and goes no further, when pulled past the bands reach', () => {
    const played = newToy()
    played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    played.toy.drag(pullAt(40, 400).x, pullAt(40, 400).y)
    play(played, 0.4)
    const frame = played.toy.show()
    expect(frame.tremble).toBeGreaterThan(0)
    expect(Math.hypot(frame.pouch.x - CATAPULT.fork.x, frame.pouch.y - CATAPULT.fork.y)).toBeLessThanOrEqual(CATAPULT.reach + 0.5)
  })
})

describe('letting go', () => {
  it('twangs in the call that lets go, saves where the pouch was, and throws the penguin a snap later', () => {
    const played = newToy()
    const pull = pullAt(40, 170)
    const sounds = pullAndLetGo(played, pull)
    expect(names(sounds).filter((name) => name !== 'creak')).toEqual(['grip', 'twang'])
    expect(played.toy.phase).toBe('snap')
    expect(played.toy.takeSave()).toBe(true)
    expect(played.toy.takeSave()).toBe(false)
    expect(played.save.last).toEqual({ x: Math.round(pull.x - CATAPULT.rest.x), y: Math.round(pull.y - CATAPULT.rest.y) })
    play(played, SNAP + 1 / 60)
    expect(played.toy.phase).toBe('fly')
    expect(heardFrom(played)).toContain('honk')
    expect(played.toy.show().pilot.pose).toBe('fly')
  })

  it('twangs louder for a harder pull', () => {
    const level = (reach: number): number => pullAndLetGo(newToy(), pullAt(40, reach)).find((sound) => sound.name === 'twang')!.level
    expect(level(190)).toBeGreaterThan(level(100))
  })

  it('pokes the penguin on a tap: it squawks and bounces in the pouch, and nothing is thrown or saved', () => {
    const played = newToy()
    played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    played.toy.tap()
    expect(names(played.toy.takeSounds())).toEqual(['grip', 'squawk'])
    expect(played.toy.phase).toBe('loaded')
    expect(played.toy.takeSave()).toBe(false)
    expect(played.save.last).toBeNull()
    play(played, 0.1)
    expect(played.toy.show().pouch.y).not.toBeCloseTo(CATAPULT.rest.y, 1)
    play(played, 3)
    expect(played.toy.phase).toBe('loaded')
    expect(played.toy.show().pouch.y).toBeCloseTo(CATAPULT.rest.y, 0)
  })

  it('treats a lift with no pull as a poke', () => {
    const played = newToy()
    played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    played.toy.release()
    expect(names(played.toy.takeSounds())).toEqual(['grip', 'squawk'])
    expect(played.toy.phase).toBe('loaded')
  })

  it('throws nothing when the touch is taken away: the pouch eases back and the ring stays where it was', () => {
    const played = newToy()
    pullAndLetGo(played, pullAt(40, 170))
    playHome(played)
    const last = { ...played.save.last! }
    played.toy.takeSave()
    played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    played.toy.drag(pullAt(10, 150).x, pullAt(10, 150).y)
    played.toy.takeSounds()
    played.toy.cancel()
    expect(names(played.toy.takeSounds())).toEqual(['ease'])
    expect(played.toy.phase).toBe('loaded')
    expect(played.toy.takeSave()).toBe(false)
    expect(played.save.last).toEqual(last)
    play(played, 3)
    expect(played.toy.phase).toBe('loaded')
    expect(played.toy.show().pouch.x).toBeCloseTo(CATAPULT.rest.x, 0)
  })

  it('takes a touch away in the air, in a scene and at rest without doing anything for the child', () => {
    const played = staged(['rocket'], { ...OVER_CLOUD, vy: -200 }, true)
    play(played, 0.2)
    expect(played.toy.show().pilot.flame).toBe(1)
    const before = serialize(played.save)
    played.toy.cancel()
    expect(played.toy.takeSounds()).toEqual([])
    play(played, 0.1)
    // The finger is gone, so the rocket is back to its pilot flame: no flag of a touch outlives the touch.
    expect(played.toy.show().pilot.flame).toBe(PILOT_FLAME)
    expect(played.toy.body!.burning).toBe(false)
    expect(played.toy.phase).toBe('fly')
    expect(serialize(played.save)).toEqual(before)
    const idle = newToy()
    idle.toy.cancel()
    expect(idle.toy.takeSounds()).toEqual([])
    expect(idle.toy.phase).toBe('loaded')
  })

  it('lets go of the finger on every way a touch can end, so nothing burns for a finger that has left', () => {
    for (const end of ['release', 'tap', 'cancel'] as const) {
      const played = staged(['rocket'], { ...OVER_CLOUD, vy: -200 }, true)
      play(played, 0.1)
      played.toy[end]()
      play(played, 0.1)
      expect(played.toy.show().pilot.flame, end).toBe(PILOT_FLAME)
      expect(played.toy.body!.burning, end).toBe(false)
      expect(played.toy.show().focus, end).toEqual({ x: played.toy.show().pilot.x, y: played.toy.show().pilot.y })
    }
  })
})

describe('the kit', () => {
  it('bolts a part on in the call that presses it, saves it at once, and shows it arrive a moment later', () => {
    for (const part of PARTS) {
      const played = newToy()
      const at = slotAt(part)
      played.toy.press(at.x, at.y)
      expect(names(played.toy.takeSounds()), part).toEqual(['pick'])
      expect(played.save.bolted).toEqual([part])
      expect(played.toy.takeSave()).toBe(true)
      // It is out of its place in the kit at once, and on its way.
      expect(played.toy.show().kit.out[part]).toBe(true)
      play(played, BOLTING / 2)
      expect(played.toy.show().moving).toEqual([{ part, along: expect.any(Number) }])
      expect(onPilot(played.toy.show(), part)).toBe(false)
      play(played, BOLTING / 2 + 1 / 60)
      // The rocket's pilot flame lights as it is bolted on, with a small pop of its own.
      expect(heardFrom(played)).toEqual(part === 'rocket' ? ['bolt', 'putt'] : ['bolt'])
      expect(played.toy.show().moving).toEqual([])
      expect(onPilot(played.toy.show(), part)).toBe(true)
      expect(played.toy.phase).toBe('loaded')
    }
  })

  it('takes a bolted part off again at a press on its empty place, with a clank as it lands in the kit', () => {
    const played = newToy()
    bolt(played, 'wings')
    const at = slotAt('wings')
    played.toy.press(at.x, at.y)
    expect(names(played.toy.takeSounds())).toEqual(['unbolt'])
    expect(played.save.bolted).toEqual([])
    expect(played.toy.takeSave()).toBe(true)
    play(played, 1 / 60)
    expect(onPilot(played.toy.show(), 'wings')).toBe(false)
    expect(played.toy.show().moving.length).toBe(1)
    play(played, 0.5)
    expect(heardFrom(played)).toEqual(['clank'])
    expect(played.toy.show().kit.out.wings).toBe(false)
  })

  it('never refuses a third part: it goes on, and the part bolted on first drops back into the kit', () => {
    const played = newToy()
    bolt(played, 'rocket')
    bolt(played, 'balloon')
    const sounds = names(bolt(played, 'fish'))
    expect(played.save.bolted).toEqual(['balloon', 'fish'])
    expect(sounds).toEqual(['pick', 'bolt', 'clank'])
    const frame = played.toy.show()
    expect([frame.pilot.rocket, frame.pilot.balloon, frame.pilot.rod]).toEqual([false, true, true])
    expect(frame.kit.out).toEqual({ rocket: false, wings: false, umbrella: false, balloon: true, springs: false, fish: true })
  })

  it('bolts any two parts on together, and takes off with everything that is bolted even when it is still on its way', () => {
    for (let i = 0; i < PARTS.length; i++) for (let j = i + 1; j < PARTS.length; j++) {
      const played = newToy()
      const a = slotAt(PARTS[i]), b = slotAt(PARTS[j])
      played.toy.press(a.x, a.y)
      played.toy.tap()
      played.toy.press(b.x, b.y)
      played.toy.tap()
      pullAndLetGo(played, pullAt(40, 150))
      play(played, SNAP + 1 / 60)
      const frame = played.toy.show()
      expect(frame.moving).toEqual([])
      expect(onPilot(frame, PARTS[i]) && onPilot(frame, PARTS[j])).toBe(true)
      expect(played.toy.body!.weight).toBeGreaterThan(1)
    }
  })

  it('leaves the kit alone while the penguin is out of the pouch: the crate only rattles', () => {
    const played = staged([], { ...OVER_CLOUD, vy: -100 })
    const at = slotAt('rocket')
    played.toy.press(at.x, at.y)
    expect(names(played.toy.takeSounds())).toEqual(['rattle'])
    expect(played.save.bolted).toEqual([])
  })

  it('has a place of a finger\'s width for every part, inside the kit', () => {
    for (const part of PARTS) {
      const at = slotAt(part)
      expect(thingAt(at.x, at.y)).toBe('crate')
      expect(at.x).toBeGreaterThan(KIT.x0)
      expect(at.y).toBeLessThan(KIT.y1)
    }
  })
})

const onPilot = (frame: Frame, part: Part): boolean => part === 'rocket' ? frame.pilot.rocket : part === 'wings' ? frame.pilot.wings : part === 'umbrella' ? frame.pilot.umbrella !== 'none' : part === 'balloon' ? frame.pilot.balloon : part === 'springs' ? frame.pilot.springs : frame.pilot.rod

/** One cell of the grid: a load, where it is put, the sound that is this cell's alone, and what is seen. */
type Cell = { load: Part | null; put: Partial<Body>; hold?: boolean; own: string; also?: string[]; seconds?: number; sees: (frame: Frame, played: Played, seen: Frame[]) => void }

const some = (seen: Frame[], is: (frame: Frame) => boolean): boolean => seen.some(is)

const GRID: Record<string, Cell[]> = {
  'bare ice': [
    { load: null, put: { ...ICE, vy: 500 }, own: 'thunk', sees: (f) => { expect(f.pilot.pose).toBe('beak') } },
    { load: 'rocket', put: { ...ICE, vx: 150, vy: 100 }, hold: true, own: 'sizzle', sees: (f) => { expect(f.furrow.length).toBeGreaterThan(4) } },
    { load: 'wings', put: { ...ICE, y: ICE_Y - PENGUIN.r - 1, vx: -100, vy: 60 }, own: 'squeak', sees: (f) => { expect(f.tips.length).toBeGreaterThan(4) } },
    { load: 'umbrella', put: { ...ICE, vy: 150, open: true }, own: 'tap', sees: (f) => { expect(f.pilot.pose).toBe('stand'); expect(f.pilot.umbrella).toBe('open') } },
    { load: 'balloon', put: { ...ICE, vx: 60, vy: 200 }, own: 'tiptoe', sees: (f, played) => { expect(played.toy.phase).toBe('fly'); expect(f.pilot.y).toBeLessThan(ICE_Y - PENGUIN.r) } },
    { load: 'springs', put: { ...ICE, vy: 300 }, own: 'sproing', sees: (_, played, seen) => { expect(played.toy.phase).toBe('fly'); expect(some(seen, (f) => f.pilot.coil > 2)).toBe(true) } },
    { load: 'fish', put: { ...ICE, vy: 500 }, own: 'wetslap', also: ['thunk'], seconds: 0.5, sees: (_, __, seen) => { expect(some(seen, (f) => Math.abs(f.pilot.swing) > 0.3)).toBe(true) } },
  ],
  'a seal': [
    { load: null, put: { ...OVER(0), vx: 30, vy: 300 }, own: 'boing', also: ['bark'], sees: (_, __, seen) => { expect(some(seen, (f) => f.nearSeal.squash > 0.3 && f.nearSeal.bark > 0)).toBe(true) } },
    { load: 'rocket', put: { ...OVER(0), vx: 0, vy: 300, turn: DOWN }, hold: true, own: 'hiss', also: ['cough'], seconds: 0.6, sees: (f, _, seen) => { expect(f.nearSeal.singed).toBe(1); expect(some(seen, (g) => g.crumbs.some((crumb) => crumb.kind === 'soot'))).toBe(true) } },
    { load: 'wings', put: { ...OVER(0), vx: 30, vy: 300 }, own: 'flap', seconds: 0.3, sees: (_, __, seen) => { expect(some(seen, (f) => f.nearSeal.clap > 0.5)).toBe(true) } },
    { load: 'umbrella', put: { ...OVER(0), vx: 30, vy: 200, open: true }, own: 'rubber', sees: (f, played) => { expect(f.nearSeal.hold).toBeGreaterThan(0.5); expect(played.toy.body!.held).toBeGreaterThan(0) } },
    { load: 'balloon', put: { ...OVER(0), vx: 30, vy: 300 }, own: 'hollow', sees: (_, played) => { expect(played.toy.body!.vy).toBeLessThan(0) } },
    { load: 'springs', put: { ...OVER(0), vx: 30, vy: 300 }, own: 'deeptwang', also: ['oof'], seconds: 0.3, sees: (_, __, seen) => { expect(some(seen, (f) => f.nearSeal.flat > 0.5)).toBe(true) } },
    { load: 'fish', put: { ...OVER(0), vx: 30, vy: 300 }, own: 'snap', also: ['burp', 'boing'], seconds: 0.9, sees: (f, _, seen) => { expect(f.pilot.rod).toBe(true); expect(f.pilot.fish).toBeNull(); expect(some(seen, (g) => g.nearSeal.chew > 0)).toBe(true) } },
  ],
  'the snowdrift': [
    { load: null, put: { ...OVER_DRIFT, vy: 250 }, own: 'whump', sees: (f) => { expect(f.pilot.pose).toBe('buried') } },
    { load: 'rocket', put: { ...OVER_DRIFT, vy: 250, turn: DOWN }, hold: true, own: 'whistle', seconds: 0.4, sees: (f, played, seen) => { expect(played.toy.phase).toBe('fly'); expect(f.pilot.sooty).toBe(true); expect(some(seen, (g) => g.slump > 0.05)).toBe(true) } },
    { load: 'wings', put: { ...OVER_DRIFT, vy: 250 }, own: 'canvas', sees: (f) => { expect(f.pilot.pose).toBe('hung'); expect(f.pilot.wings).toBe(true) } },
    { load: 'umbrella', put: { ...OVER_DRIFT, vy: 120, open: true }, own: 'slither', also: ['pat'], sees: (f) => { expect(f.pilot.pose).toBe('bowl'); expect(f.pilot.umbrella).toBe('flipped') } },
    { load: 'balloon', put: { ...OVER_DRIFT, vy: 250 }, own: 'plop', also: ['whump'], seconds: 2.2, sees: (_, __, seen) => { expect(some(seen, (f) => f.pilot.pose === 'buried' && f.pilot.balloon)).toBe(true) } },
    { load: 'springs', put: { ...OVER_DRIFT, vy: 250 }, own: 'crunch', also: ['mspring'], seconds: 0.2, sees: (_, played) => { expect(played.toy.phase).toBe('fly'); expect(played.toy.body!.vy).toBeLessThan(0) } },
    { load: 'fish', put: { ...OVER_DRIFT, vy: 250 }, own: 'clink', also: ['whump'], sees: (f) => { expect(f.pilot.fish).toBe('frozen') } },
  ],
  'the whale\'s spout': [
    { load: null, put: { ...IN_SPOUT }, own: 'gargle', also: ['rush'], sees: (_, __, seen) => { expect(some(seen, (f) => f.whale.blow > 0)).toBe(true) } },
    { load: 'rocket', put: { x: SPOUT.x - SPOUT.half - 30, y: 420, vx: 150, vy: 0 }, hold: true, own: 'fizzle', also: ['rush'], seconds: 0.5, sees: (_, played, seen) => { expect(some(seen, (f) => f.pilot.flame === 0 && played.toy.phase === 'fly')).toBe(true) } },
    { load: 'wings', put: { ...IN_SPOUT }, own: 'kite', also: ['rush'], sees: (f) => { expect(f.pilot.wings).toBe(true) } },
    { load: 'umbrella', put: { ...IN_SPOUT, y: 570 }, own: 'drum', also: ['rush'], seconds: 0.3, sees: (_, played) => { expect(played.toy.body!.vy).toBeLessThan(0) } },
    { load: 'balloon', put: { ...IN_SPOUT }, own: 'whirr', also: ['rush'], seconds: 0.3, sees: (f, _, seen) => { expect(Math.abs(f.pilot.rot - seen[0].pilot.rot)).toBeGreaterThan(1) } },
    { load: 'springs', put: { ...IN_SPOUT }, own: 'gurgle', also: ['rush'], sees: (_, played) => { expect(played.toy.body!.filled).toBe(true) } },
    { load: 'fish', put: { ...IN_SPOUT }, own: 'flapslap', also: ['rush'], seconds: 0.3, sees: (f, _, seen) => { expect(f.pilot.fish).toBe('wet'); expect(some(seen, (g) => Math.abs(g.pilot.swing) > 0.3)).toBe(true) } },
  ],
  'the thin cloud': [
    { load: null, put: { ...OVER_CLOUD, vy: 200 }, own: 'hush', seconds: 0.4, sees: (f, _, seen) => { expect(f.pilot.misted).toBe(true); expect(some(seen, (g) => g.cloud.part > 0.05)).toBe(true) } },
    { load: 'rocket', put: { ...OVER_CLOUD, vy: 200, turn: DOWN }, hold: true, own: 'pok', seconds: 0.3, sees: (f) => { expect(f.holes.length).toBe(2); expect(f.pilot.misted).toBe(false) } },
    { load: 'wings', put: { ...OVER_CLOUD, vy: 200 }, own: 'squelch', seconds: 0.3, sees: (f) => { expect(f.pilot.soaked).toBe(true) } },
    { load: 'umbrella', put: { ...OVER_CLOUD, vy: 200, open: true }, own: 'patter', seconds: 0.4, sees: (f) => { expect(f.pilot.misted).toBe(false); expect(f.pilot.umbrella).toBe('open') } },
    { load: 'balloon', put: { ...OVER_CLOUD, vy: 200 }, own: 'wetsqueak', seconds: 0.3, sees: (f) => { expect(f.pilot.dewy).toBe(true) } },
    { load: 'springs', put: { ...OVER_CLOUD, vy: 200 }, own: 'jangle', seconds: 0.4, sees: (_, __, seen) => { expect(some(seen, (f) => f.pilot.jangle > 0.5)).toBe(true) } },
    { load: 'fish', put: { ...OVER_CLOUD, vy: 300 }, own: 'gullcry', seconds: 1.2, sees: (f, _, seen) => { expect(f.pilot.fish).toBe('wet'); expect(some(seen, (g) => g.gull !== null && g.gull.cry === 0)).toBe(true); expect(some(seen, (g) => g.gull !== null && g.gull.cry === 1)).toBe(true) } },
  ],
}

/** Plays a cell and returns what was heard and every frame seen. */
function playCell(cell: Cell): { played: Played; heard: string[]; seen: Frame[] } {
  const played = staged(cell.load ? [cell.load] : [], cell.put, cell.hold)
  const seen: Frame[] = []
  for (let n = Math.round((cell.seconds ?? 0.15) * 60); n > 0; n--) {
    play(played, 1 / 60)
    seen.push(still(played.toy.show()))
  }
  return { played, heard: heardFrom(played), seen }
}

describe('the grid: seven loads by five things to come down on', () => {
  const cells = Object.entries(GRID).flatMap(([place, row]) => row.map((cell) => ({ place, cell })))

  it('has thirty-five cells, each with a sound that is its alone', () => {
    expect(cells.length).toBe(35)
    for (const row of Object.values(GRID)) expect(row.map((cell) => cell.load)).toEqual([null, ...PARTS])
    expect(new Set(cells.map(({ cell }) => cell.own)).size).toBe(35)
  })

  for (const { place, cell } of cells) {
    it(`${cell.load ?? 'the bare penguin'} on ${place}: ${cell.own}`, () => {
      const { played, heard, seen } = playCell(cell)
      expect(heard).toContain(cell.own)
      for (const more of cell.also ?? []) expect(heard).toContain(more)
      cell.sees(seen[seen.length - 1], played, seen)
      // No other cell's own sound is heard here, but for the seal's and the place's that every load shares.
      const shared = new Set([cell.own, ...(cell.also ?? [])])
      for (const other of cells) if (other.cell.load !== null && other.cell.load !== cell.load && !shared.has(other.cell.own)) expect(heard, `${other.cell.own}, which is ${other.cell.load} on ${other.place}`).not.toContain(other.cell.own)
    })
  }

  it('gives the far seal its own answers: a deeper boing and a snort, and awake only under the spring feet', () => {
    const bare = staged([], { ...OVER(1), vx: 30, vy: 300 })
    play(bare, 0.1)
    expect(heardFrom(bare)).toEqual(['deepBoing', 'snort'])
    expect(bare.toy.show().farSeal.awake).toBe(0)
    const springs = staged(['springs'], { ...OVER(1), vx: 30, vy: 300 })
    play(springs, 0.3)
    expect(heardFrom(springs)).toEqual(['deeptwang', 'oof'])
    expect(springs.toy.show().farSeal.awake).toBe(1)
    expect(springs.toy.show().farSeal.bubble).toBe(0)
    // It glares at nobody, and sleeps again.
    play(springs, 2)
    expect(springs.toy.show().farSeal.awake).toBe(0)
  })

  it('skids a shallow bare landing along on its belly, with a scrape and then the flop', () => {
    const played = staged([], { ...ICE, vx: -60, vy: 120 })
    playUntil(played, (toy) => toy.phase === 'scene')
    expect(heardFrom(played).filter((name) => name !== 'rattle')).toEqual(['scrape', 'scrape', 'flop'])
    expect(played.toy.show().pilot.pose).toBe('belly')
  })

  it('turns a fast umbrella inside out with a fwop, and squeaks twice for the two wingtips', () => {
    const fast = staged(['umbrella'], { ...ICE, vy: 420, open: true })
    play(fast, 0.1)
    expect(heardFrom(fast)).toContain('fwop')
    expect(fast.toy.show().pilot.umbrella).toBe('flipped')
    const wings = staged(['wings'], { ...ICE, y: ICE_Y - PENGUIN.r - 1, vx: -100, vy: 60 })
    play(wings, 0.3)
    expect(heardFrom(wings).filter((name) => name === 'squeak').length).toBe(2)
    expect(heardAt(wings, 'squeak')).toBeLessThan(0.03)
  })

  it('lights the rocket again once clear of the water, and squirts the springs out at the next landing, once', () => {
    const rocket = staged(['rocket'], { x: SPOUT.x - SPOUT.half - 30, y: 300, vx: 150, vy: 0 }, true)
    play(rocket, 1.2)
    const heard = heardFrom(rocket)
    expect(heard.indexOf('fizzle')).toBeGreaterThan(-1)
    expect(heard.lastIndexOf('whoosh')).toBeGreaterThan(heard.indexOf('fizzle'))
    const springs = staged(['springs'], { ...ICE, vy: 300, filled: true })
    play(springs, 3)
    expect(heardFrom(springs).filter((name) => name === 'squirt').length).toBe(1)
    expect(heardAt(springs, 'squirt')).toBe(heardAt(springs, 'sproing'))
  })

  it('sneezes the mist off on the way out of the cloud, and keeps the rocket\'s hole for that flight only', () => {
    const bare = staged([], { ...OVER_CLOUD, vy: 200 })
    playUntil(bare, (toy) => !toy.body!.inCloud && toy.body!.misted)
    expect(heardFrom(bare)).toEqual(['hush', 'sneeze'])
    const rocket = staged(['rocket'], { ...OVER_CLOUD, vy: 200, turn: DOWN }, true)
    play(rocket, 0.3)
    rocket.toy.tap()
    playHome(rocket)
    expect(rocket.toy.show().holes.length).toBe(2)
    pullAndLetGo(rocket, pullAt(40, 150))
    expect(rocket.toy.show().holes).toEqual([])
  })
})

/** A toy whose flight has just ended at a place: the first frame of its scene has been played. */
function landed(parts: readonly Part[], put: Partial<Body>): Played {
  const played = staged(parts, put)
  expect(playUntil(played, (toy) => toy.phase !== 'fly', 1 / 60, 6)).toBe(true)
  return played
}

/** Seconds from now until the penguin is back in the pouch. */
function sceneLength(played: Played): number {
  const from = played.heard.length
  expect(playHome(played)).toBe(true)
  return (played.heard.length - from) / 60
}

const LANDINGS: [string, readonly Part[], Partial<Body>, Pose][] = [
  ['by the beak in the ice', [], { ...ICE, vy: 500 }, 'beak'],
  ['on its belly', [], { ...ICE, vx: -60, vy: 120 }, 'belly'],
  ['on its feet under the umbrella', ['umbrella'], { ...ICE, vy: 150, open: true }, 'stand'],
  ['in the drift', [], { ...OVER_DRIFT, vy: 250 }, 'buried'],
  ['hung in the drift by its wings', ['wings'], { ...OVER_DRIFT, vy: 250 }, 'hung'],
  ['in the sea', [], { ...OVER_SEA, vy: 150 }, 'bob'],
  ['off the right edge', [], { x: 1232, y: 300, vx: 300 }, 'gone'],
  ['off the left edge', [], { x: -52, y: 300, vx: -300 }, 'gone'],
]
const FRIENDS: [Friend, Partial<Body>][] = [['chick', { ...AT_CHICK, vy: 20 }], ['walrus', { ...AT_WALRUS, vy: 20 }], ['puffin', { ...AT_PUFFIN, vx: 100 }]]
const FISHES: Fish[] = ['fresh', 'wet', 'frozen']

describe('the scenes', () => {
  it('plays the landing for 3 to 6 seconds, saves nothing when it starts, and ends with the catapult loaded', () => {
    for (const [name, parts, put, pose] of LANDINGS) {
      const played = landed(parts, put)
      expect(played.toy.phase, name).toBe('scene')
      expect(played.toy.playing).toBe(true)
      expect(played.toy.show().pilot.pose, name).toBe(pose)
      expect(played.toy.takeSave(), name).toBe(false)
      expect(played.save.eating).toBeNull()
      const length = sceneLength(played)
      expect(length, name).toBeGreaterThanOrEqual(3)
      expect(length, name).toBeLessThanOrEqual(6)
      expect(played.toy.show().pilot).toMatchObject({ pose: 'seat', behind: false })
      expect(heardFrom(played).slice(-2), name).toEqual(['hop', 'sag'])
    }
  })

  it('takes longer over the way back from further off', () => {
    const near = landed([], { ...ICE, vy: 500 }), far = landed([], { ...OVER_SEA, vy: 150 })
    expect(sceneLength(far)).toBeGreaterThan(sceneLength(near) + 0.3)
  })

  it('swims back from the water under a row of bubbles, and comes home behind whatever stands on the ice', () => {
    const played = landed([], { ...OVER_SEA, vy: 150 })
    const poses: Pose[] = []
    let bubbles = 0, behind = 0
    while (played.toy.phase === 'scene') {
      play(played, 1 / 60)
      const frame = played.toy.show()
      if (poses[poses.length - 1] !== frame.pilot.pose) poses.push(frame.pilot.pose)
      bubbles = Math.max(bubbles, frame.crumbs.filter((crumb) => crumb.kind === 'bubble').length)
      if (frame.pilot.behind) behind += 1
    }
    expect(poses).toEqual(['bob', 'under', 'stand', 'toboggan', 'hop', 'seat'])
    expect(bubbles).toBeGreaterThan(0)
    expect(behind).toBeGreaterThan(30)
    expect(heardFrom(played)).toEqual(expect.arrayContaining(['splash', 'squawk', 'swim', 'pop', 'slide', 'hop', 'sag']))
  })

  it('has the nearest creature answer a landing in its own way', () => {
    const bySeal = landed([], { ...ICE, vy: 500 })
    play(bySeal, 0.9)
    expect(bySeal.toy.show().nearSeal.clap).toBeGreaterThan(0)
    const bySea = landed([], { ...OVER_SEA, vy: 150 })
    play(bySea, 0.7)
    expect(bySea.toy.show().whale.wide).toBeGreaterThan(0)
  })

  it('plays a delivery for 6 to 9 seconds, and saves who is eating which fish in the step the penguin comes to rest', () => {
    for (const [who, put] of FRIENDS) for (const fish of FISHES) {
      const played = landed(['fish'], { ...put, fish })
      expect(played.save.eating, `${fish} to the ${who}`).toEqual({ who, fish })
      expect(played.toy.takeSave()).toBe(true)
      const length = sceneLength(played)
      expect(length, `${fish} to the ${who}`).toBeGreaterThanOrEqual(6)
      expect(length, `${fish} to the ${who}`).toBeLessThanOrEqual(9)
      // Saved once, at the start, and nothing more by the scene's end.
      expect(played.toy.takeSave()).toBe(false)
      expect(played.save.eating).toEqual({ who, fish })
      expect(played.toy.show().meal[who]).toMatchObject({ fish, act: 'eat' })
    }
  })

  it('shows the fish taken off the rod, then answered, then eaten: what is saved at once is seen beat by beat', () => {
    const played = landed(['fish'], { ...AT_WALRUS, vy: 20, fish: 'frozen' })
    expect(played.toy.show().meal.walrus).toBeNull()
    expect(played.toy.show().pilot.fish).toBe('frozen')
    const acts: string[] = []
    while (played.toy.phase === 'scene') {
      play(played, 1 / 60)
      const meal = played.toy.show().meal.walrus
      if (meal && acts[acts.length - 1] !== meal.act) acts.push(meal.act)
      if (meal && played.toy.phase === 'scene') expect(played.toy.show().pilot.fish).toBeNull()
    }
    expect(acts).toEqual(['take', 'react', 'eat'])
  })

  it('gives each friend its own answer to each fish, nine in all, none like another', () => {
    const answers = new Map<string, string>()
    for (const [who, put] of FRIENDS) for (const fish of FISHES) {
      const played = landed(['fish'], { ...put, fish })
      const from = played.heard.length
      // The longest answer is over two seconds after the fish is in the friend's hand.
      play(played, TAKE.at + TAKE.lasts + 2.1)
      const heard = heardFrom(played, from).filter((name) => !['wetslap', 'take', 'muffled', 'squawk', 'honk'].includes(name)).join(' ')
      expect(heard.length, `${fish} to the ${who}`).toBeGreaterThan(0)
      expect(answers.get(heard), `${fish} to the ${who} sounds like ${answers.get(heard)}`).toBeUndefined()
      answers.set(heard, `${fish} to the ${who}`)
    }
    expect(answers.size).toBe(9)
    expect([...answers.keys()]).toEqual(expect.arrayContaining(['gulp peep', 'slip slip slip peep', 'lick stuck', 'dab mm', 'wring groan', 'munch munch munch', 'clack', 'slurp', 'rap rap hammer hammer']))
  })

  it('answers a penguin that arrives without a fish in 3 to 5 seconds, each friend in its own way, and saves nothing', () => {
    const chick = landed([], { ...AT_CHICK, vy: 20 }), walrus = landed([], { ...AT_WALRUS, vy: 20 }), puffin = landed([], { ...AT_PUFFIN, vx: 100 })
    const seen = { plate: 0, head: false, blown: 0, sigh: 0, close: 0 }
    for (const played of [chick, walrus, puffin]) {
      expect(played.toy.takeSave()).toBe(false)
      const from = played.heard.length
      while (played.toy.phase === 'scene') {
        play(played, 1 / 60)
        const frame = played.toy.show()
        seen.plate = Math.max(seen.plate, frame.chick.plate)
        seen.head ||= frame.chick.ride === 'head'
        seen.blown = Math.max(seen.blown, frame.pilot.blown)
        seen.sigh = Math.max(seen.sigh, frame.walrus.sigh)
        seen.close = Math.max(seen.close, frame.puffin.close)
      }
      const length = (played.heard.length - from) / 60
      expect(length).toBeGreaterThanOrEqual(3)
      expect(length).toBeLessThanOrEqual(5)
      expect(played.save.eating).toBeNull()
      expect(played.toy.takeSave()).toBe(false)
      expect(played.toy.show().chick).toMatchObject({ ride: null, plate: 0 })
      expect(played.toy.show().puffin.close).toBe(0)
    }
    expect(heardFrom(chick)).toEqual(expect.arrayContaining(['plateflip', 'peep']))
    expect(heardFrom(walrus)).toContain('harrumph')
    expect(heardFrom(puffin)).toContain('lens')
    expect(seen.plate).toBeGreaterThan(0.9)
    expect(seen.head).toBe(true)
    expect(seen.blown).toBe(1)
    expect(seen.sigh).toBeGreaterThan(0.5)
    expect(seen.close).toBe(1)
  })

  it('keeps the two secrets: pencils and a shaving off the paper, and the chick on the feet of a penguin stuck before its door', () => {
    for (const put of [{ x: 1232, y: 300, vx: 300 }, { x: -52, y: 300, vx: -300 }]) {
      const off = landed([], put)
      let walked = 0
      while (off.toy.phase === 'scene') {
        play(off, 1 / 60)
        const frame = off.toy.show()
        if (frame.pilot.pose === 'walk') { walked += 1; expect(frame.pilot.shaving).toBe(true) }
      }
      expect(heardFrom(off).filter((name) => name === 'pencil').length).toBe(3)
      expect(walked).toBeGreaterThan(40)
      // The shaving stays on its head in the pouch, and is left behind in the air at the next release.
      expect(off.toy.show().pilot.shaving).toBe(true)
      pullAndLetGo(off, pullAt(40, 150))
      play(off, SNAP + 1 / 60)
      expect(off.toy.show().pilot.shaving).toBe(false)
    }
    for (const parts of [[], ['fish']] as Part[][]) {
      const stuck = landed(parts, { ...AT_CHICK, y: AT_CHICK.y - 40, vy: 500 })
      expect(stuck.toy.show().pilot.pose).toBe('beak')
      let onFeet = 0
      while (stuck.toy.phase === 'scene') {
        play(stuck, 1 / 60)
        if (stuck.toy.show().chick.ride === 'feet') onFeet += 1
        expect(stuck.toy.show().chick.ride).not.toBe('head')
      }
      expect(onFeet).toBeGreaterThan(30)
    }
  })

  it('ends at any touch with the penguin in the pouch and every beat landed, and is silent from that frame', () => {
    const scenes: [readonly Part[], Partial<Body>][] = [[[], { ...ICE, vy: 500 }], [['fish'], { ...AT_CHICK, vy: 20, fish: 'wet' }], [[], { ...AT_PUFFIN, vx: 100 }], [[], { ...OVER_SEA, vy: 150 }], [['springs'], { ...OVER(1), vx: 30, vy: 300 }], [[], { x: 1232, y: 300, vx: 300 }]]
    for (const [parts, put] of scenes) for (const wait of [0, 0.3, 1, 1.6, 2.4, 3.2]) {
      const played = landed(parts, put)
      play(played, wait)
      if (played.toy.phase !== 'scene') continue
      played.toy.takeSounds()
      played.toy.press(BARE_PAPER.x, BARE_PAPER.y)
      // Only the touch's own answer is heard, in the call and for good.
      expect(names(played.toy.takeSounds())).toEqual(['dot'])
      expect(played.toy.playing).toBe(false)
      expect(played.toy.phase).toBe('loaded')
      const frame = played.toy.show()
      expect(frame.pilot).toMatchObject({ pose: 'seat', behind: false, waggle: 0, shiver: 0, umbrella: 'none' })
      expect(frame.chick).toMatchObject({ ride: null, plate: 0 })
      expect(frame.puffin.close).toBe(0)
      if (played.save.eating) expect(frame.meal[played.save.eating.who]).toMatchObject({ act: 'eat' })
      played.toy.tap()
      const from = played.heard.length
      play(played, 4)
      expect(heardFrom(played, from)).toEqual(['rub'])
      expect(played.toy.phase).toBe('loaded')
    }
  })

  it('makes the touch that ends a scene an ordinary touch: on the pouch it is the next pull', () => {
    const played = landed([], { ...ICE, vy: 500 })
    play(played, 1)
    played.toy.takeSounds()
    played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    expect(played.toy.phase).toBe('pull')
    expect(names(played.toy.takeSounds())).toEqual(['grip'])
    const other = landed([], { ...ICE, vy: 500 })
    other.toy.takeSounds()
    other.toy.press(WALRUS.x, WALRUS.y)
    expect(other.toy.phase).toBe('loaded')
    expect(names(other.toy.takeSounds())).toEqual(['harrumph'])
  })

  it('leaves a friend eating for as long as the child likes, and has it swallow at the next press on the pouch', () => {
    const played = landed(['fish'], { ...AT_CHICK, vy: 20 })
    playHome(played)
    play(played, 30)
    expect(played.save.eating).toEqual({ who: 'chick', fish: 'fresh' })
    expect(played.toy.show().meal.chick).toMatchObject({ act: 'eat' })
    // A press anywhere else leaves it eating.
    played.toy.press(WALRUS.x, WALRUS.y)
    played.toy.tap()
    expect(played.save.eating).not.toBeNull()
    played.toy.takeSounds()
    played.toy.takeSave()
    played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    expect(names(played.toy.takeSounds())).toEqual(['grip', 'gulp'])
    expect(played.save.eating).toBeNull()
    expect(played.toy.takeSave()).toBe(true)
    expect(played.toy.show().meal.chick).toMatchObject({ act: 'gulp' })
    played.toy.tap()
    play(played, 0.5)
    expect(played.toy.show().meal.chick).toBeNull()
  })

  it('never runs out of fish: the rod a seal or a friend emptied is baited again in the pouch, fresh', () => {
    const bySeal = staged(['fish'], { ...OVER(0), vx: 30, vy: 300 })
    playHome(bySeal)
    expect(bySeal.toy.show().pilot.fish).toBe('fresh')
    const byFriend = landed(['fish'], { ...AT_WALRUS, vy: 20, fish: 'frozen' })
    playHome(byFriend)
    expect(byFriend.toy.show().pilot.fish).toBe('fresh')
    // A fish nobody ate stays as it is for the next flight: frozen stays frozen.
    const kept = landed(['fish'], { ...OVER_DRIFT, vy: 250 })
    playHome(kept)
    expect(kept.toy.show().pilot.fish).toBe('frozen')
    pullAndLetGo(kept, pullAt(40, 150))
    play(kept, SNAP + 1 / 60)
    expect(kept.toy.body!.fish).toBe('frozen')
  })
})

describe('the flight, the landing and the way back', () => {
  it('brings the penguin home to the pouch after every kind of flight, and then waits', () => {
    const pulls = [pullAt(85, 150), pullAt(25, 190), pullAt(35, 190), pullAt(65, 190), pullAt(60, 170), { x: CATAPULT.fork.x + 55, y: CATAPULT.fork.y + 40 }, pullAt(0, 150), pullAt(-60, 120)]
    for (const pull of pulls) {
      const played = newToy()
      pullAndLetGo(played, pull)
      expect(playHome(played), `pull ${pull.x}, ${pull.y}`).toBe(true)
      expect(played.toy.show().pilot).toMatchObject({ pose: 'seat', behind: false })
      // Loaded, and it stays loaded: nothing fires by itself, and once the pouch has settled nothing sounds.
      play(played, 3)
      const from = played.heard.length
      play(played, 20)
      expect(played.toy.phase).toBe('loaded')
      expect(heardFrom(played, from)).toEqual([])
    }
  })

  it('draws the line of the flight, keeps the one before paler, and rubs out the one before that whatever it reached', () => {
    const played = newToy()
    pullAndLetGo(played, pullAt(80, 120))
    playHome(played)
    const first = [...played.toy.show().line]
    expect(first.length).toBeGreaterThan(20)
    expect(played.toy.show().older).toEqual([])
    pullAndLetGo(played, pullAt(60, 200))
    playHome(played)
    const second = [...played.toy.show().line]
    expect(played.toy.show().older).toEqual(first)
    // The longest flight of the three is the one rubbed away: a line is kept for being the latest.
    expect(first.length).toBeGreaterThan(second.length)
    pullAndLetGo(played, pullAt(75, 110))
    expect(played.toy.show().older).toEqual(second)
    expect(played.toy.show().line).toEqual([])
  })

  it('does not take a touch on the pouch while the penguin is in the air', () => {
    const played = newToy()
    pullAndLetGo(played, pullAt(60, 190))
    play(played, 0.5)
    expect(played.toy.phase).toBe('fly')
    played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    expect(played.toy.phase).toBe('fly')
  })

  it('plays the same flight, sounds and frames for the same seed and the same touches', () => {
    const run = (): { heard: unknown; frame: unknown } => {
      const played = newToy(7)
      bolt(played, 'springs')
      pullAndLetGo(played, pullAt(60, 170))
      play(played, 6)
      played.toy.press(SEALS[0].x, SEALS[0].y - 30)
      play(played, 1)
      return { heard: played.heard, frame: still(played.toy.show()) }
    }
    expect(run()).toEqual(run())
  })
})

describe('everything else on the page', () => {
  const places: [Thing, number, number, string][] = [
    ['nearSeal', SEALS[0].x, SEALS[0].y - 30, 'bark'],
    ['farSeal', SEALS[1].x, SEALS[1].y - 28, 'snort'],
    ['chick', CHICK.x, CHICK.y, 'peep'],
    ['igloo', IGLOO.x + 30, IGLOO.y - 44, 'knock'],
    ['walrus', WALRUS.x, WALRUS.y, 'harrumph'],
    ['berg', BERG.x0 + 20, BERG.y0 + 200, 'tink'],
    ['puffin', PUFFIN.x, PUFFIN.y, 'krr'],
    ['balloon', BALLOON.x, BALLOON.y - 20, 'bomp'],
    ['whaleEye', WHALE_EYE.x, WHALE_EYE.y, 'moan'],
    ['whale', WHALE.x, SEA_Y + 6, 'puff'],
    ['whaleBack', 740, 760, 'rumble'],
    ['whaleTail', WHALE_TAIL.x - 40, WHALE_TAIL.y, 'swish'],
    ['cloud', CLOUD[2].x, CLOUD[2].y, 'breath'],
    ['crate', KIT.x1 + 3, KIT.y1 - 20, 'rattle'],
    ['drift', DRIFT.x + 20, DRIFT.y - 30, 'pat'],
    ['paper', BARE_PAPER.x, BARE_PAPER.y, 'dot'],
  ]

  it('answers a press as itself, in the call that brings the finger down, each with its own sound', () => {
    expect(new Set(places.map((place) => place[3])).size).toBe(places.length)
    for (const [thing, x, y, sound] of places) {
      expect(thingAt(x, y), `the place for ${thing}`).toBe(thing)
      const played = newToy()
      const before = still(played.toy.show())
      played.toy.press(x, y)
      expect(names(played.toy.takeSounds()), thing).toEqual([sound])
      // Something on the page has changed by the next frame, and nothing about the flight or the save.
      played.toy.step(1 / 60)
      const after = still(played.toy.show())
      expect(after, thing).not.toEqual({ ...before, t: after.t })
      expect(played.toy.phase).toBe('loaded')
      expect(played.toy.takeSave()).toBe(false)
      expect(played.save).toEqual(freshSave(null))
    }
  })

  it('answers the same press the same way while a flight is in the air, and changes nothing in the flight', () => {
    for (const [thing, x, y, sound] of places) {
      const pressed = staged([], { ...OVER_CLOUD, y: 60, vy: -80 }), alone = staged([], { ...OVER_CLOUD, y: 60, vy: -80 })
      pressed.toy.press(x, y)
      expect(names(pressed.toy.takeSounds()), thing).toEqual([sound])
      pressed.toy.tap()
      play(pressed, 0.4)
      play(alone, 0.4)
      expect({ ...pressed.toy.body }, thing).toEqual({ ...alone.toy.body })
    }
  })

  it('rubs a dot on bare paper out a moment later, with its own sound in the frame it is rubbed', () => {
    const played = newToy()
    played.toy.press(BARE_PAPER.x, BARE_PAPER.y)
    played.toy.takeSounds()
    play(played, 2)
    expect(heardAt(played, 'rub')).toBeGreaterThan(0.5)
    play(played, 3)
    expect(played.toy.show().crumbs).toEqual([])
  })

  it('turns every creature to the flight, to the finger, and otherwise to the penguin in its pouch', () => {
    const played = newToy()
    expect(played.toy.show().focus).toEqual({ x: CATAPULT.rest.x, y: CATAPULT.rest.y })
    played.toy.press(700, 300)
    expect(played.toy.show().focus).toEqual({ x: 700, y: 300 })
    played.toy.cancel()
    pullAndLetGo(played, pullAt(60, 190))
    play(played, 0.6)
    const frame = played.toy.show()
    expect(frame.focus).toEqual({ x: frame.pilot.x, y: frame.pilot.y })
  })
})

describe('the idle ladder', () => {
  it('glows on the penguin and then shows a pull that eases back and throws nothing', () => {
    const played = newToy()
    const ladder = new IdleLadder(0)
    let glowed = false, shown = false, furthest = 0
    for (let t = 0; t < IDLE_BEFORE_DEMO + 3.5; t += 1 / 60) {
      const guidance = ladder.update(t)
      played.toy.step(1 / 60, guidance)
      const frame = played.toy.show(guidance)
      if (t > IDLE_BEFORE_GLOW + 0.5 && frame.glow > 0) glowed = true
      if (frame.hand) {
        shown = true
        furthest = Math.max(furthest, Math.hypot(frame.pouch.x - CATAPULT.rest.x, frame.pouch.y - CATAPULT.rest.y))
      }
      expect(played.toy.phase).toBe('loaded')
      expect(played.toy.takeSounds()).toEqual([])
      expect(played.toy.takeSave()).toBe(false)
    }
    expect(glowed).toBe(true)
    expect(shown).toBe(true)
    // The hand takes the pouch a good way back with it, and the pouch is home again when it has gone.
    expect(furthest).toBeGreaterThan(40)
    play(played, 2)
    expect(played.toy.show().pouch.x).toBeCloseTo(CATAPULT.rest.x, 0)
    expect(played.save.last).toBeNull()
  })

  it('shows no glow and no hand while the penguin is in hand, in the air or on its way back', () => {
    const played = newToy()
    const guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
    played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    expect(played.toy.show(guidance)).toMatchObject({ glow: 0, hand: null })
    played.toy.drag(pullAt(85, 150).x, pullAt(85, 150).y)
    played.toy.release()
    while (played.toy.phase !== 'loaded') {
      played.toy.step(1 / 60, guidance)
      if ((played.toy.phase as string) !== 'loaded') expect(played.toy.show(guidance)).toMatchObject({ glow: 0, hand: null })
    }
  })
})

/** What the Mount does when the game is put away: the touch in progress is taken away, and the game is made again from what was just saved. */
function putAway(played: Played): Played {
  played.toy.cancel()
  return { toy: found(serialize(played.save), null, 1), save: played.save, heard: [] }
}

/** What a later visit finds: the same record, through storage and back. */
function closedAndOpened(played: Played): Played {
  const stored: unknown = JSON.parse(JSON.stringify(serialize(played.save)))
  return { toy: found(stored, null, 1), save: played.save, heard: [] }
}

/** Every state the game can be put away in, each with what must be found. */
function everyState(): [string, Played, Partial<Save>][] {
  const states: [string, Played, Partial<Save>][] = []
  const pulled = newToy()
  pulled.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
  pulled.toy.drag(pullAt(40, 170).x, pullAt(40, 170).y)
  play(pulled, 0.3)
  states.push(['the pouch pulled', pulled, { bolted: [], last: null, eating: null }])

  const snapping = newToy()
  pullAndLetGo(snapping, pullAt(40, 170))
  play(snapping, SNAP / 2)
  const last = { ...snapping.save.last! }
  states.push(['the bands snapping', snapping, { last }])

  for (const wait of [0.1, 0.8]) {
    const flying = staged(['rocket', 'wings'], { ...OVER_CLOUD, vy: 150, turn: DOWN }, true)
    play(flying, wait)
    states.push([`in flight for ${wait} s, the rocket burning in the cloud`, flying, { bolted: ['rocket', 'wings'] }])
  }
  for (const [name, parts, put] of LANDINGS) for (const wait of [0, 0.7, 2.3, 3.4]) {
    const scene = landed(parts, put)
    play(scene, wait)
    states.push([`${wait} s after landing ${name}`, scene, { bolted: [...parts], eating: null }])
  }
  for (const [who, put] of FRIENDS) {
    for (const wait of [0, 1, 2.5]) {
      const visit = landed([], put)
      play(visit, wait)
      states.push([`${wait} s into a visit to the ${who} without a fish`, visit, { eating: null }])
    }
    for (const fish of FISHES) for (const wait of [0, 1, 2, 4, 6]) {
      const delivery = landed(['fish'], { ...put, fish })
      play(delivery, wait)
      states.push([`${wait} s into a ${fish} fish for the ${who}`, delivery, { bolted: ['fish'], eating: { who, fish } }])
    }
    const eating = landed(['fish'], { ...put, fish: 'wet' })
    playHome(eating)
    play(eating, 5)
    states.push([`the ${who} eating`, eating, { eating: { who, fish: 'wet' } }])
    const gulped = landed(['fish'], { ...put, fish: 'wet' })
    playHome(gulped)
    gulped.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    play(gulped, 0.1)
    states.push([`the ${who} swallowing as the pouch is taken`, gulped, { eating: null }])
  }
  for (const along of [0, 0.5, 0.9]) {
    const bolting = newToy()
    bolt(bolting, 'umbrella')
    const at = slotAt('springs')
    bolting.toy.press(at.x, at.y)
    bolting.toy.tap()
    play(bolting, BOLTING * along)
    states.push([`a part ${along} of its way to the penguin`, bolting, { bolted: ['umbrella', 'springs'] }])
    const third = newToy()
    bolt(third, 'umbrella')
    bolt(third, 'springs')
    const fish = slotAt('fish')
    third.toy.press(fish.x, fish.y)
    play(third, BOLTING * (along + 0.6))
    states.push([`a third part on and the first ${along} of its way back`, third, { bolted: ['springs', 'fish'] }])
    const off = newToy()
    bolt(off, 'balloon')
    const balloon = slotAt('balloon')
    off.toy.press(balloon.x, balloon.y)
    play(off, 0.3 * along)
    states.push([`a part ${along} of its way back to the kit`, off, { bolted: [] }])
  }
  return states
}

describe('found as left', () => {
  it('saves only at a release, a part bolted or taken off, a fish delivered and a fish swallowed', () => {
    const played = newToy()
    played.toy.press(SEALS[0].x, SEALS[0].y - 30)
    played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
    played.toy.drag(pullAt(30, 120).x, pullAt(30, 120).y)
    play(played, 1)
    expect(played.toy.takeSave()).toBe(false)
    played.toy.release()
    expect(played.toy.takeSave()).toBe(true)
    playHome(played)
    play(played, 5)
    expect(played.toy.takeSave()).toBe(false)
  })

  it('is the same game put away and returned to as saved and loaded, from every state there is', () => {
    const states = everyState()
    expect(states.length).toBeGreaterThan(100)
    for (const [name, played, holds] of states) {
      const parked = putAway(played), loaded = closedAndOpened(played)
      // Taking the touch away for the child saved nothing new and flung nothing.
      expect(serialize(played.save), name).toMatchObject(holds)
      expect(still(parked.toy.show()), name).toEqual(still(loaded.toy.show()))
      for (const again of [parked, loaded]) {
        const frame = again.toy.show()
        expect(again.toy.phase, name).toBe('loaded')
        expect(again.toy.playing, name).toBe(false)
        expect(again.toy.body, name).toBeNull()
        expect(again.toy.takeSounds(), name).toEqual([])
        expect(again.toy.takeSave(), name).toBe(false)
        expect(frame.pilot, name).toMatchObject({ pose: 'seat', behind: false, flame: played.save.bolted.includes('rocket') ? PILOT_FLAME : 0, waggle: 0, shiver: 0, misted: false, sooty: false, shaving: false, soaked: false, dewy: false })
        expect(frame.pouch, name).toEqual({ x: CATAPULT.rest.x, y: CATAPULT.rest.y })
        expect([frame.moving, frame.line, frame.older, frame.holes, frame.crumbs, frame.furrow, frame.tips], name).toEqual([[], [], [], [], [], [], []])
        // The parts that were bolted are on, the ring is where the pouch was last let go, and who was eating is eating.
        for (const part of PARTS) expect(onPilot(frame, part), `${name}: ${part}`).toBe(played.save.bolted.includes(part))
        if (played.save.last) expect(frame.ring, name).toMatchObject({ x: CATAPULT.rest.x + played.save.last.x, y: CATAPULT.rest.y + played.save.last.y })
        else expect(frame.ring, name).toBeNull()
        for (const who of ['chick', 'walrus', 'puffin'] as const) expect(frame.meal[who], name).toEqual(played.save.eating?.who === who ? expect.objectContaining({ fish: played.save.eating.fish, act: 'eat' }) : null)
        if (frame.pilot.rod) expect(frame.pilot.fish, name).toBe('fresh')
        // No timer is full on load: nobody is in the middle of anything.
        expect(frame.nearSeal, name).toMatchObject({ clap: 0, bark: 0, singed: 0, chew: 0, hold: 0, flat: 0, squash: 0 })
        expect(frame.farSeal, name).toMatchObject({ snort: 0, singed: 0, chew: 0, hold: 0, flat: 0, awake: 0, squash: 0 })
        expect(frame.chick, name).toMatchObject({ hop: 0, peep: 0, ride: null, plate: 0 })
        expect(frame.walrus.sigh, name).toBe(0)
        expect(frame.puffin, name).toMatchObject({ duck: 0, close: 0 })
        expect(frame.whale, name).toMatchObject({ blow: 0, wide: 0 })
        expect([frame.slump, frame.igloo, frame.berg, frame.balloon, frame.kit.lid, frame.glow, frame.hand, frame.gull], name).toEqual([0, 0, 0, 0, 0, 0, null, null])
      }
      // Nothing plays by itself afterwards: no sound, no save, and the catapult waits for a touch.
      play(parked, 3)
      play(loaded, 3)
      expect(heardFrom(parked), name).toEqual([])
      expect(parked.toy.phase, name).toBe('loaded')
      expect(parked.toy.takeSave(), name).toBe(false)
      expect(still(parked.toy.show()), name).toEqual(still(loaded.toy.show()))
    }
  })

  it('starts nothing and sounds nothing on load, whatever was saved and whatever the age', () => {
    const saves: unknown[] = [null, undefined, 'x', { v: 1 }, { v: 1, bolted: ['rocket', 'fish'], last: { x: -80, y: 60 }, eating: { who: 'puffin', fish: 'frozen' } }, { v: 2, bolted: ['rocket'] }]
    for (const raw of saves) for (const age of [null, 2, 8, 12, 40]) {
      const toy = found(raw, age, 1)
      const played: Played = { toy, save: toy.save, heard: [] }
      expect(toy.takeSounds()).toEqual([])
      play(played, 6)
      expect(heardFrom(played)).toEqual([])
      expect(toy.phase).toBe('loaded')
      expect(toy.body).toBeNull()
      expect(toy.takeSave()).toBe(false)
      expect(toy.show().pilot.pose).toBe('seat')
    }
  })

  it('opens a first visit the same at every age and with none: the bare penguin, the whole kit, clean paper', () => {
    const first = still(found(null, null, 1).show())
    for (const age of [0, 2, 7, 8, 10, 12, 13, 99]) expect(still(found(null, age, 1).show())).toEqual(first)
    expect(first.ring).toBeNull()
    expect(first.kit.out).toEqual({ rocket: false, wings: false, umbrella: false, balloon: false, springs: false, fish: false })
    expect(first.meal).toEqual({ chick: null, walrus: null, puffin: null })
    // And a saved game wins over the age it is opened at.
    const saved = { v: 1, position: 'kit', finished: false, bolted: ['wings'], last: { x: -40, y: 30 }, eating: null }
    for (const age of [null, 3, 12]) expect(found(saved, age, 1).save).toMatchObject({ bolted: ['wings'], last: { x: -40, y: 30 } })
  })

  it('changes nothing while no time is played: a parked toy is a still picture', () => {
    const played = newToy()
    pullAndLetGo(played, pullAt(60, 190))
    play(played, 0.7)
    const frame = still(played.toy.show())
    expect(still(played.toy.show())).toEqual(frame)
    played.toy.step(0)
    expect(still(played.toy.show())).toEqual(frame)
    expect(played.toy.takeSounds()).toEqual([])
  })

  it('keeps nothing for the child beyond what the sheet lists: no count, no best, no tally of flights or fish', () => {
    const played = newToy()
    bolt(played, 'fish')
    for (const pull of [pullAt(40, 170), pullAt(60, 190), pullAt(20, 120)]) {
      pullAndLetGo(played, pull)
      playHome(played)
    }
    expect(Object.keys(serialize(played.save)).sort()).toEqual(['bolted', 'eating', 'finished', 'last', 'position', 'rod', 'v'])
    expect(JSON.stringify(serialize(played.save)).length).toBeLessThan(400)
  })
})
