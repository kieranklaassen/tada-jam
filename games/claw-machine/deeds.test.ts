import { describe, expect, it } from 'vitest'
import { clawLands, clawSwingsInto, clawWaitsAbove, toyLetGo, type Deed, type Target } from './deeds'
import { GOBBLER } from './gobblers'
import { STACK_MOST } from './tray'
import { bellyOf, crewNow, homeOf, newWorld, startCycle, trayOf, type World } from './world'

/** A world at the step with every kind of toy: two colours, two kinds, two sizes, one of each, sorted three ways. */
const world = (seed = 11): World => ({ ...newWorld(null), position: 'three-ways', cycle: startCycle('three-ways', seed, false) })
const toysOf = (w: World, size: 'small' | 'big') => w.cycle.toys.map((toy, i) => ({ toy, i })).filter(({ toy }) => toy.size === size).map(({ i }) => i)
const placeOf = (w: World, toy: number) => { const where = w.cycle.where[toy]; if (where.at !== 'tray') throw new Error('not on the tray'); return where.place }
const barePlace = (w: World) => trayOf(w.cycle).findIndex((stack) => stack.length === 0)
const snapshot = (w: World) => JSON.stringify(w.cycle.where)

/** What a cell of the grid is called: the deed, and what about it the child would see and hear differently. */
function cell(deed: Deed): string {
  if (deed.type === 'grab') return deed.left > 0 ? 'grab-top' : 'grab'
  if (deed.type === 'click') return `click-level-${deed.level}-${deed.heavy ? 'big' : 'small'}`
  if (deed.type === 'gulp') return `gulp-${deed.chomps}`
  if (deed.type === 'spit' || deed.type === 'thrown-back' || deed.type === 'rim-slide' || deed.type === 'gate-roll') return `${deed.type}-${deed.heavy ? 'big' : 'small'}`
  return deed.type
}

describe('the object-by-action grid', () => {
  it('answers every one of its thirty cells, and no two alike', () => {
    const cells: string[] = []
    const objects: ((w: World) => Target)[] = [
      (w) => ({ on: 'place', place: placeOf(w, toysOf(w, 'small')[0]) }), // a toy on the tray
      (w) => ({ on: 'place', place: barePlace(w) }), // bare studs
      (w) => { // a stack of two
        const [a, b] = toysOf(w, 'small').slice(1)
        toyLetGo(w, a, { on: 'place', place: placeOf(w, b) })
        return { on: 'place', place: placeOf(w, b) }
      },
      (w) => ({ on: 'gobbler', slot: homeOf(w, toysOf(w, 'small')[3]) }), // a gobbler, with a toy it takes
      () => ({ on: 'ledge', which: 0 }),
      () => ({ on: 'rail-end', side: 1 }),
    ]
    for (const object of objects) {
      // Each cell is tried in a fresh world, so one deed never sets up the next.
      const act = (deed: (w: World, target: Target) => Deed) => { const w = world(); cells.push(cell(deed(w, object(w)))) }
      act((w, target) => clawLands(w, target))
      act((w, target) => toyLetGo(w, toysOf(w, 'small')[3], target))
      // A big toy; over a gobbler, the gobbler that takes it.
      act((w, target) => { const big = toysOf(w, 'big')[0]; return toyLetGo(w, big, target.on === 'gobbler' ? { on: 'gobbler', slot: homeOf(w, big) } : target) })
      act((w, target) => clawSwingsInto(w, target, 1, false))
      act((w, target) => clawWaitsAbove(w, target))
    }
    expect(cells.length).toBe(30)
    expect(new Set(cells).size, cells.join(' ')).toBe(30)
    // With no one waiting on the ledge (a cycle with one sort), the ledge answers by itself, in five more ways.
    const alone = (): World => ({ ...newWorld(null), finished: false, crates: [], position: 'two-sizes', cycle: startCycle('two-sizes', 3, false) })
    const ledge: Target = { on: 'ledge', which: 0 }
    const own = [
      cell(clawLands(alone(), ledge)),
      cell((() => { const w = alone(); return toyLetGo(w, toysOf(w, 'small')[0], ledge) })()),
      cell((() => { const w = alone(); return toyLetGo(w, toysOf(w, 'big')[0], ledge) })()),
      cell(clawSwingsInto(alone(), ledge, 1, false)),
      cell(clawWaitsAbove(alone(), ledge)),
    ]
    expect(own).toEqual(['gate-rattle', 'gate-roll-small', 'gate-roll-big', 'gate-comb', 'gate-creak'])
    expect(new Set([...cells, ...own]).size).toBe(35)
  })

  it('brings a toy let go on the empty ledge back onto the tray, like any other', () => {
    const w: World = { ...newWorld(null), finished: false, crates: [], position: 'two-colours', cycle: startCycle('two-colours', 3, false) }
    const deed = toyLetGo(w, 0, { on: 'ledge', which: 0 })
    expect(deed.type).toBe('gate-roll')
    expect(trayOf(w.cycle).flat().sort()).toEqual([0, 1, 2, 3])
  })

  it('gives the wrong use of a gobbler its own answers too', () => {
    const w = world()
    const toy = toysOf(w, 'small')[0], home = homeOf(w, toy), other = (home + 1) % crewNow(w).length
    const spat = toyLetGo(w, toy, { on: 'gobbler', slot: other })
    expect(spat.type).toBe('spit')
    expect(spat.type === 'spit' && spat.way).toBe(GOBBLER[crewNow(w)[other]].wrong)
    expect(clawSwingsInto(w, { on: 'gobbler', slot: other }, 1, true).type).toBe('snap-miss')
    expect(clawLands(w, { on: 'gobbler', slot: other })).toEqual({ type: 'lift-gobbler', gobbler: crewNow(w)[other], way: GOBBLER[crewNow(w)[other]].lifted })
  })
})

describe('an error is a consequence', () => {
  it('brings a wrong toy back onto free studs, whole, and leaves everything else where it was', () => {
    const w = world()
    const toy = 0, home = homeOf(w, toy), other = (home + 1) % crewNow(w).length
    const others = () => JSON.stringify(w.cycle.where.filter((_, i) => i !== toy))
    const before = others()
    const deed = toyLetGo(w, toy, { on: 'gobbler', slot: other })
    expect(deed.type).toBe('spit')
    expect(others()).toBe(before)
    const where = w.cycle.where[toy]
    expect(where.at).toBe('tray')
    expect(trayOf(w.cycle)[placeOf(w, toy)]).toEqual([toy])
    expect(bellyOf(w.cycle, other)).toEqual([])
    // The child changes one thing, the gobbler, and the same toy goes home.
    expect(toyLetGo(w, toy, { on: 'gobbler', slot: home }).type).toBe('gulp')
  })

  it('counts a first try into a gobbler that does not take the toy, whichever way the toy comes back', () => {
    for (const position of ['two-sizes', 'two-colours', 'two-kinds'] as const) {
      const w: World = { ...newWorld(null), finished: false, crates: [], position, cycle: startCycle(position, 4, false) }
      const home = homeOf(w, 0)
      const deed = toyLetGo(w, 0, { on: 'gobbler', slot: 1 - home })
      expect(deed.type).toBe('spit')
      expect(w.cycle.misses).toBe(1)
      toyLetGo(w, 0, { on: 'gobbler', slot: 1 - home })
      expect(w.cycle.misses).toBe(1)
    }
  })

  it('never loses a toy, whatever is done with it', () => {
    const w = world(23)
    let s = 99
    const next = (n: number) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % n }
    for (let i = 0; i < 400; i++) {
      const onTray = w.cycle.where.map((where, toy) => ({ where, toy })).filter(({ where }) => where.at === 'tray').map(({ toy }) => toy)
      if (onTray.length === 0 || w.finished) break
      const toy = onTray[next(onTray.length)]
      const targets: Target[] = [{ on: 'place', place: next(10) }, { on: 'gobbler', slot: next(crewNow(w).length) }, { on: 'ledge', which: 0 }, { on: 'rail-end', side: next(2) ? 1 : -1 }]
      const pick = next(6)
      if (pick < 4) toyLetGo(w, toy, targets[pick])
      else if (pick === 4) clawSwingsInto(w, targets[0], next(2) ? 1 : -1, false)
      else clawLands(w, targets[next(4)])
      const tray = trayOf(w.cycle)
      const standing = tray.flat(), swallowed = crewNow(w).flatMap((_, slot) => bellyOf(w.cycle, slot))
      expect([...standing, ...swallowed].sort((a, b) => a - b)).toEqual(w.cycle.toys.map((_, toy) => toy))
      for (const stack of tray) {
        expect(stack.length).toBeLessThanOrEqual(STACK_MOST)
        stack.forEach((one, level) => expect(w.cycle.where[one]).toEqual({ at: 'tray', place: tray.indexOf(stack), level }))
      }
    }
  })

  it('changes nothing when the claw only lands, waits or rings', () => {
    const w = world()
    const before = snapshot(w)
    clawLands(w, { on: 'place', place: placeOf(w, 0) })
    clawLands(w, { on: 'place', place: barePlace(w) })
    clawLands(w, { on: 'gobbler', slot: 0 })
    clawLands(w, { on: 'ledge', which: 0 })
    clawLands(w, { on: 'rail-end', side: -1 })
    clawWaitsAbove(w, { on: 'gobbler', slot: 1 })
    expect(snapshot(w)).toBe(before)
  })

  it('brings the next crew only when the tray is clear', () => {
    const w = world()
    expect(clawLands(w, { on: 'ledge', which: 0 }).type).toBe('bonk-waiter')
    w.cycle.toys.forEach((_, toy) => toyLetGo(w, toy, { on: 'gobbler', slot: homeOf(w, toy) }))
    expect(clawLands(w, { on: 'ledge', which: 0 }).type).toBe('next-crew')
  })
})
