import { describe, expect, it } from 'vitest'
import { SUPPLY_LANES, cardHome, hourX, rowEnd, sectionHandle, trailCell, trailPoint, type Point } from './board'
import { deserializeCamp, planOf, serializeCamp, siteOf, type CampState } from './camp'
import { Game, GLIDE } from './game'
import { rowsRead } from './lookKit'
import { ACTIONS, OBJECTS, changesThePlan, use } from './grid'
import type { Guidance } from './guidance'
import { open, rounds } from './paths'
import { STATE_VERSION } from './state'
import { seeded } from './terrain'
import * as V from './voices'
import { ROD_LENGTH, SITES, type Supply } from './world'

const at = (position: string, more: Partial<CampState> = {}, seed = 1) => new Game(1180, 820, deserializeCamp({ v: STATE_VERSION, position, ...more }), seed)
const run = (game: Game, seconds: number, guidance: Guidance | null = null) => { const heard: (readonly V.Note[])[] = []; for (let i = 0; i < Math.round(seconds * 60); i++) { game.step(1 / 60, guidance); heard.push(...game.takeSounds()) } return heard }
const pile = (game: Game, supply: Supply): Point => ({ x: game.board.pile, y: game.board.lanes[SUPPLY_LANES.indexOf(supply)] - 12 * game.board.u })
const onRow = (game: Game, supply: Supply, units: number): Point => rowEnd(game.board, supply, units)
const cursor = (game: Game): Point => ({ x: hourX(game.board, game.frame.night.hour), y: game.board.ruler.y - 12 * game.board.u })
const drag = (game: Game, from: Point, to: Point, seconds = 0.4) => { game.press(from); const n = Math.max(2, Math.round(seconds * 60)), heard = [...game.takeSounds()]; for (let i = 1; i <= n; i++) { game.move({ x: from.x + ((to.x - from.x) * i) / n, y: from.y + ((to.y - from.y) * i) / n }); game.step(1 / 60, null); heard.push(...game.takeSounds()) } game.lift(); heard.push(...game.takeSounds()); return heard }
const tap = (game: Game, p: Point) => { game.press(p); game.lift(); return game.takeSounds() }
const lay = (game: Game, supply: Supply, count: number) => { tap(game, { x: rowEnd(game.board, supply, count).x, y: game.board.lanes[SUPPLY_LANES.indexOf(supply)] }); run(game, 0.5) }
const same = (a: readonly V.Note[], b: readonly V.Note[]) => JSON.stringify(a) === JSON.stringify(b)
const count = (heard: (readonly V.Note[])[], voice: readonly V.Note[]) => heard.filter((one) => same(one, voice)).length
/** Pushes the cursor off and lets the night run to dawn, scenes and all. */
const night = (game: Game) => { tap(game, cursor(game)); return run(game, game.board.hours / GLIDE + 14) }
const reload = (game: Game) => new Game(1180, 820, deserializeCamp(JSON.parse(JSON.stringify(game.saved()))), 1)

describe('the toy is still the toy', () => {
  it('answers a finger on a pile in the call that lands it, and lays a row as the finger pulls', () => {
    const game = at('meadow')
    game.press(pile(game, 'logs'))
    expect(game.camp.logs).toBe(1)
    expect(count(game.takeSounds(), V.RATTLE.logs)).toBe(1)
    expect(game.takeChanged()).toBe('soon')
    game.lift()
    drag(game, pile(game, 'logs'), onRow(game, 'logs', 18), 0.8)
    run(game, 0.3)
    expect(game.camp.logs).toBe(18)
    expect(game.frame.rows.logs.length).toBe(18)
  })

  it('sounds every piece of a pull, however fast: each log its own step, and a deeper knock under every fifth', () => {
    const game = at('meadow')
    game.press(pile(game, 'logs')); game.move(onRow(game, 'logs', 23.5))
    const heard = [...game.takeSounds(), ...run(game, 1.2)]
    const pitch = (n: number) => V.logOut(n)[0].hz, knock = (notes: readonly V.Note[]) => notes.length === 3
    for (let n = 1; n <= 23; n++) expect(heard.filter((notes) => notes[0].kind === 'tone' && Math.abs(notes[0].hz - pitch(n)) < 1e-6 && notes.length >= 2).length, `log ${n}`).toBe(1)
    expect(heard.filter(knock).length).toBe(4)
    // Pushed home just as fast, every piece steps down again.
    game.move(onRow(game, 'logs', 2.5))
    const home = run(game, 1.2)
    for (let n = 23; n > 2; n--) expect(home.filter((notes) => notes.length === 1 && Math.abs(notes[0].hz - V.logHome(n)[0].hz) < 1e-6).length, `log ${n} home`).toBe(1)
  })

  it('draws no rod the site does not have', () => {
    const game = at('meadow')
    expect(game.board.rods).toEqual(['logs'])
    expect(game.targetAt(pile(game, 'oil'))).toBeNull()
    expect(Object.keys(game.frame.cards)).toEqual(['fire'])
  })

  it('stops a pull at the tail of the sled and says where: the piece slides off, and nothing more is laid', () => {
    const game = at('ridge')
    lay(game, 'logs', 30); lay(game, 'water', 3)
    game.takeSounds()
    const heard = drag(game, onRow(game, 'oil', 0.6), onRow(game, 'oil', 9), 0.5)
    expect(game.camp.oil).toBe(8)
    expect(30 + game.camp.oil * 2 + 9).toBeLessThanOrEqual(SITES.ridge[0].sled!)
    expect(count(heard, V.SLIDES_OFF)).toBeGreaterThan(0)
    expect(game.frame.sled!.load).toEqual([{ supply: 'logs', places: 30 }, { supply: 'oil', places: 16 }, { supply: 'water', places: 9 }])
    // The flask that slid off the tail hops back to its own pile.
    expect(count(heard, V.HOPS_BACK)).toBeGreaterThan(0)
    let seen = false, last = { x: 0, y: 0 }
    for (let i = 0; i < 90; i++) { game.step(1 / 60, null); const carried = game.frame.carried; if (carried && carried.thing === 'flask') { seen = true; last = { x: carried.x, y: carried.y } } }
    expect(seen).toBe(true)
    expect(Math.hypot(last.x - game.board.pile, last.y - (game.board.lanes[1] - 12 * game.board.u))).toBeLessThan(40 * game.board.u)
    expect(game.frame.carried).toBeNull()
  })

  it('leaves a strapped load alone, and its straps twang', () => {
    const game = at('saddle')
    game.press(pile(game, 'logs'))
    expect(count(game.takeSounds(), V.STRAP_TWANG)).toBe(1)
    game.move(onRow(game, 'logs', 50)); game.lift()
    expect(game.camp.logs).toBe(30)
    expect(game.frame.sled).toMatchObject({ strapped: true, load: [{ supply: 'logs', places: 30 }, { supply: 'oil', places: 10 }] })
  })
})

describe('the night is a test the child starts', () => {
  it('does not run until the cursor is pushed, then glides to dawn on game time, with an owl at every hour', () => {
    const game = at('meadow')
    lay(game, 'logs', 18)
    run(game, 5)
    expect(game.frame.night.hour).toBe(0)
    expect(game.running).toBe(false)
    const heard = [...tap(game, cursor(game)), ...run(game, 6 / GLIDE + 1)]
    expect(count(heard, V.NIGHT_BEGINS)).toBe(1)
    expect(count(heard, V.HOOT)).toBe(5)
    expect(count(heard, V.DAWN)).toBe(1)
    expect(game.frame.night.hour).toBe(6)
    expect(game.camp).toMatchObject({ phase: 'morning', nights: 1, last: 'close' })
  })

  it('stops when the cursor is taken hold of, and plays backwards as it plays forwards', () => {
    const game = at('meadow', { shown: ['out-fire'] })
    lay(game, 'logs', 12)
    tap(game, cursor(game)); run(game, 3)
    const hour = game.frame.night.hour
    expect(hour).toBeGreaterThan(1.5)
    // The row shortens from its far end as the fire takes from it, and the plan itself stays as it was laid.
    expect(game.frame.rows.logs.length).toBe(Math.floor(12 - 3 * hour))
    expect(game.camp.logs).toBe(12)
    tap(game, cursor(game)); run(game, 2)
    expect(game.frame.night.hour).toBeCloseTo(hour, 5)
    const read = () => ({ lit: game.frame.blaze.lit, ash: JSON.stringify(game.frame.ash), pin: game.frame.rulerPins.fire?.hour ?? null, logs: game.frame.night.hour })
    const drawTo = (to: number) => { game.press(cursor(game)); game.move({ x: hourX(game.board, to), y: game.board.ruler.y }); game.step(1 / 60, null); const now = read(); game.lift(); game.press(cursor(game)); return now }
    const forwards = [1, 3, 5].map(drawTo), backwards = [5, 3, 1].map(drawTo).reverse()
    expect(backwards).toEqual(forwards)
    expect(forwards[2]).toMatchObject({ lit: false, pin: 4 })
    expect(forwards[0]).toMatchObject({ lit: true, pin: null })
  })

  it('shows a shortfall where and why: the fire goes out at its hour, a pin drops there, and the ash stops', () => {
    const game = at('meadow', { shown: ['out-fire'] })
    lay(game, 'logs', 15)
    const heard = night(game)
    expect(count(heard, V.GUTTERS)).toBe(1)
    expect(count(heard, V.PIN_DROPS)).toBe(1)
    expect(game.frame.rulerPins.fire).toMatchObject({ hour: 5 })
    expect(game.frame.ash.fire).toEqual({ amount: { pieces: 3, hours: 1 }, until: 5 })
    expect(game.frame.rows.logs.length, 'the row on the rod is what is left: nothing').toBe(0)
    expect(game.camp).toMatchObject({ phase: 'morning', last: 'short', logs: 15 })
    expect(game.camp.pins.fire).toEqual({ num: 5, den: 1 })
  })

  it('goes back to dusk when the plan is changed after a morning: the cursor runs home and the state stays', () => {
    const game = at('meadow', { shown: ['out-fire', 'strip'] })
    lay(game, 'logs', 15); night(game)
    tap(game, { x: onRow(game, 'logs', 18).x, y: game.board.lanes[0] })
    expect(game.camp).toMatchObject({ phase: 'dusk', logs: 18, changed: true, nights: 1 })
    run(game, 2)
    expect(game.frame.night.hour).toBe(0)
    expect(game.frame.night.film).toBe(0)
    // The pin of the night that was run lies where it fell until the next night is slid to dawn.
    expect(game.frame.rulerPins.fire).toMatchObject({ hour: 5 })
  })
})

describe('found as left', () => {
  it('does not save a running night: put away in the middle, the camp is found at dusk with the plan as it was', () => {
    const game = at('meadow')
    lay(game, 'logs', 9); tap(game, cursor(game)); run(game, 2)
    const again = reload(game)
    expect(again.frame.night.hour).toBe(0)
    expect(again.camp).toMatchObject({ phase: 'dusk', logs: 9 })
    expect(again.takeSounds()).toEqual([])
  })

  it('opens a saved morning finished: the cursor at dawn, the ash and the pins lying, and no scene playing', () => {
    const game = at('meadow', { shown: ['out-fire'] })
    lay(game, 'logs', 15); night(game)
    const again = reload(game)
    expect(again.playing).toBe(false)
    expect(again.frame.night).toMatchObject({ hour: 6, film: 0, morning: true })
    expect(again.frame.rulerPins.fire).toMatchObject({ hour: 5, drop: 1 })
    expect(again.frame.ash.fire!.until).toBe(5)
    expect(again.takeSounds()).toEqual([])
    run(again, 3)
    expect(again.frame.night.hour).toBe(6)
    expect(JSON.stringify(again.saved())).toBe(JSON.stringify(game.saved()))
  })

  it('does nothing the finger had not done when the touch is taken away: no dial turned, no wick clicked, no card flipped, no night begun, no sheet turned', () => {
    const game = at('summit', { logs: 20, oil: 4, water: 4 })
    const before = JSON.stringify(serializeCamp(game.saved()))
    const ring = { x: game.board.fire.x - 50 * game.board.u, y: game.board.fire.y }
    for (const p of [ring, game.board.pins[0], cardHome(game.board, 'fire'), cursor(game), game.board.corner]) { game.press(p); game.drop(); run(game, 0.3) }
    expect(JSON.stringify(serializeCamp(game.saved()))).toBe(before)
    expect(game.running).toBe(false)
    expect(game.frame.night.hour).toBe(0)
    // A corner pulled right over and then taken away falls back: the sheet does not turn.
    const corner = game.board.corner
    game.press(corner); game.move({ x: corner.x - 220, y: corner.y - 40 }); game.drop(); run(game, 1)
    expect(game.playing).toBe(false)
    expect(game.frame.fold).toEqual({ pull: 0, packing: 0 })
    expect(JSON.stringify(serializeCamp(game.saved()))).toBe(before)
    // A card carried over the fire and a lantern carried off its pin go home, and no show plays.
    game.press(cardHome(game.board, 'kettle')); game.move({ x: game.board.fire.x, y: game.board.fire.y + 4 }); game.move(game.board.fire); game.drop()
    game.press(game.board.pins[0]); game.move({ x: game.board.fire.x, y: game.board.fire.y + 4 }); game.move(game.board.fire); game.drop()
    run(game, 1)
    expect(game.frame.effects).toEqual([])
    expect(game.frame.cards.kettle).toMatchObject({ x: cardHome(game.board, 'kettle').x, y: cardHome(game.board, 'kettle').y })
    expect(JSON.stringify(serializeCamp(game.saved()))).toBe(before)
    // A row keeps what the finger drew, as when it is let go.
    game.press(pile(game, 'water')); game.move(onRow(game, 'water', 6.2)); game.drop(); run(game, 1)
    expect(game.camp.water).toBe(6)
    // A finished morning stays a morning under a finger that is taken away from the dial.
    const morning = at('meadow', { logs: 18 })
    night(morning)
    expect(morning.camp.phase).toBe('morning')
    morning.press({ x: morning.board.fire.x - 50 * morning.board.u, y: morning.board.fire.y }); morning.drop(); run(morning, 0.5)
    expect(morning.camp.phase).toBe('morning')
  })

  it('is found as a load would find it after a put-away without a load: the night ended at dusk, a scene finished, nothing setting off', () => {
    const game = at('meadow', { logs: 18 })
    tap(game, cursor(game)); run(game, 3)
    expect(game.frame.night.hour).toBeGreaterThan(1)
    const saved = JSON.stringify(serializeCamp(game.saved()))
    game.rest(); run(game, 2)
    expect(game.frame.night.hour).toBe(0)
    expect(game.running).toBe(false)
    expect(game.playing).toBe(false)
    expect(game.frame.night.film).toBe(0)
    expect(JSON.stringify(serializeCamp(game.saved()))).toBe(saved)
    // Put away in the morning's scene, the morning stands finished and does not play on.
    tap(game, cursor(game)); run(game, 6 / GLIDE + 0.5)
    expect(game.playing).toBe(true)
    game.rest(); run(game, 0.2)
    expect(game.playing).toBe(false)
    expect(game.camp.phase).toBe('morning')
    expect(game.frame.night.hour).toBe(6)
    expect(JSON.stringify(serializeCamp(reload(game).saved()))).toBe(JSON.stringify(serializeCamp(game.saved())))
    // Put away with the corner pulled right over, the sheet has not turned; put away while it turns, the next site lies there.
    const corner = game.board.corner
    game.press(corner); game.move({ x: corner.x - 220, y: corner.y - 40 }); game.rest(); run(game, 0.5)
    expect(game.camp.position).toBe('meadow')
    expect(game.camp.variant).toBe(0)
    game.press(corner); game.move({ x: corner.x - 220, y: corner.y - 40 }); game.lift(); run(game, 0.3)
    expect(game.playing).toBe(true)
    game.rest(); run(game, 0.2)
    expect(game.playing).toBe(false)
    expect(game.frame.fold.packing).toBe(0)
    expect(game.board.site).toBe(siteOf(game.camp))
    expect(JSON.stringify(serializeCamp(game.camp))).toBe(JSON.stringify(serializeCamp(game.saved())))
  })

  it('saves a row in the hand as the whole count where it lies, and a card and a lantern where they came from', () => {
    const game = at('quarry')
    game.press(pile(game, 'logs')); game.move(onRow(game, 'logs', 12.4))
    expect(game.saved().logs).toBe(12)
    game.lift()
    game.press({ ...game.board.pins[0] }); game.move({ x: 500, y: 60 })
    expect(game.saved().lanterns).toEqual([{ pin: 0, wick: 0 }])
    expect(deserializeCamp(JSON.parse(JSON.stringify(game.saved())))).toEqual(serializeCamp(game.camp))
  })
})

describe('what each scene saves when it starts', () => {
  it('lights out: the mark for that user at this site, at once; and a touch ends the scene and is then an ordinary touch', () => {
    const game = at('meadow')
    lay(game, 'logs', 6); game.takeChanged()
    tap(game, cursor(game)); run(game, 2 / GLIDE + 0.2)
    expect(game.playing).toBe(true)
    expect(game.camp.shown).toEqual(['out-fire'])
    expect(game.takeChanged()).toBe('now')
    const held = game.frame.night.hour
    run(game, 1)
    expect(game.frame.night.hour, 'the cursor waits while the camp plays it out').toBeCloseTo(held, 5)
    const saved = JSON.stringify(game.saved())
    game.press(pile(game, 'logs'))
    expect(game.playing).toBe(false)
    expect(game.camp.logs, 'the touch that ended it was an ordinary touch on a pile').toBe(6)
    game.lift()
    expect(JSON.stringify({ ...game.saved(), changed: false })).toBe(JSON.stringify({ ...JSON.parse(saved), changed: false }))
  })

  it('lights out plays as a scene once at a site: the second time only the pin and the dark', () => {
    const game = at('meadow', { shown: ['out-fire'] })
    lay(game, 'logs', 6)
    tap(game, cursor(game)); run(game, 2 / GLIDE + 0.2)
    expect(game.playing).toBe(false)
    expect(game.frame.rulerPins.fire).toMatchObject({ hour: 2 })
  })

  it('morning: the phase, the count of nights, how the night ended and the pins, at once, before a beat has played', () => {
    const game = at('meadow', { shown: ['out-fire', 'strip'] })
    lay(game, 'logs', 15); game.takeChanged()
    tap(game, cursor(game)); run(game, 6 / GLIDE - 0.5)
    expect(game.camp.phase).toBe('dusk')
    run(game, 0.6)
    expect(game.playing).toBe(true)
    expect(game.camp).toMatchObject({ phase: 'morning', nights: 1, changed: false, last: 'short', pins: { fire: { num: 5, den: 1 } } })
    expect(game.takeChanged()).toBe('now')
    const saved = JSON.stringify(game.saved())
    expect(reload(game).frame.night.morning, 'a put-away in the middle of the scene finds the morning finished').toBe(true)
    run(game, 12)
    expect(game.playing).toBe(false)
    expect(JSON.stringify(game.saved()), 'the scene itself saves nothing more').toBe(saved)
  })

  it('a neat way: the mark of its one showing, the stamps and the card\'s side, at once with the morning', () => {
    const game = at('meadow')
    lay(game, 'logs', 18); tap(game, cursor(game)); run(game, 6 / GLIDE + 0.1)
    expect(game.camp.shown).toContain('strip')
    expect(game.camp.strips.fire).toEqual([{ card: 0, side: 'single' }, { card: 0, side: 'single' }])
    const saved = JSON.stringify(game.saved())
    expect(game.frame.strips.fire.reduce((sum, row) => sum + row.stamps.length, 0), 'the stamps are laid one by one on screen').toBeLessThan(2)
    run(game, 20)
    expect(game.frame.strips.fire[0].stamps.map((one) => one.pieces.num)).toEqual([3, 6])
    expect(game.frame.showing).toBeNull()
    expect(JSON.stringify(game.saved())).toBe(saved)
    // It never lays the amount this night needs: two spans of six, and the card left for the child to go on with.
    expect(game.frame.strips.fire[0].stamps.length).toBeLessThan(game.board.hours)
  })

  it('a neat way is fetched again by a tap on the scout at dusk, and leaves a strip the child made as it is', () => {
    const game = at('meadow', { shown: ['strip'], strips: { fire: [{ card: 0, side: 'single' }, { card: 0, side: 'single' }, { card: 0, side: 'doubled' }], lantern: [], kettle: [] } })
    const before = JSON.stringify(game.saved()), scout = game.frame.places.scout
    tap(game, { x: scout.x, y: scout.y })
    expect(game.playing).toBe(true)
    run(game, 0.8)
    expect(game.frame.showing).not.toBeNull()
    run(game, 14)
    expect(JSON.stringify(game.saved())).toBe(before)
    const fresh = at('meadow'), there = fresh.frame.places.scout
    expect(count(tap(fresh, { x: there.x, y: there.y }), V.POKED.scout), 'before its one showing the scout only answers the tap').toBe(1)
    expect(fresh.playing).toBe(false)
  })

  it('a neat way at every position that has one: the move is saved when it starts, the plan is as the child left it when it ends', () => {
    const lays: Record<string, [number, number, number]> = { birchwood: [16, 0, 0], ford: [12, 0, 4], quarry: [16, 3, 0], tarn: [12, 3, 4], saddle: [0, 0, 0] }
    const after: Record<string, (camp: CampState) => void> = {
      birchwood: (camp) => { expect(camp.strips.fire).toEqual([{ card: 1, side: 'single' }, { card: 1, side: 'single' }]); expect(camp.fire, 'the dial is back where the child set it').toBe(0) },
      ford: (camp) => expect(camp.strips).toEqual({ fire: [], lantern: [], kettle: [] }),
      quarry: (camp) => expect(camp.strips.lantern).toEqual([{ card: 0, side: 'single' }, { card: 0, side: 'single' }]),
      tarn: (camp) => { expect(camp.cards.fire).toBe('doubled'); expect(camp.strips.fire).toEqual([{ card: 0, side: 'doubled' }]) },
      saddle: (camp) => { expect(camp.cards.fire).toBe('halved'); expect(camp.strips.fire).toEqual([{ card: 0, side: 'halved' }, { card: 0, side: 'halved' }]) },
    }
    for (const position of Object.keys(lays)) {
      const game = at(position, { shown: ['out-fire', 'out-lantern', 'out-kettle'] }), [logs, oil, water] = lays[position]
      if (logs) lay(game, 'logs', logs); if (oil) lay(game, 'oil', oil); if (water) lay(game, 'water', water)
      const plan = JSON.stringify(planOf(game.camp))
      tap(game, cursor(game)); run(game, game.board.hours / GLIDE + 0.2)
      expect(game.camp.phase, position).toBe('morning')
      expect(game.camp.shown.length, `${position}: its one showing is marked as the morning starts`).toBe(4)
      const saved = JSON.stringify(game.saved())
      after[position](game.camp)
      let sawShowing = false
      for (let i = 0; i < 60 * 22; i++) { game.step(1 / 60, null); game.takeSounds(); if (game.frame.showing) sawShowing = true }
      expect(sawShowing, position).toBe(true)
      expect(game.playing, position).toBe(false)
      expect(game.frame.showing).toBeNull()
      expect(JSON.stringify(game.saved()), `${position}: the scene saves nothing after its start`).toBe(saved)
      expect(JSON.stringify(planOf(game.camp)), `${position}: the plan is the child's`).toBe(plan)
      expect(game.frame.blaze.setting, position).toBe(game.camp.fire)
      // The scout is back where it stands, and its showing can be fetched again at dusk.
      const scout = game.board.campers.find((one) => one.who === 'scout')
      if (scout) expect(Math.hypot(game.frame.places.scout.x - scout.middle.x, game.frame.places.scout.y - scout.middle.y), position).toBeLessThan(3)
    }
  })

  it('the picnic: nothing at all, every time', () => {
    const game = at('meadow', { shown: ['out-fire', 'strip'] })
    tap(game, cursor(game))
    const before = JSON.stringify({ ...game.saved() })
    run(game, 3 / GLIDE + 0.5)
    expect(game.playing).toBe(true)
    expect(JSON.stringify(game.saved())).toBe(before)
    run(game, 2.5)
    expect(game.frame.raccoons.some((one) => one.has === 'pan')).toBe(true)
  })

  it('the picnic plays every time, also after the scene of the light that went out at that very moment, with the tin in the ring and the cook\'s pan on a raccoon', () => {
    // Nine logs at three an hour: the fire goes out at the third hour, the middle of this night, for the first time at this site.
    for (const shown of [['strip'], ['strip', 'out-fire']]) {
      const game = at('meadow', { logs: 9, shown })
      tap(game, cursor(game))
      let lightsOut = false, pan = false, ring = false, carried = false, twoTins = false
      for (let i = 0; i < 60 * 16; i++) {
        game.step(1 / 60, null)
        if (game.playing && game.frame.night.hour > 2.9 && game.frame.night.hour < 3.1 && !game.frame.raccoons.some((one) => one.has !== 'nothing')) lightsOut = true
        pan = pan || game.frame.raccoons.some((one) => one.has === 'pan')
        carried = carried || (game.frame.raccoons.some((one) => one.has === 'tin') && game.frame.tinAt === 'taken')
        ring = ring || game.frame.tinAt === 'ring'
        twoTins = twoTins || (game.frame.raccoons.some((one) => one.has === 'tin') && game.frame.tinAt !== 'taken')
      }
      expect(lightsOut, 'the light went out first').toBe(true)
      expect(carried, 'a raccoon carried the tin in').toBe(true)
      expect(ring, 'the tin stood in the ring').toBe(true)
      expect(pan, 'one wore the pan').toBe(true)
      expect(twoTins, 'the tin is never in two places').toBe(false)
    }
  })

  it('leaves the fire, the lanterns and the kettle in the morning exactly as they ended', () => {
    const held = at('quarry', { logs: 16, oil: 4, shown: ['out-fire', 'out-lantern', 'strip', 'dial', 'span'] })
    night(held)
    expect(held.camp.phase).toBe('morning')
    expect(held.frame.blaze.lit).toBe(true)
    expect(held.frame.lanterns.every((one) => one.lit)).toBe(true)
    expect(held.frame.moths.every((count) => count === 0), 'the moths are the night\'s').toBe(true)
    expect(held.frame.night.film).toBe(0)
    const short = at('quarry', { logs: 16, oil: 1, shown: ['out-fire', 'out-lantern', 'strip', 'dial', 'span'] })
    night(short)
    expect(short.frame.blaze.lit).toBe(true)
    expect(short.frame.lanterns.some((one) => one.lit)).toBe(false)
    const dry = at('ford', { logs: 12, water: 1, shown: ['out-fire', 'out-kettle', 'strip', 'dial', 'round'] })
    expect(dry.frame.kettleDry).toBe(false)
    night(dry)
    expect(dry.frame.kettleDry).toBe(true)
    const full = at('ford', { logs: 12, water: 4, shown: ['out-fire', 'out-kettle', 'strip', 'dial', 'round'] })
    night(full)
    expect(full.frame.kettleDry).toBe(false)
    // Found as left: opened again, the morning stands as it ended.
    expect(reload(held).frame.blaze.lit).toBe(true)
    expect(reload(dry).frame.kettleDry).toBe(true)
  })

  it('straps on the mule exactly what is left, and of what it was', () => {
    const logs = at('meadow', { logs: 30 })
    night(logs)
    expect(logs.frame.tower).toBe(12)
    expect(logs.frame.towerOf).toEqual({ logs: 12, oil: 0, water: 0 })
    const all = at('ridge', { logs: 26, oil: 4, water: 7, fire: 1, shown: ['out-fire', 'out-lantern', 'out-kettle', 'strip', 'dial', 'round', 'span'] })
    night(all)
    // Twenty-four logs, three flasks and thirty-two cups were needed: two logs, one flask and one can are left.
    expect(all.frame.towerOf).toEqual({ logs: 2, oil: 2, water: 3 })
    expect(all.frame.tower).toBe(7)
    const none = at('meadow', { logs: 18 })
    night(none)
    expect(none.frame.tower).toBe(0)
  })

  it('a can of water on the sleeper: it sits up and shakes itself dry, and lies down again', () => {
    const wet = at('ford', {}, 3), bag = wet.board.campers.find((one) => one.who === 'sleeper')!
    const can = { x: wet.board.pile, y: wet.board.lanes[2] - 12 * wet.board.u }, head = { x: wet.frame.places.sleeper.x, y: wet.frame.places.sleeper.y }
    expect(bag.who).toBe('sleeper')
    wet.press(can); wet.move({ x: can.x, y: wet.board.walkway - 30 }); wet.move(head); wet.lift()
    run(wet, 0.5)
    expect(wet.frame.places.sleeper.act).toBe('sits-up-and-shakes')
    run(wet, 2.5)
    expect(wet.frame.places.sleeper.act).toBe('at-dusk')
  })

  it('packing up: the cycle judged and the next site laid out, at once, before the sheet has turned', () => {
    const game = at('meadow', { shown: ['out-fire', 'strip'] })
    lay(game, 'logs', 18); night(game); game.takeChanged()
    const corner = game.board.corner
    game.press(corner); game.move({ x: corner.x - 200, y: corner.y - 40 }); game.lift()
    expect(game.saved()).toMatchObject({ position: 'birchwood', variant: 1, phase: 'dusk', logs: 0, nights: 0, last: 'none' })
    expect(game.takeChanged()).toBe('now')
    expect(game.camp.position, 'the camp on screen is still the one being packed').toBe('meadow')
    expect(game.playing).toBe(true)
    const saved = JSON.stringify(game.saved())
    expect(reload(game).board.site).toBe(SITES.birchwood[1])
    run(game, 5)
    expect(game.playing).toBe(false)
    expect(game.board.site).toBe(SITES.birchwood[1])
    expect(game.frame.fold).toEqual({ pull: 0, packing: 0 })
    expect(JSON.stringify(game.saved())).toBe(saved)
  })

  it('does not turn the sheet for a touch on the fold, only for a pull past half way', () => {
    const game = at('ford')
    tap(game, game.board.corner)
    game.press(game.board.corner); game.move({ x: game.board.corner.x - 60, y: game.board.corner.y }); game.lift()
    run(game, 1)
    expect(game.camp.position).toBe('ford')
    expect(game.frame.fold.pull).toBe(0)
  })
})

describe('every cell of the grid', () => {
  const places = (game: Game) => ({ 'on-fire': game.board.fire, 'on-lantern': game.board.pins[0], 'on-camper': { x: game.frame.places.reader.x, y: game.frame.places.reader.y } })
  const take = (game: Game, thing: (typeof OBJECTS)[number]): Point => thing === 'log' ? pile(game, 'logs') : thing === 'flask' ? pile(game, 'oil') : thing === 'can' ? pile(game, 'water') : thing === 'lantern' ? game.board.pins[1] : thing === 'card' ? cardHome(game.board, 'fire') : game.board.tin

  it('puts on its own show for every wrong use, with a sound, and changes nothing the child set', () => {
    for (const when of ['dusk', 'night'] as const) for (const thing of OBJECTS) for (const action of ['on-fire', 'on-lantern', 'on-camper'] as const) {
      const game = at('summit', { shown: ['out-fire', 'out-lantern', 'out-kettle'] }, 3)
      lay(game, 'logs', 20); lay(game, 'oil', 6); lay(game, 'water', 4)
      if (when === 'night') { tap(game, cursor(game)); run(game, 1.5); tap(game, cursor(game)) }
      const cell = use(thing, action, when), before = JSON.stringify(planOf(game.camp)), hour = game.frame.night.hour
      game.takeSounds()
      const from = take(game, thing), to = places(game)[action]
      game.press(from); game.move({ x: from.x, y: game.board.walkway - 30 }); game.move(to); game.lift()
      const heard = game.takeSounds()
      game.step(1 / 60, null)
      expect(game.frame.effects.map((one) => one.kind), `${thing} ${action} at ${when}`).toContain(cell.result)
      expect(heard.length, `${thing} ${action} at ${when} sounds`).toBeGreaterThan(0)
      if (cell.changes === 'stock') expect(JSON.stringify(planOf(game.camp)), `${thing} ${action} at ${when} is laid in`).not.toBe(before)
      else { expect(JSON.stringify(planOf(game.camp)), `${thing} ${action} at ${when} changes nothing`).toBe(before); expect(game.frame.night.hour).toBeCloseTo(hour, 1) }
      run(game, 5)
      expect(game.frame.effects, 'a wrong use is short-lived').toEqual([])
      expect(game.frame.carried).toBeNull()
      expect(game.frame.lanterns.map((one) => [Math.round(one.x), Math.round(one.y)]), 'every lantern is back on its pin').toEqual(game.camp.lanterns.map((one) => [Math.round(game.board.pins[one.pin].x), Math.round(game.board.pins[one.pin].y)]))
    }
  })

  it('a log on the night fire: the circle of light bulges for a beat and whatever watches at its edge jumps back', () => {
    const game = at('meadow', { logs: 18 })
    tap(game, cursor(game)); run(game, 1.5)
    const fire = game.board.fire, away = () => [...game.frame.raccoons, ...game.frame.eyes].map((one) => Math.hypot(one.x - fire.x, one.y - fire.y))
    const reach = game.frame.blaze.reach, before = away()
    expect(before.length).toBeGreaterThan(0)
    game.press(pile(game, 'logs')); game.move({ x: game.board.pile, y: game.board.walkway - 30 }); game.move(fire); game.lift()
    let widest = reach, furthest = before.map(() => 0), hopped = false
    for (let i = 0; i < 30; i++) {
      game.step(1 / 60, null)
      widest = Math.max(widest, game.frame.blaze.reach); furthest = away().map((d, k) => Math.max(furthest[k] ?? 0, d))
      hopped = hopped || game.frame.raccoons.some((one) => one.hop > 0 && one.hop < 1)
    }
    expect(widest).toBeGreaterThan(reach * 1.1)
    before.forEach((d, k) => expect(furthest[k]).toBeGreaterThan(d + 30 * game.board.u))
    expect(hopped).toBe(true)
    // A beat later the circle is as it was, and they have crept back to its edge.
    run(game, 2)
    expect(game.frame.blaze.reach).toBeCloseTo(reach, 3)
    away().forEach((d, k) => expect(d).toBeCloseTo(before[k], 0))
  })

  it('a log on a fire that is out: the flare lights a smaller circle that comes and goes, and the raccoons at the ring jump back', () => {
    const game = at('meadow', { logs: 6 })
    tap(game, cursor(game)); run(game, 5 / GLIDE)
    expect(game.frame.blaze.lit).toBe(false)
    const fire = game.board.fire, nearest = () => Math.min(...game.frame.raccoons.map((one) => Math.hypot(one.x - fire.x, one.y - fire.y)))
    const before = nearest()
    game.press(pile(game, 'logs')); game.move({ x: game.board.pile, y: game.board.walkway - 30 }); game.move(fire); game.lift()
    let furthest = before, lit = false, widest = 0
    for (let i = 0; i < 30; i++) { game.step(1 / 60, null); furthest = Math.max(furthest, nearest()); if (game.frame.blaze.lit) { lit = true; widest = Math.max(widest, game.frame.blaze.reach) } }
    expect(lit).toBe(true)
    expect(widest).toBeGreaterThan(0.4 * game.board.reach[0])
    expect(widest).toBeLessThan(game.board.reach[0])
    expect(furthest).toBeGreaterThan(before + 30 * game.board.u)
    run(game, 2)
    expect(game.frame.blaze.lit).toBe(false)
    expect(planOf(game.camp).logs, 'a log dropped in the night lays nothing in').toBe(6)
  })

  it('answers a tap on the last piece of a row, or the only one, as on any other: a roll and a note, a wobble, a cup', () => {
    const game = at('ford', { logs: 5, water: 3 })
    const tapped = (supply: Supply, units: number) => { const heard = tap(game, onRow(game, supply, units)); game.step(1 / 60, null); return heard }
    expect(count(tapped('logs', 4.5), V.logTap(5))).toBe(1)
    expect(game.frame.rows.logs.tapped).toBe(4)
    expect(game.frame.rows.logs.tap).toBeGreaterThan(0)
    expect(game.camp.logs).toBe(5)
    run(game, 1)
    expect(count(tapped('water', 2.5), V.CAN_TAP)).toBe(1)
    expect(game.frame.rows.water.tapped).toBe(2)
    expect(game.camp.water).toBe(3)
    run(game, 1)
    const one = at('meadow', { logs: 1 })
    expect(count(tap(one, onRow(one, 'logs', 0.5)), V.logTap(1))).toBe(1)
    expect(one.camp.logs).toBe(1)
    // Pulled and not tapped, the last piece does not ring as a tap: the row follows the finger.
    const pulled = drag(game, onRow(game, 'logs', 4.5), onRow(game, 'logs', 9.5), 0.4)
    expect(count(pulled, V.logTap(5))).toBe(0)
    expect(game.camp.logs).toBe(10)
  })

  it('throws one marshmallow out of a tapped tin, and it hops back in', () => {
    const game = at('meadow'), tin = game.board.tin
    const heard = tap(game, tin)
    expect(count(heard, V.TIN_POP)).toBe(1)
    expect(count(heard, V.MARSH_LAID)).toBe(1)
    let furthest = 0, highest = 0, frames = 0
    for (let i = 0; i < 120; i++) {
      game.step(1 / 60, null)
      const carried = game.frame.carried
      if (!carried) continue
      frames++
      expect(carried.thing).toBe('marshmallow')
      furthest = Math.max(furthest, Math.hypot(carried.x - tin.x, carried.y - tin.y)); highest = Math.max(highest, tin.y - carried.y)
    }
    // Out past the rim, up in an arc, a moment on the map beside the tin, and home.
    expect(furthest).toBeGreaterThan(36 * game.board.u)
    expect(highest).toBeGreaterThan(6 * game.board.u)
    expect(frames).toBeGreaterThan(50)
    expect(game.frame.carried).toBeNull()
    expect(game.camp.trail).toEqual([])
  })

  it('agrees with the grid on which uses can change the plan', () => {
    for (const thing of OBJECTS) for (const action of ACTIONS) if (action !== 'pull' && action !== 'tap') expect(changesThePlan(thing, action)).toBe(use(thing, action).changes === 'stock')
  })

  it('clicks a lantern\'s wick on a tap, stands it on a free pin, and sends it back from a pin that is taken', () => {
    const game = at('summit')
    expect(count(tap(game, game.board.pins[0]), V.WICK_CLICK)).toBe(1)
    expect(game.camp.lanterns[0]).toEqual({ pin: 0, wick: 1 })
    drag(game, game.board.pins[0], game.board.pins[2], 0.3)
    expect(game.camp.lanterns[0].pin).toBe(2)
    run(game, 0.5)
    drag(game, game.board.pins[2], game.board.pins[1], 0.3)
    expect(game.camp.lanterns.map((one) => one.pin)).toEqual([2, 1])
    game.step(1 / 60, null)
    expect(game.frame.effects.map((one) => one.kind)).toContain('two-stack-sway-and-the-top-one-hops-back-to-its-pin')
  })

  it('flips a card on a tap, stamps it along the ruler as it is drawn, and rubs the strip out as it is drawn back', () => {
    const game = at('meadow'), home = cardHome(game.board, 'fire'), y = game.board.ruler.y
    expect(count(tap(game, home), V.CARD_FLIP)).toBe(1)
    expect(game.camp.cards.fire).toBe('doubled')
    tap(game, home)
    expect(game.camp.cards.fire).toBe('single')
    game.press(home); game.move({ x: hourX(game.board, 0), y }); game.move({ x: hourX(game.board, 4.2), y })
    expect(game.camp.strips.fire.length).toBe(4)
    expect(count(game.takeSounds(), V.CARD_STAMP)).toBe(4)
    game.move({ x: hourX(game.board, 40), y })
    expect(game.camp.strips.fire.length, 'never past the stamp that covers dawn').toBe(6)
    game.move({ x: hourX(game.board, 1.2), y })
    expect(game.camp.strips.fire.length).toBe(2)
    game.lift(); run(game, 1)
    expect(game.frame.cards.fire).toMatchObject({ x: home.x, y: home.y, held: false })
    expect(game.frame.strips.fire[0].stamps.map((one) => [one.hours.num, one.pieces.num])).toEqual([[1, 3], [2, 6]])
    expect(game.camp.changed, 'a pencil strip changes no night').toBe(false)
  })

  it('keeps two cards\' rows to be read against each other: the dial\'s card and the one stamped last before it, and the scout\'s second card under the first', () => {
    const game = at('birchwood'), home = cardHome(game.board, 'fire'), y = game.board.ruler.y
    const ring = { x: game.board.fire.x - 50 * game.board.u, y: game.board.fire.y }
    const stampTo = (hours: number) => { game.press(home); game.move({ x: hourX(game.board, 0), y }); game.move({ x: hourX(game.board, hours + 0.2), y }); game.lift(); run(game, 1) }
    stampTo(3)
    tap(game, ring); run(game, 0.5)
    stampTo(2)
    // Two logs an hour and three logs an hour, hour under hour: 2, 4, 6 and 3, 6.
    expect(game.frame.strips.fire.map((row) => [row.card, row.current, row.stamps.map((one) => one.pieces.num)])).toEqual([[0, false, [2, 4, 6]], [1, true, [3, 6]]])
    expect(rowsRead(game.frame.strips)).toMatchObject([{ user: 'fire', read: [{ card: 1 }, { card: 0 }], faint: [] }])
    // The night after, the scout turns the dial and stamps the next card: its row is read under the child's own.
    lay(game, 'logs', 24)
    night(game)
    const shown = game.frame.strips.fire.map((row) => row.card)
    expect(shown.length).toBe(3)
    expect(rowsRead(game.frame.strips)[0].read.map((row) => row.card)).toEqual([1, shown[2]])
    expect(shown[2]).toBe(2)
  })

  it('turns the fire\'s dial a notch on a tap, and unfolds and folds the ruler by its handle', () => {
    const game = at('birchwood')
    const ring = { x: game.board.fire.x - 50 * game.board.u, y: game.board.fire.y }
    expect(count(tap(game, ring), V.dialClick(1))).toBe(1)
    expect(game.camp.fire).toBe(1)
    tap(game, ring); tap(game, ring)
    expect(game.camp.fire).toBe(0)
    expect(game.board.hours).toBe(8)
    tap(game, sectionHandle(game.board))
    expect(game.camp.unfolded).toBe(1)
    expect(game.board.hours).toBe(10)
    tap(game, sectionHandle(game.board)); tap(game, { x: hourX(game.board, game.board.hours - 0.4), y: game.board.ruler.y })
    expect(game.board.hours).toBe(10)
  })

  it('lays a marshmallow trail where the finger goes over bare map, and at night a raccoon follows it', () => {
    const game = at('meadow'), tin = game.board.tin
    expect(count(tap(game, tin), V.TIN_POP)).toBe(1)
    expect(game.camp.trail).toEqual([])
    game.press(tin)
    for (let i = 1; i <= 20; i++) game.move({ x: tin.x + i * 12, y: tin.y - i * 6 })
    game.lift()
    expect(game.camp.trail.length).toBeGreaterThan(2)
    run(game, 0.1)
    game.camp.trail.forEach((cell, i) => expect(trailCell(game.board, game.frame.trail[i])).toBe(cell))
    expect(game.frame.trail.length).toBe(game.camp.trail.length)
    lay(game, 'logs', 18); tap(game, cursor(game)); run(game, 2)
    expect(game.frame.raccoons.some((one) => one.has === 'marshmallow')).toBe(true)
    // One is picked up again by a touch on it.
    const first = game.frame.trail[0], had = game.camp.trail.length
    game.press(first); game.lift()
    expect(game.camp.trail.length).toBe(had - 1)
  })

  it('lays no marshmallow under the shell\'s home control at the top centre, where a touch on it would go home', () => {
    // The control is 48 pixels across, 10 from the top edge, and a marshmallow answers a touch 24 pixels round its middle.
    for (const [w, h] of [[1180, 820], [700, 820]]) {
      const game = new Game(w, h, deserializeCamp({ v: STATE_VERSION, position: 'meadow' }), 1), home = { x: w / 2, y: 34 }
      game.press(game.board.tin)
      // Along the top of the map, straight through the control's place.
      for (let x = w * 0.3; x <= w * 0.7; x += 6) game.move({ x, y: 34 })
      game.lift()
      expect(game.camp.trail.length, `${w} by ${h}`).toBeGreaterThan(2)
      for (const cell of game.camp.trail) {
        const at = trailPoint(game.board, cell)
        expect(Math.hypot(at.x - home.x, at.y - home.y), `cell ${cell} at ${w} by ${h}`).toBeGreaterThanOrEqual(48)
      }
    }
  })
})

describe('the campers show what the plan gives them', () => {
  it('shows each want at dusk, and in the night each camper does what its taste makes it do', () => {
    const game = at('quarry', { shown: ['out-fire', 'out-lantern', 'span'] })
    expect(game.frame.places.cook.act).toBe('at-dusk')
    expect(Math.hypot(game.frame.places.cook.x - game.board.fire.x, game.frame.places.cook.y - game.board.fire.y)).toBeLessThan(110 * game.board.u)
    lay(game, 'logs', 8); lay(game, 'oil', 1)
    tap(game, cursor(game)); run(game, 2)
    expect(game.frame.places.reader.act).toBe('reads-by-lantern')
    expect(game.frame.places.sleeper.act).toBe('drags-the-bag-to-the-fire')
    run(game, 4 / GLIDE)
    expect(game.frame.places.reader.act).toBe('walks-into-the-stream')
    // The whole camp is dark at the middle of this night, so the secret plays on the way; then dawn, and the morning.
    run(game, 24)
    expect(game.frame.places.reader.act, 'found in the morning where the night left it').toBe('walks-into-the-stream')
    expect(game.frame.places.sleeper.act).toBe('wakes-frazzled')
    expect(game.frame.places.scout.act).toBe('tips-the-hat')
  })

  it('lets nobody who walks pass through a tent, a camper, a lantern or the fire', () => {
    const game = at('summit', { shown: ['out-fire', 'out-lantern', 'out-kettle'] }, 5)
    lay(game, 'logs', 10); lay(game, 'oil', 2); lay(game, 'water', 2)
    tap(game, cursor(game))
    const blocks = rounds(game.board)
    let walked = 0
    for (let i = 0; i < 60 * 20; i++) {
      game.step(1 / 60, null); game.takeSounds()
      for (const camper of game.board.campers) {
        const place = game.frame.places[camper.who]
        if (place.walk === 0 || !['walks-to-the-light', 'walks-into-the-stream', 'moves-in-with'].includes(place.act ?? '')) continue
        walked++
        const home = Math.hypot(place.x - camper.middle.x, place.y - camper.middle.y) < 60 * game.board.u, nearEnd = place.act === 'moves-in-with' && game.board.campers.some((other) => other.who !== camper.who && Math.hypot(place.x - other.head.x, place.y - other.head.y) < 60 * game.board.u)
        if (home || nearEnd) continue
        expect(open(game.board, place) || blocks.every((one) => Math.hypot(place.x - one.x, place.y - one.y) > one.r - 14 * game.board.u), `${camper.who} ${place.act} at ${Math.round(place.x)}, ${Math.round(place.y)}`).toBe(true)
      }
    }
    expect(walked).toBeGreaterThan(30)
  })

  it('keeps the raccoons as far out as the light reaches, and lets them come in when it is gone', () => {
    const game = at('birchwood', { shown: ['out-fire', 'dial'] })
    tap(game, { x: game.board.fire.x - 50 * game.board.u, y: game.board.fire.y }); tap(game, { x: game.board.fire.x - 50 * game.board.u, y: game.board.fire.y })
    lay(game, 'logs', 20)
    tap(game, cursor(game)); run(game, 3)
    expect(game.frame.blaze.lit).toBe(true)
    expect(game.frame.raccoons, 'behind a big fire they are only eyes').toEqual([])
    expect(game.frame.eyes.length).toBeGreaterThan(0)
    // The fire goes out at the middle of this night, so the secret plays first; then they stay as near as the dark allows.
    run(game, 14)
    expect(game.frame.blaze.lit).toBe(false)
    expect(game.frame.raccoons.length).toBeGreaterThan(2)
    for (const raccoon of game.frame.raccoons) expect(Math.hypot(raccoon.x - game.board.fire.x, raccoon.y - game.board.fire.y)).toBeLessThan(240 * game.board.u)
  })
})

describe('the idle ladder', () => {
  const glow: Guidance = { glow: 1, demo: null, demoIndex: -1 }, demo = (t: number): Guidance => ({ glow: 1, demo: t, demoIndex: 0 })

  it('glows on the one thing a child would want next, and shows one move, never a plan', () => {
    const game = at('ford')
    game.step(1 / 60, glow)
    expect(game.frame.halos.length, 'bare rods: the piles').toBe(2)
    game.step(1 / 60, demo(0.5))
    expect(game.frame.hand).not.toBeNull()
    expect(Math.abs(game.frame.hand!.y - rowEnd(game.board, 'logs', 0).y)).toBeLessThan(1)
    lay(game, 'logs', 12); lay(game, 'water', 2)
    run(game, 2)
    const before = JSON.stringify(game.saved())
    game.step(1 / 60, glow)
    expect(game.frame.halos, 'a plan is laid: the cursor').toEqual([{ x: hourX(game.board, 0), y: game.board.ruler.y - 14 * game.board.u, r: 34 * game.board.u }])
    for (let i = 0; i <= 10; i++) game.step(1 / 60, demo(i / 10))
    expect(game.frame.hand!.x).toBeGreaterThan(hourX(game.board, 0) + 60)
    expect(game.frame.hand!.x, 'the hand pushes a short way and never to dawn').toBeLessThan(hourX(game.board, 6) - 20)
    expect(JSON.stringify(game.saved()), 'the ghost hand changes nothing').toBe(before)
    expect(game.takeSounds()).toEqual([])
    game.step(1 / 60, null)
    expect(game.frame.halos).toEqual([])
    expect(game.frame.hand).toBeNull()
  })

  it('points at the pile that ran short after a short night, and at the fold after a night that held', () => {
    const short = at('meadow', { shown: ['out-fire', 'strip'] })
    lay(short, 'logs', 9); night(short)
    short.step(1 / 60, glow)
    expect(short.frame.halos).toEqual([{ x: short.board.pile, y: short.board.lanes[0] - 12 * short.board.u, r: 40 * short.board.u }])
    const held = at('meadow', { shown: ['out-fire', 'strip'] })
    lay(held, 'logs', 18); night(held)
    held.step(1 / 60, glow)
    expect(held.frame.halos).toEqual([{ x: held.board.corner.x, y: held.board.corner.y, r: 44 * held.board.u }])
  })
})

describe('whatever the finger does', () => {
  it('never does harm: random touches at every position leave a camp that reads back as it was saved, and a frame of finite numbers', () => {
    for (const position of ['meadow', 'ford', 'ridge', 'saddle', 'summit']) {
      const next = seeded(position.length * 31), game = at(position, {}, 9)
      for (let i = 0; i < 2500; i++) {
        const roll = next(), p = { x: next() * 1180, y: next() * 820 }
        if (roll < 0.1) game.press(p); else if (roll < 0.55) game.move(p); else if (roll < 0.65) game.lift()
        game.step(1 / 30, null)
        expect(game.takeSounds().length).toBeLessThanOrEqual(24)
        game.takeChanged()
        if (i % 50 === 0) {
          const saved = JSON.parse(JSON.stringify(game.saved()))
          expect(serializeCamp(deserializeCamp(saved)), `${position}, step ${i}`).toEqual(saved)
          for (const supply of SUPPLY_LANES) { expect(Number.isInteger(game.camp[supply])).toBe(true); expect(game.camp[supply]).toBeLessThanOrEqual(ROD_LENGTH[supply]) }
          const numbers = [game.frame.night.hour, game.frame.night.film, game.frame.dog.x, game.frame.dog.y, game.frame.blaze.reach, game.frame.fold.pull, ...Object.values(game.frame.places).flatMap((one) => [one.x, one.y, one.turn]), ...game.frame.raccoons.flatMap((one) => [one.x, one.y]), ...game.frame.lanterns.flatMap((one) => [one.x, one.y])]
          for (const value of numbers) expect(Number.isFinite(value), `${position}, step ${i}`).toBe(true)
        }
      }
    }
  })

  it('plays the same for the same seed and the same touches', () => {
    const play = (seed: number) => { const game = at('ford', {}, seed); lay(game, 'logs', 14); lay(game, 'water', 3); tap(game, cursor(game)); run(game, 6); return JSON.stringify(game.frame) }
    expect(play(4)).toBe(play(4))
    expect(play(4)).not.toBe(play(5))
  })

  it('keeps the camp and lays it out again when the surface changes size', () => {
    const game = at('quarry')
    lay(game, 'logs', 16); lay(game, 'oil', 3)
    game.resize(590, 410)
    game.step(1 / 60, null)
    expect(game.camp).toMatchObject({ logs: 16, oil: 3 })
    expect(game.board.w).toBe(590)
    expect(game.frame.places.reader.x).toBeLessThan(590)
    expect(game.frame.lanterns[0].x).toBeCloseTo(game.board.pins[0].x)
    expect(siteOf(game.camp)).toBe(game.board.site)
  })
})
