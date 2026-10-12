import { describe, expect, it } from 'vitest'
import { BADGER_FACE, BLOW_SECONDS } from './badger'
import { BEHIND, foxChest } from './fox'
import { drawBadger, drawFox, drawHedgehog, drawOwl } from './figures'
import { Hand, SEEN, boundsOf, gripFor, woodSave, goHome, meetAll } from './hand'
import { APPLES, hogPoint } from './hedgehog'
import { BADGER_BOX, BODY_APART, HEDGEHOG_LANE, OWL_BOX, PLACES, REACH, apart, foxBox, hedgehogBox, within, wormPlace } from './layout'
import { Sketch } from './sketch'
import { freshSave } from './save'
import type { Paper, SheetWindow } from './sheet'
import { SOUND_KINDS, type SoundEvent, type SoundKind } from './sounds'
import { CANDLE_REST, EDGE, PAPER_RESTS, PILE, SHEET, WICK, fromSheet } from './table'
import { RUSH, STEP } from './wood'

// Every cell of the sheet's grid, every act at the table and every scene,
// played through the path the Mount uses, one step of the game's clock at a
// time. Each test says what its cell sounds like and what is seen; and every
// sound, in every test of this file, is held to the one clock: it is made in
// the step in which the motion it belongs to is seen to move.

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** A round window of the sheet. At 79 it throws its light to the right of the lantern, at 20 to the left, at 50 upwards. */
function hole(x: number, paper: Paper | null, r = 16, cut = true): SheetWindow {
  const outline: number[] = []
  for (let i = 0; i < 12; i++) outline.push(Math.round(x + Math.cos((i / 12) * Math.PI * 2) * r), Math.round(50 + Math.sin((i / 12) * Math.PI * 2) * r))
  return { outline, paper, cut }
}

const made = new Set<SoundKind>()
/** Every creature that was drawn outside its own room, or whose room lay on another's, in any test of this file. */
const outOfRoom = new Set<string>()
const sketch = new Sketch()
sketch.wobble = 0
let looked = 0

/** Draws the four large creatures as they stand and holds each to its room in layout.ts. */
function rooms(hand: Hand): void {
  const wood = hand.game.wood
  if (!wood || looked++ % 5 !== 0) return
  const fox = foxBox(wood.fox.x), hog = hedgehogBox(wood.hedgehog.x)
  for (const [name, paint, room] of [['fox', drawFox, fox], ['hedgehog', drawHedgehog, hog], ['badger', drawBadger, BADGER_BOX], ['owl', drawOwl, OWL_BOX]] as const) {
    sketch.clear()
    paint(sketch, wood, wood.time)
    const drawn = boundsOf(sketch)
    if (!within(drawn, room, 1)) outOfRoom.add(`${name} ${'mode' in wood[name] ? wood[name].mode : ''} by ${Math.round(Math.max(room.left - drawn.left, drawn.right - room.right, 0))} to the side, ${Math.round(Math.max(room.top - drawn.top, 0))} above, ${Math.round(Math.max(drawn.bottom - room.bottom, 0))} below`)
  }
  if (!apart(fox, hog) || !apart(fox, BADGER_BOX) || !apart(hog, BADGER_BOX)) outOfRoom.add(`rooms overlap with the fox at ${Math.round(wood.fox.x)} and the hedgehog at ${Math.round(wood.hedgehog.x)}`)
}
const unseen: string[] = []
const offClock: string[] = []

/** Holds every sound of a hand to the clock and to its motion. */
function watched(hand: Hand): Hand {
  hand.frame = STEP
  const readers = [...new Set(Object.values(SEEN))]
  let before = new Map<(h: Hand) => string, string>()
  let timeBefore = hand.game.time
  /** Sounds a pointer made whose motion starts with the step that follows it. */
  let owed: { event: SoundEvent; was: string }[] = []
  const read = (reader: (h: Hand) => string): string => {
    try { return reader(hand) } catch { return 'none' }
  }
  hand.before = () => {
    before = new Map(readers.map((reader) => [reader, read(reader)]))
    timeBefore = hand.game.time
  }
  hand.watch = () => rooms(hand)
  hand.after = (events, pointer) => {
    if (!pointer) {
      for (const { event, was } of owed) if (read(SEEN[event.kind]) === was) unseen.push(event.kind)
      owed = []
    }
    for (const event of events) {
      made.add(event.kind)
      // A sound carries the time of the step that made it: none is early, late or left from before.
      if (!(event.at > timeBefore - 1e-9 && event.at <= hand.game.time + 1e-9)) offClock.push(event.kind)
      const was = before.get(SEEN[event.kind])!
      if (read(SEEN[event.kind]) !== was) continue
      // A touch and the step after it are one frame: what a touch sounds may begin to move there.
      if (pointer) owed.push({ event, was })
      else unseen.push(event.kind)
    }
  }
  return hand
}

type Side = 'right' | 'left'

/** A lantern with one window, standing a little way off from where its light would lie on a point. */
function lanternBy(paper: Paper | null, x: number, y: number, side: Side = 'right', over: Record<string, unknown> = {}, off = 170) {
  const sheet = [hole(side === 'right' ? 79 : 20, paper)]
  const to = gripFor(new Hand(woodSave({ sheet })).wood, paper, x, y)
  const from = { x: clamp(to.x + (side === 'right' ? off : off), REACH.left, REACH.right), y: to.y }
  const hand = watched(new Hand(woodSave({ sheet, lantern: from, ...over })))
  return { hand, to }
}

/** Lays the light on the point, slowly, and holds it there. */
function shine(paper: Paper | null, x: number, y: number, hold: number, side: Side = 'right'): Hand {
  const { hand, to } = lanternBy(paper, x, y, side)
  hand.carry(to.x, to.y, 150, hold)
  return hand
}

/** Rushes the light across the point: from the right, or with `way` 1 from the left. */
function rush(paper: Paper | null, x: number, y: number, hold = 3, side: Side = 'left', way: 1 | -1 = -1, over: Record<string, unknown> = {}): Hand {
  const { hand, to } = lanternBy(paper, x, y, side, over, -way * 430)
  let fastest = 0
  hand.watch = () => { fastest = Math.max(fastest, hand.wood.speed); rooms(hand) }
  hand.carry(to.x + way * 430, to.y, 1500, hold)
  expect(fastest).toBeGreaterThan(RUSH)
  return hand
}

/** Brings a lantern that gives no light to a point: unlit, or lit with no window. */
function cold(x: number, y: number, hold: number, lit = false): Hand {
  const sheet = lit ? [] : [hole(79, 'yellow')]
  const to = { x: clamp(x - 40, REACH.left, REACH.right), y: clamp(y + 90, REACH.top, REACH.bottom) }
  const hand = watched(new Hand(woodSave({ sheet, lit, lantern: { x: clamp(to.x + 330, REACH.left, REACH.right), y: to.y } })))
  hand.carry(to.x, to.y, 220, hold)
  return hand
}

const kinds = (hand: Hand) => [...new Set(hand.heard.map((event) => event.kind))]
const tree = PLACES.mothTree, fern = wormPlace(2), owl = { x: PLACES.owl.x, y: PLACES.owl.y - 100 }

describe('the moths', () => {
  it('yellow, their rule: one after another they settle along the edge of the patch and ride with it, a patter for each', () => {
    const hand = shine('yellow', tree.x, tree.y, 4)
    expect(hand.count('patter')).toBe(8)
    expect(hand.wood.moths.list.every((moth) => moth.mode === 'on')).toBe(true)
    expect(hand.wood.met.has('moths')).toBe(true)
    const patch = hand.wood.patches[0]
    for (const moth of hand.wood.moths.list) expect(Math.hypot(moth.x - patch.x, moth.y - patch.y)).toBeGreaterThan(patch.rx * 0.6)
    // They ride with it.
    hand.carry(hand.wood.want.x - 200, hand.wood.want.y + 60, 120, 1)
    for (const moth of hand.wood.moths.list) expect(Math.hypot(moth.x - hand.wood.patches[0].x, moth.y - hand.wood.patches[0].y)).toBeLessThan(patch.rx * 2)
    expect(hand.game.toSave().moths).toBe('lantern')
  })

  it('red: they circle the patch nose to tail and stay out of it, and the last one bumps the lantern', () => {
    const hand = shine('red', tree.x, tree.y, 7)
    expect(hand.count('whirr')).toBeGreaterThan(0)
    expect(hand.count('tink')).toBe(1)
    const patch = hand.wood.patches[0]
    for (const moth of hand.wood.moths.list) expect(Math.hypot(moth.x - patch.x, moth.y - patch.y)).toBeGreaterThan(patch.rx)
    expect(hand.wood.met.has('moths')).toBe(false)
  })

  it('blue: they fold their wings and drop asleep at the foot of their own tree, and snore', () => {
    const hand = shine('blue', tree.x, tree.y, 6)
    expect(hand.count('pff')).toBe(8)
    expect(hand.count('mothSnore')).toBeGreaterThan(0)
    expect(hand.wood.moths.list.every((moth) => moth.mode === 'asleep' && moth.fold === 1)).toBe(true)
  })

  it('a rush: they are tumbled head over tail and sort themselves out', () => {
    const hand = rush('yellow', tree.x, tree.y, 3, 'right')
    expect(hand.count('tumble')).toBe(1)
    expect(hand.wood.moths.list.every((moth) => moth.mode === 'bark' && moth.spin === 0)).toBe(true)
  })

  it('an unlit lantern: they land on it until it sags on its wire', () => {
    const hand = cold(tree.x - 60, tree.y + 60, 5)
    expect(hand.count('rustle')).toBe(8)
    expect(hand.count('sag')).toBe(1)
    expect(hand.wood.sag).toBe(1)
  })

  it('plain light: they walk down the bark in a line, look in, and walk back up', () => {
    const hand = shine(null, tree.x, tree.y + 120, 2.9)
    expect(hand.count('tinyFeet')).toBeGreaterThan(3)
    expect(hand.wood.moths.peer).toBeGreaterThan(0)
    hand.carry(hand.wood.want.x - 420, 700, 300, 5)
    expect(hand.wood.moths.list.every((moth) => moth.mode === 'bark')).toBe(true)
    expect(hand.count('patter')).toBe(0)
  })
})

describe('the fox', () => {
  const chest = foxChest(PLACES.fox.x)

  it('yellow: it squints and sneezes its tail to twice the size', () => {
    const hand = shine('yellow', chest.x, chest.y, 1.2)
    expect(kinds(hand)).toEqual(expect.arrayContaining(['sniff', 'sneeze']))
    expect(hand.wood.fox.puff).toBeGreaterThan(0.5)
  })

  it('red, its rule: it follows the patch three paces behind, and sits and looks away when the lantern stops', () => {
    const hand = shine('red', chest.x, chest.y, 0.6)
    expect(hand.wood.met.has('fox')).toBe(true)
    // Its home is the left end of its lane: the red leads it to the right, and the hedgehog trots out of its road.
    const from = hand.wood.fox.x
    hand.carry(hand.wood.want.x + 480, hand.wood.want.y, 150, 2.5)
    expect(hand.wood.fox.x).toBeGreaterThan(from + 40)
    expect(hand.wood.hedgehog.x - hand.wood.fox.x).toBeGreaterThanOrEqual(BODY_APART)
    expect(hand.count('pad')).toBeGreaterThan(3)
    expect(hand.count('hum')).toBeGreaterThan(0)
    expect(hand.wood.fox.mode).toBe('pretend')
    // Three paces behind the red patch: where the patch stopped, less three paces, is where it sat down.
    expect(Math.abs(hand.wood.patches[0].x - hand.wood.fox.x - BEHIND)).toBeLessThan(30)
  })

  it('blue: it dabs the puddle, shakes its paw and jumps over it', () => {
    const hand = shine('blue', chest.x, chest.y, 2.4)
    expect(kinds(hand)).toEqual(expect.arrayContaining(['plip', 'shake', 'hop', 'thud']))
    expect(hand.wood.fox.x).not.toBe(PLACES.fox.x)
  })

  it('a rush: it pounces and lands on its nose', () => {
    const hand = rush('red', chest.x, chest.y, 0.7)
    expect(kinds(hand)).toEqual(expect.arrayContaining(['scrabble', 'thump']))
    expect(hand.wood.fox.dive).toBe(1)
    hand.wait(0.4)
    expect(hand.count('squeak')).toBe(1)
  })

  it('an unlit lantern: it sniffs at it twice and its nose knocks the glass', () => {
    const hand = cold(chest.x - 150, chest.y - 40, 3)
    expect(hand.count('noseSniff')).toBe(2)
    expect(hand.count('dong')).toBe(1)
  })

  it('plain light: it tilts its head further and further until it tips onto its side', () => {
    const hand = shine(null, chest.x, chest.y, 2.2)
    expect(kinds(hand)).toEqual(expect.arrayContaining(['whine', 'flop']))
    expect(hand.wood.fox.over).toBe(1)
  })
})

describe('the owl', () => {
  it('yellow: its head goes away to the left and it hoots once, long', () => {
    const hand = shine('yellow', owl.x, owl.y, 1.5)
    expect(hand.heard.filter((event) => event.kind === 'hoot').map((event) => event.n)).toEqual([0])
    expect(hand.wood.owl.yaw).toBe(-1)
    expect(hand.wood.met.has('owl')).toBe(true)
  })

  it('red: its head goes upside down and it hoots twice, the second higher', () => {
    const hand = shine('red', owl.x, owl.y, 1.5)
    expect(hand.heard.filter((event) => event.kind === 'hoot').map((event) => event.n)).toEqual([0.5, 0.6])
    expect(hand.wood.owl.roll).toBeCloseTo(Math.PI)
  })

  it('blue: it shuts one eye, then the other, and turns away slowly with one hoot', () => {
    const hand = shine('blue', owl.x, owl.y, 2)
    expect(hand.heard.filter((event) => event.kind === 'hoot').map((event) => event.n)).toEqual([1])
    expect(hand.wood.owl.lidLeft).toBe(1)
    expect(hand.wood.owl.lidRight).toBe(1)
    expect(hand.wood.owl.yaw).toBe(1)
  })

  it('a rush: its head spins like a top, and a feather comes loose and lands', () => {
    const hand = rush('yellow', owl.x, owl.y, 6)
    expect(hand.count('spin')).toBe(1)
    expect(hand.count('feather')).toBe(1)
    expect(hand.wood.owl.feather.down).toBe(true)
  })

  it('an unlit lantern: its beak clacks and it leans off the branch to peer', () => {
    const hand = cold(owl.x + 150, owl.y + 40, 2)
    expect(kinds(hand)).toEqual(expect.arrayContaining(['clack', 'hm']))
    expect(hand.wood.owl.lean).toBe(1)
  })

  it('plain light: as yellow', () => {
    const hand = shine(null, owl.x, owl.y, 1.5)
    expect(hand.heard.filter((event) => event.kind === 'hoot').map((event) => event.n)).toEqual([0])
  })
})

describe('the glow-worms', () => {
  it('blue, their rule: each worm the blue touches lights its lamp, one after another, and keeps it lit', () => {
    const hand = shine('blue', fern.x, fern.y, 2)
    const lit = hand.wood.worms.lamps
    expect(lit).not.toBe(0)
    expect(hand.count('chime')).toBe(lit.toString(2).replace(/0/g, '').length)
    const times = hand.heard.filter((event) => event.kind === 'chime').map((event) => event.at)
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThan(0.1)
    hand.carry(hand.wood.want.x + 300, 700, 300, 1)
    expect(hand.wood.worms.lamps).toBe(lit)
    expect(hand.wood.met.has('worms')).toBe(true)
  })

  it('red: they go out and duck under their leaves, and the leaves lift again to peep', () => {
    const { hand, to } = lanternBy('blue', fern.x, fern.y)
    hand.carry(to.x, to.y, 150, 1.5)
    expect(hand.wood.worms.lamps).not.toBe(0)
    const red = shine('red', fern.x, fern.y, 3)
    expect(red.count('duck')).toBeGreaterThan(0)
    expect(red.count('eep')).toBeGreaterThan(0)
    expect(red.count('eep')).toBeLessThanOrEqual(red.count('duck'))
    expect(red.wood.worms.lamps).toBe(0)
  })

  it('yellow: they blink out of step, and one loses its hold and drops off the fern', () => {
    // The fox sits under the left end of the fern, so it is the right end that lets go.
    const end = wormPlace(0)
    const hand = shine('yellow', end.x, end.y, 3)
    expect(hand.count('click')).toBeGreaterThan(3)
    expect(hand.count('plop')).toBe(1)
    // Taken out of the yellow, it climbs back onto the fern.
    hand.carry(hand.wood.want.x, 760, 300, 4)
    expect(hand.wood.worms.drop.i).toBe(-1)
  })

  it('a rush: their lamps flick on and off in a wave along the fern', () => {
    const hand = rush('blue', fern.x, fern.y, 1.5)
    expect(hand.count('trill')).toBe(5)
  })

  it('an unlit lantern: they let themselves down on threads and hang round it', () => {
    // To the right of the fox, where all five have room to hang.
    const hand = cold(fern.x + 200, fern.y + 150, 5)
    expect(hand.count('bead')).toBe(5)
    expect([...hand.wood.worms.hang]).toEqual([1, 1, 1, 1, 1])
  })

  it('plain light: they knock on their unlit lamps, and no lamp lights', () => {
    const hand = shine(null, fern.x, fern.y, 2)
    expect(hand.count('knock')).toBeGreaterThan(2)
    expect(hand.count('chime')).toBe(0)
    expect(hand.wood.worms.lamps).toBe(0)
  })
})

describe('the hedgehog', () => {
  const at = hogPoint(PLACES.hedgehog.x)

  /** Leads the hedgehog along with a slow light. */
  function lead(paper: Paper | null, by: number): Hand {
    const { hand, to } = lanternBy(paper, at.x, at.y)
    hand.carry(to.x, to.y, 150, 0.5)
    hand.carry(to.x + by, to.y, 60, 1)
    return hand
  }

  it('slow yellow, its rule: it trots along inside the patch, snuffling', () => {
    // Its home is the right-hand end of its lane: a slow light leads it to the left.
    const hand = lead('yellow', -120)
    expect(hand.count('feet')).toBeGreaterThan(3)
    expect(hand.count('snuffle')).toBeGreaterThan(0)
    expect(hand.wood.hedgehog.x).toBeLessThan(PLACES.hedgehog.x - 60)
    expect(hand.wood.met.has('hedgehog')).toBe(true)
  })

  it('slow red: it trots in the patch and spikes the red thing the light shows it', () => {
    const hand = lead('red', APPLES[1] - PLACES.hedgehog.x)
    expect(hand.count('feet')).toBeGreaterThan(3)
    // The apple that lay beside it at home, and the one the light led it to.
    expect(hand.count('spike')).toBeGreaterThanOrEqual(2)
    expect(hand.wood.hedgehog.carries & 6).toBe(6)
  })

  it('slow blue: it walks on tiptoe and shivers', () => {
    const hand = lead('blue', -80)
    expect(hand.count('tiptoe')).toBeGreaterThan(2)
    expect(hand.count('shiver')).toBeGreaterThan(0)
    expect(hand.count('feet')).toBe(0)
  })

  it('a rush: it pops into a ball, rolls until a root stops it, and uncurls the wrong way up', () => {
    // Found at the left end of its lane, and rushed from the left: it rolls the whole lane, to the root by its home.
    const hand = rush('yellow', HEDGEHOG_LANE.left + 10, at.y, 2.5, 'right', 1, { hedgehog: { x: HEDGEHOG_LANE.left + 10, y: PLACES.hedgehog.y } })
    expect(kinds(hand)).toEqual(expect.arrayContaining(['pop', 'rumble', 'root']))
    hand.wait(3)
    expect(hand.wood.hedgehog.mode).toBe('stand')
    expect(hand.wood.hedgehog.upside).toBe(0)
  })

  it('an unlit lantern: it walks straight into the pole, sits down and rubs its nose', () => {
    // The pole stands a little to its left, out of the fox's smell: it walks the few steps into it.
    const hand = cold(PLACES.hedgehog.x - 76, 610, 4)
    expect(kinds(hand)).toEqual(expect.arrayContaining(['feet', 'bonk', 'peep']))
  })

  it('a window too small to walk in: it sits down at the edge of the patch', () => {
    const sheet = [hole(79, 'yellow', 7)]
    const to = gripFor(new Hand(woodSave({ sheet })).wood, 'yellow', at.x, at.y)
    const hand = watched(new Hand(woodSave({ sheet, lantern: { x: to.x + 170, y: to.y } })))
    hand.carry(to.x, to.y, 150, 1.5)
    expect(hand.wood.hedgehog.mode).toBe('edge')
    expect(hand.wood.hedgehog.sit).toBe(1)
    expect(hand.count('feet')).toBe(0)
  })

  it('plain light: as yellow', () => {
    const hand = lead(null, -100)
    expect(hand.count('feet')).toBeGreaterThan(3)
  })
})

describe('the badger', () => {
  const face = BADGER_FACE

  for (const [paper, manner] of [['yellow', 0], ['red', 1], ['blue', 2], [null, 0]] as const) {
    it(`${paper ?? 'plain'} light on its face: it blows the candle out in its own way, with no wait`, () => {
      const hand = shine(paper, face.x, face.y, 0)
      hand.wait(BLOW_SECONDS[manner] + 0.3)
      expect(hand.heard.filter((event) => event.kind === 'cheeks').map((event) => event.n)).toEqual([manner / 2])
      expect(hand.heard.filter((event) => event.kind === 'blow').map((event) => event.n)).toEqual([manner / 2])
      const cheeks = hand.heard.find((event) => event.kind === 'cheeks')!, blow = hand.heard.find((event) => event.kind === 'blow')!
      expect(blow.at - cheeks.at).toBeCloseTo(BLOW_SECONDS[manner], 1)
      expect(hand.wood.lit).toBe(false)
      expect(hand.wood.met.has('badger')).toBe(true)
      // The wood stays as it was, and the badger sleeps.
      hand.wait(6)
      expect(hand.count('snore')).toBeGreaterThan(0)
      // A tap on the lantern lights it again, and the badger starts up.
      hand.up()
      hand.wait(0.5)
      hand.tap(hand.wood.lantern.x, hand.wood.lantern.y)
      expect(hand.wood.lit).toBe(true)
      expect(kinds(hand)).toEqual(expect.arrayContaining(['strike', 'grunt']))
    })
  }

  it('a rush: it blows and misses, with a raspberry, and looks about', () => {
    const hand = rush('yellow', face.x, face.y, 1)
    expect(kinds(hand)).toEqual(expect.arrayContaining(['miss', 'raspberry']))
    expect(hand.wood.lit).toBe(true)
    expect(hand.wood.badger.about).not.toBe(0)
  })

  it('an unlit lantern: it grins, lies back and is asleep at once', () => {
    const hand = cold(face.x + 120, face.y, 4)
    expect(hand.wood.badger.mode).toBe('asleep')
    expect(hand.count('snore')).toBeGreaterThan(0)
  })

  it('a lantern with no window burns and gives no light: a tap wakes the badger and leaves the candle as it is', () => {
    const hand = cold(face.x + 120, face.y, 4, true)
    expect(hand.wood.badger.mode).toBe('asleep')
    hand.up()
    hand.wait(0.5)
    hand.tap(hand.wood.lantern.x, hand.wood.lantern.y)
    expect(hand.count('grunt')).toBe(1)
    expect(hand.count('strike')).toBe(0)
    expect(hand.wood.lit).toBe(true)
    expect(hand.wood.badger.mode).toBe('sit')
  })
})

describe('the spider, which has no part in the rules', () => {
  it('pulls itself up when light touches it', () => {
    const hand = shine('yellow', PLACES.spider.x, PLACES.spider.y, 1)
    expect(hand.count('zip')).toBe(1)
    expect(hand.wood.spider.y).toBeLessThan(PLACES.spider.y - 40)
  })
})

describe('the lantern', () => {
  it('rings as it swings through the middle, lower on the left and higher on the right, and its wire ticks', () => {
    const hand = watched(new Hand(woodSave({ lantern: { x: 900, y: 700 } })))
    hand.carry(500, 700, 900, 1.5)
    expect(hand.count('ring')).toBe(1)
    expect(hand.count('bell')).toBeGreaterThan(0)
    expect(hand.count('wire')).toBeGreaterThan(0)
  })

  it('knocked on its hook, it rings and swings', () => {
    const hand = watched(new Hand(woodSave({ finished: true })))
    hand.tap(hand.wood.lantern.x, hand.wood.lantern.y)
    expect(hand.count('hookRing')).toBe(1)
    expect(hand.wood.hung).toBe(true)
  })
})

describe('at the table', () => {
  const point = (x: number, y: number) => fromSheet(x, y)

  it('cuts a window, backs it with a paper, loses a paper to the cat, and takes a fresh sheet', () => {
    const hand = watched(new Hand(freshSave(8)))
    expect(hand.table.sheet.length).toBe(0)
    // A cut: the scissors are at the finger and snip, and lifting closes it.
    const a = point(30, 30), b = point(60, 30), c = point(60, 70), d = point(30, 70)
    hand.down(a.x, a.y)
    hand.slide(b.x, b.y, 240); hand.slide(c.x, c.y, 240); hand.slide(d.x, d.y, 240)
    hand.up()
    hand.wait(0.4)
    expect(hand.table.sheet.length).toBe(1)
    expect(hand.table.sheet[0].cut).toBe(true)
    expect(hand.count('snip')).toBeGreaterThan(3)
    expect(hand.count('scrap')).toBe(1)
    // The scrap falls and the cat bats it.
    hand.wait(3)
    expect(hand.count('bat')).toBe(1)
    // A paper behind the window.
    const middle = point(45, 50), rest = PAPER_RESTS.blue
    hand.drag((rest.left + rest.right) / 2, (rest.top + rest.bottom) / 2, middle.x, middle.y, 400)
    hand.wait(0.4)
    expect(hand.table.sheet[0].paper).toBe('blue')
    expect(hand.count('tuck')).toBe(1)
    // A paper dropped where there is no window slides back, with the cat after it.
    const red = PAPER_RESTS.red
    hand.drag((red.left + red.right) / 2, (red.top + red.bottom) / 2, SHEET.right - 30, SHEET.top + 30, 400)
    hand.wait(0.4)
    expect(hand.count('back')).toBe(1)
    expect(hand.count('scamper')).toBe(1)
    hand.wait(1)
    expect(hand.table.sheet[0].paper).toBe('blue')
    // A bare place only knocks.
    hand.tap(240, 250)
    expect(hand.count('tap')).toBe(1)
    // A fresh sheet: the one in hand slides off to the cat and is gone.
    hand.drag((PILE.left + PILE.right) / 2, (PILE.top + PILE.bottom) / 2, 600, 440, 400)
    hand.wait(0.4)
    expect(kinds(hand)).toEqual(expect.arrayContaining(['off', 'land']))
    expect(hand.table.sheet.length).toBe(0)
    hand.wait(1.5)
  })

  it('closes a ninth cut again behind the scissors, and stores nothing', () => {
    const sheet = [12, 22, 32, 42, 52, 62, 72, 82].map((x) => hole(x, null, 4))
    const hand = watched(new Hand(freshSave(4)))
    hand.table.sheet = sheet
    const rev = hand.table.rev
    const a = point(40, 80), b = point(60, 80), c = point(60, 92), d = point(40, 92)
    hand.down(a.x, a.y)
    hand.slide(b.x, b.y, 240); hand.slide(c.x, c.y, 240); hand.slide(d.x, d.y, 240)
    hand.up()
    hand.wait(0.8)
    expect(hand.table.sheet.length).toBe(8)
    expect(hand.table.rev).toBe(rev)
    expect(hand.count('back')).toBe(1)
    expect(hand.count('scrap')).toBe(0)
  })

  it('a candle set on the flat sheet is rolled into the lantern, a set-down candle slides back, and knocks answer', () => {
    const hand = watched(new Hand(freshSave(4)))
    hand.drag(CANDLE_REST.x, CANDLE_REST.y, 260, 610, 400)
    hand.wait(1)
    expect(hand.count('back')).toBe(1)
    expect(hand.table.candle.x).toBe(CANDLE_REST.x)
    hand.drag(CANDLE_REST.x, CANDLE_REST.y, 560, 440, 400)
    hand.wait(0.6)
    expect(hand.table.made).toBe('candle')
    expect(kinds(hand)).toEqual(expect.arrayContaining(['roll', 'set', 'wobble']))
    // The rolled lantern knocked beside its wick wobbles; the scissors snip in their place.
    hand.tap(944, 436)
    expect(hand.count('snip')).toBe(1)
  })
})

describe('the three scenes', () => {
  it('out of the door, home, and taken down, each with its own sounds: a walk that meets all six by play, and in the ending the owl hoots once and its head is seen to turn', () => {
    const hand = watched(new Hand(freshSave(4)))
    hand.drag(EDGE.left + 30, 440, SHEET.left + 60, 440, 500)
    hand.wait(0.4)
    expect(hand.table.made).toBe('rolled')
    expect(kinds(hand)).toEqual(expect.arrayContaining(['slide', 'roll']))
    hand.tap(570, 470)
    expect(hand.count('wobble')).toBe(1)
    hand.drag(CANDLE_REST.x, CANDLE_REST.y, WICK.x, WICK.y + 90, 500)
    hand.wait(0.5)
    hand.tap(WICK.x, WICK.y + 60)
    expect(hand.count('catch')).toBe(1)
    hand.wait(6.2)
    expect(hand.count('door')).toBe(1)
    expect(hand.count('eyes')).toBe(6)
    // A walk that meets everyone, so the ending has every answer in it.
    const wood = hand.wood
    meetAll(hand)
    expect([...wood.met].sort()).toEqual(['badger', 'fox', 'hedgehog', 'moths', 'owl', 'worms'])
    goHome(hand)
    const lamps = [0, 1, 2, 3, 4].filter((i) => (wood.worms.lamps >> i) & 1).length
    expect(lamps).toBeGreaterThan(0)
    const chimes = hand.count('chime'), hoots = hand.count('hoot')
    hand.up()
    hand.wait(0.4)
    expect(hand.game.finished).toBe(true)
    expect(hand.count('hang')).toBe(1)
    // The owl, met by the walk itself: its head is seen to go round to the left and come back.
    let turned = 0
    const watch = hand.watch
    hand.watch = () => { watch?.(); turned = Math.min(turned, wood.owl.yaw) }
    hand.wait(8)
    hand.watch = watch
    expect(hand.game.sceneRunning).toBe(false)
    expect(hand.count('farBlow')).toBe(1)
    expect(hand.count('chime') - chimes).toBe(lamps)
    // One hoot, long: not one for every step of the beat.
    expect(hand.count('hoot') - hoots).toBe(1)
    expect(turned).toBeLessThan(-0.9)
    expect(wood.owl.yaw).toBe(0)
    // Taken down.
    hand.drag(wood.lantern.x, wood.lantern.y, wood.lantern.x - 150, wood.lantern.y + 130, 400)
    hand.wait(4.2)
    expect(hand.count('door')).toBe(2)
    expect(hand.count('pinch')).toBe(1)
    expect(hand.count('unroll')).toBe(1)
    expect(hand.game.wood).toBe(null)
  })
})

describe('nothing stands on anything', () => {
  it('in every test above, each large creature was drawn inside its own room, and no room lay on another', () => {
    expect(looked).toBeGreaterThan(5000)
    expect([...outOfRoom].join('; ')).toEqual('')
  })
})

describe('the one clock', () => {
  it('every sound was made in the step in which its motion is seen to move', () => {
    expect([...new Set(unseen)]).toEqual([])
  })

  it('every sound carries the time of the step that made it', () => {
    expect([...new Set(offClock)]).toEqual([])
  })

  it('every sound the game has was made by the tests above', () => {
    expect(SOUND_KINDS.filter((kind) => !made.has(kind))).toEqual([])
  })
})
