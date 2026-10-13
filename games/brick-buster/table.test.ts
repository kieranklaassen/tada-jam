import { describe, expect, it } from 'vitest'
import * as answers from './answers'
import { PRESSED } from './answers'
import { LADDER } from './config'
import { BALL_R, BELL, BUMPER, FIELD, FULL_SIZE, GATES, LADYBIRD, LANE, PLACES, STAGE, SWELL, TARGET_PX, TOYS, VINE_SEAT, WALL, BUMPER_SHAPE, brickBox, bumperReach, colOf, heapSpot, limitsFor, rowFromFoot, rowOf, vineTip, vineTop } from './layout'
import { below, makeRng } from './rng'
import { deserialize, freshSave, serialize, type BallKind, type Brick, type Fallen, type Save } from './save'
import { fit } from './stage'
import { DRUM, GRAVITY, SHOWING_AFTER, STEP, Table, UNDER_WALL } from './table'
import * as v from './voices'
import { layWall } from './walls'

const FRAME = 1 / 60
const KINDS: readonly BallKind[] = ['plain', 'wet', 'hot', 'heavy']

const LETTER: Record<string, () => Brick> = {
  g: () => ({ kind: 'glass', state: 'whole' }), c: () => ({ kind: 'glass', state: 'cracked' }), d: () => ({ kind: 'glass', state: 'sagged' }),
  j: () => ({ kind: 'jelly', state: 'fresh', swollen: false }), J: () => ({ kind: 'jelly', state: 'fresh', swollen: true }), k: () => ({ kind: 'jelly', state: 'thrown-twice', swollen: false }),
  i: () => ({ kind: 'ice', state: 'whole', dimpled: false, icicle: false }), p: () => ({ kind: 'ice', state: 'pool', dimpled: false, icicle: false }),
  s: () => ({ kind: 'seed', state: 'whole', browned: false, gone: false }), v: () => ({ kind: 'seed', state: 'vine', browned: false, gone: false }), V: () => ({ kind: 'seed', state: 'tall-vine', browned: false, gone: false }),
  z: () => ({ kind: 'sleepy', state: 'asleep' }), Z: () => ({ kind: 'sleepy', state: 'deep' }),
}
/** A wall from three rows of six letters, the top row first; a dot is an empty place. */
const wallOf = (rows: readonly string[]): (Brick | null)[] => rows.flatMap((row) => [...row].map((letter) => (letter === '.' ? null : LETTER[letter]())))
const at = (row: number, col: number) => row * WALL.cols + col
/** A table with this wall, both first showings already seen, and the ball as `ball`. */
const tableOf = (rows: readonly string[], more: Partial<Save> = {}, seed = 1) => new Table({ ...freshSave(null), wall: wallOf(rows), shown: ['hot-gate', 'wet-gate'], ...more }, seed)
const fresh = (position = 'glass', seed = 1) => new Table({ ...freshSave(null), position, wall: layWall(position, seed), shown: ['hot-gate', 'wet-gate'] }, seed)

const play = (t: Table, frames: number, each?: (frame: number) => void) => {
  for (let frame = 0; frame < frames; frame++) {
    each?.(frame)
    t.step(FRAME)
  }
}
/** Plays until `done`, and returns every note that sounded on the way. */
const until = (t: Table, done: () => boolean, limit = 600): v.Tone[] => {
  const heard: v.Tone[] = []
  for (let frame = 0; frame < limit && !done(); frame++) {
    t.step(FRAME)
    heard.push(...t.sounds)
    t.sounds = []
  }
  return heard
}
const same = (a: v.Tone, b: v.Tone) => JSON.stringify(a) === JSON.stringify(b)
const has = (heard: readonly v.Tone[], sound: v.Sound) => sound.every((tone) => heard.some((other) => same(tone, other)))

type From = 'below' | 'above' | 'left' | 'right'
/** Puts a ball of `kind` in the air a little way from one face of the brick in `place`, flying at it. */
function aimAt(t: Table, place: number, kind: BallKind, from: From = 'below', speed = 620, off = 0): void {
  const box = t.boxOf(place)
  const cx = box.x + box.w / 2 + off, cy = box.y + box.h / 2
  const gap = BALL_R + 6
  t.kind = kind
  t.look = kind
  Object.assign(t.ball, {
    state: 'flying',
    x: from === 'left' ? box.x - gap : from === 'right' ? box.x + box.w + gap : cx,
    y: from === 'below' ? box.y + box.h + gap : from === 'above' ? box.y - gap : cy,
    vx: from === 'left' ? speed : from === 'right' ? -speed : 0,
    vy: from === 'below' ? -speed : from === 'above' ? speed : 0,
  })
  t.sounds = []
}
/** The ball of `kind` hits the brick in `place`; returns the notes of the hit and of the half second after it. */
function hit(t: Table, place: number, kind: BallKind, from: From = 'below', off = 0): v.Tone[] {
  aimAt(t, place, kind, from, 620, off)
  return until(t, () => false, 40)
}
/** The first press of a visit, on the elephant, which changes nothing on the table. */
const arrive = (t: Table) => {
  t.press(TOYS.elephant.x + 100, TOYS.elephant.y + 200)
  t.lift()
  t.sounds = []
}
/** Plays, a step of the ball at a time, until whatever carries the ball has let it go, and returns where that was. */
const letGo = (t: Table, limit = 1600) => {
  for (let step = 0; step < limit && t.ball.state === 'carried'; step++) t.step(STEP)
  return { x: t.ball.x, y: t.ball.y }
}
const tapBumper = (t: Table) => {
  t.press(t.bumperX, 720)
  t.lift()
}

describe('the bumper under a finger', () => {
  it('answers in the frame the finger lands: it gives, it creaks, and it starts for the finger', () => {
    const t = fresh()
    expect(t.press(400, 700)).toBe('bumper')
    expect(has(t.sounds, v.creak)).toBe(true)
    const from = t.bumperX
    t.step(FRAME)
    expect(t.pose('bumper').get('squash')).toBeGreaterThan(0)
    expect(t.bumperX).toBeLessThan(from)
    play(t, 40)
    expect(t.bumperX).toBeCloseTo(400, 0)
    expect(t.pose('bumper').get('squash')).toBeCloseTo(PRESSED, 1)
    expect(t.ball.state).toBe('resting')
    expect(t.ball.x).toBeCloseTo(t.bumperX, 5)
  })

  it('a finger anywhere that is not on a toy, a brick or the bell is a finger on the bumper', () => {
    const t = tableOf(['......', '..p...', '.v....'])
    expect(t.targetAt(600, 500)).toBe('bumper')
    expect(t.targetAt(600, 60)).toBe('bumper')
    // A pool and a vine are not bricks.
    const pool = brickBox(at(1, 2))
    expect(t.targetAt(pool.x + 30, pool.y + 20)).toBe('bumper')
    expect(t.targetAt(LANE.x, pool.y)).toBe('bumper')
  })

  it('flicks the resting ball up when the finger lifts, straight up from a bumper that stands still, with the boing at that moment', () => {
    const t = fresh()
    t.press(t.bumperX, 700)
    play(t, 10)
    t.sounds = []
    t.lift()
    expect(t.ball.state).toBe('flying')
    expect(t.ball.vy).toBeLessThan(0)
    expect(t.ball.vx).toBe(0)
    expect(has(t.sounds, v.boing(0))).toBe(true)
  })

  it('throws the ball a little the way it is sliding when it lets go', () => {
    const t = fresh()
    t.press(t.bumperX, 700)
    t.slide(BUMPER.maxX)
    play(t, 3)
    t.lift()
    expect(t.ball.vx).toBeGreaterThan(0)
  })

  it('stays inside the field, and stays where it was left', () => {
    const t = fresh()
    t.press(0, 700)
    play(t, 60)
    expect(t.bumperX).toBeGreaterThanOrEqual(BUMPER.minX)
    expect(t.bumperX).toBeCloseTo(BUMPER.minX, 3)
    const left = t.bumperX
    t.takenAway()
    play(t, 60)
    expect(t.bumperX).toBe(left)
  })

  it('a finger that is taken away flicks nothing, and the bumper comes back up', () => {
    const t = fresh()
    t.press(500, 700)
    play(t, 20)
    t.takenAway()
    play(t, 60)
    expect(t.ball.state).toBe('resting')
    expect(t.pose('bumper').get('squash')).toBeCloseTo(0, 1)
  })

  it('springs a ball that lands on it while the finger is on it, and where it lands is where it goes', () => {
    for (const [off, way] of [[0, 0], [50, 1], [-50, -1]] as const) {
      const t = tableOf(['......', '......', '......'])
      t.press(t.bumperX, 700)
      play(t, 20)
      Object.assign(t.ball, { state: 'flying', x: t.bumperX + off, y: 500, vx: 0, vy: 200 })
      until(t, () => t.ball.state === 'caught')
      expect(t.ball.state).toBe('caught')
      until(t, () => t.ball.state === 'flying')
      expect(t.ball.vy).toBeLessThan(-900)
      expect(Math.sign(Math.round(t.ball.vx))).toBe(way)
    }
  })

  it('takes a ball that lands on it while no finger is on it: the ball sinks in, rocks once and rests until a finger lands and lifts', () => {
    const t = tableOf(['gggggg', '......', '......'])
    Object.assign(t.ball, { state: 'flying', x: t.bumperX + 40, y: 500, vx: 0, vy: 200 })
    const heard = until(t, () => t.ball.state === 'resting')
    expect(t.ball.state).toBe('resting')
    expect(has(heard, v.pfff)).toBe(true)
    // It rocks, and comes to rest where it landed.
    let rocked = 0
    play(t, 30, () => { rocked = Math.max(rocked, Math.abs(t.pose('bumper').get('lean'))) })
    expect(rocked).toBeGreaterThan(0.2)
    play(t, 60 * 20)
    expect(t.ball.state).toBe('resting')
    expect(t.ball.x).toBeCloseTo(t.bumperX + (40 / BUMPER.half) * (BUMPER.half - 6), 3)
    // A finger on a toy is not a finger on the bumper: the ball stays.
    t.press(TOYS.elephant.x + 100, TOYS.elephant.y + 200)
    t.lift()
    play(t, 30)
    expect(t.ball.state).toBe('resting')
    // A finger lands and lifts: it is flicked.
    tapBumper(t)
    expect(t.ball.state).toBe('flying')
  })

  it('knocks a low ball along, and never passes through it', () => {
    const t = tableOf(['......', '......', '......'])
    Object.assign(t.ball, { state: 'flying', x: t.bumperX + BUMPER.half + BALL_R + 30, y: FIELD.floor - BALL_R - 1, vx: 0, vy: 0 })
    t.press(t.bumperX, 720)
    t.slide(BUMPER.maxX)
    let knocked = false
    play(t, 90, () => {
      if (t.ball.state === 'flying' && t.ball.y + BALL_R > BUMPER.top + 2) expect(Math.abs(t.ball.x - t.bumperX)).toBeGreaterThanOrEqual(bumperReach(t.ball.y) - 0.5)
      if (has(t.sounds, v.bonk)) knocked = true
      t.sounds = []
    })
    expect(knocked).toBe(true)
    expect(t.ball.x).toBeLessThanOrEqual(FIELD.right - BALL_R + 0.01)
  })

  it('knocks what its drawn shape touches: a ball on the floor rolls in under the cap and is pushed by the stem, with no air between them', () => {
    const t = tableOf(['......', '......', '......'])
    Object.assign(t.ball, { state: 'flying', x: t.bumperX + BUMPER.half + BALL_R + 30, y: FIELD.floor - BALL_R - 1, vx: 0, vy: 0 })
    t.press(t.bumperX, 720)
    t.slide(BUMPER.maxX)
    let nearest = Infinity
    play(t, 40, () => {
      // Its top is under the foot of the cap: only the stem can meet it.
      if (t.ball.state === 'flying' && t.ball.y - BALL_R > BUMPER.top + BUMPER_SHAPE.capH) nearest = Math.min(nearest, t.ball.x - t.bumperX)
    })
    // Edge to edge with the stem as it is painted, which is 52 to either side of the middle.
    expect(nearest - BALL_R - BUMPER_SHAPE.stemHalf).toBeGreaterThanOrEqual(-0.01)
    expect(nearest - BALL_R - BUMPER_SHAPE.stemHalf).toBeLessThan(0.5)
    // Beside the cap, a ball is kept off its round end, and at every height the reach is the painted shape's.
    expect(bumperReach(BUMPER.top + BUMPER_SHAPE.capH / 2)).toBeCloseTo(BUMPER.half + BALL_R, 0)
    expect(bumperReach(FIELD.floor - BALL_R)).toBe(BUMPER_SHAPE.stemHalf + BALL_R)
    for (let y = BUMPER.top - BALL_R + 3; y < FIELD.floor - BALL_R; y += 1) {
      const reach = bumperReach(y)
      // Never more than the widest the bumper is drawn, and never less than the stem once the ball is beside it.
      expect(reach).toBeLessThanOrEqual(BUMPER.half + BALL_R + 0.01)
      if (y + BALL_R > BUMPER.top + BUMPER_SHAPE.capH) expect(reach).toBeGreaterThanOrEqual(BUMPER_SHAPE.stemHalf + BALL_R)
      // And it has no step in it: a ball that rises or falls beside the bumper is not thrown aside.
      expect(Math.abs(bumperReach(y + 1) - reach)).toBeLessThan(9)
    }
  })

  it('a heavy ball squashes the bumper flat with a groan before it is sprung, and reaches the top row and no higher', () => {
    const t = tableOf(['......', '......', '......'], { ball: 'heavy' })
    t.press(t.bumperX, 720)
    t.sounds = []
    t.lift()
    expect(has(t.sounds, v.groan)).toBe(true)
    expect(t.ball.state).toBe('caught')
    let flat = 0, top = Infinity
    play(t, 12, () => { flat = Math.max(flat, t.pose('bumper').get('squash')) })
    expect(flat).toBeGreaterThan(0.6)
    until(t, () => t.ball.state === 'flying')
    play(t, 120, () => { top = Math.min(top, t.ball.y) })
    expect(top - BALL_R).toBeLessThan(WALL.top + WALL.cellH)
    expect(top - BALL_R).toBeGreaterThan(FIELD.roof + 10)
  })
})

describe('the drum-skin floor', () => {
  const drop = (kind: BallKind) => {
    const t = tableOf(['gg....', '......', '......'], { bumper: BUMPER.maxX })
    t.kind = kind
    t.look = kind
    Object.assign(t.ball, { state: 'flying', x: 400, y: 600, vx: 0, vy: 100 })
    const heard = until(t, () => t.ball.vy < 0)
    return { t, heard }
  }

  it('bounces a ball that misses the bumper straight back up in place, high enough to slide the bumper under, each boom a little softer', () => {
    const { t, heard } = drop('plain')
    expect(has(heard, v.doom)).toBe(true)
    expect(t.ball.vy).toBeGreaterThanOrEqual(-DRUM)
    expect(t.ball.vy).toBeLessThan(-DRUM + 15)
    expect(DRUM ** 2 / (2 * GRAVITY)).toBeGreaterThan(FIELD.floor - BUMPER.top + BALL_R * 2 + 60)
    let top = Infinity
    const later = until(t, () => false, 60 * 12)
    play(t, 120, () => { top = Math.min(top, t.ball.y) })
    expect(t.ball.x).toBe(400)
    expect(top).toBeLessThan(BUMPER.top - BALL_R * 2)
    // Each boom is the one before it, softer: none is as loud as the first again.
    expect(has(later, v.softer(v.doom, answers.BOOM_SOFTER ** 3))).toBe(true)
    expect(has(later, v.doom)).toBe(false)
  })

  it('answers each kind of ball in its own way', () => {
    const wet = drop('wet')
    expect(has(wet.heard, v.wetSlap)).toBe(true)
    expect(wet.t.pose('drum').get('damp')).toBe(1)
    const hot = drop('hot')
    expect(has(hot.heard, v.sizzle)).toBe(true)
    expect(hot.t.pose('drum').get('scorch')).toBe(1)
    // The skin tightens: the bounce sounds a note higher than a plain one.
    expect(v.sizzle[1].frequency).toBeGreaterThan(v.doom[0].frequency * 1.1)
    const heavy = drop('heavy')
    expect(has(heavy.heard, v.deepBoom)).toBe(true)
    // Every standing brick hops, and the three large toys jump.
    let brick = 0, toys = { dragon: 0, walrus: 0, elephant: 0 }
    play(heavy.t, 40, () => {
      brick = Math.max(brick, heavy.t.pose('brick:0').get('hop'), heavy.t.pose('brick:1').get('hop'))
      for (const toy of ['dragon', 'walrus', 'elephant'] as const) toys = { ...toys, [toy]: Math.max(toys[toy], heavy.t.pose(toy).get('hop')) }
    })
    expect(brick).toBeGreaterThan(0.3)
    expect(Math.min(toys.dragon, toys.walrus, toys.elephant)).toBeGreaterThan(0.2)
    // And the scorch, the damp patch and the steam are gone again.
    for (const each of [hot.t, wet.t]) {
      each.ball.state = 'resting'
      play(each, 60 * 4)
    }
    expect(hot.t.pose('drum').get('scorch')).toBeCloseTo(0, 2)
    expect(hot.t.pose('drum').get('steam')).toBe(0)
    expect(wet.t.pose('drum').get('damp')).toBeCloseTo(0, 2)
  })

  it('a finger pats it: a small sound, a ripple, and the bumper slides over to the hand', () => {
    const t = fresh()
    t.press(350, FIELD.floor + 20)
    expect(has(t.sounds, v.dum)).toBe(true)
    play(t, 40)
    expect(t.bumperX).toBeCloseTo(350, 0)
  })
})

describe('the three gates', () => {
  const through = (toy: 'dragon' | 'walrus' | 'elephant', kind: BallKind) => {
    const t = tableOf(['g.....', '......', '......'])
    const gate = GATES[toy]
    t.kind = kind
    t.look = kind
    Object.assign(t.ball, { state: 'flying', x: gate.side < 0 ? FIELD.left + 60 : FIELD.right - 60, y: (gate.y0 + gate.y1) / 2 - 4, vx: gate.side * 500, vy: 0 })
    t.dirty = 'no'
    until(t, () => t.ball.state !== 'flying', 30)
    return t
  }

  it.each([['dragon', 'hot', [...v.hic, ...v.flare]], ['walrus', 'wet', v.spout], ['elephant', 'heavy', v.blow]] as const)('%s makes the ball %s: what it will be is saved as the toy takes it, and it comes out changed and falls towards the floor', (toy, makes, voice) => {
    const t = through(toy, 'plain')
    expect(['carried', 'hidden']).toContain(t.ball.state)
    expect(t.toSave().ball).toBe(makes)
    expect(t.dirty).toBe('now')
    expect(t.look).toBe('plain')
    const heard = until(t, () => t.ball.state === 'flying', 200)
    expect(t.time).toBeLessThan(1.8)
    expect(t.look).toBe(makes)
    expect(has(heard, voice)).toBe(true)
    // Back on the table, inside the rail, moving away from it.
    expect(Math.abs(t.ball.x - GATES[toy].out.x)).toBeLessThan(5)
    expect(Math.sign(t.ball.vx)).toBe(-GATES[toy].side)
    play(t, 30)
    expect(t.ball.vy).toBeGreaterThan(0)
  })

  it.each([['dragon', 'hot', v.wheeze], ['walrus', 'wet', v.rubDry], ['elephant', 'heavy', v.rattle(0)]] as const)('a ball taken through the %s gate that made it comes out plain again', (toy, kind, voice) => {
    const t = through(toy, kind)
    expect(t.toSave().ball).toBe('plain')
    const heard = until(t, () => t.ball.state === 'flying', 200)
    expect(t.look).toBe('plain')
    expect(has(heard, voice)).toBe(true)
  })

  it('a ball of another kind takes the kind of the gate it goes through', () => {
    expect(through('walrus', 'hot').toSave().ball).toBe('wet')
    expect(through('dragon', 'heavy').toSave().ball).toBe('hot')
    expect(through('elephant', 'wet').toSave().ball).toBe('heavy')
  })

  it('a ball that is not wholly inside the opening clicks off the rail', () => {
    const t = tableOf(['g.....', '......', '......'])
    Object.assign(t.ball, { state: 'flying', x: FIELD.left + 60, y: GATES.dragon.y1 + 4, vx: -500, vy: 0 })
    play(t, 12)
    expect(t.ball.state).toBe('flying')
    expect(t.ball.vx).toBeGreaterThan(0)
    expect(t.kind).toBe('plain')
  })

  it('the gates are open at every position, and a put-away with the ball in a gate keeps what it will be', () => {
    for (const position of LADDER) {
      const t = fresh(position)
      Object.assign(t.ball, { state: 'flying', x: FIELD.left + 60, y: (GATES.walrus.y0 + GATES.walrus.y1) / 2, vx: -500, vy: 0 })
      play(t, 20)
      const left = t.settled()
      expect(left.kind).toBe('wet')
      expect(left.look).toBe('wet')
      expect(left.ball.state).toBe('resting')
    }
  })
})

describe('glass', () => {
  it('a plain ball rings it and cracks it; a cracked one rings once more and falls in shards', () => {
    const t = tableOf(['......', '......', '..g...'])
    const place = at(2, 2)
    const first = hit(t, place, 'plain')
    expect(t.wall[place]).toEqual({ kind: 'glass', state: 'cracked' })
    expect(has(first, v.ring(2, 0))).toBe(true)
    expect(has(first, v.crack)).toBe(true)
    t.dirty = 'no'
    aimAt(t, place, 'plain')
    const second = until(t, () => t.wall[place] === null, 30)
    expect(t.rubble).toEqual([{ kind: 'glass', col: 2 }])
    expect(t.dirty).toBe('now')
    expect(has(second, v.ring(2, 0))).toBe(true)
    const after = until(t, () => false, 40)
    expect(has(after, v.tinkle(1))).toBe(true)
  })

  it('a wet ball wipes it clean with a squeak and adds no crack', () => {
    const t = tableOf(['......', '......', '..gc..'])
    for (const place of [at(2, 2), at(2, 3)]) {
      const before = { ...t.wall[place]! }
      const heard = hit(t, place, 'wet')
      expect(has(heard, v.squeak)).toBe(true)
      expect(t.wall[place]).toEqual(before)
    }
    aimAt(t, at(2, 2), 'wet')
    let shine = 0, flat = 0
    play(t, 30, () => {
      shine = Math.max(shine, t.pose(`brick:${at(2, 2)}`).get('shine'))
      flat = Math.max(flat, t.pose(`brick:${at(2, 2)}`).get('flat'))
    })
    expect(shine).toBe(1)
    expect(flat).toBe(1)
    play(t, 60 * 4)
    expect(t.pose(`brick:${at(2, 2)}`).get('shine')).toBe(0)
  })

  it('a hot ball sags it into a drip, and the next ball of any kind pops the drip', () => {
    for (const next of KINDS) {
      const t = tableOf(['......', '......', '..g...'])
      const place = at(2, 2)
      const heard = hit(t, place, 'hot')
      expect(has(heard, v.bwoom)).toBe(true)
      expect(t.wall[place]).toEqual({ kind: 'glass', state: 'sagged' })
      expect(t.pose(`brick:${place}`).get('sag')).toBeGreaterThan(0.5)
      const pop = hit(t, place, next)
      expect(has(pop, v.pock), next).toBe(true)
      expect(t.wall[place]).toBe(null)
      expect(t.rubble).toEqual([{ kind: 'glass', col: 2 }])
    }
  })

  it('a heavy ball goes straight through: every glass brick in its line breaks at once and the ball does not turn', () => {
    const t = tableOf(['..g...', '..c.g.', '..gi..'])
    aimAt(t, at(2, 2), 'heavy', 'below', 700)
    const heard = until(t, () => t.rubble.length > 0, 30)
    expect(has(heard, v.crash)).toBe(true)
    expect(t.rubble).toEqual([{ kind: 'glass', col: 2 }, { kind: 'glass', col: 2 }, { kind: 'glass', col: 2 }])
    expect([at(0, 2), at(1, 2), at(2, 2)].map((place) => t.wall[place])).toEqual([null, null, null])
    expect(t.wall[at(1, 4)]?.kind).toBe('glass')
    expect(t.ball.vy).toBeLessThan(-600)
    expect(t.ball.vx).toBe(0)
    // Across the wall, the line is the row.
    const across = tableOf(['......', 'g.g.zg', '......'])
    aimAt(across, at(1, 0), 'heavy', 'left', 700)
    until(across, () => across.rubble.length > 0, 30)
    expect(across.rubble.length).toBe(3)
    expect(across.ball.vx).toBeGreaterThan(600)
  })

  it('a finger: the tink of a nail, a blink, and one breath that fogs the glass', () => {
    const t = tableOf(['......', '......', '..g...'])
    const box = brickBox(at(2, 2))
    expect(t.press(box.x + 20, box.y + 20)).toBe('brick')
    expect(has(t.sounds, v.tink)).toBe(true)
    let fog = 0, blink = 0
    play(t, 20, () => {
      fog = Math.max(fog, t.pose(`brick:${at(2, 2)}`).get('fog'))
      blink = Math.max(blink, t.pose(`brick:${at(2, 2)}`).get('blink'))
    })
    expect(fog).toBeGreaterThan(0.9)
    expect(blink).toBeGreaterThan(0.3)
    expect(t.wall[at(2, 2)]).toEqual({ kind: 'glass', state: 'whole' })
    // A finger on a brick does not move the bumper.
    expect(t.bumperHeld).toBe(false)
  })
})

describe('jelly', () => {
  it('a plain ball: it wobbles and throws the ball sideways, the same way every time, and the third throw shakes it off into the rubble', () => {
    const t = tableOf(['..j...', '......', '......'])
    const place = at(0, 2)
    for (let count = 0; count < 2; count++) {
      play(t, 12)
      aimAt(t, place, 'plain', 'below', 620, 20)
      const heard = until(t, () => Math.abs(t.ball.vx) > 100, 30)
      expect(has(heard, v.jellyBlub(count, 2, 2))).toBe(true)
      expect(t.ball.vx).toBeGreaterThan(400)
    }
    expect(t.wall[place]).toEqual({ kind: 'jelly', state: 'thrown-twice', swollen: false })
    play(t, 12)
    aimAt(t, place, 'plain', 'below', 620, -20)
    until(t, () => t.wall[place] === null, 30)
    expect(t.ball.vx).toBeLessThan(-400)
    expect(t.rubble).toEqual([{ kind: 'jelly', form: 'splat', col: 2 }])
    expect(has(until(t, () => false, 60), v.splat)).toBe(true)
  })

  it('a swollen jelly is twice the size and throws the ball twice as far', () => {
    const t = tableOf(['..J...', '......', '......'])
    const place = at(0, 2)
    const box = t.boxOf(place)
    expect(box.h).toBe(WALL.brickH + SWELL)
    expect(box.w * box.h).toBeGreaterThan(brickBox(place).w * brickBox(place).h * 1.85)
    // A ball still fits between it and the roof.
    expect(box.y - FIELD.roof).toBeGreaterThan(BALL_R * 2)
    aimAt(t, place, 'plain', 'below', 620, 20)
    until(t, () => Math.abs(t.ball.vx) > 100, 30)
    expect(t.ball.vx).toBeGreaterThan(800)
  })

  it('a wet ball slips round it with a slurp and carries on the way it was going, and the jelly is left shining', () => {
    const t = tableOf(['..j...', '......', '......'])
    const place = at(0, 2), box = brickBox(place)
    aimAt(t, place, 'wet', 'below', 620, 10)
    const heard = until(t, () => t.ball.state === 'carried', 30)
    expect(has(heard, v.slurp)).toBe(true)
    // Round its side and over its top, touching it all the way and never inside it.
    until(t, () => {
      const dx = t.ball.x - Math.max(box.x, Math.min(box.x + box.w, t.ball.x)), dy = t.ball.y - Math.max(box.y, Math.min(box.y + box.h, t.ball.y))
      expect(Math.hypot(dx, dy)).toBeGreaterThan(BALL_R - 0.6)
      return t.ball.state !== 'carried'
    }, 120)
    expect(t.ball.state).toBe('flying')
    expect(t.ball.y).toBeLessThan(box.y)
    expect(t.ball.vy).toBeLessThan(-300)
    expect(t.pose(`brick:${place}`).get('shine')).toBe(1)
    expect(t.wall[place]).toEqual({ kind: 'jelly', state: 'fresh', swollen: false })
    // From above, it goes round and carries on down.
    aimAt(t, place, 'wet', 'above', 300, 10)
    until(t, () => t.ball.state === 'carried', 30)
    until(t, () => t.ball.state !== 'carried', 120)
    expect(t.ball.y).toBeGreaterThan(box.y + box.h)
    expect(t.ball.vy).toBeGreaterThan(300)
  })

  it('a wet ball that finds a brick in its way round is let go there, clear of everything', () => {
    const t = tableOf(['.gjg..', '......', '......'])
    aimAt(t, at(0, 2), 'wet', 'below', 620, 10)
    until(t, () => t.ball.state === 'carried', 30)
    until(t, () => t.ball.state !== 'carried', 120)
    expect(t.ball.state).toBe('flying')
    expect(t.ball.y).toBeGreaterThan(brickBox(at(0, 2)).y + WALL.brickH)
  })

  it('a hot ball melts it into syrup that runs to the rubble, and the ball trails a sticky thread that twangs', () => {
    const t = tableOf(['..j...', '......', '......'])
    aimAt(t, at(0, 2), 'hot')
    const heard = until(t, () => t.wall[at(0, 2)] === null, 30)
    expect(has(heard, v.glorp)).toBe(true)
    expect(t.rubble).toEqual([{ kind: 'jelly', form: 'syrup', col: 2 }])
    expect(t.pose('ball').get('thread')).toBe(1)
    const after = until(t, () => t.pose('ball').get('thread') === 0, 60)
    expect(has(after, v.threadTwang)).toBe(true)
  })

  it('a heavy ball sinks deep in and is flung straight up into the roof with a long spring and a thud, and the jelly goes on shaking', () => {
    const t = tableOf(['..j...', '......', '......'])
    const place = at(0, 2), box = brickBox(place)
    aimAt(t, place, 'heavy', 'below', 500)
    const heard = until(t, () => t.ball.state === 'held', 40)
    expect(Math.abs(t.ball.y - (box.y + box.h / 2))).toBeLessThan(1)
    const flung = until(t, () => t.ball.state === 'flying', 40)
    expect(t.ball.vx).toBe(0)
    expect(t.ball.vy).toBeLessThan(-1000)
    expect(t.ball.y).toBeLessThan(box.y)
    const thud = until(t, () => t.ball.vy > 0, 40)
    for (let index = 0; index < 3; index++) expect(has([...heard, ...flung], v.boi(index))).toBe(true)
    expect(has(thud, v.roofThud)).toBe(true)
    // It comes off the roof at a slant and not back onto the jelly.
    expect(Math.abs(t.ball.vx)).toBeGreaterThan(100)
    let shaking = 0
    play(t, 20, () => { shaking = Math.max(shaking, Math.abs(t.pose(`brick:${place}`).get('wobble'))) })
    expect(shaking).toBeGreaterThan(0.2)
    expect(t.wall[place]).toEqual({ kind: 'jelly', state: 'fresh', swollen: false })
  })

  it('a finger: it wobbles for as long as it is pressed, with its rubbery sound and a titter, and stops when the finger lifts', () => {
    const t = tableOf(['..j...', '......', '......'])
    const box = brickBox(at(0, 2))
    t.press(box.x + 20, box.y + 20)
    expect(has(t.sounds, v.bwub(0))).toBe(true)
    expect(has(t.sounds, v.titter(0))).toBe(true)
    t.sounds = []
    const held = until(t, () => false, 60)
    expect(held.filter((tone) => tone === v.bwub(1)[0] || tone === v.bwub(0)[0]).length).toBeGreaterThanOrEqual(0)
    expect(held.length).toBeGreaterThanOrEqual(8)
    t.lift()
    play(t, 20)
    t.sounds = []
    expect(until(t, () => false, 60).length).toBe(0)
  })
})

describe('ice', () => {
  it('a plain ball skates off with a dry sound and frost chips; the ice shivers and stays whole', () => {
    const t = tableOf(['......', '......', '..i...'])
    const heard = hit(t, at(2, 2), 'plain')
    expect(has(heard, v.tsk)).toBe(true)
    expect(t.wall[at(2, 2)]).toEqual({ kind: 'ice', state: 'whole', dimpled: false, icicle: false })
    aimAt(t, at(2, 2), 'plain')
    until(t, () => t.ball.vy > 0, 30)
    // It keeps nearly all of its speed.
    expect(t.ball.vy).toBeGreaterThan(540)
  })

  it('a wet ball freezes on: it sticks for a breath and drops off plain with a cap of frost, and the ice has an icicle', () => {
    const t = tableOf(['......', '......', '..i...'])
    aimAt(t, at(2, 2), 'wet')
    t.dirty = 'no'
    const heard = until(t, () => t.ball.state === 'held', 30)
    expect(has(heard, v.freeze(0))).toBe(true)
    // What the ball will be is saved as the ice takes it.
    expect(t.toSave().ball).toBe('plain')
    expect(t.dirty).toBe('now')
    expect(t.look).toBe('wet')
    const y = t.ball.y
    play(t, 12)
    expect(t.ball.y).toBe(y)
    const crackle = until(t, () => t.ball.state === 'flying', 60)
    expect(has(crackle, v.freeze(2))).toBe(true)
    expect(t.look).toBe('plain')
    expect(t.pose('ball').get('frost')).toBe(1)
    expect(t.ball.vx).toBe(0)
    expect(t.wall[at(2, 2)]).toEqual({ kind: 'ice', state: 'whole', dimpled: false, icicle: true })
    play(t, 60 * 5, () => { if (t.ball.y > 700) Object.assign(t.ball, { vy: 0, y: 700 }) })
    expect(t.pose('ball').get('frost')).toBe(0)
  })

  it('a hot ball melts it with a long hiss into a pool that lies where it stood, and the ball stays hot', () => {
    const t = tableOf(['......', '......', '..i..g'])
    const heard = hit(t, at(2, 2), 'hot')
    expect(has(heard, v.meltHiss)).toBe(true)
    expect(t.wall[at(2, 2)]).toEqual({ kind: 'ice', state: 'pool', dimpled: false, icicle: false })
    expect(t.kind).toBe('hot')
    expect(t.solid(at(2, 2))).toBe(false)
  })

  it('stops a heavy ball dead with an anvil\'s note and takes one dimple; the ball drops straight down', () => {
    const t = tableOf(['......', '......', '..i...'])
    aimAt(t, at(2, 2), 'heavy', 'below', 700)
    const heard = until(t, () => (t.wall[at(2, 2)] as { dimpled: boolean }).dimpled, 30)
    expect(has(heard, v.donk)).toBe(true)
    expect(t.ball.vx).toBe(0)
    expect(Math.abs(t.ball.vy)).toBeLessThan(10)
    expect(t.wall[at(2, 2)]).toEqual({ kind: 'ice', state: 'whole', dimpled: true, icicle: false })
    const x = t.ball.x
    play(t, 20)
    expect(t.ball.x).toBe(x)
    expect(t.ball.vy).toBeGreaterThan(100)
  })

  it('a finger: a cold squeak, and a clear fingerprint that frosts over again', () => {
    const t = tableOf(['......', '......', '..i...'])
    const box = brickBox(at(2, 2))
    t.press(box.x + 20, box.y + 20)
    expect(has(t.sounds, v.coldSqueak)).toBe(true)
    expect(t.pose(`brick:${at(2, 2)}`).get('print')).toBe(1)
    play(t, 60 * 3)
    expect(t.pose(`brick:${at(2, 2)}`).get('print')).toBe(0)
  })
})

describe('a seed and its vine', () => {
  it('a plain ball knocks on it like a wooden block; a short vine uncurls, lifts the ball one brick up and lets it go', () => {
    const t = tableOf(['......', '......', '.s....'])
    const place = at(2, 1)
    aimAt(t, place, 'plain')
    const heard = until(t, () => t.ball.state === 'carried', 30)
    expect(has(heard, v.tock(1, 0))).toBe(true)
    expect(has(heard, v.vineCreak)).toBe(true)
    expect(t.wall[place]).toEqual({ kind: 'seed', state: 'vine', browned: false, gone: false })
    const left = letGo(t)
    expect(left.x).toBe(LANE.x)
    expect(left.y).toBeCloseTo(vineTop(2), 3)
    expect(t.pose('vine').get('grow')).toBe(1)
    // Let go, it pops up a little and falls past the vine without being taken again.
    let taken = 0
    play(t, 120, () => { if (t.ball.state === 'carried') taken += 1 })
    expect(taken).toBe(0)
    expect(t.ball.y).toBeGreaterThan(vineTop(2) + 100)
  })

  it('a ball on the seed\'s far side, where the vine cannot reach it, bounces off', () => {
    const t = tableOf(['......', '......', '.s....'])
    aimAt(t, at(2, 1), 'plain', 'right')
    play(t, 30)
    expect(t.ball.state).toBe('flying')
    expect(t.wall[at(2, 1)]).toEqual({ kind: 'seed', state: 'vine', browned: false, gone: false })
  })

  it('any ball that comes to the vine rides up it, and a hot ball curls its leaves brown and is still carried', () => {
    for (const kind of KINDS) {
      const t = tableOf(['......', '......', '.v....'])
      t.kind = kind
      t.look = kind
      Object.assign(t.ball, { state: 'flying', x: LANE.x + 10, y: 400, vx: 0, vy: -500 })
      const heard = until(t, () => t.ball.state === 'carried', 40)
      expect(t.ball.state, kind).toBe('carried')
      expect(has(heard, v.vineCreak)).toBe(true)
      expect(has(heard, v.brownCrackle)).toBe(kind === 'hot')
      expect(letGo(t).y).toBeCloseTo(vineTop(2), 3)
      expect((t.wall[at(2, 1)] as { browned: boolean }).browned).toBe(kind === 'hot')
    }
  })

  it('a wet ball: the vine shoots to the roof with a slide-whistle, the ball goes up it and rolls onto the wall from above, and the leaves stay', () => {
    const t = tableOf(['.gg...', '......', '.s....'])
    aimAt(t, at(2, 1), 'wet')
    const heard = until(t, () => t.ball.state === 'carried', 30)
    expect(has(heard, v.slideWhistle)).toBe(true)
    expect(t.wall[at(2, 1)]).toEqual({ kind: 'seed', state: 'tall-vine', browned: false, gone: false })
    until(t, () => t.ball.state !== 'carried', 300)
    expect(t.ball.y).toBeCloseTo(LANE.top, 0)
    expect(t.ball.y + BALL_R).toBeLessThan(WALL.top)
    expect(t.ball.vx).toBeGreaterThan(0)
    // It comes down onto the top row from above.
    until(t, () => t.ball.vy < 0 || t.ball.state !== 'flying', 120)
    expect(t.ball.y).toBeLessThan(WALL.top)
    expect(t.ball.x).toBeGreaterThan(WALL.left + WALL.cellW)
    play(t, 60 * 3)
    expect(t.pose('vine').get('tall')).toBe(1)
  })

  it('a hot ball pops it like popcorn, and a puffed flower floats down to the tray', () => {
    const t = tableOf(['......', '......', '.s....'])
    aimAt(t, at(2, 1), 'hot', 'right')
    const heard = until(t, () => t.wall[at(2, 1)] === null, 30)
    expect(has(heard, v.popBang)).toBe(true)
    expect(t.wall[at(2, 1)]).toBe(null)
    expect(t.rubble).toEqual([{ kind: 'seed', form: 'flower', col: 1 }])
    expect(t.vinePlace).toBe(-1)
    play(t, 60 * 2)
    expect(t.pose('rubble:0').get('fall')).toBe(1)
  })

  it('a heavy ball drives it into the board like a peg, and a moment later a fat sprout comes up through the tray', () => {
    const t = tableOf(['......', '......', '.s....'])
    aimAt(t, at(2, 1), 'heavy', 'right')
    const heard = until(t, () => t.wall[at(2, 1)] === null, 30)
    expect(has(heard, v.thunk)).toBe(true)
    expect(t.rubble).toEqual([{ kind: 'seed', form: 'sprout', col: 1 }])
    expect(t.pose('rubble:0').get('sprout')).toBe(0)
    const later = until(t, () => t.pose('rubble:0').get('sprout') > 0.5, 90)
    expect(has(later, v.pip)).toBe(true)
  })

  it.each([['hot', 'v', 'flower'], ['heavy', 'v', 'sprout'], ['hot', 'V', 'flower'], ['heavy', 'V', 'sprout']] as const)('the vine stays when a %s ball takes its seed (%s): it is no brick, it still carries a ball, and it is found again after a put-away', (kind, letter, form) => {
    const t = tableOf(['...g..', '......', `.${letter}....`])
    const place = at(2, 1)
    const state = letter === 'v' ? 'vine' : 'tall-vine'
    aimAt(t, place, kind, 'right')
    until(t, () => t.rubble.length > 0, 30)
    expect(t.rubble).toEqual([{ kind: 'seed', form, col: 1 }])
    // The vine is kept in the lane it stands in, and the place its seed stood in is empty.
    const lane = at(2, LANE.col)
    expect(t.wall[place]).toBe(null)
    expect(t.wall[lane]).toEqual({ kind: 'seed', state, browned: false, gone: true })
    expect(t.vinePlace).toBe(lane)
    // The seed is no longer a brick: a finger there is a finger on the bumper, and the ball flies through its place.
    const box = brickBox(place)
    expect(t.targetAt(box.x + 30, box.y + 20)).toBe('bumper')
    expect(t.solid(place)).toBe(false)
    play(t, 60 * 3, () => { if (t.ball.y > 640) Object.assign(t.ball, { vy: 0, y: 640 }) })
    expect(t.pose('vine').get('grow')).toBe(1)
    expect(t.pose('vine').get('wither')).toBe(0)
    // Put away and found again, and saved and loaded: the vine stands, and carries a ball that comes to it.
    for (const found of [t.settled(), new Table(deserialize(JSON.parse(JSON.stringify(serialize(t.toSave())))), 1)]) {
      expect(found.wall[lane]).toEqual({ kind: 'seed', state, browned: false, gone: true })
      expect(found.vinePlace).toBe(lane)
      expect(found.pose('vine').get('grow')).toBe(1)
      Object.assign(found.ball, { state: 'flying', x: LANE.x + 10, y: 400, vx: 0, vy: -500 })
      until(found, () => found.ball.state === 'carried', 40)
      expect(found.ball.state).toBe('carried')
    }
  })

  it('a wall with nothing left on it but a vine whose seed has gone is cleared', () => {
    const t = tableOf(['......', '......', '.v....'])
    aimAt(t, at(2, 1), 'hot', 'right')
    until(t, () => t.finished, 60)
    expect(t.finished).toBe(true)
    expect(t.vinePlace).toBe(at(2, LANE.col))
  })

  it('a finger rattles it like a maraca, and a leaf peeps out and ducks back', () => {
    const t = tableOf(['......', '......', '.s....'])
    const box = brickBox(at(2, 1))
    t.press(box.x + 20, box.y + 20)
    expect(has(t.sounds, v.maraca(0))).toBe(true)
    let leaf = 0
    play(t, 40, () => { leaf = Math.max(leaf, t.pose(`brick:${at(2, 1)}`).get('leaf')) })
    expect(leaf).toBeGreaterThan(0.5)
    play(t, 60 * 2)
    expect(t.pose(`brick:${at(2, 1)}`).get('leaf')).toBeCloseTo(0, 1)
    expect(t.wall[at(2, 1)]).toEqual({ kind: 'seed', state: 'whole', browned: false, gone: false })
  })
})

describe('a sleepy brick', () => {
  it('a plain ball: it yawns and shuffles over one place, away from the ball, and is met where it is drawn all the way', () => {
    const t = tableOf(['......', '......', '..z...'])
    aimAt(t, at(2, 2), 'plain', 'below', 620, -20)
    t.dirty = 'no'
    const heard = until(t, () => t.wall[at(2, 3)] !== null, 30)
    expect(has(heard, v.yawnAah)).toBe(true)
    expect(t.wall[at(2, 2)]).toBe(null)
    expect(t.dirty).toBe('now')
    // Saved in the place it is going to; drawn and met where it is, which starts where it was.
    expect(t.toSave().wall[at(2, 3)]).toEqual({ kind: 'sleepy', state: 'asleep' })
    expect(t.boxOf(at(2, 3)).x).toBeCloseTo(brickBox(at(2, 2)).x, 3)
    const om = until(t, () => false, 60)
    expect(has(om, v.yawnOm)).toBe(true)
    expect(t.boxOf(at(2, 3)).x).toBeCloseTo(brickBox(at(2, 3)).x, 3)
    // From the other side it goes the other way.
    aimAt(t, at(2, 3), 'plain', 'below', 620, 20)
    until(t, () => t.wall[at(2, 2)] !== null, 30)
    expect(t.wall[at(2, 3)]).toBe(null)
  })

  it('with no gap beside it, it leans on its neighbour and snores once', () => {
    const t = tableOf(['......', '......', '..zg..'])
    aimAt(t, at(2, 2), 'plain', 'below', 620, -20)
    const heard = until(t, () => false, 90)
    expect(t.wall[at(2, 2)]?.kind).toBe('sleepy')
    expect(has(heard, v.snore(false))).toBe(true)
    // Neither the end of the row nor the vine's lane is a gap.
    const end = tableOf(['......', '......', '.....z'])
    aimAt(end, at(2, 5), 'plain', 'below', 620, -20)
    play(end, 60)
    expect(end.wall[at(2, 5)]?.kind).toBe('sleepy')
    const lane = tableOf(['......', '.s....', '.z....'])
    aimAt(lane, at(2, 1), 'plain', 'below', 620, 20)
    play(lane, 60)
    expect(lane.wall[at(2, 0)]).toBe(null)
    expect(lane.wall[at(2, 1)]?.kind).toBe('sleepy')
  })

  it('a wet ball wakes it: it shakes itself dry, climbs down the wall and lies down in the rubble', () => {
    const t = tableOf(['......', '..z...', '......'])
    const heard = hit(t, at(1, 2), 'wet')
    expect(has(heard, v.splutter)).toBe(true)
    expect(has(heard, v.shakeDry(2))).toBe(true)
    expect(t.wall[at(1, 2)]).toBe(null)
    expect(t.rubble).toEqual([{ kind: 'sleepy', col: 2 }])
    play(t, 60)
    expect(t.pose('rubble:0').get('fall')).toBe(1)
  })

  it('a hot ball: it snuggles, glows warm and snores twice as deep, and neither yawns nor shuffles until a ball of another kind touches it', () => {
    const t = tableOf(['......', '......', '..z...'])
    const heard = [...hit(t, at(2, 2), 'hot'), ...until(t, () => false, 40)]
    expect(has(heard, v.mmm)).toBe(true)
    expect(has(heard, v.snore(true))).toBe(true)
    expect(v.snore(true)[0].frequency).toBe(v.snore(false)[0].frequency / 2)
    expect(t.wall[at(2, 2)]).toEqual({ kind: 'sleepy', state: 'deep' })
    expect(t.pose(`brick:${at(2, 2)}`).get('warm')).toBe(1)
    // A hot ball again changes nothing.
    hit(t, at(2, 2), 'hot')
    expect(t.wall[at(2, 2)]).toEqual({ kind: 'sleepy', state: 'deep' })
    // A plain ball: it stirs and stays, and yawns and shuffles at the next one.
    const stirred = hit(t, at(2, 2), 'plain', 'below', -20)
    expect(has(stirred, v.snrk)).toBe(true)
    expect(has(stirred, v.yawnAah)).toBe(false)
    expect(t.wall[at(2, 2)]).toEqual({ kind: 'sleepy', state: 'asleep' })
    hit(t, at(2, 2), 'plain', 'below', -20)
    expect(t.wall[at(2, 3)]?.kind).toBe('sleepy')
  })

  it('a heavy ball tips it out of bed: one row down, still asleep, and from the lowest row it can reach into the rubble, snoring', () => {
    const t = tableOf(['..z...', '......', '......'])
    aimAt(t, at(0, 2), 'heavy', 'left')
    const heard = until(t, () => t.wall[at(1, 2)] !== null, 30)
    expect(has(heard, v.bedSpring)).toBe(true)
    expect(t.wall[at(1, 2)]).toEqual({ kind: 'sleepy', state: 'asleep' })
    // It is met where it is drawn while it drops.
    expect(t.boxOf(at(1, 2)).y).toBeLessThan(brickBox(at(0, 2)).y + 6)
    const landed = until(t, () => false, 40)
    expect(has(landed, v.whumpf)).toBe(true)
    expect(t.boxOf(at(1, 2)).y).toBeCloseTo(brickBox(at(1, 2)).y, 3)
    hit(t, at(1, 2), 'heavy', 'left')
    expect(t.wall[at(2, 2)]?.kind).toBe('sleepy')
    aimAt(t, at(2, 2), 'heavy', 'left')
    const last = until(t, () => false, 90)
    expect(t.wall[at(2, 2)]).toBe(null)
    expect(t.rubble).toEqual([{ kind: 'sleepy', col: 2 }])
    expect(has(last, v.snore(false))).toBe(true)
    // With a brick below it, it goes into the rubble too.
    const stacked = tableOf(['..z...', '..g...', '......'])
    hit(stacked, at(0, 2), 'heavy', 'left')
    expect(stacked.wall[at(0, 2)]).toBe(null)
    expect(stacked.rubble).toEqual([{ kind: 'sleepy', col: 2 }])
  })

  it('a finger: one eye opens, it grumbles and turns over', () => {
    const t = tableOf(['......', '......', '..z...'])
    const box = brickBox(at(2, 2))
    t.press(box.x + 20, box.y + 20)
    expect(has(t.sounds, v.hrmf)).toBe(true)
    let eye = 0
    play(t, 30, () => { eye = Math.max(eye, t.pose(`brick:${at(2, 2)}`).get('eye')) })
    expect(eye).toBeGreaterThan(0.3)
    play(t, 60 * 3)
    expect(t.pose(`brick:${at(2, 2)}`).get('turn')).toBeCloseTo(1, 1)
    t.lift()
    t.press(box.x + 20, box.y + 20)
    play(t, 60 * 3)
    expect(t.pose(`brick:${at(2, 2)}`).get('turn')).toBeCloseTo(0, 1)
    expect(t.wall[at(2, 2)]).toEqual({ kind: 'sleepy', state: 'asleep' })
  })
})

describe('the pool', () => {
  const into = (rows: readonly string[], kind: BallKind) => {
    const t = tableOf(rows)
    const box = brickBox(at(1, 2))
    t.kind = kind
    t.look = kind
    Object.assign(t.ball, { state: 'flying', x: box.x + box.w / 2, y: box.y + box.h + 40, vx: 0, vy: -500 })
    const heard = until(t, () => false, 20)
    return { t, heard }
  }

  it('a plain ball rolls through with a small sound and leaves wet tracks', () => {
    const { t, heard } = into(['......', '..p...', 'g.....'], 'plain')
    expect(has(heard, v.plip)).toBe(true)
    expect(t.tracks.length).toBeGreaterThan(2)
    expect(t.wall[at(1, 2)]?.kind).toBe('ice')
    play(t, 60 * 3, () => { if (t.ball.y > 700) Object.assign(t.ball, { vy: 0, y: 700 }) })
    expect(t.tracks.length).toBe(0)
  })

  it('a wet ball splashes it across the bricks on either side: a jelly swells, glass squeaks clean, a sleepy brick wakes; and the pool is gone', () => {
    const jelly = into(['.jpg..', '......', '......'].map((row, i) => (i === 0 ? '......' : row)).length ? ['......', '.gpz..', 'g.....'] : [], 'wet')
    expect(has(jelly.heard, v.splash)).toBe(true)
    expect(jelly.t.wall[at(1, 2)]).toBe(null)
    const later = until(jelly.t, () => false, 30)
    expect(has([...jelly.heard, ...later], v.squeak)).toBe(true)
    expect(has([...jelly.heard, ...later], v.splutter)).toBe(true)
    expect(jelly.t.wall[at(1, 3)]).toBe(null)
    expect(jelly.t.rubble).toEqual([{ kind: 'sleepy', col: 3 }])
    // A jelly beside a pool: only in the top row.
    const t = tableOf(['.jp...', '......', 'g.....'])
    const box = brickBox(at(0, 2))
    t.kind = 'wet'
    t.look = 'wet'
    Object.assign(t.ball, { state: 'flying', x: box.x + box.w / 2, y: box.y + box.h + 40, vx: 0, vy: -500 })
    play(t, 40)
    expect(t.wall[at(0, 1)]).toEqual({ kind: 'jelly', state: 'fresh', swollen: true })
    expect(t.grown[at(0, 1)]).toBe(true)
    expect(t.boxOf(at(0, 1)).h).toBe(WALL.brickH + SWELL)
  })

  it('a hot ball boils it off into a cloud that fogs every glass brick, and the pool is gone', () => {
    const { t, heard } = into(['g.....', '..p..g', '......'], 'hot')
    expect(has(heard, v.pshh)).toBe(true)
    expect(t.wall[at(1, 2)]).toBe(null)
    play(t, 60)
    expect(t.pose('brick:0').get('fog')).toBeGreaterThan(1)
    expect(t.pose(`brick:${at(1, 5)}`).get('fog')).toBeGreaterThan(1)
    play(t, 60 * 5, () => { if (t.ball.y > 700) Object.assign(t.ball, { vy: 0, y: 700 }) })
    expect(t.pose('brick:0').get('fog')).toBe(0)
  })

  it('a heavy ball lands in it with a great splash that soaks the three large toys, and the pool stays', () => {
    const { t, heard } = into(['......', '..p...', 'g.....'], 'heavy')
    expect(has(heard, v.sploosh)).toBe(true)
    expect(t.wall[at(1, 2)]?.kind).toBe('ice')
    play(t, 10)
    for (const toy of ['dragon', 'walrus', 'elephant'] as const) expect(t.pose(toy).get('soak')).toBeGreaterThan(0)
  })

  it('answers a ball once as it comes in, and again only when it has left and come back', () => {
    const { t } = into(['......', '..p...', 'g.....'], 'plain')
    const box = brickBox(at(1, 2))
    Object.assign(t.ball, { state: 'flying', x: box.x + box.w / 2, y: box.y + box.h + 40, vx: 0, vy: -420 })
    const heard = until(t, () => t.ball.y > box.y + box.h + 60, 200)
    expect(heard.filter((tone) => tone === v.plip[0]).length).toBe(2)
  })
})

describe('what the large toys love and cannot stand', () => {
  const max = (t: Table, who: 'dragon' | 'walrus' | 'elephant', channel: string, frames = 90) => {
    let most = 0
    play(t, frames, () => { most = Math.max(most, Math.abs(t.pose(who).get(channel))) })
    return most
  }

  it('the dragon puffs one smoke ring for a thing that breaks or pops', () => {
    const t = tableOf(['......', '......', '..c...'])
    hit(t, at(2, 2), 'plain')
    expect(max(t, 'dragon', 'ring')).toBeGreaterThan(0.3)
    const seed = tableOf(['......', '......', '.s....'])
    aimAt(seed, at(2, 1), 'hot', 'right')
    expect(max(seed, 'dragon', 'ring')).toBeGreaterThan(0.3)
  })

  it('the elephant folds its ears over its eyes when glass falls in shards, and flaps them for a boom', () => {
    const t = tableOf(['......', '......', '..c...'])
    hit(t, at(2, 2), 'plain')
    expect(max(t, 'elephant', 'cover')).toBeGreaterThan(0.5)
    const drum = tableOf(['g.....', '......', '......'], { bumper: BUMPER.maxX })
    Object.assign(drum.ball, { state: 'flying', x: 400, y: 700, vx: 0, vy: 100 })
    expect(max(drum, 'elephant', 'ears', 60)).toBeGreaterThan(0.2)
  })

  it('the walrus wallows in its tub for anything wet, with a snort, and a hot ball going by sends it under to its eyes with its whiskers curled', () => {
    const wet = tableOf(['g.....', '......', '......'], { bumper: BUMPER.maxX, ball: 'wet' })
    Object.assign(wet.ball, { state: 'flying', x: 500, y: 700, vx: 0, vy: 100 })
    const splashed = until(wet, () => false, 80)
    expect(has(splashed, v.snort)).toBe(true)
    expect(has(splashed, v.slosh)).toBe(true)
    const again = tableOf(['g.....', '......', '......'], { bumper: BUMPER.maxX, ball: 'wet' })
    Object.assign(again.ball, { state: 'flying', x: 500, y: 700, vx: 0, vy: 100 })
    expect(max(again, 'walrus', 'wallow', 80)).toBeGreaterThan(0.3)
    const hot = tableOf(['g.....', '......', '......'], { bumper: BUMPER.maxX, ball: 'hot' })
    Object.assign(hot.ball, { state: 'flying', x: FIELD.left + 200, y: 700, vx: -200, vy: -300 })
    const heard = until(hot, () => false, 60)
    expect(has(heard, v.under)).toBe(true)
    expect(hot.pose('walrus').get('sink')).toBeGreaterThan(0.3)
    expect(hot.pose('walrus').get('whisk')).toBeLessThan(-0.3)
  })

  it('a wet ball going by puts the dragon\'s flame out, and it goes cross-eyed lighting it again', () => {
    const t = tableOf(['.....g', '......', '......'], { ball: 'wet' })
    expect(t.pose('dragon').get('flame')).toBe(1)
    Object.assign(t.ball, { state: 'flying', x: FIELD.left + 200, y: 180, vx: -200, vy: 0 })
    const heard = until(t, () => false, 40)
    expect(has(heard, v.fizzle)).toBe(true)
    expect(t.pose('dragon').get('flame')).toBeLessThan(0.6)
    expect(t.pose('dragon').get('cross')).toBeGreaterThan(0.5)
    play(t, 60 * 3, () => { if (t.ball.y > 700) Object.assign(t.ball, { vy: 0, y: 700 }) })
    expect(t.pose('dragon').get('flame')).toBeCloseTo(1, 1)
    expect(t.pose('dragon').get('cross')).toBeCloseTo(0, 1)
  })

  it('a finger on a toy is a poke, which it answers as itself and which changes nothing on the table', () => {
    const t = fresh('all', 3)
    const before = JSON.stringify(serialize(t.toSave()))
    for (const [toy, voice] of [['dragon', v.hic], ['walrus', v.twang], ['elephant', v.toot]] as const) {
      t.sounds = []
      expect(t.press(TOYS[toy].x + 100, TOYS[toy].y + 200)).toBe(toy)
      expect(has(t.sounds, voice)).toBe(true)
      t.lift()
      play(t, 60)
    }
    t.sounds = []
    expect(t.press(t.ladybirdX, 54)).toBe('ladybird')
    expect(has(t.sounds, v.whirr)).toBe(true)
    const from = t.ladybirdX
    play(t, 60)
    expect(Math.abs(t.ladybirdX - from)).toBeGreaterThan(80)
    expect(JSON.stringify(serialize(t.toSave()))).toBe(before)
    expect(t.ball.state).toBe('resting')
  })
})

describe('the bell', () => {
  it.each([['plain', v.bell], ['wet', v.bellWet], ['hot', v.bellHot], ['heavy', v.gong]] as const)('rings for a %s ball in that ball\'s manner, and the folded wall rustles and stays folded', (kind, voice) => {
    const t = tableOf(['g.....', '......', '......'])
    t.kind = kind
    t.look = kind
    Object.assign(t.ball, { state: 'flying', x: BELL.x, y: BELL.y + 90, vx: 0, vy: -500 })
    const heard = until(t, () => false, 30)
    expect(has(heard, voice)).toBe(true)
    expect(has(heard, v.rustle)).toBe(true)
    expect(t.wall[0]?.kind).toBe('glass')
    expect(t.finished).toBe(false)
  })

  it('rings for a finger with a small clear note', () => {
    const t = fresh()
    expect(t.press(BELL.x, BELL.y)).toBe('bell')
    expect(has(t.sounds, v.ting)).toBe(true)
    expect(t.finished).toBe(false)
  })
})

describe('a wall, from its unfolding to its last brick', () => {
  /** A wall with one cracked brick left, and the ball on its way to it. */
  const lastBrick = (position = 'glass', rubble: Fallen[] = [{ kind: 'glass', col: 2 }]) => {
    const t = tableOf(['......', '......', '..c...'], { position, rubble })
    aimAt(t, at(2, 2), 'plain')
    t.dirty = 'no'
    return t
  }

  it('the hit that takes the last brick starts the ending and saves it at once: finished, the brick in the rubble, the position one place up', () => {
    const t = lastBrick('jelly')
    until(t, () => t.finished, 30)
    expect(t.finished).toBe(true)
    expect(t.dirty).toBe('now')
    const save = t.toSave()
    expect(save.finished).toBe(true)
    expect(save.position).toBe('ice')
    expect(save.rubble).toEqual([{ kind: 'glass', col: 2 }, { kind: 'glass', col: 2 }])
    expect(save.wall.every((brick) => brick === null)).toBe(true)
    // The save was made while the brick was still on its way to the rubble.
    expect(t.pose('rubble:1').get('fall')).toBeLessThan(0.5)
    expect(t.busy).toBe(true)
  })

  it('moves the position one place up for every wall cleared, stays at the last place, and never moves inside a wall', () => {
    for (let index = 0; index < LADDER.length; index++) {
      const t = lastBrick(LADDER[index])
      until(t, () => t.finished, 30)
      expect(t.position).toBe(LADDER[Math.min(LADDER.length - 1, index + 1)])
    }
    const half = tableOf(['gg....', '......', '..c...'], { position: 'ice' })
    hit(half, at(2, 2), 'plain')
    expect(half.position).toBe('ice')
    expect(half.finished).toBe(false)
  })

  it('a wall whose last brick melts into a pool is cleared too, and the pool goes on answering', () => {
    const t = tableOf(['......', '......', '..i...'], { rubble: [{ kind: 'glass', col: 2 }] })
    hit(t, at(2, 2), 'hot')
    expect(t.finished).toBe(true)
    expect(t.wall[at(2, 2)]?.kind).toBe('ice')
    const box = brickBox(at(2, 2))
    Object.assign(t.ball, { state: 'flying', x: box.x + 40, y: box.y + box.h + 30, vx: 0, vy: -400 })
    t.kind = 'plain'
    expect(has(until(t, () => false, 20), v.plip)).toBe(true)
  })

  it('the ending plays its beats: the faces look up in the order they fell, each toy answers, the folded wall lifts its corner and keeps it, the bell swings once', () => {
    const t = lastBrick('glass', [{ kind: 'glass', col: 2 }, { kind: 'jelly', form: 'splat', col: 2 }])
    until(t, () => t.finished, 30)
    const looked: number[] = []
    const heard = until(t, () => {
      for (let heap = 0; heap < 3; heap++) if (!looked.includes(heap) && t.pose(`rubble:${heap}`).get('look') > 0.5) looked.push(heap)
      return !t.busy
    }, 60 * 9)
    expect(looked).toEqual([0, 1, 2])
    expect(t.busy).toBe(false)
    expect(t.time).toBeLessThan(7)
    expect(has(heard, v.ting)).toBe(true)
    expect(has(heard, v.puff)).toBe(true)
    play(t, 60 * 20)
    expect(t.pose('folded').get('lift')).toBeCloseTo(1, 1)
    expect(t.finished).toBe(true)
  })

  it('a touch ends the ending at once, silently, with everything where it was going, and is then an ordinary touch', () => {
    const t = lastBrick()
    until(t, () => t.finished, 30)
    play(t, 30)
    t.sounds = []
    expect(t.press(500, 720)).toBe('bumper')
    expect(t.busy).toBe(false)
    // Only the bumper's own creak sounds: none of the scene's notes.
    expect(t.sounds).toEqual([...v.creak])
    expect(t.pose('folded').get('lift')).toBe(1)
    expect(t.pose('rubble:0').get('look')).toBe(1)
    expect(t.bumperHeld).toBe(true)
    const rest = until(t, () => false, 60 * 6)
    expect(has(rest, v.ting)).toBe(false)
    expect(has(rest, v.rustle)).toBe(false)
  })

  it('the finished scene stays as long as the child likes: nothing starts with no touch, and the bumper, the gates and the toys still work', () => {
    const t = lastBrick()
    until(t, () => t.finished, 30)
    play(t, 60 * 30, () => { if (t.ball.state === 'flying' && t.ball.y > 600) t.press(t.ball.x, 720) })
    t.lift()
    until(t, () => t.ball.state === 'resting' || t.ball.vx === 0, 600)
    const before = JSON.stringify(serialize(t.toSave()))
    play(t, 60 * 60)
    expect(JSON.stringify(serialize(t.toSave()))).toBe(before)
    expect(t.finished).toBe(true)
  })

  it('the flight that took the last brick rings the bell as a bell and unfolds nothing', () => {
    const t = lastBrick()
    until(t, () => t.finished, 30)
    Object.assign(t.ball, { state: 'flying', x: BELL.x, y: BELL.y + 90, vx: 0, vy: -500 })
    const heard = until(t, () => false, 30)
    expect(has(heard, v.bell)).toBe(true)
    expect(t.finished).toBe(true)
    expect(t.wall.every((brick) => brick === null)).toBe(true)
  })

  it('a ball the child has flicked or sprung since the last brick fell unfolds the next wall at the bell', () => {
    const t = lastBrick('jelly')
    until(t, () => t.finished, 30)
    t.press(t.bumperX, 720)
    until(t, () => t.ball.state === 'resting' || (t.slide(t.ball.x), false), 600)
    t.lift()
    until(t, () => t.ball.state === 'flying', 30)
    Object.assign(t.ball, { x: BELL.x, y: BELL.y + 90, vx: 0, vy: -500 })
    until(t, () => !t.finished, 30)
    expect(t.finished).toBe(false)
    expect(t.wall).toEqual(layWall('ice', 1))
  })

  it('a finger on the bell unfolds the next wall, laid out from the position as it stands, and saves it as the unfolding starts', () => {
    const t = lastBrick('jelly')
    until(t, () => t.finished, 30)
    play(t, 60 * 7)
    t.dirty = 'no'
    t.sounds = []
    t.press(BELL.x, BELL.y)
    expect(has(t.sounds, v.ting)).toBe(true)
    expect(t.dirty).toBe('now')
    const save = t.toSave()
    expect(save.finished).toBe(false)
    expect(save.rubble).toEqual([])
    expect(save.wall).toEqual(layWall('ice', 1))
    expect(save.position).toBe('ice')
    // On the screen the bricks stand up one by one, each with its own note, low to high.
    expect(t.up.some(Boolean)).toBe(false)
    expect(t.falls.length).toBe(2)
    const notes: number[] = []
    until(t, () => {
      for (const tone of t.sounds) if (tone.decay === 0.22) notes.push(tone.frequency)
      return !t.busy
    }, 60 * 6)
    expect(t.up.filter(Boolean).length).toBe(layWall('ice', 1).filter((brick) => brick !== null).length)
    expect(t.falls.length).toBe(0)
    expect(t.pose('folded').get('lift')).toBeCloseTo(0, 1)
    expect(t.time).toBeLessThan(20)
  })

  it('a brick whose place the ball is in stands up when the ball has left it, and a touch during the unfolding lands every brick', () => {
    const t = lastBrick('glass')
    until(t, () => t.finished, 30)
    t.press(BELL.x, BELL.y)
    t.lift()
    const box = brickBox(at(1, 3))
    Object.assign(t.ball, { state: 'flying', x: box.x + 30, y: box.y + 20, vx: 0, vy: 0 })
    t.press(TOYS.walrus.x + 100, TOYS.walrus.y + 200)
    expect(t.busy).toBe(false)
    expect(t.up[at(1, 3)]).toBe(false)
    const bricks = t.wall.filter((brick) => brick !== null).length
    expect(t.wall[at(1, 3)]).not.toBe(null)
    expect(t.up.filter(Boolean).length).toBe(bricks - 1)
    play(t, 60 * 3)
    expect(t.up[at(1, 3)]).toBe(true)
  })

  it('lays the last wall out afresh each time', () => {
    const seen = new Set<string>()
    const t = lastBrick('all')
    for (let round = 0; round < 4; round++) {
      until(t, () => t.finished, 60)
      t.press(BELL.x, BELL.y)
      t.lift()
      play(t, 60 * 5)
      seen.add(JSON.stringify(t.wall))
      expect(t.position).toBe('all')
      for (let place = 0; place < PLACES; place++) t.wall[place] = null
      t.wall[at(2, 2)] = { kind: 'glass', state: 'cracked' }
      t.up[at(2, 2)] = true
      aimAt(t, at(2, 2), 'plain')
    }
    expect(seen.size).toBe(4)
  })
})

describe('the first showings', () => {
  it('nothing is shown before the first press of a visit, however long the table is left, and nothing starts under a finger that is down', () => {
    const t = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
    play(t, 60 * 30)
    expect(t.busy).toBe(false)
    expect(t.toSave().shown).toEqual([])
    // A finger that lands and stays: on the bumper, sliding or still, and on a toy.
    for (const [x, y] of [[500, 720], [TOYS.elephant.x + 100, TOYS.elephant.y + 200]]) {
      t.press(x, y)
      play(t, 60 * 6, (frame) => t.slide(400 + frame))
      expect(t.busy).toBe(false)
      expect(t.toSave().shown).toEqual([])
      t.takenAway()
    }
    // It counts from the lift.
    play(t, Math.floor(SHOWING_AFTER * 60) - 2)
    expect(t.busy).toBe(false)
    play(t, 6)
    expect(t.busy).toBe(true)
    // A game that is put away and found again is a new visit: it waits for a press again.
    const again = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
    arrive(again)
    play(again, 30)
    const found = again.settled()
    play(found, 60 * 30)
    expect(found.busy).toBe(false)
    expect(found.toSave().shown).toEqual([])
  })

  it('the hot gate is shown once, two seconds after the last touch while a wall with ice stands, and saved as it starts', () => {
    const t = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
    arrive(t)
    play(t, Math.floor(SHOWING_AFTER * 60) - 2)
    expect(t.busy).toBe(false)
    expect(t.toSave().shown).toEqual([])
    t.dirty = 'no'
    const heard = until(t, () => t.busy, 10)
    expect(t.toSave().shown).toEqual(['hot-gate'])
    expect(t.dirty).toBe('now')
    expect(has(heard, v.cough)).toBe(true)
    // The spare ball goes out, round the dragon's feet and back in; it melts nothing.
    let far = 0
    until(t, () => {
      far = Math.max(far, t.pose('dragon').get('spare'))
      return !t.busy
    }, 60 * 5)
    expect(far).toBeGreaterThan(0.8)
    expect(t.pose('dragon').get('spare')).toBe(0)
    expect(t.wall).toEqual(layWall('ice', 1))
    expect(t.kind).toBe('plain')
    // Never again.
    play(t, 60 * 30)
    expect(t.busy).toBe(false)
    const again = new Table(deserialize(JSON.parse(JSON.stringify(serialize(t.toSave())))), 1)
    play(again, 60 * 30)
    expect(again.pose('dragon').get('spare')).toBe(0)
  })

  it('a touch puts a showing off, and a game put away before it starts plays nothing on load until its own two seconds have passed', () => {
    const t = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
    arrive(t)
    play(t, 100)
    t.press(TOYS.elephant.x + 100, TOYS.elephant.y + 200)
    t.lift()
    play(t, 100)
    expect(t.toSave().shown).toEqual([])
    const left = t.settled()
    expect(left.busy).toBe(false)
    arrive(left)
    play(left, 100)
    expect(left.busy).toBe(false)
    play(left, 30)
    expect(left.busy).toBe(true)
  })

  it('the wet gate is shown the same way for the first wall with a sleepy brick, and the elephant\'s gate is never shown', () => {
    const t = new Table({ ...freshSave(null), position: 'sleepy', wall: layWall('sleepy', 1), shown: ['hot-gate'] }, 1)
    arrive(t)
    const heard = until(t, () => t.shown.has('wet-gate'), 60 * 3)
    expect(t.toSave().shown).toEqual(['hot-gate', 'wet-gate'])
    let nose = 0
    const rest = until(t, () => {
      nose = Math.max(nose, t.pose('walrus').get('spare'))
      return !t.busy
    }, 60 * 5)
    expect(has([...heard, ...rest], v.drip)).toBe(true)
    expect(has([...heard, ...rest], v.snort)).toBe(true)
    expect(nose).toBeGreaterThan(0.45)
    play(t, 60 * 30)
    expect(t.toSave().shown).toEqual(['hot-gate', 'wet-gate'])
    expect(t.wall).toEqual(layWall('sleepy', 1))
  })

  it('a wall with both shows one, then the other after its own two seconds; a touch ends a showing silently', () => {
    const t = new Table({ ...freshSave(null), position: 'sleepy', wall: layWall('sleepy', 1) }, 1)
    arrive(t)
    until(t, () => t.busy, 60 * 3)
    expect([...t.shown]).toEqual(['hot-gate'])
    t.sounds = []
    t.press(TOYS.elephant.x + 100, TOYS.elephant.y + 200)
    expect(t.busy).toBe(false)
    expect(t.pose('dragon').get('spare')).toBe(0)
    expect(has(t.sounds, v.gulp)).toBe(false)
    t.lift()
    until(t, () => t.busy, 60 * 3)
    expect([...t.shown]).toEqual(['hot-gate', 'wet-gate'])
  })

  it('no wall without ice or a sleepy brick shows anything', () => {
    for (const position of ['glass', 'jelly', 'seed']) {
      const t = new Table({ ...freshSave(null), position, wall: layWall(position, 1) }, 1)
      arrive(t)
      play(t, 60 * 10)
      expect(t.toSave().shown, position).toEqual([])
    }
  })
})

describe('the grown-up\'s corner', () => {
  it('answers nothing, ends no scene, puts no showing off and is no first press of a visit', () => {
    const cold = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
    cold.press(1170, 10, true)
    cold.lift()
    play(cold, 60 * 10)
    expect(cold.busy).toBe(false)
    const t = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
    arrive(t)
    play(t, 100)
    t.sounds = []
    expect(t.press(1170, 10, true)).toBe('corner')
    expect(t.sounds).toEqual([])
    expect(t.bumperHeld).toBe(false)
    t.lift()
    play(t, 30)
    // The two seconds were not started again.
    expect(t.busy).toBe(true)
    t.press(1170, 10, true)
    expect(t.busy).toBe(true)
  })
})

describe('found as left', () => {
  /** Every state the table can be put away in, each reached by play. */
  const states: Record<string, () => Table> = {
    'a first visit': () => fresh('all', 7),
    'the ball in the air': () => {
      const t = fresh('ice')
      tapBumper(t)
      play(t, 12)
      return t
    },
    'a finger on the bumper': () => {
      const t = fresh('seed')
      t.press(400, 720)
      play(t, 20)
      return t
    },
    'a brick cracked': () => {
      const t = tableOf(['gg....', '......', '..g...'])
      hit(t, at(2, 2), 'plain')
      return t
    },
    'a brick falling': () => {
      const t = tableOf(['gg....', '......', '..c...'])
      aimAt(t, at(2, 2), 'plain')
      until(t, () => t.rubble.length > 0, 30)
      return t
    },
    'a sleepy brick shuffling': () => {
      const t = tableOf(['g.....', '......', '..z...'])
      aimAt(t, at(2, 2), 'plain', 'below', 620, -20)
      until(t, () => t.wall[at(2, 3)] !== null, 30)
      return t
    },
    'the clearing': () => {
      const t = tableOf(['......', '......', '..c...'], { position: 'ice', rubble: [{ kind: 'jelly', form: 'syrup', col: 2 }] })
      aimAt(t, at(2, 2), 'plain')
      until(t, () => t.finished, 30)
      play(t, 20)
      return t
    },
    'the unfolding': () => {
      const t = tableOf(['......', '......', '......'], { position: 'all', finished: true, rubble: [{ kind: 'glass', col: 2 }] })
      t.press(BELL.x, BELL.y)
      t.lift()
      play(t, 50)
      return t
    },
    'a showing': () => {
      const t = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
      arrive(t)
      play(t, 150)
      expect(t.busy).toBe(true)
      return t
    },
    'a vine whose seed has gone': () => {
      const t = tableOf(['...g..', '......', '.V....'])
      aimAt(t, at(2, 1), 'hot', 'right')
      until(t, () => t.rubble.length > 0, 30)
      return t
    },
    'a sleepy brick turned over, the ladybird flown along, and the faces in the tray looking up': () => {
      const t = tableOf(['...z..', '......', '..c...'], { rubble: [{ kind: 'glass', col: 4 }] })
      const box = brickBox(at(0, 3))
      t.press(box.x + 30, box.y + 20)
      t.lift()
      play(t, 40)
      expect(t.pose(`brick:${at(0, 3)}`).get('turn')).toBeGreaterThan(0.5)
      t.press(t.ladybirdX, LADYBIRD.y)
      t.lift()
      play(t, 90)
      expect(t.ladybirdX).not.toBe((LADYBIRD.fromX + LADYBIRD.toX) / 2)
      t.pose('rubble:0').set('look', 1, 0)
      return t
    },
    'the ball in a vine': () => {
      const t = tableOf(['.g....', '......', '.s....'])
      aimAt(t, at(2, 1), 'wet')
      until(t, () => t.ball.state === 'carried', 30)
      return t
    },
    'the ball frozen to the ice': () => {
      const t = tableOf(['g.....', '......', '..i...'])
      aimAt(t, at(2, 2), 'wet')
      until(t, () => t.ball.state === 'held', 30)
      return t
    },
    'a pool and a sagged brick, with a hot ball': () => {
      const t = tableOf(['......', '..g...', '..i...'])
      hit(t, at(2, 2), 'hot')
      hit(t, at(1, 2), 'hot')
      return t
    },
    'a heavy ball flicked from a rest off the middle, in the air': () => {
      const t = new Table({ ...freshSave(null), wall: wallOf(['g.....', '......', '......']), shown: ['hot-gate', 'wet-gate'], ball: 'heavy', seat: 0.6 }, 1)
      expect(t.ball.x - t.bumperX).toBeGreaterThan(30)
      tapBumper(t)
      play(t, 20)
      expect(t.ball.state).toBe('flying')
      return t
    },
    'a heavy ball flicked from a rest off the middle, still on the bumper': () => {
      const t = new Table({ ...freshSave(null), wall: wallOf(['g.....', '......', '......']), shown: ['hot-gate', 'wet-gate'], ball: 'heavy', seat: 0.6 }, 1)
      tapBumper(t)
      play(t, 3)
      expect(t.ball.state).toBe('caught')
      return t
    },
    'a heavy ball deep in a swollen jelly': () => {
      const t = tableOf(['..J...', '......', 'g.....'])
      aimAt(t, at(0, 2), 'heavy')
      until(t, () => t.ball.state === 'held', 40)
      return t
    },
  }
  for (const toy of ['dragon', 'walrus', 'elephant'] as const) {
    states[`the ball in the ${toy}'s gate`] = () => {
      const t = fresh('sleepy')
      const gate = GATES[toy]
      Object.assign(t.ball, { state: 'flying', x: gate.side < 0 ? FIELD.left + 60 : FIELD.right - 60, y: (gate.y0 + gate.y1) / 2, vx: gate.side * 500, vy: 0 })
      play(t, 20)
      return t
    }
  }

  /** What a table shows: every pose that is not at rest at zero, the ball, the bricks and the rubble. */
  const shows = (t: Table) => ({
    save: serialize(t.toSave()),
    ball: { ...t.ball, roll: 0 },
    look: t.look,
    up: [...t.up],
    grown: [...t.grown],
    falls: t.falls.length,
    busy: t.busy,
    held: t.bumperHeld,
    tracks: t.tracks.length,
    boxes: [...t.wall.keys()].map((place) => t.boxOf(place)),
    lift: t.pose('folded').get('lift'),
    fallen: t.falls.map((_, heap) => t.pose(`rubble:${heap}`).get('fall')),
    spare: [t.pose('dragon').get('spare'), t.pose('walrus').get('spare')],
    frost: t.pose('ball').get('frost'),
    // What is named as lost: the way a sleepy brick is turned, the ladybird's place, and the upward look of the faces in the tray.
    turned: [...t.wall.keys()].map((place) => t.pose(`brick:${place}`).get('turn')),
    ladybird: t.ladybirdX,
    looks: t.falls.map((_, heap) => t.pose(`rubble:${heap}`).get('look')),
    spots: t.spots.map((spot) => ({ ...spot })),
  })

  it.each(Object.keys(states))('%s: put away and returned is the same as saved and loaded, with the ball at rest on the bumper and nothing playing', (name) => {
    const t = states[name]()
    const parked = t.settled()
    const loaded = new Table(deserialize(JSON.parse(JSON.stringify(serialize(t.toSave())))), 99)
    expect(shows(parked)).toEqual(shows(loaded))
    expect(parked.ball.state).toBe('resting')
    // The ball lies on the bumper where it lay, or on its middle if it was in the air.
    expect(parked.ball.x).toBe(loaded.ball.x)
    expect(parked.ball.x).toBeCloseTo(t.ball.state === 'resting' || t.ball.state === 'caught' ? t.ball.x : parked.bumperX, 0)
    expect(parked.look).toBe(parked.kind)
    expect(parked.busy).toBe(false)
    expect(parked.bumperHeld).toBe(false)
    expect(parked.sounds).toEqual([])
    expect(parked.up).toEqual(parked.wall.map((brick) => brick !== null && !(brick.kind === 'seed' && brick.gone)))
    // What is not stored is gone, the same for a game that was parked and one that was loaded.
    expect(shows(parked).turned.every((turn) => turn === 0)).toBe(true)
    expect(parked.ladybirdX).toBe((LADYBIRD.fromX + LADYBIRD.toX) / 2)
    expect(shows(parked).looks.every((look) => look === 0)).toBe(true)
    // Nothing starts or sounds on load, and the ball is not flicked by anything but a finger.
    const first = until(parked, () => false, Math.floor(SHOWING_AFTER * 60) - 5)
    expect(first).toEqual([])
    expect(parked.ball.state).toBe('resting')
    expect(serialize(parked.toSave())).toEqual(serialize(loaded.toSave()))
  })

  it('a put-away in the middle of the ending or of the unfolding loses nothing and replays nothing', () => {
    const ending = states['the clearing']().settled()
    expect(ending.finished).toBe(true)
    expect(ending.position).toBe('sleepy')
    expect(ending.rubble.length).toBe(2)
    expect(ending.pose('folded').get('lift')).toBe(1)
    play(ending, 60 * 10)
    expect(ending.busy).toBe(false)
    const unfolding = states['the unfolding']().settled()
    expect(unfolding.finished).toBe(false)
    expect(unfolding.rubble).toEqual([])
    expect(unfolding.up.filter(Boolean).length).toBe(unfolding.wall.filter((brick) => brick !== null).length)
    expect(unfolding.up.filter(Boolean).length).toBeGreaterThan(5)
  })

  it('the kind of the ball, the pool, the vine, the icicle and what lies in the rubble are all as they were left', () => {
    const t = tableOf(['.J....', '.v.pZ.', '..d...'], { ball: 'heavy', rubble: [{ kind: 'seed', form: 'sprout', col: 2 }, { kind: 'jelly', form: 'syrup', col: 2 }] })
    const left = t.settled()
    expect(left.kind).toBe('heavy')
    expect(left.wall).toEqual(t.wall)
    expect(left.rubble).toEqual(t.rubble)
    expect(left.grown[at(0, 1)]).toBe(true)
    expect(left.pose('vine').get('grow')).toBe(1)
    expect(left.pose(`brick:${at(1, 3)}`).get('melt')).toBe(1)
    expect(left.pose(`brick:${at(1, 4)}`).get('warm')).toBe(1)
    expect(left.pose(`brick:${at(2, 2)}`).get('sag')).toBe(1)
    expect(left.pose('rubble:0').get('sprout')).toBe(1)
  })
})

describe('the child sets the tempo', () => {
  it.each(LADDER.map((position) => [position]))('%s: with no touch for a minute nothing breaks, nothing unfolds and no field of the save changes', (position) => {
    const t = fresh(position, 5)
    const before = JSON.stringify(serialize(t.toSave()))
    const heard = until(t, () => false, 60 * 60)
    expect(JSON.stringify(serialize(t.toSave()))).toBe(before)
    expect(t.ball.state).toBe('resting')
    expect(heard).toEqual([])
  })

  it('a ball left alone after a flick comes to the bumper or the drum, and from then on a minute changes nothing', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const position = LADDER[seed % LADDER.length]
      const t = fresh(position, seed)
      t.kind = KINDS[seed % 4]
      t.look = t.kind
      t.press(t.bumperX + (seed % 5) * 40 - 80, 720)
      play(t, 10)
      t.slide(t.bumperX + (seed % 3) * 200 - 200)
      play(t, 2)
      t.lift()
      // Left alone: within half a minute the ball rests on the bumper or bounces in place on the drum.
      let settledFor = 0
      until(t, () => {
        const still = t.ball.state === 'resting' || (t.ball.state === 'flying' && t.ball.vx === 0 && t.ball.y > BUMPER.top - 220)
        settledFor = still ? settledFor + 1 : 0
        return settledFor > 60 * 4
      }, 60 * 40)
      expect(settledFor, `${position} ${t.kind} seed ${seed}`).toBeGreaterThan(60 * 4)
      play(t, 60 * 8)
      const before = JSON.stringify(serialize(t.toSave()))
      play(t, 60 * 60)
      expect(JSON.stringify(serialize(t.toSave())), `${position} seed ${seed}`).toBe(before)
    }
  }, 60_000)

  it('shows nothing of where the child is: the save holds no count of bricks, walls or hits', () => {
    const save = serialize(fresh('all', 3).toSave())
    expect(Object.keys(save).sort()).toEqual(['ball', 'bumper', 'finished', 'position', 'rubble', 'seat', 'shown', 'v', 'wall'])
    for (const value of Object.values(save)) if (typeof value === 'number') expect([save.v, save.bumper, save.seat]).toContain(value)
  })

  it('what an idle child is shown is one thing: a flick of the resting ball, a slide under the ball, or the bell over a cleared wall', () => {
    const t = fresh()
    expect(t.want).toBe('flick')
    tapBumper(t)
    expect(t.want).toBe('slide')
    const done = tableOf(['......', '......', '......'], { finished: true })
    expect(done.want).toBe('bell')
  })
})

describe('the rows of the wall', () => {
  it('a vine on a seed in the top row still lets the ball go under the roof', () => {
    for (let row = 0; row < WALL.rows; row++) expect(Math.max(LANE.top, vineTop(row)) - BALL_R).toBeGreaterThan(FIELD.roof)
    expect(rowOf(at(2, 1))).toBe(2)
  })
})

describe('a ball at rest', () => {
  /** Whether the ball is in a standing brick or in the bell by more than a hair. */
  const inSomething = (t: Table): boolean => {
    const { x, y } = t.ball
    if (Math.hypot(x - BELL.x, y - BELL.y) < BALL_R + BELL.r - 1) return true
    for (let place = 0; place < PLACES; place++) {
      if (!t.solid(place)) continue
      const box = t.boxOf(place)
      if (Math.hypot(x - Math.max(box.x, Math.min(box.x + box.w, x)), y - Math.max(box.y, Math.min(box.y + box.h, y))) < BALL_R - 1) return true
    }
    return false
  }
  const voiced = (sounds: readonly v.Sound[]) => new Set(sounds.flatMap((sound) => sound.map((tone) => JSON.stringify(tone))))
  /** What may sound while a ball at rest is brought down: a large toy that cannot stand this ball going by it, the toy that fetches it, and the bumper it is set on. */
  const ALLOWED = voiced([...[...answers.dragonWet(), ...answers.walrusHot()].map((beat) => beat.notes ?? []), v.tailWhip, v.tailCurl, v.trunkStretch, v.trunkHold, v.pfff, v.groan])
  /** One turn of the rumble of a rolling ball, which is made afresh at each speed. */
  const isRumble = (tone: v.Tone) => tone.attack === v.rollTick(0)[0].attack
  type Outcome = { how: 'rolled' | 'fetched' | 'fell'; by: string | null; rumbles: number; heard: v.Tone[]; seconds: number }
  /**
   * Plays a ball that is in the air over the wall until it is where the bumper can reach it: under the wall or at
   * rest on the bumper. At every step of the ball it is in nothing unless a toy holds it lifted, and while it
   * rolls by itself it never rises. Nothing sounds but what may, and the wall is as it was.
   */
  const bringDown = (t: Table, where: string, limit = 12): Outcome => {
    const wall = JSON.stringify(t.wall)
    const out: Outcome = { how: 'fell', by: null, rumbles: 0, heard: [], seconds: 0 }
    let lastY = t.ball.y
    for (let step = 0; step < limit / STEP && t.ball.state !== 'resting' && !(t.ball.state === 'flying' && t.ball.y >= UNDER_WALL - 1); step++) {
      t.step(STEP)
      out.seconds += STEP
      if (t.rolling) {
        out.how = 'rolled'
        if (t.ball.y < lastY - 1e-6) throw new Error(`${where}: the ball rolled uphill by itself, from ${lastY.toFixed(1)} to ${t.ball.y.toFixed(1)} at ${t.ball.x.toFixed(1)}`)
      }
      if (t.fetching) {
        out.how = 'fetched'
        out.by = t.fetching
        // Until the toy has hold of it the ball does not stir.
        if (!t.lifted && t.ball.y !== lastY) throw new Error(`${where}: the ball moved before the ${t.fetching} had hold of it`)
      }
      if (!t.lifted && inSomething(t)) throw new Error(`${where}: the ball passed through something at ${Math.round(t.ball.x)}, ${Math.round(t.ball.y)}`)
      lastY = t.ball.y
      out.rumbles += t.sounds.filter(isRumble).length
      out.heard.push(...t.sounds)
      t.sounds = []
    }
    expect(t.ball.state === 'resting' || t.ball.y >= UNDER_WALL - 1, where).toBe(true)
    expect(out.heard.filter((tone) => !isRumble(tone) && !ALLOWED.has(JSON.stringify(tone))), where).toEqual([])
    expect(JSON.stringify(t.wall), where).toBe(wall)
    expect(t.rubble, where).toEqual([])
    if (out.how === 'rolled') expect(out.rumbles, where).toBeGreaterThan(0)
    if (out.how === 'fetched') {
      // Set on the middle of the bumper, at rest, by the toy that came for it.
      expect(t.ball.state, where).toBe('resting')
      expect(t.ball.x, where).toBeCloseTo(t.bumperX, 3)
      expect(has(out.heard, out.by === 'dragon' ? v.tailWhip : v.trunkStretch), where).toBe(true)
      expect(has(out.heard, v.pfff), where).toBe(true)
    }
    return out
  }
  /**
   * Puts a ball at rest on top of every standing brick that has room over it, at each of `offs` along its top, and
   * brings it down. Returns how many were tried, and how many rolled off and how many were fetched.
   */
  const everyPocket = (make: () => Table, kind: BallKind, name: string, offs: readonly number[] = [0, -24, 24]) => {
    const count = { tried: 0, rolled: 0, fetched: 0 }
    const probe = make()
    for (let place = 0; place < PLACES; place++) {
      if (!probe.solid(place)) continue
      if (rowOf(place) > 0 && probe.solid(place - WALL.cols)) continue
      for (const off of offs) {
        const t = make()
        const box = t.boxOf(place)
        t.kind = kind
        t.look = kind
        Object.assign(t.ball, { state: 'flying', x: box.x + box.w / 2 + off, y: box.y - BALL_R, vx: 0, vy: 0 })
        if (inSomething(t)) continue
        count.tried += 1
        const out = bringDown(t, `${name}: a ${kind} ball at rest on place ${place} (${off})`)
        if (out.how === 'rolled') count.rolled += 1
        if (out.how === 'fetched') count.fetched += 1
      }
    }
    return count
  }
  /** A table of a plan with some of its bricks taken off, as if they had fallen. */
  const without = (position: string, seed: number, gone: readonly number[]) => () => {
    const wall = layWall(position, seed)
    for (const place of gone) wall[place] = null
    return new Table({ ...freshSave(null), position, wall, shown: ['hot-gate', 'wet-gate'] }, seed)
  }
  const add = (sum: { tried: number; rolled: number; fetched: number }, more: { tried: number; rolled: number; fetched: number }) => {
    sum.tried += more.tried
    sum.rolled += more.rolled
    sum.fetched += more.fetched
  }

  it.each(LADDER.slice(0, -1))('on every brick top the %s wall can have, it rolls off downhill only or is fetched, strikes nothing, and ends where the bumper reaches it', (position) => {
    const sum = everyPocket(without(position, 1, []), 'plain', position)
    // The wall with each one of its bricks gone, and with many of them gone.
    for (let a = 0; a < PLACES; a++) add(sum, everyPocket(without(position, 1, [a]), 'plain', `${position} without ${a}`, [a % 2 ? -24 : 24]))
    const rng = makeRng(11)
    for (let wall = 0; wall < 8; wall++) {
      const gone = [...Array(PLACES).keys()].filter(() => below(rng, 3) === 0)
      add(sum, everyPocket(without(position, 1, gone), KINDS[wall % KINDS.length], `${position} without ${gone.join(' ')}`, [[0, -24, 24][wall % 3]]))
    }
    expect(sum.tried).toBeGreaterThan(70)
    expect(sum.rolled + sum.fetched).toBe(sum.tried)
    expect(sum.rolled).toBeGreaterThan(5)
  }, 40_000)

  it('on every brick top of the last wall, however it is laid out, it rolls off downhill only or is fetched, and strikes nothing', () => {
    const sum = { tried: 0, rolled: 0, fetched: 0 }
    const rng = makeRng(5)
    for (let seed = 1; seed <= 10; seed++) {
      add(sum, everyPocket(without('all', seed, []), 'plain', `all ${seed}`, [[0, -24, 24][seed % 3]]))
      const gone = [...Array(PLACES).keys()].filter(() => below(rng, 3) === 0)
      add(sum, everyPocket(without('all', seed, gone), KINDS[seed % KINDS.length], `all ${seed} without ${gone.join(' ')}`, [[24, 0, -24][seed % 3]]))
    }
    expect(sum.tried).toBeGreaterThan(70)
    expect(sum.rolled + sum.fetched).toBe(sum.tried)
  }, 40_000)

  it('no ball glides uphill by itself: from the ice wall\'s middle pit and from the sleepy wall\'s shelf the nearer toy fetches it, seen and heard, and sets it on the bumper', () => {
    // The ice wall's pit, over the two ice bricks in the middle of its foot row, between the glass of the row above.
    const ice = fresh('ice')
    const pit = ice.boxOf(at(2, 2))
    Object.assign(ice.ball, { state: 'flying', x: pit.x + pit.w / 2, y: pit.y - BALL_R, vx: 0, vy: 0 })
    let reached = 0, lift = 0
    const held: number[] = []
    const out = bringDown(ice, 'the ice pit')
    expect(out.how).toBe('fetched')
    // Left of the middle of the table the dragon is nearer: it comes with its tail.
    expect(out.by).toBe('dragon')
    expect(has(out.heard, v.tailCurl)).toBe(true)
    expect(out.rumbles).toBe(0)
    // The sleepy wall's shelf, on the two glass bricks of its middle row, between the sleepy bricks of the row above.
    const sleepy = fresh('sleepy')
    const shelf = sleepy.boxOf(at(1, 3))
    Object.assign(sleepy.ball, { state: 'flying', x: shelf.x + shelf.w / 2 + 30, y: shelf.y - BALL_R, vx: 0, vy: 0 })
    // Seen: the trunk reaches out before it has the ball, and the ball is lifted while it is carried.
    for (let step = 0; step < 6 / STEP && sleepy.ball.state !== 'resting'; step++) {
      sleepy.step(STEP)
      if (sleepy.fetching && !sleepy.lifted) reached = Math.max(reached, sleepy.pose('elephant').get('fetch'))
      if (sleepy.lifted) {
        lift = Math.max(lift, sleepy.pose('ball').get('lift'))
        held.push(sleepy.ball.y)
      }
    }
    expect(sleepy.ball.state).toBe('resting')
    expect(sleepy.fetching).toBe(null)
    expect(reached).toBeGreaterThan(0.9)
    expect(lift).toBe(1)
    expect(held.length).toBeGreaterThan(60)
    // The elephant is late and slow, the dragon quick: each fetches in its own manner.
    expect(answers.FETCH.elephant.late + answers.FETCH.elephant.reach).toBeGreaterThan(2 * (answers.FETCH.dragon.late + answers.FETCH.dragon.reach))
    expect(answers.FETCH.elephant.speed).toBeLessThan(answers.FETCH.dragon.speed * 0.7)
    // When the trunk has drawn back, the elephant is itself again.
    play(sleepy, 90)
    expect(sleepy.pose('elephant').get('fetch')).toBe(0)
    expect(sleepy.pose('ball').get('lift')).toBe(0)
  })

  it('on a flat top with an open side it rolls off as a ball would: never up, slowly at first and faster down the drop, with its own rumble', () => {
    const t = fresh('glass')
    const box = t.boxOf(at(0, 1))
    Object.assign(t.ball, { state: 'flying', x: box.x + box.w / 2, y: box.y - BALL_R, vx: 0, vy: 0 })
    until(t, () => t.rolling, 60)
    expect(t.rolling).toBe(true)
    const track: { x: number; y: number }[] = []
    let rumbles = 0
    for (let step = 0; step < 6 / STEP && t.rolling; step++) {
      t.step(STEP)
      track.push({ x: t.ball.x, y: t.ball.y })
      rumbles += t.sounds.filter(isRumble).length
      t.sounds = []
    }
    expect(t.ball.state).toBe('flying')
    expect(t.ball.y).toBeGreaterThanOrEqual(UNDER_WALL - 1)
    for (let i = 1; i < track.length; i++) expect(track[i].y).toBeGreaterThanOrEqual(track[i - 1].y - 1e-6)
    // Along the top it goes to the nearer side, the lane at the left, and it is faster down the drop than along the top.
    expect(track[track.length - 1].x).toBeLessThan(WALL.left)
    const speed = (i: number) => Math.hypot(track[i].x - track[i - 1].x, track[i].y - track[i - 1].y) / STEP
    expect(speed(2)).toBeLessThan(60)
    expect(Math.max(...track.slice(1).map((_, i) => speed(i + 1)))).toBeGreaterThan(300)
    expect(rumbles).toBeGreaterThan(4)
    expect(JSON.stringify(t.wall)).toBe(JSON.stringify(layWall('glass', 1)))
  })

  it('it does not float across a gap: with a pit on one side and the lane on the other it rolls to the lane, and with a pit on both sides it is fetched', () => {
    // On the brick beside the lane, with a pit to its right.
    const lane = tableOf(['.g.ggg', '.ggggg', '......'])
    const top = lane.boxOf(at(0, 1))
    Object.assign(lane.ball, { state: 'flying', x: top.x + top.w / 2 + 20, y: top.y - BALL_R, vx: 0, vy: 0 })
    let most = 0
    until(lane, () => {
      most = Math.max(most, lane.ball.x)
      return lane.ball.y >= UNDER_WALL - 1
    }, 60 * 8)
    expect(lane.ball.y).toBeGreaterThanOrEqual(UNDER_WALL - 1)
    expect(most).toBeLessThanOrEqual(top.x + top.w / 2 + 21)
    expect(lane.fetching).toBe(null)
    // On a brick with a pit at either side of it.
    const pits = tableOf(['g.g.gg', 'gggggg', '......'])
    const mid = pits.boxOf(at(0, 2))
    Object.assign(pits.ball, { state: 'flying', x: mid.x + mid.w / 2, y: mid.y - BALL_R, vx: 0, vy: 0 })
    expect(bringDown(pits, 'a brick between two pits').how).toBe('fetched')
  })

  it('rolls off or is fetched from a swollen jelly, from a wall with a pool and a grown vine, and from between a swollen jelly and the bell', () => {
    for (const rows of [['.J..J.', 'g.gg.g', 'g.gg.g'], ['gJ..Jg', 'pg..gi', '.giig.'], ['..JgJ.', '.ggg.g', '.vg.gg'], ['.....J', '.....g', '.Vg..g'], ['gggggJ', 'gggggg', 'gggggg']]) {
      expect(everyPocket(() => tableOf(rows), 'plain', rows.join('/')).tried).toBeGreaterThan(5)
    }
    // Wedged between the swollen jelly in the last column and the bell: it comes down, and the bell does not ring.
    const t = tableOf(['.....J', '......', '......'])
    const box = t.boxOf(at(0, 5))
    Object.assign(t.ball, { state: 'flying', x: box.x + box.w - 6, y: box.y - BALL_R, vx: 30, vy: 0 })
    bringDown(t, 'between the jelly and the bell')
  })

  it('the ice plan\'s middle pit: a plain ball dropped into it rings the ice once, breaks nothing, and is set on the bumper', () => {
    const t = fresh('ice')
    const pit = brickBox(at(1, 2))
    Object.assign(t.ball, { state: 'flying', x: pit.x + pit.w / 2, y: FIELD.roof + BALL_R + 2, vx: 0, vy: 0 })
    const wall = JSON.stringify(t.wall)
    const heard = until(t, () => t.ball.state === 'resting', 60 * 12)
    expect(t.ball.state).toBe('resting')
    expect(heard.filter((tone) => tone === v.tsk[0]).length).toBe(1)
    // The ice shivered and nothing else on the wall changed: no glass was cracked by a ball nobody flicked.
    expect(JSON.stringify(t.wall)).toBe(wall)
    expect(t.rubble).toEqual([])
  })

  it('a ball that comes down on a brick top rings it once: landing on the same brick again it rings and cracks nothing', () => {
    const drop = (letter: string) => {
      const t = tableOf(['......', `..${letter}...`, '......'])
      const box = brickBox(at(1, 2))
      Object.assign(t.ball, { state: 'flying', x: box.x + box.w / 2, y: box.y - 150, vx: 0, vy: 0 })
      // Until it has come to rest there and is about to roll off.
      const heard = until(t, () => t.ball.state === 'carried', 60 * 6)
      expect(t.ball.state, letter).toBe('carried')
      return { t, heard }
    }
    // Glass takes one crack, and a cracked brick is not rung again and so does not fall.
    const glass = drop('g')
    expect(glass.t.wall[at(1, 2)]).toEqual({ kind: 'glass', state: 'cracked' })
    expect(glass.t.rubble).toEqual([])
    // Ice says "tsk" once, however long the ball goes on bouncing on it.
    const ice = drop('i')
    expect(ice.heard.filter((tone) => tone === v.tsk[0]).length).toBe(1)
  })
})

describe('the vine, in every row', () => {
  it.each([[0, 'v'], [1, 'v'], [2, 'v'], [0, 'V'], [1, 'V'], [2, 'V']] as const)('a seed in row %i with its vine grown (%s): a ball in the lane is taken up once, and then comes down to where the bumper can reach it', (row, letter) => {
    const rows = ['......', '......', '......'].map((line, index) => (index === row ? `.${letter}....` : line))
    const t = tableOf(rows)
    Object.assign(t.ball, { state: 'flying', x: LANE.x + 6, y: 420, vx: 0, vy: -640 })
    let creaks = 0, highest = Infinity
    for (let frame = 0; frame < 60 * 20; frame++) {
      t.step(FRAME)
      if (has(t.sounds, v.vineCreak)) creaks += 1
      t.sounds = []
      // The last ten seconds: the ball is under the wall, bouncing on the drum or at rest, where the bumper reaches it.
      if (frame >= 60 * 10) highest = Math.min(highest, t.ball.y - BALL_R)
    }
    expect(creaks).toBe(1)
    expect(highest).toBeGreaterThan(WALL.top + WALL.rows * WALL.cellH)
  })

  it('a ball the vine has carried is not taken again, whatever it touches, until it has come down to the bumper or the drum', () => {
    const t = tableOf(['.g....', '......', '.V....'])
    Object.assign(t.ball, { state: 'flying', x: LANE.x, y: 400, vx: 0, vy: -500 })
    until(t, () => t.ball.state === 'carried', 40)
    until(t, () => t.ball.state !== 'carried', 300)
    // Sent back into the lane off a brick, the roof, a rail and the bell: the vine lets it by each time.
    for (const [x, y, vx, vy] of [[LANE.x, 300, 0, -200], [LANE.x - 10, 250, -300, 0], [LANE.x, 130, 0, -400]]) {
      Object.assign(t.ball, { state: 'flying', x, y, vx, vy })
      const heard = until(t, () => t.ball.y > 500, 200)
      expect(has(heard, v.vineCreak)).toBe(false)
    }
    // Down on the drum and up into the lane again: now it is carried.
    until(t, () => t.ball.vy < 0 && t.ball.y > 700, 400)
    Object.assign(t.ball, { state: 'flying', x: LANE.x, y: 400, vx: 0, vy: -500 })
    const heard = until(t, () => t.ball.state === 'carried', 40)
    expect(has(heard, v.vineCreak)).toBe(true)
  })

  it('up a tall vine the ball winds round the stem, to one side and then the other, and up a short one it rides straight', () => {
    const tall = tableOf(['......', '......', '.V....'])
    Object.assign(tall.ball, { state: 'flying', x: LANE.x, y: 400, vx: 0, vy: -500 })
    expect(tall.winding).toBe(null)
    until(tall, () => tall.ball.state === 'carried', 40)
    let left = 0, right = 0, turns = 0
    until(tall, () => {
      left = Math.min(left, tall.ball.x - LANE.x)
      right = Math.max(right, tall.ball.x - LANE.x)
      turns = Math.max(turns, tall.winding ?? 0)
      return tall.ball.state !== 'carried'
    }, 300)
    expect(left).toBeLessThan(-8)
    expect(right).toBeGreaterThan(8)
    expect(turns).toBeGreaterThan(2)
    expect(tall.winding).toBe(null)
    expect(Math.abs(left)).toBeLessThanOrEqual(LANE.half - BALL_R)
    const short = tableOf(['......', '......', '.v....'])
    Object.assign(short.ball, { state: 'flying', x: LANE.x, y: 400, vx: 0, vy: -500 })
    until(short, () => short.ball.state === 'carried', 40)
    until(short, () => {
      expect(short.winding).toBe(null)
      expect(short.ball.x).toBe(LANE.x)
      return short.ball.state !== 'carried'
    }, 300)
  })
})

describe('the bell and what lies against it', () => {
  it('nothing fits where the bell is: a wet ball slipping over a swollen jelly in the last column is let go before the bell and never passes through it', () => {
    const t = tableOf(['.....J', '......', '......'])
    aimAt(t, at(0, 5), 'wet', 'below', 620, 20)
    let nearest = Infinity
    until(t, () => {
      nearest = Math.min(nearest, Math.hypot(t.ball.x - BELL.x, t.ball.y - BELL.y))
      return false
    }, 60 * 4)
    expect(nearest).toBeGreaterThanOrEqual(BALL_R + BELL.r - 1)
  })

  it('a ball that only lies against the bell rings nothing, and one that strikes it rings it once', () => {
    const lying = tableOf(['......', '......', '......'])
    Object.assign(lying.ball, { state: 'flying', x: BELL.x - (BALL_R + BELL.r) + 1, y: BELL.y, vx: 30, vy: 0 })
    const soft = until(lying, () => false, 30)
    expect(soft).toEqual([])
    const struck = tableOf(['......', '......', '......'])
    Object.assign(struck.ball, { state: 'flying', x: BELL.x - 80, y: BELL.y, vx: 500, vy: 0 })
    const heard = until(struck, () => false, 30)
    expect(heard.length).toBeGreaterThan(0)
    expect(struck.pose('bell').get('swing')).not.toBe(0)
  })
})

describe('a toy\'s gate', () => {
  it.each(['dragon', 'walrus', 'elephant'] as const)('the %s draws the ball in to where it holds it: the ball is in sight all the way from the rail and is hidden only there', (toy) => {
    const t = fresh('sleepy')
    const gate = GATES[toy]
    Object.assign(t.ball, { state: 'flying', x: gate.side < 0 ? FIELD.left + 60 : FIELD.right - 60, y: (gate.y0 + gate.y1) / 2, vx: gate.side * 500, vy: 0 })
    until(t, () => t.ball.state === 'carried', 30)
    expect(t.ball.state).toBe('carried')
    const from = Math.hypot(t.ball.x - gate.mouth.x, t.ball.y - gate.mouth.y)
    expect(from).toBeGreaterThan(40)
    let far = from, frames = 0
    until(t, () => {
      if (t.ball.state !== 'carried') return true
      const now = Math.hypot(t.ball.x - gate.mouth.x, t.ball.y - gate.mouth.y)
      expect(now).toBeLessThanOrEqual(far + 1e-6)
      far = now
      frames += 1
      return false
    }, 60)
    expect(t.ball.state).toBe('hidden')
    expect(t.ball.x).toBeCloseTo(gate.mouth.x, 3)
    expect(t.ball.y).toBeCloseTo(gate.mouth.y, 3)
    // Soon: the toy's own answer started at the rail, and the ball is with it within half a second.
    expect(frames).toBeLessThanOrEqual(30)
  })

  it('each toy draws the ball in in its own manner: the dragon snaps it up, the walrus lets it roll over the rim and drop, the elephant is late and then sucks it up faster and faster', () => {
    const drawIn = (toy: 'dragon' | 'walrus' | 'elephant') => {
      const t = fresh('sleepy')
      const gate = GATES[toy]
      Object.assign(t.ball, { state: 'flying', x: gate.side < 0 ? FIELD.left + 40 : FIELD.right - 40, y: (gate.y0 + gate.y1) / 2, vx: gate.side * 500, vy: 0 })
      while (t.ball.state === 'flying') t.step(STEP)
      const from = { x: t.ball.x, y: t.ball.y }
      const track = [from]
      for (let step = 0; step < 200 && t.ball.state === 'carried'; step++) {
        t.step(STEP)
        track.push({ x: t.ball.x, y: t.ball.y })
      }
      expect(t.ball.state, toy).toBe('hidden')
      const still = track.findIndex((point) => point.x !== from.x || point.y !== from.y) - 1
      const moves = track.slice(still)
      const speed = (i: number) => Math.hypot(moves[i].x - moves[i - 1].x, moves[i].y - moves[i - 1].y) / STEP
      // How far above the straight way from the rail to where the toy holds it the ball goes.
      const over = Math.max(...moves.map((point) => {
        const t01 = (point.x - from.x) / (gate.mouth.x - from.x)
        return from.y + (gate.mouth.y - from.y) * t01 - point.y
      }))
      return { waits: still * STEP, seconds: (moves.length - 1) * STEP, gain: speed(moves.length - 2) / speed(1), over }
    }
    const dragon = drawIn('dragon'), walrus = drawIn('walrus'), elephant = drawIn('elephant')
    // The dragon: at once, straight, in under a tenth of a second.
    expect(dragon.waits).toBeLessThan(0.02)
    expect(dragon.seconds).toBeLessThan(0.1)
    expect(dragon.over).toBeLessThan(1)
    // The walrus: at once, but slowly, over the rim and down, gathering speed.
    expect(walrus.waits).toBeLessThan(0.02)
    expect(walrus.seconds).toBeGreaterThan(0.25)
    expect(walrus.over).toBeGreaterThan(15)
    expect(walrus.gain).toBeGreaterThan(1.5)
    // The elephant: late, the ball waits at the rail; then straight up the trunk, faster and faster.
    expect(elephant.waits).toBeGreaterThan(0.2)
    expect(elephant.over).toBeLessThan(1)
    expect(elephant.gain).toBeGreaterThan(3)
    expect(elephant.seconds).toBeGreaterThan(dragon.seconds * 2)
  })
})

describe('a finger on a brick, at every size', () => {
  const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [820, 1180], [667, 375]]

  it.each(SURFACES)('on a surface of %i by %i a brick answers a finger over 48 px or more each way, and a finger that just misses it never flicks the ball', (width, height) => {
    const scale = fit(width, height).scale, limits = limitsFor(width, height)
    for (const place of [at(1, 2), at(0, 0), at(2, 5)]) {
      const rows = ['......', '......', '......'].map((line, row) => (row === rowOf(place) ? `${'.'.repeat(colOf(place))}g${'.'.repeat(WALL.cols - 1 - colOf(place))}` : line))
      const t = tableOf(rows)
      t.fitTo(limits)
      const box = brickBox(place), cx = box.x + box.w / 2, cy = box.y + box.h / 2
      const reach = (dx: number, dy: number) => {
        let far = 0
        while (t.targetAt(cx + dx * (far + 0.5), cy + dy * (far + 0.5)) === 'brick') far += 0.5
        return far
      }
      expect((reach(-1, 0) + reach(1, 0)) * scale, `width at place ${place}`).toBeGreaterThanOrEqual(TARGET_PX - 1)
      expect((reach(0, -1) + reach(0, 1)) * scale, `height at place ${place}`).toBeGreaterThanOrEqual(TARGET_PX - 1)
      // Just off each edge of the drawn brick: still the brick, the bumper is not taken, and the lift flicks nothing.
      for (const [x, y] of [[cx, box.y - limits.padY + 0.5], [cx, box.y + box.h + limits.padY - 0.5], [box.x - limits.padX + 0.5, cy], [box.x + box.w + limits.padX - 0.5, cy]]) {
        expect(t.press(x, y)).toBe('brick')
        expect(t.bumperHeld).toBe(false)
        t.lift()
        play(t, 10)
        expect(t.ball.state).toBe('resting')
      }
    }
  })

  it.each(SURFACES)('on a surface of %i by %i a finger anywhere on a full wall is on a brick, the nearest one', (width, height) => {
    const t = fresh('glass')
    t.fitTo(limitsFor(width, height))
    for (let y = WALL.top; y <= WALL.top + WALL.rows * WALL.cellH; y += 4) {
      for (let x = WALL.left; x <= WALL.left + WALL.cols * WALL.cellW; x += 4) expect(t.targetAt(x, y), `${x}, ${y}`).toBe('brick')
    }
    // A finger on each brick's own drawn box, pressed and lifted: the ball is never flicked.
    for (let place = 0; place < PLACES; place++) {
      const box = brickBox(place)
      expect(t.press(box.x + 2, box.y + 2)).toBe('brick')
      t.lift()
    }
    play(t, 10)
    expect(t.ball.state).toBe('resting')
  })

  it('at its own size a brick\'s target is its own place in the wall, so a finger between two rows is on a brick and never on the bumper', () => {
    expect(FULL_SIZE.padX).toBe((WALL.cellW - WALL.brickW) / 2)
    expect(limitsFor(STAGE.width, STAGE.height).padY).toBe((WALL.cellH - WALL.brickH) / 2)
  })

  it('the wall is laid tall enough that a brick\'s own share of the surface is 48 px each way on a tablet, upright or on its side', () => {
    for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180], [768, 1024], [810, 1080]] as const) {
      const scale = fit(width, height).scale
      expect(WALL.cellW * scale, `${width} by ${height}, across`).toBeGreaterThanOrEqual(TARGET_PX)
      expect(WALL.cellH * scale, `${width} by ${height}, down`).toBeGreaterThanOrEqual(TARGET_PX)
    }
    // And the gap between two rows stays narrower than the ball, so no ball gets in between them.
    expect(WALL.cellH - WALL.brickH).toBeLessThan(BALL_R * 2)
  })
})

describe('the ladybird, at every size', () => {
  it.each([[1180, 820], [1024, 768], [820, 1180], [667, 375], [568, 320], [390, 844]])('on a surface of %i by %i it never stops under the home control or in the grown-up\'s corner, wherever it walks or is sent', (width, height) => {
    const by = fit(width, height), limits = limitsFor(width, height)
    const home = { x: (width / 2 - by.x) / by.scale, y: (34 - by.y) / by.scale, r: 24 / by.scale }
    const t = fresh('glass')
    t.fitTo(limits)
    const clear = () => {
      expect(Math.hypot(t.ladybirdX - home.x, LADYBIRD.y - home.y), `at ${t.ladybirdX}`).toBeGreaterThan(home.r + LADYBIRD.r)
      expect(t.ladybirdX).toBeGreaterThanOrEqual(limits.ladyFrom - 1e-6)
      expect(t.ladybirdX).toBeLessThanOrEqual(limits.ladyTo + 1e-6)
    }
    clear()
    for (let poke = 0; poke < 6; poke++) {
      play(t, 60 * 4, clear)
      t.press(t.ladybirdX, LADYBIRD.y)
      t.lift()
      play(t, 90)
      clear()
    }
    // Parked and found again on that surface, it is still clear.
    const found = t.settled()
    expect(found.ladybirdX).toBeGreaterThanOrEqual(limits.ladyFrom)
    expect(found.ladybirdX).toBeLessThanOrEqual(limits.ladyTo)
  })
})

describe('the tray', () => {
  it('a brick lies in the sand under the column it fell from, whatever fell before it, and is found there again', () => {
    const t = tableOf(['......', '......', 'c..c.c'])
    for (const col of [5, 0, 3]) {
      aimAt(t, at(2, col), 'plain')
      until(t, () => false, 40)
    }
    expect(t.rubble).toEqual([{ kind: 'glass', col: 5 }, { kind: 'glass', col: 0 }, { kind: 'glass', col: 3 }])
    expect(t.spots).toEqual([heapSpot(5, 0), heapSpot(0, 0), heapSpot(3, 0)])
    // Not left to right in the order they fell.
    expect(t.spots[0].x).toBeGreaterThan(t.spots[2].x)
    expect(t.spots[2].x).toBeGreaterThan(t.spots[1].x)
    const loaded = new Table(deserialize(JSON.parse(JSON.stringify(serialize(t.toSave())))), 1)
    expect(loaded.rubble).toEqual(t.rubble)
    expect(loaded.spots).toEqual(t.spots)
    expect(t.settled().spots).toEqual(t.spots)
  })

  it('two bricks from one column lie on each other, the second where the heap puts it', () => {
    const t = tableOf(['......', '..c...', '..c...'])
    aimAt(t, at(2, 2), 'plain')
    until(t, () => false, 40)
    aimAt(t, at(1, 2), 'plain')
    until(t, () => false, 40)
    expect(t.spots).toEqual([heapSpot(2, 0), heapSpot(2, 1)])
  })
})

describe('no toy claps', () => {
  /** The clap, as it was: a short wide burst and a low thump. Nothing a toy says may be it. */
  const CLAP = [{ kind: 'noise', frequency: 900, q: 0.8, peak: 0.13, attack: 0.002, decay: 0.08 }, { kind: 'tone', wave: 'sine', frequency: 170, peak: 0.07, attack: 0.003, decay: 0.07 }].map((tone) => JSON.stringify(tone))
  const claps = (heard: readonly v.Tone[]) => heard.filter((tone) => CLAP.includes(JSON.stringify({ kind: tone.kind, ...(tone.kind === 'tone' ? { wave: tone.wave } : {}), frequency: tone.frequency, ...(tone.kind === 'noise' ? { q: tone.q } : {}), peak: tone.peak, attack: tone.attack, decay: tone.decay }))).length
  /** Plays `frames`, and holds that no flipper is brought to the other on the way: the walrus has no such pose at all. */
  const watch = (t: Table, frames: number, where: string, done: () => boolean = () => false): v.Tone[] => {
    const heard: v.Tone[] = []
    for (let frame = 0; frame < frames && !done(); frame++) {
      t.step(FRAME)
      heard.push(...t.sounds)
      t.sounds = []
      for (const channel of ['flip', 'clap']) if (t.pose('walrus').get(channel) !== 0) throw new Error(`${where}: the walrus brought its flippers together`)
    }
    return heard
  }
  /** Every way a wall is cleared: the last brick, the ball that takes it, and where the ball comes from. */
  const LASTS: readonly (readonly [string, readonly string[], BallKind, number, From])[] = [
    ['cracked glass, a plain ball', ['......', '......', '..c...'], 'plain', at(2, 2), 'below'],
    ['glass, a heavy ball', ['......', '......', '..g...'], 'heavy', at(2, 2), 'below'],
    ['a drip, a wet ball', ['......', '......', '..d...'], 'wet', at(2, 2), 'below'],
    ['a drip, a hot ball', ['......', '......', '..d...'], 'hot', at(2, 2), 'below'],
    ['jelly thrown twice, a plain ball', ['......', '......', '..k...'], 'plain', at(2, 2), 'below'],
    ['jelly, a hot ball', ['......', '......', '..j...'], 'hot', at(2, 2), 'below'],
    ['ice, a hot ball: the wall clears as it melts', ['......', '......', '..i...'], 'hot', at(2, 2), 'below'],
    ['a seed, a hot ball', ['......', '......', '.s....'], 'hot', at(2, 1), 'below'],
    ['a seed, a heavy ball', ['......', '......', '.s....'], 'heavy', at(2, 1), 'below'],
    ['a sleepy brick, a wet ball', ['......', '..z...', '......'], 'wet', at(1, 2), 'below'],
    ['a sleepy brick in the lowest row, a heavy ball', ['......', '......', '..z...'], 'heavy', at(2, 2), 'left'],
    ['a pool beside a sleepy brick, a wet ball: the splash wakes it', ['......', '......', '.pz...'], 'wet', at(2, 1), 'below'],
  ]

  it.each(LASTS)('%s: from the hit that takes the last brick until the next wall has unfolded, no toy claps, in sight or in sound', (name, rows, kind, place, from) => {
    const t = tableOf(rows, { position: 'jelly' })
    aimAt(t, place, kind, from)
    const heard = watch(t, 60 * 6, name, () => t.finished)
    expect(t.finished, name).toBe(true)
    // The ending, as long as the child likes; then a finger on the bell, and the unfolding to its last brick.
    heard.push(...watch(t, 60 * 7, name))
    t.press(BELL.x, BELL.y)
    t.lift()
    heard.push(...t.sounds)
    expect(t.finished, name).toBe(false)
    heard.push(...watch(t, 60 * 8, name, () => !t.busy))
    expect(t.busy, name).toBe(false)
    heard.push(...watch(t, 60, name))
    expect(claps(heard), name).toBe(0)
    // And the fixture is the clap: it is found where it is put.
    expect(claps([{ kind: 'noise', frequency: 900, q: 0.8, peak: 0.13, attack: 0.002, decay: 0.08 }])).toBe(1)
  })

  /** The frames in which a toy starts its poke: the walrus's twang or slap, the elephant's toot, the dragon's hiccup (which at its gate comes with a flare, in one beat). */
  const pokes = (frames: readonly (readonly v.Tone[])[]) => frames.filter((frame) => has(frame, v.twang) || has(frame, v.slap) || has(frame, v.toot) || (has(frame, v.hic) && !has(frame, v.flare))).length

  it.each(LASTS)('%s: from the hit that takes the last brick to the end of the unfolding no toy plays its poke; each turns to watch, and turns back when the wall stands', (name, rows, kind, place, from) => {
    const t = tableOf(rows, { position: 'jelly' })
    aimAt(t, place, kind, from)
    const frames: v.Tone[][] = []
    let slapped = 0
    const run = (count: number, done: () => boolean = () => false) => {
      for (let frame = 0; frame < count && !done(); frame++) {
        t.step(FRAME)
        frames.push(t.sounds)
        t.sounds = []
        slapped = Math.max(slapped, Math.abs(t.pose('walrus').get('pat')), Math.abs(t.pose('walrus').get('belly')))
      }
    }
    run(60 * 6, () => t.finished)
    expect(t.finished, name).toBe(true)
    for (const toy of ['dragon', 'walrus', 'elephant'] as const) expect(t.pose(toy).get('watch'), name).toBe(0)
    run(60 * 7)
    // Each has turned to the folded wall, and stays turned for as long as the wall lies cleared.
    for (const toy of ['dragon', 'walrus', 'elephant'] as const) expect(t.pose(toy).get('watch'), `${name}: the ${toy}`).toBeCloseTo(1, 1)
    t.press(BELL.x, BELL.y)
    t.lift()
    frames.push(t.sounds)
    t.sounds = []
    run(60 * 8, () => !t.busy)
    expect(t.busy, name).toBe(false)
    run(90)
    expect(pokes(frames), name).toBe(0)
    expect(slapped, name).toBe(0)
    // The wall stands: each has turned back to the ball.
    for (const toy of ['dragon', 'walrus', 'elephant'] as const) expect(t.pose(toy).get('watch'), `${name}: the ${toy}`).toBeCloseTo(0, 1)
  })

  it('the poke is what a finger gets from each toy, and the counter finds it; a table found cleared has its toys turned already', () => {
    for (const toy of ['dragon', 'walrus', 'elephant'] as const) {
      const t = tableOf(['g.....', '......', '......'])
      t.press(TOYS[toy].x + 100, TOYS[toy].y + 150)
      t.lift()
      const frames: v.Tone[][] = [t.sounds]
      t.sounds = []
      for (let frame = 0; frame < 60; frame++) {
        t.step(FRAME)
        frames.push(t.sounds)
        t.sounds = []
      }
      expect(pokes(frames), toy).toBeGreaterThanOrEqual(1)
    }
    // The dragon's hiccup at its gate, with the flare, is no poke.
    expect(pokes([[...v.hic, ...v.flare]])).toBe(0)
    const found = tableOf(['......', '......', '......'], { finished: true })
    for (const toy of ['dragon', 'walrus', 'elephant'] as const) expect(found.pose(toy).get('watch')).toBe(1)
    expect(found.settled().pose('elephant').get('watch')).toBe(1)
  })

  it('under a finger the walrus slaps its belly with one flipper, a pose of its own, and the other stays on the rim', () => {
    const t = tableOf(['g.....', '......', '......'])
    t.press(TOYS.walrus.x + 100, TOYS.walrus.y + 150)
    t.lift()
    let pat = 0
    const heard: v.Tone[] = [...t.sounds]
    t.sounds = []
    for (let frame = 0; frame < 60 * 4; frame++) {
      t.step(FRAME)
      heard.push(...t.sounds)
      t.sounds = []
      pat = Math.max(pat, t.pose('walrus').get('pat'))
    }
    expect(has(heard, v.slap)).toBe(true)
    expect(pat).toBeGreaterThan(0.6)
    expect(t.pose('walrus').get('pat')).toBeCloseTo(0, 2)
  })

  it('the walrus answers a ball steered into its tub as a walrus: it spouts and snorts, and does not clap for it', () => {
    const t = tableOf(['g.....', '......', '......'])
    const gate = GATES.walrus
    Object.assign(t.ball, { state: 'flying', x: FIELD.left + 60, y: (gate.y0 + gate.y1) / 2 - 4, vx: -500, vy: 0 })
    const heard = watch(t, 60 * 4, 'the walrus gate')
    expect(t.kind).toBe('wet')
    expect(has(heard, v.spout)).toBe(true)
    expect(has(heard, v.snort)).toBe(true)
    expect(claps(heard)).toBe(0)
    // Nor for anything wet anywhere on the table: a melt, a splash, a wet ball on the drum.
    const melt = tableOf(['......', '..i...', '..g...'])
    aimAt(melt, at(1, 2), 'hot', 'left')
    const melted = watch(melt, 90, 'a melt')
    expect(has(melted, v.slosh)).toBe(true)
    expect(claps(melted)).toBe(0)
    const pool = tableOf(['......', '..pg..', '......'])
    aimAt(pool, at(1, 2), 'wet', 'below')
    expect(claps(watch(pool, 90, 'a splash'))).toBe(0)
    const drum = tableOf(['g.....', '......', '......'], { bumper: BUMPER.maxX, ball: 'wet' })
    Object.assign(drum.ball, { state: 'flying', x: 500, y: 700, vx: 0, vy: 100 })
    expect(claps(watch(drum, 60 * 4, 'a wet ball on the drum'))).toBe(0)
    // A finger on the walrus: one flipper on its belly.
    const poked = tableOf(['g.....', '......', '......'])
    poked.press(TOYS.walrus.x + 100, TOYS.walrus.y + 150)
    poked.lift()
    expect(claps(watch(poked, 120, 'a finger on the walrus'))).toBe(0)
  })
})

describe('a ball left bouncing on the drum', () => {
  it.each(KINDS)('a %s ball: every boom is softer than the last, what hops, jumps and flaps fades with it, and in the end nothing sounds or moves but the ball', (kind) => {
    const t = tableOf(['gg....', '......', '......'], { bumper: BUMPER.maxX })
    t.kind = kind
    t.look = kind
    Object.assign(t.ball, { state: 'flying', x: 520, y: 600, vx: 0, vy: 100 })
    const booms: { loud: number; moved: number }[] = []
    let was = t.ball.vy
    const moving = () => Math.max(t.pose('brick:0').get('hop'), t.pose('dragon').get('hop'), t.pose('walrus').get('hop'), t.pose('elephant').get('hop'), t.pose('elephant').get('ears'), Math.abs(t.pose('walrus').get('wallow')), t.pose('drum').get('drops'), t.pose('drum').get('steam'))
    for (let frame = 0; frame < 60 * 45; frame++) {
      t.step(FRAME)
      if (was > 0 && t.ball.vy < 0) booms.push({ loud: 0, moved: 0 })
      was = t.ball.vy
      const boom = booms[booms.length - 1]
      if (boom) {
        boom.loud = Math.max(boom.loud, ...t.sounds.map((tone) => tone.peak))
        boom.moved = Math.max(boom.moved, moving())
      }
      t.sounds = []
    }
    expect(booms.length).toBeGreaterThan(25)
    expect(booms[0].loud).toBeGreaterThan(0.1)
    // Softer every time, for as long as there is anything to hear.
    for (let nth = 1; nth < booms.length; nth++) {
      if (booms[nth - 1].loud > 0) expect(booms[nth].loud, `boom ${nth}`).toBeLessThan(booms[nth - 1].loud)
      else expect(booms[nth].loud, `boom ${nth}`).toBe(0)
    }
    // What moves with a boom fades with it and stops while the boom can still be heard.
    if (kind !== 'plain') expect(booms[0].moved).toBeGreaterThan(0.3)
    for (let nth = 1; nth < booms.length; nth++) expect(booms[nth].moved, `boom ${nth}`).toBeLessThanOrEqual(booms[nth - 1].moved + 0.02)
    expect(booms[8].loud).toBeGreaterThan(0)
    expect(booms[8].moved).toBeLessThan(0.02)
    // In the end: the ball still comes back up, where the bumper can be slid under it, and nothing else goes on.
    const last = booms[booms.length - 1]
    expect(last.loud).toBe(0)
    expect(last.moved).toBeLessThan(0.001)
    expect(t.ball.state).toBe('flying')
    // A flick starts it afresh: the first boom after it is at its full size.
    expect(answers.boomSize(0)).toBe(1)
  }, 20_000)

  it('the boom of a ball left bouncing is as loud as the first again only after the bumper, a gate or a fetch has had the ball', () => {
    const t = tableOf(['gg....', '......', '......'], { bumper: 520 })
    t.kind = 'heavy'
    t.look = 'heavy'
    Object.assign(t.ball, { state: 'flying', x: 320, y: 600, vx: 0, vy: 100 })
    const first = until(t, () => false, 60 * 6)
    expect(has(first, v.deepBoom)).toBe(true)
    const later = until(t, () => false, 60 * 6)
    expect(has(later, v.deepBoom)).toBe(false)
    // The bumper is slid under it and springs it: the next ball to miss booms in full.
    Object.assign(t.ball, { state: 'flying', x: 520, y: 600, vx: 0, vy: 100 })
    until(t, () => t.ball.state === 'resting', 120)
    expect(t.ball.state).toBe('resting')
    t.press(t.bumperX, 720)
    t.lift()
    t.slide(BUMPER.maxX)
    Object.assign(t.ball, { state: 'flying', x: 320, y: 600, vx: 0, vy: 100 })
    expect(has(until(t, () => false, 60 * 2), v.deepBoom)).toBe(true)
  })
})

describe('every brick is a note of the wall', () => {
  it.each(['g', 'j', 'i', 's', 'z'])('a plain ball on a %s brick, in every place of the wall, sounds a note of the one scale: the place\'s own, in some octave', (letter) => {
    for (let place = 0; place < PLACES; place++) {
      const rows = [0, 1, 2].map((row) => [...'......'].map((dot, col) => (at(row, col) === place ? letter : dot)).join(''))
      const t = tableOf(rows)
      const heard = hit(t, place, 'plain')
      const note = v.wallNote(colOf(place), rowFromFoot(place))
      const octaves = heard.filter((tone) => tone.kind === 'tone').map((tone) => Math.log2(tone.frequency / note))
      expect(octaves.some((octave) => Math.abs(octave - Math.round(octave)) < 1e-9), `${letter} in place ${place}`).toBe(true)
    }
  })
})

describe('a seed that has gone fills no place', () => {
  it('a sleepy brick shuffles into the place a seed stood in, and the vine stands on in its lane', () => {
    const t = tableOf(['......', '.vz...', '......'])
    hit(t, at(1, 1), 'hot', 'above')
    expect(t.wall[at(1, 1)]).toBe(null)
    expect(t.wall[at(1, 0)]).toMatchObject({ kind: 'seed', state: 'vine', gone: true })
    expect(t.solid(at(1, 0))).toBe(false)
    expect(t.vinePlace).toBe(at(1, 0))
    // A plain ball from the right: the sleepy brick shuffles away from it, into the gap the seed left.
    Object.assign(t.ball, { state: 'resting' })
    aimAt(t, at(1, 2), 'plain', 'below', 620, 20)
    until(t, () => t.wall[at(1, 1)] !== null, 40)
    expect(t.wall[at(1, 1)]).toEqual({ kind: 'sleepy', state: 'asleep' })
    expect(t.wall[at(1, 2)]).toBe(null)
    // The lane is still no gap: from the other side it leans and stays.
    play(t, 90)
    aimAt(t, at(1, 1), 'plain', 'below', 620, 20)
    play(t, 60)
    expect(t.wall[at(1, 1)]?.kind).toBe('sleepy')
    expect(t.wall[at(1, 0)]?.kind).toBe('seed')
  })

  it('a sleepy brick tipped out of bed over the place a seed stood in drops one row into it, and is found there', () => {
    // As it was saved before: the vine in the seed's own place. It is read into its lane.
    const t = tableOf(['.z....', '.v....', '......'])
    const wall = t.toSave().wall
    wall[at(1, 1)] = { kind: 'seed', state: 'vine', browned: false, gone: true }
    const found = new Table({ ...t.toSave(), wall }, 1)
    expect(found.wall[at(1, 1)]).toBe(null)
    expect(found.wall[at(1, 0)]?.kind).toBe('seed')
    hit(found, at(0, 1), 'heavy', 'right')
    expect(found.wall[at(0, 1)]).toBe(null)
    expect(found.wall[at(1, 1)]).toEqual({ kind: 'sleepy', state: 'asleep' })
    expect(found.rubble).toEqual([])
    const again = found.settled()
    expect(again.wall[at(1, 1)]).toEqual({ kind: 'sleepy', state: 'asleep' })
    expect(again.wall[at(1, 0)]).toEqual({ kind: 'seed', state: 'vine', browned: false, gone: true })
  })
})

describe('a ball is never shut in', () => {
  /** Whether the ball, where it is, has a way to under the wall past the bricks that stand: any way, over the wall or round it. */
  const hasWayOut = (t: Table): boolean => {
    const step = 8, { x, y } = t.ball
    const boxes = [...Array(PLACES).keys()].filter((place) => t.solid(place)).map((place) => t.boxOf(place))
    const free = (px: number, py: number) =>
      px >= FIELD.left + BALL_R && px <= FIELD.right - BALL_R && py >= FIELD.roof + BALL_R && Math.hypot(px - BELL.x, py - BELL.y) >= BALL_R + BELL.r - 1 &&
      boxes.every((box) => Math.hypot(px - Math.max(box.x, Math.min(box.x + box.w, px)), py - Math.max(box.y, Math.min(box.y + box.h, py))) >= BALL_R - 1)
    const seen = new Set<string>(['0,0'])
    const queue: [number, number][] = [[0, 0]]
    for (let head = 0; head < queue.length; head++) {
      const [i, j] = queue[head]
      if (y + j * step >= UNDER_WALL) return true
      for (const [di, dj] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const key = `${i + di},${j + dj}`
        if (seen.has(key) || !free(x + (i + di) * step, y + (j + dj) * step)) continue
        seen.add(key)
        queue.push([i + di, j + dj])
      }
    }
    return false
  }
  const inBrick = (t: Table): number => {
    for (let place = 0; place < PLACES; place++) {
      if (!t.solid(place)) continue
      const box = t.boxOf(place)
      if (Math.hypot(t.ball.x - Math.max(box.x, Math.min(box.x + box.w, t.ball.x)), t.ball.y - Math.max(box.y, Math.min(box.y + box.h, t.ball.y))) < BALL_R - 1.5) return place
    }
    return -1
  }
  /** A table whose wall has just been cleared and whose bell has just been pressed: the wall of `position` is about to stand up. */
  const unfolding = (position: string, seed: number) => {
    const before = position === 'all' ? 'all' : LADDER[LADDER.indexOf(position) - 1]
    const t = tableOf(['......', '......', '..c...'], { position: before }, seed)
    aimAt(t, at(2, 2), 'plain')
    until(t, () => t.finished, 30)
    t.press(BELL.x, BELL.y)
    t.lift()
    expect(t.position).toBe(position)
    expect(t.up.some(Boolean)).toBe(false)
    return t
  }
  /**
   * The ball is put in a place of the wall as the wall starts to stand up, and the unfolding is played out. At no
   * moment is the ball inside a brick or closed in by the bricks that stand, every brick stands in the end, and the
   * ball ends where the bumper reaches it.
   */
  const standsRound = (position: string, seed: number, place: number, touch: boolean, off = { x: 0, y: 0 }) => {
    const where = `${position} ${seed}, the ball in place ${place}${touch ? ', with a touch' : ''}`
    const t = unfolding(position, seed)
    const box = brickBox(place)
    Object.assign(t.ball, { state: 'flying', x: box.x + box.w / 2 + off.x, y: box.y + box.h / 2 + off.y, vx: 0, vy: 0 })
    if (touch) {
      t.press(TOYS.elephant.x + 100, TOYS.elephant.y + 200)
      t.lift()
    }
    // A ball that falls into the wall may break a brick on its way, as in any play: the bricks that are left all stand.
    const bricks = () => t.wall.filter((brick) => brick !== null && !(brick.kind === 'seed' && brick.gone)).length
    let up = -1
    const onWall = () => (t.ball.state === 'flying' || t.ball.state === 'carried') && !t.lifted && t.ball.y < UNDER_WALL - 1
    for (let frame = 0; frame < 60 * 30; frame++) {
      t.step(FRAME)
      t.sounds = []
      const now = t.up.filter(Boolean).length
      if (t.ball.state === 'flying' && inBrick(t) >= 0) throw new Error(`${where}: the ball is inside brick ${inBrick(t)}`)
      if (now !== up && onWall() && !hasWayOut(t)) throw new Error(`${where}: the ball is shut in at ${Math.round(t.ball.x)}, ${Math.round(t.ball.y)} with ${now} bricks up`)
      up = now
      if (now === bricks() && !t.busy && !onWall() && !t.fetching) break
    }
    expect(up, where).toBe(bricks())
    expect(t.busy, where).toBe(false)
    expect(onWall(), where).toBe(false)
  }

  it('the seed wall has a place closed on four sides as it is laid: a ball there when the wall unfolds is not shut in, and every brick still stands', () => {
    const wall = layWall('seed', 1)
    const pit = [...Array(PLACES).keys()].filter((place) => wall[place] === null && colOf(place) > 0 && colOf(place) < 5 && rowOf(place) === 1 && wall[place - 1] && wall[place + 1] && wall[place - 6] && wall[place + 6])
    expect(pit).toEqual([at(1, 4)])
    standsRound('seed', 1, at(1, 4), false)
    standsRound('seed', 1, at(1, 4), true)
  })

  it.each([['jelly', 1], ['ice', 1], ['sleepy', 1], ['seed', 1], ['all', 1], ['all', 2], ['all', 3]] as const)('the %s wall (%i) unfolds round a ball in any of its places: never a brick where the ball is, never one that closes it in', (position, seed) => {
    for (let place = 0; place < PLACES; place++) standsRound(position, seed, place, place % 3 === 1, { x: [0, -30, 30][place % 3], y: [0, 14, -14][place % 2] })
  }, 60_000)
})

describe('a sleepy brick that moves', () => {
  const stale = (t: Table, place: number) => ['eye', 'lean', 'snore', 'yawn', 'pop', 'hop'].filter((channel) => Math.abs(t.pose(`brick:${place}`).get(channel)) > 0.02)

  it('poked and then shuffled, it does not keep its eye open in its new place', () => {
    const t = tableOf(['......', '......', '..z...'])
    const box = brickBox(at(2, 2))
    t.press(box.x + 20, box.y + 20)
    t.lift()
    play(t, 6)
    expect(t.pose(`brick:${at(2, 2)}`).get('eye')).toBeGreaterThan(0.1)
    aimAt(t, at(2, 2), 'plain', 'below', 620, -20)
    until(t, () => t.wall[at(2, 3)] !== null, 30)
    expect(t.wall[at(2, 3)]?.kind).toBe('sleepy')
    play(t, 90)
    expect(stale(t, at(2, 3))).toEqual([])
    expect(stale(t, at(2, 2))).toEqual([])
  })

  it('leaning on its neighbour and then shuffled the other way, it keeps neither its lean nor its snore', () => {
    const t = tableOf(['......', '......', '..zg..'])
    aimAt(t, at(2, 2), 'plain', 'below', 620, -20)
    let lean = 0
    play(t, 36, () => { lean = Math.max(lean, Math.abs(t.pose(`brick:${at(2, 2)}`).get('lean'))) })
    expect(lean).toBeGreaterThan(0.2)
    aimAt(t, at(2, 2), 'plain', 'below', 620, 20)
    until(t, () => t.wall[at(2, 1)] !== null, 30)
    expect(t.wall[at(2, 1)]?.kind).toBe('sleepy')
    play(t, 100)
    expect(stale(t, at(2, 1)), 'shuffled').toEqual([])
    // Tipped a row down in the middle of a lean, the same.
    const tipped = tableOf(['..zg..', '......', '......'])
    aimAt(tipped, at(0, 2), 'plain', 'below', 620, -20)
    play(tipped, 36)
    aimAt(tipped, at(0, 2), 'heavy', 'left')
    until(tipped, () => tipped.wall[at(1, 2)] !== null, 30)
    play(tipped, 100)
    // It snores where it landed, and hops for the heavy ball's booms on the drum: those are its new answers. The lean is gone.
    expect(stale(tipped, at(1, 2)).filter((channel) => channel !== 'snore' && channel !== 'hop'), 'tipped').toEqual([])
  })
})

describe('the vine lifts the ball as it reaches it', () => {
  it.each([['plain', 's', 2], ['plain', 's', 1], ['wet', 's', 2], ['wet', 's', 0], ['plain', 'v', 1], ['plain', 'V', 2]] as const)('a %s ball and a %s in row %i: at every step of the ride the ball is under the tip of the vine, never ahead of it', (kind, letter, row) => {
    const rows = [0, 1, 2].map((r) => (r === row ? `.${letter}....` : '......'))
    const t = tableOf(rows)
    if (letter === 's') aimAt(t, at(row, 1), kind)
    else {
      t.kind = kind
      t.look = kind
      Object.assign(t.ball, { state: 'flying', x: LANE.x, y: UNDER_WALL + 60, vx: 0, vy: -500 })
    }
    for (let step = 0; step < 120 && t.ball.state !== 'carried'; step++) t.step(STEP)
    expect(t.ball.state).toBe('carried')
    const from = t.ball.y
    let steps = 0, waited = 0, last = t.ball.y
    while (t.ball.state === 'carried' && steps < 2000) {
      t.step(STEP)
      steps += 1
      if (t.ball.state !== 'carried') break
      const tip = vineTip(row, t.pose('vine').get('grow'), t.pose('vine').get('tall'))
      if (t.ball.y < last - 1e-9 && t.ball.y < tip + VINE_SEAT - 0.01) throw new Error(`the ball rose to ${t.ball.y.toFixed(1)} with the tip of the vine at ${tip.toFixed(1)}, step ${steps}`)
      if (t.ball.y === last) waited += 1
      last = t.ball.y
    }
    expect(t.ball.y).toBeLessThan(from - 30)
    // A vine that has to grow first keeps the ball waiting; one that stands takes it up at once.
    if (letter === 's') expect(waited).toBeGreaterThan(3)
  })
})

describe('a hot ball and the pool it made', () => {
  it('a hot ball that melts an ice from above falls back through its own pool and the pool stays; when it has been to the drum it boils it off', () => {
    const t = tableOf(['......', '..i...', '......'], { bumper: BUMPER.maxX })
    const place = at(1, 2)
    aimAt(t, place, 'hot', 'above', 300)
    const heard = until(t, () => t.ball.y > UNDER_WALL, 60 * 4)
    expect(t.wall[place]).toMatchObject({ kind: 'ice', state: 'pool' })
    expect(has(heard, v.pshh)).toBe(false)
    // It went through the pool's place on its way down.
    expect(t.ball.y).toBeGreaterThan(UNDER_WALL)
    expect(Math.abs(t.ball.x - (brickBox(place).x + brickBox(place).w / 2))).toBeLessThan(brickBox(place).w / 2)
    // Off the drum, it is a hot ball like any other: sent into the pool, it boils it off.
    until(t, () => t.ball.vy < 0, 60 * 3)
    aimAt(t, place, 'hot', 'below')
    const boiled = until(t, () => t.wall[place] === null, 60)
    expect(t.wall[place]).toBe(null)
    expect(has(boiled, v.pshh)).toBe(true)
  })

  it('a pool another ball made is boiled off at once', () => {
    const t = tableOf(['......', '..p...', '......'])
    aimAt(t, at(1, 2), 'hot', 'above', 300)
    until(t, () => t.wall[at(1, 2)] === null, 60)
    expect(t.wall[at(1, 2)]).toBe(null)
  })
})

describe('a showing waits for its toy', () => {
  it('the hot gate is not shown while the dragon has the ball in its gate, and is shown when it has let it go', () => {
    const t = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
    arrive(t)
    play(t, Math.floor((SHOWING_AFTER - 0.6) * 60))
    const gate = GATES.dragon
    Object.assign(t.ball, { state: 'flying', x: gate.side < 0 ? FIELD.left + 40 : FIELD.right - 40, y: (gate.y0 + gate.y1) / 2, vx: gate.side * 500, vy: 0 })
    let inGate = 0
    for (let frame = 0; frame < 60 * 3 && (inGate === 0 || t.ball.state !== 'flying'); frame++) {
      t.step(FRAME)
      if (t.ball.state === 'flying') continue
      inGate += 1
      if (t.busy || t.pose('dragon').get('spare') !== 0) throw new Error(`the showing started with the ball in the dragon's gate, ${t.time.toFixed(2)} s in`)
    }
    // The gate's own answer ran past the two seconds the showing waits.
    expect(inGate).toBeGreaterThan(20)
    expect(t.time).toBeGreaterThan(SHOWING_AFTER)
    expect(t.toSave().shown).toEqual([])
    // And then it is shown.
    t.ball.state = 'resting'
    until(t, () => t.busy, 60 * 2)
    expect(t.toSave().shown).toEqual(['hot-gate'])
  })

  it('the wet gate is not shown while the walrus has the ball, and the hot gate is not shown while the dragon fetches a ball from the wall', () => {
    const wet = new Table({ ...freshSave(null), position: 'sleepy', wall: layWall('sleepy', 1), shown: ['hot-gate'] }, 1)
    arrive(wet)
    play(wet, Math.floor((SHOWING_AFTER - 0.6) * 60))
    const gate = GATES.walrus
    Object.assign(wet.ball, { state: 'flying', x: FIELD.left + 40, y: (gate.y0 + gate.y1) / 2, vx: -500, vy: 0 })
    let held = 0
    for (let frame = 0; frame < 60 * 3 && (held === 0 || wet.ball.state !== 'flying'); frame++) {
      wet.step(FRAME)
      if (wet.ball.state === 'flying') continue
      held += 1
      expect(wet.busy, `the walrus has the ball, ${wet.time.toFixed(2)} s in`).toBe(false)
    }
    expect(held).toBeGreaterThan(20)
    expect(wet.time).toBeGreaterThan(SHOWING_AFTER)
    expect(wet.toSave().shown).toEqual(['hot-gate'])
    // The ice wall's pit: the dragon fetches the ball, and shows nothing with its tail out.
    const ice = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
    arrive(ice)
    play(ice, Math.floor((SHOWING_AFTER - 1) * 60))
    const pit = ice.boxOf(at(2, 2))
    Object.assign(ice.ball, { state: 'flying', x: pit.x + pit.w / 2, y: pit.y - BALL_R, vx: 0, vy: 0 })
    let fetched = 0
    for (let frame = 0; frame < 60 * 5 && ice.ball.state !== 'resting'; frame++) {
      ice.step(FRAME)
      if (!ice.fetching) continue
      fetched += 1
      expect(ice.fetching).toBe('dragon')
      expect(ice.busy, `the dragon fetches, ${ice.time.toFixed(2)} s in`).toBe(false)
    }
    expect(fetched).toBeGreaterThan(20)
    expect(ice.time).toBeGreaterThan(SHOWING_AFTER)
    expect(ice.toSave().shown).toEqual([])
    until(ice, () => ice.busy, 60 * 3)
    expect(ice.toSave().shown).toEqual(['hot-gate'])
  })
})

describe('every change is saved in the frame it is made', () => {
  it('whatever a ball does to a brick, the save is asked for at once in that step: a crack as much as a fall', () => {
    let changes = 0
    for (const letter of ['g', 'c', 'd', 'j', 'k', 'i', 'p', 's', 'v', 'z', 'Z']) {
      for (const kind of KINDS) {
        const t = tableOf(['......', letter === 's' || letter === 'v' ? `.${letter}....` : `..${letter}...`, '......'])
        const place = at(1, letter === 's' || letter === 'v' ? 1 : 2)
        aimAt(t, place, kind)
        t.dirty = 'no'
        const before = JSON.stringify(t.toSave())
        for (let step = 0; step < 240; step++) {
          t.step(STEP)
          if (JSON.stringify(t.toSave()) === before) {
            expect(t.dirty, `${letter}, a ${kind} ball: nothing has changed yet`).toBe('no')
            continue
          }
          changes += 1
          expect(t.dirty, `${letter}, a ${kind} ball`).toBe('now')
          break
        }
      }
    }
    // Most pairs change something that is stored: a crack, a wipe is not, a sag, a throw counted, an icicle, a dimple, a vine, a deep sleep.
    expect(changes).toBeGreaterThan(25)
  })

  it('the first crack of a glass brick is asked for at once, and so is the kind of ball a gate makes', () => {
    const t = tableOf(['......', '..g...', '......'])
    aimAt(t, at(1, 2), 'plain')
    t.dirty = 'no'
    for (let step = 0; step < 120 && t.wall[at(1, 2)]?.state === 'whole'; step++) t.step(STEP)
    expect(t.wall[at(1, 2)]).toEqual({ kind: 'glass', state: 'cracked' })
    expect(t.dirty).toBe('now')
  })
})

describe('a ball resting off the middle of the bumper', () => {
  /** A ball dropped onto the bumper `off` units from its middle, with no finger on it, comes to rest there. */
  const restingAt = (off: number, bumper = 500) => {
    const t = tableOf(['g.....', '......', '......'], { bumper })
    Object.assign(t.ball, { state: 'flying', x: bumper + off, y: BUMPER.top - 120, vx: 0, vy: 200 })
    until(t, () => t.ball.state === 'resting', 120)
    expect(t.ball.state).toBe('resting')
    play(t, 60)
    return t
  }

  it.each([-52, -20, 0, 33, 58])('%i from the middle: put away or saved and loaded, it is found where it was left', (off) => {
    const t = restingAt(off)
    // It lies off the middle, on the side it landed on.
    if (off !== 0) expect(Math.sign(t.ball.x - t.bumperX)).toBe(Math.sign(off))
    expect(Math.abs(t.ball.x - t.bumperX - off)).toBeLessThan(8)
    const parked = t.settled()
    const loaded = new Table(deserialize(JSON.parse(JSON.stringify(serialize(t.toSave())))), 9)
    for (const found of [parked, loaded]) {
      expect(found.ball.state).toBe('resting')
      expect(Math.abs(found.ball.x - t.ball.x)).toBeLessThan(BUMPER.half * 0.006)
      expect(found.ball.y).toBe(BUMPER.top - BALL_R)
    }
    expect(parked.ball.x).toBe(loaded.ball.x)
    // The flick from there goes where it would have gone: off-centre, it leans.
    for (const found of [t, loaded]) {
      found.press(found.bumperX, 720)
      found.lift()
    }
    expect(Math.sign(Math.round(loaded.ball.vx))).toBe(Math.sign(Math.round(t.ball.vx)))
    expect(Math.abs(loaded.ball.vx - t.ball.vx)).toBeLessThan(6)
  })

  it('a ball in the air has no seat: it is found on the middle of the bumper, and a ball at the end of a bumper against a rail stays inside the rail', () => {
    const t = restingAt(40)
    t.press(t.bumperX, 720)
    t.lift()
    play(t, 10)
    expect(t.toSave().seat).toBe(0)
    expect(t.settled().ball.x).toBe(t.settled().bumperX)
    const end = restingAt(-50, BUMPER.minX)
    const found = end.settled()
    expect(found.ball.x).toBeGreaterThanOrEqual(FIELD.left + BALL_R)
    expect(found.ball.x).toBeCloseTo(end.ball.x, 0)
  })
})

describe('the last reading', () => {
  /** A table whose wall has just been cleared, by a wet ball that woke the one sleepy brick: the brick is still climbing down. */
  const justCleared = () => {
    const t = tableOf(['......', '..z...', '......'], { position: 'jelly' })
    aimAt(t, at(1, 2), 'wet')
    until(t, () => t.finished, 30)
    expect(t.finished).toBe(true)
    return t
  }
  /** A cleared wall with the bell just pressed: the next wall is about to stand. `pin` holds the ball in a place for the whole unfolding. */
  const unfolding = (rows: readonly string[] = ['......', '......', '..c...'], more: Partial<Save> = {}) => {
    const t = tableOf(rows, { position: 'glass', ...more })
    aimAt(t, at(2, 2), 'plain')
    until(t, () => t.finished, 30)
    expect(t.finished).toBe(true)
    play(t, 60 * 5)
    t.sounds = []
    return t
  }
  const ring = (t: Table) => {
    t.press(BELL.x, BELL.y)
    t.lift()
  }

  it('a brick that waits for the ball to leave its place sounds once, when it stands, and not at its turn in the unfolding', () => {
    const t = unfolding()
    ring(t)
    t.sounds = []
    const place = t.wall.findIndex((brick) => brick !== null)
    const box = brickBox(place), note = v.standUp(colOf(place), rowFromFoot(place))
    const frames: v.Tone[][] = []
    const pinned = () => Object.assign(t.ball, { state: 'flying', x: box.x + box.w / 2, y: box.y + box.h / 2, vx: 0, vy: 0 })
    // The ball is held in its place for the whole unfolding: every other brick stands, and this one makes no sound.
    for (let frame = 0; frame < 60 * 5; frame++) {
      pinned()
      t.step(FRAME)
      frames.push(t.sounds)
      t.sounds = []
    }
    expect(t.busy).toBe(false)
    expect(t.up[place]).toBe(false)
    expect(t.up.filter(Boolean).length).toBe(t.wall.filter((brick) => brick !== null).length - 1)
    expect(frames.filter((frame) => has(frame, note)).length).toBe(0)
    // The ball goes: the brick stands, with its pop and its note, once.
    Object.assign(t.ball, { x: FIELD.left + 40, y: UNDER_WALL + 60 })
    for (let frame = 0; frame < 60 * 2; frame++) {
      t.step(FRAME)
      frames.push(t.sounds)
      t.sounds = []
    }
    expect(t.up[place]).toBe(true)
    expect(frames.filter((frame) => has(frame, note)).length).toBe(1)
  })

  it('every brick of an unfolding sounds once, as it stands; a touch that ends the unfolding stands the rest without a sound', () => {
    const t = unfolding()
    ring(t)
    const frames: v.Tone[][] = [t.sounds]
    t.sounds = []
    for (let frame = 0; frame < 60 * 5; frame++) {
      t.step(FRAME)
      frames.push(t.sounds)
      t.sounds = []
    }
    const places = [...t.wall.keys()].filter((place) => t.wall[place] !== null)
    expect(places.length).toBeGreaterThan(5)
    // A note is heard once for each brick that has it: the top of one row is the same note as the foot of the next.
    const note = (place: number) => JSON.stringify(v.standUp(colOf(place), rowFromFoot(place)))
    for (const place of places) expect(frames.filter((frame) => has(frame, v.standUp(colOf(place), rowFromFoot(place)))).length, `place ${place}`).toBe(places.filter((other) => note(other) === note(place)).length)
    expect(frames.flat().filter((tone) => places.some((place) => same(tone, v.standUp(colOf(place), rowFromFoot(place))[0]))).length).toBe(places.length)
    const cut = unfolding()
    ring(cut)
    play(cut, 20)
    cut.sounds = []
    cut.press(TOYS.elephant.x + 100, TOYS.elephant.y + 200)
    cut.lift()
    expect(cut.busy).toBe(false)
    expect(cut.up.filter(Boolean).length).toBe(cut.wall.filter((brick) => brick !== null).length)
    const after = [...cut.sounds, ...until(cut, () => false, 120)]
    for (const place of [...cut.wall.keys()].filter((other) => cut.wall[other] !== null)) expect(has(after, v.standUp(colOf(place), rowFromFoot(place))), `place ${place}`).toBe(false)
  })

  it('what the last wall left on the board, a pool and a vine, is seen until the tray is swept, and the save holds the new wall from the bell', () => {
    const wall = wallOf(['......', '...p..', '..c...'])
    wall[at(1, 0)] = { kind: 'seed', state: 'vine', browned: false, gone: true }
    const t = unfolding([], { wall })
    expect(t.old).toEqual({ pools: [], vine: null })
    ring(t)
    // In the bell's first frame the save holds the new wall and the board still shows the old pool and the old vine.
    expect(t.toSave().wall[at(1, 3)]).not.toMatchObject({ state: 'pool' })
    expect(t.toSave().rubble).toEqual([])
    expect(t.old.pools).toEqual([at(1, 3)])
    expect(t.old.vine).toMatchObject({ row: 1, gone: true })
    expect(t.old.vine!.grow).toBeGreaterThan(0.9)
    play(t, 36)
    expect(t.old.pools).toEqual([at(1, 3)])
    expect(t.pose('folded').get('sweep')).toBeGreaterThan(0.2)
    // The sweep is over at three quarters of a second: they are gone with what lay in the tray.
    play(t, 14)
    expect(t.old).toEqual({ pools: [], vine: null })
    expect(t.falls).toEqual([])
    // Put away in the middle, or ended by a touch: nothing of the old wall is left.
    const parked = unfolding([], { wall })
    ring(parked)
    play(parked, 10)
    expect(parked.settled().old).toEqual({ pools: [], vine: null })
    parked.press(TOYS.elephant.x + 100, TOYS.elephant.y + 200)
    expect(parked.old).toEqual({ pools: [], vine: null })
  })

  it('a hot ball that melts two ice bricks in one flight leaves both pools lying on its way back, and boils one off only after the drum', () => {
    const t = tableOf(['..i...', '......', '..i...'], { bumper: BUMPER.maxX })
    const low = at(2, 2), high = at(0, 2)
    aimAt(t, low, 'hot', 'above', 300)
    until(t, () => t.wall[low]?.kind === 'ice' && t.wall[low].state === 'pool', 60)
    expect(t.wall[low]).toMatchObject({ state: 'pool' })
    // Still in the air, it comes to the second one.
    aimAt(t, high, 'hot', 'below', 300)
    until(t, () => t.wall[high]?.kind === 'ice' && t.wall[high].state === 'pool', 60)
    expect(t.wall[high]).toMatchObject({ state: 'pool' })
    // And falls back through both: the one it made first as much as the one it made last.
    Object.assign(t.ball, { state: 'flying', x: brickBox(high).x + brickBox(high).w / 2, y: brickBox(high).y - 30, vx: 0, vy: 200 })
    const heard = until(t, () => t.ball.y > UNDER_WALL, 60 * 4)
    expect(t.ball.y).toBeGreaterThan(UNDER_WALL)
    expect(has(heard, v.pshh)).toBe(false)
    expect(t.wall[low]).toMatchObject({ state: 'pool' })
    expect(t.wall[high]).toMatchObject({ state: 'pool' })
    // Off the drum it is a hot ball like any other.
    until(t, () => t.ball.vy < 0, 60 * 3)
    aimAt(t, low, 'hot', 'below')
    until(t, () => t.wall[low] === null, 60)
    expect(t.wall[low]).toBe(null)
  })

  it('a first showing is a toy\'s own act: the idle ladder is held down by a clearing and an unfolding, and never by a showing', () => {
    const t = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
    arrive(t)
    until(t, () => t.busy, 60 * 4)
    expect(t.busy).toBe(true)
    let held = 0, frames = 0
    for (; frames < 60 * 5 && t.busy; frames++) {
      if (t.holdsLadder) held += 1
      t.step(FRAME)
    }
    expect(frames).toBeGreaterThan(60 * 2)
    expect(held).toBe(0)
    const cleared = justCleared()
    expect(cleared.busy).toBe(true)
    expect(cleared.holdsLadder).toBe(true)
    play(cleared, 60 * 8)
    expect(cleared.holdsLadder).toBe(false)
    ring(cleared)
    expect(cleared.holdsLadder).toBe(true)
    // A showing that follows an unfolding is again the toy's own.
    const next = unfolding(['......', '......', '..c...'], { position: 'jelly', shown: [] })
    ring(next)
    until(next, () => !next.busy, 60 * 6)
    expect(next.position).toBe('ice')
    until(next, () => next.busy, 60 * 4)
    expect(next.busy).toBe(true)
    expect(next.holdsLadder).toBe(false)
  })

  it('a scene ended by a touch is silent from that frame: what is sounding is to be cut, and the fall of the last brick goes on unheard', () => {
    const shakes = (heard: readonly v.Tone[]) => [1, 2].filter((nth) => has(heard, v.shakeDry(nth))).length
    // Left alone, the woken brick is heard shaking itself dry on its way down.
    const alone = justCleared()
    expect(alone.hushed).toBe(false)
    expect(shakes(until(alone, () => false, 120))).toBe(2)
    // A finger on the bumper in the frame after the hit: the scene ends, and from there only the finger's own answer is heard.
    const t = justCleared()
    t.sounds = []
    Object.assign(t.ball, { vx: 0, vy: -200 })
    t.press(t.bumperX, 720)
    expect(t.busy).toBe(false)
    expect(t.hushed).toBe(true)
    expect(has(t.sounds, v.creak)).toBe(true)
    const heard = [...t.sounds, ...until(t, () => false, 50)]
    expect(shakes(heard)).toBe(0)
    expect(has(heard, v.splutter)).toBe(false)
    // In sight it goes on: the brick climbs down into the tray.
    play(t, 60 * 2)
    expect(t.pose('rubble:0').get('fall')).toBeCloseTo(1, 3)
    // A touch with no scene playing cuts nothing; and the corner ends no scene and cuts nothing.
    const plain = tableOf(['g.....', '......', '......'])
    plain.press(plain.bumperX, 720)
    expect(plain.hushed).toBe(false)
    const corner = justCleared()
    corner.press(STAGE.width - 10, 10, true)
    expect(corner.hushed).toBe(false)
    expect(corner.busy).toBe(true)
  })

  it('a ball that the gate is holding when a touch ends a scene still comes out with its sound: only what the scene\'s own hit set off is hushed', () => {
    const t = justCleared()
    play(t, 30)
    const gate = GATES.dragon
    Object.assign(t.ball, { state: 'flying', x: FIELD.left + 60, y: (gate.y0 + gate.y1) / 2, vx: -500, vy: 0 })
    until(t, () => t.ball.state === 'hidden', 60)
    expect(t.busy).toBe(true)
    t.press(TOYS.elephant.x + 100, TOYS.elephant.y + 200)
    t.lift()
    t.sounds = []
    const heard = until(t, () => t.ball.state === 'flying', 60 * 3)
    expect(t.kind).toBe('hot')
    expect(has(heard, [...v.hic, ...v.flare])).toBe(true)
  })

  it('a finger that lands on the bumper while it is still rocking from a ball that sank in keeps it pressed: the finger wins', () => {
    const t = tableOf(['g.....', '......', '......'], { bumper: 500 })
    Object.assign(t.ball, { state: 'flying', x: 500, y: BUMPER.top - 60, vx: 0, vy: 200 })
    until(t, () => t.ball.state === 'resting', 120)
    expect(t.ball.state).toBe('resting')
    // A tenth of a second into the sink-in, whose rock goes on for three.
    play(t, 6)
    t.press(500, 720)
    let least = Infinity
    play(t, 60, () => { least = Math.min(least, t.pose('bumper').get('squash')) })
    expect(t.pose('bumper').get('squash')).toBeCloseTo(PRESSED, 2)
    expect(t.pose('bumper').get('lean')).toBeCloseTo(0, 2)
    // It never came up under the finger on the way.
    expect(least).toBeGreaterThan(PRESSED * 0.5)
    // And the lift flicks the ball as ever.
    t.lift()
    until(t, () => t.ball.state === 'flying', 30)
    expect(t.ball.state).toBe('flying')
    // A finger that lands again before a heavy ball has left drops nothing the rules wait for: the ball is still flicked.
    const heavy = tableOf(['g.....', '......', '......'], { ball: 'heavy' })
    tapBumper(heavy)
    expect(heavy.ball.state).toBe('caught')
    heavy.press(heavy.bumperX, 720)
    until(heavy, () => heavy.ball.state === 'flying', 60)
    expect(heavy.ball.state).toBe('flying')
  })

  it('the seat in the save is asked for in the frame it changes: a heavy ball flicked from off the middle is saved as in the air when it leaves', () => {
    const t = new Table({ ...freshSave(null), wall: wallOf(['g.....', '......', '......']), shown: ['hot-gate', 'wet-gate'], ball: 'heavy', seat: 0.6 }, 1)
    expect(t.toSave().seat).toBe(0.6)
    tapBumper(t)
    t.dirty = 'no'
    let frames = 0
    for (; frames < 60 && t.ball.state === 'caught'; frames++) {
      expect(t.dirty).toBe('no')
      t.step(FRAME)
    }
    expect(t.ball.state).toBe('flying')
    expect(frames).toBeGreaterThan(5)
    // The frame it left the bumper in.
    expect(t.toSave().seat).toBe(0)
    expect(t.dirty).toBe('now')
  })
})

describe('a sleepy brick at the end of its row', () => {
  const snores = (frames: readonly (readonly v.Tone[])[]) => frames.filter((frame) => has(frame, v.snore(false))).length
  /** Hits the sleepy brick in `place` with a plain ball from below, on the side away from the rail on `side`. */
  const sendToRail = (rows: readonly string[], place: number, side: 1 | -1) => {
    const t = tableOf(rows, { bumper: side > 0 ? BUMPER.minX : BUMPER.maxX })
    aimAt(t, place, 'plain', 'below', 620, -20 * side)
    return t
  }

  it.each([['the right', ['......', '.....z', '......'], at(1, 5), 1], ['the left', ['......', '......', 'z.....'], at(2, 0), -1]] as const)('at %s end it shuffles over to the rail, leans on it there, snores once and shuffles back to its place', (_, rows, place, side) => {
    const t = sendToRail(rows, place, side)
    const home = brickBox(place)
    const frames: v.Tone[][] = []
    let atRail = 0, leant = 0, farthest = 0
    for (let frame = 0; frame < 60 * 5; frame++) {
      t.step(FRAME)
      frames.push(t.sounds)
      t.sounds = []
      const box = t.boxOf(place)
      farthest = Math.max(farthest, Math.abs(box.x - home.x))
      // Never through the rail.
      expect(box.x).toBeGreaterThanOrEqual(FIELD.left - 0.01)
      expect(box.x + box.w).toBeLessThanOrEqual(FIELD.right + 0.01)
      const gap = side > 0 ? FIELD.right - (box.x + box.w) : box.x - FIELD.left
      if (gap < 0.01) {
        atRail += 1
        leant = Math.max(leant, t.pose(`brick:${place}`).get('lean') * side)
      } else if (Math.abs(box.x - home.x) > 1 && frame > 5) {
        // On its way it stands upright: it leans only against the rail.
        expect(snores(frames.slice(-1))).toBe(0)
      }
    }
    // It was against the rail for most of a second, leaning towards it.
    expect(atRail).toBeGreaterThan(40)
    expect(leant).toBeGreaterThan(0.6)
    expect(farthest).toBeCloseTo(side > 0 ? FIELD.right - home.x - home.w : home.x - FIELD.left, 1)
    expect(snores(frames)).toBe(1)
    expect(has(frames.flat(), v.yawnAah)).toBe(true)
    // And it is back in its place, upright, where the save had it all along.
    expect(t.boxOf(place)).toEqual(home)
    expect(t.pose(`brick:${place}`).get('lean')).toBeCloseTo(0, 2)
    expect(t.wall[place]).toEqual({ kind: 'sleepy', state: 'asleep' })
  })

  it('it is met where it is on the way, and waits for a ball that is between it and the rail', () => {
    const place = at(1, 5)
    const t = sendToRail(['......', '.....z', '......'], place, 1)
    const home = brickBox(place)
    play(t, 30)
    const on = t.boxOf(place).x - home.x
    expect(on).toBeGreaterThan(5)
    // A ball held in the strip between the brick and the rail: the brick stands still.
    const hold = () => Object.assign(t.ball, { state: 'flying', x: FIELD.right - BALL_R - 2, y: home.y + home.h / 2, vx: 0, vy: 0 })
    hold()
    for (let frame = 0; frame < 90; frame++) {
      hold()
      t.step(FRAME)
      const box = t.boxOf(place)
      expect(FIELD.right - BALL_R - 2 - (box.x + box.w)).toBeGreaterThanOrEqual(BALL_R - 0.5)
    }
    const waited = t.boxOf(place).x - home.x
    expect(waited).toBeLessThan(FIELD.right - home.x - home.w - BALL_R)
    // The ball goes, and the brick goes on to the rail and back.
    Object.assign(t.ball, { x: FIELD.left + 60, y: UNDER_WALL + 40 })
    play(t, 60 * 5)
    expect(t.boxOf(place)).toEqual(home)
    // A put-away on the way finds it in its place.
    const away = sendToRail(['......', '.....z', '......'], place, 1)
    play(away, 50)
    expect(away.boxOf(place).x).toBeGreaterThan(home.x + 5)
    expect(away.settled().boxOf(place)).toEqual(home)
  })

  it('touched again while it is over at the rail it only hums; woken there it falls from where it is', () => {
    const place = at(1, 5)
    const t = sendToRail(['g.....', '.....z', '......'], place, 1)
    play(t, 75)
    const box = t.boxOf(place)
    expect(FIELD.right - (box.x + box.w)).toBeLessThan(0.01)
    aimAt(t, place, 'plain', 'below')
    const hum = until(t, () => false, 20)
    expect(has(hum, v.hum(colOf(place), rowFromFoot(place)))).toBe(true)
    expect(has(hum, v.yawnAah)).toBe(false)
    aimAt(t, place, 'wet', 'below')
    until(t, () => t.wall[place] === null, 30)
    expect(t.wall[place]).toBe(null)
    expect(t.fellAside[t.fellAside.length - 1]).toBeCloseTo(FIELD.right - brickBox(place).x - brickBox(place).w, 0)
  })
})
