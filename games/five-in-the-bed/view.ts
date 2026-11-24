import { actOf, still as neutral, type Pose } from './acts'
import { BED, FIVE, R, SIDES, sideOf, type Side } from './bed'
import { actNow, asker, askers, burpAt, dealAt, hidden, milkOut, MILK, type Event, type Game } from './game'
import { handPose, type Guidance, type HandPose } from './guidance'
import { hintFor, roomiest, type Hint } from './guide'
import type { Note } from './audio'
import type { Point } from './input'
import { CRATE, DOG, HALF, MOUSE, QUILT, SHELF, bottleAt, hemAt } from './layout'
import type { Milk, Straw } from './milk'
import { C, OWN, Stamps, box, disc, type Ctx, type Make } from './paint'
import type { Play, Poke } from './play'
import { BUBBLE, BULGE, CLOTH, CRATE_BOX, DOG_BODY, DOG_EAR, DOG_HEAD, DOG_LYING, DROP, FEATHER, GHOST, HALO, HEADBOARD, HEM, HOLE, MOUSE_HEAD, NAP, PILLOW, PROP_SPRITES, PUFF, ROLL, TONGUE, bottle } from './props'
import { paintRug } from './rug'
import { DUMMY, FACING, MASK, SHEEP_SPRITES, righted, rolled, shadow, sheep, turned, type Look, type Turn } from './sheep'
import { BARK, DRIP, SNEEZE } from './voices'

// Draws the bed from the rules, and keeps what is only to be seen: which way
// each ball is turned, springs, straws on their way, brushed pile. Nothing here
// is saved and nothing here decides anything.

/** The most pictures one frame may stamp. */
export const STAMP_LIMIT = 80
const LONG = 99

type Seen = { turn: Turn; x: number; y: number; squash: number; squashV: number; gaze: Point; blink: number; bob: number; bleat: number; worn: number; called: number; caught: number; burp: number; poked: number }
type Fleck = { kind: 'puff' | 'drop' | 'nap'; x: number; y: number; t: number; lasts: number; size: number }

const ease = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k) }
/** A push that rings down. */
export const ring = (t: number, rate = 20, fall = 5): number => (t > 2 ? 0 : Math.exp(-t * fall) * Math.sin(t * rate))

/** How high one is drawn off the mattress: under the quilt it goes low, so that it goes in at the side. */
export function seenHeight(g: Game, who: number): number {
  const s = g.bed.sheep[who], q = g.save.quilt
  if (!q || s.z === 0) return s.z * 0.55
  const out = (q === 'left' ? s.x - BED.crest : BED.crest - s.x) / 150
  return s.z * 0.55 * Math.min(1, Math.max(0, out))
}

/** The end of a straw that has nobody. */
function dangle(b: { x: number; y: number }, towards: number, time: number, i: number): Point {
  return { x: b.x + Math.sin(time * 2 + i) * 8 + Math.sign(towards) * 46, y: b.y + 104 }
}

const CRATED = [[3, -25, -14], [4, 25, -14], [0, -50, 16], [1, 0, 16], [2, 50, 16]] as const

export class View {
  readonly stamps = new Stamps()
  private rug: { canvas: CanvasImageSource; x: number; y: number; w: number; h: number } | null = null
  private time = 0
  private readonly seen: Seen[] = Array.from({ length: FIVE }, (_, i) => ({ turn: FACING, x: NaN, y: NaN, squash: 0, squashV: 0, gaze: { x: 0, y: 0 }, blink: 1 + i * 0.9, bob: LONG, bleat: LONG, worn: LONG, called: LONG, caught: LONG, burp: LONG, poked: LONG }))
  private readonly cover: Record<Side, number> = { left: -1, right: -1 }
  private readonly pushed = new Map<string, number>()
  private readonly flecks: Fleck[] = []
  private strawK = 0
  private lastStraws: Straw[] | null = null
  /** Where the end of each straw has got to. */
  private readonly ends: (Point | null)[] = Array.from({ length: FIVE }, () => null)
  private home = LONG
  private homeMilk: Milk | null = null
  private lastMilk: Milk | null = null
  private dogAt = 0
  private dogSide: Side = 'left'
  private dogTurn = 0
  private mouseX = 0
  private sneeze = LONG
  private drip = 0
  private drips = 0
  /** Where the straws hang that have nobody. */
  loose: Point[] = []
  private poses: Pose[] = []
  sounds: Note[][] = []
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  /** The still part, for a surface of this size. `scale` is device pixels to a stage unit, for the rug and for the toys. */
  sized(make: Make, scale: number, toys: number, x: number, y: number, w: number, h: number): void {
    const made = make(Math.max(1, Math.ceil(w * scale)), Math.max(1, Math.ceil(h * scale)))
    made.ctx.scale(scale, scale)
    made.ctx.translate(-x, -y)
    paintRug(made.ctx, x, y, w, h)
    this.rug = { canvas: made.canvas, x, y, w, h }
    this.stamps.at(toys)
    for (const s of SHEEP_SPRITES) this.stamps.warm(s)
    for (const s of PROP_SPRITES) this.stamps.warm(s)
  }

  private push(key: string): void { this.pushed.set(key, 0) }
  private since(key: string): number { return this.pushed.get(key) ?? LONG }

  poke(p: Poke): void {
    const k = p.thing.kind
    if (k === 'rug' || k === 'mattress') {
      this.fleck('nap', p.at.x, p.at.y, 1)
      if (!p.slide) this.fleck('puff', p.at.x, p.at.y, 1)
      if (k === 'mattress' && !p.slide && p.near !== null) { this.seen[p.near].bob = 0; this.seen[p.near].squashV += 3 }
    }
    if (k === 'ridge') { this.push('ridge'); this.pushed.set('ridgeY', p.at.y); if (p.slide) this.fleck('nap', p.at.x, p.at.y, 0.7) }
    if (k === 'hidden') { this.fleck('puff', p.at.x, p.at.y, 0.6); this.push('pat'); if (p.near !== null) this.seen[p.near].poked = 0 }
    if (p.thing.kind === 'hem' || p.thing.kind === 'roll') this.push(`${k}${p.thing.side}`)
    if (k === 'straw') this.push('straw')
    if (p.thing.kind === 'bottle') this.push(`bottle${p.thing.index}`)
    if (k === 'dog') this.push('dog')
    if (k === 'crate') this.push('crate')
    if (k === 'mouse') this.push('mouse')
    if (p.thing.kind === 'sheep' && p.second) this.seen[p.thing.who].squashV += 5
  }

  notice(e: Event, g: Game): void {
    switch (e.type) {
      case 'bump': {
        const b = e.bump, s = this.seen[b.with]
        if (b.what === 'sheep') { s.squashV += Math.min(6, b.speed / 110); this.seen[b.who].squashV += Math.min(3, b.speed / 220); if (e.hidden) s.poked = 0 }
        if (b.what === 'land') { this.seen[b.who].squashV += 8; if (!e.hidden) for (const d of [-1, 1]) this.fleck('puff', b.at.x + d * 46, b.at.y + 34, 0.9); if (e.hidden) this.seen[b.who].poked = 0; this.shake() }
        if (b.what === 'wall' && b.wall === 'top') { this.shake(); if (b.speed > 320) this.push('mouse') }
        if (b.what === 'wall' && b.speed > 700 && b.wall === 'left' && this.since('dog') > 1) { this.push('dog'); this.sounds.push(BARK) }
        if (b.what === 'ridge') { this.push('ridge'); this.pushed.set('ridgeY', b.at.y) }
        break
      }
      case 'squash': this.seen[e.who].squashV += 7; this.seen[e.who].bleat = 0; if (e.hidden) this.seen[e.who].poked = 0; break
      case 'call': this.seen[e.who].called = 0; this.seen[e.who].bleat = 0; if (e.hidden) this.seen[e.who].poked = 0; break
      case 'bleat': this.seen[e.who].bleat = 0; this.seen[e.who].squashV += 2.5; break
      case 'burp': this.seen[e.who].burp = 0; this.seen[e.who].squashV += 5; break
      case 'caught': this.seen[e.who].caught = 0; break
      case 'worn': this.seen[e.who].worn = 0; break
      case 'bottlesHome': this.home = 0; this.homeMilk = this.lastMilk; break
      case 'bottleOut': this.push(`out${e.index}`); this.push('dog'); break
      case 'quilt': this.push('flump'); if (e.up) { this.sneeze = -1.4; this.push('snuffle') } break
      case 'dogIn': this.dogSide = g.dogIn ?? this.dogSide; break
      default: break
    }
  }

  private shake(): void { this.push('shelf') }
  private fleck(kind: Fleck['kind'], x: number, y: number, size: number): void {
    const lasts = kind === 'nap' ? 2.6 : kind === 'puff' ? 0.5 : 0.55
    const same = this.flecks.filter((f) => f.kind === kind)
    if (same.length >= (kind === 'nap' ? 14 : 5)) this.flecks.splice(this.flecks.indexOf(same[0]), 1)
    this.flecks.push({ kind, x, y, t: 0, lasts, size })
  }

  advance(play: Play, dt: number): void {
    const g = play.game
    this.time += dt
    for (const [k, v] of this.pushed) if (k !== 'ridgeY') this.pushed.set(k, v + dt)
    this.home += dt
    for (let i = this.flecks.length - 1; i >= 0; i--) if ((this.flecks[i].t += dt) > this.flecks[i].lasts) this.flecks.splice(i, 1)
    for (const side of SIDES) {
      const to = play.hem?.side === side ? play.hem.k : play.hem && play.hem.k > 0.05 && g.save.quilt === side ? 1 - play.hem.k : g.save.quilt === side ? 1 : 0
      if (this.cover[side] < 0) this.cover[side] = to
      else this.cover[side] += (to - this.cover[side]) * (1 - Math.exp(-dt * (play.hem ? 30 : 11)))
    }
    const milk = milkOut(g)
    if (milk) this.lastMilk = milk
    const straws = g.scene?.kind === 'milk' ? g.scene.straws : g.straws
    if (straws) this.lastStraws = straws
    this.strawK = Math.min(1, Math.max(0, this.strawK + (straws ? dt * 2.6 : -dt * 6)))
    if (straws && milk) for (const s of straws) {
      const to = this.strawEnd(g, milk, s), from = this.ends[s.bottle] ?? { x: to.x, y: SHELF.y + 16 }
      const k = 1 - Math.exp(-dt * (s.who === null ? 9 : 16))
      this.ends[s.bottle] = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }
    } else if (this.strawK <= 0) this.ends.fill(null)
    const asking = askers(g)
    const act = actNow(g)
    this.seen.forEach((v, i) => {
      const s = g.bed.sheep[i]
      if (Number.isNaN(v.x)) { v.x = s.x; v.y = s.y }
      const dx = s.x - v.x, dy = s.y - v.y
      v.x = s.x
      v.y = s.y
      const held = g.bed.held?.who === i
      const speed = dt > 0 ? Math.hypot(dx, dy) / dt : 0
      v.turn = rolled(v.turn, dx, dy)
      if (!s.leap && !held) v.turn = righted(v.turn, 1 - Math.exp(-dt * (speed < 60 ? 5 : speed < 200 ? 1.4 : 0)))
      if (speed > 240 && !s.leap && Math.hypot(dx, dy) > 0 && Math.floor(this.time * 12) % 3 === i % 3) this.fleck('nap', s.x - dx, s.y + 40, 0.8)
      v.squashV += (-v.squash * 260 - v.squashV * 13) * dt
      v.squash = Math.max(-0.8, Math.min(1.4, v.squash + v.squashV * dt * 3))
      v.blink -= dt
      if (v.blink < -0.13) v.blink = 1.7 + ((i * 1.37 + this.time) % 2.9)
      v.bob += dt; v.bleat += dt; v.worn += dt; v.called += dt; v.caught += dt; v.burp += dt; v.poked += dt
      const to = this.lookAt(g, i, play.finger, asking, act)
      const d = Math.hypot(to.x - s.x, to.y - s.y)
      const reach = Math.min(1, d / 110)
      const want = d < 1 ? { x: 0, y: 0 } : { x: ((to.x - s.x) / d) * reach, y: ((to.y - s.y) / d) * reach }
      const k = 1 - Math.exp(-dt * (i === 1 || i === 2 ? 12 : i === 0 ? 4 : 7))
      v.gaze.x += (want.x - v.gaze.x) * k
      v.gaze.y += (want.y - v.gaze.y) * k
    })
    this.dogAt = Math.min(1, Math.max(0, this.dogAt + (g.dogIn ? dt / 1.1 : -dt / 0.5)))
    if (g.dogIn) this.dogSide = g.dogIn
    const watch = play.finger ? play.finger.x : milk || this.time % 5 < 2.5 ? HALF[roomiest(g)].mid : DOG.x
    this.dogTurn += (Math.max(-1, Math.min(1, (watch - DOG.x) / 600)) - this.dogTurn) * (1 - Math.exp(-dt * 4))
    const mx = play.finger && play.finger.x > 950 && play.finger.y < 320 ? Math.max(-14, Math.min(14, (play.finger.x - MOUSE.x) * 0.2)) : Math.sin(this.time * 0.8) * 4
    this.mouseX += (mx - this.mouseX) * (1 - Math.exp(-dt * 8))
    const was = this.sneeze
    this.sneeze += dt
    if (was < 0 && this.sneeze >= 0) this.sounds.push(SNEEZE)
    if (g.straws && asking.length && !g.scene) {
      this.drip -= dt
      if (this.drip <= 0) {
        this.drip = 1.5
        const loose = g.straws.find((x) => x.who === null)
        if (loose && g.save.milk) {
          const e = this.strawEnd(g, g.save.milk, loose)
          this.fleck('drop', e.x, e.y + 6, 1)
          if (this.drips++ < 3) this.sounds.push(DRIP)
        }
      }
    } else { this.drip = 0.7; this.drips = 0 }
    this.loose = g.straws && milk ? g.straws.filter((x) => x.who === null).map((x) => this.ends[x.bottle] ?? this.strawEnd(g, milk, x)) : []
  }

  private bottleFoot(milk: Milk, i: number): Point {
    const b = milk[i]
    return bottleAt(b.side, b.slot, milk.filter((x) => x.side === b.side).length)
  }
  private strawEnd(g: Game, milk: Milk, s: Straw): Point {
    const foot = this.bottleFoot(milk, s.bottle), b = milk[s.bottle]
    if (s.who !== null) {
      const at = g.bed.sheep[s.who]
      if (hidden(g, s.who)) return { x: foot.x + (at.x - foot.x) * 0.3, y: QUILT.hem + 6 }
      // The mouth of one that is turned away cannot be reached: the end waits over its head.
      return turned(this.seen[s.who].turn, [0, 0.36, 0.93])[2] > 0.35 ? { x: at.x, y: at.y + 27 } : { x: at.x, y: at.y - R - 24 }
    }
    // It leans toward whoever could have it.
    const want = b.owner ?? askers(g).find((i) => sideOf(g.bed.sheep[i].x) !== b.side)
    const to = want === undefined ? 0 : g.bed.sheep[want].x - foot.x
    const end = dangle({ x: foot.x, y: SHELF.y + 12 }, Math.abs(to) > 60 ? to : 0, this.time, s.bottle)
    // It stays over its own half, clear of a quilt over the other.
    const h = HALF[b.side]
    return { x: Math.max(h.left + 44, Math.min(h.right - 44, end.x)), y: end.y }
  }

  private lookAt(g: Game, i: number, finger: Point | null, asking: number[], act: ReturnType<typeof actNow>): Point {
    const me = g.bed.sheep[i]
    if (finger && g.bed.held?.who !== i) return finger
    if (act && !act.cast.includes(i)) {
      const c = act.cast[0]
      return g.bed.sheep[c]
    }
    const milk = g.save.milk
    if (asking.length && g.straws && milk) {
      const mine = g.straws.find((x) => x.who === null && milk[x.bottle].owner === i)
      const loose = mine ?? g.straws.find((x) => x.who === null && (milk[x.bottle].owner === null))
      if (asking.includes(i)) return loose ? this.strawEnd(g, milk, loose) : { x: me.x, y: 100 }
      // Now and then the rest look at the one without.
      if ((this.time + i) % 4 < 2.2) return g.bed.sheep[asking[0]]
      return { x: me.x, y: me.y - 200 }
    }
    if (milk && !g.scene) return { x: me.x * 0.8 + HALF[sideOf(me.x)].mid * 0.2, y: 130 }
    const a = this.time * (0.3 + i * 0.07) + i * 2
    return { x: me.x + Math.cos(a) * 90, y: me.y + Math.sin(a * 1.3) * 70 }
  }

  private poseOf(_g: Game, i: number): Pose { return this.poses[i] }
  private makePose(g: Game, i: number): Pose {
    const act = actNow(g), v = this.seen[i]
    let p = neutral()
    // Breathing, each at its own pace.
    p.wide = 1 + 0.02 * Math.sin(this.time * [1.5, 2.6, 3.4, 1.9, 2.9][i] + i)
    p.tipY = 0.05 * Math.sin(this.time * [0.6, 1.4, 1.9, 0.8, 2.3][i] + i * 2)
    if (g.asleep) p.wide = 1 + 0.05 * Math.sin(this.time * [1.6, 2.2, 3, 1.9, 2.5][i] + i)
    if (act && act.cast.includes(i) && act.t < actOf(act.cast).lasts) p = { ...actOf(act.cast).pose(act.t, act.cast.indexOf(i)) }
    else if (act) p.eyes = act.t > 0.4 && act.t < actOf(act.cast).lasts * 0.5 ? 'open' : 'wide'
    if (askers(g).includes(i)) {
      // It wants to be over there: it hops and leans to the straw that has nobody, and falls back.
      const u = (this.time * 0.8 + i * 0.37) % 1, b = u < 0.45 ? Math.sin((u / 0.45) * Math.PI) : 0
      const k = asker(g) === i ? 1 : 0.25
      p.lift += 40 * b * k
      p.tipY += (sideOf(g.bed.sheep[i].x) === 'left' ? 0.5 : -0.5) * b * k
      p.feet = b * k
    }
    if (g.scene?.kind === 'milk' && g.scene.t < MILK.drain) this.drinkPose(p, i, g.scene.t)
    if (v.bleat < 0.45) p.mouth = Math.max(p.mouth, Math.sin((v.bleat / 0.45) * Math.PI))
    if (v.burp < 0.4) { p.mouth = Math.max(p.mouth, Math.sin((v.burp / 0.4) * Math.PI)); p.eyes = 'squint' }
    if (v.bob < 0.5) p.lift += 34 * Math.sin((v.bob / 0.5) * Math.PI)
    if (v.called < 1.1) { p.lift += 80 * Math.abs(Math.sin(v.called * 5.7)) * (1 - v.called / 1.1); p.eyes = 'wide'; p.feet = 1 }
    if (v.worn < 1.4) { p.lift += 26 * Math.abs(Math.sin(v.worn * 6)) * (1 - v.worn / 1.4); p.eyes = 'wide' }
    if (v.caught < 1.6) { p.eyes = 'wide'; p.mouth = 0; p.wide = 0.94 }
    if (g.bed.sheep[i].leap) { p.eyes = i === 4 ? 'squint' : 'wide'; p.mouth = Math.max(p.mouth, i === 1 ? 0 : 0.6); p.feet = 1 }
    if (g.bed.held?.who === i) { p.eyes = i === 4 ? 'squint' : 'wide'; p.feet = 0.8 }
    return p
  }

  /** Each drinks in its own way. */
  private drinkPose(p: Pose, i: number, t: number): void {
    const k = ease(t / 0.5)
    if (i === 0) { p.wide = 1 - 0.07 * k + 0.16 * ease((t - 1) / 1); p.eyes = 'shut' }
    else if (i === 1) { p.wide = 1 + 0.04 * Math.sign(Math.sin(t * 12)) * k; p.eyes = 'squint' }
    else if (i === 2) { const u = (t * 1.7) % 1; p.lift = u < 0.25 ? 26 * Math.sin((u / 0.25) * Math.PI) : 0; p.eyes = u < 0.25 ? 'wide' : 'open' }
    else if (i === 3) { p.spin = 0.5 * Math.sin(t * 3) * k; p.eyes = 'shut' }
    else { p.wide = 1 + 0.14 * Math.abs(Math.sin(t * 5)) * k; p.eyes = 'squint' }
  }

  draw(ctx: Ctx, play: Play | null, g: Game, guidance: Guidance | null): void {
    const st = this.stamps
    st.stamped = 0
    this.poses = g.bed.sheep.map((_, i) => this.makePose(g, i))
    if (!this.rug) return
    ctx.drawImage(this.rug.canvas, this.rug.x, this.rug.y, this.rug.w, this.rug.h)
    st.stamped++
    for (const f of this.flecks) if (f.kind === 'nap') { ctx.globalAlpha = Math.min(1, (1 - f.t / f.lasts) * 1.6); st.stampAt(ctx, NAP, f.x, f.y, 0, f.size) }
    ctx.globalAlpha = 1
    this.ridge(ctx)
    this.headboard(ctx, g)
    this.strawsDown(ctx, g, 'behind')
    this.dogAndCrate(ctx, g)
    const order = g.bed.sheep.map((_, i) => i).sort((a, b) => this.level(g, a) - this.level(g, b))
    for (const i of order) if (!this.under(g, i)) shadow(ctx, st, g.bed.sheep[i].x, g.bed.sheep[i].y, seenHeight(g, i) + this.poseLift(g, i))
    if (this.dogAt > 0) this.dogInBed(ctx)
    for (const i of order) if (!this.under(g, i)) this.oneSheep(ctx, g, i)
    this.strawsDown(ctx, g, 'head')
    this.quilt(ctx, g)
    this.strawsDown(ctx, g, 'quilt')
    this.actProps(ctx, g)
    for (const f of this.flecks) {
      const k = f.t / f.lasts
      if (f.kind === 'puff') { ctx.globalAlpha = 1 - k; st.stampAt(ctx, PUFF, f.x, f.y - k * 20, k, f.size * (0.7 + k)); ctx.globalAlpha = 1 }
      if (f.kind === 'drop') st.stampAt(ctx, DROP, f.x, f.y + k * k * 90, 0, k > 0.85 ? 1.3 : 1, k > 0.85 ? 0.4 : 1)
    }
    if (guidance) this.guide(ctx, play?.game ?? g, guidance)
  }

  private under(g: Game, i: number): boolean {
    // Wholly under the cloth; one that is half in is drawn and the cloth lies over it.
    const q = g.save.quilt
    if (!q || this.cover[q] < 0.96) return false
    const s = g.bed.sheep[i]
    return q === 'left' ? s.x < BED.crest - R - 6 : s.x > BED.crest + R + 6
  }
  private poseLift(g: Game, i: number): number { return this.poseOf(g, i).lift }
  private level(g: Game, i: number): number {
    const s = g.bed.sheep[i]
    return s.y + (s.leap ? 2000 : 0) + (g.bed.held?.who === i ? 1000 : 0) + (this.poseLift(g, i) > 1 ? 400 : 0)
  }

  private oneSheep(ctx: Ctx, g: Game, i: number): void {
    const s = g.bed.sheep[i], v = this.seen[i], p = { ...this.poseOf(g, i) }
    p.lift += seenHeight(g, i)
    const act = actNow(g)
    const asking = askers(g).includes(i) && !hidden(g, i)
    const props = act && act.cast.includes(i) && act.t < actOf(act.cast).lasts ? actOf(act.cast).props(act.t, this.places(g, act.cast)) : []
    const bare = (i === 2 && props.some((x) => x.kind === 'dummy')) || (i === 3 && props.some((x) => x.kind === 'mask'))
    const joined = this.strawK > 0.8 && !!(g.scene?.kind === 'milk' ? g.scene.straws : g.straws)?.some((x) => x.who === i) && !(g.scene?.kind === 'milk' && g.scene.t > MILK.drain)
    const look: Look = { gaze: v.gaze, blink: v.blink < 0, asleep: g.asleep, thirsty: asking, drinking: joined ? 1 : 0, bare, squash: v.squash, fed: g.asleep || (g.scene?.kind === 'milk' && g.scene.t > MILK.drain), time: this.time }
    sheep(ctx, this.stamps, i, s.x, s.y, v.turn, p, look)
  }

  private places(g: Game, cast: number[]): Point[] { return cast.map((i) => ({ x: g.bed.sheep[i].x, y: g.bed.sheep[i].y })) }

  private actProps(ctx: Ctx, g: Game): void {
    const act = actNow(g), st = this.stamps
    if (act && act.t < actOf(act.cast).lasts && act.cast.some((i) => !hidden(g, i))) {
      for (const x of actOf(act.cast).props(act.t, this.places(g, act.cast))) {
        ctx.globalAlpha = Math.max(0, x.alpha)
        st.stampAt(ctx, { feather: FEATHER, bubble: BUBBLE, dummy: DUMMY, mask: MASK, pillow: PILLOW, puff: PUFF }[x.kind], x.x, x.y, x.turn, x.size)
      }
      ctx.globalAlpha = 1
    }
    if (g.asleep) for (const i of [0, 3]) {
      if (hidden(g, i)) continue
      const k = (this.time * 0.35 + i * 0.4) % 1, s = g.bed.sheep[i]
      ctx.globalAlpha = k < 0.9 ? 1 : 0
      st.stampAt(ctx, BUBBLE, s.x + 16, s.y + 10 - k * 14, 0, 0.2 + k * 0.7)
      ctx.globalAlpha = 1
    }
  }

  private ridge(ctx: Ctx): void {
    // The sewn rib wobbles where it was plucked.
    const t = this.since('ridge')
    if (t > 1) return
    const y = this.pushed.get('ridgeY') ?? 440
    ctx.lineCap = 'round'
    for (const [w, c] of [[26, '#a8623e'], [12, '#dd9a70']] as const) {
      ctx.strokeStyle = c
      ctx.lineWidth = w
      ctx.beginPath()
      for (let k = 0; k <= 24; k++) {
        const yy = BED.top + 14 + (k / 24) * (BED.bottom - BED.top - 28)
        const near = Math.exp(-(((yy - y) / 150) ** 2)) * Math.sin((k / 24) * Math.PI)
        ctx.lineTo(BED.crest - (w < 20 ? 4 : 0) + ring(t, 34, 4) * 20 * near, yy)
      }
      ctx.stroke()
    }
  }

  private headboard(ctx: Ctx, g: Game): void {
    const st = this.stamps, jolt = ring(this.since('shelf'), 40, 7)
    st.stampAt(ctx, HEADBOARD, 0, jolt * 3)
    // The mouse in her hole.
    const m = this.since('mouse'), gone = m < 1.1 ? ease(1 - Math.abs(m - 0.5) / 0.55) : 0
    const wants = milkOut(g) !== null
    st.stampAt(ctx, HOLE, MOUSE.x, MOUSE.y + 4)
    ctx.save()
    ctx.beginPath()
    ctx.rect(MOUSE.x - 40, MOUSE.y - 60, 80, 99)
    ctx.clip()
    const sneeze = this.sneeze > 0 && this.sneeze < 0.4 ? Math.sin((this.sneeze / 0.4) * Math.PI) * 14 : 0
    const my = MOUSE.y + 8 + gone * 74 + sneeze, mx = MOUSE.x + this.mouseX
    if (wants && gone < 0.2) st.stampAt(ctx, TONGUE, mx + 4, my + 18 + Math.sin(this.time * 5) * 2, 0.1, 0.7)
    st.stampAt(ctx, MOUSE_HEAD, mx, my, Math.sin(this.time * 0.9) * 0.1, 0.94)
    const blink = this.time % 3.4 < 0.12
    const near = this.seen.reduce((a, v) => (Math.hypot(v.x - MOUSE.x, v.y - MOUSE.y) < Math.hypot(a.x - MOUSE.x, a.y - MOUSE.y) ? v : a))
    const ang = Math.atan2(near.y - my, near.x - mx)
    for (const s of [-1, 1]) {
      disc(ctx, mx + s * 10, my - 2, 6.5, blink ? 1 : 7, C.white)
      if (!blink) disc(ctx, mx + s * 10 + Math.cos(ang) * 2.4, my - 2 + Math.sin(ang) * 2.4, 4, 4, C.ink)
    }
    ctx.restore()
    this.bottles(ctx, g, jolt)
  }

  private bottles(ctx: Ctx, g: Game, jolt: number): void {
    const milk = milkOut(g)
    if (milk) {
      const s = g.scene
      const asking = askers(g).length > 0
      for (let i = 0; i < milk.length; i++) {
        const foot = this.bottleFoot(milk, i)
        let x = foot.x, y = foot.y + jolt * 5 * (i % 2 ? 1 : -1), rot = jolt * 0.09 * (i % 2 ? 1 : -1) + ring(this.since(`bottle${i}`)) * 0.22, full = 1
        if (s?.kind === 'deal') {
          const k = (s.t - dealAt(milk, i) + 0.42) / 0.42
          if (k <= 0) continue
          if (k < 1) { const p = hop(CRATE, foot, k); x = p.x; y = p.y; rot = (1 - k) * -3 }
        }
        if (s?.kind === 'milk') {
          full = 1 - ease((s.t - MILK.fill) / (MILK.drain - MILK.fill))
          const left = milk.filter((b) => b.side === 'left').length, u = s.t - burpAt(i, left)
          if (u > 0 && u < 0.35) y -= Math.sin((u / 0.35) * Math.PI) * 16
          if (s.act.bleated >= FIVE && this.home < MILK.home) { const p = hop(foot, CRATE, Math.min(1, (this.home - i * 0.09) / 0.5)); if (this.home - i * 0.09 > 0.5) continue; x = p.x; y = p.y }
        }
        if (asking && this.lastStraws?.[i]?.who !== null) full = 0.94
        if (asking && g.straws?.[i].who === null) { const u = (this.time * 0.8) % 1; if (u < 0.3) y -= Math.sin((u / 0.3) * Math.PI) * 9 }
        const own = milk[i].owner
        const worn = own !== null && this.seen[own].worn < 1.4 ? Math.abs(Math.sin(this.seen[own].worn * 6)) * 14 : 0
        bottle(ctx, this.stamps, x, y - worn, full, own, rot, asking && g.straws?.[i].who !== null ? 1 : 0, this.time)
      }
    } else if (this.home < 0.5 + 0.45 && this.homeMilk) {
      for (let i = 0; i < this.homeMilk.length; i++) {
        const k = (this.home - i * 0.09) / 0.5
        if (k >= 1) continue
        const p = hop(this.bottleFoot(this.homeMilk, i), CRATE, Math.max(0, k))
        bottle(ctx, this.stamps, p.x, p.y, 0, this.homeMilk[i].owner, Math.max(0, k) * 3, 0, this.time)
      }
    }
  }

  /** A straw lies behind every sheep but its own, whose head it goes over to the mouth. */
  private strawsDown(ctx: Ctx, g: Game, part: 'behind' | 'head' | 'quilt'): void {
    const over = part === 'head'
    const all = g.scene?.kind === 'milk' ? g.scene.straws : g.straws ?? this.lastStraws
    const milk = g.scene?.kind === 'milk' ? g.scene.milk : g.save.milk
    if (!all || !milk || this.strawK <= 0 || (g.scene?.kind === 'milk' && g.scene.t > MILK.burp)) return
    const k = ease(this.strawK)
    for (const s of all) {
      const mine = s.who === null ? null : g.bed.sheep[s.who]
      // Those of the covered half hang over the quilt, or go in under its hem.
      const covered = g.save.quilt === milk[s.bottle].side
      if (covered !== (part === 'quilt') || (part === 'behind' && !mine)) continue
      const foot = this.bottleFoot(milk, s.bottle), from = { x: foot.x, y: SHELF.y + 16 }
      const end = this.ends[s.bottle] ?? this.strawEnd(g, milk, s)
      const to = { x: from.x + (end.x - from.x) * k, y: from.y + (end.y - from.y) * k }
      const own = milk[s.bottle].owner
      // It comes down straight and in to the mouth from the side, past the eyes.
      const side = from.x >= end.x ? 1 : -1, reach = s.who === null || hidden(g, s.who) ? 0 : 92 * k
      const path = () => { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.bezierCurveTo(from.x, from.y + (to.y - from.y) * 0.55, to.x + side * reach, to.y - reach * 0.35, to.x, to.y) }
      ctx.save()
      if (over && mine) { ctx.beginPath(); ctx.arc(mine.x, mine.y - 10, R + 12, 0, Math.PI * 2); ctx.clip() }
      ctx.lineCap = 'round'
      ctx.strokeStyle = 'rgba(43,29,26,0.5)'; ctx.lineWidth = 13; path(); ctx.stroke()
      ctx.strokeStyle = C.white; ctx.lineWidth = 10; path(); ctx.stroke()
      ctx.lineCap = 'butt'
      ctx.strokeStyle = own === null ? C.red : OWN[own]
      ctx.setLineDash([11, 11])
      ctx.lineDashOffset = g.scene?.kind === 'milk' ? -this.time * 130 : 0
      path(); ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
      if (s.who === null && this.strawK > 0.9 && 1.5 - this.drip > 0.9) this.stamps.stampAt(ctx, DROP, to.x, to.y + 8, 0, Math.min(1, (1.5 - this.drip - 0.9) / 0.6))
    }
  }

  private quilt(ctx: Ctx, g: Game): void {
    const st = this.stamps
    for (const side of SIDES) {
      const k = this.cover[side], x = HALF[side].left + 6
      const nudge = ring(this.since(`roll${side}`)) * 8
      // What is left of the roll when the quilt is up is thin.
      const roll = () => { const sy = 1 - 0.6 * k; st.stampAt(ctx, ROLL, x + 5, QUILT.roll + nudge + (1 - sy) * QUILT.rollH, 0, 0.97, sy) }
      if (k < 0.02) { roll(); continue }
      const top = hemAt(k)
      ctx.save()
      ctx.beginPath()
      box(ctx, x - 16, top, 478, QUILT.roll + QUILT.rollH - 14 - top, 22)
      ctx.clip()
      st.stampAt(ctx, CLOTH, x + 8, top)
      for (let i = 0; i < FIVE; i++) {
        const s = g.bed.sheep[i], v = this.seen[i]
        if (sideOf(s.x) !== side) continue
        const speed = Math.hypot(s.vx, s.vy), p = this.poseOf(g, i)
        const moving = s.leap ? 1 : Math.min(1, speed / 140), poked = v.poked < 0.9 ? (1 - v.poked / 0.9) * (0.7 + 0.3 * Math.sin(v.poked * 30)) : 0
        const acting = actNow(g)?.cast.includes(i) ? Math.min(1, p.lift / 40 + Math.abs(p.spin % 6.28) * 0.12 + Math.abs(p.wide - 1) * 3 + 0.25) : 0
        const wants = askers(g).includes(i) ? Math.min(1, 0.55 + p.lift / 60) : 0
        const a = Math.max(moving, poked, acting, wants, g.bed.held?.who === i ? 1 : 0)
        if (a < 0.03) continue
        ctx.globalAlpha = Math.min(1, a)
        st.stampAt(ctx, BULGE, s.x, s.y - 8 - p.lift * 0.25, 0, (0.8 + a * 0.12) * p.wide)
        ctx.globalAlpha = 1
      }
      ctx.restore()
      roll()
      st.stampAt(ctx, HEM, x + 8, top + ring(this.since(`hem${side}`)) * 9 + ring(this.since('flump'), 24, 6) * 5)
    }
  }

  private head(ctx: Ctx, x: number, y: number, rot: number, scale: number, g: Game): void {
    const st = this.stamps, poke = this.since('dog'), perk = poke < 0.7 ? Math.sin((poke / 0.7) * Math.PI) : 0
    ctx.save()
    ctx.translate(x, y - perk * 10)
    ctx.rotate(rot)
    ctx.scale(scale, scale)
    for (const s of [-1, 1]) { ctx.save(); ctx.scale(s, 1); st.stampAt(ctx, DOG_EAR, -54, -44, 0.16 + perk * 1.1 + 0.04 * Math.sin(this.time * 1.7 + s)); ctx.restore() }
    const tongue = g.scene?.kind === 'milk' || milkOut(g)
    if (tongue || perk > 0.2) st.stampAt(ctx, TONGUE, 14, 46 + Math.sin(this.time * 6) * 2, -0.1, 1.3)
    st.stamp(ctx, DOG_HEAD)
    const shut = (g.dogIn !== null && this.dogAt > 0.98) || this.time % 4.1 < 0.13
    for (const s of [-1, 1]) {
      const ex = s * 25 + this.dogTurn * 4, ey = -22
      if (shut) { ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(ex, ey - 4, 13, 0.4, Math.PI - 0.4); ctx.stroke(); continue }
      disc(ctx, ex, ey, 16, 17, C.white)
      disc(ctx, ex + this.dogTurn * 8, ey + 2, 8.5, 9, C.ink)
      disc(ctx, ex + this.dogTurn * 8 - 3, ey - 2, 2.6, 2.6, C.white)
    }
    ctx.restore()
  }

  private dogAndCrate(ctx: Ctx, g: Game): void {
    const st = this.stamps
    if (this.dogAt <= 0) {
      st.stampAt(ctx, DOG_BODY, DOG.x, DOG.y)
      const nose = this.since('snuffle') < 1.2 ? Math.sin((this.since('snuffle') / 1.2) * Math.PI) * 24 : 0
      this.head(ctx, DOG.x + this.dogTurn * 10 + nose, DOG.y - 62 + Math.sin(this.time * 1.6) * 2, this.dogTurn * 0.16, 1, g)
    }
    const full = milkOut(g) === null && this.home > 0.9
    // Five, as many as come out of it: two behind three.
    if (full) for (const [i, x, y] of CRATED) bottle(ctx, st, CRATE.x + x, CRATE.y + y + ring(this.since('crate') - i * 0.06, 24, 6) * 8 - Math.max(0, Math.sin(this.time * 2.2 - i * 0.7)) * 12, 1, null, 0, 0, this.time)
    st.stampAt(ctx, CRATE_BOX, CRATE.x, CRATE.y, ring(this.since('crate'), 26, 7) * 0.05)
  }

  private dogInBed(ctx: Ctx): void {
    const to = { x: HALF[this.dogSide].mid, y: 470 }
    const k = this.dogAt
    const p = k < 0.8 ? hop(DOG, to, k / 0.8, 320) : to
    if (k < 0.8) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(Math.sin((k / 0.8) * Math.PI) * 0.3)
      this.stamps.stampAt(ctx, DOG_BODY, 0, 0, 0, 0.9)
      ctx.restore()
      this.head(ctx, p.x, p.y - 60, 0.1, 0.95, BARE)
    } else {
      const turn = ease((k - 0.8) / 0.2)
      this.stamps.stampAt(ctx, DOG_LYING, to.x, to.y + 10, 0, (1 + 0.015 * Math.sin(this.time * 2)) * (0.8 + 0.2 * turn), 1)
      this.head(ctx, to.x - 60, to.y - 18, -0.12, 0.95, BARE)
    }
  }

  private guide(ctx: Ctx, g: Game, guidance: Guidance): void {
    const hint: Hint | null = guidance.glow > 0 || guidance.demo !== null ? hintFor(g) : null
    if (!hint) return
    const beat = 0.5 + 0.5 * Math.sin(this.time * 2.6)
    ctx.globalAlpha = guidance.glow * (0.55 + 0.45 * beat)
    for (const c of hint.glow) this.stamps.stampAt(ctx, HALO, c.x, c.y - 10, 0, (hint.r / 56) * (1 + beat * 0.05))
    ctx.globalAlpha = 1
    if (guidance.demo === null) return
    const h = handPose(guidance.demo, false, this.hand)
    ctx.globalAlpha = h.opacity
    this.stamps.stampAt(ctx, GHOST, hint.at.x, hint.at.y + 6, -0.16, 1.5 - h.press * 0.3)
    ctx.globalAlpha = 1
  }
}

const BARE = { scene: null, dogIn: 'left', save: { milk: null } } as unknown as Game
/** Along an arc from one place to another. */
function hop(a: Point, b: Point, k: number, high = 170): Point {
  const u = Math.min(1, Math.max(0, k))
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - high * 4 * u * (1 - u) * 0.6 }
}
