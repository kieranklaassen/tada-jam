import { describe, expect, it } from 'vitest'
import { FLIGHT_SECONDS } from './carry'
import { freshGame, type Game } from './cycle'
import { LADDER } from './config'
import { GameRun } from './gameRun'
import { RAIL, WHOLE } from './measure'
import { tinAt, type GameEvent } from './moves'
import { inRange, tinParts } from './orders'
import { MOST_PIECES, deserialize, serialize } from './save'
import { served } from './serve'
import { BOARD, COUNTER, CRATE, DOG, PAGE, PX, QUEUE, RAIL_BOX, ROLLER, SHELF_BOX, WINDOW, shown, type Box, type Point } from './stage'
import { draw } from './stream'
import { LANES, SHELF, eaten, inTin, onLane, onShelf } from './world'

// Nothing passes through anything. A canvas game has no audit to read its scene, so this plays the real game
// with seeded touches, thousands of them, on every thing it holds, and after every one measures what a child
// would see cross: every pair of pieces as they are drawn, each piece against the slab it lies on, and the
// model against itself. It also holds that the game can be put away after any touch and found as it was left.

const overlap = (a: Box, b: Box): number => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
const mid = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })

/** Everything a state has to hold, whatever touches led to it. */
function expectSound(game: Game, where: string): void {
  const tin = tinAt(game)
  // The model: no two pieces of a lane overlap, the shelf's rows are whole and in order, the tin's pieces are in turn.
  for (let lane = 0; lane < LANES; lane++) {
    let end = 0
    for (const piece of onLane(game.world, lane)) {
      const x = piece.place.on === 'board' ? piece.place.x : -1
      expect(x, `${where}: a piece of lane ${lane} lies over the one before`).toBeGreaterThanOrEqual(end)
      end = x + piece.length
    }
    expect(end, `${where}: lane ${lane} runs off the board`).toBeLessThanOrEqual(RAIL)
  }
  expect(onShelf(game.world).length, where).toBeLessThanOrEqual(SHELF)
  expect(onShelf(game.world).map((piece) => (piece.place.on === 'shelf' ? piece.place.slot : -1)), where).toEqual(onShelf(game.world).map((_, slot) => slot))
  for (const part of [0, 1]) expect(inTin(game.world, part).map((piece) => (piece.place.on === 'tin' ? piece.place.turn : -1)), where).toEqual(inTin(game.world, part).map((_, turn) => turn))
  if (!game.window || game.finished) expect(game.world.pieces.some((piece) => piece.place.on === 'tin' && !game.window), where).toBe(false)
  // What is drawn: no two pieces cross, and each lies on its slab.
  const boxes = shown(game.world, tin)
  for (let a = 0; a < boxes.length; a++) {
    const one = boxes[a]
    const slab = one.piece.place.on === 'board' ? BOARD : one.piece.place.on === 'shelf' ? SHELF_BOX : RAIL_BOX
    expect(one.box.x, `${where}: piece ${one.piece.id} starts off its slab`).toBeGreaterThanOrEqual(slab.x)
    expect(one.box.x + one.box.w, `${where}: piece ${one.piece.id} runs off its slab`).toBeLessThanOrEqual(slab.x + slab.w + 0.01)
    expect(one.box.y, where).toBeGreaterThanOrEqual(slab.y)
    expect(one.box.y + one.box.h, where).toBeLessThanOrEqual(slab.y + slab.h)
    for (let b = a + 1; b < boxes.length; b++) expect(overlap(one.box, boxes[b].box), `${where}: pieces ${one.piece.id} (${JSON.stringify(one.piece.place)}) and ${boxes[b].piece.id} (${JSON.stringify(boxes[b].piece.place)}) cross, for ${game.window?.who}`).toBeLessThan(0.01)
  }
  // A tin whose contents fit has shut: no customer waits on with a fit lying in its open tin.
  if (game.window && !game.finished) expect(served(game.world, game.window).kind, `${where}: a fit lies in the tin and the lid has not shut`).not.toBe('fit')
  // Every piece is one piece: no id twice, and what a customer ate is in turn, with nothing missing from the count.
  expect(new Set(game.world.pieces.map((piece) => piece.id)).size, where).toBe(game.world.pieces.length)
  expect(eaten(game.world).map((piece) => (piece.place.on === 'eaten' ? piece.place.turn : -1)), where).toEqual(eaten(game.world).map((_, turn) => turn))
  // An idea is marked as shown once, and the state never outgrows what a save may hold.
  expect(new Set(game.shown).size, where).toBe(game.shown.length)
  expect(game.world.pieces.length, where).toBeLessThanOrEqual(MOST_PIECES)
  // The customers are always ones the rules could have laid out, and nothing is finished with nobody there.
  for (const customer of [game.window, ...game.queue]) if (customer) expect(inRange(customer), where).toEqual([])
  if (!game.window) expect(game.finished, where).toBe(false)
  // Found as left: what is saved now opens as exactly this.
  const saved = JSON.parse(JSON.stringify(serialize(game)))
  expect(serialize(deserialize(saved)), `${where}: does not open as it was put away`).toEqual(saved)
}

/** Plays `touches` seeded touches on everything the game holds. Returns the kinds of thing that happened. */
function monkey(seed: number, touches: number, start: Game = freshGame(null, seed)): Set<string> {
  const run = new GameRun(start, seed)
  // Nothing leaves the world unseen: every piece that goes is in an event that shows it going (to the dog, into a mouth, onto a face),
  // or was inside a customer who has now left, or is the whole fruit a pelican glides off with.
  const watched = run as unknown as { take: (game: Game, events: readonly GameEvent[]) => void }
  const take = watched.take.bind(run)
  watched.take = (game, events) => {
    const before = run.game
    const shown = new Set(events.flatMap((event) => (event.kind === 'fell' || event.kind === 'ate' || event.kind === 'splat' || event.kind === 'burp' ? [event.piece.id] : [])))
    const glider = events.some((event) => event.kind === 'gliderAway' || (event.kind === 'ending' && event.ending.glider))
    const left = before.world.pieces.filter((piece) => !game.world.pieces.some((other) => other.id === piece.id))
    // The place in the designed order moves one step at a time, or not at all.
    expect(Math.abs(LADDER.indexOf(game.position) - LADDER.indexOf(before.position)), `seed ${seed}: the position jumped`).toBeLessThanOrEqual(1)
    for (const piece of left) expect(shown.has(piece.id) || piece.place.on === 'eaten' || glider, `seed ${seed}: piece ${piece.id} (${JSON.stringify(piece.place)}) left the world unseen, in ${events.map((event) => event.kind).join(',')}`).toBe(true)
    take(game, events)
  }
  let state = seed
  const random = (): number => {
    const drawn = draw(state)
    state = drawn.state
    return drawn.value
  }
  const anywhere = (): Point => ({ x: random() * PAGE.w, y: random() * PAGE.h })
  const somePiece = (): Point | null => {
    const boxes = shown(run.game.world, tinAt(run.game))
    if (boxes.length === 0) return null
    const box = boxes[Math.floor(random() * boxes.length)].box
    return { x: box.x + box.w * (0.1 + 0.8 * random()), y: box.y + box.h / 2 }
  }
  const target = (): Point => {
    const things: Point[] = [mid(WINDOW), mid(QUEUE[0]), mid(QUEUE[1]), mid(CRATE), mid(DOG), mid(ROLLER), { x: RAIL_BOX.x + 40 + random() * 300, y: RAIL_BOX.y + 60 }, { x: BOARD.x + random() * BOARD.w, y: BOARD.y + random() * BOARD.h }, mid(SHELF_BOX), anywhere()]
    // A whole fruit on the board, and the tin, are things too: a flung piece has to find them.
    const whole = shown(run.game.world, tinAt(run.game)).find(({ piece }) => piece.place.on === 'board' && piece.length === WHOLE[piece.fruit])
    if (whole) things.push(mid(whole.box))
    things.push({ x: RAIL_BOX.x + 30, y: RAIL_BOX.y + 60 })
    return somePiece() && random() < 0.3 ? somePiece()! : things[Math.floor(random() * things.length)]
  }
  /** Lets a piece go at speed so that it comes down on `to`. */
  const throwAt = (from: Point, to: Point, t: number): void => {
    run.press(from, t)
    // It is carried back along the line from the target through where it lay, far enough off for the throw to be a throw, and let go there.
    const d = Math.hypot(to.x - from.x, to.y - from.y) || 1, back = Math.max(400, 0.8 * d)
    const letGo = { x: Math.max(COUNTER.x + 12, Math.min(COUNTER.x + COUNTER.w - 12, to.x - ((to.x - from.x) / d) * back)), y: Math.max(COUNTER.y + 12, Math.min(COUNTER.y + COUNTER.h - 12, to.y - ((to.y - from.y) / d) * back)) }
    const v = { x: (to.x - letGo.x) / FLIGHT_SECONDS, y: (to.y - letGo.y) / FLIGHT_SECONDS }
    run.move({ x: letGo.x - v.x * 0.03, y: letGo.y - v.y * 0.03 }, t + 0.4)
    run.move(letGo, t + 0.43)
    run.lift()
  }
  const seen = new Set<string>()
  const note = () => {
    for (const event of run.happened) seen.add(event.kind === 'setDown' ? `setDown:${event.how}` : event.kind === 'called' ? `called:${event.did}` : event.kind === 'ending' ? `ending:${event.how}${event.ending.glider ? ':glider' : ''}` : event.kind === 'rolled' ? `rolled:${event.on}` : event.kind === 'bounce' ? `bounce:${event.off}` : event.kind)
    run.happened = []
  }
  // First a short tour of the cells that chance finds least: a piece flung at a whole fruit and at the tin, and the roller over the crate.
  {
    const first = shown(run.game.world, tinAt(run.game)).find(({ piece }) => piece.place.on === 'board')
    if (first) {
      const x = first.box.x + first.box.w * 0.3
      run.press({ x, y: first.box.y - 40 }, 0)
      run.move({ x, y: first.box.y + first.box.h + 30 }, 0.1)
      run.lift()
      run.tap(mid(CRATE))
      const boxes = shown(run.game.world, tinAt(run.game))
      const whole = boxes.find(({ piece }) => piece.place.on === 'board' && piece.length === WHOLE[piece.fruit])
      const part = boxes.find(({ piece }) => piece.place.on === 'board' && piece.length < WHOLE[piece.fruit])
      if (whole && part) throwAt(mid(part.box), mid(whole.box), 1)
      note()
    }
    run.press(mid(ROLLER), 2)
    run.move(mid(CRATE), 2.5)
    run.lift()
    note()
    // And a piece thrown at the tin of a customer who has just stepped up.
    run.tap(mid(QUEUE[0]))
    note()
    const loose = shown(run.game.world, tinAt(run.game)).find(({ piece }) => piece.place.on === 'board')
    if (loose) {
      // Carried to the bare strip between the rail and the board, well along it, and thrown from there at the tin's end: a place that is always bare.
      const to = { x: RAIL_BOX.x + 30, y: RAIL_BOX.y + 60 }, letGo = { x: RAIL_BOX.x + 520, y: (RAIL_BOX.y + RAIL_BOX.h + BOARD.y) / 2 }
      const v = { x: (to.x - letGo.x) / FLIGHT_SECONDS, y: (to.y - letGo.y) / FLIGHT_SECONDS }
      run.press(mid(loose.box), 3)
      run.move({ x: letGo.x - v.x * 0.03, y: letGo.y - v.y * 0.03 }, 3.4)
      run.move(letGo, 3.43)
      run.lift()
    }
    note()
    expectSound(run.game, `seed ${seed}, the tour`)
  }
  for (let i = 0; i < touches; i++) {
    const kind = random()
    let t = i
    const waiting = run.game.window && !run.game.finished ? run.game.window : null
    if (kind < 0.07 && waiting) {
      // Now and then a careful child: a fresh fruit, one cut exactly at the order, and the piece carried to the tin.
      run.tap(mid(CRATE))
      note()
      const fruit = shown(run.game.world, tinAt(run.game)).find(({ piece }) => piece.place.on === 'board' && piece.fruit === waiting.fruit && piece.length === WHOLE[piece.fruit])
      if (fruit) {
        const x = fruit.box.x + tinParts(waiting)[0] * PX
        run.press({ x, y: fruit.box.y - 40 }, t)
        run.move({ x, y: fruit.box.y + fruit.box.h + 30 }, t + 0.1)
        note()
        run.lift()
        const from = { x: fruit.box.x + 12, y: fruit.box.y + fruit.box.h / 2 }
        run.press(from, t + 1)
        run.move({ x: from.x + 20, y: (from.y + RAIL_BOX.y) / 2 }, t + 1.5)
        run.move({ x: RAIL_BOX.x + 40, y: RAIL_BOX.y + 60 }, t + 2)
        run.lift()
      }
    } else if (kind < 0.16) {
      run.tap(target())
    } else if (kind < 0.46) {
      // A stroke: across a piece, or anywhere.
      const at = random() < 0.35 ? target() : somePiece() ?? anywhere()
      const from = { x: at.x + (random() - 0.5) * 60, y: at.y - 70 - random() * 80 }
      run.press(from, t)
      for (let k = 1; k <= 4; k++) {
        run.move({ x: from.x + ((at.x - from.x) * k) / 2, y: from.y + ((at.y - from.y) * k) / 2 }, (t += 0.05))
        note()
      }
      run.lift()
    } else if (kind < 0.86) {
      // A carry: a piece, or the roller, to something. Now and then it is let go at speed.
      const from = random() < 0.12 ? mid(ROLLER) : somePiece() ?? mid(CRATE)
      const to = target()
      run.press(from, t)
      const fast = random() < 0.3
      if (fast) {
        const letGo = { x: from.x + (to.x - from.x) * 0.2, y: from.y + (to.y - from.y) * 0.2 }
        const v = { x: (to.x - letGo.x) / FLIGHT_SECONDS, y: (to.y - letGo.y) / FLIGHT_SECONDS }
        run.move({ x: letGo.x - v.x * 0.03, y: letGo.y - v.y * 0.03 }, t + 0.4)
        run.move(letGo, t + 0.43)
      } else {
        run.move({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, t + 0.4)
        run.move(to, t + 0.9)
      }
      run.lift()
    } else {
      // Time passes: a scene plays out, or part of one.
      for (let k = 0; k < Math.floor(random() * 240); k++) run.step(1 / 60)
    }
    note()
    run.step(1 / 60)
    expectSound(run.game, `seed ${seed}, touch ${i}`)
  }
  return seen
}

describe('nothing passes through anything', () => {
  it('holds from a first visit, through hundreds of seeded touches', { timeout: 30000 }, () => {
    for (const seed of [1, 2, 3]) monkey(seed, 300)
  })

  it('holds at every position of the designed order, with every customer there is', { timeout: 60000 }, () => {
    const seen = new Set<string>()
    for (const position of ['half', 'shared', 'carried', 'written', 'thirds', 'twelfths', 'bigger', 'longer', 'bare']) {
      const start: Game = { ...deserialize({ ...serialize(freshGame(null, 40)), position }), position }
      // Call a few customers first, so the queue fills with ones laid out for this position.
      for (const kind of monkey(40 + position.length, 420, start)) seen.add(kind)
    }
    // The touches reached every state there is: every way a cycle ends, every way a piece is set down or leaves, every thing the roller meets.
    const all = [
      'cut', 'curl', 'poke', 'land', 'swept', 'fell', 'spill', 'snap', 'bark', 'knock', 'skid', 'tinPoke', 'snip', 'flinch', 'called:stepped', 'called:swapped',
      'ending:shut', 'ending:sentOff', 'ending:fed', 'setDown:put', 'setDown:beside', 'setDown:butted', 'given', 'misfit', 'ate', 'burp', 'splat',
      'bounce:tin', 'bounce:fruit', 'bounce:crate', 'knocked', 'pressed', 'rolled:tin', 'rolled:customer', 'rolled:crate', 'rolled:dog', 'rolled:bare',
    ]
    expect(all.filter((kind) => !seen.has(kind)), 'the touches never reached these').toEqual([])
  })

  it('keeps the pieces inside the counter panel, wherever the slabs are', () => {
    for (const slab of [BOARD, SHELF_BOX, RAIL_BOX]) {
      expect(slab.x).toBeGreaterThanOrEqual(COUNTER.x)
      expect(slab.x + slab.w).toBeLessThanOrEqual(COUNTER.x + COUNTER.w)
      expect(slab.y).toBeGreaterThanOrEqual(COUNTER.y)
      expect(slab.y + slab.h).toBeLessThanOrEqual(COUNTER.y + COUNTER.h)
    }
    const slabs = [BOARD, SHELF_BOX, RAIL_BOX]
    for (let a = 0; a < slabs.length; a++) for (let b = a + 1; b < slabs.length; b++) expect(overlap(slabs[a], slabs[b])).toBe(0)
  })
})
