import { describe, expect, it } from 'vitest'
import { Hall } from './hall'
import { type Figure, type Garment, type Spot } from './kinds'
import { BUTTON_AT, HANDLE, ON_RACK, VANE, aimsOf, fromPaper, paperBox, sliderAt, type Point } from './layout'
import { deserialize, freshSave, serialize, type Save } from './save'
import type { Sound } from './voices'

// Found as left. Put away at any instant, the hall is exactly the hall a load
// of what was saved would show: nothing is in the air, in the hand or part
// way through, nothing replays, and nothing is heard. Every state the game
// can be put away in is built here, parked, and compared with a hall loaded
// from its own save, at once and after both have been watched for a while.

const FRAME = 1 / 60
const NOWHERE: Point = { x: 700, y: 300 }
const onRack = (garment: Garment): Point => {
  const box = paperBox(garment, ON_RACK[garment], false)
  return { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }
}
const on = (who: Figure | 'dog', part: Spot['part']): Spot => ({ who, part })
const run = (hall: Hall, seconds: number): Sound[] => {
  const heard: Sound[] = []
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    hall.step(FRAME)
    heard.push(...hall.takeNotes())
  }
  return heard
}
const tapAt = (hall: Hall, at: Point): void => {
  hall.press(at.x, at.y)
  hall.tap()
}
const carry = (hall: Hall, from: Point, to: Point): void => {
  hall.press(from.x, from.y)
  hall.dragStart()
  hall.dragMove((from.x + to.x) / 2, (from.y + to.y) / 2)
  hall.dragMove(to.x, to.y)
}
const wearing = (worn: Partial<Record<Garment, Spot>>, more: Partial<Save> = {}): Save => {
  const save = { ...freshSave(5), shown: ['door', 'out', 'vane'] as Save['shown'], ...more }
  save.where = { ...save.where, ...worn }
  return save
}
const headOf = (hall: Hall, who: Figure): Point => aimsOf(on(who, 'head'), hall.stands())[0]
const figure = (hall: Hall, who: Figure): Point => ({ x: hall.actors[who].x, y: hall.actors[who].y - 100 })
const zipAt = (hall: Hall, teeth: number): Point => fromPaper(hall.pieces.raincoat, sliderAt(teeth).x, sliderAt(teeth).y)
const dressed = (more: Partial<Save> = {}): Save => wearing({ hat: on('child', 'head'), raincoat: on('child', 'body'), boots: on('child', 'feet'), umbrella: on('dog', 'back') }, { zip: 5, open: true, ...more })

/** Every state the game can be put away in: a name, and how to get a hall into it. */
const STATES: [string, () => Hall][] = [
  ['a first visit at three, untouched', () => new Hall(freshSave(3))],
  ['a finger resting on a garment on the rack', () => { const hall = new Hall(wearing({})); hall.press(onRack('hat').x, onRack('hat').y); return hall }],
  ['a garment in the hand over a head', () => { const hall = new Hall(wearing({})); carry(hall, onRack('boots'), headOf(hall, 'grandfather')); run(hall, 0.2); return hall }],
  ['a worn garment in the hand', () => { const hall = new Hall(dressed()); carry(hall, { x: hall.pieces.hat.x, y: hall.pieces.hat.y - 20 }, NOWHERE); run(hall, 0.3); return hall }],
  ['a garment in the air on its way to a body', () => { const hall = new Hall(wearing({})); tapAt(hall, onRack('scarf')); run(hall, 0.1); return hall }],
  ['a garment in the air on its way to the rack', () => { const hall = new Hall(dressed()); carry(hall, { x: hall.pieces.hat.x, y: hall.pieces.hat.y - 20 }, NOWHERE); hall.drop(NOWHERE.x, NOWHERE.y); run(hall, 0.1); return hall }],
  ['a garment caught out of the air', () => { const hall = new Hall(wearing({})); tapAt(hall, onRack('hat')); run(hall, 0.1); hall.press(hall.pieces.hat.x, hall.pieces.hat.y - 20); return hall }],
  ['a tab half folded', () => { const hall = new Hall(wearing({})); tapAt(hall, onRack('raincoat')); run(hall, 0.42 + 0.15); return hall }],
  ['the others still answering a landing', () => { const hall = new Hall(wearing({})); tapAt(hall, onRack('duffel')); run(hall, 1.1); return hall }],
  ['the zip under the finger, half way', () => { const hall = new Hall(dressed({ zip: 0 })); hall.press(zipAt(hall, 0).x, zipAt(hall, 0).y); hall.dragStart(); hall.dragMove(zipAt(hall, 7).x, zipAt(hall, 7).y); run(hall, 0.03); return hall }],
  ['the zip running after a tap', () => { const hall = new Hall(dressed({ zip: 3 })); tapAt(hall, zipAt(hall, 3)); return hall }],
  ['a button on its way through', () => { const hall = new Hall(wearing({ duffel: on('child', 'body') })); tapAt(hall, fromPaper(hall.pieces.duffel, BUTTON_AT[1].x, BUTTON_AT[1].y)); run(hall, 0.04); return hall }],
  ['the boots one tug on', () => { const hall = new Hall(dressed()); tapAt(hall, { x: hall.pieces.boots.x + hall.pieces.boots.sep, y: hall.pieces.boots.y + 30 }); run(hall, 0.05); return hall }],
  ['the umbrella opening', () => { const hall = new Hall(wearing({ umbrella: on('child', 'hands') })); tapAt(hall, { x: hall.pieces.umbrella.x, y: hall.pieces.umbrella.y - 60 }); run(hall, 0.05); return hall }],
  ['a figure half way to the middle', () => { const hall = new Hall(dressed()); tapAt(hall, figure(hall, 'baby')); run(hall, 0.6); return hall }],
  ['the dog half way round the hall', () => { const hall = new Hall(wearing({})); const to = aimsOf(on('dog', 'back'), hall.stands())[0]; carry(hall, onRack('scarf'), to); hall.drop(to.x, to.y); run(hall, 1.6); return hall }],
  ['the vane just turned', () => { const hall = new Hall(dressed()); tapAt(hall, VANE); run(hall, 0.1); return hall }],
  ['a finger on the door', () => { const hall = new Hall(dressed()); hall.press(HANDLE.x, HANDLE.y); return hall }],
  ['an outing as the door swings', () => { const hall = new Hall(dressed()); tapAt(hall, HANDLE); run(hall, 0.15); return hall }],
  ['an outing as the figure walks to the door', () => { const hall = new Hall(dressed()); tapAt(hall, HANDLE); run(hall, 0.4); return hall }],
  ['an outing as the sheet turns over', () => { const hall = new Hall(dressed()); tapAt(hall, HANDLE); run(hall, 0.85); return hall }],
  ['an outing in its second cell', () => { const hall = new Hall(dressed()); tapAt(hall, HANDLE); run(hall, 2.5); return hall }],
  ['an outing in the wind with the hat in the air', () => { const hall = new Hall(dressed({ weather: 'wind' })); tapAt(hall, HANDLE); run(hall, 1.6); return hall }],
  ['an outing at the figure\'s own beat', () => { const hall = new Hall(dressed({ weather: 'sun' })); tapAt(hall, HANDLE); run(hall, 4.7); return hall }],
  ['an outing as the sheet turns back', () => { const hall = new Hall(wearing({}, { weather: 'snow' })); tapAt(hall, HANDLE); run(hall, 1.1 + 1.05 + 0.6 + 0.3); return hall }],
  ['the garden touched, the hall back with flakes at the finger', () => { const hall = new Hall(dressed({ weather: 'snow' })); tapAt(hall, HANDLE); run(hall, 2.5); hall.press(NOWHERE.x, NOWHERE.y); run(hall, 0.05); return hall }],
  ['an outing in the wind after which a wet thing the dog wore will shake on its peg', () => { const save = dressed({ weather: 'wind' }); save.marks.umbrella = 'wet'; const hall = new Hall(save); tapAt(hall, HANDLE); run(hall, 2); return hall }],
  ['an outing in vest and socks, as its ending begins', () => { const hall = new Hall(wearing({})); tapAt(hall, HANDLE); run(hall, 4.9); return hall }],
  ['the ending as the figure stretches', () => { const hall = new Hall(wearing({ hat: on('child', 'head') }, { back: true })); carry(hall, { x: hall.pieces.hat.x, y: hall.pieces.hat.y - 20 }, NOWHERE); hall.drop(NOWHERE.x, NOWHERE.y); run(hall, 0.5); return hall }],
  ['the ending as the others look round', () => { const hall = new Hall(wearing({ hat: on('child', 'head') }, { back: true })); carry(hall, { x: hall.pieces.hat.x, y: hall.pieces.hat.y - 20 }, NOWHERE); hall.drop(NOWHERE.x, NOWHERE.y); run(hall, 3.2); return hall }],
  ['a finished hall', () => { const hall = new Hall(wearing({}, { finished: true })); run(hall, 2); return hall }],
  ['a finished figure standing up for a garment', () => { const hall = new Hall(wearing({}, { finished: true })); tapAt(hall, onRack('hat')); run(hall, 0.2); return hall }],
  ['the showing of the door as the dog scratches', () => { const hall = new Hall(freshSave(5)); tapAt(hall, onRack('hat')); run(hall, 1.2); return hall }],
  ['the showing of the door with the door ajar', () => { const hall = new Hall(freshSave(5)); tapAt(hall, onRack('hat')); run(hall, 2.8); return hall }],
  ['the showing of the vane as the weather flickers', () => { const hall = new Hall(dressed({ shown: ['door', 'out'], back: true })); hall.press(NOWHERE.x, NOWHERE.y); hall.tap(); run(hall, 2.6); return hall }],
  ['the showing of the vane with the arm on the glass', () => { const hall = new Hall(dressed({ shown: ['door', 'out'], back: true })); hall.press(NOWHERE.x, NOWHERE.y); hall.tap(); run(hall, 0.5); return hall }],
  ['the showing of the vane owed, a finger down', () => { const hall = new Hall(dressed({ shown: ['door', 'out'], back: true })); hall.press(NOWHERE.x, NOWHERE.y); return hall }],
  ['a garment waiting in the air after the finger lifted', () => { const hall = new Hall(wearing({})); carry(hall, onRack('boots'), NOWHERE); hall.dragLift(); run(hall, 0.1); return hall }],
  ['a ripple on the wall and a poked dog', () => { const hall = new Hall(dressed()); tapAt(hall, NOWHERE); tapAt(hall, { x: hall.actors.dog.x, y: hall.actors.dog.y - 40 }); run(hall, 0.05); return hall }],
  ['a garment hung up wet, shaking on its peg', () => { const save = dressed({ back: true }); save.marks.hat = 'wet'; const hall = new Hall(save); carry(hall, { x: hall.pieces.hat.x, y: hall.pieces.hat.y - 20 }, NOWHERE); hall.drop(NOWHERE.x, NOWHERE.y); run(hall, 0.5); return hall }],
]

describe.each(STATES)('put away with %s', (_, build) => {
  it('is the hall a load of its save would show, at once', () => {
    const hall = build()
    hall.putAway()
    expect(hall.takeNotes()).toEqual([])
    const loaded = new Hall(deserialize(JSON.parse(JSON.stringify(hall.toSave())), 5), hall.t)
    expect(hall.seen()).toEqual(loaded.seen())
    expect(hall.inScene).toBe(false)
    expect(hall.busy).toBe(false)
  })

  it('stays that hall while it is watched, plays nothing again and makes no sound', () => {
    const hall = build()
    hall.putAway()
    const saved = serialize(hall.toSave()), loaded = new Hall(saved, hall.t)
    hall.dirty = null
    for (const seconds of [0.5, 3, 8]) {
      expect(run(hall, seconds)).toEqual([])
      expect(run(loaded, seconds)).toEqual([])
      expect(hall.seen()).toEqual(loaded.seen())
    }
    expect(hall.toSave()).toEqual(saved)
    expect(hall.dirty).toBeNull()
  })

  it('has saved everything by the time it is put away: putting away changes nothing in the save', () => {
    const hall = build(), before = hall.toSave()
    hall.putAway()
    expect(hall.toSave()).toEqual(before)
  })
})

describe('a touch that is taken away', () => {
  it.each(STATES)('never acts for the child: %s', (_, build) => {
    const hall = build(), before = hall.toSave()
    // The browser takes the finger: the press ends, or the drag is cancelled.
    hall.cancel()
    hall.pressEnd()
    expect(hall.toSave()).toEqual(before)
  })

  it('leaves the vane, the door and a waiting figure as they were', () => {
    const hall = new Hall(dressed())
    for (const at of [VANE, HANDLE, figure(hall, 'baby')]) {
      hall.press(at.x, at.y)
      hall.pressEnd()
      hall.press(at.x, at.y)
      hall.cancel()
    }
    expect(hall.toSave()).toEqual(dressed())
    expect(hall.inScene).toBe(false)
  })
})
