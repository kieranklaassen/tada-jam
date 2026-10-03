# Answers for Night Camp: the check of the sheet, round 1

Checked: the sheet part of `games/night-camp/ART.md` (everything above `## The look`) whose sha256 is `b9e2820a538bfaf614a2d92c2fa5db7e06270cb23f044466c5b687f59192f452`. Checker: B. Outcome: **OPEN round 1: 20 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 2`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the Night Camp design sheet (`night-camp`, band 9 to 12), round 1. File: `games/night-camp/ART.md` as checked, everything above `## The look`.

Records: all 13 exist; code, standing, regime (`nl 10 C e`: 2026) and check state (`confirmed`) are as the lookup prints today, and the 1F statement prints no code, as the sheet says.
Limits: read in each record file; most match, four do not (findings 15, 16, 4, 18), and one record's unused part is not said (17).
Levels: both jurisdictions at ages 9 to 12 match the outline (levels, sub-bands, `derived` / `convention`, the `cross-grade` and end-of-primary labels); one California gap line is shortened (14). All ten headings are present and in order; no position id names a grade, groep or level; no web address; no suspected paste of official wording.

**Findings**

1. **The band and its age rule, line 15.** The first-visit default is a closed range at the bottom ("9 or 10"), against ruling 4 and against line 123, which has it open. Replace the bullet with:
`- **`ctx.childAge`.** It sets one default: where a first visit starts in the designed order. A child of 10 or younger starts at the first position and a child of 11 or older at the second. `null` starts at the first. A saved position wins over the age, and every position is reached by play at any age.`

2. **The object-by-action grid, line 35.** Several wrong uses leave something that looks as if it stays (a log as a pillow, a lantern as a hat, a card as a shade, a puddle, a melted marshmallow) and none is in the saved state, against ruling 5. Replace the paragraph with:
`Six objects by five actions. The first three objects are the supplies, which have a right place (their rod) and a right user (logs feed the fire, oil the lantern, water the kettle). Every other use is a wrong use: it works, it is funny, it costs nothing, and it never changes the plan. A wrong use is short-lived: when its few seconds are over the thing is back where it came from (its pile, its rod, its pin, the snack tin), what it left behind (a puddle, soot, a melted marshmallow, a log under a head) is gone, and none of it is saved. What does stay is stored: a lantern that is let go ends standing on a pin, a card stays on the side it was flipped to, and the marshmallow trail lies where it was laid. "At dusk" is while the child plans; "at night" is while the night runs.`

3. **The object-by-action grid, after line 44.** Sixteen cells name no sound, and every cell must sound different as well as look different. Add this paragraph under the table:
`**The sound of each cell that names none above.** Log on the fire: a stony crunch at dusk, a crackle and one loud pop at night. Log on a camper: a creak under the reader, a soft thump under the sleeper's head, a wooden clonk in the cook's pot. Oil flask on the fire: a deep whoomph and the flap of hats. Water can on the fire at dusk: a splat and one croak. Lantern pulled along: its handle squeaks with each sway and it sets down on a pin with a tick. Lantern on a lantern: two glassy clinks and a falling slide-whistle as the top one goes. Lantern on a camper: a hollow tonk on the head, then a page turning or a long zip. Amount card stamped: a soft thump for each stamp and a pencil scratch as the total is written. Amount card on the fire: a crackle, then a flap as it shakes itself flat. Amount card on a lantern: a papery slap. Amount card on a camper: paws pattering away and back, and a wet flop as it is returned. Amount card tapped: the flick of a playing card turned over. Marshmallow pulled along: a soft pop for each one laid. Marshmallow on the fire: a rising squeak as it swells and a sigh as it sags. Marshmallow on a lantern: a slow squelch and the flutter of stuck moths. Marshmallow on a camper: two muffled chews, or a snore with a gulp in it.`

4. **The representation, line 71, and The records, us-ca, line 193.** From `tarn` a halved card is stamped like any other, so its strip carries halves; line 193 gives whole numbers in the tables as a limit taken, and numeral 4 does not say a fraction can lie on the strip. Replace line 71 with:
`4. On the pencilled strip: the running total beside each stamp, and the hours it has reached on the ruler above. Under a halved card the total may be a whole number with a fraction beside it, beside the pieces it counts, the half piece drawn sawn or half full.`
and line 193 with:
`  Limits taken: the amounts in the tables are whole numbers, which holds for every strip stamped from a single or a doubled card; a table, a tape and a double line are tools the record gives as examples, and the game uses the table and the double line. Beyond the record: the strip stamped from a halved card carries halves, as the game's own choice; it is the amount for one of `us-ca 6.RP.2` laid out, and not a table of this record.`

5. **The four mechanic questions, line 82 (Guess).** The answer covers adding supplies but not `saddle`, where the stock is fixed and the child chooses among a few dial settings, which is the case the question asks about. Replace the bullet with:
`- **Guess.** At the first two positions a child can get a night through by adding and running again, and each run shows where the supply ran out and how many hours are bare, so even that way teaches the amount for each hour; a plan that only piles everything on gets through but does not go well (see "The designed order"); from the position where the sled has a bed of limited length it does not fit at all, because adding to one supply pushes out another; and at `saddle`, where only the dials turn, the settings can be tried one after another, but each try costs a whole night and shows by its pin or its leftover which way the next must go, and the fire's dial and each wick together give more combinations than the three nights of a cycle that goes well.`

6. **The error as a consequence, line 94, and The designed order, lines 129 to 146.** The cycle is judged "from the last night that was slid to dawn", and the pins and ash "lie where they fell", but once the child changes the plan after a morning the saved plan is no longer the plan that was run, so neither the judgement nor the pins can be rebuilt after a put-away (ruling 5). In line 94 replace the second sentence with:
`After any night the camp, the rods and the dials are exactly as the child set them, the pins lie where they fell until the next night is slid to dawn, the ash lies where it fell until the plan is changed, and the child changes one thing and slides the night again.`
Add two rows to the table after the `changed` row (line 143):
`| `last` | How the night that the judging reads ended: `none` before any night is slid to dawn, `short` when something ran short, `over` when nothing ran short and much was left, `close` when nothing ran short and little was left by the third night, `late` for the same after the third. Written as each morning starts. Never shown. |`
`| `pins` | For each user, the hour at which it ran out in the last night slid to dawn at this site, or none. |`
Replace line 146 with:
`A running night is a view of the saved plan and is not saved: put away in the middle of a night, the camp is found at dusk with the plan as it was. The morning is saved when its scene starts, with `last` and `pins` written at that moment, and everything else in it (the ash, each camper's state) is worked out again from the saved plan, so on load it stands finished and nothing replays. Once the plan is changed the ash is brushed away, since it belonged to the plan that was run, and the pins are drawn from `pins`, so nothing on screen needs a night that is no longer in the save, and the cycle is judged from `last` and `nights`. A piece in the hand is saved where it came from. Nothing reads a clock: the night moves only with the cursor, on attended time.`

7. **The designed order, lines 117 to 121, against lines 46 and 171.** Day 15 promises nights staged to fail on purpose and the picnic needs an unlit night, yet a cycle is judged from its last night, so the play the sheet promises moves the child a step down; failure is then not free (pack: game-design, ages-9-to-12.md). Add after line 121:
`Once a night at this site has gone well, a later night at the same site is not judged: a night staged to fail, or left dark for the raccoons, after a good one costs nothing.`
and end the `last` row of finding 6 with: `Once it is `close` it is not overwritten at this site.` (placed before "Never shown.").

8. **The designed order, line 106 (`ford`).** The column is "The one new thing" and the cell names two. Replace the row with:
`| `ford` | A second multiplier, and then, from its second variant on, a remainder that means one more. | The kettle: a cup for every camper at every hour, with water laid in by the can, each can holding six cups. In the first variant the cups come out as whole cans; from the second they do not. |`

9. **The designed order, line 115 (number ranges).** The ranges allow a harder option the child chose that cannot be supplied: five campers at sixteen hours take 80 cups, which is fourteen cans on a rod of ten, and six logs an hour for sixteen hours is 96 logs on a rod of sixty. Add after "every total below 100.":
`Every variant is chosen so that its night, with both extra sections unfolded and every dial at its highest, can still be supplied from these rods and stays below 100.`

10. **What is stored, line 139 (`strips`), and a missing field.** The card's side (single, doubled, halved) is in no field, so the card is not found as left and a strip stamped from a doubled or halved card cannot be drawn again from a count of spans (ruling 5). Replace line 139 with:
`| `strips` | For each user, the stamps laid along the ruler in pencil, in order, each with the side of the card that made it (halved, single or doubled), so the strip is drawn again exactly. |`
and add after it:
`| `cards` | For each user, the side its amount card lies on: halved, single or doubled. |`

11. **What is stored, line 144 (`shown`).** "Lights out" plays the first time a user goes out at a site, and the row does not say that mark is kept or that it is cleared with the site, so after a put-away the scene would play again as a first. Replace the row with:
`| `shown` | The ids of the first showings already given: a neat way for each idea, kept across sites, and lights out for each user at this site, cleared when a new site is laid out. |`

12. **The characters, line 156 and after line 158.** The cook has two wants where each character has one, and nothing says how a want shows at dusk, before a night is slid, so the wants are not "always visible". Replace line 156 with:
`| **The cook** (a pan for a hat) | A big fire. | The fire on its highest setting; a full kettle and a round poured for everyone. | A small fire: fans it with the pan. A dry kettle: holds it upside down and looks inside. A round poured after the fire is out: cold cocoa, and every face that tastes it. |`
and add under the table:
`**How each want shows before any night is slid.** At dusk the reader sits with the book open and tilted toward the nearest lantern pin or the fire ring; the sleeper lies in the bag with the hat pulled down and feet toward the fire ring; the cook stands at the fire ring with the pan raised over it; the scout stands by the mule with the empty straps over one arm, looking along the rods; the small one sits with the dog pressed against the nearest lantern or the fire ring.`

13. **The characters, line 157, and The scenes, line 170.** Line 13 says help is something the child fetches, and the sheet gives nothing to fetch: the neat way plays once and can never be asked for again. Replace line 157 with:
`| **The scout** (wide brim, the old hand) | To carry nothing back. | A morning with almost nothing left over. | Leftovers: straps all of it on the mule, sighing, in a tower. The scout is also the one who shows a neat way, once, after the child's own try, and again only when the child fetches it with a tap on the scout at dusk. |`
and add at the end of line 170:
`After its one showing it plays again only when the child taps the scout at dusk, and never unasked.`

14. **The records, us-ca, line 182.** The age 12 gap is not as printed: one clause is dropped. Replace the gaps sentence with:
`Gaps, as printed: at age 9, grade 3 is not in the pack (a third grader turns nine during the year; grade 4 starts at nine); at age 12, grade 7 is not in the pack (a sixth grader turns twelve during the year; a child who starts the school year at twelve is in grade 7).`

15. **The records, us-ca, line 187 (`us-ca 4.MD.2`).** The limit taken says a change of unit "only" from the larger to the smaller, while line 184 has the child turn cups into cans, the smaller into the larger; the part beyond the record must be said. Replace line 187 with:
`  Limits taken: two of the five named kinds of quantity (time and liquid volume); a can read as its six cups is a change of unit from the larger to the smaller, which is the direction the record gives. Left open by Limits: the number range, and what a simple fraction is. Beyond the record: gathering cups into cans, the smaller unit into the larger, which the game also asks for (it is the remainder step under `us-ca 4.OA.3`); logs and flasks, which are counted supplies of the game's own and not one of the five kinds; a can of six cups, which is the game's own unit.`

16. **The records, us-ca, line 189 (`us-ca 5.OA.3`).** "Each adding a fixed number from zero" is what the record's example does; its Limits says the statement does not say which kinds of rule are allowed, so this is a limit read from an example. Replace line 189 with:
`  Limits taken: two patterns, each from a given rule. Left open by Limits: the number range, and which kinds of rule are allowed. The game's own choice: both rules add a fixed number and start from zero, which is what the record's example does and not a limit it states.`

17. **The records, us-ca, line 190 (`us-ca 6.RP.2`), and The claim, line 226.** The record also asks for the language of rates, which a wordless game cannot carry, and `us-ca 4.OA.3` asks for equations with a letter, which line 185 says is not used; the sheet marks "in part" on two other records, so these two read as used whole. Replace line 190 with:
`- `edu.us-ca.grade-6.mathematics.objective.6-rp-2` (`us-ca 6.RP.2`): state-board-adopted-standard, confirmed. Asks for understanding the amount for one that belongs to a ratio, and for talking in rates. In the game, in part, from `tarn`: halving or dividing a card to find what one hour takes. The game has no words, so the talking is not in it.`
The claim's list is in finding 19.

18. **The records, nl, line 202 (`nl rw/verh/2/03/fase2`).** The record's Limits says its brackets name recipes and prices; the game's situation is neither and the sheet does not say so. Replace line 202 with:
`  Limits taken: the model is prepared for the child; the ways of calculating are examples. Left open by Limits: which model, what counts as simple, the year within the band, and the number range. The game's own choice: the record's brackets name recipes and prices, and fuel for a night is neither.`

19. **The records, nl, after line 199, and The claim, line 226 (rulings 1 and 7).** The claim's first part, whole-number reasoning in several steps, rests on California records only: every `nl` record named is about ratio or an amount for each unit, so the claim says more than the Dutch records carry and does not say where each part is taken from. Add as a paragraph after line 199:
`No `nl` record is named for the first part of the skill, whole-number problems of several steps with a remainder to interpret: that part is taken from `us-ca 4.OA.3` and `us-ca 4.MD.2` alone, and nothing is named here in its place.`
Replace line 226 with:
`Night Camp is designed from six California content standards adopted by the State Board of Education (`us-ca 4.OA.3` in part, `4.MD.2`, `5.OA.3` in part, `6.RP.2` in part, `6.RP.3.a` in part, `6.RP.3.b`), and, separately, from five statements of guidance by the Dutch curriculum institute on what a school can offer in fase 2 and fase 3 (`nl rw/verh/2/03/fase2`, `rw/verh/2/02/fase2`, `rw/m/8/01/fase2`, `rw/m/8/03/fase3`, `rw/verh/2/07/fase3`), one item of a Dutch legal core goal of the 2026 regime (`nl 10 C e`) and one statement of the Dutch legal reference level 1F, the last two being end-of-primary goals. Every record named was `confirmed` when read on 2026-10-03. What the game is designed for is working out whether a stock lasts. Its first part, whole-number reasoning in several steps with a remainder to interpret, is taken from the California records of grades 4 and 5 alone; no Dutch record is named for it. Its second part, ratio tables and reasoning about an amount for each hour, is taken from `tarn` on from the California grade 6 records and, separately and from the first position on, from the Dutch records named. It measures no child and claims nothing about what a child has reached.`
(The builder's other course is to name a Dutch record for the first part: the fase 2 lane holds candidates, for example `nl rw/bew/3/09/fase2`, `confirmed` today. That would be a new record entry with its own limits, checked in the next round, and the sentence and the claim above would change with it.)

20. **Where the two differ, lines 219 and 220 (ruling 6).** Neither point says which jurisdiction the game follows there. Replace line 219 with:
`- **A number for each unit of time** is named by the Dutch fase 3 guidance. The Dutch fase 2 guidance names prices and a speed as its examples, and California names price for one and steady speed as included kinds. Fuel for each hour is therefore the game's own choice of kind under the Dutch fase 2 records and under the California records, and the sheet says so under each record. For the kind of quantity the game follows the Dutch fase 3 guidance, the one place where an amount for each unit of time is named, and follows neither jurisdiction below that.`
and line 220 with:
`- **The word "rate"** is used of California only for the grade 6 records, which is where California uses it. The sheet follows California's usage for those records alone and writes "ratio" and "an amount for each" of the Dutch records.`

OPEN round 1: 20 findings
