// The arcade round has no contract suite: a person judges these by playing.
// This only checks what the shell and the owner's rating page depend on, that
// every folder under protos/ exports a well-formed `proto`, and that a
// prototype stays inside the lab and offline.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG } from './catalog.ts'
import type { Proto } from './kit/types.ts'

const HERE = import.meta.dirname
const PROTOS = join(HERE, 'protos')
const KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/

const folders = existsSync(PROTOS)
  ? readdirSync(PROTOS, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
      .map((d) => d.name)
      .sort()
  : []

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return sources(full)
    return entry.name.endsWith('.ts') ? [full] : []
  })
}

async function load(folder: string): Promise<Proto> {
  const module = (await import(join(PROTOS, folder, 'index.ts'))) as { proto?: Proto }
  if (!module.proto) throw new Error(`${folder}/index.ts does not export proto`)
  return module.proto
}

function checkMeta(proto: Proto, key: string): void {
  const { meta } = proto
  expect(meta.key).toBe(key)
  for (const field of ['name', 'emoji', 'pitch', 'howTo', 'basedOn', 'whyFun'] as const) {
    expect(typeof meta[field], field).toBe('string')
    expect(meta[field].trim().length, field).toBeGreaterThan(0)
  }
  expect(meta.pitch.length).toBeLessThanOrEqual(200)
  const [low, high] = meta.ages
  expect(Number.isInteger(low) && Number.isInteger(high)).toBe(true)
  expect(low).toBeGreaterThanOrEqual(2)
  expect(high).toBeLessThanOrEqual(12)
  expect(low).toBeLessThanOrEqual(high)
  expect(typeof proto.create).toBe('function')
}

describe('the reference prototype', () => {
  it('exports a well-formed proto', async () => {
    const module = (await import('./kit/example/index.ts')) as { proto: Proto }
    checkMeta(module.proto, 'example')
  })
})

describe('the arcade round', () => {
  it('has kebab-case folder names', () => {
    for (const folder of folders) expect(folder).toMatch(KEY)
  })

  it('has no two prototypes with the same name', async () => {
    const names = await Promise.all(folders.map(async (folder) => (await load(folder)).meta.name))
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('the catalog', () => {
  const listed = CATALOG.flatMap((group) => group.demos.map((demo) => demo.key))

  it('lists every prototype folder exactly once', () => {
    expect([...listed].sort()).toEqual(folders)
    expect(new Set(listed).size).toBe(listed.length)
  })

  it('says what each group and each demo is testing', () => {
    for (const group of CATALOG) {
      expect(group.id).toMatch(KEY)
      expect(group.title.trim().length).toBeGreaterThan(0)
      expect(group.testing.trim().length).toBeGreaterThan(40)
      for (const demo of group.demos) expect(demo.question.trim().length, demo.key).toBeGreaterThan(10)
    }
  })
})

describe.each(folders)('arcade prototype %s', (folder) => {
  it('exports a well-formed proto and imports without a browser', async () => {
    checkMeta(await load(folder), folder)
  })

  it('stays in the lab and offline', () => {
    for (const file of sources(join(PROTOS, folder))) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/https?:\/\//)
      expect(text, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB/)
      for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"\n]+)['"]/g)) {
        const spec = match[1]!
        if (!spec.startsWith('.')) {
          // The only packages a prototype may pull in: 2D physics, and three.js with a 3D physics engine for the 3D looks.
          const allowed = spec === 'matter-js' || spec === 'cannon-es' || spec === 'three' || spec.startsWith('three/')
          expect(allowed, `${file} imports ${spec}`).toBe(true)
          continue
        }
        const target = resolve(file, '..', spec)
        const inOwnFolder = target.startsWith(join(PROTOS, folder) + '/')
        const inKit = target.startsWith(join(HERE, 'kit') + '/')
        expect(inOwnFolder || inKit, `${file} imports ${spec}`).toBe(true)
      }
    }
  })
})
