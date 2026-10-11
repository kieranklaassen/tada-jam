import { HIGHLIGHT, MACHINE, MUD, SAND, STONE, WOOD } from './palette'
import { bow, line, oval, shape } from './parts'
import type { Ctx } from './parts'

// The two machines the workers built from what grows over the nest: a catapult of grass blades with a leaf bowl,
// and a cannon that is one fat length of hollow green reed. Each fills its place of two cells by two and is the
// one fresh green thing under the grass. Flat colour, a darker edge and one hard highlight on each glossy part,
// like the creatures who made them. What is loaded is the largest thing on the machine after the machine itself.

export type MachineKind = 'catapult' | 'cannon'
export type Load = 'sand' | 'mud' | 'stone' | null
export type MachinePose = 'ready' | 'fired'

/** The box of a machine: two cells wide and two high. */
export const MACHINE_SIZE = { width: 56, height: 56 } as const

// What the palette has not got: the shade of a cream binding, the dark of a hollow, and a deep edge for sand so
// that a pale heap stands off the green.
const TRIM_SHADE = '#b8b08e'
const HOLLOW = '#14200d'
const SAND_DEEP = '#a9812f'

/** A beam of green stalk: a dark edge round a flat core, with round ends. */
function beam(ctx: Ctx, width: number, pts: readonly number[], curve = false): void {
  line(ctx, MACHINE.dark, width, pts, curve)
  line(ctx, MACHINE.body, width - 2.8, pts, curve)
}

/** A binding of cream grass thread round a beam: three fat turns side by side, across it. */
function lash(ctx: Ctx, x: number, y: number, turn: number, half: number): void {
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  for (const k of [-2.4, 0, 2.4]) {
    const pts = [x + c * k - s * half, y + s * k + c * half, x + c * k + s * half, y + s * k - c * half]
    line(ctx, TRIM_SHADE, 3.4, pts)
    line(ctx, MACHINE.trim, 2, pts)
  }
}

/** A wheel: a slice of dark green stalk with a paler ring, a cream peg and its highlight. */
function wheel(ctx: Ctx, x: number, y: number, r: number): void {
  oval(ctx, x, y, r, r, 0, MACHINE.wheel)
  bow(ctx, MACHINE.dark, r * 0.3, x, y, r * 0.62, r * 0.62, 0, 0, Math.PI * 2)
  bow(ctx, HIGHLIGHT, 1.8, x, y, r * 0.62, r * 0.62, 0, -2.7, -1.8)
  oval(ctx, x, y, r * 0.26, r * 0.26, 0, MACHINE.trim)
}

/** What lies in the cup, as a heap of half width `r` that stands on (0, 0) of the current frame: a pale pointed
 *  heap of sand with grains, a dark wet lump of mud with its glint, or a round grey boulder. */
function heap(ctx: Ctx, load: Load, r: number): void {
  if (load === 'sand') {
    const hill = (fill: string, k: number, dy: number) => {
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.moveTo(-r * k, dy)
      ctx.bezierCurveTo(-r * 0.96 * k, -r * 0.62 * k + dy, -r * 0.5 * k, -r * 1.22 * k + dy, 0, -r * 1.22 * k + dy)
      ctx.bezierCurveTo(r * 0.5 * k, -r * 1.22 * k + dy, r * 0.96 * k, -r * 0.62 * k + dy, r * k, dy)
      ctx.closePath()
      ctx.fill()
    }
    hill(SAND_DEEP, 1, 0)
    hill(SAND.fill, 0.86, 0)
    for (const [x, y] of [[-r * 0.42, -r * 0.3], [r * 0.34, -r * 0.42], [r * 0.02, -r * 0.82], [-r * 0.08, -r * 0.2], [r * 0.5, -r * 0.1]]) oval(ctx, x, y, 1.1, 1, 0, SAND.edge)
    line(ctx, HIGHLIGHT, 1.6, [-r * 0.3, -r * 0.62, -r * 0.14, -r * 0.92])
  } else if (load === 'mud') {
    // Two lumps run into one, pale where they stand free and dark and wet inside.
    oval(ctx, -r * 0.1, -r * 0.42, r, r * 0.72, 0, MUD.lip)
    oval(ctx, r * 0.22, -r * 0.92, r * 0.6, r * 0.5, 0.2, MUD.lip)
    oval(ctx, -r * 0.1, -r * 0.34, r * 0.86, r * 0.6, 0, MUD.fill)
    oval(ctx, r * 0.22, -r * 0.84, r * 0.46, r * 0.38, 0.2, MUD.fill)
    oval(ctx, r * 0.1, -r * 0.2, r * 0.56, r * 0.3, 0, MUD.edge)
    line(ctx, MUD.shine, 2, [-r * 0.6, -r * 0.5, -r * 0.3, -r * 0.76])
    oval(ctx, r * 0.02, -r * 1.02, 1, 1, 0, MUD.shine)
  } else if (load === 'stone') {
    oval(ctx, 0, -r * 0.62, r, r * 0.92, 0.15, STONE.edge)
    oval(ctx, -0.5, -r * 0.7, r * 0.86, r * 0.78, 0.15, STONE.fill)
    bow(ctx, STONE.shine, 2.4, -0.3, -r * 0.66, r * 0.62, r * 0.56, 0.15, -2.8, -1.5)
    line(ctx, HIGHLIGHT, 2, [-r * 0.42, -r * 1.02, -r * 0.14, -r * 1.16])
    oval(ctx, r * 0.36, -r * 0.34, 1.7, 1.2, 0.3, STONE.edge)
  }
}

/** What peeps out of the muzzle, in a frame whose (0, 0) is the middle of the bore and whose mouth opens toward
 *  positive x: the same three lumps, each a dome that fills the bore and bulges `out` beyond it. */
function plug(ctx: Ctx, load: Load, bore: number, half: number, out: number): void {
  const dome = (fill: string, k: number, dx: number, dy: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.ellipse(dx, dy, bore, half * k, 0, Math.PI / 2, Math.PI * 1.5)
    ctx.ellipse(dx, dy, out * k, half * k, 0, -Math.PI / 2, Math.PI / 2)
    ctx.closePath()
    ctx.fill()
  }
  if (load === 'sand') {
    dome(SAND_DEEP, 1, 0, 0)
    dome(SAND.fill, 0.84, -0.4, -0.6)
    for (const [x, y] of [[out * 0.3, -half * 0.36], [out * 0.5, half * 0.2], [out * 0.08, half * 0.46], [out * 0.2, half * 0.02], [-0.6, -half * 0.5]]) oval(ctx, x, y, 1.1, 1, 0, SAND.edge)
    line(ctx, HIGHLIGHT, 1.6, [out * 0.1, -half * 0.62, out * 0.36, -half * 0.5])
    // It trickles over the lip.
    for (const [x, y, r] of [[out * 0.34, half + 2.6, 1.5], [out * 0.62, half + 5.4, 1.2], [out * 0.2, half + 7.6, 1]]) oval(ctx, x, y, r, r, 0, SAND.fill)
  } else if (load === 'mud') {
    dome(MUD.lip, 1, 0, 0)
    dome(MUD.fill, 0.82, 0, 0.8)
    oval(ctx, out * 0.3, half * 0.34, out * 0.36, half * 0.3, 0, MUD.edge)
    line(ctx, MUD.shine, 2, [out * 0.06, -half * 0.52, out * 0.4, -half * 0.36])
    oval(ctx, out * 0.6, -half * 0.14, 1, 1, 0, MUD.shine)
    // A drip hangs from it.
    line(ctx, MUD.lip, 4.6, [out * 0.36, half * 0.7, out * 0.4, half + 5])
    line(ctx, MUD.fill, 2.8, [out * 0.36, half * 0.7, out * 0.4, half + 5])
    oval(ctx, out * 0.4, half + 5.6, 2.9, 3.3, 0, MUD.lip)
    oval(ctx, out * 0.4, half + 5.8, 1.9, 2.3, 0, MUD.fill)
  } else if (load === 'stone') {
    dome(STONE.edge, 1, 0, 0)
    dome(STONE.fill, 0.84, -0.6, -0.7)
    bow(ctx, STONE.shine, 2.4, 0, 0, out * 0.6, half * 0.6, 0, -1.5, -0.5)
    line(ctx, HIGHLIGHT, 2, [out * 0.02, -half * 0.74, out * 0.3, -half * 0.68])
    oval(ctx, out * 0.44, half * 0.36, 1.7, 1.2, 0.3, STONE.edge)
  }
}

/** A few crumbs of what was shot, left behind on the lip of the cup or of the muzzle. */
function crumbs(ctx: Ctx, load: Load, pts: readonly number[]): void {
  if (!load) return
  const fill = load === 'sand' ? SAND.fill : load === 'mud' ? MUD.lip : STONE.fill
  for (let i = 0; i < pts.length; i += 2) oval(ctx, pts[i], pts[i + 1], load === 'mud' ? 1.8 : 1.4, load === 'mud' ? 1.4 : 1.2, 0, fill)
}

/** The leaf bowl at the end of the arm, in a frame whose (0, 0) is the middle of its rim and whose mouth opens
 *  toward negative y: a deep round green bowl 26 across, the dark of its hollow, a lit rim, and whatever lies in
 *  it. */
function bowl(ctx: Ctx, load: Load, full: boolean): void {
  const half = (fill: string, rx: number, ry: number, dy: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.ellipse(0, dy, rx, ry, 0, 0, Math.PI)
    ctx.closePath()
    ctx.fill()
  }
  // The far side of the rim and the hollow behind the load.
  oval(ctx, 0, 0, 13, 3.6, 0, MACHINE.dark)
  oval(ctx, 0, 0, 11.5, 2.6, 0, HOLLOW)
  if (full && load) heap(ctx, load, 11.2)
  half(MACHINE.dark, 13, 12, 0)
  half(MACHINE.body, 11.5, 10.4, -0.2)
  // The rib of the leaf down the bowl, and its one highlight.
  line(ctx, MACHINE.dark, 1.4, [0.4, 3.6, 1, 9.4])
  bow(ctx, HIGHLIGHT, 2.2, 0, 0, 8, 7.2, 0, 2.05, 2.75)
  // The near side of the rim, over the foot of the load.
  bow(ctx, MACHINE.dark, 4.2, 0, 0, 13, 3.6, 0, 0, Math.PI)
  bow(ctx, MACHINE.lit, 2.4, 0, 0, 13, 3.6, 0, 0, Math.PI)
  if (full && load === 'mud') {
    // A drip runs over the rim and down the outside.
    line(ctx, MUD.lip, 4.6, [6.4, 0.6, 7, 7.4])
    line(ctx, MUD.fill, 2.8, [6.4, 0.6, 7, 7.4])
    oval(ctx, 7, 8, 2.9, 3.3, 0, MUD.lip)
    oval(ctx, 7, 8.2, 1.9, 2.3, 0, MUD.fill)
  }
  if (full && load === 'sand') crumbs(ctx, load, [-12.4, 7.6, 12.2, 7, 13.6, 11.4])
  if (!full) crumbs(ctx, load, [-7, -1.4, 6.4, -1.8, -0.6, -2.4])
}

// The catapult: a fat green beam on two wheels, a trestle of two stalks with a round bar at its top for a stop,
// and the arm, a thick springy blade rooted in the beam between them. Bent back and tied down it holds the bowl
// low behind with the load heaped in it; let go, it stands up against the bar with the bowl empty and the thread
// hanging loose.
function catapult(ctx: Ctx, load: Load, pose: MachinePose): void {
  const ready = pose === 'ready'
  wheel(ctx, -17, -7.5, 7.5)
  wheel(ctx, 17, -7.5, 7.5)
  // The far stalk of the trestle, behind the arm.
  line(ctx, MACHINE.dark, 6.6, [24.6, -16, 16.4, -47])
  beam(ctx, 9, [-23.5, -15.5, 23.5, -15.5])
  line(ctx, HIGHLIGHT, 1.8, [-21, -17.6, -15, -17.6])
  if (ready) {
    // The thread that holds the arm down: taut from the foot of the bowl to its knot on the beam.
    line(ctx, TRIM_SHADE, 4.6, [-12.4, -30, -12.4, -15.5])
    line(ctx, MACHINE.trim, 2.8, [-12.4, -30, -12.4, -15.5])
  }
  // The arm, from its root in the beam to the foot of the bowl.
  beam(ctx, 8.6, ready ? [4, -17, 4.6, -43, -11, -29] : [4, -17, 2.6, -34, 9.6, -45], true)
  if (!ready) line(ctx, MACHINE.lit, 2, [3, -23, 2.4, -32, 5.6, -38.6], true)
  ctx.save()
  if (ready) {
    ctx.translate(-12.8, -38)
    ctx.rotate(-0.06)
  } else {
    ctx.translate(14.8, -54.4)
    ctx.rotate(0.5)
  }
  bowl(ctx, load, ready)
  ctx.restore()
  // The near stalk of the trestle, and the bar the arm slaps into, seen end on.
  beam(ctx, 7.4, [10, -16, 15.6, -47])
  oval(ctx, 16, -48.4, 5.4, 5.4, 0, MACHINE.dark)
  oval(ctx, 15.8, -48.8, 4, 4, 0, MACHINE.lit)
  oval(ctx, 16, -48.6, 1.5, 1.5, 0, MACHINE.dark)
  if (ready) {
    // The knot, and the peg that lets go.
    lash(ctx, -12.4, -15.5, 0, 5.2)
    oval(ctx, -12.4, -15.5, 2, 2, 0, WOOD.peg)
  } else {
    // Loose: the thread hangs from the arm in a wobble, and its other end lies curled on the beam.
    line(ctx, TRIM_SHADE, 3.6, [2, -38, -9, -40, -4, -30, -12, -27], true)
    line(ctx, MACHINE.trim, 2.2, [2, -38, -9, -40, -4, -30, -12, -27], true)
    line(ctx, TRIM_SHADE, 3.6, [-12.4, -20.4, -18, -27, -23, -20.6], true)
    line(ctx, MACHINE.trim, 2.2, [-12.4, -20.4, -18, -27, -23, -20.6], true)
    oval(ctx, -12.4, -15.5, 2, 2, 0, WOOD.peg)
  }
}

// The cannon: one fat length of hollow green reed, level, on a low carriage with two wheels, with a wide flared
// mouth. The load bulges out of the mouth; fired, the mouth is dark and empty, the barrel has slid back on its
// carriage and the fuse is burnt to a stub.
function cannon(ctx: Ctx, load: Load, pose: MachinePose): void {
  const fired = pose === 'fired'
  // The carriage: a low beam with two chocks the barrel lies between.
  beam(ctx, 9, [-21, -20, 21, -20])
  shape(ctx, MACHINE.dark, [-27, -18, -17, -29, -12, -18])
  shape(ctx, MACHINE.dark, [5, -18, 11, -29, 21, -18])
  ctx.save()
  ctx.translate(fired ? -5 : 0, -37)
  // The barrel in its own frame, the middle of its mouth at (18, 0): 22 thick, flared to 32 at the mouth.
  const tube = (fill: string, h: number, flare: number, back: number, low: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(18, -flare)
    ctx.quadraticCurveTo(9, -h, 2, -h)
    ctx.lineTo(back, -h)
    ctx.bezierCurveTo(back - 10.5, -h, back - 10.5, low, back, low)
    ctx.lineTo(2, low)
    ctx.quadraticCurveTo(9, low, 18, low + flare - h)
    ctx.closePath()
    ctx.fill()
  }
  tube(MACHINE.dark, 11, 16, -19.6, 11)
  tube(MACHINE.body, 9.6, 14.6, -19, 7)
  // The fuse at the back: a curl of thread with a dark tip, burnt short when it has fired.
  if (fired) {
    line(ctx, TRIM_SHADE, 2.6, [-19, -10.4, -20, -13.4])
    oval(ctx, -20.2, -14, 1.7, 1.7, 0, WOOD.peg)
  } else {
    line(ctx, TRIM_SHADE, 3.4, [-18, -10.4, -24.5, -11.4, -19.4, -17, -23.6, -16.6], true)
    line(ctx, MACHINE.trim, 2, [-18, -10.4, -24.5, -11.4, -19.4, -17, -23.6, -16.6], true)
    oval(ctx, -23.8, -16.6, 1.7, 1.7, 0, WOOD.peg)
  }
  // One broad cream binding round the reed behind its middle, bowed as the reed is round, standing a little proud
  // of it above and below and in shade underneath. Two bindings with a highlight between them made a sign.
  const band = (fill: string, x0: number, x1: number, top: number, low: number) => {
    const mid = (top + low) / 2
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(x0, top)
    ctx.quadraticCurveTo(x0 - 3.2, mid, x0, low)
    ctx.lineTo(x1, low)
    ctx.quadraticCurveTo(x1 - 3.2, mid, x1, top)
    ctx.closePath()
    ctx.fill()
  }
  band(TRIM_SHADE, -14.4, -5.6, -12, 11.8)
  band(MACHINE.trim, -13.4, -6.6, -11.2, 6.8)
  // Its one highlight, well forward of the binding and short of the lip: it rises with the flare and joins nothing.
  line(ctx, HIGHLIGHT, 2.6, [2, -6, 6.6, -6, 10.4, -7.8], true)
  // The mouth: a lit lip round the dark of the bore, and what bulges out of it.
  oval(ctx, 18, 0, 5.2, 16, 0, MACHINE.dark)
  oval(ctx, 18, -0.4, 4.2, 15, 0, MACHINE.lit)
  oval(ctx, 18.3, 0, 3.3, 12.4, 0, HOLLOW)
  ctx.save()
  ctx.translate(18.3, 0)
  if (!fired && load) plug(ctx, load, 3.3, 10.8, 9.4)
  // A few crumbs of the shot on the lip.
  if (fired) crumbs(ctx, load, [1.4, 13.6, 4, 16.6, 0.4, -13.8])
  ctx.restore()
  ctx.restore()
  wheel(ctx, -14, -9, 9)
  wheel(ctx, 14, -9, 9)
}

/** Paints a machine with the middle of its base at the origin, facing right; the caller flips it. `load` is what
 *  lies in its bowl or bulges from its mouth, shown plainly: a pale yellow heap of sand, a dark wet lump of mud, a
 *  grey boulder; null is a dark hollow. */
export function paintMachine(ctx: CanvasRenderingContext2D, kind: MachineKind, load: Load, pose: MachinePose): void {
  ctx.save()
  if (kind === 'catapult') catapult(ctx, load, pose)
  else cannon(ctx, load, pose)
  ctx.restore()
}
