import { describe, expect, it } from 'vitest'
import { HORIZON_Z, cameraFor, project } from './camera'
import { act, answers, frameFor, lifted } from './hand'
import { ForgivingTouch, type Gesture, LIFT_GRACE_MS } from './input'
import { deserializeKingdom, serializeKingdom } from './kingdom'
import { CLOUDS, CORNER, cloudRanges, cloudTouch, homeControlBox, skyHalfWidth, targetAt } from './layout'
import { Play } from './play'

// The door a finger uses (hand.ts), played with no browser: what a press on
// each part of the surface is, where a cloud is touched, and when a thing in
// the hand is let go.

const DT = 1 / 60
const SURFACES = [[1180, 820], [1024, 768], [820, 1180]] as const
const fresh = (): Play => new Play(deserializeKingdom(null, 7), 1)
const steps = (play: Play, seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) play.step(DT)
}
const names = (play: Play, from: number): string[] => play.heard.slice(from).map((one) => one.name)
const saved = (play: Play): string => JSON.stringify(serializeKingdom(play.toState()))
const press = (x: number, y: number): Gesture[] => [{ type: 'press', at: { x, y } }]
const tap = (x: number, y: number): Gesture[] => [{ type: 'press', at: { x, y } }, { type: 'tap', at: { x, y } }]

describe('under the home control and in the corner', () => {
  for (const [width, height] of SURFACES) {
    const camera = cameraFor(width, height)
    const box = homeControlBox(camera)

    it(`${width} by ${height}: nothing answers a finger on the home control or in the room kept round it`, () => {
      const play = fresh()
      frameFor(play, camera)
      steps(play, 0.5)
      const before = saved(play), from = play.heard.length
      for (const x of [box.left, box.left + 1, width / 2, box.right - 1, box.right]) {
        for (const y of [0, 1, box.bottom / 2, box.bottom - 1, box.bottom]) {
          expect(answers(camera, x, y)).toBe(false)
          act(play, camera, tap(x, y))
          act(play, camera, [...press(x, y), { type: 'dragStart', from: { x, y } }, { type: 'dragMove', from: { x, y }, at: { x: x + 40, y: y + 60 } }, { type: 'dragEnd', from: { x, y }, at: { x: x + 40, y: y + 60 } }])
        }
      }
      // No wind, no puff, no pushed cloud, nothing dug and nothing to save.
      expect(names(play, from)).toEqual([])
      expect(play.voices).toEqual([])
      expect(play.clouds.every((cloud) => cloud.slideSpeed === 0 && cloud.squashSpeed === 0)).toBe(true)
      expect(play.grains).toEqual([])
      expect(play.holding).toBe(false)
      expect(play.dirty).toBe(false)
      expect(saved(play)).toBe(before)
    })

    it(`${width} by ${height}: the sky just outside that room answers with a breath of wind`, () => {
      for (const [x, y] of [[box.left - 2, 20], [box.right + 2, 20], [width / 2, box.bottom + 2]] as const) {
        const play = fresh()
        frameFor(play, camera)
        expect(answers(camera, x, y)).toBe(true)
        const from = play.heard.length
        act(play, camera, tap(x, y))
        expect(names(play, from).length).toBe(1)
        expect(['breath', 'puff']).toContain(names(play, from)[0])
      }
    })

    it(`${width} by ${height}: the grown-up's corner at the top right answers nothing`, () => {
      const play = fresh()
      frameFor(play, camera)
      const before = saved(play), from = play.heard.length
      for (const x of [width - CORNER, width - CORNER / 2, width - 1]) {
        for (const y of [0, CORNER / 2, CORNER]) {
          expect(answers(camera, x, y)).toBe(false)
          act(play, camera, tap(x, y))
        }
      }
      expect(names(play, from)).toEqual([])
      expect(play.clouds.every((cloud) => cloud.slideSpeed === 0 && cloud.squashSpeed === 0)).toBe(true)
      expect(saved(play)).toBe(before)
      // Just outside it the game answers.
      expect(answers(camera, width - CORNER - 1, 10)).toBe(true)
      expect(answers(camera, width - 10, CORNER + 1)).toBe(true)
    })
  }
})

describe('a cloud', () => {
  const camera = cameraFor(1180, 820)
  /** Where a cloud is drawn on the surface now. */
  const drawnAt = (play: Play, index: number): { x: number; y: number } => project(camera, play.cloudXs()[index], CLOUDS[index].y, HORIZON_Z)
  const kindAt = (play: Play, x: number, y: number): string => {
    const target = targetAt(camera, x, y, play.field, play.folk.spots((gx, gz) => play.ground(gx, gz)), play.sea, play.drawn(), play.cloudXs())
    return target.kind === 'cloud' ? `cloud ${target.index}` : target.kind
  }

  it('that was pushed is touched where it is drawn, and the sky where it stood is sky again', () => {
    const play = fresh()
    frameFor(play, camera)
    const stood = drawnAt(play, 0)
    expect(kindAt(play, stood.x, stood.y)).toBe('cloud 0')
    // Pushed three times running, it has slid clear of where it stood.
    for (let i = 0; i < 3; i++) {
      const at = drawnAt(play, 0)
      act(play, camera, tap(at.x, at.y))
      steps(play, 0.4)
    }
    const now = drawnAt(play, 0), wide = project(camera, CLOUDS[0].w, 0, HORIZON_Z).x - project(camera, 0, 0, HORIZON_Z).x
    expect(now.x - stood.x).toBeGreaterThan(wide * 1.2)
    expect(kindAt(play, now.x, now.y)).toBe('cloud 0')
    expect(kindAt(play, stood.x, stood.y)).toBe('sky')
    // A finger on it where it is drawn squashes it with a puff; a finger where it stood is a breath of wind.
    let from = play.heard.length
    act(play, camera, tap(now.x, now.y))
    expect(names(play, from)).toEqual(['puff'])
    expect(play.clouds[0].squashSpeed).toBeGreaterThan(0)
    from = play.heard.length
    act(play, camera, tap(stood.x, stood.y))
    expect(names(play, from)).toEqual(['breath'])
  })

  it('drifts by itself, slowly to and fro and no two alike, and is back where a visit found it when its time has come round', () => {
    const play = fresh()
    frameFor(play, camera)
    const began = play.cloudXs()
    steps(play, 15)
    const moved = play.cloudXs().map((x, index) => x - began[index])
    for (const gone of moved) expect(Math.abs(gone)).toBeGreaterThan(0.7)
    expect(new Set(moved.map((gone) => gone.toFixed(1))).size).toBe(3)
    // Nothing pushed them: it is their own drift, and it turns round.
    expect(play.clouds.every((cloud) => cloud.slide === 0)).toBe(true)
    steps(play, CLOUDS[0].every - 15)
    expect(play.cloudXs()[0]).toBeCloseTo(began[0], 1)
  })

  it('that was pushed slides off, slows, and drifts back to where it was', () => {
    const play = fresh()
    frameFor(play, camera)
    play.press({ kind: 'cloud', index: 1 })
    play.tap()
    let furthest = 0
    for (let i = 0; i < 120; i++) {
      play.step(DT)
      furthest = Math.max(furthest, play.clouds[1].slide)
    }
    expect(furthest).toBeGreaterThan(1.2)
    steps(play, 20)
    expect(Math.abs(play.clouds[1].slide)).toBeLessThan(0.1)
    // A breath of wind on the open sky pushes the cloud that is drawn nearest it.
    const xs = play.cloudXs()
    play.press({ kind: 'sky', x: xs[2] - 0.5 })
    play.tap()
    expect(play.clouds[2].slideSpeed).toBeGreaterThan(1)
    expect(play.clouds[0].slideSpeed).toBe(0)
  })

  it('never leaves, and never lies under the home control or in the grown-up\'s corner: pushed again and again, or drifting by itself, each stops short and goes back', { timeout: 60_000 }, () => {
    for (const [width, height] of [...SURFACES, [1366, 1024], [2000, 800]] as const) {
      const view = cameraFor(width, height), half = skyHalfWidth(view), box = homeControlBox(view), ranges = cloudRanges(view)
      /** Whether any cloud is touched anywhere in the home control's box or the corner, as it is drawn now. */
      const under = (play: Play): string | null => {
        const xs = play.cloudXs()
        for (let index = 0; index < CLOUDS.length; index++) {
          // Where it is touched, which on a small surface is more than where it is drawn.
          const touch = cloudTouch(view, CLOUDS[index], xs[index])
          const left = touch.x - touch.across, right = touch.x + touch.across, top = touch.y - touch.high
          if (top <= box.bottom && right >= box.left && left <= box.right) return `cloud ${index} under the home control`
          if (top <= CORNER && right >= width - CORNER) return `cloud ${index} in the corner`
        }
        return null
      }
      // By itself, through the whole of the slowest cloud's drift there and back.
      const idle = fresh()
      frameFor(idle, view)
      expect(under(idle), `${width} by ${height}, on the first frame`).toBeNull()
      for (let i = 0; i < 110 * 4; i++) {
        idle.step(0.25)
        expect(under(idle), `${width} by ${height}, drifting at ${i / 4}`).toBeNull()
      }
      // Each cloud driven hard each way along the sky, as far as it will go: it stops at its limit both ways.
      for (let index = 0; index < CLOUDS.length; index++) for (const way of [1, -1]) {
        const shoved = fresh()
        frameFor(shoved, view)
        for (let i = 0; i < 240; i++) {
          shoved.clouds[index].slideSpeed = way * 8
          shoved.step(DT)
          expect(under(shoved), `${width} by ${height}, cloud ${index} driven ${way}`).toBeNull()
        }
        expect(shoved.cloudXs()[index]).toBeCloseTo(way > 0 ? ranges[index].to : ranges[index].from, 6)
      }
      // A child who does nothing but push clouds, twice a second, every cloud and every part of the sky.
      const play = fresh()
      frameFor(play, view)
      expect(play.skyHalf).toBeCloseTo(half, 6)
      let furthest = 0
      const stopped = new Set<number>()
      for (let second = 0; second < 90; second++) {
        for (let beat = 0; beat < 2; beat++) {
          // Mostly the clouds themselves, one after another for a while each, so each is pushed as far as it will go.
          play.press(second % 9 < 7 ? { kind: 'cloud', index: Math.floor(second / 30) % 3 } : { kind: 'sky', x: (second % 31) - 15 })
          play.tap()
          for (let i = 0; i < 30; i++) {
            play.step(DT)
            // Its middle, and most of its width with it, is inside the sky that shows.
            play.cloudXs().forEach((x, index) => {
              expect(Math.abs(x)).toBeLessThanOrEqual(half - CLOUDS[index].w * 0.3 + 1e-6)
              if (Math.abs(x - ranges[index].to) < 1e-6) stopped.add(index)
            })
            expect(under(play), `${width} by ${height}, pushed at ${second}`).toBeNull()
          }
        }
        furthest = Math.max(furthest, ...play.clouds.map((cloud) => cloud.slide))
      }
      // They were pushed as far as they may go, and stopped there: the two that start on the right reached their
      // limit short of the corner or the edge. The one on the left has the whole sky before it.
      expect(furthest, `${width} by ${height}`).toBeGreaterThan(1)
      expect(stopped.has(1) && stopped.has(2), `${width} by ${height}`).toBe(true)
    }
  })

  it('a finger on the home control or in the corner is never on a cloud, and a tap just outside them on a cloud that has stopped there is the cloud\'s', () => {
    const play = fresh()
    frameFor(play, camera)
    const box = homeControlBox(camera)
    // The middle cloud pushed toward the home control until it stops: it started on the right of it.
    for (let i = 0; i < 40; i++) {
      play.clouds[1].slideSpeed = -3
      steps(play, 0.25)
    }
    const at = drawnAt(play, 1), wide = project(camera, CLOUDS[1].w, 0, HORIZON_Z).x - project(camera, 0, 0, HORIZON_Z).x
    // Its edge is short of the box, by the room it keeps.
    expect(at.x - wide).toBeGreaterThan(box.right)
    expect(at.x - wide).toBeLessThan(box.right + 16)
    expect(kindAt(play, at.x - wide + 2, at.y)).toBe('cloud 1')
    for (const y of [1, box.bottom / 2, box.bottom]) expect(answers(camera, box.right, y)).toBe(false)
  })

  it('is where a visit starts it when the game is found again, parked or loaded', () => {
    const play = fresh()
    frameFor(play, camera)
    for (let i = 0; i < 5; i++) {
      play.press({ kind: 'cloud', index: 2 })
      play.tap()
      steps(play, 1)
    }
    const parked = play.parked(1), loaded = new Play(deserializeKingdom(JSON.parse(saved(play)), 7), 1)
    expect(parked.cloudXs()).toEqual(loaded.cloudXs())
    expect(parked.cloudXs()).toEqual(CLOUDS.map((cloud) => cloud.x))
  })
})

describe('the lift', () => {
  const camera = cameraFor(1180, 820)
  const at = (play: Play, x: number, z: number): { x: number; y: number } => {
    const on = project(camera, x, play.ground(x, z), z)
    return { x: on.x, y: on.y }
  }

  it('sets the bucket down in the frame the finger leaves the glass, and a new touch on it is a new touch', () => {
    const play = fresh(), touch = new ForgivingTouch()
    frameFor(play, camera)
    const drawn = play.drawn().bucket, from = project(camera, drawn.x, drawn.y, drawn.z)
    act(play, camera, touch.down(1, { x: from.x, y: from.y }, 0))
    expect(play.holding).toBe(true)
    for (let i = 1; i <= 12; i++) {
      act(play, camera, touch.move(1, { x: from.x + i * 8, y: from.y + i * 3 }))
      play.step(DT)
    }
    const up = { x: from.x + 96, y: from.y + 36 }
    const gestures = lifted(play, touch, 1, up, 200)
    expect(gestures.map((gesture) => gesture.type)).toEqual(['dragLift', 'dragEnd'])
    act(play, camera, gestures)
    // Down, in this call: nothing is in the hand and nothing waits for the finger to come back.
    expect(play.holding).toBe(false)
    expect(touch.active).toBe(false)
    const state = saved(play)
    steps(play, (LIFT_GRACE_MS + 100) / 1000)
    expect(saved(play)).toBe(state)
    // A finger that lands on it again at once presses it afresh: it clinks.
    const again = play.drawn().bucket, on = project(camera, again.x, again.y, again.z)
    const mark = play.heard.length
    const next = touch.down(2, { x: on.x, y: on.y }, 260)
    expect(next.map((gesture) => gesture.type)).toEqual(['press'])
    act(play, camera, next)
    expect(names(play, mark)).toEqual(['clink'])
  })

  it('lays the bridge with its clack, and lets the sun go with its second note, in the frame of the lift', () => {
    const play = fresh(), touch = new ForgivingTouch()
    frameFor(play, camera)
    // A groove, and a piece of wood carried over it.
    play.press({ kind: 'sand', x: -3, z: 2.5 })
    play.dragStart()
    for (let i = 1; i <= 30; i++) play.drag(-3 + i * 0.2, 2.5, 0)
    play.release()
    const piece = play.things.wood[1]
    const from = at(play, piece.x, piece.z), to = at(play, 1, 2.5)
    act(play, camera, touch.down(1, from, 0))
    for (let i = 1; i <= 20; i++) {
      act(play, camera, touch.move(1, { x: from.x + ((to.x - from.x) * i) / 20, y: from.y + ((to.y - from.y) * i) / 20 }))
      play.step(DT)
    }
    let mark = play.heard.length
    act(play, camera, lifted(play, touch, 1, to, 400))
    expect(names(play, mark)).toContain('bridge')
    expect(play.heard[play.heard.length - 1].at).toBeCloseTo(play.time, 6)
    // The sun, dragged past half way and let go.
    const sun = project(camera, play.drawn().sun.x, play.drawn().sun.y, HORIZON_Z)
    act(play, camera, touch.down(2, { x: sun.x, y: sun.y }, 1000))
    for (let i = 1; i <= 10; i++) act(play, camera, touch.move(2, { x: sun.x, y: sun.y + i * 12 }))
    expect(play.sun.mode).toBe('held')
    mark = play.heard.length
    act(play, camera, lifted(play, touch, 2, { x: sun.x, y: sun.y + 120 }, 1400))
    expect(names(play, mark)).toEqual(['chimeSecond'])
    expect(play.sun.travelling).toBe(true)
  })

  it('leaves a stroke its grace: a finger that comes back near where it lifted carries the same groove on', () => {
    const play = fresh(), touch = new ForgivingTouch()
    frameFor(play, camera)
    const from = at(play, -2, 3), mid = at(play, -0.5, 3), back = at(play, -0.3, 3), end = at(play, 1.5, 3)
    act(play, camera, touch.down(1, from, 0))
    for (let i = 1; i <= 10; i++) act(play, camera, touch.move(1, { x: from.x + ((mid.x - from.x) * i) / 10, y: from.y + ((mid.y - from.y) * i) / 10 }))
    const gestures = lifted(play, touch, 1, mid, 300)
    expect(gestures.map((gesture) => gesture.type)).toEqual(['dragLift'])
    act(play, camera, gestures)
    expect(touch.active).toBe(true)
    const mark = play.heard.length
    const again = touch.down(2, back, 300 + LIFT_GRACE_MS - 50)
    expect(again.map((gesture) => gesture.type)).toEqual(['dragMove'])
    act(play, camera, again)
    for (let i = 1; i <= 10; i++) act(play, camera, touch.move(2, { x: back.x + ((end.x - back.x) * i) / 10, y: back.y + ((end.y - back.y) * i) / 10 }))
    act(play, camera, lifted(play, touch, 2, end, 900))
    // One groove, begun once: no second thud, and one start among the grooves that are saved.
    expect(names(play, mark).filter((name) => name === 'thud')).toEqual([])
    expect(play.toState().dug).toHaveLength(1)
  })
})
