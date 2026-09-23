import { clampToTable, MAT_KEYS, RADIUS_BY_QUARTERS, type MatKey, type Quarters } from './layout'
import type { Piece } from './state'

// The album of past tables. When the child starts over (tips the bag again or
// switches activity) with an arrangement on the table, that arrangement is
// kept as a page. Tapping the album sets the newest page back on the table
// and files the current arrangement as the oldest page, so repeated taps flip
// back through the child's own tables and nothing is ever lost. Pages are
// never counted or shown to the child as a number.

export const ALBUM_PAGES = 6
export const MIN_STONES_FOR_PAGE = 3

export type AlbumStone = { q: Quarters; x: number; y: number }
export type AlbumPage = { mat: MatKey; stones: AlbumStone[] }

/** The arrangement worth keeping, or null when there is too little on the table to be a creation. */
export function pageOf(mat: MatKey, pieces: readonly Piece[]): AlbumPage | null {
  if (pieces.length < MIN_STONES_FOR_PAGE) return null
  return { mat, stones: pieces.map((piece) => ({ q: piece.q, x: Math.round(piece.x), y: Math.round(piece.y) })) }
}

function samePage(a: AlbumPage, b: AlbumPage): boolean {
  if (a.mat !== b.mat || a.stones.length !== b.stones.length) return false
  const key = (page: AlbumPage) => page.stones.map((s) => `${s.q}:${Math.round(s.x / 20)}:${Math.round(s.y / 20)}`).sort().join('|')
  return key(a) === key(b)
}

/** Keep a page, newest last; skip it when it matches the newest page; drop the oldest past the limit. */
export function keepPage(album: AlbumPage[], page: AlbumPage | null): boolean {
  if (!page) return false
  const newest = album[album.length - 1]
  if (newest && samePage(newest, page)) return false
  album.push(page)
  while (album.length > ALBUM_PAGES) album.shift()
  return true
}

/** Take the newest page to restore, filing the current arrangement (if any) as the oldest page. */
export function turnPage(album: AlbumPage[], current: AlbumPage | null): AlbumPage | null {
  const page = album.pop() ?? null
  if (!page) return null
  if (current && !samePage(current, page)) {
    album.unshift(current)
    while (album.length > ALBUM_PAGES) album.pop()
  }
  return page
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Saved pages are untrusted: known mats, whole/half/quarter stones only, positions on the table, at most the page limit. */
export function readAlbum(raw: unknown, total: number): AlbumPage[] {
  if (!Array.isArray(raw)) return []
  const pages: AlbumPage[] = []
  for (const item of raw.slice(-ALBUM_PAGES)) {
    if (!isRecord(item) || !(MAT_KEYS as readonly unknown[]).includes(item.mat) || !Array.isArray(item.stones)) continue
    const stones: AlbumStone[] = []
    let sum = 0
    for (const stone of item.stones) {
      if (!isRecord(stone)) continue
      const q = stone.q
      if (q !== 1 && q !== 2 && q !== 4) continue
      if (typeof stone.x !== 'number' || typeof stone.y !== 'number' || !Number.isFinite(stone.x) || !Number.isFinite(stone.y)) continue
      if (sum + q > total) break
      const at = clampToTable({ x: stone.x, y: stone.y }, RADIUS_BY_QUARTERS[q])
      stones.push({ q, x: Math.round(at.x), y: Math.round(at.y) })
      sum += q
    }
    if (stones.length >= MIN_STONES_FOR_PAGE) pages.push({ mat: item.mat as MatKey, stones })
  }
  return pages
}
