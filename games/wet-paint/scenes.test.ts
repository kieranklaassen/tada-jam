import { describe, expect, it } from 'vitest'
import { BROWN, ORANGE, WATER } from './colours'
import { CAT, HELD, PEGS, POOL, TOOL, hungRect } from './layout'
import { pack } from './marble'
import { MID, PAPER_MID, SEED, coloured, dip, heard, middle, play, pull, reopened, saved, savedAt, stored, take, tap } from './rehearsal'
import { PLAIN, PRINT_CELLS } from './save'
import { sceneLength } from './scene'
import { dabBeats, hungBeats, printBeats, restingShow, toolBeats, type Stagehand } from './scenes'
import { STEP, Toy, showingsOver } from './toy'

const BLANK = PLAIN.slice(0, PRINT_CELLS / 2)
/** A print that is all of one colour. */
const all = (colour: number): string => pack(new Uint8Array(PRINT_CELLS).fill(colour))
const noHand: Stagehand = { show: restingShow(), say: () => {}, ripple: () => {}, hop: () => {}, shake: () => {}, swing: () => {} }

/** Each scene, started by the touch that causes it, on a game made ready for it. */
const SCENES: Record<string, { ready: () => Toy; cause: (toy: Toy) => void; seconds: number }> = {
  'the print': {
    ready: () => {
      const toy = new Toy(savedAt('soap'), SEED)
      coloured(toy)
      return toy
    },
    cause: (toy) => tap(toy, PAPER_MID.x, PAPER_MID.y),
    seconds: 6,
  },
  'the print, and a new tool after it': {
    ready: () => {
      const toy = new Toy(savedAt('finger'), SEED)
      coloured(toy)
      return toy
    },
    cause: (toy) => tap(toy, PAPER_MID.x, PAPER_MID.y),
    seconds: 11,
  },
  'a showing that was owed': {
    ready: () => new Toy(saved({ position: 'comb' }), SEED),
    cause: (toy) => take(toy, 'comb'),
    seconds: 3.5,
  },
  'the print is hung': {
    ready: () => new Toy(savedAt('comb', { finished: true, prints: [{ cells: all(ORANGE), peg: 0 }, { cells: all(BROWN), peg: null }] }), SEED),
    cause: (toy) => tap(toy, middle(HELD).x, middle(HELD).y),
    seconds: 5,
  },
}

describe('the four scenes', () => {
  it('last as long as the sheet says: 6, 5, 4 and 5 seconds', () => {
    expect(sceneLength(printBeats(noHand, 'plain', -1))).toBeCloseTo(6, 6)
    expect(sceneLength(toolBeats(noHand, 'comb', false))).toBeCloseTo(5, 6)
    expect(sceneLength(dabBeats(noHand, 'plain', { x: 400, y: 400 }, { x: 420, y: 330 }))).toBeCloseTo(4, 6)
    expect(sceneLength(hungBeats(noHand, 'plain', 0, 1, HELD))).toBeCloseTo(5, 6)
    for (const [name, scene] of Object.entries(SCENES)) {
      const toy = scene.ready()
      scene.cause(toy)
      expect(toy.playing, name).toBe(true)
      play(toy, scene.seconds - 0.2)
      expect(toy.playing, name).toBe(true)
      play(toy, 0.4)
      expect(toy.playing, name).toBe(false)
    }
  })

  for (const [name, scene] of Object.entries(SCENES)) {
    it(`saves its outcome when it starts, at once, and changes nothing after: ${name}`, () => {
      const toy = scene.ready()
      toy.takeChanged()
      scene.cause(toy)
      // Saved at once, in the touch that started it.
      expect(toy.takeChanged()).toBe(2)
      const atStart = stored(toy), began = toy.time
      const later: number[] = []
      play(toy, scene.seconds + 1, () => {
        if (toy.takeChanged() > 0) later.push(toy.time - began)
      })
      if (name !== 'the print, and a new tool after it') {
        expect(later).toEqual([])
        expect(stored(toy)).toEqual(atStart)
        return
      }
      // Two scenes on one touch: the second saves its own outcome, the tool as shown, in the frame it starts.
      expect(later).toHaveLength(1)
      expect(later[0]).toBeGreaterThan(5.9)
      expect(later[0]).toBeLessThan(6.1)
      expect(atStart.shown).toEqual([])
      expect(stored(toy)).toEqual({ ...atStart, shown: ['comb'] })
    })

    it(`is ended at once by any touch, and is silent from that frame: ${name}`, () => {
      for (const cut of [0.05, 0.9, 2.6, scene.seconds - 0.3]) {
        const toy = scene.ready()
        scene.cause(toy)
        const atStart = stored(toy)
        play(toy, cut)
        heard(toy)
        // A touch on the bare table: it ends the scene and is then an ordinary touch.
        toy.press(1100, 800)
        const sounds = toy.takeSounds()
        expect(sounds.hush).toBe(true)
        expect(sounds.scene).toEqual([])
        expect(sounds.plain.length).toBeGreaterThan(0)
        expect(toy.playing).toBe(false)
        expect(toy.show).toEqual(restingShow())
        toy.release('tap')
        // Nothing of the scene is heard afterwards, and nothing of it is still on its way.
        let after = 0
        play(toy, scene.seconds + 2, () => {
          const later = toy.takeSounds()
          after += later.scene.length
        })
        expect(after).toBe(0)
        expect(toy.show).toEqual(restingShow())
        // Its outcome is all there: what was saved when it started (and, for the tool's scene, when that started).
        expect({ ...stored(toy), shown: [] }).toEqual({ ...atStart, shown: [] })
      }
    })

    it(`is never replayed on load, whenever the game was closed: ${name}`, () => {
      for (const cut of [0, 0.5, 3, scene.seconds + 1]) {
        const toy = scene.ready()
        scene.cause(toy)
        play(toy, cut)
        const again = reopened(toy)
        expect(again.playing).toBe(false)
        expect(again.show).toEqual(restingShow())
        let sounds = 0
        play(again, 12, () => {
          sounds += heard(again).length
          expect(again.playing).toBe(false)
        })
        expect(sounds).toBe(0)
        expect(stored(again)).toEqual(stored(toy))
      }
    })
  }

  it('leaves each scene ended by a touch where the sheet says: the print in the paws, the tool on the cloth, the print on its peg', () => {
    const print = SCENES['the print, and a new tool after it'].ready()
    tap(print, PAPER_MID.x, PAPER_MID.y)
    play(print, 0.4)
    print.press(1100, 800)
    expect(print.held).toBe(0)
    expect(print.placed()).toHaveLength(1)
    expect(print.placed()[0]).toMatchObject({ ...HELD, pegged: false })
    expect(print.toolPlace('comb')).toMatchObject({ ...middle(TOOL.comb), lifted: false })
    expect(print.tray.cells.every((value) => value === WATER)).toBe(true)
    const hung = SCENES['the print is hung'].ready()
    tap(hung, middle(HELD).x, middle(HELD).y)
    play(hung, 0.1)
    hung.press(1100, 800)
    expect(hung.placed()[1]).toMatchObject({ ...hungRect(1), pegged: true })
  })

  it('shows the cat\'s look at a print as its tastes say, and nothing else: orange to its cheek, brown at arm\'s length', () => {
    const look = (cells: string): { cheek: number; away: number; sounds: string } => {
      const toy = new Toy(savedAt('soap'), SEED)
      // The water is all of one colour: the print will be too.
      toy.tray = new (toy.tray.constructor as new (cells: Uint8Array) => typeof toy.tray)(new Uint8Array(POOL.w * 0 + 208 * 144).fill(cells === 'orange' ? ORANGE : cells === 'brown' ? BROWN : 1))
      tap(toy, 1100, 800)
      tap(toy, PAPER_MID.x, PAPER_MID.y)
      let cheek = 0, away = 0
      const notes: unknown[] = []
      play(toy, 6.2, () => {
        cheek = Math.max(cheek, toy.show.cheek)
        away = Math.max(away, toy.show.away)
        notes.push(...toy.takeSounds().scene)
      })
      return { cheek, away, sounds: JSON.stringify(notes) }
    }
    const fond = look('orange'), sour = look('brown'), plain = look('red')
    expect(fond.cheek).toBeGreaterThan(0.9)
    expect(fond.away).toBe(0)
    expect(sour.away).toBeGreaterThan(0.9)
    expect(sour.cheek).toBe(0)
    expect(plain.cheek + plain.away).toBe(0)
    expect(new Set([fond.sounds, sour.sounds, plain.sounds]).size).toBe(3)
  })
})

describe('the cat dips a paw', () => {
  const still = (): Toy => {
    const toy = new Toy(savedAt('comb'), SEED)
    coloured(toy)
    return toy
  }

  it('happens once the child has been still through the ghost hand\'s showings, with colour on the water, and once in one stillness', () => {
    const toy = still()
    play(toy, showingsOver() - 1)
    expect(toy.playing).toBe(false)
    play(toy, 1.5)
    expect(toy.playing).toBe(true)
    // It is the cat's own act: the child is not busy, so the idle ladder is not taken back by it.
    expect(toy.busy).toBe(false)
    play(toy, 5)
    expect(toy.playing).toBe(false)
    let again = false
    play(toy, showingsOver() * 2, () => { again = again || toy.playing })
    expect(again).toBe(false)
    // After the next touch and the next stillness, it may happen again.
    tap(toy, 1100, 800)
    play(toy, showingsOver() + 1)
    expect(toy.playing).toBe(true)
  })

  it('never happens over plain water, and not while a finger is down', () => {
    const plain = new Toy(savedAt('comb'), SEED)
    tap(plain, 1100, 800)
    let played = false
    play(plain, showingsOver() + 20, () => { played = played || plain.playing })
    expect(played).toBe(false)
    const holding = still()
    holding.press(CAT.head.x, CAT.head.y - 40)
    play(holding, showingsOver() + 20, () => { played = played || holding.playing })
    expect(played).toBe(false)
  })

  it('carries no colour, changes nothing the child made and saves nothing', () => {
    const toy = still()
    const before = stored(toy), water = pack(toy.tray.cells)
    play(toy, showingsOver() + 0.5)
    expect(toy.playing).toBe(true)
    let changed = 0, rings = 0
    const notes: unknown[] = []
    play(toy, 5, () => {
      changed = Math.max(changed, toy.takeChanged())
      rings = Math.max(rings, toy.ripples.filter((ripple) => ripple.kind === 'ring').length)
      notes.push(...heard(toy))
    })
    expect(toy.playing).toBe(false)
    expect(changed).toBe(0)
    expect(rings).toBe(1)
    expect(notes.length).toBeGreaterThan(0)
    expect(pack(toy.tray.cells)).toBe(water)
    expect(stored(toy)).toEqual(before)
    expect(toy.cat.pose.tint).toBe(WATER)
  })

  it('is ended at once by a touch, with the water as the child left it, and is silent from that frame', () => {
    const toy = still()
    const water = pack(toy.tray.cells)
    play(toy, showingsOver() + 1.8)
    expect(toy.playing).toBe(true)
    heard(toy)
    toy.press(1100, 800)
    const sounds = toy.takeSounds()
    expect(sounds.hush).toBe(true)
    expect(sounds.scene).toEqual([])
    expect(toy.playing).toBe(false)
    toy.release('tap')
    let after = 0
    play(toy, 6, () => { after += toy.takeSounds().scene.length })
    expect(after).toBe(0)
    expect(pack(toy.tray.cells)).toBe(water)
  })
})

describe('a tool whose showing is owed', () => {
  it('is shown at the child\'s first touch of that tool, once, on a first visit by age and after a put-away cut the showing off', () => {
    const first = new Toy(saved({ position: 'straw' }), SEED)
    expect(first.shown).toEqual([])
    expect(first.playing).toBe(false)
    play(first, 3)
    expect(first.playing).toBe(false)
    take(first, 'straw')
    expect(first.playing).toBe(true)
    expect(first.shown).toEqual(['straw'])
    expect(first.tool).toBe('straw')
    play(first, 4)
    expect(first.playing).toBe(false)
    dip(first, 0)
    take(first, 'straw')
    expect(first.playing).toBe(false)
    take(first, 'comb')
    expect(first.playing).toBe(true)
    expect(first.shown).toEqual(['straw', 'comb'])
  })

  it('stays owed when the print\'s scene is ended or put away before the tool\'s own scene starts, and is not owed once that has started', () => {
    const during = (seconds: number): Toy => {
      const toy = new Toy(savedAt('finger'), SEED)
      coloured(toy)
      tap(toy, PAPER_MID.x, PAPER_MID.y)
      play(toy, seconds)
      return toy
    }
    // Closed while the print's scene plays: the place moved with the print, the tool lies on the table, nothing
    // plays on load, and the showing starts at the first touch of the tool.
    const early = reopened(during(3))
    expect(early.position).toBe('comb')
    expect(early.shown).toEqual([])
    expect(early.playing).toBe(false)
    expect(early.toolPlace('comb')).toMatchObject({ ...middle(TOOL.comb), lifted: false })
    play(early, 8)
    expect(early.playing).toBe(false)
    take(early, 'comb')
    expect(early.playing).toBe(true)
    expect(early.shown).toEqual(['comb'])
    // Ended by a touch while the print's scene plays: the same.
    const touched = during(3)
    tap(touched, 1100, 800)
    expect(touched.shown).toEqual([])
    expect(touched.toolPlace('comb')).toMatchObject({ ...middle(TOOL.comb), lifted: false })
    take(touched, 'comb')
    expect(touched.playing).toBe(true)
    // Closed once the tool's scene has started: it is not owed and never plays again.
    const late = reopened(during(6.5))
    expect(late.shown).toEqual(['comb'])
    take(late, 'comb')
    expect(late.playing).toBe(false)
  })
})

describe('sight and sound in step', () => {
  it('sounds every landing in the frame it lands: the sheet on the water, each drip, the print on its peg, the tool on the cloth', () => {
    const toy = new Toy(savedAt('finger', { prints: [{ cells: BLANK, peg: null }] }), SEED)
    coloured(toy)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    heard(toy)
    const log: { at: number; notes: number; sheet: string; drips: number; fly: boolean; tool: boolean; hop: number }[] = []
    play(toy, 11.5, () => {
      log.push({ at: toy.time, notes: toy.takeSounds().scene.length, sheet: toy.show.sheet.phase, drips: toy.show.drips.length, fly: toy.show.fly !== null, tool: toy.show.tool !== null, hop: toy.cat.pose.hop })
    })
    const frames = (when: (now: (typeof log)[number], before: (typeof log)[number]) => boolean): number[] => log.map((now, i) => (i > 0 && when(now, log[i - 1]) ? i : -1)).filter((i) => i >= 0)
    // The sheet lies flat on the water: the frame its floating down ends.
    const flat = frames((now, before) => before.sheet === 'down' && now.sheet === 'soak')
    expect(flat).toHaveLength(1)
    expect(log[flat[0]].notes).toBeGreaterThan(0)
    // It is peeled up: the frame the peel starts.
    const peel = frames((now, before) => before.sheet === 'soak' && now.sheet === 'peel')
    expect(log[peel[0]].notes).toBeGreaterThan(0)
    // Each drip is heard in the frame it lands, which is the frame it is gone from the air.
    const landed = frames((now, before) => now.drips < before.drips)
    expect(landed).toHaveLength(2)
    for (const frame of landed) expect(log[frame].notes).toBeGreaterThan(0)
    // The earlier print reaches its peg: the frame it stops flying.
    const pegged = frames((now, before) => before.fly && !now.fly)
    expect(pegged).toHaveLength(1)
    expect(log[pegged[0]].notes).toBeGreaterThan(0)
    // The cat lands from its hop within two frames of the thump.
    const down = frames((now, before) => before.hop > 0 && now.hop === 0)[0]
    expect(log.slice(down - 2, down + 3).some((frame) => frame.notes > 0)).toBe(true)
    // The new tool comes to rest on the cloth: the frame it stops moving.
    const laid = frames((now, before) => before.tool && !now.tool)
    expect(laid).toHaveLength(1)
    expect(log[laid[0]].notes).toBeGreaterThan(0)
    // And no frame sounds that shows nothing new: every scene sound falls on a frame of the list above or on a
    // look, a slide or a purr that begins in it.
    expect(log.filter((frame) => frame.notes > 0).length).toBeLessThan(24)
  })

  it('sounds each flicked bloom and each bead in the frame it comes onto the water', () => {
    const toy = new Toy(savedAt('finger'), SEED)
    tap(toy, CAT.paws[0].x, CAT.paws[0].y)
    heard(toy)
    let flicks = 0
    play(toy, 1.5, () => {
      const version = toy.tray.version, notes = heard(toy)
      const landed = toy.ripples.filter((ripple) => ripple.born === toy.time && ripple.size === 0.3).length
      if (landed > 0) {
        flicks += landed
        expect(notes.length).toBeGreaterThan(0)
        expect(version).toBeGreaterThan(0)
      }
    })
    expect(flicks).toBe(3)
    const beads = new Toy(savedAt('finger'), SEED)
    dip(beads, 1)
    tap(beads, MID.x, MID.y)
    play(beads, 1)
    dip(beads, 0)
    pull(beads, MID.x - 120, MID.y, MID.x + 100, MID.y, 12, 'cancel')
    heard(beads)
    let came = 0
    play(beads, 1.5, () => {
      const notes = heard(beads), up = beads.ripples.filter((ripple) => ripple.born === beads.time && ripple.size === 0.4).length
      came += up
      if (up > 0) expect(notes.length).toBeGreaterThanOrEqual(up)
      else expect(notes).toEqual([])
    })
    expect(came).toBeGreaterThan(0)
  })

  it('hangs a print on its peg with a sound in the frame it gets there', () => {
    const toy = new Toy(savedAt('comb', { finished: true, prints: [{ cells: BLANK, peg: null }] }), SEED)
    tap(toy, 1100, 800)
    heard(toy)
    tap(toy, middle(HELD).x, middle(HELD).y)
    heard(toy)
    let flying = true, at = -1, sounded = -1
    play(toy, 1, () => {
      const notes = toy.takeSounds().scene.length
      if (flying && toy.show.fly === null) {
        flying = false
        at = toy.time
      }
      if (notes > 0 && sounded < 0) sounded = toy.time
    })
    expect(at).toBeGreaterThan(0)
    expect(sounded).toBe(at)
    expect(Math.abs(toy.swing[0].value) + Math.abs(toy.swing[0].speed)).toBeGreaterThan(0)
    expect(toy.prints[0].peg).toBe(0)
    expect(PEGS.length).toBe(4)
    expect(STEP).toBeCloseTo(1 / 60, 9)
  })
})
