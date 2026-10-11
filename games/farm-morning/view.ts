import { GOAT, HEN, HORIZON, INK, PIG, PONY, card, makePieces, paintPage, paintPageEdge, stamp, useCanvases, washed, type Ctx, type Pieces, type Sheet, type Surface } from './art'
import type { Tier } from './config'
import type { Bit, Farm } from './farm'
import { handPose, type Guidance, type HandPose } from './guidance'
import { BODY, CLOUDS, DOOR, FEET, HENHOUSE, HENS, HOME, MIDDLE, NEAR, RACK, ROOFTOP, SUN, THINGS, TROUGH, WALLOW, centreOf, doorBox, doorTarget, type Point, type ThingId } from './layout'
import { asleepRig, blankHen, blankRig, catStretches, catTail, cloudDrift, crowLift, goatRig, hatchLift, henExtras, leftRig, henRig, henTurned, perkRig, pigRig, ponyRig, settledRig, sunTurn, turnedRig, yawnRig, type HenRig, type Rig } from './motion'
import { fit, type Fit } from './stage'
import { ANIMALS } from './state'
import { RIGHT } from './cells'

// The view: one frame of the yard, drawn from the model. The page is painted
// once for a surface and stamped as the frame's one full-surface draw; every
// moving thing is a piece of card painted once (art.ts) and stamped where the
// rig puts it (motion.ts). What is drawn live each frame is small: pupils and
// lids, the hens' legs, the pig's mouth and the loose bits, each as one path.
// `draws` is what the frame-budget test counts: stamps plus live strokes and
// fills. The night is the same frame from other stamps: a night ground in
// place of the day's, and every piece from its own night stamp, each made
// once under one wash and kept, so no frame covers the surface twice.

export { useCanvases }

const TAU = Math.PI * 2
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const bump = (t: number, length: number): number => (t <= 0 || t >= length ? 0 : Math.sin((t / length) * Math.PI))

type Gaze = { x: number; y: number }

/** The night's wash: what the day's card looks like under it, and the same for a colour that is drawn live. */
const NIGHT = { r: 20, g: 28, b: 82, a: 0.6 }
const NIGHT_WASH = `rgba(${NIGHT.r},${NIGHT.g},${NIGHT.b},${NIGHT.a})`
const dimmed = new Map<string, string>()
function dim(colour: string): string {
  let to = dimmed.get(colour)
  if (to) return to
  if (colour[0] !== '#' || colour.length !== 7) return colour
  const n = parseInt(colour.slice(1), 16)
  const mix = (day: number, night: number): number => Math.round(day * (1 - NIGHT.a) + night * NIGHT.a)
  to = `rgb(${mix((n >> 16) & 255, NIGHT.r)},${mix((n >> 8) & 255, NIGHT.g)},${mix(n & 255, NIGHT.b)})`
  dimmed.set(colour, to)
  return to
}

/** Every sheet of a set of pieces, washed. */
function washedPieces<T>(pieces: T): T {
  if (Array.isArray(pieces)) return pieces.map((piece) => washedPieces(piece)) as T
  const sheet = pieces as unknown as Sheet
  if (sheet.image) return { ...sheet, image: washed(sheet.image, NIGHT_WASH) } as T
  return Object.fromEntries(Object.entries(pieces as object).map(([name, piece]) => [name, washedPieces(piece)])) as T
}

export class YardView {
  /** Stamps plus live strokes and fills in the last frame. */
  draws = 0
  stamps = 0
  /** How many of those covered the whole surface: the page, by day and by night, and nothing else. */
  full = 0
  /** The night's ground and the night's pieces, made the first time a night falls and kept. */
  private nightPage: Surface | null = null
  private nightPieces: Pieces | null = null
  /** Whether this frame is the night's: live colours are then drawn as they look under the wash. */
  private dark = false
  private readonly ctx: Ctx
  private pieces: Pieces | null = null
  private band: Sheet | null = null
  private page: Surface | null = null
  /** The same page in the full light of a morning in which everyone has their thing. */
  private bright: Surface | null = null
  /** The density the pieces were painted at, in pixels a stage unit. */
  private k = 0
  private dpr = 1
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private readonly rig: Rig = blankRig()
  private readonly hen: HenRig = blankHen()
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** Where each pair of eyes is looking, eased frame by frame: the pony, the goat, the pig and the three hens. */
  private readonly gaze: Gaze[] = Array.from({ length: 6 }, () => ({ x: 0, y: 0 }))

  constructor(canvas: { getContext(kind: '2d'): unknown }) {
    this.ctx = canvas.getContext('2d') as Ctx
  }

  /** The fit of the stage into the surface, for touches. */
  get fit(): Fit {
    return this.by
  }

  /**
   * The surface has a new size or pixel ratio. The page is painted again for it. The pieces are painted again
   * only when the surface has grown past what they were painted for or shrunk to under half of it: a quality
   * tier that lowers the pixel ratio stamps the same pieces smaller, so a change of tier costs one page.
   */
  resize(width: number, height: number, dpr: number): void {
    this.dpr = dpr
    this.by = fit(width, height)
    if (this.by.scale <= 0) return
    const k = dpr * this.by.scale
    if (!this.pieces || k > this.k * 1.12 || k < this.k * 0.5) {
      this.k = k
      this.pieces = makePieces(k)
      this.nightPieces = null
      this.band = card(k, [-60, -4, 60, 4], (c) => {
        const g = c.createLinearGradient(-60, 0, 60, 0)
        g.addColorStop(0, 'rgba(255,255,255,0)')
        g.addColorStop(0.45, 'rgba(255,255,255,0.34)')
        g.addColorStop(0.6, 'rgba(255,255,255,0.1)')
        g.addColorStop(0.72, 'rgba(255,255,255,0.2)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        c.fillStyle = g
        c.fillRect(-60, -4, 120, 8)
      }, 0, false)
    }
    const page = card(1, [0, 0, 1, 1], () => {}, 0, false).image
    page.width = Math.max(1, Math.round(width * dpr))
    page.height = Math.max(1, Math.round(height * dpr))
    const p = page.getContext('2d') as Ctx
    p.setTransform(k, 0, 0, k, dpr * this.by.x, dpr * this.by.y)
    paintPage(p)
    p.setTransform(dpr, 0, 0, dpr, 0, 0)
    paintPageEdge(p, width, height)
    this.page = page
    this.nightPage = null
    // The bright page is the page again under a warm wash, made once, so full light costs no draw of its own.
    const bright = card(1, [0, 0, 1, 1], () => {}, 0, false).image
    bright.width = page.width
    bright.height = page.height
    const b = bright.getContext('2d') as Ctx
    b.drawImage(page as CanvasImageSource, 0, 0)
    b.fillStyle = 'rgba(255,246,196,0.2)'
    b.fillRect(0, 0, bright.width, bright.height)
    this.bright = bright
  }

  /**
   * One frame. With no farm yet (the slot is still being read) it is the bare page. `step` is the seconds this
   * frame plays, for the eyes; `turn` is which showing of the idle ladder this is.
   */
  draw(farm: Farm | null, guidance: Guidance | null, tier: Tier, step: number): void {
    const c = this.ctx
    this.draws = 0
    this.stamps = 0
    this.full = 0
    if (this.by.scale <= 0 || !this.page || !this.pieces) return
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalAlpha = 1
    // The night turns the page: past half dark, the frame is stamped from the night's ground and the night's pieces.
    this.dark = farm !== null && farm.dark > 0.5
    // They are made as dusk begins, a moment before they are needed, so the turn itself costs nothing.
    if (farm && farm.dark > 0.01) {
      this.nightPage ??= washed(this.page, NIGHT_WASH)
      this.nightPieces ??= washedPieces(this.pieces)
    }
    c.drawImage((this.dark ? this.nightPage : farm && farm.light > 0.5 && this.bright ? this.bright : this.page) as CanvasImageSource, 0, 0)
    this.count(true)
    this.full += 1
    if (!farm) return
    const k = this.dpr * this.by.scale
    c.setTransform(k, 0, 0, k, this.dpr * this.by.x, this.dpr * this.by.y)
    const day = this.pieces
    const p = this.dark && this.nightPieces ? this.nightPieces : day
    const time = farm.time
    this.look(farm, step)

    this.sky(farm, p, time)
    this.loft(farm, p, time)
    this.henhouse(farm, p, time)
    this.wants(farm, p)
    this.pony(farm, p, time)
    this.goat(farm, p, time)
    // Back to front by where the feet stand: the hens on their own ground with the trough among them, then the
    // step with the pump and the things, then the pig, then a hen that has come round in front of the pig.
    this.flock(farm, p, time, 'back')
    this.things(farm, p)
    this.pig(farm, p, time)
    this.flock(farm, p, time, 'front')
    this.bits(farm.bits)
    this.held(farm, p)
    if (this.dark) this.night(farm, day)
    this.dark = false
    if (guidance) this.guide(farm, day, guidance, time)
    if (tier.gloss && farm.gloss.age < 0.6 && this.band) {
      // The laminate catches the light where the finger landed: one streak sweeps across the page.
      const t = farm.gloss.age / 0.6
      c.save()
      c.translate(farm.gloss.x - 160 + t * 620, farm.gloss.y)
      c.rotate(0.38)
      c.globalAlpha = Math.sin(t * Math.PI)
      c.scale(1, 200)
      this.put(this.band)
      c.restore()
      c.globalAlpha = 1
    }
  }

  // --- Counting -------------------------------------------------------------------------------

  private count(isStamp: boolean): void {
    this.draws += 1
    if (isStamp) this.stamps += 1
  }

  private put(sheet: Sheet): void {
    stamp(this.ctx, sheet)
    this.count(true)
  }

  private ink(colour: string): void {
    this.ctx.fillStyle = this.dark ? dim(colour) : colour
    this.ctx.fill()
    this.count(false)
  }

  private line(colour: string, width: number): void {
    const c = this.ctx
    c.strokeStyle = this.dark ? dim(colour) : colour
    c.lineWidth = width
    c.lineCap = 'round'
    c.stroke()
    this.count(false)
  }

  /** A piece at a place, turned and sized round its own origin. */
  private at(sheet: Sheet, x: number, y: number, turn = 0, sx = 1, sy = sx): void {
    const c = this.ctx
    c.save()
    c.translate(x, y)
    if (turn) c.rotate(turn)
    if (sx !== 1 || sy !== 1) c.scale(sx, sy)
    this.put(sheet)
    c.restore()
  }

  // --- Eyes -----------------------------------------------------------------------------------

  /** Where everyone is looking: at the last touch while it is fresh, at a lifted thing, and otherwise now and then at the thing each is short of. */
  private look(farm: Farm, step: number): void {
    const hand = farm.hand
    const k = step > 0 ? 1 - Math.exp(-step * 9) : 1
    const eyes: Point[] = [MIDDLE.pony, MIDDLE.goat, MIDDLE.pig, ...farm.hens.map((hen) => ({ x: hen.x, y: hen.y - 80 }))]
    eyes.forEach((eye, i) => {
      const animal = i < 3 ? (['pony', 'goat', 'pig'] as const)[i] : 'hens'
      let to: Point | null = null
      if (farm.watching > 0) to = farm.look
      else if (hand) to = hand
      else if (farm.filled[animal] < 0.5 && ((farm.time + i * 1.7) % 6.5) < 1.8) to = HOME[RIGHT[animal]]
      let x = 0, y = 0
      if (to) {
        const dx = to.x - eye.x, dy = to.y - eye.y
        const far = Math.hypot(dx, dy) || 1
        const reach = Math.min(1, far / 160)
        x = (dx / far) * reach
        y = (dy / far) * reach
      }
      const gaze = this.gaze[i]
      gaze.x += (x - gaze.x) * k
      gaze.y += (y - gaze.y) * k
    })
  }

  /** Two pupils and, when the lids are down, two lids, for a head whose transform is set. `flip` is -1 for a head that is drawn mirrored. */
  private eyes(eyes: readonly Point[], r: number, gaze: Gaze, lid: number, skin: string, flip: 1 | -1, slot = false): void {
    const c = this.ctx
    const reach = r * 0.62
    c.beginPath()
    for (const eye of eyes) {
      const x = eye.x + gaze.x * reach * flip, y = eye.y + gaze.y * reach
      if (slot) { c.moveTo(x + r * 1.05, y); c.ellipse(x, y, r * 1.05, r * 0.46, 0, 0, TAU) }
      else { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU) }
    }
    this.ink(INK.pupil)
    if (lid <= 0.04) return
    // A lid comes down from the top of the eye: the cap of the eye's own oval, in the colour of the head.
    const rx = r * 1.95, ry = r * 2.3
    const cut = Math.asin(Math.max(-1, Math.min(1, -1 + 2 * lid)))
    c.beginPath()
    for (const eye of eyes) {
      c.moveTo(eye.x + Math.cos(Math.PI - cut) * rx, eye.y + Math.sin(Math.PI - cut) * ry)
      c.ellipse(eye.x, eye.y, rx, ry, 0, Math.PI - cut, TAU + cut)
      c.closePath()
    }
    this.ink(skin)
    if (lid < 0.7) return
    // Shut tight, an eye is a dark curve along the edge of its lid.
    c.beginPath()
    for (const eye of eyes) {
      const y = eye.y + ry * (2 * lid - 1) * 0.5
      c.moveTo(eye.x - rx * 0.8, y)
      c.quadraticCurveTo(eye.x, y + ry * 0.5, eye.x + rx * 0.8, y)
    }
    this.line(INK.pupil, Math.max(2, r * 0.55))
  }

  // --- The sky and the loft --------------------------------------------------------------------

  private sky(farm: Farm, p: Pieces, time: number): void {
    const c = this.ctx
    // The sun is a wheel in the sky: its rays turn slowly, and a touch spins them one whole turn. In the full light of a morning in
    // which everyone has their thing its long rays come out. At night it slides down behind the near hill.
    const spin = time * 0.12 + sunTurn(farm.sunSpin)
    const y = farm.sun + farm.sunDip * (HORIZON.yard + 26 - farm.sun)
    const dips = farm.sunDip > 0.01
    if (dips) {
      c.save()
      c.beginPath()
      c.rect(SUN.x - 200, -400, 400, 400 + HORIZON.yard)
      c.clip()
    }
    if (farm.light > 0.01) {
      c.globalAlpha = farm.light
      this.at(p.longRays, SUN.x, y, -spin * 0.5, 0.6 + 0.4 * farm.light)
      c.globalAlpha = 1
    }
    this.at(p.sunRays, SUN.x, y, spin)
    this.at(p.sunFace, SUN.x, y, 0, 1 + 0.08 * Math.sin(farm.sunSpin * Math.PI))
    if (dips) {
      c.restore()
      this.put(p.hill)
    }
    CLOUDS.forEach((cloud, i) => {
      const bob = farm.cloudBob[i]
      this.at(p.cloud, cloud.x + cloudDrift(i, time), cloud.y - 14 * Math.sin(bob * Math.PI), 0, i ? 0.86 : 1, (i ? 0.86 : 1) * (1 - 0.14 * Math.sin(bob * Math.PI)))
    })
  }

  /** What shines in the night, in front of the night's ground and pieces and in its own colours: the stars and the moon. */
  private night(farm: Farm, day: Pieces): void {
    const c = this.ctx
    this.dark = false
    c.globalAlpha = clamp01((farm.dark - 0.5) * 2.5)
    c.beginPath()
    for (const [x, y, r] of STARS) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU) }
    this.ink('#fff6cf')
    if (farm.moon >= 0) {
      // The moon crosses high, above the roof and the pony's ears.
      const t = farm.moon
      this.at(day.moon, 560 + 560 * t, 76 - 36 * Math.sin(t * Math.PI), -0.5 + t)
    }
    c.globalAlpha = 1
  }

  private loft(farm: Farm, p: Pieces, time: number): void {
    const c = this.ctx
    const h = HENHOUSE.hatch
    const lift = hatchLift(farm.hatch)
    // The tail hangs out under the hatch and swings; the cat comes up into the dark when the hatch lifts.
    // Out on the roof, it has hopped up from the hatch and sits on the slope; its tail no longer hangs below.
    const out = farm.cat
    if (out < 0.95) { c.globalAlpha = 1 - out; this.at(p.catTail, h.x + 70, h.y + h.h - 2, catTail(time) * 0.5); c.globalAlpha = 1 }
    if (out > 0.02) {
      const from = { x: h.x + h.w / 2, y: h.y + 30 }
      const e = out * out * (3 - 2 * out)
      const stretch = catStretches(farm.catStretch)
      c.globalAlpha = Math.min(1, out * 3)
      this.at(p.catSit, from.x + (ROOFTOP.x - from.x) * e, from.y + (ROOFTOP.y - 10 - from.y) * e - 46 * Math.sin(e * Math.PI), 0.3 * (1 - e), (0.5 + 0.5 * e) * (1 + 0.3 * stretch), (0.5 + 0.5 * e) * (1 - 0.22 * stretch))
      c.globalAlpha = 1
    }
    if (lift > 0.02 && out < 0.5) this.at(p.cat, h.x + h.w / 2, h.y + h.h * 0.62 + 18 * (1 - lift))
    // The hatch is a flap hinged along its top: lifting, it shortens and darkens.
    c.save()
    c.translate(h.x, h.y)
    c.transform(1, 0, -0.12 * lift, Math.max(0.12, Math.cos(lift * 1.36)), 0, 0)
    this.put(p.hatch)
    if (lift > 0.02) {
      c.globalAlpha = 0.34 * lift
      c.beginPath()
      c.rect(0, 0, h.w, h.h)
      this.ink('#2a1a10')
      c.globalAlpha = 1
    }
    c.restore()
  }

  // --- The henhouse: the hens inside, the door, and their beaks at its holes ------------------------

  private henhouse(farm: Farm, p: Pieces, time: number): void {
    const c = this.ctx
    const open = HENHOUSE.opening
    // Hens that are inside are seen through the doorway only.
    c.save()
    c.beginPath()
    c.rect(open.x, open.y, open.w, open.h + 90)
    c.clip()
    this.flock(farm, p, time, 'inside')
    c.restore()
    const door = doorBox(farm.slide)
    const shake = farm.doorShake > 0 ? Math.sin(time * 60) * 6 * farm.doorShake : 0
    this.at(p.door, door.x + shake, door.y)
    if (farm.crow >= 0 && farm.slide < 0.03) {
      // The white hen crows from her hole: her beak is thrown up through it at every note.
      const hole = DOOR.holes[0]
      const lift = crowLift(farm.crow)
      this.at(p.beak, door.x + shake + hole.x + 4, door.y + hole.y - 2 - 9 * lift, -0.75 - 0.35 * lift, HENS[0].size * (1.05 + 0.15 * lift))
    }
    if (farm.slide < 0.03 && farm.peek > 0.5) {
      // Shut in, each pokes her beak through a hole and points it at the trough.
      farm.hens.forEach((hen, i) => {
        if (!hen.inside) return
        const hole = DOOR.holes[i]
        const peck = Math.max(0, Math.sin(time * [2.1, 3.3, 4.7][i] + i * 2)) ** 6
        this.at(p.beak, door.x + shake + hole.x + 6 + peck * 9, door.y + hole.y + 5 + peck * 5, 0.5 + 0.2 * Math.sin(time * [1.3, 1.9, 2.6][i] + i), HENS[i].size)
      })
    }
  }

  // --- What each animal is short of -----------------------------------------------------------

  private wants(farm: Farm, p: Pieces): void {
    const c = this.ctx
    const rack = centreOf(RACK)
    this.cross(p.rack, farm.filled.goat, rack.x, rack.y + 8)
    if (farm.filled.pig > 0.01) {
      c.globalAlpha = farm.filled.pig
      this.at(p.wetWallow, WALLOW.x + WALLOW.w / 2, WALLOW.y + WALLOW.h / 2)
      c.globalAlpha = 1
    }
  }

  /** An empty piece filling up: what goes into it piles up from the bottom, so the full piece shows from its foot upwards. */
  private cross(pair: readonly Sheet[], filled: number, x: number, y: number): void {
    const c = this.ctx
    if (filled < 0.99) this.at(pair[0], x, y)
    if (filled > 0.01) {
      const full = pair[1]
      c.save()
      c.beginPath()
      c.rect(x + full.x, y + full.y + full.h * (1 - filled), full.w, full.h * filled)
      c.clip()
      this.at(full, x, y)
      c.restore()
    }
  }

  /** What the scenes and chance lay over an animal's rig: asleep in the night, its settled move in the ending, and which ear leads this time. */
  private own(animal: 'pony' | 'goat' | 'pig', farm: Farm, rig: Rig, time: number): Rig {
    if (farm.answers[animal]?.mirror) { const ear = rig.earL; rig.earL = rig.earR; rig.earR = ear }
    // A thing lifted brings every ear up; a knock on the page close by brings this one's head round.
    perkRig(rig, farm.lifted)
    if (farm.turned?.animal === animal) (farm.turned.left ? leftRig : turnedRig)(rig, farm.turned.since, farm.look.y < MIDDLE[animal].y - 40)
    settledRig(rig, farm.settled[animal], animal)
    yawnRig(rig, farm.yawned[animal])
    return asleepRig(rig, farm.sleep[animal], time, animal)
  }

  // --- The pony ---------------------------------------------------------------------------------

  private pony(farm: Farm, p: Pieces, time: number): void {
    const c = this.ctx
    const a = farm.answers.pony
    const r = this.own('pony', farm, ponyRig(time, farm.filled.pony, a?.id ?? null, a?.t ?? 0, a?.lasts ?? 1, farm.eager === 'pony', this.rig), time)
    c.save()
    c.translate(FEET.pony.x + r.dx, FEET.pony.y + r.dy)
    // It faces left, so a lean to its front turns it the other way round.
    c.rotate(-r.rot)
    c.scale(r.sx, r.sy)
    this.at(p.ponyTail, PONY.tail.x, PONY.tail.y, -r.tail * 0.7)
    const dust = 1 - farm.filled.pony
    if (dust < 0.99) this.put(p.ponyClean)
    if (dust > 0.01) { c.globalAlpha = dust; this.put(p.ponyDusty); c.globalAlpha = 1 }
    c.translate(PONY.neck.x - r.headX, PONY.neck.y + r.headY)
    c.rotate(-r.head)
    this.at(p.ponyEar, PONY.earL.x, PONY.earL.y, -0.35 - r.earL)
    this.at(p.ponyEar, PONY.earR.x, PONY.earR.y, 0.3 + r.earR)
    this.put(p.ponyHead)
    this.at(p.ponyLip, PONY.lip.x - r.mouth * 4, PONY.lip.y + r.mouth * 20, -r.mouth * 0.32)
    this.eyes(PONY.eyes, PONY.eyeR, this.gaze[0], r.lid, INK.pony, 1)
    if (a?.id === 'fork-pony' && r.extra > 0.02) {
      // The wig is eaten from the fringe down: it gets shorter, chomp by chomp.
      c.globalAlpha = Math.min(1, r.extra * 5)
      this.at(p.wig, -48, -186 - 14 * (1 - r.extra), 0, 1, 0.35 + 0.65 * r.extra)
      c.globalAlpha = 1
    }
    c.restore()
  }

  // --- The goat ---------------------------------------------------------------------------------

  private goat(farm: Farm, p: Pieces, time: number): void {
    const c = this.ctx
    const a = farm.answers.goat
    const r = this.own('goat', farm, goatRig(time, farm.filled.goat, a?.id ?? null, a?.t ?? 0, a?.lasts ?? 1, farm.eager === 'goat', this.rig), time)
    c.save()
    c.translate(FEET.goat.x + r.dx, FEET.goat.y + Math.min(0, r.dy))
    c.rotate(r.rot)
    // Folded down, its legs go under it: the body sinks and the legs shorten with it.
    const fold = Math.max(0, r.dy) / 40
    c.scale(r.sx, r.sy * (1 - 0.3 * fold))
    this.at(p.goatTail, GOAT.tail.x, GOAT.tail.y, -r.tail * 0.5)
    this.put(p.goatBody)
    if (a?.id === 'bucket-goat' && r.extra > 0.02) {
      c.globalAlpha = Math.min(1, r.extra * 4)
      this.at(p.goatBelly, GOAT.middle.x, GOAT.middle.y + 26, 0, 0.5 + 0.56 * r.extra)
      c.globalAlpha = 1
    }
    if (a?.id === 'brush-goat' && r.extra > 0.02) {
      c.globalAlpha = Math.min(1, r.extra * 3)
      this.at(p.goatFluff, GOAT.middle.x, GOAT.middle.y + 8, 0.2 * Math.sin(time * 31) * r.extra * 0.1, 0.5 + 0.56 * r.extra)
      c.globalAlpha = 1
    }
    c.translate(GOAT.neck.x + r.headX, GOAT.neck.y + r.headY)
    c.rotate(r.head)
    c.save()
    c.translate(GOAT.earL.x, GOAT.earL.y)
    c.scale(-1, 1)
    c.rotate(0.25 + r.earL)
    this.put(p.goatEar)
    c.restore()
    this.at(p.goatJaw, GOAT.jaw.x + r.jaw * 8, GOAT.jaw.y + r.mouth * 16, r.jaw * 0.14)
    this.put(p.goatHead)
    this.at(p.goatEar, GOAT.earR.x, GOAT.earR.y, 0.2 + r.earR)
    this.eyes(GOAT.eyes, GOAT.eyeR, this.gaze[1], r.lid, INK.goat, 1, true)
    c.restore()
  }

  // --- The pig ----------------------------------------------------------------------------------

  private pig(farm: Farm, p: Pieces, time: number): void {
    const c = this.ctx
    const a = farm.answers.pig
    const r = this.own('pig', farm, pigRig(time, farm.filled.pig, a?.id ?? null, a?.t ?? 0, a?.lasts ?? 1, farm.eager === 'pig', this.rig), time)
    const rolled = a?.id === 'brush-pig' ? r.extra : 0
    const kick = a?.id === 'brush-pig' ? r.extra2 : 0
    c.save()
    c.translate(FEET.pig.x + r.dx, FEET.pig.y + r.dy)
    // It rolls round its own middle, over onto its back, and its trotters kick as it goes.
    c.translate(PIG.middle.x, PIG.middle.y)
    c.rotate(-r.rot - rolled * Math.PI * 0.94)
    c.scale(r.sx, r.sy)
    c.translate(-PIG.middle.x, -PIG.middle.y)
    this.at(p.pigTail, PIG.tail.x, PIG.tail.y, r.tail * 2.6, 0.72 + 0.28 * (1 - Math.abs(r.tail)))
    // Each trotter hangs from its own hip and kicks by itself, never two in step: the far pair behind the body, the near pair in front.
    const trot = (i: number): void => { const hip = PIG.trotters[i]; this.at(p.pigTrotter[hip.near ? 1 : 0], hip.x, hip.y, kick * 0.75 * Math.sin(time * [23, 29, 26, 31][i] + i * 1.9)) }
    trot(0); trot(1)
    this.put(p.pigBody)
    trot(2); trot(3)
    c.translate(PIG.head.x + r.headX, PIG.head.y + r.headY)
    c.rotate(-r.head)
    this.at(p.pigEar, PIG.earL.x, PIG.earL.y, -0.5 - r.earL)
    this.at(p.pigEar, PIG.earR.x, PIG.earR.y, 0.45 + r.earR)
    this.put(p.pigHead)
    if (r.mouth > 0.06) {
      c.beginPath()
      c.ellipse(PIG.mouth.x, PIG.mouth.y, 9 + 15 * r.mouth, 3 + 12 * r.mouth, 0, 0, TAU)
      this.ink(INK.pigNose)
    } else if (r.grin > 0.06) {
      // A grin: the shut mouth, turned up at both corners.
      const w = 14 + 16 * r.grin, up = 13 * r.grin
      c.beginPath()
      c.moveTo(PIG.mouth.x - w, PIG.mouth.y - up)
      c.quadraticCurveTo(PIG.mouth.x, PIG.mouth.y + up * 1.5, PIG.mouth.x + w, PIG.mouth.y - up)
      this.line(INK.pigNose, 6)
    }
    if (a?.id === 'scoop-pig' && r.extra > 0.02) {
      c.globalAlpha = r.extra
      this.at(p.pigMoustache, -32, 34)
      c.globalAlpha = 1
    }
    this.eyes(PIG.eyes, PIG.eyeR, this.gaze[2], r.lid, INK.pig, 1)
    c.restore()
    if (a?.id === 'fork-pig' && r.extra > 0.02) {
      c.globalAlpha = Math.min(1, r.extra * 2)
      this.at(p.pigStraw, FEET.pig.x + r.dx + PIG.middle.x, FEET.pig.y + r.dy + PIG.middle.y, -r.rot, 0.86 + 0.14 * r.extra)
      c.globalAlpha = 1
    }
  }

  // --- The hens ---------------------------------------------------------------------------------

  /** The hens that are inside the henhouse, or the ones that are out, back to front. Their legs are one stroke. */
  private flock(farm: Farm, p: Pieces, time: number, where: 'inside' | 'back' | 'front'): void {
    const c = this.ctx
    const a = farm.answers.hens
    const placed = (i: number): 'inside' | 'back' | 'front' => (farm.hens[i].inside || farm.hens[i].y < 548 ? 'inside' : farm.hens[i].y > FEET.pig.y ? 'front' : 'back')
    const order = farm.hens.map((_, i) => i).filter((i) => placed(i) === where).sort((i, j) => farm.hens[i].y - farm.hens[j].y)
    // The hen nearest a knock on the page turns to face it for a moment, where she stands; all three look after a thing taken from them.
    const looksRound = (i: number): boolean => farm.turned?.animal === 'hens' && (farm.turned.lead === i || farm.turned.left === true) && farm.hens[i].mode === 'stand' && farm.turned.since < 1.05
    const facingOf = (i: number): 1 | -1 => (looksRound(i) ? (farm.look.x >= farm.hens[i].x ? 1 : -1) : farm.hens[i].facing)
    // The trough stands among the hens: a hen behind it is drawn first, and one in front of it after.
    const trough = centreOf(TROUGH)
    const front = TROUGH.y + TROUGH.h - 8
    let troughDone = where !== 'back'
    if (order.length === 0) {
      if (!troughDone) this.cross(p.trough, farm.filled.hens, trough.x, trough.y + 4)
      return
    }
    const rigs = order.map((i) => {
      const hen = farm.hens[i]
      const rig = { ...henExtras(henRig(i, time, hen.mode, hen.speed, farm.filled.hens, a?.id ?? null, a?.t ?? 0, a?.lasts ?? 1, a?.lead === i, hen.pecked, this.hen), hen.trip, hen.shook, farm.settled.hens, hen.bumped) }
      if (looksRound(i)) henTurned(rig, farm.turned!.since)
      // Behind the shut door they are down on the straw, asleep or not yet up, until their faces come to the holes.
      if (hen.inside && where === 'inside') { rig.dy += 70 * (1 - farm.peek); rig.lid = Math.max(rig.lid, farm.sleep.hens) }
      return rig
    })
    // Legs first, all in one path: two for each hen, each with three toes.
    c.beginPath()
    order.forEach((i, n) => {
      const hen = farm.hens[i], rig = rigs[n]
      const size = HENS[i].size
      const walking = hen.mode === 'go' && hen.wait <= 0
      const facing = facingOf(i)
      for (const [hip, phase] of [[HEN.hipL, 0], [HEN.hipR, Math.PI]] as const) {
        // Walking, the legs swing in turn. Scratching, one foot rakes back along the ground and comes forward lifted.
        const rake = phase === 0 ? rig.scratch : 0
        const swing = walking ? Math.sin(hen.walked * 0.11 + phase) * 11 * size : -rake * 24 * size
        const lift = walking ? Math.max(0, Math.cos(hen.walked * 0.11 + phase)) * 7 * size : Math.max(0, -rake) * 12 * size
        // Sat down, her legs are folded under her: only her toes show.
        const top = { x: hen.x + facing * hip.x * size, y: hen.y + rig.dy + hip.y * size * (1 - rig.sit) }
        const foot = { x: top.x + facing * swing, y: hen.y - lift + Math.min(0, rig.dy) * 0.5 }
        c.moveTo(top.x, top.y)
        c.lineTo(foot.x, foot.y)
        for (const toe of [-8, 2, 11]) { c.moveTo(foot.x, foot.y); c.lineTo(foot.x + facing * toe * size, foot.y + (toe === 2 ? 5 : 3) * size) }
      }
    })
    this.line(INK.leg, 5)
    order.forEach((i, n) => {
      const hen = farm.hens[i], rig = rigs[n], piece = p.hens[i]
      if (!troughDone && hen.y >= front) { troughDone = true; this.cross(p.trough, farm.filled.hens, trough.x, trough.y + 4) }
      const size = HENS[i].size * (1 + rig.puff)
      const covered = a?.id === 'fork-hens' && a.lead === i ? rig.extra : 0
      c.save()
      c.translate(hen.x, hen.y + rig.dy - HEN.hipL.y * HENS[i].size * rig.sit)
      c.scale(facingOf(i) * size, size)
      c.rotate(rig.lean)
      if (covered > 0.02) {
        // A haystack with two feet and a beak; then her head comes out of the top.
        if (rig.extra2 > 0.02) {
          c.save()
          c.translate(-12, -112 - 34 * rig.extra2)
          this.put(piece.head)
          this.eyes([HEN.eye], HEN.eyeR, this.gaze[3 + i], 0, HEN_SKIN[i], facingOf(i))
          c.restore()
        } else {
          this.at(p.beak, 84, -58 + 3 * Math.sin(time * 9))
        }
        this.at(p.haystack, 0, 0, 0, 0.78, 0.78 * covered)
        c.restore()
        return
      }
      // The body tips forward round her hips, tail in the air.
      c.translate(0, -40)
      c.rotate(rig.rot)
      c.translate(0, 40)
      this.put(piece.body)
      c.save()
      c.translate(HEN.wing.x, HEN.wing.y)
      c.rotate(-rig.wing * 1.15)
      c.scale(1 + 0.25 * rig.wing, 1)
      this.put(piece.wing)
      c.restore()
      c.translate(HEN.neck.x + rig.neck * 20, HEN.neck.y + rig.neck * 8)
      c.rotate(rig.head - rig.rot * 0.5)
      this.put(piece.head)
      if (a?.id === 'brush-hens' && a.lead === i && rig.extra > 0.02) this.at(piece.crest, HEN.crest.x, HEN.crest.y, 0, 1, rig.extra)
      this.eyes([HEN.eye], HEN.eyeR, this.gaze[3 + i], rig.lid, HEN_SKIN[i], facingOf(i))
      c.restore()
    })
    if (!troughDone) this.cross(p.trough, farm.filled.hens, trough.x, trough.y + 4)
  }

  // --- The things -------------------------------------------------------------------------------

  private things(farm: Farm, p: Pieces): void {
    for (const thing of THINGS) {
      if (thing === 'bucket') {
        // The pump stands in front of the hens' ground, and its handle works when the bucket is lifted.
        this.at(p.pump, HOME.bucket.x, HOME.bucket.y)
        const t = farm.pressed.bucket
        this.at(p.pumpHandle, HOME.bucket.x - 71, HOME.bucket.y - 96, -0.45 + 0.5 * bump(t, 0.5) * Math.sin(t * TAU * 4))
      }
      if (farm.hand?.thing === thing) continue
      const squash = bump(farm.pressed[thing], 0.22)
      this.at(p[thing][0], HOME[thing].x, HOME[thing].y, 0, 1 + 0.06 * squash, 1 - 0.1 * squash)
    }
  }

  /**
   * The thing that is lifted: off the page and nearer the child, so it is plainly larger than the three that lie,
   * sways a little as a held thing does, and leaves a wide soft shadow on its own place. Carried, or tipping out
   * over an animal, it stays that size.
   */
  private held(farm: Farm, p: Pieces): void {
    const hand = farm.hand
    if (!hand) return
    const c = this.ctx
    const home = HOME[hand.thing]
    const resting = hand.mode === 'held' || hand.mode === 'waiting' || hand.mode === 'carried'
    // The shadow stays on the step, under where the thing came from, while it hangs over its place.
    if (hand.mode === 'held') this.at(p.shadow, home.x + 10, home.y + 30, 0, 0.95, 0.36)
    const up = Math.min(1, hand.since / 0.16)
    const size = 1 + (NEAR.scale - 1) * (1 - (1 - up) ** 3) + 0.12 * bump(hand.since, 0.3)
    if (resting) {
      c.globalAlpha = 0.9
      this.at(p.halo, hand.x, hand.y, 0, 1.05 * size / NEAR.scale + 0.2)
      c.globalAlpha = 1
    }
    const squash = bump(farm.pressed[hand.thing], 0.22)
    const sway = hand.mode === 'held' ? 0.05 * Math.sin(farm.time * 2.4) : 0
    c.save()
    c.translate(hand.x, hand.y + (hand.mode === 'held' ? 3 * Math.sin(farm.time * 3.1) : 0))
    c.rotate(turnOf(hand.thing, hand.tilt, hand.clock) + sway)
    c.scale(size * (1 + 0.05 * squash), size * (1 - 0.08 * squash))
    this.put(p[hand.thing][hand.loaded ? 1 : 0])
    c.restore()
  }

  // --- The loose bits ---------------------------------------------------------------------------

  private bits(bits: readonly Bit[]): void {
    if (bits.length === 0) return
    const c = this.ctx
    const fills: [Bit['kind'], string][] = [['grain', INK.grain], ['drop', INK.drop], ['mud', INK.mudWet], ['feather', '#ffffff']]
    for (const [kind, colour] of fills) {
      let any = false
      c.beginPath()
      for (const bit of bits) {
        if (bit.kind !== kind) continue
        any = true
        const r = (kind === 'grain' ? 4.2 : kind === 'drop' ? 5.5 : kind === 'mud' ? 7 : 5) * bit.size
        c.moveTo(bit.x + r, bit.y)
        if (kind === 'feather') c.ellipse(bit.x, bit.y, r * 1.9, r * 0.7, Math.sin(bit.age * 6 + bit.size) * 0.8, 0, TAU)
        else if (kind === 'drop') c.ellipse(bit.x, bit.y, r * 0.8, r * 1.25, Math.atan2(bit.vy, bit.vx) - Math.PI / 2, 0, TAU)
        else c.arc(bit.x, bit.y, r, 0, TAU)
      }
      if (any) this.ink(colour)
    }
    // Dust: soft puffs that swell and thin.
    let any = false
    c.beginPath()
    for (const bit of bits) {
      if (bit.kind !== 'dust') continue
      any = true
      const r = (9 + bit.age * 26) * bit.size * (1 - 0.5 * clamp01(bit.age / bit.life) ** 3)
      c.moveTo(bit.x + r, bit.y)
      c.arc(bit.x, bit.y, r, 0, TAU)
    }
    if (any) { c.globalAlpha = 0.72; this.ink(INK.dust); c.globalAlpha = 1 }
    const strokes: [Bit['kind'], string, number][] = [['straw', INK.hay, 4], ['spark', INK.sun, 7], ['bubble', '#ffffff', 3]]
    for (const [kind, colour, width] of strokes) {
      let some = false
      c.beginPath()
      for (const bit of bits) {
        if (bit.kind !== kind) continue
        some = true
        if (kind === 'bubble') {
          const r = (7 + bit.age * 16) * bit.size
          c.moveTo(bit.x + r, bit.y)
          c.arc(bit.x, bit.y, r, 0, TAU)
        } else {
          const a = kind === 'straw' ? bit.size * 9 + bit.age * 5 : Math.atan2(bit.vy, bit.vx)
          const l = kind === 'straw' ? 10 * bit.size : 13 * bit.size
          c.moveTo(bit.x - Math.cos(a) * l, bit.y - Math.sin(a) * l)
          c.lineTo(bit.x + Math.cos(a) * l, bit.y + Math.sin(a) * l)
        }
      }
      if (!some) continue
      this.line(colour, width)
    }
  }

  // --- Idle guidance: a glow on what can be touched, then a hand that shows one tap ------------

  private guide(farm: Farm, p: Pieces, guidance: Guidance, time: number): void {
    const c = this.ctx
    if (guidance.glow <= 0.01 && guidance.demo === null) return
    const want = farm.want(Math.max(0, guidance.demoIndex))
    const door = centreOf(doorTarget(farm.slide))
    const animalAt = (animal: (typeof ANIMALS)[number]): Point => (animal === 'hens' ? farm.flock() : centreOf(BODY[animal]))
    // The glow lies on what the next move touches: the door, the things, or the animals a lifted thing can go to.
    const spots: [Point, number][] =
      want.kind === 'door' ? [[door, 1.5]]
        : want.kind === 'animal' ? ANIMALS.map((animal): [Point, number] => [animalAt(animal), animal === 'hens' ? 1.3 : 1.7])
          : THINGS.map((thing): [Point, number] => [HOME[thing], 0.86])
    if (guidance.glow > 0.01) {
      c.globalAlpha = guidance.glow * (0.7 + 0.2 * Math.sin(time * 2.6))
      for (const [spot, size] of spots) this.at(p.ring, spot.x, spot.y, 0, size * (1 + 0.05 * Math.sin(time * 2.6)))
      c.globalAlpha = 1
    }
    if (guidance.demo === null) return
    // The hand shows one move: a tap where it stands, or a carry from a thing to an animal.
    const carry = want.kind === 'carry'
    const from: Point = want.kind === 'door' ? door : want.kind === 'animal' ? animalAt(want.animal) : HOME[want.thing]
    const to: Point = carry ? animalAt(want.animal) : from
    const pose = handPose(guidance.demo, carry, this.pose)
    const x = from.x + (to.x - from.x) * pose.travel, y = from.y + (to.y - from.y) * pose.travel
    c.globalAlpha = pose.opacity
    if (carry && pose.press > 0.5) {
      // The thing comes along under the hand, as a pale copy: the real one stays where it lies.
      c.globalAlpha = pose.opacity * 0.6
      this.at(p[want.thing][1], x, y - 24, 0, NEAR.scale)
      c.globalAlpha = pose.opacity
    }
    this.at(p.ghost, x + 10, y + 26 - 16 * pose.press, -0.3, 1 - 0.06 * pose.press)
    c.globalAlpha = 1
  }
}

const HEN_SKIN = [INK.henWhite, INK.henRusset, INK.henBlack] as const

/** A few stars, in the sky only, clear of the roof, the clouds and the sun. */
const STARS: readonly (readonly [number, number, number])[] = [[60, 60, 3], [140, 130, 2.4], [310, 34, 2.6], [520, 150, 2.4], [610, 40, 3], [700, 120, 2.6], [760, 30, 2.4], [900, 60, 3], [1040, 40, 2.6], [1090, 150, 2.4], [1150, 100, 3], [470, 80, 2.4]]

/** How each thing turns as it tips out: the scoop and the fork throw forward, the bucket pours, the brush lies flat and goes where the model strokes it. */
function turnOf(thing: ThingId, tilt: number, t: number): number {
  if (thing === 'scoop') return -tilt * 1.5
  if (thing === 'bucket') return tilt * 2
  if (thing === 'fork') return tilt * 2.3
  return tilt * 0.1 * Math.sin(t * 9)
}
