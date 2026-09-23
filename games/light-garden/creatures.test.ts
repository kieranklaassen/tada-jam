import { describe, expect, it } from 'vitest'
import { DROWSY_SECONDS, LINGER, makeCreature, moveBed, pickBed, seededRandom, stepCreature, STIR_EVERY, WAKE_AFTER, WAKING_SECONDS, type Creature, type CreatureEvent } from './creatures'
import { BLUE, GREEN, RED, WHITE } from './optics'

const snail = () => makeCreature(2, 'snail', RED | GREEN, 4.6, { x: 0, y: 0 })
const stay = (creature: Creature) => ({ x: creature.bed.x + 20, y: creature.bed.y })

function run(creature: Creature, light: number, seconds: number, start = 0, dt = 1 / 30): { events: CreatureEvent[]; now: number } {
  const events: CreatureEvent[] = []
  let now = start
  for (let t = 0; t < seconds; t += dt) {
    now += dt
    const event = stepCreature(creature, light, dt, now, stay)
    if (event) events.push(event)
  }
  return { events, now }
}

describe('creatures', () => {
  it('its exact colour wakes it after a short moment, then it finishes waking up', () => {
    const creature = snail()
    run(creature, RED | GREEN, WAKE_AFTER * 0.5)
    expect(creature.phase).toBe('asleep')
    const { events } = run(creature, RED | GREEN, WAKE_AFTER + WAKING_SECONDS.snail + 0.2)
    expect(events).toEqual(['wake', 'awake'])
    expect(creature.phase).toBe('awake')
  })

  it('a flicker of its light is not enough: the light has to stay', () => {
    const creature = snail()
    for (let i = 0; i < 20; i++) {
      run(creature, RED | GREEN, WAKE_AFTER * 0.6)
      run(creature, 0, 0.1)
    }
    expect(creature.phase).toBe('asleep')
  })

  it('light that holds its colour among others makes it stir, not wake, and not too often', () => {
    const creature = snail()
    const { events } = run(creature, RED, STIR_EVERY * 2.5)
    expect(creature.phase).toBe('asleep')
    expect(events.every((e) => e === 'stir')).toBe(true)
    expect(events.length).toBe(3)
    expect(run(snail(), WHITE, 1).events).toEqual(['stir'])
  })

  it('light of another colour does nothing', () => {
    const creature = snail()
    expect(run(creature, BLUE, 10).events).toEqual([])
    expect(creature.phase).toBe('asleep')
  })

  it('awake, it stays awake while lit; once its light is gone it lingers, yawns, wanders off, and naps somewhere new', () => {
    const creature = makeCreature(1, 'fish', RED, 4.6, { x: 0, y: 0 })
    let { now } = run(creature, RED, 5)
    expect(creature.phase).toBe('awake')
    ;({ now } = run(creature, RED, 60, now))
    expect(creature.phase).toBe('awake')
    const dark = run(creature, 0, LINGER + DROWSY_SECONDS + 5, now)
    expect(dark.events).toEqual(['drowsy', 'wander', 'nap'])
    expect(creature.phase).toBe('asleep')
    expect(creature.bed).toEqual({ x: 20, y: 0 })
  })

  it('a drowsy creature perks up if its light comes back', () => {
    const creature = makeCreature(1, 'fish', RED, 4.6, { x: 0, y: 0 })
    let { now } = run(creature, RED, 3)
    ;({ now } = run(creature, 0, LINGER + 0.5, now))
    expect(creature.phase).toBe('drowsy')
    expect(run(creature, RED, 0.2, now).events).toEqual(['perk'])
    expect(creature.phase).toBe('awake')
  })

  it('carrying it somewhere sets its bed and ends a wander', () => {
    const creature = snail()
    creature.phase = 'wandering'
    moveBed(creature, { x: 5, y: 6 })
    expect(creature.bed).toEqual({ x: 5, y: 6 })
    expect(creature.phase).toBe('awake')
  })

  it('picks a new bed that is roomy and dark for its own colour', () => {
    const creature = makeCreature(0, 'moth', WHITE, 4.6, { x: 0, y: 0 })
    const lit = (at: { x: number; y: number }) => (at.x > 0 ? WHITE : 0)
    const crowded = (at: { x: number; y: number }) => Math.hypot(at.x - -15, at.y - 0)
    const bed = pickBed(creature, seededRandom(7), crowded, lit)
    expect(bed.x).toBeLessThanOrEqual(0)
    expect(crowded(bed)).toBeGreaterThan(8)
    expect(Math.hypot(bed.x, bed.y)).toBeGreaterThan(10)
    expect(pickBed(creature, seededRandom(7), crowded, lit)).toEqual(bed)
  })
})
