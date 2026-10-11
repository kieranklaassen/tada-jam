import { describe, expect, it } from 'vitest'
import { VISITORS } from './cast'
import { BOUNCES, Garden, facing } from './garden'
import { PATH, PATH_CLEAR, VASE, VISITOR } from './layout'
import { EARTH, SLOTS, isUpright } from './place'
import { bunOf, restLook } from './rig'
import { opening } from './view'
import { BED, KINDS, SOIL_Y, fullOf, type Kind } from './plants'
import { deserialize, serialize, type Saved } from './save'
import { STAGE } from './stage'
import * as voices from './voices'

// What the sheet promises of the characters and of the cells of the grid, each
// held here so that the game goes on doing what the sheet says.

const open = (position: string, more: Partial<Saved> = {}, seed = 1): Garden => new Garden({ ...deserialize(null, null), position, ...more }, seed)
const stored = (garden: Garden): Saved => deserialize(JSON.parse(JSON.stringify(serialize(garden.toSave()))), null)
const run = (garden: Garden, seconds: number): void => { for (let t = 0; t < seconds - 1e-9; t += 0.05) garden.step(0.05) }
const top = (stem: number, len: number) => ({ stem, base: fullOf(stem) - len, len, head: true, spent: false })
const stemOf = (kind: Kind): number => BED.findIndex((spot) => spot.kind === kind)
const heard = (garden: Garden, sound: voices.Sound): boolean => garden.sounds.some((note) => note.frequency === sound[0].frequency && note.kind === sound[0].kind && note.decay === sound[0].decay)
/** Plays the handing over that a touch on the visitor starts, and calls `each` at every step of it. */
const handOver = (garden: Garden, each: () => void = () => {}): void => {
  let at: [number, number] | null = null
  for (let y = VISITOR.y - 150; y <= VISITOR.y + 150 && !at; y += 10) for (let x = VISITOR.x - 80; x <= VISITOR.x + 80 && !at; x += 10) if (garden.targetAt(x, y).on === 'visitor') at = [x, y]
  garden.press(...at!); garden.lift(...at!)
  expect(garden.playing).toBe(true)
  let t = 0
  while (garden.playing && t < 30) { garden.step(0.05); t += 0.05; each() }
}

describe('the visitor and its vase', () => {
  it('holds its empty vase out, turned to the child, each visitor in its own way, and sets it down for a piece', () => {
    const ways = VISITORS.map((who) => {
      const garden = open(`${who}-boot`)
      run(garden, 4)
      expect(garden.actors[who].present, who).toBeGreaterThan(0.9)
      const held = garden.potAt
      expect(held.dy, who).toBeLessThan(-1)
      expect(held.dx, who).toBeLessThan(0)
      // A piece is on its way: the vase is set down for it, and stays down while something stands in it.
      garden.press(BED[2].x, SOIL_Y - 100)
      run(garden, 0.6)
      expect(garden.actors[who].present, who).toBeLessThan(0.05)
      garden.move(VASE.boot.x, VASE.boot.mouthY - 60); garden.lift(VASE.boot.x, VASE.boot.mouthY - 60)
      run(garden, 3)
      expect(garden.actors[who].present, who).toBeLessThan(0.01)
      expect(garden.potAt).toMatchObject({ dx: 0, dy: 0, tilt: 0 })
      return `${Math.round(held.dx)} ${Math.round(held.tilt * 100)}`
    })
    expect(new Set(ways).size).toBe(VISITORS.length)
  })

  it('has the goat walk out with its one piece behind its horn and the bride with her bouquet on her head', () => {
    for (const who of ['goat', 'bride'] as const) {
      const garden = open(`${who}-boot`, { vase: [{ ...top(2, 120), at: 0 }, { ...top(8, 120), at: 4 }] })
      let wornOnTheWay = 0
      expect(garden.wears(who)).toBe(false)
      handOver(garden, () => { if (garden.actors[who].where === 'table' && garden.actors[who].act?.name === 'leave' && garden.wears(who)) wornOnTheWay++ })
      // For the whole walk to the gate, not first over the wall.
      expect(wornOnTheWay, who).toBeGreaterThan(10)
      expect(garden.wears(who)).toBe(true)
    }
    // The other two carry theirs out in the vase and wear nothing.
    const garden = open('beekeeper-jar', { vase: [{ ...top(2, 120), at: 0 }] })
    handOver(garden)
    expect(garden.wears('beekeeper')).toBe(false)
  })

  it('has the bee-keeper turn a vase with no bee in it, hold it to her ear and shake it, and her bees sag', () => {
    const garden = open('beekeeper-jar', { vase: [{ ...top(2, 120), at: 0 }] })
    let turned = 0, atEar = 0, shaken = 0, last = 0
    handOver(garden, () => {
      if (garden.actors.beekeeper.act?.name !== 'cannot') return
      const pot = garden.pot
      turned = Math.max(turned, Math.abs(pot.tilt) < 0.9 ? Math.abs(pot.tilt) : 0)
      if (pot.tilt > 0.95) { atEar = Math.min(atEar, pot.dy); if (Math.abs(pot.dx - last) > 2) shaken++ }
      last = pot.dx
    })
    expect(turned).toBeGreaterThan(0.3)
    // Up beside her head: far above the table.
    expect(atEar).toBeLessThan(-120)
    expect(shaken).toBeGreaterThan(3)
    expect(heard(garden, voices.rattle)).toBe(true)
    // The bees sag though none moved into her hat today.
    expect(garden.actors.beekeeper.hatBees).toBe(0)
    expect(garden.actors.beekeeper.sag).toBeGreaterThan(0)
    expect(garden.pot.tilt).toBe(0)
  })

  it('gives each bee its own hummed note, for as many bees as the vase can hold', () => {
    const bees = [0, 1, 4, 5, 6, 7, 0].map((stem, index) => ({ ...top(stem, 100), at: index - 3 }))
    const garden = open('beekeeper-boot', { vase: bees })
    handOver(garden)
    const notes = new Set([0, 1, 2, 3, 4, 5, 6].map((index) => voices.humNote(index)[0].frequency))
    expect(notes.size).toBe(7)
    for (const frequency of notes) expect(garden.sounds.some((note) => note.frequency === frequency && note.wave === 'triangle'), `note ${frequency}`).toBe(true)
  })

  it('has the aunt stand a tipped piece straight with her fingertip, and it sinks back', () => {
    const garden = open('aunt-jar', { vase: [{ ...top(0, 340), at: 8 }, { ...top(2, 100), at: -2 }] })
    run(garden, 1)
    const tipped = garden.inPot[0]
    const before = { lean: tipped.prot, bend: tipped.bend }
    expect(before.bend).not.toBe(0)
    let straightest = 1, mended = false
    handOver(garden, () => {
      if (garden.mend) { mended = true; expect(garden.mend.piece).toBe(garden.inPot[0]); straightest = Math.min(straightest, Math.abs(garden.inPot[0].bend / before.bend)) }
      // And when her finger has left it, it is as it was.
      if (garden.actors.aunt.act?.name === 'cannot' && garden.actors.aunt.act.u > 0.85) expect(garden.inPot[0].bend).toBeCloseTo(before.bend, 1)
    })
    expect(mended).toBe(true)
    expect(straightest).toBeLessThan(0.05)
    expect(garden.mend).toBeNull()
  })
})

describe('the cells of the grid', () => {
  it('opens the blades with their double tick at a finger on a cut stalk, as on bare air', () => {
    const garden = open('goat-boot', { bed: BED.map((_, index) => (index === 4 ? 60 : fullOf(index))) })
    garden.press(BED[4].x, SOIL_Y - 30)
    expect(garden.scissors.open).toBeGreaterThan(0)
    expect(heard(garden, voices.bladesOpen)).toBe(true)
    expect(heard(garden, voices.growBack)).toBe(true)
    expect(garden.stems[4].height).toBe(fullOf(4))
  })

  it('lets a poppy in the vase drop a petal with a pat each time another piece arrives', () => {
    const garden = open('goat-boot', { vase: [{ ...top(2, 120), at: -3 }] })
    run(garden, 1)
    garden.sounds.length = 0
    garden.press(BED[8].x, SOIL_Y - 100)
    garden.move(VASE.boot.x, VASE.boot.mouthY - 60); garden.lift(VASE.boot.x, VASE.boot.mouthY - 60)
    run(garden, 0.6)
    expect(heard(garden, voices.standing('poppy'))).toBe(true)
    expect(garden.bits.some((bit) => bit.kind === 'petal')).toBe(true)
  })

  it('shows what lifts and flies: the green haze of an onion flower, the long breath after the bite, the seeds over the wall', () => {
    const onStage = (garden: Garden, kind: 'haze' | 'fluff'): number => garden.bits.filter((bit) => bit.kind === kind && bit.y > 0 && bit.y < STAGE.height && bit.x > 0 && bit.x < STAGE.width).length
    // Stood in the vase.
    const vase = open('goat-boot')
    vase.press(BED[4].x, SOIL_Y - 100)
    vase.move(VASE.boot.x, VASE.boot.mouthY - 60); vase.lift(VASE.boot.x, VASE.boot.mouthY - 60)
    run(vase, 0.6)
    expect(onStage(vase, 'haze')).toBeGreaterThan(0)
    // Let go on the visitor: nothing yet at the bite, and then the breath.
    const bitten = open('goat-boot')
    bitten.press(BED[4].x, SOIL_Y - 100)
    bitten.move(VISITOR.x, VISITOR.y); bitten.lift(VISITOR.x, VISITOR.y)
    expect(onStage(bitten, 'haze')).toBe(0)
    run(bitten, bitten.actors.goat.actDur * 0.7)
    expect(onStage(bitten, 'haze')).toBeGreaterThanOrEqual(4)
    // A dandelion: its seeds leave upwards and are gone over the wall.
    const blown = open('goat-boot')
    blown.press(BED[10].x, SOIL_Y - 60)
    blown.move(VISITOR.x, VISITOR.y); blown.lift(VISITOR.x, VISITOR.y)
    run(blown, blown.actors.goat.actDur * 0.6)
    expect(onStage(blown, 'fluff')).toBeGreaterThanOrEqual(8)
    const high = blown.bits.filter((bit) => bit.kind === 'fluff').map((bit) => bit.y)
    run(blown, 0.5)
    expect(Math.max(...blown.bits.filter((bit) => bit.kind === 'fluff').map((bit) => bit.y))).toBeLessThan(Math.max(...high))
  })

  it('has each plant come away into the hand in its own way', () => {
    const swings = KINDS.map((kind) => {
      const garden = open('goat-boot', {}, 3)
      const stem = stemOf(kind)
      garden.press(BED[stem].x, SOIL_Y - 60)
      const trace: number[] = []
      for (let i = 0; i < 16; i++) { garden.move(BED[stem].x + i * 6, SOIL_Y - 60 - i * 4); garden.step(0.03); trace.push(Math.round(garden.hand!.prot * 200), Math.round(garden.hand!.py)) }
      return trace.join(' ')
    })
    expect(new Set(swings).size).toBe(KINDS.length)
  })
})

describe('the vase goes over when its load changes', () => {
  // Two heads tipped to the visitor's side and one to the bed's, in the tall vase, which goes over at two more on one side.
  const loaded = (): Garden => {
    const garden = open('bride-vase', { vase: [{ ...top(0, 340), at: 8 }, { ...top(1, 300), at: -8 }, { ...top(4, 300), at: 8 }] })
    run(garden, 1)
    return garden
  }

  it('goes over as the counterweight is drawn out, not at some later piece', () => {
    const garden = loaded()
    expect(garden.playing).toBe(false)
    const weight = garden.inPot[1]
    const tip = garden.tipOf(weight, garden.standingOf(weight))
    expect(garden.targetAt(tip.x, tip.y)).toMatchObject({ on: 'inVase', piece: weight })
    garden.press(tip.x, tip.y)
    expect(garden.hand).toBe(weight)
    expect(garden.playing).toBe(true)
    // Saved as it starts: the two that were left lie on the path, and the one in the hand is saved back in the vase.
    const saved = stored(garden)
    expect(saved.path).toHaveLength(2)
    expect(saved.vase).toHaveLength(1)
  })

  it('goes over when a head on the light side is cut off in the vase', () => {
    const garden = loaded()
    const weight = garden.inPot[1]
    // The blades cross its stalk a little above the rim, from the bed side, where the finger lands on nothing.
    const [ax, ay, bx, by] = garden.spine(weight)
    const y = VASE.vase.mouthY - 36, x = ax + ((bx - ax) * (y - ay)) / (by - ay)
    let from = 0
    for (let dx = 28; dx < 90 && !from; dx += 4) if (garden.targetAt(x - dx, y).on === 'air') from = x - dx
    expect(from).toBeGreaterThan(0)
    garden.press(from, y)
    garden.move(x + 3, y)
    expect(garden.hand).toMatchObject({ stem: 1, head: true })
    expect(garden.playing).toBe(true)
  })

  it('is never sent over by a piece too short to tip', () => {
    for (const position of ['beekeeper-jar', 'bride-vase']) {
      const vase = VASE[position.split('-')[1] as 'jar' | 'vase']
      // One head short of going over.
      const garden = open(position, { vase: Array.from({ length: vase.tips - 1 }, (_, index) => ({ ...top(index, 320), at: 8 })) })
      run(garden, 1)
      garden.press(BED[10].x, SOIL_Y - 100)
      garden.move(vase.x + 10, vase.mouthY - 60); garden.lift(vase.x + 10, vase.mouthY - 60)
      expect(garden.playing, position).toBe(false)
      expect(garden.vase).toHaveLength(vase.tips)
    }
  })
})

describe('what a child sees and hears, sentence by sentence', () => {
  const quiet = (garden: Garden): void => { garden.sounds = [] }
  const delayOf = (garden: Garden, sound: voices.Sound): number => garden.sounds.find((note) => note.frequency === sound[0].frequency && note.kind === sound[0].kind && note.decay === sound[0].decay)?.delay ?? 0

  it('springs the blades open with their double tick at a finger on a whole stem, and the snip follows the tick', () => {
    const garden = open('goat-boot')
    garden.press(BED[4].x, SOIL_Y - 120)
    expect(heard(garden, voices.bladesOpen)).toBe(true)
    const snip = voices.snip('onion', 1 - (120 / fullOf(4)))
    expect(heard(garden, snip)).toBe(true)
    expect(delayOf(garden, snip)).toBeGreaterThan(0.05)
    // The blades are seen open in that frame, and shut from there.
    expect(Math.max(garden.scissors.open, garden.scissors.snap)).toBe(1)
    expect(garden.scissors.seen).toBe(1)
    // A stem that the finger crosses is cut with no tick of its own: the blades were open already.
    const crossed = open('goat-boot')
    crossed.press(BED[4].x - 40, SOIL_Y - 120); quiet(crossed)
    crossed.move(BED[4].x + 10, SOIL_Y - 120)
    expect(heard(crossed, voices.bladesOpen)).toBe(false)
    expect(delayOf(crossed, snip)).toBe(0)
  })

  it('turns a sniffed sunflower round to face the visitor, and back when the nose has gone', () => {
    expect(facing(0)).toBe(0)
    expect(facing(0.28)).toBe(1)
    expect(facing(1)).toBe(0)
    const garden = open('aunt-boot', { vase: [{ ...top(0, 150), at: 0 }, { ...top(2, 120), at: 4 }] })
    run(garden, 1)
    let narrowest = 1, faced = false
    handOver(garden, () => {
      const act = garden.actors.aunt.act
      const sunflower = garden.inPot.find((piece) => piece.kind === 'sunflower')
      if (!sunflower) return
      if (act?.name === 'sniff' && act.plant === 'sunflower') {
        narrowest = Math.min(narrowest, sunflower.wide)
        if (act.u > 0.3 && act.u < 0.8) { faced = true; expect(sunflower.wide).toBeCloseTo(1, 5) }
      } else if (act?.name === 'sniff') expect(sunflower.wide).toBe(1)
    })
    expect(faced).toBe(true)
    // It turned through edge-on on its way round.
    expect(narrowest).toBeLessThan(0.5)
  })

  it('sends a bee up with a buzz when its flower is let fall and when it is handed over, and at no other time', () => {
    const garden = open('goat-boot')
    garden.press(BED[0].x, SOIL_Y - 100)
    run(garden, 1.2)
    expect(garden.hand!.lift).toBe(0)
    quiet(garden)
    garden.move(300, 760); garden.lift(300, 760)
    expect(garden.path[0].lift).toBeGreaterThan(0)
    expect(heard(garden, voices.buzz)).toBe(true)
    run(garden, 2)
    expect(garden.path[0].lift).toBe(0)
    // A stalk that grows back has its bee sitting on it: nothing flies.
    quiet(garden)
    garden.press(BED[0].x, SOIL_Y - 30); garden.lift(BED[0].x, SOIL_Y - 30)
    expect(garden.stems[0].lift).toBe(0)
    expect(heard(garden, voices.buzz)).toBe(false)
    // Handed over: every bee of the bouquet flies, with one buzz, and has settled before the bouquet is carried out.
    const handed = open('bride-boot', { vase: [{ ...top(0, 150), at: -3 }, { ...top(6, 120), at: 3 }, { ...top(2, 120), at: 0 }] })
    run(handed, 1); quiet(handed)
    let flew = 0, settled = false
    handOver(handed, () => {
      const act = handed.actors.bride.act
      if (act?.name === 'take' && act.u < 0.5) flew = Math.max(flew, handed.inPot.filter((piece) => piece.lift > 0).length)
      if (act?.name === 'leave') settled ||= handed.inPot.every((piece) => piece.lift === 0)
    })
    expect(flew).toBe(2)
    expect(settled).toBe(true)
    expect(handed.sounds.filter((note) => note.frequency === voices.buzz[0].frequency && note.decay === voices.buzz[0].decay && note.delay === voices.buzz[0].delay)).toHaveLength(1)
  })

  it('draws the aunt\'s bun in tight at a neat bunch, for as long as her nod lasts', () => {
    const at = (u: number) => bunOf({ ...restLook('aunt'), act: { name: 'loves', plant: null, u } })
    expect(at(0.1)).toMatchObject({ wide: 1, turn: 0 })
    expect(at(0.95).wide).toBeGreaterThan(at(0.5).wide)
    expect(at(0.5).wide).toBeLessThan(0.8)
    expect(at(0.5).turn).toBeGreaterThan(1)
    expect(at(1).wide).toBeCloseTo(1, 6)
    expect(at(1).turn).toBeCloseTo(0, 6)
    // Shaken loose it hangs larger and off the back of her head, and no other act tightens it.
    expect(bunOf({ ...restLook('aunt'), loose: true }).wide).toBeGreaterThan(1.2)
    expect(bunOf({ ...restLook('aunt'), act: { name: 'cannot', plant: null, u: 0.5 } }).wide).toBe(1)
  })

  it('lets a spilled poppy land as it was: no petals thrown, no paf, and its petals still on', () => {
    const garden = open('beekeeper-jar', { vase: [{ ...top(2, 200), at: 8 }, { ...top(3, 190), at: 8 }, { ...top(4, 260), at: 8 }] })
    run(garden, 1); quiet(garden)
    // A fourth head tipped to the same side sends the jar over.
    garden.press(BED[0].x, SOIL_Y - 20); garden.move(VASE.jar.x + 30, VASE.jar.mouthY - 60); garden.lift(VASE.jar.x + 30, VASE.jar.mouthY - 60)
    let over = false, petals = 0
    for (let t = 0; t < 6; t += 0.05) { garden.step(0.05); over ||= garden.playing; petals = Math.max(petals, garden.bits.filter((bit) => bit.kind === 'petal').length) }
    expect(over).toBe(true)
    const poppies = garden.path.filter((piece) => piece.kind === 'poppy')
    expect(poppies).toHaveLength(2)
    for (const poppy of poppies) expect(poppy).toMatchObject({ spent: false, shownSpent: false, move: null })
    expect(petals).toBe(0)
    expect(heard(garden, voices.landing('poppy', 'whole'))).toBe(true)
    expect(heard(garden, voices.landing('poppy'))).toBe(false)
    expect(stored(garden).path.filter((piece) => piece.stem === 2 || piece.stem === 3).every((piece) => !piece.spent)).toBe(true)
    // One the child lets fall does shed them, with the paf; and one already bare only rattles.
    const dropped = open('goat-boot')
    dropped.press(BED[2].x, SOIL_Y - 100); dropped.move(300, 770); dropped.lift(300, 770)
    quiet(dropped); run(dropped, 1)
    expect(heard(dropped, voices.landing('poppy'))).toBe(true)
    expect(dropped.path[0]).toMatchObject({ spent: true, shownSpent: true })
    dropped.press(dropped.path[0].px + 30, dropped.path[0].py); dropped.move(200, 770); dropped.lift(200, 770)
    quiet(dropped); run(dropped, 1)
    expect(heard(dropped, voices.landing('poppy', 'bare'))).toBe(true)
    expect(heard(dropped, voices.landing('poppy'))).toBe(false)
  })

  it('sticks a thistle upright in the earth of the bed only where it is let go over the bed, between two stems', () => {
    const slot = SLOTS[2]
    const letGo = (x: number, y: number): Garden => {
      const garden = open('goat-boot')
      garden.press(BED[6].x, SOIL_Y - 100); garden.move(x, y); garden.lift(x, y)
      run(garden, 2)
      return garden
    }
    // Over the bed, between two stems: upright, its foot in the earth, at that place.
    for (const y of [SOIL_Y - 300, SOIL_Y - 120, SOIL_Y - 4]) {
      const garden = letGo(slot + 6, y)
      expect(garden.path[0]).toMatchObject({ x: slot, move: null })
      expect(isUpright(garden.path[0].rot)).toBe(true)
      expect(garden.path[0].y).toBeGreaterThanOrEqual(EARTH.top)
      expect(garden.path[0].y).toBeLessThanOrEqual(EARTH.bottom)
      expect(garden.path[0].y).toBeLessThan(PATH_CLEAR)
      // And it is found so again.
      const again = stored(garden).path[0]
      expect(again).toMatchObject({ x: slot, y: garden.path[0].y })
      expect(isUpright(again.rot)).toBe(true)
    }
    // Over the path at the same place across, or past the end of the bed, or high over the wall: flat on the path.
    for (const [x, y] of [[slot + 6, PATH.top + 10], [slot + 6, PATH.bottom], [BED[0].x - 44, SOIL_Y - 120], [slot + 6, 60]] as const) {
      const garden = letGo(x, y)
      expect(isUpright(garden.path[0].rot), `${x},${y}`).toBe(false)
      expect(garden.path[0].y, `${x},${y}`).toBeGreaterThanOrEqual(PATH.top)
    }
    // One thistle to a place.
    const garden = letGo(slot, SOIL_Y - 120)
    garden.press(BED[7].x, SOIL_Y - 100); garden.move(slot, SOIL_Y - 120); garden.lift(slot, SOIL_Y - 120)
    run(garden, 2)
    expect(garden.path.filter((piece) => isUpright(piece.rot) && piece.x === slot)).toHaveLength(1)
  })

  it('brings a thistle down point first, and tips it over where it does not stick', () => {
    const garden = open('goat-boot')
    garden.press(BED[6].x, SOIL_Y - 100); garden.move(300, 770)
    run(garden, 0.5)
    garden.lift(300, 770)
    const thistle = garden.path[0]
    let fell = 0, stood = false
    for (let t = 0; t < 2; t += 0.02) {
      garden.step(0.02)
      if (thistle.move === 'fall') { fell++; expect(Math.abs(thistle.prot)).toBeLessThanOrEqual(0.3 + 1e-9) }
      if (thistle.move === 'landed' && thistle.t < 0.08) stood ||= Math.abs(thistle.prot) <= 0.3 + 1e-9
    }
    expect(fell).toBeGreaterThan(3)
    expect(stood).toBe(true)
    expect(thistle.prot).toBeCloseTo(thistle.rot, 5)
    expect(Math.abs(thistle.rot)).toBeGreaterThan(1.4)
  })

  it('bounces an onion flower twice and rolls it on, with two bonks', () => {
    const garden = open('goat-boot')
    garden.press(BED[4].x, SOIL_Y - 100); garden.move(360, 770); garden.lift(360, 770)
    const onion = garden.path[0]
    const heights: number[] = []
    for (let t = 0; t < 2; t += 0.01) { garden.step(0.01); if (onion.move === 'landed') heights.push(onion.y - onion.py) }
    let peaks = 0
    for (let i = 1; i + 1 < heights.length; i++) if (heights[i] > 4 && heights[i] >= heights[i - 1] && heights[i] > heights[i + 1]) peaks++
    expect(peaks).toBe(2)
    // It is down and rolling for the last of it.
    expect(heights.slice(Math.ceil(heights.length * (BOUNCES + 0.02))).every((height) => Math.abs(height) < 1e-6)).toBe(true)
    expect(voices.landing('onion').filter((note) => note.kind === 'tone')).toHaveLength(2)
  })

  it('opens the flower of a stalk that grows back with the pop: shut, past its size, its size', () => {
    expect(opening(0.3)).toBe(0)
    expect(opening(0.8)).toBeGreaterThan(1.2)
    expect(opening(1)).toBe(1)
    // The pop is heard as it opens: 0.3 s into a growing of half a second.
    expect(voices.growBack[1].delay! / 0.5).toBeGreaterThan(0.55)
    expect(voices.growBack[1].delay! / 0.5).toBeLessThan(0.8)
  })

  it('draws the fluff of a dandelion up the nose before the sneeze blows it bald', () => {
    for (const position of ['goat-boot', 'bride-boot']) {
      const garden = open(position, { vase: [{ ...top(10, 120), at: 0 }] })
      run(garden, 1)
      let inward = 0, bald = false
      handOver(garden, () => {
        const dandelion = garden.inPot[0]
        if (!dandelion) return
        const fluff = garden.bits.filter((bit) => bit.kind === 'fluff')
        if (!dandelion.shownSpent && fluff.length) { inward = Math.max(inward, fluff.filter((bit) => bit.vx > 0).length) }
        bald ||= dandelion.shownSpent
      })
      expect(inward, position).toBe(4)
      expect(bald, position).toBe(true)
    }
  })

  it('springs an eighth piece off the bunch: it goes up before it comes down, and the bunch feels it', () => {
    const garden = open('goat-boot', { vase: Array.from({ length: 7 }, (_, index) => ({ ...top(index, 90), at: index - 3 })) })
    run(garden, 1)
    const mouth = { x: VASE.boot.x, y: VASE.boot.mouthY - 60 }
    garden.press(BED[8].x, SOIL_Y - 100); garden.move(mouth.x, mouth.y); run(garden, 0.3); garden.lift(mouth.x, mouth.y)
    expect(heard(garden, voices.boing)).toBe(true)
    expect(garden.vase.some((piece) => piece.joltT > 0)).toBe(true)
    const sprung = garden.path[0]
    let highest = Infinity
    for (let t = 0; t < 1.5; t += 0.02) { garden.step(0.02); if (sprung.move === 'fall') highest = Math.min(highest, sprung.py) }
    expect(highest).toBeLessThan(mouth.y - 20)
    expect(sprung.py).toBeGreaterThanOrEqual(PATH.top)
  })

  it('lays every ivy piece in a curve, the shortest too', () => {
    for (const up of [fullOf(8) - 23, fullOf(8) - 40, 150, 30]) {
      const garden = open('goat-boot')
      garden.press(BED[8].x, SOIL_Y - up); garden.move(520, 770); garden.lift(520, 770)
      run(garden, 2)
      const ivy = garden.path[0]
      expect(ivy).toMatchObject({ kind: 'ivy', move: null })
      expect(Math.abs(ivy.bend), `cut ${up} up`).toBeCloseTo(0.5, 6)
      expect(ivy.bendAt).toBeCloseTo(ivy.len / 2, 6)
    }
    // And the stalk that a second cut leaves, which has no flower.
    const garden = open('goat-boot', { bed: BED.map((_, index) => (index === 8 ? 60 : fullOf(index))) })
    garden.press(BED[8].x - 26, SOIL_Y - 30); garden.move(BED[8].x + 20, SOIL_Y - 30); garden.lift(520, 770)
    run(garden, 2)
    expect(garden.path[0]).toMatchObject({ kind: 'ivy', head: false })
    expect(Math.abs(garden.path[0].bend)).toBeCloseTo(0.5, 6)
  })

  it('ends with the turn what the turn left on a visitor: the bees in the hat and the loosened bun', () => {
    const keeper = open('beekeeper-boot', { vase: [{ ...top(0, 150), at: -3 }, { ...top(6, 120), at: 3 }] })
    run(keeper, 1)
    let most = 0
    handOver(keeper, () => { most = Math.max(most, keeper.actors.beekeeper.hatBees) })
    expect(most).toBe(2)
    expect(keeper.actors.beekeeper).toMatchObject({ where: 'street', hatBees: 0 })
    const aunt = open('aunt-boot', { vase: [{ ...top(6, 120), at: -3 }, { ...top(10, 120), at: 3 }] })
    run(aunt, 1)
    let loose = false
    handOver(aunt, () => { loose ||= aunt.actors.aunt.loose })
    expect(loose).toBe(true)
    expect(aunt.actors.aunt).toMatchObject({ where: 'street', loose: false })
  })

  it('leaves a thistle in the vase stiff when another piece arrives or is drawn out', () => {
    const garden = open('goat-boot', { vase: [{ ...top(6, 150), at: 0 }, { ...top(2, 150), at: 4 }] })
    run(garden, 1)
    garden.press(BED[10].x, SOIL_Y - 100); garden.move(VASE.boot.x, VASE.boot.mouthY - 60); garden.lift(VASE.boot.x, VASE.boot.mouthY - 60)
    let joltedThistle = false, joltedPoppy = false
    for (let t = 0; t < 1; t += 0.05) { garden.step(0.05); joltedThistle ||= garden.vase[0].joltT > 0; joltedPoppy ||= garden.vase[1].joltT > 0 }
    expect(joltedThistle).toBe(false)
    expect(joltedPoppy).toBe(true)
  })

  it('sniffs once at the reach', () => {
    const garden = open('goat-boot', { vase: [{ ...top(2, 120), at: 0 }] })
    run(garden, 0.5); quiet(garden)
    run(garden, 7)
    expect(garden.shown).toContain('hand-over')
    expect(heard(garden, voices.sniffOnce)).toBe(true)
    expect(voices.sniffOnce).toHaveLength(1)
  })

  it('tips the bride\'s bouquet onto her head as she turns to go, and has the aunt square hers to the edge of her table', () => {
    const bride = open('bride-boot', { vase: [{ ...top(2, 120), at: 0 }, { ...top(8, 120), at: 4 }] })
    run(bride, 1)
    let tipped = 0, crownedAt = 2, upright = false
    handOver(bride, () => {
      const act = bride.actors.bride.act
      if (act?.name !== 'leave') return
      tipped = Math.max(tipped, bride.pot.tilt)
      if (bride.wears('bride')) crownedAt = Math.min(crownedAt, act.u)
      if (act.u > 0.3) upright ||= bride.pot.tilt === 0
    })
    expect(tipped).toBeGreaterThan(1.5)
    expect(crownedAt).toBeGreaterThan(0.05)
    expect(crownedAt).toBeLessThan(0.3)
    expect(upright).toBe(true)

    const aunt = open('aunt-boot', { vase: [{ ...top(2, 120), at: 0 }] })
    run(aunt, 1); quiet(aunt)
    let squared = false
    handOver(aunt, () => { squared ||= aunt.squaring > 0 })
    expect(aunt.streetSeen.some((bouquet) => bouquet.who === 'aunt')).toBe(true)
    expect(squared || aunt.squaring > 0).toBe(true)
    expect(heard(aunt, voices.squareUp)).toBe(true)
    run(aunt, 1)
    expect(aunt.squaring).toBe(0)
  })

  it('opens the cat\'s eye at a snip of the air as at a cut', () => {
    const garden = open('goat-boot')
    run(garden, 2)
    expect(garden.cat.eye).toBe(0)
    expect(garden.targetAt(60, 560).on).toBe('air')
    garden.press(60, 560)
    expect(garden.cat.eye).toBe(0)
    garden.lift(60, 560)
    expect(heard(garden, voices.snick)).toBe(true)
    expect(garden.cat.eye).toBeGreaterThan(0)
  })

  it('has the goat crunch a bouquet of one thistle like a crisp and of one stalk like celery, and keep the piece', () => {
    for (const [piece, crunch] of [[top(6, 120), voices.eaten('thistle', true)], [{ ...top(2, 120), base: 20, len: 100, head: false }, voices.eaten('poppy', false)]] as const) {
      const garden = open('goat-boot', { vase: [{ ...piece, at: 0 }] })
      run(garden, 1); garden.sounds = []
      handOver(garden)
      expect(heard(garden, crunch)).toBe(true)
      expect(garden.street.find((bouquet) => bouquet.who === 'goat')!.pieces).toHaveLength(1)
    }
  })

  it('shows no blades for the whole of a carry and when the piece is let go', () => {
    const seen = (garden: Garden): number => garden.scissors.seen * (garden.hand ? Math.min(1, Math.max(0, garden.scissors.snap * 2.5)) : 1)
    const garden = open('goat-boot', { path: [{ ...top(2, 120), x: 300, y: 770, rot: 1.57 }] })
    run(garden, 1)
    const lying = garden.path[0]
    garden.press(lying.px + 40, lying.py)
    expect(garden.hand).toBe(lying)
    for (let i = 0; i < 20; i++) { garden.move(340 + i * 10, 760 - i * 10); garden.step(0.03); expect(seen(garden)).toBe(0) }
    garden.lift(540, 560)
    expect(seen(garden)).toBe(0)
    for (let i = 0; i < 20; i++) { garden.step(0.03); expect(seen(garden)).toBe(0) }
    // A piece just cut is let go with no blades either, once they have shut on the cut.
    garden.press(BED[4].x, SOIL_Y - 100)
    run(garden, 0.5)
    expect(seen(garden)).toBe(0)
    garden.move(400, 760); garden.lift(400, 760)
    for (let i = 0; i < 10; i++) { expect(seen(garden)).toBe(0); garden.step(0.03) }
    // The next finger on a stem has its blades again.
    garden.press(BED[0].x, SOIL_Y - 100)
    expect(garden.scissors.seen).toBe(1)
  })
})
