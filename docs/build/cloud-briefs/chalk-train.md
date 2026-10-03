# Brief: Chalk Train (`chalk-train`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `chalk-train`. Name: Chalk Train. Age band: 2 to 4. Emoji: 🚂.
- Generator: `npm run new:game -- chalk-train "Chalk Train" 2-4 🚂`
- Branch: `lane/chalk-train`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Reading and language: the strokes that come before writing.
- Suggested renderer: canvas 2D ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/choo-choo-draw/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

The child draws with a finger and a small train rides whatever was drawn: straight lines, curves, zigzags, hills and loops. A wobbly line gives a wobbly ride, and every stroke counts, including a partly made one. There is never a letter. Strokes are offered by the world (a gap between two stations, a hill to go round), never demanded.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Chalk on asphalt (demo: `chalk-town`)

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description. Only one row could be reserved: if it fails in the spike, propose a second in your status block, in the ledger's columns.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
No record in this jurisdiction names the strokes that come before writing (lines, curves, circles), and none carries mark-making at age 2. The nearest records, for ages 3 to 4:
- `edu.us-ca.preschool-tk.reading-language.objective.language-and-literacy-development-foundational-language-development-strand-4-0-writing-4-4` (code 4.4): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: at 3 to 4½ a child's writing is scribble that looks like writing and can be told from their drawing; at 4 to 5½ a few recognisable letters used to mean something. Limits the game takes: no real letters are asked in the Early statement; neatness and right forms are not asked; no stroke shape is named.
- `edu.us-ca.preschool-tk.reading-language.objective.language-and-literacy-development-foundational-language-development-strand-4-0-writing-4-1` (code 4.1): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: a child tries out ways of holding drawing and writing tools and of placing the body, and later adjusts them for more control. Limits the game takes: it is about holding a tool, and a finger on glass holds none, so the game does not practise what this record describes; no grip is named as right; no standard of neatness.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-4-0-geometry-and-spatial-thinking-4-1` (code 4.1): standing department-published-foundation; check state confirmed; level preschool-tk (age 4, Later statement only), basis official. Asks, in our words: a child identifies familiar flat shapes, and at 4 to 5½ also describes and makes shapes. Limits the game takes: at 3 to 4½ identifying only; making a shape is only in the Later statement; flat shapes only. It is a mathematics record and carries the drawn circle alone.

### nl
- `edu.nl.peuters.reading-language.objective.inhoudskaart-nederlandse-taal-peuters-aanvankelijk-schrijven-orientatie-op-geschreven-taal-7` (code Oriëntatie op geschreven taal / 7): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: exploring writing, mainly through drawing, scribbling, shapes that look like letters and strings of marks. Limits the game takes: exploring; right spelling and pencil hold are not mentioned; no stroke shape is named.
- `edu.nl.peuters.reading-language.objective.inhoudskaart-nederlandse-taal-peuters-aanvankelijk-schrijven-orientatie-op-geschreven-taal-3` (code Oriëntatie op geschreven taal / 3): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: experiencing that drawing and written marks can be used to tell someone something. Limits the game takes: experiencing; letters are not asked; it does not say with whom.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meetkunde-construeren-4` (code Construeren / 4): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: making things with paper (folding) and on paper (designing patterns, drawing). Limits the game takes: no shapes are named. It is a mathematics record.
- `edu.nl.fase-1.reading-language.objective.inhoudskaart-nederlandse-taal-fase-1-schrijven-voorbereidend-schrijven-4` (code Voorbereidend schrijven / 4): standing curriculum-institute-guidance; check state confirmed; level fase-1 (age 4, groep 1), basis convention. Asks, in our words: writing with the child's own graphic means: drawings, pictograms, scribbles and symbols. Limits the game takes: what a school offers in groep 1 and 2, no year stated; no letters or words are named; right spelling is not named.

### Notes
- Thinnest support: us-ca at age 2, where there is none: the infant-toddler lanes hold no record on making marks, and the pack does not hold the motor domains (perceptual and motor development for infants and toddlers, physical development for preschool). For a two-year-old the game makes no California claim; the Dutch peuter records cover ages 2 and 3 with scribbling as exploring.
- No record here is other than `confirmed`.
- Not carried: lines, curves and circles as named strokes; following or tracing a path; control of the hand (outside the pack's four subjects in both jurisdictions). Narrow the claim to drawing and scribbling as the mark-making that comes before letters (us-ca 4.4 Early statement; nl Oriëntatie op geschreven taal / 7), and say it is done with a finger, not a tool. Showing no letters fits every Limits above.

## This run

This run covers the design and the rules. Two pilot games are proving the template's helpers in a running game first, so you do not build your toy yet.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet and the commit that holds what the pilots changed in the template.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
