import { describe, expect, it } from 'vitest'
import { CASES, perform } from './cases'
import { MOVERS } from './movers'
import { babyDraw, catDraw, catWatched, granDraw } from './people'
import type { Play } from './play'
import { targetAt } from './targets'
import { heard, px, run, stored } from './testing'
import { SOUNDS } from './voices'

describe('every act of the grid, through the path a finger takes', () => {
  it.each(CASES.map((entry) => [entry.name, entry] as const))('%s', (_, entry) => {
    const { play, cues, landing } = perform(entry)
    const sounds = cues.map((cue) => cue.sound)
    // The finger is answered when it lands, with a sound and the motion that goes with it.
    expect(landing.length, 'the landing').toBeGreaterThan(0)
    for (const sound of entry.sounds) expect(sounds, sound).toContain(sound)
    expect(entry.then(play.toy.state)).toEqual(entry.holds)
    // It is over: nobody is still on the way anywhere.
    expect(play.toy.sceneRunning).toBe(false)
    expect(play.toy.hand).toBeNull()
  })
})

/** Where the child is, for anyone in the room: out in front of the rug, on the side the camera stands. */
const TOWARDS_THE_CHILD = 2.3

describe('nobody looks at the child', () => {
  it.each(CASES.map((entry) => [entry.name, entry] as const))('the three watch the fort, the scissors and each other, and the squeal and the start are at the cat: %s', (_, entry) => {
    let squeals = 0, starts = 0
    perform(entry, Infinity, (play, now) => {
      const toy = play.toy, cat = catDraw(toy), baby = babyDraw(toy), gran = granDraw(toy)
      for (const [who, look] of [['cat', cat.look], ['baby', baby.look], ['gran', gran.look]] as const) {
        // What each looks at is a place in the room: at or behind the scissors' place on the rug, never out of the picture.
        expect(look.z, `${who} at ${toy.time.toFixed(2)} s`).toBeLessThanOrEqual(TOWARDS_THE_CHILD)
        expect(Number.isFinite(look.x + look.y + look.z)).toBe(true)
      }
      for (const cue of now) {
        // The baby's squeal and the grandmother's jumping glasses are at the cat.
        if (cue.sound === 'squeal' && cue.mover === 'baby:squeal') { expect(baby.look).toEqual(catWatched(toy)); squeals++ }
        if (cue.sound === 'oh') { expect(gran.look).toEqual(catWatched(toy)); starts++ }
        // Whoever is tapped answers as itself with its own small noise, and looks where it looked.
        expect(['cheer', 'clap', 'yay', 'bravo', 'ding', 'fanfare']).not.toContain(cue.sound)
      }
    })
    if (entry.sounds.includes('squeal') && !entry.name.startsWith('blanket')) expect(squeals).toBeGreaterThan(0)
    if (entry.sounds.includes('oh')) expect(starts).toBeGreaterThan(0)
  })

  it('keeps the eyes on the cat for as long as the squeal and the start last, wherever the cat goes', () => {
    const entry = CASES.find((each) => each.name.startsWith('hole: cut by the finger'))!
    let since = -1, held = 0
    perform(entry, Infinity, (play, now) => {
      const toy = play.toy
      if (now.some((cue) => cue.sound === 'squeal')) since = toy.time
      if (since >= 0 && toy.time - since < 2 && toy.sceneRunning) { expect(babyDraw(toy).look).toEqual(catWatched(toy)); held++ }
    })
    expect(held).toBeGreaterThan(60)
  })

  it('has no sound and no motion of praise: every sound belongs to a material or to one of the three going about its own business', () => {
    expect(SOUNDS.filter((sound) => /cheer|clap|yay|bravo|win|star|fanfare|applause|nod/.test(sound))).toEqual([])
    expect(MOVERS.filter((mover) => /cheer|clap|nod|wave|thank|praise/.test(mover))).toEqual([])
  })
})

describe('a scene gives way to any touch', () => {
  it.each(CASES.map((entry) => [entry.name, entry] as const))('ends where the save is and is silent from that frame: %s', (_, entry) => {
    const whole = perform(entry).steps
    for (let stop = 4; stop < whole; stop += Math.max(3, Math.round(whole / 16))) {
      const { play } = perform(entry, stop), toy = play.toy, when = `${entry.name}, touched at step ${stop} of ${whole}`
      if (!toy.sceneRunning || play.busy || toy.hand) continue
      const saved = stored(toy.state)
      // A touch on bare wall, where nothing is.
      const [x, y] = [-0.9, 0.2, -2.1].map((wall) => px(play, { x: wall, y: 3.1, z: 0.6 })).find(([wx, wy]) => targetAt(toy, wx, wy, play.width, play.height).kind === 'air') ?? [0, 0]
      expect(targetAt(toy, x, y, play.width, play.height).kind, when).toBe('air')
      play.down(7, x, y)
      // The scene is over in this very frame: it is to be hushed, nothing of it is queued, and the touch has its own answer.
      expect(toy.sceneRunning, when).toBe(false)
      expect(toy.hushed, when).toBe(true)
      expect(toy.cues.map((cue) => [cue.sound, cue.scene]), when).toEqual([['air', false]])
      expect(toy.holds.size + toy.withBaby.size, when).toBe(0)
      for (const who of ['cat', 'baby', 'gran'] as const) expect(toy.shows[who], when).toEqual(toy.restShow(who))
      // Its outcome was saved when it began: ending it changes nothing.
      expect(stored(toy.state), when).toEqual(saved)
      heard(play)
      play.up(7, x, y)
      // Nothing of the scene sounds afterwards: only the scissors going home, the piece of a cut still falling, and a box or the blanket the child let go still landing.
      const after = run(play, 8)
      expect(after.every((cue) => !cue.scene), when).toBe(true)
      expect(after.map((cue) => cue.sound).filter((sound) => !['clack', 'slap', 'roll', 'snip', 'thump', 'boom', 'settle'].includes(sound)), when).toEqual([])
      expect(stored(toy.state), when).toEqual(saved)
    }
  })

  it('is what most acts of the grid start: the test above has scenes to end', () => {
    const withScene = CASES.filter((entry) => { let seen = false; perform(entry, Infinity, (play) => { seen ||= play.toy.sceneRunning }); return seen })
    expect(withScene.length).toBeGreaterThan(28)
  })
})

describe('a thing in the hand', () => {
  it.each(CASES.map((entry) => [entry.name, entry] as const))('changes nothing it is carried over: a character or a place takes it only when it is let go there: %s', (_, entry) => {
    let taken: string | null = null, carried = 0
    const fort = (play: Play): string => { const { cat: _cat, baby: _baby, toys: _toys, gran: _gran, ...rest } = stored(play.toy.state) as Record<string, unknown>; return JSON.stringify(rest) }
    perform(entry, Infinity, (play) => {
      const hand = play.toy.hand
      if (!hand || hand.lifted !== null) { taken = null; return }
      // Taking a box up puts out whoever was in it; nothing else changes until the finger lets go.
      taken ??= fort(play)
      expect(fort(play), `${entry.name} at ${play.toy.time.toFixed(2)} s`).toBe(taken)
      expect(play.toy.sceneRunning && hand.kind !== 'box').toBe(false)
      carried++
    })
    if (/^(tape|blanket|cushion|lights)/.test(entry.name)) expect(carried).toBeGreaterThan(8)
  })
})
