---
id: edu.nl.fase-2.reading-language.frame.lane
kind: frame
title: "Fase 2 reading and language"
jurisdiction: nl
level: fase-2
subject: reading-language
sources:
  - edu.nl.source.nl-slo-curriculum-inhoudslijnen
  - edu.nl.source.nl-slo-inhoudslijn-ne-mondeling
  - edu.nl.source.nl-slo-curriculum-basis
  - edu.nl.source.nl-slo-inhoudslijn-ne-lezen
  - edu.nl.source.nl-slo-inhoudslijn-ne-schrijven
  - edu.nl.source.nl-slo-inhoudslijn-ne-taalbeschouwing
  - edu.nl.source.nl-slo-inhoudslijn-ne-kerndoelen-overzicht
expected_count: 110
counting_method: "Walked the open data from inh.vakleergebieden.json through inh.inhoudslijnen.json and inh.clusters.json (and inh.subclusters.json for Nederlands), collected every goal-at-level id on those objects, resolved each in doelniveaus.json of curriculum-basis, and kept those linked to the level titled \"fase 2\". Per inhoudslijn: Mondelinge taalvaardigheid 56, Lezen 32, Schrijven 13, Taalbeschouwing 3. The PDF of the line Schrijven prints 6 goals in its fase 2 column in the row \"inhoud/vorm\" (page 2), counted by their dashes on the page and in the text read by script; the open data has none of them, and they are records read from the PDF."
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

110 records, under 16 official domains:

- **Nederlands / Mondelinge taalvaardigheid / Gesprekken voeren (NE/MT/01)**: 21
- **Nederlands / Mondelinge taalvaardigheid / Luisteren (NE/MT/02)**: 18
- **Nederlands / Mondelinge taalvaardigheid / Spreken (NE/MT/03)**: 17
- **Nederlands / Lezen / Leesplezier/leesmotivatie (NE/LE/01)**: 4
- **Nederlands / Lezen / Oriëntatie op en lezen van zakelijke teksten (NE/LE/02)**: 1
- **Nederlands / Lezen / Zakelijke teksten: kenmerken van de taakuitvoering (NE/LE/03)**: 6
- **Nederlands / Lezen / Zakelijke teksten: studievaardigheden (NE/LE/04)**: 2
- **Nederlands / Lezen / Zakelijke teksten: aanpak (NE/LE/05)**: 4
- **Nederlands / Lezen / Oriëntatie op en lezen van fictie (NE/LE/06)**: 1
- **Nederlands / Lezen / Fictie: kenmerken van de taakuitvoering (NE/LE/07)**: 7
- **Nederlands / Lezen / Technisch lezen (NE/LE/09)**: 7
- **Nederlands / Schrijven / Kenmerken van de taakuitvoering schrijven (NE/SCH/02)**: 13
- **Nederlands / Taalbeschouwing / Taalbeschouwing (NE/TB/01)**: 1
- **Nederlands / Taalbeschouwing / Begrippenlijst (NE/TB/02)**: 1
- **Nederlands / Taalbeschouwing / Taalverzorging (NE/TB/03)**: 1
- **Inhoudslijn Schrijven, PDF / Schrijven: kenmerken van de taakuitvoering / inhoud/vorm**: 6

Guidance of the curriculum institute: the goals say what a school can offer in a band, not what a child must know. They were written for the 2006 core goals. Fase 2 is groep 4, 5 and 6. The goals are for the whole band: nothing says which are for groep 6. One more PDF prints the goals of all four lines with the 2006 core goals each serves; it is read for the frame only. The PDF of the Taalbeschouwing line also prints lists of terms and of spelling categories per pair of groepen, which are not in the data and are no records: the frame quotes the columns of the groepen of this fase below. The open data lacks one row of the line Schrijven: under "Schrijven: kenmerken van de taakuitvoering" the PDF prints seven rows of goals and the data has six sub-clusters, with nothing of the row "inhoud/vorm" (what a text holds and how it is built: its length, its sentences, its structure, its words). The goals of that row are records of this lane, read from the PDF by locator. The PDF prints no code for them and none is made up: their code is empty, and each is named by its place in the row. The data gives the code NE/LE/07/02/01/fase2 to two goals: one links to fase 2 and is a record of this lane, the other links to fase 1 and is a record of fase 1. A lookup by that code returns both.

## What one record is

One record is one goal at one fase (a goal-at-level object, doelniveau). Its wording is the title of the goal it lists, and its code is its own prefix, for example rw/gb/1/01/fase1: line, cluster, number, fase, with one more segment for a sub-cluster in Nederlands. These are codes of the data: the PDFs print none. A code does not identify a record, so the record id is built on the id of the goal-at-level object, and a lookup by code returns every match.

## Parts and how each is checked

- **Inhoudslijn Mondelinge taalvaardigheid, fase 2**: 56 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ne-mondeling`, a second rendition. The slo.nl PDF of this inhoudslijn (4 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Lezen, fase 2**: 32 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ne-lezen`, a second rendition. The slo.nl PDF of this inhoudslijn (4 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Schrijven, fase 2**: 13 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ne-schrijven`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Taalbeschouwing, fase 2**: 3 records, read from `edu.nl.source.nl-slo-curriculum-inhoudslijnen`. Checked against `edu.nl.source.nl-slo-inhoudslijn-ne-taalbeschouwing`, a second rendition. The slo.nl PDF of this inhoudslijn (3 pages), read by column: the column headed fase 2, under the cluster names in the label column. It prints no codes, so a statement is found by its cluster and its text. Granularity can differ in places. The PDF prints sub-points with ">" where the data has "-". A script that read the fifteen PDFs by column matched 797 of their 1,145 statements exactly and 108 more once the examples in brackets were removed; the others need a reader. A statement found in another fase column than the one its goal links to is a finding to write down.
- **Inhoudslijn Schrijven, fase 2: the row "inhoud/vorm" of the PDF, which the open data lacks**: 6 records, read from `edu.nl.source.nl-slo-inhoudslijn-ne-schrijven`. Checked by a second reading of the same file. The open data, which is the canonical rendition of the other per-band goals, lacks these goals, so this PDF is their only rendition.

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

The sources print text that holds for a whole column, cluster or card of this lane and for no single statement. No record carries it. 13 such texts are quoted here, in Dutch, as a script read them in the pinned source (`node education/tools/frame-texts.ts`; `manifest/nl-additions.ts` says where each is), each with its source record and its place there. In a quote, a line at the margin is a label or a heading of the source, and the lines set in under it are what the source prints in that row.

**What the texts are like that a child listens to, fase 2** (`nl-slo-inhoudslijn-ne-mondeling`, page 2, column fase 2). The PDF of the line Mondelinge taalvaardigheid prints this under the heading "tekstkenmerken", over the goals of the cluster Luisteren: the kinds of text, how long they are, and how they are built. It is no goal and the open data has none of it. Each item stands after the label of its row.

```text
tekstsoorten:
  ▪ informatieve, verhalende, instructieve en betogende teksten
tekstlengte:
  ▪ informatieve teksten: 5 tot 10 minuten
  ▪ verhalende teksten: tot 15 minuten
tekststructuur:
  ▪ teksten hebben ook complexere structuren, bijvoorbeeld vraag-antwoordstructuren, vergelijkingsstructuren en oorzaak-gevolgrelaties
  ▪ zinnen zijn langer; samengestelde zinnen komen ook voor
```

**What the informative texts are like that a child reads, fase 2** (`nl-slo-inhoudslijn-ne-lezen`, page 1, column fase 2). The PDF of the line Lezen prints this under the heading "teksten en tekstkenmerken", after the goals of the cluster "Oriëntatie op en lezen van zakelijke teksten": the subjects, the density, the structure and the style of the texts of this fase. It is no goal and the open data has none of it. Each item stands after the label of its row.

```text
zakelijke teksten
  zakelijke teksten (informatieve, instructieve en betogende teksten) hebben in deze fase één of meer van de volgende kenmerken:
onderwerpen:
  ▪ onderwerpen uit eigen leefwereld die minder concreet zijn, betrekking hebben op omgeving die minder nabij is, op verleden en toekomst (bijv. bij de zaakvakken)
informatiedichtheid:
  ▪ tekst met meerdere eenvoudige inhoudselementen en meerdere voorbeelden en parafrases
structuur:
  ▪ tekst met probleemoplossingsstructuur, vergelijking van twee opvattingen
  ▪ signaalwoorden moeten worden afgeleid
stijl:
  ▪ korte en langere enkelvoudige en samengestelde zinnen met concrete en abstractere begrippen in de context van het onderwerp
```

**What the fiction is like that a child reads, fase 2** (`nl-slo-inhoudslijn-ne-lezen`, page 3, column fase 2). The PDF of the line Lezen prints this under the heading "teksten en tekstkenmerken", after the goals of the cluster "Oriëntatie op en lezen van fictie": the subjects and the structure of the stories and poems of this fase. It is no goal and the open data has none of it. Each item stands after the label of its row.

```text
fictie
  fictie teksten (verhalende teksten, poëzie) hebben in deze fase één of meer van de volgende kenmerken:
onderwerpen:
  ▪ onderwerpen die betrekking hebben op de minder nabije omgeving en die minder concreet zijn. Ze hebben ook betrekking op verleden en toekomst
structuur:
  ▪ teksten met één of soms meerdere verhaallijnen (raamvertelling) en soms zonder lineaire structuur (tekst begint bijv. middenin)
  ▪ teksten met een ik-verteller
```

**Terms about language offered from groep 3-4** (`nl-slo-inhoudslijn-ne-taalbeschouwing`, pages 1, 2, column groep 3-4). The PDF of the line Taalbeschouwing prints a table of terms by pair of groepen, not by fase, and says a term is offered from the pair it stands under. This is the column groep 3-4, row by row after the label of each row, with the lines of the page as printed. A row the column leaves empty is left out. Groep 3-4 is the last year of fase 1 and the first of fase 2, so this column is quoted in the frames of both.

```text
leestekens:
  punt, komma, vraagteken,
  uitroepteken,
  aanhalingstekens, hoofdletter,
  kleine letter, letter, haakjes
woordsoorten:
  zelfstandig naamwoord,
  werkwoord, lidwoord
grammaticale kennis:
  zin
woordvorming:
  lettergreep, enkelvoud,
  meervoud, verkleinwoord
opmaak:
  regel, bladzijde, hoofdstuk, titel
klanken:
  klank (korte klank, lange klank,
  tweetekenklank,
  meertekenklank, klankgroep,
  klinker, medeklinker, uitspraak
taal en communicatie:
  bedoeling, spreker, schrijver,
  lezer, luisteraar
```

**Terms about language offered from groep 5-6** (`nl-slo-inhoudslijn-ne-taalbeschouwing`, pages 1, 2, column groep 5-6). The PDF of the line Taalbeschouwing prints a table of terms by pair of groepen, not by fase, and says a term is offered from the pair it stands under. This is the column groep 5-6, row by row after the label of each row, with the lines of the page as printed. A row the column leaves empty is left out.

```text
leestekens:
  leesteken, dubbele punt
woordsoorten:
  voegwoord, voorzetsel,
  telwoord, bijvoeglijk
  naamwoord
grammaticale kennis:
  onderwerp, persoonsvorm,
  hoofdzin, bijzin, zinsdeel,
  vragende vorm
tekstkennis:
  standpunt, argument, feit,
  mening, tekst, signaalwoord,
  inhoudsopgave, inleiding, kern,
  slot, boodschap, situatie,
  bedoeling, tekstsoort,
  gespreksvorm, aanduiding voor
  gespreksvorm: overleg,
  discussie,
  interview/vraaggesprek,
  voordracht/presentatie
stijl en betekenis:
  betekenis, letterlijk, figuurlijk,
  uitdrukking, spreekwoord,
  gezegde, definitie, spreektaal,
  schrijftaal, tegenstelling,
  picto(gram), logo(gram)
woordvorming:
  hele werkwoord/ infinitief,
  stam van het werkwoord,
  woordvorm, woorddeel,
  samenstelling, voorvoegsel,
  achtervoegsel, woordsoort,
  tegenwoordige tijd, verleden
  tijd, klankvast (zwak)
  werkwoord, klankveranderend
  (sterk) werkwoord, persoon
  (1e, 2e, 3e)
opmaak:
  lettertype, alinea, kopje,
  opmaak, lay-out, cursief, vet
  gedrukt
taal en communicatie:
  boodschap, situatie, publiek,
  doel, gespreksregels,
  beurtwisseling, informatie
```

**Spelling categories and rules offered from groep 3-4** (`nl-slo-inhoudslijn-ne-taalbeschouwing`, pages 2, 3, column groep 3-4). The PDF of the line Taalbeschouwing prints a table of spelling categories and rules by pair of groepen, and says each is offered from the pair it stands under and mastered almost without thought two pairs later. This is the column groep 3-4, row by row after the label of each row, with the lines of the page as printed; the column groep 1-2 of this table is empty. An item between underscores is set in italics in the PDF, which the note under the heading of the table classes at reference level 2F ("items cursief zijn ingedeeld op 2F; items vet zijn ingedeeld op 3F"). The same note classes items in bold at 3F: the text layer does not tell bold from light, so the quote cannot mark them. On the page no item of this column is bold. Groep 3-4 is the last year of fase 1 and the first of fase 2, so this column is quoted in the frames of both.

```text
alfabetische spelling: op basis van een een-op-een-relatie tussen klank en teken
  mkm (kat, doos, boek)
  mmk(m) (klok, trui)
  (m)kmm (als, kaart)
  mmkmm (plant, klomp)
  -mmm (eerst, kunst)
  mmm- (strik, spruit)
  f-, v- (feest, vuur)
  s-, z- (sok, zoen)
  -ng (bang)
  -eer, -oor, -eur (keer, spoor,
  deur)
orthografische spelling: gebaseerd op afspraken over de schrijfwijze van (groepen) woorden
  niet geschreven tussenklank
  (r + medeklinker: verf
  l + medeklinker: melk)
  sch(r)- (school, schrik)
  -nk (bank)
  -aai, -ooi, -oei (saai, mooi, boei)
  -eeuw, -ieuw (leeuw, nieuw)
  -ee (zee, twee)
  -a, -o, -u (papa, foto, nu)
  medeklinkerverdubbeling
  (bruggen, petten)
  klinkerverenkeling (straten,
  bomen)
lexicaal-morfologische spelling: op basis van de opbouw van het woord, los van de grammaticale context
  -d (hond, paard)
  (verlengingsregel
  eenlettergrepige woorden),
  -el, -er, -en, -te (sleutel,
  moeder, molen, breedte),
  ge-, be-, ver-, te-, (genoeg,
  bezoek, verschil, terug),
  ont- (ontdekken),
  meervoudsvorming met -en of
  –s (boeken, sleutels),
  samengestelde woorden
  (tuindeur, schatkist),
  verkleinwoorden met uitgang –
  je, -tje (huisje, boekje,
  schaaltje)
logografische spelling: gebaseerd op vaststaande combinaties, zonder regelvorming (woorden met…)
  -ch(t) (pech, bocht)
  (-)ei(-) of (-)ij(-) (trein, lijst)
  -au-, -auw (saus, blauw)
  -ou-, -ouw (stout, vrouw)
interpunctie en het gebruik van hoofdletters
  hoofdletter aan begin zin,
  punt, vraagteken, uitroepteken
```

**Spelling categories and rules offered from groep 5-6** (`nl-slo-inhoudslijn-ne-taalbeschouwing`, pages 2, 3, column groep 5-6). The PDF of the line Taalbeschouwing prints a table of spelling categories and rules by pair of groepen, and says each is offered from the pair it stands under and mastered almost without thought two pairs later. This is the column groep 5-6, row by row after the label of each row, with the lines of the page as printed; the column groep 1-2 of this table is empty. An item between underscores is set in italics in the PDF, which the note under the heading of the table classes at reference level 2F ("items cursief zijn ingedeeld op 2F; items vet zijn ingedeeld op 3F"). The same note classes items in bold at 3F: the text layer does not tell bold from light, so the quote cannot mark them. On the page 2 items of this column are bold: "komma"; "dubbele punt".

```text
alfabetische spelling: op basis van een een-op-een-relatie tussen klank en teken
  -f-, -v- ongeleed (tafel, oven)
  -s-, -z- ongeleed (fase, pauze)
orthografische spelling: gebaseerd op afspraken over de schrijfwijze van (groepen) woorden
  f/v-wisseling (braaf - brave),
  s/z-wisseling (huis - huizen),
  verkleinwoorden met ng/nk
  wisseling (ketting - kettinkje)
lexicaal-morfologische spelling: op basis van de opbouw van het woord, los van de grammaticale context
  verkleinwoorden met uitgang
  -je na -d en -t (vriendje,
  plantje),
  uitgang -pje, -etje (raampje,
  dingetje, karretje),
  uitgang -em (stiekem),
  uitgang -elen, -enen, -eren
  (wandelen, oefenen, kinderen),
  uitgang -lijk (eerlijk),
  uitgang -ig (veilig),
  uitgang -teit (majesteit),
  uitgang -heid (eenheid),
  _beginnend met ’s (’s ochtends),_
  eindigend op ‘s (komma’s,
  lolly’s),
  vorming bijvoeglijk naamwoord
  (blauwe, grote),
  uitgang -ing (buiging),
  _meervouds- -s na klinker_
  _(meisjes)_
morfologische spelling op grammaticale basis: op basis van de opbouw van het woord binnen de grammaticale context
  hele werkwoord/infinitief
  stam van het werkwoord
  tijd van het werkwoord:
  tegenwoordige tijd, verleden
  tijd
  regel voor overeenkomst in
  getal (onderwerp-persoonsvorm)
  persoonsvorm:
  _tegenwoordige tijd meervoud;_
  _tegenwoordige tijd enkelvoud;_
  _tegenwoordige tijd met stam -d_
  _enkelvoud (word);_
  _verleden tijd (kookte, schreef);_
  _verleden tijd met stam op -d of -_
  _t (brandde(n), startte(n))_
logografische spelling: gebaseerd op vaststaande combinaties, zonder regelvorming (woorden met…)
  /zj/ geschreven als g (horloge,
  gelei)
  /ie/ geschreven als i (liter,
  olifant, januari)
  /s/ geschreven als -c- (narcis,
  precies)
  /k/ geschreven als -c- (contact)
  -tie (politie)
interpunctie en het gebruik van hoofdletters
  _hoofdletter bij eigennaam_,
  komma, dubbele punt,
  aanhalingstekens, haakjes
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
