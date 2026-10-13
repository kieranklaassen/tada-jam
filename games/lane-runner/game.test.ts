import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { SLACK, lanePixels, onGlass, project, type Box } from './camera'
import { Game, type Sink } from './game'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW } from './guidance'
import { SLIDE, loadShown } from './guide'
import { LONGEST, SHORTEST } from './handover'
import { ForgivingTouch } from './input'
import { RUN_SPEED, type LapEvent } from './lap'
import { LOADS, TAKEN_WITH, serializeLap, type LapState, type Load } from './lapState'
import { CORNER } from './overlay'
import { DIVE_ARMS } from './motion'
import { GATE_FLOWN, GATE_SECONDS, KEBAB_AT, OBSTACLE_FIGURES, SHELF_BEFORE, SHELF_CLEAR, SHELF_HEIGHT, SHELF_SLOTS, SKIN_AT, thornLane, type Fixed } from './props'
import { MIME_DUCK, MIME_HOP, SLOP_FALLS, SLOP_IN_FRONT, SLOP_SPREADS } from './stage'
import { CLEAR, LANES, PLACES, SHELF_REACH, STEP, ZONES, laneX, offset, type Lane } from './trail'
import { STAND } from './view/heights'
import { Steer, reachFor, type Command } from './steer'
import { everyVoice, notesFor } from './voices'

// The whole game with no browser: what a finger does, what sounds and when,
// what is saved, and what is found when the game is put away and opened
// again. Each test holds one lesson of the games before this one.

const W = 1180, H = 820
const DT = 1 / 60
/** A place on the trail a little in front of the fox, where no load and nobody who waits is. */
const TRAIL = { x: 600, y: 640 }

type Rig = {
  game: Game
  /** The frame each voice sounded on, and its notes. */
  played: { frame: number; notes: readonly Note[] }[]
  /** The frame each motion started on: what the lap did, and each step of the hand-over. */
  moved: { frame: number; what: string; event?: LapEvent }[]
  hushes: number[]
  saves: { frame: number; urgent: boolean; state: LapState }[]
  frame: number
  /** Plays this many seconds of frames. */
  run(seconds: number): void
  down(x?: number, y?: number): void
  up(): void
  age: number | null
}

function rig(saved: unknown = null, age: number | null = null): Rig {
  const out = { played: [], moved: [], hushes: [], saves: [], frame: 0, age } as unknown as Rig
  const sink: Sink = {
    play: (notes) => out.played.push({ frame: out.frame, notes: notes.slice() }),
    hush: () => out.hushes.push(out.frame),
    save: (state, urgent) => out.saves.push({ frame: out.frame, urgent, state: serializeLap(state) }),
  }
  const game = new Game(saved, () => out.age, 1, 48, sink)
  out.game = game
  let clock = 0, ms = 0
  // Whatever stage the game has, its motions are written down as they start.
  const watch = (): void => {
    const stage = game.stage as unknown as { watched?: boolean; on: (event: LapEvent, lap: unknown) => void; step: (who: string, step: string, lap: unknown) => void }
    if (stage.watched) return
    stage.watched = true
    const on = stage.on.bind(stage), step = stage.step.bind(stage)
    stage.on = (event, lap) => {
      out.moved.push({ frame: out.frame, what: event.type, event })
      on(event, lap)
    }
    stage.step = (who, name, lap) => {
      out.moved.push({ frame: out.frame, what: `${who}.${name}` })
      step(who, name, lap)
    }
  }
  watch()
  out.run = (seconds) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      out.frame += 1
      clock += DT
      ms += DT * 1000
      watch()
      game.frame(DT, clock)
    }
  }
  out.down = (x = TRAIL.x, y = TRAIL.y) => {
    watch()
    game.press(x, y, W, H, ms)
  }
  out.up = () => game.lift()
  return out
}

function save(fields: Record<string, unknown> = {}): Record<string, unknown> {
  return { v: 1, position: 'pond', finished: false, ...fields }
}
/** A fox standing at `at` in `lane` with `load` in its hands. */
function carrying(at: number, lane: Lane, load: Load, more: Record<string, unknown> = {}): Record<string, unknown> {
  return save({ at, lane, load, lies: null, left: TAKEN_WITH[load], ...more })
}

/** The middle of a thing on the glass, by its name on the stage. */
function middleOf(game: Game, key: string, width = W, height = H): { x: number; y: number } {
  const item = game.stage.items.find((one) => one.key === key)!
  const box = game.stage.boxOf(item, game.lap.s, { minX: 0, maxX: 0, minY: 0, maxY: 0, z: 0 })
  const rect = onGlass(game.shot(width, height), width, height, box)!
  return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
}

/** Runs the fox in to the hand-over from a little before it, with the finger down, and lifts when it has arrived. */
function arrive(load: Load, more: Record<string, unknown> = {}): Rig {
  const r = rig(load === 'none' ? save({ at: PLACES.handOver - 60, lane: 1 }) : carrying(PLACES.handOver - 60, 1, load, more))
  r.run(0.2)
  r.down()
  for (let i = 0; i < 600 && !r.game.lap.finished; i++) r.run(DT)
  expect(r.game.lap.finished).toBe(true)
  r.up()
  return r
}

/** What shows of a game, to the last plaque: who is where, in what pose. */
function picture(game: Game): { signature: string[]; quads: number[] } {
  const quads: number[] = []
  for (const item of game.stage.items) {
    for (let i = item.from; i < item.to; i++) {
      const quad = game.stage.quads[i]
      quads.push(quad.x, quad.y, quad.z, quad.ax, quad.ay, quad.bx, quad.by)
    }
  }
  return { signature: game.stage.signature(), quads }
}

describe('one clock for sight and sound', () => {
  it('sounds every voice on the frame the motion it belongs to starts, through a whole lap with every load', () => {
    for (const load of ['none', ...LOADS] as Load[]) {
      const r = rig()
      r.run(0.5)
      if (load !== 'none') {
        const at = middleOf(r.game, `load-${load}`)
        r.down(at.x, at.y)
        r.up()
      }
      r.down()
      // The finger stays down all the way round, and now and then it slides or flicks.
      for (let i = 0; i < 60 * 80 && !r.game.lap.finished; i++) {
        r.run(DT)
        if (i % 97 === 40) r.game.move(TRAIL.x + ((i % 3) - 1) * 90, TRAIL.y, W, H, i * 16)
        if (i % 211 === 100) r.game.move(TRAIL.x, TRAIL.y - 120, W, H, i * 16)
        if (i % 211 === 104) r.game.move(TRAIL.x, TRAIL.y, W, H, i * 16)
      }
      expect(r.game.lap.finished, load).toBe(true)
      r.up()
      r.run(LONGEST + 1)
      const started = new Set(r.moved.map((one) => one.frame))
      expect(r.played.length, load).toBeGreaterThan(100)
      for (const voice of r.played) expect(started.has(voice.frame), `${load}: a voice at frame ${voice.frame} with no motion`).toBe(true)
      // And the other way: whatever the lap did that has a sound was heard on its own frame.
      const heard = new Set(r.played.map((one) => one.frame))
      for (const one of r.moved) if (one.event && notesFor(one.event).length > 0) expect(heard.has(one.frame), `${load}: ${one.what} unheard`).toBe(true)
      expect(r.moved.some((one) => one.what.includes('.')), load).toBe(true)
    }
  })

  it('hides no delay inside a voice: every note starts when its voice does', () => {
    const voices = everyVoice()
    expect(voices.length).toBeGreaterThan(100)
    for (const voice of voices) for (const note of voice.notes) expect((note as Note & { delay?: number }).delay ?? 0, voice.name).toBe(0)
  })

  it('is heard to land on the frame the fox lands, every time', () => {
    const r = rig(save({ at: 60, lane: 1 }))
    r.down()
    let landings = 0
    for (let i = 0; i < 600; i++) {
      if (i % 100 === 20) r.game.move(TRAIL.x, TRAIL.y - 120, W, H, i * 16)
      if (i % 100 === 24) r.game.move(TRAIL.x, TRAIL.y, W, H, i * 16)
      const before = r.game.lap.air
      r.run(DT)
      if (before && !r.game.lap.air && !r.game.lap.act) {
        landings += 1
        expect(r.moved.some((one) => one.frame === r.frame && one.what === 'land')).toBe(true)
        expect(r.played.some((one) => one.frame === r.frame)).toBe(true)
        expect(r.game.lap.y).toBe(0)
      }
    }
    expect(landings).toBeGreaterThanOrEqual(1)
  })
})

describe('the hand-over', () => {
  it('lasts six to nine seconds for every load and for empty hands, and saves its outcome on the frame it begins', () => {
    for (const load of ['none', ...LOADS] as Load[]) {
      const r = arrive(load)
      const began = r.frame
      expect(r.saves.at(-1)!.state.finished, load).toBe(true)
      expect(r.saves.at(-1)!.urgent, load).toBe(true)
      let frames = 0
      while (r.game.sceneRunning && frames < 60 * 20) {
        r.run(DT)
        frames += 1
      }
      expect(frames * DT, load).toBeGreaterThanOrEqual(SHORTEST - 0.1)
      expect(frames * DT, load).toBeLessThanOrEqual(LONGEST + 0.1)
      // Nothing was saved again and nothing begins by itself.
      r.run(5)
      expect(r.saves.filter((one) => one.frame > began).length, load).toBe(0)
      expect(r.game.lap.finished, load).toBe(true)
    }
  })

  it('is ended by a touch in silence and stillness from that frame, whatever was half done, and the touch does nothing else', () => {
    // Every load, empty hands, and the owl left on the branch, which its mother flies off to fetch.
    const arrivals: [string, () => Rig][] = [...(['none', ...LOADS] as Load[]).map((load): [string, () => Rig] => [load, () => arrive(load)]), ['the owl on the branch', () => arrive('owl', { lies: 'branch' })]]
    let cut = 0
    for (const [name, make] of arrivals) {
      for (const after of [0.8, 1.5, 2.6, 4, 5.5]) {
        const r = make()
        r.run(after)
        if (!r.game.sceneRunning) continue
        cut += 1
        const sounds = r.played.length, at = r.frame, saved = r.saves.at(-1)!.state
        r.down()
        expect(r.hushes.at(-1), name).toBe(at)
        expect(r.game.sceneRunning, name).toBe(false)
        // On this very frame it is what a load of its save shows, to the last plaque: no motion of the scene is
        // left running, not the mother owl half way to the branch.
        const twin = new Game(JSON.parse(JSON.stringify(saved)), () => null, 1, 48, { play: () => {}, hush: () => {}, save: () => {} })
        twin.frame(0, r.frame * DT)
        twin.park()
        const a = picture(r.game), b = picture(twin)
        expect(a.signature, `${name} after ${after}`).toEqual(b.signature)
        expect(a.quads.length, `${name} after ${after}`).toBe(b.quads.length)
        for (let i = 0; i < a.quads.length; i++) expect(Math.abs(a.quads[i] - b.quads[i]), `${name} after ${after}: plaque value ${i}`).toBeLessThan(1e-6)
        r.up()
        r.run(LONGEST + 2)
        // Not one voice after the touch, nothing saved, and the fox has not left the spot.
        expect(r.played.length, name).toBe(sounds)
        expect(r.saves.at(-1)!.state, name).toEqual(saved)
        expect(r.game.lap.finished, name).toBe(true)
        if (after !== 1.5) continue
        // And everyone is where the scene ends when it is let run.
        const whole = make()
        whole.run(LONGEST + 1.5 + 2 + DT)
        expect(r.game.stage.signature(), name).toEqual(whole.game.stage.signature())
      }
    }
    expect(cut).toBeGreaterThan(30)
  })

  it('is not ended by the finger that ran the fox in, for as long as it stays down', () => {
    const r = rig(carrying(PLACES.handOver - 60, 1, 'cake'))
    r.down()
    for (let i = 0; i < 600 && !r.game.lap.finished; i++) r.run(DT)
    r.run(2)
    expect(r.game.sceneRunning).toBe(true)
    expect(r.hushes.length).toBe(0)
    r.up()
    expect(r.game.sceneRunning).toBe(true)
  })

  it('goes silent when the game is put away, whatever was sounding', () => {
    const r = arrive('balloons')
    r.run(2)
    const hushes = r.hushes.length
    r.game.park()
    expect(r.hushes.length).toBe(hushes + 1)
    const sounds = r.played.length
    r.run(12)
    expect(r.played.length).toBe(sounds)
  })
})

describe('found as left', () => {
  /** Every kind of moment a game can be put away in. */
  const moments: [string, () => Rig][] = [
    ['a first visit, untouched', () => rig()],
    ['a first visit with the ghost hand showing', () => {
      const r = rig()
      r.run(6.5)
      expect(r.game.hint.hand).not.toBeNull()
      return r
    }],
    ...LOADS.map((load): [string, () => Rig] => [`the ${load} just taken`, () => {
      const r = rig()
      r.run(0.3)
      const at = middleOf(r.game, `load-${load}`)
      r.down(at.x, at.y)
      r.run(0.1)
      return r
    }]),
    ...LOADS.map((load): [string, () => Rig] => [`running with the ${load}, finger down`, () => {
      const r = rig(carrying(300, 2, load))
      r.down()
      r.run(0.7)
      return r
    }]),
    ['in the air', () => {
      const r = rig(save({ at: 60, lane: 1 }))
      r.down()
      r.run(0.3)
      r.game.move(TRAIL.x, TRAIL.y - 120, W, H, 300)
      r.run(0.2)
      expect(r.game.lap.air).toBe(true)
      return r
    }],
    ...(['stream', 'branch', 'mud', 'brambles', 'goose', 'log'] as const).flatMap((obstacle) => (['none', ...LOADS] as Load[]).map((load): [string, () => Rig] => [`at the ${obstacle} with ${load}, whatever it is doing to the fox`, () => {
      const r = rig(load === 'none' ? save({ at: ZONES[obstacle].from - 30, lane: 1 }) : carrying(ZONES[obstacle].from - 30, 1, load))
      r.down()
      r.run(1.1)
      return r
    }])),
    // Stopped rolled up where there is no room to stand: under the branch, under the thorns, in the hollow log.
    ...(['branch', 'brambles', 'log'] as const).map((tunnel): [string, () => Rig] => [`rolled up and stopped under the ${tunnel}`, () => {
      const zone = ZONES[tunnel], lane = (tunnel === 'log' ? 0 : zone.blocked.indexOf(true)) as Lane
      const r = rig(save({ at: zone.from - 30, lane }))
      r.down()
      for (let i = 0; i < 200 && r.game.lap.s < zone.from - 6; i++) r.run(DT)
      r.game.lap.tuck()
      for (let i = 0; i < 200 && r.game.lap.s < zone.mid - 2; i++) r.run(DT)
      r.up()
      r.run(0.4)
      expect(r.game.lap.roll, tunnel).toBeGreaterThan(0)
      expect(r.game.lap.act, tunnel).toBeNull()
      const fox = r.game.stage.items.find((item) => item.key === 'fox')!.pose.parts
      expect(fox.ball.show || fox.ballMud.show || fox.ballBurrs.show, tunnel).toBe(true)
      return r
    }]),
    ...(['none', ...LOADS] as Load[]).map((load): [string, () => Rig] => [`the hand-over of ${load} under way`, () => {
      const r = arrive(load)
      r.run(2.5)
      expect(r.game.sceneRunning).toBe(true)
      return r
    }]),
    ...(['none', ...LOADS] as Load[]).map((load): [string, () => Rig] => [`the hand-over of ${load} over`, () => {
      const r = arrive(load)
      r.run(LONGEST + 1)
      expect(r.game.sceneRunning).toBe(false)
      return r
    }]),
    ['a muddy ladder with the goose on it, handed over', () => {
      const r = arrive('ladder', { marks: { muddy: true }, trail: { gooseRides: true } })
      r.run(3)
      return r
    }],
    ['the step to the shelf that begins the next lap', () => {
      const r = arrive('cake')
      r.run(LONGEST + 1)
      r.down()
      r.up()
      r.run(0.1)
      expect(r.game.lap.finished).toBe(false)
      return r
    }],
  ]

  it('is, once put away, exactly what a load of its save shows: every moment, to the last plaque', () => {
    expect(moments.length).toBeGreaterThan(63)
    for (const [name, make] of moments) {
      const r = make()
      r.game.park()
      const saved = r.saves.at(-1)!.state
      expect(r.saves.at(-1)!.urgent, name).toBe(true)
      // The same clock for both, so that what only breathes is at the same breath.
      const twin = new Game(JSON.parse(JSON.stringify(saved)), () => null, 1, 48, { play: () => {}, hush: () => {}, save: () => {} })
      const fresh = picture(twin)
      twin.frame(0, r.frame * DT)
      twin.park()
      const a = picture(r.game), b = picture(twin)
      expect(a.signature, name).toEqual(b.signature)
      expect(a.quads.length, name).toBe(b.quads.length)
      for (let i = 0; i < a.quads.length; i++) expect(Math.abs(a.quads[i] - b.quads[i]), `${name}: plaque value ${i}`).toBeLessThan(1e-6)
      // And a load that is put away at once shows what it showed: nothing in it was still on its way.
      const again = new Game(JSON.parse(JSON.stringify(saved)), () => null, 1, 48, { play: () => {}, hush: () => {}, save: () => {} })
      again.park()
      expect(picture(again).signature, name).toEqual(fresh.signature)
      expect(picture(again).quads, name).toEqual(fresh.quads)
      // The lap itself is at rest, as a load would have it.
      const lap = r.game.lap
      expect([lap.down, lap.air, lap.act, lap.y, lap.vx], name).toEqual([false, false, null, 0, 0])
      // Rolled up only where it cannot stand, which is how a load finds it there too.
      expect(lap.roll > 0, name).toBe(name.startsWith('rolled up'))
      expect(twin.lap.roll > 0, name).toBe(lap.roll > 0)
      expect(lap.events.length, name).toBe(0)
    }
  })

  it('plays and saves nothing on load, and nothing starts by itself, for as long as nobody touches', () => {
    for (const [name, make] of moments) {
      const r = make()
      r.game.park()
      const loaded = rig(JSON.parse(JSON.stringify(r.saves.at(-1)!.state)))
      const before = { s: loaded.game.lap.s, finished: loaded.game.lap.finished, load: loaded.game.lap.load }
      // Longer than the idle ladder takes to show all it has, and than the longest hand-over.
      loaded.run(IDLE_BEFORE_DEMO + DEMO_SECONDS + 4)
      expect(loaded.played.length, name).toBe(0)
      expect(loaded.saves.length, name).toBe(0)
      expect(loaded.moved.length, name).toBe(0)
      expect(loaded.game.sceneRunning, name).toBe(false)
      expect({ s: loaded.game.lap.s, finished: loaded.game.lap.finished, load: loaded.game.lap.load }, name).toEqual(before)
    }
  }, 60_000)

  it('shows nothing of the idle ladder on load until three seconds have gone, and takes the ladder back to the bottom at put-away', () => {
    const r = rig()
    r.run(IDLE_BEFORE_GLOW - 0.1)
    expect(r.game.hint.glow).toBe(0)
    r.run(4)
    expect(r.game.hint.glow).toBeGreaterThan(0)
    expect(r.game.hint.hand).not.toBeNull()
    r.game.park()
    expect(r.game.hint.glow).toBe(0)
    expect(r.game.hint.hand).toBeNull()
    expect(r.game.stage.lights.length).toBe(0)
    expect(r.game.stage.ghost.opacity).toBe(0)
    r.run(IDLE_BEFORE_GLOW - 0.1)
    expect(r.game.hint.glow).toBe(0)
    r.run(0.5)
    expect(r.game.hint.glow).toBeGreaterThan(0)
  })

  it('shows the next move of the four each time the child stops and looks, hops and ducks the fox with the flick, and starts again from the first once put away', () => {
    const r = rig(save({ at: 60, lane: 1 }))
    const watched = (): { slide: number; up: number; down: number; hop: number; duck: number } => {
      const seen = { slide: 0, up: 0, down: 0, hop: 0, duck: 0 }
      // One idle stretch as far as the end of its first showing.
      for (let t = 0; t < IDLE_BEFORE_DEMO + DEMO_SECONDS + 0.2; t += DT) {
        r.run(DT)
        const hint = r.game.hint, fox = r.game.stage.items.find((item) => item.key === 'fox')!
        seen.slide = Math.max(seen.slide, hint.slide)
        seen.up = Math.max(seen.up, hint.flick)
        seen.down = Math.max(seen.down, -hint.flick)
        seen.hop = Math.max(seen.hop, fox.pose.y)
        seen.duck = Math.max(seen.duck, 1 - fox.pose.sy)
      }
      return seen
    }
    const touch = (): void => {
      r.down()
      r.run(0.2)
      r.up()
      r.run(0.1)
    }
    const hold = watched()
    expect(hold).toMatchObject({ slide: 0, up: 0, down: 0 })
    touch()
    expect(watched().slide).toBeGreaterThan(SLIDE * 0.8)
    touch()
    const up = watched()
    expect(up.up).toBeGreaterThan(0.9)
    expect(up.hop).toBeGreaterThan(MIME_HOP * 0.9)
    touch()
    const down = watched()
    expect(down.down).toBeGreaterThan(0.9)
    expect(down.duck).toBeGreaterThan(MIME_DUCK * 0.9)
    // Put away, the turn is forgotten with everything else that is short-lived: the first showing is the plain press again.
    r.game.park()
    expect(watched()).toMatchObject({ slide: 0, up: 0, down: 0 })
  })

  it('shows each move at a pace the game takes: the hand\'s own path, read as a finger\'s, is one lane for the slide, a jump for the flick up and a roll for the flick down, at all three sizes', () => {
    for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180]] as const) {
      const r = rig(save({ at: 300, lane: 1 }))
      const told: Command[][] = []
      for (let turn = 0; turn < 4; turn++) {
        const steer = new Steer(), all: Command[] = []
        let down = false, ms = 0
        for (let t = 0; t < IDLE_BEFORE_DEMO + DEMO_SECONDS + 0.2; t += DT) {
          r.run(DT)
          ms += DT * 1000
          const ghost = r.game.stage.ghost
          // The hand is a finger on the glass for as long as it is pressed.
          const pressed = ghost.opacity > 0.5 && ghost.press > 0.5
          const tip = project(r.game.shot(width, height), width, height, [ghost.x, STAND + ghost.y, -offset(r.game.lap.s, ghost.s) + ghost.z])
          if (pressed && !down) steer.press(tip.x, tip.y, ms)
          else if (pressed) all.push(...steer.move(tip.x, tip.y, ms, reachFor(width, height, lanePixels(width, height, offset(PLACES.shelf, r.game.lap.s)))))
          down = pressed
        }
        told.push(all)
        r.down()
        r.run(0.05)
        r.up()
        r.run(0.1)
      }
      expect(JSON.stringify(told), `${width}x${height}`).toBe(JSON.stringify([[], ['right'], ['jump'], ['tuck']]))
    }
  })

  it('taps once where it shows a tap: at the shelf and after the hand-over the hand comes down one time in a showing', () => {
    const scenes: [string, Rig][] = [['at the shelf', rig()], ['after the hand-over', (() => { const r = arrive('balloons'); r.run(LONGEST + 1); return r })()]]
    for (const [name, r] of scenes) {
      // Every showing in half a minute of looking: the hand is seen, comes down once, and is gone.
      let taps = 0, down = false, shown = false, showings = 0
      for (let t = 0; t < 30; t += DT) {
        r.run(DT)
        const ghost = r.game.stage.ghost
        const pressed = ghost.opacity > 0.5 && ghost.press > 0.5
        if (pressed && !down) taps += 1
        down = pressed
        if (shown && ghost.opacity === 0) {
          showings += 1
          expect(taps, `${name}, showing ${showings}`).toBe(1)
          taps = 0
        }
        shown = ghost.opacity > 0
      }
      expect(showings, name).toBeGreaterThanOrEqual(1)
    }
  })

  it('keeps all of the ghost hand in the frame wherever the fox stands, through every move it shows', () => {
    // From the shelf on: for the three steps a load can be taken the hand points at a load, and the load is in the frame under it.
    for (const at of [0, 12, 30, 45, 59, 60, 110, 300, 700, 1300]) {
      const r = rig(save({ at, lane: 1 }))
      let seen = 0
      for (let turn = 0; turn < 4; turn++) {
        for (let t = 0; t < IDLE_BEFORE_DEMO + DEMO_SECONDS + 0.2; t += DT) {
          r.run(DT)
          const ghost = r.game.stage.ghost
          const shot = r.game.shot(W, H)
          // Nothing the idle ladder lights is off the frame: not the fox's light, and not the light on a load.
          for (const light of r.game.stage.lights) {
            if (light.strength < 0.05) continue
            const point = project(shot, W, H, [light.x, light.flat ? 0 : STAND + light.y, -offset(r.game.lap.s, light.s) + light.z])
            expect(point.x > 0 && point.x < W && point.y > 0 && point.y < H, `the light at ${at}, turn ${turn}`).toBe(true)
          }
          if (ghost.opacity < 0.5) continue
          seen += 1
          if (turn === 0 && at < SHELF_REACH) expect(r.game.hint.wants, `at ${at}`).toBe('load')
          // The fingertip, and the corner of the hand furthest from it: the plaque hangs down and to the right of where it points.
          for (const [dx, dy] of [[0, 0], [14, -18]] as const) {
            const point = project(shot, W, H, [ghost.x + dx, STAND + ghost.y + dy, -offset(r.game.lap.s, ghost.s) + ghost.z])
            expect(point.x, `at ${at}, turn ${turn}`).toBeGreaterThan(0)
            expect(point.x, `at ${at}, turn ${turn}`).toBeLessThan(W)
            expect(point.y, `at ${at}, turn ${turn}`).toBeGreaterThan(0)
            expect(point.y, `at ${at}, turn ${turn}`).toBeLessThan(H)
          }
        }
        r.down()
        r.run(0.05)
        r.up()
        r.run(0.1)
      }
      expect(seen, `at ${at}`).toBeGreaterThan(200)
    }
  })

  it('leaves no flag behind a touch: a fox that was stopped stays stopped', () => {
    const r = rig(save({ at: 60, lane: 1 }))
    r.down()
    r.run(0.3)
    r.game.move(TRAIL.x, TRAIL.y - 120, W, H, 300)
    r.up()
    r.run(3)
    const s = r.game.lap.s, moved = r.moved.length
    r.run(10)
    expect(r.game.lap.s).toBe(s)
    expect(r.game.lap.down).toBe(false)
    expect(r.moved.length).toBe(moved)
  })
})

describe('the finger', () => {
  it('runs the fox while it is down and stops it dead when it lifts, for as long as the child likes', () => {
    const r = rig(save({ at: ZONES.stream.to + 10, lane: 1 }))
    r.run(0.5)
    r.down()
    r.run(0.5)
    const first = r.game.lap.s
    r.run(0.5)
    const pace = r.game.lap.s - first
    expect(pace).toBeCloseTo(RUN_SPEED / 2, 0)
    r.up()
    r.run(0.5)
    const stopped = r.game.lap.s
    r.run(30)
    expect(r.game.lap.s).toBe(stopped)
    r.down()
    r.run(0.5)
    const second = r.game.lap.s
    r.run(0.5)
    // The same pace as before: nothing sped up while it stood, and nothing was lost for stopping.
    expect(r.game.lap.s - second).toBeCloseTo(pace, 6)
  })

  it('runs the fox while any finger is down, and takes a slide, a flick and a tap from any other finger: a resting thumb and the other hand work together', () => {
    const r = rig(save({ at: 236, lane: 1 }))
    const game = r.game, lap = game.lap
    r.run(0.3)
    // A thumb comes down and rests: the fox runs.
    game.press(200, 700, W, H, 0, undefined, 7)
    r.run(0.2)
    expect(lap.down).toBe(true)
    // The other hand slides: a lane. Then it flicks up: a jump. The thumb has not moved.
    game.press(800, 600, W, H, 200, undefined, 9)
    r.run(0.1)
    game.move(900, 600, W, H, 320, 9)
    r.run(0.3)
    expect(lap.lane).toBe(2)
    game.move(900, 480, W, H, 640, 9)
    r.run(DT)
    expect(lap.air).toBe(true)
    // The second finger lifts: the fox runs on under the thumb, which steers too.
    game.lift(9)
    r.run(0.2)
    expect(lap.down).toBe(true)
    const s = lap.s
    game.move(100, 700, W, H, 900, 7)
    r.run(0.3)
    expect(lap.lane).toBe(1)
    expect(lap.s).toBeGreaterThan(s)
    // The other way round: the thumb lifts first and the fox runs on under the other finger, and stops when that lifts.
    game.press(800, 600, W, H, 2000, undefined, 9)
    game.lift(7)
    r.run(0.3)
    expect(lap.down).toBe(true)
    game.lift(9)
    r.run(DT)
    expect(lap.down).toBe(false)
    const stopped = lap.s
    r.run(1)
    expect(lap.s).toBe(stopped)
    // At the shelf: a finger rests on the trail and the fox runs; a tap of another finger on a load takes it.
    const shelf = rig()
    shelf.run(0.2)
    shelf.game.press(TRAIL.x, TRAIL.y, W, H, 0, undefined, 1)
    shelf.run(0.1)
    const cake = middleOf(shelf.game, 'load-cake')
    shelf.game.press(cake.x, cake.y, W, H, 100, undefined, 2)
    shelf.game.lift(2)
    shelf.run(DT)
    expect(shelf.game.lap.load).toBe('cake')
    expect(shelf.game.lap.down).toBe(true)
    // Put away under two fingers, nothing is left down.
    shelf.game.press(TRAIL.x, TRAIL.y, W, H, 300, undefined, 3)
    shelf.game.park()
    shelf.run(1)
    expect(shelf.game.lap.down).toBe(false)
  })

  it('takes a load on the press, once, and the fox stays where it is however long the press lasts', () => {
    for (const held of [0.05, 0.45, 2]) {
      const r = rig()
      r.run(0.3)
      const at = middleOf(r.game, 'load-cake')
      r.down(at.x, at.y)
      expect(r.game.lap.load).toBe('cake')
      r.run(held)
      r.up()
      r.run(0.5)
      expect(r.game.lap.s).toBe(PLACES.shelf)
      expect(r.moved.filter((one) => one.what === 'take').length).toBe(1)
      // A tap on another swaps it.
      const other = middleOf(r.game, 'load-owl')
      r.down(other.x, other.y)
      r.up()
      expect(r.game.lap.load).toBe('owl')
    }
  })

  it('keeps a slide made while the fox is thrown back for as long as that finger stays down, and no longer', () => {
    const thrown = (): Rig => {
      const r = rig(save({ at: ZONES.brambles.from - 20, lane: 1 }))
      r.down()
      // Into the thorns, and held on them: something is carrying the fox.
      while (!r.game.lap.act) r.run(DT)
      expect(r.game.lap.act!.kind).toBe('burrs')
      // A slide of a lane to the right, in the middle of it.
      r.run(0.1)
      r.game.move(TRAIL.x + 40, TRAIL.y, W, H, r.frame * 16 + 20)
      r.game.move(TRAIL.x + 110, TRAIL.y, W, H, r.frame * 16 + 60)
      expect(r.game.lap.lane).toBe(1)
      return r
    }
    // The finger stays: the fox is let down, goes over to the open lane and runs on past the thorns.
    const stays = thrown()
    stays.run(2.5)
    expect(stays.game.lap.lane).toBe(2)
    expect(stays.game.lap.s).toBeGreaterThan(ZONES.brambles.to)
    expect(stays.moved.filter((one) => one.what === 'lane').length).toBe(1)
    // The finger lifts before the fox is down: the slide is gone with it, and the next press is only a press.
    const lifts = thrown()
    lifts.up()
    lifts.run(2)
    expect(lifts.game.lap.lane).toBe(1)
    lifts.down()
    lifts.run(0.2)
    expect(lifts.game.lap.lane).toBe(1)
    // Put away in the middle of it: gone as well.
    const parked = thrown()
    parked.game.park()
    parked.down()
    parked.run(0.2)
    expect(parked.game.lap.lane).toBe(1)
  })

  it('never acts for the child when the browser takes it away: the fox stops, and that is all', () => {
    const touch = new ForgivingTouch()
    // On the trail: a cancelled touch stops the fox as a lift does.
    const r = rig(save({ at: 60, lane: 1 }))
    for (const gesture of touch.down(1, TRAIL, 0)) r.game.gesture(gesture, W, H, 0)
    r.run(0.5)
    expect(r.game.lap.down).toBe(true)
    for (const gesture of touch.cancel(1)) r.game.gesture(gesture, W, H, 500)
    expect(r.game.lap.down).toBe(false)
    expect(r.moved.at(-1)!.what).toBe('stop')
    // With no finger down, or with a finger that already did its one thing, a touch taken away changes nothing.
    for (const make of [() => rig(), () => arrive('cake'), () => { const one = arrive('owl'); one.run(LONGEST + 1); return one }]) {
      const one = make()
      one.run(0.2)
      const before = { saves: one.saves.length, played: one.played.length, moved: one.moved.length, hushes: one.hushes.length, signature: one.game.stage.signature() }
      one.game.gesture({ type: 'pressEnd', at: TRAIL }, W, H, 0)
      one.game.gesture({ type: 'dragCancel', from: TRAIL, at: TRAIL }, W, H, 0)
      one.run(DT)
      expect({ saves: one.saves.length, played: one.played.length, moved: one.moved.length, hushes: one.hushes.length }).toEqual({ saves: before.saves, played: before.played, moved: before.moved, hushes: before.hushes })
    }
    // Over a load: the press took it, and the cancel neither puts it back nor takes another.
    const shelf = rig()
    shelf.run(0.3)
    const at = middleOf(shelf.game, 'load-bucket')
    const other = new ForgivingTouch()
    for (const gesture of other.down(2, at, 0)) shelf.game.gesture(gesture, W, H, 0)
    for (const gesture of other.cancel(2)) shelf.game.gesture(gesture, W, H, 100)
    expect(shelf.game.lap.load).toBe('bucket')
    expect(shelf.moved.filter((one) => one.what === 'take').length).toBe(1)
    expect(shelf.game.lap.s).toBe(PLACES.shelf)
  })

  it('answers nothing in the grown-up corner, and a press there is no touch to the idle ladder', () => {
    for (const make of [() => rig(), () => rig(carrying(300, 1, 'cake')), () => { const one = arrive('cake'); one.run(LONGEST + 1); return one }]) {
      const r = make()
      r.run(IDLE_BEFORE_GLOW + 1.5)
      const glow = r.game.hint.glow
      expect(glow).toBeGreaterThan(0)
      const before = { saves: r.saves.length, played: r.played.length, moved: r.moved.length, s: r.game.lap.s, finished: r.game.lap.finished }
      for (const [x, y] of [[W - 1, 1], [W - CORNER, CORNER], [W - 30, 40]]) {
        r.down(x, y)
        r.run(0.3)
        r.game.move(x - 200, y + 300, W, H, 0)
        r.up()
      }
      expect({ saves: r.saves.length, played: r.played.length, moved: r.moved.length, s: r.game.lap.s, finished: r.game.lap.finished }).toEqual(before)
      // The ladder went on climbing through it.
      expect(r.game.hint.glow).toBeGreaterThanOrEqual(glow)
    }
  })

  it('is not idle while it is down, and nothing a character does by itself counts as a touch', () => {
    const r = rig(save({ at: 60, lane: 1 }))
    r.down()
    r.run(8)
    expect(r.game.hint.glow).toBe(0)
    r.up()
    // The fox turns round to the child by itself a moment after it stops: the ladder counts from the lift all the same.
    const turned = r.moved.length
    r.run(IDLE_BEFORE_GLOW + 0.3)
    expect(r.moved.slice(turned).some((one) => one.what === 'turn')).toBe(true)
    expect(r.game.hint.glow).toBeGreaterThan(0)
    // The whole hand-over is the characters' own doing: it ends with the ladder further up, not back at the bottom.
    const scene = arrive('cake')
    scene.run(LONGEST + 0.2)
    expect(scene.game.sceneRunning).toBe(false)
    expect(scene.game.hint.glow).toBeGreaterThan(0)
  })
})

describe('the shelf, the five who wait and the home control', () => {
  const sizes: [number, number][] = [[1180, 820], [820, 1180], [1024, 768], [768, 1024], [1366, 1024], [2048, 1536], [700, 500], [844, 390], [568, 320], [1000, 600]]
  /** The jam's home control: round, 48 px across, 10 px from the top, in the middle. */
  const home = (width: number) => ({ left: width / 2 - 24, right: width / 2 + 24, top: 10, bottom: 58 })
  const apart = (a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }, by = 0): boolean =>
    a.right + by < b.left || b.right + by < a.left || a.bottom + by < b.top || b.bottom + by < a.top

  /** Every thing a finger can land on, as its rectangle on the glass. */
  function touchables(game: Game, width: number, height: number): { key: string; kind: string; rect: { left: number; right: number; top: number; bottom: number } }[] {
    const shot = game.shot(width, height)
    const out: { key: string; kind: string; rect: { left: number; right: number; top: number; bottom: number } }[] = []
    for (const item of game.stage.items) {
      if (!item.touch) continue
      const box: Box = game.stage.boxOf(item, game.lap.s, { minX: 0, maxX: 0, minY: 0, maxY: 0, z: 0 })
      const rect = onGlass(shot, width, height, box)
      if (rect) out.push({ key: item.key, kind: item.touch.kind, rect })
    }
    return out
  }

  /** The clearing at rest, and as each hand-over leaves it. */
  const clearings: [string, () => Game][] = [
    ['a new lap', () => rig().game],
    ...LOADS.map((load): [string, () => Game] => [`after the ${load}`, () => {
      const r = arrive(load)
      r.run(LONGEST + 1)
      return r.game
    }]),
    ['after a ladder with the goose on it', () => {
      const r = arrive('ladder', { trail: { gooseRides: true } })
      r.run(LONGEST + 1)
      return r.game
    }],
  ]

  it('keeps everything a child touches out from under the home control, at every surface size, short ones too', () => {
    const under: string[] = []
    for (const [name, make] of clearings) {
      const game = make()
      for (const [width, height] of sizes) {
        for (const one of touchables(game, width, height)) if (!apart(one.rect, home(width))) under.push(`${name}: ${one.key} at ${width}x${height} [${Math.round(one.rect.left)}..${Math.round(one.rect.right)}, ${Math.round(one.rect.top)}..${Math.round(one.rect.bottom)}]`)
      }
    }
    expect(under).toEqual([])
  })

  it('covers no load with anyone who waits, settled or not, so a tap on one is never taken for the other', () => {
    for (const [name, make] of clearings) {
      const game = make()
      for (const [width, height] of [[1180, 820], [820, 1180]] as const) {
        const all = touchables(game, width, height)
        const loads = all.filter((one) => one.kind === 'load'), who = all.filter((one) => one.kind === 'who')
        expect(loads.length, name).toBeGreaterThanOrEqual(4)
        expect(who.length, name).toBeGreaterThanOrEqual(6)
        for (const load of loads) {
          for (const one of who) expect(apart(load.rect, one.rect), `${name}: ${one.key} and ${load.key} at ${width}x${height}`).toBe(true)
          // Wide enough for a finger, counting the slack a finger is given on each side, and the finger finds it.
          expect(Math.min(load.rect.right - load.rect.left, load.rect.bottom - load.rect.top) + 2 * SLACK, `${load.key} at ${width}x${height}`).toBeGreaterThanOrEqual(64)
          const touch = game.touchAt((load.rect.left + load.rect.right) / 2, (load.rect.top + load.rect.bottom) / 2, width, height, game.shot(width, height))
          expect(touch, load.key).toEqual({ kind: 'load', load: load.key.slice(5) })
        }
        for (const one of who) {
          const touch = game.touchAt((one.rect.left + one.rect.right) / 2, (one.rect.top + one.rect.bottom) / 2, width, height, game.shot(width, height))
          expect(touch?.kind, `${name}: ${one.key} at ${width}x${height}`).toBe('who')
        }
      }
    }
  })

  it('makes every load and each of the five big enough for a finger at all three sizes: 48 pixels or more each way as drawn, before any slack', () => {
    const sizesOf: string[] = []
    for (const [name, make] of clearings) {
      const game = make()
      for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180]] as const) {
        const all = touchables(game, width, height)
        const loads = all.filter((one) => one.kind === 'load'), five = all.filter((one) => ['bear', 'cat', 'hedgehog', 'owl', 'frog'].includes(one.key))
        expect(loads.length, name).toBeGreaterThanOrEqual(4)
        expect(five.length, name).toBe(5)
        for (const one of [...loads, ...five]) {
          const least = Math.min(one.rect.right - one.rect.left, one.rect.bottom - one.rect.top)
          sizesOf.push(`${Math.round(least)} ${one.key} ${name} ${width}x${height}`)
          expect(least, `${name}: ${one.key} at ${width}x${height}`).toBeGreaterThanOrEqual(48)
          // And the finger finds it at its middle.
          const touch = game.touchAt((one.rect.left + one.rect.right) / 2, (one.rect.top + one.rect.bottom) / 2, width, height, game.shot(width, height))
          expect(touch?.kind, `${name}: ${one.key} at ${width}x${height}`).toBe(one.kind)
        }
      }
    }
    expect(sizesOf.length).toBeGreaterThan(180)
  })

  it('gives a tap to what is drawn under it: where the hedgehog is drawn it is the hedgehog\'s, and where the frog\'s tub is, the frog\'s', () => {
    type Dot = { key: string; touch: string; x: number; y: number; z: number }
    /** The middle of every bead of everything a finger can land on, on the glass. */
    const dots = (game: Game, width: number, height: number): Dot[] => {
      const shot = game.shot(width, height), out: Dot[] = []
      for (const item of game.stage.items) {
        if (!item.touch) continue
        for (let i = item.from; i < item.to; i++) {
          const quad = game.stage.quads[i]
          if (quad.flat) continue
          const z = -offset(game.lap.s, item.s) + item.z + quad.z
          for (let j = 0; j < quad.tile.h; j++) {
            for (let k = 0; k < quad.tile.w; k++) {
              if (quad.tile.cells[j * quad.tile.w + k] === 0) continue
              const u = (k + 0.5) / quad.tile.w - 0.5, v = 0.5 - (j + 0.5) / quad.tile.h
              const point = project(shot, width, height, [item.x + quad.x + quad.ax * u + quad.bx * v, STAND + item.y + quad.y + quad.ay * u + quad.by * v, z])
              if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) continue
              out.push({ key: item.key, touch: JSON.stringify(item.touch), x: point.x, y: point.y, z })
            }
          }
        }
      }
      return out
    }
    for (const [name, make] of [clearings[0], clearings[3]]) {
      const game = make()
      for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180]] as const) {
        const all = dots(game, width, height), shot = game.shot(width, height)
        // A bead and a half on the glass, at the clearing: nearer than that, two things are drawn in the same place.
        const near = 1.5 * (project(shot, width, height, [1, 0, 0]).x - project(shot, width, height, [0, 0, 0]).x)
        // The frog and its tub stand in front of the hedgehog, and their boxes reach over part of it.
        const frogs = ['frog', 'frog-fixture'].map((key) => onGlass(shot, width, height, game.stage.boxOf(game.stage.items.find((item) => item.key === key)!, game.lap.s, { minX: 0, maxX: 0, minY: 0, maxY: 0, z: 0 }))!)
        let alone = 0, behindTub = 0, tub = 0
        for (const dot of all) {
          const found = JSON.stringify(game.touchAt(dot.x, dot.y, width, height, shot))
          if (dot.key === 'frog-fixture') {
            // Nothing a finger can land on stands in front of the tub but the frog in it.
            tub += 1
            expect(found, `${name}: the tub at ${Math.round(dot.x)}, ${Math.round(dot.y)} of ${width}x${height}`).toBe(dot.touch)
            continue
          }
          // Where nothing else is drawn within a bead and a half, the tap is this thing's, whatever boxes it is in.
          if (all.some((other) => other.touch !== dot.touch && Math.abs(other.x - dot.x) < near && Math.abs(other.y - dot.y) < near)) continue
          alone += 1
          expect(found, `${name}: ${dot.key} at ${Math.round(dot.x)}, ${Math.round(dot.y)} of ${width}x${height}`).toBe(dot.touch)
          if (dot.key === 'hedgehog' && frogs.some((frog) => dot.x > frog.left - SLACK && dot.x < frog.right + SLACK && dot.y > frog.top - SLACK && dot.y < frog.bottom + SLACK)) behindTub += 1
        }
        expect(alone, name).toBeGreaterThan(1500)
        expect(tub, name).toBeGreaterThan(100)
        // The case this is for: beads of the hedgehog inside the box of the frog or of its tub.
        if (name === 'a new lap') expect(behindTub, `${name} at ${width}x${height}`).toBeGreaterThan(20)
      }
    }
  })

  it('stands the loads on the board of the gate, in their own places', () => {
    const game = rig().game
    for (const load of LOADS) {
      const item = game.stage.items.find((one) => one.key === `load-${load}`)!
      expect(item.x).toBe(SHELF_SLOTS[load])
      expect(item.y).toBe(SHELF_HEIGHT)
      expect(item.s).toBe(PLACES.shelf - SHELF_BEFORE)
      // Its foot is on the board, not in it and not over it.
      expect(item.y + item.bounds.minY).toBeGreaterThanOrEqual(SHELF_HEIGHT - 1e-9)
      expect(item.y + item.bounds.minY).toBeLessThan(SHELF_HEIGHT + 2.5)
    }
    // The fox stands in the gateway, whole, between them and the child.
    const fox = project(game.shot(W, H), W, H, [0, 14, 0])
    expect(fox.x).toBeCloseTo(W / 2, 0)
    expect(fox.y).toBeGreaterThan(H / 2)
  })
})

describe('the age of the child', () => {
  it('sets one default, the load the ghost hand reaches for, and nothing else at any age', () => {
    expect([null, 2, 6, 7].map(loadShown)).toEqual(['balloons', 'balloons', 'balloons', 'balloons'])
    expect([8, 9, 10, 12, 40].map(loadShown)).toEqual(['cake', 'cake', 'cake', 'cake', 'cake'])
    const first = rig(null, null)
    for (const age of [null, 6, 7, 8, 10, 12]) {
      const r = rig(null, age)
      expect(serializeLap(r.game.state)).toEqual(serializeLap(first.game.state))
      expect(r.game.stage.signature()).toEqual(first.game.stage.signature())
      r.run(6.5)
      expect(r.game.hint.wants).toBe('load')
      expect(r.game.hint.load).toBe(loadShown(age))
      // Every load can be taken at every age.
      for (const load of LOADS) {
        const at = middleOf(r.game, `load-${load}`)
        r.down(at.x, at.y)
        r.up()
        expect(r.game.lap.load).toBe(load)
      }
    }
    // It is asked each time and never kept: an age that changes changes the hand at once.
    const r = rig(null, 6)
    r.run(6.5)
    expect(r.game.hint.load).toBe('balloons')
    r.age = 9
    r.run(DT)
    expect(r.game.hint.load).toBe('cake')
    expect(JSON.stringify(serializeLap(r.game.state))).not.toContain('age')
  })
})

describe('the shelf and the rule that a load can be taken', () => {
  const three: [number, number][] = [[1180, 820], [1024, 768], [820, 1180]]
  type Rect = { left: number; right: number; top: number; bottom: number }
  const loadRects = (game: Game, width: number, height: number): Record<string, Rect> => {
    const out: Record<string, Rect> = {}
    const shot = game.shot(width, height)
    for (const item of game.stage.items) {
      if (item.touch?.kind !== 'load') continue
      out[item.touch.load] = onGlass(shot, width, height, game.stage.boxOf(item, game.lap.s, { minX: 0, maxX: 0, minY: 0, maxY: 0, z: 0 }))!
    }
    return out
  }
  const shelfUp = (game: Game): number => game.stage.items.find((item) => item.key === 'shelf')!.y

  it('keeps every load in the frame, where it was, and to be taken by a press on it, for exactly as long as one can be taken, at all three sizes', () => {
    for (const lane of LANES) {
      for (const [width, height] of three) {
        const rest = loadRects(rig(save({ at: 0, lane })).game, width, height)
        for (let at = 0; at < SHELF_REACH; at += at < 54 ? 6 : 1) {
          const game = rig(save({ at, lane })).game
          expect(game.lap.canTake, `at ${at}`).toBe(true)
          expect(shelfUp(game), `at ${at}`).toBe(0)
          const now = loadRects(game, width, height)
          for (const load of LOADS) {
            const rect = now[load], name = `${load} at ${at}, lane ${lane}, ${width}x${height}`
            // All of it is in the frame, and it has not moved on the glass since the fox stood under it.
            expect(rect.left >= 0 && rect.right <= width && rect.top >= 0 && rect.bottom <= height, name).toBe(true)
            for (const side of ['left', 'right', 'top', 'bottom'] as const) expect(rect[side], name).toBeCloseTo(rest[load][side], 6)
            // A press on it takes it.
            const one = rig(save({ at, lane })).game
            one.press((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2, width, height, 0)
            expect(one.lap.load, name).toBe(load)
            expect(one.lap.s, name).toBe(at)
          }
        }
      }
    }
  })

  it('flies the gate up at the place where no load can be taken any more, and not a peg before', () => {
    // Found standing: the gate is where the place puts it, with no flight to watch.
    expect(shelfUp(rig(save({ at: SHELF_REACH - 0.01, lane: 1 })).game)).toBe(0)
    expect(shelfUp(rig(save({ at: SHELF_REACH, lane: 1 })).game)).toBe(GATE_FLOWN)
    expect(shelfUp(rig(save({ at: 140, lane: 1 })).game)).toBe(GATE_FLOWN)
    expect(shelfUp(rig(save({ at: PLACES.handOver - 100, lane: 1 })).game)).toBe(0)
    // Run out: it stands for as long as the rule holds and has left the board on the first frame it does not.
    const r = rig()
    r.run(0.2)
    r.down()
    let stood = 0, flew = 0, last = 0
    for (let i = 0; i < 150; i++) {
      r.run(DT)
      const up = shelfUp(r.game), can = r.game.lap.canTake
      if (can) {
        stood += 1
        expect(up, `at ${r.game.lap.s}`).toBe(0)
      } else {
        flew += 1
        expect(up, `at ${r.game.lap.s}`).toBeGreaterThan(0)
        expect(up).toBeGreaterThanOrEqual(last)
        // Every load that is still on the board goes up with it.
        for (const item of r.game.stage.items) if (item.touch?.kind === 'load') expect(item.y, item.key).toBe(SHELF_HEIGHT + up)
      }
      last = up
      if (flew === Math.ceil(GATE_SECONDS / DT) + 1) expect(up).toBe(GATE_FLOWN)
    }
    expect(stood).toBeGreaterThan(40)
    expect(flew).toBeGreaterThan(60)
  })

  it('leaves five pegs between each load and the next on the board, none at the middle of it, and leans the ladder on it', () => {
    const r = rig()
    const game = r.game
    const loads = game.stage.items.filter((item) => item.touch?.kind === 'load').sort((a, b) => a.x - b.x)
    expect(loads.map((item) => item.key)).toEqual(['load-ladder', 'load-bucket', 'load-owl', 'load-cake', 'load-balloons'])
    // However each of them sways and breathes there, and when the idle light makes them beckon.
    for (let frame = 0; frame < 480; frame++) {
      const now = game.stage.items.filter((item) => item.touch?.kind === 'load').sort((a, b) => a.x - b.x)
      for (let i = 1; i < now.length; i++) {
        const gap = now[i].x + now[i].bounds.minX - (now[i - 1].x + now[i - 1].bounds.maxX)
        expect(gap, `${now[i - 1].key} and ${now[i].key}`).toBeGreaterThanOrEqual(5)
      }
      // The middle of the board is bare, under where a shell's own control is.
      for (const item of now) expect(item.x + item.bounds.maxX < -SHELF_CLEAR || item.x + item.bounds.minX > SHELF_CLEAR, `${item.key} at frame ${frame}`).toBe(true)
      // The ladder leans on the board, and goes on leaning: it stands upright nowhere in the game.
      expect(now[0].pose.tilt, `frame ${frame}`).toBeGreaterThanOrEqual(0.15)
      r.run(DT)
    }
  })

  it('shows one more mushroom on the log at each bloop, on the frame it sounds, and all three to a game found with them', () => {
    const r = rig(carrying(ZONES.log.from - 2 * STEP, 1, 'bucket', { left: 3 }))
    const caps = (game: Game): number => {
      const log = game.stage.items.find((item) => item.key === 'log')!
      return ['cap1', 'cap2', 'cap3'].filter((name) => log.pose.parts[name].show).length
    }
    r.run(0.1)
    expect(caps(r.game)).toBe(0)
    r.down()
    const seen: number[] = []
    let jumped = false
    for (let i = 0; i < 300; i++) {
      if (!jumped && r.game.lap.s >= ZONES.log.mid - 28) { r.game.lap.jump(); jumped = true }
      const moved = r.moved.length, played = r.played.length
      r.run(DT)
      const bloop = r.moved.slice(moved).some((one) => (one.event?.type === 'gag' && one.event.gag === 'mushrooms') || one.event?.type === 'bloop')
      if (!bloop) continue
      seen.push(caps(r.game))
      // Its sound is on this frame.
      expect(r.played.slice(played).some((one) => one.frame === r.frame), `bloop ${seen.length}`).toBe(true)
    }
    expect(seen).toEqual([1, 2, 3])
    // Put away between the first and the second, it is found with all three: the save had them from the first.
    const half = rig(carrying(ZONES.log.from - 2 * STEP, 1, 'bucket', { left: 3 }))
    half.down()
    let leapt = false
    for (let i = 0; i < 300 && caps(half.game) === 0; i++) {
      if (!leapt && half.game.lap.s >= ZONES.log.mid - 28) { half.game.lap.jump(); leapt = true }
      half.run(DT)
    }
    expect(caps(half.game)).toBe(1)
    half.game.park()
    expect(caps(half.game)).toBe(3)
    expect(caps(rig(JSON.parse(JSON.stringify(half.saves.at(-1)!.state))).game)).toBe(3)
  })

  it('gives the goose feet, and has them in the air when a balloon bangs and she goes off her nest backwards', () => {
    const r = rig(carrying(ZONES.goose.from - 40, 0, 'balloons'))
    r.run(0.1)
    const goose = (): { feet: boolean; feetY: number; feetTop: number; bodyY: number; bodyTop: number; over: number } => {
      const item = r.game.stage.items.find((one) => one.key === 'goose')!
      const quads = r.game.stage.quads.slice(item.from, item.to)
      const plaqueOf = (name: string) => item.figure.parts.find((part) => part.name === name)!.plaque
      const feet = quads.find((quad) => quad.tile === plaqueOf('feet')), body = quads.find((quad) => quad.tile === plaqueOf('body'))!
      const topOf = (quad: (typeof quads)[number]): number => quad.y + (Math.abs(quad.ay) + Math.abs(quad.by)) / 2
      return { feet: item.pose.parts.feet.show, feetY: feet ? feet.y : 0, feetTop: feet ? topOf(feet) : 0, bodyY: body.y, bodyTop: topOf(body), over: Math.abs(item.pose.tilt) }
    }
    // On her nest they are tucked under her.
    expect(goose().feet).toBe(false)
    r.down()
    for (let i = 0; i < 300 && !r.moved.some((one) => one.event?.type === 'gag' && one.event.gag === 'bang'); i++) {
      r.run(DT)
      expect(goose().feet).toBe(false)
    }
    expect(r.moved.some((one) => one.event?.type === 'gag' && one.event.gag === 'bang')).toBe(true)
    r.up()
    let up = 0, lying = 0
    for (let i = 0; i < 96; i++) {
      r.run(DT)
      const now = goose()
      if (!now.feet) continue
      up += 1
      // Above the middle of her from the frame they show, and above all of her body once she lies on her back.
      expect(now.feetY, `frame ${i}`).toBeGreaterThan(now.bodyY)
      if (now.over < 1.4) continue
      lying += 1
      expect(now.feetTop, `frame ${i}`).toBeGreaterThan(now.bodyTop + 2)
    }
    // For most of the second and a half she lies there.
    expect(up).toBeGreaterThan(60)
    expect(lying).toBeGreaterThan(50)
    r.run(1)
    expect(goose().feet).toBe(false)
  })

  it('shows a woken owlet ruffled with feathers that are no two alike and not one for each waking: nothing on it counts', () => {
    const shown = (ruffles: number): string[] => {
      const r = rig(carrying(300, 1, 'owl', { marks: { wet: false, muddy: false, berries: false, ruffles } }))
      r.run(0.1)
      const owlet = r.game.stage.items.find((item) => item.key === 'load-owl')!
      return owlet.figure.parts.filter((part) => part.name.startsWith('ruffle') && owlet.pose.parts[part.name].show).map((part) => part.name)
    }
    expect(shown(0)).toEqual([])
    // Two at once, a third from the second waking, and no more after that.
    expect([1, 2, 3].map((ruffles) => shown(ruffles).length)).toEqual([2, 3, 3])
    const r = rig(carrying(300, 1, 'owl'))
    const feathers = r.game.stage.items.find((item) => item.key === 'load-owl')!.figure.parts.filter((part) => part.name.startsWith('ruffle')).map((part) => part.plaque)
    expect(feathers.length).toBe(3)
    for (let i = 0; i < feathers.length; i++) for (let j = i + 1; j < feathers.length; j++) expect(`${feathers[i].w}x${feathers[i].h}:${feathers[i].cells.join('')}`).not.toBe(`${feathers[j].w}x${feathers[j].h}:${feathers[j].cells.join('')}`)
  })

  it('stands the ladder upright nowhere at rest: it leans on the shelf and in the cat\'s paws, and is level over the fox\'s head', () => {
    const r = rig(carrying(PLACES.handOver - 120, 1, 'ladder'))
    r.run(0.2)
    r.down()
    let held = 0, kept = 0
    for (let i = 0; i < 60 * (LONGEST + 4); i++) {
      r.run(DT)
      if (r.game.lap.finished) r.up()
      const ladder = r.game.stage.items.find((item) => item.key === 'load-ladder')
      if (!ladder || !('ladder' in ladder.pose.parts)) continue
      // How far from upright its rails are, whoever has it.
      const lean = Math.abs(Math.sin(ladder.pose.tilt + ladder.pose.parts.ladder.turn))
      expect(lean, `frame ${i}`).toBeGreaterThanOrEqual(0.12)
      if (r.game.lap.finished) kept += 1
      else held += 1
    }
    expect(held).toBeGreaterThan(60)
    expect(kept).toBeGreaterThan(20)
  })

  it('stands whoever takes the load clear of the fox on the glass while it takes it, with every load, from every lane, at all three sizes', () => {
    for (const load of LOADS) {
      for (const lane of LANES) {
        const r = rig(carrying(PLACES.handOver - 40, lane, load))
        r.run(0.1)
        r.down()
        for (let i = 0; i < 600 && !r.moved.some((one) => one.what.endsWith('.take')); i++) {
          r.run(DT)
          if (r.game.lap.finished) r.up()
        }
        const who = r.moved.find((one) => one.what.endsWith('.take'))!.what.split('.')[0]
        // From the frame it takes the load, for a third of a second: it has stopped beside the fox.
        for (let i = 0; i < 20; i++) {
          const fox = r.game.stage.items.find((item) => item.key === 'fox')!, taker = r.game.stage.items.find((item) => item.key === who)!
          for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180]] as const) {
            const shot = r.game.shot(width, height)
            const a = onGlass(shot, width, height, r.game.stage.boxOf(fox, r.game.lap.s, { minX: 0, maxX: 0, minY: 0, maxY: 0, z: 0 }))!
            const b = onGlass(shot, width, height, r.game.stage.boxOf(taker, r.game.lap.s, { minX: 0, maxX: 0, minY: 0, maxY: 0, z: 0 }))!
            // Trail shows between them, and all of the taker is in the frame.
            expect(Math.max(a.left - b.right, b.left - a.right), `${who} with the ${load} from lane ${lane} at ${width}x${height}, frame ${i}`).toBeGreaterThan(2)
            expect(b.left >= 0 && b.right <= width, `${who} in the frame at ${width}x${height}`).toBe(true)
          }
          r.run(DT)
        }
      }
    }
  })

  it('clips nobody who waits on an upright surface: all of each of the five, and of what stands by them, is in the frame', () => {
    for (const [width, height] of [[820, 1180], [768, 1024], [1180, 820], [1024, 768]] as const) {
      const game = rig().game
      const shot = game.shot(width, height)
      let seen = 0
      for (const item of game.stage.items) {
        if (item.touch?.kind !== 'who' || item.key === 'goose') continue
        const rect = onGlass(shot, width, height, game.stage.boxOf(item, game.lap.s, { minX: 0, maxX: 0, minY: 0, maxY: 0, z: 0 }))!
        seen += 1
        expect(rect.left, `${item.key} at ${width}x${height}`).toBeGreaterThanOrEqual(0)
        expect(rect.right, `${item.key} at ${width}x${height}`).toBeLessThanOrEqual(width)
        expect(rect.top, `${item.key} at ${width}x${height}`).toBeGreaterThanOrEqual(0)
        expect(rect.bottom, `${item.key} at ${width}x${height}`).toBeLessThanOrEqual(height)
      }
      expect(seen).toBeGreaterThanOrEqual(6)
    }
  })
})

describe('what a lap leaves, where it was left', () => {
  /** Where the middle of one part of an obstacle stands, in pegs right of the trail's middle, or null when it is not shown. */
  function partAt(game: Game, obstacle: Fixed, part: string): { x: number; y: number } | null {
    const item = game.stage.items.find((one) => one.key === obstacle)!
    const plaque = OBSTACLE_FIGURES[obstacle].parts.find((one) => one.name === part)!.plaque
    for (let i = item.from; i < item.to; i++) {
      const quad = game.stage.quads[i]
      if (quad.tile === plaque) return { x: item.x + quad.x, y: item.y + quad.y }
    }
    return null
  }
  const lost = (obstacle: string, lane: Lane, n = 1): Record<string, unknown> => ({ trail: { leftovers: Array.from({ length: n }, () => ({ obstacle, lane })) } })

  it('shows a lost tier of cake in the lane the fox lost it in: on the branch, in the thorns and on the log', () => {
    expect(partAt(rig(carrying(100, 1, 'cake')).game, 'branch', 'tierOn')).toBeNull()
    for (const lane of [0, 1] as const) {
      const game = rig(carrying(100, 1, 'cake', { left: 2, ...lost('branch', lane) })).game
      expect(partAt(game, 'branch', 'tierOn')!.x, `branch, lane ${lane}`).toBeCloseTo(laneX(lane), 0)
      const thorns = rig(carrying(100, 1, 'cake', { left: 2, ...lost('brambles', lane) })).game
      expect(partAt(thorns, 'brambles', 'kebab')!.x, `thorns, lane ${lane}`).toBeCloseTo(KEBAB_AT[thornLane(lane)], 0)
      // On a post of that lane's arch: beside the tunnel the fox rolls through, never in it.
      expect(Math.abs(partAt(thorns, 'brambles', 'kebab')!.x - laneX(lane)), `thorns, lane ${lane}`).toBeGreaterThanOrEqual(9)
    }
    for (const lane of LANES) {
      const game = rig(carrying(100, 1, 'cake', { left: 2, ...lost('log', lane) })).game
      expect(partAt(game, 'log', 'tierOn')!.x, `log, lane ${lane}`).toBeCloseTo(laneX(lane), 0)
    }
  })

  it('reads the lane from the lap as it is played, and finds the tier there again from the save', () => {
    for (const lane of LANES) {
      // The top tier is tossed by a jump over the log and comes down on it.
      const r = rig(carrying(ZONES.log.from - 40, lane, 'cake'))
      r.run(0.2)
      r.down()
      let jumped = false
      for (let i = 0; i < 150; i++) {
        if (!jumped && r.game.lap.s >= ZONES.log.mid - 28) { r.game.lap.jump(); jumped = true }
        r.run(DT)
      }
      r.up()
      expect(r.game.lap.trail.leftovers, `lane ${lane}`).toEqual([{ obstacle: 'log', lane }])
      const there = partAt(r.game, 'log', 'tierOn')!
      expect(there.x).toBeCloseTo(laneX(lane), 0)
      const again = rig(r.saves[r.saves.length - 1].state)
      expect(partAt(again.game, 'log', 'tierOn')!.x).toBe(there.x)
    }
  })

  it('hangs each popped balloon as a skin on a thorn of the arch over the lane it popped in', () => {
    for (const lane of [0, 1] as const) {
      const game = rig(carrying(100, 1, 'balloons', { left: 1, ...lost('brambles', lane, 3) })).game
      for (let i = 1; i <= 3; i++) {
        const [x, y] = SKIN_AT[thornLane(lane)][i - 1]
        const skin = partAt(game, 'brambles', `skin${i}`)!
        expect(Math.abs(skin.x - x), `skin ${i}, lane ${lane}`).toBeLessThan(2.5)
        expect(Math.abs(skin.x - laneX(lane)), `skin ${i}, lane ${lane}`).toBeGreaterThanOrEqual(6)
        expect(y).toBeLessThan(CLEAR.tunnel)
      }
    }
  })

  it('pops one balloon on the frame its pop sounds: the balloon is gone and its skin is on the thorn on that frame, one at each thorn', () => {
    for (const had of [4, 2]) {
      const r = rig(carrying(ZONES.brambles.from - 30, 0, 'balloons', { left: had }))
      r.run(0.2)
      r.down()
      const shown = (): { balloons: number; skins: number } => {
        const load = r.game.stage.items.find((item) => item.key === 'load-balloons')!
        const thorns = r.game.stage.items.find((item) => item.key === 'brambles')!
        let balloons = 0, skins = 0
        for (let i = 1; i <= 4; i++) if (load.pose.parts[`balloon${i}`].show) balloons += 1
        for (let i = 1; i <= 3; i++) if (thorns.pose.parts[`skin${i}`].show) skins += 1
        return { balloons, skins }
      }
      let before = shown()
      expect(before).toEqual({ balloons: had, skins: 0 })
      const popFrames: number[] = []
      for (let i = 0; i < 150; i++) {
        const moved = r.moved.length, played = r.played.length
        r.run(DT)
        const now = shown()
        const pops = r.moved.slice(moved).filter((one) => one.what === 'pop' || (one.event?.type === 'gag' && one.event.gag === 'pops')).length
        // Never two on one frame, and nothing vanishes on a frame with no pop.
        expect(pops).toBeLessThanOrEqual(1)
        expect(before.balloons - now.balloons, `frame ${i}, with ${had}`).toBe(pops)
        expect(now.skins - before.skins, `frame ${i}, with ${had}`).toBe(pops)
        if (pops === 1) {
          // The finger lifts at the first thorn, so the fox is not run into the thorns a second time.
          r.up()
          popFrames.push(r.frame)
          // It is heard on that frame.
          expect(r.played.slice(played).some((one) => one.frame === r.frame && one.notes.length > 0)).toBe(true)
        }
        before = now
      }
      const popped = Math.min(3, had)
      expect(popFrames, `with ${had}`).toHaveLength(popped)
      expect(before).toEqual({ balloons: had - popped, skins: popped })
      // The save held the outcome from the first pop on: put away between two pops, it is found as it ends.
      const first = r.saves.find((one) => one.state.trail.leftovers.length > 0)!
      expect(first.state.left).toBe(had - popped)
      expect(first.state.trail.leftovers).toHaveLength(popped)
      expect(first.frame).toBe(popFrames[0])
    }
  })
})

describe('what the fox and the five do, pose by pose', () => {
  it('pokes whoever the press that begins the next lap lands on, as a press on them does everywhere', () => {
    const r = arrive('balloons')
    r.run(LONGEST + 1)
    const at = middleOf(r.game, 'hedgehog')
    let from = r.moved.length
    r.down(at.x, at.y)
    const did = r.moved.slice(from)
    expect(did.map((one) => one.what)).toContain('begin')
    expect(did.filter((one) => one.event?.type === 'poke').map((one) => one.event)).toEqual([{ type: 'poke', who: 'hedgehog' }])
    expect(r.game.lap.finished).toBe(false)
    r.up()
    // A press on nobody begins the lap and pokes nobody.
    const plain = arrive('balloons')
    plain.run(LONGEST + 1)
    from = plain.moved.length
    plain.down()
    expect(plain.moved.slice(from).map((one) => one.what)).toContain('begin')
    expect(plain.moved.slice(from).some((one) => one.event?.type === 'poke')).toBe(false)
  })

  it('shows the roll at the very next showing when the load lies under the branch or under the thorns, and the plain press when it lies anywhere else', () => {
    const firstShowing = (lies: { at: number; lane: Lane }): { slide: number; up: number; down: number } => {
      const r = rig(carrying(lies.at - 70, 1, 'cake', { lies }))
      expect(r.game.lap.carrying).toBe(false)
      const seen = { slide: 0, up: 0, down: 0 }
      for (let t = 0; t < IDLE_BEFORE_DEMO + DEMO_SECONDS + 0.2; t += DT) {
        r.run(DT)
        seen.slide = Math.max(seen.slide, r.game.hint.slide)
        seen.up = Math.max(seen.up, r.game.hint.flick)
        seen.down = Math.max(seen.down, -r.game.hint.flick)
      }
      return seen
    }
    for (const name of ['branch', 'brambles'] as const) {
      const seen = firstShowing(ZONES[name].worst)
      expect(seen.down, name).toBeGreaterThan(0.9)
      expect(seen, name).toMatchObject({ slide: 0, up: 0 })
    }
    for (const name of ['stream', 'mud', 'log'] as const) expect(firstShowing(ZONES[name].worst), name).toEqual({ slide: 0, up: 0, down: 0 })
  })

  it('gives the dive a pose of its own: upside down, arms out past its ears, legs straight, where a jump has its legs tucked', () => {
    const r = rig(save({ at: 240, lane: 1 }))
    r.run(0.2)
    r.down()
    r.run(0.2)
    r.game.lap.jump()
    r.run(0.25)
    const fox = (): Game['stage']['items'][number] => r.game.stage.items.find((item) => item.key === 'fox')!
    expect(r.game.lap.air).toBe(true)
    const jump = fox().pose
    expect(Math.abs(jump.tilt)).toBeLessThan(0.5)
    expect(Math.abs(jump.parts.legLeft.turn)).toBeGreaterThan(0.3)
    expect(Math.abs(jump.parts.armLeft.turn)).toBeLessThan(2.4)
    r.game.lap.tuck()
    r.run(DT)
    expect(r.game.lap.diving).toBe(true)
    let dived = 0
    while (r.game.lap.diving) {
      const dive = fox().pose
      dived += 1
      expect(Math.abs(dive.tilt)).toBeCloseTo(Math.PI, 6)
      expect(Math.abs(dive.parts.armLeft.turn)).toBe(DIVE_ARMS)
      expect(Math.abs(dive.parts.armRight.turn)).toBe(DIVE_ARMS)
      expect(dive.parts.legLeft.turn).toBe(0)
      expect(dive.parts.legRight.turn).toBe(0)
      r.run(DT)
    }
    expect(dived).toBeGreaterThanOrEqual(2)
    // It ends in a roll, which is not the dive's pose.
    expect(r.game.lap.roll).toBeGreaterThan(0)
  })

  it('has the bear lick the crumbs off the fox\'s hands where the cake was eaten: the fox holds them out to its side and the bear leans over to them', () => {
    const r = arrive('cake', { left: 0 })
    const item = (key: string): Game['stage']['items'][number] => r.game.stage.items.find((one) => one.key === key)!
    expect(item('fox').pose.parts.crumbs.show).toBe(false)
    for (let i = 0; i < 600 && !r.moved.some((one) => one.what === 'bear.crumbs'); i++) r.run(DT)
    expect(r.moved.some((one) => one.what === 'bear.crumbs')).toBe(true)
    const bear = item('bear')
    // Which side of the fox the bear has come to stand on.
    const side = Math.sign(bear.x + bear.pose.x - r.game.lap.x)
    expect(side).not.toBe(0)
    const before = { min: bear.x + bear.bounds.minX, max: bear.x + bear.bounds.maxX }
    let shown = 0, reached = 0
    for (let i = 0; i < 45; i++) {
      r.run(DT)
      const fox = item('fox'), now = item('bear')
      if (fox.pose.parts.crumbs.show) {
        shown += 1
        // On the hands it holds out, towards the bear.
        expect(Math.sign(fox.pose.parts.crumbs.dx)).toBe(side)
        expect(Math.abs(fox.pose.parts.armLeft.turn) + Math.abs(fox.pose.parts.armRight.turn)).toBeGreaterThan(0)
      }
      // The bear comes over the fox's hands: its near edge is nearer the fox than it stood.
      reached = Math.max(reached, side > 0 ? before.min - (now.x + now.bounds.minX) : now.x + now.bounds.maxX - before.max)
    }
    expect(shown).toBeGreaterThan(30)
    expect(reached).toBeGreaterThan(4)
    // Licked clean: nothing is left on the fox's hands, then or when the game is found again.
    r.run(LONGEST)
    expect(item('fox').pose.parts.crumbs.show).toBe(false)
    expect(rig(r.saves[r.saves.length - 1].state).game.stage.items.find((one) => one.key === 'fox')!.pose.parts.crumbs.show).toBe(false)
    // Ended by a touch while they are held out, they are gone on that frame.
    const cut = arrive('cake', { left: 0 })
    for (let i = 0; i < 600 && !cut.moved.some((one) => one.what === 'bear.crumbs'); i++) cut.run(DT)
    cut.run(0.3)
    expect(cut.game.stage.items.find((one) => one.key === 'fox')!.pose.parts.crumbs.show).toBe(true)
    cut.down()
    cut.run(DT)
    expect(cut.game.stage.items.find((one) => one.key === 'fox')!.pose.parts.crumbs.show).toBe(false)
  })

  it('shows the bucket\'s water as water: a body of it leaves the pail on the frame of the slop, comes down in the fox\'s lane and spreads flat', () => {
    const slopOf = (r: Rig): Game['stage']['items'][number] | undefined => r.game.stage.items.find((item) => item.key === 'slop')
    const r = rig(carrying(ZONES.mud.from - 2 * 20, 2, 'bucket', { left: 3 }))
    r.run(0.2)
    r.down()
    let jumped = false
    const seen: { frame: number; y: number; sy: number; x: number; lands: number }[] = []
    let puddle = -1
    for (let i = 0; i < 200; i++) {
      if (!jumped && r.game.lap.s >= ZONES.mud.mid - 28) { r.game.lap.jump(); jumped = true }
      const moved = r.moved.length
      r.run(DT)
      if (r.moved.slice(moved).some((one) => one.event?.type === 'gag' && one.event.gag === 'puddle')) puddle = r.frame
      const slop = slopOf(r)
      if (slop) seen.push({ frame: r.frame, y: slop.y, sy: slop.pose.sy, x: slop.x, lands: slop.s - SLOP_IN_FRONT })
    }
    expect(puddle).toBeGreaterThan(0)
    expect(seen[0].frame).toBe(puddle)
    expect(seen.length).toBeGreaterThanOrEqual(Math.floor((SLOP_FALLS + SLOP_SPREADS) / DT) - 1)
    expect(seen.length).toBeLessThanOrEqual(Math.ceil((SLOP_FALLS + SLOP_SPREADS) / DT) + 1)
    // Out of the pail over the fox's head, down to the mud, and flat there.
    expect(seen[0].y).toBeGreaterThan(CLEAR.fox)
    expect(seen[seen.length - 1].y).toBeLessThan(1)
    expect(seen[0].sy).toBe(1)
    expect(seen[seen.length - 1].sy).toBeLessThan(0.5)
    for (const one of seen) expect(one.x).toBe(laneX(2))
    // It comes down well on the mud, half a step in or more, not at its edge and not on the trail before it.
    expect(seen[seen.length - 1].lands).toBeGreaterThan(ZONES.mud.from + 10)
    expect(seen[seen.length - 1].lands).toBeLessThan(ZONES.mud.to)
    // The bucket on its head at the branch: what was in it comes down over the fox on that frame. An empty one pours nothing.
    for (const left of [2, 0]) {
      const bonk = rig(carrying(ZONES.branch.from - 30, 0, 'bucket', { left }))
      bonk.run(0.2)
      bonk.down()
      let poured = 0, doused = -1, first = -1
      for (let i = 0; i < 120; i++) {
        const moved = bonk.moved.length
        bonk.run(DT)
        if (bonk.moved.slice(moved).some((one) => one.what === 'douse')) doused = bonk.frame
        if (slopOf(bonk)) {
          poured += 1
          if (first < 0) first = bonk.frame
        }
      }
      expect(poured > 0, `with ${left}`).toBe(left > 0)
      expect(first, `with ${left}`).toBe(doused)
    }
    // A cake tossed by a jump is no water.
    const cake = rig(carrying(240, 1, 'cake'))
    cake.run(0.2)
    cake.down()
    cake.game.lap.jump()
    for (let i = 0; i < 60; i++) {
      cake.run(DT)
      expect(slopOf(cake)).toBeUndefined()
    }
  })
})
