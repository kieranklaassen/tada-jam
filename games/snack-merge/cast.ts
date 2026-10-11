import type { Point } from './input'
import { THINGS, thingsOf, type Kind } from './kinds'
import { LAMP, MOUSE, SEAT, WINDOW } from './layout'
import type { Rng } from './rng'

// Those in the shop, as numbers the view draws from: the monster at the jar,
// the one at the window, the sugar mouse, the lamp and the paper bag. Each
// moves in its own manner and none shares a move (ART.md, "The characters and
// their fixed tastes"): Mumf slow and heavy from the jaw, on one long breath;
// Pib quick, in jumps of its neck, with eyes that go their own ways; Oon
// sleepy, on a slow heave, under lids that sink; the mouse in short bursts of
// sniffing; the lamp as a pendulum. What a monster was fed is here as six
// levels, one for each thing, and the view turns each level into that
// monster's own answer to that thing. On game time only, so all of it stands
// still while the game rests. Its chance is its own stream and decides nothing
// in the rules. Pure: no drawing and no sound.

export const MUMF = 0, PIB = 1, OON = 2

export type CastCue =
  | { what: 'drop' | 'join' | 'burp' | 'poke-seat' | 'poke-window' | 'poke-mouse' | 'poke-lamp' | 'rustle' | 'peek' | 'swallow' | 'pat' }
  /** A mouthful goes in: the monster at the jar answers the things in it, all at once. */
  | { what: 'eat'; k: Kind }
  /** Who is at the jar now, and the mouthful whose pose it keeps, or 0: as found, with nothing easing in. */
  | { what: 'sit'; seat: number; pose: Kind }

const TAU = Math.PI * 2
/** The longest step the springs here are played in, in seconds. */
const LONGEST = 1 / 120
/** How far the lamp swings at most, in radians. */
const LAMP_FAR = 0.9
/** How fast each monster's breath goes round, in turns a second, and how fast its eyes follow. */
const BREATH = [0.22, 1.4, 0.13] as const
const EYES = [3.2, 14, 1.8] as const

/** The quick, jumpy part of Pib, at the jar or at the window: a neck that jumps, an eye that strays, one wink at a time. */
type Twitch = { tilt: number; tiltV: number; tiltTo: number; jumpIn: number; strayFor: number; strayIn: number; strayX: number; strayY: number; winkLeft: boolean; wink: number; winkIn: number }

const twitch = (): Twitch => ({ tilt: 0, tiltV: 0, tiltTo: 0, jumpIn: 1, strayFor: 0, strayIn: 2.5, strayX: 0, strayY: 0, winkLeft: true, wink: 0, winkIn: 2 })

export class Cast {
  /** What everyone watches, in stage units. */
  look: Point = { x: SEAT.x - 400, y: 150 }

  /** The monster at the jar. */
  readonly seat = {
    who: MUMF as number,
    /** The phase of its breath. */
    breath: 0,
    /** How far the mouth hangs open, 0 to 1, and a hold on it (agape at a let-go or a burp, shut at a poke). */
    jaw: 0.55,
    jawHeld: 0,
    jawHeldAt: 0.55,
    /** Where the pupils sit in the eyes, each -1 to 1. */
    eyeX: -0.6,
    eyeY: -0.2,
    /** 0 open to 1 shut, over a blink. */
    lid: 0,
    blinkIn: 3,
    blinking: 0,
    /** Seconds left of licking its lips, out of `LICK`. */
    lick: 0,
    /** How far it leans back from the rim, and that spring's speed. */
    lean: 0,
    leanV: 0,
    leanFor: 0,
    /** The spring a poke sets off: Mumf's belly, Pib's neck. */
    poke: 0,
    pokeV: 0,
    /** Seconds left of Oon's one eye standing open after a poke, out of `PEEP`. */
    peep: 0,
    /** Brows: above 0 raised. */
    brow: 0,
    /** How long the thread of drool is, 0 to 1. */
    drool: 0,
    twitch: twitch(),
    /** Which things it is answering, 0 or 1 each, and how far each answer has come in, 0 to 1. */
    taste: THINGS.map(() => 0),
    level: THINGS.map(() => 0),
    /** Seconds since the mouthful it is answering went in. */
    clock: 0,
    /** It has swallowed, and keeps the pose; `calm` eases to 1 as the answer settles into it. */
    posed: false,
    calm: 0,
    /** Seconds left of looking into an empty jar, out of `PEEK`, and of patting its belly, out of `PAT`. */
    peek: 0,
    pat: 0,
  }

  /** The monster at the window. Which of the three it is, the rules say (play.ts). */
  readonly win = {
    bob: 0,
    eyeX: 0.5,
    eyeY: 0.2,
    lid: 0,
    blinkIn: 2,
    blinking: 0,
    twitch: twitch(),
    /** The breath on the glass, 0 to 1, and the wipe that clears it, 0 to 1 or -1 when none. */
    fog: 0.2,
    fogHeld: 0,
    wipe: -1,
    /** Seconds left of knocking on the glass, out of `KNOCK`, and the head's recoil. */
    knock: 0,
    recoil: 0,
    recoilV: 0,
  }

  readonly mouse = {
    /** The nose's twitch in a burst of sniffing, and seconds left of the burst. */
    twitch: 0,
    sniffFor: 0,
    sniffIn: 1.5,
    /** 0 out on the counter to 1 down in the bag. */
    hide: 0,
    hideFor: 0,
    tail: 0,
    /** -1 to 1: which way it looks. */
    turn: 1,
  }

  readonly lamp = { ang: 0.04, angv: 0, draughtIn: 4 }
  readonly bag = { shake: 0, shakeV: 0 }

  private readonly chance: Rng

  constructor(chance: Rng) {
    this.chance = chance
  }

  /**
   * Who sits at the jar, as a game is found: in the pose of its last mouthful if it was fed, with nothing
   * easing in. `pose` is that mouthful, or 0.
   */
  sit(who: number, pose: Kind): void {
    const s = this.seat
    s.who = who
    s.lick = 0
    s.lean = s.leanV = s.leanFor = 0
    s.poke = s.pokeV = 0
    s.peep = s.peek = s.pat = 0
    s.jawHeld = 0
    s.twitch = twitch()
    for (let i = 0; i < THINGS.length; i++) s.taste[i] = s.level[i] = pose & (1 << i) ? 1 : 0
    s.posed = pose !== 0
    s.calm = s.posed ? 1 : 0
    s.clock = s.posed ? POSED_AFTER : 0
  }

  /** Something happened that they answer, each as itself. */
  on(cue: CastCue): void {
    const { seat, win, mouse } = this
    switch (cue.what) {
      case 'drop':
        // The mouth drops wider as the snack falls.
        seat.jawHeld = 0.9
        seat.jawHeldAt = 0.9
        seat.brow = 0.6
        break
      case 'join':
        seat.lick = LICK
        seat.drool = 0
        seat.brow = 1
        break
      case 'burp':
        seat.leanFor = 2.4
        seat.jawHeld = 1.6
        seat.jawHeldAt = 1
        seat.brow = 1
        win.recoilV += 5
        mouse.hideFor = Math.max(mouse.hideFor, 1.6)
        break
      case 'poke-seat':
        if (seat.who === OON) seat.peep = PEEP
        else seat.pokeV += seat.who === PIB ? 14 : 9
        if (seat.who === MUMF) {
          seat.jawHeld = 0.25
          seat.jawHeldAt = 0
          seat.blinking = 0.3
        }
        break
      case 'poke-window':
        win.knock = KNOCK
        win.recoilV -= 4
        break
      case 'poke-mouse':
        mouse.hideFor = 1.5
        break
      case 'poke-lamp':
        this.lamp.angv += this.lamp.angv >= 0 ? 1.7 : -1.7
        break
      case 'rustle':
        this.bag.shakeV += 7
        break
      case 'peek':
        seat.peek = PEEK
        break
      case 'pat':
        seat.pat = PAT
        break
      case 'eat':
        for (const thing of THINGS.keys()) seat.taste[thing] = 0
        for (const thing of thingsOf(cue.k)) seat.taste[thing] = 1
        seat.clock = 0
        seat.posed = false
        seat.calm = 0
        seat.lick = 0
        break
      case 'swallow':
        seat.posed = true
        break
      default:
        this.sit(cue.seat, cue.pose)
    }
  }

  /** Plays `dt` seconds, in steps short enough for the springs. */
  step(dt: number): void {
    if (!(dt > 0)) return
    const steps = Math.ceil(dt / LONGEST - 1e-9)
    for (let i = 0; i < steps; i++) this.tick(dt / steps)
  }

  private tick(dt: number): void {
    this.stepSeat(dt)
    this.stepWindow(dt)
    this.stepMouse(dt)
    const { lamp, bag } = this
    lamp.draughtIn -= dt
    if (lamp.draughtIn <= 0) {
      lamp.draughtIn = 5 + this.chance.next() * 4
      lamp.angv += 0.1
    }
    lamp.angv += (-7 * lamp.ang - 0.18 * lamp.angv) * dt
    lamp.ang += lamp.angv * dt
    // The cord lets it swing so far and no further.
    if (Math.abs(lamp.ang) > LAMP_FAR) {
      lamp.ang = Math.sign(lamp.ang) * LAMP_FAR
      lamp.angv *= -0.4
    }
    bag.shakeV += (-170 * bag.shake - 8 * bag.shakeV) * dt
    bag.shake += bag.shakeV * dt
  }

  private stepSeat(dt: number): void {
    const s = this.seat
    s.breath = (s.breath + dt * TAU * BREATH[s.who]) % (TAU * 4)
    // Mumf's heavy eyes arrive late, Pib's snap over, Oon's drift.
    const toX = clamp((this.look.x - (SEAT.x - 60)) / 420, -1, 1), toY = clamp((this.look.y - (SEAT.y - 90)) / 300, -1, 1)
    s.eyeX += (toX - s.eyeX) * Math.min(1, EYES[s.who] * dt)
    s.eyeY += (toY - s.eyeY) * Math.min(1, EYES[s.who] * dt)
    if (s.lick > 0) s.lick = Math.max(0, s.lick - dt)
    if (s.jawHeld > 0) s.jawHeld -= dt
    if (s.peek > 0) s.peek = Math.max(0, s.peek - dt)
    if (s.pat > 0) s.pat = Math.max(0, s.pat - dt)
    if (s.peep > 0) s.peep = Math.max(0, s.peep - dt)
    // The mouth hangs open and sways on the breath; licking shuts it most of the way.
    const hang = 0.55 + 0.07 * Math.sin(s.breath * 0.5)
    const jawTo = s.lick > 0 ? 0.18 : s.jawHeld > 0 ? s.jawHeldAt : hang
    s.jaw += (jawTo - s.jaw) * Math.min(1, (jawTo < s.jaw ? 9 : 3.5) * dt)
    if (s.leanFor > 0) s.leanFor -= dt
    s.leanV += (60 * ((s.leanFor > 0 ? 1 : 0) - s.lean) - 9 * s.leanV) * dt
    s.lean += s.leanV * dt
    // Mumf's belly goes on wobbling; Pib's neck snaps back.
    const stiff = s.who === PIB ? 260 : 110, damp = s.who === PIB ? 15 : 4.5
    s.pokeV += (-stiff * s.poke - damp * s.pokeV) * dt
    s.poke += s.pokeV * dt
    s.brow += (0 - s.brow) * Math.min(1, 0.9 * dt)
    s.drool = s.jaw > 0.45 && s.lick <= 0 ? Math.min(1, s.drool + dt / 7) : Math.max(0, s.drool - dt * 3)
    // A blink every few seconds: Oon's are rare and slow.
    const blinkLasts = s.who === OON ? 0.7 : 0.3
    if (s.blinking > 0) {
      s.blinking -= dt
      s.lid = s.blinking > 0 ? Math.sin(Math.min(1, s.blinking / blinkLasts) * Math.PI) : 0
    } else {
      s.blinkIn -= dt
      if (s.blinkIn <= 0) {
        s.blinkIn = (s.who === OON ? 5 : 2.8) + this.chance.next() * 2.7
        s.blinking = blinkLasts
      }
    }
    if (s.who === PIB) this.stepTwitch(s.twitch, dt)
    // What it was fed: each answer comes in, and all of them settle into the pose once it has swallowed.
    s.clock += dt
    for (let i = 0; i < s.level.length; i++) s.level[i] += (s.taste[i] - s.level[i]) * Math.min(1, 5 * dt)
    s.calm += ((s.posed ? 1 : 0) - s.calm) * Math.min(1, 2.2 * dt)
  }

  private stepTwitch(t: Twitch, dt: number): void {
    // The neck jumps to a new lean and holds it.
    t.jumpIn -= dt
    if (t.jumpIn <= 0) {
      t.jumpIn = 0.5 + this.chance.next() * 1.4
      t.tiltTo = (this.chance.next() - 0.5) * 0.26
    }
    t.tiltV += (320 * (t.tiltTo - t.tilt) - 19 * t.tiltV) * dt
    t.tilt += t.tiltV * dt
    // One eye goes its own way for a moment.
    if (t.strayFor > 0) t.strayFor -= dt
    else {
      t.strayIn -= dt
      if (t.strayIn <= 0) {
        t.strayIn = 2 + this.chance.next() * 2.5
        t.strayFor = 0.7
        t.strayX = this.chance.next() * 2 - 1
        t.strayY = this.chance.next() * 2 - 1
      }
    }
    // It blinks one eye at a time.
    if (t.wink > 0) t.wink = Math.max(0, t.wink - dt / 0.12)
    else {
      t.winkIn -= dt
      if (t.winkIn <= 0) {
        t.winkIn = 1.2 + this.chance.next() * 2.4
        t.winkLeft = !t.winkLeft
        t.wink = 1
      }
    }
  }

  private stepWindow(dt: number): void {
    const w = this.win
    w.bob = (w.bob + dt * TAU) % (TAU * 8)
    this.stepTwitch(w.twitch, dt)
    w.recoilV += (-150 * w.recoil - 10 * w.recoilV) * dt
    w.recoil += w.recoilV * dt
    const midX = (WINDOW.left + WINDOW.right) / 2, midY = (WINDOW.top + WINDOW.bottom) / 2
    const toX = clamp((this.look.x - midX) / 500, -1, 1), toY = clamp((this.look.y - midY) / 300, -1, 1)
    w.eyeX += (toX - w.eyeX) * Math.min(1, 6 * dt)
    w.eyeY += (toY - w.eyeY) * Math.min(1, 6 * dt)
    if (w.blinking > 0) {
      w.blinking -= dt
      w.lid = w.blinking > 0 ? Math.sin(Math.min(1, w.blinking / 0.4) * Math.PI) : 0
    } else {
      w.blinkIn -= dt
      if (w.blinkIn <= 0) {
        w.blinkIn = 3 + this.chance.next() * 3
        w.blinking = 0.4
      }
    }
    // It breathes a patch of fog onto the glass and wipes it off with its hand.
    if (w.wipe >= 0) {
      w.wipe += dt / 0.5
      w.fog = Math.max(0, w.fog - dt * 2.4)
      if (w.wipe >= 1) w.wipe = -1
    } else if (w.fog < 1) w.fog = Math.min(1, w.fog + dt / 4.5)
    else {
      w.fogHeld += dt
      if (w.fogHeld > 0.7) {
        w.fogHeld = 0
        w.wipe = 0
      }
    }
    if (w.knock > 0) w.knock = Math.max(0, w.knock - dt)
  }

  private stepMouse(dt: number): void {
    const s = this.mouse
    s.tail = (s.tail + dt * TAU * 0.6) % TAU
    if (s.sniffFor > 0) {
      s.sniffFor -= dt
      s.twitch = Math.sin(s.sniffFor * TAU * 7)
    } else {
      s.twitch = 0
      s.sniffIn -= dt
      if (s.sniffIn <= 0) {
        s.sniffIn = 1.4 + this.chance.next() * 1.8
        s.sniffFor = 0.5
      }
    }
    if (s.hideFor > 0) s.hideFor -= dt
    // Down into the bag in a flash, and out again slowly.
    const to = s.hideFor > 0.45 ? 1 : s.hideFor > 0 ? 0.55 : 0
    s.hide += (to - s.hide) * Math.min(1, (to > s.hide ? 16 : 4) * dt)
    const turnTo = this.look.x > MOUSE.x ? 1 : -1
    s.turn += (turnTo - s.turn) * Math.min(1, 6 * dt)
  }
}

/** How long the one at the jar licks its lips, how long the one at the window knocks, in seconds. */
export const LICK = 0.9
export const KNOCK = 0.45
/** How long Oon's one eye stands open after a poke, how long a look into an empty jar lasts, and a pat on the belly. */
export const PEEP = 0.9
export const PEEK = 1.5
export const PAT = 0.8
/** The clock of a pose that was found, not watched: far enough in that every answer has played out. */
export const POSED_AFTER = 60

/** Where the lamp's shade hangs for a swing of `ang`. */
export function lampAt(ang: number): Point {
  return { x: LAMP.x + Math.sin(ang) * LAMP.y, y: Math.cos(ang) * LAMP.y }
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}
