// The shared contract suite. Everything in the describe.each below runs over
// every prototype folder (lab/protos/* and the example) with no per-prototype
// code. The tests before it prove the suite has teeth: broken in-memory sims
// and broken source strings must be caught.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  DETERMINISM_TICKS,
  LAB_DIR,
  RECIPE_FILES,
  SESSION_TICKS,
  affordanceProblems,
  checkDeterminism,
  checkFuzz,
  checkHooks,
  discoverProtos,
  fuzzSession,
  listProtoDirs,
  loadProto,
  missingRecipeFiles,
  readPrototypeSources,
  replaySession,
  scanSource,
  stripComments,
  validateMeta,
} from './contract.ts'
import type { LoadedProto } from './contract.ts'
import type { CreateSim, ProtoMeta, Sim, SimEvent } from './sim.ts'

// ---------------------------------------------------------------------------
// A tiny well-behaved sim to break in different ways
// ---------------------------------------------------------------------------

const toyMeta: ProtoMeta = {
  key: 'toy',
  name: 'Toy',
  verb: 'tap',
  engine: 'emergence',
  lens: 'other',
  ageBand: [4, 6],
  hooks: ['score'],
  features: [{ name: 'toggles', objective: 'up' }],
  signatureBound: 2,
  hookAblation: { supported: true },
}

const goodToy: CreateSim = (config) => {
  let toggles = 0
  let ticks = 0
  let pending: SimEvent[] = []
  return {
    step() {
      ticks++
    },
    pointer(input) {
      if (input.phase === 'down' && input.x >= 100 && input.x <= 300 && input.y >= 100 && input.y <= 300) {
        toggles++
        pending.push({ kind: 'state', name: 'toggle' })
        if (config.hooks.includes('score')) pending.push({ kind: 'hook', name: 'score' })
      }
    },
    affordances: () => [{ x: 100, y: 100, w: 200, h: 200, kind: 'tap', salience: 1 }],
    observe() {
      const events = pending
      pending = []
      return { signature: toggles % 2 === 0 ? 'off' : 'on', features: { toggles }, events }
    },
    snapshot: () => ({ toggles, ticks }),
  }
}

// Wrap a good sim and change one behaviour.
function broken(change: (sim: Sim, config: Parameters<CreateSim>[0]) => Partial<Sim>): CreateSim {
  return (config) => {
    const sim = goodToy(config)
    return { ...sim, ...change(sim, config) }
  }
}

describe('the suite has teeth: it accepts a good sim', () => {
  it('passes every check', () => {
    expect(checkDeterminism(goodToy, toyMeta)).toEqual([])
    expect(checkFuzz(goodToy, toyMeta)).toEqual([])
    expect(checkHooks(goodToy, toyMeta)).toEqual([])
  })
})

describe('the suite has teeth: it catches a broken sim', () => {
  it('a sim that throws on out-of-range input fails the fuzz', () => {
    const sim = broken((base) => ({
      pointer(input) {
        if (Math.abs(input.x) > 1e5) throw new Error('index out of range')
        base.pointer(input)
      },
    }))
    expect(() => checkFuzz(sim, toyMeta)).toThrow('index out of range')
  })

  it('state shared between sims breaks determinism', () => {
    let shared = 0
    const sim = broken((base) => ({
      step() {
        shared++
        base.step()
      },
      snapshot: () => ({ shared }),
    }))
    expect(checkDeterminism(sim, toyMeta).join()).toContain('snapshot differs')
  })

  it('an affordances() call that changes the sim breaks determinism', () => {
    const sim = broken((base) => {
      let reads = 0
      return {
        affordances() {
          reads++
          return base.affordances()
        },
        observe() {
          const obs = base.observe()
          return { ...obs, features: { toggles: obs.features.toggles! + (reads > 0 ? 1 : 0) } }
        },
      }
    })
    expect(checkDeterminism(sim, toyMeta).length).toBeGreaterThan(0)
  })

  it('a non-finite feature is flagged', () => {
    const sim = broken((base) => ({
      observe: () => ({ ...base.observe(), features: { toggles: Number.NaN } }),
    }))
    expect(checkFuzz(sim, toyMeta).join()).toContain('not finite')
  })

  it('a declared feature that is never observed is flagged', () => {
    const sim = broken((base) => ({ observe: () => ({ ...base.observe(), features: {} }) }))
    expect(checkFuzz(sim, toyMeta).join()).toContain('declared in meta but not observed')
  })

  it('empty affordances at tick 0 are flagged', () => {
    const sim = broken(() => ({ affordances: () => [] }))
    expect(checkFuzz(sim, toyMeta).join()).toContain('empty at tick 0')
  })

  it('an affordance outside the field or without size is flagged', () => {
    const outside = broken(() => ({
      affordances: () => [{ x: 1100, y: 100, w: 200, h: 200, kind: 'tap' as const, salience: 1 }],
    }))
    expect(checkFuzz(outside, toyMeta).join()).toContain('outside the field')
    const flat = broken(() => ({
      affordances: () => [{ x: 100, y: 100, w: 0, h: 200, kind: 'tap' as const, salience: 1 }],
    }))
    expect(checkFuzz(flat, toyMeta).join()).toContain('no positive size')
  })

  it('a signature that never changes is flagged', () => {
    const sim = broken((base) => ({ observe: () => ({ ...base.observe(), signature: 'same' }) }))
    expect(checkFuzz(sim, toyMeta).join()).toContain('at least 2')
  })

  it('more signatures than declared is flagged', () => {
    let tick = 0
    const sim = broken((base) => ({
      step() {
        tick++
        base.step()
      },
      observe: () => ({ ...base.observe(), signature: `tick-${tick}` }),
    }))
    expect(checkFuzz(sim, toyMeta).join()).toContain('exceed the declared signatureBound')
  })

  it('a hook that fires when hooks is empty is flagged', () => {
    const sim = broken((base) => ({
      observe: () => ({ ...base.observe(), events: [{ kind: 'hook' as const, name: 'score' }] }),
    }))
    expect(checkHooks(sim, toyMeta).join()).toContain('hooks: [] still produced hook events')
  })

  it('removing one hook must leave the others alone', () => {
    const twoHooks: ProtoMeta = { ...toyMeta, hooks: ['score', 'unlock'] }
    const sim: CreateSim = (config) => {
      const base = goodToy(config)
      return {
        ...base,
        // Fires "unlock" whenever "score" is enabled: the hooks are tangled.
        observe: () => {
          const obs = base.observe()
          const extra: SimEvent[] = obs.events.some((e) => e.kind === 'hook' && e.name === 'score')
            ? [{ kind: 'hook', name: 'unlock' }]
            : []
          return { ...obs, events: [...obs.events, ...extra] }
        },
      }
    }
    expect(checkHooks(sim, twoHooks).join()).toContain('hooks: ["score"] also produced: unlock')
  })

  it('a hook name missing from meta.hooks is flagged', () => {
    const sim = broken((base) => ({
      observe: () => ({ ...base.observe(), events: [{ kind: 'hook' as const, name: 'secret' }] }),
    }))
    expect(checkHooks(sim, toyMeta).join()).toContain('not declared in meta.hooks')
  })
})

describe('fuzz sessions', () => {
  it('replaying the logged input gives the same signatures, features, and snapshot', () => {
    const config = { seed: 3, hooks: ['score'], hints: true }
    const run = fuzzSession({ createSim: goodToy, config, ticks: 800, fuzzSeed: 5 })
    const replay = replaySession({ createSim: goodToy, config, ticks: 800, log: run.log })
    expect(replay.signatures).toEqual(run.signatures)
    expect(replay.finalSnapshotJson).toBe(run.finalSnapshotJson)
    expect(replay.finalObservation.features).toEqual(run.finalObservation.features)
  })

  it('is a function of its seed', () => {
    const config = { seed: 3, hooks: [], hints: true }
    const a = fuzzSession({ createSim: goodToy, config, ticks: 500, fuzzSeed: 5 })
    const b = fuzzSession({ createSim: goodToy, config, ticks: 500, fuzzSeed: 5 })
    const c = fuzzSession({ createSim: goodToy, config, ticks: 500, fuzzSeed: 6 })
    expect(b.log).toEqual(a.log)
    expect(c.log).not.toEqual(a.log)
  })

  it('covers taps, drags, holds, stray up, stray move, a down without up, and out-of-range coordinates', () => {
    const config = { seed: 1, hooks: [], hints: true }
    const { log } = fuzzSession({ createSim: goodToy, config, ticks: SESSION_TICKS, fuzzSeed: 21 })
    const phases = new Set(log.map((entry) => entry.input.phase))
    expect(phases).toEqual(new Set(['down', 'move', 'up']))

    // Replay the per-id state to find each shape of misuse.
    const open = new Map<number, number>()
    let upWithoutDown = 0
    let moveWithoutDown = 0
    let overlappingDown = 0
    let holdLongerThan10Ticks = 0
    for (const { tick, input } of log) {
      if (input.phase === 'down') {
        if (open.has(input.id)) overlappingDown++
        open.set(input.id, tick)
      } else if (input.phase === 'move') {
        if (!open.has(input.id)) moveWithoutDown++
      } else if (!open.has(input.id)) upWithoutDown++
      else {
        if (tick - open.get(input.id)! > 10) holdLongerThan10Ticks++
        open.delete(input.id)
      }
    }
    expect(upWithoutDown).toBeGreaterThan(0)
    expect(moveWithoutDown).toBeGreaterThan(0)
    expect(overlappingDown).toBeGreaterThan(0)
    expect(holdLongerThan10Ticks).toBeGreaterThan(0)
    expect(open.size).toBeGreaterThan(0) // downs that never got an up

    const coordinates = log.flatMap((entry) => [entry.input.x, entry.input.y])
    expect(coordinates.some((n) => Math.abs(n) > 1e5)).toBe(true)
    expect(coordinates.some((n) => n < 0)).toBe(true)
    expect(coordinates.some((n) => n > 1180)).toBe(true)
    expect(coordinates.every((n) => Number.isFinite(n))).toBe(true)
  })

  it('runs one full session length', () => {
    expect(SESSION_TICKS).toBe(5454)
    const run = fuzzSession({ createSim: goodToy, config: { seed: 1, hooks: [], hints: true }, ticks: SESSION_TICKS, fuzzSeed: 1 })
    expect(run.signatures).toHaveLength(SESSION_TICKS)
  })
})

describe('affordanceProblems', () => {
  const ok = { x: 10, y: 10, w: 50, h: 50, kind: 'tap' as const, salience: 0.5 }

  it('accepts a rectangle anchored at its top-left corner inside the field', () => {
    expect(affordanceProblems(ok)).toEqual([])
    expect(affordanceProblems({ ...ok, x: 0, y: 0, w: 1180, h: 820 })).toEqual([])
  })

  it('rejects size, position, and salience problems', () => {
    expect(affordanceProblems({ ...ok, w: 0 })).not.toEqual([])
    expect(affordanceProblems({ ...ok, h: -5 })).not.toEqual([])
    expect(affordanceProblems({ ...ok, x: -1 })).not.toEqual([])
    expect(affordanceProblems({ ...ok, x: 1140 })).not.toEqual([]) // x + w = 1190 > 1180
    expect(affordanceProblems({ ...ok, y: 790 })).not.toEqual([]) // y + h = 840 > 820
    expect(affordanceProblems({ ...ok, salience: 1.5 })).not.toEqual([])
    expect(affordanceProblems({ ...ok, x: Number.NaN })).not.toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Meta validity, on in-memory objects
// ---------------------------------------------------------------------------

describe('validateMeta', () => {
  const good = { ...toyMeta, key: 'toy' }

  it('accepts a valid meta', () => {
    expect(validateMeta(good, 'toy')).toEqual([])
    expect(validateMeta({ ...good, lens: 'physical-toy', toy: 'dominoes' }, 'toy')).toEqual([])
  })

  const bad: Array<[string, Record<string, unknown>, string]> = [
    ['a key that is not kebab-case', { key: 'Toy_One' }, 'kebab-case'],
    ['a key that differs from the folder', { key: 'other' }, 'folder name'],
    ['a blank name', { name: '  ' }, 'name is blank'],
    ['a blank verb', { verb: '' }, 'verb is blank'],
    ['an unknown engine', { engine: 'luck' }, 'engine'],
    ['physical-toy without a toy', { lens: 'physical-toy' }, 'needs a toy id'],
    ['physical-toy with an unknown toy', { lens: 'physical-toy', toy: 'hoverboard' }, 'toys.ts'],
    ['an age band below 2', { ageBand: [1, 3] }, '2 to 12'],
    ['an age band above 12', { ageBand: [10, 13] }, '2 to 12'],
    ['an age band five years wide', { ageBand: [4, 8] }, 'wider than four'],
    ['an age band that is not whole years', { ageBand: [4.5, 6] }, 'whole years'],
    ['a signatureBound of 1', { signatureBound: 1 }, 'signatureBound'],
    ['a signatureBound of 65', { signatureBound: 65 }, 'signatureBound'],
    ['a fractional signatureBound', { signatureBound: 8.5 }, 'signatureBound'],
    ['duplicate hook names', { hooks: ['score', 'score'] }, 'unique'],
    ['a blank hook name', { hooks: [''] }, 'non-empty names'],
    ['duplicate feature names', { features: [{ name: 'a' }, { name: 'a' }] }, 'unique'],
    ['a bad objective', { features: [{ name: 'a', objective: 'sideways' }] }, "'up' or 'down'"],
    ['missing hookAblation', { hookAblation: undefined }, 'hookAblation'],
    ['an unsupported hookAblation without a reason', { hookAblation: { supported: false, reason: ' ' } }, 'needs a reason'],
  ]
  it.each(bad)('rejects %s', (_label, change, expected) => {
    expect(validateMeta({ ...good, ...change }, 'toy').join()).toContain(expected)
  })

  it('allows an age band exactly four years wide and the extremes', () => {
    expect(validateMeta({ ...good, ageBand: [2, 5] }, 'toy')).toEqual([])
    expect(validateMeta({ ...good, ageBand: [9, 12] }, 'toy')).toEqual([])
    expect(validateMeta({ ...good, signatureBound: 64 }, 'toy')).toEqual([])
    expect(validateMeta({ ...good, signatureBound: 2 }, 'toy')).toEqual([])
  })

  it('allows a hook that cannot be removed when it says why', () => {
    expect(validateMeta({ ...good, hookAblation: { supported: false, reason: 'the hook is the loop' } }, 'toy')).toEqual([])
  })

  it('rejects something that is not an object', () => {
    expect(validateMeta(null, 'toy')).not.toEqual([])
    expect(validateMeta('meta', 'toy')).not.toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Source hygiene, on in-memory strings
// ---------------------------------------------------------------------------

describe('scanSource', () => {
  it('passes clean source', () => {
    const clean = `import { createRng } from '../../kit/rng.ts'\nexport const x = createRng(1)()\n`
    expect(scanSource('sim.ts', clean)).toEqual([])
    expect(scanSource('meta.ts', clean)).toEqual([])
    expect(scanSource('view.ts', clean)).toEqual([])
  })

  it.each([
    ['Math.random()', 'Math.random'],
    ['Date.now()', 'Date.now'],
    ['performance.now()', 'performance.now'],
    ['new Date()', 'new Date('],
    ['Math . random ()', 'Math.random'],
  ])('flags %s in sim.ts and meta.ts', (code, expected) => {
    for (const file of ['sim.ts', 'meta.ts']) {
      expect(scanSource(file, `const t = ${code}\n`).join()).toContain(expected)
    }
  })

  it('allows clocks and randomness in a view, which the sim never reads', () => {
    expect(scanSource('view.ts', 'const jitter = Math.random()\nconst t = performance.now()\n')).toEqual([])
  })

  it.each(['document', 'window', 'HTMLElement', 'CanvasRenderingContext2D', 'localStorage', 'sessionStorage', 'requestAnimationFrame'])(
    'flags the DOM identifier %s in meta.ts and sim.ts only',
    (name) => {
      const code = `const a = ${name}\n`
      expect(scanSource('sim.ts', code).join()).toContain('DOM identifier')
      expect(scanSource('meta.ts', code).join()).toContain('DOM identifier')
      expect(scanSource('view.ts', code)).toEqual([])
      expect(scanSource('index.ts', code)).toEqual([])
    },
  )

  it('does not flag an identifier that only contains a DOM word', () => {
    expect(scanSource('sim.ts', 'const windowing = 1\nconst documented = 2\n')).toEqual([])
  })

  it('does not flag a DOM word inside a string', () => {
    expect(scanSource('sim.ts', `const label = 'window'\nconst s = "document"\nconst t = \`window\`\n`)).toEqual([])
  })

  it.each([
    ['const r = fetch("/x")', 'fetch('],
    ['const r = new XMLHttpRequest()', 'XMLHttpRequest'],
    ['const s = new WebSocket("ws://x")', 'WebSocket'],
    ['navigator.sendBeacon("/x")', 'sendBeacon'],
  ])('flags %s in every prototype file', (code, expected) => {
    for (const file of ['sim.ts', 'meta.ts', 'view.ts', 'index.ts', 'sim.test.ts']) {
      expect(scanSource(file, `${code}\n`).join()).toContain(expected)
    }
  })

  it('flags http:// and https:// URLs in every file, even inside a string with //', () => {
    for (const file of ['sim.ts', 'view.ts', 'index.ts']) {
      expect(scanSource(file, `const u = 'https://example.com/a.png'\n`).join()).toContain('URL')
      expect(scanSource(file, `const u = "http://example.com"\n`).join()).toContain('URL')
      expect(scanSource(file, 'const u = `https://example.com/${1}`\n').join()).toContain('URL')
    }
  })

  it('flags import( of a URL', () => {
    expect(scanSource('index.ts', `const m = await import('https://cdn.example.com/x.js')\n`).join()).toContain('URL')
    expect(scanSource('index.ts', `const m = await import('//cdn.example.com/x.js')\n`).join()).toContain('import( of a URL')
    expect(scanSource('index.ts', `const m = await import('data:text/javascript,1')\n`).join()).toContain('import( of a URL')
    expect(scanSource('index.ts', `const m = await import('./local.ts')\n`)).toEqual([])
  })

  it('ignores comments', () => {
    const commented = [
      '// Math.random() and fetch("x") are banned; see https://example.com',
      '/* window.document.body',
      '   Date.now() */',
      'export const ok = 1',
    ].join('\n')
    for (const file of ['sim.ts', 'meta.ts', 'view.ts']) expect(scanSource(file, commented)).toEqual([])
  })

  it('still sees code after a comment and after a string that contains comment markers', () => {
    expect(scanSource('sim.ts', `const a = "//"; const b = Math.random()\n`).join()).toContain('Math.random')
    expect(scanSource('sim.ts', `/* c */ const b = Date.now()\n`).join()).toContain('Date.now')
    expect(scanSource('sim.ts', 'const a = `${Math.random()}`\n').join()).toContain('Math.random')
    expect(scanSource('sim.ts', 'const a = `x ${ { k: 1 }.k } y`; const b = Date.now()\n').join()).toContain('Date.now')
  })

  it('reports the file and line', () => {
    const problems = scanSource('lab/protos/x/sim.ts', 'const a = 1\n\nconst b = Math.random()\n')
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^sim\.ts:3: /)
  })

  it('keeps line numbers true across block comments', () => {
    const problems = scanSource('sim.ts', '/*\n\n*/\nconst b = Date.now()\n')
    expect(problems[0]).toMatch(/^sim\.ts:4: /)
  })
})

describe('stripComments', () => {
  it('removes line and block comments and keeps strings', () => {
    const out = stripComments(`const a = 'x' // tail\n/* gone */ const b = "//kept"\n`)
    expect(out).not.toContain('tail')
    expect(out).not.toContain('gone')
    expect(out).toContain('//kept')
  })
})

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

describe('discovery', () => {
  const folders = discoverProtos()

  it('always includes the example, under the key example', () => {
    const example = folders.find((f) => f.key === 'example')
    expect(example?.example).toBe(true)
  })

  it('finds the same set of prototypes as the shell glob', () => {
    // The shell's main.ts imports these two patterns; the same patterns, as
    // seen from lab/kit, list the same files.
    const globbed = Object.keys(import.meta.glob(['../protos/*/index.ts', './example/index.ts']))
      .map((path) => path.split('/').slice(-2)[0]!)
      .sort()
    const listed = folders.map((f) => f.key).sort()
    expect(globbed).toEqual(listed)

    const main = readFileSync(join(LAB_DIR, 'shell', 'main.ts'), 'utf8')
    expect(main).toContain("'../protos/*/index.ts'")
    expect(main).toContain("'../kit/example/index.ts'")
  })

  it('gives every lab/protos folder the recipe files', () => {
    for (const folder of listProtoDirs()) {
      expect({ folder: folder.key, missing: missingRecipeFiles(folder.dir) }).toEqual({ folder: folder.key, missing: [] })
    }
    expect(RECIPE_FILES).toContain('sim.test.ts')
  })

  it('gives the example the template files', () => {
    const example = folders.find((f) => f.example)!
    // The template has no SPEC.md: that skeleton belongs to the 30 real prototypes.
    expect(missingRecipeFiles(example.dir).filter((name) => name !== 'SPEC.md')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The contract, over every prototype
// ---------------------------------------------------------------------------

describe.each(discoverProtos())('prototype $key', (folder) => {
  let proto: LoadedProto
  beforeAll(async () => {
    proto = await loadProto(folder)
  })

  it('has a valid meta', () => {
    expect(validateMeta(proto.meta, folder.key)).toEqual([])
  })

  it(`is deterministic for a seed and an input log (${DETERMINISM_TICKS} ticks)`, () => {
    expect(checkDeterminism(proto.createSim, proto.meta)).toEqual([])
  })

  it('survives a full session of fuzz input and stays honest about affordances, features, and signatures', { timeout: 120_000 }, () => {
    expect(checkFuzz(proto.createSim, proto.meta)).toEqual([])
  })

  it('honours the hooks list: empty means none, each hook alone means only it', { timeout: 120_000 }, () => {
    expect(checkHooks(proto.createSim, proto.meta)).toEqual([])
  })

  it('keeps its source pure, deterministic, and offline', () => {
    const problems = readPrototypeSources(folder.dir).flatMap(({ name, source }) => scanSource(name, source))
    expect(problems).toEqual([])
  })
})
