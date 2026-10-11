import type { Note } from './audio'
import { REST, STILL, TAU, bump, ease, gaitPose, wave, type On } from './motion'
import { bell, chirp, creak, each, hiss, hoot, hum, knock, later, paper, say, squeak, thump, tick, tone } from './notes'
import { SEAT_DROP, lanternsOf, rungsOf } from './shape'
import { PLACES, type Fit, type Folk } from './tree'
import type { Kind } from './ways'

// Everything a walker does that has a beginning and an end is a script: one
// list of beats on one timeline. A beat says where on the piece the walker
// goes, what its card and the piece do while it goes, and the notes that
// sound in it. The rules step the timeline, the frame draws from it and
// each note is handed to the sound when the timeline reaches it, so nothing
// can be heard that is not being drawn: a script that waits is silent while
// it waits, and one that is dropped is silent from then on. The fifty-six
// meetings of the design sheet's grid are written out here one by one, and
// so are the flourishes, the waits at a bucket, the rides, and the stretch
// in the morning.

export type Act = (u: number, on: On) => void

export type Beat = {
  /** Seconds from the start of the script, and how long the beat takes. */
  at: number
  lasts: number
  /** Where along the piece the walker is when the beat starts and when it ends. */
  from: number
  to: number
  act: Act | null
  /** The notes that sound when the beat begins, each within the beat. */
  sound: readonly Note[]
}

export type Script = { beats: readonly Beat[]; seconds: number }

class Build {
  readonly beats: Beat[] = []
  private t = 0
  private a = 0
  /** Goes along the piece to `to`. */
  go(to: number, seconds: number, act: Act | null = null, sound: readonly Note[] = []): this {
    this.beats.push({ at: this.t, lasts: seconds, from: this.a, to, act, sound })
    this.t += seconds
    this.a = to
    return this
  }
  /** Stays where it is on the piece. */
  stay(seconds: number, act: Act | null = null, sound: readonly Note[] = []): this {
    return this.go(this.a, seconds, act, sound)
  }
  done(): Script {
    return { beats: this.beats, seconds: this.t }
  }
}

/** The state of a script at `t` seconds, written into `on`. */
export function playAt(script: Script, t: number, on: On): On {
  Object.assign(on.pose, REST)
  Object.assign(on.piece, STILL)
  on.hang = 0
  on.sink = 0
  on.seat = false
  const beats = script.beats
  let beat = beats[beats.length - 1]
  for (const one of beats) if (t < one.at + one.lasts) { beat = one; break }
  const u = beat.lasts > 0 ? Math.max(0, Math.min(1, (t - beat.at) / beat.lasts)) : 1
  on.along = beat.from + (beat.to - beat.from) * u
  beat.act?.(u, on)
  return on
}

/** The beats that begin after `t0` and no later than `t1`. A script that is starting passes a `t0` below zero. */
export function beatsBegun(script: Script, t0: number, t1: number): Beat[] {
  return script.beats.filter((beat) => beat.at > t0 && beat.at <= t1)
}

/**
 * The notes that begin after `t0` and no later than `t1` on the script's own time, each ready to sound at once.
 * A script that is starting passes a `t0` below zero. Sound is taken from here as the script is stepped, so a
 * script that stands still or is dropped is silent from that moment. `fromBeat` leaves out the beats before it.
 */
export function notesBegun(script: Script, t0: number, t1: number, fromBeat = 0): Note[] {
  const out: Note[] = []
  for (let i = fromBeat; i < script.beats.length; i++) {
    const beat = script.beats[i]
    if (beat.at > t1) break
    for (const note of beat.sound) {
      const at = beat.at + (note.delay ?? 0)
      if (at > t0 && at <= t1) out.push(note.delay ? { ...note, delay: 0 } : note)
    }
  }
  return out
}

/** How much of a note must be left for it to begin again when a move that stood still goes on. */
export const RING_LEFT = 0.12

/**
 * The notes that had begun before `t` and would still be ringing then, each as it begins again at `t`: at the
 * pitch its glide had reached, for the time it had left, and quieter by the share of it that has gone. A walker
 * that a flourish made stand still on its piece is hushed, and when the move goes on these give the rest of the
 * move its sound.
 */
export function notesRinging(script: Script, t: number): Note[] {
  const out: Note[] = []
  for (const beat of script.beats) {
    if (beat.at >= t) break
    for (const note of beat.sound) {
      const start = beat.at + (note.delay ?? 0), long = note.attack + note.decay, left = start + long - t
      if (start >= t || left < RING_LEFT) continue
      const gone = (t - start) / long
      const attack = Math.min(0.03, left / 3)
      out.push({
        ...note, delay: 0, attack, decay: left - attack, peak: note.peak * Math.max(0.4, 1 - gone),
        frequency: note.glideTo ? note.frequency * (note.glideTo / note.frequency) ** gone : note.frequency,
      })
    }
  }
  return out
}

// ---------------------------------------------------------------- the acts

/** The walker's own gait, `steps` steps over the beat. */
const walk = (folk: Folk, steps: number): Act => (u, on) => { gaitPose(folk, u * steps, on.pose) }
const also = (...acts: Act[]): Act => (u, on) => { for (const act of acts) act(u, on) }
/** Up and down once, `high` at the top. */
const hop = (high: number): Act => (u, on) => { on.pose.dy -= high * bump(u) }

// ------------------------------------------------------- the grid, cell by cell

function plank(folk: Folk, fit: Fit, up: boolean): Script {
  const b = new Build()
  if (fit === 'span') {
    switch (folk) {
      case 'squirrel':
        // Runs it flat out with his tail streaming, a quick patter of claws, and skids to a stop at the far end.
        return b.go(0.82, 0.56, also(walk(folk, 7), (_u, on) => { on.pose.tilt = 0.3; on.pose.part = -1 }), each(7, 0.56, (i) => tick(2600 + (i % 2) * 300)))
          .go(1, 0.3, (u, on) => { on.pose.tilt = -0.42 * (1 - u); on.pose.squash = 0.84 + 0.16 * u; on.pose.part = 1 - u }, [hiss(1900, 1.2, 0.1, 0.01, 0.24, 0, 800)]).done()
      case 'owl':
        // Waddles over heel to toe with her wings out; the plank bows under her and creaks at every step.
        return b.go(1, 3.2, also(walk(folk, 8), (u, on) => { on.pose.puff = 1.14; on.piece.bounce = 0.5 * bump(u) + 0.25 * Math.abs(wave(u * 4)) }), each(8, 3.2, (i) => creak(150 - (i % 2) * 16, 124, 0.24, 0.07))).done()
      case 'mice':
        // One twin wheels the other across by the back legs, squeak-squeak-squeak in step.
        return b.go(1, 1.5, also(walk(folk, 6), (_u, on) => { on.pose.flip = 0.9; on.pose.stack = -14; on.pose.pair = -10 }), each(6, 1.5, (i) => squeak(i % 2 === 1))).done()
      case 'beetle':
        // Plods over tapping the plank ahead with his stick, tok, tok, tok, and nods at the far end.
        return b.go(1, 3.3, also(walk(folk, 6), (u, on) => { on.pose.tilt = 0.1 + 0.06 * bump((u * 6) % 1) }), each(6, 3.3, () => knock(330, 0.13)))
          .stay(0.5, (u, on) => { on.pose.tilt = 0.2 * bump(u); on.pose.part = 0.5 * bump(u) }, hum(165, 0.3, 0, 185)).done()
    }
  }
  // On a rise it is a steep ramp.
  switch (folk) {
    case 'squirrel':
      // Scrabbles up it; runs down it.
      if (up) return b.go(1, 1.0, also(walk(folk, 12), (u, on) => { on.along -= 0.05 * Math.abs(wave(u * 6)); on.pose.tilt = 0.5 }), each(12, 1.0, (i) => hiss(2100 + (i % 3) * 200, 3, 0.07, 0.002, 0.04))).done()
      return b.go(1, 0.5, also(walk(folk, 5), (_u, on) => { on.pose.tilt = 0.45 }), each(5, 0.5, () => tick(2400))).done()
    case 'mice':
      // Go up with one pushing the other, feet skittering; come down in a heap.
      if (up) return b.go(1, 1.9, also(walk(folk, 10), (u, on) => { on.pose.pair = -14; on.pose.flip = -0.4; on.along -= 0.03 * Math.abs(wave(u * 5)) }), each(10, 1.9, (i) => hiss(2800 + (i % 2) * 500, 5, 0.06, 0.002, 0.03))).done()
      return b.go(1, 0.8, (u, on) => { on.along = u * u; on.pose.tilt = 0.4; on.pose.pair = -12; on.pose.stack = -10 }, [squeak(false, 0, 0.7), squeak(true, 0.1, 0.7)]).done()
    case 'beetle':
      if (up) {
        // Walks up three steps and slides back down on his back with his legs waving and a long dry scrape.
        return b.go(0.36, 1.7, walk(folk, 3), each(3, 1.7, () => knock(330, 0.13)))
          .go(0, 1.1, (u, on) => { on.pose.tilt = -1.5 * ease(u * 4); on.pose.part = wave(u * 5); on.pose.dx = 3 * wave(u * 7) }, [hiss(900, 1.4, 0.11, 0.05, 0.95, 0, 500)])
          .stay(0.7, (u, on) => { on.pose.tilt = -1.5 * (1 - ease(u)); on.pose.part = 0.4 * bump(u) }, hum(147, 0.3, 0.2, 120)).done()
      }
      // Comes down it on his back and gets up at its foot.
      return b.go(1, 1.2, (u, on) => { on.along = u * u; on.pose.tilt = -1.5; on.pose.part = wave(u * 4) }, [hiss(800, 1.4, 0.1, 0.05, 1.0, 0, 420)])
        .stay(0.6, (u, on) => { on.pose.tilt = -1.5 * (1 - ease(u)) }, hum(147, 0.25, 0.25, 160)).done()
    case 'owl':
      if (up) {
        // Looks up it, says a flat hoo and will not.
        return b.stay(0.9, (u, on) => { on.pose.tilt = -0.14 * bump(u); on.pose.part = -0.3 * bump(u) })
          .stay(0.9, (u, on) => { on.pose.puff = 1 + 0.07 * bump(u) }, hoot(294, 0.6))
          .stay(0.5, (u, on) => { on.pose.part = bump(u) }).done()
      }
      // Coming down she sits and slides with her feathers blown back, whump.
      return b.stay(0.5, (u, on) => { on.pose.squash = 1 - 0.18 * ease(u) })
        .go(1, 0.9, (u, on) => { on.along = u * u; on.pose.squash = 0.82; on.pose.tilt = -0.36; on.pose.puff = 1.16 }, [hiss(700, 0.9, 0.09, 0.2, 0.6, 0, 2400)])
        .stay(0.45, (u, on) => { on.pose.squash = 0.82 - 0.14 * bump(u) + 0.18 * u; on.pose.puff = 1.16 - 0.16 * u }, thump(96, 0.2)).done()
  }
}

function ladder(folk: Folk, fit: Fit, up: boolean, place: number): Script {
  const b = new Build()
  const rungs = rungsOf(place)
  if (fit === 'rise') {
    switch (folk) {
      case 'squirrel': {
        // Goes up two rungs at a time, each hop a wooden note higher than the last, and vaults off the top.
        const hops = Math.max(2, Math.round(rungs / 2))
        return b.go(0.84, 0.2 * hops, (u, on) => { on.pose.dy = -14 * bump((u * hops) % 1); on.pose.part = -0.6 }, each(hops, 0.2 * hops, (i) => knock(392 * 1.122 ** (up ? i * 2 : (hops - i) * 2), 0.13)))
          .go(1, 0.36, (u, on) => { on.pose.dy = -30 * bump(u); on.pose.spin = up ? TAU * ease(u) : 0; on.pose.part = 1 }, [chirp(1700)]).done()
      }
      case 'owl':
        // Puts one foot on the first rung, the rung bends with a groan, she takes the foot off and hoots twice, low.
        return b.go(0.07, 0.6, (u, on) => { on.pose.tilt = 0.1 * u })
          .stay(0.8, (u, on) => { on.pose.tilt = 0.1; on.pose.squash = 1 - 0.05 * bump(u); on.piece.bounce = 0.6 * bump(u) }, [creak(118, 88, 0.6, 0.09)])
          .go(0, 0.5, (u, on) => { on.pose.tilt = 0.1 * (1 - u) })
          .stay(1.1, (u, on) => { on.pose.puff = 1 + 0.08 * bump((u * 2) % 1) }, [...hoot(220, 0.32), ...hoot(220, 0.32, 0.55)]).done()
      case 'mice':
        // One goes up the front and one up the back, rung for rung, in two quick little scales a note apart.
        return b.go(1, 0.22 * rungs, (u, on) => { on.pose.pair = -34; on.pose.stack = 9 * wave(u * rungs * 0.5); on.pose.dy = -5 * bump((u * rungs) % 1) },
          each(rungs, 0.22 * rungs, (i) => [tone(784 * 1.122 ** (up ? i : rungs - i), 0.07, 0.003, 0.07), tone(880 * 1.122 ** (up ? i : rungs - i), 0.07, 0.003, 0.07, 0.11)])).done()
      case 'beetle':
        // Climbs every rung, slowly, his stick hooked over one arm, one low wooden note for each and a puff at the top.
        return b.go(1, 0.7 * rungs, (u, on) => { const k = Math.floor(u * rungs), f = u * rungs - k; on.along = (k + ease(f * 1.6)) / rungs; on.pose.tilt = 0.09; on.pose.dy = 4 * (1 - ease(f * 1.6)) }, each(rungs, 0.7 * rungs, (i) => knock(196 * 1.06 ** (up ? i : rungs - i), 0.14)))
          .stay(0.6, (u, on) => { on.pose.puff = 1 + 0.12 * bump(u) }, [hiss(1200, 0.7, 0.07, 0.08, 0.3)]).done()
    }
  }
  // On a span it lies flat.
  switch (folk) {
    case 'beetle':
      // Crosses it pleased, a rung at a time, clack, clack.
      return b.go(1, 0.52 * rungs, (u, on) => { const k = Math.floor(u * rungs), f = u * rungs - k; on.along = (k + ease(f * 1.8)) / rungs; on.pose.part = 0.35; on.pose.dy = -3 * bump(f) }, each(rungs, 0.52 * rungs, (i) => knock(i % 2 ? 440 : 392, 0.12))).done()
    case 'squirrel':
      // Hops from rung to rung with a quick tick-tick-tick of claws.
      return b.go(1, 0.11 * rungs, (u, on) => { on.pose.dy = -9 * bump((u * rungs) % 1); on.pose.part = 0.4 * wave(u * rungs) }, each(rungs, 0.11 * rungs, () => tick(3000, 0.09))).done()
    case 'mice':
      // Drop through between two rungs, catch hold and go along underneath hand over hand, squeaking.
      return b.go(0.14, 0.3, walk(folk, 2))
        .stay(0.4, (u, on) => { on.hang = 34 * ease(u * 1.6); on.pose.squash = 1 + 0.2 * bump(u) }, [squeak(false, 0, 1.5), squeak(true, 0.05, 1.5)])
        .go(0.86, 1.6, (u, on) => { on.hang = 34; on.pose.tilt = 0.3 * wave(u * 3); on.pose.flip = 0.2 * wave(u * 3) }, each(6, 1.6, (i) => squeak(i % 2 === 1, 0, 1.05)))
        .stay(0.4, (u, on) => { on.hang = 34 * (1 - ease(u)) })
        .go(1, 0.2, walk(folk, 2)).done()
    case 'owl':
      // Puts a foot through, pulls it out with a pop and will not.
      return b.go(0.08, 0.5, walk(folk, 1), thump(104, 0.07))
        .stay(0.5, (u, on) => { on.pose.dy = 12 * ease(u * 1.2); on.pose.tilt = 0.16 * ease(u) }, knock(196, 0.14))
        .stay(0.4, (u, on) => { on.pose.dy = 12 * (1 - ease(u * 2.5)); on.pose.tilt = 0.16 * (1 - u); on.pose.squash = 1 + 0.1 * bump(u) }, [tone(300, 0.14, 0.003, 0.08, 0.1, 900, 'sine')])
        .go(0, 0.4, walk(folk, 1))
        .stay(0.7, (u, on) => { on.pose.part = bump(u) }, hoot(262, 0.4)).done()
  }
}

function bridge(folk: Folk, fit: Fit, up: boolean, fromTop: boolean): Script {
  const b = new Build()
  if (fit === 'span') {
    switch (folk) {
      case 'squirrel': {
        // Runs it while it bounces under him, boing after boing getting quicker, and is flung off the far end onto his feet.
        const starts = [0, 0.4, 0.72, 0.98, 1.18]
        const boing = (u: number): number => { const t = u * 1.34; let k = starts.length - 1; while (k > 0 && t < starts[k]) k--; const end = k + 1 < starts.length ? starts[k + 1] : 1.34; return (t - starts[k]) / (end - starts[k]) }
        return b.go(0.9, 1.34, (u, on) => { const f = boing(u); on.pose.dy = -20 * bump(f); on.piece.bounce = 0.7 * (0.5 - bump(f)); on.pose.part = -0.7 }, starts.map((at, i) => tone(180 + i * 26, 0.12, 0.01, 0.2, at, 330 + i * 40, 'sine')))
          .go(1, 0.36, (u, on) => { on.pose.dy = -36 * bump(u); on.pose.spin = TAU * ease(u); on.piece.bounce = -0.5 * (1 - u) * wave(u * 3) }, [chirp(1500, 0, 2100)]).done()
      }
      case 'owl':
        // Stops at the edge, puffs up to twice her size, turns her head right round to look the other way and clicks her beak.
        return b.go(0.04, 0.5, walk(folk, 1))
          .stay(0.8, (u, on) => { on.pose.puff = 1 + 0.9 * ease(u) }, [hiss(500, 0.8, 0.08, 0.3, 0.5, 0, 1500)])
          .stay(0.9, (u, on) => { on.pose.puff = 1.9; on.pose.part = 2 * ease(u) }, each(4, 0.9, () => tone(620, 0.07, 0.002, 0.03)))
          .stay(0.6, (u, on) => { on.pose.puff = 1.9 - 0.9 * ease(u); on.pose.part = 2 * (1 - ease(u)) }, [tone(1500, 0.1, 0.002, 0.025), tone(1500, 0.1, 0.002, 0.025, 0.14)])
          .go(0, 0.4, walk(folk, 1)).done()
      case 'mice':
        // Run to the middle and stop to swing it from side to side, higher each time, with a creak of rope and a squeal at each end of the swing; then they run back to the side they came from, still squeaking.
        return b.go(0.5, 0.6, walk(folk, 4))
          .stay(2.4, (u, on) => { const a = 0.25 + 0.75 * u, s = a * wave(u * 3); on.piece.sway = 0.5 * s; on.pose.dx = 14 * s; on.pose.tilt = 0.5 * s; on.pose.flip = 0.2 * s },
            each(6, 2.4, (i) => [creak(196 - (i % 2) * 30, 150, 0.2, 0.05, 0.2), squeak(i % 2 === 1, 0.2, 1.3 + i * 0.04)]))
          .go(0, 0.6, walk(folk, 4), each(4, 0.6, (i) => squeak(i % 2 === 1))).done()
      case 'beetle':
        // Crosses bent low, holding the rope hand over hand, while the whole bridge shivers and its slats chatter.
        return b.go(1, 3.6, also(walk(folk, 8), (u, on) => { on.pose.tilt = 0.42; on.piece.rattle = 0.012 * wave(u * 40); on.piece.bounce = 0.25 * bump(u) }), each(8, 3.6, () => [tick(900, 0.07), tick(1100, 0.07, 0.06), tick(800, 0.07, 0.12)])).done()
    }
  }
  // On a rise it hangs down as a net.
  switch (folk) {
    case 'squirrel':
      // Runs up it with the ropes thrumming.
      return b.go(1, 0.8, also(walk(folk, 8), (u, on) => { on.piece.sway = 0.2 * wave(u * 4); on.pose.tilt = 0.3 }), each(8, 0.8, (i) => tone(up ? 196 + i * 12 : 290 - i * 12, 0.08, 0.004, 0.09, 0, undefined, 'sawtooth'))).done()
    case 'mice':
      if (fromTop) return peer(folk, 'bridge')
      // Swing on it, squealing in turn.
      return b.go(0.3, 0.5, walk(folk, 3))
        .stay(2.0, (u, on) => { const s = wave(u * 3); on.hang = 8; on.piece.sway = 0.5 * s; on.pose.dx = 16 * s; on.pose.tilt = 0.4 * s }, each(6, 2.0, (i) => squeak(i % 2 === 1, 0.16, 1.4)))
        .go(0, 0.4, walk(folk, 3)).done()
    case 'beetle':
      if (fromTop) return peer(folk, 'bridge')
      // Climbs two knots, turns over in it and hangs upside down humming until it lowers him back, a slow rope creak.
      return b.go(0.3, 1.4, walk(folk, 2), each(2, 1.4, () => knock(294, 0.12)))
        .stay(0.8, (u, on) => { on.pose.spin = Math.PI * ease(u); on.piece.sway = 0.2 * bump(u) }, [tone(196, 0.1, 0.004, 0.3, 0, 150, 'sawtooth')])
        .stay(1.2, (u, on) => { on.pose.spin = Math.PI; on.pose.dx = 3 * wave(u * 2) }, hum(131, 1.0))
        .go(0, 1.2, (u, on) => { on.pose.spin = Math.PI * (1 - ease(u)); on.piece.sway = 0.12 * wave(u * 2) }, [creak(140, 96, 1.0, 0.07)]).done()
    case 'owl':
      // Pecks it once, it twangs, and she will not.
      return b.go(0.05, 0.4, walk(folk, 1))
        .stay(0.35, (u, on) => { on.pose.tilt = 0.36 * bump(u) }, [tick(1800, 0.1, 0.17)])
        .stay(0.7, (u, on) => { on.piece.sway = 0.3 * (1 - u) * Math.cos(u * 22) }, [tone(294, 0.12, 0.004, 0.5, 0, 280, 'sawtooth')])
        .go(0, 0.4, walk(folk, 1))
        .stay(0.6, (u, on) => { on.pose.part = bump(u) }, hoot(277, 0.35)).done()
  }
}

function bucket(folk: 'squirrel', fit: Fit, up: boolean): Script {
  const b = new Build()
  void folk
  if (fit === 'rise') {
    // Will not wait for it: he goes up the rope hand over hand with the pulley squealing and the bucket knocking against the trunk.
    return b.go(1, 1.2, (u, on) => { on.pose.dy = -6 * bump((u * 8) % 1); on.pose.part = 0.8 * wave(u * 4); on.piece.swing = 0.4 * wave(u * 4) },
      each(8, 1.2, (i) => (i % 2 === 0 ? tone(up ? 1040 : 880, 0.06, 0.02, 0.07, 0, up ? 1240 : 760, 'sine') : knock(262, 0.1)))).done()
  }
  // On a span it hangs from a line as a cable car: he walks the line like a tightrope, arms out, the line humming under his feet.
  return b.go(1, 1.6, (u, on) => { on.pose.tilt = 0.14 * wave(u * 4); on.pose.part = 0.9 * wave(u * 4); on.pose.dy = -4 * bump((u * 8) % 1); on.piece.bounce = 0.4 * bump(u) },
    [tone(110, 0.09, 0.2, 1.3, 0, 123, 'sawtooth'), ...each(8, 1.6, () => tick(1500, 0.04))]).done()
}

function swing(folk: Folk, fit: Fit, fromTop: boolean): Script {
  const b = new Build()
  const SIT = SEAT_DROP - 2
  if (fit === 'span') {
    // Everyone who gets onto the seat hops out to it from the landing and back.
    const out: Act = (u, on) => { on.hang = SIT * ease(u); on.pose.dy = -22 * bump(u) }
    const back: Act = (u, on) => { on.hang = SIT * (1 - ease(u)); on.pose.dy = -22 * bump(u) }
    switch (folk) {
      case 'squirrel':
        // Jumps onto the seat, swings out once and is thrown back the way he came, heels over head, with a rising whoop and a bump.
        return b.go(0.5, 0.3, out)
          .stay(0.7, (u, on) => { on.hang = SIT; on.seat = true; on.piece.swing = 0.9 * ease(u) }, [tone(700, 0.11, 0.05, 0.6, 0, 1900, 'sine')])
          .go(0, 0.6, (u, on) => { on.hang = SIT * (1 - ease(u * 1.4)); on.pose.dy = -44 * bump(u); on.pose.spin = -TAU * ease(u); on.piece.swing = 0.9 * (1 - u) * Math.cos(u * 9) })
          .stay(0.35, (u, on) => { on.pose.squash = 1 - 0.3 * bump(u) }, thump(130, 0.2)).done()
      case 'owl':
        // Sits on it very upright and swings a hand's width each way with her eyes shut, a slow soft creak, then gets off where she got on.
        return b.go(0.5, 0.7, out)
          .stay(2.4, (u, on) => { on.hang = SIT; on.seat = true; on.pose.lid = 1; on.piece.swing = 0.13 * wave(u * 2); on.piece.sag = 5 }, each(4, 2.4, (i) => creak(i % 2 ? 150 : 170, i % 2 ? 170 : 150, 0.45, 0.05, 0.1)))
          .go(0, 0.7, back).done()
      case 'mice':
        // Both on the seat, one standing, pumping it higher and higher with a squeal at the top of each swing.
        return b.go(0.5, 0.4, out)
          .stay(3.0, (u, on) => { on.hang = SIT; on.seat = true; on.pose.pair = -22; on.pose.stack = -30; on.piece.swing = (0.2 + 0.6 * u) * wave(u * 4) }, each(8, 3.0, (i) => squeak(i % 2 === 1, 3.0 / 32, 1.2 + i * 0.05, 0.05 + i * 0.004)))
          .go(0, 0.5, back).done()
      case 'beetle':
        // Sits, finds his feet do not reach, swings twice with a small worried rattle and gets off backwards.
        return b.go(0.5, 1.0, out)
          .stay(0.6, (u, on) => { on.hang = SIT; on.seat = true; on.pose.tilt = 0.18 * bump(u); on.pose.part = -0.3 * bump(u) })
          .stay(1.6, (u, on) => { on.hang = SIT; on.seat = true; on.piece.swing = 0.22 * wave(u * 2); on.pose.part = 0.3 * wave(u * 8) }, each(8, 1.6, (i) => tick(700 + (i % 2) * 90, 0.07)))
          .go(0, 1.0, also(back, (_u, on) => { on.pose.tilt = -0.12 })).done()
    }
  }
  // On a rise it hangs as a rope with a seat at the bottom.
  switch (folk) {
    case 'squirrel':
      // Climbs the rope with a rasp of claws and gets across.
      return b.go(1, 1.0, (u, on) => { on.pose.dy = -5 * bump((u * 6) % 1); on.pose.part = 0.6 * wave(u * 3); on.piece.swing = 0.12 * wave(u * 3) }, each(6, 1.0, () => hiss(1300, 2.2, 0.08, 0.01, 0.1, 0, 900))).done()
    case 'mice':
      if (fromTop) return peer(folk, 'swing')
      // Swing on the seat and bump the trunk at each end, thump, squeak.
      return b.go(0.25, 0.35, hop(16))
        .stay(2.4, (u, on) => { on.seat = true; on.pose.pair = -18; on.piece.swing = 0.42 * wave(u * 3) }, each(6, 2.4, (i) => [...thump(140, 0.13, 0.2), squeak(i % 2 === 1, 0.26)]))
        .go(0, 0.35, hop(16)).done()
    case 'beetle':
      if (fromTop) return peer(folk, 'swing')
      // Gives the seat a push with his stick and watches it go, tick, tick.
      return b.go(0.08, 0.6, walk(folk, 1))
        .stay(0.4, (u, on) => { on.pose.tilt = 0.26 * bump(u); on.piece.swing = 0.5 * ease(u) }, knock(220, 0.12, 0.2))
        .stay(1.8, (u, on) => { on.piece.swing = 0.5 * Math.exp(-2 * u) * Math.cos(u * 4.5 * Math.PI); on.pose.part = 0.25 * Math.exp(-2 * u) * Math.cos(u * 4.5 * Math.PI) }, each(4, 1.6, (i) => tick(1000 - i * 60, 0.08 - i * 0.012, 0.2)))
        .go(0, 0.5, walk(folk, 1)).done()
    case 'owl':
      if (fromTop) return peer(folk, 'swing')
      // Sits on the seat and is spun slowly round one way and then the other, with a rope twist creak.
      return b.go(0.25, 0.7, hop(10))
        .stay(1.4, (u, on) => { on.seat = true; on.pose.yaw = TAU * ease(u); on.piece.sag = 5 }, [creak(120, 190, 1.2, 0.07)])
        .stay(1.4, (u, on) => { on.seat = true; on.pose.yaw = TAU * (1 - ease(u)); on.piece.sag = 5 }, [creak(190, 120, 1.2, 0.07)])
        .go(0, 0.7, hop(10)).done()
  }
}

/** A lantern's own small note: the string is a scale from one end to the other. */
const LAMP = [1047, 1175, 1319, 1568, 1760, 2093, 2349]

function lanterns(folk: Folk, fit: Fit, up: boolean, fromTop: boolean, place: number): Script {
  const b = new Build()
  const lamps = lanternsOf(place).length
  if (fit === 'span') {
    switch (folk) {
      case 'squirrel':
        // Walks the string like a tightrope with his arms out, and each lantern he steps over rings its own small note.
        return b.go(1, 0.34 * lamps, (u, on) => { on.pose.tilt = 0.16 * wave(u * lamps * 0.5); on.pose.part = wave(u * lamps * 0.5); on.pose.dy = -7 * bump((u * lamps) % 1); on.piece.bounce = 0.3 * bump(u) },
          each(lamps, 0.34 * lamps, (i) => bell(LAMP[(up ? i : lamps - 1 - i) % LAMP.length], 0.09, 0.17))).done()
      case 'owl':
        // Stares into the nearest lantern, blinks one eye and then the other, and gives one long soft hoo.
        return b.go(0.1, 0.6, walk(folk, 1), thump(104, 0.07))
          .stay(0.6, (u, on) => { on.pose.tilt = 0.2 * ease(u) })
          .stay(0.5, (u, on) => { on.pose.tilt = 0.2 + 0.03 * bump(u); on.pose.lid = 0.5 * Math.round(bump(u)) }, [tone(1100, 0.04, 0.002, 0.03, 0.12)])
          .stay(0.5, (u, on) => { on.pose.tilt = 0.2 + 0.03 * bump(u); on.pose.lid = -0.5 * Math.round(bump(u)) }, [tone(1240, 0.04, 0.002, 0.03, 0.12)])
          .stay(1.1, (u, on) => { on.pose.tilt = 0.2 * (1 - ease(u * 2 - 1)); on.pose.puff = 1 + 0.06 * bump(u) }, hoot(294, 0.8, 0, 262, 0.11))
          .go(0, 0.5, walk(folk, 1)).done()
      case 'mice':
        // Hang from one lantern each and swing, and the two lanterns ring a note apart, ding, dong.
        return b.go(0.3, 0.4, walk(folk, 3))
          .stay(2.4, (u, on) => { const s = wave(u * 3); on.hang = 40; on.pose.pair = 26; on.pose.flip = 0.45 * s; on.piece.sway = 0.35 * s }, each(6, 2.4, (i) => bell(i % 2 ? 1568 : 1760, 0.09, 0.2)))
          .go(0, 0.4, walk(folk, 3)).done()
      case 'beetle':
        // Breathes on the nearest lantern and polishes it with his sleeve, squeak, squeak, squeak, then looks at himself in it.
        return b.go(0.1, 0.8, walk(folk, 1))
          .stay(0.5, (u, on) => { on.pose.puff = 1 + 0.09 * bump(u); on.pose.tilt = 0.12 }, [hiss(900, 0.6, 0.06, 0.1, 0.25)])
          .stay(0.9, (u, on) => { on.pose.tilt = 0.12; on.pose.dx = 6 * wave(u * 3); on.piece.sway = 0.06 * wave(u * 3) }, each(3, 0.9, () => tone(1900, 0.06, 0.02, 0.1, 0.06, 2300, 'sine')))
          .stay(0.9, (u, on) => { on.pose.tilt = 0.12 + 0.14 * bump(u); on.pose.part = 0.5 * bump(u) }, hum(175, 0.4, 0.2, 196, 0.12))
          .go(0, 0.7, walk(folk, 1)).done()
    }
  }
  // On a rise it hangs down the tree.
  switch (folk) {
    case 'squirrel':
      // Climbs it and the lanterns ring going up.
      return b.go(1, 0.26 * lamps, (u, on) => { on.pose.dy = -6 * bump((u * lamps) % 1); on.pose.part = 0.5 * wave(u * lamps * 0.5); on.piece.sway = 0.2 * wave(u * lamps * 0.5) },
        each(lamps, 0.26 * lamps, (i) => bell(LAMP[(up ? i : lamps - 1 - i) % LAMP.length] * 1.5, 0.08, 0.13, 0.25))).done()
    case 'mice':
      if (fromTop) return peer(folk, 'lanterns')
      // Swing on the lowest one and the whole string jingles above them.
      return b.go(0.14, 0.3, hop(14))
        .stay(2.0, (u, on) => { const s = wave(u * 3); on.hang = 6; on.pose.dx = 12 * s; on.pose.tilt = 0.4 * s; on.piece.sway = 0.4 * s }, each(6, 2.0, (i) => [...bell(2093, 0.05, 0.14, 0.2), ...bell(2637, 0.05, 0.19, 0.2), ...bell(i % 2 ? 3136 : 2349, 0.05, 0.24, 0.2)]))
        .go(0, 0.3, hop(14)).done()
    case 'beetle':
      if (fromTop) return peer(folk, 'lanterns')
      // Polishes the lowest one, squeak, and it swings back and rings on his hat.
      return b.go(0.1, 0.7, walk(folk, 1))
        .stay(0.5, (u, on) => { on.pose.tilt = 0.12; on.pose.dx = 6 * bump(u) }, [tone(1900, 0.06, 0.02, 0.2, 0.1, 2300, 'sine')])
        .stay(0.5, (u, on) => { on.pose.tilt = 0.12; on.piece.sway = 0.4 * Math.sin(u * Math.PI * 1.5) })
        .stay(0.5, (u, on) => { on.pose.part = -0.7 * bump(u); on.pose.squash = 1 - 0.08 * bump(u * 2); on.piece.sway = -0.4 * (1 - ease(u)) }, [...bell(1319, 0.11), ...knock(330, 0.08)])
        .go(0, 0.6, walk(folk, 1)).done()
    case 'owl':
      if (fromTop) return peer(folk, 'lanterns')
      // Blinks at it, taps it with her beak and it rings once.
      return b.go(0.1, 0.6, walk(folk, 1))
        .stay(0.5, (u, on) => { on.pose.lid = Math.round(bump(u)) })
        .stay(0.3, (u, on) => { on.pose.tilt = 0.32 * bump(u) })
        .stay(0.7, (u, on) => { on.piece.sway = 0.25 * (1 - u) * Math.cos(u * 14) }, bell(1568, 0.11, 0, 0.6))
        .go(0, 0.5, walk(folk, 1)).done()
  }
}

function slide(folk: Folk, fit: Fit, up: boolean): Script {
  const b = new Build()
  if (fit === 'rise') {
    switch (folk) {
      case 'squirrel':
        // Comes down it head first with a long falling whistle, and goes up it too, running on the spot and gaining slowly, claws rattling.
        if (!up) return b.go(1, 0.7, (u, on) => { on.along = u * u; on.pose.tilt = 1.5; on.pose.part = -1 }, [tone(2200, 0.09, 0.03, 0.62, 0, 700, 'sine')]).done()
        return b.go(1, 1.9, also(walk(folk, 20), (u, on) => { on.along = u * u * (0.6 + 0.4 * u) + 0.03 * wave(u * 5) * (1 - u) * u; on.pose.tilt = 0.5 }), each(14, 1.9, (i) => tick(2000 + (i % 3) * 250, 0.07))).done()
      case 'owl':
        if (up) {
          // Going up she will not.
          return b.stay(0.7, (u, on) => { on.pose.tilt = -0.12 * bump(u); on.pose.part = -0.3 * bump(u) })
            .stay(0.9, (u, on) => { on.pose.part = 0.6 * wave(u * 2) }, [...hoot(247, 0.22), ...hoot(233, 0.22, 0.42)]).done()
        }
        // Coming down she sits, tucks her feet up and slides with a rising hoo, landing with a puff of feathers.
        return b.stay(0.5, (u, on) => { on.pose.squash = 1 - 0.2 * ease(u); on.pose.dy = 6 * ease(u) })
          .go(1, 1.0, (u, on) => { on.along = u * (0.4 + 0.6 * u); on.pose.squash = 0.8; on.pose.dy = 6; on.pose.tilt = -0.3 }, hoot(294, 0.85, 0, 520, 0.12))
          .stay(0.45, (u, on) => { on.pose.squash = 0.8 + 0.2 * u; on.pose.puff = 1 + 0.32 * bump(u) }, [hiss(1500, 0.6, 0.09, 0.02, 0.3)]).done()
      case 'mice':
        if (up) {
          // Going up they slip back, pattering.
          return b.go(0.38, 0.7, walk(folk, 8), each(8, 0.7, (i) => tick(3200 + (i % 2) * 400, 0.06)))
            .go(0, 0.5, (u, on) => { on.pose.tilt = -0.4 * bump(u); on.pose.pair = -10 }, [hiss(1600, 1.5, 0.07, 0.03, 0.4, 0, 700), squeak(false, 0.1, 0.7)]).done()
        }
        // Come down as a train, one holding the other's tail, with two squeals a note apart and a double bump.
        return b.go(1, 0.9, (u, on) => { on.along = u * u; on.pose.tilt = 0.5; on.pose.pair = -6 }, [tone(2300, 0.07, 0.01, 0.75, 0, 1500, 'sine'), tone(2590, 0.07, 0.01, 0.7, 0.08, 1700, 'sine')])
          .stay(0.4, (u, on) => { on.pose.squash = 1 - 0.2 * bump((u * 2) % 1); on.pose.stack = -8 * bump(u * 2 - 1) }, [...thump(170, 0.13), ...thump(190, 0.13, 0.2)]).done()
      case 'beetle':
        if (up) {
          // Going up he will not try.
          return b.stay(0.8, (u, on) => { on.pose.tilt = -0.16 * bump(u); on.pose.part = -0.3 * bump(u) })
            .stay(0.8, (u, on) => { on.pose.dx = 3 * wave(u * 2); on.pose.part = 0.2 * wave(u * 2) }, [...hum(139, 0.22), ...hum(131, 0.22, 0.4)]).done()
        }
        // Comes down on his back, turning slowly round as he goes, with a hollow rumble, and gets up with dignity.
        return b.go(1, 1.6, (u, on) => { on.along = u * (0.3 + 0.7 * u); on.pose.tilt = -1.5; on.pose.spin = TAU * u }, [hiss(260, 1.2, 0.14, 0.1, 1.4, 0, 180)])
          .stay(0.9, (u, on) => { on.pose.tilt = -1.5 * (1 - ease(u * 1.4)); on.pose.part = 0.6 * bump(u * 2 - 1) }, hum(147, 0.3, 0.5)).done()
    }
  }
  // On a span it is a trough lying level.
  switch (folk) {
    case 'squirrel':
      // Runs along inside it, his feet drumming on the bark.
      return b.go(1, 0.62, also(walk(folk, 7), (u, on) => { on.sink = 16 * Math.min(1, u * 7, (1 - u) * 7) }), each(7, 0.62, (i) => tone(150 + (i % 2) * 12, 0.11, 0.003, 0.06))).done()
    case 'mice':
      // Run along inside it, their feet drumming on the bark.
      return b.go(1, 1.2, also(walk(folk, 8), (u, on) => { on.sink = 14 * Math.min(1, u * 9, (1 - u) * 9) }), each(8, 1.2, (i) => [tone(233 + (i % 2) * 14, 0.08, 0.003, 0.05), tone(262, 0.06, 0.003, 0.05, 0.06)])).done()
    case 'beetle':
      // Walks in it with only his hat showing over the edge, his stick rattling along the bark.
      return b.go(0.08, 0.5, (u, on) => { on.sink = 58 * ease(u) })
        .go(0.92, 3.0, also(walk(folk, 6), (_u, on) => { on.sink = 58 }), each(15, 3.0, (i) => tick(1200 + (i % 3) * 110, 0.06)))
        .go(1, 0.5, (u, on) => { on.sink = 58 * (1 - ease(u)) }).done()
    case 'owl':
      // Sits down in it as in a bath with a creak of bark and a long sigh, shuts her eyes, then climbs out where she got in and stays.
      return b.go(0.24, 0.8, walk(folk, 2), each(2, 0.8, () => thump(104, 0.07)))
        .stay(0.8, (u, on) => { on.sink = 40 * ease(u) }, [hiss(600, 2.5, 0.1, 0.05, 0.5, 0, 380)])
        .stay(1.5, (u, on) => { on.sink = 40; on.pose.lid = 1; on.pose.puff = 1 + 0.06 * bump(u) }, [hiss(1400, 0.6, 0.07, 0.3, 0.9, 0, 500), tone(294, 0.07, 0.3, 0.8, 0, 196, 'sine')])
        .stay(0.7, (u, on) => { on.sink = 40 * (1 - ease(u)) }, [creak(118, 150, 0.4, 0.06)])
        .go(0, 0.7, walk(folk, 2), each(2, 0.7, () => thump(104, 0.07))).done()
  }
}

/**
 * From the top of something that hangs: a walker who would stay at it tries
 * it from above in its own way, the thing answers as the thing it is, and
 * the walker will not. A net sways from its top, a swing's rope is tugged
 * and the seat swings below, a string of lanterns jingles.
 */
function peer(folk: Folk, kind: 'bridge' | 'swing' | 'lanterns'): Script {
  const b = new Build()
  const pitch = kind === 'bridge' ? 1 : kind === 'swing' ? 0.89 : 1.12
  const lean = kind === 'bridge' ? 0.22 : kind === 'swing' ? 0.3 : 0.16
  const thing: Act = (u, on) => {
    if (kind === 'bridge') on.piece.sway = 0.5 * (1 - u) * Math.sin(u * 9)
    else if (kind === 'swing') on.piece.swing = 0.3 * (1 - u) * Math.sin(u * 7)
    else on.piece.sway = 0.25 * (1 - u) * Math.sin(u * 16)
  }
  const answer: Note[] = kind === 'bridge' ? [creak(190, 140, 0.5, 0.06, 0.1)] : kind === 'swing' ? [tick(900, 0.08, 0.1), creak(160, 196, 0.3, 0.05, 0.14)] : [...bell(1760, 0.07, 0.1, 0.3), ...bell(2093, 0.06, 0.2, 0.3)]
  switch (folk) {
    case 'owl':
      // She puts her beak to it and looks down it.
      return b.stay(0.8, also(thing, (u, on) => { on.pose.tilt = lean * bump(u); on.pose.part = 0.3 * bump(u) }), answer)
        .stay(0.8, (u, on) => { on.pose.puff = 1 + 0.07 * bump(u) }, hoot(262 * pitch, 0.5)).done()
    case 'mice':
      // One holds the other by the tail while it leans over.
      return b.stay(0.7, also(thing, (u, on) => { on.pose.tilt = (lean + 0.3) * bump(u); on.pose.pair = -8; on.pose.stack = -8 * bump(u) }), [...answer, squeak(false, 0.2, pitch), squeak(true, 0.32, pitch)])
        .stay(0.5, (u, on) => { on.pose.dy = -8 * bump(u) }).done()
    default:
      // He prods it with his stick.
      return b.stay(0.9, also(thing, (u, on) => { on.pose.tilt = lean * bump(u); on.pose.part = 0.4 * bump(u) }), answer)
        .stay(0.8, (u, on) => { on.pose.dx = 3 * wave(u * 2) }, hum(147 * pitch, 0.5, 0, 131 * pitch)).done()
  }
}

/**
 * What a walker does at a piece it gets across or has to stay at. `up` is
 * whether it comes from `pa`, the lower end of a rise or the left end of a
 * span. A meeting that ends in a wait for the bucket is `wait` or `board`.
 */
export function meeting(folk: Folk, kind: Kind, fit: Fit, up: boolean, place: number): Script {
  const fromTop = fit === 'rise' && !up
  switch (kind) {
    case 'plank': return plank(folk, fit, up)
    case 'ladder': return ladder(folk, fit, up, place)
    case 'bridge': return bridge(folk, fit, up, fromTop)
    case 'bucket': return bucket('squirrel', fit, up)
    case 'swing': return swing(folk, fit, fromTop)
    case 'lanterns': return lanterns(folk, fit, up, fromTop, place)
    case 'slide': return slide(folk, fit, up)
  }
}

// ------------------------------------------------------------- the bucket

/** How long a bucket takes from one end to the other. */
export const RUN_SECONDS = 2.4

/** How far the owl sinks into a bucket: to her eyes. */
const OWL_SINK = 23

/** A walker who waits for a bucket gets in or takes hold, when the bucket rests at its end. */
export function board(folk: Folk): Script {
  const b = new Build()
  switch (folk) {
    case 'owl':
      // Steps in and sinks down until only her eyes and ear tufts show over the rim; the bucket sags and the rope creaks.
      return b.stay(0.6, (u, on) => { on.seat = true; on.pose.dy = -16 * bump(u); on.pose.tilt = 0.1 * bump(u) }, knock(262, 0.1, 0.3))
        .stay(1.0, (u, on) => { on.seat = true; on.sink = OWL_SINK * ease(u); on.piece.sag = 9 * ease(u); on.piece.swing = 0.1 * (1 - u) * Math.cos(u * 12) }, [creak(160, 98, 0.8, 0.09)]).done()
    case 'mice':
      // Hang from the bucket's rim by their hands and rock it, tick-tock.
      return b.stay(0.35, (u, on) => { on.seat = true; on.pose.dy = -18 * bump(u); on.pose.pair = 14 * ease(u) })
        .stay(1.4, (u, on) => { on.seat = true; on.pose.pair = 14; on.pose.squash = 1.08; on.piece.swing = 0.24 * wave(u * 2); on.pose.flip = 0.2 * wave(u * 2) }, each(4, 1.4, (i) => tone(i % 2 ? 660 : 880, 0.08, 0.003, 0.05, 0.17))).done()
    default:
      // Takes his hat off, climbs in, puts the hat back on and waits.
      return b.stay(0.5, (u, on) => { on.seat = true; on.pose.part = ease(u * 2) }, [tone(900, 0.08, 0.002, 0.03, 0.1)])
        .stay(0.8, (u, on) => { on.seat = true; on.pose.part = 1; on.sink = 18 * ease(u); on.pose.dy = -12 * bump(u); on.piece.sag = 4 * ease(u) }, [...knock(262, 0.12, 0.4), creak(170, 140, 0.3, 0.05, 0.4)])
        .stay(0.5, (u, on) => { on.seat = true; on.sink = 18; on.piece.sag = 4; on.pose.part = 1 - ease(u) }, [tone(520, 0.08, 0.004, 0.05, 0.36)]).done()
  }
}

/** How a walker sits in a bucket or hangs on it while it waits, with nothing sounding: `t` is seconds of the game. */
export function aboard(folk: Folk, t: number, on: On): On {
  Object.assign(on.pose, REST)
  Object.assign(on.piece, STILL)
  on.along = 0
  on.hang = 0
  on.seat = true
  switch (folk) {
    case 'owl':
      // Far too big for it, and quite unbothered: she does not blink.
      on.sink = OWL_SINK
      on.piece.sag = 9
      on.pose.part = 0.3 * wave(t / 6)
      break
    case 'mice':
      on.sink = 0
      on.pose.pair = 14
      on.pose.squash = 1.08
      on.piece.swing = 0.06 * wave(t / 1.6)
      on.pose.flip = 0.05 * wave(t / 1.6)
      break
    default:
      on.sink = 18
      on.piece.sag = 4
      on.pose.part = 0.1 * bump((t % 5) / 0.6)
      break
  }
  return on
}

/** A walker who finds its bucket at the other end, or taken: it looks along the rope and asks, in its own voice. */
export function wait(folk: Folk): Script {
  const b = new Build()
  switch (folk) {
    case 'owl': return b.stay(1.0, (u, on) => { on.pose.part = -0.5 * bump(u); on.pose.tilt = -0.08 * bump(u) }, hoot(330, 0.4, 0.3, 392, 0.11)).done()
    case 'mice': return b.stay(0.9, (u, on) => { on.pose.dy = -10 * bump((u * 2) % 1); on.pose.stack = -6 * bump(u) }, [squeak(false, 0.1, 1.4), squeak(true, 0.5, 1.4)]).done()
    default: return b.stay(1.1, (u, on) => { on.pose.tilt = -0.14 * bump(u); on.pose.part = 0.4 * bump(u) }, hum(147, 0.4, 0.3, 196, 0.12)).done()
  }
}

/** The bucket's own sound on its run, by what it carries: the pulley squeaks slower the heavier the load, and a cable car zips. */
function pulley(fit: Fit, load: Folk | null, seconds = RUN_SECONDS): Note[] {
  if (fit === 'span') return [tone(load === 'owl' ? 180 : 240, 0.07, 0.1, seconds - 0.3, 0, load === 'owl' ? 300 : 520, 'sawtooth'), hiss(2400, 3, 0.04, 0.2, seconds - 0.5)]
  const turns = load === 'owl' ? 3 : load === 'beetle' ? 4 : load === 'mice' ? 5 : 6
  const pitch = load === 'owl' ? 620 : load === 'beetle' ? 740 : 880
  return each(turns, seconds - 0.2, (i) => tone(i % 2 ? pitch * 1.12 : pitch, 0.06, 0.04, load === 'owl' ? 0.32 : 0.14, 0, i % 2 ? pitch : pitch * 1.12, 'sine'))
}

/** The ride: what the rider does while the bucket runs, with the bucket's own sound. `null` is the bucket running empty. */
export function ride(folk: Folk | null, fit: Fit): Script {
  const b = new Build()
  const T = RUN_SECONDS
  switch (folk) {
    case null:
      // It runs empty, squeaking.
      return b.stay(T, (u, on) => { on.piece.swing = 0.16 * wave(u * 3) }, pulley(fit, null)).done()
    case 'owl':
      // She rides it without blinking, to a slow squeak, squeak of the pulley.
      return b.stay(T, (u, on) => { on.seat = true; on.sink = OWL_SINK; on.piece.sag = 9 + 2 * Math.abs(wave(u * 1.5)); on.piece.swing = 0.05 * wave(u * 1.5) }, pulley(fit, 'owl')).done()
    case 'mice':
      // They are carried dangling and kicking, squeaking in turn.
      return b.stay(T, (u, on) => { on.seat = true; on.hang = 22 * ease(u * 6) * (1 - ease(u * 6 - 5)); on.pose.pair = 14; on.pose.flip = 0.5 * wave(u * 5); on.pose.squash = 1.08; on.piece.swing = 0.14 * wave(u * 2.5) },
        [...pulley(fit, 'mice'), ...each(6, T - 0.2, (i) => squeak(i % 2 === 1, 0.1))]).done()
    default:
      // He rides holding the rope, with one small "hm" as it starts and one as it stops.
      return b.stay(0.3, (u, on) => { on.seat = true; on.sink = 18; on.piece.sag = 4; on.pose.tilt = -0.1 * bump(u) }, hum(165, 0.2, 0, 175, 0.12))
        .stay(T - 0.6, (u, on) => { on.seat = true; on.sink = 18; on.piece.sag = 4; on.piece.swing = 0.07 * wave(u * 2); on.pose.part = 0.15 * wave(u * 2) }, pulley(fit, 'beetle', T - 0.6))
        .stay(0.3, (u, on) => { on.seat = true; on.sink = 18; on.piece.sag = 4; on.pose.tilt = 0.1 * bump(u) }, hum(165, 0.2, 0, 155, 0.12)).done()
  }
}

// -------------------------------------------------- flourishes and the rest

/** The answer to a tap, each walker's own. */
export function flourish(folk: Folk): Script {
  const b = new Build()
  switch (folk) {
    case 'squirrel':
      // Snaps to attention, salutes with his tail and drops the letter, then snatches it up.
      return b.stay(0.3, (u, on) => { on.pose.squash = 1 + 0.2 * bump(u); on.pose.dy = -12 * bump(u); on.pose.part = ease(u * 2) }, [chirp(1400, 0, 1560), chirp(1760, 0.07, 1960), chirp(2100, 0.14, 2300)])
        .stay(0.3, (u, on) => { on.pose.part = 1; on.pose.prop = ease(u * 1.4) }, [paper(0.1, 0.09)])
        .stay(0.3, (u, on) => { on.pose.part = 1 - ease(u); on.pose.prop = 1 - ease(u * 2); on.pose.tilt = 0.3 * bump(u) }, [chirp(1900, 0.02, 1500)]).done()
    case 'owl':
      // Her head goes right round once with a wooden ratchet and she blinks one eye.
      return b.stay(0.8, (u, on) => { on.pose.part = 4 * ease(u); on.pose.puff = 1 + 0.06 * bump(u) }, each(7, 0.8, () => tone(620, 0.08, 0.002, 0.03)))
        .stay(0.5, (u, on) => { on.pose.lid = 0.5 * Math.round(bump(u)); on.pose.puff = 1 + 0.05 * bump(u) }, hoot(330, 0.3, 0.05, 300)).done()
    case 'mice':
      // They jump, bump heads, sit down and point at each other.
      return b.stay(0.4, (u, on) => { on.pose.dy = -26 * bump(u); on.pose.pair = -16 * ease(u) }, [squeak(false, 0, 1.3), squeak(true, 0.08, 1.3)])
        .stay(0.2, (u, on) => { on.pose.pair = -16; on.pose.flip = -0.3 * bump(u) }, [tone(520, 0.14, 0.003, 0.07)])
        .stay(0.5, (u, on) => { on.pose.pair = -16 * (1 - ease(u)); on.pose.squash = 1 - 0.22 * ease(u * 2); on.pose.flip = -0.35 * ease(u * 2 - 0.6); on.pose.prop = u > 0.4 && u < 0.95 ? 1 : 0 }, [squeak(false, 0.25, 0.8), squeak(true, 0.33, 0.8)]).done()
    default:
      // He lifts his hat, his wing cases pop open with a click and he shuts them again, embarrassed.
      return b.stay(0.4, (u, on) => { on.pose.part = ease(u * 1.5) }, hum(139, 0.25, 0, 147))
        .stay(0.5, (u, on) => { on.pose.part = 1; on.pose.puff = 1 + 0.16 * ease(u * 7 - 0.4) * (1 - ease(u * 7 - 5.6)); on.pose.prop = u > 0.06 && u < 0.8 ? 1 : 0; on.pose.tilt = -0.05 * bump(u) }, [tone(900, 0.1, 0.002, 0.03, 0.07)])
        .stay(0.6, (u, on) => { on.pose.part = 1 - ease(u * 1.5); on.pose.tilt = 0.12 * bump(u); on.pose.squash = 1 - 0.05 * bump(u) }, [tone(700, 0.1, 0.002, 0.03), ...hum(155, 0.3, 0.15, 139)]).done()
  }
}

/** How long the walker leans out towards a piece no way leads to. */
export function ask(folk: Folk): Script {
  const b = new Build()
  const lean = folk === 'owl' ? 0.1 : folk === 'beetle' ? 0.14 : 0.3
  // Leans out towards it and makes its own small asking sound. No arm is drawn up to its eyes.
  return b.stay(1.4, (u, on) => { const k = bump(u); on.pose.tilt = lean * k; on.pose.dx = (folk === 'squirrel' ? 14 : 6) * k; on.pose.squash = 1 + (folk === 'mice' ? 0.16 : 0.07) * k; on.pose.part = folk === 'owl' ? 0.6 * k : k; on.pose.stack = -8 * k }, say(folk, 1.28, 0.3)).done()
}

/** A walker on a piece that a finger pulls at: it holds on and squeaks. */
export function grip(folk: Folk): Script {
  const b = new Build()
  return b.stay(0.5, (u, on) => { on.pose.squash = 1 - 0.14 * bump(u); on.pose.dx = 3 * wave(u * 5) * (1 - u); on.pose.pair = -8 * bump(u) }, later(say(folk, 1.4), 0.04)).done()
}

/** Stepping out onto the sill in the morning, each stretching in its own way. */
export function stretch(folk: Folk): Script {
  const b = new Build()
  switch (folk) {
    case 'squirrel':
      // Up on his toes with his tail straight up, then a shake.
      return b.stay(0.6, (u, on) => { on.pose.squash = 1 + 0.22 * bump(u); on.pose.part = bump(u) }, [chirp(1300, 0.1, 1900)])
        .stay(0.3, (u, on) => { on.pose.dx = 4 * wave(u * 3) * (1 - u) }).done()
    case 'owl':
      // Wings out wide, one long turn of the head, and a yawn.
      return b.stay(1.2, (u, on) => { on.pose.puff = 1 + 0.25 * bump(u); on.pose.part = 1.2 * bump(u); on.pose.lid = u > 0.3 && u < 0.7 ? 1 : 0 }, hoot(247, 0.7, 0.2, 330, 0.1)).done()
    case 'mice':
      // One stretches up, then the other, and they lean on each other.
      return b.stay(0.45, (u, on) => { on.pose.stack = -14 * bump(u) }, [squeak(false, 0.1, 1.3)])
        .stay(0.45, (u, on) => { on.pose.dy = -12 * bump(u); on.pose.stack = 12 * bump(u) }, [squeak(true, 0.1, 1.3)])
        .stay(0.3, (u, on) => { on.pose.pair = -12 * bump(u) }).done()
    default:
      // Leans back with both hands on his stick until his hat tips, and sets it straight.
      return b.stay(0.9, (u, on) => { on.pose.tilt = -0.2 * bump(u); on.pose.part = 0.6 * bump(u) }, hum(131, 0.5, 0.15, 165, 0.12))
        .stay(0.4, (u, on) => { on.pose.part = 0.3 * (1 - u) }, [tone(520, 0.07, 0.004, 0.04, 0.1)]).done()
  }
}

/** Every cell of the grid, for the tests that walk it: each walker at each piece, fitted both ways, from both ends. */
export function everyMeeting(): { folk: Folk; kind: Kind; fit: Fit; up: boolean; place: number }[] {
  const cells: { folk: Folk; kind: Kind; fit: Fit; up: boolean; place: number }[] = []
  const kinds: Kind[] = ['plank', 'ladder', 'bridge', 'bucket', 'swing', 'lanterns', 'slide']
  const rise = PLACES.findIndex((place) => place.fit === 'rise'), span = PLACES.findIndex((place) => place.fit === 'span')
  for (const folk of ['squirrel', 'owl', 'mice', 'beetle'] as const) for (const kind of kinds) for (const fit of ['rise', 'span'] as const) for (const up of [true, false]) {
    if (kind === 'bucket' && folk !== 'squirrel') continue
    cells.push({ folk, kind, fit, up, place: fit === 'rise' ? rise : span })
  }
  return cells
}

