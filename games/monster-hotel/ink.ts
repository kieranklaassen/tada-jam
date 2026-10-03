// The ink page: the hotel drawn in pen and ink on cream paper, with one spot
// colour for what can be touched. The building is painted once for each size
// into one layer; every figure is drawn once into its own small surface; a
// frame is that layer, the figures set on it, and a few strokes of air. All
// motion comes from the seconds handed in, and all variation from seeds.

import type { GuestId } from './guests'
import { SHAPES } from './hotel'
import { GUEST_BOX, STANCE, TUBA_BELL, YETI_WRIST, drawGuest, restsInBed, type Pose } from './inkGuests'
import { INK, PAPER, SPOT, Pen, buildHatch, seedOf, type HatchTiles, type MakeSurface, type Surface } from './inkHatch'
import { paintHouse, paintPaper } from './inkHouse'
import { drawCloud, drawCoachDoor, drawPorter, drawThing, drawWheel } from './inkProps'
import { INK_THING_KINDS, type InkAir, type InkGuest, type InkScene } from './inkScene'
import { layoutPage, type PageLayout } from './layout'

/** A figure drawn once and kept: its surface, and its size and origin in logical pixels. */
type Sprite = { surface: Surface; w: number; h: number; ox: number; oy: number }

/** How long each sleeper takes over a breath, in seconds: no two alike. */
const BREATH: Record<GuestId, number> = { troll: 3.1, bat: 4.6, blob: 3.3, yeti: 6.2, lizard: 4.3, cook: 5.2, fly: 2.4, singer: 2.9 }

/** The troll's beat: how many times a second its cheeks fill. */
const BEAT = 1.5

const TAU = Math.PI * 2

/** A number from 0 to 1 that is always the same for the same two whole numbers. */
function fixed(a: number, b: number): number {
  let t = (Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca6b)) >>> 0
  t = Math.imul(t ^ (t >>> 15), 0x2c1b3c6d) >>> 0
  return ((t ^ (t >>> 13)) >>> 0) / 4294967296
}

const browserSurface: MakeSurface = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export class InkPage {
  /** How many surfaces have been built so far: the hatch tiles, the ground and every figure. */
  built = 0
  private readonly make: MakeSurface
  private width = 0
  private height = 0
  private dpr = 1
  private tier = 0
  private hatch: HatchTiles | null = null
  private ground: Surface | null = null
  private groundKey = ''
  private page: PageLayout | null = null
  private readonly sprites = new Map<string, Sprite>()

  constructor(make: MakeSurface = browserSurface) {
    this.make = (width, height) => { this.built++; return make(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height))) }
  }

  /** The size of the surface in logical pixels, its pixel ratio and the quality tier. Nothing is rebuilt unless one of them changed. */
  resize(width: number, height: number, dpr: number, tier: number): void {
    if (width === this.width && height === this.height && dpr === this.dpr && tier === this.tier) return
    this.width = width; this.height = height; this.dpr = dpr; this.tier = tier
    this.hatch = null
    this.ground = null
    this.page = null
    this.sprites.clear()
  }

  /** The layout the page is drawn to, for whoever needs to know where a finger landed. */
  layout(scene: InkScene): PageLayout {
    if (!this.page || this.page.shape !== scene.house.shape) this.page = layoutPage(this.width, this.height, scene.house.shape)
    return this.page
  }

  /** Draws one frame and returns how many sprites and figures it drew. */
  draw(ctx: CanvasRenderingContext2D, scene: InkScene, seconds: number): number {
    if (this.width <= 0 || this.height <= 0) return 0
    const page = this.layout(scene), dpr = this.dpr, u = page.scale
    let count = 0
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.drawImage(this.groundFor(scene, page) as unknown as CanvasImageSource, 0, 0)
    count++
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    count += this.airs(ctx, scene, page, seconds)

    // The wheel, swaying a little on its spindle: moon up for the night, sun up for the day.
    const wheel = page.wheel
    const turn = (scene.phase === 'night' ? 0 : Math.PI) + Math.sin(seconds * 0.7) * 0.045
    this.blit(ctx, this.sprite('wheel', 92, 92, 46, 46, wheel.w / 84, (pen) => drawWheel(pen)), wheel.x + wheel.w / 2, wheel.y + wheel.h / 2, 1, 1, turn)
    count++

    // The things that are in the cupboard, each in its slot.
    for (const thing of scene.things) {
      if (thing.at !== 'cupboard') continue
      const slot = page.slots[INK_THING_KINDS.indexOf(thing.kind)]
      if (!slot) continue
      const sprite = this.sprite(`thing ${thing.kind} ${thing.dial}`, 78, 78, 39, 39, slot.w / 78, (pen) => drawThing(pen, thing.kind, thing.dial))
      this.blit(ctx, sprite, slot.x + slot.w / 2, slot.y + slot.h / 2 + 2 * u, 1, 1, 0)
      count++
    }

    // The porter by the cupboard, breathing as slowly as a tortoise does.
    const porter = page.porter, slow = Math.sin(seconds * 0.8) * 0.012
    this.blit(ctx, this.sprite('porter', 160, 126, 62, 120, u, (pen) => drawPorter(pen)), porter.x + 52 * u, porter.y + porter.h - 3 * u, 1 - slow * 0.5, 1 + slow, 0)
    count++

    // The coach door, and whatever is pressing on the blind beside it.
    const door = page.coachDoor
    const doorW = door.w / u, doorH = door.h / u
    this.blit(ctx, this.sprite('coach door', doorW + 8, doorH + 8, 4, 4, u, (pen) => drawCoachDoor(pen, doorW, doorH)), door.x, door.y, 1, 1, 0)
    count += 1 + this.lump(ctx, page, seconds)

    let cloudAt: { x: number; y: number; wristX: number; wristY: number } | null = null
    let lobbyPlace = 0
    for (const guest of scene.guests) {
      const where = this.place(guest, page, lobbyPlace)
      if (!where) continue
      if (guest.place === 'lobby') lobbyPlace++
      const frames = guest.id === 'troll' ? 2 : this.tier >= 2 ? 1 : 2
      const index = scene.guests.indexOf(guest)
      // The troll's two drawings are its cheeks empty and full, on its beat; everyone else's are the line boiling.
      const frame = guest.id === 'troll' ? (guest.awake && (seconds * BEAT) % 1 < 0.45 ? 1 : 0) : Math.floor(seconds * 6 + index * 0.37) % frames
      const pose: Pose = { awake: guest.awake, mood: guest.mood, turnedTo: guest.turnedTo, wrapped: guest.wrapped, bag: guest.place === 'lobby', frame }
      const key = `guest ${guest.id} ${Number(pose.awake)} ${pose.mood} ${pose.turnedTo} ${Number(pose.wrapped)} ${Number(pose.bag)} ${frame}`
      const sprite = this.sprite(key, GUEST_BOX.w, GUEST_BOX.h, GUEST_BOX.ox, GUEST_BOX.oy, u, (pen) => drawGuest(pen, guest.id, pose))
      // Everyone breathes at a tempo of its own; the troll pumps on its beat; the cold fly shivers.
      let squash = Math.sin((seconds / BREATH[guest.id]) * TAU + index) * (guest.awake ? 0.008 : 0.02)
      let dx = 0
      if (guest.id === 'troll' && guest.awake) squash = 0.03 * Math.exp(-((seconds * BEAT) % 1) * 4) - 0.012
      if (guest.id === 'fly' && guest.mood === 'cross') dx = (Math.floor(seconds * 15) % 2 ? 0.7 : -0.7) * u
      if (guest.id === 'singer' && guest.awake) dx = Math.sin(seconds * 1.3) * 1.2 * u
      this.blit(ctx, sprite, where.x + dx, where.y, (where.flip ? -1 : 1) * (1 - squash * 0.6), 1 + squash, 0)
      count++
      if (guest.id === 'yeti') {
        const bob = Math.sin(seconds * 0.9) * 3 * u
        cloudAt = { x: where.x + (2 + Math.sin(seconds * 0.5) * 4) * u, y: where.y - 158 * u + bob, wristX: where.x + YETI_WRIST.x * u, wristY: where.y + YETI_WRIST.y * u * (1 + squash) }
      }
    }

    // The yeti's cloud on its string.
    if (cloudAt) {
      ctx.beginPath()
      ctx.moveTo(cloudAt.wristX, cloudAt.wristY)
      ctx.quadraticCurveTo(cloudAt.wristX + 10 * u, (cloudAt.wristY + cloudAt.y) / 2, cloudAt.x, cloudAt.y)
      ctx.strokeStyle = SPOT
      ctx.lineWidth = 1.6 * u
      ctx.stroke()
      this.blit(ctx, this.sprite('cloud', 70, 40, 35, 36, u, (pen) => drawCloud(pen)), cloudAt.x, cloudAt.y, 1, 1, 0)
      count += 2
    }
    count += this.snow(ctx, scene, page, seconds, cloudAt)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return count
  }

  /** Where a guest is drawn: its origin on the page and whether it is mirrored. */
  private place(guest: InkGuest, page: PageLayout, lobbyPlace: number): { x: number; y: number; flip: boolean } | null {
    const u = page.scale, stance = STANCE[guest.id]
    /** Mirrors a figure so that it faces the way asked. */
    const flipTo = (way: 'left' | 'right') => stance.faces !== 'front' && stance.faces !== way
    if (guest.place === 'bench') {
      const box = page.benchGuest
      return { x: box.x + 36 * u, y: box.y + box.h, flip: false }
    }
    if (guest.place === 'lobby') {
      const spot = page.lobbySpots[Math.min(lobbyPlace, page.lobbySpots.length - 1)]
      // It faces the house, whose doors it stares at.
      return spot ? { x: spot.x, y: spot.y, flip: flipTo('left') } : null
    }
    const room = page.rooms[guest.place.room]
    if (!room) return null
    const inward = room.bedSide === 'right' ? 'right' : 'left'
    const turned = guest.turnedTo === 'left' || guest.turnedTo === 'right' ? guest.turnedTo : null
    const pose = { awake: guest.awake, mood: guest.mood, turnedTo: guest.turnedTo, wrapped: guest.wrapped, bag: false, frame: 0 }
    if (restsInBed(guest.id, pose)) {
      // Sitting up against the head of the bed it looks down the bed; turned to the wall behind it, it sits at the foot.
      const away = room.bedSide === 'right' ? 'left' : 'right'
      const way = turned ?? away
      const fromHead = way === away ? 22 : 70
      const x = room.bedSide === 'right' ? room.bed.x + room.bed.w - fromHead * u : room.bed.x + fromHead * u
      return { x, y: room.stand.y, flip: flipTo(way) }
    }
    const flip = flipTo(turned ?? inward)
    return { x: room.stand.x + stance.shift * u * (flip ? -1 : 1), y: room.stand.y, flip }
  }

  /** The still layer for this house at this hour, painted when it is first needed. */
  private groundFor(scene: InkScene, page: PageLayout): Surface {
    const key = `${scene.house.shape} ${scene.phase} ${scene.house.fixtures.map((f) => f.kind + f.col).join(' ')}`
    if (this.ground && this.groundKey === key) return this.ground
    const surface = this.make(this.width * this.dpr, this.height * this.dpr)
    const g = surface.getContext('2d')
    if (g) {
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
      paintPaper(g, this.width, this.height, this.tier < 3)
      paintHouse(new Pen(g, surface, this.tiles(), seedOf(key)), page, scene.house, scene.phase)
    }
    this.ground = surface
    this.groundKey = key
    return surface
  }

  /** The hatch tiles, ruled for this page: a little finer where the drawing is small, so tone stays tone. */
  private tiles(): HatchTiles {
    const scale = this.page ? Math.max(0.62, Math.min(1.25, this.page.scale)) : 1
    if (!this.hatch) this.hatch = buildHatch(this.make, this.dpr * scale, 9001)
    return this.hatch
  }

  /** A figure by name, drawn the first time it is asked for. `w`, `h`, `ox` and `oy` are in the figure's own units. */
  private sprite(key: string, w: number, h: number, ox: number, oy: number, scale: number, draw: (pen: Pen) => void): Sprite {
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

  /** Sets a figure on the page with its origin at a point, squashed and turned about that point. */
  private blit(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, sx: number, sy: number, turn: number): void {
    const d = this.dpr, c = Math.cos(turn), s = Math.sin(turn)
    ctx.setTransform(d * c * sx, d * s * sx, -d * s * sy, d * c * sy, d * x, d * y)
    ctx.drawImage(sprite.surface as unknown as CanvasImageSource, -sprite.ox, -sprite.oy, sprite.w, sprite.h)
    ctx.setTransform(d, 0, 0, d, 0, 0)
  }

  /** What travels through the house, as strokes: warmth, cold and noise, each crossing the wall or floor it goes through. */
  private airs(ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, seconds: number): number {
    const u = page.scale
    let count = 0
    ctx.strokeStyle = INK
    // A boiler's warmth, from its drum up through the room over it.
    for (const fixture of scene.house.fixtures) {
      if (fixture.kind !== 'boiler') continue
      const bay = page.cellarBays[fixture.col], room = page.rooms[fixture.col]
      if (!bay || !room) continue
      const left = room.bedSide === 'right' ? room.rect.x + 14 * u : room.rect.x + room.rect.w - 104 * u
      this.wavy(ctx, left, left + 90 * u, bay.y + 18 * u, room.rect.y + 12 * u, 5, 1.5 * u, seconds, fixture.col + 1, u)
      count++
    }
    for (const air of scene.airs) {
      const from = page.rooms[air.rooms[air.rooms.length - 2] ?? -1], to = page.rooms[air.rooms[air.rooms.length - 1] ?? -1]
      if (!from || !to) continue
      if (air.kind === 'warm' && to.rect.y < from.rect.y) {
        // On through the ceiling, weaker: fewer lines, thinner, and not so far.
        const left = from.bedSide === 'right' ? from.rect.x + 22 * u : from.rect.x + from.rect.w - 96 * u
        this.wavy(ctx, left, left + 74 * u, from.rect.y + 12 * u, to.rect.y + to.rect.h * (1 - 0.3 * air.level - 0.1), 3, 1 * u, seconds, 9, u)
        count++
      } else if (air.kind === 'cold' && to.rect.y > from.rect.y) {
        count += this.cold(ctx, from.rect.x, from.rect.w, from.rect.y + from.rect.h, to.rect.y, to.rect.h, air.level, seconds, u)
      } else if (air.kind === 'din') {
        count += this.din(ctx, scene, page, air, seconds)
      }
    }
    // The cook's pot, which only stews by day: at night, one thin wisp.
    for (const guest of scene.guests) {
      if (guest.id !== 'cook' || guest.place === 'lobby' || guest.place === 'bench') continue
      const where = this.place(guest, page, 0)
      if (!where) continue
      const x = where.x + (where.flip ? -40 : 40) * u, y = where.y - 62 * u
      ctx.beginPath()
      const rise = guest.awake ? 86 : 58
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, px = x + Math.sin(t * 5 - seconds * 1.1) * (2 + t * 7) * u, py = y - t * rise * u
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.lineWidth = (guest.awake ? 1.6 : 0.9) * u
      ctx.stroke()
      count++
    }
    return count
  }

  /** Wavy lines rising between two heights, broken into lengths that climb. */
  private wavy(ctx: CanvasRenderingContext2D, x1: number, x2: number, bottom: number, top: number, lines: number, weight: number, seconds: number, seed: number, u: number): void {
    ctx.beginPath()
    const period = 64 * u, climb = seconds * 16 * u
    for (let i = 0; i < lines; i++) {
      const x = x1 + ((i + 0.5) / lines) * (x2 - x1), shift = fixed(seed, i) * period
      let pen = false
      for (let y = bottom; y >= top; y -= 4 * u) {
        // A length is drawn, then a gap; both climb with the seconds.
        const along = (((bottom - y) - climb + shift) % period + period) % period
        if (along > period * 0.68) { pen = false; continue }
        const px = x + Math.sin((y / u) * 0.11 + i * 1.9 + seconds * 0.6) * 4.5 * u
        if (pen) ctx.lineTo(px, y); else ctx.moveTo(px, y)
        pen = true
      }
    }
    ctx.lineWidth = weight
    ctx.stroke()
  }

  /** Cold sinking through a floor: fine strokes falling and a fringe of icicles on the ceiling below. */
  private cold(ctx: CanvasRenderingContext2D, x: number, w: number, floorY: number, ceilingY: number, roomH: number, level: number, seconds: number, u: number): number {
    const top = floorY - 34 * u, reach = ceilingY + roomH * Math.min(0.62, 0.22 + 0.2 * level)
    ctx.beginPath()
    const strokes = 22
    for (let i = 0; i < strokes; i++) {
      const px = x + (0.08 + 0.84 * fixed(31, i)) * w
      const t = (fixed(32, i) + seconds * (0.1 + fixed(33, i) * 0.06)) % 1
      const y = top + t * (reach - top), len = (7 + fixed(34, i) * 9) * u * (1 - t * 0.5)
      ctx.moveTo(px, y)
      ctx.lineTo(px, y + len)
    }
    ctx.lineWidth = 0.9 * u
    ctx.stroke()
    // The icicles, hung from the ceiling the cold comes through.
    ctx.beginPath()
    const teeth = 15
    for (let i = 0; i < teeth; i++) {
      const cx = x + ((i + 0.5) / teeth) * w + (fixed(35, i) - 0.5) * 6 * u, half = (2.4 + fixed(36, i) * 2) * u
      const len = (9 + fixed(37, i) * 15 * level) * u
      ctx.moveTo(cx - half, ceilingY)
      ctx.lineTo(cx + (fixed(38, i) - 0.5) * u, ceilingY + len)
      ctx.lineTo(cx + half, ceilingY)
    }
    ctx.fillStyle = PAPER
    ctx.fill()
    ctx.lineWidth = 1.1 * u
    ctx.stroke()
    return 2
  }

  /** Noise: jagged marks that leave the tuba's bell, cross a wall or a floor, and are thinner on the far side. */
  private din(ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, air: InkAir, seconds: number): number {
    const u = page.scale
    const source = air.rooms[0]!, last = air.rooms[air.rooms.length - 1]!, before = air.rooms[air.rooms.length - 2]!
    const from = page.rooms[source], to = page.rooms[last], via = page.rooms[before]
    if (!from || !to || !via) return 0
    // It starts at the bell of whoever makes it, or in the middle of the room.
    let sx = from.rect.x + from.rect.w / 2, sy = from.rect.y + from.rect.h / 2
    const maker = scene.guests.find((guest) => guest.id === 'troll' && guest.awake && typeof guest.place === 'object' && guest.place.room === source)
    if (maker) {
      const where = this.place(maker, page, 0)
      if (where) { sx = where.x + TUBA_BELL.x * u * (where.flip ? -1 : 1); sy = where.y + TUBA_BELL.y * u }
    }
    // It heads for the middle of the wall or floor it crosses last, and a little beyond.
    const sideways = to.rect.y === via.rect.y
    const crossX = sideways ? (to.rect.x > via.rect.x ? to.rect.x - 5 * u : via.rect.x - 5 * u) : Math.max(via.rect.x + via.rect.w * 0.25, Math.min(via.rect.x + via.rect.w * 0.75, sx))
    const crossY = sideways ? Math.max(via.rect.y + via.rect.h * 0.3, Math.min(via.rect.y + via.rect.h * 0.7, sy)) : (to.rect.y > via.rect.y ? to.rect.y - 6 * u : via.rect.y - 6 * u)
    const heading = Math.atan2(crossY - sy, crossX - sx), wall = Math.hypot(crossX - sx, crossY - sy)
    const start = 30 * u, beyond = (44 + 24 * air.level) * u, far = wall + beyond, gap = 21 * u
    const phase = (seconds * BEAT) % 1
    const marks = Math.ceil((far - start) / gap)
    const seed = last * 7 + source
    for (const across of [false, true]) {
      ctx.beginPath()
      for (let i = 0; i < marks; i++) {
        const r = start + (i + phase) * gap
        if (r > far || (r > wall) !== across) continue
        // Each mark is a jagged arc, shorter as it dies away, and shorter again once through.
        const fade = Math.min(1, (far - r) / (30 * u)), grow = Math.min(1, (r - start) / (24 * u) + 0.35)
        const half = (across ? 0.24 : 0.36) * fade * grow * Math.min(1, (150 * u) / r + 0.3)
        const teeth = Math.max(3, Math.round((2 * half * r) / (7 * u)))
        for (let k = 0; k <= teeth; k++) {
          const a = heading - half + (2 * half * k) / teeth
          const jag = (k % 2 ? 1 : -1) * (across ? 2.4 : 4.2) * u * (0.7 + 0.6 * fixed(seed + i, k))
          const px = sx + Math.cos(a) * (r + jag), py = sy + Math.sin(a) * (r + jag)
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
      }
      ctx.lineJoin = 'miter'
      ctx.lineWidth = (across ? 1.4 : 2.4) * u
      ctx.stroke()
      ctx.lineJoin = 'round'
    }
    return 2
  }

  /** Something lumpy leaning on the coach's blind from inside: it shifts now and then. */
  private lump(ctx: CanvasRenderingContext2D, page: PageLayout, seconds: number): number {
    const u = page.scale, coach = page.coach
    // Still for most of every seven seconds, then a slow lurch to somewhere else along the blind.
    const turnOf = Math.floor(seconds / 7), within = seconds / 7 - turnOf
    const ease = within < 0.82 ? 0 : (1 - Math.cos(((within - 0.82) / 0.18) * Math.PI)) / 2
    const spot = fixed(71, turnOf) + (fixed(71, turnOf + 1) - fixed(71, turnOf)) * ease
    const span = page.coachDoor.x - coach.x - 44 * u
    const x = coach.x + 22 * u + spot * Math.max(0, span), y = coach.y + 50 * u
    ctx.beginPath()
    ctx.moveTo(x - 9 * u, y + 12 * u)
    ctx.quadraticCurveTo(x - 10 * u, y - 4 * u, x - 2 * u, y - 5 * u)
    ctx.quadraticCurveTo(x + 2 * u, y - 12 * u, x + 8 * u, y - 4 * u)
    ctx.quadraticCurveTo(x + 13 * u, y + 2 * u, x + 10 * u, y + 12 * u)
    ctx.fillStyle = PAPER
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.3 * u
    ctx.stroke()
    ctx.beginPath()
    for (const k of [-5, 0, 5]) { ctx.moveTo(x + k * u, y + 2 * u); ctx.lineTo(x + (k + 1.5) * u, y + 11 * u) }
    ctx.lineWidth = 0.7 * u
    ctx.stroke()
    return 1
  }

  /** Snow: drifting down through a snow hole into the room under it, and falling from the yeti's own cloud. */
  private snow(ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, seconds: number, cloud: { x: number; y: number } | null): number {
    const u = page.scale, { floors } = SHAPES[scene.house.shape]
    const flakes = this.tier >= 2 ? 16 : 30
    ctx.beginPath()
    let any = false
    for (const fixture of scene.house.fixtures) {
      if (fixture.kind !== 'snow') continue
      const bay = page.roofBays[fixture.col], room = page.rooms[(floors - 1) * SHAPES[scene.house.shape].cols + fixture.col]
      if (!bay || !room) continue
      const cx = bay.x + bay.w / 2, top = bay.y - 30 * u, bottom = room.rect.y + room.rect.h - 8 * u
      for (let i = 0; i < flakes; i++) {
        const t = (fixed(41 + fixture.col, i) + seconds * (0.045 + fixed(42, i) * 0.03)) % 1
        const y = top + t * (bottom - top)
        // Through the hole it is a narrow stream; in the room it spreads.
        const spread = (y < room.rect.y ? 18 : 18 + ((y - room.rect.y) / room.rect.h) * 50) * u
        const x = cx + (fixed(43, i) - 0.5) * 2 * spread + Math.sin(seconds * 0.8 + i) * 4 * u
        const r = (1.5 + fixed(44, i) * 1.4) * u
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, TAU)
        any = true
      }
    }
    if (cloud) {
      for (let i = 0; i < 7; i++) {
        const t = (fixed(51, i) + seconds * (0.22 + fixed(52, i) * 0.1)) % 1
        const x = cloud.x + (fixed(53, i) - 0.5) * 44 * u + Math.sin(seconds + i) * 2 * u, y = cloud.y + (2 + t * 26) * u
        const r = (1.3 + fixed(54, i) * 0.9) * u
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, TAU)
        any = true
      }
    }
    if (!any) return 0
    ctx.fillStyle = PAPER
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 0.9 * u
    ctx.stroke()
    return 1
  }
}
