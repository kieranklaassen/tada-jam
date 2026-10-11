import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { KIND, widthOf, type Kind } from './kinds'
import { GATE, STREET } from './places'
import { Play, type Cue, type Thing, type World } from './play'
import { deserialize, serialize, type Saved } from './save'
import { Scene, sceneLength } from './scene'
import { FLOAT_SECONDS, Stage, arrivals, enterBeats, enterOutcome, floatBeats, floatOutcome, nextSeed, showWaiting, waitingOf, waysIn } from './scenes'
import { HOLE_START, STOCK, layStreet } from './street'
import { notesOf } from './voices'

const FRAME = 1 / 60
const world = (over: Partial<World> = {}): World => ({ hole: { x: 0, z: 0.5 }, belly: [], breath: [], street: [], ...over })
const sorted = (kinds: readonly Kind[]): Kind[] => [...kinds].sort()

/** A street with everything on the breath, the hole just gone from under it: the float as the Mount starts it. */
function floating(position = 'few', seed = 3): { state: Saved; play: Play; stage: Stage; scene: Scene; beats: ReturnType<typeof floatBeats>; parts: Kind[] } {
  const parts = [...STOCK[position]]
  const play = new Play(world({ breath: parts }))
  play.press({ on: 'street', x: -4.5, z: 1.5 })
  let cue: (Cue & { type: 'float' }) | null = null
  for (let i = 0; i < 60 && !cue; i++) {
    play.step(FRAME)
    for (const one of play.cues) if (one.type === 'float') cue = one
    play.cues.length = 0
  }
  if (!cue) throw new Error('no float')
  const before: Saved = { v: 1, position, finished: false, seed, ...play.world() }
  const state = floatOutcome(before), stage = new Stage()
  const beats = floatBeats(stage, play, cue.parts, { x: cue.x, z: cue.z }, waitingOf(state.position, state.seed))
  const scene = new Scene(beats)
  scene.start(0, () => {})
  return { state: { ...state, ...play.world() }, play, stage, scene, beats, parts }
}

/** A bare, finished street, the gate keeper just touched: the coming in as the Mount starts it. */
function entering(position = 'some', seed = 9, hole = { x: -3, z: 1 }): { state: Saved; play: Play; stage: Stage; scene: Scene; beats: ReturnType<typeof enterBeats> } {
  const play = new Play(world({ hole }))
  const finished: Saved = { v: 1, position, finished: true, seed, ...play.world() }
  const stage = new Stage()
  showWaiting(stage, position, seed)
  const state = enterOutcome(finished, play)
  const beats = enterBeats(stage, play, 0.8)
  const scene = new Scene(beats)
  scene.start(0, () => {})
  return { state: { ...state, ...play.world() }, play, stage, scene, beats }
}

/** Plays a scene for `seconds` from `from`, a frame at a time, and hands back what was heard. */
function watch(scene: Scene, play: Play, from: number, seconds: number, each: (time: number, cues: readonly Cue[]) => void = () => {}): Cue[] {
  const heard: Cue[] = []
  for (let time = from; time < from + seconds; time += FRAME) {
    play.step(FRAME)
    scene.update(time)
    const cues = play.cues.splice(0)
    heard.push(...cues)
    each(time, cues)
  }
  return heard
}

describe('what the float saves when it starts', () => {
  it('the street is finished, the set for the street that waits is one step fuller, and its seed is new', () => {
    const before = { v: 1 as const, position: 'few', finished: false, seed: 3 }
    expect(floatOutcome(before)).toEqual({ v: 1, position: 'some', finished: true, seed: nextSeed(3) })
    expect(floatOutcome({ ...before, position: 'many' }).position).toBe('many')
    expect(nextSeed(3)).not.toBe(3)
    expect(Number.isInteger(nextSeed(4294967295))).toBe(true)
    expect(nextSeed(4294967295)).toBeGreaterThanOrEqual(0)
  })

  it('once: a float that is already saved moves nothing again', () => {
    const once = floatOutcome({ v: 1 as const, position: 'few', finished: false, seed: 3 })
    expect(floatOutcome(once)).toBe(once)
  })

  it('from its first moment the record is a bare finished street, and put away at any frame of the scene it is found so', () => {
    const { state, play, scene } = floating()
    const written = JSON.stringify(serialize(state))
    expect(state).toMatchObject({ finished: true, position: 'some', belly: [], breath: [], street: [] })
    // The hole glides on to where it was called, as it does at any time; nothing else in the record moves.
    watch(scene, play, 0, FLOAT_SECONDS + 0.5, () => {
      expect(JSON.stringify(serialize({ ...state, ...play.world(), hole: state.hole }))).toBe(written)
    })
    const found = deserialize(JSON.parse(written), 4, 99)
    expect(found).toEqual(state)
    expect(new Play(found).bare).toBe(true)
  })

  it('found again, the bare street shows the gate shut and the same two things waiting that the scene ends on', () => {
    const { state, play, stage, scene } = floating()
    watch(scene, play, 0, FLOAT_SECONDS + 0.5)
    const found = new Stage()
    showWaiting(found, state.position, state.seed)
    expect({ gate: found.gate, float: found.float, waiting: found.waiting, stepped: found.stepped }).toEqual({ gate: stage.gate, float: stage.float, waiting: stage.waiting, stepped: stage.stepped })
    expect(found.gate).toBe(0)
  })
})

describe('the float goes out', () => {
  it('lasts between four and ten seconds', () => {
    const { beats } = floating()
    expect(sceneLength(beats)).toBeCloseTo(FLOAT_SECONDS, 5)
    expect(FLOAT_SECONDS).toBeGreaterThanOrEqual(4)
    expect(FLOAT_SECONDS).toBeLessThanOrEqual(10)
  })

  it('each thing clacks down once as the tower tips, and sounds once as it passes the gate post, bottom thing first: the tune is the child\'s own order', () => {
    const { play, scene, parts } = floating()
    const heard = watch(scene, play, 0, FLOAT_SECONDS + 0.5)
    expect(heard.filter((cue) => cue.type === 'clack').map((cue) => cue.type === 'clack' && cue.kind)).toEqual(parts)
    expect(heard.filter((cue) => cue.type === 'pass').map((cue) => cue.type === 'pass' && cue.kind)).toEqual(parts)
    expect(heard.filter((cue) => cue.type === 'gate')).toEqual([{ type: 'gate', open: true }, { type: 'gate', open: false }])
  })

  it('the thud and the scraps of the tower come in the frame it touches down, not when the hole lets it go', () => {
    const { play, stage, scene } = floating()
    // The cue that started the scene is silent: the tower still hangs.
    expect(notesOf({ type: 'float', parts: ['pie'], x: 0, z: 0 })).toEqual([])
    let before = Infinity, thuds = 0
    watch(scene, play, 0, 1.5, (_, cues) => {
      const foot = stage.float!.tower ? stage.float!.parts[0].y : 0
      for (const cue of cues) {
        if (cue.type !== 'thud') continue
        thuds += 1
        // This frame its foot is on the street, and the frame before it was not.
        expect(foot).toBe(0)
        expect(before).toBeGreaterThan(0)
        expect(stage.float!.squash).toBeGreaterThan(0.9)
        expect(notesOf(cue).every((note) => (note.delay ?? 0) === 0)).toBe(true)
      }
      // And it lands in no frame without its thud.
      if (foot === 0 && before > 0) expect(cues.some((cue) => cue.type === 'thud')).toBe(true)
      before = foot
    })
    expect(thuds).toBe(1)
  })

  it('the gate\'s clunk is heard in the frame its leaves meet, and a touch that ends the scene shuts it without one', () => {
    const { play, stage, scene } = floating()
    let before = 0, clunks = 0
    watch(scene, play, 0, FLOAT_SECONDS + 0.5, (_, cues) => {
      for (const cue of cues) {
        if (cue.type !== 'clunk') continue
        clunks += 1
        expect(stage.gate).toBe(0)
        expect(before).toBeGreaterThan(0)
      }
      if (stage.gate === 0 && before > 0) expect(cues.map((cue) => cue.type), `at ${_}, before ${before}`).toContain('clunk')
      before = stage.gate
    })
    expect(clunks).toBe(1)
    const ended = floating()
    watch(ended.scene, ended.play, 0, 4)
    ended.scene.finish()
    expect(ended.stage.gate).toBe(0)
    expect(ended.play.cues).toEqual([])
  })

  it('drops where it hung, lies down as one long float with its bottom thing in front, and every thing goes out through the gate', () => {
    const { play, stage, scene, parts } = floating()
    watch(scene, play, 0, 0.1)
    const hung = stage.float!.parts.map((part) => ({ x: part.x, z: part.z }))
    // It still stands as the tower it was until it tips.
    expect(stage.float!.tower).toBe(true)
    for (const at of hung) expect(at).toEqual(hung[0])
    watch(scene, play, 0.1, 2.62)
    // Lying in a line along the street, the bottom thing nearest the gate, each behind the one before, all inside the kerbs.
    const line = stage.float!.parts
    expect(stage.float!.tower).toBe(false)
    for (let i = 1; i < line.length; i++) {
      expect(line[i].x).toBeLessThan(line[i - 1].x)
      expect(line[i].z).toBeCloseTo(line[0].z, 5)
      expect(line[i].lean).toBeGreaterThan(0)
    }
    expect(line[0].x).toBeCloseTo(GATE.x, 5)
    expect(line[line.length - 1].x).toBeGreaterThan(STREET.x0)
    let widest = 0
    watch(scene, play, 2.72, FLOAT_SECONDS, () => {
      widest = Math.max(widest, stage.gate)
      // Nothing of the float crosses the far kerb anywhere but between the gate posts.
      for (const part of stage.float?.parts ?? []) if (part.z < STREET.z0 - 0.2) expect(Math.abs(part.x - GATE.x)).toBeLessThan(GATE.half - KIND[part.kind].width / 2 + 0.3)
    })
    expect(widest).toBe(1)
    expect(stage.float).toBeNull()
    expect(stage.gate).toBe(0)
    expect(stage.waiting.length).toBeGreaterThan(0)
    expect(stage.stepped).toBe(1)
    expect(parts.length).toBe(line.length)
  })

  it('the gate is open before the first thing reaches it and shuts only when the last is through', () => {
    const { play, stage, scene } = floating()
    watch(scene, play, 0, FLOAT_SECONDS + 0.5, () => {
      for (const part of stage.float?.parts ?? []) {
        if (part.z < STREET.z0 - 0.6 && part.z > GATE.z - 0.6 && part.size > 0.05) expect(stage.gate).toBeGreaterThan(0.95)
      }
    })
  })

  it('its going out is heard: the bottom thing\'s wheels or feet at every second step of the roll, from the moment it sets off until it is through the gate', () => {
    for (const position of ['few', 'many']) {
      const { play, scene, parts } = floating(position)
      const heard: { time: number; cue: Cue }[] = []
      watch(scene, play, 0, FLOAT_SECONDS + 0.5, (time) => { /* filled below */ void time })
      const again = floating(position)
      for (let time = 0; time < FLOAT_SECONDS + 0.5; time += FRAME) {
        again.play.step(FRAME)
        again.scene.update(time)
        for (const cue of again.play.cues) heard.push({ time, cue })
        again.play.cues.length = 0
      }
      const rolls = heard.filter((one) => one.cue.type === 'roll')
      // The bottom thing's, counted up from the first, and only while the float rolls: after the gate has opened and before it shuts.
      expect(rolls.map((one) => one.cue.type === 'roll' && one.cue.kind), position).toEqual(rolls.map(() => parts[0]))
      expect(rolls.map((one) => one.cue.type === 'roll' && one.cue.step), position).toEqual(rolls.map((_, index) => index))
      expect(rolls.length, position).toBeGreaterThanOrEqual(3)
      const opened = heard.find((one) => one.cue.type === 'gate' && one.cue.open)!.time, shut = heard.find((one) => one.cue.type === 'gate' && !one.cue.open)!.time
      expect(rolls[0].time, position).toBeGreaterThan(opened)
      expect(rolls[rolls.length - 1].time, position).toBeLessThan(shut)
      // Unhurried: never two in one frame, and no more than five a second.
      for (let index = 1; index < rolls.length; index++) expect(rolls[index].time - rolls[index - 1].time, position).toBeGreaterThan(0.19)
      void play
    }
  })

  it('any touch ends it at once and without a sound, with everything where it was going', () => {
    for (const at of [0.2, 1.3, 2.8, 4.5, 7.2]) {
      const { play, stage, scene } = floating()
      watch(scene, play, 0, at)
      scene.finish()
      expect(play.cues, `at ${at}`).toEqual([])
      expect(scene.running).toBe(false)
      expect(stage.float).toBeNull()
      expect(stage.gate).toBe(0)
      expect(stage.stepped).toBe(1)
      expect(stage.waiting.length).toBeGreaterThan(0)
    }
  })
})

describe('a finger on the gate', () => {
  it('rattles its bars as it sounds, on any street, and nothing else does', () => {
    const stage = new Stage()
    const others: Cue[] = [{ type: 'bystander', who: 'keeper', head: -1 }, { type: 'bystander', who: 'mayor', head: -1 }, { type: 'bystander', who: 'crowd', head: 2 }, { type: 'gate', open: true }, { type: 'slide' }]
    for (const cue of others) stage.hear(cue)
    expect(stage.rattle).toBe(0)
    // An ordinary street, with things on it: the model's own cue for a finger on the gate.
    const play = new Play(world({ street: layStreet('some', 3) }))
    play.press({ on: 'gate', x: GATE.x, z: STREET.z0 })
    expect(play.cues).toContainEqual({ type: 'bystander', who: 'gate', head: -1 })
    for (const cue of play.cues) stage.hear(cue)
    expect(stage.rattle).toBe(1)
    // It dies away in about half a second.
    for (let i = 0; i < 40; i++) stage.step(FRAME)
    expect(stage.rattle).toBe(0)
  })
})

describe('what waits behind the bars', () => {
  it('is two things of the street that will come in, which stand side by side between the gate posts', () => {
    for (const id of LADDER) {
      for (let seed = 0; seed < 12; seed++) {
        const pair = waitingOf(id, seed)
        expect(pair).toHaveLength(2)
        const stock = [...STOCK[id]]
        for (const kind of pair) expect(stock.splice(stock.indexOf(kind), 1)).toEqual([kind])
        expect(KIND[pair[0]].width + KIND[pair[1]].width).toBeLessThan(GATE.half * 2 - 0.4)
      }
    }
    expect(waitingOf('few', 7)).toEqual(waitingOf('few', 7))
  })
})

describe('what the coming in saves when it starts', () => {
  it('the street is begun, every thing of its set alone on its spot and the hole at its place by the gate end', () => {
    const { state, play } = entering('some', 9)
    expect(state.finished).toBe(false)
    expect(state.position).toBe('some')
    expect(sorted(state.street.map((standing) => standing.parts[0]))).toEqual(sorted(STOCK.some))
    expect(state.street).toEqual(layStreet('some', 9, { ...HOLE_START, mouth: play.wants }))
    expect(state.hole).toEqual({ x: HOLE_START.x, z: HOLE_START.z })
    expect(state.belly).toEqual([])
    expect(state.breath).toEqual([])
  })

  it('put away at any frame of the scene, the street is found whole with every thing standing on its spot and nothing coming', () => {
    const { state, play, scene, beats } = entering()
    const written = JSON.stringify(serialize(state))
    watch(scene, play, 0, sceneLength(beats) + 0.5, () => {
      expect(JSON.stringify(serialize({ ...state, ...play.world() }))).toBe(written)
    })
    const found = new Play(deserialize(JSON.parse(written), null, 1))
    expect(found.things).toHaveLength(STOCK.some.length)
    for (const thing of found.things) expect(thing).toMatchObject({ away: false, coming: false, sx: thing.x, sz: thing.z })
  })
})

describe('the next street comes in', () => {
  it('is over within ten seconds on the fullest street', () => {
    expect(sceneLength(entering('many').beats)).toBeLessThanOrEqual(10)
    expect(sceneLength(entering('few').beats)).toBeGreaterThanOrEqual(3)
  })

  it('the gate opens, the things come one at a time, widest first, each stopping on its spot with its own sound, and the gate shuts', () => {
    const { play, stage, scene, beats } = entering()
    const order = arrivals(play.things).map((thing) => thing.parts[0])
    for (let i = 1; i < order.length; i++) expect(KIND[order[i]].width).toBeLessThanOrEqual(KIND[order[i - 1]].width)
    let most = 0
    const heard = watch(scene, play, 0, sceneLength(beats) + 0.5, () => {
      // No more than two are between the gate and their spots at once.
      most = Math.max(most, play.things.filter((thing) => thing.coming && !thing.away).length)
    })
    expect(heard.filter((cue) => cue.type === 'arrive').map((cue) => cue.type === 'arrive' && cue.kind)).toEqual(order)
    expect(heard[0]).toEqual({ type: 'gate', open: true })
    // The gate shuts with a creak, and its clunk is the last thing heard.
    expect(heard.slice(-2)).toEqual([{ type: 'gate', open: false }, { type: 'clunk' }])
    expect(heard.filter((cue) => cue.type === 'step').length).toBeGreaterThanOrEqual(order.length * 2)
    expect(most).toBeLessThanOrEqual(2)
    expect(stage.gate).toBe(0)
    expect(stage.waiting).toEqual([])
    for (const thing of play.things) expect(thing).toMatchObject({ away: false, coming: false, sx: thing.x, sz: thing.z, leap: 0, size: 1 })
  })

  it('the gate\'s clunk is heard in the frame its leaves meet as the street has come in, and a hop or a bounce on the way in is heard as it lands', () => {
    const { play, stage, scene, beats } = entering()
    let before = 0, clunks = 0
    const gaits = new Map<Thing, number>()
    let landings = 0
    watch(scene, play, 0, sceneLength(beats) + 0.5, (_, cues) => {
      for (const cue of cues) {
        if (cue.type !== 'clunk') continue
        clunks += 1
        expect(stage.gate).toBe(0)
        expect(before).toBeGreaterThan(0)
      }
      if (stage.gate === 0 && before > 0) expect(cues.map((cue) => cue.type)).toContain('clunk')
      before = stage.gate
      // The hat hops in and a balloon bounces in: each step of theirs is heard in the frame it has landed, and no step in the air.
      for (const thing of play.things) {
        if (thing.parts[0] !== 'hat' && thing.parts[0] !== 'balloon') continue
        const was = gaits.get(thing) ?? 0, steps = cues.filter((cue) => cue.type === 'step' && cue.parts === thing.parts).length
        // On its spot its gait is back at 0: the last step landed in that frame.
        const landed = thing.coming ? Math.floor(thing.gait) - Math.floor(was) : was > 0 ? 1 : 0
        expect(steps, `${thing.parts[0]} at ${_}`).toBe(Math.max(0, landed))
        landings += steps
        gaits.set(thing, thing.coming ? thing.gait : 0)
      }
    })
    expect(clunks).toBe(1)
    expect(landings).toBeGreaterThanOrEqual(6)
  })

  it('the first thing waits for the hole to have glided out of its way', () => {
    const { play, scene } = entering('some', 9, { x: 4.5, z: -1.2 })
    let came = Infinity
    watch(scene, play, 0, 3, (time) => { if (came === Infinity && play.things.some((thing) => !thing.away)) came = time })
    expect(came).toBeGreaterThanOrEqual(0.8 - FRAME)
  })

  it('nothing passes through anything: a thing on its way stays clear of every thing already standing and of the hole', () => {
    for (const id of LADDER) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const { play, scene, beats } = entering(id, seed, { ...HOLE_START })
        expect(waysIn(play.things, { x: play.x, z: play.z, mouth: play.mouth }).some((way) => way.over), `${id} ${seed}`).toBe(false)
        watch(scene, play, 0, sceneLength(beats) + 0.2, () => {
          for (const thing of play.things) {
            if (thing.away || !thing.coming || thing.sz < STREET.z0) continue
            const wide = widthOf(thing.parts)
            for (const other of play.things) {
              if (other === thing || other.away || other.coming) continue
              expect(Math.hypot(other.sx - thing.sx, other.sz - thing.sz) - (wide + widthOf(other.parts)) / 2, `${id} ${seed}: ${thing.parts[0]} past ${other.parts[0]}`).toBeGreaterThanOrEqual(0)
            }
            expect(Math.hypot(play.x - thing.sx, play.z - thing.sz) - (wide + play.mouth) / 2, `${id} ${seed}: ${thing.parts[0]} past the hole`).toBeGreaterThanOrEqual(0)
          }
        })
      }
    }
  })

  it('a thing still on its way is not eaten, and one that has stopped can be', () => {
    const { play, scene, beats } = entering('few', 4)
    watch(scene, play, 0, 1.2)
    expect(play.nearestThatFits()).toBeNull()
    watch(scene, play, 1.2, sceneLength(beats))
    expect(play.nearestThatFits()?.parts).toEqual(['pie'])
  })

  it('a touch during the coming in does not free the hole in the middle of its glide: ended whole, the hole lies at its place, clear of every thing, and a touch aimed elsewhere eats nothing', () => {
    let gliding = 0
    for (const seed of [1, 4, 9, 12]) {
      for (const at of [0.05, 0.15, 0.3]) {
        const { state, play, scene } = entering('many', seed, { x: -6, z: 2 })
        watch(scene, play, 0, at)
        if (Math.hypot(play.x - state.hole.x, play.z - state.hole.z) > 0.5) gliding += 1
        // As the Mount ends it: every beat landed, then the hole.
        scene.finish()
        play.arrive()
        const label = `seed ${seed} at ${at}`
        expect([play.x, play.z], label).toEqual([state.hole.x, state.hole.z])
        for (const thing of play.things) expect(Math.hypot(thing.x - play.x, thing.z - play.z), label).toBeGreaterThan((play.mouth + widthOf(thing.parts)) / 2)
        // The touch that ended it was aimed at the far kerb beside the hole: the hole goes there and nothing goes in.
        play.press({ on: 'street', x: play.x - 0.3, z: STREET.z0 })
        play.tap()
        const count = play.things.length
        const heard = watch(scene, play, at, 1)
        expect(heard.filter((cue) => cue.type === 'drop'), label).toEqual([])
        expect(play.things, label).toHaveLength(count)
      }
    }
    expect(gliding).toBeGreaterThan(6)
  })

  it('any touch ends it at once and without a sound, with every thing on its spot', () => {
    for (const at of [0.1, 0.9, 2, 3.4]) {
      const { play, stage, scene } = entering()
      watch(scene, play, 0, at)
      scene.finish()
      expect(play.cues, `at ${at}`).toEqual([])
      expect(scene.running).toBe(false)
      expect(stage.gate).toBe(0)
      expect(stage.waiting).toEqual([])
      for (const thing of play.things) expect(thing).toMatchObject({ away: false, coming: false, sx: thing.x, sz: thing.z, leap: 0, size: 1, gait: 0 })
    }
  })
})
