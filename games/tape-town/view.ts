import { SPRITE_SIZE, TAPE_COLOUR, paintCrossing, paintFlat, paintGateArms, paintLoose, paintOvers, paintPatch, paintPressFronts, paintRoom, paintSprite, paintTrims, type Stretch } from './art'
import { crossingsOn, type Crossing } from './crossings'
import { armsOf, type Arm } from './gates'
import type { Tier } from './config'
import { handPose, type Guidance, type HandPose } from './guidance'
import type { Point } from './input'
import { BASKET, BOX, CAT, PLANT, ROLLS, ROLL_RADIUS, TAPE_WIDTH, TOY_IDS, TOY_SIZE } from './layout'
import { catBreath, catTail } from './motion'
import { fitFloor } from './floor'
import { angleOf, lengthOf, nearestOn, type Strip } from './tape'
import { paintToy, type Pen } from './toyView'
import { liftedOf } from './touch'
import type { Fx, Hint, Town } from './town'
import { drawnScale, layersOf, underOf } from './way'

// The view: one frame of the town on a canvas 2D surface. What stands still
// (the room, and every strip that lies flat) is painted into one layer and
// stamped once a frame; each toy, roll and the box is a sprite painted once
// for the surface's size; and the little that is live (tape in the hand,
// pupils, a tail, what a toy leaves behind) is drawn as plain fills and
// strokes, one path for each kind of thing.
//
// `paint` returns what it drew: every stamp of a layer or sprite and every
// live fill or stroke, counted where it is made. That number is the game's
// draw count, and the frame-budget test checks it against what really
// reached the surface.

type G = CanvasRenderingContext2D
const TAU = Math.PI * 2

const ring = (t: number, hz: number, damp: number): number => (t <= 0 ? 0 : Math.exp(-t * damp) * Math.cos(t * hz * TAU))
const bump = (t: number, lasts: number): number => (t <= 0 || t >= lasts ? 0 : Math.sin((t / lasts) * Math.PI))
const ease = (t: number): number => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c) }

const BOX_AT = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 }
/** How long the basket and the plant go on moving after a touch: until then they are drawn live, and after it they are part of the floor layer. */
const SETTLES = 1.2
/** A toy down in the upright box is drawn this much smaller, and nothing of the heap shows outside the rim. */
const IN_BOX = 0.74
/** The toys that travel a river, and so can be under what crosses it. */
const RIM = 13

/** What each thing a toy leaves behind looks like: how long it lasts, its colour, and whether it lies on the floor under the toys. */
const FX: Record<Fx['kind'], { lasts: number; colour: string; under: boolean }> = {
  spot: { lasts: 1.4, colour: 'rgba(92, 58, 26, 0.3)', under: true },
  wake: { lasts: 0.9, colour: 'rgba(255, 255, 255, 0.5)', under: true },
  bubble: { lasts: 0.7, colour: 'rgba(236, 248, 255, 0.75)', under: true },
  drop: { lasts: 0.5, colour: 'rgba(120, 190, 240, 0.9)', under: false },
  drip: { lasts: 0.6, colour: 'rgba(150, 205, 245, 0.9)', under: false },
  leaf: { lasts: 0.8, colour: '#4f9a48', under: false },
  puff: { lasts: 0.9, colour: 'rgba(255, 255, 255, 0.6)', under: false },
  cloud: { lasts: 1.4, colour: 'rgba(255, 255, 255, 0.7)', under: false },
  dust: { lasts: 0.6, colour: 'rgba(246, 230, 214, 0.75)', under: false },
  knock: { lasts: 0.45, colour: 'rgba(255, 246, 226, 0.7)', under: false },
}
const FX_KINDS = Object.keys(FX) as Fx['kind'][]

/**
 * A strip with an end in the hand. What of it has come up is loose tape; the rest still lies flat. From the
 * first crossing the lift has not reached, onward, it is part of the floor layer with those crossings as they
 * were built; a crossing the lift has reached is `dropped` (its parapets, posts or bushes go with the tape); and
 * `live` is what lies flat between the two, painted each frame, never over a tape that crosses above it.
 */
type Held = { strip: Strip; baked: [number, number] | null; live: [number, number][]; dropped: Set<Crossing>; key: string }

export function heldOf(town: Town): Held | null {
  const grip = town.grip
  if (!grip) return null
  const strip = grip.strip, length = lengthOf(strip), first = grip.end === 0
  const up = liftedOf(grip)
  const lifted = first ? [0, up] : [length - up, length]
  const dropped = new Set<Crossing>(), covered: [number, number][] = []
  let edge = first ? length : 0, any = false
  for (const met of crossingsOn(town.crossings, strip)) {
    const a = met.d - met.reach - 7, b = met.d + met.reach + 7
    if (b <= lifted[0] || a >= lifted[1]) { any = true; edge = first ? Math.min(edge, a) : Math.max(edge, b); continue }
    dropped.add(met.crossing)
    // Where the other tape is the one on top, this one is under it and is not painted over it.
    const c = met.crossing, top = c.kind === 'bridge' || c.kind === 'tunnel' ? c.low : c.high
    if (top !== strip) covered.push([met.d - met.reach, met.d + met.reach])
  }
  edge = Math.max(0, Math.min(length, edge))
  let live: [number, number][] = [first ? [up, any ? edge : length] : [any ? edge : 0, length - up]]
  for (const [a, b] of covered) live = live.flatMap(([from, to]): [number, number][] => [[from, Math.min(to, a)], [Math.max(from, b), to]])
  return { strip, baked: any ? (first ? [edge, length] : [0, edge]) : null, live: live.filter(([from, to]) => to - from > 0.5), dropped, key: `${town.state.strips.indexOf(strip)}:${grip.end}:${dropped.size}:${any ? Math.round(edge) : -1}` }
}

export class View implements Pen {
  g!: G
  n = 0
  scale = 1
  private readonly make: () => HTMLCanvasElement
  private room: HTMLCanvasElement | null = null
  private floor: HTMLCanvasElement | null = null
  private readonly sprites = new Map<string, HTMLCanvasElement>()
  private key = ''
  private baked = ''
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  private held: Held | null = null
  private shown: { index: number; hint: Hint } | null = null

  /** `make` gives a blank canvas for a layer or a sprite; a test passes one that only counts. */
  constructor(make: () => HTMLCanvasElement = () => document.createElement('canvas')) {
    this.make = make
  }

  /** Paints one frame and returns the draw count. With no town yet (the slot is still being read) it paints the empty room. */
  paint(g: G, width: number, height: number, dpr: number, town: Town | null, guidance: Guidance | null, tier: Tier): number {
    const by = fitFloor(width, height)
    if (by.scale <= 0 || dpr <= 0) return 0
    const scale = dpr * by.scale, ox = dpr * by.x, oy = dpr * by.y
    const pw = Math.round(width * dpr), ph = Math.round(height * dpr)
    const key = `${pw}x${ph}@${scale}`
    this.g = g
    this.scale = scale
    if (key !== this.key || !this.room) {
      // A new size: the room and every sprite are painted again at this density.
      this.key = key
      this.baked = ''
      this.sprites.clear()
      this.room = this.layer(pw, ph)
      const into = this.room.getContext('2d')
      if (into) {
        into.setTransform(scale, 0, 0, scale, ox, oy)
        paintRoom(into)
      }
    }
    this.n = 0
    if (!town) {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.drawImage(this.room, 0, 0)
      return 1
    }
    const t = town.time
    const basketLive = t - town.basketAt < SETTLES, plantLive = t - town.plantAt < SETTLES, held = heldOf(town)
    this.held = held
    const baked = `${town.layer}/${tier.fibres}/${basketLive}/${plantLive}/${held ? held.key : ''}`
    if (baked !== this.baked || !this.floor) {
      // The floor is the room with every strip that lies flat on it, and the basket and the plant while they stand still.
      this.baked = baked
      this.floor ??= this.layer(pw, ph)
      if (this.floor.width !== pw || this.floor.height !== ph) { this.floor.width = pw; this.floor.height = ph }
      const into = this.floor.getContext('2d')
      if (into) {
        into.setTransform(1, 0, 0, 1, 0, 0)
        into.drawImage(this.room, 0, 0)
        into.setTransform(scale, 0, 0, scale, ox, oy)
        for (const [name, at, live] of [['basket', BASKET, basketLive], ['plant', PLANT, plantLive]] as const) {
          if (live) continue
          const size = SPRITE_SIZE[name]
          into.drawImage(this.sprite(name, scale), at.x - size.w / 2, at.y - size.h / 2, size.w, size.h)
        }
        for (const strip of town.flat) {
          if (strip !== held?.strip) paintFlat(into, strip, tier.fibres)
          else if (held.baked) paintFlat(into, strip, tier.fibres, held.baked[0], held.baked[1])
        }
        // Where two tapes cross, the pair decides which lies on top, whichever was laid first. A crossing the
        // lift of a strip in the hand has reached goes with that strip.
        for (const c of town.crossings) if (!held?.dropped.has(c)) paintCrossing(into, c.kind, c.low, c.high, c.dLow, c.dHigh, c.reachLow, c.reachHigh)
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.drawImage(this.floor, 0, 0)
    this.n++
    g.setTransform(scale, 0, 0, scale, ox, oy)
    this.leaves(t, tier.leaves)
    this.fx(town, true)
    this.tape(town)
    if (basketLive) this.wobble('basket', BASKET, 1 + 0.07 * ring(t - town.basketAt, 3.2, 5), 1 - 0.1 * ring(t - town.basketAt, 3.2, 5), 0)
    if (plantLive) this.wobble('plant', PLANT, 1, 1, 0.22 * ring(t - town.plantAt, 2.6, 3.5))
    this.box(town, guidance)
    this.toys(town)
    this.fx(town, false)
    this.inHand(town)
    this.rolls(town, guidance)
    this.cat(town)
    this.carried(town)
    this.hand(town, guidance)
    return this.n
  }

  private layer(w: number, h: number): HTMLCanvasElement {
    const canvas = this.make()
    canvas.width = w
    canvas.height = h
    return canvas
  }

  /** A sprite, painted the first time it is asked for at this density. */
  sprite(name: string, scale: number): HTMLCanvasElement {
    const key = `${name}@${scale}`
    let canvas = this.sprites.get(key)
    if (!canvas) {
      const size = SPRITE_SIZE[name]
      canvas = this.layer(Math.ceil(size.w * scale), Math.ceil(size.h * scale))
      const into = canvas.getContext('2d')
      if (into) {
        into.setTransform(scale, 0, 0, scale, (size.w * scale) / 2, (size.h * scale) / 2)
        paintSprite(into, name)
      }
      this.sprites.set(key, canvas)
    }
    return canvas
  }

  stamp(name: string, scale: number): void {
    const size = SPRITE_SIZE[name]
    this.g.drawImage(this.sprite(name, scale), -size.w / 2, -size.h / 2, size.w, size.h)
    this.n++
  }

  private wobble(name: string, at: Point, sx: number, sy: number, turn: number): void {
    const g = this.g
    g.save()
    g.translate(at.x, at.y)
    g.rotate(turn)
    g.scale(sx, sy)
    this.stamp(name, this.scale)
    g.restore()
  }

  /** Shadows of leaves outside the window, drifting over the patch of sun. */
  private leaves(t: number, count: number): void {
    const g = this.g
    if (count <= 0) return
    g.fillStyle = 'rgba(86, 58, 24, 0.065)'
    g.beginPath()
    for (let i = 0; i < count; i++) {
      const x = 400 + i * 92 + Math.sin(t * 0.31 + i * 1.7) * 34, y = 130 + ((i * 197) % 520) + Math.cos(t * 0.23 + i * 2.3) * 26
      g.moveTo(x + 52, y)
      g.ellipse(x, y, 52, 22, 0.6 + Math.sin(t * 0.4 + i) * 0.25, 0, TAU)
    }
    g.fill()
    this.n++
  }

  /** Tape on the floor that is not in the floor layer: a new strip the press is running along, and what still lies flat of a strip with an end in the hand. */
  private tape(town: Town): void {
    const g = this.g, fronts: { x: number; y: number; angle: number }[] = []
    for (const pressing of town.pressings) {
      const strip = pressing.strip, length = lengthOf(strip), angle = angleOf(strip)
      const reached = Math.min(1, pressing.t / pressing.lasts) * length
      const mx = strip.ax + Math.cos(angle) * reached, my = strip.ay + Math.sin(angle) * reached
      this.n += paintFlat(g, strip, false, 0, reached, true, false)
      this.n += paintLoose(g, strip.kind, mx, my, strip.bx, strip.by, 0.5, true)
      fronts.push({ x: mx, y: my, angle })
    }
    // The bright fronts of every press are one fill together.
    this.n += paintPressFronts(g, fronts)
    const held = this.held
    if (held) for (const [from, to] of held.live) this.n += paintFlat(g, held.strip, false, from, to, true)
  }

  /** Tape that is up off the floor is over everything that stands on it: the strip coming off the roll, the end in the hand, and the oldest strip lifting away. */
  private inHand(town: Town): void {
    const g = this.g
    const pull = town.pull
    if (pull) this.n += paintLoose(g, pull.kind, pull.ax, pull.ay, pull.bx, pull.by, 0.8, false)
    const grip = town.grip
    if (grip) {
      // The end under the finger is up off the boards; as it is pulled back along the strip, the tape comes away as far as the finger has gone.
      const strip = grip.strip, length = lengthOf(strip), angle = angleOf(strip)
      const up = liftedOf(grip)
      const front = grip.end === 0 ? up : length - up
      const fx = strip.ax + Math.cos(angle) * front, fy = strip.ay + Math.sin(angle) * front
      const finger = town.finger ?? grip.at
      const tip = grip.mode === 'peel' ? finger : { x: grip.end === 0 ? strip.ax : strip.bx, y: grip.end === 0 ? strip.ay : strip.by }
      this.n += paintLoose(g, strip.kind, fx, fy, tip.x, tip.y - (grip.mode === 'peel' ? 0 : 7), grip.mode === 'peel' ? 0.9 : 0.5, true)
    }
    for (const lifting of town.lifting) {
      const p = lifting.t / 0.35
      g.save()
      g.globalAlpha = 1 - p
      g.translate(p * 10, -p * 34)
      this.n += paintPatch(g, lifting.strip, 0, lengthOf(lifting.strip))
      g.restore()
    }
  }

  /** What the toys leave behind, one path for each kind: what lies on the floor before the toys, what flies after them. */
  private fx(town: Town, under: boolean): void {
    if (!town.fx.length) return
    const g = this.g, t = town.time
    for (const kind of FX_KINDS) {
      const look = FX[kind]
      if (look.under !== under) continue
      let any = false
      for (const fx of town.fx) {
        if (fx.kind !== kind) continue
        const p = (t - fx.at) / look.lasts
        if (p < 0 || p >= 1) continue
        if (!any) { any = true; g.fillStyle = look.colour; g.beginPath() }
        const c = Math.cos(fx.turn), s = Math.sin(fx.turn)
        const dot = (x: number, y: number, r: number): void => { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU) }
        if (kind === 'spot') for (let k = 0; k < 4; k++) dot(fx.x + Math.cos(fx.turn + k * 1.9) * (18 + k * 9), fx.y + Math.sin(fx.turn + k * 1.9) * (14 + k * 8), (3 + k) * (1 - p * p))
        else if (kind === 'wake') for (const side of [-1, 1]) { const x = fx.x + c * side * (10 + p * 26), y = fx.y + s * side * (10 + p * 26); g.moveTo(x, y); g.ellipse(x, y, 13 * (1 - p), 3.5 * (1 - p), fx.turn + Math.PI / 2, 0, TAU) }
        else if (kind === 'bubble') for (let k = 0; k < 3; k++) dot(fx.x + c * k * 9 - s * p * 14, fx.y + s * k * 9 - p * 26 - k * 5, (3 + k * 1.5) * (1 - p))
        else if (kind === 'drop' || kind === 'drip') for (let k = 0; k < 5; k++) { const a = fx.turn + k * 1.26, far = (kind === 'drop' ? 26 + p * 46 : 8 + p * 18) ; dot(fx.x + Math.cos(a) * far, fx.y + Math.sin(a) * far + p * p * 16, 4 * (1 - p)) }
        else if (kind === 'leaf') for (let k = 0; k < 4; k++) { const a = fx.turn + k * 1.6, far = 14 + p * (40 + k * 14), x = fx.x + Math.cos(a) * far, y = fx.y + Math.sin(a) * far; g.moveTo(x, y); g.ellipse(x, y, 9 * (1 - p * 0.6), 4.5 * (1 - p * 0.6), a + p * 5, 0, TAU) }
        else if (kind === 'puff') dot(fx.x + p * 12, fx.y - p * 40, (8 + p * 14) * (1 - p * p))
        else if (kind === 'cloud') for (let k = 0; k < 5; k++) dot(fx.x + Math.cos(fx.turn + k * 1.3) * (20 + p * 44), fx.y + Math.sin(fx.turn + k * 1.3) * (16 + p * 30) - p * 20, (22 + k * 3) * Math.sin(Math.min(1, p * 4) * Math.PI / 2) * (1 - p * p))
        else for (let k = 0; k < 3; k++) dot(fx.x + Math.cos(fx.turn + k * 2.1) * (10 + p * 26), fx.y + Math.sin(fx.turn + k * 2.1) * (8 + p * 20), (kind === 'dust' ? 7 : 5) * (1 - p))
      }
      if (any) { g.fill(); this.n++ }
    }
  }

  private box(town: Town, guidance: Guidance | null): void {
    const g = this.g, u = town.time - town.boxAt, out = town.state.out
    g.save()
    g.translate(BOX_AT.x, BOX_AT.y)
    if (!out && guidance && guidance.glow > 0) {
      // With the toys in it, the box is what can be touched now: the warm light is where the hand will tap.
      g.fillStyle = `rgba(255, 196, 64, ${0.5 * guidance.glow * (0.7 + 0.3 * Math.sin(town.time * 3))})`
      g.beginPath()
      g.ellipse(0, 0, BOX.w / 2 + 20, BOX.h / 2 + 16, 0, 0, TAU)
      g.fill()
      this.n++
    }
    g.rotate(0.07 * ring(u, 5, 6))
    const squash = 0.05 * ring(u, 3.5, 7)
    g.scale(1 + squash, 1 - squash)
    this.stamp(out ? 'boxTipped' : 'boxUp', this.scale)
    g.restore()
  }

  /** The toys: the heap in the upright box, the ones on the floor, the tape that lies over one, the pegs on the bus, and last whatever is in the air or in the hand. */
  private toys(town: Town): void {
    const g = this.g, out = town.state.out
    if (!out) {
      // Down in the box, seen from above: the heap stays inside the rim.
      g.save()
      g.beginPath()
      g.rect(BOX.x + RIM, BOX.y + RIM, BOX.w - RIM * 2, BOX.h - RIM * 2)
      g.clip()
      for (const id of TOY_IDS) if (!town.bodies[id].flight) paintToy(this, town, id, IN_BOX)
      g.restore()
      for (const id of TOY_IDS) if (town.bodies[id].flight) paintToy(this, town, id)
      return
    }
    // The order is the model's, so that a finger meets what is seen (way.ts). Whoever is afloat under a bridge or a
    // trestle is drawn first, and the road or the rails are laid over it again. The duck there has dived: small, so
    // that at the middle it is gone and at the edges its tail or its bill shows.
    const layers = layersOf(town)
    const overs: Stretch[][] = [[], [], [], []], trims: Record<string, { top: Strip; d: number; reach: number }[]> = { bridge: [], trestle: [] }
    for (const id of layers.under) {
      const over = underOf(town, id)
      if (!over) continue
      paintToy(this, town, id, drawnScale(town, id))
      // A bridge that is being pulled up is no longer over it.
      if (this.held?.dropped.has(over.crossing) && this.held.strip === over.over) continue
      const half = id === 'duck' ? 74 : TOY_SIZE[id].long / 2 + 12
      overs[over.over.kind].push({ strip: over.over, from: over.d - half, to: over.d + half })
      // The parapets or the timber legs are part of what it is under.
      trims[over.crossing.kind]?.push({ top: over.over, d: over.d, reach: (over.crossing.kind === 'bridge' ? over.crossing.reachLow : over.crossing.reachHigh) + 7 })
    }
    // What lies over them is laid again after all of them, each tape in one set of fills however many it is over.
    for (const stretches of overs) this.n += paintOvers(g, stretches, 7)
    for (const kind of ['bridge', 'trestle']) this.n += paintTrims(g, kind, trims[kind])
    for (const id of layers.floor) paintToy(this, town, id)
    for (const id of layers.floor) {
      const body = town.bodies[id], doing = body.doing
      if (doing.is === 'stuck') {
        // The new strip lies across it.
        const d = nearestOn(doing.strip, body.at).d, half = TOY_SIZE[id].long * 0.75
        this.n += paintPatch(g, doing.strip, d - half, d + half)
      }
      const rails = doing.is === 'ride' ? doing : doing.is === 'act' && doing.after?.is === 'ride' ? doing.after : null
      if (rails?.kind === 3) {
        // Whoever travels a rail goes through a tunnel under the hedge, never over it: the hedge lies over it for as
        // long as any of it is under, and shakes while the train's middle is.
        // The hedge is laid again over as much of it as is under the hedge, however the hedge slants across the
        // rails: found by how far along the rails the toy is from the crossing, and by how long and wide it is.
        const size = TOY_SIZE[id]
        const under = (c: Crossing): { from: number; to: number } | null => {
          if (c.kind !== 'tunnel' || nearestOn(c.high, body.at).off >= 24) return null
          const a = angleOf(c.low) - angleOf(c.high), sin = Math.abs(Math.sin(a)), cos = Math.cos(a)
          const along = nearestOn(c.high, body.at).d - c.dHigh
          // Clear of the hedge's width, as far from its middle line as the toy reaches that way.
          if (Math.abs(along) * sin >= TAPE_WIDTH / 2 + (size.long / 2) * sin + (size.wide / 2) * Math.abs(cos) + 12) return null
          const reach = (size.long / 2) * Math.abs(cos) + (size.wide / 2) * sin + 16
          return { from: c.dLow + along * cos - reach, to: c.dLow + along * cos + reach }
        }
        for (const c of town.crossings) {
          const stretch = under(c)
          if (!stretch) continue
          g.save()
          if (id === 'train' && body.hidden) g.translate(Math.sin(town.time * 43) * 1.6, Math.cos(town.time * 37) * 1.6)
          this.n += paintOvers(g, [{ strip: c.low, ...stretch }])
          g.restore()
          break
        }
      }
    }
    this.gates(town)
    for (const id of layers.riding) paintToy(this, town, id)
    for (const id of layers.aloft) paintToy(this, town, id)
  }

  /** The arms of the gates that are down or moving, over whoever is on the floor: an arm is up in the air until it is down. */
  private gates(town: Town): void {
    if (!town.gates.length) return
    const arms: Arm[] = [], down: number[] = []
    for (const gate of town.gates) {
      const crossing = town.crossings.find((c) => c.low === gate.low && c.high === gate.high)
      if (!crossing || this.held?.dropped.has(crossing)) continue
      arms.push(...armsOf(crossing))
      down.push(...gate.down)
    }
    this.n += paintGateArms(this.g, arms, down)
  }

  /** A toy in the hand is above everything on the floor and round it: the rolls, the cat and the box. */
  private carried(town: Town): void {
    if (town.state.out) for (const id of layersOf(town).held) paintToy(this, town, id)
  }

  private rolls(town: Town, guidance: Guidance | null): void {
    const g = this.g, t = town.time, inUse = town.state.roll, pull = town.pull
    ROLLS.forEach((home, kind) => {
      let x = home.x, y = home.y, grow = 1, angle = town.rollTurns[kind] * (Math.PI / 2)
      if (kind === inUse) {
        // The roll in use stands a little proud of the tray, and hops when it is picked.
        const picked = t - town.rollPickedAt
        grow = 1.08 + 0.16 * bump(picked, 0.3)
        angle -= (1 - ease(picked / 0.3)) * (Math.PI / 2)
        if (pull) {
          // In the hand: at the finger, a little ahead of it, turning as the tape comes off.
          const length = Math.hypot(pull.bx - pull.ax, pull.by - pull.ay), way = length > 1 ? Math.atan2(pull.by - pull.ay, pull.bx - pull.ax) : 0
          x = pull.bx + Math.cos(way) * ROLL_RADIUS * 0.8
          y = pull.by + Math.sin(way) * ROLL_RADIUS * 0.8
          angle = way + length / ROLL_RADIUS
          grow = 1.12
        } else if (town.rollFrom) {
          // Let go: it springs back to its place on the tray.
          const back = t - town.rollBackAt, home01 = Math.min(1, ease(back / 0.22) + 0.08 * ring(back - 0.22, 4, 9))
          if (back < 0.8) { x = town.rollFrom.x + (home.x - town.rollFrom.x) * home01; y = town.rollFrom.y + (home.y - town.rollFrom.y) * home01 }
        }
      }
      g.save()
      g.translate(x, y)
      if (kind === inUse && guidance && guidance.glow > 0 && !pull && town.state.out) {
        // What can be touched now breathes with a warm light under it: a soft patch, not a drawn ring.
        g.fillStyle = `rgba(255, 196, 64, ${0.5 * guidance.glow * (0.7 + 0.3 * Math.sin(t * 3))})`
        g.beginPath()
        g.ellipse(0, 0, ROLL_RADIUS + 22, ROLL_RADIUS + 16, 0.5, 0, TAU)
        g.fill()
        this.n++
      }
      g.scale(grow, grow)
      g.rotate(angle)
      this.stamp(`roll${kind}`, this.scale)
      g.restore()
    })
  }

  private cat(town: Town): void {
    const g = this.g, t = town.time, stretch = bump(t - town.catAt, 0.9), startled = Math.max(0, 1 - (t - town.ripAt) / 0.5)
    const breath = catBreath(t)
    // The tail lies out across the boards and flicks at its tip.
    const rootX = CAT.x + CAT.rx - 14, rootY = CAT.y - 4, flick = catTail(t, startled)
    g.lineCap = 'round'
    for (const [colour, wide, from] of [['#3a2a22', 22, 0], ['#2a2a33', 16, 0], ['#f6f1e7', 15, 0.82]] as const) {
      g.strokeStyle = colour
      g.lineWidth = wide
      g.beginPath()
      if (from === 0) {
        g.moveTo(rootX, rootY)
        g.bezierCurveTo(rootX + 60, rootY - 6, rootX + 78, rootY - 60, rootX + 52 + flick * 26, rootY - 104)
      } else {
        g.moveTo(rootX + 58 + flick * 18, rootY - 92)
        g.lineTo(rootX + 52 + flick * 26, rootY - 104)
      }
      g.stroke()
      this.n++
    }
    g.save()
    g.translate(CAT.x, CAT.y)
    g.scale(1 + 0.07 * stretch, 1 + 0.035 * breath - 0.04 * stretch)
    this.stamp('cat', this.scale)
    // One ear turns toward a rip.
    if (startled > 0) {
      g.fillStyle = '#2a2a33'
      g.save()
      g.translate(-CAT.rx + 70, -4)
      g.rotate(0.4 + 0.5 * startled)
      g.beginPath()
      g.moveTo(-14, 0)
      g.lineTo(0, -30)
      g.lineTo(14, 0)
      g.closePath()
      g.fill()
      g.restore()
      this.n++
    }
    // One eye opens when something honks, looks, and shuts again.
    const awake = bump(t - town.honkAt, 1.3)
    if (awake > 0.05) {
      const open = Math.min(1, awake * 2.2)
      g.fillStyle = '#d9e87a'
      g.beginPath()
      g.ellipse(-CAT.rx + 52, 14, 9, 7 * open, -0.2, 0, TAU)
      g.fill()
      g.fillStyle = '#1c1c22'
      g.beginPath()
      g.ellipse(-CAT.rx + 53, 14, 2.6, 6 * open, -0.2, 0, TAU)
      g.fill()
      this.n += 2
    }
    g.restore()
  }

  /** The ghost hand of the idle ladder, showing one move: a pull of tape, or a tap on the box. */
  private hand(town: Town, guidance: Guidance | null): void {
    const g = this.g
    if (!guidance || guidance.demo === null || town.finger) { this.shown = null; return }
    if (!this.shown || this.shown.index !== guidance.demoIndex) this.shown = { index: guidance.demoIndex, hint: town.hint() }
    const hint = this.shown.hint, drag = 'from' in hint
    const pose = handPose(guidance.demo, drag, this.pose)
    let at: Point
    if ('from' in hint) {
      at = { x: hint.from.x + (hint.to.x - hint.from.x) * pose.travel, y: hint.from.y + (hint.to.y - hint.from.y) * pose.travel }
      if (pose.press > 0.5 && pose.travel > 0.02) {
        // A ghost of the strip the pull would lay, in the colour of the roll in use.
        g.globalAlpha = 0.45 * pose.opacity
        g.fillStyle = TAPE_COLOUR[town.state.roll]
        g.save()
        g.translate(hint.from.x, hint.from.y)
        g.rotate(Math.atan2(hint.to.y - hint.from.y, hint.to.x - hint.from.x))
        g.fillRect(0, -TAPE_WIDTH / 2, Math.hypot(at.x - hint.from.x, at.y - hint.from.y), TAPE_WIDTH)
        g.restore()
        this.n++
      }
    } else at = hint.tap
    g.save()
    g.globalAlpha = pose.opacity
    g.translate(at.x, at.y + 52)
    const down = 1 - 0.1 * pose.press
    g.scale(down, down)
    this.stamp('hand', this.scale)
    g.restore()
    g.globalAlpha = 1
  }
}
