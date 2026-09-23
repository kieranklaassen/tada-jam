import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { KiteController, Projector } from '../controller'
import { TRAY, TRAY_SLOTS, trayToWorld, WATCHERS, type Vec3 } from '../layout'
import { PIECES, SHAPES } from '../pieces'
import { PerfRing, TierGovernor, tierOverride, type Tier } from '../quality'
import { Dolls } from './dolls'
import { Kite } from './kite'
import { PerfOverlay } from './perf'
import { Blobs, GhostHand, pieceGeometries, Pieces, type BlobAdd } from './pieces'
import { Room } from './room'
import { ProjectorBridge, Stage, type PerfHandle } from './stage'

// Binds the controller to the playroom: the controller steps inside the
// render loop (before any model reads it), every model reads its pose from
// the controller each frame, and pointer events go straight to it.

type JamPerf = { readonly cpuMs: number[]; readonly tier: number; readonly drawCalls: number; readonly triangles: number; reset(): void }

declare global {
  interface Window {
    __jamPerf?: JamPerf
  }
}

const TRAY_GLOW: readonly Vec3[] = PIECES.map((p) => trayToWorld(TRAY_SLOTS[p.id].x, TRAY_SLOTS[p.id].z, 0.03))

/** Where a piece's outline reaches at a pose: left, right and lowest point, into a reused tuple. */
const extent = new Float64Array(3)
function outlineExtent(id: number, x: number, y: number, angle: number): Float64Array {
  const outline = SHAPES[PIECES[id].kind].outline
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  let lo = Infinity
  let hi = -Infinity
  let bottom = Infinity
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]
    const wx = x + p.x * c - p.y * s
    const wy = y + p.x * s + p.y * c
    if (wx < lo) lo = wx
    if (wx > hi) hi = wx
    if (wy < bottom) bottom = wy
  }
  extent[0] = lo
  extent[1] = hi
  extent[2] = bottom
  return extent
}

function World({ controller }: { controller: KiteController }) {
  const geometries = useMemo(pieceGeometries, [])
  useEffect(
    () => () => {
      for (const g of Object.values(geometries)) g.dispose()
    },
    [geometries],
  )
  useFrame((_, dt) => {
    controller.step(Math.min(dt, 1 / 20))
  }, -1)

  const pose = useMemo(() => ({ x: 0, y: 0, angle: 0 }), [])
  const shadows = useCallback(
    (add: BlobAdd) => {
      const c = controller
      for (const piece of PIECES) {
        const id = piece.id
        if (c.trayed[id] || !c.physics.has(id)) continue
        if (c.isHeld(id)) continue
        c.physics.pose(id, pose)
        const e = outlineExtent(id, pose.x, pose.y, pose.angle)
        const h = Math.max(0, e[2])
        add((e[0] + e[1]) / 2, 0.008, 0, e[1] - e[0] + 0.35 + h * 0.25, SHAPES[piece.kind].depth + 0.4 + h * 0.2, 0.55 / (1 + h * 0.6))
      }
      for (let i = 0; i < c.held.length; i++) {
        const held = c.held[i]
        const e = outlineExtent(held.id, held.x, held.landY, held.angle)
        const gap = Math.max(0, held.y - held.landY)
        add((e[0] + e[1]) / 2, e[2] + 0.012, 0, e[1] - e[0] + 0.2 + gap * 0.2, SHAPES[PIECES[held.id].kind].depth + 0.3, 0.5 / (1 + gap * 0.8))
      }
      const hero = c.hero
      if (hero.mode === 'fly') add(hero.x, 0.008, hero.z, 1.1 + hero.y * 0.1, 0.9, 0.3 / (1 + hero.y * 0.15))
      else if (hero.mode === 'tumble') add(hero.x, 0.008, 0, 1, 0.85, 0.4)
      else add(hero.x, hero.y + 0.012, 0, 0.95, 0.85, 0.6)
      for (let i = 0; i < c.watchers.length; i++) add(c.watchers[i].x, 0.008, WATCHERS[i].z, i === 0 ? 1.05 : 0.8, i === 0 ? 0.95 : 0.72, 0.55)
      if (c.kite.mode !== 'perched') add(c.kite.position.x, 0.008, c.kite.position.z, 1.8, 1.2, 0.16)
    },
    [controller, pose],
  )

  const glows = useCallback(
    (add: BlobAdd) => {
      const g = controller.guidance
      const hint = g.hint
      if (!hint || g.glow <= 0) return
      if (hint.kind === 'fromTray') {
        const slot = TRAY_SLOTS[hint.id]
        const at = TRAY_GLOW[hint.id]
        add(at.x, at.y, at.z, slot.halfX * 2 + 1.1, slot.halfZ * 2 + 1.0, g.glow * 0.85, TRAY.tilt)
      } else add(hint.from.x, 0.014, 0, 2.2, 1.4, g.glow * 0.8)
      add(g.buildAt.x, g.buildAt.y + 0.014, 0, 1.5, 1.3, g.glow * 0.6)
    },
    [controller],
  )

  return (
    <>
      <Room />
      <Blobs kind="shadow" capacity={24} write={shadows} />
      <Pieces controller={controller} geometries={geometries} />
      <Dolls controller={controller} />
      <Kite controller={controller} />
      <Blobs kind="glow" capacity={4} write={glows} />
      <GhostHand controller={controller} geometries={geometries} />
    </>
  )
}

function Input({ controller }: { controller: KiteController }) {
  const cleanup = useRef<(() => void) | null>(null)
  const onReady = useCallback(
    (projector: Projector, element: HTMLCanvasElement) => {
      controller.setProjector(projector)
      cleanup.current?.()
      const local = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect()
        return { x: event.clientX - rect.left, y: event.clientY - rect.top }
      }
      const down = (event: PointerEvent) => {
        event.preventDefault()
        element.setPointerCapture?.(event.pointerId)
        controller.pointerDown(event.pointerId, local(event), event.timeStamp)
      }
      const move = (event: PointerEvent) => controller.pointerMove(event.pointerId, local(event))
      const up = (event: PointerEvent) => controller.pointerUp(event.pointerId, local(event), event.timeStamp)
      const cancel = (event: PointerEvent) => controller.pointerCancel(event.pointerId)
      const menu = (event: Event) => event.preventDefault()
      element.addEventListener('pointerdown', down)
      element.addEventListener('pointermove', move)
      element.addEventListener('pointerup', up)
      element.addEventListener('pointercancel', cancel)
      element.addEventListener('contextmenu', menu)
      cleanup.current = () => {
        element.removeEventListener('pointerdown', down)
        element.removeEventListener('pointermove', move)
        element.removeEventListener('pointerup', up)
        element.removeEventListener('pointercancel', cancel)
        element.removeEventListener('contextmenu', menu)
      }
    },
    [controller],
  )
  useEffect(() => () => cleanup.current?.(), [])
  return <ProjectorBridge onReady={onReady} />
}

export function GameView({ controller, running }: { controller: KiteController; running: boolean }) {
  const { perf, showPerf } = useMemo(() => {
    const search = window.location.search
    const forced = tierOverride(search)
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
    const governor = new TierGovernor(forced ?? (coarse ? 1 : 0), forced !== null)
    const perf: PerfHandle = { ring: new PerfRing(), governor, render: { calls: 0, triangles: 0 } }
    return { perf, showPerf: new URLSearchParams(search).get('fps') === '1' }
  }, [])

  useEffect(() => {
    const handle: JamPerf = {
      get cpuMs() {
        return perf.ring.ordered()
      },
      get tier() {
        return perf.governor.tier
      },
      get drawCalls() {
        return perf.render.calls
      },
      get triangles() {
        return perf.render.triangles
      },
      reset() {
        perf.ring.reset()
      },
    }
    window.__jamPerf = handle
    return () => {
      if (window.__jamPerf === handle) delete window.__jamPerf
    }
  }, [perf])

  const restingFor = useCallback(() => controller.restingFor(), [controller])
  const onTier = useCallback(
    (tier: Tier) => {
      controller.physics.maxSubsteps = tier.substeps
    },
    [controller],
  )
  return (
    <>
      <Stage running={running} perf={perf} restingFor={restingFor} onTier={onTier}>
        <Input controller={controller} />
        <World controller={controller} />
      </Stage>
      {showPerf && <PerfOverlay perf={perf} governor={perf.governor} />}
    </>
  )
}
