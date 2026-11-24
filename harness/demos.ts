// The old games on the jam's home page: the lab's demos, the first versions
// most of the jam's games were built from. They are throwaway prototypes, not
// cartridges, and are never ported to Tada. They are built separately and
// published beside the jam. This page only reads the catalog file that build
// writes, and shows one by framing the demo player's own page. No code is
// shared: when the file is not there (the dev server, or a build without the
// demos) the home page simply has no old games.

export const DEMO_CATALOG_URL = 'lab/arcade/catalog.json'
const DEMO_PLAYER_URL = 'lab/arcade/index.html'

export type Demo = {
  key: string
  name: string
  emoji: string
  ages: [number, number]
  pitch: string
  /** The one thing this demo is trying to find out. */
  question: string
  /** Its visual treatment, where one was assigned on purpose. */
  look?: string
}

export type DemoGroup = {
  id: string
  title: string
  /** What the group as a whole is testing. */
  testing: string
  demos: Demo[]
}

const KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function parseDemo(raw: unknown): Demo | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const key = text(r.key), name = text(r.name), question = text(r.question)
  if (!key || !KEY.test(key) || !name || !question) return null
  const ages = Array.isArray(r.ages) && r.ages.length === 2 && r.ages.every((n) => Number.isInteger(n)) ? (r.ages as [number, number]) : null
  if (!ages) return null
  const look = text(r.look)
  return {
    key, name, question, ages, emoji: text(r.emoji) ?? '🎲', pitch: text(r.pitch) ?? '',
    ...(look ? { look } : {}),
  }
}

/** Reads the catalog defensively: anything malformed is dropped, never thrown. */
export function parseDemoCatalog(raw: unknown): DemoGroup[] {
  if (!raw || typeof raw !== 'object') return []
  const groups = (raw as { groups?: unknown }).groups
  if (!Array.isArray(groups)) return []
  const parsed: DemoGroup[] = []
  for (const entry of groups) {
    if (!entry || typeof entry !== 'object') continue
    const g = entry as Record<string, unknown>
    const id = text(g.id), title = text(g.title), testing = text(g.testing)
    if (!id || !title || !testing || !Array.isArray(g.demos)) continue
    const demos = g.demos.map(parseDemo).filter((demo): demo is Demo => demo !== null)
    if (demos.length > 0) parsed.push({ id, title, testing, demos })
  }
  return parsed
}

export function findDemo(groups: readonly DemoGroup[], key: string): Demo | undefined {
  for (const group of groups) {
    const demo = group.demos.find((d) => d.key === key)
    if (demo) return demo
  }
  return undefined
}

/** The jam's own route for a demo: it plays in the jam's frame. */
export function demoRoute(key: string): string {
  return `#/demo/${key}`
}

/** The demo player's page for one demo, without its rating strip. */
export function demoPlayerHref(key: string): string {
  return `${DEMO_PLAYER_URL}?chrome=0#/play/${key}`
}

export async function loadDemoCatalog(): Promise<DemoGroup[]> {
  try {
    const response = await fetch(DEMO_CATALOG_URL, { cache: 'no-cache' })
    if (!response.ok) return []
    return parseDemoCatalog(await response.json())
  } catch {
    return []
  }
}
