import { describe, expect, it } from 'vitest'
import { ROSTER, vehicle } from './cycle'
import { silhouette } from './silhouette'
import { tally, type Hand, type Surface } from './surface'
import { TASTES, cellsIn, drumJammed, foamHat, launchFoam, tasteFor } from './tastes'

const middle = (zone: { x0: number; x1: number; y0: number; y1: number }): [number, number] => [(zone.x0 + zone.x1) / 2, (zone.y0 + zone.y1) / 2]

describe('fixed tastes', () => {
  it('every vehicle has one like and one dislike, and no two reactions are the same', () => {
    const ids = new Set<string>()
    for (const def of ROSTER) {
      const [like, dislike] = TASTES[def.id]
      expect(like.feeling).toBe('like')
      expect(dislike.feeling).toBe('dislike')
      ids.add(like.id).add(dislike.id)
    }
    expect(ids.size).toBe(ROSTER.length * 2)
  })

  it('every tool is somebody\'s favourite, and somebody cannot stand it', () => {
    for (const tool of ['sponge', 'hose', 'cloth'] as const) {
      const all = ROSTER.flatMap((def) => TASTES[def.id])
      expect(all.some((taste) => taste.feeling === 'like' && (taste.hand === tool || taste.hand === 'any')), tool).toBe(true)
      expect(all.some((taste) => taste.feeling === 'dislike' && taste.hand === tool), tool).toBe(true)
    }
  })

  it('every zone a taste belongs to lies on the vehicle and holds patches of its body', () => {
    for (const def of ROSTER) {
      const body = silhouette(def)
      for (const taste of TASTES[def.id]) {
        if (taste.where === 'anywhere') continue
        const zone = def.zones[taste.where]
        expect(zone.x0).toBeGreaterThanOrEqual(def.side.x0)
        expect(zone.x1).toBeLessThanOrEqual(def.side.x1)
        expect(zone.y1).toBeLessThanOrEqual(def.side.y1)
        expect(cellsIn(def, zone).filter((cell) => body[cell] !== '.').length, `${def.id} ${taste.id}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('works every time: the same tool on the same part gives the same taste', () => {
    const cases: [string, Hand, 'nose' | 'eyes' | 'wheels' | 'part', string][] = [
      ['tipper', 'cloth', 'nose', 'sneeze'],
      ['fire-engine', 'sponge', 'eyes', 'soap-eyes'],
      ['tractor', 'cloth', 'nose', 'polish-purr'],
      ['tractor', 'hose', 'part', 'pipe-cough'],
      ['mixer', 'finger', 'part', 'drum-turn'],
      ['mixer', 'hose', 'part', 'drum-turn'],
      ['mixer', 'sponge', 'wheels', 'tickle'],
    ]
    for (const [who, hand, where, id] of cases) {
      const def = vehicle(who as (typeof ROSTER)[number]['id'])
      const [x, y] = middle(def.zones[where])
      for (let i = 0; i < 3; i++) expect(tasteFor(def, hand, x, y)?.id, `${who} ${hand} ${where}`).toBe(id)
    }
  })

  it('a taste that holds anywhere gives way to one that belongs to a part', () => {
    const fire = vehicle('fire-engine'), tipper = vehicle('tipper')
    expect(tasteFor(fire, 'hose', 1, 1.4)?.id).toBe('ladder-whoop')
    expect(tasteFor(tipper, 'sponge', 1, 1.4)?.id).toBe('foam-toot')
    // The other tools on the same spot set nothing off.
    expect(tasteFor(tipper, 'hose', 1, 1.4)).toBeNull()
    expect(tasteFor(tipper, 'cloth', 1, 1.4)).toBeNull()
    expect(tasteFor(fire, 'finger', 1, 1.4)).toBeNull()
  })
})

describe('the mixer\'s drum', () => {
  const def = vehicle('mixer')
  it('is jammed by dried mud on it, and free once that mud is wet', () => {
    const clean = silhouette(def)
    expect(drumJammed(def, clean)).toBe(false)
    const drum = cellsIn(def, def.zones.part).filter((cell) => clean[cell] !== '.')
    const caked = clean.slice()
    caked[drum[0]] = 'c'
    expect(drumJammed(def, caked)).toBe(true)
    caked[drum[0]] = 's'
    expect(drumJammed(def, caked)).toBe(false)
  })
})

describe('Tipper\'s sneeze', () => {
  const def = vehicle('tipper')
  const foamOnBed = (): Surface => {
    const s = silhouette(def)
    for (const cell of cellsIn(def, def.zones.part)) if (s[cell] !== '.') s[cell] = 'f'
    return s
  }

  it('launches whatever foam is on the bed and leaves wet paint there', () => {
    const before = foamOnBed()
    const { surface, flew } = launchFoam(def, before)
    expect(flew).toBe(tally(before).f)
    expect(tally(surface).f).toBe(0)
    expect(tally(surface).w).toBe(flew)
    expect(tally(surface).body).toBe(tally(before).body)
  })

  it('changes nothing when there is no foam on the bed', () => {
    const clean = silhouette(def)
    expect(launchFoam(def, clean)).toEqual({ surface: clean, flew: 0 })
  })

  it('gives the vehicle that waits a hat of foam on its topmost patches, at most four', () => {
    const waiting = silhouette(vehicle('fire-engine'))
    expect(tally(foamHat(waiting, 1)).f).toBe(1)
    expect(tally(foamHat(waiting, 5)).f).toBe(3)
    const big = foamHat(waiting, 40)
    expect(tally(big).f).toBe(4)
    expect(tally(big).body).toBe(tally(waiting).body)
    // Nothing above a hat patch is body.
    big.forEach((patch, cell) => { if (patch === 'f') expect(big[cell + 12] ?? '.').toBe('.') })
  })
})
