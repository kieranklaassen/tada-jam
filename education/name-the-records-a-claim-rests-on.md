---
title: A game that claims a school skill names the pack records the claim rests on, and its plan gives the standing and the check state of each one
applies_when:
  - designing a game that teaches counting, reading, science or another school skill
  - planning a game with a learning goal for a given age
  - writing a game's ART.md or PR text that names a school skill
  - reviewing a game that claims to follow a curriculum
tags: [learning-games, curriculum, standards, citation, check-state]
---

A claim such as "teaches counting to 20" or "follows the kindergarten standards" is a claim about official statements. The pack holds one record per official statement, so the claim can be checked only when the records are named.

Do:

- The plan lists every record the game is designed from, by pack id (`edu.us-ca.kindergarten.mathematics.objective.k-cc-1`) or by official code with its jurisdiction (`us-ca K.CC.1`).
- Records are found with `npm run education:find`: by `--age` or `--level` with `--jurisdiction`, by `--code`, or one record by `--id` with its pack id. Each record it lists has a `standing` and a `check` state.
- The plan copies both beside each record. The check states are `confirmed`, `unconfirmed` (printed with its reason), `stale` and `unchecked`.
- A claim that rests on a record that is `unconfirmed`, `stale` or `unchecked` says so in the same sentence, with the reason for an unconfirmed one.
- A code is given with its scope when the lookup returns more than one match: official codes are not unique, and the lookup lists every record that has the code. A record whose source prints no code is cited by pack id.

Do not:

- No claim of a school skill without a named record.
- No record described as checked unless its state is `confirmed`.
- `status: draft` is on every objective record and says nothing about the check. The check state is computed from the review files each time and is not stored on the record, so it is read again before a claim is repeated in a pull request.

Reason: `confirmed` means a second check read the record against the official source. In any other state the record's code, summary, gloss or notes may be wrong, and a reader of the claim has to know that.
