# Brief: Boo-Boo Vet (`boo-boo-vet`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `boo-boo-vet`. Name: Boo-Boo Vet. Age band: 3 to 6. Emoji: 🩹.
- Generator: `npm run new:game -- boo-boo-vet "Boo-Boo Vet" 3-6 🩹`
- Branch: `lane/boo-boo-vet`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Feelings and health: reading a need from how an animal looks and behaves, and doing what helps.
- Suggested renderer: canvas 2D ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/boo-boo-vet/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

Animals come to a small vet. Each shows what it needs by how it looks and what it does (it limps, shivers, scratches, droops, hides), and the child reads that and does the thing that helps: a plaster, a blanket, a brush, a drink, a quiet rest. The wrong care is gentle and funny, and the animal shows its need again, a little more plainly. Nothing is frightening: no blood, no crying in pain, no needle. Each animal has fixed likes the child can learn. The next patient waits in view and comes in on the child's touch.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Glossy die-cut stickers
2. Wax crayon (demo: `leaf-creatures`)

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.social-and-emotional-development-strand-1-0-self-1-8` (code 1.8, Social and Emotional Development / Strand 1.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3, 4 and 5), basis official. Asks, in our words: feel along with someone in distress and show concern for what they need; at the later age, comfort and help. Limits the game takes: at the earlier age (3 to 4½) only shared feeling and concern, helping is not mentioned; comforting and helping come with the later age (4 to 5½), where an adult's support is needed now and then.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.social-and-emotional-development-strand-1-0-self-1-3` (code 1.3, Social and Emotional Development / Strand 1.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3, 4 and 5), basis official. Asks, in our words: identify emotions and recognise how they show, in oneself and in others. Limits the game takes: basic emotions at the earlier age, given as examples with no count; complex emotions, and the link between an emotion and behaviour, only at the later age.
- `edu.us-ca.preschool-tk.science.objective.science-strand-3-0-life-science-3-7` (code 3.7, Science / Strand 3.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3, 4 and 5), basis official. Asks, in our words: know that animals and plants have to be looked after, and at the later age describe what living things need. Limits the game takes: at the earlier age care in general, with food and water the two things named and the understanding called emerging; at the later age the needs listed are examples, and the statement does not say which need belongs to which living thing.
- `edu.us-ca.kindergarten.practical-life-feelings.objective.k-7-2-m` (code K.7.2.M): standing state-board-adopted-standard; check state confirmed; level kindergarten (ages 5 and 6), basis official. Asks, in our words: tell good ways of showing someone that one cares about them. Limits the game takes: telling is enough; the ways must be positive ones; no list is given.
- `edu.us-ca.cross-grade.practical-life-feelings.objective.early-elementary-3-b-1` (code 3.B.1, Early Elementary): standing voluntary-guidance; check state confirmed; level cross-grade (returned beside kindergarten and grade 1 at ages 5 and 6), basis official. Asks, in our words: read what another is feeling from what they say and from face and body, and show empathy. Limits the game takes: voluntary guidance, not a standard; the band is tied to no grade; the cues are spoken and physical; no emotions or situations are listed.

### nl
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-planten-dieren-en-de-mens-omgaan-met-de-natuur-5` (code Omgaan met de natuur / 5, the pack's code for a card bullet): standing curriculum-institute-guidance; check state confirmed; level peuters (age 3, and 4 up to the fourth birthday), basis convention. Asks, in our words: treat plants and animals with care. Limits the game takes: an offer for children of about 2 to 4; no care tasks such as feeding and no rules are named.
- `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-peuters-sociale-competenties-de-ander-besef-van-de-ander-inschatten-van-het-gedrag-van-een-ander-1` (code Inschatten van het gedrag van een ander / 1, the pack's code): standing curriculum-institute-guidance; check state confirmed; level peuters (age 3, and 4 up to the fourth birthday), basis convention. Asks, in our words: read the outward signs of simple feelings in someone else. Limits the game takes: simple feelings only, not listed; mixed or hidden feelings are not mentioned.
- `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-peuters-sociale-competenties-de-ander-besef-van-de-ander-open-staan-voor-de-emoties-van-een-ander-4` (code Open staan voor de emoties van een ander / 4, the pack's code): standing curriculum-institute-guidance; check state confirmed; level peuters (age 3, and 4 up to the fourth birthday), basis convention. Asks, in our words: respond in a basic way to what someone else needs. Limits the game takes: "basic" bounds it to one simple reaction; nothing says the child meets the need; which needs, or whose, is not said.
- `edu.nl.fase-1.science.objective.ac25c5c5-2e15-4f7e-b4b4-8a0b68cebb75` (code ojw/pdm/4/05/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6, groep 1 to 3), basis convention. Asks, in our words: treat plants and animals with care. Limits the game takes: an attitude shown in behaviour, not knowledge; no animals, care tasks or setting are named, and no hygiene condition for handling animals.
- `edu.nl.fase-1.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-fase-1-sociale-competenties-de-ander-besef-van-de-ander-herkennen-en-perspectief-nemen-op-het-gedrag-van-een-ander-1` (code Herkennen en perspectief nemen op het gedrag van een ander / 1, the pack's code): standing curriculum-institute-guidance; check state confirmed; level fase-1, the card for groep 1 and 2 (ages 4 to 6), basis convention. Asks, in our words: recognise from behaviour whether another is angry, scared, happy or sad. Limits the game takes: those four feelings are the ones named; the others are children; the cause of the feeling is not asked.

### Notes
- Thinnest support is at the two ends. At age 3 the us-ca Early statement stops at concern (no helping) and the nl peuter cards ask one simple reaction, so for the youngest the game answers a need the child notices with one act and claims no more. At age 6 in us-ca grade 1, health has no content area for feelings; the nearest grade 1 record, `edu.us-ca.grade-1.practical-life-feelings.objective.1-1-5-p` (code 1.1.5.P, state-board-adopted-standard, confirmed), is about telling the signs of a few common illnesses in people and stops before treatment.
- No record named here is other than `confirmed`. Three standings need their own word in the claim: foundation, voluntary guidance (3.B.1) and, for nl, guidance.
- Not carried as worded: reading a need in an animal. Every feelings record is about people (the nl fase 1 card bullet says children); animals come in only through the care records, which name no signs and no symptoms. "Simple health routines" done for a patient have no record: the health-habit records of both jurisdictions are about the child's own body. Illness, injury and treatment are in none of the records named.

## This run

This run covers the design and the rules. Two pilot games are proving the template's helpers in a running game first, so you do not build your toy yet.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet and the commit that holds what the pilots changed in the template.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
