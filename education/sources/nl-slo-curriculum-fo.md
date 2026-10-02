---
id: edu.nl.source.nl-slo-curriculum-fo
kind: source
title: "SLO open data: curriculum-fo (Wettelijk Curriculum FO)"
publisher: "SLO (Stichting Leerplanontwikkeling)"
jurisdiction: nl
url: "https://github.com/slonl/curriculum-fo.git"
landing_url: "https://github.com/slonl/curriculum-fo"
version: "Commit e62b160311e8 of 2026-08-25, release tag 2026.8"
retrieved_on: "2026-10-01"
media_type: "application/json"
reuse_policy: verbatim
terms_quote: "package.json of the repository: \"license\": \"MIT\". data.overheid.nl, catalogue record \"SLO Curriculumdatabase API\": \"Licentie: CC-BY (4.0)\". slo.nl, disclaimer: \"Mits de bron wordt vermeld is het toegestaan om zonder voorafgaande toestemming van de uitgever informatie op deze website geheel of gedeeltelijk te kopiëren dan wel op andere wijze te vermenigvuldigen, tenzij expliciet anders is aangegeven.\""
terms_url: "https://data.overheid.nl/dataset/slo-curriculumdatabase"
required: true
pin_kind: git-commit
pin: e62b160311e869acf072f440f6211be7a23d5f0b
standing: draft-not-yet-in-force
regime: "2027-draft"
---

A git repository of the curriculum institute's open data: the new core goals and the examination programmes, as JSON. Sets, domains, kernzinnen, doelzinnen, uitwerkingen and illustrations are separate files of flat objects, each with a UUID.

Use: it is the check rendition of the 2026 core goals for Dutch and arithmetic, and it gives the ids of the nodes for those goals and for the draft core goals, where its nodes pair one for one with the statements. No wording is read from it.

Standing: never read from this record or from the data. Every set carries the status "definitief concept", also the two that are law since 1 August 2026. The record is marked as a draft because the other sets are: their standing rests on the consultation draft (nl-concept-besluit-kerndoelen-2027).

Read as data: the goal text is in the field description; title holds a label. A kernzin has no level of its own: it belongs to primary school when every uitwerking under it lists the levels po and so. The order of an array is not always the printed order: sort uitwerkingen by the number in their prefix. The illustrations ("Te denken valt aan") are in neither the law nor SLO's bundle and are not recorded.

Differences: 18 wordings differ from the legal text of the 2026 goals: 8 of the 114 of Onderdeel A Nederlands, which are records of end-of-primary reading and language, and 10 of the 90 of Onderdeel B Rekenen en wiskunde, which are records of end-of-primary mathematics. The frames of those two lanes list them by code. In the draft goals the pack records, 5 wordings differ from the consultation draft. The record follows the law and the draft decree.

Pin: the commit of the clone. The repository lists curriculum-basis as a submodule at a commit of 2023; that submodule is not used, and texts and levels are joined from the separate clone of curriculum-basis at its own pinned commit.

Reuse: the repository has no licence file. Three published terms cover it, and the record quotes all three: the licence field of its package.json (MIT); the catalogue record of the SLO curriculum database on data.overheid.nl, which states CC-BY 4.0 and names the API at opendata.slo.nl that these repositories are the data behind (https://data.overheid.nl/dataset/slo-curriculumdatabase); and the notice of slo.nl, which allows copying with the source named (https://www.slo.nl/disclaimer/).
