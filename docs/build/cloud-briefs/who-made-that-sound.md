# Brief: Who Made That Sound (`who-made-that-sound`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `who-made-that-sound`. Name: Who Made That Sound. Age band: 2 to 4. Emoji: 🐣.
- Generator: `npm run new:game -- who-made-that-sound "Who Made That Sound" 2-4 🐣`
- Branch: `lane/who-made-that-sound`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Reading and language: listening, telling sounds apart, and matching a sound to who makes it.
- Suggested renderer: canvas 2D ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/surprise-eggs/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

Creatures hide (in eggs, behind leaves), and each has its own invented, synthesized voice. A call is heard; the child finds who made it, and later finds two that sound alike. Sounds differ grossly at first (high against low, long against short, one note against a warble) and more finely later. There is no speech, no word and no letter. The surprise of who comes out is the demo's pleasure and is kept. You cannot hear on a cloud machine: define each voice by plain numbers, design the steps of difference from those numbers, and say in the status block that the lead and the owner must listen.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Painted-tissue collage
2. Two-colour print

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
No reading-language record in this jurisdiction carries telling sounds that are not speech apart, or matching a sound to its maker. The records that carry noticing sound are in the science lane, for ages 3 to 4 only:
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-2` (code 2.2): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: in play a child notices sound (and light and shadow) and explores it with the senses; at the later age the child changes it on purpose and describes the change. Limits the game takes: Early statement is noticing and exploring, describing is not yet asked; the properties of sound are not listed; how sound travels is not mentioned.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-1` (code 2.1): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: a child explores things and says what they are like, the sound a thing makes being one of the example properties. Limits the game takes: sound is one example among several; describing, not explaining; no number of things.

### nl
- `edu.nl.peuters.reading-language.objective.inhoudskaart-nederlandse-taal-peuters-aanvankelijk-lezen-fonemisch-bewustzijn-en-alfabetisch-principe-3` (code Fonemisch bewustzijn en alfabetisch principe / 3): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: playing games around language, word games and sound games. Limits the game takes: no game is named, nor its length or who leads it; letters and written words are not mentioned.
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-verschijnselen-uit-natuurkunde-en-techniek-natuurkundige-verschijnselen-2` (code Natuurkundige verschijnselen / 2): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: discovering and wondering about sound, with loudness and pitch named (beside light, warmth, force and a lamp). Limits the game takes: discovering and wondering only; no explaining, no measuring; only loudness and pitch are named for sound.
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-verschijnselen-uit-natuurkunde-en-techniek-natuurkundige-verschijnselen-1` (code Natuurkundige verschijnselen / 1): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: exploring and naming things from what the child sees, hears, feels, smells and tastes. Limits the game takes: no list of things or words; the record asks for naming as well as exploring, and a wordless game gives only the exploring half.
- `edu.nl.fase-1.reading-language.objective.inhoudskaart-nederlandse-taal-fase-1-lezen-fonemisch-bewustzijn-en-alfabetisch-principe-3` (code Fonemisch bewustzijn en alfabetisch principe / 3): standing curriculum-institute-guidance; check state confirmed; level fase-1 (age 4, groep 1), basis convention. Asks, in our words: taking part in word games and sound games. Limits the game takes: what a school offers in groep 1 and 2, no year stated; no game named; letters and written words are not mentioned.

### Notes
- Thinnest support: us-ca at age 2, where nothing carries the skill. The infant-toddler listening record (`edu.us-ca.infant-toddler.reading-language.objective.language-development-strand-1-0-attending-and-understanding-1-1`, confirmed) is about attending to speech or signing in a language the child is learning, so a game with no speech cannot rest on it; the lone science record (code 1.1, cause and effect) covers only "I touch it and it sounds". For a two-year-old the game makes no California claim beyond cause and effect.
- No record here is other than `confirmed`.
- Not carried: matching a sound to who makes it (in no record of either jurisdiction); telling sounds apart as a stated skill (us-ca says notice and explore; nl names loudness and pitch). For California the claim is science, not reading and language: the reading-language sound foundations (for example `edu.us-ca.preschool-tk.reading-language.objective.language-and-literacy-development-foundational-language-development-strand-2-0-foundational-literacy-skills-2-1`, confirmed) are all about the sounds of spoken words, with support, and the game holds no words. Our reading, not the record's: the two Dutch sound-game bullets stand under the sub-heading for awareness of speech sounds, so creature voices are listening play that comes before them; say "a sound game in the sense of the card", not phonemic awareness. No letters and no speech fits every Limits above.

## This run

This run covers the design and the rules. The template you start from is its second version, proven by a three.js game; the canvas pilot (Monster Pizza) is proving it for a canvas game first, so you do not build your toy yet.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet and the commit that holds what the canvas pilot changed in the template.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
