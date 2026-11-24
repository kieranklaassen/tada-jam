import { BODY, EYES, FACES, FIRST_SPRITES, HEAD, LATER_SPRITES, MOLE_EYES, MOLE_FACE, MOLE_SPRITE, PORTRAIT, SLAB, SQUEEZED, drawEyes, drawMouth, type Mouth } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { hintFor } from './guide'
import type { Point } from './input'
import { BASKET, BELL, BOARD, CELL, MOLE, SNACK_HOME, SPOTS, THOUGHTS, basketTop, cellAt, plaqueAt, snackAt } from './layout'
import { poseOf, ring, strength, type Pose } from './motion'
import { Stamps, surface, type Ctx, type Sprite } from './mosaic'
import { RESULT, MET_AT, type Cue, type Play, type Poke } from './play'
import { ANIMALS, SNACKS, wishAt, type Animal, type Coat, type Snack, type Thing } from './things'
import { choice, columnOf, hasTools, here, onGround, tallest, type Event } from './town'
import { BALLOON, BIG_BUBBLE, BASKET_BACK, BASKET_FRONT, BASKET_LID, BELL_BEAM, BELL_SPRITE, BOARD_SPRITE, DOT, DRUM, FIRST_PROPS, GHOST, GLOW, LATER_PROPS, MOON, PILLOW, PLAQUES, PUDDLE, SHUT, SNACK_ART, TRIO, TUB, WANT, WISH_ART, paintSquare } from './scenery'

// Draws the square from the rules, and keeps what is only to be seen: hops,
// springs and falling stones. Nothing here is saved and nothing decides.

export const DRAW_LIMIT = 80
const LONG = 99
/** Inside its square, so that the plain slab frames everybody alike. */
export const SQUARE_SCALE = 0.84
/** How large an animal is in the hand. */
const HAND_SCALE = 0.72

export type Place = { kind: 'ground' } | { kind: 'cell'; col: number; row: number } | { kind: 'basket' } | { kind: 'hand' }
type Hop = { x: number; y: number; s: number; t: number; seconds: number; arc: number }
type Seen = { place: Place; x: number; y: number; s: number; hop: Hop | null; landed: number; poked: number; hopped: number; eating: number; spitting: number; cross: number; gx: number; gy: number; swing: number }
type Falling = { sprite: Sprite; x: number; y: number; vx: number; t: number }
type Flying = { snack: Snack; from: Point; t: number; how: 'home' | 'bait'; seconds: number }

const ease = (t: number) => t * t * (3 - 2 * t)
const clamp = (t: number) => Math.max(0, Math.min(1, t))
const same = (a: Place, b: Place) => a.kind === b.kind && (a.kind !== 'cell' || b.kind !== 'cell' || (a.col === b.col && a.row === b.row))

export class View {
  readonly stamps = new Stamps()
  private still: { canvas: CanvasImageSource; x: number; y: number; w: number; h: number } | null = null
  private time = 0
  private seen: Record<Animal, Seen> | null = null
  private bell = LONG
  private mole = LONG
  private moleWith: { snack: Snack; t: number } | null = null
  private wishSwap = LONG
  private pushed = new Map<string, number>()
  private ballot: (Thing | null)[] | null = null
  private flip = [LONG, LONG, LONG]
  private tall = { cols: [] as number[], t: LONG }
  private falling: Falling[] = []
  private bits: { x: number; y: number; t: number }[] = []
  private flying: Flying[] = []
  private fresh = true
  private lastHand: Point = { x: 590, y: 400 }
  private later: Sprite[] = []
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** Landings of squares, for the voices. */
  clacks: { who: Animal; row: number; fell: boolean }[] = []

  sized(scale: number, x: number, y: number, w: number, h: number): void {
    this.stamps.at(scale)
    const made = surface.make(Math.max(1, Math.ceil(w * scale)), Math.max(1, Math.ceil(h * scale)))
    made.ctx.scale(scale, scale)
    made.ctx.translate(-x, -y)
    paintSquare(made.ctx, x, y, w, h)
    for (const s of [...FIRST_PROPS, ...FIRST_SPRITES]) this.stamps.warm(s)
    this.later = [...LATER_PROPS, ...LATER_SPRITES]
    this.still = { canvas: made.canvas, x, y, w, h }
  }

  /** Lays a few of the pictures that are not needed yet. */
  warmSome(n = 2): void {
    for (const s of this.later.splice(0, n)) this.stamps.warm(s)
  }

  // --- what happened ---------------------------------------------------------

  poke(p: Poke): void {
    const t = p.target
    switch (t.kind) {
      case 'animal': if (this.seen) this.seen[t.who].poked = 0; break
      case 'bell': if (this.bell > 2) this.bell = 0.9; break
      case 'mole': this.mole = 0; break
      case 'snack': this.pushed.set(t.snack, 0); break
      case 'plaque': this.pushed.set(`plaque${t.slot}`, 0); break
      case 'basket': this.pushed.set('basket', 0); break
      case 'column': case 'square': this.bits.push({ x: p.at.x, y: p.at.y, t: 0 }); if (this.bits.length > 3) this.bits.shift(); break
      default: t satisfies never
    }
  }

  notice(e: Event): void {
    switch (e.type) {
      case 'arrive': if (this.seen) { const s = this.seen[e.who]; s.x = SPOTS[e.who].x < 590 ? -220 : 1400; s.y = SPOTS[e.who].y; s.s = 1; this.go(s, 1.1, 60) } break
      case 'bounce': if (this.seen) this.seen[e.who].cross = 0; break
      case 'bait': this.flying.push({ snack: e.snack, from: this.snackFrom(e.snack), t: 0, how: 'bait', seconds: 0.35 }); break
      case 'home': this.flying.push({ snack: e.snack, from: this.snackFrom(e.snack), t: 0, how: 'home', seconds: 0.6 }); break
      case 'eat': if (this.seen) { this.seen[e.who].eating = 0; this.snackDone(e.snack) } break
      case 'spit': if (this.seen) { const s = this.seen[e.who]; s.spitting = 0; this.flying.push({ snack: e.snack, from: { x: s.x, y: s.y - 60 }, t: -0.35, how: 'home', seconds: 0.7 }) } break
      case 'turn': this.flip[e.slot] = 0; break
      case 'sweep': for (const w of e.was) { const c = cellAt(w.col, w.row); this.falling.push({ sprite: PORTRAIT[w.thing][w.who], x: c.x, y: c.y, vx: ((w.row * 37 + w.col * 53) % 60) - 30, t: -w.row * 0.04 }) } break
      case 'out': case 'hide': this.pushed.set('basket', 0); break
      case 'up': case 'down': case 'fall': case 'return': break
      default: e satisfies never
    }
  }
  private snackAtLast: Partial<Record<Snack, Point>> = {}
  private snackFrom(snack: Snack): Point {
    return this.snackAtLast[snack] ?? SNACK_HOME[snack]
  }
  private snackDone(snack: Snack): void {
    this.flying = this.flying.filter((f) => f.snack !== snack)
    this.pushed.set(`${snack}new`, 0)
  }

  cue(c: Cue): void {
    switch (c.type) {
      case 'ring': this.bell = 0; this.mole = 0; break
      case 'row': this.rowAt = { row: c.row, t: 0 }; break
      case 'tall': this.tall = { cols: c.cols, t: 0 }; break
      case 'met': this.wishSwap = 0; this.mole = 0; break
      case 'mole': this.moleWith = { snack: c.snack, t: 0 }; break
      case 'rush': case 'result': case 'turnOf': case 'end': case 'back': break
      default: c satisfies never
    }
  }
  private rowAt = { row: -1, t: LONG }

  // --- time --------------------------------------------------------------------

  placeOf(play: Play, who: Animal): Place {
    const { town, show, held } = play
    if (held?.kind === 'animal' && held.who === who) return { kind: 'hand' }
    if (town.finished && (!show || show.into >= 0)) return { kind: 'ground' }
    if (town.hidden === who) return { kind: 'basket' }
    const col = columnOf(town, who)
    return col < 0 ? { kind: 'ground' } : { kind: 'cell', col, row: town.columns[col].indexOf(who) }
  }

  private spot(place: Place, who: Animal): { x: number; y: number; s: number } {
    switch (place.kind) {
      case 'ground': return { x: SPOTS[who].x, y: SPOTS[who].y, s: 1 }
      case 'cell': { const c = cellAt(place.col, place.row); return { x: c.x, y: c.y + CELL / 2, s: (CELL * 0.9) / SPOTS[who].h } }
      case 'basket': return { x: basketTop.x, y: basketTop.y + 60, s: Math.min(0.62, 110 / SPOTS[who].w) }
      case 'hand': return { x: this.lastHand.x, y: this.lastHand.y + SPOTS[who].h * HAND_SCALE * 0.5, s: HAND_SCALE }
      default: return place satisfies never
    }
  }
  private go(s: Seen, seconds: number, arc: number, wait = 0): void {
    s.hop = { x: s.x, y: s.y, s: s.s, t: -wait, seconds, arc }
  }

  advance(play: Play, dt: number): void {
    this.time += dt
    const { town, show } = play
    if (play.hand) this.lastHand = play.hand
    this.bell += dt; this.mole += dt; this.wishSwap += dt; this.tall.t += dt; this.rowAt.t += dt
    for (const [k, t] of this.pushed) this.pushed.set(k, t + dt)
    if (this.moleWith && (this.moleWith.t += dt) > 2.2) {
      this.flying.push({ snack: this.moleWith.snack, from: { x: MOLE.x, y: MOLE.y }, t: 0, how: 'home', seconds: 0.7 })
      this.moleWith = null
    }
    this.ballot ??= [...town.ballot]
    for (let i = 0; i < 3; i++) {
      this.flip[i] += dt
      if (this.flip[i] > 0.2 || this.flip[i] === LONG) this.ballot[i] = town.ballot[i]
    }
    for (const f of this.falling) f.t += dt
    this.falling = this.falling.filter((f) => f.t < 0.9)
    for (const b of this.bits) b.t += dt
    this.bits = this.bits.filter((b) => b.t < 0.6)
    for (const f of this.flying) f.t += dt
    this.flying = this.flying.filter((f) => f.t < f.seconds)

    if (!this.seen) {
      // Opened as it was left: nobody hops anywhere.
      this.seen = Object.fromEntries(ANIMALS.map((who) => {
        const place = this.placeOf(play, who)
        return [who, { place, ...this.spot(place, who), hop: null, landed: LONG, poked: LONG, hopped: LONG, eating: LONG, spitting: LONG, cross: LONG, gx: 0, gy: 0, swing: 0 }]
      })) as Record<Animal, Seen>
    }
    let nth = 0
    for (const who of here(town)) {
      const s = this.seen[who], place = this.placeOf(play, who)
      s.landed += dt; s.poked += dt; s.hopped += dt; s.eating += dt; s.spitting += dt; s.cross += dt
      const to = this.spot(place, who)
      if (!same(place, s.place)) {
        const was = s.place
        s.place = place
        if (place.kind === 'hand') s.hop = null
        else if (place.kind === 'cell' && was.kind === 'cell' && place.col === was.col && place.row < was.row) this.go(s, 0.2, 0, place.row * 0.05)
        else this.go(s, 0.46, Math.min(130, 50 + Math.abs(to.x - s.x) * 0.2), show?.result.ran.includes(who) && show.into < 0 ? nth++ * 0.09 : 0)
      }
      if (s.hop) {
        const h = s.hop
        h.t += dt
        const k = clamp(h.t / h.seconds), e = h.arc ? ease(k) : k * k
        s.x = h.x + (to.x - h.x) * e
        s.y = h.y + (to.y - h.y) * e - Math.sin(k * Math.PI) * h.arc
        s.s = h.s + (to.s - h.s) * e
        if (k >= 1) {
          s.hop = null
          s.landed = 0
          if (place.kind === 'cell') this.clacks.push({ who, row: place.row, fell: h.arc === 0 })
        }
      } else if (place.kind === 'hand') {
        const k = Math.min(1, dt * 18)
        s.swing += ((to.x - s.x) * 0.006 - s.swing) * Math.min(1, dt * 10)
        s.x += (to.x - s.x) * k; s.y += (to.y - s.y) * k; s.s += (to.s - s.s) * k
      } else { s.x = to.x; s.y = to.y; s.s = to.s; s.swing *= 1 - Math.min(1, dt * 8) }
      const look = this.gaze(play, who, s)
      s.gx += (look.x - s.gx) * Math.min(1, dt * 7)
      s.gy += (look.y - s.gy) * Math.min(1, dt * 7)
    }
    const read = town.finished && (!show || show.t >= show.tallAt), winners = read ? tallest(town) : []
    for (let i = 0; i < 3; i++) {
      const up = town.ballot[i] !== null && winners.includes(town.ballot[i]!)
      if (up) this.crownY[i] = Math.max(104, cellAt(i, town.columns[i].length).y - 24)
      this.crown[i] = this.fresh ? (up ? 1 : 0) : clamp(this.crown[i] + dt * (up ? 1.6 : -3))
    }
    this.fresh = false
    if (show && this.rowAt.t < dt * 1.5) for (const col of town.columns) if (col[this.rowAt.row]) this.seen[col[this.rowAt.row]].hopped = 0
  }

  private gaze(play: Play, who: Animal, s: Seen): Point {
    const { town } = play
    const target = play.hand ?? (s.place.kind === 'ground' && !town.finished ? plaqueAt(choice(town, who)) : s.place.kind === 'cell' ? null : MOLE)
    if (!target) return { x: 0, y: 0 }
    const dx = target.x - s.x, dy = target.y - (s.y - SPOTS[who].h * 0.7 * s.s), l = Math.hypot(dx, dy) || 1
    return { x: dx / l, y: dy / l }
  }

  // --- drawing -------------------------------------------------------------------

  private coat(play: Play, who: Animal): Coat {
    return play.show && !play.show.coated ? play.show.result.before.coats[who] : play.town.coats[who]
  }

  draw(ctx: Ctx, play: Play | null, guidance: Guidance | null): void {
    const { stamps } = this
    stamps.count = 0
    if (this.still) { ctx.drawImage(this.still.canvas, this.still.x, this.still.y, this.still.w, this.still.h); stamps.count++ }
    if (!play || !this.seen) return
    const { town, show } = play, tools = hasTools(town)
    const won = show ? (show.into >= 0 ? show.result.won : []) : []
    const t = show ? Math.max(0, show.into) : 0, k = won.length ? strength(t, RESULT) : 0
    const left = town.finished && !show ? tallest(town) : []

    this.drawBell(ctx, !show && (town.finished || (onGround(town).length === 0 && !play.stale)))
    this.drawMole(ctx, play, won, t, k, left)
    for (let slot = 0; slot < 3; slot++) if ((slot < 2 || tools) && this.crown[slot] === 0) this.drawPlaque(ctx, slot)
    // The graph.
    const wall = town.finished && (!show || show.into >= 0)
    for (let col = 0; col < 3; col++) town.columns[col].forEach((who, row) => {
      const c = cellAt(col, row), thing = town.ballot[col]!, s = this.seen![who]
      if (wall) stamps.stamp(ctx, PORTRAIT[thing][who], c.x, c.y)
      else if (s.place.kind === 'hand' || (s.place.kind === 'cell' && (!s.hop || s.hop.arc === 0))) stamps.stamp(ctx, SLAB[thing], c.x, s.place.kind === 'cell' ? s.y - CELL / 2 : c.y)
    })
    if (!wall) for (let col = 0; col < 3; col++) for (const who of town.columns[col]) {
      const s = this.seen[who]
      if (s.place.kind === 'cell' && (!s.hop || s.hop.arc === 0)) this.drawSquare(ctx, play, who, s, col)
    }
    for (let slot = 0; slot < 3; slot++) if (this.crown[slot] > 0) this.drawPlaque(ctx, slot)
    for (const f of this.falling) if (f.t > 0) stamps.stamp(ctx, f.sprite, f.x + f.vx * f.t, f.y + f.t * f.t * 1400, f.vx * f.t * 0.06)
    if (won.includes('sleep')) {
      ctx.fillStyle = `rgba(38,30,84,${(0.36 * k).toFixed(3)})`
      ctx.fillRect(this.still?.x ?? 0, this.still?.y ?? 0, this.still?.w ?? 1180, this.still?.h ?? 820)
      stamps.count++
      stamps.stamp(ctx, MOON, 1110, 96 - (1 - k) * 220, Math.sin(this.time) * 0.04)
    }
    if (tools) this.drawBasketBack(ctx)
    if (tools && town.hidden && this.placeOf(play, town.hidden).kind === 'basket') this.drawBig(ctx, play, town.hidden, this.seen[town.hidden], [], 0, 0)
    if (tools) this.drawBasketFront(ctx, play)
    if (won.includes('dance')) {
      const b = Math.abs(Math.sin(this.time * Math.PI * 2)) * 0.1 * k
      stamps.stamp(ctx, DRUM, 452, 806, 0, k * (1 + b), k * (1 - b))
    }
    // Whoever is out, the furthest first.
    const out = here(town).filter((who) => { const s = this.seen![who]; return s.place.kind === 'ground' || (s.hop !== null && s.hop.arc !== 0 && s.place.kind === 'cell') })
    out.sort((a, b) => SPOTS[a].y - SPOTS[b].y)
    for (const who of out) this.drawBig(ctx, play, who, this.seen[who], won, t, k, left)
    this.drawSnacks(ctx, play)
    for (const b of this.bits) for (let i = 0; i < 3; i++) stamps.stamp(ctx, DOT.leaf, b.x + (i - 1) * 40 * b.t, b.y - Math.sin(b.t * 5) * 26 - i * 3, b.t * (4 + i), 0.6 * (1 - b.t))
    if (play.held?.kind === 'animal') this.drawBig(ctx, play, play.held.who, this.seen[play.held.who], [], 0, 0)
    if (won.length) this.drawWeather(ctx, play, won, t, k)
    this.drawGuide(ctx, play, guidance)
  }

  /** Everything is ready for the bell: it stirs by itself until it is rung. */
  private drawBell(ctx: Ctx, next: boolean): void {
    if (next) {
      this.stamps.stamp(ctx, GLOW, BELL.x, BELL.y, 0, 1 + Math.sin(this.time * 5) * 0.05)
    }
    ctx.save()
    ctx.translate(BELL_BEAM.x, BELL_BEAM.y)
    ctx.rotate(ring(this.bell, 9, 1.6) * 0.6 + Math.sin(this.time * (next ? 5 : 0.9)) * (next ? 0.11 : 0.02))
    this.stamps.stamp(ctx, BELL_SPRITE, 0, BELL.y - BELL_BEAM.y)
    ctx.restore()
  }

  private drawMole(ctx: Ctx, play: Play, won: readonly Thing[], t: number, k: number, left: readonly Thing[]): void {
    const { stamps } = this
    let y = 6 + ring(this.mole, 16, 4) * -14 + Math.sin(this.time * 1.3) * 1.5, rot = 0, lid = this.time % 4.1 < 0.14 ? 0 : 1
    let mouth: Mouth = 'smile'
    if (won.includes('dance')) { rot = Math.sin(t * 6) * 0.2 * k; y -= Math.abs(Math.sin(t * 6)) * 10 * k }
    if (won.includes('sleep') && k > 0.3) { lid = 0; mouth = 'round'; y += 10 * k }
    if (won.includes('fly')) y -= 30 * k + Math.sin(t * 2) * 8 * k
    if (won.includes('bath') || won.includes('mud')) { mouth = won.includes('sleep') ? mouth : 'open'; rot += Math.sin(t * 11) * 0.06 * k }
    if (this.wishSwap < 1.6) { y -= Math.abs(Math.sin(this.wishSwap * 14)) * 12; mouth = 'open' }
    const tied = play.show && play.show.t < play.show.tallAt && play.show.t > 0
    if (tied) mouth = 'round'
    ctx.save()
    ctx.beginPath()
    ctx.rect(MOLE.x - 90, MOLE.y - 130, 180, 130 + 56)
    ctx.clip()
    ctx.translate(MOLE.x, MOLE.y + y)
    ctx.rotate(rot)
    const s = 1 + ring(this.mole) * 0.1
    ctx.scale(1 / s, s)
    if (won.includes('fly') && k > 0.1) stamps.stamp(ctx, BALLOON[1], 34, -86 * k, 0.2, 0.62 * k)
    stamps.stamp(ctx, MOLE_SPRITE)
    drawEyes(ctx, stamps, MOLE_EYES, play.hand ? clampUnit(play.hand.x - MOLE.x) : -0.4, play.hand ? clampUnit(play.hand.y - MOLE.y) : 0.4, this.moleWith?.snack === 'bun' ? 0.5 : lid)
    drawMouth(ctx, stamps, MOLE_FACE.mouth, this.moleWith?.snack === 'carrot' ? (Math.sin(this.time * 20) > 0 ? 'open' : 'line') : mouth)
    const wet = won.length && k > 0.2 ? won : left
    if (wet.includes('mud')) { stamps.stamp(ctx, DOT.mud, -24, -32, 0, 0.8); stamps.stamp(ctx, DOT.mud, 30, 6, 1, 0.7) }
    if (wet.includes('bath')) stamps.stamp(ctx, wet.includes('mud') ? DOT.fizz : DOT.foam, 4, -54)
    if (this.moleWith) {
      const { snack, t: w } = this.moleWith, at = snack === 'cheese' ? { x: 0, y: 4 } : snack === 'bun' ? { x: 0, y: 40 } : { x: 8, y: 26 }
      stamps.stamp(ctx, SNACK_ART[snack], at.x, at.y + Math.sin(w * 9) * 3, 0, 0.6)
    }
    ctx.restore()
    // The board in its paws.
    const asked = play.show && !(play.show.result.met && play.show.into >= MET_AT) ? play.show.result.before.position : play.town.position
    const wish = wishAt(asked).wish, by = BOARD.y + ring(this.mole, 14, 5) * 5 - ring(this.wishSwap, 12, 3) * 16 + Math.sin(this.time * 1.6) * 2
    // Still thinking of it, when something else has happened.
    const still = play.stale || (play.town.finished && !play.town.fresh && !play.show) ? Math.max(0, Math.sin(this.time * 3)) * 0.09 : 0
    stamps.stamp(ctx, BOARD_SPRITE, BOARD.x, by, 0, 1 + still)
    const n = wish.length, size = (n === 1 ? 0.88 : n === 2 ? 0.56 : 0.46) * (1 + still)
    const at = n === 1 ? [[0, 0]] : n === 2 ? [[-26, 0], [26, 0]] : [[-24, -20], [24, -20], [0, 22]]
    const turn = clamp(this.wishSwap / 0.3)
    wish.forEach((thing, i) => stamps.stamp(ctx, WISH_ART[thing], BOARD.x + at[i][0], by + at[i][1], 0, size * turn, size))
  }

  /** What won climbs from under its column onto the top of it, and stays there for as long as the vote is on the wall. */
  private crown = [0, 0, 0]
  private crownY = [0, 0, 0]
  private drawPlaque(ctx: Ctx, slot: number): void {
    const p = plaqueAt(slot), thing = this.ballot![slot]
    const flip = this.flip[slot] < 0.4 ? Math.abs(Math.cos((this.flip[slot] / 0.4) * Math.PI)) : 1
    const c = this.crown[slot], swell = Math.sin(clamp(c) * Math.PI) * 0.35
    const k = 1 + ring(this.pushed.get(`plaque${slot}`) ?? LONG) * -0.1 + swell
    this.stamps.stamp(ctx, thing ? PLAQUES[thing] : SHUT, p.x, p.y + (this.crownY[slot] - p.y) * ease(clamp(c)), 0, Math.max(0.04, flip) * k, k)
  }

  private drawSquare(ctx: Ctx, play: Play, who: Animal, s: Seen, col: number): void {
    const c = { x: s.x, y: s.y - CELL / 2 }
    const squash = ring(s.landed, 20, 6) * 0.16 + ring(s.poked, 24, 7) * -0.14, hop = s.hopped < 0.34 ? Math.sin((s.hopped / 0.34) * Math.PI) : 0
    const puff = this.tall.cols.includes(col) && this.tall.t < 0.7 ? Math.sin((this.tall.t / 0.7) * Math.PI) * 0.1 : 0
    ctx.save()
    ctx.translate(c.x, c.y + CELL / 2 - hop * 12)
    ctx.scale(SQUARE_SCALE * (1 + squash * 0.7 + puff), SQUARE_SCALE * (1 - squash + hop * 0.06 + puff))
    ctx.translate(0, -CELL / 2 / SQUARE_SCALE)
    this.stamps.stamp(ctx, SQUEEZED[this.coat(play, who)][who])
    const f = FACES[who].square
    drawEyes(ctx, this.stamps, EYES[who].square, s.gx, s.gy, s.landed < 0.25 ? 0.4 : 1)
    const mouth: Mouth = hop > 0.1 || s.poked < 0.3 ? 'open' : s.landed < 0.35 ? 'wave' : s.eating < 0.8 ? 'open' : who === 'cat' || who === 'goat' ? 'line' : who === 'elephant' ? 'wave' : 'smile'
    drawMouth(ctx, this.stamps, f.mouth, mouth)
    ctx.restore()
  }

  private drawBig(ctx: Ctx, play: Play, who: Animal, s: Seen, won: readonly Thing[], t: number, k: number, left: readonly Thing[] = []): void {
    const { stamps } = this, f = FACES[who], spot = SPOTS[who]
    const settled = s.place.kind === 'ground' && !s.hop
    const pose: Pose = poseOf(who, this.time, settled ? won : [], t, settled ? k : 0)
    const squash = ring(s.poked, 24, 7) * -0.12 + ring(s.landed, 18, 6) * 0.14
    const eat = s.eating < 1 ? Math.sin(s.eating * 22) * 0.5 + 0.5 : 0
    const acting = settled && won.length > 0 && k > 0.05
    const x = s.x + pose.x * s.s, y = s.y + pose.y * s.s
    // It leans to the picture it would run to.
    const lean = settled && !play.town.finished ? Math.sign(plaqueAt(choice(play.town, who)).x - s.x) * 0.05 : 0
    if (acting && won.includes('sleep')) stamps.stamp(ctx, PILLOW, s.x - spot.face * spot.w * 0.2, s.y, 0, k)
    if (acting && won.includes('mud')) stamps.stamp(ctx, PUDDLE, s.x, s.y, 0, k * (spot.w / 170), k * (spot.w / 130))
    if (settled && left.length) this.drawLeft(ctx, who, left)
    ctx.save()
    if (acting && won.includes('mud') && who === 'mouse' && !won.includes('fly')) {
      ctx.beginPath()
      ctx.rect(s.x - 300, s.y - 700, 600, 708)
      ctx.clip()
    }
    ctx.translate(x, y)
    if (pose.rot || s.swing) {
      // Turned about its middle.
      const mid = -spot.h * 0.45 * s.s
      ctx.translate(0, mid)
      ctx.rotate(pose.rot + s.swing + (s.cross < 0.6 ? Math.sin(s.cross * 40) * 0.1 : 0))
      ctx.translate(0, -mid)
    }
    ctx.scale(s.s * pose.sx * (1 + squash * 0.7), s.s * pose.sy * (1 - squash))
    const coat = this.coat(play, who)
    stamps.stamp(ctx, BODY[coat][who])
    ctx.translate(f.pivot.x + pose.hx, f.pivot.y + pose.hy + eat * 5 - (s.poked < 0.4 ? Math.sin((s.poked / 0.4) * Math.PI) * 8 : 0))
    ctx.rotate(pose.hr + lean + ring(s.spitting, 26, 5) * 0.25)
    stamps.stamp(ctx, HEAD[coat][who])
    const lid = s.cross < 0.5 ? 0.5 : s.place.kind === 'hand' ? 1 : pose.lid
    drawEyes(ctx, stamps, EYES[who].big, acting ? pose.gx || s.gx * 0.6 : s.gx, acting ? pose.gy || s.gy * 0.6 : s.gy, lid)
    drawMouth(ctx, stamps, f.mouth, s.poked < 0.35 ? 'open' : s.eating < 1 ? (eat > 0.5 ? 'open' : 'line') : s.spitting < 0.6 || s.cross < 0.6 ? 'frown' : s.place.kind === 'hand' ? 'round' : pose.mouth)
    ctx.restore()
    // What it would like, while it waits for its turn to be put up.
    if (settled && !play.town.finished && !play.show) {
      const thought = THOUGHTS[who], bob = Math.sin(this.time * 2.4 + spot.x) * 3
      stamps.stamp(ctx, WANT[play.town.ballot[choice(play.town, who)]!], thought.x, thought.y + bob, 0, 1 + ring(s.poked, 18, 5) * 0.2)
    }
    if (!acting) return
    if (won.includes('bath') && !(won.includes('fly') || won.includes('mud'))) stamps.stamp(ctx, TUB, s.x + pose.x * (won.includes('dance') ? 1 : 0.15), s.y + 4, won.includes('dance') ? pose.rot * 0.6 : 0, k * 0.8)
    else if (won.includes('bath') && !won.includes('fly')) stamps.stamp(ctx, TUB, s.x, s.y + 4, Math.sin(t * 22) * 0.02, k * 0.8)
    if (won.includes('mud') && won.includes('sleep') && !won.includes('fly')) stamps.stamp(ctx, PUDDLE, s.x, s.y - spot.h * 0.1, 0, (k * spot.w) / 190, k * Math.min(1.7, spot.h / 110))
    if (won.includes('fly')) {
      if (won.includes('bath')) stamps.stamp(ctx, BIG_BUBBLE, x, y - spot.h * 0.45, t * 0.3, (Math.max(spot.w, spot.h) / 270) * k)
      else stamps.stamp(ctx, who === 'elephant' ? TRIO : BALLOON[ANIMALS.indexOf(who) % 3], x, y - spot.h * s.s * (who === 'giraffe' ? 0.75 : 0.9) - 80, Math.sin(t * 2 + spot.x) * 0.1, 0.86 * k)
    }
  }

  /** What is left around somebody's feet when it is over. */
  private drawLeft(ctx: Ctx, who: Animal, left: readonly Thing[]): void {
    const { stamps } = this, s = SPOTS[who]
    if (left.includes('mud')) stamps.stamp(ctx, PUDDLE, s.x, s.y, 0, (s.w / 180) * 0.8, (s.w / 180) * 0.7)
    if (left.includes('bath')) stamps.stamp(ctx, left.includes('mud') ? DOT.fizz : DOT.foam, s.x - s.w * 0.45, s.y - 4, 0, 1)
    if (left.includes('dance')) stamps.stamp(ctx, DOT.leaf, s.x + s.w * 0.44, s.y + 2, 0.4)
    if (left.includes('fly')) stamps.stamp(ctx, BALLOON[ANIMALS.indexOf(who) % 3], s.x + s.face * s.w * 0.46, s.y - 16, Math.sin(this.time + s.x) * 0.15 + 1.3, 0.4)
    if (left.includes('sleep')) stamps.stamp(ctx, PILLOW, s.x - s.face * s.w * 0.3, s.y + 6, 0.1, 0.7)
  }

  private drawBasketBack(ctx: Ctx): void {
    this.stamps.stamp(ctx, BASKET_BACK, BASKET.x, BASKET.y)
  }
  private drawBasketFront(ctx: Ctx, play: Play): void {
    const p = this.pushed.get('basket') ?? LONG, k = ring(p) * 0.08, hidden = play.town.hidden !== null && !(play.town.finished && (!play.show || play.show.into >= 0))
    this.stamps.stamp(ctx, BASKET_FRONT, BASKET.x, BASKET.y, 0, 1 + k, 1 - k)
    if (!hidden) this.stamps.stamp(ctx, BASKET_LID, BASKET.x, BASKET.y - 66 - Math.max(0, ring(p, 14, 4)) * 26, ring(p, 14, 4) * 0.1)
  }

  private drawSnacks(ctx: Ctx, play: Play): void {
    if (!hasTools(play.town)) return
    for (const snack of SNACKS) {
      const art = SNACK_ART[snack], held = play.held?.kind === 'snack' && play.held.snack === snack
      const col = play.town.snacks[snack], home = SNACK_HOME[snack], to = col === null ? home : snackAt(snack, col)
      if (this.moleWith?.snack === snack) continue
      const fly = this.flying.find((f) => f.snack === snack)
      let at: Point = to, rot = 0, size = col === null ? 1 : 0.66
      if (held) { at = { x: this.lastHand.x, y: this.lastHand.y - 20 }; rot = Math.sin(this.time * 6) * 0.06; size = 1.1 } else if (fly) {
        const k = clamp(fly.t / fly.seconds)
        at = { x: fly.from.x + (to.x - fly.from.x) * ease(k), y: fly.from.y + (to.y - fly.from.y) * ease(k) - (fly.how === 'home' ? Math.abs(Math.sin(k * Math.PI * (snack === 'cheese' ? 3 : 2))) * 90 * (1 - k * 0.6) : Math.sin(k * Math.PI) * 60) }
        rot = fly.how === 'home' ? (1 - k) * (snack === 'carrot' ? 9 : snack === 'bun' ? 6 : 2) : 0
      }
      const fresh = this.pushed.get(`${snack}new`) ?? LONG
      const k = (fresh < 0.4 ? ease(fresh / 0.4) : 1) * size, q = ring(this.pushed.get(snack) ?? LONG) * 0.14
      this.snackAtLast[snack] = at
      this.stamps.stamp(ctx, art, at.x, at.y, rot, k * (1 + q), k * (1 - q))
    }
  }

  private drawWeather(ctx: Ctx, play: Play, won: readonly Thing[], t: number, k: number): void {
    const { stamps } = this, has = (x: Thing) => won.includes(x)
    if (has('sleep')) for (const who of here(play.town)) {
      if (stamps.count >= DRAW_LIMIT - 4) break
      // A breath that grows at the nose and goes.
      const b = (t * 0.6 + ANIMALS.indexOf(who) * 0.17) % 1, s = SPOTS[who], f = FACES[who], seen = this.seen![who], pose = poseOf(who, this.time, won, t, k)
      stamps.stamp(ctx, has('bath') ? DOT.bubble : DOT.foam, seen.x + pose.x + f.pivot.x * 0.6 + s.face * (24 + b * 30), seen.y + pose.y + f.pivot.y * 0.9 - b * (has('fly') ? 20 : 60), 0, (has('bath') ? 0.7 : 0.6) * b * k)
    }
    const kinds: { s: Sprite; how: 'rise' | 'burst' | 'fall' | 'swirl' }[] = []
    if (has('bath') && has('mud')) kinds.push({ s: DOT.fizz, how: 'rise' })
    else if (has('bath')) kinds.push({ s: DOT.foam, how: 'rise' })
    if (has('mud') && has('fly')) kinds.push({ s: DOT.drip, how: 'fall' })
    if (has('mud')) kinds.push({ s: DOT.mud, how: 'burst' })
    if (has('dance')) kinds.push({ s: DOT.leaf, how: 'swirl' })
    if (!kinds.length) return
    const people = here(play.town), room = Math.min(22, DRAW_LIMIT - 2 - stamps.count)
    for (let i = 0; i < room; i++) {
      const { s, how } = kinds[i % kinds.length], who = people[i % people.length], spot = SPOTS[who], seed = (i * 0.618) % 1
      const u = (t * (0.45 + seed * 0.4) + seed) % 1, spread = (((i * 0.37) % 1) - 0.5) * spot.w
      let x = spot.x + spread, y = spot.y, size = 1
      if (how === 'rise') { y -= u * (has('mud') ? 380 : 260); x += Math.sin(u * 9 + i) * 14; size = 0.5 + seed * 0.6 * (1 - u) }
      else if (how === 'burst') { const p = has('dance') ? 620 : 240; x += spread * 2.4 * u; y -= Math.sin(u * Math.PI) * p * (0.5 + seed * 0.5); size = 1 - u * 0.4 }
      else if (how === 'fall') { y = this.seen![who].y - 240 + u * 240; size = 0.9 }
      else { x += Math.cos(u * 8 + i) * 60; y -= 40 + u * 180; size = 0.9 }
      stamps.stamp(ctx, s, x, y, u * 5 + i, size * k)
    }
  }

  private drawGuide(ctx: Ctx, play: Play, guidance: Guidance | null): void {
    if (!guidance || (guidance.glow <= 0 && guidance.demo === null)) return
    const hint = hintFor(play, Math.max(0, guidance.demoIndex))
    if (!hint) return
    if (guidance.glow > 0) {
      ctx.strokeStyle = `rgba(255,236,170,${(guidance.glow * (0.6 + Math.sin(this.time * 3) * 0.2)).toFixed(3)})`
      ctx.lineWidth = 9
      ctx.beginPath()
      ctx.ellipse(hint.from.x, hint.from.y, hint.r, hint.r, 0, 0, Math.PI * 2)
      ctx.stroke()
      this.stamps.count++
    }
    if (guidance.demo === null) return
    const pose = handPose(guidance.demo, hint.to !== null, this.hand)
    const x = hint.from.x + ((hint.to?.x ?? hint.from.x) - hint.from.x) * pose.travel, y = hint.from.y + ((hint.to?.y ?? hint.from.y) - hint.from.y) * pose.travel
    ctx.globalAlpha = pose.opacity
    this.stamps.stamp(ctx, GHOST, x, y + 8 - pose.press * 8, 0, 1.1 - pose.press * 0.12)
    ctx.globalAlpha = 1
  }
}
const clampUnit = (v: number) => Math.max(-1, Math.min(1, v / 200))
