import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { clampPouch } from './flight'
import { standIn } from './recording'
import { freshSave } from './save'
import { fit } from './stage'
import { everyLoad, gridOfPulls, newToy, play, pullAndLetGo, staged, type Played } from './testing'
import { BACK_LANE, type Frame } from './toy'
import { BALL, PUFFIN_AT, PUFFIN_DUCKS, View, ballAt, bodyOf, puffinDuck } from './view'
import { BALLOON, BASKET, BERG, CHICK, CRATE, DRIFT, ICE_Y, IGLOO, PENGUIN, PUFFIN, SEALS, SEA_Y, SHELF, SHELF_EDGE, WHALE, type Box, type Circle } from './world'

// Nothing passes through anything it is not said to pass in front of. This is
// a canvas game, so the audit is a test of the model: the toy is played
// through every load, from pulls all over the grid, through every landing and
// every way back, and in every frame the penguin's round is measured against
// whatever is solid, at the three surfaces the game is held to. What is
// allowed is written here, each with its reason and a cap. What is bolted to
// the penguin reaches further than its round, and is measured as it is drawn
// in clearance.test.ts.
//
// Said to pass in front of or behind, and so not findings:
// - The catapult stands a step further back than the flight (the sheet), so a flight passes in front of it.
// - The cloud is thin and the whale's water is water: a flight is in them, and the cloud is drawn over it.
// - The snowdrift takes whatever comes into it: buried or hung by the wings, the penguin is in the drift, and a
//   burning rocket and the spring feet go through it by the sheet's own rule. Sat in the umbrella, its round
//   rests on the drift's crest (view.test.ts).
// - Stuck by the beak, the head is in the ice by the overhang and is not drawn below the ice.
// - On the way home the penguin goes along the back of the shelf, behind whatever stands on the ice.

const SIZES: [number, number][] = [[1180, 820], [1024, 768], [820, 1180]]

/** The penguin is drawn 132 tall on a round of 108: its head and its feet stand this far past the round it is flown as. */
const OVERHANG = PENGUIN.height / 2 - PENGUIN.r
/** The model leaves a body at most this far inside a thing between two steps. */
const STEP_SLACK = 0.5

const intoCircle = (at: { x: number; y: number }, c: Circle, r: number): number => Math.max(0, c.r + r - Math.hypot(at.x - c.x, at.y - c.y))
const intoBox = (at: { x: number; y: number }, b: Box, r: number): number => {
  const dx = at.x - Math.max(b.x0, Math.min(b.x1, at.x)), dy = at.y - Math.max(b.y0, Math.min(b.y1, at.y))
  return Math.max(0, r - Math.hypot(dx, dy))
}

/** How far the penguin's round is inside any solid thing in this frame, in stage units. */
function deepest(f: Frame): { into: number; what: string } {
  const at = f.pilot
  let worst = { into: 0, what: 'nothing' }
  const take = (into: number, what: string): void => { if (into > worst.into) worst = { into, what } }
  take(intoCircle(at, SEALS[0], PENGUIN.r), 'the near seal')
  take(intoCircle(at, SEALS[1], PENGUIN.r), 'the far seal')
  take(intoCircle(at, IGLOO, PENGUIN.r), 'the igloo')
  take(intoCircle(at, WHALE, PENGUIN.r), 'the whale')
  take(intoCircle(at, BALLOON, PENGUIN.r), 'the balloon')
  take(intoBox(at, BASKET, PENGUIN.r), 'the basket')
  take(intoBox(at, CRATE, PENGUIN.r), 'the crate')
  take(intoBox(at, BERG, PENGUIN.r), 'the iceberg')
  if (at.x > SHELF_EDGE) take(intoBox(at, SHELF, PENGUIN.r), 'the edge of the shelf')
  return worst
}

/** Pulls from all over the grid: every ninth of them, which is every angle and every length. */
const PULLS = gridOfPulls(20).filter((_, index) => index % 9 === 0)

/** Plays a toy home, handing every frame to `look`. A finger is held for the first second when `hold` is set. */
function watch(played: Played, look: (f: Frame) => void, hold = false): void {
  if (hold) played.toy.press(330, 330)
  for (let n = 0; n < 2400 && played.toy.phase !== 'loaded'; n++) {
    if (hold && n === 60) played.toy.tap()
    play(played, 1 / 60)
    look(played.toy.show())
  }
  expect(played.toy.phase).toBe('loaded')
}

/** What the audit found, flying every load from pulls all over the grid, the rocket both held and not, once. */
type Audit = { flights: number; worst: { into: number; what: string; when: string }; landings: number; sunk: string[]; afloat: number; adrift: string[]; knocked: number; throughBall: string[] }
let audited: Audit | null = null
function audit(): Audit {
  if (audited) return audited
  const found: Audit = { flights: 0, worst: { into: 0, what: 'nothing', when: '' }, landings: 0, sunk: [], afloat: 0, adrift: [], knocked: 0, throughBall: [] }
  const tops = [ICE_Y, BERG.y0, CRATE.y0]
  const out = { x: 0, y: 0 }
  for (const load of everyLoad()) for (const pull of PULLS) for (const hold of load.parts.includes('rocket') ? [false, true] : [false]) {
    const played = newToy(1, { ...freshSave(null), bolted: [...load.parts] })
    pullAndLetGo(played, pull)
    const name = `${load.parts.join(' and ') || 'bare'} from ${Math.round(pull.x)}, ${Math.round(pull.y)}${hold ? ', held' : ''}`
    let before = 'seat'
    watch(played, (f) => {
      const pose = f.pilot.pose
      // The frame a flight ends in: lying or stuck, it is on the floor it came down on, and in the sea it floats.
      if (before === 'fly' && (pose === 'belly' || pose === 'beak')) {
        found.landings += 1
        if (!tops.includes(Math.round(f.pilot.y + PENGUIN.r))) found.sunk.push(`${pose}, ${name}`)
      }
      if (pose === 'bob') {
        found.afloat += 1
        if (Math.abs(f.pilot.y + PENGUIN.r - SEA_Y) > 6) found.adrift.push(name)
      }
      before = pose
      // Under the water it is not drawn, and behind the things on the ice it is drawn behind them.
      const body = bodyOf(f)
      if (!body) return
      const ball = ballAt(f, out)
      const apart = Math.hypot(ball.x - body.x, ball.y - body.y)
      if (apart < BALL.clear - 1e-6) found.throughBall.push(name)
      if (Math.abs(apart - BALL.clear) < 1e-6) found.knocked += 1
      // In the ice by the beak and in the drift on purpose: see the head of this file.
      if (pose === 'beak' || pose === 'buried' || pose === 'hung' || pose === 'bowl') return
      const deep = deepest(f)
      if (deep.into > found.worst.into) found.worst = { ...deep, when: `${pose}, ${name}` }
    }, hold)
    found.flights += 1
  }
  audited = found
  return found
}

describe('nothing passes through anything', () => {
  it('keeps the penguin out of every solid thing, in the air, on landing and on the way back, for every load and pulls all over the grid, at each size', () => {
    const { flights, worst } = audit()
    expect(flights).toBeGreaterThan(500)
    for (const [width, height] of SIZES) {
      // The same half unit of the model, in the pixels of each surface.
      const scale = fit(width, height).scale
      expect(worst.into * scale, `${worst.when} in ${worst.what} at ${width} by ${height}`).toBeLessThanOrEqual(STEP_SLACK * scale)
    }
  }, 60_000)

  it('draws the penguin no more than its overhang past the round it is flown as', () => {
    // Allowed, with its cap: head and feet reach 12 units past the round, so a tumbling penguin's crown or toes
    // can lie that far over the line of a thing it is touching. The round itself never does.
    expect(OVERHANG).toBe(12)
    expect(PENGUIN.width / 2 - PENGUIN.r).toBeLessThanOrEqual(0)
  })

  it('stands the landed penguin on what it landed on, not in it', () => {
    const found = audit()
    expect(found.landings).toBeGreaterThan(60)
    expect(found.sunk).toEqual([])
    expect(found.afloat).toBeGreaterThan(100)
    expect(found.adrift).toEqual([])
    // On its feet it stands its whole height above the floor it came down on.
    for (const [parts, put, top] of [[['umbrella'], { x: 238, y: ICE_Y - PENGUIN.r - 6, vy: 120, open: true }, ICE_Y], [['balloon'], { x: 1150, y: BERG.y0 - PENGUIN.r - 2, vy: 30 }, BERG.y0]] as const) {
      const played = staged(parts, put)
      while (played.toy.phase === 'fly') play(played, 1 / 60)
      expect(played.toy.show().pilot).toMatchObject({ pose: 'stand', y: top - PENGUIN.height / 2 })
    }
  })

  it('draws the penguin behind the things on the ice on its way home and in front of them in flight, at each size', () => {
    for (const [width, height] of SIZES) {
      const stand = standIn(true)
      const view = new View(stand.make)
      view.setTier(TIERS[0])
      view.build(stand.ctx, width, height, 1)
      const art = view.figures!
      const onIce = [art.farSeal, art.drift, art.igloo, art.nearSeal, art.lid, art.sledge, art.fork]
      let behindFrames = 0, inFront = 0
      const scenes: [readonly ('wings' | 'umbrella' | 'fish')[], { x: number; y: number; vx?: number; vy?: number; open?: boolean }][] = [
        [[], { x: DRIFT.x + 5, y: DRIFT.y - DRIFT.ry - 34, vy: 250 }],
        [['wings'], { x: DRIFT.x + 5, y: DRIFT.y - DRIFT.ry - 34, vy: 250 }],
        [['umbrella'], { x: DRIFT.x + 5, y: DRIFT.y - DRIFT.ry - 34, vy: 120, open: true }],
        [[], { x: 965, y: 540, vy: 150 }],
        [['fish'], { x: 1150, y: BERG.y0 - PENGUIN.r - 2, vy: 20 }],
        [[], { x: BASKET.x0 - PENGUIN.r - 2, y: 308, vx: 100 }],
        [[], { x: BASKET.x1 + PENGUIN.r + 2, y: 308, vx: -100 }],
        [[], { x: 540, y: ICE_Y - PENGUIN.r - 40, vy: 500 }],
        [[], { x: 1232, y: 300, vx: 300 }],
      ]
      for (const [parts, put] of scenes) {
        watch(staged(parts, put), (f) => {
          stand.reset()
          view.draw(stand.ctx, f, 1 / 60)
          const order = stand.tally.stamped
          const body = order.indexOf(art.pilot.image)
          const pose = f.pilot.pose
          if (pose === 'under' || pose === 'gone' || pose === 'buried') return expect(body).toBe(-1)
          expect(body, pose).toBeGreaterThanOrEqual(0)
          if (f.pilot.behind) {
            behindFrames += 1
            for (const front of onIce) expect(body, pose).toBeLessThan(order.indexOf(front.image))
            // The way home lies on the shelf, clear of the water, along the back of it.
            expect(f.pilot.x).toBeLessThanOrEqual(SHELF_EDGE + PENGUIN.r)
            if (pose === 'toboggan') expect(f.pilot.y).toBe(ICE_Y - PENGUIN.width / 2 - BACK_LANE)
          } else if (pose === 'hung') {
            // Hung by its wings, its body is down in the drift: the drift is drawn over it.
            expect(body).toBeLessThan(order.indexOf(art.drift.image))
          } else if (pose === 'bowl') {
            // Sat in the umbrella on the drift: the drift, then the penguin on top of it, then the bowl it sits in.
            expect(body).toBeGreaterThan(order.indexOf(art.drift.image))
            expect(order.indexOf(art.parts.umbrellaFlipped.image)).toBeGreaterThan(body)
            // The igloo stands in front of the drift and of whatever sits on it.
            expect(order.indexOf(art.igloo.image)).toBeGreaterThan(order.indexOf(art.parts.umbrellaFlipped.image))
          } else if (pose === 'seat') {
            // In the pouch: the sling is drawn round it.
            expect(body).toBeLessThan(order.indexOf(art.pouch.image))
            expect(body).toBeGreaterThan(order.indexOf(art.fork.image))
          } else {
            inFront += 1
            for (const back of onIce) expect(body, pose).toBeGreaterThan(order.indexOf(back.image))
            // In front of the basket it holds on to, too.
            expect(body).toBeGreaterThan(order.indexOf(art.basket.image))
          }
          // The cloud is over whatever flies through it.
          expect(order.indexOf(art.cloud.image)).toBeGreaterThan(body)
          // And the squares of the paper are over everything: the last thing drawn is their one stroke.
          expect(stand.tally.log[stand.tally.log.length - 1]).toBe('stroke()')
        })
      }
      expect(behindFrames).toBeGreaterThan(200)
      expect(inFront).toBeGreaterThan(200)
    }
  })

  it('comes up out of the drift through its top, clear of the igloo and the seal beside it', () => {
    for (const parts of [[], ['wings'], ['umbrella'], ['balloon'], ['fish']] as const) {
      const played = staged(parts, { x: DRIFT.x + 5, y: DRIFT.y - DRIFT.ry - 34, vy: parts[0] === 'umbrella' ? 120 : 250, open: parts[0] === 'umbrella' })
      let stood = 0
      watch(played, (f) => {
        if (f.pilot.pose !== 'stand' || f.pilot.behind) return
        stood += 1
        expect(Math.abs(f.pilot.x - DRIFT.x)).toBeLessThanOrEqual(DRIFT.rx * 0.6 + 1e-6)
        expect(deepest(f).into, `${parts.join()} in ${deepest(f).what} at ${Math.round(f.pilot.x)}, ${Math.round(f.pilot.y)}`).toBe(0)
      })
      expect(stood, parts.join()).toBeGreaterThan(5)
    }
  })

  it('goes from the iceberg and from the far side of the basket into the open water clear of the seal and the whale', () => {
    for (const put of [{ x: 1150, y: BERG.y0 - PENGUIN.r - 2, vy: 20 }, { x: BASKET.x1 + PENGUIN.r + 2, y: 308, vx: -100 }, { x: 1232, y: 300, vx: 300 }]) {
      let dived = 0
      watch(staged([], put), (f) => {
        if (f.pilot.pose !== 'stand' || f.pilot.behind || f.pilot.x <= SHELF_EDGE || f.pilot.y + PENGUIN.r <= BERG.y0 + 1) return
        dived += 1
        // Past the edge of the iceberg and on the way down: in nothing but the air.
        const into = Math.max(intoCircle(f.pilot, SEALS[1], PENGUIN.r), intoCircle(f.pilot, WHALE, PENGUIN.r), intoCircle(f.pilot, BALLOON, PENGUIN.r))
        expect(into, `at ${Math.round(f.pilot.x)}, ${Math.round(f.pilot.y)}`).toBeLessThanOrEqual(STEP_SLACK)
      })
      expect(dived).toBeGreaterThan(5)
    }
  })

  it('knocks the ball off the seal rather than let anything through it', () => {
    const found = audit()
    expect(found.throughBall).toEqual([])
    // And some flight does come by it.
    expect(found.knocked).toBeGreaterThan(0)
    expect(BALL.clear).toBeGreaterThanOrEqual(PENGUIN.height / 2 + BALL.r)
  })

  it('has the puffin down behind the rim before a flying body can reach it, and up again for a visitor that stays clear of it', () => {
    const f = newToy().toy.show()
    const at = (x: number, y: number): number => puffinDuck({ ...f, pilot: { ...f.pilot, pose: 'fly', x, y } })
    expect(at(PUFFIN.x - 300, PUFFIN.y)).toBe(0)
    // The puffin stands between the balloon and the basket, as wide as its figure; nothing of a body, drawn to
    // its full height, comes within reach of it before it is down.
    const half = 36
    let nearest = Infinity
    for (let x = 500; x <= 1100; x += 4) for (let y = 60; y <= 420; y += 4) {
      const body = { x, y }
      if (intoCircle(body, BALLOON, PENGUIN.r) > 0 || intoBox(body, BASKET, PENGUIN.r) > 0) continue
      const reach = Math.hypot(Math.max(0, Math.abs(x - PUFFIN_AT.x) - half), Math.max(0, PUFFIN.y - PUFFIN.r - y, y - PUFFIN_AT.y)) - PENGUIN.height / 2
      if (reach <= 0) expect(at(x, y), `a body at ${x}, ${y}`).toBe(1)
      if (at(x, y) < 1) nearest = Math.min(nearest, reach)
    }
    expect(nearest).toBeGreaterThan(0)
    expect(PUFFIN_DUCKS.near).toBeGreaterThanOrEqual(PENGUIN.height / 2 + half)
    // In the pouch or behind the things on the ice, the penguin sends nobody ducking.
    expect(puffinDuck({ ...f, pilot: { ...f.pilot, pose: 'seat', x: PUFFIN.x, y: PUFFIN.y } })).toBe(0)
    // Holding on to the side of the basket, its round is clear of where the puffin stands.
    for (const put of [{ x: BASKET.x0 - PENGUIN.r - 2, y: 308, vx: 100 }, { x: BASKET.x1 + PENGUIN.r + 2, y: 308, vx: -100 }, { x: BASKET.x0 - 60, y: BASKET.y0 - 46, vx: 120, vy: 120 }]) {
      const played = staged([], put)
      while (played.toy.phase === 'fly') play(played, 1 / 60)
      const perch = played.toy.show().pilot
      expect(perch.pose).toBe('perch')
      expect(Math.abs(perch.x - PUFFIN_AT.x) - PENGUIN.r).toBeGreaterThanOrEqual(half - 4)
    }
  })

  it('keeps the chick inside its doorway, where no body comes', () => {
    // The chick stands in the igloo's round, which is solid: a body's round is never nearer than the igloo's wall.
    expect(Math.hypot(CHICK.x - IGLOO.x, CHICK.y - IGLOO.y) + CHICK.r).toBeLessThanOrEqual(IGLOO.r)
  })

  it('never has the penguin in the pouch in the crate, wherever it is pulled', () => {
    for (let x = 0; x <= 460; x += 7) for (let y = 180; y <= 760; y += 7) {
      const at = clampPouch({ x, y })
      expect(intoBox(at, CRATE, PENGUIN.r)).toBe(0)
    }
  })
})
