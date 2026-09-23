---
title: Give every character its own motion personality, several variants per action, and rare delights, picked without repeats, and fail tests on shared or near-copy animations
date: 2026-09-22
category: design-patterns
module: animation
problem_type: design_pattern
component: development_workflow
severity: medium
related_components:
  - testing_framework
  - tooling
applies_when:
  - Animating characters, creatures, or guests in a jam game for a young child
  - Several characters on screen share one idle, blink, hop, eat, or reach animation offset only by phase
  - The owner or a playtester says the animations all look the same or lack depth
  - Adding a new species, character, action, or tap response to a game with animated characters
  - Giving interactive objects such as stones, bags, scales, or tools a feel of their own
symptoms:
  - Every Pebble Table guest shared one breathe, one blink rhythm, one landing hop, one three-chomp munch, and one bowl reach, differing only by phase offset
  - A poke reused the landing hop and its sound
  - All guests reached for the bowl at the same instant
  - Owner asked to make sure animations are not all the same, more unique, with more depth and iteration
root_cause: missing_workflow_step
resolution_type: code_fix
tags: [animation, motion-personality, character-animation, animation-variants, motion-director, react-three-fiber, kids-games, claymation]
---

# Give every character its own motion personality, several variants per action, and rare delights, picked without repeats, and fail tests on shared or near-copy animations

## Context

Pebble Table (`games/pebble-table/`, in PR #1, unmerged as of writing) seats clay guests around a table: rabbits, bear cubs, and hedgehogs. The first build animated them all from one shared set of motions. Every guest had the same breathe, the same blink rhythm, the same hop when a stone landed on its plate, the same three-chomp munch, and the same reach toward the bowl, told apart only by a phase offset. Tapping a guest (a poke) played the stone-landing hop and its sound, so the child's direct touch got the same answer as a stone arriving.

The owner's feedback was: "make sure animations are not all the same, more unique, more depth and iteration." A phase offset makes guests move out of step, but they still read as the same animation playing several times. At a glance a child sees one puppet copied, not three characters.

The fix moved all character motion into a pure module, `games/pebble-table/motion.ts`, gave each species a personality with its own actions, gave the objects on the table their own feel too, and enforced the result with tests in `games/pebble-table/motion.test.ts`. Five record, critique, and fix passes are logged in `games/pebble-table/REFINEMENT.md` under "Animation passes".

## Guidance

### 1. Put motion in a pure module, one personality per species

`games/pebble-table/motion.ts` has no three.js or React. It returns numbers. The `Personality` type is the contract every species fills in:

- `idle(now, phase)`: that species' resting life (breathing tempo, sway, twitches).
- `blinkEvery` and `blinkLength`: its blink rhythm.
- `look: { stiffness, damping }`: the spring its head uses to turn toward what it watches.
- `reach(amount, now, phase)` and `reachResponse`: the pose it strikes when reaching for the bowl, and how quickly it gets there.
- `mouthWidth`: mouth width relative to the shared mouth shape.
- `delightEvery`: the gap range between rare idle delights.
- Action sets `react`, `eat`, `poke`, `arrive`, and `delight`: 2 to 3 variants per action (one `arrive` each) and 4 delights per species.

Each `Action` has a `name`, a `duration`, and `sample(t, amp, glance)`, which returns a `PoseDelta`: additive offsets from rest (`lift`, `squash`, `lean`, `roll`, `twist`, `headPitch`, `headYaw`, `headRoll`, `headDrop`, left and right `armUp`, `armForward`, `ears`, plus `eyes`, `mouth`, `nose`, `cheeks`, `quills`). Small shaping helpers (`hump`, `ramp`, `hold`, `chomps`, `wobble`) keep each action a few readable lines.

### 2. Give each character a director

`MotionDirector` owns one guest's motion over time. It:

- picks a variant with `pick(kind)`, never the same name twice in a row when there is a choice;
- randomizes each play: amplitude 0.85 to 1.15 and speed 0.9 to 1.1;
- blends idle, reach, and every playing action by adding their pose deltas (`add`), eyes multiplied;
- plays a delight only when the guest is not busy with a foreground action (`arrive`, `poke`, `eat`, `react`) and the caller has not asked for quiet;
- drops a playing delight the moment a real action starts (`trigger` deletes `delight` for any other kind);
- blinks on a random interval from `blinkEvery`, with a 20% chance of a double blink;
- is seeded from its constructor seed, so two guests of one species drift apart but a run is reproducible.

```ts
const director = new MotionDirector('bear', seat + 1)

// When the game says something happened to this guest:
director.trigger('react', now)   // returns the variant name, e.g. 'belly-pat'
director.trigger('poke', now)
director.trigger('eat', now)

// Every frame: quiet suppresses delights, reach is 0..1.
const pose = director.sample(now, quiet, reach)
root.position.y = Math.max(0, pose.lift)
head.rotation.set(pose.headPitch, pose.headYaw, pose.headRoll)
```

### 3. Keep the view dumb: it maps a pose onto parts

`Guest` in `games/pebble-table/view/models.tsx` builds one director per seat (`new MotionDirector(species, seat + 1)`), turns game events (`arriveAt`, `hopAt`, `pokeAt`, `munchAt`) into `trigger` calls, and passes `quiet` while the guest is reaching. Then it maps the pose: `lift`, `squash`, `lean`, `twist`, `roll` onto the root; `headDrop` and head angles onto the head group, with the head-turn spring using `personality.look`; `eyes` onto the eye scale; `mouth` times `personality.mouthWidth` onto the mouth; `nose`, `cheeks`, and `ears` onto their own meshes.

### 4. Split moving parts out of merged geometry

Merged geometry is cheap but cannot move. In `guestShapes` (cached per species by `speciesShapes`), the nose, the cheeks, and the rabbit's ears are built as separate geometries (ears built around their base so they rotate like hinges) instead of being merged into the head. That is what lets a rabbit flick one ear, a nose wiggle, and cheeks puff while chewing. Hedgehog quills puff through the `quills` channel.

### 5. Give objects character too

The same rule applies to props. Nothing shares one bounce:

- `STONE_FEEL` in `StonesModel` sets the landing spring per stone size. A whole stone (4 quarters) squashes deep and rocks slowly as it settles (low stiffness, `rockStiffness` 70). Halves and quarters are springier with a quicker rattle (quarters: `rockStiffness` 420).
- `BagModel` alternates two tips: a big lurch forward, or a shake-out that jiggles stones loose side to side. The settle spring softens as `fullness` drops, so an empty bag is floppier and wobbles longer.
- `ScaleModel` hangs the pans on springs driven by the beam's turn rate, so they lag behind the beam, swing back, and settle.
- `KnifeModel` pops in with a spring when it appears, leans into the direction it is dragged, and chops down when let go.
- Sound follows character: `poke(species)` in `games/pebble-table/audio.ts` answers in each species' voice (a squeaky giggle, a low two-note hum, a tiny sniff-squeak), separate from the stone-landing `hop()`.

### 6. Design a personality from the animal's nature first

Decide three things before writing any curve: the tempo (quick or slow), the weight (light or heavy), and which body part is funniest on this animal. Then let every action lean on that part. The Pebble Table choices:

| | Rabbit | Bear cub | Hedgehog |
| --- | --- | --- | --- |
| Nature | quick, twitchy | slow, heavy, content | tiny, quick, shy |
| Funniest part | ears and nose | belly and arms | quills and curling up |
| Idle | fast breathe, nose wiggle bursts, ear drift | slowest breathe, big roll and head sway | fastest breathe, constant nose, bursts of shuffling steps |
| Head turn (`look.stiffness`) | 120, quickest | 32, laziest | 75 |
| Blink (`blinkEvery`, `blinkLength`) | 2.2 to 4.8 s, 0.08 s | 3.8 to 7 s, 0.2 s | 2.8 to 6 s, 0.11 s |
| React | twitch-hop, thump, binky | belly-pat, heavy-bounce, happy-rock | shuffle, quill-ripple, tippy-toes |
| Eat | nibble, hold-and-nibble | big-chomps-and-sigh, chomp-and-pat | tiny-chomps, sniff-then-chomp |
| Poke | giggle, startle | slow-wave, belly-laugh | curl-up, puff-and-peek |
| Arrive | bounce-in | plop | unroll |
| Delights | ear-flick, sniff-the-air, scratch, glance | yawn, belly-rub, big-sway, glance | sneeze, sniff, little-shuffle, glance |
| Reach | stretches up on tiptoe, ears pricked (`reachResponse` 9) | slowly holds out both paws (2.2) | leans in sniffing (4.5) |
| `mouthWidth` | 0.9 | 1.5 | 0.75 |

### 7. Review motion with a recorded scene, not a still

Screenshots cannot show samey motion. Each pass in `games/pebble-table/REFINEMENT.md`:

1. Record a scripted scene as video: poke every guest twice, deal six stones so everyone reacts twice and the party eats, then idle.
2. Cut per-guest frame strips so characters can be compared side by side.
3. Ask one question: "does this look like the same animation reused?" Also judge readability at play distance, not up close.
4. Fix, re-record, and check frame rate on a production build after the last pass.

What the passes caught:

- The bear's belly pat was invisible: its arms moved in front of a belly of the same colour. Fix: swing the arms out and back in so the silhouette changes.
- Eats were tiny head nods, invisible at play distance. Fix: body motion in every eat (the rabbit bobs, the bear sways and sighs, the hedgehog wiggles after).
- Side by side, the hedgehog's idle shuffle, the chomping mouths, and the rabbit's nose wiggle were too small. Fix: shuffles in visible bursts, wider mouths with a width per species, doubled nose wiggles.
- When the ghost hand appeared, all three guests reached for the bowl at the same instant with the same pose: the last shared animation. Fix: `reach` and `reachResponse` moved into each personality, so poses differ and they stagger.
- Pokes all made the same hop sound. Fix: species voices in `games/pebble-table/audio.ts` `poke`.

### 8. Enforce it with tests

`games/pebble-table/motion.test.ts` fails when sameness creeps back:

- Every species has at least 2 react, 2 eat, 2 poke variants and at least 3 delights.
- No action name is shared between species, except `glance`.
- No two variants are near-copies: each action is sampled at 21 points across all pose channels, and every pair except the shared `glance` must be more than 0.3 apart (Euclidean distance, with the nose channel weighted 0.3).
- Idle tempo follows nature: the bear's breathing crosses zero least, the hedgehog's most. Head-turn stiffness is ordered bear, hedgehog, rabbit.
- Reach poses differ between species by more than 0.3, every species' `reachResponse` is distinct, and the bear is still below 80% of its full reach after half a second.
- The director never plays the same variant twice in a row, uses every variant over time, plays 5 to 25 delights in two idle minutes and none at a checked moment while quiet (the director never schedules one while quiet), drops a delight when an eat starts, and two same-species guests with different seeds do not move in lockstep.

### 9. Budget the cost

Separate nose, cheek, and ear meshes raised draw calls from 40 to 48, under the game's 80 budget. The director's per-frame work is a handful of additions per guest. Frame rate after the passes held on a production build (Chrome at 6x CPU throttle: 60 fps idle, spill, and drag; WebKit: 60 fps).

## Why This Matters

Characters are the part of a kids' game a child bonds with, and a four-year-old reads motion before anything else. When every guest shares one hop, the table feels mechanical and pokes feel like pressing a button. When the rabbit binkies, the bear pats its belly, and the hedgehog curls up, each guest becomes someone, and poking them becomes the reward in itself.

Retrofitting is expensive. In Pebble Table it took a new module, split geometry, a new audio method, and five review passes. Starting from a `Personality` per character from the first playable build costs about the same as writing the one shared animation, and the tests keep a later "quick shared hop" from sneaking back in.

The review loop matters as much as the code. Two of the biggest problems (the invisible belly pat, the synchronized reach) were only visible in recorded video watched from the child's distance.

## When to Apply

- A game has two or more characters, creatures, or animated props that respond to the same events.
- You are about to write "one animation, offset per instance" for more than one kind of character.
- A player touch (tap, poke) would reuse a reaction built for a game event.
- Several characters respond to one shared cue (a hint, a ghost hand, a success moment) and would move on the same frame.
- Props that recur (stones, containers, tools) all use one spring or one bounce.

## Examples

A new species slots in by filling the contract. Sketch for a hypothetical duck (slow waddle, the tail is the funny part), after adding `'duck'` to `Species` and to `PERSONALITIES`:

```ts
const duck: Personality = {
  species: 'duck',
  mouthWidth: 1.2,
  idle: (now, phase) => ({ roll: Math.sin(now * 1.8 + phase) * 0.06, squash: -Math.sin(now * 1.8 + phase) * 0.02 }),
  blinkEvery: [3, 6],
  blinkLength: 0.12,
  look: { stiffness: 60, damping: 9 },
  reach: (k) => ({ lean: k * 0.18, headPitch: -k * 0.1, armUp: [k * 0.6, k * 0.6] }),
  reachResponse: 3.5,
  delightEvery: [6, 13],
  react: [/* tail-waggle, flap-hop */],
  eat: [/* dabble, gulp */],
  poke: [/* quack-back, ruffle */],
  arrive: [/* waddle-in */],
  delight: [/* preen, stretch-wing, head-shake, glance */],
}
```

The tests then check it for you, because they iterate over every entry in `PERSONALITIES`: the names must be new, each variant must move differently from every other variant in the game, and its `reachResponse` must differ from the others. Add it to the idle tempo ordering test by hand, where its nature puts it.

What is still weak in Pebble Table, from `games/pebble-table/REFINEMENT.md` "Still weak (motion)": the hedgehog's eating still reads mostly as a lean; the knife and bag moments have not had a dedicated recorded critique pass; and the controller fires one munch for the whole party, so eating still starts at the same moment for everyone. Staggering shared cues by personality belongs in the design from day one.

## Related

- [`games/pebble-table/REFINEMENT.md`](../../../games/pebble-table/REFINEMENT.md): the five animation passes, critique by critique.
- [`refinement-loop-for-kid-3d-readability.md`](../workflow-issues/refinement-loop-for-kid-3d-readability.md): the same record, critique, fix loop applied to how the scene looks.
- [`measure-on-the-target-device-and-ship-adaptive-quality.md`](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md): the frame budget that motion has to stay inside.
- [`distinct-visual-style-per-game-shared-quality-bar.md`](../conventions/distinct-visual-style-per-game-shared-quality-bar.md): the quality bar's motion lines.
