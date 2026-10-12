import { describe, expect, it } from 'vitest'
import { BERRY, firstWorld } from './first'
import { SUN } from './ground'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW } from './guidance'
import { CORNER } from './overlay'
import { Play } from './play'
import { STAGE } from './stage'
import { bare, copy, run, surface } from './testing'
import { STEP, Toy, type World } from './toy'
import type { Sound } from './voices'

// What the Mount does with fingers, frames and a put-away, held without a browser.

type Heard = { sounds: Sound[]; scene: boolean }
function table(world: World = firstWorld(null), width: number = STAGE.width, height: number = STAGE.height) {
  const out = { heard: [] as Heard[], hushed: 0, saved: [] as boolean[], settled: 0 }
  const play = new Play({
    speak: (sounds, scene) => void out.heard.push({ sounds, scene }),
    hush: () => void out.hushed++,
    save: (now) => void out.saved.push(now),
    settle: () => void out.settled++,
  })
  play.width = width
  play.height = height
  play.toy = new Toy(copy(world), 1)
  let ms = 0, seconds = 0
  /** Frames of attended play, as the loop makes them. */
  const frames = (s: number): void => {
    for (let i = 0; i < Math.round(s / STEP); i++) {
      ms += 1000 * STEP
      seconds += STEP
      play.frame(ms, STEP, seconds)
    }
  }
  const names = (): string[] => out.heard.splice(0).flatMap((h) => h.sounds.map((s) => s.name))
  return {
    play, out, frames, names,
    toy: play.toy,
    now: () => ({ ms, seconds }),
    down: (x: number, y: number, id = 1) => play.down(id, { x, y }, ms, seconds),
    move: (x: number, y: number, id = 1) => play.move(id, { x, y }),
    up: (x: number, y: number, id = 1) => play.up(id, { x, y }, ms),
    guidance: () => play.ladder.update(seconds),
  }
}
type Table = ReturnType<typeof table>
const dragTo = (t: Table, x0: number, y0: number, x1: number, y1: number): void => {
  t.down(x0, y0)
  for (let i = 1; i <= 8; i++) t.move(x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8)
}

describe('a touch', () => {
  it('sets a carried thing down in the handler of the lift, with no frame between', () => {
    const t = table()
    dragTo(t, 560, 606, 420, 300)
    t.up(420, 300)
    const block = t.toy.pieces.find((p) => p.len === 150)!
    expect(block.mode).toBe('fall')
    expect(t.toy.hand).toBeNull()
    expect(t.play.touch.active).toBe(false)
    expect(t.out.saved).toContain(true)
  })

  it('cracks a block out in the handler of the lift, and carries the line on when the finger comes straight back', () => {
    const t = table(bare())
    dragTo(t, 460, 668, 540, 668)
    t.names()
    t.up(540, 668)
    expect(t.names()).toEqual(['crack'])
    expect(t.toy.holes).toHaveLength(1)
    // The finger skipped: it is back inside the grace, near where it left.
    t.frames(0.1)
    t.down(545, 668)
    t.move(640, 668)
    expect(t.toy.holes).toHaveLength(0)
    t.up(640, 668)
    t.frames(0.5)
    expect(t.toy.holes).toHaveLength(1)
    expect(t.toy.holes[0].len).toBe(180)
    expect(t.toy.pieces).toHaveLength(2)
  })

  it('that the browser takes away never acts for the child: nothing is set down, cut, packed or pulled', () => {
    for (const [x0, y0, x1, y1] of [[560, 606, 420, 300], [300, 700, 440, 690], [962, 556, 800, 580], [SUN.x, SUN.day, SUN.x, SUN.night]]) {
      const t = table()
      const before = copy(t.toy.world())
      dragTo(t, x0, y0, x1, y1)
      t.play.cancel(1)
      t.frames(1)
      expect(t.toy.world(), `a drag from ${x0},${y0}`).toEqual(before)
      expect(t.toy.sceneRunning).toBe(false)
      expect(t.toy).toMatchObject({ hand: null, cut: null, lastCut: null, scoop: null, sunHand: null, finger: null })
    }
    // A press that is taken away before it moves is no tap either.
    const t = table()
    const before = copy(t.toy.world())
    t.down(560, 606)
    t.play.cancel(1)
    expect(t.toy.world()).toEqual(before)
    expect(t.toy.hand).toBeNull()
  })

  it('leaves no pending flag behind: after every kind of touch the toy holds nothing of it', () => {
    const t = table()
    const idle = { hand: null, cut: null, scoop: null, sunHand: null, finger: null }
    t.down(560, 606); t.up(560, 606)
    expect(t.toy).toMatchObject(idle)
    dragTo(t, 560, 606, 420, 300); t.up(420, 300)
    expect(t.toy).toMatchObject(idle)
    dragTo(t, 300, 700, 440, 690); t.up(440, 690)
    t.frames(0.5)
    expect(t.toy).toMatchObject({ ...idle, lastCut: null })
    dragTo(t, 962, 556, 800, 580); t.up(800, 580)
    expect(t.toy).toMatchObject(idle)
    dragTo(t, SUN.x, SUN.day, SUN.x, SUN.day + 40); t.up(SUN.x, SUN.day + 40)
    expect(t.toy).toMatchObject(idle)
    expect(t.play.touch.active).toBe(false)
  })
})

describe('the grown-up’s corner', () => {
  it.each([[STAGE.width, STAGE.height], [667, 375], [390, 844], [1600, 900]])('answers nothing on a surface of %i by %i, whatever the stage has under it, and does not take the idle ladder back', (width, height) => {
    const t = table(firstWorld(null), width, height)
    t.frames(IDLE_BEFORE_GLOW + 0.5)
    const sunk = copy(surface(t.toy))
    const glow = t.guidance().glow
    expect(glow).toBeGreaterThan(0)
    t.down(width - CORNER / 2, CORNER / 2)
    t.move(width - CORNER / 2 - 30, CORNER / 2 + 30)
    t.up(width - CORNER / 2 - 30, CORNER / 2 + 30)
    expect(t.names()).toEqual([])
    expect(surface(t.toy)).toEqual(sunk)
    expect(t.guidance().glow).toBeGreaterThanOrEqual(glow)
    t.frames(0.5)
    expect(t.guidance().glow).toBeGreaterThan(0)
    // Just outside the corner the same touch is the child's: it is answered and the ladder goes back to the bottom.
    t.down(width - CORNER - 20, CORNER + 20)
    expect(t.names().length).toBeGreaterThan(0)
    t.up(width - CORNER - 20, CORNER + 20)
    expect(t.guidance().glow).toBe(0)
  })
})

describe('idleness', () => {
  it('is not ended by anything a character does by itself: the hare crosses, the king dozes and the ladder climbs on', () => {
    const t = table(bare())
    t.frames(IDLE_BEFORE_DEMO + 0.5)
    expect(t.guidance().demo).not.toBeNull()
    // Sixteen seconds in, the hare is crossing; the ladder was never taken back, and its second showing has come.
    t.frames(12.5)
    expect(t.toy.time).toBeGreaterThan(16)
    expect(t.guidance().demoIndex).toBe(1)
  })

  it('is not counted while a finger works or a scene plays', () => {
    const t = table()
    dragTo(t, SUN.x, SUN.day, SUN.x, SUN.night + 10)
    t.frames(IDLE_BEFORE_DEMO + 1)
    expect(t.guidance()).toMatchObject({ glow: 0, demo: null })
    t.up(SUN.x, SUN.night + 10)
    expect(t.toy.sceneRunning).toBe(true)
    t.frames(IDLE_BEFORE_DEMO + 1)
    expect(t.guidance()).toMatchObject({ glow: 0, demo: null })
  })
})

describe('a scene’s sound', () => {
  it('goes where a touch can cut it, and the touch that ends the scene cuts it in that call and is itself heard', () => {
    const t = table()
    dragTo(t, SUN.x, SUN.day, SUN.x, SUN.night + 10)
    t.up(SUN.x, SUN.night + 10)
    t.out.heard.length = 0
    t.frames(2.5)
    expect(t.out.heard.length).toBeGreaterThan(0)
    expect(t.out.heard.every((h) => h.scene)).toBe(true)
    expect(t.out.hushed).toBe(0)
    t.out.heard.length = 0
    t.down(360, 720)
    expect(t.out.hushed).toBe(1)
    expect(t.out.heard.map((h) => [h.sounds.map((s) => s.name), h.scene])).toEqual([[['bite'], false]])
    t.up(360, 720)
    t.out.heard.length = 0
    t.frames(4)
    expect(t.out.heard.filter((h) => h.scene)).toEqual([])
  })
})

describe('put away', () => {
  it('closes every sound, takes the idle ladder back, forgets what was flying and saves at once', () => {
    const t = table()
    t.frames(IDLE_BEFORE_DEMO + 0.5)
    expect(t.guidance().demo).not.toBeNull()
    t.out.saved.length = 0
    t.play.rest(t.now().seconds)
    expect(t.out).toMatchObject({ hushed: 1, settled: 1, saved: [true] })
    expect(t.guidance()).toMatchObject({ glow: 0, demo: null })
    expect(t.names()).toEqual([])
  })

  // Parked equals loaded: put away at any instant, what is on the surface is what a load of the save shows.
  const states: [string, (t: Table) => void][] = [
    ['at rest', () => {}],
    ['with a block in the hand', (t) => dragTo(t, 560, 606, 420, 300)],
    ['with a block falling to the bank', (t) => { dragTo(t, 560, 606, 420, 200); t.up(420, 200); t.frames(0.1) }],
    ['with a line under the finger', (t) => dragTo(t, 300, 700, 440, 690)],
    ['with a block hopping out of the pond', (t) => { dragTo(t, 300, 700, 440, 690); t.up(440, 690); t.frames(0.1) }],
    ['with a block going under', (t) => { dragTo(t, 560, 606, 560, 672); t.up(560, 672); t.frames(0.2) }],
    ['with the berry block afloat and the fish staring', (t) => { dragTo(t, BERRY.x, BERRY.y, 560, 672); t.up(560, 672); t.frames(2) }],
    ['with a scoop under way', (t) => dragTo(t, 962, 556, 800, 580)],
    ['with a thumb warming a block', (t) => { t.down(560, 606); t.frames(1) }],
    ['with a hat on the king', (t) => { dragTo(t, 560, 606, 1034, 200); t.up(1034, 200); t.frames(1) }],
    ['with the sun in the hand', (t) => dragTo(t, SUN.x, SUN.day, SUN.x, SUN.day + 60)],
    ['in the first second of dusk', (t) => { dragTo(t, SUN.x, SUN.day, SUN.x, SUN.night + 10); t.up(SUN.x, SUN.night + 10); t.frames(0.7) }],
    ['with the lamps half hung', (t) => { dragTo(t, SUN.x, SUN.day, SUN.x, SUN.night + 10); t.up(SUN.x, SUN.night + 10); t.frames(3.2) }],
    ['with the king walking in', (t) => { dragTo(t, SUN.x, SUN.day, SUN.x, SUN.night + 10); t.up(SUN.x, SUN.night + 10); t.frames(6) }],
    ['at night, the ending', (t) => { dragTo(t, SUN.x, SUN.day, SUN.x, SUN.night + 10); t.up(SUN.x, SUN.night + 10); t.frames(14) }],
    ['in the middle of morning', (t) => { dragTo(t, SUN.x, SUN.day, SUN.x, SUN.night + 10); t.up(SUN.x, SUN.night + 10); t.frames(12); dragTo(t, SUN.x, SUN.night - 20, SUN.x, SUN.day - 10); t.up(SUN.x, SUN.day - 10); t.frames(3.4) }],
    ['with the ghost hand showing', (t) => t.frames(IDLE_BEFORE_DEMO + 1)],
    ['with a character in the middle of its reaction', (t) => { t.down(1034, 330); t.up(1034, 330); t.frames(0.3) }],
  ]
  it.each(states)('%s: what is left on the surface is what a load of the save shows', (_, reach) => {
    const t = table()
    reach(t)
    t.play.rest(t.now().seconds)
    const loaded = new Toy(copy(t.toy.world()), 2)
    expect(surface(t.toy)).toEqual(surface(loaded))
    // And both go on the same way: no scene replays, nothing lands late and nothing is heard.
    t.out.heard.length = 0
    t.frames(3)
    run(loaded, 3)
    expect(t.out.heard).toEqual([])
    expect(t.toy.world()).toEqual(loaded.world())
    expect(t.toy.sceneRunning).toBe(false)
  })
})
