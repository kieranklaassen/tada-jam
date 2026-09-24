import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { TableController } from '../controller'
import { QualityGovernor, startingTier, type QualitySettings } from '../quality'
import { BAG, DOOR, FEEDING, SCALE, shelfTile, type Point } from '../layout'
import { stoneRadius3, toWorld2, UNIT } from '../physics3d'
import { stoneReachAlong, stoneReachDown, stoneReachOf, stoneRest } from '../stoneShape'
import { partCover, partReachDown, STOOL_REACH } from '../partShape'
import { feedingFloor, feedingRest, RUG, surfaceUnder } from '../surfaces'
import { inJar, JARS, PART_RADIUS, type PartKind } from '../parts'
import { visitorHome } from '../visitors'
import { AlbumModel, BagModel, CarrierMice, DoorModel, FeedingSetting, JarsModel, PartsModel, GHOST_REACH, GhostHand, Guest, KnifeModel, Overlays, ScaleModel, ShelfModel, STONE_COVER, stoneCover, StonesModel, TableModel, type Blob, type CarrierMouse, type GuestPose, type PartState, type RopeBall, type StoneState } from './models'
import { guestFloor } from './guest'
import { GrownUpOverlay } from './overlay'
import { ProjectorBridge, Stage, type ProjectorHandle } from './stage'

// Binds the game controller to the clay models: the controller steps inside
// the render loop, and every model reads its pose from the controller.

/** A stone lies on what is under it while its middle is less than this (cm) above its resting height. */
const STONE_LYING = 0.5

export function stoneStates(table: TableController): StoneState[] {
  const states: StoneState[] = []
  const surfaces = table.physics.surfaces(table.state.liveMat, table.state.seats)
  for (const id of table.visibleStoneIds()) {
    const body = table.physics.body(id)
    if (!body) continue
    const q = table.quartersOf(id)
    const { x, y, z, w } = body.quaternion
    // A stone landing fast dips into what it lands on for a step before the
    // physics lifts it back out; it is drawn on it. Under a hanging pan, it
    // lies on the table.
    const under = surfaceUnder(toWorld2(body.position), surfaces)
    const ground = body.position.y > under ? under : 0
    states.push({
      id,
      q,
      position: { x: body.position.x, y: Math.max(body.position.y, ground + stoneReachDown(q, x, y, z, w)), z: body.position.z },
      quaternion: [x, y, z, w],
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

function carrierMice(table: TableController): CarrierMouse[] {
  const carriers: CarrierMouse[] = []
  for (const flight of table.flightViews()) {
    if (!flight.mouse) continue
    const behind = stoneRadius3(flight.q) + 3.2
    const { heading, hop } = flight.mouse
    carriers.push({ x: flight.position.x - Math.sin(heading) * behind, z: flight.position.z - Math.cos(heading) * behind, heading, hop })
  }
  return carriers
}

/** Parts as physics has them, but never drawn dipping into the table, a pan's floor, a stone or another part for the frames physics takes to push a landing part back out. */
function partStates(table: TableController): PartState[] {
  const states: PartState[] = []
  const surfaces = table.physics.surfaces(table.state.liveMat, table.state.seats)
  const placed = table.state.parts.flatMap((part) => {
    const body = table.physics.body(part.id)
    return body ? [{ part, body }] : []
  })
  const sunk = table.physics.sunk(new Set(placed.map(({ body }) => body)))
  for (const { part, body } of placed) {
    const { x, y, z, w } = body.quaternion
    const under = surfaceUnder(toWorld2(body.position), surfaces)
    const ground = body.position.y > under ? under : 0
    const lift = sunk.get(body)
    const at = lift ? body.position.vadd(lift) : body.position
    states.push({
      id: part.id,
      kind: part.kind,
      position: { x: at.x, y: Math.max(at.y, ground + partReachDown(part.kind, x, y, z, w)), z: at.z },
      quaternion: [x, y, z, w],
      held: table.isHeld(part.id),
    })
  }
  return states
}

/** A held part is drawn this much bigger than it lies, about its body's origin. */
const HELD_GROWTH = 1.12
/**
 * A held stone is drawn stretched by at most this share of how far each point
 * lies from its body's origin (see `stoneMatrix`), and lifted by at most
 * HELD_LIFT (cm) as it stretches.
 */
const HELD_STRETCH = 0.1
const HELD_LIFT = 0.1

/**
 * The stones and parts held now, each as the balls of its cover turned as it
 * is (for the pan ropes to be laid over): a part's grown as it is drawn, a
 * stone's each grown enough to hold its patch however it stretches.
 */
export function heldBalls(table: TableController): RopeBall[][] {
  const turn = new THREE.Quaternion()
  const at = new THREE.Vector3()
  return table.heldIds().flatMap((id) => {
    const body = table.physics.body(id)
    if (!body) return []
    const { x, y, z } = body.position
    turn.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
    const part = table.state.parts.find((p) => p.id === id)
    const grown = part
      ? partCover(part.kind).map((ball) => ({ at: at.set(ball.x, ball.y, ball.z).applyQuaternion(turn).multiplyScalar(HELD_GROWTH).clone(), radius: ball.r * HELD_GROWTH }))
      : stoneCover(table.quartersOf(id)).map((ball) => {
          const reach = Math.hypot(ball.x, ball.y, ball.z)
          return { at: at.set(ball.x, ball.y, ball.z).applyQuaternion(turn).clone(), radius: ball.r + (reach + ball.r) * HELD_STRETCH + HELD_LIFT }
        })
    return [grown.map((ball) => ({ center: { x: x + ball.at.x, y: y + ball.at.y, z: z + ball.at.z }, radius: ball.radius }))]
  })
}

function jarCounts(table: TableController): Record<PartKind, number> {
  return { acorn: inJar(table.state.parts, 'acorn'), shell: inJar(table.state.parts, 'shell'), stick: inJar(table.state.parts, 'stick'), boulder: inJar(table.state.parts, 'boulder') }
}

function groundUnder(table: TableController, at: Point): number {
  return surfaceUnder(at, table.physics.surfaces(table.state.liveMat, table.state.seats))
}

/** What the guidance's ghost stone lies on at `at`: the top of any stone or loose part it would reach into, or of the feeding mat's plates, bowl and rug. */
export function ghostFloor(table: TableController, at: Point): number {
  let floor = table.state.liveMat === 'feeding' ? feedingRest(at, GHOST_REACH, table.state.seats) : 0
  for (const stone of stoneStates(table)) {
    const p = toWorld2(stone.position)
    if (Math.hypot(p.x - at.x, p.y - at.y) * UNIT >= GHOST_REACH + stoneReachOf(stone.q)) continue
    const [x, y, z, w] = stone.quaternion
    floor = Math.max(floor, stone.position.y + stoneReachAlong(stone.q, 2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)))
  }
  const turn = new THREE.Quaternion()
  const ball = new THREE.Vector3()
  for (const part of partStates(table)) {
    if (part.held) continue
    turn.set(...part.quaternion)
    for (const { x, y, z, r } of partCover(part.kind)) {
      ball.set(x, y, z).applyQuaternion(turn).add(part.position)
      const p = toWorld2(ball)
      if (Math.hypot(p.x - at.x, p.y - at.y) * UNIT < GHOST_REACH + r) floor = Math.max(floor, ball.y + r)
    }
  }
  return floor
}

function shadows(table: TableController): Blob[] {
  const blobs: Blob[] = []
  for (const stone of stoneStates(table)) {
    const at = toWorld2(stone.position)
    const ground = stone.id > 0 ? groundUnder(table, at) : 0
    const height = Math.max(0, stone.position.y - ground - stoneRest(stone.q))
    const r = stoneRadius3(stone.q)
    blobs.push({ at, ground, radius: r * (1.12 + height * 0.07), strength: 0.95 / (1 + height * 0.2), stretch: 0.5 + height, cover: height < STONE_LYING ? r * STONE_COVER : 0 })
  }
  blobs.push({ at: { x: BAG.x + 25, y: BAG.y - 20 }, ground: 0, radius: 12, strength: 0.5, stretch: 3 })
  if (table.state.liveMat === 'door') {
    blobs.push({ at: DOOR.house, ground: 0, radius: 17 * DOOR.houseScale, strength: 0.45, stretch: 1.5 })
    for (const visitor of table.door.visitors) if (visitorHome(visitor, table.t)) blobs.push({ at: visitor.home, ground: 0, radius: 5.5, strength: 0.45, stretch: 1 })
  } else if (table.state.liveMat === 'scale') {
    blobs.push({ at: SCALE.post, ground: 0, radius: 8.5, strength: 0.55, stretch: 2 })
    for (const kind of Object.keys(JARS) as PartKind[]) blobs.push({ at: JARS[kind], ground: 0, radius: 8, strength: 0.45, stretch: 2 })
    for (const part of partStates(table)) {
      const at = toWorld2(part.position)
      const ground = groundUnder(table, at)
      blobs.push({ at, ground, radius: (PART_RADIUS[part.kind] / 10) * 1.1, strength: 0.7, stretch: 0.5 + Math.max(0, part.position.y - ground - 1) })
    }
    SCALE.pans.forEach((pan, side) => blobs.push({ at: pan, ground: 0, radius: 15, strength: 0.32, stretch: table.physics.panY(side as 0 | 1) }))
  } else {
    blobs.push({ at: FEEDING.bowl, ground: RUG.top, radius: 12.5, strength: 0.4, stretch: 1 })
    FEEDING.seats.forEach((seat, index) => {
      if (table.state.seats[index]) {
        blobs.push({ at: seat.plate, ground: RUG.top, radius: 8.8, strength: 0.22, stretch: 0.3 })
        const guest = table.guestDrag?.seat === index ? table.guestDrag.at : seat.guest
        blobs.push({ at: guest, ground: guestFloor(index, guest), radius: 9, strength: 0.75, stretch: 2.5 })
      } else if (table.stoolsShown) blobs.push({ at: seat.guest, ground: feedingFloor(seat.guest, STOOL_REACH), radius: 5.2, strength: 0.4, stretch: 1.5 })
    })
    if (table.feeding.leftover || table.knife.pointerId !== null) blobs.push({ at: table.knife.at, ground: groundUnder(table, table.knife.at), radius: 5.5, strength: 0.4, stretch: table.knife.pointerId !== null ? 5 : 0.5 })
  }
  for (const carrier of carrierMice(table)) {
    const at = toWorld2(carrier)
    blobs.push({ at, ground: groundUnder(table, at), radius: 5, strength: 0.45, stretch: 1 + carrier.hop * 1.6 })
  }
  const hand = table.guidance.hand
  if (hand) blobs.push({ at: hand.at, ground: groundUnder(table, hand.at), radius: 2.4 + (1 - hand.press) * 1.6, strength: 0.28 * hand.opacity, stretch: (1 - hand.press) * 5 })
  return blobs
}

function glows(table: TableController): Blob[] {
  const g = table.guidance
  const blobs: Blob[] = []
  for (const piece of table.state.pieces) {
    const strength = Math.max(table.pulse(piece.id) * 0.7, g.glowStones.has(piece.id) ? g.glow : 0)
    if (strength > 0.01) blobs.push({ at: piece, ground: groundUnder(table, piece), radius: stoneRadius3(4) * (1.75 + 0.15 * Math.sin(table.t * 3)), strength: Math.min(1, strength * 1.1), cover: table.isHeld(piece.id) ? 0 : stoneRadius3(piece.q) * STONE_COVER })
  }
  if (g.glowBag && g.glow > 0) blobs.push({ at: { x: BAG.x + 20, y: BAG.y - 15 }, ground: 0, radius: 14, strength: g.glow * 0.8 })
  if (g.glowKnife && g.glow > 0) blobs.push({ at: table.knife.at, ground: groundUnder(table, table.knife.at), radius: 7 + 0.5 * Math.sin(table.t * 3), strength: g.glow })
  if (table.state.liveMat === 'door' && g.glow > 0 && table.door.visitors.length === 0) blobs.push({ at: DOOR.door, ground: 0.3, radius: 10, strength: g.glow })
  if (g.glowShelf && g.glow > 0) blobs.push({ at: shelfTile(0), ground: 0.3, radius: 10, strength: g.glow })
  if (g.hand && g.hand.press > 0.3) blobs.push({ at: g.hand.at, ground: groundUnder(table, g.hand.at), radius: 4.5, strength: g.hand.press * g.hand.opacity * 0.7 })
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
      reach: table.asking(seat),
      rumbleAt: table.rumbles.get(seat) ?? null,
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
      <Overlays kind="shadow" capacity={96} read={() => shadows(table)} surfaces={() => table.physics.surfaces(table.state.liveMat, table.state.seats)} />
      <BagModel
        read={() => ({
          fullness: table.state.bag / table.state.total,
          tipAge: table.bagTipStart === null ? null : table.t - table.bagTipStart,
          shakeOut: table.bagShakesOut(),
          peek: table.guidance.peek,
          now: table.t,
        })}
      />
      {live === 'door' ? (
        <DoorModel
          read={() => ({
            visitors: table.door.visitors,
            openAt: table.door.openAt,
            closeAt: table.door.closeAt,
            knockAt: table.door.knockAt,
            answerTimes: table.door.answer?.times ?? [],
            peek: table.doorPeek(),
            now: table.t,
          })}
        />
      ) : live === 'scale' ? (
        <>
          <ScaleModel read={() => ({ angle: table.beam.angle, panY: [table.physics.panY(0), table.physics.panY(1)], panSway: [table.physics.panSwung(0), table.physics.panSwung(1)], held: heldBalls(table), now: table.t })} />
          <JarsModel read={() => ({ tips: table.jarTips, full: jarCounts(table), glow: table.state.parts.length === 0 ? table.guidance.glow : 0, now: table.t })} />
          <PartsModel read={() => partStates(table)} />
        </>
      ) : (
        <>
          <FeedingSetting seats={table.state.seats} showStools={table.stoolsShown} readBowl={() => ({ dingAt: table.bowlDingAt, now: table.t })} />
          {FEEDING.seats.map((seat, index) =>
            table.state.seats[index] ? (
              <Guest key={index} seat={index} at={table.guestDrag?.seat === index ? table.guestDrag.at : seat.guest} carried={table.guestDrag?.seat === index} read={() => guestPose(index)} />
            ) : null,
          )}
          <KnifeModel read={() => ({ at: table.knife.at, visible: table.feeding.leftover || table.knife.pointerId !== null, held: table.knife.pointerId !== null, now: table.t })} />
        </>
      )}
      <StonesModel read={() => stoneStates(table)} />
      <CarrierMice read={() => carrierMice(table)} />
      <ShelfModel read={() => ({ mats: table.shelfMats(), drag: table.shelfDrag, glow: table.guidance.glowShelf ? table.guidance.glow : 0, now: table.t })} />
      <AlbumModel read={() => ({ pages: table.state.album, at: table.albumAt, now: table.t })} />
      <Overlays kind="glow" capacity={32} read={() => glows(table)} surfaces={() => table.physics.surfaces(table.state.liveMat, table.state.seats)} />
      <GhostHand read={() => table.guidance.hand} carry={() => table.guidance.hint?.kind === 'toPan' || table.guidance.hint?.kind === 'toGuest'} floor={(at) => ghostFloor(table, at)} />
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
