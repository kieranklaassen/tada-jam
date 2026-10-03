// The ink page: the hotel drawn in pen and ink on cream paper, with one spot
// colour for what can be touched. The building is painted once for each size
// into one layer; every figure is drawn once into its own small surface; a
// frame is that layer, the figures set on it, and a few strokes of air. Drawn
// from a guest's place, the same page goes to pencil except for that guest
// and its room, which is drawn large in full ink, in that guest's own hand.
// All motion comes from the seconds handed in, and all variation from seeds.

import { TIERS, type Tier } from './config'
import { GUEST_IDS, type GuestId, type Phase } from './guests'
import { BEAT, PENCIL, drawAirs, drips, fixed, frost, snow, steam } from './inkAirs'
import { GUEST_BOX, TOP, YETI_WRIST, drawGuest, type Pose } from './inkGuests'
import { drawBag } from './inkParts'
import { INK, PAPER, SPOT, Pen, buildHatch, seedOf, type HatchTiles, type MakeSurface, type Surface } from './inkHatch'
import { paintHouse, paintPaper } from './inkHouse'
import { HANDS, apply, inLens, lensMat, mul, pageMat, standOf, viewLens, type Mat } from './inkLens'
import { glowRing, knockMarks, shadowBlot, sweepEdge, sweepPath, sweepReach } from './inkMarks'
import { carriedThing, coach, floorUnder, placedThing, porter, swingingLamps, thingInRoom } from './inkMoving'
import { spotsOf, type Spot } from './inkPlaces'
import { drawCloud, drawHand, drawWheel } from './inkProps'
import type { InkGuest, InkScene, InkSide, InkSweep, InkThing, InkView } from './inkScene'
import type { Sprite, Stage } from './inkStage'
import { layoutPage, type PageLayout } from './layout'

/** How long each sleeper takes over a breath, in seconds: no two alike. */
const BREATH: Record<GuestId, number> = { troll: 3.1, bat: 4.6, blob: 3.3, yeti: 6.2, lizard: 4.3, cook: 5.2, fly: 2.4, singer: 2.9 }

const TAU = Math.PI * 2

/** How many layers the size of the whole surface are kept at once: the page in ink and in pencil, at both hours. */
const MAX_LAYERS = 4

/** Where the blob's other eyes see the page: two more drawings of it, this far aside, in the drawing's units. */
const GHOSTS: readonly (readonly [number, number])[] = [[-3.4, -1.6], [3, 2.2]]

/** Where the fly's facets sit in its large room, as shares of the room's width and height: the corners and three sides, clear of the floor where the guests stand. */
const FACETS: readonly (readonly [number, number])[] = [[0.12, 0.13], [0.5, 0.11], [0.88, 0.13], [0.1, 0.5], [0.9, 0.5], [0.12, 0.86], [0.88, 0.86]]

const OPPOSITE: Record<InkSide, InkSide> = { left: 'right', right: 'left', up: 'down', down: 'up' }

const browserSurface: MakeSurface = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export class InkPage implements Stage {
  /** How many surfaces have been built so far: the hatch tiles, the layers and every figure. */
  built = 0
  private readonly make: MakeSurface
  private width = 0
  private height = 0
  private dpr = 1
  private tier = 0
  private hatch: HatchTiles | null = null
  private page: PageLayout | null = null
  private readonly sprites = new Map<string, Sprite>()
  /** The layers the size of the whole surface, each with the frame it was last stamped in. Only a few are kept. */
  private readonly layers = new Map<string, { surface: Surface; used: number }>()
  private frames = 0

  constructor(make: MakeSurface = browserSurface) {
    this.make = (width, height) => { this.built++; return make(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height))) }
  }

  /** The size of the surface in logical pixels, its pixel ratio and the quality tier. Nothing is rebuilt unless one of them changed. */
  resize(width: number, height: number, dpr: number, tier: number): void {
    if (width === this.width && height === this.height && dpr === this.dpr && tier === this.tier) return
    this.width = width; this.height = height; this.dpr = dpr; this.tier = tier
    this.hatch = null
    this.page = null
    this.layers.clear()
    this.sprites.clear()
  }

  /** The layout the page is drawn to, for whoever needs to know where a finger landed. */
  layout(scene: InkScene): PageLayout {
    if (!this.page || this.page.shape !== scene.house.shape) this.page = layoutPage(this.width, this.height, scene.house.shape)
    return this.page
  }

  get settings(): Tier {
    return TIERS[Math.max(0, Math.min(TIERS.length - 1, this.tier))]!
  }

  /** Draws one frame and returns how many sprites and figures it drew. */
  draw(ctx: CanvasRenderingContext2D, scene: InkScene, seconds: number): number {
    if (this.width <= 0 || this.height <= 0) return 0
    const page = this.layout(scene), dpr = this.dpr, u = page.scale
    const screen: Mat = [dpr, 0, 0, dpr, 0, 0]
    this.frames++
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    const view = scene.view ?? null
    const live = (sweep: InkSweep | null | undefined) => (sweep && sweep.progress < 1 ? sweep : null)
    const sweep = live(scene.sweep), hour = sweep ? null : live(scene.hourSweep)
    const circle = sweep ?? hour
    let count = 0
    if (!circle) count += this.pass(ctx, scene, page, view, scene.phase, seconds)
    else {
      // Outside the circle, the page as it was; inside it, the page as it is becoming; between them, a rough ink edge.
      count += sweep ? this.pass(ctx, scene, page, scene.under ?? null, scene.phase, seconds) : this.pass(ctx, scene, page, view, scene.hourUnder ?? scene.phase, seconds)
      const radius = Math.max(0, circle.progress) * sweepReach(circle.x, circle.y, this.width, this.height)
      ctx.save()
      ctx.setTransform(...screen)
      sweepPath(ctx, circle.x, circle.y, radius)
      ctx.clip()
      count += this.pass(ctx, scene, page, view, scene.phase, seconds)
      ctx.restore()
      ctx.setTransform(...screen)
      ctx.globalAlpha = 1
      sweepEdge(ctx, circle.x, circle.y, radius, seconds, u)
      count++
    }

    // Over everything, where the finger is and never turned or enlarged: knocks, a guest in the hand, the ghost hand.
    ctx.setTransform(...screen)
    ctx.globalAlpha = 1
    for (const knock of scene.knocks ?? []) if (knockMarks(ctx, knock.x, knock.y, knock.age, u)) count++
    for (const thing of scene.things) count += carriedThing(this, ctx, scene, page, thing, view, screen)
    scene.guests.forEach((guest, index) => { if (guest.carried) count += this.carried(ctx, page, guest, index, view, screen, seconds) })
    const hand = scene.hand
    if (hand && hand.alpha > 0.01) {
      ctx.globalAlpha = Math.min(1, hand.alpha)
      const press = hand.down ? 0.93 : 1
      // Half as large again as a guest's own hand would be, so it reads as a hand from across a room.
      this.blit(ctx, this.sprite(`hand ${Number(hand.down)}`, 112, 132, 22, 22, u * 1.5, (pen) => drawHand(pen, hand.down)), screen, hand.x, hand.y, press, press, 0)
      ctx.globalAlpha = 1
      count++
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return count
  }

  /** The whole page once, plain or from a guest's place, at one hour. */
  private pass(ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, view: InkView | null, phase: Phase, seconds: number): number {
    const u = page.scale, dpr = this.dpr, settings = this.settings
    const hand = view ? HANDS[view.from] : null
    const doubled = !!hand?.doubled && settings.doubled
    const base = mul([dpr, 0, 0, dpr, 0, 0], pageMat(page, view))
    const lens = viewLens(page, view)
    const large = lens ? mul(base, lensMat(lens)) : null
    // Everything that is not the viewer or in its large room goes to pencil.
    const far = view ? PENCIL : 1
    const spots = spotsOf(scene.guests, page)
    let count = 0

    ctx.globalAlpha = 1
    ctx.setTransform(...base)
    ctx.drawImage(this.layer(view ? (doubled ? 'doubled' : 'pencil') : 'ink', scene, page, phase) as unknown as CanvasImageSource, 0, 0, this.width, this.height)
    count++

    // The wheel, swaying a little on its spindle: moon up for the night, sun up for the day.
    ctx.globalAlpha = far
    const wheel = page.wheel
    const turn = (scene.phase === 'night' ? 0 : Math.PI) + Math.sin(seconds * 0.7) * 0.045 + (scene.wheelTurn ?? 0)
    this.blit(ctx, this.sprite('wheel', 92, 92, 46, 46, wheel.w / 84, (pen) => drawWheel(pen)), base, wheel.x + wheel.w / 2, wheel.y + wheel.h / 2, 1, 1, turn)
    count++
    // The things in the cupboard, the porter by his ladder, the coach in the street.
    for (const thing of scene.things) if (thing.at === 'cupboard') count += placedThing(this, ctx, scene, page, thing, spots, base)
    count += porter(this, ctx, scene, page, base, seconds)
    count += coach(this, ctx, scene, page, base, seconds)

    // The rooms and everyone in them, outside the large room.
    count += this.contents(ctx, scene, page, view, spots, base, null, lens ? view!.room : null, false, seconds)

    // The large room: the same room from the full ink layer, enlarged, in the viewer's own hand, with whoever is in it.
    if (lens && large && view && view.room !== null) {
      const ink = this.layer('ink', scene, page, phase) as unknown as CanvasImageSource
      const from = lens.from, to = lens.to
      const whole = () => ctx.drawImage(ink, from.x * dpr, from.y * dpr, from.w * dpr, from.h * dpr, to.x, to.y, to.w, to.h)
      /** The room laid down in strips, each pushed a little to one side: a line that will not keep still. */
      const strips = (n: number, shift: (i: number) => number) => {
        for (let i = 0; i < n; i++) ctx.drawImage(ink, from.x * dpr, (from.y + (from.h * i) / n) * dpr, from.w * dpr, (from.h / n) * dpr, to.x + shift(i), to.y + (to.h * i) / n, to.w, to.h / n + 0.5)
      }
      ctx.save()
      ctx.globalAlpha = 1
      ctx.setTransform(...base)
      ctx.beginPath()
      ctx.rect(to.x, to.y, to.w, to.h)
      ctx.clip()
      if (hand?.heavy) {
        // The troll's hand: unsteady, and laid once more a hair aside, so every line is heavier.
        const flick = Math.floor(seconds * 6)
        strips(14, (i) => (fixed(flick % 3, i) - 0.5) * 2.6 * u + Math.sin(i * 0.9 + flick) * 0.8 * u)
        ctx.globalCompositeOperation = 'darken'
        ctx.drawImage(ink, from.x * dpr, from.y * dpr, from.w * dpr, from.h * dpr, to.x + 1.1 * u, to.y + 0.8 * u, to.w, to.h)
        ctx.globalCompositeOperation = 'source-over'
        count += 2
      } else if (hand?.thin) {
        // The lizard's hand: a thin line on bare paper, shivering, with frost creeping in from the corners.
        const flick = Math.floor(seconds * 12)
        ctx.fillStyle = PAPER
        ctx.fillRect(to.x, to.y, to.w, to.h)
        ctx.globalAlpha = 0.7
        strips(10, (i) => (fixed(flick % 4, i + 20) - 0.5) * 2 * u)
        ctx.globalAlpha = 1
        count += 2 + frost(ctx, to.x, to.y, to.w, to.h, seconds, u)
      } else if (hand?.wavers) {
        // The singer's hand: the room wavers like a held note, and the page behind shows through it.
        ctx.globalAlpha = 0.74
        strips(16, (i) => Math.sin(i * 0.8 - seconds * 2.4) * 2.4 * u)
        ctx.globalAlpha = 1
        count++
      } else {
        whole()
        count++
      }
      if (doubled) {
        // The blob's hand: the room seen again by two more of its eyes, each a little to one side.
        ctx.globalCompositeOperation = 'darken'
        ctx.globalAlpha = 0.34
        for (const [dx, dy] of GHOSTS) ctx.drawImage(ink, from.x * dpr, from.y * dpr, from.w * dpr, from.h * dpr, to.x + dx * u * 1.6, to.y + dy * u * 1.6, to.w, to.h)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
        count += 2
      }
      count += this.contents(ctx, scene, page, view, spots, large, view.room, null, doubled, seconds)
      // The fly's hand: its room again in facets, small, round the edge of the large one, each a copy of what is already drawn there.
      const drawn = (ctx as { canvas?: unknown }).canvas
      if (hand?.facets && settings.doubled && typeof drawn === 'object' && drawn !== null) {
        ctx.globalAlpha = 1
        ctx.setTransform(...base)
        const corner = apply(base, to.x + to.w * 0.2, to.y + to.h * 0.16), size = { w: to.w * 0.6 * dpr, h: to.h * 0.66 * dpr }
        const r = to.w * 0.105
        for (const [fx, fy] of FACETS) {
          const cx = to.x + to.w * fx, cy = to.y + to.h * fy
          ctx.save()
          ctx.beginPath()
          for (let k = 0; k < 6; k++) ctx.lineTo(cx + Math.cos(k * 1.0472 + 0.5236) * r, cy + Math.sin(k * 1.0472 + 0.5236) * r)
          ctx.closePath()
          ctx.clip()
          ctx.drawImage(drawn as CanvasImageSource, corner.x, corner.y, size.w, size.h, cx - r, cy - r, 2 * r, 2 * r)
          ctx.restore()
          ctx.beginPath()
          for (let k = 0; k < 6; k++) ctx.lineTo(cx + Math.cos(k * 1.0472 + 0.5236) * r, cy + Math.sin(k * 1.0472 + 0.5236) * r)
          ctx.closePath()
          ctx.strokeStyle = INK
          ctx.lineWidth = 1.8 * u
          ctx.stroke()
        }
        count += FACETS.length
      }
      ctx.restore()
      // Its frame: a trembling rule, heavier in a heavy hand and finer in a thin one, with a hatched edge that lifts it off the page.
      const weight = hand?.heavy ? 'heavy' : hand?.thin ? 'thin' : 'plain', boil = settings.boil ? Math.floor(seconds * 6) % 2 : 0
      const frame = this.sprite(`frame ${Math.round(to.w)} ${Math.round(to.h)} ${weight} ${boil}`, to.w + 28 * u, to.h + 28 * u, 14 * u, 14 * u, 1, (pen) => drawFrame(pen, to.w, to.h, u, weight))
      ctx.globalAlpha = 1
      this.blit(ctx, frame, base, to.x, to.y, 1, 1, 0)
      count++
    }

    // The glow on what can be touched, where each is drawn.
    const glow = scene.glow
    if (glow && glow.strength > 0.02) {
      ctx.globalAlpha = 1
      for (const { guest, spot } of spots) {
        if (guest.carried || !glow.guests.includes(guest.id)) continue
        ctx.setTransform(...(large && inLens(view, guest) ? large : base))
        glowRing(ctx, spot.x, spot.y - 72 * u, 56 * u, 82 * u, glow.strength, seconds, GUEST_IDS.indexOf(guest.id) + 1, u)
        count++
      }
      if (glow.wheel) {
        ctx.setTransform(...base)
        glowRing(ctx, wheel.x + wheel.w / 2, wheel.y + wheel.h / 2, wheel.w / 2 + 5 * u, wheel.h / 2 + 5 * u, glow.strength, seconds, 11, u)
        count++
      }
    }
    ctx.globalAlpha = 1
    return count
  }

  /**
   * What is in the rooms, the lobby and the street, under one transform: a
   * swinging lamp, the things that have been put somewhere, the airs, the
   * guests, the snow. With `only`, just what belongs to that room, in full
   * ink: the large room. Otherwise everything but what belongs to `skip`,
   * in pencil when the page is a guest's, the viewer and what it holds apart.
   */
  private contents(ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, view: InkView | null, spots: readonly { guest: InkGuest; spot: Spot }[], m: Mat, only: number | null, skip: number | null, doubled: boolean, seconds: number): number {
    const far = view && only === null ? PENCIL : 1, hand = view ? HANDS[view.from] : null
    const mine = (thing: InkThing) => !!view && typeof thing.at === 'object' && 'guest' in thing.at && thing.at.guest === view.from
    let count = 0
    ctx.globalAlpha = far
    count += swingingLamps(this, ctx, scene, page, m, only, skip)
    /** The things that have been put somewhere: first those that stand or hang, and, once the guests are drawn, those a guest holds. */
    const things = (held: boolean) => {
      for (const thing of scene.things) {
        const at = thing.at
        if (at === 'cupboard' || 'guest' in at !== held) continue
        // A thing fixed to a wall of the large room is drawn on both sides of the lens; anything else, on one.
        if (only !== null ? !thingInRoom(thing, page, scene, only) : skip !== null && !('edge' in at) && thingInRoom(thing, page, scene, skip)) continue
        ctx.globalAlpha = mine(thing) ? 1 : far
        count += placedThing(this, ctx, scene, page, thing, spots, m)
      }
    }
    things(false)
    // What travels through the house, by how the viewer takes it.
    ctx.globalAlpha = 1
    ctx.setTransform(...m)
    count += drawAirs(ctx, scene, page, seconds, !view, only)
    if (hand?.drips) { ctx.setTransform(...m); count += drips(ctx, scene, page, seconds) }
    if (hand?.steams) { ctx.setTransform(...m); count += steam(ctx, scene, page, seconds) }
    for (const { guest, spot } of spots) {
      const inRoom = typeof guest.place === 'object' && guest.place.room === (only ?? skip)
      if (guest.carried || (only !== null ? !inRoom : skip !== null && inRoom)) continue
      // The viewer is in full ink wherever it stands; on the singer's page even she is a little see-through.
      ctx.globalAlpha = (view && only === null && guest.id !== view.from ? far : 1) * (hand?.wavers ? 0.84 : 1)
      count += this.figure(ctx, scene, page, guest, spot, view, m, doubled, seconds)
    }
    // What a guest holds is drawn over it: the clock in its hand, the pipe at its mouth, the tassel of the quilt it is rolled in.
    things(true)
    ctx.globalAlpha = far
    ctx.setTransform(...m)
    count += snow(ctx, scene, page, seconds, this.settings.snow, null)
    ctx.globalAlpha = 1
    return count
  }

  /** One guest where it stands, under a transform: its figure in the pose the scene gives, moved by its own motion or by its breathing. */
  private figure(ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, guest: InkGuest, spot: Spot, view: InkView | null, m: Mat, doubled: boolean, seconds: number): number {
    const u = page.scale, index = scene.guests.indexOf(guest)
    const stand = standOf(page, view, guest, spot)
    const sprite = this.guestSprite(guest, index, seconds, false, stand.turn !== 0, spot.flip, u)
    let count = 0
    // The bat on its own page hangs by a cord from its ceiling, which the turned page puts under its feet.
    if (stand.cord) {
      ctx.setTransform(...m)
      ctx.beginPath()
      ctx.moveTo(stand.cord.x, stand.cord.y)
      ctx.lineTo(stand.x, stand.y - 2 * u)
      ctx.moveTo(stand.x - 9 * u, stand.y)
      ctx.lineTo(stand.x + 9 * u, stand.y)
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.6 * u
      ctx.stroke()
      count++
    }
    let sx = 1, sy = 1, rot = 0, dx = 0, dy = 0
    if (guest.body) ({ sx, sy, rot, dx, dy } = guest.body)
    else {
      // Everyone breathes at a tempo of its own; the troll pumps on its beat; the cold fly shivers.
      let squash = Math.sin((seconds / BREATH[guest.id]) * TAU + index) * (guest.awake ? 0.008 : 0.02)
      if (guest.id === 'troll' && guest.awake) squash = 0.03 * Math.exp(-((seconds * BEAT) % 1) * 4) - 0.012
      if (guest.id === 'fly' && guest.mood === 'cross') dx = Math.floor(seconds * 15) % 2 ? 0.7 : -0.7
      if (guest.id === 'singer' && guest.awake) dx = Math.sin(seconds * 1.3) * 1.2
      sx = 1 - squash * 0.6; sy = 1 + squash
    }
    const x = stand.x + dx * u, y = stand.y + dy * u, flip = spot.flip ? -1 : 1
    if (doubled) {
      const alpha = ctx.globalAlpha
      ctx.globalAlpha = alpha * 0.3
      for (const [gx, gy] of GHOSTS) this.blit(ctx, sprite, m, x + gx * u, y + gy * u, flip * sx, sy, rot + stand.turn)
      ctx.globalAlpha = alpha
    }
    this.blit(ctx, sprite, m, x, y, flip * sx, sy, rot + stand.turn)
    count++
    if (guest.id === 'yeti') {
      // The yeti's cloud on its string, snowing on it.
      // On the bench the yeti sits lower, and so does its cloud.
      const low = guest.place === 'bench' && !guest.carried ? 28 * u : 0
      const cloudX = x + (2 + Math.sin(seconds * 0.5) * 4) * u, cloudY = y - 158 * u + low + Math.sin(seconds * 0.9) * 3 * u
      ctx.setTransform(...m)
      ctx.beginPath()
      ctx.moveTo(x + YETI_WRIST.x * u, y + YETI_WRIST.y * u * sy + low)
      ctx.quadraticCurveTo(x + (YETI_WRIST.x + 10) * u, (y + YETI_WRIST.y * u + cloudY) / 2, cloudX, cloudY)
      ctx.strokeStyle = SPOT
      ctx.lineWidth = 1.6 * u
      ctx.stroke()
      this.blit(ctx, this.sprite('cloud', 70, 40, 35, 36, u, (pen) => drawCloud(pen)), m, cloudX, cloudY, 1, 1, 0)
      ctx.setTransform(...m)
      count += 2 + snow(ctx, { ...scene, house: { ...scene.house, fixtures: [] } }, page, seconds, 0, { x: cloudX, y: cloudY })
    }
    return count
  }

  /** The drawing of a guest for this moment: its pose from the scene, and which of its two drawings the boil has reached. */
  private guestSprite(guest: InkGuest, index: number, seconds: number, inHand: boolean, turned: boolean, flip: boolean, u: number): Sprite {
    const frames = guest.id === 'troll' || this.settings.boil ? 2 : 1
    // The troll's two drawings are its cheeks empty and full, on its beat; everyone else's are the line boiling.
    const frame = guest.id === 'troll' ? (guest.awake && (seconds * BEAT) % 1 < 0.45 ? 1 : 0) : Math.floor(seconds * 6 + index * 0.37) % frames
    // A side of the page becomes a side of the figure: mirrored for a figure that is mirrored, and the other way about for one turned half round.
    let looks = inHand ? null : guest.looks ?? null
    if (looks && turned) looks = OPPOSITE[looks]
    if (looks && flip && (looks === 'left' || looks === 'right')) looks = OPPOSITE[looks]
    const out = inHand || guest.place === 'lobby' || guest.place === 'bench'
    const pose: Pose = {
      awake: guest.awake, mood: guest.mood, turnedTo: guest.turnedTo, wrapped: guest.wrapped,
      bag: !inHand && guest.place === 'lobby', out, seated: !inHand && guest.place === 'bench',
      stares: !inHand && guest.place === 'lobby' && guest.staresAt !== null, looks, frame,
    }
    const key = `guest ${guest.id} ${Number(pose.awake)} ${pose.mood} ${pose.turnedTo} ${Number(pose.wrapped)} ${Number(pose.bag)} ${Number(out)} ${Number(pose.seated)} ${Number(pose.stares)} ${looks} ${frame}`
    return this.sprite(key, GUEST_BOX.w, GUEST_BOX.h, GUEST_BOX.ox, GUEST_BOX.oy, u, (pen) => drawGuest(pen, guest.id, pose))
  }

  /** A guest in the child's hand: hung by the top of its head from just under the finger, stiff, its bag swinging under it, its shadow on the floor below. */
  private carried(ctx: CanvasRenderingContext2D, page: PageLayout, guest: InkGuest, index: number, view: InkView | null, screen: Mat, seconds: number): number {
    const held = guest.carried
    if (!held) return 0
    const u = page.scale
    let count = 0
    // Its shadow, on the floor of whatever lies under the finger.
    const floor = floorUnder(page, view, held.x, held.y)
    ctx.setTransform(...screen)
    ctx.globalAlpha = 1
    if (floor) { shadowBlot(ctx, floor.x, floor.y, 26 * u, u); count++ }
    const gx = held.x, gy = held.y + 8 * u, c = Math.cos(held.swing), s = Math.sin(held.swing)
    const tall = TOP[guest.id] * u
    const fx = gx - s * tall, fy = gy + c * tall
    // The bag on its short line, swinging twice as far the other way.
    const back = -2 * held.swing, line = 13 * u
    const bx = fx + Math.sin(-back) * line, by = fy + Math.cos(back) * line
    ctx.beginPath()
    ctx.moveTo(fx, fy - 4 * u)
    ctx.lineTo(bx, by)
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.4 * u
    ctx.stroke()
    this.blit(ctx, this.sprite('bag', 44, 40, 22, 4, u, (pen) => drawBag(pen)), screen, bx, by, 1, 1, back)
    this.blit(ctx, this.guestSprite(guest, index, seconds, true, false, false, u), screen, fx, fy, 1, 1, held.swing)
    return count + 3
  }

  /** A layer the size of the whole surface: the page in full ink, or the same in pencil, or in pencil several times over. Painted when first needed. */
  private layer(kind: 'ink' | 'pencil' | 'doubled', scene: InkScene, page: PageLayout, phase: Phase): Surface {
    const coach = scene.coach !== false
    const house = `${scene.house.shape} ${phase} ${Number(coach)} ${scene.house.fixtures.map((f) => f.kind + f.col).join(' ')} twins ${scene.house.twins.join(' ')}`
    const key = `${kind} ${house}`
    const known = this.layers.get(key)
    if (known) { known.used = this.frames; return known.surface }
    const dpr = this.dpr, settings = this.settings
    const ink = kind === 'ink' ? null : this.layer('ink', scene, page, phase)
    // Only a few layers this size are kept: the one longest unused goes first.
    while (this.layers.size >= MAX_LAYERS) {
      let oldest: string | null = null, used = this.frames
      for (const [name, held] of this.layers) if (held.used < used) { oldest = name; used = held.used }
      if (oldest === null) break
      this.layers.delete(oldest)
    }
    const surface = this.make(this.width * dpr, this.height * dpr)
    const g = surface.getContext('2d')
    if (g) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintPaper(g, this.width, this.height, settings.speckle && kind === 'ink')
      if (!ink) paintHouse(new Pen(g, surface, this.tiles(), seedOf(house)), page, scene.house, phase, coach)
      else if (kind === 'pencil') {
        // Pencil: the ink page under a veil of paper.
        g.globalAlpha = PENCIL
        g.drawImage(ink as unknown as CanvasImageSource, 0, 0, this.width, this.height)
      } else {
        const u = page.scale
        g.globalAlpha = PENCIL * 0.55
        for (const [dx, dy] of GHOSTS) g.drawImage(ink as unknown as CanvasImageSource, dx * u * 1.6, dy * u * 1.6, this.width, this.height)
        g.globalAlpha = PENCIL * 0.8
        g.drawImage(ink as unknown as CanvasImageSource, 0, 0, this.width, this.height)
      }
      g.globalAlpha = 1
    }
    this.layers.set(key, { surface, used: this.frames })
    return surface
  }

  /** The hatch tiles, ruled for this page: a little finer where the drawing is small, so tone stays tone. */
  private tiles(): HatchTiles {
    const scale = this.page ? Math.max(0.62, Math.min(1.25, this.page.scale)) : 1
    if (!this.hatch) this.hatch = buildHatch(this.make, this.dpr * scale, 9001)
    return this.hatch
  }

  /** A figure by name, drawn the first time it is asked for. `w`, `h`, `ox` and `oy` are in the figure's own units. */
  sprite(key: string, w: number, h: number, ox: number, oy: number, scale: number, draw: (pen: Pen) => void): Sprite {
    const known = this.sprites.get(key)
    if (known) return known
    const k = scale * this.dpr
    const surface = this.make(w * k, h * k)
    const g = surface.getContext('2d')
    if (g) {
      g.setTransform(k, 0, 0, k, ox * k, oy * k)
      draw(new Pen(g, surface, this.tiles(), seedOf(key)))
    }
    const sprite = { surface, w: w * scale, h: h * scale, ox: ox * scale, oy: oy * scale }
    this.sprites.set(key, sprite)
    return sprite
  }

  /** Sets a figure down under a transform, with its origin at a point, squashed and turned about that point. */
  blit(ctx: CanvasRenderingContext2D, sprite: Sprite, m: Mat, x: number, y: number, sx: number, sy: number, turn: number): void {
    const c = Math.cos(turn), s = Math.sin(turn)
    ctx.setTransform(...mul(m, [c * sx, s * sx, -s * sy, c * sy, x, y]))
    ctx.drawImage(sprite.surface as unknown as CanvasImageSource, -sprite.ox, -sprite.oy, sprite.w, sprite.h)
  }
}

/** The frame round the large room: a rule drawn twice, and a hatched edge under and beside it. Origin at the room's top left corner. */
function drawFrame(pen: Pen, w: number, h: number, u: number, weight: 'plain' | 'heavy' | 'thin'): void {
  const heavy = weight === 'heavy', thin = weight === 'thin'
  pen.tremble = (heavy ? 2.4 : thin ? 1.8 : 1) * u
  if (!thin) pen.tone([w + 2 * u, 6 * u, w + 8 * u, 10 * u, w + 8 * u, h + 8 * u, 8 * u, h + 8 * u, 5 * u, h + 2 * u, w + 2 * u, h + 2 * u], 4, -0.8)
  pen.box(0, 0, w, h, (heavy ? 3.6 : thin ? 1.1 : 2.6) * u, (heavy ? 7 : 4) * u)
  pen.box(-4 * u, -4 * u, w + 8 * u, h + 8 * u, (heavy ? 1.8 : thin ? 0.6 : 0.9) * u, (heavy ? 6 : thin ? 7 : 3) * u)
}
