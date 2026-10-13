import { describe, expect, it } from 'vitest'
import { loaded, strip, townWith, written } from './bench'
import { Desk } from './desk'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW } from './guidance'
import { CORNER } from './overlay'
import { STAGE } from './stage'

// The Mount's own logic: the grown-up's corner, a cancel, the idle ladder,
// a scene cut by a touch, and put-away.

const W = STAGE.width, H = STAGE.height

function desk(town = townWith([strip(0, 330, 300, 900, 300)], { car: { x: 420, y: 300, a: 0 } })) {
  const at = new Desk()
  at.size(W, H)
  at.open(town)
  return at
}

/** Runs frames of a sixtieth from `from` seconds. Returns the last guidance and every sound heard. */
function frames(at: Desk, from: number, seconds: number) {
  let guidance = at.frame(from * 1000, from, 0)
  const heard: string[] = []
  for (let k = 1; k <= Math.round(seconds * 60); k++) {
    const now = from + k / 60
    guidance = at.frame(now * 1000, now, 1 / 60)
    heard.push(...at.take().sounds.map((sound) => sound.name))
  }
  return { guidance: { ...guidance }, heard }
}

describe('the top right corner belongs to the grown-ups', () => {
  it('a finger there answers nothing: no sound, no change, however it moves and wherever it lifts', () => {
    const at = desk(), before = JSON.stringify(at.town!.saved())
    at.down(1, { x: W - CORNER / 2, y: CORNER / 2 }, 0, 10)
    at.move(1, { x: W - 300, y: 300 })
    at.move(1, { x: 600, y: 500 })
    at.up(1, { x: 600, y: 500 }, 400)
    const out = at.take()
    expect(out.sounds).toEqual([])
    expect(out.changed).toBe('no')
    expect(JSON.stringify(at.town!.saved())).toBe(before)
    expect(at.town!.finger).toBeNull()
  })

  it('a finger there does not take the idle ladder back, held or lifted', () => {
    const at = desk()
    frames(at, 0, IDLE_BEFORE_GLOW + 1.5)
    at.down(1, { x: W - 10, y: 10 }, 0, IDLE_BEFORE_GLOW + 1.5)
    const held = frames(at, IDLE_BEFORE_GLOW + 1.5, 1)
    expect(held.guidance.glow).toBeGreaterThan(0)
    at.up(1, { x: W - 10, y: 10 }, 1000)
    expect(frames(at, IDLE_BEFORE_GLOW + 2.5, 0.2).guidance.glow).toBeGreaterThan(0)
  })

  it('just outside the corner the same finger lays tape', () => {
    const at = desk()
    at.down(1, { x: W - CORNER - 150, y: CORNER + 150 }, 0, 0)
    at.up(1, { x: W - CORNER - 150, y: CORNER + 150 }, 100)
    expect(at.take().sounds.map((sound) => sound.name)).toContain('stick')
  })
})

describe('a touch that is taken away', () => {
  it('pointer cancel never acts for the child: no strip from a press, none from a drag, and a toy in the hand goes back', () => {
    const at = desk()
    at.down(1, { x: 500, y: 500 }, 0, 0)
    at.cancel(1)
    expect(at.town!.state.strips.length).toBe(1)
    at.down(2, { x: 500, y: 500 }, 0, 0)
    at.move(2, { x: 800, y: 520 })
    at.cancel(2)
    expect(at.town!.state.strips.length).toBe(1)
    at.down(3, { x: 630, y: 645 }, 0, 0)
    at.move(3, { x: 600, y: 420 })
    at.cancel(3)
    expect(at.town!.bodies.duck.at).toMatchObject({ x: 630, y: 645 })
    expect(at.town!.bodies.duck.doing.is).toBe('stand')
    at.down(4, { x: 332, y: 300 }, 0, 0)
    at.move(4, { x: 600, y: 300 })
    at.cancel(4)
    expect(at.town!.state.strips.length).toBe(1)
    expect(at.town!.grip).toBeNull()
  })

  it('a tap may last as long as a small finger takes: down for 0.45 s and up is still a tap, and lays its stub', () => {
    const at = desk()
    at.down(1, { x: 500, y: 500 }, 0, 0)
    frames(at, 0, 0.45)
    at.up(1, { x: 503, y: 502 }, 450)
    expect(at.town!.state.strips.length).toBe(2)
  })
})

describe('the idle ladder', () => {
  it('a toy going about its habit never takes the ladder back: the car drives and the hint still comes', () => {
    const at = desk()
    at.down(1, { x: 884, y: 762 }, 0, 0)
    at.up(1, { x: 884, y: 762 }, 50)
    const run = frames(at, 0, IDLE_BEFORE_DEMO + 0.5)
    expect(run.heard).toContain('purr')
    expect(at.town!.moving).toBe(true)
    expect(run.guidance.demo).not.toBeNull()
  })

  it('a finger at work keeps the ladder at the bottom, and so does a scene the finger started', () => {
    const at = desk()
    at.down(1, { x: 500, y: 500 }, 0, 0)
    expect(frames(at, 0, IDLE_BEFORE_GLOW + 2).guidance.glow).toBe(0)
    at.up(1, { x: 500, y: 500 }, 9000)
  })

  it('put away, the ladder is taken back: nothing glows the moment the game is opened again', () => {
    const at = desk()
    const idle = frames(at, 0, IDLE_BEFORE_GLOW + 2)
    expect(idle.guidance.glow).toBeGreaterThan(0)
    at.putAway(IDLE_BEFORE_GLOW + 2)
    expect(frames(at, IDLE_BEFORE_GLOW + 2, 0.5).guidance.glow).toBe(0)
  })
})

describe('a scene and put-away', () => {
  it('a touch that ends a scene asks for the scene to be cut, in the call that carries the touch', () => {
    const at = desk()
    at.down(1, { x: 120, y: 220 }, 0, 0)
    at.up(1, { x: 120, y: 220 }, 50)
    frames(at, 0, 0.6)
    expect(at.town!.playing).toBe(true)
    at.take()
    at.down(2, { x: 884, y: 762 }, 700, 0.6)
    const out = at.take()
    expect(out.cut).toBe(true)
    expect(out.sounds.map((sound) => sound.name)).toEqual(['prrp'])
    expect(out.sounds.some((sound) => sound.scene)).toBe(false)
    expect(at.town!.playing).toBe(false)
    expect(frames(at, 0.6, 3).heard.filter((name) => name.startsWith('hop-') || name.startsWith('land-'))).toEqual([])
  })

  it('every sound of a scene is marked as the scene, so that the cut takes all of it', () => {
    const at = desk()
    at.down(1, { x: 120, y: 220 }, 0, 0)
    at.up(1, { x: 120, y: 220 }, 50)
    const first = at.take().sounds
    expect(first.filter((sound) => sound.name === 'box-knock').every((sound) => sound.scene)).toBe(true)
    let scene = 0
    for (let k = 1; k <= 240; k++) { at.frame(k * 16, k / 60, 1 / 60); for (const sound of at.take().sounds) if (sound.name.startsWith('hop-') || sound.name.startsWith('land-')) { expect(sound.scene).toBe(true); scene++ } }
    expect(scene).toBeGreaterThanOrEqual(16)
  })

  it('put-away closes all sound, saves at once, and leaves the town as a load would find it', () => {
    const at = desk()
    at.down(1, { x: 500, y: 500 }, 0, 0)
    at.move(1, { x: 800, y: 520 })
    frames(at, 0, 0.5)
    at.putAway(0.5)
    const out = at.take()
    expect(out).toMatchObject({ sounds: [], cut: true, changed: 'now' })
    expect(at.town!.state.strips.length).toBe(1)
    expect(written(at.town!)).toEqual(written(loaded(at.town!)))
    // The finger that was down when the game was parked does nothing when it lifts afterwards.
    at.up(1, { x: 800, y: 520 }, 900)
    expect(at.town!.state.strips.length).toBe(1)
  })

  it('the town learns the size of the surface: the home control is larger on the stage of a small one, and still above the bare floor', () => {
    const at = new Desk()
    at.open(townWith())
    at.size(844, 390)
    const home = at.town!.home
    expect(home.r).toBeGreaterThan(24)
    expect(at.town!.field.y0).toBe(64)
    expect(home.y + home.r).toBeLessThanOrEqual(at.town!.field.y0)
  })
})
