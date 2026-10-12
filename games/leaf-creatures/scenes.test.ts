import { describe, expect, it } from 'vitest'
import { WIND_FACE } from './castArt'
import { BEDS, CAST, GROUND, HEAPS, inEllipse } from './clearing'
import { TIERS } from './config'
import { Painter } from './painter'
import type { Creature } from './creatures'
import type { Kind } from './parts'
import { write } from './save'
import { sceneLength } from './scene'
import { acornBeats, beddingBeats, eyesOffBeats, wakingBeats } from './scenes'
import { caps, placed } from './things'
import { DT, RecordingPen, again, clearing, drag, heard, many, play, tapHeap, thing, toyOf } from './testing'
import { Toy } from './toy'
import { drawFrame } from './view'
import { holdsLadder } from './visit'
import { VOICES } from './voices'

// The four scenes. Each is the consequence of one act, is saved when it
// starts, gives way to any touch and is silent from that frame, and is never
// played again on load.

/** A thing with these parts and one cap, and a second cap sent to it by a tap: played to the frame it wakes. */
function woken(kinds: readonly Kind[], others: ReturnType<typeof thing>[] = []): { toy: Toy; creature: Creature } {
  const toy = toyOf(clearing([...others, thing(50, 590, 420, [...kinds, 'cap'])]))
  tapHeap(toy, 'cap')
  for (let f = 0; f < 150 && toy.sceneKind !== 'waking'; f++) toy.step(DT)
  return { toy, creature: toy.creatures[toy.creatures.length - 1] }
}

/** A creature that stands still at 590, 420 until it is told otherwise. */
function standing(kinds: readonly Kind[], more: Parameters<typeof thing>[5] = {}): { toy: Toy; creature: Creature } {
  const toy = toyOf(clearing([thing(1, 590, 420, kinds, 1, more)]))
  toy.creatures[0].rest = 999
  return { toy, creature: toy.creatures[0] }
}

/** Strokes a creature: a finger lands on its first part and goes 110 units along it. */
function stroke(toy: Toy, creature: Creature): void {
  const at = placed(creature.thing, creature.thing.parts[0])
  drag(toy, at.x - 40, at.y, at.x + 70, at.y)
}

const SCENE_ONLY = ['shake', 'gust', 'strain', 'pfft', 'whirl', 'peek', 'yawn', 'hush', 'sigh', 'drop', 'dig', 'pop']

describe('the waking', () => {
  it('is saved when it starts: awake and its place in the order of waking, at once', () => {
    const { toy, creature } = woken(['willow', 'twig'])
    expect(toy.sceneKind).toBe('waking')
    expect(toy.changed).toBe(2)
    expect(creature.inScene).toBe(true)
    expect(creature.eyes).toBe(0)
    const kept = toy.saved().things[0]
    expect([kept.awake, kept.woke]).toEqual([true, 1])
  })

  it('lasts four to eight seconds whatever the thing is made of', () => {
    for (const kinds of [['willow'], many('twig', 6), ['feather', 'feather', 'maple'], ['round', 'round', 'seed'], ['twig', 'seed', 'seed']] as Kind[][]) {
      const { toy, creature } = woken(kinds)
      expect(creature, kinds.join() + ' ' + toy.things.map((t) => t.parts.map((p) => p.kind + ':' + p.fall.toFixed(2)).join()).join('|')).toBeDefined()
      const length = sceneLength(wakingBeats(toy, creature))
      expect(length, kinds.join()).toBeGreaterThanOrEqual(4)
      expect(length, kinds.join()).toBeLessThanOrEqual(8)
    }
  })

  it('opens the eyes one and then the other, each with its sound in the frame it opens, then shakes and makes its first move', () => {
    const { toy, creature } = woken(['willow', 'twig'])
    const from = { x: creature.thing.x, y: creature.thing.y }
    const opened: number[] = []
    let shook = -1
    for (let f = 0; f < 420; f++) {
      const before = creature.eyes
      toy.step(DT)
      const sounds = heard(toy)
      expect(sounds.includes('blink')).toBe(creature.eyes > before)
      if (creature.eyes > before) opened.push(f)
      if (sounds.includes('shake')) shook = f
    }
    expect(opened).toHaveLength(2)
    expect(opened[1] - opened[0]).toBeGreaterThan(15)
    expect(shook).toBeGreaterThan(opened[1])
    expect(Math.hypot(creature.thing.x - from.x, creature.thing.y - from.y)).toBeGreaterThan(20)
    expect(toy.scene).toBeNull()
    expect(creature.inScene).toBe(false)
  })

  it('is ended by a touch where its outcome stands, is silent from that frame, and the touch is then an ordinary touch', () => {
    const { toy, creature } = woken(many('twig', 3))
    play(toy, 0.7)
    toy.step(DT)
    // The big wind child is straining: the scene has sounds still to come and one perhaps just asked for.
    toy.ask('shake', 1, 1, true)
    toy.press(HEAPS.maple.x, HEAPS.maple.y)
    expect(toy.scene).toBeNull()
    expect(toy.hush).toBe(true)
    expect(toy.asked.map((sound) => sound.key)).toEqual(['lift-maple'])
    expect(toy.asked.every((sound) => !sound.scene)).toBe(true)
    expect(toy.hand?.kind).toBe('maple')
    expect([creature.eyes, creature.inScene, toy.cast.big.strain, toy.cast.big.blowIn]).toEqual([2, false, 0, 0])
    toy.cancel()
    const after = play(toy, 4)
    for (const key of SCENE_ONLY) expect(after, key).not.toContain(key)
    expect(after).not.toContain('blink')
  })

  it('is not played again on load: put away in its first moment, it is found awake and nothing blows or blinks', () => {
    const { toy } = woken(['willow', 'twig'])
    const next = again(toy)
    expect(next.scene).toBeNull()
    expect([next.creatures[0].eyes, next.creatures[0].inScene]).toEqual([2, false])
    next.press(300, 300)
    const sounds = play(next, 4)
    for (const key of [...SCENE_ONLY, 'blink']) expect(sounds, key).not.toContain(key)
    expect(next.air.gust).toBe(-1)
  })

  it('shows the big wind child its taste: a light creature sails up on its breath and it puffs once more', () => {
    const { toy, creature } = woken(['feather', 'feather', 'willow'])
    let high = 0, puffedAt = -1
    for (let f = 0; f < 420; f++) {
      toy.step(DT)
      if (heard(toy).includes('puff')) { puffedAt = f; expect(toy.cast.big.blowLeft).toBeGreaterThan(0) }
      high = Math.max(high, creature.body.lift)
    }
    expect(high).toBeGreaterThan(30)
    expect(puffedAt).toBeGreaterThan(60)
    expect(creature.body.lift).toBe(0)
  })

  it('shows it straining at a heavy one until it is red, and its cheeks pop in the frame the redness lets go', () => {
    const { toy } = woken(['twig', 'seed', 'seed'])
    let red = 0, strained = false, popped = false
    for (let f = 0; f < 420; f++) {
      const before = toy.cast.big.strain
      toy.step(DT)
      const sounds = heard(toy)
      red = Math.max(red, toy.cast.big.strain)
      if (sounds.includes('strain')) { strained = true; expect(before).toBeLessThan(0.05) }
      if (sounds.includes('pfft')) { popped = true; expect(before).toBeGreaterThan(0.95) }
    }
    expect([strained, popped]).toEqual([true, true])
    expect(red).toBeGreaterThan(0.95)
    expect(toy.cast.big.strain).toBe(0)
  })

  it('shows the small wind child its taste: it spins itself round at a roller and hides from five legs, peeking', () => {
    const roller = woken(['round', 'round'])
    let turned = 0
    const whirls = play(roller.toy, 0).length
    for (let f = 0; f < 420; f++) { roller.toy.step(DT); turned = Math.max(turned, Math.abs(roller.toy.cast.small.whirl)); if (heard(roller.toy).includes('whirl')) expect(turned).toBeLessThan(0.2) }
    expect(whirls).toBe(0)
    expect(turned).toBeGreaterThan(5)
    expect(roller.toy.cast.small.whirl).toBe(0)
    const legs = woken(many('twig', 5))
    let hid = 0, peeked = false
    for (let f = 0; f < 420; f++) {
      const before = legs.toy.cast.small.peek
      legs.toy.step(DT)
      hid = Math.max(hid, legs.toy.cast.small.hide)
      if (heard(legs.toy).includes('peek')) { peeked = true; expect([before, legs.toy.cast.small.peek]).toEqual([0, 1]) }
    }
    expect([hid, peeked]).toEqual([1, true])
    expect([legs.toy.cast.small.hide, legs.toy.cast.small.peek]).toEqual([0, 0])
  })

  it('shows the peek it sounds: in the frame the peek is heard both pupils are drawn, each wholly clear of the hand below it, and before it the hands lie over the eyes with no pupil drawn', () => {
    const legs = woken(many('twig', 5)), toy = legs.toy
    const stamps = (key: string): number[][] => {
      const pen = new RecordingPen()
      drawFrame(pen, toy, null, TIERS[0], new Painter())
      return pen.log.filter((line) => line.startsWith(`|stamp|${key},`)).map((line) => line.split('|')[2].split(',').slice(1, 3).map(Number))
    }
    const eyeY = CAST.small.y - 8 + WIND_FACE.small.eyeY
    let hidden = false, peeked = false
    for (let f = 0; f < 420 && !peeked; f++) {
      toy.step(DT)
      peeked = heard(toy).includes('peek')
      if (!peeked && toy.cast.small.hide === 1) {
        // Hidden: a hand over each eye, and no eye to be seen.
        hidden = true
        const mitts = stamps('mitt')
        expect(mitts).toHaveLength(2)
        for (const mitt of mitts) expect(Math.abs(mitt[1] - eyeY)).toBeLessThan(6)
        expect(stamps('pupil').filter((pupil) => pupil[1] < CAST.small.y + 40 && pupil[0] > CAST.small.x - 80)).toEqual([])
      }
    }
    expect([hidden, peeked]).toEqual([true, true])
    const mitts = stamps('mitt'), pupils = stamps('pupil').filter((pupil) => Math.abs(pupil[1] - eyeY) < 12 && Math.abs(pupil[0] - CAST.small.x) < 60)
    expect(mitts).toHaveLength(2)
    expect(pupils).toHaveLength(2)
    // The hand's picture reaches 28 above its middle however it is turned; a pupil is 8 round.
    for (const pupil of pupils) for (const mitt of mitts) expect(pupil[1] + 8).toBeLessThanOrEqual(mitt[1] - 28)
    // And each hand is still under its own eye: the child looks over them, it has not put them away.
    for (const mitt of mitts) expect(Math.abs(mitt[0] - CAST.small.x)).toBeLessThan(60)
  })

  it('shows the toad its taste: a low croak for a slitherer, a start and a glare for a scuttler', () => {
    const liked = woken(['willow', 'willow'])
    expect(play(liked.toy, 7)).toContain('croak')
    expect(liked.toy.cast.toad.glare).toBe(0)
    const disliked = woken(['twig', 'twig'])
    let glare = 0
    for (let f = 0; f < 420; f++) { disliked.toy.step(DT); glare = Math.max(glare, disliked.toy.cast.toad.glare) }
    expect(glare).toBeGreaterThan(0.8)
  })

  it('praises nobody: there is no cheer and no clap among the voices, and nothing in a waking answers the child', () => {
    for (const key of Object.keys(VOICES)) expect(key).not.toMatch(/clap|cheer|praise|star|win|bravo/)
  })

  it('sends the creature woken longest ago walking off when it is the sixth: out of the record at once, and seen to go', () => {
    const five = [0, 1, 2, 3, 4].map((i) => thing(i + 1, 380 + i * 100, 330 + (i % 2) * 150, ['willow', 'cap', 'cap'], i + 1))
    const { toy } = woken(['twig'], five)
    const eldest = toy.creatures.find((creature) => creature.thing.id === 1)!
    expect(eldest.leaving).toBe(true)
    expect(toy.saved().things.map((kept) => kept.id)).toEqual([2, 3, 4, 5, 50])
    // It is still there to be seen, and goes in its own way until it is past the trees.
    expect(toy.creatures).toContain(eldest)
    const from = eldest.thing.x
    play(toy, 3)
    expect(Math.abs(eldest.thing.x - from)).toBeGreaterThan(60)
    play(toy, 25)
    expect(toy.creatures).not.toContain(eldest)
  })
})

describe('the bedding down', () => {
  it('begins with one stroke that makes a creature drowsy, saved at once, and is no poke', () => {
    const { toy, creature } = standing(['willow', 'willow', 'feather', 'cap', 'cap'])
    stroke(toy, creature)
    expect(creature.thing.drowsy).toBe(true)
    expect(toy.changed).toBe(2)
    expect(toy.saved().things[0].drowsy).toBe(true)
    // It leans into the finger that strokes it, and lets go of the lean when the finger has gone.
    expect(creature.lean).toBe(1)
    expect(creature.leanX).toBeGreaterThan(0)
    expect(heard(toy)).toEqual(['feel', 'purr'])
    toy.drop()
    expect(heard(toy)).toEqual([])
    expect(creature.poke).toBeNull()
    expect(toy.scene).toBeNull()
    // Its lids sink half shut.
    play(toy, 1)
    expect(creature.lids).toBeGreaterThan(0.4)
    expect(creature.lids).toBeLessThan(0.6)
  })

  it('is woken fully by a poke, so one stroke after it is a first stroke again', () => {
    const { toy, creature } = standing(['willow', 'willow', 'cap', 'cap'], { drowsy: true })
    const at = placed(creature.thing, creature.thing.parts[0])
    toy.press(at.x, at.y); toy.tap()
    expect(creature.thing.drowsy).toBe(false)
    play(toy, 2)
    stroke(toy, creature)
    expect(toy.scene).toBeNull()
    expect(creature.thing.drowsy).toBe(true)
  })

  it('is caused by a second stroke on a drowsy one, lets go of the finger, and is saved when it starts with its bed under the fern', () => {
    const { toy, creature } = standing(['willow', 'willow', 'feather', 'cap', 'cap'], { drowsy: true })
    stroke(toy, creature)
    expect(toy.sceneKind).toBe('bedding')
    expect(toy.grip).toBeNull()
    expect(toy.changed).toBe(2)
    const kept = toy.saved().things[0]
    expect([kept.bedded, kept.drowsy, kept.x, kept.y]).toEqual([true, false, BEDS[0].x, BEDS[0].y])
    // What is shown is not there yet.
    expect(Math.hypot(creature.thing.x - 590, creature.thing.y - 420)).toBeLessThan(5)
    expect(sceneLength(beddingBeats(toy, creature, BEDS[0]))).toBeGreaterThanOrEqual(4)
    expect(sceneLength(beddingBeats(toy, creature, BEDS[0]))).toBeLessThanOrEqual(8)
    expect(holdsLadder(false, false, toy)).toBe(true)
  })

  it('yawns, goes to the fern, turns round once and settles: at its end it lies where it was saved, curled, eyes shut, under a sunk frond', () => {
    const { toy, creature } = standing(['willow', 'willow', 'feather', 'cap', 'cap'], { drowsy: true })
    stroke(toy, creature)
    toy.drop()
    const kept = toy.saved().things[0]
    const sounds = play(toy, 6.5)
    expect(sounds.indexOf('yawn')).toBeGreaterThanOrEqual(0)
    expect(sounds.indexOf('hush')).toBeGreaterThan(sounds.indexOf('yawn'))
    // The toad, who likes a sleeper, croaks low as it settles; only a seed nose whistles.
    expect(sounds.indexOf('croak')).toBeGreaterThan(sounds.indexOf('hush'))
    expect(sounds).not.toContain('whistle')
    const nosed = standing(['seed', 'willow', 'cap', 'cap'], { drowsy: true })
    stroke(nosed.toy, nosed.creature)
    nosed.toy.drop()
    expect(play(nosed.toy, 6.5)).toContain('whistle')
    expect(toy.scene).toBeNull()
    expect([creature.thing.x, creature.thing.y]).toEqual([BEDS[0].x, BEDS[0].y])
    expect([creature.body.curl, creature.lids, creature.inScene]).toEqual([1, 1, false])
    expect(toy.saved().things[0]).toEqual(kept)
    expect(toy.cast.fern.sunk).toBeGreaterThan(0.9)
  })

  it('is ended by a touch with the creature in its bed, and gives each sleeper a bed of its own', () => {
    const toy = toyOf(clearing([thing(1, 480, 420, ['willow', 'cap', 'cap'], 1, { drowsy: true }), thing(2, 720, 420, ['round', 'cap', 'cap'], 2, { drowsy: true })]))
    for (const creature of toy.creatures) creature.rest = 999
    stroke(toy, toy.creatures[0])
    toy.drop()
    play(toy, 1)
    toy.press(300, 300)
    expect(toy.scene).toBeNull()
    expect([toy.creatures[0].thing.x, toy.creatures[0].thing.y, toy.creatures[0].thing.bedded]).toEqual([BEDS[0].x, BEDS[0].y, true])
    toy.tap()
    stroke(toy, toy.creatures[1])
    expect(toy.sceneKind).toBe('bedding')
    expect([toy.saved().things[1].x, toy.saved().things[1].y]).toEqual([BEDS[1].x, BEDS[1].y])
  })

  it('leaves a sleeper to be woken by a tap where it lies, with no scene, and it walks back on to the ground', () => {
    const toy = toyOf(clearing([thing(1, BEDS[0].x, BEDS[0].y, ['willow', 'twig', 'cap', 'cap'], 1, { bedded: true })]))
    const creature = toy.creatures[0]
    play(toy, 1)
    expect([creature.thing.x, creature.thing.y, creature.lids]).toEqual([BEDS[0].x, BEDS[0].y, 1])
    toy.press(BEDS[0].x + 10, BEDS[0].y - 8)
    expect(heard(toy)).toEqual(['blink'])
    expect([creature.thing.bedded, toy.scene, toy.changed]).toEqual([false, null, 2])
    toy.tap()
    play(toy, 12)
    expect(inEllipse(creature.thing.x, creature.thing.y, GROUND, 4)).toBe(true)
    expect(creature.body.curl).toBeLessThan(0.05)
  })
})

describe('the eyes come off', () => {
  /** Drags the cap at `index` of a creature straight up, clear of it; the finger stays down. */
  function pull(toy: Toy, creature: Creature, index: number): void {
    const at = placed(creature.thing, creature.thing.parts[index])
    drag(toy, at.x, at.y, at.x, at.y - 260)
  }
  const capOf = (creature: Creature): number => creature.thing.parts.findIndex((part) => part.kind === 'cap')

  it('never happens to a tap: a finger that lands on an eye and lifts pokes it and takes nothing off', () => {
    const { toy, creature } = standing(['willow', 'twig', 'cap', 'cap'])
    const at = placed(creature.thing, creature.thing.parts[capOf(creature)])
    toy.press(at.x, at.y); toy.tap()
    expect(heard(toy)).toEqual(['feel', 'poke-cap'])
    expect([caps(creature.thing), toy.scene, toy.hand]).toEqual([2, null, null])
  })

  it('leaves a creature with three eyes awake when one is dragged off, with the cap in the hand', () => {
    const { toy, creature } = standing(['willow', 'twig', 'cap', 'cap', 'cap'])
    pull(toy, creature, capOf(creature))
    // The cap is in the hand and is still this creature's until it is pressed on somewhere: two eyes are open.
    expect([toy.hand?.kind, toy.hand?.pulled, toy.scene, caps(creature.thing), creature.eyes]).toEqual(['cap', true, null, 3, 2])
    expect(creature.thing.parts.filter((part) => part.inHand)).toHaveLength(1)
    expect(toy.things).toContain(creature.thing)
    expect(toy.changed).toBe(2)
    // Put away with the cap in the hand: it is found on its creature, where it was.
    expect(again(toy).things[0].parts.filter((part) => part.kind === 'cap')).toHaveLength(3)
    // The touch is taken away, which is no act of the child's: the eye is back on its creature and open, and nothing went to a heap.
    toy.cancel()
    expect([toy.hand, caps(creature.thing), creature.eyes, toy.air.strays.length]).toEqual([null, 3, 3, 0])
    expect(creature.thing.parts.some((part) => part.inHand)).toBe(false)
  })

  it('is caused by dragging a cap clear of a creature that has two, and is saved when it starts: the thing is out of the record, the cap is not stored', () => {
    const { toy, creature } = standing(['willow', 'twig', 'twig', 'cap', 'cap'])
    pull(toy, creature, capOf(creature))
    expect(toy.sceneKind).toBe('eyes')
    expect(toy.ghost).toBe(creature)
    expect(toy.saved().things).toEqual([])
    expect([toy.hand?.kind, toy.hand?.from]).toEqual(['cap', null])
    expect(again(toy).things).toEqual([])
    expect(sceneLength(eyesOffBeats(toy, creature))).toBeGreaterThanOrEqual(4)
    expect(sceneLength(eyesOffBeats(toy, creature))).toBeLessThanOrEqual(8)
  })

  it('breathes out, lets go, and its parts tumble home one after the other, each heard as it lands, while the cap stays in the hand', () => {
    const { toy, creature } = standing(['willow', 'twig', 'twig', 'cap', 'cap'])
    pull(toy, creature, capOf(creature))
    const left: number[] = [], sounds: string[] = heard(toy)
    for (let f = 0; f < 420; f++) {
      const before = creature.thing.parts.length
      toy.step(DT)
      sounds.push(...heard(toy))
      if (creature.thing.parts.length < before) { left.push(f); expect(before - creature.thing.parts.length).toBe(1) }
    }
    expect(sounds.indexOf('sigh')).toBeGreaterThanOrEqual(0)
    expect(sounds.indexOf('drop')).toBeGreaterThan(sounds.indexOf('sigh'))
    expect(sounds.indexOf('puff')).toBeGreaterThan(sounds.indexOf('drop'))
    expect(left).toHaveLength(4)
    expect(sounds.filter((sound) => sound === 'home')).toHaveLength(4)
    expect([toy.ghost, toy.scene, toy.hand?.kind]).toEqual([null, null, 'cap'])
    // The cap can be pressed on anywhere: let go over the earth, it begins a thing.
    toy.move(600, 480); play(toy, 0.5); toy.drop()
    expect(toy.things).toHaveLength(1)
    expect(toy.things[0].parts.map((part) => part.kind)).toEqual(['cap'])
  })

  it('is ended by a touch: the parts are back in their heaps without a sound', () => {
    const { toy, creature } = standing(['willow', 'twig', 'twig', 'cap', 'cap'])
    pull(toy, creature, capOf(creature))
    toy.move(600, 480); play(toy, 0.6); toy.drop()
    play(toy, 0.5)
    expect(toy.sceneKind).toBe('eyes')
    toy.press(200, 300)
    expect([toy.scene, toy.ghost, toy.hush]).toEqual([null, null, true])
    expect(toy.asked.every((sound) => !sound.scene)).toBe(true)
    toy.tap()
    const after = play(toy, 3)
    expect(after).not.toContain('home')
    expect(after).not.toContain('drop')
  })
})

describe('an acorn comes up', () => {
  const acorns = [{ x: 720, y: 420, dug: false }, { x: 400, y: 300, dug: false }, { x: 420, y: 540, dug: false }]
  const nosed = (): Toy => new Toy(clearing([thing(1, 600, 420, ['seed', 'seed', 'cap', 'cap'], 1)], { acorns }), 1)

  it('does not begin before a finger has landed in the visit', () => {
    const toy = nosed()
    for (let f = 0; f < 900; f++) toy.step(DT)
    expect([toy.scene, toy.acorns[0].dug, toy.asked.length]).toEqual([null, false, 0])
  })

  it('is caused by a seed nose reaching a buried acorn, is saved when it starts with where the push will leave the acorn, and does not hold the idle ladder', () => {
    const toy = nosed()
    toy.press(300, 200); toy.tap(); heard(toy)
    let frames = 0
    while (toy.sceneKind !== 'acorn' && frames++ < 1200) toy.step(DT)
    expect(toy.sceneKind).toBe('acorn')
    expect(toy.changed).toBe(2)
    const kept = toy.saved()
    expect(kept.acorns[0].dug).toBe(true)
    expect(Math.hypot(kept.acorns[0].x - 720, kept.acorns[0].y - 420)).toBeGreaterThan(40)
    expect(inEllipse(kept.acorns[0].x, kept.acorns[0].y, GROUND)).toBe(true)
    expect([toy.acornShown[0].x, toy.acornShown[0].y, toy.acornShown[0].out]).toEqual([720, 420, 0])
    expect(holdsLadder(false, false, toy)).toBe(false)
    const creature = toy.creatures[0]
    expect(sceneLength(acornBeats(toy, creature, 0, kept.acorns[0]))).toBeGreaterThanOrEqual(4)
    heard(toy)
    const sounds: string[] = []
    while (toy.scene) { toy.step(DT); sounds.push(...heard(toy)) }
    // It stands where the scene's first moment saved it.
    const stands = write(toy.saved()).things[0], meant = write(kept).things[0]
    expect(Math.hypot(stands.x - meant.x, stands.y - meant.y)).toBeLessThan(3)
    expect(Math.abs((((stands.turn - meant.turn) % 360) + 540) % 360 - 180)).toBeLessThan(12)
    play(toy, 0.5)
    expect(sounds.indexOf('dig')).toBeGreaterThan(sounds.indexOf('sniff'))
    expect(sounds.indexOf('pop')).toBeGreaterThan(sounds.indexOf('dig'))
    expect(sounds.indexOf('roll')).toBeGreaterThan(sounds.indexOf('pop'))
    expect([toy.acornShown[0].x, toy.acornShown[0].y, toy.acornShown[0].out]).toEqual([kept.acorns[0].x, kept.acorns[0].y, 1])
    expect(toy.scene).toBeNull()
  })

  it('leaves a dug acorn to be pressed back under the earth by a tap, with a pat, where it lies', () => {
    const toy = toyOf(clearing([], { acorns: [{ x: 640, y: 400, dug: true }, acorns[1], acorns[2]] }))
    toy.press(646, 404)
    expect(heard(toy)).toEqual(['pat'])
    expect([toy.acorns[0].dug, toy.acorns[0].x, toy.changed, toy.hand, toy.finger]).toEqual([false, 640, 2, null, null])
    toy.tap()
    play(toy, 1)
    expect(toy.acornShown[0].out).toBe(0)
  })
})
