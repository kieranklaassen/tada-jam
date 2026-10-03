# Answers for Monster Pizza: the check of the sheet, round 1

Checked: the sheet part of `games/monster-pizza/ART.md` (everything above `## The look`) whose sha256 is `a8217b7500a8fe7f1c99c7fc146d2f4233e6af9d9c7014bc36f4be0d3dbbad02`. Checker: B. Outcome: **OPEN round 1: 14 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 2`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet for `monster-pizza` (Monster Pizza, band 4 to 7), round 1. File: `games/monster-pizza/ART.md` as checked (copy from commit 3e52925d). Line numbers are lines of that file.

Records: all nine exist; code, scope, standing and check state (`confirmed`) match the lookup today; no Dutch record is a core goal, so no regime. No suspected paste of official wording, no web address, no position id that names a grade, groep or level; the ten headings are there in order; first-visit defaults are open at both ends (ruling 4).
Limits: each limit read against that record's Limits. Faults at us-ca 1.6 (finding 10), us-ca 2.1 (finding 11) and in the wording of nl rw/gb/2/08/fase1 (finding 12); the other six are as Limits has them, with the game's own choices marked.
Levels: outlines run for ages 4, 5, 6 and 7 in both jurisdictions. Basis, the age-7 gap line and the nl sub-bands are as printed; the us-ca sub-bands are missing and `grade-1` is also returned at age 6 (finding 9).

Findings

1. "The band and its age rule" line 15, "The object-by-action grid" line 54, "The designed order" line 118. The big roll is called a bigger order, a bigger card and a bigger eater, but an order one place higher is not always larger (`to-five` and `spare-tub` hold the same amounts), a waiting customer has no card yet (line 120), the customers' bodies are fixed (Bim is small), and at the last place both rolls are the same.
   - Line 15, replace "and the bigger order is always there to pick" with: `and the big roll is there to pick at every place but the last, where both rolls are the same`
   - Line 54, replace "counts out bigger orders by picking the customer with the bigger card" with: `takes on harder orders by calling in the customer with the big roll`
   - Line 118, replace the sentence "The small roll is an order at the stored position; ... visibly the bigger eater." with: `The small roll is an order at the stored position; the big roll is an order one place higher, and it looks like more to do in the world: a longer, fatter roll that its holder needs both arms for, whichever monster holds it.`

2. "The object-by-action grid" lines 39 to 44. Line 35 says every cell looks and sounds different, but all six "too few" cells have the same sound (one rumble), and three cells name no sound (olive too many, sock too many, sock fed by hand). Replace the six rows with:
```
| Pepper | A snappy tick as it lands; it skids a little and stops | Blisters with a hiss | One puff of flame for each extra pepper | The monster fans its open mouth at the pepper tub, one rumble for each missing, each ending in a dry pant | It gulps, its cheeks glow and one spark pops out of an ear |
| Mushroom | A soft thud; the cap bobs once | Shrinks a touch with a squeak | One hiccup for each extra, each with a hop | It sniffs the board like a pig after truffles, one rumble for each missing, each ending in a snuffle | It chews slowly and a tiny mushroom pops up on its head, then drops off |
| Olive | A hollow pop; it rolls a finger-width and stops | Glistens and one goes "tok" | One eye rolls right round for each extra, with a rattle like a marble in a cup | It peers through an olive-sized ring of its fingers at the tub, one rumble for each missing, each ending in a hollow hoot | It swallows it whole and the lump travels visibly down to its belly |
| Cheese | A wet slap; it sticks where it lands | Softens its corners with a low bubbling | One cheese string for each extra stretches from mouth to pizza and twangs back | It plucks an imaginary string and looks at the cheese tub, one rumble for each missing, each ending in a dull thrum | It pulls the piece out into a long string and plays it like a harp |
| Sock | A flump and a small puff | Steams with a whistle | One stink cloud for each extra, each with a parp; it pinches its nose | It lifts one bare foot and wiggles its toes at the sock tub, one rumble for each missing, each ending in a chatter of teeth | It pulls the sock onto an ear, a horn or its nose with a snap and wears it until it next moves, when the sock drops back into its tub |
| Worm | A springy boing; it wriggles once and lies still | Curls up with a zip | One wriggle for each extra runs down its body and it giggles | It makes its tongue wriggle like a worm towards the tub, one rumble for each missing, each ending in a smack of the lips |  It slurps it like spaghetti and the tail flicks its nose |
```

3. "The object-by-action grid" line 52, "The characters" lines 146 and 159 (ruling 5). Soot that a flame "leaves", a worn sock and a knot that "has to be unpicked" are marks on a customer with no field in the saved state and no word that they are short-lived. (The sock is fixed in the row of finding 2.)
   - Line 52, replace "a long roaring flame that leaves a sooty, blinking face" with: `a long roaring flame that leaves a sooty, blinking face until the monster shakes the soot off as the tasting ends`
   - Line 146, replace the last cell with: `socks: the eye stalk ties itself in a knot, and Bim unpicks it itself before the tasting ends`
   - Line 159, add at the end of the paragraph: `Every reaction is over when its scene ends or the next touch lands, and nothing it did to a customer is saved or there on load.`

4. "The representation" line 72 and "The scenes" line 173. Line 72 says the pieces are all of one size with no pattern, and line 63 says the card shows them in the same shape as in the tub, but the Baked column shrinks, curls and blisters them, and a pizza pushed back baked is where the pairing is redone; the sheet also does not say what a piece tapped onto a baked pizza looks like, with one baked mark for the whole pizza.
   - Line 72, add at the end of the paragraph: `Baking changes no piece's size, outline or colour: each kind does its baking move from the grid once as the pizza slides out and then lies still with its outline toasted dark on a browned base, so a baked piece still pairs by eye with its drawn piece on the card, and a piece tapped onto a baked pizza takes the toasted outline as it lands.`
   - Line 173, replace "each piece changed as its kind bakes" with: `each kind doing its baking move once and then lying still with its outline toasted dark`

5. "The designed order, and what is stored" line 128 (ruling 5). A scattered card is stored only as "scattered", so the picture a child was counting cannot be rebuilt as it was left. Replace the line with:
   `- \`order\`: the card, as a list of kind and amount, whether it is pictured in rows or scattered, and for a scattered card the seed its layout is drawn from, so the same picture is there on load.`

6. "The characters" line 157. In a tasting one beat is one piece (line 88), so a manner that turns one puff into "three quick sparks" shows the wrong amount. Replace the line with:
   `- Every reaction in the grid is played in the customer's manner, which changes its size, speed and shape and never the number of beats, since one beat is one piece: Grum's puff of flame is one slow rolling ball, Bim's is one quick spark with a hop.`

7. "The scenes" lines 167 and 181. Two customers stand at the door during a cycle, and the sheet does not say what a touch on one does while the customer at the counter has not eaten; as written it would start "Stepping up" and save an empty pizza over the child's work.
   - Line 167, replace "*Cause:* the child touches a customer at the door." with: `*Cause:* the child touches a customer at the door while the counter is empty or the customer at it has eaten.`
   - Line 181, after "The next cycle starts when the child touches one of them." add: `While the customer at the counter has not eaten, a touch on one at the door is answered in that customer's own manner, a hop, a wobble or a wave of its roll, and changes nothing else.`

8. "The scenes" line 167. The save at the start of "Stepping up" leaves out fields the scene changes, so a put-away in the middle loses which roll was held. Replace "*Saved at the start:* the new customer, its order, the tubs, an empty pizza, and the next two at the door." with:
   `*Saved at the start:* the new customer, its order, the tubs, an empty unbaked pizza, \`bigRoll\`, \`pushedBack\` at none, \`finished\` cleared, and the next two at the door.`

9. "The records", us-ca, lines 191 and 192. The sub-bands the lookup prints for `preschool-tk` are missing although the limits below are split by them, and `grade-1` is returned at age 6 as well as 7. Replace the two lines with:
   `Levels: \`preschool-tk\` (returned at age 4 with the sub-band Early (3 to 4 ½ Years) and Later (4 to 5 ½ Years), where both statements of a foundation apply, and at age 5 with the sub-band Later (4 to 5 ½ Years)) and \`kindergarten\` (returned at ages 5 and 6, with no sub-band printed). Age mapping: official at ages 4, 5 and 6; derived at age 7.`
   `Gap, as printed at age 7: "Grade 2 is not in the pack. A first grader turns seven during the year; a child who starts the school year at seven is in grade 2." Ages 6 and 7 return \`grade-1\`, and the game is designed from no grade 1 record: that lane works with numerals and sums, which this game does not show. The \`cross-grade\` lane is returned from age 5, labelled cross-grade, and is not used.`

10. "The records", us-ca 1.6, line 200. The earlier-age condition (sets plainly equal or plainly unequal) is listed as a limit taken, but an order one piece off does not keep it; the game falls under the later-age statement. Replace the line with:
   `  Limits taken: two groups only, at both ages. The game's orders fall under the later-age statement, which applies from age 4: the comparison is made by counting, and the difference need not be plain to see. The earlier-age statement has sets that are plainly equal or plainly unequal, with counting optional, and an order that is one piece off is beyond it. Left open by Limits: the number range, which is the game's own choice of ten. How many more is not asked, and the game never asks it: a tasting plays the difference out, and the child is not asked to name it. An order of two or three kinds is several pairs of groups on one pizza, which is the game's own choice.`

11. "The records", us-ca 2.1, line 209. Limits gives no number of steps, so "three steps" is the game's own choice and is not marked as one. Replace the last sentence "Left open by Limits: the length of time." with:
   `Left open by Limits: the length of time and the number of steps, so a job of three steps is the game's own choice.`

12. "The records", nl rw/gb/2/08/fase1, lines 222 and 223. The record is about representing amounts; "in another form" comes from the illustration under In a child's hands, not from the statement.
   - Line 222, replace the last sentence "Showing an amount in another form." with: `Representing amounts.`
   - Line 223, replace with: `  What the game takes: the amount pictured on the card is represented with pieces on the pizza.`

13. "Where the two differ", lines 234, 236 and 237 (ruling 6). Three points do not say which jurisdiction the game follows. Replace the three lines with:
   `- **Starting from a picture.** In us-ca, counting out a set starts from a number that is told (K.CC.5), which this game cannot do without a numeral or a voice, so under us-ca the step from picture to set is read only as comparing the two sets (K.CC.6 and foundation 1.6). In nl, representing an amount is a goal of its own (rw/gb/2/08/fase1), and a picture and objects are within it. The game follows nl here: an order is a picture, and no number is told.`
   `- **The ages covered.** The us-ca records reach from age 4 to age 6: foundations at 4 and 5, kindergarten standards at 5 and 6, and nothing at 7. The nl fase 1 goals cover groep 1 to 3, about ages 4 to 7 by convention. The game follows nl for the top of its band: age 7 is inside fase 1 there, and in us-ca it is the game's own stretch beyond the records named.`
   `- **The standing.** The us-ca records are two adopted standards and three foundations. The nl records are all guidance. The game follows neither over the other here: nothing in the play depends on standing, and the claim words each record in its own.`

14. "The claim" line 241, and a sentence under us-ca after line 209 (rulings 1 and 7). The claim gives "making a set that holds as many as a pictured set" as what all nine records carry, but the California records as taken carry counting and comparing only (the counting-out part of K.CC.5 is not taken), so that part comes from the Dutch record alone; "three steps" is also more than foundation 2.1 states, and the peuter card is not about what a school offers.
   - After line 209, add as its own paragraph under us-ca: `us-ca has no record named here for making a set from a picture, and the game names nothing in its place: K.CC.5 counts out from a number that is told, which the game does not take.`
   - Line 241, replace the paragraph with: `Monster Pizza is designed from, in California, three foundations published by a state department for preschool and transitional kindergarten (mathematics 1.2 and 1.6, and approaches to learning 2.1), which are foundations and not standards, and two kindergarten content standards adopted by the State Board of Education (K.CC.5 and K.CC.6); and, in the Netherlands, guidance of the curriculum institute SLO, which is not law: one statement of its content card for peuters, which says what can be offered to children before school, and three of its goals for fase 1, which say what a school can offer and not what a child must know. All nine records are confirmed. From the California records the game takes counting a set one thing at a time, counting to find how many, and comparing two sets as more, fewer or as many, with sets of up to ten. From the Dutch records it takes pairing one to one, counting to find how many, comparing two amounts, and representing a pictured amount with objects, with sets of up to ten. Making the set from a picture is taken from the Dutch goal rw/gb/2/08/fase1 alone, and an order of one to three kinds worked through in a job of several steps from the California foundation 2.1 alone. It is designed from no California record for a seven-year-old or for making a set from a picture, and from no Dutch record for the steps of a job.`

OPEN round 1: 14 findings
