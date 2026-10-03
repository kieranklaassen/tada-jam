import { describe, expect, it } from 'vitest'
import { CROSSINGS, part } from './bridges.fixture'
import { FIRST_VISIT, LADDER } from './config'
import { KINDS, MAX_PARTS, SPEC, type Part } from './kit'
import { JUDGE } from './order'
import { RACK, TRACINGS, crossed, deserialize, edit, failedRun, freshSave, markShown, onNewest, pluckHat, sentHome, serialize, setTrolley, standing, swapTracing, trace, turnTo, unroll, type Save } from './save'
import { COLS, ROWS, canPin, site } from './sites'
import { STATE_VERSION } from './state'

const round = (state: Save, age: number | null = null) => deserialize(JSON.parse(JSON.stringify(serialize(state))), age)
const bridge = CROSSINGS['plank-gap']

describe('the saved state', () => {
  it('a first visit starts by age, with the first sheet on the board and its job vehicle waiting', () => {
    const young = freshSave(null), old = freshSave(12)
    expect(young.position).toBe(FIRST_VISIT[0].position)
    expect(old.position).toBe('first-triangle')
    expect(freshSave(9).position).toBe('plank-gap')
    expect(young.sheets).toHaveLength(1)
    expect(young.sheets[0]).toMatchObject({ site: 'plank-gap', variant: 0, bridge: [] })
    expect(young.waiting).toEqual(['post-van'])
    expect(young.next).toBeNull()
  })

  it('comes back exactly as it was left', () => {
    let state = edit(freshSave(null), bridge)
    state = trace(state)
    state = setTrolley(state, 3, { x: 12, under: true })
    state = failedRun(state, 'post-van', { part: 0, spot: [11.5, 6] })
    state = markShown(state, 'profile')
    expect(round(state)).toEqual(state)
    state = crossed(state, 'post-van')
    expect(round(state)).toEqual(state)
    state = sentHome(setTrolley(state, 2, { pin: [12, 6] }), 'post-van')
    expect(state.waiting).toEqual(['jelly-truck', 'post-van'])
    expect(round(state)).toEqual(state)
    state = unroll(state)
    expect(round(state)).toEqual(state)
    // A saved position wins over the age.
    expect(round(state, 12).position).toBe(state.position)
  })

  it('anything that is not this game\'s record gives a fresh state, and never throws', () => {
    for (const raw of [null, undefined, 7, 'x', [], {}, { v: STATE_VERSION + 1 }, { v: 'one' }, { v: STATE_VERSION, sheets: 'none' }, { v: STATE_VERSION, sheets: [null, 3, {}] }]) {
      expect(deserialize(raw, null)).toEqual(freshSave(null))
    }
  })

  it('repairs each field by itself and keeps the rest', () => {
    const good = JSON.parse(JSON.stringify(serialize(unroll(crossed(edit(freshSave(null), bridge), 'post-van'))))) as Record<string, unknown>
    const clean = deserialize(good)
    const damaged = (change: Record<string, unknown>) => deserialize({ ...good, ...change })
    expect(damaged({ on: 99 }).on).toBe(clean.sheets.length - 1)
    expect(damaged({ on: 99 }).sheets).toEqual(clean.sheets)
    expect(damaged({ tries: -4 }).tries).toBe(0)
    expect(damaged({ tries: 'many' }).sheets).toEqual(clean.sheets)
    expect(damaged({ waiting: 'tank' }).waiting).toEqual([site(clean.sheets[clean.on].site, clean.sheets[clean.on].variant).job])
    expect(damaged({ waiting: ['tank', 'post-van', 'post-van', 'giraffe-bus'] }).waiting).toEqual(['post-van'])
    expect(damaged({ shown: ['profile', 'cheat', 7] }).shown).toEqual(['profile'])
    expect(damaged({ laid: 'x' }).laid).toEqual({ 'plank-gap': 1, 'rock-prop': 1 })
    expect(damaged({ position: 'grade-4' }).position).toBe(LADDER[0])
    expect(damaged({ next: { site: 'nowhere' } }).next).toBeNull()
  })

  it('reads a stored bridge as a design the sheet allows, leaving out what could not have been laid', () => {
    const stored = (parts: unknown[]) => deserialize({ v: STATE_VERSION, position: 'plank-gap', finished: false, sheets: [{ site: 'plank-gap', variant: 0, bridge: parts }], on: 0 }).sheets[0].bridge
    expect(stored([[0, 10, 6, 14, 6, 1]])).toEqual(bridge)
    expect(stored([[0, 10, 6, 14, 6, 1, 2]])).toEqual([{ ...bridge[0], loose: 'b' }])
    // Too long, off the sheet, buried in the bank, doubled, no such kind, not whole numbers, a kind the kit does not hold.
    expect(stored([[0, 10, 6, 19, 6, 0], [0, 10, 6, 14, 40, 0], [0, 2, 2, 4, 2, 0], [0, 10, 6, 14, 6, 0], [0, 14, 6, 10, 6, 1], [9, 1, 1, 2, 2, 0], [0, 10.5, 6, 12, 6, 0], [1, 10, 6, 11, 5, 0], 'x', null])).toEqual([part('plank', 10, 6, 14, 6)])
    // More planks than the kit holds: the extra ones are left out.
    expect(stored([[0, 10, 6, 14, 6, 0], [0, 10, 7, 14, 7, 0], [0, 10, 8, 14, 8, 0], [0, 10, 9, 14, 9, 0]])).toHaveLength(site('plank-gap', 0).kit.plank)
  })

  it('a failed run of the job vehicle counts, another vehicle\'s does not, and the eighth judges the cycle badly', () => {
    let state = edit(freshSave(12), [])
    state = failedRun(state, 'jelly-truck', null)
    expect(state.tries).toBe(0)
    for (let i = 1; i < JUDGE.badly; i++) { state = failedRun(state, 'post-van', null); expect(state.finished).toBe(false) }
    state = failedRun(state, 'post-van', null)
    expect(state).toMatchObject({ finished: true, position: 'rock-prop', next: { site: 'rock-prop', variant: 0 } })
    // The unfinished sheet stays on the rack as built, and crossing it later does not judge the cycle again.
    const later = crossed(state, 'post-van')
    expect(later.position).toBe('rock-prop')
    expect(unroll(later).sheets.map((s) => s.site)).toEqual(['first-triangle', 'rock-prop'])
  })

  it('the next sheet is laid out at the judging, from the position as the judging left it', () => {
    let state = edit(freshSave(null), bridge)
    expect(state.next).toBeNull()
    state = crossed(state, 'post-van')
    expect(state).toMatchObject({ finished: true, position: 'rock-prop', next: { site: 'rock-prop', variant: 0 }, waiting: ['jelly-truck'] })
    // The other vehicle is the child's own choice: it moves nothing.
    expect(crossed(state, 'jelly-truck').position).toBe('rock-prop')
    expect(failedRun(state, 'jelly-truck', null).tries).toBe(state.tries)
    const begun = unroll(state)
    expect(begun).toMatchObject({ finished: false, next: null, on: 1, tries: 0, waiting: ['post-van'] })
    expect(begun.sheets[0].bridge).toEqual(bridge)
    expect(unroll(begun)).toBe(begun)
    // A mixed cycle leaves the position where it was, and the same position comes back in its next form.
    let mixed = begun
    for (let i = 0; i < JUDGE.well + 1; i++) mixed = failedRun(mixed, 'post-van', null)
    mixed = crossed(edit(mixed, CROSSINGS['rock-prop']), 'post-van')
    expect(mixed).toMatchObject({ position: 'rock-prop', next: { site: 'rock-prop', variant: 1 } })
  })

  it('an edit means nobody has crossed this bridge yet, and the ring stays until its place is changed', () => {
    const king = CROSSINGS['first-triangle']
    let state = edit(freshSave(12), king)
    state = failedRun(state, 'post-van', { part: 3, spot: [10.5, 5] })
    expect(state.sheets[0].ring).toEqual({ part: 3, spot: [10.5, 5] })
    // A change far from the ringed part keeps the ring.
    const far = edit(state, king.map((p, i) => (i === 1 ? { ...p, turned: false } : p)))
    expect(far.sheets[0].ring).toEqual({ part: 3, spot: [10.5, 5] })
    // A neighbour changed, or the part itself taken off, and it goes.
    expect(edit(state, king.filter((_, i) => i !== 2)).sheets[0].ring).toBeNull()
    expect(edit(state, king.filter((_, i) => i !== 3)).sheets[0].ring).toBeNull()
    // There is one ring at most: a later give moves it, and a run that fails with no part giving leaves it.
    expect(failedRun(state, 'post-van', { part: 0, spot: [11, 6] }).sheets[0].ring).toEqual({ part: 0, spot: [11, 6] })
    expect(failedRun(state, 'post-van', null).sheets[0].ring).toEqual({ part: 3, spot: [10.5, 5] })
    // Another vehicle's crossing leaves the ring; the job vehicle's fades it.
    expect(crossed(state, 'jelly-truck').sheets[0].ring).toEqual({ part: 3, spot: [10.5, 5] })
    const done = crossed(state, 'post-van')
    expect(done.sheets[0]).toMatchObject({ crossed: ['post-van'], ring: null })
    expect(edit(done, king.slice(0, 4)).sheets[0].crossed).toEqual([])
  })

  it('keeps two tracings, swaps one with the bridge, and turns to another sheet of the rack', () => {
    let state = edit(freshSave(null), bridge)
    state = trace(state)
    state = edit(state, [part('plank', 10, 6, 14, 6)])
    state = trace(trace(state))
    expect(state.sheets[0].tracings).toHaveLength(TRACINGS)
    const swapped = swapTracing(edit(state, []), 0)
    expect(swapped.sheets[0].bridge).toEqual([part('plank', 10, 6, 14, 6)])
    expect(swapped.sheets[0].tracings[0]).toEqual([])
    expect(swapTracing(state, 5)).toBe(state)
    const two = unroll(crossed(edit(freshSave(null), bridge), 'post-van'))
    expect(turnTo(two, 7)).toBe(two)
  })

  it('a sheet taken back from the rack is over: its runs never count, never move the position and never lay out a roll', () => {
    let state = unroll(crossed(edit(freshSave(null), bridge), 'post-van'))
    state = failedRun(state, 'post-van', null)
    expect(state).toMatchObject({ on: 1, tries: 1, waiting: ['post-van'], position: 'rock-prop', finished: false })
    // Back on the first sheet: its job vehicle has crossed the bridge as it stands, so it is parked on the far bank.
    let old = turnTo(state, 0)
    expect(onNewest(old)).toBe(false)
    expect(standing(old)).toEqual([])
    for (let i = 0; i < JUDGE.badly + 2; i++) old = failedRun(old, 'post-van', { part: 0, spot: [11, 6] })
    old = crossed(old, 'post-van')
    expect(old).toMatchObject({ tries: 1, waiting: ['post-van'], position: 'rock-prop', finished: false, next: null })
    // Sent home on this older sheet, it stands at the near bank again, and is found there on load: the entry holds it.
    const home = sentHome(old, 'post-van')
    expect(home).toMatchObject({ tries: 1, waiting: ['post-van'], position: 'rock-prop' })
    expect(standing(home)).toEqual(['post-van'])
    expect(standing(round(home))).toEqual(['post-van'])
    expect(sentHome(home, 'post-van')).toBe(home)
    // Across once more, it is parked on the far bank again.
    expect(standing(crossed(home, 'post-van'))).toEqual([])
    // Changed, nobody has crossed it as it stands, and its job vehicle is back at the near bank.
    expect(standing(edit(old, []))).toEqual(['post-van'])
    // The newest sheet kept its tries and its vehicles on the rack, and its cycle goes on.
    const back = turnTo(old, 1)
    expect(standing(back)).toEqual(['post-van'])
    expect(crossed(edit(back, CROSSINGS['rock-prop']), 'post-van')).toMatchObject({ finished: true, position: 'first-triangle', waiting: ['jelly-truck'] })
  })

  it('a vehicle sent home stands at the near bank again beside the other one, and a crossing takes it off the bank', () => {
    let state = crossed(edit(freshSave(null), bridge), 'post-van')
    expect(state.waiting).toEqual(['jelly-truck'])
    state = sentHome(state, 'post-van')
    expect(state.waiting).toEqual(['jelly-truck', 'post-van'])
    expect(state.sheets[0].home).toBe(true)
    expect(sentHome(state, 'post-van')).toBe(state)
    expect(sentHome(state, 'giraffe-bus')).toBe(state)
    state = crossed(state, 'jelly-truck')
    expect(state.waiting).toEqual(['post-van'])
    // The second crossing of the job vehicle judges nothing and brings no third vehicle.
    expect(crossed(state, 'post-van')).toMatchObject({ waiting: [], position: 'rock-prop' })
  })

  it('a hat stays on its part until it is plucked off or the part is taken off', () => {
    const stays = CROSSINGS['high-thread']
    let state = { ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'tall-bus' }] }
    state = crossed(edit(state, stays), 'giraffe-bus', [2, 3, 99])
    expect(state.sheets[0].hats).toEqual([2, 3])
    expect(round(state).sheets[0].hats).toEqual([2, 3])
    // Another part taken off: the hats stay on their own parts, at their new places in the list.
    expect(edit(state, stays.slice(1)).sheets[0].hats).toEqual([1, 2])
    expect(edit(state, stays.slice(0, 3)).sheets[0].hats).toEqual([2])
    expect(pluckHat(state, 2).sheets[0].hats).toEqual([3])
  })

  it('the rack holds the last six sheets, and the largest legal state is under half the 64 KB cap', () => {
    // The fullest design a sheet can hold: as many parts as a design may have, each as long in digits as a part can be.
    const full = (shift: number): Part[] => {
      const parts: Part[] = []
      for (let y = ROWS; y >= 0 && parts.length < MAX_PARTS; y--) for (let x = 10; x + 1 <= COLS && parts.length < MAX_PARTS; x++) parts.push({ kind: KINDS[(x + shift) % KINDS.length], a: [x, y], b: [x + 1, y], turned: true, loose: 'b' })
      return parts
    }
    expect(full(0)).toHaveLength(MAX_PARTS)
    let state = freshSave(12)
    for (let i = 0; i < RACK + 3; i++) {
      state = { ...state, next: { site: LADDER[LADDER.length - 1 - (i % 3)], variant: 2 }, finished: true }
      state = unroll(state)
    }
    expect(state.sheets).toHaveLength(RACK)
    state = { ...state, shown: ['profile', 'prop', 'triangle', 'row', 'tube', 'thread', 'wide-base', 'arch', 'one-change'], tries: JUDGE.badly, laid: Object.fromEntries(LADDER.map((id) => [id, 999999])), next: { site: 'mast-and-stay', variant: 2 } }
    state = { ...state, sheets: state.sheets.map((sheet) => ({ ...sheet, bridge: full(0), tracings: [full(1), full(2)], trolley: { weights: 6, at: { x: 12.5, under: true } }, crossed: ['post-van', 'jelly-truck', 'piano-mover', 'giraffe-bus', 'caterpillar-bus'], home: true, ring: { part: 47, spot: [12.123456789, 6.123456789] }, hats: Array.from({ length: MAX_PARTS }, (_, i) => i) })), waiting: ['piano-mover', 'caterpillar-bus'] }
    const bytes = new TextEncoder().encode(JSON.stringify(serialize(state))).length
    expect(bytes).toBeLessThan(32 * 1024)
    expect(bytes).toBeGreaterThan(8 * 1024)
    // The longest part of each kind still fits a stored part of the same shape.
    for (const kind of KINDS) expect(SPEC[kind].maxLength).toBeLessThan(10)
    expect(canPin(site('open-yard', 0), [COLS, ROWS])).toBe(true)
  })
})
