---
title: Every jam game is understandable at the youngest age in its declared age band, through wordless cues alone
date: 2026-09-22
last_updated: 2026-09-22
category: conventions
module: game-design
problem_type: convention
component: development_workflow
severity: high
related_components:
  - tooling
  - testing_framework
  - documentation
applies_when:
  - Adding a new game under games/ in tada-jam, choosing its manifest ageBand, or planning its first playable slice
  - Designing or reviewing any kid-side interaction, onboarding, or feedback in a jam game
  - Before showing any slice to the owner, or when the owner or a playtester says it is not clear what to do or what is needed
  - Tempted to add text, numerals, or voice instructions to explain a mechanic
  - Tuning difficulty or defaults for different ages within one game
symptoms:
  - Owner feedback on Pebble Table that it was not super clear what to do
  - No rule tied a game's interactions to the youngest child in its intended audience
  - Nothing stopped kid-side game code from rendering words or numerals
  - After the guidance ladder shipped, the owner said again that it was not super clear what was even needed
root_cause: inadequate_documentation
resolution_type: tooling_addition
tags: [wordless-clarity, age-band, kids-games, wordless-guidance, ghost-hand, affordances, manifest, wordless-check]
---

# Every jam game is understandable at the youngest age in its declared age band, through wordless cues alone

## Context

Jam games are for children who may not read yet. The first playable slice of Pebble Table drew this from the owner: "it's not super clear what to do." The fix was wordless guidance aimed at a 4-year-old: no text, no voice instructions, no verdicts; hints only when the child is idle, fading on any touch, never nagging.

A follow-up voice note set the rule for every game, not just this one: "The game should be understandable for the age where it's playing: cues and clarity, not text. It should be super clear for the ages, so make that in the solution as well, that you know what age it is."

The owner said "not clear" twice. The first time ("it's not super clear what to do") came after the first slice, which had no guidance; the ladder was added afterward. The second time ("make it super clear for her to play; now it's not super clear what's even needed") came with the ladder already in place. The table showed things on it but gave a 4-year-old no reason to act. At the time of writing, the "one want per scene" changes and the cold playtest proxy are being built next for Pebble Table and are not done; the rules below are adopted from the owner's feedback, not yet proven by a build.

So the convention has two halves:

1. Every game declares who it is for. The manifest's `ageBand` names one audience in whole years (`games/pebble-table/manifest.ts` declares `ageBand: [3, 7]`).
2. Every interaction must be understandable at the youngest age in that band through wordless cues. No words or numerals on the kid side, no spoken instructions. The child works out what to do from what they see, hear, and touch.

The Pebble Table work and the enforcement live in [PR #1](https://github.com/kieranklaassen/tada-jam/pull/1) on branch `cursor/pebble-table-cceb` (in PR #1, unmerged as of writing). The research behind the age thresholds comes from the Pebble Table ideation doc (Project store, `docs/ideation-math-game-4yo.md`), which lives outside the repo.

## Guidance

### The rule

Design for the youngest age in `ageBand`. If a 3-year-old is in the band, a 3-year-old has to be able to find the next act from cues alone. Older children in the band get more options and optional symbols, but nothing they need to progress may rely on reading, numerals, icon literacy, or being told.

### Give every scene one obvious want

The guidance ladder shows HOW to act, not WHY. In Pebble Table, `chooseHint` (`games/pebble-table/guidance.ts`) picks a correct act and the ghost hand performs it, yet the owner still found it "not super clear what's even needed." At rest nothing wants anything: `gazeTarget` (`feeding.ts`) returns null while plates are empty, so guests look straight ahead; `guestsShouldReach` turns them toward the bowl, not the child, only after 3 s idle (`TableController.gaze`); the munch waits for `shareComplete`, the end of a round. Empty scale pans rest level, which reads as "done."

The rule: from the first frame, one thing visibly wants something, and the want resolves visibly. A hungry guest turns to the child holding out an empty plate; a pan holds a stone and waits tilted for a partner. Each stone given already makes its guest react (a hop or thump from its motion personality, triggered when a plate total rises in `games/pebble-table/view/game.tsx`); what is missing is the guest turning to the child and a hunger that visibly shrinks. Keep few things live so the want is the focal point, as the knife already does by existing only while a leftover does.

Checklist:
- With no touch, one thing visibly asks for something, facing the child.
- Every step toward it resolves, not only the last.
- Nothing else competes; tools appear only when needed.
- Ship the want and the ladder in the first slice.

### Run a cold playtest proxy before showing the owner

Item 12's idle screenshot and scripted walkthrough judge how a scene looks, not whether a newcomer knows what it is for. Pebble Table passed them (shots 6.4 s after load, `games/pebble-table/REFINEMENT.md`) and the owner still said "not clear" twice. The proxy is a cheap stand-in for a child that the agent runs before any build reaches the owner.

Load the production build cold, with fresh state. Touch nothing for 10 s and write down what the scene invites: what draws the eye, what seems to want something, where the glow and peek point. Then play the first 60 s as someone who has never seen it and list every moment the purpose is not obvious ("why tap this," "what is this for," "did that work"). When fixing, rerun and compare before and after; a fix counts only if a listed moment disappears without a new one appearing. Not yet run for Pebble Table at the time of writing.

Checklist:
- Cold load: production build, fresh state.
- 10 s hands off: record what the scene invites.
- First 60 s as a newcomer: list every unclear moment.
- Record the screen next to the notes.
- Fix, rerun, diff the lists.

### Checklist for a new game

Work through this in order when building a game. Each item says whether a check enforces it.

1. **Declare the band.** In `games/<key>/manifest.ts`, set `ageBand: [min, max]` with whole years, `min >= 2`, `max <= 12`, and `max - min <= 5` (enforced by `test/games.test.ts`). If the idea spans a wider range, split it into faces or a second game, as the test's failure message says.
2. **Find the row.** Look up the youngest age of the band in the age-band cue table below and treat that row's "Avoid" column as hard constraints.
3. **No words or numerals on screen.** Kid-side code renders no JSX text, string children, DOM or canvas text, or text components (enforced by `npm run wordless:check`). Values formatted as text, such as `{String(n)}` or `{n.toFixed(1)}`, are flagged too. A bare `{count}` child is not (without types the check cannot tell a number from an element), so never render one (see "Enforced vs documented" below).
4. **No voice instructions.** Speech, if any, is for number words or sounds the child asked for, never "tap the bag" or "try again". Not machine-checked: the Δ3 allowance permits `speechSynthesis` and committed clips for spoken number words (`AGENTS.md`).
5. **Touchable things look touchable.** Big silhouettes, targets around 48 px or larger, and a "touch here" cue that reads on every surface in the scene. Pebble Table's first glow disappeared on the cream rug and was replaced by a golden ring (`games/pebble-table/REFINEMENT.md`; `games/pebble-table/view/clay.ts`, "reads as 'touch here' on light and dark surfaces alike").
6. **One next act at a time.** Offer one thing to do next, and let tools appear only when the state makes them meaningful. Pebble Table's knife is only there while a leftover sits in the bowl (`games/pebble-table/feeding.ts`; hit-testing gated at `games/pebble-table/controller.ts`; the knife returns to its rest when there is no leftover).
7. **The material corrects, nothing judges.** No ticks, crosses, "wrong" sounds, or scores. The world answers physically: the scale beam springs toward the heavier side and settles level in silence only when the pans match (`games/pebble-table/scale.ts`; the creak goes silent at rest). A guest with less looks at a fuller plate, never sad (`games/pebble-table/feeding.ts`).
8. **Guidance ladder, only when idle.** Glow on touchable things first, then a ghost-hand demonstration of one possible move, backing off and stopping after a few tries. Any touch fades everything. Demonstrate a move, never the answer. Pebble Table's numbers are the reference (`games/pebble-table/guidance.ts`, detailed below).
9. **Characters point with their bodies.** Gaze, lean, and reach toward what matters, only while the child is idle and only when there is something to do (`games/pebble-table/guidance.ts`; `games/pebble-table/controller.ts`). Turn characters toward the child so faces read (`games/pebble-table/REFINEMENT.md`, pass 3).
10. **At most three fingers act.** A fourth finger means a resting hand: cancel every gesture until the whole hand lifts (`games/pebble-table/input.ts`, `MAX_FINGERS = 3`). iPadOS reserves four- and five-finger gestures.
11. **Age is a dial, never a gate.** Read `ctx.childAge` to set defaults (how much material, which activity opens first), but keep everything reachable for every child. Pebble Table: `bagStonesForAge` gives 5 stones per bag at age 3 or under and 10 otherwise, `defaultMatForAge` opens the scale at 5 or older and feeding otherwise (`games/pebble-table/state.ts`), and both mats always sit on the shelf (`games/pebble-table/state.ts`, restored defensively).
12. **Prove it is understandable.** The checks cannot tell whether a cue works. Take an idle screenshot and a scripted walkthrough that includes an idle stretch long enough for the glow and a demonstration to play (Pebble Table's refinement shots were taken 6.4 s after load for this reason, `games/pebble-table/REFINEMENT.md`). Playtest with a child at the youngest age when you can. In the PR, say how the game meets "Wordless clarity for the declared age" (`docs/art-direction.md`).
13. **One obvious want per scene.** From the first frame, one thing in the scene visibly wants something (a guest holding out an empty plate, a pan that holds a stone and waits tilted), and each step toward it resolves visibly (munch, wiggle, a turn to the child). Guidance shows how; the want gives the reason. Ship the want and the guidance ladder together in the first slice. Documented only. Pebble Table falls short today: guests look straight ahead at rest (`gazeTarget` in `games/pebble-table/feeding.ts`), turn toward the bowl only after 3 s idle (`guestsShouldReach` in `games/pebble-table/guidance.ts`), and, although each stone already sets off a small reaction, only the finished round ends in a munch (`updateFeeding` in `games/pebble-table/controller.ts`); nothing turns to the child or visibly gets less hungry.
14. **Cold playtest proxy before the owner sees it.** Load the build cold, touch nothing for 10 s and record what the scene invites, then play the first 60 s as a newcomer and list every moment the purpose is not obvious, recording the screen next to the notes. Rerun after each fix and compare the lists. Documented only.

### Age-band cue table

The "Basis" column separates what the cited research supports from defaults chosen by the owner or the agent. Research citations are quoted from the Pebble Table ideation doc (Project store, `docs/ideation-math-game-4yo.md`).

| Youngest age in band | What the child can use | Cues that work | Avoid | Simultaneous options | Symbols | Basis |
| --- | --- | --- | --- | --- | --- | --- |
| 3–4 | Direct handling of objects; seeing small quantities at a glance (perceptual subitizing to 4 lands at about age 4); cause and effect from the world's response | A ghost hand or character demonstrating one move; a breathing glow on what can be touched now; state-revealed tools (the knife appears with a leftover); characters gazing and reaching; self-correcting materials (a beam that tilts, plates that visibly match) | Any text, numerals, or pictorial icons that must be decoded; spoken instructions; verdicts; several activities live at once; tools present before they mean anything | One next act offered; one live activity at a time; at most three fingers acting | None required, none shown by default | Research: Clements & Sarama (subitizing ages); Toca Boca, Sago Mini, Tinybop ship "no goals, levels, points, timers, or text"; Montessori isolation of difficulty ("one problem at a time") and control of error in the material; Marsh et al. 2018, successful preschool apps have "one or two clear functions"; Tunnel Train was rejected because pictorial dials "need icon literacy a 4-year-old lacks"; iPadOS reserves four- and five-finger gestures. Owner/agent default: the ghost hand itself and its timings |
| 5–6 | Conceptual subitizing (seeing 2+3 as 5) arrives around 5; recognizing numerals 0–10 is a US Pre-K expectation; symbols start to mean something | Everything in the 3–4 row, plus more options open at once and richer materials (unequal weights, halves) | Requiring a numeral or word to progress; numerals that appear unasked; voice instructions; answer-giving hints | More than one affordance may be live at once (still one clear function per activity) | Optional numerals the child reaches for, never required, and self-correcting (the ideation doc's numeral sticker that flutters off when the set changes). Kid-side numerals need a `wordless-ok: <reason>` exception | Research: Clements & Sarama (conceptual subitizing about 5); Texas 2022 orders concrete, then pictorial, then abstract, and the doc notes "symbols jump sharply between 4 and 5". Owner/agent default: how many simultaneous options, and routing optional numerals through the escape hatch |
| 7+ | Reading is emerging; pictorial icons and composed rules are usable (the doc places Tunnel Train's dials at "a 6+ toy") | The same wordless cues; light iconography where a picture carries a real choice | Instruction text that the game depends on; timers, points, or verdict chrome; long hint chains | Several at once is fine if each reads at a glance | Optional light iconography; text still not required to play | Mostly owner/agent default. The research in the doc targets ages 4–6; the only nearby evidence is the Tunnel Train rejection placing icon literacy at 6+ |

Rows below 3 are not covered: the manifest test allows a band starting at 2, but no research in the doc speaks to 2-year-olds. If a game starts at 2, treat the 3–4 row as the ceiling and cut further (fewer objects, larger targets, no drag if a tap works).

### Pebble Table's guidance ladder (reference numbers)

From `games/pebble-table/guidance.ts`:

- The header states the policy: "no text, no voice, no verdicts", one next act demonstrated, touch fades it all, hints back off and stop "so an idle table goes quiet instead of nagging" ().
- Glow on touchable things starts after 3 s idle (`IDLE_BEFORE_GLOW = 3`) and ramps in over 1.5 s ().
- The first ghost-hand demonstration starts after 5 s idle (`IDLE_BEFORE_HINT = 5`) and lasts 2.8 s (`DEMO_SECONDS`).
- Later demonstrations follow with doubling gaps of 10, 20, then 40 s after each demo ends, and there are at most four per idle stretch (`MAX_DEMOS_PER_IDLE = 4`; the schedule is `scheduledStarts`).
- Any touch resets the idle clock (), so glow and demos drop to zero at once.
- The one act demonstrated is chosen from the table's state (`chooseHint`): tap the bag when the table is empty, move a stone to the lighter pan, deal from the bowl, hand a stone to the emptiest plate, use the knife when there is a leftover, or bring out another mat from the shelf.
- On first open, before any touch, the bag wiggles and a stone peeks out, at most three times ().
- Guests lean toward the bowl and reach only while idle and while there is something to share (`guestsShouldReach`).
- The ghost hand is a camera-facing sprite drawn from a canvas texture (`GhostHand` and `pointingHandTexture` in `games/pebble-table/view/models.tsx`). Per the session, this replaced a 3D hand model that read as a blob from the angled camera.

### Enforced vs documented only

| Rule | How it is held |
| --- | --- |
| `ageBand` is whole years, 2 to 12, at most five years wide | Enforced: `test/games.test.ts` |
| No JSX text, string or template children, DOM/canvas text APIs, or `<Text>`, `<Text3D>`, `<Html>` in kid-side code | Enforced: `scripts/wordless-check.ts`, run by `npm run check` (`package.json`) and in CI (`.github/workflows/ci.yml`); the test "every jam game is wordless on the kid side" in `test/wordless.test.ts` asserts every jam game passes |
| Values formatted as text children (`{String(n)}`, `.toFixed()`, `.toLocaleString()`, `.format()`, `.join()`) | Enforced: the `kid-text-number` rule in `scripts/wordless-check.ts` |
| A bare `{count}` child that renders a number | Documented only: without types the check cannot tell a number from an element |
| No voice instructions | Documented only: speech is allowed for number words under Δ3 (`AGENTS.md`), so the check does not ban it |
| Icons, letters, or numerals baked into images or canvas textures drawn with paths | Documented only: the check cannot see pixels |
| One affordance at a time; state-revealed tools | Documented only |
| Cues are actually understandable at the youngest declared age | Documented only: needs an idle screenshot, a scripted walkthrough, or a playtest |
| One obvious want per scene (checklist item 13) | Documented only |
| Cold playtest proxy before the owner sees a build (checklist item 14) | Documented only |

The check scans only `games/**`, skipping tests and each game's top-level `manifest.ts` and `index.ts` (`isKidSideFile` in `scripts/wordless-check.ts`); the harness is outside `games/`. Attributes such as `aria-label` are allowed because they are not on-screen text. A deliberate exception, such as a Δ4 grown-up corner behind a hold gesture (`AGENTS.md`), carries a `wordless-ok: <reason>` comment on the same or the previous line (the `allowed` check in `scanWordless`).

## Why This Matters

A pre-reader cannot use a text prompt, a digit button, or a spoken instruction in a language their device may not speak. When a game leans on any of those, the youngest children in its band are locked out of the core loop even though the game claims to be for them. Declaring the band makes the target explicit, and designing for its youngest age means the older children lose nothing: they simply notice more.

The research points the same way. The digital-toy school the ideation doc cites ships no text at all. Montessori materials put "the control of the error... in the material itself," which is why Pebble Table's scale and plates answer physically instead of with a verdict. Zach Gage's rule, "hints show moves, never answers," is why the ghost hand shows a stone moving toward the lighter pan but never finishes the problem.

There is a real tension here. Bonawitz et al. (2011) found that pedagogical demonstration narrows exploration, and a ghost hand is a demonstration. Pebble Table limits the cost: no demonstration plays until the child has been idle for 5 s (the glow alone starts at 3 s), demonstrations back off with doubling gaps and stop after four, each shows one act chosen from the current state, and any touch removes it. The child who is exploring never sees a demo; the child who is stuck sees one, then silence. Whether that balance is right for a given child is a playtest question, not a settled one.

Kidd and Poli's findings (attention peaks at intermediate complexity and follows learning progress) are why the table is a dial rather than a switch: defaults change with age, but every child can reach every activity.

The enforcement makes the easy failure impossible to merge (a stray label or a numeral in a HUD) and leaves the judgment calls to the checklist. The ideation doc rejected an earlier "Numeral Ban" idea as an over-correction and kept "the defensible half" as a "no digits or inputs in the core loop" test. The wordless check is that half: text is off by default, and a reasoned `wordless-ok` exception stays available for the grown-up corner or an optional numeral the 5–6-year-old reaches for.

## When to Apply

- Adding any new game under `games/`: declare `ageBand` first, then use the checklist and the cue table.
- Reviewing a game PR against the quality bar line "Wordless clarity for the declared age" (`docs/art-direction.md`) and "Wordless guidance" ().
- Owner or playtest feedback of the form "it's not clear what to do": walk the checklist, starting with items 5, 6, and 8.
- Changing a game's `ageBand`, especially lowering its youngest age: re-read the row for the new youngest age.
- Adding symbols, numerals, or icons to an existing game: confirm the band's youngest age can ignore them without losing anything.
- Adding a second character, tool, or activity to a scene: check that one next act is still clear.
- Building the first playable slice of any game: put the want and the guidance ladder in before the first build reaches the owner, then run the cold playtest proxy.
- Feedback like "it's not clear what's even needed" when guidance already exists: the missing piece is usually the reason to act, not the hint; check item 13 before tuning the ladder, and diff a before and after cold playtest.

## Examples

### Before and after: a text prompt vs wordless cues

**Before (the counter-example).** Per the ideation doc, the Tada app's `math-meadow` cartridge declares `ageBand [4,10]` and has a "Sprout" path labelled "age 4-5", but presents "a text prompt bubble plus three digit buttons (`hud.ts`)", English hint strings like `'One dot for each butterfly!'`, and a garden badge set by `this.gardenBadge.textContent = newBlooms > 0 ? \`${newBlooms} new\` : 'all seen'`. The doc's verdict: "every answer in the 'age 4-5' path is a digit to read," a "digit gate that makes Math Meadow's youngest path unusable for a genuine pre-reader." It declares a band and then ignores the youngest age in it.

**After (Pebble Table).** Declared `ageBand: [3, 7]` (`games/pebble-table/manifest.ts`). Nothing on screen is a word or numeral. What the child sees instead:

- On first open, the bag wiggles and a stone peeks out (`games/pebble-table/guidance.ts`).
- After 3 s of idleness, whatever can be touched breathes with a golden ring (ring texture at `games/pebble-table/view/clay.ts`).
- After 5 s, a ghost hand shows one move, such as a stone traveling to the lighter pan (`games/pebble-table/guidance.ts`).
- The scale answers with a tilt, and stillness when level (`games/pebble-table/scale.ts`).
- Guests look toward fuller plates, never sad (`games/pebble-table/feeding.ts`), and lean toward the bowl while there is something to share (`games/pebble-table/guidance.ts`).
- The knife exists only while a leftover does (shown by `KnifeModel`'s `visible` in `games/pebble-table/view/game.tsx`, tappable only then in `games/pebble-table/controller.ts`).
- Quantity is heard as pentatonic beats grouped the way the stones lie, not as number words (`games/pebble-table/voice.ts`).

### A wordless-check failure

A HUD written like math-meadow's, placed under `games/`, fails the build. Running the check's scanner on this hypothetical file (not in the repo) at `games/number-meadow/hud.tsx`:

```tsx
export function Prompt({ a, choices }: { a: number; choices: number[] }) {
  return (
    <div className="bubble">
      <p>How many butterflies?</p>
      {choices.map((c) => <button key={c}>{String(c)}</button>)}
      <span>{`${a} new`}</span>
    </div>
  )
}
export function badge(el: HTMLElement, n: number) {
  el.textContent = n > 0 ? `${n} new` : 'all seen'
}
```

produces these findings, in the format `npm run wordless:check` prints:

```text
games/number-meadow/hud.tsx:4  kid-text-jsx  How many butterflies?
games/number-meadow/hud.tsx:5  kid-text-number  {String(c)}
games/number-meadow/hud.tsx:6  kid-text-literal  {`${a} new`}
games/number-meadow/hud.tsx:11  kid-text-api  el.textContent = n > 0 ? `${n} new` : 'all seen'

wordless check failed: 4 finding(s). Kid-side code shows no words or numerals; use cues (motion, glow, demonstration, sound). A deliberate grown-up exception needs a "wordless-ok: <reason>" comment.
```

The digit buttons on line 5 are caught by `kid-text-number`. Written as a bare `{c}`, they would pass, which is why checklist item 3 still asks for a review of any `{...}` child that could render a number.

A legitimate exception looks like this (a fixture in `test/wordless.test.ts`):

```tsx
// wordless-ok: grown-up corner behind a hold gesture
export const A = () => <p>Volume</p>
```

### Declaring the band in a manifest

Pebble Table (`games/pebble-table/manifest.ts`):

```ts
export const pebbleTableManifest: CartridgeManifest = {
  key: 'pebble-table',
  name: 'Pebble Table',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  author: 'Kieran Klaassen',
  version: '0.1.0',
}
```

The youngest age is 3, so the 3–4 row governs: demonstration, one affordance at a time, state-revealed tools, no symbols. Age 3 also sets a default through `ctx.childAge`: a bag of 5 stones instead of 10 (`games/pebble-table/state.ts`).

A band like `ageBand: [3, 10]` fails `test/games.test.ts` with "a game is designed for one audience; split wider ranges into faces or a second game". The harness's own validator only checks `min >= 0` and `max >= min` (`harness/contract.ts`), so the jam test is what enforces a specific audience. The grown-up game list shows the band as "ages 3–7" (`harness/GameList.tsx`), so the declaration is also visible to parents choosing a game.

## Related

- [`docs/art-direction.md`](../../art-direction.md): the quality bar lines "Wordless clarity for the declared age" and "Wordless guidance". That doc is the rule; this doc records why and how.
- [`docs/solutions/conventions/distinct-visual-style-per-game-shared-quality-bar.md`](distinct-visual-style-per-game-shared-quality-bar.md): the sibling convention for the shared quality bar and one style per game.
- [`AGENTS.md`](../../../AGENTS.md): the manifest rule (a specific `ageBand`), the quality-bar bullet, and "Age is a hint (Tada R8)".
- [`README.md`](../../../README.md): "Add a game" step 6 (design for the youngest age in `ageBand`) and the wordless check under "Checks".
- [`games/pebble-table/ART.md`](../../../games/pebble-table/ART.md): "Guidance (style-independent)", the worked example of the ladder.
- [`CONCEPTS.md`](../../../CONCEPTS.md): Age band, Wordless clarity, Guidance ladder, State-revealed affordance.
- [`building-a-jam-game.md`](building-a-jam-game.md): the step-by-step path for building a new game, which starts from this checklist.

