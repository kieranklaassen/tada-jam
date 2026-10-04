import { describe, expect, it } from 'vitest'
import { deserializeLab, freshLab, serializeLab, type LabState, type Plant } from './lab'
import { kitAt, type Visit } from './order'
import { plantAt, plantById } from './page'
import { PACKETS, lookCode, lookOf, pack, type Pairs } from './plant'
import { FRAME, rig } from './rig'
import { CELL_VOICES, GAME_VOICES, VISITOR_VOICES } from './voices'

const SEED = 20261003
const RED = pack({ colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] })
const RED_SHORT = pack({ colour: [1, 1], height: [0, 0], leaf: [1, 1], petals: [1, 1] })
const visit = (over: Partial<Visit> = {}): Visit => ({ who: 'snail', at: 'colour', count: 1, big: false, given: [], pods: 0, ...over })
const plant = (id: number, pairs: Pairs, slot: number, dry = false): Plant => ({ id, pairs, dry, row: 'tray', slot, from: { how: 'packet', packet: 'pink' } })
/** A page with a snail on it that wants a red flower, a red plant (id 9) and a pink one in the tray. */
function served(over: Partial<LabState> = {}, extra: Plant[] = [plant(9, RED, 0)]): LabState {
  const base = freshLab(null, SEED)
  return { ...base, nextId: 20, plants: [...base.plants, ...extra], visitor: visit(), ...over }
}
const saved = (state: LabState) => deserializeLab(JSON.parse(JSON.stringify(serializeLab(state))), null, 1)

describe('the next visitor', () => {
  it('waits at the edge and never comes in by itself', () => {
    const t = rig(freshLab(null, SEED))
    t.play(60)
    expect(t.made.state).toEqual(freshLab(null, SEED))
    expect(t.made.view().visitor).toBe(null)
    expect(t.made.view().waiting).toMatchObject({ kind: freshLab(null, SEED).waiting.who })
  })

  it('comes in on the child’s touch: the page changes and is saved at once, and the walk is a view of it', () => {
    const t = rig(freshLab(null, SEED))
    const who = t.made.state.waiting.who
    t.tap(t.where.waiting())
    expect(t.made.state.visitor).toMatchObject({ who })
    expect(t.made.changed).toBe(2)
    expect(t.has(VISITOR_VOICES[who].arrive)).toBe(true)
    t.made.step(FRAME)
    expect(t.made.motion.visitor!.x).toBeGreaterThan(t.where.visitorSpot(who).x + 20)
    t.play(3)
    // It is at its place, give or take the small sway of whatever it does there by itself.
    expect(Math.abs(t.made.motion.visitor!.x - t.where.visitorSpot(who).x)).toBeLessThan(10)
    expect(t.made.view().visitor).toMatchObject({ kind: who, settled: false })
    // The one after it has come to the edge, and is another animal.
    const next = t.made.state.waiting.who
    expect(next).not.toBe(who)
    expect(Math.abs(t.made.motion.waiting!.x - t.where.waitingSpot(next).x)).toBeLessThan(10)
  })

  it('sends the one before it off first: with nothing, after a shrug, off the page', () => {
    const t = rig(served())
    t.tap(t.where.waiting())
    expect(t.has(VISITOR_VOICES.snail.shrug)).toBe(true)
    expect(t.made.state.kept).toEqual([])
    t.made.step(FRAME)
    expect(t.made.view().visitor).toMatchObject({ kind: 'snail', settled: true })
    t.play(4)
    expect(t.made.view().visitor!.kind).toBe(t.made.state.visitor!.who)
    expect(t.made.view().visitor!.kind).not.toBe('snail')
  })
})

describe('a plant carried to the visitor', () => {
  it('that misses is answered and goes back to its pot: the page is as it was', () => {
    const t = rig(served())
    const start = t.made.state
    t.drag(t.where.pot('shelf', 0), t.where.visitor())
    expect(t.made.state).toBe(start)
    expect(t.has(CELL_VOICES['plant-offer'])).toBe(true)
    expect(t.made.sceneRunning).toBe(true)
    t.made.step(FRAME)
    // It stands in front of the visitor while it is answered.
    expect(t.made.motion.plants.get(1)!.at).toMatchObject({ x: t.layout.offer.x, y: t.layout.offer.y })
    t.play(3)
    expect(t.has(VISITOR_VOICES.snail.miss)).toBe(true)
    expect(t.made.sceneRunning).toBe(false)
    t.play(2)
    expect(t.made.motion.plants.has(1)).toBe(false)
    expect(t.made.state).toBe(start)
    expect(t.made.changed).toBe(0)
  })

  it('is answered likes first, then the one miss', () => {
    // The snail's larger sketch: red, short, round, plain. A packet plant is round and plain, and pink and tall.
    const t = rig(served({ kit: kitAt('whole-plant'), visitor: visit({ big: true }), shown: ['runner', 'water'] }))
    const seen: string[] = []
    t.drag(t.where.pot('shelf', 0), t.where.visitor())
    t.play(6, () => { const doing = t.made.view() && (t.made as unknown as { onPage: { doing: string | null } }).onPage.doing; if (doing && seen[seen.length - 1] !== doing) seen.push(doing) })
    const answers = seen.filter((name) => name.startsWith('like') || name.startsWith('miss'))
    expect(answers).toEqual(['like-leaf', 'like-petals', 'miss-colour'])
  })

  it('that meets the wish is kept: the outcome is taken and saved as the ending starts', () => {
    const t = rig(served())
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    expect(t.made.state.finished).toBe(true)
    expect(t.made.state.visitor!.given).toEqual([lookCode(lookOf(RED, false))])
    expect(plantById(t.made.state, 9)).toBeUndefined()
    expect(t.made.changed).toBe(2)
    // Put away at this instant, in the middle of the ending, it is found finished.
    expect(saved(t.made.state)).toEqual(t.made.state)
    expect(t.made.sceneRunning).toBe(true)
    t.made.step(FRAME)
    // Until the visitor has taken it the plant still stands in front of it, and is not beside it yet.
    expect(t.made.view().visitor).toMatchObject({ settled: false, given: [] })
    expect([...t.made.motion.plants.values()].some((one) => one.at?.x === t.layout.offer.x)).toBe(true)
    t.play(6)
    expect(t.made.sceneRunning).toBe(false)
    expect(t.has(VISITOR_VOICES.snail.use)).toBe(true)
    expect(t.made.view().visitor).toMatchObject({ settled: true, given: [lookOf(RED, false)] })
  })

  it('gives way to any touch: the ending is over at once, with everything where it was going', () => {
    const t = rig(served())
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    t.play(0.5)
    t.tap(t.where.paper)
    expect(t.made.sceneRunning).toBe(false)
    t.made.step(FRAME)
    expect(t.made.view().visitor).toMatchObject({ settled: true, given: [lookOf(RED, false)] })
    expect(t.made.state.finished).toBe(true)
  })

  it('does not replay on load: a page found finished shows the visitor settled, and nothing plays', () => {
    const first = rig(served())
    first.drag(first.where.pot('tray', 0), first.where.visitor())
    const t = rig(saved(first.made.state))
    t.play(3)
    expect(t.made.sceneRunning).toBe(false)
    expect(t.heard).toEqual([])
    expect(t.made.view().visitor).toMatchObject({ kind: 'snail', settled: true, given: [lookOf(RED, false)] })
  })

  it('leaves the ending in place for as long as the child likes, and the next visitor waits', () => {
    const t = rig(served())
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    t.play(60)
    expect(t.made.state.visitor!.who).toBe('snail')
    expect(t.made.view().visitor!.settled).toBe(true)
    // The next touch on the one who waits retires this one to the top margin, with its plant.
    t.tap(t.where.waiting())
    expect(t.made.state.kept).toEqual([{ who: 'snail', look: lookCode(lookOf(RED, false)) }])
    t.made.step(FRAME)
    expect(t.made.view().kept).toEqual([])
    t.play(4)
    expect(t.made.view().kept).toEqual([{ kind: 'snail', look: lookOf(RED, false) }])
  })

  it('by a visitor that wants two alike is kept beside it, and the cycle goes on', () => {
    const t = rig(served({ position: 'runner', kit: kitAt('runner'), visitor: visit({ at: 'runner', count: 2 }), shown: ['runner'] }, [plant(9, RED_SHORT, 0), plant(10, RED_SHORT, 1)]))
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    expect(t.made.state.finished).toBe(false)
    t.play(4)
    expect(t.made.view().visitor).toMatchObject({ count: 2, settled: false, given: [lookOf(RED_SHORT, false)] })
    t.drag(t.where.pot('tray', 1), t.where.visitor())
    expect(t.made.state.finished).toBe(true)
  })

  it('goes back to its pot when nobody is there to answer it, or the visitor already has what it asked for', () => {
    const t = rig({ ...served(), visitor: null })
    const start = t.made.state
    t.drag(t.where.pot('tray', 0), t.where.visitor())
    expect(t.made.state).toBe(start)
    expect(t.made.sceneRunning).toBe(false)
  })
})

describe('the visitor’s larger sketch', () => {
  it('unrolls and rolls up at a touch, where the page holds more traits than the wish asks about', () => {
    const t = rig(served({ kit: kitAt('jagged') }))
    expect(t.made.view().visitor!.big).toEqual({ colour: 'red', joints: 2, leaf: 'round' })
    t.tap(t.where.wish())
    expect(t.made.state.visitor!.big).toBe(true)
    expect(t.has(GAME_VOICES.unroll)).toBe(true)
    t.play(1)
    expect(t.made.motion.wish.big).toBeGreaterThan(0.95)
    t.tap(t.where.wish())
    expect(t.made.state.visitor!.big).toBe(false)
  })

  it('is not there when the wish already asks about every trait on the page', () => {
    const t = rig(served())
    expect(t.made.view().visitor!.big).toBe(null)
    const start = t.made.state
    t.tap(t.where.wish())
    expect(t.made.state).toBe(start)
  })
})

describe('the secrets', () => {
  it('a one-joint plant offered to the snail is worn as a hat, every time, and set back', () => {
    for (let time = 0; time < 2; time++) {
      const t = rig(served({ kit: kitAt('dry'), visitor: visit({ at: 'colour-short', who: 'snail' }), shown: ['runner', 'water'] }, [plant(9, RED_SHORT, 0, true)]))
      const start = t.made.state
      const seen = new Set<string>()
      t.drag(t.where.pot('tray', 0), t.where.visitor())
      t.play(5, () => { const doing = (t.made as unknown as { onPage: { doing: string | null } }).onPage.doing; if (doing) seen.add(doing) })
      expect(seen.has('hat')).toBe(true)
      expect(t.made.state).toBe(start)
      t.play(2)
      expect(t.made.motion.plants.has(9)).toBe(false)
    }
  })

  it('a plant set in the beetle’s corner is fenced in and guarded, and then goes back: nothing changes', () => {
    const t = rig(freshLab(null, SEED))
    const start = t.made.state
    t.drag(t.where.pot('shelf', 0), t.where.corner())
    expect(t.made.sceneRunning).toBe(true)
    let fence = 0
    t.play(4, () => { fence = Math.max(fence, t.made.motion.fence?.up ?? 0) })
    expect(fence).toBe(1)
    t.play(3)
    expect(t.made.motion.fence).toBe(null)
    expect(t.made.motion.plants.has(1)).toBe(false)
    expect(t.made.state).toBe(start)
  })
})

describe('the showing of a new tool', () => {
  const arriving = (): LabState => {
    const base = freshLab(null, SEED)
    return { ...base, position: 'runner', kit: kitAt('colour-short'), waiting: visit({ at: 'runner', count: 2, who: 'bee' }) }
  }

  it('starts when the visitor that carried the tool in has set it down, and saves its outcome as it starts', () => {
    const t = rig(arriving())
    t.tap(t.where.waiting())
    expect(t.made.state.kit).toContain('runner')
    // Not set down yet: the buds are not on the page.
    expect(t.made.view().buds).toBe(false)
    let started = -1
    for (let frame = 0; frame < 600 && started < 0; frame++) { t.play(FRAME); if (t.made.sceneRunning) started = frame }
    expect(started).toBeGreaterThan(30)
    expect(t.made.view().buds).toBe(true)
    // Saved when the scene starts, as it stands at its end.
    expect(t.made.state.shown).toEqual(['runner'])
    const copy = t.made.state.plants.find((one) => one.from.how === 'runner')!
    expect(copy).toMatchObject({ pairs: PACKETS.pink, row: 'tray', slot: 0 })
    expect(saved(t.made.state)).toEqual(t.made.state)
    // The copy is on the page and has not drawn itself yet.
    expect(t.made.fx.inBloom(copy.id)).toBe(false)
    t.play(8)
    expect(t.made.sceneRunning).toBe(false)
    expect(t.made.fx.inBloom(copy.id)).toBe(true)
    expect(t.made.motion.beetle.at).toBe(null)
  })

  it('touched midway is found finished, and never plays again', () => {
    const t = rig(arriving())
    t.tap(t.where.waiting())
    for (let frame = 0; frame < 600 && !t.made.sceneRunning; frame++) t.play(FRAME)
    t.play(1)
    t.tap(t.where.paper)
    expect(t.made.sceneRunning).toBe(false)
    const copy = t.made.state.plants.find((one) => one.from.how === 'runner')!
    expect(t.made.fx.inBloom(copy.id)).toBe(true)
    t.play(20)
    expect(t.made.state.plants.filter((one) => one.from.how === 'runner')).toHaveLength(1)
    const again = rig(saved(t.made.state))
    again.play(20)
    expect(again.made.state.plants.filter((one) => one.from.how === 'runner')).toHaveLength(1)
  })

  it('waits while no pot stands free, and plays once one does', () => {
    const base = arriving()
    const full: Plant[] = []
    for (const row of ['shelf', 'tray'] as const) for (let slot = 0; slot < 6; slot++) full.push({ id: 30 + full.length, pairs: PACKETS.pink, dry: false, row, slot, from: { how: 'packet', packet: 'pink' } })
    const t = rig({ ...base, plants: full, nextId: 50 })
    t.tap(t.where.waiting())
    t.play(12)
    expect(t.made.state.shown).toEqual([])
    expect(t.made.state.plants).toHaveLength(12)
    // The child shoulders one out to the border: a pot of the shelf stands free.
    t.drag(t.where.pot('shelf', 0), t.where.pot('shelf', 1))
    t.play(6)
    expect(t.made.state.shown).toEqual(['runner'])
    expect(plantAt(t.made.state, 'shelf', 0)!.from.how).toBe('runner')
  })
})

describe('the neat way to compare', () => {
  it('plays once, after the child’s own first brood of more than one colour has grown, and leaves the tray in groups', () => {
    const t = rig(freshLab(null, SEED))
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(2)
    expect(t.made.state.shown).toEqual([])
    let started = false
    for (let frame = 0; frame < 900 && !started; frame++) { t.play(FRAME); started = t.made.sceneRunning }
    expect(started).toBe(true)
    expect(t.made.state.shown).toEqual(['sort'])
    expect(saved(t.made.state)).toEqual(t.made.state)
    const tray = t.made.state.plants.filter((one) => one.row === 'tray').sort((a, b) => a.slot - b.slot).map((one) => lookOf(one.pairs, one.dry).colour)
    expect(tray.filter((colour, at) => at === 0 || colour !== tray[at - 1]).length).toBe(new Set(tray).size)
    let noted = false
    t.play(9, () => { if (t.made.motion.beads) noted = true })
    expect(noted).toBe(true)
    expect(t.made.sceneRunning).toBe(false)
    expect(t.made.motion.loupe).toBe(null)
    // A second brood does not bring it back.
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(15)
    expect(t.made.state.shown).toEqual(['sort'])
  })

  it('does not interrupt a child who is busy: it waits until nothing is in the hand and nothing is in motion', () => {
    const t = rig(freshLab(null, SEED))
    t.drag(t.where.flower(1), t.where.flower(2))
    t.play(2.5)
    // A plant is picked up and held while the brood grows.
    const from = t.where.pot('shelf', 0)
    t.made.gesture({ type: 'press', at: from })
    t.made.gesture({ type: 'dragStart', from })
    t.play(8)
    expect(t.made.sceneRunning).toBe(false)
    expect(t.made.state.shown).toEqual([])
  })
})
