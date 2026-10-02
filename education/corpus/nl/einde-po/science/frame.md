---
id: edu.nl.einde-po.science.frame.lane
kind: frame
title: "End of primary school science"
jurisdiction: nl
level: einde-po
subject: science
sources:
  - edu.nl.source.nl-wet-kerndoelen-po-2006
  - edu.nl.source.nl-slo-curriculum-kerndoelen
  - edu.nl.source.nl-concept-besluit-kerndoelen-2027
  - edu.nl.source.nl-slo-kerndoelen-po-bundel
  - edu.nl.source.nl-slo-curriculum-fo
  - edu.nl.source.nl-slo-curriculum-basis
expected_count: 77
counting_method: "Core goals of 2006: the numbered items 40 to 46 under the heading \"Natuur en techniek\" in the legal XML: 7, the same as the nodes \"PO Kerndoel 40\" to \"PO Kerndoel 46\" of the open data. Draft core goals: parsed amendment F of the consultation draft and counted, for Onderdeel F. Mens en natuur, 4 goals, 12 doelzinnen and 60 items, 76 nodes; without doelzin 31 B and its 5 items, 70. The open data counts the same 4, 12 and 60, and the bundle prints the same goals. Twice the draft prints an item letter alone on its line (32 B a, 32 C a): a count that misses those two finds 58 items."
check_renditions:
  - edu.nl.source.nl-slo-curriculum-kerndoelen
  - edu.nl.source.nl-slo-kerndoelen-po-bundel
check_strength: second-rendition
nothing_published: false
status: draft
---

## What this lane covers

77 records, under 5 official domains:

- **Kerndoelen 2006 / Oriëntatie op jezelf en de wereld / Natuur en techniek**: 7
- **Conceptkerndoelen 2027 / Onderdeel F. Mens en natuur / Domein: natuurwetenschappen en technologie / Kerndoel 29**: 25
- **Conceptkerndoelen 2027 / Onderdeel F. Mens en natuur / Domein: natuurkundige en scheikundige verschijnselen en technische systemen / Kerndoel 30**: 19
- **Conceptkerndoelen 2027 / Onderdeel F. Mens en natuur / Domein: organismen en gezondheid / Kerndoel 31**: 7
- **Conceptkerndoelen 2027 / Onderdeel F. Mens en natuur / Domein: systeem aarde / Kerndoel 32**: 19

These goals say what a school works towards by the end of groep 8. They are returned for every school age, labelled as end-of-primary goals. No reference levels exist for this subject. The draft withdraws the 2006 decree, so when it enters into force the 2006 goals of this lane end. Five wordings of the draft differ from the open data in the goals recorded here and in practical life and feelings (the sentence of 29, doelzinnen 28 E, 30 C and 32 B, item 32 C d); the record follows the draft decree.

## What one record is

Two standings in one lane, so each record takes its standing and its set from its source: the 2006 goals are law, the others are a draft. Core goals of 2006: one record is one numbered goal. The decree prints the number with a full stop in one list that runs from 1 to 58 across all areas. The numbers are unique in this decree, but the 2026 goals start again at 1, so the code scope names the decree and the area. The record id is built on the id of the paired node of the open data. Draft core goals: the same three kinds of node as the core goals of 2026 (goal, doelzin with a capital letter, item with a small letter), each a record. The draft numbers run on after the 2026 decree, from 19 to 40. Every record is a draft that is not yet in force: the decree is unsigned, and its own last article sets 1 August 2027. Kerndoel 31 is split: its sentence and doelzin A are here, doelzin B (lifestyle, health and illness) is in practical life and feelings.

## Parts and how each is checked

- **Besluit vernieuwde kerndoelen WPO, Oriëntatie op jezelf en de wereld: Natuur en techniek (kerndoelen 40 to 46)**: 7 records, read from `edu.nl.source.nl-wet-kerndoelen-po-2006`. Checked against `edu.nl.source.nl-slo-curriculum-kerndoelen`, a second rendition. The open data: the nodes "PO Kerndoel 40" to "PO Kerndoel 46" named here, one per goal. Same granularity. Of the 7 wordings 1 differs: 46, by a comma. A difference is written down as "wording differs"; the record follows the law.
- **Draft Besluit vernieuwde kerndoelen overige leergebieden, Onderdeel F. Mens en natuur (kerndoelen 29 to 32, without doelzin 31 B)**: 70 records, read from `edu.nl.source.nl-concept-besluit-kerndoelen-2027`. Checked against `edu.nl.source.nl-slo-kerndoelen-po-bundel`, a second rendition. SLO's bundle of July 2026 prints the same goals on PDF pages 39 and 40. A PDF page there is a spread of two printed pages, read by column. It prints a doelzin as its number and letter ("19A") and the items as bullets without letters. Same granularity; an item is found by its doelzin and its position.

The expected count was counted in an index of its own, not in the import: `counting_method` above says where.

## Statements skipped

- `34 to 39`: Mens en samenleving, in the same division of the 2006 decree: 34, 35, 37, 38 and 39 are recorded in practical life and feelings, and 36 is outside the four subjects.
- `47 to 53`: Outside the four subjects: Ruimte (47 to 50, geography) and Tijd (51 to 53, history), in the same division of the 2006 decree.
- `31 B`: Doelzin B of draft kerndoel 31 and its five items are recorded in practical life and feelings.

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

## Extraction corrections

The lane's locator corrects the extracted text in 1 place. The second check verifies each against the page.

- **Conceptkerndoelen 2027 / Onderdeel F. Mens en natuur / Domein: natuurwetenschappen en technologie / Kerndoel 29, 29 B a**: line-break hyphen
