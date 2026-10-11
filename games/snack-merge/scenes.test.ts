import { describe, expect, it } from 'vitest'
import { BREAD, CHEESE, CHILLI, EGG, ICE, JELLY, type Kind } from './kinds'
import { HANDLE, JAR, PULL, WINDOW } from './layout'
import { Play, mouthfulsOf, pourAt, type Cue } from './play'
import { MONSTERS, deserialize, freshSave, type Lying, type Save } from './save'
import { ANSWERS, answered, KNOCK } from './voices'

// The two scenes a child causes (ART.md, "The scenes"): the tip, and the next
// monster coming in. Each has its outcome in the state before its first beat,
// is ended by a touch that is then an ordinary touch, and never plays on load.

const FRAME = 1 / 60
const GRIP = { x: (HANDLE.left + HANDLE.right) / 2, y: (HANDLE.top + HANDLE.bottom) / 2 }
const AT_WINDOW = { x: WINDOW.left + 60, y: WINDOW.top + 90 }

function run(play: Play, seconds: number): Cue[] {
  const cues: Cue[] = []
  for (let t = 0; t < seconds; t += FRAME) {
    play.step(FRAME)
    cues.push(...play.drain())
  }
  return cues
}

/** A pile laid asleep in rows, far enough apart that nothing touches. */
const lay = (kinds: readonly Kind[]): Lying[] => kinds.map((k, i) => ({ k, x: JAR.left + 60 + (i % 3) * 125, y: JAR.floor - 60 - Math.floor(i / 3) * 125 }))
const withJar = (kinds: readonly Kind[], more: Partial<Save> = {}): Play => new Play({ ...freshSave(8), jar: lay(kinds), ...more }, 1)
/** Seven snacks of three things each: seven kinds, none of which joins anything. */
const SEVEN: readonly Kind[] = [7, 11, 13, 14, 19, 21, 22]
const stored = (save: Save): Save => deserialize(JSON.parse(JSON.stringify(save)))
const castCues = (cues: readonly Cue[]) => cues.flatMap((cue) => (cue.type === 'cast' ? [cue.cue] : []))
const whats = (cues: readonly Cue[]): string[] => castCues(cues).map((cue) => cue.what)

/** Takes the handle and pulls it `share` of a whole pull towards the monster. The finger stays down. */
function pull(play: Play, share: number): Cue[] {
  play.press(GRIP)
  for (let i = 1; i <= 10; i++) {
    play.move({ x: GRIP.x + (PULL * share * i) / 10, y: GRIP.y })
    play.step(FRAME)
  }
  return play.drain()
}

describe('what a tip feeds', () => {
  it('is one mouthful for each kind of snack, the biggest first, and at most five', () => {
    expect(mouthfulsOf([BREAD, BREAD, BREAD])).toEqual([BREAD])
    expect(mouthfulsOf([EGG, BREAD | CHEESE, BREAD, BREAD | CHEESE | ICE, EGG])).toEqual([BREAD | CHEESE | ICE, BREAD | CHEESE, BREAD, EGG])
    expect(mouthfulsOf([BREAD, CHEESE, EGG, CHILLI, JELLY, ICE, BREAD | ICE])).toEqual([BREAD | ICE, BREAD, CHEESE, EGG, CHILLI])
  })
})

describe('the tip', () => {
  it('starts when the handle has been pulled halfway, with its outcome in the state before a beat has played', () => {
    const play = withJar([BREAD | CHEESE, CHEESE, CHEESE])
    expect(play.finished).toBe(false)
    pull(play, 0.4)
    expect(play.playing).toBeNull()
    play.move({ x: GRIP.x + PULL * 0.55, y: GRIP.y })
    expect(play.playing).toBe('tip')
    expect(play.takeChange()).toBe(2)
    expect(play.jar.snacks).toEqual([])
    expect(play.ate).toEqual([BREAD | CHEESE, CHEESE])
    expect(play.finished).toBe(true)
    expect(play.pouring.map((pour) => pour.mouthful)).toEqual([0, 1, 1])
    expect(stored(play.toSave())).toMatchObject({ jar: [], ate: [BREAD | CHEESE, CHEESE], finished: true, seat: 0 })
  })

  it('sends a sixth kind of snack down in the fifth mouthful: nothing is left lying in the tipped jar', () => {
    // Six kinds that all hold bread, so none joins another: the five biggest are the mouthfuls, and the sixth goes with the fifth.
    const kinds: Kind[] = [BREAD | CHEESE | EGG, BREAD | CHEESE, BREAD | EGG, BREAD | CHILLI, BREAD | JELLY, BREAD | ICE]
    const play = withJar(kinds)
    pull(play, 0.55)
    expect(play.playing).toBe('tip')
    expect(play.ate).toEqual(kinds.slice(0, 5))
    expect(play.pouring).toHaveLength(6)
    expect(play.pouring.find((pour) => pour.k === (BREAD | ICE))!.mouthful).toBe(4)
    expect(play.pouring.every((pour) => pour.mouthful >= 0 && pour.mouthful <= 4)).toBe(true)
    // Every one of the six slides out to the mouth before the swallow.
    const farthest = new Map<Kind, number>()
    while (play.playing === 'tip') {
      play.step(FRAME)
      for (const pour of play.pouring) farthest.set(pour.k, Math.max(farthest.get(pour.k) ?? 0, pour.out))
    }
    for (const k of kinds) expect(farthest.get(k)).toBeGreaterThan(0.9)
    expect(play.pouring).toEqual([])
  })

  it('marks its outcome for storage in the very move that starts it, before a step is played', () => {
    const play = withJar([BREAD | CHEESE])
    pull(play, 0.4)
    play.takeChange()
    play.move({ x: GRIP.x + PULL * 0.55, y: GRIP.y })
    // Nothing has been stepped: the Mount hands this to storage from the move itself.
    expect(play.takeChange()).toBe(2)
    expect(stored(play.toSave())).toMatchObject({ jar: [], ate: [BREAD | CHEESE], finished: true })
  })

  it('plays six to ten seconds: each mouthful slides out, the monster answers the things in it all at once, and it swallows', () => {
    for (const kinds of [[BREAD], [BREAD | CHEESE, BREAD, BREAD], SEVEN] as const) {
      const play = withJar(kinds)
      pull(play, 0.6)
      const mouthfuls = mouthfulsOf(kinds)
      const cues: Cue[] = []
      let lasted = 0
      while (play.playing === 'tip' && lasted < 20) {
        cues.push(...run(play, FRAME))
        lasted += FRAME
      }
      expect(lasted).toBeGreaterThanOrEqual(5.9)
      expect(lasted).toBeLessThanOrEqual(10.1)
      expect(castCues(cues).filter((cue) => cue.what === 'eat')).toEqual(mouthfuls.map((k) => ({ what: 'eat', k })))
      expect(whats(cues).filter((what) => what === 'swallow')).toHaveLength(1)
      expect(whats(cues)[whats(cues).length - 1]).toBe('swallow')
      for (const k of mouthfuls) expect(cues).toContainEqual({ type: 'sound', notes: answered(0, k) })
      run(play, 1)
      expect(play.pouring).toEqual([])
      expect(play.tip).toBe(0)
      expect(play.pose).toBe(mouthfuls[mouthfuls.length - 1])
    }
  })

  it('gives each monster its own answer to each thing', () => {
    const all = ANSWERS.flatMap((row) => row.map((notes) => JSON.stringify(notes)))
    expect(all).toHaveLength(18)
    expect(new Set(all).size).toBe(18)
    for (const seat of [0, 1, 2]) {
      const play = withJar([CHILLI], { seat })
      pull(play, 0.6)
      expect(run(play, 3)).toContainEqual({ type: 'sound', notes: answered(seat, CHILLI) })
    }
  })

  it('is ended by a touch: the jar stands upright and empty, the monster is in its ending pose, and the touch is an ordinary touch', () => {
    const play = withJar([7, 11, 13])
    pull(play, 0.6)
    play.release()
    run(play, 1.4)
    expect(play.pouring.length).toBeGreaterThan(0)
    expect(play.tip).toBeGreaterThan(0.5)
    play.drain()
    play.press({ x: 580, y: 300 })
    const cues = play.drain()
    expect(play.playing).toBeNull()
    expect(play.pouring).toEqual([])
    expect(play.tip).toBe(0)
    expect(castCues(cues)).toEqual([{ what: 'sit', seat: 0, pose: 13 }])
    // The claw answers the same touch.
    expect(play.held).toBe(true)
    expect(cues.filter((cue) => cue.type === 'sound')).toHaveLength(1)
    expect(play.ate).toEqual([7, 11, 13])
  })

  it('does not play again on load: a game put away in the middle of it is found fed, with the jar upright and empty', () => {
    const play = withJar([7, 11])
    pull(play, 0.6)
    run(play, 1.2)
    const again = new Play(stored(play.toSave()), 1)
    expect(again.playing).toBeNull()
    expect(again.finished).toBe(true)
    expect(again.pose).toBe(11)
    expect(again.tip).toBe(0)
    expect(whats(run(again, 4))).toEqual([])
    expect(again.jar.snacks).toEqual([])
  })

  it('rocks back with nothing spilled when the pull is let go before halfway, or taken away', () => {
    for (const end of ['release', 'cancel'] as const) {
      const play = withJar([7, 11])
      const before = stored(play.toSave())
      pull(play, 0.4)
      expect(play.tip).toBeGreaterThan(0.1)
      play[end]()
      expect(play.drain().some((cue) => cue.type === 'sound')).toBe(true)
      run(play, 4)
      expect(play.tip).toBe(0)
      expect(play.playing).toBeNull()
      expect(play.finished).toBe(false)
      const after = stored(play.toSave())
      expect(after.jar.map((s) => s.k)).toEqual(before.jar.map((s) => s.k))
      expect(after.ate).toEqual([])
    }
  })

  it('feeds what a falling snack comes to rest as, never a snack in the air', () => {
    const play = withJar([BREAD, EGG | ICE])
    play.jar.drop(CHEESE, JAR.left + 70, 150)
    play.jar.drop(CHILLI, JAR.right - 70, 150)
    pull(play, 0.45)
    expect(play.jar.snacks.some((s) => s.fresh)).toBe(true)
    // What a save made now would hold is what the tip feeds: the pile at rest.
    const atRest = stored(play.toSave()).jar.map((s) => s.k)
    play.move({ x: GRIP.x + PULL * 0.6, y: GRIP.y })
    expect(play.playing).toBe('tip')
    expect(play.ate).toEqual(mouthfulsOf(atRest))
    expect(play.pouring.map((pour) => pour.k).sort()).toEqual([...atRest].sort())
  })

  it('is no scene with nothing in the jar: the monster looks in, one grain falls with a tick, and nothing is saved', () => {
    const play = withJar([])
    const before = stored(play.toSave())
    pull(play, 0.6)
    const first = play.drain()
    expect(play.playing).toBeNull()
    play.release()
    const cues = [...first, ...run(play, 0.3)]
    expect(play.tip).toBeGreaterThan(0.5)
    cues.push(...run(play, 3))
    expect(play.tip).toBe(0)
    expect(cues.filter((cue) => cue.type === 'puff')).toHaveLength(1)
    expect(play.finished).toBe(false)
    expect(stored(play.toSave())).toEqual(before)
  })

  it('tells the monster to look into the empty jar', () => {
    const play = withJar([])
    play.press(GRIP)
    play.drain()
    for (let i = 1; i <= 10; i++) play.move({ x: GRIP.x + PULL * 0.06 * i, y: GRIP.y })
    expect(whats(play.drain())).toEqual(['peek'])
  })

  it('feeds the same monster again while the cycle is finished, and writes what it ate anew', () => {
    const play = withJar([BREAD], { ate: [ICE], finished: true, seat: 1 })
    expect(play.finished).toBe(true)
    pull(play, 0.6)
    expect(play.playing).toBe('tip')
    expect(play.seat).toBe(1)
    expect(play.ate).toEqual([BREAD])
    run(play, 9)
    // A snack dropped after the tip lies in the jar like any other.
    play.press({ x: 580, y: 300 })
    play.release()
    run(play, 2)
    expect(play.jar.snacks.map((s) => s.k)).toEqual([BREAD])
    expect(stored(play.toSave()).jar).toHaveLength(1)
    expect(play.finished).toBe(true)
  })

  it('carries each poured snack from where it lay to the mouth', () => {
    const pour = { k: BREAD, x: JAR.left + 60, y: JAR.floor - 38, mouthful: 0, out: 0 }
    const start = pourAt(pour, 0)
    expect(start).toMatchObject({ x: pour.x, y: pour.y, size: 1 })
    const end = pourAt({ ...pour, out: 1 }, 1)
    expect(end.x).toBeGreaterThan(JAR.right)
    expect(end.size).toBeLessThan(0.6)
  })
})

describe('the next monster comes in', () => {
  it('is a poke until the jar has been tipped into a mouth', () => {
    const play = withJar([BREAD])
    play.press(AT_WINDOW)
    const cues = play.drain()
    expect(whats(cues)).toEqual(['poke-window'])
    expect(cues).toContainEqual({ type: 'sound', notes: KNOCK })
    expect(play.playing).toBeNull()
    expect(play.seat).toBe(0)
  })

  it('starts at a touch on the one at the window once the cycle is finished, with its outcome in the state at once', () => {
    const play = withJar([], { ate: [BREAD], finished: true })
    play.press(AT_WINDOW)
    expect(play.playing).toBe('next')
    expect(play.takeChange()).toBe(2)
    expect(play.seat).toBe(1)
    expect(play.atWindow).toBe(2)
    expect(play.ate).toEqual([])
    expect(play.finished).toBe(false)
    expect(stored(play.toSave())).toMatchObject({ seat: 1, ate: [], finished: false })
    expect(play.entrance).toMatchObject({ leaving: 0, out: 0, in: 0 })
  })

  it('plays about five seconds: the fed one goes out, the bell rings, the next one sits, the one after comes to the window', () => {
    const play = withJar([], { ate: [BREAD], finished: true })
    play.press(AT_WINDOW)
    play.release()
    const order: string[] = []
    let lasted = 0
    const cues: Cue[] = []
    while (play.playing === 'next' && lasted < 12) {
      cues.push(...run(play, FRAME))
      lasted += FRAME
      const e = play.entrance
      if (!e) continue
      for (const [name, value] of [['out', e.out], ['duck', e.duck], ['in', e.in], ['rise', e.rise]] as const) if (value >= 0.9 && !order.includes(name)) order.push(name)
    }
    expect(lasted).toBeGreaterThan(4.5)
    expect(lasted).toBeLessThan(5.5)
    expect(order).toEqual(['duck', 'out', 'in', 'rise'])
    expect(castCues(cues)).toEqual([{ what: 'pat' }, { what: 'sit', seat: 1, pose: 0 }])
    expect(play.entrance).toBeNull()
  })

  it('is ended by a touch: the new one is seated at once, and a second touch on the window is a poke', () => {
    const play = withJar([], { ate: [BREAD], finished: true, seat: 2 })
    play.press(AT_WINDOW)
    play.release()
    run(play, 1)
    play.drain()
    play.press(AT_WINDOW)
    const cues = play.drain()
    expect(play.playing).toBeNull()
    expect(play.entrance).toBeNull()
    expect(play.seat).toBe(0)
    expect(castCues(cues)).toEqual([{ what: 'sit', seat: 0, pose: 0 }, { what: 'poke-window' }])
  })

  it('does not play again on load', () => {
    const play = withJar([], { ate: [BREAD], finished: true })
    play.press(AT_WINDOW)
    run(play, 1)
    const again = new Play(stored(play.toSave()), 1)
    expect(again.playing).toBeNull()
    expect(again.entrance).toBeNull()
    expect(again.seat).toBe(1)
    expect(whats(run(again, 6))).toEqual([])
  })

  it('goes round the three and comes back to the first', () => {
    const play = withJar([])
    const seats: number[] = []
    for (let i = 0; i < MONSTERS; i++) {
      play.press({ x: 580, y: 300 })
      play.release()
      run(play, 2)
      pull(play, 0.6)
      play.release()
      run(play, 9)
      expect(play.finished).toBe(true)
      play.press(AT_WINDOW)
      play.release()
      run(play, 6)
      seats.push(play.seat)
    }
    expect(seats).toEqual([1, 2, 0])
    expect(play.finished).toBe(false)
  })

  it('waits: a finished scene starts nothing by itself', () => {
    const play = withJar([], { ate: [BREAD], finished: true })
    expect(whats(run(play, 30))).toEqual([])
    expect(play.playing).toBeNull()
    expect(play.seat).toBe(0)
  })
})
