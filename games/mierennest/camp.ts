import type { InvaderKind } from './habits'
import type { Mover } from './motion'
import type { Party } from './order'
import { GRASS_Y, LOG, TOADSTOOL } from './view/layout'
import { BELL } from './view/props'

// The invaders' camp on the surface: who stands where, in what pose, and what a touch there lands on. Pure numbers
// in stage units, so the same layout holds at every size of surface. The camp keeps clear of the bell, which is
// the one thing up there the child aims at, and no camper covers another's face.

export type Camper = {
  id: string
  kind: Mover
  /** The middle of its feet. */
  x: number
  y: number
  /** It faces left. */
  flip: boolean
  /** The two poses its idle swaps between. */
  poses: readonly [string, string]
  /** What sets it apart in time from another of its kind, from 0 to 1. */
  phase: number
}

/** The body box of each kind that can stand at the camp: its width along the ground and its height above its feet. */
export const BODY: Record<Mover, { width: number; height: number }> = {
  ant: { width: 112, height: 28 },
  worker: { width: 84, height: 24 },
  queen: { width: 120, height: 72 },
  raider: { width: 118, height: 28 },
  beetle: { width: 124, height: 56 },
  fly: { width: 118, height: 56 },
  dungBeetle: { width: 124, height: 56 },
  dungFly: { width: 118, height: 56 },
  dungBall: { width: 84, height: 84 },
}

/** The creature that plays each invader kind, and the two poses it waits in at the log. */
const WAITING: Record<InvaderKind, { kind: Mover; poses: readonly [string, string] }> = {
  ant: { kind: 'raider', poses: ['pillow', 'pillow'] },
  beetle: { kind: 'beetle', poses: ['napkin', 'napkin'] },
  fly: { kind: 'fly', poses: ['hands', 'hands2'] },
  dungBeetle: { kind: 'dungBeetle', poses: ['sit', 'sit'] },
  dungFly: { kind: 'dungFly', poses: ['point', 'point2'] },
}

/**
 * The campers, in the order they are drawn. Each of the five who are always there is caught out by its own habit;
 * the first of the party that will come next sits on the log beside the mouth.
 */
export function campers(party: Party): Camper[] {
  const first = WAITING[party[0] ?? 'ant']
  return [
    { id: 'stuck', kind: 'raider', x: 112, y: GRASS_Y, flip: true, poses: ['stuck', 'stuck2'], phase: 0.3 },
    { id: 'fly', kind: 'fly', x: 262, y: GRASS_Y, flip: false, poses: ['hands', 'hands2'], phase: 0 },
    { id: 'party', kind: first.kind, x: LOG.x + LOG.length / 2, y: GRASS_Y - LOG.height, flip: false, poses: first.poses, phase: 0.65 },
    { id: 'leader', kind: 'dungFly', x: TOADSTOOL.x, y: GRASS_Y - TOADSTOOL.top, flip: true, poses: ['point', 'point2'], phase: 0.1 },
    { id: 'beetle', kind: 'beetle', x: 900, y: GRASS_Y, flip: false, poses: ['onBack', 'onBack2'], phase: 0.5 },
    { id: 'ball', kind: 'dungBall', x: 1106, y: GRASS_Y, flip: false, poses: ['plain', 'plain'], phase: 0 },
    { id: 'polisher', kind: 'dungBeetle', x: 1030, y: GRASS_Y, flip: false, poses: ['polish', 'polish2'], phase: 0.8 },
  ]
}

export type Box = { left: number; right: number; top: number; bottom: number }

export function boxOf(camper: Camper): Box {
  const body = BODY[camper.kind]
  return { left: camper.x - body.width / 2, right: camper.x + body.width / 2, top: camper.y - body.height, bottom: camper.y }
}

/** Where a camper's face is: a circle at the front of its body. The ball has no face. */
export function faceOf(camper: Camper): { x: number; y: number; radius: number } | null {
  if (camper.kind === 'dungBall') return null
  const body = BODY[camper.kind], front = camper.flip ? -1 : 1
  const radius = Math.min(18, body.height * 0.45)
  return { x: camper.x + front * (body.width / 2 - radius - 2), y: camper.y - body.height * 0.55, radius }
}

/** A touch rings the bell when it lands within its reach. */
export const onBell = (x: number, y: number): boolean => Math.hypot(x - BELL.x, y - BELL.y) <= BELL.reach

/** The smallest a camper's target is across, in stage units: the jam's floor for a touch. */
export const SMALLEST_TARGET = 48

/** The camper a touch lands on: the one drawn last whose body, widened to the smallest target, holds the point. The bell comes first. */
export function camperAt(list: readonly Camper[], x: number, y: number): Camper | null {
  if (onBell(x, y)) return null
  for (let n = list.length - 1; n >= 0; n--) {
    const box = boxOf(list[n])
    const growX = Math.max(0, (SMALLEST_TARGET - (box.right - box.left)) / 2), growY = Math.max(0, (SMALLEST_TARGET - (box.bottom - box.top)) / 2)
    if (x >= box.left - growX && x <= box.right + growX && y >= box.top - growY && y <= box.bottom + growY) return list[n]
  }
  return null
}
