import { cloud, darken, form, lighten, mix, rgba, roundRect, rub, slab, soft, PAPER, type G, type RGB, type Rng } from './pastel'
import { BED, DOOR, FLOOR, HOMES, LAMP, NIGHT_LIGHT, TEDDY, TUB, WINDOW } from './room'
import { STAGE } from './stage'

// The room, painted once: everything that stands still. A bathroom corner on the left, the bedroom on the right,
// one wall and one floor between them, filled from edge to edge and kept lower in contrast than what a finger
// can work with. The paper is dark; the room is the pastel rubbed onto it.

const WALL_A: RGB = [44, 54, 118], WALL_B: RGB = [66, 56, 132], BOARD: RGB = [52, 44, 104]
const TILE: RGB = [86, 112, 176], ENAMEL: RGB = [206, 214, 248], WATER: RGB = [104, 170, 226]
const WOOD: RGB = [112, 76, 132], SHEET: RGB = [150, 172, 232], PILLOW: RGB = [236, 226, 228]
const DOOR_C: RGB = [50, 96, 132], BRASS: RGB = [214, 168, 96], ROSE: RGB = [186, 100, 134]
export const SKY_TOP: RGB = [62, 58, 136], SKY_LOW: RGB = [244, 164, 132]

/** The dusk outside, as the window and the door's glass both show it: violet down to peach, a hill and a moon. */
function dusk(g: G, rng: Rng, x: number, y: number, w: number, h: number, moon: boolean): void {
  g.save()
  g.beginPath()
  roundRect(g, x, y, w, h, 10)
  g.clip()
  const sky = g.createLinearGradient(0, y, 0, y + h)
  sky.addColorStop(0, rgba(SKY_TOP)); sky.addColorStop(0.62, rgba(mix(SKY_TOP, SKY_LOW, 0.6))); sky.addColorStop(1, rgba(SKY_LOW))
  g.fillStyle = sky
  g.fillRect(x, y, w, h)
  for (let n = 0; n < 5; n++) cloud(g, x + rng.next() * w, y + h * (0.35 + rng.next() * 0.3), 40 + rng.next() * 40, 10 + rng.next() * 8, lighten(SKY_LOW, 0.3), 0.35, 0.2)
  if (moon) { cloud(g, x + w * 0.7, y + h * 0.24, 34, 34, [255, 244, 214], 0.35, 0.2); cloud(g, x + w * 0.7, y + h * 0.24, 15, 15, [255, 246, 222], 1, 0.82) }
  for (let n = 0; n < 4; n++) cloud(g, x + w * (0.12 + 0.2 * n + rng.next() * 0.08), y + h * (0.1 + rng.next() * 0.2), 3.2, 3.2, [255, 250, 230], 0.9, 0.5)
  // The garden hill, a tree on it, and the long grass in front.
  cloud(g, x + w * 0.3, y + h * 1.12, w * 0.8, h * 0.36, [40, 74, 110], 1, 0.8)
  cloud(g, x + w * 0.95, y + h * 1.1, w * 0.6, h * 0.3, [34, 62, 100], 1, 0.8)
  cloud(g, x + w * 0.2, y + h * 0.7, 22, 30, [36, 70, 104], 1, 0.6)
  g.restore()
}

export function paintBackdrop(g: G, rng: Rng, marginX: number, marginY: number): void {
  const W = STAGE.width, H = STAGE.height, left = -marginX, top = -marginY, width = W + marginX * 2, height = H + marginY * 2
  g.fillStyle = rgba(PAPER)
  g.fillRect(left, top, width, height)

  // The wall: two wide clouds of indigo and violet, lighter where the lamp is, and a wallpaper of rubbed blotches.
  slab(g, left - 40, top - 40, width + 80, FLOOR - top + 40, 0, WALL_A, 0.82, 0)
  cloud(g, 300, 250, 620, 420, WALL_A, 0.7, 0.2)
  cloud(g, 930, 300, 640, 460, WALL_B, 0.85, 0.2)
  cloud(g, LAMP.x - 40, LAMP.y + 20, 420, 380, [120, 92, 150], 0.5, 0.1)
  for (let row = 0; row * 78 + 40 < FLOOR - 60; row++) {
    for (let col = -1; col * 92 < width; col++) {
      const x = left + col * 92 + (row % 2) * 46 + 20, y = 40 + row * 78
      // Rubbed blotches of uneven size, shoved off their rows.
      const r = 8 + rng.next() * 9
      cloud(g, x + (rng.next() - 0.5) * 40, y + (rng.next() - 0.5) * 34, r, r * (0.7 + rng.next() * 0.5), [150, 156, 226], 0.2, 0.35, rng.next() * 3)
      if (rng.next() < 0.6) cloud(g, x + 22 + (rng.next() - 0.5) * 30, y + 30 + (rng.next() - 0.5) * 20, 3 + rng.next() * 4, 3 + rng.next() * 3, [236, 170, 190], 0.2, 0.4)
    }
  }
  // Tiles behind the bath.
  // Laid like bricks, each row shoved along by its own amount, in tiles of uneven width and tone: a wall, never a checker to count.
  for (let row = 0; row < 5; row++) {
    for (let x = -marginX - rng.next() * 30; x < 372;) {
      const w = 30 + rng.next() * 34
      slab(g, x, 356 + row * 42, Math.min(w, 376 - x), 36, 7, rng.next() < 0.5 ? TILE : rng.next() < 0.5 ? lighten(TILE, 0.16) : darken(TILE, 0.14), 0.36, 3)
      x += w + 6
    }
  }

  // The floor: boards as long bands of two tones, warmer toward the bed.
  slab(g, left - 40, FLOOR, width + 80, H + marginY - FLOOR + 40, 0, BOARD, 0.95, 0)
  for (let n = 0; n < 7; n++) {
    const y = FLOOR + 8 + n * 40
    cloud(g, W * 0.5, y + 18, width * 0.7, 15, n % 2 ? lighten(BOARD, 0.14) : darken(BOARD, 0.3), 0.55, 0.75)
  }
  cloud(g, 1000, 740, 420, 150, [120, 80, 130], 0.4, 0.1)
  slab(g, left - 20, FLOOR - 13, width + 40, 13, 3, [104, 94, 170], 0.8, 3)

  // The rug Teddy sits on, and the shade under him.
  cloud(g, TEDDY.x, TEDDY.y - 20, 352, 88, ROSE, 1, 0.86)
  // Its cream is three worn patches, not a band all the way round: a rug, never a ring.
  cloud(g, TEDDY.x - 176, TEDDY.y - 34, 96, 30, [236, 204, 176], 0.7, 0.5)
  cloud(g, TEDDY.x + 190, TEDDY.y - 10, 84, 26, [236, 204, 176], 0.7, 0.5)
  cloud(g, TEDDY.x - 30, TEDDY.y + 26, 130, 18, [236, 204, 176], 0.6, 0.5)
  cloud(g, TEDDY.x, TEDDY.y - 20, 196, 42, [138, 84, 140], 0.9, 0.86)
  rub(g, rng, TEDDY.x, TEDDY.y - 20, 340, 80, lighten(ROSE, 0.5), 26, 0.16, 0.5)
  cloud(g, TEDDY.x, TEDDY.y + 2, 250, 40, [44, 30, 78], 0.7, 0.3)

  garlands(g, rng)
  shelf(g, rng)
  door(g, rng)
  windowFrame(g, rng)
  picture(g, rng)
  bath(g, rng)
  bed(g, rng)
  oddments(g, rng)
}

/** Paper lanterns on two strings along the top of the wall, one each side of the home control. */
function garlands(g: G, rng: Rng): void {
  const colours: RGB[] = [[240, 150, 160], [250, 214, 130], [140, 206, 196], [170, 160, 236]]
  for (const [x0, x1, sag] of [[-30, 536, 46], [652, 1210, 38]] as const) {
    g.save()
    g.strokeStyle = rgba([200, 190, 230], 0.5); g.lineWidth = 2.5
    g.beginPath(); g.moveTo(x0, 22); g.quadraticCurveTo((x0 + x1) / 2, 22 + sag * 2, x1, 22); g.stroke()
    g.restore()
    // Lanterns of uneven sizes at uneven gaps, so the string reads as a string and never as a row to count.
    let t = 0.04 + rng.next() * 0.05, n = 0
    while (t < 0.97) {
      const x = x0 + (x1 - x0) * t, y = 22 + sag * 2 * 2 * t * (1 - t) + 17, size = 0.7 + rng.next() * 0.75
      form(g, rng, x, y, 14 * size, 18 * size, colours[(n + (rng.next() < 0.3 ? 1 : 0)) % colours.length], (rng.next() - 0.5) * 0.3, 0.78)
      t += 0.08 + rng.next() * 0.1
      n += 1
    }
  }
}

/** A shelf of toys over the towel: stacking rings, a rabbit, a drum. Lower in contrast than the things below it. */
function shelf(g: G, rng: Rng): void {
  slab(g, 208, 172, 150, 12, 5, [150, 110, 160], 0.95, 3)
  // A cloth ball, in patches.
  form(g, rng, 240, 150, 24, 23, [220, 120, 140], 0, 0.82)
  g.save(); g.globalCompositeOperation = 'source-atop'; cloud(g, 232, 142, 14, 22, [236, 200, 120], 0.9, 0.7, 0.6); cloud(g, 254, 160, 12, 16, [130, 196, 186], 0.9, 0.7, -0.4); g.restore()
  form(g, rng, 296, 146, 20, 26, [176, 164, 226], 0, 0.82)
  form(g, rng, 288, 106, 7, 20, [176, 164, 226], -0.2, 0.8); form(g, rng, 304, 106, 7, 20, [176, 164, 226], 0.2, 0.8)
  cloud(g, 290, 142, 2.6, 2.6, [50, 40, 80], 0.9, 0.6); cloud(g, 302, 142, 2.6, 2.6, [50, 40, 80], 0.9, 0.6)
  slab(g, 326, 144, 28, 28, 6, [226, 130, 120], 0.9, 3)
}

function door(g: G, rng: Rng): void {
  const d = DOOR, w = d.right - d.left, h = d.bottom - d.top
  slab(g, d.left - 12, d.top - 12, w + 24, h + 12, 12, [98, 110, 176], 0.9, 5)
  slab(g, d.left, d.top, w, h, 8, DOOR_C, 1, 4)
  dusk(g, rng, d.glass.left, d.glass.top, d.glass.right - d.glass.left, d.glass.bottom - d.glass.top, true)
  slab(g, d.left + 20, d.glass.bottom + 34, w - 40, 150, 10, darken(DOOR_C, 0.3), 0.8, 4)
  rub(g, rng, d.left + w / 2, d.top + h / 2, w / 2, h / 2, lighten(DOOR_C, 0.5), 14, 0.14, 0.5)
  cloud(g, d.right - 20, d.glass.bottom + 22, 10, 10, BRASS, 1, 0.75)
}

function windowFrame(g: G, rng: Rng): void {
  const v = WINDOW, w = v.right - v.left, h = v.bottom - v.top
  slab(g, v.left - 14, v.top - 14, w + 28, h + 34, 12, [198, 190, 232], 0.95, 5)
  dusk(g, rng, v.left, v.top, w, h, false)
  slab(g, v.left + w / 2 - 4, v.top, 8, h, 2, [198, 190, 232], 0.95, 2)
  slab(g, v.left - 26, v.bottom + 12, w + 52, 14, 6, [214, 206, 240], 1, 4)
  // The curtain's rail.
  slab(g, v.left - 34, v.top - 30, w + 68, 10, 5, BRASS, 1, 3)
}

/** A picture over his head: a little boat on a pond. It hangs clear of the home control. */
function picture(g: G, rng: Rng): void {
  slab(g, 540, 96, 108, 84, 8, [214, 176, 120], 0.9, 4)
  slab(g, 550, 106, 88, 64, 4, [90, 130, 190], 1, 2)
  cloud(g, 594, 168, 60, 18, [70, 104, 170], 1, 0.7)
  soft(g, [246, 236, 220], 1, 2, (p) => { p.moveTo(596, 116); p.lineTo(620, 150); p.lineTo(596, 150); p.closePath() })
  slab(g, 574, 150, 50, 9, 4, [226, 120, 110], 1, 2)
  rub(g, rng, 594, 138, 44, 32, [255, 255, 255], 5, 0.12)
}

function bath(g: G, rng: Rng): void {
  const t = TUB, cx = (t.left + t.right) / 2, rx = (t.right - t.left) / 2 - 8
  // The towel's rail, and the jug's shelf.
  slab(g, 36, 204, 156, 10, 5, BRASS, 0.95, 3)
  cloud(g, 38, 209, 9, 9, lighten(BRASS, 0.3), 1, 0.7); cloud(g, 190, 209, 9, 9, lighten(BRASS, 0.3), 1, 0.7)
  slab(g, HOMES.jug.x - 74, HOMES.jug.y + 62, 148, 13, 5, [150, 110, 160], 1, 3)
  slab(g, HOMES.jug.x - 50, HOMES.jug.y + 75, 12, 30, 4, [116, 84, 134], 0.9, 3); slab(g, HOMES.jug.x + 38, HOMES.jug.y + 75, 12, 30, 4, [116, 84, 134], 0.9, 3)
  // The tap, bent over the bath from the wall, with a round handle on top.
  g.save()
  g.strokeStyle = rgba(BRASS); g.lineWidth = 17; g.lineCap = 'round'
  g.shadowColor = rgba(BRASS); g.shadowBlur = 3 * g.getTransform().a
  g.beginPath(); g.moveTo(26, 500); g.lineTo(26, 446); g.quadraticCurveTo(26, 418, 54, 418); g.quadraticCurveTo(76, 418, 74, 444); g.stroke()
  g.restore()
  cloud(g, 26, 404, 20, 11, lighten(BRASS, 0.35), 1, 0.75)
  cloud(g, 34, 440, 5, 22, lighten(BRASS, 0.7), 0.6, 0.3)
  // The bath: a deep enamel tub on two feet, with its water.
  cloud(g, cx, t.bottom + 6, rx + 20, 26, [36, 30, 80], 0.7, 0.4)
  cloud(g, t.left + 60, t.bottom - 6, 26, 20, BRASS, 1, 0.7); cloud(g, t.right - 60, t.bottom - 6, 26, 20, BRASS, 1, 0.7)
  slab(g, t.left, t.rim - 14, t.right - t.left, t.bottom - t.rim, 84, ENAMEL, 1, 6)
  g.save()
  g.globalCompositeOperation = 'source-atop'
  cloud(g, cx - 60, t.bottom - 30, rx, 110, [112, 124, 204], 0.62, 0.1)
  cloud(g, cx + 90, t.rim + 30, 120, 60, [255, 255, 255], 0.5, 0.1)
  g.restore()
  cloud(g, cx, t.rim, rx, 30, [70, 92, 160], 1, 0.9)
  cloud(g, cx, t.water, rx - 12, 22, WATER, 1, 0.88)
  cloud(g, cx + 50, t.water - 4, 70, 7, lighten(WATER, 0.6), 0.7, 0.3)
  rub(g, rng, cx, t.rim + 100, rx, 90, [255, 255, 255], 10, 0.14, 0.4)
  // The soap's dish on the rim.
  cloud(g, HOMES.soap.x, HOMES.soap.y + 40, 54, 13, [150, 160, 224], 1, 0.8)
  // A mat to step out onto.
  cloud(g, 196, 788, 150, 26, [120, 196, 176], 0.9, 0.82)
  rub(g, rng, 196, 788, 140, 22, [220, 250, 236], 9, 0.2, 0.6)
}

function bed(g: G, rng: Rng): void {
  const b = BED
  // The pyjamas' pegs.
  slab(g, HOMES.pyjamas.x - 64, HOMES.pyjamas.y - 82, 128, 12, 6, [150, 110, 160], 1, 3)
  cloud(g, HOMES.pyjamas.x - 40, HOMES.pyjamas.y - 74, 8, 8, BRASS, 1, 0.7); cloud(g, HOMES.pyjamas.x + 40, HOMES.pyjamas.y - 74, 8, 8, BRASS, 1, 0.7)
  // The lamp's pole, behind the bed.
  slab(g, LAMP.x - 5, LAMP.y + 40, 10, b.top - LAMP.y - 20, 4, BRASS, 0.95, 3)
  // The headboard at the wall, the frame, the mattress and the pillow.
  slab(g, 1108, 404, 120, 330, 46, WOOD, 1, 5)
  cloud(g, b.left + 220, b.bottom + 8, 250, 26, [36, 30, 80], 0.7, 0.4)
  slab(g, b.left + 8, b.top + 62, 420, 112, 26, WOOD, 1, 5)
  // The post at the foot of the bed: its leg, carried up past the mattress.
  slab(g, b.left + 2, b.top - 40, 22, b.bottom - b.top + 54, 9, darken(WOOD, 0.2), 1, 3)
  cloud(g, b.left + 13, b.top - 44, 15, 14, WOOD, 1, 0.8)
  slab(g, b.left, b.top, 440, 104, 44, SHEET, 1, 6)
  g.save()
  g.globalCompositeOperation = 'source-atop'
  cloud(g, b.left + 120, b.top + 96, 260, 50, [96, 110, 190], 0.6, 0.1)
  g.restore()
  form(g, rng, 1092, b.top - 8, 84, 40, PILLOW, -0.08, 0.84)
  rub(g, rng, b.left + 200, b.top + 50, 200, 46, [255, 255, 255], 12, 0.14, 0.5)
  rub(g, rng, 1150, 560, 50, 150, lighten(WOOD, 0.5), 8, 0.14, 0.4)
}

/** What lies about: a night-light that is not lit yet, slippers, a ball, blocks, a basket of wool. */
function oddments(g: G, rng: Rng): void {
  // The night-light on the wall behind the rug: a small shell on a plug, unlit until he sleeps.
  slab(g, NIGHT_LIGHT.x - 11, NIGHT_LIGHT.y + 6, 22, 26, 8, [170, 160, 210], 0.9, 3)
  cloud(g, NIGHT_LIGHT.x, NIGHT_LIGHT.y, 26, 20, [200, 150, 170], 0.95, 0.8)
  form(g, rng, 742, 786, 30, 15, [232, 132, 120], -0.2, 0.8); form(g, rng, 806, 794, 30, 15, [232, 132, 120], 0.14, 0.8)
  cloud(g, 754, 783, 12, 7, [80, 50, 90], 0.8, 0.6); cloud(g, 818, 791, 12, 7, [80, 50, 90], 0.8, 0.6)
  form(g, rng, 438, 780, 30, 30, [108, 196, 214], 0, 0.84)
  g.save(); g.globalCompositeOperation = 'source-atop'; cloud(g, 438, 780, 34, 9, [250, 226, 140], 0.9, 0.8, -0.4); g.restore()
  slab(g, 20, 770, 44, 40, 8, [240, 190, 110], 0.95, 3); slab(g, 60, 786, 40, 30, 8, [150, 190, 240], 0.95, 3); slab(g, 32, 742, 38, 30, 8, [236, 140, 150], 0.95, 3)
  slab(g, 1010, 764, 120, 60, 22, [196, 150, 110], 1, 4)
  form(g, rng, 1046, 762, 28, 24, [236, 140, 170], 0, 0.8); form(g, rng, 1092, 758, 26, 24, [140, 200, 190], 0, 0.8)
  rub(g, rng, 1070, 800, 56, 22, [250, 220, 180], 8, 0.2, 0.5)
}

/** The front lip of the bath, stamped over the duck so that it sits in the water and not on the enamel. */
export function paintTubLip(g: G, rng: Rng): void {
  const t = TUB, cx = (t.left + t.right) / 2, rx = (t.right - t.left) / 2 - 8
  g.save()
  g.beginPath()
  g.ellipse(cx, t.water, rx - 12, 22, 0, 0, Math.PI)
  g.lineTo(t.left + 30, t.water + 70)
  g.lineTo(t.right - 30, t.water + 70)
  g.closePath()
  g.clip()
  g.fillStyle = rgba(ENAMEL)
  g.fillRect(t.left, t.water - 10, t.right - t.left, 90)
  cloud(g, cx - 60, t.water + 80, rx, 60, [150, 160, 228], 0.5, 0.1)
  cloud(g, cx + 90, t.water + 20, 120, 40, [255, 255, 255], 0.5, 0.1)
  rub(g, rng, cx, t.water + 40, rx, 30, [255, 255, 255], 6, 0.14, 0.5)
  g.restore()
  g.save()
  g.beginPath()
  g.ellipse(cx, t.water, rx - 12, 22, 0, 0.12, Math.PI - 0.12)
  g.strokeStyle = rgba([250, 250, 255], 0.9)
  g.lineWidth = 3
  g.stroke()
  g.restore()
}
