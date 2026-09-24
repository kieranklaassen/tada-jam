// Finding and loading prototypes for the panel, in Node. A prototype is loaded
// from meta.ts and sim.ts only, never index.ts or view.ts, so nothing DOM-shaped
// is imported.

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { CreateSim, ProtoMeta } from '../kit/sim.ts'
import type { PanelProto } from './types.ts'

const LAB_DIR = join(import.meta.dirname, '..')
const PROTOS_DIR = join(LAB_DIR, 'protos')
// The reference prototype lives with the kit, not among the 30.
const EXAMPLE_DIR = join(LAB_DIR, 'kit', 'example')

const KEY_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

// Directory that holds a prototype's meta.ts and sim.ts.
export function protoDir(key: string): string {
  if (!KEY_PATTERN.test(key)) throw new Error(`not a prototype key: ${key}`)
  return key === 'example' ? EXAMPLE_DIR : join(PROTOS_DIR, key)
}

// Every lab/protos/* directory that has a meta.ts (names starting with _ or .
// are skipped), plus `example` when the reference prototype exists.
export function listProtoKeys(protosDir: string = PROTOS_DIR, exampleDir: string = EXAMPLE_DIR): string[] {
  const keys: string[] = []
  if (existsSync(protosDir)) {
    for (const name of readdirSync(protosDir).sort()) {
      if (name.startsWith('_') || name.startsWith('.')) continue
      const dir = join(protosDir, name)
      if (!statSync(dir).isDirectory()) continue
      if (existsSync(join(dir, 'meta.ts'))) keys.push(name)
    }
  }
  if (existsSync(join(exampleDir, 'meta.ts'))) keys.push('example')
  return keys
}

export async function loadProto(key: string): Promise<PanelProto> {
  const dir = protoDir(key)
  const metaModule = (await import(pathToFileURL(join(dir, 'meta.ts')).href)) as { meta?: ProtoMeta }
  const simModule = (await import(pathToFileURL(join(dir, 'sim.ts')).href)) as { createSim?: CreateSim }
  if (!metaModule.meta) throw new Error(`${key}/meta.ts does not export meta`)
  if (!simModule.createSim) throw new Error(`${key}/sim.ts does not export createSim`)
  return { meta: metaModule.meta, createSim: simModule.createSim }
}
