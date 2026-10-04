import { describe, expect, it } from 'vitest'
import { companyOf, isSound, placeOf, putInSand, putOnEnd, standsAt, tap, weightOn } from './arrangement'
import { ASK_AT, Game, SNORE_EVERY, type Cue } from './game'
import type { Guidance } from './guidance'
import { RAKED, biteDepth, marksFromText, marksToText, rakeIsOut } from './marks'
import { overlap } from './overlap'
import { seeded } from './motion'
import { KINDS, layout, rideOf, wantMet, type Kind } from './rides'
import { endRide, freshWorld, load, rideIsOver, save, type Saved, type World } from './save'
import { NEXT_AT } from './scenes'
import { chuckle, crow, levelHum, purr, scratch, softNote, spit, type Part } from './voices'
import { FRIEND_IDS, MAX_TILT, PLANK, WAITING_PLACE, homeOn, plankTopAt, type FriendId } from './world'

const QUIET: Guidance = { glow: 0, demo: null, demoIndex: -1 }

const weightOnEnds = (game: Game) => [weightOn(game.play.arrangement, 'left'), weightOn(game.play.arrangement, 'right')]

/** Plays `seconds` at 60 frames a second, and returns every cue and every save the game asked for on the way. */
function run(game: Game, seconds: number, guidance: Guidance = QUIET): { cues: Cue[]; saves: { how: 'soon' | 'now'; saved: Saved }[] } {
  const cues: Cue[] = [], saves: { how: 'soon' | 'now'; saved: Saved }[] = []
  for (let t = 0; t < seconds; t += 1 / 60) {
    game.step(1 / 60, guidance)
    cues.push(...game.takeCues())
    if (game.wantsSave !== 'no') {
      saves.push({ how: game.wantsSave, saved: JSON.parse(JSON.stringify(game.saved())) })
      game.wantsSave = 'no'
    }
  }
  return { cues, saves }
}

const tapOn = (game: Game, id: FriendId) => {
  game.press({ kind: 'friend', id })
  game.tap()
}

/** A world whose first showing has already played, so a test can start in the middle of things. */
function shown(world: World = freshWorld(null)): World {
  return { ...world, shown: [world.kind] }
}

/** A game at the first ride with Mog just sent to lift Pim, played until the ending begins. */
function lifting(): Game {
  const game = new Game(shown(), 1)
  tapOn(game, 'mog')
  for (let i = 0; i < 600 && !game.sceneRunning; i++) game.step(1 / 60, QUIET)
  expect(game.sceneRunning).toBe(true)
  return game
}

describe('the first open', () => {
  it('plays the showing of the first ride once: Pim hops onto her end herself, and it is saved as played before the first beat', () => {
    const game = new Game(freshWorld(null), 1)
    const first = run(game, 0.05)
    expect(game.sceneRunning).toBe(true)
    // What a showing saves when it starts: that it has played, and who is where at its end.
    expect(first.saves[0].how).toBe('now')
    expect(first.saves[0].saved.shown).toEqual(['little-asks'])
    expect(first.saves[0].saved.left).toEqual(['pim'])
    expect(first.saves[0].saved.right).toEqual([])
    expect(first.saves[0].saved.sand).toEqual(save(freshWorld(null)).sand)
    // At its start she stands in the sand by her end and the plank lies level.
    expect(game.play.bodies.pim.y).toBe(0)
    expect(Math.abs(game.play.plank.tilt)).toBeLessThan(0.05)
    run(game, 4)
    expect(game.sceneRunning).toBe(false)
    expect(game.play.plank.tilt).toBeCloseTo(-MAX_TILT)
    expect(game.play.bodies.pim.landed).toBe(true)
    expect(game.play.arrangement).toEqual(layout(rideOf('little-asks', 0)))
    // The showing is not a move of the child's: nothing was counted, and the ride has not ended.
    expect(game.world.moves).toBe(0)
    expect(game.world.state.finished).toBe(false)
  })

  it('a showing put away midway is found finished and never plays again', () => {
    const game = new Game(freshWorld(null), 1)
    const { saves } = run(game, 0.3)
    const back = new Game(load(saves[saves.length - 1].saved, null), 2)
    run(back, 5)
    expect(back.sceneRunning).toBe(false)
    expect(back.play.bodies.pim.landed).toBe(true)
    expect(back.play.plank.tilt).toBeCloseTo(-MAX_TILT)
    expect(back.world.shown).toEqual(['little-asks'])
  })

  it('a touch ends a showing at once with everyone where its end has them, and is then an ordinary touch', () => {
    const game = new Game(freshWorld(null), 1)
    run(game, 0.2)
    game.press({ kind: 'friend', id: 'bo' })
    expect(game.sceneRunning).toBe(false)
    expect(game.play.settled).toBe(true)
    expect(game.play.arrangement).toEqual(game.world.arrangement)
    // The touch was answered: Bo spoke.
    expect(game.takeCues().some((cue) => cue.type === 'voice')).toBe(false)
    game.tap()
    const { cues } = run(game, 0.1)
    expect(cues.some((cue) => cue.type === 'voice')).toBe(true)
    expect(placeOf(game.play.arrangement, 'bo').at).toBe('end')
  })

  it('a child who acts before a showing begins sees it the next time that kind is laid out', () => {
    const game = new Game(freshWorld(null), 1)
    tapOn(game, 'bo')
    run(game, 0.5)
    expect(game.world.shown).toEqual([])
  })

  it('a child who starts one step on is shown that ride, not the first', () => {
    const game = new Game(freshWorld(5), 1)
    const { saves } = run(game, 0.05)
    expect(saves[0].saved.shown).toEqual(['middle-asks'])
    run(game, 5)
    expect(game.play.arrangement).toEqual(layout(rideOf('middle-asks', 0)))
    expect(game.play.settled).toBe(true)
  })
})

describe('the showings, one for each kind of ride', () => {
  /** A world at the opening of a kind of ride, with nothing shown yet. */
  const opening = (kind: Kind, turn: number): World => {
    const world = freshWorld(null)
    return { ...world, state: { ...world.state, position: kind }, kind, turn, arrangement: layout(rideOf(kind, turn)) }
  }

  it('each saves, when it starts, that it has played and who is where at its end', () => {
    for (const kind of KINDS) for (const turn of [0, 1]) {
      const game = new Game(opening(kind, turn), 1)
      const { saves } = run(game, 0.05)
      expect(game.sceneRunning, kind).toBe(true)
      expect(saves[0].how, kind).toBe('now')
      expect(saves[0].saved.shown, kind).toEqual([kind])
      const at = save({ ...opening(kind, turn), shown: [kind] })
      expect({ left: saves[0].saved.left, right: saves[0].saved.right, sand: saves[0].saved.sand }, kind).toEqual({ left: at.left, right: at.right, sand: at.sand })
    }
  })

  it('in the showing where Pim hops onto Mog, he does what he always does when landed on: ears flat and his hiss', () => {
    const game = new Game(opening('big-asks', 0), 1)
    const hiss = JSON.stringify(spit())
    let hissed = 0, putOut = 0
    for (let t = 0; t < 2.6; t += 1 / 60) {
      game.step(1 / 60, QUIET)
      hissed += game.takeCues().filter((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === hiss).length
      if (game.frame.poses.mog.frown === 1) putOut += 1
    }
    expect(hissed).toBe(1)
    expect(putOut).toBeGreaterThan(20)
    run(game, 2)
    expect(game.frame.poses.mog.frown).toBe(0)
  })

  it('each ends, played through, as the ride opens: everyone at rest where the saved world has them, and no move counted', () => {
    for (const kind of KINDS) for (const turn of [0, 1]) {
      const game = new Game(opening(kind, turn), 1)
      run(game, 9)
      expect(game.sceneRunning, kind).toBe(false)
      expect(game.play.settled, kind).toBe(true)
      expect(game.play.arrangement, kind).toEqual(layout(rideOf(kind, turn)))
      expect(game.world.arrangement, kind).toEqual(layout(rideOf(kind, turn)))
      expect(game.world.moves, kind).toBe(0)
      expect(game.world.state.finished, kind).toBe(false)
    }
  })

  it('each, ended by a touch at any instant, is found finished at once', () => {
    for (const kind of KINDS) for (const after of [0.02, 0.6, 1.2, 2.2]) {
      const game = new Game(opening(kind, 0), 1)
      run(game, after)
      game.press({ kind: 'none' })
      expect(game.sceneRunning).toBe(false)
      expect(game.play.settled, `${kind} at ${after}`).toBe(true)
      expect(game.play.arrangement, `${kind} at ${after}`).toEqual(layout(rideOf(kind, 0)))
      run(game, 6)
      expect(game.sceneRunning).toBe(false)
      expect(game.world.shown).toEqual([kind])
    }
  })

  it('each saves the sand as it lies at its end: played through or cut at any instant, the marks are the ones saved at the start', () => {
    for (const kind of KINDS) {
      for (const cutAt of [null, 0.02, 0.7, 1.6]) {
        const game = new Game(opening(kind, 0), 1)
        const { saves } = run(game, 0.05)
        const atStart = saves[0].saved.marks
        if (cutAt === null) run(game, 12)
        else {
          run(game, cutAt)
          game.press({ kind: 'none' })
          run(game, 8)
        }
        expect(marksToText(game.world.marks), `${kind} cut ${cutAt}`).toBe(atStart)
      }
    }
    // And the two showings that thump an end into the sand do leave their bite.
    for (const kind of ['little-asks', 'high-asks'] as Kind[]) {
      const game = new Game(opening(kind, 0), 1)
      const { saves } = run(game, 0.05)
      expect(saves[0].saved.marks, kind).toMatch(/[2-9]/)
    }
  })

  it('none is the answer to its ride: the asker is no nearer where it wants to be when the showing is over', () => {
    for (const kind of KINDS) {
      const game = new Game(opening(kind, 0), 1)
      run(game, 9)
      expect(wantMet(rideOf(kind, 0), game.play.arrangement), kind).toBe(false)
    }
  })
})

describe('the ride, the ending of every cycle', () => {
  it('starts only when the plank has carried the asker there, and saves its outcome before the first beat', () => {
    const game = new Game(shown(), 1)
    tapOn(game, 'mog')
    game.step(1 / 60, QUIET)
    // The move is made, the plank has not turned yet: no ending.
    expect(game.sceneRunning).toBe(false)
    expect(game.world.moves).toBe(1)
    game.wantsSave = 'no'
    let started: Saved | null = null
    for (let i = 0; i < 600 && !started; i++) {
      game.step(1 / 60, QUIET)
      if (game.sceneRunning) started = JSON.parse(JSON.stringify(game.saved()))
    }
    expect(game.wantsSave).toBe('now')
    // Every field the scene changes, as the sheet lists them.
    expect(started).toMatchObject({ finished: true, position: 'middle-asks', waiting: 'mog', moves: 0, left: ['pim'], right: [] })
    expect(started!.sand.mog).toBeUndefined()
    // On screen Mog still sits where the child put him: he leaves in the last beat.
    expect(game.play.arrangement.right).toEqual(['mog'])
    // And the sand as it lies at the scene's end, with every bite the rocking plank and the leaving friend make.
    const before = marksToText(game.world.marks)
    run(game, NEXT_AT + 8)
    expect(marksToText(game.world.marks)).toBe(started!.marks)
    expect(before).toBe(started!.marks)
  })

  it('plays its beats and ends with the next asker at the waiting place and everything else as the child left it', () => {
    const game = lifting()
    run(game, NEXT_AT + 3)
    expect(game.sceneRunning).toBe(false)
    expect(game.play.arrangement).toEqual(game.world.arrangement)
    expect(game.play.arrangement.waiting).toBe('mog')
    expect(game.play.arrangement.left).toEqual(['pim'])
    const mog = game.play.bodies.mog
    expect([mog.x, mog.y, mog.z]).toEqual([WAITING_PLACE.x, 0, WAITING_PLACE.z])
  })

  it('cut at any instant, the sand ends as it was saved when the ending began', () => {
    for (const after of [0.02, 1.0, 2.0, 3.0, NEXT_AT - 0.05]) {
      const game = lifting()
      const atStart = marksToText(game.world.marks)
      run(game, after)
      game.press({ kind: 'none' })
      const { cues } = run(game, 8)
      expect(marksToText(game.world.marks), `cut ${after} s in`).toBe(atStart)
      // What had not been drawn of it is drawn when the touch lands.
      if (after < 1) expect(cues.some((cue) => cue.type === 'bite' || cue.type === 'dimple')).toBe(true)
    }
  })

  it('any touch ends it at once with every beat at its end, and is then an ordinary touch', () => {
    const game = lifting()
    run(game, 0.5)
    game.press({ kind: 'sand', x: -3, z: 2 })
    expect(game.sceneRunning).toBe(false)
    expect(game.play.arrangement).toEqual(game.world.arrangement)
    expect(game.play.arrangement.waiting).toBe('mog')
    const { cues } = run(game, 0.1)
    expect(cues.some((cue) => cue.type === 'dimple')).toBe(true)
    run(game, 3)
    expect(standsAt(game.play.arrangement, 'mog')).toEqual({ ...WAITING_PLACE })
    expect(game.play.settled).toBe(true)
  })

  it('if the child does nothing, nothing starts', () => {
    const game = lifting()
    run(game, NEXT_AT + 3)
    const before = JSON.stringify(game.saved())
    run(game, 40)
    expect(game.sceneRunning).toBe(false)
    expect(JSON.stringify(game.saved())).toBe(before)
    expect(game.world.state.finished).toBe(true)
  })

  it('the finished scene can still be played with, and nothing is asked or counted', () => {
    const game = lifting()
    run(game, NEXT_AT + 3)
    tapOn(game, 'bo')
    run(game, 4)
    expect(placeOf(game.play.arrangement, 'bo').at).toBe('end')
    expect(game.world.moves).toBe(0)
    expect(game.world.state.finished).toBe(true)
    expect(game.sceneRunning).toBe(false)
  })

  it('a touch on the friend who waits begins the next ride: everyone hops to their places, and its showing plays once', () => {
    const game = lifting()
    run(game, NEXT_AT + 3)
    game.wantsSave = 'no'
    tapOn(game, 'mog')
    expect(game.wantsSave).toBe('now')
    expect(game.world.state.finished).toBe(false)
    expect(game.world.kind).toBe('middle-asks')
    expect(game.world.turn).toBe(1)
    expect(game.play.arrangement).toEqual(layout(rideOf('middle-asks', 1)))
    const { saves } = run(game, 8)
    expect(saves.some((entry) => entry.how === 'now' && entry.saved.shown.includes('middle-asks'))).toBe(true)
    expect(game.sceneRunning).toBe(false)
    expect(game.play.settled).toBe(true)
    // The showing moved Pim on and off and ended as the ride opens; the child has made no move.
    expect(game.play.arrangement).toEqual(layout(rideOf('middle-asks', 1)))
    expect(game.world.moves).toBe(0)
    // A drag that takes hold of the waiting friend begins the ride as well; here nobody waits any more.
    game.press({ kind: 'friend', id: 'mog' })
    game.dragStart()
    expect(game.world.kind).toBe('middle-asks')
  })

  it('on load no scene replays: an ending put away at any of its instants is found ended, with the next asker waiting', () => {
    for (const after of [0, 0.4, 2, NEXT_AT - 0.1, NEXT_AT + 0.5]) {
      const game = lifting()
      run(game, after)
      const back = new Game(load(JSON.parse(JSON.stringify(game.saved())), null), 3)
      expect(back.play.settled).toBe(true)
      run(back, 6)
      expect(back.sceneRunning, `put away ${after} s in`).toBe(false)
      expect(back.world.state.finished).toBe(true)
      expect(back.world.state.position).toBe('middle-asks')
      expect(standsAt(back.play.arrangement, 'mog')).toEqual({ ...WAITING_PLACE })
      expect(back.play.arrangement.left).toEqual(['pim'])
    }
  })
})

describe('found as left', () => {
  it('a put-away with a friend in the air or in the hand saves it where it belongs, and nothing is lost', () => {
    const game = new Game(shown(), 1)
    tapOn(game, 'bo')
    run(game, 0.3)
    expect(game.play.bodies.bo.mode).not.toBe('rest')
    expect(game.saved().right).toEqual(['bo'])
    const held = new Game(shown(), 1)
    held.press({ kind: 'friend', id: 'mog' })
    held.dragStart()
    held.dragTo({ x: -3, z: -1 }, null)
    run(held, 0.5)
    // In the hand: saved where it was picked up from.
    expect(held.saved().sand.mog).toEqual(save(shown()).sand.mog)
    held.dragEnd()
    run(held, 3)
    expect(held.saved().left).toEqual(['pim', 'mog'])
  })

  it('a put-away with a friend in the hand makes no move: it goes back to where it was picked up from, nothing is counted and no ride ends', () => {
    // Mog carried over the far end, where letting go would lift Pim and end the ride.
    const game = new Game(shown(), 1)
    run(game, 0.2)
    const before = game.saved()
    game.press({ kind: 'friend', id: 'mog' })
    game.dragStart()
    game.dragTo({ x: PLANK.seat, z: PLANK.z }, null)
    run(game, 0.6)
    game.putAway()
    const parked = game.saved()
    expect({ ...parked, touched: false, marks: before.marks }).toEqual(before)
    // The hollow Mog will make as he comes down where he stood is in the saved sand already: nothing set going is lost.
    expect(parked.marks).not.toBe(before.marks)
    expect(game.play.held).toBe(null)
    // Opened again and left alone: Mog comes down where he stood, no ending plays and nothing was counted.
    const { cues } = run(game, 6)
    expect(game.sceneRunning).toBe(false)
    expect(game.world.state.finished).toBe(false)
    expect(game.world.moves).toBe(0)
    expect(game.play.bodies.mog.mode).toBe('rest')
    expect(game.play.bodies.mog.y).toBeCloseTo(0, 5)
    expect({ ...game.saved(), marks: before.marks, touched: false }).toEqual(before)
    expect(cues.some((cue) => cue.type === 'bite')).toBe(false)
    // And when he does come down, the sand is exactly as it was saved, and the hollow is drawn then, once.
    expect(game.saved().marks).toBe(parked.marks)
    expect(cues.filter((cue) => cue.type === 'dimple').length).toBe(1)
    // The finger's lift arrives after all, or never: either way nothing more happens.
    game.dragEnd()
    run(game, 2)
    expect(game.world.moves).toBe(0)
    // Loaded instead of opened again: the same world.
    expect(save(load(JSON.parse(JSON.stringify(parked)), null))).toEqual(parked)
  })

  it('a put-away with a friend lifted off the plank puts it back on its end: the finished ride stays finished and nothing replays', () => {
    const game = lifting()
    run(game, 9)
    expect(game.sceneRunning).toBe(false)
    // Play on the finished scene: Bo sent onto the plank, then lifted off it again and carried over the sand.
    tapOn(game, 'bo')
    run(game, 4)
    const before = game.saved()
    expect(before.finished).toBe(true)
    expect([...before.left, ...before.right]).toContain('bo')
    game.press({ kind: 'friend', id: 'bo' })
    game.dragStart()
    game.dragTo({ x: 0, z: 2 }, null)
    run(game, 0.8)
    game.putAway()
    expect({ ...game.saved(), marks: before.marks }).toEqual(before)
    const { cues } = run(game, 6)
    expect(game.sceneRunning).toBe(false)
    expect(game.play.bodies.bo.landed).toBe(true)
    expect({ ...game.saved(), marks: before.marks }).toEqual(before)
    expect(cues.some((cue) => cue.type === 'rake')).toBe(false)
  })

  it('through two minutes of seeded play the saved world is always sound and always what the playground holds', () => {
    for (const seed of [1, 2, 3]) {
      const random = seeded(seed * 31)
      const game = new Game(freshWorld(seed === 3 ? 5 : null), seed)
      let next = 0, endings = 0, wasFinished = false
      for (let t = 0; t < 120; t += 1 / 60) {
        if (t >= next) {
          next = t + 0.2 + random() * 1.6
          const id = FRIEND_IDS[Math.floor(random() * 4)], roll = random()
          if (game.play.held) game.dragEnd()
          else if (roll < 0.6) tapOn(game, id)
          else if (roll < 0.8) {
            game.press({ kind: 'friend', id })
            game.dragStart()
            game.dragTo({ x: (random() - 0.5) * 11, z: (random() - 0.5) * 6 }, null)
          } else if (roll < 0.9) game.press({ kind: 'sand', x: (random() - 0.5) * 10, z: 2 })
          else game.press({ kind: random() < 0.5 ? 'rake' : 'plank', along: 2 } as never)
        }
        game.step(1 / 60, QUIET)
        game.takeCues()
        if (game.world.state.finished && !wasFinished) endings += 1
        wasFinished = game.world.state.finished
        expect(isSound(game.world.arrangement)).toBe(true)
        expect(isSound(game.play.arrangement)).toBe(true)
        const back = load(JSON.parse(JSON.stringify(game.saved())), null)
        // Between the deciding move and its ending, a load finds the ride ended, the next asker waiting.
        expect(back.arrangement).toEqual((rideIsOver(game.world) ? endRide(game.world) : game.world).arrangement)
        expect(back.arrangement.waiting !== null).toBe(back.state.finished)
        expect(rideIsOver(back)).toBe(false)
        // But for a showing that is due or playing, where everyone is where the showing opens or has them.
        if (!game.sceneRunning && !game.showingDue && !game.play.held) expect(game.play.arrangement).toEqual(game.world.arrangement)
      }
      // Rides were ridden on the way.
      expect(endings, `seed ${seed}`).toBeGreaterThan(0)
    }
  }, 60_000)
})

describe('nothing passes through anything', () => {
  // What the intersection audit cannot be sure to sample: every frame of a long, quick, seeded play, scenes and all.
  it('through two minutes of quick play nobody is ever inside the plank, under the sand, or through another friend', () => {
    for (const seed of [1, 2, 3, 5]) {
      const random = seeded(seed * 53)
      const game = new Game(freshWorld(seed % 2 ? null : 5), seed)
      let next = 0, deepestFriend = 0, where = '', deepest = 0, lowest = 0
      for (let t = 0; t < 120; t += 1 / 60) {
        if (t >= next) {
          next = t + 0.12 + random() * (seed === 5 ? 0.4 : 1.8)
          const id = FRIEND_IDS[Math.floor(random() * 4)], roll = random()
          if (game.play.held) game.dragEnd()
          else if (roll < 0.62) tapOn(game, id)
          else if (roll < 0.86) {
            game.press({ kind: 'friend', id })
            game.dragStart()
            game.dragTo({ x: (random() - 0.5) * 11, z: (random() - 0.5) * 6 }, null)
          } else game.press({ kind: 'plank', along: random() < 0.5 ? -2 : 2 })
        }
        game.step(1 / 60, QUIET)
        game.takeCues()
        const tilt = game.play.plank.tilt
        for (const id of FRIEND_IDS) {
          const body = game.play.bodies[id], pose = game.frame.poses[id]
          lowest = Math.min(lowest, pose.y)
          // Its middle over the board: its underside is on the board or above it.
          // The board's top where the friend is: a place `along` the board lies at `along` times the cosine of the tilt across the tray.
          if (Math.abs(pose.z - PLANK.z) < PLANK.halfWidth && Math.abs(pose.x) < PLANK.halfLength * Math.cos(tilt)) deepest = Math.max(deepest, plankTopAt(pose.x / Math.cos(tilt), tilt) - pose.y)
          // Two friends are held apart whenever either stands, sits, rides, is thrown or is carried. A friend in the
          // middle of a hop flies over whoever stood in its way when it left; two hopping at once are not compared.
          for (const other of FRIEND_IDS) {
            if (other >= id) continue
            // Two friends of one stack are held apart even while one is on its way there; two hopping to different places are not compared.
            const a = placeOf(game.play.arrangement, id), b = placeOf(game.play.arrangement, other)
            const oneStack = a.at === 'end' && b.at === 'end' && a.end === b.end
            if ((body.mode === 'hop' || game.play.bodies[other].mode === 'hop') && !oneStack) continue
            const deep = overlap(id, pose, other, game.frame.poses[other])
            if (deep > deepestFriend) {
              deepestFriend = deep
              const q = game.frame.poses[other]
              where = `${id} ${body.mode} ${JSON.stringify(placeOf(game.play.arrangement, id))} (${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}, ${pose.z.toFixed(2)}) lean ${pose.lean.toFixed(2)} squash ${pose.squash.toFixed(2)} in ${other} ${game.play.bodies[other].mode} ${JSON.stringify(placeOf(game.play.arrangement, other))} (${q.x.toFixed(2)}, ${q.y.toFixed(2)}, ${q.z.toFixed(2)}) lean ${q.lean.toFixed(2)} squash ${q.squash.toFixed(2)} at ${t.toFixed(2)} s`
            }
          }
        }
      }
      // Bo sinks a twentieth of a unit into the sand when he is set down in it, and sighs; nobody goes deeper.
      expect(lowest, `seed ${seed}: under the sand`).toBeGreaterThan(-0.07)
      expect(deepest, `seed ${seed}: into the plank`).toBeLessThan(0.06)
      // A friend sits on the very top of the one below, touching it. Measured on the shapes as drawn, nobody is ever
      // more than a tenth of a unit inside anybody (a rim pressed in for a moment as two sway out of step).
      expect(deepestFriend, `seed ${seed}: through a friend: ${where}`).toBeLessThan(0.1)
    }
  }, 120_000)
})

describe('one obvious want, and the friends as they are', () => {
  it('the asker looks along the plank to where it wants to go, and hops on the spot three times at most while the child is still', () => {
    const game = new Game(shown(), 1)
    const { cues } = run(game, ASK_AT[2] + 30)
    expect(game.play.bodies.pim.gazeTo).toBeGreaterThan(0.5)
    expect(game.play.bodies.pim.gazeUpTo).toBeGreaterThan(0.5)
    const voices = cues.filter((cue) => cue.type === 'voice').length
    expect(voices).toBe(ASK_AT.length)
    expect(game.world.state.finished).toBe(false)
  })

  it('Bo alone on the plank dozes and snores for as long as he is alone; a friend landing wakes him', () => {
    const world = shown()
    const game = new Game({ ...world, state: { ...world.state, finished: true }, arrangement: { ...layout(rideOf('big-asks', 0)), waiting: null } }, 1)
    // Free play on a finished scene, so nothing asks: only the snores are heard.
    const { cues } = run(game, 40)
    expect(game.play.bodies.bo.doze).toBeGreaterThan(0.95)
    // One snore every few seconds, the whole forty: about eleven, and it never runs away.
    const snores = cues.filter((cue) => cue.type === 'voice').length
    expect(snores).toBeGreaterThanOrEqual(Math.floor(36 / SNORE_EVERY))
    expect(snores).toBeLessThanOrEqual(Math.ceil(40 / SNORE_EVERY))
    tapOn(game, 'pim')
    run(game, 2)
    expect(game.play.bodies.bo.doze).toBeLessThan(0.2)
  })

  it('but the one who asks is wide awake: Bo, alone on the low end of his own ride, looks up along the plank and does not doze', () => {
    const world = shown()
    const game = new Game({ ...world, state: { ...world.state, position: 'big-asks' }, kind: 'big-asks', shown: ['big-asks'], arrangement: layout(rideOf('big-asks', 0)) }, 1)
    const { cues } = run(game, 12)
    expect(game.play.bodies.bo.doze).toBeLessThan(0.05)
    expect(game.play.asking).toMatchObject({ id: 'bo', up: 1 })
    expect(game.play.bodies.bo.gazeUpTo).toBeGreaterThan(0.5)
    // Two small hops in twelve still seconds, and no snore.
    expect(cues.filter((cue) => cue.type === 'voice').length).toBe(2)
  })

  it('Dot, left alone in the sand by the friend who stood beside it, draws one swirl, once', () => {
    const world = shown()
    const game = new Game(world, 1)
    // Carry Dot to the empty side of the tray, and Bo over to stand beside it: Dot warms.
    const carry = (id: FriendId, x: number, z: number) => {
      game.press({ kind: 'friend', id })
      game.dragStart()
      game.dragTo({ x, z }, null)
      run(game, 0.8)
      game.dragEnd()
      run(game, 3)
    }
    carry('dot', -2.8, 2.5)
    expect(game.play.bodies.dot.bright).toBeLessThan(0.1)
    carry('bo', -4.6, 2.4)
    expect(game.play.bodies.dot.bright).toBeGreaterThan(0.9)
    game.takeCues()
    // Then Bo is tapped away onto the plank, and Dot is left by itself.
    tapOn(game, 'bo')
    const { cues } = run(game, 20)
    expect(cues.filter((cue) => cue.type === 'swirl').length).toBe(1)
    expect(game.play.bodies.dot.bright).toBeLessThan(0.1)
    expect(rakeIsOut(game.world.marks)).toBe(true)
  })
})

describe('the small promises of the sheet', () => {
  /** A game in free play on a finished scene, with the arrangement given: nothing asks, so only what is tested is heard. */
  const free = (left: FriendId[], right: FriendId[]): Game => {
    const world = shown()
    let a = layout(rideOf('little-asks', 0))
    for (const id of FRIEND_IDS) a = putInSand(a, id, homeOn(id, 'right'))
    for (const id of left) a = putOnEnd(a, id, 'left')
    for (const id of right) a = putOnEnd(a, id, 'right')
    return new Game({ ...world, state: { ...world.state, finished: true }, arrangement: { ...a, waiting: null } }, 1)
  }
  const voices = (cues: Cue[]) => cues.filter((cue) => cue.type === 'voice').length

  it('a touched friend looks at the finger at once', () => {
    const game = free([], [])
    game.press({ kind: 'friend', id: 'mog' })
    run(game, 0.2)
    expect(game.frame.poses.mog.gazeY).toBeGreaterThan(0.7)
    run(game, 1.5)
    expect(game.frame.poses.mog.gazeY).toBeLessThan(0.6)
  })

  it('a plank that floats level hums for as long as it floats, everyone on it swaying, and stops when it no longer does', () => {
    const game = free(['mog'], ['dot'])
    const level = run(game, 10)
    expect(voices(level.cues)).toBeGreaterThanOrEqual(4)
    expect(Math.abs(game.play.plank.tilt)).toBeLessThan(0.05)
    tapOn(game, 'dot')
    run(game, 4)
    game.takeCues()
    // Mog alone now: no hum, and he is not Bo, so nothing is heard at all.
    expect(voices(run(game, 8).cues)).toBe(0)
  })

  it('a stack with Bo on top sways as one for as long as it stands, whoever is under him', () => {
    const game = free([], ['pim'])
    run(game, 0.5)
    tapOn(game, 'bo')
    run(game, 5)
    expect(game.play.arrangement.right).toEqual(['pim', 'bo'])
    let together = 0
    for (let i = 0; i < 360; i++) {
      game.step(1 / 60, QUIET)
      if (game.play.bodies.pim.act === 'sway' && game.play.bodies.bo.act === 'sway') together += 1
    }
    expect(together).toBeGreaterThan(180)
    // Bo under Pim is no such stack.
    const under = free([], ['bo'])
    run(under, 0.5)
    tapOn(under, 'pim')
    run(under, 6)
    expect(under.play.arrangement.right).toEqual(['bo', 'pim'])
    expect(under.play.bodies.bo.act).not.toBe('sway')
  })

  it('a tower of four sways for as long as it stands', () => {
    const game = free(['pim'], ['bo', 'mog', 'dot'])
    tapOn(game, 'pim')
    run(game, 0.3)
    game.press({ kind: 'friend', id: 'pim' })
    game.dragStart()
    game.dragTo({ x: 3, z: -1 }, null)
    run(game, 0.8)
    game.dragEnd()
    run(game, 6)
    expect(game.play.arrangement.right.length).toBe(4)
    let swaying = 0
    for (let i = 0; i < 240; i++) {
      game.step(1 / 60, QUIET)
      if (FRIEND_IDS.every((id) => game.play.bodies[id].act === 'sway')) swaying += 1
    }
    expect(swaying).toBeGreaterThan(120)
  })

  it('Bo set down on the low end digs it in: a bite under that end, and sand flies', () => {
    const game = free([], ['mog'])
    run(game, 0.5)
    game.takeCues()
    tapOn(game, 'bo')
    let flew = 0
    const cues: Cue[] = []
    for (let i = 0; i < 180; i++) {
      game.step(1 / 60, QUIET)
      cues.push(...game.takeCues())
      flew = Math.max(flew, game.grains.flying)
    }
    // The crater is deeper than the bite Mog's end had made alone: drawn and saved from the weight now on it.
    const bites = cues.filter((cue) => cue.type === 'bite').map((cue) => (cue.type === 'bite' ? cue.strength : 0))
    expect(Math.max(...bites)).toBeCloseTo((7 + 1) / (12 + 1), 5)
    expect(biteDepth(7)).toBeGreaterThan(biteDepth(3))
    expect(Math.max(...game.world.marks)).toBe(biteDepth(7))
    expect(flew).toBeGreaterThanOrEqual(20)
  })

  it('an end bites deeper the heavier it is, as drawn as well as saved, however fast it came down', () => {
    const drawn = (id: FriendId) => {
      const game = free([], [])
      run(game, 0.3)
      game.takeCues()
      tapOn(game, id)
      const bites = run(game, 4).cues.filter((cue) => cue.type === 'bite').map((cue) => (cue.type === 'bite' ? cue.strength : 0))
      expect(new Set(bites).size, id).toBe(1)
      return bites[0]
    }
    expect(drawn('pim')).toBeLessThan(drawn('mog'))
    expect(drawn('mog')).toBe(drawn('dot'))
    expect(drawn('mog')).toBeLessThan(drawn('bo'))
    // Every weight an end can carry is drawn apart from the next, though the saved grid keeps eight depths.
    expect(drawn('pim')).toBeCloseTo(3 / 13, 5)
    expect(drawn('bo')).toBeCloseTo(5 / 13, 5)
  })

  it('the friends still on the plank look after Dot when it is taken away', () => {
    const game = free(['pim'], ['dot'])
    run(game, 1)
    tapOn(game, 'dot')
    run(game, 0.5)
    // Dot is off to the right; Pim, on the left end, looks that way, level, and not at the sky.
    expect(game.play.bodies.pim.gazeTo).toBeGreaterThan(0.8)
    expect(game.play.bodies.pim.gazeUpTo).toBe(0)
    run(game, 3)
    expect(game.play.bodies.pim.gazeUpTo).toBeGreaterThan(0.8)
  })

  it('those Dot is set down beside in the sand turn to it and bounce, and look after it when it is taken away again', () => {
    const game = free([], [])
    run(game, 0.5)
    const mog = standsAt(game.play.arrangement, 'mog')
    game.press({ kind: 'friend', id: 'dot' })
    game.dragStart()
    game.dragTo({ x: mog.x - 1.6, z: mog.z + 0.2 }, null)
    run(game, 0.5)
    game.dragEnd()
    let greeted = 0, turned = 0
    for (let i = 0; i < 150; i++) {
      game.step(1 / 60, QUIET)
      if (game.play.bodies.mog.act === 'greet') {
        greeted += 1
        turned = Math.min(turned, game.frame.poses.mog.turn)
      }
    }
    expect(placeOf(game.play.arrangement, 'dot').at).toBe('sand')
    expect(greeted).toBeGreaterThan(20)
    // Dot is on his left: he turned that way.
    expect(turned).toBeLessThan(-0.4)
    expect(game.play.bodies.pim.act).not.toBe('greet')
    // Taken to the far side of the tray: Mog looks after it.
    game.press({ kind: 'friend', id: 'dot' })
    game.dragStart()
    game.dragTo({ x: -4, z: 1.5 }, null)
    run(game, 0.5)
    game.dragEnd()
    run(game, 0.6)
    expect(game.play.bodies.mog.gazeTo).toBeLessThan(-0.8)
    expect(game.play.bodies.mog.gazeUpTo).toBe(0)
  })

  it('Dot hums its soft note when a friend is set down beside it, as it does when it is set down beside a friend', () => {
    const game = free([], [])
    run(game, 0.5)
    game.takeCues()
    const dot = standsAt(game.play.arrangement, 'dot')
    expect(game.play.bodies.dot.bright).toBeLessThan(0.2)
    game.press({ kind: 'friend', id: 'pim' })
    game.dragStart()
    game.dragTo({ x: dot.x + 0.3, z: dot.z + 1.65 }, null)
    run(game, 0.5)
    game.dragEnd()
    const { cues } = run(game, 3)
    expect(companyOf(game.play.arrangement, 'dot')).toEqual(['pim'])
    const soft = JSON.stringify(softNote())
    expect(cues.filter((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === soft).length).toBe(1)
    expect(game.play.bodies.dot.bright).toBeGreaterThan(0.8)
    expect(cues.some((cue) => cue.type === 'swirl')).toBe(false)
  })

  it('Pim on a high end where nothing moves looks down at the sand and back at the sky, whoever is asking', () => {
    const game = free(['bo'], ['pim'])
    run(game, 1)
    const ups = new Set<number>()
    for (let i = 0; i < 300; i++) {
      game.step(1 / 60, QUIET)
      ups.add(game.play.bodies.pim.gazeUpTo)
    }
    expect([...ups].sort()).toEqual([-0.9, 0.9])
  })

  it('Dot tapped onto an empty plank warms to full colour as it goes, and pales again alone on the plank', () => {
    const game = free([], [])
    run(game, 1)
    expect(game.play.bodies.dot.bright).toBeLessThan(0.1)
    tapOn(game, 'dot')
    let brightest = 0
    for (let i = 0; i < 50; i++) {
      game.step(1 / 60, QUIET)
      brightest = Math.max(brightest, game.play.bodies.dot.bright)
    }
    expect(brightest).toBe(1)
    run(game, 4)
    expect(placeOf(game.play.arrangement, 'dot').at).toBe('end')
    expect(game.play.bodies.dot.bright).toBeLessThan(0.1)
  })

  it('each friend looks at what it always wants: Pim at the sky and the high end, Mog at the highest seat, Dot at whoever is on the plank, Bo up along the plank', () => {
    // Bo holds the right end down; the left end is up and empty.
    const game = free([], ['bo'])
    run(game, 2)
    const look = (id: FriendId) => ({ side: game.play.bodies[id].gazeTo, up: game.play.bodies[id].gazeUpTo })
    // Everyone else stands in the sand on the right, so the high end is to their left.
    expect(look('pim').up).toBeGreaterThan(0.8)
    expect(look('pim').side).toBeLessThan(-0.5)
    expect(look('mog').side).toBeLessThan(-0.5)
    expect(look('mog').up).toBeGreaterThan(0.4)
    expect(look('bo').side).toBeLessThan(-0.5)
    expect(look('bo').up).toBeGreaterThan(0.4)
    // Dot looks at Bo, the one on the plank.
    const dot = standsAt(game.play.arrangement, 'dot')
    expect(Math.sign(look('dot').side)).toBe(Math.sign(game.play.bodies.bo.x - dot.x))
    // No two of the four look the same way.
    expect(new Set(FRIEND_IDS.map((id) => `${look(id).side.toFixed(2)} ${look(id).up.toFixed(2)}`)).size).toBeGreaterThanOrEqual(3)
    // And a look can be seen: the body turns with it.
    expect(game.frame.poses.pim.turn).toBeLessThan(-0.2)
    // On the high perch himself, Mog has what he wants and looks about him.
    tapOn(game, 'mog')
    run(game, 0.2)
    const mog = free(['mog'], ['bo'])
    run(mog, 2)
    expect(mog.play.bodies.mog.gazeTo).toBe(0)
  })

  it('a friend thrown by the plank squeaks as it comes down again', () => {
    const game = free(['pim'], [])
    run(game, 0.5)
    tapOn(game, 'bo')
    run(game, 0.9)
    game.takeCues()
    // From here on: the knock, Pim's flight, and her landing with its thump and her own squeak.
    const { cues } = run(game, 3)
    expect(game.play.bodies.pim.mode).toBe('rest')
    expect(voices(cues)).toBeGreaterThanOrEqual(4)
  })
})

describe('a friend carried onto the picture of the plank', () => {
  it('lands on the plank where the child holds it, although it hangs over the sand in front; held clear of the plank it stands in the sand', () => {
    // Bo carried so that he is drawn on the right end: he hangs over the sand two units in front of the plank's line.
    const game = new Game({ ...shown(), touched: true }, 1)
    run(game, 0.2)
    game.press({ kind: 'friend', id: 'bo' })
    game.dragStart()
    game.dragTo({ x: 2.8, z: 1.0 }, null, { x: 2.9, z: -0.6 })
    run(game, 0.5)
    game.dragEnd()
    expect(placeOf(game.play.arrangement, 'bo')).toMatchObject({ at: 'end', end: 'right' })
    expect(game.world.moves).toBe(1)
    // Held over the middle of its picture, a friend slides to the low end.
    const slide = new Game({ ...shown(), touched: true }, 1)
    run(slide, 0.2)
    slide.press({ kind: 'friend', id: 'mog' })
    slide.dragStart()
    slide.dragTo({ x: 0.2, z: 1.2 }, null, { x: 0.2, z: -0.4 })
    run(slide, 0.5)
    slide.dragEnd()
    expect(run(slide, 0.1).cues.length).toBeGreaterThan(0)
    expect(placeOf(slide.play.arrangement, 'mog')).toMatchObject({ at: 'end', end: 'left', level: 1 })
    // Held in front of the plank, clear of its picture: it stands in the sand where it hung.
    const sand = new Game({ ...shown(), touched: true }, 1)
    run(sand, 0.2)
    sand.press({ kind: 'friend', id: 'bo' })
    sand.dragStart()
    sand.dragTo({ x: 2.8, z: 2.6 }, null, { x: 2.9, z: 1.2 })
    run(sand, 0.5)
    sand.dragEnd()
    expect(placeOf(sand.play.arrangement, 'bo').at).toBe('sand')
    // With no reading of the finger at all, the place it hangs over decides, as before.
    const plain = new Game({ ...shown(), touched: true }, 1)
    run(plain, 0.2)
    plain.press({ kind: 'friend', id: 'bo' })
    plain.dragStart()
    plain.dragTo({ x: 2.8, z: 1.0 }, null)
    run(plain, 0.5)
    plain.dragEnd()
    expect(placeOf(plain.play.arrangement, 'bo').at).toBe('sand')
  })
})

describe('what the child set going, put away before it has happened', () => {
  it('a friend in the air and the plank it will tip: their marks are in the saved sand at put-away, and a load finds them', () => {
    const game = new Game({ ...shown(), touched: true }, 1)
    run(game, 0.2)
    tapOn(game, 'bo')
    run(game, 0.3)
    expect(game.play.bodies.bo.mode).toBe('hop')
    const flying = game.saved().marks
    game.putAway()
    const parked = game.saved()
    expect(parked.marks).not.toBe(flying)
    expect(game.wantsSave).toBe('now')
    // Played on instead, the sand comes to the same.
    const played = new Game({ ...shown(), touched: true }, 1)
    run(played, 0.2)
    tapOn(played, 'bo')
    for (let i = 0; i < 900 && !played.sceneRunning; i++) played.step(1 / 60, QUIET)
    const live = marksFromText(played.saved().marks), kept = marksFromText(parked.marks)
    // Everything the put-away kept is in the sand of the game that played on (which has its ending's marks besides).
    for (let i = 0; i < kept.length; i++) expect(live[i]).toBeGreaterThanOrEqual(kept[i])
  })

  it('Dot left alone: put away before it has drawn its swirl, the swirl is in the saved sand; tapped away first, it draws none', () => {
    const left = () => {
      const game = new Game({ ...shown(), touched: true, state: { ...shown().state, finished: true }, arrangement: (() => {
        let a = layout(rideOf('little-asks', 0))
        for (const id of FRIEND_IDS) a = putInSand(a, id, homeOn(id, 'right'))
        const dot = standsAt(a, 'dot')
        return { ...putInSand(a, 'pim', { x: dot.x + 0.3, z: dot.z + 1.65 }), waiting: null }
      })() }, 1)
      run(game, 0.5)
      expect(companyOf(game.play.arrangement, 'dot')).toEqual(['pim'])
      tapOn(game, 'pim')
      run(game, 0.2)
      return game
    }
    // Put away before the swirl is drawn: it is saved.
    const away = left()
    const before = away.saved().marks
    away.putAway()
    expect(away.saved().marks).not.toBe(before)
    // Left to it, Dot draws it once, where it stands.
    const stays = left()
    const cues = run(stays, 2).cues.filter((cue) => cue.type === 'swirl')
    expect(cues.length).toBe(1)
    const dot = standsAt(stays.play.arrangement, 'dot')
    expect(cues[0]).toMatchObject({ x: dot.x, z: dot.z })
    // Tapped away before it has begun: no swirl anywhere, no scratch, and nothing marked where Dot never stood.
    const taken = left()
    const untouched = taken.saved().marks
    tapOn(taken, 'dot')
    const after = run(taken, 3).cues
    expect(after.some((cue) => cue.type === 'swirl')).toBe(false)
    const scratchy = JSON.stringify(scratch())
    expect(after.some((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === scratchy)).toBe(false)
    expect(taken.play.bodies.dot.act).not.toBe('spin')
    void untouched
  })

  it('a mark made while the rake travels is kept: the sand is drawn again from the saved grid when the rake arrives, and the rake lies out', () => {
    const game = new Game({ ...shown(), touched: true }, 1)
    run(game, 0.2)
    game.press({ kind: 'sand', x: -3, z: 2 })
    run(game, 0.2)
    game.press({ kind: 'rake' })
    run(game, 0.3)
    game.press({ kind: 'sand', x: 3, z: 2 })
    const { cues } = run(game, 2)
    expect(cues.filter((cue) => cue.type === 'raked').length).toBe(1)
    expect(rakeIsOut(game.world.marks)).toBe(true)
    expect(game.rakeOut).toBe(true)
  })
})

describe('the level plank hums for as long as it is level', () => {
  it('from the moment it is made level by play, every couple of seconds, with no long silence while it still sways', () => {
    const game = new Game({ ...shown(), touched: true }, 1)
    run(game, 0.2)
    // Pim sits on the left; Mog and then Dot make it three against... Mog against Dot is level once Pim is off.
    tapOn(game, 'pim')
    run(game, 2)
    tapOn(game, 'mog')
    run(game, 2)
    game.press({ kind: 'friend', id: 'dot' })
    game.dragStart()
    game.dragTo({ x: -PLANK.seat, z: PLANK.z }, null)
    run(game, 0.5)
    game.dragEnd()
    const hum = JSON.stringify(levelHum())
    const times: number[] = []
    for (let t = 0; t < 14; t += 1 / 60) {
      game.step(1 / 60, QUIET)
      if (game.takeCues().some((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === hum)) times.push(t)
    }
    expect(weightOnEnds(game)).toEqual([3, 3])
    expect(times.length).toBeGreaterThanOrEqual(5)
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeLessThan(2.5)
  })
})

describe('tastes hold on every landing, not only on one the child made', () => {
  it('a friend thrown by the plank that comes down on the head it sat on is hissed at by Mog, and Pim on top crows again', () => {
    // Pim sits on Mog on the left, Dot rides the right end high; Bo lands beside Dot, the right end comes down and both on the left fly.
    const bare = tap(layout(rideOf('little-asks', 0)), 'pim')
    const game = new Game({ ...shown(), arrangement: putOnEnd(putOnEnd(putOnEnd(bare, 'mog', 'left'), 'pim', 'left'), 'dot', 'right'), touched: true, state: { ...shown().state, finished: true } }, 1)
    run(game, 1)
    game.takeCues()
    tapOn(game, 'bo')
    const { cues } = run(game, 5)
    const heard = (voice: readonly Part[]) => cues.filter((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === JSON.stringify(voice)).length
    expect(heard(spit())).toBeGreaterThanOrEqual(1)
    expect(heard(crow())).toBeGreaterThanOrEqual(1)
  })

  it('Mog left on top of a stack when the friend above him goes purrs: the top of a stack is his high perch too', () => {
    const bare = tap(layout(rideOf('little-asks', 0)), 'pim')
    // Bo, Mog and Pim on the left, the low end: Mog is in the middle.
    const game = new Game({ ...shown(), arrangement: putOnEnd(putOnEnd(putOnEnd(bare, 'bo', 'left'), 'mog', 'left'), 'pim', 'left'), touched: true, state: { ...shown().state, finished: true } }, 1)
    run(game, 1)
    game.takeCues()
    tapOn(game, 'pim')
    const { cues } = run(game, 4)
    expect(cues.filter((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === JSON.stringify(purr())).length).toBe(1)
  })

  it('the level plank goes on humming while a friend from the sand is in the hand', () => {
    const bare = tap(layout(rideOf('little-asks', 0)), 'pim')
    const game = new Game({ ...shown(), arrangement: putOnEnd(putOnEnd(bare, 'mog', 'left'), 'dot', 'right'), touched: true, state: { ...shown().state, finished: true } }, 1)
    run(game, 3)
    game.press({ kind: 'friend', id: 'pim' })
    game.dragStart()
    game.dragTo({ x: -1, z: 2.5 }, null)
    const { cues } = run(game, 8)
    const hum = JSON.stringify(levelHum())
    expect(cues.filter((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === hum).length).toBeGreaterThanOrEqual(3)
    expect(game.play.held).toBe('pim')
  })
})

describe('the tilt follows the two totals and nothing else', () => {
  const made = (left: FriendId[], right: FriendId[]) => {
    const bare = tap(layout(rideOf('little-asks', 0)), 'pim')
    let a = bare
    for (const id of left) a = putOnEnd(a, id, 'left')
    for (const id of right) a = putOnEnd(a, id, 'right')
    return new Game({ ...shown(), arrangement: a, touched: true, state: { ...shown().state, finished: true } }, 1)
  }

  it('a friend too light to tip it never brings its end down: no knock, no bite, nobody thrown, and the plank creaks and stays', () => {
    for (const [low, lander] of [[['bo'], 'mog'], [['bo'], 'dot'], [['bo'], 'pim'], [['mog'], 'pim'], [['mog', 'dot'], 'bo'], [['pim', 'mog'], 'bo'], [['bo', 'pim'], 'mog']] as const) {
      const game = made([...low], [])
      run(game, 1)
      const marks = game.saved().marks
      game.takeCues()
      game.press({ kind: 'friend', id: lander })
      game.dragStart()
      game.dragTo({ x: PLANK.seat, z: PLANK.z }, null)
      run(game, 0.4)
      game.dragEnd()
      let furthest = -1
      const cues: Cue[] = []
      for (let i = 0; i < 300; i++) {
        game.step(1 / 60, QUIET)
        cues.push(...game.takeCues())
        furthest = Math.max(furthest, game.play.plank.tilt)
      }
      const label = `${low} against ${lander}`
      expect(placeOf(game.play.arrangement, lander), label).toMatchObject({ at: 'end', end: 'right' })
      // The light end stays well up: it never reaches level, let alone the sand.
      expect(furthest, label).toBeLessThan(-0.1)
      // Bo, high for once, chuckles and shakes the plank, which knocks the heavy end on the sand it lies in: that is his shake, not the landing.
      if (lander !== 'bo') {
        expect(cues.some((cue) => cue.type === 'bite'), label).toBe(false)
        expect(game.saved().marks, label).toBe(marks)
      }
      expect(game.play.plank.tilt, label).toBeLessThan(-MAX_TILT + 0.01)
    }
  })

  it('a friend who makes the two ends the same floats the plank: no end touches the sand, nobody is thrown, and it hums once it is afloat', () => {
    for (const [low, lander] of [[['mog'], 'dot'], [['dot'], 'mog'], [['pim', 'bo'], 'mog']] as const) {
      const game = made([...low], lander === 'mog' && low.length === 2 ? ['dot'] : [])
      run(game, 1)
      const marks = game.saved().marks
      game.takeCues()
      game.press({ kind: 'friend', id: lander })
      game.dragStart()
      game.dragTo({ x: PLANK.seat, z: PLANK.z }, null)
      run(game, 0.4)
      game.dragEnd()
      const hum = JSON.stringify(levelHum())
      let reach = 0, firstHum = -1, tiltAtHum = 9
      const cues: Cue[] = []
      for (let i = 0; i < 480; i++) {
        game.step(1 / 60, QUIET)
        const now = game.takeCues()
        cues.push(...now)
        reach = Math.max(reach, game.play.plank.tilt)
        if (firstHum < 0 && now.some((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === hum)) {
          firstHum = i / 60
          tiltAtHum = Math.abs(game.play.plank.tilt)
        }
      }
      const label = `${low} and ${lander}`
      expect(weightOnEnds(game)[0], label).toBe(weightOnEnds(game)[1])
      // The newcomer's end swings past level and back, and stays clear of the sand.
      expect(reach, label).toBeLessThan(MAX_TILT - 0.02)
      expect(cues.some((cue) => cue.type === 'bite'), label).toBe(false)
      expect(game.saved().marks, label).toBe(marks)
      expect(firstHum, label).toBeGreaterThan(0)
      expect(firstHum, label).toBeLessThan(3)
      expect(tiltAtHum, label).toBeLessThan(MAX_TILT * 0.7)
      expect(Math.abs(game.play.plank.tilt), label).toBeLessThan(0.05)
    }
  })

  it('a friend left on a head when the one between is taken away is answered by that head', () => {
    // Bo, Pim and Mog on the left: Pim is tapped away from between, and Mog comes down onto Bo... and Dot onto Mog.
    const game = made(['mog', 'pim', 'dot'], [])
    run(game, 1)
    game.takeCues()
    tapOn(game, 'pim')
    const { cues } = run(game, 3)
    expect(game.play.arrangement.left).toEqual(['mog', 'dot'])
    expect(cues.filter((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === JSON.stringify(spit())).length).toBe(1)
  })
})

describe('whoever the deciding move lifts', () => {
  it('says so before the ending begins: Bo lifted by a friend added to Pim\'s end at the ride where she is stuck high', () => {
    const world = freshWorld(null)
    const game = new Game({ ...world, state: { ...world.state, position: 'high-asks' }, kind: 'high-asks', turn: 0, arrangement: layout(rideOf('high-asks', 0)), shown: ['high-asks'], touched: true }, 1)
    run(game, 0.5)
    expect(placeOf(game.play.arrangement, 'bo').at).toBe('end')
    const pim = placeOf(game.play.arrangement, 'pim')
    expect(pim.at).toBe('end')
    // Mog and Dot onto Pim's end: eight against Bo's four, and he goes up.
    const chuckled: number[] = []
    let endingAt = -1
    const laugh = JSON.stringify(chuckle())
    let t = 0
    const play = (seconds: number) => {
      for (const end = t + seconds; t < end; t += 1 / 60) {
        game.step(1 / 60, QUIET)
        if (game.takeCues().some((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === laugh)) chuckled.push(t)
        if (endingAt < 0 && game.sceneRunning) endingAt = t
      }
    }
    tapOn(game, 'mog')
    play(1.5)
    tapOn(game, 'dot')
    play(10)
    expect(chuckled.length).toBe(1)
    expect(endingAt).toBeGreaterThan(chuckled[0])
    expect(game.world.state.finished).toBe(true)
  })
})

describe('a friend lifted from under others and put away', () => {
  it('goes back onto its end on top of them: the same friends on the same ends, no move counted, and the save says so', () => {
    const bare = tap(layout(rideOf('little-asks', 0)), 'pim')
    const game = new Game({ ...shown(), arrangement: putOnEnd(putOnEnd(bare, 'mog', 'left'), 'dot', 'left'), touched: true }, 1)
    run(game, 1)
    const moves = game.world.moves
    game.press({ kind: 'friend', id: 'mog' })
    game.dragStart()
    game.dragTo({ x: 2, z: 2 }, null)
    run(game, 1)
    // In the hand it is saved where it was picked up from.
    expect(game.saved().left).toEqual(['mog', 'dot'])
    game.putAway()
    expect(game.saved().left).toEqual(['dot', 'mog'])
    expect(game.world.moves).toBe(moves)
    run(game, 3)
    expect(game.play.arrangement).toEqual(game.world.arrangement)
    expect(game.play.bodies.mog.mode).toBe('rest')
    expect(save(load(JSON.parse(JSON.stringify(game.saved())), null)).left).toEqual(['dot', 'mog'])
  })
})

describe('a pointer the browser takes away mid-drag', () => {
  it('makes no move when it does not come back: the friend goes back to where it was picked up from', () => {
    const game = new Game({ ...shown(), touched: true }, 1)
    run(game, 0.2)
    const before = game.saved()
    game.press({ kind: 'friend', id: 'mog' })
    game.dragStart()
    game.dragTo({ x: PLANK.seat, z: PLANK.z }, null, { x: PLANK.seat, z: PLANK.z })
    run(game, 0.5)
    game.dragAbort()
    run(game, 4)
    expect(game.play.held).toBe(null)
    expect(game.world.moves).toBe(0)
    expect(game.sceneRunning).toBe(false)
    expect({ ...game.saved(), marks: before.marks }).toEqual(before)
  })
})

describe('a finger already down when a scene begins', () => {
  it('does nothing when it lifts or drags: nobody is moved inside the scene and no ride begins in it', () => {
    // Mog is sent to lift Pim, and a finger comes down on Dot before the plank has carried her up.
    const game = new Game({ ...shown(), touched: true }, 1)
    run(game, 0.2)
    tapOn(game, 'mog')
    run(game, 0.3)
    expect(game.sceneRunning).toBe(false)
    game.press({ kind: 'friend', id: 'dot' })
    for (let i = 0; i < 600 && !game.sceneRunning; i++) game.step(1 / 60, QUIET)
    expect(game.sceneRunning).toBe(true)
    const where = placeOf(game.play.arrangement, 'dot')
    game.tap()
    run(game, 0.2)
    expect(game.sceneRunning).toBe(true)
    expect(placeOf(game.play.arrangement, 'dot')).toEqual(where)
    // The same with the next asker under the finger, lifted or dragged.
    const next = new Game({ ...shown(), touched: true }, 1)
    run(next, 0.2)
    tapOn(next, 'mog')
    run(next, 0.3)
    next.press({ kind: 'friend', id: 'mog' })
    for (let i = 0; i < 600 && !next.sceneRunning; i++) next.step(1 / 60, QUIET)
    const kind = next.world.kind
    next.dragStart()
    next.dragTo({ x: 0, z: 2 }, null)
    next.dragEnd()
    next.tap()
    run(next, 0.2)
    expect(next.sceneRunning).toBe(true)
    expect(next.world.kind).toBe(kind)
    expect(next.world.state.finished).toBe(true)
    expect(next.play.held).toBe(null)
  })
})

describe('a showing opens with no jump', () => {
  const opening = (kind: Kind): World => {
    const world = freshWorld(null)
    return { ...world, state: { ...world.state, position: kind }, kind, turn: 0, arrangement: layout(rideOf(kind, 0)) }
  }
  const places = (game: Game) => FRIEND_IDS.map((id) => ({ ...game.frame.poses[id] })).map((pose) => [pose.x, pose.y, pose.z])
  const furthest = (a: number[][], b: number[][]) => Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1], p[2] - b[i][2])))

  it('on a first open the first frame already has everyone where the showing begins', () => {
    for (const kind of KINDS) {
      const game = new Game(opening(kind), 1)
      const tilt = game.play.plank.tilt
      const first = places(game)
      game.step(1 / 60, QUIET)
      expect(game.sceneRunning, kind).toBe(true)
      expect(furthest(first, places(game)), kind).toBeLessThan(0.12)
      expect(Math.abs(game.play.plank.tilt - tilt), kind).toBeLessThan(0.02)
    }
  })

  it('when a touch on the waiting friend lays the ride out, everyone hops to where the showing begins, and nobody jumps when it does', () => {
    let ran = 0
    for (const kind of ['little-asks', 'high-asks'] as const) {
      // A finished ride whose next is `kind`, not yet shown.
      const before = KINDS[(KINDS.indexOf(kind) + KINDS.length - 1) % KINDS.length]
      let world: World = { ...opening(before), shown: KINDS.filter((k) => k !== kind), touched: true }
      world = { ...world, state: { ...world.state, position: kind } }
      const ended = endRide({ ...world, arrangement: layout(rideOf(before, 0)) })
      const next = { ...ended, state: { ...ended.state, position: kind } }
      const game = new Game(next, 1)
      run(game, 0.3)
      tapOn(game, game.play.arrangement.waiting!)
      expect(game.world.kind, kind).toBe(kind)
      expect(game.showingDue, kind).toBe(true)
      ran += 1
      let last = places(game), jump = 0, began = false
      for (let i = 0; i < 900 && !(began && !game.sceneRunning); i++) {
        game.step(1 / 60, QUIET)
        const now = places(game)
        jump = Math.max(jump, furthest(last, now))
        last = now
        began = began || game.sceneRunning
      }
      expect(began, kind).toBe(true)
      // The fastest thing in the tray moves well under half a unit in a frame; a jump would be units.
      expect(jump, kind).toBeLessThan(0.45)
      expect(game.play.arrangement, kind).toEqual(game.world.arrangement)
    }
    expect(ran).toBe(2)
  })

  it('a touch before a due showing has begun sends everyone to where the ride itself has them', () => {
    const game = new Game(opening('high-asks'), 1)
    expect(game.showingDue).toBe(true)
    expect(placeOf(game.play.arrangement, 'bo').at).toBe('sand')
    game.press({ kind: 'sand', x: 0, z: 2.5 })
    game.pressEnd()
    expect(game.showingDue).toBe(false)
    run(game, 4)
    expect(game.sceneRunning).toBe(false)
    expect(game.play.arrangement).toEqual(game.world.arrangement)
    expect(placeOf(game.play.arrangement, 'bo').at).toBe('end')
  })
})

describe('a double tap on the friend who waits', () => {
  it('begins the ride once: the second tap does not take the asker off again, and the asker taken off later is the one the idle ladder shows', () => {
    const game = lifting()
    run(game, 9)
    const waiting = game.play.arrangement.waiting!
    tapOn(game, waiting)
    run(game, 0.15)
    tapOn(game, waiting)
    run(game, 5)
    expect(game.world.state.finished).toBe(false)
    expect(game.ride.asker).toBe(waiting)
    expect(placeOf(game.play.arrangement, waiting).at).toBe('end')
    expect(game.world.moves).toBe(0)
    // Taken off on purpose, well after: the ladder shows the asker, to be tapped back on.
    run(game, 3)
    tapOn(game, waiting)
    run(game, 3)
    expect(placeOf(game.play.arrangement, waiting).at).toBe('sand')
    game.step(1 / 60, { glow: 1, demo: 0.5, demoIndex: 0 })
    expect(game.guide.on).toBe(waiting)
  })
})

describe('a second tap during the ending', () => {
  it('on the friend who lifted the asker and asks next only ends the scene: the next ride waits for a touch at the waiting place', () => {
    const game = lifting()
    run(game, 1)
    expect(game.sceneRunning).toBe(true)
    const kind = game.world.kind
    // Mog still sits on the plank where the child put him; he is the one who asks next.
    expect(game.world.arrangement.waiting).toBe('mog')
    expect(placeOf(game.play.arrangement, 'mog').at).toBe('end')
    tapOn(game, 'mog')
    run(game, 0.1)
    expect(game.sceneRunning).toBe(false)
    expect(game.world.state.finished).toBe(true)
    expect(game.world.kind).toBe(kind)
    expect(game.world.arrangement.waiting).toBe('mog')
    // And dragging from that same touch carries nobody and begins nothing.
    const drag = lifting()
    run(drag, 1)
    drag.press({ kind: 'friend', id: 'mog' })
    drag.dragStart()
    drag.dragTo({ x: 0, z: 2 }, null)
    drag.dragEnd()
    run(drag, 0.1)
    expect(drag.world.state.finished).toBe(true)
    expect(drag.play.held).toBe(null)
    // Once he waits in front of the stone, a tap on him there begins the next ride.
    run(game, 3)
    tapOn(game, 'mog')
    run(game, 0.1)
    expect(game.world.state.finished).toBe(false)
  })
})

describe('a ride put away before its ending has begun', () => {
  it('opens ended and quiet: no scene starts by itself, the asker is up and the next asker waits to be touched', () => {
    const game = new Game({ ...shown(), touched: true }, 1)
    run(game, 0.2)
    tapOn(game, 'mog')
    // Mog is still in the air: the ride is decided and its ending has not begun.
    run(game, 0.2)
    expect(game.sceneRunning).toBe(false)
    expect(game.world.state.finished).toBe(false)
    const opened = new Game(load(JSON.parse(JSON.stringify(game.saved())), null), 1)
    const { cues } = run(opened, 8)
    expect(opened.world.state.finished).toBe(true)
    expect(cues.filter((cue) => cue.type === 'voice').length).toBe(0)
    expect(opened.play.arrangement.waiting).not.toBe(null)
    expect(placeOf(opened.play.arrangement, 'pim').at).toBe('end')
    // The waiting friend begins the next ride when it is touched, as after any ending.
    tapOn(opened, opened.play.arrangement.waiting!)
    run(opened, 0.1)
    expect(opened.world.state.finished).toBe(false)
  })
})

describe('tastes, every time', () => {
  it('Mog thrown up by the plank and down again on the high end purrs and blinks slowly, and Bo lifted by the others chuckles', () => {
    // Mog alone on the left end; Bo sent to the right end slams it down and throws him.
    const bare = tap(layout(rideOf('little-asks', 0)), 'pim')
    expect(bare.left.length + bare.right.length).toBe(0)
    let arrangement = putOnEnd(bare, 'mog', 'left')
    const game = new Game({ ...shown(), arrangement, touched: true }, 1)
    run(game, 0.5)
    tapOn(game, 'bo')
    const heard = (cues: Cue[], voice: readonly Part[]) => cues.filter((cue) => cue.type === 'voice' && JSON.stringify(cue.parts) === JSON.stringify(voice)).length
    const thrown = run(game, 5).cues
    expect(heard(thrown, purr())).toBe(1)
    // Bo alone on the right end; Pim's end already holds Mog, and Dot sent there lifts him.
    arrangement = putOnEnd(putOnEnd(bare, 'bo', 'right'), 'mog', 'left')
    const lift = new Game({ ...shown(), arrangement, touched: true }, 1)
    run(lift, 0.5)
    lift.press({ kind: 'friend', id: 'dot' })
    lift.dragStart()
    lift.dragTo({ x: -PLANK.seat, z: PLANK.z }, null)
    run(lift, 0.4)
    lift.dragEnd()
    expect(heard(run(lift, 5).cues, chuckle())).toBe(1)
  })
})

describe('the rake', () => {
  it('is not on screen before the child has touched anything, though the first showing has marked the sand', () => {
    const game = new Game(freshWorld(null), 1)
    run(game, 8)
    expect(game.sceneRunning).toBe(false)
    expect(rakeIsOut(game.world.marks)).toBe(true)
    expect(game.rakeOut).toBe(false)
    expect(game.saved().touched).toBe(false)
    // Found as left before any touch: still no rake.
    const again = new Game(load(JSON.parse(JSON.stringify(game.saved())), null), 1)
    run(again, 1)
    expect(again.rakeOut).toBe(false)
    // The first touch of anything brings it in, and it is saved that the child has touched.
    game.press({ kind: 'friend', id: 'bo' })
    game.pressEnd()
    const { saves } = run(game, 0.1)
    expect(game.rakeOut).toBe(true)
    expect(saves.some((entry) => entry.saved.touched)).toBe(true)
    const later = new Game(load(JSON.parse(JSON.stringify(game.saved())), null), 1)
    expect(later.rakeOut).toBe(true)
  })

  it('lies out only while the sand holds a mark; drawn across, it leaves even lines, moves no friend and ends nothing', () => {
    const game = new Game(shown(), 1)
    expect(game.rakeOut).toBe(false)
    game.press({ kind: 'rake' })
    expect(run(game, 0.2).cues.some((cue) => cue.type === 'rake')).toBe(false)
    game.press({ kind: 'sand', x: -3, z: 2 })
    run(game, 0.2)
    expect(game.rakeOut).toBe(true)
    const before = JSON.stringify(game.world.arrangement)
    game.press({ kind: 'rake' })
    const { cues } = run(game, 2)
    expect(cues.filter((cue) => cue.type === 'rake').length).toBe(1)
    expect(game.world.marks.every((cell) => cell === RAKED)).toBe(true)
    expect(game.rakeOut).toBe(false)
    expect(JSON.stringify(game.world.arrangement)).toBe(before)
    expect(game.world.state.finished).toBe(false)
  })
})

describe('the idle ladder', () => {
  const idle = (demoIndex: number, demo: number | null = 0.4): Guidance => ({ glow: 1, demo, demoIndex })

  it('during a ride shows a friend standing in the sand, taken in turn, and never the asker', () => {
    const game = new Game(shown(), 1)
    const seen = new Set<string | null>()
    for (const index of [0, 1, 2]) {
      game.step(1 / 60, idle(index))
      seen.add(game.guide.on)
      expect(game.guide.hand).toBe(0.4)
    }
    expect(seen.has('pim')).toBe(false)
    expect(seen.has(null)).toBe(false)
    expect(seen.size).toBe(3)
  })

  it('after a ride shows the friend who waits, and shows nothing while a scene plays', () => {
    const game = lifting()
    game.step(1 / 60, idle(0))
    expect(game.guide.on).toBe(null)
    expect(game.guide.glow).toBe(0)
    run(game, NEXT_AT + 3)
    game.step(1 / 60, idle(0))
    expect(game.guide.on).toBe('mog')
  })

  it('goes dark the moment the ladder does', () => {
    const game = new Game(shown(), 1)
    game.step(1 / 60, idle(0))
    game.step(1 / 60, QUIET)
    expect(game.guide).toEqual({ on: null, glow: 0, hand: null })
  })
})
