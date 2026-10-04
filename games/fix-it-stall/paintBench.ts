import { ODD_KINDS, type PartKind } from './circuit'
import { disc, INK, lifted, roundRect, stream, type Ctx } from './paint'
import { paintOdd } from './paintBoard'
import { paintLead } from './paintLive'

// The stall around the board, seen from the mender's seat: the lane and the
// counter along the top, the grey mat, the gadget's case and lid, the tray of
// parts, the bench odds and the test lamp. Painted once into the still layer.
// All sizes are in the scene's own units, 1180 by 820.

export const SCENE = { w: 1180, h: 820, counterTop: 140, counterBottom: 174 } as const

/** The sunlit lane beyond the counter. `bleed` paints past the scene so a wider surface has no bare edge. */
export function paintLane(c: Ctx, bleed: number): void {
  const random = stream(7)
  c.fillStyle = INK.lane
  c.fillRect(-bleed, -bleed, SCENE.w + 2 * bleed, SCENE.counterTop + bleed)
  // Flat cobbles, each a slightly darker patch.
  c.fillStyle = INK.laneStone
  for (let i = 0; i < 46; i++) {
    roundRect(c, -bleed + random() * (SCENE.w + 2 * bleed), random() * (SCENE.counterTop - 24), 44 + random() * 40, 18 + random() * 12, 9)
    c.fill()
  }
}

/** The grey mat and, along its far side, the counter. Painted over whoever stands in the lane, so the counter hides their lower half. */
export function paintMat(c: Ctx, bleed: number): void {
  const random = stream(11)
  c.fillStyle = INK.mat
  c.fillRect(-bleed, SCENE.counterBottom, SCENE.w + 2 * bleed, SCENE.h - SCENE.counterBottom + bleed)
  c.fillStyle = INK.matSpeck
  for (let i = 0; i < 520; i++) c.fillRect(-bleed + random() * (SCENE.w + 2 * bleed), SCENE.counterBottom + random() * (SCENE.h - SCENE.counterBottom + bleed), 2, 2)
  // The mat's stitched border.
  c.strokeStyle = INK.matEdge
  c.lineWidth = 2
  c.setLineDash([10, 7])
  roundRect(c, 18, SCENE.counterBottom + 16, SCENE.w - 36, SCENE.h - SCENE.counterBottom - 34, 18)
  c.stroke()
  c.setLineDash([])
  // The counter: a pale strip with a metal edge and a row of screws, casting a little shade on the mat.
  lifted(c, 7, () => {
    c.fillStyle = INK.counter
    c.fillRect(-bleed, SCENE.counterTop, SCENE.w + 2 * bleed, SCENE.counterBottom - SCENE.counterTop)
  })
  c.fillStyle = INK.counterEdge
  c.fillRect(-bleed, SCENE.counterBottom - 6, SCENE.w + 2 * bleed, 6)
  c.fillStyle = 'rgba(255, 255, 255, 0.6)'
  c.fillRect(-bleed, SCENE.counterTop, SCENE.w + 2 * bleed, 3)
  for (let x = 60; x < SCENE.w; x += 212) {
    disc(c, x, SCENE.counterTop + 15, 5, INK.steelDark)
    disc(c, x, SCENE.counterTop + 15, 3.4, INK.steel)
  }
}

/** The gadget's case under the board, and its lid standing open at the left, seen nearly edge-on. */
export function paintCase(c: Ctx, x: number, y: number, w: number, h: number, body: string = INK.case, dark: string = INK.caseDark): void {
  lifted(c, 9, () => {
    roundRect(c, x, y, w, h, 26)
    c.fillStyle = body
    c.fill()
  })
  roundRect(c, x + 12, y + 12, w - 24, h - 24, 18)
  c.fillStyle = dark
  c.fill()
  // The lid: its inside face, ribbed, with the lantern's round window in it.
  const lw = 128
  lifted(c, 12, () => {
    roundRect(c, x - lw - 8, y + 6, lw, h - 12, 20)
    c.fillStyle = body
    c.fill()
  })
  c.strokeStyle = dark
  c.lineWidth = 3
  for (let i = 1; i < 6; i++) {
    c.beginPath()
    c.moveTo(x - lw + 8, y + 6 + ((h - 12) * i) / 6)
    c.lineTo(x - 24, y + 6 + ((h - 12) * i) / 6)
    c.stroke()
  }
  // The window in the lid: a pane with square shoulders and a glint across it, so that it reads as glass and as nothing else.
  roundRect(c, x - lw / 2 - 34, y + h / 2 - 58, 52, 116, 12)
  c.fillStyle = 'rgba(214, 236, 244, 0.85)'
  c.fill()
  // Two soft spots of daylight on it, one larger than the other.
  disc(c, x - lw / 2 - 16, y + h / 2 - 34, 9, 'rgba(255, 255, 255, 0.55)')
  disc(c, x - lw / 2 - 2, y + h / 2 - 44, 5, 'rgba(255, 255, 255, 0.45)')
  // Two hinge straps.
  c.fillStyle = INK.steelDark
  for (const hy of [y + 54, y + h - 78]) c.fillRect(x - 12, hy, 24, 24)
}

const TRAY: readonly Exclude<PartKind, 'odd'>[] = ['cell', 'lamp', 'motor', 'buzzer', 'switch']

/** The tray of parts: a clear organiser, two wide and three deep, with the coil of leads in its last place. */
export function paintTray(c: Ctx, x: number, y: number): void {
  const cw = 118, ch = 122, gap = 8
  lifted(c, 8, () => {
    roundRect(c, x, y, 2 * cw + 3 * gap, 3 * ch + 4 * gap, 14)
    c.fillStyle = INK.trayEdge
    c.fill()
  })
  for (let i = 0; i < 6; i++) {
    const cx = x + gap + (i % 2) * (cw + gap), cy = y + gap + Math.floor(i / 2) * (ch + gap)
    roundRect(c, cx, cy, cw, ch, 9)
    c.fillStyle = INK.tray
    c.fill()
    paintTrayPlace(c, i, cx, cy, 0)
  }
}

/** Where the three of each kind lie in their place of the tray, about its top left corner: scattered the same on every load. */
const TRAY_LAY = (() => {
  const random = stream(23)
  return TRAY.map(() => [0, 1, 2].map((n) => ({ x: 30 + random() * (118 - 60), y: 26 + n * 34 + random() * 8, turn: (random() - 0.5) * 1.1 })))
})()

/**
 * What lies in one place of the tray, the place's top left corner at `x`, `y`: three of a kind, or in the last place
 * the coil of leads. `jolt` is 0 at rest; flicked, they swell where they lie and settle, drawn over themselves.
 */
export function paintTrayPlace(c: Ctx, i: number, x: number, y: number, jolt: number): void {
  const kind = TRAY[i], swell = 1 + Math.abs(jolt) * 0.3
  if (!kind) {
    c.save()
    c.translate(x + 118 / 2, y + 122 / 2)
    c.scale(swell, swell)
    coil(c, 0, 0)
    c.restore()
    return
  }
  TRAY_LAY[i].forEach((lay, n) => {
    c.save()
    c.translate(x + lay.x, y + lay.y)
    c.rotate(lay.turn + jolt * 0.2 * (n - 1))
    c.scale(swell, swell)
    trayPiece(c, kind)
    c.restore()
  })
}

/** One part as it lies in the tray, drawn small about its own middle. */
export function trayPiece(c: Ctx, kind: Exclude<PartKind, 'odd'>): void {
  switch (kind) {
    case 'cell':
      roundRect(c, -27, -12, 54, 24, 5)
      c.fillStyle = INK.cellBody
      c.fill()
      c.fillStyle = INK.cellBand
      c.fillRect(8, -12, 12, 24)
      c.fillStyle = INK.steel
      c.fillRect(27, -5, 5, 10)
      return
    case 'lamp':
      disc(c, 0, 0, 16, INK.steel)
      disc(c, 0, 0, 12, INK.glass)
      disc(c, -4, -5, 3, INK.white)
      return
    case 'motor':
      roundRect(c, -20, -14, 40, 28, 7)
      c.fillStyle = INK.steel
      c.fill()
      c.fillStyle = INK.motorCap
      c.fillRect(-20, -10, 7, 20)
      return
    case 'buzzer':
      disc(c, 0, 0, 15, INK.black)
      disc(c, 0, 0, 3.5, INK.plastic)
      return
    case 'switch':
      roundRect(c, -24, -10, 48, 20, 5)
      c.fillStyle = INK.plastic
      c.fill()
      disc(c, 16, -9, 6, INK.red)
  }
}

/** A coil of leads seen from above: four loops of insulated wire, each a different colour. */
export function coil(c: Ctx, x: number, y: number): void {
  const colours = [INK.red, INK.yellow, INK.green, INK.blue]
  c.lineWidth = 6
  colours.forEach((colour, i) => {
    c.strokeStyle = colour
    c.beginPath()
    c.ellipse(x + (i - 1.5) * 5, y + (i % 2 ? 4 : -4), 40 - i * 4, 34 - i * 5, i * 0.5, 0, Math.PI * 2)
    c.stroke()
  })
  // Two clips stick out of it, so that it is a coil of leads and nothing else: steel jaws on a coloured boot.
  for (const [cx, cy, turn, colour] of [[x + 34, y + 30, 0.7, INK.red], [x - 36, y + 26, 2.3, INK.blue]] as const) {
    c.save()
    c.translate(cx, cy)
    c.rotate(turn)
    c.fillStyle = colour
    c.fillRect(-4, -4, 12, 8)
    c.fillStyle = INK.steel
    c.beginPath()
    c.moveTo(8, -5)
    c.lineTo(22, -1.5)
    c.lineTo(22, 1.5)
    c.lineTo(8, 5)
    c.closePath()
    c.fill()
    c.restore()
  }
}

/** The bench odds, lying loose in a row along the bottom of the mat. */
export function paintOdds(c: Ctx, x: number, y: number): void {
  const random = stream(41)
  ODD_KINDS.forEach((what, i) => {
    const px = x + i * 66, py = y + (i % 2 ? 22 : -12), turn = -0.9 + (random() - 0.5) * 0.7
    lifted(c, 4, () => {
      c.save()
      c.translate(px, py)
      c.rotate(turn)
      paintOdd(c, 62, what, what === 'foil' ? 62 : what === 'rubber' ? 60 : 108)
      c.restore()
    })
  })
}

/** The test lamp: a lamp with a lead on each leg, lying on the mat with both clips free. */
export function paintTestLamp(c: Ctx, x: number, y: number): void {
  paintLead(c, { x: x - 118, y: y + 30 }, { x: x - 12, y }, 30, INK.black, 62)
  paintLead(c, { x: x + 112, y: y - 34 }, { x: x + 12, y }, 34, INK.black, 62)
  lifted(c, 5, () => disc(c, x, y, 21, INK.steelDark))
  disc(c, x, y, 18, INK.steel)
  disc(c, x, y, 13.5, INK.glass)
  disc(c, x - 5, y - 6, 3.2, INK.white)
}
