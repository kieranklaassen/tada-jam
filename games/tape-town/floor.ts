import type { Point } from './input'
import { FIELD, TAPE_WIDTH, type Pose } from './layout'
import { STAGE, fit, type Fit } from './stage'
import { angleOf, lengthOf, type Strip } from './tape'

// The geometry of the floor: how far apart two toys are, whether a toy is on
// a strip of tape, and where the bare floor ends. A toy seen from above is a
// rectangle along its heading; a strip is a rectangle one tape-width wide.
// Nothing here knows the model or draws.

export type Size = { long: number; wide: number }

/** The bare floor: the same on every surface. */
export type Field = { x0: number; y0: number; x1: number; y1: number }

/** The jam's round home control, in the surface's own pixels: 48 across, its top 10 from the top edge, at the centre. */
export const HOME_PX = { r: 24, cy: 34 } as const

/**
 * Where the home control lies on the stage for a surface fitted by `scale` and offset (`fitFloor`), as a disc in
 * stage units. On the stage's own size it is 48 across at the top centre; on a smaller surface it is larger,
 * and the fit keeps it above the bare floor.
 */
export function homeDisc(surfaceWidth: number, by: { scale: number; x: number; y: number }): { x: number; y: number; r: number } {
  if (by.scale <= 0) return { x: (FIELD.x0 + FIELD.x1) / 2, y: HOME_PX.cy, r: HOME_PX.r }
  return { x: (surfaceWidth / 2 - by.x) / by.scale, y: (HOME_PX.cy - by.y) / by.scale, r: HOME_PX.r / by.scale }
}

/**
 * The stage fitted into a surface so that the bare floor is never under the home control. On most surfaces that
 * is the plain fit, centred. On a short, wide one the control would reach down onto the floor, so the stage is
 * fitted a little smaller and set lower, with the top edge of the bare floor just below the control. The floor
 * itself is the same on every surface: a strip or a toy saved on one is where it was on any other.
 */
export function fitFloor(width: number, height: number): Fit {
  const by = fit(width, height)
  if (by.scale <= 0) return by
  const clear = HOME_PX.cy + HOME_PX.r + 6
  const scale = Math.min(by.scale, (height - clear) / (STAGE.height - FIELD.y0))
  if (!(scale > 0)) return { scale: 0, x: 0, y: 0 }
  return { scale, x: (width - STAGE.width * scale) / 2, y: Math.max((height - STAGE.height * scale) / 2, clear - FIELD.y0 * scale) }
}

/** How far apart two rectangles are, each along its heading: never more than the true distance, and below zero when they overlap. */
export function apart(a: Pose, sa: Size, b: Pose, sb: Size): number {
  const dx = b.x - a.x, dy = b.y - a.y
  let most = -Infinity
  for (const turn of [a.a, a.a + Math.PI / 2, b.a, b.a + Math.PI / 2]) {
    const ux = Math.cos(turn), uy = Math.sin(turn)
    const half = (pose: Pose, size: Size): number => (Math.abs(Math.cos(pose.a) * ux + Math.sin(pose.a) * uy) * size.long + Math.abs(-Math.sin(pose.a) * ux + Math.cos(pose.a) * uy) * size.wide) / 2
    most = Math.max(most, Math.abs(dx * ux + dy * uy) - half(a, sa) - half(b, sb))
  }
  return most
}

/** How far a point is from a rectangle: zero inside it. */
export function reachTo(pose: Pose, size: Size, at: Point): number {
  const dx = at.x - pose.x, dy = at.y - pose.y, c = Math.cos(pose.a), s = Math.sin(pose.a)
  return Math.hypot(Math.max(0, Math.abs(dx * c + dy * s) - size.long / 2), Math.max(0, Math.abs(-dx * s + dy * c) - size.wide / 2))
}

/** Half of what a rectangle takes up across the stage and down it. */
export function extent(pose: Pose, size: Size): { across: number; down: number } {
  const c = Math.abs(Math.cos(pose.a)), s = Math.abs(Math.sin(pose.a))
  return { across: (c * size.long + s * size.wide) / 2, down: (s * size.long + c * size.wide) / 2 }
}

/** Whether a rectangle lies wholly on the bare floor. */
export function onFloor(field: Field, pose: Pose, size: Size): boolean {
  const { across, down } = extent(pose, size)
  return pose.x - across >= field.x0 && pose.x + across <= field.x1 && pose.y - down >= field.y0 && pose.y + down <= field.y1
}

/** A strip as a rectangle: its middle, its heading, its length and the width of the tape. */
export function bandOf(strip: Strip): { pose: Pose; size: Size } {
  return { pose: { x: (strip.ax + strip.bx) / 2, y: (strip.ay + strip.by) / 2, a: angleOf(strip) }, size: { long: lengthOf(strip), wide: TAPE_WIDTH } }
}

/** How much bare floor lies between a rectangle and a strip: below zero when it is on the tape. */
export function offTape(strip: Strip, pose: Pose, size: Size): number {
  const band = bandOf(strip)
  return apart(pose, size, band.pose, band.size)
}

/** The strip a point stands on: the one laid last of those under it, or -1. */
export function stripUnder(strips: readonly Strip[], at: Point): number {
  for (let i = strips.length - 1; i >= 0; i--) {
    const band = bandOf(strips[i])
    if (reachTo(band.pose, band.size, at) <= 0) return i
  }
  return -1
}

/**
 * The nearest place to `want`, no further than `far`, that `fits`: tried at `want` itself and then in rings
 * round it, each ring starting on the side `toward` points to. Null when no place within reach fits.
 */
export function nearestPlace(want: Point, far: number, toward: number, fits: (at: Point) => boolean): Point | null {
  const here = { x: Math.round(want.x), y: Math.round(want.y) }
  if (fits(here)) return here
  for (let ring = 16; ring <= far; ring += 16) {
    const steps = Math.max(8, Math.round(ring / 8))
    for (let k = 0; k < steps; k++) {
      // Out from `toward` to each side in turn.
      const turn = toward + ((k + 1) >> 1) * (k % 2 ? 1 : -1) * ((Math.PI * 2) / steps)
      const at = { x: Math.round(want.x + Math.cos(turn) * ring), y: Math.round(want.y + Math.sin(turn) * ring) }
      if (fits(at)) return at
    }
  }
  return null
}
