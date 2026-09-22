# Concepts

> Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Art direction

### Quality bar
The set of properties every jam game must have regardless of how it looks: alive at idle, motion and sound on every touch, physical weight with squash and follow-through, kid-clear silhouettes and touchable things, wordless idle guidance, a smooth frame rate on a mid-range iPad, no externally fetched assets, and a recognisably distinct look of its own.
*Avoid:* fidelity bar (the earlier, narrower Tada term this extends)

The quality bar is style-independent: a game in any Claimed style is held to the same bar, and a game's pull request states how it meets each line with a measured frame rate.

### Claimed style
A visual direction that one game has registered as its own look, so no other game in the jam may use it.
*Avoid:* house style, jam style

Styles are claimed per game, never per jam. Techniques (how something is rendered or kept fast) may be shared between games; a look may not, and two games should never be mistakable for each other in a screenshot. A game claims a style only after a Style spike.

### Style spike
A quick build of a game's real scene in a candidate style, captured as a screenshot at iPad-landscape size with a measured frame rate, done before any full visual build.

The spike is what turns a style choice into evidence: it shows the look reads clearly for a child and fits the frame-time budget before the style is claimed.

### Art guide
The per-game document that describes a Claimed style: its palette, materials, lighting, motion rules, and how the game meets the Quality bar.

Style-specific guidance lives only in a game's art guide; jam-wide guidance covers the Quality bar and the registry of Claimed styles, never one game's look.

## Flagged ambiguities

- "Art direction" had been used for both one game's look and the jam-wide standard. These are distinct: a game's look is its Claimed style, described in its Art guide; the jam-wide standard is the Quality bar.
