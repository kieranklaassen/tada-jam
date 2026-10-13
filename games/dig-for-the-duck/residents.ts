import { ANSWERS, type AnswerName, type Parts, type SceneName } from './timeline'

// How each of the four residents moves, as plain numbers the view maps onto
// its sprites. Every one has its own tempo, its own body part that moves
// first, and its own answer to a tap; no two share a curve. Each pose is read
// from the one timeline (timeline.ts): the parts of the scenes and how long
// ago each short answer started. Pure: time in, numbers out.

const TAU = Math.PI * 2
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
const smooth = (t: number): number => { const x = clamp01(t); return x * x * (3 - 2 * x) }
/** A hump that rises from `a`, holds from `b` to `c` and is gone by `d`. */
const hump = (t: number, a: number, b: number, c: number, d: number): number => Math.min(smooth(span(t, a, b)), 1 - smooth(span(t, c, d)))
/** How far into its own repeating stretch of `period` seconds a time is. */
const within = (t: number, period: number): number => t - Math.floor(t / period) * period
/** A part that shows only while it plays: up and down again over its own length, and nothing before or after. */
const passing = (p: number | undefined): number => (p === undefined || p <= 0 || p >= 1 ? 0 : Math.sin(p * Math.PI))
/** A part that is under way: its progress while it plays, and nothing before or after. */
const during = (p: number | undefined): number => (p === undefined || p <= 0 || p >= 1 ? 0 : p)
const of = (p: number | undefined): number => p ?? 0
/** A swing that goes out over one part and comes back over the next: at 1 as the second begins. */
const swung = (out: number | undefined, back: number | undefined): number => smooth(of(out)) * (1 - smooth(of(back)))

/** Where a gaze points: -1 to 1 each way. */
export type Gaze = { x: number; y: number }

/** The gaze from a head toward a point, or the resting gaze when there is no finger near enough to mind. */
export function gazeAt(headX: number, headY: number, finger: { x: number; y: number } | null, rest: Gaze): Gaze {
  if (!finger) return rest
  const dx = finger.x - headX, dy = finger.y - headY
  const far = Math.hypot(dx, dy)
  if (far < 1) return { x: 0, y: 0 }
  const pull = Math.min(1, far / 140)
  return { x: (dx / far) * pull, y: (dy / far) * pull }
}

/** What the poses are read from: the clock, how long ago each answer started, and every scene's parts. */
export type Now = {
  time: number
  since: Record<AnswerName, number>
  scenes: Record<SceneName, Parts>
}

/** How far through an answer the clock is, 0 to 1, or -1 when it is not playing. */
const answer = (now: Now, name: AnswerName): number => (now.since[name] < ANSWERS[name].lasts ? now.since[name] / ANSWERS[name].lasts : -1)
/** How far the duck sinks in a boiled bath, in stage units: to the beak, and a little deeper for as long as it sighs. The view draws it there and the model is touched there. */
export const duckSunk = (afloat: boolean, boiled: boolean, sighed: number): number =>
  afloat && boiled ? 30 * (0.55 + 0.45 * (sighed < ANSWERS.duckSigh.lasts ? Math.sin((sighed / ANSWERS.duckSigh.lasts) * Math.PI) : 0)) : 0
/** An answer as a hump over its own length. */
const answering = (now: Now, name: AnswerName): number => { const p = answer(now, name); return p < 0 ? 0 : Math.sin(p * Math.PI) }
/** Every resident hops when a stone lands: one quick hop in stage units, each with its own height. */
const hop = (now: Now, high: number): number => high * answering(now, 'hop')

/** The length of each resident's own idle beat, in seconds. No two are alike, so they never move in step. */
export const TEMPO = { duck: 1.3, mole: 7.3, worm: 3.2, badger: 2.4 } as const

// --- The duck: quick and jerky, head first, a tail that waggles after every move.

export type DuckPose = {
  /** The head's lean in radians: it snaps from one angle to the next. */
  tilt: number
  /** The tail's waggle in radians, and how far the tail is lifted as it floats free. */
  wag: number
  tail: number
  /** Squash of the whole body: below 0 is flat and wide, above 0 tall and thin. */
  squash: number
  /** 0 open, 1 shut. */
  blink: number
  /** The back brush tapping the rim: 0 to 1. */
  brush: number
  /** Up and down on the water, in stage units: 0 when it sits. */
  bob: number
  /** Which way it faces: 1 as it sits, through 0 to -1 and back as it turns a circle. */
  facing: number
  /** The jet it squirts from its beak: 0 to 1. */
  jet: number
  /** Its head shaking sand off the cap: -1 to 1. */
  shake: number
  /** How far it has sunk to the beak in a boiled bath: 0 to 1. */
  sunk: number
  /** Its hop when a stone lands, in stage units. */
  hop: number
}

const DUCK_TILTS = [-0.16, 0.2, 0.02, 0.27, -0.08]

export function duckPose(now: Now, afloat: boolean, boiled: boolean): DuckPose {
  const t = now.time, ending = now.scenes.ending, plug = now.scenes.plug
  const beat = Math.floor(t / TEMPO.duck), into = within(t, TEMPO.duck)
  const from = DUCK_TILTS[(beat + DUCK_TILTS.length - 1) % DUCK_TILTS.length], to = DUCK_TILTS[beat % DUCK_TILTS.length]
  const snap = smooth(into / 0.09)
  const poked = now.since.duckSqueak
  const squeezed = poked < ANSWERS.duckSqueak.lasts ? -0.42 * Math.exp(-6 * poked) * Math.cos(21 * poked) : 0
  const sneeze = answer(now, 'duckSneeze')
  return {
    tilt: from + (to - from) * snap,
    wag: into < 0.5 ? 0.5 * Math.exp(-7 * into) * Math.sin(into * 44) : 0,
    tail: passing(ending.tailUp),
    squash: squeezed - 0.25 * passing(ending.squeaks) - 0.3 * passing(plug.settle) + (sneeze >= 0 ? 0.2 * Math.sin(sneeze * Math.PI) : 0),
    blink: within(t, 2.7) < 0.11 || sneeze >= 0 ? 1 : 0,
    brush: Math.max(hump(within(t, 4.1), 0, 0.06, 0.08, 0.16), hump(within(t, 4.1), 0.2, 0.26, 0.28, 0.36)),
    bob: (afloat ? 2.6 * Math.sin(t * 2.1) + 1.1 * Math.sin(t * 5.3) : 0) - 9 * passing(ending.bobFree),
    facing: Math.cos(during(ending.circle) * TAU),
    jet: passing(ending.jet),
    shake: sneeze >= 0 ? Math.sin(sneeze * 30) * (1 - sneeze) : 0,
    sunk: duckSunk(afloat, boiled, now.since.duckSigh),
    hop: hop(now, 16),
  }
}

// --- The mole: slow and heavy, belly first, a nose that twitches by itself.

export type MolePose = {
  /** The belly's rise: -1 to 1, slow. */
  breath: number
  /** A page turning: 0 to 1 across the turn, 0 between turns. */
  page: number
  /** The nose's twitch in stage units. */
  nose: number
  /** The book lifted in front of the face: 0 to 1. */
  hide: number
  /** The feet lifted off a wet floor: 0 to 1. */
  feet: number
  /** The eyes over the top of the glasses, at what he has just poured: 0 to 1. He does not look up from his book for anything else. */
  peer: number
  /** His fingers in his ears: 0 to 1. */
  ears: number
  /** The book jumping out of his hands, in stage units. */
  jump: number
  /** His glasses fogged, 0 to 1, and the glasses off and wiped on a slipper, 0 to 1. */
  fog: number
  wipe: number
  /** The chair off the floor, 0 to 1 of how high the water lets it ride, and how far it has turned: 1 as it stands, -1 half round. */
  float: number
  turn: number
  /** The slippers afloat and away, 0 to 1, and the lampshade adrift as a boat, 0 to 1. */
  slippers: number
  shade: number
  /** One slipper wrung over the floor: 0 to 1. */
  wring: number
  /** The teacup tipped, 0 to 1, and the watering can tipped, 0 to 1. */
  tip: number
  can: number
  /** He looks over his book at the duck: 0 to 1. */
  look: number
  hop: number
}

export function molePose(now: Now, wet: number): MolePose {
  const t = now.time, up = now.scenes.moleAfloat, down = now.scenes.moleDown
  const turn = within(t, TEMPO.mole)
  const twitch = within(t, 3.7)
  const landed = 1 - smooth(of(down.lower))
  const float = smooth(of(up.chair)) * landed
  const hidden = now.since.moleHide
  const wiping = answer(now, 'moleWipe')
  const showing = Math.max(passing(now.scenes.showClay.peerAt), passing(now.scenes.showEarth.peerAt))
  return {
    breath: Math.sin((t * TAU) / 4.6),
    page: Math.max(turn < 0.9 ? smooth(turn / 0.9) : 0, during(up.wetPage), during(down.readOn)),
    nose: twitch < 0.34 ? 1.6 * Math.sin(twitch * 58) * (1 - twitch / 0.34) : 0,
    hide: hidden < ANSWERS.moleHide.lasts ? hump(hidden, 0, 0.28, 1.5, ANSWERS.moleHide.lasts) : 0,
    feet: Math.max(smooth(wet * 9), smooth(of(up.feet)) * landed),
    peer: showing,
    ears: Math.min(1, answering(now, 'moleEars') * 3),
    jump: 26 * answering(now, 'moleJump') + 7 * passing(down.bump),
    fog: wiping >= 0 ? 1 - smooth(span(wiping, 0.45, 0.9)) : 0,
    wipe: wiping >= 0 ? hump(wiping, 0.06, 0.16, 0.8, 1) : 0,
    float,
    turn: Math.cos(Math.PI * float),
    slippers: smooth(of(up.slippers)) * landed,
    shade: smooth(of(up.shade)) * landed,
    wring: passing(down.wring),
    tip: passing(now.scenes.showClay.tip),
    can: passing(now.scenes.showEarth.can),
    look: passing(now.scenes.ending.allLook),
    hop: hop(now, 7),
  }
}

// --- The worm: a wave that runs from tail to head, never all at once.

export const WORM_SEGMENTS = 5
export const BOOT_COUNT = 6

export type WormPose = {
  /** Each segment's sideways lean in stage units, tail first. */
  lean: number[]
  /** The polishing cloth's stroke: -1 to 1, in bursts. */
  polish: number
  /** How far it has shot down into the boot: 0 up, 1 gone. */
  down: number
  /** How far it looks out of the other boot: 0 to 1. */
  peek: number
  /** Eyes wide: 0 to 1. */
  wide: number
  /** How full of water each boot of the row is, 0 to 1, in the order the water reached them. */
  filled: number[]
  /** How many pairs of boots it has pulled on over itself: 0 to 3, by parts. */
  worn: number
  /** Its squelch up and down in the wet boots, in stage units. */
  squelch: number
  /** A boot that steam has shrunk: 0 to 1 of the way small. */
  shrunk: number
  /** A boot tipped out, 0 to 1 over and back. */
  tipped: number
  /** A boot swung against the rock: it goes out, is at 1 as the knock sounds, and comes back. Then the shrug. */
  knock: number
  shrug: number
  /** A sock wrung over the moss: 0 to 1. */
  sock: number
  /** It looks toward the duck: 0 to 1. */
  look: number
  hop: number
}

export function wormPose(now: Now, wet: number, shrunken: boolean): WormPose {
  const t = now.time, boots = now.scenes.wormBoots
  const lean: number[] = []
  for (let i = 0; i < WORM_SEGMENTS; i++) lean.push(5 * Math.sin((t * TAU) / TEMPO.worm - i * 0.85) * (0.35 + (0.65 * i) / (WORM_SEGMENTS - 1)))
  const burst = within(t, TEMPO.worm)
  const poked = now.since.wormPop, popping = poked < ANSWERS.wormPop.lasts
  const filled: number[] = []
  for (let i = 0; i < BOOT_COUNT; i++) filled.push(smooth(of(boots[`glug${i}`])))
  const worn = smooth(of(boots.pull0)) + smooth(of(boots.pull1)) + smooth(of(boots.pull2))
  const busy = worn > 0 ? 0 : 1
  return {
    lean,
    polish: burst < 2 ? Math.sin(burst * 15) * hump(burst, 0, 0.2, 1.8, 2) * busy : 0,
    down: popping ? hump(poked, 0, 0.12, 1.9, ANSWERS.wormPop.lasts) : 0,
    peek: popping ? hump(poked, 0.3, 0.42, 1.6, 1.85) : 0,
    wide: Math.max(popping ? 1 : 0, smooth(wet * 12), answering(now, 'wormShrink')),
    filled,
    worn,
    squelch: worn >= 3 ? 5 * Math.abs(Math.sin(t * 2.6)) + 9 * passing(boots.squelch) : 0,
    shrunk: shrunken ? (answer(now, 'wormShrink') >= 0 ? smooth(answer(now, 'wormShrink') * 2.5) : 1) : 0,
    tipped: answering(now, 'wormTip'),
    knock: Math.max(swung(now.scenes.showRock.bootBack0, now.scenes.showRock.bootKnock0), swung(now.scenes.showRock.bootBack1, now.scenes.showRock.bootKnock1)),
    shrug: passing(now.scenes.showRock.shrug) + passing(now.scenes.showMoss.watchMoss) * 0.5,
    sock: passing(now.scenes.showMoss.sock),
    look: passing(now.scenes.ending.allLook),
    hop: hop(now, 12),
  }
}

// --- The badger: brisk and square, shoulders first, a tail that flicks.

export const GARMENTS = 4
/** The smallest piece on the line, the sock the umbrella is held over: it hangs nearest to her. And the shirt she flaps and presses. */
export const SOCK = 0
export const SHIRT = 1

export type BadgerPose = {
  /** The arm's reach up to the line: 0 at her side, 1 at the line. */
  reach: number
  /** The shoulders' hitch as the arm goes up, in stage units. */
  hitch: number
  /** The tail's flick in radians. */
  tail: number
  /** The peg snapping at the air: 0 shut, 1 open. */
  snap: number
  /** Each garment's swing on the line in radians, and how far each sags with rain, 0 to 1. */
  swing: number[]
  sag: number[]
  /** The umbrella open in her paw, held out over the smallest sock: 0 to 1. */
  umbrella: number
  /** Each piece wrung in turn, in the order they sagged: 0 to 1 over and back. */
  wring: number[]
  /** How far she has trotted along the line to each piece in that order, 0 to 1, and how far back to her place after the last. */
  along: number[]
  back: number
  /** Her head tipped back to look at the cloud: 0 to 1. */
  lookUp: number
  /** A shirt held out in the steam to press it: 0 to 1. */
  press: number
  /** The wet sock tossed, 0 to 1 along its throw, and her head pulled in under the rain, 0 to 1. */
  toss: number
  flinch: number
  /** She turns to look at the duck: 0 to 1. */
  look: number
  hop: number
}

export function badgerPose(now: Now): BadgerPose {
  const t = now.time, rain = now.scenes.badgerRain
  const beat = within(t, TEMPO.badger)
  const reach = hump(beat, 0.1, 0.34, 0.95, 1.2)
  const flick = within(t, 5.3)
  const poked = now.since.badgerSnap, snapping = poked < ANSWERS.badgerSnap.lasts
  const flapping = snapping ? Math.exp(-4 * poked) : 0
  const swing: number[] = [], sag: number[] = [], wring: number[] = [], along: number[] = []
  for (let i = 0; i < GARMENTS; i++) {
    sag.push(smooth(of(rain[`sag${i}`])))
    wring.push(passing(rain[`wring${i}`]))
    along.push(smooth(of(rain[`to${i}`])))
    swing.push((0.07 * Math.sin(t * 1.3 + i * 1.1) + 0.03 * Math.sin(t * 3.1 + i * 2.3)) * (1 - 0.7 * sag[i]) + (i === SHIRT && snapping ? 0.5 * flapping * Math.sin(poked * 30) : 0))
  }
  const umbrella = smooth(of(rain.umbrella))
  const press = answering(now, 'badgerPress')
  return {
    reach: snapping || press > 0 || Math.max(...wring) > 0 ? 1 : umbrella > 0 ? 0.25 : reach,
    hitch: -3 * hump(beat, 0.02, 0.14, 0.3, 0.5),
    tail: flick < 0.3 || umbrella > 0 ? 0.6 * Math.sin(flick * 42) * (umbrella > 0 ? 0.5 : 1 - flick / 0.3) : 0,
    snap: snapping ? Math.max(hump(poked, 0, 0.04, 0.1, 0.16), hump(poked, 0.22, 0.26, 0.32, 0.38)) : 0,
    swing,
    sag,
    umbrella,
    wring,
    along,
    back: smooth(of(rain.home)),
    lookUp: Math.max(passing(rain.lookUp), passing(now.scenes.showHot.duckHead) * 0.6),
    press,
    toss: during(now.scenes.showHot.toss),
    flinch: passing(now.scenes.showHot.duckHead),
    look: passing(now.scenes.ending.allLook),
    hop: hop(now, 10),
  }
}
