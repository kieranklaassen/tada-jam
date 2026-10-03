---
title: Inside games/ a pack record is cited by its pack id or by its official code with jurisdiction, never by a link and never by quoting official wording
applies_when:
  - writing a game's ART.md or PR text that names a school skill
  - adding a comment or a note to a game's files about the standard it is built on
  - designing a game that teaches counting and recording where the skill comes from
  - reviewing a game that claims to follow a curriculum
tags: [learning-games, citation, egress, art-guide, games-folder]
---

Do:

- In `games/<key>/ART.md` or in a source comment, a record is cited as its pack id (`edu.us-ca.kindergarten.mathematics.objective.k-cc-1`) or as jurisdiction and printed code (`us-ca K.CC.1`).
- What the record asks for is given in the game's own words. For a California record the record's `## Summary` may be used, since it is the pack's own text.
- A reader who wants the publisher's page goes from the id to the record, and from the record's `source` field to the source record under `education/sources/`, which holds the link.

Do not:

- No web address in any file under `games/`, `ART.md` included. The egress scan (`npm run egress:check`) reads markdown too and fails on an external URL.
- No official wording in any file under `games/`, from either jurisdiction. Official wording stays in the pack, where each record keeps it with its source line or keeps it out of the repo.
- No pack id in a string, in the manifest or in an asset. Nothing from the pack may be in the published build, and `npm run education:built` fails when a pack record id is found in `dist/`.
- No game imports or reads a file from `education/`. The pack is used while designing and building only.

Reason: an id or a code stays valid when a publisher moves a page, passes the egress scan, and lets a reviewer open the record and see its standing and check state.
