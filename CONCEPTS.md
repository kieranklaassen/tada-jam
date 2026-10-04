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

The spike is what turns a style choice into evidence: it shows the look reads clearly for a child and fits the frame-time budget before the style is claimed. A builder spikes the first look reserved for its game, and the next reserved look only if the first fails on clarity or frame rate or the owner rejects it at the end of the Toy stage. The order of the reserved rows is the lead's pick, and the contact sheet that sets looks side by side is the lead's, across the games of a Wave.

### Look ledger
The jam's menu of looks no game has claimed, kept as a ledger in which every look is open, reserved for one named game, or claimed.
*Avoid:* style menu (the earlier list, which had no states)

Only the lead changes a state: looks are reserved for a game before its builder starts, and after a merge one becomes a Claimed style and the game's others go back to open. A builder spikes the first look reserved for its game, moves to the next reserved row only when that Style spike fails or the owner rejects the look, and never edits the ledger. A new row in the registry of Claimed styles is a request to the lead in a Wave, and a builder working alone adds it.

### Art guide
The per-game document that describes a Claimed style: its palette, materials, lighting, motion rules, and how the game meets the Quality bar.

Style-specific guidance lives only in a game's art guide; jam-wide guidance covers the Quality bar and the registry of Claimed styles, never one game's look.

### Showcase
An owner-approved piece shown in the jam that is not a cartridge: it does not follow the kid-side rules and is not meant to move into Tada.
*Avoid:* demo game, exhibit

A showcase lives apart from the games, is listed apart from them, and is exempt from the cartridge checks (age band, wordless clarity, kid-side mechanics). It is never exempt from the zero-egress rule, and it is held to the same smoothness as the games.

## Age and clarity

### Age band
The range of ages, in whole years, that a game declares it is made for; its youngest age is the design target for every interaction.
*Avoid:* target age, age range, age gate

A game declares one audience, so a band stays narrow; an idea that spans a wider range becomes separate faces or a second game. Within the band, the child's age is a dial that changes defaults (how much material, which activity opens first) and never a gate: every child can reach everything.

### Kid side
Everything a child sees and touches while playing a game, as opposed to the jam shell and any grown-up corner.

The kid side shows no words or letters at any age and gives no spoken instructions. A game whose Age band starts below 6 shows no numeral or symbol either, optional or not. A game whose Age band starts at 6 or above may show numerals and mathematics symbols (the digits, the signs for plus, minus, times, divide, equals, less than and greater than, the fraction bar, the decimal mark and the percent sign), each laid on or beside the quantity it stands for. The band decides this, never the child's age while playing. Text meant for a grown-up, such as a performance overlay or a grown-up corner reached by a deliberate hold gesture, is a documented exception and is kept apart from the kid side.

### Wordless clarity
The Quality bar property that a child at the youngest age of a game's Age band can work out every interaction from cues alone: what can be touched looks touchable, one next act is offered at a time, and the world answers physically.

Which cues work depends on age: demonstration and one affordance at a time for the youngest children, more simultaneous options as the band gets older. Where the Kid side may show numerals and mathematics symbols, they sit on or beside the quantities they stand for, and play does not depend on reading one.

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
One cycle of improving how a game looks: screenshot a fixed, seeded scene at iPad-landscape size at a fixed moment of game time, critique it honestly from a young child's point of view, make one focused set of fixes, re-screenshot, and check the frame rate, reverting any fix that hurts.
*Avoid:* iteration, polish round

Passes are logged in order with their critique, change, and frame rate, so the next game can see what moved readability and what was reverted.

### Walkthrough
A scripted recording of a whole game, from a fresh open through the hands-off opening and its guidance, the core loop, every verb, and each character's reactions, reviewed frame by frame before the game is called done.
*Avoid:* demo video, screen recording

It is played at a quick child's pace, each step starting as soon as the game allows, because overlapping moments are where state goes wrong and a still of one moment cannot show them. Game time advances in fixed steps from the first frame the game draws, with randomness seeded, so two recordings of the same script match frame for frame however slowly the machine renders. Run in real time on a device, the same script also measures smoothness against the Quality bar; on a machine that renders in software only the stepped recording means anything, and it judges behaviour and readability. It differs from a Cold playtest proxy, which plays only the first minute as a newcomer to find what is unclear.

### Design sheet
The written design of a game, made before any of its code: who it is for, its toy, what combines with what, how the school idea is represented, how an error shows, the order of challenges and what is saved, its characters and scenes, and the Education pack records its learning claim rests on.
*Avoid:* spec, game design document

It opens the same document as the game's Art guide. Someone who did not write it checks it against both packs before the game is built, and every finding of that check carries the exact sentence that should stand in its place.

### Toy stage
The stage of building a game in which only its toy exists: the one action the child's finger performs most, in an otherwise empty scene in the game's look, with its sound and motion and no goal.

The toy is judged alone, because a goal, a story or a look does not make up for a dull action. The owner sees every game's toy once, at the end of this stage, before goals are built on it.

### Wave
A set of games built at the same time, one builder each, and merged together as one pull request, or, when its builders are remote and finish apart, as a few stacked pull requests of the games that are ready.
*Avoid:* batch, sprint

A wave has a lead, who plans it, owns every file the games share, reserves looks in the Look ledger, starts the checkers of the Design sheets, and makes every commit on the wave's branch. A builder whose worktree the lead can read on disk runs no git that writes, and the lead commits for it; a builder on a remote machine commits and pushes only its own game branch, which the lead merges with a squash. The owner plays one wave before the next is built on the same assumptions.

### Lane
One remote builder's work on one game of a Wave: a cloud machine, a branch named `lane/<key>`, and the brief it was started from.
*Avoid:* worker, job

The lead cannot reach a lane while it runs. What a lane pushed and the status block in its game folder are all that carries from one run of a lane to the next, so every message to a lane is written for a session that has never seen the game.

### Reader
Someone who did not build a game and reads its whole folder against its Design sheet before the game is brought in: for copied official wording, for anything that reaches outside, for drawn text, and for whether the game does what the sheet says.
*Avoid:* reviewer, auditor

A builder's own readers are fresh each time and have seen nothing of the build. Their readings are bounded, because each one tends to find other things than the one before; when the bound is reached the builder writes what is left and why it is slight. The last reading is the lead's: one read, one message of last points to the builder, and no reading after it.

### Held game
A game that is stopped and left out of its Wave's merge, because its Design sheet names no supporting record, the owner rejected its toy, or it did not reach the Quality bar in time.
*Avoid:* cancelled, cut

A held game keeps its branch and its reserved looks and is listed first in the next wave.

## Motion

### Motion personality
The way one kind of character moves in everything it does: its tempo, weight, idle life, how quickly it turns to look, and its own variants of every action and rare delights, so no two kinds of character share an animation.
*Avoid:* animation set, shared hop

Variants of an action are picked without repeating back to back, with randomized timing and size, and delights play only while nothing else is happening.

## Performance

### Quality tier
One of a few rendering levels a game steps between at runtime, each trading look for rendering cost (pixel density, fur, the post pass), chosen by the game's Governor rather than by guessing the device.
*Avoid:* graphics preset, LOD level

A tier changes how the game is drawn, not what happens in it: one that sheds physics steps or simulation detail makes the outcome depend on the device and the tier. The lowest tier must still look like the game. A grown-up overlay can pin a tier to judge it on a device. On a machine that renders in software, a working Governor settles at the lowest tier, so a measurement there describes the lowest look unless a tier is pinned.

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

### Perf probe
The jam's shared browser script that plays any game's production build through the same scripted touches and hands-off pauses, and reports its frame rate, its worst second, Frame work, draw counts, and the Quality tiers it visited.
*Avoid:* jam probe

Its touches are fixed screen positions, never objects found by name, so builds whose scenes differ get the same input. It reads Frame work, the current tier, and the draw counts from a grown-up handle each game publishes on the page, so a game publishes that handle in the one shape the probe expects. It can pin a Quality tier or leave the choice to the Governor, and it can throttle the CPU or enlarge the page to stand in for a weaker device. Its numbers describe the machine and browser it ran on, not a child's device.

## Physics

### Settled body
A loose physics body that has been calm long enough for the game to treat it as asleep: it counts as at rest for the rules and is held still each step, while the physics engine's own sleeping takes it.
*Avoid:* sleeping body (for the game's notion), put to sleep

A settled body becomes loose again the moment it comes out of a step moving faster than calm (hit, pushed, or left with nothing under it) or when something wakes it. Bodies are settled rather than put to sleep by hand, because an engine that is told a body sleeps while its neighbours move can stop meeting what that body lies on. A moving thing wakes only what it can reach, so a swinging part does not unsettle the whole table; a sweeping finger, which can reach anything, still wakes every body.

## Mechanics

### Depth engine
The part of a game loop that makes play 5 differ from play 1 (physics that surprises, combining things, things the child makes, procedural variety), as opposed to content authored in advance.
*Avoid:* replayability hook, content

An idea names its depth engine and a one-line "what is different on play 5" before anything is built; an idea that cannot is cut.

### Hidden position
A child's place in a game's designed order of challenges, which the game stores and nothing on screen ever shows.
*Avoid:* level, difficulty setting, progress

A visit starts at the stored position, and a first visit at a default the child's age suggests. It moves only between cycles, one step at a time: up after a cycle that goes well, down after one that goes badly. A stored position wins over the child's age, no clock is read, and it names a place in the game's own order, never a grade or a school level.

### Mechanic prototype
A throwaway build of one game loop with simple graphics, made to find out whether the loop has depth, and free of the jam's rules (words, scores, wins and timers are allowed).
*Avoid:* game, jam game, cartridge

A mechanic prototype is never a cartridge: a winner is rebuilt to fit the jam and the Tada contract before it goes into the kid shell.

### Demo
A second-round mechanic prototype (`lab/arcade/`): one idea, made to feel good in the hand, judged by a person playing it and not by the persona panel. The jam's home page lists the demos by type with what each is testing.
*Avoid:* game, cartridge

A demo is grouped in the catalog by what it tests. A **gentle** demo follows `lab/arcade/GENTLE.md` (calm, child-paced, no rewards, a natural ending); an **arcade** demo is one of the first 31, which borrow loops and hooks from hit games.

### Education pack
The reference corpus of official learning standards for California and the Netherlands (`education/`) that game designers read while planning a game with a learning goal: one record per official statement, per Lane, with its official code, source and Standing, its official wording or (where the source is Description-only) a summary in the pack's own words, and design notes kept apart as the pack's inference. It is used only while designing and building; no game reads it while it runs and no child sees it.
*Avoid:* curriculum (the pack records standards, it does not sequence lessons), content pack (that is a game's own per-language content)

The folder is also a Compound Pack: its top-level rule files say what a game that claims a school skill must honour, and the planning and review flows read them by themselves. Records are found with the pack's lookup, and a game cites a record by pack id or by official code with its jurisdiction, never by link.

### Lane
One jurisdiction, level and subject inside the Education pack, for example `us-ca/grade-4/mathematics` (California grade 4 mathematics) or `nl/fase-3/mathematics` (Dutch rekenen-wiskunde for groep 7 and 8). Lanes stand alone: a record in one lane is never stated to equal a record in another.

A level is a grade or band as the jurisdiction publishes it, not an age: the Dutch school levels are the curriculum institute's bands of several groepen (fase 1 to 3), not single groepen, and each jurisdiction has one level that the lookup returns beside a school child's own level (California's cross-grade lanes, the Dutch end-of-primary goals). A lane holds a frame, which says what it covers and how it is checked, its records, and a review file.

### Standing
What the publisher or the law says an official statement is, recorded on every Education pack record from a closed list per jurisdiction: in California a State Board-adopted standard, a department-published foundation or voluntary guidance; in the Netherlands a legal core goal, a legal reference level, a legal aim for childcare, curriculum-institute guidance or a draft not yet in force.
*Avoid:* status (every record's `status` is `draft`, a term of the Tada record format that says nothing about standing or checking)

A claim about a game uses the words of the standing, so guidance or a draft is never called a standard or the law. A Dutch core goal also carries a regime (2006, 2026 or the 2027 draft), because the 2006 goals for Dutch and arithmetic were replaced in 2026 and may still be used until 1 August 2031.

### Check state
Whether an Education pack record has passed its second check against the official source: confirmed, unconfirmed with a reason from a closed list, stale (the record changed after its verdict) or unchecked.
*Avoid:* reviewed (Tada reserves it for a registered human reviewer)

The state is computed each time from the verdicts in the review files, which are bound to the record's text by hash, and is never written onto the record. A claim that rests on a record that is not confirmed says so.

### Description-only
The reuse policy of a source whose terms do not grant this repo the right to reproduce its wording: the record commits the official code, the locator and a hash of the wording, with a summary in the pack's own words, and the wording itself stays in a store outside the repo. Every California record is description-only; every Dutch record is verbatim, with the wording in the record and a source line under it.

The line is held by a check that compares the committed pages under `education/` with the stored wording, on the working tree and on each commit before a push.

### Child persona
A simulated child defined by age, touch precision, attention span and what draws them, who plays prototypes the way a child does (imprecise touches, short attention, distractible, inventing their own aims) and comes back, or does not.
*Avoid:* bot, test user

Personas are model guesses at children, so real children still test the last few finalists. A Cold playtest proxy is one builder playing the first minute; a persona panel plays every prototype over repeated sessions.

### Outcome signature
A short string a prototype reports for its current state, coarse enough that two runs ending in the same kind of place share it, so runs can be counted as alike or different.

Depth is read from how many distinct signatures a prototype reaches and how that changes from session to session, never from raw timings.

### Hook
A score, level, timer, win state, or unlock that a prototype leans on to pull play forward.

Every prototype declares its hooks and can run with them off, so a spec can say whether the loop needed them. The list of hooks that were needed is the evidence for amending the guidelines. A hook is a mechanic in a prototype; the jam's rule against engagement mechanics still governs jam games.

### Depth gate
The persona-panel test a prototype must pass before it can be a finalist: enough of the personas in its target age keep coming back over repeated sessions. Clarity is checked only after a prototype passes it.

A prototype that fails the gate stays one of the 30 with its report; it is not ranked.

### Target panel
The child personas within one year of a prototype's Age band (widened to the nearest two when fewer fall in), whose runs the Depth gate reads. The other personas are still run and reported as information.

Ranking compares prototypes only within their own age bucket because each is judged by a different target panel.

### Shortlist entry
A prototype that passed the Depth gate, ranked against others in its own age bucket and carrying a clarity flag.
*Avoid:* finalist (that names one of the loops the owner picks from the shortlist)

When fewer than three prototypes pass, the shortlist also lists the near-the-gate prototypes, marked as not entries, so a person can decide whether to reset the gate.

## Intersection checks

### Intersection audit
The jam's shared headless check that plays a game's production build on a paused, seeded clock through the game's own scripted stretches of play, and reports what a child would see pass through something: two pieces crossing, a piece sunk into what it rests on or hidden inside another, a Pose finding, coplanar faces that flicker, and anything cut by the camera.

It reads the live 3D scene's positions on the processor at intervals, so motion done only in a shader, anything that happens between two samples, and games drawn without a 3D scene are outside what it sees; those are covered by tests on the game's own model. A game is enforced once its pass is clean, and from then on any visible finding that is not an Intended contact fails CI. So an enforced game must give the same run every time, with the same samples, pieces and findings however busy the machine is: a finding that shows in one run and not the next fails CI at random, and no cap absorbs it. A clean run proves only the states its script reached.

### Pose finding
A finding where two parts of one object cross deeper, at some moment, than they did at their shallowest in the same run, such as a wing swinging through its body.

Because each pair is measured against its own shallowest, parts modelled into each other at rest are not flagged; only a swing past that is. A part is followed by its owner and its place among that owner's parts, not by the draw slot it happens to occupy, so when a pooled batch hands a slot to another owner, each owner's part keeps its own history and the two are never compared. Which parts form one object is declared by the game or guessed from size, and that grouping decides whether a crossing is judged as a pose or as two objects passing through each other. Depth is measured in the world, so a scaled parent changes it.

### Intended contact
A place where a game means two pieces to touch or overlap (a stem planted in soil, a fish under the water surface), which the Intersection audit allows by name, with a written reason and a depth cap, instead of the game fixing it.

The reason says why the contact is meant or why a child never sees it. The cap sits a little above the depth measured, so a new, deeper fault in the same pair still fails; a contact allowed without a cap is allowed at any depth.

## Flagged ambiguities

- "Art direction" had been used for both one game's look and the jam-wide standard. These are distinct: a game's look is its Claimed style, described in its Art guide; the jam-wide standard is the Quality bar.
- "Frame time" had been used both for the interval between displayed frames and for the CPU work inside one. These are distinct: the work is Frame work; the interval is the display's pacing.
- "Perf test" had named both a game's Frame-budget test and its tests of the Governor and Quality tiers. These are distinct: the Frame-budget test bounds Frame work; the Governor's tests feed it synthetic frames and check which tier it picks.
- "Wordless guidance" had been used both for the idle hints and for the rule that a game needs no words at all. These are distinct: the idle hints are the Guidance ladder; understanding every interaction without words at the youngest age of the Age band is Wordless clarity.
