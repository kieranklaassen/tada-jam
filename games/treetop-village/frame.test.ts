import { describe, expect, it } from 'vitest'
import { compose, drawCount, lookAt, piecePose, type Item } from './frame'
import { STILL, type On, type PiecePose } from './motion'
import { freshSaved, type Saved } from './save'
import type { Script } from './scripts'
import { CUP, LINE_UP } from './shape'
import { BASKET, BODY, CORNER, FOLK, HILL_Y, HOME_CONTROL, KIND_COUNT, LANDINGS, PLACES, PLACE_COUNT, SUN, TAB_LOW, basketSlot, mid, onOak, standAt, type Folk, type Pt } from './tree'
import { STAGE } from './stage'
import { JUMP_SECONDS, bucketAt, feet, makeVillage, move, press, release, standOf, step, tabAt, type Stand, type Village } from './village'
import { makeOn } from './motion'
import { everyMeeting, meeting } from './scripts'
import { makeRng } from './rng'
import { KINDS, type Kind } from './ways'

// What the frame draws from the rules. Two things are held here. Every number
// a script can set is read by the picture, so nothing is posed that is not
// drawn. And nothing is drawn through anything, in every state a child can
// reach: a walker on a piece is on that piece, between its ends; what sinks
// into a trough or a bucket is cut off at its wall; a bucket's cup is drawn
// over its own rider and over nobody else; the sun goes behind the hill and
// not through it; and what the child carries is over everything.

const withPieces = (pieces: Record<number, Kind>, night = false): Saved => {
  const saved = freshSaved(8)
  for (const [place, kind] of Object.entries(pieces)) saved.places[Number(place)] = kind
  saved.night = night
  return saved
}
const walker = (v: Village, folk: Folk) => v.walkers.find((one) => one.folk === folk)!
const picture = (v: Village): string => JSON.stringify(compose(v, null))
/** A script of one long beat that holds one thing as it is given. */
const holding = (act: (on: On) => void): Script => ({ beats: [{ at: 0, lasts: 10, from: 0.5, to: 0.5, act: (_u, on) => act(on), sound: [] }], seconds: 10 })
const nothing = holding(() => {})

describe('every number a script sets is drawn', () => {
  it('draws each part of a walker\'s pose', () => {
    const fields: [Folk, (on: On) => void, string][] = [
      ['owl', (on) => { on.pose.dx = 9 }, 'dx'],
      ['owl', (on) => { on.pose.dy = -9 }, 'dy'],
      ['owl', (on) => { on.pose.tilt = 0.3 }, 'tilt'],
      ['owl', (on) => { on.pose.squash = 0.8 }, 'squash'],
      ['owl', (on) => { on.pose.spin = 1 }, 'spin'],
      ['owl', (on) => { on.pose.yaw = 1 }, 'yaw'],
      ['owl', (on) => { on.pose.part = 1 }, 'part'],
      ['squirrel', (on) => { on.pose.part = 1 }, 'the tail'],
      ['beetle', (on) => { on.pose.part = 1 }, 'the hat'],
      ['mice', (on) => { on.pose.part = 1 }, 'the twins\' tug'],
      ['owl', (on) => { on.pose.puff = 1.5 }, 'puff'],
      ['owl', (on) => { on.pose.lid = 1 }, 'both lids'],
      ['owl', (on) => { on.pose.lid = 0.5 }, 'the near lid'],
      ['owl', (on) => { on.pose.lid = -0.5 }, 'the far lid'],
      ['squirrel', (on) => { on.pose.prop = 1 }, 'the letter'],
      ['mice', (on) => { on.pose.pair = 12 }, 'pair'],
      ['mice', (on) => { on.pose.stack = -12 }, 'stack'],
      ['mice', (on) => { on.pose.flip = 0.5 }, 'flip'],
    ]
    for (const [folk, act, name] of fields) {
      const v = makeVillage(withPieces({}))
      walker(v, folk).show = { what: 'flourish', script: nothing, t: 1 }
      const plain = picture(v)
      walker(v, folk).show = { what: 'flourish', script: holding(act), t: 1 }
      expect(picture(v) === plain, `${name} of ${folk}`).toBe(false)
    }
    // The three ways of shutting an eye are three pictures.
    const lids = [1, 0.5, -0.5].map((lid) => { const v = makeVillage(withPieces({})); walker(v, 'owl').show = { what: 'flourish', script: holding((on) => { on.pose.lid = lid }), t: 1 }; return picture(v) })
    expect(new Set(lids).size).toBe(3)
  })

  it('draws where a walker is on its piece: how far along, how far it hangs below, how far it has sunk in, and its seat', () => {
    const on = (kind: Kind, place: number, act: (on: On) => void): string => {
      const v = makeVillage(withPieces({ [place]: kind }))
      walker(v, 'owl').on = { what: 'meet', script: holding(act), t: 1, place, forward: true, meeting: 'stay', id: 'meet' }
      return picture(v)
    }
    for (const [kind, place] of [['bridge', 8], ['swing', 8], ['slide', 8], ['ladder', 4], ['swing', 4]] as const) {
      const plain = on(kind, place, () => {})
      const fields: [string, (on: On) => void][] = [
        ['along', (o) => { o.along = 0.7 }], ['hang', (o) => { o.hang = 20 }], ['sink', (o) => { o.sink = 20 }],
        ['sway', (o) => { o.piece.sway = 0.4 }], ['bounce', (o) => { o.piece.bounce = 0.5 }], ['rattle', (o) => { o.piece.rattle = 0.1 }],
      ]
      if (kind === 'swing') fields.push(['seat', (o) => { o.seat = true }], ['swing', (o) => { o.piece.swing = 0.4 }], ['sag', (o) => { o.piece.sag = 6 }])
      for (const [name, act] of fields) expect(on(kind, place, act) === plain, `${name} on a ${kind} in place ${place}`).toBe(false)
    }
    // A bucket's cup swings and sags under whoever is in it.
    const cup = (act: (on: On) => void): string => {
      const v = makeVillage(withPieces({ 5: 'bucket' }))
      const owl = walker(v, 'owl')
      owl.at = 4
      owl.on = { what: 'board', script: holding(act), t: 1, place: 5, forward: true, meeting: 'carry', id: 'board' }
      return picture(v)
    }
    const empty = cup((o) => { o.seat = true })
    expect(cup((o) => { o.seat = true; o.piece.swing = 0.3 }) === empty).toBe(false)
    expect(cup((o) => { o.seat = true; o.piece.sag = 8 }) === empty).toBe(false)
    expect(cup((o) => { o.seat = true; o.sink = 20 }) === empty).toBe(false)
  })

  it('draws each kind of piece answering a tap in its own way, and stops when the answer is over', () => {
    const answers = KINDS.map((kind) => {
      const v = makeVillage(withPieces({ 8: kind }))
      const pose: PiecePose = { ...STILL }
      v.tap[8] = 0.21
      const glow = piecePose(v, 8, kind, pose)
      const answer = JSON.stringify([pose, glow])
      v.tap[8] = 99
      expect(JSON.stringify([piecePose(v, 8, kind, pose), pose])).toBe(JSON.stringify([0, STILL]))
      return answer
    })
    expect(new Set(answers).size).toBe(KINDS.length)
    expect(answers.every((answer) => answer !== JSON.stringify([STILL, 0]))).toBe(true)
  })

  it('turns each walker\'s eyes to what it wants: the piece in the child\'s hand first, then where it is going, then its own want', () => {
    const v = makeVillage(withPieces({ 5: 'bucket', 9: 'swing' }))
    const want = Object.fromEntries(FOLK.map((folk) => [folk, lookAt(v, walker(v, folk), feet(v, walker(v, folk)))])) as Record<Folk, Pt>
    // The owl looks at the bucket, the twins at what hangs nearest, the beetle up at the next landing.
    expect(want.owl).toEqual({ x: bucketAt(v, 5).x, y: bucketAt(v, 5).y + (CUP.rim + CUP.bottom) / 2 })
    expect(want.beetle.y).toBeLessThan(feet(v, walker(v, 'beetle')).y - 150)
    expect(want.mice.y).toBeLessThan(feet(v, walker(v, 'mice')).y)
    // The squirrel looks from his letter to the tree and back.
    const looks = new Set<string>()
    for (let i = 0; i < 300; i++) { step(v, 1 / 60); looks.add(JSON.stringify(lookAt(v, walker(v, 'squirrel'), feet(v, walker(v, 'squirrel'))))) }
    expect(looks.size).toBe(2)
    // With no bucket the owl looks at the basket.
    const bare = makeVillage(withPieces({}))
    expect(lookAt(bare, walker(bare, 'owl'), feet(bare, walker(bare, 'owl'))).y).toBeGreaterThan(BASKET.y0)
    press(v, basketSlot(0))
    move(v, { x: 300, y: 300 })
    for (const folk of FOLK) expect(lookAt(v, walker(v, folk), feet(v, walker(v, folk)))).toEqual({ x: 300, y: 300 })
  })
})

describe('nothing is drawn through anything', () => {
  const stand = (): Stand => ({ x: 0, y: 0, floor: null, lean: 0 })

  it('keeps a walker on its piece, between its two ends, through every moment of every meeting', () => {
    const wrong: string[] = []
    for (const cell of everyMeeting()) {
      for (const place of PLACES.map((_, index) => index).filter((index) => PLACES[index].fit === cell.fit)) {
        const v = makeVillage(withPieces({ [place]: cell.kind }))
        const one = walker(v, cell.folk)
        const script = meeting(cell.folk, cell.kind, cell.fit, cell.up, place)
        one.on = { what: 'meet', script, t: 0, place, forward: cell.up, meeting: 'stay', id: 'meet' }
        const { pa, pb } = PLACES[place]
        const x0 = Math.min(pa.x, pb.x), x1 = Math.max(pa.x, pb.x), y0 = Math.min(pa.y, pb.y), y1 = Math.max(pa.y, pb.y)
        for (let i = 0; i <= 80; i++) {
          one.on.t = (script.seconds * i) / 80
          const here = standOf(v, one, makeOn(), stand())
          // Sideways it stays between the pegs, give or take a swing; up and down it is never above the top of the piece nor far below its lowest point.
          if (here.x < x0 - 64 || here.x > x1 + 64 || here.y < y0 - LINE_UP - 4 || here.y > y1 + 70) wrong.push(`${cell.folk} at a ${cell.kind} in place ${place} at ${one.on.t.toFixed(2)} s: ${here.x.toFixed(0)}, ${here.y.toFixed(0)}`)
        }
        // It ends at one of the two pegs, standing on a landing.
        one.on.t = script.seconds
        const end = standOf(v, one, makeOn(), stand())
        if (![pa, pb].some((peg) => Math.abs(peg.x - end.x) < 1 && Math.abs(peg.y - end.y) < 1)) wrong.push(`${cell.folk} at a ${cell.kind} in place ${place} ends at ${end.x.toFixed(0)}, ${end.y.toFixed(0)}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('cuts off what sinks into a trough or a bucket at its wall, and cuts nothing else', () => {
    const v = makeVillage(withPieces({ 8: 'slide', 5: 'bucket' }))
    const beetle = walker(v, 'beetle')
    beetle.on = { what: 'meet', script: holding((on) => { on.sink = 58 }), t: 1, place: 8, forward: true, meeting: 'across', id: 'meet' }
    const cut = compose(v, null).filter((item) => (item.t === 'sprite' || item.t === 'eyes') && item.floor !== undefined && !(item.t === 'sprite' && (item.id === 'sun' || item.id === 'moon')))
    // His card, his eyes and his hat: all three are cut at the trough's rim, which is above his feet.
    expect(cut).toHaveLength(3)
    for (const item of cut) expect((item as { floor: number }).floor).toBeLessThan(PLACES[8].pa.y)
    beetle.on = null
    expect(compose(v, null).filter((item) => (item.t === 'sprite' || item.t === 'eyes') && item.floor !== undefined)).toHaveLength(1)
  })

  it('draws a walker on its landing at every frame when the bucket is sent while it is getting in, and the cup running empty', () => {
    const cases: [Folk, number, 0 | 1][] = [['beetle', 1, 0], ['mice', 3, 0], ['owl', 5, 1]]
    for (const [folk, place, end] of cases) for (const touch of ['cup', 'walker'] as const) for (const part of [0.15, 0.5, 0.9]) {
      const saved = withPieces({ [place]: 'bucket' })
      saved.lifts[place] = end
      saved.newest = place
      const v = makeVillage(saved)
      const one = walker(v, folk), home = one.at, spot = standAt(folk, home)
      const peg = PLACES[place].from === home ? PLACES[place].pa : PLACES[place].pb
      // Tapped at its door it goes to the bucket and starts to get in.
      const body = feet(v, one)
      press(v, { x: body.x, y: body.y - 40 }); release(v, { x: body.x, y: body.y - 40 })
      for (let frame = 0; frame < 1800 && !(one.on?.what === 'board' && one.on.t >= one.on.script.seconds * part); frame++) step(v, 1 / 60)
      expect(one.on?.what, `${folk} gets in`).toBe('board')
      // The child sends the bucket before it is in: by the cup, or by the walker itself.
      const at = touch === 'cup' ? bucketAt(v, place) : (() => { const here = standOf(v, one, makeOn(), stand()); return { x: here.x, y: here.y - 30 } })()
      press(v, at); release(v, at)
      expect(v.lifts[place], `${folk} ${touch}: the bucket is sent`).toBe(end === 0 ? 1 : 0)
      for (let frame = 0; frame < 60 * 12; frame++) {
        const label = `${folk} ${touch} ${part} frame ${frame}`
        // The walker is on its landing, between the peg and its own spot, with nothing of it cut off: it does not go with the cup.
        const here = standOf(v, one, makeOn(), stand())
        expect(Math.abs(here.y - spot.y), label).toBeLessThan(1)
        expect(here.x, label).toBeGreaterThanOrEqual(Math.min(peg.x, spot.x) - 1)
        expect(here.x, label).toBeLessThanOrEqual(Math.max(peg.x, spot.x) + 1)
        expect(here.floor, label).toBeNull()
        expect(one.riding, label).toBe(-1)
        expect(one.seated, label).toBe(false)
        // The cup is one card with nobody in it: no ropes behind a rider, no tub in front of one.
        const ids = compose(v, null).map((item) => (item.t === 'sprite' ? item.id : item.t))
        expect(ids.filter((id) => id.startsWith('cup-rope') || id.startsWith('cup-tub')), label).toEqual([])
        expect(ids.filter((id) => id.startsWith('cup')), label).toHaveLength(1)
        step(v, 1 / 60)
      }
      // It ends waiting on its own spot for the bucket to come back.
      expect(one).toMatchObject({ at: home, waiting: place, seated: false, walk: null, on: null, show: null })
      expect(one.x).toBeCloseTo(spot.x)
    }
  })

  it('draws a bucket\'s cup over its own rider and behind everyone else', () => {
    const saved = withPieces({ 5: 'bucket', 3: 'bucket' })
    saved.lifts[5] = 1
    saved.folk.owl = { at: 8, errand: 5 }
    const v = makeVillage(saved)
    expect(walker(v, 'owl').seated).toBe(true)
    const list = compose(v, null) as (Item & { id?: string })[]
    const ids = list.map((item) => (item.t === 'sprite' ? item.id : item.t))
    const owlBody = ids.indexOf('owl'), owlHead = ids.indexOf('owl-head'), firstWalker = Math.min(...['squirrel', 'owl', 'mouse-a', 'beetle'].map((id) => ids.indexOf(id)))
    // The empty cup is one card behind every walker. The owl's is two: its ropes are the card before her and its tub the next card after her.
    expect(ids.filter((id) => id === 'cup')).toHaveLength(1)
    expect(ids.indexOf('cup')).toBeLessThan(firstWalker)
    expect(ids.indexOf('cup-rope')).toBe(owlBody - 1)
    expect(ids.slice(owlHead + 1, ids.indexOf('cup-tub') + 1)).toEqual(['eyes', 'cup-tub'])
    expect(ids.filter((id) => id === 'cup-rope' || id === 'cup-tub')).toHaveLength(2)
    // She is in the cup: her feet are inside its width and below its rim, and what is below its bottom is cut off.
    const here = standOf(v, walker(v, 'owl'), makeOn(), stand()), cup = bucketAt(v, 5)
    expect(Math.abs(here.x - cup.x)).toBeLessThan(CUP.top / 2)
    expect(here.y).toBeGreaterThan(cup.y + CUP.rim)
    expect(here.floor).not.toBeNull()
    expect(here.floor!).toBeLessThan(here.y)
  })

  it('keeps a running bucket between its two pegs and its rider in it all the way', () => {
    const saved = withPieces({ 11: 'bucket' })
    saved.folk.beetle = { at: 4, errand: 11 }
    const v = makeVillage(saved)
    expect(walker(v, 'beetle').seated).toBe(true)
    const here = feet(v, walker(v, 'beetle'))
    press(v, { x: here.x, y: here.y - 40 })
    release(v, { x: here.x, y: here.y - 40 })
    const { pa, pb } = PLACES[11]
    for (let i = 0; i < 200 && walker(v, 'beetle').riding === 11; i++) {
      step(v, 1 / 60)
      const cup = bucketAt(v, 11), rider = standOf(v, walker(v, 'beetle'), makeOn(), stand())
      expect(cup.x).toBeGreaterThanOrEqual(pa.x - 0.01)
      expect(cup.x).toBeLessThanOrEqual(pb.x + 0.01)
      if (walker(v, 'beetle').riding === 11) expect(Math.abs(rider.x - cup.x)).toBeLessThan(CUP.top / 2)
    }
    expect(walker(v, 'beetle').at).toBe(6)
  })

  it('never has two walkers on one piece, nor a walker on a piece that is not there, through a long stretch of anything a hand might do', () => {
    const v = makeVillage(freshSaved(null))
    const rng = makeRng(11)
    const over = (place: number): Pt => { const at = mid(PLACES[place]); return { x: at.x, y: at.y + 34 } }
    for (let i = 0; i < 700; i++) {
      const what = rng.next()
      if (what < 0.45) { press(v, basketSlot(Math.floor(rng.next() * 7))); move(v, over(Math.floor(rng.next() * PLACE_COUNT))); release(v, over(Math.floor(rng.next() * PLACE_COUNT))) }
      else if (what < 0.65) { const at = mid(PLACES[Math.floor(rng.next() * PLACE_COUNT)]); press(v, at); if (rng.next() < 0.5) move(v, { x: rng.next() * 1180, y: rng.next() * 820 }); release(v, at) }
      else { const here = feet(v, v.walkers[Math.floor(rng.next() * 4)]); press(v, { x: here.x, y: here.y - 40 }); release(v, { x: here.x, y: here.y - 40 }) }
      for (let frame = 0; frame < 40; frame++) {
        step(v, 1 / 60)
        for (let place = 0; place < PLACE_COUNT; place++) {
          const on = v.walkers.filter((one) => one.on?.place === place || one.riding === place || (one.seated && one.waiting === place))
          expect(on.length, `place ${place}`).toBeLessThanOrEqual(1)
          // Whoever is on a piece is on a piece that is in the tree and not in the hand.
          if (on.length > 0) { expect(v.places[place]).not.toBeNull(); expect(v.held?.from === place).toBe(false) }
        }
        // And everyone is somewhere on the stage, on or above the meadow.
        for (const one of v.walkers) {
          const here = feet(v, one)
          expect(here.x).toBeGreaterThan(20)
          expect(here.x).toBeLessThan(STAGE.width - 20)
          expect(here.y).toBeLessThanOrEqual(LANDINGS[0].y + 70)
          expect(here.y).toBeGreaterThan(150)
        }
      }
      v.cues.length = 0
    }
  }, 120_000)

  it('stands every walker at rest on its own landing, and no walker\'s face behind another\'s card', () => {
    const PARTS_Y: Record<Folk, number> = { squirrel: 78, owl: 68, mice: 41, beetle: 66 }
    LANDINGS.forEach((pad, landing) => {
      for (const folk of FOLK) {
        const spot = standAt(folk, landing)
        expect(spot.y).toBe(pad.y)
        expect(spot.x).toBeGreaterThanOrEqual(pad.x0)
        expect(spot.x).toBeLessThanOrEqual(pad.x1)
      }
      // Two who share a landing stand one in front of the other like cards in a book. The one behind still shows its eyes.
      for (const behind of FOLK) for (const front of FOLK) {
        if (behind === front || FOLK.indexOf(behind) > FOLK.indexOf(front)) continue
        const a = standAt(behind, landing), b = standAt(front, landing)
        const eyesY = a.y - PARTS_Y[behind], covered = Math.abs(a.x - b.x) < BODY[front].w / 2 - 8 && eyesY > b.y - BODY[front].h + 12
        expect(covered, `${behind} behind ${front} on landing ${landing}`).toBe(false)
      }
    })
  })

  it('sends the sun behind the hill and not through it, and keeps the tab clear of every landing, peg and door', () => {
    const v = makeVillage(withPieces({}))
    const tab = compose(v, null).find((item) => item.t === 'sprite' && item.id === 'sun') as { floor?: number }
    expect(tab.floor).toBe(HILL_Y)
    // At its lowest the whole sun is below the hill's top.
    expect(TAB_LOW - 66).toBeGreaterThanOrEqual(HILL_Y)
    expect(tabAt(v)).toEqual(SUN)
    for (const place of PLACES) for (const peg of [place.pa, place.pb]) expect(Math.abs(peg.x - SUN.x) > 60 || peg.y > HILL_Y - 1).toBe(true)
    // A finger on the oak is not a finger on the tab, and the other way round.
    for (let y = SUN.y; y <= HILL_Y; y += 20) expect(onOak({ x: SUN.x, y })).toBe(false)
  })

  it('lays the basket\'s seven pieces each in its own slot, and nothing that answers a touch under the home control or in the grown-up corner', () => {
    const slot = (BASKET.x1 - BASKET.x0) / KIND_COUNT
    const v = makeVillage(withPieces({}))
    const icons = compose(v, null).filter((item) => item.t === 'sprite' && item.id.startsWith('icon:')) as { m: number[] }[]
    expect(icons).toHaveLength(KIND_COUNT)
    icons.forEach((icon, index) => {
      // An icon is drawn within 62 units of its middle, at the size the basket shows it.
      expect(icon.m[4]).toBeCloseTo(basketSlot(index).x)
      expect(62 * icon.m[0]).toBeLessThanOrEqual(slot / 2)
    })
    // A press under the home control or in the corner changes nothing in the tree and starts nothing but the oak's own quiver.
    for (const at of [{ x: HOME_CONTROL.x, y: HOME_CONTROL.y }, { x: STAGE.width - CORNER / 2, y: CORNER / 2 }]) {
      const fresh = makeVillage(withPieces({ 0: 'ladder' }))
      press(fresh, at)
      release(fresh, at)
      expect(fresh.held).toBeNull()
      expect(fresh.places.filter((kind) => kind !== null)).toEqual(['ladder'])
      expect(fresh.walkers.every((one) => one.show === null && one.walk === null)).toBe(true)
      expect(fresh.scene).toBeNull()
    }
  })

  it('draws what the child carries over everything else, and the ghost hand over that', () => {
    const v = makeVillage(withPieces({ 0: 'ladder' }))
    press(v, basketSlot(2))
    move(v, { x: 400, y: 400 })
    const list = compose(v, null) as { t: string; id?: string }[]
    expect(list[list.length - 1]).toMatchObject({ t: 'sprite', id: 'icon:bridge' })
  })

  it('draws what is heard inside the cards it already draws: the wheels turning, the bump along a tapped bridge, the wing cases open, the twins pointing, the jump at a second tap', () => {
    const idsOf = (v: Village): string[] => compose(v, null).filter((item) => item.t === 'sprite').map((item) => (item as { id: string }).id)
    // A bucket sent: its wheels are printed turned, through every sixth of a turn, while the cup runs, and as at rest when it has arrived.
    const sent = makeVillage(withPieces({ 5: 'bucket' }))
    const before = drawCount(compose(sent, null))
    press(sent, mid(PLACES[5]))
    release(sent, mid(PLACES[5]))
    const turns = new Set<string>()
    for (let i = 0; i < 60 * 4; i++) {
      step(sent, 1 / 60)
      const now = idsOf(sent).find((id) => id.startsWith('piece:bucket:5'))!
      turns.add(now)
      expect(drawCount(compose(sent, null))).toBeLessThanOrEqual(before)
    }
    expect([...turns].sort()).toEqual(['piece:bucket:5', 'piece:bucket:5:t1', 'piece:bucket:5:t2', 'piece:bucket:5:t3', 'piece:bucket:5:t4', 'piece:bucket:5:t5'])
    expect(idsOf(sent)).toContain('piece:bucket:5')
    // A rope bridge tapped: one bump, printed further along at each step, from one end to the other, and then the bridge as it hangs.
    const tapped = makeVillage(withPieces({ 8: 'bridge' }))
    press(tapped, mid(PLACES[8]))
    release(tapped, mid(PLACES[8]))
    const bumps: string[] = []
    for (let i = 0; i < 60 * 1.2; i++) {
      const now = idsOf(tapped).find((id) => id.startsWith('piece:bridge:8'))!
      if (bumps[bumps.length - 1] !== now) bumps.push(now)
      step(tapped, 1 / 60)
    }
    expect(bumps).toEqual(['piece:bridge:8:r0', 'piece:bridge:8:r1', 'piece:bridge:8:r2', 'piece:bridge:8:r3', 'piece:bridge:8:r4', 'piece:bridge:8'])
    // The beetle's wing cases and the twins' pointing are printings of their own cards, shown during their flourish and not after.
    for (const [folk, card] of [['beetle', 'beetle-open'], ['mice', 'mouse-a-point'], ['mice', 'mouse-b-point']] as const) {
      const v = makeVillage(withPieces({}))
      expect(idsOf(v)).not.toContain(card)
      const here = feet(v, walker(v, folk))
      press(v, { x: here.x, y: here.y - 40 })
      release(v, { x: here.x, y: here.y - 40 })
      const count = drawCount(compose(v, null))
      let seen = false
      for (let i = 0; i < 60 * 1.6; i++) { step(v, 1 / 60); seen = seen || idsOf(v).includes(card); expect(drawCount(compose(v, null))).toBeLessThanOrEqual(count) }
      expect(seen, card).toBe(true)
      for (let i = 0; i < 60 * 6; i++) step(v, 1 / 60)
      expect(idsOf(v)).not.toContain(card)
    }
    // A second tap in the middle of a flourish lifts the card.
    const v = makeVillage(withPieces({}))
    walker(v, 'owl').show = { what: 'flourish', script: holding(() => {}), t: 1 }
    const plain = picture(v)
    walker(v, 'owl').jump = JUMP_SECONDS / 2
    expect(picture(v) === plain).toBe(false)
  })

  it('leaves an empty cup still: nothing of the child\'s moves unless the child or a walker moves it', () => {
    const v = makeVillage(withPieces({ 5: 'bucket', 8: 'swing', 3: 'lanterns' }))
    const pieces = (): string => JSON.stringify(compose(v, null).filter((item) => item.t === 'sprite' && /^(cup|piece|seat)/.test((item as { id: string }).id)))
    const first = pieces()
    for (let i = 0; i < 300; i++) step(v, 1 / 60)
    expect(pieces()).toBe(first)
  })
})
