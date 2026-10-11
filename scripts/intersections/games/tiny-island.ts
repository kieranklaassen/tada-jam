import type { Driver, Frac, GameAudit } from '../types.ts'

// Tiny Island: five wooden toys, a turntable with an island in a dish of sea,
// a tray in front, and four residents (a cat, a gull, a wave, a whale). The
// moments reach every state a child can make: each toy in its slot, in the
// hand, on the land and in the sea; set down by tap and by drag, on bare land,
// on another toy and on the cat; tapped where it stands; carried over the
// tallest toy and over the cat; the island turned by a peg, spun fast and
// stopped; the pairs (the sheep at the tree and in the boat, the cat and the
// lamp's light, the cat and the boat on the land, the gull in the smoke and
// beside the house in the sea, the boat passing under it); the gull's flights
// and its dive, its way round a tall toy and its buoy kept while the chimney is
// under the home control; a toy carried toward the cat; the wave rearing, called off, at work with all five toys out,
// ended by a touch, and over a bare island; and a saved island opened again.

const SLOT = 'tada-jam:slot:tiny-island'
const KINDS = ['lighthouse', 'boat', 'sheep', 'tree', 'house'] as const
type Kind = (typeof KINDS)[number]
type Toy = { kind: Kind; where: 'tray' | 'land' | 'sea' | 'boat'; x: number; z: number }

/** A save as the game writes it (save.ts): the toys that are out, and the turn. The rest wait in the tray. */
function save(out: Partial<Record<Kind, ['land' | 'sea' | 'boat', number, number]>>, turn = 0): object {
  const toys: Toy[] = KINDS.map((kind) => {
    const at = out[kind]
    return at ? { kind, where: at[0], x: at[1], z: at[2] } : { kind, where: 'tray', x: 0, z: 0 }
  })
  return { v: 1, position: 'island', finished: false, turn, toys }
}

/** Opens the game on a saved island. The first reload lets the game's own last save land, so it cannot write over the second. */
async function open(d: Driver, state: object | null): Promise<void> {
  await d.reload()
  await d.reload({ [SLOT]: state })
  await d.wait(500)
}

// Places on the glass at 1180 by 820, as the camera of the game stands them (games/tiny-island/layout.test.ts
// holds each of these to its point of the world; change the two together).
const LAND = { middle: [0.5, 0.416], right: [0.608, 0.416], left: [0.392, 0.416], back: [0.5, 0.354], front: [0.5, 0.487], frontRight: [0.578, 0.463], backLeft: [0.429, 0.372], backRight: [0.571, 0.372], frontLeft: [0.422, 0.463] } as const satisfies Record<string, Frac>
const SEA = { front: [0.5, 0.616], left: [0.252, 0.438], right: [0.748, 0.438], back: [0.5, 0.302], frontRight: [0.694, 0.559], frontLeft: [0.306, 0.559] } as const satisfies Record<string, Frac>
const RIM = { front: [0.5, 0.701], frontRight: [0.676, 0.674], right: [0.808, 0.605], farRight: [0.872, 0.417], farLeft: [0.128, 0.417] } as const satisfies Record<string, Frac>
const SLOTS: Record<Kind, Frac> = { lighthouse: [0.137, 0.791], boat: [0.319, 0.791], sheep: [0.5, 0.791], tree: [0.681, 0.791], house: [0.863, 0.791] }
const TRAY: Frac = [0.777, 0.909]
const OPEN_SEA: Frac = [0.222, 0.29]
const SKY: Frac = [0.62, 0.04]
const WAVE: Frac = [0.903, 0.257]

/** A toy where it stands, by the name of its body, or the middle of the land if it cannot be found. */
const toy = async (d: Driver, kind: Kind): Promise<Frac> => (await d.find(`^${kind}-body( |$)`)) ?? LAND.middle
/**
 * The boat by its hull, under its deck, for when the sheep is aboard: a finger on the middle of the boat is then on
 * the sheep, from its feet up. On the land the hull flaps and is lifted, so the finger goes lower there than afloat.
 * (`view/frameBudget.test.ts` plays the moment that uses these in the model and holds that each is on the boat.)
 */
const HULL_UNDER = { land: 0.064, sea: 0.037 }
const hull = async (d: Driver, where: 'land' | 'sea'): Promise<Frac> => { const [x, y] = await toy(d, 'boat'); return [x, y + HULL_UNDER[where]] }
const cat = async (d: Driver): Promise<Frac> => (await d.find('^cat-body( |$)')) ?? LAND.middle
const gull = async (d: Driver): Promise<Frac> => (await d.find('^gull-body( |$)')) ?? SKY
const whale = async (d: Driver): Promise<Frac> => (await d.find('^whale-body( |$)')) ?? [0.04, 0.66]

/** Takes a toy from its slot and sets it down with two taps, as the youngest child does. */
async function put(d: Driver, kind: Kind, at: Frac, wait = 1300): Promise<void> {
  await d.tap(SLOTS[kind])
  await d.wait(200)
  await d.tap(at)
  await d.wait(wait)
}

/** Spins the island by a finger that slides round the front of the rim, and lets it run on. */
async function spin(d: Driver, times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await d.press(RIM.farLeft)
    await d.move(RIM.front, 180)
    await d.move(RIM.farRight, 180)
    await d.release()
    await d.wait(250)
  }
}

const ALL_OUT = save({ lighthouse: ['land', -1.2, -1.6], boat: ['sea', 0, 5.75], sheep: ['land', -0.2, 1.4], tree: ['land', -1.9, 0.9], house: ['land', 1.5, -0.5] })
const ALL_AT_SEA = save({ lighthouse: ['sea', 0, -4.25], boat: ['sea', 5.75, 0], sheep: ['sea', 3, 3], tree: ['sea', -3.51, 2.39], house: ['sea', -4.1, -1.1] })

const audit: GameAudit = {
  enforce: true,
  query: 'tier=0&seed=7',
  childAge: 2,
  sampleMs: 200,
  ignore: [
    // Flat films laid just over the ground with depth writing off: the shade under each toy, the lamp's pool of light, the mown patch.
    '^discs$',
    // The ring that shows where a carried toy will come down, and the ripples and dust rings: flat, see-through, depth writing off.
    '^aim$',
    '^rings$',
    // The lamp's beam: a see-through cone of light that sweeps through whatever it lights.
    'lighthouse-beam',
    // Smoke, spray, bubbles, leaves and drops: small short-lived puffs that drift through the air and over things.
    '^puffs$',
    // The idle ladder's hand: drawn over everything, with no depth test.
    '^hand$',
    // The sky is a plane behind everything, and the clouds and the sun hang on it.
    '^sky$',
    '^clouds$',
    // Pupils: flat discs laid just in front of an eye.
    '-pupils?$',
  ],
  allow: [
    { a: '^sea$', reason: 'The sea is water: the toys afloat, the buoy, the whale, the wave and the paddling gull sit in it, as they are meant to.' },
    // The dish of paler water inside the rim, the land and the rim are one piece, so a toy afloat inside the rim sits in that piece. On the land no pose takes a toy more than a squash into the ground: games/tiny-island/view/ground.test.ts holds that, pose by pose.
    { a: '^turntable$', b: '(lighthouse|sheep|tree|house)-(body|part)$', upTo: 0.6, reason: 'A toy set down in the sea inside the rim floats in the shallow water of the dish, sunk to its waterline: the lighthouse to its first stripe, the sheep to its fleece, the log half under.' },
    { a: '^turntable$', b: 'boat-body$', upTo: 1.3, reason: 'The boat floats in the water of the dish, its flat hull a third under: the audit measures a flat thing lying in a flat sheet of water as deep as it is long. On the land the ground test holds it to the grass.' },
    { a: '^turntable$', b: 'gull-', upTo: 1.5, reason: 'The gull paddles beside the house in the sea with its legs under the water of the dish. The dish is an open bowl, and the audit measures a thing that stands in its water as inside it up to the bowl\'s brim: the folded wings, which are small, come out as deeper than they are big. The height it paddles at is one fixed number in island.ts (perch).' },
    { a: '^turntable$', b: 'cat-(body|paw)$', upTo: 0.25, reason: 'The cat sits in the grass: its haunches and its front paws press a finger into the land.' },
    { a: '^turntable$', b: 'house-bits', upTo: 2, reason: 'The house afloat lies low on one side: its door and the shutter on that side are under the water of the dish, whole.' },
    // The wave is water. At work it rolls over the island, the rim and the tray's back edge, and the toys ride in its crest.
    { a: 'wave-(body|lids)$', reason: 'The wave is water: it rolls over the island and its rim, the toys ride sunk in its crest, it lies in the sea at its edge, and its eyelids are set into its face.' },
    // Jointed parts: each turns in a socket inside the body it belongs to.
    { a: 'cat-body$', b: 'cat-(head|tail|paw)$', upTo: 0.35, reason: 'The head, tail and patting paw of the cat are jointed inside its body, as a wooden toy is pegged.' },
    { a: 'gull-body$', b: 'gull-(head|wing-left|wing-right|jaw)$', upTo: 0.35, reason: 'The head and wings of the gull are jointed inside its body.' },
    { a: 'gull-head$', b: 'gull-jaw$', upTo: 0.5, reason: 'The lower beak is hinged inside the head.' },
    { a: 'sheep-body$', b: 'sheep-part$', upTo: 0.3, reason: 'The neck of the sheep is set into its fleece, and the head nods from there.' },
    { a: 'tree-body$', b: 'tree-part$', upTo: 0.5, reason: 'The trunk goes up into the crown.' },
    { a: 'house-body$', b: 'house-(part|bits)$', upTo: 0.2, reason: 'The roof sits on the walls, and the door and shutters are hinged in them.' },
    { a: 'lighthouse-body$', b: 'lighthouse-part$', upTo: 0.2, reason: 'The lamp turns on a pin inside its cage.' },
    { a: 'boat-body$', b: 'boat-part$', upTo: 0.15, reason: 'The boom of the sail is pinned to the mast.' },
    // The pairs.
    { a: 'tree-part$', b: 'sheep-part$', upTo: 0.3, reason: 'The sheep eats the tree: its muzzle is in the leaves.' },
    { a: 'boat-body$', b: 'sheep-body$', upTo: 0.25, reason: 'The sheep stands on the deck of the boat, and its hooves press into the deck as the hull see-saws under it.' },
  ],
  moments: [
    // A first visit at two: the house already stands and puffs, the gull rides its smoke. Then nobody touches: the glow and the hand come up.
    { name: 'first-visit-and-idle', run: async (d) => { await open(d, null); await d.wait(9000) } },
    {
      // Each toy from its slot to the land with two taps, quickly, the last ones while the first still rock; then each tapped where it stands.
      name: 'set-down-on-land-and-tap',
      run: async (d) => {
        await open(d, save({}))
        await put(d, 'house', LAND.backRight, 700)
        await put(d, 'lighthouse', LAND.backLeft, 700)
        await put(d, 'tree', LAND.left, 700)
        await put(d, 'sheep', LAND.frontRight, 1800)
        await put(d, 'boat', LAND.front, 1500)
        for (const kind of KINDS) {
          await d.tap(await toy(d, kind))
          await d.wait(1300)
        }
        await d.wait(2500)
      },
    },
    {
      // Each toy into the sea inside the rim, and each tapped there. The gull dives after a splash, then paddles beside the house; the boat passes under it.
      name: 'set-down-in-sea-and-tap',
      run: async (d) => {
        await open(d, save({}))
        await put(d, 'tree', SEA.frontLeft, 2600)
        await put(d, 'house', SEA.left, 1600)
        await put(d, 'lighthouse', SEA.back, 900)
        await put(d, 'sheep', SEA.frontRight, 900)
        await put(d, 'boat', SEA.front, 1500)
        for (const kind of KINDS) {
          await d.tap(await toy(d, kind))
          await d.wait(1300)
        }
        // A whole lap of the boat: past the gull, which rises to let it under, and past the front, where it rings its bell.
        await d.wait(11000)
      },
    },
    {
      // A toy set down on a toy lands beside it; on the cat, the cat shoots up and lands beside it; on full land it comes down in the sea. A toy in the hand is put back by the tray, and spun by a second tap.
      name: 'set-down-on-toys-and-the-cat',
      run: async (d) => {
        await open(d, save({ lighthouse: ['land', 0, 0] }))
        await d.tap(SLOTS.house)
        await d.wait(150)
        await d.tap(SLOTS.house)
        await d.wait(500)
        await d.tap(await toy(d, 'lighthouse'))
        await d.wait(1400)
        await d.tap(SLOTS.tree)
        await d.wait(200)
        await d.tap(await cat(d))
        await d.wait(3200)
        await d.tap(SLOTS.sheep)
        await d.wait(200)
        await d.tap(await toy(d, 'house'))
        await d.wait(2600)
        await d.tap(SLOTS.boat)
        await d.wait(300)
        await d.tap(TRAY)
        await d.wait(600)
        await put(d, 'boat', LAND.middle, 2500)
        await d.tap(await cat(d))
        await d.wait(1500)
      },
    },
    {
      // Toys carried by a finger: over the lighthouse, over the cat, over the house and its gull, out over open sea, back over the tray; a standing toy lifted and let go half-way.
      name: 'carried-over-everything',
      run: async (d) => {
        await open(d, ALL_OUT)
        await d.wait(600)
        await d.press(await toy(d, 'sheep'))
        await d.move(await toy(d, 'lighthouse'), 500)
        await d.move(await toy(d, 'house'), 500)
        await d.move(await cat(d), 500)
        await d.move(SEA.right, 400)
        await d.release()
        await d.wait(1500)
        await d.press(await toy(d, 'tree'))
        await d.move(await toy(d, 'house'), 300)
        await d.move(OPEN_SEA, 400)
        await d.release()
        await d.wait(1500)
        await d.press(await toy(d, 'lighthouse'))
        await d.move(LAND.frontRight, 300)
        await d.move(TRAY, 500)
        await d.release()
        await d.wait(1200)
        // From the tray, fast, straight across the house to the back of the land; and one let go short, which hops home.
        await d.drag(SLOTS.lighthouse, LAND.back, 250)
        await d.wait(1500)
        await d.drag(await toy(d, 'house'), SLOTS.sheep, 400)
        await d.wait(1500)
        await d.drag(SLOTS.house, [0.8, 0.74], 300)
        await d.wait(1200)
      },
    },
    {
      // The island turned: one peg by a tap on the rim, a slow slide, then spun fast with every toy on the land, and left to run down. The cat is dragged round and staggers.
      name: 'spun-with-toys-on-land',
      run: async (d) => {
        await open(d, save({ lighthouse: ['land', -1.3, -1.2], boat: ['land', 1.3, 1.5], sheep: ['land', -1.6, 1], tree: ['land', 0.2, 0.3], house: ['land', 1.6, -0.9] }))
        await d.tap(RIM.frontRight)
        await d.wait(900)
        await d.drag(RIM.front, RIM.right, 900)
        await d.wait(600)
        await spin(d, 3)
        await d.wait(5000)
        await spin(d, 1)
        // Touched while it turns: a toy tapped, and a toy lifted off the turning island.
        await d.tap(await toy(d, 'house'))
        await d.wait(400)
        await d.drag(await toy(d, 'tree'), TRAY, 500)
        await d.wait(4000)
      },
    },
    {
      // Spun with the toys afloat: the boat surfs backward, the log rolls, the gull beside the house is carried round and finds its side again when the island stops.
      name: 'spun-with-toys-at-sea',
      run: async (d) => {
        await open(d, ALL_AT_SEA)
        await d.wait(1500)
        await spin(d, 3)
        await d.wait(6000)
        await d.tap(RIM.frontRight)
        await d.wait(1500)
        await d.tap(RIM.frontRight)
        await d.wait(3500)
      },
    },
    {
      // The pairs. The sheep bounds to the tree and eats its crown bare; the sheep set down in the boat on the land and tapped there (it jumps straight up off the deck), and the boat with the sheep aboard lifted by its hull and carried to the sea, where it sails with a horn and the sheep is tapped again; then the boat sent home by its hull, and the sheep hops to its own slot.
      name: 'sheep-tree-and-boat',
      run: async (d) => {
        await open(d, save({ sheep: ['land', -1.8, 0.6], house: ['land', 0, -1.6] }))
        await put(d, 'tree', LAND.right, 4500)
        await d.tap(await toy(d, 'sheep'))
        await d.wait(1500)
        await put(d, 'boat', LAND.front, 1500)
        // Onto the hull point, which is over the boat's own ground: the ground under the middle of its body is past its stern.
        await d.drag(await toy(d, 'sheep'), await hull(d, 'land'), 400)
        await d.wait(3000)
        await d.tap(await toy(d, 'sheep'))
        await d.wait(1500)
        await d.drag(await hull(d, 'land'), SEA.right, 600)
        await d.wait(6000)
        await d.tap(await toy(d, 'sheep'))
        await d.wait(1500)
        await d.drag(await hull(d, 'sea'), TRAY, 500)
        await d.wait(2000)
      },
    },
    {
      // The cat: the lamp's light passes and it pounces; the boat flaps on the land and it pats it; poked, pulled and let go; a toy splashes in beside it.
      name: 'cat-light-boat-and-pull',
      run: async (d) => {
        await open(d, save({ lighthouse: ['land', -1.6, -1.4], boat: ['land', 1.6, 0.9] }))
        await d.wait(6500)
        await d.tap(await cat(d))
        await d.wait(1500)
        const at = await cat(d)
        await d.press(at)
        await d.move([at[0], at[1] - 0.12], 400)
        await d.wait(300)
        await d.release()
        await d.wait(1500)
        await put(d, 'tree', SEA.front, 2500)
        await put(d, 'house', SEA.frontLeft, 2500)
      },
    },
    {
      // The residents alone: the gull poked on its buoy and in the smoke, the whale, the sky, a cloud, the open sea, bare land thumped and the bare island turned from its land.
      name: 'residents-poked',
      run: async (d) => {
        await open(d, save({ house: ['land', 0.4, -1.5] }))
        await d.tap(await gull(d))
        await d.wait(1200)
        await d.tap(await whale(d))
        await d.wait(1500)
        await d.tap(SKY)
        await d.wait(900)
        await d.tap(OPEN_SEA)
        await d.wait(900)
        await d.tap(LAND.frontLeft)
        await d.wait(700)
        await d.drag(LAND.front, LAND.right, 500)
        await d.wait(1500)
        // The house sent home: the gull flies back to its buoy, and is poked there.
        await d.drag(await toy(d, 'house'), TRAY, 500)
        await d.wait(2200)
        await d.tap(await gull(d))
        await d.wait(1500)
      },
    },
    {
      // A toy carried slowly toward the cat: the cat shrinks back from it, hops to the next free seat when the toy is over its seat, and again when it is followed. Then the
      // gull's ways: round the lighthouse to the smoke of a house set down beyond it, back to its buoy when the house is carried to the back of the land in the middle
      // (where its head would be under the home control), and to the smoke again when the island is turned a peg. And the lid of the frame over a carried toy:
      // the house carried to the back of the land, and the sheep carried round the lighthouse.
      name: 'toward-the-cat-and-the-gull-round',
      run: async (d) => {
        await open(d, save({ lighthouse: ['land', -1.9, -0.3] }))
        await d.wait(400)
        const seat = await cat(d)
        await d.press(SLOTS.tree)
        await d.move([seat[0], seat[1] + 0.2], 500)
        await d.wait(300)
        await d.move([seat[0], seat[1] + 0.1], 700)
        await d.wait(500)
        await d.move(seat, 500)
        await d.wait(900)
        await d.move(await cat(d), 600)
        await d.wait(900)
        await d.release()
        await d.wait(1500)
        await put(d, 'house', LAND.right, 2600)
        // The house carried to the back of the land: it is held under the top of the frame all the way.
        await d.drag(await toy(d, 'house'), LAND.back, 700)
        await d.wait(2600)
        // The sheep carried straight at the lighthouse, which it cannot clear inside the frame: it is carried round it on the child's side, and on to the back.
        await d.press(SLOTS.sheep)
        await d.move(LAND.frontLeft, 500)
        await d.move(await toy(d, 'lighthouse'), 700)
        await d.wait(300)
        await d.move(LAND.backLeft, 700)
        await d.wait(300)
        await d.release()
        await d.wait(1800)
        await d.tap(RIM.frontRight)
        await d.wait(3000)
        await d.tap(RIM.frontRight)
        await d.wait(3000)
      },
    },
    {
      // The wave called and called off; then called with every toy out: it rears, rolls across, takes each toy onto its crest, curls to the tray and stands each in its slot.
      name: 'wave-called-off-and-the-wash',
      run: async (d) => {
        await open(d, ALL_OUT)
        await d.wait(800)
        await d.tap(WAVE)
        await d.wait(700)
        await d.tap(WAVE)
        await d.wait(1500)
        await d.tap(WAVE)
        await d.wait(10000)
      },
    },
    {
      // The wash with the toys afloat and the sheep in the boat on the land; and the wash ended by a touch in the middle of its roll.
      // In the second wash the gull is washed off the smoke and sets down on its buoy while the swell lifts it. The touch that
      // ends that wash is on the tree's slot, and is an ordinary touch: the tree is in the hand, and the next tap sets it on the land.
      name: 'wash-at-sea-and-ended',
      run: async (d) => {
        await open(d, ALL_AT_SEA)
        await d.wait(800)
        await d.tap(WAVE)
        await d.wait(9500)
        await open(d, save({ lighthouse: ['land', 0.3, -1.9], boat: ['land', 1.6, 1], sheep: ['boat', 0, 0], tree: ['sea', -4.25, 0], house: ['land', -1.6, 0.3] }, 0.8))
        await d.tap(WAVE)
        await d.wait(3300)
        await d.tap(SLOTS.tree)
        await d.wait(1500)
        await d.tap(LAND.middle)
        await d.wait(1500)
      },
    },
    {
      // The wave over a bare island, and saved islands with the turntable turned, opened again: found as left, the sheep aboard the boat on the land and afloat.
      name: 'bare-wash-and-found-as-left',
      run: async (d) => {
        await open(d, save({}))
        await d.tap(WAVE)
        await d.wait(4500)
        await open(d, save({ lighthouse: ['sea', -3, -3], boat: ['land', -1.5, 1.2], sheep: ['boat', 0, 0], tree: ['land', 1.7, 0.6], house: ['land', 0, -1.7] }, 2.4))
        await d.wait(4000)
        // The boat afloat with the sheep aboard, found as left, sails a whole lap past the houseboat with its gull, the lighthouse and the log, and is tapped on the way.
        await open(d, save({ lighthouse: ['sea', -3, -3], boat: ['sea', 5.75, 0], sheep: ['boat', 0, 0], tree: ['sea', 3, 3], house: ['sea', 0, 4.25] }, 0.8))
        await d.wait(5000)
        await d.tap(await toy(d, 'boat'))
        await d.wait(7500)
      },
    },
  ],
}

export default audit
