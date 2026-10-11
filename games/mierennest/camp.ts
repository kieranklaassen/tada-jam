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
  /** How much of its full size it stands at; 1 where it is not given. A large army at the log stands a little smaller. */
  size?: number
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
export const WAITING: Record<InvaderKind, { kind: Mover; poses: readonly [string, string] }> = {
  ant: { kind: 'raider', poses: ['pillow', 'pillow'] },
  beetle: { kind: 'beetle', poses: ['napkin', 'napkin'] },
  fly: { kind: 'fly', poses: ['hands', 'hands2'] },
  dungBeetle: { kind: 'dungBeetle', poses: ['sit', 'sit'] },
  dungFly: { kind: 'dungFly', poses: ['point', 'point2'] },
}

/** Where the head of the party at the log stands: the right end of the log, beside the mouth. */
export const FILE_HEAD = LOG.x + LOG.length + 2
/** Where the party's ground ends on the left: the frame, and a little air. */
export const FILE_FOOT = 34
/** The air between two of the party who stand side by side, and between one and whoever hovers over it. */
export const FILE_GAP = 6
/** How far a rider's feet sink into the back it sits on. */
const SEATED = 4
/** The highest anyone of the party hangs: inside the frame, with a little air. */
const SKY_TOP = 34

/**
 * The party that will come next, at the log, where nobody of it covers anybody: the heavy ones stand side by side
 * on the grass from the mouth end, a dung beetle on its own ball; each raider ant rides a beetle's back while there
 * are backs, and the rest stand on the grass behind; each flier hovers over one of them. A party too long for the
 * grass between the mouth and the frame stands a little smaller, all of it alike. They are given in marching order,
 * one for each member of the party; the balls come from `partyBalls`.
 */
export function partyFile(party: Party): Camper[] {
  const layout = layOut(party)
  return layout.members
}

/** The dung balls of the party at the log, each under its own beetle. */
export function partyBalls(party: Party): Camper[] {
  return layOut(party).balls
}

function layOut(party: Party): { members: Camper[]; balls: Camper[] } {
  const heavy = party.flatMap((kind, n) => (kind === 'beetle' || kind === 'dungBeetle' ? [n] : []))
  const ants = party.flatMap((kind, n) => (kind === 'ant' ? [n] : []))
  const fliers = party.flatMap((kind, n) => (kind === 'fly' || kind === 'dungFly' ? [n] : []))
  // Who stands on the grass, from the mouth end: the heavy ones, then the ants no back is left for, then a flier
  // nobody is left to hover over, or who would hover out of the picture.
  const riders = ants.slice(0, heavy.filter((n) => party[n] === 'beetle').length)
  const walkers = ants.slice(riders.length)
  const columns = heavy.length + walkers.length
  let hovering = Math.min(fliers.length, columns)
  for (;;) {
    const laid = place(party, heavy, walkers, riders, fliers.slice(0, hovering), fliers.slice(hovering))
    if (laid || hovering === 0) return laid ?? { members: [], balls: [] }
    hovering--
  }
}

/** Lays the party out with these fliers hovering and those hanging low. Null when a hovering flier would hang above the frame. */
function place(party: Party, heavy: number[], walkers: number[], riders: number[], hover: number[], low: number[]): { members: Camper[]; balls: Camper[] } | null {
  const members: (Camper | null)[] = party.map(() => null)
  const balls: Camper[] = []
  const widthOf = (n: number) => BODY[WAITING[party[n]].kind].width
  const onGrass = [...heavy, ...walkers, ...low]
  const gaps = FILE_GAP * Math.max(0, onGrass.length - 1)
  const size = Math.min(1, (FILE_HEAD - FILE_FOOT - gaps) / Math.max(1, onGrass.reduce((sum, n) => sum + widthOf(n), 0)))
  const camper = (n: number, x: number, y: number): Camper => {
    const waiting = WAITING[party[n]]
    return { id: `party${n}`, kind: waiting.kind, x, y, flip: false, poses: waiting.poses, phase: (0.65 + n * 0.23) % 1, size }
  }
  // Each column: where its middle is, and how high it stands over the grass.
  const tops: { x: number; top: number }[] = []
  let right = FILE_HEAD
  let rider = 0
  for (const n of onGrass) {
    const width = widthOf(n) * size, x = right - width / 2
    let top: number
    if (party[n] === 'dungBeetle') {
      const ball = BODY.dungBall
      balls.push({ id: `partyBall${n}`, kind: 'dungBall', x, y: GRASS_Y, flip: false, poses: ['plain', 'plain'], phase: (0.13 + n * 0.17) % 1, size })
      const feet = GRASS_Y - (ball.height - SEATED) * size
      members[n] = camper(n, x, feet)
      top = feet - BODY.dungBeetle.height * size
    } else if (low.includes(n)) {
      // A flier with nobody to hover over hangs low over the grass.
      members[n] = camper(n, x, GRASS_Y - 8)
      top = GRASS_Y - 8 - BODY[WAITING[party[n]].kind].height * size
    } else {
      members[n] = camper(n, x, GRASS_Y)
      top = GRASS_Y - BODY[WAITING[party[n]].kind].height * size
      if (party[n] === 'beetle' && rider < riders.length) {
        const feet = top + SEATED * size
        members[riders[rider]] = camper(riders[rider], x, feet)
        top = feet - BODY.raider.height * size
        rider++
      }
    }
    if (!low.includes(n)) tops.push({ x, top })
    right -= width + FILE_GAP
  }
  // The fliers hover over the lowest columns, nearest the mouth first among those as low.
  const order = tops.map((column, k) => ({ ...column, k })).sort((a, b) => b.top - a.top || a.k - b.k)
  for (let k = 0; k < hover.length; k++) {
    const n = hover[k], column = order[k]
    const feet = column.top - FILE_GAP
    if (feet - BODY[WAITING[party[n]].kind].height * size < SKY_TOP) return null
    members[n] = camper(n, column.x, feet)
  }
  return { members: members.filter((one): one is Camper => one !== null), balls }
}

/** How far left the party reaches. */
export function fileEnd(file: readonly Camper[]): number {
  return file.length === 0 ? FILE_HEAD : Math.min(...file.map((camper) => boxOf(camper).left))
}

/**
 * The campers, in the order they are drawn. Each of those who are always there is caught out by its own habit.
 * A creature is in one place: one whose kind is in the party at the log is in that party, and its own spot at the
 * camp is empty while it is away (the dung beetle takes its ball along, the dung fly its twig). The two on the
 * left also make room when the party is long.
 */
export function campers(party: Party): Camper[] {
  const file = [...partyBalls(party), ...partyFile(party)], end = fileEnd(file)
  const away = (kind: InvaderKind) => party.includes(kind)
  const left: Camper[] = [
    ...(away('ant') ? [] : [{ id: 'stuck', kind: 'raider', x: 100, y: GRASS_Y, flip: true, poses: ['stuck', 'stuck2'], phase: 0.3 } as Camper]),
    ...(away('fly') ? [] : [{ id: 'fly', kind: 'fly', x: 230, y: GRASS_Y, flip: false, poses: ['bump', 'hands'], phase: 0 } as Camper]),
  ]
  const right: Camper[] = [
    ...(away('dungFly') ? [] : [{ id: 'leader', kind: 'dungFly', x: TOADSTOOL.x, y: GRASS_Y - TOADSTOOL.top, flip: true, poses: ['point', 'point2'], phase: 0.1 } as Camper]),
    ...(away('beetle') ? [] : [{ id: 'beetle', kind: 'beetle', x: 900, y: GRASS_Y, flip: false, poses: ['onBack', 'onBack2'], phase: 0.5 } as Camper]),
    ...(away('dungBeetle') ? [] : [
      { id: 'ball', kind: 'dungBall', x: 1106, y: GRASS_Y, flip: false, poses: ['plain', 'plain'], phase: 0 } as Camper,
      { id: 'polisher', kind: 'dungBeetle', x: 1030, y: GRASS_Y, flip: false, poses: ['polish', 'polish2'], phase: 0.8 } as Camper,
    ]),
  ]
  return [...left.filter((camper) => camper.x + BODY[camper.kind].width / 2 + 6 <= end), ...file, ...right]
}

export type Box = { left: number; right: number; top: number; bottom: number }

export function boxOf(camper: Camper): Box {
  const body = BODY[camper.kind], size = camper.size ?? 1
  return { left: camper.x - (body.width / 2) * size, right: camper.x + (body.width / 2) * size, top: camper.y - body.height * size, bottom: camper.y }
}

/** Where a camper's face is: a circle at the front of its body. The ball has no face. */
export function faceOf(camper: Camper): { x: number; y: number; radius: number } | null {
  if (camper.kind === 'dungBall') return null
  const body = BODY[camper.kind], front = camper.flip ? -1 : 1, size = camper.size ?? 1
  const radius = Math.min(18, body.height * 0.45) * size
  return { x: camper.x + front * ((body.width / 2) * size - radius - 2), y: camper.y - body.height * 0.55 * size, radius }
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
