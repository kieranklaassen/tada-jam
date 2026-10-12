import { describe, expect, it } from 'vitest'
import { FRAME, mat, named, putOn, run, tap, tapBasket, type Heard } from './drive'
import { BASKET, FIELD, feetCross, inField } from './layout'
import { PIECES, PIECE_IDS, type PieceId } from './pieces'
import { CALL_ROCK, OUT_ORDER, SET_UP_REACH } from './scenesBasket'
import { stand } from './stack'
import { RIDE_BOUNCES, TROT, TROT_FROM, passesUnder } from './scenesCarry'
import { BREATH, BREATH_SWELL, rocksToSleep } from './scenesClimb'
import { HOOT, HOOT_SWELL } from './scenesGhost'
import { strainOf } from './tastes'
import { World } from './world'

// The ten scenes. Each is caused by a tap, puts its outcome into the things' resting places before its first
// beat (so a save at that moment holds its end), plays on the world's clock for at most ten seconds, gives way
// to any touch and is silent from that frame, and is never played by a load.

type Setup = { name: string; make: () => World; cause: (world: World) => void; saves: boolean }
const there = { x: 520, y: 590 }

const SCENES: Setup[] = [
  { name: 'the ghost', make: () => mat({ 'doll-tall': there, 'doll-small': { x: 700, y: 560 }, 'doll-round': { x: 380, y: 600 } }), cause: (w) => putOn(w, 'silk', 'doll-tall'), saves: true },
  { name: 'the ride', make: () => mat({ horse: there, 'arch-large': { x: 720, y: 560 } }), cause: (w) => putOn(w, 'doll-round', 'horse'), saves: true },
  { name: 'the tunnel', make: () => mat({ 'arch-large': there }), cause: (w) => putOn(w, 'horse', 'arch-large'), saves: true },
  { name: 'the slide', make: () => mat({ 'arch-large': there }), cause: (w) => putOn(w, 'doll-small', 'arch-large'), saves: true },
  { name: 'asleep', make: () => mat({ 'arch-large': { ...there, turned: true } }), cause: (w) => putOn(w, 'doll-tall', 'arch-large'), saves: true },
  { name: 'the tower bows', make: () => mat({ 'doll-round': there }), cause: (w) => putOn(w, 'doll-tall', 'doll-round'), saves: true },
  { name: 'the carried horse', make: () => mat({ 'doll-round': there }), cause: (w) => putOn(w, 'horse', 'doll-round'), saves: true },
  { name: 'the march', make: () => mat({ 'doll-tall': there, horse: { x: 700, y: 600 }, 'arch-large': { x: 400, y: 560, turned: true }, silk: { x: 600, y: 520 } }), cause: tapBasket, saves: true },
  { name: 'the call', make: () => mat({}), cause: tapBasket, saves: false },
  { name: 'out again', make: () => new World({ ...mat({}).places(), 'doll-tall': { at: 'basket', x: 0, y: 0, on: null, turned: false }, horse: { at: 'basket', x: 0, y: 0, on: null, turned: false }, 'arch-small': { at: 'basket', x: 0, y: 0, on: null, turned: false } }, 'tipped'), cause: tapBasket, saves: true },
]

/** Plays a scene to its end and returns its sounds and how long it lasted. */
function toTheEnd(world: World): { heard: Heard[]; seconds: number } {
  const heard: Heard[] = [], from = world.time
  for (let i = 0; i < 60 * 15 && world.scene; i++) heard.push(...run(world, FRAME))
  return { heard, seconds: world.time - from }
}

describe.each(SCENES)('$name', ({ name, make, cause, saves }) => {
  it('starts on the tap, with its outcome already where a save takes it from', () => {
    const world = make(), before = world.changes
    cause(world)
    expect(world.scene, name).not.toBeNull()
    // A save is asked for at once when the scene changes anything, and never for the call, which changes nothing.
    expect(world.changes > before).toBe(saves)
    const saved = { places: world.places(), basket: world.basket }
    world.takeSounds()
    const { heard, seconds } = toTheEnd(world)
    expect(world.scene).toBeNull()
    // The beats only show the way there: when the scene is over, nothing rests anywhere but where it was saved.
    expect({ places: world.places(), basket: world.basket }).toEqual(saved)
    for (const p of world.pieces) expect([p.px, p.py, p.lift, p.led], p.def.id).toEqual([p.x, p.y, 0, false])
    expect(seconds).toBeLessThanOrEqual(10)
    expect(heard.filter((sound) => sound.scene).length).toBeGreaterThanOrEqual(3)
  })

  it('gives way to any touch: it ends at its saved outcome, silent from that frame, and the touch is an ordinary touch', () => {
    for (const after of [0.2, 1.3, 2.6]) {
      const whole = make()
      cause(whole)
      const saved = whole.places()
      const world = make()
      cause(world)
      world.takeSounds()
      run(world, after)
      const hushes = world.hushes
      // A tap on the window pane, far from everything.
      tap(world, 40, 60)
      expect(world.scene).toBeNull()
      expect(world.hushes).toBe(hushes + 1)
      expect(world.places()).toEqual(saved)
      for (const p of world.pieces) expect([p.px, p.py, p.led], `${p.def.id} after ${after}s`).toEqual([p.x, p.y, false])
      // The touch itself is answered, and nothing of the scene sounds with it or after it.
      expect(named(world.takeSounds())).toEqual(['tink'])
      expect(run(world, 12).filter((sound) => sound.scene)).toEqual([])
    }
  })

  it('is not played by a load: the saved mat opens still and silent', () => {
    for (const after of [0, 1.3]) {
      const world = make()
      cause(world)
      run(world, after)
      const loaded = new World(world.places(), world.basket)
      expect(loaded.scene).toBeNull()
      expect(run(loaded, 3)).toEqual([])
      for (const p of loaded.pieces) expect([p.px, p.py, p.flight, p.led], p.def.id).toEqual([p.x, p.y, null, false])
    }
  })
})

describe('what each scene saves when it starts, and what fills it in', () => {
  const start = (index: number): World => { const world = SCENES[index].make(); SCENES[index].cause(world); return world }

  it('the ghost: the silk on the covered doll, the dolls on the bare mat at the edge, the smallest first and farthest, the ghost a few steps on', () => {
    const world = start(0), places = world.places()
    expect(places.silk).toMatchObject({ at: 'mat', on: 'doll-tall' })
    const edge = (id: PieceId): number => Math.hypot((places[id].x - FIELD.x) / FIELD.rx, (places[id].y - FIELD.y) / FIELD.ry)
    for (const id of ['doll-small', 'doll-round'] as const) expect(edge(id), id).toBeGreaterThan(0.6)
    const ran = (id: PieceId, from: { x: number; y: number }): number => Math.hypot(places[id].x - from.x, places[id].y - from.y)
    expect(ran('doll-tall', there)).toBeGreaterThan(40)
    expect(ran('doll-tall', there)).toBeLessThan(140)
    // No `on` changes but the silk's.
    for (const id of PIECE_IDS) if (id !== 'silk') expect(places[id].on, id).toBeNull()
    world.takeSounds()
    const heard = toTheEnd(world).heard
    const firstStep = (id: PieceId): number => heard.find((sound) => sound.name === 'step' && sound.piece === id)!.at
    expect(firstStep('doll-small')).toBeLessThan(firstStep('doll-round'))
    expect(heard.filter((sound) => sound.name === 'hoot').length).toBeGreaterThanOrEqual(4)
    // The run is a scamper with a giggle at the end: each doll that ran giggles after its last step, and nobody else does.
    for (const id of ['doll-small', 'doll-round'] as const) {
      const steps = heard.filter((sound) => sound.name === 'step' && sound.piece === id), giggles = heard.filter((sound) => sound.name === 'giggle' && sound.piece === id)
      expect(steps.length, id).toBe(8)
      expect(giggles.length, id).toBe(3)
      expect(giggles[0].at, id).toBeGreaterThan(steps[7].at)
    }
    expect(heard.filter((sound) => sound.name === 'giggle').length).toBe(6)
    // The small doll ran away from the ghost: farther from where the ghost stood than it was.
    expect(Math.hypot(places['doll-small'].x - there.x, places['doll-small'].y - there.y)).toBeGreaterThan(Math.hypot(700 - there.x, 560 - there.y))
  })

  it('the ghost: a doll that rests on something stays and ducks with a squeak, and a ghost that rests on something stays and sways', () => {
    const world = mat({ 'arch-large': { x: 420, y: 600, turned: true }, 'doll-small': { x: 420, y: 600, on: 'arch-large' }, 'doll-round': { x: 640, y: 600 }, 'doll-tall': { x: 640, y: 600, on: 'doll-round' } })
    putOn(world, 'silk', 'doll-tall')
    const places = world.places()
    expect(places.silk.on).toBe('doll-tall')
    expect(places['doll-small']).toMatchObject({ x: 420, y: 600, on: 'arch-large' })
    expect(places['doll-tall']).toMatchObject({ x: 640, y: 600, on: 'doll-round' })
    expect(places['doll-round']).toMatchObject({ x: 640, y: 600 })
    world.takeSounds()
    let ducked = 0, swayed = 0
    const heard: string[] = []
    while (world.scene) { world.step(FRAME); heard.push(...named(world.takeSounds())); ducked = Math.max(ducked, world.piece('doll-small').duck); swayed = Math.max(swayed, Math.abs(world.piece('doll-tall').tilt)) }
    expect(heard).toContain('squeak:doll-small')
    expect(ducked).toBeGreaterThan(0.5)
    expect(swayed).toBeGreaterThan(0.05)
  })

  it('the ghost horse gallops in a circle with muffled thuds and bumps softly into the edge of the mat', () => {
    const world = mat({ horse: { x: 560, y: 570 }, 'doll-small': { x: 380, y: 600 } })
    putOn(world, 'silk', 'horse')
    const stop = world.places().horse
    expect(Math.hypot((stop.x - FIELD.x) / FIELD.rx, (stop.y - FIELD.y) / FIELD.ry)).toBeGreaterThan(0.55)
    world.takeSounds()
    const heard = named(toTheEnd(world).heard)
    expect(heard.filter((each) => each === 'thud').length).toBeGreaterThanOrEqual(8)
    expect(heard).toContain('soft')
    expect(heard).toContain('step:doll-small')
  })

  it('the ghost also rises when a doll is put under the silk that lies on the mat', () => {
    const world = mat({ silk: { x: 560, y: 590 } })
    putOn(world, 'doll-round', 'silk')
    expect(world.scene).not.toBeNull()
    expect(world.places().silk.on).toBe('doll-round')
    expect(world.places()['doll-round']).toMatchObject({ at: 'mat', on: null })
  })

  it('the ride: the doll on the horse, the horse back where it began, through every standing arch with hollow clops', () => {
    const world = start(1)
    expect(world.places()['doll-round']).toMatchObject({ at: 'mat', x: there.x, y: there.y, on: 'horse' })
    expect(world.places().horse).toMatchObject({ x: there.x, y: there.y })
    world.takeSounds()
    let nearest = Infinity, farthest = 0
    const heard: string[] = [], horse = world.piece('horse')
    while (world.scene) {
      world.step(FRAME)
      heard.push(...named(world.takeSounds()))
      nearest = Math.min(nearest, Math.hypot(horse.px - 720, horse.py - 560))
      farthest = Math.max(farthest, Math.hypot(horse.px - there.x, horse.py - there.y))
    }
    expect(nearest).toBeLessThan(12)
    expect(farthest).toBeGreaterThan(200)
    expect(heard.filter((each) => each === 'hollow:horse').length).toBeGreaterThanOrEqual(1)
    expect(heard.filter((each) => each === 'clop:horse').length).toBeGreaterThanOrEqual(10)
    expect(heard.filter((each) => each === 'hic:doll-round').length).toBe(8)
    expect([horse.px, horse.py]).toEqual([there.x, there.y])
  })

  it('the tunnel: without a rider the horse stops at the mouth on the side it came from; with one it comes out on the far side', () => {
    const alone = start(2)
    // It came from its place by the mat, on the left.
    expect(alone.places().horse).toMatchObject({ at: 'mat', on: null })
    expect(alone.places().horse.x).toBeLessThan(there.x)
    alone.takeSounds()
    const refused = named(toTheEnd(alone).heard)
    expect(refused).toContain('skid:horse')
    expect(refused).toContain('blow:horse')
    expect(refused).not.toContain('hollow:horse')
    const ridden = mat({ 'arch-large': there, horse: { x: 300, y: 600 }, 'doll-small': { x: 300, y: 600, on: 'horse' } })
    putOn(ridden, 'horse', 'arch-large')
    expect(ridden.places().horse.x).toBeGreaterThan(there.x)
    expect(ridden.places().horse.on).toBeNull()
    // The rider goes with it.
    expect(ridden.places()['doll-small']).toMatchObject({ on: 'horse', x: ridden.places().horse.x, y: ridden.places().horse.y })
    ridden.takeSounds()
    // The largest arch is tall enough: the horse ducks under it, behind its band, its rider flat along its neck, and its clops ring hollow inside.
    const horse = ridden.piece('horse'), rider = ridden.piece('doll-small'), through: string[] = []
    let ducked = 0, behind = true, riderLow = 0
    while (ridden.scene) {
      ridden.step(FRAME)
      through.push(...named(ridden.takeSounds()))
      if (Math.abs(horse.px - there.x) < 105) { ducked = Math.max(ducked, horse.duck); behind = behind && horse.py < there.y && horse.duck > 0.95; riderLow = Math.min(riderLow, rider.lift) }
    }
    expect(passesUnder(ridden.pieces, ridden.piece('arch-large'))).toBe(true)
    expect([ducked, behind]).toEqual([1, true])
    expect(riderLow).toBeLessThan(-40)
    expect(through.filter((each) => each === 'hollow:horse').length).toBe(2)
    // The small doll likes the tunnel.
    expect(through).toContain('glee:doll-small')
    expect([horse.duck, rider.lift, rider.tilt]).toEqual([0, 0, 0])
  })

  it('the tunnel with a rider at an arch too low to pass under: the horse hops over it, in front of it, and lands on the far side', () => {
    for (const id of ['arch-middle', 'arch-small'] as const) {
      const world = mat({ [id]: there, horse: { x: 300, y: 600 }, 'doll-small': { x: 300, y: 600, on: 'horse' } })
      expect(passesUnder(world.pieces, world.piece(id))).toBe(false)
      putOn(world, 'horse', id)
      expect(world.places().horse.x).toBeGreaterThan(there.x)
      expect(world.places()['doll-small']).toMatchObject({ on: 'horse' })
      world.takeSounds()
      const horse = world.piece('horse'), heard: string[] = []
      let over = Infinity, ducked = 0, air = 0
      while (world.scene) {
        world.step(FRAME)
        const sounds = named(world.takeSounds())
        heard.push(...sounds)
        // Every clop is a hoof coming down: the horse is on the ground at that frame.
        if (sounds.includes('clop:horse')) expect(horse.lift + horse.hop, id).toBeLessThan(6)
        ducked = Math.max(ducked, horse.duck)
        air = Math.max(air, horse.lift)
        if (Math.abs(horse.px - there.x) < PIECES[id].halfWidth) over = Math.min(over, horse.lift)
      }
      // It is never inside: no hollow clop, no glee, no ducking. Over the whole of the arch it is higher than the arch.
      expect(heard, id).not.toContain('hollow:horse')
      expect(heard, id).not.toContain('glee:doll-small')
      expect(ducked, id).toBe(0)
      expect(over, id).toBeGreaterThan(PIECES[id].height * 0.5)
      expect(air, id).toBeGreaterThan(PIECES[id].height)
      expect(heard, id).toContain('whinny:horse')
    }
  })

  it('the ride: a clop for every time the hooves come down and a hiccup for every bounce of the doll, under the tall arch and over the low one', () => {
    const world = mat({ horse: there, 'arch-large': { x: 720, y: 560 }, 'arch-middle': { x: 400, y: 520 } })
    putOn(world, 'doll-round', 'horse')
    world.takeSounds()
    const horse = world.piece('horse'), doll = world.piece('doll-round')
    let clops = 0, landings = 0, hics = 0, bounces = 0, up = false, bounced = false, dollUp = false, underTall = 0, overLow = 0, duckAtLow = 0
    for (let t = 0; world.scene; t += FRAME) {
      world.step(FRAME)
      const sounds = named(world.takeSounds()), trotting = world.scene !== null && t > TROT_FROM - FRAME && t < TROT_FROM + TROT + FRAME
      if (!trotting) continue
      const height = horse.lift + horse.hop
      for (const sound of sounds) {
        if (sound === 'clop:horse' || sound === 'hollow:horse') {
          clops += 1
          // No sound without its bounce: the hooves are down at this frame and were up before it.
          expect(height, `clop at ${t.toFixed(2)}`).toBeLessThan(3.5)
          expect(bounced, `clop at ${t.toFixed(2)}`).toBe(true)
          bounced = false
        }
        if (sound === 'hic:doll-round') { hics += 1; expect(doll.hop, `hic at ${t.toFixed(2)}`).toBeGreaterThan(10) }
      }
      // No bounce without its sound: each time the hooves come down after being up is a landing.
      if (up && height < 3.5) { landings += 1; up = false }
      if (height > 5) { up = true; bounced = true }
      if (!dollUp && doll.hop > 10) { bounces += 1; dollUp = true }
      if (doll.hop < 3) dollUp = false
      if (Math.hypot(horse.px - 720, horse.py - 557) < 24) underTall = Math.max(underTall, horse.duck)
      if (Math.hypot(horse.px - 400, horse.py - 523) < 16) { overLow = Math.max(overLow, horse.lift); duckAtLow = Math.max(duckAtLow, horse.duck) }
    }
    expect(clops).toBe(landings)
    expect(clops).toBeGreaterThanOrEqual(12)
    expect([hics, bounces]).toEqual([RIDE_BOUNCES, RIDE_BOUNCES])
    // It ducks under the largest arch and hops over the middle one.
    expect(underTall).toBeGreaterThan(0.95)
    expect(overLow).toBeGreaterThan(PIECES['arch-middle'].height)
    expect(duckAtLow).toBe(0)
  })

  it('a nest is a nest: a doll climbs over its outermost arch, and a rider hops it, in the tunnel and on the ride; nothing passes through a band', () => {
    const nested = (extra: Parameters<typeof mat>[0] = {}): World => mat({ 'arch-small': there, 'arch-large': { ...there, on: 'arch-small' }, 'arch-middle': { ...there, on: 'arch-large' }, ...extra })
    const outer = 105
    // The slide: over the top of the large arch, never inside its band.
    const slide = nested()
    putOn(slide, 'doll-small', 'arch-middle')
    const doll = slide.piece('doll-small')
    let top = Infinity, reached = false
    while (slide.scene) {
      slide.step(FRAME)
      const dx = doll.px - there.x
      reached = reached || Math.abs(Math.abs(dx) - (outer + 4)) < 3
      if (reached && Math.abs(dx) < outer) expect(Math.hypot(dx, doll.py - there.y), `at ${dx.toFixed(0)}`).toBeGreaterThan(outer - 6)
      top = Math.min(top, doll.py)
    }
    expect(top).toBeLessThan(there.y - outer + 2)
    expect(slide.places()['doll-small'].on).toBeNull()
    expect(Math.abs(slide.places()['doll-small'].x - there.x)).toBeGreaterThan(outer)
    // The hollow of a nest is filled, and so is the hollow of an arch under the silk: neither is passed under.
    const hill = mat({ 'arch-large': there, silk: { ...there, on: 'arch-large' } })
    expect(passesUnder(nested().pieces, nested().piece('arch-large'))).toBe(false)
    expect(passesUnder(hill.pieces, hill.piece('arch-large'))).toBe(false)
    // The tunnel: with a rider the horse hops the whole nest and lands on the far side, never ducking.
    const tunnel = nested({ horse: { x: 300, y: 600 }, 'doll-round': { x: 300, y: 600, on: 'horse' } })
    putOn(tunnel, 'horse', 'arch-small')
    expect(tunnel.places().horse.x).toBeGreaterThan(there.x + outer)
    const horse = tunnel.piece('horse'), heard: string[] = []
    let ducked = 0, over = Infinity
    while (tunnel.scene) {
      tunnel.step(FRAME)
      heard.push(...named(tunnel.takeSounds()))
      ducked = Math.max(ducked, horse.duck)
      if (Math.abs(horse.px - there.x) < 20) over = Math.min(over, horse.lift)
    }
    expect(ducked).toBe(0)
    expect(over).toBeGreaterThan(outer)
    expect(heard).toContain('whinny:horse')
    expect(heard).not.toContain('hollow:horse')
    // The ride: the nest stands in the way like any other thing, and the horse clears its top.
    const ride = nested({ horse: { x: 330, y: 590 } })
    putOn(ride, 'doll-round', 'horse')
    const rider = ride.piece('horse'), sounds: string[] = []
    let low = 0, clear = Infinity
    while (ride.scene) {
      ride.step(FRAME)
      sounds.push(...named(ride.takeSounds()))
      low = Math.max(low, rider.duck)
      if (Math.hypot(rider.px - there.x, (rider.py - there.y) * 2) < 30) clear = Math.min(clear, rider.lift)
    }
    expect(low).toBe(0)
    expect(clear).toBeGreaterThan(outer)
    expect(sounds).not.toContain('hollow:horse')
  })

  it('the tall doll strains from the moment the load is on it, all through the carried horse\'s scene', () => {
    const world = mat({ 'doll-tall': there })
    putOn(world, 'horse', 'doll-tall')
    const tall = world.piece('doll-tall'), from = world.time
    let frames = 0
    while (world.scene) {
      world.step(FRAME)
      if (world.time - from > 0.37 && world.scene) { frames += 1; expect(strainOf(tall), `at ${(world.time - from).toFixed(2)}`).toBe(1) }
    }
    expect(frames).toBeGreaterThan(200)
    // The round doll carries the horse without that face.
    const round = mat({ 'doll-round': there })
    putOn(round, 'horse', 'doll-round')
    run(round, 2)
    expect(round.piece('doll-round').mood).toBe(0)
  })

  it('moves with every sound: the sleeper swells with each sigh, the cloth with each of the first hoots, and the doll sets the basket up at the end of the call', () => {
    // Each breath of the sleeper is seen within the breath.
    const cradle = mat({ 'arch-large': { ...there, turned: true } })
    putOn(cradle, 'doll-round', 'arch-large')
    const sleeper = cradle.piece('doll-round'), breaths: number[] = [], swell: { at: number; squash: number }[] = []
    while (cradle.scene) {
      cradle.step(FRAME)
      if (named(cradle.takeSounds()).includes('breath:doll-round')) breaths.push(cradle.time)
      swell.push({ at: cradle.time, squash: sleeper.squash })
    }
    expect(breaths.length).toBeGreaterThanOrEqual(3)
    for (const at of breaths) expect(Math.min(...swell.filter((each) => each.at >= at && each.at < at + BREATH).map((each) => each.squash)), `breath at ${at.toFixed(2)}`).toBeLessThan(-BREATH_SWELL * 0.6)
    // Each of the first hoots is seen in the cloth.
    const ghost = mat({ 'doll-tall': there })
    putOn(ghost, 'silk', 'doll-tall')
    const silk = ghost.piece('silk'), hoots: number[] = [], cloth: { at: number; squash: number }[] = []
    while (ghost.scene) {
      ghost.step(FRAME)
      if (named(ghost.takeSounds()).includes('hoot')) hoots.push(ghost.time)
      cloth.push({ at: ghost.time, squash: silk.squash })
    }
    expect(hoots.length).toBeGreaterThanOrEqual(4)
    for (const at of hoots.slice(0, 4)) expect(Math.min(...cloth.filter((each) => each.at >= at && each.at < at + HOOT).map((each) => each.squash)), `hoot at ${at.toFixed(2)}`).toBeLessThan(-HOOT_SWELL * 0.6)
    // The call: while the basket comes up again the small doll is bent to it and has stepped in, and it stands straight when the basket stands.
    const call = mat({})
    tapBasket(call)
    const doll = call.piece('doll-small')
    let bent = 0, reach = -Infinity, before = -Infinity, echoed = false
    while (call.scene) {
      const tip = call.tip
      call.step(FRAME)
      echoed = echoed || named(call.takeSounds()).includes('echo:doll-small')
      if (!echoed) { before = Math.max(before, doll.px); continue }
      if (call.tip < tip && call.tip > 0) { bent = Math.max(bent, doll.duck); reach = Math.max(reach, doll.px) }
    }
    expect(bent).toBeGreaterThan(0.3)
    expect(reach - before).toBeGreaterThan(SET_UP_REACH * 0.8)
    expect([call.basket, doll.duck, doll.tilt]).toEqual(['upright', 0, 0])
  })

  it('a lid is not an arch to pass under: with a rider the horse hops a cradle with its lid, over the top of the lid', () => {
    const world = mat({ 'arch-middle': { ...there, turned: true }, 'arch-large': { ...there, on: 'arch-middle' }, horse: { x: 280, y: 600 }, 'doll-small': { x: 280, y: 600, on: 'horse' } })
    const lid = world.piece('arch-large')
    expect(passesUnder(world.pieces, lid)).toBe(false)
    // The top of the lid above the mat: the cradle's rim and the lid on it.
    const top = there.y - (stand(world.pieces, lid).y - 105)
    expect(top).toBeGreaterThan(160)
    putOn(world, 'horse', 'arch-large')
    expect(world.places().horse.x).toBeGreaterThan(there.x + 105)
    const horse = world.piece('horse'), heard: string[] = []
    let ducked = 0, over = Infinity
    while (world.scene) {
      world.step(FRAME)
      heard.push(...named(world.takeSounds()))
      ducked = Math.max(ducked, horse.duck)
      if (Math.abs(horse.px - there.x) < 20) over = Math.min(over, horse.lift)
    }
    expect(ducked).toBe(0)
    expect(over).toBeGreaterThan(top)
    expect(heard).toContain('whinny:horse')
    expect(heard).not.toContain('hollow:horse')
    expect(world.places()['arch-large']).toMatchObject({ on: 'arch-middle' })
  })

  it('the ride goes round what stands in its way and hops through nothing: a tall doll, a tower, a cradle', () => {
    const world = mat({ horse: { x: 330, y: 590 }, 'doll-tall': { x: 600, y: 470 }, 'doll-round': { x: 880, y: 600 }, 'doll-small': { x: 880, y: 600, on: 'doll-round' }, 'arch-middle': { x: 560, y: 660, turned: true } })
    const lasts = (): number => { let n = 0; while (world.scene && n < 2000) { world.step(FRAME); n += 1 } return n }
    world.takeSounds()
    // The rider: the silk is by the mat, so the round doll's tower stays; the tall doll stands alone. A doll from by the mat would be best, but all three are out: lift the small one off its tower.
    putOn(world, 'doll-small', 'horse')
    const horse = world.piece('horse'), from = world.time
    let lifted = 0, nearest = Infinity, stride = 0
    const inTheWay = (['doll-tall', 'doll-round', 'arch-middle'] as const).map((id) => world.piece(id))
    while (world.scene) {
      const was = { x: horse.px, y: horse.py }
      world.step(FRAME)
      const u = (world.time - from - TROT_FROM) / TROT
      if (u > 0 && u < 1) stride = Math.max(stride, Math.hypot(horse.px - was.x, horse.py - was.y))
      lifted = Math.max(lifted, horse.lift)
      if (u > 0.12 && u < 0.88) for (const p of inTheWay) nearest = Math.min(nearest, Math.hypot(horse.px - p.x, (horse.py - p.y) * 2) / (p.def.reach + horse.def.reach))
    }
    // It never leaves the ground for them, and never comes nearer than a body's width.
    expect(stride).toBeLessThan(30)
    expect(lifted).toBe(0)
    expect(nearest).toBeGreaterThan(0.97)
    expect([Math.round(horse.px), Math.round(horse.py)]).toEqual([world.places().horse.x, world.places().horse.y])
    expect(lasts()).toBe(0)
  })

  it('on a mat too full to go round, the horse hops what stands in its way as high as it stands: its middle is never inside a thing', () => {
    let rides = 0, hopped = 0
    for (let k = 0; k < 40; k++) {
      const r = (n: number): number => { const v = Math.sin((k + 1) * 12.9898 * (n + 1)) * 43758.5453; return v - Math.floor(v) }
      const at = (n: number): { x: number; y: number } => ({ x: 340 + r(n) * 500, y: 470 + r(n + 20) * 170 })
      const world = mat({ horse: at(0), 'doll-tall': at(1), 'doll-round': at(2), 'arch-large': at(3), 'arch-middle': { ...at(4), turned: true }, 'arch-small': at(5), silk: at(6) })
      // A mat thrown together like this hides the horse behind something as often as not: only a real ride is looked at.
      try { putOn(world, 'doll-small', 'horse') } catch { continue }
      if (world.places()['doll-small'].on !== 'horse') continue
      rides += 1
      const horse = world.piece('horse'), from = world.time, others = (['doll-tall', 'doll-round', 'arch-middle', 'silk'] as const).map((id) => world.piece(id)).filter((p) => p.at === 'mat' && p.on === null)
      while (world.scene) {
        world.step(FRAME)
        const u = (world.time - from - TROT_FROM) / TROT
        if (u < 0.12 || u > 0.88) continue
        for (const p of others) {
          const near = Math.hypot(horse.px - p.x, (horse.py - p.y) * 2) / (p.def.reach + horse.def.reach)
          if (near >= 0.55) continue
          hopped += 1
          expect(horse.lift, `${k}: over ${p.def.id}`).toBeGreaterThan(p.def.kind === 'doll' ? p.def.height : p.def.height / 2)
        }
      }
    }
    expect(rides).toBeGreaterThan(20)
    expect(hopped).toBeGreaterThan(0)
  })

  it('shows the call and the glee: the doll rocks into the basket as it calls, and the small doll pops up as the horse comes out of the tunnel', () => {
    const call = mat({})
    tapBasket(call)
    const doll = call.piece('doll-small')
    let leaning = 0, rocked = 0, called = -Infinity
    while (call.scene) {
      const tilt = doll.tilt
      call.step(FRAME)
      if (named(call.takeSounds()).includes('call:doll-small')) { called = call.time; leaning = tilt }
      if (call.time - called < 0.4) rocked = Math.max(rocked, doll.tilt - leaning)
    }
    expect(leaning).toBeGreaterThan(0.4)
    expect(rocked).toBeGreaterThan(CALL_ROCK * 0.9)
    // The tunnel: the glee sounds once the horse's rider is out from behind the band, and the doll hops with it.
    const tunnel = mat({ 'arch-large': there, horse: { x: 300, y: 600 }, 'doll-small': { x: 300, y: 600, on: 'horse' } })
    putOn(tunnel, 'horse', 'arch-large')
    const horse = tunnel.piece('horse'), rider = tunnel.piece('doll-small')
    let glee = -Infinity, at = { x: 0, duck: 1 }, hopped = 0
    while (tunnel.scene) {
      tunnel.step(FRAME)
      if (named(tunnel.takeSounds()).includes('glee:doll-small')) { glee = tunnel.time; at = { x: horse.px, duck: horse.duck } }
      if (tunnel.time - glee < 0.45) hopped = Math.max(hopped, rider.hop)
    }
    expect(glee).toBeGreaterThan(0)
    expect(at.duck).toBeLessThan(0.05)
    expect(Math.abs(at.x - there.x)).toBeGreaterThan(105)
    expect(hopped).toBeGreaterThan(14)
    expect(rider.hop).toBe(0)
    // And on the ride: heard once they are out from under the arch, not inside it.
    const ride = mat({ 'arch-large': there, horse: { x: 300, y: 600 } })
    putOn(ride, 'doll-small', 'horse')
    const trotting = ride.piece('horse')
    let ducked = -1, hollow = 0
    while (ride.scene) {
      ride.step(FRAME)
      const heard = named(ride.takeSounds())
      if (heard.includes('hollow:horse')) hollow += 1
      if (heard.includes('glee:doll-small')) { expect(ducked).toBe(-1); ducked = trotting.duck; expect(hollow).toBeGreaterThan(0) }
    }
    expect(ducked).toBeGreaterThanOrEqual(0)
    expect(ducked).toBeLessThan(0.05)
  })

  it('the march: a stack is taken down first, the top thing first, each with its knock, and nothing waits in the air', () => {
    const world = mat({ 'doll-round': there, 'doll-tall': { ...there, on: 'doll-round' }, silk: { ...there, on: 'doll-tall' }, horse: { x: 720, y: 600 }, 'doll-small': { x: 720, y: 600, on: 'horse' } })
    const stacked = ['silk', 'doll-tall', 'doll-small'] as const, under: Record<string, PieceId> = { silk: 'doll-tall', 'doll-tall': 'doll-round', 'doll-small': 'horse' }
    tapBasket(world)
    world.takeSounds()
    const was = new Map(world.pieces.map((p) => [p.def.id, { x: p.px, y: p.py }])), down: string[] = [], marching = world.pieces.filter((p) => p.at === 'basket')
    expect(marching.length).toBe(5)
    let first = Infinity, checked = false
    for (let t = 0; world.scene && t < 12 && first === Infinity; t += FRAME) {
      world.step(FRAME)
      for (const sound of named(world.takeSounds())) {
        if (/^(knock|bell|clop):/.test(sound) && stacked.includes(sound.split(':')[1] as (typeof stacked)[number])) down.push(sound.split(':')[1])
        if (sound.startsWith('pick:') || sound.startsWith('step:')) first = t
      }
      // Until a stacked thing has been set down, what it stands on has not moved from under it.
      for (const id of stacked) if (!down.includes(id)) expect(world.piece(under[id]).px, `${under[id]} under ${id} at ${t.toFixed(2)}`).toBe(was.get(under[id])!.x)
      if (down.length === 3 && !checked) {
        checked = true
        // Every thing now stands on the mat, on its own free place: none is in the air and none on another.
        for (const p of marching) {
          expect(p.lift + p.hop, p.def.id).toBeLessThan(1)
          expect(inField(p.px, p.py), p.def.id).toBe(true)
        }
        for (const a of marching) for (const b of marching) if (a !== b) expect(feetCross(a.def, a.px, a.py, b.def, b.px, b.py), `${a.def.id} in ${b.def.id}`).toBe(false)
      }
    }
    // The highest first, each with its own sound, and all of them before anything is fetched or walks.
    expect(down).toEqual(['silk', 'doll-tall', 'doll-small'])
    expect([checked, first < Infinity]).toEqual([true, true])
  })

  it('lasts what the sheet says: the march about 2 to 9 seconds, the way out again about 1.5 to 5.5, and every other scene 4 to 6', () => {
    const lasts = (world: World, cause: (w: World) => void): number => { cause(world); return toTheEnd(world).seconds }
    const all = Object.fromEntries(PIECE_IDS.map((id, i) => [id, { x: 330 + (i % 4) * 170, y: i < 4 ? 520 : 630 }]))
    const inBasket = (ids: readonly PieceId[]): World => new World({ ...mat({}).places(), ...Object.fromEntries(ids.map((id) => [id, { at: 'basket', x: 0, y: 0, on: null, turned: false }])) }, 'tipped')
    const one = lasts(mat({ 'doll-small': there }), tapBasket), eight = lasts(mat(all), tapBasket)
    expect(one).toBeGreaterThan(2); expect(one).toBeLessThan(2.8)
    expect(eight).toBeGreaterThan(8.2); expect(eight).toBeLessThan(9.4)
    const out = lasts(inBasket(['doll-small']), tapBasket), outAll = lasts(inBasket(PIECE_IDS), tapBasket)
    expect(out).toBeGreaterThan(1.3); expect(out).toBeLessThan(1.7)
    expect(outAll).toBeGreaterThan(5.2); expect(outAll).toBeLessThan(5.8)
    // A stack of seven on one thing is taken down and marched in under ten seconds too.
    const tower = mat({ 'arch-large': { ...there, turned: true }, 'doll-round': { ...there, on: 'arch-large' }, 'doll-tall': { ...there, on: 'doll-round' }, horse: { ...there, on: 'doll-tall' }, 'doll-small': { ...there, on: 'horse' }, silk: { ...there, on: 'doll-small' } })
    expect(lasts(tower, tapBasket)).toBeLessThan(10)
    for (const setup of SCENES.filter((each) => !['the march', 'out again'].includes(each.name))) {
      const seconds = lasts(setup.make(), setup.cause)
      expect(seconds, setup.name).toBeGreaterThanOrEqual(4)
      expect(seconds, setup.name).toBeLessThanOrEqual(6.05)
    }
  })

  it('the call is the small doll\'s: when the mat is bare and the basket empty every doll is at its place, and the small doll\'s is the nearest to the basket', () => {
    const far = (id: PieceId): number => Math.hypot(PIECES[id].home.x - BASKET.x, PIECES[id].home.y - BASKET.y)
    expect(far('doll-small')).toBeLessThan(Math.min(far('doll-tall'), far('doll-round')))
    const world = mat({})
    tapBasket(world)
    expect(named(toTheEnd(world).heard).filter((each) => each.startsWith('call:'))).toEqual(['call:doll-small'])
  })

  it('the slide: the doll on the far side of the arch, on the bare mat, facing the way it slid', () => {
    const world = start(3), doll = world.places()['doll-small']
    expect(doll).toMatchObject({ at: 'mat', on: null })
    // It came from behind the mat on the right, so the far side is the left.
    expect(doll.x).toBeLessThan(there.x - PIECES['arch-large'].halfWidth)
    expect(doll.turned).toBe(true)
    world.takeSounds()
    let top = Infinity
    const heard: string[] = []
    while (world.scene) { world.step(FRAME); heard.push(...named(world.takeSounds())); top = Math.min(top, world.piece('doll-small').py) }
    expect(top).toBeLessThan(there.y - PIECES['arch-large'].height + 8)
    expect(heard.indexOf('whistle:doll-small')).toBeGreaterThan(heard.indexOf('chirp:doll-small'))
    expect(heard.indexOf('bump')).toBeGreaterThan(heard.indexOf('whistle:doll-small'))
  })

  it('asleep: the doll in the cradle, and its eyes shut after one rock for the round doll and three for the others', () => {
    const shutAt = (id: PieceId): number => {
      const world = mat({ 'arch-large': { ...there, turned: true } })
      putOn(world, id, 'arch-large')
      expect(world.places()[id]).toMatchObject({ at: 'mat', x: there.x, y: there.y, on: 'arch-large' })
      const from = world.time
      let lulls = 0, breaths = 0
      while (world.scene && world.piece(id).shut < 0.99) { world.step(FRAME); lulls += world.takeSounds().filter((sound) => sound.name === 'lull').length }
      const at = world.time - from
      while (world.scene) { world.step(FRAME); breaths += world.takeSounds().filter((sound) => sound.name === 'breath').length }
      expect(breaths, id).toBeGreaterThanOrEqual(1)
      expect(lulls, id).toBeGreaterThanOrEqual(rocksToSleep(world.piece(id)) * 2 - 1)
      // And it stays asleep, which is a view of what it rests on.
      run(world, 1)
      expect(world.piece(id).shut).toBeCloseTo(1, 2)
      return at
    }
    const round = shutAt('doll-round'), tall = shutAt('doll-tall'), small = shutAt('doll-small')
    expect(round).toBeLessThan(1.4)
    expect(tall).toBeGreaterThan(round + 1.5)
    expect(small).toBeCloseTo(tall, 1)
  })

  it('the tower bows: the top doll on the lower one, a chord and a trill, and the tall doll grins on top and frowns underneath', () => {
    const world = start(5)
    expect(world.places()['doll-tall']).toMatchObject({ at: 'mat', x: there.x, y: there.y, on: 'doll-round' })
    world.takeSounds()
    let leaned = 0
    const heard: string[] = []
    while (world.scene) { world.step(FRAME); heard.push(...named(world.takeSounds())); leaned = Math.max(leaned, Math.abs(world.piece('doll-round').tilt)) }
    expect(heard[0]).toBe('chord:doll-tall')
    expect(heard.filter((each) => each === 'trill:doll-tall').length).toBe(12)
    expect(leaned).toBeGreaterThan(0.6)
    run(world, 1)
    expect(world.piece('doll-tall').mood).toBeCloseTo(1, 1)
    const under = mat({ 'doll-tall': there })
    putOn(under, 'doll-small', 'doll-tall')
    toTheEnd(under)
    run(under, 1)
    expect(under.piece('doll-tall').mood).toBeCloseTo(-1, 1)
  })

  it('the carried horse: the horse on the doll, and the doll four staggering steps from where it stood', () => {
    const world = start(6), places = world.places()
    expect(places.horse).toMatchObject({ at: 'mat', on: 'doll-round' })
    expect(Math.abs(places['doll-round'].x - there.x)).toBeGreaterThan(60)
    expect([places.horse.x, places.horse.y]).toEqual([places['doll-round'].x, places['doll-round'].y])
    world.takeSounds()
    const heard = named(toTheEnd(world).heard)
    expect(heard.filter((each) => each === 'puff:doll-round').length).toBe(5)
    expect(heard.filter((each) => each === 'step:doll-round').length).toBe(4)
    expect(heard).toContain('nicker:horse')
    run(world, 1)
    expect(world.piece('horse').mood).toBeCloseTo(1, 1)
  })

  it('the march: the basket tipped and every thing in it, each sounding its own note as it goes in, the largest arch last', () => {
    const world = start(7), places = world.places()
    expect(world.basket).toBe('tipped')
    for (const id of ['doll-tall', 'horse', 'arch-large', 'silk'] as const) expect(places[id]).toMatchObject({ at: 'basket', on: null, turned: false })
    const notes = named(toTheEnd(world).heard).filter((each) => /^(knock|clop|bell):/.test(each))
    // The tune is made of what was out: one note for each thing, as it goes in.
    expect(notes.filter((each, i) => notes.indexOf(each) === i).map((each) => each.split(':')[1]).sort()).toEqual(['arch-large', 'doll-tall', 'horse', 'silk'])
    expect(notes[notes.length - 1]).toBe('knock:arch-large')
  })

  it('the call: a doll calls into the tipped basket, the note comes back, and nothing has changed', () => {
    const world = start(8), before = world.places()
    const heard = named(toTheEnd(world).heard)
    expect(heard.indexOf('echo:doll-small')).toBeGreaterThan(heard.indexOf('call:doll-small'))
    expect(world.places()).toEqual(before)
    expect(world.basket).toBe('upright')
    expect(world.tip).toBe(0)
  })

  it('out again: the basket upright and every thing by the mat, hopping out the smallest first', () => {
    const world = start(9), places = world.places()
    expect(world.basket).toBe('upright')
    for (const id of PIECE_IDS) expect(places[id].at, id).toBe('home')
    const pops = named(toTheEnd(world).heard).filter((each) => each.startsWith('pop:')).map((each) => each.slice(4))
    expect(pops).toEqual(OUT_ORDER.filter((id) => ['doll-tall', 'horse', 'arch-small'].includes(id)))
    expect(pops[0]).toBe('arch-small')
  })

  it('sets down whatever a scene brings to rest on a free place on the field', () => {
    for (const setup of SCENES) {
      const world = setup.make()
      setup.cause(world)
      for (const p of world.pieces.filter((each) => each.at === 'mat' && each.on === null)) expect(inField(p.x, p.y), `${setup.name}: ${p.def.id}`).toBe(true)
    }
  })
})
