import { describe, expect, it } from 'vitest'
import { BIRD_REACH, CAT, CLOTHS, CLOTH_REACH, CORNER, HELD, HOLD_PAWS, HOME, MAT, PAPER, PAPER_SHAPE, PAPER_TURN, PAW_HIT, PEGS, POOL, POT, PRINT, SILL, TABLE_Y, TOOL, TOOL_IDS, TRAY, fromCells, hungRect, inRect, lineY, onWater, toCells, whatIsAt, type Laid, type Rect, type ToolId } from './layout'
import { CORNER as OVERLAY_CORNER } from './overlay'
import { STAGE, fit, toStage } from './stage'
import { GRID } from './tray'

/** The surfaces the stage is fitted to: kid-land is landscape only. */
const SURFACES = [{ width: 1180, height: 820 }, { width: 1024, height: 768 }] as const

const ALL_TOOLS: readonly ToolId[] = TOOL_IDS
const NO_PEGS = PEGS.map(() => false), ALL_PEGS = PEGS.map(() => true)
/** The table with nothing set down on it, and with everything the game can set down. */
const bare = (birdX = 0): Laid => ({ birdX, tools: [], held: false, hung: NO_PEGS })
const laden = (birdX = 0): Laid => ({ birdX, tools: ALL_TOOLS, held: true, hung: ALL_PEGS })
const potBox = (pot: number): Rect => ({ x: POT.x - POT.r - POT.reach, y: POT.ys[pot] - POT.r - POT.reach, w: (POT.r + POT.reach) * 2, h: (POT.r + POT.reach) * 2 })
const overlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const middle = (r: Rect): { x: number; y: number } => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

describe('where things stand', () => {
  it('keeps the pots 120 across and 140 apart, clear of each other, the tray and the bottom of the stage', () => {
    expect(POT.r * 2).toBe(120)
    for (let i = 1; i < POT.ys.length; i++) expect(POT.ys[i] - POT.ys[i - 1]).toBe(140)
    expect(POT.x - POT.r).toBeGreaterThan(TRAY.x + TRAY.w + 20)
    expect(POT.ys[POT.ys.length - 1] + POT.r).toBeLessThan(STAGE.height - 100)
    expect(POT.ys[0] - POT.r).toBeGreaterThan(TABLE_Y)
  })

  it('lays the water inside the tray and the tray on the table, and the water has the grid\'s shape', () => {
    expect(POOL.x).toBeGreaterThan(TRAY.x)
    expect(POOL.y).toBeGreaterThan(TRAY.y)
    expect(POOL.x + POOL.w).toBeLessThan(TRAY.x + TRAY.w)
    expect(POOL.y + POOL.h).toBeLessThan(TRAY.y + TRAY.h)
    expect(TRAY.y).toBeGreaterThan(TABLE_Y)
    expect(TRAY.y + TRAY.h).toBeLessThanOrEqual(STAGE.height)
    expect(Math.abs(POOL.w / POOL.h - GRID.w / GRID.h)).toBeLessThan(0.01)
    // The hero thing is large: the tray takes more than a third of the frame.
    expect((TRAY.w * TRAY.h) / (STAGE.width * STAGE.height)).toBeGreaterThan(0.4)
  })

  it('turns a place on the stage into a cell of the water and back', () => {
    for (const [x, y] of [[POOL.x, POOL.y], [400, 500], [POOL.x + POOL.w - 1, POOL.y + POOL.h - 1]] as const) {
      const cell = toCells(x, y), back = fromCells(cell.x, cell.y)
      expect(back.x).toBeCloseTo(x, 6)
      expect(back.y).toBeCloseTo(y, 6)
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.x).toBeLessThan(GRID.w)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeLessThan(GRID.h)
    }
  })

  it('keeps the cat off the water: its paws and its chin rest on the rim', () => {
    for (const paw of CAT.paws) {
      expect(paw.y + paw.ry).toBeLessThanOrEqual(POOL.y)
      expect(paw.y + paw.ry).toBeGreaterThan(TRAY.y)
    }
    expect(CAT.head.y + CAT.head.ry).toBeLessThanOrEqual(POOL.y)
    for (let x = POOL.x; x < POOL.x + POOL.w; x += 7) expect(whatIsAt(x, POOL.y, bare()).kind).toBe('water')
    // The cat is large: its head alone is a fifth of the stage wide.
    expect((CAT.head.rx * 2) / STAGE.width).toBeGreaterThan(0.18)
  })

  it('finds each thing where it is drawn, with nothing set down', () => {
    expect(whatIsAt(POOL.x + 5, POOL.y + 5, bare()).kind).toBe('water')
    expect(whatIsAt(POT.x, POT.ys[0], bare())).toEqual({ kind: 'pot', pot: 0 })
    expect(whatIsAt(POT.x + POT.r - 2, POT.ys[2], bare())).toEqual({ kind: 'pot', pot: 2 })
    expect(whatIsAt(CAT.head.x, CAT.head.y, bare())).toMatchObject({ kind: 'cat', part: 'head' })
    expect(whatIsAt(CAT.paws[0].x, CAT.paws[0].y, bare())).toEqual({ kind: 'cat', part: 'paw', paw: 0 })
    expect(whatIsAt(CAT.paws[1].x, CAT.paws[1].y, bare())).toEqual({ kind: 'cat', part: 'paw', paw: 1 })
    expect(whatIsAt(CAT.body.x - 150, CAT.body.y - 20, bare())).toMatchObject({ kind: 'cat', part: 'body' })
    expect(whatIsAt(800, SILL.y - 20, bare(800)).kind).toBe('bird')
    expect(whatIsAt(800, SILL.y - 20, bare(900)).kind).toBe('room')
    CLOTHS.forEach((cloth, index) => expect(whatIsAt(cloth.x, lineY(cloth.x) + cloth.h / 2, bare())).toEqual({ kind: 'cloth', cloth: index }))
    expect(whatIsAt(TRAY.x + 10, TRAY.y + 300, bare()).kind).toBe('rim')
    expect(whatIsAt(1100, 790, bare()).kind).toBe('room')
    expect(whatIsAt(middle(PAPER).x, middle(PAPER).y, bare())).toEqual({ kind: 'paper' })
    expect(onWater(POOL.x - 1, POOL.y + 10)).toBe(false)
  })

  it('touches a thing the game sets down where it is drawn, and only while it is there', () => {
    // A tool that has not come to the table is not there to touch: its place is the bare cloth.
    for (const tool of TOOL_IDS) {
      const at = middle(TOOL[tool])
      expect(whatIsAt(at.x, at.y, bare()).kind).toBe('mat')
      expect(whatIsAt(at.x, at.y, laden())).toEqual({ kind: 'tool', tool })
      // Every corner of its box, a little way in.
      for (const [fx, fy] of [[0.04, 0.06], [0.96, 0.06], [0.04, 0.94], [0.96, 0.94]] as const) {
        expect(whatIsAt(TOOL[tool].x + TOOL[tool].w * fx, TOOL[tool].y + TOOL[tool].h * fy, laden())).toEqual({ kind: 'tool', tool })
      }
      expect(inRect(at.x, at.y, MAT)).toBe(true)
    }
    // The held print lies over the near edge of the tray: with no print held, that place is the water or the cat.
    const held = middle(HELD)
    expect(['water', 'cat', 'rim']).toContain(whatIsAt(held.x, held.y, bare()).kind)
    expect(whatIsAt(held.x, held.y, laden())).toEqual({ kind: 'held' })
    expect(whatIsAt(HELD.x + 3, HELD.y + HELD.h - 3, laden())).toEqual({ kind: 'held' })
    // A hung print is touched on its own peg and nowhere else; an empty peg is the room, or the window behind it.
    PEGS.forEach((_, peg) => {
      const at = middle(hungRect(peg))
      expect(whatIsAt(at.x, at.y, bare()).kind).toBe('room')
      expect(whatIsAt(at.x, at.y, laden())).toEqual({ kind: 'print', peg })
      const only = PEGS.map((__, other) => other === peg)
      PEGS.forEach((__, other) => {
        const there = middle(hungRect(other))
        expect(whatIsAt(there.x, there.y, { ...bare(), hung: only }).kind).toBe(other === peg ? 'print' : 'room')
      })
    })
  })

  it.each(SURFACES)('sets nothing down over a target: no two things a child touches overlap at $width by $height', ({ width, height }) => {
    const { scale } = fit(width, height)
    const things: [string, Rect][] = [
      ...POT.ys.map((_, pot): [string, Rect] => [`pot ${pot}`, potBox(pot)]),
      ...TOOL_IDS.map((tool): [string, Rect] => [tool, TOOL[tool]]),
      ['paper', PAPER],
      ['held print', { x: HELD.x - 4, y: HELD.y - 4, w: HELD.w + 8, h: HELD.h + 8 }],
      ...PEGS.map((_, peg): [string, Rect] => [`peg ${peg}`, { x: hungRect(peg).x - 4, y: hungRect(peg).y - 4, w: hungRect(peg).w + 8, h: hungRect(peg).h + 8 }]),
      ...CLOTHS.map((cloth): [string, Rect] => [cloth.id, { x: cloth.x - cloth.w / 2 - CLOTH_REACH, y: lineY(cloth.x) - CLOTH_REACH, w: cloth.w + CLOTH_REACH * 2, h: cloth.h + CLOTH_REACH * 2 }]),
    ]
    for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) {
      expect(overlap(things[i][1], things[j][1]), `${things[i][0]} and ${things[j][0]}`).toBe(false)
    }
    // Nothing the game sets down lies on the water but the print in the cat's paws, and a touch on that print is
    // the print's, never the water's.
    const pool: Rect = { x: POOL.x, y: POOL.y, w: POOL.w, h: POOL.h }
    for (const [name, rect] of things) if (name !== 'held print') expect(overlap(rect, pool), name).toBe(false)
    for (let x = HELD.x; x < HELD.x + HELD.w; x += 5) for (let y = HELD.y; y < HELD.y + HELD.h; y += 5) expect(whatIsAt(x, y, laden())).toEqual({ kind: 'held' })
    // A hung print covers its own peg: the peg is the top middle of its box, on the line.
    PEGS.forEach((peg, index) => {
      const rect = hungRect(index)
      expect(rect.x + rect.w / 2).toBeCloseTo(peg.x, 6)
      expect(rect.y - lineY(peg.x)).toBeLessThan(20)
      // And the bird, wherever it stands, is below every hung print.
      expect(rect.y + rect.h).toBeLessThan(SILL.y - 20 - BIRD_REACH)
    })
    // Each of them is on the stage, whole, and so on the surface.
    for (const [name, rect] of things) {
      expect(rect.x, name).toBeGreaterThanOrEqual(0)
      expect(rect.y, name).toBeGreaterThanOrEqual(0)
      expect((rect.x + rect.w) * scale, name).toBeLessThanOrEqual(STAGE.width * scale)
      expect(rect.y + rect.h, name).toBeLessThanOrEqual(STAGE.height)
    }
  })

  it.each(SURFACES)('gives every thing a child can touch 48 pixels or more at $width by $height', ({ width, height }) => {
    const { scale } = fit(width, height)
    const smallest = [
      POT.r * 2,
      ...TOOL_IDS.map((tool) => Math.min(TOOL[tool].w, TOOL[tool].h)),
      Math.min(PAPER.w, PAPER.h),
      Math.min(HELD.w, HELD.h),
      ...PEGS.map((_, peg) => Math.min(hungRect(peg).w, hungRect(peg).h)),
      ...CLOTHS.map((cloth) => Math.min(cloth.w, cloth.h) + CLOTH_REACH * 2),
      BIRD_REACH * 2,
      CAT.head.ry * 2,
      // A paw, across and up and down.
      PAW_HIT.rx * 2,
      PAW_HIT.ry * 2,
    ]
    for (const size of smallest) expect(size * scale).toBeGreaterThanOrEqual(48)
    // The paw's target is measured as it is touched: every place across its width and its height answers as the
    // paw, on the rim and at the sides of a print it holds.
    const holding: Laid = { ...laden(), holding: true }
    CAT.paws.forEach((paw, index) => {
      const mid = paw.y - PAW_HIT.up, me = { kind: 'cat', part: 'paw', paw: index }
      for (let dy = -PAW_HIT.ry + 1; dy < PAW_HIT.ry; dy += 3) expect(whatIsAt(paw.x, mid + dy, bare()), `${dy}`).toEqual(me)
      for (let dx = -PAW_HIT.rx + 1; dx < PAW_HIT.rx; dx += 3) expect(whatIsAt(paw.x + dx, mid, bare()), `${dx}`).toEqual(me)
      // Holding a print, the paw lies on the print and on the water. Every place of the paw as it is drawn there
      // answers as the paw, and neither as the print nor as the water.
      const at = HOLD_PAWS[index]
      let probed = 0
      for (let dx = -paw.rx; dx <= paw.rx; dx += 2) for (let dy = -paw.ry; dy <= paw.ry; dy += 2) {
        if ((dx / paw.rx) ** 2 + (dy / paw.ry) ** 2 > 1) continue
        expect(whatIsAt(at.x + dx, at.y + dy, holding), `${dx},${dy}`).toEqual(me)
        probed += 1
      }
      expect(probed).toBeGreaterThan(300)
      // Its target there is 48 px or more both ways, measured through its middle.
      for (let dy = -PAW_HIT.ry + 1; dy < PAW_HIT.ry; dy += 3) expect(whatIsAt(at.x, at.y + dy, holding), `${dy}`).toEqual(me)
      for (let dx = -PAW_HIT.rx + 1; dx < PAW_HIT.rx; dx += 3) expect(whatIsAt(at.x + dx, at.y, holding), `${dx}`).toEqual(me)
    })
    // Between the paws the print is still the print, its whole height, and 48 px or more across.
    const free = { from: HOLD_PAWS[0].x + PAW_HIT.rx, to: HOLD_PAWS[1].x - PAW_HIT.rx }
    expect((free.to - free.from) * scale).toBeGreaterThanOrEqual(48)
    for (let x = free.from; x <= free.to; x += 4) for (let y = HELD.y; y < HELD.y + HELD.h; y += 4) expect(whatIsAt(x, y, holding)).toEqual({ kind: 'held' })
    // Every place of the held print's box is the print or a paw, never the water behind it.
    for (let x = HELD.x; x < HELD.x + HELD.w; x += 5) for (let y = HELD.y; y < HELD.y + HELD.h; y += 5) expect(['held', 'cat']).toContain(whatIsAt(x, y, holding).kind)
    // The corner of paper is at least 100 stage units across, and the pots are not in the bottom strip.
    expect(PAPER.w).toBeGreaterThanOrEqual(100)
    expect(PAPER.y + PAPER.h).toBeLessThan(STAGE.height - 100)
    expect(PRINT.w).toBe(HELD.w)
  })

  it('touches the curled corner of paper only where it is drawn, tip included, and leaves the towel\'s hem to the towel', () => {
    const inShape = (lx: number, ly: number): boolean => {
      let inside = false
      for (let a = 0, b = PAPER_SHAPE.length - 1; a < PAPER_SHAPE.length; b = a++) {
        const p = PAPER_SHAPE[a], q = PAPER_SHAPE[b]
        if (p.y > ly !== q.y > ly && lx < ((q.x - p.x) * (ly - p.y)) / (q.y - p.y) + p.x) inside = !inside
      }
      return inside
    }
    const towel = CLOTHS[0], hem = lineY(towel.x) + towel.h
    const onTowel = (x: number, y: number): boolean => Math.abs(x - towel.x) <= towel.w / 2 && y <= hem
    for (const curl of [0, 1, 5, 9]) {
      // The corner as view.ts draws it: its cut shape, turned about the middle of the right edge of its box by
      // `PAPER_TURN` for each unit of curl, and lifted by the curl.
      const turn = PAPER_TURN * curl, pivot = { x: PAPER.x + PAPER.w, y: PAPER.y + PAPER.h / 2 }
      const place = (lx: number, ly: number): { x: number; y: number } => {
        const px = lx - PAPER.w, py = ly - PAPER.h / 2 - curl
        return { x: pivot.x + px * Math.cos(turn) - py * Math.sin(turn), y: pivot.y + px * Math.sin(turn) + py * Math.cos(turn) }
      }
      let tip = 0, bare1 = 0
      for (let lx = 0; lx < PAPER.w; lx += 2) for (let ly = -30; ly < PAPER.h; ly += 2) {
        const at = place(lx, ly), found = whatIsAt(at.x, at.y, { ...bare(900), curl }).kind
        if (at.x < PAPER.x || at.x >= PAPER.x + PAPER.w) continue
        if (inRect(at.x, at.y, PAPER)) expect(found, `${curl}: ${lx},${ly}`).toBe('paper')
        else if (at.y < PAPER.y) {
          // Above its box: the paper where its shape is drawn and the towel does not hang, and not the paper anywhere else.
          const drawn = inShape(lx, ly) && !onTowel(at.x, at.y)
          expect(found === 'paper', `${curl}: ${lx},${ly}`).toBe(drawn)
          if (drawn) tip += 1
          else bare1 += 1
        }
      }
      // Curled, its tip stands above the box it lies in, and is the paper there; flat, nothing of it does.
      if (curl === 9) expect(tip).toBeGreaterThan(150)
      if (curl === 0) expect(tip).toBe(0)
      expect(bare1).toBeGreaterThan(100)
      // The towel's hem is the towel's, however far the corner curls.
      for (let x = towel.x - towel.w / 2; x <= towel.x + towel.w / 2; x += 3) for (let y = hem - 20; y <= hem; y += 2) {
        expect(whatIsAt(x, y, { ...bare(900), curl }), `${curl}: towel ${x},${y}`).toEqual({ kind: 'cloth', cloth: 0 })
      }
    }
    // The corner of the old box that the cut shape does not fill is not the paper.
    expect(whatIsAt(PAPER.x + 100, PAPER.y - 6, { ...bare(900), curl: 9 }).kind).not.toBe('paper')
  })

  it.each(SURFACES)('puts nothing a child touches under the home control or in the grown-up corner at $width by $height', ({ width, height }) => {
    expect(CORNER).toBe(OVERLAY_CORNER)
    const by = fit(width, height)
    // Every place the bird can stand, with everything the game can set down laid out.
    const birds: number[] = []
    for (let x = SILL.from; x <= SILL.to; x += 6) birds.push(x)
    const clear = (px: number, py: number): void => {
      const at = toStage({ x: px, y: py }, by)
      for (const bird of birds) expect(whatIsAt(at.x, at.y, laden(bird)).kind, `${px},${py}`).toBe('room')
    }
    // The home control: 48 px round, 10 px from the top centre, with a finger's width round it.
    const reach = HOME.size / 2 + 12
    for (let dx = -reach; dx <= reach; dx += 6) for (let dy = -reach; dy <= reach; dy += 6) {
      if (Math.hypot(dx, dy) <= reach) clear(width / 2 + dx, HOME.top + HOME.size / 2 + dy)
    }
    for (let x = width - CORNER; x <= width; x += 6) for (let y = 0; y <= CORNER; y += 6) clear(x, y)
  })

  it.each(SURFACES)('shows the whole stage at $width by $height, so every thing on it can be reached', ({ width, height }) => {
    const by = fit(width, height)
    expect(by.x).toBeGreaterThanOrEqual(0)
    expect(by.y).toBeGreaterThanOrEqual(0)
    expect(by.x + STAGE.width * by.scale).toBeLessThanOrEqual(width + 1e-6)
    expect(by.y + STAGE.height * by.scale).toBeLessThanOrEqual(height + 1e-6)
  })
})
