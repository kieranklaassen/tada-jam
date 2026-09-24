# Pushable Rules

- **Verb:** rewrite
- **Depth engine:** rule-play (secondary: mystery)
- **Age band:** 10 to 12
- **Lens:** other
- **Hooks declared:** stars

## Loop

A room on a 12 by 7 grid. Picture tiles spell the rules, three to a sentence (a noun tile, IS, a property tile: FROG IS YOU, WALL IS STOP, PAD IS WIN, ROCK IS PUSH), read left to right and top to bottom. The child taps a cell and the frog walks there by the shortest free path; walking into a tile pushes it (and a chain of tiles behind it). Pushing a tile out of line breaks the rule and pushing one into line makes a new one, and the world obeys at once: a wall stops the frog only while WALL IS STOP is spelled, a rock can be walked over or pushed depending on its sentence, and whatever has WIN is what the frog must reach. Solving a room opens a fresh one; undo and restart are always there, and nothing is ever lost for good.

Three kinds of room are drawn at random, each with a barrier walking cannot get past:

- **wall**: a full wall, with WALL IS STOP loose in the frog's half. Break the sentence, walk through.
- **gate**: the only doorway is plugged by a rock that is STOP. Break ROCK IS STOP (or turn it into something else with the loose PUSH tile).
- **swap**: the pad is behind an unbreakable wall, so PAD IS WIN must become ROCK IS WIN by pushing a spare ROCK tile into the sentence, then the frog steps on a rock.

Every room is checked before it opens: a bounded search over every position the tiles and things could reach must find a way to win, otherwise the room is redrawn, so no room is a trap from the start (undo and restart always lead back to a winnable room). Later rooms add loose tiles (more sentences to make and more ways to spoil one), sometimes put FROG IS YOU within reach of a careless push (nothing is YOU, so nothing moves until undo), and sometimes leave a long way round the wall so rewriting is a shortcut, not the only way.

## What should vary on repeat play

The given play-5 line: the child breaks a rule on purpose, making the wall something the frog walks through, to cross a room that walking around it could not.

How the sim produces it: no room can be crossed by walking alone (except a detour room, where the long way round competes with a one-push shortcut). Play 1 pushes tiles by accident and finds out that a sentence is a lever. Later the same child reads a room before touching it: which sentence holds the barrier, which side to push it from (along the sentence keeps it whole, across breaks it), and which sentence to leave alone (FROG IS YOU). Every room is drawn afresh from the seed, so the layout, the side the frog starts on, the direction of the sentences (across or down) and the loose tiles all change, but the habit transfers: find the barrier's rule, take it apart. The signature names the kind of place the world ended up in (room kind, barrier shut or open, what wins, whether anything is YOU) and the solved signature says whether the child walked round or rewrote.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-9, arch-11 (6 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 2 of 6 runs (33%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 2, 1, 1 of 6.
- **Play 5 against play 1:** change 1.24 (1.24 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 15 adopted, 4 made progress. Tried: padGap down, rules down, rules up, solved up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective solved up; outcome variety 1.43 bits (by policy: greedy 0.92, random 1.93, repeat-one 0.92). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 33.3% with every hook on, 33.3% with all off):
  - `stars`: inconclusive (the persona model has no reward response); without it 33.3%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 2 of 6 target-panel runs (33%) start session 3, 16.7 points short of the 50% line (1 more run needed).
- Hook ablation says little for `stars`: removing it changed nothing the personas can register.
- Left first: `arch-9`, starting 1.3 of 5 sessions on average (the best in the target panel starts 3.0).
