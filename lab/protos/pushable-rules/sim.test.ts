// Proof for Pushable Rules. The characteristic moment: the child pushes a rule
// tile out of line, the wall stops being a wall, and the frog walks through it
// to reach a pad that walking around could not. The shared suite
// (lab/kit/contract.test.ts) covers determinism, fuzz, and hygiene on top.

import { describe, expect, it } from 'vitest'
import { createRng } from '../../kit/rng.ts'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { CELL, COLS, OX, OY, RESTART, UNDO, applyMove, buildRoom, createSim, isWon, parseRules } from './sim.ts'
import type { Ent, PushableSnapshot, RoomKind } from './sim.ts'

type SnapEnt = PushableSnapshot['ents'][number]

const ent = (id: number, kind: Ent['kind'], name: string, x: number, y: number): Ent => ({ id, kind, name, x, y })
const sentence = (id: number, noun: string, prop: string, x: number, y: number, vertical = false): Ent[] => {
  const dx = vertical ? 0 : 1
  const dy = vertical ? 1 : 0
  return [ent(id, 'noun', noun, x, y), ent(id + 1, 'is', 'is', x + dx, y + dy), ent(id + 2, 'prop', prop, x + 2 * dx, y + 2 * dy)]
}
const keysOf = (ents: readonly Ent[]) => parseRules(ents).map((r) => `${r.noun}:${r.prop}`)

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const centre = (x: number, y: number) => ({ x: OX + (x + 0.5) * CELL, y: OY + (y + 0.5) * CELL })

function firstYou(ents: readonly SnapEnt[]): SnapEnt {
  const youNouns = new Set(parseRules(ents).filter((r) => r.prop === 'you').map((r) => r.noun))
  const found = ents.filter((e) => e.kind === 'obj' && youNouns.has(e.name)).sort((a, b) => a.id - b.id)[0]
  if (!found) throw new Error('nothing is YOU')
  return found
}

function tapCell(sim: Sim, x: number, y: number, id = 1): void {
  const p = centre(x, y)
  sim.pointer({ id, phase: 'down', x: p.x, y: p.y })
  sim.pointer({ id, phase: 'up', x: p.x, y: p.y })
}

// A breadth-first solver over whole-world states, limited to a few pushes so it
// stays small. It uses the same pure rules the sim does.
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

function solve(start: readonly Ent[], maxPushes = 3, cap = 400000): Array<readonly [number, number]> | null {
  interface Node {
    ents: readonly Ent[]
    parent: number
    dir: number
    pushes: number
  }
  const keyOf = (ents: readonly Ent[], pushes: number) => `${pushes}:${ents.map((e) => e.y * COLS + e.x).join(',')}`
  const nodes: Node[] = [{ ents: start, parent: -1, dir: -1, pushes: 0 }]
  const seen = new Set<string>([keyOf(start, 0)])
  for (let i = 0; i < nodes.length && nodes.length < cap; i++) {
    const node = nodes[i]!
    if (isWon(node.ents)) {
      const plan: Array<readonly [number, number]> = []
      for (let at = i; nodes[at]!.parent !== -1; at = nodes[at]!.parent) plan.unshift(DIRS[nodes[at]!.dir]!)
      return plan
    }
    DIRS.forEach((d, di) => {
      const r = applyMove(node.ents, d[0], d[1])
      if (!r.moved) return
      const pushes = node.pushes + (r.pushed ? 1 : 0)
      if (pushes > maxPushes) return
      const key = keyOf(r.ents, pushes)
      if (seen.has(key)) return
      seen.add(key)
      nodes.push({ ents: r.ents, parent: i, dir: di, pushes })
    })
  }
  return null
}

// Plays a plan through the sim's own pointer hit-test: one tap on the
// neighbouring cell per move.
function playPlan(sim: Sim<PushableSnapshot>, plan: ReadonlyArray<readonly [number, number]>): void {
  for (const [dx, dy] of plan) {
    const before = firstYou(sim.snapshot().ents)
    tapCell(sim, before.x + dx, before.y + dy)
    run(sim, 6)
    const after = sim.snapshot().status === 'solved' ? null : firstYou(sim.snapshot().ents)
    if (after) expect([after.x, after.y]).toEqual([before.x + dx, before.y + dy])
  }
}

function seedFor(kind: RoomKind): number {
  for (let seed = 1; seed < 400; seed++) if (start({ seed }).snapshot().kind === kind) return seed
  throw new Error(`no seed opens with a ${kind} room`)
}

describe('the rule engine', () => {
  const frogYou = sentence(100, 'frog', 'you', 0, 0)
  const wallStop = sentence(110, 'wall', 'stop', 5, 3)

  it('nothing moves until a rule says who is YOU', () => {
    const ents = [ent(1, 'obj', 'frog', 3, 3)]
    expect(applyMove(ents, 1, 0).moved).toBe(false)
    expect(applyMove([...ents, ...frogYou], 1, 0).moved).toBe(true)
  })

  it('a wall stops the frog only while WALL IS STOP is spelled', () => {
    const base = [ent(1, 'obj', 'frog', 3, 3), ent(2, 'obj', 'wall', 4, 3), ...frogYou]
    expect(applyMove([...base, ...wallStop], 1, 0).moved).toBe(false)
    const through = applyMove(base, 1, 0)
    expect(through.moved).toBe(true)
    expect(through.ents.find((e) => e.id === 1)!.x).toBe(4)
  })

  it('pushing STOP out of line breaks the rule', () => {
    const ents = [ent(1, 'obj', 'frog', 7, 2), ...frogYou, ...wallStop]
    expect(keysOf(ents)).toContain('wall:stop')
    const r = applyMove(ents, 0, 1)
    expect(r.pushed).toBe(true)
    expect(keysOf(r.ents)).not.toContain('wall:stop')
    expect(keysOf(r.ents)).toContain('frog:you')
  })

  it('pushing a whole sentence along its own row keeps the rule', () => {
    const ents = [ent(1, 'obj', 'frog', 4, 3), ...frogYou, ...wallStop]
    const r = applyMove(ents, 1, 0)
    expect(r.pushed).toBe(true)
    expect(r.ents.find((e) => e.name === 'wall' && e.kind === 'noun')!.x).toBe(6)
    expect(keysOf(r.ents)).toContain('wall:stop')
  })

  it('a chain against the edge does not move', () => {
    const ents = [ent(1, 'obj', 'frog', 8, 3), ...frogYou, ...sentence(110, 'wall', 'stop', 9, 3)]
    expect(applyMove(ents, 1, 0).moved).toBe(false)
  })

  it('pushing YOU out of its sentence leaves nothing to move', () => {
    // Down the column keeps a vertical sentence whole; sideways pulls it apart.
    const ents = [ent(1, 'obj', 'frog', 2, 1), ...sentence(100, 'frog', 'you', 2, 2, true)]
    expect(keysOf(applyMove(ents, 0, 1).ents)).toContain('frog:you')
    const side = [ent(1, 'obj', 'frog', 1, 3), ...sentence(100, 'frog', 'you', 2, 2, true)]
    const r = applyMove(side, 1, 0)
    expect(r.moved).toBe(true)
    expect(keysOf(r.ents)).not.toContain('frog:you')
    expect(applyMove(r.ents, 0, 1).moved).toBe(false)
  })

  it('a new rule can be made by pushing a noun into a sentence, and it wins', () => {
    // ROCK sits under PAD in PAD IS WIN; pushing it up swaps the noun.
    const ents = [
      ent(1, 'obj', 'frog', 2, 5),
      ent(2, 'obj', 'rock', 8, 2),
      ent(3, 'obj', 'pad', 9, 5),
      ...frogYou,
      ...sentence(110, 'pad', 'win', 2, 3),
      ent(120, 'noun', 'rock', 2, 4),
    ]
    expect(keysOf(ents)).toContain('pad:win')
    const r = applyMove(ents, 0, -1)
    expect(keysOf(r.ents)).toContain('rock:win')
    expect(keysOf(r.ents)).not.toContain('pad:win')
    // Standing on the rock now wins; standing on the pad does not.
    const onRock = r.ents.map((e) => (e.id === 1 ? { ...e, x: 8, y: 2 } : e))
    const onPad = r.ents.map((e) => (e.id === 1 ? { ...e, x: 9, y: 5 } : e))
    expect(isWon(onRock)).toBe(true)
    expect(isWon(onPad)).toBe(false)
  })

  it('a vertical sentence reads top to bottom', () => {
    expect(keysOf(sentence(100, 'rock', 'push', 3, 1, true))).toEqual(['rock:push'])
  })
})

describe('the rooms', () => {
  it('every tile and thing gets its own cell, and only the intended rules are spelled', () => {
    for (const kind of ['wall', 'gate', 'swap'] as const) {
      for (let index = 0; index <= 6; index++) {
        for (let seed = 1; seed <= 25; seed++) {
          const room = buildRoom(createRng(seed * 31 + index), kind, index)
          const cells = room.ents.map((e) => `${e.x},${e.y}`)
          expect(new Set(cells).size, `${kind} room ${index} seed ${seed}`).toBe(cells.length)
          const keys = keysOf(room.ents)
          const intended = kind === 'gate' ? 4 : 3
          expect(keys.length, `${kind} rules ${keys.join(' ')}`).toBe(intended)
          expect(room.key).toBeGreaterThan(0)
        }
      }
    }
  })

  it('a room keeps its promise: no way to the pad without rewriting a rule', () => {
    for (const kind of ['wall', 'gate', 'swap'] as const) {
      const room = buildRoom(createRng(3), kind, 0)
      expect(solve(room.ents, 0), `${kind} room solved without any push`).toBeNull()
    }
  })

  it('every kind of room can be solved with a few pushes, across many seeds', () => {
    for (const kind of ['wall', 'gate', 'swap'] as const) {
      for (let seed = 1; seed <= 6; seed++) {
        const room = buildRoom(createRng(seed), kind, 0)
        expect(solve(room.ents), `${kind} room, seed ${seed}`).not.toBeNull()
      }
    }
  })

  it('later wall rooms sometimes leave a long way round, so rewriting is a choice', () => {
    let detours = 0
    for (let seed = 1; seed <= 40; seed++) {
      const room = buildRoom(createRng(seed), 'wall', 2)
      if (!room.gap) continue
      detours++
      expect(solve(room.ents, 0), `detour room, seed ${seed}`).not.toBeNull()
    }
    expect(detours).toBeGreaterThan(3)
  })

  it('different seeds lay different rooms; the same seed the same room', () => {
    expect(JSON.stringify(start({ seed: 5 }).snapshot())).toBe(JSON.stringify(start({ seed: 5 }).snapshot()))
    const looks = new Set<string>()
    for (let seed = 1; seed <= 12; seed++) looks.add(JSON.stringify(start({ seed }).snapshot().ents))
    expect(looks.size).toBeGreaterThan(8)
  })
})

describe('the characteristic moment: rewriting a rule to cross', () => {
  for (const kind of ['wall', 'gate', 'swap'] as const) {
    it(`a ${kind} room is crossed only by rewriting, and the star for it fires`, () => {
      const sim = start({ seed: seedFor(kind) })
      sim.observe()
      const first = sim.snapshot()
      expect(first.status).toBe('play')
      expect(sim.observe().signature).toBe(`${kind}/shut/win-pad/you`)

      const plan = solve(first.ents)
      expect(plan).not.toBeNull()
      playPlan(sim, plan!)

      const obs = sim.observe()
      const names = obs.events.filter((e) => e.kind === 'state').map((e) => e.name)
      expect(names).toContain(kind === 'swap' ? 'rule-made' : 'rule-broken')
      expect(names).toContain('solved')
      expect(obs.signature).toBe(`solved/${kind}/rewrote`)
      expect(obs.events).toContainEqual({ kind: 'hook', name: 'stars' })
      expect(sim.snapshot().status).toBe('solved')
      expect(sim.snapshot().stars).toBe(2)
      expect(obs.features.solved).toBe(1)
      expect(obs.features.rewrites).toBeGreaterThan(0)
    })
  }

  it('after the room is solved a fresh one opens', () => {
    const sim = start({ seed: seedFor('wall') })
    const before = JSON.stringify(sim.snapshot().ents)
    playPlan(sim, solve(sim.snapshot().ents)!)
    run(sim, 60)
    const snap = sim.snapshot()
    expect(snap.status).toBe('play')
    expect(snap.room).toBe(1)
    expect(JSON.stringify(snap.ents)).not.toBe(before)
  })

  it('walking around a detour room wins without rewriting, and reads differently', () => {
    const room = buildRoom(createRng(1), 'wall', 2)
    let seed = 1
    let detour = room
    while (!detour.gap) detour = buildRoom(createRng(++seed), 'wall', 2)
    const plan = solve(detour.ents, 0)!
    expect(plan.length).toBeGreaterThan(4)
    // Replay it in the pure world: it never rewrites, so it is an "around" win.
    let ents: readonly Ent[] = detour.ents
    for (const [dx, dy] of plan) ents = applyMove(ents, dx, dy).ents
    expect(isWon(ents)).toBe(true)
    expect(keysOf(ents)).toEqual(keysOf(detour.ents))
  })

  it('a tap on a far cell walks the frog there by the shortest free path', () => {
    const sim = start({ seed: seedFor('wall') })
    const frog = firstYou(sim.snapshot().ents)
    const goal = { x: frog.x === 0 ? 1 : frog.x - 1, y: frog.y === 6 ? 5 : frog.y + 1 }
    tapCell(sim, goal.x, goal.y)
    run(sim, 30)
    const after = firstYou(sim.snapshot().ents)
    expect([after.x, after.y]).toEqual([goal.x, goal.y])
    expect(sim.observe().events.some((e) => e.kind === 'state' && e.name === 'move')).toBe(true)
  })
})

describe('undo, restart, and being stuck', () => {
  it('undo takes back the last move and restart returns to the start', () => {
    const sim = start({ seed: seedFor('wall') })
    const startJson = JSON.stringify(sim.snapshot().ents)
    const frog = firstYou(sim.snapshot().ents)
    const dir = frog.y < 6 ? 1 : -1
    tapCell(sim, frog.x, frog.y + dir)
    run(sim, 6)
    expect(JSON.stringify(sim.snapshot().ents)).not.toBe(startJson)
    const undo = { x: UNDO.x + UNDO.w / 2, y: UNDO.y + UNDO.h / 2 }
    sim.pointer({ id: 2, phase: 'down', ...undo })
    sim.pointer({ id: 2, phase: 'up', ...undo })
    expect(JSON.stringify(sim.snapshot().ents)).toBe(startJson)

    tapCell(sim, frog.x, frog.y + dir)
    run(sim, 6)
    tapCell(sim, frog.x, frog.y + 2 * dir)
    run(sim, 6)
    const restart = { x: RESTART.x + RESTART.w / 2, y: RESTART.y + RESTART.h / 2 }
    sim.pointer({ id: 2, phase: 'down', ...restart })
    sim.pointer({ id: 2, phase: 'up', ...restart })
    expect(JSON.stringify(sim.snapshot().ents)).toBe(startJson)
  })

  it('a first room keeps FROG IS YOU on the top row, out of reach of a careless push', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const room = buildRoom(createRng(seed), 'wall', 0)
      const youRule = parseRules(room.ents).find((r) => r.noun === 'frog' && r.prop === 'you')!
      const tiles = room.ents.filter((e) => youRule.ids.includes(e.id))
      expect(tiles.every((t) => t.y === 0)).toBe(true)
    }
  })

  it('breaking your own YOU shows as stuck, and restart draws the eye and the hint', () => {
    // Later rooms can put FROG IS YOU within reach. Tap around until one falls apart.
    let found = false
    for (let seed = 1; seed <= 40 && !found; seed++) {
      const s = start({ seed, hints: true })
      for (let r = 0; r < 2; r++) {
        playPlan(s, solve(s.snapshot().ents)!)
        run(s, 60)
      }
      for (let t = 0; t < 500 && !found; t++) {
        tapCell(s, (t * 7 + seed) % COLS, (t * 3 + seed) % 7)
        run(s, 5)
        if (s.snapshot().room >= 2 && s.observe().signature.endsWith('/no-you')) {
          found = true
          expect(s.snapshot().status).toBe('stuck')
          const restart = s.affordances().find((a) => a.x === RESTART.x && a.y === RESTART.y)!
          expect(restart.salience).toBeGreaterThan(0.8)
          run(s, 200)
          expect(s.snapshot().hint).toEqual(RESTART)
          // Undo brings YOU back.
          const undo = { x: UNDO.x + UNDO.w / 2, y: UNDO.y + UNDO.h / 2 }
          s.pointer({ id: 3, phase: 'down', ...undo })
          s.pointer({ id: 3, phase: 'up', ...undo })
          expect(s.observe().signature.endsWith('/you')).toBe(true)
        }
      }
    }
    expect(found).toBe(true)
  })
})

describe('the hooks list', () => {
  it('an empty list means no hook events and no stars', () => {
    const sim = start({ seed: seedFor('wall'), hooks: [] })
    playPlan(sim, solve(sim.snapshot().ents)!)
    const obs = sim.observe()
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(sim.snapshot().stars).toBeNull()
    expect(obs.signature).toBe('solved/wall/rewrote')
  })

  it('stars are one for a room and one more for rewriting it', () => {
    const sim = start({ seed: seedFor('wall') })
    expect(sim.snapshot().stars).toBe(0)
    playPlan(sim, solve(sim.snapshot().ents)!)
    expect(sim.snapshot().stars).toBe(2)
  })
})

describe('hints', () => {
  it('appear after a quiet spell only when on, point at the key tile, and go on touch', () => {
    const on = start({ seed: seedFor('wall'), hints: true })
    const off = start({ seed: seedFor('wall'), hints: false })
    run(on, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 220)
    const hint = on.snapshot().hint!
    expect(hint).not.toBeNull()
    const key = on.snapshot().ents.find((e) => e.id === on.snapshot().key)!
    expect(hint.x).toBe(OX + key.x * CELL)
    expect(hint.y).toBe(OY + key.y * CELL)
    expect(off.snapshot().hint).toBeNull()
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
  })

  it('never change the outcome', () => {
    const on = start({ seed: seedFor('gate'), hints: true })
    const off = start({ seed: seedFor('gate'), hints: false })
    run(on, 400)
    run(off, 400)
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.snapshot().ents).toEqual(off.snapshot().ents)
  })
})

describe('determinism', () => {
  it('the same seed and the same script give the same signature and snapshot', () => {
    const a = start({ seed: 9 })
    const b = start({ seed: 9 })
    for (const s of [a, b]) {
      for (let t = 0; t < 60; t++) {
        tapCell(s, (t * 5) % COLS, (t * 3) % 7)
        run(s, 4)
      }
    }
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })
})

describe('the affordances', () => {
  it('centre on the tiles they name, with cell-sized targets', () => {
    const sim = start()
    const affordances = sim.affordances()
    for (const e of sim.snapshot().ents.filter((t) => t.kind !== 'obj')) {
      const c = centre(e.x, e.y)
      const hit = affordances.find((a) => Math.abs(a.x + a.w / 2 - c.x) < 1e-9 && Math.abs(a.y + a.h / 2 - c.y) < 1e-9)
      expect(hit, `an affordance on the ${e.name} tile`).toBeDefined()
      expect(hit!.w).toBeGreaterThanOrEqual(60)
    }
  })
})

describe('the meta', () => {
  it('declares the honest signature bound: 3 rooms x 2 barrier states x 4 win states x 2 YOU states, plus 3 rooms x 2 ways to win', () => {
    expect(meta.signatureBound).toBe(3 * 2 * 4 * 2 + 3 * 2)
  })

  it('names its objectives, and every feature is observed', () => {
    expect(meta.features.filter((f) => f.objective).length).toBeGreaterThan(0)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
