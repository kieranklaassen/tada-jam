import { TASTES, type GuestId } from './guests'
import { REST, type InkBody } from './inkScene'

// The small acts of the grid: what a guest is seen to do for a moment when a
// cell of the object-by-action grid happens to it. Stuck half through a wall,
// tucking in under the quilt, sneezing at the feathers, peering down the
// pipe, blowing it, winding the alarm clock or stopping its bell, and taking
// to the stove or the ice box in its own way. Each is a
// figure moved through a second or two and then left exactly as it was: an
// act changes nothing in the house and nothing is saved. Numbers only; time
// is the seconds since the act began.

export type GuestAct =
  /** Set down on a wall or a floor: it sticks there, `dx` and `dy` from where it will stand, then steps out with a pop. */
  | { kind: 'stuck'; dx: number; dy: number }
  /** The quilt has been laid on the bed it sleeps in. */
  | { kind: 'tucks-in' }
  /** Feathers reached its nose. */
  | { kind: 'sneezes' }
  /** The pipe stands in the corner, `dx` away: it leans over and listens down it. */
  | { kind: 'peers'; dx: number }
  /** The stove has come into its room, `dx` away: one that can bear the warmth hugs it, one that cannot sits on it and sags. */
  | { kind: 'hugs' | 'sits-and-sags'; dx: number }
  /** The ice box has come into its room: one at home in the cold uses it as an armchair, one that is not goes stiff as a plank. */
  | { kind: 'armchair' | 'plank'; dx: number }
  /** Set down in a room: it tests the bed, twice. Sharing a bed-spring creak with a room-mate, each tests once (`once`). */
  | { kind: 'tests-bed'; once?: boolean }
  /** It holds the alarm clock and will change its hours: at the turn of the wheel it yawns. */
  | { kind: 'yawns' }
  /** The pipe has been put to its mouth: it fills its cheeks and blows. */
  | { kind: 'blows' }
  /** The alarm clock has been put in its hand: one who will change its hours winds it. */
  | { kind: 'winds' }
  /** One who will not brings a fist down on the bell, as hard and as slowly as its weight (0 light, 1 heavy) makes it. */
  | { kind: 'stops-bell'; weight: number }

/** How long each act is seen for, in seconds. */
export const ACT_SECONDS: Readonly<Record<GuestAct['kind'], number>> = {
  stuck: 1, 'tucks-in': 1.1, sneezes: 1.3, peers: 1.5, hugs: 1.7, 'sits-and-sags': 2.1, armchair: 1.9, plank: 1.6, blows: 1, winds: 1.2, 'stops-bell': 1, 'tests-bed': 1, yawns: 1.3,
}

/** How far a guest gone stiff as a plank tips over, in radians: until its head knocks on the wall it stands beside. */
export const PLANK_TIPS = 0.3

/** When in each act its own sound comes, in seconds from its start: the pop, the sneeze, the breath coming back, the knock of the plank. */
export const ACT_BEAT = { pop: 0.56, sneeze: 0.75, breath: 0.6, knock: 0.5 } as const

const clamp = (t: number) => Math.max(0, Math.min(1, t))
const smooth = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c) }
/** Up to 1 over `rise` seconds, held, and down again over the last `fall` seconds of `lasts`. */
const held = (age: number, lasts: number, rise: number, fall: number) => smooth(age / rise) * smooth((lasts - age) / fall)
const sign = (dx: number) => (dx < 0 ? -1 : 1)

/** How a guest takes to the stove: by whether its comfort has any room for warmth. */
export function takesStove(id: GuestId): 'hugs' | 'sits-and-sags' {
  return TASTES[id].comfort[1] > 0 ? 'hugs' : 'sits-and-sags'
}

/** How a guest takes to the ice box: by whether its comfort has any room for cold. */
export function takesIce(id: GuestId): 'armchair' | 'plank' {
  return TASTES[id].comfort[0] < 0 ? 'armchair' : 'plank'
}

/** The figure an act makes of a guest `age` seconds in, or null once it is over. Leaning is in the page's terms: a positive turn tips its head to the right. */
export function actBody(act: GuestAct, age: number): InkBody | null {
  const lasts = ACT_SECONDS[act.kind]
  if (age < 0 || age >= lasts) return null
  if (act.kind === 'stuck') {
    if (age < ACT_BEAT.pop) {
      // Half through the plaster: pressed thin, and shaking a little less with every try.
      const shake = Math.sin(age * 46) * 0.06 * (1 - age / ACT_BEAT.pop)
      return { sx: 0.6, sy: 1.05, rot: shake, dx: act.dx, dy: act.dy }
    }
    // Out with a pop: to its place faster than it slows, wider than itself for a moment.
    const out = age - ACT_BEAT.pop, go = 1 - (1 - clamp(out / 0.2)) ** 3
    const ring = 0.22 * Math.exp(-7 * out) * Math.cos(out * 22)
    return { sx: 0.6 + 0.4 * go + ring, sy: 1.05 - 0.05 * go - ring * 0.7, rot: 0, dx: act.dx * (1 - go), dy: act.dy * (1 - go) }
  }
  if (act.kind === 'tucks-in') {
    // Down under the covers and a wriggle or two to get them right.
    const down = held(age, lasts, 0.3, 0.4)
    return { sx: 1 + 0.07 * down, sy: 1 - 0.11 * down, rot: 0.05 * Math.sin(age * 15) * down, dx: 0, dy: 2 * down }
  }
  if (act.kind === 'sneezes') {
    if (age < 0.35) return REST
    // Back, back, back, and then all at once forward.
    if (age < ACT_BEAT.sneeze) { const back = smooth((age - 0.35) / (ACT_BEAT.sneeze - 0.35)); return { sx: 1 - 0.04 * back, sy: 1 + 0.09 * back, rot: -0.15 * back, dx: 0, dy: 0 } }
    const since = age - ACT_BEAT.sneeze, ring = Math.exp(-7 * since) * Math.cos(since * 17)
    return { sx: 1 + 0.12 * ring, sy: 1 - 0.16 * ring, rot: 0.24 * ring, dx: 0, dy: 0 }
  }
  if (act.kind === 'peers') {
    // Over to the pipe, an ear to its mouth, and a start when its own breath comes back.
    const lean = held(age, lasts, 0.35, 0.35), start = age > ACT_BEAT.breath ? Math.exp(-6 * (age - ACT_BEAT.breath)) * Math.sin((age - ACT_BEAT.breath) * 30) * 0.05 : 0
    return { sx: 1, sy: 1 - 0.04 * lean + start, rot: sign(act.dx) * 0.2 * lean, dx: act.dx * 0.25 * lean, dy: 0 }
  }
  if (act.kind === 'hugs') {
    // Up against it, arms round it, and a purr that runs all through.
    const close = held(age, lasts, 0.4, 0.5)
    return { sx: 1 + 0.08 * close, sy: 1 - 0.03 * close, rot: sign(act.dx) * 0.1 * close + 0.025 * Math.sin(age * 34) * close, dx: act.dx * 0.55 * close, dy: 0 }
  }
  if (act.kind === 'sits-and-sags') {
    // Up onto it, and then lower and wider the longer it sits.
    const on = held(age, lasts, 0.35, 0.35), sag = clamp((age - 0.35) / (lasts - 0.9)) * on
    return { sx: 1 + 0.2 * sag, sy: 1 - 0.26 * sag, rot: 0, dx: act.dx * on, dy: -34 * on * (1 - 0.3 * sag) }
  }
  if (act.kind === 'armchair') {
    // Up onto the lid, leaning back, entirely at home.
    const on = held(age, lasts, 0.35, 0.35)
    return { sx: 1, sy: 1 - 0.05 * on, rot: -sign(act.dx) * 0.16 * on, dx: act.dx * on, dy: -30 * on }
  }
  if (act.kind === 'tests-bed') {
    // Up off the springs and down on them, each bounce smaller than the last, squashed where it lands.
    const t = age / lasts, up = Math.abs(Math.sin(t * Math.PI * (act.once ? 1 : 2))) * (1 - t * 0.6), down = (1 - up) * Math.sin(t * Math.PI)
    return { sx: 1 + 0.08 * down, sy: 1 - 0.11 * down, rot: 0, dx: 0, dy: -14 * up }
  }
  if (act.kind === 'yawns') {
    // Up on its toes, taller and narrower as the breath goes in, and down again longer than it went up.
    const full = held(age, lasts, 0.45, 0.7)
    return { sx: 1 - 0.06 * full, sy: 1 + 0.1 * full, rot: -0.05 * full, dx: 0, dy: -2 * full }
  }
  if (act.kind === 'blows') {
    // A breath in, cheeks out, and a lean back to let it go.
    const full = held(age, lasts, 0.25, 0.45)
    return { sx: 1 + 0.13 * full, sy: 1 + 0.04 * full, rot: -0.07 * smooth((age - 0.3) / 0.2) * full, dx: 0, dy: 0 }
  }
  if (act.kind === 'winds') {
    // Bent over it, and a quick small rocking as the key goes round.
    const over = held(age, lasts, 0.2, 0.3)
    return { sx: 1, sy: 1 - 0.05 * over, rot: 0.06 * Math.sin(age * 40) * over, dx: 0, dy: -1.5 * Math.abs(Math.sin(age * 20)) * over }
  }
  if (act.kind === 'stops-bell') {
    // Up, and down on it once: a heavy guest slower and deeper than a light one.
    const lift = 0.12 + 0.1 * act.weight
    if (age < lift) return { sx: 1 - 0.04 * smooth(age / lift), sy: 1 + 0.08 * smooth(age / lift), rot: 0, dx: 0, dy: 0 }
    const since = age - lift, deep = 0.14 + 0.12 * act.weight
    const ring = deep * Math.exp(-(9 - 3 * act.weight) * since) * Math.cos(since * (20 - 8 * act.weight))
    return { sx: 1 + ring * 0.6, sy: 1 - ring, rot: 0, dx: 0, dy: 0 }
  }
  // Stiff as a plank at once, over like one with a single knock, and up again.
  const stiff = held(age, lasts, 0.08, 0.3)
  const over = age < ACT_BEAT.knock ? smooth((age - 0.15) / (ACT_BEAT.knock - 0.15)) : smooth((lasts - age) / (lasts - ACT_BEAT.knock - 0.3))
  return { sx: 1 - 0.2 * stiff, sy: 1 + 0.1 * stiff, rot: -sign(act.dx) * PLANK_TIPS * over, dx: 0, dy: 0 }
}

// --- The things ------------------------------------------------------------------

/** What a thing is seen to do as it is put somewhere or set off: each cell of the grid its own small move. */
export type ThingAct = 'flumps' | 'pressed-on' | 'wobbles' | 'bolted' | 'clunks' | 'sloshes' | 'ticks' | 'swings' | 'rings' | 'shelved'

export const THING_ACT_SECONDS: Readonly<Record<ThingAct, number>> = {
  flumps: 0.6, 'pressed-on': 0.5, wobbles: 1, bolted: 0.7, clunks: 0.8, sloshes: 1, ticks: 0.7, swings: 1.2, rings: 0.6, shelved: 0.4,
}

/** The figure a thing makes `age` seconds into its act, or null once it is over. */
export function thingActBody(act: ThingAct, age: number): InkBody | null {
  const lasts = THING_ACT_SECONDS[act]
  if (age < 0 || age >= lasts) return null
  const t = age / lasts, dies = 1 - t
  // The quilt on a bed: one soft wide flump.
  if (act === 'flumps') { const soft = Math.sin(t * Math.PI) * dies; return { sx: 1 + 0.16 * soft, sy: 1 - 0.3 * soft, rot: 0, dx: 0, dy: 0 } }
  // The quilt on a wall: pressed on four times, each press a little flatter.
  if (act === 'pressed-on') { const press = Math.abs(Math.sin(t * Math.PI * 4)); return { sx: 1 - 0.07 * press, sy: 1 + 0.03 * press, rot: 0, dx: 0, dy: 0 } }
  // The pipe stood in a corner: it rocks on its foot like a hat stand and comes to rest.
  if (act === 'wobbles') return { sx: 1, sy: 1, rot: 0.13 * Math.exp(-3.5 * age) * Math.cos(age * 15), dx: 0, dy: 0 }
  // The pipe let through a wall: the turn of the last bolt.
  if (act === 'bolted') { const turn = smooth(t / 0.6); return { sx: 1, sy: 1, rot: 0.3 * (1 - turn) * (t < 0.6 ? 1 : 0), dx: 0, dy: 0 } }
  // The stove: an iron clunk, and two small jumps as it pings.
  if (act === 'clunks') { const hit = Math.exp(-9 * age), ping = Math.abs(Math.sin(t * Math.PI * 3)) * dies * (t > 0.3 ? 1 : 0); return { sx: 1 + 0.07 * hit, sy: 1 - 0.1 * hit, rot: 0, dx: 0, dy: -2.5 * ping } }
  // The ice box: it lands and the ice in it goes on sloshing from side to side.
  if (act === 'sloshes') return { sx: 1, sy: 1, rot: 0.04 * Math.exp(-3 * age) * Math.sin(age * 19), dx: 4.5 * Math.exp(-3 * age) * Math.sin(age * 19), dy: 0 }
  // The alarm clock by a bed: four small ticks, a jerk each.
  if (act === 'ticks') return { sx: 1, sy: 1, rot: 0.09 * (Math.floor(t * 4) % 2 ? 1 : -1) * dies, dx: 0, dy: 0 }
  // The alarm clock on a wall: it swings on its nail, slowly, like a pendulum.
  if (act === 'swings') return { sx: 1, sy: 1, rot: 0.22 * Math.exp(-2.2 * age) * Math.cos(age * 6.5), dx: 0, dy: 0 }
  // The alarm clock rung: it shakes too fast to follow.
  if (act === 'rings') return { sx: 1, sy: 1, rot: 0.12 * Math.sin(age * 70) * dies, dx: 1.2 * Math.sin(age * 55) * dies, dy: 0 }
  // Back on its shelf: it settles.
  const settle = Math.sin(t * Math.PI) * dies
  return { sx: 1 + 0.06 * settle, sy: 1 - 0.08 * settle, rot: 0, dx: 0, dy: 0 }
}
