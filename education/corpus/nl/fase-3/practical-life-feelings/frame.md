---
id: edu.nl.fase-3.practical-life-feelings.frame.lane
kind: frame
title: "Fase 3 practical life and feelings"
jurisdiction: nl
level: fase-3
subject: practical-life-feelings
sources:
  - edu.nl.source.nl-slo-curriculum-inhoudslijnen
  - edu.nl.source.nl-slo-inhoudslijn-ojw-jezelf
  - edu.nl.source.nl-slo-curriculum-basis
  - edu.nl.source.nl-slo-inhoudslijn-ojw-samenleving
  - edu.nl.source.nl-slo-inhoudslijn-ojw-ruimte
  - edu.nl.source.nl-slo-inhoudslijn-ojw-planten-dieren-mens
  - edu.nl.source.nl-slo-inhoudslijn-ojw-boekje
  - edu.nl.source.nl-slo-inhoudslijn-ojw-kerndoelen-overzicht
expected_count: 65
counting_method: "Walked the open data from inh.vakleergebieden.json through inh.inhoudslijnen.json and inh.clusters.json (and inh.subclusters.json for Nederlands), collected every goal-at-level id on those objects, resolved each in doelniveaus.json of curriculum-basis, and kept those linked to the level titled \"fase 3\". Per inhoudslijn: Jezelf en de ander 31, De samenleving 18, De ruimte om je heen 5, Planten, dieren en de mens 11."
check_renditions:
  - edu.nl.source.nl-slo-inhoudslijn-ojw-jezelf
  - edu.nl.source.nl-slo-inhoudslijn-ojw-samenleving
  - edu.nl.source.nl-slo-inhoudslijn-ojw-ruimte
  - edu.nl.source.nl-slo-inhoudslijn-ojw-planten-dieren-mens
check_strength: second-rendition
nothing_published: false
status: draft
---

## What this lane covers

65 records, under 8 official domains:

- **Orientatie op jezelf en de wereld / Jezelf en de ander / Gevoelens, wensen en opvattingen (ojw/ja/1)**: 10
- **Orientatie op jezelf en de wereld / Jezelf en de ander / Relaties en seksualiteit (ojw/ja/2)**: 9
- **Orientatie op jezelf en de wereld / Jezelf en de ander / Samen leven en samenwerken (ojw/ja/3)**: 12
- **Orientatie op jezelf en de wereld / De samenleving / (Veilige) leefomgeving (ojw/ds/1)**: 8
- **Orientatie op jezelf en de wereld / De samenleving / Consument zijn (ojw/ds/2)**: 5
- **Orientatie op jezelf en de wereld / De samenleving / Deelnemen aan het verkeer (ojw/ds/4)**: 5
- **Orientatie op jezelf en de wereld / De ruimte om je heen / Omgaan met het milieu (ojw/rojh/6)**: 5
- **Orientatie op jezelf en de wereld / Planten, dieren en de mens / Gezondheid en hygiëne (ojw/pdm/2)**: 11

Guidance of the curriculum institute: the goals say what a school can offer in a band, not what a child must know. They were written for the 2006 core goals. Fase 3 is groep 7 and 8. SLO publishes no social-emotional card or inhoudslijn for this fase: the line "Jezelf en de ander" is the nearest official material, and it is recorded here. Two more PDFs print the same goals and are read for the frame only: the booklet of all the lines of this area, and the overview that names the 2006 core goals each goal serves.

## What one record is

One record is one goal at one fase (a goal-at-level object, doelniveau). Its wording is the title of the goal it lists, and its code is its own prefix, for example rw/gb/1/01/fase1: line, cluster, number, fase, with one more segment for a sub-cluster in Nederlands. These are codes of the data: the PDFs print none. A code does not identify a record, so the record id is built on the id of the goal-at-level object, and a lookup by code returns every match.

## Parts and how each is checked

- **Inhoudslijn Jezelf en de ander, fase 3**: 31 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ojw-jezelf`, a second rendition. The slo.nl PDF of this inhoudslijn (2 pages), read by column: the column headed fase 3, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn De samenleving, fase 3**: 18 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ojw-samenleving`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 3, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn De ruimte om je heen, fase 3**: 5 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ojw-ruimte`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 3, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Planten, dieren en de mens, fase 3**: 11 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ojw-planten-dieren-mens`, a second rendition. The slo.nl PDF of this inhoudslijn (4 pages), read by column: the column headed fase 3, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.

The expected count was counted in the file the records are read from, which is the only index. Such a count cannot show a statement that file lacks; the second check, which lists what the check rendition holds and no record carries, is what can.

## Statements skipped

- `ojw/ds/3`: Outside the four subjects (society and civics): the 5 goals of "Culturen, leefgewoonten en levensbeschouwingen" are not recorded.
- `ojw/ds/5`: Outside the four subjects (society and civics): the 9 goals of "Organisatie van de samenleving" are not recorded.
- `ojw/ds/6`: Outside the four subjects (society and civics): the 6 goals of "Wonen, werken, recreëren" are not recorded.
- `ojw/rojh/1`: Outside the four subjects (geography): the 6 goals of "Bouw en processen van de aarde" are not recorded.
- `ojw/rojh/2`: Recorded in science at this level: the 3 goals of "Heelal en hemellichamen".
- `ojw/rojh/3`: Outside the four subjects (geography): the 7 goals of "Inrichting en indeling van de ruimte (landschap)" are not recorded.
- `ojw/rojh/4`: Outside the four subjects (geography): the 7 goals of "Kaart en kaartbeeld" are not recorded.
- `ojw/rojh/5`: Outside the four subjects (geography): the 7 goals of "Landbouw, industrie en logistiek" are not recorded.
- `ojw/rojh/7`: Recorded in science at this level: the 6 goals of "Weer en klimaat".
- `ojw/pdm/1`: Recorded in science at this level: the 6 goals of "De mens".
- `ojw/pdm/3`: Recorded in science at this level: the 16 goals of "Groei, ontwikkeling (bloei), gedrag en voortplanting (instandhouding)".
- `ojw/pdm/4`: Recorded in science at this level: the 3 goals of "Omgaan met de natuur".
- `ojw/pdm/5`: Recorded in science at this level: the 14 goals of "Planten en dieren".

## Gaps if an optional source is missing

None.

## Left out at this level

Official material for this level that the pack records in none of its four subjects:

- **Inhoudslijnen po, fase 3: De samenleving / Culturen, leefgewoonten en levensbeschouwingen (ojw/ds/3), 5 goals in the open data**: Outside the four subjects (society and civics).
- **Inhoudslijnen po, fase 3: De samenleving / Organisatie van de samenleving (ojw/ds/5), 9 goals in the open data**: Outside the four subjects (society and civics).
- **Inhoudslijnen po, fase 3: De samenleving / Wonen, werken, recreëren (ojw/ds/6), 6 goals in the open data**: Outside the four subjects (society and civics).
- **Inhoudslijnen po, fase 3: De ruimte om je heen / Bouw en processen van de aarde (ojw/rojh/1), 6 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 3: De ruimte om je heen / Inrichting en indeling van de ruimte (landschap) (ojw/rojh/3), 7 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 3: De ruimte om je heen / Kaart en kaartbeeld (ojw/rojh/4), 7 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 3: De ruimte om je heen / Landbouw, industrie en logistiek (ojw/rojh/5), 7 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 3: Tijd / Besef van tijd (cyclisch element) (ojw/tijd/1), 1 goal in the open data**: Outside the four subjects (history).
- **Inhoudslijnen po, fase 3: Tijd / Historisch tijdsbesef (lineair element) (ojw/tijd/2), 15 goals in the open data**: Outside the four subjects (history).
- **Inhoudslijnen po, fase 3: Tijd / Verschijnselen, ontwikkelingen en personen (ojw/tijd/3), 27 goals in the open data**: Outside the four subjects (history).
- **Inhoudslijnen po, fase 3: Kunstzinnige oriëntatie, the whole set, 113 goals in the open data**: Outside the four subjects.
- **Inhoudslijnen po, fase 3: Bewegingsonderwijs, the whole set, 65 goals in the open data**: Outside the four subjects.
- **Inhoudslijnen po, fase 3: Digitale geletterdheid, the whole set, 104 goals in the open data**: Outside the four subjects.
- **Inhoudslijn Engels, fase 3**: Outside the four subjects. It is published on slo.nl as a PDF only and is not in the open data.
- **TULE: inhouden en activiteiten per kerndoel van 2006, per twee groepen**: Examples per pair of groepen for the 2006 core goals, which the plan leaves for later. Not fetched.

## Official text for the lane as a whole

The sources print text that holds for a whole column, cluster or card of this lane and for no single statement. No record carries it. 7 such texts are quoted here, in Dutch, as a script read them in the pinned source (`node education/tools/frame-texts.ts`; `manifest/nl-additions.ts` says where each is), each with its source record and its place there. In a quote, a line at the margin is a label or a heading of the source, and the lines set in under it are what the source prints in that row.

**The note on the cluster "Relaties en seksualiteit"** (`nl-slo-inhoudslijn-ojw-jezelf`, page 2). The PDF of the line Jezelf en de ander marks the heading of this cluster with an asterisk and prints this note under its last page. It holds for every goal of the cluster (ojw/ja/2).

```text
* Scholen zijn verplicht aandacht te besteden aan het thema relaties en seksualiteit, dat valt onder kerndoel 38, maar mogen zelf kiezen welke leerlijnen en tussendoelen per bouw zij formuleren.
```

**The note on underlined terms** (`nl-slo-inhoudslijn-ojw-samenleving`, page 3). The PDFs of this area underline terms in their goals and close with this note, which says what the underlining refers to. The document it names, the "Uitwerking kennisonderwerpen" of the institute, is not a source of the pack: no record and no frame holds what it says about a term. The goals that hold an underlined term are listed in this section, PDF by PDF. Quoted from the PDF of the line De samenleving; the PDFs of De ruimte om je heen and of Planten, dieren en de mens print the same note.

```text
NB De onderstreepte begrippen verwijzen naar: Uitwerking kennisonderwerpen bij de inhoudslijnen van Oriëntatie op jezelf en de wereld (Pdf: SLO 04-2018).
```

**The note on underlined terms, as the line Jezelf en de ander prints it** (`nl-slo-inhoudslijn-ojw-jezelf`, page 2). The PDF of the line Jezelf en de ander prints the same note with another date.

```text
NB De onderstreepte begrippen verwijzen naar: Uitwerking kennisonderwerpen bij de inhoudslijnen van Oriëntatie op jezelf en de wereld (Pdf: SLO 06-2020).
```

**Cluster headings as the PDF prints them** (`nl-slo-inhoudslijn-ojw-jezelf`, pages 1, 2). Listed where the PDF heads a cluster of this lane otherwise than the open data titles it, or prints a sentence under the heading across the three columns. The records carry the title of the data, in their code scope; what the PDF adds, such as "(vanaf groep 3)", holds for every goal of the cluster.

```text
Relaties en seksualiteit*  [the open data titles this cluster "Relaties en seksualiteit", ojw/ja/2]
```

**Goals that hold an underlined term** (`nl-slo-inhoudslijn-ojw-samenleving`, column fase 3). The PDF underlines terms in its goals; its note, quoted in this section, says what the underlining refers to. Neither the open data nor a record marks an underlined term. Goals of this lane that this PDF prints: 18. With an underlined term: 3, listed here, each by the code the data gives it (a statement the data lacks by its name in the manifest), then the term or terms as underlined, in the order of the page. Read by script from the rules the PDF draws under its words. "(in part)" after a word says the rule runs under part of that word only; the word is given whole, since the box of a word does not tell which letters the rule covers.

```text
ojw/ds/1/03/fase3: grenzen en identiteit; oorlog en vrede
ojw/ds/1/07/fase3: discriminatie
ojw/ds/2/01/fase3: zak-)geld (in part)
```

**Goals that hold an underlined term** (`nl-slo-inhoudslijn-ojw-ruimte`, column fase 3). The PDF underlines terms in its goals; its note, quoted in this section, says what the underlining refers to. Neither the open data nor a record marks an underlined term. Goals of this lane that this PDF prints: 5. With an underlined term: 3, listed here, each by the code the data gives it (a statement the data lacks by its name in the manifest), then the term or terms as underlined, in the order of the page. Read by script from the rules the PDF draws under its words. "(in part)" after a word says the rule runs under part of that word only; the word is given whole, since the box of a word does not tell which letters the rule covers.

```text
ojw/rojh/6/01/fase3: milieu
ojw/rojh/6/03/fase3: watermanagement
ojw/rojh/6/05/fase3: duurzame ontwikkeling
```

**Goals that hold an underlined term** (`nl-slo-inhoudslijn-ojw-planten-dieren-mens`, column fase 3). The PDF underlines terms in its goals; its note, quoted in this section, says what the underlining refers to. Neither the open data nor a record marks an underlined term. Goals of this lane that this PDF prints: 11. With an underlined term: 1, listed here, each by the code the data gives it (a statement the data lacks by its name in the manifest), then the term or terms as underlined, in the order of the page. Read by script from the rules the PDF draws under its words. "(in part)" after a word says the rule runs under part of that word only; the word is given whole, since the box of a word does not tell which letters the rule covers.

```text
ojw/pdm/2/04/fase3: mens
```

## Corrections to the open data

The open data misfiles 1 goal that concerns this lane, and the importer corrects each by the id of its goal-at-level object, as `manifest/nl-additions.ts` lists them. A corrected record keeps the code the data gives it, also where that code names another cluster or fase, and its locator says where the data lists it. The second check verifies each correction against the content-line PDF.

**Not a record of this lane: filed at fase 2** (1 goal). The open data links this goal to fase 3. The content-line PDF prints it in the fase 2 column (page 4), and its goal number in the data, RW.2.042, is a fase 2 number.

- `rw/bew/3/12/fase3` (541b0414-2bb9-4945-983e-0d5dbad319c5), a record of fase-2/mathematics

## Examples kept as accompanying text

An example that a content-line PDF prints with a goal and the open data leaves out is official text, and no part of the goal. A record holds it as accompanying text: in its official wording region, after the wording, under a line that opens "Accompanying official text, not part of the statement" and says how the PDF prints it, and by its hash in `supplement_sha256`. The wording and `wording_sha256` are those of the goal alone, as the data has it. Where the example closes the goal, the accompanying text is the example; where it stands inside the sentence, it is the goal as the PDF prints it, so that each example keeps its place. The source line names the PDF, the column, and the page or pages the accompanying text itself stands on, which can be the page after the one its goal opens on.

For 1 goal the example is listed in `manifest/nl-additions.ts`: what the PDF prints after the wording of the data, on the page named, is attached.

- `ojw/pdm/2/04/fase3` (e603fbd1-df4b-4ef6-a2bc-4811ab860b08), page 3: The PDF prints an example in brackets after the statement, upright as all of this area is set, and the open data leaves it out here, although it keeps the examples of the other goals of the area.
