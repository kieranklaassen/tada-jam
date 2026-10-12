import { describe, expect, it } from 'vitest'
import { COLOURS, GREEN, HOLES, RED, WHITE, centreOf, holeAt, stepOf, type Colour } from './board'
import { fallBeats, type Faller } from './fallers'
import { BUTTONS, GECKO, HANDLE, SPEAKER, SPIDER, knobAt, wellMouth } from './layout'
import { GECKO_ACTS, SPIDER_ACTS, type ActSpec } from './motion'
import { BUMP_TOUCHES } from './moth'
import { makeRng } from './rng'
import { freshSave } from './save'
import { Toy, WHITE_BREATH } from './toy'
import { CUE_NAMES, notesOf, type Cue, type CueName } from './voices'

// Sight and sound run on one clock. This test plays the game as the Mount does, a touch and then frames of a
// sixtieth of a second, and after every touch and every frame holds each sound that was asked for to something
// that is seen to happen at that very moment: a peg that appeared, a foot that came down, a peg that reached its
// well, a peg the beam met. Then it holds the other way round: nothing seen arrives without its sound. No voice
// can make up the difference, because no note carries a delay (voices.test.ts).

const DT = 1 / 60
const EPS = 1e-9

type Who = { act: string | null; t: number }
type Seen = {
  shown: number[]
  live: { hole: number; lit: boolean }[]
  fallers: Faller[]
  /** The fallers themselves, to tell which of them have landed since. */
  inAir: Faller[]
  beamCol: number
  leverHeld: boolean
  spider: Who
  gecko: Who
  moth: { mode: string; act: string | null; t: number }
  playing: string | null
  leverDown: boolean
  flashes: number[]
}

const look = (toy: Toy): Seen => ({
  shown: toy.shown.slice(),
  live: toy.live.map((peg) => ({ hole: peg.hole, lit: peg.lit })),
  fallers: toy.fallers.map((faller) => ({ ...faller })),
  inAir: toy.fallers.slice(),
  beamCol: toy.beams.find((beam) => !beam.half)?.col ?? -1,
  leverHeld: toy.leverHeld,
  spider: { act: toy.spider.act, t: toy.spider.t },
  gecko: { act: toy.gecko.act, t: toy.gecko.t },
  moth: { mode: toy.moth.mode, act: toy.moth.act, t: toy.moth.t },
  playing: toy.playing,
  leverDown: toy.leverDown,
  flashes: toy.flashes.map((flash) => flash.hole),
})

const same = (a: Cue, b: Cue) => a.name === b.name && a.colour === b.colour && a.n === b.n
const count = (cue: Cue) => cue.steps?.length ?? 1

/** A watcher's beat: one that its act reaches inside this frame, or the opening beat of an act begun at this moment. */
function beatSeen(acts: Record<string, ActSpec>, before: Who, now: Who, cue: Cue, dt: number): boolean {
  const opens = now.act !== null && now.t <= dt + EPS && acts[now.act].beats.some((beat) => beat.at <= 0 && same(beat.cue, cue))
  return opens || (before.act !== null && acts[before.act].beats.some((beat) => beat.at > before.t - EPS && beat.at <= before.t + dt + EPS && same(beat.cue, cue)))
}

/** A beat of a peg's way to its well that falls inside this frame. */
const onTheWay = (cue: Cue, before: Seen, dt: number) =>
  before.fallers.some((faller) => fallBeats(faller).some((beat) => beat.at > faller.t - EPS && beat.at <= faller.t + dt + EPS && same(beat.cue, cue)))

/** Whether the motion a cue belongs to is seen at this moment. `dt` is 0 for a touch and the frame's length for a frame. */
function seen(cue: Cue, before: Seen, toy: Toy, dt: number): boolean {
  const fresh = (t: number) => t <= dt + EPS
  /** A peg of the cue's colour stands now where it did not a moment ago. (A touch that ends the clatter sweeps the board first, so every peg that stands after it is new.) */
  const swept = dt === 0 && before.playing === 'clatter'
  const appeared = (hole: number) => toy.shown[hole] === cue.colour && (swept || before.shown[hole] !== toy.shown[hole])
  switch (cue.name) {
    case 'click': {
      // One step for each peg of that colour that appeared now, each at its row's step or up to three echoes above it.
      const pegs = toy.shown.map((_, hole) => hole).filter(appeared)
      return pegs.length === count(cue) && cue.steps!.every((step) => pegs.some((hole) => step >= stepOf(hole) && step <= stepOf(hole) + 3))
    }
    case 'bell': {
      // White pegs light now: their breath is out in this frame, or they were settled early and stand lit in the still picture.
      const lights = toy.live.filter((peg) => peg.colour === WHITE && peg.lit && peg.age >= WHITE_BREATH && peg.age - dt < WHITE_BREATH + EPS)
      const settled = before.live.filter((peg) => !peg.lit && !toy.live.some((now) => now.hole === peg.hole) && toy.shown[peg.hole] === WHITE)
      return lights.length + settled.length === count(cue)
    }
    case 'knock':
      if (cue.colour !== RED) return toy.fallers.some((faller) => faller.kind === 'knocked' && faller.colour === cue.colour && fresh(faller.t))
      return onTheWay(cue, before, dt)
    case 'pull':
      return toy.fallers.filter((faller) => faller.kind === 'pulled' && faller.colour === cue.colour && fresh(faller.t)).length >= 1
    case 'land':
    case 'drop':
      // A peg that was in the air is in its well. (One sent on early, because too many were in the air, lands in the frame that sends it.)
      if (before.inAir.some((faller) => faller.colour === cue.colour && !toy.fallers.includes(faller))) return true
      return onTheWay(cue, before, dt)
    case 'hop':
    case 'catch':
    case 'flick':
      return onTheWay(cue, before, dt)
    case 'grip':
      // The knob gives under the finger that takes it; or, let go part of the way with the lever unmoved, it is seen to spring back.
      return dt === 0 && ((toy.leverHeld && !before.leverHeld) || (before.leverHeld && !toy.leverHeld && toy.leverAge > 0 && Math.abs(toy.knob - (toy.leverDown ? 1 : 0)) > 0))
    case 'pat':
    case 'tink': {
      const home = toy.moth.restingPlace()
      const landed = before.moth.mode === 'fly' && toy.moth.mode !== 'fly' && toy.moth.x === home.x && toy.moth.y === home.y
      const again = cue.name === 'pat' && before.moth.act === 'loop' && toy.moth.mode === 'sit'
      const climbed = cue.name === 'tink' && before.moth.act === 'leaf' && toy.moth.mode === 'sit'
      return (landed && (cue.name === 'tink') === (toy.moth.perch === null)) || again || climbed
    }
    case 'flutter':
      return before.moth.mode === 'fly' && toy.moth.mode === 'away'
    case 'leaf':
      return toy.moth.act === 'leaf' && fresh(toy.moth.t)
    case 'mothTaste': {
      const arrives = before.moth.mode === 'fly' && toy.moth.mode === 'act' && toy.moth.t === 0
      const bumps = before.moth.act === 'bump' && BUMP_TOUCHES.some((touch) => touch > before.moth.t && touch <= before.moth.t + dt + EPS)
      return arrives || bumps
    }
    case 'squeak':
      return dt === 0 && toy.moth.act === 'tumble' && toy.moth.t === 0
    case 'drum':
    case 'spiderTaste':
    case 'boing':
    case 'twang':
      return beatSeen(SPIDER_ACTS, before.spider, toy.spider, cue, dt)
    case 'baton':
      // The conducting spider's foot comes down in the very step the beam takes.
      return dt > 0 && toy.spider.act === 'conduct' && (toy.beams.find((beam) => !beam.half)?.col ?? -1) !== before.beamCol
    case 'chirp':
    case 'slip':
    case 'geckoTaste':
      return beatSeen(GECKO_ACTS, before.gecko, toy.gecko, cue, dt)
    case 'well':
      return dt === 0 && toy.hand === cue.colour && toy.wellAge[cue.colour!] === 0
    case 'button':
      return dt === 0 && toy.mirror === cue.n && toy.buttonAge === 0
    case 'lever':
      // On the lift of the finger that moved it, or by itself when the clatter has left the board dark.
      return toy.leverAge === 0 && toy.leverDown !== before.leverDown && toy.leverDown === (cue.n === 1)
    case 'beam':
      // One step for each peg of that colour a beam met on this beat, each now bright. (Where a beam and a half beam meet the same peg, it is bright once.)
      return cue.steps!.every((step) => toy.flashes.some((flash) => flash.colour === cue.colour && fresh(flash.age) && stepOf(flash.hole) === step))
    case 'rattle':
      // The handle begins to swing in this very frame, tapped or by itself.
      return toy.handleAge === 0
    case 'clunk':
      return toy.playing === 'clatter' && before.playing !== 'clatter'
    case 'trap':
      return toy.playing === 'trapped' && before.playing !== 'trapped' && toy.chase
    case 'thump':
      return dt === 0 && toy.pulseAge === 0
    case 'pluck':
      return dt === 0 && toy.sparks.some((spark) => spark.age === 0)
  }
}

/** Holds this moment: every sound to its motion, and every motion that has a sound to that sound. */
function hold(toy: Toy, before: Seen, dt: number, heard: Set<CueName>, label: string): void {
  const cues = toy.sounds.slice()
  toy.sounds.length = 0
  toy.hush = false
  for (const cue of cues) {
    expect(seen(cue, before, toy, dt), `${label}: ${JSON.stringify(cue)} with nothing seen to make it`).toBe(true)
    heard.add(cue.name)
  }
  // No sound is asked for twice at one moment: many pegs of a colour are one cue.
  for (let i = 0; i < cues.length; i++) for (let j = i + 1; j < cues.length; j++) expect(same(cues[i], cues[j]), `${label}: ${cues[i].name} twice`).toBe(false)
  // A peg that appears clicks; a peg that leaves is heard to leave, unless it is red and knocked, or dropped by the handle, which are heard when they strike.
  for (let hole = 0; hole < HOLES; hole++) {
    const was = before.shown[hole], is = toy.shown[hole]
    if (was === is) continue
    // (An echo still on its way when the handle reaches its stop stands at once, unheard, so that what drops is what was built.)
    if (is !== 0 && !(toy.playing === 'clatter' && before.playing !== 'clatter')) expect(cues.some((cue) => cue.name === 'click' && cue.colour === is), `${label}: a peg appeared in hole ${hole} in silence`).toBe(true)
    // A touch that ends the clatter puts every peg still on the board in its well at once, in silence (scenes.test.ts).
    if (was !== 0 && !(dt === 0 && before.playing === 'clatter') && !(toy.playing === 'clatter' && before.playing !== 'clatter')) {
      const at = centreOf(hole)
      const faller = toy.fallers.find((f) => f.colour === was && f.x === at.x && f.y === at.y && f.t <= dt + EPS)
      expect(faller, `${label}: the peg of hole ${hole} vanished`).toBeDefined()
      const quiet = (faller!.kind === 'knocked' && was === RED) || faller!.kind === 'dropped' || faller!.kind === 'caught'
      if (!quiet) expect(cues.some((cue) => (cue.name === 'knock' || cue.name === 'pull') && cue.colour === was), `${label}: a peg left hole ${hole} in silence`).toBe(true)
    }
  }
  if (dt > 0) {
    // A peg that reaches its well lands with its knock.
    for (const faller of before.inAir) {
      if (!toy.fallers.includes(faller)) expect(cues.some((cue) => (cue.name === 'land' || cue.name === 'drop') && cue.colour === faller.colour), `${label}: a peg landed in silence`).toBe(true)
    }
    // The moth lands with a pat or a tink, and catches a flash with a flutter.
    if (before.moth.mode === 'fly' && (toy.moth.mode === 'sit' || toy.moth.mode === 'away')) expect(cues.some((cue) => cue.name === 'pat' || cue.name === 'tink' || cue.name === 'flutter'), `${label}: the moth landed in silence`).toBe(true)
  }
  // A peg the beam meets sounds; the lever is heard to move.
  for (const flash of toy.flashes) {
    if (flash.age <= dt + EPS && !before.flashes.includes(flash.hole)) expect(cues.some((cue) => cue.name === 'beam' && cue.colour === flash.colour), `${label}: the beam met hole ${flash.hole} in silence`).toBe(true)
  }
  // (A touch that ends the clatter lifts the lever with the rest of the scene, in silence.)
  if (toy.leverDown !== before.leverDown && !(dt === 0 && before.playing === 'clatter')) expect(cues.some((cue) => cue.name === 'lever'), `${label}: the lever moved in silence`).toBe(true)
}

type At = { x: number; y: number }

/** Plays frames, holding each. */
function frames(toy: Toy, n: number, heard: Set<CueName>, label: string): void {
  for (let i = 0; i < n; i++) {
    const before = look(toy)
    toy.step(DT)
    hold(toy, before, DT, heard, `${label}, frame ${i}`)
  }
}

/** One touch: down, perhaps dragged in three moves, a few frames, and up. */
function touch(toy: Toy, at: At, to: At | null, down: number, heard: Set<CueName>, label: string): void {
  let before = look(toy)
  toy.press(at.x, at.y)
  hold(toy, before, 0, heard, `${label}, press`)
  if (to) {
    for (const share of [0.3, 0.7, 1]) {
      before = look(toy)
      toy.dragMove(at.x + (to.x - at.x) * share, at.y + (to.y - at.y) * share)
      hold(toy, before, 0, heard, `${label}, drag`)
      frames(toy, 1, heard, label)
    }
  }
  frames(toy, down, heard, label)
  before = look(toy)
  toy.release()
  hold(toy, before, 0, heard, `${label}, lift`)
}

/** A long, seeded session of touches on everything in the cabinet: taps, drags, all colours, all mirrors, the lever and the handle. */
function session(seed: number, length: number, heard: Set<CueName>): Toy {
  const chance = makeRng(seed)
  const toy = new Toy(freshSave(null), seed)
  const anyHole = () => centreOf(Math.floor(chance.next() * HOLES))
  for (let frame = 0; frame < length; frame++) {
    const label = `seed ${seed}, frame ${frame}`
    if (chance.next() < 0.09) {
      const roll = chance.next()
      let to: At | null = null
      let at: At
      if (roll < 0.4) at = anyHole()
      else if (roll < 0.54) { at = anyHole(); to = anyHole() }
      else if (roll < 0.66) at = wellMouth(COLOURS[Math.floor(chance.next() * 5)] as Colour)
      else if (roll < 0.73) at = BUTTONS[Math.floor(chance.next() * 3)]
      else if (roll < 0.77) at = toy.moth.resting ? { x: toy.moth.x, y: toy.moth.y } : SPIDER
      else if (roll < 0.8) at = SPIDER
      else if (roll < 0.83) at = GECKO
      else if (roll < 0.85) at = SPEAKER
      else if (roll < 0.93) at = knobAt(toy.leverDown ? 1 : 0)
      else if (roll < 0.95) { at = knobAt(0); to = knobAt(1) }
      else if (roll < 0.97) at = HANDLE
      else if (roll < 0.985) { at = HANDLE; to = { x: HANDLE.x, y: HANDLE.y + HANDLE.stop + 10 } }
      else at = { x: 600, y: 596 }
      touch(toy, at, to, 1 + Math.floor(chance.next() * 12), heard, label)
    }
    frames(toy, 1, heard, label)
  }
  return toy
}

describe('sight and sound on one clock', () => {
  it('holds every sound of long sessions to the frame of its motion, and every motion to its sound', () => {
    const heard = new Set<CueName>()
    for (const seed of [1, 2, 3]) session(seed, 60 * 60, heard)
    // The two scenes, each from a board that is sure to play all of it.
    const trapped = new Toy({ ...freshSave(null), board: Array.from({ length: HOLES }, (_, hole) => (hole === holeAt(6, 3) ? GREEN : hole === holeAt(4, 1) ? RED : 0)) }, 5)
    touch(trapped, knobAt(0), null, 3, heard, 'trapped: lever')
    frames(trapped, 60 * 5, heard, 'trapped: before the second green')
    // A green peg behind the beam: it can no longer leave.
    touch(trapped, wellMouth(GREEN), null, 2, heard, 'trapped: green in hand')
    for (let i = 0; i < 3600 && trapped.playing !== 'trapped'; i++) {
      const beam = trapped.beams.find((b) => !b.half)
      if (beam && beam.col === 4 && beam.dir === 1 && !beam.open && trapped.shown[holeAt(0, 3)] === 0) touch(trapped, centreOf(holeAt(0, 3)), null, 1, heard, 'trapped: the second green')
      frames(trapped, 1, heard, 'trapped: waiting')
    }
    expect(trapped.playing).toBe('trapped')
    frames(trapped, 60 * 8, heard, 'trapped: the scene')
    const full = new Toy({ ...freshSave(null), board: Array.from({ length: HOLES }, (_, hole) => (hole % 5) + 1) }, 6)
    touch(full, HANDLE, { x: HANDLE.x, y: HANDLE.y + HANDLE.stop + 10 }, 2, heard, 'clatter: handle')
    frames(full, 60 * 8, heard, 'clatter: the scene')
    expect(full.fallers).toEqual([])
    // Every sound the game has was reached, so none went unheld.
    expect([...heard].sort()).toEqual([...CUE_NAMES].sort())
  })

  it('gives a sound no later start than the moment it is asked for', () => {
    const heard = new Set<CueName>()
    const toy = session(4, 60 * 5, heard)
    expect(toy.sounds).toEqual([])
    for (const name of CUE_NAMES) for (const colour of COLOURS) for (const note of notesOf({ name, colour, steps: [3], n: 1 })) expect(note.delay ?? 0).toBe(0)
  })
})
