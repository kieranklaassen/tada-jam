import { describe, expect, it } from 'vitest'
import { ROLL_LOOK } from './art'
import { KINDS } from './layout'

// What is kept by hand elsewhere, held here by reading the folder's own
// files as text. The text comes through the bundler, so no test opens a
// file, writes one or reads the environment.

const sources = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const papers = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const here = './hygiene.test.ts'

describe('the tests keep to themselves', () => {
  it('no test writes a file or reads the environment', () => {
    const banned = ['node:' + 'fs', 'write' + 'File', 'append' + 'File', 'mk' + 'dir', 'process.' + 'env', 'import.meta.' + 'env', 'child_' + 'process']
    const tests = Object.entries(sources).filter(([name]) => name.endsWith('.test.ts') || name === './bench.ts')
    expect(tests.length).toBeGreaterThan(20)
    for (const [name, text] of tests) for (const word of banned) expect(text.includes(word), `${name} has ${word}`).toBe(false)
  })
})

describe('what is written down', () => {
  it('the art guide and the refinement log name no folder outside the repository, no machine path and no address', () => {
    const banned = ['/' + 'home/', '/' + 'tmp/', '/' + 'root/', 'wave-' + 'scratch', 'work' + 'tree', 'scratch' + 'pad', 'local' + 'host', 'ht' + 'tp:', 'ht' + 'tps:', 'ww' + 'w.']
    expect(Object.keys(papers).sort()).toEqual(['./ART.md', './REFINEMENT.md'])
    for (const [name, text] of Object.entries(papers)) for (const word of banned) expect(text.includes(word), `${name} has ${word}`).toBe(false)
  })

  it('no file of the game holds a web address', () => {
    for (const [name, text] of Object.entries(sources)) {
      if (name === here) continue
      for (const word of ['ht' + 'tp:', 'ht' + 'tps:', 'ww' + 'w.']) expect(text.includes(word), `${name} has ${word}`).toBe(false)
    }
  })
})

describe('nothing drawn can be read as a sign', () => {
  it('the four rolls are four different rolls: no two share a size, a core, a hole or the way the end hangs, and no core has spokes', () => {
    for (const a of KINDS) {
      for (const b of KINDS) {
        if (a >= b) continue
        const one = ROLL_LOOK[a], other = ROLL_LOOK[b]
        expect(Math.abs(one.rx - other.rx), `${a}/${b} size`).toBeGreaterThanOrEqual(2)
        expect(Math.abs(one.core - other.core), `${a}/${b} core`).toBeGreaterThanOrEqual(2)
        expect(Math.abs(one.hole - other.hole), `${a}/${b} hole`).toBeGreaterThanOrEqual(2)
        expect(one.card, `${a}/${b} card`).not.toBe(other.card)
        expect(Math.abs(Math.sin((one.tail - other.tail) / 2)), `${a}/${b} end`).toBeGreaterThan(0.2)
      }
    }
  })

  it('no core has spokes: the art draws none', () => {
    expect(sources['./art.ts'].toLowerCase().includes('spo' + 'ke')).toBe(false)
  })

  it('the rail is plain tape: nothing in the art draws sleepers, rungs or a row of ties across it', () => {
    const art = sources['./art.ts']
    for (const word of ['sleeper', 'rung', 'crosstie']) expect(art.toLowerCase().includes(word), word).toBe(false)
  })
})

describe('nothing is carried that nothing uses', () => {
  it('every sound the voices make is said somewhere in the game, and every exported name of the floor is used', () => {
    const game = Object.entries(sources).filter(([name]) => !name.endsWith('.test.ts') && name !== './bench.ts')
    for (const file of ['./voices.ts', './floor.ts']) {
      const names = [...sources[file].matchAll(/^export (?:const|function) (\w+)/gm)].map((found) => found[1])
      expect(names.length).toBeGreaterThan(5)
      for (const name of names) {
        // Three lists are kept for the tests alone.
        if (['RANGES', 'LEVELLED', 'FIXED'].includes(name)) continue
        // Used in another file of the game, or again in its own file outside the lists kept for the tests.
        const word = new RegExp(`\\b${name}\\b`, 'g')
        const elsewhere = game.some(([other, text]) => other !== file && (text.match(word) ?? []).length > 0)
        const text = sources[file].replace(/^export const (?:LEVELLED|FIXED)[^]*?\]$/gm, '')
        const own = (text.match(word) ?? []).length > 1
        expect(elsewhere || own, `${file} ${name}`).toBe(true)
      }
    }
  })
})
