import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { KiteController } from '../controller'
import { slotCenter, TRAY, TRAY_SLOTS, trayToWorld } from '../layout'
import { PIECES, SHAPES, type PieceKind } from '../pieces'
import { swayAngle, type Rock } from '../sway'
import { woodSlab } from './shapes'
import { PALETTE } from './stage'
import { woodMaterial } from './wood'

// The wooden pieces: one instanced mesh per kind, so the whole set is six
// draws. A piece in the tray lies on its back in its slot; on the build
// plane it follows its physics body, rocks with its stack's sway, pops in
// when it leaves the tray, and leans a little into a drag. Soft blob
// shadows and the breathing guidance glows are two more instanced layers.

const KINDS: readonly PieceKind[] = ['archL', 'archM', 'cube', 'pillar', 'half', 'plank']

/** Each kind's bevelled geometry, built once; the underside is a touch darker, like wood resting on wood. */
export function pieceGeometries(): Record<PieceKind, THREE.BufferGeometry> {
  const out = {} as Record<PieceKind, THREE.BufferGeometry>
  for (const kind of KINDS) {
    const shape = SHAPES[kind]
    let minY = Infinity
    for (const p of shape.outline) minY = Math.min(minY, p.y)
    out[kind] = woodSlab(shape.outline, shape.depth, shape.grain, {
      bevel: kind === 'plank' ? 0.04 : 0.055,
      shade: (_x, y) => 0.8 + 0.2 * THREE.MathUtils.smoothstep(y, minY, minY + 0.22),
      offset: { x: 0.15, y: 0.08 },
    })
  }
  return out
}

function easeOutBack(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  const c = 1.9
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2)
}

const POP_SECONDS = 0.38

export function Pieces({ controller, geometries }: { controller: KiteController; geometries: Record<PieceKind, THREE.BufferGeometry> }) {
  const { meshes, slot, trayMatrix } = useMemo(() => {
    const material = woodMaterial({ instanced: true })
    const slot: { kind: PieceKind; index: number }[] = []
    const counts = {} as Record<PieceKind, number>
    for (const kind of KINDS) counts[kind] = 0
    for (const piece of PIECES) slot.push({ kind: piece.kind, index: counts[piece.kind]++ })
    const meshes = {} as Record<PieceKind, THREE.InstancedMesh>
    const color = new THREE.Color()
    for (const kind of KINDS) {
      const geometry = geometries[kind]
      const shifts = new Float32Array(counts[kind])
      geometry.setAttribute('grainShift', new THREE.InstancedBufferAttribute(shifts, 1))
      const mesh = new THREE.InstancedMesh(geometry, material, counts[kind])
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      meshes[kind] = mesh
    }
    for (const piece of PIECES) {
      const { kind, index } = slot[piece.id]
      meshes[kind].setColorAt(index, color.set(piece.stain))
      ;(geometries[kind].getAttribute('grainShift') as THREE.InstancedBufferAttribute).setX(index, (piece.id * 0.618 + 0.21) % 1)
    }
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), TRAY.tilt)
    const onBack = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
    const turn = new THREE.Quaternion()
    const trayMatrix = PIECES.map((piece) => {
      const s = TRAY_SLOTS[piece.id]
      const center = slotCenter(s)
      const at = trayToWorld(center.x, center.y, SHAPES[piece.kind].depth / 2 + 0.005)
      turn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.angle)
      const q = tilt.clone().multiply(turn).multiply(onBack)
      return new THREE.Matrix4().compose(new THREE.Vector3(at.x, at.y, at.z), q, new THREE.Vector3(1, 1, 1))
    })
    return { meshes, slot, trayMatrix }
  }, [geometries])

  const scratch = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      s: new THREE.Vector3(1, 1, 1),
      z: new THREE.Vector3(0, 0, 1),
      up: new THREE.Vector3(0, Math.cos(TRAY.tilt), Math.sin(TRAY.tilt)),
      wiggle: new THREE.Quaternion(),
      pose: { x: 0, y: 0, angle: 0 },
      rock: { angle: 0, pivot: 0 } as Rock,
      prevX: new Float32Array(PIECES.length),
      lean: new Float32Array(PIECES.length),
    }),
    [],
  )

  useFrame((_, dt) => {
    const c = controller
    const { m, p, q, s, z, up, wiggle, pose, rock, prevX, lean } = scratch
    const peekId = c.guidance.peek !== null ? (c.guidance.hint?.kind === 'fromTray' ? c.guidance.hint.id : TRAY_SLOTS.find((t) => c.trayed[t.id])?.id ?? -1) : -1
    for (const piece of PIECES) {
      const id = piece.id
      const { kind, index } = slot[id]
      const mesh = meshes[kind]
      if (c.trayed[id] || !c.physics.has(id)) {
        if (id === peekId && c.guidance.peek !== null) {
          const k = c.guidance.peek
          const hop = Math.sin(k * Math.PI) * 0.28
          m.copy(trayMatrix[id])
          m.decompose(p, q, s)
          p.addScaledVector(up, hop)
          wiggle.setFromAxisAngle(up, Math.sin(k * Math.PI * 5) * 0.14 * Math.sin(k * Math.PI))
          q.premultiply(wiggle)
          s.set(1, 1, 1)
          mesh.setMatrixAt(index, m.compose(p, q, s))
        } else mesh.setMatrixAt(index, trayMatrix[id])
        prevX[id] = NaN
        continue
      }
      c.physics.pose(id, pose)
      let x = pose.x
      let y = pose.y
      let angle = pose.angle
      const stack = c.pieceStack[id]
      if (stack >= 0 && stack < c.stacks.length) {
        swayAngle(c.stacks[stack], c.t, c.stackKick[stack] ?? 0, rock)
        const cos = Math.cos(rock.angle)
        const sin = Math.sin(rock.angle)
        const dx = x - rock.pivot
        x = rock.pivot + dx * cos - y * sin
        y = dx * sin + y * cos
        angle += rock.angle
      }
      let scale = 1
      const popAge = c.t - c.popAt[id]
      if (popAge < POP_SECONDS) scale = 0.78 + 0.22 * easeOutBack(popAge / POP_SECONDS)
      if (c.isHeld(id)) {
        scale *= 1.035
        const vx = Number.isNaN(prevX[id]) || dt <= 0 ? 0 : (pose.x - prevX[id]) / dt
        lean[id] += (Math.max(-0.16, Math.min(0.16, -vx * 0.025)) - lean[id]) * Math.min(1, dt * 10)
      } else lean[id] += (0 - lean[id]) * Math.min(1, dt * 8)
      prevX[id] = pose.x
      p.set(x, y, 0)
      q.setFromAxisAngle(z, angle + lean[id])
      s.set(scale, scale, scale)
      mesh.setMatrixAt(index, m.compose(p, q, s))
    }
    for (const kind of KINDS) meshes[kind].instanceMatrix.needsUpdate = true
  })

  useEffect(
    () => () => {
      const material = meshes.cube.material as THREE.Material
      material.dispose()
      for (const kind of KINDS) meshes[kind].dispose()
    },
    [meshes],
  )

  return (
    <>
      {KINDS.map((kind) => (
        <primitive key={kind} object={meshes[kind]} />
      ))}
    </>
  )
}

// ---- blobs: soft shadows and glows ---------------------------------------------

export type BlobAdd = (x: number, y: number, z: number, width: number, depth: number, strength: number, tilt?: number) => void

function radialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!
  const g = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.62)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = g
  context.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/** A layer of flat soft quads whose per-instance strength rides in the instance colour's red channel. */
export function Blobs({ kind, capacity, write }: { kind: 'shadow' | 'glow'; capacity: number; write: (add: BlobAdd) => void }) {
  const mesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1)
    geometry.rotateX(-Math.PI / 2)
    const material = new THREE.MeshBasicMaterial({
      color: kind === 'shadow' ? PALETTE.shadow : '#ffd27a',
      map: radialTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: kind === 'shadow' ? THREE.NormalBlending : THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#if defined( USE_COLOR )\n  diffuseColor.a *= vColor.r;\n#endif')
    }
    material.customProgramCacheKey = () => 'kite-blob'
    const instanced = new THREE.InstancedMesh(geometry, material, capacity)
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    instanced.setColorAt(0, new THREE.Color(0, 0, 0))
    instanced.instanceColor!.setUsage(THREE.DynamicDrawUsage)
    instanced.frustumCulled = false
    instanced.renderOrder = kind === 'shadow' ? 2 : 6
    instanced.count = 0
    return instanced
  }, [kind, capacity])

  const scratch = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), x: new THREE.Vector3(1, 0, 0), color: new THREE.Color() }), [])
  const add = useMemo<BlobAdd>(() => {
    return (x, y, z, width, depth, strength, tilt = 0) => {
      const n = mesh.count
      if (n >= capacity || strength <= 0.003) return
      const { m, p, q, s, color } = scratch
      p.set(x, y, z)
      q.setFromAxisAngle(scratch.x, tilt)
      s.set(width, 1, depth)
      mesh.setMatrixAt(n, m.compose(p, q, s))
      mesh.setColorAt(n, color.setRGB(Math.min(1, strength), 0, 0))
      mesh.count = n + 1
    }
  }, [mesh, capacity, scratch])

  useFrame(() => {
    mesh.count = 0
    write(add)
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  useEffect(
    () => () => {
      const material = mesh.material as THREE.MeshBasicMaterial
      material.map?.dispose()
      material.dispose()
      mesh.geometry.dispose()
      mesh.dispose()
    },
    [mesh],
  )
  return <primitive object={mesh} />
}

// ---- the ghost hand and the ghost piece ----------------------------------------------

function handTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')!
  context.translate(128, 128)
  context.rotate(-0.35)
  context.translate(-128, -128)
  const path = new Path2D()
  path.moveTo(112, 28)
  path.bezierCurveTo(112, 14, 136, 14, 136, 28)
  path.lineTo(136, 112)
  path.bezierCurveTo(140, 100, 162, 100, 164, 116)
  path.bezierCurveTo(168, 106, 190, 108, 190, 124)
  path.bezierCurveTo(196, 116, 214, 120, 212, 136)
  path.lineTo(208, 176)
  path.bezierCurveTo(204, 214, 180, 234, 146, 234)
  path.lineTo(128, 234)
  path.bezierCurveTo(100, 234, 84, 218, 72, 196)
  path.lineTo(46, 150)
  path.bezierCurveTo(38, 136, 56, 124, 68, 134)
  path.lineTo(112, 170)
  path.closePath()
  context.shadowColor = 'rgba(60,40,20,0.35)'
  context.shadowBlur = 14
  context.shadowOffsetY = 6
  context.fillStyle = '#fffaf2'
  context.fill(path)
  context.shadowColor = 'transparent'
  context.lineWidth = 5
  context.strokeStyle = 'rgba(120,96,70,0.55)'
  context.stroke(path)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

const HAND_DEPTH = 1.6
const HAND_SIZE = 1.25

/** The wordless demonstration: a soft hand that presses on a piece and carries a see-through copy to where it would help. */
export function GhostHand({ controller, geometries }: { controller: KiteController; geometries: Record<PieceKind, THREE.BufferGeometry> }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const { hand, ghost } = useMemo(() => {
    const plane = new THREE.PlaneGeometry(HAND_SIZE, HAND_SIZE)
    // The fingertip sits near the top-left of the drawing; move the quad so the fingertip is the pivot.
    plane.translate(HAND_SIZE * 0.02, -HAND_SIZE * 0.36, 0)
    const hand = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: handTexture(), transparent: true, depthTest: false, depthWrite: false, toneMapped: false }))
    hand.renderOrder = 999
    hand.frustumCulled = false
    hand.visible = false
    const material = woodMaterial({ color: '#ffffff' })
    material.transparent = true
    material.opacity = 0.5
    material.depthWrite = false
    const ghost = new THREE.Mesh(geometries.cube, material)
    ghost.renderOrder = 998
    ghost.visible = false
    ghost.frustumCulled = false
    return { hand, ghost }
  }, [geometries])
  const scratch = useMemo(() => ({ ray: new THREE.Raycaster(), ndc: new THREE.Vector2(), plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit: new THREE.Vector3() }), [])

  useFrame(() => {
    const g = controller.guidance
    const pose = g.hand
    if (!pose || pose.opacity <= 0.01 || size.width === 0) {
      hand.visible = false
      ghost.visible = false
      return
    }
    const { ray, ndc, plane, hit } = scratch
    ndc.set((pose.at.x / size.width) * 2 - 1, -(pose.at.y / size.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    plane.constant = -HAND_DEPTH
    if (!ray.ray.intersectPlane(plane, hit)) return
    hand.visible = true
    hand.position.copy(hit)
    hand.position.y -= pose.press * 0.08
    hand.scale.setScalar(1 - pose.press * 0.1)
    hand.quaternion.copy(camera.quaternion)
    ;(hand.material as THREE.MeshBasicMaterial).opacity = pose.opacity * 0.9
    const hint = g.hint
    if (hint && pose.carry > 0) {
      plane.constant = 0
      if (ray.ray.intersectPlane(plane, hit)) {
        const kind = PIECES[hint.id].kind
        if (ghost.geometry !== geometries[kind]) ghost.geometry = geometries[kind]
        ghost.visible = true
        ghost.position.set(hit.x, hit.y - SHAPES[kind].half.y * 0.6, 0)
        ;(ghost.material as THREE.MeshStandardMaterial).color.set(PIECES[hint.id].stain)
        ;(ghost.material as THREE.MeshStandardMaterial).opacity = 0.55 * pose.opacity
      }
    } else ghost.visible = false
  })

  useEffect(
    () => () => {
      const material = hand.material as THREE.MeshBasicMaterial
      material.map?.dispose()
      material.dispose()
      hand.geometry.dispose()
      ;(ghost.material as THREE.Material).dispose()
    },
    [hand, ghost],
  )
  return (
    <>
      <primitive object={ghost} />
      <primitive object={hand} />
    </>
  )
}
