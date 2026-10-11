import { chick as chickShape, hen as henShape, type HenPose } from './artHen'
import { tapBasket, tapHen, type House } from './house'
import { FLOOR_Y, GLASS, STAIRS_X } from './layout'
import type { Pen, Picture } from './pen'
import { box, fill, rr, scatter, wavyStripes } from './print'
import { b, type Answer, type Cast, type Live, type Part, type RoomDef, type Target } from './room'
import { dogKit } from './roomDog'

// The henhouse. The hen sits on her nest over the egg basket. Its thing is
// the hen: every tap startles her and an egg drops, and the third egg cracks
// into a chick that climbs onto her head. When the weed has been pulled in
// the garden she has its root in her beak and leans back on it like a rope.

const D = Math.PI / 180

/** The middle of the hen's body on the nest, and how large she is drawn. */
const HEN = { x: 470, y: 352, scale: 2 }
const BASKET = { x: 470, y: 650 }
/** Where the root is pegged in the floor. */
const PEG = { x: 112, y: 604 }

// --- The print ---------------------------------------------------------------

/** How near two straws may lie: no two strokes cross or touch, since two crossed strokes are a sign. */
export const STRAW_GAP = 5

type Straw = { x: number; y: number; turn: number; half: number }

/** The two ends of a straw. */
export const strawEnds = (s: Straw): [number, number, number, number] => [s.x - Math.cos(s.turn) * s.half, s.y - Math.sin(s.turn) * s.half, s.x + Math.cos(s.turn) * s.half, s.y + Math.sin(s.turn) * s.half]

/** How far apart two strokes are at their nearest: zero when they cross. */
export function strokesApart(a: readonly number[], b: readonly number[]): number {
  const toStroke = (px: number, py: number, s: readonly number[]): number => {
    const dx = s[2] - s[0], dy = s[3] - s[1]
    const t = Math.max(0, Math.min(1, ((px - s[0]) * dx + (py - s[1]) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(px - s[0] - t * dx, py - s[1] - t * dy)
  }
  const side = (s: readonly number[], px: number, py: number): number => Math.sign((s[2] - s[0]) * (py - s[1]) - (s[3] - s[1]) * (px - s[0]))
  if (side(a, b[0], b[1]) !== side(a, b[2], b[3]) && side(b, a[0], a[1]) !== side(b, a[2], a[3])) return 0
  return Math.min(toStroke(a[0], a[1], b), toStroke(a[2], a[3], b), toStroke(b[0], b[1], a), toStroke(b[2], b[3], a))
}

/** Straw on the floor: short strokes thrown down anyhow, each kept only where it lies clear of every straw before it. */
export const STRAW: readonly Straw[] = (() => {
  const out: Straw[] = []
  for (const [seed, count, half] of [[9, 60, 14], [13, 26, 10]] as const) {
    const next = scatter(seed)
    for (let i = 0, tries = 0; i < count && tries < count * 40; tries++) {
      const one: Straw = { x: 44 + next() * 940, y: 580 + next() * 150, turn: next() * 3, half }
      if (out.some((other) => strokesApart(strawEnds(one), strawEnds(other)) < STRAW_GAP + 3)) continue
      out.push(one)
      i++
    }
  }
  return out
})()

function print(p: Pen): void {
  const top = GLASS.y, bottom = GLASS.y + GLASS.h
  fill(p, '#f3dcae', () => box(p, GLASS.x, top, STAIRS_X - GLASS.x, FLOOR_Y - top))
  wavyStripes(p, '#e6c88e', GLASS.x, STAIRS_X, top, FLOOR_Y, 84, 5, 21)
  fill(p, '#e3bd6c', () => box(p, GLASS.x, FLOOR_Y, STAIRS_X - GLASS.x, bottom - FLOOR_Y))
  // Straw on the floor: short strokes thrown down anyhow.
  for (const [colour, long] of [['#f4d98f', 14], ['#c9a45a', 10]] as const) fill(p, colour, () => { for (const s of STRAW.filter((one) => one.half === long)) p.at(s.x, s.y, () => p.line([-s.half, 0, s.half, 0], 3), { turn: s.turn }) })
  // A round window with the sun in it, and a beam under the roof.
  fill(p, '#b5855a', () => p.ell(840, 170, 86, 86))
  fill(p, '#bfe4f7', () => p.ell(840, 170, 70, 70))
  fill(p, '#ffe27a', () => p.ell(862, 150, 26, 26))
  fill(p, '#ffffff', () => { p.ell(812, 196, 28, 12); p.ell(832, 186, 18, 12) })
  fill(p, '#b5855a', () => p.blob([GLASS.x, top, STAIRS_X, top, STAIRS_X, top + 26, 600, top + 40, GLASS.x, top + 28]))
  // A perch with a lantern, and two sacks of corn, one spilled.
  fill(p, '#c9803a', () => p.line([GLASS.x, 150, 200, 158, 330, 150], 12))
  fill(p, '#7b828d', () => p.line([120, 156, 120, 186], 4))
  fill(p, '#ffd75e', () => rr(p, 100, 186, 40, 52, 14))
  fill(p, '#7b828d', () => { p.ell(120, 186, 22, 7); p.ell(120, 238, 22, 7) })
  fill(p, '#d9b384', () => { p.blob([810, 716, 800, 560, 836, 520, 904, 520, 946, 560, 936, 716]); p.blob([72, 716, 60, 640, 96, 610, 170, 618, 190, 716]) })
  fill(p, '#b98f52', () => { p.line([826, 548, 870, 560, 920, 548], 6); p.line([84, 640, 124, 650, 170, 640], 5) })
  fill(p, '#ffd75e', () => { const next = scatter(17); for (let i = 0; i < 16; i++) p.ell(196 + next() * 90, 690 + next() * 30, 5, 4) })
  // The nest box: a crate on four legs, stuffed with straw.
  fill(p, '#b5855a', () => { p.line([318, 520, 310, 600], 16); p.line([622, 520, 630, 600], 16) })
  fill(p, '#c9803a', () => rr(p, 286, 428, 368, 100, 16))
  fill(p, '#b5855a', () => { p.line([296, 462, 470, 468, 644, 462], 5); p.line([330, 498, 450, 503, 560, 497], 5) })
  fill(p, '#f4d98f', () => { p.blob([276, 440, 300, 404, 380, 418, 470, 400, 560, 418, 640, 404, 664, 440]); const next = scatter(23); for (let i = 0; i < 12; i++) { const x = 280 + next() * 380; p.line([x, 430, x + (next() - 0.5) * 30, 404 - next() * 16], 4) } })
  // A plank up to the nest, with no rungs on it.
  fill(p, '#c9803a', () => p.poly([664, 520, 690, 512, 800, 706, 770, 716]))
  // The peg in the floor.
  fill(p, '#7b828d', () => p.line([PEG.x - 4, PEG.y - 6, PEG.x - 14, PEG.y + 28], 9))
}

// --- The segments ------------------------------------------------------------

type Pose = { hen: HenPose; dx?: number; dy?: number; turn?: number; root?: 'taut' | 'slack' }

const POSES: Readonly<Record<string, Pose>> = {
  Sit: { hen: { head: [-40, -48], eye: 'half', beak: 'shut' } },
  SitB: { hen: { head: [-40, -48], eye: 'shut', beak: 'shut' } },
  Tuck: { hen: { head: [-50, -8], eye: 'shut', beak: 'shut', wing: 'over' } },
  Up: { hen: { head: [-44, -66], eye: 'wide', beak: 'open', feathers: true, legs: true, big: true }, dy: -24 },
  Sink: { hen: { head: [-52, -4], eye: 'shut', beak: 'shut', wing: 'over' }, dy: 34 },
  Look: { hen: { head: [-52, -22], eye: 'wide', beak: 'open' }, turn: -16 },
  Root: { hen: { head: [-40, -48], eye: 'cross', beak: 'open' }, turn: 14, root: 'taut' },
  RootB: { hen: { head: [-40, -48], eye: 'wide', beak: 'open' }, turn: 6, root: 'slack' },
}

/** A point of the hen, given about the middle of her body, where it is on the stage in a pose. */
function at(pose: Pose, x: number, y: number): [number, number] {
  const turn = (pose.turn ?? 0) * D, s = HEN.scale
  return [HEN.x + (pose.dx ?? 0) + s * (x * Math.cos(turn) - y * Math.sin(turn)), HEN.y + (pose.dy ?? 0) + s * (x * Math.sin(turn) + y * Math.cos(turn))]
}

function drawHen(p: Pen, pose: Pose): void {
  p.at(HEN.x + (pose.dx ?? 0), HEN.y + (pose.dy ?? 0), () => henShape(p, pose.hen), { scale: HEN.scale, turn: (pose.turn ?? 0) * D })
  if (pose.root) {
    // The root runs from her beak to the peg: taut as a rope, or slack for a moment before it twangs.
    const [bx, by] = at(pose, pose.hen.head[0] - 40, pose.hen.head[1] + 2)
    const sag = pose.root === 'slack' ? 60 : 0
    p.line([bx, by, (bx + PEG.x) / 2 - sag * 0.4, (by + PEG.y) / 2 + sag, PEG.x, PEG.y], 9)
    p.line([(bx + PEG.x) / 2, (by + PEG.y) / 2 + sag * 0.5, (bx + PEG.x) / 2 - 30, (by + PEG.y) / 2 + 24 + sag * 0.5], 4)
    p.line([bx * 0.3 + PEG.x * 0.7, by * 0.3 + PEG.y * 0.7 + sag * 0.3, bx * 0.3 + PEG.x * 0.7 + 26, by * 0.3 + PEG.y * 0.7 + 28 + sag * 0.3], 4)
  }
}

/** The chick on her head, in a pose: it rides wherever her head is. */
function drawChick(p: Pen, pose: Pose, hop: boolean): void {
  const [x, y] = at(pose, pose.hen.head[0] + 6, pose.hen.head[1] - 44)
  p.at(x, y, () => chickShape(p, 0, 0, hop), { scale: 1.5 })
}

function basket(p: Pen, tip: number): void {
  p.about(BASKET.x - 60, BASKET.y + 50, () => {
    p.blob([BASKET.x - 84, BASKET.y - 30, BASKET.x + 84, BASKET.y - 30, BASKET.x + 62, BASKET.y + 52, BASKET.x - 62, BASKET.y + 52])
    p.cut(() => {
      p.line([BASKET.x - 70, BASKET.y - 4, BASKET.x, BASKET.y + 8, BASKET.x + 70, BASKET.y - 4], 5)
      p.line([BASKET.x - 62, BASKET.y + 24, BASKET.x, BASKET.y + 34, BASKET.x + 62, BASKET.y + 24], 5)
    })
  }, { turn: tip * D })
}

function egg(p: Pen, x: number, y: number, turn: number): void {
  p.ell(x, y, 24, 31, turn)
  p.cut(() => p.ell(x - 7, y - 12, 5, 8, turn + 0.4))
}

/** An egg in the basket: only its top shows over the rim. */
function eggIn(p: Pen, x: number, turn: number): void {
  p.within(BASKET.x - 90, BASKET.y - 80, 180, 44, () => egg(p, x, BASKET.y - 40, turn))
}

const DOG = dogKit('hd', 880, 716, 0.5, true)

const segments: Record<string, Picture> = {
  ...DOG.segments,
  basket: (p) => basket(p, 0),
  basketTip: (p) => { basket(p, -24); p.ell(BASKET.x + 96, BASKET.y - 60, 9, 4, -0.6); p.ell(BASKET.x + 112, BASKET.y - 30, 9, 4, 0) },
  egg1: (p) => eggIn(p, BASKET.x - 34, -0.3),
  egg2: (p) => eggIn(p, BASKET.x + 30, 0.3),
  /** The egg on its way down from the nest to the basket. */
  eggDrop: (p) => { egg(p, BASKET.x, 548, 0); p.ell(BASKET.x - 34, 524, 4, 9); p.ell(BASKET.x + 34, 524, 4, 9) },
  /** The third egg cracking on the pile. */
  eggCrack: (p) => {
    p.within(BASKET.x - 90, BASKET.y - 110, 180, 74, () => egg(p, BASKET.x, BASKET.y - 62, 0))
    p.cut(() => p.line([BASKET.x - 22, BASKET.y - 64, BASKET.x - 8, BASKET.y - 74, BASKET.x + 4, BASKET.y - 62, BASKET.x + 20, BASKET.y - 72], 4))
    for (const [x, y, turn] of [[-56, -96, -0.8], [0, -112, 1.57], [56, -96, 0.8]]) p.ell(BASKET.x + x, BASKET.y + y, 9, 4, turn)
  },
  /** The two halves of the shell, lying on the other eggs. */
  shell: (p) => {
    p.within(BASKET.x - 90, BASKET.y - 110, 180, 74, () => {
      p.blob([BASKET.x - 22, BASKET.y - 30, BASKET.x - 26, BASKET.y - 54, BASKET.x - 14, BASKET.y - 46, BASKET.x - 4, BASKET.y - 56, BASKET.x + 6, BASKET.y - 46, BASKET.x + 16, BASKET.y - 54, BASKET.x + 20, BASKET.y - 30])
    })
  },
  /** The chick standing up in the shell. */
  chickShell: (p) => p.at(BASKET.x, BASKET.y - 76, () => chickShape(p, 0, 0, false), { scale: 1.5 }),
  eggRollA: (p) => { egg(p, 330, 690, 1.2); p.ell(374, 700, 8, 3); p.ell(392, 690, 6, 3) },
  eggRollB: (p) => { egg(p, 232, 690, 2.6); p.ell(276, 700, 8, 3); p.ell(294, 690, 6, 3) },
  eggRollC: (p) => { egg(p, 300, 640, 4.2); p.ell(262, 660, 8, 3); p.ell(250, 676, 6, 3) },
}
for (const [name, pose] of Object.entries(POSES)) {
  segments[`h${name}`] = (p) => drawHen(p, pose)
  segments[`chick${name}`] = (p) => drawChick(p, pose, name === 'Up')
}

// --- The rules ---------------------------------------------------------------

const rooted = (h: House): boolean => h.weed === 2

/** The hen in a pose, with the chick on her head once it has hatched. */
function hen(h: House, pose: string): string[] {
  return h.eggs === 3 ? [`h${pose}`, `chick${pose}`] : [`h${pose}`]
}
const henRest = (h: House): string[] => hen(h, rooted(h) ? 'Root' : 'Sit')

function eggs(n: number): string[] {
  return n === 0 ? [] : n === 1 ? ['egg1'] : n === 2 ? ['egg1', 'egg2'] : ['egg1', 'egg2', 'shell']
}

function rest(h: House): Cast {
  return { hen: henRest(h), basket: ['basket'], eggs: eggs(h.eggs), dog: DOG.rest(h) }
}

function targets(h: House): Target[] {
  const out: Target[] = [{ id: 'hen', shape: { x: HEN.x - 10, y: HEN.y - 20, rx: 170, ry: 136 } }, { id: 'basket', shape: { x: BASKET.x, y: BASKET.y - 4, rx: 104, ry: 76 } }]
  if (DOG.rest(h).length > 0) out.push({ id: 'dog', shape: DOG.area })
  return out
}

function touch(id: string, h: House): Answer | null {
  switch (id) {
    case 'hen': {
      const out = tapHen(h)
      if (out.came === 'again') return { plan: [{ who: 'hen', beats: [b(hen(h, 'Up'), 0.4, 'henShriek'), b(henRest(h), 0.3, 'chickPeep')] }, { who: 'basket', beats: [b('basket', 0.1)] }, { who: 'eggs', beats: [b(eggs(h.eggs), 0.1)] }] }
      // The basket stands again under the egg that is coming.
      const stands: Part = { who: 'basket', beats: [b('basket', 0.1)] }
      const up = { who: 'hen', beats: [b(hen(h, 'Up'), 0.4, 'henShriek'), b(hen(out.came === 'punch' ? h : out.house, rooted(h) ? 'Root' : 'Sit'), out.came === 'punch' ? 0.75 : 0.3)] }
      if (out.came === 'punch') {
        // The third egg cracks on the pile, and the chick stands up in the shell and climbs onto her head.
        return {
          house: out.house,
          save: 'now',
          scene: true,
          plan: [
            { ...up, beats: [...up.beats, b(henRest(out.house), 0.6, 'chickPeeps')] },
            { who: 'eggs', after: 0.12, beats: [b([...eggs(2), 'eggDrop'], 0.16), b([...eggs(2), 'eggCrack'], 0.3, 'eggCrack'), b([...eggs(3), 'chickShell'], 0.45, 'chickPeep'), b(eggs(3), 0.6)] },
            stands,
            ...DOG.startle(h, 0.3),
          ],
        }
      }
      return {
        house: out.house,
        save: 'now',
        plan: [up, stands, { who: 'eggs', after: 0.12, beats: [b([...eggs(h.eggs), 'eggDrop'], 0.16), b(eggs(out.house.eggs), 0.4, 'eggTock')] }],
      }
    }
    case 'basket': {
      const out = tapBasket(h)
      const tip: Part = { who: 'basket', beats: [b('basketTip', 0.5, out.came === 'joke' ? 'basketKnock' : 'eggRattle'), b('basket', 0.2)] }
      // Empty, or with the chick hatched, it only tips with a hollow knock, and the hen looks into it.
      if (out.came === 'joke') return { plan: [tip, { who: 'eggs', beats: [b([], 0.5), b(eggs(h.eggs), 0.1)] }, { who: 'hen', after: 0.1, beats: [b(hen(h, 'Look'), 0.6, 'henCluck'), b(henRest(h), 0.2)] }] }
      // One egg rolls out across the floor and back under her.
      return {
        house: out.house,
        save: 'now',
        plan: [tip, { who: 'eggs', beats: [b('eggRollA', 0.22), b('eggRollB', 0.22, 'eggRattle'), b('eggRollC', 0.22), b(eggs(out.house.eggs), 0.2)] }, { who: 'hen', after: 0.5, beats: [b(hen(out.house, 'Look'), 0.4, 'henCluck'), b(henRest(out.house), 0.2)] }],
      }
    }
    case 'dog':
      return { plan: [DOG.tap(h)] }
    default:
      return null
  }
}

export const henhouse: RoomDef = {
  id: 'henhouse',
  print,
  segments,
  ghosts: ['hSit', 'hUp', 'chickSit', 'basket', 'egg1', 'egg2', 'eggDrop', 'eggRollB', ...DOG.ghosts],
  enter: () => ({}),
  rest,
  idle(who, h, _live: Live, rng) {
    if (who === 'hen') {
      // With the root in her beak she leans back on it, and now and then it gives and twangs.
      if (rooted(h)) return [b(hen(h, 'Root'), 2 + rng.next() * 2), b(hen(h, 'RootB'), 0.16), b(hen(h, 'Root'), 0.1), b(hen(h, 'RootB'), 0.12)]
      return [b(hen(h, 'Sit'), 1.6 + rng.next() * 1.6), b(hen(h, 'SitB'), 0.14), b(hen(h, 'Sit'), 0.9 + rng.next()), b(hen(h, 'Tuck'), 1.2 + rng.next())]
    }
    if (who === 'dog') return DOG.idle(h, rng)
    return null
  },
  targets,
  touch,
  // She tucks her head under her wing and sinks into the straw.
  leave: (h) => [{ who: 'hen', beats: [b(hen(h, 'Tuck'), 0.25, 'henCluckLow'), b(hen(h, 'Sink'), 0.3, 'henCluckLower')] }],
  arrive(h) {
    const plan: Part[] = [...DOG.arrive(h)]
    if (rooted(h)) plan.push({ who: 'hen', after: 0.3, beats: [b(hen(h, 'RootB'), 0.16, 'rootTwang'), b(hen(h, 'Root'), 0.3)] })
    return plan
  },
  squint: (h) => [{ who: 'hen', after: 0.1, beats: [b(hen(h, 'Tuck'), 0.8, 'henRustle')] }, ...DOG.squint(h)],
  hint(h) {
    if (h.eggs === 3) return null
    return { at: { x: HEN.x + 20, y: HEN.y + 10 }, glow: { x: HEN.x - 10, y: HEN.y - 20, rx: 170, ry: 136 } }
  },
}
