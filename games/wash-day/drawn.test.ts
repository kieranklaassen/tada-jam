import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cleanMud, encodeMud, maskOf } from './cloth'
import { TIERS } from './config'
import { BIB, CAT_EAR, COIL, Figures, GOAT_NECK, SLEEVE_PUSHED, TURNS, type Form } from './figures'
import { BOARD, CAT, CLOTH, FEET_Y, FRIEND_KINDS, GATE, HILL, PLACE_X, RAIL, SOAP, TUB, TUB_SIZE, TUB_SLOTS, YARD_SCALE, heldAt, hungStretch, hungTail, lineSpot } from './layout'
import { DON_S, SLEEVE, SLEEVES_IN, STRAPS, THWOP, idle } from './motion'
import { freshSave } from './save'
import { THREAD } from './scenery'
import { STAGE } from './stage'
import { useCanvases, type Ctx } from './stitch'
import { anchorOf } from './taste'
import * as V from './voices'
import { BOBBLE_FLOAT, CAT_HANG, DIMPLE, SCREW, YardView, bobbleAfloat } from './view'
import { BOARD_SPOT, Yard } from './yard'
import { FRAME, callIn, carry, cellAt, muddiest, play, reopened, rubClean, tapAt, watch, withKinds, wringDry } from './testHands'

// What the sheet says a child sees, held at the canvas: the view is handed
// canvases that draw nothing and write down what they were asked to draw, and
// each test reads that back. The model's side of the same sentences is in
// yard.test.ts.

type Op = { name: string; args: unknown[]; fillStyle: unknown; strokeStyle: unknown; lineWidth: unknown }
const logs = new Map<object, Op[]>()

function recordingCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = { width, height } as { width: number; height: number; getContext: () => unknown }
  const store: Record<string, unknown> = { canvas }
  const log: Op[] = []
  logs.set(canvas, log)
  const context = new Proxy(store, {
    get(target, name: string) {
      if (name in target) return target[name]
      if (name === 'createPattern') return () => ({})
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => ({ addColorStop: () => {} })
      return (...args: unknown[]) => { log.push({ name, args, fillStyle: target.fillStyle, strokeStyle: target.strokeStyle, lineWidth: target.lineWidth }); return undefined }
    },
    set(target, name: string, value) { target[name] = value; return true },
  })
  canvas.getContext = () => context
  return canvas as unknown as HTMLCanvasElement
}

class NoPath { moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} arc() {} ellipse() {} rect() {} closePath() {} addPath() {} }

let had: unknown
beforeAll(() => {
  had = (globalThis as Record<string, unknown>).Path2D
  ;(globalThis as Record<string, unknown>).Path2D = NoPath
  useCanvases(recordingCanvas)
})
afterAll(() => {
  ;(globalThis as Record<string, unknown>).Path2D = had
  useCanvases(null)
})

function viewOf(): { view: YardView; main: object } {
  const main = recordingCanvas(STAGE.width, STAGE.height)
  const view = new YardView(main)
  view.resize(STAGE.width, STAGE.height, 1)
  return { view, main }
}

/** Forgets what was drawn so far, draws one frame, and gives back what every canvas was asked for in it. */
function frame(view: YardView, yard: Parameters<YardView['draw']>[0]): Map<object, Op[]> {
  for (const log of logs.values()) log.length = 0
  view.draw(yard, null, TIERS[0])
  const drawn = new Map<object, Op[]>()
  for (const [canvas, log] of logs) if (log.length > 0) drawn.set(canvas, [...log])
  return drawn
}

const bodyAt = (friend: number) => ({ x: PLACE_X[friend], y: FEET_Y - (FRIEND_KINDS[friend] === 'heron' ? 232 : 180) * YARD_SCALE })
const stampedFrom = (ops: readonly Op[]) => new Set(ops.filter((op) => op.name === 'drawImage').map((op) => op.args[0] as object))
/** The pictures stitched in this frame, each with the knots of suds filled into it: every canvas but the main one that was filled in white. */
const sudsBaked = (drawn: Map<object, Op[]>, main: object) => [...drawn].filter(([canvas, ops]) => canvas !== main && ops.some((op) => op.name === 'fill' && op.fillStyle === THREAD.suds)).map(([canvas]) => canvas)

describe('what the child sees, at the canvas', () => {
  it('suds that were not wrung out stay on the garment: on the rail and on the wearer it is stamped from a picture with its knots stitched in', () => {
    const { view, main } = viewOf()
    const yard = withKinds(['sock', 'shirt', 'dungarees'])
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    const sock = yard.garmentAt('board')!
    // No suds yet: taken to the rail and back, its picture has mud in it and no knot.
    frame(view, yard)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7)
    expect(sock.suds).toBe(0)
    expect(sudsBaked(frame(view, yard), main)).toHaveLength(0)
    carry(yard, RAIL.hang.x, RAIL.hang.y, CLOTH.x + CLOTH.w / 2, CLOTH.y + CLOTH.h / 2); play(yard, 0.7)
    expect(sock.at).toBe('board')
    // Soaped on the board and hung on the rail unwrung: the knots are stitched into its picture, and the frame stamps that picture.
    tapAt(yard, SOAP.x, SOAP.y); play(yard, 2.5)
    expect(sock.suds).toBeGreaterThan(2)
    frame(view, yard)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7)
    expect(sock.at).toBe('rail')
    const onRail = frame(view, yard)
    const baked = sudsBaked(onRail, main)
    expect(baked).toHaveLength(1)
    expect(stampedFrom(onRail.get(main)!).has(baked[0])).toBe(true)
    // Put on as it is, the wearer wears the same soapy picture.
    carry(yard, RAIL.hang.x, RAIL.hang.y, bodyAt(0).x, bodyAt(0).y)
    watch(yard)
    expect(yard.friends[0].wears).toBe(sock)
    frame(view, yard)
    const worn = frame(view, yard)
    expect(stampedFrom(worn.get(main)!).has(baked[0])).toBe(true)
  })

  it("the shirt is drawn without its lower button while it is worn, and with it again when it comes off", () => {
    const { view, main } = viewOf()
    const yard = withKinds(['shirt', 'dungarees', 'sock'])
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    const shirt = yard.garmentAt('board')!
    rubClean(yard)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7)
    wringDry(yard)
    // Clean and with no suds left, the shirt is stamped straight from its own picture.
    shirt.suds = 0
    tapAt(yard, lineSpot(0).x, lineSpot(0).y); play(yard, 0.7)
    frame(view, yard)
    const onLine = stampedFrom(frame(view, yard).get(main)!)
    tapAt(yard, lineSpot(0).x, lineSpot(0).y)
    watch(yard); play(yard, 1)
    expect(yard.buttonOff(shirt)).toBe(true)
    const worn = stampedFrom(frame(view, yard).get(main)!)
    const onlyWorn = [...worn].filter((canvas) => !onLine.has(canvas)), onlyOnLine = [...onLine].filter((canvas) => !worn.has(canvas))
    expect(onlyWorn).toHaveLength(1)
    expect(onlyOnLine).toHaveLength(1)
    // Pulled off and pegged again, it is its own picture again.
    carry(yard, bodyAt(0).x, bodyAt(0).y, lineSpot(0).x, lineSpot(0).y); play(yard, 1)
    expect(shirt.at).toBe('line')
    const back = stampedFrom(frame(view, yard).get(main)!)
    expect(back.has(onlyOnLine[0])).toBe(true)
    expect(back.has(onlyWorn[0])).toBe(false)
  })

  it('brown runs down the board: while a trickle is on its way the frame has one brown thread for it, and none once it has reached the water', () => {
    const { view, main } = viewOf()
    const yard = withKinds(['shirt', 'dungarees', 'sock'])
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    const at = cellAt(muddiest(yard.garmentAt('board')!))
    const trickles = (ops: readonly Op[]) => ops.filter((op) => op.name === 'stroke' && op.strokeStyle === THREAD.mud && op.lineWidth === 4)
    for (let n = 0; n < 6 && yard.runs.length === 0; n++) tapAt(yard, at.x, at.y)
    expect(yard.runs.length).toBeGreaterThan(0)
    expect(trickles(frame(view, yard).get(main)!)).toHaveLength(1)
    play(yard, 2)
    expect(yard.runs).toHaveLength(0)
    expect(trickles(frame(view, yard).get(main)!)).toHaveLength(0)
  })

  it('the scarf on the board is drawn where the finger has pulled it to', () => {
    const { view, main } = viewOf()
    const yard = withKinds(['scarf', 'jumper', 'hat'])
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    const scarf = yard.garmentAt('board')!
    const rest = yard.spotOf(scarf).x
    const movesTo = (ops: readonly Op[], x: number) => ops.some((op) => op.name === 'translate' && Math.abs((op.args[0] as number) - x) < 0.01)
    yard.press(CLOTH.x + CLOTH.w * 0.4, CLOTH.y + CLOTH.h * 0.39)
    yard.step(FRAME)
    expect(movesTo(frame(view, yard).get(main)!, rest)).toBe(true)
    yard.drag(CLOTH.x + CLOTH.w * 0.4 + 20, CLOTH.y + CLOTH.h * 0.39)
    yard.step(FRAME)
    expect(yard.scarf.pull).toBe(20)
    const pulled = frame(view, yard).get(main)!
    expect(movesTo(pulled, rest + 20)).toBe(true)
    expect(movesTo(pulled, rest)).toBe(false)
    yard.tap()
  })

  it('each patch of mud on what a friend wears has its two flies, however many patches there are', () => {
    const { view, main } = viewOf()
    const yard = withKinds(['jumper', 'hat', 'scarf'])
    callIn(yard, 0)
    const jumper = yard.garments[0]
    const lone = [33, 35, 37, 53, 55, 57, 73, 75].filter((cell) => maskOf('jumper')[cell])
    jumper.mud.fill(0)
    for (const cell of lone) jumper.mud[cell] = 2
    jumper.rev += 1
    carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y)
    watch(yard); play(yard, 0.5)
    expect(yard.friends[0].wears).toBe(jumper)
    const flies = frame(view, yard).get(main)!.filter((op) => op.name === 'arc' && op.args[2] === 3.5)
    expect(lone.length).toBeGreaterThan(5)
    expect(flies).toHaveLength(lone.length * 2)
  })

  it('the cat pegged on the line hangs long by the scruff with its legs dangling, and sits short on its post', () => {
    const { view, main } = viewOf()
    const yard = withKinds(['jumper', 'hat', 'scarf'])
    // Its hind legs are two straight stitches down from its seat, in the same pass as its tail.
    const legs = (ops: readonly Op[]) => ops.filter((op) => op.name === 'lineTo' && op.args[0] === -18)
    const long = (ops: readonly Op[]) => ops.filter((op) => op.name === 'scale' && Math.abs((op.args[1] as number) - CAT_HANG) < 1e-9)
    const onPost = frame(view, yard).get(main)!
    expect(legs(onPost)).toHaveLength(0)
    expect(long(onPost)).toHaveLength(0)
    carry(yard, CAT.x, CAT.y, lineSpot(1).x, lineSpot(1).y); play(yard, 0.8)
    expect(yard.cat.at).toBe('line')
    const pegged = frame(view, yard).get(main)!
    expect(legs(pegged)).toHaveLength(1)
    expect(long(pegged)).toHaveLength(1)
    // It swings about its peg: the turn is not the same a moment later.
    const turnOf = (ops: readonly Op[]) => ops.filter((op) => op.name === 'rotate').map((op) => op.args[0] as number).join(',')
    play(yard, 0.4)
    expect(turnOf(frame(view, yard).get(main)!)).not.toBe(turnOf(pegged))
    // Nobody is in the yard, so its tail hangs straight down below its seat.
    const tailOf = (ops: readonly Op[]) => ops.filter((op) => op.name === 'bezierCurveTo' && op.args[1] === hungTail(yard.cat.tuck, 0)[1][1])
    expect(tailOf(pegged)).toHaveLength(1)
    expect(tailOf(pegged)[0].args[5] as number).toBeGreaterThan(90)
    // A friend comes in under it: it is drawn shorter, with its tail in a crook that ends no lower than its seat.
    callIn(yard, 1)
    expect(yard.cat.tuck).toBe(1)
    const tucked = frame(view, yard).get(main)!
    expect(long(tucked)).toHaveLength(0)
    expect(tucked.filter((op) => op.name === 'scale' && Math.abs((op.args[1] as number) - hungStretch(1)) < 1e-9)).toHaveLength(1)
    expect(legs(tucked)).toHaveLength(1)
    expect(tailOf(tucked)).toHaveLength(1)
    expect(tailOf(tucked)[0].args[5] as number).toBeLessThan(0)
  })

  it('one who left wet stands on the hill with drops under what it wears, and one who left dry has none', () => {
    const drops = (wet: number) => {
      const { view, main } = viewOf()
      const save = freshSave(null, 3)
      save.hill = [{ kind: 'pig', colour: 0, garment: 'sock', on: 'ear', mud: encodeMud(cleanMud()), wet, suds: 0 }]
      const drawn = frame(view, new Yard(save))
      let found = 0
      for (const [canvas, ops] of drawn) if (canvas !== main) found += ops.filter((op) => op.name === 'arc' && op.fillStyle !== undefined && Math.abs((op.args[2] as number) - (5 + wet * 0.5)) < 1e-9).length
      return found
    }
    expect(drops(8)).toBe(3)
    expect(drops(0)).toBe(0)
  })

  // --- What a third reader found missing -----------------------------------

  /** Each picture stamped in a frame, with the turns, moves and stretches put on since the canvas was last saved. `cut` is whether a part of the picture was stamped and not the whole. */
  type Stamped = { source: { width: number; height: number }; turns: number[]; moves: [number, number][]; scales: [number, number][]; cut: boolean; at: number }
  const stamped = (ops: readonly Op[]): Stamped[] => {
    const out: Stamped[] = []
    ops.forEach((op, at) => {
      if (op.name !== 'drawImage') return
      const turns: number[] = [], moves: [number, number][] = [], scales: [number, number][] = []
      for (let i = at - 1; i >= 0 && ops[i].name !== 'save' && ops[i].name !== 'restore'; i--) {
        if (ops[i].name === 'rotate') turns.unshift(ops[i].args[0] as number)
        if (ops[i].name === 'translate') moves.unshift([ops[i].args[0] as number, ops[i].args[1] as number])
        if (ops[i].name === 'scale') scales.unshift([ops[i].args[0] as number, ops[i].args[1] as number])
      }
      out.push({ source: op.args[0] as { width: number; height: number }, turns, moves, scales, cut: op.args.length === 9, at })
    })
    return out
  }
  const sum = (turns: readonly number[]) => turns.reduce((a, b) => a + b, 0)
  /** The parts of one picture stamped in a frame: the pieces a garment is drawn in. */
  const pieces = (ops: readonly Op[]) => stamped(ops).filter((stamp) => stamp.cut)

  it("the cat's ears are drawn from its pose: back flat on the board, pricked and turning on its post", () => {
    const { view, main } = viewOf()
    const yard = withKinds(['jumper', 'hat', 'scarf'])
    // The ear is a piece of its own, stamped twice a frame: the one picture that is 40 by 44.
    const ears = (ops: readonly Op[]) => stamped(ops).filter((stamp) => Math.abs(stamp.source.width / stamp.source.height - 40 / 44) < 1e-6 && !stamp.cut)
    const turns = new Set<string>()
    for (let n = 0; n < 60; n++) {
      play(yard, 0.2)
      const now = ears(frame(view, yard).get(main)!)
      expect(now).toHaveLength(2)
      // The two ears turn against each other by the same amount, and never lie flat while it sits there in peace.
      expect(sum(now[0].turns)).toBeCloseTo(-sum(now[1].turns), 9)
      expect(Math.abs(sum(now[0].turns))).toBeLessThan(0.75 * CAT_EAR)
      turns.add(sum(now[0].turns).toFixed(2))
    }
    expect(turns.size).toBeGreaterThan(2)
    carry(yard, CAT.x, CAT.y, BOARD_SPOT.x, BOARD_SPOT.y); play(yard, 0.8)
    expect(yard.cat.at).toBe('board')
    const flat = ears(frame(view, yard).get(main)!)
    expect(flat).toHaveLength(2)
    expect(sum(flat[0].turns)).toBeCloseTo(CAT_EAR, 9)
    expect(sum(flat[1].turns)).toBeCloseTo(-CAT_EAR, 9)
  })

  it("the hat's bobble stays up as a float: beside the hat on the water, above the tub's front, while the hat floats, tips and goes under", () => {
    // By the numbers: at every slot of the tub and at every moment, the whole bobble is above the front rim where it floats.
    const radius = (15 * TUB_SIZE) / CLOTH.w
    for (const slot of TUB_SLOTS) for (let t = 0; t < 12; t += 0.05) {
      const at = bobbleAfloat(slot, t)
      const rim = TUB.y + TUB.ry * Math.sqrt(1 - ((at.x - TUB.x) / TUB.rx) ** 2)
      expect(at.y + radius).toBeLessThan(rim)
      // And it is on the water, not on the tub's far wall: inside the water's own oval.
      expect(((at.x - TUB.x) / (TUB.rx - 12)) ** 2 + ((at.y - TUB.y - 9) / (TUB.ry - 9)) ** 2).toBeLessThan(1)
      expect(at.x - radius).toBeGreaterThan(BOARD.x + BOARD.w)
      expect(Math.abs(at.y - (slot.y + BOBBLE_FLOAT.dy))).toBeLessThanOrEqual(BOBBLE_FLOAT.bob)
    }
    // Drawn: from the frame the hat lands until long after it has gone under, the bobble is stamped there by itself.
    const { view, main } = viewOf()
    const yard = withKinds(['hat', 'scarf', 'jumper'])
    callIn(yard, 0)
    carry(yard, heldAt(0).x, heldAt(0).y, 372, 676); play(yard, 0.7)
    const hat = yard.garments[0]
    expect(hat.at).toBe('tub')
    const heights = new Set<string>()
    for (let n = 0; n < 240; n++) {
      yard.step(FRAME)
      const want = bobbleAfloat(yard.spotOf(hat), yard.time)
      const found = stamped(frame(view, yard).get(main)!).filter((stamp) => stamp.source.width === stamp.source.height && stamp.moves.some(([x, y]) => x === want.x && y === want.y))
      expect(found).toHaveLength(1)
      heights.add(want.y.toFixed(1))
    }
    expect(hat.since).toBeGreaterThan(3)
    expect(heights.size).toBeGreaterThan(5)
  })

  it("the shirt's sleeves are stamped as pieces of their own, turned at the shoulder: spread in the tub, wound in on the rail, waving and clapping on the line", () => {
    const { view, main } = viewOf()
    const yard = withKinds(['shirt', 'dungarees', 'sock'])
    callIn(yard, 0)
    const shirt = yard.garments[0]
    /** The shirt's three pieces in this frame: the body, and the two sleeves with how far each is turned from the way it is cut. */
    const shirtOf = (ops: readonly Op[]) => {
      const parts = pieces(ops)
      expect(parts).toHaveLength(3)
      expect(new Set(parts.map((part) => part.source)).size).toBe(1)
      return { left: sum(parts[1].turns), right: sum(parts[2].turns) }
    }
    // Held out, it is the one picture as it is cut.
    expect(pieces(frame(view, yard).get(main)!)).toHaveLength(0)
    carry(yard, heldAt(0).x, heldAt(0).y, 372, 676); play(yard, 2.5)
    expect(shirt.at).toBe('tub')
    const afloat = shirtOf(frame(view, yard).get(main)!)
    // Each sleeve is lifted from the way it is cut to well above the shoulder: the left turned one way, the right the other.
    expect(afloat.left).toBeGreaterThan(0.9)
    expect(afloat.right).toBeLessThan(-0.9)
    play(yard, 0.6)
    expect(shirtOf(frame(view, yard).get(main)!).left).not.toBeCloseTo(afloat.left, 3)
    // On the rail, as it is squeezed, the cuffs swing in across the front and lie one over the other.
    tapAt(yard, yard.spotOf(shirt).x, yard.spotOf(shirt).y); play(yard, 0.7)
    tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7)
    expect(shirt.at).toBe('rail')
    tapAt(yard, RAIL.hang.x, RAIL.hang.y)
    expect(shirt.twist).toBe(1)
    const wound = shirtOf(frame(view, yard).get(main)!)
    expect(wound.left).toBeCloseTo(SLEEVES_IN - SLEEVE, 9)
    expect(wound.right).toBeCloseTo(SLEEVE - SLEEVES_IN, 9)
    // Let go, it springs back, and hangs as it is cut: one picture again.
    play(yard, 1)
    expect(pieces(frame(view, yard).get(main)!)).toHaveLength(0)
    wringDry(yard); play(yard, 1)
    // On the line the sleeves wave, each at its own beat; as it is pegged they clap: the cuffs meet in front of it.
    tapAt(yard, lineSpot(0).x, lineSpot(0).y)
    let met = 0, apart = 0
    const waves = new Set<string>()
    for (let n = 0; n < 120; n++) {
      yard.step(FRAME)
      if (shirt.fly) continue
      const now = shirtOf(frame(view, yard).get(main)!)
      if (now.left < SLEEVES_IN - SLEEVE + 0.2 && now.right > SLEEVE - SLEEVES_IN - 0.2) met += 1
      else if (Math.abs(now.right) < 0.5 && Math.abs(now.left) < 0.5) apart += 1
      waves.add(`${now.right.toFixed(1)} ${now.left.toFixed(1)}`)
    }
    expect(met).toBeGreaterThanOrEqual(3)
    expect(apart).toBeGreaterThan(40)
    expect(waves.size).toBeGreaterThan(6)
  })

  it('arms go through the sleeves: worn, each sleeve lies down the arm that is in it, pushed up so the hand comes out, and the near arm is drawn between the shirt and its sleeve', () => {
    for (const friend of [0, 1, 2]) {
      const { view, main } = viewOf()
      const kinds = (['dungarees', 'sock', 'jumper'] as const).map((kind, n) => (n === friend ? 'shirt' : kind)) as ['shirt', 'sock', 'jumper']
      const yard = withKinds(kinds)
      callIn(yard, friend)
      carry(yard, heldAt(friend).x, heldAt(friend).y, bodyAt(friend).x, bodyAt(friend).y)
      watch(yard); play(yard, 1.5)
      expect(yard.friends[friend].wears?.kind).toBe('shirt')
      const ops = frame(view, yard).get(main)!
      const parts = pieces(ops)
      expect(parts).toHaveLength(3)
      // The body, then the far sleeve, then, after the near arm has been stamped, the near sleeve.
      const between = stamped(ops).filter((stamp) => !stamp.cut && stamp.at > parts[1].at && stamp.at < parts[2].at)
      expect(between).toHaveLength(1)
      expect(stamped(ops).filter((stamp) => !stamp.cut && stamp.at > parts[0].at && stamp.at < parts[1].at)).toHaveLength(0)
      // Each sleeve is turned in from the way it is cut, towards the arm that hangs at its side, and is shorter than it is cut.
      for (const sleeve of [parts[1], parts[2]]) {
        expect(sleeve.scales.some(([sx, sy]) => sx === 1 && sy === SLEEVE_PUSHED)).toBe(true)
        expect(Math.abs(sum(sleeve.turns))).toBeGreaterThan(0.05)
        expect(Math.abs(sum(sleeve.turns))).toBeLessThan(SLEEVE)
      }
      expect(sum(parts[1].turns)).toBeGreaterThan(0)
      expect(sum(parts[2].turns)).toBeLessThan(0)
    }
  })

  it('the scarf is wound round its wearer: a turn at a time as it goes on, then three turns one below the other, all leaning one way, over the hanging end', () => {
    const { view, main } = viewOf()
    const yard = withKinds(['scarf', 'jumper', 'hat'])
    callIn(yard, 0)
    /** The pictures a scarf was wound into in this frame: for each, its pieces, the hanging end first and then the turns. */
    const woundIn = (drawn: Map<object, Op[]>) => [...drawn].filter(([canvas]) => canvas !== main).map(([canvas, ops]) => ({ canvas, parts: pieces(ops) })).filter((made) => made.parts.some((part) => part.turns.includes(COIL)))
    expect(woundIn(frame(view, yard))).toHaveLength(0)
    carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y)
    const pig = yard.friends[0]
    const counts: number[] = []
    let picture: object | null = null
    for (let n = 0; n < 900 && yard.sceneRunning; n++) {
      yard.step(FRAME)
      const drawn = frame(view, yard)
      for (const made of woundIn(drawn)) {
        // The end hangs as it is cut; over it lie the turns, each lower than the last.
        expect(made.parts[0].turns.includes(COIL)).toBe(false)
        const turns = made.parts.slice(1)
        expect(turns.every((part) => part.turns.includes(COIL))).toBe(true)
        const heights = turns.map((part) => part.moves[part.moves.length - 1][1])
        expect(heights.every((height, i) => i === 0 || height > heights[i - 1])).toBe(true)
        counts.push(turns.length)
        picture = made.canvas
        // The frame that winds it stamps it.
        expect(stampedFrom(drawn.get(main)!).has(made.canvas)).toBe(true)
      }
    }
    // One more turn for each whup of its voice: it is wound again only as a turn goes on.
    expect(counts).toEqual([1, 2, 3])
    expect(TURNS).toHaveLength(3)
    expect(pig.wears?.kind).toBe('scarf')
    // Worn, it is stamped from that picture and wound no more: one stamp a frame.
    play(yard, 1)
    const worn = frame(view, yard)
    expect(woundIn(worn)).toHaveLength(0)
    expect(stampedFrom(worn.get(main)!).has(picture!)).toBe(true)
    expect(pieces(worn.get(main)!)).toHaveLength(0)
    // On the far hill it is wound still.
    tapAt(yard, GATE.x + GATE.w / 2, GATE.y + GATE.h / 2)
    watch(yard)
    expect(yard.hill).toHaveLength(1)
    const onHill = woundIn(frame(view, yard))
    expect(onHill).toHaveLength(1)
    expect(onHill[0].parts).toHaveLength(1 + TURNS.length)
  })

  it('wrung, the sock is a tight screw and the scarf a rope of many turns: cut into bands, each pushed the other way from the last, and whole again when let go', () => {
    for (const [kind, kinds] of [['sock', ['sock', 'shirt', 'dungarees']], ['scarf', ['scarf', 'jumper', 'hat']]] as const) {
      const { view, main } = viewOf()
      const yard = withKinds(kinds as unknown as ['sock', 'shirt', 'dungarees'])
      callIn(yard, 0)
      tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
      tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7)
      const garment = yard.garmentAt('rail')!
      expect(pieces(frame(view, yard).get(main)!)).toHaveLength(0)
      tapAt(yard, RAIL.hang.x, RAIL.hang.y)
      expect(garment.twist).toBe(1)
      const bands = pieces(frame(view, yard).get(main)!)
      expect(SCREW[kind]).toBeGreaterThan(3)
      expect(bands).toHaveLength(SCREW[kind])
      // Each band is the next strip down the picture, pushed to the other side from the one above.
      const ops = frame(view, yard).get(main)!.filter((each) => each.name === 'drawImage' && each.args.length === 9)
      const tops = ops.map((each) => each.args[2] as number), lefts = ops.map((each) => each.args[5] as number)
      for (let n = 1; n < tops.length; n++) {
        expect(tops[n]).toBeGreaterThan(tops[n - 1])
        expect(Math.sign(lefts[n] - lefts[n - 1])).toBe(n % 2 ? 1 : -1)
      }
      play(yard, 1)
      expect(garment.twist).toBe(0)
      expect(pieces(frame(view, yard).get(main)!)).toHaveLength(0)
    }
  })

  it('the goat in a muddy thing is drawn with a neck between its shoulders and its lifted head, for as long as it wears it, and on the hill too', () => {
    const { view, main } = viewOf()
    const yard = withKinds(['shirt', 'sock', 'dungarees'])
    callIn(yard, 2)
    // The neck is a picture of its own, as wide as `GOAT_NECK` and 70 long, stamped under the head only while the neck is at its stretch.
    const necks = (ops: readonly Op[]) => stamped(ops).filter((stamp) => !stamp.cut && Math.abs(stamp.source.width / stamp.source.height - GOAT_NECK / 70) < 1e-6)
    expect(necks(frame(view, yard).get(main)!)).toHaveLength(0)
    carry(yard, heldAt(2).x, heldAt(2).y, bodyAt(2).x, bodyAt(2).y)
    watch(yard)
    expect(necks(frame(view, yard).get(main)!)).toHaveLength(1)
    play(yard, 8)
    expect(necks(frame(view, yard).get(main)!)).toHaveLength(1)
    // Opened again, it is drawn so in the first frame.
    const again = viewOf()
    expect(necks(frame(again.view, reopened(yard)).get(again.main)!)).toHaveLength(1)
    // It walks off so, and stands so on the hill.
    tapAt(yard, GATE.x + GATE.w / 2, GATE.y + GATE.h / 2)
    let walking = 0
    watch(yard, () => { if (yard.leaving.some((leaver) => leaver.kind === 'goat' && !leaver.hidden)) walking += necks(frame(view, yard).get(main)!).length > 0 ? 1 : 0 })
    expect(walking).toBeGreaterThan(60)
    expect(yard.hill).toHaveLength(1)
    let onHill = 0
    for (const [canvas, ops] of frame(view, yard)) if (canvas !== main) onHill += necks(ops).length
    expect(onHill).toBe(1)
  })

  it("the sock's stripes flash as the mud comes off them: two white bars over it for a moment", () => {
    const { view, main } = viewOf()
    const yard = withKinds(['sock', 'shirt', 'dungarees'])
    callIn(yard, 0)
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
    const sock = yard.garmentAt('board')!
    const bars = (ops: readonly Op[]) => ops.filter((op) => op.name === 'rect' && Math.abs((op.args[2] as number) - 0.385 * yard.spotOf(sock).size) < 1e-9)
    expect(bars(frame(view, yard).get(main)!)).toHaveLength(0)
    const at = cellAt(muddiest(sock))
    tapAt(yard, at.x, at.y)
    const lit = frame(view, yard).get(main)!
    expect(bars(lit)).toHaveLength(2)
    expect(lit.some((op) => op.name === 'fill' && op.fillStyle === '#ffffff')).toBe(true)
    play(yard, 0.4)
    expect(bars(frame(view, yard).get(main)!)).toHaveLength(0)
  })

  it('a friend with a peg on it squints at the peg and at nothing else, wherever the finger is', () => {
    const { view, main } = viewOf()
    const yard = withKinds(['jumper', 'hat', 'scarf'])
    callIn(yard, 0)
    // The pig's pupils: two dots of this size, drawn about the middle of each eye.
    const pupils = (ops: readonly Op[]) => ops.filter((op) => op.name === 'arc' && op.args[2] === 6).map((op) => ({ x: op.args[0] as number, y: op.args[1] as number }))
    yard.press(700, 740)
    yard.step(FRAME)
    const down = pupils(frame(view, yard).get(main)!)
    expect(down).toHaveLength(2)
    // The finger is down on the grass to its right: it looks there.
    expect(down.every((pupil) => pupil.y > -80)).toBe(true)
    expect(down[0].x).toBeGreaterThan(-27)
    yard.tap(); play(yard, 0.3)
    carry(yard, yard.pegSpot(3).x, yard.pegSpot(3).y, bodyAt(0).x, bodyAt(0).y)
    expect(yard.pegs[3].state).toBe('friend')
    yard.press(700, 740)
    yard.step(FRAME)
    const peg = yard.pegSpot(3)
    const squint = pupils(frame(view, yard).get(main)!)
    yard.tap()
    expect(squint).toHaveLength(2)
    // The peg is on its ear, up and to the left of its eyes, and the finger is down on the grass still: it looks at the peg.
    expect(peg.y).toBeLessThan(yard.friends[0].y - 330 * yard.friends[0].scale)
    expect(squint.every((pupil) => pupil.y < -80)).toBe(true)
  })

  it('a garment goes on as its voice says: the jumper sticks over the head until the thwop and pops down with it, each strap of the dungarees pings up with its ping, and the scarf takes a turn with each whup', () => {
    const figures = new Figures(1)
    const canvas = recordingCanvas(10, 10)
    const g = canvas.getContext('2d') as unknown as Ctx, log = logs.get(canvas)!
    /** A pig drawn with this garment `age` seconds into going on: how the wearer shapes it, and how far down it has come. */
    const going = (kind: 'jumper' | 'dungarees' | 'scarf', on: 'torso' | 'legs' | 'neck', age: number) => {
      log.length = 0
      let form: Form = {}, at = -1
      figures.drawFigure(g, { stamps: 0, pen: 0 }, { kind: 'pig', colour: 0, pose: idle('pig', 0), lx: 0, ly: 0, arms: 'rest', hide: [], worn: { kind, on, donning: age / DON_S, draw: (_c, _size, shaped) => { form = shaped; at = log.length } } })
      const moves = log.slice(0, at).filter((op) => op.name === 'translate')
      return { form, y: moves[moves.length - 1].args[1] as number }
    }
    // The jumper: over the head and still, through the three muffled sounds; then down, in the time the thwop takes.
    const stuck = going('jumper', 'torso', 0.05).y
    for (let age = 0.05; age < THWOP; age += 0.05) expect(going('jumper', 'torso', age).y).toBe(stuck)
    expect(going('jumper', 'torso', THWOP + 0.07).y).toBeGreaterThan(stuck + 20)
    expect(going('jumper', 'torso', THWOP + 0.16).y).toBeCloseTo(stuck + anchorOf('pig', 'torso').size * 0.5, 6)
    expect(going('jumper', 'torso', DON_S).y).toBe(going('jumper', 'torso', THWOP + 0.16).y)
    const thwop = V.donned('jumper', 0.5).filter((note) => note.delay === THWOP)
    expect(thwop).toHaveLength(2)
    expect(V.donned('jumper', 0.5).filter((note) => (note.delay ?? 0) < THWOP)).toHaveLength(3)
    // The dungarees: both straps down in front until the first ping, one up between the two, both up after the second.
    expect(going('dungarees', 'legs', 0.2).form.straps).toEqual([0, 0])
    expect(going('dungarees', 'legs', STRAPS[0] - 0.01).form.straps).toEqual([0, 0])
    expect(going('dungarees', 'legs', STRAPS[0] + 0.09).form.straps).toEqual([1, 0])
    expect(going('dungarees', 'legs', STRAPS[1] + 0.09).form.straps).toEqual([1, 1])
    expect(going('dungarees', 'legs', DON_S).form.straps).toBeUndefined()
    const pings = V.donned('dungarees', 0.5).filter((note) => note.kind === 'tone')
    expect(pings.map((note) => note.delay)).toEqual([...STRAPS])
    expect(STRAPS[1] + 0.09).toBeLessThan(DON_S)
    // The scarf: one more turn at each whup.
    const whups = V.donned('scarf', 0.5).map((note) => note.delay ?? 0)
    expect(whups).toEqual([0, 0.22, 0.44])
    whups.forEach((whup, n) => {
      expect(going('scarf', 'neck', whup + 0.02).form.wound).toBe(n + 1)
      if (n > 0) expect(going('scarf', 'neck', whup - 0.02).form.wound).toBe(n)
    })
    expect(going('scarf', 'neck', DON_S).form.wound).toBe(TURNS.length)
  })

  it("going on, the dungarees are drawn in their legs and the two halves of the bib: each half hangs down in front, folded at the waist, until its strap pings up", () => {
    const { view, main } = viewOf()
    const yard = withKinds(['dungarees', 'sock', 'shirt'])
    callIn(yard, 0)
    carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y)
    const pig = yard.friends[0]
    const seen = new Set<string>()
    for (let n = 0; n < 900 && yard.sceneRunning; n++) {
      yard.step(FRAME)
      if (!pig.wears || pig.wears.fly || pig.donning >= 1 || pig.donning <= 0.002) continue
      const age = pig.donning * DON_S
      const parts = pieces(frame(view, yard).get(main)!)
      // Each half of the bib is the top of the picture, turned over about the line where the legs begin, or not.
      const flips = parts.slice(1).map((part) => part.scales[part.scales.length - 1][1])
      if (age < STRAPS[0]) { expect(flips).toEqual([-1, -1]); seen.add('both down') }
      else if (age > STRAPS[0] + 0.09 && age < STRAPS[1]) { expect(flips).toEqual([1, -1]); seen.add('one up') }
      else if (age > STRAPS[1] + 0.09) { expect(parts).toHaveLength(0); seen.add('both up') }
    }
    expect([...seen]).toEqual(['both down', 'one up', 'both up'])
    expect(BIB).toBeGreaterThan(0.2)
    play(yard, 0.5)
    expect(pieces(frame(view, yard).get(main)!)).toHaveLength(0)
  })

  // --- What a fourth reader found missing ----------------------------------

  it('room is made on the hill before a newcomer gets there: the oldest goes over the far side, the two who stay walk up one place, and nobody jumps', () => {
    const { view, main } = viewOf()
    const save = freshSave(null, 3)
    save.hill = ([['sock', 'foot'], ['hat', 'eyes'], ['scarf', 'neck']] as const).map(([garment, on], n) => ({ kind: FRIEND_KINDS[n], colour: 0 as const, garment, on, mud: encodeMud(cleanMud()), wet: 0, suds: 0 }))
    const yard = new Yard(save)
    callIn(yard, 0)
    carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y); watch(yard); play(yard, 0.2)
    // Standing: the whole hill is one stamp.
    const whole = (ops: readonly Op[]) => ops.filter((op) => op.name === 'drawImage' && op.args.length === 5 && op.args[1] === 520 && op.args[2] === 196)
    const before = whole(frame(view, yard).get(main)!)
    expect(before).toHaveLength(1)
    const hill = before[0].args[0] as object
    const cuts = (ops: readonly Op[]) => ops.filter((op) => op.name === 'drawImage' && op.args.length === 9 && op.args[0] === hill).map((op) => ({ from: op.args[1] as number, x: op.args[5] as number, y: op.args[6] as number, tall: op.args[8] as number }))
    tapAt(yard, GATE.x + GATE.w / 2, GATE.y + GATE.h / 2)
    expect(yard.sceneRunning).toBe(true)
    const tracks = new Map<number, { x: number; y: number; tall: number }[]>()
    let most = 0, arrived = false
    while (yard.sceneRunning && !arrived) {
      yard.step(FRAME)
      const ops = frame(view, yard).get(main)!
      if (yard.hillShift) {
        const seen = cuts(ops)
        expect(whole(ops)).toHaveLength(0)
        most = Math.max(most, seen.length)
        for (const cut of seen) tracks.set(cut.from, [...(tracks.get(cut.from) ?? []), cut])
      } else if (tracks.size > 0) arrived = true
    }
    expect(arrived).toBe(true)
    expect(most).toBe(3)
    const [oldest, second, third] = [...tracks.keys()].sort((a, b) => a - b).map((from) => tracks.get(from)!)
    // Nobody moves more than a step a frame, sideways or up and down.
    for (const track of [oldest, second, third]) for (let n = 1; n < track.length; n++) {
      expect(Math.abs(track[n].x - track[n - 1].x)).toBeLessThan(3)
      expect(Math.abs(track[n].y - track[n - 1].y)).toBeLessThan(3)
    }
    // The two who stay end one place over, exactly where the hill then shows them.
    expect(second[second.length - 1].x - second[0].x).toBeCloseTo(HILL[0].x - HILL[1].x, 0)
    expect(third[third.length - 1].x - third[0].x).toBeCloseTo(HILL[1].x - HILL[2].x, 0)
    expect(second[second.length - 1].y - second[0].y).toBeCloseTo(HILL[0].y - HILL[1].y, 0)
    // The oldest walks off to the left and is hidden from the feet up, until nothing of it shows; then it is drawn no more.
    expect(oldest[oldest.length - 1].x).toBeLessThan(oldest[0].x - 40)
    expect(oldest[oldest.length - 1].tall).toBeLessThan(oldest[0].tall * 0.2)
    expect(oldest.length).toBeLessThan(second.length)
    // Arrived: one stamp again, of the hill as the save has held it since the gate opened.
    expect(whole(frame(view, yard).get(main)!)).toHaveLength(1)
    expect(yard.hillShown).toEqual(yard.hill)
    expect(yard.hill.map((leaver) => leaver.garment).slice(0, 2)).toEqual(['hat', 'scarf'])
  })

  it('one on the hill stands the same whichever place it has', () => {
    const stands = (place: number) => {
      const { view, main } = viewOf()
      const save = freshSave(null, 3)
      const one = { kind: 'heron' as const, colour: 1 as const, garment: 'hat' as const, on: 'eyes' as const, mud: encodeMud(cleanMud()), wet: 0, suds: 0 }
      save.hill = [...Array.from({ length: place }, () => ({ ...one, kind: 'pig' as const })), one]
      const drawn = frame(view, new Yard(save))
      const hill = drawn.get(main)!.find((op) => op.name === 'drawImage' && op.args.length === 5 && op.args[1] === 520 && op.args[2] === 196)!.args[0] as object
      // All that was turned, moved and stretched for the one stitched last, after the hill set it at its place.
      const log = drawn.get(hill)!
      const ops = log.slice(log.map((op) => op.name).lastIndexOf('setTransform') + 1).filter((op) => op.name === 'rotate' || op.name === 'scale' || op.name === 'translate')
      expect(ops.length).toBeGreaterThan(4)
      return JSON.stringify(ops.map((op) => op.args))
    }
    expect(stands(0)).toBe(stands(2))
  })

  it('the pucker under the finger differs with the cloth: the jumper takes the finger deeper and wider, and the dungarees drag a tail behind it', () => {
    /** The stitches of the pucker in one frame, each as its two ends measured from the finger. */
    const pucker = (view: YardView, main: object, yard: Yard) => {
      const ops = frame(view, yard).get(main)!
      const at = ops.findIndex((op) => op.name === 'stroke' && op.strokeStyle === 'rgba(40, 26, 18, 0.5)')
      expect(at).toBeGreaterThan(0)
      const from = ops.map((op) => op.name).lastIndexOf('beginPath', at)
      const ends = ops.slice(from, at).filter((op) => op.name === 'moveTo' || op.name === 'lineTo').map((op) => ({ x: (op.args[0] as number) - yard.dimple.x, y: (op.args[1] as number) - yard.dimple.y }))
      return Array.from({ length: ends.length / 2 }, (_unused, n) => [ends[n * 2], ends[n * 2 + 1]] as const)
    }
    const on = (kind: 'shirt' | 'jumper' | 'dungarees') => {
      const { view, main } = viewOf()
      const yard = withKinds([kind, 'sock', 'hat'])
      callIn(yard, 0)
      tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
      expect(yard.garmentAt('board')?.kind).toBe(kind)
      return { view, main, yard }
    }
    const far = (end: { x: number; y: number }) => Math.hypot(end.x, end.y)
    const dab = (kind: 'shirt' | 'jumper' | 'dungarees') => {
      const { view, main, yard } = on(kind)
      const at = cellAt(muddiest(yard.garmentAt('board')!))
      yard.press(at.x, at.y)
      return pucker(view, main, yard)
    }
    const shirt = dab('shirt'), jumper = dab('jumper'), dungarees = dab('dungarees')
    // A ring of eight on the shirt, and nothing else.
    expect(shirt).toHaveLength(8)
    // On the jumper the ring is half as wide again, and its stitches reach further in towards the finger for their width: it has sunk in.
    expect(jumper).toHaveLength(8)
    expect(far(jumper[0][1])).toBeCloseTo(far(shirt[0][1]) * DIMPLE.jumper.wide, 6)
    expect(DIMPLE.jumper.wide).toBeGreaterThanOrEqual(1.4)
    expect(far(jumper[0][0]) / far(jumper[0][1])).toBeLessThan((far(shirt[0][0]) / far(shirt[0][1])) * 0.5)
    expect(far(jumper[0][1]) - far(jumper[0][0])).toBeGreaterThan((far(shirt[0][1]) - far(shirt[0][0])) * 2)
    // On the dungarees the same ring as the shirt's, and three more stitches behind the finger: after a dab they trail down the board.
    expect(dungarees).toHaveLength(11)
    dungarees.slice(0, 8).forEach(([near, end], n) => { expect(far(near)).toBeCloseTo(far(shirt[n][0]), 6); expect(far(end)).toBeCloseTo(far(shirt[n][1]), 6) })
    for (const [near, end] of dungarees.slice(8)) {
      expect(near.y).toBeGreaterThan(20)
      expect(end.y).toBeGreaterThan(near.y + 15)
    }
    // Dragged to the right, the tail lies to the left of the finger; dragged up the board, below it.
    const { view, main, yard } = on('dungarees')
    const at = cellAt(muddiest(yard.garmentAt('board')!))
    yard.press(at.x - 30, at.y)
    for (let n = 1; n <= 6; n++) { yard.drag(at.x - 30 + n * 6, at.y); yard.step(FRAME) }
    for (const [near, end] of pucker(view, main, yard).slice(8)) {
      expect(near.x).toBeLessThan(-20)
      expect(end.x).toBeLessThan(near.x - 10)
    }
    for (let n = 1; n <= 6; n++) { yard.drag(at.x + 6, at.y - n * 6); yard.step(FRAME) }
    for (const [near, end] of pucker(view, main, yard).slice(8)) {
      expect(near.y).toBeGreaterThan(20)
      expect(end.y).toBeGreaterThan(near.y + 10)
    }
    yard.lift(); yard.drop()
  })
})
