import { describe, expect, it } from 'vitest'
import { DOORS_OF, FIRST, FOG_ALL, FOG_PATCHES, FOG_TOP, ROOMS, bakerWears, diner, flyInSoup, flyOnFlower, goThrough, holdWeed, lightsOut, pieOnFace, pullWeed, rubFog, tapBasket, tapBellyAtFair, tapDog, tapFlower, tapFly, tapHen, tapHotTap, tapLadle, tapPump, tapTray, untouched, type House } from './house'

const with_ = (change: Partial<House>): House => ({ ...FIRST, day: true, ...change })

describe('the map of the house', () => {
  it('has eight rooms with three doors each, none to itself and no two to the same room', () => {
    expect(ROOMS.length).toBe(8)
    for (const room of ROOMS) {
      const doors = DOORS_OF[room]
      expect(new Set(doors).size).toBe(3)
      expect(doors).not.toContain(room)
    }
  })

  it('leads back through every door it leads out of', () => {
    for (const room of ROOMS) for (const next of DOORS_OF[room]) expect(DOORS_OF[next], `${next} back to ${room}`).toContain(room)
  })

  it('reaches every room from the bedroom', () => {
    const seen = new Set<string>(['bedroom'])
    for (let round = 0; round < 4; round++) for (const room of [...seen]) for (const next of DOORS_OF[room as keyof typeof DOORS_OF]) seen.add(next)
    expect(seen.size).toBe(8)
  })
})

describe('a thing with four steps', () => {
  it('goes one step a tap, the third is its punchline, and after that its own tap changes nothing', () => {
    for (const [tap, field] of [[tapDog, 'dog'], [tapPump, 'balloon'], [tapHen, 'eggs'], [tapLadle, 'soup'], [tapTray, 'pies']] as const) {
      let h = with_({})
      const came: string[] = []
      for (let i = 0; i < 5; i++) {
        const out = tap(h)
        came.push(out.came)
        h = out.house
        expect(h[field], field).toBe(Math.min(3, i + 1))
      }
      expect(came, field).toEqual(['step', 'step', 'punch', 'again', 'again'])
    }
  })

  it('is walked back by its wrong use from a middle step only: the belly at the fair and the basket', () => {
    for (const [wrong, field] of [[tapBellyAtFair, 'balloon'], [tapBasket, 'eggs']] as const) {
      expect(wrong(with_({ [field]: 0 }))).toMatchObject({ came: 'joke', house: { [field]: 0 } })
      expect(wrong(with_({ [field]: 1 }))).toMatchObject({ came: 'back', house: { [field]: 0 } })
      expect(wrong(with_({ [field]: 2 }))).toMatchObject({ came: 'back', house: { [field]: 1 } })
      expect(wrong(with_({ [field]: 3 }))).toMatchObject({ came: 'joke', house: { [field]: 3 } })
    }
  })
})

describe('the other things', () => {
  it('the fly is swatted by a tap on it, once', () => {
    const out = tapFly(with_({}))
    expect(out).toMatchObject({ came: 'punch', house: { fly: 1 } })
    expect(tapFly(out.house)).toMatchObject({ came: 'again', house: { fly: 1 } })
  })

  it('the glass clears patch by patch, the last patch is the punchline, and the hot tap fogs the top row at any step', () => {
    let h = with_({})
    for (let patch = 0; patch < FOG_PATCHES; patch++) {
      const out = rubFog(h, patch)!
      expect(out.came).toBe(patch === FOG_PATCHES - 1 ? 'punch' : 'step')
      expect(rubFog(out.house, patch)?.came ?? null).toBe(patch === FOG_PATCHES - 1 ? 'again' : null)
      h = out.house
    }
    expect(h.fog).toBe(0)
    expect(tapHotTap(h).house.fog).toBe(FOG_TOP)
    expect(tapHotTap(with_({ fog: 0b111000 })).house.fog).toBe(0b111111)
    expect(tapHotTap(with_({})).house.fog).toBe(FOG_ALL)
  })

  it('the weed stretches when it is held and comes out only from there', () => {
    expect(pullWeed(with_({}))).toBeNull()
    const held = holdWeed(with_({}))
    expect(held).toMatchObject({ came: 'step', house: { weed: 1 } })
    expect(holdWeed(held.house).came).toBe('again')
    const out = pullWeed(held.house)!
    expect(out).toMatchObject({ came: 'punch', house: { weed: 2 } })
    expect(pullWeed(out.house)).toBeNull()
    expect(holdWeed(out.house)).toMatchObject({ came: 'again', house: { weed: 2 } })
  })

  it('one flower comes up, and after that a tap on the flowers changes nothing', () => {
    const out = tapFlower(with_({}))
    expect(out).toMatchObject({ came: 'step', house: { flower: true } })
    expect(tapFlower(out.house)).toMatchObject({ came: 'joke', house: { flower: true } })
  })
})

describe('what is found in another room', () => {
  it('serves the pie from the rubber hat once, the first time the dining room is entered, and keeps the slice', () => {
    const hat = with_({ place: 'kitchen', pies: 3, balloon: 3 })
    const first = goThrough(hat, 1)
    expect(first).toMatchObject({ serves: true, house: { place: 'dining', served: true } })
    expect(goThrough({ ...first.house, place: 'kitchen' }, 1)).toMatchObject({ serves: false, house: { served: true } })
    // No rubber hat, or no toppled pies: nothing to serve. And no other room serves.
    expect(goThrough(with_({ place: 'kitchen', pies: 3, balloon: 2 }), 1)).toMatchObject({ serves: false, house: { served: false } })
    expect(goThrough(with_({ place: 'kitchen', pies: 2, balloon: 3 }), 1).serves).toBe(false)
    expect(goThrough(hat, 0)).toMatchObject({ serves: false, house: { place: 'bedroom', served: false } })
    expect(lightsOut().served).toBe(false)
  })

  it('the dog eats the toppled pies where he meets them, whichever comes first, and is round from then on', () => {
    expect(tapTray(with_({ pies: 2, dog: 3 })).house).toMatchObject({ pies: 3, full: true })
    expect(tapTray(with_({ pies: 2, dog: 2 })).house).toMatchObject({ pies: 3, full: false })
    expect(tapTray(with_({ pies: 1, dog: 3 })).house.full).toBe(false)
    const walkedIn = goThrough(with_({ place: 'dining', pies: 3, dog: 3 }), 2)
    expect(walkedIn).toMatchObject({ eats: true, house: { place: 'bakery', full: true } })
    expect(goThrough(with_({ place: 'dining', pies: 3, dog: 0 }), 2)).toMatchObject({ eats: false, house: { full: false } })
    expect(goThrough(with_({ place: 'dining', pies: 3, dog: 3, full: true }), 2).eats).toBe(false)
    expect(goThrough(with_({ place: 'dining', pies: 3, dog: 3 }), 0)).toMatchObject({ eats: false, house: { place: 'kitchen', full: false } })
  })

  it('the baker wears the burst balloon, and it catches the top pie, so his face is clear', () => {
    expect(bakerWears(with_({}))).toBe('cap')
    expect(bakerWears(with_({ balloon: 3 }))).toBe('rubber')
    expect(bakerWears(with_({ balloon: 3, pies: 3 }))).toBe('rubberPie')
    expect(pieOnFace(with_({ pies: 3 }))).toBe(true)
    expect(pieOnFace(with_({ pies: 3, balloon: 3 }))).toBe(false)
    expect(pieOnFace(with_({ pies: 2 }))).toBe(false)
  })

  it('the fly is in the soup once soup is served, unless it was swatted or a flower was picked for it', () => {
    expect(flyInSoup(with_({ soup: 0 }))).toBe(false)
    expect(flyInSoup(with_({ soup: 1 }))).toBe(true)
    expect(flyInSoup(with_({ soup: 1, fly: 1 }))).toBe(false)
    expect(flyInSoup(with_({ soup: 2, flower: true }))).toBe(false)
    expect(flyOnFlower(with_({ flower: true }))).toBe(true)
    expect(flyOnFlower(with_({ flower: true, fly: 1 }))).toBe(false)
  })

  it('the dog sits at the table when he is awake, and the hen when he is not', () => {
    expect(diner(with_({ dog: 3 }))).toBe('dog')
    for (const dog of [0, 1, 2] as const) expect(diner(with_({ dog }))).toBe('hen')
  })
})

describe('doors and the lamp', () => {
  it('the first door opened at night is the morning, and no other', () => {
    const first = goThrough(FIRST, 0)
    expect(first).toMatchObject({ morning: true, house: { place: 'kitchen', day: true } })
    expect(goThrough(first.house, 0)).toMatchObject({ morning: false, house: { place: 'bedroom', day: true } })
  })

  it('a door changes the room and nothing else, the pies eaten apart', () => {
    const h = with_({ place: 'garden', dog: 2, balloon: 3, fly: 1, eggs: 2, pies: 1, fog: 5, weed: 2, flower: true, soup: 3 })
    for (const door of [0, 1, 2] as const) expect(goThrough(h, door).house).toEqual({ ...h, place: DOORS_OF.garden[door] })
  })

  it('the lamp puts the whole house back as a first visit finds it', () => {
    expect(lightsOut()).toEqual(FIRST)
    expect(untouched(FIRST)).toBe(true)
    expect(untouched(with_({ place: 'fair' }))).toBe(true)
    for (const change of [{ dog: 1 }, { full: true }, { balloon: 1 }, { fly: 1 }, { eggs: 1 }, { pies: 1 }, { fog: 1 }, { weed: 1 }, { flower: true }, { soup: 1 }] as Partial<House>[]) expect(untouched(with_(change)), JSON.stringify(change)).toBe(false)
  })
})
