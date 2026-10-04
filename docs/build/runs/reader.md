# The reader's brief

Before a game is brought into the jam, someone who did not build it reads its whole folder against its design sheet. The lead has that done for every game, and so far every game has come back from it with promises unkept. So a builder has it done first, by a subagent that has not seen the builder's session: hand it this page and the path of the game folder, and nothing else. The reader runs on the same model as the builder: start it with no model setting of its own and as a general-purpose agent, never as an agent type that picks a smaller model by itself (the owner's rule, in `../CLOUD.md`). The builder fixes what comes back and has it read again by a fresh subagent, until the last line says READY, and puts that last report in the status block of `REFINEMENT.md`. Each reading tends to find other things than the one before, so there is a bound: if the fourth reading is still not READY, fix what it found, write in the status block the line `Reader: stopped after four readings` with what you judge is left and why it is slight, and stop there. The lead's own reader decides from that.

## For the reader

You are checking one game folder, `games/<key>/` (and `scripts/intersections/games/<key>.ts` where there is one), before it is merged into a public repository. Read only: change no file, run no git command that writes, start no server. The repository's rules are in `AGENTS.md` at its root; read it first. The game's age band is in its `manifest.ts`.

Read every file in the folder and report against these six rules, one heading each, with file and line for every hit and "clean" where there is none.

1. **Official wording.** The sheet (`ART.md` above `## The look`) names learning-standard records by id or code. No sentence anywhere in the folder may quote or closely track the official text of a California standard. Look for sentences in a curriculum register that read as lifted, and for any run of eight or more words or numbers that looks copied from a standards document. Dutch statements may be quoted. You have no copy of the official text: flag what looks lifted and say why, and do not go looking for the official text anywhere.
2. **Web addresses and outside requests.** No web address; no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `localStorage`, `sessionStorage` or `IndexedDB`; no import from outside the allowed packages, from `harness/` or from another game.
3. **Names.** No name of any AI model, AI vendor or coding assistant in any file, and no person's name or e-mail address.
4. **Record ids in the build.** A record id or official code may stand in `ART.md`, in `REFINEMENT.md` or in a source comment, never inside a string or a template string in a `.ts` or `.tsx` file.
5. **Drawn text.** In a game whose band starts below 6: no text call, text sprite, DOM text, title attribute, emoji, digit or letter shape drawn for the child. In a game whose band starts at 6 or above: numerals and mathematics signs only through the game's `symbols.ts`, each on or beside the quantity it stands for, none standing alone, none that gauges how well the child did; no letter, word or unit abbreviation anywhere. In both: look at the shapes for signs nobody meant, such as two bars that cross and read as a plus or an X, a bar that reads as a minus, a ring that reads as a zero, a cross on a doctor's thing. Say what you find and where on the screen it would be.
6. **The game does what its sheet says.** Read the sheet part sentence by sentence: the toy, the scenes, the grid of things and what each does and sounds like, the characters with their own moves and tastes, the secrets, what is saved. For each thing the sheet says a child sees or hears, find where the code draws it and where it sounds it. List:
   - what the sheet promises and the code only sounds, only draws, or does not do ("every time" means every time; "exactly" means exactly);
   - a comparison, a numeral or a reading that the sheet's claim or its records lean on and the game does not show;
   - what is saved and the sheet does not name, or named and not saved;
   - whether putting the game away in the middle of a drag or a scene could make a move the child did not make, lose something, or replay a scene;
   - how the grown-up frame-rate overlay opens, and whether a child could open it by accident.

   The builder's own lists in `REFINEMENT.md` say what it already knows. Name only what is still true of the code, and say for each whether the builder lists it.

End with one line: `READY` if rules 1 to 5 are clean and rule 6 has no promise unkept, otherwise `NOT READY:` and the count for each rule. Keep the report under 600 words. The report is about the folder only.

## For the builder, on what comes back

A promise unkept is built, or the sheet's sentence is changed as step 2 of [`closing.md`](closing.md) says and the next round asked for; it is never left for the lead. A hit on rules 1 to 5 is fixed before anything else. Something the reader has wrong is answered in one line in the status block, with the file and line that show it.
