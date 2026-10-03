---
id: edu.us-ca.source.us-ca-cde-cacs-math-export
kind: source
title: "Search the California Content Standards: Mathematics (CSV export)"
publisher: "California Department of Education"
jurisdiction: us-ca
url: "https://www2.cde.ca.gov/cacs/math?mingrade=0&maxgrade=6&dl=1"
landing_url: "https://www2.cde.ca.gov/cacs/math"
version: "California Common Core State Standards: Mathematics, adopted August 2010, modified January 2013. The export carries no version or date of its own."
retrieved_on: "2026-10-01"
media_type: "text/csv"
reuse_policy: description-only
terms_quote: "Except where specifically noted, permission must be obtained for reproduction of any portion of the material on this website."
terms_url: "https://www.cde.ca.gov/re/di/cr/"
required: true
pin_kind: bytes
pin: "373309e58bd6b92fba8bb4d5193f44dd71a65b3743ddf72d163ab738511c8e94"
standing: state-board-adopted-standard
---

The mathematics export of the department's standards search tool: 219 rows and 9 columns, kindergarten to grade 6. It is the canonical rendition for kindergarten and grades 1, 4, 5 and 6 mathematics.

Standing: the search tool's mathematics page says the State Board approved these standards in 2010 and updated them in 2013. The export itself states no standing.

Fetched once with mingrade=0 and maxgrade=6 (grade 0 is kindergarten); the server names the file in its Content-Disposition header. Records end in CRLF and line breaks inside the quoted Description field are bare LF. No byte-order mark. The file also holds grades 2 and 3, which are outside the pack and are filtered out by grade. Encoding is Windows-1252, not UTF-8: it holds multiplication, division, degree and cent signs.

Each sub-part is its own row and a parent with lettered parts has no row; a sub-part row repeats the parent's stem. The cluster heading is inside the Description field, under a label, not in a column.

Reuse: published on the department's website, whose copyright statement (read 2026-10-01; the page says it was last reviewed August 12, 2025) requires permission for any reproduction. No permission has been asked, so the wording is not committed.
