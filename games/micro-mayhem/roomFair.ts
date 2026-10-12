import { TIDY_L, bakerIdle, bakerSet } from './artBaker'
import type { Beat } from './figure'
import { bakerWears, tapBellyAtFair, tapPump, type House, pieOnFace } from './house'
import { FLOOR_Y, GLASS, STAIRS_X } from './layout'
import type { Pen, Picture } from './pen'
import { box, fill, rr, scatter } from './print'
import { b, type Answer, type Cast, type Part, type RoomDef, type Target } from './room'
import { dogKit } from './roomDog'

// The fair. The baker stands at the balloon stall with both hands on the
// pump. Its thing is the balloon: three pumps swell it until it bursts, and
// its rubber lands on his head, where it stays in every room.

const D = Math.PI / 180

/** The top of the nozzle the balloon sits on. */
const NOZZLE = { x: 522, y: 664 }

// --- The print ---------------------------------------------------------------

function print(p: Pen): void {
  const top = GLASS.y, bottom = GLASS.y + GLASS.h
  fill(p, '#cfeaf9', () => box(p, GLASS.x, top, STAIRS_X - GLASS.x, FLOOR_Y - top))
  // Clouds, and far hills.
  fill(p, '#ffffff', () => { p.ell(240, 250, 70, 26); p.ell(290, 232, 46, 26); p.ell(820, 300, 64, 22); p.ell(778, 286, 40, 22) })
  fill(p, '#b5e0a0', () => p.blob([GLASS.x, FLOOR_Y, GLASS.x, 500, 260, 450, 520, 510, 760, 460, STAIRS_X, 500, STAIRS_X, FLOOR_Y]))
  // The big top, with wavy stripes and a flag.
  fill(p, '#fff3d6', () => p.blob([560, 540, 590, 420, 700, 330, 810, 420, 840, 540]))
  fill(p, '#f58fb0', () => { p.blob([612, 540, 634, 430, 700, 344, 664, 440, 660, 540]); p.blob([742, 540, 738, 440, 700, 344, 772, 430, 792, 540]) })
  fill(p, '#c85f86', () => p.line([700, 334, 700, 286], 5))
  fill(p, '#ffd75e', () => p.blob([702, 286, 744, 296, 702, 312]))
  // A helter-skelter: a tower with a slide wound round it.
  fill(p, '#8fa9ea', () => p.blob([866, 550, 876, 330, 906, 300, 936, 330, 946, 550]))
  fill(p, '#ffd75e', () => { p.line([868, 520, 906, 498, 946, 506], 12); p.line([872, 448, 906, 428, 942, 438], 12); p.line([876, 380, 906, 362, 938, 370], 12) })
  fill(p, '#e8705f', () => p.blob([880, 304, 906, 262, 932, 304]))
  fill(p, '#9fd98f', () => box(p, GLASS.x, FLOOR_Y, STAIRS_X - GLASS.x, bottom - FLOOR_Y))
  fill(p, '#8acb78', () => { const next = scatter(7); for (let i = 0; i < 26; i++) { const x = 50 + next() * 930, y = 590 + next() * 140; p.line([x, y, x + 4, y - 12 - next() * 8], 3) } })
  // The awning of the stall along the top: scallops of uneven width, and two posts.
  fill(p, '#e8705f', () => box(p, GLASS.x, top, STAIRS_X - GLASS.x, 58))
  fill(p, '#fff3d6', () => { const next = scatter(3); for (let x = GLASS.x + 20; x < STAIRS_X; x += 96 + next() * 50) p.blob([x, top, x + 44, top, x + 40, top + 58, x + 6, top + 58]) })
  fill(p, '#e8705f', () => { const next = scatter(5); for (let x = GLASS.x + 10; x < STAIRS_X; x += 58 + next() * 26) p.ell(x, top + 62, 30 + next() * 8, 16) })
  fill(p, '#c9803a', () => { p.line([56, 96, 60, 400, 56, 724], 16); p.line([966, 250, 962, 500, 966, 724], 14) })
  // Prizes hung from the awning: a bear, a fish and a striped ball.
  fill(p, '#c9803a', () => { p.ell(140, 150, 28, 34); p.ell(140, 110, 22, 20); p.ell(122, 94, 9, 9); p.ell(158, 94, 9, 9) })
  fill(p, '#f3d6a8', () => { p.ell(140, 116, 10, 8); p.ell(140, 156, 15, 18) })
  fill(p, '#6fcdbb', () => { p.ell(900, 160, 34, 18); p.poly([930, 160, 956, 142, 956, 178]) })
  fill(p, '#ffd75e', () => p.ell(470, 132, 26, 26))
  fill(p, '#f58fb0', () => p.blob([448, 122, 470, 114, 492, 122, 492, 142, 470, 150, 448, 142]))
  // The pump: a cylinder on a plate, with the hose that runs to the nozzle.
  fill(p, '#7b828d', () => p.line([436, 694, 470, 716, 506, 700, NOZZLE.x, NOZZLE.y + 8], 9))
  fill(p, '#5b616b', () => rr(p, 388, 700, 68, 18, 8))
  fill(p, '#e8705f', () => rr(p, 404, 566, 36, 140, 14))
  fill(p, '#f4a093', () => p.line([413, 580, 414, 640, 413, 692], 5))
  fill(p, '#5b616b', () => { p.ell(NOZZLE.x, NOZZLE.y + 10, 12, 9) })
  // The candy cart: a tub of floss on two wheels.
  fill(p, '#fff3d6', () => rr(p, 740, 610, 108, 76, 14))
  fill(p, '#f58fb0', () => { p.ell(772, 590, 30, 30); p.ell(814, 584, 26, 28); p.ell(794, 562, 22, 22) })
  fill(p, '#5b616b', () => { p.ell(762, 700, 17, 17); p.ell(828, 700, 17, 17) })
  fill(p, '#c9c2b0', () => { p.ell(762, 700, 7, 7); p.ell(828, 700, 7, 7) })
}

// --- The segments ------------------------------------------------------------

/** The handle of the pump at a height, with the rod under it: a bow his two hands close round. */
function handle(p: Pen, y: number): void {
  p.line([146, y + 12, 178, y - 6, 210, y + 12], 13)
  p.line([178, y, 178, -152], 7)
}

const F = bakerSet(
  'f',
  260,
  700,
  0.9,
  {
    up: { armL: [-84, -262, -10, -246, 148, -262], armR: [84, -262, 150, -300, 208, -262], legs: 'stand', breathes: true, held: (p) => handle(p, -270) },
    // One hand leaves the pump to straighten the tip of his moustache.
    tidy: { armL: TIDY_L, armR: [84, -262, 150, -300, 208, -262], legs: 'stand', held: (p) => handle(p, -270) },
    // Or to lift his cap and set it straight.
    cap: { armL: [-84, -262, -152, -340, -72, -408], armR: [84, -262, 150, -300, 208, -262], legs: 'stand', held: (p) => handle(p, -270) },
    down: { armL: [-84, -238, -10, -190, 148, -186], armR: [84, -238, 150, -214, 208, -186], legs: 'bent', held: (p) => handle(p, -170) },
    toes: { armL: [-84, -284, -10, -270, 148, -286], armR: [84, -284, 150, -320, 208, -286], legs: 'toes', held: (p) => handle(p, -270) },
    letGo: { armL: [-84, -262, -150, -240, -176, -180], armR: [84, -262, 150, -240, 176, -180], legs: 'bent', shake: true, held: (p) => handle(p, -250) },
    shock: { armL: [-84, -262, -140, -320, -128, -390], armR: [84, -262, 140, -320, 128, -390], legs: 'stand', held: (p) => handle(p, -250) },
  },
  {
    calm: { eyes: 'calm', whiskers: 'down' },
    blink: { eyes: 'shut', whiskers: 'down' },
    puff: { eyes: 'squint', whiskers: 'level', cheeks: true },
    glad: { eyes: 'glad', whiskers: 'up', mouth: 'grin' },
    shock: { eyes: 'wide', whiskers: 'wild', mouth: 'o' },
  },
)

function neck(p: Pen, to: readonly [number, number]): void {
  p.line([NOZZLE.x, NOZZLE.y, (NOZZLE.x + to[0]) / 2 - 6, (NOZZLE.y + to[1]) / 2, to[0], to[1]], 9)
}

function balloon(p: Pen, x: number, y: number, rx: number, ry: number): void {
  neck(p, [x - rx * 0.5, y + ry * 0.84])
  p.ell(x, y, rx, ry)
  p.poly([x - rx * 0.5 - 10, y + ry * 0.86, x - rx * 0.5 + 12, y + ry * 0.8, x - rx * 0.5 + 2, y + ry * 0.86 + 14])
  p.cut(() => p.ell(x - rx * 0.42, y - ry * 0.42, rx * 0.2, ry * 0.3, 0.6))
}

const DOG = dogKit('fd', 906, 716, 0.5, true)

const segments: Record<string, Picture> = {
  ...F.segments,
  ...DOG.segments,
  /** Small and limp on the nozzle. */
  balloon0: (p) => { neck(p, [540, 650]); p.ell(566, 642, 30, 17, -0.4); p.cut(() => p.ell(560, 636, 8, 4, -0.4)) },
  balloon0Flap: (p) => { neck(p, [540, 646]); p.ell(562, 628, 30, 17, -1); p.ell(596, 600, 8, 4, -0.9); p.ell(612, 630, 8, 4, 0.2) },
  balloon1: (p) => balloon(p, 610, 578, 64, 68),
  balloon2: (p) => balloon(p, 672, 474, 130, 138),
  /** The moment before it bursts: it fills the stall. */
  balloonFill: (p) => balloon(p, 702, 412, 172, 170),
  /** The burst: scraps of rubber thrown out all round where it was. */
  burst: (p) => {
    for (const [x, y, turn, long] of [[548, 300, 0.7, 30], [622, 226, 1.3, 36], [716, 196, -1.5, 30], [806, 232, -0.9, 38], [872, 316, -0.4, 30], [560, 470, -0.5, 34], [660, 560, 0.2, 30], [770, 520, 0.9, 28]]) {
      p.at(x, y, () => { p.blob([-long, -4, 0, -11, long, 0, 6, 9, -long * 0.6, 8]) }, { turn })
    }
    for (let i = 0; i < 7; i++) p.at(702, 400, () => p.ell(70, 0, 20, 5), { turn: (i * 51 + 12) * D })
  },
  /** The neck of the balloon flapping as it goes down. */
  neckFlap: (p) => { p.ell(500, 628, 9, 4, 0.9); p.ell(486, 650, 9, 4, 0.2); p.ell(540, 612, 9, 4, -1.2) },
}

// --- The rules ---------------------------------------------------------------

function baker(h: House, body = 'up', face = 'calm', hat?: 'other'): string[] {
  return F.cast(body, face, h, hat)
}

function rest(h: House): Cast {
  return { balloon: h.balloon === 3 ? [] : [`balloon${h.balloon}`], baker: baker(h), dog: DOG.rest(h) }
}

function targets(h: House): Target[] {
  const out: Target[] = [{ id: 'pump', shape: { x: 378, y: 420, w: 100, h: 296 } }, { id: 'nose', shape: F.head }, { id: 'belly', shape: F.belly }]
  if (h.balloon === 0) out.push({ id: 'balloon', shape: { x: 560, y: 640, rx: 50, ry: 44 } })
  if (h.balloon === 1) out.push({ id: 'balloon', shape: { x: 610, y: 578, rx: 70, ry: 74 } })
  if (h.balloon === 2) out.push({ id: 'balloon', shape: { x: 672, y: 474, rx: 132, ry: 140 } })
  if (DOG.rest(h).length > 0) out.push({ id: 'dog', shape: DOG.area })
  return out
}

function touch(id: string, h: House): Answer | null {
  switch (id) {
    case 'pump': {
      const out = tapPump(h)
      if (out.came === 'again') return { plan: [{ who: 'baker', beats: [b(baker(h, 'down', 'puff'), 0.25, 'pumpEmpty'), b(baker(h, 'up', 'calm', 'other'), 0.3, 'rubberFlap'), b(baker(h), 0.2)] }] }
      if (out.came === 'punch') {
        // It fills the stall and bursts, and the rubber lands on his head.
        return {
          house: out.house,
          save: 'now',
          scene: true,
          plan: [
            { who: 'baker', beats: [b(baker(h, 'down', 'puff'), 0.4, 'pumpWheezeC'), b(baker(h, 'shock', 'shock'), 0.3), b(baker(out.house, 'shock', 'shock', 'other'), 0.5, 'rubberRasp'), b(baker(out.house, 'up', 'blink'), 0.4)] },
            { who: 'balloon', beats: [b('balloonFill', 0.4), b('burst', 0.3, 'burstCrack'), b([], 0.9)] },
            ...DOG.startle(h, 0.42),
          ],
        }
      }
      return {
        house: out.house,
        save: 'now',
        plan: [
          { who: 'baker', beats: [b(baker(h, 'down', 'puff'), 0.4, h.balloon === 0 ? 'pumpWheezeA' : 'pumpWheezeB'), b(baker(out.house), 0.4)] },
          { who: 'balloon', beats: [b(`balloon${out.house.balloon}`, 0.8)] },
        ],
      }
    }
    case 'belly': {
      const out = tapBellyAtFair(h)
      if (out.came === 'joke') {
        // He giggles, and whatever rubber there is flaps.
        const plan: Part[] = [{ who: 'baker', beats: [b(baker(h, 'letGo', 'glad', 'other'), 0.5, 'bakerGiggle'), b(baker(h), 0.3)] }]
        if (h.balloon === 0) plan.push({ who: 'balloon', beats: [b('balloon0Flap', 0.3, 'rubberFlap'), b('balloon0', 0.2)] })
        return { plan }
      }
      return {
        house: out.house,
        save: 'now',
        plan: [
          { who: 'baker', beats: [b(baker(h, 'letGo', 'glad'), 0.6, 'bakerGiggle'), b(baker(out.house), 0.3)] },
          { who: 'balloon', beats: [b([`balloon${out.house.balloon}`, 'neckFlap'], 0.5, 'balloonRasp'), b(`balloon${out.house.balloon}`, 0.2)] },
        ],
      }
    }
    case 'nose':
      return { plan: [{ who: 'baker', beats: [b(baker(h, 'up', 'puff', 'other'), 0.4, 'bakerHum'), b(baker(h), 0.3)] }] }
    case 'balloon':
      return { plan: [{ who: 'balloon', beats: h.balloon === 0 ? [b('balloon0Flap', 0.25, 'balloonSqueak'), b('balloon0', 0.2)] : [b(`balloon${h.balloon}`, 0.3, 'balloonSqueak')] }] }
    case 'dog':
      return { plan: [DOG.tap(h)] }
    default:
      return null
  }
}

/** What he has on his head is seen as he turns. */
function carried(h: House): Beat[] {
  if (bakerWears(h) !== 'cap') return [b(baker(h, 'up', 'calm', 'other'), 0.13, 'rubberFlap'), b(baker(h), 0.1), b(baker(h, 'up', 'calm', 'other'), 0.13, 'rubberFlapB'), b(baker(h), 0.3)]
  return []
}

export const fair: RoomDef = {
  id: 'fair',
  print,
  segments,
  ghosts: ['fBody_up', 'fHead_calm_stand', 'fHat_cap_stand', 'balloon1', 'balloonFill', ...DOG.ghosts],
  enter: () => ({}),
  rest,
  idle(who, h, _live, rng) {
    if (who === 'baker') {
      // He straightens his moustache, or, while it is his cap he wears, lifts the cap and sets it straight.
      const moustache = [b(baker(h, 'tidy', 'glad'), 0.5), b(baker(h), 0.2)]
      const cap = [b(baker(h, 'cap', 'calm', 'other'), 0.3), b(baker(h, 'cap', 'glad'), 0.3), b(baker(h), 0.2)]
      const tidy = pieOnFace(h) ? null : bakerWears(h) === 'cap' && rng.next() < 0.5 ? cap : moustache
      return bakerIdle(rng.next(), rng.next(), baker(h), baker(h, 'upIn'), baker(h, 'up', 'blink'), tidy)
    }
    if (who === 'balloon' && h.balloon === 0) return [b('balloon0', 3 + rng.next() * 3), b('balloon0Flap', 0.18)]
    if (who === 'dog') return DOG.idle(h, rng)
    return null
  },
  targets,
  touch,
  leave(h) {
    // Swollen, it lifts the baker onto his toes as the door opens.
    if (h.balloon === 1 || h.balloon === 2) return [{ who: 'baker', beats: [b(baker(h, 'toes', 'shock'), 0.5, 'balloonSqueak')] }]
    if (h.balloon === 0) return [{ who: 'balloon', beats: [b('balloon0Flap', 0.3, 'balloonRasp')] }]
    return [{ who: 'baker', beats: [b(baker(h, 'up', 'calm', 'other'), 0.3, 'rubberFlap')] }]
  },
  arrive(h) {
    const plan: Part[] = [...DOG.arrive(h)]
    const beats = carried(h)
    if (beats.length > 0) plan.push({ who: 'baker', after: 0.3, beats })
    return plan
  },
  squint: (h) => [{ who: 'baker', after: 0.1, beats: [b(baker(h, 'up', 'puff'), 0.8, 'bakerHide')] }, ...DOG.squint(h)],
  hint(h) {
    if (h.balloon === 3) return null
    return { at: { x: 424, y: 470 }, glow: { x: 424, y: 520, rx: 70, ry: 150 } }
  },
}
