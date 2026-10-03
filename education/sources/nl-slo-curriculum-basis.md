---
id: edu.nl.source.nl-slo-curriculum-basis
kind: source
title: "SLO open data: curriculum-basis (doelen, doelniveaus, niveaus)"
publisher: "SLO (Stichting Leerplanontwikkeling)"
jurisdiction: nl
url: "https://github.com/slonl/curriculum-basis.git"
landing_url: "https://github.com/slonl/curriculum-basis"
version: "Commit 5adf7a475e13 of 2026-08-17, release tag 2026.7"
retrieved_on: "2026-10-01"
media_type: "application/json"
reuse_policy: verbatim
terms_quote: "package.json of the repository: \"license\": \"MIT\". data.overheid.nl, catalogue record \"SLO Curriculumdatabase API\": \"Licentie: CC-BY (4.0)\". slo.nl, disclaimer: \"Mits de bron wordt vermeld is het toegestaan om zonder voorafgaande toestemming van de uitgever informatie op deze website geheel of gedeeltelijk te kopiëren dan wel op andere wijze te vermenigvuldigen, tenzij expliciet anders is aangegeven.\""
terms_url: "https://data.overheid.nl/dataset/slo-curriculumdatabase"
required: true
pin_kind: git-commit
pin: "5adf7a475e13c3ed6c53a8cc3e0f2ac37843de2e"
standing: curriculum-institute-guidance
---

A git repository of the curriculum institute's open data: the shared store of goal texts (doelen.json), goals at a level (doelniveaus.json) and the table of levels (niveaus.json). The other repositories hold structure and point here.

Use: the wording and the code of every per-band goal are read from it, joined to the structure of nl-slo-curriculum-inhoudslijnen. It also resolves the levels of the core-goal data and holds the text of the reference-level data, which is a check rendition.

Standing: it has none of its own; a record takes its standing from the set it belongs to. The per-band goals are guidance of the curriculum institute.

Read as data: a goal-at-level object lists exactly one goal and one level, and carries the code in its prefix. Levels are matched on their title, not on an id. The table of levels defines the bands: "fase 1: onderbouw primair onderwijs groep 1, groep 2, groep 3", "fase 2: middenbouw primair onderwijs: groep 4, groep 5, groep 6", "fase 3: bovenbouw primair onderwijs: groep 7, groep 8". No object is linked to the level "vve": the data has nothing for peuters.

Pin: the commit of the clone.

Reuse: the repository has no licence file. Three published terms cover it, and the record quotes all three: the licence field of its package.json (MIT); the catalogue record of the SLO curriculum database on data.overheid.nl, which states CC-BY 4.0 and names the API at opendata.slo.nl that these repositories are the data behind (https://data.overheid.nl/dataset/slo-curriculumdatabase); and the notice of slo.nl, which allows copying with the source named (https://www.slo.nl/disclaimer/).
