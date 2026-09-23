# Concepts

> Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Art direction

### Quality bar
The set of properties every jam game must have regardless of how it looks: alive at idle, motion and sound on every touch, physical weight with squash and follow-through, kid-clear silhouettes and touchable things, Wordless clarity for its Age band, a Guidance ladder when the child is idle, a smooth frame rate on a mid-range iPad, no externally fetched assets, and a recognisably distinct look of its own.
*Avoid:* fidelity bar (the earlier, narrower Tada term this extends)

The quality bar is style-independent: a game in any Claimed style is held to the same bar, and a game's pull request states how it meets each line with a measured frame rate.

### Claimed style
A visual direction that one game has registered as its own look, so no other game in the jam may use it.
*Avoid:* house style, jam style

Styles are claimed per game, never per jam. Techniques (how something is rendered or kept fast) may be shared between games; a look may not, and two games should never be mistakable for each other in a screenshot. A game claims a style only after a Style spike.

### Style spike
A quick build of a game's real scene in a candidate style, captured as a screenshot at iPad-landscape size with a measured frame rate, done before any full visual build.

The spike is what turns a style choice into evidence: it shows the look reads clearly for a child and fits the frame-time budget before the style is claimed.

### Art guide
The per-game document that describes a Claimed style: its palette, materials, lighting, motion rules, and how the game meets the Quality bar.

Style-specific guidance lives only in a game's art guide; jam-wide guidance covers the Quality bar and the registry of Claimed styles, never one game's look.

## Age and clarity

### Age band
The range of ages, in whole years, that a game declares it is made for; its youngest age is the design target for every interaction.
*Avoid:* target age, age range, age gate

A game declares one audience, so a band stays narrow; an idea that spans a wider range becomes separate faces or a second game. Within the band, the child's age is a dial that changes defaults (how much material, which activity opens first) and never a gate: every child can reach everything.

### Kid side
Everything a child sees and touches while playing a game, as opposed to the jam shell and any grown-up corner.

The kid side shows no words or numerals by default and gives no spoken instructions. A documented exception may show text in a grown-up corner reached by a deliberate hold gesture, or an optional numeral that an older child in the Age band reaches for and never needs.

### Wordless clarity
The Quality bar property that a child at the youngest age of a game's Age band can work out every interaction from cues alone: what can be touched looks touchable, one next act is offered at a time, and the world answers physically.

Which cues work depends on age: demonstration and one affordance at a time for the youngest children, more simultaneous options and optional symbols (never required) as the band gets older.

### Guidance ladder
The escalating, idle-only hints a game gives when the child stops: first a glow on what can be touched, then a demonstration (a ghost hand or a character) of one possible next act, backing off with growing gaps and stopping after a few tries.
*Avoid:* tutorial, onboarding, hint system

Any touch clears the ladder at once and restarts the idle clock. A demonstration shows a move, never the answer, and is chosen from the current state.

### State-revealed affordance
A tool or action that appears only when the current state makes it meaningful, so the child never faces an option that does nothing yet.

### Scene want
The one thing in a scene that visibly wants something from the child (a hungry guest holding out an empty plate, a scale pan waiting tilted for a partner), which gives the child a reason to act before any mechanic is understood.
*Avoid:* goal, objective, task

The Guidance ladder shows how to act; the want gives why. A want resolves visibly (a munch, a happy wiggle, a guest turning to the child), never with a score or a verdict, and each scene has only one.

### Cold playtest proxy
A stand-in for a first-time child, run by the builder before the owner sees a build: load it cold, touch nothing for a few seconds and note what the scene invites, then play the first minute as a newcomer and list every moment the purpose is not obvious.

### Control of error
Feedback that comes from the material's own physical response (a beam that levels, plates that visibly match, a leftover that stays put) rather than from a judgment such as a tick, a cross, a score, or a sad face.
*Avoid:* verdict, right/wrong feedback

## Process

### Refinement pass
One cycle of improving how a game looks: screenshot a fixed, seeded scene at iPad-landscape size on a fixed timer, critique it honestly from a young child's point of view, make one focused set of fixes, re-screenshot, and check the frame rate, reverting any fix that hurts.
*Avoid:* iteration, polish round

Passes are logged in order with their critique, change, and frame rate, so the next game can see what moved readability and what was reverted.

## Motion

### Motion personality
The way one kind of character moves in everything it does: its tempo, weight, idle life, how quickly it turns to look, and its own variants of every action and rare delights, so no two kinds of character share an animation.
*Avoid:* animation set, shared hop

Variants of an action are picked without repeating back to back, with randomized timing and size, and delights play only while nothing else is happening.

## Performance

### Quality tier
One of a few rendering levels a game steps between at runtime, each trading look for rendering cost (pixel density, fur, the post pass, physics catch-up), chosen by the game's Governor rather than by guessing the device.
*Avoid:* graphics preset, LOD level

The lowest tier must still look like the game. A grown-up overlay can pin a tier to judge it on a device. On a machine that renders in software, a working Governor settles at the lowest tier, so a measurement there describes the lowest look unless a tier is pinned.

### Governor
The part of a game that watches its own frame intervals and Frame work and moves between Quality tiers to fit whatever device it runs on.
*Avoid:* tier controller, tier monitor, quality monitor

Stepping down follows missed frames counted over short windows rather than an average, so steady judder is caught and one long frame is not mistaken for a slow device; a window far off the pace drops two tiers at once. Stepping up needs a long clean stretch with Frame work to spare, because the interval cannot show spare time, and an upgrade that fails is not retried soon (a longer wait each time, or a ceiling for the session), so tiers never flicker. Touch devices start one tier down while it learns.

### Frame work
The CPU time a frame spends on the game's own work, advancing the game and submitting the draw, as distinct from the frame interval, the time from one displayed frame to the next.
*Avoid:* frame time, CPU time

Frame work is what performance budgets are written in and what carries over between machines. The interval is paced by the display, so on a device that already meets its refresh rate it cannot show how much time is spare. A software renderer that rasterizes inside the draw calls can fold its raster time into Frame work, which then stops being comparable.

### Frame-budget test
A headless test that runs in CI and drives a game's heaviest moment through its real game logic, failing when the Frame work spent advancing the game exceeds a budget; the cost of drawing is left to measurement in a browser.
*Avoid:* perf test

It has to hold on a shared, busy machine that adds time to random frames. Where the code exposes the work that sets the cost (physics steps, contacts, candidates scored), it counts that work; otherwise it replays the same seeded input several times and keeps each frame's quickest run, never the slowest frame of any one run. It also checks that the heavy moment happened, so a run that skipped it cannot pass.

## Flagged ambiguities

- "Art direction" had been used for both one game's look and the jam-wide standard. These are distinct: a game's look is its Claimed style, described in its Art guide; the jam-wide standard is the Quality bar.
- "Frame time" had been used both for the interval between displayed frames and for the CPU work inside one. These are distinct: the work is Frame work; the interval is the display's pacing.
- "Perf test" had named both a game's Frame-budget test and its tests of the Governor and Quality tiers. These are distinct: the Frame-budget test bounds Frame work; the Governor's tests feed it synthetic frames and check which tier it picks.
- "Wordless guidance" had been used both for the idle hints and for the rule that a game needs no words at all. These are distinct: the idle hints are the Guidance ladder; understanding every interaction without words at the youngest age of the Age band is Wordless clarity.
