---
id: edu.us-ca.source.us-ca-cde-cacs-ela-export
kind: source
title: "Search the California Content Standards: English Language Arts (CSV export)"
publisher: "California Department of Education"
jurisdiction: us-ca
url: "https://www2.cde.ca.gov/cacs/ela?mingrade=0&maxgrade=6&dl=1"
landing_url: "https://www2.cde.ca.gov/cacs/ela"
version: "California Common Core State Standards: English Language Arts and Literacy, adopted August 2010, modified March 2013. The export carries no version or date of its own."
retrieved_on: "2026-10-01"
media_type: "text/csv"
reuse_policy: description-only
terms_quote: "Except where specifically noted, permission must be obtained for reproduction of any portion of the material on this website."
terms_url: "https://www.cde.ca.gov/re/di/cr/"
required: true
pin_kind: bytes
pin: "6951dc0bcac90ec5be03be76aa11bdd508bddfdbfc9229057b76d24b73b30542"
standing: state-board-adopted-standard
---

The English language arts export of the department's standards search tool: 340 rows and 9 columns, kindergarten to grade 6, with the literacy rows for grades 6 to 8. It is the canonical rendition for kindergarten and grades 1, 4, 5 and 6 reading and language.

Standing: the search tool's English language arts page says the State Board approved these standards in 2010. The adopted PDF adds that they were modified in March 2013.

Fetched once with mingrade=0 and maxgrade=6 (grade 0 is kindergarten); the server names the file in its Content-Disposition header. Records end in CRLF and line breaks inside the quoted Description field are bare LF. No byte-order mark. The file also holds grades 2 and 3, which are outside the pack and are filtered out by grade. Encoding is plain ASCII: quote marks and dashes are straight, unlike the PDF.

Lettered sub-parts are lines inside the parent row, not rows. In the grades the pack covers, fourteen rows are placeholders for a standard that does not exist at the grade; they are not records. The Grade Range of the rows for grades 6 to 8 is "6-8" followed by a tab. One sub-part line has no space after its letter, and one cluster name is misspelled ("Conventions of Standards English").

Reuse: published on the department's website, whose copyright statement (read 2026-10-01; the page says it was last reviewed August 12, 2025) requires permission for any reproduction. No permission has been asked, so the wording is not committed.
