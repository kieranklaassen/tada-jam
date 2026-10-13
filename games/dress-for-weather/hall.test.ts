import { describe, expect, it } from 'vitest'
import { Hall, ZIP_RUN } from './hall'
import { BUTTONS, GARMENTS, SPOTS, TABS, TUG_STEPS, ZIP_TEETH, belongsAt, type Garment, type Spot } from './kinds'
import { BUTTON_AT, HANDLE, HOME_CONTROL, ON_RACK, VANE, aimsOf, boxesMeet, fromPaper, homeControlOn, paperBox, placesOf, sliderAt, type Point } from './layout'
import { fit } from './stage'
import { freshSave, type Save } from './save'
import { snap, zipTick, type Sound } from './voices'

const onRack = (garment: Garment): Point => {
  const box = paperBox(garment, ON_RACK[garment], false)
  return { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }
}
/** Plays `seconds` of attended time, frame by frame, and returns every sound it set off. */
function run(hall: Hall, seconds: number): Sound[] {
  const heard: Sound[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    hall.step(1 / 60)
    heard.push(...hall.takeNotes())
  }
  return heard
}
function tapAt(hall: Hall, at: Point): void {
  hall.press(at.x, at.y)
  hall.tap()
}
function carry(hall: Hall, from: Point, to: Point): void {
  hall.press(from.x, from.y)
  hall.dragStart()
  hall.dragMove((from.x + to.x) / 2, (from.y + to.y) / 2)
  hall.dragMove(to.x, to.y)
}
const aimOf = (spot: Spot): Point => aimsOf(spot, placesOf('child'))[0]
/** A first visit whose two showings have been seen, so that a garment landing is only a garment landing (scenes.test.ts has the showings). */
const seen = (age: number): Save => ({ ...freshSave(age), shown: ['door', 'out', 'vane'] })
const bare = (): Hall => new Hall(seen(5))
const coatOn = (): Hall => new Hall(seen(3))
const NOWHERE: Point = { x: 700, y: 300 }
/** A hall with one garment put on by a tap and everything come to rest. */
function wearing(garment: Garment): Hall {
  const hall = bare()
  tapAt(hall, onRack(garment))
  run(hall, 2)
  hall.dirty = null
  return hall
}
/** A point of a worn garment's paper, on the stage. */
const onWorn = (hall: Hall, garment: Garment, x: number, y: number): Point => fromPaper(hall.pieces[garment], x + hall.pieces[garment].sep, y)

describe('putting a garment on', () => {
  it.each(GARMENTS)('answers a finger on the %s the moment it lands, and a tap sends it to the part it was cut for', (garment) => {
    const hall = bare()
    hall.press(onRack(garment).x, onRack(garment).y)
    expect(hall.takeNotes().length).toBeGreaterThan(0)
    expect(hall.pieces[garment].lift).toBe(1)
    hall.tap()
    // Saved where it is going, at once, while it is still in the air.
    const where = hall.toSave().where[garment]
    expect(where).not.toBe('rack')
    expect(belongsAt(garment, where as Spot)).toBe(true)
    expect((where as Spot).who).toBe('child')
    expect(hall.dirty).toBe('now')
    expect(hall.pieces[garment].mode).toBe('flying')
    expect(hall.busy).toBe(true)
    expect(run(hall, 2).length).toBeGreaterThan(0)
    expect(hall.pieces[garment].mode).toBe('rest')
    expect(hall.pieces[garment].tabs).toBe(TABS[garment])
    expect(hall.pieces[garment].fold.every((fold) => fold === 1)).toBe(true)
    expect(hall.busy).toBe(false)
  })

  it('puts any garment on any part of anyone, and on the dog', () => {
    for (const garment of GARMENTS) for (const spot of SPOTS) {
      const hall = bare(), to = aimOf(spot)
      carry(hall, onRack(garment), to)
      expect(hall.pieces[garment].mode).toBe('held')
      expect(hall.pieces[garment].offer).toEqual(spot)
      // In the hand it is still saved on the rack.
      expect(hall.toSave().where[garment]).toBe('rack')
      hall.drop(to.x, to.y)
      expect(hall.toSave().where[garment], `${garment} on ${spot.who} ${spot.part}`).toEqual(spot)
      expect(hall.wornAt(spot)).toBe(garment)
      expect(run(hall, 2.5).length).toBeGreaterThan(0)
      expect(hall.pieces[garment].mode).toBe('rest')
      expect(hall.pieces[garment].tabs).toBe(TABS[garment])
    }
  })

  it('sends whatever was on a part back to the rack when another garment takes it', () => {
    const hall = wearing('hat'), head: Spot = { who: 'child', part: 'head' }
    expect(hall.save.where.hat).toEqual(head)
    carry(hall, onRack('boots'), aimOf(head))
    hall.drop(aimOf(head).x, aimOf(head).y)
    expect(hall.save.where.boots).toEqual(head)
    expect(hall.save.where.hat).toBe('rack')
    run(hall, 2)
    expect(hall.pieces.hat).toMatchObject(ON_RACK.hat)
    expect(hall.pieces.hat.tabs).toBe(0)
  })

  it('sails a garment let go over nothing back to its peg, and takes a worn one off the same way', () => {
    const hall = bare()
    carry(hall, onRack('scarf'), NOWHERE)
    hall.drop(NOWHERE.x, NOWHERE.y)
    expect(hall.save.where.scarf).toBe('rack')
    run(hall, 1.5)
    expect(hall.pieces.scarf).toMatchObject(ON_RACK.scarf)
    const worn = wearing('scarf')
    carry(worn, onWorn(worn, 'scarf', 0, 0), NOWHERE)
    expect(worn.pieces.scarf.tabs).toBe(0)
    worn.drop(NOWHERE.x, NOWHERE.y)
    expect(worn.save.where.scarf).toBe('rack')
    expect(worn.dirty).toBe('now')
  })

  it('puts a garment back, unheard and unsaved, when the drag is taken away', () => {
    const hall = bare(), head = aimOf({ who: 'child', part: 'head' })
    carry(hall, onRack('hat'), head)
    hall.takeNotes()
    hall.cancel()
    expect(hall.takeNotes()).toEqual([])
    expect(hall.save.where.hat).toBe('rack')
    expect(hall.pieces.hat).toMatchObject({ ...ON_RACK.hat, mode: 'rest', offer: null, lift: 0 })
    expect(hall.dirty).toBeNull()
    const worn = wearing('hat')
    carry(worn, onWorn(worn, 'hat', 0, -20), NOWHERE)
    worn.takeNotes()
    worn.cancel()
    expect(worn.takeNotes()).toEqual([])
    expect(worn.save.where.hat).toEqual({ who: 'child', part: 'head' })
    expect(worn.pieces.hat.tabs).toBe(TABS.hat)
    expect(worn.pieces.hat.fold.every((fold) => fold === 1)).toBe(true)
  })

  it('lets a press that was no tap settle back with nothing changed', () => {
    const hall = bare()
    hall.press(onRack('hat').x, onRack('hat').y)
    hall.pressEnd()
    expect(hall.pieces.hat.lift).toBe(0)
    expect(hall.save).toEqual(seen(5))
    expect(hall.dirty).toBeNull()
  })
})

describe('the fastenings', () => {
  it('closes the zip tooth by tooth after the finger, a tick for each tooth, each higher than the last', () => {
    const hall = coatOn(), coat = hall.pieces.raincoat
    const at = (teeth: number) => fromPaper(coat, sliderAt(teeth).x, sliderAt(teeth).y)
    hall.press(at(0).x, at(0).y)
    expect(hall.takeNotes().length).toBeGreaterThan(0)
    hall.dragStart()
    hall.dragMove(at(5).x, at(5).y)
    expect(hall.save.zip).toBe(5)
    expect(hall.dirty).toBe('soon')
    // The first tooth closes under the finger, in the same call; the rest follow, one a frame.
    expect(hall.zipShown).toBe(1)
    const heard = [...hall.takeNotes(), ...run(hall, 0.2)]
    expect(hall.zipShown).toBe(5)
    const ticks = heard.filter((note) => note.kind === 'tone').map((note) => note.frequency)
    expect(ticks).toEqual([1, 2, 3, 4, 5].map((teeth) => zipTick(teeth)[0].frequency))
    hall.dragMove(at(ZIP_TEETH).x, at(ZIP_TEETH).y - 60)
    run(hall, 0.4)
    expect(hall.zipShown).toBe(ZIP_TEETH)
    expect(hall.actors.child.face).toBe('chin')
    hall.drop(at(ZIP_TEETH).x, at(ZIP_TEETH).y)
    expect(hall.dirty).toBe('now')
    expect(hall.toSave().zip).toBe(ZIP_TEETH)
    // The coat stayed on: the zip was pulled, not the coat.
    expect(hall.save.where.raincoat).toEqual({ who: 'child', part: 'body' })
  })

  it('runs the zip a few teeth for a tap on the slider, and opens it from the top', () => {
    const hall = coatOn()
    for (let taps = 1; taps * ZIP_RUN <= ZIP_TEETH; taps++) {
      const at = fromPaper(hall.pieces.raincoat, sliderAt(hall.zipShown).x, sliderAt(hall.zipShown).y)
      tapAt(hall, at)
      run(hall, 0.5)
      expect(hall.save.zip).toBe(taps * ZIP_RUN)
      expect(hall.zipShown).toBe(taps * ZIP_RUN)
    }
    tapAt(hall, fromPaper(hall.pieces.raincoat, sliderAt(ZIP_TEETH).x, sliderAt(ZIP_TEETH).y))
    run(hall, 0.5)
    expect(hall.save.zip).toBe(0)
    expect(hall.zipShown).toBe(0)
  })

  it('pushes each button through under a tap, and out again', () => {
    const hall = wearing('duffel')
    for (let index = 0; index < BUTTONS; index++) {
      const at = fromPaper(hall.pieces.duffel, BUTTON_AT[index].x, BUTTON_AT[index].y)
      hall.press(at.x, at.y)
      expect(hall.takeNotes().length).toBeGreaterThan(0)
      hall.tap()
      expect(hall.save.buttons[index]).toBe(true)
      expect(hall.dirty).toBe('now')
      expect(hall.takeNotes().length).toBeGreaterThan(0)
      run(hall, 0.3)
      expect(hall.buttonShown[index]).toBe(1)
    }
    tapAt(hall, fromPaper(hall.pieces.duffel, BUTTON_AT[1].x, BUTTON_AT[1].y))
    expect(hall.save.buttons).toEqual([true, false, true])
    expect(hall.save.where.duffel).toEqual({ who: 'child', part: 'body' })
  })

  it('tugs the boots on in three taps and then stamps, wherever they are worn', () => {
    const tapped = wearing('boots')
    expect(tapped.save.tug).toBe(0)
    for (let step = 1; step <= TUG_STEPS; step++) {
      tapAt(tapped, onWorn(tapped, 'boots', 5, 30))
      expect(tapped.save.tug).toBe(step)
      expect(tapped.dirty).toBe('now')
      run(tapped, 0.6)
      expect(tapped.tugShown).toBe(step)
    }
    tapAt(tapped, onWorn(tapped, 'boots', 5, 30))
    expect(tapped.save.tug).toBe(TUG_STEPS)
    expect(run(tapped, 0.5).length).toBeGreaterThan(0)
    // On the head, on the hands and on the dog the fastening works the same.
    for (const spot of [{ who: 'child', part: 'head' }, { who: 'baby', part: 'hands' }, { who: 'dog', part: 'back' }] as const) {
      const hall = bare(), to = aimsOf(spot, hall.stands())[0]
      carry(hall, onRack('boots'), to)
      hall.drop(to.x, to.y)
      run(hall, 4)
      expect(hall.save.where.boots).toEqual(spot)
      for (let step = 1; step <= TUG_STEPS; step++) {
        // The boot on the viewer's left: the other may stand behind the one in the middle.
        const piece = hall.pieces.boots
        tapAt(hall, { x: piece.x - piece.sep - 5, y: piece.y + 30 })
        expect(hall.save.tug, `${spot.who} ${spot.part}`).toBe(step)
        run(hall, 0.6)
      }
      expect(hall.save.where.boots).toEqual(spot)
    }
  })

  it('takes the boots off under a finger that drags them, loose or tugged on, whichever way it drags', () => {
    for (const tugs of [0, 1, TUG_STEPS]) for (const [dx, dy] of [[2, -60], [60, 0], [0, 50]] as const) {
      const hall = wearing('boots')
      for (let i = 0; i < tugs; i++) {
        tapAt(hall, onWorn(hall, 'boots', 5, 30))
        run(hall, 0.6)
      }
      const from = onWorn(hall, 'boots', 5, 30)
      hall.press(from.x, from.y)
      hall.dragStart()
      hall.dragMove(from.x + dx, from.y + dy)
      // They are in the hand, and no tug was counted for the way the finger went.
      expect(hall.pieces.boots.mode, `${tugs} tugs, dragged ${dx}, ${dy}`).toBe('held')
      expect(hall.save.tug).toBe(tugs)
      hall.dragMove(NOWHERE.x, NOWHERE.y)
      hall.drop(NOWHERE.x, NOWHERE.y)
      expect(hall.save.where.boots).toBe('rack')
      expect(hall.save.tug).toBe(0)
    }
  })

  it('gives a finger a worn garment from as far out as a hundred units across, and the fastenings as far as theirs reach', () => {
    // One mitten is 52 units of paper across: a finger 45 to the side of its middle still has it.
    const hall = wearing('mittens'), piece = hall.pieces.mittens
    hall.press(piece.x + piece.sep + 45, piece.y + 27)
    expect(hall.pieces.mittens.lift).toBe(1)
    hall.pressEnd()
    // The slider from 48 away, and a button from 48 to the side.
    const coat = coatOn(), slider = fromPaper(coat.pieces.raincoat, sliderAt(coat.zipShown).x + 48, sliderAt(coat.zipShown).y)
    coat.press(slider.x, slider.y)
    coat.tap()
    expect(coat.save.zip).toBe(ZIP_RUN)
    const duffel = wearing('duffel')
    BUTTON_AT.forEach((at, index) => {
      tapAt(duffel, fromPaper(duffel.pieces.duffel, at.x - 48, at.y + (index - 1) * 28))
      expect(duffel.save.buttons[index]).toBe(true)
    })
  })

  it('opens the umbrella with a tap, shuts it with another, and hangs it up shut', () => {
    const hall = wearing('umbrella')
    tapAt(hall, onWorn(hall, 'umbrella', 0, -80))
    expect(hall.save.open).toBe(true)
    run(hall, 0.5)
    expect(hall.openShown).toBe(1)
    tapAt(hall, onWorn(hall, 'umbrella', 0, -80))
    expect(hall.save.open).toBe(false)
    tapAt(hall, onWorn(hall, 'umbrella', 0, -80))
    run(hall, 0.5)
    carry(hall, onWorn(hall, 'umbrella', 0, -80), NOWHERE)
    hall.drop(NOWHERE.x, NOWHERE.y)
    expect(hall.toSave().where.umbrella).toBe('rack')
    expect(hall.toSave().open).toBe(false)
  })
})

describe('sight and sound on one clock', () => {
  it('plays an answer beat by beat with the hall, each tab folding in the frame its snap is heard', () => {
    const hall = bare()
    hall.press(onRack('raincoat').x, onRack('raincoat').y)
    hall.tap()
    hall.takeNotes()
    const snaps: number[] = []
    let frames = 0, heardAt = 0
    for (let i = 0; i < 180; i++) {
      const before = hall.pieces.raincoat.tabs
      hall.step(1 / 60)
      const notes = hall.takeNotes()
      if (notes.length > 0) { frames += 1; heardAt = i }
      const after = hall.pieces.raincoat.tabs
      if (after > before) {
        expect(after).toBe(before + 1)
        expect(notes.map((note) => note.frequency)).toContain(snap(after - 1)[0].frequency)
        snaps.push(i)
      }
    }
    expect(snaps.length).toBe(TABS.raincoat)
    expect(new Set(snaps).size).toBe(TABS.raincoat)
    // Landing, four tabs, the settle and three who watch: many frames with a sound, the last well after the first.
    expect(frames).toBeGreaterThanOrEqual(TABS.raincoat + 2)
    expect(heardAt).toBeGreaterThan(snaps[snaps.length - 1])
  })

  it('plays nothing in a step of no time, and nothing while no one steps it', () => {
    const hall = bare()
    tapAt(hall, onRack('hat'))
    hall.takeNotes()
    const t = hall.t
    hall.step(0)
    hall.step(-1)
    expect(hall.t).toBe(t)
    expect(hall.takeNotes()).toEqual([])
    expect(hall.pieces.hat.mode).toBe('flying')
  })

  it('answers a finger on a character with that character, and a finger on the wall with the paper', () => {
    const hall = bare()
    hall.press(112, 640)
    expect(hall.takeNotes().length).toBeGreaterThan(0)
    expect(hall.actors.dog.face).toBe('tongue')
    hall.pressEnd()
    hall.press(NOWHERE.x, NOWHERE.y)
    expect(hall.takeNotes().length).toBeGreaterThan(0)
    expect(hall.ripple).toMatchObject(NOWHERE)
    hall.tap()
    expect(hall.save).toEqual(seen(5))
  })
})

describe('found as left', () => {
  const left = (): Save => {
    const save = seen(5)
    save.where.raincoat = { who: 'child', part: 'body' }
    save.where.scarf = { who: 'dog', part: 'back' }
    save.where.umbrella = { who: 'baby', part: 'head' }
    return { ...save, zip: 7, buttons: [false, true, false], tug: 2, open: true }
  }

  it('opens on the hall exactly as it was saved, with no sound and nothing easing in', () => {
    const hall = new Hall(left())
    expect(hall.takeNotes()).toEqual([])
    expect(hall.toSave()).toEqual(left())
    expect(hall.zipShown).toBe(7)
    expect(hall.openShown).toBe(1)
    expect(hall.buttonShown).toEqual([0, 1, 0])
    for (const garment of GARMENTS) {
      const piece = hall.pieces[garment], worn = hall.save.where[garment] !== 'rack'
      expect(piece).toMatchObject({ ...hall.restPose(garment), mode: 'rest', tabs: worn ? TABS[garment] : 0 })
      expect(piece.fold.every((fold) => fold === (worn ? 1 : 0))).toBe(true)
    }
    // Watched for a while with no touch: nothing is heard, nothing replays, nothing changes.
    expect(run(hall, 5)).toEqual([])
    expect(hall.toSave()).toEqual(left())
    expect(hall.dirty).toBeNull()
    expect(hall.busy).toBe(false)
  })

  it('keeps its own copy of the save, and hands out copies', () => {
    const save = left(), hall = new Hall(save)
    save.zip = 0
    hall.toSave().buttons[0] = true
    expect(hall.toSave()).toEqual(left())
    expect(JSON.stringify(hall.toSave()).length).toBeLessThan(32 * 1024)
  })

  it('never saves a garment in the air or in the hand', () => {
    const hall = bare()
    carry(hall, onRack('mittens'), aimOf({ who: 'baby', part: 'head' }))
    expect(hall.toSave()).toEqual(seen(5))
    hall.drop(aimOf({ who: 'baby', part: 'head' }).x, aimOf({ who: 'baby', part: 'head' }).y)
    const saved = hall.toSave()
    expect(saved.where.mittens).toEqual({ who: 'baby', part: 'head' })
    expect(hall.pieces.mittens.mode).toBe('flying')
    // Opened again from that save, the mittens are on, tabs folded.
    const again = new Hall(saved)
    expect(again.pieces.mittens.tabs).toBe(TABS.mittens)
    expect(again.takeNotes()).toEqual([])
  })

  it('starts its idle rounds from the phase it is given, and the same phase gives the same hall', () => {
    expect(new Hall(left(), 12.5).t).toBe(12.5)
    expect(new Hall(left(), 12.5).toSave()).toEqual(new Hall(left()).toSave())
  })
})

describe('what the idle ladder may show', () => {
  it('shows one move at a time, chosen from what is on screen, the most wanted first', () => {
    // Nothing on: a garment to its own part first, then the door.
    const dress = bare().hints()
    expect(dress[0]).toMatchObject({ move: 'carry', glow: [...GARMENTS] })
    expect(dress[0].to.x).toBeLessThan(dress[0].from.x)
    expect(dress[1]).toMatchObject({ move: 'tap', from: HANDLE })
    // A coat on with teeth open: the zip pulled up, then the door, then another garment.
    const zip = coatOn().hints()
    expect(zip.map((hint) => hint.move)).toEqual(['carry', 'tap', 'carry'])
    expect(zip[0].spot).toBe(true)
    expect(zip[0].to.y).toBeLessThan(zip[0].from.y)
    expect(zip[1].from).toEqual(HANDLE)
    // Home again in something: it can be hung up, sent out again, or the weather changed.
    const save = seen(5)
    save.where.hat = { who: 'child', part: 'head' }
    const home = new Hall({ ...save, back: true }).hints()
    expect(home[0].move).toBe('carry')
    expect(home[0].to.x).toBeGreaterThan(home[0].from.x)
    expect(home.slice(1).map((hint) => hint.from)).toEqual([HANDLE, VANE])
    // The cycle over: one who waits can be asked to the middle.
    const over = new Hall({ ...seen(5), finished: true }).hints()
    expect(over[0]).toMatchObject({ move: 'tap', spot: true })
    expect(over[0].from.x).toBeLessThan(500)
  })

  it('has a move to show in every state of the hall', () => {
    const all = seen(5)
    GARMENTS.forEach((garment, i) => { all.where[garment] = SPOTS[i] })
    for (const save of [seen(5), seen(3), { ...all, zip: ZIP_TEETH }, { ...all, back: true }, { ...seen(5), finished: true }]) expect(new Hall(save).hints().length).toBeGreaterThan(0)
  })
})

describe('the home control of the surface', () => {
  it.each([[1180, 820], [1024, 768], [1366, 1024], [1280, 720], [844, 390]])('has neither the cut-line nor the hat on the grandfather\'s head under it on a surface of %i by %i', (width, height) => {
    const control = homeControlOn(width, fit(width, height))
    const hall = new Hall({ ...seen(5), turn: 'grandfather' })
    hall.setControl(control)
    const head = aimsOf({ who: 'grandfather', part: 'head' }, placesOf('grandfather'))[0]
    carry(hall, onRack('hat'), head)
    // The dotted line where the hat would lie if the finger let go now.
    const offer = hall.offerPose('hat')
    expect(offer).not.toBeNull()
    expect(boxesMeet(paperBox('hat', offer!, false), control)).toBe(false)
    hall.drop(head.x, head.y)
    run(hall, 1.5)
    expect(hall.save.where.hat).toEqual({ who: 'grandfather', part: 'head' })
    expect(boxesMeet(paperBox('hat', hall.pieces.hat, false), control)).toBe(false)
  })

  it('is the jam\'s own until a surface has a size, and moves with the surface after', () => {
    const phone = homeControlOn(844, fit(844, 390))
    expect(phone.x1 - phone.x0).toBeGreaterThan(HOME_CONTROL.x1 - HOME_CONTROL.x0)
    expect(phone.y1).toBeGreaterThan(HOME_CONTROL.y1)
  })
})
