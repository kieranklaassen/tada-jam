import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { BALL_R, BELL, BUMPER, BUMPER_SHAPE, FIELD, PLACES, TOYS, boxesCross, brickBox } from './layout'
import { below, makeRng } from './rng'
import { deserialize, freshSave, serialize, stands } from './save'
import { STEP, Table, UNDER_WALL } from './table'
import { layWall } from './walls'

// Nothing passes through anything: a child who plays at random, for minutes,
// on every wall of the ladder, and at every step of the ball the same things
// are held. A canvas game has no scene graph to audit, so this is the audit.

const near = (x: number, y: number, box: { x: number; y: number; w: number; h: number }) => Math.hypot(x - Math.max(box.x, Math.min(box.x + box.w, x)), y - Math.max(box.y, Math.min(box.y + box.h, y)))

/** What must hold after every step. Returns what is wrong, or nothing. */
function wrong(t: Table): string | null {
  const ball = t.ball
  for (let a = 0; a < PLACES; a++) {
    if (!t.solid(a)) continue
    const box = t.boxOf(a)
    if (box.x < FIELD.left || box.x + box.w > FIELD.right || box.y < FIELD.roof) return `brick ${a} is outside the field`
    for (let b = a + 1; b < PLACES; b++) if (t.solid(b) && boxesCross(box, t.boxOf(b), 0.5)) return `bricks ${a} and ${b} cross`
    if (ball.state === 'flying' && near(ball.x, ball.y, box) < BALL_R - 1.5) return `the ball is inside brick ${a}`
  }
  if (t.bumperX < BUMPER.minX - 0.01 || t.bumperX > BUMPER.maxX + 0.01) return 'the bumper is outside the rails'
  if (ball.state === 'resting' || ball.state === 'caught') {
    if (Math.abs(ball.x - t.bumperX) > BUMPER.half + 0.01 || Math.abs(ball.y - (BUMPER.top - BALL_R)) > 0.01) return 'a ball at rest is off the bumper'
    return null
  }
  if (ball.state !== 'flying') return null
  if (ball.x < FIELD.left + BALL_R - 0.5 || ball.x > FIELD.right - BALL_R + 0.5) return 'the ball is through a rail'
  if (ball.y < FIELD.roof + BALL_R - 0.5 || ball.y > FIELD.floor - BALL_R + 0.5) return 'the ball is through the roof or the floor'
  if (Math.hypot(ball.x - BELL.x, ball.y - BELL.y) < BALL_R + BELL.r - 1.5) return 'the ball is inside the bell'
  // The bumper, in the shape it is drawn with: its top takes the ball, which then rests; the round end of its cap
  // and the stem under it put a low ball beside them.
  const stem = { x: t.bumperX - BUMPER_SHAPE.stemHalf, y: BUMPER.top + BUMPER_SHAPE.capH, w: BUMPER_SHAPE.stemHalf * 2, h: FIELD.floor - BUMPER.top - BUMPER_SHAPE.capH }
  if (near(ball.x, ball.y, stem) < BALL_R - 2) return 'the ball is inside the stem of the bumper'
  const round = BUMPER_SHAPE.capRound
  const cap = { x: t.bumperX - BUMPER.half + round, y: BUMPER.top + round, w: (BUMPER.half - round) * 2, h: BUMPER_SHAPE.capH - round * 2 }
  if (ball.y > BUMPER.top - 3 && near(ball.x, ball.y, cap) - round < BALL_R - 2) return 'the ball is inside the cap of the bumper'
  return null
}

describe('nothing passes through anything', () => {
  it.each(LADDER.flatMap((position) => [1, 2, 3].map((seed) => [position, seed] as const)))('%s, child %i: forty seconds of play at random', { timeout: 20000 }, (position, seed) => {
    const rng = makeRng(seed * 7919)
    const t = new Table({ ...freshSave(null), position, wall: layWall(position, seed), shown: seed === 1 ? [] : ['hot-gate', 'wet-gate'] }, seed)
    let held = false, next = 0, aloft = 0
    const steps = Math.round(40 / STEP)
    for (let step = 0; step < steps; step++) {
      const now = step * STEP
      if (now >= next) {
        next = now + 0.05 + rng.next() * 0.5
        const what = below(rng, 12)
        if (held) {
          // A child who holds the bumper follows the ball with it, more or less, and lets go.
          if (what < 7) t.slide(t.ball.x + (rng.next() - 0.5) * 150)
          else if (what === 11) { t.takenAway(); held = false }
          else { t.lift(); held = false }
        } else if (what < 8) held = t.press(FIELD.left + rng.next() * (FIELD.right - FIELD.left), 500 + rng.next() * 300) === 'bumper'
        else if (what === 8) { t.press(BELL.x, BELL.y); t.lift() }
        else if (what === 9) { const box = brickBox(below(rng, PLACES)); t.press(box.x + 20, box.y + 20); t.lift() }
        else if (what === 10) { const toy = [TOYS.dragon, TOYS.walrus, TOYS.elephant][below(rng, 3)]; t.press(toy.x + 100, toy.y + 150); t.lift() }
        else { t.press(1150, 30, true); t.lift() }
      }
      t.step(STEP)
      t.sounds = []
      const fault = wrong(t)
      if (fault) throw new Error(`${fault}, ${now.toFixed(2)} s in: ball ${t.ball.state} at ${t.ball.x.toFixed(1)}, ${t.ball.y.toFixed(1)}, the ${t.kind} ball`)
      // No ball hangs in the wall: one that is in the air comes down past the tray.
      aloft = t.ball.state === 'flying' && t.ball.y < UNDER_WALL + 60 ? aloft + STEP : 0
      if (aloft > 12) throw new Error(`the ball has been up in the wall for twelve seconds, ${now.toFixed(2)} s in, at ${t.ball.x.toFixed(1)}, ${t.ball.y.toFixed(1)}`)
    }
    // And whenever it is put away, what is found is what the save sets up.
    const parked = t.settled(), loaded = new Table(deserialize(JSON.parse(JSON.stringify(serialize(t.toSave()))), null, 5), 5)
    expect(serialize(parked.toSave())).toEqual(serialize(loaded.toSave()))
    expect(parked.wall.map((brick) => stands(brick))).toEqual(loaded.wall.map((brick) => stands(brick)))
    expect(parked.ball.state).toBe('resting')
    expect(parked.busy).toBe(false)
  })
})
