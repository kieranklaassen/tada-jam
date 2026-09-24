import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { zenith } from './geo'
import { TAU } from './phase'
import { CRADLE, EARTH_R, MOON_R, OrreryScene, PLANE_Y, RISER, type OrreryAssets } from './scene'

// The orrery's parts never pass through each other, checked on the real scene
// headless. The intersection audit (scripts/intersections/games/moon-phases.ts)
// covers the rendered scene; these pin the worst cases at the logic level.

function blankAssets(): OrreryAssets {
  const texture = () => new THREE.Texture()
  return {
    envMap: null, wood: texture(), scale: texture(), medallions: texture(),
    earthColor: texture(), earthRough: texture(), earthLights: texture(), clouds: texture(), moonColor: texture(),
    moonBump: texture(), ring: texture(), sun: texture(), glow: texture(), shadow: texture(),
  }
}

const deg = Math.PI / 180

/** Every vertex of a mesh, in world space. */
function worldVertices(mesh: THREE.Mesh): THREE.Vector3[] {
  mesh.updateWorldMatrix(true, false)
  const position = mesh.geometry.getAttribute('position')
  return Array.from({ length: position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld))
}

describe('a new orrery', () => {
  it('is already placed as its first update leaves it, so a frame drawn before the first tick shows nothing out of place', () => {
    const orrery = new OrreryScene(blankAssets())
    const shown = () => {
      orrery.scene.updateMatrixWorld(true)
      const out = new Map<string, { visible: boolean; matrix: number[] }>()
      orrery.scene.traverse(o => {
        let visible = true
        for (let p: THREE.Object3D | null = o; p; p = p.parent) visible &&= p.visible
        out.set(o.uuid, { visible, matrix: [...o.matrixWorld.elements] })
      })
      return out
    }
    const before = shown()
    orrery.update(0)
    for (const [uuid, now] of shown()) {
      const name = orrery.scene.getObjectByProperty('uuid', uuid)?.name || uuid
      const was = before.get(uuid)!
      expect(was.visible, `${name} shown`).toBe(now.visible)
      if (now.visible) was.matrix.forEach((v, i) => expect(v, `${name} placed`).toBeCloseTo(now.matrix[i], 9))
    }
    const child = orrery.scene.getObjectByName('child')!
    expect(child.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(0, PLANE_Y, 0)), 'the child stands on Earth').toBeCloseTo(EARTH_R * 1.005, 2)
    expect(orrery.scene.getObjectByName('halves')!.visible, 'the halves start hidden').toBe(false)
  })
})

describe('the halves round the moon', () => {
  it('ring the moon clear of its riser and cradle, and of each other, at every point of the orbit', () => {
    const orrery = new OrreryScene(blankAssets())
    orrery.showHalves = true
    const [lit, seen] = ['lit-ring', 'seen-ring'].map(name => orrery.scene.getObjectByName(name) as THREE.Mesh)
    const up = new THREE.Vector3(0, 1, 0)
    let riser = Infinity, cradle = Infinity, litOut = 0, litIn = Infinity, seenIn = Infinity
    for (let step = 0; step < 64; step++) {
      orrery.setMoon((step / 64) * TAU)
      for (let frame = 0; frame < 3; frame++) orrery.update(1 / 60)
      const centre = orrery.moonWorld()
      for (const [mesh, isLit] of [[lit, true], [seen, false]] as const) {
        for (const v of worldVertices(mesh)) {
          const rel = v.sub(centre), distance = rel.length()
          // Under the cradle's lowest point the riser rises straight up the moon's axis.
          if (rel.y <= -CRADLE.radius) riser = Math.min(riser, Math.hypot(rel.x, rel.z) - RISER.bottom)
          // Below its rim the cradle is a shell just outside the moon: a ring must pass wholly outside it.
          if (rel.angleTo(up) >= CRADLE.rim) cradle = Math.min(cradle, distance - CRADLE.radius)
          if (isLit) { litOut = Math.max(litOut, distance); litIn = Math.min(litIn, distance) } else seenIn = Math.min(seenIn, distance)
        }
      }
    }
    expect(riser, 'clearance from the riser').toBeGreaterThan(0)
    expect(cradle, 'clearance from the cradle').toBeGreaterThan(0)
    expect(litIn, 'the gold ring clears the moon').toBeGreaterThan(MOON_R)
    expect(litOut, 'the gold ring passes inside the blue one').toBeLessThan(seenIn)
  })
})

describe('the child on Earth', () => {
  it('stands upright on the globe, outside it, and points at the moon while it is up, at every home, hour and phase', () => {
    const orrery = new OrreryScene(blankAssets())
    const child = orrery.scene.getObjectByName('child')!
    const parts = ['child-body', 'child-arm'].map(name => orrery.scene.getObjectByName(name) as THREE.Mesh)
    const arm = parts[1]
    const centre = new THREE.Vector3(0, PLANE_Y, 0), up = new THREE.Vector3()
    let worst = { depth: -Infinity, where: '' }, aim = { dot: Infinity, where: '' }, aimed = 0
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lon = -180; lon < 180; lon += 45) {
        for (const hours of [0, 6, 12, 18, 21]) {
          for (let phase = 0; phase < 8; phase++) {
            const where = `lat ${lat} lon ${lon} at ${hours} h, phase ${phase}`
            orrery.home = { lat: lat * deg, lon: lon * deg }
            orrery.hours = hours
            orrery.setMoon((phase / 8) * TAU)
            orrery.update(1 / 60)
            expect(child.quaternion.length(), where).toBeCloseTo(1, 6)
            const z = zenith(orrery.home, orrery.spin)
            expect(new THREE.Vector3(0, 1, 0).applyQuaternion(child.quaternion).dot(up.set(z.x, z.y, z.z)), where).toBeGreaterThan(0.999)
            const toMoon = orrery.moonWorld().sub(arm.getWorldPosition(new THREE.Vector3())).normalize()
            if (toMoon.dot(up) > 0.1) {
              // The arm is modelled along +y from the shoulder.
              const dot = new THREE.Vector3(0, 1, 0).transformDirection(arm.matrixWorld).dot(toMoon)
              aimed++
              if (dot < aim.dot) aim = { dot, where }
            }
            for (const part of parts) {
              for (const v of worldVertices(part)) {
                const depth = EARTH_R - v.distanceTo(centre)
                if (depth > worst.depth) worst = { depth, where }
              }
            }
          }
        }
      }
    }
    expect(worst.depth, worst.where).toBeLessThan(0)
    expect(aimed, 'configurations with the moon up').toBeGreaterThan(500)
    // Within 16°: the arm is splayed a little from the body and sways as it points.
    expect(aim.dot, `the arm points at the moon (${aim.where})`).toBeGreaterThan(0.96)
  })
})
