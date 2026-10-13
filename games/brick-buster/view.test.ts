import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { LADDER, TIERS } from './config'
import { BALL_R, BELL, BUMPER, FIELD, FOLDED, GATES, LADYBIRD, LANE, STAGE, TOYS, WALL, vineFoot } from './layout'
import type { Guidance } from './guidance'
import type { Pose } from './motion'
import { setSurfaceMaker, type Surface } from './paint'
import { freshSave, type BallKind, type Brick, type Fallen, type Save } from './save'
import { Table } from './table'
import { fit } from './stage'
import { TUFT } from './toys'
import { SCORCH_BLOTS, SHINE, TableView, VINE, flippers, scorch, scorchedTo, vineLine, vineRunner } from './view'
import { layWall } from './walls'

// The view, drawn into a context that only counts. Nothing here needs a
// browser: the sprites are cut into surfaces that record nothing, and the
// frame is drawn into one that counts every stamp, fill and stroke.

type Stamp = { x: number; y: number; w: number; h: number; plain: boolean }
type Count = { draws: number; full: number; stamps: Stamp[] }

/** A 2D context that does nothing. With `count` it counts what would have reached the surface. */
function context(count: Count | null): unknown {
  const kept: Record<string, unknown> = {}
  const nothing = () => {}
  const gradient = { addColorStop: nothing }
  let moved = 0
  return new Proxy(kept, {
    get(_, name: string) {
      if (name in kept) return kept[name]
      if (name.startsWith('create')) return () => gradient
      if (!count) return nothing
      if (name === 'drawImage') {
        return (_image: unknown, x: number, y: number, w: number, h: number) => {
          count.draws += 1
          if (w * h >= STAGE.width * STAGE.height * 0.5) count.full += 1
          count.stamps.push({ x, y, w, h, plain: moved === 0 })
        }
      }
      if (name === 'fill' || name === 'stroke' || name === 'fillRect' || name === 'strokeRect') return () => { count.draws += 1 }
      if (name === 'save') return () => { moved += 1 }
      if (name === 'restore') return () => { moved -= 1 }
      return nothing
    },
    set(_, name: string, value) {
      kept[name] = value
      return true
    },
  })
}

const surface = (count: Count | null): Surface => {
  const g = context(count)
  return { width: 0, height: 0, getContext: () => g }
}

const FRAME = 1 / 60
const KINDS: readonly BallKind[] = ['plain', 'wet', 'hot', 'heavy']
const LETTER: Record<string, () => Brick> = {
  g: () => ({ kind: 'glass', state: 'whole' }), c: () => ({ kind: 'glass', state: 'cracked' }), d: () => ({ kind: 'glass', state: 'sagged' }),
  j: () => ({ kind: 'jelly', state: 'fresh', swollen: false }), J: () => ({ kind: 'jelly', state: 'fresh', swollen: true }), k: () => ({ kind: 'jelly', state: 'thrown-twice', swollen: false }),
  i: () => ({ kind: 'ice', state: 'whole', dimpled: false, icicle: false }), I: () => ({ kind: 'ice', state: 'whole', dimpled: true, icicle: true }), p: () => ({ kind: 'ice', state: 'pool', dimpled: false, icicle: false }),
  s: () => ({ kind: 'seed', state: 'whole', browned: false, gone: false }), v: () => ({ kind: 'seed', state: 'vine', browned: false, gone: false }), V: () => ({ kind: 'seed', state: 'tall-vine', browned: true, gone: false }),
  z: () => ({ kind: 'sleepy', state: 'asleep' }), Z: () => ({ kind: 'sleepy', state: 'deep' }),
}
const wallOf = (rows: readonly string[]): (Brick | null)[] => rows.flatMap((row) => [...row].map((letter) => (letter === '.' ? null : LETTER[letter]())))
const at = (row: number, col: number) => row * WALL.cols + col
const EVERY_FORM: Fallen[] = [{ kind: 'glass', col: 2 }, { kind: 'jelly', form: 'splat', col: 2 }, { kind: 'jelly', form: 'syrup', col: 2 }, { kind: 'seed', form: 'flower', col: 2 }, { kind: 'seed', form: 'sprout', col: 2 }, { kind: 'sleepy', col: 2 }]

/** What the rules set and what the view read, by thing and channel. */
type Log = { set: Set<string>; read: Set<string>; drawing: boolean }
const thing = (who: string) => who.replace(/:\d+$/, '')

/** A table whose poses write down each channel the rules set, and each channel that is read while the view draws. */
function watched(save: Save, log: Log): Table {
  const table = new Table(save, 1)
  const seen = new WeakSet<Pose>()
  const watch = (who: string, pose: Pose | undefined) => {
    if (!pose || seen.has(pose)) return pose
    seen.add(pose)
    const set = pose.set.bind(pose), get = pose.get.bind(pose)
    pose.set = (name, target, lasts) => {
      log.set.add(`${thing(who)}.${name}`)
      set(name, target, lasts)
    }
    pose.get = (name) => {
      if (log.drawing) log.read.add(`${thing(who)}.${name}`)
      return get(name)
    }
    return pose
  }
  const pose = table.pose.bind(table), posed = table.posed.bind(table)
  table.pose = (who) => watch(who, pose(who))!
  table.posed = (who) => watch(who, posed(who))
  return table
}

describe('the frame', () => {
  let before: () => Surface
  const count: Count = { draws: 0, full: 0, stamps: [] }
  let view: TableView
  const log: Log = { set: new Set(), read: new Set(), drawing: false }
  let most = { draws: 0, where: '' }

  beforeAll(() => {
    before = setSurfaceMaker(() => surface(null))
    view = new TableView(surface(count) as unknown as HTMLCanvasElement)
    view.setTier(TIERS[0])
    view.resize(STAGE.width, STAGE.height, 2)
  })
  afterAll(() => { setSurfaceMaker(before) })

  const mk = (rows: readonly string[], more: Partial<Save> = {}) => watched({ ...freshSave(null), wall: wallOf(rows), shown: ['hot-gate', 'wet-gate'], ...more }, log)
  const draw = (table: Table, where: string, guidance: Guidance | null = null) => {
    count.draws = 0
    count.full = 0
    count.stamps = []
    log.drawing = true
    view.draw(table, guidance)
    log.drawing = false
    // What the view reports is what reached the surface, and the board is the frame's one full-surface stamp.
    expect(view.draws, where).toBe(count.draws)
    expect(count.full, where).toBe(1)
    if (count.draws > most.draws) most = { draws: count.draws, where }
  }
  const play = (table: Table, seconds: number, where: string) => {
    for (let frame = 0; frame < seconds * 60; frame++) {
      table.step(FRAME)
      table.sounds = []
      draw(table, where)
    }
  }
  const fly = (table: Table, kind: BallKind, x: number, y: number, vx: number, vy: number) => {
    table.kind = kind
    table.look = kind
    Object.assign(table.ball, { state: 'flying', x, y, vx, vy })
  }
  const aim = (table: Table, place: number, kind: BallKind, from: 'below' | 'right' = 'below', off = 0) => {
    const box = table.boxOf(place)
    if (from === 'below') fly(table, kind, box.x + box.w / 2 + off, box.y + box.h + BALL_R + 6, 0, -620)
    else fly(table, kind, box.x + box.w + BALL_R + 6, box.y + box.h / 2, -620, 0)
  }

  it('draws nothing while the surface has no size, and only the board before the save is read', () => {
    const empty: Count = { draws: 0, full: 0, stamps: [] }
    const unsized = new TableView(surface(empty) as unknown as HTMLCanvasElement)
    unsized.draw(mk(['g.....', '......', '......']), null)
    expect(unsized.draws).toBe(0)
    expect(empty.draws).toBe(0)
    count.draws = 0
    view.blank()
    expect(view.draws).toBe(1)
    expect(count.draws).toBe(1)
  })

  it('plays every answer the table gives, counting each frame', { timeout: 30000 }, () => {
    // Every wall of the ladder as it is found, and with a ball in the air.
    for (const position of LADDER) {
      const table = watched({ ...freshSave(null), position, wall: layWall(position, 1), shown: ['hot-gate', 'wet-gate'] }, log)
      draw(table, `${position} at rest`, { glow: 1, demo: 0.3, demoIndex: 0 })
      table.press(table.bumperX, 720)
      table.lift()
      play(table, 2.5, `${position} in play`)
    }
    // Every kind of brick, in every state, with every form of rubble, under each kind of ball.
    for (const kind of KINDS) {
      const table = mk(['.jJgcd', '.ViIpz', '.gZkgi'], { rubble: [...EVERY_FORM, ...EVERY_FORM], ball: kind })
      play(table, 0.3, `everything, ${kind} ball`)
    }
    // Each brick under each ball, the pool under each, and each gate both ways.
    const cells: readonly (readonly [string, readonly string[], number])[] = [
      ['glass', ['......', '......', '..g.g.'], at(2, 2)], ['cracked', ['......', '......', '..c.g.'], at(2, 2)], ['sagged', ['......', '......', '..d.g.'], at(2, 2)],
      ['jelly', ['..j.g.', '......', '......'], at(0, 2)], ['third throw', ['..k.g.', '......', '......'], at(0, 2)], ['ice', ['......', '......', '..i.g.'], at(2, 2)],
      ['seed', ['..g...', '......', '.s..g.'], at(2, 1)], ['sleepy', ['......', '..z...', '....g.'], at(1, 2)], ['sleepy with no gap', ['......', '.gzg..', '..g.g.'], at(1, 2)], ['deep sleeper', ['......', '..Z...', '....g.'], at(1, 2)],
    ]
    for (const [name, rows, place] of cells) {
      for (const kind of KINDS) {
        const table = mk(rows)
        aim(table, place, kind, name === 'seed' ? 'right' : 'below', name.startsWith('jelly') || name === 'third throw' ? 14 : 0)
        play(table, 1.6, `${name}, ${kind} ball`)
      }
    }
    for (const kind of KINDS) {
      const table = mk(['......', '.jpz..', '....g.'])
      const box = table.boxOf(at(1, 2))
      fly(table, kind, box.x + 39, box.y - 60, 0, 300)
      play(table, 1.6, `pool, ${kind} ball`)
    }
    for (const kind of KINDS) {
      // A ball that comes to a grown vine, and a heavy ball that tips a sleepy brick out of bed from the side.
      const vine = mk(['.gg...', '......', '.v....'])
      fly(vine, kind, LANE.x, vineFoot(2) - 12, 0, -150)
      play(vine, 1.4, `the vine, ${kind} ball`)
      const bed = mk(['..z...', '......', '......'])
      const box = bed.boxOf(at(0, 2))
      fly(bed, 'heavy', box.x - BALL_R - 6, box.y + box.h / 2, 620, 0)
      play(bed, 1.4, 'tipped out of bed')
    }
    for (const toy of ['dragon', 'walrus', 'elephant'] as const) {
      for (const kind of ['plain', 'hot', 'wet', 'heavy'] as const) {
        const table = mk(['g....g', '......', '......'])
        const gate = GATES[toy]
        fly(table, kind, gate.side < 0 ? FIELD.left + 70 : FIELD.right - 70, (gate.y0 + gate.y1) / 2 - 4, gate.side * 500, 0)
        play(table, 2, `${toy}'s gate, ${kind} ball`)
      }
    }
    // The floor and the bell under each ball, and the toys that cannot stand a ball going by.
    for (const kind of KINDS) {
      const floor = mk(['gg....', '......', '......'], { bumper: BUMPER.maxX })
      fly(floor, kind, 420, 690, 0, 200)
      play(floor, 1, `the drum, ${kind} ball`)
      const bell = mk(['g.....', '......', '......'])
      fly(bell, kind, BELL.x, BELL.y + 80, 0, -500)
      play(bell, 1, `the bell, ${kind} ball`)
      const by = mk(['.....g', '......', '......'])
      fly(by, kind, FIELD.left + 200, kind === 'wet' ? 180 : 700, -200, kind === 'wet' ? 0 : -300)
      play(by, 1, `going by, ${kind} ball`)
    }
    // A finger on each thing.
    const poked = mk(['.jg...', '.i.z..', '.s...g'])
    for (const place of [at(0, 1), at(0, 2), at(1, 1), at(1, 3), at(2, 1)]) {
      const box = poked.boxOf(place)
      poked.press(box.x + 30, box.y + 20)
      play(poked, 0.5, 'a finger on a brick')
      poked.lift()
    }
    for (const [x, y] of [[BELL.x, BELL.y], [600, 790], [130, 250], [130, 600], [1050, 600], [poked.ladybirdX, LADYBIRD.y]] as const) {
      poked.press(x, y)
      poked.lift()
      play(poked, 0.8, 'a finger on a toy')
    }
    // The first showings, the ending, the waiting and the unfolding.
    for (const rows of [['..i...', '......', '......'], ['..z...', '......', '......']]) play(mk(rows, { shown: [] }), 6, 'a first showing')
    for (const kind of KINDS) {
      const table = mk(['......', '......', '..c...'], { position: 'jelly', rubble: EVERY_FORM })
      aim(table, at(2, 2), kind === 'heavy' ? 'heavy' : 'plain')
      table.kind = kind === 'heavy' ? 'heavy' : 'plain'
      play(table, 6.5, 'the ending')
      draw(table, 'waiting for the bell', { glow: 1, demo: 0.43, demoIndex: 0 })
      table.press(BELL.x, BELL.y)
      table.lift()
      play(table, 4, 'the unfolding')
    }

    // A ball at rest on the wall: rolled off a flat top, fetched by the dragon's tail, fetched by the elephant's trunk.
    const rests: readonly (readonly [string, readonly string[], number])[] = [['rolled off', ['gggggg', 'gggggg', 'gggggg'], at(0, 1)], ['fetched by the dragon', ['g.g.gg', 'gggggg', 'jigszg'], at(0, 2)], ['fetched by the elephant', ['...g.g', 'gggggg', 'jigszg'], at(1, 4)]]
    for (const [name, rows, place] of rests) {
      for (const kind of ['plain', 'heavy'] as const) {
        const table = mk(rows, { rubble: EVERY_FORM })
        const box = table.boxOf(place)
        fly(table, kind, box.x + box.w / 2, box.y - BALL_R, 0, 0)
        play(table, 4.5, `a ${kind} ball at rest, ${name}`)
        if (name !== 'rolled off') expect(table.ball.state, name).toBe('resting')
      }
    }

    // Every channel the rules set is one the view reads.
    const unread = [...log.set].filter((channel) => !log.read.has(channel)).sort()
    expect(unread).toEqual([])
    // The frame's budget: under about 80 stamps, fills and strokes at its fullest.
    expect(most.draws, most.where).toBeLessThanOrEqual(80)
    expect(most.draws).toBeGreaterThan(30)
  })

  it('draws a brick where the rules meet it, all the way through a shuffle', () => {
    const table = mk(['......', '..z...', '......'])
    aim(table, at(1, 2), 'plain', 'below', -20)
    let checked = 0
    for (let frame = 0; frame < 70; frame++) {
      table.step(FRAME)
      table.sounds = []
      const place = table.wall.findIndex((brick) => brick !== null)
      const box = table.boxOf(place)
      draw(table, 'a shuffle')
      // The brick's sprite is the brick's box with its ink line round it.
      const stamps = count.stamps.filter((stamp) => stamp.plain && stamp.w === WALL.brickW + 12 && stamp.h === WALL.brickH + 12)
      if (stamps.length !== 1) continue
      expect(stamps[0].x + stamps[0].w / 2).toBeCloseTo(box.x + box.w / 2, 6)
      expect(stamps[0].y + stamps[0].h / 2).toBeCloseTo(box.y + box.h / 2, 6)
      checked += 1
    }
    expect(table.wall[at(1, 3)]?.kind).toBe('sleepy')
    expect(checked).toBeGreaterThan(20)
  })

  it('every standing brick has a mouth, and every kind flinches as the ball comes: its eyes widen and its face shrinks away, and the brick stays in its box', () => {
    const all = mk(['.jg...', '.i.z..', '.s.c.d'])
    draw(all, 'faces at rest')
    expect(view.faced.mouths).toBe(7)
    expect(view.faced.flinching).toBe(0)
    for (const letter of ['g', 'c', 'd', 'j', 'i', 's', 'z', 'Z']) {
      const table = mk(['......', `...${letter}..`, '......'])
      const box = table.boxOf(at(1, 3))
      draw(table, `${letter} at rest`)
      expect(view.faced, letter).toEqual({ mouths: 1, flinching: 0, breaths: view.faced.breaths })
      const body = count.stamps.filter((stamp) => stamp.w >= WALL.brickW && stamp.w <= WALL.brickW + 30 && Math.abs(stamp.x + stamp.w / 2 - (box.x + box.w / 2)) < 12)
      // The ball in the air, close by: the brick flinches, and its mouth is still there.
      fly(table, 'plain', box.x + box.w / 2 + 70, box.y + box.h + 40, 0, 0)
      draw(table, `${letter} flinching`)
      expect(view.faced.flinching, letter).toBe(1)
      expect(view.faced.mouths, letter).toBe(1)
      // Its body is stamped where it was: only the face moves.
      const flinched = count.stamps.filter((stamp) => stamp.w >= WALL.brickW && stamp.w <= WALL.brickW + 30 && Math.abs(stamp.x + stamp.w / 2 - (box.x + box.w / 2)) < 12)
      expect(flinched.map((stamp) => [stamp.x, stamp.y]), letter).toEqual(body.map((stamp) => [stamp.x, stamp.y]))
      // A ball that rests on the bumper frightens nobody.
      Object.assign(table.ball, { state: 'resting' })
      draw(table, `${letter} calm`)
      expect(view.faced.flinching, letter).toBe(0)
    }
  })

  it('an ice brick\'s breath shows: a puff now and then, and none from a pool or from another kind of brick', () => {
    const table = mk(['......', '..i.gp', '......'])
    let puffs = 0, frames = 0, starts = 0, was = 0
    for (let frame = 0; frame < 60 * 12; frame++) {
      table.step(FRAME)
      table.sounds = []
      draw(table, 'breath')
      expect(view.faced.breaths).toBeLessThanOrEqual(1)
      if (view.faced.breaths > was) starts += 1
      was = view.faced.breaths
      puffs += view.faced.breaths
      frames += 1
    }
    expect(starts).toBeGreaterThanOrEqual(2)
    expect(puffs).toBeGreaterThan(60)
    expect(puffs).toBeLessThan(frames / 2)
  })

  it('the dragon holds its mouth open towards the ball and opens it wider as the ball comes to its gate, and the flame it keeps trying to hide shrinks and gets out again', () => {
    const table = mk(['g.....', '......', '......'])
    let least = Infinity, most = 0, usual = 0
    for (let frame = 0; frame < 60 * 9; frame++) {
      table.step(FRAME)
      table.sounds = []
      draw(table, 'the dragon at rest')
      expect(view.dragonShows.jaw).toBeGreaterThanOrEqual(0.25)
      least = Math.min(least, view.dragonShows.flame)
      most = Math.max(most, view.dragonShows.flame)
      if (Math.abs(view.dragonShows.flame - 1) < 0.02) usual += 1
    }
    expect(least).toBeLessThan(0.3)
    expect(most).toBeGreaterThan(1.3)
    expect(usual).toBeGreaterThan(60 * 5)
    const rest = view.dragonShows.jaw
    fly(table, 'plain', FIELD.left + 60, (GATES.dragon.y0 + GATES.dragon.y1) / 2, 0, 0)
    draw(table, 'the ball at the dragon\'s gate')
    expect(view.dragonShows.jaw).toBeGreaterThan(rest + 0.2)
  })

  it('up a tall vine the ball goes round the stem: the stem is drawn over it while it is behind, and not while it is in front', () => {
    const table = mk(['......', '......', '.V....'])
    fly(table, 'plain', LANE.x, vineFoot(2) - 12, 0, -150)
    let behind = 0, front = 0, changes = 0, was = false
    for (let frame = 0; frame < 90; frame++) {
      table.step(FRAME)
      table.sounds = []
      draw(table, 'winding')
      if (table.winding === null) {
        expect(view.behindStem).toBe(false)
        continue
      }
      if (view.behindStem) behind += 1
      else front += 1
      if (view.behindStem !== was) changes += 1
      was = view.behindStem
    }
    expect(behind).toBeGreaterThan(5)
    expect(front).toBeGreaterThan(5)
    expect(changes).toBeGreaterThanOrEqual(4)
  })

  it('the shine of a wiped face is two unlike streaks: unequal in width and length, not level, and slanting differently', () => {
    expect(SHINE.length).toBe(2)
    const [[, wide, top, foot, slant], [, thin, top2, foot2, slant2]] = SHINE
    expect(wide / thin).toBeGreaterThanOrEqual(2)
    expect(Math.abs(top - top2)).toBeGreaterThanOrEqual(5)
    expect(Math.abs(foot - foot2)).toBeGreaterThanOrEqual(4)
    expect(Math.abs(slant - slant2)).toBeGreaterThanOrEqual(4)
    // Not a pair of slashes: one leans well over and the other stands nearly straight.
    expect(Math.max(Math.abs(slant), Math.abs(slant2)) / Math.max(1, Math.min(Math.abs(slant), Math.abs(slant2)))).toBeGreaterThanOrEqual(3)
  })

  it('a short vine, whether its seed stands or has gone, is a curled tendril: no hook at its foot, a tip that curls round more than once, and two leaves on opposite sides', () => {
    const foot = vineFoot(2), top = foot - 78
    const { stem, leaves } = vineLine(foot, top, 6)
    // It comes straight out of the board where it stands: no root reaches over to where the seed stood.
    expect(stem[0]).toEqual({ x: LANE.x, y: foot })
    for (const point of stem.slice(0, 4)) expect(Math.abs(point.x - LANE.x)).toBeLessThan(7)
    expect(Math.max(...stem.map((point) => point.x))).toBeLessThan(LANE.x + 22)
    // Its tip winds round a middle, inwards, for a turn and a quarter or more: a spiral, and no hook.
    expect(VINE.turns).toBeGreaterThanOrEqual(1.25)
    const tip = stem.slice(11), mid = { x: LANE.x + 6 - VINE.curl, y: top }
    let wound = 0
    for (let i = 1; i < tip.length; i++) {
      let turn = Math.atan2(tip[i].y - mid.y, tip[i].x - mid.x) - Math.atan2(tip[i - 1].y - mid.y, tip[i - 1].x - mid.x)
      if (turn > Math.PI) turn -= Math.PI * 2
      if (turn < -Math.PI) turn += Math.PI * 2
      wound += turn
    }
    expect(Math.abs(wound) / (Math.PI * 2)).toBeGreaterThanOrEqual(1.25)
    const reach = tip.map((point) => Math.hypot(point.x - mid.x, point.y - mid.y))
    for (let i = 1; i < reach.length; i++) expect(reach[i]).toBeLessThan(reach[i - 1])
    // Two leaves, unlike in size, at unlike heights, one on each side.
    expect(leaves.length).toBe(VINE.leaves)
    expect(leaves[0].side).toBe(-leaves[1].side)
    expect(Math.abs(leaves[0].y - leaves[1].y)).toBeGreaterThan(78 * 0.3)
    expect(Math.abs(leaves[0].size - leaves[1].size)).toBeGreaterThanOrEqual(0.2)
    // The stem bends both ways on its way up: it is no straight stroke.
    const sides = new Set(stem.slice(1, 10).map((point) => Math.sign(Math.round(point.x - (LANE.x + 6 * ((foot - point.y) / 78))))))
    expect(sides.has(1) && sides.has(-1)).toBe(true)
  })

  it('the runner from a standing seed to its vine lies low and nearly flat and hooks nowhere, so the vine has one curl, at its tip, and no second one to match it', () => {
    const foot = vineFoot(1)
    const [from, bend, to] = vineRunner(foot)
    // It ends in the foot of the stem, where the tendril starts.
    expect(to).toEqual(vineLine(foot, foot - 78, 0).stem[0])
    // It runs one way, from the seed to the foot, and never turns back.
    expect(from.x).toBeGreaterThan(bend.x)
    expect(bend.x).toBeGreaterThan(to.x)
    // It sags by a few units and rises nowhere above its ends by more: no hook.
    const ys = [0, 0.25, 0.5, 0.75, 1].map((t) => (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * bend.y + t * t * to.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(12)
    expect(from.x - to.x).toBeGreaterThan((Math.max(...ys) - Math.min(...ys)) * 4)
    // The tip winds a turn and a half; the runner turns through less than a quarter of one.
    const between = Math.abs(Math.atan2(bend.y - from.y, bend.x - from.x) - Math.atan2(to.y - bend.y, to.x - bend.x))
    const turned = Math.min(between, Math.PI * 2 - between)
    expect(turned).toBeLessThan(Math.PI / 2)
    expect(VINE.turns * Math.PI * 2).toBeGreaterThan(turned * 4)
  })

  it('the dragon\'s tail ends in a tuft: a bunch of round lobes of unlike sizes round the tip, with no corner and no one way it points', () => {
    expect(TUFT.length).toBeGreaterThanOrEqual(4)
    // Unlike sizes, and none of them small enough to be a point.
    expect(new Set(TUFT.map((lobe) => lobe.r)).size).toBe(TUFT.length)
    for (const lobe of TUFT) expect(lobe.r).toBeGreaterThanOrEqual(5)
    // They sit all round the tip: ahead of it, behind it and to both sides, so the bunch reaches about as far every way.
    const reach = (way: number) => Math.max(...TUFT.map((lobe) => Math.cos(lobe.turn - way) * lobe.far + lobe.r))
    const reaches = [0, Math.PI / 2, Math.PI, -Math.PI / 2].map(reach)
    expect(Math.max(...reaches) / Math.min(...reaches)).toBeLessThan(1.5)
    // Every lobe overlaps another: it is one bunch.
    for (const lobe of TUFT) {
      const at = { x: Math.cos(lobe.turn) * lobe.far, y: Math.sin(lobe.turn) * lobe.far }
      expect(TUFT.some((other) => other !== lobe && Math.hypot(Math.cos(other.turn) * other.far - at.x, Math.sin(other.turn) * other.far - at.y) < other.r + lobe.r)).toBe(true)
    }
  })

  it('the scorch round the dragon\'s feet is a smudge laid behind the spare ball: nothing of it lies ahead of the ball, and its blots are uneven', () => {
    const feet = { x: 100, y: 400, rx: 96, ry: 14 }
    const angle = (blot: { x: number; y: number }) => (Math.atan2((blot.y - feet.y) / feet.ry, (blot.x - feet.x) / feet.rx) + Math.PI * 2) % (Math.PI * 2)
    // Before the ball is on the ring there is no mark, and the mark grows with the ball.
    expect(scorchedTo(0.2)).toBe(0)
    expect(scorch(feet, scorchedTo(0.2))).toEqual([])
    let last = 0
    for (let spare = 0.2; spare <= 0.85; spare += 0.01) {
      const to = scorchedTo(spare), blots = scorch(feet, to)
      expect(blots.length).toBeGreaterThanOrEqual(last)
      last = blots.length
      // Every blot is where the ball has been.
      for (const blot of blots) expect(angle(blot)).toBeLessThan(to * Math.PI * 2)
    }
    // Once the ball is round, and after it is swallowed, the whole mark lies there and fades.
    expect(scorchedTo(0.9)).toBe(1)
    expect(scorchedTo(0)).toBe(1)
    const whole = scorch(feet, 1)
    expect(whole.length).toBe(SCORCH_BLOTS)
    // A smudge: blots of many sizes, no two beside each other alike, and none on the ball's exact path twice running.
    expect(new Set(whole.map((blot) => blot.r)).size).toBeGreaterThanOrEqual(8)
    for (let i = 1; i < whole.length; i++) expect(whole[i].r).not.toBe(whole[i - 1].r)
    const off = whole.map((blot) => Math.hypot((blot.x - feet.x) / feet.rx, (blot.y - feet.y) / feet.ry))
    expect(new Set(off.map((value) => value.toFixed(3))).size).toBeGreaterThanOrEqual(4)
    // Each blot overlaps the next: it is one smear, with no gaps to read as dashes.
    for (let i = 1; i < whole.length; i++) expect(Math.hypot(whole[i].x - whole[i - 1].x, whole[i].y - whole[i - 1].y)).toBeLessThan(whole[i].r + whole[i - 1].r)
  })

  it('in the hot showing the scorch is drawn only behind the spare ball, and over a cleared wall the three toys look to the folded wall and then to the sheet', () => {
    const showing = new Table({ ...freshSave(null), position: 'ice', wall: layWall('ice', 1) }, 1)
    showing.press(TOYS.elephant.x + 100, TOYS.elephant.y + 200)
    showing.lift()
    let rolled = 0
    for (let frame = 0; frame < 60 * 7; frame++) {
      showing.step(FRAME)
      showing.sounds = []
      draw(showing, 'the hot showing')
      const pose = showing.pose('dragon'), spare = pose.get('spare')
      // While the ball is on its way round, the mark is not whole.
      if (pose.get('scorched') > 0.03 && spare > 0.22 && spare < 0.8) {
        rolled += 1
        expect(scorch({ x: 0, y: 0, rx: 96, ry: 14 }, scorchedTo(spare)).length).toBeLessThan(SCORCH_BLOTS)
      }
    }
    expect(rolled).toBeGreaterThan(40)
    expect(showing.toSave().shown).toContain('hot-gate')

    const table = mk(['......', '......', '..c...'], { position: 'jelly' })
    aim(table, at(2, 2), 'plain')
    for (let frame = 0; frame < 60 * 9; frame++) {
      table.step(FRAME)
      table.sounds = []
      draw(table, 'a cleared wall')
    }
    expect(table.finished).toBe(true)
    expect(table.ball.state).toBe('resting')
    const corner = { x: FOLDED.x + FOLDED.w * 0.8, y: FOLDED.y + FOLDED.h }
    for (const toy of ['dragon', 'walrus', 'elephant'] as const) expect(view.looksAt[toy], toy).toEqual(corner)
    table.press(BELL.x, BELL.y)
    table.lift()
    let onSheet = 0
    for (let frame = 0; frame < 60 * 5 && table.busy; frame++) {
      table.step(FRAME)
      table.sounds = []
      draw(table, 'the unfolding, watched')
      if (!view.order.includes('sheet')) continue
      const foot = view.looksAt.elephant
      if (foot.x === WALL.left + (WALL.cols * WALL.cellW) / 2 && foot.y > WALL.top && foot.y <= WALL.top + WALL.rows * WALL.cellH) onSheet += 1
    }
    expect(onSheet).toBeGreaterThan(30)
    // The wall stands: they look at the ball again.
    for (let frame = 0; frame < 90; frame++) {
      table.step(FRAME)
      table.sounds = []
      draw(table, 'the new wall')
    }
    for (const toy of ['dragon', 'walrus', 'elephant'] as const) expect(Math.hypot(view.looksAt[toy].x - table.ball.x, view.looksAt[toy].y - table.ball.y), toy).toBeLessThan(BALL_R * 2)
  })

  it('a pool and a vine the last wall left are drawn until the shadow of the folded wall has swept them, and not after', () => {
    const wall = wallOf(['......', '...p..', '..c...'])
    wall[at(1, 0)] = { kind: 'seed', state: 'vine', browned: false, gone: true }
    const table = mk([], { wall, position: 'glass' })
    aim(table, at(2, 2), 'plain')
    for (let frame = 0; frame < 60 * 6; frame++) table.step(FRAME)
    expect(table.finished).toBe(true)
    table.press(BELL.x, BELL.y)
    table.lift()
    const seen = { pool: 0, vine: 0, late: 0 }
    for (let frame = 0; frame < 60 * 4; frame++) {
      table.step(FRAME)
      table.sounds = []
      draw(table, 'the old wall swept')
      if (view.order.includes('old pool')) seen.pool += 1
      if (view.order.includes('old vine')) seen.vine += 1
      if (frame > 50 && (view.order.includes('old pool') || view.order.includes('old vine'))) seen.late += 1
    }
    // The vine stands at the left, where the sweep starts, and the pool further along: the pool is seen for longer.
    expect(seen.vine).toBeGreaterThan(10)
    expect(seen.pool).toBeGreaterThan(seen.vine)
    expect(seen.late).toBe(0)
  })

  it('the walrus\'s flippers never meet: one comes down on its belly or to its chest, and the other does not leave the rim, whatever the walrus does', () => {
    const rest = flippers(0, 0)
    for (const pat of [0, 0.5, 1, 1.3, 2]) {
      for (const rub of [0, 0.5, 1, 1.3]) {
        const at = flippers(pat, rub)
        expect(at.left).toEqual(rest.left)
        expect(Math.hypot(at.right.dx - at.left.dx, at.right.dy - at.left.dy)).toBeGreaterThan(80)
      }
    }
    // Through a whole clearing by a plain ball and by a wet ball into a pool beside a sleepy brick, as drawn.
    for (const [rows, kind, place] of [[['......', '......', '..c...'], 'plain', at(2, 2)], [['......', '......', '.pz...'], 'wet', at(2, 1)], [['......', '......', '..i...'], 'hot', at(2, 2)]] as const) {
      const table = mk(rows, { position: 'jelly' })
      aim(table, place, kind)
      let down = 0
      const look = () => {
        expect(view.walrusShows.left).toEqual(rest.left)
        expect(Math.hypot(view.walrusShows.right.dx - view.walrusShows.left.dx, view.walrusShows.right.dy - view.walrusShows.left.dy)).toBeGreaterThan(80)
        down = Math.max(down, rest.right.dy - view.walrusShows.right.dy)
      }
      for (let frame = 0; frame < 60 * 7; frame++) {
        table.step(FRAME)
        table.sounds = []
        draw(table, 'a clearing')
        look()
      }
      expect(table.finished).toBe(true)
      table.press(BELL.x, BELL.y)
      table.lift()
      for (let frame = 0; frame < 60 * 5; frame++) {
        table.step(FRAME)
        table.sounds = []
        draw(table, 'the unfolding')
        look()
      }
      // No toy answers a clearing: through all of it the flipper stayed on the rim.
      expect(down, kind).toBeLessThan(1)
    }
    // Under a finger it slaps its belly, with the one flipper.
    const poked = mk(['g.....', '......', '......'])
    poked.press(TOYS.walrus.x + 100, TOYS.walrus.y + 150)
    poked.lift()
    let slapped = 0
    for (let frame = 0; frame < 60; frame++) {
      poked.step(FRAME)
      poked.sounds = []
      draw(poked, 'a poke')
      expect(view.walrusShows.left).toEqual(rest.left)
      slapped = Math.max(slapped, rest.right.dy - view.walrusShows.right.dy)
    }
    expect(slapped).toBeGreaterThan(15)
  })

  it('in the unfolding the sheet is drawn under the bricks that stand up from it, in every frame', () => {
    const table = mk(['......', '......', '..c...'], { position: 'jelly' })
    aim(table, at(2, 2), 'plain')
    for (let frame = 0; frame < 40; frame++) table.step(FRAME)
    expect(table.finished).toBe(true)
    table.press(BELL.x, BELL.y)
    table.lift()
    let withBoth = 0
    for (let frame = 0; frame < 60 * 4 && table.busy; frame++) {
      table.step(FRAME)
      table.sounds = []
      draw(table, 'the unfolding')
      if (!view.order.includes('sheet')) continue
      const bricks = view.order.filter((what) => what === 'brick').length
      if (bricks > 0) withBoth += 1
      expect(view.order[0]).toBe('sheet')
      expect(view.order.lastIndexOf('sheet')).toBe(0)
    }
    expect(withBoth).toBeGreaterThan(20)
  })

  it('the bricks a rolling ball passes flinch from it, and the toy that fetches a ball is seen to reach for it before the ball is lifted', () => {
    const rolls = mk(['gggggg', 'gggggg', 'gggggg'])
    const top = rolls.boxOf(at(0, 1))
    fly(rolls, 'plain', top.x + top.w / 2, top.y - BALL_R, 0, 0)
    let flinched = 0
    for (let frame = 0; frame < 60 * 4; frame++) {
      rolls.step(FRAME)
      rolls.sounds = []
      draw(rolls, 'rolling off')
      if (rolls.rolling) flinched = Math.max(flinched, view.faced.flinching)
    }
    expect(flinched).toBeGreaterThan(0)
    for (const [rows, place, toy] of [[['g.g.gg', 'gggggg', '......'], at(0, 2), 'dragon'], [['...g.g', 'gggggg', '......'], at(1, 4), 'elephant']] as const) {
      const table = mk(rows)
      const box = table.boxOf(place)
      fly(table, 'plain', box.x + box.w / 2, box.y - BALL_R, 0, 0)
      let before = 0, during = 0, nearest = Infinity
      for (let frame = 0; frame < 60 * 6 && table.ball.state !== 'resting'; frame++) {
        table.step(FRAME)
        table.sounds = []
        draw(table, `fetched by the ${toy}`)
        if (!table.fetching) {
          // Nothing reaches for a ball that has not come to rest; when it is set down, the tail or the trunk is still drawing back.
          if (during === 0) expect(view.reaching).toBe(null)
          continue
        }
        expect(table.fetching).toBe(toy)
        if (!table.lifted) {
          // Its tail or its trunk comes out over the table first, on its way to the ball.
          if (view.reaching?.toy === toy) before += 1
        } else {
          expect(view.reaching?.toy).toBe(toy)
          during += 1
          // The tip of the tail or the trunk is at the ball it carries.
          nearest = Math.min(nearest, Math.hypot(view.reaching!.x - table.ball.x, view.reaching!.y - table.ball.y))
          expect(Math.hypot(view.reaching!.x - table.ball.x, view.reaching!.y - table.ball.y)).toBeLessThan(BALL_R * 2.5)
        }
      }
      expect(table.ball.state).toBe('resting')
      expect(before).toBeGreaterThan(5)
      expect(during).toBeGreaterThan(20)
      expect(nearest).toBeLessThan(BALL_R * 2)
    }
  })

  it('a vine whose seed has gone is drawn, and its seed is not', () => {
    const table = mk(['......', '......', '.V....'])
    draw(table, 'a vine and its seed')
    const withSeed = count.draws
    expect(view.faced.mouths).toBe(1)
    const gone = mk(['......', '......', '.V....'])
    const seed = gone.wall[at(2, 1)]
    if (seed?.kind === 'seed') seed.gone = true
    const found = watched({ ...gone.toSave() }, log)
    draw(found, 'a vine without its seed')
    expect(view.faced.mouths).toBe(0)
    const vineOnly = count.draws
    expect(vineOnly).toBeLessThan(withSeed)
    // The vine is still drawn: more than the bare table shows.
    draw(mk(['......', '......', '......']), 'no vine')
    expect(vineOnly).toBeGreaterThan(count.draws)
  })

  it.each([[820, 1180], [1024, 768], [667, 375]])('on a surface of %i by %i the one board stamp covers the whole surface: no band is left blank', (width, height) => {
    const seen: Count = { draws: 0, full: 0, stamps: [] }
    const other = new TableView(surface(seen) as unknown as HTMLCanvasElement)
    other.setTier(TIERS[0])
    other.resize(width, height, 2)
    other.draw(mk(['g.....', '......', '......']), null)
    const by = fit(width, height)
    const board = seen.stamps[0]
    // In stage units the surface runs from minus the band to the stage's size plus the band, each way.
    expect(board.x).toBeCloseTo(-by.x / by.scale, 6)
    expect(board.y).toBeCloseTo(-by.y / by.scale, 6)
    expect(board.w).toBeCloseTo(width / by.scale, 6)
    expect(board.h).toBeCloseTo(height / by.scale, 6)
    expect(seen.stamps.filter((stamp) => stamp.w * stamp.h >= STAGE.width * STAGE.height * 0.5).length).toBe(1)
  })

  it('a tier without lights draws no more than one with them', () => {
    const table = mk(['.jJgcd', '.ViIpz', '.gZkgi'], { rubble: EVERY_FORM, ball: 'hot' })
    draw(table, 'lights', { glow: 1, demo: 0.3, demoIndex: 0 })
    const lit = count.draws
    view.setTier(TIERS[TIERS.length - 1])
    draw(table, 'no lights', { glow: 1, demo: 0.3, demoIndex: 0 })
    expect(count.draws).toBeLessThanOrEqual(lit)
    view.setTier(TIERS[0])
  })
})
