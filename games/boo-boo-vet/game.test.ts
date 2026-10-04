// The game played through its running model, with no canvas: a child's
// touches go in, and the saved room, the sounds and the frame come out.

import { describe, expect, it } from 'vitest'
import { stream } from './arrivals'
import { CAST, SPECIES, type Species } from './cast'
import { allTracks, cellLasts } from './cells'
import { freshClinic, type Clinic } from './clinic'
import { LADDER } from './config'
import type { Guidance } from './guidance'
import { CARES, FITS, NEEDS, OPEN, PLAIN, QUIET, type Care, type Need } from './needs'
import { isWell, showing } from './patient'
import { deserializeClinic, differsFromSlot, serializeClinic } from './save'
import { SECRET_SECONDS, SHOWING_SECONDS, WELL } from './scenes'
import { TREMBLE, sign } from './signs'
import { CART_IN_AT, CART_OUT, COMING_SECONDS, FLIGHT_SECONDS, SEATED_AT, busy, cancel, drag, drop, freshToy, lies, mayComeIn, needOnTable, press, settle, step, strokeAt, takeSave, takeSounds, tap, type Toy, type Vec } from './toy'
import { scene, type Item } from './toyScene'
import { roomFor } from './view/toyRoom'

const { room, garden } = roomFor(1180, 820)
const FRAME = 1 / 60
const QUIET_GUIDE: Guidance = { glow: 0, demo: null, demoIndex: -1 }
const SEED = 20261003

function run(toy: Toy, seconds: number, each?: (items: Item[]) => void): void {
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    step(toy, room, FRAME)
    each?.(scene(toy, room, garden, QUIET_GUIDE))
  }
}

const door: Vec = { x: room.waiting.x, y: room.waiting.y - 80 }
/** One frame of game time. */
const step_ = (toy: Toy): void => step(toy, room, FRAME)

/** Brings the one at the door in and waits until it has sat down and any showing is over. */
function comeIn(toy: Toy): void {
  press(toy, room, door)
  tap(toy)
  run(toy, COMING_SECONDS + SHOWING_SECONDS + 0.5)
}

function give(toy: Toy, care: Care): void {
  press(toy, room, lies(toy, room, care)!)
  tap(toy)
  run(toy, FLIGHT_SECONDS + FRAME)
}

/** A game with this animal on the table with this need, and every thing on the cart and shown. */
function gameWith(species: Species, needs: Need[], step: 0 | 1 | 2 = PLAIN, position = 'basket'): Toy {
  const fresh = freshClinic(null, SEED)
  const other = SPECIES.find((candidate) => candidate !== species)!
  const clinic: Clinic = {
    ...fresh,
    position,
    shown: [...CARES],
    table: { species, at: position, needs: needs.map((need) => ({ need, step, met: false })), wrong: 0, tried: [], cart: [...CARES], fromCarrier: false },
    waiting: { ...fresh.waiting, species: fresh.waiting.species === species ? other : fresh.waiting.species, cart: [...CARES] },
  }
  return freshToy(clinic, false)
}

const figures = (items: Item[], who: string) => items.filter((item) => item.kind === 'figure' && item.who === who) as Extract<Item, { kind: 'figure' }>[]
const parts = (items: Item[], part: string) => items.filter((item) => item.kind === 'part' && item.part === part)
const things = (items: Item[], care: Care) => items.filter((item) => item.kind === 'thing' && item.care === care) as Extract<Item, { kind: 'thing' }>[]

function finite(items: Item[]): void {
  for (const item of items) for (const value of Object.values(item)) if (typeof value === 'number') expect(Number.isFinite(value), JSON.stringify(item)).toBe(true)
}

describe('a first visit', () => {
  it('opens on an empty table with one who waits at the door and no cart: nothing is there before it means anything', () => {
    const toy = freshToy(freshClinic(null, SEED), false)
    run(toy, 0.5)
    const items = scene(toy, room, garden, QUIET_GUIDE)
    expect(figures(items, 'patient')).toHaveLength(0)
    expect(figures(items, 'waiting')).toHaveLength(1)
    expect(items.some((item) => item.kind === 'cart' || item.kind === 'mouse' || item.kind === 'thing')).toBe(false)
    // The one who waits shows what it needs: its sign is the want of the scene.
    expect(parts(items, 'tongue1').length + parts(items, 'tongue2').length).toBe(1)
  })

  it('waits for the child: nothing comes in by itself, however long nothing is touched', () => {
    const toy = freshToy(freshClinic(null, SEED), false)
    run(toy, 90)
    expect(toy.clinic.table).toBeNull()
    expect(toy.coming).toBeNull()
  })

  it('brings the first one in on a touch, with the cart rolling in behind it, and saves that at once', () => {
    const toy = freshToy(freshClinic(null, SEED), false)
    const waiting = toy.clinic.waiting
    press(toy, room, door)
    expect(toy.clinic.table).toEqual(waiting)
    expect(takeSave(toy)).toBe(2)
    let cartAt = Infinity
    run(toy, COMING_SECONDS + 0.1, (items) => {
      finite(items)
      const cart = items.find((item) => item.kind === 'cart') as Extract<Item, { kind: 'cart' }> | undefined
      if (cart) cartAt = cart.x
    })
    expect(cartAt).toBe(0)
    expect(needOnTable(toy)).toBe('thirsty')
    expect(things(scene(toy, room, garden, QUIET_GUIDE), 'bowl')).toHaveLength(1)
  })
})

describe('the care that fits', () => {
  it('helps every animal with every need, and what the well scene saves is saved when it starts', () => {
    for (const species of SPECIES) {
      for (const need of NEEDS) {
        const toy = gameWith(species, [need], PLAIN, LADDER[NEEDS.indexOf(need)])
        press(toy, room, lies(toy, room, FITS[need])!)
        tap(toy)
        run(toy, FLIGHT_SECONDS + FRAME)
        // In the frame of the landing: the need is met, the cycle judged, the position moved, the thing on the animal, and a save asked for at once.
        expect(isWell(toy.clinic.table!), `${species} ${need}`).toBe(true)
        expect(toy.clinic.finished).toBe(true)
        expect(toy.clinic.position).toBe(LADDER[NEEDS.indexOf(need) + 1])
        if (FITS[need] !== 'plaster') expect(toy.clinic.things[FITS[need] as Exclude<Care, 'plaster'>]).toBe('patient')
        expect(takeSave(toy)).toBe(2)
        expect(toy.scene).not.toBeNull()
        // The scene lasts six to nine seconds, and then the animal sits, well, at rest.
        let lasted = 0
        while (toy.scene && lasted < 12) { step(toy, room, FRAME); lasted += FRAME }
        expect(lasted, `${species} ${need}`).toBeGreaterThanOrEqual(WELL.least - 0.05)
        expect(lasted, `${species} ${need}`).toBeLessThanOrEqual(WELL.most + 0.05)
        expect(toy.cell).toBeNull()
        expect(toy.act).toMatchObject({ feat: null, flourish: null, glance: null, under: false })
        run(toy, 1.5)
        const sitting = figures(scene(toy, room, garden, QUIET_GUIDE), 'patient')[0]
        expect(sitting.size).toBe(1)
        expect(Math.hypot(sitting.x - room.patient.x, sitting.y - room.patient.y)).toBeLessThan(30)
        expect(['calm', 'glad', 'bliss', 'wow', 'wary']).toContain(sitting.face)
      }
    }
  }, 60_000)

  it('gives way to any touch: the scene ends where it was going, and the touch is then an ordinary touch', () => {
    for (const need of NEEDS) {
      const toy = gameWith('rabbit', [need])
      give(toy, FITS[need])
      run(toy, 1.2)
      expect(toy.scene).not.toBeNull()
      const other = CARES.find((care) => care !== FITS[need])!
      takeSounds(toy)
      press(toy, room, lies(toy, room, other)!)
      expect(toy.scene).toBeNull()
      expect(toy.cell).toBeNull()
      expect(toy.act.under).toBe(false)
      expect(toy.hand?.care).toBe(other)
      // The scene's own sounds are not all played at once on the touch: only the touch is heard.
      expect(takeSounds(toy).length).toBeLessThanOrEqual(2)
      const sitting = figures(scene(toy, room, garden, QUIET_GUIDE), 'patient')[0]
      expect(sitting.size).toBe(1)
    }
  })

  it('replays nothing on load, at any moment of the scene: the animal is found well and sitting', () => {
    for (const at of [0.1, 1.5, 4, 7]) {
      const toy = gameWith('dog', ['scared'])
      give(toy, 'basket')
      run(toy, at)
      settle(toy, room)
      const back = freshToy(deserializeClinic(JSON.parse(JSON.stringify(serializeClinic(toy.clinic))), null, 1), false)
      expect(back.scene).toBeNull()
      expect(isWell(back.clinic.table!)).toBe(true)
      run(back, 0.5)
      const items = scene(back, room, garden, QUIET_GUIDE)
      expect(parts(items, 'shade')).toHaveLength(0)
      const sitting = figures(items, 'patient')[0]
      expect(Math.hypot(sitting.x - room.patient.x, sitting.y - room.patient.y)).toBeLessThan(30)
      expect(back.clinic.position).toBe(toy.clinic.position)
    }
  })

  it('takes two needs in either order, and the well scene starts only after both', () => {
    const toy = gameWith('bear', ['cold', 'thirsty'], PLAIN, 'two')
    give(toy, 'bowl')
    expect(toy.scene).toBeNull()
    expect(toy.cell?.track.given).toBe('bowl')
    run(toy, 7)
    expect(needOnTable(toy)).toBe('cold')
    give(toy, 'blanket')
    expect(toy.scene).not.toBeNull()
    expect(toy.clinic.position).toBe('two-quiet')
  })
})

describe('the well scene, beat by beat', () => {
  it('plays its beats in the sheet\'s order, each to be seen: the cell, a held breath, the feat, the flourish, a glance, and sitting down to look about', () => {
    for (const species of SPECIES) {
      const toy = gameWith(species, ['itchy'])
      give(toy, 'bowl')
      run(toy, 6)
      give(toy, 'brush')
      const order: string[] = []
      const still: number[] = [], looks: number[] = []
      run(toy, 10, (items) => {
        const beat = toy.act.check ? 'breath' : toy.act.feat ? 'feat' : toy.act.flourish ? 'flourish' : toy.act.glance ? 'glance' : toy.act.sits ? 'sits' : toy.scene ? 'cell' : 'over'
        if (order[order.length - 1] !== beat) order.push(beat)
        const figure = figures(items, 'patient')[0]
        if (beat === 'breath') { still.push(figure.sy); expect(figure.face).toBe('wow') }
        if (beat === 'sits') looks.push(figure.rot)
      })
      expect(order, species).toEqual(['cell', 'breath', 'feat', 'flourish', 'glance', 'sits', 'over'])
      // Held: drawn up taller than it sits.
      expect(Math.max(...still), species).toBeGreaterThan(1.03)
      // It looks one way and then the other.
      expect(Math.max(...looks), species).toBeGreaterThan(0.04)
      expect(Math.min(...looks), species).toBeLessThan(-0.04)
    }
  })
})

describe('the well scene, after things that did not fit', () => {
  it('glances once at each thing that was tried, in the order it was tried, however many, and still ends by nine seconds', () => {
    for (const species of ['bear', 'hedgehog'] as Species[]) {
      for (const need of NEEDS) {
        const toy = gameWith(species, [need])
        const wrong = CARES.filter((care) => care !== FITS[need])
        for (const care of wrong) { give(toy, care); run(toy, 6) }
        expect(toy.clinic.table!.tried).toEqual(wrong)
        give(toy, FITS[need])
        const glanced: Care[] = []
        let lasted = 0, flourished = 0
        run(toy, 12, () => {
          if (toy.scene) lasted += FRAME
          if (toy.act.flourish) flourished += FRAME
          const at = toy.act.glance?.care
          if (at && glanced[glanced.length - 1] !== at) glanced.push(at)
        })
        expect(glanced, `${species} ${need}`).toEqual(wrong)
        expect(lasted, `${species} ${need}`).toBeLessThanOrEqual(WELL.most + 0.05)
        expect(flourished).toBeGreaterThan(1)
      }
    }
  }, 60_000)
})

describe('a care that does not fit', () => {
  it('is never refused: its own cell plays, the sign is one step plainer, and the thing comes to rest beside the animal to be given again', () => {
    for (const need of NEEDS) {
      for (const care of CARES) {
        if (FITS[need] === care) continue
        const toy = gameWith('cat', [need], QUIET)
        give(toy, care)
        expect(toy.cell?.track, `${care} to ${need}`).toMatchObject({ given: care, need })
        expect(showing(toy.clinic.table!)).toMatchObject({ need, step: PLAIN, met: false })
        expect(toy.clinic.table!.wrong).toBe(1)
        expect(toy.clinic).toMatchObject({ finished: false, position: 'basket' })
        let seen = 0
        run(toy, cellLasts(toy.cell!.track, 'cat') + 0.3, (items) => { finite(items); seen = Math.max(seen, things(items, care).length) })
        expect(seen).toBeGreaterThanOrEqual(1)
        expect(toy.cell).toBeNull()
        if (care !== 'plaster') {
          expect(['table-left', 'table-right', 'floor-left', 'floor-right']).toContain(toy.clinic.things[care])
          press(toy, room, lies(toy, room, care)!)
          expect(toy.hand?.care).toBe(care)
        }
      }
    }
  }, 60_000)

  it('goes from quiet to plain to open and stays there, and the fitting care still helps', () => {
    const toy = gameWith('duck', ['sore'], QUIET)
    const steps: number[] = []
    for (const care of ['bowl', 'blanket', 'brush'] as Care[]) {
      give(toy, care)
      steps.push(showing(toy.clinic.table!)!.step)
      run(toy, 6)
    }
    expect(steps).toEqual([PLAIN, OPEN, OPEN])
    // Three things lie beside it, each on a spot of its own.
    const spots = (['bowl', 'blanket', 'brush'] as const).map((thing) => toy.clinic.things[thing])
    expect(new Set(spots).size).toBe(3)
    give(toy, 'plaster')
    expect(isWell(toy.clinic.table!)).toBe(true)
    // Two or more did not fit: the cycle went badly, and the position steps down one.
    expect(toy.clinic.position).toBe('brush')
  })

  it('never presses a frightened animal: nothing is laid in its hiding place, and its trembling does not grow', () => {
    const toy = gameWith('rabbit', ['scared'], PLAIN)
    for (const care of ['bowl', 'blanket', 'brush'] as const) {
      give(toy, care)
      run(toy, 6)
      // On the table's ends while there is room there, and back on the cart after that: never under the table.
      expect(toy.clinic.things[care].startsWith('floor'), care).toBe(false)
      expect(toy.clinic.things[care]).not.toBe('patient')
    }
    // A thing let go on the floor while it hides goes to the table's end, not under the table.
    press(toy, room, lies(toy, room, 'bowl')!)
    drag(toy, room, { x: 200, y: 300 })
    drop(toy, room)
    expect(toy.clinic.things.bowl.startsWith('floor')).toBe(false)
  })

  it('never makes a frightened animal tremble more: each wrong care shows more of it, and the shake stays as it was', () => {
    // How hard the sticker shakes, measured as the widest swing of the animal from side to side in a quiet second.
    const swing = (toy: Toy) => {
      const xs: number[] = []
      run(toy, 1.5, (items) => { const figure = items.find((item) => (item.kind === 'figure' && item.who === 'patient') || (item.kind === 'part' && item.part === 'ball')) as { x: number } | undefined; if (figure && !toy.cell) xs.push(figure.x) })
      return xs
    }
    for (const species of SPECIES) {
      for (const step of [QUIET, PLAIN, OPEN] as const) expect(sign(species, 'scared', step, 3.3, 7).show.shake, species).toBe(TREMBLE)
      const toy = gameWith(species, ['scared'], QUIET)
      expect(swing(toy).length).toBeGreaterThan(0)
      for (const care of ['bowl', 'plaster'] as const) { give(toy, care); run(toy, 6) }
      expect(showing(toy.clinic.table!)!.step).toBe(OPEN)
      expect(sign(species, 'scared', OPEN, toy.t, toy.clinic.seed % 1000).show.shake).toBe(TREMBLE)
    }
    // No cell for the one that hides sets a shake above the trembling it came with.
    for (const track of allTracks()) if (track.need === 'scared') for (const key of track.animal) expect(key.parts?.shake ?? 0, track.motion).toBeLessThanOrEqual(TREMBLE)
  })
})

describe('a taste', () => {
  it('colours a care that does not fit, in the animal\'s own manner, and never decides whether a care helps', () => {
    // The dog loves the bowl and is wary of the plaster; the cat is wary of the bowl.
    const faceAt = (species: Species, care: Care, need: Need): string => {
      const toy = gameWith(species, [need])
      give(toy, care)
      run(toy, 0.45)
      return figures(scene(toy, room, garden, QUIET_GUIDE), 'patient')[0].face
    }
    expect(faceAt('dog', 'bowl', 'cold')).toBe('bliss')
    expect(faceAt('dog', 'plaster', 'cold')).toBe('wary')
    expect(faceAt('cat', 'bowl', 'cold')).toBe('wary')
    // And the need comes back: the thing did not help, whoever loves it.
    const loved = gameWith('dog', ['cold'])
    give(loved, 'bowl')
    run(loved, 8)
    expect(needOnTable(loved)).toBe('cold')
    // The thing it is wary of still helps when it fits.
    const wary = gameWith('cat', ['thirsty'])
    give(wary, 'bowl')
    expect(isWell(wary.clinic.table!)).toBe(true)
  })
})

describe('each animal in its own body', () => {
  it('lets a thirsty cat, which is wary of the bowl, drink by dipping a paw and licking it, and helps it all the same', () => {
    const drinks = (species: Species) => {
      const toy = gameWith(species, ['thirsty'])
      give(toy, 'bowl')
      let paws = 0, licks = 0, deepest = 0
      run(toy, 1.6, (items) => {
        paws += parts(items, 'paw').filter((item) => item.kind === 'part' && item.species === species).length
        licks += parts(items, 'tongue1').filter((item) => item.kind === 'part' && item.species === species).length
        deepest = Math.max(deepest, figures(items, 'patient')[0].y - room.patient.y)
      })
      return { paws, licks, deepest, well: isWell(toy.clinic.table!) }
    }
    const cat = drinks('cat'), rabbit = drinks('rabbit')
    expect(cat.well).toBe(true)
    expect(cat.paws).toBeGreaterThan(60)
    expect(cat.licks).toBeGreaterThan(5)
    // The rabbit puts its face to the water; the cat keeps its face out of it.
    expect(rabbit.paws).toBe(0)
    expect(cat.deepest).toBeLessThan(rabbit.deepest * 0.6)
  })

  it('makes a frightened hedgehog a ball of spines under the table, which uncurls only to peek', () => {
    const quiet = gameWith('hedgehog', ['scared'], QUIET)
    let balls = 0, faces = 0
    run(quiet, 4, (items) => { balls += parts(items, 'ball').length; faces += figures(items, 'patient').length })
    expect(balls).toBeGreaterThan(200)
    expect(faces).toBe(0)
    const open = gameWith('hedgehog', ['scared'], OPEN)
    balls = 0; faces = 0
    run(open, 6, (items) => { balls += parts(items, 'ball').length; faces += figures(items, 'patient').length })
    expect(balls).toBeGreaterThan(0)
    expect(faces).toBeGreaterThan(0)
    // No other animal curls up, and the hedgehog is itself again once it is well.
    const rabbit = gameWith('rabbit', ['scared'], QUIET)
    let other = 0
    run(rabbit, 3, (items) => { other += parts(items, 'ball').length })
    expect(other).toBe(0)
    give(quiet, 'basket')
    run(quiet, 11)
    expect(parts(scene(quiet, room, garden, QUIET_GUIDE), 'ball')).toHaveLength(0)
    expect(figures(scene(quiet, room, garden, QUIET_GUIDE), 'patient')).toHaveLength(1)
  })
})

describe('what the sheet says a child sees in a cell', () => {
  const patient = (items: Item[]) => figures(items, 'patient')[0]

  it('hangs both ears of the one that droops, at every step and at the door too, and of nobody else', () => {
    for (const species of SPECIES) {
      for (const step of [QUIET, PLAIN, OPEN] as const) {
        const toy = gameWith(species, ['thirsty'], step)
        toy.clinic = { ...toy.clinic, waiting: { ...toy.clinic.waiting, needs: [{ need: 'thirsty', step, met: false }] } }
        run(toy, 1, (items) => {
          expect(patient(items).hang, `${species} at step ${step}`).toBe(2)
          expect(figures(items, 'waiting')[0].hang).toBe(2)
        })
      }
      for (const need of NEEDS.filter((other) => other !== 'thirsty')) {
        const toy = gameWith(species, [need])
        // A frightened hedgehog is a ball, with no ears to be seen at all.
        run(toy, 1, (items) => expect(patient(items)?.hang ?? 0, `${species} ${need}`).toBe(0))
      }
    }
  })

  it('lifts the ears one after the other as it drinks, and leaves a well animal with both up', () => {
    for (const species of SPECIES) {
      const toy = gameWith(species, ['thirsty'])
      give(toy, 'bowl')
      const seen: number[] = []
      run(toy, 10, (items) => { const hang = patient(items)?.hang; if (hang !== undefined && seen[seen.length - 1] !== hang) seen.push(hang) })
      expect(seen, species).toEqual([2, 1, 0])
      expect(isWell(toy.clinic.table!)).toBe(true)
    }
  })

  it('stands the fur on end round the animal that is brushed while it is cold, sore or hiding, behind its own sticker', () => {
    for (const need of ['cold', 'sore', 'scared'] as Need[]) {
      for (const species of ['bear', 'duck'] as Species[]) {
        const toy = gameWith(species, [need])
        give(toy, 'brush')
        let frames = 0
        run(toy, 5, (items) => {
          const fur = items.findIndex((item) => item.kind === 'part' && item.part === 'fur')
          if (fur < 0) return
          frames++
          expect(items.findIndex((item) => item.kind === 'figure' && item.who === 'patient'), `${species} ${need}`).toBeGreaterThan(fur)
        })
        expect(frames / 60, `${species} ${need}`).toBeGreaterThan(0.5)
        // It settles before the cell ends: none is left on an animal that is only showing its need.
        run(toy, 3)
        expect(parts(scene(toy, room, garden, QUIET_GUIDE), 'fur')).toHaveLength(0)
      }
    }
  })

  it('brings whoever goes under the crackling blanket out with its fur on end, with a crackle, and saves none of it', () => {
    const toy = gameWith('dog', ['cold'])
    press(toy, room, lies(toy, room, 'brush')!)
    drag(toy, room, lies(toy, room, 'blanket')!)
    drop(toy, room)
    run(toy, SECRET_SECONDS + 0.5)
    expect(toy.clinic.made.crackle).toBe(true)
    takeSounds(toy)
    press(toy, room, lies(toy, room, 'blanket')!)
    tap(toy)
    run(toy, FLIGHT_SECONDS + FRAME)
    const heard = takeSounds(toy).length
    expect(heard).toBeGreaterThanOrEqual(2)
    expect(toy.clinic.made.crackle).toBe(false)
    let out = 0
    run(toy, 9, (items) => { if (patient(items) && parts(items, 'fur').length > 0) out++ })
    // Still up for a good second after it has come out from under the blanket.
    expect(out / 60).toBeGreaterThan(1)
    run(toy, 4)
    expect(parts(scene(toy, room, garden, QUIET_GUIDE), 'fur')).toHaveLength(0)
    // Without the crackle, the same blanket leaves the fur lying.
    const plain = gameWith('dog', ['cold'])
    give(plain, 'blanket')
    run(plain, 9, (items) => expect(parts(items, 'fur')).toHaveLength(0))
    // And it is not in the save: opened again in the middle of it, the fur lies flat.
    const again = gameWith('dog', ['cold'])
    again.clinic = { ...again.clinic, made: { ...again.clinic.made, crackle: true } }
    give(again, 'blanket')
    run(again, 0.5)
    const opened = freshToy(deserializeClinic(JSON.parse(JSON.stringify(serializeClinic(again.clinic))), null, SEED), false)
    run(opened, 1, (items) => expect(parts(items, 'fur')).toHaveLength(0))
  })

  it('spreads rings in the bowl in front of the one that shivers and at the edge of the hiding place, and nowhere else', () => {
    const ripples = (items: Item[]) => items.filter((item) => item.kind === 'ripple') as Extract<Item, { kind: 'ripple' }>[]
    for (const need of NEEDS) {
      const toy = gameWith('rabbit', [need])
      give(toy, 'bowl')
      let frames = 0
      run(toy, 6, (items) => {
        const rings = ripples(items)
        if (rings.length === 0) return
        frames++
        const bowl = things(items, 'bowl')[0]
        for (const ring of rings) {
          expect(Math.abs(ring.x - bowl.x)).toBeLessThan(1)
          expect(ring.y).toBeLessThan(bowl.y)
          expect(ring.age).toBeGreaterThanOrEqual(0)
          expect(ring.age).toBeLessThan(1)
        }
      })
      if (need === 'cold' || need === 'scared') expect(frames / 60, need).toBeGreaterThan(0.25)
      else expect(frames, need).toBe(0)
    }
  })

  it('shows two eyes in the dark that blink twice after the plaster, and one eye that watches the brush', () => {
    for (const species of ['cat', 'hedgehog'] as Species[]) {
      const toy = gameWith(species, ['scared'])
      give(toy, 'plaster')
      const looks: string[] = []
      run(toy, 5, (items) => {
        const eyes = items.filter((item) => item.kind === 'part' && (item.part === 'eyes' || item.part === 'eyesShut') && item.alpha > 0.5) as Extract<Item, { kind: 'part' }>[]
        expect(eyes.length).toBeLessThanOrEqual(1)
        expect(parts(items, 'eye')).toHaveLength(0)
        if (eyes.length === 0) return
        // In the hiding place, under the table's top, and in front of the dark.
        expect(Math.abs(eyes[0].x - room.hide.x)).toBeLessThan(80)
        expect(eyes[0].y).toBeGreaterThan(room.patient.y + 20)
        expect(eyes[0].y).toBeLessThan(room.hide.y)
        expect(items.indexOf(eyes[0])).toBeGreaterThan(items.findIndex((item) => item.kind === 'part' && item.part === 'shade'))
        if (looks[looks.length - 1] !== eyes[0].part) looks.push(eyes[0].part)
      })
      expect(looks, species).toEqual(['eyes', 'eyesShut', 'eyes', 'eyesShut', 'eyes'])

      const brushed = gameWith(species, ['scared'])
      give(brushed, 'brush')
      let watched = 0
      run(brushed, 5, (items) => {
        const eye = parts(items, 'eye') as Extract<Item, { kind: 'part' }>[]
        expect(eye.length + parts(items, 'eyes').length + parts(items, 'eyesShut').length).toBeLessThanOrEqual(1)
        if (eye.length > 0 && eye[0].alpha > 0.5) watched++
      })
      expect(watched / 60, species).toBeGreaterThan(0.4)
    }
  })
})

describe('more of what the sheet says a child sees', () => {
  it('ends a well animal\'s own scene with the thing it loves at any touch, wherever it lands, with the thing where the scene would have left it', () => {
    for (const where of [{ x: 600, y: 60 }, { x: room.lamp.x, y: room.lamp.y }, door]) {
      const toy = gameWith('duck', ['cold'])
      give(toy, 'blanket')
      run(toy, 10)
      give(toy, 'bowl')
      run(toy, 1)
      expect(toy.playing?.secret).toBe(true)
      press(toy, room, where)
      expect(toy.playing).toBeNull()
      // The touch is then an ordinary touch: at the door it brings the next one in, and the things go back to the cart.
      if (where === door) expect(toy.coming).not.toBeNull()
      else expect(toy.clinic.things.bowl).toBe('patient')
    }
    // A plain reaction is no secret, and a touch elsewhere leaves it playing.
    const toy = gameWith('duck', ['cold'])
    give(toy, 'blanket')
    run(toy, 10)
    give(toy, 'basket')
    run(toy, 0.6)
    expect(toy.playing?.secret).toBe(false)
    press(toy, room, { x: 600, y: 60 })
    expect(toy.playing).not.toBeNull()
  })

  /** A game in which the child has just put the blanket over the basket: a den stands on the cart. */
  function withDen(species: Species, needs: Need[]): Toy {
    const toy = gameWith(species, needs)
    toy.clinic = { ...toy.clinic, things: { ...toy.clinic.things, blanket: 'on-basket' }, made: { ...toy.clinic.made, den: true } }
    return toy
  }
  const whole = (items: Item[]) => { expect(parts(items, 'den').length + parts(items, 'denLifted').length, 'a den').toBe(1); expect(things(items, 'basket'), 'no bare basket').toHaveLength(0); expect(things(items, 'blanket'), 'no blanket apart').toHaveLength(0) }

  it('makes the den of the blanket and the basket, draws it as one thing, and lets it be taken as one thing', () => {
    const toy = gameWith('dog', ['thirsty'])
    press(toy, room, lies(toy, room, 'blanket')!)
    drag(toy, room, lies(toy, room, 'basket')!)
    drop(toy, room)
    run(toy, SECRET_SECONDS + 0.5)
    expect(toy.clinic.made.den).toBe(true)
    whole(scene(toy, room, garden, QUIET_GUIDE))
    press(toy, room, lies(toy, room, 'basket')!)
    expect(toy.hand?.care).toBe('basket')
    whole(scene(toy, room, garden, QUIET_GUIDE))
    // Given to one that needs neither of its two things, it is one thing that did not fit: counted once, and still a den.
    tap(toy)
    run(toy, 8, whole)
    expect(toy.clinic.table).toMatchObject({ wrong: 1, tried: ['basket'] })
    expect(toy.clinic.made.den).toBe(true)
  })

  it('helps as the basket or as the blanket, whichever the animal needs: no touch on a den is a wrong care for one that hides or one that is cold', () => {
    // The one that hides: the den is its hiding place, and it stays a den.
    const hiding = withDen('rabbit', ['scared'])
    press(hiding, room, lies(hiding, room, 'basket')!)
    tap(hiding)
    run(hiding, 12)
    expect(isWell(hiding.clinic.table!)).toBe(true)
    expect(hiding.clinic.table!.wrong).toBe(0)
    expect(hiding.clinic.made.den).toBe(true)
    // The one that is cold: it takes the blanket off the den, which comes apart; the basket is back where it lay.
    const cold = withDen('cat', ['cold'])
    const lay = lies(cold, room, 'basket')!
    press(cold, room, lay)
    tap(cold)
    run(cold, 12, (items) => { expect(things(items, 'basket').length + parts(items, 'den').length + parts(items, 'denLifted').length).toBe(1) })
    expect(isWell(cold.clinic.table!)).toBe(true)
    expect(cold.clinic.table!.wrong).toBe(0)
    expect(cold.clinic.made.den).toBe(false)
    expect(cold.clinic.things).toMatchObject({ blanket: 'patient', basket: 'cart' })
    expect(lies(cold, room, 'basket')).toEqual(lay)
    // With both, it is given as the one the animal is showing a need of, and then again as the other.
    for (const needs of [['cold', 'scared'], ['scared', 'cold']] as Need[][]) {
      const both = withDen('bear', needs)
      press(both, room, lies(both, room, 'basket')!)
      tap(both)
      run(both, 12)
      expect(both.clinic.table!.needs.find((entry) => entry.need === needs[0])!.met, needs.join()).toBe(true)
      expect(both.clinic.table!.wrong, needs.join()).toBe(0)
    }
    // A room that was saved with the den on the animal is drawn as a den.
    const saved = withDen('dog', ['cold'])
    saved.clinic = { ...saved.clinic, table: { ...saved.clinic.table!, needs: [] }, things: { ...saved.clinic.things, basket: 'patient' } }
    run(saved, 1, whole)
  })

  it('thumps a hind foot on the table when the brush has helped: a paw out at its side, lifted and brought down, and gone when the cell is over', () => {
    for (const species of SPECIES) {
      const toy = gameWith(species, ['itchy'])
      give(toy, 'brush')
      const heights: number[] = []
      run(toy, 9, (items) => {
        // Told from the leg that scratched by where it is: low at the animal's side, at the table.
        const foot = (parts(items, 'paw') as Extract<Item, { kind: 'part' }>[]).find((paw) => paw.y > room.patient.y - 40 && paw.x < room.patient.x - room.bodies[species].w * 0.3)
        if (foot) heights.push(room.patient.y - foot.y)
      })
      expect(heights.length / 60, species).toBeGreaterThan(0.4)
      expect(Math.max(...heights) - Math.min(...heights), species).toBeGreaterThan(12)
      expect(Math.min(...heights), species).toBeLessThan(12)
      expect(parts(scene(toy, room, garden, QUIET_GUIDE), 'paw')).toHaveLength(0)
    }
  })

  it('peels one plaster like any other thing: lifted in the hand and in the air, lying flat once it has landed', () => {
    const toy = gameWith('dog', ['cold'])
    press(toy, room, lies(toy, room, 'plaster')!)
    expect(things(scene(toy, room, garden, QUIET_GUIDE), 'plaster').map((item) => item.look).sort()).toEqual(['one-lifted', 'whole'])
    tap(toy)
    step(toy, room, FRAME)
    expect(things(scene(toy, room, garden, QUIET_GUIDE), 'plaster').some((item) => item.look === 'one-lifted')).toBe(true)
    run(toy, 6)
    expect(things(scene(toy, room, garden, QUIET_GUIDE), 'plaster').some((item) => item.look === 'one-lifted')).toBe(false)
  })
})

describe('a thing let go, and a thing held out at the door', () => {
  const atDoor: Vec = { x: room.waiting.x, y: room.waiting.y - 80 }
  const waitingAt = (items: Item[]) => figures(items, 'waiting')[0]

  it('slides to rest from where it was let go: it is seen all the way, and lies on its spot when it stops', () => {
    const toy = gameWith('dog', ['cold'])
    press(toy, room, lies(toy, room, 'bowl')!)
    const let_go = { x: 760, y: 700 }
    drag(toy, room, let_go)
    run(toy, 0.5)
    drop(toy, room)
    const spot = lies(toy, room, 'bowl')!
    expect(toy.clinic.things.bowl).not.toBe('cart')
    const far: number[] = []
    run(toy, 0.6, (items) => far.push(Math.hypot(things(items, 'bowl')[0].x - spot.x, things(items, 'bowl')[0].y - spot.y)))
    // It starts where it was let go, never jumps, and ends on the spot.
    expect(far[0]).toBeGreaterThan(Math.hypot(let_go.x - spot.x, let_go.y - spot.y) * 0.7)
    for (let frame = 1; frame < far.length; frame++) { expect(far[frame]).toBeLessThanOrEqual(far[frame - 1] + 1e-9); expect(far[frame - 1] - far[frame]).toBeLessThan(40) }
    expect(far[far.length - 1]).toBe(0)
    expect(busy(toy)).toBe(false)
  })

  it('is taken as play by the one who waits in the manner of its taste: no two manners move alike, and its sign stays at its step', () => {
    const moves = (species: Species, care: Care) => {
      const toy = gameWith('bear', ['cold'])
      toy.clinic = { ...toy.clinic, waiting: { ...toy.clinic.waiting, species, needs: [{ need: 'sore', step: PLAIN, met: false }] } }
      run(toy, 0.3)
      const before = JSON.stringify(toy.clinic.waiting)
      press(toy, room, lies(toy, room, care)!)
      drag(toy, room, atDoor)
      drop(toy, room)
      expect(JSON.stringify(toy.clinic.waiting)).toBe(before)
      const track: { x: number; y: number; rot: number }[] = []
      run(toy, 1.4, (items) => { const figure = waitingAt(items); track.push({ x: figure.x, y: figure.y, rot: figure.rot }); expect(figure.face).toBe('hurting') })
      return track
    }
    // The dog loves the bowl, is wary of the plaster and takes the blanket plainly; none of them fits a sore paw but the plaster.
    const loves = moves('dog', 'bowl'), plain = moves('dog', 'blanket'), wary = moves('cat', 'bowl')
    const apart = (one: typeof loves, other: typeof loves) => one.reduce((sum, at, index) => sum + Math.abs(at.x - other[index].x) + Math.abs(at.y - other[index].y) + 100 * Math.abs(at.rot - other[index].rot), 0) / one.length
    expect(apart(loves, plain)).toBeGreaterThan(4)
    expect(apart(plain, wary)).toBeGreaterThan(4)
    expect(apart(loves, wary)).toBeGreaterThan(4)
    // Wary, it leans away from the thing; it never hops at it.
    expect(Math.min(...wary.map((at) => at.x)) - room.waiting.x).toBeLessThan(-10)
  })

  it('is sniffed and nosed back when it would fit: the animal bends to it, then pushes, and the thing slides back to where it lay', () => {
    const toy = gameWith('bear', ['cold'])
    toy.clinic = { ...toy.clinic, waiting: { ...toy.clinic.waiting, species: 'rabbit', needs: [{ need: 'thirsty', step: PLAIN, met: false }] } }
    run(toy, 0.3)
    const before = JSON.stringify(serializeClinic(toy.clinic))
    const home = lies(toy, room, 'bowl')!
    press(toy, room, home)
    drag(toy, room, atDoor)
    run(toy, 0.4)
    drop(toy, room)
    expect(JSON.stringify(serializeClinic(toy.clinic))).toBe(before)
    expect(toy.doorPlay?.manner).toBe('nosed')
    const far: number[] = [], leans: number[] = []
    run(toy, 1.3, (items) => { const bowl = things(items, 'bowl')[0]; far.push(Math.hypot(bowl.x - home.x, bowl.y - home.y)); leans.push(waitingAt(items).rot) })
    // Sniffed first: for half a second it stays at the door while the animal bends to it.
    expect(Math.min(...far.slice(0, 24))).toBeGreaterThan(200)
    expect(Math.max(...leans.slice(0, 24))).toBeGreaterThan(0.08)
    // Then it goes back, without a jump, and lies where it lay.
    for (let frame = 1; frame < far.length; frame++) expect(Math.abs(far[frame - 1] - far[frame])).toBeLessThan(60)
    expect(far[far.length - 1]).toBe(0)
    expect(isWell(toy.clinic.waiting)).toBe(false)
  })
})

describe('the one who leaves', () => {
  it('goes out with what helped it in front of it, all the way to the door, and has it in the garden', () => {
    const toy = gameWith('dog', ['cold'])
    give(toy, 'blanket')
    run(toy, 10)
    press(toy, room, door)
    tap(toy)
    let carried = 0, walked = 0
    run(toy, COMING_SECONDS, (items) => {
      const leaver = figures(items, 'leaving')[0]
      if (!leaver) return
      walked++
      const held = things(items, 'blanket').find((item) => Math.hypot(item.x - leaver.x, item.y - leaver.y) < 80)
      if (held) { carried++; expect(items.indexOf(held)).toBeGreaterThan(items.indexOf(leaver)) }
    })
    expect(walked).toBeGreaterThan(60)
    expect(carried).toBe(walked)
    expect(toy.clinic.garden[toy.clinic.garden.length - 1]).toEqual({ species: 'dog', keeps: ['blanket'] })
  })
})

describe('what the second reading found', () => {
  const mouseOf = (items: Item[]) => items.find((item) => item.kind === 'mouse') as Extract<Item, { kind: 'mouse' }>

  it('lays a plaster let go on the floor in front of the table, never in the hiding place, and it slides there', () => {
    for (const species of SPECIES) {
      const toy = gameWith(species, ['scared'])
      run(toy, 0.5)
      press(toy, room, lies(toy, room, 'plaster')!)
      const letGo = { x: 880, y: room.waiting.y + 90 }
      drag(toy, room, letGo)
      run(toy, 0.4)
      drop(toy, room)
      expect(toy.clinic.things.plasters).toEqual(['floor'])
      const far: number[] = []
      run(toy, 2, (items) => {
        const hider = items.find((item) => (item.kind === 'figure' && item.who === 'patient') || (item.kind === 'part' && item.part === 'ball')) as { x: number; y: number }
        const plaster = things(items, 'plaster').find((item) => item.look === 'one')!
        far.push(Math.hypot(plaster.x - letGo.x, plaster.y - letGo.y))
        // Clear of the dark under the table and of whoever is in it.
        expect(plaster.y, species).toBeGreaterThan(room.hide.y + 20)
        expect(Math.hypot(plaster.x - hider.x, plaster.y - (hider.y - 40)), species).toBeGreaterThan(48)
      })
      expect(far[0]).toBeLessThan(40)
      for (let frame = 1; frame < far.length; frame++) expect(far[frame] - far[frame - 1]).toBeLessThan(45)
    }
  })

  it('has the animal on the table answer a pair: it looks over with a start and then plays its own flourish, and with a need it only turns', () => {
    const answer = (toy: Toy) => {
      const calm: { x: number; y: number; rot: number }[] = [], during: typeof calm = []
      const at = (items: Item[]) => { const figure = figures(items, 'patient')[0]; return { x: figure.x, y: figure.y, rot: figure.rot } }
      run(toy, 2, (items) => calm.push(at(items)))
      press(toy, room, lies(toy, room, 'brush')!)
      drag(toy, room, lies(toy, room, 'bowl')!)
      drop(toy, room)
      expect(toy.act.secret ?? toy.scene).toBeTruthy()
      const faces = new Set<string>()
      run(toy, SECRET_SECONDS, (items) => { during.push(at(items)); faces.add(figures(items, 'patient')[0].face) })
      const reach = (track: typeof calm) => Math.max(...track.map((pose) => Math.abs(pose.x - room.patient.x) + Math.abs(pose.y - room.patient.y) + 100 * Math.abs(pose.rot)))
      return { calm: reach(calm), during: reach(during), faces }
    }
    const well = gameWith('dog', ['cold'])
    give(well, 'blanket')
    run(well, 10)
    const played = answer(well)
    expect(played.during).toBeGreaterThan(played.calm + 15)
    expect(played.faces.has('wow')).toBe(true)
    const needy = answer(gameWith('dog', ['cold']))
    expect(needy.faces).toEqual(new Set(['miserable']))
  })

  it('has the mouse straighten a thing that comes back to the cart: it leans to it, and the thing is jogged in its place', () => {
    const toy = gameWith('dog', ['cold'])
    run(toy, 0.5)
    const calm = mouseOf(scene(toy, room, garden, QUIET_GUIDE))
    press(toy, room, lies(toy, room, 'brush')!)
    drag(toy, room, { x: room.cart.brush.x + 30, y: room.cart.brush.y - 20 })
    run(toy, 0.3)
    drop(toy, room)
    expect(toy.clinic.things.brush).toBe('cart')
    expect(toy.tidied?.care).toBe('brush')
    let leaned = 0, jogged = 0
    run(toy, 1.2, (items) => {
      const mouse = mouseOf(items)
      // The brush lies to the left of the mouse and below it: the mouse leans that way.
      leaned = Math.max(leaned, calm.x - mouse.x)
      jogged = Math.max(jogged, Math.abs(things(items, 'brush')[0].rot))
    })
    expect(leaned).toBeGreaterThan(8)
    expect(jogged).toBeGreaterThan(0.05)
    expect(toy.tidied).toBeNull()
    expect(things(scene(toy, room, garden, QUIET_GUIDE), 'brush')[0].rot).toBe(0)
  })

  it('has the one who waits look about the room, and turn to the table while something happens there', () => {
    const toy = gameWith('dog', ['cold'])
    toy.clinic = { ...toy.clinic, waiting: { ...toy.clinic.waiting, needs: [{ need: 'sore', step: QUIET, met: false }] } }
    const turns = (seconds: number) => { const rots: number[] = []; run(toy, seconds, (items) => rots.push(figures(items, 'waiting')[0].rot)); return rots }
    const idle = turns(14)
    // It looks about: it turns one way and the other while nothing is touched.
    expect(Math.max(...idle) - Math.min(...idle)).toBeGreaterThan(0.04)
    const before = idle.reduce((sum, rot) => sum + rot, 0) / idle.length
    give(toy, 'bowl')
    const watching = turns(2).slice(40)
    // Something is happening on the table: it is turned that way for as long.
    expect(Math.min(...watching)).toBeGreaterThan(before + 0.03)
  })

  it('shows the one paw a well cat dips in the bowl and shakes dry, and no paw on any other animal given a bowl', () => {
    for (const species of SPECIES) {
      const toy = gameWith(species, ['cold'])
      give(toy, 'blanket')
      run(toy, 10)
      give(toy, 'bowl')
      const paws: Extract<Item, { kind: 'part' }>[] = []
      run(toy, 6, (items) => paws.push(...(parts(items, 'paw') as Extract<Item, { kind: 'part' }>[])))
      if (species !== 'cat') { expect(paws, species).toHaveLength(0); continue }
      expect(paws.length / 60).toBeGreaterThan(1)
      // It reaches the bowl, which stands at the cat's side, and it is turned many ways as it is shaken.
      const bowl = things(scene(toy, room, garden, QUIET_GUIDE), 'bowl')[0]
      expect(Math.min(...paws.map((paw) => Math.abs(paw.x - bowl.x)))).toBeLessThan(40)
      expect(Math.max(...paws.map((paw) => paw.rot)) - Math.min(...paws.map((paw) => paw.rot))).toBeGreaterThan(1.5)
    }
  })

  it('keeps the one that shivers pressed to the warm hand while the finger stays, and lets the shaking come back when it lifts', () => {
    const shake = (toy: Toy) => { const xs: number[] = []; run(toy, 0.5, (items) => xs.push(figures(items, 'patient')[0].x)); let jitter = 0; for (let frame = 1; frame < xs.length; frame++) jitter += Math.abs(xs[frame] - xs[frame - 1]); return jitter / xs.length }
    const toy = gameWith('dog', ['cold'])
    const before = shake(toy)
    press(toy, room, { x: room.patient.x, y: room.patient.y - 80 })
    run(toy, 2.5)
    // Held for five more seconds: the cell does not run on, and the shaking stays eased.
    const held = toy.cell!.since
    run(toy, 5)
    expect(toy.cell!.since).toBe(held)
    expect(shake(toy)).toBeLessThan(before * 0.5)
    tap(toy)
    run(toy, 3)
    expect(toy.cell).toBeNull()
    expect(shake(toy)).toBeGreaterThan(before * 0.7)
    // A quick tap plays the cell through by itself.
    press(toy, room, { x: room.patient.x, y: room.patient.y - 80 })
    tap(toy)
    run(toy, 6)
    expect(toy.cell).toBeNull()
    expect(showing(toy.clinic.table!)).toMatchObject({ need: 'cold', step: PLAIN })
  })

  it('sends the one that hides back in at a second quick touch, once it has crept a step out to the finger', () => {
    const lean = (toy: Toy, seconds: number) => { let out = 0; run(toy, seconds, (items) => { const hider = items.find((item) => item.kind === 'figure' && item.who === 'patient') as { x: number } | undefined; if (hider) out = Math.max(out, room.hide.x - hider.x) }); return out }
    const under: Vec = { x: room.hide.x, y: room.hide.y - 60 }
    const toy = gameWith('rabbit', ['scared'], QUIET)
    press(toy, room, under)
    tap(toy)
    expect(lean(toy, 1.2)).toBeGreaterThan(20)
    const playing = toy.cell!.since
    press(toy, room, under)
    tap(toy)
    // It is the same cell, moved on to where it draws back: within half a second it is in again.
    expect(toy.cell!.since).toBeGreaterThan(playing)
    run(toy, 0.6)
    expect(lean(toy, 0.3)).toBeLessThan(8)
    // Left alone instead, it stays out for a good while before it goes back by itself.
    const patient = gameWith('rabbit', ['scared'], QUIET)
    press(patient, room, under)
    tap(patient)
    run(patient, 1.2)
    expect(lean(patient, 0.4)).toBeGreaterThan(20)
    expect(showing(toy.clinic.table!)).toMatchObject({ need: 'scared', step: QUIET })
  })
})

describe('what the third reading found', () => {
  it('lays a thing that did not fit beside the animal on the table, at one of its two ends, and back on the cart after that: never on the floor under it', () => {
    for (const species of ['dog', 'bear'] as Species[]) {
      const toy = gameWith(species, ['sore'])
      const places: string[] = []
      for (const care of ['bowl', 'blanket', 'brush', 'basket'] as const) { give(toy, care); run(toy, 7); places.push(toy.clinic.things[care]) }
      expect(places, species).toEqual(['table-left', 'table-right', 'cart', 'cart'])
      for (const place of Object.values(toy.clinic.things)) expect(String(place).startsWith('floor')).toBe(false)
    }
  })

  it('takes a stroke by the spot it lands on with a need too: it melts on the one it loves and wriggles on the other, and its sign and step stay', () => {
    for (const species of SPECIES) {
      const body = room.bodies[species], { strokeLoved, strokeSquirms } = CAST[species]
      const stroked = (spot: { x: number; y: number } | null) => {
        const toy = gameWith(species, ['cold'])
        run(toy, 0.3)
        takeSounds(toy)
        // Elsewhere: a place on the body that is in neither spot.
        const at = spot ?? [{ x: 0, y: -body.h * 0.5 }, { x: 0, y: -body.h * 0.3 }, { x: 0, y: -body.h * 0.75 }, { x: body.right * 0.5, y: -body.h * 0.45 }].find((point) => strokeAt(species, body, point) === 'leans')!
        press(toy, room, { x: room.patient.x + at.x, y: room.patient.y + at.y })
        tap(toy)
        const heard = takeSounds(toy).length, faces = new Set<string>()
        run(toy, 0.7, (items) => faces.add(figures(items, 'patient')[0].face))
        expect(showing(toy.clinic.table!), species).toMatchObject({ need: 'cold', step: PLAIN })
        expect(toy.clinic.table!.wrong).toBe(0)
        return { faces, heard, manner: toy.touched?.manner }
      }
      const loved = stroked(body.spots[strokeLoved]![0]), squirm = stroked(body.spots[strokeSquirms]![0]), elsewhere = stroked(null)
      expect(loved.manner, species).toBe('loved')
      expect(loved.faces.has('bliss'), species).toBe(true)
      expect(squirm.manner, species).toBe('squirms')
      expect(squirm.faces.has('wow'), species).toBe(true)
      expect(elsewhere.manner, species).toBe('leans')
      expect(elsewhere.faces.has('bliss') || elsewhere.faces.has('wow'), species).toBe(false)
      // A spot is heard as well: the animal's own call on top of the stroke's voice.
      expect(loved.heard).toBeGreaterThan(elsewhere.heard)
      expect(squirm.heard).toBeGreaterThan(elsewhere.heard)
    }
  })

  it('keeps the next one in view at the door through a coming in: from a quarter of a second on it is there, behind the one going in, and steps up once that one is on the table', () => {
    const toy = gameWith('dog', ['cold'])
    give(toy, 'blanket')
    run(toy, 10)
    const before = toy.clinic.waiting.species
    press(toy, room, door)
    tap(toy)
    const next = toy.clinic.waiting.species
    expect(next).not.toBe(before)
    let frame = 0
    run(toy, COMING_SECONDS + 0.2, (items) => {
      frame++
      const waiting = figures(items, 'waiting')
      expect(waiting, `frame ${frame}`).toHaveLength(1)
      expect(waiting[0].species).toBe(next)
      if (frame > 15) expect(waiting[0].alpha, `frame ${frame}`).toBe(1)
      // In the doorway: at the door's place or up the path behind it, never off to a side.
      expect(Math.abs(waiting[0].x - room.waiting.x)).toBeLessThan(30)
      expect(waiting[0].y).toBeLessThanOrEqual(room.waiting.y + 1)
      // While the one before it walks in, the next one is drawn behind it.
      const going = figures(items, 'patient')[0]
      if (going && toy.coming && toy.coming.since < SEATED_AT - 0.05) expect(items.indexOf(waiting[0])).toBeLessThan(items.indexOf(going))
    })
    const there = figures(scene(toy, room, garden, QUIET_GUIDE), 'waiting')[0]
    expect(Math.abs(there.y - room.waiting.y)).toBeLessThan(20)
    expect(there.size).toBe(1)
  })

  it('dips the sore paw in the bowl for every animal, large or small: the paw is over the water, pointing down', () => {
    for (const species of SPECIES) {
      const toy = gameWith(species, ['sore'])
      give(toy, 'bowl')
      let nearest = Infinity, turned = 0
      run(toy, 4, (items) => {
        const paw = (parts(items, 'paw') as Extract<Item, { kind: 'part' }>[])[0], bowl = things(items, 'bowl')[0]
        if (!paw || !bowl) return
        if (Math.abs(paw.x - bowl.x) < nearest) { nearest = Math.abs(paw.x - bowl.x); turned = paw.rot }
      })
      // Within the bowl's own width, and turned well over half way round from standing up.
      expect(nearest, species).toBeLessThan(30)
      expect(Math.abs(turned), species).toBeGreaterThan(2)
    }
  })

  it('clears the hiding place before an animal hides there: a thing the child put on the floor slides out of its way', () => {
    const toy = gameWith('bear', ['sore', 'scared'])
    run(toy, 0.5)
    // With fear still to come, the floor under the table takes nothing.
    press(toy, room, lies(toy, room, 'brush')!)
    drag(toy, room, { x: room.spots['floor-left'].x, y: room.spots['floor-left'].y })
    drop(toy, room)
    expect(toy.clinic.things.brush.startsWith('floor')).toBe(false)
    // A room that holds one there all the same, as an older save may: it is moved as the animal goes under.
    toy.clinic = { ...toy.clinic, things: { ...toy.clinic.things, brush: 'floor-left', bowl: 'floor-right' } }
    give(toy, 'plaster')
    let nearest = Infinity
    run(toy, 12, (items) => {
      if (!toy.hid || toy.t - toy.hidAt < 1) return
      const hider = figures(items, 'patient')[0]
      for (const care of ['brush', 'bowl'] as const) for (const thing of things(items, care)) nearest = Math.min(nearest, Math.hypot(thing.x - hider.x, thing.y - (hider.y - 50)))
    })
    expect(toy.hid).toBe(true)
    expect(toy.clinic.things.brush.startsWith('floor')).toBe(false)
    expect(toy.clinic.things.bowl.startsWith('floor')).toBe(false)
    expect(nearest).toBeGreaterThan(90)
  })
})

describe('what the fourth reading found', () => {
  const ones = (items: Item[]) => things(items, 'plaster').filter((item) => item.look !== 'whole' && !item.kept)

  it('shows a plaster that did not fit once: the cell draws it, and it comes to rest on the table\'s end, tipped, without a jump', () => {
    for (const need of ['cold', 'itchy', 'thirsty'] as Need[]) {
      for (const species of ['dog', 'hedgehog'] as Species[]) {
        const toy = gameWith(species, [need])
        give(toy, 'plaster')
        let last: { x: number; y: number; rot: number } | null = null, furthest = 0
        run(toy, 8, (items) => {
          const drawn = ones(items)
          expect(drawn.length, `${species} ${need}`).toBe(1)
          if (last) furthest = Math.max(furthest, Math.hypot(drawn[0].x - last.x, drawn[0].y - last.y))
          last = drawn[0]
        })
        expect(toy.clinic.things.plasters).toEqual(['table'])
        expect(furthest, `${species} ${need}`).toBeLessThan(60)
        // Where it lies it is tipped: a lone plaster is never level.
        expect(Math.abs(Math.sin(last!.rot))).toBeGreaterThan(0.2)
        // A second wrong plaster, while the first lies there: the two never overlap at different tilts.
        give(toy, 'plaster')
        run(toy, 8, (items) => {
          const drawn = ones(items)
          for (let a = 0; a < drawn.length; a++) for (let b = a + 1; b < drawn.length; b++) {
            const same = Math.abs(drawn[a].x - drawn[b].x) < 0.01 && Math.abs(drawn[a].y - drawn[b].y) < 0.01 && Math.abs(drawn[a].rot - drawn[b].rot) < 0.01
            if (!same) expect(Math.hypot(drawn[a].x - drawn[b].x, drawn[a].y - drawn[b].y), `${species} ${need}`).toBeGreaterThan(40)
          }
        })
      }
    }
  })

  it('shows what two things made on the thing wherever the thing is: lying, in the hand, in the air, in a cell and on the animal', () => {
    const toy = gameWith('dog', ['cold'])
    toy.clinic = { ...toy.clinic, made: { ...toy.clinic.made, foam: true, boat: true, patches: 3 } }
    // The boat and the three patches are the four small plasters that ride on a thing.
    const madeOf = (items: Item[]) => ({ foam: parts(items, 'foam').length, small: things(items, 'plaster').filter((item) => item.kept).length })
    expect(madeOf(scene(toy, room, garden, QUIET_GUIDE)), 'lying').toEqual({ foam: 1, small: 4 })
    // The bowl in the hand: the boat and the foam go with it.
    press(toy, room, lies(toy, room, 'bowl')!)
    drag(toy, room, { x: 500, y: 200 })
    run(toy, 0.3, (items) => {
      expect(madeOf(items), 'bowl in the hand').toEqual({ foam: 1, small: 4 })
      const bowl = things(items, 'bowl')[0], foam = parts(items, 'foam')[0] as Extract<Item, { kind: 'part' }>
      expect(Math.hypot(foam.x - bowl.x, foam.y - bowl.y)).toBeLessThan(40)
    })
    cancel(toy)
    // The blanket in the hand, in the air, under the animal as it is warmed, and in its lap afterwards.
    press(toy, room, lies(toy, room, 'blanket')!)
    expect(madeOf(scene(toy, room, garden, QUIET_GUIDE)), 'blanket in the hand').toEqual({ foam: 1, small: 4 })
    tap(toy)
    run(toy, 12, (items) => expect(madeOf(items).small, 'blanket given').toBe(4))
    expect(toy.clinic.things.blanket).toBe('patient')
    // The bowl on a well animal: the boat sails wherever the animal takes the bowl. The foam is drunk, once.
    press(toy, room, lies(toy, room, 'bowl')!)
    tap(toy)
    run(toy, 8, (items) => expect(madeOf(items).small, 'bowl given').toBe(4))
    // A thing an animal took away with it shows none of it: the patches are on the room's blanket, back on the cart.
    press(toy, room, door)
    tap(toy)
    run(toy, COMING_SECONDS + 1)
    expect(toy.clinic.garden[toy.clinic.garden.length - 1].keeps).toContain('blanket')
    const after = scene(toy, room, garden, QUIET_GUIDE)
    expect(things(after, 'blanket').filter((item) => item.kept)).toHaveLength(1)
    expect(madeOf(after).small).toBe(4)
  })

  it('keeps the sheet of plasters on the cart whatever one plaster does: let go on the floor, at the lamp, or nosed back at the door', () => {
    const sheet = (items: Item[]) => things(items, 'plaster').filter((item) => item.look === 'whole')
    for (const where of [{ x: 880, y: room.waiting.y + 90 }, { x: room.lamp.x, y: room.lamp.y }, { x: room.waiting.x, y: room.waiting.y - 80 }]) {
      const toy = gameWith('dog', ['cold'])
      toy.clinic = { ...toy.clinic, waiting: { ...toy.clinic.waiting, needs: [{ need: 'sore', step: PLAIN, met: false }] } }
      run(toy, 0.3)
      press(toy, room, lies(toy, room, 'plaster')!)
      drag(toy, room, where)
      run(toy, 0.3)
      drop(toy, room)
      run(toy, 2, (items) => {
        expect(sheet(items)).toHaveLength(1)
        expect(sheet(items)[0]).toMatchObject({ x: room.cart.plaster.x, y: room.cart.plaster.y })
      })
    }
    // Nosed back, the one plaster is seen to slide back to its sheet, and then only the sheet is there.
    const toy = gameWith('dog', ['cold'])
    toy.clinic = { ...toy.clinic, waiting: { ...toy.clinic.waiting, needs: [{ need: 'sore', step: PLAIN, met: false }] } }
    press(toy, room, lies(toy, room, 'plaster')!)
    drag(toy, room, { x: room.waiting.x, y: room.waiting.y - 80 })
    run(toy, 0.3)
    drop(toy, room)
    expect(toy.doorPlay?.manner).toBe('nosed')
    let slid = 0
    run(toy, 1, (items) => { slid += ones(items).length })
    expect(slid).toBeGreaterThan(30)
    run(toy, 1)
    expect(ones(scene(toy, room, garden, QUIET_GUIDE))).toHaveLength(0)
    expect(toy.clinic.things.plasters).toEqual([])
  })

  it('lets the cloth go on rustling for as long as the blanket moves over a hiding place: it is heard again at every beat of the cell', () => {
    for (const species of ['bear', 'hedgehog'] as Species[]) {
      const toy = gameWith(species, ['scared'])
      press(toy, room, lies(toy, room, 'blanket')!)
      tap(toy)
      const heardAt: number[] = []
      let stillAt = 0
      for (let frame = 0; frame < 6 * 60; frame++) {
        step(toy, room, FRAME)
        if (takeSounds(toy).length > 0) heardAt.push(toy.t)
        if (toy.cell && toy.cell.since < 3.6 * 0.5 / (0.55 + 0.45 * (CAST[species].tempo / 3.2))) stillAt = toy.t
      }
      // Something is heard at least five times, and the last of them within three quarters of a second of the cloth lying still.
      expect(heardAt.length, species).toBeGreaterThanOrEqual(5)
      expect(stillAt - heardAt[heardAt.length - 1], species).toBeLessThan(0.75)
      for (let index = 1; index < heardAt.length; index++) if (heardAt[index] <= stillAt) expect(heardAt[index] - heardAt[index - 1], species).toBeLessThan(1.3)
    }
  })

  it('has the dog back right round the plaster it is wary of: behind it, out past it and in front of it, at a distance', () => {
    const toy = gameWith('dog', ['cold'])
    give(toy, 'blanket')
    run(toy, 10)
    press(toy, room, lies(toy, room, 'plaster')!)
    tap(toy)
    const round: { dx: number; dy: number }[] = []
    run(toy, 8, (items) => {
      const dog = figures(items, 'patient')[0], plaster = ones(items)[0]
      if (toy.playing && plaster) round.push({ dx: dog.x - plaster.x, dy: dog.y - (plaster.y + room.bodies.dog.anchors.lap.y * -1) })
    })
    // On the far side of it and on the near side, to the left of it and to the right.
    expect(Math.min(...round.map((at) => at.dx))).toBeLessThan(-40)
    expect(Math.max(...round.map((at) => at.dx))).toBeGreaterThan(40)
    expect(Math.min(...round.map((at) => at.dy))).toBeLessThan(-8)
    expect(Math.max(...round.map((at) => at.dy))).toBeGreaterThan(8)
  })
})

describe('what the seventh reading found', () => {
  it('takes a touch on a thing that lies on an animal with a need as a stroke: nothing is given and nothing is counted, and a drag takes the thing off', () => {
    for (const species of SPECIES) {
      const toy = gameWith(species, ['cold', 'itchy'])
      give(toy, 'blanket')
      run(toy, 12)
      expect(toy.clinic.things.blanket, species).toBe('patient')
      expect(needOnTable(toy)).toBe('itchy')
      const before = JSON.stringify(serializeClinic(toy.clinic))
      // A tap right on the blanket in its lap, where the idle hand shows a stroke.
      press(toy, room, lies(toy, room, 'blanket')!)
      expect(toy.hand, species).toBeNull()
      expect(toy.cell?.track.given, species).toBe('hand')
      tap(toy)
      run(toy, 6)
      expect(JSON.stringify(serializeClinic(toy.clinic)), species).toBe(before)
      // A drag from the same place takes it off the animal, and it can be put down.
      press(toy, room, lies(toy, room, 'blanket')!)
      drag(toy, room, { x: 800, y: 260 })
      expect(toy.hand?.care, species).toBe('blanket')
      expect(toy.cell).toBeNull()
      cancel(toy)
    }
    // On a well animal a thing it wears is taken at a touch, as in the toy: every touch works.
    const well = gameWith('dog', ['cold'])
    give(well, 'blanket')
    run(well, 12)
    press(well, room, lies(well, room, 'blanket')!)
    expect(well.hand?.care).toBe('blanket')
  })

  it('finds a thing on an animal that hides where it is drawn, under the table: a touch on the bare table top takes nothing and gives nothing', () => {
    for (const species of ['bear', 'rabbit'] as Species[]) {
      const toy = gameWith(species, ['scared', 'cold'])
      give(toy, 'blanket')
      run(toy, 12)
      expect(toy.hid).toBe(true)
      expect(toy.clinic.things.blanket).toBe('patient')
      const at = lies(toy, room, 'blanket')!
      // Where the scene draws it, to within the animal's own small moves.
      const drawn = things(scene(toy, room, garden, QUIET_GUIDE), 'blanket')[0]
      expect(Math.abs(drawn.x - at.x), species).toBeLessThan(30)
      expect(at.y, species).toBeGreaterThan(room.patient.y + 20)
      const before = JSON.stringify(serializeClinic(toy.clinic))
      // The table top, where the blanket would lie on an animal that sat there.
      press(toy, room, { x: room.patient.x, y: room.patient.y - 30 })
      tap(toy)
      run(toy, 3)
      expect(toy.hand).toBeNull()
      expect(JSON.stringify(serializeClinic(toy.clinic)), species).toBe(before)
    }
  })

  it('sticks a plaster that did not fit on the front edge of the table, clear of a thing that lies at that end', () => {
    const toy = gameWith('dog', ['cold'])
    give(toy, 'bowl')
    run(toy, 7)
    give(toy, 'brush')
    run(toy, 7)
    for (const _ of [0, 1]) { give(toy, 'plaster'); run(toy, 7) }
    expect(toy.clinic.things).toMatchObject({ bowl: 'table-left', brush: 'table-right', plasters: ['table', 'table-far'] })
    const items = scene(toy, room, garden, QUIET_GUIDE)
    const stuck = things(items, 'plaster').filter((item) => item.look === 'one')
    expect(stuck).toHaveLength(2)
    for (const plaster of stuck) {
      for (const care of ['bowl', 'brush'] as const) {
        const thing = things(items, care)[0]
        // Below the thing's own drawing, or well to the side of it.
        expect(plaster.y - thing.y > 50 || Math.abs(plaster.x - thing.x) > 110, `${care}`).toBe(true)
      }
      expect(plaster.y).toBeGreaterThan(room.patient.y)
    }
  })

  it('brushes three burrs out one by one with a pop for each, at every step of the sign, and the thumping purr as the foot starts to thump', () => {
    for (const step of [QUIET, PLAIN, OPEN] as const) {
      const toy = gameWith('bear', ['itchy'], step)
      run(toy, 0.5)
      expect(parts(scene(toy, room, garden, QUIET_GUIDE), 'burr')).toHaveLength(3)
      press(toy, room, lies(toy, room, 'brush')!)
      tap(toy)
      takeSounds(toy)
      // The beat of the cell at which each sound comes, and how many burrs are in the fur at each beat.
      const beat = 0.5 / (0.55 + 0.45 * (CAST.bear.tempo / 3.2))
      const heardAt: number[] = [], inFur: [number, number][] = []
      for (let frame = 0; frame < 5 * 60; frame++) {
        step_(toy)
        if (!toy.cell && !toy.scene) continue
        const at = (toy.cell?.since ?? 0) / beat
        if (takeSounds(toy).length > 0) heardAt.push(at)
        inFur.push([at, parts(scene(toy, room, garden, QUIET_GUIDE), 'burr').length])
      }
      // Three pops between the landing and the purr, at the beats at which a burr starts to fly.
      const pops = heardAt.filter((at) => at > 0.6 && at < 3)
      expect(pops, `step ${step}`).toHaveLength(3)
      for (const [index, at] of [1, 1.53, 2.07].entries()) expect(Math.abs(pops[index] - at), `step ${step}`).toBeLessThan(0.08)
      // All three are in the fur until the first pop, and none is left a beat after the last.
      for (const [at, count] of inFur) {
        if (at > 0 && at < 0.95) expect(count, `step ${step} at beat ${at.toFixed(2)}`).toBe(3)
        if (at > 3.1 && at < 4) expect(count, `step ${step} at beat ${at.toFixed(2)}`).toBe(0)
      }
      // The purr comes as the foot starts to thump.
      expect(heardAt.some((at) => at > 3.3 && at < 3.6), `step ${step}`).toBe(true)
    }
  })

  it('lifts the den like any other thing: in the hand and in the air it is the lifted den', () => {
    const toy = gameWith('dog', ['thirsty'])
    toy.clinic = { ...toy.clinic, things: { ...toy.clinic.things, blanket: 'on-basket' }, made: { ...toy.clinic.made, den: true } }
    expect(parts(scene(toy, room, garden, QUIET_GUIDE), 'den')).toHaveLength(1)
    press(toy, room, lies(toy, room, 'basket')!)
    expect(parts(scene(toy, room, garden, QUIET_GUIDE), 'denLifted')).toHaveLength(1)
    expect(parts(scene(toy, room, garden, QUIET_GUIDE), 'den')).toHaveLength(0)
    tap(toy)
    step(toy, room, FRAME)
    expect(parts(scene(toy, room, garden, QUIET_GUIDE), 'denLifted')).toHaveLength(1)
  })
})

describe('the den that helps as its blanket', () => {
  it('is saved as the well scene starts: the blanket on the patient, the basket where it came to rest, and no den in what was made', () => {
    for (const lay of ['cart', 'table-right'] as const) {
      const toy = gameWith('cat', ['cold'])
      toy.clinic = { ...toy.clinic, things: { ...toy.clinic.things, basket: lay, blanket: 'on-basket' }, made: { ...toy.clinic.made, den: true } }
      run(toy, 0.3)
      takeSave(toy)
      press(toy, room, lies(toy, room, 'basket')!)
      tap(toy)
      // Up to the frame in which the den lands.
      let frames = 0
      while (!toy.scene && frames++ < 60) step(toy, room, FRAME)
      expect(toy.scene, lay).not.toBeNull()
      // In that same frame the room holds the outcome, and a save at once is asked for.
      expect(toy.clinic.things, lay).toMatchObject({ blanket: 'patient', basket: lay })
      expect(toy.clinic.made.den, lay).toBe(false)
      expect(toy.clinic.table!.needs, lay).toEqual([{ need: 'cold', step: PLAIN, met: true }])
      expect(toy.clinic.finished).toBe(true)
      expect(takeSave(toy)).toBe(2)
      // Put away in that frame and opened again: the room is found so, with nothing to replay.
      const slot = JSON.parse(JSON.stringify(serializeClinic(toy.clinic)))
      const opened = freshToy(deserializeClinic(slot, null, SEED), false)
      expect(opened.clinic.things).toMatchObject({ blanket: 'patient', basket: lay })
      expect(opened.clinic.made.den).toBe(false)
      expect(isWell(opened.clinic.table!)).toBe(true)
      run(opened, 1, (items) => { expect(parts(items, 'den')).toHaveLength(0); expect(things(items, 'basket')).toHaveLength(1) })
      expect(opened.scene).toBeNull()
      // Played on, the basket is seen back where it lay and the blanket is on the animal.
      run(toy, 10)
      expect(lies(toy, room, 'basket')).toEqual(lay === 'cart' ? room.cart.basket : room.spots[lay])
      expect(things(scene(toy, room, garden, QUIET_GUIDE), 'blanket').filter((item) => !item.kept)).toHaveLength(1)
    }
  })

  it('stays a den where it helped as its basket: nothing of what was made changes when the well scene starts', () => {
    const toy = gameWith('rabbit', ['scared'])
    toy.clinic = { ...toy.clinic, things: { ...toy.clinic.things, blanket: 'on-basket' }, made: { ...toy.clinic.made, den: true } }
    const made = toy.clinic.made
    press(toy, room, lies(toy, room, 'basket')!)
    tap(toy)
    let frames = 0
    while (!toy.scene && frames++ < 60) step(toy, room, FRAME)
    expect(toy.clinic.made).toEqual(made)
    expect(toy.clinic.things).toMatchObject({ basket: 'patient', blanket: 'on-basket' })
  })
})

describe('what the sixth reading found', () => {
  it('noses a den back at the door from one that is cold or afraid: the den is both of its things there too', () => {
    for (const need of ['cold', 'scared', 'thirsty'] as Need[]) {
      const toy = gameWith('bear', ['sore'])
      toy.clinic = { ...toy.clinic, things: { ...toy.clinic.things, blanket: 'on-basket' }, made: { ...toy.clinic.made, den: true }, waiting: { ...toy.clinic.waiting, needs: [{ need, step: PLAIN, met: false }] } }
      press(toy, room, lies(toy, room, 'basket')!)
      drag(toy, room, { x: room.waiting.x, y: room.waiting.y - 80 })
      drop(toy, room)
      expect(toy.doorPlay?.manner === 'nosed', need).toBe(need !== 'thirsty')
      expect(toy.clinic.made.den).toBe(true)
    }
  })

  it('saves a first visit as soon as it is laid out, and a room that reads back as it was saved not at all', () => {
    const first = freshClinic(null, SEED)
    expect(differsFromSlot(null, first)).toBe(true)
    expect(differsFromSlot(undefined, first)).toBe(true)
    const stored = JSON.parse(JSON.stringify(serializeClinic(first)))
    expect(differsFromSlot(stored, deserializeClinic(stored, null, 999))).toBe(false)
    // Opened again from that save, the same one waits, whatever seed the new visit would have drawn.
    expect(deserializeClinic(stored, null, 999).waiting).toEqual(first.waiting)
    // A save that had to be repaired is written back.
    expect(differsFromSlot({ ...stored, things: 'gone' }, deserializeClinic({ ...stored, things: 'gone' }, null, 999))).toBe(true)
  })

  it('shows the taste when a care helps and another need is left: the dog sniffs the plaster that helped its paw before its other need has it again', () => {
    const toy = gameWith('dog', ['sore', 'cold'])
    give(toy, 'plaster')
    let sniffing = 0, bare = 0
    run(toy, 9, (items) => {
      if (!toy.aside) return
      const dog = figures(items, 'patient')[0]
      if (dog.x > room.patient.x + 18 && dog.face === 'wary') sniffing++
      // For that moment nothing of a sign is on it.
      bare += parts(items, 'arms').length + parts(items, 'paw').length
    })
    expect(sniffing / 60).toBeGreaterThan(0.4)
    expect(bare).toBe(0)
    expect(toy.aside).toBeNull()
    expect(needOnTable(toy)).toBe('cold')
    // Each taste has its moment: one that loves the thing melts, and any other is plainly glad.
    for (const [species, need, care, face] of [['rabbit', 'cold', 'blanket', 'bliss'], ['bear', 'thirsty', 'bowl', 'glad']] as const) {
      const other = gameWith(species, [need, 'itchy'])
      give(other, care)
      const faces = new Set<string>()
      run(other, 9, (items) => { if (other.aside) faces.add(figures(items, 'patient')[0].face) })
      expect(faces.has(face), species).toBe(true)
    }
  })

  it('bristles the curled hedgehog too when the brush comes near: its spines stand out behind the ball', () => {
    const toy = gameWith('hedgehog', ['scared'], QUIET)
    give(toy, 'brush')
    let bristled = 0
    run(toy, 4, (items) => {
      const ball = items.findIndex((item) => item.kind === 'part' && item.part === 'ball'), fur = items.findIndex((item) => item.kind === 'part' && item.part === 'fur')
      if (ball >= 0 && fur >= 0) { bristled++; expect(fur).toBeLessThan(ball) }
    })
    expect(bristled / 60).toBeGreaterThan(0.3)
  })

  it('hangs the long tongue of the one that droops right down to the table, however tall the animal', () => {
    for (const species of SPECIES) {
      const toy = gameWith(species, ['thirsty'], OPEN)
      toy.clinic = { ...toy.clinic, waiting: { ...toy.clinic.waiting, needs: [{ need: 'thirsty', step: OPEN, met: false }] } }
      run(toy, 0.5)
      const tongues = parts(scene(toy, room, garden, QUIET_GUIDE), 'tongue2') as Extract<Item, { kind: 'part' }>[]
      expect(tongues, species).toHaveLength(2)
      // The tip of each reaches what its animal sits on, the table, and the floor at the door: never short of it, and
      // on the smallest animal, whose mouth is nearly on the table, it lies a little way over the edge.
      const tips = tongues.map((tongue) => tongue.y + 72 * tongue.sy).sort((a, b) => a - b)
      for (const [tip, ground] of [[tips[0], room.patient.y], [tips[1], room.waiting.y]]) {
        expect(tip, species).toBeGreaterThan(ground - 8)
        expect(tip, species).toBeLessThan(ground + 24)
      }
    }
  })

  it('has the mouse straighten a thing that comes back to the cart by itself, once it is there', () => {
    const toy = gameWith('dog', ['sore'])
    for (const care of ['bowl', 'blanket'] as const) { give(toy, care); run(toy, 7) }
    expect(toy.tidied).toBeNull()
    give(toy, 'brush')
    expect(toy.clinic.things.brush).toBe('cart')
    expect(toy.tidied?.care).toBe('brush')
    const mouseOf = (items: Item[]) => items.find((item) => item.kind === 'mouse') as Extract<Item, { kind: 'mouse' }>
    // The brush lies to the left of the mouse: it tips that way, further than it ever sways by itself.
    let leaned = 0
    run(toy, 9, (items) => { if (!toy.cell) leaned = Math.max(leaned, -mouseOf(items).rot) })
    expect(leaned).toBeGreaterThan(0.12)
    expect(toy.tidied).toBeNull()
  })
})

describe('the hand, wherever it lands', () => {
  it('has the animal lean to the hand and never away from it: to the right for a finger on its right, to the left for one on its left', () => {
    for (const need of ['cold', 'sore', 'thirsty'] as Need[]) {
      const lean = (side: number) => {
        const toy = gameWith('bear', [need])
        run(toy, 0.3)
        const before = figures(scene(toy, room, garden, QUIET_GUIDE), 'patient')[0].x
        press(toy, room, { x: room.patient.x + side * 60, y: room.patient.y - 190 })
        let most = 0
        run(toy, 1.6, (items) => { const x = figures(items, 'patient')[0].x - before; if (Math.abs(x) > Math.abs(most)) most = x })
        return most
      }
      expect(lean(1), need).toBeGreaterThan(5)
      expect(lean(-1), need).toBeLessThan(-5)
    }
  })

  it('has the one that limps lay its sore paw in the hand: the paw comes to where the finger is', () => {
    for (const species of ['bear', 'rabbit', 'dog'] as Species[]) {
      const body = room.bodies[species]
      for (const finger of [{ x: body.anchors.side.x + 60, y: -60 }, { x: body.anchors.side.x + 10, y: -90 }]) {
        const toy = gameWith(species, ['sore'])
        run(toy, 0.3)
        const point = { x: room.patient.x + finger.x, y: room.patient.y + finger.y }
        const far = (items: Item[]) => { const paw = (parts(items, 'paw') as Extract<Item, { kind: 'part' }>[])[0]; return Math.hypot(paw.x - point.x, paw.y - (point.y + 30)) }
        const before = far(scene(toy, room, garden, QUIET_GUIDE))
        press(toy, room, point)
        let nearest = Infinity
        run(toy, 2, (items) => { nearest = Math.min(nearest, far(items)) })
        // The wrist comes to just under the finger, so that the paw lies in the hand.
        expect(nearest, species).toBeLessThan(26)
        expect(nearest, species).toBeLessThan(before)
      }
    }
  })
})

describe('the hand', () => {
  it('makes the animal show its sign again, changes nothing and is never counted', () => {
    for (const need of NEEDS) {
      const toy = gameWith('dog', [need], QUIET)
      const before = JSON.stringify(serializeClinic(toy.clinic))
      const at = need === 'scared' ? { x: room.hide.x, y: room.hide.y - 60 } : { x: room.patient.x, y: room.patient.y - 100 }
      press(toy, room, at)
      tap(toy)
      expect(toy.cell?.track, need).toMatchObject({ given: 'hand', need })
      expect(takeSave(toy)).toBe(0)
      run(toy, 5)
      expect(JSON.stringify(serializeClinic(toy.clinic))).toBe(before)
      expect(toy.cell).toBeNull()
    }
  })
})

describe('the sign', () => {
  it('shows in the frame for every animal and need: the tongue, the shiver, the held-up paw, the burrs, the dark under the table', () => {
    for (const species of SPECIES) {
      const seen = (need: Need) => { const toy = gameWith(species, [need]); run(toy, 0.4); const items: Item[] = []; run(toy, 3.2, (frame) => items.push(...frame)); return items }
      expect(parts(seen('thirsty'), 'tongue1').length).toBeGreaterThan(0)
      // At the plain step the one that is cold shivers, with its face; it hugs itself only at the open step.
      expect(parts(seen('cold'), 'arms')).toHaveLength(0)
      const open = gameWith(species, ['cold'], OPEN)
      let hugs = 0
      run(open, 3, (items) => { hugs += parts(items, 'arms').length })
      expect(hugs).toBeGreaterThan(0)
      expect(parts(seen('sore'), 'paw').length).toBeGreaterThan(0)
      expect(parts(seen('itchy'), 'burr').length).toBeGreaterThan(0)
      const hidden = seen('scared')
      expect(parts(hidden, 'shade').length).toBeGreaterThan(0)
      expect(parts(hidden, 'table').length).toBeGreaterThan(0)
      for (const figure of figures(hidden, 'patient')) expect(figure.y, species).toBeGreaterThan(room.patient.y + 60)
    }
  })

  it('is gone once the animal is well: no part of a sign is left on it, and it never looks as if it had a need', () => {
    for (const need of NEEDS) {
      const toy = gameWith('bear', [need])
      give(toy, FITS[need])
      run(toy, 11)
      let left = 0
      // The one who waits has a sign of its own: only the parts on the bear are counted, and the dark under the table.
      run(toy, 6, (items) => { for (const part of ['tongue1', 'tongue2', 'arms', 'paw', 'burr', 'puff']) left += parts(items, part).filter((item) => item.kind === 'part' && item.species === 'bear').length; left += parts(items, 'shade').length })
      expect(left, need).toBe(0)
    }
  })

  it('does not grow while nothing is touched: after a minute it is at the step it was laid out with', () => {
    const toy = gameWith('cat', ['cold'], QUIET)
    run(toy, 60)
    expect(showing(toy.clinic.table!)!.step).toBe(QUIET)
    expect(showing(toy.clinic.waiting)?.step ?? PLAIN).toBe(showing(freshClinic(null, SEED).waiting)!.step)
  })
})

describe('put away in the middle of a drag', () => {
  it('makes no give: the thing is back where it last lay, on the cart or beside the animal, and nothing is judged', () => {
    for (const care of CARES) {
      const toy = gameWith('dog', ['cold'])
      const before = JSON.stringify(serializeClinic(toy.clinic))
      press(toy, room, lies(toy, room, care)!)
      // Dragged right onto the animal and held there.
      drag(toy, room, { x: room.patient.x, y: room.patient.y - 80 })
      run(toy, 0.4)
      settle(toy, room)
      run(toy, 1)
      expect(toy.hand).toBeNull()
      expect(toy.flights).toEqual([])
      expect(JSON.stringify(serializeClinic(toy.clinic)), care).toBe(before)
      expect(lies(toy, room, care)).toEqual(room.cart[care])
      expect(toy.cell).toBeNull()
      expect(toy.scene).toBeNull()
    }
    // One that already lay beside the animal after a miss lies there again.
    const toy = gameWith('dog', ['cold'])
    give(toy, 'bowl')
    run(toy, 6)
    const lay = lies(toy, room, 'bowl')!, saved = JSON.stringify(serializeClinic(toy.clinic))
    expect(lay).not.toEqual(room.cart.bowl)
    press(toy, room, lay)
    drag(toy, room, { x: room.patient.x, y: room.patient.y - 80 })
    settle(toy, room)
    expect(lies(toy, room, 'bowl')).toEqual(lay)
    expect(JSON.stringify(serializeClinic(toy.clinic))).toBe(saved)
  })

  it('still lands a thing the child had already sent, since that give was made', () => {
    const toy = gameWith('dog', ['cold'])
    press(toy, room, lies(toy, room, 'blanket')!)
    tap(toy)
    settle(toy, room)
    expect(isWell(toy.clinic.table!)).toBe(true)
  })
})

describe('a slot last saved by the toy, opened as the game', () => {
  it('keeps the animal on the table, well as it is, lays out one with a need at the door, and plays on from a touch there', () => {
    for (const seed of [1, 2, 3, 7, 99]) {
      // The toy as it opens, and the toy after a visit: things given, one gone to the garden.
      const opened = freshToy(freshClinic(null, seed, true), true)
      const played = freshToy(freshClinic(null, seed, true), true)
      give(played, 'blanket')
      run(played, 3)
      comeIn(played)
      give(played, 'bowl')
      run(played, 3)
      for (const left of [opened, played]) {
        const slot = JSON.parse(JSON.stringify(serializeClinic(left.clinic)))
        const toy = freshToy(deserializeClinic(slot, null, seed), false)
        expect(toy.clinic.table).toEqual(left.clinic.table)
        expect(toy.clinic.waiting.needs.length).toBeGreaterThan(0)
        expect(toy.clinic.carrier).toBeNull()
        run(toy, 1, finite)
        comeIn(toy)
        const table = toy.clinic.table!
        expect(table.needs.length).toBeGreaterThan(0)
        expect(toy.clinic.waiting.needs.length).toBeGreaterThan(0)
        give(toy, FITS[table.needs[0].need])
        run(toy, 10, finite)
        expect(isWell(toy.clinic.table!)).toBe(true)
        comeIn(toy)
        expect(isWell(toy.clinic.table!)).toBe(false)
      }
    }
  })

  it('opens a slot last saved by the game as the toy without a throw, and plays on', () => {
    const game = gameWith('cat', ['itchy'])
    const toy = freshToy(deserializeClinic(JSON.parse(JSON.stringify(serializeClinic(game.clinic))), null, SEED, undefined, true), true)
    give(toy, 'brush')
    run(toy, 10, finite)
    // The one who waited in the game still has its need, and is helped as in the game; whoever comes after needs nothing.
    comeIn(toy)
    for (const entry of toy.clinic.table!.needs) { give(toy, FITS[entry.need]); run(toy, 10, finite) }
    comeIn(toy)
    expect(toy.clinic.table!.needs).toEqual([])
  })
})

describe('the one who waits, and the carrier', () => {
  it('brings nobody in while a need on the table is unmet: the touch is answered where the animal stands', () => {
    const toy = gameWith('cat', ['cold'])
    const table = toy.clinic.table
    takeSounds(toy)
    press(toy, room, door)
    tap(toy)
    expect(toy.clinic.table).toBe(table)
    expect(toy.coming).toBeNull()
    expect(toy.doorLooked).toBe(toy.t)
    expect(takeSounds(toy).length).toBeGreaterThan(0)
    expect(mayComeIn(toy)).toBe(false)
    give(toy, 'blanket')
    run(toy, 10)
    press(toy, room, door)
    expect(toy.coming?.leaving).toBe('cat')
  })

  it('stands a carrier on its shelf from the fifth position, lets its patient in on a touch, and stands a shut one there again', () => {
    const toy = gameWith('cat', ['cold'], PLAIN, 'basket')
    give(toy, 'blanket')
    run(toy, 10)
    comeIn(toy)
    expect(toy.clinic.carrier).not.toBeNull()
    const items = scene(toy, room, garden, QUIET_GUIDE)
    expect(parts(items, 'carrier')).toHaveLength(1)
    expect(parts(items, 'eyes').length + parts(items, 'eyesShut').length).toBe(1)
    // While the table is taken, a touch on it is answered where it stands.
    const at = { x: room.carrier.x, y: room.carrier.y - 70 }
    const before = toy.clinic.table
    press(toy, room, at)
    tap(toy)
    expect(toy.clinic.table).toBe(before)
    expect(toy.carrierBlinked).toBe(toy.t)
    // Once the one on the table is well, the carrier's patient comes in and the one who waits stays.
    while (needOnTable(toy)) { give(toy, FITS[needOnTable(toy)!]); run(toy, 10) }
    const waiting = toy.clinic.waiting, carried = toy.clinic.carrier
    press(toy, room, at)
    tap(toy)
    expect(toy.clinic.table).toEqual(carried)
    expect(toy.clinic.waiting).toBe(waiting)
    expect(toy.coming?.from).toBe('carrier')
    expect(takeSave(toy)).toBe(2)
    run(toy, COMING_SECONDS + 0.2, finite)
    expect(parts(scene(toy, room, garden, QUIET_GUIDE), 'carrier')).toHaveLength(toy.clinic.carrier ? 1 : 0)
  })
})

describe('the mouse\'s showing', () => {
  it('plays once for a new thing when the cart is in, counts as shown from the moment it starts, and any touch ends it', () => {
    const toy = freshToy(freshClinic(4, SEED), false)
    press(toy, room, door)
    tap(toy)
    // Not yet shown: the coming in is saved at once, and the showing is still owed.
    expect(toy.clinic.shown).toEqual(['bowl'])
    expect(takeSave(toy)).toBe(2)
    run(toy, CART_IN_AT - 0.1)
    expect(toy.act.showing).toBeNull()
    expect(toy.clinic.shown).toEqual(['bowl'])
    run(toy, 0.2)
    expect(toy.act.showing?.care).toBe('blanket')
    // Marked as it starts, and saved at once: a put-away in the middle of it loses nothing.
    expect(toy.clinic.shown).toEqual(['bowl', 'blanket'])
    expect(takeSave(toy)).toBe(2)
    // The patient in front has a need the child already knows.
    expect(toy.clinic.table!.needs[0].need).toBe('thirsty')
    run(toy, 1)
    press(toy, room, { x: 600, y: 60 })
    expect(toy.act.showing).toBeNull()
    expect(toy.show).toBeNull()
    // Never again for that thing.
    give(toy, 'bowl')
    run(toy, 10)
    press(toy, room, door)
    tap(toy)
    run(toy, COMING_SECONDS + 0.2)
    expect(toy.act.showing).toBeNull()
    expect(needOnTable(toy)).toBe('cold')
  })

  it('is never skipped: a give that lands while the newcomer sits down starts the well scene, and the showing plays beside it', () => {
    const toy = freshToy(freshClinic(4, SEED), false)
    press(toy, room, door)
    tap(toy)
    run(toy, 0.3)
    // The thing that fits, sent while the animal is still on its way in: it lands just after it has sat down.
    press(toy, room, lies(toy, room, 'bowl')!)
    tap(toy)
    let shown = 0, well = 0, both = 0
    for (let frame = 0; frame < 12 * 60; frame++) {
      step(toy, room, FRAME)
      finite(scene(toy, room, garden, QUIET_GUIDE))
      if (toy.act.showing) shown++
      if (toy.scene) well++
      if (toy.act.showing && toy.scene) both++
    }
    expect(isWell(toy.clinic.table!)).toBe(true)
    expect(shown / 60).toBeGreaterThan(SHOWING_SECONDS - 0.1)
    expect(well / 60).toBeGreaterThan(WELL.least - 0.1)
    expect(both).toBeGreaterThan(0)
    expect(toy.clinic.shown).toEqual(['bowl', 'blanket'])
    // The well scene left the animal as it always does, with no showing left on the stage.
    expect(toy.act).toEqual({ check: null, feat: null, flourish: null, glance: null, secret: null, showing: null, sits: null, under: false })
  })

  it('is still owed after a put-away before it started: it starts at the first touch after the game is opened, and never plays again', () => {
    const left = freshToy(freshClinic(4, SEED), false)
    press(left, room, door)
    tap(left)
    run(left, 0.5)
    settle(left, room)
    const slot = JSON.parse(JSON.stringify(serializeClinic(left.clinic)))
    expect(slot.shown).toEqual(['bowl'])
    // Opened again and left alone: nothing plays before the child acts, however long.
    const opened = freshToy(deserializeClinic(slot, 4, SEED), false)
    expect(opened.toShow).toBe('blanket')
    run(opened, 20, () => expect(opened.act.showing).toBeNull())
    expect(opened.clinic.shown).toEqual(['bowl'])
    // The first touch, wherever it lands, starts it: marked as shown and handed to storage at once.
    press(opened, room, { x: 600, y: 60 })
    tap(opened)
    expect(opened.clinic.shown).toEqual(['bowl', 'blanket'])
    expect(takeSave(opened)).toBe(2)
    run(opened, 1)
    expect(opened.act.showing?.care).toBe('blanket')
    // The next touch ends it like any other showing.
    press(opened, room, { x: 600, y: 60 })
    expect(opened.show).toBeNull()
    expect(opened.act.showing).toBeNull()
    // A first touch on the one at the door is answered as ever (a need on the table is unmet, so nobody comes in),
    // and the showing has started all the same.
    const atDoor = freshToy(deserializeClinic(slot, 4, SEED), false)
    press(atDoor, room, door)
    tap(atDoor)
    expect(atDoor.coming).toBeNull()
    expect(atDoor.show).not.toBeNull()
    // Opened once it has started: nothing is owed and nothing replays.
    const later = freshToy(deserializeClinic(JSON.parse(JSON.stringify(serializeClinic(opened.clinic))), 4, SEED), false)
    expect(later.toShow).toBeNull()
    press(later, room, { x: 600, y: 60 })
    run(later, 2, () => expect(later.act.showing).toBeNull())
  })
})

describe('mischief on the mouse', () => {
  const onMouse: Vec = { x: room.mouse.x, y: room.mouse.y - 50 }
  const mouseOf = (items: Item[]) => items.find((item) => item.kind === 'mouse') as Extract<Item, { kind: 'mouse' }>

  it('works with every thing: the mouse answers where it stands, the thing is on the cart in the saved room at once, and it is put back', () => {
    for (const care of CARES.filter((thing) => thing !== 'plaster')) {
      const toy = gameWith('dog', ['cold'])
      run(toy, 0.5)
      const before = JSON.stringify(serializeClinic(toy.clinic))
      const calm = mouseOf(scene(toy, room, garden, QUIET_GUIDE))
      press(toy, room, lies(toy, room, care)!)
      drag(toy, room, onMouse)
      takeSounds(toy)
      drop(toy, room)
      expect(toy.mousePlay?.care).toBe(care)
      expect(takeSounds(toy).length).toBeGreaterThan(0)
      // Nothing about the patient changed, nothing was judged, and the thing is saved where the mouse will put it.
      expect(JSON.stringify(serializeClinic(toy.clinic)), care).toBe(before)
      let moved = 0, away = 0
      run(toy, 1.3, (items) => {
        finite(items)
        const mouse = mouseOf(items), thing = things(items, care)[0]
        moved = Math.max(moved, Math.abs(mouse.x - calm.x) + Math.abs(mouse.y - calm.y) + 100 * Math.abs(mouse.rot - calm.rot) + 100 * Math.abs(mouse.sy - 1) + 100 * Math.abs(mouse.sx - 1))
        away = Math.max(away, Math.hypot(thing.x - room.cart[care].x, thing.y - room.cart[care].y))
      })
      expect(moved, care).toBeGreaterThan(12)
      expect(away, care).toBeGreaterThan(60)
      expect(busy(toy)).toBe(true)
      run(toy, 1)
      expect(toy.mousePlay).toBeNull()
      expect(lies(toy, room, care)).toEqual(room.cart[care])
      const thing = things(scene(toy, room, garden, QUIET_GUIDE), care)[0]
      expect(thing).toMatchObject({ x: room.cart[care].x, y: room.cart[care].y, look: 'whole', sx: 1 })
    }
  })

  it('lets the thing be taken off the mouse again, and is over when the game is put away', () => {
    const toy = gameWith('dog', ['cold'])
    press(toy, room, lies(toy, room, 'basket')!)
    drag(toy, room, onMouse)
    drop(toy, room)
    run(toy, 0.4)
    press(toy, room, lies(toy, room, 'basket')!)
    expect(toy.hand?.care).toBe('basket')
    expect(toy.mousePlay).toBeNull()
    drag(toy, room, onMouse)
    drop(toy, room)
    settle(toy, room)
    expect(toy.mousePlay).toBeNull()
    expect(toy.clinic.things.basket).toBe('cart')
  })

  it('still makes a hat of a plaster, which stays', () => {
    const toy = gameWith('dog', ['cold'])
    press(toy, room, lies(toy, room, 'plaster')!)
    drag(toy, room, onMouse)
    drop(toy, room)
    expect(toy.mousePlay).toBeNull()
    expect(toy.clinic.things.plasters).toEqual(['mouse'])
    expect(mouseOf(scene(toy, room, garden, QUIET_GUIDE)).hat).toBe(true)
  })
})

describe('a thing in the air when the next one is brought in', () => {
  it('lands on the one who leaves, never on the newcomer: nothing is given that the child did not give to it', () => {
    for (const care of CARES) {
      const toy = gameWith('dog', ['cold'])
      give(toy, 'blanket')
      run(toy, 10)
      const coming = toy.clinic.waiting
      press(toy, room, lies(toy, room, care)!)
      tap(toy)
      press(toy, room, door)
      tap(toy)
      expect(toy.flights).toEqual([])
      run(toy, COMING_SECONDS + 1)
      expect(toy.clinic.table, care).toEqual(coming)
    }
  })
})

describe('the cart', () => {
  const cartX = (toy: Toy) => (scene(toy, room, garden, QUIET_GUIDE).find((item) => item.kind === 'cart') as Extract<Item, { kind: 'cart' }> | undefined)?.x

  it('rolls in behind every newcomer with the new layout: out as the one on the table gets down, and in again by the time the mouse shows', () => {
    const toy = gameWith('dog', ['cold'])
    give(toy, 'blanket')
    run(toy, 10)
    expect(cartX(toy)).toBe(0)
    press(toy, room, door)
    tap(toy)
    let furthest = 0
    // Rolled right out, it is not in the frame at all.
    run(toy, CART_IN_AT, (items) => { furthest = Math.max(furthest, (items.find((item) => item.kind === 'cart') as Extract<Item, { kind: 'cart' }> | undefined)?.x ?? CART_OUT) })
    expect(furthest).toBeGreaterThan(500)
    run(toy, 0.05)
    expect(cartX(toy)).toBe(0)
    // Everything of the new layout is on it and can be taken where it stands, also while it rolls.
    for (const care of CARES) expect(lies(toy, room, care)).toEqual(room.cart[care])
  })

  it('carries its things with it, so a thing is taken where it is seen', () => {
    const toy = gameWith('dog', ['cold'])
    give(toy, 'blanket')
    run(toy, 10)
    press(toy, room, door)
    tap(toy)
    run(toy, 1.1)
    const at = lies(toy, room, 'bowl')!
    expect(at.x).toBeGreaterThan(room.cart.bowl.x + 20)
    expect(things(scene(toy, room, garden, QUIET_GUIDE), 'bowl')[0].x).toBeCloseTo(at.x, 5)
    press(toy, room, at)
    expect(toy.hand?.care).toBe('bowl')
  })
})

describe('the pairs', () => {
  it('make their secret when one thing is let go on the other: saved as it starts, the same every time, ended by any touch', () => {
    const pairs: [Care, Care, keyof Clinic['made']][] = [['blanket', 'basket', 'den'], ['brush', 'bowl', 'foam'], ['plaster', 'bowl', 'boat'], ['brush', 'blanket', 'crackle'], ['plaster', 'blanket', 'patches']]
    for (const [one, other, made] of pairs) {
      for (let again = 0; again < 2; again++) {
        const toy = gameWith('cat', ['cold'])
        press(toy, room, lies(toy, room, one)!)
        drag(toy, room, lies(toy, room, other)!)
        drop(toy, room)
        expect(Boolean(toy.clinic.made[made]), `${one} on ${other}`).toBe(true)
        expect(takeSave(toy)).toBe(2)
        expect(toy.act.secret ?? toy.scene).not.toBeNull()
        let lasted = 0
        while (toy.scene && lasted < 8) { step(toy, room, FRAME); finite(scene(toy, room, garden, QUIET_GUIDE)); lasted += FRAME }
        expect(lasted).toBeGreaterThanOrEqual(4)
        expect(lasted).toBeLessThanOrEqual(6)
        // The need on the table is still there: a secret is play, and nothing is judged.
        expect(toy.clinic.table!.wrong).toBe(0)
        expect(needOnTable(toy)).toBe('cold')
      }
    }
    const toy = gameWith('cat', ['cold'])
    press(toy, room, lies(toy, room, 'blanket')!)
    drag(toy, room, lies(toy, room, 'basket')!)
    drop(toy, room)
    run(toy, 0.5)
    press(toy, room, { x: 600, y: 60 })
    expect(toy.scene).toBeNull()
    expect(toy.clinic.made.den).toBe(true)
    expect(parts(scene(toy, room, garden, QUIET_GUIDE), 'den')).toHaveLength(1)
  })

  it('is shorter than a secret may be: four to six seconds', () => {
    expect(SECRET_SECONDS).toBeGreaterThanOrEqual(4)
    expect(SECRET_SECONDS).toBeLessThanOrEqual(6)
    expect(SHOWING_SECONDS).toBeCloseTo(3)
  })
})

describe('when the child is idle', () => {
  const glowing: Guidance = { glow: 1, demo: 0.43, demoIndex: 0 }

  it('glows on the things that can be given and shows a stroke of the animal: never a tap on the thing that fits', () => {
    const toy = gameWith('rabbit', ['cold'])
    run(toy, 1)
    const items = scene(toy, room, garden, glowing)
    expect(items.filter((item) => item.kind === 'halo')).toHaveLength(CARES.length)
    const hand = items.filter((item) => item.kind === 'hand') as Extract<Item, { kind: 'hand' }>[]
    expect(hand).toHaveLength(1)
    expect(Math.abs(hand[0].x - room.patient.x)).toBeLessThan(80)
    for (const care of CARES) expect(Math.hypot(hand[0].x - room.cart[care].x, hand[0].y - room.cart[care].y)).toBeGreaterThan(150)
  })

  it('shows a touch on the one who waits when the table is empty or the animal on it is well', () => {
    const empty = freshToy(freshClinic(null, SEED), false)
    run(empty, 1)
    const first = scene(empty, room, garden, glowing)
    expect(first.filter((item) => item.kind === 'halo')).toHaveLength(1)
    const hand = first.find((item) => item.kind === 'hand') as Extract<Item, { kind: 'hand' }>
    expect(Math.abs(hand.x - room.waiting.x)).toBeLessThan(60)
    const well = gameWith('rabbit', ['cold'])
    give(well, 'blanket')
    run(well, 10)
    const after = scene(well, room, garden, glowing)
    const halo = after.find((item) => item.kind === 'halo') as Extract<Item, { kind: 'halo' }>
    expect(Math.abs(halo.x - room.waiting.x)).toBeLessThan(10)
  })

  it('counts a cell, a scene and a coming in as not idle', () => {
    const toy = gameWith('rabbit', ['cold'])
    expect(busy(toy)).toBe(false)
    give(toy, 'bowl')
    expect(busy(toy)).toBe(true)
    run(toy, 8)
    expect(busy(toy)).toBe(false)
  })
})

describe('a child who reads every sign, through the running model', () => {
  it('plays from a first visit to the top of the ladder, meeting each need after its thing was shown', () => {
    const toy = freshToy(freshClinic(null, SEED), false)
    const met: Need[] = []
    for (let patients = 0; patients < 60 && toy.clinic.position !== LADDER[LADDER.length - 1]; patients++) {
      press(toy, room, door)
      tap(toy)
      run(toy, COMING_SECONDS + SHOWING_SECONDS + 0.3, finite)
      let guard = 0
      while (needOnTable(toy) && guard++ < 4) {
        const need = needOnTable(toy)!
        if (!met.includes(need)) met.push(need)
        expect(toy.clinic.table!.cart).toContain(FITS[need])
        give(toy, FITS[need])
        run(toy, 9.5, finite)
      }
      expect(isWell(toy.clinic.table!)).toBe(true)
    }
    expect(met).toEqual([...NEEDS])
    expect(toy.clinic.position).toBe('two-quiet')
  }, 120_000)
})

describe('a child who taps anything', () => {
  it('is never stuck, every press makes a sound, the frame stays whole, and the room reads back as it was left', () => {
    for (const seed of [3]) {
      const random = stream(seed)
      const toy = freshToy({ ...freshClinic(5, seed), position: 'two' }, false)
      const anywhere = (): Vec => ({ x: random() * 1180, y: random() * 820 })
      const places = (): Vec[] => [door, { x: room.carrier.x, y: room.carrier.y - 70 }, { x: room.patient.x, y: room.patient.y - 90 }, { x: room.hide.x, y: room.hide.y - 60 }, ...CARES.map((care) => room.cart[care]), ...CARES.flatMap((care) => { const at = lies(toy, room, care); return at ? [at] : [] })]
      let most = 0
      for (let move = 0; move < 1500; move++) {
        const from = random() < 0.75 ? places()[Math.floor(random() * places().length)] : anywhere()
        takeSounds(toy)
        const hadHand = toy.hand !== null
        press(toy, room, from)
        if (!hadHand) expect(takeSounds(toy).length, `move ${move}`).toBeGreaterThan(0)
        const then = random()
        if (then < 0.5) tap(toy)
        else { drag(toy, room, random() < 0.6 ? places()[Math.floor(random() * places().length)] : anywhere()); run(toy, random() * 0.2); drop(toy, room) }
        run(toy, random() * 2.5, (items) => { most = Math.max(most, items.length) })
        const items = scene(toy, room, garden, QUIET_GUIDE)
        finite(items)
        expect(figures(items, 'patient').length).toBeLessThanOrEqual(1)
        expect(LADDER).toContain(toy.clinic.position)
        const spots = (['bowl', 'blanket', 'brush', 'basket'] as const).map((thing) => toy.clinic.things[thing]).filter((place) => place !== 'cart' && place !== 'patient' && place !== 'on-basket')
        expect(new Set(spots).size, `move ${move}`).toBe(spots.length)
        if (move % 20 === 0) {
          settle(toy, room)
          const saved = deserializeClinic(JSON.parse(JSON.stringify(serializeClinic(toy.clinic))), null, 1)
          expect(saved, `move ${move}`).toEqual(toy.clinic)
        }
      }
      // The frame budget: a frame is never more than this many stickers.
      expect(most).toBeLessThanOrEqual(48)
    }
  }, 120_000)
})

describe('every cell, in the frame', () => {
  it('has a track, and plays whole on every animal', () => {
    expect(allTracks()).toHaveLength(30)
    // The overlap tests play every cell on a large and a small animal; here two of the others.
    for (const species of ['dog', 'duck'] as Species[]) {
      for (const track of allTracks()) {
        const toy = gameWith(species, [track.need], QUIET)
        if (track.given === 'hand') { press(toy, room, track.need === 'scared' ? { x: room.hide.x, y: room.hide.y - 60 } : { x: room.patient.x, y: room.patient.y - 90 }); tap(toy) }
        else give(toy, track.given)
        run(toy, Math.min(9.5, cellLasts(track, species) + 0.2), (items) => {
          finite(items)
          expect(figures(items, 'patient').length).toBeLessThanOrEqual(1)
        })
      }
    }
  }, 120_000)
})
