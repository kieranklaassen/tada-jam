// Hungry Hole's intersection audit. The moments start from saved streets, so
// each reaches its state at once: a first visit left idle (the glow and the
// ghost hand), things eaten, the mouth straining at the foot of things too
// wide for it, the big things eaten last, a burp at the foot of a thing (it
// steps aside), a thing tipping in beside a stack that rides (the stack is
// let down first), a tower burped up, left to bob, let down and walked, each
// thing of a standing stack touched by itself, the things of a riding stack
// touched as the hole is tapped under them, a tall stack let down on the
// fullest street (the things in its way step out), that stack touched while
// it hangs and the march touched while it walks, the three secrets (the
// march, the long bounce, the mayor's peek), every bystander touched (the
// gate rattles its bars on an ordinary street), the
// mayor for each place his hat can be, the gate keeper saluting, fanning and
// with his fingers in his ears in each of his three fidgets, the float
// watched to its end and the bare street left idle, the next street watched
// coming in, both scenes ended by a touch, a finished street found again, the
// fullest street coming in, and the tower of that whole street burped up,
// with the eye lifted and drawn back for it, and gone out as a float.
//
// The audit loads `seed=1`, and the Mount starts the bystanders' stream from
// the seed, each of the two with a stream of his own: which fidget each is in
// at a given second is the same on every run. `gate-keeper-in-every-fidget`
// is timed to that, and bystanders.test.ts plays the same taps at the same
// seconds on the model and holds that all nine are reached.
//
// What the audit cannot see is covered by tests in the game's folder: limbs
// and the crowd's ducking move in the vertex shader (bystanders.test.ts holds
// the mayor's arm off his head; view/carnival.test.ts holds the mayor behind
// the kerb and the gate keeper's key, hand and cap off his own head, on their
// real meshes and with the hole on every side of him), motion.test.ts and
// play.test.ts hold the room a thing keeps to when it leans, and
// scenes.test.ts holds the ways the things take in from the gate clear of
// everything that stands. play.test.ts also holds, frame by frame, that no
// thing is in another or in the stack on the breath while a stack is let down
// and things step out of its way or out from under a burp, on full streets and
// in minutes of play as it comes; and view/carnival.test.ts holds that no
// face of a thing lies in the plane of a face of a thing it touches, in a
// tower and in a float, however far the eye has drawn back.

import { KIND, seatOf } from '../../../games/hungry-hole/kinds.ts'
import { CROWD, GATE, KEEPER, MAYOR } from '../../../games/hungry-hole/places.ts'
import type { Driver, Frac, GameAudit } from '../types.ts'

const SLOT = 'tada-jam:slot:hungry-hole'
type Kind = keyof typeof KIND
type Standing = { parts: Kind[]; x: number; z: number }
type World = { position?: string; finished?: boolean; seed?: number; hole?: { x: number; z: number }; belly?: Kind[]; breath?: Kind[]; street?: Standing[] }

/** The emptiest street's nine things, each alone: the big ones along the far side, the small ones along the near kerb. */
const DRUMMER: Standing = { parts: ['drummer'], x: -4.8, z: -0.7 }
const TUBA: Standing = { parts: ['tuba'], x: -2.2, z: -0.95 }
const BALLOON_A: Standing = { parts: ['balloon'], x: 0.3, z: -1.1 }
const BALLOON_B: Standing = { parts: ['balloon'], x: 2.9, z: -1.1 }
const DOG: Standing = { parts: ['dog'], x: -4.6, z: 2.1 }
const HAT: Standing = { parts: ['hat'], x: -2.4, z: 2.2 }
const PIE_A: Standing = { parts: ['pie'], x: -0.6, z: 2.2 }
const PIE_B: Standing = { parts: ['pie'], x: 1.2, z: 2.2 }
const PIE_C: Standing = { parts: ['pie'], x: 3.0, z: 2.2 }
const FEW: Standing[] = [DRUMMER, TUBA, BALLOON_A, BALLOON_B, DOG, HAT, PIE_A, PIE_B, PIE_C]
/** The same nine in the order a child eats them, smallest first: burped up, the first eaten ends at the bottom. */
const EATEN: Kind[] = ['pie', 'pie', 'pie', 'hat', 'dog', 'balloon', 'balloon', 'tuba', 'drummer']
const HOLE = { x: 5.2, z: 1.5 }
/** The fullest street's thirteen things in the order a child eats them. */
const MANY: Kind[] = ['pie', 'pie', 'pie', 'pie', 'hat', 'dog', 'dog', 'dog', 'balloon', 'balloon', 'tuba', 'tuba', 'drummer']
/** The fullest street as it is laid from seed 1, without a pie and the two balloons: ten things. */
const CROWDED: Standing[] = [
  { parts: ['drummer'], x: -4.86, z: -0.69 }, { parts: ['tuba'], x: -2.17, z: -0.88 }, { parts: ['tuba'], x: 0.48, z: -0.86 },
  { parts: ['dog'], x: -3.59, z: 2.17 }, { parts: ['dog'], x: -1.8, z: 2.11 }, { parts: ['dog'], x: 0.02, z: 2.18 }, { parts: ['hat'], x: 1.7, z: 2.26 },
  { parts: ['pie'], x: 3.15, z: 0.93 }, { parts: ['pie'], x: 4.6, z: 2.24 }, { parts: ['pie'], x: 4.51, z: 0.75 },
]

/** A save as the game writes it (save.ts). */
function save(world: World): object {
  return { v: 1, position: world.position ?? 'few', finished: world.finished ?? false, seed: world.seed ?? 3, hole: world.hole ?? HOLE, belly: world.belly ?? [], breath: world.breath ?? [], street: world.street ?? [] }
}

/** Opens the game on a saved street. The first reload lets the game's own last save land, so it cannot write over the second. */
async function open(d: Driver, world: World | null): Promise<void> {
  await d.reload()
  await d.reload({ [SLOT]: world ? save(world) : null })
  await d.wait(400)
}

async function at(d: Driver, x: number, y: number, z: number): Promise<Frac> {
  const p = await d.page.evaluate((q) => (window as unknown as { __jamAudit: { projectFrac(p: number[]): number[] } }).__jamAudit.projectFrac(q), [x, y, z])
  return [p[0], p[1]]
}

const street = (d: Driver, x: number, z: number) => at(d, x, 0, z)
const thing = (d: Driver, standing: Standing) => at(d, standing.x, 0.3, standing.z)
/** How high the bottom of a stack hangs where it rode, before it hops down: `HOVER` in the game's play.ts. */
const HOVER = 0.7
/** One thing of a stack, where the eye meets it first: the middle of its front, as pick.ts measures it. `lift` is how far above the street the stack is. */
function part(d: Driver, stack: Standing, index: number, lift = 0): Promise<Frac> {
  const kind = stack.parts[index], foot = seatOf(stack.parts, index), top = index < stack.parts.length - 1 ? seatOf(stack.parts, index + 1) : foot + KIND[kind].height
  return at(d, stack.x, lift + (foot + top) / 2, stack.z + Math.max(0.55, KIND[kind].width / 2) - 0.05)
}
const mayor = (d: Driver) => at(d, (MAYOR.x0 + MAYOR.x1) / 2, MAYOR.floor + 3 * MAYOR.size, MAYOR.z + 0.5)
const keeper = (d: Driver) => at(d, KEEPER.x, 2.6, KEEPER.z)
const gate = (d: Driver) => at(d, GATE.x + 0.6, 1.5, GATE.z)
const head = (d: Driver, which: number) => at(d, CROWD[which].x, 2 * CROWD[which].size, CROWD[which].z)

/**
 * A tap on the hole where it lies: the burp. With a stack riding over the mouth the tap lands on a thing of the
 * stack, which answers as itself and takes the touch for the hole it hides (view/carnival.test.ts plays these taps
 * through the eye on the model).
 */
async function burp(d: Driver, hole: { x: number; z: number }, times: number, pause = 600): Promise<void> {
  for (let i = 0; i < times; i++) {
    await d.tap(await street(d, hole.x, hole.z))
    await d.wait(pause)
  }
}

const without = (...gone: Standing[]): Standing[] => FEW.filter((standing) => !gone.includes(standing))

const audit: GameAudit = {
  enforce: true,
  query: 'tier=0&seed=1',
  childAge: 4,
  sampleMs: 200,
  ignore: [
    // The street itself: one flat plane under everything, with the kerb stripes painted on it.
    '^ground',
    // The hole is cut out of the street in the paint, and what goes in passes down through its dark inside and its lip.
    '^pit', '^rim',
    // The breath a stack rides on: a soft column the stack sits in.
    '^breath',
    // Flat decals drawn over whatever is under them: contact shadows and cream smears, and the idle ladder's glow rings.
    '^shadows', '^glow',
    // Scraps of paper in the air, which fall through everything.
    '^scraps',
    // The demonstration hand is drawn last, over the scene.
    '^hand',
  ],
  allow: [
    {
      a: '^thing:', b: '^thing:', kind: 'pose', upTo: 0.8,
      reason: 'The things of one stack are worn and used by each other: a hat down over the eyes, a thing sitting in the upturned hat or in the tuba\'s bell, the drummer astride, a pie squashed flat under the rest. The things of a float lie tipped onto each other in the same way.',
    },
    {
      a: 'thing:drummer', b: '^thing:', kind: 'pose', upTo: 1.5,
      reason: 'The drummer sits astride the thing below him with a leg out to either side. His legs are turned in the vertex shader, so the audit reads them hanging straight down through what he sits on.',
    },
    {
      a: '^tag:belly', upTo: 1,
      reason: 'The last thing eaten is a dim shape down in the mouth. A thing on its way in or coming up passes it there, below the street.',
    },
    {
      a: '^mayor', b: '^setting', upTo: 1,
      reason: 'The mayor stands inside his stand: its boards hide him from the middle down, the arm at his side hangs wholly inside it, and his hand rests on its rail. The crowd is a mesh of its own, so this allows nothing that touches an onlooker.',
    },
    {
      a: 'mayor:(pupils|brows|mouth|moustache|tuft)$', b: 'mayor:(head|mouth|moustache)$', kind: 'pose', upTo: 0.6,
      reason: 'The pieces of the mayor\'s face are set into his head and slide on it as he looks, frowns and gapes; his moustache hangs over his mouth.',
    },
    {
      a: 'mayor:(arm|upper|fore)$', b: 'mayor:(body|head|moustache)$', kind: 'pose', upTo: 0.35,
      reason: 'The mayor\'s arms grow out of his shoulders, and his glove lies on his crown, cupped at his mouth beside his moustache, or over his eyes.',
    },
    {
      a: 'keeper:(pupils|brows|mouth|cap)$', b: 'keeper:(head|brows)$', kind: 'pose', upTo: 0.6,
      reason: 'The pieces of the gate keeper\'s face are set into his head, and his cap sits on it, down to his brows.',
    },
    {
      a: 'keeper:(key|bar):(upper|fore)$', b: 'keeper:(body|head|key|cap)$', kind: 'pose', upTo: 0.4,
      reason: 'The gate keeper\'s arms grow out of his shoulders; his hands hold the key and the cap, and his fingers go in his ears.',
    },
    {
      a: '^keeper', b: '^setting', upTo: 0.3,
      reason: 'The gate keeper holds the bar on the gate post in one hand, and his stilts stand on the pavement.',
    },
    {
      a: '^gate:leaf', b: '^setting', upTo: 0.3,
      reason: 'Each leaf of the gate hangs on its post.',
    },
  ],
  moments: [
    // A first visit left alone: the street laid from the seed, the glow on the hole and the nearest pie, then the ghost hand's tap.
    { name: 'first-visit-idle', run: async (d) => { await open(d, null); await d.wait(9500) } },
    {
      // The hole eats what fits, smallest first, and the mouth grows: three pies, the hat (the mayor wails and calls down the hole), the dog.
      name: 'eats-what-fits',
      run: async (d) => {
        await open(d, { street: FEW })
        for (const next of [PIE_C, PIE_B, PIE_A, HAT, DOG]) {
          await d.tap(await thing(d, next))
          await d.wait(1900)
        }
        await d.wait(1500)
      },
    },
    {
      // The big ones last: the two balloons are sucked thin, the tuba goes in bell first, and the drummer turns his back and topples in.
      name: 'eats-the-big-ones',
      run: async (d) => {
        await open(d, { hole: { x: 4.6, z: 1.4 }, belly: ['pie', 'pie', 'pie', 'hat', 'dog'], street: without(PIE_A, PIE_B, PIE_C, HAT, DOG) })
        for (const next of [BALLOON_B, BALLOON_A, TUBA, DRUMMER]) {
          await d.tap(await thing(d, next))
          await d.wait(2600)
        }
        await d.wait(1200)
      },
    },
    {
      // Too wide for the empty mouth: called to the tuba, the mouth stops at its foot and tugs at it, lip stretched and the tuba teetering; a second tap tugs again; a drag leads it round the tuba's foot to its near side, and a second carries it on to between the tuba and the drummer, at the drummer's foot; a tap on the drummer; then away, and a tap on the empty hole is a hiccup.
      name: 'too-wide-on-the-rim',
      run: async (d) => {
        await open(d, { street: FEW })
        await d.tap(await thing(d, TUBA))
        await d.wait(2200)
        await d.tap(await at(d, TUBA.x, 0.8, TUBA.z))
        await d.wait(2000)
        await d.drag(await street(d, TUBA.x, TUBA.z), await street(d, TUBA.x + 0.2, TUBA.z + 0.9), 700)
        await d.wait(2200)
        await d.drag(await street(d, TUBA.x + 0.2, TUBA.z + 1.6), await street(d, (TUBA.x + DRUMMER.x) / 2, -0.95), 900)
        await d.wait(2200)
        await d.tap(await at(d, DRUMMER.x, 1.6, DRUMMER.z))
        await d.wait(2200)
        await d.tap(await street(d, 4, 0.6))
        await d.wait(1500)
        await d.tap(await street(d, 4, 0.6))
        await d.wait(1200)
      },
    },
    {
      // A burp while the hole lies at the feet of the drummer and the tuba, both too wide for it, where it comes to rest between them: the hat would hang against both, so the drummer shuffles back and the tuba steps out into the street, one after the other, while the hat waits down in the mouth; then two pies come up under it, and the stack is let down.
      name: 'burp-under-a-thing',
      run: async (d) => {
        const hole = { x: -3.14, z: 0.35 }
        await open(d, { hole, belly: ['pie', 'pie', 'hat'], street: without(PIE_A, PIE_B, HAT) })
        await d.wait(800)
        await burp(d, hole, 3, 900)
        await d.wait(2500)
        await d.tap(await street(d, 2, 1))
        await d.wait(3500)
      },
    },
    {
      // A thing tipping in beside a stack that rides: a wide mouth with a pie on its breath is dragged a little way, which brings a pie on the street over the mouth. The riding pie is let down first, and the other goes in when it is out of the way.
      name: 'tips-in-beside-a-riding-stack',
      run: async (d) => {
        const hole = { x: 0, z: 0.6 }
        await open(d, {
          position: 'many', hole, belly: ['tuba', 'tuba', 'balloon', 'balloon', 'dog', 'dog'], breath: ['pie'],
          street: [{ parts: ['pie'], x: hole.x + 1.45, z: hole.z }, { parts: ['drummer'], x: -4.8, z: -0.7 }, { parts: ['dog'], x: -4.6, z: 2.1 }, { parts: ['hat'], x: -2.6, z: 2.2 }, { parts: ['pie'], x: 3.4, z: 2.2 }, { parts: ['pie'], x: 5, z: 2.2 }],
        })
        await d.wait(1000)
        await d.drag(await street(d, hole.x, hole.z), await street(d, hole.x + 0.36, hole.z), 500)
        await d.wait(3000)
      },
    },
    {
      // A tower of five burped up thing by thing, left to bob, let down when the hole is led away, walked to the place where it covers nothing, then called for again and eaten whole.
      name: 'tower-rides-and-is-let-down',
      run: async (d) => {
        const hole = { x: 1.6, z: 0.6 }
        await open(d, { hole, belly: ['pie', 'pie', 'pie', 'hat', 'dog'], street: without(PIE_A, PIE_B, PIE_C, HAT, DOG) })
        await burp(d, hole, 5, 700)
        await d.wait(3200)
        await d.tap(await street(d, -2.5, 1.2))
        await d.wait(3500)
        // Where the model sets it down (the game's pick and rules, played on the same taps): a finger on the dog on top calls the hole, and the stack goes in whole.
        await d.tap(await part(d, { parts: ['pie', 'pie', 'pie', 'hat', 'dog'], x: 5.05, z: 1.46 }, 4))
        await d.wait(2500)
      },
    },
    {
      // Each thing of a standing stack under a finger by itself: the pie on top, the hat in the middle and the dog underneath, and then the tuba, the drummer on it and the balloon above them. The mouth comes to the foot of each stack, too narrow for either.
      name: 'stack-touched-part-by-part',
      run: async (d) => {
        const low: Standing = { parts: ['dog', 'hat', 'pie'], x: 1.5, z: 0.8 }, high: Standing = { parts: ['tuba', 'drummer', 'balloon'], x: -2.6, z: -0.2 }
        await open(d, { street: [BALLOON_A, PIE_B, PIE_C, low, high] })
        // From the top down. Played on the model through pick.ts, each of the six taps lands on the thing it is meant for.
        for (const index of [2, 1, 0]) {
          await d.tap(await part(d, low, index))
          await d.wait(1300)
        }
        for (const index of [2, 1, 0]) {
          await d.tap(await part(d, high, index))
          await d.wait(1500)
        }
      },
    },
    {
      // The long bounce let down on the fullest street, where no spot is clear for a stack that tall: the saved street is one the game writes, with the stack riding clear of every thing. It hangs where it rode while the two pies in its way step out, one on the ground and one over a pie, and then comes down. play.test.ts plays the same tap on the model and holds that nothing is in anything at any frame of it.
      name: 'set-down-on-a-crowded-street',
      run: async (d) => {
        await open(d, { position: 'many', hole: { x: 4, z: -1 }, breath: ['balloon', 'pie', 'balloon'], street: CROWDED })
        await d.wait(1200)
        await d.tap(await street(d, 5.5, 1.8))
        await d.wait(5000)
      },
    },
    {
      // A thing touched while it hangs and while it walks answers in motion as well as sound. The tall stack let down on
      // the fullest street hangs where it rode while the things behind it step out, and the second tap lands on its bottom
      // balloon there, with no wait between the two; the march is touched on its dog as it walks, where the dog is found,
      // or on the spot the model sets it down on. view/carnival.test.ts plays both taps on the model, at this step and with this camera.
      name: 'touched-while-it-hangs-and-walks',
      run: async (d) => {
        await open(d, { position: 'many', hole: { x: 4, z: -1 }, breath: ['balloon', 'pie', 'balloon'], street: CROWDED })
        await d.wait(1200)
        await d.tap(await street(d, 5.5, 1.8))
        await d.tap(await part(d, { parts: ['balloon', 'pie', 'balloon'], x: 4, z: -1 }, 0, HOVER))
        await d.wait(4000)
        await open(d, { hole: { x: 1.5, z: 1.1 }, belly: ['pie', 'pie'], breath: ['dog', 'tuba', 'drummer'], street: without(DOG, TUBA, DRUMMER, PIE_B, PIE_C) })
        await d.wait(1200)
        await d.tap(await street(d, 3.5, 1.4))
        await d.wait(1200)
        await d.tap((await d.find('thing:dog')) ?? (await at(d, -1.85, KIND.dog.height / 2, 0.08)))
        await d.wait(3500)
      },
    },
    {
      // The march: the dog, the tuba and the drummer let down as one stack walk eight steps. The save is one the game writes: the stack rides clear of every thing, with two pies eaten to make that room.
      name: 'secret-march',
      run: async (d) => {
        await open(d, { hole: { x: 1.5, z: 1.1 }, belly: ['pie', 'pie'], breath: ['dog', 'tuba', 'drummer'], street: without(DOG, TUBA, DRUMMER, PIE_B, PIE_C) })
        await d.wait(1200)
        await d.tap(await street(d, 3.5, 1.4))
        await d.wait(5000)
      },
    },
    {
      // The long bounce: a balloon under and a balloon on top.
      name: 'secret-bounce',
      run: async (d) => {
        await open(d, { hole: { x: -1, z: 1 }, breath: ['balloon', 'pie', 'balloon'], street: without(BALLOON_A, BALLOON_B, PIE_A) })
        await d.wait(1200)
        await d.tap(await street(d, 2.5, 1.2))
        await d.wait(4500)
      },
    },
    {
      // The peek: the pie comes up on the hat on the dog, and the mayor covers his eyes.
      name: 'secret-peek',
      run: async (d) => {
        const hole = { x: 1, z: 0.8 }
        await open(d, { hole, belly: ['dog', 'hat', 'pie'], street: without(DOG, HAT, PIE_A) })
        await burp(d, hole, 3, 900)
        await d.wait(3500)
      },
    },
    {
      // Every bystander under a finger: the mayor pats his crown, the gate keeper salutes, the gate rattles its bars (on this ordinary street as on a bare one), a far head and a near head duck.
      name: 'bystanders-touched',
      run: async (d) => {
        await open(d, { street: FEW })
        await d.tap(await mayor(d))
        await d.wait(1800)
        await d.tap(await keeper(d))
        await d.wait(1500)
        await d.tap(await gate(d))
        await d.wait(1500)
        await d.tap(await head(d, 2))
        await d.wait(1200)
        await d.tap(await head(d, 11))
        await d.wait(1500)
      },
    },
    {
      // The mayor for each place his hat can be: on the dog (he shakes with laughter), under a pie (he clutches his crown), in the hole (he calls down it), alone on the breath.
      name: 'mayor-and-his-hat',
      run: async (d) => {
        await open(d, { street: [...without(DOG, HAT), { parts: ['dog', 'hat'], x: -4.4, z: 1.7 }] })
        await d.wait(3000)
        await open(d, { street: [...without(PIE_A, HAT), { parts: ['hat', 'pie'], x: -2.4, z: 1.9 }] })
        await d.wait(3000)
        await open(d, { hole: { x: -4.5, z: 0.9 }, belly: ['pie', 'hat'], street: without(PIE_A, HAT) })
        await d.wait(3000)
        await open(d, { hole: { x: -1, z: 0.8 }, belly: ['pie'], breath: ['hat'], street: without(PIE_A, HAT) })
        await d.wait(3000)
      },
    },
    {
      // The gate keeper: fingers in his ears and the key on the pavement when the drummer is touched, and fanning with his cap after a burp.
      name: 'gate-keeper-reacts',
      run: async (d) => {
        const hole = { x: 3.2, z: 0.9 }
        await open(d, { hole, belly: ['pie'], street: without(PIE_A) })
        await d.tap(await at(d, DRUMMER.x, 1.6, DRUMMER.z))
        await d.wait(600)
        await d.tap(await street(d, hole.x, hole.z + 1.2))
        await d.wait(2500)
        await burp(d, { x: hole.x, z: hole.z + 1.2 }, 1, 2500)
      },
    },
    {
      // The gate keeper in each of his three fidgets (craning his neck, swaying like a stork, jingling the key), and in each: a tap on him (he salutes, and the hole comes to the kerb at his feet), a tap on the hole there (he fans the burp away), a tap on the drummer (fingers in his ears, the key on the pavement), and a tap on bare street, which calls the hole from the drummer's foot so that he takes his fingers out again.
      // With seed 1 he cranes from 2.0 s to 5.8 s after the page opens, sways to 9.2 s and jingles to 12.6 s. `open` ends about half a second in. bystanders.test.ts plays these taps at these seconds on the model, a third of a second early and late as well, and holds that all nine are reached: change the two together.
      name: 'gate-keeper-in-every-fidget',
      run: async (d) => {
        const hole = { x: 2.2, z: -1.95 }, drummer: Standing = { parts: ['drummer'], x: -0.6, z: 0.3 }, away = { x: 5.6, z: 1.9 }
        await open(d, { hole, belly: ['pie', 'pie', 'pie'], street: [drummer] })
        // Seconds after the page opens: 2.2, 2.8, 3.55, 4.1; 6.0, 6.6, 7.35, 7.9; 9.4, 10.0, 10.75, 11.3; the end at 12.5. A tap takes a tenth of a second itself.
        for (const before of [1700, 1800, 1400]) {
          await d.wait(before)
          await d.tap(await keeper(d))
          await d.wait(500)
          await d.tap(await street(d, hole.x, hole.z))
          await d.wait(650)
          await d.tap(await at(d, drummer.x, 1.6, drummer.z))
          await d.wait(450)
          await d.tap(await street(d, away.x, away.z))
        }
        await d.wait(1100)
      },
    },
    {
      // The whole street on the breath, the hole led away: the tower drops, tips into a float and rolls out through the gate; then the bare street left idle until the gate keeper and the gate glow and the hand taps him.
      name: 'float-goes-out',
      run: async (d) => {
        await open(d, { hole: { x: 0, z: 0.6 }, breath: EATEN })
        await d.wait(1000)
        await d.tap(await street(d, -4.5, 1.6))
        await d.wait(9500)
        await d.wait(8000)
      },
    },
    {
      // From there a tap on the gate keeper: the next street, one step fuller, comes in thing by thing.
      name: 'next-street-comes-in',
      run: async (d) => {
        await d.tap(await keeper(d))
        await d.wait(9000)
      },
    },
    {
      // Both scenes ended by a touch: the float in the middle of rolling out, and the coming in with half the things still behind the gate.
      name: 'scenes-ended-by-a-touch',
      run: async (d) => {
        await open(d, { hole: { x: 0, z: 0.6 }, breath: EATEN })
        await d.tap(await street(d, -4.5, 1.6))
        await d.wait(4200)
        await d.tap(await street(d, -2, 1.5))
        await d.wait(1500)
        await d.tap(await gate(d))
        await d.wait(2200)
        await d.tap(await street(d, 0, 0.5))
        await d.wait(2500)
      },
    },
    {
      // A finished street found again: bare, the gate shut, two things waiting behind the bars; and from it the fullest street comes in, thirteen things.
      name: 'found-bare-then-the-fullest-street',
      run: async (d) => {
        await open(d, { position: 'many', finished: true, seed: 5, hole: { x: -3, z: 1 } })
        await d.wait(2500)
        await d.tap(await keeper(d))
        await d.wait(10500)
        await d.wait(4500)
      },
    },
    {
      // The tower of the whole fullest street, thirteen things, burped up thing by thing near the far kerb: the eye lifts and draws back so that its top is seen below the home control. Left to bob, then the hole is led away and it goes out as a float, the eye coming back.
      name: 'tallest-tower-stays-in-the-frame',
      run: async (d) => {
        const hole = { x: 0.5, z: -1.2 }
        await open(d, { position: 'many', hole, belly: MANY })
        // The frame moves as the tower grows, so the hole is found where it is drawn each time.
        for (let i = 0; i < MANY.length; i++) {
          await d.tap(await street(d, hole.x, hole.z))
          await d.wait(450)
        }
        await d.wait(3000)
        await d.tap(await street(d, -4.5, 1.6))
        await d.wait(10000)
      },
    },
  ],
}

export default audit
