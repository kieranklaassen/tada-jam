# Answers for Bread Day: the check of the sheet, round 1

Checked: the sheet part of `games/bread-day/ART.md` (everything above `## The look`) whose sha256 is `805e0241f142af9fd4b920cb98f590de8ee725438e7aaea8e11834f4d68acbbc`. Checker: B. Outcome: **OPEN round 1: 13 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 2`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the Bread Day design sheet (`bread-day`, band 4 to 6), round 1. File read: `games/bread-day/ART.md` as checked, lines 1 to 252 (everything above `## The look`).

Records: all eight named records and the one "not used" record exist; code, standing (`department-published-foundation` x4, `curriculum-institute-guidance` x4, no regime) and check state (`confirmed`, all nine) are as the lookup prints today, 2026-10-03.
Limits: every limit the sheet takes is in that record's Limits and none comes from "In a child's hands"; two "Left open by Limits" lines say more than Limits does (findings 9, 10).
Levels: nl is as printed at 4, 5 and 6 (`fase-1`, convention, groep sub-bands, `peuters` at 4, `einde-po` label, no gap). us-ca is as printed at 4 and 5, but the sheet does not say that the lookup returns no `preschool-tk` at age 6 (finding 7).

Note for the lead: the status block names only a hash for the sheet. It must name the commit at the sheet's stage boundary (the copy came from branch tip 27bd83f2).

All ten headings are present and in order. No web address, no position id naming a grade, groep or level, no attainment claim, no symbol on the kid side, no score, reward, praise or pushing timer found. Ruling 4 is met at line 16 ("under 6" and "6 or older").

## Findings

**1. The object-by-action grid, lines 42 to 47.** Ten cells name a look and no sound, and Water/nook and Baked bread/nook have the same look (a curl of steam); the guide asks that every cell look and sound different. Replace the six rows with:

```
| **Flour** | A heap slumps out with a soft hiss and a white puff; the badger sneezes. | Furrows part in the dust with a dry scrape, and a cloud puffs up at each quick stroke. | Stays dust: a few grains slide with a faint patter, and the badger peers at it and shrugs. | Comes out toasted brown behind a wisp of smoke, settles with a dry rustle, and is still dust. | The customer sneezes a white cloud and comes out of it white all over. |
| **Water** | A puddle spreads to the rim with a gurgle and drips off the edge. | Splashes and rings, each with a plip. | A thin curl of steam rises with a faint simmering tick. Still water. | A long hiss, a cloud of steam out of the door, and the peel comes back dry. | The customer is splashed with a slosh and shakes itself dry. The duck gets in and paddles. |
| **The bubbly jar** | A blob plops out and burps. | Slimy strings follow the finger and bubbles pop. | Froths up, swells over the rim and burps louder. | Bakes into a thin crisp disc full of holes, which pings as it cools. | The customer sniffs, and its whole face puckers at the sour with a drawn-in squeak. |
| **Seeds** | They scatter, bounce and roll, ticking. | They skitter away from the finger with a quick rattle. | They stay as they are. One seed rolls over with a single tock. | They toast, crackle and hop on the peel. | The hen's chicks swarm the peel and peck it clean with a patter of beaks. Anyone else gets a seed stuck in a tooth and works at it with a click of the tongue. |
| **Dough** | Flour and water under the finger turn from streaky to shaggy to smooth; dropped back on the peel it slaps, squashes and jiggles. | Dents, bulges, folds and stretches (the toy). A push on risen dough knocks the air out with a long sigh. | With the bubbly in it, it swells, domes and wobbles, with small ticking bubbles. Without, it only goes warm and shiny and slumps a little with a soft squelch. | Turns gold, and the door opens on it with a warm whoosh. What it has become shows and sounds as the peel sets down: a crumbly loaf rustles, a brick clunks, an airy loaf crackles. | Raw dough goes gooey: strings stretch from the customer's teeth to the hatch and snap back with a twang. The badger loves it. |
| **A baked bread** | An airy loaf lands with a soft bounce and a sigh; a brick lands with a thunk that makes the peel jump and all the flour hop. | An airy loaf squashes with a wheeze and springs back, crackling; a brick does not give, and the badger knocks on it; a crumbly loaf sheds crumbs. | Its crust ticks once as it warms and the air above it shimmers. It stays what it is. | Gold goes dark with a low sizzle, and dark goes black with a pop and a puff of smoke the badger fans away. | The customer's own reaction to exactly this bread: its shape, its crumb, its crust and its seeds, with that customer's own sound. |
```

**2. The designed order, and what is stored; after line 146 (ruling 5).** The sheet says the finger dents, folds, pats and furrows the stuff, and that flour, water, strings, soot and a loaf on a horn land on characters; none is a saved field and none is said to be short-lived. Insert this bullet after line 146:

`- What the finger leaves on the surface is short-lived and is not saved: the dents, folds and pats of a lump settle out within about a second of the finger lifting, and loose dust and the furrows in it fade over a few seconds of game time. On load the stuff is drawn from its fields alone: dust, a puddle, batter, or a round or long lump at its work, its rise and its bake. Flour or water on the badger or a customer, strings of raw dough, soot on a nose and a loaf on the goat's horn last under two seconds, never change the bread, and are never saved.`

**3. The designed order, lines 116, 118, 142 and 143 (ruling 5).** The lane holds "up to two" and is refilled when a place is free, so a customer sent back from the hatch has no stored place; and the `hatch` field cannot be empty, although the sheet says the hatch stands empty after a send-back and after an ending. Replace:

- Line 116, second sentence: `Two customers or groups at most are laid out to wait in the lane outside the window, and one sent back from the hatch waits there with them.`
- Line 118: `**How the lane is filled.** Whenever fewer than two wait in the lane, a place is filled by a seeded pick: first from the customers of the current position, otherwise from those of earlier positions, and never an animal that is already at the hatch or in the lane. A customer sent back from the hatch rejoins the lane as it is, with the position it was laid out from and its count of breads handed back, so the lane holds three at most, and no pick is made until fewer than two wait again.`
- Line 142: `| `hatch` | Who is at the hatch (nobody, or one to three animals), the position they were laid out from, and how many breads they have handed back. |`
- Line 143: `| `lane` | Up to three waiting customers or groups (two laid out by the pick, and one more after a customer is sent back from the hatch), each with the same three things. |`

**4. The scenes, lines 189 to 192, with line 126.** Line 126 says the hen and the duck leave after their secret, so those two secrets end a cycle, but the scene does not say so, does not say the outcome is saved at its start, and leaves chicks in the bakery and a duck on the peel. Replace lines 189, 191 and 192 with:

`**A secret** (4 to 6 seconds, always from the same combination, never hinted at and never counted). The hen's and the duck's end as an ending does: the customer goes off down the lane, the peel is back on the board empty, the hatch stands empty, and that outcome is saved when the secret starts. The badger's leaves nothing behind.`

`- Loose seeds handed to the hen: the chicks ride the peel back into the bakery, peck it clean, and hop out again after her.`
`- A puddle handed to the duck: it climbs onto the peel, paddles, and waddles off down the lane shaking its tail.`

**5. The scenes, line 177 (with line 16).** A first visit by a child of 6 or older starts at `shapes`, where the first customer is the dachshund and two ideas (`dough` and `shapes`) are not yet shown; the line says the first customer is always the goat and does not say what plays. Replace line 177 with:

`- Cause: the first customer whose want needs an idea not yet shown steps up to the hatch. On a first visit a customer is already at the hatch when the game opens and the badger is already at the showing: the goat for a visit that starts at `dough`, the dachshund for one that starts at `shapes`. Where a want needs two ideas not yet shown, as the dachshund's does on a first visit at `shapes`, the two showings play one after the other in the designed order, each on the badger's own lump, and any touch ends the one that is playing.`

**6. The characters, line 163.** The mole's "want, always visible" cell names how it looks and nothing it does or carries, so its want is not visible as every other customer's is. Replace the row with:

`| The mole | Small, pale and soft, hugging a round basket lined with pale down and pressing its cheek into it | An airy, round, gold loaf: soft and pale as itself | A black crust leaves it with a sooty nose, and it sneezes soot |`

**7. The records, us-ca, lines 207 and 208.** At age 6 the lookup returns `kindergarten`, `grade-1` and the cross-grade lane and no `preschool-tk`; "also returns" at age 6 reads as if the level were still returned. Replace the two lines with:

`Level: `preschool-tk`, which the lookup returns at ages 4 and 5 and not at age 6. Age mapping: official, as the lookup prints. Sub-bands as printed: at age 4 the earlier range (3 to 4½ years) and the later range (4 to 5½ years) both apply; at age 5 the later range, which runs to five and a half.`
`Gap: none printed. At age 5 the lookup also returns `kindergarten`; at age 6 it returns `kindergarten` and `grade-1` and no `preschool-tk`; at both ages it returns the `cross-grade` lane beside them, labelled cross-grade. The game is designed from no record of those three lanes.`

**8. The records, line 203.** The Dutch descriptions follow the pack's English gloss (one is the gloss word for word), and the pack asks that the gloss be labelled as such when used; the California ones follow the Summaries. Replace the second sentence with:

`The descriptions of the California records are the game's own words or the record's Summary, which is the pack's text. Those of the Dutch records follow the pack's English gloss, which is not an official translation.`

**9. The records, us-ca, line 215.** Limits of this record does not say that the statement names no material or act, so "Left open by Limits" attributes to Limits what it is silent on. Replace "Left open by Limits: which materials and which acts; flour, water, the bubbly and seeds, and pushing, warming and baking, are the game's own choice." with:

`Not in Limits: any material or act. Flour, water, the bubbly and seeds, and pushing, warming and baking, are the game's own choice.`

**10. The records, us-ca, line 221.** Limits gives "short" and "longer" for the time, so the time is not wholly open, and the visible want standing in for adult support is the game's own choice, not something the record names. Replace the last three sentences of the Limits line (from "The customer stays" to the end) with:

`The customer stays at the hatch showing its want the whole time: that is the game's own stand-in for the adult support the record states, and the record names no such cue. Limits gives no length of time beyond short at the earlier age and longer at the later age, and no number of steps; up to four acts in one bread, at the child's own pace, is the game's own choice.`

**11. The records, under each heading (ruling 7).** Parts of the skill are taken from one jurisdiction only, and neither heading carries the sentence saying no record is named there for the part (the sheet says it only under "Where the two differ"). Insert:

- After line 210, under `### us-ca`: `No California record is named for putting events in an order of time, for food being processed and prepared, or for heat as a thing to discover: those parts are taken from the Dutch records alone, and nothing California is named in their place.`
- After line 228, under `### nl`: `No Dutch record is named for a material changing when something is done to it, or for keeping pieces of information in mind through a task of several steps: those parts are taken from the California foundations alone, and nothing Dutch is named in their place.`

**12. Where the two differ, lines 243, 244 and 248 (ruling 6).** The Standing and Talk points do not say which jurisdiction the game follows, Talk does not state the Dutch side of the difference, and Age says "a six-year-old" where the records stop at five and a half. Replace the three lines with:

`- **Standing.** The California records are foundations published by a state department. The Dutch records are guidance from the curriculum institute. Neither is a standard or the law. Here the game follows neither over the other: each is named in its own words, in the claim and wherever it is cited.`
`- **Age.** The California foundations named here reach to five and a half, and nothing California is named for an older child. The Dutch guidance covers the whole band. For a child older than five and a half the game follows the Dutch records alone.`
`- **Talk.** The California foundations ask a child to describe, predict or explain. The Dutch statements named here ask for exploring, discovering, wondering and realising, and none asks for talk. The game is wordless on the kid side, so here it follows the Dutch verbs, and it follows the California foundations only as far as exploring, trying and seeing.`

**13. The claim, line 252 (ruling 7, and ruling 1 for the wants).** The claim lists what the game takes without saying which jurisdiction each part comes from, and "keeps up to three wants in mind" drops the support that is part of the California record. Replace line 252 with:

`Bread Day is designed from four of California's preschool and transitional kindergarten learning foundations (foundations published by a state department, not standards; each confirmed), which reach to age five and a half, and from four fase 1 goals of the Dutch curriculum institute (guidance, not law; each confirmed). What it takes from them is this and no more. From both, each in its own records: exploring what materials are like, and finding out what an act does by trying it. From the California foundations alone: seeing that a material has changed after something is done to it, and keeping up to three wants in mind through a task of several steps while the customer goes on showing them. From the Dutch guidance alone: that food is usually prepared before it is eaten, heat as something to discover and wonder about, and putting acts in an order of time by doing them. That dough rises, and why, is in no record of either jurisdiction, and neither are mixing and baking as such: the game shows them as changes a child can see. For a child older than five and a half the game is designed from the Dutch guidance alone, and the parts taken from California alone are then the game's own choice.`

OPEN round 1: 13 findings
