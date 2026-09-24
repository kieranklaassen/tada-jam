import { describe, expect, it } from 'vitest'
import { Bee, BEE_SCALE, type BeeEvents, type BeeMode, type BeeWorld, type Vec3 } from './bee'
import { CHILD, groundY, PLOT_RADIUS, plotTop, PLOTS } from './layout'
import { BEE_HEAD } from './view/geometry'

const FRAME = 1 / 60

function makeWorld(bloomed: number[], overrides: Partial<BeeWorld> = {}): BeeWorld {
  return {
    flowerHead: (plot, out) => {
      if (!bloomed.includes(plot)) return false
      out.x = PLOTS[plot].x
      out.z = PLOTS[plot].z
      out.y = groundY(PLOTS[plot].x, PLOTS[plot].z) + 16
      return true
    },
    isNew: () => false,
    wouldMix: () => true,
    readyToMix: () => false,
    dropSpot: (out) => {
      out.x = 30
      out.y = groundY(30, 12)
      out.z = 12
    },
    berth: (plot, out) => {
      if (!bloomed.includes(plot)) return -Infinity
      out.x = PLOTS[plot].x
      out.z = PLOTS[plot].z
      out.y = groundY(PLOTS[plot].x, PLOTS[plot].z) + 16
      return out.y + 2.2
    },
    pointAt: -1,
    visitEvery: 2,
    ...overrides,
  }
}

function makeBee() {
  const log: string[] = []
  const drops: Vec3[] = []
  const events: BeeEvents = {
    land: (plot) => log.push(`land ${plot}`),
    sip: (plot) => log.push(`sip ${plot}`),
    takeoff: (plot) => log.push(`takeoff ${plot}`),
    drop: (at) => {
      log.push('drop')
      drops.push({ ...at })
    },
    startle: (variant) => log.push(`startle ${variant}`),
  }
  return { bee: new Bee(events), log, drops }
}

function fly(bee: Bee, world: BeeWorld, seconds: number, until?: (bee: Bee) => boolean): Set<BeeMode> {
  const modes = new Set<BeeMode>()
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    bee.step(FRAME, world)
    modes.add(bee.mode)
    expect(Number.isFinite(bee.x + bee.y + bee.z)).toBe(true)
    if (until?.(bee)) break
  }
  return modes
}

describe('Bee', () => {
  it('visits a flower on its own: notices, sizes it up, lands, sips once, and takes off', () => {
    const { bee, log } = makeBee()
    const world = makeWorld([1])
    const modes = fly(bee, world, 20, () => log.includes('takeoff 1'))
    expect(modes).toEqual(new Set(['wander', 'approach', 'hover', 'land', 'sip', 'takeoff']))
    expect(log).toEqual(['land 1', 'sip 1', 'takeoff 1'])
  })

  it('comes when a flower is tapped, before its own visit is due', () => {
    const { bee, log } = makeBee()
    const world = makeWorld([2], { visitEvery: 1000 })
    fly(bee, world, 0.5)
    bee.call(2, world)
    expect(bee.mode).toBe('notice')
    fly(bee, world, 10, () => log.includes('sip 2'))
    expect(log).toContain('sip 2')
  })

  it('prefers a flower that would mix over the one it just left', () => {
    const { bee, log } = makeBee()
    const world = makeWorld([0, 2], { wouldMix: (plot) => plot === 2 })
    fly(bee, world, 30, () => log.filter((entry) => entry.startsWith('sip')).length >= 1)
    expect(log.find((entry) => entry.startsWith('sip'))).toBe('sip 2')
  })

  it('rolls, carries the mixed seed to the drop spot, and lets it go there once', () => {
    const { bee, log, drops } = makeBee()
    let ready = true
    const world = makeWorld([], { readyToMix: () => ready })
    const modes = fly(bee, world, 15, () => {
      if (log.includes('drop')) ready = false
      return log.includes('drop')
    })
    expect(modes).toContain('loop')
    expect(modes).toContain('carry')
    expect(drops).toHaveLength(1)
    expect(Math.hypot(drops[0].x - 30, drops[0].z - 12)).toBeLessThan(3)
    fly(bee, world, 5)
    expect(log.filter((entry) => entry === 'drop')).toHaveLength(1)
  })

  it('startles when poked, even mid-sip, and releases the flower', () => {
    const { bee, log } = makeBee()
    const world = makeWorld([0], { visitEvery: 0 })
    fly(bee, world, 20, () => bee.mode === 'sip')
    expect(bee.mode).toBe('sip')
    bee.poke()
    expect(log.slice(-2)).toEqual(['takeoff 0', `startle ${bee.motion.poke}`])
    fly(bee, world, 0.5)
    expect(bee.mode).toBe('startle')
  })

  it('never startles the same way twice running, and each startle moves its own way', () => {
    const { bee, log } = makeBee()
    const world = makeWorld([], { visitEvery: 1000 })
    const seen = { spin: false, tumble: false, cover: false }
    for (let poke = 0; poke < 12; poke++) {
      fly(bee, world, 1)
      bee.poke()
      const variant = bee.motion.poke
      let turned = 0
      let lastYaw = bee.yaw
      let upsideDown = false
      let covered = false
      fly(bee, world, 2, () => {
        turned += Math.abs(Math.atan2(Math.sin(bee.yaw - lastYaw), Math.cos(bee.yaw - lastYaw)))
        lastYaw = bee.yaw
        upsideDown ||= Math.cos(bee.pitch) < -0.5
        covered ||= bee.wingCover > 0.8
        return bee.mode !== 'startle'
      })
      if (variant === 'spin-hop') seen.spin ||= turned > Math.PI && !upsideDown && !covered
      if (variant === 'tumble') seen.tumble ||= upsideDown && !covered
      if (variant === 'giggle') seen.cover ||= covered && !upsideDown
    }
    const startles = log.filter((entry) => entry.startsWith('startle'))
    for (let i = 1; i < startles.length; i++) expect(startles[i]).not.toBe(startles[i - 1])
    expect(seen).toEqual({ spin: true, tumble: true, cover: true })
  })

  it('now and then does something of its own while it wanders, and only then', () => {
    const { bee } = makeBee()
    const delights = new Set<string>()
    const world = makeWorld([], { visitEvery: 1000 })
    for (let i = 0; i < 60 * 120; i++) {
      bee.step(FRAME, world)
      const delight = bee.motion.delight
      if (delight !== null) {
        delights.add(delight)
        expect(bee.mode).toBe('wander')
      }
    }
    expect(delights).toEqual(new Set(['glance', 'waggle-dance', 'loop-de-loop']))
    const busy = makeWorld([], { pointAt: 1 })
    for (let i = 0; i < 60 * 30; i++) {
      bee.step(FRAME, busy)
      expect(bee.motion.delight).toBeNull()
    }
  })

  it('beside an empty molehill the meadow points at, looks at the child, then turns to the molehill', () => {
    const { bee } = makeBee()
    const world = makeWorld([], { pointAt: 1 })
    fly(bee, world, 6)
    expect(bee.mode).toBe('point')
    expect(Math.hypot(bee.x - PLOTS[1].x, bee.z - PLOTS[1].z)).toBeLessThan(14)
    const facing = (x: number, z: number) => Math.abs(Math.atan2(Math.sin(Math.atan2(x - bee.x, z - bee.z) - bee.yaw), Math.cos(Math.atan2(x - bee.x, z - bee.z) - bee.yaw)))
    let atChild = 0
    let atPlot = 0
    for (let i = 0; i < 60 * 6; i++) {
      bee.step(FRAME, world)
      // Behind the molehill from the child's side, so it never hides the hole or the hand.
      expect(bee.z).toBeLessThan(PLOTS[1].z - 3)
      if (facing(CHILD.x, CHILD.z) < 0.3 && bee.pitch < 0) atChild++
      if (facing(PLOTS[1].x, PLOTS[1].z) < 0.3 && bee.pitch > 0.3) atPlot++
    }
    expect(atChild).toBeGreaterThan(60)
    expect(atPlot).toBeGreaterThan(40)
  })

  it('keeps its face off the molehill hole while it dips toward it', () => {
    // Measured in the camera's screen plane (the view looks down about 37°), with
    // the head ball and its fuzz as a disc and the hole as the dimple in the top.
    const tilt = 0.64
    const headRadius = 2.6 * BEE_SCALE + 0.4
    const hole = PLOT_RADIUS * 0.3
    const screenY = (y: number, z: number) => y * Math.cos(tilt) - z * Math.sin(tilt)
    for (let plot = 0; plot < PLOTS.length; plot++) {
      const { bee } = makeBee()
      const world = makeWorld([], { pointAt: plot })
      fly(bee, world, 6)
      const p = PLOTS[plot]
      let clearance = Infinity
      for (let i = 0; i < 60 * 8; i++) {
        bee.step(FRAME, world)
        const hy = BEE_HEAD.y * BEE_SCALE
        const hz = BEE_HEAD.z * BEE_SCALE
        const y = hy * Math.cos(bee.pitch) - hz * Math.sin(bee.pitch)
        const z = hy * Math.sin(bee.pitch) + hz * Math.cos(bee.pitch)
        const headX = bee.x + z * Math.sin(bee.yaw)
        const headY = screenY(bee.y + y, bee.z + z * Math.cos(bee.yaw))
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2
          const d = Math.hypot(p.x + Math.cos(a) * hole - headX, screenY(plotTop(plot), p.z + Math.sin(a) * hole) - headY)
          clearance = Math.min(clearance, d - headRadius)
        }
      }
      expect(clearance).toBeGreaterThan(1.5)
    }
  })

  it('never sinks into the hill', () => {
    const { bee } = makeBee()
    const world = makeWorld([0, 1, 2])
    for (let i = 0; i < 60 * 90; i++) {
      bee.step(FRAME, world)
      if (!bee.sitting()) expect(bee.y).toBeGreaterThanOrEqual(groundY(bee.x, bee.z) + 2.99)
    }
  })
})
