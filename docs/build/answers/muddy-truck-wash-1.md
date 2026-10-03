# Answers for Muddy Truck Wash, after its first run

## The check of the sheet, round 1

Checked: the sheet part of `games/muddy-truck-wash/ART.md` at commit `2f242608` (sha256 of everything above `## The look`: `64167625dec6f9e1821e04482569c2e21ea02080d10c06c93a0d1e06fec34ad7`). Checker: A. Outcome: **open, 11 findings**. Line numbers are lines of `ART.md` at that commit.

Not in question: all ten headings are there and in order; all nine records exist with the standing and check state the sheet gives; levels, sub-bands, basis, the end-of-primary label and "no gap printed" are as the lookup prints them for ages 2, 3 and 4; every limit taken is in that record's Limits; the two jurisdictions stand under separate headings; no position id names a grade, a groep or a level.

Paste each replacement as it stands, write the round into the status block, and set `Open: sheet ready for check, round 2`. Findings 3, 5 and 8 change what the rules do: bring any rule you wrote on the old text into line before you ask for round 2.

1. **The band and its age rule, line 15.** The bottom default must be open-ended, and "2 or 3" is closed below. Replace the sentence with:
   `Only where a first visit starts in the designed order: a child of 3 or younger starts at `fresh-splashes`, and a child of 4 or older starts at `dried-patches`.`

2. **The toy, line 21.** The sheet uses "caked" for dried mud, and by its own grid the sponge does not lift dried mud, so the toy as written would answer with a dry rasp and not with the foam of line 24. Replace with:
   `In the empty scene there is one vehicle, covered in soft wet mud, on wet concrete, with the sponge in hand. On touch-down, in the same frame:`

3. **The toy, line 27; the designed order, line 108; the scenes, line 132.** Floor puddles and trails are said to stay, yet line 108 does not store them, so on return the floor has been tidied away. Make them short-lived so nothing is lost:
   - Line 27: `- brown drips run down from the patch to the floor and spread into a puddle that creeps to the drain and is gone after a few seconds of play.`
   - Line 108, first sentence: `Not stored: the tool in hand (on load every tool hangs on the rack, where it came from); drips, bubbles, and the puddles and tracks on the floor, each of which lasts only seconds of attended play and leaves nothing to keep; and a scene in progress, whose outcome is saved when it starts.`
   - Line 132, the sentence about the trails that stay on the floor: `The most common state leads and the others add their trails, which lie on the floor while the newcomer rolls in and then dry away over a few seconds of play.`

4. **The grid, lines 42 and 43.** The sponge cells of wet paint and dull paint are both "White foam"; every cell must look and sound different. Replace the two rows with:
   `| **Wet paint** | A squeaky wet slide, drops scatter | Thin white foam that slides and runs in streaks, a wet slurp | Water sheets off the sills, drops bounce | It dries and shines, a rising squeak | The vehicle shakes like a dog first; wet tyre lines |`
   `| **Dull paint** (clean, dry) | The body bounces and the metal rings | Thick white foam that stands in peaks, a dry squeak going soft | Beads of water; wet paint | It shines, with one glint | A plain toot and off |`

5. **The grid, line 46.** Lines 96 and 131 say the puddle muddies the vehicle that waits, not the one being washed, and at most twice. Replace the last sentence with:
   `Each vehicle adds its own row of reactions (see the characters), and the puddle makes the vehicle that waits muddier when the child taps it, up to two times.`

6. **The four mechanic questions, line 63.** Line 62 puts the moment of decision at taking a tool in hand, so the choosing half of the skill is not in the rub. Replace with:
   `- **Fun.** Exploring how a material changes is the rub itself, the most enjoyable moment of play, and choosing the next step is the tap on a tool just before it, so play never stops for either.`

7. **The error as a consequence, line 76.** The shine scene and the proud horn of a shiny send-off are reactions to how the wash ended, so the sentence is false as written and leaves open whether they are a verdict. Replace with:
   `A vehicle's reactions are to what is on it and what touches it: the soap in its eyes, the cloth on its nose, its own paint gone shiny all over. None is turned to the child, and none rates the wash.`

8. **The designed order, line 104.** The cap of two puddle passes cannot be rebuilt from `who` and `cells`, so after a put-away a third tap would add mud again; every field of the saved state must be listed. Replace with:
   `- `next`: the vehicle that waits, as `who`, `cells` and `dips`, so mud from the puddle and foam that landed on it are kept. `dips` is how many times it has been through the puddle, 0 to 2, so a third tap only splashes after a put-away too; nothing shows it.`

9. **The characters, line 114.** The mixer likes anything on its drum, so it has no tool to glance at and no visible want, and three likes in the table are "anywhere on it", not one part. Replace the paragraph with:
   `Each vehicle's want is always visible. At rest the tipper keeps glancing at the sponge, the fire engine at the hose and the tractor at the cloth, and the mixer keeps rocking its drum a little way round and back, wanting something on it. Its like and its dislike never change, each is set off the way the table says (this tool or this material, on this part or anywhere), and each works every time.`

10. **Where the two differ, lines 174 and 175.** Neither bullet says which jurisdiction the game follows at that point. Replace with:
    `- **Water.** The Dutch record on physical phenomena names the force of water. No California record named here names water at all. For the push of the jet the game follows the Dutch record, and it rests nothing about water on California.`
    `- **Standing and age.** The California records are foundations published by a state department, for 23 to 36 months and for 3 to 5½ years. The Dutch records are guidance from the curriculum institute, for children before school and for the first school years, and say what is offered, not what a child can do. The claim words each set by its own standing, and the game takes each set's ages from its own lookup; neither is used for the other.`

11. **The claim, line 179, and under the `nl` heading, line 157 (ruling 1, and the form of ruling 2 for the part with no Dutch record).** Read after "all nine records", the last sentence rests the order of a wash on the Dutch guidance too, and line 172 itself says no Dutch record named states an order.
    - Replace the last sentence of line 179 with: `From the California foundations the game takes the order of a wash and exploring how a material changes; from the Dutch guidance it takes experimenting with materials, the push of water, and looking after a thing and handling tools with care, and no order of steps. It says nothing about what any child has reached.`
    - Add at the end of line 157: `For the order of the steps of a wash the game names no Dutch record, and nothing stands in its place.`

## Measured and seen by the lead on a graphics card

The build of `ea5e4adf`, in Chrome and WebKit on an Apple M4, 1180 by 820 at a pixel ratio of 2, through `npm run perf:jam`. A first reading, taken while other work ran on the machine; the reading for the pull request comes later, in a session opened and closed with the reference game.

- Chrome, CPU throttled six times, top tier pinned: 60 frames a second, 59 in the worst second, 1.7 ms of the game's own CPU time at the 95th percentile, 27 to 30 draw calls.
- WebKit, top tier pinned: 60 frames a second, 60 in the worst second, 1.0 ms.
- Chrome, not throttled, tier left to the governor: it stays on the top tier.

One thing seen in play, for you to reproduce in a test on the model before changing anything:

- **The cloth can still turn a whole vehicle brown.** A scripted wash of the tipper on a first visit: the sponge over the whole body twice, the hose over the whole body twice, then the cloth over the whole body twice, in rows from top to bottom. Where the hose had only softened dried mud, the cloth picked it up, and after the two passes every patch of the vehicle was brown. Your status block says the cloth now carries what it picked up onto the next three clean patches and is then clean; in this run the mud it laid down seems to have been picked up again and carried on, so the limit did not hold over a long rub. Say in the sheet what the cloth does with mud it has itself laid down, and hold it with a test that rubs the cloth across a vehicle with one soft patch left and counts the brown patches afterwards.

Nobody has listened to the game yet.
