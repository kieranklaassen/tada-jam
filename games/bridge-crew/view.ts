import { RAIL_TILT, givePose, poke, reactPose, waitPose, drivePose, type VehiclePose } from './acts'
import { showsStrain, strainLook } from './consequence'
import { movedAfter, strainThinned } from './order'
import { CREW_SCALE } from './crew'
import { crewFigure } from './crewfig'
import { bargeAt, drawSky, drawSplash, drawWaterLife } from './drift'
import { chief, chiefModel, roll } from './figures'
import { barge, compareModels, ideaModel, ideaPieces, lineDrawing, spareWeights, tracingSheet, trolley } from './props'
import { vehicle } from './fleet'
import { LEAVE, PULL, ROLL_IN, swingAt, type Game } from './game'
import { handPose, type Guidance, type HandPose } from './guidance'
import { key, length, samePoint, type Kind, type Part, type Point } from './kit'
import { ROLL, SLIDE_OFF, TRAY, bays, parkAt, rackAt, slideOff, tools, waitAt } from './layout'
import { INK, THICK, pin, stream, string, wood, woodShadow, type Pen, type Wood } from './look'
import { MODEL_PLACE, stringSway } from './motion'
import { WATER, ends } from './pose'
import { paintSheet, plotFor, px, water, type Plot } from './sheet'
import { COLS, isFooting, site, type Idea, type Site, type VehicleId } from './sites'
import { crossingPlace, drawUp, givePlace, rollPlace } from './stage'
import { CHIEF, FLIGHT, RING, featherAt, flightEnds } from './toy'
import { TAIL, VEHICLES } from './vehicles'

// The toy drawn: the still sheet stamped once from an offscreen canvas, then
// the water, the tray's piles, the parts where their springs have them, the
// pins, the chief, and the idle guidance. It reads the toy and never changes
// it. No text is drawn anywhere.

const woodOf = (part: Pick<Part, 'kind' | 'turned'>): Wood => (part.kind === 'plank' ? (part.turned ? 'plank-edge' : 'plank') : part.kind === 'thread' ? 'stick' : part.kind)

/** How each kind shakes when plucked: how far, in cells, and how many times a second. */
const SHAKE: Readonly<Record<Kind, { far: number; beat: number }>> = {
  plank: { far: 0.07, beat: 8 }, stick: { far: 0.035, beat: 21 }, tube: { far: 0.03, beat: 13 }, thread: { far: 0.22, beat: 15 },
}

/**
 * How far the chief has pinned its model together, this far through the
 * showing: the way that fails goes together piece by piece in the first
 * quarter; then, for the idea, the pieces the two have in common stand and
 * the rest go on one by one.
 */
export function modelBuilt(idea: Idea, progress: number): number {
  const share = (a: number, b: number) => Math.max(0, Math.min(1, (progress - a) / (b - a)))
  if (progress < 0.5) return share(0.02, 0.26)
  const whole = ideaPieces(idea, true), common = Math.min(whole - 1, ideaPieces(idea, false))
  return (common + (whole - common) * share(0.5, 0.62)) / whole
}

/** How long the trolley takes to turn over when it is flipped, in seconds. */
const FLIP = 0.3

/** A hat left on a part swings when the part is turned, and comes to rest: how far it leans, in radians, this long after the turn. */
export const hatSwing = (since: number): number => (since >= 0 && since < 1.4 ? 0.9 * Math.sin(since * 11) * (1 - since / 1.4) : 0)

/** The move the ghost hand shows: a part laid between two points on the far bank, away from the gap and clear of the chief and its model. */
export const demoMove = (at: Site): { from: Point; to: Point } => ({ from: [at.right[0] + 1, at.right[1]], to: [at.right[0] + 3, at.right[1] + 1] })

export class View {
  plot: Plot = { cell: 1, ox: 0, oy: 0 }
  private width = 0
  private height = 0
  private ratio = 1
  private grain = true
  private sheet: HTMLCanvasElement | null = null
  private sheetOf = ''
  private readonly sprites = new Map<string, HTMLCanvasElement>()
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  constructor(private readonly seed: number, private readonly make: () => HTMLCanvasElement = () => document.createElement('canvas')) {}

  /** The surface's size in CSS pixels, its pixel ratio, and whether this tier draws the grain. Sprites are made again at the new density. */
  size(width: number, height: number, ratio: number, grain: boolean): void {
    if (width === this.width && height === this.height && ratio === this.ratio && grain === this.grain) return
    this.width = width; this.height = height; this.ratio = ratio; this.grain = grain
    this.plot = plotFor(width, height)
    this.sprites.clear()
    this.sheetOf = ''
  }

  /** A place on the surface, in CSS pixels, as grid cells. */
  toGrid(sx: number, sy: number): [number, number] {
    return [(sx - this.plot.ox) / this.plot.cell, (this.plot.oy - sy) / this.plot.cell]
  }

  /** The bare sheet colour: what is drawn before the saved state has been read. */
  backdrop(pen: Pen): void {
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.fillStyle = INK.sheet
    pen.fillRect(0, 0, this.width * this.ratio, this.height * this.ratio)
  }

  private stamp(pen: Pen, at: Site): void {
    const name = `${at.id}/${at.variant}`
    if (!this.sheet || this.sheetOf !== name) {
      const sheet = this.sheet ?? this.make()
      sheet.width = Math.round(this.width * this.ratio); sheet.height = Math.round(this.height * this.ratio)
      const own = sheet.getContext('2d')
      if (own) { own.setTransform(this.ratio, 0, 0, this.ratio, 0, 0); paintSheet(own, this.width, this.height, this.plot, at, this.seed, true) }
      this.sheet = sheet; this.sheetOf = name
    }
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.drawImage(this.sheet, 0, 0)
    pen.setTransform(this.ratio, 0, 0, this.ratio, 0, 0)
  }

  /** One part as a picture, lying level with its first pin at the picture's own origin: made once for each kind and length. */
  private sprite(kind: Wood, long: number): { canvas: HTMLCanvasElement; pad: number; tall: number } {
    const { cell } = this.plot, pad = (THICK[kind] * 0.5 + 0.12) * cell, tall = (THICK[kind] + 0.16) * cell
    const name = `${kind}:${long.toFixed(3)}`
    let canvas = this.sprites.get(name)
    if (!canvas) {
      canvas = this.make()
      canvas.width = Math.ceil((long * cell + 2 * pad) * this.ratio); canvas.height = Math.ceil(tall * this.ratio)
      const own = canvas.getContext('2d')
      if (own) {
        own.setTransform(this.ratio, 0, 0, this.ratio, 0, 0)
        // Each length has its own grain, the same every time it is made.
        wood(own, kind, pad, tall / 2, pad + long * cell, tall / 2, cell, stream(Math.round(long * 977) + kind.length * 131), false, this.grain)
      }
      this.sprites.set(name, canvas)
    }
    return { canvas, pad, tall }
  }

  /** A wooden or paper part between two places in pixels. `lift` raises its shadow; `deep` squeezes or swells its depth while it turns. */
  private part(pen: Pen, kind: Wood, long: number, a: readonly [number, number], b: readonly [number, number], lift = 1, deep = 1): void {
    if (lift > 0) woodShadow(pen, kind, a[0], a[1], b[0], b[1], this.plot.cell, lift, deep)
    const { canvas, pad, tall } = this.sprite(kind, long)
    pen.save()
    pen.translate(a[0], a[1]); pen.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]))
    pen.drawImage(canvas, -pad, (-tall / 2) * deep, canvas.width / this.ratio, tall * deep)
    pen.restore()
  }

  /** Draws the toy and returns how many things it drew, which a canvas game reports as its draw calls. */
  draw(pen: Pen, toy: Game, guidance: Guidance | null): number {
    const { plot } = this, { cell } = plot, at = toy.at, footing = isFooting(at)
    const at2 = (p: readonly [number, number]) => px(plot, p[0], p[1])
    let drawn = 1
    this.stamp(pen, at)
    // What drifts on the sheet, under everything that lies on it: the sky, the water, and what lives in the water.
    drawn += drawSky(pen, plot, at, toy.seconds)
    water(pen, plot, at, toy.seconds)
    drawn += drawWaterLife(pen, plot, at, toy.seconds, toy.splash && toy.splash.since >= 0 ? toy.splash : null)

    // The tray's piles: as many parts as are left of each kind, and the pile last picked stands a little proud.
    for (const bay of bays(at)) {
      const left = toy.left(bay.kind), picked = toy.selected === bay.kind
      const long = Math.min(bay.x1 - bay.x0 - 0.9, 3), x0 = (bay.x0 + bay.x1 - long) / 2, base = TRAY.top - TRAY.tall + 0.35 + (picked ? 0.1 : 0)
      const pitch = Math.min(0.32, 1.45 / Math.max(left, 1))
      if (bay.kind === 'thread') {
        // The spool: as many turns of string as there are threads left, between two balsa cheeks, and a loose end that sways.
        const mid = (bay.x0 + bay.x1) / 2
        for (let i = 0; i < left; i++) string(pen, ...at2([mid - 0.4, base + 0.12 + i * pitch * 0.9]), ...at2([mid + 0.4, base + 0.18 + i * pitch * 0.9]), cell * 1.5)
        this.part(pen, 'plank', 1.2, at2([mid - 0.6, base]), at2([mid + 0.6, base]), picked ? 1.8 : 1)
        this.part(pen, 'plank', 1.2, at2([mid - 0.6, base + 1.5]), at2([mid + 0.6, base + 1.5]), picked ? 1.8 : 1)
        const sway = stringSway(toy.seconds)
        if (left > 0) string(pen, ...at2([mid + 0.4, base + 0.14]), ...at2([mid + 0.4 + Math.cos(sway) * 0.85, base + 0.1 - Math.sin(sway) * 0.3]), cell, 0.12)
        drawn += left + 3
      } else {
        const kind = woodOf({ kind: bay.kind, turned: false })
        // The whole pile's shadow first, then the parts: one part's shadow never hides the part under it.
        const lie = (i: number) => { const skew = 0.05 * Math.sin(i * 2.4 + bay.x0); return [at2([x0 + skew, base + i * pitch]), at2([x0 + long + skew, base + i * pitch + 0.02 * Math.sin(i * 1.3)])] as const }
        for (let i = 0; i < left; i++) { const [a, b] = lie(i); woodShadow(pen, kind, a[0], a[1], b[0], b[1], cell, picked ? 1.8 : 1) }
        for (let i = 0; i < left; i++) { const [a, b] = lie(i); this.part(pen, kind, long, a, b, 0) }
        drawn += left
      }
      if (picked) this.brackets(pen, at2([bay.x0 + 0.18, TRAY.top - 0.18]), at2([bay.x1 - 0.18, TRAY.top - TRAY.tall + 0.18]), 0.95)
    }
    const glow = guidance ? guidance.glow * (0.6 + 0.4 * Math.sin(toy.seconds * 3)) : 0
    if (glow > 0.01) for (const bay of bays(at)) this.brackets(pen, at2([bay.x0 + 0.1, TRAY.top - 0.1]), at2([bay.x1 - 0.1, TRAY.top - TRAY.tall + 0.1]), glow * 0.9)

    // The parts where their springs have them. String lies under wood, wood under pins.
    const hand = toy.hand
    const sheet = toy.save.sheets[toy.save.on], jobCrossed = strainThinned(at.job, sheet, movedAfter(toy.save.sheets.map((one) => one.site), toy.save.on), toy.save.finished, toy.save.tries)
    // What each part carries now, where a load is on the bridge: a vehicle on a run, or the trolley where it stands or hangs.
    const carried = (index: number): { use: number; strain: string } | null => {
      if (toy.drive) return { use: toy.drive.heard[index] ?? 0, strain: toy.drive.strain[index] ?? 'rest' }
      const state = toy.trolley.at ? toy.answer.parts[index] : undefined
      return state ? { use: state.use, strain: state.strain } : null
    }
    const broken = toy.pieces()
    const pose = toy.bridge.map((part, index) => {
      const carried = hand?.what === 'part' && hand.carried && hand.index === index
      const now = carried ? toy.carriedEnds(hand) : ends(toy.moving[index], length(part))
      // While a part is being laid, what is built leans toward it a little: each pinned end goes with its pin.
      if (!carried && toy.leaning > 0 && toy.rest[index].how === 'firm') for (const end of ['a', 'b'] as const) { if (part.loose === end) continue; const lean = toy.lean(part[end]); now[end][0] += lean[0]; now[end][1] += lean[1] }
      const dx = now.b[0] - now.a[0], dy = now.b[1] - now.a[1], long = Math.hypot(dx, dy) || 1
      // A plucked part shakes across its own length and dies away.
      const rung = toy.shakeOf(index), shake = rung < RING ? SHAKE[part.kind].far * Math.exp(-rung / 0.22) * Math.sin(2 * Math.PI * SHAKE[part.kind].beat * rung) : 0
      // A part that was never turned has been "turning" for ever: every term below is taken only inside the turn.
      const turned = toy.turned[index] < 0.4 ? toy.turned[index] : 0.4, turning = 1 - turned / 0.4
      const hop = part.kind === 'plank' ? 0.12 * Math.sin(Math.PI * Math.min(turned / 0.3, 1)) : part.kind === 'tube' ? 0.05 * turning * Math.sin(2 * Math.PI * 6 * turned) : 0
      const off = part.kind === 'thread' ? 0 : shake + hop
      const ox = (-dy / long) * off, oy = (dx / long) * off
      return { a: at2([now.a[0] + ox, now.a[1] + oy]), b: at2([now.b[0] + ox, now.b[1] + oy]), shake, turning, turned }
    })
    toy.bridge.forEach((part, index) => {
      if (part.kind !== 'thread') return
      const p = pose[index], whirl = p.turning * 0.4 * Math.sin(2 * Math.PI * 3 * p.turned)
      // A thread with wheels on it is a tightrope: it goes down in a V with the wheel, to the water.
      if (broken && broken.part === index) {
        // It parted: two ends, each hanging slack from its own pin.
        string(pen, ...at2(broken.near[0]), ...at2(broken.near[1]), cell, 0.12); string(pen, ...at2(broken.far[0]), ...at2(broken.far[1]), cell, 0.12)
        drawn += 2
        return
      }
      const dip = toy.dipPoint()
      if (dip && dip.part === index) { const v = at2(dip.at); string(pen, ...p.a, ...v, cell, 0); string(pen, ...v, ...p.b, cell, 0); drawn += 2; return }
      // Pulled, it draws thin, by the share of its strength in use, where strain is being shown.
      const load = carried(index), thin = load && load.strain === 'pull' && showsStrain(load.use, jobCrossed) ? 1 - 0.5 * Math.min(1, load.use) : 1
      string(pen, ...p.a, ...p.b, cell * thin, ((toy.rest[index].slack ? 0.3 : 0) + p.shake + whirl) / thin)
      drawn++
    })
    toy.bridge.forEach((part, index) => {
      if (part.kind === 'thread') return
      const p = pose[index], carried_ = hand?.what === 'part' && hand.carried && hand.index === index
      const landing = toy.laid[index] < 0.3 ? 2.5 * (1 - toy.laid[index] / 0.3) : 0
      // A plank turning swells or shrinks to its new depth; a stick spinning flickers thin and thick.
      const was = part.turned ? THICK.plank / THICK['plank-edge'] : THICK['plank-edge'] / THICK.plank
      const deep = part.kind === 'plank' ? 1 + (was - 1) * p.turning ** 2 : part.kind === 'stick' ? 1 - 0.5 * p.turning * Math.abs(Math.sin(2 * Math.PI * 4 * p.turned)) : 1
      if (broken && broken.part === index) {
        // It broke at its spot: two pieces, each hanging from its own pin, which close up again as the bridge goes back.
        for (const [hinge, tip] of [broken.near, broken.far]) this.part(pen, woodOf(part), Math.hypot(tip[0] - hinge[0], tip[1] - hinge[1]), at2(hinge), at2(tip), 1, deep)
        drawn += 2
        return
      }
      // Under a load a pulled part draws thin and a squeezed one bulges, by the share of its strength in use.
      const load = carried(index), shows = load !== null && showsStrain(load.use, jobCrossed)
      let strained = 1
      if (load && shows) { const look = strainLook(load.strain, load.use); strained = 1 - 0.35 * look.thin + 0.5 * look.bulge }
      if (load && shows && load.strain === 'bow' && part.kind !== 'plank') {
        // Squeezed and long, it bows in the middle: two halves that meet off its own line, further the nearer its limit.
        const dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1], long = Math.hypot(dx, dy) || 1, out = cell * 0.3 * Math.min(1, load.use) * (index % 2 ? 1 : -1)
        const mid: [number, number] = [(p.a[0] + p.b[0]) / 2 - (dy / long) * out, (p.a[1] + p.b[1]) / 2 + (dx / long) * out]
        this.part(pen, woodOf(part), length(part) / 2, p.a, mid, 1, deep * strained); this.part(pen, woodOf(part), length(part) / 2, mid, p.b, 1, deep * strained)
        drawn += 2
        return
      }
      // A plank bends in a smooth curve, deepest under the load: drawn as short lengths from point to point along it.
      const curve = part.kind === 'plank' && !carried_ ? toy.bend(index) : []
      if (curve.some((point) => Math.abs(point.off[0]) + Math.abs(point.off[1]) > 0.012)) {
        const points: (readonly [number, number])[] = [p.a, ...curve.map((point): [number, number] => [p.a[0] + (p.b[0] - p.a[0]) * point.share + point.off[0] * cell, p.a[1] + (p.b[1] - p.a[1]) * point.share - point.off[1] * cell]), p.b]
        const each = length(part) / (points.length - 1), kind = woodOf(part)
        for (let i = 0; i + 1 < points.length; i++) woodShadow(pen, kind, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], cell, 1 + landing, deep * strained)
        for (let i = 0; i + 1 < points.length; i++) this.part(pen, kind, each, points[i], points[i + 1], 0, deep * strained)
        drawn += 2
        return
      }
      this.part(pen, woodOf(part), length(part), p.a, p.b, carried_ ? 3 : 1 + landing, deep * strained)
      drawn++
    })

    // A part being laid grows from its pin toward the finger, and a ring marks the grid point it will land on.
    if (hand?.what === 'lay' && hand.pulling) {
      // The pin is on its way to the tray: it is drawn under the finger, lifted, and nothing grows from it.
      pin(pen, ...at2(hand.finger), cell * 1.5, false)
      drawn++
    } else if (hand?.what === 'lay') {
      // Its free end is on a grid point, and goes from grid point to grid point as the finger moves: never between two.
      const from = at2(hand.from)
      if (length({ a: hand.from, b: hand.to }) > 0.05) {
        const tip = at2(hand.to)
        if (hand.kind === 'thread') string(pen, ...from, ...tip, cell, 0.15)
        else wood(pen, woodOf({ kind: hand.kind, turned: false }), from[0], from[1], tip[0], tip[1], cell, stream(7), true, this.grain)
      }
      this.halo(pen, at2(hand.to), 0.24, 1.6)
      pin(pen, from[0], from[1], cell, footing(hand.from))
      drawn += 3
    }

    // The pins: one at each pinned end, where the part is drawn now. A footing pin sits in its drafting triangle.
    const seen = new Set<string>()
    toy.bridge.forEach((part, index) => {
      for (const end of ['a', 'b'] as const) {
        const where = pose[index][end], name = `${Math.round(where[0] / 3)},${Math.round(where[1] / 3)}`
        // Where its pin was taken out: a pinhole, as a dot of the sheet's own shadow.
        if (part.loose === end) { const [hx, hy] = at2(part[end]); pen.fillStyle = INK.shadow; pen.beginPath(); pen.arc(hx, hy, cell * 0.06, 0, Math.PI * 2); pen.fill(); drawn++; continue }
        if (seen.has(name)) continue
        seen.add(name)
        const since = toy.clicked.get(key(part[end]))
        pin(pen, where[0], where[1], cell * (since !== undefined && since < 0.18 ? 1 + 0.8 * (1 - since / 0.18) : 1), footing(part[end]) && toy.rest[index].how === 'firm')
        if (glow > 0.01) this.halo(pen, where, 0.3, glow)
        drawn++
      }
    })
    // A pin that clicked in where no part is pinned shows for a moment and is gone.
    for (const [name, since] of toy.clicked) {
      const [gx, gy] = name.split(',').map(Number)
      if (toy.bridge.some((part) => (!part.loose || part[part.loose][0] !== gx || part[part.loose][1] !== gy) && (samePoint(part.a, [gx, gy]) || samePoint(part.b, [gx, gy])))) continue
      pen.globalAlpha = Math.max(0, 1 - since / 0.6)
      pin(pen, ...at2([gx, gy]), cell * (1 + 0.8 * Math.max(0, 1 - since / 0.18)), footing([gx, gy]))
      pen.globalAlpha = 1
      drawn++
    }
    if (glow > 0.01) for (const lip of [at.left, at.right]) this.halo(pen, at2(lip), 0.3, glow)

    // A part taken off flies to its pile in the tray.
    for (const flight of toy.flying) {
      // Each kind goes back its own way: a plank slides out, a stick is flicked, a tube rolls, a thread whips back.
      const bay = bays(at).find((b) => b.kind === flight.part.kind), t = Math.min(1, flight.since / FLIGHT)
      const home: [number, number] = bay ? [(bay.x0 + bay.x1) / 2, TRAY.top - TRAY.tall / 2] : [0, 0]
      const now = flightEnds(flight.part.kind, flight.a, flight.b, home, t), a = at2(now.a), b = at2(now.b)
      if (flight.part.kind === 'thread') string(pen, ...a, ...b, cell, 0.2 * (1 - t))
      else this.part(pen, woodOf(flight.part), Math.hypot(now.b[0] - now.a[0], now.b[1] - now.a[1]), a, b, 3 - 2 * t)
      drawn++
    }

    drawn += this.cast(pen, toy, guidance)
    // The splash, over whatever made it.
    drawn += drawSplash(pen, plot, at, toy.splash)

    // The crew chief and the small model it is fiddling with, on the near bank.
    const [cx, cy] = at2([CHIEF.x, CHIEF.y])
    // The ledge it stands on: one ruled line in the margin.
    pen.strokeStyle = INK.line
    pen.globalAlpha = 0.9
    pen.lineWidth = Math.max(1.5, cell * 0.05)
    pen.beginPath(); pen.moveTo(cx - cell * 0.7, cy); pen.lineTo(cx + cell * 4.6, cy); pen.stroke()
    pen.globalAlpha = 1
    chief(pen, cx, cy, cell * MODEL_PLACE.chief, toy.chief.pose, stream(11), toy.chiefHat)
    // The model in front of it: the way that fails and then the idea while it shows the neat way; two models side by
    // side while it shows the one change; the idea's model once shown; and its own small triangle otherwise.
    const showing = toy.showing, t = toy.chief.progress
    const span = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)))
    // The models are drawn large enough to read from across the sheet: a cell and a half to the model's own cell.
    if (showing && 'idea' in showing && toy.chief.act === 'shows') ideaModel(pen, showing.idea, cx + cell * MODEL_PLACE.from, cy, (cell * MODEL_PLACE.unit) / 0.9, t >= 0.5, span(0.34, 0.46), stream(12), showing.failure, modelBuilt(showing.idea, t))
    else if (showing && 'differences' in showing) compareModels(pen, showing.differences, cx + cell * 1.4, cy, cell * 1.35, t >= 0.5, t < 0.5 ? span(0.2, 0.34) : span(0.62, 0.76), stream(12))
    else if (toy.marginModel) {
      // Pressed, it gives a little on its ledge; plucked, it shakes from side to side and dies away.
      const rung = toy.modelRung, shake = rung < RING ? 0.06 * Math.exp(-rung / 0.2) * Math.sin(2 * Math.PI * 16 * rung) : 0
      pen.save()
      pen.translate(cx + cell * (MODEL_PLACE.from + shake), cy)
      if (hand?.what === 'model') pen.scale(1.03, 0.9)
      ideaModel(pen, toy.marginModel, 0, 0, (cell * MODEL_PLACE.unit) / 0.9, true, 0, stream(12))
      pen.restore()
    }
    else chiefModel(pen, cx + cell * 1.2, cy, cell * 1.1, stream(12))
    // While it shows something, corner marks round its models lead the eye to the margin.
    if (showing && (toy.chief.act === 'shows' || toy.chief.act === 'compares')) this.brackets(pen, [cx + cell * 1.05, cy - cell * 2.5], [cx + cell * 4.7, cy + cell * 0.25], 0.55 + 0.35 * Math.sin(toy.seconds * 4))
    drawn += 2

    // What touches have left on the sheet: rings, dust, a horn's blast, a feather.
    for (const mark of toy.marks) {
      const t = mark.since / mark.life, [mx, my] = at2(mark.at)
      pen.strokeStyle = INK.line
      pen.lineCap = 'round'
      pen.lineWidth = Math.max(1, cell * 0.03)
      pen.globalAlpha = Math.max(0, 1 - t)
      pen.beginPath()
      if (mark.what === 'ring') {
        // Four specks of the drafting white that fly out from the pin as it clicks in. Filled, and no two opposite.
        pen.fillStyle = INK.line
        for (const turn of [0.5, 2.2, 3.5, 5.4]) { const r = cell * (0.18 + 0.55 * t), sx = mx + Math.cos(turn) * r, sy = my + Math.sin(turn) * r; pen.moveTo(sx + cell * 0.05, sy); pen.arc(sx, sy, cell * 0.05 * (1 - 0.5 * t), 0, Math.PI * 2) }
        pen.fill()
        pen.beginPath()
      } else if (mark.what === 'dust') {
        // Three soft dabs that roll outward and up, filled: an open curl would read as a letter.
        pen.fillStyle = INK.line
        pen.globalAlpha = 0.5 * Math.max(0, 1 - t)
        for (const [dx, lift, size] of [[-0.32, 0.1, 0.09], [0.04, 0.22, 0.07], [0.34, 0.12, 0.1]] as const) { const cx = mx + cell * dx * (0.4 + t), cy = my - cell * lift * (0.3 + 1.6 * t), r = cell * size * (0.6 + t); pen.moveTo(cx + r, cy); pen.ellipse(cx, cy, r, r * 0.7, 0, 0, Math.PI * 2) }
        pen.fill()
        pen.beginPath()
      } else if (mark.what === 'toot') {
        // Three arcs, each wider than the last, going away from the horn.
        for (let i = 0; i < 3; i++) { const r = cell * (0.16 + 0.2 * i + 0.4 * t); pen.moveTo(mx + Math.cos(-0.7) * r, my + Math.sin(-0.7) * r); pen.arc(mx - cell * 0.2, my, r, -0.7, 0.7) }
      } else {
        // A feather: a paper leaf with a pencil quill. It fades only at the end of its time on the ledge.
        const where = featherAt(mark), [fx, fy] = at2([where.x, where.y])
        pen.globalAlpha = Math.min(1, (mark.life - mark.since) / 2)
        pen.save()
        pen.translate(fx, fy); pen.rotate(where.turn)
        pen.fillStyle = INK.paper
        pen.beginPath(); pen.ellipse(0, -cell * 0.03, cell * 0.2, cell * 0.055, 0, 0, Math.PI * 2); pen.fill()
        pen.strokeStyle = INK.steelDark
        pen.lineWidth = Math.max(1, cell * 0.02)
        pen.beginPath(); pen.moveTo(-cell * 0.26, -cell * 0.03); pen.lineTo(cell * 0.18, -cell * 0.03); pen.stroke()
        pen.restore()
        pen.beginPath()
      }
      pen.stroke()
      pen.globalAlpha = 1
      drawn++
    }

    // The crew, at the foot of the sheet.
    for (const who of ['beaver', 'mole'] as const) { const [gx, gy] = toy.crewAt(who); crewFigure(pen, who, ...at2([gx, gy]), cell * CREW_SCALE, toy.crew[who].pose, stream(who === 'beaver' ? 41 : 43)); drawn++ }

    if (guidance && guidance.demo !== null) { this.ghost(pen, toy, guidance); drawn++ }
    return drawn
  }

  /**
   * The cast of the game on the sheet: the pencil ring, the hats left on
   * parts, the vehicles at both banks, on a run and in a scene, the next
   * sheet's roll and the rack. Returns how many things it drew.
   */
  private cast(pen: Pen, game: Game, guidance: Guidance | null): number {
    const { plot } = this, { cell } = plot, at = game.at, show = game.show, sheet = game.save.sheets[game.save.on]
    const at2 = (x: number, y: number) => px(plot, x, y)
    const glow = guidance ? guidance.glow * (0.6 + 0.4 * Math.sin(game.seconds * 3)) : 0
    let drawn = 0
    // The pale pencil ring round the spot where a part gave: it fades as the job vehicle crosses.
    const ring = game.gave ?? sheet.ring ?? (show.kind === 'crossing' ? game.fading : null)
    if (ring) { this.ring(pen, at2(ring.spot[0], ring.spot[1]), 0.34, 0.6 * (show.kind === 'crossing' ? 1 - show.fade : 1)); drawn++ }
    // Splinters where the part is giving, for as long as the bridge lies broken: four chips of the part's own stuff
    // that fly a little way out from the spot. Filled wedges, not rays: rays through one point would read as a sign.
    if (game.gave) {
      const [sx, sy] = at2(game.gave.spot[0], game.gave.spot[1]), kind = game.bridge[game.gave.part]?.kind
      pen.fillStyle = kind === 'tube' ? INK.paper : kind === 'thread' ? INK.string : INK.balsa
      pen.globalAlpha = 1 - show.restore
      for (const [turn, far, size] of [[0.5, 0.42, 0.11], [2.0, 0.34, 0.08], [3.4, 0.46, 0.1], [5.1, 0.3, 0.07]] as const) {
        const r = cell * far * (0.4 + 0.6 * show.snap), cx = sx + Math.cos(turn) * r, cy = sy + Math.sin(turn) * r, spin = turn * 2.3 + show.snap * 3
        pen.beginPath()
        pen.moveTo(cx + Math.cos(spin) * cell * size, cy + Math.sin(spin) * cell * size)
        pen.lineTo(cx + Math.cos(spin + 2.5) * cell * size * 0.6, cy + Math.sin(spin + 2.5) * cell * size * 0.6)
        pen.lineTo(cx + Math.cos(spin + 3.9) * cell * size * 0.5, cy + Math.sin(spin + 3.9) * cell * size * 0.5)
        pen.closePath(); pen.fill()
      }
      pen.globalAlpha = 1
      drawn++
    }
    // A hat left hanging on a part, where the bus's passengers lost it.
    const drawnEnds = game.drawn()
    for (const index of sheet.hats) {
      const where = drawnEnds[index]
      if (!where) continue
      const [hx, hy] = at2((where.a[0] + where.b[0]) / 2, (where.a[1] + where.b[1]) / 2)
      // Whatever hangs on a part swings when the part is turned, and comes to rest.
      const swing = hatSwing(game.turned[index] ?? Infinity)
      pen.save()
      pen.translate(hx, hy); pen.rotate(swing)
      pen.fillStyle = INK.paper
      pen.beginPath(); pen.moveTo(-cell * 0.2, -cell * 0.02); pen.lineTo(cell * 0.2, -cell * 0.02); pen.lineTo(0, -cell * 0.36); pen.closePath(); pen.fill()
      pen.restore()
      drawn++
    }

    drawn += this.tools(pen, game, glow)
    // A tracing laid on the board: the traced design as a white line drawing, lying as it would under the same load.
    if (game.laidTracing !== null && sheet.tracings[game.laidTracing]) { lineDrawing(pen, sheet.tracings[game.laidTracing], game.tracingRest, at2, cell, INK.line, 0.8, (index) => game.bend(index, true), game.tracingGave); drawn++ }
    // Where the traced design has no way under the trolley, its own trolley is drawn in line where it would be: in the water below.
    const stands = game.trolleyPlace()
    if (game.tracingMisses && stands) {
      const [wx, wy] = at2(stands[0], WATER)
      pen.strokeStyle = INK.line
      pen.globalAlpha = 0.8
      pen.lineWidth = Math.max(1, cell * 0.03)
      pen.beginPath()
      pen.roundRect(wx - cell * 0.42, wy - cell * 0.3, cell * 0.84, cell * 0.22, cell * 0.04)
      for (const side of [-1, 1]) { pen.moveTo(wx + side * cell * 0.6, wy); pen.quadraticCurveTo(wx + side * cell * 0.85, wy - cell * 0.14, wx + side * cell * 1.1, wy) }
      pen.stroke()
      pen.globalAlpha = 1
      drawn++
    }
    // The barge, on a sheet where one passes: moored by the near bank, nosing forward and back, and under the bridge and back while a crossing is shown.
    if (at.channel) {
      const passing = show.kind === 'crossing' && game.bargeTook ? Math.sin(Math.PI * show.react) : 0, took = game.bargeTook
      const bx = bargeAt(at, game.seconds, passing) ?? at.channel[0]
      const scrape = took && took.mood === 'dislike' ? passing : 0
      barge(pen, ...at2(bx, WATER), cell, 0.05 * Math.sin(game.seconds * 1.7), scrape, took && took.mood === 'dislike' ? Math.min(1, show.react * 2) * (1 - show.arrive) : 0, took ? (took.mood === 'like' ? passing : -passing) : 0)
      drawn++
    }

    const longOf = (id: VehicleId) => Math.max(...VEHICLES[id].axles)
    const hatsOn = 3 - Math.min(3, sheet.hats.length)
    const put = (id: VehicleId, x: number, y: number, tilt: number, pose: VehiclePose, flip: boolean) => {
      const [sx, sy] = at2(x, y)
      pen.save()
      pen.translate(sx, sy)
      if (flip) pen.scale(-1, 1)
      pen.rotate(-tilt)
      vehicle(pen, id, cell, pose, game.seconds, stream(21), flip, hatsOn, true, tilt)
      pen.restore()
      drawn++
    }
    const busy = game.drive?.vehicle ?? show.vehicle
    const restingPose = (id: VehicleId, front: boolean) => poke(id, game.poked.get(id) ?? 9, waitPose(id, game.seconds, front))
    // Waiting at the near bank, the front of the line by the gap; one that has just arrived draws up from off the sheet.
    // At the free yard: the one that waits rolls back with the finger; let go far enough back, it leaves by the
    // edge of the sheet, and only then does the next of the fleet draw up in its place.
    const swap = game.swap, held = game.hand?.what === 'vehicle' && !game.hand.across ? game.hand : null
    if (swap?.away) { const out = Math.min(1, swap.since / PULL.leaves), stand = waitAt(at, 0) - swap.pulled; put(swap.id, stand - (stand + 4) * out * out, at.left[1], 0, restingPose(swap.id, false), false) }
    game.waiting.forEach((id, place) => {
      if (id === busy) return
      if (swap?.away && place === 0) {
        if (swap.since > PULL.leaves) put(id, drawUp((swap.since - PULL.leaves) / PULL.arrives, at, 0), at.left[1], 0, restingPose(id, false), false)
        return
      }
      const arriving = show.kind === 'crossing' && id === show.arriving && show.arrive < 1
      const drawn = held?.id === id ? held.pulled : swap && swap.id === id ? swap.pulled * (1 - Math.min(1, swap.since / PULL.back)) : 0
      const pose = restingPose(id, place === 0 && !game.playing && drawn === 0)
      put(id, (arriving ? drawUp(show.arrive, at, place) : waitAt(at, place)) + (drawn > 0 ? -drawn : pose.creep), at.left[1], 0, pose, false)
      if (glow > 0.01 && place === 0 && game.ready && drawn === 0) this.brackets(pen, at2(waitAt(at, 0) - longOf(id) - 0.9, at.left[1] + 2.2), at2(waitAt(at, 0) + 0.8, at.left[1] - 0.1), glow * 0.8)
    })
    // One that makes room on a bank of the free yard drives off the sheet: from the far bank on to the right, behind
    // whoever is parked there and behind the roll, as on the road's far lane; from the near bank back off the left edge.
    for (const one of game.leaving) {
      const t = Math.min(1, one.since / LEAVE), from = one.bank === 'far' ? parkAt(at, longOf(one.id), one.place) : waitAt(at, one.place)
      const to = one.bank === 'far' ? COLS + 6 + longOf(one.id) : -4
      put(one.id, from + (to - from) * t * t, one.bank === 'far' ? at.right[1] : at.left[1], 0, restingPose(one.id, false), false)
    }
    // Parked in the lay-by on the far bank.
    game.across.forEach((id, place) => { if (id !== busy) put(id, parkAt(at, longOf(id), place), at.right[1], 0, restingPose(id, false), false) })
    // On a run: seated on the road as it lies under it now.
    const seat = game.seatNow()
    if (game.drive && seat) {
      const flip = game.drive.homeward
      // On a stick it rides a rail, tilting, with its back wheels off; on a plank on edge it wobbles as on a kerb.
      put(game.drive.vehicle, seat.x, seat.y, (flip ? -seat.tilt : seat.tilt) - RAIL_TILT * seat.rail, drivePose(game.drive.vehicle, game.drive.seconds, seat.kerb, undefined, Math.max(0, ...game.drive.heard.filter((use) => showsStrain(use, strainThinned(at.job, sheet, movedAfter(game.save.sheets.map((one) => one.site), game.save.on), game.save.finished, game.save.tries))))), flip)
    }
    // In a scene: where its beats have it.
    if (show.vehicle && show.kind === 'give') {
      const place = givePlace(show, at, longOf(show.vehicle), TAIL[show.vehicle])
      put(show.vehicle, place.x + 0.06 * place.wiggle, place.y, place.tilt, givePose(show.vehicle, game.seconds, show), false)
      if (place.afloat > 0) {
        // Up to its crates in the water: the sheet's blue over what is under the surface, and the rings it makes.
        // Only between the banks: the water is in the gap, and the ground beside it is not painted over.
        const [wx0, wy0] = at2(Math.max(at.left[0] + 0.05, place.x - longOf(show.vehicle) - Math.max(1.2, TAIL[show.vehicle] + 0.4)), WATER), [wx1, wy1] = at2(Math.min(at.right[0] - 0.05, place.x + 1.2), WATER - 1.3)
        pen.fillStyle = INK.sheet
        pen.globalAlpha = 0.82 * place.afloat
        pen.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0)
        pen.globalAlpha = place.afloat
        pen.strokeStyle = INK.line
        pen.lineWidth = Math.max(1, cell * 0.035)
        // A ripple each side of it, each a shallow curve: a level bar beside the crates' numeral would read as a sign.
        pen.beginPath()
        for (const side of [-1, 1]) {
          const rx = at2(place.x - longOf(show.vehicle) / 2 + side * (longOf(show.vehicle) / 2 + 1.05 + 0.5 * show.paddle), WATER)
          pen.moveTo(rx[0] - cell * 0.25, rx[1]); pen.quadraticCurveTo(rx[0], rx[1] - cell * 0.14, rx[0] + cell * 0.25, rx[1])
        }
        pen.stroke()
        pen.globalAlpha = 1
      }
    }
    if (show.vehicle && show.kind === 'crossing' && show.reaction) {
      const id = show.vehicle, long = longOf(id)
      const stays = show.homeward ? waitAt(at, Math.max(0, game.waiting.indexOf(id))) : parkAt(at, long, Math.max(0, game.across.indexOf(id)))
      const place = crossingPlace(show, at, stays)
      // Homeward it faces the near bank until it is in its place, and then turns to the gap again.
      put(id, place.x, place.y, 0, reactPose(id, show.reaction, show.react), show.homeward && show.park < 1)
    }

    // The next sheet, rolled up at the right edge, with the nose of its vehicle showing; and the sheets the child has had, on the rack.
    if (game.save.next && game.save.on === game.save.sheets.length - 1 && game.rollIn !== -1) {
      // It slides in when it arrives: with the crossing that brought it, or after the give that ended a cycle badly.
      const rx = show.kind === 'crossing' && show.rollArrives ? rollPlace(show.arrive, COLS) : game.rollIn < ROLL_IN ? rollPlace(game.rollIn / ROLL_IN, COLS) : ROLL.x
      const next = site(game.save.next.site, game.save.next.variant)
      pen.save()
      const [nx, ny] = at2(rx - 0.25, at.right[1])
      pen.beginPath(); pen.rect(nx - cell * 2, ny - cell * 3, cell * 2, cell * 3.2); pen.clip()
      // It looks out from behind the roll, nose first: its cab and its face show, and the rest of it is behind the roll.
      pen.translate(nx - cell * 1.15, ny)
      pen.scale(-1, 1)
      // Its crates are not yet a load the child is asked for, so no numeral names them here.
      vehicle(pen, next.job, cell * 0.85, waitPose(next.job, game.seconds, false), game.seconds, stream(22), true, 3, false)
      pen.restore()
      const [x, y] = at2(rx, at.right[1])
      roll(pen, x, y, cell * ROLL.tall, cell)
      if (glow > 0.01) this.brackets(pen, [x - cell * 0.55, y - cell * (ROLL.tall + 0.15)], [x + cell * 0.55, y + cell * 0.1], glow * 0.8)
      drawn += 2
    }
    const count = game.save.sheets.length
    if (count > 1) for (let index = 0; index < count; index++) {
      const [x, y] = at2(...rackAt(index, count))
      roll(pen, x, y + cell * 0.7, cell * 1.3, cell * 0.6)
      if (index === game.save.on) this.brackets(pen, [x - cell * 0.42, y - cell * 0.75], [x + cell * 0.42, y + cell * 0.8], 0.9)
      drawn++
    }
    // The oldest sheet, when a seventh was unrolled: it slides off the end of the rack and is gone.
    if (game.slidOff < SLIDE_OFF) {
      const off = slideOff(game.slidOff, count), [x, y] = at2(off.x, off.y)
      pen.globalAlpha = off.fade
      roll(pen, x, y + cell * 0.7, cell * 1.3, cell * 0.6)
      pen.globalAlpha = 1
      drawn++
    }
    return drawn
  }

  /** The two tools beside the tray, and the trolley where it is: in its compartment, in the hand, on the bridge, or falling from it. */
  private tools(pen: Pen, game: Game, glow: number): number {
    const { plot } = this, { cell } = plot, at = game.at, sheet = game.save.sheets[game.save.on], hand = game.hand
    const at2 = (x: number, y: number) => px(plot, x, y)
    const boxes = tools(at), top = TRAY.top, low = TRAY.top - TRAY.tall
    // The box: plain ruled lines, the same every frame.
    pen.strokeStyle = INK.line
    pen.lineWidth = Math.max(1, cell * 0.035)
    pen.globalAlpha = 0.85
    const [x0, y0] = at2(boxes[0].x0, top), [x1, y1] = at2(boxes[1].x1, low), [xm] = at2(boxes[0].x1, 0)
    pen.strokeRect(x0, y0, x1 - x0, y1 - y0)
    pen.beginPath(); pen.moveTo(xm, y0 + cell * 0.2); pen.lineTo(xm, y1 - cell * 0.2); pen.stroke()
    pen.globalAlpha = 1
    if (glow > 0.01) for (const box of boxes) this.brackets(pen, at2(box.x0 + 0.1, top - 0.1), at2(box.x1 - 0.1, low + 0.1), glow * 0.9)

    // The trolley's compartment: the trolley with its stack while it is at home, and the weights not on it.
    const cart = game.trolley, carried = hand?.what === 'trolley' && hand.carried ? hand.finger : null
    const home = at2((boxes[0].x0 + boxes[0].x1) / 2 - 0.25, low + 0.55)
    spareWeights(pen, ...at2(boxes[0].x0 + 0.5, low + 1.6), cell * 0.9, 6 - cart.weights)
    // In the hand it is under the finger, unless the finger has it on the deck, where it rides.
    const riding = carried !== null && cart.at !== null && 'x' in cart.at
    if (carried && !riding) trolley(pen, ...at2(carried[0], carried[1] - 0.2), cell, cart.weights, 'tray', 0, stream(31))
    // At home with the one weight it comes with it has no numeral yet: the numeral names a stack the child set.
    else if (!cart.at && !game.trolleyFell) trolley(pen, home[0], home[1], cell * 1.15, cart.weights, 'tray', 0, stream(31), cart.weights > 1 || game.aside)
    // On the bridge: trundling from where it was set down to where it rests, riding under the plank, or swinging from a pin.
    const place = game.trolleyPlace()
    if (place && cart.at && (!carried || riding)) {
      const rolled = game.trolleyRolled, e = rolled ? Math.min(1, rolled.since / 0.6) : 1
      const x = rolled ? rolled.from + (place[0] - rolled.from) * e * e * (3 - 2 * e) : place[0]
      const how = 'pin' in cart.at ? 'pin' : cart.at.under ? 'under' : 'deck'
      const rung = game.trolleyRung < RING ? 0.04 * Math.sin(game.trolleyRung * 60) * (1 - game.trolleyRung / RING) : 0
      // Flipped, it turns over about the deck: half a turn in a third of a second, to ride under the plank or back on it.
      const over = game.trolleyFlipped < FLIP && how !== 'pin' ? (1 - game.trolleyFlipped / FLIP) * Math.PI * (how === 'under' ? 1 : -1) : 0
      const [tx, ty] = at2(x + rung, place[1] + (how === 'deck' ? 0.11 : 0))
      pen.save()
      pen.translate(tx, ty); pen.rotate(over)
      // Turning over, its numeral is left out: a numeral on its head is no numeral.
      trolley(pen, 0, 0, cell, cart.weights, how, swingAt(game.swing), stream(31), over === 0)
      pen.restore()
    }
    // A part gave under it: it drops into the water where it was, and is back in its compartment.
    if (game.trolleyFell) {
      const f = Math.min(1, game.trolleyFell.since / 0.5), from = game.trolleyFell.from
      if (f < 1 && game.trolleyFell.rolled) {
        // A tube turned under it: it log-rolls off sideways, over and over, into the water.
        const [rx, ry] = at2(from[0] + 0.7 * f, from[1] + (WATER - from[1]) * f * f)
        pen.save(); pen.translate(rx, ry); pen.rotate(2 * Math.PI * f); trolley(pen, 0, 0, cell, cart.weights, 'tray', 0, stream(31), false); pen.restore()
      } else if (f < 1) trolley(pen, ...at2(from[0], from[1] + (WATER - from[1]) * f * f), cell, cart.weights, 'tray', 0, stream(31))
      // On the water it bobs for a moment, and then it is back in its compartment.
      else trolley(pen, ...at2(from[0] + (game.trolleyFell.rolled ? 0.7 : 0), WATER + 0.06 * Math.sin((game.trolleyFell.since - 0.5) * 16) * Math.max(0, 1 - (game.trolleyFell.since - 0.5) / 0.6)), cell, cart.weights, 'tray', 0, stream(31))
    }

    // The tracing paper: the pad at the bottom, and the two tracings kept above it. The one laid on the board is marked.
    const paper = boxes[1], half = (paper.x1 - paper.x0) / 2
    // The pad: three sheets of tracing paper, each a little askew on the one under it, and the pencil that lies on them.
    for (let i = 0; i < 3; i++) { const [px0, py0] = at2(paper.x0 + 0.3 + 0.05 * i, low + 0.9 - 0.06 * i); tracingSheet(pen, px0, py0, (half * 2 - 0.65) * cell, cell * 0.62, cell, []) }
    const [pcx, pcy] = at2(paper.x0 + 0.55, low + 0.42)
    pen.strokeStyle = INK.pencil
    pen.lineCap = 'round'
    pen.lineWidth = Math.max(2, cell * 0.08)
    pen.beginPath(); pen.moveTo(pcx, pcy); pen.lineTo(pcx + cell * 1.1, pcy - cell * 0.22); pen.stroke()
    pen.strokeStyle = INK.steelDark
    pen.beginPath(); pen.moveTo(pcx + cell * 1.1, pcy - cell * 0.22); pen.lineTo(pcx + cell * 1.2, pcy - cell * 0.24); pen.stroke()
    for (const slot of [0, 1] as const) {
      const [sx, sy] = at2(paper.x0 + slot * half + 0.15, top - 0.15)
      tracingSheet(pen, sx, sy, (half - 0.3) * cell, cell * 0.95, cell, sheet.tracings[slot] ?? null)
      if (game.laidTracing === slot) this.brackets(pen, [sx - cell * 0.05, sy - cell * 0.05], [sx + (half - 0.3) * cell + cell * 0.05, sy + cell], 0.95)
    }
    return 4
  }

  /** A soft patch of the drafting white round a point, filled: what glows, what a part will land on, where a pin was. Never a ring: the one ring on the sheet is the pencil ring where a part gave. */
  private halo(pen: Pen, at: readonly [number, number], radius: number, alpha: number): void {
    pen.fillStyle = INK.line
    pen.globalAlpha = alpha * 0.3
    pen.beginPath(); pen.arc(at[0], at[1], radius * this.plot.cell, 0, Math.PI * 2); pen.fill()
    pen.globalAlpha = 1
  }

  /** A thin white ring: the pencil ring round the spot where a part gave. */
  private ring(pen: Pen, at: readonly [number, number], radius: number, alpha: number): void {
    pen.strokeStyle = INK.line
    pen.globalAlpha = alpha
    pen.lineWidth = Math.max(1, this.plot.cell * 0.035)
    pen.beginPath(); pen.arc(at[0], at[1], radius * this.plot.cell, 0, Math.PI * 2); pen.stroke()
    pen.globalAlpha = 1
  }

  /** A soft patch of light over a box: what is picked, what is laid, what glows. Filled, with no outline: corner marks would read as letters. */
  private brackets(pen: Pen, a: readonly [number, number], b: readonly [number, number], alpha: number): void {
    pen.fillStyle = INK.line
    pen.globalAlpha = alpha * 0.16
    pen.beginPath(); pen.roundRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), this.plot.cell * 0.14); pen.fill()
    pen.globalAlpha = 1
  }

  /**
   * The ghost hand: it lays one part between two pins away from the gap, and
   * takes it off again by dragging its middle to the tray. It shows the two
   * gestures a bridge is made and unmade with, and never where a part belongs.
   */
  private ghost(pen: Pen, toy: Game, guidance: Guidance): void {
    const { cell } = this.plot, at = toy.at, progress = guidance.demo ?? 0
    const move = demoMove(at), from = px(this.plot, ...move.from), to = px(this.plot, ...move.to)
    const pile = bays(at).find((bay) => bay.kind === toy.selected) ?? bays(at)[0], home = px(this.plot, (pile.x0 + pile.x1) / 2, TRAY.top - TRAY.tall / 2)
    const laying = progress < 0.5, pose = handPose(laying ? progress / 0.5 : (progress - 0.5) / 0.5, true, this.hand)
    const ghostPart = (a: readonly [number, number], b: readonly [number, number]) => {
      if (toy.selected === 'thread') string(pen, a[0], a[1], b[0], b[1], cell, 0.1)
      else wood(pen, woodOf({ kind: toy.selected, turned: false }), a[0], a[1], b[0], b[1], cell, stream(5), false, false)
    }
    let tip: [number, number]
    pen.globalAlpha = 0.55 * (laying ? pose.opacity : 1 - pose.travel)
    if (laying) {
      // The part grows from the first pin to the second, under the finger.
      tip = [from[0] + (to[0] - from[0]) * pose.travel, from[1] + (to[1] - from[1]) * pose.travel]
      pin(pen, from[0], from[1], cell, false)
      if (pose.travel > 0.02) ghostPart(from, tip)
    } else {
      // Its middle is taken and carried to its pile in the tray, where it is gone.
      const dx = (home[0] - (from[0] + to[0]) / 2) * pose.travel, dy = (home[1] - (from[1] + to[1]) / 2) * pose.travel
      tip = [(from[0] + to[0]) / 2 + dx, (from[1] + to[1]) / 2 + dy]
      if (pose.travel < 0.98) ghostPart([from[0] + dx, from[1] + dy], [to[0] + dx, to[1] + dy])
    }
    // The hand itself: a pale paper cut-out of a pointing finger, a little smaller while it presses.
    const s = cell * (1 - 0.12 * pose.press)
    pen.globalAlpha = 0.8 * pose.opacity
    pen.fillStyle = INK.paper
    pen.strokeStyle = INK.steelDark
    pen.lineWidth = Math.max(1, cell * 0.03)
    pen.beginPath()
    pen.roundRect(tip[0] - s * 0.16, tip[1] - s * 0.05, s * 0.32, s * 0.95, s * 0.16)
    pen.roundRect(tip[0] - s * 0.2, tip[1] + s * 0.62, s * 0.95, s * 0.8, s * 0.3)
    pen.fill(); pen.stroke()
    pen.globalAlpha = 1
  }
}
