// Sand Kingdom's intersection audit.
//
// What it reads. The things that are meshes: the bucket, the three shells, the
// two pieces of driftwood, the rocks with their pebbles and the gulls' log
// (one fixed mesh, one object), the rock the eel lives in with its hole (a
// mesh of its own, so that the eel in its own rock is told from the eel in
// any other) and each of the folk, each one object. The sand
// and the sea are drawn in the vertex shader from a height map (the meshes the
// audit can read are a smooth slope and a level sheet), so they are left out
// here, and what stands on, in and under the sand is held by the game's own
// model tests (grid.test.ts, scenes.test.ts, evening.test.ts, frame.test.ts).
//
// Claim one: the moments reach every state in which two of those meshes can
// come together.
//   By day: a first visit with its idle ladder; each of the folk poked at its
//   place; the bucket filled, carried full over a shell and over a bough and
//   set down beside each, turned out there (the shell shoots out; the tower
//   stands across the bough), knocked empty against a bough, carried through
//   the sea, and stacked to a third tier that falls; a shell pressed, flipped,
//   dragged, scooped and stuck in a tower's side; a bough rocked, carried and
//   laid as a bridge; a shell and a bough each dragged into the standing
//   bucket and let go there, a shell onto a shell and on through it, a bough
//   across the other bough, a shell over a bough and a bough over a shell,
//   and each dragged at the crab, onto the starfish's rock and up to the
//   gulls' log; the bucket dragged at the starfish on its rock and at the
//   gulls on their log.
//   At evening: the full bucket turned out on a first visit and the sun sent
//   down, so that the starfish leaps onto the tower the bucket stands by,
//   lies there turned to it, is poked, and has the bucket dragged round to
//   its other side; the folk coming to a kingdom that is right for each; that
//   evening going on, with the tower patted away from under the starfish; a
//   shell, a bough and the empty bucket dragged at the crab on its bank and
//   let go on it, a shell and a bough through the gulls on their wall, and a
//   shell onto the starfish on its tower; a bough set down on the crab's bank
//   on either side of the tower, so that the crab steps round it under the
//   arms of the starfish and, on the far bank, puts one shell back and comes
//   to the next, and the starfish poked there; an evening where each thing
//   is a little wrong (the crab stamping at the gap and wearing a shell, the
//   starfish on the crab's back, the gulls sliding off a lumpy wall); the
//   bored small crabs; driftwood carried up a channel by the water, while
//   the crab walks up and over a long wall of heaped sand that stands between
//   its day place and the channel; a bough laid across the crab's bank on
//   either side of it, so that it is cut off, digs itself in to the top of
//   its legs and looks about with its eyes out; a bough laid across a short
//   groove, so that the eel has water long enough for it on one side only.
//   The sun: turned round on its way up; the tide going out with its one long
//   wave, as the crab that had dug itself in comes up and goes home; the tide
//   going out while the crab wears a shell, after the crab was poked under
//   it; and the tide going out while a bough laid in the channel is still
//   adrift.
//   Not reached, and said here so the claim is no wider than it is: the
//   crab climbing over a bough (it does so only to get out of a pocket on
//   its way home, and no beach here has one that two boughs and the bucket
//   can shut; crab.test.ts holds the climb in a ring of boughs), a tower
//   turned out against a shell that is hemmed in on every side (the shell is
//   left lying and nothing moves), a second shell laid at the feet of the
//   crab while it wears one (clear.test.ts holds it), and two fingers at once
//   (the game takes one).
//
// Claim two: nothing in the game touches anything else on purpose, but for
// the list below. Whatever is carried is lifted over what it comes to and set
// down beside it; whatever walks goes round; whatever rests lies on top, at
// most 0.02 into what holds it (the starfish's seat on its rock, a tower or
// the crab's shell), which is under this audit's tolerance and has no rule.
// The gulls' feet stand on their log, the shell the crab wears rests on its
// eyes, and the eel's nose stops short of the driftwood it sniffs at: none of
// those has a rule either, because none is meant to be in the other. The
// game's tests hold each of these in every frame (clear.test.ts,
// through.test.ts), on shapes that solid.test.ts holds to these meshes.
//
// The list. An allowance here is for a contact the game makes on purpose, and
// its cap is the depth that contact has by design, as a share of the smaller
// piece, rounded up to the next 0.05. Two are between two objects: the eel
// inside its own rock, and the small rocks set into the foot of that rock,
// which never move. The eel in any other rock, a pebble or the log has no
// rule (clear.test.ts holds that it is in none). The rest are the joints of
// one animal's own body, where one lump of it is set in another; for those
// the audit measures how much the depth changes as the joint moves, and each
// cap is that change over the joint's whole travel, which the reason gives.
// No cap comes from what a run
// happened to print. A pair of an animal's own parts that is not named below
// has no allowance: an eye against a claw or the other eye, a claw against a
// leg, a wing against a head, an arm of the starfish against its eyes.
//
// The seed of the game's chance is pinned in the address, so that a finding
// can be played again before and after its fix. A moment that needs a built
// beach starts from the game's own start-from hook, `beach=<name>` in the
// address (games/sand-kingdom/beaches.ts), and not from a written slot: the
// shell saves on page exit and would overwrite one. The places below are the
// ones beaches.ts and things.ts give.

import type { Driver, Frac, GameAudit } from '../types.ts'

type Audit = { projectFrac(p: number[]): number[] }

/** The smooth beach's height at a depth, as games/sand-kingdom/field.ts has it. */
const base = (z: number) => 0.1 * (z + 3)

async function at(d: Driver, x: number, z: number, up = 0): Promise<Frac> {
  const p = await d.page.evaluate((q) => (window as unknown as { __jamAudit: Audit }).__jamAudit.projectFrac(q), [x, base(z) + up, z])
  return [p[0], p[1]]
}
/** The sun on the sky, which is drawn in the sky's shader: `down` is 0 where it stands by day and 1 on the sea. */
async function sun(d: Driver, down: number): Promise<Frac> {
  const p = await d.page.evaluate((q) => (window as unknown as { __jamAudit: Audit }).__jamAudit.projectFrac(q), [-8.2, 2.3 + (0.2 - 2.3) * down, -14])
  return [p[0], p[1]]
}
async function thing(d: Driver, pattern: string, fallback: Frac = [0.5, 0.7]): Promise<Frac> {
  return (await d.find(pattern)) ?? fallback
}
const bucket = (d: Driver) => thing(d, 'bucket-pail')
const shell = (d: Driver, index: number) => thing(d, `^things>shell-${index}`)
const wood = (d: Driver, index: number) => thing(d, `^things>driftwood-${index}`)

/** Waits, for a minute at most, until the crab has a shell on its eyes: one of the shells is drawn where its eye is. */
async function worn(d: Driver): Promise<void> {
  for (let i = 0; i < 120; i++) {
    await d.wait(500)
    const left = await d.find('crab-eye-left'), right = await d.find('crab-eye-right')
    if (!left || !right) continue
    // A shell on its eyes is drawn just over them; one lying beside the crab is at least three times as far off.
    for (const index of [0, 1, 2]) {
      const lies = await d.find(`^things>shell-${index}`)
      if (lies && Math.hypot(lies[0] - (left[0] + right[0]) / 2, lies[1] - (left[1] + right[1]) / 2) < 0.06) return
    }
  }
}

/** The moat of the built kingdom and how far out its bank is walked, as games/sand-kingdom/beaches.ts and the crab's line have them. */
const MOAT = { x: 0, z: 3.45, bank: 2.4 }
/** How far up and down the beach from the crab a bough is laid to cut it off: a crab's breadth and the bough's own, with a little over. */
const CUT_OFF = 1.5

/** Where on the bank of the kingdom's moat the crab stands now: the point of the bank that is drawn nearest its shell. */
async function onBank(d: Driver): Promise<[number, number]> {
  const crab = await thing(d, 'crab-body')
  let best: [number, number] = [MOAT.x - MOAT.bank, MOAT.z], gap = Infinity
  for (let i = 0; i < 72; i++) {
    const turn = (i / 72) * Math.PI * 2, x = MOAT.x + Math.cos(turn) * MOAT.bank, z = MOAT.z + Math.sin(turn) * MOAT.bank
    const p = await at(d, x, z, 0.4)
    const off = Math.hypot(p[0] - crab[0], p[1] - crab[1])
    if (off < gap) {
      gap = off
      best = [x, z]
    }
  }
  return best
}

/** Opens the game again on a built beach, or on the child's own with no name. */
async function open(d: Driver, beach: string | null): Promise<void> {
  await d.page.evaluate((name) => {
    const url = new URL(window.location.href)
    if (name) url.searchParams.set('beach', name)
    else url.searchParams.delete('beach')
    window.history.replaceState(null, '', url)
  }, beach)
  await d.reload()
}

export default {
  enforce: true,
  // The full look, and the game's chance pinned so that a run can be played again.
  query: 'tier=0&seed=7',
  // The youngest: the bucket stands heaped full on a first visit.
  childAge: 3,
  // Drawn in the vertex shader or as light on the water: see the header.
  ignore: ['^beach$', '^sea$', '^sky$', '^grass$', '^rings', '^grains', '^ghost-hand$'],
  allow: [
    // Between two objects, one contact.
    {
      a: '^eel',
      b: '^hole-rock$',
      upTo: 1.35,
      reason: 'The eel lives inside its own rock and threads the hole through it: drawn in to the end of its neck, the whole of its head is inside the stone. That rock, with its hole, is a mesh of its own. It is 1.29 from its middle to its top, so no point in it is deeper than that; over the head\'s 0.96 that is 1.35. The eel in any other rock, a pebble or the log has no allowance.',
    },
    {
      a: '^rocks$',
      b: '^hole-rock$',
      upTo: 0.25,
      reason: 'The two small rocks at the feet of the eel\'s rock are one pile of stone with it, and none of them ever moves. Each is set into its side: the left one\'s middle is 2.15 from the big rock\'s and the right one\'s 1.95, where the big rock reaches 2.05. The shortest way out for the deeper of the two is 0.58; over the 2.66 the eel\'s rock measures from front to back that is 0.22.',
    },
    // The joints of one body. The measure is how much the depth changes as the joint moves.
    {
      a: 'crab-eye',
      b: 'crab-body',
      kind: 'pose',
      upTo: 0.25,
      reason: 'Each eye stalk stands on the top of the crab\'s shell with its foot in it. Pulled in, the eye is drawn down to the shell; out, the stalk leans about its foot, up to 0.6 forward, and the edge of the foot goes up to 0.10 into the shell. Over an eye 0.40 across that is 0.25.',
    },
    {
      a: 'crab-claw',
      b: 'crab-body',
      kind: 'pose',
      upTo: 0.2,
      reason: 'The arm of each claw is set in the side of the shell: 0.11 in with the claw held low, and drawn up out of it with the claw held high. A claw is 0.77 across open and 0.64 snapped shut; over the shut claw that is 0.17.',
    },
    {
      a: 'crab-legs',
      b: 'crab-body',
      kind: 'pose',
      upTo: 0.2,
      reason: 'The three legs of a side are set in the side of the shell and swing about where they leave it: as they step and as the body leans over them their roots are between 0.08 and 0.15 in it, a change of 0.07. A leg that reaches down for sand that lies lower than the sand under the belly, a quarter at most, slopes more steeply from its hip, and the end of its root, 0.12 inside the hip, turns up to 0.06 further into the shell with it. Together 0.13; over the legs\' 0.69 that is 0.19.',
    },
    {
      a: 'crab-mouth',
      b: 'crab-body',
      kind: 'pose',
      upTo: 0.15,
      reason: 'The crab\'s mouth is set in the front of its shell and opens: between 0.035 and 0.048 in it as it opens and as the shell squashes in a flinch. Over a mouth 0.09 across that is 0.14.',
    },
    {
      a: 'starfish-arm',
      b: 'starfish-arm',
      kind: 'pose',
      upTo: 0.15,
      reason: 'The starfish\'s five arms are one body: each lies against the next where they join its middle, between 0.10 and 0.17 into it as the arms wheel, stretch and curl, a change of 0.07. Over an arm 0.55 across that is 0.12. Its eyes, its lids and its mouth have no allowance against an arm: they are low domes in front of where the arms join, and from when an arm starts in over the face until it is out, the face shut first, none of them is drawn.',
    },
    {
      a: 'gull-\\d-head',
      b: 'gull-\\d-body',
      kind: 'pose',
      upTo: 0.2,
      reason: 'A gull\'s head sits on its shoulders, 0.10 into its body, and as it ducks it comes down in front of its breast to 0.19 in, a change of 0.09. Over a head 0.48 across that is 0.18.',
    },
    {
      a: 'gull-\\d-wing',
      b: 'gull-\\d-body',
      kind: 'pose',
      upTo: 0.15,
      reason: 'A gull\'s wing is hinged at its shoulder: folded it lies against its flank, up to 0.08 into the body when the bird squashes on landing, and spread it is clear. Over a wing 0.61 across that is 0.13.',
    },
    {
      a: 'gull-\\d-head',
      b: 'gull-\\d-jaw',
      kind: 'pose',
      upTo: 0.1,
      reason: 'The lower half of a gull\'s beak is hinged in its head: between 0.03 and 0.04 in it as the beak opens. Over a jaw 0.14 across that is 0.08.',
    },
    {
      a: 'eel-head',
      b: 'eel-mouth',
      kind: 'pose',
      upTo: 0.2,
      reason: 'The eel\'s mouth is set in the front of its head and opens in a yawn: between 0.10 and 0.13 in it. Over a mouth 0.19 across that is 0.18.',
    },
    {
      a: 'eel-lid',
      b: 'eel-pupils',
      kind: 'pose',
      upTo: 0.15,
      reason: 'An eel\'s lid comes down over its eye, and the pupil under it still moves as it looks about: between 0.12 and 0.14 into the lid. Over pupils 0.19 across that is 0.11.',
    },
    {
      a: 'eel-head',
      b: 'eel-pupils',
      kind: 'pose',
      upTo: 0.1,
      reason: 'The eel\'s pupils sit in the whites of its eyes, which are part of its head, and move as it looks about: between 0.06 and 0.08 in them. Over pupils 0.19 across that is 0.07.',
    },
  ],
  moments: [
    {
      name: 'first-visit',
      run: async (d) => {
        // The idle ladder: the sand glows, then the ghost hand shows one stroke.
        await d.wait(9500)
        // The full bucket turned out, filled again beside its tower, and turned out a second time.
        await d.tap(await bucket(d))
        await d.wait(1200)
        await d.tap(await bucket(d))
        await d.wait(800)
        await d.tap(await bucket(d))
        await d.wait(1200)
        // A groove toward the crab, which runs off sideways and comes back. It starts on open sand, out of a
        // finger's reach of the bough that lies nearest.
        await d.drag(await at(d, -2.4, 3.0), await at(d, -3.2, 5.0), 700)
        await d.wait(2500)
        // A long groove across the beach, a tap in it, and a finger across it.
        await d.drag(await at(d, -2.4, 2.4), await at(d, 2.6, 2.7), 900)
        await d.wait(600)
        await d.tap(await at(d, 0, 2.55))
        await d.drag(await at(d, 0.2, 1.3), await at(d, 0.2, 3.9), 600)
        await d.wait(1200)
      },
    },
    {
      name: 'folk-and-places',
      run: async (d) => {
        await d.tap(await thing(d, 'crab-body'))
        await d.wait(1800)
        await d.tap(await thing(d, 'starfish-middle'))
        await d.wait(2400)
        await d.tap(await thing(d, 'eel-head', await at(d, -6.9, 2.2, 0.85)))
        await d.wait(2600)
        for (const index of [0, 1, 2]) {
          await d.tap(await thing(d, `^gull-${index}`))
          await d.wait(1300)
        }
        // The eel's rock, the log (whoever stands on it bounces), a cloud, the sea.
        await d.tap(await at(d, -6.2, 1.2, 1.6))
        await d.tap(await at(d, 5.6, 1.2, 0.6))
        await d.wait(900)
        await d.tap([0.6, 0.12])
        await d.tap(await at(d, 1, -4.5))
        await d.wait(3000)
      },
    },
    {
      name: 'bucket',
      run: async (d) => {
        // Filled, carried full over a shell and let go there: it rides over the top and is set down beside it. Turned out, the shell shoots out.
        await d.tap(await bucket(d))
        await d.wait(700)
        await d.drag(await bucket(d), await shell(d, 1), 800)
        await d.wait(700)
        await d.tap(await bucket(d))
        await d.wait(1600)
        // Filled, carried over driftwood and set down beside it, and turned out: the tower lies across the bough, off its middle.
        await d.tap(await bucket(d))
        await d.wait(700)
        await d.drag(await bucket(d), await wood(d, 0), 800)
        await d.wait(700)
        await d.tap(await bucket(d))
        await d.wait(1600)
        // Empty, dragged at the other piece: its rim knocks the bough and it falls away from it onto its side, and a tap stands it up.
        await d.drag(await bucket(d), await wood(d, 1), 800)
        await d.wait(1400)
        await d.tap(await bucket(d))
        await d.wait(900)
        // Empty, dragged down into the sea and back: full of water, slopping, and turned out in one sploosh.
        await d.press(await bucket(d))
        await d.move(await at(d, 3.0, 0.2), 500)
        await d.move(await at(d, 2.8, -2.6), 700)
        await d.move(await at(d, 2.4, 0.4), 700)
        await d.wait(200)
        await d.release()
        await d.wait(700)
        await d.tap(await bucket(d))
        await d.wait(1500)
        // A second tier on the first tower, and a third that brings the stack down.
        await d.tap(await bucket(d))
        await d.wait(600)
        await d.drag(await bucket(d), await at(d, 2.45, 5.45, 0.5), 700)
        await d.wait(500)
        await d.tap(await bucket(d))
        await d.wait(1500)
      },
    },
    {
      name: 'shells-and-driftwood',
      run: async (d) => {
        // Pressed in, popped out the other way up, pressed again.
        await d.tap(await shell(d, 0))
        await d.wait(700)
        await d.tap(await shell(d, 0))
        await d.wait(700)
        await d.tap(await shell(d, 2))
        await d.wait(700)
        // Dragged across the sand, ploughing a thin line, past the crab.
        await d.drag(await shell(d, 0), await at(d, -2.4, 4.4), 800)
        await d.wait(900)
        // Scooped up by the empty bucket, and turned out stuck in the side of the tower.
        await d.drag(await bucket(d), await shell(d, 2), 700)
        await d.wait(700)
        await d.tap(await bucket(d))
        await d.wait(1500)
        // Driftwood rocked, carried, and let go across the long groove: a bridge.
        await d.tap(await wood(d, 0))
        await d.wait(1500)
        await d.drag(await wood(d, 0), await at(d, -1.2, 2.5), 900)
        await d.wait(1500)
        await d.drag(await wood(d, 1), await at(d, -3.0, 3.6), 900)
        await d.wait(2000)
      },
    },
    {
      name: 'dragged-over-things',
      run: async (d) => {
        // A shell dragged into the standing bucket and let go there: it rides up over the rim and is set down beside the bucket.
        await d.drag(await shell(d, 2), await bucket(d), 900)
        await d.wait(900)
        // A bough dragged into the standing bucket and let go there.
        await d.drag(await wood(d, 0), await bucket(d), 900)
        await d.wait(900)
        // A shell dragged onto a shell and let go on it, then right through it and on.
        await d.drag(await shell(d, 0), await shell(d, 1), 900)
        await d.wait(900)
        await d.press(await shell(d, 0))
        await d.move(await shell(d, 1), 500)
        await d.move(await at(d, 1.6, 6.3), 500)
        await d.release()
        await d.wait(900)
        // A bough dragged across the other and let go on it, then a shell over a bough and a bough over a shell.
        await d.drag(await wood(d, 1), await wood(d, 0), 900)
        await d.wait(900)
        await d.drag(await shell(d, 1), await wood(d, 1), 900)
        await d.wait(900)
        await d.drag(await wood(d, 0), await shell(d, 0), 900)
        await d.wait(900)
        // A shell and a bough dragged at the crab at its day place, onto the starfish's rock and up to the gulls' log.
        await d.drag(await shell(d, 2), await thing(d, 'crab-body'), 900)
        await d.wait(900)
        await d.drag(await wood(d, 1), await thing(d, 'crab-body'), 900)
        await d.wait(900)
        await d.drag(await shell(d, 1), await thing(d, 'starfish-middle'), 900)
        await d.wait(900)
        await d.drag(await wood(d, 0), await thing(d, '^gull-1'), 900)
        await d.wait(1500)
        // The bucket dragged at the starfish on its rock and at the gulls on their log, and let go there.
        await d.drag(await bucket(d), await thing(d, 'starfish-middle'), 900)
        await d.wait(1200)
        await d.drag(await bucket(d), await thing(d, '^gull-1'), 900)
        await d.wait(1500)
      },
    },
    {
      name: 'dragged-through-the-folk',
      run: async (d) => {
        await open(d, 'evening')
        await d.wait(3000)
        // A shell dragged through the crab on its bank and let go on it: it rides over the crab and is set down beside it.
        await d.press(await shell(d, 2))
        await d.move(await thing(d, 'crab-body'), 600)
        await d.move(await thing(d, 'crab-body'), 400)
        await d.wait(300)
        await d.release()
        await d.wait(1500)
        // A bough the same, and on through the crab to the other side of it.
        await d.press(await wood(d, 0))
        await d.move(await thing(d, 'crab-body'), 700)
        await d.move(await at(d, -3.2, 2.2), 700)
        await d.release()
        await d.wait(1500)
        // The empty bucket dragged at the crab: it slides round it.
        await d.press(await bucket(d))
        await d.move(await thing(d, 'crab-body'), 700)
        await d.wait(300)
        await d.release()
        await d.wait(1500)
        // A shell and a bough dragged through the gulls on their wall, and let go there.
        await d.drag(await shell(d, 2), await thing(d, '^gull-1'), 900)
        await d.wait(1200)
        await d.press(await wood(d, 0))
        await d.move(await thing(d, '^gull-2'), 600)
        await d.move(await thing(d, '^gull-0'), 600)
        await d.release()
        await d.wait(1500)
        // A shell dragged onto the starfish on its tower, and let go there.
        await d.drag(await shell(d, 2), await thing(d, 'starfish-middle'), 900)
        await d.wait(2500)
      },
    },
    {
      name: 'the-crab-goes-by-under-the-starfish',
      run: async (d) => {
        // The starfish lies on the tower with its arms out over the edge, and the crab patrols the bank below. A
        // bough set down on the bank on either side: the crab steps round each on the tower's side, under the arms.
        await open(d, 'evening')
        await d.wait(6000)
        await d.press(await wood(d, 0))
        await d.move(await at(d, -2.3, 3.45), 700)
        await d.release()
        await d.wait(14000)
        await d.press(await wood(d, 1))
        await d.move(await at(d, 2.14, 1.49), 700)
        await d.release()
        await d.wait(14000)
        // Poked there, the starfish curls into a fist and opens out again over the crab's way.
        await d.tap(await thing(d, 'starfish-middle'))
        await d.wait(6000)
      },
    },
    {
      name: 'the-bucket-by-the-starfish-tower',
      run: async (d) => {
        // A first visit: the full bucket is turned out and stands empty beside its tower, and the sun is sent
        // down. The starfish comes to that tower, the one tower there is, with the bucket standing by.
        await open(d, 'first')
        await d.wait(1000)
        await d.tap(await bucket(d))
        await d.wait(1500)
        await d.tap(await sun(d, 0))
        await d.wait(4000 + 9000 + 12000)
        // Poked there it curls into a fist and opens out again beside the bucket.
        await d.tap(await thing(d, 'starfish-middle'))
        await d.wait(5000)
        // The bucket dragged round to the other side of the tower and let go there, under the starfish's arms.
        await d.press(await bucket(d))
        await d.move(await at(d, 1.2, 5.6), 900)
        await d.release()
        await d.wait(6000)
      },
    },
    {
      name: 'the-folk-come',
      run: async (d) => {
        // A kingdom by day: a moat with a channel, a tower of two tiers, a bridge, a patted wall.
        await open(d, 'kingdom')
        await d.wait(1500)
        await d.tap(await sun(d, 0))
        // The sun's journey, the water along the grooves, and each of the folk on its way and arriving.
        await d.wait(4000 + 9000 + 16000)
      },
    },
    {
      name: 'evening-right',
      run: async (d) => {
        await open(d, 'evening')
        // The crab round its moat, the starfish flat on the tower, the eel under the bridge and out, the gulls in a row.
        await d.wait(24000)
        await d.tap(await thing(d, 'crab-body'))
        await d.wait(1500)
        await d.tap(await thing(d, 'starfish-middle'))
        await d.wait(2400)
        await d.tap(await thing(d, '^gull-1'))
        await d.wait(2500)
        // The tower patted away from under the starfish: it lets go and finds the next best thing.
        for (let i = 0; i < 6; i++) {
          await d.tap(await at(d, 0, 3.45, 0.9 - i * 0.12))
          await d.wait(300)
        }
        await d.wait(9000)
      },
    },
    {
      name: 'evening-wrong',
      run: async (d) => {
        // An open moat the water cannot reach, a lumpy wall, no tower, a groove with nothing across, a shell on the crab's line.
        await open(d, 'wrong')
        await d.wait(1000)
        await d.tap(await sun(d, 0))
        // The crab stamps at the gap and wears the shell; the starfish rides it; the eel sniffs the wood; the gulls slide off.
        await d.wait(4000 + 9000 + 42000)
        await d.tap(await thing(d, 'starfish-middle'))
        await d.wait(3000)
      },
    },
    {
      name: 'evening-bare',
      run: async (d) => {
        await open(d, 'bare')
        // Three bored small crabs along the water line; a finger beside one makes it jump.
        await d.wait(8000)
        await d.tap(await at(d, -1.6, 1.3))
        await d.wait(3500)
      },
    },
    {
      name: 'driftwood-afloat',
      run: async (d) => {
        // Driftwood lying in a wide channel: the evening water lifts it and carries it up the channel. A long wall
        // of heaped sand stands between the crab's day place and the channel, from the sea to the top of the
        // beach: with no way round, the crab walks up and over it on its way to the channel.
        await open(d, 'walled-channel')
        await d.wait(800)
        await d.tap(await sun(d, 0))
        await d.wait(4000 + 9000 + 9000)
      },
    },
    {
      name: 'the-sun-turned-round',
      run: async (d) => {
        await open(d, 'evening')
        await d.wait(1500)
        // The sun sent up, the sea drawing back and the folk leaving, then turned round: they come back.
        await d.tap(await sun(d, 1))
        await d.wait(2600)
        await d.tap(await sun(d, 0.35))
        await d.wait(14000)
      },
    },
    {
      name: 'the-tide-goes-out',
      run: async (d) => {
        await open(d, 'evening')
        // A bough laid across the crab's bank just beyond it on either side, at once, before it has walked on:
        // between the moat and the gulls' wall it has no way round either, and no room to walk between them.
        // Cut off from its line it tries for a while, digs itself in to the top of its legs, and looks about
        // with its eyes out, each drawn in for a blink in turn.
        for (const [index, side] of [[0, 1], [1, -1]] as const) {
          const crab = await onBank(d)
          await d.press(await wood(d, index))
          await d.move(await at(d, crab[0], crab[1] + side * CUT_OFF), 300)
          await d.release()
        }
        await d.wait(16000)
        await d.tap(await sun(d, 1))
        // Sent home, it comes up with a snap and goes. The journey, the one long wave over the whole beach, and
        // the folk back at their day places.
        await d.wait(4000 + 6000 + 7000)
        // A new day: a dent in the smooth sand.
        await d.tap(await at(d, 0.5, 4))
        await d.wait(1500)
      },
    },
    {
      name: 'the-tide-goes-out-under-a-hat',
      run: async (d) => {
        // An evening where a shell lies on the crab's line. Poked while it wears the shell, its stalks stay out under it.
        await open(d, 'wrong-evening')
        // The bough laid across the short groove: the eel has water long enough for it on one side only, and comes
        // up there with its head out from under the wood.
        await d.press(await wood(d, 1))
        await d.move(await at(d, 1.6, 0.3), 700)
        await d.release()
        await worn(d)
        await d.tap(await thing(d, 'crab-body'))
        await d.wait(1200)
        // Round again until it wears one, and then the sun is sent up: the shell flies from its head to where it lay.
        await d.wait(6000)
        await worn(d)
        await d.tap(await sun(d, 1))
        await d.wait(4000 + 6000 + 7000)
      },
    },
    {
      name: 'wood-adrift-as-the-tide-goes-out',
      run: async (d) => {
        await open(d, 'evening')
        await d.wait(1000)
        // A bough laid in the filled channel: it floats and drifts up it, the eel going under. The sun is sent up while it drifts.
        await d.drag(await wood(d, 0), await at(d, -0.1, 0.4), 900)
        await d.wait(900)
        await d.tap(await sun(d, 1))
        await d.wait(4000 + 6000 + 7000)
      },
    },
  ],
} satisfies GameAudit
