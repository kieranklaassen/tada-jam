import { describe, expect, it } from 'vitest'
import { isSound, placeOf, standsAt } from './arrangement'
import { ASK_AT, Game, SNORES, type Cue } from './game'
import type { Guidance } from './guidance'
import { RAKED, marksToText, rakeIsOut } from './marks'
import { overlap } from './overlap'
import { seeded } from './motion'
import { KINDS, layout, rideOf, wantMet, type Kind } from './rides'
import { freshWorld, load, save, type Saved, type World } from './save'
import { NEXT_AT } from './scenes'
import { FRIEND_IDS, MAX_TILT, PLANK, WAITING_PLACE, plankTopAt, type FriendId } from './world'

const QUIET: Guidance = { glow: 0, demo: null, demoIndex: -1 }

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
        expect(back.arrangement).toEqual(game.world.arrangement)
        expect(back.arrangement.waiting !== null).toBe(back.state.finished)
        if (!game.sceneRunning && !game.play.held) expect(game.play.arrangement).toEqual(game.world.arrangement)
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
          if (Math.abs(pose.z - PLANK.z) < PLANK.halfWidth && Math.abs(pose.x) < PLANK.halfLength) deepest = Math.max(deepest, plankTopAt(pose.x, tilt) - pose.y)
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

  it('Bo alone on the plank dozes and snores a few times, then sleeps quietly; a friend landing wakes him', () => {
    const world = shown()
    const game = new Game({ ...world, state: { ...world.state, finished: true }, arrangement: { ...layout(rideOf('big-asks', 0)), waiting: null } }, 1)
    // Free play on a finished scene, so nothing asks: only the snores are heard.
    const { cues } = run(game, 40)
    expect(game.play.bodies.bo.doze).toBeGreaterThan(0.95)
    expect(cues.filter((cue) => cue.type === 'voice').length).toBe(SNORES)
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

  it('Dot, left alone in the sand by the friend who stood beside it, draws one ring, once', () => {
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
    expect(cues.filter((cue) => cue.type === 'ring').length).toBe(1)
    expect(game.play.bodies.dot.bright).toBeLessThan(0.1)
    expect(rakeIsOut(game.world.marks)).toBe(true)
  })
})

describe('the rake', () => {
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
