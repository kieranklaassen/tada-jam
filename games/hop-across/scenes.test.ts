import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { CLOTH_COL } from './board'
import { RIGHT, playUntil, visitAt } from './careful'
import { DUCK_POST } from './layout'
import { hop, startShowing } from './play'
import { boardOf, type Saved } from './save'
import { Scene, sceneLength, type Beat } from './scene'
import { sceneryOf } from './scenery'
import { picnic, showing, slide, type Theatre } from './scenes'
import { BoardView, LONG_AGO } from './view'
import { DUST_OFF, WAKE, bellNotes } from './voices'

// Each scene only shows what the save already holds. So a touch that ends it at any moment, and a load that never
// saw it, must leave the same picture: the view after `finish` is compared with a view set up from the save.

type Stage = { view: BoardView; theatre: Theatre; clock: { now: number }; heard: Note[]; slides: number[] }
function stage(saved: Saved): Stage {
  const view = new BoardView()
  view.reset(boardOf(saved), sceneryOf(saved), saved.finished)
  const clock = { now: 10 }, heard: Note[] = [], slides: number[] = []
  return { view, clock, heard, slides, theatre: { view, now: () => clock.now, sound: (notes) => { heard.push(...notes) }, slideOver: () => { slides.push(clock.now) } } }
}
/** Plays `beats` up to `cut` seconds in frames, then lands the rest as a touch does. Returns what the touch itself made heard. */
function cutAt(on: Stage, beats: Beat[], cut: number): number {
  const scene = new Scene(beats)
  const from = on.clock.now
  scene.start(from, () => {})
  for (let t = 0; t <= cut; t += 1 / 30) {
    on.clock.now = from + t
    scene.update(on.clock.now)
  }
  const before = on.heard.length
  scene.finish()
  expect(scene.running).toBe(false)
  return on.heard.length - before
}
/** Where the view draws each of the family once everything has come to rest. */
const places = (view: BoardView, time: number) => view.pawns.map((_, who) => { const at = view.where(who, time); return [Math.round(at.x), Math.round(at.y)] })
const asLoaded = (saved: Saved): BoardView => {
  const view = new BoardView()
  view.reset(boardOf(saved), sceneryOf(saved), saved.finished)
  if (saved.finished) view.served()
  return view
}

describe('the duck\'s showing', () => {
  it('leaves the lane as the save has it and the duck at its post, whenever a touch ends it, and the touch that ends it is silent', () => {
    for (const position of ['cars', 'lorry', 'logs', 'turtle', 'bell']) {
      const saved = visitAt(position, 1, true)
      const started = startShowing(saved)!
      const lanes = boardOf(saved).lanes
      const whole = sceneLength(showing(started.show, lanes[started.show.col], stage(saved).theatre))
      expect(whole).toBeLessThan(9)
      for (const cut of [0, 0.3, 1.2, 2.1, 3.4, whole + 1]) {
        const on = stage(saved)
        const landed = cutAt(on, showing(started.show, lanes[started.show.col], on.theatre), cut)
        expect(landed, `${position} cut at ${cut}`).toBe(0)
        expect(on.view.board, `${position} cut at ${cut}`).toEqual(boardOf(started.saved))
        const duck = on.view.duckWhere(on.clock.now + 5)
        expect([duck.x, duck.y]).toEqual([DUCK_POST.x, DUCK_POST.y])
        expect(places(on.view, on.clock.now + 5)).toEqual(places(asLoaded(started.saved), 0))
      }
      // Watched to its end, the duck is heard: its quack, its steps and what the thing did to it.
      const on = stage(saved)
      cutAt(on, showing(started.show, lanes[started.show.col], on.theatre), whole + 1)
      expect(on.heard.length).toBeGreaterThan(8)
    }
  })
})

describe('the duck on the bell plate', () => {
  it('is heard with the train it wakes: the bell, and the snort and peep of the waking', () => {
    const saved = visitAt('bell', 1, true)
    const started = startShowing(saved)!
    const rang = started.show.steps.findIndex((step) => step.rang)
    expect(rang).toBeGreaterThanOrEqual(0)
    expect(started.show.steps[rang].events.some((event) => event.type === 'wake')).toBe(true)
    const on = stage(saved)
    const beats = showing(started.show, boardOf(saved).lanes[started.show.col], on.theatre)
    cutAt(on, beats, sceneLength(beats) + 1)
    const heard = (notes: readonly Note[]) => notes.every((note) => on.heard.some((one) => one.kind === note.kind && one.frequency === note.frequency && one.decay === note.decay))
    expect(heard(bellNotes(1))).toBe(true)
    expect(heard(WAKE)).toBe(true)
  })
})

describe('the picnic', () => {
  it('leaves everyone served and the stand bare, whenever a touch ends it', () => {
    const { turn } = playUntil(visitAt('cars', 1), (one) => one.picnic)!
    const arrived = ['dry', 'wet', 'tracked', 'dry'] as const
    const whole = sceneLength(picnic(arrived, stage(turn.saved).theatre))
    for (const cut of [0, 0.5, 1.4, 3, whole + 1]) {
      const on = stage({ ...turn.saved, finished: false })
      on.view.finished = false
      const landed = cutAt(on, picnic(arrived, on.theatre), cut)
      expect(landed).toBe(0)
      expect(on.view.finished).toBe(true)
      expect(on.view.picnic.served).toBe(5)
      expect(on.view.pawns.every((pawn) => pawn.sliceAt !== null)).toBe(true)
      expect(places(on.view, on.clock.now + 5)).toEqual(places(asLoaded(turn.saved), 0))
    }
  })

  it('has a tyre-marked one dust the track off its own tummy with an ear while the brushing is heard, and nobody else', () => {
    const { turn } = playUntil(visitAt('cars', 1), (one) => one.picnic)!
    const arrived = ['dry', 'wet', 'tracked', 'dry'] as const
    const on = stage({ ...turn.saved, finished: false })
    on.view.finished = false
    on.view.pawns[2].trackHops = 2
    const scene = new Scene(picnic(arrived, on.theatre))
    const from = on.clock.now
    scene.start(from, () => {})
    // Its turn comes 0.95 + 2 × 0.78 seconds in, and the dusting half a second after the laugh.
    for (let t = 0; t <= 2.6; t += 1 / 30) { on.clock.now = from + t; scene.update(on.clock.now) }
    const dustAt = on.view.pawns[2].dustAt
    expect(dustAt).toBeGreaterThan(from + 2.9)
    expect(dustAt).toBeLessThan(from + 3.2)
    expect(on.view.pawns[2].trackOff).toBe(dustAt)
    expect(on.view.pawns.filter((pawn) => pawn.dustAt > LONG_AGO)).toHaveLength(1)
    expect(on.heard.some((note) => note.frequency === DUST_OFF[0].frequency && note.decay === DUST_OFF[0].decay)).toBe(true)
    // The ear is drawn across its tummy while it dusts, and at no other time.
    const ears = (time: number): number => {
      let last = [NaN, NaN], found = 0
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (target, name: string) => name in target ? target[name] : name === 'createRadialGradient' || name === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (...args: number[]) => {
          if (name === 'translate') last = [args[0], args[1]]
          // The dusting ear turns about the side of the head.
          if (name === 'rotate' && last[0] === -25 && last[1] === -60) found++
        },
        set: (target, name: string, value) => { target[name] = value; return true },
      }) as unknown as CanvasRenderingContext2D
      on.view.draw(ctx, time, 1 / 60, null, true)
      return found
    }
    expect(ears(dustAt - 0.05)).toBe(0)
    expect(ears(dustAt + 0.1)).toBe(1)
    expect(ears(dustAt + 0.3)).toBe(1)
    expect(ears(dustAt + 0.6)).toBe(0)
    // A touch ends it with nobody dusting.
    scene.finish()
    expect(on.view.pawns.every((pawn) => pawn.dustAt === LONG_AGO)).toBe(true)
  })

  it('gives the last slice to whoever arrived in the worst state: a tyre track before wet, and the last in line when all are dry', () => {
    const { turn } = playUntil(visitAt('cars', 1), (one) => one.picnic)!
    const extra = (arrived: readonly ('wet' | 'tracked' | 'dry')[]) => {
      const on = stage({ ...turn.saved, finished: false })
      cutAt(on, picnic(arrived, on.theatre), 60)
      return on.view.pawns.findIndex((pawn) => pawn.extraAt !== null)
    }
    expect(extra(['dry', 'wet', 'tracked', 'dry'])).toBe(2)
    expect(extra(['dry', 'wet', 'dry', 'wet'])).toBe(1)
    expect(extra(['dry', 'dry', 'dry', 'dry'])).toBe(3)
  })
})

describe('the tip and the slide', () => {
  it('leave the next crossing on the board with the family in its line, whenever a touch ends them', () => {
    const reached = playUntil(visitAt('logs', 1), (turn) => turn.saved.family[0].c === CLOTH_COL)!
    const turn = hop(reached.turn.saved, RIGHT)
    expect(turn.slide!.tipped.length).toBeGreaterThan(0)
    const scenery = sceneryOf(turn.saved)
    const whole = sceneLength(slide(turn.slide!.tipped, turn.slide!.board, scenery, stage(reached.turn.saved).theatre))
    for (const cut of [0, 0.6, 1.3, 2.2, 2.9, whole + 1]) {
      const on = stage(reached.turn.saved)
      on.view.apply(turn.board, turn.events, on.clock.now)
      const landed = cutAt(on, slide(turn.slide!.tipped, turn.slide!.board, scenery, on.theatre), cut)
      expect(landed, `cut at ${cut}`).toBe(0)
      expect(on.slides, `cut at ${cut}`).toHaveLength(1)
      expect(on.view.prev).toBeNull()
      expect(on.view.leaf).toBe(0)
      expect(on.view.slid).toBe(0)
      expect(on.view.board).toEqual(boardOf(turn.saved))
      expect(on.view.scenery).toEqual(scenery)
      expect(places(on.view, on.clock.now + 5), `cut at ${cut}`).toEqual(places(asLoaded(turn.saved), 0))
    }
  })

  it('lifts the leaf only when somebody was left behind', () => {
    const { turn: last } = playUntil(visitAt('cars', 1), (one) => one.picnic)!
    const turn = hop(last.saved, RIGHT)
    expect(turn.slide!.tipped).toEqual([])
    const on = stage(last.saved)
    on.view.apply(turn.board, turn.events, on.clock.now)
    const scene = new Scene(slide([], turn.slide!.board, sceneryOf(turn.saved), on.theatre))
    scene.start(on.clock.now, () => {})
    let lifted = 0, slid = 0
    for (let t = 0; scene.running && t < 10; t += 1 / 30) {
      on.clock.now = 10 + t
      scene.update(on.clock.now)
      lifted = Math.max(lifted, on.view.leaf)
      slid = Math.max(slid, on.view.slid)
    }
    expect(lifted).toBe(0)
    expect(slid).toBeGreaterThan(100)
    expect(on.slides).toHaveLength(1)
  })
})
