import { describe, expect, it } from 'vitest'
import { NIGHTS_CAP, STAMPS_MAX, TRAIL_COLS, TRAIL_MAX, TRAIL_ROWS, backToDusk, cardAmount, clickWick, deserializeCamp, fetchNeatWay, flipCard, freshCamp, gatherTrail, hoursOf, judge, layIn, layTrail, lightsOut, moveLantern, moveOn, planOf, reachDawn, rowOf, rubOut, serializeCamp, siteOf, stamp, turnDial, unfold, type CampState } from './camp'
import { LADDER } from './config'
import { load, runNight } from './night'
import { stampedStrip } from './ratio'
import { STATE_VERSION } from './state'
import { IDEAS, ROD_LENGTH, SITES } from './world'

const at = (position: string, variant = 0): CampState => deserializeCamp({ v: STATE_VERSION, position, variant })
const lay = (state: CampState, logs: number, oil = 0, water = 0): CampState => layIn(layIn(layIn(state, 'logs', logs).state, 'oil', oil).state, 'water', water).state
const dawn = (state: CampState): CampState => reachDawn(state).state
const stamps = (state: CampState, user: 'fire' | 'lantern' | 'kettle', times: number): CampState => { let next = state; for (let i = 0; i < times; i++) next = stamp(next, user); return next }
const reload = (state: CampState): CampState => deserializeCamp(JSON.parse(JSON.stringify(serializeCamp(state))))

describe('a first visit', () => {
  it('opens the first site at dusk with empty rods', () => {
    expect(freshCamp(null)).toEqual({ v: STATE_VERSION, position: 'meadow', finished: false, variant: 0, unfolded: 0, logs: 0, oil: 0, water: 0, fire: 0, lanterns: [], strips: { fire: [], lantern: [], kettle: [] }, cards: { fire: 'single', lantern: 'single', kettle: 'single' }, trail: [], phase: 'dusk', nights: 0, changed: false, last: 'none', pins: { fire: null, lantern: null, kettle: null }, shown: [] })
  })

  it('starts by age only as a default: nine and no age at the first position, eleven and over at the second', () => {
    expect(freshCamp(9).position).toBe('meadow')
    expect(freshCamp(10).position).toBe('meadow')
    expect(freshCamp(11).position).toBe('birchwood')
    expect(freshCamp(40).position).toBe('birchwood')
    expect(freshCamp(3).position).toBe('meadow')
    expect(deserializeCamp({ v: STATE_VERSION, position: 'tarn' }, 9).position).toBe('tarn')
  })
})

describe('reading a save', () => {
  it('gives a fresh camp for anything that is not this game\'s record', () => {
    for (const raw of [null, undefined, 7, 'camp', [], { v: STATE_VERSION + 1, position: 'tarn' }, { position: 'tarn' }]) expect(deserializeCamp(raw, null)).toEqual(freshCamp(null))
  })

  it('comes back exactly as it was saved', () => {
    let state = lay(at('summit'), 20, 5, 4)
    state = turnDial(state, 1)
    state = moveLantern(clickWick(state, 1), 0, 2)
    expect(state.lanterns).toEqual([{ pin: 2, wick: 0 }, { pin: 1, wick: 1 }])
    state = stamps(flipCard(stamps(unfold(state, 1), 'fire', 3), 'fire'), 'fire', 2)
    state = lightsOut(state, 'lantern').state
    state = layTrail(layTrail(state, 17), 40)
    state = dawn(state)
    expect(state.phase).toBe('morning')
    expect(state.pins.fire).toEqual({ num: 20, den: 3 })
    expect(state.last).toBe('short')
    expect(reload(state)).toEqual(state)
    expect(reload(reload(state))).toEqual(state)
  })

  it('repairs each field by itself and keeps the rest', () => {
    const saved = { ...serializeCamp(lay(at('ridge'), 24, 3, 3)), fire: 1 }
    const damaged = (part: Record<string, unknown>) => deserializeCamp({ ...saved, ...part })
    expect(damaged({ logs: 'many' })).toMatchObject({ logs: 0, oil: 3, water: 3, fire: 1 })
    expect(damaged({ fire: 99 })).toMatchObject({ logs: 24, fire: 0 })
    expect(damaged({ lanterns: 'none' }).lanterns).toEqual([{ pin: 0, wick: 0 }])
    expect(damaged({ lanterns: [{ pin: -4, wick: 7 }] }).lanterns).toEqual([{ pin: 0, wick: 0 }])
    expect(damaged({ unfolded: 12 }).unfolded).toBe(0)
    expect(damaged({ variant: -1 }).variant).toBe(0)
    expect(damaged({ strips: { fire: [{ card: 1, side: 'doubled' }, { card: 7, side: 'single' }, { card: 0, side: 'folded' }, 'x'], lantern: 999, kettle: 'x' } }).strips).toEqual({ fire: [{ card: 1, side: 'doubled' }], lantern: [], kettle: [] })
    expect(damaged({ cards: { fire: 'doubled', lantern: 'halved', kettle: 4 } }).cards, 'no halved side before the position that brings it').toEqual({ fire: 'doubled', lantern: 'single', kettle: 'single' })
    expect(damaged({ nights: 2, last: 'splendid', pins: { fire: { num: 5, den: 0 }, lantern: { num: 7, den: 2 }, kettle: { num: 99, den: 1 } } })).toMatchObject({ last: 'none', pins: { fire: null, lantern: { num: 7, den: 2 }, kettle: null } })
    expect(damaged({ nights: 0, last: 'close', pins: { fire: { num: 2, den: 1 } } })).toMatchObject({ last: 'none', pins: { fire: null } })
    expect(damaged({ trail: [5, 5, -1, 2.5, 'x', TRAIL_COLS * TRAIL_ROWS, 9] }).trail).toEqual([5, 9])
    expect(damaged({ nights: 400, phase: 'morning' })).toMatchObject({ nights: 0, phase: 'dusk' })
    expect(damaged({ shown: ['strip', 'strip', 'nonsense', 4, 'out-fire', 'span'] }).shown).toEqual(['strip', 'span', 'out-fire'])
    expect(damaged({ position: 'level-9' })).toMatchObject({ position: 'meadow', logs: 24, oil: 0, water: 0 })
    expect(damaged({ finished: true }).finished).toBe(false)
  })

  it('keeps a morning only over a night that was slid to dawn with the plan as it is', () => {
    const morning = serializeCamp(dawn(lay(at('meadow'), 18)))
    expect(deserializeCamp(morning).phase).toBe('morning')
    expect(deserializeCamp({ ...morning, changed: true }).phase).toBe('dusk')
    expect(deserializeCamp({ ...morning, nights: 0 }).phase).toBe('dusk')
  })

  it('cuts a plan that is over the sled back until it fits', () => {
    const over = deserializeCamp({ v: STATE_VERSION, position: 'ridge', logs: 60, oil: 12, water: 10 })
    expect(load(planOf(over))).toBeLessThanOrEqual(SITES.ridge[0].sled!)
  })

  it('keeps a strapped stock as the site gives it', () => {
    expect(deserializeCamp({ v: STATE_VERSION, position: 'saddle', logs: 3, oil: 0 })).toMatchObject({ logs: 30, oil: 5 })
  })
})

describe('the size of a save', () => {
  it('stays far under half the 64 KB cap at its largest', () => {
    const longest = [...LADDER].sort((a, b) => b.length - a.length)[0]
    const largest: CampState = {
      v: STATE_VERSION, position: longest, finished: false, variant: 9999, unfolded: 2, logs: ROD_LENGTH.logs, oil: ROD_LENGTH.oil, water: ROD_LENGTH.water, fire: 3,
      lanterns: [{ pin: 2, wick: 1 }, { pin: 1, wick: 1 }],
      strips: { fire: Array(STAMPS_MAX).fill({ card: 3, side: 'doubled' }), lantern: Array(STAMPS_MAX).fill({ card: 1, side: 'doubled' }), kettle: Array(STAMPS_MAX).fill({ card: 0, side: 'doubled' }) },
      cards: { fire: 'doubled', lantern: 'doubled', kettle: 'doubled' }, last: 'close', pins: { fire: { num: 47, den: 3 }, lantern: { num: 47, den: 3 }, kettle: { num: 15, den: 1 } },
      trail: Array.from({ length: TRAIL_MAX }, (_, i) => TRAIL_COLS * TRAIL_ROWS - 1 - i), phase: 'morning', nights: NIGHTS_CAP, changed: false,
      shown: [...Object.values(IDEAS).filter((idea): idea is string => idea !== null), 'out-fire', 'out-lantern', 'out-kettle'],
    }
    const bytes = new TextEncoder().encode(JSON.stringify(serializeCamp(largest))).length
    expect(bytes).toBeLessThan(32 * 1024)
    expect(bytes).toBeLessThan(8 * 1024)
  })

  it('saves only its own fields, all plain', () => {
    const saved = serializeCamp({ ...dawn(stamps(lay(at('summit'), 20, 4, 2), 'fire', 2)), extra: 'x' } as CampState)
    expect(Object.keys(saved).sort()).toEqual(['cards', 'changed', 'finished', 'fire', 'lanterns', 'last', 'logs', 'nights', 'oil', 'phase', 'pins', 'position', 'shown', 'strips', 'trail', 'unfolded', 'v', 'variant', 'water'])
    expect(JSON.parse(JSON.stringify(saved))).toEqual(saved)
  })
})

describe('laying in', () => {
  it('follows the pull to any mark on the rod and back', () => {
    let state = layIn(at('meadow'), 'logs', 18).state
    expect(state).toMatchObject({ logs: 18, changed: true })
    state = layIn(state, 'logs', 7.4).state
    expect(state.logs).toBe(7)
    expect(layIn(state, 'logs', -5).state.logs).toBe(0)
    expect(layIn(state, 'logs', Number.NaN).state.logs).toBe(0)
  })

  it('stops at the end of the rod and says so', () => {
    const { state, refusal } = layIn(at('meadow'), 'logs', 75)
    expect(state.logs).toBe(ROD_LENGTH.logs)
    expect(refusal).toEqual({ kind: 'rod-full', supply: 'logs', asked: 75, laid: 60 })
  })

  it('stops when the sled is full, and adding to one supply leaves less room for another', () => {
    let state = lay(at('ridge'), 24, 3, 6) // 24 + 6 + 18 = 48 of 56 places
    const more = layIn(state, 'water', 9)
    expect(more.state.water).toBe(8)
    expect(more.refusal).toEqual({ kind: 'sled-full', supply: 'water', asked: 9, laid: 8 })
    state = layIn(state, 'logs', 40).state
    expect(state.logs).toBe(32)
    expect(layIn(state, 'oil', 4).state.oil).toBe(3)
  })

  it('leaves a strapped stock alone and says why', () => {
    const state = at('saddle')
    expect(layIn(state, 'logs', 10)).toEqual({ state, refusal: { kind: 'strapped', supply: 'logs', asked: 10, laid: 30 } })
  })

  it('does nothing on a rod the site does not have', () => {
    const state = at('meadow')
    expect(layIn(state, 'oil', 3)).toEqual({ state, refusal: null })
  })
})

describe('the dials, the lanterns and the ruler', () => {
  it('turns the fire dial only to settings it has', () => {
    expect(turnDial(at('birchwood'), 2)).toMatchObject({ fire: 2, changed: true })
    const state = at('birchwood')
    expect(turnDial(state, 3)).toBe(state)
    expect(turnDial(state, 0)).toBe(state)
  })

  it('moves a lantern to a free pin, and dropped on another lantern it hops back to the pin it came from', () => {
    const state = at('summit')
    expect(state.lanterns).toEqual([{ pin: 0, wick: 0 }, { pin: 1, wick: 0 }])
    expect(moveLantern(state, 0, 2).lanterns).toEqual([{ pin: 2, wick: 0 }, { pin: 1, wick: 0 }])
    expect(moveLantern(state, 0, 1), 'a wrong use changes nothing').toBe(state)
    expect(moveLantern(state, 0, 7)).toBe(state)
    expect(moveLantern(state, 5, 0)).toBe(state)
    expect(clickWick(clickWick(state, 1), 1).lanterns[1].wick).toBe(0)
    expect(clickWick(state, 1).lanterns).toEqual([{ pin: 0, wick: 0 }, { pin: 1, wick: 1 }])
  })

  it('makes the night longer by unfolding the ruler, and shorter again by folding it', () => {
    const state = at('meadow')
    expect(hoursOf(state)).toBe(6)
    expect(hoursOf(unfold(state, 1))).toBe(8)
    expect(hoursOf(unfold(state, 5))).toBe(10)
    expect(hoursOf(unfold(unfold(state, 2), 0))).toBe(6)
    expect(unfold(state, 0)).toBe(state)
    // Where the load is given for the night as laid out, there is no further section to unfold.
    const strapped = at('saddle')
    expect(unfold(strapped, 2)).toBe(strapped)
    expect(deserializeCamp({ ...serializeCamp(strapped), unfolded: 2 }).unfolded).toBe(0)
  })

  it('stamps a card along the ruler, on the side it lies on, no further than the stamp that covers dawn', () => {
    let state = unfold(at('quarry'), 1) // ten hours; the low wick's card spans three
    state = stamps(state, 'fire', 99)
    expect(state.strips.fire.length).toBe(10)
    state = stamps(state, 'lantern', 99)
    expect(state.strips.lantern).toEqual(Array(4).fill({ card: 0, side: 'single' }))
    expect(stamp(state, 'kettle').strips.kettle, 'no kettle at this site').toEqual([])
    expect(stamps(at('meadow'), 'fire', 2).changed, 'a pencil strip changes no night').toBe(false)
    // Folding the ruler back rubs out the stamps that would now start after dawn.
    expect(unfold(state, 0).strips.fire.length).toBe(8)
    expect(unfold(state, 0).strips.lantern.length).toBe(3)
    expect(rubOut(state, 'fire', 4).strips.fire.length).toBe(4)
    expect(rubOut(state, 'fire').strips.fire).toEqual([])
  })

  it('flips a card between its sides, and keeps each stamp as the side that made it, so the strip is drawn again exactly', () => {
    let state = at('quarry')
    expect(flipCard(state, 'kettle')).toBe(state)
    state = stamps(flipCard(stamps(state, 'fire', 2), 'fire'), 'fire', 2)
    expect(state.cards.fire).toBe('doubled')
    expect(flipCard(state, 'fire').cards.fire, 'two sides before the position that brings the halved one').toBe('single')
    expect(rowOf(state, 'fire', 0)).toEqual(['single', 'single', 'doubled', 'doubled'])
    const rows = stampedStrip(cardAmount(siteOf(state), 'fire', 0), rowOf(state, 'fire', 0), hoursOf(state))
    expect(rows.map((row) => [row.hours.num, row.pieces.num])).toEqual([[1, 2], [2, 4], [4, 8], [6, 12]])
    expect(stamps(state, 'fire', 9).strips.fire.length).toBe(5)
    expect(reload(state).strips).toEqual(state.strips)
  })

  it('has a halved side from the position that brings several pieces for several hours, and its strip carries halves', () => {
    let tarn = at('tarn')
    tarn = flipCard(flipCard(turnDial(tarn, 1), 'fire'), 'fire')
    expect(tarn.cards.fire).toBe('halved')
    tarn = stamps(tarn, 'fire', 3)
    const rows = stampedStrip(cardAmount(siteOf(tarn), 'fire', 1), rowOf(tarn, 'fire', 1), hoursOf(tarn))
    expect(rows.map((row) => [row.hours, row.pieces])).toEqual([[{ num: 1, den: 1 }, { num: 5, den: 2 }], [{ num: 2, den: 1 }, { num: 5, den: 1 }], [{ num: 3, den: 1 }, { num: 15, den: 2 }]])
    expect(reload(tarn)).toEqual(tarn)
  })

  it('keeps a row for each card of a dial, so two settings can be compared hour by hour', () => {
    let state = stamps(at('birchwood'), 'fire', 3)
    state = stamps(turnDial(state, 2), 'fire', 3)
    const site = siteOf(state)
    const totals = (card: number) => stampedStrip(cardAmount(site, 'fire', card), rowOf(state, 'fire', card), hoursOf(state)).map((row) => row.pieces.num)
    expect(totals(0)).toEqual([2, 4, 6])
    expect(totals(2)).toEqual([5, 10, 15])
    for (let i = 0; i < 99; i++) state = stamp(state, 'fire')
    expect(state.strips.fire.length).toBeLessThanOrEqual(STAMPS_MAX)
    expect(cardAmount(siteOf(at('ford')), 'kettle', 0), 'the kettle\'s card is a round for the whole line').toEqual({ pieces: 4, hours: 1 })
  })

  it('lays a marshmallow trail cell by cell, keeps its newest cells, and gathers it back', () => {
    let state = at('meadow')
    for (let cell = 0; cell < TRAIL_MAX + 3; cell++) state = layTrail(state, cell)
    expect(state.trail.length).toBe(TRAIL_MAX)
    expect(state.trail[0]).toBe(3)
    expect(layTrail(state, 5)).toBe(state)
    expect(layTrail(state, -1)).toBe(state)
    expect(gatherTrail(state).trail).toEqual([])
    expect(state.changed).toBe(false)
  })
})

describe('found as left', () => {
  it('does not save a running night: put away in the middle, the camp is at dusk with the plan as it was', () => {
    const planned = lay(at('meadow'), 15)
    expect(reload(planned)).toEqual(planned)
    expect(reload(planned).phase).toBe('dusk')
  })

  it('saves the morning as its scene starts, and works the night out again from the plan', () => {
    const morning = reload(dawn(lay(at('meadow'), 15)))
    expect(morning).toMatchObject({ phase: 'morning', last: 'short', pins: { fire: { num: 5, den: 1 }, lantern: null, kettle: null } })
    expect(runNight(siteOf(morning), planOf(morning), morning.unfolded).fire).toMatchObject({ short: true, until: { num: 5, den: 1 } })
  })

  it('goes back to dusk when the cursor is slid back or the plan is changed, and keeps everything else', () => {
    const morning = dawn(lay(at('meadow'), 15))
    expect(backToDusk(morning)).toEqual({ ...morning, phase: 'dusk' })
    // The pins lie where they fell until the next night is slid to dawn, though the plan that dropped them is gone.
    const changed = reload(layIn(morning, 'logs', 18).state)
    expect(changed).toMatchObject({ phase: 'dusk', logs: 18, changed: true, nights: 1, last: 'short', pins: { fire: { num: 5, den: 1 } } })
    expect(dawn(changed)).toMatchObject({ last: 'close', pins: { fire: null } })
  })

  it('shows each new idea once, after the child\'s own first night there', () => {
    const first = reachDawn(lay(at('meadow'), 4))
    expect(first.showing).toBe('strip')
    expect(first.state.shown).toEqual(['strip'])
    expect(reachDawn(layIn(first.state, 'logs', 18).state).showing).toBeNull()
    expect(reachDawn(reload(first.state)).showing).toBeNull()
    expect(reachDawn(lay(at('summit'), 36, 8, 5)).showing).toBeNull()
    const next = moveOn(first.state).state
    expect(next.shown).toEqual(['strip'])
    // Help is fetched: after its one showing the neat way plays again only on a tap on the scout at dusk.
    expect(fetchNeatWay(lay(at('meadow'), 4))).toBeNull()
    expect(fetchNeatWay(first.state), 'not in the morning scene').toBeNull()
    expect(fetchNeatWay(backToDusk(first.state))).toBe('strip')
    expect(fetchNeatWay(at('summit'))).toBeNull()
    // A position with no move of its own plays an earlier one, once that has had its showing.
    expect(fetchNeatWay({ ...at('summit'), shown: ['halve'] })).toBe('halve')
    expect(fetchNeatWay({ ...at('spring'), shown: ['strip', 'dial'] })).toBeNull()
    expect(fetchNeatWay({ ...at('spring'), shown: ['round'] })).toBe('round')
    expect(fetchNeatWay({ ...at('ridge'), shown: ['span'] })).toBe('span')
  })

  it('plays lights out as a scene once for each user at a site, and again as a first at the next site', () => {
    const once = lightsOut(lay(at('quarry'), 5, 1), 'fire')
    expect(once.first).toBe(true)
    expect(lightsOut(reload(once.state), 'fire').first).toBe(false)
    expect(lightsOut(once.state, 'lantern').first).toBe(true)
    expect(lightsOut(moveOn(once.state).state, 'fire').first).toBe(true)
  })
})

describe('how a cycle is judged', () => {
  it('counts a night once for each plan', () => {
    let state = dawn(lay(at('meadow'), 10))
    expect(state.nights).toBe(1)
    state = dawn(backToDusk(state))
    expect(state.nights).toBe(1)
    state = dawn(layIn(state, 'logs', 12).state)
    expect(state.nights).toBe(2)
    for (let logs = 13; logs < 30; logs++) state = dawn(layIn(state, 'logs', logs).state)
    expect(state.nights).toBe(NIGHTS_CAP)
  })

  it('goes well with a tight night reached by the third night', () => {
    expect(judge(dawn(lay(at('meadow'), 18)))).toBe('well')
    const third = dawn(layIn(dawn(layIn(dawn(lay(at('meadow'), 10)), 'logs', 14).state), 'logs', 18).state)
    expect(third.nights).toBe(3)
    expect(judge(third)).toBe('well')
  })

  it('goes badly when the night the judging reads ran short, even if the plan was changed after it', () => {
    expect(judge(dawn(lay(at('meadow'), 17)))).toBe('badly')
    expect(judge(reload(layIn(dawn(lay(at('meadow'), 10)), 'logs', 18).state))).toBe('badly')
  })

  it('is mixed for a lot left over, for a good night after more than three, and for no night slid to dawn', () => {
    expect(dawn(lay(at('meadow'), 40))).toMatchObject({ last: 'over' })
    expect(judge(dawn(lay(at('meadow'), 40)))).toBe('mixed')
    let state = dawn(lay(at('meadow'), 10))
    for (const logs of [12, 14, 18]) state = dawn(layIn(state, 'logs', logs).state)
    expect(state).toMatchObject({ nights: 4, last: 'late' })
    expect(judge(state)).toBe('mixed')
    expect(judge(at('meadow'))).toBe('mixed')
    expect(judge(lay(at('meadow'), 18))).toBe('mixed')
  })

  it('does not judge a later night once one at this site has gone well: a night staged to go dark costs nothing', () => {
    let state = dawn(lay(at('meadow'), 18))
    expect(state.last).toBe('close')
    state = dawn(layIn(state, 'logs', 0).state)
    expect(state).toMatchObject({ last: 'close', pins: { fire: { num: 0, den: 1 } }, nights: 2 })
    expect(judge(reload(state))).toBe('well')
    // A good night reached after the third is kept the same way: a staged night after it does not move the child down.
    let late = dawn(lay(at('meadow'), 10))
    for (const logs of [12, 14, 18, 0]) late = dawn(layIn(late, 'logs', logs).state)
    expect(late).toMatchObject({ nights: 5, last: 'late' })
    expect(judge(late)).toBe('mixed')
    expect(moveOn(state).state.last, 'and the next site starts with nothing known').toBe('none')
  })
})

describe('moving on', () => {
  it('moves the position one step up after a cycle that went well, and lays out the next site at once', () => {
    const { state, outcome } = moveOn(dawn(lay(at('meadow'), 18)))
    expect(outcome).toBe('well')
    expect(state).toMatchObject({ position: 'birchwood', variant: 1, finished: false, phase: 'dusk', logs: 0, nights: 0, changed: false, unfolded: 0, last: 'none' })
    expect(siteOf(state)).toBe(SITES.birchwood[1])
  })

  it('moves one step down after one that went badly, and not at all after a mixed one or at either end', () => {
    expect(moveOn(dawn(lay(at('birchwood'), 3))).state.position).toBe('meadow')
    expect(moveOn(dawn(lay(at('meadow'), 3))).state.position).toBe('meadow')
    expect(moveOn(at('ford')).state.position).toBe('ford')
    expect(moveOn(at('ford')).state.variant).toBe(1)
    const top = at('summit'), site = siteOf(top), need = runNight(site, { ...planOf(top), fire: 1 })
    const tight = dawn(lay(turnDial(top, 1), need.fire.needed, need.lantern!.needed, need.kettle!.needed))
    expect(moveOn(tight)).toMatchObject({ outcome: 'well', state: { position: 'summit' } })
  })

  it('never moves the position inside a cycle', () => {
    let state = lay(at('ford'), 21, 0, 5)
    for (const step of [dawn, backToDusk, (s: CampState) => turnDial(s, 2), (s: CampState) => unfold(s, 2), dawn, reload]) { state = step(state); expect(state.position).toBe('ford') }
  })

  it('takes the next variant in turn, so a return to a position is never the same sum', () => {
    let state = at('ford')
    const seen: number[] = []
    for (let i = 0; i < 4; i++) { seen.push(siteOf(state).hours); state = moveOn(state).state }
    expect(seen).toEqual([6, 8, 9, 6])
  })

  it('walks the whole ladder on tight first nights, one step a cycle', () => {
    let state = freshCamp(null)
    const walked: string[] = [state.position]
    for (let i = 0; i < LADDER.length; i++) {
      const site = siteOf(state)
      // The plan a child who worked it out would lay: for each setting of the dials, exactly what it needs, taking the first that is tight and fits.
      let done = false
      for (let fire = site.fire.length - 1; fire >= 0 && !done; fire--)
        for (const wick of [0, 1] as const) {
          let tried = turnDial(state, fire)
          if (site.lanterns > 0 && tried.lanterns[0].wick !== wick) tried = clickWick(tried, 0)
          const need = runNight(site, planOf(tried))
          tried = lay(tried, need.fire.needed, need.lantern?.needed ?? 0, need.kettle?.needed ?? 0)
          tried = dawn(tried)
          if (judge(tried) === 'well') { state = tried; done = true; break }
        }
      expect(done, `${state.position} ${state.variant}`).toBe(true)
      state = moveOn(state).state
      walked.push(state.position)
    }
    expect(walked).toEqual([...LADDER, 'summit'])
  })
})
