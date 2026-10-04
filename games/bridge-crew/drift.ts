import { INK, type Pen } from './look'
import { WATER } from './pose'
import { groundAt, px, type Plot } from './sheet'
import { COLS, type Site } from './sites'
import { FAINT, SKY, farBridge, hillHouse, mugAt, reaches, siteSeed } from './valley'

// What goes on at the edge of the sheet and has nothing to do with the job:
// clouds drift, smoke rises from a house on the hill, a train crosses the
// finished bridge far off, a fish leaps, a paper boat sails the gap, and the
// draughtsman's mug steams. Each is a pure
// function of the attended clock, so it stops when the game does, and each is
// drawn in the faint drafting line, under the parts: it is on the sheet, and
// the kit lies on top of it. A splash is the one thing here the child causes.

/** A vehicle or the trolley went into the water: where, how long ago in seconds, and how big (1 for a vehicle). */
export type Splash = { x: number; since: number; big: number }

/** How long the water takes to be itself again after a splash, in seconds: the boat is back up by then. */
export const CALM = 6

const frac = (t: number) => t - Math.floor(t)

/** Three clouds: each drifts across the sky at its own slow pace and comes round again. Their tops stay under the top right corner of the sheet, which is the grown-up's. */
export function clouds(at: Site, seconds: number): { x: number; y: number; wide: number }[] {
  const seed = siteSeed(at) % 53
  return [0, 1, 2].map((i) => {
    const wide = 2.2 + 0.7 * ((seed + i * 7) % 3), lane = COLS + 8
    return { x: frac((seconds * (0.07 + 0.025 * i) + seed * 0.37 + i * 9.3) / lane) * lane - 4, y: SKY.low + ((SKY.clouds - SKY.low) * ((seed + i * 5) % 7)) / 7, wide }
  })
}

/** A balloon, far off and high: it crosses the sky over the far bank from right to left, slowly, rising and sinking as it goes, and comes round again. */
export function balloon(at: Site, seconds: number): { x: number; y: number } {
  const lane = COLS + 10, x = COLS + 5 - frac((seconds * 0.11 + (siteSeed(at) % 41) * 0.61) / lane) * lane
  return { x, y: SKY.low + 0.3 + 0.9 * (0.5 + 0.5 * Math.sin(seconds * 0.07 + (siteSeed(at) % 7))) }
}

/** How fast the chimney's smoke wavers, in radians a second. */
export const SMOKE = 1.1

/** How often the far train comes, and how fast it goes, in seconds and cells a second. */
export const TRAIN = { every: 37, speed: 0.75, long: 1.45 } as const

/** The far train: where its engine's nose is on the far bridge, or null while no train is on it. It comes from the left end, behind the hill. */
export function train(at: Site, seconds: number): number | null {
  const span = farBridge(at), run = span.x1 - span.x0 + TRAIN.long + 0.6
  if (span.x1 - span.x0 <= 2.5) return null
  const into = ((seconds + (siteSeed(at) % 23)) % TRAIN.every) * TRAIN.speed
  return into > run ? null : span.x0 - 0.3 + into
}

/** How often the fish leaps, and how long a leap lasts, in seconds. */
export const LEAP = { every: 8.7, lasts: 0.85, high: 0.7 } as const

/**
 * The fish: where it is while it is out of the water, and which way its nose
 * points, in radians from level. Null while it is under. It lives at the far
 * end of the widest stretch of open water. A splash throws it clear: up well
 * over the surface, where it hangs for a moment, and back.
 */
export function fish(at: Site, seconds: number, splash: Splash | null): { x: number; y: number; turn: number; flung: boolean } | null {
  const reach = reaches(at)[0]
  if (!reach || reach[1] - reach[0] < 1.6) return null
  // Where a barge passes, the fish keeps to the water behind its stern, where no hull ever comes, and leaps short.
  const astern = at.channel ? at.channel[0] - BARGE.bow - 0.3 - BARGE.stern - 0.15 - at.left[0] : 0
  if (at.channel && astern < 1.2) return null
  const home = at.channel ? at.left[0] + astern - 0.3 : reach[1] - 0.55, far = at.channel ? astern - 0.9 : 0.7
  if (splash && splash.big >= 1 && splash.since < 1.7) {
    // Flung: up fast, a slow turn at the top, and down nose first.
    const t = splash.since / 1.7, up = Math.sin(Math.PI * Math.pow(t, 0.8))
    return { x: home - 0.25 * t, y: WATER + 0.1 + 3.1 * up, turn: 1.3 - 2.6 * t, flung: true }
  }
  const into = (seconds + (siteSeed(at) % 11)) % LEAP.every
  if (into > LEAP.lasts) return null
  const t = into / LEAP.lasts
  return { x: home - far * t, y: WATER + LEAP.high * Math.sin(Math.PI * t), turn: Math.PI - (1.1 - 2.2 * t), flung: false }
}

/**
 * The paper boat: where it floats, how it tips, and whether it is the right
 * way up. It sails the widest stretch of open water from end to end and back.
 * A splash swamps it: it goes over and under, and comes up again when the
 * water is calm. On a sheet where the barge passes there is no paper boat:
 * the barge is the boat there.
 */
export function boat(at: Site, seconds: number, splash: Splash | null): { x: number; y: number; tilt: number; facing: 1 | -1 } | null {
  if (at.channel) return null
  const reach = reaches(at)[0]
  if (!reach || reach[1] - reach[0] < 2.4) return null
  const from = reach[0] + 0.55, room = reach[1] - 1.3 - from, leg = Math.max(room, 0.2) * 9
  const way = frac((seconds + (siteSeed(at) % 31)) / (2 * leg)), out = way < 0.5
  const along = out ? way * 2 : 2 - way * 2
  const x = from + room * (along * along * (3 - 2 * along)), bob = 0.035 * Math.sin(seconds * 2.3), rock = 0.07 * Math.sin(seconds * 1.7)
  if (splash && splash.since < CALM) {
    const s = splash.since
    // Over it goes in the first half second, then it is under until the water has calmed, then up it bobs.
    if (s < 0.5) return { x, y: WATER + bob + 0.25 * Math.sin(Math.PI * s * 2), tilt: (out ? 1 : -1) * 2.6 * (s / 0.5), facing: out ? 1 : -1 }
    if (s < CALM - 1.2) return null
    const up = (s - (CALM - 1.2)) / 1.2
    return { x, y: WATER + bob - 0.3 * (1 - up) * (1 - up), tilt: rock + 0.5 * (1 - up) * Math.sin(up * 9), facing: out ? 1 : -1 }
  }
  return { x, y: WATER + bob, tilt: rock, facing: out ? 1 : -1 }
}

/**
 * The barge, on a sheet where one passes: the middle of its hull, in cells.
 * It lies moored upstream of its channel, its bow toward it and just short of
 * it, nosing forward and back; `passing` (0 to 1 and back) takes it down the
 * channel under the bridge, as far as the water is open beyond. Its hull is
 * never over a rock or in a bank. Null on a sheet with no channel.
 */
export function bargeAt(at: Site, seconds: number, passing: number): number | null {
  if (!at.channel) return null
  const moored = at.channel[0] - BARGE.bow - 0.3
  // As far down as the water is open: to a rock that stands beyond the channel, or to the far bank.
  let open = at.channel[1]
  while (open < at.right[0] && groundAt(at, open + 0.25) < WATER) open += 0.25
  const away = Math.max(moored, open - BARGE.bow - 0.15)
  return moored + 0.15 * Math.sin(seconds * 0.9) * (1 - passing) + passing * (away - moored)
}
/** How far the barge's hull reaches from its middle, in cells: to its stern and to its bow. */
export const BARGE = { stern: 1.5, bow: 1.7 } as const

/** The drops a splash throws: each a short streak, where it is at this moment. Gone when they have fallen back to the water. `between` is the gap's two walls, which no drop goes through. */
export function drops(splash: Splash, between: readonly [number, number] = [-Infinity, Infinity]): { x: number; y: number; vx: number; vy: number }[] {
  const out: { x: number; y: number; vx: number; vy: number }[] = [], s = splash.since, count = Math.round(6 + 7 * splash.big)
  for (let i = 0; i < count; i++) {
    const fan = ((i + 0.5) / count - 0.5) * 2.1, speed = (7.5 + 4 * ((i * 7) % 5) / 4) * (0.5 + 0.5 * splash.big)
    // They go up far more than out, and never into a bank: one that reaches a wall runs down it.
    const vx = Math.sin(fan) * speed * 0.16, vy0 = Math.cos(fan) * speed, y = WATER + vy0 * s - 7 * s * s
    if (y > WATER) out.push({ x: Math.max(between[0], Math.min(between[1], splash.x + vx * s)), y, vx, vy: vy0 - 14 * s })
  }
  return out
}

function line(pen: Pen, cell: number, width: number, alpha: number) {
  pen.strokeStyle = INK.line
  pen.globalAlpha = alpha
  pen.lineWidth = Math.max(0.75, cell * width)
  pen.lineCap = 'round'
  pen.lineJoin = 'round'
}

/** Draws what drifts behind everything: the clouds, the far train and the mug's steam. Returns how many things it drew. */
export function drawSky(pen: Pen, plot: Plot, at: Site, seconds: number): number {
  const { cell } = plot
  let drawn = 0
  // Clouds: a flat foot and three bumps, as on a weather chart.
  line(pen, cell, 0.022, FAINT.hills + 0.06)
  pen.beginPath()
  for (const cloud of clouds(at, seconds)) {
    const [x, y] = px(plot, cloud.x, cloud.y), w = cloud.wide * cell
    pen.moveTo(x + w * 0.04, y); pen.lineTo(x + w * 0.96, y)
    for (const [cx, cy, r, from, to] of [[0.2, 0.1, 0.2, 2.5, 5.3], [0.48, 0.2, 0.26, 3.3, 6.0], [0.79, 0.11, 0.19, 4.1, 7.0]] as const) {
      pen.moveTo(x + w * cx + Math.cos(from) * w * r, y - w * cy + Math.sin(from) * w * r)
      pen.arc(x + w * cx, y - w * cy, w * r, from, to)
    }
  }
  // The balloon: an envelope with its gores, four lines down to a basket, and nobody waving.
  const up = balloon(at, seconds), [bx, by] = px(plot, up.x, up.y), r = cell * 0.62
  pen.moveTo(bx + r, by - r * 0.1); pen.arc(bx, by - r * 0.1, r, 0, Math.PI, true)
  pen.quadraticCurveTo(bx - r * 0.95, by + r * 0.7, bx - r * 0.24, by + r * 1.25); pen.lineTo(bx + r * 0.24, by + r * 1.25); pen.quadraticCurveTo(bx + r * 0.95, by + r * 0.7, bx + r, by - r * 0.1)
  for (const gore of [-0.5, 0, 0.5]) { pen.moveTo(bx + gore * r * 0.5, by + r * 1.25); pen.quadraticCurveTo(bx + gore * r * 1.5, by + r * 0.2, bx + gore * r * 0.3, by - r * 1.08) }
  pen.moveTo(bx - r * 0.24, by + r * 1.25); pen.lineTo(bx - r * 0.18, by + r * 1.62); pen.moveTo(bx + r * 0.24, by + r * 1.25); pen.lineTo(bx + r * 0.18, by + r * 1.62)
  pen.rect(bx - r * 0.2, by + r * 1.62, r * 0.4, r * 0.3)
  pen.stroke()
  drawn++
  const house = hillHouse(at)
  if (house) {
    // Smoke from the house's chimney: one thread that wavers as it rises, leans with the wind and thins out.
    line(pen, cell, 0.018, FAINT.hills + 0.08)
    pen.beginPath()
    for (let i = 0; i <= 10; i++) {
      const h = i * 0.11, [x, y] = px(plot, house[0] + 0.5 * h * h + 0.05 * Math.sin(seconds * SMOKE + i * 0.8) * (i / 10), house[1] + 0.14 + h)
      if (i) pen.lineTo(x, y); else pen.moveTo(x, y)
    }
    pen.stroke()
    drawn++
  }
  const nose = train(at, seconds)
  if (nose !== null) {
    // An engine with a funnel and three wagons, each a small box on the rail, and three puffs left behind.
    const span = farBridge(at), [left] = px(plot, span.x0 - 0.2, 0), [right] = px(plot, span.x1 + 0.2, 0), [, rail] = px(plot, 0, span.y)
    pen.save()
    pen.beginPath(); pen.rect(left, rail - cell * 1.2, right - left, cell * 1.2); pen.clip()
    line(pen, cell, 0.016, FAINT.trees)
    pen.beginPath()
    for (let car = 0; car < 4; car++) {
      const [x] = px(plot, nose - car * 0.37, 0), w = cell * 0.31, h = cell * (car ? 0.14 : 0.18)
      pen.rect(x - w, rail - h, w, h)
      if (car === 0) pen.rect(x - w * 0.34, rail - h - cell * 0.09, cell * 0.06, cell * 0.09)
    }
    pen.stroke()
    pen.restore()
    // Its smoke is whole puffs or none: one that would be cut by the bridge's end is left out.
    pen.beginPath()
    for (let puff = 0; puff < 3; puff++) {
      const at0 = nose - 0.35 - puff * 0.42, [x] = px(plot, at0, 0), r = cell * (0.06 + 0.035 * puff), y = rail - cell * (0.36 + 0.11 * puff + 0.03 * Math.sin(seconds * 3 + puff))
      if (at0 < span.x0 + 0.2 || at0 > span.x1 - 0.2) continue
      pen.moveTo(x + r, y); pen.arc(x, y, r, 0, Math.PI * 2)
    }
    // Filled dabs, not rings.
    pen.fillStyle = INK.line
    pen.globalAlpha = FAINT.hills
    pen.fill()
    drawn++
  }
  const mug = mugAt(at)
  if (mug) {
    // Two threads of steam that waver as they rise and thin out.
    line(pen, cell, 0.016, FAINT.desk * 0.8)
    pen.beginPath()
    for (const side of [-0.09, 0.1]) {
      for (let i = 0; i <= 8; i++) {
        const h = 0.7 + i * 0.07, [x, y] = px(plot, mug[0] + side + 0.06 * Math.sin(seconds * 1.6 + i * 0.9 + side * 20) * (i / 8), mug[1] + h)
        if (i) pen.lineTo(x, y); else pen.moveTo(x, y)
      }
    }
    pen.stroke()
    drawn++
  }
  pen.globalAlpha = 1
  return drawn
}

/** Draws what is in and on the water: the fish, the paper boat, and the splash. Returns how many things it drew. */
export function drawWaterLife(pen: Pen, plot: Plot, at: Site, seconds: number, splash: Splash | null): number {
  const { cell } = plot
  let drawn = 0
  const leaper = fish(at, seconds, splash)
  if (leaper) {
    const [x, y] = px(plot, leaper.x, leaper.y)
    pen.save()
    pen.translate(x, y); pen.rotate(-leaper.turn)
    line(pen, cell, 0.022, leaper.flung ? 0.8 : 0.55)
    pen.beginPath()
    // A body like a leaf, a forked tail, one fin, and an eye that is wide open when it has been thrown.
    pen.moveTo(cell * 0.24, 0); pen.quadraticCurveTo(0, -cell * 0.13, -cell * 0.2, 0); pen.quadraticCurveTo(0, cell * 0.13, cell * 0.24, 0)
    pen.moveTo(-cell * 0.2, 0); pen.lineTo(-cell * 0.33, -cell * 0.1); pen.lineTo(-cell * 0.29, 0); pen.lineTo(-cell * 0.33, cell * 0.1); pen.closePath()
    pen.moveTo(cell * 0.02, -cell * 0.07); pen.lineTo(-cell * 0.05, -cell * 0.15); pen.lineTo(-cell * 0.08, -cell * 0.06)
    pen.stroke()
    pen.fillStyle = INK.line
    pen.beginPath(); pen.arc(cell * 0.13, -cell * 0.02, cell * (leaper.flung ? 0.034 : 0.02), 0, Math.PI * 2); pen.fill()
    pen.restore()
    drawn++
  }
  const sail = boat(at, seconds, splash)
  if (sail) {
    const [x, y] = px(plot, sail.x, sail.y)
    pen.save()
    pen.translate(x, y); pen.rotate(sail.tilt); pen.scale(sail.facing, 1)
    line(pen, cell, 0.022, 0.6)
    pen.beginPath()
    // A boat folded from a sheet of paper: the hull and the peak in the middle. No fold is drawn across it.
    pen.moveTo(-cell * 0.42, -cell * 0.14); pen.lineTo(cell * 0.46, -cell * 0.14); pen.lineTo(cell * 0.26, cell * 0.06); pen.lineTo(-cell * 0.26, cell * 0.06); pen.closePath()
    pen.moveTo(-cell * 0.17, -cell * 0.14); pen.lineTo(cell * 0.02, -cell * 0.46); pen.lineTo(cell * 0.2, -cell * 0.14)
    pen.stroke()
    pen.restore()
    drawn++
  } else if (splash && splash.since < CALM && !at.channel && reaches(at)[0]) {
    // Where it went down: three bubbles come up, one after another.
    const still = boat(at, seconds, null)
    if (still) {
      line(pen, cell, 0.016, 0.5)
      pen.beginPath()
      for (let i = 0; i < 3; i++) {
        const t = frac(splash.since * 0.8 + i / 3), [x, y] = px(plot, still.x + 0.08 * Math.sin(i * 4 + t * 6), WATER - 0.45 + 0.42 * t), r = cell * (0.03 + 0.03 * t)
        pen.moveTo(x + r, y); pen.arc(x, y, r, 0, Math.PI * 2)
      }
      // Filled, not rings.
      pen.fillStyle = INK.line
      pen.fill()
      drawn++
    }
  }
  pen.globalAlpha = 1
  return drawn
}

/** How long a splash is seen, in seconds. */
export const SPLASH = 1.7

/**
 * Draws the splash itself, over whatever made it: a crown that stands up out
 * of the water and falls, the drops it throws well over the banks, and the
 * ripples that run out to both walls. Returns how many things it drew.
 */
export function drawSplash(pen: Pen, plot: Plot, at: Site, splash: Splash | null): number {
  if (!splash || splash.since < 0 || splash.since >= SPLASH) return 0
  const { cell } = plot, s = splash.since, [x, y] = px(plot, splash.x, WATER), big = splash.big
  line(pen, cell, 0.045, Math.max(0, 1 - s / SPLASH))
  pen.beginPath()
  // The crown: two sheets of water that stand up either side of what fell in, and curl over.
  const high = cell * 2.8 * big * Math.sin(Math.PI * Math.min(1, s / 0.7)), wide = cell * (0.7 + 1.3 * Math.min(1, s / 0.5)) * (0.6 + 0.4 * big)
  if (s < 0.7) for (const side of [-1, 1]) for (const reach of [1, 0.62]) { pen.moveTo(x + side * wide * 0.3 * reach, y); pen.quadraticCurveTo(x + side * wide * 0.42 * reach, y - high * reach, x + side * wide * reach, y - high * 0.72 * reach) }
  for (const drop of drops(splash, [at.left[0] + 0.15, at.right[0] - 0.15])) {
    const [dx, dy] = px(plot, drop.x, drop.y)
    // Each a streak along its way, never shorter than a drop.
    const long = Math.max(0.16, Math.abs(drop.vy) * 0.04) * cell * (drop.vy >= 0 ? 1 : -1)
    pen.moveTo(dx, dy); pen.lineTo(dx, dy + long)
  }
  // The ripples stop at the banks.
  const [low] = px(plot, at.left[0] + 0.1, 0), [top] = px(plot, at.right[0] - 0.1, 0), held = (v: number) => Math.max(low, Math.min(top, v))
  for (let i = 0; i < 3; i++) {
    const r = cell * (0.5 + (1.5 + i * 0.9) * s) * (0.6 + 0.4 * big)
    // Each a shallow curve, humped in the middle: never a level bar.
    for (const side of [-1, 1]) {
      const from = held(x + side * r * 0.5), to = held(x + side * r)
      if (Math.abs(to - from) < cell * 0.08) continue
      pen.moveTo(from, y + cell * 0.06 * i); pen.quadraticCurveTo((from + to) / 2, y + cell * 0.06 * i - cell * 0.12, to, y + cell * 0.06 * i)
    }
  }
  pen.stroke()
  pen.globalAlpha = 1
  return 1
}
