import { describe, expect, it } from 'vitest'
import { BROWN, ORANGE, VALUES, WATER } from './colours'
import { IdleLadder } from './guidance'
import { Hands } from './hands'
import { ForgivingTouch } from './input'
import { CAT, HELD, HOLD_PAWS, PEGS, POOL, TOOL, toCells } from './layout'
import { pack, tally, unpack } from './marble'
import { MID, PAPER_MID, SEED, coloured, dip, heard, middle, play, pull, reopened, saved, savedAt, stored, take, tap } from './rehearsal'
import { PLAIN, PRINT_CELLS } from './save'
import { restingShow } from './scenes'
import { STEP, Toy, showingsOver } from './toy'
import { fit } from './stage'
import { BLOOM, CELLS, GRID } from './tray'

const all = (colour: number): string => pack(new Uint8Array(PRINT_CELLS).fill(colour))
const BLANK = PLAIN.slice(0, PRINT_CELLS / 2)

/** Everything of a game that can be seen, heard or touched, as plain data. */
function picture(toy: Toy): unknown {
  return JSON.parse(JSON.stringify({
    save: toy.toSave(),
    time: toy.time,
    water: pack(toy.water),
    moving: toy.moving,
    playing: toy.playing,
    busy: toy.busy,
    show: toy.show,
    placed: toy.placed(),
    tools: (['comb', 'straw', 'soap'] as const).map((tool) => toy.toolPlace(tool)),
    held: toy.held,
    finger: toy.finger,
    inked: toy.inked,
    calm: toy.calm,
    ripples: toy.ripples,
    sticks: toy.stick.map((spring) => [spring.value, spring.speed]),
    slosh: toy.slosh.map((spring) => [spring.value, spring.speed]),
    sway: toy.sway.map((spring) => [spring.value, spring.speed]),
    swing: toy.swing.map((spring) => [spring.value, spring.speed]),
    jolt: [toy.jolt.value, toy.jolt.speed],
    paper: [toy.paper.lift.value, toy.paper.lift.speed, toy.paper.dx, toy.paper.dy],
    cat: toy.cat.pose,
    bird: toy.bird.pose,
  }))
}

/** Every state a put-away can find the game in. Each leaves the game mid-something. */
const STATES: Record<string, () => Toy> = {
  'at rest with colour on the water': () => {
    const toy = new Toy(savedAt('comb'), SEED)
    coloured(toy)
    return toy
  },
  'a finger down on the water, mid-pull': () => {
    const toy = new Toy(savedAt('comb'), SEED)
    coloured(toy)
    pull(toy, MID.x - 200, MID.y - 40, MID.x + 60, MID.y + 20, 14, null)
    return toy
  },
  'the water coasting and a bloom growing': () => {
    const toy = new Toy(savedAt('comb'), SEED)
    coloured(toy)
    pull(toy, MID.x - 200, MID.y - 40, MID.x + 60, MID.y + 20, 8, 'drop')
    tap(toy, MID.x + 200, MID.y + 60)
    play(toy, 0.1)
    return toy
  },
  'a tool in the hand': () => {
    const toy = new Toy(savedAt('soap'), SEED)
    coloured(toy)
    take(toy, 'straw')
    play(toy, 0.3)
    return toy
  },
  'a tool in the hand and at work on the water': () => {
    const toy = new Toy(savedAt('soap'), SEED)
    coloured(toy)
    take(toy, 'comb')
    pull(toy, MID.x - 200, MID.y, MID.x, MID.y + 30, 10, null)
    return toy
  },
  'a breath held on the water': () => {
    const toy = new Toy(savedAt('soap'), SEED)
    coloured(toy)
    take(toy, 'straw')
    toy.press(POOL.x + 330, POOL.y + 300)
    play(toy, 0.3)
    return toy
  },
  'a finger resting on the water, its bloom mid-growth': () => {
    const toy = new Toy(savedAt('comb'), SEED)
    toy.press(MID.x, MID.y)
    play(toy, 3)
    return toy
  },
  'a pull let go, the water mid-coast': () => {
    const toy = new Toy(savedAt('comb'), SEED)
    coloured(toy)
    pull(toy, MID.x - 200, MID.y - 40, MID.x + 60, MID.y + 20, 8, 'drop')
    play(toy, 0.1)
    return toy
  },
  'colour flicked off the paw, all of it still in the air': () => {
    const toy = new Toy(savedAt('comb'), SEED)
    coloured(toy)
    tap(toy, CAT.paws[1].x, CAT.paws[1].y - 12)
    play(toy, 0.1)
    return toy
  },
  'the held print dragged down and sideways, off its place': () => {
    const toy = new Toy(savedAt('comb', { finished: true, prints: [{ cells: all(ORANGE), peg: 0 }, { cells: BLANK, peg: null }] }), SEED)
    pull(toy, middle(HELD).x, middle(HELD).y, middle(HELD).x + 260, middle(HELD).y + 200, 10, null)
    return toy
  },
  'a held print, with colour flicked from a paw that holds it still in the air': () => {
    const toy = new Toy(savedAt('comb', { finished: true, prints: [{ cells: BLANK, peg: null }] }), SEED)
    tap(toy, 1100, 800)
    tap(toy, HOLD_PAWS[1].x, HOLD_PAWS[1].y)
    play(toy, 0.1)
    return toy
  },
  'scene 1 during the cat\'s look at a print it likes, a drip falling': () => {
    const toy = new Toy(savedAt('soap'), SEED)
    tap(toy, 1100, 800)
    toy.tray.cells.fill(ORANGE)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 4.55)
    return toy
  },
  'scene 1 during the cat\'s look at a print it cannot stand, held away by two claws, a drip falling': () => {
    const toy = new Toy(savedAt('soap'), SEED)
    tap(toy, 1100, 800)
    toy.tray.cells.fill(BROWN)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 4.55)
    return toy
  },
  'scene 3 while a print is held': () => {
    const toy = new Toy(savedAt('comb', { prints: [{ cells: BLANK, peg: null }] }), SEED)
    coloured(toy)
    play(toy, showingsOver() + 2)
    return toy
  },
  'a second contact down and working, the first resting on a tool it took up': () => {
    const toy = new Toy(savedAt('soap'), SEED)
    coloured(toy)
    const hands = new Hands(), touch = new ForgivingTouch(), ladder = new IdleLadder(0), by = fit(1180, 820)
    hands.take(hands.down(touch, 1, middle(TOOL.comb), 0, toy), toy, ladder, by, 1180, 0)
    play(toy, 1.2)
    hands.take(hands.down(touch, 2, { x: MID.x + 150, y: MID.y + 90 }, 1200, toy), toy, ladder, by, 1180, 1.2)
    hands.take(touch.move(2, { x: MID.x + 210, y: MID.y + 60 }), toy, ladder, by, 1180, 1.2)
    play(toy, 0.1)
    return toy
  },
  'a held print let go on its way, hanging in its grace': () => {
    const toy = new Toy(savedAt('comb', { finished: true, prints: [{ cells: all(ORANGE), peg: 0 }, { cells: BLANK, peg: null }] }), SEED)
    pull(toy, middle(HELD).x, middle(HELD).y, PEGS[2].x, 90, 10, 'drop')
    play(toy, 0.1)
    return toy
  },
  'a held print let go near the paws, on its way back to them': () => {
    const toy = new Toy(savedAt('comb', { finished: true, prints: [{ cells: all(ORANGE), peg: 0 }, { cells: BLANK, peg: null }] }), SEED)
    pull(toy, middle(HELD).x, middle(HELD).y, middle(HELD).x + 80, middle(HELD).y + 60, 6, 'drop')
    play(toy, 0.4)
    return toy
  },
  'the corner of paper let go on its way, hanging in its grace': () => {
    const toy = new Toy(savedAt('comb'), SEED)
    coloured(toy)
    pull(toy, PAPER_MID.x, PAPER_MID.y, PAPER_MID.x + 50, PAPER_MID.y + 40, 6, 'drop')
    play(toy, 0.1)
    return toy
  },
  'the corner of paper lifted under a finger': () => {
    const toy = new Toy(savedAt('comb'), SEED)
    coloured(toy)
    toy.press(PAPER_MID.x, PAPER_MID.y)
    toy.move(PAPER_MID.x + 40, PAPER_MID.y + 30)
    play(toy, 0.2)
    return toy
  },
  'the held print dragged toward the line': () => {
    const toy = new Toy(savedAt('comb', { finished: true, prints: [{ cells: all(ORANGE), peg: 0 }, { cells: BLANK, peg: null }] }), SEED)
    pull(toy, middle(HELD).x, middle(HELD).y, PEGS[2].x, 90, 10, null)
    return toy
  },
  'a wet paw being shaken, with blooms still in the air': () => {
    const toy = new Toy(savedAt('comb'), SEED)
    tap(toy, CAT.paws[1].x, CAT.paws[1].y)
    play(toy, 0.25)
    return toy
  },
  'the cat combed, with a bubble on its nose': () => {
    const toy = new Toy(savedAt('soap'), SEED)
    take(toy, 'comb')
    pull(toy, CAT.head.x - 60, CAT.head.y - 20, CAT.head.x + 60, CAT.head.y - 20, 12, 'drop')
    take(toy, 'soap')
    tap(toy, CAT.head.x, CAT.head.y)
    play(toy, 0.4)
    return toy
  },
  'scene 1 under way, the sheet on the water': () => {
    const toy = new Toy(savedAt('soap'), SEED)
    coloured(toy)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 1.8)
    return toy
  },
  'scene 1 under way with the oldest print leaving and an earlier one flying to its peg': () => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(1), peg: 2 }, { cells: all(2), peg: 0 }, { cells: all(3), peg: 3 }, { cells: all(BROWN), peg: null }] }), SEED)
    coloured(toy)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 0.3)
    return toy
  },
  'scene 2 under way, the new tool on its way': () => {
    const toy = new Toy(savedAt('finger'), SEED)
    coloured(toy)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 8)
    return toy
  },
  'scene 2 not yet started, the print\'s scene still playing': () => {
    const toy = new Toy(savedAt('finger'), SEED)
    coloured(toy)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 4.5)
    return toy
  },
  'scene 3 under way, the paw over the water': () => {
    const toy = new Toy(savedAt('comb'), SEED)
    coloured(toy)
    play(toy, showingsOver() + 2)
    return toy
  },
  'scene 4 under way, the print swinging on its peg': () => {
    const toy = new Toy(savedAt('comb', { finished: true, prints: [{ cells: all(ORANGE), peg: null }] }), SEED)
    tap(toy, 1100, 800)
    tap(toy, middle(HELD).x, middle(HELD).y)
    play(toy, 0.8)
    return toy
  },
  'the ending: prints hung, plain water, the cat watching': () => {
    const toy = new Toy(savedAt('straw', { finished: true, prints: [{ cells: all(ORANGE), peg: 1 }, { cells: BLANK, peg: 0 }] }), SEED)
    play(toy, 4)
    return toy
  },
  'the ending, with the newest print still in the cat\'s paws': () => {
    const toy = new Toy(savedAt('finger'), SEED)
    coloured(toy)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    play(toy, 14)
    return toy
  },
  'a first showing owed: tools on the table that have not been shown': () => {
    const toy = new Toy(saved({ position: 'soap' }), SEED)
    tap(toy, 1100, 800)
    play(toy, 1)
    return toy
  },
  'a first showing under way': () => {
    const toy = new Toy(saved({ position: 'soap' }), SEED)
    take(toy, 'straw')
    play(toy, 1)
    return toy
  },
  'a first visit, untouched': () => new Toy(saved({ position: 'comb' }), SEED),
}

describe('found as left', () => {
  for (const [name, make] of Object.entries(STATES)) {
    it(`parked equals loaded: ${name}`, () => {
      const parked = make()
      // What a load at this instant would find.
      const loaded = reopened(parked)
      parked.putAway()
      expect(picture(parked)).toEqual(picture(loaded))
      // And they stay the same game: the same touches and the same seconds give the same sights and sounds.
      const both = [parked, loaded].map((toy) => {
        toy.takeSounds()
        toy.takeChanged()
        const notes: unknown[] = []
        play(toy, 3, () => notes.push(...heard(toy)))
        tap(toy, MID.x, MID.y)
        notes.push(...heard(toy))
        play(toy, 2, () => notes.push(...heard(toy)))
        return { picture: picture(toy), notes: JSON.stringify(notes) }
      })
      expect(both[0].picture).toEqual(both[1].picture)
      expect(both[0].notes).toBe(both[1].notes)
    })

    it(`put away, nothing is left pending and nothing sounds: ${name}`, () => {
      const toy = make()
      const before = stored(toy)
      toy.putAway()
      // All sound is cut, and what the visit queued is thrown away.
      const sounds = toy.takeSounds()
      expect(sounds).toEqual({ plain: [], scene: [], hush: true })
      expect(toy.finger).toBeNull()
      expect(toy.playing).toBe(false)
      expect(toy.moving).toBe(false)
      expect(toy.show).toEqual(restingShow())
      expect(toy.ripples).toEqual([])
      expect(toy.cat.pose.tint).toBe(WATER)
      // Putting away loses nothing: the save is what it would have been.
      expect(stored(toy)).toEqual(before)
      // Nothing starts by itself afterwards, and nothing is heard, for as long as the showings last.
      const after = stored(toy)
      let noise = 0, scenes = 0, changed = 0
      play(toy, 30, () => {
        const later = toy.takeSounds()
        noise += later.plain.length + later.scene.length
        if (toy.playing) scenes += 1
        changed = Math.max(changed, toy.takeChanged())
      })
      expect(noise).toBe(0)
      expect(scenes).toBe(0)
      expect(changed).toBe(0)
      expect(stored(toy)).toEqual(after)
      // A late lift from the touch that was taken away does nothing.
      toy.release('drop')
      toy.release('tap')
      expect(stored(toy)).toEqual(after)
    })
  }

  // What is found, for the four states in which something was on its way.
  const inkedCells = (text: string): number => CELLS - tally(unpack(text, CELLS)!, VALUES)[WATER]

  it('finds a resting finger\'s bloom as large as it had grown, and it grows no more', () => {
    const toy = STATES['a finger resting on the water, its bloom mid-growth']()
    const seen = CELLS - tally(toy.water, VALUES)[WATER], oneDrop = Math.PI * BLOOM.radius * BLOOM.radius
    // Mid-growth: larger than one drop makes it, and not yet as large as it gets.
    expect(seen).toBeGreaterThan(oneDrop * 1.3)
    const found = reopened(toy)
    expect(CELLS - tally(found.water, VALUES)[WATER]).toBe(seen)
    expect(pack(found.water)).toBe(pack(toy.water))
    play(found, 6)
    expect(CELLS - tally(found.water, VALUES)[WATER]).toBe(seen)
    // Had the finger stayed, it would have grown on.
    play(toy, 3)
    expect(CELLS - tally(toy.water, VALUES)[WATER]).toBeGreaterThan(seen * 1.2)
  })

  it('finds the water of a pull that was coasting where the coasting would have left it, at rest', () => {
    const toy = STATES['a pull let go, the water mid-coast'](), twin = STATES['a pull let go, the water mid-coast']()
    const atPutAway = pack(toy.water)
    expect(toy.moving).toBe(true)
    const found = reopened(toy)
    // Not the water as it was in that instant, but as it comes to rest by itself.
    play(twin, 6)
    expect(twin.moving).toBe(false)
    expect(pack(found.water)).toBe(pack(twin.water))
    expect(pack(found.water)).not.toBe(atPutAway)
    expect(found.moving).toBe(false)
  })

  it('finds colour that was in the air on the water, where it would have landed, with nothing heard', () => {
    const toy = STATES['colour flicked off the paw, all of it still in the air'](), twin = STATES['colour flicked off the paw, all of it still in the air']()
    const before = inkedCells(pack(toy.water))
    const found = reopened(toy)
    play(twin, 3)
    expect(pack(found.water)).toBe(pack(twin.water))
    expect(inkedCells(pack(found.water))).toBeGreaterThan(before + 60)
    let noise = 0
    play(found, 3, () => { noise += heard(found).length })
    expect(noise).toBe(0)
  })

  it('finds a print that was being dragged back in the cat\'s paws, not hung and not lost', () => {
    const toy = STATES['the held print dragged down and sideways, off its place']()
    expect(toy.placed()[1].y).toBeGreaterThan(HELD.y + 100)
    const found = reopened(toy)
    expect(found.prints).toHaveLength(2)
    expect(found.prints[1].peg).toBeNull()
    expect(found.placed()[1]).toMatchObject({ x: HELD.x, y: HELD.y, pegged: false })
    expect(found.playing).toBe(false)
  })

  it('finds a print or a corner of paper that was let go and hanging in its grace where it came from: the lift was no drop', () => {
    const print = STATES['a held print let go on its way, hanging in its grace']()
    const found = reopened(print)
    expect(found.prints[1].peg).toBeNull()
    expect(found.placed()[1]).toMatchObject({ x: HELD.x, y: HELD.y })
    play(found, 2)
    expect(found.prints[1].peg).toBeNull()
    // Left alone it would have been hung.
    play(print, 1)
    expect(print.prints[1].peg).not.toBeNull()
    const paper = STATES['the corner of paper let go on its way, hanging in its grace']()
    const kept = reopened(paper)
    play(kept, 2)
    expect(kept.prints).toHaveLength(0)
    expect(kept.inked).toBe(true)
  })

  it('finds the paws already on a held print, and colour a holding paw flicked on the water clear of the print', () => {
    const toy = STATES['a held print, with colour flicked from a paw that holds it still in the air']()
    const found = reopened(toy)
    expect(found.cat.pose).toMatchObject({ pawLX: HOLD_PAWS[0].x, pawLY: HOLD_PAWS[0].y, pawRX: HOLD_PAWS[1].x, pawRY: HOLD_PAWS[1].y })
    expect(found.held).toBe(0)
    // The tap started nothing while the game was open. A load reads water with colour on it as a cycle begun
    // (save.ts), and nothing on screen depends on which.
    expect(toy.finished).toBe(true)
    expect(found.finished).toBe(false)
    expect(found.inked).toBe(true)
    // Nothing of it lies under the print.
    const cells = unpack(pack(found.water), CELLS)!
    for (let x = HELD.x; x < HELD.x + HELD.w; x += 4) for (let y = POOL.y; y < HELD.y + HELD.h; y += 4) {
      const cell = toCells(x, y)
      expect(cells[Math.floor(cell.y) * GRID.w + Math.floor(cell.x)]).toBe(WATER)
    }
  })

  it('is the same game whether it was parked or loaded when the seed is drawn afresh, as the Mount draws it', () => {
    for (const name of ['scene 3 while a print is held', 'a second contact down and working, the first resting on a tool it took up']) {
      const parked = STATES[name](), loaded = reopened(parked, 99)
      parked.putAway(99)
      expect(picture(parked), name).toEqual(picture(loaded))
    }
    // The contact that rested on the tool took up no tool for good.
    expect(STATES['a second contact down and working, the first resting on a tool it took up']().tool).toBe('finger')
  })

  it('opens with nothing easing in, nothing sounding and no timer already full', () => {
    const made = new Toy(savedAt('soap', { pot: 2, prints: [{ cells: all(ORANGE), peg: 3 }, { cells: BLANK, peg: null }] }), SEED)
    coloured(made)
    dip(made, 1)
    const toy = reopened(made)
    // As it was left, in the first frame: the dipped stick already stands, the prints hang still.
    expect(toy.stick.map((spring) => spring.value)).toEqual([0, 1, 0])
    for (const spring of [...toy.slosh, ...toy.swing, toy.jolt, toy.paper.lift]) expect(spring.value).toBe(0)
    expect(toy.ripples).toEqual([])
    expect(toy.takeChanged()).toBe(0)
    expect(toy.takeSounds()).toEqual({ plain: [], scene: [], hush: false })
    // The cat's own dab needs the whole stillness again: no timer is carried over or starts full.
    let scenes = 0, noise = 0
    play(toy, showingsOver() - 1, () => {
      if (toy.playing) scenes += 1
      noise += heard(toy).length
    })
    expect(scenes).toBe(0)
    expect(noise).toBe(0)
    play(toy, 2)
    expect(toy.playing).toBe(true)
    // Before the child's first touch of a visit nothing is heard at all, not even this.
    play(toy, 5, () => { noise += heard(toy).length })
    expect(noise).toBe(0)
    expect(toy.takeChanged()).toBe(0)
  })
})

describe('a touch that is taken away', () => {
  const cancelled = (make: () => Toy, down: (toy: Toy) => void): { before: unknown; after: unknown; toy: Toy } => {
    const toy = make()
    const before = stored(toy)
    down(toy)
    toy.release('cancel')
    play(toy, 8)
    return { before, after: stored(toy), toy }
  }
  const inked = (): Toy => {
    const toy = new Toy(savedAt('soap', { prints: [{ cells: all(ORANGE), peg: 0 }, { cells: BLANK, peg: null }] }), SEED)
    coloured(toy)
    return toy
  }

  it('never takes a print: a press on the corner of paper, or a drag of it, that is cancelled', () => {
    for (const down of [(toy: Toy) => toy.press(PAPER_MID.x, PAPER_MID.y), (toy: Toy) => pull(toy, PAPER_MID.x, PAPER_MID.y, PAPER_MID.x + 60, PAPER_MID.y + 60, 8, null)]) {
      const { before, after, toy } = cancelled(inked, down)
      expect(after).toEqual(before)
      expect(toy.playing).toBe(false)
      expect(toy.paper.dx + toy.paper.dy).toBe(0)
    }
  })

  it('never hangs the held print: a press on it, or a drag of it all the way to the line, that is cancelled', () => {
    for (const down of [(toy: Toy) => toy.press(middle(HELD).x, middle(HELD).y), (toy: Toy) => pull(toy, middle(HELD).x, middle(HELD).y, PEGS[2].x, 60, 10, null)]) {
      const { before, after, toy } = cancelled(inked, down)
      expect(after).toEqual(before)
      expect(toy.prints[1].peg).toBeNull()
      expect(toy.placed()[1]).toMatchObject({ x: HELD.x, y: HELD.y })
    }
  })

  it('throws no water on after a pull: what was moved stays moved, and the water stops where it is', () => {
    const toy = inked()
    pull(toy, MID.x - 200, MID.y - 40, MID.x + 60, MID.y + 20, 8, null)
    toy.release('cancel')
    // Only what was already on its way plays out: the bloom of the drop, and beads. There is no coasting.
    play(toy, 1.5)
    const stopped = pack(toy.tray.cells)
    const coasting = inked()
    pull(coasting, MID.x - 200, MID.y - 40, MID.x + 60, MID.y + 20, 8, 'drop')
    play(coasting, 1.5)
    expect(pack(coasting.tray.cells)).not.toBe(stopped)
    play(toy, 2)
    expect(pack(toy.tray.cells)).toBe(stopped)
  })

  it('leaves no flag behind: after any touch ends, however it ends, the next seconds do nothing by themselves', () => {
    const downs: [string, (toy: Toy) => void][] = [
      ['the paper', (toy) => toy.press(PAPER_MID.x, PAPER_MID.y)],
      ['the held print', (toy) => toy.press(middle(HELD).x, middle(HELD).y)],
      ['the cat with the straw', (toy) => {
        take(toy, 'straw')
        toy.press(CAT.head.x, CAT.head.y - 20)
      }],
      ['the water with the straw', (toy) => {
        take(toy, 'straw')
        toy.press(MID.x, MID.y)
      }],
    ]
    for (const [name, down] of downs) for (const lift of ['cancel', 'tap', 'drop'] as const) {
      const toy = inked()
      down(toy)
      play(toy, 0.2)
      toy.release(lift)
      play(toy, 12)
      expect(toy.finger, name).toBeNull()
      expect(toy.playing, name).toBe(false)
      expect(toy.moving, name).toBe(false)
      expect(toy.cat.pose.wind, name).toBeLessThan(0.05)
      const settled = stored(toy)
      toy.takeChanged()
      let changed = 0
      play(toy, 5, () => { changed = Math.max(changed, toy.takeChanged()) })
      expect(changed, name).toBe(0)
      expect(stored(toy), name).toEqual(settled)
    }
  })

  it('is not a clock: the game plays no time but the seconds it is stepped, in whole steps', () => {
    const toy = new Toy(saved(), 1)
    toy.press(MID.x, MID.y)
    toy.move(MID.x + 30, MID.y)
    toy.release('drop')
    expect(toy.time).toBe(0)
    toy.step(STEP * 0.5)
    expect(toy.time).toBe(0)
    toy.step(STEP * 0.5)
    expect(toy.time).toBeCloseTo(STEP, 9)
    toy.step(0.1)
    expect(toy.time).toBeCloseTo(STEP * 7, 9)
    expect(toy.tray.time).toBeCloseTo(toy.time, 9)
  })
})
