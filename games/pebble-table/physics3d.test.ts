import { describe, expect, it, vi } from 'vitest'
import { TableController } from './controller'
import { FEEDING, SCALE, TABLE } from './layout'
import { JARS, PART_KINDS } from './parts'
import { panOf } from './scale'
import { physicsReady, STEP, TablePhysics, to3, toWorld2 } from './physics3d'
import { partReachDown } from './partShape'
import { DISH_PROFILE, PAN_DEPTH, PAN_FLOOR, surfaceUnder } from './surfaces'
import { defaultTable } from './state'

const run = (physics: TablePhysics, seconds: number) => {
  let last = physics.step(0)
  for (let t = 0; t < seconds; t += STEP) last = physics.step(STEP)
  return last
}

await physicsReady()

describe('coordinates', () => {
  it('round-trips world points through 3D', () => {
    const p = { x: 321, y: 777 }
    const back = toWorld2(to3(p))
    expect(back.x).toBeCloseTo(p.x)
    expect(back.y).toBeCloseTo(p.y)
  })
})

describe('TablePhysics', () => {
  it('drops a stone onto the table where it comes to rest', () => {
    const physics = new TablePhysics()
    physics.addStone(1, 4, { x: 700, y: 500 }, { y: 8 })
    const report = run(physics, 2)
    const body = physics.body(1)!
    expect(body.position.y).toBeGreaterThan(0)
    expect(body.position.y).toBeLessThan(3)
    expect(report.moving).toBe(false)
    expect(physics.position2(1)!.x).toBeCloseTo(700, -1)
  })

  it('reports a stone swept off the table edge as fallen', () => {
    const physics = new TablePhysics()
    physics.addStone(1, 4, { x: TABLE.x + 60, y: 500 })
    run(physics, 0.5)
    let fallen: number[] = []
    for (let x = TABLE.x + 160; x > TABLE.x - 120 && fallen.length === 0; x -= 3) {
      physics.setBroom(7, { x, y: 500 })
      fallen = physics.step(STEP).fallen
    }
    physics.setBroom(7, null)
    for (let t = 0; t < 3 && fallen.length === 0; t += STEP) fallen = physics.step(STEP).fallen
    expect(fallen).toEqual([1])
  })

  it('keeps a crowd of five stones inside the bowl', () => {
    const physics = new TablePhysics()
    physics.setMat('feeding')
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2
      physics.addStone(i + 1, 4, { x: FEEDING.bowl.x + Math.cos(angle) * 40, y: FEEDING.bowl.y + Math.sin(angle) * 40 }, { y: 3 + i * 3 })
    }
    run(physics, 3)
    for (let i = 1; i <= 5; i++) {
      const p = physics.position2(i)!
      expect(Math.hypot(p.x - FEEDING.bowl.x, p.y - FEEDING.bowl.y)).toBeLessThan(FEEDING.bowl.r)
    }
  })

  it('catches a stone released above a pan, and the pan carries it down', () => {
    const physics = new TablePhysics()
    physics.setMat('scale')
    const pan = SCALE.pans[0]
    physics.addStone(1, 4, pan, { y: 12 })
    run(physics, 1.5)
    expect(panOf(physics.position2(1)!)).toBe(0)
    const before = physics.body(1)!.position.y
    for (let t = 0; t < 1; t += STEP) {
      physics.setPanDrops([SCALE.maxDrop * Math.min(1, t * 2), -SCALE.maxDrop * Math.min(1, t * 2)])
      physics.step(STEP)
    }
    expect(physics.body(1)!.position.y).toBeLessThan(before - 3)
    expect(panOf(physics.position2(1)!)).toBe(0)
  })

  it('lets a pan swinging on after the beam stops wake only what lies in or against it', () => {
    const physics = new TablePhysics()
    physics.setMat('scale')
    physics.addStone(1, 4, SCALE.pans[0], { y: 12 })
    physics.addPart(2, 'shell', { x: 700, y: 820 })
    run(physics, 3)
    const [inPan, away] = [physics.body(1)!, physics.body(2)!]
    expect(panOf(physics.position2(1)!)).toBe(0)
    let [panAwake, awayAwake] = [0, 0]
    for (let t = 0; t < 2; t += STEP) {
      physics.setPanDrops([0, 0], Math.sin(t * 6) * 0.6)
      physics.step(STEP)
      if (!inPan.asleep) panAwake++
      if (!away.asleep) awayAwake++
    }
    expect(panAwake, 'steps the stone in the swinging pan was awake').toBeGreaterThan(200)
    expect(awayAwake, 'steps the shell lying away from the scale was awake').toBe(0)
  })

  it('meets a pan that fell asleep where it hangs now: a stick and a shell dropped in as the beam tips land in it, on its floor', () => {
    const drop = () => {
      const physics = new TablePhysics()
      physics.setMat('scale')
      run(physics, 1.5)
      const pan = SCALE.pans[0]
      physics.addPart(1, 'stick', { x: pan.x - 10, y: pan.y + 5 }, { y: 14, yaw: 0.4 })
      physics.addPart(2, 'shell', { x: pan.x + 20, y: pan.y - 10 }, { y: 18 })
      for (let t = 0; t < 1.5; t += STEP) {
        physics.setPanDrops([Math.min(t, 0.5) * 40, -Math.min(t, 0.5) * 40])
        physics.step(STEP)
      }
      return physics
    }
    const physics = drop()
    for (const id of [1, 2]) {
      const body = physics.body(id)!
      const { x, y, z, w } = body.quaternion
      expect(panOf(physics.position2(id)!), `part ${id} lies in the pan`).toBe(0)
      const low = body.position.y - partReachDown(id === 1 ? 'stick' : 'shell', x, y, z, w)
      expect(low, `part ${id}'s lowest point is on the pan's floor, not under it`).toBeGreaterThan(physics.panFloor(0) - 0.15)
    }
    expect(drop().poses()).toEqual(physics.poses())
  })

  it('holds a stone in the air and throws it with the finger on release', () => {
    const physics = new TablePhysics()
    physics.addStone(1, 4, { x: 600, y: 500 })
    physics.hold(1)
    physics.moveHeld(1, { x: 650, y: 520 })
    run(physics, 0.5)
    expect(physics.position2(1)).toMatchObject({ x: 650, y: 520 })
    physics.release(1, { x: 400, y: 0 })
    run(physics, 2)
    expect(physics.position2(1)!.x).toBeGreaterThan(670)
  })

  it('lifts a held stone out of a crowd without scattering its neighbours', () => {
    const physics = new TablePhysics()
    physics.setMat('feeding')
    physics.addStone(1, 4, { x: FEEDING.bowl.x - 25, y: FEEDING.bowl.y })
    physics.addStone(2, 4, { x: FEEDING.bowl.x + 35, y: FEEDING.bowl.y })
    run(physics, 1)
    const before = physics.position2(2)!
    physics.hold(1)
    physics.moveHeld(1, { x: FEEDING.bowl.x + 60, y: FEEDING.bowl.y - 200 })
    run(physics, 0.5)
    const after = physics.position2(2)!
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(3)
  })

  it('sweeps stones ahead of a broom finger', () => {
    const physics = new TablePhysics()
    physics.addStone(1, 4, { x: 700, y: 500 })
    run(physics, 0.5)
    for (let x = 600; x < 760; x += 4) {
      physics.setBroom(9, { x, y: 500 })
      physics.step(1 / 120)
    }
    physics.setBroom(9, null)
    run(physics, 1)
    expect(physics.position2(1)!.x).toBeGreaterThan(740)
  })

  it('bounces stones off fixtures such as a seated guest', () => {
    const physics = new TablePhysics()
    physics.setFixture('guest', { x: 800, y: 500, r: 46 })
    physics.addStone(1, 4, { x: 700, y: 500 })
    physics.body(1)!.setVelocity(90, 0, 0)
    run(physics, 2)
    expect(physics.position2(1)!.x).toBeLessThan(800 - 46 - 25)
  })

  it('lets a loose part jittering against a neighbour for long fall asleep, and again straight after a neighbour wakes it, but not a part that has just landed', () => {
    const physics = new TablePhysics()
    physics.addPart(1, 'shell', { x: 700, y: 500 })
    run(physics, 1)
    const body = physics.body(1)!
    const at = body.position.clone()
    body.wakeUp()
    let slept = Infinity
    for (let t = 0; t < 10 && slept === Infinity; t += STEP) {
      const sign = Math.round(t / STEP) % 2 ? 1 : -1
      body.place({ x: at.x, y: at.y + 1, z: at.z })
      body.setVelocity(5 * sign, 0, 0)
      physics.step(STEP)
      if (body.asleep) slept = t
    }
    expect(slept).toBeGreaterThan(5)
    expect(slept).toBeLessThan(8)
    run(physics, 0.1)
    body.wakeUp()
    let again = Infinity
    for (let t = 0; t < 3 && again === Infinity; t += STEP) {
      const sign = Math.round(t / STEP) % 2 ? 1 : -1
      body.place({ x: at.x, y: at.y + 1, z: at.z })
      body.setVelocity(5 * sign, 0, 0)
      physics.step(STEP)
      if (body.asleep) again = t
    }
    expect(again).toBeLessThan(1.5)
  })

  it('sounds a shell or stick landing fast on a stone, though it is slowed just before it lands', () => {
    for (const kind of ['shell', 'stick'] as const) {
      const physics = new TablePhysics()
      physics.addStone(1, 4, { x: 800, y: 700 })
      for (let t = 0; t < 1; t += STEP) physics.step(STEP)
      const top = physics.stoneTop(1)!
      physics.addPart(2, kind, { x: 800, y: 700 }, { y: top + 8, velocity: { x: 0, y: -130, z: 0 } })
      const part = physics.body(2)!
      let first: { speed: number; height: number } | null = null
      for (let t = 0; t < 0.5 && !first; t += STEP) {
        const { impacts } = physics.step(STEP)
        if (impacts.length) first = { speed: Math.max(...impacts), height: part.position.y }
      }
      expect(first, `${kind}: a landing is heard`).not.toBeNull()
      expect(first!.height, `${kind}: the first sound is its landing on the stone, not the table`).toBeGreaterThan(top - 1)
      expect(first!.speed, `${kind}: heard as fast as it came in`).toBeGreaterThan(25)
    }
  })

  it('lands every jar tipped out onto stones on the scale on what it falls on, the same way every time', () => {
    const topDown = { toScreen: (v: { x: number; z: number }) => toWorld2(v), toPlane: (screen: { x: number; y: number }) => screen }
    const pour = () => {
      let seed = 11
      const random = vi.spyOn(Math, 'random').mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)
      try {
        const pieces = [0, 1, 2, 3].map((i) => ({ id: 500 + i, q: 4 as const, x: 700 + i * 60, y: 640 }))
        const table = new TableController({ ...defaultTable(6), liveMat: 'scale', pieces, bag: 36 }, { save: () => {} })
        table.setProjector(topDown)
        let clock = 0
        for (const kind of PART_KINDS) {
          table.pointerDown(1, JARS[kind], (clock += 10))
          table.pointerUp(1, JARS[kind], (clock += 80))
          for (let k = 0; k < 15; k++) table.step(1 / 60)
        }
        for (let k = 0; k < 150; k++) table.step(1 / 60)
        const surfaces = table.physics.surfaces('scale', table.state.seats)
        // Each part's lowest point against what lies under it: the table, a pan's floor, or the stone or part it rests on (never below the first two).
        // One that rolled on the table in under a hanging pan's dish lies on the table, not in the pan.
        const sunk = table.state.parts.map((part) => {
          const body = table.physics.body(part.id)!
          const { x, y, z, w } = body.quaternion
          const floor = surfaceUnder(toWorld2(body.position), surfaces)
          const underPan = floor > 0 && body.position.y < floor - PAN_FLOOR + DISH_PROFILE[0][1] * PAN_DEPTH
          return (underPan ? 0 : floor) - (body.position.y - partReachDown(part.kind, x, y, z, w))
        })
        return { parts: table.state.parts.length, sunk: Math.max(...sunk), poses: table.physics.poses() }
      } finally {
        random.mockRestore()
      }
    }
    const first = pour()
    expect(first.parts, 'every jar tipped out').toBeGreaterThan(10)
    expect(first.sunk, 'how far the deepest part lies below the table or pan floor under it (cm)').toBeLessThan(0.15)
    expect(pour().poses, 'the same pour lands the same').toEqual(first.poses)
  }, 60_000)
})
