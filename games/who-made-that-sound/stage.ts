// Where everything stands. The page is designed at 1180 by 820 and scaled as
// one piece to fit whatever surface the shell gives, so every number below is
// in design pixels and nothing else in the game holds a position.
//
// For a two-year-old (pack: game-design, ages-2-to-4.md): everything that can
// be tapped is about 100 across or more, stands well apart from its
// neighbours, and keeps out of the bottom strip where wrists rest.
// stage.test.ts holds all three.

export type Rect = { x: number; y: number; w: number; h: number }

export const STAGE = { width: 1180, height: 820 } as const

/** The share of the page, from the bottom, that holds nothing a child needs. */
export const WRIST_STRIP = 0.12
/** Nothing that can be tapped reaches below this. */
export const WRIST_LINE = STAGE.height * (1 - WRIST_STRIP)
/** The least a thing that can be tapped measures, either way. */
export const TARGET = 100
/** The least clear page between two things that can be tapped. */
export const APART = 24

/** How the design sits on a surface: one scale, centred. */
export type Fit = { scale: number; x: number; y: number }

export function fit(width: number, height: number): Fit {
  const scale = Math.min(width / STAGE.width, height / STAGE.height)
  return { scale, x: (width - STAGE.width * scale) / 2, y: (height - STAGE.height * scale) / 2 }
}

/** The part of the page a surface shows, in design pixels: the whole design, and more page at two sides when the surface has another shape. */
export function inView(width: number, height: number): Rect {
  const { scale, x, y } = fit(width, height)
  return { x: -x / scale, y: -y / scale, w: width / scale, h: height / scale }
}

// --- The ground: the plain strip the hides stand on ------------------------

/** The strip runs off both sides of the page, so only its top and bottom are here. */
export const GROUND = { top: 438, bottom: 704 } as const
/** Where a thing on the ground has its feet. */
export const FLOOR = 650

// --- The hill at the back ----------------------------------------------------

/** The hill's skyline, left to right. Its foot is tucked under the ground strip. */
export const SKYLINE: readonly (readonly [number, number])[] = [
  [60, 500], [104, 362], [186, 268], [318, 184], [456, 132], [588, 114], [722, 126], [862, 176], [994, 262], [1076, 358], [1120, 500],
]

/** A second, paler sheet lies behind the hill, a little to the left and higher: this far from the hill's own. */
export const HILL_BEHIND = { dx: -52, dy: -30 } as const

/** How high the hill stands at `x`: the y of its skyline there, and the ground's top beside the hill. */
export function hillTop(x: number): number {
  for (let i = 1; i < SKYLINE.length; i++) {
    const [ax, ay] = SKYLINE[i - 1], [bx, by] = SKYLINE[i]
    if (x >= ax && x <= bx) return ay + ((by - ay) * (x - ax)) / (bx - ax)
  }
  return GROUND.top
}

/**
 * What a finger that lands on nothing to tap has landed on: the face of the hill, the calling stone when it is
 * there, or the bare page and the ground. Each answers in its own way, where the finger is.
 */
export function bareAt(x: number, y: number, stone: boolean): 'hill' | 'stone' | 'page' {
  if (stone && x >= STONE.x && x <= STONE.x + STONE.w && y >= STONE.y && y <= STONE.y + STONE.h) return 'stone'
  // The paler sheet behind the hill is hill as well.
  const top = Math.min(hillTop(x), hillTop(x - HILL_BEHIND.dx) + HILL_BEHIND.dy)
  return y >= top && y < GROUND.top ? 'hill' : 'page'
}

/** At most this many stand on the hill. */
export const HILL_ROOM = 4

const spot = (centre: number, feet: number, w: number, h: number): Rect => ({ x: centre - w / 2, y: feet - h, w, h })

/** The places on the hill, left to right. Each has its feet at the bottom of its rectangle, on the face of the hill. */
export const HILL_SPOTS: readonly Rect[] = [spot(272, 396, 176, 196), spot(482, 376, 176, 196), spot(692, 376, 176, 196), spot(902, 396, 176, 196)]

// --- The row and what stands beside it ------------------------------------

/** One hide: every egg is this size, whoever is inside. */
export const EGG = { w: 112, h: 148 } as const

/** From the middle of one hide to the middle of the next, when the row has room. */
export const EGG_STEP = 168

/** The row holds two to four hides. */
export const ROW = { left: 345, right: 865 } as const

/** The hides of a row of `count`, left to right, spread evenly about the middle of the row: as far apart as the row allows, and no further than `EGG_STEP`. */
export function eggSpots(count: number): Rect[] {
  const span = ROW.right - ROW.left - EGG.w, step = count > 1 ? Math.min(EGG_STEP, span / (count - 1)) : 0
  const first = (ROW.left + ROW.right) / 2 - (step * (count - 1)) / 2
  return Array.from({ length: count }, (_, i) => spot(first + step * i, FLOOR, EGG.w, EGG.h))
}

/** The flat stone left of the row, where the one who asks stands. */
export const STONE: Rect = { x: 26, y: 622, w: 288, h: 74 }
/** The one who asks, standing on the stone: room for the widest kind with both wings held out. */
export const ASKER: Rect = spot(168, 640, 256, 210)

/** The basket right of the row, with the egg that stands in it. */
export const BASKET: Rect = spot(964, FLOOR + 6, 150, 182)

/**
 * The one who waits, at the right edge of what the surface shows, half in the
 * page. The rectangle is the part of it that is on the page: its body's
 * middle is `EDGE_PEEK` from the page's edge.
 */
export const EDGE_PEEK = 34
export function edgeSpot(view: Rect): Rect {
  const right = view.x + view.w
  return { x: right - TARGET - 4, y: FLOOR - 190, w: TARGET + 4, h: 190 }
}

/** The next clutch in its nest, with whoever brings it, waiting at the right edge of what the surface shows: a target of its own, clear of the basket. */
export function clutchSpot(view: Rect, roomy = false): Rect {
  const right = view.x + view.w
  // Where there is room, with no basket beside it and nobody on the hill above, the grown one who brings the first
  // clutch stands well into the page, on the right of the middle, and bigger: it is the one thing that wants something.
  if (roomy) return { x: right - ROOMY_IN - 130, y: FLOOR - 226, w: 260, h: 232 }
  return { x: right - 117, y: FLOOR - 190, w: 117, h: 196 }
}
/** How far in from the right edge the one who brings a clutch stands where there is room for it. */
export const ROOMY_IN = 300

/** The nest of new eggs that waits by the right edge of what the surface shows, whole on the page. */
export function nestSpot(view: Rect): Rect {
  return spot(view.x + view.w - 92, FLOOR + 6, 150, 182)
}

/** Whether a point of the page is inside a rectangle grown by `slack` on every side: a small finger lands near things, not on them. */
export function inside(rect: Rect, x: number, y: number, slack = 0): boolean {
  return x >= rect.x - slack && x <= rect.x + rect.w + slack && y >= rect.y - slack && y <= rect.y + rect.h + slack
}

/** A point of the surface, in CSS pixels, as a point of the design. */
export function toStage(width: number, height: number, x: number, y: number): { x: number; y: number } {
  const { scale, x: left, y: top } = fit(width, height)
  return { x: (x - left) / scale, y: (y - top) / scale }
}

/** Everything that can be tapped while a row of `count` is out, by name. */
export function targets(count: number, view: Rect): { name: string; rect: Rect }[] {
  return [
    { name: 'asker', rect: ASKER },
    ...eggSpots(count).map((rect, i) => ({ name: `egg ${i}`, rect })),
    { name: 'basket', rect: BASKET },
    { name: 'edge', rect: edgeSpot(view) },
    ...HILL_SPOTS.map((rect, i) => ({ name: `hill ${i}`, rect })),
  ]
}

/** The clear page between two rectangles: 0 or less when they touch or overlap. */
export function gap(a: Rect, b: Rect): number {
  const across = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)), down = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h))
  return across > 0 && down > 0 ? Math.hypot(across, down) : Math.max(across, down)
}

/** A place of the designed order from the address (`place=<id>`), for a grown-up who wants to see one: only read together with a seed, and never saved as anything but an ordinary place. */
export function placeFrom(search: string): string | null {
  return new URLSearchParams(search).get('place')
}

/** A fixed seed from the address (`seed=<n>`), for stills that have to come out the same every time; null without one. */
export function seedFrom(search: string): number | null {
  const given = new URLSearchParams(search).get('seed')
  if (given === null || !/^\d{1,10}$/.test(given)) return null
  return Number(given) >>> 0
}
