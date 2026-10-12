import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { drawFox } from './figures'
import { LONG_WALK, PULL } from './game'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO } from './guidance'
import { LEAN, LEANS } from './fox'
import { Hand, boundsOf, gripFor, meet, woodSave } from './hand'
import { APPLES, appleShown } from './hedgehog'
import {
  BADGER_BOX, BODY_APART, FOX_HOME_END, FOX_LANE, FOX_LEAP, HEDGEHOG_LANE, HOOK, HOOK_GRIP, HOOK_NEAR, HOOK_TOUCH, MOTHS, OWL_BOX, PLACES, POLE, REACH, SURFACES, WIRE, WORMS, apart, boxAt, foxBox, hedgehogBox, perch, wormPlace,
} from './layout'
import { MOTH_REACH } from './moths'
import { BIG, restTouch, shownLit, underGlow, type Big } from './seen'
import { sheetOf, type Paper, type SheetWindow } from './sheet'
import { Sketch } from './sketch'
import { drawSmall } from './small'
import type { SoundEvent } from './sounds'
import { REST_BOX, STEP, onHook, restOf, type Creature, type Wood } from './wood'
import { WORM_MIDDLE, WORM_REACH } from './worms'

// What a walk does, each held by a test that plays it through the path the
// Mount uses and fails when the thing is taken out: what a straight carry
// with a ready sheet gives each creature first, how far the fox leaps, what
// the ending shows of it, what a hung lantern lights, what a lantern taken
// down dark leaves out, where a lantern taken out of the hand comes to rest,
// and which finger a hung lantern answers.

/** A round window of the sheet, `r` hundredths across its half. At 75 across and 50 down it throws its light level to the right of the lantern. */
function hole(x: number, y: number, paper: Paper | null, r = 16): SheetWindow {
  const outline: number[] = []
  for (let i = 0; i < 12; i++) outline.push(Math.round(x + Math.cos((i / 12) * Math.PI * 2) * r), Math.round(y + Math.sin((i / 12) * Math.PI * 2) * r))
  return { outline, paper, cut: true }
}

const sketch = new Sketch()
sketch.wobble = 0

/** The lantern as it will hang at rest where the grip is wanted, against the rooms of the large creatures as they stand. */
function standsOn(wood: Wood): string[] {
  const at = restOf(wood.want.x, wood.want.y), rest = boxAt(REST_BOX, at.x, at.y)
  const rooms = { fox: foxBox(wood.fox.x), hedgehog: hedgehogBox(wood.hedgehog.x), badger: BADGER_BOX, owl: OWL_BOX }
  return Object.entries(rooms).filter(([, room]) => !apart(rest, room)).map(([name]) => name)
}

describe('a straight carry with a ready sheet', () => {
  /** Carries the lantern from the step straight to the left at the height it stands at, and names the first light each creature gets. */
  function firsts(position: string): Record<Creature, string | null> {
    const hand = new Hand(woodSave({ sheet: sheetOf(position) }))
    const first: Record<Creature, string | null> = { moths: null, fox: null, owl: null, worms: null, hedgehog: null, badger: null }
    hand.watch = () => {
      const wood = hand.wood
      for (const name of BIG) first[name] ??= wood.sight[name].light
      if (first.moths === null && wood.moths.act !== 'bark') first.moths = wood.moths.act
      for (let i = 0; i < WORMS; i++) first.worms ??= wood.lightAt(wormPlace(i).x, wormPlace(i).y - WORM_MIDDLE, WORM_REACH)
    }
    expect(hand.wood.grip.y).toBe(PLACES.lantern.y)
    hand.carry(REACH.left, PLACES.lantern.y, 150, 1)
    return first
  }

  it('with three windows, the first light on the moths is the yellow and the first on the fox is the red: the blue passes over the fern and lights the glow-worms: each one\'s rule is what the carry does first, and the hedgehog under it is passed over', () => {
    // The blue, which rides highest, passes over the fern on the way: the glow-worms' rule, too, is what they get first.
    expect(firsts('three-windows')).toEqual({ moths: 'yellow', fox: 'red', owl: null, worms: 'blue', hedgehog: null, badger: 'red' })
  })

  it('with one window, which is yellow, the moths get it first of all', () => {
    const first = firsts('one-window')
    expect(first.moths).toBe('yellow')
    // The one light the sheet has is all the fox and the badger can be given, and the hedgehog on the ground none.
    expect(first).toEqual({ moths: 'yellow', fox: 'yellow', owl: null, worms: null, hedgehog: null, badger: 'yellow' })
  })

  it('carried back from the far left at the same height, the moths again get the yellow first', () => {
    const hand = new Hand(woodSave({ sheet: sheetOf('three-windows'), lantern: { x: 700, y: PLACES.lantern.y } }))
    let first: string | null = null
    hand.watch = () => { if (first === null && hand.wood.moths.act !== 'bark') first = hand.wood.moths.act }
    hand.carry(REACH.right, PLACES.lantern.y, 150, 1)
    expect(first).toBe('yellow')
  })

  it('no place of the grip in the hook\'s round lays the yellow on a moth: laying it on them never puts the pole\'s tip on the hook', () => {
    for (const position of ['three-windows', 'one-window']) {
      // The yellow by itself, so that no other window hides where it falls.
      const yellow = sheetOf(position).filter((window) => window.paper === 'yellow')
      expect(yellow).toHaveLength(1)
      const wood = new Hand(woodSave({ sheet: yellow })).wood
      const on: string[] = []
      // Every place of the grip that hangs the lantern: the round under the hook, the hook itself and the line between.
      let places = 0
      for (let x = 940; x <= REACH.right; x += 4) {
        for (let y = REACH.top; y <= 620; y += 4) {
          if (Math.hypot(x - HOOK_GRIP.x, y - HOOK_GRIP.y) > HOOK_NEAR && !onHook(x, y)) continue
          places++
          for (let i = 0; i < MOTHS; i++) if (restTouch(wood, perch(i).x, perch(i).y, MOTH_REACH, x, y)) on.push(`${position} moth ${i} at ${x}, ${y}`)
        }
      }
      expect(places).toBeGreaterThan(1500)
      expect(on).toEqual([])
      // And laid with its middle on each moth in turn, the grip is clear of the round by a finger's width.
      for (let i = 0; i < MOTHS; i++) {
        const at = gripFor(wood, 'yellow', perch(i).x, perch(i).y)
        expect(Math.hypot(at.x - HOOK_GRIP.x, at.y - HOOK_GRIP.y), `${position} moth ${i}`).toBeGreaterThan(HOOK_NEAR + 48)
        for (const [dx, dy] of [[0, 0], [48, 0], [0, 48], [0, -48], [34, 34], [34, -34]]) expect(onHook(at.x + dx, at.y + dy), `${position} moth ${i}`).toBe(false)
      }
    }
  })
})

describe('the fox on a first walk', () => {
  /** How long the fox is drawn as it leaps, from nose to brush. */
  function leapLength(hand: Hand): number {
    sketch.clear()
    drawFox(sketch, hand.wood, hand.wood.time)
    const drawn = boundsOf(sketch)
    return drawn.right - drawn.left
  }

  it('at home, with the hedgehog at home, it jumps the blue puddle by its own length and more, and is seen in the air', () => {
    const hand = new Hand(woodSave({ sheet: [hole(75, 50, 'blue', 10)], lantern: { x: 150, y: 420 } }))
    hand.frame = STEP
    expect(hand.wood.fox.x).toBe(PLACES.fox.x)
    expect(hand.wood.hedgehog.x).toBe(PLACES.hedgehog.x)
    let air = 0, long = 0
    hand.watch = () => {
      const fox = hand.wood.fox
      if (fox.mode === 'puddle' && fox.air > air) { air = fox.air; long = leapLength(hand) }
      expect(hand.wood.hedgehog.x - fox.x).toBeGreaterThanOrEqual(BODY_APART)
    }
    hand.shine('blue', PLACES.fox.x, PLACES.fox.y - 100, 3.2, 150)
    expect(hand.count('hop')).toBe(1)
    expect(hand.count('thud')).toBe(1)
    const went = Math.abs(hand.wood.fox.x - PLACES.fox.x)
    expect(air).toBeGreaterThan(0.95)
    expect(went).toBeGreaterThanOrEqual(FOX_LEAP - 1)
    // A body's length: as long as the fox is drawn in the air.
    expect(long).toBeGreaterThan(120)
    expect(went).toBeGreaterThanOrEqual(long)
    // The hedgehog was not sent anywhere for it: it is at home still, and the lane is long enough as it is.
    expect(hand.wood.hedgehog.x).toBe(PLACES.hedgehog.x)
    expect(FOX_LANE.right - FOX_LANE.left).toBeGreaterThanOrEqual(FOX_LEAP)
  })

  it('at home, with the hedgehog at home, it pounces on a light rushed past it and lands its own length away', () => {
    const hand = new Hand(woodSave({ sheet: [hole(75, 50, 'yellow', 5)], lantern: { x: 60, y: 560 } }))
    hand.frame = STEP
    let air = 0, long = 0
    hand.watch = () => {
      const fox = hand.wood.fox
      if (fox.mode === 'pounce' && fox.air > air) { air = fox.air; long = leapLength(hand) }
      expect(hand.wood.hedgehog.x - fox.x).toBeGreaterThanOrEqual(BODY_APART)
    }
    // Over its head from left to right, faster than a rush.
    const to = gripFor(hand.wood, 'yellow', 900, 380)
    hand.carry(to.x, to.y, 1700, 2.2)
    expect(hand.count('scrabble')).toBe(1)
    expect(hand.count('thump')).toBe(1)
    const went = Math.abs(hand.wood.fox.x - PLACES.fox.x)
    expect(air).toBeGreaterThan(0.95)
    expect(went).toBeGreaterThanOrEqual(FOX_LEAP - 1)
    expect(went).toBeGreaterThanOrEqual(long)
    expect(long).toBeGreaterThan(120)
  })

  it('in red it gets up, is heard to pad a pace into the light, and only then sits, looks away and hums: the meeting is the hum, not the first touch', () => {
    const hand = new Hand(woodSave({ lantern: { x: 700, y: 640 } }))
    hand.frame = STEP
    const order: string[] = []
    let walked = false, metAt = -1, touchedAt = -1, humAt = -1
    hand.after = (events: SoundEvent[]) => {
      const wood = hand.wood
      for (const event of events) if (event.kind === 'pad' || event.kind === 'hum') order.push(event.kind)
      if (touchedAt < 0 && wood.sight.fox.light === 'red') touchedAt = wood.time
      if (wood.fox.mode === 'walk') walked = true
      if (metAt < 0 && wood.met.has('fox')) metAt = wood.time
      if (humAt < 0 && events.some((event) => event.kind === 'hum')) humAt = wood.time
    }
    meet(hand, 'fox')
    expect(touchedAt).toBeGreaterThanOrEqual(0)
    expect(walked).toBe(true)
    // Pads, and then the hum: at least two pads are heard before it.
    expect(order.indexOf('hum')).toBeGreaterThanOrEqual(2)
    expect(order.slice(0, order.indexOf('hum')).every((kind) => kind === 'pad')).toBe(true)
    expect(metAt).toBe(humAt)
    expect(metAt - touchedAt).toBeGreaterThan(0.2)
    expect(Math.abs(hand.wood.fox.x - PLACES.fox.x)).toBeGreaterThan(40)
  })

  for (const withHedgehog of [false, true]) {
    it(`in the ending it comes to its place, sits and looks away, and is seen so for a second and more, ${withHedgehog ? 'with the hedgehog met as well' : 'though the hedgehog was never met'}`, () => {
      const hand = new Hand(woodSave({ lantern: { x: 700, y: 640 } }))
      meet(hand, 'fox')
      if (withHedgehog) meet(hand, 'hedgehog')
      expect(hand.wood.met.has('fox')).toBe(true)
      expect(hand.wood.met.has('hedgehog')).toBe(withHedgehog)
      hand.carry(HOOK_GRIP.x, 790, 300, 0)
      hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, 300, 0)
      hand.up()
      let away = 0, came = false, lookedAway = ''
      const hums = hand.count('hum')
      const lines = () => { sketch.clear(); drawFox(sketch, hand.wood, 1); return Array.from(sketch.lines.pts.subarray(0, sketch.lines.n)).join(',') }
      hand.watch = () => {
        const wood = hand.wood, fox = wood.fox
        if (!wood.hung) return
        if (fox.mode === 'walk') came = true
        if (fox.mode === 'pretend' && fox.x === FOX_HOME_END) { away += hand.frame; lookedAway = lines() }
        expect(wood.hedgehog.x - fox.x).toBeGreaterThanOrEqual(BODY_APART)
      }
      hand.wait(9)
      expect(hand.wood.hung).toBe(true)
      expect(came).toBe(true)
      expect(hand.wood.fox.x).toBe(FOX_HOME_END)
      // The sheet's two seconds and more.
      expect(away).toBeGreaterThanOrEqual(2)
      expect(hand.count('hum') - hums).toBe(1)
      // Looking away is drawn: the fox the walk left looking away is not the fox that sits there afterwards.
      expect(hand.wood.fox.mode).toBe('sit')
      expect(lookedAway).not.toBe('')
      expect(lines()).not.toBe(lookedAway)
    })
  }
})

describe('the hedgehog and the red things', () => {
  it('every apple lies where the hedgehog can come to it', () => {
    for (const apple of APPLES) {
      expect(apple).toBeGreaterThanOrEqual(HEDGEHOG_LANE.left)
      expect(apple).toBeLessThanOrEqual(HEDGEHOG_LANE.right)
    }
  })

  it('led along its lane in the red of the ready sheet, it spikes every apple the red shows it: none is shown that it cannot come to', () => {
    const hand = new Hand(woodSave({ sheet: sheetOf('three-windows') }))
    const shown = new Set<number>()
    hand.watch = () => { for (let i = 0; i < APPLES.length; i++) if (appleShown(hand.wood, i)) shown.add(i) }
    // Down from the step to the ground, the red onto the hedgehog, and slowly to the far end of its lane.
    hand.carry(PLACES.lantern.x, 796, 150, 0.2)
    const to = gripFor(hand.wood, 'red', PLACES.hedgehog.x - 20, PLACES.hedgehog.y - 76)
    hand.carry(to.x, 796, 110, 1.5)
    hand.carry(to.x - 260, 796, 50, 3)
    expect([...shown].sort()).toEqual([0, 1, 2])
    expect(hand.wood.hedgehog.carries).toBe(0b111)
    expect(hand.count('spike')).toBe(3)
    // Spiked, an apple is on its back and is shown on the ground no more.
    for (let i = 0; i < APPLES.length; i++) {
      sketch.clear()
      drawSmall(sketch, hand.wood, hand.wood.time, true)
      expect(appleShown(hand.wood, i) && !((hand.wood.hedgehog.carries >> i) & 1)).toBe(false)
    }
  })
})

describe('the hung lantern lights nobody who does not answer', () => {
  /** Everything the lit pass of the small things writes. */
  const litSmall = (wood: Wood) => { sketch.clear(); drawSmall(sketch, wood, wood.time, true); return sketch.lines.n + sketch.hide.n + sketch.whites.n }
  const underSmall = (wood: Wood) => { sketch.clear(); drawSmall(sketch, wood, wood.time, 'under'); return sketch.lines.n + sketch.hide.n + sketch.whites.n }

  it('hung with nobody met, the red glow lies on the moths\' tree and no moth under it is drawn lit: before the glow is drawn nothing is, and after it they are drawn over it as the dark shows them', () => {
    const hand = new Hand(woodSave({ lantern: { x: HOOK_GRIP.x, y: 700 } }))
    hand.frame = STEP
    hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, 300, 0)
    hand.up()
    let early = 0, late = 0, under = 0
    hand.watch = () => {
      const wood = hand.wood
      if (!wood.hung) return
      // What is drawn lit follows the glow that is drawn: the model's and the scene's are one number.
      expect(wood.glow).toBe(hand.game.show.glow)
      for (const name of BIG) expect(shownLit(wood, name), name).toBe(false)
      if (wood.glow === 0) {
        early++
        expect(litSmall(wood)).toBe(0)
        expect(underSmall(wood)).toBe(0)
        for (const name of BIG) expect(underGlow(wood, name)).toBe(false)
      } else {
        late++
        // No moth rides the glow (none was met), so none is drawn lit; those the glow lies on are written over it.
        expect(litSmall(wood)).toBe(0)
        if (underSmall(wood) > 0) under++
      }
    }
    hand.wait(9)
    expect(hand.wood.hung).toBe(true)
    expect(hand.wood.met.size).toBe(0)
    // 1.2 seconds with no glow, the lift after the let-go aside.
    expect(early).toBeGreaterThan(1.2 / STEP - 2)
    expect(late).toBeGreaterThan(100)
    expect(under).toBe(late)
    // The hung patches do touch a moth on the bark: that is the case this holds.
    expect(hand.wood.moths.list.some((moth) => moth.mode === 'bark' && hand.wood.touching(moth.x, moth.y, MOTH_REACH) !== null)).toBe(true)
    expect(hand.wood.moths.list.every((moth) => moth.mode === 'bark')).toBe(true)
  })

  it('hung with the moths met, they are drawn lit only once the glow shows, and then because they ride it', () => {
    const hand = new Hand(woodSave())
    meet(hand, 'moths')
    expect(hand.wood.met.has('moths')).toBe(true)
    hand.frame = STEP
    hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, 200, 0)
    hand.up()
    let early = 0, riding = 0
    hand.watch = () => {
      const wood = hand.wood
      if (!wood.hung) return
      if (wood.glow === 0) { early++; expect(litSmall(wood)).toBe(0) }
      else if (wood.moths.list.some((moth) => moth.mode === 'on') && litSmall(wood) > 0) riding++
    }
    hand.wait(9)
    expect(early).toBeGreaterThan(100)
    expect(riding).toBeGreaterThan(100)
    expect(hand.wood.moths.list.every((moth) => moth.mode === 'on')).toBe(true)
    expect(litSmall(hand.wood)).toBeGreaterThan(0)
  })
})

describe('taken down', () => {
  function takeDown(lit: boolean): { pinch: number; smoke: number; flame: number } {
    const hand = new Hand(woodSave({ finished: true, lit }))
    hand.frame = STEP
    let smoke = 0, flame = 0
    hand.watch = () => { smoke = Math.max(smoke, hand.game.show.smoke); if (hand.game.show.room) flame = Math.max(flame, hand.table.flame) }
    const lantern = hand.wood.lantern
    hand.drag(lantern.x, lantern.y, lantern.x - PULL - 60, lantern.y + 60, 400)
    hand.wait(5)
    expect(hand.game.place).toBe('table')
    expect(hand.game.wood).toBeNull()
    expect(hand.count('door')).toBe(1)
    expect(hand.count('unroll')).toBe(1)
    return { pinch: hand.count('pinch'), smoke, flame }
  }

  it('a lantern that hung lit is pinched out: one pinch, and the smoke curls', () => {
    const down = takeDown(true)
    expect(down.pinch).toBe(1)
    expect(down.smoke).toBeGreaterThan(0.9)
    expect(down.flame).toBeGreaterThan(0)
  })

  it('a lantern that hung dark has no flame to pinch: no pinch sounds and no smoke is drawn', () => {
    const down = takeDown(false)
    expect(down.pinch).toBe(0)
    expect(down.smoke).toBe(0)
    expect(down.flame).toBe(0)
  })

  it('a touch that ends the scene leaves no smoke behind, lit or dark', () => {
    for (const lit of [true, false]) {
      const hand = new Hand(woodSave({ finished: true, lit }))
      const lantern = hand.wood.lantern
      hand.drag(lantern.x, lantern.y, lantern.x - PULL - 60, lantern.y + 60, 400)
      hand.wait(1)
      hand.tap(40, 780)
      expect(hand.game.show.smoke).toBe(0)
    }
  })
})

describe('a lantern taken out of the hand never stands on anybody', () => {
  /** Places of the grip that hold the lantern's paper over each large creature. */
  const OVER: Record<Big, { x: number; y: number }> = {
    fox: { x: PLACES.fox.x - 40, y: 640 },
    hedgehog: { x: PLACES.hedgehog.x - 40, y: 800 },
    badger: { x: PLACES.badger.x - 40, y: 760 },
    owl: { x: PLACES.owl.x - 40, y: 300 },
  }
  const held = (name: Big): Hand => {
    // Unlit, with no window: nobody moves for a light, and the lantern is whipped there and held.
    const hand = new Hand(woodSave({ sheet: [], lantern: { x: 760, y: 470 } }))
    hand.carry(OVER[name].x, OVER[name].y, 2400, 0.05)
    expect(hand.wood.holding).toBe(true)
    // In the hand it is over the creature.
    const at = restOf(hand.wood.want.x, hand.wood.want.y), rest = boxAt(REST_BOX, at.x, at.y)
    const room = { fox: foxBox(hand.wood.fox.x), hedgehog: hedgehogBox(hand.wood.hedgehog.x), badger: BADGER_BOX, owl: OWL_BOX }[name]
    expect(apart(rest, room), name).toBe(false)
    return hand
  }

  it('the finger is taken away in mid-carry: the lantern comes to rest beside the creature, as one let go does', () => {
    for (const name of BIG) {
      const hand = held(name)
      hand.cancel()
      expect(hand.wood.holding).toBe(false)
      expect(standsOn(hand.wood), name).toEqual([])
      expect(hand.wood.hung).toBe(false)
    }
  })

  it('the game is put away in mid-carry: it is found beside the creature', () => {
    for (const name of BIG) {
      const hand = held(name)
      hand.play.rest()
      expect(hand.wood.holding).toBe(false)
      expect(standsOn(hand.wood), name).toEqual([])
    }
  })

  it('a save written in mid-carry and loaded after the game was killed: it is found beside the creature, and saved again it is the same save', () => {
    for (const name of BIG) {
      const hand = held(name)
      const save = hand.game.toSave()
      const found = new Hand(save)
      expect(standsOn(found.wood), name).toEqual([])
      expect(found.game.toSave()).toEqual(save)
    }
  })

  it('a save that holds the lantern over a creature, however it came to be written, is found with the lantern beside it', () => {
    for (const name of BIG) {
      const found = new Hand(woodSave({ sheet: [], lantern: OVER[name] }))
      expect(standsOn(found.wood), name).toEqual([])
      expect(Math.hypot(found.wood.want.x - OVER[name].x, found.wood.want.y - OVER[name].y), name).toBeGreaterThan(1)
      expect(found.heard).toHaveLength(0)
    }
  })

  it('a finger that holds the lantern still over a creature is still carrying it: no second finger takes it, and nothing is set down', () => {
    const hand = held('fox')
    // Held still it is still carried, and never handed over: the second finger gets a nick.
    hand.wait(1.5)
    expect(hand.down(900, 500, 2)).toBe(false)
    expect(hand.wood.holding).toBe(true)
  })
})

describe('a resting contact never deadens the hung lantern', () => {
  it('a finger that landed off the hung lantern rests, however far it moves: the next finger that lands on the lantern pulls it down', () => {
    const hand = new Hand(woodSave({ finished: true }))
    expect(hand.wood.hung).toBe(true)
    // Off the lantern, and moved well past a finger's slip while it stays down.
    expect(hand.wood.onHung(400, 500)).toBe(false)
    expect(hand.down(400, 500, 1)).toBe(true)
    hand.slide(520, 560, 300, 1)
    expect(hand.game.working).toBe(false)
    const lantern = hand.wood.lantern
    expect(hand.down(lantern.x, lantern.y, 2)).toBe(true)
    hand.slide(lantern.x - PULL - 40, lantern.y + 40, 400, 2)
    expect(hand.game.place).toBe('table')
    expect(hand.game.finished).toBe(false)
    // The finger that rested goes on resting: its moves and its lift do nothing.
    hand.move(600, 600, 1)
    hand.up(1)
    expect(hand.game.place).toBe('table')
  })

  it('a finger that has lain a second on the hung lantern without pulling hands the pull to the next finger', () => {
    const hand = new Hand(woodSave({ finished: true }))
    const lantern = hand.wood.lantern
    hand.down(lantern.x, lantern.y, 1)
    hand.wait(1.1)
    expect(hand.down(lantern.x + 10, lantern.y + 10, 2)).toBe(true)
    hand.slide(lantern.x - PULL - 40, lantern.y + 40, 400, 2)
    expect(hand.game.place).toBe('table')
  })

  it('the hook is where it is drawn, and the finger off it never takes the lantern anywhere', () => {
    const hand = new Hand(woodSave({ finished: true }))
    hand.down(300, 600, 1)
    hand.slide(500, 500, 300, 1)
    hand.up(1)
    hand.wait(1)
    expect(hand.wood.hung).toBe(true)
    expect(hand.wood.grip.x + POLE.x).toBe(HOOK.x)
    expect(hand.wood.holding).toBe(false)
    expect(hand.game.finished).toBe(true)
  })
})

describe('the candle in the wood', () => {
  it('a tap on the dark lantern lights it; a tap anywhere else brings it there dark', () => {
    const on = new Hand(woodSave({ lit: false, lantern: { x: 600, y: 600 } }))
    on.tap(on.wood.lantern.x + 20, on.wood.lantern.y - 30)
    expect(on.wood.lit).toBe(true)
    expect(on.count('strike')).toBe(1)
    for (const [x, y] of [[760, 560], [900, 700], [520, 400]]) {
      const off = new Hand(woodSave({ lit: false, lantern: { x: 600, y: 600 } }))
      expect(off.wood.onLantern(x, y)).toBe(false)
      off.tap(x, y)
      off.wait(1.5)
      expect(off.wood.lit, `${x}, ${y}`).toBe(false)
      expect(off.count('strike'), `${x}, ${y}`).toBe(0)
      expect(off.wood.want.x, `${x}, ${y}`).toBe(x)
      // It is answered all the same: the lantern kicks, knocks, and comes.
      expect(off.count('tock'), `${x}, ${y}`).toBe(1)
      // And tapped where it now hangs, it lights.
      off.tap(off.wood.lantern.x, off.wood.lantern.y)
      expect(off.wood.lit, `${x}, ${y}`).toBe(true)
    }
  })
})

describe('the glow-worms in plain light', () => {
  it('each worm the light touches knocks on its own lamp in its own time; one it does not touch does not knock', () => {
    // A window with no paper, wide enough for three worms and no more.
    const hand = new Hand(woodSave({ sheet: [hole(75, 50, null, 13)], lantern: { x: 300, y: 620 } }))
    hand.frame = STEP
    const knocks: number[][] = Array.from({ length: WORMS }, () => [])
    /** Steps each worm has been in the light. */
    const steps = new Array<number>(WORMS).fill(0)
    hand.after = (events: SoundEvent[], pointer: boolean) => {
      const wood = hand.wood
      if (!pointer) for (let i = 0; i < WORMS; i++) if (wood.lightAt(wormPlace(i).x, wormPlace(i).y - WORM_MIDDLE, WORM_REACH) === 'plain') steps[i]++
      for (const event of events) if (event.kind === 'knock') knocks[Math.round(event.n * (WORMS - 1))].push(Math.round(wood.time / STEP))
    }
    hand.shine(null, wormPlace(2).x, wormPlace(2).y - WORM_MIDDLE, 4, 150)
    // Those the light was held on, for three seconds and more; and those it never touched.
    const touched = new Set([0, 1, 2, 3, 4].filter((i) => steps[i] > 3 / STEP))
    expect(touched.size).toBeGreaterThanOrEqual(2)
    expect(steps.filter((count) => count === 0).length).toBeGreaterThan(0)
    for (let i = 0; i < WORMS; i++) {
      if (touched.has(i)) expect(knocks[i].length, `worm ${i}`).toBeGreaterThanOrEqual(3)
      if (steps[i] === 0) expect(knocks[i], `worm ${i}`).toEqual([])
    }
    // No two of them keep one beat: their knocks fall in different steps, and the time between a worm's knocks is its own.
    const lit = [...touched]
    for (let a = 0; a < lit.length; a++) {
      for (let b = a + 1; b < lit.length; b++) {
        const shared = knocks[lit[a]].filter((step) => knocks[lit[b]].includes(step))
        expect(shared.length, `${lit[a]} and ${lit[b]}`).toBeLessThan(2)
        const every = (list: number[]) => list[list.length - 1] - list[list.length - 2]
        expect(every(knocks[lit[a]]), `${lit[a]} and ${lit[b]}`).not.toBe(every(knocks[lit[b]]))
      }
    }
  })
})

describe('the glow-worms when a plain light comes on over several at once', () => {
  it('found with its window lying on them and taken up where it stands, the lantern sets each of them knocking at its own moment: no two begin together', () => {
    const sheet = [hole(75, 50, null, 13)]
    const probe = new Hand(woodSave({ sheet })).wood
    const at = gripFor(probe, null, wormPlace(2).x, wormPlace(2).y - WORM_MIDDLE)
    // Found as left, nobody answers until a finger lands: then the light is on all of them in one step.
    const hand = new Hand(woodSave({ sheet, lantern: at }))
    hand.frame = STEP
    const first = new Map<number, number>()
    hand.after = (events: SoundEvent[]) => {
      for (const event of events) {
        const worm = Math.round(event.n * (WORMS - 1))
        if (event.kind === 'knock' && !first.has(worm)) first.set(worm, Math.round(hand.wood.time / STEP))
      }
    }
    hand.wait(1)
    expect(first.size).toBe(0)
    hand.down(hand.wood.want.x, hand.wood.want.y)
    hand.wait(1.5)
    expect(first.size).toBeGreaterThanOrEqual(2)
    expect(new Set(first.values()).size).toBe(first.size)
  })
})

describe('the wire', () => {
  it('ticks at the turn of a swing wider than 0.3 of a radian, and at no other time: a lantern that only trembles on its wire is silent', () => {
    const hand = new Hand(woodSave({ sheet: [], lit: false, lantern: { x: 900, y: 700 } }))
    hand.frame = STEP
    let speedWas = 0, sideWas = 0, wide = 0, narrow = 0
    hand.before = () => { speedWas = hand.wood.swingSpeed; sideWas = Math.sign(hand.wood.swing) }
    hand.after = (events: SoundEvent[], pointer: boolean) => {
      if (pointer) return
      const wood = hand.wood
      const turned = speedWas !== 0 && Math.sign(speedWas) !== Math.sign(wood.swingSpeed)
      const crossed = sideWas !== 0 && Math.sign(wood.swing) !== sideWas
      const ticked = events.filter((event) => event.kind === 'wire').length
      if (turned && !crossed && Math.abs(wood.swing) > 0.3) wide++
      if (turned && !crossed && Math.abs(wood.swing) <= 0.3) narrow++
      if (!crossed) expect(ticked).toBe(turned && Math.abs(wood.swing) > 0.3 ? 1 : 0)
    }
    hand.carry(400, 700, 1500, 0.6)
    hand.carry(900, 620, 1500, 0.6)
    hand.carry(500, 700, 1200, 6)
    expect(wide).toBeGreaterThan(1)
    expect(narrow).toBeGreaterThan(1)
    expect(hand.count('wire')).toBe(wide)
  })
})

describe('the ready sheets and the ladder', () => {
  it('the test above names every ready sheet that has a window', () => {
    expect(LADDER.filter((position) => sheetOf(position).length > 0)).toEqual(['three-windows', 'one-window'])
  })
})

describe('the hook, where a child puts the finger', () => {
  /** Carries the lantern from the middle of the wood to a point, lets it go there and waits. */
  const letGoAt = (x: number, y: number) => {
    const hand = new Hand(woodSave({ lantern: { x: 700, y: 500 } }))
    hand.frame = 1 / 60
    hand.down(700, 500)
    hand.slide(x, y, 500)
    hand.up()
    return hand
  }

  it('a finger that lets the lantern go on the hook itself hangs it: the lantern is seen to drop onto the hook, the hang sounds, and the walk is over', () => {
    const hand = letGoAt(HOOK.x, HOOK.y)
    let steps = 0, furthest = 0, last = { ...hand.wood.grip }
    hand.watch = () => {
      const grip = hand.wood.grip
      const moved = Math.hypot(grip.x - last.x, grip.y - last.y)
      if (hand.wood.hung && moved > 0.5) steps++
      furthest = Math.max(furthest, moved)
      last = { x: grip.x, y: grip.y, vx: 0, vy: 0 }
    }
    hand.wait(1.5)
    expect(hand.wood.hung).toBe(true)
    expect(hand.game.finished).toBe(true)
    expect(hand.count('hang')).toBe(1)
    // It came down the pole's length in many frames, none of them a jump.
    expect(steps).toBeGreaterThan(8)
    expect(furthest).toBeLessThan(40)
    expect(Math.hypot(hand.wood.grip.x - HOOK_GRIP.x, hand.wood.grip.y - HOOK_GRIP.y)).toBeLessThan(1)
    expect(Math.abs(hand.wood.grip.x + POLE.x - HOOK.x)).toBeLessThan(1)
  })

  it('the lantern itself held up to the hook, and a finger anywhere from the hook down to where the grip hangs, hang it too', () => {
    // The lantern hangs a wire's length under the tip of the pole: its middle on the hook puts the grip here.
    const held = { x: HOOK.x - POLE.x, y: HOOK.y - POLE.y - WIRE }
    for (const [x, y] of [[held.x, held.y], [HOOK.x - 40, HOOK.y + 40], [HOOK.x - 20, HOOK.y + 150], [HOOK.x, HOOK.y + WIRE], [HOOK_GRIP.x, HOOK_GRIP.y]]) {
      const hand = letGoAt(x, y)
      hand.wait(1.5)
      expect(hand.wood.hung, `${x}, ${y}`).toBe(true)
      expect(hand.game.finished, `${x}, ${y}`).toBe(true)
      expect(Math.hypot(hand.wood.grip.x - HOOK_GRIP.x, hand.wood.grip.y - HOOK_GRIP.y), `${x}, ${y}`).toBeLessThan(1)
    }
  })

  it('a finger further from the hook than the touch round leaves the lantern in the wood, and the round is 48 px and more across at both sizes', () => {
    for (const [x, y] of [[HOOK.x - HOOK_TOUCH - 24, HOOK.y + 20], [HOOK_GRIP.x - HOOK_TOUCH - 34, HOOK_GRIP.y], [HOOK_GRIP.x, HOOK_GRIP.y + HOOK_TOUCH + 10], [HOOK.x - 150, HOOK.y]]) {
      const hand = letGoAt(x, y)
      hand.wait(1.5)
      expect(hand.wood.hung, `${x}, ${y}`).toBe(false)
      expect(hand.game.finished, `${x}, ${y}`).toBe(false)
    }
    for (const surface of SURFACES) {
      const scale = Math.min(surface.width / 1180, surface.height / 820)
      expect(HOOK_TOUCH * 2 * scale).toBeGreaterThanOrEqual(96)
      expect(HOOK_TOUCH * scale).toBeLessThanOrEqual(64)
    }
  })

  it('a save put away while the lantern drops onto the hook is the hung lantern, at the hook', () => {
    const hand = letGoAt(HOOK.x, HOOK.y)
    hand.wait(0.36)
    expect(hand.wood.hung).toBe(true)
    const save = hand.game.toSave()
    expect(save.finished).toBe(true)
    expect(save.lantern).toEqual({ ...HOOK_GRIP })
    hand.play.rest()
    expect(hand.wood.hung).toBe(true)
    expect(hand.wood.grip.x).toBe(HOOK_GRIP.x)
    expect(hand.wood.grip.y).toBe(HOOK_GRIP.y)
  })
})

describe('the idle hand shows the way to the hook', () => {
  /** Where the hand's showing goes, as a name: a creature's place is anything but the hook. */
  const shows = (hand: Hand): 'hook' | 'place' | 'none' => {
    const aim = hand.play.aim
    if (hand.play.guidance?.demo == null) return 'none'
    return aim.toX === HOOK_GRIP.x && aim.toY === HOOK_GRIP.y ? 'hook' : Math.hypot(aim.toX - aim.fromX, aim.toY - aim.fromY) > 1 ? 'place' : 'none'
  }
  /** Waits out one idle stretch to the middle of its first showing, and says where that showing goes. */
  const firstShowing = (hand: Hand) => {
    hand.wait(IDLE_BEFORE_DEMO + DEMO_SECONDS / 2)
    const seen = { shows: shows(hand), x: hand.play.aim.toX, y: hand.play.aim.toY }
    // A tap on the lit lantern is only a press: the lantern stays, and the idle stretch begins again.
    const lantern = hand.wood.lantern
    hand.tap(lantern.x, lantern.y)
    return seen
  }

  it('once it has shown every creature\'s place it has, the next showing carries the lantern to the hook, well before the walk is long', () => {
    const hand = new Hand(woodSave({ sheet: sheetOf('one-window') }))
    hand.tap(hand.wood.lantern.x, hand.wood.lantern.y)
    const seen = [firstShowing(hand), firstShowing(hand), firstShowing(hand), firstShowing(hand), firstShowing(hand)]
    // Three places, each a different one, and then the hook, and the hook again.
    expect(seen.map((s) => s.shows)).toEqual(['place', 'place', 'place', 'hook', 'hook'])
    expect(new Set(seen.slice(0, 3).map((s) => `${s.x}|${s.y}`)).size).toBe(3)
    expect(hand.game.time).toBeLessThan(LONG_WALK)
    expect(hand.wood.hung).toBe(false)
  })

  it('on a walk that has gone on a long while the showing is the hook, though places are left to show', () => {
    const hand = new Hand(woodSave())
    hand.tap(hand.wood.lantern.x, hand.wood.lantern.y)
    expect(firstShowing(hand).shows).toBe('place')
    // The child plays on for a minute: a slow carry to and fro on the door's side of the wood.
    hand.down(hand.wood.lantern.x, hand.wood.lantern.y)
    while (hand.game.time < LONG_WALK + 1) { hand.slide(1000, 700, 60); hand.slide(1060, 700, 60) }
    hand.up()
    hand.wait(0.5)
    expect(firstShowing(hand).shows).toBe('hook')
  })

  it('the move the hand shows hangs the lantern: copied by a finger, the walk is over', () => {
    const hand = new Hand(woodSave({ sheet: sheetOf('one-window') }))
    hand.tap(hand.wood.lantern.x, hand.wood.lantern.y)
    for (let k = 0; k < 3; k++) firstShowing(hand)
    hand.wait(IDLE_BEFORE_DEMO + DEMO_SECONDS / 2)
    expect(shows(hand)).toBe('hook')
    const aim = hand.play.aim
    hand.drag(aim.fromX, aim.fromY, aim.toX, aim.toY, 300)
    hand.wait(1)
    expect(hand.wood.hung).toBe(true)
    expect(hand.game.finished).toBe(true)
  })
})

describe('the fox at home with the red to its left', () => {
  it('its lane ends there, so it turns to the red and leans into it, nose first, for half a second and more before it sits and hums: never a meeting in one step with nothing seen', () => {
    const hand = new Hand(woodSave())
    hand.frame = STEP
    expect(hand.wood.fox.x).toBe(FOX_LANE.left)
    // Over the fox's head and then straight down beside it, so that the red, level to the lantern's left, comes down onto the fox's left side.
    hand.carry(552, 300, 300, 0.2)
    let touchedAt = -1, metAt = -1, humAt = -1, leant = 0, turned = false, moved = 0, pads = 0
    hand.after = (events) => {
      const wood = hand.wood, fox = wood.fox
      if (touchedAt < 0 && wood.sight.fox.light === 'red') { touchedAt = wood.time; expect(wood.sight.fox.touch!.x).toBeLessThan(fox.x) }
      if (touchedAt < 0) return
      if (metAt < 0 && wood.met.has('fox')) metAt = wood.time
      if (humAt < 0 && events.some((event) => event.kind === 'hum')) humAt = wood.time
      if (metAt < 0) {
        leant = Math.max(leant, fox.dive)
        if (fox.mode === 'walk' && fox.facing === -1) turned = true
        moved = Math.max(moved, Math.abs(fox.x - FOX_LANE.left))
        pads += events.filter((event) => event.kind === 'pad').length
      }
    }
    hand.carry(552, 640, 120, 3)
    expect(touchedAt).toBeGreaterThan(0)
    expect(metAt).toBeGreaterThan(0)
    expect(metAt).toBe(humAt)
    expect(metAt - touchedAt).toBeGreaterThanOrEqual(LEANS - 0.02)
    expect(turned).toBe(true)
    expect(leant).toBeGreaterThanOrEqual(LEAN - 0.01)
    // It had nowhere to step, and no pad sounds for a paw that did not move.
    expect(moved).toBe(0)
    expect(pads).toBe(0)
    // Sitting again, it no longer leans.
    expect(hand.wood.fox.mode).toBe('pretend')
    expect(hand.wood.fox.dive).toBe(0)
  })

  it('leaning is drawn: the fox that leans is not the fox that stands', () => {
    const hand = new Hand(woodSave())
    const fox = hand.wood.fox
    const lines = () => { sketch.clear(); drawFox(sketch, hand.wood, 1); return Array.from(sketch.lines.pts.subarray(0, sketch.lines.n)).join(',') }
    fox.mode = 'walk'; fox.facing = -1
    const stands = lines()
    fox.dive = LEAN
    expect(lines()).not.toBe(stands)
    // Leaning, it is still inside its own room.
    const drawn = boundsOf(sketch)
    const room = foxBox(fox.x)
    expect(drawn.left).toBeGreaterThanOrEqual(room.left)
    expect(drawn.right).toBeLessThanOrEqual(room.right)
    expect(drawn.top).toBeGreaterThanOrEqual(room.top)
    expect(drawn.bottom).toBeLessThanOrEqual(room.bottom)
  })
})

describe('the owl rushed again', () => {
  /** Rushes the yellow across the owl, from the right to the left or back. */
  const pass = (hand: Hand, to: { x: number; y: number }, way: 1 | -1) => hand.carry(to.x + way * 430, to.y, 1500, 0)

  it('in the rest after a spin it answers small, a blink and one clack of the beak; rushed once more with its feather out, it spins and the same feather is whirled up and lands again with its tick', () => {
    const start = new Hand(woodSave())
    const to = gripFor(start.wood, 'yellow', PLACES.owl.x, PLACES.owl.y - 100)
    const hand = new Hand(woodSave({ lantern: { x: to.x + 430, y: to.y } }))
    hand.frame = STEP
    const owl = hand.wood.owl
    pass(hand, to, -1)
    expect(hand.count('spin')).toBe(1)
    hand.wait(1)
    // Still spinning, or resting after it: the second rush gets the small answer, in the step it is rushed.
    expect(owl.spun >= 0 || owl.rest > 0).toBe(true)
    const clacks = hand.count('clack')
    let blinked = false
    hand.after = (events) => { if (events.some((event) => event.kind === 'clack')) blinked = owl.glance === 1 && owl.clack > 0 }
    pass(hand, to, 1)
    hand.after = null
    expect(hand.count('spin')).toBe(1)
    expect(hand.count('clack')).toBe(clacks + 1)
    expect(blinked).toBe(true)
    // The first feather lands.
    hand.wait(3.2)
    expect(hand.count('feather')).toBe(1)
    expect(owl.feather.down).toBe(true)
    const lay = owl.feather.y
    // Within nine seconds of the first rush, a third: a spin, and the feather that lay on the branch goes up and comes down.
    expect(hand.wood.time).toBeLessThan(9)
    let rose = 0
    hand.watch = () => { rose = Math.max(rose, lay - owl.feather.y) }
    pass(hand, to, -1)
    hand.wait(3)
    expect(hand.count('spin')).toBe(2)
    expect(rose).toBeGreaterThan(40)
    expect(hand.count('feather')).toBe(2)
    expect(owl.feather.down).toBe(true)
    expect(owl.feather.y).toBe(lay)
  })
})
