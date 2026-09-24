import type { Driver, Frac, GameAudit } from '../types.ts'

// Turning Tower: five dioramas solved in order, each through its door. Every
// turning segment is dragged round by its wheel (the first bridge and the stair
// arm through every quarter), the raft and the lift are ridden, the bird hops,
// and the wanderer walks every path, over both impossible joins, into each door
// while the ring of little models turns to the next room. Points are lattice
// coordinates from rooms.ts, projected through the live camera.

type P3 = readonly [number, number, number]
type Axis = 'x' | 'y' | 'z'

type AuditWindow = { __jamAudit: { projectFrac(point: number[]): number[] | null } }

async function at(d: Driver, p: P3): Promise<Frac> {
  const f = await d.page.evaluate((q) => (window as unknown as AuditWindow).__jamAudit.projectFrac(q), [...p])
  return f ? [f[0], f[1]] : [0.5, 0.5]
}

/** The top of a lattice cell, where a tap asks the wanderer to walk. */
const top = (x: number, y: number, z: number): P3 => [x + 0.5, y + 1, z + 0.5]

/** A door is tapped at its arch, a little above its sill. */
const arch = (door: P3): P3 => [door[0], door[1] + 0.55, door[2]]

/**
 * Each room after the first starts from a save that names it: the door
 * moment before it already watched the wanderer and the bird arrive, and a
 * room only takes touches once it is in play.
 */
async function room(d: Driver, key: string): Promise<void> {
  await d.reload({ 'tada-jam:slot:turning-tower': { v: 1, current: key, rooms: {} } })
  await d.wait(300)
}

/**
 * Drag a turning segment round by `quarters`. The finger starts on the wheel's
 * centre as seen on screen and circles the pivot in the turn plane, the way
 * turnAngle reads it.
 */
async function turn(d: Driver, pivot: P3, axis: Axis, handle: P3, quarters: number, ms: number): Promise<void> {
  const i = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  const s = pivot[i] - handle[i]
  const e = [handle[0] + s - pivot[0], handle[1] + s - pivot[1], handle[2] + s - pivot[2]]
  const [u, v] = axis === 'y' ? [e[0], e[2]] : axis === 'x' ? [e[1], e[2]] : [e[0], e[1]]
  const r = Math.max(0.6, Math.hypot(u, v))
  const a0 = axis === 'y' ? Math.atan2(u, v) : Math.atan2(v, u)
  const point = (a: number): P3 => {
    const c = r * Math.cos(a)
    const n = r * Math.sin(a)
    if (axis === 'y') return [pivot[0] + n, pivot[1], pivot[2] + c]
    if (axis === 'x') return [pivot[0], pivot[1] + c, pivot[2] + n]
    return [pivot[0] + c, pivot[1] + n, pivot[2]]
  }
  const sweep = quarters * (Math.PI / 2)
  const steps = Math.max(2, Math.ceil(Math.abs(sweep) / (Math.PI / 9)))
  await d.press(await at(d, point(a0)))
  for (let k = 1; k <= steps; k++) await d.move(await at(d, point(a0 + (sweep * k) / steps)), ms / steps)
  await d.move(await at(d, point(a0 + sweep)), 200)
  await d.release()
}

/** Drag a sliding platform by its grip from one stop to another. */
async function slide(d: Driver, grip: P3, axis: Axis, from: number, to: number, ms: number): Promise<void> {
  const i = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  const place = (value: number): P3 => [grip[0] + (i === 0 ? value : 0), grip[1] + (i === 1 ? value : 0), grip[2] + (i === 2 ? value : 0)]
  await d.press(await at(d, place(from)))
  await d.move(await at(d, place(to)), ms)
  await d.move(await at(d, place(to)), 200)
  await d.release()
}

const audit: GameAudit = {
  enforce: true,
  // The sky is one triangle its vertex shader writes straight to clip space,
  // behind everything: its CPU positions are not where it is drawn. The door
  // and lantern halos are additive light that writes no depth, set in front of
  // everything (intersections.test.ts): they cross nothing, and must not hide
  // what is behind them.
  ignore: ['^sky$', '-halo$'],
  allow: [
    {
      a: 'bird>body$',
      b: 'bird>head$',
      kind: 'pose',
      upTo: 0.2,
      reason:
        "the head's ball sits in the body as a socket. Head and body are squashed and puffed together as one torso, so the socket reads deeper in world units as the bird stretches (13% measured, 14% at the motion's squash and puff extremes) though neither moves against the other; turning, the head sits no deeper than a sliver (intersections.test.ts)",
    },
    {
      a: 'room-crank>architecture$',
      b: 'room-crank>segment-0$',
      kind: 'penetration',
      upTo: 0.4,
      reason:
        "the raised drawbridge stands flush against the path block it lowers onto, and the paver on its hinge cell rests inside that block: hidden, and still while raised. The block is drawn with its camera-facing faces only, so the depth is read against its far side (30% measured); lowering, the hinge cell turns in place inside the block's faces",
    },
    {
      a: 'mini-crank>architecture$',
      b: 'mini-crank>segment-0$',
      kind: 'pose',
      upTo: 0.6,
      reason:
        "the same drawbridge in the ring's little model of the crank room: raised against its path block, its hinge paver inside the block, until the room is solved, then lowered onto it (49% measured, against the block's far side as in the room)",
    },
  ],
  moments: [
    // Untouched: the wanderer lifts its lantern to the door, the wheel glows, the ghost hand turns it.
    { name: 'opening: invitation, glow and ghost hand', run: async (d) => { await d.wait(7600) } },
    {
      name: 'first turn: wanderer and bird poked',
      run: async (d) => {
        await d.tap((await d.find('wanderer>body')) ?? (await at(d, [0.5, 2.3, 2.5])))
        await d.wait(800)
        await d.tap((await d.find('bird>body')) ?? (await at(d, [0.5, 2.45, 3.5])))
        await d.wait(800)
      },
    },
    {
      name: 'first turn: bridge turned all the way round',
      run: async (d) => {
        await turn(d, [3.5, 2.5, 2.5], 'y', [3.5, 1.75, 2.5], 5, 2200)
        await d.wait(800)
      },
    },
    {
      name: 'first turn: across the bridge and in at the door',
      run: async (d) => {
        await d.tap(await at(d, arch([6.3, 3, 1.3])))
        await d.wait(7200)
      },
    },
    {
      name: 'ferry: raft fetched, boarded and ridden across',
      run: async (d) => {
        await room(d, 'ferry')
        await slide(d, [3.5, 2.5, 1.02], 'z', 4, 0, 900)
        await d.wait(400)
        await d.tap(await at(d, top(3, 2, 0)))
        await d.wait(2300)
        await slide(d, [3.5, 2.5, 1.02], 'z', 0, 4, 900)
        await d.wait(600)
      },
    },
    {
      name: 'ferry: off the raft and in at the door',
      run: async (d) => {
        await d.tap(await at(d, arch([6.3, 3, 3.3])))
        await d.wait(5200)
      },
    },
    {
      name: 'impossible stair: arm turned round, then up the impossible join',
      run: async (d) => {
        await room(d, 'impossible-stair')
        await turn(d, [7.5, 4.5, 6.5], 'y', [7.5, 3.72, 6.5], 5, 2200)
        await d.wait(800)
        await d.tap(await at(d, arch([9.3, 5, 5.3])))
        await d.wait(7300)
      },
    },
    {
      name: 'bird bridge: bird sent along and poked, wheel turned',
      run: async (d) => {
        await room(d, 'bird-bridge')
        await slide(d, [3.5, 2.45, -1.5], 'z', 0, 3, 700)
        await d.wait(1100)
        await turn(d, [5.5, 2.5, 1.5], 'y', [5.5, 1.72, 1.5], 2, 1000)
        await d.wait(700)
        await d.tap((await d.find('bird>body')) ?? (await at(d, [3.5, 2.45, 1.5])))
        await d.wait(700)
      },
    },
    {
      name: 'bird bridge: over the bird and in at the door',
      run: async (d) => {
        await d.tap(await at(d, arch([5.3, 3, -1.7])))
        await d.wait(8500)
      },
    },
    {
      name: 'crank: drawbridge lowered, lift fetched and ridden up, over the impossible join',
      run: async (d) => {
        await room(d, 'crank')
        await turn(d, [3.5, 1.5, 3.5], 'x', [4.04, 1.5, 3.5], -1, 600)
        await d.wait(600)
        await slide(d, [4.02, 1.5, 0.5], 'y', 3, 0, 800)
        await d.wait(500)
        await d.tap(await at(d, top(3, 1, 0)))
        await d.wait(3200)
        await slide(d, [4.02, 1.5, 0.5], 'y', 0, 3, 800)
        await d.wait(600)
        await d.tap(await at(d, arch([-1.7, 2, -2.7])))
        await d.wait(3400)
      },
    },
  ],
}

export default audit
