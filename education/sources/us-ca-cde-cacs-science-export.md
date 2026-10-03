---
id: edu.us-ca.source.us-ca-cde-cacs-science-export
kind: source
title: "Search the California Content Standards: Science (CA NGSS) (CSV export)"
publisher: "California Department of Education"
jurisdiction: us-ca
url: "https://www2.cde.ca.gov/cacs/science?mingrade=0&maxgrade=6&dl=1"
landing_url: "https://www2.cde.ca.gov/cacs/science"
version: "Next Generation Science Standards for California Public Schools (CA NGSS), approved 2013. The export carries no version or date of its own."
retrieved_on: "2026-10-01"
media_type: "text/csv"
reuse_policy: description-only
terms_quote: "states, districts, schools, teachers and non-profit education entities may copy, reproduce, alter, adapt, edit, delete and rearrange any and all parts of the NGSS as they see fit and without permission."
terms_url: "https://www.nextgenscience.org/trademark-and-copyright"
required: true
pin_kind: bytes
pin: "32219cf6f5b2ab7ba80e916d2677fef57a81ea0559a23df2d8d0e9cb246b3f44"
standing: state-board-adopted-standard
---

The science export of the department's standards search tool: 149 rows and 10 columns. It is the canonical rendition for kindergarten and grades 1, 4 and 5 science and for the band-level engineering design expectations, and the check rendition for grade 6 science (its 59 middle school rows are not imported).

Standing: the search tool's science page says the State Board approved these standards in 2013.

Fetched once with mingrade=0 and maxgrade=6 (grade 0 is kindergarten); the server names the file in its Content-Disposition header. Records end in CRLF and line breaks inside the quoted Description field are bare LF. No byte-order mark. The file also holds grades 2 and 3, which are outside the pack and are filtered out by grade. Encoding is Windows-1252; the only byte outside ASCII is the multiplication sign.

Two columns are both named Content Area; the second holds the discipline. The Description field holds a whole page under labels, and only the paragraph labelled Performance Expectation is the standard. The Grade Range of the middle school rows is "6-8" followed by a tab. Eight middle school identifiers carry a trailing space and one a trailing period. The export drops the double asterisk that the PDFs put on California clarification statements, and it does not always keep the clarification's text. In two grade 4 rows California's own text is absent: the row for 4-LS1-1 lacks the closing sentence of the clarification, and the row for 4-PS3-1 has no clarification statement at all; the grade 4 PDF prints both and marks them with the double asterisk. In the three grade 5 rows with a California clarification (5-ESS1-1, 5-ESS2-1, 5-PS1-4) the text is kept, in 5-ESS1-1 and 5-ESS2-1 with small differences from the grade 5 PDF.

Reuse: the licence of the science standards grants copying to states, districts, schools, teachers and non-profit education entities. This repo is none of those, so the wording is not committed. The file is also published on the department's website, whose copyright statement (https://www.cde.ca.gov/re/di/cr/) says: "Except where specifically noted, permission must be obtained for reproduction of any portion of the material on this website."
