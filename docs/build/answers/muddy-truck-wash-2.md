# Answers for Muddy Truck Wash: the check of the sheet, round 2

Checked: the sheet part of `games/muddy-truck-wash/ART.md` (everything above `## The look`) whose sha256 is `46a0247f26caa29d207314cdc9d60b84a85d939e929734bde35690da7a9db571`. Checker: C. Outcome: **OPEN round 2: 6 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 3`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet of Muddy Truck Wash (`muddy-truck-wash`, band 2 to 4), round 2. Line numbers are lines of `muddy-truck-wash-r2.md`.

Records: all nine looked up again by id today; each prints the code, standing (`department-published-foundation` for the four California records, `curriculum-institute-guidance` for the five Dutch ones) and `confirmed`, as the sheet says. No record line changed, so the limits were not reopened.
Levels: the outlines for ages 2, 3 and 4 in both jurisdictions print what lines 144 and 159 say (levels, sub-bands, `official` and `convention`, the end-of-primary label at Dutch age 4, no gap).
Compared with round 1: all eleven replacements stand as given. Every other changed or added line was checked (40, 41, 48, 74, 96, 105, 107, 121, 131). Lines 74, 96, 105, 107 and 121 hold. The findings below are in the grid, the cloth rule, the scenes, and one sentence missing under `us-ca`.

1. **The object-by-action grid, lines 39 to 44 (ruling 8).** Line 35 says every cell looks and sounds different, yet sixteen cells name no sound: one under the bare finger, three under the sponge, five under the hose (which names a sound in one cell only), three under the cloth, four in the send-off column. Two of the cloth cells are new in this round. The two rows pasted for round 1's finding 4 keep their sponge cells and gain a sound in other cells. Replace the six rows with:
   `| **Dried mud** (pale, cracked) | A knock: a thud, a crack runs across, crumbs trickle | A dry rasp: crumbs and dust, suds dribble over the top and slide off; the mud stays | It darkens from the finger outward and turns to soft mud, a hiss that becomes a gurgle | A scratch and a puff of dust; the mud stays | Plates of mud crack off on the way out, each with a dry clack, and lie in a row of clods |`
   `| **Soft mud** (dark, wet) | A squelch and a dent that slowly fills | It lifts into brown foam that stays on the vehicle, with a wet scrub squeak | It glistens, slumps and drips brown, and clings, with a muffled splutter | It smears along the rub with a wet slither: of the next three patches under the finger, each one that is clean gets a thin smear, and then the cloth is clean | Splats fly off the wheels and land with wet slaps; brown tyre tracks |`
   `| **Foam** (brown from mud, white on clean paint) | Bubbles pop off it, plip by plip; the foam stays | More foam, taller, with a soft fizz, and bubbles drift off | It slides off in rafts that sail to the drain with a long slosh; clean wet paint | It is pushed along the rub with a soft crackle of bubbles: the foam moves with the cloth onto clean paint and the paint behind it is left wet, so there is never more foam than before; the cloth wears a foam beard | Blobs of foam peel off behind with soft plops and a line of bubbles follows |`
   `| **Wet paint** | A squeaky wet slide, drops scatter | Thin white foam that slides and runs in streaks, a wet slurp | Water sheets off the sills with a steady drumming, drops bounce | It dries and shines, a rising squeak | The vehicle shakes like a dog first, with a rattle; wet tyre lines |`
   `| **Dull paint** (clean, dry) | The body bounces and the metal rings | Thick white foam that stands in peaks, a dry squeak going soft | Beads of water form with a light patter; wet paint | It shines, with one glint and a short low squeak | A plain toot and off |`
   `| **Shiny paint** | A dull fingerprint and a soft pat | Foam hides the shine, with a smooth slippery hush | Fat round drops race off with a quick tinkle; wet paint | A higher squeak and a second glint; still shiny | Lamps flash, a glint runs nose to tail, a proud horn |`

2. **The object-by-action grid, line 48 (the cloth rule; ruling 5; pack: game-design, ages-2-to-4.md and liveliness-from-causing-and-comedy.md).** Four faults in one paragraph: the heading's "nothing" leaves the cloth on a smear with no answer, where line 13 says every touch is answered; the bound "at most three patches along a rub from each patch of soft mud" is not what the rule gives, since one rub that crosses the same soft patch twice lays six; "a put-away changes none of this" is untrue of the mud on the cloth, which is in the hand and not stored; and the new smear state is not classed for the judging of a wash (lines 92 and 93). Replace the paragraph with:
   `**What the cloth does with mud it has itself laid down: it never carries it on.** A smear is thin mud of its own kind, and a patch holds it as its own thing. It is not a seventh row of the grid: it looks and sounds as soft mud does, to the sponge and the hose it is soft mud (soap lifts it into foam and water leaves it clinging), and when a wash is judged a smeared patch is a patch that holds mud. Under the cloth a smear slides a little, with the wet slither soft mud gives the cloth, and stays where it is, so the touch is answered and nothing spreads. The cloth picks mud up only from soft mud, never from a smear, whether this rub laid it or an earlier one did, and a muddy cloth is clean again three patches on whatever those patches hold. So each time the cloth crosses a patch of soft mud it lays at most three smears, on the next three patches under the finger, and no smear ever feeds another, however long or often the cloth is rubbed. The mud on the cloth is not kept: a cloth that goes back to the rack is clean, and so it is on load. A put-away changes nothing else, since every smear is in the saved grid. A wrong attempt stays small, where it happened, and is mended by one stroke of the sponge and one of the hose.`

3. **The scenes, lines 131, 133 and 136 (ruling 5).** No scene's "saved at the start" names every field the scene changes: the drip names only `shown` although it turns a patch of `bay.cells` to soft mud, the puddle names nothing although it changes `next.cells` and `next.dips`, and the sentence for the send-off leaves out `seed`, `came` and `dips`.
   - Line 131, replace the last sentence with: `The mark in `shown` and the patch turned to soft mud in `bay.cells` are saved at the start.`
   - Line 133, replace the last sentence with: `A third tap only splashes and changes no field. Saved at the start of the first and the second: the added mud in `next.cells`, and `next.dips` one higher.`
   - Line 136, replace the sentence "When a scene's outcome is saved the position has moved, the newcomer is in the bay and another waits." with: `The send-off and the roll-in saves at its start: `position` as the judged wash moved it; `bay` as the newcomer, with its `cells` and `came`; `next` as the vehicle that then comes to the door, with its `cells` and with `dips` at 0; and `seed` as laying out that vehicle's mud left it.`

4. **The scenes, line 131 (the tap; pack: game-design, ages-2-to-4.md).** The tap is a new thing that hangs in the bay at all times and works "in this scene only", so a child who has just watched it drip and pokes it gets no answer, against line 12 (nothing that means nothing when touched) and line 13 (every touch is answered). Replace the sentence that begins "The tap lets a drop go in this scene only" with:
   `The tap lets a drop go in this scene only; the drop is not from the hose, so that the nose is not hidden behind the rack as it lands. The tap is not a tool: touched at any other time it swings on its arm with a clink and gives no water.`

5. **The scenes, line 131 (what fills the drip in).** The dried patch on the nose is promised by the layout only, but line 96 has the first vehicle with dried mud wait at the door for a whole wash, where the puddle (twice) and thrown foam can reach it before it rolls in; round 1's "nearest the nose" covered that and the new wording does not. Replace the sentence that begins "Filled in from: which vehicle, and the dried patch on its nose" with:
   `Filled in from: which vehicle, and the dried patch on its nose. The arriving mud at `dried-patches` always puts that patch there, open to the sky, and until the showing has played neither mud from the puddle nor thrown foam lands on it.`

6. **The records, under `### us-ca`, line 155 (ruling 7).** The claim takes the push of water, and looking after a thing and handling tools with care, from the Dutch guidance only, and no sentence under the `us-ca` heading says that no California record is named for those parts (the `nl` heading has its sentence for the order). Add at the end of line 155:
   `For the push of water, and for looking after a thing and handling tools with care, the game names no California record, and nothing stands in their place.`

Round 1 findings:
1 pasted
2 pasted
3 pasted
4 pasted
5 pasted
6 pasted
7 pasted
8 pasted
9 pasted
10 pasted
11 pasted

OPEN round 2: 6 findings
