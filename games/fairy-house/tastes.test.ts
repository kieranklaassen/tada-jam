import { describe, expect, it } from 'vitest'
import { FOLK, PERSONALITY, REACTIONS, type Who } from './folk'
import { FOUND, HOLLOW, hillTop, rootUnder, type Kind } from './kinds'
import { build, without, type Laid } from './rest'
import { freshSave } from './save'
import { SHED_MOTION, SUN_AT, TICK, Toy, placeOf, type Show, type ShownThing } from './toy'
import { AIR, BUSH, HILL, ROOT, SHED, WOOD } from './voices'

// The three ways a thing is shed, the tastes the sheet names, where the
// evening starts, and what a touch on nothing raises.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const found = (things: Laid[]): Toy => new Toy({ ...freshSave(7), things }, 3)
function letGo(toy: Toy, id: number, x: number): void {
  const home = FOUND[id].home
  toy.press(home.x, home.y - 8)
  toy.dragStart()
  toy.dragMove(x, 400)
  for (let i = 0; i < 30; i++) toy.step(TICK)
  toy.drop()
}
const thingOf = (show: Show, id: number): ShownThing => ({ ...[...show.things, ...show.front].find((thing) => thing.id === id)! })

/** A thing shed by `by`: every step from the moment it is shed until it lies at home, with the sounds of each step. */
function shed(by: 'leaf' | 'cap' | 'feather'): { steps: { thing: ShownThing; sounds: unknown[]; puffs: number }[]; from: ShownThing } {
  // An acorn cap on the ground is a bath, and what drops in it comes out with a splash: the cap that bounces a thing is a lamp, on a stone.
  const toy = found(by === 'cap' ? [{ id: idOf('pebble', 1), x: 640 }, { id: idOf('cap'), x: 640 }] : [{ id: idOf(by), x: 640 }])
  const pebble = idOf('pebble')
  letGo(toy, pebble, 640)
  const steps: { thing: ShownThing; sounds: unknown[]; puffs: number }[] = []
  let from: ShownThing | null = null
  for (let i = 0; i < 4 / TICK; i++) {
    const before = toy.sounds.length
    toy.step(TICK)
    const sounds = toy.sounds.slice(before).filter((sound) => sound.from === `knock ${pebble}`).map((sound) => sound.voice)
    if (!from && sounds.includes(SHED[by])) from = thingOf(toy.show(null), pebble)
    else if (from) steps.push({ thing: thingOf(toy.show(null), pebble), sounds, puffs: toy.show(null).puffs.length })
  }
  expect(toy.rested.map((rest) => rest.id)).not.toContain(pebble)
  return { steps, from: from! }
}
/** The steps of its first leap: up to and with the first time it comes down again. */
const firstLeap = <T extends { sounds: unknown[] }>(steps: T[]): T[] => steps.slice(0, steps.findIndex((step) => step.sounds.length > 0) + 1)

describe('flipped off, bounced off and slid off are three motions', () => {
  it('flips a thing off a leaf: high, and turning right over', () => {
    const { steps, from } = shed('leaf')
    const leap = firstLeap(steps)
    expect(from.y - Math.min(...leap.map((step) => step.thing.y))).toBeGreaterThan(110)
    expect(Math.abs(leap[leap.length - 1].thing.angle - from.angle)).toBeGreaterThan(Math.PI * 2)
    expect(leap.length * TICK).toBeCloseTo(SHED_MOTION.leaf.lasts, 1)
  })

  it('bounces a thing straight up off an acorn cap with no turn, down on the cap again with a clonk and no dust, and then away', () => {
    const { steps, from } = shed('cap')
    const leap = firstLeap(steps)
    const down = leap[leap.length - 1]
    expect(from.y - Math.min(...leap.map((step) => step.thing.y))).toBeGreaterThan(40)
    expect(from.y - Math.min(...leap.map((step) => step.thing.y))).toBeLessThan(80)
    expect(Math.abs(down.thing.x - from.x)).toBeLessThan(12)
    expect(Math.abs(down.thing.y - from.y)).toBeLessThan(2)
    expect(Math.abs(down.thing.angle - from.angle)).toBeLessThan(0.01)
    // The second clonk is the cap's own sound, softer, and raises no dust: it came down on the cap, not on the earth.
    expect(JSON.stringify(down.sounds[0])).not.toBe(JSON.stringify(SHED.cap))
    expect((down.sounds[0] as { frequency: number }[])[0].frequency).toBe(SHED.cap[0].frequency)
    expect(down.puffs).toBe(leap[0].puffs)
  })

  it('slides a thing off a feather: sideways and down, never up, leaning as it goes', () => {
    const { steps, from } = shed('feather')
    const leap = firstLeap(steps)
    const down = leap[leap.length - 1]
    for (const step of leap) expect(step.thing.y).toBeGreaterThanOrEqual(from.y - 0.01)
    expect(Math.abs(down.thing.x - from.x)).toBeGreaterThan(50)
    expect(down.thing.y).toBeCloseTo(HOLLOW.floorY, 0)
    expect(Math.abs(down.thing.angle - from.angle)).toBeGreaterThan(0.3)
    expect(Math.abs(down.thing.angle - from.angle)).toBeLessThan(1)
  })

  it('brings each of them home in the end, lying as it lay there', () => {
    for (const by of ['leaf', 'cap', 'feather'] as const) {
      const { steps } = shed(by)
      // Two bounces on the forest floor, as the sheet says: off a cap there is the clonk on the cap before them.
      expect(steps.filter((step) => step.sounds.length > 0), by).toHaveLength(by === 'cap' ? 3 : 2)
      const last = steps[steps.length - 1].thing, home = FOUND[idOf('pebble')].home
      expect([last.x, last.y, last.angle]).toEqual([home.x, home.y, home.angle])
      // The last landing does not snap it round: the step before, it was within a few degrees of how it lies.
      const landing = steps.length - 1 - [...steps].reverse().findIndex((step) => step.sounds.length > 0)
      const before = steps[landing - 1].thing.angle
      expect(Math.abs(Math.sin(before - home.angle))).toBeLessThan(0.2)
    }
  })
})

/** Which answer each of the three begins after a thing is set down: read from its pose a quarter of a second on. */
function faces(toy: Toy): Record<Who, { mouth: string; brow: number; lean: number; part: number }> {
  for (let i = 0; i < 0.34 / TICK; i++) toy.step(TICK)
  const now = toy.show(null).folk
  const show = { folk: Object.fromEntries(FOLK.map((who) => [who, { ...now[who] }])) as typeof now }
  // The fat one is slow: how far it leans is read at its furthest over the second after.
  const lean: Record<Who, number> = { fat: 0, tidy: show.folk.tidy.lean, tiny: show.folk.tiny.lean }
  for (let i = 0; i < 1 / TICK; i++) {
    toy.step(TICK)
    const fat = toy.show(null).folk.fat.lean
    if (Math.abs(fat) > Math.abs(lean.fat)) lean.fat = fat
  }
  return Object.fromEntries(FOLK.map((who) => [who, { mouth: show.folk[who].mouth, brow: show.folk[who].brow, lean: lean[who], part: show.folk[who].part }])) as Record<Who, { mouth: string; brow: number; lean: number; part: number }>
}
/** Sets a thing down and plays until it has landed. */
function landed(things: Laid[], id: number, x: number): Toy {
  const toy = found(things)
  letGo(toy, id, x)
  toy.sounds.length = 0
  for (let i = 0; i < 3 / TICK && !toy.sounds.some((sound) => sound.from === `knock ${id}`); i++) toy.step(TICK)
  return toy
}

describe('every taste the sheet names has its answer', () => {
  it('pulls the fat one back from water: at a bath set down, and at a splash out of one', () => {
    const bath = faces(landed([], idOf('cap'), 640))
    expect(bath.fat.mouth).toBe('pout')
    expect(bath.fat.brow).toBeLessThan(-0.3)
    expect(bath.fat.lean).toBeLessThan(-1)
    // The same acorn cap on a stone is a lamp, and dry: it only looks.
    const lamp = faces(landed([{ id: idOf('pebble'), x: 640 }], idOf('cap'), 640))
    expect(lamp.fat.mouth).toBe('smile')
    // A pebble dropped into a bath comes out with a splash, and the fat one pulls back again.
    const splash = landed([{ id: idOf('cap'), x: 640 }], idOf('pebble'), 640)
    expect(faces(splash).fat.mouth).toBe('pout')
  })

  it('pleases the tidy one with a thing set down level, and not with one that leans or rocks', () => {
    // A cloth on a slab lies level.
    const level = faces(landed([{ id: idOf('bark'), x: 640 }], idOf('leaf'), 640))
    expect(level.tidy.mouth).toBe('smile')
    expect(level.tidy.brow).toBeGreaterThan(0.3)
    expect(level.tidy.lean).toBeGreaterThan(1)
    // A pebble on moss leans: it only looks.
    const leans = faces(landed([{ id: idOf('moss'), x: 640 }], idOf('pebble'), 640))
    expect(leans.tidy.mouth).toBe('flat')
    // A cradle rocks: it only looks.
    const rocks = faces(landed([{ id: idOf('moss'), x: 640 }], idOf('cap'), 640))
    expect(rocks.tidy.mouth).toBe('flat')
  })

  it('makes that nod no larger than its dislikes, with its eyes on the thing wherever the thing lies', () => {
    const { level, dust, tumble } = REACTIONS.tidy
    for (const dislike of [dust, tumble]) {
      expect(Math.abs(level.lean)).toBeLessThanOrEqual(Math.abs(dislike.lean) + 1)
      expect(Math.abs(level.kick)).toBeLessThanOrEqual(Math.abs(dislike.kick) + 0.1)
      expect(Math.abs(level.prop)).toBeLessThanOrEqual(Math.abs(dislike.prop) + 0.2)
      expect(level.holds).toBeLessThanOrEqual(dislike.holds)
      expect(Math.abs(level.brow)).toBeLessThanOrEqual(Math.abs(dislike.brow))
    }
    // It says nothing, as it says nothing at an ordinary landing.
    expect(level.says).toBeNull()
    for (const x of [470, 640, 780]) {
      const toy = landed([{ id: idOf('bark'), x }], idOf('leaf'), x)
      const cloth = toy.rested.find((rest) => rest.kind === 'leaf')!
      for (let i = 0; i < 0.5 / TICK; i++) toy.step(TICK)
      const pose = toy.show(null).folk.tidy, eyes = PERSONALITY.tidy.eyes
      expect(pose.mouth).toBe('smile')
      // Its pupils point from its eyes to the thing.
      const dx = cloth.x - eyes.x, dy = cloth.y - 20 - eyes.y, far = Math.hypot(dx, dy)
      expect(pose.gazeX).toBeCloseTo(dx / far, 1)
      expect(pose.gazeY).toBeCloseTo(dy / far, 1)
    }
  })

  it('makes the tidy one sniff at every puff of dust: at a twig stuck in the earth, and at its own feather after it has been pleased with it', () => {
    const twig = landed([], idOf('twig'), 640)
    expect(twig.show(null).puffs.length).toBe(1)
    const sniff = faces(twig)
    expect(sniff.tidy.mouth).toBe('pout')
    expect(sniff.tidy.brow).toBeLessThan(-0.3)
    // Its own feather on the ground: pleased first, and when that is over it sniffs at the dust.
    const feather = landed([], idOf('feather'), 640)
    expect(feather.show(null).puffs.length).toBe(1)
    const landedAt = feather.counts().answers.tidy
    // It likes a feather anywhere, and no more on the ground than elsewhere: the sheet names no such taste.
    expect(faces(feather).tidy.mouth).toBe('smile')
    expect(faces(landed([{ id: idOf('moss'), x: 640 }], idOf('feather'), 640)).tidy.mouth).toBe('smile')
    let sniffed = false
    for (let i = 0; i < 2 / TICK; i++) {
      feather.step(TICK)
      sniffed ||= feather.show(null).folk.tidy.mouth === 'pout'
    }
    expect(sniffed).toBe(true)
    // Two answers, one after the other: pleased, then the sniff.
    expect(feather.counts().answers.tidy).toBe(landedAt + 2)
    // A feather on moss raises no dust: it is pleased, and does not sniff.
    const quilt = landed([{ id: idOf('moss'), x: 640 }], idOf('feather'), 640)
    expect(quilt.show(null).puffs).toEqual([])
    let pouted = false
    for (let i = 0; i < 3 / TICK; i++) {
      quilt.step(TICK)
      pouted ||= quilt.show(null).folk.tidy.mouth === 'pout'
    }
    expect(pouted).toBe(false)
  })
})

describe('whatever is shed or raises dust is answered, however it came about', () => {
  it('has all three answer a thing that is shed when its support is carried off, as they answer any tumble', () => {
    // A slab across a twig on the root step and one by the wall: with the second carried off, it would stand up into the arch on the first.
    const things: Laid[] = [{ id: idOf('twig'), x: 369 }, { id: idOf('twig', 1), x: 473 }, { id: idOf('bark'), x: 433 }]
    const house = build(things), slab = house.find((rest) => rest.kind === 'bark')!, twig = house.find((rest) => rest.id === idOf('twig', 1))!
    expect(slab.under).toHaveLength(2)
    expect(without(house, [twig.id]).shed.map((gone) => gone.id)).toEqual([slab.id])
    const toy = found(things)
    for (let i = 0; i < 0.5 / TICK; i++) toy.step(TICK)
    toy.press(twig.x, twig.y - 30)
    for (let i = 0; i < 0.5 / TICK; i++) toy.step(TICK)
    const before = toy.counts().answers
    toy.dragStart()
    expect(toy.rested.map((rest) => rest.id)).not.toContain(slab.id)
    for (let i = 0; i < 0.3 / TICK; i++) toy.step(TICK)
    const after = toy.counts().answers, pose = toy.show(null).folk
    for (const who of FOLK) expect(after[who], who).toBe(before[who] + 1)
    // The tidy one tuts at a tumble, and the tiny one laughs.
    expect(pose.tidy.mouth).toBe('pout')
    expect(pose.tiny.mouth).toBe('grin')
    toy.cancel()
  })

  it('has the tidy one sniff at the puff a see-saw raises when its end comes down', () => {
    const toy = found([{ id: idOf('pebble'), x: 640 }])
    letGo(toy, idOf('bark'), 650)
    let puffAt = -1, sniffed = false, answersAtPuff = 0
    for (let i = 0; i < 4 / TICK; i++) {
      toy.step(TICK)
      const show = toy.show(null)
      if (puffAt < 0 && show.puffs.length > 0) {
        puffAt = i
        answersAtPuff = toy.counts().answers.tidy
        // Until the end touches down it has only looked.
        expect(show.folk.tidy.mouth).not.toBe('pout')
      }
      if (puffAt >= 0 && i < puffAt + 0.5 / TICK) sniffed ||= show.folk.tidy.mouth === 'pout'
    }
    expect(toy.rested.find((rest) => rest.kind === 'bark')!.lies).toBe('tipped')
    expect(puffAt).toBeGreaterThan(0)
    expect(sniffed).toBe(true)
    expect(toy.counts().answers.tidy).toBe(answersAtPuff + 1)
  })

  /** Steps on, and for every new puff of dust says whether the tidy one began an answer and pouted within half a second of it. */
  function sniffs(toy: Toy, seconds: number): boolean[] {
    const puffs: { at: number; answers: number; sniffed: boolean }[] = []
    let dust = toy.show(null).puffs.filter((puff) => puff.kind === 'dust').length
    for (let i = 0; i < seconds / TICK; i++) {
      toy.step(TICK)
      const show = toy.show(null), now = show.puffs.filter((puff) => puff.kind === 'dust').length
      if (now > dust) puffs.push({ at: i, answers: toy.counts().answers.tidy, sniffed: false })
      dust = now
      for (const puff of puffs) if (i < puff.at + 0.5 / TICK && toy.counts().answers.tidy > puff.answers && show.folk.tidy.mouth === 'pout' && show.folk.tidy.brow < -0.3) puff.sniffed = true
    }
    return puffs.map((puff) => puff.sniffed)
  }

  it('has the tidy one sniff at the dust of a thing that drops back where it lay: after a tap, and after a drag that is cancelled', () => {
    for (const how of ['tap', 'cancel'] as const) {
      const toy = found([{ id: idOf('pebble'), x: 640 }])
      for (let i = 0; i < 1.5 / TICK; i++) toy.step(TICK)
      const stone = toy.rested[0]
      toy.press(stone.x, stone.y - 10)
      if (how === 'tap') toy.release()
      else {
        toy.dragStart()
        toy.dragMove(700, 380)
        for (let i = 0; i < 0.2 / TICK; i++) toy.step(TICK)
        toy.cancel()
      }
      const seen = sniffs(toy, 2)
      expect(seen.length, how).toBeGreaterThan(0)
      expect(seen.every(Boolean), how).toBe(true)
      expect(toy.rested.map((rest) => [rest.id, rest.x]), how).toEqual([[stone.id, stone.x]])
    }
  })

  it('has the tidy one sniff at the dust of each bounce of a thing that tumbles home, after its tut', () => {
    const toy = found([{ id: idOf('leaf'), x: 640 }])
    letGo(toy, idOf('pebble'), 640)
    const before = toy.counts().answers.tidy
    const seen = sniffs(toy, 4)
    expect(toy.rested.map((rest) => rest.id)).toEqual([idOf('leaf')])
    // One answer for the tumble and one for each puff: the tut, then the sniffs.
    expect(toy.counts().answers.tidy - before).toBe(1 + seen.length)
    // Two bounces on the earth, each with its dust.
    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(seen.every(Boolean)).toBe(true)
  })
})

describe('the evening starts when the sun is let go below the hill', () => {
  /** Drags the sun from where it is to a height and lets go. */
  function sunTo(toy: Toy, y: number): void {
    toy.press(SUN_AT.x, toy.show(null).sun.y)
    toy.dragStart()
    toy.dragMove(SUN_AT.x, y)
    toy.step(TICK)
    toy.drop()
  }

  it('starts no evening for a sun let go half way down, or on the hill line: only below it', () => {
    for (const y of [(SUN_AT.y + SUN_AT.setY) / 2, SUN_AT.hill - 30, SUN_AT.hill, SUN_AT.sink - 2]) {
      const toy = found([])
      sunTo(toy, y)
      expect(toy.evening, `let go at ${y}`).toBe(false)
      expect(toy.playing).toBe(false)
      // It goes back up to where the day has it.
      for (let i = 0; i < 3 / TICK; i++) toy.step(TICK)
      expect(toy.show(null).sun.y).toBeCloseTo(SUN_AT.y, 0)
    }
    for (const y of [SUN_AT.sink, SUN_AT.under, 700]) {
      const toy = found([])
      sunTo(toy, y)
      expect(toy.evening, `let go at ${y}`).toBe(true)
    }
    // Below the hill means below its line: at `sink` three quarters of the disc are behind the hill.
    expect(SUN_AT.sink - SUN_AT.hill).toBeGreaterThanOrEqual(38 / 2)
  })

  it('starts the morning only for a sun let go above the hill, and never drags the sun higher than the day has it', () => {
    const evening = (): Toy => { const toy = found([]); sunTo(toy, SUN_AT.under); for (let i = 0; i < 30 / TICK && toy.playing; i++) toy.step(TICK); for (let i = 0; i < 2 / TICK; i++) toy.step(TICK); return toy }
    for (const y of [SUN_AT.hill + 20, SUN_AT.hill, SUN_AT.rise + 2]) {
      const toy = evening()
      sunTo(toy, y)
      expect(toy.evening, `let go at ${y}`).toBe(true)
    }
    const toy = evening()
    toy.press(SUN_AT.x, toy.show(null).sun.y)
    toy.dragStart()
    toy.dragMove(SUN_AT.x, 20)
    toy.step(TICK)
    expect(toy.show(null).sun.y).toBe(SUN_AT.y)
    toy.drop()
    expect(toy.evening).toBe(false)
  })
})

describe('a touch on nothing', () => {
  it('raises dust on the ground only: the bark knocks and the owl shuts its eyes, the sky breathes and the moth flutters off', () => {
    expect(placeOf(600, 739)).toBe('ground')
    expect(placeOf(640, HOLLOW.floorY - 4)).toBe('ground')
    expect(placeOf(600, 150)).toBe('wood')
    expect(placeOf(640, 400)).toBe('wood')
    expect(placeOf(120, 100)).toBe('sky')
    expect(placeOf(1000, 150)).toBe('sky')
    const ground = found([])
    ground.press(600, 739)
    expect(ground.show(null).puffs).toHaveLength(1)
    expect(ground.sounds.map((sound) => sound.from)).toEqual(['pat'])
    for (const [x, y, from] of [[600, 150, 'wood'], [640, 400, 'wood'], [120, 100, 'air'], [1000, 150, 'air']] as const) {
      const toy = found([])
      const still = found([])
      toy.press(x, y)
      toy.release()
      expect(toy.show(null).puffs, `${x}, ${y}`).toEqual([])
      expect(toy.sounds.map((sound) => sound.from)).toEqual([from])
      // Something is seen to answer in that frame or over the next: the owl's eyes, or the moth's flight.
      for (let i = 0; i < 12; i++) { toy.step(TICK); still.step(TICK) }
      const a = toy.show(null), b = still.show(null)
      if (from === 'wood') expect(a.owl.shut).toBe(true)
      else expect(Math.hypot(a.moth.x - b.moth.x, a.moth.y - b.moth.y)).toBeGreaterThan(1)
      // And the three look at where the finger is.
      for (let i = 0; i < 40; i++) { toy.step(TICK); still.step(TICK) }
      expect(FOLK.some((who) => Math.abs(toy.show(null).folk[who].gazeX - still.show(null).folk[who].gazeX) + Math.abs(toy.show(null).folk[who].gazeY - still.show(null).folk[who].gazeY) > 0.05)).toBe(true)
    }
  })

  it('is answered by a root, a bush and the hill each as what it is, and by none of them as sky', () => {
    const spots = {
      // Both big roots, above the forest floor and down where they run along it.
      root: [[250, 600], [150, 654], [60, 662], [990, 600], [1150, 668]],
      // The bushes behind where the three sit, clear of them.
      bush: [[6, 480], [300, 470], [1160, 470]],
      // The hill under the sun, right of the tidy one: on its back, and in the air just over it.
      hill: [[1140, 425], [1150, 380], [1120, 356], [1165, Math.ceil(hillTop(1165, { x: 0, w: 1180 })) + 2]],
    }
    const voices = { root: ROOT, bush: BUSH, hill: HILL }, puffs = { root: 'stir', bush: 'leaves', hill: 'far' }
    for (const place of ['root', 'bush', 'hill'] as const) {
      for (const [x, y] of spots[place]) {
        expect(placeOf(x, y), `${x}, ${y}`).toBe(place)
        const toy = found([]), still = found([])
        toy.press(x, y)
        toy.release()
        // Its own sound, in the call the finger lands in, and nothing of the sky's: no breath of air and no dust.
        expect(toy.sounds.map((sound) => [sound.from, sound.voice]), `${x}, ${y}`).toEqual([[place, voices[place]]])
        // And something seen there, of its own kind: leaves out of the bush, a stir under the root, far birds off the hill.
        const seen = toy.show(null).puffs
        expect(seen.map((puff) => puff.kind), `${x}, ${y}`).toEqual([puffs[place]])
        if (place === 'root') expect(seen[0].y).toBeCloseTo(rootUnder(x), 5)
        if (place === 'hill') expect(seen[0].y).toBeCloseTo(hillTop(x, { x: 0, w: 1180 }), 5)
        if (place === 'bush') expect([seen[0].x, seen[0].y]).toEqual([x, y])
        // The moth does not flutter off faster, as it does at a touch on the sky.
        for (let i = 0; i < 12; i++) { toy.step(TICK); still.step(TICK) }
        expect(Math.hypot(toy.show(null).moth.x - still.show(null).moth.x, toy.show(null).moth.y - still.show(null).moth.y)).toBeLessThan(0.001)
      }
    }
    // Three sounds that are not each other's, nor the bark's, nor the air's.
    const all = [ROOT, BUSH, HILL, WOOD, AIR].map((voice) => JSON.stringify(voice))
    expect(new Set(all).size).toBe(5)
    // A root knocks low like wood: a tone as the bark's, and lower. A bush rustles: noise and no tone. The hill is far: a quarter as loud as the bark, or less.
    expect(ROOT[0]).toMatchObject({ kind: 'tone', wave: WOOD[0].kind === 'tone' ? WOOD[0].wave : '' })
    expect(ROOT[0].frequency).toBeLessThanOrEqual(WOOD[0].frequency / 2)
    expect(BUSH.every((note) => note.kind === 'noise')).toBe(true)
    expect(Math.max(...HILL.map((note) => note.peak))).toBeLessThanOrEqual(Math.max(...WOOD.map((note) => note.peak)) / 3)
    // The forest floor in front of a root, and the trunk between the roots, are what they were.
    expect(placeOf(250, 680)).toBe('ground')
    expect(placeOf(600, 200)).toBe('wood')
    expect(placeOf(500, 80)).toBe('wood')
    expect(placeOf(700, 40)).toBe('wood')
    expect(placeOf(330, 100)).toBe('sky')
  })
})
