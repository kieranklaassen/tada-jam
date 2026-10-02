---
id: edu.nl.fase-2.science.frame.lane
kind: frame
title: "Fase 2 science"
jurisdiction: nl
level: fase-2
subject: science
sources:
  - edu.nl.source.nl-slo-curriculum-inhoudslijnen
  - edu.nl.source.nl-slo-inhoudslijn-ojw-ruimte
  - edu.nl.source.nl-slo-curriculum-basis
  - edu.nl.source.nl-slo-inhoudslijn-ojw-planten-dieren-mens
  - edu.nl.source.nl-slo-inhoudslijn-ojw-natuurkunde-techniek
  - edu.nl.source.nl-slo-inhoudslijn-ojw-boekje
  - edu.nl.source.nl-slo-inhoudslijn-ojw-kerndoelen-overzicht
expected_count: 56
counting_method: "Walked the open data from inh.vakleergebieden.json through inh.inhoudslijnen.json and inh.clusters.json (and inh.subclusters.json for Nederlands), collected every goal-at-level id on those objects, resolved each in doelniveaus.json of curriculum-basis, and kept those linked to the level titled \"fase 2\". Per inhoudslijn: De ruimte om je heen 8, Planten, dieren en de mens 23, Verschijnselen uit natuurkunde en techniek 25."
check_renditions:
  - edu.nl.source.nl-slo-inhoudslijn-ojw-ruimte
  - edu.nl.source.nl-slo-inhoudslijn-ojw-planten-dieren-mens
  - edu.nl.source.nl-slo-inhoudslijn-ojw-natuurkunde-techniek
check_strength: second-rendition
nothing_published: false
status: draft
---

## What this lane covers

56 records, under 9 official domains:

- **Orientatie op jezelf en de wereld / De ruimte om je heen / Heelal en hemellichamen (ojw/rojh/2)**: 3
- **Orientatie op jezelf en de wereld / De ruimte om je heen / Weer en klimaat (ojw/rojh/7)**: 5
- **Orientatie op jezelf en de wereld / Planten, dieren en de mens / De mens (ojw/pdm/1)**: 3
- **Orientatie op jezelf en de wereld / Planten, dieren en de mens / Groei, ontwikkeling (bloei), gedrag en voortplanting (instandhouding) (ojw/pdm/3)**: 11
- **Orientatie op jezelf en de wereld / Planten, dieren en de mens / Omgaan met de natuur (ojw/pdm/4)**: 3
- **Orientatie op jezelf en de wereld / Planten, dieren en de mens / Planten en dieren (ojw/pdm/5)**: 6
- **Orientatie op jezelf en de wereld / Verschijnselen uit natuurkunde en techniek / Materialen, stoffen en voorwerpen (ojw/nattech/1)**: 8
- **Orientatie op jezelf en de wereld / Verschijnselen uit natuurkunde en techniek / Natuurkundige verschijnselen (ojw/nattech/2)**: 8
- **Orientatie op jezelf en de wereld / Verschijnselen uit natuurkunde en techniek / Technische principes en systemen (ojw/nattech/3)**: 9

Guidance of the curriculum institute: the goals say what a school can offer in a band, not what a child must know. They were written for the 2006 core goals. Fase 2 is groep 4, 5 and 6. The goals are for the whole band: nothing says which are for groep 6. Two more PDFs print the same goals and are read for the frame only: the booklet of all the lines of this area, and the overview that names the 2006 core goals each goal serves.

## What one record is

One record is one goal at one fase (a goal-at-level object, doelniveau). Its wording is the title of the goal it lists, and its code is its own prefix, for example rw/gb/1/01/fase1: line, cluster, number, fase, with one more segment for a sub-cluster in Nederlands. These are codes of the data: the PDFs print none. A code does not identify a record, so the record id is built on the id of the goal-at-level object, and a lookup by code returns every match.

## Parts and how each is checked

- **Inhoudslijn De ruimte om je heen, fase 2**: 8 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ojw-ruimte`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Planten, dieren en de mens, fase 2**: 23 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ojw-planten-dieren-mens`, a second rendition. The slo.nl PDF of this inhoudslijn (4 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Verschijnselen uit natuurkunde en techniek, fase 2**: 25 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ojw-natuurkunde-techniek`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.

The expected count was counted in the file the records are read from, which is the only index. Such a count cannot show a statement that file lacks; the second check, which lists what the check rendition holds and no record carries, is what can.

## Statements skipped

- `ojw/rojh/1`: Outside the four subjects (geography): the 3 goals of "Bouw en processen van de aarde" are not recorded.
- `ojw/rojh/3`: Outside the four subjects (geography): the 7 goals of "Inrichting en indeling van de ruimte (landschap)" are not recorded.
- `ojw/rojh/4`: Outside the four subjects (geography): the 8 goals of "Kaart en kaartbeeld" are not recorded.
- `ojw/rojh/5`: Outside the four subjects (geography): the 8 goals of "Landbouw, industrie en logistiek" are not recorded.
- `ojw/rojh/6`: Recorded in practical life and feelings at this level: the 6 goals of "Omgaan met het milieu".
- `ojw/pdm/2`: Recorded in practical life and feelings at this level: the 9 goals of "Gezondheid en hygiëne".

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

The sources print text that holds for a whole column, cluster or card of this lane and for no single statement. No record carries it. 4 such texts are quoted here, in Dutch, as a script read them in the pinned source (`node education/tools/frame-texts.ts`; `manifest/nl-additions.ts` says where each is), each with its source record and its place there. In a quote, a line at the margin is a label or a heading of the source, and the lines set in under it are what the source prints in that row.

**The note on underlined terms** (`nl-slo-inhoudslijn-ojw-natuurkunde-techniek`, page 3). The PDFs of this area underline terms in their goals and close with this note, which says what the underlining refers to. The document it names, the "Uitwerking kennisonderwerpen" of the institute, is not a source of the pack: no record and no frame holds what it says about a term. The goals that hold an underlined term are listed in this section, PDF by PDF. Quoted from the PDF of the line Verschijnselen uit natuurkunde en techniek; the PDFs of De ruimte om je heen and of Planten, dieren en de mens, the other two this lane is checked against, print the same note.

```text
NB De onderstreepte begrippen verwijzen naar: Uitwerking kennisonderwerpen bij de inhoudslijnen van Oriëntatie op jezelf en de wereld (Pdf: SLO 04-2018).
```

**Goals that hold an underlined term** (`nl-slo-inhoudslijn-ojw-ruimte`, column fase 2). The PDF underlines terms in its goals; its note, quoted in this section, says what the underlining refers to. Neither the open data nor a record marks an underlined term. Goals of this lane that this PDF prints: 8. With an underlined term: 5, listed here, each by the code the data gives it (a statement the data lacks by its name in the manifest), then the term or terms as underlined, in the order of the page. Read by script from the rules the PDF draws under its words. "(in part)" after a word says the rule runs under part of that word only; the word is given whole, since the box of a word does not tell which letters the rule covers.

```text
ojw/rojh/2/02/fase2: heelal
ojw/rojh/7/01/fase2: weerbeeld (in part)
ojw/rojh/7/03/fase2: weer
ojw/rojh/7/04/fase2: weer; klimaat
ojw/rojh/7/05/fase2: weer
```

**Goals that hold an underlined term** (`nl-slo-inhoudslijn-ojw-planten-dieren-mens`, column fase 2). The PDF underlines terms in its goals; its note, quoted in this section, says what the underlining refers to. Neither the open data nor a record marks an underlined term. Goals of this lane that this PDF prints: 23. With an underlined term: 19, listed here, each by the code the data gives it (a statement the data lacks by its name in the manifest), then the term or terms as underlined, in the order of the page. Read by script from the rules the PDF draws under its words. "(in part)" after a word says the rule runs under part of that word only; the word is given whole, since the box of a word does not tell which letters the rule covers.

```text
ojw/pdm/1/01/fase2: mens; vorm en functie
ojw/pdm/1/03/fase2: mensen
ojw/pdm/3/05/fase2: groei en ontwikkeling; dieren
ojw/pdm/3/10/fase2: dieren; voortplanten
ojw/pdm/3/11/fase2: voortplanting; mensen
ojw/pdm/3/01/fase2: planten; dieren; mens; groei; ontwikkeling
ojw/pdm/3/02/fase2: planten; dieren
ojw/pdm/3/06/fase2: dieren
ojw/pdm/3/07/fase2: mensen; dieren; planten; groeien en ontwikkelen; voortplanten
ojw/pdm/3/08/fase2: voortplanting
ojw/pdm/3/09/fase2: plant
ojw/pdm/4/01/fase2: planten; dieren
ojw/pdm/4/03/fase2: planten; dieren
ojw/pdm/5/01/fase2: planten; dieren
ojw/pdm/5/02/fase2: planten; dieren
ojw/pdm/5/03/fase2: planten; dieren; levensgemeenschap
ojw/pdm/5/04/fase2: planten; dieren
ojw/pdm/5/05/fase2: planten; dieren
ojw/pdm/5/06/fase2: planten; dieren; technologische ontwikkelingen
```

**Goals that hold an underlined term** (`nl-slo-inhoudslijn-ojw-natuurkunde-techniek`, column fase 2). The PDF underlines terms in its goals; its note, quoted in this section, says what the underlining refers to. Neither the open data nor a record marks an underlined term. Goals of this lane that this PDF prints: 25. With an underlined term: 18, listed here, each by the code the data gives it (a statement the data lacks by its name in the manifest), then the term or terms as underlined, in the order of the page. Read by script from the rules the PDF draws under its words. "(in part)" after a word says the rule runs under part of that word only; the word is given whole, since the box of a word does not tell which letters the rule covers.

```text
ojw/nattech/1/01/fase2: materiaal
ojw/nattech/1/02/fase2: materialen
ojw/nattech/1/03/fase2: stoffen
ojw/nattech/1/04/fase2: materialen
ojw/nattech/1/05/fase2: vorm-functie van producten
ojw/nattech/1/07/fase2: ontwerpen
ojw/nattech/2/01/fase2: licht
ojw/nattech/2/02/fase2: geluid
ojw/nattech/2/03/fase2: temperatuur; warmte
ojw/nattech/2/04/fase2: kracht
ojw/nattech/2/05/fase2: magnetisme
ojw/nattech/2/06/fase2: elektriciteit
ojw/nattech/2/07/fase2: energie; energiebronnen
ojw/nattech/3/01/fase2: constructies
ojw/nattech/3/02/fase2: constructie
ojw/nattech/3/03/fase2: verbindingen
ojw/nattech/3/04/fase2: kracht; overgebracht
ojw/nattech/3/06/fase2: geautomatiseerd systeem
```
