import { describe, expect, it } from 'vitest'
import { STREAM, draws, pick } from './chance'
import type { Guidance } from './guidance'
import { beetleHome, packetPlaces, standingOf, type Point } from './hit'
import { deserializeLab, freshLab, serializeLab, type LabState } from './lab'
import { layoutOf } from './layout'
import { dab, plantAt, plantById } from './page'
import { POD_LANDS, Toy } from './toy'
import { POD_BREATH, POD_SWELL } from './toyFx'
import { CELL_VOICES, RANGE, TOY_VOICES, type Part } from './voices'

const SEED = 20261003
const layout = layoutOf(1180, 820)
const FRAME = 1 / 60

function toy(state: LabState = freshLab(null, SEED)) {
  const made = new Toy(state, layout, SEED)
  const heard: (readonly Part[])[] = []
  /** Plays some seconds frame by frame, taking each sound as it comes due, as the Mount does. */
  const play = (seconds: number, each: () => void = () => {}) => {
    for (let t = 0; t < seconds; t += FRAME) { made.step(FRAME); drain(); each() }
  }
  const drain = () => {
    for (let i = 0; i < made.fx.sounds.length; ) {
      if (made.fx.sounds[i].after <= 0) heard.push(made.fx.sounds.splice(i, 1)[0].parts)
      else i++
    }
  }
  const flower = (id: number): Point => standingOf(layout, plantById(made.state, id)!).flower
  const potOf = (row: 'shelf' | 'tray', slot: number): Point => ({ x: layout[row][slot].pot.x + layout[row][slot].pot.w / 2, y: layout[row][slot].pot.y + layout[row][slot].pot.h / 2 })
  const tap = (at: Point) => { made.gesture({ type: 'press', at }); made.gesture({ type: 'tap', at }); drain() }
  const drag = (from: Point, to: Point) => {
    made.gesture({ type: 'press', at: from })
    made.gesture({ type: 'dragStart', from })
    for (let step = 1; step <= 6; step++) made.gesture({ type: 'dragMove', from, at: { x: from.x + ((to.x - from.x) * step) / 6, y: from.y + ((to.y - from.y) * step) / 6 } })
    made.gesture({ type: 'dragEnd', from, at: to })
    drain()
  }
  const has = (voice: readonly Part[]) => heard.includes(voice)
  return { made, heard, play, drain, flower, potOf, tap, drag, has }
}

const paperPoint: Point = { x: layout.w / 2, y: 6 }

describe('the dab', () => {
  it('answers when the finger lands: the flower bends, gives up dust and plucks, in that frame', () => {
    const t = toy()
    t.made.gesture({ type: 'press', at: t.flower(1) })
    expect(t.made.fx.sounds.some((sound) => sound.parts === CELL_VOICES['plant-poke'] && sound.after === 0)).toBe(true)
    expect(t.made.fx.sounds).toHaveLength(2)
    t.made.step(FRAME)
    expect(t.made.motion.motes.length).toBeGreaterThan(8)
    expect(Math.abs(t.made.motion.plants.get(1)!.bend)).toBeGreaterThan(0.01)
    expect(t.made.state).toEqual(freshLab(null, SEED))
  })

  it('sets a pod on the flower the dust reaches, and saves at once', () => {
    const t = toy()
    t.drag(t.flower(1), t.flower(2))
    expect(t.made.state.pods.map((pod) => [pod.dust, pod.on])).toEqual([[1, 2]])
    expect(t.made.changed).toBe(2)
    expect(t.has(CELL_VOICES['plant-dust'])).toBe(true)
  })

  it('sheds a trail of dust along the way', () => {
    const t = toy()
    t.made.gesture({ type: 'press', at: t.flower(1) })
    t.made.gesture({ type: 'dragStart', from: t.flower(1) })
    t.made.step(FRAME)
    const before = t.made.motion.motes.length
    t.made.gesture({ type: 'dragMove', from: t.flower(1), at: { x: 400, y: 300 } })
    t.made.step(FRAME)
    expect(t.made.motion.motes.length).toBeGreaterThan(before)
  })

  it('rides on the finger as a small cloud for as long as the finger carries it, and is gone when it lets go', () => {
    const t = toy()
    t.play(1)
    expect(t.made.motion.motes).toHaveLength(0)
    const from = t.flower(1), away = { x: 640, y: 420 }
    t.made.gesture({ type: 'press', at: from })
    t.made.gesture({ type: 'dragStart', from })
    t.made.gesture({ type: 'dragMove', from, at: away })
    t.play(4)
    // The puff and the trail have long faded; the cloud on the finger has not.
    const cloud = t.made.motion.motes
    expect(cloud).toHaveLength(10)
    for (const speck of cloud) expect(Math.hypot(speck.x - away.x, speck.y - away.y)).toBeLessThan(60)
    t.made.gesture({ type: 'dragEnd', from, at: paperPoint })
    t.play(4)
    expect(t.made.motion.motes).toHaveLength(0)
  })

  it('opens with something already going on: the beetle is part of the way through an action', () => {
    const t = toy()
    t.made.step(FRAME)
    expect(Math.abs(t.made.motion.beetle.pose.lean)).toBeGreaterThan(0.05)
  })

  it('swells, holds a breath and bursts by itself into six young that fly, land and draw themselves, each with its own note', () => {
    const t = toy()
    t.drag(t.flower(1), t.flower(2))
    let swelled = 0, flew = 0
    t.play(POD_SWELL + POD_BREATH - 0.1, () => { swelled = Math.max(swelled, t.made.motion.pods[0]?.swell ?? 0) })
    expect(t.made.state.pods).toHaveLength(1)
    expect(swelled).toBeGreaterThan(1)
    t.play(0.3, () => { flew = Math.max(flew, t.made.motion.seeds.length) })
    expect(t.made.state.pods).toHaveLength(0)
    expect(t.made.state.plants.filter((plant) => plant.row === 'tray')).toHaveLength(6)
    expect(flew).toBeGreaterThan(1)
    expect(t.has(CELL_VOICES['pod-poke'])).toBe(true)
    // Still drawing itself: no flower to touch yet.
    expect(t.made.fx.inBloom(3)).toBe(false)
    t.play(3)
    for (const id of [3, 4, 5, 6, 7, 8]) expect(t.made.fx.inBloom(id)).toBe(true)
    // The stems are still settling under their new flowers; then the page is at rest.
    t.play(3)
    expect(t.made.fx.busy).toBe(false)
    // A pop, six ticks and six notes: thirteen sounds for one burst, and no two young need sound alike.
    const afterBurst = t.heard.slice(t.heard.indexOf(CELL_VOICES['pod-poke']))
    expect(afterBurst.length).toBeGreaterThanOrEqual(13)
  })

  it('grows a plant in under two seconds from the moment its seed lands', () => {
    const t = toy()
    t.drag(t.flower(1), t.flower(2))
    t.play(POD_SWELL + POD_BREATH + 0.05)
    let seconds = 0
    while (!t.made.fx.inBloom(8) && seconds < 5) { t.play(FRAME); seconds += FRAME }
    // The last seed of the six: its flight and its growing together.
    expect(seconds).toBeLessThan(0.07 * 5 + 0.61 + 2)
  })

  it('works again while the first brood is still growing', () => {
    const t = toy()
    t.drag(t.flower(1), t.flower(2))
    t.play(POD_SWELL + POD_BREATH + 0.2)
    expect(t.made.fx.busy).toBe(true)
    t.drag(t.flower(2), t.flower(1))
    expect(t.made.state.pods.map((pod) => pod.on)).toEqual([1])
  })

  it('works with a flower’s own dust, carried out and back', () => {
    const t = toy()
    const at = t.flower(1)
    t.made.gesture({ type: 'press', at })
    t.made.gesture({ type: 'dragStart', from: at })
    t.made.gesture({ type: 'dragMove', from: at, at: { x: at.x + 60, y: at.y - 40 } })
    t.made.gesture({ type: 'dragEnd', from: at, at })
    expect(t.made.state.pods.map((pod) => [pod.dust, pod.on])).toEqual([[1, 1]])
  })

  it('on a flower that already holds a pod is blown back out, and nothing changes', () => {
    const t = toy()
    t.drag(t.flower(1), t.flower(2))
    const state = t.made.state
    t.drag(t.flower(1), t.flower(2))
    expect(t.made.state).toBe(state)
    expect(t.has(CELL_VOICES['pod-dust'])).toBe(true)
  })

  it('let go over bare paper drifts down and is sneezed off the page by the beetle', () => {
    const t = toy()
    t.drag(t.flower(1), paperPoint)
    expect(t.made.state).toEqual(freshLab(null, SEED))
    // The sneeze is heard as the beetle lets go, not before it has reared back.
    expect(t.has(TOY_VOICES.sneeze)).toBe(false)
    let reared = 0
    t.play(1.6, () => { reared = Math.max(reared, t.made.motion.beetle.sneeze) })
    expect(t.has(TOY_VOICES.sneeze)).toBe(true)
    expect(reared).toBeGreaterThan(0.9)
    t.play(2)
    expect(t.made.motion.motes).toHaveLength(0)
  })
})

describe('the rest of the dust column', () => {
  it('on bare soil grows nothing and brings the worm up in a gold cap', () => {
    const t = toy()
    t.drag(t.flower(1), t.potOf('tray', 2))
    expect(t.made.state).toEqual(freshLab(null, SEED))
    expect(t.has(CELL_VOICES['soil-dust'])).toBe(true)
    t.play(1)
    expect(t.made.motion.worm).toMatchObject({ pot: 8, cap: true })
    expect(t.made.motion.worm!.rise).toBeGreaterThan(0.3)
  })

  it('on the beetle turns it gold, makes it sneeze and sends it off leaving gold prints', () => {
    const t = toy(), home = beetleHome(layout)
    t.drag(t.flower(1), { x: home.x, y: home.y - 30 * home.s })
    expect(t.has(CELL_VOICES['beetle-dust'])).toBe(true)
    let prints = 0, walked = 0
    t.play(4, () => { prints = Math.max(prints, t.made.motion.prints.length); if (t.made.motion.beetle.at) walked = Math.max(walked, Math.abs(t.made.motion.beetle.at.x - home.x)) })
    expect(t.made.motion.beetle.gold).toBeGreaterThan(0)
    expect(prints).toBeGreaterThan(2)
    expect(walked).toBeGreaterThan(30)
    t.play(12)
    expect(t.made.motion.beetle.gold).toBe(0)
    expect(t.made.motion.prints).toHaveLength(0)
  })

  it('on a packet sets it spinning like a top', () => {
    const t = toy(), [packet] = packetPlaces(t.made.state, layout)
    t.drag(t.flower(1), { x: packet.x + packet.w / 2, y: packet.y + packet.h / 2 })
    expect(t.has(CELL_VOICES['seed-dust'])).toBe(true)
    t.made.step(FRAME)
    expect(t.made.motion.packets.get('pink')!.spin).toBeGreaterThan(1)
    expect(t.made.state).toEqual(freshLab(null, SEED))
  })
})

describe('a poke', () => {
  it('on a pod bursts it before its breath is out', () => {
    const t = toy()
    t.drag(t.flower(1), t.flower(2))
    t.play(0.2)
    t.tap(standingOf(layout, plantById(t.made.state, 2)!).pod)
    expect(t.made.state.pods).toHaveLength(0)
    expect(t.made.state.plants.filter((plant) => plant.row === 'tray')).toHaveLength(6)
  })

  it('on bare soil puffs it and brings the worm up to look round', () => {
    const t = toy()
    t.tap(t.potOf('tray', 4))
    expect(t.has(CELL_VOICES['soil-poke'])).toBe(true)
    let left = 0, right = 0
    t.play(1.9, () => { const worm = t.made.motion.worm; if (worm) { expect(worm.pot).toBe(10); left = Math.min(left, worm.look); right = Math.max(right, worm.look) } })
    expect(left).toBeLessThan(-0.8)
    expect(right).toBeGreaterThan(0.8)
    t.play(0.2)
    expect(t.made.motion.worm).toBe(null)
  })

  it('never leaves the worm looking out of a pot a plant has come up in', () => {
    const t = toy()
    t.tap(t.potOf('tray', 0))
    t.play(0.4)
    expect(t.made.motion.worm).toMatchObject({ pot: 6 })
    const [packet] = packetPlaces(t.made.state, layout)
    t.tap({ x: packet.x + packet.w / 2, y: packet.y + packet.h / 2 })
    t.made.step(FRAME)
    expect(t.made.motion.worm).toBe(null)
  })

  it('on the pot of a plant in bloom springs the plant, plucks its note and shakes a smaller puff of dust off its flower', () => {
    const t = toy()
    t.tap(t.potOf('shelf', 0))
    t.made.step(FRAME)
    expect(t.has(CELL_VOICES['plant-poke'])).toBe(true)
    expect(t.heard).toHaveLength(2)
    expect(t.made.motion.motes.length).toBeGreaterThan(6)
    expect(t.made.motion.motes.length).toBeLessThan(22)
    expect(t.made.motion.plants.has(1)).toBe(true)
  })

  it('on the beetle flips it on its back, where it pedals and rights itself', () => {
    const t = toy(), home = beetleHome(layout)
    t.tap({ x: home.x, y: home.y - 30 * home.s })
    expect(t.has(CELL_VOICES['beetle-poke'])).toBe(true)
    let over = 0
    const legs = new Set<string>()
    t.play(1.2, () => { over = Math.max(over, t.made.motion.beetle.flip); legs.add(t.made.motion.beetle.pedal.toFixed(2)) })
    expect(over).toBeGreaterThan(0.95)
    expect(legs.size).toBeGreaterThan(10)
    t.play(1)
    expect(t.made.motion.beetle.flip).toBe(0)
  })

  it('on a packet shakes a seed out, which hops to a pot and grows there', () => {
    const t = toy(), [packet] = packetPlaces(t.made.state, layout)
    t.tap({ x: packet.x + packet.w / 2, y: packet.y + packet.h / 2 })
    expect(t.has(CELL_VOICES['seed-poke'])).toBe(true)
    expect(plantAt(t.made.state, 'tray', 0)).toMatchObject({ id: 3, from: { how: 'packet', packet: 'pink' } })
    t.made.step(FRAME)
    expect(t.made.motion.seeds).toHaveLength(1)
    t.play(2)
    expect(t.made.fx.inBloom(3)).toBe(true)
  })

  it('on bare paper is a dry tap, and the beetle looks up', () => {
    const t = toy()
    t.tap(paperPoint)
    expect(t.heard).toEqual([TOY_VOICES.paper])
    expect(t.made.state).toEqual(freshLab(null, SEED))
  })

  it('in the grown-up’s corner is answered by nothing', () => {
    const t = toy()
    t.tap({ x: layout.w - 12, y: 12 })
    t.made.step(FRAME)
    expect(t.heard).toEqual([])
    expect(t.made.fx.sounds).toEqual([])
  })
})

describe('carrying', () => {
  it('keeps the page at rest while a plant is in the hand: it still stands, in the page, in its pot', () => {
    const t = toy()
    const from = t.potOf('shelf', 0)
    t.made.gesture({ type: 'press', at: from })
    t.made.gesture({ type: 'dragStart', from })
    t.made.gesture({ type: 'dragMove', from, at: { x: 600, y: 400 } })
    t.made.step(FRAME)
    expect(serializeLab(t.made.state)).toEqual(serializeLab(freshLab(null, SEED)))
    const held = t.made.motion.plants.get(1)!
    expect(held.held).toBe(true)
    expect(held.at!.x).toBe(600)
  })

  it('sets a plant down in the pot it is let go over, and shoulders out the plant that stood there', () => {
    const t = toy()
    t.drag(t.potOf('shelf', 0), t.potOf('shelf', 1))
    expect(plantById(t.made.state, 1)).toMatchObject({ row: 'shelf', slot: 1 })
    expect(plantById(t.made.state, 2)).toMatchObject({ row: 'border', slot: 0 })
    expect(t.has(CELL_VOICES['plant-carry'])).toBe(true)
    t.made.step(FRAME)
    expect(t.made.motion.plants.get(2)!.at).not.toBe(null)
    t.play(1.5)
    expect(t.made.fx.busy).toBe(false)
  })

  it('lets a plant spring back to its pot when it is let go over bare paper', () => {
    const t = toy()
    t.drag(t.potOf('shelf', 0), paperPoint)
    expect(t.made.state).toEqual(freshLab(null, SEED))
    expect(t.has(TOY_VOICES.back)).toBe(true)
    t.play(1)
    expect(t.made.motion.plants.has(1)).toBe(false)
  })

  it('takes a plant back from the border to a pot', () => {
    const t = toy()
    t.drag(t.potOf('shelf', 0), t.potOf('shelf', 1))
    t.play(1)
    const spot = layout.border[0]
    t.drag({ x: spot.x, y: spot.ground - 12 }, t.potOf('tray', 3))
    expect(plantById(t.made.state, 2)).toMatchObject({ row: 'tray', slot: 3 })
  })

  it('trades two pots, and puts a packet seed where it is carried', () => {
    const t = toy()
    t.drag(t.potOf('tray', 0), t.potOf('shelf', 0))
    expect(plantById(t.made.state, 1)).toMatchObject({ row: 'tray', slot: 0 })
    expect(t.has(CELL_VOICES['soil-carry'])).toBe(true)
    const [packet] = packetPlaces(t.made.state, layout)
    t.drag({ x: packet.x + packet.w / 2, y: packet.y + packet.h / 2 }, t.potOf('tray', 5))
    expect(plantAt(t.made.state, 'tray', 5)).toMatchObject({ from: { how: 'packet', packet: 'pink' } })
    expect(t.has(CELL_VOICES['seed-carry'])).toBe(true)
  })

  it('finds a packet seed back in its packet when it is let go over bare paper', () => {
    const t = toy(), [packet] = packetPlaces(t.made.state, layout)
    t.drag({ x: packet.x + packet.w / 2, y: packet.y + packet.h / 2 }, paperPoint)
    expect(t.made.state).toEqual(freshLab(null, SEED))
    t.play(1)
    expect(t.made.motion.seeds).toHaveLength(0)
  })

  it('lands a pod that is carried to a pot in that pot, whole, and bursts it there a moment later', () => {
    const t = toy()
    t.drag(t.flower(1), t.flower(2))
    t.drag(standingOf(layout, plantById(t.made.state, 2)!).pod, t.potOf('tray', 3))
    expect(t.has(CELL_VOICES['pod-carry'])).toBe(true)
    // It lies in the pot, unburst, and the pot gives under it.
    t.made.step(FRAME)
    expect(t.made.state.pods).toHaveLength(1)
    expect(t.made.motion.pods[0].at!.x).toBeCloseTo(layout.tray[3].x, 6)
    expect(t.made.motion.pots.get(9)!.squash).toBeLessThan(1)
    t.play(POD_LANDS + 0.05)
    expect(t.made.state.pods).toHaveLength(0)
  })
})

describe('found as left', () => {
  it('opens with every plant grown and nothing in motion', () => {
    const t = toy(dab(freshLab(null, SEED), 1, 2).state)
    t.made.step(FRAME)
    expect(t.made.fx.inBloom(1) && t.made.fx.inBloom(2)).toBe(true)
    expect(t.made.motion.seeds).toHaveLength(0)
    expect(t.heard).toEqual([])
  })

  it('finds a pod that was put away unburst waiting on its plant: it bursts on a touch and never by itself', () => {
    const t = toy(dab(freshLab(null, SEED), 1, 2).state)
    t.play(6)
    expect(t.made.state.pods).toHaveLength(1)
    expect(t.made.motion.pods[0].swell).toBeGreaterThan(1)
    t.tap(standingOf(layout, plantById(t.made.state, 2)!).pod)
    expect(t.made.state.pods).toHaveLength(0)
  })

  it('never changes the page by the passing of time alone, apart from a pod bursting when its breath is out', () => {
    const t = toy()
    t.play(30)
    expect(t.made.state).toEqual(freshLab(null, SEED))
    expect(t.made.changed).toBe(0)
  })
})

describe('the idle ladder’s first form', () => {
  const guidance = (glow: number, demo: number | null, demoIndex = 0): Guidance => ({ glow, demo, demoIndex })

  it('rings every flower that can be dabbed, and shows nothing when the ladder is at the bottom', () => {
    const t = toy()
    t.made.step(FRAME, guidance(0, null, -1))
    expect(t.made.motion.glow.rings).toHaveLength(0)
    t.made.step(FRAME, guidance(0.8, null, -1))
    expect(t.made.motion.glow.strength).toBe(0.8)
    expect(t.made.motion.glow.rings.map((ring) => [ring.x, ring.y])).toEqual([1, 2].map((id) => [t.flower(id).x, t.flower(id).y]))
    expect(t.made.motion.hand).toBe(null)
  })

  it('shows one dab with the ghost hand, from one flower to another, and changes nothing', () => {
    const t = toy()
    t.made.step(FRAME, guidance(1, 0.2))
    expect(t.made.motion.hand).toMatchObject({ x: t.flower(1).x, y: t.flower(1).y })
    t.made.step(FRAME, guidance(1, 0.8))
    expect(t.made.motion.hand!.x).toBeCloseTo(t.flower(2).x, 3)
    t.made.step(FRAME, guidance(1, 0.5))
    expect(t.made.motion.hand!.x).toBeGreaterThan(t.flower(1).x)
    expect(t.made.motion.hand!.x).toBeLessThan(t.flower(2).x)
    expect(t.made.state).toEqual(freshLab(null, SEED))
    expect(t.made.fx.sounds).toEqual([])
  })

  it('picks the two flowers by turn, never by what they carry', () => {
    const t = toy()
    t.made.step(FRAME, guidance(1, 0.2, 1))
    expect(t.made.motion.hand!.x).toBe(t.flower(2).x)
  })

  it('taps the packet when there are fewer than two flowers', () => {
    const lone = freshLab(null, SEED)
    const t = toy({ ...lone, plants: lone.plants.slice(0, 1) })
    const [packet] = packetPlaces(t.made.state, layout)
    t.made.step(FRAME, guidance(1, 0.4))
    expect(t.made.motion.hand).toMatchObject({ x: packet.x + packet.w / 2, y: packet.y + packet.h / 2 })
  })
})

describe('random tapping and dragging', () => {
  it('always gets an answer, never breaks the page, and leaves it found as left at every instant', () => {
    const next = draws(SEED, STREAM.visit, 4242)
    const t = toy()
    const anywhere = (): Point => ({ x: next() * layout.w, y: next() * layout.h })
    const onSomething = (): Point => {
      const plants = t.made.state.plants.filter((plant) => plant.row !== 'border')
      const plant = plants[pick(next, plants.length)]
      const choice = pick(next, 5)
      if (choice === 0 && plant) return standingOf(layout, plant).flower
      if (choice === 1 && plant) return standingOf(layout, plant).pod
      if (choice === 2) return t.potOf(pick(next, 2) ? 'shelf' : 'tray', pick(next, 6))
      if (choice === 3) { const [packet] = packetPlaces(t.made.state, layout); return { x: packet.x + packet.w / 2, y: packet.y + packet.h / 2 } }
      return anywhere()
    }
    let answered = 0, touches = 0
    for (let round = 0; round < 700; round++) {
      const from = onSomething(), before = t.heard.length + t.made.fx.sounds.length
      if (pick(next, 2)) t.tap(from)
      else t.drag(from, pick(next, 3) ? onSomething() : anywhere())
      const inCorner = from.x > layout.w - 72 && from.y < 72
      if (!inCorner) { touches++; if (t.heard.length + t.made.fx.sounds.length > before) answered++ }
      t.play(next() * 0.6)
      // Put away at this instant and opened again, it is the same page.
      expect(deserializeLab(JSON.parse(JSON.stringify(serializeLab(t.made.state))), null, 1)).toEqual(t.made.state)
      const live = t.made.motion
      expect(live.motes.length).toBeLessThanOrEqual(150)
      for (const [, plant] of live.plants) expect(Number.isFinite(plant.bend) && Number.isFinite(plant.squash) && plant.grow >= 0 && plant.grow <= 1).toBe(true)
      for (const seed of live.seeds) expect(Number.isFinite(seed.x) && Number.isFinite(seed.y)).toBe(true)
    }
    // Every touch outside the grown-up's corner is answered with a sound.
    expect(answered).toBe(touches)
    expect(t.made.state.podsSet).toBeGreaterThan(20)
    t.play(8)
    for (const parts of t.heard) for (const part of parts) expect(part.peak >= RANGE.peak[0] && part.peak <= RANGE.peak[1]).toBe(true)
  }, 30_000)
})
