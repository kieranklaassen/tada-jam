import { UP, type CellDef, type GroupDef, type RoomDef, type Tone, type Vec3 } from './world'

// Five small hand-authored dioramas on an open ring. Each has one want: the
// wanderer on one ledge, the glowing door on another it cannot reach yet.
// Coordinates are lattice cells: x runs to the lower right of the screen, z
// to the lower left, y up. Only +x, +z and top faces face the camera, so
// handles and grips sit on those faces.

export type Decor =
  | { kind: 'dome'; at: Vec3; radius: number; tone: Tone; group?: number }
  | { kind: 'cone'; at: Vec3; radius: number; height: number; tone: Tone; group?: number }
  | { kind: 'column'; at: Vec3; radius: number; height: number; tone: Tone; group?: number }
  | { kind: 'window'; at: Vec3; face: 'x' | 'z'; height: number; group?: number }
  | { kind: 'wheel'; at: Vec3; axis: 'x' | 'y' | 'z'; radius: number; group: number }
  | { kind: 'grip'; at: Vec3; face: 'x' | 'z' | 'y'; group: number }
  | { kind: 'shaft'; at: Vec3; height: number }
  | { kind: 'finial'; at: Vec3; tone: Tone; group?: number }

export type RoomSpec = RoomDef & {
  decor: readonly Decor[]
  /** Accent hue of this room's little model on the ring. */
  accent: string
  /**
   * Where the bird perches when it has no job here (world units, on a top).
   * A ledge is one block deep, so it stands toward the ledge's open edge:
   * side-on, its body and tail clear the wall behind it.
   */
  perch: Vec3
}

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, tone: Tone = 'stone'): CellDef[] {
  const cells: CellDef[] = []
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) cells.push({ at: [x, y, z], tone })
  return cells
}

function paths(points: readonly Vec3[], tone: Tone = 'stone'): CellDef[] {
  return points.map((at) => ({ at, paths: [UP], tone }))
}

/** Remove cells that another list redefines (later wins), so towers can be carved and topped with paths. */
function build(...lists: CellDef[][]): CellDef[] {
  const byKey = new Map<string, CellDef>()
  for (const list of lists) for (const cell of list) byKey.set(cell.at.join(','), cell)
  return [...byKey.values()]
}

const firstTurnBridge: GroupDef = {
  kind: 'turn',
  axis: 'y',
  pivot: [3.5, 2.5, 2.5],
  cells: paths([
    [2, 2, 2],
    [3, 2, 2],
    [4, 2, 2],
  ]),
  start: 1,
  handle: [3.5, 1.75, 2.5],
}

const firstTurn: RoomSpec = {
  key: 'first-turn',
  accent: '#f2a48f',
  cells: build(
    box(-1, 7, -4, -4, 0, 4, 'plinth'),
    box(0, 1, -3, 1, 1, 3),
    paths([
      [0, 2, 2],
      [1, 2, 2],
    ]),
    box(3, 3, -3, 0, 2, 2, 'rose'),
    box(5, 6, -3, 1, 1, 3),
    paths([
      [5, 2, 2],
      [6, 2, 2],
      [6, 2, 1],
    ]),
  ),
  groups: [firstTurnBridge],
  start: [0, 2, 2],
  door: [6, 2, 1],
  perch: [0.5, 2, 3.65],
  decor: [
    { kind: 'wheel', at: [3.5, 1.72, 2.5], axis: 'y', radius: 1.35, group: 0 },
    { kind: 'dome', at: [0.5, 2, 1.5], radius: 0.42, tone: 'trim' },
    { kind: 'window', at: [2, 0, 1.5], face: 'x', height: 1.2 },
    { kind: 'window', at: [0.5, -0.6, 4], face: 'z', height: 1.1 },
    { kind: 'window', at: [7, -0.2, 2.5], face: 'x', height: 1.4 },
    { kind: 'cone', at: [6.5, 2, 3.5], radius: 0.42, height: 1.1, tone: 'rose' },
  ],
}

const ferryRaft: GroupDef = {
  kind: 'slide',
  axis: 'z',
  min: 0,
  max: 4,
  start: 4,
  cells: paths([[3, 2, 0]], 'rose'),
  // On the raft's open front: its +x side is pressed against the door tower at the far stop.
  grip: [3.5, 2.5, 1.02],
}

const ferry: RoomSpec = {
  key: 'ferry',
  accent: '#e7b86d',
  cells: build(
    box(-1, 7, -4, -4, -1, 5, 'plinth'),
    box(0, 2, -3, 1, -1, 0),
    paths([
      [0, 2, 0],
      [1, 2, 0],
      [2, 2, 0],
    ]),
    box(3, 3, 1, 1, 0, 4, 'rail'),
    box(3, 3, -3, 0, 0, 0, 'rose'),
    box(3, 3, -3, 0, 4, 4, 'rose'),
    box(4, 6, -3, 1, 4, 5),
    box(6, 6, -3, 1, 3, 3),
    paths([
      [4, 2, 4],
      [5, 2, 4],
      [6, 2, 4],
      [6, 2, 3],
    ]),
  ),
  groups: [ferryRaft],
  start: [0, 2, 0],
  door: [6, 2, 3],
  perch: [1.7, 2, -0.65],
  decor: [
    { kind: 'grip', at: [3.5, 2.5, 1.02], face: 'z', group: 0 },
    { kind: 'dome', at: [0.5, 2, -0.5], radius: 0.45, tone: 'trim' },
    { kind: 'window', at: [3, -0.4, 0.5], face: 'x', height: 1.2 },
    { kind: 'window', at: [5.5, -0.5, 6], face: 'z', height: 1.3 },
    { kind: 'window', at: [7, -0.3, 4.5], face: 'x', height: 1.3 },
    { kind: 'finial', at: [6.5, 2, 5.5], tone: 'trim' },
  ],
}

const stairArm: GroupDef = {
  kind: 'turn',
  axis: 'y',
  pivot: [7.5, 4.5, 6.5],
  cells: paths([
    [6, 4, 6],
    [7, 4, 6],
    [8, 4, 6],
  ]),
  start: 1,
  handle: [7.5, 3.72, 6.5],
}

const impossibleStair: RoomSpec = {
  key: 'impossible-stair',
  accent: '#c9a3e6',
  cells: build(
    box(-1, 9, -4, -4, 2, 8, 'plinth'),
    box(-1, 2, -3, 0, 2, 4),
    paths([
      [0, 1, 3],
      [1, 1, 3],
      [2, 1, 3],
    ]),
    box(7, 7, -3, 3, 6, 6, 'rose'),
    box(9, 9, -3, 3, 5, 6),
    paths([
      [9, 4, 6],
      [9, 4, 5],
    ]),
  ),
  groups: [stairArm],
  start: [0, 1, 3],
  door: [9, 4, 5],
  perch: [-0.65, 1, 4.65],
  decor: [
    { kind: 'wheel', at: [7.5, 3.72, 6.5], axis: 'y', radius: 1.3, group: 0 },
    { kind: 'dome', at: [2.5, 1, 4.5], radius: 0.42, tone: 'trim' },
    { kind: 'window', at: [2.8, -1.2, 2.5], face: 'x', height: 1.2 },
    { kind: 'window', at: [1.5, -1.2, 5], face: 'z', height: 1.2 },
    { kind: 'window', at: [8, 0.5, 6.5], face: 'x', height: 1.6 },
    { kind: 'window', at: [10, 1.2, 6.5], face: 'x', height: 1.6 },
    { kind: 'column', at: [1.5, 1, 2.5], radius: 0.25, height: 0.9, tone: 'trim' },
  ],
}

const perchBird: GroupDef = {
  kind: 'slide',
  axis: 'z',
  min: -2,
  max: 1,
  start: -2,
  cells: [{ at: [3, 2, 0], paths: [UP], tone: 'trim' }],
  grip: [3.5, 2.6, 0.5],
  bird: true,
}

const birdTurn: GroupDef = {
  kind: 'turn',
  axis: 'y',
  pivot: [5.5, 2.5, 1.5],
  cells: paths([
    [4, 2, 1],
    [5, 2, 1],
    [5, 2, 0],
  ]),
  start: 2,
  handle: [5.5, 1.72, 1.5],
}

const birdBridge: RoomSpec = {
  key: 'bird-bridge',
  accent: '#8fd3c8',
  cells: build(
    box(-1, 7, -4, -4, -3, 3, 'plinth'),
    box(0, 2, -3, 1, 0, 2),
    paths([
      [0, 2, 1],
      [1, 2, 1],
      [2, 2, 1],
    ]),
    box(3, 3, 1, 1, -2, 0, 'rail'),
    box(3, 3, -3, 0, -2, -2, 'rose'),
    box(5, 5, -3, 1, 1, 1, 'rose'),
    box(5, 5, -3, 1, -2, -1),
    paths([
      [5, 2, -1],
      [5, 2, -2],
    ]),
  ),
  groups: [perchBird, birdTurn],
  start: [0, 2, 1],
  door: [5, 2, -2],
  perch: [3.5, 2, -1.5],
  decor: [
    { kind: 'wheel', at: [5.5, 1.72, 1.5], axis: 'y', radius: 1.3, group: 1 },
    { kind: 'dome', at: [0.5, 2, 0.5], radius: 0.42, tone: 'trim' },
    { kind: 'window', at: [2.5, -0.6, 3], face: 'z', height: 1.2 },
    { kind: 'window', at: [3, -0.4, 1.5], face: 'x', height: 1.1 },
    { kind: 'window', at: [6, -0.6, -1.5], face: 'x', height: 1.3 },
    { kind: 'cone', at: [0.5, 2, 2.5], radius: 0.38, height: 1.0, tone: 'rose' },
  ],
}

const drawbridge: GroupDef = {
  kind: 'turn',
  axis: 'x',
  pivot: [3.5, 1.5, 3.5],
  cells: [
    { at: [3, 1, 3], paths: [4], tone: 'rose' },
    { at: [3, 2, 3], paths: [4], tone: 'rose' },
    { at: [3, 3, 3], paths: [4], tone: 'rose' },
  ],
  start: 0,
  limit: [-1, 0],
  // Clear of the start tile's face: the wheel turns right beside it.
  handle: [4.06, 1.5, 3.5],
}

const lift: GroupDef = {
  kind: 'slide',
  axis: 'y',
  min: 0,
  max: 3,
  start: 3,
  cells: paths([[3, 1, 0]], 'rose'),
  grip: [4.02, 1.5, 0.5],
}

const crank: RoomSpec = {
  key: 'crank',
  accent: '#f0c75e',
  cells: build(
    // The slab hugs the two towers, so the camera frames them, not an empty floor.
    box(-2, 4, -4, -4, -3, 5, 'plinth'),
    box(3, 3, -3, 0, 4, 5),
    box(2, 2, -3, -1, 4, 5),
    paths([
      [3, 1, 5],
      [3, 1, 4],
    ]),
    box(3, 3, -3, 0, 3, 3, 'rose'),
    box(3, 3, -3, 0, 0, 0, 'rose'),
    box(-2, -1, -3, 0, -3, -3),
    paths([
      [-1, 1, -3],
      [-2, 1, -3],
    ]),
    // A low ledge in front of the tower, so the bird can watch from where the child can see it.
    box(4, 4, -3, -1, 5, 5, 'rose'),
  ),
  groups: [drawbridge, lift],
  start: [3, 1, 5],
  door: [-2, 1, -3],
  perch: [4.7, 0, 5.7],
  decor: [
    { kind: 'wheel', at: [4.06, 1.5, 3.5], axis: 'x', radius: 0.62, group: 0 },
    { kind: 'grip', at: [4.02, 1.5, 0.5], face: 'x', group: 1 },
    { kind: 'shaft', at: [3.5, 1, 0.5], height: 4.2 },
    { kind: 'window', at: [3.5, -1, 6], face: 'z', height: 1.3 },
    { kind: 'window', at: [0, -1.2, -2.5], face: 'x', height: 1.4 },
    { kind: 'dome', at: [-1.5, 1, -2.5], radius: 0.36, tone: 'trim' },
    { kind: 'finial', at: [2.5, 0, 4.5], tone: 'trim' },
  ],
}

export const ROOMS: readonly RoomSpec[] = [firstTurn, ferry, impossibleStair, birdBridge, crank]
