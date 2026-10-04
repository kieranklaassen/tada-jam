import { describe, expect, it } from 'vitest'
import { boardFor, streamPoint } from './board'
import { LADDER } from './config'
import { sparePlaces, towerPlaces } from './consequences'
import { apart, obstacles, pinSpots } from './ground'
import { normalise, runNight, type Plan } from './night'
import { EYES_FROM, ashAt, boundAt, fireEdge, lightsAt, lurkersAt, raccoonBearings, raccoonLines } from './nightView'
import { open } from './paths'
import { reactions } from './tastes'
import { SITES, type Site } from './world'

const every = (): Site[] => LADDER.flatMap((position) => [...SITES[position]])
const name = (site: Site) => `${site.position} ${SITES[site.position].indexOf(site)}`
const set = (site: Site, part: Partial<Plan>) => { const board = boardFor(1180, 820, site), plan = normalise(site, part), night = runNight(site, plan); return { board, plan, night, acts: reactions(site, night, towerPlaces(site, plan, night), sparePlaces(site, plan, night)) } }
const away = (board: ReturnType<typeof boardFor>, p: { x: number; y: number }) => Math.hypot(p.x - board.fire.x, p.y - board.fire.y) / board.u

describe('what is lit', () => {
  it('is nothing at dusk, and each light until the moment its stock is gone', () => {
    const { board, plan, night } = set(SITES.quarry[0], { logs: 12, fire: 1, oil: 2 })
    expect(lightsAt(board, plan, night, 0)).toMatchObject({ fire: false, lanterns: false })
    expect(lightsAt(board, plan, night, 3.9)).toMatchObject({ fire: true, lanterns: true, reach: board.reach[1] })
    expect(lightsAt(board, plan, night, 4)).toMatchObject({ fire: false, lanterns: true })
    expect(lightsAt(board, plan, night, 6)).toMatchObject({ fire: false, lanterns: false })
  })
})

describe('where each camper is bound', () => {
  it('shows every want at dusk: the cook stands at the fire, the scout stands by its tent, the rest lie in their bags', () => {
    for (const site of every()) {
      const { board, plan, night, acts } = set(site, {}), bound = boundAt(board, plan, night, acts, 0, 'dusk')
      expect(Object.keys(bound).sort()).toEqual(site.tents.map((tent) => tent.camper).sort())
      for (const camper of board.campers) {
        const now = bound[camper.who]!
        expect(now.act).toBe('at-dusk')
        expect(now.upright, camper.who).toBe(camper.who === 'cook' || camper.who === 'scout')
        if (camper.who === 'cook') { expect(away(board, now.to), name(site)).toBeLessThan(110); expect(open(board, now.to), name(site)).toBe(true) }
        else if (camper.who !== 'scout') expect(now.to).toEqual(camper.at)
      }
    }
  })

  it('sends the reader to the fire when the lantern runs dry, and into the stream when the fire is out too', () => {
    const { board, plan, night, acts } = set(SITES.quarry[0], { logs: 8, fire: 0, oil: 1 })
    expect(boundAt(board, plan, night, acts, 1, 'night').reader).toMatchObject({ act: 'reads-by-lantern', upright: false })
    const walking = boundAt(board, plan, night, acts, 3.2, 'night').reader!
    expect(walking).toMatchObject({ act: 'walks-to-the-light', upright: true, since: 3 })
    expect(away(board, walking.to)).toBeLessThan(120)
    const wet = boundAt(board, plan, night, acts, 5, 'night').reader!
    expect(wet.act).toBe('walks-into-the-stream')
    expect(wet.to).toEqual(streamPoint(board, board.campers.find((one) => one.who === 'reader')!.middle))
  })

  it('sends the reader, with the fire out, to the nearer of two lanterns', () => {
    let walked = 0
    for (const site of SITES.summit) {
      const pins = pinSpots(site).length
      for (let first = 0; first < pins; first++) for (let second = 0; second < pins; second++) {
        if (first === second) continue
        const { board, plan, night, acts } = set(site, { logs: 4, fire: 0, oil: 12, lanterns: [{ pin: first, wick: 0 }, { pin: second, wick: 0 }] })
        const reader = board.campers.find((one) => one.who === 'reader')
        if (!reader) continue
        const bound = boundAt(board, plan, night, acts, 3, 'night').reader!
        if (bound.act !== 'walks-to-the-light' || plan.logs > 0 && 3 < night.fire.until.num / night.fire.until.den) continue
        walked++
        const far = (pin: number) => Math.hypot(board.pins[pin].x - reader.middle.x, board.pins[pin].y - reader.middle.y)
        const nearer = far(first) <= far(second) ? first : second, other = nearer === first ? second : first
        const to = (pin: number) => Math.hypot(board.pins[pin].x - bound.to.x, board.pins[pin].y - bound.to.y)
        expect(to(nearer), `${name(site)} pins ${first} and ${second}`).toBeLessThan(to(other))
      }
    }
    expect(walked).toBeGreaterThan(0)
  })

  it('sends the reader on to the lantern when the fire it walked to goes out, and keeps it there till morning', () => {
    // The lantern on the scout's pin, a small fire, and a reader whose tent is dark from dusk.
    const site = SITES.quarry[0], scouts = site.pins.findIndex((pin) => pin.near.includes('scout'))
    const { board, plan, night, acts } = set(site, { logs: 6, fire: 0, oil: 4, lanterns: [{ pin: scouts, wick: 0 }] })
    const reader = board.campers.find((one) => one.who === 'reader')!, pin = board.pins[scouts]
    expect(acts.filter((one) => one.camper === 'reader').map((one) => one.act)).toEqual(['walks-to-the-light'])
    const lit = boundAt(board, plan, night, acts, 1, 'night').reader!, after = boundAt(board, plan, night, acts, 4, 'night').reader!, dawn = boundAt(board, plan, night, acts, night.hours, 'night').reader!
    const near = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y) / board.u
    // Six logs at two an hour: the fire burns three hours. While it burns the reader is at the nearer of the two lights.
    const fireNearer = near(board.fire, reader.middle) < near(pin, reader.middle)
    expect(near(lit.to, fireNearer ? board.fire : pin)).toBeLessThan(fireNearer ? 120 : 60)
    // With the fire out it is at the lantern, which still burns, and it is still there at dawn.
    expect(near(after.to, pin)).toBeLessThan(60)
    expect(near(dawn.to, pin)).toBeLessThan(60)
    expect(after.act).toBe('walks-to-the-light')
  })

  it('brings a sleeper who is outside the circle inside it, on its own side', () => {
    const { board, plan, night, acts } = set(SITES.quarry[0], { logs: 16, fire: 0, oil: 3 }), sleeper = board.campers.find((one) => one.who === 'sleeper')!
    const dragged = boundAt(board, plan, night, acts, 1, 'night').sleeper!
    expect(dragged.act).toBe('drags-the-bag-to-the-fire')
    expect(away(board, dragged.to) * board.u).toBeLessThan(board.reach[0])
    expect(away(board, dragged.to)).toBeLessThan(away(board, sleeper.at))
    expect(away(board, dragged.to)).toBeGreaterThan(90)
  })

  it('moves the small one in beside whoever still has light', () => {
    const { board, plan, night, acts } = set(SITES.ridge[1], { logs: 12, oil: 1, water: 3 })
    const moved = boundAt(board, plan, night, acts, 3.5, 'night').small!
    expect(moved.act).toBe('moves-in-with')
    const host = board.campers.find((one) => one.who === moved.withCamper)!
    expect(Math.hypot(moved.to.x - host.head.x, moved.to.y - host.head.y)).toBeLessThan(30)
  })

  it('wakes each camper in the morning the way its night went, and keeps the scout\'s opinion for the morning', () => {
    const { board, plan, night, acts } = set(SITES.quarry[0], { logs: 40, fire: 2, oil: 3 })
    expect(boundAt(board, plan, night, acts, 8, 'night').scout!.act).toBe('keeps-watch')
    const morning = boundAt(board, plan, night, acts, 8, 'morning')
    expect(morning.scout!.act).toBe('tips-the-hat')
    expect(morning.reader!.act).toBe('wakes-rested')
    const bad = set(SITES.quarry[0], { logs: 6, fire: 1, oil: 0 }), after = boundAt(bad.board, bad.plan, bad.night, bad.acts, 8, 'morning')
    expect(after.reader!.act, 'the night left the reader standing in the stream, and there it is found').toBe('walks-into-the-stream')
    expect(after.sleeper!.act).toBe('wakes-frazzled')
  })

  it('reads the same at an hour whichever way the cursor came to it', () => {
    const { board, plan, night, acts } = set(SITES.summit[0], { logs: 20, fire: 1, oil: 4, water: 2 })
    const forwards = [1, 3, 5, 7].map((hour) => boundAt(board, plan, night, acts, hour, 'night'))
    const backwards = [7, 5, 3, 1].map((hour) => boundAt(board, plan, night, acts, hour, 'night')).reverse()
    expect(backwards).toEqual(forwards)
  })

  it('sends nobody who walks upright to a place that is not open, at any site, on any of these plans', () => {
    for (const site of every()) for (const part of [{}, { logs: 6, oil: 1, water: 1 }, { logs: 30, fire: 1, oil: 3, water: 4 }, { logs: 60, fire: 9, oil: 12, water: 10, lanterns: [{ pin: 0, wick: 1 as const }] }]) {
      const { board, plan, night, acts } = set(site, part)
      for (const hour of [0.5, night.hours / 2, night.hours - 0.1]) for (const [who, now] of Object.entries(boundAt(board, plan, night, acts, hour, 'night'))) {
        if (!now.upright || now.act === 'moves-in-with' || now.act === 'walks-into-the-stream' || now.act === 'keeps-watch') continue
        expect(open(board, now.to), `${who} ${now.act} at ${name(site)}`).toBe(true)
      }
    }
  })
})

describe('the ash', () => {
  it('is none at dusk, and by any hour what was used up to it', () => {
    const { board, plan, night } = set(SITES.spring[0], { logs: 6, fire: 1, water: 1 })
    expect(ashAt(board.site, night, 0)).toEqual({ fire: null, lantern: null, kettle: null })
    const ash = ashAt(board.site, night, 3.5)
    expect(ash.fire).toEqual({ amount: { pieces: 3, hours: 1 }, until: 2 })
    expect(ash.lantern).toBeNull()
    expect(ash.kettle).toEqual([{ hour: 0, cups: 4, wanted: 4 }, { hour: 1, cups: 2, wanted: 4 }, { hour: 2, cups: 0, wanted: 4 }, { hour: 3, cups: 0, wanted: 4 }])
    expect(plan.water).toBe(1)
  })
})

describe('the raccoons', () => {
  it('have lines to the fire that cross no tent and no camper, at every site', () => {
    for (const site of every()) for (const { bearing, floor } of raccoonLines(site)) for (let r = floor; r <= 330; r += 4) {
      const at = { x: Math.cos(bearing) * r, y: Math.sin(bearing) * r }
      for (const block of obstacles(site)) { if (block.name === 'fire' || block.name === 'dog' || block.name === 'tin') continue; expect(apart(at, block.at), `${block.name} at ${name(site)}`).toBeGreaterThan(block.radius + 8) }
    }
  })

  it('come exactly as far as the dark reaches and no further, and are only eyes behind a big fire', () => {
    for (const site of every()) for (const part of [{ logs: 0 }, { logs: 9, fire: 0, oil: 2 }, { logs: 60, fire: 9, oil: 12, lanterns: [{ pin: 0, wick: 1 as const }] }]) {
      const { board, plan, night } = set(site, part)
      expect(lurkersAt(board, plan, night, 0)).toEqual([])
      for (const hour of [0.2, 2, night.hours - 0.2]) {
        const lit = lightsAt(board, plan, night, hour)
        for (const lurker of lurkersAt(board, plan, night, hour)) {
          if (lit.fire) expect(away(board, lurker.to) * board.u, name(site)).toBeGreaterThan(lit.reach)
          if (lit.lanterns) for (const lantern of plan.lanterns) expect(Math.hypot(lurker.to.x - board.pins[lantern.pin].x, lurker.to.y - board.pins[lantern.pin].y), name(site)).toBeGreaterThan(lantern.wick === 1 ? board.lampHigh : board.lampLow)
          if (!lit.fire && !lit.lanterns && lurker.has === 'nothing') expect(lurker.away).toBeLessThan(200)
        }
      }
    }
    const big = set(SITES.birchwood[0], { logs: 40, fire: 2 })
    for (const lurker of lurkersAt(big.board, big.plan, big.night, 3)) expect(lurker.away).toBeGreaterThan(EYES_FROM)
  })

  it('take the snack tin when it lies in the dark, and leave it when the fire is big enough to light it', () => {
    const small = set(SITES.birchwood[0], { logs: 16, fire: 0 }), big = set(SITES.birchwood[0], { logs: 40, fire: 2 })
    expect(lurkersAt(small.board, small.plan, small.night, 3).map((one) => one.has)).toEqual(['nothing', 'nothing', 'nothing', 'tin'])
    expect(lurkersAt(big.board, big.plan, big.night, 3).every((one) => one.has === 'nothing')).toBe(true)
    expect(fireEdge(big.board, big.board.campers[0])).toEqual(fireEdge(big.board, big.board.campers[0]))
    expect(raccoonBearings(SITES.meadow[0]).length).toBe(4)
    // In most gaps a raccoon can come right up to the ring of stones.
    expect(every().flatMap((site) => raccoonLines(site)).filter((line) => line.floor === 72).length).toBeGreaterThan(every().length * 2)
  })
})
