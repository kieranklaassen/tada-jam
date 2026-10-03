# Answers for Night Camp: the check of the sheet, round 2

Checked: the sheet part of `games/night-camp/ART.md` (everything above `## The look`) whose sha256 is `b38c713afa3daf1496f52f2ffa8c60807ad9ba5a7928c0ff6c8b96093d598038`. Checker: D. Outcome: **OPEN round 2: 11 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 3`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the Night Camp design sheet (`night-camp`, band 9 to 12), round 2, checker D. File: `night-camp-r2.md`, everything above `## The look`; its sha256 is `b38c713afa3daf1496f52f2ffa8c60807ad9ba5a7928c0ff6c8b96093d598038`, as given. The diff against the round 1 copy shows only the round 1 pastes above `## The look`.

Records: all 13 looked up by pack id today; code, standing, regime (`nl 10 C e`: 2026) and check state (`confirmed`) are as the sheet says, and the 1F statement prints no code.
Limits: read in the record files for every Limits line that changed (`us-ca 4.MD.2`, `5.OA.3`, `6.RP.2`, `6.RP.3.a`, `nl rw/verh/2/03/fase2`); four match, one does not (finding 8).
Levels: ages 9 to 12 in both jurisdictions match the outline; the age 12 California gap line is now as printed. No suspected paste of official wording, no web address, no position id that names a grade, groep or level.

**Findings**

1. **The object-by-action grid, line 42 (against the pasted line 35).** Line 35 now says a wrong use never changes the plan and the thing ends back where it came from, "its pin" included. The cell for a lantern dropped on a lantern sends it to the nearest free pin, which can be another pin and so changes the plan. Replace the row with:
`| **Lantern** | It is carried across the map with its reach drawn as a pencil circle that follows it, and stands on the pin where it is let go. | It glows red, whistles like a kettle and hops out by itself. | Two lanterns stack and sway, then the top one slides off and hops back to the pin it came from. | It is worn as a hat: the reader reads on, pleased; the sleeper pulls the bag over their head. | The wick clicks between low and high, and the halo shrinks or grows. |`

2. **The representation, lines 72 and 73.** The pasted sentence in item 4 lets only the total carry a fraction. The sheet's own `tarn` example, two flasks for three hours, halved gives one flask for an hour and a half, so the fraction falls on the hours, on the card and on the strip. Line 14 promises that every numeral's place is listed. Replace line 72 with:
`3. On an amount card: one numeral beside its pieces and one beside its span of ruler. A halved card may show a fraction, as two whole numbers with a bar, beside a half piece that is drawn sawn or half full, or beside a span that ends half way between two hour divisions.`
and line 73 with:
`4. On the pencilled strip: the running total beside each stamp, and the hours it has reached on the ruler above. Under a halved card either may be a whole number with a fraction beside it: the total beside the pieces it counts, the half piece drawn sawn or half full, and the hours beside a stamp that ends half way between two hour divisions.`

3. **The designed order, lines 116 and 117 (the sentence pasted for round 1's finding 9).** The sentence speaks only for the rods. At `saddle` the stock is given (line 112), so an unfolded night there cannot be supplied at all, and the kettle's water has no dial. At a site with a sled the bed can refuse what the rods could supply. So the harder option the child chose can still be one that cannot be met. Replace line 116 with:
`- **A harder option, chosen by the child.** At any site but `saddle` the child may unfold one or two more sections of the folding ruler, two hours each. At `saddle` the load is given for the night as it is laid out, so the ruler there has no further section to unfold. A longer night is a visibly longer ruler, and the child may fold it back at any time. Nothing else makes a site harder, and nothing makes it harder unasked.`
and in line 117 replace the sentence "Every variant is chosen so that … stays below 100." with:
`Every variant but those of `saddle` is chosen so that its night, with both extra sections unfolded and every dial at its highest, can still be supplied from these rods and stays below 100, and, where the site has a sled, so that the supplies for that unfolded night fit on its bed at some setting of the dials. Every variant of `saddle` is chosen so that one setting of the dials makes the given load last the night with no more left over than a night that goes well allows.`
(Worked through for `summit` with five campers, two lanterns and eight hours: a bed that takes the unfolded night at the lowest dials still refuses the laid-out night at the highest, so both conditions can hold.)

4. **The designed order, line 108 (the row pasted for round 1's finding 8).** The row promises the remainder "from its second variant on", but the position moves up after one cycle that goes well. A child who goes well on `ford`'s first variant never meets the remainder there, and meets it first inside a later combination. One new thing wants its own position. Replace the row with these two (the id names a kind of place on a map sheet):
`| `ford` | A second multiplier. | The kettle: a cup for every camper at every hour, with water laid in by the can, each can holding six cups. In every variant the cups of the night as laid out come out as whole cans. |`
`| `spring` | A remainder that means one more. | The kettle again, with campers and hours whose cups do not come out as whole cans in any variant, so a part can means one more can. |`

5. **How a cycle is judged, line 125, and What is stored, line 149 (`last`).** Line 123 calls a late success "a good night" and line 125 says a staged night "after a good one costs nothing". The `last` row protects only `close`, so after `late` a staged failure overwrites it with `short` and the child moves a step down. Replace line 125 with:
`Once a night at this site has ended with nothing short and little left over, by the third night or after it, a later night at the same site is not judged: a night staged to fail, or left dark for the raccoons, after a good one costs nothing.`
and in line 149 replace "Once it is `close` it is not overwritten at this site." with:
`Once it is `close` or `late` it is not overwritten at this site.`

6. **What is stored, line 153 (ruling 5).** "Saved when its scene starts" names two of the five fields the morning changes; `phase`, `nights` and `changed` change at the same moment. Replace the second sentence of line 153 with:
`The morning is saved when its scene starts, with `phase`, `nights`, `changed`, `last` and `pins` written at that moment, and everything else in it (the ash, each camper's state) is worked out again from the saved plan, so on load it stands finished and nothing replays.`

7. **The records, nl, line 210 (against the pasted claim, line 237; ruling 7).** The claim takes the first part from the California records of grades 4 and 5, and line 210 names only the two grade 4 records, so `us-ca 5.OA.3` is in the part by one sentence and out of it by the other. Replace line 210 with:
`No `nl` record is named for the first part of the skill, whole-number problems of several steps with a remainder to interpret: that part is taken from the California records of grades 4 and 5 named above (`us-ca 4.OA.3`, `us-ca 4.MD.2` and `us-ca 5.OA.3`) alone, and nothing is named here in its place.`

8. **The records, nl, line 213 (`nl rw/verh/2/03/fase2`; ruling 9).** This record's Limits calls the problems simple and is silent on what counts as simple, yet the line lists it under "Left open by Limits". Replace line 213 with:
`  Limits taken: the model is prepared for the child; the ways of calculating are examples. Left open by Limits: which model, the year within the band, and the number range. Not in Limits: what counts as simple, which is the game's own choice (its ranges under "The designed order"). The game's own choice: the record's brackets name recipes and prices, and fuel for a night is neither.`

9. **Proposal 1, What is stored, line 142 (`lanterns`).** Sound: lines 35 and 42 have every lantern end on a pin, and with finding 1 a stacked one returns to its own. Paste as proposed:
`| `lanterns` | For each lantern, the pin it stands on and its wick, low or high. |`

10. **Proposal 2, What is stored, line 143 (`strips`).** The gap is real: a strip stamped before the dial was turned stays under the second card (lines 107 and 179), so a stamp needs the amount its card showed. "The dial" does not cover the lantern, whose setting is its wick, and the kettle has none. Paste this corrected row:
`| `strips` | For each user, the stamps laid along the ruler in pencil, in order, each with the card that made it (the setting of the fire's dial or of the lantern's wick that the card belongs to; the kettle has one card) and the side that card lay on (halved, single or doubled), so each card's row of the strip is drawn again exactly. |`

11. **Proposal 3, The designed order, line 115 (variants).** The sheet stays as it is; nothing to paste. With finding 4 pasted, no position depends on which variant comes first. The proposal would also need state the save does not hold: which positions have been met, and the last variant of each, where `variant` is one value for the present site.

12. **Proposal 4, The designed order, line 113 (`summit`).** The arithmetic holds against the sentence in line 117: five campers on a ten-can rod and two lanterns on a twelve-flask rod both cap the unfolded night at twelve hours, so eight as laid out is the most; seven also fits. Line 48's "long night" is not contradicted. Paste as proposed:
`| `summit` | Nothing new: everything together. | Up to five campers, two lanterns, the kettle and a sled with little room to spare, on a night of seven or eight hours. |`

Noted, not raised (unchanged text that round 1 passed):
- Line 233 speaks for every mathematics record of both jurisdictions (ruling 10). If the lead wants it closed: `- **Not carried by any record named above:** planning as such, and working against a clock. The game claims neither, and its night is not a countdown.`
- Line 179 lists no move for `ridge`, `saddle` or `summit`, so the pasted "plays again on a tap on the scout" has nothing to play there.

finding 1: pasted
finding 2: pasted
finding 3: pasted
finding 4: pasted
finding 5: pasted
finding 6: pasted (the `last` row carries the sentence finding 7 adds)
finding 7: pasted
finding 8: pasted
finding 9: pasted
finding 10: pasted
finding 11: pasted
finding 12: pasted
finding 13: pasted
finding 14: pasted
finding 15: pasted
finding 16: pasted
finding 17: pasted
finding 18: pasted
finding 19: pasted
finding 20: pasted

Eleven are open: findings 1 to 8 and proposals 1, 2 and 4 (findings 9, 10 and 12). Proposal 3 (finding 11) is ruled "stays" and has nothing to paste.

OPEN round 2: 11 findings

## From the lead

Finding 4 adds a position (`spring`). That is the checker's ruling on your third proposal, and it stands: add the id to `config.ts` and the rules with the paste, and keep the order the two rows give.

Two more, in text that round 1 passed. Handle them with the twelve above; the next round reads them with the rest.

13. **Where the two differ, the bullet that begins "Not carried by either:" (ruling 10: a sheet speaks only for the records it names or read).** Replace the bullet with:
`- **Not carried by any record named above:** planning as such, and working against a clock. The game claims neither, and its night is not a countdown.`

14. **The scenes, the bullet "A neat way".** It lists a move for some positions and none for `ridge`, `saddle` and `summit`, so "plays again only when the child taps the scout at dusk" has nothing to play there. Add one sentence of your own at the end of that bullet that says what a tap on the scout at dusk does at a position with no move of its own (it plays a named earlier move at this site's card and ruler, or the scout answers in its own way and plays nothing), and make the rules do the same. The next checker reads your sentence as new text.
