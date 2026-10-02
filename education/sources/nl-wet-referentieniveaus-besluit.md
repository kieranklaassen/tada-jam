---
id: edu.nl.source.nl-wet-referentieniveaus-besluit
kind: source
title: "Besluit referentieniveaus Nederlandse taal en rekenen"
publisher: "Rijksoverheid (Basiswettenbestand, KOOP)"
jurisdiction: nl
url: "https://repository.officiele-overheidspublicaties.nl/bwb/BWBR0027879/2022-08-01_0/xml/BWBR0027879_2022-08-01_0.xml"
landing_url: "https://wetten.overheid.nl/BWBR0027879/2022-08-01"
version: "In force from 2022-08-01 (BWB expression 2022-08-01_0)"
retrieved_on: "2026-10-01"
media_type: "application/xml"
reuse_policy: verbatim
terms_quote: "Er bestaat geen auteursrecht op wetten, besluiten en verordeningen, door de openbare macht uitgevaardigd, noch op rechterlijke uitspraken en administratieve beslissingen."
terms_url: "https://wetten.overheid.nl/BWBR0001886/2026-01-01#HoofdstukI_Paragraaf3_Artikel11"
required: true
pin_kind: bytes
pin: "60bb71e395cd21129ebf4311228dddb235493cc43de5063f43f57fde14a36102"
standing: legal-reference-level
---

The decree that describes the reference levels for Dutch (annex 1: 1F to 4F) and for arithmetic (annex 2: 1F, 1S, 2F, 3F). It is the canonical rendition of the reference levels for primary school: Dutch 1F and 2F, arithmetic 1F and 1S, 363 statements.

Standing: artikel 2 sets 1F and 2F as the Dutch levels for primary school, and artikel 3 sets 1F and 1S for arithmetic (decree of 17 June 2010, Stb. 2010, 265). Arithmetic 2F and Dutch 3F and 4F are not primary-school levels, and Dutch has no 1S.

Read as XML: every article, annex and division carries its path in the attribute bwb-ng-variabel-deel, and a statement is found by that path. The publication data (meta-data, jcis) is not part of the text. Annex 1 is a set of tables with one column per level; a statement is one paragraph of a level cell. Section 4 is running lists and two tables. Annex 2 is tables per pair of levels; a statement is a paragraph that opens with a dash, with the examples under it. Tables run on over several divisions headed "vervolg". Annex 3 is for vocational education and is not recorded.

Artefacts: the decree prints no codes for its statements, so a record has an empty code and a locator. Two cells of annex 2 hold an image of a fraction (246976.png, 246977.png, beside the XML in the repository and not part of the pinned file); the wording holds the transcription of each, marked as an image: [afbeelding: 1/100], [afbeelding: 3/4]. The transcriptions are listed in manifest/nl-additions.ts with the hash of each image file. A statement of several paragraphs keeps them as lines.

Other renditions: the open data (nl-slo-curriculum-referentiekader with nl-slo-curriculum-basis) cuts the text differently, has nothing of section 4 of annex 1, lacks about fifteen arithmetic statements at 1S and prints an equals sign where the decree prints "≠". It is the check rendition only. The Staatsblad text was not fetched.

Pin: the XML of the legislation repository is byte-stable (two fetches 25 minutes apart gave the same hash), so its bytes are pinned. The page of the same version on wetten.overheid.nl (the landing link) prints the day it was read and is not what is pinned.

Reuse: Auteurswet, artikel 11. There is no copyright on laws and decrees, so the wording is committed, each record with its source line.
