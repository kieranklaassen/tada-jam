import { printBank, printNear } from './banksArt'
import { drawBird, printBird, type BirdStamps } from './birdArt'
import { drawBoat, lampSpot, printMoored, waterAt } from './boatView'
import { BACKDROP } from './config'
import { drawFrog, printFrog, type FrogStamps } from './frogArt'
import { drawGnome, printGnome, type GnomeStamps } from './gnomeArt'
import { handPose, type Guidance, type HandPose } from './guidance'
import { draftOf } from './build'
import { DRAGONFLY, FRAME, LINE, PLACES, POND, SUN, TREE_AT_BRANCH, WATER, clamp, frameLeft, handAt } from './layout'
import { LYING, printMakings, type MakingStamps } from './makingsArt'
import { glowAt, nextMove } from './open'
import { onBoat, seatOf, type Piece } from './pieces'
import { printPlaces, type PlaceStamps } from './placesArt'
import { INK, flat, line, stamp, stampLeaning, stampStrip, tally, type G, type Stamp } from './print'
import { drawFx, printProps, type PropStamps } from './propsArt'
import { FAR, INSIDE, WAVE_PERIOD, printBase, printFar, printSun, printWaves, type Waves } from './sceneryArt'
import { drawSprite, printSprite, type SpriteStamps } from './spriteArt'
import { fit, type Fit } from './stage'
import { PUFF_LIFE, RING_LIFE, gnomeSpot, homesOf, ringRadius, type World } from './world'

// The view: one frame of the print. What stands still is stamped from
// sheets printed when the surface is sized; what moves is stamped at its own
// pose or drawn with the pen. Nothing is printed in a frame, one sheet
// covers the whole surface, and what is nearer is drawn in front.

type Sheets = {
  base: Stamp; sun: Stamp; far: Stamp; waves: Waves[]; bank: Stamp; near: Stamp; places: PlaceStamps
  frog: FrogStamps; bird: BirdStamps; sprite: SpriteStamps; gnome: GnomeStamps; makings: MakingStamps; props: PropStamps
}

/** One thing in the water, and how near it is: the list is drawn from the far shore to the near one. */
type Item = { y: number; draw: () => void }

const mod = (a: number, n: number): number => ((a % n) + n) % n

export class BrookView {
  /** How the stage sits in the surface: touches come back through it. */
  fit: Fit = fit(0, 0)
  /** What the last frame cost: sheets stamped and strokes and fills of the pen. Their sum is the game's draw count. */
  stamps = 0
  pen = 0
  /** How many sheets have been printed since the view was made: none are printed in a frame. */
  printed = 0
  /** How many rows of water lines slide over the brook: the quality tier sets it. */
  waterLayers: 1 | 2 = 2
  private readonly g: G
  private sheets: Sheets | null = null
  private moored: Stamp[] = []
  private mooredKey = ''
  private lastMoored: Stamp | null = null
  private density = 0
  private ratio = 1
  private width = 0
  private height = 0
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly items: Item[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d') as G
  }

  /** The surface has a new size or pixel ratio: the fit is made again, and the sheets are printed again at that density. */
  resize(width: number, height: number, ratio: number): void {
    this.width = width; this.height = height; this.ratio = ratio
    this.fit = fit(width, height)
    const density = Math.min(3, Math.max(0.5, Math.round(this.fit.scale * ratio * 8) / 8))
    if (this.fit.scale <= 0 || density === this.density) return
    this.density = density
    this.sheets = {
      base: printBase(density), sun: printSun(density), far: printFar(density), waves: [printWaves(density, true), printWaves(density, false)],
      bank: printBank(density), near: printNear(density), places: printPlaces(density),
      frog: printFrog(density), bird: printBird(density), sprite: printSprite(density), gnome: printGnome(density), makings: printMakings(density), props: printProps(density),
    }
    this.printed += 1
    this.mooredKey = ''
  }

  /**
   * The boats moored at the pond are printed here, once each time the pond's list changes: at a load, after
   * the surface is sized, and when a boat comes in. The Mount calls this before it draws; on every other
   * frame it prints nothing.
   */
  sync(w: World): void {
    const sheets = this.sheets
    if (!sheets) return
    const key = `${this.density}:${w.show.ghost}:${JSON.stringify(w.pond)}`
    if (key === this.mooredKey) return
    this.mooredKey = key
    this.moored = w.pond.map((build) => printMoored(build, this.density, sheets.makings, sheets.props))
    // In the morning the boat that came last is shown as a print of itself, at its own size, until the view has left the pond.
    const last = w.pond[w.pond.length - 1]
    this.lastMoored = w.show.ghost && last ? printMoored(last, this.density, sheets.makings, sheets.props, 1) : null
    this.printed += 1
  }

  /** One frame. With no world yet (the slot is still being read) the print is shown with nobody in it. */
  draw(w: World | null, guidance: Guidance | null): void {
    const g = this.g, sheets = this.sheets
    tally.stamps = 0; tally.pen = 0
    if (!sheets || this.fit.scale <= 0) return
    const by = this.fit, r = this.ratio
    g.setTransform(1, 0, 0, 1, 0, 0)
    // Paper beside the print, where the surface is wider or taller than the stage: the print's wide margins.
    if (by.x > 0.5 || by.y > 0.5) {
      g.fillStyle = BACKDROP
      g.fillRect(0, 0, this.width * r, this.height * r)
      tally.pen += 1
    }
    g.setTransform(r * by.scale, 0, 0, r * by.scale, r * by.x, r * by.y)
    g.globalAlpha = 1
    stamp(g, sheets.base, 0, 0)
    g.save()
    g.beginPath()
    g.rect(INSIDE.left, INSIDE.top, INSIDE.right - INSIDE.left, INSIDE.bottom - INSIDE.top)
    g.clip()
    const cam = w ? w.cam : 0, time = w ? w.time : 0
    // The sun sinks as the brook is followed down, and is lifted at the pond.
    const down = clamp(-cam / (FRAME * PLACES.length), 0, 1)
    stamp(g, sheets.sun, SUN.x, SUN.morning + (SUN.pond - SUN.morning) * down - (w ? w.show.sun : 0))
    const from = mod(cam * FAR.pace, FAR.width)
    stampStrip(g, sheets.far, from, Math.min(FRAME, FAR.width - from), 0, FAR.top)
    if (from + FRAME > FAR.width) stampStrip(g, sheets.far, 0, from + FRAME - FAR.width, FAR.width - from, FAR.top)
    // The frames in view: one, or two while the view moves on.
    const first = Math.floor(-cam / FRAME) - 1, shift = mod(-cam, FRAME)
    const frames: [number, number][] = shift === 0 ? [[first, 0]] : [[first + 1, shift - FRAME], [first, shift]]
    for (const [frame, ox] of frames) {
      if (frame < 0) stamp(g, sheets.places.tree, ox, 0)
      else if (PLACES[frame] === 'branch') stamp(g, sheets.places.tree, ox + TREE_AT_BRANCH.x, TREE_AT_BRANCH.y)
      if (frame < 0 || PLACES[frame] === 'sprite') stamp(g, sheets.places.rushes, ox, 0)
    }
    const span = INSIDE.right - INSIDE.left
    for (const waves of this.waterLayers === 2 ? sheets.waves : [sheets.waves[1]]) {
      stampStrip(g, waves.stamp, mod(time * waves.speed + cam, WAVE_PERIOD), span, INSIDE.left, waves.top)
    }
    if (w) this.world(g, sheets, w, guidance, frames)
    else stamp(g, sheets.bank, 0, 0)
    g.restore()
    g.beginPath()
    g.rect(INSIDE.left, INSIDE.top, INSIDE.right - INSIDE.left, INSIDE.bottom - INSIDE.top)
    line(g, 2.6)
    this.stamps = tally.stamps
    this.pen = tally.pen
  }

  private world(g: G, sheets: Sheets, w: World, guidance: Guidance | null, frames: [number, number][]): void {
    const s = w.stage, boat = w.boat, items = this.items
    const here = frames.find(([frame]) => frame === w.frame)?.[1] ?? frameLeft(w.frame) - w.cam
    const bankX = frameLeft(-1) - w.cam
    const inHand = w.hand?.on === 'boat'
    const inWater = (boat.mode === 'afloat' || boat.mode === 'brook' || boat.mode === 'fall') && !inHand
    const seated = w.gnomeAt === 'aboard' && w.show.aboard >= 1 && w.show.pad <= 0
    // In the morning scene the pond as it stood is still on show, in its own frame, until the view has left it.
    const ghost = w.show.ghost
    const pondOx = frames.find(([frame]) => frame >= 0 && PLACES[frame] === 'pond')?.[1]
    const mine = w.finished || ghost ? w.pond.length - 1 : -1
    const lampOnBack = ghost || mine < 0 || (w.show.lamps[mine] ?? 0) <= 0
    const boatSheets = sheets
    // A thing an answer has is drawn behind whoever has it, or in front of everything.
    const acted = w.pieces.filter((piece) => piece.mode === 'act')
    // A thing in the hand is under the finger, in the frame that is on show; a thing on the bank is in the bank's frame.
    const pieceX = (piece: Piece): number => piece.x + (piece.mode !== 'held' && piece.place.on === 'bank' ? bankX : here)
    this.rings(g, w, here)
    for (const piece of acted) if (piece.behind) this.piece(g, sheets, w, piece, pieceX(piece), false)
    items.length = 0
    for (const [frame, ox] of frames) {
      const homes = homesOf(frame), place = frame < 0 ? 'bank' : PLACES[frame]
      const frog = homes.frog, bird = homes.bird, sprite = homes.sprite
      if (frog) {
        if (place !== 'reeds') items.push({ y: frog.y - 1, draw: () => stamp(g, sheets.frog.stone, frog.x + ox, frog.y) })
        items.push({ y: frog.y + s.frog.dy, draw: () => drawFrog(g, sheets.frog, s.frog, { x: frog.x + ox, y: frog.y }) })
      }
      // The kingfisher is far off on his perch, and in front of the boat when he comes down to it.
      if (bird) items.push({ y: s.bird.dy > 110 ? 2000 : 0, draw: () => drawBird(g, sheets.bird, s.bird, { x: bird.x + ox, y: bird.y }) })
      if (sprite) items.push({ y: sprite.y + (s.sprite.arm > 0.3 ? 80 : 0), draw: () => drawSprite(g, sheets.sprite, s.sprite, { x: sprite.x + ox, y: sprite.y }) })
      const lean = 0.5 * s.place.bend
      if (place === 'reeds') {
        items.push({ y: 430, draw: () => stampLeaning(g, sheets.places.reedsBack, ox, 0, lean, 430) })
        items.push({ y: 576, draw: () => stampLeaning(g, sheets.places.reedsFront, ox, 0, lean * 0.8, 576) })
      } else if (place === 'stones') {
        items.push({ y: 470, draw: () => stamp(g, sheets.places.stonesBack, ox, 0) })
        items.push({ y: 560, draw: () => stamp(g, sheets.places.stonesFront, ox, 0) })
      } else if (place === 'fall') {
        items.push({ y: 340, draw: () => stamp(g, sheets.places.fallBack, ox, 0) })
        items.push({ y: 596, draw: () => stamp(g, sheets.places.fallFront, ox, 0) })
      } else if (place === 'pond') {
        items.push({ y: 400, draw: () => stamp(g, sheets.places.liliesBack, ox, 0) })
        items.push({ y: 560, draw: () => stamp(g, sheets.places.liliesFront, ox, 0) })
        // The boats sent before, the newest nearest the mooring: four of them, since the oldest has gone on.
        const earlier = this.moored.length - (w.finished || w.show.ghost ? 1 : 0)
        for (let i = earlier - 1, row = 0; i >= 0 && row < 4; i--, row++) {
          const at = POND.rows[row], sheet = this.moored[i]
          if (sheet) items.push({ y: at.y, draw: () => stamp(g, sheet, at.x + ox, at.y, 0, at.s / POND.scale, at.s / POND.scale) })
        }
        const last = this.lastMoored, built = w.pond[w.pond.length - 1]
        const turned = boat.face < 0 ? -1 : 1
        if (ghost && last && built) {
          // Where it rode when the sun was lifted, as deep as it was loaded and cut off at the water like the boat itself: it does not hop.
          const rides = LINE + draftOf(built, false)
          items.push({ y: POND.moor.y, draw: () => {
            g.save()
            g.beginPath()
            g.rect(POND.moor.x + ox - 420, 0, 840, waterAt(w, POND.moor.x))
            g.clip()
            stamp(g, last, POND.moor.x + ox, rides, 0, turned, 1)
            g.restore()
          } })
        }
        const bow = ghost ? POND.moor.x : boat.x + s.boat.dx
        if (s.place.pile > 0.02) items.push({ y: 530, draw: () => stamp(g, sheets.places.pile, bow - 172 + ox, waterAt(w, bow) + 8, 0, s.place.pile, s.place.pile) })
      }
    }
    if (inWater) items.push({ y: boat.y + s.boat.dy, draw: () => drawBoat(g, boatSheets, w, here, seated, lampOnBack) })
    for (const piece of w.pieces) if (piece.mode === 'float' && piece.y < WATER.bottom - 4) items.push({ y: piece.y, draw: () => this.piece(g, sheets, w, piece, pieceX(piece), true) })
    items.sort((a, b) => a.y - b.y)
    for (const item of items) item.draw()
    for (const [frame, ox] of frames) stamp(g, frame < 0 ? sheets.bank : sheets.near, ox, 0)
    if (!w.finished) this.glows(g, sheets, w, guidance, here)
    // On its stone the boat stands behind what lies on the moss in front of it; in the hand it is over everything that lies about.
    if (!inWater && !inHand && boat.mode !== 'none') drawBoat(g, boatSheets, w, here, seated, lampOnBack)
    // The gnome on his pad leaves with the pond; the gnome on the stone is there when the bank comes into view.
    if (ghost && pondOx !== undefined) drawGnome(g, sheets.gnome, s.gnome, { x: POND.pad.x + pondOx, y: POND.pad.y - 45 }, false)
    if (!seated && (!ghost || frames.some(([frame]) => frame < 0))) {
      const at = gnomeSpot(w)
      drawGnome(g, sheets.gnome, s.gnome, { x: at.x + (w.gnomeAt === 'stone' ? bankX : here), y: at.y }, lampOnBack)
    }
    for (const piece of w.pieces) {
      if (piece.mode === 'act' || (piece.mode === 'float' && piece.y < WATER.bottom - 4) || (piece.mode === 'rest' && onBoat(piece))) continue
      this.piece(g, sheets, w, piece, pieceX(piece), false)
    }
    if (inHand && boat.mode !== 'none') drawBoat(g, boatSheets, w, here, seated, lampOnBack)
    for (const piece of acted) if (!piece.behind) this.piece(g, sheets, w, piece, pieceX(piece), false)
    // The berry on its pad leaves with the pond too.
    if (ghost && pondOx !== undefined && w.show.berry > 0) stamp(g, sheets.makings.berry, POND.berry.x + pondOx, POND.berry.y - 12)
    const berry = w.show.berry > 0 && !ghost ? w.pieces.find((piece) => piece.kind === 'berry' && piece.mode === 'rest' && onBoat(piece)) : undefined
    if (berry) {
      // The gnome sets it on the pad beside his own.
      const seat = seatOf(berry, w.pieces), bx = boat.x + seat.x * (boat.face < 0 ? -1 : 1), by = boat.y + seat.y, k = w.show.berry
      stamp(g, sheets.makings.berry, bx + (POND.berry.x - bx) * k + here, by + (POND.berry.y - 12 - by) * k - Math.sin(k * Math.PI) * 40)
    }
    // The dragonfly rides a leaf that floats, and flies its own beat otherwise.
    const ridden = w.pieces.find((piece) => piece.rider === 'fly')
    const fx = ridden ? pieceX(ridden) : DRAGONFLY.x + s.fly.x, fy = ridden ? ridden.y - 16 : DRAGONFLY.y + s.fly.y
    g.beginPath()
    for (const side of [-1, 1]) g.ellipse(fx + 4, fy - 3 + side * 9 * Math.abs(s.fly.wings), 17, 4.5, side * 0.5, 0, Math.PI * 2)
    flat(g, 'rgba(246,240,222,0.8)')
    stamp(g, sheets.props.fly, fx, fy)
    for (const mark of s.fx) drawFx(g, { ...mark, x: mark.x + here })
    for (const puff of w.puffs) {
      const k = puff.age / PUFF_LIFE
      g.globalAlpha = 1 - k * k
      if (puff.kind === 'sky') {
        // A gust: two pale lines of unlike length that curl as they run downwind, like the sprite's breath.
        const x = puff.x + here - k * 46, y = puff.y
        g.beginPath()
        g.moveTo(x + 34, y - 7)
        g.quadraticCurveTo(x + 10, y - 14 - k * 4, x - 8, y - 6)
        g.quadraticCurveTo(x - 22, y, x - 30 - k * 10, y - 12)
        g.moveTo(x + 22, y + 8)
        g.quadraticCurveTo(x + 4, y + 2, x - 16 - k * 8, y + 9 + k * 4)
        line(g, 3, INK.white)
      } else {
        // Petals off the near ground; off the far bank the same puff, further away and so smaller and lower.
        const far = puff.kind === 'far' ? 0.65 : 1
        stamp(g, sheets.props.petals, puff.x + here, puff.y - Math.sin(k * Math.PI) * 22 * far, k * 0.6, (0.3 + k * 0.8) * far, (0.3 + k * 0.8) * far)
      }
    }
    g.globalAlpha = 1
    this.dusk(g, sheets, w, ghost ? pondOx : here, mine)
    if (w.finished) this.glows(g, sheets, w, guidance, here)
    if (guidance && guidance.demo !== null) {
      const move = nextMove(w)
      const pose = handPose(guidance.demo, move.drag, this.hand)
      g.globalAlpha = pose.opacity * 0.92
      const size = 1 - pose.press * 0.1
      const at = handAt(move.from.x + (move.to.x - move.from.x) * pose.travel + here, move.from.y + (move.to.y - move.from.y) * pose.travel + pose.press * 5)
      stamp(g, sheets.props.hand, at.x, at.y, 0, size, size)
      g.globalAlpha = 1
    }
  }

  /** The glow of the idle ladder, on one thing at a time. */
  private glows(g: G, sheets: Sheets, w: World, guidance: Guidance | null, here: number): void {
    if (!guidance || guidance.glow <= 0.01) return
    // One glow, on the one thing the hand is about to take.
    const spot = glowAt(w)
    g.globalAlpha = guidance.glow * 0.9
    const breathe = 1 + 0.05 * Math.sin(w.time * 3)
    stamp(g, sheets.props.halo, spot.x + here, spot.y, 0, (spot.r / 70) * breathe, (spot.r / 70) * breathe * (spot.r > 85 ? 0.6 : 1))
    g.globalAlpha = 1
  }

  /** Dusk is wiped down over the print as one more block, and the lamps are lit over it. */
  private dusk(g: G, sheets: Sheets, w: World, here: number | undefined, mine: number): void {
    const k = w.show.dusk, ghost = w.show.ghost
    // In the morning the wash is wiped back up, and a lamp goes out as the edge of the wash passes it.
    const edge = INSIDE.top + (INSIDE.bottom - INSIDE.top) * k
    const under = (y: number): number => (ghost ? clamp((edge - y) / 36 + 0.5, 0, 1) : 1)
    if (k > 0.01) {
      const wash = g.createLinearGradient(0, INSIDE.top, 0, INSIDE.bottom)
      wash.addColorStop(0, 'rgba(24,34,84,0.62)')
      wash.addColorStop(0.4, 'rgba(120,70,110,0.34)')
      wash.addColorStop(1, 'rgba(24,34,84,0.5)')
      g.fillStyle = wash
      g.fillRect(INSIDE.left, INSIDE.top, INSIDE.right - INSIDE.left, (INSIDE.bottom - INSIDE.top) * k)
      tally.pen += 1
    }
    if (here === undefined) return
    const earlier = this.moored.length - (w.finished || w.show.ghost ? 1 : 0)
    for (let i = earlier - 1, row = 0; i >= 0 && row < 4; i--, row++) {
      const build = w.pond[i]
      if (!build) continue
      const at = POND.rows[row], lamp = lampSpot(build)
      const lit = (w.show.lamps[i] ?? 0) * under(at.y + lamp.y * at.s)
      if (lit <= 0.01) continue
      g.globalAlpha = lit
      // Each lamp hangs where its own boat carries it (in the cap, on the mast, at the bow), and is as large as its boat is drawn.
      stamp(g, sheets.props.lit, at.x + lamp.x * at.s + here, at.y + lamp.y * at.s, 0, at.s, at.s)
    }
    const last = mine >= 0 ? w.pond[mine] : undefined
    if (last) {
      // The lamp of the boat that came last: on the boat, or in the morning on the print of it at its mooring.
      const lamp = lampSpot(last), face = w.boat.face < 0 ? -1 : 1
      const x = (ghost ? POND.moor.x : w.boat.x) + lamp.x * face, y = (ghost ? LINE + draftOf(last, false) : w.boat.y) + lamp.y
      const own = (w.show.lamps[mine] ?? 0) * under(y)
      if (own > 0.01) {
        g.globalAlpha = own
        stamp(g, sheets.props.lit, x + here, y)
      }
    }
    g.globalAlpha = 1
  }

  /** A making that is not at rest on the boat: lying, held, flying, floating or in an answer. */
  private piece(g: G, sheets: Sheets, _w: World, piece: Piece, x: number, floating: boolean): void {
    const wide = 1 + piece.squash * 0.25, tall = 1 - piece.squash * 0.25
    const px = x, py = piece.y
    g.globalAlpha = piece.alpha
    stamp(g, sheets.makings[piece.kind], px, py, LYING[piece.kind] * (1 - piece.stand) + piece.swing + piece.rot, wide * piece.scale, tall * piece.scale)
    g.globalAlpha = 1
    if (piece.rider === 'beetle') stamp(g, sheets.props.beetle, px, py - 8)
    if (floating) {
      g.beginPath()
      g.ellipse(px, py + 8, 34, 7, 0, 0.2, Math.PI - 0.2)
      line(g, 1.8, 'rgba(246,240,222,0.9)')
    }
  }

  /** Rings a finger, a dropped thing or a splash left on the water: two broken arcs, fading as they spread. */
  private rings(g: G, w: World, here: number): void {
    for (const ring of w.rings) {
      const r = ringRadius(ring), fade = Math.max(0, 1 - ring.age / RING_LIFE), x = ring.x + here
      g.globalAlpha = fade
      g.beginPath()
      g.ellipse(x, ring.y, r, r * 0.3, 0, 0.25, Math.PI - 0.5)
      g.moveTo(x - r * 0.9, ring.y - r * 0.12)
      g.ellipse(x, ring.y, r, r * 0.3, 0, Math.PI + 0.4, Math.PI * 2 - 0.2)
      line(g, 3, INK.white)
      g.beginPath()
      g.ellipse(x, ring.y, r * 0.72, r * 0.72 * 0.3, 0, 0.9, Math.PI + 0.3)
      line(g, 1.8, INK.line)
    }
    g.globalAlpha = 1
  }
}

export { handAt }
