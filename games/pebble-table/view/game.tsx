import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TableController } from '../controller'
import { QualityGovernor, startingTier, type QualitySettings } from '../quality'
import { inBowl } from '../feeding'
import { BAG, FEEDING, SCALE, shelfTile, type Point } from '../layout'
import { stoneHeight3, stoneRadius3, toWorld2 } from '../physics3d'
import { panOf } from '../scale'
import { BagModel, FeedingSetting, GhostHand, Guest, KnifeModel, Overlays, ScaleModel, ShelfModel, StonesModel, TableModel, type Blob, type GuestPose, type StoneState } from './models'
import { GrownUpOverlay } from './overlay'
import { ProjectorBridge, Stage, type ProjectorHandle } from './stage'

// Binds the game controller to the clay models: the controller steps inside
// the render loop, and every model reads its pose from the controller.

function stoneStates(table: TableController): StoneState[] {
  const states: StoneState[] = []
  for (const id of table.visibleStoneIds()) {
    const body = table.physics.body(id)
    if (!body) continue
    states.push({
      id,
      q: table.quartersOf(id),
      position: { x: body.position.x, y: body.position.y, z: body.position.z },
      quaternion: [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w],
      velocityY: body.velocity.y,
      held: table.isHeld(id),
      pulse: table.pulse(id),
      glow: table.guidance.glowStones.has(id) ? table.guidance.glow : 0,
    })
  }
  for (const flight of table.flightViews()) {
    states.push({
      id: -flight.id,
      q: flight.q,
      position: flight.position,
      quaternion: [Math.sin(flight.spin / 2), 0, 0, Math.cos(flight.spin / 2)],
      velocityY: 0,
      held: false,
      pulse: 0,
      glow: 0,
    })
  }
  return states
}

function groundUnder(table: TableController, at: Point): number {
  if (table.state.liveMat === 'scale') {
    const side = panOf(at)
    if (side !== null) return table.physics.panTop(side) + 0.2
  }
  return table.state.liveMat === 'feeding' && inBowl(at) ? 0.75 : 0
}

function shadows(table: TableController): Blob[] {
  const blobs: Blob[] = []
  for (const stone of stoneStates(table)) {
    const at = toWorld2(stone.position)
    const ground = stone.id > 0 ? groundUnder(table, at) : 0
    const height = Math.max(0, stone.position.y - ground - stoneHeight3(stone.q) / 2)
    const r = stoneRadius3(stone.q)
    blobs.push({ at, ground, radius: r * (1.12 + height * 0.07), strength: 0.95 / (1 + height * 0.2), stretch: 0.5 + height })
  }
  blobs.push({ at: { x: BAG.x + 25, y: BAG.y - 20 }, ground: 0, radius: 12, strength: 0.5, stretch: 3 })
  if (table.state.liveMat === 'scale') {
    blobs.push({ at: SCALE.post, ground: 0, radius: 8.5, strength: 0.55, stretch: 2 })
    SCALE.pans.forEach((pan, side) => blobs.push({ at: pan, ground: 0, radius: 15, strength: 0.32, stretch: table.physics.panTop(side as 0 | 1) }))
  } else {
    blobs.push({ at: FEEDING.bowl, ground: 0, radius: 12.5, strength: 0.4, stretch: 1 })
    FEEDING.seats.forEach((seat, index) => {
      if (table.state.seats[index]) {
        blobs.push({ at: seat.plate, ground: 0, radius: 8.8, strength: 0.22, stretch: 0.3 })
        blobs.push({ at: table.guestDrag?.seat === index ? table.guestDrag.at : seat.guest, ground: 0, radius: 9, strength: 0.75, stretch: 2.5 })
      } else blobs.push({ at: seat.guest, ground: 0, radius: 5.2, strength: 0.4, stretch: 1.5 })
    })
    if (table.feeding.leftover || table.knife.pointerId !== null) blobs.push({ at: table.knife.at, ground: 0, radius: 5.5, strength: 0.4, stretch: table.knife.pointerId !== null ? 5 : 0.5 })
  }
  const hand = table.guidance.hand
  if (hand) blobs.push({ at: hand.at, ground: 0, radius: 2.4 + (1 - hand.press) * 1.6, strength: 0.28 * hand.opacity, stretch: (1 - hand.press) * 5 })
  return blobs
}

function glows(table: TableController): Blob[] {
  const g = table.guidance
  const blobs: Blob[] = []
  for (const piece of table.state.pieces) {
    const strength = Math.max(table.pulse(piece.id) * 0.7, g.glowStones.has(piece.id) ? g.glow : 0)
    if (strength > 0.01) blobs.push({ at: piece, ground: groundUnder(table, piece), radius: stoneRadius3(4) * (1.75 + 0.15 * Math.sin(table.t * 3)), strength: Math.min(1, strength * 1.1) })
  }
  if (g.glowBag && g.glow > 0) blobs.push({ at: { x: BAG.x + 20, y: BAG.y - 15 }, ground: 0, radius: 14, strength: g.glow * 0.8 })
  if (g.glowKnife && g.glow > 0) blobs.push({ at: table.knife.at, ground: 0, radius: 7 + 0.5 * Math.sin(table.t * 3), strength: g.glow })
  if (g.glowShelf && g.glow > 0) blobs.push({ at: shelfTile(0), ground: 3.5, radius: 9, strength: g.glow })
  if (g.hand && g.hand.press > 0.3) blobs.push({ at: g.hand.at, ground: 0, radius: 4.5, strength: g.hand.press * g.hand.opacity * 0.7 })
  return blobs
}

function World({ table }: { table: TableController }) {
  const [, setVersion] = useState(table.version)
  const lastPlates = useRef<number[]>([...table.feeding.plates])
  const hops = useRef(new Map<number, number>())
  useFrame((_, dt) => {
    table.step(Math.min(dt, 1 / 20))
    table.feeding.plates.forEach((total, seat) => {
      if (total > (lastPlates.current[seat] ?? 0)) hops.current.set(seat, table.t)
    })
    lastPlates.current = [...table.feeding.plates]
    setVersion((current) => (current === table.version ? current : table.version))
  }, -1)

  const guestPose = (seat: number): GuestPose => {
    return {
      look: table.gaze(seat),
      reach: table.guidance.guestsReach ? table.guidance.glow : 0,
      munchAt: table.munchStart,
      hopAt: hops.current.get(seat) ?? null,
      pokeAt: table.nudges.get(seat) ?? null,
      arriveAt: table.arrivals.get(seat) ?? null,
      now: table.t,
    }
  }

  const live = table.state.liveMat
  return (
    <>
      <TableModel />
      <Overlays kind="shadow" capacity={96} read={() => shadows(table)} />
      <BagModel
        read={() => ({
          fullness: table.state.bag / table.state.total,
          tipAge: table.bagTipStart === null ? null : table.t - table.bagTipStart,
          peek: table.guidance.peek,
          now: table.t,
        })}
      />
      {live === 'scale' ? (
        <ScaleModel read={() => ({ angle: table.beam.angle, panY: [table.physics.panTop(0), table.physics.panTop(1)], now: table.t })} />
      ) : (
        <>
          <FeedingSetting seats={table.state.seats} />
          {FEEDING.seats.map((seat, index) =>
            table.state.seats[index] ? (
              <Guest key={index} seat={index} at={table.guestDrag?.seat === index ? table.guestDrag.at : seat.guest} read={() => guestPose(index)} />
            ) : null,
          )}
          <KnifeModel read={() => ({ at: table.knife.at, visible: table.feeding.leftover || table.knife.pointerId !== null, held: table.knife.pointerId !== null, now: table.t })} />
        </>
      )}
      <StonesModel read={() => stoneStates(table)} />
      <ShelfModel read={() => ({ mats: table.shelfMats(), drag: table.shelfDrag, glow: table.guidance.glowShelf ? table.guidance.glow : 0, now: table.t })} />
      <Overlays kind="glow" capacity={32} read={() => glows(table)} />
      <GhostHand read={() => table.guidance.hand} carry={() => table.guidance.hint?.kind === 'toPan' || table.guidance.hint?.kind === 'toGuest'} />
    </>
  )
}

function Input({ table }: { table: TableController }) {
  const cleanup = useRef<(() => void) | null>(null)
  const onReady = useCallback(
    (projector: ProjectorHandle, element: HTMLCanvasElement) => {
      table.setProjector(projector)
      cleanup.current?.()
      const local = (event: PointerEvent): Point => {
        const rect = element.getBoundingClientRect()
        return { x: event.clientX - rect.left, y: event.clientY - rect.top }
      }
      const down = (event: PointerEvent) => {
        event.preventDefault()
        element.setPointerCapture?.(event.pointerId)
        table.pointerDown(event.pointerId, local(event), event.timeStamp)
      }
      const move = (event: PointerEvent) => table.pointerMove(event.pointerId, local(event), event.timeStamp)
      const up = (event: PointerEvent) => table.pointerUp(event.pointerId, local(event), event.timeStamp)
      const cancel = (event: PointerEvent) => table.pointerCancel(event.pointerId)
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
    [table],
  )
  useEffect(() => () => cleanup.current?.(), [])
  return <ProjectorBridge onReady={onReady} />
}

export function GameView({ table, running }: { table: TableController; running: boolean }) {
  const governor = useMemo(() => new QualityGovernor(startingTier(window.matchMedia?.('(pointer: coarse)').matches ?? false)), [])
  const restingFor = useCallback(() => table.restingFor(), [table])
  const onSettings = useCallback(
    (settings: QualitySettings) => {
      table.physics.maxSubsteps = settings.physicsSubsteps
    },
    [table],
  )
  return (
    <>
      <Stage running={running} governor={governor} restingFor={restingFor} onSettings={onSettings}>
        <Input table={table} />
        <World table={table} />
      </Stage>
      <GrownUpOverlay governor={governor} />
    </>
  )
}
