import type { Note } from './audio'
import { ROWS, moverOn, partAt, type Board, type Lane } from './board'
import type { DuckShow } from './duck'
import { DUCK_POST, FEET, SLIDE, centreX, centreY } from './layout'
import { DUCK_STEP_SECONDS, PEEL_LENGTH, ROLL_SECONDS, SPIT_SECONDS, TRAIN_AFTER, TRAIN_SECONDS, UNDER_SECONDS, WADDLE_SECONDS, leafLift, slideOn } from './motion'
import type { Beat } from './scene'
import type { Scenery } from './scenery'
import { STAGE } from './stage'
import { LONG_AGO, type BoardView } from './view'
import { CRUNCHES, DUST_OFF, EARS_UP, HEAP, LAUGH, LEAF_DOWN, LEAF_UP, NAPKIN, PAT, QUACK, QUACK_CROSS, SHAKE, SLIDE_ON, bellNotes, flattenNotes, glugNotes, landingNotes, late, peelNotes, sliceNotes, spitNotes, splashNotes, voiceFor } from './voices'

// The three scenes, each as a list of timed beats for scene.ts. A scene changes nothing in the saved state: what
// it shows was settled and saved before it starts (play.ts), so every beat only moves the view towards that end
// and makes its sound, and a touch that lands all the beats at once leaves the view exactly where the save is.

/** What a scene acts on: the view, the game's clock, the one voice, and a word to the Mount when the slide is over. */
export type Theatre = {
  view: BoardView
  now(): number
  sound(notes: readonly Note[]): void
  slideOver(): void
}

/** A cue: something that happens once, at `at`. Its sound is left out when a touch lands it unwatched. */
function cue(at: number, act: (watched: boolean) => void): Beat {
  return { at, lasts: 0, play: (_progress, finishing) => act(!finishing) }
}

// --- The duck goes first ---------------------------------------------------

/**
 * The duck steps into the lane of a new thing, takes its three or four steps, each followed by that lane's own
 * step, and the thing does to it what it does. The lane ends as `show` has it after the last step, which is what
 * the save already holds.
 */
export function showing(show: DuckShow, lane: Lane, on: Theatre): Beat[] {
  const { view } = on
  const beats: Beat[] = []
  const first = 0.45
  beats.push(cue(0.05, (watched) => {
    view.duck.quackAt = watched ? on.now() : LONG_AGO
    if (watched) on.sound(QUACK)
  }))
  let before = lane
  show.steps.forEach((step, i) => {
    const from = before, at = first + i * DUCK_STEP_SECONDS
    const ride = step.c === show.col ? moverOn(from, step.r) : null
    // A step onto the lorry's cab slides back onto its bed, as the rabbit's does.
    const mover = ride ? from.movers[ride.index] : null
    const onto = mover && mover.kind === 'lorry' && ride!.part === 0 && partAt(mover, 1) < ROWS ? partAt(mover, 1) : step.r
    beats.push(cue(at, (watched) => {
      if (!watched) return
      view.duckTo({ c: step.c, r: onto }, on.now(), i === 0 ? WADDLE_SECONDS * 1.5 : WADDLE_SECONDS)
      on.sound([...PAT, ...late(landingNotes(step.landing, 1), WADDLE_SECONDS)])
    }))
    beats.push(cue(at + WADDLE_SECONDS + (i === 0 ? WADDLE_SECONDS * 0.5 : 0), (watched) => {
      const now = on.now()
      if (watched && step.rang) view.ring(step.c, step.r, now)
      view.applyLane(show.col, step.lane, step.events, now, !watched)
      if (!watched) return
      // The lane's own step is heard, and under the duck's foot the bell with it: the train's snort and peep as it wakes.
      const notes = voiceFor(step.events)
      if (step.rang) on.sound([...bellNotes(1), ...notes])
      else if (notes.length > 0) on.sound(notes)
      // Carried by what it stands on, for as long as that stays on the board.
      if (ride && mover && mover.kind !== 'car' && mover.kind !== 'turtle' && step.rests !== null) view.duckTo({ c: step.c, r: step.rests, index: ride.index }, now, 0.01)
    }))
    before = step.lane
  })
  const last = show.steps[show.steps.length - 1]
  const end = first + (show.steps.length - 1) * DUCK_STEP_SECONDS + WADDLE_SECONDS
  const post = { x: DUCK_POST.x, y: DUCK_POST.y }
  const x = centreX(last.c)
  let home = end + 2.3
  if (show.end === 'flat' || show.end === 'train') {
    const hit = end + (show.end === 'train' ? TRAIN_AFTER + TRAIN_SECONDS * 0.4 : ROLL_SECONDS.car * 0.55)
    beats.push(cue(hit, (watched) => {
      if (!watched) return
      view.duckFlat(on.now())
      on.sound(flattenNotes(show.by ?? 'car', 1))
    }))
    beats.push(cue(hit + 0.75, (watched) => {
      if (!watched) return
      view.duck.peelFrom = on.now()
      on.sound(peelNotes(0, show.end === 'train'))
    }))
    // It quacks at the car as if the car had been in its way.
    beats.push(cue(hit + 0.75 + PEEL_LENGTH[0] + 0.1, (watched) => {
      if (!watched) return
      view.duck.quackAt = on.now()
      on.sound(QUACK_CROSS)
    }))
    home = hit + 0.75 + PEEL_LENGTH[0] + 0.7
    beats.push(cue(home, (watched) => {
      if (!watched) return
      view.duckTo(post, on.now(), 0.6)
      on.sound(PAT)
    }))
    home += 0.6
  } else if (show.end === 'arch') {
    // The lorry carries it into the arch; it comes back along the table's edge, dizzy.
    beats.push(cue(end, (watched) => {
      if (!watched) return
      const now = on.now()
      const dir = last.lane.movers.find((one) => one.kind === 'lorry')?.dir ?? 1
      view.duckTo({ x, y: dir === 1 ? STAGE.height + 60 : -80 }, now, ROLL_SECONDS.lorry)
      view.duck.hiddenFrom = now + ROLL_SECONDS.lorry * 0.7
      view.duck.hiddenUntil = now + 0.9
    }))
    beats.push(cue(end + 0.9, (watched) => {
      if (!watched) return
      view.duckAt(post.x + 150, STAGE.height + 70)
      view.duckTo(post, on.now(), 0.7)
      on.sound(PAT)
    }))
    home = end + 1.6
  } else {
    // Off the edge on a log, or down with a turtle: the fish has it, and spits it out onto the table.
    const row = show.end === 'edge' ? ((last.lane.movers.find((one) => one.kind === 'log')?.dir ?? 1) === 1 ? ROWS - 1 : 0) : last.r
    const dunk = end + (show.end === 'edge' ? ROLL_SECONDS.log * 0.8 : ROLL_SECONDS.turtle)
    if (show.end === 'edge') {
      beats.push(cue(end, (watched) => {
        if (watched) view.duckTo({ x, y: centreY(row) + FEET }, on.now(), ROLL_SECONDS.log * 0.8)
      }))
    }
    beats.push(cue(dunk, (watched) => {
      if (!watched) return
      view.duckDunk(last.c, row, on.now())
      on.sound([...(show.end === 'edge' ? splashNotes(1) : glugNotes(1)), ...late(spitNotes(1), UNDER_SECONDS)])
    }))
    beats.push(cue(dunk + UNDER_SECONDS, (watched) => {
      if (!watched) return
      view.duckAt(x, centreY(row) + FEET)
      view.duckTo(post, on.now(), SPIT_SECONDS + 0.2, 'spit')
    }))
    home = dunk + UNDER_SECONDS + SPIT_SECONDS + 0.25
  }
  // Back at its post it shakes itself, quacks, and stands with its chest out as before.
  beats.push(cue(home, (watched) => {
    if (!watched) return
    view.duck.shakeAt = on.now()
    on.sound(SHAKE)
  }))
  beats.push(cue(home + 0.5, (watched) => {
    if (watched) {
      view.duck.quackAt = on.now()
      on.sound(QUACK)
    }
  }))
  beats.push(cue(home + 0.9, () => view.duckHome(on.now())))
  return beats
}

// --- The picnic ------------------------------------------------------------

/**
 * The old rabbit's ears shoot up; it hands a slice to each of the four in the order of the line, each as it
 * arrived; they eat; the last slice goes to whoever arrived in the worst state; they sit in a row on the cloth.
 * `arrived` is how each one came, taken when the last of them lands.
 */
export function picnic(arrived: readonly ('wet' | 'tracked' | 'dry')[], on: Theatre): Beat[] {
  const { view } = on
  const beats: Beat[] = []
  beats.push(cue(0.35, (watched) => {
    if (!watched) return
    view.old.earsAt = on.now()
    on.sound(EARS_UP)
  }))
  arrived.forEach((how, who) => {
    const at = 0.95 + who * 0.78
    if (how === 'tracked') {
      // A tyre track is laughed at, and dusted off with an ear.
      beats.push(cue(at, (watched) => {
        if (!watched) return
        view.old.laughAt = on.now()
        view.pawns[who].trackHops = 0
        view.pawns[who].trackOff = on.now() + 0.5
        // It dusts the track off its own tummy with one ear, as the brushing is heard and the track fades.
        view.pawns[who].dustAt = on.now() + 0.5
        on.sound([...LAUGH, ...late(DUST_OFF, 0.5)])
      }))
    }
    beats.push(cue(at + (how === 'dry' ? 0 : 0.3), (watched) => {
      // A wet guest is wrapped in the napkin before anything else.
      view.serve(who, watched ? on.now() : LONG_AGO, how === 'wet' && watched)
      if (watched) on.sound(how === 'wet' ? [...NAPKIN, ...late(sliceNotes(who), 0.2)] : sliceNotes(who))
    }))
  })
  const eat = 0.95 + arrived.length * 0.78 + 0.35
  beats.push(cue(eat, (watched) => {
    if (!watched) return
    view.picnic.eatAt = on.now()
    on.sound(CRUNCHES)
  }))
  // The last slice goes to whoever arrived in the worst state: the first with a tyre track, or else the first wet one, or else the last in the line.
  const tracked = arrived.indexOf('tracked'), wet = arrived.indexOf('wet')
  const worst = tracked >= 0 ? tracked : wet >= 0 ? wet : arrived.length - 1
  beats.push(cue(eat + 1.5, (watched) => {
    view.serve(worst, watched ? on.now() : LONG_AGO, false)
    if (watched) on.sound(sliceNotes(arrived.length))
  }))
  beats.push(cue(eat + 2.4, () => view.served()))
  return beats
}

// --- The tip and the slide -------------------------------------------------

const TIP_SECONDS = 1.9

/**
 * She has hopped on to the lane beyond the cloth. If small ones were left behind, the leaf behind the fold lifts
 * and they slide down to the cloth in a heap; then the board slides on until the cloth is the home bank. `board`
 * and `scenery` are the next crossing's, with the family already in its line: that is what the save holds.
 */
export function slide(tipped: readonly number[], board: Board, scenery: Scenery, on: Theatre): Beat[] {
  const { view } = on
  const beats: Beat[] = []
  let at = 0.45
  if (tipped.length > 0) {
    beats.push(cue(at, (watched) => {
      if (!watched) return
      view.catDown(on.now())
      on.sound(LEAF_UP)
    }))
    beats.push({ at, lasts: TIP_SECONDS, play: (progress) => { view.leaf = progress >= 1 ? 0 : leafLift(progress) } })
    beats.push(cue(at + TIP_SECONDS * 0.26, (watched) => {
      if (!watched) return
      view.tumble(tipped, on.now())
      on.sound(HEAP)
    }))
    beats.push(cue(at + TIP_SECONDS * 0.95, (watched) => {
      if (watched) on.sound(LEAF_DOWN)
    }))
    at += TIP_SECONDS + 0.1
  }
  beats.push(cue(at, (watched) => {
    view.leaf = 0
    view.beginSlide(board, scenery, on.now())
    if (watched) on.sound(SLIDE_ON)
  }))
  beats.push({
    at,
    lasts: 1.3,
    play: (progress) => {
      view.slid = SLIDE * slideOn(progress)
      if (progress >= 1) {
        view.endSlide(on.now())
        on.slideOver()
      }
    },
  })
  return beats
}
