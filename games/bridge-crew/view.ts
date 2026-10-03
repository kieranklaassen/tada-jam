import { RAIL_TILT, poke, reactPose, waitPose, drivePose, type VehiclePose } from './acts'
import { showsStrain, strainLook } from './consequence'
import { chief, chiefModel, roll } from './figures'
import { barge, compareModels, ideaModel, lineDrawing, spareWeights, tracingSheet, trolley } from './props'
import { vehicle } from './fleet'
import type { Game } from './game'
import { handPose, type Guidance, type HandPose } from './guidance'
import { key, length, samePoint, type Kind, type Part, type Point } from './kit'
import { ROLL, SLIDE_OFF, TRAY, bays, parkAt, rackAt, slideOff, tools, waitAt } from './layout'
import { INK, THICK, pin, stream, string, wood, woodShadow, type Pen, type Wood } from './look'
import { stringSway } from './motion'
import { WATER, ends } from './pose'
import { paintSheet, plotFor, px, water, type Plot } from './sheet'
import { COLS, isFooting, site, type Site, type VehicleId } from './sites'
import { crossingPlace, drawUp, givePlace, rollPlace } from './stage'
import { CHIEF, FLIGHT, RING } from './toy'
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
    water(pen, plot, at, toy.seconds)

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
    const sheet = toy.save.sheets[toy.save.on], jobCrossed = sheet.crossed.includes(at.job)
    const pose = toy.bridge.map((part, index) => {
      const carried = hand?.what === 'part' && hand.carried && hand.index === index
      const now = carried ? toy.carriedEnds(hand) : ends(toy.moving[index], length(part))
      // While a part is being laid, what is built leans toward it a little: each pinned end goes with its pin.
      if (!carried && toy.leaning > 0 && toy.rest[index].how === 'firm') for (const end of ['a', 'b'] as const) { if (part.loose === end) continue; const lean = toy.lean(part[end]); now[end][0] += lean[0]; now[end][1] += lean[1] }
      const dx = now.b[0] - now.a[0], dy = now.b[1] - now.a[1], long = Math.hypot(dx, dy) || 1
      // A plucked part shakes across its own length and dies away.
      const rung = toy.rung[index], shake = rung < RING ? SHAKE[part.kind].far * Math.exp(-rung / 0.22) * Math.sin(2 * Math.PI * SHAKE[part.kind].beat * rung) : 0
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
      const dip = toy.dipPoint()
      if (dip && dip.part === index) { const v = at2(dip.at); string(pen, ...p.a, ...v, cell, 0); string(pen, ...v, ...p.b, cell, 0); drawn += 2; return }
      string(pen, ...p.a, ...p.b, cell, (toy.rest[index].slack ? 0.3 : 0) + p.shake + whirl)
      drawn++
    })
    toy.bridge.forEach((part, index) => {
      if (part.kind === 'thread') return
      const p = pose[index], carried = hand?.what === 'part' && hand.carried && hand.index === index
      const landing = toy.laid[index] < 0.3 ? 2.5 * (1 - toy.laid[index] / 0.3) : 0
      // A plank turning swells or shrinks to its new depth; a stick spinning flickers thin and thick.
      const was = part.turned ? THICK.plank / THICK['plank-edge'] : THICK['plank-edge'] / THICK.plank
      const deep = part.kind === 'plank' ? 1 + (was - 1) * p.turning ** 2 : part.kind === 'stick' ? 1 - 0.5 * p.turning * Math.abs(Math.sin(2 * Math.PI * 4 * p.turned)) : 1
      // Under a load a pulled part draws thin and a squeezed one bulges, by the share of its strength in use.
      const drive = toy.drive
      let strained = 1
      if (drive && showsStrain(drive.heard[index] ?? 0, jobCrossed)) { const look = strainLook(drive.strain[index] ?? 'rest', drive.heard[index] ?? 0); strained = 1 - 0.35 * look.thin + 0.5 * look.bulge }
      this.part(pen, woodOf(part), length(part), p.a, p.b, carried ? 3 : 1 + landing, deep * strained)
      drawn++
    })

    // A part being laid grows from its pin toward the finger, and a ring marks the grid point it will land on.
    if (hand?.what === 'lay') {
      const from = at2(hand.from), dx = hand.finger[0] - hand.from[0], dy = hand.finger[1] - hand.from[1]
      const far = Math.hypot(dx, dy), long = Math.min(far, length({ a: hand.from, b: hand.to }) + 0.5)
      if (far > 0.05) {
        const tip = at2([hand.from[0] + (dx / far) * long, hand.from[1] + (dy / far) * long])
        if (hand.kind === 'thread') string(pen, ...from, ...tip, cell, 0.15)
        else wood(pen, woodOf({ kind: hand.kind, turned: false }), from[0], from[1], tip[0], tip[1], cell, stream(7), true, this.grain)
      }
      this.ring(pen, at2(hand.to), 0.2, 0.95)
      pin(pen, from[0], from[1], cell, footing(hand.from))
      drawn += 3
    }

    // The pins: one at each pinned end, where the part is drawn now. A footing pin sits in its drafting triangle.
    const seen = new Set<string>()
    toy.bridge.forEach((part, index) => {
      for (const end of ['a', 'b'] as const) {
        const where = pose[index][end], name = `${Math.round(where[0] / 3)},${Math.round(where[1] / 3)}`
        if (part.loose === end) { this.ring(pen, at2(part[end]), 0.1, 0.8); drawn++; continue }
        if (seen.has(name)) continue
        seen.add(name)
        const since = toy.clicked.get(key(part[end]))
        pin(pen, where[0], where[1], cell * (since !== undefined && since < 0.18 ? 1 + 0.8 * (1 - since / 0.18) : 1), footing(part[end]) && toy.rest[index].how === 'firm')
        if (glow > 0.01) this.ring(pen, where, 0.24, glow * 0.8)
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
    if (glow > 0.01) for (const lip of [at.left, at.right]) this.ring(pen, at2(lip), 0.24, glow * 0.8)

    // A part taken off flies to its pile in the tray.
    for (const flight of toy.flying) {
      const bay = bays(at).find((b) => b.kind === flight.part.kind), t = Math.min(1, flight.since / FLIGHT), e = t * t * (3 - 2 * t)
      const home: [number, number] = bay ? [(bay.x0 + bay.x1) / 2, TRAY.top - TRAY.tall / 2] : [0, 0], half = length(flight.part) / 2
      const a = at2([flight.a[0] + (home[0] - half - flight.a[0]) * e, flight.a[1] + (home[1] - flight.a[1]) * e]), b = at2([flight.b[0] + (home[0] + half - flight.b[0]) * e, flight.b[1] + (home[1] - flight.b[1]) * e])
      if (flight.part.kind === 'thread') string(pen, ...a, ...b, cell, 0.2)
      else this.part(pen, woodOf(flight.part), length(flight.part), a, b, 3 - 2 * e)
      drawn++
    }

    drawn += this.cast(pen, toy, guidance)

    // The crew chief and the small model it is fiddling with, on the near bank.
    const [cx, cy] = at2([CHIEF.x, CHIEF.y])
    // The ledge it stands on: one ruled line in the margin.
    pen.strokeStyle = INK.line
    pen.globalAlpha = 0.9
    pen.lineWidth = Math.max(1.5, cell * 0.05)
    pen.beginPath(); pen.moveTo(cx - cell * 0.7, cy); pen.lineTo(cx + cell * 4.6, cy); pen.stroke()
    pen.globalAlpha = 1
    chief(pen, cx, cy, cell * 1.1, toy.chief.pose, stream(11), toy.chiefHat)
    // The model in front of it: the way that fails and then the idea while it shows the neat way; two models side by
    // side while it shows the one change; the idea's model once shown; and its own small triangle otherwise.
    const showing = toy.showing, t = toy.chief.progress
    const span = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)))
    // The models are drawn large enough to read from across the sheet: a cell and a half to the model's own cell.
    if (showing && 'idea' in showing && toy.chief.act === 'shows') ideaModel(pen, showing.idea, cx + cell * 1.5, cy, cell * 1.9, t >= 0.5, span(0.34, 0.46), stream(12))
    else if (showing && 'differences' in showing) compareModels(pen, showing.differences, cx + cell * 1.4, cy, cell * 1.35, t >= 0.5, t < 0.5 ? span(0.2, 0.34) : span(0.62, 0.76), stream(12))
    else if (toy.marginModel) {
      // Pressed, it gives a little on its ledge; plucked, it shakes from side to side and dies away.
      const rung = toy.modelRung, shake = rung < RING ? 0.06 * Math.exp(-rung / 0.2) * Math.sin(2 * Math.PI * 16 * rung) : 0
      pen.save()
      pen.translate(cx + cell * (1.5 + shake), cy)
      if (hand?.what === 'model') pen.scale(1.03, 0.9)
      ideaModel(pen, toy.marginModel, 0, 0, cell * 1.9, true, 0, stream(12))
      pen.restore()
    }
    else chiefModel(pen, cx + cell * 1.2, cy, cell * 1.1, stream(12))
    // While it shows something, corner marks round its models lead the eye to the margin.
    if (showing && (toy.chief.act === 'shows' || toy.chief.act === 'compares')) this.brackets(pen, [cx + cell * 1.05, cy - cell * 2.5], [cx + cell * 4.7, cy + cell * 0.25], 0.55 + 0.35 * Math.sin(toy.seconds * 4))
    drawn += 2

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
    const ring = game.gave ?? sheet.ring
    if (ring) { this.ring(pen, at2(ring.spot[0], ring.spot[1]), 0.34, 0.6 * (show.kind === 'crossing' ? 1 - show.fade : 1)); drawn++ }
    // A splinter where the part is giving, for as long as the bridge lies broken.
    if (game.gave) {
      const [sx, sy] = at2(game.gave.spot[0], game.gave.spot[1])
      pen.strokeStyle = INK.line
      pen.lineWidth = Math.max(1, cell * 0.04)
      pen.globalAlpha = 1 - show.restore
      pen.beginPath()
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, r0 = cell * 0.12, r1 = cell * (0.3 + 0.25 * show.snap * (i % 2 ? 1 : 0.6)); pen.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); pen.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1) }
      pen.stroke()
      pen.globalAlpha = 1
      drawn++
    }
    // A hat left hanging on a part, where the bus's passengers lost it.
    const drawnEnds = game.drawn()
    for (const index of sheet.hats) {
      const where = drawnEnds[index]
      if (!where) continue
      const [hx, hy] = at2((where.a[0] + where.b[0]) / 2, (where.a[1] + where.b[1]) / 2)
      pen.fillStyle = INK.paper
      pen.beginPath(); pen.moveTo(hx - cell * 0.2, hy - cell * 0.02); pen.lineTo(hx + cell * 0.2, hy - cell * 0.02); pen.lineTo(hx, hy - cell * 0.36); pen.closePath(); pen.fill()
      drawn++
    }

    drawn += this.tools(pen, game, glow)
    // A tracing laid on the board: the traced design as a white line drawing, lying as it would under the same load.
    if (game.laidTracing !== null && sheet.tracings[game.laidTracing]) { lineDrawing(pen, sheet.tracings[game.laidTracing], game.tracingRest, at2, cell, INK.line, 0.8); drawn++ }
    // The barge, on a sheet where one passes: moored by the near bank, nosing forward and back, and under the bridge and back while a crossing is shown.
    if (at.channel) {
      const passing = show.kind === 'crossing' && game.bargeTook ? Math.sin(Math.PI * show.react) : 0, took = game.bargeTook
      const bx = at.left[0] + 2 + 0.2 * Math.sin(game.seconds * 0.9) + passing * (at.channel[1] - at.left[0] - 1.5)
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
      vehicle(pen, id, cell, pose, game.seconds, stream(21), flip, hatsOn)
      pen.restore()
      drawn++
    }
    const busy = game.drive?.vehicle ?? show.vehicle
    const restingPose = (id: VehicleId, front: boolean) => poke(id, game.poked.get(id) ?? 9, waitPose(id, game.seconds, front))
    // Waiting at the near bank, the front of the line by the gap; one that has just arrived draws up from off the sheet.
    game.waiting.forEach((id, place) => {
      if (id === busy) return
      const arriving = show.kind === 'crossing' && !show.homeward && id === at.extra && show.arrive < 1
      const pose = restingPose(id, place === 0 && !game.playing)
      put(id, (arriving ? drawUp(show.arrive, at, place) : waitAt(at, place)) + pose.creep, at.left[1], 0, pose, false)
      if (glow > 0.01 && place === 0 && game.ready) this.ring(pen, at2(waitAt(at, 0) - longOf(id) / 2, at.left[1] + 0.9), 1.05, glow * 0.7)
    })
    // Parked in the lay-by on the far bank.
    game.across.forEach((id, place) => { if (id !== busy) put(id, parkAt(at, longOf(id), place), at.right[1], 0, restingPose(id, false), false) })
    // On a run: seated on the road as it lies under it now.
    const seat = game.seatNow()
    if (game.drive && seat) {
      const flip = game.drive.homeward
      // On a stick it rides a rail, tilting, with its back wheels off; on a plank on edge it wobbles as on a kerb.
      put(game.drive.vehicle, seat.x, seat.y, (flip ? -seat.tilt : seat.tilt) - RAIL_TILT * seat.rail, drivePose(game.drive.vehicle, game.drive.seconds, seat.kerb), flip)
    }
    // In a scene: where its beats have it.
    if (show.vehicle && show.kind === 'give') {
      const place = givePlace(show, at, longOf(show.vehicle), TAIL[show.vehicle])
      put(show.vehicle, place.x + 0.06 * place.wiggle, place.y, place.tilt, drivePose(show.vehicle, game.seconds), false)
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
        pen.beginPath()
        for (const side of [-1, 1]) { const rx = at2(place.x - longOf(show.vehicle) / 2 + side * (longOf(show.vehicle) / 2 + 0.8 + 0.5 * show.paddle), WATER); pen.moveTo(rx[0] - cell * 0.25, rx[1]); pen.lineTo(rx[0] + cell * 0.25, rx[1]) }
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
    if (game.save.next && game.save.on === game.save.sheets.length - 1) {
      const rx = show.kind === 'crossing' && !show.homeward ? rollPlace(show.arrive, COLS) : ROLL.x
      const next = site(game.save.next.site, game.save.next.variant)
      pen.save()
      const [nx, ny] = at2(rx - 0.25, at.right[1])
      pen.beginPath(); pen.rect(nx - cell * 2, ny - cell * 3, cell * 2, cell * 3.2); pen.clip()
      pen.translate(nx + cell * 0.7, ny)
      // Its crates are not yet a load the child is asked for, so no numeral names them here.
      vehicle(pen, next.job, cell * 0.85, waitPose(next.job, game.seconds, false), game.seconds, stream(22), false, 3, false)
      pen.restore()
      const [x, y] = at2(rx, at.right[1])
      roll(pen, x, y, cell * ROLL.tall, cell)
      if (glow > 0.01) this.ring(pen, [x, y - cell * 1.5], 0.9, glow * 0.7)
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
    if (carried) trolley(pen, ...at2(carried[0], carried[1] - 0.2), cell, cart.weights, 'tray', 0, stream(31))
    else if (!cart.at && !game.trolleyFell) trolley(pen, home[0], home[1], cell * 1.15, cart.weights, 'tray', 0, stream(31))
    // On the bridge: trundling from where it was set down to where it rests, riding under the plank, or swinging from a pin.
    const place = game.trolleyPlace()
    if (place && cart.at && !carried) {
      const rolled = game.trolleyRolled, e = rolled ? Math.min(1, rolled.since / 0.6) : 1
      const x = rolled ? rolled.from + (place[0] - rolled.from) * e * e * (3 - 2 * e) : place[0]
      const how = 'pin' in cart.at ? 'pin' : cart.at.under ? 'under' : 'deck'
      const rung = game.trolleyRung < RING ? 0.04 * Math.sin(game.trolleyRung * 60) * (1 - game.trolleyRung / RING) : 0
      trolley(pen, ...at2(x + rung, place[1] + (how === 'deck' ? 0.11 : 0)), cell, cart.weights, how, 0.3 * Math.sin(game.seconds * 2.6), stream(31))
    }
    // A part gave under it: it drops into the water where it was, and is back in its compartment.
    if (game.trolleyFell) {
      const f = Math.min(1, game.trolleyFell.since / 0.5), from = game.trolleyFell.from
      if (f < 1) trolley(pen, ...at2(from[0], from[1] + (WATER - from[1]) * f * f), cell, cart.weights, 'tray', 0, stream(31))
      else this.ring(pen, at2(from[0], WATER), 0.3 + 0.8 * (game.trolleyFell.since - 0.5), Math.max(0, 1 - (game.trolleyFell.since - 0.5) / 0.6))
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

  /** A thin white ring: the draughtsman's circle round a point. */
  private ring(pen: Pen, at: readonly [number, number], radius: number, alpha: number): void {
    pen.strokeStyle = INK.line
    pen.globalAlpha = alpha
    pen.lineWidth = Math.max(1, this.plot.cell * 0.035)
    pen.beginPath(); pen.arc(at[0], at[1], radius * this.plot.cell, 0, Math.PI * 2); pen.stroke()
    pen.globalAlpha = 1
  }

  /** Four corner marks round a box, as a draughtsman marks a selection. */
  private brackets(pen: Pen, a: readonly [number, number], b: readonly [number, number], alpha: number): void {
    const arm = this.plot.cell * 0.45
    pen.strokeStyle = INK.line
    pen.globalAlpha = alpha
    pen.lineWidth = Math.max(1.5, this.plot.cell * 0.06)
    pen.lineCap = 'round'
    pen.beginPath()
    for (const [x, sx] of [[a[0], 1], [b[0], -1]] as const) for (const [y, sy] of [[a[1], 1], [b[1], -1]] as const) {
      pen.moveTo(x + sx * arm, y); pen.lineTo(x, y); pen.lineTo(x, y + sy * arm)
    }
    pen.stroke()
    pen.globalAlpha = 1
  }

  /** The ghost hand: one move a child could make now, shown and never told. It lays a part on the far bank, or it picks another pile. */
  private ghost(pen: Pen, toy: Game, guidance: Guidance): void {
    const { cell } = this.plot, at = toy.at, piles = bays(at)
    // With a road from lip to lip the next thing a child would want is to send the vehicle; with a roll waiting, to unroll it.
    const sending = toy.ready && toy.waiting.length > 0 && guidance.demoIndex % 2 === 0
    const unrolling = !sending && toy.save.next !== null && toy.ready
    // With every part of the kit laid and still no road, the next thing is to take one back: the hand carries a part to the tray.
    const spent = !sending && !unrolling && toy.bridge.length > 0 && piles.every((bay) => toy.left(bay.kind) === 0)
    const picking = !sending && !unrolling && !spent && guidance.demoIndex % 2 === 1 && piles.length > 1
    const pose = handPose(guidance.demo ?? 0, !picking && !sending && !unrolling, this.hand)
    let tip: [number, number]
    if (spent) {
      const last = toy.drawn()[toy.bridge.length - 1], from = px(this.plot, (last.a[0] + last.b[0]) / 2, (last.a[1] + last.b[1]) / 2)
      const to = px(this.plot, (piles[0].x0 + piles[0].x1) / 2, TRAY.top - TRAY.tall / 2)
      tip = [from[0] + (to[0] - from[0]) * pose.travel, from[1] + (to[1] - from[1]) * pose.travel]
    } else if (sending) tip = px(this.plot, waitAt(at, 0) - 0.4, at.left[1] + 0.9)
    else if (unrolling) tip = px(this.plot, ROLL.x - 0.2, at.right[1] + 1.4)
    else if (picking) {
      const other = piles[(piles.findIndex((bay) => bay.kind === toy.selected) + 1) % piles.length]
      tip = px(this.plot, (other.x0 + other.x1) / 2, TRAY.top - TRAY.tall / 2)
    } else {
      const move = demoMove(at), from = px(this.plot, ...move.from), to = px(this.plot, ...move.to)
      tip = [from[0] + (to[0] - from[0]) * pose.travel, from[1] + (to[1] - from[1]) * pose.travel]
      pen.globalAlpha = 0.55 * pose.opacity
      pin(pen, from[0], from[1], cell, false)
      if (pose.travel > 0.02) {
        if (toy.selected === 'thread') string(pen, ...from, ...tip, cell, 0.1)
        else wood(pen, woodOf({ kind: toy.selected, turned: false }), from[0], from[1], tip[0], tip[1], cell, stream(5), false, false)
      }
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
