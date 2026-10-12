import type { Note } from './audio'
import { HOOK_GRIP, PLACES, POLE, REACH, SURFACES, WIRE, perch, wormPlace, type Box } from './layout'
import { Play, type Speaker } from './play'
import { deserialize, type Save } from './save'
import type { Paper } from './sheet'
import type { Sketch } from './sketch'
import type { SoundEvent } from './sounds'
import { fit } from './stage'
import { THROW, type Creature, type Wood } from './wood'
import { WORM_MIDDLE, lampShows, wormAt } from './worms'

// A hand for the tests. It plays the game through the same path the Mount
// uses (play.ts): pointers in the surface's own pixels and frames of the
// game's own clock. It keeps every sound the game made, every voice handed to
// the speaker, and every call to storage.

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** One frame of a display. */
export const FRAME = 1 / 60

/** A save found in the wood with the candle burning, as `deserialize` repairs it. */
export function woodSave(over: Record<string, unknown> = {}): Save {
  return deserialize({ v: 1, position: 'three-windows', finished: false, place: 'wood', made: 'lit', lit: true, ...over })
}

/** Where the grip must be for the patch of `paper` to lie with its middle on a point, as near as the finger can reach. */
export function gripFor(wood: Wood, paper: Paper | null, x: number, y: number): { x: number; y: number } {
  const patch = wood.patches.find((p) => p.paper === paper)!
  return {
    x: clamp(x - Math.cos(patch.bearing) * THROW - POLE.x, REACH.left, REACH.right),
    y: clamp(y - Math.sin(patch.bearing) * THROW - patch.drop - POLE.y - WIRE, REACH.top, REACH.bottom),
  }
}

export class Hand {
  readonly play: Play
  readonly heard: SoundEvent[] = []
  /** Every voice handed to the speaker, and every hush, in order. */
  readonly spoke: ({ notes: readonly Note[]; scene: boolean } | 'hushScene' | 'hushAll')[] = []
  /** Every call to storage: true for one that must not wait. */
  readonly kept: boolean[] = []
  /** Where each finger is, in stage units. */
  private readonly fingers = new Map<number, { x: number; y: number }>()
  /** Called after every frame. */
  watch: (() => void) | null = null
  /** Called before every frame and every pointer event, and after each with the sounds it made. */
  before: (() => void) | null = null
  after: ((events: SoundEvent[], pointer: boolean) => void) | null = null
  /** Seconds a frame plays: a display's frame, or one step of the game's clock for a test that looks at every step. */
  frame = FRAME
  private told = 0

  constructor(save: Save, readonly surface: { width: number; height: number } = SURFACES[0], seed = 1) {
    const speaker: Speaker = {
      play: (notes, scene) => void this.spoke.push({ notes, scene }),
      hushScene: () => void this.spoke.push('hushScene'),
      hushAll: () => void this.spoke.push('hushAll'),
    }
    this.play = new Play(save, seed, speaker, (urgent) => void this.kept.push(urgent))
    this.play.heard = this.heard
    this.play.size(surface.width, surface.height)
    this.play.frame(0)
  }

  get game() { return this.play.game }
  get wood(): Wood { return this.play.game.wood! }
  get table() { return this.play.game.table }

  /** A point of the stage, in the surface's own pixels. */
  px(x: number, y: number): { x: number; y: number } {
    const by = fit(this.surface.width, this.surface.height)
    return { x: x * by.scale + by.x, y: y * by.scale + by.y }
  }

  private did(pointer: boolean): void {
    const events = this.heard.slice(this.told)
    this.told = this.heard.length
    this.after?.(events, pointer)
  }

  down(x: number, y: number, id = 1): boolean {
    const at = this.px(x, y)
    this.fingers.set(id, { x, y })
    this.before?.()
    const taken = this.play.down(id, at.x, at.y)
    this.did(true)
    return taken
  }

  move(x: number, y: number, id = 1): void {
    const at = this.px(x, y)
    this.fingers.set(id, { x, y })
    this.before?.()
    this.play.move(id, at.x, at.y)
    this.did(true)
  }

  up(id = 1): void {
    const finger = this.fingers.get(id)!
    const at = this.px(finger.x, finger.y)
    this.fingers.delete(id)
    this.before?.()
    this.play.up(id, at.x, at.y)
    this.did(true)
  }

  cancel(id = 1): void {
    this.fingers.delete(id)
    this.before?.()
    this.play.cancel(id)
    this.did(true)
  }

  wait(seconds: number): void {
    for (let i = 0; i < Math.round(seconds / this.frame); i++) {
      this.before?.()
      this.play.frame(this.frame)
      this.did(false)
      this.watch?.()
    }
  }

  /** A tap: down, a tenth of a second, up. */
  tap(x: number, y: number, id = 1): void {
    this.down(x, y, id)
    this.wait(0.1)
    this.up(id)
  }

  /** Moves a finger that is down to a point at `speed` stage units a second. */
  slide(x: number, y: number, speed = 300, id = 1): void {
    for (;;) {
      const finger = this.fingers.get(id)!
      const dx = x - finger.x, dy = y - finger.y, far = Math.hypot(dx, dy), by = speed * this.frame
      if (far <= by) break
      this.move(finger.x + (dx / far) * by, finger.y + (dy / far) * by, id)
      this.wait(this.frame)
    }
    this.move(x, y, id)
    this.wait(this.frame)
  }

  /** A drag from one point to another, lifted at the end. */
  drag(fromX: number, fromY: number, toX: number, toY: number, speed = 300, id = 1): void {
    this.down(fromX, fromY, id)
    this.wait(this.frame)
    this.slide(toX, toY, speed, id)
    this.up(id)
  }

  /** Carries the lantern's grip to a point and holds it there, finger down. A finger cannot take the grip past its reach, so the hand does not try to. */
  carry(x: number, y: number, speed = 150, hold = 1.2): void {
    x = clamp(x, REACH.left, REACH.right); y = clamp(y, REACH.top, REACH.bottom)
    if (!this.fingers.has(1)) {
      this.down(this.wood.want.x, this.wood.want.y)
      this.wait(this.frame)
    }
    this.slide(x, y, speed)
    this.wait(hold)
  }

  /** Lays the light of `paper` on a point. */
  shine(paper: Paper | null, x: number, y: number, hold = 1.2, speed = 150): void {
    const at = gripFor(this.wood, paper, x, y)
    this.carry(at.x, at.y, speed, hold)
  }

  /** Counts the sounds of one kind heard so far. */
  count(kind: SoundEvent['kind']): number {
    return this.heard.filter((event) => event.kind === kind).length
  }
}

// --- A walk that meets ---------------------------------------------------------------

/**
 * Meets one creature by play, with the sheet in hand, as a child would: the light of its rule is carried onto
 * it and held or led. Nothing is written into the wood: the creature is in `met` because it answered. The sheet
 * must have the paper the recipe names (the three-window sheet has them all). After the badger the candle is
 * out, as its rule leaves it, and the hand lights it again with a tap on the lantern.
 */
export function meet(hand: Hand, name: Creature): void {
  const wood = hand.wood
  switch (name) {
    case 'moths':
      // The yellow laid on the lowest of them and held until they sit on it.
      hand.shine('yellow', perch(7).x, perch(7).y, 5, 120)
      break
    case 'fox':
      hand.shine('red', wood.fox.x + 60, PLACES.fox.y - 100, 2.5, 150)
      break
    case 'owl':
      hand.shine('yellow', PLACES.owl.x, 210, 1.5, 150)
      break
    case 'worms':
      hand.shine('blue', wormPlace(2).x, wormPlace(2).y - WORM_MIDDLE, 1.5, 150)
      break
    case 'hedgehog': {
      // The lantern lowered to the ground, the red laid on it and led slowly along.
      hand.carry(wood.want.x, 790, 150, 0.2)
      const to = gripFor(wood, 'red', wood.hedgehog.x - 20, PLACES.hedgehog.y - 76)
      hand.carry(to.x, to.y, 110, 1.5)
      hand.carry(to.x - 120, to.y, 60, 1.5)
      break
    }
    case 'badger':
      hand.shine('red', PLACES.badger.x, PLACES.badger.y - 120, 2.4, 150)
      hand.up()
      hand.wait(0.4)
      hand.tap(wood.lantern.x, wood.lantern.y)
      hand.wait(0.2)
      break
  }
}

/** A walk from the step that meets every creature named, in the order that keeps each one's rule its first light. */
export function meetAll(hand: Hand, names: readonly Creature[] = ['moths', 'worms', 'fox', 'hedgehog', 'owl', 'badger']): void {
  for (const name of ['moths', 'worms', 'fox', 'hedgehog', 'owl', 'badger'] as const) if (names.includes(name)) meet(hand, name)
}

/**
 * Carries the lantern home to the hook and holds it there, finger down: along the ground to the door and then
 * up, so that the red, which puts a glow-worm's lamp out, does not cross the fern on the way.
 */
export function goHome(hand: Hand, speed = 400): void {
  hand.carry(HOOK_GRIP.x, 790, speed, 0)
  hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, speed, 0)
}

// --- What is seen ----------------------------------------------------------------

const r3 = (v: number) => Math.round(v * 1000) / 1000
const list = (values: ArrayLike<number>) => Array.from(values, r3).join(',')

/**
 * For every sound, what the eye has of it: the values the view draws for the motion the sound belongs to, as one
 * string. The sync test reads it before and after the step that made the sound, and it must have changed.
 */
export const SEEN: Record<SoundEvent['kind'], (hand: Hand) => string> = (() => {
  const lantern = (h: Hand) => `${h.wood.swing}|${r3(h.wood.flare)}|${h.wood.lit}|${r3(h.wood.bend)}`
  const moths = (h: Hand) => { const m = h.wood.moths; return `${m.list.map((moth) => `${moth.mode}${r3(moth.x)},${r3(moth.y)},${r3(moth.spin)},${r3(moth.fold)}`).join(';')}|${r3(m.snore)}|${r3(m.peer)}|${r3(h.wood.sag)}` }
  const fox = (h: Hand) => { const f = h.wood.fox; return `${f.mode}|${list([f.x, f.stride, f.puff, f.squint, f.paw, f.shake, f.air, f.dive, f.reach, f.recoil, f.tilt, f.over, f.facing, f.creep, f.raise, f.glance])}` }
  const owl = (h: Hand) => { const o = h.wood.owl; return `${o.away}|${list([o.yaw, o.roll, o.lidLeft, o.lidRight, o.whirl, o.lean, o.clack, o.feather.x, o.feather.y, o.feather.tilt, o.feather.t < 0 ? 0 : 1])}` }
  const at = { x: 0, y: 0 }
  const worms = (h: Hand) => { const w = h.wood.worms; return `${[0, 1, 2, 3, 4].map((i) => { wormAt(h.wood, i, at); return `${lampShows(h.wood, i)}${r3(at.x)},${r3(at.y)}` }).join(';')}|${list(w.pulse)}|${list(w.duck)}|${list(w.flash)}|${list(w.knock)}|${w.drop.landed >= 0}` }
  const hog = (h: Hand) => { const g = h.wood.hedgehog; return `${g.mode}|${list([g.x, g.stride, g.sniff, g.shiver, g.sit, g.roll, g.upside, g.rub, g.spiked, g.carries, g.facing])}` }
  const badger = (h: Hand) => { const b = h.wood.badger; return `${b.mode}|${list([b.breath, b.start, b.snore, b.raspberry, b.about, b.farPuff, b.shrug])}|${h.wood.lit}` }
  const scissors = (h: Hand) => list([h.table.scissors.x, h.table.scissors.y, h.table.scissors.open])
  const inHand = (h: Hand) => { const t = h.table, hand = t.hand; return `${hand && 'x' in hand && hand.kind !== 'candle' ? list([hand.x, hand.y]) : ''}|${list([t.rolled, t.candle.x, t.candle.y, t.wobble, t.hop])}` }
  return {
    ring: lantern, tock: lantern, bell: lantern, wire: lantern, strike: lantern, hookRing: lantern,
    patter: moths, whirr: moths, tink: moths, pff: moths, mothSnore: moths, tumble: moths, rustle: moths, sag: moths, tinyFeet: moths, settle: moths,
    sniff: fox, sneeze: fox, pad: fox, hum: fox, plip: fox, shake: fox, hop: fox, thud: fox, scrabble: fox, thump: fox, squeak: fox, noseSniff: fox, dong: fox, whine: fox, flop: fox,
    hoot: owl, spin: owl, feather: owl, clack: owl, hm: owl,
    click: worms, plop: worms, duck: worms, eep: worms, chime: worms, trill: worms, bead: worms, knock: worms,
    feet: hog, snuffle: hog, spike: hog, tiptoe: hog, shiver: hog, pop: hog, rumble: hog, root: hog, bonk: hog, peep: hog,
    cheeks: badger, blow: badger, miss: badger, raspberry: badger, snore: badger, grunt: badger, farBlow: badger,
    zip: (h) => `${h.wood.spider.up}|${r3(h.wood.spider.y)}`,
    snip: scissors,
    scrap: (h) => String(h.table.scraps.length),
    bat: (h) => `${r3(h.table.cat.bat)}|${h.table.scraps.map((scrap) => r3(scrap.x)).join(',')}`,
    slide: inHand,
    tuck: (h) => `${r3(h.table.tucked.pulse)}|${h.table.sheet.map((window) => window.paper).join(',')}`,
    back: (h) => `${r3(h.table.back.along)}|${r3(h.table.candleBack.along)}|${r3(h.table.freshBack.along)}|${r3(h.table.closing.along)}|${list([h.table.candle.x, h.table.candle.y])}`,
    scamper: (h) => `${r3(h.table.cat.x)}|${r3(h.table.cat.to)}`,
    roll: (h) => r3(h.table.rolled) + h.table.made,
    set: (h) => list([h.table.candle.x, h.table.candle.y]),
    tap: (h) => `${r3(h.table.knock.pulse)}|${r3(h.table.knock.x)}|${r3(h.table.cat.ear)}|${h.game.wood ? `${r3(h.game.wood.nick.pulse)},${r3(h.game.wood.nick.x)}` : ''}`,
    land: (h) => String(r3(h.table.landing)),
    off: (h) => String(r3(h.table.gone.along)),
    wobble: inHand,
    catch: (h) => String(r3(h.table.flame)),
    door: (h) => String(r3(h.game.show.door)),
    eyes: (h) => list(h.wood.awake),
    hang: (h) => `${h.wood.hung}|${list([h.wood.lantern.x, h.wood.lantern.y, h.wood.swing])}`,
    pinch: (h) => `${r3(h.table.flame)}|${r3(h.game.show.smoke)}`,
    unroll: (h) => String(r3(h.table.rolled)),
  }
})()

/** The box a sketch takes: every point of its wax, its lines and its whites. */
export function boundsOf(sketch: Sketch): Box {
  const out = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  for (const bucket of [sketch.hide, sketch.lines, sketch.whites]) {
    for (let i = 0; i < bucket.n; i += 2) {
      out.left = Math.min(out.left, bucket.pts[i]); out.right = Math.max(out.right, bucket.pts[i])
      out.top = Math.min(out.top, bucket.pts[i + 1]); out.bottom = Math.max(out.bottom, bucket.pts[i + 1])
    }
  }
  return out
}
