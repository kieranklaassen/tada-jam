---
id: edu.nl.source.nl-slo-curriculum-referentiekader
kind: source
title: "SLO open data: curriculum-referentiekader (Referentiekader taal en rekenen)"
publisher: "SLO (Stichting Leerplanontwikkeling)"
jurisdiction: nl
url: "https://github.com/slonl/curriculum-referentiekader.git"
landing_url: "https://github.com/slonl/curriculum-referentiekader"
version: "Commit 19e2eb34dc85 of 2026-08-17, release tag 2026.7"
retrieved_on: "2026-10-01"
media_type: "application/json"
reuse_policy: verbatim
terms_quote: "package.json of the repository: \"license\": \"MIT\". data.overheid.nl, catalogue record \"SLO Curriculumdatabase API\": \"Licentie: CC-BY (4.0)\". slo.nl, disclaimer: \"Mits de bron wordt vermeld is het toegestaan om zonder voorafgaande toestemming van de uitgever informatie op deze website geheel of gedeeltelijk te kopiëren dan wel op andere wijze te vermenigvuldigen, tenzij expliciet anders is aangegeven.\""
terms_url: "https://data.overheid.nl/dataset/slo-curriculumdatabase"
required: true
pin_kind: git-commit
pin: "19e2eb34dc85ee6b587a16be947b4f396dd8be49"
standing: legal-reference-level
---

A git repository of the curriculum institute's open data: the structure of the reference framework for Dutch and arithmetic, as JSON. It holds structure only; the statements and their levels are joined from curriculum-basis.

Use: it is the check rendition of the reference levels, where it has the statement. No wording and no id is read from it.

Standing: comes from the decree (nl-wet-referentieniveaus-besluit), not from this data.

Read as data: from ref.vakleergebieden.json (RKT for Dutch, RKR for arithmetic) down through domains, sub-domains, topics and sub-topics; any of them can list goal-at-level ids. For primary school it has 86 goals at 1F and 103 at 2F for Dutch, and 82 at 1F and 77 at 1S for arithmetic.

Differences from the decree: it cuts the text into other pieces, has nothing of section 4 of the Dutch annex, lacks about fifteen arithmetic statements at 1S, prints an equals sign where the decree prints "≠", and holds levels 2S and 3S that the decree does not have.

Pin: the commit of the clone. The repository lists curriculum-basis as a submodule at a commit of 2023; that submodule is not used, and texts and levels are joined from the separate clone of curriculum-basis at its own pinned commit.

Reuse: the repository has no licence file. Three published terms cover it, and the record quotes all three: the licence field of its package.json (MIT); the catalogue record of the SLO curriculum database on data.overheid.nl, which states CC-BY 4.0 and names the API at opendata.slo.nl that these repositories are the data behind (https://data.overheid.nl/dataset/slo-curriculumdatabase); and the notice of slo.nl, which allows copying with the source named (https://www.slo.nl/disclaimer/).
