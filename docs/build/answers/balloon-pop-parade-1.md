# Answers for Balloon Pop Parade: the check of the sheet, round 1

Checked: the sheet part of `games/balloon-pop-parade/ART.md` (everything above `## The look`) whose sha256 is `2bdd3321af364369a6dec9009cc63700c8c293dd8712678156a7a37973bdd404`. Checker: B. Outcome: **OPEN round 1: 9 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 2`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet for `balloon-pop-parade` (Balloon Pop Parade, band 2 to 4), round 1. File read: `games/balloon-pop-parade/ART.md` as checked, lines 1 to 199 (everything above `## The look`). No file changed, no git run.

Records: all nine exist; code, scope, standing (`department-published-foundation` x4, `curriculum-institute-guidance` x5) and check state (`confirmed` x9) are as the lookup prints today. No web address, no suspected paste of official wording (California text is the pack's Summary), no attainment claim, no position id that names a grade, groep or level.
Limits: every limit the sheet takes is in that record's Limits and nothing comes from "In a child's hands"; two lines do not say they take the earlier statement only (finding 7), and one limit is taken more loosely than the play shows (finding 8).
Levels: us-ca ages 2, 3, 4 and nl ages 2, 3, 4 match the outlines (levels, sub-bands, `official` / `convention`, the `einde-po` label at age 4, no gap line). Headings all present and in order; first-visit default is open at both ends (ruling 4 kept); every stored thing the sheet says stays is a field or rebuildable, except what findings 2 names.

## Findings

**1. "The object-by-action grid", lines 37 to 42 (ruling 8).** Line 33 says every cell looks and sounds different, but ten kind-cells name no sound of their own (row 3 frog, hippo, crab; row 4 all four; row 5 duck, hippo, crab share one "Pop" and nothing else; row 2 duck and crab have only the same pop), and the six cells of the fifth column have no sound and three of them are the same result ("Row 4"). Replace the six table rows with:

```
| **1. A balloon of its own colour** | Flaps up and catches the string in its beak, tail wagging; a high boing | Shoots its tongue out and reels the string in; a wet twang | Yawns wide and the string drops in; a low honk | Snips the string out of the air with a click and holds it high | The nearest friend catches it in its other hand and does its kind's lift-off alone, a balloon in each hand; the two balloons rub together in a long rubbery squeal |
| **2. A balloon of another colour** | Turns its back and swats it away with its tail; a slap, and it pops on the grass | Puffs its throat and bounces it off; boing, then pop | Sneezes it away; it zooms off going flat with a raspberry and never pops | Pinches it by mistake; a snip and a pop together, and its eyes shoot up on their stalks with a ping | Its kind's refusal knocks the balloon it already holds, which swings round on its string and bumps it on the head; a hollow bonk |
| **3. A bunch with one for each friend** | Every duck jumps at once and each comes down with one; three boings in a run | The tongues cross in the air and each brings one home; wet twangs on top of one another, then a slurp | They yawn in a row, one after another; honks stepping down from high to low | They snip in a row like scissors; a quick run of clicks | Every friend grabs one more and the whole troop does its kind's lift-off at the same moment; the squeaks climb a scale together and the landings come one after another |
| **4. More balloons than friends without one** | The one that grabs is carried up flapping, lets go, and lands on its bottom; a flurry of wing-flaps and a soft bump | Hangs on by its tongue, legs stretched long, lets go and bounces twice; a rising slide-whistle and two boings | Only its toes leave the ground; the string strains with a rising creak, slips, and the hippo sits down so hard the clouds bounce; a deep thud | Spins like a propeller on the way up and comes down sideways; a whirr that climbs and a clatter of legs | When the bunch is bigger than the whole troop, the spare balloons bump the cloud on their way out and it sheds its drops on the troop; a squeak from the cloud and a patter of drops |
| **5. A tap on a balloon it holds** | Pop: it leaps straight up and sits down; a startled peep | Pop: its throat goes flat with a croak, then puffs up again | Pop: it does not notice for a beat, then looks up slowly; a long low hum that rises at the end | Pop: it hides its eyes, then peeks; a scuttle of feet, then one small blip | Pop: its kind's own start, then the troop stops swaying with a squeak of heels and looks at the empty hand; the friend reaches up again and can be given another |
| **6. A poke at the friend itself** | A high squeak and a tail wag | A double squeak and a hop on the spot | A long low squeak and a belly wobble | Two clicks and a sideways shuffle | Its kind's own squeak, and the balloon it holds bobs along on its string, which hums like a plucked rubber band |
```

**2. "The scenes", lines 146, 148 and 150 (ruling 5).** No scene has a "saved at the start" list that names every field it changes (only the general sentence on line 144), scene 2 has no "filled in from", and the troop of scene 3 is said to go "on to the far hill", where stored troops live, without being stored or made short-lived. Replace the three scene paragraphs with the three below (the last also carries the fix of finding 3):

Line 146:
```
**1. The march on the spot (the ending of a cycle).** *Cause:* the last friend of the troop takes its balloon; the scene plays each time that happens, also when a troop already served is filled again after a pop. *Beats, 5 to 7 seconds:* each friend in turn does its kind's own proud move with its balloon, in the order the balloons were taken; the troop marches three squeaky steps on the spot together; the balloons bob up in a wave from one end to the other; the troop settles, swaying, each friend looking up at its balloon. *Filled in from:* the kind, the size of the troop, and whether the balloons came one at a time (the friends take turns) or as one bunch (they jump together); the order of taking is short-lived and is not stored. *Saved at the start:* the first time for a troop, `finished` and `position` (the cycle is judged from `slips` at that moment); `troop` was saved when the finger lifted, and a later playing for the same troop saves nothing more. *After it:* the troop stays as it is for as long as the child likes.
```

Line 148:
```
**2. The step-in (how the next cycle starts).** *Cause:* the child taps the troop that waits at the edge, once the troop on screen has been served. *Beats, about 3 seconds:* the served troop marches off towards the far hill with its balloons, where the last four troops go round in a slow parade; the waiting troop walks in in its own gait and reaches up; a new troop comes to the edge; the sky fills with the next bunches. *Filled in from:* the kinds and sizes of the two troops, the balloons the served troop still holds, and the position. *Saved at the start:* `parade` (the served troop joins with the balloons it holds, and the oldest of five leaves), `troop` (the troop from `next`, every hand empty), `next` (the new troop), `sky` (the next bunches), `slips` (none), `finished` (false), `rng`, and, when a first showing plays inside it, that mark in `shown`. A tap on the waiting troop before the troop on screen is served makes it wave and nothing else.
```

Line 150:
```
**3. The pass-by (the first showing of a new idea).** *Cause:* a new idea arrives, three times in all, each shown once and marked in `shown`: handing a balloon to a friend of its colour (a new game), one for each (the first pair), and a bunch for a whole troop (the first bunches). *Beats, 4 to 6 seconds:* a troop of a kind other than the child's crosses the scene, stops under a balloon or a bunch that hangs low for it, takes it in its kind's way, and goes on over the far hill and out of sight. *Filled in from:* which idea, and the kinds on screen, since the troop that passes is never the kind the child is about to serve, so what is shown is the move and not the answer to the child's own troop. *Saved at the start:* its mark in `shown` and nothing else; the troop that passes and the balloon or bunch that hangs low for it are short-lived, are worked out from the idea and the kinds on screen, draw nothing from `rng`, are no part of `sky` or `parade`, and are gone on load. The first one is already crossing when a new game opens, so something is going on from the first frame; when a new game opens on a pair, which is the first visit of a child of 4 or older, the troop that crosses is a pair and each of the two takes one balloon, so the first two ideas are shown in that one crossing and both marks are set. Otherwise the other two play inside the step-in, before the child's troop walks in. (pack: game-design, guided-discovery.md)
```

**3. "The scenes", line 150 (pack: game-design, guided-discovery.md).** A first visit of a child of 4 or older starts at `pair-singles` with a pair already on screen and no step-in before it, so "one for each" would never be shown before the child's first pair. The replacement is the sentence beginning "The first one is already crossing" in the line-150 paragraph of finding 2; no separate paste.

**4. "The records / us-ca", after line 171 (ruling 7).** The sheet names a Dutch record for one-to-one pairing (Hoeveelheden / 3) and none from California, and no sentence under the us-ca heading says so. Add as a new paragraph after line 171:

```
One for each: the game names no California record for pairing one thing with each of another. `us-ca 1.6` is named for comparing the two sets, the friends without a balloon and the balloons in a bunch, and for nothing more.
```

**5. "The claim", line 199 (ruling 7).** The claim lists the records but does not say from which jurisdiction each part of the skill is taken, though California has no named record for amounts at age 2 or for one for each. Replace line 199 with:

```
Balloon Pop Parade is designed from four California learning foundations published by a state department, which are foundations and not standards (`us-ca 2.3` of the infant-toddler foundations, and `us-ca 2.5`, `1.4` and `1.6` of the preschool and transitional kindergarten mathematics foundations), and from five statements of Dutch curriculum-institute guidance, which is guidance and not law (Opereren met vormen en figuren / 1 and Hoeveelheden / 3, 4 and 6 of the peuter card, and Opereren met vormen en figuren / 1 of the fase 1 card); all nine records are confirmed. Sorting by one attribute is taken from both jurisdictions at every age of the band. Seeing a small set at a glance and comparing two small sets are taken from the Dutch peuter card and, from age 3, from the California preschool foundations; for age 2 no California record is named for them. Giving one for each is taken from the Dutch peuter card alone; no California record is named for it.
```

**6. "Where the two differ", lines 192 to 195 (ruling 6).** The first point gives the California record's ages wrongly (the record has an earlier statement, 3 to 4½ years, and a later one, 4 to 5½ years, with a range of one to five); the second says "the narrower one" without naming the jurisdiction; the third is a difference inside each jurisdiction and does not say so; the fourth does not say that nothing in the play depends on it; and one for each is missing. Replace lines 192 to 195 with:

```
- **A small group at a glance.** The California foundation (`us-ca 1.4`) starts at age 3: its earlier statement (3 to 4½ years) gives one to four as its example of small, and its later statement (4 to 5½ years) gives one to five as the range; the Dutch statement (`nl` Hoeveelheden / 6) is an offer for about 2 to 4 and names 2 or 3 only. The game's sets are one to three: at the top it follows the Dutch statement, and its set of one is inside the California example and outside the Dutch statement.
- **Amounts at age 2.** California's lane for age 2 has no record the game's handling of amounts rests on; the Dutch peuter card describes an offer that starts at about 2. The game follows California here, the narrower of the two: where a first visit starts for a two-year-old the troop is one friend, only colour decides, and at no position is an amount something a child has to get right before a cycle can be finished.
- **One for each.** The Dutch peuter card has a statement on one-to-one pairing (`nl` Hoeveelheden / 3); no California record is named for it. The game follows the Dutch statement: a string ties one balloon to one friend.
- **More than one attribute.** The California later statement (`us-ca 2.5`, 4 to 5½ years) and the Dutch fase 1 statement allow more than one attribute; the California earlier statement, `us-ca 2.3` and the Dutch peuter statement name one. This difference lies between the earlier and the later statements inside each jurisdiction, not between the two: in each the game follows the statement that names one attribute, and it sorts by one attribute at every position. At `bunches-mixed` the colour and the number must both be right; the number is asked of the set and is not a second sorting attribute, and that combination is the game's own design, which no record is named for.
- **Standing.** The California records are foundations published by a state department; the Dutch records are guidance from the curriculum institute. Neither is a standard or the law, and the claim names each as what it is. Nothing in the play depends on this difference.
```

**7. "The records / us-ca", lines 167 and 169 (pack: education, limits-come-from-the-limits-section.md).** At age 4 the lookup says both statements of a foundation apply, and for `us-ca 1.4` and `1.6` the sheet takes limits that only the earlier statement has (for 1.6, counting being optional) without saying so or saying what of the later statement is not used, as it does for `us-ca 2.5`. Replace the two "Limits taken" lines:

Line 167:
```
  Limits taken: from the earlier statement, a small group, seen without counting. The game's sets are one to three, inside the example the earlier statement gives; stopping at three is the game's own choice. Not used: the later statement's range of one to five. Left open by Limits: how the things are arranged (the fixed arrangement of a bunch is the game's choice). Short of the record: the record is about telling how many, and the game has no number word, so the child shows it only by which bunch they pick.
```

Line 169:
```
  Limits taken: two groups only (the friends without a balloon, and the balloons in one bunch); from the earlier statement, groups that are clearly equal or clearly different, with counting optional. Not used: the later statement's comparing by counting and its words for the smaller group. Left open by Limits: no number range, so one to three is the game's choice; whether two sets of at most three that differ by one are plainly unequal is not settled there, and treating them so is the game's choice. Short of the record: the game asks for no word such as "same" or "more".
```

**8. "The records / us-ca", lines 163 and 165 (ruling 1; the verb and the records).** Both lines take "two or more groups", but a troop is one colour and a balloon always goes to the troop below, so the child never chooses which friend and in one cycle makes only two groups, the troop's colour and the rest; the sheet should say this narrowing. Replace the two "Limits taken" lines:

Line 163:
```
  Limits taken: one attribute at a time; two or more groups, with no upper number; it describes what children typically show, not a requirement on a child. Left open by Limits: which attribute (colour is an example, and is the game's choice); naming the groups happens only sometimes, so the game asks for no colour word. The game's own narrowing: a troop is one colour, so in one cycle the child makes two groups only, the balloons the troop takes and the balloons it leaves or sends back, and never deals balloons out between friends of different colours; groups of other colours come one troop after another.
```

Line 165:
```
  Limits taken: the earlier statement, one attribute and two or more groups, at every position. Left open by Limits: no attribute is named, so colour is the game's choice. Not used: the later statement's more than one attribute. The game's own narrowing: as for `us-ca 2.3`, in one cycle the two groups are the troop's colour and the rest.
```

**9. "The records / nl", line 188 (pack: education, age-maps-to-levels-through-the-lookup.md; limits-come-from-the-limits-section.md).** At age 4 the lookup returns the peuter level only up to the fourth birthday and `fase-1` beside it, and all three amount records are from the peuter card; the sheet does not say that for a four-year-old in groep 1 these are from the level below and that no fase 1 amount record is named. Replace line 188 with:

```
Not named: the peuter card's statement on counting small amounts (Hoeveelheden / 1). The game has no number words and never asks for a count, so its verb does not rest on that record. Not named either: the fase 1 card's statements on amounts (the bullets under Hoeveelheden (tot tenminste 20)). For amounts the game is designed from the peuter card alone, which the lookup returns at age 4 only up to the fourth birthday; for a four-year-old in groep 1 those three records are from the level below the child's own, and their limit of 2 or 3 is taken from there.
```

OPEN round 1: 9 findings
