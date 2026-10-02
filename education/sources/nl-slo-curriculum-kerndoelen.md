---
id: edu.nl.source.nl-slo-curriculum-kerndoelen
kind: source
title: "SLO open data: curriculum-kerndoelen (the 2006 core goals)"
publisher: "SLO (Stichting Leerplanontwikkeling)"
jurisdiction: nl
url: "https://github.com/slonl/curriculum-kerndoelen.git"
landing_url: "https://github.com/slonl/curriculum-kerndoelen"
version: "Commit b48855bb3fa2 of 2026-08-17, release tag 2026.7"
retrieved_on: "2026-10-01"
media_type: "application/json"
reuse_policy: verbatim
terms_quote: "package.json of the repository: \"license\": \"MIT\". data.overheid.nl, catalogue record \"SLO Curriculumdatabase API\": \"Licentie: CC-BY (4.0)\". slo.nl, disclaimer: \"Mits de bron wordt vermeld is het toegestaan om zonder voorafgaande toestemming van de uitgever informatie op deze website geheel of gedeeltelijk te kopiëren dan wel op andere wijze te vermenigvuldigen, tenzij expliciet anders is aangegeven.\""
terms_url: "https://data.overheid.nl/dataset/slo-curriculumdatabase"
required: true
pin_kind: git-commit
pin: b48855bb3fa27eddf8dd012708e6e4167f2d94db
standing: legal-core-goal
regime: "2006"
---

A git repository of the curriculum institute's open data: the 2006 core goals for primary, secondary and special education, as JSON. The primary-school goals are the 58 nodes with the prefix "PO Kerndoel 01" to "PO Kerndoel 58".

Use: it is the check rendition of the 2006 core goals, and it gives the ids of their nodes, one per goal. No wording is read from it.

Standing: comes from the legal text, not from this data, which has no status field and still holds the goals struck on 1 August 2026.

Read as data: here the goal sentence is in the field title and description holds a short label, the reverse of curriculum-fo.

Differences from the legal text in the goals the pack records: 6 of 35. Two are in substance: kerndoel 11 stops after the first of its three rules, and kerndoel 38 has a clause that the law does not have.

Pin: the commit of the clone. The repository lists curriculum-basis as a submodule at a commit of 2023; that submodule is not used, and texts and levels are joined from the separate clone of curriculum-basis at its own pinned commit.

Reuse: the repository has no licence file. Three published terms cover it, and the record quotes all three: the licence field of its package.json (MIT); the catalogue record of the SLO curriculum database on data.overheid.nl, which states CC-BY 4.0 and names the API at opendata.slo.nl that these repositories are the data behind (https://data.overheid.nl/dataset/slo-curriculumdatabase); and the notice of slo.nl, which allows copying with the source named (https://www.slo.nl/disclaimer/).
