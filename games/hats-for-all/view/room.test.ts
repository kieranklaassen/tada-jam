import { describe, expect, it } from 'vitest'
import { Game, type Target } from '../game'
import { BALLOON, BLOCKS_Z } from '../props'
import { serialize, type Saved } from '../save'
import { BEADS, BEAD_FACE_Z, balloonCentre, cloudCentre, roomUnder } from './room'
import { FoamStage } from './stage3d'

// The room behind the mat answers a finger where the finger is (ART.md, "What
// is in the frame"): a block of the low wall gives, a bead of the string
// swells and sounds its own note, the cloud dips, the balloon swells and
// swings, and the bare wall and the window board dent. None of it changes
// anything in the world, and the floor still answers as it does anywhere.

const saved: Saved = {
  v: 1, position: 'spare-hat', finished: true, seed: 5, shown: true,
  crew: [{ kind: 'bop', spot: 1, hats: [0] }, { kind: 'lanky', spot: 3, hats: [1] }], tile: ['cone', 'dome'], loose: [], changes: [], guest: null, leaver: null, slips: 0,
}

function scene(): { game: Game; stage: FoamStage } {
  const game = new Game(saved), stage = new FoamStage()
  stage.resize(1180, 820)
  game.step(1 / 60)
  stage.update(game.play, null)
  return { game, stage }
}

describe('what of the room lies under a ray', () => {
  // Straight on, from in front of the room, at a point of its front or of its wall.
  const straightAt = (x: number, y: number, time = 0) => roomUnder(x, y, 10, 0, 0, -1, time)

  it('is a bead where a bead is, by its place along the string, and the wall beside it', () => {
    BEADS.forEach((bead, n) => {
      const hit = straightAt(bead.x, bead.y)
      expect(hit?.what, `bead ${n}`).toBe('bead')
      expect(hit?.n).toBe(n)
      expect(hit?.z).toBeGreaterThan(BEAD_FACE_Z)
    })
    expect(straightAt(BEADS[0].x, BEADS[0].y - 1.2)?.what).toBe('wall')
  })

  it('is a block where a block stands, the cloud and the balloon where they are at that time, and the board round the pane', () => {
    const block = straightAt(-10, 1)
    expect(block?.what).toBe('block')
    expect(block!.z).toBeGreaterThan(BLOCKS_Z + 0.45)
    expect(straightAt(-10, 1)?.n).not.toBe(straightAt(9, 1)?.n)
    for (const time of [0, 7, 20, 41]) {
      const cloud = cloudCentre(time)
      expect(straightAt(cloud.x, cloud.y, time)?.what, `cloud at ${time}`).toBe('cloud')
    }
    const rising = BALLOON.takes * 0.6, balloon = balloonCentre(rising)!
    expect(straightAt(balloon.x, balloon.y, rising)?.what).toBe('balloon')
    expect(balloonCentre(BALLOON.takes + 1)).toBe(null)
    expect(straightAt(balloon.x, balloon.y, BALLOON.takes + 1)?.what).not.toBe('balloon')
    // The board's own rim, beside the pane.
    expect(straightAt(-0.5 - 2.9, 0.5)?.what).toBe('wall')
  })
})

describe('a finger on the room', () => {
  it('finds it from the glass: a tap high on the wall is on a bead or the wall, and one on the mat is only the floor', () => {
    const { game, stage } = scene()
    let beads = 0
    for (let x = 120; x <= 1060; x += 4) {
      const under = stage.pick(x, 22, game.play)
      expect(under.type).toBe('floor')
      if (under.type === 'floor') {
        expect(['bead', 'wall']).toContain(under.room?.what)
        if (under.room?.what === 'bead') beads++
      }
    }
    expect(beads).toBeGreaterThan(40)
    const onMat = stage.pick(600, 790, game.play)
    expect(onMat.type === 'floor' && onMat.room === undefined).toBe(true)
    // The grown-up's corner is the bare floor and nothing of the room.
    const corner = stage.floorAt(1170, 10)
    expect(corner.type === 'floor' && corner.room === undefined).toBe(true)
  })

  it('is answered where it is, with the floor\'s own squeak as well, and changes nothing', () => {
    const touches: [Target & { type: 'floor' }, string[]][] = [
      [{ type: 'floor', x: 0, z: -5.9, room: { what: 'bead', x: 1, y: 4.2, z: -9.4, n: 3 } }, ['squeak', 'tink']],
      [{ type: 'floor', x: 0, z: -5.9, room: { what: 'balloon', x: -1.8, y: 2, z: -7.6, n: 0 } }, ['squeak', 'bwip']],
      [{ type: 'floor', x: 0, z: -5.9, room: { what: 'cloud', x: 0, y: 2.4, z: -7.5, n: 0 } }, ['squeak', 'pff']],
      [{ type: 'floor', x: 0, z: -5.9, room: { what: 'block', x: -10, y: 1, z: -7.2, n: 2 } }, ['squeak']],
      [{ type: 'floor', x: 0, z: -5.9, room: { what: 'wall', x: 3, y: 4, z: -9.5, n: 0 } }, ['squeak']],
    ]
    for (const [touch, sounds] of touches) {
      const game = new Game(saved), before = serialize(game.saved)
      game.press(touch)
      expect(game.play.cues.map((cue) => cue.name)).toEqual(sounds)
      expect(game.play.marks).toHaveLength(1)
      expect(game.play.marks[0]).toMatchObject(touch.room!)
      game.tap()
      let cloud = 0, balloon = 0
      for (let frame = 0; frame < 30; frame++) { game.step(1 / 60); cloud = Math.max(cloud, Math.abs(game.play.cloud.x)); balloon = Math.max(balloon, Math.abs(game.play.balloon.x)) }
      expect(cloud > 0.05).toBe(touch.room!.what === 'cloud')
      expect(balloon > 0.05).toBe(touch.room!.what === 'balloon')
      for (let frame = 0; frame < 240; frame++) game.step(1 / 60)
      expect(game.play.marks).toEqual([])
      expect(Math.abs(game.play.cloud.x) + Math.abs(game.play.balloon.x)).toBeLessThan(0.02)
      expect(serialize(game.saved)).toEqual(before)
    }
  })

  it('never holds more marks than the stage can draw, however fast the wall is drummed', () => {
    const game = new Game(saved)
    for (let n = 0; n < 30; n++) { game.press({ type: 'floor', x: 0, z: -5.9, room: { what: 'bead', x: n, y: 4, z: -9.4, n } }); game.tap() }
    expect(game.play.marks.length).toBeLessThanOrEqual(6)
  })
})
