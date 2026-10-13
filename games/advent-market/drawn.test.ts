import { beforeAll, describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { LICK_SECONDS, type Fair } from './fair'
import type { Pose } from './folk'
import { READS, TONGUE } from './folkView'
import { BASKET, FOLK, REST, WHO, WINDOW, type Who } from './hall'
import { paintThing } from './thingArt'
import { useCanvases } from './paint'
import { BENCH, COLOUR_X, RING, SNOW, SOURCE, STALLS, WALK, slotAt, spotAt, whoAt, type Place } from './places'
import { DT, carry, drag, fairAt, made, run, tap } from './probe'
import { recording, recordingCanvases, type Recording, type Stamp } from './recording'
import { CRAFTS, LEFT, MARK, type Biscuit, type Craft, type Star, type Thing, type Wreath } from './things'
import { FairView } from './view'

// What the model moves is drawn, and what is drawn is touched where it is
// drawn. The real view draws into a recording surface the size of the stage,
// so a stamp's place on the surface is its place on the stage.

beforeAll(() => useCanvases(recordingCanvases().make))

function viewOf(): { view: FairView; surface: Recording } {
  const surface = recording(1180, 820)
  const view = new FairView({ getContext: () => surface })
  view.resize(1180, 820, 1)
  return { view, surface }
}

/** One frame of `fair`, as everything it put on the surface. */
function frame(view: FairView, surface: Recording, fair: Fair): { stamps: Stamp[]; inks: number[] } {
  surface.reset()
  view.draw(fair, null, TIERS[0])
  return { stamps: surface.stamps.map((s) => ({ ...s })), inks: [...surface.inks] }
}

const told = (f: { stamps: Stamp[]; inks: number[] }): string => JSON.stringify([f.stamps.map((s) => [s.x, s.y, s.w, s.h, s.turn].map((v) => Math.round(v * 100))), f.inks.map((v) => Math.round(v * 100))])

/** The stamps of `after` whose picture `before` does not show: what a change put on the surface. */
function fresh(before: Stamp[], after: Stamp[]): Stamp[] {
  const had = new Set(before.map((s) => s.image))
  return after.filter((s) => !had.has(s.image))
}

/** A fair at rest in which everybody holds `craft`. */
const holding = (craft: Craft | null): Fair => fairAt('candle', (save) => { if (craft) for (const who of WHO) save.held[who] = made(craft, 1) })

describe('what is drawn', () => {
  it('reads every value of a pose its fair-goer has: each one changes the picture', () => {
    const { view, surface } = viewOf()
    for (const who of WHO) {
      for (const key of READS[who]) {
        // Its hands are seen by what they hold, so a held thing is tried in every craft.
        const changed = [null, ...CRAFTS].some((craft) => {
          const fair = holding(craft)
          const pose: Pose = { ...fair.folk.pose(who) }
          const real = fair.folk.pose.bind(fair.folk)
          fair.folk.pose = (w: Who) => (w === who ? pose : real(w))
          const before = told(frame(view, surface, fair))
          pose[key] += key === 'squash' ? -0.2 : 0.45
          return told(frame(view, surface, fair)) !== before
        })
        expect(changed, `${who}: ${key}`).toBe(true)
      }
    }
  })

  it('moves nothing the picture does not read: every value a fair-goer\'s pose ever changes is one its drawing reads', () => {
    const KEYS = Object.keys(holding(null).folk.pose('goat')) as (keyof Pose)[]
    for (const who of WHO) {
      const moved = new Set<keyof Pose>()
      const watch = (fair: Fair, seconds: number): void => {
        let last = { ...fair.folk.pose(who) }
        for (let t = 0; t < seconds; t += DT) {
          fair.step(DT)
          const now = fair.folk.pose(who)
          for (const key of KEYS) if (Math.abs(now[key] - last[key]) > 1e-6) moved.add(key)
          last = { ...now }
        }
      }
      // Waiting, poked, watching a dip, walking, and given each craft in each colour.
      const fair = holding(null)
      watch(fair, 8)
      tap(fair, FOLK[who].touch.x, FOLK[who].touch.y)
      watch(fair, 2)
      carry(fair, { x: REST.x, y: REST.y }, { x: REST.x, y: REST.y + 150 })
      watch(fair, 3)
      fair.release(true)
      tap(fair, WALK.right.x, WALK.right.y)
      watch(fair, 2)
      for (const craft of CRAFTS) for (const colour of [0, 1, 2]) {
        const given = fairAt('star', (save) => { save.basket = [made(craft, colour)] })
        drag(given, slotAt(0), FOLK[who].touch)
        expect(given.held[who]?.craft ?? (given.playing ? craft : null), `${who} takes a ${craft}`).toBe(craft)
        watch(given, 6)
      }
      for (const key of moved) expect(READS[who], `${who} moves ${key}`).toContain(key)
      // And each of them moves most of what it has.
      // Middle-sized things in three colours leave a few still: his mouth is on the mouthpiece, and her fist droops only for a thin candle.
      expect(READS[who].filter((key) => !moved.has(key)).length, who).toBeLessThanOrEqual(3)
    }
  })

  it('draws a thing in a hand where a finger finds it, in every hand and every craft', () => {
    const { view, surface } = viewOf()
    const bare = frame(view, surface, holding(null)).stamps
    for (const craft of CRAFTS) {
      const fair = holding(craft)
      const things = fresh(bare, frame(view, surface, fair).stamps)
      const held = Object.fromEntries(WHO.map((who) => [who, craft])) as Record<Who, Craft>
      for (const who of WHO) {
        // The stamp that answers as this fair-goer and lies outside its own body is the thing it holds.
        const mine = things.filter((s) => { const spot = spotAt(s.x, s.y, { place: 'candle', covered: false, things: 0, finished: false, held }); return spot.kind === 'who' && spot.who === who })
        expect(mine.length, `${who} holds a ${craft}`).toBeGreaterThan(0)
      }
      // Nothing a hand holds is drawn where a finger would find something else.
      expect(things.length, craft).toBeLessThanOrEqual(WHO.length)
      for (const s of things) expect(spotAt(s.x, s.y, { place: 'candle', covered: false, things: 0, finished: false, held }).kind, `${craft} at ${Math.round(s.x)}, ${Math.round(s.y)}`).toBe('who')
    }
  })

  it('draws the piece on each bench, the thing in the hand and the basket in the snow where they are touched', () => {
    const { view, surface } = viewOf()
    for (const stall of STALLS.filter((s) => s !== 'candle')) {
      const empty = frame(view, surface, fairAt(stall)).stamps
      const fair = fairAt(stall, (save) => { (save[stall] as unknown) = made(stall, 2) })
      const piece = fresh(empty, frame(view, surface, fair).stamps)
      expect(piece.some((s) => Math.hypot(s.x - BENCH[stall].x, s.y - BENCH[stall].y) < 40), stall).toBe(true)
      // Carried, it is under the finger.
      const to = { x: 300, y: 300 }
      carry(fair, BENCH[stall], to)
      run(fair, 0.3)
      expect(fair.carry, stall).not.toBeNull()
      expect(frame(view, surface, fair).stamps.some((s) => Math.hypot(s.x - to.x, s.y - to.y) < 60), `${stall} carried`).toBe(true)
    }
    const hung = frame(view, surface, fairAt('door')).stamps
    const out = fairAt('door', (save) => { save.finished = true })
    const snow = fresh(hung, frame(view, surface, out).stamps)
    expect(snow.some((s) => spotAt(s.x, s.y, { place: 'door', covered: false, things: 0, finished: true }).kind === 'basket')).toBe(true)
    expect(snow.some((s) => Math.hypot(s.x - SNOW.x, s.y - (SNOW.y - 40)) < 80)).toBe(true)
  })

  it('draws the snow swirl of a tapped window at every tier: on the lowest, which lets no snow fall, the tap is still answered in sight', () => {
    for (const tier of TIERS) {
      const { view, surface } = viewOf()
      const fair = fairAt('candle')
      const at = (f: Fair) => { surface.reset(); view.draw(f, null, tier); return surface.stamps.map((s) => ({ ...s })) }
      // The snow's picture is the one the top tier stamps at rest and the lowest does not.
      const rest = fairAt('candle')
      surface.reset(); view.draw(rest, null, TIERS[TIERS.length - 1])
      const low = surface.stamps.map((s) => ({ ...s }))
      surface.reset(); view.draw(rest, null, TIERS[0])
      const snow = fresh(low, surface.stamps.map((s) => ({ ...s })))
      expect(snow).toHaveLength(1)
      expect(Math.abs(snow[0].x - (WINDOW.x + WINDOW.w / 2))).toBeLessThan(WINDOW.w / 2)
      const inPane = (s: Stamp) => s.image === snow[0].image
      const still = at(fair)
      // What falls behind the glass with no tap: the snow on the tiers that have it, nothing on the one that has not.
      expect(still.filter(inPane).length, `tier ${TIERS.indexOf(tier)}`).toBe(tier.snow ? 1 : 0)
      tap(fair, WINDOW.x + WINDOW.w / 2, WINDOW.y + 80)
      expect(fair.takeSounds().map((sound) => sound.name)).toEqual(['window'])
      fair.step(DT)
      const first = at(fair).filter(inPane)
      expect(first.length, `tier ${TIERS.indexOf(tier)}`).toBe(1)
      // And it swirls: the snow is somewhere else a moment later.
      run(fair, 0.2)
      const next = at(fair).filter(inPane)
      expect(next.length).toBe(1)
      expect(Math.abs(next[0].x - first[0].x) + Math.abs(next[0].y - first[0].y)).toBeGreaterThan(1)
      // Once the swirl has died down, a tier without snow is back to its painted drifts.
      run(fair, 3)
      expect(at(fair).filter(inPane).length, `tier ${TIERS.indexOf(tier)}`).toBe(tier.snow ? 1 : 0)
    }
  })

  it('draws the goat\'s tongue going over its lip at each drop, for a moment of the game\'s clock, and not otherwise', () => {
    const { view, surface } = viewOf()
    const fair = fairAt('candle')
    run(fair, 0.5)
    const fills = () => { surface.reset(); view.draw(fair, null, TIERS[0]); return surface.fills }
    const dry = fills()
    // A drop lands in the wax.
    fair.dipping.events.push({ type: 'plip', size: 4, variant: 0 })
    fair.drain()
    expect(fair.takeSounds().map((sound) => sound.name)).toContain('lick')
    expect(fair.lick).toBe(0)
    // The tongue is one fresh fill at its mouth, and it moves along the lip.
    const places: number[] = []
    for (let t = 0; t < LICK_SECONDS - DT; t += DT) {
      fair.step(DT)
      expect(fills(), `${t}`).toBe(dry + 1)
      const lick = fair.lick / LICK_SECONDS
      places.push(TONGUE.x + lick * TONGUE.reach)
    }
    expect(places[places.length - 1] - places[0]).toBeGreaterThan(TONGUE.reach * 0.7)
    // Its mouth is on the goat: the tongue comes out inside its body's reach, at the front of its muzzle.
    expect(whoAt(FOLK.goat.x + TONGUE.x, FOLK.goat.foot + TONGUE.y)).toBe('goat')
    run(fair, 0.2)
    expect(fills()).toBe(dry)
    // A put-away finds the tongue in.
    fair.dipping.events.push({ type: 'plip', size: 4, variant: 0 })
    fair.drain()
    fair.park()
    expect(fills()).toBe(dry)
  })

  it('hops a tapped colour and lights a tapped lantern where they stand, and keeps the basket on the counter under its things', () => {
    const { view, surface } = viewOf()
    const fair = fairAt('star')
    const before = frame(view, surface, fair).stamps
    tap(fair, COLOUR_X[0], SOURCE.y)
    fair.step(DT)
    expect(fresh(before, frame(view, surface, fair).stamps).some((s) => Math.abs(s.x - COLOUR_X[0]) < SOURCE.rx && Math.abs(s.y - SOURCE.y) < SOURCE.ry + 30)).toBe(true)
    // The walking lanterns stand painted in the front of the hall; the one that is tapped is lit where it stands.
    for (const lantern of [WALK.left, WALK.right]) {
      const walker = fairAt('star')
      tap(walker, lantern.x, lantern.y)
      walker.step(DT)
      const on = (stamps: Stamp[]) => stamps.filter((s) => Math.hypot(s.x - lantern.x, s.y - lantern.y) < lantern.r && s.w < 400).length
      expect(on(frame(view, surface, walker).stamps), `lantern at ${lantern.x}`).toBe(on(before) + 1)
    }
    expect(before.some((s) => Math.abs(s.x - BASKET.x) < 30 && Math.abs(s.y - BASKET.y) < 90)).toBe(true)
  })

  it('carries the tapped lantern\'s light along with the lantern as the hall slides by', () => {
    const { view, surface } = viewOf()
    for (const lantern of [WALK.left, WALK.right]) {
      const fair = fairAt('star')
      tap(fair, lantern.x, lantern.y)
      const light = view.sprites.of('light').image, front = view.sprites.of('front:star').image
      const at = (seconds: number) => {
        run(fair, seconds)
        const stamps = frame(view, surface, fair).stamps
        const lit = stamps.filter((s) => s.image === light && Math.abs(s.y - lantern.y - 10) < 2)
        expect(lit, `lantern at ${lantern.x}`).toHaveLength(1)
        return { light: lit[0].x, front: stamps.find((s) => s.image === front)!.x }
      }
      const early = at(0.3), late = at(0.4)
      expect(Math.abs(late.front - early.front)).toBeGreaterThan(100)
      expect(late.light - early.light).toBeCloseTo(late.front - early.front, 3)
      expect(early.light - early.front).toBeCloseTo(lantern.x - 590, 0)
    }
  })

  it('lets the colour of the paper fall over the faces when a candle stands behind the star, and only then', () => {
    const { view, surface } = viewOf()
    const lantern = (change: (star: Star) => void = () => {}, place: Place = 'star') => {
      const fair = fairAt(place, (save) => { save.star = { ...(made('star', 2) as Star), on: made('candle') }; change(save.star) })
      const tints = ([0, 1, 2] as const).map((c) => view.sprites.of(`tint${c}`).image)
      return frame(view, surface, fair).stamps.filter((s) => tints.includes(s.image as CanvasImageSource)).map((s) => ({ colour: tints.indexOf(s.image as CanvasImageSource), x: s.x, y: s.y, w: s.w, h: s.h }))
    }
    const lit = lantern()
    // One pool at the star, and one on each of the five faces: the goat's too, which is drawn after the light.
    expect(lit).toHaveLength(1 + WHO.length)
    expect(lit.every((tint) => tint.colour === 2)).toBe(true)
    for (const who of WHO) {
      const eyes = FOLK[who].eyes
      const own = lit.filter((tint) => Math.hypot(tint.x - eyes.x, tint.y - eyes.y) < 1)
      expect(own, who).toHaveLength(1)
      // About a head and shoulders across: enough to colour the face, and far from the size of the surface.
      expect(own[0].w, who).toBeGreaterThan(240)
      expect(own[0].w, who).toBeLessThan(400)
    }
    expect(lantern((star) => { star.colour = 0 })[0].colour).toBe(0)
    expect(lantern((star) => { star.on = null })).toEqual([])
    expect(lantern((star) => { star.on = made('biscuit') })).toEqual([])
    expect(lantern((star) => { star.on!.mark = MARK.blown })).toEqual([])
    expect(lantern(() => {}, 'wreath')).toEqual([])
  })

  it('springs the twigs apart round a candle set in the ring, with needles in the air, and cracks a biscuit a candle stands in', () => {
    const paint = (thing: Thing) => { const g = recording(); paintThing(g, thing, true); return g }
    const wreath = made('wreath', 1) as Wreath, full = { ...wreath, twigs: wreath.twigs.map(() => 1) }
    const plain = paint(full).inks, parted = paint({ ...full, on: made('candle') }).inks
    // Some twig is no longer where it was bound.
    expect(plain.filter((ink) => !parted.includes(ink)).length).toBeGreaterThan(0)
    const fair = fairAt('wreath', (save) => { save.wreath = full; save.basket = [made('candle')] })
    drag(fair, slotAt(0), BENCH.wreath)
    expect(fair.motes.filter((mote) => mote.kind === 'needles').length).toBeGreaterThan(6)
    // The crack is one more stroke than the biscuit and the candle make apart.
    const biscuit = made('biscuit', 1) as Biscuit, candle = made('candle')
    expect(paint({ ...biscuit, on: candle }).strokes).toBe(paint(biscuit).strokes + paint(candle).strokes + 1)
    expect(paint({ ...biscuit, on: made('star') }).strokes).toBe(paint(biscuit).strokes + paint(made('star')).strokes)
  })

  it('ties a star to the top of the ring with one spin: it turns once on its way, lands at the top, and is not on the ring before it lands', () => {
    const { view, surface } = viewOf()
    const fair = fairAt('wreath', (save) => { save.basket = [made('star', 1)] })
    const bare = view.sprites.thing(fair.pieces.wreath, true).image
    drag(fair, slotAt(0), BENCH.wreath)
    expect(fair.pieces.wreath.on?.craft).toBe('star')
    expect(fair.flight?.spin).toBe(true)
    const flying = view.sprites.thing(fair.flight!.thing, false).image
    const turns: number[] = []
    let last = { x: 0, y: 0 }
    while (fair.flight) {
      const stamps = frame(view, surface, fair).stamps
      const star = stamps.find((s) => s.image === flying)!
      turns.push(star.turn)
      last = star
      // The ring is still the bare ring while the star is in the air.
      expect(stamps.some((s) => s.image === bare)).toBe(true)
      fair.step(DT)
    }
    // A whole turn: every quarter of it is passed through.
    for (const quarter of [-Math.PI / 2, 0, Math.PI / 2]) expect(turns.some((turn) => Math.abs(turn - quarter) < 0.4), `${quarter}`).toBe(true)
    expect(turns.some((turn) => Math.abs(Math.abs(turn) - Math.PI) < 0.4)).toBe(true)
    expect(Math.hypot(last.x - RING.x, last.y - (RING.y - RING.r))).toBeLessThan(30)
    expect(frame(view, surface, fair).stamps.some((s) => s.image === bare)).toBe(false)
  })

  it('leaves a bead of wax on every folded point of a dipped star and on the end of every twig of a dipped wreath', () => {
    const fills = (thing: Thing) => { const g = recording(); paintThing(g, thing, false); return g.fills }
    const beads = (thing: Thing) => fills({ ...thing, left: LEFT.wax, tint: 1 } as Thing) - fills(thing)
    const star = (points: number): Thing => ({ ...(made('star', 0) as Star), size: 2, points })
    const wreath = (twigs: number): Thing => ({ ...(made('wreath', 0) as Wreath), twigs: Array.from({ length: 12 }, (_, i) => (i < twigs ? 1 : 0)) })
    for (const of of [star, wreath]) {
      const each = beads(of(2)) - beads(of(1))
      expect(each).toBeGreaterThan(0)
      for (const n of [3, 5, 7]) expect(beads(of(n)) - beads(of(1))).toBe(each * (n - 1))
    }
  })
})
