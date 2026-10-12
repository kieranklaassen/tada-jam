import { describe, expect, it } from 'vitest'
import { FIRST_TUFT, LADDER, MAX_SHAPES } from './config'
import { type Ctx } from './felted'
import { BOWLS, BOWL_REACH, COLS, COMB_HAND, LEAST_FIGURE, LOOP, ROOM, ROWS, SHEEP, SHEPHERD } from './layout'
import { daub, fresh, hangUp, make, setDown, settle } from './probe'
import { paintRoom } from './room'
import { record } from './save'
import { SECONDS } from './scenes'
import { fit } from './stage'
import { STATE_VERSION, freshState } from './state'
import { HALF_COLS, HALF_ROWS, WALL_HOLDS } from './wall'
import { SUN_REACH } from './weather'
import { BLUE, GREEN, LIVING_CELLS, THICKEST, WAYS, WHITE, YELLOW } from './wool'

// The lessons that are kept in the files themselves and not in the play: what
// is drawn for the child, what a test may do, what the two documents say, and
// whether the sheet's own numbers are the code's. The files are read as text
// through the bundler, so no test here opens a file.

const sources = import.meta.glob('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const documents = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const ME = './docs.test.ts'
const names = Object.keys(sources)
const tests = names.filter((name) => name.endsWith('.test.ts') && name !== ME)
const game = names.filter((name) => !name.endsWith('.test.ts'))
const art = documents['./ART.md'], log = documents['./REFINEMENT.md']
/** The design sheet: `ART.md` above the look. */
const sheet = art.slice(0, art.indexOf('\n## The look'))
const count = (text: string, part: string): number => text.split(part).length - 1
/** Words for a builder's own folders outside the repository, put together here so that this file does not hold them either. */
const OUTSIDE = new RegExp(['scr' + 'atch', 'work' + 'tree'].join('|'), 'i')

describe('lesson 9: nothing written, and the lookalikes that stay are listed for the reader', () => {
  it('calls no text on any surface, has no symbols module, and gives no element a title or a label a child would read', () => {
    for (const name of game) {
      expect(sources[name], name).not.toMatch(/fillText|strokeText|measureText|\.font\s*=/)
      expect(sources[name], name).not.toMatch(/\btitle=|placeholder=|alt=/)
    }
    expect(names).not.toContain('./symbols.ts')
  })

  it('keeps a section for the reader in the log, naming each drawn mark that could be taken for a sign', () => {
    const at = log.indexOf('\n## Reader')
    expect(at).toBeGreaterThan(0)
    const section = log.slice(at, log.indexOf('\n## ', at + 4))
    for (const mark of ['half-rings', 'grass', 'ripples', 'scallops', 'rays', 'teeth', 'loop', 'ears', 'curls', 'drops', 'brace', 'stitches']) expect(section, mark).toContain(mark)
  })

  it('draws no whole ring and no oval among what the wool carries: a bubble is a dome, an ear and a leaf are pointed', () => {
    const carry = sources['./carry.ts']
    expect(carry).not.toMatch(/c\.ellipse\([^)]*0, TAU\)/)
    expect(carry).not.toMatch(/c\.arc\([^)]*, 0, TAU\)/)
  })
})

describe('lessons 10 and 17: what a test may do', () => {
  it('writes no file, reads no environment and makes no folder in any test of the game', () => {
    for (const name of tests) {
      expect(sources[name], name).not.toMatch(/node:fs|from 'fs'|writeFile|mkdtemp|mkdir|tmpdir|process\.env|import\.meta\.env/)
    }
  })
})

describe('lesson 11: the sheet\'s own numbers are the code\'s', () => {
  it('has the bowls, the figures, the grid and the most shapes as the sheet gives them', () => {
    expect(sheet).toContain('a circle of 120 stage units')
    expect(BOWL_REACH * 2).toBe(120)
    expect(sheet).toContain('the bowls stand 136 apart')
    for (let i = 1; i < BOWLS.length; i++) expect(BOWLS[i].x - BOWLS[i - 1].x).toBe(136)
    expect(sheet).toContain('at least 80 by 80')
    expect(LEAST_FIGURE).toBe(80)
    expect(sheet).toContain('72 by 48 cells')
    expect([COLS, ROWS]).toEqual([72, 48])
    expect(sheet).toContain('At most 20')
    expect(MAX_SHAPES).toBe(20)
    expect(sheet).toContain('fewer than ten cells')
    expect(LIVING_CELLS).toBe(10)
    expect(sheet).toContain('its thickness, 1 to 7, and which of 8 ways')
    expect([THICKEST, WAYS]).toEqual([7, 8])
    expect(sheet).toContain('5 for the comb')
    expect(COMB_HAND).toBe(5)
  })

  it('has the weather, the scenes and the wall as the sheet gives them', () => {
    expect(sheet).toContain('within 16 cells of each other')
    expect(SUN_REACH).toBe(16)
    expect(count(sheet, 'Beats, 5 seconds')).toBe(3)
    expect(count(sheet, 'Beats, 8 seconds')).toBe(1)
    expect(count(sheet, 'Beats, 4 seconds')).toBe(1)
    expect(SECONDS).toEqual({ rain: 5, sun: 5, bow: 5, evening: 8, fresh: 4 })
    expect(sheet).toContain('36 by 24 cells')
    expect([HALF_COLS, HALF_ROWS]).toEqual([36, 24])
    expect(sheet).toContain('The last three hung pictures')
    expect(WALL_HOLDS).toBe(3)
  })

  it('has the one place, the first tuft by age and every saved field as the sheet gives them', () => {
    expect(sheet).toContain('1. `open-felt`')
    expect(LADDER).toEqual(['open-felt'])
    expect(sheet).toContain('4 and younger, or no age, a handful; 5 and 6, a tuft; 7 and older, a wisp')
    expect(FIRST_TUFT).toEqual([{ fromAge: 4, size: 0 }, { fromAge: 5, size: 1 }, { fromAge: 7, size: 2 }])
    expect(sheet).toContain('The version of the record, 1.')
    expect(STATE_VERSION).toBe(1)
    const table = sheet.slice(sheet.indexOf('| Field | What it holds |'), sheet.indexOf('The largest state is'))
    const fields = [...table.matchAll(/^\| `(\w+)` \|/gm)].map((row) => row[1])
    expect(fields.sort()).toEqual(Object.keys(record(freshState(null), fresh())).sort())
  })

  it('stands a figure to its knees in a pond or a stream, and nowhere else', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, BLUE, 30, 38, 46, 44)
    daub(toy, GREEN, 2, 38, 18, 44)
    settle(toy)
    setDown(toy, SHEEP, 38, 41)
    expect(toy.folk[SHEEP].wade).toBe(true)
    setDown(toy, SHEEP, 10, 41)
    expect(toy.folk[SHEEP].wade).toBe(false)
  })

  it('has a figure that a sun dries look about when the drying comes, in the sun\'s scene', () => {
    const toy = fresh(GREEN, 1, 9)
    daub(toy, WHITE, 6, 3, 20, 8)
    settle(toy)
    setDown(toy, SHEPHERD, 17, 40)
    settle(toy)
    expect(toy.folk[SHEPHERD].act).toBe('wet')
    daub(toy, YELLOW, 26, 4, 31, 9)
    expect(toy.show.kind).toBe('sun')
    expect(toy.folk[SHEPHERD].dried).toBe(true)
    toy.advance(3)
    expect(toy.folk[SHEPHERD].mood).not.toBe('look')
    toy.advance(0.5)
    expect(toy.folk[SHEPHERD].mood).toBe('look')
  })

  it('turns the fresh felt at a touch on the felt and not on the wood round it: taps where the loop hung leave the evening', () => {
    const toy = fresh(GREEN, 1, 5)
    daub(toy, GREEN, 2, 38, 18, 44)
    settle(toy)
    const low = { x: LOOP.x, y: LOOP.y + LOOP.h / 2 - 4 }
    hangUp(toy)
    expect(toy.finished).toBe(true)
    toy.advance(0.3)
    toy.press(low); toy.end('tap')
    toy.advance(0.3)
    toy.press(low); toy.end('tap')
    toy.advance(1)
    expect(toy.finished).toBe(true)
    expect(toy.show.kind).toBe('none')
    expect(toy.wall).toHaveLength(1)
  })
})

describe('lesson 12: every pair in the table is in the sheet, or can still be pasted', () => {
  it('finds a pasted pair\'s replacement once in the sheet, as it was pasted or as a later pair extended it, and a waiting pair\'s "as it stands" once', () => {
    const rows = [...log.matchAll(/^\| (\d+) \| (add|change) \| (.+?) \| (.+?) \| (pasted|waits) \|$/gm)].map((row) => ({ n: Number(row[1]), stands: row[3], replacement: row[4], pasted: row[5] === 'pasted' }))
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((row) => row.n)).toEqual(rows.map((_, i) => i + 1))
    // No row of the table is left out by the pattern above.
    expect(count(log, '\n| ') - count(log, '\n| --- ')).toBeGreaterThanOrEqual(rows.length)
    for (const row of rows) {
      if (!row.pasted) { expect(count(sheet, row.stands), `pair ${row.n} waits`).toBe(1); continue }
      // A later pasted pair may have changed a part of what this one pasted: the sheet then holds this replacement with that part replaced.
      let now = row.replacement
      for (const later of rows) {
        if (later.n <= row.n || !later.pasted) continue
        if (now.includes(later.stands)) { now = now.split(later.stands).join(later.replacement); continue }
        // A later pair may also have replaced a sentence that only the start or the end of this replacement was part of: what it did not touch is still in the sheet.
        for (let length = Math.min(now.length - 1, later.stands.length); length >= 20; length--) {
          if (later.stands.endsWith(now.slice(0, length))) { now = now.slice(length).trim(); break }
          if (later.stands.startsWith(now.slice(-length))) { now = now.slice(0, -length).trim(); break }
        }
      }
      expect(count(sheet, now), `pair ${row.n} is pasted`).toBe(1)
    }
    // Pairs wait at the end of the table only: they are pasted in order.
    const first = rows.findIndex((row) => !row.pasted)
    if (first >= 0) expect(rows.slice(first).every((row) => !row.pasted)).toBe(true)
  })
})

describe('lesson 13: the documents and the code name no place on a machine', () => {
  it('has no machine path, no folder outside the repository and no web address in any file of the game', () => {
    const all = { ...documents, ...sources }
    for (const name of Object.keys(all)) {
      if (name === ME) continue
      expect(all[name], name).not.toMatch(/\/(home|tmp|root|Users|mnt|var)\//)
      expect(all[name], name).not.toMatch(OUTSIDE)
      expect(all[name], name).not.toMatch(/https?:\/\/|www\./)
    }
  })
})

describe('lesson 15: the game draws on a 2D canvas and brings in no engine', () => {
  it('imports no 3D, sprite or physics engine: nothing passes through anything by tests of where things rest, not by an audit of meshes', () => {
    for (const name of game) expect(sources[name], name).not.toMatch(/from '(three|@react-three|pixi|matter-js|cannon|@dimforge|planck|box2d)/)
  })
})

describe('lesson 16: the frame is filled from edge to edge', () => {
  it.each([[1180, 820], [1024, 768], [1366, 820]])('paints the wall and the table past the stage on a surface of %i by %i', (width, height) => {
    const by = fit(width, height), bleedX = by.x / by.scale, bleedY = by.y / by.scale
    const rects: number[][] = []
    const surface = new Proxy({} as Record<string, unknown>, {
      get(held, name: string) {
        if (name in held) return held[name]
        if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => ({ addColorStop: () => undefined })
        if (name === 'fillRect') return (...args: number[]) => { rects.push(args) }
        return () => undefined
      },
      set(held, name: string, value) { held[name] = value; return true },
    }) as unknown as Ctx
    paintRoom(surface, make, [by.scale, 0, 0, by.scale, by.x, by.y], bleedX, bleedY, by.scale)
    const [wall, table] = rects
    // The wall from past the top and both sides down to the table, and the table from there to past the bottom.
    expect(wall[0]).toBeLessThanOrEqual(-bleedX)
    expect(wall[1]).toBeLessThanOrEqual(-bleedY)
    expect(wall[0] + wall[2]).toBeGreaterThanOrEqual(ROOM.width + bleedX)
    expect(table[1]).toBe(wall[1] + wall[3])
    expect(table[1] + table[3]).toBeGreaterThanOrEqual(ROOM.height + bleedY)
  })
})
