// The lab shell entry: build the registry from a directory glob (the way the
// jam finds games/*/index.ts), read the hash route, render the list or the
// play view, and render again when the hash changes. Plain TypeScript and DOM;
// nothing React-shaped touches a sim.

import type { Proto } from '../kit/proto.ts'
import { renderList } from './list.ts'
import type { RegistryEntry } from './list.ts'
import { mountPlay } from './play.ts'
import { parseRoute, resolveRoute } from './routes.ts'

// lab/protos/<key>/index.ts for every prototype, plus the reference under the
// key `example`. The contract suite checks this pair of patterns against a
// directory listing.
const modules = import.meta.glob<Proto>(['../protos/*/index.ts', '../kit/example/index.ts'], {
  eager: true,
  import: 'proto',
})

const registry = new Map<string, RegistryEntry>()
for (const [path, proto] of Object.entries(modules)) {
  const key = proto.meta.key
  const folder = path.split('/').slice(-2)[0]
  if (key !== folder) console.error(`lab: ${path} declares key "${key}", which is not its folder name`)
  if (registry.has(key)) console.error(`lab: two prototypes share the key "${key}"`)
  registry.set(key, { key, proto })
}

const app = document.getElementById('app')
if (!app) throw new Error('lab: #app is missing from index.html')
const host: HTMLElement = app

let dispose: (() => void) | null = null

function render(): void {
  dispose?.()
  dispose = null
  const route = resolveRoute(parseRoute(location.hash, location.search), registry.keys())
  if (route.view === 'list') {
    document.title = 'Mechanic lab'
    dispose = renderList(host, [...registry.values()])
    return
  }
  const entry = registry.get(route.key)!
  document.title = `${entry.proto.meta.name} - Mechanic lab`
  dispose = mountPlay(host, { entry, seed: route.seed, chrome: route.chrome, watch: route.watch })
}

window.addEventListener('hashchange', render)
render()
