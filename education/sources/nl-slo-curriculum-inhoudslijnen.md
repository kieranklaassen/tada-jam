---
id: edu.nl.source.nl-slo-curriculum-inhoudslijnen
kind: source
title: "SLO open data: curriculum-inhoudslijnen (inhoudslijnen po)"
publisher: "SLO (Stichting Leerplanontwikkeling)"
jurisdiction: nl
url: "https://github.com/slonl/curriculum-inhoudslijnen.git"
landing_url: "https://github.com/slonl/curriculum-inhoudslijnen"
version: "Commit d2ec46f7e64d of 2026-08-17, release tag 2026.7"
retrieved_on: "2026-10-01"
media_type: "application/json"
reuse_policy: verbatim
terms_quote: "package.json of the repository: \"license\": \"MIT\". data.overheid.nl, catalogue record \"SLO Curriculumdatabase API\": \"Licentie: CC-BY (4.0)\". slo.nl, disclaimer: \"Mits de bron wordt vermeld is het toegestaan om zonder voorafgaande toestemming van de uitgever informatie op deze website geheel of gedeeltelijk te kopiëren dan wel op andere wijze te vermenigvuldigen, tenzij expliciet anders is aangegeven.\""
terms_url: "https://data.overheid.nl/dataset/slo-curriculumdatabase"
required: true
pin_kind: git-commit
pin: d2ec46f7e64d088bdade17163146d374d10b3419
standing: curriculum-institute-guidance
---

A git repository of the curriculum institute's open data: the inhoudslijnen for primary school, as JSON. It is the canonical rendition of the per-band goals for fase 1, 2 and 3 in Nederlands, Rekenen en wiskunde and Orientatie op jezelf en de wereld: 1,029 goals in the pack.

Standing: SLO, "Opbouw van de inhoudslijnen" (8 August 2024), says the core goals and the reference levels are the legal frame, and that these goals say what a school can offer, not what a child must know. Guidance of the curriculum institute, written for the 2006 core goals.

Read as data: areas, lines, clusters and sub-clusters are separate files of flat objects; a cluster or sub-cluster lists goal-at-level ids. The goal text, the code and the fase are in curriculum-basis (nl-slo-curriculum-basis). The level of a goal is the level it links to: eight codes end in another fase or are malformed.

Other renditions: SLO publishes the same goals on slo.nl as one PDF per line (the nl-slo-inhoudslijn records), under the notice of that site. Those PDFs print no codes, and for arithmetic they print examples in brackets that the data leaves out; the records hold those examples as accompanying text, read from the PDFs. For the line Bewerkingen the cluster lists of the data are wrong in places, eight arithmetic goals lack statement text that the PDF prints, and the data lacks one goal of De samenleving and one row of goals of Schrijven: manifest/nl-additions.ts lists each case, and the frames of the lanes say which records it concerns. The line for English is on slo.nl only and is not in the data.

Pin: the commit of the clone. The repository lists curriculum-basis as a submodule at a commit of 2023; that submodule is not used, and texts and levels are joined from the separate clone of curriculum-basis at its own pinned commit.

Reuse: the repository has no licence file. Three published terms cover it, and the record quotes all three: the licence field of its package.json (MIT); the catalogue record of the SLO curriculum database on data.overheid.nl, which states CC-BY 4.0 and names the API at opendata.slo.nl that these repositories are the data behind (https://data.overheid.nl/dataset/slo-curriculumdatabase); and the notice of slo.nl, which allows copying with the source named (https://www.slo.nl/disclaimer/).
