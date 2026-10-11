import { describe, expect, it } from 'vitest'
import { AJAR, DOOR_SWING, Hall, RAPS, TURN_BACK, TURN_OVER, type Heard } from './hall'
import { GARMENTS, TABS, type Figure, type Garment, type Spot } from './kinds'
import { BODIES, DOOR, DOOR_TARGET, GARDEN, HANDLE, HEADING, MIDDLE, ON_RACK, RAP, SASH_Y, SHEET, VANE, WINDOW, aimsOf, cockerelAcross, paperBox, placesOf, standOf, type Point } from './layout'
import { CELLS, CELL_SECONDS, lastsOf, stepsOf, type Cell } from './outing'
import { freshSave, type Save } from './save'
import * as say from './sceneVoices'
import type { Sound } from './voices'
import { DOORWAY, LEAVE_SECONDS, SWAP_SECONDS } from './walks'

// The cycle, the scenes, the vane and the changes of place: what each saves
// when it starts, that sight and sound share the one clock, that a touch ends
// a scene unheard, and that nothing replays on load.

const FRAME = 1 / 60
const onRack = (garment: Garment): Point => {
  const box = paperBox(garment, ON_RACK[garment], false)
  return { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }
}
function run(hall: Hall, seconds: number): Sound[] {
  const heard: Sound[] = []
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    hall.step(FRAME)
    heard.push(...hall.takeNotes())
  }
  return heard
}
function tapAt(hall: Hall, at: Point): void {
  hall.press(at.x, at.y)
  hall.tap()
}
const NOWHERE: Point = { x: 700, y: 300 }
/** A first visit with both showings behind it. */
const seen = (age = 5): Save => ({ ...freshSave(age), shown: ['door', 'out', 'vane'] })
const wearing = (worn: Partial<Record<Garment, Spot>>, more: Partial<Save> = {}): Save => {
  const save = { ...seen(), ...more }
  save.where = { ...save.where, ...worn }
  return save
}
const on = (who: Figure, part: Spot['part']): Spot => ({ who, part })
const has = (heard: readonly Sound[], sound: readonly Sound[]): boolean => sound.every((part) => heard.some((note) => JSON.stringify(note) === JSON.stringify(part)))
const stand = (hall: Hall, who: Figure): Point => ({ x: hall.actors[who].x, y: hall.actors[who].y - 100 })

describe('the vane', () => {
  it('answers a finger at once, and a tap turns it to the next weather, saved at once and shown in the window', () => {
    const hall = new Hall(seen())
    hall.press(VANE.x, VANE.y)
    expect(has(hall.takeNotes(), say.vaneTouch)).toBe(true)
    expect(hall.vaneSwing.v).not.toBe(0)
    hall.tap()
    expect(hall.toSave().weather).toBe('snow')
    expect(hall.dirty).toBe('now')
    expect(hall.weatherShown).toBe('snow')
    expect(has(hall.takeNotes(), say.WEATHER_VOICE.snow)).toBe(true)
    for (const next of ['wind', 'sun', 'rain'] as const) {
      tapAt(hall, VANE)
      expect(hall.save.weather).toBe(next)
    }
  })

  it('has a heading of the cockerel for each weather, turns it to the one that is saved, and is found there on a load', () => {
    const hall = new Hall(seen())
    expect(hall.vaneTurn).toBe(HEADING.rain)
    tapAt(hall, VANE)
    // It goes round to the new heading, and is not there in the frame of the tap.
    expect(hall.vaneTurn).toBe(HEADING.rain)
    run(hall, 0.1)
    expect(hall.vaneTurn).toBeGreaterThan(HEADING.rain)
    expect(hall.vaneTurn).toBeLessThan(HEADING.snow)
    run(hall, 2)
    expect(hall.vaneTurn).toBe(HEADING.snow)
    expect(new Hall(hall.toSave()).vaneTurn).toBe(HEADING.snow)
    // From the sun it goes on round to the rain, the way it always turns, and never back.
    const sunny = new Hall({ ...seen(), weather: 'sun' })
    tapAt(sunny, VANE)
    let last = sunny.vaneTurn
    for (let i = 0; i < 120; i++) {
      sunny.step(FRAME)
      const gone = (sunny.vaneTurn - last + 1) % 1
      expect(gone).toBeLessThan(0.5)
      last = sunny.vaneTurn
    }
    expect(sunny.vaneTurn).toBe(HEADING.rain)
    // The four headings are four different sights of the cockerel.
    const sights = Object.values(HEADING).map((turn) => cockerelAcross(turn).toFixed(2))
    expect(new Set(sights).size).toBe(4)
    // Put away while it turns, it is where a load would find it.
    tapAt(hall, VANE)
    run(hall, 0.05)
    hall.putAway()
    expect(hall.vaneTurn).toBe(HEADING[hall.save.weather])
  })

  it('does nothing for a press that was no tap', () => {
    const hall = new Hall(seen())
    hall.press(VANE.x, VANE.y)
    hall.pressEnd()
    expect(hall.save.weather).toBe('rain')
    expect(hall.dirty).toBeNull()
  })
})

describe('changing places', () => {
  it('brings one who waits to the middle at a tap, saved at once, with a footfall heard for each step that is seen', () => {
    const hall = new Hall(wearing({ hat: on('child', 'head') }, { back: true }))
    hall.press(stand(hall, 'baby').x, stand(hall, 'baby').y)
    expect(hall.takeNotes().length).toBeGreaterThan(0)
    hall.tap()
    const saved = hall.toSave()
    expect(saved).toMatchObject({ turn: 'baby', back: false, finished: false })
    // The one who leaves keeps what it wears.
    expect(saved.where.hat).toEqual(on('child', 'head'))
    expect(hall.dirty).toBe('now')
    expect(hall.busy).toBe(true)
    let steps = 0
    for (let i = 0; i < Math.round(SWAP_SECONDS / FRAME) + 2; i++) {
      const before = hall.actors.baby.x
      hall.step(FRAME)
      const notes = hall.takeNotes()
      if (has(notes, say.footstep('baby', 1)) || has(notes, say.footstep('baby', 2))) {
        steps += 1
        // A foot is heard only in a frame in which the baby moved.
        expect(hall.actors.baby.x).not.toBe(before)
      }
    }
    expect(steps).toBeGreaterThanOrEqual(5)
    for (const who of ['child', 'grandfather', 'baby'] as const) expect(hall.actors[who]).toMatchObject({ ...standOf(who, 'baby'), walkHop: 0, walkTilt: 0 })
    expect(hall.busy).toBe(false)
    // The hat went along on the child's head.
    expect(hall.pieces.hat).toMatchObject(hall.restPose('hat'))
    expect(hall.pieces.hat.x).toBeCloseTo(standOf('child', 'baby').x)
  })

  it('lets a garment be dropped on a figure where it has got to, part way', () => {
    const hall = new Hall(seen())
    tapAt(hall, stand(hall, 'grandfather'))
    run(hall, SWAP_SECONDS / 2)
    const at = hall.actors.grandfather, head = aimsOf(on('grandfather', 'head'), hall.stands())[0]
    expect(at.x).not.toBe(standOf('grandfather', 'child').x)
    expect(at.x).not.toBe(standOf('grandfather', 'grandfather').x)
    hall.press(onRack('hat').x, onRack('hat').y)
    hall.dragStart()
    hall.dragMove(head.x, head.y)
    expect(hall.pieces.hat.offer).toEqual(on('grandfather', 'head'))
    hall.drop(head.x, head.y)
    run(hall, 2)
    expect(hall.pieces.hat).toMatchObject(hall.restPose('hat'))
    expect(hall.pieces.hat.x).toBeCloseTo(standOf('grandfather', 'grandfather').x)
  })

  it('only pokes the one in the middle and the dog', () => {
    const hall = new Hall(seen())
    tapAt(hall, stand(hall, 'child'))
    tapAt(hall, { x: hall.actors.dog.x, y: hall.actors.dog.y - 40 })
    expect(hall.save.turn).toBe('child')
    expect(hall.dirty).toBeNull()
  })
})

describe('the dog', () => {
  it('struts one turn of the hall in whatever lands on its back, a paw heard for each paw down, and sits again', () => {
    const hall = new Hall(seen()), back = aimsOf({ who: 'dog', part: 'back' }, hall.stands())[0]
    hall.press(onRack('scarf').x, onRack('scarf').y)
    hall.dragStart()
    hall.dragMove(back.x, back.y)
    hall.drop(back.x, back.y)
    const heard = run(hall, 0.6)
    expect(hall.pieces.scarf.mode).toBe('rest')
    const home = { x: hall.actors.dog.x, y: hall.actors.dog.y }
    expect(hall.busy).toBe(true)
    let far = 0, turned = false
    for (let i = 0; i < 240; i++) {
      hall.step(FRAME)
      heard.push(...hall.takeNotes())
      far = Math.max(far, hall.actors.dog.x)
      turned ||= hall.actors.dog.facing === -1
      // What it wears goes with it.
      expect(hall.pieces.scarf).toMatchObject(hall.restPose('scarf'))
    }
    expect(far).toBeGreaterThan(500)
    expect(turned).toBe(true)
    expect(has(heard, say.paw(1))).toBe(true)
    expect(hall.actors.dog.facing).toBe(1)
    expect(hall.actors.dog.x).toBeCloseTo(standOf('dog', 'child').x)
    expect(home.x).toBeLessThan(far)
    expect(hall.busy).toBe(false)
  })

  it('can have the thing taken off its back where it is, turned round on its way home', () => {
    const hall = new Hall(wearing({ hat: { who: 'dog', part: 'back' } }))
    // Something lands on it, and it sets off.
    const back = aimsOf({ who: 'dog', part: 'back' }, hall.stands())[0]
    hall.press(onRack('scarf').x, onRack('scarf').y)
    hall.dragStart()
    hall.dragMove(back.x, back.y)
    hall.drop(back.x, back.y)
    run(hall, 0.5 + 2.8 * 0.7)
    const dog = hall.actors.dog, piece = hall.pieces.scarf
    expect(dog.facing).toBe(-1)
    // The scarf is drawn mirrored about the dog's stand: a finger there has it.
    hall.press(2 * dog.x - piece.x, piece.y + 20)
    hall.dragStart()
    hall.dragMove(NOWHERE.x, NOWHERE.y)
    expect(hall.pieces.scarf.mode).toBe('held')
  })
})

describe('the outing', () => {
  const dressed = (weather: Save['weather'], more: Partial<Save> = {}) => new Hall(wearing({ hat: on('child', 'head'), raincoat: on('child', 'body'), boots: on('child', 'feet') }, { weather, zip: 12, tug: 3, ...more }))

  it('knocks under a finger on the door, and starts at a tap, in the call that lands it', () => {
    const hall = dressed('rain')
    hall.press(HANDLE.x, HANDLE.y)
    expect(has(hall.takeNotes(), say.knock)).toBe(true)
    expect(hall.inScene).toBe(false)
    hall.tap()
    expect(hall.inScene).toBe(true)
    expect(has(hall.takeNotes(), say.doorCreak)).toBe(true)
    expect(DOOR_TARGET.x1 - DOOR_TARGET.x0).toBeGreaterThanOrEqual(100)
  })

  it('saves its whole outcome when it starts: the marks, that the figure is back, and that an outing has been', () => {
    const hall = new Hall(wearing({ hat: on('child', 'head'), scarf: on('baby', 'neck') }, { weather: 'snow', shown: ['door'] }))
    tapAt(hall, HANDLE)
    expect(hall.dirty).toBe('now')
    const saved = hall.toSave()
    expect(saved.marks).toMatchObject({ hat: 'snowy', scarf: 'dry', boots: 'dry' })
    expect(saved).toMatchObject({ back: true, finished: false, shown: ['door', 'out'], turn: 'child' })
    expect(saved.where.hat).toEqual(on('child', 'head'))
    // A load of that save is home already: no scene, no garden, no sound.
    const again = new Hall(saved)
    expect(again.inScene).toBe(false)
    expect(again.garden).toBeNull()
    expect(again.flip).toBe(0)
    expect(run(again, 10)).toEqual([])
    expect(again.toSave()).toEqual(saved)
  })

  it('leaves marks as they were in the wind and the sun, and wets in the rain', () => {
    for (const [weather, mark] of [['rain', 'wet'], ['snow', 'snowy'], ['wind', 'snowy'], ['sun', 'snowy']] as const) {
      const save = wearing({ scarf: on('child', 'neck') }, { weather })
      save.marks.scarf = 'snowy'
      const hall = new Hall(save)
      tapAt(hall, HANDLE)
      expect(hall.toSave().marks.scarf).toBe(mark)
    }
  })

  it('plays one beat for each part from the head down and then the figure\'s own, and comes home as it went out', () => {
    const hall = dressed('rain'), before = hall.toSave()
    tapAt(hall, HANDLE)
    const seenSteps: number[] = []
    let turned = false
    for (let i = 0; i < 12 / FRAME && hall.inScene; i++) {
      hall.step(FRAME)
      hall.takeNotes()
      if (hall.garden && hall.flip === 1) {
        turned = true
        if (seenSteps[seenSteps.length - 1] !== hall.garden.index) seenSteps.push(hall.garden.index)
      }
    }
    expect(turned).toBe(true)
    expect(seenSteps).toEqual([0, 1, 2, 3])
    expect(hall.garden).toBeNull()
    expect(hall.flip).toBe(0)
    expect(hall.doorOpen).toBe(0)
    const after = hall.toSave()
    expect(after.where).toEqual(before.where)
    expect(after).toMatchObject({ zip: 12, tug: 3, weather: 'rain', turn: 'child', back: true })
    expect(after.marks).toMatchObject({ hat: 'wet', raincoat: 'wet', boots: 'wet' })
    // The marks are seen once it is home.
    expect(hall.pieces.hat.mark).toBe('wet')
  })

  it('shows the outfit as it went out, whatever is in the save, and each cell where its garment is worn', () => {
    const hall = new Hall(wearing({ boots: on('grandfather', 'head') }, { weather: 'rain', turn: 'grandfather' }))
    tapAt(hall, HANDLE)
    run(hall, TURN_OVER + 0.1)
    const garden = hall.garden!
    expect(garden.outfit).toMatchObject({ who: 'grandfather', weather: 'rain', worn: [{ garment: 'boots', part: 'head' }] })
    expect(garden.steps.map((step) => step.kind)).toEqual(['cell', 'socks', 'taste'])
    expect(garden.steps[0]).toMatchObject({ garment: 'boots', part: 'head', cell: (CELLS.boots.rain as { loose: Cell }).loose })
    expect(garden.steps[2]).toMatchObject({ taste: { feels: 'minds', act: 'heron' } })
  })

  it('hears every sound of a cell in the frame the cell has reached it: one clock for sight and sound', () => {
    const hall = dressed('rain')
    const steps = stepsOf({ who: 'child', worn: [{ garment: 'hat', part: 'head' }, { garment: 'raincoat', part: 'body' }, { garment: 'boots', part: 'feet' }], zip: 12, buttons: [false, false, false], tug: 3, open: false, weather: 'rain', dog: null })
    // When each sound of each step is due, in seconds from the tap.
    const due: { at: number; index: number; offset: number; sound: readonly Sound[] }[] = []
    let from = TURN_OVER
    steps.forEach((step, index) => {
      for (const [offset, sound] of step.kind === 'taste' ? step.taste.notes : step.cell.notes) due.push({ at: from + offset * lastsOf(step), index, offset, sound })
      from += lastsOf(step)
    })
    tapAt(hall, HANDLE)
    hall.takeNotes()
    const start = hall.t
    let met = 0
    for (let i = 0; i < 10 / FRAME; i++) {
      const before = hall.t - start
      hall.step(FRAME)
      const now = hall.t - start, notes = hall.takeNotes()
      for (const d of due) {
        if (!(d.at > before - 1e-9 && d.at <= now + 1e-9)) continue
        met += 1
        expect(has(notes, d.sound), `step ${d.index} at ${d.offset}`).toBe(true)
        // The garden shows that step, at least that far through.
        expect(hall.garden!.index).toBe(d.index)
        expect(hall.garden!.u).toBeGreaterThanOrEqual(d.offset - 1e-6)
        expect(hall.garden!.u).toBeLessThan(d.offset + (FRAME / CELL_SECONDS) * 1.5 + 1e-6)
      }
      // And nothing of the garden is heard before the sheet is over or after it is back.
      if (hall.flip === 0 && now > 1) expect(notes.every((note) => !steps.some((step) => (step.kind === 'taste' ? step.taste.notes : step.cell.notes).some(([, sound]) => has([note], sound))))).toBe(true)
    }
    expect(met).toBe(due.length)
    expect(due.length).toBeGreaterThan(6)
  })

  it('walks the figure out by the door before the sheet turns, a footfall heard for each step that is seen', () => {
    for (const [who, steps] of [['child', 5], ['grandfather', 4], ['baby', 6]] as const) {
      const hall = new Hall(wearing({ hat: on(who, 'head') }, { turn: who }))
      tapAt(hall, HANDLE)
      hall.takeNotes()
      let feet = 0, last = hall.actors[who].x
      expect(last).toBe(MIDDLE.x)
      for (let i = 0; i < Math.round(LEAVE_SECONDS / FRAME) - 1; i++) {
        hall.step(FRAME)
        const notes = hall.takeNotes(), at = hall.actors[who]
        // It is seen to go: the hall is still there, and the figure is nearer the door in every frame.
        expect(hall.flip).toBe(0)
        expect(at.x).toBeLessThanOrEqual(last)
        // Once it has stepped forward it is nearer the door in every frame.
        if (i > 4) expect(at.x).toBeLessThan(last)
        last = at.x
        if (Array.from({ length: steps }, (_, k) => k + 1).some((k) => has(notes, say.footstep(who, k)))) feet += 1
        // What it wears goes with it.
        expect(hall.pieces.hat).toMatchObject(hall.restPose('hat'))
      }
      expect(feet).toBe(steps)
      // It is in the doorway when the sheet starts to turn, and the sheet is heard to turn then.
      const heard = run(hall, FRAME * 3)
      expect(has(heard, say.sheetOver)).toBe(true)
      expect(hall.flip).toBeGreaterThan(0)
      expect(hall.actors[who].x).toBeCloseTo(DOORWAY.x)
      expect(DOORWAY.x).toBeGreaterThan(DOOR.x0)
      expect(DOORWAY.x).toBeLessThan(DOOR.x1)
      expect(hall.doorOpen).toBe(1)
    }
  })

  it('ends at a touch in the hall, unheard from that frame, with everything at its end, and the touch is then an ordinary touch', () => {
    const hall = dressed('snow'), before = hall.toSave()
    tapAt(hall, HANDLE)
    // The figure is still on its way to the door: the hall is what is seen.
    run(hall, LEAVE_SECONDS * 0.5)
    expect(hall.flip).toBe(0)
    hall.takeSounds()
    hall.press(onRack('scarf').x, onRack('scarf').y)
    const heard = hall.takeSounds()
    // The scene is silenced first, and then only the scarf's own flick is heard: nothing of the rest of the scene.
    expect(heard[0]).toEqual({ hush: 'scene' })
    expect(heard.every((part) => 'hush' in part || part.group === 'scarf')).toBe(true)
    expect(heard.flatMap((part) => ('notes' in part ? part.notes : [])).length).toBeLessThanOrEqual(3)
    expect(hall.inScene).toBe(false)
    expect(hall.garden).toBeNull()
    expect(hall.flip).toBe(0)
    expect(hall.doorOpen).toBe(0)
    expect(hall.actors.child).toMatchObject(MIDDLE)
    expect(hall.pieces.scarf.lift).toBe(1)
    hall.tap()
    expect(hall.save.where.scarf).toEqual(on('child', 'neck'))
    expect(hall.save.where.hat).toEqual(before.where.hat)
    const later = run(hall, 6)
    for (const sound of [say.sheetBack, say.doorShut, say.dogShake]) expect(has(later, sound)).toBe(false)
  })

  it('takes a touch while the garden shows for the garden: it brings the hall back, the weather answers at the finger, and nothing of the hidden hall is touched', () => {
    // Where in the hall a garment hangs, the vane turns, the door opens and one who waits stands: in the garden, sky and lawn.
    const places: Point[] = [onRack('scarf'), onRack('hat'), VANE, HANDLE, { x: standOf('baby', 'child').x, y: standOf('baby', 'child').y - 100 }]
    for (const at of places) {
      const hall = dressed('snow')
      tapAt(hall, HANDLE)
      const saved = hall.toSave()
      run(hall, TURN_OVER + CELL_SECONDS * 1.5)
      expect(hall.flip).toBe(1)
      hall.takeSounds()
      hall.dirty = null
      const still = [hall.vaneSwing.v, hall.doorKnock.v]
      hall.press(at.x, at.y)
      const heard = hall.takeSounds()
      // The outing is over and silent, the hall is back, and the answer is the snow's: its flakes at the finger and its sound.
      expect(heard[0]).toEqual({ hush: 'scene' })
      expect(has(heard.flatMap((part) => ('notes' in part ? part.notes : [])), say.WEATHER_VOICE.snow)).toBe(true)
      expect(hall).toMatchObject({ inScene: false, garden: null, flip: 0, doorOpen: 0 })
      expect(hall.splashes).toEqual([{ x: at.x, y: at.y, at: hall.t, mark: 'snowy' }])
      // Nothing in the hall was lifted, knocked, turned or poked.
      for (const garment of GARMENTS) expect(hall.pieces[garment]).toMatchObject({ lift: 0, mode: 'rest' })
      expect([hall.vaneSwing.v, hall.doorKnock.v]).toEqual(still)
      hall.tap()
      run(hall, 1)
      // And the lift that follows is no tap on anything: nothing flew, the weather is the same, nobody changed places, no scene began.
      expect(hall.toSave()).toEqual(saved)
      expect(hall.dirty).toBeNull()
      expect(hall.inScene).toBe(false)
      expect(hall.busy).toBe(false)
    }
  })

  it('takes a touch on the figure or the dog in the garden as a poke of that one, and a drag from there carries nothing', () => {
    const hall = dressed('rain')
    tapAt(hall, HANDLE)
    const saved = hall.toSave()
    run(hall, TURN_OVER + 0.02)
    hall.takeSounds()
    hall.press(GARDEN.figure.x, GARDEN.figure.y - 200)
    expect(hall.inScene).toBe(false)
    // The child is poked: it answers at once, as it does in the hall, and no drop of rain is set off at the finger.
    expect(hall.takeNotes().length).toBeGreaterThan(0)
    expect(hall.splashes).toEqual([])
    expect(hall.actors.child.squash.v !== 0 || hall.actors.child.hop.v !== 0 || hall.actors.child.tilt.v !== 0).toBe(true)
    hall.dragStart()
    hall.dragMove(NOWHERE.x, NOWHERE.y)
    hall.drop(NOWHERE.x, NOWHERE.y)
    for (const garment of GARMENTS) expect(hall.pieces[garment].mode).toBe('rest')
    expect(hall.toSave()).toEqual(saved)
    const dog = dressed('rain')
    tapAt(dog, HANDLE)
    run(dog, TURN_OVER + 0.02)
    dog.takeSounds()
    dog.press(GARDEN.dog.x, GARDEN.dog.y - 40)
    expect(dog.actors.dog.squash.v !== 0 || dog.actors.dog.hop.v !== 0 || dog.actors.dog.tilt.v !== 0).toBe(true)
    expect(dog.splashes).toEqual([])
    // While the sheet is still turning nobody is in the garden yet, and the weather answers.
    const turning = dressed('rain')
    tapAt(turning, HANDLE)
    run(turning, LEAVE_SECONDS + 0.2)
    expect(turning.flip).toBeGreaterThan(0)
    expect(turning.flip).toBeLessThan(1)
    turning.press(GARDEN.figure.x, GARDEN.figure.y - 200)
    expect(turning.splashes.length).toBe(1)
    expect(SHEET.x1).toBeGreaterThan(GARDEN.figure.x)
  })

  it('shakes dry on its peg what the dog lost to the wind only when the hall is back to be seen', () => {
    const save = wearing({ hat: on('child', 'head'), scarf: { who: 'dog', part: 'back' } }, { weather: 'wind' })
    save.marks.scarf = 'wet'
    const hall = new Hall(save)
    tapAt(hall, HANDLE)
    expect(hall.toSave().where.scarf).toBe('rack')
    expect(hall.toSave().marks.scarf).toBe('dry')
    let shookAt: number | null = null
    for (let i = 0; i < 9 / FRAME; i++) {
      hall.step(FRAME)
      const sounds: Heard[] = hall.takeSounds()
      const shook = sounds.some((part) => 'notes' in part && part.group === 'scarf' && has(part.notes, say.shakeOff))
      // Until then the scarf keeps its drops, wherever it is.
      if (shookAt === null && !shook) expect(hall.pieces.scarf.mark).toBe('wet')
      if (shook) {
        shookAt = hall.flip
        expect(hall.pieces.scarf.mark).toBe('dry')
        expect(hall.splashes.some((splash) => splash.mark === 'wet')).toBe(true)
      }
    }
    expect(shookAt).toBe(0)
  })

  it('has the wind take the hat: it comes home on the dog, and what the dog wore goes to the rack', () => {
    const hall = new Hall(wearing({ hat: on('child', 'head'), scarf: on('child', 'neck'), umbrella: { who: 'dog', part: 'back' } }, { weather: 'wind', open: true }))
    tapAt(hall, HANDLE)
    const saved = hall.toSave()
    expect(saved.where.hat).toEqual({ who: 'dog', part: 'back' })
    expect(saved.where.umbrella).toBe('rack')
    expect(saved.open).toBe(false)
    expect(saved.back).toBe(true)
    // Until the sheet is over, the hall is still seen as it was.
    expect(hall.whereShown('hat')).toEqual(on('child', 'head'))
    expect(hall.whereShown('umbrella')).toEqual({ who: 'dog', part: 'back' })
    run(hall, DOOR_SWING + 0.1)
    expect(hall.pieces.hat).toMatchObject(hall.restPose('hat'))
    expect(hall.pieces.hat.y).toBeLessThan(400)
    run(hall, TURN_OVER)
    expect(hall.whereShown('hat')).toEqual({ who: 'dog', part: 'back' })
    expect(hall.garden!.hatOnDog).toBe(false)
    run(hall, CELL_SECONDS)
    expect(hall.garden!.hatOnDog).toBe(true)
    run(hall, 8)
    expect(hall.inScene).toBe(false)
    expect(hall.pieces.hat).toMatchObject({ ...hall.restPose('hat'), tabs: TABS.hat })
    expect(hall.pieces.umbrella).toMatchObject({ ...ON_RACK.umbrella, tabs: 0 })
    expect(hall.openShown).toBe(0)
  })

  it('goes straight into the ending when the figure will come home wearing nothing, as one scene, saved when it starts', () => {
    for (const save of [wearing({}, { weather: 'sun' }), wearing({ hat: on('child', 'feet') }, { weather: 'wind' })]) {
      const hall = new Hall(save)
      tapAt(hall, HANDLE)
      const saved = hall.toSave()
      expect(saved).toMatchObject({ finished: true, back: false })
      expect(hall.sit).toBe(0)
      // Put away between the outing and its ending: found finished, and no ending plays.
      const again = new Hall(saved)
      expect(again.sit).toBe(1)
      expect(run(again, 8)).toEqual([])
      const heard = run(hall, 12)
      expect(has(heard, say.sitDown)).toBe(true)
      expect(hall.inScene).toBe(false)
      expect(hall.sit).toBe(1)
      expect(hall.toSave()).toEqual(saved)
    }
  })

  it('waits for the one who is walking to the middle, and goes out as often as the door is opened', () => {
    const hall = new Hall(seen())
    tapAt(hall, stand(hall, 'baby'))
    tapAt(hall, HANDLE)
    expect(hall.inScene).toBe(false)
    run(hall, SWAP_SECONDS + 0.1)
    for (let i = 0; i < 3; i++) {
      tapAt(hall, HANDLE)
      expect(hall.inScene).toBe(true)
      run(hall, 9)
      expect(hall.inScene).toBe(false)
    }
    expect(hall.save.turn).toBe('baby')
  })

  it('shakes the dog after rain and wrings wet socks on the mat, each seen and heard together', () => {
    const hall = new Hall(wearing({}, { weather: 'rain' }))
    tapAt(hall, HANDLE)
    const home = TURN_OVER + stepsOf(hall.garden?.outfit ?? { who: 'child', worn: [], zip: 0, buttons: [], tug: 0, open: false, weather: 'rain', dog: null }).reduce((sum, step) => sum + lastsOf(step), 0) + TURN_BACK
    run(hall, home - 0.05)
    expect(hall.splashes.length).toBe(0)
    const heard = run(hall, 0.5)
    expect(has(heard, say.dogShake)).toBe(true)
    expect(has(heard, say.sockWring)).toBe(true)
    expect(hall.splashes.length).toBe(2)
    const dry = new Hall(wearing({ boots: on('child', 'feet') }, { weather: 'sun' }))
    tapAt(dry, HANDLE)
    const sunny = run(dry, 9)
    expect(has(sunny, say.dogShake)).toBe(false)
    expect(has(sunny, say.sockWring)).toBe(false)
  })
})

describe('the ending', () => {
  const home = (): Hall => {
    const save = wearing({ hat: on('child', 'head'), scarf: on('child', 'neck') }, { back: true })
    save.marks.hat = 'wet'
    save.marks.scarf = 'wet'
    return new Hall(save)
  }
  const hangUp = (hall: Hall, garment: Garment) => {
    const piece = hall.pieces[garment]
    hall.press(piece.x, piece.y + (garment === 'hat' ? -20 : 4))
    hall.dragStart()
    hall.dragMove(NOWHERE.x, NOWHERE.y)
    hall.drop(NOWHERE.x, NOWHERE.y)
  }

  it('does not start while the one who came home still wears something', () => {
    const hall = home()
    hangUp(hall, 'hat')
    expect(hall.toSave()).toMatchObject({ finished: false, back: true })
    expect(hall.toSave().marks.hat).toBe('dry')
    expect(hall.inScene).toBe(false)
  })

  it('starts when the last garment comes off, saved when it starts, and shakes the wet off on the peg as it is hung', () => {
    const hall = home()
    hangUp(hall, 'hat')
    run(hall, 1.5)
    hall.dirty = null
    hangUp(hall, 'scarf')
    const saved = hall.toSave()
    expect(saved).toMatchObject({ finished: true, back: false })
    expect(saved.marks.scarf).toBe('dry')
    expect(hall.dirty).toBe('now')
    expect(hall.inScene).toBe(true)
    // The scarf is still wet in the air, and shakes dry as it knocks its peg.
    expect(hall.pieces.scarf.mark).toBe('wet')
    const heard = run(hall, 0.6)
    expect(hall.pieces.scarf.mark).toBe('dry')
    expect(has(heard, say.shakeOff)).toBe(true)
    expect(hall.splashes.length).toBeGreaterThan(0)
    // A stretch, the sit, a breath, and the two who wait look round and back.
    let stretched = 0, looked = 0
    for (let i = 0; i < 5 / FRAME; i++) {
      hall.step(FRAME)
      heard.push(...hall.takeNotes())
      stretched = Math.max(stretched, hall.stretch)
      looked = Math.max(looked, hall.heads)
    }
    expect(stretched).toBeGreaterThan(0.9)
    expect(looked).toBeGreaterThan(0.9)
    for (const sound of [say.stretch, say.sitDown, say.breath, say.headsTurn]) expect(has(heard, sound)).toBe(true)
    expect(hall).toMatchObject({ sit: 1, stretch: 0, heads: 0, inScene: false })
    // The finished hall stays as long as the child likes.
    expect(run(hall, 20)).toEqual([])
    expect(hall.toSave()).toEqual(saved)
  })

  it('starts when the last garment goes onto someone else, who keeps it and its mark', () => {
    const save = wearing({ scarf: on('child', 'neck') }, { back: true })
    save.marks.scarf = 'snowy'
    const hall = new Hall(save), to = aimsOf(on('baby', 'head'), hall.stands())[0]
    hall.press(hall.pieces.scarf.x, hall.pieces.scarf.y + 4)
    hall.dragStart()
    hall.dragMove(to.x, to.y)
    hall.drop(to.x, to.y)
    expect(hall.toSave()).toMatchObject({ finished: true, back: false })
    expect(hall.toSave().where.scarf).toEqual(on('baby', 'head'))
    expect(hall.toSave().marks.scarf).toBe('snowy')
  })

  it('never starts for a figure that has not been out', () => {
    const hall = new Hall(wearing({ hat: on('child', 'head') }))
    hangUp(hall, 'hat')
    expect(hall.toSave()).toMatchObject({ finished: false, back: false })
    expect(hall.inScene).toBe(false)
  })

  it('finds a finished hall finished, plays nothing on load, and waits for the child', () => {
    const hall = new Hall({ ...seen(), finished: true })
    expect(hall.sit).toBe(1)
    expect(hall.inScene).toBe(false)
    expect(run(hall, 30)).toEqual([])
    expect(hall.toSave()).toEqual({ ...seen(), finished: true })
    expect(hall.dirty).toBeNull()
  })

  it('begins the next cycle when one who waits is touched, or when a garment is put on the one in the middle, who stands up', () => {
    const swapped = new Hall({ ...seen(), finished: true })
    tapAt(swapped, stand(swapped, 'grandfather'))
    expect(swapped.toSave()).toMatchObject({ finished: false, turn: 'grandfather' })
    const dressed = new Hall({ ...seen(), finished: true })
    tapAt(dressed, onRack('hat'))
    expect(dressed.toSave()).toMatchObject({ finished: false, turn: 'child' })
    run(dressed, 1)
    expect(dressed.sit).toBe(0)
    // A garment on someone else leaves the one in the middle sitting.
    const other = new Hall({ ...seen(), finished: true }), to = aimsOf({ who: 'dog', part: 'back' }, placesOf('child'))[0]
    other.press(onRack('hat').x, onRack('hat').y)
    other.dragStart()
    other.dragMove(to.x, to.y)
    other.drop(to.x, to.y)
    expect(other.toSave().finished).toBe(true)
  })
})

describe('the showing of the door', () => {
  it('plays once, when the first garment lands on the one in the middle, and is saved when it starts', () => {
    const hall = new Hall(freshSave(5))
    tapAt(hall, onRack('hat'))
    // Not yet: the hat is still in the air.
    expect(hall.toSave().shown).toEqual([])
    expect(hall.inScene).toBe(false)
    hall.dirty = null
    const heard: Sound[] = []
    let ajar = 0, dropped = 0
    for (let i = 0; i < 6 / FRAME; i++) {
      hall.step(FRAME)
      const notes = hall.takeNotes()
      heard.push(...notes)
      if (hall.inScene && ajar === 0 && dropped === 0 && hall.leadDown === 0) expect(hall.toSave().shown).toEqual(['door'])
      // The door is heard to open in the frame it starts to.
      if (has(notes, say.doorCreak)) expect(hall.doorOpen).toBeLessThan(AJAR * 0.1)
      ajar = Math.max(ajar, hall.doorOpen)
      dropped = Math.max(dropped, hall.leadDown)
    }
    expect(hall.dirty).toBe('now')
    expect(ajar).toBeCloseTo(AJAR)
    expect(dropped).toBe(1)
    for (const sound of [say.leadDrop, say.scratch, say.doorCreak, say.doorShut, say.leadUp]) expect(has(heard, sound)).toBe(true)
    expect(hall).toMatchObject({ doorOpen: 0, leadDown: 0, inScene: false })
    // It changed nothing else, and the next garment starts nothing.
    expect(hall.toSave()).toEqual({ ...freshSave(5), where: { ...freshSave(5).where, hat: on('child', 'head') }, shown: ['door'] })
    tapAt(hall, onRack('scarf'))
    run(hall, 1)
    expect(hall.inScene).toBe(false)
  })

  it('is still owed when the game is put away before the garment lands, and starts at the next garment that lands on the one in the middle', () => {
    const hall = new Hall(freshSave(5))
    tapAt(hall, onRack('hat'))
    hall.putAway()
    expect(hall.toSave().shown).toEqual([])
    const again = new Hall(hall.toSave())
    expect(run(again, 6)).toEqual([])
    expect(again.inScene).toBe(false)
    // A garment on someone else does not start it.
    const to = aimsOf(on('baby', 'head'), again.stands())[0]
    again.press(onRack('boots').x, onRack('boots').y)
    again.dragStart()
    again.dragMove(to.x, to.y)
    again.drop(to.x, to.y)
    run(again, 1)
    expect(again.toSave().shown).toEqual([])
    tapAt(again, onRack('scarf'))
    run(again, 1)
    expect(again.toSave().shown).toEqual(['door'])
  })

  it('does not replay on a load made while it plays', () => {
    const hall = new Hall(freshSave(5))
    tapAt(hall, onRack('hat'))
    run(hall, 1)
    expect(hall.inScene).toBe(true)
    const again = new Hall(hall.toSave())
    expect(run(again, 6)).toEqual([])
    expect(again.leadDown).toBe(0)
  })
})

describe('the showing of the vane', () => {
  const owed = (turn: Figure = 'child'): Save => ({ ...wearing({ hat: on(turn, 'head') }), shown: ['door', 'out'], back: true, weather: 'wind', turn })

  it('starts when the first touch after an outing has ended is over, saved when it starts, and changes nothing', () => {
    const hall = new Hall(owed())
    expect(run(hall, 5)).toEqual([])
    hall.press(NOWHERE.x, NOWHERE.y)
    // The press does one thing: the paper under the finger answers. The showing waits for the touch to be over.
    expect(hall.ripple).toMatchObject(NOWHERE)
    expect(hall.inScene).toBe(false)
    expect(hall.toSave().shown).toEqual(['door', 'out'])
    hall.takeNotes()
    hall.tap()
    expect(hall.toSave().shown).toEqual(['door', 'out', 'vane'])
    expect(hall.dirty).toBe('now')
    expect(hall.inScene).toBe(true)
    const shown: string[] = []
    let spun = 0, raps = 0
    for (let i = 0; i < 5 / FRAME; i++) {
      hall.step(FRAME)
      const notes = hall.takeNotes()
      if (has(notes, say.glassRap)) raps += 1
      if (shown[shown.length - 1] !== hall.weatherShown) {
        shown.push(hall.weatherShown)
        // Each weather is heard in the frame the window turns to it.
        if (shown.length > 1) expect(has(notes, say.WEATHER_VOICE[hall.weatherShown])).toBe(true)
      }
      spun = Math.max(spun, hall.vaneSpin)
    }
    expect(raps).toBe(RAPS.length)
    expect(shown).toEqual(['wind', 'sun', 'rain', 'snow', 'wind'])
    expect(spun).toBeGreaterThan(0.9)
    expect(hall).toMatchObject({ vaneSpin: 0, weatherAhead: 0, inScene: false })
    expect(hall.rapArm()).toBeNull()
    expect(hall.toSave()).toEqual({ ...owed(), shown: ['door', 'out', 'vane'] })
  })

  it('raps the glass with its knuckles on the pane: in the frame each rap is heard the hand is there, and the child has jumped to reach', () => {
    for (const [turn, who] of [['child', 'grandfather'], ['grandfather', 'child']] as const) {
      const hall = new Hall(owed(turn))
      tapAt(hall, NOWHERE)
      expect(hall.inScene).toBe(true)
      // Its arm starts where it hangs.
      let raps = 0, lifted = 0
      for (let i = 0; i < 1.4 / FRAME; i++) {
        hall.step(FRAME)
        const notes = hall.takeNotes(), hand = hall.rapHand()
        if (hand) lifted += 1
        if (!has(notes, say.glassRap)) continue
        raps += 1
        expect(hall.rapArm()!.who).toBe(who)
        // On the glass, in the clear light above the rail, where layout.ts says.
        expect(hand!.x).toBeCloseTo(RAP[who].at.x, 0)
        expect(hand!.y).toBeCloseTo(RAP[who].at.y, 0)
        expect(hand!.x).toBeGreaterThan(WINDOW.x0)
        expect(hand!.x).toBeLessThan(WINDOW.x1)
        expect(hand!.y).toBeGreaterThan(WINDOW.y0)
        expect(hand!.y).toBeLessThan(SASH_Y)
        // It is at the top of its jump, within the frame.
        expect(Math.abs(hall.actors[who].walkHop - RAP[who].hop)).toBeLessThan(3)
      }
      expect(raps).toBe(RAPS.length)
      expect(lifted).toBeGreaterThan(40)
      // The arm is down again and the one who rapped stands as before, well before the weathers go by.
      expect(hall.rapArm()).toBeNull()
      expect(hall.actors[who].walkHop).toBe(0)
      // Put away with the arm up, the arm is down.
      const parked = new Hall(owed(turn))
      tapAt(parked, NOWHERE)
      run(parked, 0.5)
      expect(parked.rapArm()).not.toBeNull()
      parked.putAway()
      expect(parked.rapArm()).toBeNull()
    }
  })

  it('never eats the door\'s tap: a tap on the door after the first outing opens the door, and the showing stays owed', () => {
    const hall = new Hall(owed())
    hall.press(HANDLE.x, HANDLE.y)
    expect(has(hall.takeNotes(), say.knock)).toBe(true)
    expect(hall.inScene).toBe(false)
    hall.tap()
    // The outing has started, in the call that lands the tap, and the showing has not.
    expect(has(hall.takeNotes(), say.doorCreak)).toBe(true)
    expect(hall.inScene).toBe(true)
    expect(hall.toSave().shown).toEqual(['door', 'out'])
    run(hall, LEAVE_SECONDS + 0.3)
    expect(hall.garden).not.toBeNull()
    run(hall, 9)
    expect(hall.inScene).toBe(false)
    expect(hall.toSave().shown).toEqual(['door', 'out'])
    // A tap that asks one who waits to the middle does that, and nothing else.
    tapAt(hall, stand(hall, 'baby'))
    expect(hall.save.turn).toBe('baby')
    expect(hall.inScene).toBe(false)
    run(hall, SWAP_SECONDS + 0.2)
    expect(hall.toSave().shown).toEqual(['door', 'out'])
    // A press that was no tap starts nothing.
    hall.press(NOWHERE.x, NOWHERE.y)
    hall.pressEnd()
    expect(hall.inScene).toBe(false)
    // The next touch that starts nothing of its own has the showing.
    tapAt(hall, NOWHERE)
    expect(hall.inScene).toBe(true)
    expect(hall.toSave().shown).toEqual(['door', 'out', 'vane'])
  })

  it('starts after a garment has been dropped, when the drop started no scene of its own', () => {
    const hall = new Hall({ ...owed(), back: false }), to = aimsOf(on('child', 'neck'), hall.stands())[0]
    hall.press(onRack('scarf').x, onRack('scarf').y)
    hall.dragStart()
    hall.dragMove(to.x, to.y)
    expect(hall.inScene).toBe(false)
    hall.drop(to.x, to.y)
    expect(hall.save.where.scarf).toEqual(on('child', 'neck'))
    expect(hall.toSave().shown).toEqual(['door', 'out', 'vane'])
  })

  it('is not started by the touch that cuts an outing short, but by the next one', () => {
    const hall = new Hall({ ...wearing({ hat: on('child', 'head') }), shown: ['door'] })
    tapAt(hall, HANDLE)
    run(hall, 2)
    hall.press(NOWHERE.x, NOWHERE.y)
    hall.tap()
    expect(hall.inScene).toBe(false)
    expect(hall.toSave().shown).toEqual(['door', 'out'])
    hall.press(NOWHERE.x, NOWHERE.y)
    expect(hall.toSave().shown).toEqual(['door', 'out'])
    hall.tap()
    expect(hall.toSave().shown).toEqual(['door', 'out', 'vane'])
  })

  it('is owed at the first touch of the next visit, and plays nothing before it', () => {
    const hall = new Hall(owed())
    expect(hall.inScene).toBe(false)
    expect(run(hall, 10)).toEqual([])
    expect(hall.toSave().shown).toEqual(['door', 'out'])
  })

  it('ends at a touch on the vane, which turns it, and the window ends on the weather it was turned to', () => {
    const hall = new Hall(owed())
    hall.press(NOWHERE.x, NOWHERE.y)
    hall.tap()
    run(hall, 2.6)
    expect(hall.weatherAhead).not.toBe(0)
    tapAt(hall, VANE)
    expect(hall.inScene).toBe(false)
    expect(hall.weatherAhead).toBe(0)
    expect(hall.save.weather).toBe('sun')
    expect(hall.weatherShown).toBe('sun')
  })
})

describe('a garment in the air', () => {
  it('is under the finger where it is drawn, and flies on when it is let go again', () => {
    const hall = new Hall(seen())
    tapAt(hall, onRack('hat'))
    run(hall, 0.1)
    const piece = hall.pieces.hat
    expect(piece.mode).toBe('flying')
    hall.takeNotes()
    hall.press(piece.x, piece.y - 20)
    expect(piece).toMatchObject({ mode: 'held', lift: 1 })
    expect(has(hall.takeNotes(), say.caught)).toBe(true)
    hall.tap()
    expect(piece.mode).toBe('flying')
    run(hall, 2)
    expect(piece).toMatchObject({ ...hall.restPose('hat'), mode: 'rest', tabs: TABS.hat })
    expect(hall.save.where.hat).toEqual(on('child', 'head'))
  })

  it('can be carried off from where it was caught', () => {
    const hall = new Hall(seen())
    tapAt(hall, onRack('hat'))
    run(hall, 0.1)
    const piece = hall.pieces.hat, to = aimsOf({ who: 'dog', part: 'back' }, hall.stands())[0]
    hall.press(piece.x, piece.y - 20)
    hall.dragStart()
    hall.dragMove(to.x, to.y)
    hall.drop(to.x, to.y)
    expect(hall.save.where.hat).toEqual({ who: 'dog', part: 'back' })
  })

  it('does not finish the sound it had begun when it is lifted mid-answer', () => {
    const hall = new Hall(seen())
    tapAt(hall, onRack('raincoat'))
    // Landed, and its tabs have begun to fold.
    run(hall, 0.42 + 0.12)
    const piece = hall.pieces.raincoat
    expect(piece.mode).toBe('rest')
    expect(piece.tabs).toBeLessThan(TABS.raincoat)
    hall.takeSounds()
    hall.press(piece.x - 60, piece.y + 120)
    // What the coat had set sounding is silenced in the call that lifts it, ahead of the lift's own sound.
    expect(hall.takeSounds()[0]).toEqual({ hush: 'raincoat' })
    hall.dragStart()
    hall.dragMove(NOWHERE.x, NOWHERE.y)
    hall.takeNotes()
    const tabs = piece.tabs
    // Held for a second: no tab folds, no settle sounds, nobody answers a landing that was undone.
    expect(run(hall, 1)).toEqual([])
    expect(piece.tabs).toBe(tabs)
    expect(tabs).toBe(0)
  })
})

describe('every garment on the rack is plain and still', () => {
  it('has no motion of its own at rest', () => {
    const hall = new Hall(seen())
    const before = GARMENTS.map((garment) => JSON.stringify([hall.pieces[garment].x, hall.pieces[garment].y, hall.pieces[garment].rot, hall.pieces[garment].swing.x]))
    run(hall, 5)
    expect(GARMENTS.map((garment) => JSON.stringify([hall.pieces[garment].x, hall.pieces[garment].y, hall.pieces[garment].rot, hall.pieces[garment].swing.x]))).toEqual(before)
  })
})

describe('the baby under a coat', () => {
  it('is touched on its head, which is drawn over the coat, and the coat is touched below it', () => {
    const hall = new Hall(wearing({ duffel: on('baby', 'body') }))
    const baby = hall.actors.baby, face = BODIES.baby.face
    hall.press(baby.x + face.x, baby.y + face.y)
    expect(hall.pieces.duffel.mode).toBe('rest')
    hall.tap()
    expect(hall.save.turn).toBe('baby')
    run(hall, SWAP_SECONDS + 0.5)
    hall.press(hall.actors.baby.x + 96, hall.actors.baby.y - 30)
    hall.dragStart()
    hall.dragMove(hall.actors.baby.x + 140, hall.actors.baby.y - 60)
    expect(hall.pieces.duffel.mode).toBe('held')
    hall.cancel()
  })
})
