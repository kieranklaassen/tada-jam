import { describe, expect, it } from 'vitest'
import { DUST_LIES, PEER_BACK, RATTLE_BURST, RESKETCH_SECONDS, RING_SECONDS, STRAIGHTEN_AT, SWING_TURN, WATER_STANDS } from './game'
import { FINGER_SEEN } from './faces'
import { frondAt, leafAt } from './things'
import { SIT_SECONDS } from './house'
import { CAST } from './cast'
import { BEETLE_REACH, beetleHome, stubbornTape } from './hit'
import { layoutOf } from './layout'
import { deserializeLab, freshLab, serializeLab, type LabState, type Plant } from './lab'
import { kitAt, type Visit } from './order'
import { PACKETS, lookOf, pack } from './plant'
import { toolHome } from './reach'
import { FRAME, rig, stubCast } from './rig'
import { CELL_VOICES, GAME_VOICES, TOY_VOICES, VISITOR_VOICES, seedTick } from './voices'

const TOY_VOICES_SNEEZE = TOY_VOICES.sneeze

// The moves the sheet gives the characters by name: the beetle carrying a
// plant off the page, its leg hooked in a runner bud while it shows a tool,
// its fuss over a visitor's sketch, the seed that knocks it over, the worm in
// a pot held out to a visitor, and a visitor that answers a touch on its way off.

const SEED = 20261003
/** When, with the tests' stand-in cast, a pot offered to the snail is handed back and a pod offered to it bursts. */
const PEER_SECONDS = stubCast().snail.answer.peer.seconds * PEER_BACK, RATTLE_SECONDS = stubCast().snail.answer.rattle.seconds * RATTLE_BURST
const visit = (over: Partial<Visit> = {}): Visit => ({ who: 'snail', at: 'colour', count: 1, big: false, given: [], pods: 0, ...over })
const packet = (id: number, row: Plant['row'], slot: number): Plant => ({ id, pairs: PACKETS.pink, dry: false, row, slot, from: { how: 'packet', packet: 'pink' } })

/** A page whose border is full and whose tray is full: the next brood sends the six oldest border plants off the page. The beetle has shown its ideas, so it starts no showing of its own. */
function full(over: Partial<LabState> = {}): LabState {
  const base = freshLab(null, SEED)
  const plants = [...base.plants]
  for (let slot = 0; slot < 18; slot++) plants.push(packet(30 + slot, 'border', slot))
  for (let slot = 0; slot < 6; slot++) plants.push(packet(50 + slot, 'tray', slot))
  return { ...base, plants, nextId: 60, shown: ['sort', 'hidden'], ...over }
}
/** A page late in the order with a snail on it. */
const late = (over: Partial<LabState> = {}): LabState => ({ ...freshLab(null, SEED), position: 'whole-plant', kit: kitAt('whole-plant'), shown: ['sort', 'hidden', 'runner', 'water'], visitor: visit(), nextId: 20, ...over })

const riders = (t: ReturnType<typeof rig>) => [...t.made.motion.plants].filter(([id]) => id < 0).map(([, plant]) => plant)

describe('a plant that leaves the border', () => {
  it('hops onto the beetle’s back, and the beetle carries it off the page past its corner and comes home to draw it', () => {
    const t = rig(full())
    const home = beetleHome(t.layout)
    t.drag(t.where.flower(1), t.where.flower(2))
    let most = 0, furthest = 0, turned = false, drewBeforeHome = false
    t.play(9, () => {
      const live = t.made.motion
      most = Math.max(most, riders(t).length)
      if (live.beetle.at) furthest = Math.max(furthest, live.beetle.at.x)
      turned ||= live.beetle.turned
      if (t.made.fx.laden > 0 && (t.made.view().sketched ?? []).length > 0) drewBeforeHome = true
    })
    // All six that left were on its back, it went off the edge with its head towards it, and nothing is left behind.
    expect(most).toBe(6)
    expect(furthest).toBeGreaterThan(t.layout.w + 40 * home.s)
    expect(turned).toBe(true)
    expect(t.made.state.sketched).toHaveLength(6)
    expect(t.made.state.plants.filter((plant) => plant.row === 'border')).toHaveLength(18)
    expect(riders(t)).toHaveLength(0)
    expect(t.made.fx.laden).toBe(0)
    expect(t.made.motion.beetle.at).toBe(null)
    expect(t.made.motion.beetle.turned).toBe(false)
    // No sketch is on the page while the plants are still on its back. Home again it draws them one after another, each begun when the one before is done.
    expect(drewBeforeHome).toBe(false)
    expect(t.has(GAME_VOICES.pencil)).toBe(true)
    let drawn = (t.made.view().sketched ?? []).length, jump = 0
    t.play(14, () => { const now = (t.made.view().sketched ?? []).length; jump = Math.max(jump, now - drawn); drawn = now })
    expect(t.made.view().sketched).toHaveLength(6)
    expect(jump).toBe(1)
    expect(t.made.motion.sketching).toBe(1)
  })

  it('rides on its back, above its feet and within its width, all the way out', () => {
    const t = rig(full())
    const home = beetleHome(t.layout)
    t.drag(t.where.flower(1), t.where.flower(2))
    let rode = 0
    t.play(9, () => {
      const beetle = t.made.motion.beetle
      if (!beetle.turned || !beetle.at) return
      for (const plant of riders(t)) {
        rode++
        expect(plant.at!.y).toBeLessThan(beetle.at.y - 40 * home.s)
        expect(Math.abs(plant.at!.x - beetle.at.x)).toBeLessThan(62 * home.s)
      }
    })
    expect(rode).toBeGreaterThan(100)
  })

  it('goes off the near edge by itself when the beetle is not at home to take it', () => {
    const t = rig(full())
    t.drag(t.where.flower(1), t.where.flower(2))
    let left = Infinity
    // The beetle is in the child's hand while the pod bursts.
    t.drag(t.where.beetle(), t.where.paper, () => {
      t.play(4, () => { for (const plant of riders(t)) left = Math.min(left, plant.at!.x) })
      expect(t.made.fx.laden).toBe(0)
    })
    expect(left).toBeLessThan(0)
    expect(t.made.state.sketched).toHaveLength(6)
    // While it is in the hand no sketch is on the page; it draws them when it is home again.
    expect(t.made.view().sketched).toHaveLength(0)
    expect(t.has(GAME_VOICES.pencil)).toBe(false)
    t.play(16)
    expect(riders(t)).toHaveLength(0)
    expect(t.made.view().sketched).toHaveLength(6)
    expect(t.made.motion.sketching).toBe(1)
    expect(t.has(GAME_VOICES.pencil)).toBe(true)
    // At home it may be a step from its spot, in the middle of something it does by itself.
    expect(t.made.fx.beetleOut).toBe(false)
  })

  it('stays on its back when a finger picks the beetle up on its way out, and is carried off once it is home again', () => {
    const t = rig(full())
    const home = beetleHome(t.layout)
    t.drag(t.where.flower(1), t.where.flower(2))
    for (let frame = 0; frame < 900 && !t.made.motion.beetle.turned; frame++) t.play(FRAME)
    expect(t.made.motion.beetle.turned).toBe(true)
    t.play(0.3)
    const feet = t.made.fx.beetleAt()
    t.drag({ x: feet.x, y: feet.y - 30 * home.s }, t.where.paper)
    expect(t.made.fx.laden).toBe(6)
    expect(riders(t)).toHaveLength(6)
    t.play(12)
    expect(t.made.fx.laden).toBe(0)
    expect(riders(t)).toHaveLength(0)
    expect(t.made.motion.beetle.at).toBe(null)
    expect(t.made.motion.sketching).toBe(1)
  })
})

describe('the beetle among the pots', () => {
  it('is knocked onto its back by a seed that lands where it stands, and goes home', () => {
    const t = rig({ ...freshLab(null, SEED), shown: ['sort', 'hidden'] })
    t.drag(t.where.flower(1), t.where.flower(2))
    // Set down on a pot of the tray it digs itself in; the brood lands in that pot too.
    t.drag(t.where.beetle(), t.where.pot('tray', 3))
    expect(t.has(CELL_VOICES['beetle-carry'])).toBe(true)
    expect(t.has(CELL_VOICES['beetle-poke'])).toBe(false)
    let over = 0
    t.play(4, () => { over = Math.max(over, t.made.motion.beetle.flip) })
    expect(over).toBeGreaterThan(0.9)
    expect(t.has(CELL_VOICES['beetle-poke'])).toBe(true)
    t.play(3)
    expect(t.made.motion.beetle.at).toBe(null)
    expect(t.made.motion.beetle.flip).toBe(0)
  })

  it('brought to a visitor, bows and then puts its sketch straight: the label swings and hangs true', () => {
    const t = rig(late())
    t.drag(t.where.beetle(), t.where.visitor())
    expect(t.has(CELL_VOICES['beetle-offer'])).toBe(true)
    t.play(STRAIGHTEN_AT - 0.2)
    // It stands facing the visitor, not with its back to it.
    expect(t.made.motion.beetle.turned).toBe(true)
    expect(Math.abs(t.made.motion.wish.shake)).toBe(0)
    expect(t.has(GAME_VOICES.unroll)).toBe(false)
    // Until now the label hangs as the visitor stuck it in the ground: crooked.
    expect(t.made.motion.wish.askew).toBe(1)
    let swung = 0
    t.play(0.6, () => { swung = Math.max(swung, Math.abs(t.made.motion.wish.shake)) })
    expect(swung).toBeGreaterThan(0.1)
    expect(t.has(GAME_VOICES.unroll)).toBe(true)
    // And now it hangs true, and stays so for as long as this visitor's sketch is up.
    t.play(1)
    expect(t.made.motion.wish.askew).toBeLessThan(0.01)
    t.play(20)
    expect(t.made.motion.wish.askew).toBeLessThan(0.01)
    t.play(5)
    expect(Math.abs(t.made.motion.wish.shake)).toBe(0)
    expect(t.made.motion.beetle.at).toBe(null)
    expect(t.made.motion.beetle.turned).toBe(false)
  })
})

describe('the showing of a new tool', () => {
  const arriving = (): LabState => ({ ...freshLab(null, SEED), position: 'runner', kit: kitAt('colour-short'), waiting: visit({ at: 'runner', count: 2, who: 'bee' }) })

  it('has the beetle hook a leg in a runner bud and be towed to the free pot by the runner, which stays until the copy has grown', () => {
    const t = rig(arriving())
    t.tap(t.where.waiting())
    for (let frame = 0; frame < 600 && !t.made.sceneRunning; frame++) t.play(FRAME)
    expect(t.made.sceneRunning).toBe(true)
    const copy = t.made.state.plants.find((one) => one.from.how === 'runner')!
    let towed = 0, tipped = 0, longest = 0, grownWithTow = false
    t.play(9, () => {
      const live = t.made.motion
      if (!live.tow) return
      towed++
      tipped = Math.max(tipped, live.beetle.flip)
      longest = Math.max(longest, Math.hypot(live.tow.to.x - live.tow.from.x, live.tow.to.y - live.tow.from.y))
      // The runner starts at a bud beside a pot of the page.
      expect(live.tow.from.y).toBeGreaterThan(t.layout.shelf[0].soil)
      if (t.made.fx.inBloom(copy.id) && !t.made.sceneRunning) grownWithTow = true
    })
    expect(towed).toBeGreaterThan(60)
    // It is on its tail while it is towed, not walking.
    expect(tipped).toBeGreaterThan(0.2)
    expect(tipped).toBeLessThan(0.5)
    expect(longest).toBeGreaterThan(t.layout.shelf[0].cell.w * 0.5)
    expect(grownWithTow).toBe(false)
    expect(t.made.motion.tow).toBe(null)
    expect(t.made.motion.beetle.at).toBe(null)
    expect(t.has(CELL_VOICES['bud-wet'])).toBe(true)
  })

  it('leaves no runner in the air when a touch ends it midway', () => {
    const t = rig(arriving())
    t.tap(t.where.waiting())
    for (let frame = 0; frame < 600 && !t.made.sceneRunning; frame++) t.play(FRAME)
    t.play(2.2)
    expect(t.made.motion.tow).not.toBe(null)
    t.tap(t.where.paper)
    t.play(FRAME)
    expect(t.made.motion.tow).toBe(null)
    t.play(4)
    expect(t.made.motion.beetle.at).toBe(null)
  })
})

describe('offered to a visitor', () => {
  it('a pot of bare soil is held out to it while it peers in, with the worm looking out of that pot, and is then handed back', () => {
    const t = rig(late())
    t.drag(t.where.pot('tray', 2), t.where.visitor())
    expect(t.has(CELL_VOICES['soil-offer'])).toBe(true)
    t.play(PEER_SECONDS - 0.1)
    const live = t.made.motion
    // Pot 8 is the tray's third: it stands in front of the visitor, and the worm is in it.
    expect(live.pots.get(8)?.at).toMatchObject({ x: t.layout.offer.x })
    expect(live.worm).toMatchObject({ pot: 8 })
    expect(live.worm!.rise).toBeGreaterThan(0.5)
    // The hollow knock sounds as the pot is handed back, not before.
    expect(t.has(GAME_VOICES.knock)).toBe(false)
    t.play(0.2)
    expect(t.has(GAME_VOICES.knock)).toBe(true)
    expect(t.made.motion.pots.get(8)?.at ?? null).toBe(null)
    t.play(2)
    expect(t.made.motion.pots.size).toBe(0)
  })

  it('a visitor that is walking off answers a touch on its way, and still leaves', () => {
    const t = rig(late())
    t.tap(t.where.waiting())
    // The snail shrugs first; then it turns to go.
    for (let frame = 0; frame < 600 && !t.made.motion.visitor?.away; frame++) t.play(FRAME)
    t.play(0.3)
    const going = t.made.motion.visitor!
    expect(going.away).toBe(true)
    const before = t.heard.length
    t.tap({ x: going.x, y: going.y - 20 })
    expect(t.heard.slice(before)).toContain(VISITOR_VOICES.snail.poked)
    t.play(6)
    // It is gone, and the one that waited is on the page.
    expect(t.made.state.visitor?.who).toBe(t.made.motion.visitor?.kind)
    expect(t.made.motion.visitor?.away).toBe(false)
  })
})

describe('a secret, every time', () => {
  const RED_SHORT = pack({ colour: [1, 1], height: [0, 0], leaf: [1, 1], petals: [1, 1] })
  /** A red plant of one joint: short, and come up in dry soil. */
  const low: Plant = { id: 9, pairs: RED_SHORT, dry: true, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }
  const rode = (t: ReturnType<typeof rig>, id: (ids: number[]) => number | undefined) => {
    let highest = Infinity
    t.play(7, () => {
      const one = id([...t.made.motion.plants.keys()])
      const at = one === undefined ? null : t.made.motion.plants.get(one)?.at
      if (at) highest = Math.min(highest, at.y)
    })
    return highest
  }

  it('the snail wears a one-joint plant as a hat when it already sits with the plant it asked for, and hands it back', () => {
    const base = late({ finished: true, visitor: visit({ given: [5] }) })
    const t = rig({ ...base, plants: [...base.plants, low] })
    const start = t.made.state
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    expect(t.has(CELL_VOICES['plant-offer'])).toBe(true)
    expect(t.made.sceneRunning).toBe(true)
    // The plant is up on the snail's head, well above the ground it was set down on.
    expect(rode(t, () => 9)).toBeLessThan(t.layout.offer.y - 30 * t.layout.k)
    expect(t.made.state).toBe(start)
    expect(t.made.motion.plants.has(9)).toBe(false)
    expect(t.made.sceneRunning).toBe(false)
  })

  it('put away during a secret that plays before the ending, the game is found with the ending in place and plays neither scene again', () => {
    const base = late({ position: 'colour', visitor: visit({ at: 'colour' }) })
    const t = rig({ ...base, plants: [...base.plants, low] })
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    // The outcome is handed to storage when the plant is given, at once and not at the throttle: before the secret has played a frame.
    expect(t.made.state.finished).toBe(true)
    expect(t.made.changed).toBe(2)
    // The hat is on: the secret is playing, and the ending has not started.
    t.play(1)
    expect(t.made.sceneRunning).toBe(true)
    expect(t.has(GAME_VOICES.hat)).toBe(true)
    expect(t.has(VISITOR_VOICES.snail.use)).toBe(false)
    const saved = serializeLab(t.made.state)
    t.made.putAway()
    expect(t.made.sceneRunning).toBe(false)
    expect(serializeLab(t.made.state)).toEqual(saved)
    expect(t.made.state.finished).toBe(true)
    expect(t.made.state.visitor!.given).toHaveLength(1)
    expect(t.made.state.plants.some((plant) => plant.id === 9)).toBe(false)
    // Loaded again: the visitor sits with its plant, nothing plays and nothing sounds.
    const again = rig(deserializeLab(JSON.parse(JSON.stringify(saved)), null, 1))
    again.play(3)
    expect(again.made.sceneRunning).toBe(false)
    expect(again.made.view().visitor).toMatchObject({ settled: true })
    expect(again.made.state.finished).toBe(true)
    expect(again.has(VISITOR_VOICES.snail.use)).toBe(false)
    expect(again.has(GAME_VOICES.hat)).toBe(false)
  })

  it('the snail wears it as a hat when the plant is also the one it asked for, and then keeps it', () => {
    const base = late({ position: 'colour', visitor: visit({ at: 'colour' }) })
    const t = rig({ ...base, plants: [...base.plants, low] })
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    // The plant has left the page as the scene starts; what rides on the snail is its stand-in.
    expect(t.made.state.plants.some((plant) => plant.id === 9)).toBe(false)
    expect(rode(t, (ids) => ids.find((id) => id < 0))).toBeLessThan(t.layout.offer.y - 30 * t.layout.k)
    t.play(6)
    expect(t.made.state.finished).toBe(true)
    expect([...t.made.motion.plants.keys()].filter((id) => id < 0)).toHaveLength(0)
  })

  it('a plant set in the beetle’s corner is guarded also when the beetle was elsewhere: it comes home to it first', () => {
    const t = rig(late())
    const home = beetleHome(t.layout)
    t.drag(t.where.beetle(), t.where.pot('tray', 4))
    t.play(0.3)
    expect(t.made.motion.beetle.at).not.toBe(null)
    t.drag(t.where.pot('shelf', 0), t.where.corner())
    expect(t.made.sceneRunning).toBe(true)
    t.play(1)
    // It is back in its corner within a second, and the fence goes up with it there.
    expect(Math.abs(t.made.fx.beetleAt().y - home.y)).toBeLessThan(1)
    expect(Math.abs(t.made.fx.beetleAt().x - home.x)).toBeLessThan(80 * home.s)
    let up = 0
    t.play(3, () => { up = Math.max(up, t.made.motion.fence?.up ?? 0) })
    expect(up).toBe(1)
    t.play(4)
    expect(t.made.motion.fence).toBe(null)
    expect(t.made.motion.beetle.at).toBe(null)
  })
})

describe('a pod in the hand', () => {
  const podded = () => {
    const t = rig({ ...freshLab(null, SEED), shown: ['sort', 'hidden'] })
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(0.6)
    return t
  }

  it('is carried off its stalk under the finger, lands whole in the pot it is carried to, and its six seeds jump out of that pot', () => {
    const t = podded()
    const to = t.where.pot('shelf', 4), soil = { x: t.layout.shelf[4].x, y: t.layout.shelf[4].soil }
    let carried: { x: number; y: number } | null = null
    t.drag(t.where.pod(2), to, () => { carried = t.made.motion.pods[0]?.at ?? null })
    expect(carried).not.toBe(null)
    expect(Math.abs(carried!.x - to.x)).toBeLessThan(2)
    expect(t.has(CELL_VOICES['pod-carry'])).toBe(true)
    // It lies in that pot, whole, for a moment; then it bursts there.
    t.made.step(FRAME)
    expect(t.made.state.pods).toHaveLength(1)
    expect(Math.abs(t.made.motion.pods[0].at!.x - soil.x)).toBeLessThan(1)
    for (let frame = 0; frame < 30 && t.made.motion.seeds.length === 0; frame++) t.play(FRAME)
    expect(t.made.state.pods).toHaveLength(0)
    // The first seed sets out from the soil of that pot, not from the plant the pod sat on.
    const first = t.made.motion.seeds[0]
    const pod = t.where.pod(2)
    expect(Math.hypot(first.x - soil.x, first.y - soil.y)).toBeLessThan(70 * t.layout.k)
    expect(Math.hypot(first.x - soil.x, first.y - soil.y)).toBeLessThan(Math.hypot(first.x - pod.x, first.y - pod.y))
    t.play(5)
    expect(t.made.state.plants.filter((plant) => plant.row === 'tray')).toHaveLength(6)
  })

  it('offered to a visitor bursts in its grip: the seeds fly from the visitor, and the brood lands as usual', () => {
    const base = late()
    const t = rig(base)
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(0.6)
    t.drag(t.where.pod(2), t.where.visitor())
    t.play(RATTLE_SECONDS - 0.05)
    expect(t.made.motion.seeds).toHaveLength(0)
    for (let frame = 0; frame < 12 && t.made.motion.seeds.length === 0; frame++) t.play(FRAME)
    expect(t.has(CELL_VOICES['pod-offer'])).toBe(true)
    // The seeds set out from the visitor, far from the plant the pod sat on.
    const first = t.made.motion.seeds[0]
    expect(first.x).toBeGreaterThan(t.layout.visitor.x - 30 * t.layout.k)
    t.play(5)
    expect(t.made.state.plants.filter((plant) => plant.row === 'tray')).toHaveLength(6)
  })
})

describe('put away with a finger still on it', () => {
  /** A drag that is never let go: the finger is over `to` when the game is put away. */
  const midDrag = (t: ReturnType<typeof rig>, from: { x: number; y: number }, to: { x: number; y: number }) => {
    t.made.gesture({ type: 'press', at: from })
    t.made.gesture({ type: 'dragStart', from })
    for (let step = 1; step <= 6; step++) t.made.gesture({ type: 'dragMove', from, at: { x: from.x + ((to.x - from.x) * step) / 6, y: from.y + ((to.y - from.y) * step) / 6 } })
    t.made.step(FRAME)
    t.made.putAway()
    t.play(1)
  }
  const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
  const page = () => { const base = late(); return { ...base, plants: [...base.plants, { id: 9, pairs: RED, dry: false, row: 'tray' as const, slot: 0, from: { how: 'packet' as const, packet: 'pink' as const } }] } }

  it('makes no move the child did not finish: dust sets no pod, a plant is not offered and shoulders none out, a pod does not burst', () => {
    // Dust over another flower.
    let t = rig(page()), start = t.made.state
    midDrag(t, t.where.flower(1), t.where.flower(2))
    expect(t.made.state).toBe(start)
    // A plant the snail would keep, over the snail.
    t = rig(page()); start = t.made.state
    midDrag(t, t.where.pot('tray', 0), t.where.visitor())
    expect(t.made.state).toBe(start)
    expect(t.made.sceneRunning).toBe(false)
    expect(t.made.motion.plants.get(9)?.at ?? null).toBe(null)
    // A plant over a pot that is taken.
    t = rig(page()); start = t.made.state
    midDrag(t, t.where.pot('tray', 0), t.where.pot('shelf', 0))
    expect(t.made.state).toBe(start)
    // A pot of bare soil over another, a packet seed over a pot.
    t = rig(page()); start = t.made.state
    midDrag(t, t.where.pot('tray', 2), t.where.pot('tray', 4))
    expect(t.made.state).toBe(start)
    expect(t.made.motion.pots.size).toBe(0)
    midDrag(t, t.where.packet(0), t.where.pot('tray', 3))
    expect(t.made.state).toBe(start)
    expect(t.made.motion.seeds).toHaveLength(0)
    // A pod in the hand: it is on its plant again and holds its breath no longer than a pod does.
    t = rig({ ...page(), shown: ['sort', 'hidden', 'runner', 'water'] })
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(0.4)
    const podded = t.made.state
    t.made.gesture({ type: 'press', at: t.where.pod(2) })
    t.made.gesture({ type: 'dragStart', from: t.where.pod(2) })
    t.made.gesture({ type: 'dragMove', from: t.where.pod(2), at: t.where.pot('shelf', 4) })
    t.made.step(FRAME)
    t.made.putAway()
    t.made.step(FRAME)
    expect(t.made.state).toBe(podded)
    expect(t.made.motion.pods[0]?.at ?? null).toBe(null)
    expect(t.made.holding).toBe(null)
  })

  it('puts a tool, the loupe, a runner bud and the beetle back, with nothing done', () => {
    const t = rig(page()), start = t.made.state
    midDrag(t, t.where.can(), t.where.pot('tray', 2))
    midDrag(t, t.where.blotter(), t.where.pot('tray', 3))
    midDrag(t, t.where.loupe(), t.where.pot('tray', 0))
    midDrag(t, t.where.bud('shelf', 0), t.where.pot('tray', 4))
    midDrag(t, t.where.beetle(), t.where.pot('tray', 5))
    expect(t.made.state).toBe(start)
    expect(t.made.holding).toBe(null)
    const live = t.made.motion
    expect([live.can, live.blotter, live.loupe, live.beetle.at]).toEqual([null, null, null, null])
    expect(live.seeds).toHaveLength(0)
  })
})

describe('the ant, with the real cast', () => {
  const PINK_SHORT = pack({ colour: [1, 0], height: [0, 0], leaf: [1, 1], petals: [1, 1] })
  const ants = (extra: Plant[] = []) => {
    const base = late({ position: 'dry', visitor: visit({ who: 'ant', at: 'dry' }) })
    return rig({ ...base, plants: [...base.plants, ...extra] }, layoutOf(1180, 820), CAST)
  }
  const highest = (t: ReturnType<typeof rig>, seconds: number, id: (ids: number[]) => number | undefined) => {
    let top = Infinity
    t.play(seconds, () => {
      const one = id([...t.made.motion.plants.keys()])
      const at = one === undefined ? null : t.made.motion.plants.get(one)?.at
      if (at) top = Math.min(top, at.y)
    })
    return top
  }

  it('lifts a plant that is too high over its head, and is set down by the weight: the plant goes up with its arms and comes back to its pot', () => {
    const t = ants(), start = t.made.state
    t.drag(t.where.pot('shelf', 0), t.where.visitor())
    expect(highest(t, 8, () => 1)).toBeLessThan(t.layout.offer.y - 30 * t.layout.k)
    t.play(2)
    expect(t.made.state).toBe(start)
    expect(t.made.motion.plants.has(1)).toBe(false)
  })

  it('lifts the plant it asked for over its head in its ending: what goes up is the plant it has just been given', () => {
    const t = ants([{ id: 9, pairs: PINK_SHORT, dry: true, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }])
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    expect(t.made.state.finished).toBe(true)
    expect(highest(t, 10, (ids) => ids.find((id) => id < 0))).toBeLessThan(t.layout.offer.y - 30 * t.layout.k)
    t.play(3)
    expect([...t.made.motion.plants.keys()].filter((id) => id < 0)).toHaveLength(0)
  })
})

describe('the showing of the blotter', () => {
  it('leaves the soil as it was until the beetle has pressed the blotter on it, and the blotter is drawn there', () => {
    const t = rig({ ...freshLab(null, SEED), position: 'dry', kit: kitAt('spots'), shown: ['sort', 'hidden', 'runner'], waiting: visit({ at: 'dry', who: 'ant' }) })
    t.tap(t.where.waiting())
    for (let frame = 0; frame < 600 && !t.made.sceneRunning; frame++) t.play(FRAME)
    expect(t.made.sceneRunning).toBe(true)
    const pot = t.made.state.dry.findIndex((dry) => dry)
    // Saved dry from the scene's start; drawn dark until the blot.
    expect(pot).toBeGreaterThanOrEqual(0)
    expect(t.made.view().dry[pot]).toBe(false)
    expect(t.made.motion.blotter).toBe(null)
    let pressed = 0
    t.play(1.5, () => { if (t.made.motion.blotter) pressed++ })
    expect(pressed).toBeGreaterThan(10)
    expect(t.made.view().dry[pot]).toBe(true)
    expect(t.has(GAME_VOICES.blot)).toBe(true)
    t.play(0.3)
    expect(t.made.motion.blotter).toBe(null)
    // A touch midway leaves it dry and the blotter back.
    const cut = rig({ ...freshLab(null, SEED), position: 'dry', kit: kitAt('spots'), shown: ['sort', 'hidden', 'runner'], waiting: visit({ at: 'dry', who: 'ant' }) })
    cut.tap(cut.where.waiting())
    for (let frame = 0; frame < 600 && !cut.made.sceneRunning; frame++) cut.play(FRAME)
    cut.play(0.4)
    cut.tap(cut.where.paper)
    cut.play(FRAME)
    expect(cut.made.view().dry[cut.made.state.dry.findIndex((dry) => dry)]).toBe(true)
    expect(cut.made.motion.blotter).toBe(null)
  })
})

describe('a sound falls with the motion it belongs to', () => {
  it('the beetle’s click comes as it rights itself and its huff as it climbs out, not when it is touched', () => {
    const t = rig(late())
    t.tap(t.where.beetle())
    expect(t.has(CELL_VOICES['beetle-poke'])).toBe(true)
    t.play(1.2)
    // Still on its back, pedalling.
    expect(t.made.motion.beetle.flip).toBeGreaterThan(0.9)
    expect(t.has(GAME_VOICES.click)).toBe(false)
    t.play(0.6)
    expect(t.has(GAME_VOICES.click)).toBe(true)
    expect(t.made.motion.beetle.flip).toBeLessThan(0.5)
    t.play(2)
    t.drag(t.where.beetle(), t.where.pot('tray', 3))
    t.play(2.2)
    expect(t.made.motion.beetle.sink).toBeGreaterThan(0.9)
    expect(t.has(GAME_VOICES.huff)).toBe(false)
    t.play(0.8)
    expect(t.has(GAME_VOICES.huff)).toBe(true)
    expect(t.made.motion.beetle.sink).toBeLessThan(0.5)
  })

  it('a touch that cuts a scene short does not play what the scene still had to sound', () => {
    const base = late()
    const t = rig({ ...base, plants: [...base.plants, { id: 9, pairs: pack({ colour: [1, 1], height: [0, 0], leaf: [1, 1], petals: [1, 1] }), dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }], position: 'colour', visitor: visit({ at: 'colour' }) })
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    expect(t.made.sceneRunning).toBe(true)
    t.play(0.4)
    const before = t.heard.length
    t.made.gesture({ type: 'press', at: t.where.paper })
    t.drain()
    // The ending had the snail's use of the plant and more still to come: none of it sounds at the cut.
    expect(t.heard.slice(before)).toHaveLength(0)
    expect(t.has(VISITOR_VOICES.snail.use)).toBe(false)
    expect(t.made.state.finished).toBe(true)
  })

  it('dust let go on a packet is drawn sliding off it', () => {
    const t = rig(late())
    t.drag(t.where.flower(1), t.where.packet(0))
    expect(t.has(CELL_VOICES['seed-dust'])).toBe(true)
    t.made.step(FRAME)
    const packet = t.where.packet(0)
    expect(t.made.motion.motes.filter((mote) => Math.abs(mote.x - packet.x) < 60 * t.layout.k).length).toBeGreaterThan(8)
  })
})

describe('the one who waits', () => {
  it('a second tap while the one just let in is still on its way is not a second visitor: the one at the edge answers it', () => {
    const t = rig(freshLab(null, SEED))
    const first = t.made.state.waiting.who, position = t.made.state.position
    t.tap(t.where.waiting())
    const after = t.made.state
    expect(after.visitor?.who).toBe(first)
    t.play(0.15)
    const before = t.heard.length
    t.tap(t.where.waiting())
    expect(t.made.state).toBe(after)
    expect(t.made.state.position).toBe(position)
    expect(t.heard.slice(before)).toContain(VISITOR_VOICES[after.waiting.who].poked)
    // Once the first is at its place the child may let the next one in.
    t.play(4)
    t.tap(t.where.waiting())
    expect(t.made.state.visitor?.who).toBe(after.waiting.who)
  })

  it('answers a touch while the one before is walking off, and comes in after it', () => {
    const t = rig(late())
    t.tap(t.where.waiting())
    const state = t.made.state
    t.play(0.3)
    const before = t.heard.length
    t.tap(t.where.waiting())
    expect(t.made.state).toBe(state)
    expect(t.heard.slice(before)).toContain(VISITOR_VOICES[state.visitor!.who].poked)
  })
})

describe('what a visitor brings', () => {
  const walkIn = (t: ReturnType<typeof rig>, each: () => void) => { t.tap(t.where.waiting()); t.play(0.7, each) }

  it('a packet is carried in over the visitor’s back and set down in its place', () => {
    const t = rig({ ...freshLab(null, SEED), position: 'short', waiting: visit({ at: 'short', who: 'snail' }) })
    expect(t.made.state.kit).not.toContain('short')
    const xs: number[] = []
    walkIn(t, () => { const at = t.made.motion.packets.get('short')?.at; if (at) xs.push(at.x) })
    expect(t.made.state.kit).toContain('short')
    // It moves with the visitor, from the edge inwards, smaller than it is in its place.
    expect(xs.length).toBeGreaterThan(30)
    expect(xs[xs.length - 1]).toBeLessThan(xs[0])
    expect(t.made.motion.packets.get('short')!.at!.z).toBeLessThan(0.7)
    expect(xs[0]).toBeGreaterThan(t.layout.visitor.x)
    t.play(4)
    expect(t.made.motion.packets.get('short')?.at).toBeUndefined()
    expect(t.has(GAME_VOICES.setDown)).toBe(true)
    expect(t.made.view().packets).toContain('short')
  })

  it('the runner bud is carried in as a sprig, and the buds spring on every plant when it is set down', () => {
    const t = rig({ ...freshLab(null, SEED), position: 'runner', kit: kitAt('colour-short'), shown: ['runner', 'sort', 'hidden'], waiting: visit({ at: 'runner', count: 2, who: 'bee' }) })
    let sprig = 0
    walkIn(t, () => { if (t.made.motion.tow) sprig++ })
    expect(sprig).toBeGreaterThan(30)
    expect(t.made.view().buds).toBe(false)
    let sprung = 0
    t.play(4, () => { sprung = Math.max(sprung, t.made.motion.buds.size) })
    expect(t.made.view().buds).toBe(true)
    expect(sprung).toBeGreaterThanOrEqual(2)
    expect(t.made.motion.tow).toBe(null)
  })

  it('the can and the blotter are carried in and set down in their places', () => {
    const t = rig({ ...freshLab(null, SEED), position: 'dry', kit: kitAt('spots'), shown: ['sort', 'hidden', 'runner', 'water'], waiting: visit({ at: 'dry', who: 'ant' }) })
    let carried = 0
    walkIn(t, () => { if (t.made.motion.can && t.made.motion.blotter) carried++ })
    expect(carried).toBeGreaterThan(30)
    expect(t.made.view().tools).toBe(false)
    t.play(4)
    expect(t.made.view().tools).toBe(true)
    expect(t.made.motion.can).toBe(null)
    expect(t.made.motion.blotter).toBe(null)
  })
})

describe('the neat way to compare', () => {
  it('for the hidden factor, holds the loupe over a young that shows what neither parent shows, not over whichever came first', () => {
    const short = (id: number, slot: number): Plant => ({ id, pairs: PACKETS.short, dry: false, row: 'shelf', slot, from: { how: 'packet', packet: 'short' } })
    let seen = 0
    for (let seed = 1; seed < 40 && seen < 3; seed++) {
      const t = rig({ ...freshLab(null, seed), kit: kitAt('colour-short'), plants: [short(1, 0), short(2, 1)], shown: ['sort'] })
      t.drag(t.where.flower(1), t.where.flower(2))
      for (let frame = 0; frame < 1200 && !t.made.sceneRunning; frame++) t.play(FRAME)
      const young = t.made.state.plants.filter((plant) => plant.row === 'tray').sort((a, b) => a.id - b.id)
      const low = young.filter((plant) => lookOf(plant.pairs, false).joints !== lookOf(PACKETS.short, false).joints)
      // Only a brood whose first young does not tell it shows the difference.
      if (!t.made.sceneRunning || low.length === 0 || low[0].id === young[0].id) continue
      seen++
      t.play(5.3)
      const beads = t.made.motion.beads, flower = t.where.flower(low[0].id)
      expect(beads).toMatchObject({ x: flower.x, y: flower.y })
    }
    expect(seen).toBe(3)
  })

  it('has each young hop to its group as the beetle comes past its pot, not before the beetle is at the tray', () => {
    const t = rig(freshLab(null, SEED))
    t.drag(t.where.flower(1), t.where.flower(2))
    for (let frame = 0; frame < 1200 && !t.made.sceneRunning; frame++) t.play(FRAME)
    expect(t.made.sceneRunning).toBe(true)
    // Saved in its groups from the first frame; drawn where it stood until the beetle gets there.
    const first = new Map<number, number>()
    let early = 0
    t.play(1.3, () => {
      for (const [id, plant] of t.made.motion.plants) {
        if (!plant.at) continue
        if (!first.has(id)) first.set(id, plant.at.x)
        if (plant.at.x !== first.get(id)) early++
      }
    })
    expect(first.size).toBeGreaterThan(0)
    expect(early).toBe(0)
    let moved = 0
    t.play(3.4, () => { for (const [id, plant] of t.made.motion.plants) if (plant.at && first.has(id) && plant.at.x !== first.get(id)) moved++ })
    expect(moved).toBeGreaterThan(0)
    // The loupe is on its way from where it lies by the beetle: it rolls there, and its note shows once it is over the plant.
    const rolling = t.made.motion.loupe!
    expect(rolling).not.toBe(null)
    expect(t.made.motion.beads).toBe(null)
    t.play(0.6)
    expect(t.made.motion.beads).not.toBe(null)
    expect(Math.hypot(t.made.motion.loupe!.x - rolling.x, t.made.motion.loupe!.y - rolling.y)).toBeGreaterThan(20)
    // Then it is over one of the young with the beetle beside it.
    const loupe = t.made.motion.loupe!, feet = t.made.fx.beetleAt()
    expect(loupe).not.toBe(null)
    expect(Math.abs(feet.x - loupe.x)).toBeLessThan(t.layout.tray[0].cell.w)
    t.play(5)
    expect([...t.made.motion.plants.values()].filter((plant) => plant.at)).toHaveLength(0)
  })
})

describe('a visitor that has its plant', () => {
  it('has no sketch up, so the beetle carried to it bows and straightens nothing', () => {
    const t = rig(late({ finished: true, visitor: visit({ given: [5] }) }))
    t.drag(t.where.beetle(), t.where.visitor())
    expect(t.has(CELL_VOICES['beetle-offer'])).toBe(true)
    let swung = 0
    t.play(4, () => { swung = Math.max(swung, Math.abs(t.made.motion.wish.shake)) })
    expect(swung).toBe(0)
    expect(t.has(GAME_VOICES.unroll)).toBe(false)
  })
})

describe('the plant that hides the ladybird', () => {
  it('is walked into by the beetle: the plant rocks and the beetle starts', () => {
    const SPOTTED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [0, 0] })
    for (const at of ['whole-plant', 'colour'] as const) {
      const base = late({ visitor: visit({ who: 'ladybird', at }) })
      const t = rig({ ...base, plants: [...base.plants, { id: 9, pairs: SPOTTED, dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }] })
      const start = t.made.state
      t.drag(t.where.pot('tray', 0), t.where.visitor())
      let rocked = 0, near = Infinity
      t.play(3, () => {
        for (const [id, plant] of t.made.motion.plants) if (id === 9 || id < 0) rocked = Math.max(rocked, Math.abs(plant.bend))
        near = Math.min(near, Math.abs(t.made.fx.beetleAt().x - t.layout.offer.x))
      })
      expect(near, at).toBeLessThan(80 * t.layout.k)
      expect(rocked, at).toBeGreaterThan(0.05)
      t.play(9)
      // Asked for all four traits, a tall plant misses and goes back; asked for a colour alone, the ladybird keeps it. The beetle walks into it either way.
      if (at === 'whole-plant') expect(t.made.state).toBe(start)
      else expect(t.made.state.finished).toBe(true)
      expect(t.made.fx.beetleOut).toBe(false)
    }
  })
})

describe('a pod and a rest', () => {
  it('a pod that has not burst when the game goes to rest waits for a touch when the child is back, as one found on load does', () => {
    const t = rig({ ...freshLab(null, SEED), shown: ['sort', 'hidden'] })
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(0.4)
    t.made.putAway()
    t.play(6)
    expect(t.made.state.pods).toHaveLength(1)
    t.tap(t.where.pod(2))
    expect(t.made.state.pods).toHaveLength(0)
  })

  it('a pod that was wetted, offered or landing in a pot when the game goes to rest does not burst by itself afterwards, and a seed being balanced is back in its packet', () => {
    const base = () => { const state = late(); return rig(state) }
    const cases: ((t: ReturnType<typeof rig>) => void)[] = [
      (t) => t.drag(t.where.can(), t.where.pod(2)),
      (t) => t.drag(t.where.pod(2), t.where.visitor()),
      (t) => t.drag(t.where.pod(2), t.where.pot('shelf', 4)),
    ]
    for (const act of cases) {
      const t = base()
      t.drag(t.where.flower(1), t.where.flower(2))
      t.play(0.4)
      act(t)
      t.made.step(FRAME)
      t.made.putAway()
      t.play(6)
      expect(t.made.state.pods).toHaveLength(1)
      expect(t.made.motion.pods[0].at ?? null).toBe(null)
      expect(t.made.motion.pods[0].swell).toBeLessThan(1.4)
    }
    const t = base(), start = t.made.state
    t.drag(t.where.packet(0), t.where.visitor())
    t.made.step(FRAME)
    t.made.putAway()
    t.play(6)
    expect(t.made.state).toBe(start)
    expect(t.made.motion.seeds).toHaveLength(0)
  })
})

describe('a visitor that has what it asked for', () => {
  it('still answers a plant offered to it, likes first and then the first miss, and hands it back: it keeps no more', () => {
    const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
    const base = late({ finished: true, visitor: visit({ at: 'colour-short', given: [5] }) })
    const t = rig({ ...base, plants: [...base.plants, { id: 9, pairs: RED, dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }] })
    const start = t.made.state
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    expect(t.made.sceneRunning).toBe(true)
    expect(t.has(CELL_VOICES['plant-offer'])).toBe(true)
    t.play(4)
    // The snail likes the red and misses the height: both are played, and nothing is kept.
    expect(t.has(VISITOR_VOICES.snail.miss)).toBe(true)
    expect(t.made.state).toBe(start)
    expect(t.made.motion.plants.has(9)).toBe(false)
  })

  it('the snail shows its miss after the hat too: a white plant of one joint is worn, and then its colour misses', () => {
    const WHITE_SHORT = pack({ colour: [0, 0], height: [0, 0], leaf: [1, 1], petals: [1, 1] })
    const base = late({ position: 'colour', visitor: visit({ at: 'colour' }) })
    const t = rig({ ...base, plants: [...base.plants, { id: 9, pairs: WHITE_SHORT, dry: true, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }] })
    const start = t.made.state
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    t.play(6)
    expect(t.has(VISITOR_VOICES.snail.miss)).toBe(true)
    expect(t.made.state).toBe(start)
  })

  it('the beetle finishes its guard before it carries a load out or draws a sketch', () => {
    const t = rig(full({ visitor: visit(), kit: kitAt('whole-plant'), shown: ['sort', 'hidden', 'runner', 'water'] }))
    t.drag(t.where.flower(1), t.where.flower(2))
    // The brood lands and six plants are on their way to the beetle; a plant is set in its corner at once.
    for (let frame = 0; frame < 600 && t.made.fx.laden === 0; frame++) t.play(FRAME)
    expect(t.made.fx.laden).toBe(6)
    t.drag(t.where.pot('shelf', 0), t.where.corner())
    expect(t.made.sceneRunning).toBe(true)
    let up = 0, leftEarly = false
    t.play(4.5, () => {
      up = Math.max(up, t.made.motion.fence?.up ?? 0)
      if (t.made.motion.beetle.turned) leftEarly = true
    })
    expect(up).toBe(1)
    expect(leftEarly).toBe(false)
    expect(t.made.fx.laden).toBe(6)
    t.play(12)
    expect(t.made.fx.laden).toBe(0)
    expect(t.made.fx.beetleOut).toBe(false)
  })
})

describe('the snail’s ending, with the real cast', () => {
  it('eats the edge of one leaf: four bites, each a little more out of the plant in front of it', () => {
    const RED_SHORT = pack({ colour: [1, 1], height: [0, 0], leaf: [1, 1], petals: [1, 1] })
    const base = late({ position: 'colour', visitor: visit({ at: 'colour' }) })
    const t = rig({ ...base, plants: [...base.plants, { id: 9, pairs: RED_SHORT, dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }] }, layoutOf(1180, 820), CAST)
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    expect(t.made.state.finished).toBe(true)
    const sizes = new Set<number>()
    let last = 0, shrank = false
    t.play(9, () => {
      const bite = t.made.motion.nibble
      if (!bite) return
      sizes.add(Math.round(bite.r * 100))
      if (bite.r < last) shrank = true
      last = bite.r
      // It is out of the leaf on the visitor's side, above the soil.
      expect(bite.x).toBeGreaterThan(t.layout.offer.x)
      expect(bite.y).toBeLessThan(t.layout.offer.y)
    })
    expect(sizes.size).toBe(4)
    expect(shrank).toBe(false)
    t.play(2)
    // The plant is beside the snail now; the view draws the same bite on it there.
    expect(t.made.motion.nibble).toBe(null)
    expect(t.made.view().visitor).toMatchObject({ kind: 'snail', settled: true })
  })
})

describe('the grown-up’s corner', () => {
  it('answers nothing and ends no scene: a press there is not part of the play', () => {
    const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
    const base = late({ position: 'colour', visitor: visit({ at: 'colour' }) })
    const t = rig({ ...base, plants: [...base.plants, { id: 9, pairs: RED, dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }] })
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    t.play(0.5)
    expect(t.made.sceneRunning).toBe(true)
    const before = t.heard.length
    t.tap({ x: t.layout.w - 20, y: 20 })
    expect(t.made.sceneRunning).toBe(true)
    expect(t.heard.slice(before)).toHaveLength(0)
  })

  it('has nothing of the page’s furniture drawn in it: the pressed frond ends short of it', () => {
    for (const [w, h] of [[1180, 820], [1024, 768]] as const) {
      const layout = layoutOf(w, h)
      // The frond starts three tenths of the way along the wish's place and is under a hundred of the tools' own units long.
      const reach = layout.wish.x + layout.wish.w * 0.3 + 100 * Math.max(layout.k, 1)
      expect(reach, `${w}`).toBeLessThan(w - 72)
    }
  })
})

describe('a plant of the border', () => {
  const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
  const bordered = () => { const base = late(); return { ...base, plants: [...base.plants, { id: 9, pairs: RED, dry: false, row: 'border' as const, slot: 0, from: { how: 'packet' as const, packet: 'pink' as const } }] } }
  const spot = (t: ReturnType<typeof rig>) => { const place = t.layout.border[0]; return { x: place.x, y: place.ground - 20 * t.layout.small } }

  it('answers a poke with its note and a puff of dust, and the can by sagging and shaking itself dry', () => {
    const t = rig(bordered()), start = t.made.state
    t.tap(spot(t))
    expect(t.has(CELL_VOICES['plant-poke'])).toBe(true)
    t.made.step(FRAME)
    expect(t.made.motion.motes.length).toBeGreaterThan(8)
    t.play(2)
    t.drag(t.where.can(), spot(t))
    expect(t.has(CELL_VOICES['plant-wet'])).toBe(true)
    let swung = 0
    t.play(1, () => { swung = Math.max(swung, Math.abs(t.made.motion.plants.get(9)?.bend ?? 0)) })
    expect(swung).toBeGreaterThan(0.05)
    expect(t.made.state).toBe(start)
  })

  it('that holds a pod is carried with its pod by a drag, and its pod bursts at a tap', () => {
    const base = bordered()
    const podded = { ...base, pods: [{ on: 9, dust: 1, seeds: [RED, RED, RED, RED, RED, RED] }] }
    const t = rig(podded)
    t.drag(spot(t), t.where.pot('tray', 2))
    expect(t.made.state.plants.find((plant) => plant.id === 9)).toMatchObject({ row: 'tray', slot: 2 })
    expect(t.made.state.pods).toHaveLength(1)
    const again = rig(podded)
    again.tap(spot(again))
    expect(again.made.state.pods).toHaveLength(0)
  })
})

describe('the secrets are heard as well as seen', () => {
  it('the hat has its own sound as the plant goes on, and the guard its knocks and a sound for every strip of its fence', () => {
    const low: Plant = { id: 9, pairs: pack({ colour: [0, 0], height: [0, 0], leaf: [1, 1], petals: [1, 1] }), dry: true, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }
    const base = late()
    const hat = rig({ ...base, plants: [...base.plants, low] })
    hat.drag(hat.where.pot('tray', 0), hat.where.visitor())
    hat.play(3)
    expect(hat.has(GAME_VOICES.hat)).toBe(true)
    const guard = rig(late())
    guard.drag(guard.where.pot('shelf', 0), guard.where.corner())
    let rocked = 0
    guard.play(1.2, () => { rocked = Math.max(rocked, Math.abs(guard.made.motion.plants.get(1)?.bend ?? 0)) })
    expect(rocked).toBeGreaterThan(0.03)
    guard.play(2)
    expect(guard.heard.filter((voice) => voice === GAME_VOICES.tape)).toHaveLength(5)
  })
})

describe('what the finger holds when a brood lands', () => {
  /** A page with a tray plant in bloom (id 9) and a pod on the second packet plant that is about to burst. */
  const about = (extra: Partial<LabState> = {}) => {
    const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
    const base = late()
    return rig({ ...base, plants: [...base.plants, { id: 9, pairs: RED, dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }], ...extra })
  }
  const holdWhileItBursts = (t: ReturnType<typeof rig>, from: { x: number; y: number }, to: { x: number; y: number }) => {
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(0.3)
    t.drag(from, to, () => t.play(3))
    t.play(0.5)
  }

  it('dust lifted from a flower of the tray still sets a pod, though its plant has hopped to the border meanwhile', () => {
    const t = about()
    holdWhileItBursts(t, t.where.flower(9), t.where.flower(1))
    expect(t.made.state.plants.find((plant) => plant.id === 9)!.row).toBe('border')
    expect(t.made.state.pods).toEqual([expect.objectContaining({ on: 1, dust: 9 })])
    expect(t.has(TOY_VOICES_SNEEZE)).toBe(false)
  })

  it('a runner drawn from a plant of the tray still roots, though its plant has hopped to the border meanwhile', () => {
    const t = about()
    holdWhileItBursts(t, t.where.bud('tray', 0), t.where.pot('shelf', 4))
    expect(t.made.state.plants.find((plant) => plant.id === 9)!.row).toBe('border')
    expect(t.made.state.plants.find((plant) => plant.row === 'shelf' && plant.slot === 4)).toMatchObject({ from: { how: 'runner', of: 9 } })
  })

  it('a plant of the border in the hand is not the one a brood sends off the page: the next oldest goes', () => {
    const base = late()
    const plants = [...base.plants]
    for (let slot = 0; slot < 18; slot++) plants.push(packet(30 + slot, 'border', slot))
    for (let slot = 0; slot < 6; slot++) plants.push(packet(50 + slot, 'tray', slot))
    const t = rig({ ...base, plants, nextId: 60 })
    const oldest = { x: t.layout.border[0].x, y: t.layout.border[0].ground - 20 * t.layout.small }
    holdWhileItBursts(t, oldest, t.where.pot('shelf', 4))
    // Six left the page, and the one in the hand is not among them: it stands where it was set down.
    expect(t.made.state.sketched.length).toBeGreaterThanOrEqual(6)
    expect(t.made.state.plants.find((plant) => plant.id === 30)).toMatchObject({ row: 'shelf', slot: 4 })
    expect(t.made.state.plants.some((plant) => plant.id === 31)).toBe(false)
  })
})

describe('what lands later than the finger\'s own move never takes a plant out of the hand', () => {
  it('a plant of the tray in the hand when a brood lands stays in the hand, and stands where it is then set down', () => {
    const base = late()
    const t = rig({ ...base, plants: [...base.plants, packet(9, 'tray', 0)] })
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(0.3)
    let held = false
    t.drag(t.where.pot('tray', 0), t.where.pot('shelf', 4), () => { t.play(3); held = t.made.fx.heldAt(9) !== null })
    t.play(0.5)
    // The brood took its pot, and it was in the hand all the while.
    expect(t.made.state.plants.filter((plant) => plant.row === 'tray')).toHaveLength(6)
    expect(held).toBe(true)
    expect(t.made.state.plants.find((plant) => plant.id === 9)).toMatchObject({ row: 'shelf', slot: 4 })
    expect(t.has(CELL_VOICES['plant-carry'])).toBe(true)
  })

  /** Every pot taken and the border full: a seed a visitor drops takes the first pot of the tray, and one plant leaves the page. */
  const full = () => {
    const base = late()
    const plants: Plant[] = []
    for (let slot = 0; slot < 6; slot++) plants.push(packet(40 + slot, 'shelf', slot), packet(50 + slot, 'tray', slot))
    for (let slot = 0; slot < 18; slot++) plants.push(packet(60 + slot, 'border', slot))
    return rig({ ...base, plants, nextId: 80 })
  }

  it('the plant a dropped seed shoulders out of its pot stays in the hand that holds it', () => {
    const t = full()
    t.drag(t.where.packet(0), t.where.visitor())
    let held = false
    t.drag(t.where.pot('tray', 0), t.where.pot('shelf', 4), () => { t.play(4); held = t.made.fx.heldAt(50) !== null })
    t.play(0.5)
    expect(t.made.state.plants.find((plant) => plant.id === 80)).toMatchObject({ row: 'tray', slot: 0 })
    expect(held).toBe(true)
    expect(t.made.state.plants.find((plant) => plant.id === 50)).toMatchObject({ row: 'shelf', slot: 4 })
  })

  it('the oldest plant of the border in the hand is not the one a dropped seed sends off the page', () => {
    const t = full()
    t.drag(t.where.packet(0), t.where.visitor())
    const oldest = { x: t.layout.border[0].x, y: t.layout.border[0].ground - 20 * t.layout.small }
    t.drag(oldest, t.where.pot('shelf', 4), () => t.play(4))
    t.play(0.5)
    expect(t.made.state.plants.some((plant) => plant.id === 80)).toBe(true)
    expect(t.made.state.plants.find((plant) => plant.id === 60)).toMatchObject({ row: 'shelf', slot: 4 })
    expect(t.made.state.plants.some((plant) => plant.id === 61)).toBe(false)
  })
})

describe('a visitor that has what it asked for', () => {
  it('is found sitting by its plant on a page that opens so, gets up to answer a plant offered to it, and sits down again', () => {
    const base = late({ finished: true, visitor: visit({ given: [5] }) })
    const t = rig({ ...base, plants: [...base.plants, packet(9, 'tray', 0)] })
    t.play(FRAME)
    expect(t.made.motion.visitor!.sat).toBe(1)
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    let least = 1
    t.play(1.2, () => { least = Math.min(least, t.made.motion.visitor!.sat!) })
    expect(least).toBe(0)
    for (let frame = 0; frame < 1500 && (t.made.sceneRunning || t.made.motion.visitor!.sat! < 1); frame++) t.play(FRAME)
    expect(t.made.motion.visitor!.sat).toBe(1)
  })

  it('stands while it is being served and through its ending, and sits down when the ending is over', () => {
    const base = late({ position: 'colour', visitor: visit({ at: 'colour' }) })
    const low: Plant = { id: 9, pairs: pack({ colour: [1, 1], height: [0, 0], leaf: [1, 1], petals: [1, 1] }), dry: true, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }
    const t = rig({ ...base, plants: [...base.plants, low] })
    t.play(FRAME)
    expect(t.made.motion.visitor!.sat).toBe(0)
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    let sat = 0, during = 0
    for (let frame = 0; frame < 1500 && t.made.sceneRunning; frame++) { t.play(FRAME); if (t.made.sceneRunning) during = Math.max(during, t.made.motion.visitor!.sat ?? 0) }
    expect(t.made.state.finished).toBe(true)
    expect(during).toBe(0)
    // Over half a second it goes down: lower, leant back, its eyes up.
    t.play(SIT_SECONDS / 2)
    sat = t.made.motion.visitor!.sat!
    expect(sat).toBeGreaterThan(0)
    expect(sat).toBeLessThan(1)
    t.play(SIT_SECONDS)
    expect(t.made.motion.visitor!.sat).toBe(1)
    expect(t.made.motion.visitor!.pose.lean).toBeGreaterThan(0.05)
  })
})

describe('the paper things, touched', () => {
  const pointOn = (at: { x: number; y: number; turn: number; u: number }, along: number) => ({ x: at.x + Math.cos(at.turn) * along * at.u, y: at.y + Math.sin(at.turn) * along * at.u })

  it('the pressed leaf and the frond rustle about their tape and come to rest: no bare-paper tick, and nothing of the page changes', () => {
    for (const [id, at] of [['leaf', leafAt], ['frond', frondAt]] as const) {
      const t = rig(late())
      const start = t.made.state
      t.play(FRAME)
      expect(t.made.motion.things.size).toBe(0)
      t.tap(pointOn(at(t.layout), 40))
      expect(t.has(GAME_VOICES.rustle)).toBe(true)
      expect(t.has(TOY_VOICES.paper)).toBe(false)
      let most = 0
      t.play(0.5, () => { most = Math.max(most, Math.abs(t.made.motion.things.get(id) ?? 0)) })
      expect(most).toBeGreaterThan(0.03)
      expect(most).toBeLessThanOrEqual(SWING_TURN)
      t.play(4)
      expect(t.made.motion.things.size).toBe(0)
      expect(t.made.state).toBe(start)
    }
  })

  it('the strip of tape lies flat under a finger and lifts again, and the beetle, whose tape it is, looks round', () => {
    const t = rig(late())
    // A moment at which the tape has lifted and the beetle is not at it.
    for (let frame = 0; frame < 3000 && (t.made.motion.tapeDown > 0.05 || t.made.fx.beetleDoing !== null); frame++) t.play(FRAME)
    const start = t.made.state, end = stubbornTape(t.layout).end
    expect(t.made.motion.tapeDown).toBeLessThan(0.2)
    t.tap(end)
    expect(t.has(GAME_VOICES.tape)).toBe(true)
    expect(t.has(TOY_VOICES.paper)).toBe(false)
    let flattest = 0, noticed = false
    t.play(0.4, () => { flattest = Math.max(flattest, t.made.motion.tapeDown); noticed ||= t.made.fx.beetleDoing === 'notice' })
    expect(flattest).toBe(1)
    expect(noticed).toBe(true)
    // It lifts again by itself, as slowly as it does after the beetle has pressed it.
    let lifted = false
    t.play(4, () => { lifted ||= t.made.motion.tapeDown < 0.2 })
    expect(lifted).toBe(true)
    expect(t.made.state).toBe(start)
  })

  it('a kept drawing swings on its card and is heard in the voice of the animal drawn on it; a margin sketch is gone over by the pencil again', () => {
    const mid = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
    const t = rig(late({ kept: [{ who: 'bee', look: 3 }, { who: 'moth', look: 12 }], sketched: [1, 5, 9] }))
    const start = t.made.state
    t.play(FRAME)
    // The newest kept drawing is in the first place: the moth.
    t.tap(mid(t.layout.kept[0]))
    expect(t.heard).toContain(VISITOR_VOICES.moth.poked)
    let swung = 0
    t.play(0.4, () => { swung = Math.max(swung, Math.abs(t.made.motion.things.get('kept0') ?? 0)) })
    expect(swung).toBeGreaterThan(0.03)
    t.tap(mid(t.layout.kept[1]))
    expect(t.heard).toContain(VISITOR_VOICES.bee.poked)
    // An empty place is bare paper.
    t.tap(mid(t.layout.kept[2]))
    expect(t.has(TOY_VOICES.paper)).toBe(true)
    t.tap(mid(t.layout.sketches[1]))
    expect(t.has(GAME_VOICES.pencil)).toBe(true)
    const drawn: number[] = []
    t.play(RESKETCH_SECONDS + 0.1, () => { if (t.made.motion.resketch) { expect(t.made.motion.resketch.index).toBe(1); drawn.push(t.made.motion.resketch.drawn) } })
    expect(drawn.length).toBeGreaterThan(10)
    expect(drawn[0]).toBeLessThan(0.1)
    expect(drawn[drawn.length - 1]).toBeGreaterThan(0.9)
    expect(t.made.motion.resketch).toBe(null)
    t.play(4)
    expect(t.made.state).toBe(start)
  })
})

describe('the worm, touched on the head where it stands up above its pot', () => {
  it('answers as itself: a squeak, gone in a blink and up again for a look each way; not the paper behind it', () => {
    const t = rig(freshLab(null, SEED))
    // When the page opens it comes up in a pot near the middle.
    let head = null as ReturnType<typeof t.made.fx.wormHead>
    for (let frame = 0; frame < 400 && !head; frame++) { t.play(FRAME); head = t.made.fx.wormHead() }
    expect(head).not.toBe(null)
    const place = [...t.layout.shelf, ...t.layout.tray][head!.pot]
    expect(Math.abs(place.x - t.layout.w * 0.4)).toBeLessThan(t.layout.w * 0.2)
    // Its head is above the soil: outside the pot's own handle.
    expect(head!.y).toBeLessThan(place.soil)
    t.play(0.6)
    head = t.made.fx.wormHead()!
    const start = t.made.state
    t.tap(head)
    expect(t.has(GAME_VOICES.squeak)).toBe(true)
    expect(t.has(TOY_VOICES.paper)).toBe(false)
    t.play(FRAME)
    expect(t.made.fx.wormHead()).toBe(null)
    let up = false
    t.play(1.2, () => { up ||= t.made.fx.wormHead() !== null })
    expect(up).toBe(true)
    expect(t.made.state).toBe(start)
  })
})

describe('dust or water let go on the visitor', () => {
  it('dust lies gold on its back and it shrugs in its own voice; the beetle does not sneeze, and nothing of the page changes', () => {
    const t = rig(late())
    const start = t.made.state
    t.drag(t.where.flower(1), t.where.visitor())
    expect(t.has(VISITOR_VOICES.snail.shrug)).toBe(true)
    expect(t.has(TOY_VOICES_SNEEZE)).toBe(false)
    t.play(FRAME)
    expect(t.made.motion.visitor!.gold).toBeGreaterThan(0.9)
    expect(t.made.holding).toBe(null)
    t.play(DUST_LIES + 0.5)
    expect(t.made.motion.visitor!.gold).toBe(0)
    expect(t.made.state).toBe(start)
  })

  it('water stands on it in drops while it starts as when it is poked, and then wears off by itself: less of it with every moment, none after a few seconds', () => {
    const t = rig(late())
    const start = t.made.state
    t.drag(t.where.can(), t.where.visitor())
    expect(t.has(VISITOR_VOICES.snail.poked)).toBe(true)
    t.play(FRAME)
    expect(t.made.motion.visitor!.wet).toBeGreaterThan(0.9)
    // Nothing is done to it: it only wears off, steadily, and is gone.
    const seen: number[] = []
    t.play(WATER_STANDS + 0.3, () => seen.push(t.made.motion.visitor!.wet ?? 0))
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeLessThanOrEqual(seen[i - 1])
    expect(seen[Math.floor(seen.length / 2)]).toBeGreaterThan(0)
    expect(seen[Math.floor(seen.length / 2)]).toBeLessThan(0.7)
    expect(t.made.motion.visitor!.wet).toBe(0)
    expect(WATER_STANDS).toBeLessThanOrEqual(5)
    // It is gone on a page that is put away and found again, too: nothing of it is kept.
    expect(t.made.state).toBe(start)
  })

  it('the blotter takes the water up sooner: at once', () => {
    const t = rig(late())
    const start = t.made.state
    t.drag(t.where.can(), t.where.visitor())
    t.play(0.2)
    expect(t.made.motion.visitor!.wet).toBeGreaterThan(0.5)
    t.drag(t.where.blotter(), t.where.visitor())
    expect(t.has(GAME_VOICES.blot)).toBe(true)
    t.play(FRAME)
    expect(t.made.motion.visitor!.wet).toBe(0)
    expect(t.made.state).toBe(start)
  })
})

describe('the faces', () => {
  it('every animal looks at the finger while it is on the page, and back as it was a moment after it has lifted', () => {
    const t = rig(late())
    t.play(1)
    const plain = { visitor: t.made.motion.visitor!.pose.look, waiting: t.made.motion.waiting!.pose.look }
    // A finger high up on the left of the page, held on bare paper.
    const finger = { x: 60, y: 30 }
    t.drag(finger, { x: 64, y: 34 }, () => {
      t.play(0.8)
      expect(t.made.motion.visitor!.pose.look).toBeGreaterThan(plain.visitor + 0.2)
      expect(t.made.motion.waiting!.pose.look).toBeGreaterThan(plain.waiting + 0.1)
    })
    t.play(FINGER_SEEN + 1.2)
    expect(Math.abs(t.made.motion.visitor!.pose.look - plain.visitor)).toBeLessThan(0.3)
  })

  it('a visitor’s brow lifts at what it likes and lowers at the trait that misses', () => {
    const base = late({ position: 'colour', visitor: visit({ at: 'colour' }) })
    const t = rig({ ...base, plants: [...base.plants, packet(9, 'tray', 0)] })
    // A pink plant offered to a snail that asks for red: colour is the miss.
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    let lowest = 0
    for (let frame = 0; frame < 900 && t.made.sceneRunning; frame++) { t.play(FRAME); lowest = Math.min(lowest, t.made.motion.visitor!.pose.mood ?? 0) }
    expect(lowest).toBeLessThan(-0.5)
    t.play(2)
    expect(Math.abs(t.made.motion.visitor!.pose.mood ?? 0)).toBeLessThan(0.05)
  })
})

describe('the snail eating in its ending', () => {
  it('is heard as it is seen: one crunch as each of its four bites comes out of the leaf, and none before the first', () => {
    const base = late({ position: 'colour', visitor: visit({ at: 'colour' }) })
    const low: Plant = { id: 9, pairs: pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] }), dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }
    const t = rig({ ...base, plants: [...base.plants, low] })
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    expect(t.made.state.finished).toBe(true)
    const crunches = () => t.heard.filter((voice) => voice === VISITOR_VOICES.snail.use).length
    const sizes: number[] = []
    let ahead = 0
    for (let frame = 0; frame < 1500 && t.made.sceneRunning; frame++) {
      t.play(FRAME)
      const bite = t.made.motion.nibble?.r ?? 0
      if (bite > 0 && !sizes.includes(bite)) sizes.push(bite)
      // No crunch is heard more than a frame before its bite shows.
      ahead = Math.max(ahead, crunches() - sizes.length)
    }
    expect(sizes).toHaveLength(4)
    expect(crunches()).toBe(4)
    expect(ahead).toBeLessThanOrEqual(1)
  })
})

describe('the can and the blotter, tapped', () => {
  it('ring and rock where they stand for a moment, with no stroke under them, and are still again: nothing of the page changes', () => {
    for (const kind of ['can', 'blotter'] as const) {
      const t = rig(late())
      const start = t.made.state
      t.play(FRAME)
      expect(t.made.motion[kind]).toBe(null)
      t.tap(t.where[kind]())
      expect(t.has(GAME_VOICES.clink)).toBe(true)
      let most = 0
      t.play(RING_SECONDS - 0.05, () => {
        const tool = t.made.motion[kind]
        expect(tool).toMatchObject({ rest: true, ...toolHome(t.layout, kind) })
        most = Math.max(most, Math.abs(tool!.tip))
      })
      expect(most).toBeGreaterThan(0.05)
      t.play(0.2)
      expect(t.made.motion[kind]).toBe(null)
      expect(t.made.state).toBe(start)
    }
  })

  it('taken up while it rocks, is in the hand at once', () => {
    const t = rig(late())
    t.tap(t.where.can())
    t.play(0.1)
    t.drag(t.where.can(), t.where.paper, () => { t.play(FRAME); expect(t.made.motion.can).toMatchObject({ tip: expect.any(Number) }); expect(t.made.motion.can!.rest).toBeUndefined() })
  })
})

describe('a pod whose plant leaves the page', () => {
  const ticks = (t: ReturnType<typeof rig>) => {
    const all = Array.from({ length: 6 }, (_, index) => JSON.stringify(seedTick(index)))
    return t.heard.filter((voice) => all.includes(JSON.stringify(voice))).length
  }

  it('pops as the plant goes, seen and heard, when a visitor keeps the plant: its brood lands in the tray with its ticks', () => {
    const base = late({ position: 'colour', visitor: visit({ at: 'colour' }) })
    const red = pack({ colour: [1, 1], height: [0, 0], leaf: [1, 1], petals: [1, 1] })
    const wanted: Plant = { id: 9, pairs: red, dry: true, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }
    const t = rig({ ...base, plants: [...base.plants, wanted], pods: [{ on: 9, dust: 1, seeds: [red, red, red, red, red, red] }] })
    // The pod waits on its plant, as one found on a page that opens so.
    t.made.putAway()
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    let popped = false
    for (let frame = 0; frame < 1500 && (t.made.sceneRunning || t.made.state.pods.length > 0); frame++) { t.play(FRAME); popped ||= t.made.motion.puffs.some((puff) => puff.kind === 'pop') }
    t.play(2)
    expect(t.made.state.plants.some((plant) => plant.id === 9)).toBe(false)
    expect(t.made.state.plants.filter((plant) => plant.row === 'tray')).toHaveLength(6)
    expect(popped).toBe(true)
    expect(t.heard.filter((voice) => voice === CELL_VOICES['pod-poke'])).toHaveLength(1)
    expect(ticks(t)).toBe(6)
  })

  it('pops a beat after the pod whose brood sent it off, and the brood that landed first goes on to the border with a tick for each seed', () => {
    const base = late()
    const plants: Plant[] = [...base.plants]
    for (let slot = 0; slot < 6; slot++) plants.push(packet(50 + slot, 'tray', slot))
    for (let slot = 0; slot < 18; slot++) plants.push(packet(60 + slot, 'border', slot))
    const seeds = Array.from({ length: 6 }, () => PACKETS.pink)
    const t = rig({ ...base, plants, nextId: 80, pods: [{ on: 2, dust: 1, seeds }, { on: 60, dust: 1, seeds }] })
    t.made.putAway()
    t.tap(t.where.pod(2))
    let pops = 0
    t.play(4, () => { pops = Math.max(pops, t.made.motion.puffs.filter((puff) => puff.kind === 'pop').length) })
    // The child's six are in the border, the other pod's six in the tray, and twelve plants have left the page.
    expect(t.made.state.pods).toHaveLength(0)
    expect(t.made.state.plants.filter((plant) => plant.row === 'tray').map((plant) => plant.id)).toEqual([86, 87, 88, 89, 90, 91])
    expect(t.made.state.plants.filter((plant) => plant.row === 'border' && plant.id >= 80 && plant.id < 86)).toHaveLength(6)
    expect(pops).toBe(2)
    expect(t.heard.filter((voice) => voice === CELL_VOICES['pod-poke'])).toHaveLength(2)
    expect(ticks(t)).toBe(12)
  })
})

describe('the strip of tape that will not lie flat', () => {
  it('is where the beetle is when the page opens: it has walked to the strip and its forefeet are on the free end, at every size of a page that lies flat', () => {
    for (const [w, h] of [[1180, 820], [1024, 768], [1366, 1024]] as const) {
      const layout = layoutOf(w, h), t = rig(freshLab(null, SEED), layout)
      t.play(FRAME)
      const home = beetleHome(layout), end = stubbornTape(layout).end, feet = t.made.fx.beetleAt()
      expect(Math.abs(feet.x - BEETLE_REACH * home.s - end.x)).toBeLessThan(3 * home.s)
      expect(Math.abs(feet.y - end.y)).toBeLessThan(6 * home.s)
      // It is not at home, and it is home again when it has done.
      expect(home.x - feet.x).toBeGreaterThan(40 * home.s)
      t.play(3)
      expect(t.made.fx.beetleAt().x).toBeCloseTo(home.x, 0)
    }
  })

  it('on an upright page, where its corner is far from the strip, the beetle does not cross the page for it', () => {
    const layout = layoutOf(820, 1180), t = rig(freshLab(null, SEED), layout)
    t.play(FRAME)
    expect(Math.abs(t.made.fx.beetleAt().x - beetleHome(layout).x)).toBeLessThan(30 * beetleHome(layout).s)
  })

  it('lies flat under the beetle when the page opens, halfway through its smoothing, and lifts again when the beetle steps back', () => {
    const t = rig(freshLab(null, SEED))
    t.play(FRAME)
    // Halfway: the beetle is leaning on it, and the tape is flat under it.
    expect(t.made.motion.beetle.pose.lean).toBeLessThan(-0.18)
    expect(t.made.motion.tapeDown).toBe(1)
    t.play(3)
    expect(t.made.motion.tapeDown).toBe(0)
  })

  it('lies flat again each time the beetle leans in and presses it', () => {
    const t = rig(freshLab(null, SEED))
    t.play(3)
    let flattest = 0, pressed = false
    // Left alone the beetle comes back to its tape among its other small doings.
    for (let i = 0; i < 4000 && !pressed; i++) {
      t.play(FRAME)
      flattest = Math.max(flattest, t.made.motion.tapeDown)
      pressed = flattest === 1
    }
    expect(pressed).toBe(true)
  })
})

describe('a seed a visitor balances', () => {
  it('sits on the visitor and moves with it as it sways, and is dropped from where it sat', () => {
    const t = rig(late())
    t.drag(t.where.packet(0), t.where.visitor())
    const xs = new Set<number>()
    t.play(stubCast().snail.answer.balance.seconds * 0.6, () => {
      const seed = t.made.motion.seeds[0], snail = t.made.motion.visitor
      if (!seed || !snail) return
      xs.add(Math.round(seed.x * 10))
      // It stays over the snail's front, above its feet, however the snail leans and steps.
      expect(seed.x).toBeLessThan(snail.x)
      expect(seed.y).toBeLessThan(snail.y - 30 * t.layout.k)
    })
    expect(xs.size).toBeGreaterThan(5)
  })
})

describe('the loupe’s note says how the plant came to be', () => {
  it('is headed for a packet plant, a runner’s copy and a plant from seed each in its own way', () => {
    const t = rig(late())
    const over = (id: number) => {
      const flower = t.where.flower(id)
      let from: string | undefined
      t.drag(t.where.loupe(), { x: flower.x, y: flower.y + 46 * t.layout.k }, () => { from = t.made.motion.beads?.from })
      t.play(1)
      return from
    }
    expect(over(1)).toBe('packet')
    // A copy of the first packet plant, rooted in the tray.
    t.drag(t.where.bud('shelf', 0), t.where.pot('tray', 3))
    t.play(3)
    const copy = t.made.state.plants.find((plant) => plant.from.how === 'runner')!
    expect(over(copy.id)).toBe('runner')
    // A young from seed.
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(6)
    const young = t.made.state.plants.find((plant) => plant.from.how === 'seed')!
    t.play(9)
    expect(over(young.id)).toBe('seed')
  })
})

describe('the neat way to compare, cut short or put away', () => {
  const started = () => {
    const t = rig(freshLab(null, SEED))
    t.drag(t.where.flower(1), t.where.flower(2))
    for (let frame = 0; frame < 1200 && !t.made.sceneRunning; frame++) t.play(FRAME)
    return t
  }

  it('a touch ends it at once: no hop is heard afterwards with nothing hopping', () => {
    const t = started()
    expect(t.made.sceneRunning).toBe(true)
    t.play(0.5)
    t.made.gesture({ type: 'press', at: t.where.paper })
    t.made.gesture({ type: 'pressEnd', at: t.where.paper })
    t.drain()
    const before = t.heard.length
    t.play(6)
    expect(t.heard.slice(before)).toHaveLength(0)
  })

  it('a brood put away before it has grown is not shown: the next such brood is', () => {
    const t = rig(freshLab(null, SEED))
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(2.2)
    t.made.putAway()
    t.play(12)
    expect(t.made.state.shown).toEqual([])
    expect(t.made.sceneRunning).toBe(false)
  })
})

describe('put away in the middle of a scene', () => {
  it('finds the scene finished afterwards, whether the game was reloaded or only rested: it does not carry on', () => {
    const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
    const base = late({ position: 'colour', visitor: visit({ at: 'colour' }) })
    const t = rig({ ...base, plants: [...base.plants, { id: 9, pairs: RED, dry: false, row: 'tray', slot: 0, from: { how: 'packet', packet: 'pink' } }] })
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    t.play(0.6)
    expect(t.made.sceneRunning).toBe(true)
    const saved = t.made.state
    t.made.putAway()
    expect(t.made.sceneRunning).toBe(false)
    expect(t.made.state).toBe(saved)
    const before = t.heard.length
    t.play(8)
    // The snail sits with its plant, and nothing of the ending is played after the rest.
    expect(t.heard.slice(before)).not.toContain(VISITOR_VOICES.snail.use)
    expect(t.made.view().visitor).toMatchObject({ settled: true })
  })
})

describe('the loupe over a pod', () => {
  it('shows the beads of the first of its six seeds, on a pod that waits', () => {
    const base = late()
    const WHITE = pack({ colour: [0, 0], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
    const t = rig({ ...base, pods: [{ on: 2, dust: 1, seeds: [WHITE, PACKETS.pink, PACKETS.pink, PACKETS.pink, PACKETS.pink, PACKETS.pink] }] })
    const pod = t.where.pod(2)
    let beads: ReturnType<typeof rig>['made']['motion']['beads'] = null
    t.drag(t.where.loupe(), { x: pod.x, y: pod.y + 46 * t.layout.k }, () => { beads = t.made.motion.beads })
    expect(beads).not.toBe(null)
    expect(beads!.from).toBe('seed')
    // The first seed is white: both its colour beads are the white factor.
    expect(beads!.pairs.find((pair) => pair.trait === 'colour')).toMatchObject({ fromOnto: 0, fromDust: 0 })
    expect(t.made.state.pods).toHaveLength(1)
  })
})

describe('a pod carried for a long while', () => {
  it('still lands whole in the pot it is carried to and bursts there, though the breath it would have held alone is long spent', () => {
    const t = rig({ ...freshLab(null, SEED), shown: ['sort', 'hidden'] })
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(0.3)
    const soil = { x: t.layout.shelf[4].x, y: t.layout.shelf[4].soil }
    // Held in the finger for two seconds before it is let go on the pot.
    t.drag(t.where.pod(2), t.where.pot('shelf', 4), () => t.play(2))
    t.made.step(FRAME)
    expect(t.made.state.pods).toHaveLength(1)
    expect(Math.abs(t.made.motion.pods[0].at!.x - soil.x)).toBeLessThan(1)
    for (let frame = 0; frame < 30 && t.made.motion.seeds.length === 0; frame++) t.play(FRAME)
    const first = t.made.motion.seeds[0], pod = t.where.pod(2)
    expect(Math.hypot(first.x - soil.x, first.y - soil.y)).toBeLessThan(Math.hypot(first.x - pod.x, first.y - pod.y))
    expect(t.has(CELL_VOICES['pod-poke'])).toBe(false)
  })
})

describe('after a rest', () => {
  it('nothing is heard of a move that was not made: a pod that was offered waits on its plant in silence', () => {
    const t = rig(late())
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(0.4)
    t.drag(t.where.pod(2), t.where.visitor())
    t.made.step(FRAME)
    t.drain()
    t.made.putAway()
    const before = t.heard.length
    t.play(6)
    expect(t.made.state.pods).toHaveLength(1)
    expect(t.heard.slice(before)).toHaveLength(0)
  })
})
