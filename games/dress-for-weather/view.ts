import { CREASE_Y, LEAD_AT, TAIL_AT, drawFace, makeFigureSprites, type FigureSprites } from './figureArt'
import { LINING, TAB_AT, TEETH, drawTabs, isPair, makeGarmentSprites, outlinesOf, type GarmentSprites, type TabState } from './garmentArt'
import { drawGarden } from './gardenView'
import { handPose, type Guidance, type HandPose } from './guidance'
import { DOOR_EYE, SPLASH_SECONDS, type Hall, type Hint, type Piece } from './hall'
import { GARMENTS, TUG_STEPS, ZIP_TEETH, type Figure, type Garment, type Spot, type SpotPart, type Wearer } from './kinds'
import { ARMS, BODIES, BUTTON_AT, DOOR, SASH_Y, SHEET, VANE, WINDOW, ZIP, armTo, cockerelAcross, paperBox, sliderAt, type Point, type Pose } from './layout'
import { blinking, glanceOf, idleOf } from './motion'
import { KEY_LINE, PAPER, PAPER_BACK, sprite, type Pen, type Ring, type Sheet, type Sprite } from './paper'
import type { Weather } from './save'
import { CLOCK, SKY, makeScenerySprites, paintBackdrop, type ScenerySprites } from './scenery'
import type { Fit } from './stage'

// The game as it is drawn. The setting is one stamp, painted once for the
// surface. Every piece of paper is a sprite made once at the surface's
// density and stamped where the hall says it lies. What is drawn fresh each
// frame is small: the faces, the zip's teeth, the tabs while they turn, what
// falls or blows in the window, a dotted cut-line, the drops or the snow an
// outing left on a garment (in that garment's own place, so they go where it
// goes), a splash and a ripple.
// While the hall sheet is turned over, the garden is drawn instead
// (gardenView.ts), and while it turns, both, the garden over the hall as far
// as the sheet has come.
// `draw` returns its draw count, which for this canvas game is the sprite
// stamps plus the live fills and strokes of one frame.

/** The pen and the frame's count of what it has drawn. */
export class Brush {
  calls = 0
  constructor(readonly g: Pen) {}

  stamp(s: Sprite): void {
    this.g.drawImage(s.sheet as unknown as CanvasImageSource, s.x, s.y, s.w, s.h)
    this.calls += 1
  }
}

export type Sprites = { garments: GarmentSprites; figures: FigureSprites; scenery: ScenerySprites }

/** The parts the baby's head comes through a garment on. */
export const UNDER_THE_HEAD: readonly SpotPart[] = ['feet', 'body']

const WET = '#4f9fd6'
const SNOW = '#fdfeff'

const trace = (g: Pen, rings: readonly Ring[]): void => {
  for (const r of rings) {
    g.moveTo(r[0], r[1])
    for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1])
    g.closePath()
  }
}

/** The zip on the pen's garment: the lining its open front shows when it is worn, the teeth closed below the slider and apart above it, and the slider. */
export function drawZip(brush: Brush, sprites: GarmentSprites, shown: number, worn: boolean): void {
  const g = brush.g, at = sliderAt(shown), apart = ZIP_TEETH - shown
  // On a body the open front falls apart and shows its lining; on the rack and in the hand the coat hangs shut.
  const half = worn ? Math.min(44, apart * 4) : 0, every = (ZIP.bottom - ZIP.top) / ZIP_TEETH
  if (half > 0) {
    g.beginPath()
    g.moveTo(ZIP.x, at.y)
    g.lineTo(ZIP.x - half, ZIP.top - 8)
    g.lineTo(ZIP.x + half, ZIP.top - 8)
    g.closePath()
    g.fillStyle = LINING
    g.fill()
    brush.calls += 1
  }
  g.beginPath()
  for (let i = 0; i < ZIP_TEETH; i++) {
    const y = ZIP.bottom - (i + 0.5) * every
    if (i < shown || !worn) {
      // Closed teeth mesh across the middle, one from each side in turn.
      g.moveTo(ZIP.x - 5, y - 2)
      g.lineTo(ZIP.x + 5, y + 2)
    } else {
      const spread = (half * (at.y - y)) / (at.y - (ZIP.top - 8) || 1)
      g.moveTo(ZIP.x - spread - 4, y)
      g.lineTo(ZIP.x - spread, y)
      g.moveTo(ZIP.x + spread, y)
      g.lineTo(ZIP.x + spread + 4, y)
    }
  }
  g.strokeStyle = TEETH
  g.lineWidth = 2.6
  g.lineCap = 'butt'
  g.stroke()
  brush.calls += 1
  g.save()
  g.translate(at.x, at.y)
  brush.stamp(sprites.slider)
  g.restore()
}

/** The duffel coat's three toggles on the pen's garment: each hangs beside its slit, or lies through it. */
export function drawButtons(brush: Brush, sprites: GarmentSprites, shown: readonly number[]): void {
  const g = brush.g
  BUTTON_AT.forEach((at, index) => {
    const through = shown[index] ?? 0
    g.save()
    g.translate(at.x - 6 + 22 * through, at.y + 5 * (1 - through))
    g.rotate(1.05 * (1 - through))
    brush.stamp(sprites.toggle)
    g.restore()
  })
}

/** What falls or blows, as one path of marks inside a box: rain, flakes, gusts, or the sun's rays round `sun`. Returns whether the path is to be filled (flakes) or stroked. */
export function traceWeather(g: Pen, weather: Weather, t: number, x0: number, y0: number, x1: number, y1: number, n: number, sun: { x: number; y: number; r: number }): 'fill' | 'stroke' {
  const w = x1 - x0, h = y1 - y0
  g.beginPath()
  for (let i = 0; i < n; i++) {
    if (weather === 'rain') {
      const x = x0 + ((i * 53.7) % w), y = y0 + ((i * 37.3 + t * (150 + (i % 3) * 30)) % h)
      g.moveTo(x, y)
      g.lineTo(x - 3, y + 13)
    } else if (weather === 'snow') {
      const y = y0 + ((i * 41.3 + t * (24 + (i % 3) * 7)) % h), x = x0 + ((i * 61.7) % w) + 5 * Math.sin(t * 1.3 + i)
      g.moveTo(x + 3, y)
      g.arc(x, y, 3, 0, Math.PI * 2)
    } else if (weather === 'wind') {
      const x = x0 + ((i * 47.1 + t * (210 + (i % 3) * 50)) % w), y = y0 + ((i * 29.9) % h) + 3 * Math.sin(t * 5 + i)
      g.moveTo(x, y)
      g.quadraticCurveTo(x + 10, y - 5, x + 22, y)
    } else {
      const a = (i / n) * Math.PI * 2 + t * 0.6
      g.moveTo(sun.x + Math.cos(a) * sun.r * 1.3, sun.y + Math.sin(a) * sun.r * 1.3)
      g.lineTo(sun.x + Math.cos(a) * sun.r * 1.75, sun.y + Math.sin(a) * sun.r * 1.75)
    }
  }
  return weather === 'snow' ? 'fill' : 'stroke'
}

export function paintWeather(brush: Brush, weather: Weather, how: 'fill' | 'stroke', width: number): void {
  const g = brush.g
  if (how === 'fill') {
    g.fillStyle = SNOW
    g.fill()
  } else {
    g.strokeStyle = weather === 'sun' ? '#ffc93a' : 'rgba(255, 253, 247, 0.85)'
    g.lineWidth = width
    g.lineCap = 'round'
    g.stroke()
  }
  brush.calls += 1
}

/**
 * One arm of a figure, on the pen's figure (the pen is on the middle of its stand): the arm on the viewer's
 * right for `side` 1 and the other for -1, hanging as it was cut when `target` is null, and otherwise lifted
 * off the sheet with its hand at `target` (as the viewer sees it, from the middle of the stand). A lifted arm is
 * seen shorter, as paper is when it is lifted toward the eye.
 */
export function drawArm(brush: Brush, figures: FigureSprites, who: Figure, side: 1 | -1, target: Point | null): void {
  const g = brush.g, { shoulder, hand } = ARMS[who]
  const arm = armTo(who, target ? { x: side * target.x, y: target.y } : hand)
  g.save()
  if (side === -1) g.scale(-1, 1)
  g.save()
  g.translate(shoulder.x, shoulder.y)
  g.rotate(arm.to)
  g.scale(arm.long, 1)
  g.rotate(-arm.from)
  g.translate(-shoulder.x, -shoulder.y)
  brush.stamp(figures.arm[who])
  g.restore()
  g.translate(arm.hand.x - hand.x, arm.hand.y - hand.y)
  brush.stamp(figures.hand[who])
  g.restore()
}

export class HallView {
  private backdrop: Sheet | null = null
  private sprites: Sprites | null = null
  private density = 0
  private pixel = 1
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private readonly brush: Brush
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** Which of the hall's hints the ladder is on. */
  private hintAt = 0

  constructor(private readonly g: Pen) {
    this.brush = new Brush(g)
  }

  /**
   * The surface has a size: `width` by `height` device pixels at `pixel` device pixels a CSS pixel, with the
   * stage fitted in it by `by`. The setting is painted again, and the paper is cut again only when its density
   * has changed.
   */
  resize(width: number, height: number, pixel: number, by: Fit): void {
    this.pixel = pixel
    this.by = by
    if (!(by.scale > 0)) return
    const density = pixel * by.scale
    this.backdrop = sprite({ x0: 0, y0: 0, x1: width, y1: height }, 1, (g) => {
      g.setTransform(density, 0, 0, density, pixel * by.x, pixel * by.y)
      paintBackdrop(g)
    }, 0).sheet
    if (Math.abs(density - this.density) > 0.004) {
      this.density = density
      this.sprites = { garments: makeGarmentSprites(density), figures: makeFigureSprites(density), scenery: makeScenerySprites(density) }
    }
  }

  private stamp(s: Sprite): void {
    this.brush.stamp(s)
  }

  /** Draws one frame of the game as it stands, or the bare setting while there is no hall yet. Returns the draw count. */
  draw(hall: Hall | null, guidance: Guidance | null): number {
    const g = this.g, by = this.by, brush = this.brush
    brush.calls = 0
    if (!(by.scale > 0) || !this.backdrop) return 0
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.drawImage(this.backdrop as unknown as CanvasImageSource, 0, 0)
    brush.calls += 1
    if (!hall || !this.sprites) return brush.calls
    g.setTransform(this.density, 0, 0, this.density, this.pixel * by.x, this.pixel * by.y)
    if (hall.flip < 1) this.hall(hall, hall.flip > 0 ? null : guidance)
    if (hall.flip > 0 && hall.garden) {
      // The sheet turns over from the door's side: the garden shows as far as it has come, behind a pale turning edge.
      const edge = SHEET.x0 + (SHEET.x1 - SHEET.x0) * hall.flip
      g.save()
      g.beginPath()
      g.rect(SHEET.x0 + 3, SHEET.y0 + 3, edge - SHEET.x0, SHEET.y1 - SHEET.y0)
      g.clip()
      drawGarden(brush, this.sprites, hall, hall.garden)
      g.restore()
      if (hall.flip < 1) {
        g.fillStyle = PAPER_BACK
        g.fillRect(edge - 4, SHEET.y0 + 3, 16, SHEET.y1 - SHEET.y0)
        brush.calls += 1
      }
    }
    return brush.calls
  }

  /** The hall: the setting's moving parts, the rack, everyone from the back to the front, and what lies over them all. */
  private hall(hall: Hall, guidance: Guidance | null): void {
    const g = this.g, brush = this.brush, sprites = this.sprites!, t = hall.t
    this.setting(hall)
    let hint: Hint | null = null
    if (guidance && guidance.glow > 0.01) {
      const hints = hall.hints()
      if (guidance.demoIndex >= 0) this.hintAt = guidance.demoIndex
      hint = hints.length > 0 ? hints[this.hintAt % hints.length] : null
    } else this.hintAt = 0
    // The glow lies under the paper it points at.
    if (hint && guidance) {
      g.globalAlpha = guidance.glow * (0.6 + 0.25 * Math.sin(t * 3.2))
      for (const garment of hint.glow) {
        const piece = hall.pieces[garment]
        if (piece.mode === 'rest') this.posed(piece, piece.x, piece.y, () => this.stamp(sprites.garments.glow[garment]))
      }
      g.globalAlpha = 1
    }
    for (const garment of GARMENTS) {
      const piece = hall.pieces[garment]
      if (piece.mode === 'rest' && hall.whereShown(garment) === 'rack') this.piece(hall, piece, piece.x, piece.y)
    }
    for (const who of hall.backToFront()) this.wearer(hall, who)
    // A garment that would go on if the finger let go now: the dotted line it was cut along, where it would lie.
    for (const garment of GARMENTS) {
      const pose = hall.offerPose(garment)
      if (!pose) continue
      const open = garment === 'umbrella' && hall.openSeen
      g.beginPath()
      this.posedAt(pose, garment, () => trace(g, outlinesOf(garment, open)))
      g.setLineDash([9, 7])
      g.strokeStyle = KEY_LINE
      g.lineWidth = 2.6
      g.stroke()
      g.setLineDash([])
      brush.calls += 1
    }
    // Whatever is in the hand or in the air is above everything.
    for (const garment of GARMENTS) {
      const piece = hall.pieces[garment]
      if (piece.mode !== 'rest') this.piece(hall, piece, piece.x, piece.y)
    }
    this.splashes(hall)
    if (hall.ripple) {
      const age = (t - hall.ripple.at) / 0.38
      if (age >= 0 && age < 1) {
        g.beginPath()
        g.arc(hall.ripple.x, hall.ripple.y, 12 + age * 46, 0, Math.PI * 2)
        g.globalAlpha = 1 - age
        g.strokeStyle = PAPER
        g.lineWidth = 4 * (1 - age) + 1
        g.stroke()
        g.globalAlpha = 1
        brush.calls += 1
      }
    }
    if (hint && guidance) {
      if (hint.spot) {
        g.globalAlpha = guidance.glow * (0.55 + 0.2 * Math.sin(t * 3.2))
        g.save()
        g.translate(hint.from.x, hint.from.y - 8)
        this.stamp(sprites.garments.spot)
        g.restore()
        g.globalAlpha = 1
      }
      if (guidance.demo !== null) {
        const pose = handPose(guidance.demo, hint.move === 'carry', this.hand)
        g.save()
        g.globalAlpha = pose.opacity * 0.95
        g.translate(hint.from.x + (hint.to.x - hint.from.x) * pose.travel, hint.from.y + (hint.to.y - hint.from.y) * pose.travel + (1 - pose.press) * 10)
        const k = 1.45 - 0.12 * pose.press
        g.scale(k, k)
        this.stamp(sprites.scenery.hand)
        g.restore()
        g.globalAlpha = 1
      }
    }
  }

  /** What moves or changes in the setting: the window's weather, the cockerel on its pole, the clock's pendulum and the door. */
  private setting(hall: Hall): void {
    const g = this.g, brush = this.brush, scenery = this.sprites!.scenery, t = hall.t, weather = hall.weatherShown
    this.stamp(scenery.pane[weather])
    // The weather falls or blows in the clear glass above the sash's rail.
    const how = traceWeather(g, weather, t, WINDOW.x0 + 8, WINDOW.y0 + 6, WINDOW.x1 - 8, SASH_Y - 2, weather === 'wind' ? 6 : 12, { x: WINDOW.x0 + 36, y: WINDOW.y0 + 40, r: 20 })
    paintWeather(brush, weather, how, 1.8)
    // The cockerel stands at the heading of the weather it points at, with a small sway, and goes round under a finger and in its showing.
    g.save()
    g.translate(VANE.x, VANE.y)
    g.rotate(0.07 * Math.sin(t * 2.3) + hall.vaneSwing.x * 0.12)
    g.scale(cockerelAcross(hall.vaneTurn + hall.vaneSpin + 0.012 * Math.sin(t * 0.7) + hall.vaneSwing.x * 0.02), 1)
    this.stamp(scenery.cockerel)
    g.restore()
    g.save()
    g.translate(CLOCK.x, CLOCK.y)
    g.rotate(0.3 * Math.sin(t * 3))
    this.stamp(scenery.pendulum)
    g.restore()
    // The door: what is outside shows where the leaf has left the frame.
    if (hall.doorOpen > 0.001) {
      g.fillStyle = SKY[weather]
      g.fillRect(DOOR.x0, DOOR.y0, DOOR.x1 - DOOR.x0, DOOR.y1 - DOOR.y0)
      brush.calls += 1
    }
    g.save()
    g.translate(DOOR.x1, DOOR.y1)
    g.rotate(hall.doorKnock.x * 0.012)
    g.scale(1 - 0.82 * hall.doorOpen, 1)
    this.stamp(scenery.door)
    g.restore()
  }

  /** One figure or the dog, with whatever it has on, moving as it does. */
  private wearer(hall: Hall, who: Wearer): void {
    const g = this.g, brush = this.brush, figures = this.sprites!.figures, actor = hall.actors[who], t = hall.t
    const idle = idleOf(who, t), middle = who === hall.turn, waits = who !== 'dog' && !middle
    // The one who raps the glass holds still to do it, so that its knuckles are where the hall says they are, and its arm is lifted off the sheet.
    const rap = hall.rapArm(), raps = rap !== null && rap.who === who ? rap : null
    if (raps) {
      const calm = 1 - hall.rapReach
      idle.hop *= calm
      idle.tilt *= calm
      idle.squash *= calm
      idle.bend *= calm
    }
    const arms = (lifted: boolean) => {
      if (!raps) return
      if (lifted) drawArm(brush, figures, raps.who, 1, raps.aim)
      else drawArm(brush, figures, raps.who, -1, null)
    }
    // The one in the middle sits low on the edge of its stand when its cycle is over, and stretches before it sits.
    const sit = middle ? hall.sit : 0, stretch = middle ? hall.stretch : 0
    const squash = idle.squash + actor.squash.x + 0.2 * sit - 0.07 * stretch, bend = idle.bend * (1 - sit) + actor.bend.x
    const worn = hall.wornBy(who).filter((garment) => hall.pieces[garment].mode === 'rest')
    g.save()
    g.translate(actor.x, actor.y - idle.hop * (1 - sit) - Math.abs(actor.hop.x) - actor.walkHop - 8 * stretch)
    // The two who wait lean to the one in the middle when the ending has them look.
    g.rotate(idle.tilt * (1 - sit) + actor.tilt.x + actor.walkTilt - 0.05 * sit + (waits ? 0.05 * hall.heads : 0))
    g.scale(actor.facing * (1 + squash * 0.6), 1 - squash)
    const face = () => {
      // The one in the middle and the dog keep glancing at the door; the two who wait look out of the window.
      const quiet = 1 - Math.min(1, Math.hypot(actor.eyeX, actor.eyeY) * 3)
      const glance = waits ? 0 : glanceOf(who, t) * quiet * (1 - sit)
      const dx = DOOR_EYE.x - actor.x, dy = DOOR_EYE.y - (actor.y - 300), far = Math.hypot(dx, dy) || 1
      brush.calls += drawFace(g, who, actor.face, actor.eyeX + (dx / far) * glance * 0.9, actor.eyeY + (dy / far) * glance * 0.9, blinking(who, t) && actor.face === 'rest')
    }
    const clothes = (upper: boolean | null, low: boolean | null = null) => {
      for (const garment of worn) {
        const piece = hall.pieces[garment], y = piece.y - actor.y
        if (upper !== null && y < CREASE_Y !== upper) continue
        if (low !== null && UNDER_THE_HEAD.includes((hall.whereShown(garment) as Spot).part) !== low) continue
        this.piece(hall, piece, piece.x - actor.x, y)
      }
    }
    if (who === 'grandfather') {
      // He bends at the crease across his middle and nowhere else: his legs stand, and all above them leans.
      this.stamp(raps ? figures.armless.grandfatherLegs : figures.grandfatherLegs)
      clothes(false)
      g.translate(0, CREASE_Y)
      g.rotate(bend)
      g.translate(0, -CREASE_Y)
      this.stamp(raps ? figures.armless.grandfatherTop : figures.grandfatherTop)
      arms(false)
      face()
      clothes(true)
      arms(true)
    } else if (who === 'dog') {
      g.save()
      g.translate(TAIL_AT.x, TAIL_AT.y)
      g.rotate(bend)
      this.stamp(figures.tail)
      g.restore()
      this.stamp(figures.dog)
      clothes(null)
      // Its head comes through whatever is on its back, and its lead hangs from its mouth or lies where it dropped it.
      this.stamp(figures.dogHead)
      face()
      g.save()
      g.translate(LEAD_AT.x + 10 * hall.leadDown, LEAD_AT.y + 80 * hall.leadDown)
      g.rotate(1.35 * hall.leadDown)
      this.stamp(figures.lead)
      g.restore()
    } else if (who === 'baby') {
      // Its head comes through whatever is on its body or its feet: a coat on the baby is a tent with a face in the collar.
      this.stamp(figures.baby)
      clothes(null, true)
      this.stamp(figures.babyHead)
      face()
      clothes(null, false)
    } else {
      this.stamp(raps ? figures.armless[who] : figures[who])
      arms(false)
      face()
      clothes(null)
      arms(true)
    }
    // A raincoat worn on the head covers the face and leaves the nose out.
    const coat = hall.whereShown('raincoat')
    if (who !== 'dog' && coat !== 'rack' && coat.who === who && coat.part === 'head' && hall.pieces.raincoat.mode === 'rest') {
      const at = BODIES[who].face
      g.beginPath()
      g.ellipse(at.x, at.y + 12, 11, 13, 0, 0, Math.PI * 2)
      g.fillStyle = '#e9a98a'
      g.fill()
      g.strokeStyle = KEY_LINE
      g.lineWidth = 2
      g.stroke()
      brush.calls += 2
    }
    g.restore()
  }

  /** Drops and flakes shaken off: a few, flying out and falling, for well under a second. */
  private splashes(hall: Hall): void {
    const g = this.g
    if (hall.splashes.length === 0) return
    g.beginPath()
    for (const splash of hall.splashes) {
      const age = (hall.t - splash.at) / SPLASH_SECONDS
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * (0.15 + 0.14 * i), far = 70 * age
        const x = splash.x + Math.cos(a) * far, y = splash.y + Math.sin(a) * far + 120 * age * age
        g.moveTo(x + 3.5, y)
        g.arc(x, y, 3.5 * (1 - age * 0.5), 0, Math.PI * 2)
      }
    }
    g.fillStyle = hall.splashes[0].mark === 'snowy' ? SNOW : WET
    g.fill()
    this.brush.calls += 1
  }

  /** Sets the pen on a garment's pin in a pose and calls `each` once, or once for each piece of a pair with the pen on that piece. */
  private posedAt(pose: Pose, garment: Garment, each: (side: 1 | -1) => void): void {
    const g = this.g
    const cos = Math.cos(pose.rot), sin = Math.sin(pose.rot)
    const sides: readonly (1 | -1)[] = isPair(garment) ? [1, -1] : [1]
    for (const side of sides) {
      const dx = isPair(garment) ? side * pose.sep : 0
      // A path traced in here keeps its place when the pen is put back, so it is stroked in stage units.
      g.save()
      g.transform(cos * side, sin * side, -sin, cos, pose.x + dx * cos, pose.y + dx * sin)
      each(side)
      g.restore()
    }
  }

  /** As `posedAt`, with the garment's own springs laid over the pose: its sag, its swing, its pop and the lift of a finger. */
  private posed(piece: Piece, x: number, y: number, each: (side: 1 | -1) => void): void {
    const g = this.g
    const spin = piece.turn > 0 ? Math.PI * 2 * (1 - piece.turn) ** 2 * (3 - 2 * (1 - piece.turn)) : 0
    const k = 1 + piece.pop.x + piece.lift * 0.05
    g.save()
    g.translate(x, y + piece.sag.x - piece.lift * 5)
    g.rotate(piece.rot + piece.swing.x * 0.5 + spin)
    g.scale(k, k)
    const sides: readonly (1 | -1)[] = isPair(piece.garment) ? [1, -1] : [1]
    for (const side of sides) {
      g.save()
      if (isPair(piece.garment)) {
        g.translate(side * piece.sep, 0)
        g.scale(side, 1)
      }
      each(side)
      g.restore()
    }
    g.restore()
  }

  /** One garment at a point of whatever the pen is set on, with its tabs and its fastening as they are now. */
  private piece(hall: Hall, piece: Piece, x: number, y: number): void {
    const g = this.g, brush = this.brush, sprites = this.sprites!.garments, garment = piece.garment
    const where = hall.whereShown(garment), worn = where !== 'rack' && piece.mode === 'rest'
    if (garment === 'mittens' && !worn) {
      // The string that keeps the pair together, over the peg.
      g.save()
      g.translate(x, y + piece.sag.x)
      g.beginPath()
      g.moveTo(-piece.sep, -2)
      g.quadraticCurveTo(0, -30, piece.sep, -2)
      g.strokeStyle = '#a8336a'
      g.lineWidth = 2
      g.stroke()
      g.restore()
      brush.calls += 1
    }
    this.posed(piece, x, y, (side) => {
      if (garment === 'boots' && worn) {
        // A boot that is not pulled on yet sits high and askew on the foot, and comes down a tug at a time.
        const off = TUG_STEPS - hall.tugShown
        g.translate(0, -9 * off)
        g.rotate(0.09 * off)
      }
      const open = garment === 'umbrella' && hall.openShown > 0.5
      if (garment === 'umbrella') g.scale(open ? 0.35 + 0.65 * hall.openShown : 1 - 0.3 * hall.openShown, 1)
      const tabs = TAB_AT[garment]
      const folds = isPair(garment) ? [piece.fold[side === 1 ? 0 : 1] ?? 0] : piece.fold
      const state: TabState = folds.every((fold) => fold <= 0) ? 'flat' : folds.every((fold) => fold >= 1) ? 'folded' : 'none'
      if (state === 'none') {
        drawTabs(g, tabs, folds)
        brush.calls += 2
      }
      this.stamp(open ? sprites.openUmbrella[state] : sprites.piece[garment][state])
      if (garment === 'raincoat') drawZip(brush, sprites, hall.zipShown, worn)
      if (garment === 'duffel') drawButtons(brush, sprites, hall.buttonShown)
    })
    // What the last outing left on it: drops along the lower edge of a wet garment, snow along the top of a
    // snowy one, as it lies now. They are drawn from the garment's own pin, so they go where it goes: with the
    // figure that nods or hops, and into the hand.
    if (piece.mark === 'dry') return
    const box = paperBox(garment, { x: 0, y: 0, rot: piece.rot, sep: piece.sep }, garment === 'umbrella' && hall.openSeen), w = box.x1 - box.x0
    g.save()
    g.translate(x, y + piece.sag.x - piece.lift * 5)
    g.beginPath()
    for (let i = 0; i < 3; i++) {
      const at = box.x0 + w * (0.22 + i * 0.28)
      if (piece.mark === 'wet') {
        // On the paper, just above its hem: drops that hung below a hat would read as tears.
        const low = box.y1 - 16 - (i % 2) * 7
        g.moveTo(at, low - 8)
        g.quadraticCurveTo(at + 5, low, at, low + 4)
        g.quadraticCurveTo(at - 5, low, at, low - 8)
      } else {
        g.moveTo(at + 9, box.y0 + 5)
        g.ellipse(at, box.y0 + 5, 9 + (i % 2) * 3, 5, 0, 0, Math.PI * 2)
      }
    }
    g.fillStyle = piece.mark === 'wet' ? WET : SNOW
    g.fill()
    g.restore()
    brush.calls += 1
  }
}
