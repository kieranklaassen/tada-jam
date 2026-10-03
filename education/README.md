Official learning standards for California and the Netherlands (ages 2 to 5, the first school years, ages 9 to 12) that a jam game with a learning goal is designed from, and the rules such a game follows when it claims a school skill.

## What this folder is

A reference corpus used while designing and building games: 3,434 records in 52 lanes, one record per official statement, for California (`us-ca`, 1,127 records in 32 lanes) and the Netherlands (`nl`, 2,307 records in 20 lanes), in four subjects (`mathematics`, `reading-language`, `science`, `practical-life-feelings`). A lane is one jurisdiction, level and subject. The corpus is development-time only: no game reads it at run time, a child never sees it, and none of it is in the published build (`dist/`).

It is kept apart from the rest of the repo, as `lab/` is, with its own TypeScript config, tests and CI job. Nothing under `games/`, `harness/`, `showcases/`, `lab/`, `scripts/` or `test/` imports from it, and it imports from none of them. The jam's rules for games do not apply here. The folder is also the Compound Pack `education`, declared in `.compound-engineering/config.yaml`: the Compound Engineering brainstorm, plan and review skills read the rules and the maps at its top level by themselves when a request matches one, and cite them as `(pack: education, <file>)`. This file is the pack's description and the guide. Those skills do not read the subfolders, so what they find is this guide, eight rules and six maps; the records are reached through the lookup.

## The rules

Each rule is one markdown file at the top level with `title` and `applies_when` in its frontmatter. For every game that claims a school skill:

- `name-the-records-a-claim-rests-on.md`: the game names the pack records its claim rests on, and its plan gives the standing and the check state of each.
- `standing-is-part-of-the-claim.md`: the claim uses the words of each record's standing, so a foundation, guidance, a replaced core goal and a draft are not all called the curriculum.
- `age-maps-to-levels-through-the-lookup.md`: an age becomes levels through the age table and the lookup, labels and gaps are kept as printed, and age never gates content.
- `limits-come-from-the-limits-section.md`: number ranges, units and content limits come from a record's Limits, never from the examples under In a child's hands.
- `two-jurisdictions-are-never-equated.md`: a California record is never presented as equal to a Dutch one, and a game for both names records from each.
- `cite-by-id-or-code-never-by-link.md`: inside `games/` a record is cited by pack id or by official code with jurisdiction, never by a link and never by quoting official wording.
- `california-wording-is-never-pasted.md`: California wording goes into no committed file, plan, PR or game file, apart from the capped fragments a locator and an export correction hold; the record's Summary is used, and Dutch wording is quoted only with its source line.
- `no-attainment-claims.md`: no game claims, shows or records that a child has reached a standard, a grade or a level.

Six maps say where to start, one per jurisdiction and age range. Each gives the levels a child of those ages can be in, what each of the four subjects holds there, record ids to start from, the limits the frameworks state, what the pack does not hold, and the lookup commands for looking further. A map is the pack's own reading of the records it names, and the records and the lookup stay the authority:

- `map-us-ca-ages-2-to-5.md`: California, ages 2 to 5.
- `map-us-ca-first-school-years.md`: California, kindergarten and grade 1, ages 5 to 7.
- `map-us-ca-ages-9-to-12.md`: California, grades 4, 5 and 6, ages 9 to 12.
- `map-nl-ages-2-to-5.md`: the Netherlands, ages 2 to 5.
- `map-nl-first-school-years.md`: the Netherlands, the first school years, ages 5 to 8.
- `map-nl-ages-9-to-12.md`: the Netherlands, ages 9 to 12.

The pack holds at most 25 rules and maps, so that each one is read in full. `tools/pack-rules.test.ts` and `tools/isolation.test.ts` fail on a top-level markdown file without `title` and `applies_when`, on a record id in a rule that is not in the corpus, and on a link in a rule.

## Finding records

The lookup reads the record files and the review files each time it runs. It needs no network and no wording store.

```
npm run education:find -- --jurisdiction <us-ca|nl> --age <2..12> [--subject <slug>] [--outline]
npm run education:find -- --jurisdiction <us-ca|nl> --level <slug> [--subject <slug>] [--outline]
npm run education:find -- --code <code> [--jurisdiction <us-ca|nl>]
npm run education:find -- --id <pack id>
npm run education:find -- --help
```

The levels are `infant-toddler`, `preschool-tk`, `kindergarten`, `grade-1`, `grade-4`, `grade-5`, `grade-6` and `cross-grade` for `us-ca`, and `peuters`, `fase-1`, `fase-2`, `fase-3` and `einde-po` for `nl`. Without `--subject` all four subjects are listed. `--help` prints the usage, every option, and four examples per jurisdiction.

`--json` prints the answer as JSON. For a parser, run the lookup as `npm run --silent education:find -- … --json` or as `node education/tools/lookup.ts … --json`: without `--silent`, npm prints the script name and the command on standard output before the answer, and what comes out is not JSON.

Every record is listed in five lines: its pack id; its code (or `no printed code`) and the scope the code belongs to; its `standing`, its `regime` when it has one, and its `check` state; the first 120 characters of the pack's own text, `summary:` for a California record and `gloss:` for a Dutch one, or `still pending` where that text is not written yet; and `file:` with the path of the record file, where the whole Summary or gloss and the design notes are.

An answer that lists California records on a machine without the wording store ends with one line that says the wording is not on this machine and names the commands that fill the store. With `--wording` each record says so itself.

### By jurisdiction, age and subject

```
npm run education:find -- --jurisdiction us-ca --age 10 --subject mathematics
```

This prints the line `Age mapping: derived.` with the rule the mapping rests on, then the 34 records of grade 4 mathematics, the 35 records of grade 5 mathematics, and the 8 records of the cross-grade mathematics lane, each of those eight under the label `[cross-grade]`. A ten-year-old can be in either grade, so both are returned.

What the lines and labels of an answer by age mean:

- `Age mapping:` is `official` (the publisher or the law states the ages), `derived` (worked out from an official rule) or `convention` (usual practice). Every Dutch answer is `convention`: no law ties a groep to an age.
- `Sub-band:` names the part of a level that applies at that age, for example the later of the two age ranges of the preschool foundations at age 5, or the groep inside a Dutch fase.
- `[cross-grade]`: from age 5 up, every California age that returns a level also returns the subject's cross-grade lane. Its statements hold for every grade, not for this age in particular.
- `[end-of-primary goals]`: from age 4 up, a Dutch answer also returns the subject's `einde-po` lane: the core goals, the draft core goals and the reference levels. They say what a school works towards by the end of groep 8, not what a child of this age should master.
- A gap is printed under the age mapping. `--jurisdiction us-ca --age 9 --subject science` prints that grade 3 is not in the pack and then lists grade 4. `--jurisdiction us-ca --age 8` prints `Not covered:` with the reason and lists no level and no record. California ages 7 and 12 and the Dutch age 12 also carry a gap line.
- An age below 2 or above 12 is refused with the usage text and exit status 2.
- A lane without records prints `No records in this lane.`, and a lane the manifest marks as having nothing published prints `Nothing is published:` with the reason. Every lane holds records at present.

### An outline first

```
npm run education:find -- --jurisdiction us-ca --age 5 --outline
npm run education:find -- --jurisdiction nl --age 5 --subject mathematics --outline
```

An answer by age lists every record of every lane it returns, and that is long: about 260 KB for the Dutch mathematics of a five-year-old, and about 800 KB for all four Dutch subjects, against 2 KB for the outline. With `--outline` the answer keeps its title line, the `Age mapping:` line, any gap line, and each level with its `Sub-band:` and its note, and lists each lane in one line, with its title and its number of records (or `Nothing is published:` with the reason), and no record. With `--json` each lane carries `count` in place of `entries`. The records of one lane are then listed by level and subject, as below. `--outline` goes with `--age` and `--level`, and not with `--wording`.

### By level

```
npm run education:find -- --jurisdiction nl --level fase-1
```

This prints the four fase 1 lanes: mathematics (195 records), reading and language (206), science (68), and practical life and feelings (151). An answer by level has no age mapping and does not add the cross-grade or end-of-primary lane. Those are asked for by their own level, `cross-grade` or `einde-po`.

### By code

```
npm run education:find -- --code K.CC.4
npm run education:find -- --code L.K.1.a
npm run education:find -- --code 1 --jurisdiction nl
```

A code is found by a key made of its runs of letters and digits, with capitals set aside. So `4.NF.3a` finds the record whose printed code is `4.NF.3.a`, and `k-cc-1`, the form a code has in a record id, finds `K.CC.1`. Official codes are not unique, so a lookup by code returns every match with its scope. Each match opens with a label that says how it was found, and the matches come in this order:

- `[exact match]`: the record's code is the code as typed.
- `[normalised match: ... ignored]`: the record's code is the typed one apart from its punctuation, its capitals or both, and the label says which. The code line shows the code as printed.
- `[match on the sub-heading, the part in brackets ignored]`: see the card codes below.
- `[sub-part of <code>]`: the code has no record of its own in that scope, and this is one of its parts.
- `[contains match: ...]`: the typed code ends in a lettered part and has no record of its own in that scope, and this is the record of the code without that part. The lookup does not know whether the source prints such a part inside that record, so read the record before using it.

What the examples return:

- `K.CC.4` exists in the source only as lettered parts. The answer is three records, `K.CC.4.a`, `K.CC.4.b` and `K.CC.4.c`, each labelled `[sub-part of K.CC.4]`.
- `L.K.1.a` has no record of its own, because the source prints the lettered parts inside the row of `L.K.1`. The answer is that one record, labelled as a contains match.
- `1` in `nl` returns eight records, each labelled `[exact match]` and told apart by scope: core goal 1 of the 2026 decree, core goal 1 of the 2006 decree, and six statements of SLO's cards.
- `10 B` in `nl` returns doelzin 10 B of the 2026 decree as an exact match and, after it, core goal 10 of the 2006 decree as a contains match. The second is no part of the first: the label says that it is the record of `10` in another scope.
- Without `--jurisdiction`, a code that exists in both jurisdictions is answered in two separate lists, one per jurisdiction. Nothing relates the two.
- A code that matches nothing prints one sentence that says so.

Three kinds of Dutch code work differently:

- **Card codes.** SLO's cards for peuters and for fase 1 print no codes. The code of a card record is the pack's own: the sub-heading the bullet stands under, a slash and the position of the bullet, as in `Hoeveelheden / 1`, or the position alone where the bullets stand directly under their heading bar. The fase 1 mathematics card prints a range in some sub-headings, so its record has the code `Hoeveelheden (tot tenminste 20) / 1`. A sub-heading is found with or without what it holds in brackets: `--code "Hoeveelheden / 1"` returns the bullet of the peuter card as an exact match and the bullet of the fase 1 card as a match on the sub-heading, each with its full code. The sub-heading alone, `--code Hoeveelheden`, returns every bullet under it as a sub-part.
- **Codes of the open data.** A per-band goal has the code SLO's open data gives it, such as `rw/gb/1/01/fase1`: line, cluster, number, fase. The data gives four codes to two records each (`rw/bew/5/02/fase3`, `NE/LE/07/02/01/fase2`, `NE/LE/07/03/01/fase3` and `ojw/pdm/3/01/fase1`), and a few records are at another fase than the last part of their code names, because the data misfiles or misspells them (`rw/bew/2/01/fase1` is a fase 2 record, and `rw/verb/1/01/fsae1` is the data's spelling). The code line of such a record says so in brackets: that the code is as the open data has it, the level the record is at, and where the other record with the same code is. The record's level, not its code, says which fase it belongs to.
- **Records without a code.** The reference levels and a few per-band goals that exist only in a PDF print no code, and none is made up. They are found by jurisdiction and level, not by code.

### By pack id

```
npm run education:find -- --id edu.us-ca.kindergarten.mathematics.objective.k-cc-1
npm run education:find -- --id edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-getallen-1
```

The maps and the rules cite a record by its pack id, and `--id` returns that one record, printed as any other with its check state as it is now and the path of its file. It takes no `--jurisdiction` and no `--subject`: the id names both. This is how a record that prints no code is found without listing its whole lane, and how a plan reads the check state of a record again before it repeats a claim. An id that no record has prints one sentence that says so. `--wording` and `--json` work as with the other keys.

### Official wording

`--wording` adds a line `official wording:` to each record, and `accompanying text:` where the source prints a footnote, an example or other text that accompanies the statement without being part of it. For a Dutch record both come from the record file, and the record's `Source:` line is printed after them: Dutch wording is quoted only together with that line. For a California record they come from the wording store on this machine; where the store does not hold the wording, the line says `not on this machine` and names the commands that fill the store, `npm run education:fetch`, then `npm run education:import` and `npm run education:extract`. California wording printed this way is for reading only (see California wording below).

## Reading a record

A record is `corpus/<jurisdiction>/<level>/<subject>/objectives/<slug>.md`. Its id, `edu.<jurisdiction>.<level>.<subject>.objective.<slug>`, always matches its path. Beside the records, each lane has a `frame.md` that says what the lane covers, what one record is, what is skipped or left out, and how the lane is checked.

The frontmatter is written by an importer or by the extraction, and never by hand. It holds the official code as printed (`code`; for a bullet of a Dutch card, which prints none, the pack's code of sub-heading and position), the document and domain the code belongs to (`code_scope`), the `standing`, the `regime` of a Dutch core goal, the `reuse_policy`, the id of the source record (`source`), where in the source the statement is (`locator`), and the hash of the official wording (`wording_sha256`). `supplement_sha256` is on a record whose source prints official text that accompanies the statement without being part of it: a footnote or a cluster heading in California's exports, an example that a Dutch content-line PDF prints with a goal. It is the hash of that text. A Dutch record also holds the text in its file; for a California record it is in the store only. `status: draft` is on every record. It is a term of the Tada record format and says nothing about the check.

The body has fixed sections in a fixed order. Each section the pack wrote opens with a line that says whose text it is.

| Section | In which records | Whose text |
|---|---|---|
| `## Official wording` | Records whose `reuse_policy` is `verbatim`: every Dutch record. | The publisher's, in Dutch, as imported or extracted by script. Where the source prints accompanying text, it follows the wording under a line that opens "Accompanying official text, not part of the statement". The section ends with a `Source:` line. |
| `## Summary` | Records whose `reuse_policy` is `description-only`: every California record. | The pack's summary of the statement in its own words. The official wording is not in the file. |
| `## English gloss` | Dutch records. | The pack's gloss. It is not an official translation. |
| `## Design notes` | Every record. | The pack's inference. |

The official parts of a record are its code and its wording, or for California the hash of its wording; `authority: official` in the frontmatter refers to these. The Summary, the gloss and the design notes are the pack's reading of the statement. The second check reads them against the wording, and they are still never the publisher's text. A Summary can hold the line `No summary: a faithful one could not differ from the official wording.`; such a record is cited by code only. A section that reads `_pending_` is not written yet.

The design notes have three parts:

- `### In a child's hands`: what the statement looks like when a child of that age does it. The objects and numbers in it are illustrations the pack chose.
- `### Limits`: the limits the framework itself states: the top of a number range, the units, the steps, and what belongs to a neighbouring statement. Where the statement names no range or unit, Limits says so, and the value a game uses is then the game's own choice. This is the part a game takes its range and content boundary from (`limits-come-from-the-limits-section.md`).
- `### Common mistakes`: the errors children usually make with the statement.

## Standing and check state

### Standing

`standing` says what the publisher or the law says a statement is. The list is closed per jurisdiction (`tools/schema.ts`), and each source record says in its `Standing:` paragraph what its standing rests on.

| `standing` | What it is |
|---|---|
| `state-board-adopted-standard` | California. A content standard adopted by the State Board of Education: mathematics, English language arts, science and health. The standards documents for mathematics, English language arts and health carry a notice that they are not binding on local educational agencies. |
| `department-published-foundation` | California. A learning foundation published by a state department: the preschool and transitional kindergarten foundations (Department of Education) and the infant-toddler foundations (Department of Social Services). It is called a foundation, not a standard. |
| `voluntary-guidance` | California. The Transformative Social and Emotional Learning competencies, which their own introduction says are for voluntary use. |
| `legal-core-goal` | The Netherlands. A core goal (kerndoel) set by decree for the end of primary school. Its `regime` says which set. |
| `legal-reference-level` | The Netherlands. A statement of the reference levels set by decree. For primary school these are 1F and 2F for Dutch and 1F and 1S for arithmetic. |
| `legal-aim-for-childcare` | The Netherlands. An aim that childcare law sets for the care and the programme a child is given before school. It says what childcare provides, not what a child can do. |
| `curriculum-institute-guidance` | The Netherlands. SLO's goals per fase and its cards for peuters and for fase 1. They say what a school or a childcare worker can offer, not what a child must know. Not law. |
| `draft-not-yet-in-force` | The Netherlands. A core goal of the consultation draft. |

Two sets of Dutch core goals are in force at once, and a third is a draft, so a Dutch core goal also has a `regime`:

- `2026`: the core goals for Dutch (1 to 9) and for arithmetic and mathematics (10 to 18), in force since 1 August 2026.
- `2006`, for Dutch (goals 1 to 12) and arithmetic (goals 23 to 33): these were replaced on 1 August 2026, and a school may still use them until 1 August 2031. The scope of such a record names the decree with "version in force until 31 July 2026".
- `2006`, in science (goals 40 to 46) and in practical life and feelings (goals 34, 35, 37, 38 and 39): still in force.
- `2027-draft`: the draft decree for the remaining learning areas, as put to public consultation. It is unsigned, and its own last article sets 1 August 2027. It would withdraw the 2006 decree. The pack records its goals for citizenship, for people and society in part, and for people and nature.

`standing-is-part-of-the-claim.md` says how each standing is worded in a claim.

### Check state

The second check reads a record against its source a second time, by a pass that did not write it. Its verdicts are in `reviews/<jurisdiction>/<level>/<subject>.json`, one file per lane. A verdict carries the record id, the hash of the wording and the hash of the pack's own text as they were when checked, the rendition that was read and the place the statement was found there, and the round (1 for the first check, and one higher for each check after a fix; the highest round decides). A record is never edited to say it is confirmed: the state is computed from these files each time, by the join (`npm run education:verify`), and the lookup prints it.

| State | Meaning |
|---|---|
| `confirmed` | The verdict of the highest round confirms the record, and the record's wording and own text still have the hashes that verdict carries. |
| `unconfirmed` | The verdict of the highest round does not confirm it. It is printed with its reason. |
| `stale` | The record's wording or its own text changed after its last verdict, so that verdict no longer speaks for it. |
| `unchecked` | No verdict names the record. |

The reasons for `unconfirmed` are a closed list: `wording-differs`, `code-differs`, `not-found-in-rendition`, `summary-or-gloss-unfaithful`, `notes-contradict`, `extraction-artefact` and `rendition-unavailable`. A verdict with `wording-differs` carries a note that says what differs. An unconfirmed record is kept and counted, not dropped.

A review file also lists, under `unrecorded`, each statement the check rendition holds that no record carries. Each is explained there, or the join reports it.

Some records are `unconfirmed (wording-differs)` and stay so, by design. The reason records a real difference between two official renditions of the same statement, which no fix of the record can remove. The record follows the rendition it was read from, the verdict's note in the review file says what differs, and where the other rendition adds something a design could use, the record's Limits says so. There are two groups:

- **California science.** The science records of kindergarten and grades 1, 4 and 5 are read from the department's standards search export and checked against the department's document for the grade; grade 6 is read from the grade's document and checked against the export. One rendition holds a word, a sentence or a clarification that the other lacks.
- **Dutch goals per fase.** These are read from SLO's open data and checked against the content-line PDF of their line. In a few goals the PDF prints other words or more words than the data. The record keeps the data's wording.

The coverage report lists these records one by one. For a lane where more than a fifth of the checked records are unconfirmed for one reason, the join also prints a notice, `likely-importer-fault` or `likely-writing-fault`; for the science lanes the notes give the cause.

The lookup and the coverage report compute the state without the wording store. `npm run education:verify` on a machine that has the store also looks up, for each confirming verdict that a script matched, whether the wording is at the place the verdict states, and reports a record as `unconfirmed (not-found-in-rendition)` when it is not. A place that cannot be looked up there, because a source file is not in the store or a tool is missing, leaves the record confirmed and is printed with each rendition that could not be read and the reason: as a notice by the plain command, and as a failure by `-- --gate`. Without the store no place is looked up, and the gate says so in one line.

The numbers are in `docs/COVERAGE.md`, which `npm run education:coverage` generates:

- the totals per jurisdiction and for the pack: lanes, records against the expected count, and records per check state;
- per lane: records against the expected count, confirmed, unconfirmed, stale and unchecked, California records without a summary, statements of the check rendition with no record, how the lane is checked, and its sources with their versions;
- per jurisdiction, the records by `standing` and `regime`, each with its check states, and for the Netherlands the three kinds of standing counted apart: set by law or decree (core goals, reference levels and aims for childcare), guidance of the curriculum institute, and the draft that is not in force;
- per jurisdiction, the unconfirmed records counted by reason and then listed one by one with their reason.

### The gate

`npm run education:gate` is the check to run before a push of the corpus. It runs four checks of the whole tree, all of them also when one fails, and fails when any of them does:

1. The final gate of the second check (`npm run education:verify -- --gate`). In every lane there must be no stale record, no unchecked record, no statement of the check rendition without a record or an explanation, and no record unconfirmed for another reason than `wording-differs`. It prints each lane that fails with the ids of the records that fail it, and fails on any other finding of the join too: among them a lane that holds more or fewer records than the manifest expects (`lane-count`) and a verdict that names a rendition that is neither `same-file` nor a source record (`verdict-rendition-unknown`).
2. Every frame is as the manifest generates it (`npm run education:frames -- --check`).
3. The official text the Dutch frames quote is as the pinned sources print it (`npm run education:frame-texts -- --check`).
4. The coverage report is up to date (`npm run education:coverage -- --check`).

Only the third check cannot run without the wording store: it reads the pinned sources. The other three read the repo alone, and `npm run education:tree` runs those three, in the same order and each of them also when one fails. CI has no store and runs `npm run education:tree` after `npm run education:check`, so CI fails on a stale or unchecked record, on a frame that differs from what the manifest generates and on a coverage report that is out of date.

The whole gate is run by hand before a push, on a machine with the store, together with `npm run education:check`, `npm run education:overlap` and `npm run education:reuse-history`. There the first check also looks up the place each script-matched verdict states, says how many it verified, and fails when a place cannot be looked up, so a store that lacks a source file does not pass. While a lane is still in a fix or check round, the gate fails on that lane.

## Using records in a game

The rules say this in full. In short:

- **Choose per jurisdiction.** Run the lookup once for `us-ca` and once for `nl`, and list the records of each under its own heading. A record of one jurisdiction is never called equal to, or a translation of, a record of the other, and a gap in one is not filled from the other (`two-jurisdictions-are-never-equated.md`).
- **Start from the age.** The levels for an age come from the lookup, with the basis and the gaps it prints (`age-maps-to-levels-through-the-lookup.md`).
- **Name the records.** The plan lists each record by pack id or by official code with its jurisdiction, and copies its standing and its check state beside it. A claim that rests on a record that is not `confirmed` says so (`name-the-records-a-claim-rests-on.md`, `standing-is-part-of-the-claim.md`).
- **Take limits from Limits.** (`limits-come-from-the-limits-section.md`)
- **Cite inside `games/` by id or code.** In `games/<key>/ART.md` or in a source comment, a record is `edu.us-ca.kindergarten.mathematics.objective.k-cc-1` or `us-ca K.CC.1`. Never a link: `npm run egress:check` reads the markdown under `games/` too and fails on an external URL. Never in a string, a manifest or an asset: `npm run education:built` fails when a pack record id is in `dist/`. The link to the publisher's page is in the source record, which the record's `source` field names (`cite-by-id-or-code-never-by-link.md`).
- **Make no attainment claims.** A game is "designed from" the records it names. Nothing in a game, its grown-up corner, its `ART.md` or its PR says that a child has reached a standard, a grade or a level (`no-attainment-claims.md`).
- **Do not paste California wording.** Use the record's Summary or new words with the same meaning. Dutch wording may be quoted, and then only together with the record's `Source:` line, which `--wording` prints (`california-wording-is-never-pasted.md`).

## California wording

The repo is public, and no California publisher grants it the right to reproduce the wording of its standards and foundations (`docs/LICENSE-NOTES.md` lists the terms per source). So a California record commits its code, its locator, the hash of its wording and a Summary in the pack's words, and the wording itself is kept in a store outside the repo: `$EDUCATION_STORE`, or `~/.cache/tada-jam-education`. Permission has not been asked for; whether to ask is the owner's decision.

Two kinds of fragment of that wording are committed, because the tools need them: the bounding words and the corrections in a locator file under `locators/us-ca/`, and the export corrections in `manifest/us-ca-additions.ts`. Each anchor and each side of a correction is at most four words, and the two anchors of a span together hold at most half of the words they locate, where that text is of four words or more. `california-wording-is-never-pasted.md` and `docs/LICENSE-NOTES.md` give the limits and name the two spans that are too short for the second one. Whether the repo keeps the fragments is the owner's decision too.

To read the wording on your own machine:

1. `npm run education:fetch` fetches each official file once into the store and verifies it against the pin in its source record. California's education department site answers with a robot check after a few requests; a file saved by hand goes in with `-- --ingest <slug>=<path>` and passes the same checks.
2. `npm run education:import` puts the wording of every record that is read from an export, from the legal text or from the open data into the store, under `wording/<wording_sha256>.txt`. `npm run education:extract` does the same for the 332 California records that are located in a PDF or a document file: the infant-toddler foundations, the preschool and transitional kindergarten foundations, grade 6 science, and the cross-grade lanes for mathematics, for reading and language and for practical life and feelings. Both are needed for all 1,127. Both write only the importer's part of a record file, and on an unchanged tree they change nothing.
3. `npm run education:find -- --code K.CC.1 --wording` then prints the wording, and `npm run education:lane-text -- --lane us-ca/kindergarten/mathematics` prints it for a whole lane.

What is printed is for reading only. It goes into no file, plan, PR or commit message.

Two checks enforce this, and both need the store:

- `npm run education:overlap` fails when California wording is in a file it reads in the working tree. Under `education/` it reads every California record, frame, locator and review file, every source record, the top-level markdown and `.ts` files, and every file under `docs/`, `research/`, `manifest/` and `tools/`. A record is checked by three rules; any other file by one, the run of eight consecutive words, so a statement shorter than eight words that stands whole in such a file is not found. It does not read the Dutch frames, locators and review files, and it reads nothing outside `education/`. So in a plan, a PR, a commit message or a game file, and for a statement shorter than eight words anywhere but in a record, the rule is kept by hand.
- `npm run education:reuse-history` runs the same rules on each commit that is about to be pushed. On a public repo a push has already published, so it is run before every push.

CI has no store and runs neither. Of the gate it runs the three checks that need no store (`npm run education:tree`). It also runs the validator's structural rule in `npm run education:check`: a `description-only` record must not hold an `## Official wording` section, and no California record may be `verbatim`.

## Scripts

Arguments go after `--`, as in `npm run education:validate -- --complete`.

| Command | What it does |
|---|---|
| `npm run education:find` | The lookup: records by jurisdiction with age or level (with `--outline`, the lanes and their counts only), by code, or by pack id. `-- --help` prints every option with examples. See Finding records. |
| `npm run education:verify` | The join of the records with the review files. Prints one line per lane (records, confirmed, unconfirmed by reason, stale, unchecked, unrecorded) and fails on any record unchecked or stale and on any finding. `-- --summary` prints the same report and always exits 0. `-- --gate` is the final gate of the second check: it prints only the lanes and records that fail it, and also fails on a record unconfirmed for another reason than `wording-differs` and, on a machine with the store, on a script-matched verdict whose place cannot be looked up. |
| `npm run education:gate` | Needs the store. The check before a push: the final gate of the second check, then `--check` of the frames, of the frame texts and of the coverage report. Every check runs, and the command fails when any of them does. See The gate. |
| `npm run education:tree` | The gate without the check of the frame texts (`node education/tools/gate.ts --no-store`): the three checks of the whole tree that need no store. CI runs it after `npm run education:check`. |
| `npm run education:coverage` | Writes `docs/COVERAGE.md` from the manifest, the records and the join. `-- --check` writes nothing and fails when the committed report is missing or differs from a fresh one. |
| `npm run education:validate` | Validates every record under `corpus/` and `sources/`: schema, id against path, vocabulary per jurisdiction, body sections against reuse policy and language. Add `-- <file or folder>` to see one part, and `-- --complete` to also fail on regions still pending. |
| `npm run education:lint-notes` | `education:validate -- --complete`: fails on a region that is missing, empty or still pending, and on design notes without their three parts. |
| `npm run education:check` | Typecheck, then the pack's tests. CI runs it, and `npm run education:tree` after it. |
| `npm run education:typecheck` | TypeScript over `education/` only. |
| `npm run education:test` | The pack's tests, including the isolation test and the validator over the whole corpus. |
| `npm run education:built` | After `npm run build`: fails if a pack record id or a path named `education` is in `dist/`, or if `dist/` is missing. |
| `npm run education:fetch` | Fetches every source under `sources/` once, pins it by hash in its source record, and keeps the file in the store. A later run verifies each source against its pin and stops on a difference. Add `-- --only <slug>` for one source, and `-- --ingest <slug>=<path>` to use a file or clone fetched by hand in place of the network. |
| `npm run education:import` | Needs the store; the Dutch importer also needs `pdftohtml` and `pdftotext`. Runs the California importer (one record per row of the standards search exports), then the Dutch importer (one record per statement of the legal text and of the open data, with the examples and the restored statements it reads in the content-line PDFs). Each writes the frontmatter and the official wording section only, puts the wording in the store, and counts each lane against the manifest. Add `-- --lane <jurisdiction>/<level>/<subject>` for one lane, as in `-- --lane us-ca/kindergarten/mathematics` or `-- --lane nl/einde-po/mathematics`: only the importer of that jurisdiction runs. |
| `npm run education:extract` | Needs the store, `pdftotext` and `pdftohtml`, and `pdftoppm` for a page drawn as images. For the lanes whose statements exist only as a PDF or a document file: reads the text between the bounding words of each entry in the lane's locator file, applies the entry's corrections, and writes the record. Add `-- --lane <jurisdiction>/<level>/<subject>` for one lane. A lane with a finding writes nothing. In a California lane it fails on an anchor or a side of a correction of more than four words, and on a span whose two anchors together hold more than half of the words they locate; a span that locates three words or fewer is exempt from the second and is printed as `exempt`. A page whose statements are drawn as images is rendered with `pdftoppm` and read by the text recogniser of macOS, unless the store already holds what was recognised. |
| `npm run education:frame-texts` | Needs the store, `pdftohtml` and `pdftotext`. Reads in the pinned Dutch sources the official text that holds for a whole lane, column, cluster or card and that no record carries, and writes it to `locators/nl/frame-texts.json`, which the Dutch frames quote. `-- --check` writes nothing and fails when the committed file differs from what the sources print. Run `npm run education:frames` after it. |
| `npm run education:frames` | Generates each lane's `frame.md` from the manifest. Add `-- --jurisdiction <us-ca|nl>` for one jurisdiction, and `-- --check` to write nothing and fail when a committed frame differs. A frame is never edited by hand. |
| `npm run education:lane-text` | Prints the official text of a lane, record by record, for the agents who write and check it: `-- --lane <jurisdiction>/<level>/<subject>`, with `--batch <name>` for one batch. A California lane needs the store, and what is printed may not be copied into a file. `--ids` prints only each id and file path and needs no store. |
| `npm run education:match` | Needs the store. The scripted first pass of the second check: finds each record's wording in the check rendition of its lane, and lists the codes that rendition prints and no record carries. `-- --lane <jurisdiction>/<level>/<subject>`, with `--batch <name>` and `--json`. It prints ids, codes and places, never wording, and writes nothing. |
| `npm run education:overlap` | Needs the store. Fails if official wording that may not be committed is in the working tree: a run of eight consecutive words shared with the wording, or the accompanying text, of any description-only record, in a California record, frame, locator or review file, a source record, the top-level markdown and `.ts` files, or a file under `docs/`, `research/`, `manifest/` or `tools/`; a record that holds its own wording whole; or a sentence of a record that shares more than four fifths of its own statement's words in order. |
| `npm run education:reuse-history` | Needs the store. Run before every push: the overlap rules, the validator's rule against an official wording section in a description-only record, and its rule against a `verbatim` California record, on each commit of `origin/main..HEAD`. Add `-- <base>..<head>` for another range. |

`npm run education:check` runs the typecheck and the tests only, and `npm run education:tree` the three checks of the whole tree that need no store; CI runs both. The checks that read the whole tree against the store are run by hand before a push: `npm run education:gate`, `npm run education:overlap` and `npm run education:reuse-history`.

### What the scripts need

- Node 24, as the jam does. The tools are TypeScript that Node runs as it is, with no build step. They add no dependency to the jam's.
- The wording store, for every script marked "Needs the store". `npm run education:fetch` creates and fills it, and needs the network and `git`.
- Poppler, for `pdftohtml`, `pdftotext` and `pdftoppm`. The Dutch importer and the extraction need all three: they read the content-line PDFs with `pdftohtml` and `pdftotext`, and a page whose statements are drawn as images is rendered with `pdftoppm`. `education:frame-texts`, the fetch, the scripted match and the place check of `education:verify` read PDFs with them too.
- `unzip`, for the one source that is a document file.
- macOS, for the text recognition of such a page (`swift`, with the Vision framework), unless the store already holds what was recognised.
- The lookup, the validator, the frames, the coverage report, `education:verify` without the store, `npm run education:check` and `npm run education:tree` need none of these: only Node and the repo.

One tool has no script: `node education/tools/review.ts <record file>...` prints the two hashes a verdict for each record carries.

## What is here

| Path | What |
|---|---|
| `README.md` | This guide, and the pack's description. |
| `<rule>.md`, `map-*.md` | The pack's eight rules and its six age-range maps. |
| `corpus/<jurisdiction>/<level>/<subject>/` | One lane: its `frame.md` and its records under `objectives/`. |
| `sources/` | One source record per official document, 62 in all: publisher, title, version, link, pin, reuse policy, and paragraphs on standing and reuse terms. |
| `locators/<jurisdiction>/<level>/<subject>.json` | For a lane read from a PDF or a document file: the page and the bounding words of each statement, which the extraction reads. A California locator holds as few of them as will do: at most four words an anchor, and the two anchors of a span together at most half of what they locate. |
| `locators/nl/frame-texts.json` | The official text the Dutch frames quote, as `npm run education:frame-texts` read it in the pinned sources. |
| `reviews/<jurisdiction>/<level>/<subject>.json` | The verdicts of the second check for a lane, and the statements its check rendition holds that no record carries. |
| `manifest.ts`, `manifest/` | The lane manifest: for each lane its sources, what the second check reads, the expected number of records and how it was counted, what is skipped and left out. `manifest/us-ca.ts` and `manifest/nl.ts` hold the data. `manifest/us-ca-additions.ts` holds small lists of what the second check found that California's exports do not say or say wrongly, and `manifest/nl-additions.ts` holds the lists the Dutch importer reads beside the manifest: the goals the open data misfiles, the statements it cuts short, the examples and the images, and where the texts the frames quote are. |
| `ages.ts` | The age tables: which levels a child of a given age falls in, per jurisdiction, with sub-bands and gaps. |
| `tools/` | The pack's scripts and their tests. `tools/schema.ts` defines the record format. |
| `research/` | The research the pack was planned from. |
| `docs/LICENSE-NOTES.md` | Whose text the official wording is, what the two reuse policies mean, and the reuse terms of each source. |
| `docs/TADA-DELTAS.md` | Where the record format departs from the record format of the Tada education pack plan, field by field, and why. That plan is in the Tada repo, not in this one. |
| `docs/COVERAGE.md` | The coverage report per lane, generated by `npm run education:coverage`. |
| `tsconfig.json`, `vitest.config.ts` | The pack's own TypeScript and test configs. |

## How the corpus was built and checked

1. The lane manifest, the source records and the age tables were written first, with an expected number of records per lane counted in each publisher's own files.
2. Every source was fetched once and pinned by hash in its source record.
3. Official text was read by script, not typed. Importers wrote one record per row of California's standards search exports, per statement of the Dutch legal text and per goal of SLO's open data. For material that exists only as a PDF or a document file, a locator names the page and the bounding words of each statement and a script extracted the text between them. Where a text layer, the text recognition of a page drawn as images, or an export gets a word wrong, an exact correction is recorded in the lane's locator or in `manifest/us-ca-additions.ts`; the lane's frame lists the corrections, and the second check verifies them against the page. For the Dutch goals per fase the first check rounds showed that the content-line PDFs print more than the open data: an example under many goals, and the whole of eight statements that the data cuts short. The importer now reads both in the PDF. An example is kept as accompanying text beside the goal, and a statement the data cuts short is restored from the PDF, with a source line that cites the PDF. Where the open data misfiles a goal, a list in `manifest/nl-additions.ts` corrects it. Each such lane's frame lists what was restored, attached and corrected. Text that holds for a whole column, cluster or card and for no single statement is quoted in the lane's frame and is in no record.
4. The pack's own text was written per lane: a Summary for each California record, an English gloss for each Dutch record, and design notes for every record.
5. Every record is given a second check by an agent that did not write it and did not see the writer's notes: the wording against the lane's check rendition, where a script matches what it can, and the Summary or gloss and the design notes against the wording. The verdicts are in `reviews/`, bound to each record by hash.
6. Fix rounds follow. Each corrected record is checked again, in a higher round, by an agent that did not make the fix, until it is confirmed or what is left is a difference between two official renditions. Such a record stays `unconfirmed` with the reason `wording-differs`. A record without a verdict shows as `unchecked`, and one changed after its verdict as `stale`. The corpus is done when `npm run education:gate` passes.

How strong a lane's check is depends on its sources. Where a second official rendition exists the check read that one; where the material exists as one file only, the check is a second reading of the same file. Each lane's frame and the coverage report say which. The counts per state are in the coverage report and are not repeated here.
