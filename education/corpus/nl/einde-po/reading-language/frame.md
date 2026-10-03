---
id: edu.nl.einde-po.reading-language.frame.lane
kind: frame
title: "End of primary school reading and language"
jurisdiction: nl
level: einde-po
subject: reading-language
sources:
  - edu.nl.source.nl-wet-kerndoelen-po-2026
  - edu.nl.source.nl-slo-curriculum-fo
  - edu.nl.source.nl-slo-curriculum-basis
  - edu.nl.source.nl-wet-kerndoelen-po-2006-v2012
  - edu.nl.source.nl-slo-curriculum-kerndoelen
  - edu.nl.source.nl-wet-referentieniveaus-besluit
  - edu.nl.source.nl-slo-curriculum-referentiekader
  - edu.nl.source.nl-slo-kerndoelen-po-bundel
expected_count: 312
counting_method: "Core goals of 2026: parsed Onderdeel A of annex 1 in the legal XML, one table per goal, and counted the goal sentences, the doelzin rows and the lettered items: 9 goals, 19 doelzinnen and 86 items, 114. The primary-school nodes of the open data count the same. Core goals of 2006: the numbered items 1 to 12 under \"Nederlands\" in the version in force until 31 July 2026: 12, the same as the nodes \"PO Kerndoel 01\" to \"PO Kerndoel 12\" of the open data. Reference levels, sections 1.1 to 3: parsed the 15 level tables of annex 1 and counted the non-empty paragraphs in each level column, 75 at 1F and 81 at 2F, less the one paragraph of each column that holds only a joining sign (\"+\", in 1.3 Spreken): 74 records at 1F and 80 at 2F. Section 4: the non-empty cells of table 1 (8 at 1F, 4 at 2F) and the rows of table 2 marked \"+\" (9 at 1F, 11 at 2F). The decree is the only index of its own statements: the open data cuts them differently and lacks some, so for the reference levels the count is from the file the importer reads, and the reverse pass of the second check is what finds a statement the importer missed."
check_renditions:
  - edu.nl.source.nl-slo-curriculum-fo
  - edu.nl.source.nl-slo-curriculum-kerndoelen
  - edu.nl.source.nl-slo-curriculum-referentiekader
check_strength: mixed
nothing_published: false
status: draft
---

## What this lane covers

312 records, under 28 official domains:

- **Kerndoelen 2026 / Onderdeel A Nederlands / Domein: overkoepelend / Kerndoel 1**: 13
- **Kerndoelen 2026 / Onderdeel A Nederlands / Domein: communicatie / Kerndoel 2**: 18
- **Kerndoelen 2026 / Onderdeel A Nederlands / Domein: communicatie / Kerndoel 3**: 18
- **Kerndoelen 2026 / Onderdeel A Nederlands / Domein: communicatie / Kerndoel 4**: 13
- **Kerndoelen 2026 / Onderdeel A Nederlands / Domein: communicatie / Kerndoel 5**: 6
- **Kerndoelen 2026 / Onderdeel A Nederlands / Domein: taal / Kerndoel 6**: 13
- **Kerndoelen 2026 / Onderdeel A Nederlands / Domein: taal / Kerndoel 7**: 12
- **Kerndoelen 2026 / Onderdeel A Nederlands / Domein: literatuur / Kerndoel 8**: 11
- **Kerndoelen 2026 / Onderdeel A Nederlands / Domein: literatuur / Kerndoel 9**: 10
- **Kerndoelen 2006 / Nederlands / Mondeling taalonderwijs**: 3
- **Kerndoelen 2006 / Nederlands / Schriftelijk taalonderwijs**: 6
- **Kerndoelen 2006 / Nederlands / Taalbeschouwing, waaronder strategieën**: 3
- **Referentieniveau 1F Nederlandse taal / 1.1 Gesprekken**: 13
- **Referentieniveau 1F Nederlandse taal / 1.2 Luisteren**: 14
- **Referentieniveau 1F Nederlandse taal / 1.3 Spreken**: 11
- **Referentieniveau 1F Nederlandse taal / 2.1 Zakelijke teksten**: 12
- **Referentieniveau 1F Nederlandse taal / 2.2 Fictionele, narratieve en literaire teksten**: 7
- **Referentieniveau 1F Nederlandse taal / 3 Schrijven**: 17
- **Referentieniveau 1F Nederlandse taal / 4.1 Begrippenlijst**: 8
- **Referentieniveau 1F Nederlandse taal / 4.4 Moeilijkheid**: 9
- **Referentieniveau 2F Nederlandse taal / 1.1 Gesprekken**: 16
- **Referentieniveau 2F Nederlandse taal / 1.2 Luisteren**: 14
- **Referentieniveau 2F Nederlandse taal / 1.3 Spreken**: 10
- **Referentieniveau 2F Nederlandse taal / 2.1 Zakelijke teksten**: 13
- **Referentieniveau 2F Nederlandse taal / 2.2 Fictionele, narratieve en literaire teksten**: 11
- **Referentieniveau 2F Nederlandse taal / 3 Schrijven**: 16
- **Referentieniveau 2F Nederlandse taal / 4.1 Begrippenlijst**: 4
- **Referentieniveau 2F Nederlandse taal / 4.4 Moeilijkheid**: 11

These goals say what a school works towards by the end of groep 8. They are returned for every school age, labelled as end-of-primary goals. For primary school the decree sets language levels 1F and 2F; there is no 1S for language. In table 1 of section 4.1 the decree labels a row "Testkennis". The row lists terms about texts (standpunt, argument, tekstsoort), so the label is read here as the decree's own misprint for "Tekstkennis"; the two records of that row, at 1F and at 2F, carry "Testkennis" in their title, locator and file name, as printed. SLO's bundle of July 2026 prints the core goals of 2026 too (Nederlands on PDF pages 12 to 14, rekenen en wiskunde on 18 to 20). It follows the law, not the open data, and is read for the frame only.

## What one record is

Two standings and two sets of core goals in one lane, so each record takes its standing and its set from its source. Core goals of 2026: three kinds of node, each a record. The goal (printed "Kerndoel N", with its sentence under it), the doelzin (printed with a capital letter, "A.") and the item under "Het gaat hierbij om:" (printed with a small letter, "a."). The numbers start again elsewhere: annexes 2 to 4 of the same decree start again at 1, the 2006 goals have their own 1 to 58, and every goal starts again at A and a. So the code scope names the decree, the annex and the part, and the record id is built on the id of the paired node of the open data. Several goals are addressed to the school ("De school ..."), not to the pupil. Core goals of 2006: one record is one numbered goal. The decree prints the number with a full stop in one list that runs from 1 to 58 across all areas. The numbers are unique in this decree, but the 2026 goals start again at 1, so the code scope names the decree and the area. The record id is built on the id of the paired node of the open data. These goals were struck from the decree on 1 August 2026, and a school may still use them until 1 August 2031 (artikel 6 of the Besluit kerndoelen primair en speciaal onderwijs 2026). They are read from the version of the decree that was in force until 31 July 2026, and every record says so. Reference levels: the decree prints no codes for its statements, so the code is empty and the locator carries the level, the section, the row labels and the position. The code scope names the decree and the annex. The open data has codes of its own (RKT1.1.1-1F, RKR_1.A.1a-1F), which are not printed in the law and are not used. A reference-level record is one paragraph of a level cell in sections 1.1 to 3, and in section 4 one cell of the table of terms or one row of the table of difficulty; where such a cell or row label holds several paragraphs, each is a line of the wording. Four records of 1.3 Spreken are a reference to another section and no statement of their own: at 1F and at 2F the cell of "Woordgebruik en woordenschat" holds only "Zie Gesprekken", and the first record of the cell of "Vloeiendheid, verstaanbaarheid en grammaticale beheersing" reads "Zie Gesprekken +". Each says that the descriptors of that row in 1.1 Gesprekken hold for speaking too, and the "+" that the statements after it in the cell come on top of them. A paragraph that holds only that sign is not a record.

## Parts and how each is checked

- **Besluit kerndoelen primair en speciaal onderwijs 2026, bijlage 1, Onderdeel A Nederlands**: 114 records, read from `edu.nl.source.nl-wet-kerndoelen-po-2026`. Checked against `edu.nl.source.nl-slo-curriculum-fo`, a second rendition. The open data: the primary-school nodes of the set "Kerndoelen Nederlands", SLO's own transcription of the same goals. Same granularity, node for node. Of the 114 wordings 8 differ after normalisation: 4 B c, the goal sentence of 5 (where the law prints "zicht" and the data "zich"), 6 B, 6 B d, 8 B a, 9 A, 9 B and 9 B c. The others are typos or dropped letters in the data. The source record of the open data counts 18 differing wordings for the 2026 goals: these 8 and the 10 of Onderdeel B Rekenen en wiskunde, which are records of end-of-primary mathematics. A difference is written down as "wording differs"; the record follows the law. SLO's bundle of July 2026 is a third rendition and is read for the frame only.
- **Besluit vernieuwde kerndoelen WPO as it read until 31 July 2026, Nederlands (kerndoelen 1 to 12)**: 12 records, read from `edu.nl.source.nl-wet-kerndoelen-po-2006-v2012`. Checked against `edu.nl.source.nl-slo-curriculum-kerndoelen`, a second rendition. The open data: the nodes "PO Kerndoel 01" to "PO Kerndoel 12" named here, one per goal. Same granularity. Of the 12 wordings 3 differ: 10 and 12 in their quote marks only, and 11, where the data stops after the first of its three rules. A difference is written down as "wording differs"; the record follows the law.
- **Besluit referentieniveaus Nederlandse taal en rekenen, bijlage 1, sections 1.1 to 3, niveau 1F**: 74 records, read from `edu.nl.source.nl-wet-referentieniveaus-besluit`. Checked against `edu.nl.source.nl-slo-curriculum-referentiekader`, a second rendition. The open data: the 86 goals of "Referentiekader Taal" at level 1F, with their text in curriculum-basis. Granularity differs: the data cuts the paragraphs of the decree into other pieces. Against 75 paragraphs in the decree, one of them a joining sign that is no record: 45 of the 86 goals equal a paragraph, 35 are part of one, and 6 are not found because of typos in the data. Compare the joined text of a cell, and write down "granularity differs" where the pieces differ. A paragraph the data lacks is read again in the decree.
- **Besluit referentieniveaus Nederlandse taal en rekenen, bijlage 1, section 4 Begrippenlijst en Taalverzorging, niveau 1F**: 17 records, read from `edu.nl.source.nl-wet-referentieniveaus-besluit`. Checked by a second reading of the same file. A second reading of the decree: the open data has nothing of section 4, and the Staatsblad text of the decree was not fetched.
- **Besluit referentieniveaus Nederlandse taal en rekenen, bijlage 1, sections 1.1 to 3, niveau 2F**: 80 records, read from `edu.nl.source.nl-wet-referentieniveaus-besluit`. Checked against `edu.nl.source.nl-slo-curriculum-referentiekader`, a second rendition. The open data: the 103 goals of "Referentiekader Taal" at level 2F, with their text in curriculum-basis. Granularity differs: the data cuts the paragraphs of the decree into other pieces. Against 81 paragraphs in the decree, one of them a joining sign that is no record: 46 of the 103 goals equal a paragraph, 46 are part of one, and 11 are not found. Compare the joined text of a cell, and write down "granularity differs" where the pieces differ. A paragraph the data lacks is read again in the decree.
- **Besluit referentieniveaus Nederlandse taal en rekenen, bijlage 1, section 4 Begrippenlijst en Taalverzorging, niveau 2F**: 15 records, read from `edu.nl.source.nl-wet-referentieniveaus-besluit`. Checked by a second reading of the same file. A second reading of the decree: the open data has nothing of section 4, and the Staatsblad text of the decree was not fetched.

The expected count was counted in the file the records are read from, which is the only index. Such a count cannot show a statement that file lacks; the second check, which lists what the check rendition holds and no record carries, is what can.

## Statements skipped

- `Niveau 3F and Niveau 4F`: Not primary-school levels: artikel 2 of the decree sets 1F and 2F for primary school. The cells of these columns are not recorded.
- `4.1 to 4.3, running lists`: The lists of terms and rules in sections 4.1, 4.2 and 4.3 carry no level. Only the two tables of section 4 do.

## Gaps if an optional source is missing

None.

## Left out at this level

Official material for this level that the pack records in none of its four subjects:

- **Besluit vernieuwde kerndoelen WPO: Engels (kerndoelen 13 to 16)**: Outside the four subjects.
- **Besluit vernieuwde kerndoelen WPO: Friese taal (kerndoelen 17 to 22)**: Outside the four subjects. Struck on 1 August 2026.
- **Besluit vernieuwde kerndoelen WPO: Mens en samenleving, kerndoel 36**: Outside the four subjects (civics).
- **Besluit vernieuwde kerndoelen WPO: Ruimte (kerndoelen 47 to 50)**: Outside the four subjects (geography).
- **Besluit vernieuwde kerndoelen WPO: Tijd (kerndoelen 51 to 53)**: Outside the four subjects (history).
- **Besluit vernieuwde kerndoelen WPO: Kunstzinnige oriëntatie (kerndoelen 54 to 56)**: Outside the four subjects.
- **Besluit vernieuwde kerndoelen WPO: Bewegingsonderwijs (kerndoelen 57 and 58)**: Outside the four subjects.
- **Besluit vernieuwde kerndoelen WPO: the Preambule and the Karakteristiek of each area**: Introductory prose, not goals.
- **Besluit kerndoelen primair en speciaal onderwijs 2026: bijlagen 2, 3 and 4 (functionele kerndoelen)**: Core goals for special education, outside the levels of the pack.
- **Draft core goals: Burgerschap, kerndoel 21 (12 nodes)**: Outside the four subjects (civics).
- **Draft core goals: Digitale geletterdheid, kerndoelen 22 to 24 (55 nodes)**: Outside the four subjects.
- **Draft core goals: Mens en maatschappij, kerndoelen 25 to 27 and doelzinnen 28 B and 28 C (63 nodes)**: Outside the four subjects (society, geography, history, civics).
- **Draft core goals: Moderne vreemde talen: Engels, kerndoelen 33 and 34 (25 nodes)**: Outside the four subjects.
- **Draft core goals: Kunst en cultuur, kerndoelen 35 to 37 (42 nodes)**: Outside the four subjects.
- **Draft core goals: Bewegen en sport, kerndoelen 38 to 40 (38 nodes)**: Outside the four subjects.
- **Friese taal en cultuur; Nederlandse Gebarentaal**: Outside the four subjects.
- **Referentieniveaus: Nederlandse taal 3F and 4F, rekenen 2F and 3F, and bijlage 3 of the decree**: Not primary-school levels: artikelen 2 and 3 of the Besluit referentieniveaus Nederlandse taal en rekenen set 1F and 2F for language and 1F and 1S for arithmetic.
- **Wet op het primair onderwijs, artikel 8, derde lid (the duty to teach citizenship)**: A duty of the school and its board, not a core goal or a reference level.
- **The illustrations "Te denken valt aan" in the open data of the core goals**: Examples by SLO that are in neither the law nor SLO's bundle. Not goals.

## Official text for the lane as a whole

The sources print text that holds for a whole column, cluster or card of this lane and for no single statement. No record carries it. 4 such texts are quoted here, in Dutch, as a script read them in the pinned source (`node education/tools/frame-texts.ts`; `manifest/nl-additions.ts` says where each is), each with its source record and its place there. In a quote, a line at the margin is a label or a heading of the source, and the lines set in under it are what the source prints in that row.

**What the decree prints with its list of terms (section 4.1)** (`nl-wet-referentieniveaus-besluit`, bijlage 1, section 4.1). Section 4.1 Begrippenlijst of annex 1: the two paragraphs that introduce the list of terms, the caption of table 1, and under the table a list of grammatical terms for the spelling of verbs and a rule, which carry no level. The cells of the table are records of this lane, at 1F and at 2F, and are not quoted: the table stands here by its caption. A heading stands at the margin, and a list item after its number.

```text
4.1 Begrippenlijst
  Om te spreken over taal en taalverschijnselen is een beperkt aantal begrippen noodzakelijk. De meeste daarvan zijn aan het einde van het basisonderwijs wel aan de orde geweest (1F).
  Kennis van deze begrippen bevordert het gesprek binnen en buiten het taalonderwijs over taal en taalverschijnselen: het gaat erom dat docenten (en leerlingen) bepaalde verschijnselen kunnen benoemen in contextrijke taalsituaties. Dat wil zeggen dat docenten deze termen moeten kunnen gebruiken in hun onderwijs in de vaardigheidsdomeinen.
  Tabel 1: Niveaubeschrijvingen Begrippen Taal
Grammaticale begrippen voor werkwoordspelling
  1. Werkwoord;
  2. Tijd van het werkwoord (tegenwoordig en verleden, onvoltooid en voltooid);
  3. Getal: meervoud, enkelvoud;
  4. Eerste, tweede en derde persoon;
  5. Persoonsvorm;
  6. Voltooid deelwoord;
  7. Stam van het werkwoord;
  8. Hele werkwoord (infinitief);
  9. Onderwerp;
  10. Zwakke en sterke werkwoorden;
  11. Werkwoordelijk gezegde.
Regels
  Regel voor overeenkomst in getal (onderwerp-persoonsvorm; referent-verwijswoord) en geslacht (referent-verwijswoord).
```

**What the decree says language care is (section 4.2)** (`nl-wet-referentieniveaus-besluit`, bijlage 1, section 4.2). Section 4.2 Taalverzorging of annex 1: two paragraphs, which say that the levels of section 4 mean full mastery and are an end point. They hold for every record of table 2.

```text
4.2 Taalverzorging
  De vereiste kwaliteit van productief taalgebruik (spreken, schrijven) wordt steeds aangeduid bij de kenmerken van de taakuitvoering in die domeinen.
  In dit domein van taalverzorging gaat het alleen om kennis van regels en begrippen die ten dienste staan van correct taalgebruik. Bij de niveaubepaling is steeds uitgegaan van volledige beheersing, dat wil zeggen, vrijwel automatische beheersing en bij uitzondering terugvallend op regelkennis in taalproductie, zoals in de domeinen schrijven en spreken beschreven. Regelkennis en toepassing in oefentaken gaat aan die beheersing vooraf. De niveaus geven een eindpunt aan: het verwerven van de regels tot een vrijwel automatische beheersing vergt veel leertijd. Het geleerde moet voortdurend in onderhoud zijn. Dat kan betekenen dat van tijd tot tijd nieuwe instructie en oefening gegeven moeten worden (opfrissen) en dat er zorgvuldig feedback gegeven dient te worden op schrijf- en spreekproducten door alle bij het onderwijs betrokkenen, docenten Nederlands en docenten van andere vakken.
```

**The categories of spelling and punctuation, without a level (section 4.3)** (`nl-wet-referentieniveaus-besluit`, bijlage 1, section 4.3). Section 4.3 Niveaubeschrijvingen of annex 1: the running lists of the categories of spelling (4.3.1) and of punctuation (4.3.2). They carry no level and are no records; table 2 of section 4.4 says at which level each kind is mastered. A heading stands at the margin, and a list item after its number.

```text
4.3 Niveaubeschrijvingen
4.3.1 Spelling
Categorieën
  Deze paragraaf bevat de categorieën van spellingsproblemen en -regels. De basis voor de spelling is kennis van de beschaafde uitspraak van het Nederlands («klankzuiver»):
  1. Klankzuivere woorden (wil, dier, maat, daar, moet, wesp, kalf etc.): woorden die in een standaard Nederlandse uitspraak geen alternatieve spelling toelaten.
  2. Klankambigue woorden: woorden die indien de klank gevolgd wordt fout gespeld zullen worden. Het gaat om algemene regels en dialectische bijzonderheden. Het zijn fouten die in de ene regio vaker zullen voorkomen dan in een andere:
    bodum (bodem), enugu (enige), flakbij (vlakbij), prijsen (prijzen), prongeluk (per ongeluk), srijf (schrijf), teminste; tuminste, tuminstu (tenminste), trugbetalen (terugbetalen).
  3. Spelambigue woorden zoals mouwen (mauwen), klijn (klein), dagt (dacht), antwoort (antwoord), direkt (direct). Het zijn woorden die op twee manieren gespeld kunnen worden, omdat de klank geen uitsluitsel geeft. Twee lettertekens representeren één klank (au/ou, d/t, ei/ij, ch/g, c/k).
Regels voor lettergreepgrenzen
  4. Regels voor verdubbeling en verenkeling op lettergreepgrenzen: ontsmetting, nummer, verstoppen, liggen, lopen, oversteken, haren.
  5. Afbreekregels (ge-trokken; getrok-ken, get-rokken, getrokk-en), als een samenspel van morfologische en spellingregels.
Regels voor woordgrenzen
  6. Aaneen- en losschrijven van woorden
    (autoweg, kwijtraakte, voor altijd).
Morfologische spelling
  7. Regel van gelijkvormigheid bij assimilatie: zakdoek in plaats van zaddoek.
  8. Meervoudsvorming
    8.1. -s na medeklinker, -a, -o, -u, -y, -e: (a) fuchsia’s, (b) cafés, (c) garages, meisjes
    8.2. -en (a) zonder en (b) met verdubbeling: latten (zelfstandig naamwoord), laten (werkwoord).
  9. Vorming van bijvoeglijk naamwoord
    9.1. -e (bij zelfstandig naamwoord in enkelvoud als meervoud), met mogelijk toepassing van andere regels (verenkeling/verdubbeling op lettergreepgrenzen). Ook bij bijvoeglijke naamwoorden afgeleid van werkwoorden
    9.2. Stoffelijke bijvoeglijke naamwoorden op -en: gouden, zilveren (zowel bij zelfstandig naamwoord in enkelvoud als meervoud).
  10. Vorming van verkleinwoord
    10.1. Basis + diminutief
    10.2. Uitzondering op verenkelings/verdubbelingsregel:
      verkleinwoord na open klinker: chocolaatje, cafeetje, parapluutje.
  11. Schrijfwijze van achtervoegsels (-heid, -lijk).
  12. ’s en -s: ‘s nachts, ’s Nachts (begin van een zin).
  13. Meervouds -n bij zelfstandig en bijvoeglijk gebruikte verwijzingen naar personen/niet personen: alle, vele, weinige, maar ook allen, weinigen, velen etc.
Regels voor de werkwoordspelling
  14. Persoonsvorm
    14.1. tegenwoordige tijd van werkwoorden met stam op -d
      14.1.1. enkelvoud: word(t)
        eerste persoon stellend en vragend (ik word/word ik)
        tweede persoon stellend en vragend (jij wordt/word jij)
        derde persoon enkelvoud stellend en vragend (hij wordt/wordt hij)
        wordt je broer, wordt jou de toegang ontzegd
        derde persoon, enkelvoud stellend en vragend bij werkwoorden met prefix (kans op verwarring met woordbeeld van voltooid deelwoord): hij beoordeelt (niet: beoordeeld)
      14.1.2. meervoud: worden, laten
    14.2. verleden tijd van zwakke werkwoorden met stam op -d of -t: (morfologische regel leidt tot verdubbeling van d/t, hoewel fonetisch niet nodig) antwoordde
    14.3. verleden tijd van sterke werkwoorden met stam op -d of -t
      enkelvoud: werd, liet
      meervoud: werden.
  15. Infinitief
    15.1. «Gewone» werkwoorden met stam op -d of -t: worden, laten
    15.2. Werkwoorden met stam op -d en -t die in de verleden tijd dd/tt krijgen: vergoeden, verplichten (verwisseling woordbeelden)
    15.3. Als 15.2, in bijvoeglijke bepalingen, in een omgeving met verleden tijd («de te verlichten straten waren niet afgesloten»).
  16. Voltooid deelwoord
    16.1. (per prefix), met kans op verwarring met woordbeeld persoonsvorm
      op -d: gebeurd, beoordeeld
      op -d: na een «valse» f (stam op v): geverfd
      op -d, na een «valse» s (stam op z): verhuisd
    16.2. op -den of -ten: geladen, gelaten
      in de omgeving van meervoud (de geladen wagens)
      in de omgeving van enkelvoud (de geladen wagen)
    16.3. op -d of -t, gebruikt als bijvoeglijk naamwoord: geparkeerde, geraakte, beschutte
      in de omgeving van enkelvoud/meervoud: de beschutte tuin/tuinen (bijvoeglijk naamwoord buigt niet met getal mee)
      in de omgeving van tegenwoordige/verleden tijd: hij zag/zij ziet verlichte straten.
Overige regels
  17. Schrijfwijze van tussenklanken -s en -e(n).
  18. Gebruik van trema en koppelteken.
4.3.2 Leestekens
  1. Hoofdletters en punten bij zinsmarkering.
  2. Vraagtekens, uitroeptekens en aanhalingstekens.
  3. Hoofdletters bij eigennaam en directe rede.
  4. Komma’s, dubbele punt.
```

**What the decree says about difficulty, and what mastery means (section 4.4)** (`nl-wet-referentieniveaus-besluit`, bijlage 1, section 4.4). Section 4.4 Moeilijkheid of annex 1: the paragraph and the five classes of spelling problems that come before table 2, and the caption of table 2, which says what mastery means for every row of it. The footnote of the first paragraph follows it on a line of its own, after its number in square brackets; the brackets are not the decree's. The cells of the table are records of this lane, at 1F and at 2F, and are not quoted: the table stands here by its caption. A heading stands at the margin, and a list item after its number.

```text
4.4 Moeilijkheid
  De moeilijkheid van spelling is op twee manieren te ordenen. Er zijn empirische gegevens over wat leerlingen einde BO kunnen (PPON) en toetsgegevens van brugklasleerlingen.[1] Dat levert een overzicht van itemmoeilijkheden op, zoals gepresenteerd in het eerste rapport van de Expertgroep (2008). Spellingsproblemen kunnen ook in grotere klassen worden ondergebracht, zoals Schijf (2009) laat zien. Naast een zekere logische opeenvolging van klassen van problemen, speelt ook de frequentie waarin het te spellen woord verschijnt een rol. De «stomme e» bijvoorbeeld, in «stomme» wordt in het algemeen pas beheerst na groep 4, maar zeer frequente woorden met een stomme «e» worden al in groep 3 goed gespeld. Als ordening voor de spellingsproblemen gebruiken we een indeling in vijf klassen. Deze indeling wordt gebruikt bij het diagnosticeren van spellingvaardigheid.
  [1] G.M. Schijf (2009), Lees- en spellingsvaardigheden van brugklassers, diss. Universiteit van Amsterdam.
  1. Alfabetisch: hier gaat het om het volgen van de beschaafde Nederlandse uitspraak: dezelfde klank heeft dezelfde letter. De basiskennis is de klank-tekenkoppeling, ook voor bijvoorbeeld oe, ui. Allofonen (v/f; z/s afwisseling) kunnen hierbij gerekend worden. Eind groep 3 wordt deze categorie beheerst.
  2. Orthografisch: hier gaat het om autonome regels over de grens van lettergrepen heen: woorden met sch, ng, nk, aai, ooi, oei, ch(t), -eeuw, -ieuw, -uw, -ee, de ë in ie of ieë, medeklinkerverdubbeling, open lettergrepen, kleefletters behoren tot deze categorie.
  3. Morfologisch: alle woorden die gevormd worden door de toevoeging van voor- of achtervoegsels zoals verkleinwoorden (-tje, -pje, -je), meervoudsvorming en achtervoegsels als (-ig, -heid, -teit, -lijk, -aard, -erd, -tie, -iaal/-eaal/-ieel/-ueel, -isch); ook: bijvoeglijk gebruikt voltooid deelwoord. Woorden met ’s als meervoud. Alle woorden die gevormd worden door samenstellingen (assimilatieverschijnselen: voortdurend).
  4. Morfologisch, met gebruikmaking van syntactische kennis: werkwoordsspelling waarin persoon en getal van het onderwerp leidend is voor de spelling (persoonsvorm), de functie van het werkwoord moet worden bepaald (persoonsvorm, infinitief, voltooid deelwoord). Homofonen zijn hier de moeilijkste problemen (verhuisd/verhuist, beleeft/beleefd): kennis van de functie is hier noodzakelijk.
  5. Logografisch: vaststaande combinaties, die als zodanig gekend moeten worden (geen regelvorming): /zj/ geschreven als g (garage), open lettergreep /ie/ geschreven als -i-, woorden op -isch, /sj/ geschreven als -ch-, /oo/ geschreven als -au- of -ou-, /s/ geschreven als -c- voor i, ie en e; /ks/ geschreven als -x-, /oe/ geschreven als -ou-, woorden met -aise, -aire, /sj/ geschreven als -ci-, /ie/ geschreven als -y-, leenwoorden (team, jam, tram). Woorden met een trema, woorden voorafgegaan door ‘s.
  In schema: zie tabel 2 op de volgende pagina
  Tabel 2: Niveaus voor spelling, interpunctie en grammaticale begrippen voor werkwoordsspelling. Beheersing; 75% van alle leerlingen in de leeftijdsgroep/niveaugroep heeft een kans van 80% goed.
```
