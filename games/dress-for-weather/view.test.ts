import { describe, expect, it } from 'vitest'
import { Hall } from './hall'
import { GARMENTS, SPOTS, ZIP_TEETH, type Garment } from './kinds'
import { GARDEN, HANDLE, ON_RACK, SHEET, aimsOf, paperBox, placesOf, type Point } from './layout'
import { useCanvases, type Pen, type Sheet } from './paper'
import { WEATHERS, freshSave, type Save } from './save'
import { STAGE, fit } from './stage'
import { HallView } from './view'

// The frame budget: a canvas game's draw count is its sprite stamps plus its
// live fills and strokes. A pen that draws nothing counts them, so the count
// the view reports is checked against what it really asked of the surface.

const COUNTED = new Set(['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect'])
/** The jam's bar for one frame. */
const BUDGET = 80

function countingPen(): { pen: Pen; count: () => number; reset: () => void } {
  let n = 0
  const pen = new Proxy({}, {
    get: (_, name) => (name === 'getTransform' ? () => ({ a: 1 }) : () => { if (COUNTED.has(String(name))) n += 1 }),
    set: () => true,
  }) as unknown as Pen
  return { pen, count: () => n, reset: () => { n = 0 } }
}

function sized(): { view: HallView; count: () => number; reset: () => void } {
  const off = countingPen()
  useCanvases((): Sheet => ({ width: 0, height: 0, getContext: () => off.pen }))
  const main = countingPen(), view = new HallView(main.pen)
  view.resize(STAGE.width * 2, STAGE.height * 2, 2, fit(STAGE.width, STAGE.height))
  main.reset()
  return { view, count: main.count, reset: main.reset }
}

/**
 * A pen that draws nothing and remembers where it was asked to: it keeps the transform as a canvas does, and
 * notes every point a filled path was started at, on the stage, with the colour it was filled in.
 */
function tracingPen(): { pen: Pen; fills: { colour: string; points: Point[] }[] } {
  let m = [1, 0, 0, 1, 0, 0], path: Point[] = [], colour = ''
  const stack: number[][] = [], fills: { colour: string; points: Point[] }[] = []
  const by = (a: number, b: number, c: number, d: number, e: number, f: number) => { m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]] }
  const does: Record<string, (...args: number[]) => void> = {
    save: () => { stack.push(m) },
    restore: () => { m = stack.pop() ?? m },
    setTransform: (a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) => { m = [a, b, c, d, e, f] },
    transform: by,
    translate: (x, y) => by(1, 0, 0, 1, x, y),
    rotate: (r) => by(Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0),
    scale: (x, y) => by(x, 0, 0, y, 0, 0),
    beginPath: () => { path = [] },
    moveTo: (x, y) => { path.push({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }) },
    fill: () => { fills.push({ colour, points: path }) },
  }
  const pen = new Proxy({}, {
    get: (_, name) => does[String(name)] ?? (() => {}),
    set: (_, name, value) => { if (name === 'fillStyle') colour = String(value); return true },
  }) as unknown as Pen
  return { pen, fills }
}

const onRack = (garment: Garment) => {
  const box = paperBox(garment, ON_RACK[garment], false)
  return { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }
}

describe('one frame of the hall', () => {
  it('draws nothing on a surface with no size, and only the setting before the slot is read', () => {
    const none = countingPen(), view = new HallView(none.pen)
    expect(view.draw(null, null)).toBe(0)
    expect(none.count()).toBe(0)
    const { view: ready, count } = sized()
    expect(ready.draw(null, null)).toBe(1)
    expect(count()).toBe(1)
  })

  it('reports the draw count it really made, under the budget, in the fullest moments of the toy', () => {
    const { view, count, reset } = sized()
    const moments: [string, Hall, { glow: number; demo: number | null; demoIndex: number } | null][] = []
    // Everything on the rack, the glow on all of it and the ghost hand out.
    moments.push(['rack and guidance', new Hall(freshSave(5)), { glow: 1, demo: 0.5, demoIndex: 0 }])
    // A coat on with the zip hint.
    moments.push(['zip and guidance', new Hall(freshSave(3)), { glow: 1, demo: 0.5, demoIndex: 0 }])
    // Everything worn, everything just put on at once: every tab turning, every face pulled, one garment in the hand over a spot.
    const save = freshSave(5)
    GARMENTS.forEach((garment, i) => { save.where[garment] = SPOTS[(i * 3) % SPOTS.length] })
    const busy = new Hall({ ...save, zip: ZIP_TEETH / 2, open: true })
    for (const garment of GARMENTS) busy.pieces[garment].fold.fill(0.5)
    for (const who of ['child', 'grandfather', 'baby', 'dog'] as const) busy.actors[who].face = 'giggle'
    busy.press(700, 300)
    busy.pressEnd()
    busy.step(1 / 60)
    for (const garment of GARMENTS) busy.pieces[garment].fold.fill(0.5)
    moments.push(['everything worn and turning', busy, null])
    const carrying = new Hall(freshSave(5)), to = aimsOf({ who: 'child', part: 'head' }, placesOf('child'))[0]
    carrying.press(onRack('boots').x, onRack('boots').y)
    carrying.dragStart()
    carrying.dragMove(to.x, to.y)
    moments.push(['a garment in the hand', carrying, null])
    // Each kind of hint the ladder can be on, in a hall that came home wet and in one that is finished.
    const home: Save = { ...freshSave(5), back: true, shown: ['door', 'out', 'vane'] }
    GARMENTS.forEach((garment, i) => {
      home.where[garment] = SPOTS[(i * 3) % SPOTS.length]
      home.marks[garment] = i % 2 ? 'wet' : 'snowy'
    })
    for (let demoIndex = 0; demoIndex < 3; demoIndex++) moments.push([`home again, hint ${demoIndex}`, new Hall(home), { glow: 1, demo: 0.4, demoIndex }])
    moments.push(['finished', new Hall({ ...freshSave(5), finished: true }), { glow: 1, demo: 0.4, demoIndex: 0 }])
    // Two figures changing places while the dog struts and a wet garment shakes on its peg.
    const walking = new Hall(home)
    walking.press(walking.actors.baby.x, walking.actors.baby.y - 100)
    walking.tap()
    const back = aimsOf({ who: 'dog', part: 'back' }, walking.stands())[0]
    walking.press(onRack('boots').x, onRack('boots').y)
    walking.dragStart()
    walking.dragMove(back.x, back.y)
    walking.drop(back.x, back.y)
    for (let i = 0; i < 30; i++) walking.step(1 / 60)
    moments.push(['changing places', walking, null])
    // The showing of the door with the door ajar, and the showing of the vane.
    const showing = new Hall(freshSave(5))
    showing.press(onRack('hat').x, onRack('hat').y)
    showing.tap()
    for (let i = 0; i < 150; i++) showing.step(1 / 60)
    expect(showing.doorOpen).toBeGreaterThan(0)
    moments.push(['the door ajar', showing, null])
    for (const [name, hall, guidance] of moments) {
      reset()
      const reported = view.draw(hall, guidance)
      expect(reported, name).toBe(count())
      expect(reported, name).toBeLessThanOrEqual(BUDGET)
      expect(reported, name).toBeGreaterThan(20)
    }
  })

  it('stays under the budget at every moment of the fullest outing in every weather, for each figure, the garden over the hall while the sheet turns', () => {
    const { view, count, reset } = sized()
    let worst = 0
    for (const weather of WEATHERS) for (const turn of ['child', 'grandfather', 'baby'] as const) for (const done of [false, true]) {
      const save: Save = { ...freshSave(5), turn, weather, shown: ['door', 'out', 'vane'], zip: done ? ZIP_TEETH : 4, buttons: [done, done, done], tug: done ? 3 : 0, open: done }
      save.where.hat = { who: turn, part: 'head' }
      save.where.scarf = { who: turn, part: 'neck' }
      save.where[done ? 'raincoat' : 'duffel'] = { who: turn, part: 'body' }
      save.where[done ? 'umbrella' : 'mittens'] = { who: turn, part: 'hands' }
      save.where.boots = { who: turn, part: 'feet' }
      save.where[done ? 'duffel' : 'raincoat'] = { who: 'dog', part: 'back' }
      const hall = new Hall(save)
      hall.press(HANDLE.x, HANDLE.y)
      hall.tap()
      let most = 0, garden = 0
      for (let i = 0; i < 9.5 * 30 && hall.inScene; i++) {
        hall.step(1 / 30)
        reset()
        const reported = view.draw(hall, { glow: 1, demo: 0.5, demoIndex: 0 })
        expect(reported).toBe(count())
        most = Math.max(most, reported)
        if (hall.flip === 1) garden += 1
      }
      expect(garden).toBeGreaterThan(100)
      expect(most, `${weather} ${turn} ${done ? 'done up' : 'loose'}`).toBeLessThanOrEqual(BUDGET)
      worst = Math.max(worst, most)
    }
    // The fullest frame there is, as counted here: reported in REFINEMENT.md.
    expect(worst).toBeGreaterThan(40)
  })

  it('draws the garden alone once the sheet is over, and the hall alone once it is back', () => {
    const { view } = sized()
    const hall = new Hall({ ...freshSave(5), shown: ['door', 'out', 'vane'] })
    const atRest = view.draw(hall, null)
    hall.press(HANDLE.x, HANDLE.y)
    hall.tap()
    for (let i = 0; i < 80; i++) hall.step(1 / 60)
    expect(hall.flip).toBe(1)
    const inGarden = view.draw(hall, null)
    expect(inGarden).toBeLessThan(atRest)
    expect(inGarden).toBeGreaterThan(8)
  })

  it('draws the drops and the snow an outing left in the garment\'s own place: they go with the figure that hops, and into the hand', () => {
    const off = countingPen()
    useCanvases((): Sheet => ({ width: 0, height: 0, getContext: () => off.pen }))
    const trace = tracingPen(), view = new HallView(trace.pen)
    view.resize(STAGE.width, STAGE.height, 1, fit(STAGE.width, STAGE.height))
    const save: Save = { ...freshSave(5), shown: ['door', 'out', 'vane'], back: true }
    save.where.hat = { who: 'child', part: 'head' }
    save.where.scarf = { who: 'baby', part: 'neck' }
    save.marks.hat = 'wet'
    save.marks.scarf = 'snowy'
    const marksOf = (hall: Hall, colour: string): Point[] => {
      trace.fills.length = 0
      view.draw(hall, null)
      return trace.fills.filter((fill) => fill.colour === colour).flatMap((fill) => fill.points)
    }
    const WET = '#4f9fd6', SNOW = '#fdfeff'
    const hall = new Hall(save), hat = hall.pieces.hat
    const still = marksOf(hall, WET)
    expect(still.length).toBe(3)
    // On the hat's paper, where the hat lies.
    const box = paperBox('hat', hat, false)
    for (const drop of still) {
      expect(drop.x).toBeGreaterThan(box.x0)
      expect(drop.x).toBeLessThan(box.x1)
      expect(drop.y).toBeGreaterThan(box.y0)
      expect(drop.y).toBeLessThan(box.y1 + 6)
    }
    expect(marksOf(hall, SNOW).length).toBe(3)
    // The child is poked and hops on its stand: the drops go up with the hat.
    hall.actors.child.hop.x = 30
    const hopped = marksOf(hall, WET)
    expect(hopped.length).toBe(3)
    expect(still[0].y - hopped[0].y).toBeGreaterThan(20)
    hall.actors.child.hop.x = 0
    // Lifted off the head and carried away, the hat is still wet in the hand.
    hall.press(hat.x, hat.y - 20)
    hall.dragStart()
    hall.dragMove(700, 300)
    const held = marksOf(hall, WET)
    expect(held.length).toBe(3)
    const inHand = paperBox('hat', hat, false)
    for (const drop of held) {
      expect(drop.x).toBeGreaterThan(inHand.x0)
      expect(drop.x).toBeLessThan(inHand.x1)
      expect(Math.abs(drop.y - hat.y)).toBeLessThan(120)
    }
    expect(Math.abs(held[0].x - still[0].x)).toBeGreaterThan(100)
  })

  it('stamps the gate after the figure in the garden, so that whoever lies down or is blown that way is behind its post', () => {
    // Every piece is cut to its own size; the gate's is the only one as wide as from its post to the edge of the sheet and as tall as the sheet.
    const stamped: Sheet[] = []
    const off = countingPen()
    useCanvases((): Sheet => ({ width: 0, height: 0, getContext: () => off.pen }))
    const pen = new Proxy({}, {
      get: (_, name) => (name === 'drawImage' ? (sheet: Sheet) => { stamped.push(sheet) } : name === 'getTransform' ? () => ({ a: 1 }) : () => {}),
      set: () => true,
    }) as unknown as Pen
    const view = new HallView(pen)
    view.resize(STAGE.width, STAGE.height, 1, fit(STAGE.width, STAGE.height))
    const save: Save = { ...freshSave(5), turn: 'grandfather', weather: 'sun', open: true, shown: ['door', 'out', 'vane'] }
    save.where.hat = { who: 'grandfather', part: 'head' }
    save.where.umbrella = { who: 'grandfather', part: 'hands' }
    const hall = new Hall(save)
    hall.press(HANDLE.x, HANDLE.y)
    hall.tap()
    for (let i = 0; i < 100; i++) hall.step(1 / 60)
    expect(hall.flip).toBe(1)
    view.draw(hall, null)
    const isGate = (sheet: Sheet) => sheet.width > SHEET.x1 - GARDEN.post.x + 34 && sheet.width < 200 && sheet.height > 600
    expect(stamped.filter(isGate).length).toBe(1)
    expect(stamped.length).toBeGreaterThan(8)
    expect(isGate(stamped[stamped.length - 1])).toBe(true)
  })
})
