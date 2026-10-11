import { GRASS, HIGHLIGHT, MUD, SAND, STONE, WOOD } from './palette'
import { bow, line, oval, shape } from './parts'
import type { Ctx } from './parts'

// The two machines the workers built: a catapult and a cannon, of twigs, grass thread, an acorn cup and a hollow
// reed, on pebble wheels. Flat colour and one hard highlight on each glossy part, like the creatures who made them.

export type MachineKind = 'catapult' | 'cannon'
export type Load = 'sand' | 'mud' | 'stone' | null
export type MachinePose = 'ready' | 'fired'

/** The box of a machine: two cells wide and two high. */
export const MACHINE_SIZE = { width: 56, height: 56 } as const

// What the palette has not got: grass thread and its shade, the acorn cup with its rim and its dark side, the reed
// with its shaded belly, its joints and the dark of its bore, and the dust of a shot.
const THREAD = '#f3e9c6'
const THREAD_SHADE = '#b9a877'
const CUP = '#a9743a'
const CUP_DARK = '#6e4520'
const CUP_RIM = '#d9a866'
const REED = '#bccd68'
const REED_DARK = '#83953c'
const REED_JOINT = '#66762a'
const BORE = '#231a10'
const DUST = '#efe6d2'

/** A twig: a dark bark edge round a lit core, with round ends. */
function twig(ctx: Ctx, width: number, pts: readonly number[], curve = false): void {
  line(ctx, WOOD.dark, width, pts, curve)
  line(ctx, WOOD.light, width * 0.46, pts, curve)
}

/** A lashing of grass thread round a joint: three short turns side by side, across the twig. */
function lash(ctx: Ctx, x: number, y: number, turn: number, half = 3.2): void {
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  for (const k of [-1.5, 0, 1.5]) line(ctx, k === 0 ? THREAD : THREAD_SHADE, 1.5, [x + c * k - s * half, y + s * k + c * half, x + c * k + s * half, y + s * k - c * half])
}

/** A pebble for a wheel, with the peg it turns on. */
function wheel(ctx: Ctx, x: number, y: number, r: number): void {
  oval(ctx, x, y, r, r, 0, STONE.edge)
  oval(ctx, x - 0.3, y - 0.9, r - 0.9, r - 1.2, 0, STONE.fill)
  bow(ctx, HIGHLIGHT, 1.7, x, y, r * 0.6, r * 0.56, 0, -2.6, -1.7)
  oval(ctx, x, y, 1.9, 1.9, 0, WOOD.peg)
}

/** What is loaded, as a mound of half width `r` that stands on (0, 0) of the current frame: pale grains of sand,
 *  a dark wet lump of mud with its glint, or a grey stone. */
function mound(ctx: Ctx, load: Load, r: number): void {
  if (load === 'sand') {
    oval(ctx, 0, -r * 0.25, r, r * 0.72, 0, SAND.edge)
    oval(ctx, -0.3, -r * 0.38, r * 0.86, r * 0.6, 0, SAND.fill)
    for (const [x, y] of [[-r * 0.4, -r * 0.5], [r * 0.3, -r * 0.2], [r * 0.05, -r * 0.72]]) oval(ctx, x, y, 0.8, 0.8, 0, SAND.edge)
  } else if (load === 'mud') {
    oval(ctx, 0, -r * 0.3, r, r * 0.8, 0, MUD.lip)
    oval(ctx, 0.2, -r * 0.2, r * 0.84, r * 0.66, 0, MUD.fill)
    line(ctx, MUD.shine, 1.5, [-r * 0.5, -r * 0.5, -r * 0.1, -r * 0.7])
  } else if (load === 'stone') {
    oval(ctx, 0, -r * 0.45, r * 0.92, r * 0.8, 0.2, STONE.edge)
    oval(ctx, -0.3, -r * 0.6, r * 0.74, r * 0.6, 0.2, STONE.shine)
    oval(ctx, 0.3, -r * 0.42, r * 0.7, r * 0.56, 0.2, STONE.fill)
    line(ctx, HIGHLIGHT, 1.5, [-r * 0.45, -r * 0.7, -r * 0.05, -r * 0.86])
  }
}

/** A few crumbs of what was shot, left behind: on the lip of the cup, in the dust at the muzzle. */
function crumbs(ctx: Ctx, load: Load, pts: readonly number[]): void {
  if (!load) return
  const fill = load === 'sand' ? SAND.fill : load === 'mud' ? MUD.lip : STONE.fill
  for (let i = 0; i < pts.length; i += 2) oval(ctx, pts[i], pts[i + 1], load === 'mud' ? 1.6 : 1.2, load === 'mud' ? 1.2 : 1.1, 0, fill)
}

/** The acorn cup at the end of the arm, in a frame whose (0, 0) is the middle of its rim and whose mouth opens
 *  toward negative y: a knobbly bowl, a pale rim, and whatever lies in it. */
function acornCup(ctx: Ctx, load: Load, full: boolean): void {
  const bowl = (fill: string, r: number, dy: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(-r, dy)
    ctx.bezierCurveTo(-r, r * 1.25 + dy, r, r * 1.25 + dy, r, dy)
    ctx.closePath()
    ctx.fill()
  }
  bowl(CUP_DARK, 10, 0)
  bowl(CUP, 8.6, -0.7)
  // The scales of the cup: a few dark knobs, and the stub of its stalk underneath.
  for (const [x, y] of [[-4.6, 3], [0.4, 6.2], [4.8, 3], [-0.4, 2.2], [-2.6, 6.6], [3.2, 6.8]]) oval(ctx, x, y, 1.3, 1, 0, CUP_DARK)
  line(ctx, CUP_DARK, 2.8, [0, 9.4, 0.6, 11.6])
  if (full) mound(ctx, load, 8.4)
  else oval(ctx, 0, 0.6, 8, 2.4, 0, BORE)
  line(ctx, CUP_RIM, 2.6, [-9.2, 0, 9.2, 0])
  if (!full) crumbs(ctx, load, [-6.4, -2, 5.6, -2.2, -1, -2.6])
}

// The catapult: a twig sledge on two pebbles, a forked twig at the front for the arm to slap into, and the arm
// itself, a blade of grass rooted in the sledge. Bent back and tied down it holds the cup low behind; let go, it
// stands up in the fork with the thread still swinging from it.
function catapult(ctx: Ctx, load: Load, pose: MachinePose): void {
  const ready = pose === 'ready'
  // The wheels and the sledge.
  wheel(ctx, -16, -6.5, 6.5)
  wheel(ctx, 16, -6.5, 6.5)
  twig(ctx, 5.4, [-25, -13.5, 25, -13.5])
  // The far tine of the fork, behind the arm.
  twig(ctx, 3.6, [14, -27, 20.5, -38])
  // The arm: a springy blade from its root in the sledge to the cup.
  const tip = ready ? [-15, -25] : [16, -50]
  const blade = ready ? [0, -14, 7, -55, -13, -27] : [0, -14, 10, -30, 15, -49]
  // The thread that holds it down: taut from the arm to the sledge when ready, loose and wobbling once it has gone.
  if (ready) {
    line(ctx, THREAD_SHADE, 2.6, [-7, -32.5, -6, -14])
    line(ctx, THREAD, 1.4, [-7, -32.5, -6, -14])
  } else line(ctx, THREAD, 1.6, [11, -41, 0, -39, 9, -31, 1, -26], true)
  line(ctx, GRASS.dark, 6, blade, true)
  line(ctx, GRASS.light, 3.2, blade, true)
  lash(ctx, 0, -15, 0, 3.6)
  // The post of the fork and its near tine, lashed to the sledge.
  twig(ctx, 4.4, [14, -13, 14, -27])
  twig(ctx, 3.6, [14, -27, 8, -38])
  lash(ctx, 14, -16.5, Math.PI / 2, 3)
  ctx.save()
  ctx.translate(tip[0], tip[1])
  ctx.rotate(ready ? -0.1 : 0.75)
  acornCup(ctx, load, ready)
  ctx.restore()
  if (!ready) line(ctx, THREAD, 1.6, [-6, -15.5, -11, -19.5, -15, -15.5], true)
}

// The cannon: a fat length of hollow reed, level, tied into two twig forks on a sledge with two pebble wheels. The
// load peeps out of the muzzle; fired, the barrel has slid back in its forks and a small puff sits at its mouth.
function cannon(ctx: Ctx, load: Load, pose: MachinePose): void {
  const fired = pose === 'fired'
  wheel(ctx, -15, -6.5, 6.5)
  wheel(ctx, 14, -6.5, 6.5)
  twig(ctx, 5.2, [-24, -13.5, 23, -13.5])
  // Two forks: each a pair of crossed twigs the barrel lies in.
  for (const x of [-12, 9]) {
    twig(ctx, 3.4, [x - 6, -14, x + 5, -29])
    twig(ctx, 3.4, [x + 6, -14, x - 5, -29])
  }
  ctx.save()
  ctx.translate(fired ? -5 : 0, -32)
  ctx.rotate(fired ? -0.1 : 0)
  // The barrel in its own frame, the muzzle at x = 16: a shaded belly, the lit reed, its two joints, a plug behind.
  const tube = (fill: string, top: number, low: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(16, top)
    ctx.lineTo(-17, top)
    ctx.quadraticCurveTo(-24, (top + low) / 2, -17, low)
    ctx.lineTo(16, low)
    ctx.closePath()
    ctx.fill()
  }
  tube(REED_DARK, -10, 10)
  tube(REED, -10, 6.4)
  for (const x of [-11, 4]) line(ctx, REED_JOINT, 2, [x, -9.4, x - 1.2, 0, x, 9.4], true)
  line(ctx, HIGHLIGHT, 2.2, [-8, -6.4, 1, -6.4])
  line(ctx, HIGHLIGHT, 2.2, [7, -6.4, 9, -6.4])
  // The thread that ties it into the forks.
  for (const x of [-13.5, 9.5]) {
    line(ctx, THREAD_SHADE, 3.6, [x, -9.6, x - 1, 0, x, 9.6], true)
    line(ctx, THREAD, 1.8, [x, -9.6, x - 1, 0, x, 9.6], true)
  }
  // The mouth: a pale lip round the dark of the bore, and what peeps out of it.
  oval(ctx, 16, 0, 4.6, 10.6, 0, REED_DARK)
  oval(ctx, 16, -0.6, 4.2, 10, 0, REED)
  oval(ctx, 16.4, 0, 3, 7.8, 0, BORE)
  if (!fired && load) {
    ctx.save()
    ctx.translate(15.5, 0)
    ctx.rotate(Math.PI / 2)
    mound(ctx, load, 6.8)
    ctx.restore()
    if (load === 'mud') line(ctx, MUD.lip, 2.4, [19, 6, 19.4, 11.5])
    if (load === 'sand') crumbs(ctx, load, [20, 11, 22.5, 12.5])
  }
  if (fired) {
    // The puff: three round blobs of dust, with a few crumbs of the shot in it.
    oval(ctx, 22, 1, 5.4, 5.4, 0, DUST)
    oval(ctx, 27, -4, 4.2, 4.2, 0, DUST)
    oval(ctx, 28.5, 4, 3.2, 3.2, 0, DUST)
    crumbs(ctx, load, [22, 2.4, 27.4, -3.4, 28.6, 4.6])
  }
  ctx.restore()
  // The fuse behind: a curl of thread, burnt short when it has fired.
  if (fired) line(ctx, THREAD_SHADE, 1.5, [-26, -36, -27.5, -39])
  else {
    line(ctx, THREAD, 1.3, [-22, -34, -26.5, -35, -25, -40, -27, -43], true)
    oval(ctx, -27, -43, 1.2, 1.2, 0, WOOD.peg)
  }
  shape(ctx, WOOD.peg, [-23.5, -11.5, -20.5, -11.5, -22, -9.5])
}

/** Paints a machine with the middle of its base at the origin, facing right; the caller flips it. `load` is what
 *  lies in its cup or barrel, shown plainly: pale yellow sand, dark wet mud, a grey stone; null is empty. */
export function paintMachine(ctx: CanvasRenderingContext2D, kind: MachineKind, load: Load, pose: MachinePose): void {
  ctx.save()
  if (kind === 'catapult') catapult(ctx, load, pose)
  else cannon(ctx, load, pose)
  ctx.restore()
}
