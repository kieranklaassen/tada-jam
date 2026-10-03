**Research value: high** -- Every cell has an identifiable official California document, the K-6 standards have an official CSV export from CDE's own search tool, and the counts below come from those files, not from memory.

Retrieved 2026-10-01. Evidence marks: **[V]** fetched from the primary source in this session and read; **[S]** seen only in a search-result snippet or a secondary copy; **[N]** not verified.

## 0. Findings that change the plan

1. **CDE publishes an official CSV export.** `https://www2.cde.ca.gov/cacs/<subject>?mingrade=0&maxgrade=6&dl=1` (subjects `math`, `ela`, `science`, `health`, `eld`) returns California's own codes and wording, with California additions marked. [V, downloaded] It does not cover the early-learning foundations or SEL.
2. **"Binding" is the wrong word for California.** The CDE standards PDFs for mathematics, ELA, health and ELD each carry the notice that the document "is not binding on local educational agencies or other entities ... the document is exemplary, and compliance with it is not mandatory. (See Education Code Section 33308.5.)" [V in all four PDFs]. A workable status field is: *State Board-adopted content standard* / *department-published learning foundation* / *voluntary guidance*.
3. **Reuse is permission-based by default.** CDE's site statement requires permission for any reproduction and says material "may not be edited or altered". See section 5. This is the main open risk for verbatim text in a source-available repository.
4. **The infant/toddler document changed.** The current edition is the Second Edition (2025), published by the California Department of Social Services (CDSS), not CDE. Its age periods are birth to 4 months, 4 through 11, 11 through 23 and 23 through 36 months, not 8/18/36 months (that was the 2009 edition). [V]
5. **Transitional kindergarten (TK) has no standards of its own.** Education Code 48000 defines TK as the first year of a two-year kindergarten program and states the Legislature's intent that TK curriculum be aligned to the PTKLF. [V via leginfo, text relayed by the fetch model]
6. **`www.cde.ca.gov` HTML pages sit behind a Radware bot manager.** After a handful of quick requests this session got a CAPTCHA page for every further HTML page; PDFs under `/documents/` and the `www2` search tool kept working. Plan retrieval as slow, cached, one-time downloads. [V]

## 1. Documents per cell

| Cell | Document (publisher) | Adopted / published | Status | URL |
|---|---|---|---|---|
| Age 2 (birth to 3), all subjects | *California Infant-Toddler Learning and Development Foundations, Second Edition* (CDSS; developed by WestEd) | 2025; replaces CDE's 2009 first edition | In force [V] | https://www.cdss.ca.gov/Portals/9/CCDD/Publications/itldf-ada-en.pdf (39 MB). CDE index page: https://www.cde.ca.gov/SP/cd/re/itfoundations.asp [S] |
| Ages 3 to 5.5 and TK, all subjects | *California Preschool/Transitional Kindergarten Learning Foundations* (PTKLF) (CDE Early Education Division) | PDFs created May 2024; released July 2024 [S]; replaces *Preschool Learning Foundations* vols. 1-3 (2008, 2010, 2012) | In force [V] | Index: https://www.cde.ca.gov/sp/cd/re/psfoundations.asp. PDFs: `https://www.cde.ca.gov/sp/cd/re/documents/ptklf<name>.pdf`, e.g. `ptklfataglance.pdf`, `ptklfintroduction.pdf` [V], `ptklfmathdomain.pdf`, `ptklflanguageliteracydev.pdf`, `ptklfsciencedomain.pdf`, `ptklfsocialemotionaldev.pdf`, `ptklfapproachestolearning.pdf`, `ptklfhealthdomain.pdf` [names V from index page, files N] |
| K, 1, 4, 5, 6 mathematics | *California Common Core State Standards: Mathematics, Electronic Edition* (CDE) | Adopted 2 Aug 2010; modified 16 Jan 2013; electronic edition 2014 | In force [V] | https://www.cde.ca.gov/be/st/ss/documents/ccssmathstandardaug2013.pdf |
| K, 1, 4, 5, 6 reading and language | *California Common Core State Standards: English Language Arts & Literacy in History/Social Studies, Science, and Technical Subjects* (CDE) | Adopted 2 Aug 2010; modified 13 Mar 2013 | In force [V] | https://www.cde.ca.gov/be/st/ss/documents/finalelaccssstandards.pdf |
| K, 1, 4, 5, 6 science | *Next Generation Science Standards for California Public Schools, Kindergarten Through Grade Twelve* (CA NGSS) | Adopted 4 Sep 2013 [S]; grade 6 file "Revised March 2015" [V] | In force | Index: https://www.cde.ca.gov/ci/pl/ngssstandards.asp [S, blocked]. Grade 6: https://www.cde.ca.gov/ci/pl/documents/cangsspfintegrgr6.pdf [V] |
| K, 1, 4, 5, 6 health | *Health Education Content Standards for California Public Schools, Kindergarten Through Grade Twelve* (CDE) | Adopted 12 Mar 2008; published 2009 | In force [V] | https://www.cde.ca.gov/be/st/ss/documents/healthstandmar08.pdf |
| K-6 social-emotional | *Transformative SEL (T-SEL) Competencies and Conditions for Thriving* (CDE) | about 2020-21 [S] | Voluntary guidance, not a standard: "guidance tools developed for voluntary use" [S] | https://www.cde.ca.gov/ci/se/tselcompetencies.asp [S, blocked] |
| K-6 English learners | *California English Language Development Standards: Kindergarten Through Grade 12* (CDE) | Adopted Nov 2012; published 2014 | In force [V] | https://www.cde.ca.gov/sp/el/er/documents/eldstndspublication14.pdf |

All-standards index, last reviewed 7 May 2026: https://www.cde.ca.gov/be/st/ss/ [V].

ELD standards are a separate set for English learners, written to correspond to the ELA standards and leveled by proficiency (Emerging, Expanding, Bridging), not by subject content. Recommend treating them as an optional companion set, not part of "reading and language".

Gaps: there is no K-6 standard for self-care or approaches to learning; health standards plus T-SEL guidance are the only official material. The infant/toddler foundations have no health or self-care domain.

## 2. Structure and codes

- **Mathematics.** Grade.Domain.Number, sub-parts lettered. The CDE export writes `K.CC.4.a`, `4.NF.3.a`; the PDF prints "4a". California-added standards get a decimal number (`2.NBT.7.1`, `5.OA.2.1`). California additions are "in boldface type and with a CA notation" in the PDF and a trailing ` CA` in the CSV. K-6 additions: 2.MD.7, 2.NBT.2, 2.NBT.7.1, 4.G.2, 4.NF.7, 5.OA.2.1; none in K, 1 or 6 (CSV and PDF agree). [V] The eight Standards for Mathematical Practice are not in the export.
- **ELA.** Strand.Grade.Number (`RL.5.2`, `RF.K.3`), strands RL, RI, RF, W, SL, L; lettered sub-parts. Additions "identified in boldface text followed by the abbreviation 'CA'". Rows with a CA mark: K 10, grade 1 11, grade 4 8, grade 5 6, grade 6 6. [V]
- **Science.** Performance expectations `4-PS3-2`, `K-2-ETS1-1`, `MS-LS1-1`. California's changes are clarification statements marked `**`, plus the grade placement of the 59 middle-school expectations: the State Board's Preferred Integrated Course Model (a Discipline Specific model also exists). The grade 6 PDF prints one code with an en dash (`MS-PS3–5`); normalize. [V]
- **Health.** `Grade.Standard.Number.ContentArea`, e.g. `K.1.1.A`, `4.1.10.S`. Eight overarching standards; six content areas (A alcohol, tobacco and other drugs; G growth and development; M mental, emotional and social health; N nutrition and physical activity; P personal and community health; S injury prevention and safety). Not every area appears in every grade: K all six; grade 1 G, P, S; grade 4 A, N, S; grade 5 G, N, P; grade 6 A, M, S. [V]
- **ELD.** `ELD.PI.K.1.Em` = part, grade, number, proficiency level. [V]
- **PTKLF.** Domain, Strand `1.0`, Sub-Strand, `Foundation 1.1 <name>`, then an "Early (3 to 4 ½ Years)" and a "Later (4 to 5 ½ Years)" statement. The English Language Development sub-domain uses Discovering, Developing, Broadening instead. Numbering restarts in every domain and there is no official domain prefix, so the corpus must mint one and say so. [V]
- **Infant/toddler.** Domain, `Strand 1.0`, `Foundation 1.1`, a general statement, then indicators for three age periods; each strand opens with a "First Four Months" description. Numbering restarts per domain. [V]
- **T-SEL.** Five competencies, indicators grouped under Identity, Belonging, Agency, by developmental band (Early Elementary K-2, Late Elementary 3-5, Middle School 6-8). Codes such as `1.A.1` appear in a third-party copy; whether CDE prints them is [N].

## 3. Counts

Rows in CDE's CSV export unless noted [V]:

| | K | Grade 1 | Grade 4 | Grade 5 | Grade 6 |
|---|---|---|---|---|---|
| Mathematics (sub-parts are their own rows) | 24 | 23 | 34 | 35 | 42 |
| ELA (one row per numbered standard) | 46 | 46 | 44 | 44 | 42, plus 30 rows for literacy in other subjects, grades 6-8 |
| ELA lettered sub-parts inside those rows | 37 | 46 | 45 | 44 | 40 |
| Science performance expectations | 13 | 12 | 17 | 16 | 19 (counted from the grade 6 integrated PDF; the export only has 59 rows for "6-8") |
| Health | 64 | 53 | 85 | 69 | 76 |
| ELD (each standard at three levels) | 63 | 63 | 72 | 72 | 75 |

Science counts include the three engineering expectations of each grade band, which the export repeats in every grade of the band.

PTKLF, counted from the at-a-glance PDF [V]: **220 foundations**. Approaches to Learning 12, Social and Emotional Development 16, Foundational Language Development 23, English Language Development 23, Mathematics 24, Science 29, Physical Development 17, Health 16, History-Social Science 26, Visual and Performing Arts 34. In scope: mathematics 24; reading and language 23; science 29; practical life and feelings 44; that is 120 foundations, 240 Early/Later statements.

Infant/toddler, counted from the PDF [V]: **34 foundations** in 15 strands. Social and Emotional 10, Approaches to Learning 8, Language 6, Cognitive 7 (mathematics is three of these: Number Sense, Spatial Thinking, Classification), Perceptual and Motor 3. Each has three age-period indicators (102 cells).

T-SEL: 38 indicators per band [S, Common Standards Project copy].

**Corpus size**: about 34 to 102 (infant/toddler) + 240 (PTKLF in scope) + 281 (K and 1) + 523 (grades 4 to 6) ≈ **1,100 to 1,150 records**. Add 212 if ELA sub-parts are separate records, 345 for ELD, 114 for T-SEL.

## 4. Machine-readable sources

| Source | What it is | California text and codes? | Licence |
|---|---|---|---|
| CDE "Search the California Content Standards", https://www2.cde.ca.gov/cacs/ | Official. "Download These Results" gives CSV [V] | Yes, K-12 for 12 subjects | "© California Department of Education"; no licence stated |
| CDE "CA Standards" mobile app | Same content [S] | Yes | Not stated |
| Common Standards Project, https://api.commonstandardsproject.com/api/v1/jurisdictions/B1339AB05F0347E79200FCA63240F3B2 | Open JSON API, 281 California sets [V] | Mixed. Crowd-contributed: duplicates, district uploads, `file:///` source links; has T-SEL and the 2008 preschool foundations, not PTKLF 2024 | Set metadata says "CC BY 4.0 US", rights holder Common Curriculum, Inc. [V] |
| CASE Network 2, https://casenetwork.1edtech.org | 1EdTech CASE frameworks for all 50 states, built with Common Good Learning Tools [S] | California content not inspected [N]; not published by CDE | Browse free; API returned 403 "Invalid credentials" without registered access [V] |
| Achievement Standards Network (D2L) | RDF/JSON downloads [S] | Older national and state sets | CC BY 3.0 [S] |

CSV caveats found on download: mathematics, science and health files are Windows-1252, ELA and ELD are UTF-8; mathematics splits sub-parts into rows and ELA does not; grade-range values carry a trailing tab; boldface is lost (only the `CA` suffix remains); science rows bundle core idea, practice and crosscutting text with the expectation.

## 5. Reuse terms

- **CDE website** (https://www.cde.ca.gov/re/di/cr/) [V, wording matched in search snippet]: "Except where specifically noted, permission must be obtained for reproduction of any portion of the material on this website. The material may not be edited or altered and must remain unchanged, as published by the California Department of Education (CDE)." Requests go to CDE Press on a Copyright Release Request form; allow 2 to 4 weeks.
- **CDE standards PDFs** [V]: "© 2013, 2014 by the California Department of Education. All rights reserved ... Reproduction of this document for resale, in whole or in part, is not authorized" (mathematics; ELA © 2013 and ELD © 2014 use the same wording; health says "© 2009 ... All rights reserved"). The mathematics PDF adds: "The Common Core State Standards appear as they were published by the Common Core State Standards Initiative."
- **PTKLF PDFs**: no copyright page in the introduction or at-a-glance files [V]; the site statement applies.
- **Infant/toddler**: "Copyright © 2025 by the California Department of Social Services (2nd ed); 2009 (1st ed) by the California Department of Education." No licence stated. [V]
- **Common Core public licence** (https://www.thecorestandards.org/public-license/, returned 403, so [S]): "a limited, non-exclusive, royalty-free license to copy, publish, distribute, and display the Common Core State Standards for purposes that support the Common Core State Standards Initiative", with the notice "© Copyright 2010. National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved."
- **NGSS** (https://www.nextgenscience.org/trademark-and-copyright) [V]: "states, districts, schools, teachers and non-profit education entities may copy, reproduce, alter, adapt, edit, delete and rearrange any and all parts of the NGSS as they see fit and without permission." "The copyright to the standards are held by the National Academies Press." The name is a WestEd trademark and needs the stated disclaimer. A commercial developer is not in the named group.

Reading (not legal advice): nothing found forbids a private development-time copy outright, but nothing grants it either for CDE-authored text (PTKLF, health, ELD, California additions, the CSV), and splitting text into records sits uneasily with "must remain unchanged". A source-available repository is publication. Safer shapes: file the CDE Press request (and ask CDSS) before committing wording; or commit codes, source links, versions and hashes and keep the wording in an untracked build-time cache.

## 6. Ages

- Kindergarten: fifth birthday on or before 1 September (Education Code 48000(a)). TK: from 2025-26, fourth birthday by 1 September (48000(c)). Grade 1: sixth birthday on or before 1 September (48010). [V via https://leginfo.legislature.ca.gov, sections 48000 and 48010]
- Typical ages: TK 4 to 5, K 5 to 6, grade 1 6 to 7, grade 4 9 to 10, grade 5 10 to 11, grade 6 11 to 12.
- PTKLF: "Early" is three to four-and-a-half, "Later" is four to five-and-a-half; the overlap is intentional and "Later" is meant to include most TK children. [V]
- Age 2 maps to the infant/toddler "23 through 36 months" period (and the end of "11 through 23 months").

## 7. Scheduled changes

- No revision of the mathematics, ELA or science standards was found [S, absence of evidence]. The 2023 Mathematics Framework (adopted 12 July 2023) is guidance on teaching the unchanged 2010/2013 standards. [S]
- ELA/ELD: a 2026 follow-up instructional materials adoption is under way under AB 1454 (2025); reviewers appointed 15 January 2026. Materials, not standards. [S]
- Health: the next Health Education Framework revision carries legislative directions (a 2026 bill analysis for SB 1133 discusses it); the 2008 standards are unchanged. [S]
- PTKLF files are still edited in place: the introduction PDF was modified 2 October 2025 and the at-a-glance file still says "Refer to the full draft". Record PDF modification dates and hashes. [V]
- Education Code 48000 was amended in 2026 (AB 126, effective 9 July 2026). [V via leginfo]

## Sources

- https://www2.cde.ca.gov/cacs/ -- CDE standards search tool and CSV export (counts, codes, California markers)
- https://www.cde.ca.gov/be/st/ss/ -- CDE content standards index with adoption dates
- https://www.cde.ca.gov/be/st/ss/documents/ccssmathstandardaug2013.pdf -- mathematics standards, publishing page
- https://www.cde.ca.gov/be/st/ss/documents/finalelaccssstandards.pdf -- ELA standards, publishing page
- https://www.cde.ca.gov/be/st/ss/documents/healthstandmar08.pdf -- health standards, notice and copyright
- https://www.cde.ca.gov/sp/el/er/documents/eldstndspublication14.pdf -- ELD standards, publishing page
- https://www.cde.ca.gov/ci/pl/documents/cangsspfintegrgr6.pdf -- CA NGSS grade 6, Preferred Integrated model
- https://www.cde.ca.gov/sp/cd/re/psfoundations.asp, `.../documents/ptklfataglance.pdf`, `.../documents/ptklfintroduction.pdf` -- PTKLF index, foundation list, age levels
- https://www.cdss.ca.gov/Portals/9/CCDD/Publications/itldf-ada-en.pdf -- infant/toddler foundations, second edition
- https://www.cde.ca.gov/re/di/cr/ -- CDE copyright statement
- https://www.nextgenscience.org/trademark-and-copyright -- NGSS public licence and trademark rules
- https://www.thecorestandards.org/public-license/ -- Common Core public licence (snippet only)
- https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=48000 and `sectionNum=48010` -- entry ages, TK definition
- https://api.commonstandardsproject.com/api/v1/jurisdictions -- Common Standards Project API (California sets, T-SEL copy)
- https://casenetwork.1edtech.org -- CASE Network 2 (access model only)
- https://www.cde.ca.gov/ci/se/tselcompetencies.asp -- T-SEL status (snippet only)
