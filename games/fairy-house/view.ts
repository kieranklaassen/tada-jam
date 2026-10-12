import { hillOutline, makeSprite, makeSprites, paintDusk, paintWood, type Sheet, type Sprite, type Sprites } from './art'
import { FOLK, HELD, TOWARD, type Mouth, type Pose, type Who } from './folk'
import { placement } from './lie'
import { HOLLOW, NTH_OF_KIND } from './kinds'
import { FAR_BIRDS, eyeFor, lash, puddle } from './marks'
import { HUES, blob, type Box, type Pen } from './pencil'
import { fit, type Fit } from './stage'
import { OWL_AT, PUFF_SECONDS, type Puff, type Show, type ShownThing, type Stand } from './toy'

// The view: one stamp for the wood, one for each sprite, and a few pencil
// lines for what is alive in a face. Nothing is hatched in a frame.
//
// `draws` is the game's draw count: every sprite stamped and every live path
// filled or stroked in the last frame. It is what the frame-budget test
// counts and what the grown-up overlay shows.
//
// The wood is drawn twice when the surface is sized: by day, and at dusk.
// As the sun goes down the dusk comes down the page like a blind, and the
// two sheets share the surface, each stamped once in its own part: a frame
// never lays more than one surface of wood.

/** Where each one's face is, from its feet: two eyes, their size, and the mouth. */
export const FACE: Record<Who, { eyes: readonly [number, number][]; r: number; mouth: readonly [number, number]; wide: number; lift: number }> = {
  fat: { eyes: [[-21, -192], [23, -192]], r: 11, mouth: [2, -150], wide: 15, lift: 0 },
  tidy: { eyes: [[-15, -247], [5, -247]], r: 7, mouth: [-9, -224], wide: 8, lift: 0 },
  tiny: { eyes: [[-15, -100], [15, -100]], r: 10, mouth: [0, -80], wide: 9, lift: 4 },
}

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

/** Where the fireflies fly at dusk: each a place of the wood and a small loop of its own. None is over the hollow's floor, where things are set down. */
const FIREFLIES: readonly (readonly [number, number, number])[] = [
  [96, 392, 0.7], [214, 318, 1.9], [302, 452, 3.1], [182, 520, 4.4], [420, 228, 5.2], [548, 152, 0.3], [668, 96, 2.6],
  [806, 210, 3.8], [948, 262, 1.2], [1042, 348, 4.9], [1108, 520, 2.2], [986, 596, 5.7], [60, 228, 3.4], [884, 118, 0.9],
]

const PUFF_HUE: Record<Puff['kind'], string> = { dust: HUES.earth.dark, water: HUES.water.dark, fluff: HUES.feather.mid, leaves: HUES.bush.dark, stir: HUES.root.dark, far: HUES.farTrunk.dark }
const PUFF_KINDS = ['dust', 'water', 'fluff', 'leaves', 'stir', 'far'] as const
/** How thick the pencil is for each: the far birds are far, and small. */
const PUFF_WIDTH: Record<Puff['kind'], number> = { dust: 3, water: 3, fluff: 3, leaves: 4, stir: 2.6, far: 2 }

/** The soft lower edge of the dusk while the sun is between day and evening: how many bands, and the share of the surface's height each takes. */
export const DUSK_FRINGE = { bands: 3, share: 0.035 } as const

export class View {
  /** Sprites stamped and live paths drawn in the last frame. */
  draws = 0
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private ratio = 1
  private seen: Box = { x: 0, y: 0, w: 0, h: 0 }
  private wood: Sprite | null = null
  private night: Sprite | null = null
  private sprites: Sprites | null = null
  private builtFor = ''

  constructor(private readonly g: Pen, private readonly make: () => Sheet, private readonly seed: number) {}

  /**
   * The surface has a size: `width` by `height` CSS pixels at `ratio` device pixels each. The wood and the
   * sprites are drawn once for that size, at `finest`, the highest ratio any tier uses, so a tier change
   * redraws nothing and only stamps them smaller.
   */
  resize(width: number, height: number, ratio: number, finest: number): void {
    this.by = fit(width, height)
    this.ratio = ratio
    const { scale, x, y } = this.by
    if (scale === 0) return
    const key = `${width} ${height} ${finest}`
    if (key === this.builtFor) return
    this.builtFor = key
    const density = scale * finest
    // The part of the stage the surface shows: a little more than the stage on a surface of another shape.
    const seen = { x: -x / scale, y: -y / scale, w: width / scale, h: height / scale }
    this.seen = seen
    const wood = makeSprite(this.make, density, seen, (g) => paintWood(g, this.seed, seen))
    this.wood = wood
    this.night = makeSprite(this.make, density, seen, (g) => paintDusk(g, this.seed, seen, wood.sheet))
    this.sprites = makeSprites(this.make, density, this.seed)
  }

  private stamp(sprite: Sprite): void {
    this.g.drawImage(sprite.sheet as unknown as CanvasImageSource, sprite.box.x, sprite.box.y, sprite.box.w, sprite.box.h)
    this.draws += 1
  }

  /** The rows of a wood sheet from one share of its height to another, stamped where they belong. */
  private rows(sprite: Sprite, from: number, to: number): void {
    const { sheet, box } = sprite
    this.g.drawImage(sheet as unknown as CanvasImageSource, 0, from * sheet.height, sheet.width, (to - from) * sheet.height, box.x, box.y + from * box.h, box.w, (to - from) * box.h)
    this.draws += 1
  }

  /** The wood: by day, at dusk, or in between with the dusk down as far as the sun has gone. */
  private backdrop(dusk: number): void {
    const wood = this.wood!, night = this.night!, rows = wood.sheet.height
    // The edge of the dusk lies on a whole row of the sheet, so the two parts meet with no seam.
    const row = (share: number): number => Math.round(clamp(share, 0, 1) * rows) / rows
    const cut = row(dusk)
    if (cut <= 0) return this.stamp(wood)
    if (cut >= 1) return this.stamp(night)
    this.rows(night, 0, cut)
    this.rows(wood, cut, 1)
    // Under the edge the dusk thins out in three narrow bands, each paler than the one above, so the light has no hard line.
    const g = this.g
    for (let band = 0; band < DUSK_FRINGE.bands; band++) {
      const from = row(cut + band * DUSK_FRINGE.share), to = row(cut + (band + 1) * DUSK_FRINGE.share)
      if (to <= from) break
      g.globalAlpha = 1 - (band + 1) / (DUSK_FRINGE.bands + 1)
      this.rows(night, from, to)
    }
    g.globalAlpha = 1
  }

  /** Draws the frame. With nothing to show yet it draws the wood alone. */
  draw(show: Show | null): void {
    const g = this.g, { scale, x, y } = this.by, r = this.ratio
    this.draws = 0
    const s = this.sprites
    if (scale === 0 || !this.wood || !this.night || !s) return
    g.setTransform(r * scale, 0, 0, r * scale, r * x, r * y)
    g.globalAlpha = 1
    this.backdrop(show?.dusk ?? 0)
    if (!show) return

    // Behind everything: the sun over the hill, and behind the hill where it has sunk; the owl in its knot hole.
    g.save()
    g.beginPath()
    g.rect(this.seen.x - 10, this.seen.y - 10, this.seen.w + 20, this.seen.h + 20)
    hillOutline(g, this.seen)
    g.clip('evenodd')
    g.translate(show.sun.x, show.sun.y - show.sun.bob * 22)
    g.rotate(show.sun.turn)
    g.scale(1 + show.sun.bob * 0.12, 1 + show.sun.bob * 0.12)
    this.stamp(s.sun)
    g.restore()
    g.save()
    g.beginPath()
    g.ellipse(OWL_AT.x, OWL_AT.y - 6, 34, 40, 0, 0, Math.PI * 2)
    g.clip()
    g.translate(OWL_AT.x, OWL_AT.y + 32 + show.owl.duck * 64)
    this.stamp(s.owl)
    g.restore()

    // Those of the three who sit round the tree, and the owl's eyes.
    this.people(show, FOLK.filter((who) => !show.inside[who]), true, s)

    // The snail on the left root.
    g.save()
    g.translate(show.snail.x, show.snail.y)
    g.save()
    g.scale(show.snail.facing * (1 - show.snail.hidden * 0.9), 1)
    this.stamp(s.snailBody)
    g.restore()
    g.translate(0, -show.snail.hidden * 2)
    this.stamp(s.snailShell)
    g.restore()

    // Where the carried thing would come to rest.
    if (show.shadow) {
      g.save()
      g.translate(show.shadow.x, show.shadow.y)
      g.scale(show.shadow.w / 100, 1)
      this.stamp(s.shadow)
      g.restore()
    }

    // The idle cue: short strokes of yellow round what can be picked up, or round the sun, in one path.
    if (show.glow > 0.02) {
      g.beginPath()
      let any = false
      const rays = (cx: number, cy: number, rx: number, ry: number, phase: number): void => {
        any = true
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + show.seconds * 0.5 + phase
          const near = 1 + 0.08 * Math.sin(show.seconds * 3 + phase)
          g.moveTo(cx + Math.cos(a) * rx * near, cy + Math.sin(a) * ry * near)
          g.lineTo(cx + Math.cos(a) * (rx + 14) * near, cy + Math.sin(a) * (ry + 10) * near)
        }
      }
      for (const thing of show.things) if (thing.glows) rays(thing.x, thing.y - 16, 54, 34, thing.id)
      if (show.sun.glows) rays(show.sun.x, show.sun.y, 74, 74, 0.4)
      if (any) {
        g.strokeStyle = HUES.sun.dark
        g.lineWidth = 4
        g.lineCap = 'round'
        g.globalAlpha = show.glow * 0.85
        g.stroke()
        g.globalAlpha = 1
        this.draws += 1
      }
    }

    // One of the three who is on its way from place to place goes behind what stands in the hollow: it is drawn before it.
    const passing = FOLK.filter((who) => show.inside[who] && show.behind[who])
    if (passing.length > 0) this.people(show, passing, false, s)
    this.lot(show.things, s)

    // Those of the three who are at a place in the hollow stand in front of what lies there, and what one of them is in, wears or holds is in front of it.
    const inside = FOLK.filter((who) => show.inside[who] && !show.behind[who])
    if (inside.length > 0) this.people(show, inside, false, s)
    this.lot(show.front, s)

    // What a bath has soaked drips: a few drops under each wet thing, in one path.
    g.beginPath()
    let wet = false
    for (const list of [show.things, show.front]) for (const thing of list) {
      if (!thing.wet) continue
      wet = true
      for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * 22 + Math.sin(thing.id * 1.7 + i * 2.3) * 9, dy = -3 - ((thing.id + i * 5) % 7), long = 6 + ((thing.id * 3 + i * 4) % 5)
        g.moveTo(thing.x + dx, thing.y + dy)
        g.lineTo(thing.x + dx - 2, thing.y + dy + long)
      }
    }
    if (wet) {
      g.strokeStyle = HUES.water.dark
      g.lineWidth = 3.2
      g.lineCap = 'round'
      g.globalAlpha = 0.9
      g.stroke()
      g.globalAlpha = 1
      this.draws += 1
    }
    // The water a bath has spilt runs along the ground and sinks away.
    if (show.spill && show.spill.fade < 1) {
      const { from, to, y, fade } = show.spill
      // One uneven puddle from one end of the spill to the other.
      blob(puddle(from, to, y))(g)
      g.fillStyle = HUES.water.mid
      g.globalAlpha = 0.85 * (1 - fade)
      g.fill()
      g.globalAlpha = 1
      this.draws += 1
    }

    // The moth flies in front of everything but the hand.
    g.save()
    g.translate(show.moth.x, show.moth.y)
    g.rotate(show.moth.facing * 0.3)
    g.scale(0.3 + 0.7 * Math.abs(show.moth.flap), 1)
    this.stamp(s.moth)
    g.restore()

    // Fireflies at dusk: small yellow dots, each on a loop of its own, in one path.
    if (show.dusk > 0.05) {
      g.beginPath()
      for (const [fx, fy, phase] of FIREFLIES) {
        const px = fx + Math.sin(show.seconds * 0.6 + phase) * 16, py = fy + Math.cos(show.seconds * 0.45 + phase * 2) * 11
        const size = 3.2 + 1.2 * Math.sin(show.seconds * 2.2 + phase * 3)
        g.moveTo(px + size, py)
        g.ellipse(px, py, size, size, 0, 0, Math.PI * 2)
      }
      g.fillStyle = HUES.glow.mid
      g.globalAlpha = show.dusk * 0.95
      g.fill()
      g.globalAlpha = 1
      this.draws += 1
    }

    // Pencil dust where something came down or a finger patted, drops where a bath splashed, fluff where a quilt was plumped: one path for each kind in the air.
    // Leaves shaken out of a bush, legs and feelers stirring under a root, far birds off the hill: the same, each in its own shape.
    for (const kind of PUFF_KINDS) {
      const puffs = show.puffs.filter((puff) => puff.kind === kind)
      if (puffs.length === 0) continue
      g.beginPath()
      for (const puff of puffs) {
        const p = puff.age / PUFF_SECONDS
        const jitter = (i: number): number => ((puff.seed + i * 37) % 10) * 0.03
        if (kind === 'leaves') {
          // All round, outward and a little down again: no two of the same length.
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + jitter(i) * 6, from = 12 + p * (30 + 14 * jitter(i + 3) * 3), length = (7 + 10 * jitter(i + 5) * 3) * (1 - p)
            const fall = 26 * p * p
            g.moveTo(puff.x + Math.cos(a) * from, puff.y + Math.sin(a) * from * 0.7 + fall)
            g.lineTo(puff.x + Math.cos(a + 0.5) * (from + length), puff.y + Math.sin(a + 0.5) * (from + length) * 0.7 + fall)
          }
        } else if (kind === 'stir') {
          // Out from under the root's edge and in again: two feelers and three legs, waving.
          const out = Math.sin(Math.PI * p) * 15, wave = Math.sin(p * 30)
          for (const [dx, lean, long] of [[-11, -0.9, 0.8], [-4, -0.3, 1.1], [3, 0.2, 0.7], [9, 0.7, 1], [15, 1.1, 0.6]] as const) {
            g.moveTo(puff.x + dx, puff.y - 3)
            g.lineTo(puff.x + dx + (lean + wave * 0.25) * out * long, puff.y - 3 + out * long)
          }
        } else if (kind === 'far') {
          // Small and far: a few specks going up off the hill's top and drifting.
          // Each is a bent pair of wings of its own size, at its own height, beating in its own time.
          FAR_BIRDS.forEach(([dx, up, long, rise, bend], i) => {
            const x = puff.x + dx + 16 * p * (jitter(i) * 6 - 0.8), y = puff.y - 4 - up - p * rise - jitter(i + 2) * 8
            const beat = Math.sin(p * 24 + i * 1.7) * long * 0.3
            g.moveTo(x - long / 2, y - beat)
            g.lineTo(x, y + bend * 0.4)
            g.lineTo(x + long / 2 + bend * 0.3, y - beat * 0.6 - bend * 0.3)
          })
        } else {
          for (let i = 0; i < 6; i++) {
            const a = Math.PI + (i / 5) * Math.PI + jitter(i)
            const from = 10 + p * 34, length = 12 * (1 - p)
            g.moveTo(puff.x + Math.cos(a) * from, puff.y - 2 + Math.sin(a) * from * 0.6)
            g.lineTo(puff.x + Math.cos(a) * (from + length), puff.y - 2 + Math.sin(a) * (from + length) * 0.6)
          }
        }
      }
      g.strokeStyle = PUFF_HUE[kind]
      g.lineWidth = PUFF_WIDTH[kind]
      g.lineCap = 'round'
      g.globalAlpha = 0.75
      g.stroke()
      g.globalAlpha = 1
      this.draws += 1
    }

    // The ghost hand of the idle ladder.
    if (show.hand && show.hand.opacity > 0.01) {
      g.save()
      g.globalAlpha = show.hand.opacity * 0.9
      g.translate(show.hand.x, show.hand.y)
      g.scale(1.3 - show.hand.press * 0.12, 1.3 - show.hand.press * 0.12)
      this.stamp(s.hand)
      g.restore()
      g.globalAlpha = 1
    }
  }

  /**
   * Things in their drawing order. What lies in the hollow is seen through its opening: the hollow is wider inside
   * than its mouth, so the end of a thing that reaches past the opening is behind the trunk, and never over its bark.
   */
  private lot(things: readonly ShownThing[], s: Sprites): void {
    const g = this.g
    let behind = false
    for (const thing of things) {
      if (thing.housed !== behind) {
        if (behind) g.restore()
        else {
          g.save()
          g.beginPath()
          g.moveTo(HOLLOW.archX - HOLLOW.archRx, HOLLOW.floorY + 40)
          g.lineTo(HOLLOW.archX - HOLLOW.archRx, HOLLOW.floorY)
          g.ellipse(HOLLOW.archX, HOLLOW.floorY, HOLLOW.archRx, HOLLOW.archRy, 0, Math.PI, Math.PI * 2)
          g.lineTo(HOLLOW.archX + HOLLOW.archRx, HOLLOW.floorY + 40)
          g.closePath()
          g.clip()
        }
        behind = thing.housed
      }
      this.thing(thing, s)
    }
    if (behind) g.restore()
  }

  /** Some of the three: their bodies, then their faces in three paths, then what lies over a face or is held. */
  private people(show: Show, whos: readonly Who[], owl: boolean, s: Sprites): void {
    const g = this.g
    for (const who of whos) this.folk(who, show, () => {
      if (who === 'tiny') {
        g.save()
        g.translate(0, -6)
        g.rotate(Math.sin(show.seconds * 2.3) * 0.22 * (1 - show.folk.tiny.lid) + show.folk.tiny.bob * 3)
        this.stamp(s.tinyLegs)
        g.restore()
        this.stamp(s.tinyBody)
      } else if (who === 'fat') {
        // The belly wobbles on after the rest of it has stopped.
        g.save()
        g.scale(1 + show.folk.fat.part * 0.05, 1 - show.folk.fat.part * 0.03)
        this.stamp(s.fatBody)
        g.restore()
      } else this.stamp(s.tidyBody)
    })
    this.faces(show, whos, owl)
    for (const who of whos) this.folk(who, show, () => {
      if (who === 'fat') {
        g.save()
        g.translate(0, -214)
        g.rotate(show.folk.fat.part * 0.05)
        this.stamp(s.fatCap)
        g.restore()
        g.translate(0, -84)
        g.scale(1 - show.folk.fat.prop * 0.14, 1 + show.folk.fat.prop * 0.12)
        this.stamp(s.fatPillow)
      } else if (who === 'tidy') {
        g.save()
        g.translate(HELD.tidy.nose.at.x, HELD.tidy.nose.at.y)
        g.rotate(show.folk.tidy.part * 0.22)
        this.stamp(s.tidyNose)
        g.restore()
        g.translate(HELD.tidy.pan.at.x, HELD.tidy.pan.at.y)
        g.rotate(show.folk.tidy.prop * 0.3)
        this.stamp(s.tidyPan)
      } else {
        g.save()
        g.translate(HELD.tiny.hat.at.x, HELD.tiny.hat.at.y + clamp(show.folk.tiny.part, -0.4, 1.1) * 30)
        g.rotate(show.folk.tiny.part * 0.06)
        this.stamp(s.tinyHat)
        g.restore()
        g.translate(HELD.tiny.brush.at.x, HELD.tiny.brush.at.y)
        g.rotate(show.folk.tiny.prop * 0.5)
        this.stamp(s.tinyBrush)
      }
    })
  }

  /** Runs `paint` standing on one of the folk's feet where it stands now: turned, at its size, leaning and breathing as it does. */
  private folk(who: Who, show: Show, paint: () => void): void {
    const g = this.g, at: Stand = show.stand[who], pose: Pose = show.folk[who]
    g.save()
    g.translate(at.x, at.y + FACE[who].lift * at.scale)
    g.rotate(at.turn)
    g.scale(at.scale, at.scale)
    g.rotate((TOWARD[who] * pose.lean * Math.PI) / 180)
    g.scale(1 - pose.bob * 0.6, 1 + pose.bob)
    paint()
    g.restore()
  }

  /** The faces of some of the three, and the owl's eyes with the first group: the whites in one path, the pencil lines in one, the pupils in one. */
  private faces(show: Show, whos: readonly Who[], owl: boolean): void {
    const g = this.g
    // An eye that is shut is a lash, drawn with the pencil lines: it has no white and no pupil.
    const eyeOf = (who: Who, pose: Pose): { shut: boolean; rx: number; ry: number } => {
      const eye = eyeFor(FACE[who].r * clamp(0.7 + 0.3 * pose.wide, 0.75, 1.2), pose.lid)
      return eye.shut ? { shut: true, rx: FACE[who].r, ry: 0 } : eye
    }
    g.beginPath()
    for (const who of whos) this.folk(who, show, () => {
      const { shut, rx, ry } = eyeOf(who, show.folk[who])
      if (!shut) for (const [ex, ey] of FACE[who].eyes) {
        g.moveTo(ex + rx, ey)
        g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2)
      }
    })
    if (whos.length > 0) {
      g.fillStyle = HUES.paper
      g.fill()
      this.draws += 1
    }

    g.beginPath()
    for (const who of whos) this.folk(who, show, () => {
      const pose = show.folk[who], face = FACE[who]
      const { shut, rx, ry } = eyeOf(who, pose)
      face.eyes.forEach(([ex, ey], index) => {
        const inner = index === 0 ? 1 : -1
        if (shut) {
          const [x0, y0, cx, cy, x1, y1] = lash(rx, inner)
          g.moveTo(ex + x0, ey + y0)
          g.quadraticCurveTo(ex + cx, ey + cy, ex + x1, ey + y1)
        } else {
          g.moveTo(ex + rx, ey)
          g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2)
        }
        // A brow over each eye: raised, or drawn down toward the nose.
        const by = ey - face.r - 5 - pose.brow * 3
        g.moveTo(ex - inner * face.r, by + Math.min(0, pose.brow) * 2)
        g.lineTo(ex + inner * face.r, by - Math.min(0, pose.brow) * 5)
      })
      mouth(g, face.mouth[0], face.mouth[1], face.wide, pose.mouth, pose.open)
    })
    // The owl shuts its eyes with two small bows.
    const owlY = OWL_AT.y + 32 + show.owl.duck * 64 - 34
    const owlSeen = owl && show.owl.duck < 0.25
    if (owlSeen && show.owl.shut) for (const dx of [-13, 13]) {
      g.moveTo(OWL_AT.x + dx - 8, owlY - 1)
      g.quadraticCurveTo(OWL_AT.x + dx, owlY + 5, OWL_AT.x + dx + 8, owlY - 1)
    }
    if (whos.length > 0 || (owlSeen && show.owl.shut)) {
      g.strokeStyle = HUES.ink
      g.lineWidth = 2.4
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.stroke()
      this.draws += 1
    }

    g.beginPath()
    for (const who of whos) this.folk(who, show, () => {
      const pose = show.folk[who], face = FACE[who]
      const { shut, rx, ry } = eyeOf(who, pose)
      const pr = face.r * 0.46
      if (!shut) for (const [ex, ey] of face.eyes) {
        const px = ex + pose.gazeX * (rx - pr) * 0.9, py = ey + pose.gazeY * Math.max(0, ry - pr) * 0.9
        g.moveTo(px + pr, py)
        g.ellipse(px, py, pr, Math.min(pr, ry), 0, 0, Math.PI * 2)
      }
    })
    if (owlSeen && !show.owl.shut) for (const dx of [-13, 13]) {
      const px = OWL_AT.x + dx + show.owl.gazeX * 5, py = owlY + show.owl.gazeY * 5
      g.moveTo(px + 5, py)
      g.ellipse(px, py, 5, 5, 0, 0, Math.PI * 2)
    }
    if (whos.length > 0 || (owlSeen && !show.owl.shut)) {
      g.fillStyle = HUES.ink
      g.fill()
      this.draws += 1
    }
  }

  /** One found thing, as it lies, as it is carried or as one of the three wears it: its picture through the one transform that puts it there (lie.ts). */
  private thing(t: ShownThing, s: Sprites): void {
    const g = this.g
    const { sprite, m } = placement(t)
    if (t.extra === 'glow') {
      // A lamp's light, behind the acorn cap.
      g.save()
      g.globalAlpha = 0.9
      g.translate(t.x, t.y - 18)
      this.stamp(s.glow)
      g.restore()
    }
    g.save()
    g.transform(m[0], m[1], m[2], m[3], m[4], m[5])
    // A twig is drawn as the one it is, whole or snapped: no two of them are alike.
    this.stamp(sprite === 'twig' ? s.twigs[(NTH_OF_KIND[t.id] ?? 0) % s.twigs.length] : sprite === 'stump' ? s.stumps[(NTH_OF_KIND[t.id] ?? 0) % s.stumps.length] : s[sprite])
    if (t.extra === 'water' && sprite === 'capUp') {
      // The dew wells up from the middle of the cup to its rim, and stands a little proud of it as it arrives.
      const full = t.well >= 1 ? 1 : 0.25 + 0.75 * t.well + 0.12 * Math.sin(Math.PI * t.well)
      if (full !== 1) {
        g.translate(0, -29 + (1 - t.well) * 4)
        g.scale(full, full)
        g.translate(0, 29)
      }
      this.stamp(s.water)
    }
    g.restore()
  }
}

/** A mouth as pencil lines on the path being built. */
function mouth(g: Pen, x: number, y: number, w: number, kind: Mouth, open: number): void {
  switch (kind) {
    case 'smile':
      g.moveTo(x - w, y)
      g.quadraticCurveTo(x, y + w * (0.8 + open * 0.6), x + w, y)
      break
    case 'grin':
      g.moveTo(x - w * 1.2, y - 2)
      g.quadraticCurveTo(x, y + w * (1.4 + open), x + w * 1.2, y - 2)
      g.lineTo(x - w * 1.2, y - 2)
      break
    case 'o':
      g.moveTo(x + w * 0.45, y + 3)
      g.ellipse(x, y + 3, w * 0.45, w * (0.35 + open * 0.5), 0, 0, Math.PI * 2)
      break
    case 'flat':
      // Pressed shut and a little crooked: never a level bar.
      g.moveTo(x - w * 0.8, y + 4)
      g.quadraticCurveTo(x - w * 0.1, y, x + w * 0.8, y + 1 + open * 2)
      break
    case 'yawn':
      g.moveTo(x + w * 0.7, y + 4)
      g.ellipse(x, y + 4, w * 0.7, w * (0.25 + open), 0, 0, Math.PI * 2)
      break
    case 'pout':
      g.moveTo(x - w * 0.8, y + 5)
      g.quadraticCurveTo(x, y - w * 0.5, x + w * 0.8, y + 5)
      break
  }
}
