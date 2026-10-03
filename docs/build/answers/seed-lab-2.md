# Answers for Seed Lab: the check of the sheet, round 2

Checked: the sheet part of `games/seed-lab/ART.md` (everything above `## The look`) whose sha256 is `dabe8fedb41251edef641acf259cd1ceb1183c58490466332994c95a572d891d`. Checker: D. Outcome: **OPEN round 2: 5 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 3`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet of `seed-lab` (Seed Lab, band 9 to 12), round 2, checker D. File read: ``games/seed-lab/ART.md` as checked`, everything above `## The look` (sha256 of that part computed here: `dabe8fedb41251edef641acf259cd1ceb1183c58490466332994c95a572d891d`, as given). No file changed, no git that writes, lookup and file reads only, `--wording` never passed.

Records: the diff of the two copies holds the 12 round 1 replacements and no other change; all seven records looked up by id today, with code, standing (two `state-board-adopted-standard`, five `curriculum-institute-guidance`, no regime) and check state (all `confirmed`) as the sheet says; the changed lines 177, 191, 209 and 217 say no more than the Summaries and glosses carry; no web address, no suspected paste of official wording.
Limits: the changed lines 200 and 202 read against the Limits of `nl ojw/pdm/3/12/fase3` and `nl ojw/pdm/3/07/fase3`; 200 holds, 202 puts one thing under the wrong label (finding 4).
Levels: outline for ages 9, 10, 11, 12 in both jurisdictions is as lines 175, 191 and 208 say (basis, sub-bands and both gap lines as printed); grade-4, grade-5 and cross-grade science and the Dutch fase-2, fase-3 and einde-po science lanes read for the "no record" sentences of lines 175, 208 and 209, which hold.

## Findings

**1. The band and its age rule, line 14 (the idle ladder sentence pasted in round 1).** Line 72 says that at the first step a pod from any two plants on the page holds the wanted colour more often than not, so on the opening page every dab the ladder could show is a cross that answers the wish, and "it never shows the cross that answers a wish" cannot hold beside "chosen without regard to the wish" (taken literally the ladder shows no move where a newcomer needs one). Replace the sentence "The idle ladder shows what can be touched and, at most, one dab from one flower to another chosen without regard to the wish on the page; it never shows the cross that answers a wish." with:

> The idle ladder shows what can be touched and, at most, one dab from one flower to another, picked without regard to the wish on the page: a possible move, never one picked because it answers a wish.

**2. The object-by-action grid, line 40 (A pod, "Carry it to a pot"), against line 131.** Line 131 now says a brood always lands in the tray, while this cell has the six young end in "the free pots", which for a pod dropped in a pot of the shelf, or with fewer than five pots free, is another place and another count. Replace the cell with:

> Lands whole in one pot with a muffled bump; six come up there in a clump and elbow each other out into the six pots of the tray with a scuffle

**3. The designed order, and what is stored, line 121 (`plants`), ruling 5.** The pairs are now kept in the order pod parent then dust parent so that the loupe can show which bead came down which line (line 57), but that can be rebuilt only if the two plant ids of a seed are kept in that order too, and the cell does not say so. Replace "a seed of two plant ids" with:

> a seed of two plant ids, pod parent then dust parent

**4. The records, nl, line 202 (`nl ojw/pdm/3/07/fase3`), ruling 9.** That record's Limits says no factors are named and that the statement does not say what the care consists of, so "Left open by Limits" is right for those two, but Limits is silent on what simple means, and the line puts that under "Left open by Limits" as well. Replace line 202 with:

>   Limits taken: an offer for groep 7 and 8 with no year; the experiments are to be simple; the factors in brackets are examples; its part on animals is not in the game; its one condition is that care for living things is not forgotten. Left open by Limits, and the game's own choice: the factor, since none is named (water), and what the care consists of, which the record does not say (no plant wilts, dies, is pressed or is thrown away, a plant in dry soil is small and not harmed, and a plant that leaves the page is carried out to be planted). Not in Limits, and the game's own choice: what simple means here (one condition in two states, changed in one pot while its twin stays as it was).

**5. The place to rule on: a plant that holds a pod hops to the border. The designed order, and what is stored, line 131 (Bounds).** The pod travels with the plant: `pods` (line 123) names the plant a pod sits on and no pot, line 130 has an unburst pod found on its plant, and the other two readings break line 131 (a brood that comes up in the border does not "always land in the tray", and a plant that stays leaves five tray pots for six young). That reading puts pods on border plants, so the same line must also say what happens when such a plant is the one that leaves the page, or a brood saved at the moment its pod set is lost. Two sentences, both in line 131.

Add after "plants still standing there hop to the border first, in the order they came up.":

> A pod stays on its plant when the plant moves: a plant that is carried, hops to the border, is shouldered out of its pot or rides along in a swapped pot keeps its pod, unburst, since `pods` names the plant a pod sits on and no pot, and when that pod bursts its six young land in the tray like any brood.

Add after "That happens at the child's own action and never to a plant on the shelf, which only the child changes.":

> A pod never leaves the page: if its plant is carried out by the beetle or kept by a visitor, the pod bursts as the plant goes and its brood lands in the tray in the same way.

No field of the saved state changes with either sentence.

finding 1: pasted
finding 2: pasted
finding 3: pasted
finding 4: pasted
finding 5: pasted
finding 6: pasted
finding 7: pasted
finding 8: pasted
finding 9: pasted
finding 10: pasted
finding 11: pasted
finding 12: pasted

OPEN round 2: 5 findings

## From the lead

Two more, in text that round 1 passed before rulings 5 and 9 were given to checkers. Handle them with the five above; the next round reads them with the rest.

6. **The records, us-ca, the two "Limits taken" lines under the two California records (ruling 9).** In each of the two lines, where it says "Left open by Limits" of something that record's Limits section does not mention at all, replace those three words with:
`Not in Limits`
Keep "Left open by Limits" only for a thing the Limits section itself says the statement does not name.

7. **The scenes: the showing of a new tool, and the neat way to compare (ruling 5).** Both change saved fields (`plants`, `dry`, `nextId`, `shown`) and neither says what is saved when it starts; only the ending does. Add to each of the two a sentence of your own that begins "Saved when the scene starts:" and names every field that scene changes, as it stands at the scene's end, so that one put away or touched midway is found finished and never plays again; and add a test for each. The next checker reads your two sentences as new text.
