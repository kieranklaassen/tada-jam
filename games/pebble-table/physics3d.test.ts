import * as CANNON from 'cannon-es'
import { describe, expect, it, vi } from 'vitest'
import { TableController } from './controller'
import { FEEDING, SCALE, TABLE } from './layout'
import { JARS, PART_KINDS } from './parts'
import { panOf } from './scale'
import { STEP, TablePhysics, to3, toWorld2 } from './physics3d'
import { defaultTable } from './state'

const run = (physics: TablePhysics, seconds: number) => {
  let last = physics.step(0)
  for (let t = 0; t < seconds; t += STEP) last = physics.step(STEP)
  return last
}

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
      if (inPan.sleepState !== CANNON.Body.SLEEPING) panAwake++
      if (away.sleepState !== CANNON.Body.SLEEPING) awayAwake++
    }
    expect(panAwake, 'steps the stone in the swinging pan was awake').toBeGreaterThan(200)
    expect(awayAwake, 'steps the shell lying away from the scale was awake').toBe(0)
  })

  it('meets a pan that fell asleep where it hangs now: a stick dropped in as the beam tips lands where trying every shape lands it', () => {
    const drop = (everyShape: boolean) => {
      const physics = new TablePhysics()
      if (everyShape) delete (physics.world.narrowphase as { getContacts?: unknown }).getContacts
      physics.setMat('scale')
      run(physics, 1.5)
      const pan = SCALE.pans[0]
      physics.addPart(1, 'stick', { x: pan.x - 10, y: pan.y + 5 }, { y: 14, yaw: 0.4 })
      physics.addPart(2, 'shell', { x: pan.x + 20, y: pan.y - 10 }, { y: 18 })
      for (let t = 0; t < 1.5; t += STEP) {
        physics.setPanDrops([Math.min(t, 0.5) * 40, -Math.min(t, 0.5) * 40])
        physics.step(STEP)
      }
      return [1, 2].flatMap((id) => [...physics.body(id)!.position.toArray(), ...physics.body(id)!.quaternion.toArray()])
    }
    expect(drop(false)).toEqual(drop(true))
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
    physics.body(1)!.velocity.set(90, 0, 0)
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
      body.position.set(at.x, at.y + 1, at.z)
      body.velocity.set(5 * sign, 0, 0)
      physics.step(STEP)
      if (body.sleepState === CANNON.Body.SLEEPING) slept = t
    }
    expect(slept).toBeGreaterThan(5)
    expect(slept).toBeLessThan(8)
    run(physics, 0.1)
    body.wakeUp()
    let again = Infinity
    for (let t = 0; t < 3 && again === Infinity; t += STEP) {
      const sign = Math.round(t / STEP) % 2 ? 1 : -1
      body.position.set(at.x, at.y + 1, at.z)
      body.velocity.set(5 * sign, 0, 0)
      physics.step(STEP)
      if (body.sleepState === CANNON.Body.SLEEPING) again = t
    }
    expect(again).toBeLessThan(1.5)
  })

  it("lands every jar tipped out onto stones on the scale exactly where trying every shape of each pair against every other, with cannon's own bounds, does", () => {
    const topDown = { toScreen: (v: { x: number; z: number }) => toWorld2(v), toPlane: (screen: { x: number; y: number }) => screen }
    const pour = (everyShape: boolean) => {
      let seed = 11
      const random = vi.spyOn(Math, 'random').mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)
      try {
        const pieces = [0, 1, 2, 3].map((i) => ({ id: 500 + i, q: 4 as const, x: 700 + i * 60, y: 640 }))
        const table = new TableController({ ...defaultTable(6), liveMat: 'scale', pieces, bag: 36 }, { save: () => {} })
        if (everyShape) {
          delete (table.physics.world.narrowphase as { getContacts?: unknown }).getContacts
          const addPart = table.physics.addPart.bind(table.physics)
          table.physics.addPart = (id, ...rest) => {
            addPart(id, ...rest)
            delete (table.physics.body(id) as { updateAABB?: unknown }).updateAABB
          }
        }
        table.setProjector(topDown)
        let [clock, contacts] = [0, 0]
        for (const kind of PART_KINDS) {
          table.pointerDown(1, JARS[kind], (clock += 10))
          table.pointerUp(1, JARS[kind], (clock += 80))
          for (let k = 0; k < 15; k++) table.step(1 / 60)
        }
        for (let k = 0; k < 150; k++) {
          table.step(1 / 60)
          contacts += table.physics.world.contacts.length
        }
        return { contacts, poses: table.physics.world.bodies.flatMap((body) => [...body.position.toArray(), ...body.quaternion.toArray()]) }
      } finally {
        random.mockRestore()
      }
    }
    const near = pour(false)
    const every = pour(true)
    expect(near.contacts).toBeGreaterThan(5000)
    expect(near.contacts).toBe(every.contacts)
    expect(near.poses).toEqual(every.poses)
  })
})
