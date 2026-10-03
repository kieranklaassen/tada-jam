---
title: A child's age is turned into school levels by the pack's age table through the lookup command, the lane returned beside the grade keeps its label, age never gates content, and a gap in the pack is stated as a gap
applies_when:
  - designing a game for a five-year-old with a learning goal
  - choosing which grade, groep or level a game for a given age is designed from
  - setting a game's age band or its defaults from the child's age
  - reviewing a game that claims to follow a curriculum for an age
tags: [learning-games, age, grade-levels, lookup, gaps]
---

Do:

- The levels for an age come from the lookup, which reads the pack's age table (`education/ages.ts`):

  ```
  npm run education:find -- --jurisdiction us-ca --age 5 --subject mathematics --outline
  npm run education:find -- --jurisdiction nl --age 5 --subject mathematics --outline
  ```

  The records of one lane are then listed by level and subject, with `--level <level> --subject <subject>` in place of `--age` and `--outline`. The age is in whole years, 2 to 12. The subjects are `mathematics`, `reading-language`, `science` and `practical-life-feelings`.
- One age can return two levels, each with the sub-band that applies. The plan names the level or levels the game is designed from.
- The plan repeats the basis the lookup prints: `official`, `derived` or `convention`. The Dutch mapping from groep to age is convention, not law.
- For every California age from 5 up that returns a level, the answer also returns the subject's `cross-grade` lane, labelled cross-grade: its statements hold for every grade, not for this age in particular. From age 4 the Dutch answer also returns the `einde-po` lane, labelled end-of-primary goals: what a school works towards by the end of groep 8, not what a child of this age should master. A plan that uses such a record keeps that label.
- A gap is copied as the lookup prints it. California at age 8 returns no level, and ages 7, 9 and 12 return a level with a statement of what is missing. A lane can also print that nothing is published or that it holds no records.

Do not:

- No age-to-grade arithmetic outside the table.
- No gap filled from the grade below or above without saying that it is not the child's grade.
- Age never gates content. `ctx.childAge` may set a default, is handled when it is `null`, and never locks or hides anything (`AGENTS.md`, Tada R8). No game reads the age table at run time.

Reason: the table holds the official age rules where they exist and says where a mapping is only usual practice. A level guessed from an age can name a grade the pack does not hold.
