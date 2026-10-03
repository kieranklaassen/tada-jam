# Answers for Seed Lab: the check of the sheet, round 1

Checked: the sheet part of `games/seed-lab/ART.md` (everything above `## The look`) whose sha256 is `c3303b4373c1643d1d687f1ff0cdf3771aec35c15bf3830aff1607974f39d087`. Checker: B. Outcome: **OPEN round 1: 12 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 2`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet of `seed-lab` (Seed Lab, band 9 to 12), round 1. File read: `games/seed-lab/ART.md` as checked (copy from commit e08d3944), everything above `## The look`. No file changed, no git that writes, lookup and file reads only, `--wording` never passed.

Records: all seven exist; code, standing (two `state-board-adopted-standard`, five `curriculum-institute-guidance` with no regime) and check state (all `confirmed`) are as the lookup prints today; the two Summary quotations match the records' Summary; no web address and no suspected paste of official wording.
Limits: five of the seven "Limits taken" lines are in the record's Limits; `nl ojw/pdm/3/12/fase3` and `nl ojw/pdm/3/07/fase3` each give as a limit something Limits does not say (findings 9, 10).
Levels: basis, sub-bands, lane labels and both gap lines are as printed; the us-ca line on ages 9 and 10 is not as printed (finding 8); I listed grade-4, grade-5, grade-6 and cross-grade science and the Dutch fase-2, fase-3 and einde-po science lanes, and none holds a further record on inheritance, variation or choosing parents.

## Findings

**1. The band and its age rule, line 14 (Pack rule for the range).** The guide's "By age" rule for 9 to 12 on the idle ladder is nowhere in the sheet, so nothing says what the idle guidance may show. Add after "Help is fetched by the child (the loupe).":

> The idle ladder shows what can be touched and, at most, one dab from one flower to another chosen without regard to the wish on the page; it never shows the cross that answers a wish.

**2. The object-by-action grid, line 35 (against line 26 and line 40).** The toy says a pod holds for a breath and bursts by itself, while the grid gives the pod five actions with "poke it: bursts" as the right use, so as written four or five cells can only be reached inside one breath. Add at the end of line 35:

> A pod left alone bursts by itself after its breath, as in the toy; the pod row is what a finger does within that breath, which holds for as long as a finger, the can or a visitor has hold of the pod, and what it does to a pod found waiting on load.

**3. The object-by-action grid, lines 37 to 44.** Twenty cells name no sound, so they cannot be shown to sound different, and the Dust column repeats one gag (the pod, the worm and the beetle all sneeze; the seed and the runner bud both have "the dust slides off"). Replace the table with this one, which keeps every cell's own words and adds only what is missing:

```
| | Poke it | Dust it (bring pollen) | Wet it (the can; the blotter does the opposite) | Carry it to a pot | Offer it to the visitor |
| --- | --- | --- | --- | --- | --- |
| **A plant in bloom** | Bends like a spring and plucks its own note (pitch by height); a puff of dust | **A pod sets behind the flower with a rising creak: the cross.** Its own dust works too | Petals sag, then it shakes itself dry like a dog, with a rattle of drops; its grown height stays | **Moves there**, the root ball landing with a soft thud. If the pot is taken it shoulders the other plant out with a scrape of clay, and that one hops to the border | **The visitor answers this exact plant, trait by trait**, each trait in that visitor's own voice |
| **A pod** | **Bursts with a pop: six seeds fly to the tray**, each with its own tick | Puffs up and blows the dust back out in one long raspberry, since it is already set | Swells fat and squirts all six in one jet, with a squeak | Lands whole in one pot with a muffled bump; six come up in a clump and elbow each other out into the free pots with a scuffle | The visitor shakes it like a rattle until it bursts in its grip, and the brood lands as usual |
| **A packet seed** | Hops with a click; on soil it sprouts where it lies | The dust slides off and the seed spins on its point with a hum like a top: a seed is already made | Swells and splits with a creak before it is even planted, and the sprout walks it to the nearest pot | **Grows there**, with the scratch of the pen line and its own plucked note | The visitor balances it (the snail on an eye-stalk), drops it with a tock, and it rolls into a pot and sprouts |
| **A runner bud** | Boings like a door-stop spring, a tone higher with each poke | The bud curls shut, flicks the dust off with a whip-snap and uncurls: a runner needs none | The runner stretches with a long rubbery groan and creeps to the nearest free pot by itself | **Roots there with a soft suck of soil: a copy of the one parent, still joined by its runner** | The visitor tugs it like a lead, the runner twangs, and the parent plant hops along behind |
| **A pot of bare soil** | The soil puffs with a whump; the worm looks out, looks round and goes back in | Dust settles with a faint hiss, nothing grows, and the worm comes up wearing a gold cap | **Darkens with a glug** (the blotter pales it with a dry squeak); filled twice it runs over and the beetle paddles past on a leaf | Swaps places with the pot it is dropped on with a clink of clay on clay, plants riding along | The visitor peers in, the worm waves, and the pot is handed back with a hollow knock |
| **The beetle** | Flips on its back, pedals, rights itself with a click | Turns gold, sneezes, and leaves gold footprints for a while | Opens its wing cases as an umbrella, and the drops drum on them | Digs itself in like a seed with a scrabble, waits, and climbs out affronted with a huff when nothing grows | Beetle and visitor bow stiffly, each with a small grunt; the beetle straightens the visitor's sketch |
```

**4. The representation, lines 50, 55 and 56 (and line 10).** The sheet states the idea as "two parents, the young differ; one parent, a copy", but in the game's own model a flower set with its own dust is one parent whose young differ, and a pair of true lines (line 46) is two parents whose young are all alike, so the stated idea is false in the game that claims it as science. Lines 55 and 56 also say a line "stays drawn" with no word on a parent that has left the page (ruling 5). Replacements:

Line 10, replace "each taking after both and no two broods alike" with:
> each taking after both, and a brood is rarely the same twice

Line 50:
> **The idea.** A young plant takes after its parents. Each young that comes from seed gets something from the flower that gave the dust and something from the flower that bore the pod, and the young of one pod can differ from one another, also when both flowers stand on one plant. A young that comes by runner is a copy of its one parent.

Line 55:
> - **Passing on is a thing the child carries.** Dust goes from one flower to another by the finger. The pod forms on the flower the dust reaches, the seeds come out of that pod, and a pencil line is drawn from each young to the plant that bore the pod and to the plant that gave the dust. Two parents, two lines. A flower set with its own dust is both: its young get two lines to the one plant, drawn side by side, and can still differ from one another. A line is drawn for as long as both its plants are on the page; it is rebuilt from the young's stored origin, and when a parent has left the page the line is not drawn.

Line 56:
> - **A copy has one line.** A runner is a stem from one plant to a new one, drawn for as long as both are on the page. One line, a runner, the same plant again.

**5. The representation, line 65 (Object, picture, symbol), last sentence.** The owner's standing default leaves out a reading on the child's work until he answers, and the sheet puts the question to him without saying what holds meanwhile. Replace the last sentence with:

> Whether the count beside a sorted group is a numeral on a quantity or a reading on the child's work is put to the owner in `REFINEMENT.md`; until he answers, the default holds and that count is not drawn.

**6. The designed order, and what is stored: ruling 5, seven places.** Each is something the sheet says stays, or does once, that no listed field holds and that is not made short-lived.

(a) Line 78, the tray: a second brood needs the six tray pots the first brood stands in, and the sheet does not say where those go. Replace "Nothing is taken away: both parents and all six young stay, so the child changes one parent, or crosses two of the young, and dabs again." with:
> Nothing is taken away by the miss: both parents and all six young stay where they stand, so the child changes one parent, or crosses two of the young, and dabs again.

and in line 131 add after "eighteen plants in the border.":
> A brood always lands in the tray: plants still standing there hop to the border first, in the order they came up.

(b) Line 104: "visitors that have arrived stay" has no field (`kit` holds packets and tools only) and contradicts the "Who visits" column. Replace the sentence "Moving down takes nothing away: packets, tools and visitors that have arrived stay, and only the wishes get simpler." with:
> Moving down takes nothing away: packets and tools that have arrived stay, since `kit` holds them, and only the wishes, and with them who visits, follow the position.

(c) Line 121, `plants`: the loupe shows which bead came down which line (line 57), which can be rebuilt only if the order inside a pair is kept. Replace "its four pairs packed in one number" with:
> its four pairs packed in one number, each pair in the order pod parent then dust parent

(d) Line 128, `shown`: the showing of a tool is "once per tool" (line 157) and nothing stores it. Replace the cell with:
> Ids of the ideas and of the tools the beetle has shown once

(e) Line 130: a packet seed is an object of the grid that can lie on bare paper, and no field holds it. Add after "A plant in the hand is saved in the pot it came from.":
> A packet seed that is out of its packet and not in soil is not saved: it is found back in its packet. Dust in the hand is not saved either.

(f) Line 159, the secrets: line 154 leaves the world in a scene's last pose, and the last pose of a secret holds a hat, a tape fence and a guard that no field stores. Add after "Nothing counts them and nothing marks one as found.":
> A secret leaves nothing behind that needs saving: when it ends, or at a touch, the hat, the tape and the fence are gone and the plant is where the offer or the carry would have left it without the secret.

(g) Lines 55 and 56, the pencil lines and the runner stem: replaced in finding 4.

**7. The designed order, line 131, against The scenes, line 156.** "No plant is ever harmed" is contradicted by the snail's ending, which eats the edge of a leaf. In line 131 replace "No plant is ever harmed, pressed or thrown away." with:

> No plant is ever killed, pressed or thrown away; the most that happens to one is the snail's nibble at the edge of a leaf in its ending.

**8. The records, us-ca, line 175.** The lookup returns grade-4 alone at age 9, grade-4 and grade-5 at age 10, and grade-5 beside grade-6 at age 11, so "for ages 9 and 10 the lookup returns grade-4 and grade-5" is not as printed and leaves out the eleven-year-old in grade 5. Replace line 175 with:

> At age 9 the lookup returns grade-4, at age 10 grade-4 and grade-5, and at age 11 grade-5 beside grade-6. Neither grade-4 nor grade-5 holds a record on traits passing from parents to young, so for a Californian child in those grades the game names no record and claims nothing.

**9. The records, nl, line 198 (`nl ojw/pdm/3/12/fase3`).** "The record does not say what the difference is" is given under "Limits taken" and is not in that record's Limits, which states the two sides, the two verbs, that no plants are named and that the terms sexual and asexual are not used. Replace line 198 with:

>   Limits taken: an offer for groep 7 and 8 with no year; the verbs are investigating and observing; two sides are compared and the game takes runners alone for the second side; no plants are named; the terms sexual and asexual reproduction are not used. Limits does not say what the difference is, and the sheet reads none into it: that young from seed can differ and a runner's young is a copy is what the game shows, and for the Netherlands that is the game's own choice.

**10. The records, nl, line 200 (`nl ojw/pdm/3/07/fase3`).** "Simple, so one condition with two states" reads a limit into a word, and the list of what the care consists of is given as kept from the record although Limits says the statement does not say what that care consists of. Replace line 200 with:

>   Limits taken: an offer for groep 7 and 8 with no year; the experiments are to be simple; the factors in brackets are examples; its part on animals is not in the game; its one condition is that care for living things is not forgotten. Left open by Limits, and the game's own choice: what simple means here (one condition, water, in two states, changed in one pot while its twin stays as it was), and what the care consists of, which the record does not say (no plant wilts, dies, is pressed or is thrown away, a plant in dry soil is small and not harmed, and a plant that leaves the page is carried out to be planted).

**11. Where the two differ, lines 206, 207 and 210.**

Line 206 (Age): "California carries inheritance in grade 6 only" is said of California but is true only of the lanes the pack holds (grade 3 is a printed gap, and the grade 6 lane is the placement of one course model), and "for ages 9 and 10 the game follows nl" hides that at age 9 the lookup returns fase-2 only, so the three fase-3 records are not at a nine-year-old's level. Replace line 206 with:
> - **Age.** In the lanes the pack holds for this band, California has records on inheritance in grade 6 only (the middle-school expectations that the preferred integrated course model places there), which the lookup returns for ages 11 and 12; grade-4 and grade-5 hold none, and grade 3 is not in the pack. The Dutch guidance offers the same-kind idea and the forms of plant reproduction in fase 2, which the lookup returns for ages 9 and 10, and the passing on of characteristics, the comparison of seed and runner and the experiments in fase 3, which it returns for ages 10 to 12. So for a child of 9 the passing on of traits is in no record of the child's own level in either jurisdiction: the game is designed there from records for older children, says so, and claims nothing for that child from them. For the fase 2 ideas the game follows nl; for the model of variation it follows us-ca MS-LS3-2.

Line 207 (Variation): same fault as finding 4, and "no Dutch record" needs its scope. Replace with:
> - **Variation among the young.** us-ca MS-LS3-2 carries that young made by one parent alone, without a cross, have the same inherited information as that parent, and that young made by a cross vary. No Dutch record in the fase 2, fase 3 or end-of-primary science lanes states either. The game follows us-ca here, as runner against seed, and its claim of variation is made from the California standard only.

Line 210 (Standing), ruling 6: the point does not say which jurisdiction the game follows. Replace with:
> - **Standing.** The California records are standards adopted by the State Board. The Dutch records are guidance from the curriculum institute: what a school can offer in a band, not what a child must know. The game follows neither over the other here: the claim words each record in its own standing.

**12. The claim, line 215, with lines 176 and 189 (rulings 1 and 7).** The claim lists what is taken "from them" in one list across both jurisdictions, though "of their own kind" and seed and runner as named forms are in the Dutch records only, and "surroundings shape how a plant grows" and the variation are in the California records only (the Dutch record carries simple experiments, with growth factors as an example); it also repeats "the young of one parent are copies", which the game's own self-dusting contradicts, and "for grade 6" where the codes carry no grade. Replace line 215 with:

> Seed Lab is designed from two California standards adopted by the State Board, which California's preferred integrated course model places in grade 6, `us-ca MS-LS3-2` and `us-ca MS-LS1-5`, both confirmed, and from five statements of Dutch curriculum-institute guidance, which say what a school can offer and not what a child must know: `nl ojw/pdm/3/10/fase2` and `nl ojw/pdm/3/08/fase2` for fase 2, and `nl ojw/pdm/3/14/fase3`, `nl ojw/pdm/3/12/fase3` and `nl ojw/pdm/3/07/fase3` for fase 3, all confirmed. From the California standards it takes this and no more: a model that shows why young by runner carry what their one parent carries while young from seed vary, and that both surroundings and inherited factors shape how a plant grows. From the Dutch guidance it takes this and no more: that a living thing comes from another of its own kind, that plants make new plants by seed and by runner and the two ways can be compared, that the characteristics of a kind are passed on to the young, and simple experiments with plants in which care for the living thing is kept. It names no record for a Californian child in grade 4 or grade 5.

Add under `### us-ca`, after line 176:
> No California record is named for two parts of the skill: that a living thing comes from another of its own kind, and seed and runner as named forms of plant reproduction. Both are taken from the Dutch guidance alone.

Add under `### nl`, after line 189:
> No Dutch record is named for two parts of the skill: that young from seed vary while a runner's young is a copy, and that surroundings and inherited factors both shape growth. Both are taken from the California standards alone. At age 9 the lookup returns fase-2 only, so for a Dutch child of 9 the three fase 3 records below are records of the band above.

OPEN round 1: 12 findings
