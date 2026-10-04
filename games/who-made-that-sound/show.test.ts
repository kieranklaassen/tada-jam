import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { FIRST_SEED, stir } from './layout'
import { whatIsAt } from './picture'
import { callSound, direct, finalSpot } from './plays'
import { deserializeWorld, serializeWorld } from './save'
import { Show, poseOf } from './show'
import { STAGE } from './stage'
import { type Action, type World, act, freshWorld } from './world'

const VIEW = { x: 0, y: 0, w: STAGE.width, h: STAGE.height }
const FRAME = 1 / 60

/** A world and its show played together, as the Mount plays them: a touch ends the play, then the tap is answered. */
function playing(world: World = freshWorld(null)) {
  const game = { world, show: new Show(world, VIEW), saved: 0 }
  return {
    game,
    tap(action: Action) {
      game.show.finish()
      const before = game.world, step = act(before, action)
      game.world = step.world
      game.show.retarget(game.world, VIEW)
      const play = direct(step.happened, action, before, game.world, VIEW, 0)
      if (play) game.show.start(play, () => { game.saved += 1 })
      return step.happened
    },
    wait(seconds: number) { for (let t = 0; t < seconds; t += FRAME) game.show.step(FRAME) },
  }
}

/** A seeded tap that mostly goes for the right spot, so a game gets through whole cycles. */
function seededTap(world: World, rng: number): Action {
  const roll = rng % 100, spot = (rng >>> 8) % 4, cycle = world.cycle
  const right = cycle && !world.finished && cycle.asker !== null ? cycle.kinds.findIndex((kind, at) => kind === cycle.asker && cycle.slots[at] !== 'done') : spot
  return roll < 40 ? { type: 'slot', slot: right } : roll < 60 ? { type: 'slot', slot: spot } : roll < 82 ? { type: 'edge' } : roll < 90 ? { type: 'asker' } : { type: 'basket' }
}

describe('found as left', () => {
  it('settles, after any game from any place, into exactly the picture a fresh load of the saved world gives', () => {
    for (const [n, place] of LADDER.entries()) {
      const { game, tap, wait } = playing(freshWorld(null, stir(FIRST_SEED, n), place))
      let rng = stir(FIRST_SEED, 70 + n)
      for (let i = 0; i < 90; i++) {
        rng = stir(rng, i)
        tap(seededTap(game.world, rng))
        wait(((rng >>> 4) % 9) * 0.21)
        if (i % 15 !== 14) continue
        // Left alone until the play is over, the page is the page a load would show.
        wait(27)
        expect(game.show.playing).toBe(false)
        expect(game.show.moving).toBe(false)
        const loaded = deserializeWorld(JSON.parse(JSON.stringify(serializeWorld(game.world))), null)
        expect(game.show.still()).toEqual(new Show(loaded, VIEW).still())
      }
    }
  })

  it('lands everything at once when a touch ends a play: the page is then the saved world, in the middle of any scene', () => {
    const { game, tap, wait } = playing()
    let rng = stir(FIRST_SEED, 3)
    for (let i = 0; i < 120; i++) {
      rng = stir(rng, i)
      tap(seededTap(game.world, rng))
      wait(((rng >>> 4) % 5) * 0.3)
      game.show.finish()
      // Lids and a row that makes room still ease; everything a play moves is where it belongs.
      wait(1.5)
      expect(game.show.still()).toEqual(new Show(game.world, VIEW).still())
    }
  })

  it('saves the outcome of a play before anything of it is shown, once', () => {
    const { game, tap } = playing()
    tap({ type: 'edge' })
    expect(game.saved).toBe(1)
    expect(game.show.playing).toBe(true)
    // At the first instant of the play the world already holds its end: the pair that shows is on the hill, the asker at the stone.
    expect(game.world.hill).toHaveLength(1)
    expect(game.world.cycle!.asker).not.toBeNull()
    expect(game.show.progress.every((progress) => progress === 0)).toBe(true)
  })

  it('builds a saved world standing still: nothing eases in and no scene plays again', () => {
    const { game, tap, wait } = playing()
    tap({ type: 'edge' }); wait(0.5)
    tap({ type: 'slot', slot: 0 })
    const show = new Show(game.world, VIEW), before = show.still()
    expect(show.playing).toBe(false)
    expect(show.moving).toBe(false)
    for (let i = 0; i < 120; i++) show.step(FRAME)
    expect(show.still()).toEqual(before)
    expect(show.due(60)).toEqual([])
  })
})

describe('a play on stage', () => {
  it('has every cast member where it was sent when the play is over, and where it started before it has begun', () => {
    const { game, tap } = playing()
    tap({ type: 'edge' })
    const play = game.show.play!
    const none = play.acts.map(() => 0), not = play.acts.map(() => false), all = play.acts.map(() => 1), yes = play.acts.map(() => true)
    for (const cast of play.cast) {
      const start = poseOf(cast, play, none, not), end = poseOf(cast, play, all, yes), last = finalSpot(play, cast.id)!
      expect([start.x, start.y, start.size, start.visible]).toEqual([cast.from.x, cast.from.y, cast.from.size, cast.shown])
      expect([end.x, end.y, end.size]).toEqual([last.x, last.y, last.size])
      expect(end.air).toBe(0)
    }
  })

  it('hides what it shows on its way, and nothing once it is over', () => {
    const { game, tap, wait } = playing()
    tap({ type: 'edge' })
    expect(game.show.hidden('asker')).toBe(true)
    expect(game.show.hidden('slot:0')).toBe(true)
    wait(27)
    for (const thing of game.show.picture.things) expect(game.show.hidden(thing.key)).toBe(false)
  })

  it('keeps whoever is still to arrive off the page until it comes into view', () => {
    const { game, tap, wait } = playing()
    tap({ type: 'edge' })
    expect(game.show.away('edge')).toBe(1)
    wait(27)
    expect(game.show.away('edge')).toBe(0)
  })

  it('hands every sound over once, in time, and drops what a touch cuts short', () => {
    const { game, tap, wait } = playing()
    tap({ type: 'edge' }); wait(27)
    tap({ type: 'slot', slot: 0 })
    const first = game.show.due(0.25)
    expect(first.length).toBeGreaterThan(0)
    expect(first[0].after).toBe(0)
    expect(game.show.due(0.25)).toEqual([])
    // The asker's answer is still to come; a touch ends the play and it is never heard.
    wait(0.2)
    game.show.finish()
    wait(3)
    expect(game.show.due(60)).toEqual([])
  })

  it('does not count a call the game makes by itself as the child playing', () => {
    const { game, tap, wait } = playing()
    tap({ type: 'edge' }); wait(27)
    const again = act(game.world, { type: 'asker' })
    game.show.start(direct(again.happened, { type: 'asker' }, game.world, game.world, VIEW, 0)!, () => {}, true)
    expect(game.show.playing).toBe(true)
    expect(game.show.moving).toBe(false)
  })
})

describe('the hides beside one that calls', () => {
  it('lean towards it while it calls, and stand straight again when it is over', () => {
    const { game, tap, wait } = playing()
    tap({ type: 'edge' }); wait(27)
    expect(game.show.leaning('slot:0', game.show.xs.get('slot:0')!)).toBe(0)
    tap({ type: 'slot', slot: 1 })
    wait(0.14)
    // The one on its left leans to the right, towards it; it does not lean towards itself.
    expect(game.show.leaning('slot:0', game.show.xs.get('slot:0')!)).toBeGreaterThan(0.02)
    expect(game.show.leaning('slot:1', game.show.xs.get('slot:1')!)).toBe(0)
    wait(6)
    expect(game.show.leaning('slot:0', game.show.xs.get('slot:0')!)).toBe(0)
  })
})

describe('a pose', () => {
  it('rolls an egg along the ground: it turns as far as it travels and comes to rest upright where it was sent', () => {
    const { game, tap, wait } = playing({ ...freshWorld(null), shown: ['seek', 'who', 'alike'], next: { form: 'who', place: 'who-is-inside', kinds: ['pip', 'tok', 'hoom'], slots: ['fresh', 'fresh', 'fresh'], queue: ['tok', 'hoom', 'pip'], asker: null, wrong: 0 } })
    tap({ type: 'edge' })
    const show = game.show, comer = show.play!.cast.find((one) => one.id === 'comer')!
    const pose = () => poseOf(comer, show.play!, show.progress, show.begun)
    const roll = show.play!.acts.find((one) => one.who === 'comer' && one.do === 'roll')!
    wait(roll.at + roll.lasts / 2)
    const mid = pose()
    // On the ground all the way: from the floor at the edge up to the stone, which lies a little higher.
    expect(mid.y).toBeLessThanOrEqual(comer.from.y)
    expect(mid.y).toBeGreaterThanOrEqual(roll.do === 'roll' ? roll.to.y : 0)
    expect(Math.abs(mid.turn)).toBeGreaterThan(1)
    expect(mid.x).toBeLessThan(comer.from.x)
    wait(roll.lasts / 2 + 0.1)
    expect(pose().turn).toBe(0)
  })
})

describe('the choir', () => {
  it('has begun once someone has been told to turn to the front, and not before', () => {
    const next = { form: 'seek' as const, place: 'two-eggs', kinds: ['hoom', 'tok'] as ('hoom' | 'tok')[], slots: ['fresh', 'fresh'] as ('fresh')[], queue: ['hoom', 'tok'] as ('hoom' | 'tok')[], asker: null, wrong: 0 }
    const { game, tap, wait } = playing({ ...freshWorld(null), shown: ['seek', 'who', 'alike'], next })
    for (const action of [{ type: 'edge' }, { type: 'slot', slot: 0 }, { type: 'slot', slot: 0 }, { type: 'edge' }, { type: 'slot', slot: 1 }] as const) { tap(action); wait(8) }
    expect(game.show.choir).toBe(false)
    // The last one who asks finds its own: the reunion plays, and the choir follows on the same touch.
    tap({ type: 'slot', slot: 1 })
    expect(game.world.finished).toBe(true)
    const play = game.show.play!, gathers = Math.min(...play.acts.filter((one) => one.do === 'face').map((one) => one.at))
    expect(Number.isFinite(gathers)).toBe(true)
    wait(gathers - 0.2)
    expect(game.show.choir).toBe(false)
    wait(0.4)
    expect(game.show.choir).toBe(true)
    game.show.finish()
    expect(game.show.choir).toBe(false)
  })
})

describe('a call that has been handed over to sound', () => {
  it('is kept when a touch ends its play just before it starts: the one who calls still moves in its shape while it is heard', () => {
    const next = { form: 'seek' as const, place: 'two-eggs', kinds: ['hoom', 'tok'] as ('hoom' | 'tok')[], slots: ['fresh', 'fresh'] as ('fresh')[], queue: ['hoom', 'tok'] as ('hoom' | 'tok')[], asker: null, wrong: 0 }
    const { game, tap, wait } = playing({ ...freshWorld(null), shown: ['seek', 'who', 'alike'], next })
    tap({ type: 'edge' })
    wait(3)
    // A first tap on a hide: it calls, and then the one who asks answers.
    tap({ type: 'slot', slot: 1 })
    const show = game.show, answer = show.play!.acts.find((one) => one.who === 'asker' && one.do === 'call')!
    // Up to a moment before the answer starts; the loop hands sounds over a little ahead of their time.
    wait(answer.at - 0.05)
    expect(show.due(0.08).some((one) => 'call' in one && one.call.kind === 'hoom')).toBe(true)
    expect(show.acting('asker')).toEqual([])
    // A touch ends the play before the answer has begun. It has been handed over, so it will sound.
    show.finish()
    expect(show.echoes.map((one) => one.who)).toContain('asker')
    wait(0.3)
    expect(show.acting('asker').map((one) => one.act.do)).toEqual(['call'])
    expect(show.sounding()).not.toBeNull()
    // A call that was not handed over is dropped with its play, and nobody moves for it.
    wait(3)
    tap({ type: 'slot', slot: 1 })
    game.show.finish()
    expect(game.show.echoes).toEqual([])
  })
})

describe('a call cut short by a touch, when the caller is one of the cast', () => {
  it('goes on on the one the caller is in the picture: the one who has just come to the stone, and the grown one back in its spot after a wrong knock', () => {
    // The one who comes to ask walks to the stone and calls there.
    const seekClutch = { form: 'seek' as const, place: 'two-eggs', kinds: ['hoom', 'tok'] as ('hoom' | 'tok')[], slots: ['fresh', 'fresh'] as ('fresh')[], queue: ['hoom', 'tok'] as ('hoom' | 'tok')[], asker: null, wrong: 0 }
    const first = playing({ ...freshWorld(null), shown: ['seek', 'who', 'alike'], next: seekClutch })
    first.tap({ type: 'edge' })
    const call = first.game.show.play!.acts.find((one) => one.who === 'comer' && one.do === 'call')!
    first.wait(call.at + 0.2)
    first.game.show.finish()
    expect(first.game.show.echoes.map((one) => one.who)).toEqual(['asker'])
    expect(first.game.show.acting('asker').map((one) => one.act.do)).toEqual(['call'])
    expect(first.game.show.sounding()).not.toBeNull()

    // In `who` a grown one whose voice it is not knocks, calls, and walks back: its call goes on on it in its spot.
    const whoClutch = { form: 'who' as const, place: 'who-is-inside', kinds: ['pip', 'tok', 'hoom'] as ('pip' | 'tok' | 'hoom')[], slots: ['fresh', 'fresh', 'fresh'] as ('fresh')[], queue: ['tok', 'hoom', 'pip'] as ('pip' | 'tok' | 'hoom')[], asker: null, wrong: 0 }
    const second = playing({ ...freshWorld(null), shown: ['seek', 'who', 'alike'], next: whoClutch })
    second.tap({ type: 'edge' })
    second.wait(6)
    second.tap({ type: 'slot', slot: 2 })
    second.wait(3)
    second.tap({ type: 'slot', slot: 2 })
    const mine = second.game.show.play!.acts.find((one) => one.who === 'grown' && one.do === 'call')!
    second.wait(mine.at + 0.3)
    second.game.show.finish()
    expect(second.game.show.echoes.map((one) => one.who)).toEqual(['slot:2'])
    expect(second.game.show.acting('slot:2').map((one) => one.act.do)).toEqual(['call'])
  })
})

describe('the one who asks, once someone has come out', () => {
  it('is told by the show that it has someone beside it, from the moment that one is on stage and not before', () => {
    const next = { form: 'seek' as const, place: 'two-eggs', kinds: ['hoom', 'tok'] as ('hoom' | 'tok')[], slots: ['fresh', 'fresh'] as ('fresh')[], queue: ['hoom', 'tok'] as ('hoom' | 'tok')[], asker: null, wrong: 0 }
    const { game, tap, wait } = playing({ ...freshWorld(null), shown: ['seek', 'who', 'alike'], next })
    tap({ type: 'edge' })
    wait(3)
    tap({ type: 'slot', slot: 1 })
    expect(game.show.met).toBe(false)
    wait(3)
    // Another kind's hide is opened: it comes out and lands beside the one who asks.
    tap({ type: 'slot', slot: 1 })
    expect(game.show.met).toBe(true)
    game.show.finish()
    expect(game.show.met).toBe(false)
  })
})

describe('a grown one of the row after a knock that did not open', () => {
  it('is back in its spot when the play is over and steps out in front of the row again from there, without a jump', () => {
    const whoClutch = { form: 'who' as const, place: 'who-is-inside', kinds: ['pip', 'tok', 'hoom'] as ('pip' | 'tok' | 'hoom')[], slots: ['fresh', 'fresh', 'fresh'] as ('fresh')[], queue: ['tok', 'hoom', 'pip'] as ('pip' | 'tok' | 'hoom')[], asker: null, wrong: 0 }
    const { game, tap, wait } = playing({ ...freshWorld(null), shown: ['seek', 'who', 'alike'], next: whoClutch })
    tap({ type: 'edge' })
    wait(6)
    tap({ type: 'slot', slot: 2 })
    wait(3)
    // Heard: it has stepped out all the way.
    expect(game.show.lids.get('slot:2')).toBe(1)
    tap({ type: 'slot', slot: 2 })
    expect(game.world.cycle!.slots[2]).toBe('heard')
    wait(game.show.play!.seconds + 0.05)
    expect(game.show.playing).toBe(false)
    // The play ended with it in the row; from there it steps out again.
    expect(game.show.lids.get('slot:2')!).toBeLessThan(0.9)
    wait(1)
    expect(game.show.lids.get('slot:2')).toBe(1)
  })
})

describe('someone on the hill', () => {
  it('is heard out when the child touches something else: its call and every note of a join still sound, and only a play\'s own sounds go', () => {
    const next = { form: 'seek' as const, place: 'two-eggs', kinds: ['hoom', 'tok'] as ('hoom' | 'tok')[], slots: ['fresh', 'fresh'] as ('fresh')[], queue: ['hoom', 'tok'] as ('hoom' | 'tok')[], asker: null, wrong: 0 }
    const { game, tap, wait } = playing({ ...freshWorld(null), shown: ['seek', 'who', 'alike'], next, hill: [{ kind: 'pip', as: 'family', place: 2 }] })
    tap({ type: 'edge' })
    wait(3)
    const show = game.show
    // The one on the hill is tapped, and its call is due in a little while.
    show.poke(2)
    show.sound([{ at: 0.5, call: { kind: 'pip', inside: false } }, { at: 0.8, call: { kind: 'pip', inside: false } }])
    // A tap on a hide starts a play with sounds of its own, and another touch ends that play at once.
    tap({ type: 'slot', slot: 0 })
    show.finish()
    wait(1)
    const due = show.due(0.25)
    expect(due.filter((one) => 'call' in one && one.call.kind === 'pip')).toHaveLength(2)
    expect(due.some((one) => 'call' in one && one.call.kind !== 'pip')).toBe(false)
  })

  it('is the one a figure of a running scene will be: a tap on the figure is a tap on its place on the hill', () => {
    const next = { form: 'seek' as const, place: 'two-eggs', kinds: ['hoom', 'tok'] as ('hoom' | 'tok')[], slots: ['fresh', 'fresh'] as ('fresh')[], queue: ['hoom', 'tok'] as ('hoom' | 'tok')[], asker: null, wrong: 0 }
    const { game, tap, wait } = playing({ ...freshWorld(null), shown: ['seek', 'who', 'alike'], next })
    tap({ type: 'edge' })
    wait(3)
    tap({ type: 'slot', slot: 0 })
    wait(2)
    // The hide of the one who asks is opened: the reunion plays, and the two are on their way to one place.
    tap({ type: 'slot', slot: 0 })
    wait(1.5)
    const place = game.world.hill[0].place, show = game.show
    const out = poseOf(show.play!.cast.find((one) => one.id === 'out')!, show.play!, show.progress, show.begun)
    const seeker = poseOf(show.play!.cast.find((one) => one.id === 'seeker')!, show.play!, show.progress, show.begun)
    expect(show.bound(out.x, out.y - out.size / 2, game.world.hill)).toBe(place)
    expect(show.bound(seeker.x, seeker.y - seeker.size / 2, game.world.hill)).toBe(place)
    // Not where nobody of the scene is, and not once the scene is over.
    expect(show.bound(out.x + 500, out.y - 300, game.world.hill)).toBeNull()
    // Their own calls are not another's call for them to join in with.
    expect(show.sounding(place, game.world.hill)).toBeNull()
    show.finish()
    expect(show.bound(out.x, out.y - out.size / 2, game.world.hill)).toBeNull()
  })

  it('joins in with a call of a play that still sounds when the finger lands, though the play gives way', () => {
    // hoom asks at the stone, and pip stands on the hill from a clutch before.
    const next = { form: 'seek' as const, place: 'two-eggs', kinds: ['hoom', 'tok'] as ('hoom' | 'tok')[], slots: ['fresh', 'fresh'] as ('fresh')[], queue: ['hoom', 'tok'] as ('hoom' | 'tok')[], asker: null, wrong: 0 }
    const world: World = { ...freshWorld(null), shown: ['seek', 'who', 'alike'], next, hill: [{ kind: 'pip', as: 'family', place: 2 }] }
    const { game, tap, wait } = playing(world)
    tap({ type: 'edge' })
    wait(3)
    // A tap on the one who asks: it calls, for 0.9 seconds.
    tap({ type: 'asker' })
    expect(game.show.sounding()).not.toBeNull()
    wait(0.2)
    const heard = game.show.sounding(2, game.world.hill)!
    expect(heard.since).toBeGreaterThan(0.15)
    expect(heard.since + heard.remaining).toBeCloseTo(0.9, 9)
    // The touch ends the play, and the one on the hill is told of the call all the same and joins in.
    game.show.finish()
    // The voice that had begun is heard out, and the one who asks goes on moving in its shape for as long.
    expect(game.show.sounding()).toEqual(heard)
    expect(game.show.acting('asker').map((one) => [one.act.do, one.act.who])).toEqual([['call', 'asker']])
    expect(game.show.acting('asker')[0].progress).toBeCloseTo(heard.since / 0.9, 6)
    expect(game.show.moving).toBe(true)
    let told: [number | null, number] = [null, -1]
    game.show.poke(2, (remaining, since) => { told = [remaining, since]; return [0.1] }, heard)
    expect(told).toEqual([heard.remaining, heard.since])
    expect(game.show.standing.get(2)!.joinAt).toBe(game.show.now)
    // When the voice is over the one who asks is still again, and with nothing sounding the one on the hill does a trick.
    wait(2)
    expect(game.show.sounding()).toBeNull()
    expect(game.show.acting('asker')).toEqual([])
    expect(game.show.echoes).toEqual([])
    expect(game.show.poke(2, () => 0.03, game.show.sounding(2, game.world.hill))).toBeNull()
  })

  it('joins in note by note when it is told the times of single notes, and is told how far the other call has got', () => {
    const world: World = { ...freshWorld(null), hill: [{ kind: 'hoom', as: 'single', place: 0 }, { kind: 'pip', as: 'family', place: 2 }] }
    const show = new Show(world, VIEW)
    show.poke(0)
    for (let t = 0; t < 0.2; t += FRAME) show.step(FRAME)
    let told: [number | null, number] = [null, -1]
    const now = show.now, remaining = show.poke(2, (left, since) => { told = [left, since]; return [0.1, 0.4] })
    // hoom was told to call 0.03 s after its tap, so that is when its call began.
    expect(told[1]).toBeCloseTo(now - 0.03, 9)
    expect(told[0]).toBe(remaining)
    expect(told[0]! + told[1]).toBeCloseTo(0.9, 9)
    const pip = show.standing.get(2)!
    expect(pip.notesAt).toEqual([now + 0.1, now + 0.4])
    expect(pip.callAt).toBe(now + 0.1)
    expect(pip.joinAt).toBe(now)
    // It counts as calling, and as something the child set going, until its last note is over.
    for (let t = 0; t < 0.45; t += FRAME) show.step(FRAME)
    expect(show.calling(0)).toBe(pip)
    expect(show.moving).toBe(true)
    for (let t = 0; t < 1.5; t += FRAME) show.step(FRAME)
    expect(show.calling(0)).toBeUndefined()
    expect(show.moving).toBe(false)
    // Tapped again with nobody calling, it calls whole and does a trick.
    show.poke(2)
    expect(show.standing.get(2)!.notesAt).toBeNull()
  })

  it('does a trick when tapped, never the same one twice running, and joins in while another calls', () => {
    const world: World = { ...freshWorld(null), hill: [{ kind: 'pip', as: 'family', place: 0 }, { kind: 'hoom', as: 'single', place: 2 }] }
    const show = new Show(world, VIEW), tricks: number[] = []
    for (let i = 0; i < 12; i++) {
      show.poke(0)
      tricks.push(show.standing.get(0)!.trick)
      expect(show.moving).toBe(true)
      for (let t = 0; t < 3; t += FRAME) show.step(FRAME)
    }
    expect(tricks[0]).toBe(0)
    for (let i = 1; i < tricks.length; i++) expect(tricks[i]).not.toBe(tricks[i - 1])
    show.poke(0)
    for (let t = 0; t < 0.06; t += FRAME) show.step(FRAME)
    const before = show.standing.get(2)!.trickAt
    // It is told how much of the other's call is still to come, and its own call starts when it is told to.
    const remaining = show.poke(2, (left) => (left === null ? 0.03 : left + 0.05))
    expect(remaining).toBeGreaterThan(0)
    expect(remaining).toBeLessThan(0.12)
    expect(show.standing.get(2)!.callAt).toBeCloseTo(show.now + remaining! + 0.05, 9)
    expect(show.standing.get(2)!.notesAt).toBeNull()
    expect(show.standing.get(2)!.joinAt).toBe(show.now)
    expect(show.standing.get(2)!.trickAt).toBe(before)
    show.sound(callSound('hoom'))
    const due = show.due(0.25)
    expect(due).toHaveLength(2)
    expect(due[0].after).toBe(0)
    expect(due[1].after).toBeCloseTo(0.03, 9)
  })

  it('is tapped where it stands, and a tap on the bare page is nobody', () => {
    const world: World = { ...freshWorld(null), hill: [{ kind: 'pip', as: 'family', place: 3 }] }
    const show = new Show(world, VIEW), thing = show.picture.things.find((one) => one.key === 'hill:3')!
    expect(whatIsAt(show.picture, world, thing.x, thing.y - 60)).toEqual({ type: 'resident', resident: 0 })
    expect(whatIsAt(show.picture, world, 80, 80)).toBeNull()
  })
})
