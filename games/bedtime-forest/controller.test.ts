import { describe, expect, it } from 'vitest'
import { DAWN_SECONDS, NIGHT_SECONDS, NIGHTFALL_SECONDS } from './cycle'
import { ForestController, type Cue, type Projector, type Sound } from './controller'
import { IDLE_BEFORE_HINT } from './guidance'
import type { ScreenPoint } from './input'
import { ANIMAL_KEYS, HOMES, inClearing, type AnimalKey, type HomeKey } from './layout'
import { defaultForest, type ForestState } from './state'

// A straight-down camera: 4 px per world unit, height lifts things up the screen.
const projector: Projector = {
  toScreen(x, y, z, out) {
    out.x = 600 + x * 4
    out.y = 400 + z * 4 - y * 4
    return true
  },
  toPlane(sx, sy, height, out) {
    out.x = (sx - 600) / 4
    out.z = (sy - 400) / 4 + height
    return true
  },
}

function recordingSound(cues: string[]): Sound {
  return {
    unlock() {},
    setActive() {},
    cue(cue: Cue, animal: AnimalKey | null) {
      cues.push(animal ? `${cue}:${animal}` : cue)
    },
    knock(home: HomeKey) {
      cues.push(`knock:${home}`)
    },
    phase(phase) {
      cues.push(`phase:${phase}`)
    },
    dispose() {},
  }
}

function setup(state: ForestState = defaultForest(), childAge: number | null = 4) {
  const saves: ForestState[] = []
  const cues: string[] = []
  const forest = new ForestController(state, { save: (s) => saves.push(structuredClone(s)), sound: recordingSound(cues), childAge })
  forest.setProjector(projector)
  return { forest, saves, cues }
}

function run(forest: ForestController, seconds: number): void {
  for (let t = 0; t < seconds; t += 1 / 60) forest.step(1 / 60)
}

function screenOfAnimal(forest: ForestController, key: AnimalKey): ScreenPoint {
  const c = forest.creatures[ANIMAL_KEYS.indexOf(key)]
  const out = { x: 0, y: 0 }
  projector.toScreen(c.x, c.y + c.spec.size * 0.45, c.z, out)
  return out
}

function screenOfHome(home: HomeKey): ScreenPoint {
  const out = { x: 0, y: 0 }
  const mouth = HOMES[home].mouth
  projector.toScreen(mouth.x, mouth.y, mouth.z, out)
  return out
}

let clock = 0
/** Press an animal, carry it over a home in a few moves, and let go. */
function carry(forest: ForestController, key: AnimalKey, home: HomeKey, pointerId = 1): void {
  const from = screenOfAnimal(forest, key)
  const to = screenOfHome(home)
  forest.pointerDown(pointerId, from, (clock += 16))
  for (let k = 1; k <= 10; k++) {
    forest.pointerMove(pointerId, { x: from.x + ((to.x - from.x) * k) / 10, y: from.y + ((to.y - from.y) * k) / 10 })
    run(forest, 1 / 20)
  }
  run(forest, 0.4)
  forest.pointerUp(pointerId, to, (clock += 1000))
}

function creature(forest: ForestController, key: AnimalKey) {
  return forest.creatures[ANIMAL_KEYS.indexOf(key)]
}

describe('carrying animals to bed', () => {
  it('a carried animal lifts at once, answers with its voice, and settles in its own home', () => {
    const { forest, saves, cues } = setup()
    run(forest, 0.5)
    forest.pointerDown(1, screenOfAnimal(forest, 'owl'), (clock += 16))
    expect(creature(forest, 'owl').mode).toBe('held')
    expect(cues).toContain('pickup:owl')
    forest.pointerUp(1, screenOfAnimal(forest, 'owl'), (clock += 2000))
    run(forest, 2)
    carry(forest, 'owl', 'hollow')
    expect(cues).toContain('hover:owl')
    run(forest, 2.5)
    expect(creature(forest, 'owl').mode).toBe('asleep')
    expect(cues).toContain('settle:owl')
    expect(saves.at(-1)!.animals.owl.asleep).toBe(true)
  })

  it('the wrong home turns an animal away physically, and it is still awake afterwards', () => {
    const { forest, saves, cues } = setup()
    run(forest, 0.5)
    carry(forest, 'bear', 'burrow')
    run(forest, 3.5)
    expect(cues).toContain('bumped:bear')
    expect(creature(forest, 'bear').roaming).toBe(true)
    forest.pause()
    expect(saves.at(-1)!.animals.bear.asleep).toBe(false)
  })

  it('the fish flops out of the nest and ends asleep in the pond on its own', () => {
    const { forest } = setup()
    run(forest, 0.5)
    carry(forest, 'fish', 'nest')
    run(forest, 9)
    expect(creature(forest, 'fish').mode).toBe('asleep')
  })

  it('everyone in bed brings the night, then dawn wakes them one by one, songbird first and bear last', () => {
    const { forest, cues } = setup()
    run(forest, 0.5)
    for (const key of ANIMAL_KEYS) {
      carry(forest, key, HOMES[creature(forest, key).spec.home].key)
      run(forest, 9)
    }
    expect(forest.creatures.every((c) => c.asleep)).toBe(true)
    expect(forest.cycle.playful).toBe(false)
    expect(cues).toContain('phase:nightfall')
    const woke: string[] = []
    for (let t = 0; t < NIGHTFALL_SECONDS + NIGHT_SECONDS + DAWN_SECONDS + 4; t += 1 / 30) {
      forest.step(1 / 30)
      for (const c of forest.creatures) if (c.mode === 'wake' && !woke.includes(c.key)) woke.push(c.key)
    }
    expect(woke[0]).toBe('songbird')
    expect(woke.at(-1)).toBe('bear')
    expect(woke).toHaveLength(6)
    expect(forest.cycle.phase).toBe('dusk')
    run(forest, 3)
    for (const c of forest.creatures) expect(c.atHome || c.mode === 'exit').toBe(false)
  })

  it('a saved forest with everyone asleep plays the night and the morning when it opens', () => {
    const state = defaultForest()
    for (const key of ANIMAL_KEYS) state.animals[key].asleep = true
    const { forest } = setup(state)
    expect(forest.cycle.phase).toBe('nightfall')
  })
})

describe('touch at night and on the scenery', () => {
  it('sleepers cannot be picked up at night; a touch makes them stir', () => {
    const state = defaultForest()
    for (const key of ANIMAL_KEYS) state.animals[key].asleep = true
    const { forest, cues } = setup(state)
    run(forest, 1)
    forest.pointerDown(1, screenOfAnimal(forest, 'rabbit'), (clock += 16))
    expect(creature(forest, 'rabbit').mode).toBe('asleep')
    expect(cues).toContain('stir:rabbit')
    expect(creature(forest, 'rabbit').stirredAt).toBeGreaterThanOrEqual(0)
  })

  it('every touch answers: ground rustles, homes knock, night sparkles', () => {
    const { forest, cues } = setup()
    const before = forest.fxCount
    forest.pointerDown(1, { x: 600, y: 700 }, (clock += 16))
    forest.pointerUp(1, { x: 600, y: 700 }, (clock += 100))
    expect(cues).toContain('rustle')
    forest.pointerDown(2, screenOfHome('cave'), (clock += 16))
    forest.pointerUp(2, screenOfHome('cave'), (clock += 100))
    expect(cues).toContain('knock:cave')
    expect(forest.fxCount).toBe(before + 2)
  })
})

describe('gestures and pausing', () => {
  it('a fourth finger is a resting hand: the carried animal is set down', () => {
    const { forest } = setup()
    run(forest, 0.5)
    forest.pointerDown(1, screenOfAnimal(forest, 'fox'), (clock += 16))
    forest.pointerDown(2, { x: 100, y: 700 }, (clock += 16))
    forest.pointerDown(3, { x: 1100, y: 700 }, (clock += 16))
    expect(creature(forest, 'fox').mode).toBe('held')
    forest.pointerDown(4, { x: 1000, y: 700 }, (clock += 16))
    expect(creature(forest, 'fox').mode).toBe('fall')
  })

  it('putting the forest away mid-carry sets the animal down and saves it on the grass', () => {
    const { forest, saves } = setup()
    run(forest, 0.5)
    forest.pointerDown(1, screenOfAnimal(forest, 'rabbit'), (clock += 16))
    forest.pointerMove(1, { x: 1100, y: 100 })
    run(forest, 0.5)
    forest.setRunning(false)
    expect(creature(forest, 'rabbit').mode).toBe('fall')
    const saved = saves.at(-1)!.animals.rabbit
    expect(saved.asleep).toBe(false)
    expect(inClearing(saved, 3)).toBe(true)
    run(forest, 1)
    expect(creature(forest, 'rabbit').roaming).toBe(true)
  })
})

describe('guidance', () => {
  it('after a quiet stretch a ghost hand lifts one animal part of the way home; a touch clears it', () => {
    const { forest } = setup()
    forest.pointerDown(1, { x: 600, y: 700 }, (clock += 16))
    forest.pointerUp(1, { x: 600, y: 700 }, (clock += 100))
    run(forest, IDLE_BEFORE_HINT - 1)
    expect(forest.glowIndex).toBeGreaterThanOrEqual(0)
    expect(forest.gazeHome).toBe(true)
    expect(forest.hand.opacity).toBe(0)
    run(forest, 2)
    expect(forest.hand.opacity).toBeGreaterThan(0)
    const shown = forest.creatures[forest.handAnimal]
    expect(shown.mode).toBe('held')
    forest.pointerDown(2, { x: 600, y: 700 }, (clock += 16))
    expect(forest.hand.opacity).toBe(0)
    expect(shown.mode).toBe('fall')
    run(forest, 0.1)
    expect(forest.glowIndex).toBe(-1)
    expect(forest.gazeHome).toBe(false)
  })

  it('the ghost hand never puts an animal to bed, however long the child waits', () => {
    const { forest } = setup()
    forest.pointerDown(1, { x: 600, y: 700 }, (clock += 16))
    forest.pointerUp(1, { x: 600, y: 700 }, (clock += 100))
    run(forest, 200)
    for (const c of forest.creatures) expect(c.asleep).toBe(false)
  })

  it('on first open an animal yawns an invitation before any touch', () => {
    const { forest, cues } = setup()
    run(forest, 2)
    expect(cues.some((cue) => cue.startsWith('invite:'))).toBe(true)
  })

  it('carried animals lean toward home for the youngest, not for older children', () => {
    const young = setup(defaultForest(), 4).forest
    const older = setup(defaultForest(), 6).forest
    expect(young.leanWhenHeld).toBe(true)
    expect(older.leanWhenHeld).toBe(false)
  })
})
