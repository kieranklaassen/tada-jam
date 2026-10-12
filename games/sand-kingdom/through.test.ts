import { describe, expect, it } from 'vitest'
import { BEACHES } from './beaches'
import { deserializeKingdom } from './kingdom'
import { Play } from './play'
import { BUCKET_HEIGHT, HANDLE_BOW, fromBough } from './things'

// The bucket, the shells and the wood as the shapes they are drawn as, and whether any of one is inside another.
// The audit of the drawn scene measures the same in the browser at a few moments; this holds it in every frame of
// every carry, let-go, turn-out, fall and standing-up, for each shell and each piece of wood, full and empty.
// The pail is taken for a solid, as the audit takes it: a shell under its open mouth counts as inside it.

const DT = 1 / 60
type Point = [number, number, number]

/** How wide the pail is at a height up it. */
const pailAt = (up: number): number => 0.44 + (0.16 * up) / BUCKET_HEIGHT
/** The longest reach of each shell from its middle, and how high its dome stands, before its size. */
const SHELL_REACH = [0.58, 0.78, 0.72], SHELL_TOP = 0.3

/** Points over the skin of the bucket as it is drawn now: its wall, its rim and its handle. */
function bucketSkin(play: Play): Point[] {
  const at = play.bucketPose(), out: Point[] = []
  const place = (x: number, y: number, z: number): void => {
    const sx = x * at.wide, sy = y * at.tall, sz = z * at.wide
    out.push([at.x + sx * Math.cos(at.turn) - sy * Math.sin(at.turn), at.y + sx * Math.sin(at.turn) + sy * Math.cos(at.turn), at.z + sz])
  }
  for (let level = 0; level <= 8; level++) {
    const up = (level / 8) * BUCKET_HEIGHT, r = level === 8 ? 0.645 : pailAt(up)
    for (let i = 0; i < 16; i++) place(Math.cos((i / 16) * Math.PI * 2) * r, up, Math.sin((i / 16) * Math.PI * 2) * r)
  }
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI, x = Math.cos(a) * (HANDLE_BOW + 0.04), y = Math.sin(a) * (HANDLE_BOW + 0.04)
    place(x, BUCKET_HEIGHT - 0.02 + y * Math.cos(at.handle), y * Math.sin(at.handle))
  }
  return out
}

/** How deep a point is inside the pail taken as a solid, or 0 outside it. */
function inPail(play: Play, [x, y, z]: Point): number {
  const at = play.bucketPose()
  const dx = x - at.x, dy = y - at.y
  const lx = (dx * Math.cos(at.turn) + dy * Math.sin(at.turn)) / at.wide, ly = (-dx * Math.sin(at.turn) + dy * Math.cos(at.turn)) / at.tall, lz = (z - at.z) / at.wide
  if (ly <= 0 || ly >= BUCKET_HEIGHT) return 0
  return Math.max(0, Math.min(pailAt(ly) - Math.hypot(lx, lz), ly, BUCKET_HEIGHT - ly))
}

/** The stub of a branch on each piece of wood, from its middle, as a round that holds it. */
const STUBS: readonly Point[] = [[0.45, 0.2, -0.05], [-0.3, 0.17, 0.1]]

/** A point in the world as a piece of wood has it: along it, up from it and across it. */
function inWood(play: Play, index: number, [x, y, z]: Point): Point {
  const at = play.woodPose(index)
  const dx = x - at.x, dz = z - at.z, dy = y - at.y
  const along = dx * Math.cos(at.turn) + dz * Math.sin(at.turn), across = -dx * Math.sin(at.turn) + dz * Math.cos(at.turn)
  return [along * Math.cos(at.rock) + dy * Math.sin(at.rock), -along * Math.sin(at.rock) + dy * Math.cos(at.rock), across]
}
function fromWood(play: Play, index: number, [a, b, c]: Point): Point {
  const at = play.woodPose(index)
  const along = a * Math.cos(at.rock) - b * Math.sin(at.rock), up = a * Math.sin(at.rock) + b * Math.cos(at.rock)
  return [at.x + along * Math.cos(at.turn) - c * Math.sin(at.turn), at.y + up, at.z + along * Math.sin(at.turn) + c * Math.cos(at.turn)]
}

/** Whether a shell is on the sand or in a tower, where the bucket could meet it. */
function shown(play: Play, index: number): boolean {
  return play.things.shells[index].state !== 'bucket' && play.hat !== index
}
/** A shell as a shape that holds all of it: a low round box where it lies, a ball where it stands in a tower's side. */
function shellShape(play: Play, index: number): { x: number; z: number; r: number; low: number; high: number; ball: boolean; y: number } {
  const at = play.shellPose(index), r = SHELL_REACH[index] * at.wide, tipped = Math.abs(Math.sin(at.tip))
  const top = SHELL_TOP * at.tall + 0.25 * tipped
  return { x: at.x, z: at.z, y: at.y, r, ball: tipped > 0.6, low: at.y - (Math.cos(at.tip) > 0 ? 0.05 + 0.25 * tipped : top), high: at.y + (Math.cos(at.tip) > 0 ? top : 0.05 + 0.25 * tipped) }
}

/** The deepest any of the bucket is in a shell or a piece of wood now, or they in it; 0 when it is clear of them all. */
function deepest(play: Play): { deep: number; what: string } {
  let deep = 0, what = ''
  const note = (d: number, name: string): void => {
    if (d > deep) {
      deep = d
      what = name
    }
  }
  const skin = bucketSkin(play)
  play.things.wood.forEach((_, index) => {
    for (const point of skin) {
      const [a, b, c] = inWood(play, index, point)
      note(0.2 - Math.hypot(a - Math.max(-1.1, Math.min(1.1, a)), b, c), `bucket in wood ${index}`)
      const stub = STUBS[index]
      note(0.24 - Math.hypot(a - stub[0], b - stub[1], c - stub[2]), `bucket in the stub of wood ${index}`)
    }
    for (let a = -1.26; a <= 1.27; a += 0.14) for (let i = 0; i < 6; i++) note(inPail(play, fromWood(play, index, [a, Math.cos(i * 1.047) * 0.18, Math.sin(i * 1.047) * 0.18])), `wood ${index} in bucket`)
    const stub = STUBS[index]
    for (const up of [0, 0.12, 0.23]) note(inPail(play, fromWood(play, index, [stub[0], stub[1] + up, stub[2]])), `the stub of wood ${index} in bucket`)
  })
  play.things.shells.forEach((_, index) => {
    if (!shown(play, index)) return
    const shape = shellShape(play, index)
    for (const [x, y, z] of skin) {
      const off = Math.hypot(x - shape.x, z - shape.z)
      if (shape.ball) note(shape.r - Math.hypot(off, y - shape.y), `bucket in shell ${index}`)
      else note(Math.min(shape.r - off, y - shape.low, shape.high - y), `bucket in shell ${index}`)
    }
    for (let i = 0; i < 12; i++) {
      const x = shape.x + Math.cos(i * 0.5236) * shape.r, z = shape.z + Math.sin(i * 0.5236) * shape.r
      for (const y of shape.ball ? [shape.y] : [shape.low + 0.05, shape.high]) note(inPail(play, [x, y, z]), `shell ${index} in bucket`)
    }
    note(inPail(play, [shape.x, shape.ball ? shape.y : shape.high, shape.z]), `shell ${index} in bucket`)
  })
  return { deep, what }
}

/** A game with a watch on it: every frame that passes is looked at. */
function watched(age: number, arrange?: (state: ReturnType<typeof deserializeKingdom>) => void): { play: Play; run: (seconds: number, doing: string) => void; worst: () => string } {
  const state = deserializeKingdom(null, age)
  arrange?.(state)
  const play = new Play(state, 1)
  let deep = 0, when = ''
  const look = (doing: string): void => {
    const now = deepest(play)
    if (now.deep > deep) {
      deep = now.deep
      when = `${now.what}, ${doing}, ${now.deep.toFixed(3)} deep`
    }
  }
  return {
    play,
    run: (seconds, doing) => {
      for (let t = 0; t < seconds - 1e-9; t += DT) {
        play.step(DT)
        look(doing)
      }
    },
    worst: () => (deep > 0.02 ? when : ''),
  }
}

/** The places the bucket is carried to: each shell and each piece of wood of a first visit, by name. */
const TARGETS = ['shell 0', 'shell 1', 'shell 2', 'wood 0', 'wood 1'] as const
function placeOf(play: Play, target: (typeof TARGETS)[number]): { x: number; z: number } {
  const index = Number(target.slice(-1))
  if (target.startsWith('shell')) return play.things.shells[index]
  // A little off its middle, so the stub of its branch is under the bucket.
  const wood = play.things.wood[index]
  return { x: wood.x + (index === 0 ? 0.45 : -0.3), z: wood.z }
}
/** Where the bucket starts from: where a first visit stands it, and from the far side of the thing. */
const STARTS: readonly (readonly [number, number] | null)[] = [null, [-3.4, 3.6], [0.3, 2.4]]
const STEPS = 40

describe('the bucket and what it is carried onto', () => {
  it('standing where a first visit and each built beach have it, it is in nothing', () => {
    for (const age of [3, 7]) {
      expect(deepest(new Play(deserializeKingdom(null, age), 1)).deep).toBeLessThan(0.02)
      for (const name of Object.keys(BEACHES)) expect(deepest(new Play(BEACHES[name](age), 1)).deep, name).toBeLessThan(0.02)
    }
  })

  it('turned out full of water with a shell in it, the shell pops out and lands away from the bucket', () => {
    for (const [x, z] of [[2.45, 5.45], [0, 3], [-2.5, 2.5], [4.2, 3.4]] as const) {
      const game = watched(7, (state) => {
        state.bucket = { ...state.bucket, x, z, holds: 'water', shell: true }
        state.shells[0] = { ...state.shells[0], state: 'bucket' }
      })
      const play = game.play
      play.press({ kind: 'bucket' })
      play.tap()
      game.run(1.4, `water and a shell at ${x}, ${z}`)
      expect(play.things.shells[0].state).toBe('lying')
      expect(play.things.bucket.shell).toBe(false)
      expect(game.worst()).toBe('')
    }
  })

  it('carried full past the shell in the side of a tower it goes over it, and is set down beside it', () => {
    for (let stop = 4; stop <= STEPS; stop += 4) {
      const state = BEACHES.kingdom(3)
      state.bucket = { ...state.bucket, x: 2.6, z: 5.6, holds: 'sand' }
      const play = new Play(state, 1), shell = play.things.shells[1]
      expect(shell.state).toBe('tower')
      let deep = 0, what = ''
      const look = (): void => {
        const now = deepest(play)
        if (now.deep > deep) {
          deep = now.deep
          what = now.what
        }
      }
      play.press({ kind: 'bucket' })
      // Across the front of the tower, where its shell looks out.
      for (let i = 1; i <= stop; i++) {
        play.drag(2.6 + ((-2.6 - 2.6) * i) / STEPS, 5.6 + ((4.5 - 5.6) * i) / STEPS, 0)
        play.step(DT)
        look()
      }
      play.release()
      for (let t = 0; t < 0.6; t += DT) {
        play.step(DT)
        look()
      }
      expect(play.poses.bucket.perch).toBe(0)
      expect(deep, `${what}, let go at step ${stop}`).toBeLessThan(0.02)
    }
  })

  for (const target of TARGETS) {
    it(`carried full onto ${target} it goes over the top of it, and let go at any moment it is set down beside it`, { timeout: 60_000 }, () => {
      for (const start of STARTS) {
        for (let stop = 4; stop <= STEPS + 8; stop += 4) {
          const game = watched(3, (state) => {
            if (start) state.bucket = { ...state.bucket, x: start[0], z: start[1] }
          })
          const play = game.play, doing = `${target} from ${start ?? 'home'}, let go at step ${stop}`
          expect(play.things.bucket.holds).toBe('sand')
          const to = placeOf(play, target), fromX = play.things.bucket.x, fromZ = play.things.bucket.z
          play.press({ kind: 'bucket' })
          // Onto it, and on past it.
          for (let i = 1; i <= stop; i++) {
            play.drag(fromX + ((to.x - fromX) * i) / STEPS, fromZ + ((to.z - fromZ) * i) / STEPS, 0)
            game.run(DT, `${doing}: carried`)
          }
          play.release()
          game.run(0.6, `${doing}: let go`)
          expect(play.poses.bucket.perch, doing).toBe(0)
          expect(play.poses.bucket.fly, doing).toBeNull()
          // It stands on the sand, beside every shell and clear of every piece of wood.
          for (const shell of play.things.shells) expect(Math.hypot(shell.x - play.things.bucket.x, shell.z - play.things.bucket.z), doing).toBeGreaterThan(1.4)
          for (const wood of play.things.wood) expect(fromBough(wood, play.things.bucket.x, play.things.bucket.z).off, doing).toBeGreaterThan(1.0)
          // Turned out there, whatever it stands against.
          play.press({ kind: 'bucket' })
          play.tap()
          game.run(1.4, `${doing}: turned out`)
          expect(play.things.bucket.holds, doing).toBe('nothing')
          expect(game.worst(), doing).toBe('')
        }
      }
    })

    it(`dragged empty onto ${target} it never goes through it, let go at any moment, fallen over and stood up again`, () => {
      for (const start of STARTS) {
        for (let stop = 4; stop <= STEPS + 8; stop += 4) {
          const game = watched(7, (state) => {
            if (start) state.bucket = { ...state.bucket, x: start[0], z: start[1] }
          })
          const play = game.play, doing = `${target} from ${start ?? 'home'}, let go at step ${stop}`
          expect(play.things.bucket.holds).toBe('nothing')
          const to = placeOf(play, target), fromX = play.things.bucket.x, fromZ = play.things.bucket.z
          play.press({ kind: 'bucket' })
          for (let i = 1; i <= stop && !play.things.bucket.side; i++) {
            play.drag(fromX + ((to.x - fromX) * i) / STEPS, fromZ + ((to.z - fromZ) * i) / STEPS, 0)
            game.run(DT, `${doing}: dragged`)
          }
          play.release()
          game.run(1.0, `${doing}: let go`)
          if (play.things.bucket.side) {
            // A tap stands it up where it lies.
            play.press({ kind: 'bucket' })
            play.tap()
            game.run(0.9, `${doing}: stood up`)
            expect(play.things.bucket.side, doing).toBe(false)
          }
          expect(game.worst(), doing).toBe('')
        }
      }
    })
  }

  it('the empty bucket dragged at a piece of wood from any side knocks it, is thrown back and falls over clear of it', () => {
    let tipped = 0
    for (const index of [0, 1]) {
      // From each side of it and from beyond each end, a short way off: a longer drag would fill the bucket.
      for (const [along, across] of [[-0.8, 1.7], [0, 1.7], [0.8, 1.7], [-0.8, -1.7], [0, -1.7], [0.8, -1.7], [2.9, 0], [-2.9, 0], [2.4, 1.2], [-2.4, -1.2]]) {
        const game = watched(7, (state) => {
          // Laid all but level in the middle of the beach, where the bucket is clear of the rocks on every side of the wood.
          const wood = { ...state.wood[index], x: 0.3, z: 3.8, turn: index === 0 ? 0.1 : -0.14 }, ax = Math.cos(wood.turn), az = Math.sin(wood.turn)
          state.bucket = { ...state.bucket, x: 0.3 + ax * along - az * across, z: 3.8 + az * along + ax * across }
          // The shells and the other piece out of the way.
          state.wood[index] = wood
          state.wood[1 - index] = { ...state.wood[1 - index], x: -4.5, z: 0.5 }
          state.shells.forEach((shell, i) => { state.shells[i] = { ...shell, x: 3.5 + i * 0.1, z: -1.5 + i * 1.5 } })
        })
        const play = game.play, wood = play.things.wood[index], doing = `wood ${index} from ${along}, ${across}`
        const fromX = play.things.bucket.x, fromZ = play.things.bucket.z
        const aim = fromBough(wood, fromX, fromZ)
        play.press({ kind: 'bucket' })
        let nearest = Infinity
        for (let i = 1; i <= STEPS && !play.things.bucket.side; i++) {
          play.drag(fromX + ((aim.x - fromX) * i) / STEPS, fromZ + ((aim.z - fromZ) * i) / STEPS, 0)
          nearest = Math.min(nearest, fromBough(wood, play.things.bucket.x, play.things.bucket.z).off)
          game.run(DT, `${doing}: dragged`)
        }
        expect(play.things.bucket.side, doing).toBe(true)
        tipped += 1
        expect(play.heard.some((heard) => heard.name === 'clang'), doing).toBe(true)
        // Its wall came up to the wood and no nearer: the shapes are looked at in every frame, and this is its middle.
        expect(nearest, doing).toBeGreaterThan(0.7)
        // It stays upright while it is in the air, and goes over once it has landed.
        expect(play.poses.bucket.fly?.flat, doing).toBe(true)
        expect(play.poses.bucket.tilt, doing).toBeLessThan(0.01)
        game.run(1.0, `${doing}: fallen`)
        expect(play.poses.bucket.tilt, doing).toBeGreaterThan(0.95)
        expect(fromBough(wood, play.things.bucket.x, play.things.bucket.z).off, doing).toBeGreaterThan(1.3)
        play.press({ kind: 'bucket' })
        play.tap()
        game.run(0.9, `${doing}: stood up`)
        expect(play.things.bucket.side, doing).toBe(false)
        expect(game.worst(), doing).toBe('')
      }
    }
    expect(tipped).toBe(20)
  })
})

describe('the shell shot out from under a tower', () => {
  /** How deep a shell is in a piece of wood or another shell now. */
  function shellIn(play: Play, index: number): { deep: number; what: string } {
    const shape = shellShape(play, index)
    let deep = 0, what = ''
    play.things.wood.forEach((_, piece) => {
      for (let i = 0; i < 12; i++) {
        for (const y of [shape.low + 0.03, shape.high]) {
          const [a, b, c] = inWood(play, piece, [shape.x + Math.cos(i * 0.5236) * shape.r * 0.9, y, shape.z + Math.sin(i * 0.5236) * shape.r * 0.9])
          const inside = 0.18 - Math.hypot(a - Math.max(-1.1, Math.min(1.1, a)), b, c)
          if (inside > deep) {
            deep = inside
            what = `wood ${piece}`
          }
        }
      }
    })
    play.things.shells.forEach((_, other) => {
      if (other === index || !shown(play, other)) return
      const there = shellShape(play, other)
      const inside = Math.min(shape.r * 0.9 + there.r * 0.9 - Math.hypot(shape.x - there.x, shape.z - there.z), shape.high - there.low, there.high - shape.low)
      if (inside > deep) {
        deep = inside
        what = `shell ${other}`
      }
    })
    return { deep, what }
  }

  it('goes a way that is clear, stops short of a piece of wood or another shell, and where it is hemmed in on every side it is left lying', () => {
    let short = 0, shot = 0, left = 0
    for (let turn = 0; turn < 8; turn++) {
      for (const far of [1.9, 2.3, 3.0]) {
        const angle = (turn / 8) * Math.PI * 2
        const play = new Play(deserializeKingdom(null, 4), 3)
        // The full bucket against a shell, and round them a piece of wood and another shell, wherever the first may fly.
        Object.assign(play.things.bucket, { x: -0.6, z: 4.2, holds: 'sand', shell: false, side: false })
        Object.assign(play.things.shells[0], { x: 0.8, z: 4.2, state: 'lying' })
        Object.assign(play.things.wood[0], { x: 0.8 + Math.cos(angle) * far, z: 4.2 + Math.sin(angle) * far * 0.8, turn: angle + Math.PI / 2 })
        Object.assign(play.things.wood[1], { x: 0.8 - Math.cos(angle) * far, z: 4.2 - Math.sin(angle) * far * 0.8, turn: angle + Math.PI / 2 + 0.3 })
        Object.assign(play.things.shells[1], { x: 0.8 + Math.cos(angle + 1.3) * far, z: 4.2 + Math.sin(angle + 1.3) * far * 0.8, state: 'lying' })
        Object.assign(play.things.shells[2], { x: 0.8 + Math.cos(angle - 1.5) * far, z: 4.2 + Math.sin(angle - 1.5) * far * 0.8, state: 'lying' })
        play.press({ kind: 'bucket' })
        play.tap()
        const doing = `things ${far} away, turned ${turn}`
        const flying = play.poses.shells.findIndex((pose) => pose.fly?.skid === true)
        expect(flying >= 0, doing).toBe(play.heard.some((one) => one.name === 'ping'))
        if (flying >= 0) {
          shot += 1
          const gone = Math.hypot(play.things.shells[flying].x - play.poses.shells[flying].fly!.fx, play.things.shells[flying].z - play.poses.shells[flying].fly!.fz)
          expect(gone, doing).toBeGreaterThan(1.5)
          if (gone < 2.5) short += 1
        } else {
          // Nowhere to go: the tower was turned out beside it, and it lies where it lay.
          left += 1
          expect(play.things.shells[0].x, doing).toBe(0.8)
          expect(play.things.shells[0].z, doing).toBe(4.2)
          expect(play.poses.shells.every((pose) => pose.fly === null), doing).toBe(true)
        }
        for (let frame = 0; frame < 70; frame++) {
          play.step(DT)
          for (const index of flying >= 0 ? [flying] : [0, 1, 2]) {
            const now = shellIn(play, index)
            expect(now.deep, `${doing}: shell ${index} in ${now.what} at frame ${frame}`).toBeLessThan(0.02)
          }
        }
        expect(play.poses.shells.every((pose) => pose.fly === null), doing).toBe(true)
      }
    }
    // Hemmed in like this it often cannot go the whole way, and sometimes cannot go at all.
    expect(shot).toBeGreaterThan(8)
    expect(short).toBeGreaterThan(2)
    expect(left).toBeGreaterThan(0)
  })
})
