import { describe, expect, it } from 'vitest'
import { ALBUM_PAGES, keepPage, pageOf, readAlbum, turnPage, type AlbumPage } from './album'

const page = (x: number, count = 3): AlbumPage => ({ mat: 'feeding', stones: Array.from({ length: count }, (_, i) => ({ q: 4 as const, x: x + i * 60, y: 500 })) })

describe('album', () => {
  it('keeps only arrangements of three stones or more', () => {
    expect(pageOf('feeding', [{ id: 1, q: 4, x: 1, y: 1 }, { id: 2, q: 4, x: 2, y: 2 }])).toBeNull()
    expect(pageOf('scale', [1, 2, 3].map((id) => ({ id, q: 4 as const, x: id * 100, y: 500 })))?.stones).toHaveLength(3)
  })

  it('skips a page that matches the newest one and drops the oldest past the limit', () => {
    const album: AlbumPage[] = []
    expect(keepPage(album, page(400))).toBe(true)
    expect(keepPage(album, page(402))).toBe(false)
    for (let i = 0; i < ALBUM_PAGES + 3; i++) keepPage(album, page(100 + i * 100))
    expect(album).toHaveLength(ALBUM_PAGES)
  })

  it('turns back through the pages without ever losing the current table', () => {
    const album = [page(100), page(300)]
    const current = page(700)
    expect(turnPage(album, current)?.stones[0].x).toBe(300)
    expect(album.map((p) => p.stones[0].x)).toEqual([700, 100])
    expect(turnPage(album, page(300))?.stones[0].x).toBe(100)
    expect(album.map((p) => p.stones[0].x)).toEqual([300, 700])
  })

  it('reads saved pages defensively', () => {
    const raw = [page(100), { mat: 'moon', stones: [] }, { mat: 'scale', stones: [{ q: 3, x: 1, y: 1 }, { q: 4, x: 99999, y: 500 }, { q: 4, x: 500, y: 500 }, { q: 4, x: 600, y: 500 }] }, 'junk']
    const pages = readAlbum(JSON.parse(JSON.stringify(raw)), 40)
    expect(pages.map((p) => p.mat)).toEqual(['feeding', 'scale'])
    expect(pages[1].stones).toHaveLength(3)
    expect(pages[1].stones[0].x).toBeLessThan(1500)
    expect(readAlbum([page(100, 12)], 16)[0].stones).toHaveLength(4)
  })
})
