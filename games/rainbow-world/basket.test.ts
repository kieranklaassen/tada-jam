import { describe, expect, it } from 'vitest'
import { BASKET_BOX, HEADS, LYING, RIM_Y, UPRIGHT_SIZE, basketRests, hiddenFoot, inBasket, inMouth, insideOrder, lookingOut, lookoutFoot, lookoutHead, overRim, sizeIn } from './basket'
import { mat, run, take, tap, tapBasket } from './drive'
import { BASKET, MAT, onMat } from './layout'
import { PIECE_IDS, type PieceId } from './pieces'
import { covers, topOf } from './shape'
import { homePlaces } from './thing'
import { World } from './world'

// The basket hides what is in it. Held here: at most three heads look out, each whole, upright and its own; a
// thing that does not look out shows nowhere; every head and hat that shows answers a touch as the basket;
// the basket never answers for the mat; and a thing is seen all the way in and all the way out.

/** Every set of things with a head that can be in the basket at once. */
const SETS: PieceId[][] = Array.from({ length: 16 }, (_, bits) => HEADS.filter((_id, i) => bits & (1 << i)))
const SLOTS = ['middle', 'right', 'left'] as const

/** Whether a point of the stage is on a thing that looks out of the basket, as it is drawn there. */
function shows(id: PieceId, slot: (typeof SLOTS)[number], tipped: boolean, x: number, y: number): boolean {
  const foot = lookoutFoot(id, slot, tipped)
  return covers(id, x - foot.x, y - foot.y, 0, tipped ? LYING.size : UPRIGHT_SIZE)
}
/** Whether a point is where the basket lets a thing in it show. */
const inWindow = (tipped: boolean, x: number, y: number): boolean => inMouth(x, y, tipped)

describe.each([false, true])('what looks out of the basket, on its side: %s', (tipped) => {
  it('lets at most three heads look out, each whole and none under another thing', () => {
    for (const inside of SETS) {
      const out = lookingOut(inside), lookers = inside.filter((id) => out[id])
      // Every doll in it looks out, and the horse where the middle or the right is free.
      expect(lookers.length, inside.join()).toBe(Math.min(3, inside.length) - (inside.includes('horse') && inside.includes('doll-tall') && inside.includes('doll-round') && inside.length === 3 ? 1 : 0))
      expect(new Set(lookers.map((id) => out[id])).size).toBe(lookers.length)
      // The order they are drawn in: the middle one first, so it is the two at its sides that could cover it.
      const rank = (id: PieceId): number => SLOTS.indexOf(out[id]!)
      for (const id of lookers) {
        const head = lookoutHead(id, out[id]!, tipped)
        for (let a = 0; a < 24; a++) {
          for (const share of [0.35, 0.7, 0.97]) {
            const x = head.x + Math.cos((a / 24) * Math.PI * 2) * head.r * share, y = head.y + Math.sin((a / 24) * Math.PI * 2) * head.r * share
            // The whole head is where the basket shows it.
            expect(inWindow(tipped, x, y), `${inside.join()}: the head of ${id}`).toBe(true)
            // And no thing drawn after it lies over its face.
            for (const other of lookers) if (other !== id && rank(other) > rank(id)) expect(shows(other, out[other]!, tipped, x, y), `${inside.join()}: ${other} over the face of ${id}`).toBe(false)
          }
        }
      }
    }
  })

  it('answers a touch as the basket on every head, hat and ear that shows', () => {
    for (const inside of SETS) {
      const out = lookingOut(inside)
      for (const id of inside.filter((each) => out[each])) {
        const foot = lookoutFoot(id, out[id]!, tipped), k = tipped ? LYING.size : UPRIGHT_SIZE
        for (let x = foot.x - 130; x <= foot.x + 130; x += 4) {
          for (let y = foot.y - topOf(id) * k - 4; y <= foot.y; y += 4) {
            if (!shows(id, out[id]!, tipped, x, y) || !inWindow(tipped, x, y)) continue
            expect(inBasket(x, y, tipped), `${id} at ${x}, ${Math.round(y)}`).toBe(true)
          }
        }
        // The top of its hat or its ears is drawn, and is the basket's too.
        expect(foot.y - topOf(id) * k).toBeGreaterThanOrEqual(tipped ? LYING.y - LYING.r : BASKET_BOX.top)
      }
    }
  })

  it('shows nothing of a thing that does not look out, and gives every thing in it one place', () => {
    for (const id of PIECE_IDS) {
      const foot = hiddenFoot(id, tipped), k = tipped ? LYING.size : UPRIGHT_SIZE
      // Its highest point is below the rim, or below the mouth.
      expect(foot.y - topOf(id) * k, id).toBeGreaterThan(tipped ? LYING.y + LYING.opening : RIM_Y)
    }
    const places = homePlaces()
    for (const id of PIECE_IDS) places[id] = { at: 'basket', x: 0, y: 0, on: null, turned: false }
    const world = new World(places, tipped ? 'tipped' : 'upright'), rests = basketRests(world.pieces, tipped)
    expect(rests.size).toBe(8)
    const out = lookingOut([...PIECE_IDS])
    for (const p of world.pieces) {
      expect([p.px, p.py, p.far], p.def.id).toEqual([rests.get(p)!.x, rests.get(p)!.y, 1])
      expect(rests.get(p), p.def.id).toEqual(out[p.def.id] ? lookoutFoot(p.def.id, out[p.def.id]!, tipped) : hiddenFoot(p.def.id, tipped))
    }
    // Three dolls look out; the horse, the arches and the silk are out of sight.
    expect(Object.keys(out).sort()).toEqual(['doll-round', 'doll-small', 'doll-tall'])
    expect(insideOrder(world.pieces).slice(-3).map((p) => p.def.id)).toEqual(['doll-tall', 'doll-round', 'doll-small'])
  })

  it('never answers for the mat: no point of the mat is the basket', () => {
    for (let x = MAT.x - MAT.rx; x <= MAT.x + MAT.rx; x += 3) for (let y = MAT.y - MAT.ry; y <= MAT.y + MAT.ry; y += 3) if (onMat(x, y)) expect(inBasket(x, y, tipped), `${x}, ${y}`).toBe(false)
    // And it answers on the whole of itself.
    const middle = tipped ? { x: LYING.x, y: LYING.y } : { x: BASKET.x, y: BASKET.y - 50 }
    for (const [dx, dy] of [[0, 0], [-80, 0], [80, 0], [0, -40], [0, 40]]) expect(inBasket(middle.x + dx, middle.y + dy, tipped)).toBe(true)
  })
})

describe('into the basket and out of it', () => {
  /** The drawn foot, lift and depth of a thing at every frame for a while. */
  function follow(world: World, id: PieceId, seconds: number): { x: number; y: number; far: number }[] {
    const p = world.piece(id), seen: { x: number; y: number; far: number }[] = []
    for (let t = 0; t < seconds; t += 1 / 60) { world.step(1 / 60); seen.push({ x: p.px, y: p.py - p.lift - p.hop, far: p.far }) }
    return seen
  }

  it('shows a thing tapped into the basket all the way in: over the rim in front of it, and then sinking behind it', () => {
    for (const tipped of [false, true]) {
      const world = mat({ 'doll-tall': { x: 600, y: 560 }, 'arch-small': { x: 420, y: 600 } }, tipped ? 'tipped' : 'upright')
      for (const id of ['doll-tall', 'arch-small'] as const) {
        take(world, id)
        tapBasket(world)
        const seen = follow(world, id, 1.2), landed = seen.findIndex((each) => each.far >= 1), over = overRim(tipped)
        // Until it lands it is in front of the basket, whole: never inside, and it gets there in steps a child can follow.
        expect(landed, id).toBeGreaterThan(8)
        for (let i = 1; i < landed; i++) expect(seen[i].far).toBeGreaterThanOrEqual(seen[i - 1].far)
        expect(Math.hypot(seen[landed - 1].x - over.x, seen[landed - 1].y - over.y), id).toBeLessThan(30)
        // Its size does not jump as it goes in.
        expect(sizeIn(seen[landed - 1].far, world.tip) - sizeIn(1, world.tip)).toBeLessThan(0.02)
        // From there it sinks to its place, a little each frame.
        for (let i = landed + 1; i < seen.length; i++) expect(Math.hypot(seen[i].x - seen[i - 1].x, seen[i].y - seen[i - 1].y), `${id}, frame ${i}`).toBeLessThan(60)
        const rest = basketRests(world.pieces, tipped).get(world.piece(id))!
        expect(Math.hypot(seen[seen.length - 1].x - rest.x, seen[seen.length - 1].y - rest.y), id).toBeLessThan(1)
      }
    }
  })

  it('lets each thing rise out of the mouth in its turn on a tap, and nothing snaps', () => {
    const world = mat({})
    for (const id of ['doll-tall', 'doll-small', 'silk'] as const) { take(world, id); tapBasket(world); run(world, 1.5) }
    for (const id of ['doll-small', 'silk', 'doll-tall'] as const) {
      const p = world.piece(id), from = { x: p.px, y: p.py }
      tapBasket(world)
      // One thing answers each tap, and the others stay in.
      expect(world.pieces.filter((each) => each.flight).map((each) => each.def.id)).toEqual([id])
      const seen = follow(world, id, 1)
      expect(Math.hypot(seen[0].x - from.x, seen[0].y - from.y), id).toBeLessThan(70)
      for (let i = 1; i < seen.length; i++) {
        expect(Math.hypot(seen[i].x - seen[i - 1].x, seen[i].y - seen[i - 1].y), `${id}, frame ${i}`).toBeLessThan(90)
        // It grows back to its size on the way: its depth never jumps.
        expect(Math.abs(seen[i].far - seen[i - 1].far), `${id}, frame ${i}`).toBeLessThan(0.3)
      }
      // While it is still inside it rises to the rim, and leaves the basket only from over it.
      const out = seen.findIndex((each) => each.far < 1)
      expect(out, id).toBeGreaterThan(3)
      expect(seen[out - 1].y, id).toBeLessThanOrEqual(RIM_Y)
      expect([p.px, p.py, p.far], id).toEqual([p.def.home.x, p.def.home.y, 0])
    }
  })

  it('walks nothing into the basket through the air, and brings each thing out of the lying basket in its turn', () => {
    const world = mat({ 'doll-round': { x: 520, y: 600 }, 'doll-small': { x: 520, y: 600, on: 'doll-round' }, silk: { x: 520, y: 600, on: 'doll-small' }, horse: { x: 720, y: 600 } })
    tapBasket(world)
    expect(world.scene).not.toBeNull()
    run(world, 12)
    expect(world.pieces.filter((p) => p.at === 'basket').map((p) => p.def.id).sort()).toEqual(['doll-round', 'doll-small', 'horse', 'silk'])
    tap(world, LYING.x, LYING.y)
    const order: PieceId[] = [], steps: Record<string, number> = {}
    const was = new Map(world.pieces.map((p) => [p, { x: p.px, y: p.py - p.lift, far: p.far }]))
    for (let t = 0; t < 8 && world.scene; t += 1 / 60) {
      world.step(1 / 60)
      for (const p of world.pieces) {
        const before = was.get(p)!, now = { x: p.px, y: p.py - p.lift, far: p.far }
        // A thing shows when it is out of the basket, or reaches into its mouth.
        const edge = world.tip === 1 ? LYING.y + LYING.opening : RIM_Y, shown = (at: { y: number; far: number }): boolean => at.far < 1 || at.y - topOf(p.def.id) * sizeIn(1, world.tip) < edge
        if ((world.tip === 0 || world.tip === 1) && (shown(before) || shown(now))) steps[p.def.id] = Math.max(steps[p.def.id] ?? 0, Math.hypot(now.x - before.x, now.y - before.y))
        if (before.far >= 1 && now.far < 1) order.push(p.def.id)
        was.set(p, now)
      }
    }
    // The smallest first, one after the other.
    expect(order).toEqual(['doll-small', 'silk', 'doll-round', 'horse'])
    // Nothing jumps from one frame to the next while the basket can be seen into.
    for (const [id, step] of Object.entries(steps)) expect(step, id).toBeLessThan(90)
    expect(world.pieces.every((p) => p.at === 'home' && p.far === 0)).toBe(true)
  })

  it('takes out the one whose face over the rim is tapped, and anywhere else on the basket the smallest first', () => {
    const filled = (): World => new World({ ...homePlaces(), ...Object.fromEntries((['arch-small', 'doll-small', 'doll-round', 'doll-tall', 'horse'] as const).map((id) => [id, { at: 'basket', x: 0, y: 0, on: null, turned: false }])) })
    const inside = (world: World): PieceId[] => PIECE_IDS.filter((id) => world.places()[id].at === 'basket')
    // A tap on each face takes that one, though the small arch is the smallest thing in the basket.
    for (const id of ['doll-tall', 'doll-round', 'doll-small'] as const) {
      const world = filled(), slot = lookingOut(inside(world))[id]!, head = lookoutHead(id, slot, false)
      tap(world, head.x, head.y)
      expect(inside(world), id).toEqual(inside(filled()).filter((each) => each !== id))
      expect(world.takeSounds().map((sound) => `${sound.name}:${sound.piece}`)).toEqual([`pop:${id}`])
    }
    // On the tip of a hat too.
    const hat = filled(), foot = lookoutFoot('doll-tall', 'middle', false)
    tap(hat, foot.x + 8, foot.y - (topOf('doll-tall') - 10) * UPRIGHT_SIZE)
    expect(hat.places()['doll-tall'].at).toBe('home')
    // On the wicker, the handle side or between two heads: the sheet's order, the smallest first.
    const world = filled(), order: PieceId[] = []
    for (let i = 0; i < 5; i++) {
      const before = inside(world)
      tap(world, BASKET.x, BASKET.y - 40)
      order.push(...before.filter((id) => !inside(world).includes(id)))
      run(world, 1)
    }
    expect(order).toEqual(['arch-small', 'doll-small', 'doll-round', 'doll-tall', 'horse'])
    // The horse takes the middle once the tall doll is out, and a tap on its face takes it.
    const stable = new World({ ...homePlaces(), 'arch-large': { at: 'basket', x: 0, y: 0, on: null, turned: false }, horse: { at: 'basket', x: 0, y: 0, on: null, turned: false } })
    const nose = lookoutHead('horse', 'middle', false)
    tap(stable, nose.x, nose.y)
    expect(inside(stable)).toEqual(['arch-large'])
  })

  it('never hides a thing that is flying in when the basket is tapped: it turns back from where it is, whole', () => {
    const world = mat({})
    take(world, 'doll-small')
    tapBasket(world)
    run(world, 0.1)
    const doll = world.piece('doll-small')
    const far = doll.far
    expect(far).toBeLessThan(0.5)
    tapBasket(world)
    expect(world.places()['doll-small'].at).toBe('home')
    // It is never inside, out of sight: from the tap on it only comes nearer.
    let last = far
    for (let i = 0; i < 90; i++) { world.step(1 / 60); expect(doll.far, `frame ${i}`).toBeLessThanOrEqual(last); last = doll.far }
    expect(doll.far).toBe(0)
    expect([doll.px, doll.py, doll.flight]).toEqual([doll.def.home.x, doll.def.home.y, null])
  })
})
