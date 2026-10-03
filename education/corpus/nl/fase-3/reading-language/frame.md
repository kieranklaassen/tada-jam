---
id: edu.nl.fase-3.reading-language.frame.lane
kind: frame
title: "Fase 3 reading and language"
jurisdiction: nl
level: fase-3
subject: reading-language
sources:
  - edu.nl.source.nl-slo-curriculum-inhoudslijnen
  - edu.nl.source.nl-slo-inhoudslijn-ne-mondeling
  - edu.nl.source.nl-slo-curriculum-basis
  - edu.nl.source.nl-slo-inhoudslijn-ne-lezen
  - edu.nl.source.nl-slo-inhoudslijn-ne-schrijven
  - edu.nl.source.nl-slo-inhoudslijn-ne-taalbeschouwing
  - edu.nl.source.nl-slo-inhoudslijn-ne-kerndoelen-overzicht
expected_count: 107
counting_method: "Walked the open data from inh.vakleergebieden.json through inh.inhoudslijnen.json and inh.clusters.json (and inh.subclusters.json for Nederlands), collected every goal-at-level id on those objects, resolved each in doelniveaus.json of curriculum-basis, and kept those linked to the level titled \"fase 3\". Per inhoudslijn: Mondelinge taalvaardigheid 52, Lezen 29, Schrijven 13, Taalbeschouwing 3. The PDF of the line Schrijven prints 10 goals in its fase 3 column in the row \"inhoud/vorm\" (page 2), counted by their dashes on the page and in the text read by script; the open data has none of them, and they are records read from the PDF."
check_renditions:
  - edu.nl.source.nl-slo-inhoudslijn-ne-mondeling
  - edu.nl.source.nl-slo-inhoudslijn-ne-lezen
  - edu.nl.source.nl-slo-inhoudslijn-ne-schrijven
  - edu.nl.source.nl-slo-inhoudslijn-ne-taalbeschouwing
check_strength: mixed
nothing_published: false
status: draft
---

## What this lane covers

107 records, under 16 official domains:

- **Nederlands / Mondelinge taalvaardigheid / Gesprekken voeren (NE/MT/01)**: 16
- **Nederlands / Mondelinge taalvaardigheid / Luisteren (NE/MT/02)**: 18
- **Nederlands / Mondelinge taalvaardigheid / Spreken (NE/MT/03)**: 18
- **Nederlands / Lezen / Leesplezier/leesmotivatie (NE/LE/01)**: 5
- **Nederlands / Lezen / Oriëntatie op en lezen van zakelijke teksten (NE/LE/02)**: 1
- **Nederlands / Lezen / Zakelijke teksten: kenmerken van de taakuitvoering (NE/LE/03)**: 8
- **Nederlands / Lezen / Zakelijke teksten: studievaardigheden (NE/LE/04)**: 2
- **Nederlands / Lezen / Zakelijke teksten: aanpak (NE/LE/05)**: 3
- **Nederlands / Lezen / Oriëntatie op en lezen van fictie (NE/LE/06)**: 1
- **Nederlands / Lezen / Fictie: kenmerken van de taakuitvoering (NE/LE/07)**: 8
- **Nederlands / Lezen / Technisch lezen (NE/LE/09)**: 1
- **Nederlands / Schrijven / Kenmerken van de taakuitvoering schrijven (NE/SCH/02)**: 13
- **Nederlands / Taalbeschouwing / Taalbeschouwing (NE/TB/01)**: 1
- **Nederlands / Taalbeschouwing / Begrippenlijst (NE/TB/02)**: 1
- **Nederlands / Taalbeschouwing / Taalverzorging (NE/TB/03)**: 1
- **Inhoudslijn Schrijven, PDF / Schrijven: kenmerken van de taakuitvoering / inhoud/vorm**: 10

Guidance of the curriculum institute: the goals say what a school can offer in a band, not what a child must know. They were written for the 2006 core goals. Fase 3 is groep 7 and 8. One more PDF prints the goals of all four lines with the 2006 core goals each serves; it is read for the frame only. The PDF of the Taalbeschouwing line also prints lists of terms and of spelling categories per pair of groepen, which are not in the data and are no records: the frame quotes the columns of the groepen of this fase below. The open data lacks one row of the line Schrijven: under "Schrijven: kenmerken van de taakuitvoering" the PDF prints seven rows of goals and the data has six sub-clusters, with nothing of the row "inhoud/vorm" (what a text holds and how it is built: its length, its sentences, its structure, its words). The goals of that row are records of this lane, read from the PDF by locator. The PDF prints no code for them and none is made up: their code is empty, and each is named by its place in the row. The data gives the code NE/LE/07/03/01/fase3 to two goals: one links to fase 3 and is a record of this lane, the other links to fase 1 and is a record of fase 1. A lookup by that code returns both.

## What one record is

One record is one goal at one fase (a goal-at-level object, doelniveau). Its wording is the title of the goal it lists, and its code is its own prefix, for example rw/gb/1/01/fase1: line, cluster, number, fase, with one more segment for a sub-cluster in Nederlands. These are codes of the data: the PDFs print none. A code does not identify a record, so the record id is built on the id of the goal-at-level object, and a lookup by code returns every match.

## Parts and how each is checked

- **Inhoudslijn Mondelinge taalvaardigheid, fase 3**: 52 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ne-mondeling`, a second rendition. The slo.nl PDF of this inhoudslijn (4 pages), read by column: the column headed fase 3, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Lezen, fase 3**: 29 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ne-lezen`, a second rendition. The slo.nl PDF of this inhoudslijn (4 pages), read by column: the column headed fase 3, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Schrijven, fase 3**: 13 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ne-schrijven`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 3, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Taalbeschouwing, fase 3**: 3 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ne-taalbeschouwing`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 3, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Schrijven, fase 3: the row "inhoud/vorm" of the PDF, which the open data lacks**: 10 records, read from `edu.nl.source.nl-slo-inhoudslijn-ne-schrijven`. Checked by a second reading of the same file. The open data, which is the canonical rendition of the other per-band goals, lacks these goals, so this PDF is their only rendition.

The expected count was counted in the file the records are read from, which is the only index. Such a count cannot show a statement that file lacks; the second check, which lists what the check rendition holds and no record carries, is what can.

## Statements skipped

None.

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

The sources print text that holds for a whole column, cluster or card of this lane and for no single statement. No record carries it. 11 such texts are quoted here, in Dutch, as a script read them in the pinned source (`node education/tools/frame-texts.ts`; `manifest/nl-additions.ts` says where each is), each with its source record and its place there. In a quote, a line at the margin is a label or a heading of the source, and the lines set in under it are what the source prints in that row.

**What the texts are like that a child listens to, fase 3** (`nl-slo-inhoudslijn-ne-mondeling`, page 2, column fase 3). The PDF of the line Mondelinge taalvaardigheid prints this under the heading "tekstkenmerken", over the goals of the cluster Luisteren: the kinds of text, how long they are, and how they are built. It is no goal and the open data has none of it. Each item stands after the label of its row.

```text
tekstsoorten:
  ▪ informatieve, verhalende, instructieve en betogende teksten
tekstlengte:
  ▪ informatieve teksten: 10 tot 15 minuten
  ▪ verhalende teksten: tot 20 minuten
tekststructuur:
  ▪ teksten hebben zowel herkenbare als complexere structuren, bijvoorbeeld redengevende tekststructuren en probleemoplossingsrelaties
  ▪ samengestelde zinnen komen vaak voor
```

**What the informative texts are like that a child reads, fase 3** (`nl-slo-inhoudslijn-ne-lezen`, page 1, column fase 3). The PDF of the line Lezen prints this under the heading "teksten en tekstkenmerken", after the goals of the cluster "Oriëntatie op en lezen van zakelijke teksten": the subjects, the density, the structure and the style of the texts of this fase. It is no goal and the open data has none of it. Each item stands after the label of its row.

```text
zakelijke teksten
  zakelijke teksten (informatieve, instructieve en betogende teksten) hebben in deze fase één of meer van de volgende kenmerken:
onderwerpen:
  ▪ onderwerpen uit eigen leefwereld en abstractere onderwerpen, niet altijd context gebonden en betrekking hebbend op verleden en toekomst
informatiedichtheid:
  ▪ tekst met meerdere eenvoudige, in alinea's beschreven inhoudselementen en minder voorbeelden en parafrases
structuur:
  ▪ tekst met opsommingsstructuur met beschrijving en vergelijking van mening met argumenten
  ▪ verwijzingen staan niet altijd dichtbij en zijn niet altijd eenduidig of concreet
stijl:
  ▪ korte en langere enkelvoudige en samengestelde zinnen met bijzinnen en concrete en abstractere begrippen in bekende en minder bekende context van het onderwerp
```

**What the fiction is like that a child reads, fase 3** (`nl-slo-inhoudslijn-ne-lezen`, page 3, column fase 3). The PDF of the line Lezen prints this under the heading "teksten en tekstkenmerken", after the goals of the cluster "Oriëntatie op en lezen van fictie": the subjects and the structure of the stories and poems of this fase. It is no goal and the open data has none of it. Each item stands after the label of its row.

```text
fictie
  fictie teksten (verhalende teksten, jeugdliteratuur en poëzie) hebben in deze fase één of meer van de volgende kenmerken:
onderwerpen:
  ▪ concrete, minder concrete en abstractere onderwerpen die niet direct gerelateerd zijn aan de eigen leefwereld en die betrekking hebben op verleden en toekomst
structuur:
  ▪ teksten met een eenvoudige structuur, waarin het tempo hoog is en spannende of dramatische gebeurtenissen elkaar snel opvolgen
  ▪ teksten met wisselende vertelperspectieven die duidelijk aangegeven zijn
```

**Terms about language offered from groep 7-8** (`nl-slo-inhoudslijn-ne-taalbeschouwing`, pages 1, 2, column groep 7-8). The PDF of the line Taalbeschouwing prints a table of terms by pair of groepen, not by fase, and says a term is offered from the pair it stands under. This is the column groep 7-8, row by row after the label of each row, with the lines of the page as printed. A row the column leaves empty is left out.

```text
leestekens:
  puntkomma, apostrof,
  koppelteken, afbreekstreepje,
  spatie, trema, accent
woordsoorten:
  bijvoeglijk naamwoord
  (stoffelijk afgeleid van
  deelwoord), voornaamwoord
grammaticale kennis:
  lijdend voorwerp,
  (werkwoordelijk) gezegde,
  lijdende vorm, bedrijvende
  vorm
tekstkennis:
  aanduiding voor
  tekstsoort/genre:
  ▪ fictie: verhaal, poëzie
  ▪ zakelijk: informatief,
    instructief, betogend
  debat, monoloog, dialoog
  metatalige vorm: woord, zin of
  tekstfragment dat informatie
  geeft over de rest van de tekst
  (zoals een prospectief en
  retrospectief tekstelement in
  inleiding, samenvattende zin
  aan slot)
  hoofdgedachte van tekst,
  tekstthema, paragraaf, zender,
  ontvanger, illustratie
stijl en betekenis:
  afkorting, symbool, synoniem,
  context, moedertaal, tweede
  taal, vreemde taal,
  standaardtaal, dialect,
  meertalig, formeel taalgebruik,
  informeel taalgebruik,
  leenwoord, homoniem,
  vaktaal/jargon
woordvorming:
  trappen van vergelijking
  (stellende, vergrotende,
  overtreffende trap), voltooide
  tijd, onvoltooide tijd, voltooid
  deelwoord, bijvoeglijk gebruik
  van onvoltooid en voltooid
  deelwoord
klanken:
  klemtoon, intonatie
taal en communicatie:
  publiekgerichtheid,
  doelgerichtheid, mimiek,
  spreektempo, spreekpauze,
  volume, communicatie
```

**Spelling categories and rules offered from groep 7-8** (`nl-slo-inhoudslijn-ne-taalbeschouwing`, pages 2, 3, column groep 7-8). The PDF of the line Taalbeschouwing prints a table of spelling categories and rules by pair of groepen, and says each is offered from the pair it stands under and mastered almost without thought two pairs later. This is the column groep 7-8, row by row after the label of each row, with the lines of the page as printed; the column groep 1-2 of this table is empty. An item between underscores is set in italics in the PDF, which the note under the heading of the table classes at reference level 2F ("items cursief zijn ingedeeld op 2F; items vet zijn ingedeeld op 3F"). The same note classes items in bold at 3F: the text layer does not tell bold from light, so the quote cannot mark them. On the page 6 items of this column are bold: "trema (ruïne, skiën, poriën, knieën, zeeën), koppelteken (zonne-energie)"; "tussenklank -s of -e(n) (stadsdeel)"; "aaneenschrijven of los schrijven (kleinkind/klein kind, tenslotte/ ten slotte)"; "persoonsvorm: tegenwoordige tijd 2e/3e persoon achter persoonsvorm (word je, wordt je broer);"; "met prefix homofoon met voltooid deelwoord (beoordeelt/beoordeeld)"; "voltooid deelwoord, homofone gevallen (verhuist, verhuisd)".

```text
orthografische spelling: gebaseerd op afspraken over de schrijfwijze van (groepen) woorden
  uitgang -iaal, -ieel, -eaal, -ueel
  (liniaal, officieel, ideaal, ritueel),
  afbreekregels,
  trema (ruïne, skiën, poriën,
  knieën, zeeën), koppelteken
  (zonne-energie)
lexicaal-morfologische spelling: op basis van de opbouw van het woord, los van de grammaticale context
  eindigend op -b (web)
  uitgang -isch(e) (historisch)
  _verkleinwoord na open_
  _lettergreep op -a, -e, -o, -u_
  _(laatje, autootje, parapluutje)_
  meervoud heid-heden
  (eenheden)
  meervoud op -a (musea)
  meervoud op -i (critici)
  assimilatieverschijnselen (afval,
  zakdoek)
  bijvoeglijk gebruikt voltooid
  deelwoord (gebroken,
  verlichte)
  _stoffelijk bijvoeglijk naamwoord_
  _(ijzeren)_
  _tussenletter -n- in_
  _samengestelde woorden_
  _(zonnebloem, bessensap)_
  tussenklank -s of -e(n)
  (stadsdeel)
  aaneenschrijven of los schrijven
  (kleinkind/klein kind, tenslotte/
  ten slotte)
morfologische spelling op grammaticale basis: op basis van de opbouw van het woord binnen de grammaticale context
  persoonsvorm: tegenwoordige
  tijd 2e/3e persoon achter
  persoonsvorm (word je, wordt
  je broer);
  met prefix homofoon met
  voltooid deelwoord
  (beoordeelt/beoordeeld)
  voltooid deelwoord, excl.
  homofone gevallen (gekookt,
  gemeld, geworden)
  voltooid deelwoord, homofone
  gevallen (verhuist, verhuisd)
  regel voor overeenkomst in
  getal (referent-verwijswoord)
  regel voor overeenkomst in
  geslacht (referent-verwijswoord)
  _meervouds- -n bij zelfstandig_
  _gebruikte verwijzing (alle/allen)_
logografische spelling: gebaseerd op vaststaande combinaties, zonder regelvorming (woorden met…)
  /t/ geschreven als th (thee)
  /sj/ geschreven als -ch-
  (chocola, douche)
  /ks/ geschreven als -x- (taxi)
  /oe/ geschreven als -ou- (route)
  (-)y(-) (yoghurt, pony)
  Franse leenwoorden (trottoir,
  cadeau, militair)
  Engelse leenwoorden (cake,
  manager, laptop)
  afkortingen van woorden (tv,
  cd, bv.)
interpunctie en het gebruik van hoofdletters
  _hoofdletter bij directe rede_,
  puntkomma, afbreekstreepje,
  spatie
```

**Why the terms and the spelling are listed by pair of groepen** (`nl-slo-inhoudslijn-ne-taalbeschouwing`, page 3). The note the PDF of the line Taalbeschouwing prints under its two tables.

```text
* Bij de begrippenlijst en taalverzorging (spellingscategorieën en -regels) is afgeweken van de fase-indeling zoals die bij de andere inhoudslijnen voor Nederlands en de overige leergebieden is gehanteerd. Om aan te sluiten op het referentiekader taal is gekozen voor een indeling in groep 1-2, groep 3-4, groep 5-6 en groep 7-8.
```

**Which groepen a fase is** (`nl-slo-inhoudslijn-ne-mondeling`, page 4). The note on the last page of the PDF of the line Mondelinge taalvaardigheid; the PDFs of Lezen and Schrijven print the same note. The PDFs of the other two areas print none.

```text
* Bij de uitwerking van deze inhoudslijn voor Nederlands is uitgegaan van de volgende indeling: fase 1 is groep 1, 2 en 3; fase 2 is groep 4, 5 en 6; fase 3 is groep 7 en 8.
```

**Cluster headings as the PDF prints them** (`nl-slo-inhoudslijn-ne-mondeling`, pages 1, 2, 3). Listed where the PDF heads a cluster of this lane otherwise than the open data titles it, or prints a sentence under the heading across the three columns. The records carry the title of the data, in their code scope; what the PDF adds, such as "(vanaf groep 3)", holds for every goal of the cluster.

```text
Gesprekken voeren  [NE/MT/01]
  In gesprekken over alledaagse en niet-alledaagse onderwerpen uit de leefwereld van het kind en de wereld eromheen uiting geven aan persoonlijke meningen en gevoelens, informatie uitwisselen, en deelnemen aan discussie en overleg
Luisteren  [NE/MT/02]
  Luisteren naar teksten over alledaagse onderwerpen, onderwerpen die aansluiten bij de leefwereld van de leerling en die verder van de leerling afstaan
Spreken  [NE/MT/03]
  Een beschrijving geven, verslag uitbrengen, informatie, uitleg en instructie geven in alledaagse situaties in en buiten school
```

**Cluster headings as the PDF prints them** (`nl-slo-inhoudslijn-ne-lezen`, pages 1, 2, 3, 4). Listed where the PDF heads a cluster of this lane otherwise than the open data titles it, or prints a sentence under the heading across the three columns. The records carry the title of the data, in their code scope; what the PDF adds, such as "(vanaf groep 3)", holds for every goal of the cluster.

```text
Zakelijke teksten: studievaardigheden (vanaf groep 3)  [the open data titles this cluster "Zakelijke teksten: studievaardigheden", NE/LE/04]
Zakelijke teksten: aanpak (vanaf groep 3)  [the open data titles this cluster "Zakelijke teksten: aanpak", NE/LE/05]
Technisch lezen (vanaf groep 3)  [the open data titles this cluster "Technisch lezen", NE/LE/09]
```

**Cluster headings as the PDF prints them** (`nl-slo-inhoudslijn-ne-schrijven`, page 1). Listed where the PDF heads a cluster of this lane otherwise than the open data titles it, or prints a sentence under the heading across the three columns. The records carry the title of the data, in their code scope; what the PDF adds, such as "(vanaf groep 3)", holds for every goal of the cluster.

```text
Schrijven: kenmerken van de taakuitvoering  [the open data titles this cluster "Kenmerken van de taakuitvoering schrijven", NE/SCH/02]
  Samenhangende teksten schrijven met een eenvoudige lineaire opbouw, over uiteenlopende (meestal vertrouwde) onderwerpen binnen school en de wereld om ons heen.
```

**Cluster headings as the PDF prints them** (`nl-slo-inhoudslijn-ne-taalbeschouwing`, pages 1, 2). Listed where the PDF heads a cluster of this lane otherwise than the open data titles it, or prints a sentence under the heading across the three columns. The records carry the title of the data, in their code scope; what the PDF adds, such as "(vanaf groep 3)", holds for every goal of the cluster.

```text
Taalbeschouwing  [NE/TB/01]
  Onderstaande begrippen zijn van belang om te reflecteren op taal en taalgebruik in gesprekken met kinderen
Begrippenlijst*  [the open data titles this cluster "Begrippenlijst", NE/TB/02]
  Begrippen worden vanaf het genoemde niveau aangeboden
Taalverzorging*  [the open data titles this cluster "Taalverzorging", NE/TB/03]
  spellingcategorieën en -regels worden vanaf het genoemde niveau aangeboden en twee niveaus hoger vrijwel automatisch beheerst. NB In relatie tot het Referentiekader Taal: items cursief zijn ingedeeld op 2F; items vet zijn ingedeeld op 3F.
```

## Corrections to the open data

The open data misfiles 1 goal that concerns this lane, and the importer corrects each by the id of its goal-at-level object, as `manifest/nl-additions.ts` lists them. A corrected record keeps the code the data gives it, also where that code names another cluster or fase, and its locator says where the data lists it. The second check verifies each correction against the content-line PDF.

**Not a record of this lane: filed at fase 2** (1 goal). The open data links this goal to fase 3. The content-line PDF prints it in the fase 2 column (page 4), and its goal number in the data, RW.2.042, is a fase 2 number.

- `rw/bew/3/12/fase3` (541b0414-2bb9-4945-983e-0d5dbad319c5), a record of fase-2/mathematics
