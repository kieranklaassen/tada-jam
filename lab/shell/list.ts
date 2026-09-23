// The prototype list: a card grid, one card per prototype, each a plain link
// to #/play/<key>. Words and numbers are fine in the lab.

import { TOYS } from '../ideas/toys.ts'
import type { Proto } from '../kit/proto.ts'

export interface RegistryEntry {
  key: string
  proto: Proto
}

const TOY_NAMES = new Map(TOYS.map((toy) => [toy.id, toy.name]))

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function row(label: string, value: string): HTMLElement {
  const line = el('div', 'row')
  line.append(el('span', 'row-label', label), el('span', 'row-value', value))
  return line
}

function card(entry: RegistryEntry): HTMLElement {
  const { meta } = entry.proto
  const link = el('a', entry.key === 'example' ? 'card card-reference' : 'card')
  link.href = `#/play/${entry.key}`
  const head = el('div', 'card-head')
  head.append(el('h2', 'card-name', meta.name))
  if (entry.key === 'example') head.append(el('span', 'badge', 'reference'))
  link.append(
    head,
    row('verb', meta.verb),
    row('engine', meta.engine),
    row('ages', `${meta.ageBand[0]} to ${meta.ageBand[1]}`),
    row('toy', meta.toy ? (TOY_NAMES.get(meta.toy) ?? meta.toy) : 'none'),
  )
  return link
}

// The reference first, then the rest by name.
export function sortEntries(entries: readonly RegistryEntry[]): RegistryEntry[] {
  return [...entries].sort((a, b) => {
    if (a.key === 'example') return -1
    if (b.key === 'example') return 1
    return a.proto.meta.name.localeCompare(b.proto.meta.name)
  })
}

export function renderList(host: HTMLElement, entries: readonly RegistryEntry[]): () => void {
  const page = el('main', 'list')
  page.append(el('h1', 'list-title', 'Mechanic lab'))
  const count = entries.filter((e) => e.key !== 'example').length
  const found = count === 0 ? 'No prototypes yet, only the reference.' : `${count} prototype${count === 1 ? '' : 's'} plus the reference.`
  page.append(el('p', 'list-note', `${found} Add ?chrome=0 to a play link to hide the grown-up strip.`))
  const grid = el('div', 'grid')
  for (const entry of sortEntries(entries)) grid.append(card(entry))
  page.append(grid)
  host.replaceChildren(page)
  return () => host.replaceChildren()
}
