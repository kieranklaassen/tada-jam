import { describe, expect, it } from 'vitest'
import { FULL } from './config'
import { GNOMES, HOME_CONTROL, MOSS, SEATS, SNAIL, SUN, footFor, inWater, kindAt, mossBottom, mossTop, onGnome, skyline, under } from './ground'
import { PLACES } from './hint'
import { CORNER } from './overlay'
import { FIRST_MUSHROOM } from './save'
import { shapeOf } from './shapes'
import { STAGE } from './stage'

describe('the grounds', () => {
  it('gives a red mushroom in the sun, a bell on the bank of the stream and a puffball in the shade', () => {
    expect(kindAt(1010, 500)).toBe('red')
    expect(kindAt(520, 470)).toBe('red')
    expect(kindAt(640, 400)).toBe('bell')
    expect(kindAt(780, 548)).toBe('bell')
    expect(kindAt(290, 450)).toBe('puff')
    expect(kindAt(60, 480)).toBe('puff')
  })

  it('lets the bank win where the shade and the bank meet, so every point of the moss has one kind', () => {
    for (let x = MOSS.left; x <= MOSS.right; x += 23) for (let y = MOSS.top; y <= MOSS.bottom; y += 19) expect(['red', 'bell', 'puff']).toContain(kindAt(x, y))
  })

  it('grows nothing in the water: a finger there is on the stream', () => {
    expect(inWater(700, 330)).toBe(true)
    expect(footFor(700, 330)).toBeNull()
    expect(under(700, 330).what).toBe('water')
    expect(under(806, 742).what).toBe('water')
  })

  it('puts a foot for a finger on the moss inside the band, and none in the sky', () => {
    expect(footFor(500, 450)).toEqual({ x: 500, y: 450 })
    expect(footFor(500, 320)!.y).toBe(mossTop(500))
    expect(footFor(1000, 600)!.y).toBe(mossBottom(1000))
    expect(footFor(500, 100)).toBeNull()
  })

  it('shows the hand only places that lie in their own ground and where a foot can stand', () => {
    for (const kind of ['red', 'bell', 'puff'] as const) for (const place of PLACES[kind]) {
      expect(kindAt(place.x, place.y), `${kind} at ${place.x},${place.y}`).toBe(kind)
      expect(footFor(place.x, place.y)).toEqual(place)
    }
  })

  it('stands the first mushroom of a youngest visit in the sun, where a foot can stand', () => {
    expect(kindAt(FIRST_MUSHROOM.x, FIRST_MUSHROOM.y)).toBe('red')
    expect(footFor(FIRST_MUSHROOM.x, FIRST_MUSHROOM.y)).toEqual({ x: FIRST_MUSHROOM.x, y: FIRST_MUSHROOM.y })
  })
})

describe('what stands where', () => {
  it('keeps everything a child aims at out from under the home control at the top centre', () => {
    for (let x = HOME_CONTROL.x - 60; x <= HOME_CONTROL.x + 60; x += 10) for (let y = 0; y <= 80; y += 10) expect(under(x, y).what).toBe('leaves')
    expect(skyline(HOME_CONTROL.x)).toBeGreaterThan(200)
  })

  it('keeps the top right corner, the grown-up\'s, bare of everything but leaves and sky', () => {
    for (let x = STAGE.width - CORNER; x <= STAGE.width; x += 12) for (let y = 0; y <= CORNER; y += 12) expect(under(x, y).what).toBe('leaves')
    expect(SUN.x + SUN.r * 1.8).toBeLessThan(STAGE.width - CORNER)
  })

  it('lets no mushroom, however tall and wherever its foot, stand in front of the sun', () => {
    const tallest = { height: Math.max(...(['red', 'bell', 'puff'] as const).map((kind) => shapeOf(kind, FULL).height)), width: 2 * Math.max(...(['red', 'bell', 'puff'] as const).map((kind) => shapeOf(kind, FULL).lean + shapeOf(kind, FULL).capWidth / 2)) }
    for (let x = MOSS.left; x <= MOSS.right; x += 7) {
      const top = mossTop(x) - tallest.height, reach = SUN.r * 1.8
      // The cap's box against the circle the rays reach.
      const dx = Math.max(0, Math.abs(x - SUN.x) - tallest.width / 2), dy = Math.max(0, top - SUN.y)
      expect(Math.hypot(dx, dy), `a foot at ${x}`).toBeGreaterThan(reach)
    }
  })

  it('lets no foot stand behind a gnome: the moss ends above their heads, and the tall hat has its own column', () => {
    for (const who of GNOMES) {
      const seat = SEATS[who]
      for (let x = seat.x - seat.half; x <= seat.x + seat.half; x += 6) {
        const foot = footFor(x, 700)
        if (foot) expect(onGnome(who, foot.x, foot.y), `${who} at ${x}`).toBe(false)
      }
    }
    expect(footFor(SEATS.tall.x, 450)).toBeNull()
  })

  it('seats the gnomes apart, each at least as wide as a small hand needs, with the snail and the sun clear of them', () => {
    for (let i = 0; i < GNOMES.length; i++) {
      const a = SEATS[GNOMES[i]]
      expect(a.half * 2).toBeGreaterThanOrEqual(100)
      for (let j = i + 1; j < GNOMES.length; j++) {
        const b = SEATS[GNOMES[j]]
        expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(a.half + b.half)
      }
      expect(Math.abs(SNAIL.x - a.x)).toBeGreaterThan(a.half + SNAIL.r + 26)
    }
    expect(under(SUN.x, SUN.y).what).toBe('sun')
    expect(under(SNAIL.x, SNAIL.y).what).toBe('snail')
    for (const who of GNOMES) expect(under(SEATS[who].x, SEATS[who].y - 100)).toEqual({ what: 'gnome', who })
  })
})
