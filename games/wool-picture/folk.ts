import { BEATS, COAT_ACTS, actOf, beatsBy, geoOf, walkOf, type Act, type Geo, type Walk } from './acts'
import { actVoice, beatVoice, coatOff, coatOn, giggle, homeLanding } from './calls'
import { MOOD_SECONDS, type Mood } from './cast'
import type { Point } from './input'
import { BOWLS, CELL, COLS, FELT, FIGURE, FOLK, FRAME, GOOSE, ON_SHEET, PEGS, PICTURE, PIG, ROWS, SHEEP, SHEPHERD, inBox, onFelt, sheetBox, type Box } from './layout'
import type { Toy } from './toy'
import { folkVoice } from './voices'
import { dryingCloud, envAt, nearestOfDye, nextDrop, rainOver, wayDown } from './weather'
import { BLUE, GREEN, RUSSET, YELLOW } from './wool'

// The four figures as the toy holds them, with no drawing in it. What is
// saved of a figure is the cell the child set it on (or null in the dish) and
// the coat laid on it. Everything else here is a view of that: what it does
// (acts.ts), where its walk has taken it, where its eyes are drawn.

export type Cell = { col: number; row: number }
/** A hop from where a figure was to where it now belongs. `at` is when it began on the toy's clock, or -1 while it waits its turn. */
export type Hop = { x: number; y: number; scale: number; at: number }

export type Figure = {
  at: Cell | null
  coat: number | null
  /** What its place, the weather and its coat make it do (acts.ts). */
  act: Act
  geo: Geo | null
  /** Where it is drawn: its feet in stage units, how large, which way it faces, and what its walk adds to its pose. */
  x: number; y: number; scale: number; flip: boolean; turn: number; hat: number
  mood: Mood
  moodSince: number
  variant: number
  pokes: number
  gazeX: number; gazeY: number
  lookAt: Point | null
  hop: Hop | null
  /** When its coat last came or went, for the puff the view shows. */
  coatAt: number
  /** It stands in mist and is hidden to the ears: `mistTop` is the row where that mist ends above it, or -1. */
  mist: boolean
  mistTop: number
  /** A sun dries the rain over it and it steams: the cloud whose rain that is (-1 for none), and what it did in that rain. */
  dried: boolean
  driedBy: number
  wetAct: Act | null
  /**
   * Rain falls on it and makes it do what it does: the cloud whose rain that is (-1 for none). It answers when a
   * drop reaches it, all four alike: until then (`reached` false) it is shown as `before`, which is what it was
   * doing if it was already here, and standing plainly if it has just been set down. `way` is how far down the
   * rain its head is, and `dropAt` when the next drop of a steady rain gets there, on the toy's clock.
   */
  rainBy: number
  reached: boolean
  before: Act
  way: number
  dropAt: number
  /** The side the sun over it is on: -1 left, 1 right, 0 with no sun. The sheep turns its back to it. */
  sunSide: number
  /** It stands in a pond or a stream, to its knees. */
  wade: boolean
  /** The goose is away to take the oldest picture down. */
  errand: boolean
  /**
   * What it is shown doing now: its act, or what a scene has it do on the way there. `shownSince` is when it
   * began that, on the toy's clock: its pose and its walk run from there. `beats` is how many of the act's
   * moments (acts.ts) have been heard.
   */
  shown: Act
  shownSince: number
  beats: number
}

/** How long a hop takes, in seconds. */
export const HOP = 0.45
/** How quickly each figure's eyes catch up with what they follow: the goose snaps, the shepherd drifts. */
const EYE_SPEED = [3, 14, 2, 6]
/** Where each figure's eyes are, from its feet, as a share of its size. */
const EYES = [{ x: -0.3, y: 0.62 }, { x: -0.18, y: 0.86 }, { x: 0, y: 0.78 }, { x: -0.28, y: 0.56 }]
/** The dye each figure looks for: the sheep green, the goose blue, the pig russet. The shepherd looks to the top of the sheet. */
const WANTS = [GREEN, BLUE, -1, RUSSET]

const walk: Walk = { x: 0, y: 0, flip: false, turn: 0, hat: 0 }

export function makeFolk(saved: readonly { at: Cell | null; coat: number | null }[]): Figure[] {
  return FOLK.map((dish, who) => ({
    at: saved[who].at ? { ...saved[who].at! } : null, coat: saved[who].coat, act: 'dish' as Act, geo: null,
    x: dish.x, y: dish.y, scale: dish.scale, flip: false, turn: 0, hat: 0,
    mood: 'idle' as Mood, moodSince: 0, variant: 0, pokes: 0, gazeX: 0, gazeY: 0, lookAt: null, hop: null, coatAt: -10,
    mist: false, mistTop: -1, dried: false, driedBy: -1, wetAct: null, rainBy: -1, reached: true, before: 'dish' as Act, way: 0, dropAt: 0, sunSide: 0, wade: false, errand: false, shown: 'dish' as Act, shownSince: -100, beats: 0,
  }))
}

/** Where a figure belongs now, apart from any hop: on its walk from the cell it was set on, or in its place in the dish. */
function placeOf(toy: Toy, who: number, out: { x: number; y: number; scale: number }): void {
  const f = toy.folk[who], dish = FOLK[who]
  // Away on its errand the goose has a way of its own, and the place it comes back to is where it stands.
  walkOf(f.errand ? 'dish' : f.shown, toy.t - f.shownSince, f.at ? f.at.col : 0, f.at ? f.at.row : 0, f.geo, walk)
  f.flip = walk.flip; f.turn = walk.turn; f.hat = walk.hat
  // Under a sun the sheep turns its back to it.
  if (f.shown === 'squint' && f.sunSide !== 0) f.flip = f.sunSide < 0
  if (f.at) { out.x = FELT.x + (f.at.col + 0.5 + walk.x) * CELL; out.y = FELT.y + (f.at.row + 1 + walk.y) * CELL; out.scale = ON_SHEET }
  else { out.x = dish.x + walk.x * CELL; out.y = dish.y; out.scale = dish.scale }
}

const place = { x: 0, y: 0, scale: 1 }

/**
 * What a figure is shown doing now. Mostly its act. What is shown on the way to it: the goose is away with the
 * oldest picture; a figure the rain has not reached yet goes on as it was; the shepherd holds a hand out to
 * the first drops of the rain's scene before he sits down in them; and a figure a sun is drying goes on as it
 * was in the rain until the rain over it has stopped, and stands up as the drying begins.
 */
export function shownOf(toy: Toy, who: number): Act {
  const f = toy.folk[who], show = toy.show
  if (who === GOOSE && show.kind === 'evening' && show.old !== null && show.down < 1) return 'fly'
  if (f.wetAct && show.kind === 'sun' && show.cloud === f.driedBy && show.dry <= 0) return f.wetAct
  if (f.rainBy >= 0 && !f.reached) return f.before
  if (who === SHEPHERD && f.act === 'wet' && show.kind === 'rain' && show.answer < 0.5) return 'feel'
  return f.act
}

/** A figure begins what it is shown doing. Begun `now`, its pose runs from this tick and its moments are still to come; otherwise it is found well into it, at rest, as a load finds it. */
function begin(toy: Toy, who: number, shown: Act, now: boolean): void {
  const f = toy.folk[who]
  f.shown = shown
  f.shownSince = now ? toy.t : toy.t - 100
  f.beats = now ? 0 : (BEATS[shown]?.times ?? 0)
}

/** Without a sound and at rest, every figure is shown what it now does: after a load, a touch that was taken away, or a scene a touch has ended. */
export function restShown(toy: Toy): void {
  for (let who = 0; who < toy.folk.length; who++) { toy.folk[who].reached = true; const shown = shownOf(toy, who); if (shown !== toy.folk[who].shown) begin(toy, who, shown, false) }
}

/** One tick of one figure: where it is drawn, and where its eyes go. A hop that lands is heard in the tick it lands. */
export function tickFigure(toy: Toy, who: number): void {
  const f = toy.folk[who]
  if (f.mood !== 'idle' && toy.t - f.moodSince >= MOOD_SECONDS[f.mood]) { f.mood = 'idle'; f.lookAt = null }
  const held = toy.held && toy.held.kind === 'figure' && toy.held.who === who && toy.held.lifted
  const show = toy.show
  f.errand = who === GOOSE && show.kind === 'evening' && show.old !== null && show.down < 1
  if (f.rainBy >= 0 && !f.reached) {
    // The rain reaches it: in the rain's own scene when the first drops have come down as far as its head, and
    // under a rain that already falls when the next drop gets there.
    const mine = show.kind === 'rain' && show.cloud === f.rainBy
    if (mine ? show.fall > 0 && show.fall / 0.4 >= f.way : toy.t >= f.dropAt - 1e-9) f.reached = true
  }
  const shown = shownOf(toy, who)
  if (shown !== f.shown) {
    // It begins something in this tick, and is heard beginning it: the sound of the doing, at the moment it shows.
    // The errand has the scene's own sounds, and a coat and the hand have theirs.
    begin(toy, who, shown, !f.errand)
    if (!f.errand && shown !== 'dish' && shown !== 'held' && !COAT_ACTS.includes(shown)) toy.cue(actVoice(who, shown))
  }
  // What the act does at a moment sounds in the tick that moment's pose begins.
  const beats = beatsBy(f.shown, toy.t - f.shownSince)
  if (beats > f.beats) { f.beats = beats; toy.cue(beatVoice(who, f.shown)) }
  const feeling = f.shown === 'feel'
  if (f.errand) {
    // It flies up to the oldest picture, carries it to the easel, tucks it behind the stack, and comes back to where it was.
    placeOf(toy, who, place)
    const from = f.hop ?? place, u = show.down, peg = PEGS[show.old!.peg]
    const ax = peg.x + 46, ay = peg.y + PICTURE.h + 190, bx = FRAME.x + FRAME.w + 40, by = FRAME.y + 330
    const leg = u < 0.3 ? u / 0.3 : u < 0.75 ? (u - 0.3) / 0.45 : (u - 0.75) / 0.25, e = leg * leg * (3 - 2 * leg)
    const [x0, y0, x1, y1] = u < 0.3 ? [from.x, from.y, ax, ay] : u < 0.75 ? [ax, ay, bx, by] : [bx, by, from.x, from.y]
    f.x = x0 + (x1 - x0) * e; f.y = y0 + (y1 - y0) * e - 26 * Math.sin(leg * Math.PI)
    f.scale = from.scale + (0.6 - from.scale) * Math.sin(u * Math.PI); f.flip = x1 > x0; f.turn = 0; f.hat = 0
  } else if (held) {
    // In the hand: it hangs from the finger by its middle, and takes the size of where it is over.
    const target = onFelt(toy.finger) ? ON_SHEET : FOLK[who].scale
    f.scale += (target - f.scale) * 0.25
    f.x = toy.finger.x; f.y = toy.finger.y + FIGURE[who].h * f.scale * 0.5
    f.flip = false; f.turn = 0; f.hat = 0
  } else {
    placeOf(toy, who, place)
    const hop = f.hop
    if (!hop) { f.x = place.x; f.y = place.y; f.scale = place.scale }
    else if (hop.at < 0) { f.x = hop.x; f.y = hop.y; f.scale = hop.scale }
    else {
      const u = Math.min(1, (toy.t - hop.at) / HOP), e = u * u * (3 - 2 * u)
      f.scale = hop.scale + (place.scale - hop.scale) * e
      f.x = hop.x + (place.x - hop.x) * e
      // Each jumps in its own manner: the goose high and flat, the pig low and round.
      f.y = hop.y + (place.y - hop.y) * e - [46, 84, 30, 22][who] * Math.sin(u * Math.PI)
      if (u >= 1) { f.hop = null; toy.play(homeLanding(who)) }
    }
  }
  // The eyes: on the finger at work, on the thing that has just woken, or on what it wants.
  const wants = WANTS[who], near = f.at && wants >= 0 ? nearestOfDye(toy.sheet, wants, f.at.col, f.at.row) : null
  const wish = near ? { x: FELT.x + near.col * CELL, y: FELT.y + near.row * CELL } : wants >= 0 ? BOWLS[wants] : { x: FELT.x + FELT.w / 2, y: FELT.y + 30 }
  const busy = toy.finger.down || toy.t - toy.finger.movedAt < 1.2
  const target = feeling ? { x: f.x, y: f.y - 600 } : f.lookAt ?? (busy && !held ? toy.finger : wish)
  const ex = f.x + EYES[who].x * FIGURE[who].w * f.scale, ey = f.y - EYES[who].y * FIGURE[who].h * f.scale
  const gx = Math.max(-1, Math.min(1, (target.x - ex) / 260)), gy = Math.max(-1, Math.min(1, (target.y - ey) / 260))
  const step = Math.min(1, EYE_SPEED[who] / 60)
  f.gazeX += (gx - f.gazeX) * step
  f.gazeY += (gy - f.gazeY) * step
}

/** The box a figure answers a touch on, where it is drawn now. */
export function boxOf(toy: Toy, who: number): Box {
  const f = toy.folk[who]
  if (f.at || f.hop || f.errand) return sheetBox(who, f.x, f.y)
  const dish = FOLK[who]
  return { x: f.x - dish.w / 2, y: f.y - dish.h, w: dish.w, h: dish.h }
}

/** The figure a touch at this point lands on, or -1: those on the sheet first, the nearest to the front first, then those in the dish. */
export function figureAt(toy: Toy, at: Point): number {
  const onSheet = [SHEEP, GOOSE, SHEPHERD, PIG].filter((who) => toy.folk[who].at).sort((a, b) => toy.folk[b].y - toy.folk[a].y)
  for (const who of onSheet) if (inBox(at, boxOf(toy, who))) return who
  for (const who of [SHEEP, PIG, SHEPHERD, GOOSE]) if (!toy.folk[who].at && inBox(at, boxOf(toy, who))) return who
  return -1
}

/**
 * What every figure does now, read again from its place, the weather and its coat. With `begins`, a figure
 * whose act changed begins it in the next tick and is heard there (`tickFigure`); without, it is found already
 * at rest in it and nothing sounds, as on a load.
 */
export function refreshActs(toy: Toy, begins: boolean): void {
  for (let who = 0; who < toy.folk.length; who++) {
    const f = toy.folk[who]
    const env = f.at ? envAt(toy.sheet, toy.weather, f.at.col, f.at.row, Math.ceil((FIGURE[who].h * ON_SHEET) / CELL)) : null
    const held = toy.held && toy.held.kind === 'figure' && toy.held.who === who && toy.held.lifted
    f.act = held ? 'held' : actOf(who, env, f.coat)
    f.geo = env && env.shape ? geoOf(env.shape) : null
    f.mist = env !== null && env.mist; f.dried = env !== null && env.dried
    f.wade = env !== null && (env.ground === 'pond' || env.ground === 'stream')
    f.mistTop = -1; f.driedBy = -1; f.wetAct = null; f.sunSide = 0
    if (!env || !f.at || held) { f.rainBy = -1; f.reached = true; continue }
    const col = Math.floor(f.at.col), row = Math.floor(f.at.row)
    // What the rain makes it do, it does when a drop reaches it. The earth under the pig is mud without that rain only where water lies beside it.
    const dry = env.wet ? actOf(who, { ...env, wet: false, mud: env.spring }, f.coat) : f.act
    const rain = dry !== f.act ? rainOver(toy.weather, f.at.col, f.at.row) : undefined, by = rain ? rain.cloud.id : -1
    if (by !== f.rainBy) {
      f.rainBy = by
      f.reached = !rain
      if (rain) {
        f.before = f.shown === dry ? dry : 'dish'
        f.way = wayDown(rain, row + 1 - (FIGURE[who].h * ON_SHEET) / CELL)
        f.dropAt = toy.t + nextDrop(rain, f.at.col, f.way, toy.t)
      }
    }
    if (env.mist) {
      // How high the mist stands over its feet: up its own column, from where it stands.
      const mist = toy.sheet.shapes.find((other) => other.kind === 'mist' && (other.cells[row * COLS + col] > 0 || (row > 0 && other.cells[(row - 1) * COLS + col] > 0)))
      let top = row
      while (mist && top > 0 && mist.cells[(top - 1) * COLS + col] > 0) top--
      f.mistTop = top
    }
    if (env.dried) {
      // What it did in the rain a sun now dries: the earth under the pig was mud.
      f.driedBy = dryingCloud(toy.weather, f.at.col, f.at.row)
      f.wetAct = actOf(who, { ...env, wet: true, dried: false, mud: env.mud || env.ground === 'earth' }, f.coat)
    }
    if (env.sun) {
      const sun = toy.weather.suns.reduce((best, next) => (Math.hypot(next.col - col, next.row - row) < Math.hypot(best.col - col, best.row - row) ? next : best))
      f.sunSide = sun.col < col ? -1 : 1
    }
  }
  if (!begins) restShown(toy)
}

/** A poke: the figure answers at once, a little differently each time. */
export function poke(toy: Toy, who: number): void {
  const f = toy.folk[who]
  f.variant = f.pokes++
  f.mood = 'poke'; f.moodSince = toy.t; f.lookAt = null
  toy.cue(folkVoice(who, 'poke', f.variant))
}

/** Wool laid across a figure sticks to it as a coat of that dye. */
export function wear(toy: Toy, who: number, dye: number): void {
  const f = toy.folk[who]
  if (f.coat === dye) return
  f.coat = dye; f.coatAt = toy.t
  toy.cue(coatOn(who, dye))
  for (let i = 0; i < 4; i++) toy.loose(f.x, f.y - FIGURE[who].h * f.scale * 0.5, dye)
  // A lit figure draws the moth off the frame to circle it.
  if (dye === YELLOW) toy.orbit(who)
  // It begins what the coat makes it do now: the coat's own sound is above, and its bumps and shakes are heard as they come.
  refreshActs(toy, true)
  toy.changed = true
}

/** The comb on a figure: a coat comes off in one tuft, which floats down; with no coat it tickles. */
export function combFigure(toy: Toy, who: number): void {
  const f = toy.folk[who]
  if (f.coat === null) {
    f.mood = 'tickle'; f.moodSince = toy.t; f.lookAt = null
    toy.cue(giggle(who))
    return
  }
  toy.tuft(f.x, f.y - FIGURE[who].h * f.scale * 0.6, f.coat)
  f.coat = null; f.coatAt = toy.t
  toy.cue(coatOff)
  refreshActs(toy, true)
  toy.changed = true
}

/** The cell a figure let go at this point of the felt stands on: its feet, kept inside the sheet. */
export function cellFor(who: number, x: number, y: number): Cell {
  const cells = Math.ceil((FIGURE[who].h * ON_SHEET) / CELL)
  return { col: Math.max(1, Math.min(COLS - 2, Math.floor((x - FELT.x) / CELL))), row: Math.max(Math.min(cells, ROWS - 1), Math.min(ROWS - 1, Math.floor((y - FELT.y) / CELL) - 1)) }
}

/** A figure starts a hop from where it is drawn to where it now belongs. */
export function hopFrom(toy: Toy, who: number, waiting = false): void {
  const f = toy.folk[who]
  f.hop = { x: f.x, y: f.y, scale: f.scale, at: waiting ? -1 : toy.t }
}
