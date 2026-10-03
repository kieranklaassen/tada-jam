# Answers for Wild Hair Salon: the check of the sheet, round 1

Checked: the sheet part of `games/wild-hair-salon/ART.md` (everything above `## The look`) whose sha256 is `45ab1170dc484757fca139faf6805db59bc789df0476ac6512b24a71a8632721`. Checker: B. Outcome: **OPEN round 1: 9 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 2`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet for `wild-hair-salon` (Wild Hair Salon, band 4 to 6), round 1. File read: `games/wild-hair-salon/ART.md` as checked, everything above `## The look`. Line numbers are lines of that file.

Records: all six exist; code, standing and check state (`confirmed`) are as the lookup prints today; the three California Summaries in the sheet are the records' Summaries word for word; no web address, no suspected paste of official wording.
Limits: each limit taken is in its record's Limits except one (finding 8); the communicating part of `us-ca 3.1` is left unsaid (finding 7).
Levels: us-ca (official) and nl (convention) at 4, 5 and 6, sub-bands, the `cross-grade` and end-of-primary labels and "no gap" are all as printed; headings all present and in order; position ids name no grade, groep or level; first-visit defaults are open-ended at both ends (ruling 4).

## Findings

**1. "The object-by-action grid", lines 34 to 39, and "The characters and their fixed tastes", line 128.** Seven cells name a look and no sound, three sound words each stand in two cells (twang, boing, tick), and the face-by-ruffle cell points to head-rub answers of which two have no sound, so not every cell looks and sounds different. Replace the lines with:

Line 34:
`| **A lock under the cape** (the customer's) | Stretches longer with a creak that falls in pitch, and stays as long as it was pulled; the head leans after it | Cut where it was crossed; the piece drops to the floor and the stump twangs up; it stays cut | Plucked like a string: a note that is lower the longer the lock is, and one slow swing | Fans out and flutters with a dry rustle, then falls straight, as long as before; the head wobbles | The ribbon clips on beside it with a wooden clack, their top ends level, and both hang still |`

Line 35:
`| **The friend's lock** (the model) | Stretches, then snaps back to its own length with a rubbery boing; the friend's eyes cross | A piece pops off, the friend shakes like a wet dog, and the lock is back at its own length with a cork pop | Hums in the friend's own voice, and an ear flicks | The friend squirms and laughs; the lock does not change | The friend takes the clip in a paw and holds its breath with a small gulp, cheeks puffed, while the ribbon hangs beside the lock, top ends level |`

Line 36:
`| **A tuft of the mane** | Grows into a tall plume that flops over when it is top-heavy, with a rising whistle | Becomes a round pom, and a puff of fluff floats up with a soft poff | Bobs like a spring with a wiry sproing, and the tufts next to it ripple outwards | The whole mane frizzes into a ball with a crackle, then sinks back to how it was | The ribbon ties itself into a bow on the tuft with a rustle and a ting; the customer looks up at it and likes it or hates it, by its taste |`

Line 37:
`| **The ribbon** | Runs longer off its roll with a ratchet tick, and stays | Cut; the offcut spirals down slowly like a leaf with a paper flutter and lies on the floor | Snaps like a rubber band with a flat thwap, curls up at its end and uncurls | Spins into a corkscrew with a whirr, then hangs straight | Carried back to its peg, it winds on with a zip and hangs there at the length it has |`

Line 38:
`| **A clipping** on the floor | Comes along in the fingers, wriggling with a dry scritch, and lies where it is let go; let go on a face it sticks there with a soft smack | Cut in two with a small snick, and the halves hop apart; a piece too small to cut turns to fluff and blows away with a sigh | Hops like a flea with a tiny pip | Rolls up into a fluff ball that rolls away under the chair with a low trundle | The ribbon lies down on the floor beside it with a soft flop, ends level |`

Line 39:
`| **A face** (the customer's or the friend's) | The cheek stretches like dough and snaps back with a blub and a squeak in that customer's voice | The scissors snip the air by the nose; the customer goes cross-eyed, ducks under the cape and peeks out; nothing is cut | A giggle in that customer's own voice, different on the nose, an ear and the chin | A head rub: each customer answers in its own way, by its taste | The ribbon wraps round the head as a blindfold with a silky swish, and the customer lifts it to peek with an "ooh" in its own voice |`

Line 128:
`| A head rub | Loves it: purrs and melts down in the chair | Hates it: huffs and puts every curl back with a paw | Hates it: sinks into his hair with a long low groan until only the nose shows | Loves it: one hind leg kicks by itself and drums on the chair |`

**2. "The designed order, and what is stored", lines 108 and 109 (ruling 5).** The sheet says a bow stays on the tuft it was tied on, a blindfold on the head it was wrapped round, the ribbon on the floor beside a clipping, a ribbon offcut on the floor, and a clipping on a face as a moustache or an eyebrow, but the fields store only the kind of place, so none of these can be rebuilt where the child left it. Replace with:

Line 108:
`- `ribbon`: nothing until the ribbon has first been shown, then its length and where it is: on its peg, beside the lock, beside the model, tied on one of the nine tufts of the mane with the number of that tuft, round the customer's or the friend's face with whose face it is, or on the floor with its place along the floor.`

Line 109:
`- `clippings`: up to twelve pieces of hair or ribbon, each with a length, a colour, and where it lies: a place along the floor, or stuck on the customer's or the friend's face with whose face it is and the spot on that face. A thirteenth piece turns the oldest one on the floor into fluff that blows away.`

**3. "The scenes", line 148 (ruling 5).** The stored places of the ribbon and of clippings on faces point at "the customer" and "the friend", and the sheet does not say what becomes of them when the pair changes, so a moustache or a blindfold would be found on the next customer. Replace the line with:

`**How the next one starts.** The next pair is visible at the door the whole time, under their rain hats. They come in when the child touches the door, and the pair that was done go out past them. The pair that go out wear out of the door whatever is stuck on their faces, and those pieces leave `clippings`; a ribbon that hung beside a lock, in the mane or round a face is back on its peg at the length it has; pieces and a ribbon on the floor stay where they lie. If the child does nothing, nothing starts: no next round begins by itself and nothing counts down. The ones who wait look about and rock on their heels; they never knock, wave the child over or look at a clock.`

**4. "The designed order, and what is stored", line 112 ("Found as left": a scene's outcome is saved when the scene starts).** The sheet says this for the cape scene only, and not for the coming-in scene or the three things shown once, so a put-away in the middle of one of those has no stated outcome and line 150 ("On load no scene plays") cannot be kept. Replace the line with:

`A lock held in the fingers is stored at the length it has. A ribbon or a clipping carried in the fingers is stored where it was picked up. No scene is stored, and each scene's outcome is saved when it starts: for the cape coming off, `cape`, `finished` and the new position; for coming in, the new `chair`, `friend`, `waiting`, `seed`, `lock`, `model`, `seat` and `mane`, with `cape` set to `on` and `finished` cleared; for a thing shown once, its mark in `shown`, with what it changes in `mane` and `clippings`, and for the ribbon the ribbon on its peg at the length the showing leaves it. So a game put away in the middle of any scene opens in the state that scene ends in and plays nothing again. The largest state the game can reach is under two kilobytes, and a test holds it under half the 64 KB cap.`

**5. "The scenes", lines 150 and 152.** The sheet describes the load of a saved salon only, and the idle ladder only while a customer is under the cape, so on a first visit (no save, and "the snip, in the first cycle ever" needs a coming-in first) and after the cape has come off nothing glows on what can be touched and a child of 4 has no cue for the door (cue-table row 3 to 4: a breathing glow on what can be touched now). Replace with:

Line 150:
`**On load** no scene plays. The salon is as it was left: the cape on or off, the friend on its seat, every length as it was, the clippings where they lay, and the next pair at the door. On a first visit, with no save, the chair is empty, the first pair waits at the door, and nothing has been shown.`

Line 152:
`**The idle ladder** (the template's `guidance.ts`, on attended time) shows what can be touched and then one move, never a solution. With a customer under the cape: first a breathing glow on the lock, then a ghost hand that snips or pulls one tuft of the mane, which is the verb and not the answer, and after that the cape's knot. With nobody under the cape, on a first visit or after the cape has come off: a breathing glow on the door, and on the chair as well when a finished pair stands by the door, and no ghost hand. It backs off and stops after a few tries.`

**6. "The characters and their fixed tastes", line 118.** Each of the four animals is the friend on some days, and the sheet gives a visible want for the customer's part only, so a character on screen has no stated want (pack: game-design, characters-with-opinions.md). Replace the line with:

`**The one want, always visible.** The customer wants its lock as long as its friend's. Its eyes go from its own lock to the friend's and back, and a paw pats its own. The friend wants the same thing for the customer: it holds its own lock out where the customer can see it, and its eyes go from that lock to the customer's and back. Both wants are about two things in the scene and are never about the child.`

**7. "The records", us-ca, line 163, and "Where the two differ", line 186.** The Summary of `us-ca 3.1` and its Limits have the child communicate about the differences at both ages; the sheet says this part is not in the game for `us-ca K.MD.2` only, and the "Words" point names only the kindergarten record. Replace with:

Line 163:
`  Limits taken: awareness only at the earlier age, which is why the first position has two lengths that differ plainly; two objects at the later age; no units, numbers or measuring tools. Left open by Limits: how the two are compared, with side by side as its example; two strips hanging from one level line is the game's own choice. Of the three attributes it names, the game uses length only. The record has the child communicate about the differences at both ages. Nothing in the game hears or asks for words, so that part is not in the game: it is designed from the noticing and the comparing only.`

Line 186:
`- **Words.** The California foundation and the California kindergarten record each have the child communicate or say what a comparison shows, and one Dutch goal has the words for length as part of the goal. The game follows neither: it has no words.`

**8. "The records", us-ca, line 165 (pack: education, limits-come-from-the-limits-section.md).** The Limits of `us-ca K.MD.2` say that in the record's example the difference is put in words and not as an amount; the sheet turns that into a bound on the statement ("never an amount"), which Limits does not state. Replace the line with:

`  Limits taken: exactly two objects, compared directly on one shared feature; no units, rulers or numbers; in the record's own example the difference is put in words such as taller and shorter, not as an amount. Left open by Limits: which feature; length is the game's own choice. The record has the child say what the difference is. Nothing in the game hears or asks for words: the child acts on the difference, and the game is designed from the comparison only.`

**9. "The claim", line 191 (ruling 1).** The claim names `us-ca 3.1`, `us-ca K.MD.2` and `nl rw/m/1/02/fase1` whole, while the sheet takes only a part of each (length of three attributes and no communicating; the comparison and not the saying; the ideas and not the words), so the claim says more than the game takes from those records; it already does this correctly for `us-ca 1.MD.1` and `nl rw/m/1/04/fase1`. Replace the paragraph with:

`Wild Hair Salon is designed from comparing two lengths directly. In California it is designed from `us-ca 3.1` of Strand 3.0 in Mathematics, a learning foundation for preschool and transitional kindergarten published by the state department, which is a foundation and not a standard, for noticing and comparing length only; and from two content standards adopted by the State Board of Education: `us-ca K.MD.2`, for the comparison of two lengths only, and `us-ca 1.MD.1`, for comparing two lengths through a third thing only. In the Netherlands it is designed from guidance of the curriculum institute SLO, which is not law and says what can be offered, not what a child must know: the fase 1 goals `nl rw/m/1/04/fase1`, for comparing by length only, and `nl rw/m/1/02/fase1`, for the ideas longer, shorter and equally long only, and the peuter card bullet named above. No part of these records that has a child say, name or use words is in the game. All six records were `confirmed` on 2026-10-03. Cutting or pulling a lock until it is as long as its model is the game's own use of repeated direct comparison: no record named here asks a child to make one length equal to another. The game measures nothing in units, and it says nothing about what any child has reached.`

OPEN round 1: 9 findings
