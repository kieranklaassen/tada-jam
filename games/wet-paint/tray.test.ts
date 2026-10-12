import { describe, expect, it } from 'vitest'
import { BLUE, ORANGE, RED, VALUES, WATER, YELLOW } from './colours'
import { pack, tally } from './marble'
import { BEAD, BLOOM, BLOW, CELLS, COMB, GRID, MOST_BLOOMS, SOAP, TICK, Tray, stick } from './tray'

const STEP = 1 / 60
const play = (tray: Tray, seconds: number): void => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) tray.step(STEP)
}
const count = (tray: Tray, colour: number): number => tally(tray.cells, VALUES)[colour]

describe('a drop on the water', () => {
  it('is there before any time has played, as a spot under the finger', () => {
    const tray = new Tray()
    tray.drop(100, 70, RED)
    expect(tray.at(100, 70)).toBe(RED)
    const spot = count(tray, RED)
    expect(spot).toBeGreaterThan(20)
    expect(spot).toBeLessThan(Math.PI * BLOOM.radius ** 2 * 0.3)
  })

  it('goes on growing by itself, and is full grown and at rest when its time is up', () => {
    const tray = new Tray()
    tray.drop(100, 70, RED)
    let last = count(tray, RED)
    for (let i = 0; i < 10; i++) {
      play(tray, BLOOM.seconds / 12)
      const now = count(tray, RED)
      expect(now).toBeGreaterThanOrEqual(last)
      if (i < 6) expect(now).toBeGreaterThan(last)
      last = now
    }
    play(tray, BLOOM.seconds)
    expect(tray.moving).toBe(false)
    const full = count(tray, RED)
    expect(full).toBeGreaterThan(Math.PI * BLOOM.radius ** 2 * 0.93)
    expect(full).toBeLessThan(Math.PI * BLOOM.radius ** 2 * 1.07)
    const version = tray.version
    play(tray, 0.5)
    expect(tray.version).toBe(version)
  })

  it('pushes the colour already there aside into a ring and keeps it', () => {
    const tray = new Tray()
    tray.drop(100, 70, RED)
    play(tray, 1)
    const red = count(tray, RED)
    tray.drop(100, 70, YELLOW)
    play(tray, 1)
    expect(tray.at(100, 70)).toBe(YELLOW)
    expect(tray.at(100 + BLOOM.radius + 3, 70)).toBe(RED)
    expect(Math.abs(count(tray, RED) - red)).toBeLessThan(red * 0.1)
  })

  it('lets a run of quick drops all land: the oldest is full grown at once when one too many grow', () => {
    const tray = new Tray()
    for (let i = 0; i <= MOST_BLOOMS; i++) tray.drop(20 + i * 24, 70, i % 2 === 0 ? RED : BLUE)
    expect(count(tray, RED)).toBeGreaterThan(Math.PI * BLOOM.radius ** 2 * 0.9)
    play(tray, 1)
    expect(tray.moving).toBe(false)
    expect(count(tray, RED) + count(tray, BLUE)).toBeGreaterThan((MOST_BLOOMS + 1) * Math.PI * BLOOM.radius ** 2 * 0.85)
  })

  it('at the rim stays on the water', () => {
    const tray = new Tray()
    tray.drop(-5, GRID.h + 9, BLUE)
    play(tray, 1)
    expect(count(tray, BLUE)).toBeGreaterThan(50)
  })
})

describe('a pull through the water', () => {
  it('draws the colour out where the finger goes', () => {
    const tray = new Tray()
    tray.drop(60, 70, RED)
    play(tray, 1)
    expect(tray.at(90, 70)).toBe(WATER)
    tray.strokeStart(60, 70, stick(RED))
    for (let x = 62; x <= 96; x += 2) {
      tray.strokeTo(x, 70)
      tray.step(STEP)
    }
    expect(tray.at(90, 70)).toBe(RED)
  })

  it('coasts on by itself after the finger lets go, and comes to a stop', () => {
    const tray = new Tray()
    tray.drop(60, 70, RED)
    play(tray, 1)
    tray.strokeStart(60, 70, stick(RED))
    for (let x = 62; x <= 96; x += 2) {
      tray.strokeTo(x, 70)
      tray.step(STEP)
    }
    tray.strokeEnd()
    expect(tray.moving).toBe(true)
    const lifted = pack(tray.cells)
    play(tray, 0.3)
    expect(pack(tray.cells)).not.toBe(lifted)
    play(tray, 3)
    expect(tray.moving).toBe(false)
    expect(tray.at(104, 70)).toBe(RED)
  })

  it('stops where it is when the pull is taken away', () => {
    const tray = new Tray()
    tray.drop(60, 70, RED)
    tray.strokeStart(60, 70, stick(RED))
    for (let x = 62; x <= 96; x += 2) {
      tray.strokeTo(x, 70)
      tray.step(STEP)
    }
    tray.strokeEnd(false)
    play(tray, 1)
    const stopped = pack(tray.cells)
    play(tray, 1)
    expect(pack(tray.cells)).toBe(stopped)
  })

  it('brings up beads of the third colour where the dipped colour is pulled through another, a moment later and by itself', () => {
    const tray = new Tray()
    tray.drop(100, 70, YELLOW)
    play(tray, 1)
    tray.strokeStart(70, 70, stick(RED))
    for (let x = 72; x <= 130; x += 2) tray.strokeTo(x, 70)
    tray.strokeEnd(false)
    expect(count(tray, ORANGE)).toBe(0)
    expect(tray.takeEvents()).toEqual([])
    play(tray, BEAD.wait * 0.5)
    expect(count(tray, ORANGE)).toBe(0)
    play(tray, BEAD.wait + BEAD.seconds + 0.1)
    const beads = tray.takeEvents()
    expect(beads.length).toBeGreaterThanOrEqual(2)
    for (const bead of beads) expect(bead).toMatchObject({ kind: 'bead', colour: ORANGE })
    expect(count(tray, ORANGE)).toBeGreaterThan(beads.length * 20)
    expect(tray.moving).toBe(false)
  })

  it('brings up nothing on clear water or in its own colour', () => {
    const tray = new Tray()
    tray.drop(100, 70, RED)
    play(tray, 1)
    tray.strokeStart(70, 70, stick(RED))
    for (let x = 72; x <= 150; x += 2) tray.strokeTo(x, 70)
    tray.strokeEnd(false)
    play(tray, 2)
    expect(tray.takeEvents()).toEqual([])
  })
})

describe('the comb, the straw and the soap', () => {
  const banded = (): Tray => {
    const tray = new Tray()
    tray.drop(80, 60, RED)
    play(tray, 1)
    tray.drop(80, 60, YELLOW)
    play(tray, 1)
    return tray
  }

  it('combs colour out in as many lines as it has teeth, adds none, and brings up no bead in one colour', () => {
    const tray = new Tray()
    tray.drop(80, 70, RED)
    play(tray, 1)
    tray.strokeStart(80, 70, COMB)
    for (let x = 82; x <= 130; x += 2) {
      tray.strokeTo(x, 70)
      tray.step(STEP)
    }
    tray.strokeEnd(false)
    play(tray, 1)
    expect(tray.takeEvents()).toEqual([])
    // Past the bloom's edge, a column crosses one line of red for each tooth.
    let runs = 0
    for (let y = 40; y < 100; y++) if (tray.at(112, y) === RED && tray.at(112, y - 1) !== RED) runs += 1
    expect(runs).toBe(COMB.teeth)
    // It carries no colour of its own: there is red and clear water, and nothing else.
    expect(count(tray, RED) + count(tray, WATER)).toBe(CELLS)
  })

  it('brings up a bead under the comb only where two pot colours meet', () => {
    const tray = banded()
    tray.strokeStart(80, 60, COMB)
    for (let x = 82; x <= 120; x += 2) {
      tray.strokeTo(x, 60)
      tray.step(STEP)
    }
    tray.strokeEnd(false)
    play(tray, 2)
    const beads = tray.takeEvents()
    expect(beads.length).toBeGreaterThan(0)
    for (const bead of beads) expect(bead.colour).toBe(ORANGE)
  })

  it('does nothing to plain water with the comb but pass', () => {
    const tray = new Tray()
    tray.strokeStart(40, 40, COMB)
    for (let x = 42; x <= 120; x += 2) tray.strokeTo(x, 40)
    tray.strokeEnd(false)
    play(tray, 1)
    expect(count(tray, WATER)).toBe(CELLS)
  })

  it('swells the colour under a breath for as long as it is held, to a most, and adds no colour', () => {
    const tray = new Tray()
    tray.drop(100, 70, BLUE)
    play(tray, 1)
    const before = count(tray, BLUE)
    tray.blowStart(100, 70)
    play(tray, 0.2)
    const little = count(tray, BLUE)
    expect(tray.breath).toBeGreaterThan(0)
    play(tray, 2)
    const most = count(tray, BLUE)
    expect(little).toBeGreaterThan(before)
    expect(most).toBeGreaterThan(little)
    expect(tray.breath).toBe(1)
    play(tray, 1)
    expect(count(tray, BLUE)).toBe(most)
    tray.blowEnd()
    play(tray, 0.1)
    expect(tray.moving).toBe(false)
    expect(count(tray, BLUE) + count(tray, WATER)).toBe(CELLS)
  })

  it('plays a puff out to its shortest by itself, and follows a straw that moves', () => {
    const tray = new Tray()
    tray.drop(100, 70, BLUE)
    play(tray, 1)
    tray.blowStart(100, 70)
    tray.step(STEP)
    tray.blowEnd()
    expect(tray.moving).toBe(true)
    play(tray, BLOW.least + 2 * TICK)
    expect(tray.moving).toBe(false)
    const held = new Tray()
    held.blowStart(20, 20)
    play(held, 2)
    expect(held.breath).toBe(1)
    held.blowTo(60, 20)
    expect(held.breath).toBeLessThan(1)
  })

  it('counts a breath in seconds: it deepens for as long whatever the step it is played in', () => {
    const deepens = (dt: number): number => {
      const tray = new Tray()
      tray.blowStart(100, 70)
      let seconds = 0
      for (let guard = 0; tray.breath < 1 && guard < 10000; guard++) {
        tray.step(dt)
        seconds += dt
      }
      return seconds
    }
    expect(deepens(TICK)).toBeCloseTo(BLOW.most, 6)
    expect(deepens(TICK / 2)).toBeCloseTo(BLOW.most, 6)
    expect(deepens(TICK * 3)).toBeCloseTo(BLOW.most, 6)
    // And a puff let go at once lasts its shortest, in seconds.
    for (const dt of [TICK, TICK / 2]) {
      const tray = new Tray()
      tray.blowStart(100, 70)
      tray.step(dt)
      tray.blowEnd()
      let seconds = dt
      for (let guard = 0; tray.moving && guard < 10000; guard++) {
        tray.step(dt)
        seconds += dt
      }
      expect(seconds).toBeGreaterThanOrEqual(BLOW.least - 1e-9)
      expect(seconds).toBeLessThanOrEqual(BLOW.least + 2 * TICK)
    }
  })

  it('opens a clear lens in the colour with the soap, and pushes the colour aside without losing it', () => {
    const tray = new Tray()
    tray.drop(100, 70, RED)
    play(tray, 1)
    const red = count(tray, RED)
    tray.drop(100, 70, WATER, SOAP.radius, SOAP.seconds, SOAP.seed)
    expect(tray.at(100, 70)).toBe(WATER)
    play(tray, 1)
    expect(tray.at(100, 70)).toBe(WATER)
    expect(tray.at(100 + SOAP.radius + 2, 70)).toBe(RED)
    expect(Math.abs(count(tray, RED) - red)).toBeLessThan(red * 0.1)
  })
})

describe('the water at rest', () => {
  const busy = (): Tray => {
    const tray = new Tray()
    tray.drop(100, 70, YELLOW)
    play(tray, 1)
    tray.drop(60, 70, RED)
    tray.strokeStart(60, 70, stick(RED))
    for (let x = 62; x <= 120; x += 2) {
      tray.strokeTo(x, 70)
      tray.step(STEP)
    }
    tray.strokeEnd()
    tray.drop(150, 40, BLUE)
    return tray
  }

  it('is saved as it will lie, with every bloom full grown and every bead out, while the water plays on untouched', () => {
    const tray = busy()
    const showing = pack(tray.cells), saved = tray.rested()
    expect(pack(tray.cells)).toBe(showing)
    expect(saved).toHaveLength(CELLS / 2)
    expect(saved).not.toBe(showing)
    const still = new Tray()
    still.drop(150, 40, BLUE)
    play(still, 1)
    const blue = count(still, BLUE)
    tray.settle()
    expect(tray.moving).toBe(false)
    expect(count(tray, BLUE)).toBeGreaterThan(blue * 0.9)
    expect(count(tray, ORANGE)).toBeGreaterThan(0)
  })

  // The ruling: the saved water is exactly the water as it comes to rest. A save taken at any moment of any
  // motion equals the water played out to rest from that moment, cell for cell.
  const differing = (a: string, b: string): number => {
    let cellsThatDiffer = 0
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) cellsThatDiffer += 1
    return cellsThatDiffer
  }
  const moments: [string, () => Tray][] = [
    ['a bloom still growing', () => {
      const tray = new Tray()
      tray.drop(100, 70, RED)
      play(tray, 0.2)
      return tray
    }],
    ['a pull coasting on, with a bloom that grows while it is pulled', () => {
      const tray = busy()
      play(tray, 0.1)
      return tray
    }],
    ['beads still to come up', () => {
      const tray = new Tray()
      tray.drop(100, 70, YELLOW)
      play(tray, 1)
      tray.drop(70, 70, RED)
      tray.strokeStart(70, 70, stick(RED))
      for (let x = 72; x <= 130; x += 2) tray.strokeTo(x, 70)
      tray.strokeEnd(false)
      play(tray, BEAD.wait * 0.4)
      return tray
    }],
    ['a combing that coasts', () => {
      const tray = new Tray()
      tray.drop(80, 60, RED)
      play(tray, 1)
      tray.drop(86, 66, BLUE)
      play(tray, 0.3)
      tray.strokeStart(70, 62, COMB)
      for (let x = 72; x <= 126; x += 3) {
        tray.strokeTo(x, 62 + (x - 72) * 0.2)
        tray.step(STEP)
      }
      tray.strokeEnd()
      return tray
    }],
    ['a puff playing out', () => {
      const tray = new Tray()
      tray.drop(100, 70, BLUE)
      play(tray, 0.4)
      tray.blowStart(104, 72)
      play(tray, 0.05)
      tray.blowEnd()
      return tray
    }],
    ['a soap lens opening over a run of quick drops', () => {
      const tray = new Tray()
      for (let i = 0; i < 5; i++) {
        tray.drop(40 + i * 22, 60 + (i % 2) * 20, [RED, YELLOW, BLUE][i % 3])
        play(tray, 0.08)
      }
      tray.drop(84, 70, WATER, SOAP.radius, SOAP.seconds, SOAP.seed)
      play(tray, 0.1)
      return tray
    }],
  ]
  for (const [name, make] of moments) {
    it(`saved mid-motion equals the water played out to rest, with zero cells differing: ${name}`, () => {
      const tray = make()
      expect(tray.moving).toBe(true)
      const saved = tray.rested()
      // The water plays on by itself, in the steps a frame gives it.
      for (let guard = 0; tray.moving && guard < 1200; guard++) tray.step(TICK)
      expect(tray.moving).toBe(false)
      expect(differing(saved, pack(tray.cells))).toBe(0)
      // And loaded, it is that water, at rest.
      const loaded = new Tray(new Tray(tray.cells.slice()).cells.slice())
      expect(loaded.moving).toBe(false)
      expect(differing(saved, loaded.rested())).toBe(0)
    })
  }

  it('is saved the same whenever it is asked for between two steps, and asking changes nothing', () => {
    const tray = busy()
    const first = tray.rested(), showing = pack(tray.cells)
    expect(tray.rested()).toBe(first)
    expect(pack(tray.cells)).toBe(showing)
    tray.step(TICK)
    expect(tray.rested()).toBe(first)
  })

  it('opens as it was saved, with nothing moving', () => {
    const tray = busy()
    tray.settle()
    const saved = tray.rested()
    expect(saved).toBe(pack(tray.cells))
    const again = new Tray(tray.cells.slice())
    expect(again.moving).toBe(false)
    expect(again.rested()).toBe(saved)
    play(again, 1)
    expect(again.rested()).toBe(saved)
  })

  it('plays the same from the same touches, whatever the machine', () => {
    expect(busy().rested()).toBe(busy().rested())
  })
})
