import type { Driver, Frac, GameAudit } from '../types.ts'

// Princess Playground. One fresh visit, played straight through, so that every
// state is reached from the one before it: the first showing; a friend sent
// onto the plank, the fling, the ending and the friend who waits; play on the
// finished scene; the next ride begun and its showing; an ending and a
// showing each ended by a touch; a tower on one end, taken down from the
// bottom; friends carried over an end, onto a friend, over the middle and
// into the sand; the plank tapped, fingers in the sand and the rake; then the
// game put away and found as left, at rest under the idle ladder.

type Name = 'pim' | 'mog' | 'dot' | 'bo'

async function friend(d: Driver, id: Name): Promise<Frac> {
  return (await d.find(`${id}-body`)) ?? [0.5, 0.6]
}

async function tapFriend(d: Driver, id: Name, then = 2600): Promise<void> {
  await d.tap(await friend(d, id))
  await d.wait(then)
}

const SAND_LEFT: Frac = [0.22, 0.74]
const SAND_MID: Frac = [0.4, 0.8]
const LEFT_END: Frac = [0.33, 0.44]
const RIGHT_END: Frac = [0.69, 0.44]
const MIDDLE: Frac = [0.5, 0.47]

export default {
  enforce: true,
  query: 'tier=0&seed=1',
  childAge: 3,
  ignore: [
    // The grains a knock throws: points with no body, drawn where they fly.
    '^grains$',
    // The demonstration hand: a screen-facing sprite drawn without a depth test.
    'ghost-hand',
  ],
  moments: [
    { name: 'the first showing, hands off', run: (d) => d.wait(4500) },
    {
      name: 'Bo lifts Pim: the slam, the fling, the ending, and Mog goes to wait',
      run: async (d) => {
        await tapFriend(d, 'bo', 1800)
        await d.wait(7500)
      },
    },
    {
      name: 'play on the finished scene, then the next ride and its showing',
      run: async (d) => {
        await tapFriend(d, 'dot', 2200)
        await tapFriend(d, 'pim', 1800)
        // Mog waits: a touch on him lays out the next ride, the other way round, and Pim shows what too light looks like.
        await tapFriend(d, 'mog', 6000)
      },
    },
    {
      name: 'an ending ended by a touch, then a showing ended by a touch',
      run: async (d) => {
        await tapFriend(d, 'bo', 3300)
        await d.tap(SAND_LEFT)
        await d.wait(3000)
        // Bo waits now: a touch on him lays out his ride, and its showing is cut short.
        await tapFriend(d, 'bo', 1900)
        await d.tap(SAND_MID)
        await d.wait(1500)
      },
    },
    {
      name: 'a tower on one end, and taken down from the bottom',
      run: async (d) => {
        for (const id of ['pim', 'mog', 'dot'] as const) await tapFriend(d, id, 1500)
        await d.wait(1200)
        await d.tap(SAND_LEFT)
        await d.wait(2500)
        for (const id of ['dot', 'mog', 'pim'] as const) await tapFriend(d, id, 1300)
        await d.wait(2000)
        await tapFriend(d, 'pim', 2500)
        await tapFriend(d, 'mog', 2500)
      },
    },
    {
      name: 'carried: over an end, onto a friend, over the middle, into the sand',
      run: async (d) => {
        await d.drag(await friend(d, 'bo'), RIGHT_END, 900)
        await d.wait(2500)
        await d.drag(await friend(d, 'mog'), RIGHT_END, 900)
        await d.wait(2500)
        await d.drag(await friend(d, 'pim'), LEFT_END, 900)
        await d.wait(2500)
        await d.drag(await friend(d, 'dot'), MIDDLE, 900)
        await d.wait(2500)
        await d.drag(await friend(d, 'bo'), SAND_MID, 900)
        await d.wait(2500)
        await d.drag(await friend(d, 'dot'), SAND_LEFT, 900)
        await d.wait(2500)
      },
    },
    {
      name: 'the plank tapped, fingers in the sand, and the rake',
      run: async (d) => {
        await d.tap(LEFT_END)
        await d.wait(900)
        await d.tap(RIGHT_END)
        await d.wait(900)
        await d.drag([0.2, 0.7], [0.45, 0.76], 700)
        await d.wait(500)
        await d.tap((await d.find('rake')) ?? [0.5, 0.38])
        await d.wait(2500)
      },
    },
    {
      name: 'put away and found as left, at rest under the idle ladder',
      run: async (d) => {
        await d.tap([0.75, 0.78])
        await d.wait(600)
        await d.reload()
        await d.wait(9000)
      },
    },
  ],
  allow: [
    { a: '-whites\\b', b: '-pupils\\b', kind: 'pose', upTo: 0.7, reason: 'a pupil lies in its white and moves in it with the gaze; both flatten together as the eye shuts' },
    { a: '-body\\b', b: '-mouth\\b', kind: 'pose', upTo: 1.75, reason: 'the mouth is half a ring lying on the body: it widens when the friend speaks and is carried by every squash. The measure is against its shallowest pose, and that is now a mouth pressed to a flat line when the friend is put out, which hardly crosses the body at all; a wide open mouth on a body squashed by a landing crosses it deepest, and reads as an open smile lying on the face' },
    { a: '-body\\b', b: '-(whites|pupils)\\b', kind: 'pose', upTo: 0.6, reason: 'the eyes lie on the body and flatten into it as they shut' },
    { a: 'bo-body', b: 'bo-lids', kind: 'pose', upTo: 1.0, reason: 'Bo’s lids are caps lying on his body over his eyes; his squash, the deepest of the four, carries them with it' },
    { a: 'bo-(whites|pupils)\\b', b: 'bo-lids', kind: 'pose', upTo: 0.7, reason: 'Bo’s lids lie over the top of his eyes, which flatten under them in a blink and when he dozes' },
    { a: 'pim-body', b: 'pim-crown', kind: 'pose', upTo: 1.3, reason: 'the shell crown sits on Pim’s head, swings on its base after she stops, slips down to the side of her head when a friend sits on her, and over one eye when she is set down in the sand. It is a low, small shell, so lying against the round of her head it crosses it by more than its own small measure' },
    { a: 'pim-(whites|pupils)\\b', b: 'pim-crown', kind: 'pose', upTo: 1.3, reason: 'set down in the sand, Pim’s crown slips down over one eye and lies on it until she shakes it back: the sheet asks for exactly that' },
    { a: '^sand', b: '^plank', kind: 'penetration', upTo: 0.2, reason: 'the low end digs into the sand, deeper the heavier it is, and the bite is drawn round it: with a stack on that end the tip of the board lies a little under the surface, which is what the sheet means by the end sinking further' },
    { a: 'mog-body', b: 'mog-ears', kind: 'pose', upTo: 1.2, reason: 'Mog’s ears sit on his head and lie flat when he is put out or a friend is on him' },
    { a: 'dot-body', b: 'dot-speckles', kind: 'pose', upTo: 0.5, reason: 'the speckles lie on Dot’s back and shimmer by turning a little on it' },
    { a: '^friend-', b: '^friend-', kind: 'penetration', upTo: 0.15, reason: 'a friend sits on the very top of the one below, touching it; when the two sway or spring a little out of step, the rim of one presses into the other for a moment' },
    { a: '^plank', b: '^friend-', kind: 'penetration', upTo: 0.1, reason: 'a friend sits on the plank on its rounded underside; when it sways or kicks, the rim of that underside presses a little into the board' },
  ],
} satisfies GameAudit
