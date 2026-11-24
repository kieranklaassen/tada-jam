import { HEAD, FIGURE_SPRITES, figure, type Extras, type Gaze } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { hintFor, type Hint } from './guide'
import type { Note } from './audio'
import type { Point } from './input'
import { BASKET, BELL, FISH, HOOK, PLACES, SEATS, SITTERS, SPOTS, headOf, sausageAt, type PlaceId, type Spot, type Thing, type Who } from './layout'
import { EAT, SULK, inBasket, sausageSpot, sees, type Draped, type Event, type World } from './model'
import { NATURES, aloft, footing, looksAt, neutral, poseOf, type Pose } from './motion'
import { Stamps, type Ctx, type Sprite } from './paint'
import type { Poke, Refusal } from './play'
import { paintRoom } from './room'
import { BACK, DRAPES, FRONT, LIES, LOOSE, OVER, T, basket, bellAt, blanket, sausage, string } from './things'
import { SLOSH, TINKLE } from './voices'
import { FOLD, flightAt, type Flight } from './flights'

// Draws the parlour from the rules, and keeps what is only to be seen: springs,
// things on their way through the air, and where each pair of eyes has got to.
// Nothing here is saved and nothing here decides anything.

/** The most pictures one frame may stamp. */
export const STAMP_LIMIT = 80
const LONG = 99
/** How far the neck of each is below the middle of its head. */
const NECK: Record<Who, number> = { dog: 8, cat: 4, aunt: 52, grandpa: 34 }

type Seen = { gaze: Gaze; poked: number; freed: number; bowled: number; laid: number; near: boolean; side: boolean; pose: Pose }

const seen = (): Seen => ({ gaze: { x: 0, y: 0 }, poked: LONG, freed: LONG, bowled: LONG, laid: LONG, near: false, side: false, pose: neutral() })

const keyOf = (thing: Thing): string => thing.kind === 'place' ? thing.id : thing.kind === 'sitter' ? thing.who : thing.kind

/** A push that rings down: where a thing is, `t` seconds after it. */
export const ring = (t: number, rate = 22, fall = 5): number => (t > 2 ? 0 : Math.exp(-t * fall) * Math.sin(t * rate))

export class View {
  readonly stamps = new Stamps()
  private room: { canvas: CanvasImageSource; x: number; y: number; w: number; h: number } | null = null
  private time = 0
  private readonly who: Record<Who, Seen> = { dog: seen(), cat: seen(), aunt: seen(), grandpa: seen() }
  /** Seconds since each thing was last pushed. */
  private readonly pushed = new Map<string, number>()
  private readonly laid = new Map<Draped, number>()
  private flights: Flight[] = []
  private puffs: { at: Point; t: number }[] = []
  private glance: { at: Point; t: number } | null = null
  private lastHand: Point = { x: BASKET.x, y: BASKET.y }
  private rock = 0
  /** What the room itself has to say, for the Mount to play. */
  sounds: Note[][] = []
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  /** The still part, for a surface of this size. `scale` is device pixels to a stage unit. */
  sized(make: (w: number, h: number) => { canvas: CanvasImageSource; ctx: Ctx }, scale: number, x: number, y: number, w: number, h: number): void {
    this.stamps.at(scale)
    const made = make(Math.max(1, Math.ceil(w * scale)), Math.max(1, Math.ceil(h * scale)))
    made.ctx.scale(scale, scale)
    made.ctx.translate(-x, -y)
    paintRoom(made.ctx, x, y, w, h)
    // Every picture is painted now, so that no touch waits for one.
    for (const s of [...Object.values(FIGURE_SPRITES), ...Object.values(T)]) this.stamps.warm(s)
    this.room = { canvas: made.canvas, x, y, w, h }
  }

  poke(p: Poke): void {
    this.pushed.set(keyOf(p.thing), 0)
    if (p.thing.kind === 'sitter') this.who[p.thing.who].poked = 0
    if (p.thing.kind === 'room') { this.puffs.push({ at: p.at, t: 0 }); this.glance = { at: p.at, t: 0 } }
  }

  refusal(r: Refusal): void {
    this.pushed.set(keyOf(r.thing), 0)
  }

  notice(e: Event, world: World): void {
    switch (e.type) {
      case 'cover': { this.who[e.who].laid = 0; break }
      case 'uncover': {
        const s = this.who[e.who], at = footing(e.who, world.sitters[e.who])
        s.freed = 0
        this.flights.push({ what: 'blanket', from: { x: at.x, y: at.y + HEAD[e.who].y }, to: 'basket', t: 0, seconds: 0.55, key: e.who })
        break
      }
      case 'bowled': this.who[e.who].bowled = 0; break
      case 'ghost': this.who[e.who].laid = 0.3; break
      case 'put': this.flights.push({ what: 'sausage', from: world.held || this.justHeld > 0 ? this.lastHand : sausageAt(e.from), to: e.spot, t: 0, seconds: this.justHeld > 0 ? 0.22 : 0.5, key: 'sausage' }); this.pushed.set(e.spot, -0.3); break
      case 'back': this.flights.push({ what: 'sausage', from: this.lastHand, to: e.spot, t: 0, seconds: 0.45, key: 'sausage' }); break
      case 'flap': this.flights.push({ what: 'blanket', from: this.lastHand, to: 'basket', t: 0, seconds: 0.5, key: 'hand' }); break
      case 'drape': this.laid.set(e.on, 0); this.pushed.set(e.on, 0); break
      case 'undrape': { const d = DRAPES[e.on]; this.flights.push({ what: 'blanket', from: { x: d.x, y: d.y }, to: 'basket', t: 0, seconds: 0.5, key: e.on }); break }
      case 'pick': {
        // What is in the hand is not in the air as well.
        const last = this.flights.map((f) => f.what).lastIndexOf(e.what)
        if (last >= 0 && (e.what === 'sausage' || world.held?.kind === 'blanket' && world.held.origin !== 'basket')) this.flights.splice(last, 1)
        break
      }
      case 'bell': this.pushed.set('bell', 0); break
      case 'peek': this.pushed.set('sausage', 0); break
      case 'empty': this.pushed.set(e.spot, 0); break
      case 'gulp': this.pushed.set('hook', -0.1); break
      default: break
    }
  }
  private justHeld = 0

  /** Plays the seconds of a frame for everything that is only seen. */
  advance(world: World, hand: Point | null, dt: number): void {
    this.time += dt
    this.justHeld = Math.max(0, this.justHeld - 1)
    if (world.held && hand) { this.lastHand = hand; this.justHeld = 3 }
    for (const [k, t] of this.pushed) this.pushed.set(k, t + dt)
    for (const [k, t] of this.laid) this.laid.set(k, t + dt)
    for (const f of this.flights) f.t += dt
    for (const f of this.flights) if (f.t >= f.seconds) this.pushed.set(f.to, 0)
    this.flights = this.flights.filter((f) => f.t < f.seconds)
    for (const p of this.puffs) p.t += dt
    this.puffs = this.puffs.filter((p) => p.t < 0.5)
    if (this.glance && (this.glance.t += dt) > 0.6) this.glance = null
    const mouth = this.mouthAt(world)
    for (const who of SITTERS) {
      const v = this.who[who], s = world.sitters[who]
      v.poked += dt; v.freed += dt; v.bowled += dt; v.laid += dt
      const moving = s.phase === 'run' || s.phase === 'home'
      // Eyes turn at their owner's pace.
      const look = this.glance && sees(world, who) ? { at: this.glance.at } : looksAt(world, who, hand, this.time, mouth)
      const foot = footing(who, s)
      const hx = SEATS[who].head.x + foot.x - SEATS[who].x, hy = SEATS[who].head.y + foot.y - SEATS[who].y
      const dx = look.at.x - hx, dy = look.at.y - hy, d = Math.hypot(dx, dy) || 1
      const far = Math.min(1, d / 90), g = Math.min(1, dt * NATURES[who].turn)
      v.gaze.x += ((dx / d) * far - v.gaze.x) * g
      v.gaze.y += ((dy / d) * far - v.gaze.y) * g
      const near = moving && Math.abs(s.at.x - FISH.x) < 140 && s.at.y > 520
      if (near && !v.near) { this.pushed.set('slosh', 0); this.sounds.push(SLOSH) }
      v.near = near
      const side = s.at.x > BELL.x
      if (side !== v.side && moving) { this.pushed.set('tinkle', 0); this.sounds.push(TINKLE) }
      v.side = side
    }
    const rocking = world.sitters.grandpa.phase === 'seat' || world.sitters.grandpa.phase === 'wind'
    this.rock = Math.sin(this.time * 1.5) * (rocking ? 0.035 : 0.012)
  }

  private since(key: string): number {
    return this.pushed.get(key) ?? LONG
  }

  private mouthAt(world: World): Point | null {
    if (world.sausage.kind !== 'mouth') return null
    const who = world.sausage.who, s = world.sitters[who]
    const foot = footing(who, s)
    return { x: foot.x + HEAD[who].x, y: foot.y + HEAD[who].y + 40 }
  }

  private push(key: string, size = 0.12): number {
    const t = this.since(key)
    return t < 0 ? 0 : ring(t) * size
  }

  draw(ctx: Ctx, world: World, hand: Point | null, guidance: Guidance | null): void {
    const st = this.stamps
    st.stamped = 0
    if (!this.room) return
    ctx.drawImage(this.room.canvas, this.room.x, this.room.y, this.room.w, this.room.h)
    const spot = sausageSpot(world), flying = this.flights.some((f) => f.what === 'sausage'), held = world.held?.kind === 'sausage'
    const lies = spot !== null && !flying && !held ? spot : null
    const gulped = this.since('hook')
    string(ctx, st, Math.sin(this.time * 0.8) * 0.02 + this.push('hook', 0.16), lies === 'hook' ? Math.min(1, Math.max(0, gulped + 0.1) * 3) : 0)
    const b = this.since('bell')
    bellAt(ctx, st, (b < LONG ? ring(b, 13, 1.6) * 0.5 : 0) + this.push('tinkle', 0.14))

    const items: { y: number; draw: () => void }[] = []
    for (const id of PLACES) {
      const divers = SITTERS.filter((who) => this.divesAt(world, who, id))
      if (SPOTS[id].high) this.place(ctx, world, id, lies, [])
      else items.push({ y: SPOTS[id].at.y + 30, draw: () => this.place(ctx, world, id, lies, divers) })
    }
    const furniture: Record<Who, Sprite> = { dog: T.cushion, cat: T.stool, aunt: T.armchair, grandpa: T.rocker }
    for (const who of SITTERS) {
      const seat = SEATS[who]
      items.push({ y: seat.y - 4, draw: () => st.stampAt(ctx, furniture[who], seat.x, seat.y + (who === 'dog' ? -6 : who === 'aunt' ? 14 : who === 'grandpa' ? 24 : 0), who === 'grandpa' ? this.rock : 0, 1 + this.push(who, 0.02), 1 - this.push(who, 0.03)) })
      const s = world.sitters[who]
      if (PLACES.some((id) => !SPOTS[id].high && this.divesAt(world, who, id))) continue
      const out = s.phase !== 'seat' && s.phase !== 'wind'
      items.push({ y: !out ? seat.y : s.target && aloft(s.target) && s.phase !== 'home' ? 645 : footing(who, s).y, draw: () => this.sitter(ctx, world, who, lies) })
    }
    items.push({ y: FISH.y + 80, draw: () => this.fish(ctx, world, hand) })
    items.push({ y: BASKET.y + 40, draw: () => basket(ctx, st, Math.max(0, inBasket(world) - this.flights.filter((f) => f.what === 'blanket' && f.to === 'basket').length), this.push('basket', 2.4)) })
    items.sort((p, q) => p.y - q.y)
    for (const item of items) item.draw()

    for (const f of this.flights) this.flight(ctx, f)
    if (world.held && hand) {
      if (held) sausage(ctx, st, hand.x, hand.y - 8, Math.sin(this.time * 9) * 0.14, 1.12)
      else blanket(ctx, st, { x: hand.x, top: hand.y - 26, bottom: hand.y + 96, r: 34, w: 66, lean: 0, air: 0.12, time: this.time, stir: 3 })
    }
    for (const p of this.puffs) for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + 0.4, d = 14 + 60 * Math.sqrt(p.t)
      st.stampAt(ctx, FIGURE_SPRITES.puff, p.at.x + Math.cos(a) * d, p.at.y + Math.sin(a) * d * 0.7, 0, Math.max(0, 1 - p.t * 2))
    }
    if (guidance) this.guide(ctx, world, guidance)
  }

  /** Whether a sitter's head is down in a place. */
  private divesAt(world: World, who: Who, id: PlaceId): boolean {
    const s = world.sitters[who]
    return s.phase === 'hunt' && s.target === id
  }

  private stuck(world: World, who: Who): Sprite | null {
    const s = world.sitters[who]
    if (s.phase !== 'sulk' || s.t > SULK * 0.55 || s.target === null || headOf(s.target) || s.target === 'hook') return null
    const id = s.target as PlaceId, loose = LOOSE[id]
    // There is one of each: while somebody still has their head in it, or somebody who was first wears it, it is theirs.
    if (!loose || SITTERS.some((o) => this.divesAt(world, o, id))) return null
    const first = SITTERS.filter((o) => world.sitters[o].phase === 'sulk' && world.sitters[o].target === id && world.sitters[o].t <= SULK * 0.55).sort((a, b) => world.sitters[b].t - world.sitters[a].t)[0]
    return first === who ? loose : null
  }

  private place(ctx: Ctx, world: World, id: PlaceId, lies: Spot | null, divers: Who[]): void {
    const st = this.stamps, at = SPOTS[id].at, k = this.push(id)
    const busy = divers.length > 0
    const gone = lies !== id && SITTERS.some((who) => world.sitters[who].target === id && this.stuck(world, who) !== null)
    // Nobody in the room knows: it looks out by itself.
    const lost = lies === id && SITTERS.every((who) => sees(world, who) && world.sitters[who].belief === null)
    const shake = busy ? Math.sin(this.time * 26) * 0.03 : 0
    ctx.save()
    ctx.translate(at.x, at.y + 60)
    ctx.rotate(k * 0.5 + shake)
    ctx.scale(1 + k, 1 - k)
    ctx.translate(0, -60)
    if (!(gone && id === 'boot')) {
      st.stamp(ctx, BACK[id])
      const l = LIES[id], p = this.since('sausage'), up = lies !== id ? 0 : p >= 0 && p < 0.7 ? Math.sin((p / 0.7) * Math.PI) * 26 : lost ? Math.max(0, Math.sin(this.time * 2.4)) * 12 : 0
      if (lies === id && !world.draped.includes(id)) { if (id === 'gramophone') sausage(ctx, st, l.x + up * 0.7, l.y - up * 0.7, l.rot); else if (id !== 'teapot') sausage(ctx, st, l.x, l.y - up, l.rot) }
      if (id === 'pot' && !gone) st.stampAt(ctx, T.flower, 6, 0, Math.sin(this.time * 1.1) * 0.05 + k * 2, 1, 1 - Math.abs(k) * 2)
      if (id === 'teapot' && lies === id && !world.draped.includes(id)) sausage(ctx, st, l.x + up * 0.5, l.y - up * 0.7, l.rot, 0.8)
      if (busy) {
        ctx.restore()
        for (const who of divers) this.sitter(ctx, world, who, lies)
        ctx.save()
        ctx.translate(at.x, at.y + 60)
        ctx.rotate(shake)
        ctx.translate(0, -60)
      }
      st.stamp(ctx, FRONT[id])
      if (id === 'teapot' && !gone) st.stampAt(ctx, T.potLid, busy ? 74 : 0, busy ? 40 : -38 - Math.abs(k) * 130, busy ? 0.5 : k)
    }
    ctx.restore()
    if (world.draped.includes(id)) this.draped(ctx, id)
  }

  private draped(ctx: Ctx, on: Draped): void {
    const d = DRAPES[on], t = this.laid.get(on) ?? LONG
    const fall = Math.max(0, 1 - t / 0.34)
    blanket(ctx, this.stamps, { x: d.x, top: d.y + d.top - fall * fall * 190 + this.push(on, 60), bottom: d.y + d.bottom - fall * fall * 150, r: d.r, w: d.w, lean: this.push(on, 60), air: fall, time: this.time, stir: 0 })
  }

  private sitter(ctx: Ctx, world: World, who: Who, lies: Spot | null): void {
    const v = this.who[who], s = world.sitters[who], st = this.stamps
    const p = poseOf(who, s, this.time, v.poked, v.freed, v.bowled, v.pose)
    const h = HEAD[who]
    const seen = sees(world, who)
    const eating = s.phase === 'eat' && world.sausage.kind === 'mouth' && world.sausage.who === who
    const left = eating ? Math.max(0, who === 'dog' ? 1 - Math.max(0, s.t / EAT - 0.2) * 9 : 1 - s.t / EAT) : 0
    const target = s.target
    const place = s.phase === 'hunt' && target && target !== 'hook' && !headOf(target) ? (target as PlaceId) : null
    const inside = place !== null && place !== 'dish' && place !== 'pot' && p.dive > 0.75
    const x: Extras = {
      covered: s.covered,
      dizzy: v.freed < 0.6 ? 0.001 + v.freed : 0,
      stuck: this.stuck(world, who),
      point: seen && (s.belief !== null || world.held?.kind === 'sausage') ? Math.atan2(v.gaze.y, v.gaze.x) : null,
      time: this.time,
      bite: left > 0.02 ? left : null,
      sausage: (c, sx, sy, rot, k) => sausage(c, st, sx, sy, rot, Math.max(0.15, k) * 0.9, 0.9),
    }
    ctx.save()
    if (place && p.dive > 0) {
      // Over it goes: the head into the place, the legs where they can.
      const at = SPOTS[place].at, high = SPOTS[place].high, side = Math.sign(s.at.x - at.x) || (SEATS[who].x < at.x ? -1 : 1)
      const beside = (s.at.x - at.x) * 0.3
      const into = { x: at.x + beside + (place === 'gramophone' ? 20 : 0), y: at.y + (place === 'dish' ? -42 : high ? (place === 'pot' ? 22 : 10) : place === 'boot' ? -66 : -36) }
      // The neck comes to the mouth of it, not the middle of the head.
      if (inside) into.y += NECK[who] * (high ? -1 : 1)
      const px = p.x + h.x + (into.x - p.x - h.x) * p.dive, py = p.y + h.y + (into.y - p.y - h.y) * p.dive
      ctx.translate(px, py)
      ctx.rotate(p.rot + (high ? side * 0.2 * p.dive : side * -2.75 * p.dive))
      ctx.scale(p.sx, p.sy)
      ctx.translate(-h.x, -h.y)
    } else {
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot + (who === 'grandpa' && s.phase === 'seat' ? this.rock : 0))
      ctx.scale(p.sx, p.sy)
    }
    figure(ctx, st, who, p, v.gaze, inside ? { ...x, covered: true } : x)
    if (s.covered) {
      const n = NATURES[who], o = OVER[who], fall = Math.max(0, 1 - v.laid / 0.36)
      const puff = who === 'grandpa' ? Math.max(0, Math.sin(this.time * 1.4)) * 10 : 0
      const heave = Math.sin(this.time * n.lumpRate * 2) * n.lump
      const poke = ring(v.poked) * 12
      blanket(ctx, st, { x: h.x * 0.5, top: o.top + heave * 0.6 - fall * fall * 240 + poke, bottom: o.bottom - fall * 120, r: o.r, w: o.w, lean: heave + Math.sin(this.time * 0.7 + SEATS[who].x) * n.lump, air: fall, time: this.time, stir: puff + (s.phase === 'home' ? 8 : 0), ears: o.ears })
    }
    if (lies && headOf(lies) === who) {
      const q = this.since('sausage'), up = q >= 0 && q < 0.6 ? Math.sin((q / 0.6) * Math.PI) * 24 : 0
      const r = SEATS[who].top.y - SEATS[who].y
      sausage(ctx, st, (s.covered ? h.x * 0.5 : h.x) + p.headX, (s.covered ? OVER[who].top + 2 : r - 4) + p.headY - up, Math.sin(this.time * 2 + 1) * 0.08, 0.92)
    }
    ctx.restore()
  }

  private fish(ctx: Ctx, world: World, hand: Point | null): void {
    const st = this.stamps, draped = world.draped.includes('fish')
    const poked = this.since('fish'), k = this.push('fish', 0.06) + this.push('slosh', 0.09)
    const spot = sausageSpot(world)
    // It always knows.
    const to = world.held?.kind === 'sausage' && hand ? hand : spot ? (sausageAt(spot)) : this.mouthAt(world) ?? HOOK
    const face = to.x >= FISH.x ? 1 : -1, tilt = Math.max(-0.7, Math.min(0.7, Math.atan2(to.y - FISH.y, Math.abs(to.x - FISH.x) + 60)))
    ctx.save()
    ctx.translate(FISH.x, FISH.y)
    ctx.rotate(k)
    st.stamp(ctx, T.bowlBack)
    if (!draped) {
      const loop = poked >= 0 && poked < 0.7 ? (poked / 0.7) * Math.PI * 2 : 0
      ctx.save()
      ctx.translate(Math.sin(this.time * 1.3) * 12 + Math.sin(loop) * 22, 8 + Math.sin(this.time * 2.1) * 5 - (1 - Math.cos(loop)) * 14)
      ctx.scale(face, 1)
      ctx.rotate(tilt + loop)
      st.stamp(ctx, T.fish)
      ctx.restore()
      if (poked >= 0.1 && poked < 0.9) st.stampAt(ctx, FIGURE_SPRITES.puff, face * 34, -10 - poked * 60, 0, 0.5)
    }
    st.stamp(ctx, T.bowlFront)
    const w = this.since('slosh')
    if (w < 0.6) for (const s of [-1, 1]) st.stampAt(ctx, T.drop, s * (44 + w * 60), -56 - Math.sin(w * 5) * 34 + w * 60, 0, 1 - w)
    ctx.restore()
    if (draped) this.draped(ctx, 'fish')
  }

  private flight(ctx: Ctx, f: Flight): void {
    const to = f.to === 'basket' ? BASKET : sausageAt(f.to)
    const p = flightAt(f, to)
    if (f.what === 'sausage') { sausage(ctx, this.stamps, p.x, p.y, p.k * 6.28); return }
    const z = 1 - p.k * 0.55
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(Math.sin(p.k * 7) * 0.5)
    ctx.scale(z, z)
    blanket(ctx, this.stamps, { x: 0, top: -50, bottom: 70, r: FOLD, w: 90, lean: 0, air: 0.7, time: this.time, stir: 6 })
    ctx.restore()
  }

  private guide(ctx: Ctx, world: World, g: Guidance): void {
    if (g.glow <= 0 && g.demo === null) return
    const hint = hintFor(world)
    if (!hint) return
    for (const c of glows(hint, world)) {
      const beat = 0.5 + 0.5 * Math.sin(this.time * 2.6)
      ctx.globalAlpha = g.glow * (0.6 + 0.4 * beat)
      this.stamps.stampAt(ctx, T.halo, c.x, c.y, 0, (c.r / 60) * (1 + beat * 0.05))
    }
    ctx.globalAlpha = 1
    if (g.demo === null) return
    const h = handPose(g.demo, hint.to !== null, this.hand)
    const x = hint.from.x + (hint.to ? (hint.to.x - hint.from.x) * h.travel : 0), y = hint.from.y + (hint.to ? (hint.to.y - hint.from.y) * h.travel : 0)
    ctx.globalAlpha = h.opacity * 0.94
    this.stamps.stampAt(ctx, T.ghostHand, x, y + 4, -0.16, 1.6 - h.press * 0.28)
    ctx.globalAlpha = 1
  }
}

/** What glows with a hint. */
export function glows(hint: Hint, world: World): { x: number; y: number; r: number }[] {
  if (hint.glow === 'hook') return [{ x: HOOK.x, y: HOOK.y, r: 62 }]
  if (hint.glow === 'bell') return [{ ...BELL, r: 78 }]
  if (hint.glow === 'sausage') return [{ ...hint.from, r: 64 }]
  if (hint.glow === 'places') { const at = PLACES.filter((id) => sausageSpot(world) !== id && !world.draped.includes(id)); return at.map((id) => ({ ...SPOTS[id].at, r: 84 })) }
  const whom = hint.glow === 'sitters' ? SITTERS : [hint.glow]
  return whom.map((who) => ({ x: SEATS[who].head.x, y: SEATS[who].head.y, r: SEATS[who].r + 30 }))
}
