---
id: edu.us-ca.cross-grade.science.frame.lane
kind: frame
title: "Cross-grade science"
jurisdiction: us-ca
level: cross-grade
subject: science
sources:
  - edu.us-ca.source.us-ca-cde-cacs-science-export
  - edu.us-ca.source.us-ca-cde-ngss-kindergarten-dci-pdf
  - edu.us-ca.source.us-ca-cde-ngss-grade4-dci-pdf
expected_count: 6
counting_method: "Rows of the science export whose code starts with K-2-ETS1- (three, read under kindergarten) or 3-5-ETS1- (three, read under grade 4). The export repeats each under every grade of its band with the same wording, so each is recorded once here and skipped in the grade lanes. Cross-checked against the kindergarten and grade 4 documents, which print the same three codes each."
check_renditions:
  - edu.us-ca.source.us-ca-cde-ngss-kindergarten-dci-pdf
  - edu.us-ca.source.us-ca-cde-ngss-grade4-dci-pdf
check_strength: second-rendition
nothing_published: false
status: draft
---

## What this lane covers

6 records, under 1 official domain:

- **Engineering, Technology, and Applications of Science**: 6

The science standards publish no other cross-grade statement. The science and engineering practices and the crosscutting concepts are dimensions folded into each expectation, not standards of their own.

## What one record is

One record is one band-level engineering design expectation, read once although the export repeats it under every grade of its band. Its code scope names the band, K-2 or 3-5. The middle school band, MS-ETS1, is not here: the grade 6 document prints it, so it is in grade 6 science.

## Parts and how each is checked

- **Engineering design, K-2 band**: 3 records, read from `edu.us-ca.source.us-ca-cde-cacs-science-export`. Checked against `edu.us-ca.source.us-ca-cde-ngss-kindergarten-dci-pdf`, a second rendition. The department's kindergarten document arranged by disciplinary core idea, read with pdftotext -layout, prints the band's three expectations. Same granularity. It prints the codes with an en dash (K–2-ETS1-1). The documents of the band's other grades print them too.
- **Engineering design, 3-5 band**: 3 records, read from `edu.us-ca.source.us-ca-cde-cacs-science-export`. Checked against `edu.us-ca.source.us-ca-cde-ngss-grade4-dci-pdf`, a second rendition. The department's grade 4 document arranged by disciplinary core idea, read with pdftotext -layout, prints the band's three expectations. Same granularity. It prints the codes with an en dash (3–5-ETS1-1). The documents of the band's other grades print them too.

The expected count was counted in the file the records are read from, which is the only index. Such a count cannot show a statement that file lacks; the second check, which lists what the check rendition holds and no record carries, is what can.

## Statements skipped

None.

## Gaps if an optional source is missing

None.

## Left out at this level

Official material for this level that the pack records in none of its four subjects:

- **Transformative SEL: the High School and Adult bands (38 cells each)**: Outside the age range of the pack.
- **Transformative SEL: Conditions for Thriving**: Guidance addressed to adults in five roles, not statements about children.
- **Mathematics: the practice standard addition CA 3.1**: Marked for higher mathematics only.
- **English language arts: the appendices and the pages on text range, quality and complexity (Standard 10)**: Supporting material of the adopted document, not standards statements.
