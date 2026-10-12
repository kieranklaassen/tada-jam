import { ALL_MAKINGS, copyBuild, draftOf, type Making } from './build'
import { LAID_OUT, LINE, PLACES, POND, SEAT, frameLeft, smooth } from './layout'
import { newPiece } from './pieces'
import { Scene, type Beat } from './scene'
import { traitsOf } from './traits'
import type { SoundName } from './voices'
import { MAX_POND, buildNow, emit, mark, newJourney, type World } from './world'

// The three short scenes. Each is a list of timed beats on the game's clock,
// filled in from the boat as built. What a scene changes is saved before its
// first beat, so a put-away at any moment of it loses nothing and nothing
// replays on load; the screen arrives there beat by beat, through `show`.
// Any touch ends a scene in its end state and silences it.

const POND_FRAME = PLACES.length - 1

/** A beat that only makes a sound, and stays quiet when a touch lands the scene. */
const cue = (w: World, at: number, name: SoundName, rate = 1): Beat => ({ at, lasts: 0, play: (_k, finishing) => { if (!finishing) emit(w, name, rate, true) } })

export function stepScene(w: World): void {
  if (!w.scene) return
  w.scene.play.update(w.time)
  if (!w.scene.play.running) w.scene = null
}

/** A touch: the scene ends now, in its end state, and what was still sounding of it is shut. */
export function finishScene(w: World): void {
  if (!w.scene) return
  w.scene.play.finish()
  w.scene = null
  w.cut = true
}

function begin(w: World, name: 'aboard' | 'lamp' | 'morning', beats: Beat[], save: () => void): void {
  finishScene(w)
  const play = new Scene(beats)
  play.start(w.time, save)
  w.scene = { name, play, started: w.time }
}

// --- Aboard -------------------------------------------------------------------

/**
 * The first making pressed onto a hull on the stone, or the boat lifted, while the gnome is not aboard: he
 * looks the boat over from keel to top, puts his hat straight, climbs over the side and sits.
 */
export function startAboard(w: World): void {
  if (w.gnomeAt !== 'stone') return
  const show = w.show
  begin(w, 'aboard', [
    { at: 0, lasts: 0.8, play: (k) => { show.look = k } },
    cue(w, 0.8, 'pat', 1.2),
    { at: 0.8, lasts: 0.4, play: (k) => { show.fix = Math.sin(k * Math.PI); show.look = 1 } },
    cue(w, 1.2, 'hup'),
    { at: 1.2, lasts: 0.7, play: (k) => { show.aboard = smooth(k); show.look = 0; show.fix = 0 } },
    { at: 1.9, lasts: 0, play: (_k, finishing) => {
      w.boat.leanV -= 1.6; w.boat.dipV += 60; w.boat.squashV += 3
      if (!finishing) emit(w, 'sit', 1, true)
    } },
  ], () => {
    w.gnomeAt = 'aboard'
    show.aboard = 0
    mark(w, true)
  })
}

// --- The lamp -----------------------------------------------------------------

/** The pond as it is when the ending is over: what a load finds, and what a touch lands the lamp scene in. */
export function settlePond(w: World): void {
  const build = buildNow(w), traits = traitsOf(build)
  w.frame = POND_FRAME
  w.cam = frameLeft(POND_FRAME)
  w.boat.mode = 'brook'
  w.journey = { ...newJourney(), reach: POND_FRAME, phase: 'moor' }
  w.boat.x = POND.moor.x
  w.boat.y = LINE + draftOf(build, false)
  w.boat.vx = 0
  w.boat.face = traits.includes('twomasts') ? -1 : 1
  w.gnomeAt = 'pad'
  const show = w.show
  show.aboard = 1
  show.pad = 1
  show.lamps = w.pond.map(() => 1)
  show.dusk = 1
  show.pile = traits.includes('pebble') ? 1 : 0
  show.rock = 0
  show.sigh = 0
  show.berry = traits.includes('berry') ? 1 : 0
}

/** How long the row of earlier lamps takes to answer, from the first to the last, however many there are. */
const ROW_SPAN = 0.9

/**
 * The ending is certain: the boat has come to the pond and is not held there, or has been freed there.
 * Everything the ending changes is saved now, before the lamp scene starts.
 */
export function endingCertain(w: World): void {
  const build = buildNow(w), traits = traitsOf(build)
  const show = w.show, boat = w.boat
  const from = boat.x
  const beats: Beat[] = [
    { at: 0, lasts: 2, play: (k) => { boat.x = from + (POND.moor.x - from) * smooth(k) } },
    cue(w, 1.9, 'knock', 0.7),
  ]
  // What the pond answers the boat's traits with, one after another, while it comes in.
  let at = 0.4
  const answer = (trait: string, cues: [number, SoundName, number][], play: (k: number) => void): void => {
    if (!traits.includes(trait as never)) return
    for (const [after, name, rate] of cues) beats.push(cue(w, at + after, name, rate))
    beats.push({ at, lasts: 1.2, play })
    at += 1.2
  }
  answer('broad', [[0, 'hush', 1]], (k) => { show.sigh = 1 - k })
  answer('twomasts', [[0.5, 'knock', 0.6], [0.9, 'knock', 0.55]], (k) => { boat.face = 1 - 2 * smooth(k) })
  answer('pebble', [[0, 'groan', 0.9], [0.6, 'squelch', 1]], (k) => { show.pile = smooth(k) })
  answer('walnut', [[0.1, 'cluck', 0.7], [0.5, 'cluck', 0.65], [0.95, 'cluck', 0.6]], (k) => { show.rock = 1 - k })
  const land = Math.max(2, at)
  beats.push(cue(w, land, 'hup', 0.9), { at: land, lasts: 1.2, play: (k) => { show.pad = smooth(k) } }, cue(w, land + 1.2, 'pat', 0.8))
  const mine = Math.min(w.pond.length, MAX_POND - 1)
  beats.push(cue(w, land + 1.4, 'click'), cue(w, land + 1.7, 'chime'), { at: land + 1.4, lasts: 0.6, play: (k) => { show.lamps[mine] = k } })
  if (traits.includes('berry')) beats.push(cue(w, land + 2.1, 'click', 1.3), cue(w, land + 2.3, 'chime', 1.5), { at: land + 2.1, lasts: 0.5, play: (k) => { show.berry = smooth(k) } })
  // The lamps of the boats sent before answer, one after another, and the sky wipes down to dusk. The row answers
  // with one soft chord and within one span, whatever its length: nothing here grows by one for each boat.
  if (mine > 0) beats.push(cue(w, land + 2.8, 'chord'))
  for (let i = 0; i < mine; i++) {
    const at = land + 2.8 + (i / mine) * ROW_SPAN
    beats.push({ at, lasts: 0.4, play: (k) => { show.lamps[i] = k } })
  }
  beats.push({ at: land + 2, lasts: 3, play: (k) => { show.dusk = k } })
  begin(w, 'lamp', beats, () => {
    w.finished = true
    w.where = 'pond'
    w.journey.reach = POND_FRAME
    w.journey.stuck = false
    w.journey.holder = null
    w.journey.phase = 'moor'
    if (w.pond.length >= MAX_POND) w.pond.shift()
    w.pond.push(copyBuild(build))
    show.lamps = w.pond.map(() => 0)
    show.sigh = traits.includes('broad') ? 1 : 0
    mark(w, true)
  })
  // The end state is whatever a load would find, whichever beat a touch lands it from.
  beats.push({ at: land + 5, lasts: 0, play: () => settlePond(w) })
}

// --- Morning ------------------------------------------------------------------

/** A fresh bank: a bare stone and all twelve makings laid out. */
export function freshBank(): { kind: Making; x: number; y: number }[] {
  return ALL_MAKINGS.map((kind) => ({ kind, ...LAID_OUT[kind] }))
}

/** The child lifts the sun: the sky wipes up to morning, the view runs back up the brook, and the gnome is on the stone. */
export function startMorning(w: World): void {
  if (!w.finished) return
  const show = w.show
  const from = frameLeft(POND_FRAME), lift = show.sun
  begin(w, 'morning', [
    cue(w, 0, 'chime', 1.2),
    // The wash is wiped back up the print. Each lamp goes out as the wash passes it: the view reads that from `dusk`.
    { at: 0, lasts: 1.2, play: (k) => { show.dusk = 1 - k } },
    cue(w, 1.2, 'trickle', 0.7),
    { at: 1.2, lasts: 2.4, play: (k) => { w.cam = from * (1 - smooth(k)); show.sun = lift * (1 - k) } },
    cue(w, 3.6, 'pat'),
    { at: 3.6, lasts: 0.4, play: (k) => { show.fix = Math.sin(k * Math.PI) } },
    { at: 4, lasts: 0, play: () => {
      w.cam = 0
      show.ghost = false
      show.pad = 0
      show.pile = show.rock = show.sigh = show.berry = 0
      w.boat.face = 1
      show.sun = 0
      show.dusk = 0
      show.fix = 0
      show.lamps = w.pond.map(() => 0)
    } },
  ], () => {
    w.finished = false
    w.where = 'bank'
    w.frame = -1
    w.journey = newJourney()
    w.gnomeAt = 'stone'
    w.pieces = freshBank().map((item) => newPiece(item.kind, { on: 'bank', x: item.x, y: item.y }))
    w.acts = []
    const boat = w.boat
    boat.mode = 'none'
    boat.at = 'stone'
    boat.restX = boat.x = SEAT.x
    boat.y = SEAT.y
    boat.vx = 0
    show.aboard = 0
    // The pond as it stood stays on show until the view has run back up the brook: the boat at its mooring,
    // the gnome on his pad, the berry on its pad and the pads piled at the bow. Nothing vanishes; all of it
    // slides out of the frame with the pond.
    show.ghost = true
    mark(w, true)
  })
}
