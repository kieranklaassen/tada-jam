---
id: edu.nl.fase-1.science.frame.lane
kind: frame
title: "Fase 1 science"
jurisdiction: nl
level: fase-1
subject: science
sources:
  - edu.nl.source.nl-slo-curriculum-inhoudslijnen
  - edu.nl.source.nl-slo-inhoudslijn-ojw-ruimte
  - edu.nl.source.nl-slo-curriculum-basis
  - edu.nl.source.nl-slo-inhoudslijn-ojw-planten-dieren-mens
  - edu.nl.source.nl-slo-inhoudslijn-ojw-natuurkunde-techniek
  - edu.nl.source.nl-slo-inhoudskaart-ojw-fase1
  - edu.nl.source.nl-slo-inhoudslijn-ojw-boekje
  - edu.nl.source.nl-slo-inhoudslijn-ojw-kerndoelen-overzicht
expected_count: 68
counting_method: "Walked the open data from inh.vakleergebieden.json through inh.inhoudslijnen.json and inh.clusters.json (and inh.subclusters.json for Nederlands), collected every goal-at-level id on those objects, resolved each in doelniveaus.json of curriculum-basis, and kept those linked to the level titled \"fase 1\". Per inhoudslijn: De ruimte om je heen 4, Planten, dieren en de mens 20, Verschijnselen uit natuurkunde en techniek 10. The cards: Counted the bullet glyphs (•) in the PDF's text layer with pdftotext -bbox, by column and by the heading above each, and checked the result by eye against the rendered page. The card has 98 bullets: 34 are in science, 32 in practical life and feelings, and 32 are left out."
check_renditions:
  - edu.nl.source.nl-slo-inhoudslijn-ojw-ruimte
  - edu.nl.source.nl-slo-inhoudslijn-ojw-planten-dieren-mens
  - edu.nl.source.nl-slo-inhoudslijn-ojw-natuurkunde-techniek
check_strength: mixed
nothing_published: false
status: draft
---

## What this lane covers

68 records, under 12 official domains:

- **Orientatie op jezelf en de wereld / De ruimte om je heen / Heelal en hemellichamen (ojw/rojh/2)**: 2
- **Orientatie op jezelf en de wereld / De ruimte om je heen / Weer en klimaat (ojw/rojh/7)**: 2
- **Orientatie op jezelf en de wereld / Planten, dieren en de mens / De mens (ojw/pdm/1)**: 5
- **Orientatie op jezelf en de wereld / Planten, dieren en de mens / Groei, ontwikkeling (bloei), gedrag en voortplanting (instandhouding) (ojw/pdm/3)**: 6
- **Orientatie op jezelf en de wereld / Planten, dieren en de mens / Omgaan met de natuur (ojw/pdm/4)**: 5
- **Orientatie op jezelf en de wereld / Planten, dieren en de mens / Planten en dieren (ojw/pdm/5)**: 4
- **Orientatie op jezelf en de wereld / Verschijnselen uit natuurkunde en techniek / Materialen, stoffen en voorwerpen (ojw/nattech/1)**: 3
- **Orientatie op jezelf en de wereld / Verschijnselen uit natuurkunde en techniek / Natuurkundige verschijnselen (ojw/nattech/2)**: 3
- **Orientatie op jezelf en de wereld / Verschijnselen uit natuurkunde en techniek / Technische principes en systemen (ojw/nattech/3)**: 4
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1 / De ruimte om je heen**: 4
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1 / Planten, dieren en de mens**: 20
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1 / Verschijnselen uit natuurkunde en techniek**: 10

Guidance of the curriculum institute: the goals say what a school can offer in a band, not what a child must know. They were written for the 2006 core goals. From the area "Oriëntatie op jezelf en de wereld": plants, animals, the human body, physics and technology, and from the geography line the two clusters on the sky and the weather. Two more PDFs print the same goals and are read for the frame only: the booklet of all the lines of this area, and the overview that names the 2006 core goals each goal serves. The data gives the code ojw/pdm/3/01/fase1 to two goals: one links to fase 1 and is a record of this lane, the other links to fase 3 and is a record of fase 3. A lookup by that code returns both.

## What one record is

One record is one goal at one fase (a goal-at-level object, doelniveau). Its wording is the title of the goal it lists, and its code is its own prefix, for example rw/gb/1/01/fase1: line, cluster, number, fase, with one more segment for a sub-cluster in Nederlands. These are codes of the data: the PDFs print none. A code does not identify a record, so the record id is built on the id of the goal-at-level object, and a lookup by code returns every match. The fase 1 card restates the fase 1 goals of the open data for the youngest children, in its own grouping and partly in its own words. Both are recorded, as separate records: the card says which goals are for the youngest children, which the band alone does not. One record is one bullet (•) of the card. A sub-point (–) stays inside its bullet, and wording the card breaks over several lines is one statement. The card prints no codes. The code of a record is the pack's own: the sub-heading the bullet stands under, a slash and the position of the bullet under that sub-heading ("<sub-heading> / <position>"), or the position alone where the bullets stand directly under their bar. The lookup finds a record by that code, and the code scope names the card and the heading bar. The locator names the card, the heading bar, the sub-heading and the position of the bullet under it. The card puts the data's clusters "Heelal en hemellichamen" and "Weer en klimaat" under one heading.

## Parts and how each is checked

- **Inhoudslijn De ruimte om je heen, fase 1**: 4 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ojw-ruimte`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 1, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Planten, dieren en de mens, fase 1**: 20 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ojw-planten-dieren-mens`, a second rendition. The slo.nl PDF of this inhoudslijn (4 pages), read by column: the column headed fase 1, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Verschijnselen uit natuurkunde en techniek, fase 1**: 10 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ojw-natuurkunde-techniek`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 1, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1: nature, physics and technology, weather**: 34 records, read from `edu.nl.source.nl-slo-inhoudskaart-ojw-fase1`. Checked by a second reading of the same file. A second reading of the rendered page. Where a card statement has the same wording as a fase 1 goal of the open data, that goal is its second rendition and the verdict names it. Measured on the recognised text for the whole card: of 98 statements 77 have the same text as a fase 1 goal, 16 a close one and 5 none.

The expected count was counted in the file the records are read from, which is the only index. Such a count cannot show a statement that file lacks; the second check, which lists what the check rendition holds and no record carries, is what can.

## Statements skipped

- `ojw/rojh/1`: Outside the four subjects (geography): the 3 goals of "Bouw en processen van de aarde" are not recorded.
- `ojw/rojh/3`: Outside the four subjects (geography): the 4 goals of "Inrichting en indeling van de ruimte (landschap)" are not recorded.
- `ojw/rojh/4`: Outside the four subjects (geography): the 2 goals of "Kaart en kaartbeeld" are not recorded.
- `ojw/rojh/5`: Outside the four subjects (geography): the 6 goals of "Landbouw, industrie en logistiek" are not recorded.
- `ojw/rojh/6`: Recorded in practical life and feelings at this level: the 2 goals of "Omgaan met het milieu".
- `ojw/pdm/2`: Recorded in practical life and feelings at this level: the 4 goals of "Gezondheid en hygiëne".
- `Jezelf en de ander / Gevoelens, wensen en opvattingen`: Recorded in practical life and feelings at this level: 4 bullets of the same card.
- `Jezelf en de ander / Samen leven en samenwerken`: Recorded in practical life and feelings at this level: 9 bullets of the same card.
- `Jezelf en de ander / Relaties en seksualiteit`: Recorded in practical life and feelings at this level: 4 bullets of the same card.
- `De samenleving / (Veilige) leefomgeving`: Recorded in practical life and feelings at this level: 5 bullets of the same card.
- `De samenleving / Organisatie van de samenleving`: Outside the four subjects (society and civics): 3 bullets of the card are not recorded.
- `De samenleving / Wonen, werken en recreëren`: Outside the four subjects (society and civics): 4 bullets of the card are not recorded.
- `De samenleving / Deelnemen aan het verkeer`: Recorded in practical life and feelings at this level: 2 bullets of the same card.
- `De samenleving / Consument zijn`: Recorded in practical life and feelings at this level: 2 bullets of the same card.
- `De samenleving / Culturen, leefgewoonten en levensbeschouwingen`: Outside the four subjects (society and civics): 3 bullets of the card are not recorded.
- `De ruimte om je heen / Bouw en processen van de aarde`: Outside the four subjects (geography): 3 bullets of the card are not recorded.
- `De ruimte om je heen / Inrichting en indeling van de ruimte`: Outside the four subjects (geography): bullets 1 and 2 of the card are not recorded. Bullets 3 and 4 are about the influence of people on their natural surroundings and the care for the environment, not about geography; they are the card's form of the two fase 1 goals of the cluster "Omgaan met het milieu" (ojw/rojh/6). They are recorded in practical life and feelings at this level.
- `De ruimte om je heen / Landbouw, industrie en logistiek`: Outside the four subjects (geography): 6 bullets of the card are not recorded.
- `De ruimte om je heen / Kaart en kaartbeeld`: Outside the four subjects (geography): 2 bullets of the card are not recorded.
- `Planten, dieren en de mens / Gezondheid en hygiëne`: Recorded in practical life and feelings at this level: 4 bullets of the same card.
- `Tijd / Besef van tijd`: Outside the four subjects (history): 4 bullets of the card are not recorded.
- `Tijd / Historisch tijdsbesef`: Outside the four subjects (history): 5 bullets of the card are not recorded.

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

## Official text for the lane as a whole

The sources print text that holds for a whole column, cluster or card of this lane and for no single statement. No record carries it. 4 such texts are quoted here, in Dutch, as a script read them in the pinned source (`node education/tools/frame-texts.ts`; `manifest/nl-additions.ts` says where each is), each with its source record and its place there. In a quote, a line at the margin is a label or a heading of the source, and the lines set in under it are what the source prints in that row.

**The note on underlined terms** (`nl-slo-inhoudslijn-ojw-natuurkunde-techniek`, page 3). The PDFs of this area underline terms in their goals and close with this note, which says what the underlining refers to. The document it names, the "Uitwerking kennisonderwerpen" of the institute, is not a source of the pack: no record and no frame holds what it says about a term. The goals that hold an underlined term are listed in this section, PDF by PDF. Quoted from the PDF of the line Verschijnselen uit natuurkunde en techniek; the PDFs of De ruimte om je heen and of Planten, dieren en de mens, the other two this lane is checked against, print the same note.

```text
NB De onderstreepte begrippen verwijzen naar: Uitwerking kennisonderwerpen bij de inhoudslijnen van Oriëntatie op jezelf en de wereld (Pdf: SLO 04-2018).
```

**Goals that hold an underlined term** (`nl-slo-inhoudslijn-ojw-ruimte`, column fase 1). The PDF underlines terms in its goals; its note, quoted in this section, says what the underlining refers to. Neither the open data nor a record marks an underlined term. Goals of this lane that this PDF prints: 4. With an underlined term: 3, listed here, each by the code the data gives it (a statement the data lacks by its name in the manifest), then the term or terms as underlined, in the order of the page. Read by script from the rules the PDF draws under its words. "(in part)" after a word says the rule runs under part of that word only; the word is given whole, since the box of a word does not tell which letters the rule covers.

```text
ojw/rojh/2/01/fase1: heelal
ojw/rojh/7/01/fase1: weersverschijnselen (in part)
ojw/rojh/7/02/fase1: weer
```

**Goals that hold an underlined term** (`nl-slo-inhoudslijn-ojw-planten-dieren-mens`, column fase 1). The PDF underlines terms in its goals; its note, quoted in this section, says what the underlining refers to. Neither the open data nor a record marks an underlined term. Goals of this lane that this PDF prints: 20. With an underlined term: 16, listed here, each by the code the data gives it (a statement the data lacks by its name in the manifest), then the term or terms as underlined, in the order of the page. Read by script from the rules the PDF draws under its words. "(in part)" after a word says the rule runs under part of that word only; the word is given whole, since the box of a word does not tell which letters the rule covers.

```text
ojw/pdm/1/01/fase1: mens
ojw/pdm/1/03/fase1: vorm en functie; mens
ojw/pdm/1/04/fase1: mensen
ojw/pdm/1/05/fase1: mens
ojw/pdm/3/01/fase1: planten; dieren; mens
ojw/pdm/3/03/fase1: groei; ontwikkeling; voortplanting; planten; dieren; mens
ojw/pdm/3/05/fase1: dieren
ojw/pdm/3/06/fase1: mensen
ojw/pdm/4/01/fase1: planten; dieren
ojw/pdm/4/02/fase1: planten; dieren
ojw/pdm/4/04/fase1: planten
ojw/pdm/4/05/fase1: planten; dieren
ojw/pdm/5/01/fase1: plant; dier
ojw/pdm/5/02/fase1: planten; dieren
ojw/pdm/5/03/fase1: planten; dieren
ojw/pdm/5/04/fase1: planten; dieren
```

**Goals that hold an underlined term** (`nl-slo-inhoudslijn-ojw-natuurkunde-techniek`, column fase 1). The PDF underlines terms in its goals; its note, quoted in this section, says what the underlining refers to. Neither the open data nor a record marks an underlined term. Goals of this lane that this PDF prints: 10. With an underlined term: 5, listed here, each by the code the data gives it (a statement the data lacks by its name in the manifest), then the term or terms as underlined, in the order of the page. Read by script from the rules the PDF draws under its words. "(in part)" after a word says the rule runs under part of that word only; the word is given whole, since the box of a word does not tell which letters the rule covers.

```text
ojw/nattech/1/03/fase1: ontwerp
ojw/nattech/2/02/fase1: licht
ojw/nattech/3/01/fase1: constructies
ojw/nattech/3/02/fase1: verbindingen
ojw/nattech/3/03/fase1: overbrengings (in part)
```

## Extraction corrections

The lane's locator corrects the extracted text in 2 places. The second check verifies each against the page.

- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1 / Planten, dieren en de mens, De mens / 4**: line-break hyphen
- **Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1 / Verschijnselen uit natuurkunde en techniek, Technische principes en systemen / 1**: line-break hyphen
