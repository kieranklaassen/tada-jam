// Hash routes for the lab shell. Pure: main.ts feeds it location.hash and
// location.search, so it runs (and is tested) in Node.
//
//   #/                        the list
//   #/play/<key>              play a prototype
//   ...?chrome=0              hide the grown-up strip
//   ...?seed=12               the sim seed (whole number, default 1)
//   ...?watch=<personaId>     watch a persona play instead of playing
//
// Params may sit in the search (`/?chrome=0#/play/x`) or after the key inside
// the hash (`#/play/x?chrome=0`); the hash wins when both name the same param.

export const DEFAULT_SEED = 1

export type Route =
  | { view: 'list' }
  | { view: 'play'; key: string; chrome: boolean; seed: number; watch: string | null }

export type PlayRoute = Extract<Route, { view: 'play' }>

const KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/
const PERSONA_ID = /^[A-Za-z0-9_-]{1,40}$/
const WHOLE_NUMBER = /^\d+$/
const MAX_SEED = 2 ** 32 - 1

function parseSeed(raw: string | undefined): number {
  if (raw === undefined || !WHOLE_NUMBER.test(raw)) return DEFAULT_SEED
  const seed = Number(raw)
  return Number.isSafeInteger(seed) && seed <= MAX_SEED ? seed : DEFAULT_SEED
}

function paramsOf(query: string): Map<string, string> {
  const params = new Map<string, string>()
  for (const [name, value] of new URLSearchParams(query)) params.set(name, value)
  return params
}

export function parseRoute(hash: string, search: string): Route {
  const afterHash = hash.startsWith('#') ? hash.slice(1) : hash
  const queryAt = afterHash.indexOf('?')
  const path = queryAt === -1 ? afterHash : afterHash.slice(0, queryAt)
  const hashQuery = queryAt === -1 ? '' : afterHash.slice(queryAt + 1)

  const match = /^\/play\/([^/]+)\/?$/.exec(path)
  if (!match) return { view: 'list' }

  let key: string
  try {
    key = decodeURIComponent(match[1]!)
  } catch {
    return { view: 'list' }
  }
  if (!KEY.test(key)) return { view: 'list' }

  const params = paramsOf(search)
  for (const [name, value] of paramsOf(hashQuery)) params.set(name, value)

  const watch = params.get('watch')
  return {
    view: 'play',
    key,
    chrome: params.get('chrome') !== '0',
    seed: parseSeed(params.get('seed')),
    watch: watch !== undefined && PERSONA_ID.test(watch) ? watch : null,
  }
}

// The caller knows the registry; a play route for a key it does not have is
// the list.
export function resolveRoute(route: Route, knownKeys: Iterable<string>): Route {
  if (route.view === 'list') return route
  for (const key of knownKeys) if (key === route.key) return route
  return { view: 'list' }
}

// A hash that parseRoute reads back to the same route. Defaults are omitted.
export function buildPlayHash(route: PlayRoute): string {
  const params = new URLSearchParams()
  if (!route.chrome) params.set('chrome', '0')
  if (route.seed !== DEFAULT_SEED) params.set('seed', String(route.seed))
  if (route.watch) params.set('watch', route.watch)
  const query = params.toString()
  return `#/play/${route.key}${query ? `?${query}` : ''}`
}
