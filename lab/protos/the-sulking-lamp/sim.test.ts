// Proof for The Sulking Lamp. The characteristic moment: the child tries
// arrangements until the lamp goes warm for one of them, isolates the cause by
// changing one piece, and names the rule's type, which the lamp answers.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim, SimConfig } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { FAMILIES, LAMP_RECT, SHOWN_TICKS, SKIP_AFTER, SOLVED_TICKS, STAGE, chipRect, createSim, evaluate } from './sim.ts'
import type { Family, LampSnapshot, Rule, StagePiece } from './sim.ts'

type S = Sim<LampSnapshot>

function start(overrides: Partial<SimConfig> = {}): S {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

const familyOf = (sim: S): Family => sim.observe().signature.split('/')[0] as Family
const stateOf = (sim: S): string => sim.observe().signature.split('/')[1]!
const piece = (sim: S, id: number) => sim.snapshot().pieces[id]!
const run = (sim: S, ticks: number) => {
  for (let i = 0; i < ticks; i++) sim.step()
}

// The first seed whose opening rule is the given family. A test may read the
// family from the signature; the child never sees it.
function seedWith(family: Family, hooks: readonly string[] = meta.hooks): number {
  for (let seed = 1; seed < 3000; seed++) if (familyOf(start({ seed, hooks })) === family) return seed
  throw new Error(`no seed opens with ${family}`)
}

function tap(sim: S, x: number, y: number, id = 1): void {
  sim.pointer({ id, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id, phase: 'up', x, y })
  sim.step()
}

function drag(sim: S, pieceId: number, x: number, y: number, id = 1): void {
  const from = piece(sim, pieceId)
  sim.pointer({ id, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 6; s++) {
    sim.pointer({ id, phase: 'move', x: from.x + ((x - from.x) * s) / 6, y: from.y + ((y - from.y) * s) / 6 })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x, y })
  sim.step()
}

const tapChip = (sim: S, family: Family) => {
  const r = chipRect(FAMILIES.indexOf(family))
  tap(sim, r.x + r.w / 2, r.y + r.h / 2)
}

// Bring every stage piece home, so the next try starts from an empty stage.
function clearStage(sim: S): void {
  for (const p of sim.snapshot().pieces) if (p.onStage) tap(sim, p.x, p.y)
}

// The child's method, played out: put two pieces on the stage, look at the
// lamp, and try another pair until it goes warm. Returns the pair.
function findWarmPair(sim: S): [number, number] {
  const count = sim.snapshot().pieces.length
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      clearStage(sim)
      drag(sim, i, 300, 400)
      drag(sim, j, 850, 400)
      if (stateOf(sim) === 'warm') return [i, j]
    }
  }
  throw new Error('no warm pair')
}

const sp = (over: Partial<StagePiece>): StagePiece => ({ x: 500, y: 400, r: 34, color: 0, kind: 0, size: 0, ...over })
const rule = (over: Partial<Rule>): Rule => ({ family: 'alike', attr: 0, a: 0, b: 1, n: 0, ...over })
const bad = (r: Rule, stage: StagePiece[]) => evaluate(r, stage).bad

describe('the rule families judge an arrangement', () => {
  it('alike: all pieces share the attribute', () => {
    const r = rule({ family: 'alike', attr: 0 })
    expect(bad(r, [sp({ color: 2 }), sp({ color: 2, x: 700 })])).toBe(0)
    expect(bad(r, [sp({ color: 2 }), sp({ color: 2, x: 700 }), sp({ color: 1, x: 900 })])).toBe(1)
    expect(bad(rule({ family: 'alike', attr: 2 }), [sp({ size: 1 }), sp({ size: 1, x: 700 })])).toBe(0)
  })
  it('different: no two pieces share the attribute', () => {
    const r = rule({ family: 'different', attr: 1 })
    expect(bad(r, [sp({ kind: 0 }), sp({ kind: 1, x: 700 }), sp({ kind: 2, x: 900 })])).toBe(0)
    expect(bad(r, [sp({ kind: 0 }), sp({ kind: 0, x: 700 })])).toBe(1)
  })
  it('banned: a chosen value may not be on the stage', () => {
    const r = rule({ family: 'banned', attr: 0, a: 3 })
    expect(bad(r, [sp({ color: 0 }), sp({ color: 1, x: 700 })])).toBe(0)
    expect(bad(r, [sp({ color: 3 }), sp({ color: 1, x: 700 })])).toBe(1)
  })
  it('howmany: the count of pieces matters, whatever they are', () => {
    const r = rule({ family: 'howmany', n: 3 })
    expect(bad(r, [sp({}), sp({ x: 600 }), sp({ x: 800 })])).toBe(0)
    expect(bad(r, [sp({}), sp({ x: 600 })])).toBe(1)
  })
  it('corner: the chosen pieces stay in one half of the stage', () => {
    const left = rule({ family: 'corner', attr: 0, a: 1, n: 0 })
    expect(bad(left, [sp({ color: 1, x: 200 }), sp({ color: 0, x: 900 })])).toBe(0)
    expect(bad(left, [sp({ color: 1, x: 900 }), sp({ color: 0, x: 200 })])).toBe(1)
    const top = rule({ family: 'corner', attr: 0, a: 1, n: 2 })
    expect(bad(top, [sp({ color: 1, y: 250 }), sp({ y: 500 })])).toBe(0)
  })
  it('leftof: one group sits before the other along an axis', () => {
    const r = rule({ family: 'leftof', attr: 0, a: 0, b: 1, n: 0 })
    expect(bad(r, [sp({ color: 0, x: 200 }), sp({ color: 1, x: 800 })])).toBe(0)
    expect(bad(r, [sp({ color: 0, x: 900 }), sp({ color: 1, x: 300 })])).toBe(1)
    const above = rule({ family: 'leftof', attr: 0, a: 0, b: 1, n: 1 })
    expect(bad(above, [sp({ color: 0, y: 250 }), sp({ color: 1, y: 500 })])).toBe(0)
  })
  it('row: the pieces line up', () => {
    const r = rule({ family: 'row' })
    expect(bad(r, [sp({ x: 200 }), sp({ x: 500, y: 410 }), sp({ x: 800, y: 390 })])).toBe(0)
    expect(bad(r, [sp({ x: 200 }), sp({ x: 500, y: 410 }), sp({ x: 800, y: 260 })])).toBeGreaterThan(0)
  })
  it('huddle: the pieces stay close together', () => {
    const r = rule({ family: 'huddle' })
    expect(bad(r, [sp({ x: 500 }), sp({ x: 580, y: 440 }), sp({ x: 540, y: 340 })])).toBe(0)
    expect(bad(r, [sp({ x: 200 }), sp({ x: 240 }), sp({ x: 1000 })])).toBeGreaterThan(0)
  })
  it('space: nothing touches', () => {
    const r = rule({ family: 'space' })
    expect(bad(r, [sp({ x: 200 }), sp({ x: 600 })])).toBe(0)
    expect(bad(r, [sp({ x: 200 }), sp({ x: 250 })])).toBe(1)
  })
  it('touching: a piece of one group touches a piece of the other', () => {
    const r = rule({ family: 'touching', attr: 0, a: 0, b: 1 })
    expect(bad(r, [sp({ color: 0, x: 400 }), sp({ color: 1, x: 460 })])).toBe(0)
    expect(bad(r, [sp({ color: 0, x: 200 }), sp({ color: 1, x: 900 })])).toBe(1)
    // Only one of the two colours on stage is the furthest from warm.
    expect(bad(r, [sp({ color: 0, x: 200 }), sp({ color: 2, x: 900 })])).toBe(2)
  })
  it('leaning: every piece of a group touches a piece of another', () => {
    const r = rule({ family: 'leaning', attr: 2, a: 1, b: 0 })
    expect(bad(r, [sp({ size: 1, r: 52, x: 400 }), sp({ size: 0, r: 34, x: 480 })])).toBe(0)
    expect(bad(r, [sp({ size: 1, r: 52, x: 200 }), sp({ size: 0, r: 34, x: 800 })])).toBe(1)
  })
  it('balanced: as many on each side of the middle', () => {
    const r = rule({ family: 'balanced' })
    expect(bad(r, [sp({ x: 200 }), sp({ x: 900 })])).toBe(0)
    expect(bad(r, [sp({ x: 200 }), sp({ x: 300 })])).toBe(2)
  })
})

describe('the lamp and the naming', () => {
  it('starts on a stage with every piece in the tray and the lamp waiting', () => {
    const sim = start()
    const snap = sim.snapshot()
    expect(snap.pieces).toHaveLength(8)
    expect(snap.pieces.every((p) => !p.onStage)).toBe(true)
    expect(snap.lamp).toBe('waiting')
    expect(snap.reveal).toBeNull()
    expect(stateOf(sim)).toBe('dim')
  })

  it('the moment: warm for the rule, dim when one piece breaks it, then the name is answered', () => {
    const seed = seedWith('alike')
    const sim = start({ seed })
    sim.observe()

    // Try pairs until the lamp goes warm. Earlier pairs sulked, so both lamp
    // states have been seen and the chips are open.
    const [i, j] = findWarmPair(sim)
    expect(sim.snapshot().lamp).toBe('warm')
    expect(sim.snapshot().unlocked).toBe(true)
    expect(sim.observe().features.warmth).toBe(1)

    // Change one thing: a third piece. Some third piece breaks the rule, and
    // the piece that flipped the lamp is the one the view rings.
    let culprit = -1
    for (let k = 0; k < 8 && culprit < 0; k++) {
      if (k === i || k === j) continue
      drag(sim, k, 590, 300)
      if (stateOf(sim) !== 'warm') culprit = k
      else tap(sim, piece(sim, k).x, piece(sim, k).y)
    }
    expect(culprit).toBeGreaterThanOrEqual(0)
    expect(sim.snapshot().flipPiece).toBe(culprit)
    expect(sim.observe().features.warmth).toBeLessThan(1)
    tap(sim, piece(sim, culprit).x, piece(sim, culprit).y)
    expect(stateOf(sim)).toBe('warm')

    // Name the type: the lamp answers.
    sim.observe()
    tapChip(sim, 'alike')
    const obs = sim.observe()
    expect(obs.signature).toBe('alike/solved')
    expect(obs.features.solved).toBe(1)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'solved' })
    expect(sim.snapshot().reveal).toContain('same')

    // A new rule follows, on a fresh stage.
    run(sim, SOLVED_TICKS + 2)
    expect(familyOf(sim)).not.toBe('alike')
    expect(sim.snapshot().pieces.every((p) => !p.onStage)).toBe(true)
    expect(sim.snapshot().reveal).toBeNull()
    expect(sim.observe().features.solved).toBe(1)
  })

  it('keeps the chips closed until the lamp has been seen warm and dim', () => {
    const sim = start({ seed: seedWith('alike') })
    expect(sim.snapshot().unlocked).toBe(false)
    sim.observe()
    tapChip(sim, 'alike')
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'state', name: 'locked' })
    expect(obs.features.solved).toBe(0)
    expect(obs.features.guessesLeft).toBe(2)
  })

  it('a wrong name greys the chip out, and two wrong names show the answer', () => {
    const sim = start({ seed: seedWith('alike') })
    findWarmPair(sim)
    sim.observe()
    tapChip(sim, 'row')
    expect(sim.observe().features.guessesLeft).toBe(1)
    expect(sim.snapshot().chips.find((c) => c.family === 'row')!.state).toBe('wrong')
    tapChip(sim, 'row') // already grey: no second charge
    expect(sim.observe().features.guessesLeft).toBe(1)
    tapChip(sim, 'huddle')
    const obs = sim.observe()
    expect(obs.signature).toBe('alike/shown')
    expect(obs.features.solved).toBe(0)
    expect(sim.snapshot().reveal).toContain('same')
    run(sim, SHOWN_TICKS + 2)
    expect(familyOf(sim)).not.toBe('alike')
  })

  it('the lamp gives up its secret only after a quiet stretch', () => {
    const sim = start({ seed: seedWith('alike') })
    const lamp = { x: LAMP_RECT.x + LAMP_RECT.w / 2, y: LAMP_RECT.y + LAMP_RECT.h / 2 }
    tap(sim, lamp.x, lamp.y)
    expect(sim.observe().signature).toMatch(/^alike\/(dim|glow|warm)$/)
    run(sim, SKIP_AFTER)
    tap(sim, lamp.x, lamp.y)
    expect(sim.observe().signature).toBe('alike/shown')
  })

  it('a tap sends a piece to the stage and a second tap sends it home', () => {
    const sim = start()
    const p = piece(sim, 0)
    tap(sim, p.x, p.y)
    expect(piece(sim, 0).onStage).toBe(true)
    expect(piece(sim, 0).y).toBeGreaterThanOrEqual(STAGE.y)
    tap(sim, piece(sim, 0).x, piece(sim, 0).y)
    expect(piece(sim, 0).onStage).toBe(false)
    expect(piece(sim, 0).x).toBe(p.x)
    expect(piece(sim, 0).y).toBe(p.y)
  })

  it('a piece dropped off the stage goes back to its tray slot', () => {
    const sim = start()
    const p = piece(sim, 3)
    drag(sim, 3, 590, 400)
    expect(piece(sim, 3).onStage).toBe(true)
    drag(sim, 3, 590, 30)
    expect(piece(sim, 3).onStage).toBe(false)
    expect(piece(sim, 3).x).toBe(p.x)
    expect(piece(sim, 3).y).toBe(p.y)
  })
})

describe('the warmer hook', () => {
  // Two pieces the rule does not accept, on a rule where one of two is half wrong.
  function mismatchedPair(hooks: readonly string[]) {
    const sim = start({ seed: seedWith('alike'), hooks })
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        clearStage(sim)
        drag(sim, i, 300, 400)
        drag(sim, j, 850, 400)
        if (stateOf(sim) !== 'warm') return { sim, pair: [i, j] as const }
      }
    }
    throw new Error('no mismatched pair')
  }

  it('shows a glow between dim and warm, and fires as it does', () => {
    const sim = start({ seed: seedWith('alike') })
    sim.observe()
    let glowed = false
    let events: ReturnType<S['observe']>['events'] = []
    for (let i = 0; i < 8 && !glowed; i++) {
      for (let j = i + 1; j < 8 && !glowed; j++) {
        clearStage(sim)
        drag(sim, i, 300, 400)
        drag(sim, j, 850, 400)
        const obs = sim.observe()
        events = events.concat(obs.events)
        glowed = obs.signature === 'alike/glow'
      }
    }
    expect(glowed).toBe(true)
    expect(events).toContainEqual({ kind: 'hook', name: 'warmer' })
  })

  it('an empty hooks list means no hook events and a lamp that is only dim or warm', () => {
    const { sim } = mismatchedPair([])
    const obs = sim.observe()
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(stateOf(sim)).toBe('dim')
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        clearStage(sim)
        drag(sim, i, 300, 400)
        drag(sim, j, 850, 400)
        const o = sim.observe()
        expect(o.events.some((e) => e.kind === 'hook')).toBe(false)
        expect(['dim', 'warm']).toContain(o.signature.split('/')[1])
      }
    }
  })
})

describe('determinism, seeds, and affordances', () => {
  it('the same seed and script give the same signature and snapshot', () => {
    const play = (): [string, string] => {
      const sim = start({ seed: 42 })
      drag(sim, 0, 300, 400)
      drag(sim, 1, 700, 350)
      tap(sim, piece(sim, 2).x, piece(sim, 2).y)
      run(sim, 40)
      return [sim.observe().signature, JSON.stringify(sim.snapshot())]
    }
    expect(play()).toEqual(play())
  })

  it('different seeds open with different rules and different pieces', () => {
    const openings = new Set<string>()
    const layouts = new Set<string>()
    for (let seed = 1; seed <= 12; seed++) {
      const sim = start({ seed })
      openings.add(sim.observe().signature)
      layouts.add(JSON.stringify(sim.snapshot().pieces.map((p) => [p.color, p.kind, p.size])))
    }
    expect(openings.size).toBeGreaterThanOrEqual(4)
    expect(layouts.size).toBeGreaterThanOrEqual(6)
  })

  it('every rule family comes up over a deck, none twice before all have', () => {
    const sim = start({ seed: 5 })
    const seen: Family[] = [familyOf(sim)]
    for (let r = 0; r < 11; r++) {
      run(sim, SKIP_AFTER)
      const lamp = { x: LAMP_RECT.x + LAMP_RECT.w / 2, y: LAMP_RECT.y + LAMP_RECT.h / 2 }
      tap(sim, lamp.x, lamp.y)
      run(sim, SHOWN_TICKS + 2)
      seen.push(familyOf(sim))
    }
    expect(new Set(seen).size).toBe(12)
  })

  it('reports affordances as top-left rectangles that centre on the pieces', () => {
    const sim = start()
    const affordances = sim.affordances()
    for (const p of sim.snapshot().pieces) {
      const match = affordances.find((a) => Math.abs(a.x + a.w / 2 - p.x) < 1e-9 && Math.abs(a.y + a.h / 2 - p.y) < 1e-9)
      expect(match, `an affordance centred on piece ${p.id}`).toBeDefined()
      expect(match!.w).toBeCloseTo(p.r * 2)
    }
    for (const a of affordances) {
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
      expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
    }
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('never lets a piece leave the field, whatever the finger does', () => {
    const sim = start()
    const p = piece(sim, 0)
    sim.pointer({ id: 1, phase: 'down', x: p.x, y: p.y })
    sim.pointer({ id: 1, phase: 'move', x: 1e9, y: -1e9 })
    for (const q of sim.snapshot().pieces) {
      expect(q.x).toBeGreaterThanOrEqual(q.r)
      expect(q.x).toBeLessThanOrEqual(FIELD_W - q.r)
      expect(q.y).toBeGreaterThanOrEqual(q.r)
      expect(q.y).toBeLessThanOrEqual(FIELD_H - q.r)
    }
  })

  it('shows a hint only after a quiet spell, and only with hints on', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 220)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
  })
})

describe('the meta', () => {
  it('declares an honest signature bound', () => {
    expect(meta.signatureBound).toBe(FAMILIES.length * 5)
  })
  it('observes every declared feature', () => {
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
