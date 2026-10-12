import { describe, expect, it } from 'vitest'
import { mat, named, putOn, run, take, tap } from './drive'
import { PIECE_IDS } from './pieces'
import { freshSave, placesOf, startsWithADoll } from './save'
import { rocksToSleep } from './scenesClimb'
import { STRAIN_WOBBLE } from './pose'
import { stand } from './stack'
import { gaze, hideout, inTheAir, loadTop, nearestDoll, strainOf, tallestTop } from './tastes'
import { World } from './world'

// The characters' fixed tastes, each the same every time, and the age hint, which only lays the mat on a
// first visit. (Who runs first from the ghost, who falls asleep at the first rock and who will not enter the
// tunnel are held with their scenes, in scenes.test.ts.)

describe('the characters and their fixed tastes', () => {
  it('the tall doll looks up at the top of whatever is tallest, grins on top and frowns under a load, every time', () => {
    const world = mat({ 'doll-tall': { x: 420, y: 620 }, 'arch-large': { x: 660, y: 600 } })
    // The tallest thing in sight is the round doll in its place behind the mat.
    expect(tallestTop(world, world.piece('doll-tall'))!.y).toBeLessThan(200)
    for (let round = 0; round < 3; round++) {
      const under = mat({ 'doll-tall': { x: 520, y: 600 } })
      putOn(under, 'horse', 'doll-tall')
      run(under, 6)
      expect(under.piece('doll-tall').mood).toBeCloseTo(-1, 2)
      const top = mat({ 'doll-round': { x: 520, y: 600 } })
      putOn(top, 'doll-tall', 'doll-round')
      run(top, 6)
      expect(top.piece('doll-tall').mood).toBeCloseTo(1, 2)
      // The other dolls have no such taste.
      expect(top.piece('doll-round').mood).toBe(0)
    }
  })

  it('the tall doll under a load strains and wobbles, its load with it, and is itself again the moment the load is off', () => {
    const world = mat({ 'doll-tall': { x: 520, y: 600 } })
    putOn(world, 'doll-small', 'doll-tall')
    run(world, 6)
    const tall = world.piece('doll-tall'), load = world.piece('doll-small')
    expect(strainOf(tall)).toBeCloseTo(1, 2)
    // It wobbles from side to side, never far, and what it carries leans with it.
    let left = 0, right = 0, swung = 0
    const rest = stand(world.pieces, load).x
    for (let i = 0; i < 240; i++) { run(world, 1 / 60); left = Math.min(left, tall.tilt); right = Math.max(right, tall.tilt); swung = Math.max(swung, Math.abs(stand(world.pieces, load).x - rest)) }
    expect(left).toBeLessThan(-0.02)
    expect(right).toBeGreaterThan(0.02)
    expect(Math.max(-left, right)).toBeLessThanOrEqual(STRAIN_WOBBLE + 1e-9)
    expect(swung).toBeGreaterThan(3)
    // Its eyes are on its load, not on the child.
    expect(loadTop(world, tall)!.y).toBeLessThan(stand(world.pieces, tall).y - tall.def.height)
    // No other doll strains under a load: they have no such taste.
    const other = mat({ 'doll-round': { x: 520, y: 600 } })
    putOn(other, 'doll-small', 'doll-round')
    run(other, 6)
    expect([strainOf(other.piece('doll-round')), other.piece('doll-round').tilt]).toEqual([0, 0])
    // The load is lifted off: half a second later the doll is itself, and stands still.
    take(world, 'doll-small')
    run(world, 0.6)
    expect(strainOf(tall)).toBeLessThan(0.05)
    expect(Math.abs(tall.tilt)).toBeLessThan(0.003)
    // And a load of its save holds nothing of it but the stack: the face is a view of what it carries.
    const again = mat({ 'doll-tall': { x: 520, y: 600 }, 'doll-small': { x: 520, y: 600, on: 'doll-tall' } })
    expect(strainOf(again.piece('doll-tall'))).toBe(1)
    again.piece('doll-small').on = null
    run(again, 0.6)
    expect(strainOf(again.piece('doll-tall'))).toBeLessThan(0.05)
  })

  it('a doll that was just set down looks at the finger, and follows it, while everyone else looks at the doll', () => {
    const world = mat({ 'doll-tall': { x: 700, y: 600 } })
    take(world, 'doll-round')
    tap(world, 480, 560)
    run(world, 0.5)
    const round = world.piece('doll-round'), tall = world.piece('doll-tall')
    expect(round.flight).toBeNull()
    // The finger tapped the mat at that point.
    expect(gaze(world, round, null)).toMatchObject({ x: 480, y: 560 })
    // The other doll, and the cat, look at the doll that landed.
    expect(gaze(world, tall, null)).toMatchObject({ x: round.x, y: round.y - round.def.height * 0.4 })
    expect(gaze(world, null, null)).toMatchObject({ x: round.x })
    // The finger moves: the doll's eyes go with it.
    world.dragMove(300, 200)
    expect(gaze(world, round, null)).toMatchObject({ x: 300, y: 200 })
    // A while later it looks where it likes again.
    run(world, 4)
    expect(gaze(world, round, null)).toBeNull()
  })

  it('the round doll sleeps soonest, and grumbles with one snort when it is lifted asleep; the others do not', () => {
    for (const id of ['doll-round', 'doll-tall', 'doll-small'] as const) {
      const world = mat({ 'arch-large': { x: 520, y: 600, turned: true } })
      putOn(world, id, 'arch-large')
      run(world, 6)
      expect(world.piece(id).shut).toBeCloseTo(1, 2)
      world.takeSounds()
      take(world, id)
      const heard = named(world.takeSounds())
      expect(heard.includes(`grumble:${id}`), id).toBe(id === 'doll-round')
      expect(world.piece(id).mood, id).toBe(id === 'doll-round' ? -1 : 0)
      // Lifted, it wakes.
      run(world, 1)
      expect(world.piece(id).shut).toBeLessThan(0.05)
    }
    expect(PIECE_IDS.filter((id) => id.startsWith('doll')).map((id) => rocksToSleep(mat({}).piece(id)))).toEqual([3, 1, 3])
  })

  it('the small doll has the nearest larger thing to hide behind, and nothing when it is alone on the mat', () => {
    const world = mat({ 'doll-small': { x: 560, y: 600 }, horse: { x: 720, y: 600 }, 'arch-large': { x: 380, y: 560 } })
    expect(hideout(world, world.piece('doll-small'))!.x).toBe(720)
    expect(hideout(mat({ 'doll-small': { x: 560, y: 600 } }), mat({ 'doll-small': { x: 560, y: 600 } }).piece('doll-small'))).toBeNull()
  })

  it('the horse turns to the nearest doll, and is pleased in a cradle, under a rider and carried', () => {
    const world = mat({ horse: { x: 500, y: 600 }, 'doll-small': { x: 660, y: 600 } })
    expect(nearestDoll(world, world.piece('horse'))!.x).toBe(660)
    putOn(world, 'doll-small', 'horse')
    run(world, 8)
    expect(world.piece('horse').mood).toBeCloseTo(1, 2)
    take(world, 'doll-small')
    world.press(40, 60)
    run(world, 2)
    expect(world.piece('horse').mood).toBeLessThan(0.05)
  })

  it('the cat follows whatever is in the air and changes nothing', () => {
    const world = mat({})
    expect(inTheAir(world)).toBeNull()
    take(world, 'doll-tall')
    expect(inTheAir(world)).not.toBeNull()
    const before = world.places(), changes = world.changes
    world.press(410, 760)
    expect(named(world.takeSounds())).toContain('mew')
    world.press(410, 760)
    expect(world.places()).toEqual(before)
    // A thing in hand tapped on the cat goes back to its place, as anywhere off the mat: the cat itself moved nothing.
    expect(world.changes - changes).toBeLessThanOrEqual(1)
  })
})

describe('the age is a hint for the first visit and nothing else', () => {
  it('lays the mat by age on a first visit only, open at both ends, with no age as the youngest', () => {
    expect([null, 0, 2, 3].map(startsWithADoll)).toEqual([true, true, true, true])
    expect([4, 5, 9, 12, 40].map(startsWithADoll)).toEqual([false, false, false, false, false])
    expect(freshSave(null).pieces['doll-small'].at).toBe('mat')
    expect(freshSave(5).pieces['doll-small'].at).toBe('home')
  })

  it('gates nothing: after the same taps the mat is the same at every age, with every thing and every pair there', () => {
    const play = (age: number | null): unknown => {
      const world = new World(placesOf(freshSave(age)))
      // Bring the small doll onto the mat where the youngest finds it, then build on it.
      if (world.piece('doll-small').at === 'home') { take(world, 'doll-small'); world.press(700, 580); world.tap(); run(world, 1) }
      putOn(world, 'doll-tall', 'doll-small')
      run(world, 6)
      putOn(world, 'silk', 'doll-tall')
      run(world, 6)
      take(world, 'horse'); world.press(480, 600); world.tap(); run(world, 2)
      return world.places()
    }
    const youngest = play(2)
    for (const age of [null, 3, 4, 5, 11]) expect(play(age)).toEqual(youngest)
  })
})
