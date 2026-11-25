import { describe, expect, it } from 'vitest'
import { BODY, FILE_FOOT, FILE_HEAD, SMALLEST_TARGET, boxOf, camperAt, campers, faceOf, fileEnd, onBell, partyBalls, partyFile } from './camp'
import { LADDER } from './config'
import { PARTY, ROUND, partyAt, type Party } from './order'
import { STAGE } from './stage'
import { FRAME, GRASS_Y, MOUTH_X } from './view/layout'
import { BELL, LIP, STALK, hillShape } from './view/props'

// Everything here is in stage units, and the stage is fitted whole into any surface, so what holds here holds at
// every size of surface.

/** Every party the order lays out: one for each place before the kingdom is open, and the round of six after it. */
const LAID_OUT: { place: string; party: Party }[] = [
  ...LADDER.filter((place) => place !== 'open-kingdom').map((place) => ({ place: place as string, party: partyAt(place, 0) })),
  ...ROUND.map((party, n) => ({ place: `open-kingdom ${n}`, party })),
]
const PARTIES = LAID_OUT.map(({ place, party }) => ({ place, list: campers(party) }))
/** How near a circle comes to a box: 0 or less when they touch. */
const gap = (c: { x: number; y: number }, r: number, b: { left: number; right: number; top: number; bottom: number }) =>
  Math.hypot(Math.max(b.left - c.x, 0, c.x - b.right), Math.max(b.top - c.y, 0, c.y - b.bottom)) - r

describe('the camp', () => {
  it('keeps the bell clear of every camper, whoever waits at the log', () => {
    for (const { place, list } of PARTIES) for (const camper of list) {
      expect(gap(BELL, BELL.reach, boxOf(camper)), `${place} ${camper.id}`).toBeGreaterThan(8)
    }
  })

  it('keeps the bell clear of the hill at its largest, of its own stalk foot and of the frame', () => {
    const hill = hillShape(1)
    expect(GRASS_Y - hill.right.height).toBeGreaterThan(BELL.y + BELL.reach + 8)
    expect(STALK.footX - BELL.x).toBeGreaterThan(BELL.reach)
    expect(BELL.y - BELL.reach).toBeGreaterThan(FRAME)
    expect(STALK.tipY).toBeGreaterThan(FRAME)
  })

  it('lets no camper cover another one face', () => {
    for (const { place, list } of PARTIES) {
      list.forEach((owner, n) => {
        const face = faceOf(owner)
        if (!face) return
        list.forEach((other, m) => {
          if (m === n) return
          // A face is covered when another body, drawn later, lies over its middle.
          const box = boxOf(other)
          const over = face.x > box.left && face.x < box.right && face.y > box.top && face.y < box.bottom
          expect(over && m > n, `${place}: ${other.id} over the face of ${owner.id}`).toBe(false)
        })
      })
    }
  })

  it('stands no two campers in each other, the party at the log included, whatever its size; only the polisher leans on its ball', () => {
    for (const { place, list } of PARTIES) for (let n = 0; n < list.length; n++) for (let m = n + 1; m < list.length; m++) {
      const a = boxOf(list[n]), b = boxOf(list[m])
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left), overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      const pair = [list[n].id, list[m].id].sort().join('+')
      if (pair === 'ball+polisher') continue
      expect(overlapX > 6 && overlapY > 6, `${place}: ${pair}`).toBe(false)
    }
  })

  it('keeps everyone inside the frame, off the mouth and the hill, and out of the grown-up corner', () => {
    const hill = hillShape(1)
    for (const { place, list } of PARTIES) for (const camper of list) {
      const box = boxOf(camper), name = `${place} ${camper.id}`
      expect(box.left, name).toBeGreaterThanOrEqual(FRAME)
      expect(box.right, name).toBeLessThanOrEqual(STAGE.width - FRAME)
      expect(box.top, name).toBeGreaterThanOrEqual(FRAME)
      expect(box.right <= MOUTH_X - LIP - hill.left.reach + 6 || box.left >= MOUTH_X + LIP + hill.right.reach, name).toBe(true)
      expect(box.right > STAGE.width - 72 && box.top < 72, name).toBe(false)
    }
  })

  it('stands the whole of the next party at the log, one camper a member in marching order, between the frame and the mouth', () => {
    expect(LAID_OUT.length).toBe(Object.keys(PARTY).length + ROUND.length)
    for (const { place, party } of LAID_OUT) {
      const file = partyFile(party)
      expect(file.length, place).toBe(party.length)
      file.forEach((camper, n) => expect(camper.id, place).toBe(`party${n}`))
      // The one furthest right stands at the head, by the mouth, and nobody is left of the foot.
      expect(Math.max(...file.map((camper) => boxOf(camper).right)), place).toBeCloseTo(FILE_HEAD, 6)
      expect(fileEnd([...file, ...partyBalls(party)]), place).toBeGreaterThanOrEqual(FILE_FOOT - 1e-6)
      // Every dung beetle has its ball under it, and nobody else has one.
      expect(partyBalls(party).length, place).toBe(party.filter((kind) => kind === 'dungBeetle').length)
      // Nobody stands at less than seven tenths of its size.
      for (const camper of file) expect(camper.size ?? 1, place).toBeGreaterThanOrEqual(0.7)
    }
    expect(partyFile(['beetle'])[0].kind).toBe('beetle')
    expect(partyFile([])).toEqual([])
  })

  it('puts a raider ant on a beetle back while there are backs, a dung beetle on its ball, and a flier over somebody', () => {
    const [ant, beetle] = partyFile(['ant', 'beetle'])
    expect(ant.x).toBe(beetle.x)
    expect(boxOf(ant).bottom).toBeLessThan(boxOf(beetle).top + 6)
    const ants = partyFile(['ant', 'ant', 'ant'])
    for (const one of ants) expect(one.y).toBe(GRASS_Y)
    const [fly, under] = partyFile(['fly', 'ant'])
    expect(fly.x).toBe(under.x)
    expect(boxOf(fly).bottom).toBeLessThan(boxOf(under).top)
    const [dung] = partyFile(['dungBeetle']), [ball] = partyBalls(['dungBeetle'])
    expect(dung.x).toBe(ball.x)
    expect(boxOf(dung).bottom).toBeLessThan(boxOf(ball).top + 6)
    // A flier alone hangs low over the grass at the head of the log.
    expect(boxOf(partyFile(['fly'])[0]).right).toBeCloseTo(FILE_HEAD, 6)
  })

  it('is longer for a larger party, and the two campers on the left make room for it', () => {
    const one = campers(partyAt('first-beetle', 0)), full = campers(['beetle', 'beetle', 'beetle', 'dungBeetle'])
    expect(fileEnd(partyFile(partyAt('full-camp', 0)))).toBeLessThan(fileEnd(partyFile(partyAt('first-chamber', 0))) - 200)
    expect(one.map((c) => c.id)).toContain('fly')
    expect(one.map((c) => c.id)).toContain('stuck')
    // No fly and no ant is in this party, so both are at their spots unless the party reaches them.
    expect(full.map((c) => c.id)).not.toContain('fly')
  })

  it('gives no two of a kind the same phase', () => {
    for (const { list } of PARTIES) for (const a of list) for (const b of list) {
      if (a !== b && a.kind === b.kind) expect(a.phase).not.toBe(b.phase)
    }
  })
})

describe('a touch at the camp', () => {
  const list = campers(['ant'])

  it('lands on the camper under it, the one drawn last where two overlap', () => {
    const beetle = list.find((c) => c.id === 'beetle')!
    expect(camperAt(list, beetle.x, beetle.y - 20)?.id).toBe('beetle')
    const ball = list.find((c) => c.id === 'ball')!, polisher = list.find((c) => c.id === 'polisher')!
    expect(camperAt(list, ball.x + 20, ball.y - 40)?.id).toBe('ball')
    expect(camperAt(list, (boxOf(ball).left + boxOf(polisher).right) / 2, ball.y - 20)?.id).toBe('polisher')
    expect(camperAt(list, 700, GRASS_Y - 20)).toBeNull()
  })

  it('finds every camper by a target at least as large as the smallest a finger needs', () => {
    for (const camper of list) {
      expect(camperAt(list, camper.x, camper.y - BODY[camper.kind].height / 2 - SMALLEST_TARGET / 2 + 2)?.id, camper.id).toBeDefined()
      expect(Math.max(BODY[camper.kind].height, SMALLEST_TARGET)).toBeGreaterThanOrEqual(48)
    }
  })

  it('rings the bell within its reach and nowhere else, and the bell comes before any camper', () => {
    expect(onBell(BELL.x, BELL.y)).toBe(true)
    expect(onBell(BELL.x + BELL.reach - 1, BELL.y)).toBe(true)
    expect(onBell(BELL.x + BELL.reach + 1, BELL.y)).toBe(false)
    expect(camperAt(list, BELL.x, BELL.y)).toBeNull()
  })
})
