// Where everything in the bakery goes. The picture is designed on a sheet of
// 1180 by 820 reference units; on any surface it is fitted and centred, and the
// wall above, the bench below and the wall to either side run on to fill the
// rest of the printed block. Pure numbers: no canvas is touched here.

export const REF_W = 1180
export const REF_H = 820
/** The unprinted edge of the sheet, in reference units. */
export const MARGIN = 22
/** The back edge of the bench: figures behind it stop here, tools stand in front of it. */
export const BENCH = 520

export type Box = { x: number; y: number; w: number; h: number }
/** The printed block in reference units: it reaches past the designed sheet when the surface is wider or taller. */
export type View = { x0: number; y0: number; x1: number; y1: number }

/** Each piece's box on the reference sheet: x, y, width, height. A sprite is printed at its box's size. */
export const SPOTS = {
  dough: [482, 562, 232, 176],
  peel: [396, 516, 660, 286],
  sack: [52, 476, 180, 252],
  jug: [234, 500, 146, 216],
  badger: [524, 200, 274, 334],
  goat: [146, 170, 300, 292],
  fire: [902, 314, 216, 208],
  loaf: [595, 100, 70, 56],
  sparrow: [56, 352, 52, 48],
  // Places the peel is carried to, and the opening the customers stand in.
  nook: [916, 172, 188, 108],
  sill: [400, 150, 174, 76],
  mouth: [905, 315, 210, 205],
  hatch: [56, 170, 316, 276],
} as const satisfies Record<string, readonly [number, number, number, number]>

export type Spot = keyof typeof SPOTS
/** How far apart the rack's four places and the sparrows on the fence sit, in reference units. */
export const RACK_STEP = 64
export const SPARROW_STEP = 45

export type Layout = {
  /** Logical pixels per reference unit, and where the reference sheet's corner lands. */
  scale: number
  ox: number
  oy: number
  view: View
  boxes: Record<Spot, Box>
  /** The four places on the rack, left to right. */
  rack: Box[]
  /** The sparrows waiting on the fence. */
  sparrows: Box[]
}

export function layout(width: number, height: number): Layout {
  const scale = Math.min(width / REF_W, height / REF_H)
  const ox = (width - REF_W * scale) / 2, oy = (height - REF_H * scale) / 2
  const place = ([x, y, w, h]: readonly [number, number, number, number], dx = 0, dy = 0): Box =>
    ({ x: ox + (x + dx) * scale, y: oy + (y + dy) * scale, w: w * scale, h: h * scale })
  const boxes = {} as Record<Spot, Box>
  for (const name of Object.keys(SPOTS) as Spot[]) boxes[name] = place(SPOTS[name])
  return {
    scale, ox, oy,
    view: { x0: MARGIN - ox / scale, y0: MARGIN - oy / scale, x1: REF_W - MARGIN + ox / scale, y1: REF_H - MARGIN + oy / scale },
    boxes,
    rack: [0, 1, 2, 3].map((i) => place(SPOTS.loaf, i * RACK_STEP)),
    // The fence is not level, and neither is a row of sparrows.
    sparrows: [0, 1, 2].map((i) => place(SPOTS.sparrow, i * SPARROW_STEP, [0, 3, -1][i])),
  }
}
