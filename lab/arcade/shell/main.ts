// The arcade round's shell: a card grid of prototypes and a play view with a
// rating strip. Plain TypeScript and DOM. Each prototype is loaded on its own
// (a lazy glob), so one that fails to load shows as a broken card and does not
// take the page down.

import { buildPlayHash, parseRoute } from '../../shell/routes.ts'
import { CATALOG, demoOf } from '../catalog.ts'
import type { PlayRoute } from '../../shell/routes.ts'
import { mountStage } from '../kit/stage.ts'
import type { MountedStage } from '../kit/stage.ts'
import type { Proto } from '../kit/types.ts'
import { emptyRating, loadRatings, ratingsAsText, saveRating } from './ratings.ts'
import type { Rating, Ratings, Verdict } from './ratings.ts'

const loaders = import.meta.glob<Proto>(['../protos/*/index.ts', '../kit/example/index.ts'], { import: 'proto' })

interface Entry {
  key: string
  load: () => Promise<Proto>
  proto: Proto | null
  error: string | null
}

// Set by lab/vite.config.ts from LAB_HIDE: keys to leave out of this build.
declare const __ARCADE_HIDE__: string
// A dev server started before the define existed does not have it.
const hidden = new Set((typeof __ARCADE_HIDE__ === 'string' ? __ARCADE_HIDE__ : '').split(',').filter(Boolean))

const entries = new Map<string, Entry>()
for (const [path, load] of Object.entries(loaders)) {
  const folder = path.split('/').slice(-2)[0]!
  const key = path.includes('/kit/example/') ? 'example' : folder
  if (folder.startsWith('_') || hidden.has(key)) continue
  entries.set(key, { key, load, proto: null, error: null })
}

async function resolve(entry: Entry): Promise<Proto | null> {
  if (entry.proto) return entry.proto
  try {
    const proto = await entry.load()
    if (!proto?.meta || typeof proto.create !== 'function') throw new Error('index.ts does not export a `proto` with meta and create')
    if (entry.key !== 'example' && proto.meta.key !== entry.key) console.error(`arcade: ${entry.key} declares key "${proto.meta.key}"`)
    entry.proto = proto
    entry.error = null
    return proto
  } catch (error) {
    entry.error = error instanceof Error ? error.message : String(error)
    console.error(`arcade: ${entry.key} failed to load`, error)
    return null
  }
}

declare global {
  interface Window {
    // For lab/arcade/shot.mjs.
    __arcade?: { key: string | null; stage: MountedStage | null; ready: boolean; loadErrors: Record<string, string> }
  }
}
window.__arcade = { key: null, stage: null, ready: false, loadErrors: {} }

const app = document.getElementById('app')
if (!app) throw new Error('arcade: #app is missing')
const host: HTMLElement = app

let ratings: Ratings = {}
let dispose: (() => void) | null = null
// Set by the play view so ratings that arrive after it mounted still show.
let repaintRating: (() => void) | null = null
let sortBy: 'rating' | 'age' | 'name' = 'age'
try {
  const saved = localStorage.getItem('tada-jam-arcade-sort')
  if (saved === 'rating' || saved === 'age' || saved === 'name') sortBy = saved
} catch {
  // Keep the default.
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function button(className: string, text: string, onClick: () => void, title?: string): HTMLButtonElement {
  const node = el('button', className, text)
  node.type = 'button'
  if (title) node.title = title
  node.addEventListener('click', onClick)
  return node
}

function ratingOf(key: string): Rating {
  return ratings[key] ?? emptyRating()
}

const VERDICTS: { id: Verdict; label: string }[] = [
  { id: 'build', label: '👍 Build it' },
  { id: 'maybe', label: '🤔 Maybe' },
  { id: 'no', label: '👎 No' },
]

// Catalog order: group by group (see catalog.ts), then the chosen sort within
// a group. A prototype missing from the catalog lands in a last group.
const GROUP_INDEX = new Map<string, number>()
CATALOG.forEach((group, index) => group.demos.forEach((demo) => GROUP_INDEX.set(demo.key, index)))

function ordered(): Entry[] {
  const list = [...entries.values()].filter((e) => e.key !== 'example')
  const name = (e: Entry) => e.proto?.meta.name ?? e.key
  const group = (e: Entry) => GROUP_INDEX.get(e.key) ?? CATALOG.length
  list.sort((a, b) => {
    if (group(a) !== group(b)) return group(a) - group(b)
    if (sortBy === 'rating') {
      const d = ratingOf(b.key).stars - ratingOf(a.key).stars
      if (d !== 0) return d
    }
    if (sortBy === 'age' || sortBy === 'rating') {
      const d = (a.proto?.meta.ages[0] ?? 99) - (b.proto?.meta.ages[0] ?? 99) || (a.proto?.meta.ages[1] ?? 99) - (b.proto?.meta.ages[1] ?? 99)
      if (d !== 0) return d
    }
    return name(a).localeCompare(name(b))
  })
  return list
}

// ---- The list ----

function renderList(): () => void {
  document.title = 'Tada Jam demos'
  const page = el('main', 'list')
  const head = el('header', 'list-head')
  const titles = el('div')
  titles.append(el('h1', 'list-title', 'Demos'))
  const note = el('p', 'list-note')
  titles.append(note)
  const tools = el('div', 'list-tools')
  const sorts: { id: typeof sortBy; label: string }[] = [
    { id: 'age', label: 'By age' },
    { id: 'rating', label: 'By my rating' },
    { id: 'name', label: 'A to Z' },
  ]
  for (const s of sorts) {
    const b = button(`chip${sortBy === s.id ? ' chip-on' : ''}`, s.label, () => {
      sortBy = s.id
      try {
        localStorage.setItem('tada-jam-arcade-sort', s.id)
      } catch {
        // Not remembered, still applied.
      }
      render()
    })
    tools.append(b)
  }
  const copy = button('chip', 'Copy my ratings', () => {
    const names = new Map([...entries.values()].map((e) => [e.key, e.proto?.meta.name ?? e.key]))
    const text = ratingsAsText(ratings, names)
    void navigator.clipboard?.writeText(text).then(
      () => (copy.textContent = 'Copied'),
      () => window.prompt('Copy your ratings', text),
    )
  })
  tools.append(copy)
  const old = el('a', 'chip', 'Round 1 lab')
  old.href = '../index.html'
  tools.append(old)
  // The jam's build publishes the lab under /lab/, so its home is two levels up.
  if (location.pathname.includes('/lab/')) {
    const jam = el('a', 'chip', 'Jam home')
    jam.href = '../../index.html'
    tools.append(jam)
  }
  head.append(titles, tools)
  const grid = el('div', 'grid')
  page.append(head, grid)
  host.replaceChildren(page)

  let alive = true
  const paint = () => {
    if (!alive) return
    const list = ordered()
    const rated = list.filter((e) => ratingOf(e.key).stars > 0).length
    note.textContent = `${list.length} demos, not games yet: each one tests a single idea. Play one for a minute, then give it stars. ${rated} of ${list.length} rated.`
    const nodes: HTMLElement[] = []
    CATALOG.forEach((group, index) => {
      const members = list.filter((e) => GROUP_INDEX.get(e.key) === index)
      if (members.length === 0) return
      nodes.push(sectionHead(group.title, group.testing, members.length))
      nodes.push(...members.map(card))
    })
    const loose = list.filter((e) => !GROUP_INDEX.has(e.key))
    if (loose.length > 0) {
      nodes.push(sectionHead('Not yet sorted', 'New demos that are not in the catalog yet.', loose.length))
      nodes.push(...loose.map(card))
    }
    grid.replaceChildren(...nodes)
  }
  paint()
  void Promise.all([...entries.values()].map(resolve)).then(paint)
  return () => {
    alive = false
    host.replaceChildren()
  }
}

function sectionHead(title: string, testing: string, count: number): HTMLElement {
  const head = el('div', 'section-head')
  const heading = el('h2', 'section-title', title)
  heading.append(el('span', 'section-count', String(count)))
  const blurb = el('p', 'section-blurb')
  blurb.append(el('strong', '', 'What we are testing: '), testing)
  head.append(heading, blurb)
  return head
}

function card(entry: Entry): HTMLElement {
  const link = el('a', 'card')
  link.href = `#/play/${entry.key}`
  const meta = entry.proto?.meta
  const rating = ratingOf(entry.key)
  if (rating.verdict) link.classList.add(`card-${rating.verdict}`)
  const top = el('div', 'card-top')
  top.append(el('span', 'card-emoji', meta?.emoji ?? (entry.error ? '💥' : '…')))
  const ages = el('span', 'card-ages', meta ? `${meta.ages[0]}–${meta.ages[1]}` : '')
  top.append(ages)
  link.append(top, el('h2', 'card-name', meta?.name ?? entry.key))
  link.append(el('p', 'card-pitch', meta?.pitch ?? entry.error ?? 'Loading'))
  const demo = demoOf(entry.key)
  if (demo) link.append(el('p', 'card-question', demo.question))
  if (demo?.look) top.insertBefore(el('span', 'card-look', demo.look), ages)
  if (meta) link.append(el('p', 'card-based', `From: ${meta.basedOn}`))
  const foot = el('div', 'card-foot')
  foot.append(el('span', rating.stars > 0 ? 'stars stars-on' : 'stars', rating.stars > 0 ? '★'.repeat(rating.stars) + '☆'.repeat(5 - rating.stars) : 'not rated'))
  const verdict = VERDICTS.find((v) => v.id === rating.verdict)
  if (verdict) foot.append(el('span', 'card-verdict', verdict.label))
  link.append(foot)
  return link
}

// ---- The play view ----

function renderPlay(route: PlayRoute): () => void {
  const entry = entries.get(route.key)!
  const root = el('div', 'play')
  const field = el('div', 'field')
  let stage: MountedStage | null = null
  let alive = true
  const cleanups: (() => void)[] = []

  const go = (step: number) => {
    const list = ordered()
    const at = list.findIndex((e) => e.key === entry.key)
    const next = list[(at + step + list.length) % list.length]
    if (next) location.hash = buildPlayHash({ ...route, key: next.key })
  }

  let paintRating: () => void = () => {}
  const setRating = (patch: Partial<Rating>) => {
    void saveRating(ratings, entry.key, { ...ratingOf(entry.key), ...patch })
    paintRating()
  }

  if (route.chrome) {
    const strip = el('div', 'strip')
    const nav = el('div', 'strip-group')
    const back = el('a', 'btn', '▦')
    back.href = '#/'
    back.title = 'All prototypes'
    nav.append(
      back,
      button('btn', '◀', () => go(-1), 'Previous (left arrow)'),
      button('btn', '▶', () => go(1), 'Next (right arrow)'),
      button('btn', '↻', () => stage?.restart(), 'Restart (R)'),
    )
    const sound = button('btn', '🔊', () => {
      if (!stage) return
      stage.sfx.setMuted(!stage.sfx.muted)
      sound.textContent = stage.sfx.muted ? '🔇' : '🔊'
    })
    nav.append(sound)
    const title = el('div', 'strip-title')
    const name = el('strong', '', entry.key)
    const how = el('span', 'strip-how', '')
    title.append(name, how)

    const rate = el('div', 'strip-group strip-rate')
    const stars: HTMLButtonElement[] = []
    for (let n = 1; n <= 5; n++) {
      const b = button('star', '★', () => setRating({ stars: ratingOf(entry.key).stars === n ? 0 : n }), `${n} star${n === 1 ? '' : 's'} (key ${n})`)
      stars.push(b)
      rate.append(b)
    }
    const verdicts = VERDICTS.map((v) => {
      const b = button('btn verdict', v.label, () => setRating({ verdict: ratingOf(entry.key).verdict === v.id ? '' : v.id }))
      rate.append(b)
      return { id: v.id, node: b }
    })
    const note = el('input', 'note')
    note.type = 'text'
    note.placeholder = 'Note: what worked, what did not'
    note.value = ratingOf(entry.key).note
    note.addEventListener('change', () => setRating({ note: note.value }))
    rate.append(note)

    paintRating = () => {
      const r = ratingOf(entry.key)
      stars.forEach((b, i) => b.classList.toggle('star-on', i < r.stars))
      for (const v of verdicts) v.node.classList.toggle('verdict-on', v.id === r.verdict)
      if (document.activeElement !== note) note.value = r.note
    }
    paintRating()
    repaintRating = paintRating
    strip.append(nav, title, rate)
    root.append(strip)

    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'ArrowRight') go(1)
      else if (event.key === 'ArrowLeft') go(-1)
      else if (event.key === 'r' || event.key === 'R') stage?.restart()
      else if (event.key >= '1' && event.key <= '5') setRating({ stars: Number(event.key) })
      else if (event.key === 'Escape') location.hash = '#/'
    }
    window.addEventListener('keydown', onKey)
    cleanups.push(() => window.removeEventListener('keydown', onKey))

    void resolve(entry).then((proto) => {
      if (!proto) return
      name.textContent = `${proto.meta.emoji} ${proto.meta.name}`
      how.textContent = proto.meta.howTo
    })
  }

  root.append(field)
  host.replaceChildren(root)
  window.__arcade = { key: entry.key, stage: null, ready: false, loadErrors: window.__arcade?.loadErrors ?? {} }

  void resolve(entry).then((proto) => {
    if (!alive) return
    if (!proto) {
      window.__arcade!.loadErrors[entry.key] = entry.error ?? 'failed to load'
      field.append(el('pre', 'load-error', `${entry.key} failed to load:\n${entry.error ?? ''}`))
      window.__arcade!.ready = true
      return
    }
    document.title = `${proto.meta.name} - Arcade round`
    stage = mountStage(field, proto, route.seed)
    window.__arcade!.stage = stage
    window.__arcade!.ready = true
  })

  return () => {
    alive = false
    repaintRating = null
    for (const fn of cleanups) fn()
    stage?.dispose()
    stage = null
    host.replaceChildren()
  }
}

function render(): void {
  dispose?.()
  dispose = null
  const route = parseRoute(location.hash, location.search)
  if (route.view === 'play' && entries.has(route.key)) dispose = renderPlay(route)
  else dispose = renderList()
}

window.addEventListener('hashchange', render)
render()
void loadRatings().then((loaded) => {
  ratings = loaded
  // A game in play is not interrupted: only its rating strip is repainted.
  if (repaintRating) repaintRating()
  else render()
})
