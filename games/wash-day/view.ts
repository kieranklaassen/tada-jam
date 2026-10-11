import { KINDS, decodeMud, cleanMud, mudLeft, type Kind } from './cloth'
import type { Tier } from './config'
import { Figures, type Form, type GarmentState, type Look, type Tally } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { BOARD, CAT, GATE, HELD, HILL, HILL_SCALE, HUNG, LINE, PEG_REACH, PUDDLE, TUB, WAIT_HELD, WAIT_SCALE, YARD_SCALE, clothToStage, fluffScale, hungStretch, lineY, type FriendKind } from './layout'
import { GUST_EVERY, SLEEVE, idle, linePose, railPose, react, stretched, tubPose, walk, windAt, type Hang, type Pose } from './motion'
import { THREAD, paintBoard, paintBorder, paintGate, paintLinen, paintPuddle, paintTubFront, paintYard } from './scenery'
import { fit, type Fit } from './stage'
import { canvasOf, shade, sprite, type Ctx, type Sprite } from './stitch'
import { DAMP, SOAPY, anchorAtRest, fitOf } from './taste'
import { CLAP_AFTER_GUST, CLAP_AFTER_PEG, LATHER_S, fliesOn, flown, murky, type Figure, type Garment, type Yard } from './yard'

// Draws the yard: the still picture stamped once, then the pieces that move,
// put together from the model's numbers. It keeps nothing of its own but the
// sprites, so a frame drawn twice is the same frame. `tally` counts every
// stamp of a cached picture and every live stroke or fill of the frame, the
// ones made into a cached picture included.

const TAU = Math.PI * 2
const BIRD = 0.185
/** The box of the far hill that those who walked off stand in. */
const HILL_BOX = { x: 520, y: 196, w: 420, h: 140 }
/** The pucker under the finger on each cloth: how wide the ring is, how far its stitches are pulled in, and how long a tail drags behind the finger. */
export const DIMPLE: Record<Kind, { wide: number; deep: number; tail: number }> = {
  sock: { wide: 1, deep: 1, tail: 0 }, shirt: { wide: 1, deep: 1, tail: 0 }, dungarees: { wide: 1, deep: 1, tail: 30 },
  jumper: { wide: 1.5, deep: 2.4, tail: 0 }, hat: { wide: 1, deep: 1, tail: 0 }, scarf: { wide: 1, deep: 1, tail: 0 },
}
/** Making room on the hill: the width cut out for each who stands there, how far one of the oldest walks to the left as it goes, and how far under its feet the crest lies that hides it. */
const HILL_COLUMN = 140, HILL_OVER = 60, HILL_FEET = 6
/** How far each kind sinks into the tub: the pig to its snout, the heron hardly, the goat to its chest. */
const SINK: Record<FriendKind, number> = { pig: 150, heron: 40, goat: 96 }
const PHASE: Record<FriendKind, number> = { pig: 0, heron: 1.7, goat: 3.4 }
const NO_HIDE: readonly number[] = []
/** Into how many bands a wrung thing is cut, to show its turns: the sock a tight screw, the scarf a rope of many turns. The rest do not twist so. */
export const SCREW: Record<Kind, number> = { sock: 4, shirt: 0, dungarees: 0, jumper: 0, hat: 0, scarf: 7 }

/** Where the bobble floats in the tub, from the middle of the hat's slot, and how far it bobs: on the water over the place the hat goes down. */
export const BOBBLE_FLOAT = { dx: -6, dy: -10, bob: 2 }

/**
 * Where the hat's bobble is while the hat is in the tub, at game time `t`: on the water beside the hat's slot,
 * bobbing. It takes nothing from how the hat lies, so it is above the water line whatever the hat does: while the
 * hat floats upside down, as it tips, and after it has gone under.
 */
export function bobbleAfloat(at: { x: number; y: number }, t: number): { x: number; y: number } {
  return { x: at.x + BOBBLE_FLOAT.dx, y: at.y + BOBBLE_FLOAT.dy + BOBBLE_FLOAT.bob * Math.sin(t * 2.2) }
}

/** How much longer than it sits the cat hangs from its peg when nobody stands near it. */
export const CAT_HANG = HUNG.long

export class YardView {
  private readonly g: Ctx
  private ratio = 1
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private still: HTMLCanvasElement | null = null
  private figures: Figures | null = null
  private board: Sprite | null = null
  private tubFront: Sprite | null = null
  private puddle: Sprite | null = null
  private gate: Sprite | null = null
  private hill: HTMLCanvasElement | null = null
  private hillOf: unknown = null
  private builtAt = 0
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly flies: number[] = []
  private core = true
  readonly tally: Tally = { stamps: 0, pen: 0 }

  constructor(canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!
  }

  /** The fit of the stage in the surface, for bringing a touch back to stage units. */
  get fit(): Fit {
    return this.by
  }

  /** The surface has a new size in CSS pixels, or a new pixel ratio: the still picture is painted again, and the pieces are stitched again at the new density. */
  resize(width: number, height: number, ratio: number): void {
    this.ratio = ratio
    this.by = fit(width, height)
    const k = this.by.scale * ratio
    if (!(k > 0)) return
    const still = canvasOf(width * ratio, height * ratio)
    const g = still.getContext('2d')!
    g.lineCap = 'round'
    g.lineJoin = 'round'
    paintLinen(g, still.width, still.height, k)
    g.setTransform(k, 0, 0, k, ratio * this.by.x, ratio * this.by.y)
    paintYard(g, { left: this.by.x / this.by.scale, right: this.by.x / this.by.scale, top: this.by.y / this.by.scale, bottom: this.by.y / this.by.scale })
    g.setTransform(1, 0, 0, 1, 0, 0)
    paintBorder(g, still.width, still.height, k)
    this.still = still
    if (Math.abs(k - this.builtAt) > 0.001) {
      this.builtAt = k
      this.figures = new Figures(k)
      this.board = sprite(BOARD.w, BOARD.h, k, paintBoard)
      this.tubFront = sprite(TUB.rx * 2 + 20, TUB.depth + TUB.ry + 20, k, paintTubFront)
      this.puddle = sprite(PUDDLE.rx * 2 + 24, PUDDLE.ry * 2 + 24, k, paintPuddle)
      this.gate = sprite(GATE.w + 16, GATE.h + 20, k, paintGate)
      this.hill = canvasOf(HILL_BOX.w * k, HILL_BOX.h * k)
      this.hillOf = null
    }
  }

  /** Draws one frame. With no yard yet (the slot is still being read) it shows the still picture alone. */
  draw(yard: Yard | null, guidance: Guidance | null, tier: Tier): void {
    const g = this.g, k = this.by.scale * this.ratio
    this.tally.stamps = 0; this.tally.pen = 0
    if (!(k > 0) || !this.still) return
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.drawImage(this.still, 0, 0)
    this.tally.stamps += 1
    if (!yard || !this.figures || !this.board || !this.tubFront || !this.puddle || !this.gate || !this.hill) return
    g.setTransform(k, 0, 0, k, this.ratio * this.by.x, this.ratio * this.by.y)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    this.core = tier.core
    this.flies.length = 0
    const tally = this.tally
    const everyone: Figure[] = [...yard.friends, ...yard.leaving]

    this.drawHill(g, yard, k)
    // Those behind the gate, then the gate in front of them.
    for (const figure of everyone) if (figure.clip) this.drawFigure(g, yard, figure)
    g.save()
    g.translate(GATE.x + GATE.w + 8 + yard.gate.rattle * 3, GATE.y - 8)
    g.scale(1 - 0.82 * yard.gate.open, 1)
    g.drawImage(this.gate.canvas, -GATE.w - 16, 0, this.gate.w, this.gate.h)
    g.restore()
    tally.stamps += 1

    this.drawLine(g, yard)
    for (const garment of yard.garments) if (garment.at === 'line' && this.rests(yard, garment)) this.drawResting(g, yard, garment)
    if (yard.cat.at !== 'board') this.drawCat(g, yard)
    for (const garment of yard.garments) if (garment.at === 'rail' && this.rests(yard, garment)) this.drawResting(g, yard, garment)
    this.drawTub(g, yard)

    // The friends in the yard, from the back to the front, each with what it holds.
    const standing = everyone.filter((figure) => !figure.clip && !('where' in figure && figure.where === 'tub' && figure.sunk > 0.05)).sort((a, b) => a.y - b.y)
    for (const figure of standing) this.drawFigure(g, yard, figure)

    // The puddle, which squashes when it is touched, and what lies in it or on the grass.
    g.save()
    g.translate(PUDDLE.x, PUDDLE.y)
    g.scale(1 + yard.puddle.squash * 0.3, 1 - yard.puddle.squash * 0.5)
    g.drawImage(this.puddle.canvas, -this.puddle.w / 2, -this.puddle.h / 2, this.puddle.w, this.puddle.h)
    g.restore()
    tally.stamps += 1
    for (const garment of yard.garments) if ((garment.at === 'grass' || garment.at === 'puddle') && this.rests(yard, garment)) this.drawResting(g, yard, garment)
    this.drawSoap(g, yard)

    // What is in the air or in the hand: garments on their way, those going back to their owners, the thing carried.
    for (const garment of yard.garments) if (!this.rests(yard, garment)) this.drawMoving(g, yard, garment)
    for (const ghost of yard.ghosts) {
      const p = ghost.t, ease = p * p * (3 - 2 * p), to = { x: ghost.to.x, y: ghost.to.y - 150 * ghost.to.scale }
      const size = ghost.size0 * (1 - ease * 0.7)
      this.figures.drawGarment(g, tally, ghost.garment, ghost.garment.kind, ghost.garment.mud, ghost.garment.rev, ghost.x0 + (to.x - ghost.x0) * ease, ghost.y0 + (to.y - ghost.y0) * ease - Math.sin(p * Math.PI) * 90, size, ease * TAU, this.core, 1, 1, undefined, this.stateOf(yard, ghost.garment))
    }
    this.drawPegs(g, yard)
    this.drawLoose(g, yard, tier)
    this.drawGuidance(g, yard, guidance)
  }

  /** Whether a garment is drawn where it rests: not in the air and not in the hand. */
  private rests(yard: Yard, garment: Garment): boolean {
    return !garment.fly && !yard.isCarried({ what: 'garment', i: garment.index })
  }

  /** Those who walked off, small on the far hill: stitched into one picture when the hill changes, and stamped once a frame. */
  private drawHill(g: Ctx, yard: Yard, k: number): void {
    const hill = this.hill!, figures = this.figures!
    if (this.hillOf !== yard.hillShown) {
      this.hillOf = yard.hillShown
      const h = hill.getContext('2d')!
      h.setTransform(1, 0, 0, 1, 0, 0)
      h.clearRect(0, 0, hill.width, hill.height)
      yard.hillShown.forEach((leaver, n) => {
        const mud = decodeMud(leaver.mud, leaver.garment) ?? cleanMud()
        h.setTransform(k * HILL_SCALE, 0, 0, k * HILL_SCALE, k * (HILL[n].x - HILL_BOX.x), k * (HILL[n].y - HILL_BOX.y))
        h.lineCap = 'round'
        // Each stands as itself, whichever place it has: moving up a place changes nothing about it.
        const pose = idle(leaver.kind, KINDS.indexOf(leaver.garment) * 1.3 + leaver.colour * 0.7 + 0.5)
        // A goat that left in a muddy thing still wears it at the full stretch of its neck.
        if (leaver.kind === 'goat' && mudLeft(mud) > 0) stretched(pose, 1)
        const look: Look = { kind: leaver.kind, colour: leaver.colour, pose, lx: 0, ly: 0.3, arms: 'rest', hide: NO_HIDE, worn: { kind: leaver.garment, on: leaver.on, donning: 1, draw: (c, size, form) => figures.stamp(c, this.tally, leaver, leaver.garment, mud, 0, size, false, undefined, { suds: leaver.suds, popped: true, ...form }) } }
        figures.drawFigure(h, this.tally, look)
        if (leaver.wet > DAMP) {
          // Still wet when it left: drops hang under the garment, bigger the wetter it was. Round knots, at three heights.
          const at = anchorAtRest(leaver.kind, leaver.on), r = 5 + leaver.wet * 0.5
          h.beginPath()
          for (const [dx, dy] of [[-28, 70], [4, 86], [30, 74]]) { h.moveTo(at.x + dx + r, at.y + dy); h.arc(at.x + dx, at.y + dy, r, 0, TAU) }
          h.fillStyle = shade(THREAD.water, 0.3)
          h.fill()
          this.tally.pen += 1
        }
      })
    }
    if (yard.hillShown.length === 0) return
    const shift = yard.hillShift
    if (!shift) {
      g.drawImage(hill, HILL_BOX.x, HILL_BOX.y, HILL_BOX.w, HILL_BOX.h)
      this.tally.stamps += 1
      return
    }
    // Room is being made: each is cut out of the picture and stamped on its way, with two small steps to a place.
    const p = shift.t * shift.t * (3 - 2 * shift.t)
    yard.hillShown.forEach((_leaver, n) => {
      const to = n - shift.by
      const x0 = Math.max(HILL_BOX.x, HILL[n].x - HILL_COLUMN / 2), x1 = Math.min(HILL_BOX.x + HILL_BOX.w, HILL[n].x + HILL_COLUMN / 2)
      const hop = Math.abs(Math.sin(shift.t * Math.PI * 2 * shift.by)) * 3
      if (to >= 0) {
        const dx = (HILL[to].x - HILL[n].x) * p, dy = (HILL[to].y - HILL[n].y) * p - hop
        g.drawImage(hill, (x0 - HILL_BOX.x) * k, 0, (x1 - x0) * k, HILL_BOX.h * k, x0 + dx, HILL_BOX.y + dy, x1 - x0, HILL_BOX.h)
        this.tally.stamps += 1
      } else if (p < 0.98) {
        // One of the oldest goes over the far side of the hill: it walks off to the left and sinks behind the crest, feet first.
        const feet = HILL[n].y + HILL_FEET - HILL_BOX.y, shown = feet * (1 - p)
        g.drawImage(hill, (x0 - HILL_BOX.x) * k, 0, (x1 - x0) * k, shown * k, x0 - HILL_OVER * p, HILL_BOX.y + feet - shown - hop * (1 - p), x1 - x0, shown)
        this.tally.stamps += 1
      }
    })
  }

  private poseOf(yard: Yard, figure: Figure): Pose {
    const pose = idle(figure.kind, yard.time + PHASE[figure.kind])
    if (figure.walking) walk(figure.kind, figure.steps, pose, !!figure.wears && fitOf(figure.kind, figure.wears.kind) === 'tight')
    if (figure.reaction) react(figure.kind, figure.reaction.what, figure.reaction.variant, figure.reaction.age, pose)
    // The goat in a muddy thing keeps its nose turned away and its neck at full stretch for as long as it wears it.
    if (figure.stretch > 0) stretched(pose, figure.stretch)
    return pose
  }

  /** Where a pair of eyes looks: at the finger while it is down, else at the thing its owner watches, else a little about. */
  private lookOf(yard: Yard, x: number, y: number, watch: { x: number; y: number } | null, held = false): { x: number; y: number } {
    const target = yard.finger.down && !held ? yard.finger : watch
    if (!target) return { x: Math.sin(yard.time * 0.7 + x) * 0.3, y: 0.1 }
    const dx = target.x - x, dy = target.y - y, far = Math.hypot(dx, dy) || 1
    const pull = Math.min(1, far / 160)
    return { x: (dx / far) * pull, y: (dy / far) * pull }
  }

  /** A friend, with what it wears and what it holds. One behind the gate shows only above the gate's top bar; one in the tub only above the water. */
  private drawFigure(g: Ctx, yard: Yard, figure: Figure): void {
    if (figure.hidden) return
    const figures = this.figures!, tally = this.tally
    const pose = this.poseOf(yard, figure)
    const carried = 'index' in figure && yard.isCarried({ what: 'friend', i: (figure as Figure & { index: number }).index })
    // While its own garment is in the wash it leans towards it and watches.
    const own = 'index' in figure ? yard.garments.find((garment) => garment.owner === (figure as Figure & { index: number }).index && (garment.at === 'board' || garment.at === 'rail' || garment.at === 'tub')) : undefined
    // With a peg on its ear, its beak or its beard it squints at the peg and at nothing else.
    const pegged = 'index' in figure ? yard.pegs.findIndex((peg) => peg.state === 'friend' && peg.to === (figure as Figure & { index: number }).index) : -1
    const watch = pegged >= 0 ? yard.pegSpot(pegged) : own && !figure.clip ? yard.spotOf(own) : null
    if (watch && !figure.reaction && !figure.walking) pose.lean += watch.x < figure.x ? -0.05 : 0.05
    const eyeY = figure.y - (figure.kind === 'heron' ? 430 : 330) * figure.scale
    const look = this.lookOf(yard, figure.x, eyeY, watch, pegged >= 0)
    const holds = figure.holds
    // How far it has come from holding its garment up over the gate to holding it out in the yard.
    const out = Math.max(0, Math.min(1, (figure.scale - WAIT_SCALE) / (YARD_SCALE - WAIT_SCALE)))
    const worn = figure.wears && this.rests(yard, figure.wears) ? figure.wears : null
    const drawn: Look = {
      kind: figure.kind, colour: figure.colour, pose, lx: look.x, ly: look.y,
      arms: carried ? 'up' : holds ? (out < 0.5 ? 'up' : 'out') : 'rest',
      hide: figure.hide,
      worn: worn ? { kind: worn.kind, on: figure.on, donning: figure.donning, draw: (c, size, form) => figures.stamp(c, tally, worn, worn.kind, worn.mud, worn.rev, size, this.core, undefined, this.stateOf(yard, worn, form)) } : null,
    }
    g.save()
    if (figure.clip) {
      // Above the top bar, and through the gateway as far as the opening leaf has left it clear.
      g.beginPath()
      g.rect(-2000, -2000, 6000, 2000 + GATE.y + 2)
      const clear = GATE.x + GATE.w + 8 - (GATE.w + 16) * (1 - 0.82 * yard.gate.open)
      if (clear > GATE.x) g.rect(GATE.x - 60, GATE.y + 2, clear - GATE.x + 60, 400)
      g.clip()
    } else if (figure.sunk > 0.02) {
      // In the tub: above the water, and below the rim only as far as the tub's own wall.
      g.beginPath()
      g.rect(-2000, -2000, 6000, 2000 + TUB.y - 34)
      g.rect(-2000, TUB.y - 34, 2000 + TUB.x + TUB.rx - 8, 60)
      g.clip()
    }
    g.translate(figure.x, figure.y + figure.sunk * SINK[figure.kind] * figure.scale)
    g.scale(figure.scale * Math.cos(pose.spin * TAU), figure.scale)
    figures.drawFigure(g, tally, drawn)
    g.restore()
    if (holds) {
      const s = figure.scale
      const upX = figure.x, upY = figure.y - (WAIT_HELD.up[figure.kind] / WAIT_SCALE) * s, upSize = (WAIT_HELD.size / WAIT_SCALE) * s
      const outX = figure.x + HELD.dx * s + pose.lean * 40, outY = figure.y + HELD.dy * s + pose.bob * 0.6, outSize = (HELD.size / YARD_SCALE) * s
      const lit = yard.lit && yard.lit.what === 'garment' && yard.lit.i === holds.index ? 1.08 : 1
      const swing = Math.sin(yard.time * 1.3 + figure.x) * 0.05 + pose.lean * 0.6
      figures.drawGarment(g, tally, holds, holds.kind, holds.mud, holds.rev, upX + (outX - upX) * out, upY + (outY - upY) * out, (upSize + (outSize - upSize) * out) * lit, swing, this.core, 1, 1, undefined, this.stateOf(yard, holds))
    }
    if (worn && !figure.clip) {
      // Two flies circle each patch of mud on what it wears.
      const at = anchorAtRest(figure.kind, figure.on)
      for (const patch of fliesOn(worn)) this.flies.push(figure.x + (at.x + (patch.u - 0.5) * 120) * figure.scale, figure.y + (at.y + (patch.v - 0.5) * 120) * figure.scale)
    }
  }

  /** How far the line hangs now: the wind breathes in it and a gust swings it. */
  private sway(yard: Yard): number {
    // The gust is seen to build: the line begins to shake a little over a second before it blows.
    const build = Math.max(0, (yard.gust - (GUST_EVERY - 1.2)) / 1.2)
    return windAt(yard.time) * 4 + (yard.gust < 1.4 ? Math.sin(yard.gust * 9) * 7 * (1 - yard.gust / 1.4) : 0) + Math.sin(yard.gust * 13) * 4 * build
  }

  private onLine(yard: Yard, x: number): { x: number; y: number } {
    const share = (x - LINE.x0) / (LINE.x1 - LINE.x0)
    // The pluck is a bump that sits where the finger pulled and rings.
    const pluck = yard.line.pull * 26 * Math.max(0, 1 - Math.abs(share - yard.line.at) * 3.2)
    return { x, y: lineY(x, LINE.sag + this.sway(yard)) + pluck }
  }

  /** The washing line and the bird on it. */
  private drawLine(g: Ctx, yard: Yard): void {
    const t = yard.time, tally = this.tally
    g.beginPath()
    for (let n = 0; n <= 24; n++) {
      const p = this.onLine(yard, LINE.x0 + ((LINE.x1 - LINE.x0) * n) / 24)
      if (n === 0) g.moveTo(p.x, p.y)
      else g.lineTo(p.x, p.y)
    }
    g.lineWidth = 5
    g.strokeStyle = '#7d6a4c'
    g.stroke()
    g.lineWidth = 2.6
    g.strokeStyle = '#fbf6e9'
    g.setLineDash([6, 5])
    g.stroke()
    g.setLineDash([])
    tally.pen += 2
    // The bird hops along the line now and then, and bobs.
    const hop = Math.floor(t / 6.5) % 3, into = (t % 6.5) / 6.5
    const stand = BIRD + hop * 0.022 + (into > 0.94 ? ((into - 0.94) / 0.06) * 0.022 * (hop === 2 ? -2 : 1) : 0)
    const p = this.onLine(yard, LINE.x0 + (LINE.x1 - LINE.x0) * stand)
    const jump = into > 0.94 ? Math.sin(((into - 0.94) / 0.06) * Math.PI) * 14 : 0
    this.figures!.put(g, tally, 'bird', p.x, p.y - jump, 22, 36, Math.sin(t * 3.1) * 0.08 + yard.line.pull * 0.6, 1, 1 + Math.sin(t * 6.2) * 0.04)
  }

  /** What a garment shows besides its mud: its suds wherever it is but on the board, where they are the live heap, and a shirt's popped button. */
  private stateOf(yard: Yard, garment: Garment, form?: Form | Pick<GarmentState, 'sleeves' | 'slices'>): GarmentState {
    return { suds: garment.at === 'board' && !garment.fly ? 0 : garment.suds, popped: yard.buttonOff(garment), ...form }
  }

  /** A garment where it rests, moving as this garment moves at this station. */
  private drawResting(g: Ctx, yard: Yard, garment: Garment): void {
    const at = yard.spotOf(garment), t = yard.time
    const lit = yard.lit && yard.lit.what === 'garment' && yard.lit.i === garment.index ? 1.06 : 1
    let hang: Hang = { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1, bobble: 0, sleeves: [SLEEVE, SLEEVE] }
    let mud: readonly number[] = garment.mud, pivot = 0, pivotX = 0
    let bobble: { dx: number; dy: number; scale: number } | undefined
    let shape: Pick<GarmentState, 'sleeves' | 'slices'> | undefined
    if (garment.at === 'tub') {
      hang = tubPose(garment.kind, garment.since, t)
      // The bobble is drawn by itself, after the hat: it stays up as a float when the hat goes under.
      if (garment.kind === 'hat') bobble = { dx: 0, dy: 0, scale: 0 }
      shape = { sleeves: hang.sleeves }
    } else if (garment.at === 'rail') {
      hang = railPose(garment.kind, garment.twist)
      // The sock twists into a tight screw and the scarf into a rope of many turns.
      const turns = SCREW[garment.kind]
      shape = turns > 0 ? { slices: { count: turns, by: 0.05 * garment.twist } } : { sleeves: hang.sleeves }
    } else if (garment.at === 'line') {
      // The shirt's sleeves clap when its voice does: as it is pegged, and a moment into each gust.
      const pegged = garment.since - CLAP_AFTER_PEG, gusted = yard.gust - CLAP_AFTER_GUST(garment.n)
      const clap = pegged >= 0 && pegged < 0.5 ? pegged : gusted >= 0 && gusted < 0.5 && (garment.pegs[0] || garment.pegs[1]) ? gusted : -1
      hang = linePose(garment.kind, t, windAt(t), yard.gust, garment.wet, garment.pegs[0], garment.pegs[1], clap)
      shape = { sleeves: hang.sleeves }
      hang.dy += this.onLine(yard, at.x).y - lineY(at.x)
      hang.turn += garment.twist * 0.25 * Math.sin(t * 30)
      // It hangs from the line, so it swings about its top edge.
      pivot = -at.size / 2
      if (garment.kind === 'scarf') {
        // The scarf hangs by the end of its band from one peg, and flies out from there like a flag.
        pivot = -at.size * 0.24
        pivotX = garment.pegs[1] && !garment.pegs[0] ? PEG_REACH : -PEG_REACH
        hang.dy -= at.size * 0.24
        if (pivotX > 0) hang.turn = Math.PI - hang.turn
      }
      if (garment.kind === 'hat') bobble = { dx: hang.bobble * 26, dy: 0, scale: 1 }
    } else if (garment.at === 'board') {
      const press = yard.dimple.depth
      hang.sx = 1 + press * 0.012; hang.sy = 1 - press * 0.012
      mud = yard.mudShown(garment)
      // The sock fills with foam like a sausage while the bar is on it.
      if (garment.kind === 'sock' && yard.lather >= 0) hang.sx *= 1 + 0.16 * Math.sin((yard.lather / LATHER_S) * Math.PI)
      if (garment.kind === 'hat') bobble = { dx: yard.bobble.dx, dy: yard.bobble.dy, scale: garment.suds > SOAPY ? 2 : 1 }
      // The scarf comes across the board with the finger.
      if (garment.kind === 'scarf') hang.dx += yard.scarf.pull
    } else {
      hang.sy = 0.78
      hang.turn = 0.12
    }
    g.save()
    g.translate(at.x + hang.dx + pivotX, at.y + hang.dy + pivot)
    if (hang.turn) g.rotate(hang.turn)
    g.scale(hang.sx * lit, hang.sy * lit)
    g.translate(-pivotX, -pivot)
    this.figures!.stamp(g, this.tally, garment, garment.kind, mud, garment.rev, at.size, this.core, bobble, this.stateOf(yard, garment, garment.kind === 'shirt' || shape?.slices ? shape : undefined))
    if (garment.at === 'board' && garment.kind === 'sock' && yard.flash > 0.02) {
      // The sock's stripes flash as the mud comes off them: a white thread over each for a moment.
      const stripe = (v0: number, v1: number) => g.rect((0.27 - 0.5) * at.size, (v0 - 0.5) * at.size, 0.385 * at.size, (v1 - v0) * at.size)
      g.beginPath()
      stripe(0.1, 0.18); stripe(0.26, 0.34)
      g.globalAlpha = Math.min(1, yard.flash) * 0.8
      g.fillStyle = '#ffffff'
      g.fill()
      g.globalAlpha = 1
      this.tally.pen += 1
    }
    g.restore()
    if (garment.at === 'tub' && garment.kind === 'hat') {
      const float = bobbleAfloat(at, t)
      this.figures!.drawBobble(g, this.tally, float.x, float.y, at.size)
    }
  }

  /** A garment in the air or in the hand. */
  private drawMoving(g: Ctx, yard: Yard, garment: Garment): void {
    const held = yard.carried && yard.isCarried({ what: 'garment', i: garment.index }) ? yard.carried : null
    if (held) {
      // In the hand it dangles from the fingertip and swings.
      this.figures!.drawGarment(g, this.tally, garment, garment.kind, garment.mud, garment.rev, held.x, held.y + 34, 116, Math.sin(yard.time * 7) * 0.08, this.core, 1, 1, undefined, this.stateOf(yard, garment))
      return
    }
    const fly = garment.fly
    if (!fly) return
    const at = flown(fly, yard.spotOf(garment)), p = Math.min(1, fly.t), stretch = Math.sin(p * Math.PI) * 0.12
    this.figures!.drawGarment(g, this.tally, garment, garment.kind, garment.mud, garment.rev, at.x, at.y, at.size, (1 - p * p * (3 - 2 * p)) * Math.PI, this.core, 1 - stretch, 1 + stretch, undefined, this.stateOf(yard, garment))
  }

  /** A smear of mud over a thing that came out of the puddle: gone again when its cell has played. */
  private smear(g: Ctx, x: number, y: number, r: number): void {
    g.beginPath()
    for (let n = 0; n < 6; n++) {
      const a = n * 1.9, far = r * (0.2 + (n % 3) * 0.3)
      g.moveTo(x + Math.cos(a) * far - 7, y + Math.sin(a) * far - 3)
      g.lineTo(x + Math.cos(a) * far + 7, y + Math.sin(a) * far + 3)
    }
    g.lineWidth = 7
    g.strokeStyle = THREAD.mud
    g.stroke()
    this.tally.pen += 1
  }

  /** The cat: on its post, sitting on the rail, hanging from the line by its scruff, lying flat on the board, or in the hand. */
  private drawCat(g: Ctx, yard: Yard): void {
    const cat = yard.cat, figures = this.figures!
    const pose = idle('cat', yard.time)
    if (cat.reaction) react('cat', cat.reaction.what, cat.reaction.variant, cat.reaction.age, pose)
    const carried = yard.isCarried({ what: 'cat' }) ? yard.carried : null
    const rest = yard.catSpot()
    const seat = cat.at === 'fence' ? CAT.seat : cat.at === 'rail' ? 30 : 50
    const at = carried ? { x: carried.x, y: carried.y + 70 } : flown(cat.fly, { x: rest.x, y: rest.y + seat, size: 0 })
    const hangs = cat.at === 'line' || carried !== null
    // Fluffed to twice its size, which is half as wide again and half as tall again: it stays on its post and off the line.
    const fluff = fluffScale(cat.fluff)
    const look = this.lookOf(yard, at.x, at.y - 100, null)
    if (cat.at === 'rail' && !carried) pose.tail = 0.3 * Math.sin(yard.time * 2)
    if (hangs) { pose.tail = Math.sin(yard.time * 2.6); pose.own = 0; pose.jaw = 0 }
    g.save()
    g.translate(at.x, at.y)
    if (cat.shaking > 0) g.rotate(Math.sin(cat.shaking * 70) * 0.14)
    if (cat.at === 'line' && !carried && !cat.fly) {
      // Pegged by the scruff: it hangs long from the peg, legs dangling, and swings a little about it. With a
      // friend near, it hangs shorter and tucks its legs and tail up, clear of every head.
      const scruff = -HUNG.neck * HUNG.held * fluff, long = hungStretch(cat.tuck)
      g.translate(0, scruff)
      g.rotate(Math.sin(yard.time * 1.7) * 0.07)
      g.translate(0, -scruff + HUNG.neck * (long - HUNG.held) * fluff)
      g.scale(HUNG.wide * fluff, long * fluff)
    } else if (cat.at === 'board' && !carried && !cat.fly) {
      // Flat on the board with its ears back.
      g.scale(1.35 * fluff, 0.62 * fluff)
      pose.ear = -1
    } else g.scale(fluff, hangs ? fluff * 1.2 : fluff)
    figures.drawCat(g, this.tally, pose, look.x, look.y, this.core, hangs, cat.at === 'line' && !carried && !cat.fly ? cat.tuck : 0)
    g.restore()
    if (cat.muddy > 0) this.smear(g, at.x, at.y - 50, 40)
  }

  /** The tub from the water up: the cloud in the water, what floats in it and who sits in it, the board and what lies on it, then the front of the tub. */
  private drawTub(g: Ctx, yard: Yard): void {
    const tally = this.tally, t = yard.time
    if (yard.murk > 0.2) {
      g.beginPath()
      g.ellipse(TUB.x, TUB.y + 9, TUB.rx - 12, TUB.ry - 9, 0, 0, TAU)
      g.globalAlpha = murky(yard.murk)
      g.fillStyle = THREAD.mudLight
      g.fill()
      g.globalAlpha = 1
      tally.pen += 1
    }
    if (yard.water.level < 9.5) {
      // The jumper has drunk some of it: the wet inside of the tub shows above the water.
      g.beginPath()
      g.ellipse(TUB.x, TUB.y + 9, TUB.rx - 12, TUB.ry - 9, 0, 0, TAU)
      g.lineWidth = (10 - yard.water.level) * 2.4
      g.strokeStyle = THREAD.tubInside
      g.stroke()
      tally.pen += 1
    }
    // Ripples: rows of running stitch that slide and slosh.
    g.beginPath()
    for (let row = 0; row < 3; row++) {
      const y = TUB.y + 2 + row * 14 + yard.tub.slosh * 5 * (row % 2 ? -1 : 1)
      const reach = (TUB.rx - 26) * Math.sqrt(Math.max(0, 1 - ((y - TUB.y - 9) / (TUB.ry - 9)) ** 2))
      const slide = Math.sin(t * 0.8 + row * 2.1) * 10
      g.moveTo(TUB.x - reach + 6, y)
      g.quadraticCurveTo(TUB.x + slide, y + 5 + yard.tub.slosh * 6, TUB.x + reach - 6, y)
    }
    g.lineWidth = 3
    g.strokeStyle = shade(THREAD.water, 0.55)
    g.setLineDash([16, 12])
    g.lineDashOffset = -t * 8
    g.stroke()
    g.setLineDash([])
    g.lineDashOffset = 0
    tally.pen += 1

    for (const friend of yard.friends) if (friend.where === 'tub' && friend.sunk > 0.05 && !friend.clip) this.drawFigure(g, yard, friend)
    for (const garment of yard.garments) if (garment.at === 'tub' && this.rests(yard, garment)) this.drawResting(g, yard, garment)

    g.drawImage(this.board!.canvas, BOARD.x, BOARD.y, BOARD.w, BOARD.h)
    tally.stamps += 1
    const lies = yard.garmentAt('board')
    if (lies && this.rests(yard, lies)) this.drawResting(g, yard, lies)
    if (yard.runs.length > 0) {
      // Brown runs down the board to the water: one wavering thread for each trickle, all in one stroke.
      g.beginPath()
      for (const run of yard.runs) {
        g.moveTo(run.x, run.y - 30)
        g.lineTo(run.x + 3, run.y - 20)
        g.lineTo(run.x - 3, run.y - 10)
        g.lineTo(run.x, run.y)
      }
      g.lineWidth = 4
      g.lineCap = 'round'
      g.strokeStyle = THREAD.mud
      g.stroke()
      tally.pen += 1
    }
    if (yard.cat.at === 'board') this.drawCat(g, yard)
    const press = yard.dimple.depth
    if (Math.abs(press) > 0.04 && (lies || yard.cat.at === 'board')) {
      // The dimple under the finger: the cloth puckers in a ring of short stitches. The soft jumper takes the finger
      // deeper and wider, and the stiff dungarees are dragged along behind it: three stitches trail where it came from.
      const { wide, deep, tail } = DIMPLE[lies?.kind ?? 'sock'], { x, y, dx, dy } = yard.dimple
      g.beginPath()
      for (let n = 0; n < 8; n++) {
        const a = (n / 8) * TAU + 0.2, inner = (15 - press * 5 * deep) * wide, outer = (25 + press * 3) * wide
        g.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner)
        g.lineTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer)
      }
      if (tail > 0) for (const side of [-1, 0, 1]) {
        const from = 30 + Math.abs(side) * -6, to = from + tail * Math.abs(press) * (side === 0 ? 1 : 0.7)
        g.moveTo(x - dx * from - dy * side * 11, y - dy * from + dx * side * 11)
        g.lineTo(x - dx * to - dy * side * 11, y - dy * to + dx * side * 11)
      }
      g.lineWidth = 2.6
      g.strokeStyle = 'rgba(40, 26, 18, 0.5)'
      g.stroke()
      tally.pen += 1
    }
    this.drawSuds(g, yard)

    const front = this.tubFront!
    g.save()
    g.translate(TUB.x, TUB.y)
    g.scale(1 + yard.tub.slosh * 0.006, 1 - yard.tub.slosh * 0.01)
    g.drawImage(front.canvas, -TUB.rx - 10, -10, front.w, front.h)
    g.restore()
    tally.stamps += 1
  }

  /** The suds: knots heaped on the cloth, drawn as three passes for all of them (shadow, knot, light). While the bar is at work they come one after another. */
  private drawSuds(g: Ctx, yard: Yard): void {
    if (yard.knots.length === 0) return
    const wobble = Math.sin(yard.time * 9) * yard.dimple.depth * 1.5
    const grey = yard.knots[0].grey
    const pass = (dx: number, dy: number, grow: number, colour: string) => {
      let any = false
      g.beginPath()
      for (const knot of yard.knots) {
        if (yard.lather >= 0 && knot.born > yard.lather) continue
        any = true
        const at = clothToStage(knot.u, knot.v + knot.fall)
        // A tower of foam leans and wobbles the higher it stands.
        const lean = knot.v < 0.3 ? Math.sin(yard.time * 7) * (0.3 - knot.v) * 26 : 0
        const x = at.x + dx * knot.r + wobble + lean, y = Math.min(at.y, TUB.y + 30) + dy * knot.r
        g.moveTo(x + knot.r * grow, y)
        g.arc(x, y, knot.r * grow, 0, TAU)
      }
      if (!any) return
      g.fillStyle = colour
      g.fill()
      this.tally.pen += 1
    }
    pass(0.16, 0.22, 1, grey ? '#7f8791' : '#9fb3c4')
    pass(0, 0, 1, grey ? '#c9ced4' : THREAD.suds)
    pass(-0.3, -0.32, 0.3, grey ? '#e3e6ea' : '#dfeaf2')
  }

  private drawSoap(g: Ctx, yard: Yard): void {
    const soap = yard.soap
    const carried = yard.isCarried({ what: 'soap' }) ? yard.carried : null
    const rest = yard.soapSpot()
    const at = carried ? { x: carried.x, y: carried.y + 10 } : flown(soap.fly, { x: rest.x, y: rest.y, size: 0 })
    const lit = yard.lit && yard.lit.what === 'soap' ? 1.12 : 1
    this.figures!.put(g, this.tally, 'soap', at.x, at.y, 32, 22, soap.fly ? soap.fly.t * 5 : Math.sin(yard.time * 1.1) * 0.03, lit, lit)
    if (soap.muddy > 0) this.smear(g, at.x, at.y, 22)
  }

  /** The six pegs, wherever they are: all the plain ones as one stroke, the shiny ones as another. */
  private drawPegs(g: Ctx, yard: Yard): void {
    const t = yard.time
    for (const pass of ['plain', 'shiny', 'muddy'] as const) {
      let any = false
      g.beginPath()
      yard.pegs.forEach((peg, i) => {
        if ((pass === 'muddy') !== peg.muddy > 0 || (pass !== 'muddy' && (pass === 'shiny') !== peg.shiny)) return
        any = true
        const carried = yard.isCarried({ what: 'peg', i }) ? yard.carried : null
        const rest = yard.pegSpot(i)
        const at = carried ?? flown(peg.fly, { x: rest.x, y: peg.state === 'home' ? this.onLine(yard, rest.x).y - 4 : rest.y, size: 0 })
        const turn = rest.turn + (peg.state === 'home' ? Math.sin(t * 1.7 + i * 1.3) * 0.12 + yard.line.pull * 0.5 + (peg.age > 0 ? Math.sin(peg.age * 50) * 0.5 : 0) : 0)
        g.moveTo(at.x + Math.sin(turn) * 8, at.y - Math.cos(turn) * 8)
        g.lineTo(at.x - Math.sin(turn) * 26, at.y + Math.cos(turn) * 26)
      })
      if (!any) continue
      g.lineWidth = 10
      g.strokeStyle = pass === 'plain' ? THREAD.woodDark : pass === 'shiny' ? '#fbf1d2' : THREAD.mud
      g.stroke()
      this.tally.pen += 1
    }
  }

  /** Whatever flies: dollops of mud, loose threads and drops, bubbles, flies, and the ring a touch on bare linen leaves. */
  private drawLoose(g: Ctx, yard: Yard, tier: Tier): void {
    const tally = this.tally
    if (yard.dollops.length > 0) {
      for (const colour of [THREAD.mud, THREAD.mudLight]) {
        g.beginPath()
        for (const flying of yard.dollops) {
          const p = flying.t, x = flying.x0 + (flying.x1 - flying.x0) * p, y = flying.y0 + (flying.y1 - flying.y0) * p - Math.sin(p * Math.PI) * 220
          if (colour === THREAD.mud) { g.moveTo(x + 24, y); g.ellipse(x, y, 24, 15, 0, 0, TAU) } else { g.moveTo(x + 3, y - 5); g.ellipse(x - 5, y - 5, 8, 4, 0, 0, TAU) }
        }
        g.fillStyle = colour
        g.fill()
        tally.pen += 1
      }
    }
    const colours = { mud: THREAD.mud, water: shade(THREAD.water, 0.3), suds: THREAD.suds }
    for (const what of ['mud', 'water', 'suds'] as const) {
      let drawn = 0
      g.beginPath()
      for (const thread of yard.loose) {
        if (thread.what !== what || drawn >= tier.loose) continue
        drawn += 1
        const half = what === 'mud' ? 7 : 4
        g.moveTo(thread.x - Math.cos(thread.turn) * half, thread.y - Math.sin(thread.turn) * half)
        g.lineTo(thread.x + Math.cos(thread.turn) * half, thread.y + Math.sin(thread.turn) * half)
      }
      if (drawn === 0) continue
      g.lineWidth = what === 'mud' ? 5 : 4
      g.strokeStyle = colours[what]
      g.stroke()
      tally.pen += 1
    }
    const bubbles = yard.bubbles.filter((bubble) => bubble.age >= 0)
    if (bubbles.length > 0) {
      g.beginPath()
      for (const bubble of bubbles) {
        const r = bubble.r * Math.min(1, 0.4 + bubble.age * 3)
        g.moveTo(bubble.x + r, bubble.y)
        g.arc(bubble.x, bubble.y, r, 0, TAU)
      }
      g.fillStyle = 'rgba(255, 255, 255, 0.5)'
      g.fill()
      g.lineWidth = 2.6
      g.strokeStyle = '#ffffff'
      g.setLineDash([7, 4])
      g.stroke()
      g.setLineDash([])
      tally.pen += 2
    }
    if (this.flies.length > 0) {
      g.beginPath()
      for (let n = 0; n < this.flies.length; n += 2) {
        for (const side of [0, Math.PI]) {
          const a = yard.time * 5 + n * 1.3 + side
          const x = this.flies[n] + Math.cos(a) * 20, y = this.flies[n + 1] + Math.sin(a * 1.3) * 12
          g.moveTo(x + 3.5, y)
          g.arc(x, y, 3.5, 0, TAU)
        }
      }
      g.fillStyle = '#2b2622'
      g.fill()
      tally.pen += 1
    }
    if (yard.rings.length > 0) {
      g.beginPath()
      for (const ring of yard.rings) {
        const r = 10 + ring.age * 70
        g.moveTo(ring.x + r, ring.y)
        g.arc(ring.x, ring.y, r, 0, TAU)
      }
      g.lineWidth = 3
      g.strokeStyle = THREAD.border
      g.setLineDash([8, 7])
      g.stroke()
      g.setLineDash([])
      tally.pen += 1
    }
  }

  /** The idle ladder: a gold ring of running stitch that breathes round the one thing to touch next, then a stitched hand that shows the move. */
  private drawGuidance(g: Ctx, yard: Yard, guidance: Guidance | null): void {
    if (!guidance || (guidance.glow <= 0 && guidance.demo === null)) return
    const want = yard.want()
    if (!want) return
    if (guidance.glow > 0) {
      const breath = 1 + Math.sin(yard.time * 2.6) * 0.06
      const rx = (want.how === 'rub' ? 44 : want.w / 2 + 14) * breath, ry = (want.how === 'rub' ? 44 : want.h / 2 + 14) * breath
      g.globalAlpha = guidance.glow
      g.beginPath()
      g.ellipse(want.x, want.y, rx, ry, 0, 0, TAU)
      g.lineWidth = 7
      g.strokeStyle = '#7a4a12'
      g.setLineDash([14, 9])
      g.lineDashOffset = -yard.time * 10
      g.stroke()
      g.lineWidth = 4
      g.strokeStyle = THREAD.gold
      g.stroke()
      g.setLineDash([])
      g.lineDashOffset = 0
      g.globalAlpha = 1
      this.tally.pen += 2
    }
    if (guidance.demo !== null) {
      const hand = handPose(guidance.demo, want.how === 'rub', this.hand)
      // A rub goes up and down across the mud, twice; a tap stays where it is.
      const y = want.how === 'rub' ? want.y + Math.sin(hand.travel * TAU * 2) * want.h * 0.5 : want.y
      const lift = (1 - hand.press) * 16
      g.globalAlpha = hand.opacity
      this.figures!.put(g, this.tally, 'hand', want.x + lift * 0.4, y + lift, 40, 4, -0.2, 1 - hand.press * 0.06, 1 - hand.press * 0.06)
      g.globalAlpha = 1
    }
  }
}
