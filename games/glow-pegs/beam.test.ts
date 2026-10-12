import { describe, expect, it } from 'vitest'
import { beat, CAP_ACROSS, enter, FREE_AFTER, fullBeam, halfShape, onBoard, TRAPPED_AFTER, type Beam, type BeatOutcome } from './beam'
import { BLUE, COLOURS, COLS, GREEN, HOLES, PEG_RADIUS, PITCH, RED, ROWS, WHITE, YELLOW, colOf, holeAt, type Colour } from './board'
import { makeRng } from './rng'

const boardOf = (pegs: [number, number, Colour][]): number[] => {
  const board = new Array<number>(HOLES).fill(0)
  for (const [col, row, colour] of pegs) board[holeAt(col, row)] = colour
  return board
}
/** Plays beats and hands back where the full beam stood on each, starting with the beat it came in on. */
function cols(board: number[], beats: number): { cols: number[]; beams: Beam[]; outcomes: BeatOutcome[] } {
  const beams: Beam[] = []
  const outcomes = [enter(beams, board)]
  const seen = [fullBeam(beams)!.col]
  for (let i = 0; i < beats; i++) {
    outcomes.push(beat(beams, board))
    seen.push(fullBeam(beams)!.col)
  }
  return { cols: seen, beams, outcomes }
}

describe('the rules of the beam', () => {
  it('comes in at the left edge, steps one column a beat to the right, is off the board for one beat when it leaves, and comes in again at the left', () => {
    const run = cols(boardOf([]), COLS + 2)
    expect(run.cols).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, -1, 0, 1])
    expect(run.outcomes.every((outcome) => outcome.hits.length === 0)).toBe(true)
    // The beat off the board is no step of the beam: it stands on no column.
    expect(run.outcomes.map((outcome) => outcome.stepped)).toEqual([...new Array(11).fill(true), false, true, true])
    const beams: Beam[] = []
    enter(beams, boardOf([]))
    for (let i = 0; i < COLS; i++) beat(beams, boardOf([]))
    expect(onBoard(beams[0])).toBe(false)
    beat(beams, boardOf([]))
    expect(onBoard(beams[0])).toBe(true)
  })

  it('sounds no column on two beats running: a beam that goes out at the left is a beat away before the first column sounds again', () => {
    /** The columns the full beam sounded on each beat, and all columns sounded on each beat. */
    const play = (board: number[], beats: number) => {
      const beams: Beam[] = []
      const outcomes = [enter(beams, board)]
      for (let i = 0; i < beats; i++) outcomes.push(beat(beams, board))
      return outcomes.map((outcome) => ({ full: new Set(outcome.hits.filter((hit) => !hit.half).map((hit) => colOf(hit.hole))), all: new Set(outcome.hits.map((hit) => colOf(hit.hole))) }))
    }
    // Green in the first column: turned on the beat it comes in, it is away a beat and then passes.
    const first = play(boardOf([[0, 3, GREEN], [0, 5, RED]]), 40)
    expect([...first[0].all]).toEqual([0])
    expect([...first[1].all]).toEqual([])
    expect([...first[2].all]).toEqual([0])
    expect([...first[3].all]).toEqual([])
    for (let i = 1; i < first.length; i++) for (const col of first[i].all) expect(first[i - 1].all.has(col), `beat ${i}`).toBe(false)
    // Any green, anywhere, with pegs in the first column: over many boards the full beam never sounds a column twice running.
    const chance = makeRng(5)
    for (let n = 0; n < 300; n++) {
      const board = new Array<number>(HOLES).fill(0)
      for (let hole = 0; hole < HOLES; hole++) if (chance.next() < 0.25) board[hole] = [RED, BLUE, GREEN, GREEN, YELLOW][Math.floor(chance.next() * 5)]
      board[holeAt(0, n % ROWS)] = n % 2 === 0 ? RED : GREEN
      board[holeAt(Math.floor(chance.next() * COLS), 3)] = GREEN
      const run = play(board, 80)
      for (let i = 1; i < run.length; i++) for (const col of run[i].full) expect(run[i - 1].full.has(col), `board ${n}, beat ${i}`).toBe(false)
    }
    // With no yellow there is no half beam, and then no column at all sounds twice running.
    for (let n = 0; n < 300; n++) {
      const board = new Array<number>(HOLES).fill(0)
      for (let hole = 0; hole < HOLES; hole++) if (chance.next() < 0.25) board[hole] = [RED, BLUE, GREEN][Math.floor(chance.next() * 3)]
      board[holeAt(0, n % ROWS)] = GREEN
      const run = play(board, 80)
      for (let i = 1; i < run.length; i++) for (const col of run[i].all) expect(run[i - 1].all.has(col), `board ${n}, beat ${i}`).toBe(false)
    }
  })

  it('sounds no column on two beats running with half beams either: a white peg that holds one beam holds them all, so the beams keep in step', () => {
    const play = (board: number[], beats: number) => {
      const beams: Beam[] = []
      const outcomes = [enter(beams, board)]
      for (let i = 0; i < beats; i++) outcomes.push(beat(beams, board))
      return outcomes.map((outcome) => new Set(outcome.hits.map((hit) => colOf(hit.hole))))
    }
    const never = (board: number[], beats: number, label: string) => {
      const run = play(board, beats)
      for (let i = 1; i < run.length; i++) for (const col of run[i]) expect(run[i - 1].has(col), `${label}, beat ${i}, column ${col}`).toBe(false)
      return run
    }
    // White in column 2, yellow in column 5 and a peg in column 0: the half beam that white held once sounded the first
    // column the beat before the full beam came in on it.
    const named = never(boardOf([[2, 1, WHITE], [5, 3, YELLOW], [0, 4, RED]]), 60, 'the named board')
    // The half beam does reach the first column, and the full beam does come in on it again.
    expect(named.filter((cols) => cols.has(0)).length).toBeGreaterThan(3)
    // A white peg that holds a half beam holds the full beam for that beat too, where it stands.
    const beams: Beam[] = []
    const board = boardOf([[2, 1, WHITE], [5, 3, YELLOW]])
    enter(beams, board)
    for (let i = 0; i < 9; i++) beat(beams, board)
    // The half beam split off in column 5 has come to the white peg in column 2 on this beat, with the full beam in column 8.
    expect(beams.map((beam) => [beam.col, beam.half, beam.hold])).toEqual([[8, false, 0], [2, true, 1]])
    const quiet = beat(beams, board)
    expect(quiet.hits).toEqual([])
    expect(quiet.stepped).toBe(false)
    expect(beams.map((beam) => [beam.col, beam.half, beam.hold])).toEqual([[8, false, 0], [2, true, 0]])
    beat(beams, board)
    expect(beams.map((beam) => [beam.col, beam.half])).toEqual([[9, false], [1, true]])
    // Over many boards of every colour, each with yellow and white on it: no column sounds on two beats running, by any beam.
    const chance = makeRng(11)
    let halves = 0, held = 0
    for (let n = 0; n < 600; n++) {
      const board = new Array<number>(HOLES).fill(0)
      const share = 0.08 + 0.3 * chance.next()
      for (let hole = 0; hole < HOLES; hole++) if (chance.next() < share) board[hole] = COLOURS[Math.floor(chance.next() * 5)]
      board[holeAt(Math.floor(chance.next() * COLS), n % ROWS)] = YELLOW
      board[holeAt(Math.floor(chance.next() * COLS), (n + 3) % ROWS)] = WHITE
      if (n % 3 === 0) board[holeAt(0, (n + 1) % ROWS)] = RED
      const live: Beam[] = []
      let last = new Set(enter(live, board).hits.map((hit) => colOf(hit.hole)))
      for (let i = 1; i <= 120; i++) {
        const outcome = beat(live, board)
        const now = new Set(outcome.hits.map((hit) => colOf(hit.hole)))
        for (const col of now) expect(last.has(col), `board ${n}, beat ${i}, column ${col}`).toBe(false)
        last = now
        if (outcome.hits.some((hit) => hit.half)) halves += 1
        if (live.some((beam) => beam.half && beam.hold > 0)) held += 1
      }
    }
    // The boards did what the rule is about: half beams sounded, and white pegs held them.
    expect(halves).toBeGreaterThan(5000)
    expect(held).toBeGreaterThan(500)
  })

  it('sounds every peg of the column it meets, on the beat it meets it, and red and blue act by sound alone', () => {
    const board = boardOf([[2, 1, RED], [2, 5, BLUE], [4, 0, RED]])
    const run = cols(board, 5)
    expect(run.outcomes.map((outcome) => outcome.hits.map((hit) => hit.hole))).toEqual([[], [], [holeAt(2, 1), holeAt(2, 5)], [], [holeAt(4, 0)], []])
    expect(run.cols).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('meets the first column on the very beat the lever goes down', () => {
    const beams: Beam[] = []
    expect(enter(beams, boardOf([[0, 3, RED]])).hits).toEqual([{ hole: holeAt(0, 3), colour: RED, half: false }])
  })

  it('white holds the beam on its column for one more beat, however many white pegs stand there, and that beat is quiet', () => {
    for (const whites of [[[3, 2, WHITE]], [[3, 0, WHITE], [3, 3, WHITE], [3, 6, WHITE]]] as [number, number, Colour][][]) {
      const run = cols(boardOf(whites), 6)
      expect(run.cols).toEqual([0, 1, 2, 3, 3, 4, 5])
      expect(run.outcomes[3].hits).toHaveLength(whites.length)
      expect(run.outcomes[4].hits).toEqual([])
    }
  })

  it('green turns the beam round on its column, and it goes back the way it came', () => {
    const run = cols(boardOf([[3, 2, GREEN]]), 8)
    expect(run.cols).toEqual([0, 1, 2, 3, 2, 1, 0, -1, 0])
  })

  it('a green peg turns the beam every other time: turned back, the beam comes in again and passes every green peg, and the time after it is turned again', () => {
    const run = cols(boardOf([[3, 2, GREEN], [6, 1, GREEN], [9, 4, RED]]), 28)
    // Turned at column 3; then across the whole board, through both green columns; then turned at column 3 again.
    expect(run.cols).toEqual([0, 1, 2, 3, 2, 1, 0, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, -1, 0, 1, 2, 3, 2, 1, 0, -1, 0])
    // A green peg it passes still sounds.
    expect(run.outcomes[11].hits).toEqual([{ hole: holeAt(3, 2), colour: GREEN, half: false }])
  })

  it('leaves no column unplayed: on any board that stands still, every column that holds a peg has sounded by the end of the beam\'s second time across', () => {
    const chance = makeRng(77)
    for (let n = 0; n < 400; n++) {
      const board = new Array<number>(HOLES).fill(0)
      const share = 0.05 + 0.4 * chance.next()
      for (let hole = 0; hole < HOLES; hole++) if (chance.next() < share) board[hole] = COLOURS[Math.floor(chance.next() * 5)]
      // Green in the first column, in the last, in both, or wherever it fell.
      if (n % 4 === 1 || n % 4 === 3) board[holeAt(0, n % ROWS)] = GREEN
      if (n % 4 === 2 || n % 4 === 3) board[holeAt(COLS - 1, n % ROWS)] = GREEN
      const beams: Beam[] = []
      const sounded = new Set<number>()
      const note = (outcome: BeatOutcome) => { for (const hit of outcome.hits) if (!hit.half) sounded.add(colOf(hit.hole)) }
      note(enter(beams, board))
      // Two times across: until the full beam has left the board twice.
      let left = 0
      for (let i = 0; i < 2000 && left < 2; i++) {
        const was = onBoard(fullBeam(beams)!)
        note(beat(beams, board))
        if (was && !onBoard(fullBeam(beams)!)) left += 1
      }
      expect(left, `board ${n}`).toBe(2)
      const pegged = [...new Set(board.flatMap((cell, hole) => (cell !== 0 ? [colOf(hole)] : [])))].sort((a, b) => a - b)
      expect([...sounded].sort((a, b) => a - b), `board ${n}`).toEqual(pegged)
    }
  })

  it('draws a half beam as a soft band along the row of the yellow peg that split it: no taller than a peg\'s cap, short of the next peg\'s cap, and no two alike', () => {
    const shapes = Array.from({ length: COLS }, (_, from) => halfShape(from))
    expect(CAP_ACROSS).toBe((PEG_RADIUS - 2) * 2)
    for (let a = 0; a < COLS; a++) {
      // No taller than the cap, so behind a peg nothing of it shows above or below; tall enough to be seen on an empty hole.
      expect(shapes[a].tall).toBeLessThanOrEqual(CAP_ACROSS - 2)
      // Plump: at least a third as tall as it is long, a blob of light on an empty hole and never a dash.
      expect(shapes[a].tall).toBeGreaterThanOrEqual((shapes[a].reach * 2) / 3)
      // Longer than the cap is wide, so it shows at both sides of a peg, and short of the cap of a peg in the next cell.
      expect(shapes[a].reach).toBeGreaterThanOrEqual(CAP_ACROSS / 2 + 10)
      expect(shapes[a].reach).toBeLessThanOrEqual(PITCH - CAP_ACROSS / 2 - 2)
      for (let b = a + 1; b < COLS; b++) expect(shapes[a].tall, `${a} and ${b}`).not.toBe(shapes[b].tall)
    }
    // Two side by side differ plainly in height.
    for (let a = 0; a + 1 < COLS; a++) expect(Math.abs(shapes[a].tall - shapes[a + 1].tall)).toBeGreaterThanOrEqual(6)
    // The row is the yellow peg's; of several in one column, the one nearest the middle.
    for (const [rows, row] of [[[0], 0], [[6], 6], [[2], 2], [[0, 6], 0], [[1, 5, 6], 1], [[0, 4], 4], [[2, 3, 4], 3]] as [number[], number][]) {
      const board = boardOf(rows.map((r) => [4, r, YELLOW] as [number, number, Colour]))
      const beams: Beam[] = []
      enter(beams, board)
      for (let i = 0; i < 4; i++) beat(beams, board)
      expect(beams.find((beam) => beam.half)).toMatchObject({ from: 4, row })
    }
    expect(fullBeam([{ col: 0, dir: 1, half: false, hold: 0, turns: 0, from: -1, row: -1, open: false, shut: -1 }])!.row).toBe(-1)
    // A row of yellow pegs along the bottom: every band lies along that row, and no two on the board are of one height.
    const bottom = boardOf(Array.from({ length: COLS }, (_, col) => [col, ROWS - 1, YELLOW] as [number, number, Colour]))
    const beams: Beam[] = []
    enter(beams, bottom)
    let most = 0
    for (let i = 0; i < 40; i++) {
      beat(beams, bottom)
      const halves = beams.filter((beam) => beam.half)
      most = Math.max(most, halves.length)
      expect(halves.every((beam) => beam.row === ROWS - 1)).toBe(true)
      const feet = halves.map((beam) => halfShape(beam.from).tall / 2)
      expect(new Set(feet).size).toBe(feet.length)
    }
    expect(most).toBeGreaterThan(3)
    // And no two on the board at once share a column they came from, over a busy board of yellow and green.
    const board = boardOf([[1, 0, YELLOW], [3, 2, YELLOW], [4, 3, GREEN], [5, 1, YELLOW], [7, 6, YELLOW], [8, 2, GREEN], [9, 5, YELLOW]])
    enter(beams, board)
    for (let i = 0; i < 300; i++) {
      beat(beams, board)
      const from = beams.filter((beam) => beam.half).map((beam) => beam.from)
      expect(new Set(from).size).toBe(from.length)
    }
  })

  it('yellow splits a half beam off the other way while the beam carries on, and a half that leaves is gone', () => {
    const board = boardOf([[3, 2, YELLOW], [1, 4, RED]])
    const beams: Beam[] = []
    enter(beams, board)
    for (let i = 0; i < 3; i++) beat(beams, board)
    expect(beams.map((beam) => [beam.col, beam.dir, beam.half])).toEqual([[3, 1, false], [3, -1, true]])
    beat(beams, board)
    expect(beams.map((beam) => beam.col)).toEqual([4, 2])
    // The half beam plays the red peg it meets, as a half.
    expect(beat(beams, board).hits).toEqual([{ hole: holeAt(1, 4), colour: RED, half: true }])
    beat(beams, board)
    expect(beams.map((beam) => beam.col)).toEqual([6, 0])
    beat(beams, board)
    expect(beams).toHaveLength(1)
    expect(beams[0].half).toBe(false)
  })

  it('a half beam only sounds a yellow peg, and obeys a white and a green one', () => {
    const board = boardOf([[6, 0, YELLOW], [4, 1, YELLOW], [3, 2, WHITE]])
    const beams: Beam[] = []
    enter(beams, board)
    // Six beats: the beam was held a beat in column 3 and has split in column 4. The half beam has come to the white peg, which holds it.
    for (let i = 0; i < 6; i++) beat(beams, board)
    expect(beams.map((beam) => [beam.col, beam.half, beam.from, beam.hold])).toEqual([[5, false, -1, 0], [3, true, 4, 1]])
    // While white holds the half beam every beam stands: the full beam waits in column 5 for that beat.
    beat(beams, board)
    expect(beams.map((beam) => [beam.col, beam.half, beam.from, beam.hold])).toEqual([[5, false, -1, 0], [3, true, 4, 0]])
    // The full beam splits in column 6. A green peg goes in ahead of the first half.
    beat(beams, board)
    expect(beams.map((beam) => [beam.col, beam.half, beam.from])).toEqual([[6, false, -1], [2, true, 4], [6, true, 6]])
    board[holeAt(1, 3)] = GREEN
    const turned = beat(beams, board)
    // The first half was turned round by the green peg.
    expect(beams.map((beam) => [beam.col, beam.dir, beam.from])).toEqual([[7, 1, -1], [1, 1, 4], [5, -1, 6]])
    expect(turned.hits).toEqual([{ hole: holeAt(1, 3), colour: GREEN, half: true }])
    // The second sounds the yellow in column 4 and does not split on it.
    const sounded = beat(beams, board)
    expect(sounded.hits).toEqual([{ hole: holeAt(4, 1), colour: YELLOW, half: true }])
    expect(beams).toHaveLength(3)
    // And each is held by the white peg in its turn: the first on its way back, the second on its way out.
    beat(beams, board)
    expect(beams.map((beam) => [beam.col, beam.hold])).toEqual([[9, 0], [3, 1], [3, 1]])
  })

  it('a half beam shut in is let out at its eighth turn, and again at its next turn if a new green peg has shut it in since: it never goes round for good', () => {
    const board = boardOf([[1, 1, GREEN], [6, 1, GREEN]])
    // A half beam between two green columns, fresh.
    const fresh: Beam[] = [{ col: 5, dir: -1, half: true, hold: 0, turns: 0, from: 5, row: 2, open: false, shut: -1 }]
    let beats = 0
    while (fresh.length > 0 && beats < 200) { beat(fresh, board); beats += 1 }
    expect(fresh).toEqual([])
    expect(beats).toBeGreaterThan(TRAPPED_AFTER * 4)
    // One that was let out and has been shut in again by a green peg pushed in: its very next turn lets it out.
    const again: Beam[] = [{ col: 5, dir: -1, half: true, hold: 0, turns: TRAPPED_AFTER, from: 5, row: 2, open: false, shut: -1 }]
    beats = 0
    while (again.length > 0 && beats < 200) { beat(again, board); beats += 1 }
    expect(again).toEqual([])
    expect(beats).toBeLessThan(2 * COLS)
  })

  it('does not split again in a column whose half beam is still on the board', () => {
    // Two greens keep a half beam on the board; the beam passes the yellow column again and again.
    const board = boardOf([[5, 0, YELLOW], [2, 1, GREEN], [8, 1, GREEN]])
    const beams: Beam[] = []
    enter(beams, board)
    for (let i = 0; i < 60; i++) {
      beat(beams, board)
      expect(beams.filter((beam) => beam.half && beam.from === 5).length).toBeLessThanOrEqual(1)
      expect(beams.length).toBeLessThanOrEqual(1 + COLS)
    }
  })

  it('reads the board as it stands on each beat: a peg pushed in ahead of the beam counts, one pulled out does not', () => {
    const board = boardOf([[6, 2, GREEN]])
    const beams: Beam[] = []
    enter(beams, board)
    for (let i = 0; i < 3; i++) beat(beams, board)
    board[holeAt(6, 2)] = 0
    board[holeAt(5, 2)] = RED
    for (let i = 0; i < 4; i++) beat(beams, board)
    expect(fullBeam(beams)!.col).toBe(7)
  })
})

describe('the trapped beam', () => {
  it('cannot happen on a board that stands still: the beam turns at the first green column and leaves at the left, or passes them all', () => {
    const board = boardOf([[3, 0, GREEN], [7, 0, GREEN], [9, 3, GREEN]])
    const run = cols(board, 200)
    expect(run.outcomes.some((outcome) => outcome.trapped)).toBe(false)
    expect(Math.max(...run.beams.map((beam) => beam.turns))).toBeLessThanOrEqual(1)
  })

  it('happens when a green peg is pushed in behind a beam that has another green ahead: the eighth turn in a row says so, once', () => {
    const board = boardOf([[7, 0, GREEN]])
    const beams: Beam[] = []
    enter(beams, board)
    for (let i = 0; i < 4; i++) beat(beams, board)
    board[holeAt(2, 5)] = GREEN
    let turns = 0, said = 0
    for (let i = 0; i < 80 && said === 0; i++) {
      const before = fullBeam(beams)!.dir
      const outcome = beat(beams, board)
      if (fullBeam(beams)!.dir !== before) turns += 1
      if (outcome.trapped) said += 1
    }
    expect(said).toBe(1)
    expect(turns).toBe(TRAPPED_AFTER)
    // It is not said again on the turns that follow.
    let again = 0
    for (let i = 0; i < 60; i++) if (beat(beams, board).trapped) again += 1
    expect(again).toBe(0)
  })

  it('is let out: a little after its show the green pegs let the beam through, and it leaves the board', () => {
    const board = boardOf([[7, 0, GREEN], [9, 2, RED]])
    const beams: Beam[] = []
    enter(beams, board)
    for (let i = 0; i < 4; i++) beat(beams, board)
    board[holeAt(2, 5)] = GREEN
    let beats = 0
    while (!beat(beams, board).trapped) beats += 1
    // Shut in for the length of its show, between the two green columns.
    for (let i = 0; i < FREE_AFTER - 1; i++) {
      beat(beams, board)
      expect(fullBeam(beams)!.col).toBeGreaterThanOrEqual(2)
      expect(fullBeam(beams)!.col).toBeLessThanOrEqual(7)
    }
    // Then out through a green column and off the board, and round again as on any board.
    const seen = new Set<number>()
    for (let i = 0; i < 2 * COLS + 2; i++) {
      beat(beams, board)
      seen.add(fullBeam(beams)!.col)
    }
    expect(seen.has(0) || seen.has(COLS - 1)).toBe(true)
    expect(beats).toBeGreaterThan(0)
  })

  it('starts its count again when the beam leaves the board', () => {
    const board = boardOf([[2, 0, GREEN]])
    const run = cols(board, 100)
    expect(run.outcomes.some((outcome) => outcome.trapped)).toBe(false)
    expect(fullBeam(run.beams)!.turns).toBeLessThanOrEqual(1)
  })
})
