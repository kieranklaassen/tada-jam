---
title: Fourteen touch rules that keep a small child's finger in charge, held by tests that play through the Mount's own pointer path
date: 2026-10-12
category: conventions
module: game-design
problem_type: convention
component: development_workflow
severity: high
related_components:
  - testing_framework
  - documentation
applies_when:
  - Writing the hands, input or play module of a jam game, before any goal is built on the toy
  - Deciding what a lift, a tap, a slipped tap, a second finger, a palm, a cancel or a lost pointer capture does
  - Letting a character or a place take a thing the child carries, or sending a thing back from where it cannot stay
  - Adding a sound, a reaction of a character, an idle prompt, or a quality tier that sheds drawing
  - Reading a game against its design sheet as a fresh reader, or ruling on a reader's finding about a touch
symptoms:
  - A fresh reader of almost every game found a carry, a cut or a traced line dropped by a short lift of the finger
  - Characters took a thing the finger only passed over, and a tap gave a thing away or ended a scene
  - A resting palm, or a lift that never arrived, left a game deaf until it was put away
  - A sound played for something that was not drawn, and a thing let go where it could not stay was gone in one frame
  - A test set state by hand and passed while the same fault could be reached by a finger
root_cause: missing_workflow_step
resolution_type: documentation_update
tags: [touch-handling, kids-games, forgiving-touch, lifted-finger, pointer-cancel, fresh-reader, found-as-left, play-path-tests]
---

# Fourteen touch rules that keep a small child's finger in charge, held by tests that play through the Mount's own pointer path

## Context

Over one run 35 games were built, and each was read two to four times by fresh readers against its design sheet. The readers kept finding the same faults in how a touch is handled, in game after game, and the lead ruled on them the same way each time. The games had different looks, mechanics and age bands, so the faults were not about any one game. They were about what a small hand does on glass: it lifts for a moment in the middle of a carry, it slips while it taps, a palm rests beside it, and the browser sometimes takes the pointer away.

This page writes those rulings down once, as one convention. The examples come from the six games built last (`games/lantern-walk`, `games/box-fort`, `games/nature-walk`, `games/sand-kingdom`, `games/wool-picture`, `games/advent-market`), where the rules were given to the builders at the start and each is held by a named test.

## Guidance

Each rule has one sentence of why and, where one was found, an example as `path:line`.

### The lift

1. **A carry survives a lifted finger.** A short lift (0.3 s was used) is not a let-go: the thing hangs where it was, and a finger that lands near it in that time carries on. Small children lift without meaning to, and a carry that ends at every lift reads as a broken game (pack: game-design, ages-2-to-4.md). `games/lantern-walk/game.ts:27`, `games/nature-walk/input.ts:56`, `games/advent-market/grace.test.ts:41`.
2. **A line being cut or traced survives a lifted finger and waits.** For ages 4 to 6 the line is never dropped: it waits where it stopped, in the save, until a finger takes it up or something closes it. The pack already says this, so it is cited and not restated (pack: game-design, ages-4-to-6.md). `games/box-fort/reading1.test.ts:38`, `games/box-fort/reading1.test.ts:98`, `games/lantern-walk/rules.test.ts:138`. The one exception seen is where the lift is itself the act, as with wool that clings when the finger goes (`games/wool-picture/hands.ts:16`).

### Giving and tapping

3. **A hand or a character takes a thing only when it is let go there.** Passing over is not giving, because a child on the way somewhere else did not choose the character the finger crossed. `games/advent-market/hands.test.ts:49`, `games/advent-market/giving.test.ts:105`, `games/lantern-walk/rules.test.ts:120`.
4. **A tap never gives a thing away, hangs it or ends anything.** A tap is the cheapest and most accidental touch, so nothing that cannot be undone with one more tap hangs on it. `games/advent-market/hands.test.ts:197`, `games/wool-picture/reading3.test.ts:211`.
5. **A slipped tap is not a let-go and not a drag.** A small move while tapping (14 px of slop was used) stays a tap, because a young finger rolls as it presses. `games/nature-walk/touch.test.ts:126`, `games/box-fort/play.ts:25`, `games/box-fort/reading2.test.ts:182`.

### Fingers that rest, and fingers that are taken away

6. **A resting contact never deadens the game.** A finger that landed where nothing is, or that has lain still for a second, hands the work to the next finger that lands, because a resting hand is the normal case and a lift that never arrives must not leave the game deaf. A finger that is carrying or cutting by moving is never interrupted. `games/lantern-walk/rules.test.ts:44`, `games/lantern-walk/rules.test.ts:57`, `games/nature-walk/play.ts:28`.
7. **A second finger takes nothing from the first and gets a small answer of its own.** No touch is met by nothing: a child who touches and sees nothing concludes the game is not listening. `games/box-fort/reading1.test.ts:282`, `games/nature-walk/input.test.ts:87`.
8. **A lost pointer capture or a cancel is a put-back, never a let-go.** Nothing is dropped, hung, lit or cut by it, because the child did not let go: the browser took the finger. `games/lantern-walk/rules.test.ts:196`, `games/box-fort/reading3.test.ts:392`, `games/nature-walk/input.test.ts:97`.

### What the child sees and hears

9. **The answer to a touch is never something a quality tier leaves out.** A tier may shed decoration, but on the slowest device a touch must still be answered in sight. `games/nature-walk/touch.test.ts:168`, `games/advent-market/drawn.test.ts:141`, `games/wool-picture/reading2Tiers.test.ts:221`.
10. **No sound without sight.** Something that happens off screen is silent, because a sound with nothing to look at cannot be understood by a child who does not read. `games/lantern-walk/promises.test.ts:532`, `games/sand-kingdom/sync.test.ts:187`, `games/nature-walk/noticed.test.ts:158`.
11. **No praise, no fear, no blame, no nag.** A character that cheers, claps or nods at the child is praise and goes; no figure shows fear of the child or blame at the child; a prompt that repeats without end is a nag. The pack has the reasons (pack: game-design, no-rewards-for-playing.md; pack: game-design, characters-with-opinions.md). `games/box-fort/reading3.test.ts:355`, `games/nature-walk/noticed.test.ts:284`, `games/advent-market/REFINEMENT.md:331`.
12. **A thing let go where it cannot stay is seen and heard to go back.** It never vanishes, and "no" is kept to places where truly nothing fits: where any place can bear the thing, it goes there (pack: game-design, errors-show-as-consequences.md). `games/advent-market/giving.test.ts:70`, `games/box-fort/reading3.test.ts:81`, `games/box-fort/reading2.test.ts:248`, `games/box-fort/reading2.test.ts:259`.

### Put away, and how the rules are tested

13. **A put-away inside a grace or in mid-carry loses nothing and never leaves a thing standing on a character.** What the child had let go lands where it hung; what was still under a finger goes back where it came from. Put-away can come at any instant, and the load must find a scene that could have been reached by play. `games/advent-market/grace.test.ts:131`, `games/advent-market/grace.test.ts:182`, `games/lantern-walk/rules.test.ts:541`, `games/lantern-walk/walk.test.ts:387`.
14. **Every such rule is tested through the same path the Mount uses for a real pointer.** The game keeps one module with no browser in it that takes pointers by id and surface pixels and the seconds of each frame; the Mount and the tests both call it, and no test sets state by hand where play could reach it. A test that builds the state itself proves the rule for a state, not for a finger. `games/box-fort/play.ts:8`, `games/nature-walk/play.ts:11`, `games/lantern-walk/play.ts:11`, `games/sand-kingdom/play.ts:17`. Two of the six keep this path under another name: `games/wool-picture/hands.ts:4` and `games/advent-market/handling.ts:10`.

## Why This Matters

These faults were found by readers in almost every game, after the build. That is late. Each one costs a reading to find, a pass to fix, and a second reading to confirm, and a bounded loop has only four readings to spend. A builder who has the fourteen rules before writing the hands module saves two readings, and spends the ones that are left on what is particular to the game.

The rules also share one cause, which is why they belong together. Each fault treats an event from the browser as if it were the child's intent: a `pointerup` as "I let go", a `pointermove` over a character as "I give you this", a cancel as a drop. For an adult those are nearly always the same. For a child of three to six they are often not, and the game then does something the child did not choose and cannot explain. Nothing judges the child in these games, so a game that acts against the finger is the nearest thing it has to a wrong answer.

Rule 14 is what keeps the other thirteen true. A test that writes the state it wants can pass while the Mount's real path turns a lift into a drop before the game ever sees it, so the rule is proved only when the test sends the same pointers the Mount would.

## When to Apply

- Before the hands, input or play module of a new game is written: read the fourteen rules, and put the lift grace, the tap slop and the rest time in as named constants.
- At the toy stage, when the one action the finger performs most is first answered.
- When a character, a hook, a basket or any place is given the power to take a thing.
- When a quality tier is added or tuned: list what each tier sheds and check that no answer to a touch is on the list.
- As a fresh reader or as the lead: check these first, since they are the findings that came back most often.

## Examples

What the cold playtest proxy and the readers wrote down, and the rule each one led to:

| What was noticed | Rule | Where it is held now |
| --- | --- | --- |
| "He took my candle, I was still dipping." | 3 | `games/advent-market/hands.test.ts:49` |
| "I let the lights go and they were on the floor at once, I did not see them fall." | 12 | `games/box-fort/reading3.test.ts:81` |
| A creature heard while nothing of it was drawn | 10 | `games/sand-kingdom/sync.test.ts:187` |
| A figure that trembled and squeaked when poked, which read as fear of the child | 11 | `games/nature-walk/noticed.test.ts:284` |
| A glow that pulsed without end, and raised hands that could read as a cheer | 11 | `games/advent-market/REFINEMENT.md:331` |
| A thing offered to a full hand that went back unseen | 12 | `games/advent-market/giving.test.ts:70` |

The header of a play module states the rules in the place a builder reads first (`games/box-fort/play.ts:8`):

```ts
// The Mount's path with no browser in it: fingers land, move, lift and are
// taken away here, and the game plays its time here. The Mount passes pointer
// events in by their ids and surface pixels; a test does the same.
// - One finger works at a time. A finger that rests hands the work to the
//   next one that lands [...]
// - The lift and the cancel are handed to the game. A lift leaves a cut
//   waiting where it stopped and lets go of what is carried; a cancel never
//   acts for the child.
```

## Related

- [`building-a-jam-game.md`](building-a-jam-game.md): the order of work for a game; these rules belong before the hands module, and "Found as left" there is the wider form of rule 13.
- [`wordless-clarity-for-the-declared-age-band.md`](wordless-clarity-for-the-declared-age-band.md): checklist item 10, on extra fingers and a resting palm, and the guidance ladder that rule 11 keeps from nagging.
- [`docs/solutions/workflow-issues/bound-a-builders-fresh-reader-loop-at-four-readings-and-give-the-last-read-to-the-lead.md`](../workflow-issues/bound-a-builders-fresh-reader-loop-at-four-readings-and-give-the-last-read-to-the-lead.md): why readings are few, and so why these findings should not be left for a reader.
- `compound-packs/game-design/`: `ages-2-to-4.md`, `ages-4-to-6.md`, `no-rewards-for-playing.md`, `characters-with-opinions.md`, `errors-show-as-consequences.md` and `touch-answers-bigger-than-the-touch.md`.
- [`CONCEPTS.md`](../../../CONCEPTS.md): Guidance ladder, Design sheet, Toy stage.
