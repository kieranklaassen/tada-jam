import { describe, expect, it } from 'vitest'
import { Bench } from './bench'
import { boardOf, GADGET_KINDS } from './board'
import { anchors, footOf, hasRoom, placePart, removeLead, trayPart, type Circuit } from './circuit'
import { LADDER } from './config'
import { asBuilt } from './gadgets'
import { layOut } from './jobs'
import { freshStall, type Stall } from './save'
import { firstDaySign } from './sign'
import { biteAt, looseEnd, matAt, boardBox, HELD, HELD_AT_WINDOW, HUNG, layOf, leadEnds, lidBox, looseBox, matCells, OLD_HAND_BOX, oddPlace, overlaps, OWNER, padAt, PRACTICE, PROBE_HOME, STAGE, taken, TEST_LAMP, TRAY, WAITING, type Box, type P } from './stage'
import { ODD_KINDS } from './circuit'

// Nothing passes through anything. A canvas game has no live scene for the
// audit to read, so the model is held to it here: the room every part takes,
// the places a loose part may lie, where every clip is, and where the fixed
// things of the stall stand. The play is seeded and reaches every state a
// finger can make: parts seated, turned, carried, laid loose, leads on pads,
// on parts and on each other, both boards on the mat.

const mid = (box: Box): P => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const footsClear = (circuit: Circuit) => {
  const feet = circuit.parts.map((part) => footOf(circuit, part))
  for (let a = 0; a < feet.length; a++) for (let b = a + 1; b < feet.length; b++) {
    const x = feet[a], y = feet[b]
    const apart = x.x >= y.x + y.w - 1e-9 || y.x >= x.x + x.w - 1e-9 || x.y >= y.y + y.h - 1e-9 || y.y >= x.y + x.h - 1e-9
    if (!apart) return `${circuit.parts[a].kind} across ${circuit.parts[a].a}-${circuit.parts[a].b} runs into ${circuit.parts[b].kind} across ${circuit.parts[b].a}-${circuit.parts[b].b}`
  }
  return null
}

describe('parts on a board', () => {
  it('every gadget as built, and the sign as it hangs, has room for each of its parts', () => {
    for (const kind of GADGET_KINDS) expect(footsClear(asBuilt(kind)), kind).toBeNull()
    expect(footsClear(firstDaySign())).toBeNull()
  })

  it('every job at every position arrives with no part in another\'s room', () => {
    for (const position of LADDER) for (let seed = 0; seed < 80; seed++) expect(footsClear(layOut(position, (seed * 2654435761) >>> 0).job.circuit), `${position} ${seed}`).toBeNull()
  })

  it('a part is not seated where its room would run into another\'s: two cells round one corner do not both go in', () => {
    const board = boardOf('lamp'), whole = asBuilt('lamp')
    // The pad at the far end of the top rail, the one before it along the rail, and the one below it down the rung.
    const corner = board.pads.findIndex((p) => p.x === 6 && p.y === 0), along = board.pads.findIndex((p) => p.x === 5 && p.y === 0), down = board.pads.findIndex((p) => p.x === 6 && p.y === 1)
    const first = placePart(whole, trayPart('cell', along, corner))
    expect(first.parts.length).toBe(whole.parts.length + 1)
    const second = trayPart('cell', corner, down)
    expect(hasRoom(first, second)).toBe(false)
    expect(placePart(first, second)).toBe(first)
    // With the first taken out again, there is room.
    expect(hasRoom(whole, second)).toBe(true)
    expect(placePart(whole, second).parts.length).toBe(whole.parts.length + 1)
  })

  it('stays inside its board: no part\'s room reaches past the green', () => {
    for (const kind of GADGET_KINDS) {
      const circuit = asBuilt(kind), board = boardOf(kind)
      for (const part of circuit.parts) {
        const foot = footOf(circuit, part)
        expect(foot.x).toBeGreaterThan(-0.55)
        expect(foot.y).toBeGreaterThan(-0.55)
        expect(foot.x + foot.w).toBeLessThan(board.cols - 1 + 0.55)
        expect(foot.y + foot.h).toBeLessThan(board.rows - 1 + 0.55)
      }
    }
  })
})

describe('the fixed things of the stall', () => {
  const gadget = asBuilt('robot'), sign = firstDaySign()
  const odds: Box = { x: oddPlace(ODD_KINDS[0]).x - 30, y: 740, w: oddPlace(ODD_KINDS[6]).x - oddPlace(ODD_KINDS[0]).x + 60, h: 78 }
  const lamp: Box = { x: PROBE_HOME[0].x - 26, y: PROBE_HOME[1].y - 26, w: PROBE_HOME[1].x - PROBE_HOME[0].x + 52, h: PROBE_HOME[0].y - PROBE_HOME[1].y + 52 }

  it('stand clear of each other, whichever board is on the mat', () => {
    for (const circuit of [gadget, sign]) {
      const boxes: [string, Box][] = [['board', boardBox(circuit)], ['tray', TRAY], ['odds', odds], ['test lamp', lamp], ['practice board', PRACTICE]]
      if (circuit.gadget !== 'sign') boxes.push(['lid', lidBox(circuit)])
      for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
        if (boxes[a][0] === 'board' && boxes[b][0] === 'lid') continue
        expect(overlaps(boxes[a][1], boxes[b][1]), `${boxes[a][0]} and ${boxes[b][0]} with the ${circuit.gadget} down`).toBe(false)
      }
      for (const [name, box] of boxes) {
        expect(box.y, name).toBeGreaterThanOrEqual(STAGE.counterBottom)
        expect(box.x, name).toBeGreaterThanOrEqual(0)
        expect(box.x + box.w, name).toBeLessThanOrEqual(STAGE.w)
        expect(box.y + box.h, name).toBeLessThanOrEqual(STAGE.h)
      }
      expect(TEST_LAMP.x).toBeGreaterThan(lamp.x)
    }
  })

  it('what is held over the counter is clear of what lies on the mat, and the two customers of each other', () => {
    expect(overlaps(OWNER, WAITING)).toBe(false)
    expect(overlaps(HELD, HELD_AT_WINDOW)).toBe(false)
    for (const circuit of [gadget, sign]) for (const held of [HELD, HELD_AT_WINDOW, HUNG]) {
      expect(overlaps(held, boardBox(circuit))).toBe(false)
      expect(overlaps(held, TRAY)).toBe(false)
    }
    // The grown-up's corner, top right, has nothing in it that answers a touch.
    const corner: Box = { x: STAGE.w - 72, y: 0, w: 72, h: 72 }
    for (const box of [OWNER, WAITING, HUNG, TRAY]) expect(overlaps(box, corner)).toBe(false)
  })

  it('every place a loose part may lie beside a board is bare mat, clear of that board and of everything else', () => {
    for (const circuit of [gadget, sign]) {
      const cells = matCells(circuit)
      expect(cells.length).toBeGreaterThanOrEqual(12)
      for (const cell of cells) {
        const box = looseBox(cell)
        const others = [...taken(circuit), boardBox(circuit), TRAY, odds, lamp, OLD_HAND_BOX, PRACTICE, ...(circuit.gadget === 'sign' ? [] : [lidBox(circuit)])]
        for (const other of others) expect(overlaps(box, other), `cell ${cell} beside the ${circuit.gadget}`).toBe(false)
        expect(box.y).toBeGreaterThan(STAGE.counterBottom)
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.w).toBeLessThanOrEqual(STAGE.w)
      }
      for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) expect(overlaps(looseBox(cells[a]), looseBox(cells[b]))).toBe(false)
    }
  })
})

describe('a seeded hour of play', () => {
  const stallWith = (circuit: Circuit): Stall => {
    const fresh = freshStall(null)
    return { ...fresh, job: { ...fresh.job, who: 'yak', circuit, open: false, missed: false, ticket: null } }
  }

  it('never leaves a part in another\'s room, two loose parts in one place, or a clip anywhere but on what it bites', { timeout: 30_000 }, () => {
    const bench = new Bench(stallWith(removeLead(asBuilt('car'), 0)))
    bench.press(mid(OWNER)); bench.lift(mid(OWNER), 'tap')
    let seed = 20261003
    const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647
    const somewhere = (): P => {
      const pick = random()
      const pads = boardOf(bench.live.gadget).pads.length
      if (pick < 0.35) return padAt(bench.live, Math.floor(random() * pads))
      if (pick < 0.55 && bench.live.parts.length > 0) return bench.midOf(Math.floor(random() * bench.live.parts.length))
      if (pick < 0.7) return { x: TRAY.x + random() * TRAY.w, y: TRAY.y + random() * TRAY.h }
      if (pick < 0.78) return oddPlace(ODD_KINDS[Math.floor(random() * ODD_KINDS.length)])
      if (pick < 0.8) return mid(HUNG)
      // A clip that lies loose, so that leads are also joined end to end; and an end of a loose part.
      const loose = bench.live.leads.findIndex((l) => l.b === null)
      if (pick < 0.88 && loose >= 0) return looseEnd(bench.live, loose)
      if (pick < 0.92 && bench.live.loose.length > 0) return biteAt(bench.live, { loose: 0, end: 0 })
      return { x: 30 + random() * 1100, y: 190 + random() * 610 }
    }
    let states = { loose: 0, joined: 0, onParts: 0, sign: 0, carried: 0, laid: 0 }
    for (let i = 0; i < 2500; i++) {
      bench.press(somewhere())
      const to = somewhere()
      bench.move(to)
      if (bench.hand?.holds === 'part') states.carried++
      bench.lift(to, random() < 0.25 ? 'tap' : 'end')
      for (let f = 0; f < 3; f++) bench.step(1 / 60)
      for (const circuit of [bench.stall.job.circuit, bench.stall.sign]) {
        expect(footsClear(circuit), `step ${i}`).toBeNull()
        expect(new Set(circuit.loose.map((l) => l.at)).size, `step ${i}`).toBe(circuit.loose.length)
        for (const loose of circuit.loose) expect(matCells(circuit), `step ${i}`).toContain(loose.at)
        circuit.leads.forEach((lead, n) => {
          // Each clip is exactly on what it bites; a join is two clips in one place.
          const [a, b] = leadEnds(circuit, n)
          if (lead.a !== null) expect(a, `step ${i}`).toEqual(biteAt(circuit, lead.a))
          else expect(a, `step ${i}`).toEqual(matAt(lead.at!))
          // A lead has a place of its own exactly when no pad and no part holds it.
          expect(lead.at !== undefined, `step ${i}`).toBe(!anchors(lead.a) && !anchors(lead.b))
          if (lead.b !== null) expect(b, `step ${i}`).toEqual(biteAt(circuit, lead.b))
          for (const p of [a, b]) { expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true); expect(p.y).toBeGreaterThan(STAGE.counterBottom) }
        })
      }
      const c = bench.live
      if (c.loose.length > 0) states.loose++
      if (c.leads.some((l) => l.b !== null && typeof l.b === 'object' && 'lead' in l.b)) states.joined++
      if (c.leads.some((l) => [l.a, l.b].some((x) => x !== null && typeof x === 'object' && 'loose' in x))) states.onParts++
      if (c.gadget === 'sign') states.sign++
      if (c.leads.some((l) => l.a === null)) states.laid++
      expect(layOf(c).u).toBeGreaterThan(0)
    }
    // The play reached every kind of state it is meant to hold.
    for (const [name, seen] of Object.entries(states)) expect(seen, name).toBeGreaterThan(0)
  })
})
