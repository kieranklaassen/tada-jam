---
id: edu.nl.fase-1.mathematics.frame.lane
kind: frame
title: "Fase 1 mathematics"
jurisdiction: nl
level: fase-1
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
  - edu.nl.source.nl-slo-inhoudskaart-rekenen-fase1
expected_count: 195
counting_method: "Walked the open data from inh.vakleergebieden.json through inh.inhoudslijnen.json and inh.clusters.json (and inh.subclusters.json for Nederlands), collected every goal-at-level id on those objects, resolved each in doelniveaus.json of curriculum-basis, and kept those linked to the level titled \"fase 1\". Per inhoudslijn: Getalbegrip 27, Bewerkingen 7, Verhoudingen 3, Meten 39, Meetkunde 18, Verbanden 4. The cards: Counted the bullet glyphs (•) in the PDF's text layer with pdftotext -bbox, by column and by the heading above each, and checked the result by eye against the rendered page. The rekenen-wiskunde card has 97 bullets, all in this lane."
check_renditions:
  - edu.nl.source.nl-slo-inhoudslijn-rw-getalbegrip
  - edu.nl.source.nl-slo-inhoudslijn-rw-bewerkingen
  - edu.nl.source.nl-slo-inhoudslijn-rw-verhoudingen
  - edu.nl.source.nl-slo-inhoudslijn-rw-meten
  - edu.nl.source.nl-slo-inhoudslijn-rw-meetkunde
  - edu.nl.source.nl-slo-inhoudslijn-rw-verbanden
check_strength: mixed
nothing_published: false
status: draft
---

## What this lane covers

195 records, under 23 official domains:

- **Rekenen en wiskunde / Getalbegrip / Hele getallen: de telrij (rw/gb/1)**: 7
- **Rekenen en wiskunde / Getalbegrip / Hele getallen: hoeveelheden (rw/gb/2)**: 10
- **Rekenen en wiskunde / Getalbegrip / Hele getallen: getallen (rw/gb/3)**: 10
- **Rekenen en wiskunde / Bewerkingen / Optellen en aftrekken met hele getallen (rw/bew/1)**: 4
- **Rekenen en wiskunde / Bewerkingen / Vermenigvuldigen en delen met hele getallen (rw/bew/3)**: 3
- **Rekenen en wiskunde / Verhoudingen / Rekenen en redeneren met verhoudingen (rw/verh/2)**: 3
- **Rekenen en wiskunde / Meten / Lengte en omtrek (rw/m/1)**: 7
- **Rekenen en wiskunde / Meten / Oppervlakte (rw/m/2)**: 4
- **Rekenen en wiskunde / Meten / Inhoud (rw/m/3)**: 6
- **Rekenen en wiskunde / Meten / Gewicht (rw/m/4)**: 6
- **Rekenen en wiskunde / Meten / Temperatuur (rw/m/5)**: 1
- **Rekenen en wiskunde / Meten / Tijd (rw/m/6)**: 10
- **Rekenen en wiskunde / Meten / Geld (rw/m/7)**: 5
- **Rekenen en wiskunde / Meetkunde / Oriënteren in de ruimte (rw/mk/1)**: 6
- **Rekenen en wiskunde / Meetkunde / Construeren (rw/mk/2)**: 6
- **Rekenen en wiskunde / Meetkunde / Opereren met vormen en figuren (rw/mk/3)**: 6
- **Rekenen en wiskunde / Verbanden / Verbanden in tabellen, diagrammen en grafieken (rw/verb/1)**: 4
- **Inhoudskaart Rekenen-wiskunde, fase 1 / GETALLEN: Getalbegrip**: 27
- **Inhoudskaart Rekenen-wiskunde, fase 1 / GETALLEN: Bewerkingen**: 7
- **Inhoudskaart Rekenen-wiskunde, fase 1 / Verhoudingen**: 3
- **Inhoudskaart Rekenen-wiskunde, fase 1 / Verbanden**: 4
- **Inhoudskaart Rekenen-wiskunde, fase 1 / METEN & MEETKUNDE: Meten**: 38
- **Inhoudskaart Rekenen-wiskunde, fase 1 / METEN & MEETKUNDE: Meetkunde**: 18

Guidance of the curriculum institute: the goals say what a school can offer in a band, not what a child must know. They were written for the 2006 core goals. Fase 1 is groep 1, 2 and 3. The card is titled for kleuters, but its number range ("tot tenminste 20") is that of the fase 1 goals. For rekenen-wiskunde the PDFs print examples in italics and brackets that the data leaves out. A record holds the example of its goal as accompanying text, which is official text and no part of the goal; in a few goals the data also drops statement text around an example, and there the wording of the record is the statement as the PDF prints it, with an example that stands inside its sentence. The sections below say which.

## What one record is

One record is one goal at one fase (a goal-at-level object, doelniveau). Its wording is the title of the goal it lists, and its code is its own prefix, for example rw/gb/1/01/fase1: line, cluster, number, fase, with one more segment for a sub-cluster in Nederlands. These are codes of the data: the PDFs print none. A code does not identify a record, so the record id is built on the id of the goal-at-level object, and a lookup by code returns every match. The fase 1 card restates the fase 1 goals of the open data for the youngest children, in its own grouping and partly in its own words. Both are recorded, as separate records: the card says which goals are for the youngest children, which the band alone does not. One record is one bullet (•) of the card. A sub-point (–) stays inside its bullet, and wording the card breaks over several lines is one statement. The card prints no codes. The code of a record is the pack's own: the sub-heading the bullet stands under, a slash and the position of the bullet under that sub-heading ("<sub-heading> / <position>"), or the position alone where the bullets stand directly under their bar. The lookup finds a record by that code, and the code scope names the card and the heading bar. The locator names the card, the heading bar, the sub-heading and the position of the bullet under it. On the card the bullets of Verhoudingen and of Verbanden stand directly under their bars.

## Parts and how each is checked

- **Inhoudslijn Getalbegrip, fase 1**: 27 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-getalbegrip`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 1, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Bewerkingen, fase 1**: 7 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-bewerkingen`, a second rendition. The slo.nl PDF of this inhoudslijn (7 pages), read by column: the column headed fase 1, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Verhoudingen, fase 1**: 3 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-verhoudingen`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 1, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Meten, fase 1**: 39 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-meten`, a second rendition. The slo.nl PDF of this inhoudslijn (6 pages), read by column: the column headed fase 1, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Meetkunde, fase 1**: 18 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-meetkunde`, a second rendition. The slo.nl PDF of this inhoudslijn (2 pages), read by column: the column headed fase 1, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Verbanden, fase 1**: 4 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-rw-verbanden`, a second rendition. The slo.nl PDF of this inhoudslijn (2 pages), read by column: the column headed fase 1, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ: the PDF prints an example in italics and brackets ("(bijv. ...)") with about a third of the statements, which the data leaves out and the record holds as accompanying text, apart from its wording. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudskaart Rekenen-wiskunde, fase 1**: 97 records, read from `edu.nl.source.nl-slo-inhoudskaart-rekenen-fase1`. Checked by a second reading of the same file. A second reading of the rendered page. Where a card statement has the same wording as a fase 1 goal of the open data, that goal is its second rendition and the verdict names it. Measured on the recognised text: of 97 statements 52 have the same text as a fase 1 goal, 24 a close one and 21 none.

The expected count was counted in the file the records are read from, which is the only index. Such a count cannot show a statement that file lacks; the second check, which lists what the check rendition holds and no record carries, is what can.

## Statements skipped

None.

## Gaps if an optional source is missing

None.

## Left out at this level

Official material for this level that the pack records in none of its four subjects:

- **Inhoudskaart Engels, fase 1**: Outside the four subjects. The card was not fetched.
- **Inhoudskaart Kunstzinnige oriëntatie, fase 1**: Outside the four subjects. The card was not fetched.
- **Inhoudskaart Digitale geletterdheid, fase 1**: Outside the four subjects. The card was not fetched.
- **Inhoudskaart Bewegingsonderwijs, fase 1**: Outside the four subjects. The card was not fetched.
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1: De samenleving / Organisatie van de samenleving, 3 bullets**: Outside the four subjects (society and civics).
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1: De samenleving / Wonen, werken en recreëren, 4 bullets**: Outside the four subjects (society and civics).
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1: De samenleving / Culturen, leefgewoonten en levensbeschouwingen, 3 bullets**: Outside the four subjects (society and civics).
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1: De ruimte om je heen / Bouw en processen van de aarde, 3 bullets**: Outside the four subjects (geography).
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1: De ruimte om je heen / Inrichting en indeling van de ruimte, bullets 1 and 2 of 4**: Outside the four subjects (geography). Bullets 3 and 4 under this heading are records of practical life and feelings.
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1: De ruimte om je heen / Landbouw, industrie en logistiek, 6 bullets**: Outside the four subjects (geography).
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1: De ruimte om je heen / Kaart en kaartbeeld, 2 bullets**: Outside the four subjects (geography).
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1: Tijd / Besef van tijd, 4 bullets**: Outside the four subjects (history).
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1: Tijd / Historisch tijdsbesef, 5 bullets**: Outside the four subjects (history).
- **Inhoudslijnen po, fase 1: De samenleving / Culturen, leefgewoonten en levensbeschouwingen (ojw/ds/3), 3 goals in the open data**: Outside the four subjects (society and civics).
- **Inhoudslijnen po, fase 1: De samenleving / Organisatie van de samenleving (ojw/ds/5), 3 goals in the open data**: Outside the four subjects (society and civics).
- **Inhoudslijnen po, fase 1: De samenleving / Wonen, werken, recreëren (ojw/ds/6), 4 goals in the open data**: Outside the four subjects (society and civics).
- **Inhoudslijnen po, fase 1: De ruimte om je heen / Bouw en processen van de aarde (ojw/rojh/1), 3 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 1: De ruimte om je heen / Inrichting en indeling van de ruimte (landschap) (ojw/rojh/3), 4 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 1: De ruimte om je heen / Kaart en kaartbeeld (ojw/rojh/4), 2 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 1: De ruimte om je heen / Landbouw, industrie en logistiek (ojw/rojh/5), 6 goals in the open data**: Outside the four subjects (geography).
- **Inhoudslijnen po, fase 1: Tijd / Besef van tijd (cyclisch element) (ojw/tijd/1), 4 goals in the open data**: Outside the four subjects (history).
- **Inhoudslijnen po, fase 1: Tijd / Historisch tijdsbesef (lineair element) (ojw/tijd/2), 5 goals in the open data**: Outside the four subjects (history).
- **Inhoudslijnen po, fase 1: Kunstzinnige oriëntatie, the whole set, 89 goals in the open data**: Outside the four subjects.
- **Inhoudslijnen po, fase 1: Bewegingsonderwijs, the whole set, 43 goals in the open data**: Outside the four subjects.
- **Inhoudslijnen po, fase 1: Digitale geletterdheid, the whole set, 76 goals in the open data**: Outside the four subjects.
- **Inhoudslijn Engels, fase 1**: Outside the four subjects. It is published on slo.nl as a PDF only and is not in the open data.
- **TULE: inhouden en activiteiten per kerndoel van 2006, per twee groepen**: Examples per pair of groepen for the 2006 core goals, which the plan leaves for later. Not fetched.

## Statements restored from the content-line PDF

The open data cuts 2 statements of this lane short. The wording of each record listed here is the statement as the content-line PDF of its line prints it, read by script in the column of the lane's fase on the page or pages named, with the examples the PDF prints inside its sentence. The wording ends where the upright text of the statement ends: an example in italics that closes the statement on a line of its own is no part of it, and the record holds that example as accompanying text, as the record of any other goal does. The record keeps the id and the code of its goal in the data, and its source line cites the PDF. For these records the PDF is the source of the wording, so the check against the PDF is a second reading of the same file.

- `rw/mk/2/02/fase1` (2788a108-6286-4668-9586-0c4aeacf49d7), page 1: The open data stops where the first example of the PDF stands, and lacks the statement text printed after it.
- `rw/mk/2/05/fase1` (1c301e36-a177-481f-8203-99a8b7e2bfec), page 1: The open data stops where the first example of the PDF stands, and lacks the statement text printed after it.

## Examples kept as accompanying text

An example that a content-line PDF prints with a goal and the open data leaves out is official text, and no part of the goal. A record holds it as accompanying text: in its official wording region, after the wording, under a line that opens "Accompanying official text, not part of the statement" and says how the PDF prints it, and by its hash in `supplement_sha256`. The wording and `wording_sha256` are those of the goal alone, as the data has it. Where the example closes the goal, the accompanying text is the example; where it stands inside the sentence, it is the goal as the PDF prints it, so that each example keeps its place. The source line names the PDF, the column, and the page or pages the accompanying text itself stands on, which can be the page after the one its goal opens on.

In 6 parts of this lane the PDF sets the examples in italics, and the importer attaches them by script: it joins every goal of the part to the statement the PDF prints for it, by its text, and fails when a goal cannot be joined. An example that closes its goal is cut where the italics open, so a bracket or a quotation mark that closes the statement stays with the statement. Where the page raises a digit, the accompanying text holds the raised character (m²), and it holds a sign of the Symbol font as the character the page prints (≈); the wording of a goal is the data's, which writes a raised digit as a plain one (m2).

- **Inhoudslijn Getalbegrip, fase 1**, from `edu.nl.source.nl-slo-inhoudslijn-rw-getalbegrip`
- **Inhoudslijn Bewerkingen, fase 1**, from `edu.nl.source.nl-slo-inhoudslijn-rw-bewerkingen`
- **Inhoudslijn Verhoudingen, fase 1**, from `edu.nl.source.nl-slo-inhoudslijn-rw-verhoudingen`
- **Inhoudslijn Meten, fase 1**, from `edu.nl.source.nl-slo-inhoudslijn-rw-meten`
- **Inhoudslijn Meetkunde, fase 1**, from `edu.nl.source.nl-slo-inhoudslijn-rw-meetkunde`
- **Inhoudslijn Verbanden, fase 1**, from `edu.nl.source.nl-slo-inhoudslijn-rw-verbanden`

## Extraction corrections

The lane's locator corrects the extracted text in 1 place. The second check verifies each against the page.

- **Inhoudskaart Rekenen-wiskunde, fase 1 / METEN & MEETKUNDE: Meten, Gewicht / 1**: text recognition misread
