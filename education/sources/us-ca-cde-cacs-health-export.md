---
id: edu.us-ca.source.us-ca-cde-cacs-health-export
kind: source
title: "Search the California Content Standards: Health Education (CSV export)"
publisher: "California Department of Education"
jurisdiction: us-ca
url: "https://www2.cde.ca.gov/cacs/health?mingrade=0&maxgrade=6&dl=1"
landing_url: "https://www2.cde.ca.gov/cacs/health"
version: "Health Education Content Standards for California Public Schools, adopted March 12, 2008. The export carries no version or date of its own."
retrieved_on: "2026-10-01"
media_type: "text/csv"
reuse_policy: description-only
terms_quote: "Except where specifically noted, permission must be obtained for reproduction of any portion of the material on this website."
terms_url: "https://www.cde.ca.gov/re/di/cr/"
required: true
pin_kind: bytes
pin: "2b311c4c17b9ff3b9338f7e09d527388288c7a20e6d2296d3499acc84e0e8aa5"
standing: state-board-adopted-standard
---

The health education export of the department's standards search tool: 445 rows and 8 columns, kindergarten to grade 6. It is the canonical rendition for kindergarten and grades 1, 4, 5 and 6 practical life and feelings.

Standing: the search tool's health page says the State Board approved these standards in 2008.

Fetched once with mingrade=0 and maxgrade=6 (grade 0 is kindergarten); the server names the file in its Content-Disposition header. Records end in CRLF and line breaks inside the quoted Description field are bare LF. No byte-order mark. The file also holds grades 2 and 3, which are outside the pack and are filtered out by grade. Encoding is Windows-1252; the only bytes outside ASCII are two no-break spaces.

Two columns are both named Content Area; the second holds the health content area. Grade Range values are words ("Kindergarten", "Grade 1"), unlike the other exports. Two identifiers are malformed: "K7.3.N", which the PDF shows to be K.7.3.N, and "6.8.1.M" with a trailing space.

Reuse: published on the department's website, whose copyright statement (read 2026-10-01; the page says it was last reviewed August 12, 2025) requires permission for any reproduction. No permission has been asked, so the wording is not committed.
