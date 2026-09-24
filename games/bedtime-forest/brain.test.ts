import { describe, expect, it } from 'vitest'
import { CARRY_LIFT, Creature, footprintGap, MOTION, type BrainEvent, type BrainWorld } from './brain'
import { ANIMAL_KEYS, ANIMALS, HOME_KEYS, HOMES, inClearing, START, type AnimalKey } from './layout'
import { createRng } from './rng'

function world(creatures: Creature[], events: string[] = [], options: Partial<Pick<BrainWorld, 'gazeHome' | 'leanWhenHeld'>> = {}): BrainWorld {
  return {
    rng: createRng(7),
    creatures,
    gazeHome: options.gazeHome ?? false,
    leanWhenHeld: options.leanWhenHeld ?? true,
    occupied: () => false,
    emit: (event: BrainEvent, creature: Creature) => events.push(`${creature.key}:${event}`),
  }
}

function run(creatures: Creature[], w: BrainWorld, seconds: number, dt = 1 / 60): void {
  for (let t = 0; t < seconds; t += dt) for (const c of creatures) c.step(dt, w)
}

function one(key: AnimalKey, x = 0, z = 0): Creature {
  const c = new Creature(key, ANIMAL_KEYS.indexOf(key), 0.3)
  c.placeAt(x, z)
  return c
}

/** How deep the worst pair of footprints overlaps (0 when everyone stands clear). */
function deepestOverlap(creatures: Creature[]): number {
  let worst = 0
  for (const a of creatures) for (const b of creatures) if (a !== b) worst = Math.max(worst, -footprintGap(a, a.x, a.z, b))
  return worst
}

describe('animals and homes', () => {
  it('each animal shares its home’s index, so the controller can map one to the other', () => {
    ANIMAL_KEYS.forEach((key, index) => expect(ANIMALS[key].home).toBe(HOME_KEYS[index]))
  })
})

describe('wandering', () => {
  it('everyone wanders, yawns, and stays inside the clearing', () => {
    const creatures = ANIMAL_KEYS.map((key, i) => one(key, -40 + i * 16, 0))
    const events: string[] = []
    const w = world(creatures, events)
    let walked = 0
    for (let t = 0; t < 120; t += 1 / 30) {
      for (const c of creatures) {
        c.step(1 / 30, w)
        expect(inClearing(c, -2)).toBe(true)
        if (c.mode === 'walk') walked += 1
      }
    }
    expect(walked).toBeGreaterThan(100)
    for (const key of ANIMAL_KEYS) expect(events).toContain(`${key}:yawn`)
  })

  it('a second tap gets the other trick: every animal takes its two tricks in turns', () => {
    for (const key of ANIMAL_KEYS) {
      const c = one(key)
      const w = world([c])
      const played: number[] = []
      for (let tap = 0; tap < 4; tap++) {
        c.pickUp()
        c.drop(true)
        for (let t = 0; t < 1 && c.mode !== 'trick'; t += 1 / 60) c.step(1 / 60, w)
        expect(c.mode).toBe('trick')
        played.push(c.trickVariant)
        run([c], w, MOTION[key].trick + 0.1)
      }
      expect(played, key).toEqual([0, 1, 0, 1])
    }
  })

  it('an animal hidden behind a bigger one steps out into view, even while everyone stands gazing home', () => {
    const fox = one('fox', 0, 12)
    // Side-on, heading home: facing the child, its long tail would reach back over the bird.
    fox.yaw = -Math.PI / 2
    const bird = one('songbird', 1, -6)
    const creatures = [fox, bird]
    expect(bird.hiddenBy(creatures)).toBe(fox)
    run(creatures, world(creatures, [], { gazeHome: true }), 2.5)
    expect(bird.hiddenBy(creatures)).toBeNull()
    expect(bird.mode).toBe('idle')
    expect(Math.hypot(fox.x, fox.z - 12)).toBeLessThan(0.5)
    // A big animal behind a small one can still be seen over it.
    expect(one('bear', 0, 2).hiddenBy([one('songbird', 0, 12)])).toBeNull()
  })

  it('animals spread out across the clearing instead of bunching up', () => {
    const creatures = ANIMAL_KEYS.map((key) => one(key, START[key].x, START[key].z))
    const w = world(creatures)
    let gaps = 0
    let samples = 0
    let touching = 0
    for (let t = 0; t < 300; t += 1 / 30) {
      for (const c of creatures) c.step(1 / 30, w)
      for (const a of creatures) {
        let nearest = Infinity
        for (const b of creatures) if (a !== b) nearest = Math.min(nearest, Math.hypot(a.x - b.x, a.z - b.z) - a.spec.radius - b.spec.radius)
        gaps += nearest
        samples += 1
        if (nearest < 1) touching += 1
      }
    }
    expect(gaps / samples).toBeGreaterThan(4)
    expect(touching / samples).toBeLessThan(0.45)
  })

  it('nobody stands inside anyone’s drawn body, even with all six crowded together doing their tricks', () => {
    const creatures = ANIMAL_KEYS.map((key, i) => {
      const c = one(key, (i % 3) * 6 - 6, Math.floor(i / 3) * 6)
      c.yaw = i * 1.1
      return c
    })
    const w = world(creatures)
    for (const c of creatures) {
      c.pickUp()
      c.drop(true)
    }
    let tricks = 0
    let worst = 0
    for (let t = 0; t < 4; t += 1 / 60) {
      for (const c of creatures) c.step(1 / 60, w)
      tricks += creatures.filter((c) => c.mode === 'trick').length
      if (t > 0.6) worst = Math.max(worst, deepestOverlap(creatures))
    }
    expect(tricks).toBeGreaterThan(60)
    // A turning body can brush a neighbour for a frame; never more than a hair.
    expect(worst).toBeLessThan(0.5)
  })

  it('a long fox and a broad bear keep apart by their drawn shapes, not by a circle', () => {
    const fox = one('fox', 0, 0)
    const bear = one('bear', -26, 0)
    // Both face the same way along x, the bear's nose at the fox's tail.
    fox.yaw = bear.yaw = Math.PI / 2
    expect(Math.hypot(fox.x - bear.x, fox.z - bear.z)).toBeGreaterThan(fox.spec.radius + bear.spec.radius)
    expect(footprintGap(fox, fox.x, fox.z, bear)).toBeLessThan(-5)
    const creatures = [fox, bear]
    run(creatures, world(creatures, [], { gazeHome: true }), 1)
    expect(footprintGap(fox, fox.x, fox.z, bear)).toBeGreaterThan(0)
  })

  it('idle gaze stops the walking and turns every face toward its home', () => {
    const creatures = ANIMAL_KEYS.map((key, i) => one(key, -40 + i * 16, 0))
    const w = world(creatures, [], { gazeHome: true })
    run(creatures, w, 3)
    for (const c of creatures) {
      expect(c.mode).toBe('idle')
      expect(c.look).toBeGreaterThan(0.9)
    }
  })
})

describe('carrying', () => {
  it('a carried animal hangs below the finger and swings when the finger moves', () => {
    const fox = one('fox')
    const w = world([fox])
    fox.pickUp()
    fox.setGrab(0, 0)
    run([fox], w, 0.6)
    expect(fox.mode).toBe('held')
    expect(fox.y).toBeGreaterThan(5)
    fox.setGrab(40, 0)
    let most = 0
    for (let t = 0; t < 0.8; t += 1 / 60) {
      fox.step(1 / 60, w)
      most = Math.max(most, Math.abs(fox.swingX))
    }
    expect(most).toBeGreaterThan(0.05)
  })

  it('a carried rabbit rides up over the bear in its way instead of through it, and back down after', () => {
    const bear = one('bear', 0, 0)
    const rabbit = one('rabbit', -50, 0)
    const creatures = [bear, rabbit]
    const w = world(creatures, [], { gazeHome: true })
    rabbit.pickUp()
    rabbit.setGrab(-50, 0)
    run(creatures, w, 0.5)
    let over = 0
    for (let t = 0; t <= 0.8; t += 1 / 60) {
      rabbit.setGrab(-50 + (100 * t) / 0.8, 0)
      for (const c of creatures) c.step(1 / 60, w)
      if (footprintGap(rabbit, rabbit.x, rabbit.z, bear) < 0) {
        over += 1
        expect(rabbit.y).toBeGreaterThan(bear.spec.footprint.top)
      }
    }
    expect(over).toBeGreaterThan(3)
    run(creatures, w, 1.2)
    expect(rabbit.y).toBeCloseTo(CARRY_LIFT, 0)
  })

  it('a carried rabbit passes under a bird flying over instead of rising up through it', () => {
    const owl = one('owl', 60, 20)
    // Under the middle of the owl's flight from the burrow home to its hollow, where it flies highest.
    const x = (HOMES.burrow.mouth.x + HOMES.hollow.mouth.x) / 2
    const z = (HOMES.burrow.mouth.z + HOMES.hollow.mouth.z) / 2
    const rabbit = one('rabbit', x, z)
    const creatures = [owl, rabbit]
    const w = world(creatures)
    rabbit.pickUp()
    rabbit.setGrab(x, z)
    owl.pickUp()
    owl.sendTo('burrow')
    let under = 0
    for (let t = 0; t < 6; t += 1 / 60) {
      for (const c of creatures) c.step(1 / 60, w)
      if (footprintGap(rabbit, rabbit.x, rabbit.z, owl) >= 0) continue
      under += 1
      expect(rabbit.y + rabbit.spec.footprint.top).toBeLessThan(owl.y)
    }
    expect(under).toBeGreaterThan(3)
    expect(owl.mode).toBe('asleep')
    expect(rabbit.y).toBeCloseTo(CARRY_LIFT, 0)
  })

  it('let go over someone, an animal slides off them on the way down instead of landing inside', () => {
    const bear = one('bear', 0, 0)
    const rabbit = one('rabbit', -50, 0)
    const creatures = [bear, rabbit]
    const w = world(creatures, [], { gazeHome: true })
    rabbit.pickUp()
    rabbit.setGrab(0, 2)
    run(creatures, w, 1)
    expect(rabbit.y).toBeGreaterThan(bear.spec.footprint.top)
    rabbit.drop()
    for (let t = 0; t < 1 && rabbit.mode === 'fall'; t += 1 / 60) for (const c of creatures) c.step(1 / 60, w)
    expect(rabbit.mode).not.toBe('fall')
    expect(footprintGap(rabbit, rabbit.x, rabbit.z, bear)).toBeGreaterThan(-0.5)
  })

  it('the bear swings wider and slower than the songbird for the same move', () => {
    const measure = (key: AnimalKey) => {
      const c = one(key)
      const w = world([c])
      c.pickUp()
      c.setGrab(0, 0)
      run([c], w, 1)
      c.setGrab(30, 0)
      let most = 0
      for (let t = 0; t < 1.5; t += 1 / 60) {
        c.step(1 / 60, w)
        most = Math.max(most, Math.abs(c.swingX))
      }
      return most
    }
    expect(measure('bear')).toBeGreaterThan(measure('songbird') * 1.5)
  })

  it('a quick tap-release lands and then plays its trick', () => {
    const rabbit = one('rabbit', 10, 0)
    const events: string[] = []
    const w = world([rabbit], events)
    rabbit.pickUp()
    run([rabbit], w, 0.15)
    rabbit.drop(true)
    run([rabbit], w, 1)
    expect(events).toContain('rabbit:land')
    expect(events).toContain('rabbit:trick')
  })
})

describe('homes', () => {
  it('carried to its own home, an animal settles and then snores', () => {
    for (const key of ANIMAL_KEYS) {
      const c = one(key, 0, 0)
      const events: string[] = []
      const w = world([c], events)
      c.pickUp()
      run([c], w, 0.2)
      c.sendTo(ANIMALS[key].home)
      run([c], w, 2.5)
      expect(c.mode).toBe('asleep')
      expect(c.homeBound).toBe(true)
      run([c], w, MOTION[key].breath * 2 + 0.1)
      expect(events).toContain(`${key}:settle`)
      expect(events.filter((e) => e === `${key}:snore`).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('the bear bumps out of the burrow and is back on the grass, awake', () => {
    const bear = one('bear')
    const events: string[] = []
    const w = world([bear], events)
    bear.pickUp()
    bear.sendTo('burrow')
    run([bear], w, 3.5)
    expect(events).toContain('bear:bumped')
    expect(bear.roaming).toBe(true)
    expect(bear.homeBound).toBe(false)
    expect(inClearing(bear, -30)).toBe(true)
  })

  it('the fish flops out of the nest and wriggles back to the pond', () => {
    const fish = one('fish', 30, 0)
    const events: string[] = []
    const w = world([fish], events)
    fish.pickUp()
    fish.sendTo('nest')
    run([fish], w, 1.2)
    expect(events).toContain('fish:flop')
    expect(fish.homeBound).toBe(true)
    run([fish], w, 8)
    expect(fish.mode).toBe('asleep')
    expect(events).toContain('fish:plop')
    expect(Math.hypot(fish.x - HOMES.pond.bed.x, fish.z - HOMES.pond.bed.z)).toBeLessThan(1)
  })

  it('a fox standing in the way of the fish flopping home steps aside instead of letting it through, even in long frames', () => {
    // At 60 fps and at the longest frame a slow device steps (1/20 s), when the fish covers more than the spacing in one.
    for (const dt of [1 / 60, 1 / 20]) {
      const fish = one('fish', 30, 0)
      // Halfway along the fish's way from the nest's door to the pond.
      const fox = one('fox', (HOMES.nest.door.x + HOMES.pond.mouth.x) / 2, (HOMES.nest.door.z + HOMES.pond.mouth.z) / 2)
      const creatures = [fox, fish]
      const w = world(creatures, [], { gazeHome: true })
      fish.pickUp()
      fish.sendTo('nest')
      let passing = 0
      let worst = 0
      for (let t = 0; t < 9; t += dt) {
        for (const c of creatures) c.step(dt, w)
        if (fish.mode !== 'travel') continue
        passing += 1
        worst = Math.max(worst, -footprintGap(fox, fox.x, fox.z, fish))
      }
      expect(passing, `dt ${dt}`).toBeGreaterThan(20)
      expect(worst, `dt ${dt}`).toBeLessThan(0.5)
      expect(fish.mode, `dt ${dt}`).toBe('asleep')
    }
  })

  it('the owl hops out of the burrow and flies to its hollow', () => {
    const owl = one('owl')
    const events: string[] = []
    const w = world([owl], events)
    owl.pickUp()
    owl.sendTo('burrow')
    run([owl], w, 6)
    expect(events).toContain('owl:flap')
    expect(owl.mode).toBe('asleep')
    expect(owl.y).toBeCloseTo(HOMES.hollow.bed.y, 0)
  })

  it('wakes, comes out, and wanders again', () => {
    const fox = one('fox')
    fox.sleepAtHome()
    const events: string[] = []
    const w = world([fox], events)
    fox.wake()
    run([fox], w, 4)
    expect(events).toContain('fox:exit')
    expect(fox.roaming).toBe(true)
    expect(inClearing(fox)).toBe(true)
  })
})
