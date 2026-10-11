import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { KINDS, type Kind, type Placed } from './blocks'
import { ROOF_OUT, bridgeBoards } from './castle'
import { WHO } from './folk'
import { BELL, FOLK, SIZE, placeX, placeZ, type Who } from './layout'
import { Play } from './play'
import { DRAGON_LID, EYE, LID, buildFolk, ride, type FolkView, type Manner } from './view/folkView'
import { blockGeometry } from './view/shapes'

// What the box model cannot hold: the figures as they are drawn. Each test
// here plays the toy, poses the real meshes of the view the way the view does
// each frame, and measures their corners against what they must stay clear
// of. They hold the three faults of the sixth run of the intersection audit.

const at = (kind: Kind, col: number, row: number): Placed => ({ kind, col, row })
const p = new THREE.Vector3()

/** Poses one of the folk as the view does this frame. */
function pose(view: FolkView, play: Play, who: Who, time: number): void {
  const { evening } = play
  const manner: Manner = { sits: who === 'king' ? evening.kingSits : 0, high: who === 'cook' ? evening.cookHigh : 0, tuck: who === 'dragon' ? evening.tucked : 0, shake: 0, time }
  view.apply(play.folk.pose(who), evening.actors[who].placing, manner)
  if (who === 'king') view.root.position.y -= evening.kingSags()
  ride(view.root, evening.rides(who), evening.leans(who))
  view.root.updateMatrixWorld(true)
}

/** Every corner of the named parts of a figure, or of all of it, in the room. */
function corners(view: FolkView, each: (point: THREE.Vector3) => void, names?: readonly string[]): void {
  view.root.traverse((part) => {
    const mesh = part as THREE.Mesh
    if (!mesh.isMesh || (part as THREE.InstancedMesh).isInstancedMesh || !mesh.visible || (names && !names.includes(part.name))) return
    const points = mesh.geometry.getAttribute('position')
    for (let i = 0; i < points.count; i++) each(p.fromBufferAttribute(points, i).applyMatrix4(mesh.matrixWorld))
  })
}

describe('a roof lifted for a visitor', () => {
  /** Plays a visit to the free tower of a rug and gives back who came and how far the highest corner of him came up into the roof. */
  function visit(rug: Placed[], poked: boolean): { who: Who | undefined; into: number; room: number; peeked: boolean } {
    const play = new Play(rug, 1, true)
    const { evening } = play
    const index = evening.things.findIndex((thing) => thing.what === 'tower' && !thing.covered && thing.index !== evening.rests.king.thing)
    const tower = evening.things[index]
    evening.act(index)
    play.take()
    const who = WHO.find((one) => evening.actors[one].busy)
    const views = buildFolk()
    const seen = { who, into: -9, room: 9, peeked: false }
    for (let frame = 0; frame < 60 * 5; frame++) {
      play.advance(1 / 60)
      for (const event of play.take()) if (event.type === 'peek') {
        seen.peeked = true
        // A finger on him while he stands there: he jumps as he does anywhere.
        if (poked && who) play.folk.stir(who, 'poke')
      }
      const roof = tower.top + evening.lid(index)
      for (const one of ['king', 'cook'] as const) {
        pose(views[one], play, one, frame / 60)
        corners(views[one], (point) => {
          // Under the roof's plan and above the tower's top: he is under the roof's foot.
          if (Math.abs(point.x - tower.x) > ROOF_OUT || Math.abs(point.z - tower.z) > ROOF_OUT || point.y < tower.top + 0.02) return
          seen.into = Math.max(seen.into, point.y - roof)
          if (one === who) seen.room = Math.min(seen.room, roof - point.y)
        })
      }
    }
    return seen
  }
  const COOK = [at('round', 1, 1), at('round', 5, 0), at('round', 5, 0), at('cube', 3, 2)]
  /** One of each kind, with a seat, a room and a gate. */
  const CASTLE = [at('cube', 0, 1), at('arch', 3, 0), at('thin', 0, 0), at('round', 6, 0), at('slope', 0, 2), at('long', 4, 0), at('round', 2, 0), at('cube', 6, 1)]

  it('waits over the stalk of the cook\'s cap, when he hops at his own noise and when he is poked there', () => {
    for (const poked of [false, true]) {
      const seen = visit(COOK, poked)
      expect(seen.who).toBe('cook')
      expect(seen.peeked).toBe(true)
      expect(seen.into).toBeLessThanOrEqual(-0.02)
      // And not far over him: he looks out from under it.
      expect(seen.room).toBeLessThan(0.6)
    }
  })

  it('is told a height that is over every corner of the king and of the cook, seated, hopping, poked, carried and lying', () => {
    // The king has no tower to visit on any rug the tests build, so what the roof would wait over is held here.
    const play = new Play(CASTLE, 1, true)
    const { evening } = play
    const views = buildFolk()
    const slack = { king: [9, -9], cook: [9, -9] }
    for (let frame = 0; frame < 60 * 24; frame++) {
      if (frame === 60) play.folk.stir('king', 'poke')
      if (frame === 120) play.folk.stir('cook', 'poke')
      // One of them down the slide and one over the bridge.
      if (frame === 240) evening.act(evening.things.findIndex((thing) => thing.what === 'slide'))
      if (frame === 720) evening.act(evening.things.findIndex((thing) => thing.what === 'bridge'))
      play.advance(1 / 60)
      play.take()
      for (const who of ['king', 'cook'] as const) {
        pose(views[who], play, who, frame / 60)
        let top = -9
        corners(views[who], (point) => { top = Math.max(top, point.y) })
        const over = evening.headTop(who) + evening.rides(who) - (who === 'king' ? evening.kingSags() : 0) - top
        slack[who][0] = Math.min(slack[who][0], over)
        slack[who][1] = Math.max(slack[who][1], over)
      }
    }
    for (const who of ['king', 'cook'] as const) {
      expect(slack[who][0], who).toBeGreaterThanOrEqual(0)
      // And not far over: the bound is loose only while he is tipped over on his way.
      expect(slack[who][1], who).toBeLessThan(0.7)
    }
  })
})

describe('the king on a board that bends', () => {
  it('sits on the bent board at every frame of the dip and the throw: no board is deeper in his cushion than on a flat one', () => {
    const play = new Play([at('cube', 3, 1), at('long', 2, 1), at('thin', 6, 0)], 1, true)
    const { evening } = play
    const index = evening.things.findIndex((thing) => thing.what === 'bridge')
    const thing = evening.things[index]
    const boards = bridgeBoards(thing)
    expect(boards).toHaveLength(9)
    evening.act(index)
    const king = buildFolk().king
    let cushion: THREE.Mesh | null = null
    king.root.traverse((part) => { if (part.name === 'king-cushion') cushion = part as THREE.Mesh })
    const inverse = new THREE.Matrix4()
    // The cushion in its own units: an egg shape with this middle and these half-widths.
    const middle = [0, 0.14, 0], halves = [0.4 * 1.25, 0.4 * 0.42, 0.4 * 0.9]
    const point = new THREE.Vector3()
    let flat = 0, bentDeep = 0, deepestAt = 0, bends = 0, leaned = 0, rattled = 0
    for (let frame = 0; frame < 60 * 7; frame++) {
      play.advance(1 / 60)
      for (const event of play.take()) if (event.type === 'bend') { expect(event.who).toBe('king'); bends++ }
      const [x, y, z] = evening.actors.king.placing.at
      if (Math.abs(x - thing.x) > SIZE.long[0] / 2 || Math.abs(z - thing.z) > 0.3 || y > thing.top + 0.3) continue
      const bent = evening.bent()
      pose(king, play, 'king', frame / 60)
      leaned = Math.max(leaned, Math.abs(evening.leans('king')))
      inverse.copy((cushion as unknown as THREE.Mesh).matrixWorld).invert()
      // As the audit measures it: points of each board as it is drawn, and how far inside the cushion each is.
      let deep = 0
      for (const board of boards) for (const fx of [-0.5, 0, 0.5]) for (const fy of [-0.5, 0, 0.5]) for (const fz of [-0.5, -0.25, 0, 0.25, 0.5]) {
        // A board is drawn where it lies, lifted by its rattle while the tapped bridge still rattles.
        let px = board.x + fx * board.wide, py = board.y + fy * board.tall + evening.boardLift(index, board.slat)
        if (bent) {
          const dx = px - bent.pivot, dy = py - bent.base, cos = Math.cos(bent.angle), sin = Math.sin(bent.angle)
          px = bent.pivot + cos * dx - sin * dy
          py = bent.base + sin * dx + cos * dy
        }
        point.set(px, py, board.z + fz * board.deep).applyMatrix4(inverse)
        const across = ((point.x - middle[0]) / halves[0]) ** 2 + ((point.z - middle[2]) / halves[2]) ** 2
        if (across >= 1) continue
        const half = halves[1] * Math.sqrt(1 - across)
        // Inside it: the nearer of its under side and its upper side, in the room's units.
        const inside = Math.min(point.y - (middle[1] - half), middle[1] + half - point.y) * FOLK.king.size
        deep = Math.max(deep, inside)
      }
      // The first landing falls while the tapped boards still rattle: the frame the audit caught.
      if (bent && evening.acting(index) < 1) rattled++
      if (bent) { if (deep > bentDeep) { bentDeep = deep; deepestAt = frame } }
      else flat = Math.max(flat, deep)
    }
    expect(bends).toBe(2)
    expect(leaned).toBeGreaterThan(0.08)
    // He presses his cushion on a little, as on any seat: under five hundredths on a flat board, and no more on a
    // bent one, at the deepest point of the dip as at every other, while the boards of the tapped bridge still
    // rattle too. Boards that jump under him, or a seat that does not tip with the board, are deeper in.
    expect(flat).toBeLessThan(0.048)
    expect(bentDeep).toBeGreaterThan(0.03)
    expect(rattled).toBeGreaterThan(10)
    expect(bentDeep, `at frame ${deepestAt}`).toBeLessThan(0.048)
  })
})

describe('the dragon on his pillow', () => {
  it('lies on it: the pillow gives under his head as he nods, yawns and is poked, and his skull is never in it', () => {
    const play = new Play([at('round', 3, 1), at('cube', 3, 1), at('round', 6, 0), at('round', 6, 0), at('thin', 6, 0)], 1)
    const dragon = buildFolk().dragon
    let pillow: THREE.Mesh | null = null
    dragon.root.traverse((part) => { if (part.name === 'dragon-pillow') pillow = part as THREE.Mesh })
    const inverse = new THREE.Matrix4()
    // The pillow itself, in its own units: an egg shape with this middle and these half-widths.
    const middle = [0.42, 0.17, 0.02], halves = [0.36 * 1.35, 0.36 * 0.5, 0.36 * 1.5]
    let into = 0, unpressed = 0, flattest = 1
    const look = (frame: number): void => {
      play.advance(1 / 60)
      play.take()
      pose(dragon, play, 'dragon', frame / 60)
      const mesh = pillow as unknown as THREE.Mesh
      flattest = Math.min(flattest, mesh.scale.y / mesh.scale.x)
      inverse.copy(mesh.matrixWorld).invert()
      const squash = mesh.scale.y / mesh.scale.x
      corners(dragon, (point) => {
        const world = point.clone()
        point.applyMatrix4(inverse)
        const inside = 1 - Math.hypot((point.x - middle[0]) / halves[0], (point.y - middle[1]) / halves[1], (point.z - middle[2]) / halves[2])
        into = Math.max(into, inside * halves[1] * squash * FOLK.dragon.size)
        // The same corner against a pillow that does not give.
        point.y *= squash
        const before = 1 - Math.hypot((point.x - middle[0]) / halves[0], (point.y - middle[1]) / halves[1], (point.z - middle[2]) / halves[2])
        unpressed = Math.max(unpressed, before * halves[1] * FOLK.dragon.size)
        void world
      }, ['dragon-head'])
    }
    let frame = 0
    // An afternoon of his own doings, a poke, and evening falling on a castle that has nothing for him.
    for (; frame < 60 * 20; frame++) look(frame)
    play.folk.stir('dragon', 'poke')
    for (; frame < 60 * 24; frame++) look(frame)
    play.press({ origin: [BELL.x, 12, BELL.z], dir: [0, -1, 0] })
    play.pressEnd()
    for (; frame < 60 * 36; frame++) look(frame)
    expect(play.evening.rests.dragon.how).toBe('day')
    // Without the give his skull would be in the pillow, as the audit saw.
    expect(unpressed).toBeGreaterThan(0.03)
    expect(into).toBeLessThan(0.012)
    // It is pressed, never flattened away.
    expect(flattest).toBeGreaterThan(0.5)
  })
})

describe('the cook beside a room up high', () => {
  it('has his pot out in front of him where it is seen, with the spoon in it: never in a block, on the way up or lying there', () => {
    const rug = [at('round', 3, 1), at('cube', 3, 1), at('round', 6, 0), at('round', 6, 0), at('thin', 6, 0)]
    const play = new Play(rug, 1)
    const { evening } = play
    const cook = buildFolk().cook
    play.press({ origin: [BELL.x, 12, BELL.z], dir: [0, -1, 0] })
    play.pressEnd()
    let inBlock = 0
    const blocks = (): { min: number[]; max: number[] }[] => evening.things.map((thing) => {
      const [w, , d] = SIZE[thing.kind]
      return { min: [thing.x - w / 2, thing.base, thing.z - d / 2], max: [thing.x + w / 2, thing.top, thing.z + d / 2] }
    })
    const look = (frame: number): void => {
      play.advance(1 / 60)
      play.take()
      pose(cook, play, 'cook', frame / 60)
      const boxes = blocks()
      corners(cook, (point) => {
        for (const box of boxes) inBlock = Math.max(inBlock, Math.min(point.x - box.min[0], box.max[0] - point.x, point.y - box.min[1], box.max[1] - point.y, point.z - box.min[2], box.max[2] - point.z))
      }, ['cook-pot'])
    }
    let frame = 0, climbed = 0
    for (; frame < 60 * 11; frame++) { look(frame); climbed = Math.max(climbed, evening.cookHigh) }
    expect(evening.rests.cook).toMatchObject({ how: 'window', high: true })
    // On the way up his eyes are shut and his pot is on his head. Lying there they are open and it is out in front.
    expect(climbed).toBeGreaterThan(0.99)
    expect(evening.cookHigh).toBeLessThan(0.01)
    expect(play.sceneRunning).toBe(false)
    expect(inBlock).toBeLessThan(0.01)
    // Lying there: the pot is toward the child from him, and the spoon stands in it.
    const room = evening.things[evening.rests.cook.thing]
    const pot = new THREE.Box3(), spoon = new THREE.Box3()
    corners(cook, (point) => { pot.expandByPoint(point) }, ['cook-pot'])
    corners(cook, (point) => { spoon.expandByPoint(point) }, ['cook-spoon'])
    expect(room.what).toBe('room')
    expect((pot.min.z + pot.max.z) / 2).toBeGreaterThan(evening.actors.cook.placing.at[2] + 0.4)
    expect(spoon.min.z).toBeGreaterThan(pot.min.z - 0.15)
    expect(spoon.max.z).toBeLessThan(pot.max.z + 0.15)
    // Its bowl is at the mouth of the pot and its handle stands out of it, as when he stands.
    expect(spoon.min.x).toBeLessThan(pot.max.x + 0.05)
    expect(spoon.max.x).toBeGreaterThan(pot.min.x - 0.05)
    // A tap on the room clangs that pot.
    evening.act(room.index)
    expect(play.take()).toContainEqual({ type: 'act', what: 'room', clang: true })
    // Nothing later shuts his eyes or puts the pot back on his head: not a tap, a poke, or the way home.
    play.folk.stir('cook', 'poke')
    for (let i = 0; i < 120; i++) { look(frame++); expect(evening.cookHigh).toBeLessThan(0.01) }
    play.press({ origin: [BELL.x, 12, BELL.z], dir: [0, -1, 0] })
    play.pressEnd()
    for (let i = 0; i < 60 * 9; i++) { play.advance(1 / 60); play.take(); expect(evening.cookHigh).toBeLessThan(0.01) }
    // And a castle found standing, as on a load, has him lying there with his eyes open.
    expect(new Play(rug, 1, true).evening.cookHigh).toBe(0)
  })
})

describe('the cook lying with his cap in at a window, under what is built over his room', () => {
  /** Whether a point is inside a block as it is drawn: a line from it crosses the block's faces an odd number of times. */
  function inside(block: THREE.Mesh, point: THREE.Vector3, ray: THREE.Raycaster): boolean {
    let votes = 0
    for (const dir of [[0.13, 1, 0.07], [0.71, 0.05, 0.7], [-0.11, 0.2, -0.97]]) {
      ray.set(point, p.set(dir[0], dir[1], dir[2]).normalize())
      if (ray.intersectObject(block).length % 2 === 1) votes++
    }
    return votes >= 2
  }

  /** Taps, startles or pokes the cook where he lies under a block of this kind, and gives back how many corners of his cap were ever in a block, and how high his cap came in the plan of his room. */
  function under(kind: Kind, what: 'tap' | 'knock' | 'poke'): { lying: boolean; covered: boolean; inBlock: number; top: number; roomTop: number; moved: number; popped: number } {
    const play = new Play([at('cube', 2, 1), at(kind, 2, 1), at('round', 6, 0), at('round', 6, 0), at('thin', 6, 0)], 1, true)
    const { evening } = play
    const cook = buildFolk().cook
    // How far in at the window his cap reaches while he only lies there, breathing and at his small doings.
    let reach = -9, idleTop = -9
    const [w, , d] = SIZE.cube
    for (let frame = 0; frame < 60 * 13; frame++) {
      play.advance(1 / 60)
      play.take()
      pose(cook, play, 'cook', frame / 60)
      const { lie, thing } = evening.rests.cook, room = evening.things[thing]
      corners(cook, (corner) => {
        reach = Math.max(reach, corner.x * lie)
        if (room && Math.abs(corner.x - room.x) < w / 2 && Math.abs(corner.z - room.z) < d / 2) idleTop = Math.max(idleTop, corner.y)
      }, ['cook-cap'])
    }
    const rest = evening.rests.cook
    const room = evening.things[rest.thing]
    const seen = { lying: rest.how === 'window' && room?.kind === 'cube' && room.level === 0, covered: !!room?.covered, inBlock: 0, top: idleTop, roomTop: room?.top ?? 0, moved: 0, popped: 0 }
    if (!seen.lying) return seen
    // Every block on the rug, as the view draws it.
    const wood = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    // The room itself has his cap in at its window: what is asked is that it is in nothing else.
    const blocks = play.pieces
      .filter((piece) => piece.state === 'rug' && !(piece.kind === 'cube' && Math.abs(piece.y - room.base) < 0.01 && Math.abs(piece.x - room.x) < 0.01 && Math.abs(piece.z - room.z) < 0.01))
      .map((piece) => ({ piece, mesh: new THREE.Mesh(blockGeometry(piece.kind), wood), box: new THREE.Box3() }))
    const ray = new THREE.Raycaster(), point = new THREE.Vector3()
    let least = 9
    const cap = cook.root.getObjectByName('cook-cap')!, sits = cap.position.y
    if (what === 'tap') evening.act(room.index)
    else play.folk.stir('cook', what, 1)
    for (let frame = 0; frame < 60 * 3; frame++) {
      play.advance(1 / 60)
      play.take()
      pose(cook, play, 'cook', frame / 60)
      for (const { piece, mesh, box } of blocks) {
        mesh.position.set(piece.x, piece.y + piece.lift.value + piece.hop.value, piece.z)
        mesh.rotation.set(piece.leanX, piece.yaw + piece.jitter, piece.leanZ)
        mesh.updateMatrixWorld(true)
        box.setFromObject(mesh)
      }
      let tip = -9
      corners(cook, (corner) => {
        tip = Math.max(tip, corner.x * rest.lie)
        if (Math.abs(corner.x - room.x) < w / 2 && Math.abs(corner.z - room.z) < d / 2) seen.top = Math.max(seen.top, corner.y)
        for (const { mesh, box } of blocks) if (box.containsPoint(corner) && inside(mesh, point.copy(corner), ray)) seen.inBlock++
      }, ['cook-cap'])
      least = Math.min(least, tip)
      seen.popped = Math.max(seen.popped, cap.position.y - sits)
      // Never further in at the window than where he lies at rest.
      expect(tip, `${kind} ${what} ${frame}`).toBeLessThanOrEqual(reach + 0.002)
    }
    seen.moved = reach - least
    return seen
  }

  it('keeps every corner of his cap out of the block over his room, of each kind that can stand there, at every frame of the fast stir, of a startle and of a poke', () => {
    const stood: Kind[] = []
    let highest = -9
    for (const kind of KINDS) for (const what of ['tap', 'knock', 'poke'] as const) {
      const seen = under(kind, what)
      if (!seen.lying) continue
      if (what === 'tap') stood.push(kind)
      expect(seen.inBlock, `${kind} ${what}`).toBe(0)
      // Where his cap is in the plan of the room it is under the room's top, so under the foot of whatever stands on it.
      expect(seen.top, `${kind} ${what}`).toBeLessThan(seen.roomTop - 0.02)
      // And he is seen to answer: his cap draws back out of the window and comes in again.
      expect(seen.moved, `${kind} ${what}`).toBeGreaterThan(0.03)
      // His cap still pops off his head, by less than when he stands.
      expect(seen.popped, `${kind} ${what}`).toBeGreaterThan(0.05)
      highest = Math.max(highest, seen.top)
    }
    expect(stood).toEqual(['long', 'arch', 'round', 'thin', 'cube', 'slope'])
    expect(highest).toBeGreaterThan(0.5)
  })
})

describe('the eyelids of the folk', () => {
  const part = (view: FolkView, name: string): THREE.Mesh => view.root.getObjectByName(name) as THREE.Mesh

  /** The lids of one of the folk: one mesh for both eyes of the king and of the cook, one for each eye of the dragon. */
  const lidsOf = (view: FolkView): THREE.Mesh[] => {
    const lids: THREE.Mesh[] = []
    view.root.traverse((one) => { if (/-lids?$/.test(one.name)) lids.push(one as THREE.Mesh) })
    return lids
  }

  it('are a skin and not an open shell: every edge of a lid is between two of its faces', () => {
    const views = buildFolk()
    let count = 0
    for (const who of ['king', 'cook', 'dragon'] as const) for (const lid of lidsOf(views[who])) {
      count++
      const points = lid.geometry.getAttribute('position')
      const corner = new Map<string, number>(), edges = new Map<string, number>()
      const id = (i: number): number => {
        const key = [points.getX(i), points.getY(i), points.getZ(i)].map((value) => Math.round(value * 1e5)).join(',')
        if (!corner.has(key)) corner.set(key, corner.size)
        return corner.get(key)!
      }
      for (let i = 0; i < points.count; i += 3) {
        const [a, b, c] = [id(i), id(i + 1), id(i + 2)]
        if (a === b || b === c || a === c) continue
        for (const [from, to] of [[a, b], [b, c], [c, a]]) edges.set(from < to ? `${from}-${to}` : `${to}-${from}`, (edges.get(from < to ? `${from}-${to}` : `${to}-${from}`) ?? 0) + 1)
      }
      expect(edges.size, who).toBeGreaterThan(300)
      expect([...edges.values()].filter((count) => count !== 2).length, who).toBe(0)
    }
    // One for the king, one for the cook, two for the dragon.
    expect(count).toBe(4)
  })

  it('lie on their eyes, and no deeper in any closed part beside them than the audit allows that pair, for each of the three in the poses a played day and evening give him', { timeout: 120_000 }, () => {
    const views = buildFolk()
    /** What the audit allows a lid against each part beside it, as a part of the smaller of the two: how much deeper in one pose than in another, or for the dragon's rings how deep at all. A pair with no rule has the audit's own tolerance. */
    const allowed: [RegExp, number][] = [
      [/^king-(nut|face|pupils|crown)$/, 0.7], [/^cook-(nut|cap|spoon)$/, 1.8], [/^cook-pupils$/, 0.7],
      [/^dragon-head$/, 1.5], [/^dragon-pupils$/, 0.5], [/^dragon-rings$/, 1.05], [/./, 0.06],
    ]
    type Eye = { who: Who; lid: THREE.Mesh; corners: THREE.Vector3[]; middle: THREE.Vector3; r: number; inner: number; outer: number }
    type Part = { who: Who; name: string; mesh: THREE.Mesh; instance: number; faces: Float32Array; box: THREE.Box3 }
    const eyes: Eye[] = [], parts: Part[] = []
    const keyOf = (points: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, i: number): string => [points.getX(i), points.getY(i), points.getZ(i)].map((value) => Math.round(value * 1e5)).join(',')
    for (const who of ['king', 'cook', 'dragon'] as const) {
      const eye = EYE[who], skin = who === 'dragon' ? DRAGON_LID : LID
      for (const lid of lidsOf(views[who])) {
        const points = lid.geometry.getAttribute('position')
        // The king and the cook have both lids in one mesh, a lid each side of its middle; each of the dragon's is its own.
        for (const side of who === 'dragon' ? [0] : [-1, 1]) {
          const had = new Set<string>(), corners: THREE.Vector3[] = []
          for (let i = 0; i < points.count; i++) {
            if (side && Math.sign(points.getX(i)) !== side) continue
            if (had.has(keyOf(points, i))) continue
            had.add(keyOf(points, i))
            corners.push(new THREE.Vector3().fromBufferAttribute(points, i))
          }
          eyes.push({ who, lid, corners, middle: new THREE.Vector3(side * eye.x, 0, 0), r: eye.r, inner: skin.inner, outer: skin.outer })
        }
      }
      views[who].root.traverse((one) => {
        const mesh = one as THREE.Mesh
        if (!mesh.isMesh || /-lids?$/.test(one.name)) return
        const flat = mesh.geometry.getIndex() ? mesh.geometry.toNonIndexed() : mesh.geometry
        const points = flat.getAttribute('position')
        // Only a part that is closed has an inside: one with open edges (the husk of the crown) is left to the audit.
        const id = new Map<string, number>(), edges = new Map<string, number>()
        const corner = (i: number): number => { const key = keyOf(points, i); if (!id.has(key)) id.set(key, id.size); return id.get(key)! }
        for (let i = 0; i < points.count; i += 3) {
          const [p0, p1, p2] = [corner(i), corner(i + 1), corner(i + 2)]
          if (p0 === p1 || p1 === p2 || p0 === p2) continue
          for (const [from, to] of [[p0, p1], [p1, p2], [p2, p0]]) { const key = from < to ? `${from}-${to}` : `${to}-${from}`; edges.set(key, (edges.get(key) ?? 0) + 1) }
        }
        if ([...edges.values()].filter((count) => count === 1).length > 0.004 * edges.size) return
        const instances = (one as THREE.InstancedMesh).isInstancedMesh ? (one as THREE.InstancedMesh).count : 1
        for (let instance = 0; instance < instances; instance++) parts.push({ who, name: one.name, mesh, instance: instances > 1 ? instance : -1, faces: new Float32Array(points.array), box: new THREE.Box3().setFromBufferAttribute(points as THREE.BufferAttribute) })
      })
    }
    const off = { king: 0, cook: 0, dragon: 0 }
    const depths = new Map<string, { least: number; most: number; size: number; cap: number }>()
    const world = new THREE.Matrix4(), own = new THREE.Matrix4(), back = new THREE.Matrix4(), toParent = new THREE.Matrix4()
    const centre = new THREE.Vector3(), local = new THREE.Vector3(), near = new THREE.Vector3(), size = new THREE.Vector3()
    const face = new THREE.Triangle(), box = new THREE.Box3(), partBox = new THREE.Box3(), round = new THREE.Sphere()
    const drawn: THREE.Vector3[] = []
    const median = (from: THREE.Box3): number => from.getSize(size).toArray().sort((a, b) => a - b)[1]
    const DIRS = [[0.13, 0.98, 0.07], [0.71, 0.05, 0.7], [-0.11, 0.2, -0.97]]
    /** Whether a point is inside a closed part, in the part's own units: a line from it crosses the part's faces an odd number of times, by two lines out of three. */
    const inside = (faces: Float32Array, x: number, y: number, z: number): boolean => {
      let votes = 0
      for (let d = 0; d < 3 && votes < 2 && votes + (3 - d) >= 2; d++) {
        const [dx, dy, dz] = DIRS[d]
        let crossed = 0
        for (let i = 0; i < faces.length; i += 9) {
          const e1x = faces[i + 3] - faces[i], e1y = faces[i + 4] - faces[i + 1], e1z = faces[i + 5] - faces[i + 2]
          const e2x = faces[i + 6] - faces[i], e2y = faces[i + 7] - faces[i + 1], e2z = faces[i + 8] - faces[i + 2]
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x
          const det = e1x * px + e1y * py + e1z * pz
          if (Math.abs(det) < 1e-12) continue
          const tx = x - faces[i], ty = y - faces[i + 1], tz = z - faces[i + 2]
          const u = (tx * px + ty * py + tz * pz) / det
          if (u < 0 || u > 1) continue
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x
          const v = (dx * qx + dy * qy + dz * qz) / det
          if (v < 0 || u + v > 1) continue
          if ((e2x * qx + e2y * qy + e2z * qz) / det > 0) crossed++
        }
        if (crossed % 2 === 1) votes++
      }
      return votes >= 2
    }
    /** Every lid this frame: that it is on its eye, and when `deep` is asked, how far its deepest corner is inside each closed part of the same figure, as drawn. */
    const look = (play: Play, frame: number, deep: boolean): void => {
      for (const who of ['king', 'cook', 'dragon'] as const) pose(views[who], play, who, frame / 60)
      for (const eye of eyes) {
        // On its eye: every corner of the lid is in its skin round the middle of the eye, in the units of the head it is on.
        toParent.copy(eye.lid.parent!.matrixWorld).invert().multiply(eye.lid.matrixWorld)
        centre.copy(eye.middle).applyMatrix4(toParent)
        for (const at of eye.corners) {
          const from = local.copy(at).applyMatrix4(toParent).distanceTo(centre) / eye.r
          off[eye.who] = Math.max(off[eye.who], eye.inner - from, from - eye.outer)
        }
        if (!deep) continue
        const corners = eye.corners.map((at, i) => (drawn[i] ??= new THREE.Vector3()).copy(at).applyMatrix4(eye.lid.matrixWorld))
        box.setFromPoints(corners)
        const span = median(box)
        box.getBoundingSphere(round)
        for (const part of parts) {
          if (part.who !== eye.who || !part.mesh.visible) continue
          world.copy(part.mesh.matrixWorld)
          if (part.instance >= 0) { (part.mesh as THREE.InstancedMesh).getMatrixAt(part.instance, own); world.multiply(own) }
          partBox.copy(part.box).applyMatrix4(world)
          const key = `${part.name}${part.instance >= 0 ? ` ${part.instance}` : ''}`
          const seen = depths.get(key) ?? { least: 9, most: 0, size: Math.min(span, median(partBox)), cap: allowed.find(([name]) => name.test(part.name))![1] }
          depths.set(key, seen)
          let most = 0
          if (partBox.intersectsSphere(round)) {
            back.copy(world).invert()
            for (const at of corners) {
              local.copy(at).applyMatrix4(back)
              if (!part.box.containsPoint(local) || !inside(part.faces, local.x, local.y, local.z)) continue
              // How far in: to the nearest face of the part, in the room.
              let best = 9
              for (let i = 0; i < part.faces.length; i += 9) {
                face.a.fromArray(part.faces, i).applyMatrix4(world)
                if (face.a.distanceTo(at) > best + span) continue
                face.b.fromArray(part.faces, i + 3).applyMatrix4(world)
                face.c.fromArray(part.faces, i + 6).applyMatrix4(world)
                best = Math.min(best, face.closestPointToPoint(at, near).distanceTo(at))
              }
              most = Math.max(most, best)
            }
          }
          seen.least = Math.min(seen.least, most)
          seen.most = Math.max(seen.most, most)
        }
      }
    }
    const down = (x: number, z: number): { origin: [number, number, number]; dir: [number, number, number] } => ({ origin: [x, 12, z], dir: [0, -1, 0] })
    // A day: each of them startled, pleased and poked, their eyes on a bare finger across the rug, and the bell rung,
    // so each is lifted and carried to his place, the dragon with his head pulled in among his scales.
    const day = new Play([at('cube', 3, 1), at('arch', 4, 0)], 1)
    const shut = { king: 0, cook: 0, dragon: 0 }
    let pulled = 0, tucked = 0
    for (let frame = 0; frame < 60 * 26; frame++) {
      for (const [i, who] of (['king', 'cook', 'dragon'] as const).entries()) {
        if (frame === 60 * (1 + i)) day.folk.stir(who, 'knock', 1)
        if (frame === 60 * (4 + i)) day.folk.stir(who, 'taste', 1)
        if (frame === 60 * (7 + i)) day.folk.stir(who, 'poke')
      }
      if (frame === 60 * 10) day.press(down(placeX(0), placeZ(2)))
      if (frame === 60 * 11) day.carry(down(placeX(6), placeZ(0)))
      if (frame === 60 * 12) day.pressEnd()
      if (frame === 60 * 13) { day.press(down(BELL.x, BELL.z)); day.pressEnd() }
      day.advance(1 / 60)
      day.take()
      for (const who of ['king', 'cook', 'dragon'] as const) shut[who] = Math.max(shut[who], day.folk.pose(who).lid)
      pulled = Math.max(pulled, day.evening.actors.dragon.placing.tuck)
      look(day, frame, frame % 16 === 0)
    }
    // An evening: the gate tapped with the dragon's nose under it, and him poked with his head back under his rings.
    const castle = new Play([at('cube', 0, 1), at('arch', 3, 0), at('thin', 0, 0), at('round', 6, 0), at('slope', 0, 2), at('long', 4, 0), at('round', 2, 0), at('cube', 6, 1)], 1, true)
    const gate = castle.evening.things.findIndex((thing) => thing.what === 'gate')
    for (let frame = 0; frame < 60 * 9; frame++) {
      if (frame === 60 || frame === 60 * 5) castle.evening.act(gate)
      if (frame === 60 * 3 || frame === 60 * 6) castle.folk.stir('dragon', 'poke')
      if (frame === 60 * 7) for (const who of ['king', 'cook'] as const) castle.folk.stir(who, 'poke')
      castle.advance(1 / 60)
      castle.take()
      tucked = Math.max(tucked, castle.evening.tucked)
      look(castle, frame, frame % 8 === 0)
    }
    for (const who of ['king', 'cook', 'dragon'] as const) {
      expect(shut[who], who).toBeGreaterThan(0.9)
      expect(off[who], who).toBeLessThan(0.002)
    }
    expect(pulled).toBeGreaterThan(0.99)
    expect(tucked).toBeGreaterThan(0.99)
    expect(depths.size).toBeGreaterThan(12)
    for (const [name, seen] of depths) {
      // The dragon's rings are apart from his head for the audit, so a lid in them is held by how deep it is; a
      // part of the same figure by how much deeper it is in one pose than in another.
      const part = (/^dragon-rings/.test(name) ? seen.most : seen.most - seen.least) / seen.size
      expect(part, name).toBeLessThan(seen.cap)
    }
  })

  it('lie on his eyes in every pose the king has, and go no deeper into his nut in one pose than in another', () => {
    const king = buildFolk().king
    const lids = part(king, 'king-lids'), nut = part(king, 'king-nut')
    const body = lids.parent!
    const eye = EYE.king
    // Each corner of the lids once, with the eye it belongs to.
    const own: { at: THREE.Vector3; side: number }[] = []
    {
      const points = lids.geometry.getAttribute('position'), had = new Set<string>()
      for (let i = 0; i < points.count; i++) {
        const key = [points.getX(i), points.getY(i), points.getZ(i)].map((value) => Math.round(value * 1e5)).join(',')
        if (had.has(key)) continue
        had.add(key)
        own.push({ at: new THREE.Vector3().fromBufferAttribute(points, i), side: Math.sign(points.getX(i)) })
      }
    }
    // The faces of his nut round his eyes: the lids are measured against these, as they are drawn.
    const faces: THREE.Triangle[] = []
    {
      const points = nut.geometry.getAttribute('position')
      for (let i = 0; i < points.count; i += 3) {
        const face = new THREE.Triangle(new THREE.Vector3().fromBufferAttribute(points, i), new THREE.Vector3().fromBufferAttribute(points, i + 1), new THREE.Vector3().fromBufferAttribute(points, i + 2))
        const middle = face.getMidpoint(new THREE.Vector3())
        if (Math.hypot(Math.abs(middle.x) - eye.x, middle.y - eye.y, middle.z - eye.z) < 4 * eye.r) faces.push(face)
      }
    }
    const drawn = faces.map(() => new THREE.Triangle())
    const toBody = new THREE.Matrix4(), inBody = new THREE.Vector3(), corner = new THREE.Vector3(), near = new THREE.Vector3(), normal = new THREE.Vector3()
    const depths = new Map<string, number>()
    const seen = { shut: 0, tall: 0, low: 9, lean: 0, wobble: 0, gaze: [9, -9], seated: 0, air: 0, off: 0, span: 0 }
    /** Looks at the lids this frame: on their eyes, and how deep the deepest corner of them is in the nut. */
    const look = (play: Play, frame: number): void => {
      pose(king, play, 'king', frame / 60)
      const now = play.folk.pose('king')
      seen.shut = Math.max(seen.shut, now.lid)
      seen.tall = Math.max(seen.tall, now.squash)
      seen.low = Math.min(seen.low, now.squash)
      seen.lean = Math.max(seen.lean, Math.abs(now.lean))
      seen.gaze = [Math.min(seen.gaze[0], now.gazeX), Math.max(seen.gaze[1], now.gazeX)]
      seen.seated = Math.max(seen.seated, play.evening.kingSits)
      seen.air = Math.max(seen.air, play.evening.actors.king.placing.air)
      toBody.copy(body.matrixWorld).invert()
      for (const { at, side } of own) {
        inBody.copy(at).applyMatrix4(lids.matrixWorld).applyMatrix4(toBody)
        const from = Math.hypot(inBody.x - side * eye.x, inBody.y - eye.y, inBody.z - eye.z) / eye.r
        seen.off = Math.max(seen.off, LID.inner - from, from - LID.outer)
      }
      // How deep they are in the nut changes only with how he is drawn, so each way he is drawn is measured once.
      const key = [lids.rotation.x, ...body.scale.toArray(), ...king.root.scale.toArray()].map((value) => value.toFixed(3)).join(' ')
      if (depths.has(key)) return
      faces.forEach((face, i) => { drawn[i].set(corner.copy(face.a).applyMatrix4(nut.matrixWorld).clone(), corner.copy(face.b).applyMatrix4(nut.matrixWorld).clone(), corner.copy(face.c).applyMatrix4(nut.matrixWorld).clone()) })
      let deep = 0
      for (const { at } of own) {
        corner.copy(at).applyMatrix4(lids.matrixWorld)
        let best = 9, behind = false
        for (const face of drawn) {
          const far = face.closestPointToPoint(corner, near).distanceTo(corner)
          if (far >= best) continue
          best = far
          behind = face.getNormal(normal).dot(inBody.subVectors(corner, near)) < 0
        }
        if (behind) deep = Math.max(deep, best)
      }
      depths.set(key, deep)
      if (!seen.span) seen.span = new THREE.Box3().setFromObject(lids).getSize(corner).length()
    }
    const down = (x: number, z: number): { origin: [number, number, number]; dir: [number, number, number] } => ({ origin: [x, 12, z], dir: [0, -1, 0] })
    let frame = 0
    // By day: his blinks and both his small doings, a knock, a taste and a poke, his sulk, and his eyes on a bare
    // finger at each end of the rug.
    const day = new Play([at('cube', 3, 1)], 1)
    for (; frame < 60 * 26; frame++) {
      if (frame === 60 * 14) day.folk.stir('king', 'knock', 1)
      if (frame === 60 * 16) day.folk.stir('king', 'taste', 1)
      if (frame === 60 * 18) day.folk.stir('king', 'poke')
      if (frame === 60 * 20) day.folk.frown(true)
      if (frame === 60 * 21) day.press(down(placeX(0), placeZ(2)))
      if (frame === 60 * 23) day.carry(down(placeX(6), placeZ(0)))
      if (frame === 60 * 25) day.pressEnd()
      day.advance(1 / 60)
      day.take()
      look(day, frame)
    }
    expect(seen.shut).toBeGreaterThan(0.95)
    expect(seen.gaze[1] - seen.gaze[0]).toBeGreaterThan(0.05)
    // In the evening on the tip of his pole: he wobbles there, and stretches up tall to its flag when it is tapped.
    const tip = new Play([at('cube', 2, 1), at('round', 6, 0), at('round', 6, 0), at('thin', 6, 0)], 1, true)
    const pole = tip.evening.things.findIndex((thing) => thing.what === 'pole')
    expect(tip.evening.rests.king.thing).toBe(pole)
    expect(tip.evening.flagNear(pole)).toBe(true)
    let peeked = false
    for (frame = 0; frame < 60 * 8; frame++) {
      if (frame === 60 * 3) tip.evening.act(pole)
      if (frame === 60 * 5) tip.folk.stir('king', 'poke')
      tip.advance(1 / 60)
      for (const event of tip.take()) if (event.type === 'peek' && event.who === 'king') peeked = true
      look(tip, frame)
    }
    expect(peeked).toBe(true)
    expect(seen.seated).toBeGreaterThan(0.99)
    // And over a bridge with an end in the air: carried, thrown up by the board and set down.
    const board = new Play([at('cube', 3, 1), at('long', 2, 1), at('thin', 6, 0)], 1, true)
    let bends = 0
    for (frame = 0; frame < 60 * 9; frame++) {
      if (frame === 60) board.evening.act(board.evening.things.findIndex((thing) => thing.what === 'bridge'))
      board.advance(1 / 60)
      for (const event of board.take()) if (event.type === 'bend' && event.who === 'king') bends++
      look(board, frame)
    }
    expect(bends).toBeGreaterThan(0)
    expect(seen.air).toBeGreaterThan(0.5)
    expect(seen.tall).toBeGreaterThan(1.05)
    expect(seen.low).toBeLessThan(0.95)
    expect(seen.lean).toBeGreaterThan(0.1)
    // On the eye: every corner of a lid is in its skin round the middle of its own eye, in every one of those frames.
    expect(seen.off).toBeLessThan(0.002)
    // Against the nut: a lid is a little into the conker behind his eye, and no pose puts it in deeper than another
    // by more than a small part of the lids' own size. The audit allows 0.7 of it.
    const all = [...depths.values()]
    expect(all.length).toBeGreaterThan(20)
    expect(Math.max(...all)).toBeGreaterThan(0)
    expect((Math.max(...all) - Math.min(...all)) / seen.span).toBeLessThan(0.4)
    expect(Math.max(...all) / seen.span).toBeLessThan(0.5)
  })
})
