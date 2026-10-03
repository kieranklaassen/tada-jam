import { beforeAll, describe, expect, it } from 'vitest'
import { PICTURED_R, layOut } from './card'
import { LADDER } from './config'
import { CHARACTERS, CUSTOMERS } from './customers'
import { IdleLadder } from './guidance'
import { Kitchen } from './kitchen'
import type { Kind } from './kinds'
import { BOARD, CARD, COUNTER_Y, CUSTOMER, DOOR, DOOR_SIZE, OVEN, OVEN_WAY, PIECE_R, PIZZA, SERVE, STAGE_H, STAGE_W, TUB, tubPlace } from './layout'
import { useCanvases } from './marker'
import { CORNER } from './overlay'
import { Recording, recordingCanvases } from './recording'
import { freshSave } from './save'
import { doorSpot } from './staging'
import { APART, REACH } from './table'
import { KitchenView, type Show } from './view'

// Nothing passes through anything. A canvas game has no scene for the jam's
// intersection audit to read, so its own tests do that job: the real model is
// played at 60 fps with seeded input, through every state a child can reach,
// and every frame is measured for what a child would see cross. The real
// view draws each frame into a recording context, so the pieces are checked
// where they are drawn and not only where the model says they are.
//
// Allowed contacts, each with its reason and its cap:
// - A piece in the hand or in the air is over whatever it passes: it is being
//   carried or thrown. It never comes to rest on another piece.
// - The pizza at the counter lies on the counter's edge and under the
//   customer's hands and tongue: it has been served there.
// - The pizza on its way into the oven's mouth and out of it is in front of
//   the oven's wall while it slides: about half a second each way. Capped at
//   1.5 s for a bake and a pizza handed back together (1.25 s measured).
// - A customer walking from the door passes in front of the other one who
//   waits there. Capped at 1.4 s a stepping up.

const W = 1180, H = 820
let surface: Recording
let view: KitchenView

beforeAll(() => {
  useCanvases(recordingCanvases().make)
  surface = new Recording(W, H)
  view = new KitchenView({ getContext: () => surface } as unknown as HTMLCanvasElement)
  view.resize(W, H, 1)
})

type Found = { pieceOnPiece: number; pieceOffPizza: number; drawnAstray: number; pizzaOnTub: number; pizzaOnCard: number; pizzaInWallFrames: number; worstPieceGap: number; frames: number }

function measure(kitchen: Kitchen, found: Found): Show {
  const show = kitchen.show(new IdleLadder(0).update(0))
  found.frames += 1
  const pieces = show.table.pieces
  for (let a = 0; a < pieces.length; a++) {
    if (Math.hypot(pieces[a].x, pieces[a].y) > REACH + 1e-6) found.pieceOffPizza += 1
    for (let b = a + 1; b < pieces.length; b++) {
      const gap = Math.hypot(pieces[a].x - pieces[b].x, pieces[a].y - pieces[b].y)
      found.worstPieceGap = Math.min(found.worstPieceGap, gap)
      if (gap < APART - 1e-6) found.pieceOnPiece += 1
    }
  }
  if (!show.pizza.hidden) {
    const r = PIZZA.r * show.pizza.size
    show.table.tubs.forEach((_, i) => {
      const tub = tubPlace(i, show.table.tubs.length)
      // The bowl is a wide, shallow shape: its sprite reaches TUB.r to each side and to the top of the heap.
      if (Math.hypot(show.pizza.x - tub.x, show.pizza.y - tub.y) < r + TUB.r) found.pizzaOnTub += 1
    })
    if (overCard(show.pizza.x, show.pizza.y, r)) found.pizzaOnCard += 1
    if (show.pizza.x + r > OVEN.x - OVEN.w / 2 && Math.abs(show.pizza.y - OVEN.y) < OVEN.h / 2 + r) found.pizzaInWallFrames += 1
  }
  // The pieces are drawn where the model has them: on the pizza as it is drawn, wherever it has been slid.
  surface.reset()
  view.draw(show)
  if (!show.pizza.hidden && show.pizza.puffed === 0) {
    // A piece's stamp is small: the pizza's own, which is as wide as the pizza, is not taken for one.
    const stamped = surface.stamps.filter((s) => s.w < PIECE_R * 4)
    for (const piece of pieces) {
      const x = show.pizza.x + piece.x * PIZZA.r * show.pizza.size, y = show.pizza.y + piece.y * PIZZA.r * show.pizza.size
      if (!stamped.some((s) => Math.hypot(s.x - x, s.y - y) < 6)) found.drawnAstray += 1
    }
  }
  return show
}

/** Whether a disc touches the card: its nearest point of the card is inside the disc. */
function overCard(x: number, y: number, r: number): boolean {
  const nx = Math.max(CARD.x, Math.min(CARD.x + CARD.w, x)), ny = Math.max(CARD.y, Math.min(CARD.y + CARD.h, y))
  return Math.hypot(x - nx, y - ny) < r
}

const fresh = (): Found => ({ pieceOnPiece: 0, pieceOffPizza: 0, drawnAstray: 0, pizzaOnTub: 0, pizzaOnCard: 0, pizzaInWallFrames: 0, worstPieceGap: Infinity, frames: 0 })

function watch(kitchen: Kitchen, seconds: number, found: Found): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    kitchen.step(1 / 60)
    measure(kitchen, found)
  }
}

const tubOf = (kitchen: Kitchen, kind: Kind) => {
  const tubs = kitchen.toSave().tubs
  return tubPlace(tubs.indexOf(kind), tubs.length)
}

function slide(kitchen: Kitchen, dx: number, dy: number, found: Found): void {
  kitchen.press(PIZZA.x, PIZZA.y + PIZZA.r * 0.95)
  // The finger travels there in steps, as a finger does.
  for (let i = 1; i <= 8; i++) {
    kitchen.dragMove(PIZZA.x + (dx * i) / 8, PIZZA.y + PIZZA.r * 0.95 + (dy * i) / 8)
    kitchen.step(1 / 60)
    measure(kitchen, found)
  }
  kitchen.dragEnd()
}

describe('where things stand', () => {
  it('keeps every tub clear of the board, the card, the oven and the other tubs, and out of the bottom strip', () => {
    for (let count = 1; count <= 4; count++) {
      const tubs = Array.from({ length: count }, (_, i) => tubPlace(i, count))
      for (let a = 0; a < count; a++) {
        const t = tubs[a]
        expect(Math.hypot(t.x - BOARD.x, t.y - BOARD.y), `tub ${a} of ${count} and the board`).toBeGreaterThanOrEqual(BOARD.r + TUB.r)
        // The heap of pieces stands half a tub above the rim.
        expect(t.y - TUB.r, `tub ${a} of ${count} and the doorway`).toBeGreaterThanOrEqual(DOOR.y + DOOR.h)
        expect(t.y - TUB.r).toBeGreaterThan(COUNTER_Y + 30)
        expect(t.x + TUB.r).toBeLessThan(OVEN.x - OVEN.w / 2)
        expect(t.x - TUB.r).toBeGreaterThanOrEqual(0)
        expect(t.y + TUB.r * 0.9, `tub ${a} of ${count} and the bottom strip`).toBeLessThanOrEqual(STAGE_H - 60)
        for (let b = a + 1; b < count; b++) expect(Math.hypot(t.x - tubs[b].x, t.y - tubs[b].y)).toBeGreaterThanOrEqual(TUB.r * 2 + 20)
      }
    }
  })

  it('keeps the board clear of the oven, and a pizza slid by hand clear of the oven, the tubs, the card and the door', () => {
    expect(BOARD.x + BOARD.r).toBeLessThan(OVEN.x - OVEN.w / 2)
    // As far as a hand can slide it towards the oven, and up to the customer.
    expect(OVEN_WAY.x + PIZZA.r).toBeLessThanOrEqual(OVEN.x - OVEN.w / 2)
    for (const at of [OVEN_WAY, SERVE, { x: OVEN_WAY.x, y: SERVE.y }]) {
      expect(overCard(at.x, at.y, PIZZA.r)).toBe(false)
      // The doorway is past the pizza's edge at the height where the two would meet.
      const reach = Math.sqrt(Math.max(0, PIZZA.r ** 2 - Math.max(0, at.y - (DOOR.y + DOOR.h)) ** 2))
      expect(at.x - reach).toBeGreaterThan(DOOR.x + DOOR.w / 2)
      for (let count = 1; count <= 4; count++) for (let i = 0; i < count; i++) expect(Math.hypot(at.x - tubPlace(i, count).x, at.y - tubPlace(i, count).y)).toBeGreaterThanOrEqual(PIZZA.r + TUB.r)
    }
  })

  it('keeps the widest customers clear of the card, of the door, and of each other at the door', () => {
    const widest = Math.max(...CUSTOMERS.map((who) => CHARACTERS[who].halfWidth))
    expect(CUSTOMER.x + widest).toBeLessThan(CARD.x)
    expect(CUSTOMER.x - widest).toBeGreaterThan(DOOR.x + DOOR.w / 2)
    // The card stands over the oven and clear of it.
    expect(CARD.y + CARD.h).toBeLessThan(OVEN.y - OVEN.h * 0.7)
    const small = doorSpot('small'), big = doorSpot('big')
    for (const a of CUSTOMERS) for (const b of CUSTOMERS) if (a !== b) expect((CHARACTERS[a].halfWidth + CHARACTERS[b].halfWidth) * DOOR_SIZE, `${a} beside ${b}`).toBeLessThanOrEqual(big.x - small.x)
    // Both stand inside the doorway, and the doorway is clear of the corner the grown-up overlay listens in.
    for (const who of CUSTOMERS) {
      expect(small.x - CHARACTERS[who].halfWidth * DOOR_SIZE).toBeGreaterThanOrEqual(DOOR.x - DOOR.w / 2)
      expect(big.x + CHARACTERS[who].halfWidth * DOOR_SIZE).toBeLessThanOrEqual(DOOR.x + DOOR.w / 2)
    }
    // The card answers a touch, so it stays out of the corner the grown-up overlay listens in.
    expect(CARD.x + CARD.w < STAGE_W - CORNER || CARD.y > CORNER).toBe(true)
  })

  it('draws the pictures on the card clear of each other and of its border, for every order of every place', () => {
    for (const id of LADDER) {
      for (let seed = 1; seed <= 12; seed++) {
        const kitchen = new Kitchen({ ...freshSave(null), position: id, shown: ['tap-a-tub', 'to-the-oven'] }, seed)
        const order = kitchen.toSave().order!
        const drawn = layOut(order.wanted, order.picture, order.seed)
        for (let a = 0; a < drawn.length; a++) {
          expect(drawn[a].x - PICTURED_R).toBeGreaterThanOrEqual(8)
          expect(drawn[a].x + PICTURED_R).toBeLessThanOrEqual(CARD.w - 8)
          expect(drawn[a].y - PICTURED_R).toBeGreaterThanOrEqual(8)
          expect(drawn[a].y + PICTURED_R).toBeLessThanOrEqual(CARD.h - 8)
          for (let b = a + 1; b < drawn.length; b++) expect(Math.hypot(drawn[a].x - drawn[b].x, drawn[a].y - drawn[b].y)).toBeGreaterThanOrEqual(PICTURED_R * 2)
        }
      }
    }
  })
})

describe('what moves', () => {
  it('lays no piece on another and draws every piece where it lies, through a whole cycle with too many, too few and a right pizza', { timeout: 30_000 }, () => {
    for (const [place, seed] of [[LADDER[0], 1], [LADDER[3], 2], [LADDER[6], 3], [LADDER[7], 4]] as const) {
      const found = fresh()
      const kitchen = new Kitchen({ ...freshSave(null), position: place, shown: ['tap-a-tub', 'to-the-oven'] }, seed)
      const order = kitchen.toSave().order!
      const tap = (kind: Kind, times: number) => {
        for (let i = 0; i < times; i++) {
          const at = tubOf(kitchen, kind)
          kitchen.press(at.x, at.y)
          kitchen.tap()
          watch(kitchen, 0.25, found)
        }
      }
      // Too many of the first kind, by two; too few of the last, by one.
      order.wanted.forEach((want, i) => tap(want.kind, want.count + (i === 0 ? 2 : 0) - (i === order.wanted.length - 1 && want.count > 1 ? 1 : 0)))
      watch(kitchen, 0.6, found)
      slide(kitchen, 0, -60, found)
      // Raw: the short tasting.
      watch(kitchen, 4.6, found)
      slide(kitchen, 100, 0, found)
      watch(kitchen, 3.2, found)
      slide(kitchen, 100, 0, found)
      watch(kitchen, 1.2, found)
      slide(kitchen, 0, -60, found)
      expect(kitchen.busy).toBe(true)
      watch(kitchen, 8.6, found)
      expect(kitchen.busy).toBe(false)
      // Put it right: take off what is over, add what is missing.
      while (true) {
        const pieces = kitchen.table.pieces
        const over = order.wanted.map((want) => pieces.filter((p) => p.kind === want.kind).length - want.count)
        const kindOver = order.wanted.findIndex((_, i) => over[i] > 0), kindUnder = order.wanted.findIndex((_, i) => over[i] < 0)
        if (kindOver >= 0) {
          const piece = pieces.find((p) => p.kind === order.wanted[kindOver].kind)!
          kitchen.press(PIZZA.x + piece.x * PIZZA.r, PIZZA.y + piece.y * PIZZA.r)
          kitchen.tap()
          watch(kitchen, 0.5, found)
        } else if (kindUnder >= 0) {
          tap(order.wanted[kindUnder].kind, 1)
          // Until it has landed, so that it is counted before the next look.
          watch(kitchen, 0.4, found)
        } else break
      }
      watch(kitchen, 0.6, found)
      slide(kitchen, 0, -60, found)
      watch(kitchen, 7.4, found)
      expect(kitchen.toSave().finished, `${place}: eaten, with ${JSON.stringify(kitchen.toSave().order)} and ${kitchen.table.pieces.map((p) => p.kind).join(' ')}; pushed back ${kitchen.toSave().pushedBack}`).toBe(true)
      // The next customer, by each roll in turn, and a piece fed by hand on the way.
      const spot = doorSpot(seed % 2 === 0 ? 'big' : 'small')
      kitchen.press(spot.x, spot.y - 50)
      kitchen.tap()
      watch(kitchen, 5, found)
      const kind = kitchen.toSave().tubs[0], from = tubOf(kitchen, kind)
      kitchen.press(from.x, from.y)
      kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
      kitchen.dragEnd()
      watch(kitchen, 3.5, found)

      expect(found.pieceOnPiece, `${place}: pieces on each other`).toBe(0)
      expect(found.pieceOffPizza, `${place}: pieces off the pizza`).toBe(0)
      expect(found.drawnAstray, `${place}: pieces drawn away from where they lie`).toBe(0)
      expect(found.pizzaOnTub, `${place}: the pizza over a tub`).toBe(0)
      expect(found.pizzaOnCard, `${place}: the pizza over the card`).toBe(0)
      // Allowed: the slides into the oven's mouth and out of it, for one bake and one pizza handed back.
      expect(found.pizzaInWallFrames, `${place}: the pizza in front of the oven`).toBeLessThanOrEqual(1.5 * 60)
      expect(found.frames).toBeGreaterThan(60 * 30)
    }
  })

  it('keeps a pizza legal under a storm of taps, carries and slides', { timeout: 30_000 }, () => {
    for (const seed of [11, 12, 13, 14]) {
      const found = fresh()
      const kitchen = new Kitchen({ ...freshSave(null), position: LADDER[5 + (seed % 3)], shown: ['tap-a-tub', 'to-the-oven'] }, seed)
      let s = seed * 104729
      const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296)
      for (let i = 0; i < 260; i++) {
        const tubs = kitchen.toSave().tubs
        const how = rnd()
        if (how < 0.5) {
          const at = tubPlace(Math.floor(rnd() * tubs.length), tubs.length)
          kitchen.press(at.x, at.y)
          kitchen.tap()
        } else if (how < 0.8) {
          // Carry a piece from a tub, or from the pizza, to somewhere on or near the pizza.
          const from = rnd() < 0.5 ? tubPlace(Math.floor(rnd() * tubs.length), tubs.length) : { x: PIZZA.x + (rnd() - 0.5) * 200, y: PIZZA.y + (rnd() - 0.5) * 200 }
          kitchen.press(from.x, from.y)
          kitchen.dragMove(PIZZA.x + (rnd() - 0.5) * 380, PIZZA.y + (rnd() - 0.5) * 380)
          if (rnd() < 0.3) kitchen.dragLift()
          kitchen.dragEnd()
        } else if (how < 0.9) {
          kitchen.press(PIZZA.x + (rnd() - 0.5) * 240, PIZZA.y + (rnd() - 0.5) * 240)
          kitchen.tap()
        } else slide(kitchen, rnd() * 60, -rnd() * 30, found)
        watch(kitchen, 0.05 + rnd() * 0.3, found)
      }
      watch(kitchen, 9, found)
      expect(found.pieceOnPiece, `seed ${seed}: pieces on each other`).toBe(0)
      expect(found.pieceOffPizza, `seed ${seed}: pieces off the pizza`).toBe(0)
      expect(found.drawnAstray, `seed ${seed}: pieces drawn away from where they lie`).toBe(0)
      expect(found.pizzaOnTub, `seed ${seed}: the pizza over a tub`).toBe(0)
      expect(found.pizzaOnCard).toBe(0)
      expect(found.worstPieceGap).toBeGreaterThanOrEqual(APART - 1e-6)
    }
  })

  it('lands a piece exactly on the spot its flight was promised, and lands two quick taps on two spots', () => {
    const kitchen = new Kitchen({ ...freshSave(null), position: LADDER[1], shown: ['tap-a-tub', 'to-the-oven'] }, 21)
    const at = tubOf(kitchen, kitchen.toSave().tubs[0])
    kitchen.press(at.x, at.y)
    kitchen.tap()
    kitchen.press(at.x, at.y)
    kitchen.tap()
    const promised = kitchen.table.flights.map((f) => (f.end.on === 'pizza' ? { x: f.end.x, y: f.end.y } : null))
    expect(promised.length).toBe(2)
    expect(Math.hypot(promised[0]!.x - promised[1]!.x, promised[0]!.y - promised[1]!.y)).toBeGreaterThanOrEqual(APART)
    for (let i = 0; i < 60; i++) kitchen.step(1 / 60)
    expect(kitchen.table.pieces.map((p) => ({ x: p.x, y: p.y }))).toEqual(expect.arrayContaining(promised))
  })

  it('walks a called customer past the other at the door for a short moment only, and never seats two in one place', () => {
    for (const which of ['small', 'big'] as const) {
      const kitchen = new Kitchen({ ...freshSave(null), shown: ['tap-a-tub', 'to-the-oven'] }, 31)
      for (const want of kitchen.toSave().order!.wanted) {
        for (let i = 0; i < want.count; i++) {
          const at = tubOf(kitchen, want.kind)
          kitchen.press(at.x, at.y)
          kitchen.tap()
          for (let f = 0; f < 30; f++) kitchen.step(1 / 60)
        }
      }
      const found = fresh()
      slide(kitchen, 100, 0, found)
      watch(kitchen, 3.2, found)
      slide(kitchen, 0, -60, found)
      watch(kitchen, 7.4, found)
      const spot = doorSpot(which)
      kitchen.press(spot.x, spot.y - 50)
      kitchen.tap()
      let passing = 0
      for (let i = 0; i < 60 * 5; i++) {
        kitchen.step(1 / 60)
        const show = measure(kitchen, found)
        const walker = show.customer
        if (!walker) continue
        for (const waiting of show.waiting) {
          // A newcomer who has not come up yet is not there to be passed.
          if (waiting.up < 0.05) continue
          const there = doorSpot(waiting.big ? 'big' : 'small')
          const reach = CHARACTERS[walker.who].halfWidth * walker.size + CHARACTERS[waiting.who].halfWidth * DOOR_SIZE
          if (walker.size < 1 && Math.abs(walker.x - there.x) < reach) passing += 1
        }
        // Whoever stands at the counter is not also standing at the door.
        expect(show.waiting.map((w) => w.who)).not.toContain(walker.who)
        if (show.leaving) expect(show.leaving.who).not.toBe(walker.who)
      }
      expect(passing, `called with the ${which} roll`).toBeLessThanOrEqual(1.4 * 60)
    }
  })
})
