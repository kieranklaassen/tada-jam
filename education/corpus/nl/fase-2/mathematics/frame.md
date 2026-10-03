---
id: edu.nl.fase-2.mathematics.frame.lane
kind: frame
title: "Fase 2 mathematics"
jurisdiction: nl
level: fase-2
subject: mathematics
sources:
  - edu.nl.source.nl-slo-curriculum-inhoudslijnen
  - edu.nl.source.nl-slo-inhoudslijn-rw-getalbegrip
  - edu.nl.source.nl-slo-curriculum-basis
  - edu.nl.source.nl-slo-inhoudslijn-rw-bewerkingen
  - edu.nl.source.nl-slo-inhoudslijn-rw-verhoudingen
  - edu.nl.source.nl-slo-inhoudslijn-rw-meten
  - edu.nl.source.nl-slo-inhoudslijn-rw-meetkunde
  - edu.nl.source.nl-slo-inhoudslijn-rw-verbanden
expected_count: 118
counting_method: "Walked the open data from inh.vakleergebieden.json through inh.inhoudslijnen.json and inh.clusters.json (and inh.subclusters.json for Nederlands), collected every goal-at-level id on those objects, resolved each in doelniveaus.json of curriculum-basis, and kept those linked to the level titled \"fase 2\". Per inhoudslijn: Getalbegrip 18, Bewerkingen 27, Verhoudingen 6, Meten 44, Meetkunde 15, Verbanden 8. For Bewerkingen the data links 28 goals to fase 2: two are copies and no records, and one goal that the data links to fase 3 is filed here, which gives 27."
check_renditions:
  - edu.nl.source.nl-slo-inhoudslijn-rw-getalbegrip
  - edu.nl.source.nl-slo-inhoudslijn-rw-bewerkingen
  - edu.nl.source.nl-slo-inhoudslijn-rw-verhoudingen
  - edu.nl.source.nl-slo-inhoudslijn-rw-meten
  - edu.nl.source.nl-slo-inhoudslijn-rw-meetkunde
  - edu.nl.source.nl-slo-inhoudslijn-rw-verbanden
check_strength: second-rendition
nothing_published: false
status: draft
---

## What this lane covers

118 records, under 25 official domains:

- **Rekenen en wiskunde / Getalbegrip / Hele getallen: de telrij (rw/gb/1)**: 3
- **Rekenen en wiskunde / Getalbegrip / Hele getallen: hoeveelheden (rw/gb/2)**: 3
- **Rekenen en wiskunde / Getalbegrip / Hele getallen: getallen (rw/gb/3)**: 8
- **Rekenen en wiskunde / Getalbegrip / Decimale getallen (rw/gb/4)**: 2
- **Rekenen en wiskunde / Getalbegrip / Breuken (rw/gb/5)**: 2
- **Rekenen en wiskunde / Bewerkingen / Optellen en aftrekken met hele getallen (rw/bew/1)**: 10
- **Rekenen en wiskunde / Bewerkingen / Optellen en aftrekken met decimale getallen (rw/bew/2)**: 1
- **Rekenen en wiskunde / Bewerkingen / Vermenigvuldigen en delen met hele getallen (rw/bew/3)**: 12
- **Rekenen en wiskunde / Bewerkingen / Vermenigvuldigen en delen met decimale getallen (rw/bew/4)**: 1
- **Rekenen en wiskunde / Bewerkingen / Combinaties van en relaties tussen bewerkingen (rw/bew/5)**: 2
- **Rekenen en wiskunde / Bewerkingen / Bewerkingen met breuken (rw/bew/6)**: 1
- **Rekenen en wiskunde / Verhoudingen / Wiskundetaal bij verhoudingen, breuken en procenten (rw/verh/1)**: 2
- **Rekenen en wiskunde / Verhoudingen / Rekenen en redeneren met verhoudingen (rw/verh/2)**: 4
- **Rekenen en wiskunde / Meten / Lengte en omtrek (rw/m/1)**: 6
- **Rekenen en wiskunde / Meten / Oppervlakte (rw/m/2)**: 7
- **Rekenen en wiskunde / Meten / Inhoud (rw/m/3)**: 8
- **Rekenen en wiskunde / Meten / Gewicht (rw/m/4)**: 8
- **Rekenen en wiskunde / Meten / Tijd (rw/m/6)**: 8
- **Rekenen en wiskunde / Meten / Geld (rw/m/7)**: 6
- **Rekenen en wiskunde / Meten / Samengestelde grootheden (rw/m/8)**: 1
- **Rekenen en wiskunde / Meetkunde / Oriënteren in de ruimte (rw/mk/1)**: 5
- **Rekenen en wiskunde / Meetkunde / Construeren (rw/mk/2)**: 4
- **Rekenen en wiskunde / Meetkunde / Opereren met vormen en figuren (rw/mk/3)**: 6
- **Rekenen en wiskunde / Verbanden / Verbanden in tabellen, diagrammen en grafieken (rw/verb/1)**: 6
- **Rekenen en wiskunde / Verbanden / Verbanden in patronen (rw/verb/2)**: 2

Guidance of the curriculum institute: the goals say what a school can offer in a band, not what a child must know. They were written for the 2006 core goals. Fase 2 is groep 4, 5 and 6. The goals are for the whole band: nothing says which are for groep 6. For rekenen-wiskunde the PDFs print examples in italics and brackets that the data leaves out. A record holds the example of its goal as accompanying text, which is official text and no part of the goal; in a few goals the data also drops statement text around an example, and there the wording of the record is the statement as the PDF prints it, with an example that stands inside its sentence. The sections below say which. The open data misfiles the line Bewerkingen: it lists the ten goals of the cluster "Vermenigvuldigen en delen met decimale getallen" (rw/bew/4) under the cluster before it (rw/bew/3), links all ten to fase 3 although the first is a fase 2 goal, and fills rw/bew/4 with copies of the six goals of rw/bew/5. The content-line PDF and the goal numbers in the data itself agree on where each goal belongs, and the records follow them; the section on corrections below lists every goal concerned. A corrected record keeps the code the data gives it, so the ten goals of rw/bew/4 carry codes that open with rw/bew/3. The data gives the code rw/bew/5/02/fase3 to two goals: one links to fase 2 and is a record of this lane, the other links to fase 3 and is a record of fase 3. A lookup by that code returns both. The code rw/bew/2/01/fase1 names another fase than its goal links to, which is fase 2: the record is in this lane.

## What one record is

One record is one goal at one fase (a goal-at-level object, doelniveau). Its wording is the title of the goal it lists, and its code is its own prefix, for example rw/gb/1/01/fase1: line, cluster, number, fase, with one more segment for a sub-cluster in Nederlands. These are codes of the data: the PDFs print none. A code does not identify a record, so the record id is built on the id of the goal-at-level object, and a lookup by code returns every match.

## Parts and how each is checked

- **Inhoudslijn Getalbegrip, fase 2**: 18 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-getalbegrip`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Bewerkingen, fase 2**: 27 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-bewerkingen`, a second rendition. The slo.nl PDF of this inhoudslijn (7 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Verhoudingen, fase 2**: 6 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-verhoudingen`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Meten, fase 2**: 44 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-meten`, a second rendition. The slo.nl PDF of this inhoudslijn (6 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Meetkunde, fase 2**: 15 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-meetkunde`, a second rendition. The slo.nl PDF of this inhoudslijn (2 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Verbanden, fase 2**: 8 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-verbanden`, a second rendition. The slo.nl PDF of this inhoudslijn (2 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.

The expected count was counted in the file the records are read from, which is the only index. Such a count cannot show a statement that file lacks; the second check, which lists what the check rendition holds and no record carries, is what can.

## Statements skipped

None.

## Gaps if an optional source is missing

None.

## Left out at this level

Official material for this level that the pack records in none of its four subjects:

- **Inhoudslijnen po, fase 2: De samenleving / Culturen, leefgewoonten en levensbeschouwingen (ojw/ds/3), 4 goals in the open data**: Outside the four subjects (society and civics).
- **Inhoudslijnen po, fase 2: De samenleving / Organisatie van de samenleving (ojw/ds/5), 9 goals in the open data**: Outside the four subjects (society and civics).
- **Inhoudslijnen po, fase 2: De samenleving / Wonen, werken, recreëren (ojw/ds/6), 5 goals in the open data**: Outside the four subjects (society and civics).
- **Inhoudslijnen po, fase 2: De ruimte om je heen / Bouw en processen van de aarde (ojw/rojh/1), 3 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 2: De ruimte om je heen / Inrichting en indeling van de ruimte (landschap) (ojw/rojh/3), 7 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 2: De ruimte om je heen / Kaart en kaartbeeld (ojw/rojh/4), 8 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 2: De ruimte om je heen / Landbouw, industrie en logistiek (ojw/rojh/5), 8 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 2: Tijd / Besef van tijd (cyclisch element) (ojw/tijd/1), 2 goals in the open data**: Outside the four subjects (history).
- **Inhoudslijnen po, fase 2: Tijd / Historisch tijdsbesef (lineair element) (ojw/tijd/2), 11 goals in the open data**: Outside the four subjects (history).
- **Inhoudslijnen po, fase 2: Tijd / Verschijnselen, ontwikkelingen en personen (ojw/tijd/3), 27 goals in the open data**: Outside the four subjects (history).
- **Inhoudslijnen po, fase 2: Kunstzinnige oriëntatie, the whole set, 105 goals in the open data**: Outside the four subjects.
- **Inhoudslijnen po, fase 2: Bewegingsonderwijs, the whole set, 64 goals in the open data**: Outside the four subjects.
- **Inhoudslijnen po, fase 2: Digitale geletterdheid, the whole set, 105 goals in the open data**: Outside the four subjects.
- **Inhoudslijn Engels, fase 2**: Outside the four subjects. It is published on slo.nl as a PDF only and is not in the open data.
- **TULE: inhouden en activiteiten per kerndoel van 2006, per twee groepen**: Examples per pair of groepen for the 2006 core goals, which the plan leaves for later. Not fetched.

## Official text for the lane as a whole

The sources print text that holds for a whole column, cluster or card of this lane and for no single statement. No record carries it. 1 such text is quoted here, in Dutch, as a script read it in the pinned source (`node education/tools/frame-texts.ts`; `manifest/nl-additions.ts` says where each is), each with its source record and its place there. In a quote, a line at the margin is a label or a heading of the source, and the lines set in under it are what the source prints in that row.

**Cluster headings as the PDF prints them** (`nl-slo-inhoudslijn-rw-getalbegrip`, pages 1, 2, 3). Listed where the PDF heads a cluster of this lane otherwise than the open data titles it, or prints a sentence under the heading across the three columns. The records carry the title of the data, in their code scope; what the PDF adds, such as "(vanaf groep 3)", holds for every goal of the cluster.

```text
Breuken (zie voor de breuk als verhouding het domein Verhoudingen)  [the open data titles this cluster "Breuken", rw/gb/5]
```

## Corrections to the open data

The open data misfiles 3 goals that concern this lane, and the importer corrects each by the id of its goal-at-level object, as `manifest/nl-additions.ts` lists them. A corrected record keeps the code the data gives it, also where that code names another cluster or fase, and its locator says where the data lists it. The second check verifies each correction against the content-line PDF.

**Grouped under rw/bew/4** (1 goal). The open data lists this goal under the cluster of whole numbers (rw/bew/3). The content-line PDF prints it under "Vermenigvuldigen en delen met decimale getallen" (rw/bew/4), and its goal number in the data runs on after the last goal of the whole-number cluster.

- `rw/bew/3/12/fase3` (541b0414-2bb9-4945-983e-0d5dbad319c5)

**Filed here, at fase 2** (1 goal). The open data links this goal to fase 3. The content-line PDF prints it in the fase 2 column (page 4), and its goal number in the data, RW.2.042, is a fase 2 number.

- `rw/bew/3/12/fase3` (541b0414-2bb9-4945-983e-0d5dbad319c5)

**Not a record: a copy** (2 goals). The open data fills the cluster "Vermenigvuldigen en delen met decimale getallen" (rw/bew/4) with copies of the goals of the cluster after it, "Combinaties van en relaties tussen bewerkingen" (rw/bew/5): the same text and the same goal number. The content-line PDF prints each once, under that cluster. The copy is no record; its twin is.

- `rw/bew/4/01/fase2` (f5f61cf1-86bb-477a-9851-71071c725473), a copy of b3ac52c2-fc7b-4ff8-8974-3f3ed13c1bae
- `rw/bew/4/02/fase2` (3b6aa669-025c-451b-be5d-4ecd273846c5), a copy of 5b71873d-7559-4629-a6dc-a6677194367f

## Statements restored from the content-line PDF

The open data cuts 3 statements of this lane short. The wording of each record listed here is the statement as the content-line PDF of its line prints it, read by script in the column of the lane's fase on the page or pages named, with the examples the PDF prints inside its sentence. The wording ends where the upright text of the statement ends: an example in italics that closes the statement on a line of its own is no part of it, and the record holds that example as accompanying text, as the record of any other goal does. The record keeps the id and the code of its goal in the data, and its source line cites the PDF. For these records the PDF is the source of the wording, so the check against the PDF is a second reading of the same file.

- `rw/gb/2/01/fase2` (466e5cde-a0f4-4fde-8d44-4b669dc01ff6), page 1: The open data lacks the bracketed part that closes the statement in the PDF. It is set upright there, as the statement is, and not in italics, as the examples of this line are.
- `rw/bew/3/06/fase2` (fa6d085d-5b18-44e6-a7f3-ae085c51e140), page 3: The open data stops where the first example of the PDF stands, and lacks the statement text printed after it.
- `rw/m/7/03/fase2` (bfc77bc3-d6b3-478e-85cb-e0cfbfd0201e), page 5: The open data stops where the first example of the PDF stands, and lacks the statement text printed after it.

## Examples kept as accompanying text

An example that a content-line PDF prints with a goal and the open data leaves out is official text, and no part of the goal. A record holds it as accompanying text: in its official wording region, after the wording, under a line that opens "Accompanying official text, not part of the statement" and says how the PDF prints it, and by its hash in `supplement_sha256`. The wording and `wording_sha256` are those of the goal alone, as the data has it. Where the example closes the goal, the accompanying text is the example; where it stands inside the sentence, it is the goal as the PDF prints it, so that each example keeps its place. The source line names the PDF, the column, and the page or pages the accompanying text itself stands on, which can be the page after the one its goal opens on.

In 6 parts of this lane the PDF sets the examples in italics, and the importer attaches them by script: it joins every goal of the part to the statement the PDF prints for it, by its text, and fails when a goal cannot be joined. An example that closes its goal is cut where the italics open, so a bracket or a quotation mark that closes the statement stays with the statement. Where the page raises a digit, the accompanying text holds the raised character (m²), and it holds a sign of the Symbol font as the character the page prints (≈); the wording of a goal is the data's, which writes a raised digit as a plain one (m2).

- **Inhoudslijn Getalbegrip, fase 2**, from `edu.nl.source.nl-slo-inhoudslijn-rw-getalbegrip`
- **Inhoudslijn Bewerkingen, fase 2**, from `edu.nl.source.nl-slo-inhoudslijn-rw-bewerkingen`
- **Inhoudslijn Verhoudingen, fase 2**, from `edu.nl.source.nl-slo-inhoudslijn-rw-verhoudingen`
- **Inhoudslijn Meten, fase 2**, from `edu.nl.source.nl-slo-inhoudslijn-rw-meten`
- **Inhoudslijn Meetkunde, fase 2**, from `edu.nl.source.nl-slo-inhoudslijn-rw-meetkunde`
- **Inhoudslijn Verbanden, fase 2**, from `edu.nl.source.nl-slo-inhoudslijn-rw-verbanden`
