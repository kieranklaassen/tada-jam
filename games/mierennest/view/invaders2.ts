import { HIGHLIGHT, MUD, RAIDER, SAND } from './palette'
import { bow, edged, eye, line, oval, shape } from './parts'
import type { Ctx, Look } from './parts'
import { antFigure } from './parts2'
import type { AntBuild, AntPose } from './parts2'

// The raid goes wrong, and the raiders take it badly: buried, rolled up, rolled flat, shrugging, making themselves
// at home, and going up a wall. Nobody is hurt; everybody is bewildered, sulking or embarrassed. Each pose stays in
// the box of its kind and is painted with the middle of its feet at the origin, facing right. The beetle's and the
// fly's are in `invaders3`. The last pose is for when somebody walks past: it ducks, and hides its face.

export const RAID_RAIDER = ['buried', 'balled', 'flat', 'shrug', 'lie', 'climb', 'duck'] as const

const POSES: Record<string, AntPose> = {
  // Sand up to its feelers: the body is somewhere under the heap, and only the top of the head looks out.
  buried: {
    ab: [-22, -7, 0], th: [2, -7, 0], hd: [24, -13.5, -0.1],
    legs: [[-20, 0, 0, -2], [0, 0, 0, -2], [14, 0, 0, -2]],
    feel: [-1, -13, 0.25], flick: [5, 3], face: { mouth: 'none', jaws: 0.05, bias: [0, -0.4] },
  },
  // Rolled up in a ball of mud: the head looks out of it low at the front, and the feet are painted apart.
  balled: {
    ab: [-10, -12, 0.3], th: [-4, -13, -0.2], hd: [13, -11.5, 0],
    legs: [[-10, -8, 0, 0], [-5, -7, 0, 0], [0, -8, 0, 0]],
    feel: [1, -7, -0.5], flick: [4, 4], face: { mouth: 'wavy', jaws: 0.1 },
  },
  // Rolled flat like pastry: as long as ever and as thin as a leaf, legs out along the floor, feelers flopped.
  flat: {
    ab: [-28, -4.4, 0], th: [3, -4, 0], hd: [30, -5.4, 0],
    legs: [[-33, 0, -4, -1.5], [-9, 0, -5, -1], [22, 0, 4, -1.5]],
    far: [[-21, 0, -3, -4.5], [14, 0, 4, -4.5], [38, 0, 5, -4]],
    feel: [5, 3, -0.3], flick: [-12, -5], face: { dizzy: true, mouth: 'wavy', jaws: 0.1 },
  },
  // Half up on its rump, head tipped back, both forelegs spread with the hands turned up: who, me?
  shrug: {
    ab: [-30, -9.5, 0.08], th: [-3, -11.5, -0.36], hd: [14, -15.5, -0.55],
    legs: [[-22, 0, -4, -7], [-6, 0, -5, 0], [40, -14, 0, 8, 1]],
    far: [[-14, 0, -4, -7], [3, 0, -5, 0], [-19, -24, -5, 5, 1]],
    feel: [-4, -7, 0.3], face: { mouth: 'flat', jaws: 0.5, bias: [0.4, -0.6] },
  },
  // On its back in the middle of somebody else's room: the body on the floor, the head tipped back on its helmet,
  // the forelegs folded on its chest, one hind leg up as a knee and the other crossed over it with a foot in the air.
  lie: {
    ab: [-30, -9.5, 0.02], th: [3, -9, 0], hd: [31, -11.5, -0.3],
    legs: [[-31, -27, 3, -7, 1], [10, -13, -6, -5, 1], [-4, -14, 7, -6, 1]],
    far: [[-27, 0, 1, -21, 1], [14, -14, -4, -5, 1], [15, -17, 4, -7, 1]],
    feel: [3, 7, -0.2], flick: [3, -3], face: { lid: 0.42, tilt: 0.15, mouth: 'teeth', jaws: 0.2, bias: [0.3, 0] },
  },
  // Pressed along a surface with its legs spread wide before and behind, tongue out with the effort. The game
  // turns the picture to stand it up a wall.
  climb: {
    ab: [-29, -8.6, 0.03], th: [3, -8.4, 0], hd: [31, -10.5, -0.06],
    legs: [[-40, 0, -7, -2], [-2, 0, -6, 0], [44, 0, 8, -2]],
    far: [[-24, 0, -6, -3], [15, 0, 5, -1], [31, 0, 5, -3]],
    feel: [6, -6, 0.3], flick: [2, 6], face: { lid: 0.12, mouth: 'tongue', jaws: 0.25, bias: [0.7, -0.3] },
  },
  // Ducking: flat on its belly with its feet tucked in and its helmet pulled right down over its face, so that
  // nobody can see it. The head is painted small, inside the helmet that is painted over it, feelers and all.
  duck: {
    ab: [-32, -9, 0.03], th: [0, -8.6, 0.03], hd: [25, -8.5, 0],
    legs: [[-20, 0, -3, -3], [-6, 0, -3, -2], [4, 0, 2, -2]],
    feel: [-9, 0, 0], face: { hidden: true, mouth: 'none' },
  },
}

/** A heap of sand over the buried raider, with a dip in it where the eyes look out. */
function heap(ctx: Ctx): void {
  const mound = (fill: string, dy: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(-56, 0)
    ctx.bezierCurveTo(-45, -19 + dy, -24, -27 + dy, -5, -21 + dy)
    ctx.bezierCurveTo(4, -17 + dy, 8, -9.5 + dy, 20, -8.6 + dy)
    ctx.bezierCurveTo(30, -8 + dy, 38, -13 + dy, 45, -12.5 + dy)
    ctx.bezierCurveTo(52, -11 + dy, 54, -4, 57, 0)
    ctx.closePath()
    ctx.fill()
  }
  mound(SAND.edge, 0)
  ctx.save()
  ctx.clip()
  mound(SAND.fill, 2.6)
  for (const [x, y] of [[-40, -6], [-27, -14], [-12, -9], [2, -4], [16, -3.4], [30, -5], [45, -6], [-18, -18], [-48, -2.5], [38, -2.4]]) oval(ctx, x, y, 1.3, 1, 0, SAND.edge)
  ctx.restore()
  bow(ctx, 'rgba(255,255,255,0.75)', 2.2, -22, -9, 22, 13, 0, -2.3, -1.6)
  // What slid off it: a few grains on the helmet and on the floor.
  for (const [x, y] of [[17, -24.5], [24, -26.5], [29, -24], [-58, -1.2], [59, -1.2]]) oval(ctx, x, y, 1.4, 1.1, 0, SAND.fill)
}

/** A foot that sticks out of the ball of mud at angle `a`, wriggling a little. */
function footOut(ctx: Ctx, a: number, t: number, lit: string): void {
  const w = a + Math.sin(t * 6 + a * 3) * 0.12
  edged(ctx, RAIDER.leg, lit, 5.6, -6 + Math.cos(a) * 9, -15 + Math.sin(a) * 9, -6 + Math.cos(w) * 18.5, -15 + Math.sin(w) * 18.5, 0, 0)
}

/** The ball of mud it is rolled up in, 30 across: a pale lip, a dark underside and one wet glint. */
function mudBall(ctx: Ctx): void {
  oval(ctx, -6, -15, 15, 15, 0, MUD.lip)
  oval(ctx, -5.6, -14, 13.8, 13.6, 0, MUD.fill)
  oval(ctx, -4.6, -10.6, 10.6, 8.6, 0, MUD.edge)
  oval(ctx, -5.6, -13.6, 11.6, 10, 0, MUD.fill)
  line(ctx, MUD.shine, 2.4, [-13.4, -19.4, -9.4, -23.4])
  oval(ctx, -5.4, -24.4, 1.1, 1.1, 0, MUD.shine)
}

/** Over the head of a pose, in the frame of the head: both eyes again, each looking at the other. */
function crossedEyes(ctx: Ctx, b: AntBuild, hd: readonly number[]): void {
  const g = b.gear
  if (!g) return
  const [rx, ry] = b.hd
  ctx.save()
  ctx.translate(hd[0], hd[1])
  ctx.rotate(hd[2] ?? 0)
  const x = rx * 0.26
  const y = -ry * 0.08
  eye(ctx, x + b.eye * 1.36, y + b.eye * 0.12, b.eye * 0.84, { x: -0.9, y: 0.45 }, { white: g.eye })
  oval(ctx, x, y, b.eye * 1.14, b.eye * 1.14, 0, g.mask)
  eye(ctx, x, y, b.eye, { x: 0.9, y: 0.45 }, { white: g.eye })
  line(ctx, g.brim, 3.4, [-rx * 1.12, -ry * 0.5 + 2, rx * 1.16, -ry * 0.5 - 0.5])
  ctx.restore()
}

/** Over a shrug: one dent in the front of the helmet, and the two hands turned up. The dent is a small filled patch
 *  in the dark of the brim: two pale dashes side by side on the helmet read as a sign. */
function shrugging(ctx: Ctx, b: AntBuild, p: AntPose): void {
  const g = b.gear
  if (!g) return
  ctx.save()
  ctx.translate(p.hd[0], p.hd[1])
  ctx.rotate(p.hd[2] ?? 0)
  oval(ctx, 7.4, -10, 3.3, 1.8, 0.22, g.brim)
  ctx.restore()
  const hand = (l: readonly number[], core: string) => {
    oval(ctx, l[0], l[1] - 3.6, 5.2, 2.6, -0.1, b.leg)
    oval(ctx, l[0], l[1] - 4.1, 3.6, 1.3, -0.1, core)
  }
  hand(p.legs[2], b.lit)
  if (p.far) hand(p.far[2], b.dark)
}

/** Over a ducking raider: its helmet, sat on the floor like a pot with the head gone inside it, and the two feelers
 *  that come out from under the brim and stand up in front of it to feel who is there. `x` is the middle of it. */
function potHelmet(ctx: Ctx, b: AntBuild, x: number, t: number): void {
  const g = b.gear
  if (!g) return
  const feel = Math.sin(t * 5) * 1.6
  for (const [pts, core] of [[[x + 12, -3, x + 25, -11 + feel, x + 32, -6 + feel], b.dark], [[x + 15, -3, x + 19, -19 - feel, x + 28, -17.5 - feel], b.lit]] as const) {
    line(ctx, b.leg, 3.5, pts)
    line(ctx, core, 1.4, pts)
  }
  shape(ctx, g.helmet, [x - 9, -16, x + 3, -16.5, x - 6, -28])
  ctx.fillStyle = g.helmet
  ctx.beginPath()
  ctx.moveTo(x - 17.5, -2)
  ctx.bezierCurveTo(x - 18.5, -24.5, x + 13, -25, x + 17, -3)
  ctx.closePath()
  ctx.fill()
  line(ctx, g.brim, 3.8, [x - 20, -2.2, x + 20.5, -3])
  bow(ctx, HIGHLIGHT, 2.2, x - 1.5, -6, 11.5, 10, 0, -2.3, -1.5)
}

/** Paints a raider in one of the raid's poses and says so; says no, and paints nothing, for any other pose. */
export function paintRaidRaider(ctx: Ctx, build: AntBuild, pose: string, look: Look, t: number): boolean {
  const p = POSES[pose]
  if (!p) return false
  if (pose === 'buried') {
    antFigure(ctx, build, p, look, t)
    heap(ctx)
  } else if (pose === 'balled') {
    // Four feet out of the far side of the ball, the raider with a short rump inside it, the ball, and the face.
    for (const a of [-2.75, -2.0, -1.1]) footOut(ctx, a, t, build.dark)
    footOut(ctx, 2.6, t, build.lit)
    const curled = { ...build, ab: [10, 7.5] as const }
    antFigure(ctx, curled, p, look, t)
    mudBall(ctx)
    // The head again, over the ball it looks out of: the same figure, cut down to its head, helmet and jaws.
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(p.hd[0] + 1, p.hd[1], build.hd[0] + 0.5, build.hd[1] + 1, 0, 0, Math.PI * 2)
    ctx.rect(p.hd[0] - build.hd[0] - 3, p.hd[1] - 30, build.hd[0] * 2 + 8, 30 - build.hd[1] * 0.3)
    ctx.rect(p.hd[0] + 6, p.hd[1] - 30, 32, 44)
    ctx.clip()
    antFigure(ctx, curled, p, look, t)
    ctx.restore()
    crossedEyes(ctx, build, p.hd)
  } else if (pose === 'flat') {
    antFigure(ctx, { ...build, ab: [25, 4.2], th: [14, 3.8], hd: [15, 5.2], eye: 4.7 }, p, look, t)
  } else if (pose === 'lie') {
    // The foot in the air wags.
    const wag = Math.sin(t * 2.2) * 2.5
    antFigure(ctx, build, { ...p, legs: p.legs.map((l, i) => (i === 0 ? [l[0] + wag, l[1], l[2], l[3], l[4]] : l)) }, look, t)
  } else {
    antFigure(ctx, pose === 'duck' ? { ...build, hd: [7, 5] } : build, p, look, t)
    if (pose === 'shrug') shrugging(ctx, build, p)
    else if (pose === 'duck') potHelmet(ctx, build, p.hd[0] + 3, t)
  }
  return true
}
