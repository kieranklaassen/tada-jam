# Hooks

A hook is a mechanic a prototype leans on: a score, a level, a timer, a win state, an unlock. The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. What follows says whether the simulated children needed each hook to keep coming back; it draws no conclusion about the guidelines, which is for a person to draw.

## The verdict rule (KTD7)

Each prototype that declares hooks is played on its target panel in several arms, each over the first 2 sessions with the same personas and seeds: every hook on, every hook off, and one arm per hook with only that hook removed. The number compared is the share of runs that start session 3.

- **needed**: removing the hook lowers the session-3 return share by more than 15 percentage points.
- **not needed**: removing the hook changes the affordances or the signatures, and return does not drop by more than that.
- **inconclusive (the persona model has no reward response)**: removing the hook leaves the affordances and signatures unchanged. Persona engagement follows learning progress and novelty, so it cannot register a reward.
- **n/a: reason**: the hook is the loop itself, so it cannot be removed.

## Ablation results

| Prototype | Hook | Session 3, all hooks on | Session 3, without this hook | Session 3, all hooks off | Removal changed affordances or signatures | Verdict |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `broom-on-a-fingertip` | `flags` | 0.0% | 16.7% | 16.7% | yes | not needed |
| `broom-on-a-fingertip` | `best` | 0.0% | 0.0% | 16.7% | no | inconclusive (the persona model has no reward response) |
| `chant-rope` | `streak` | 22.2% | 22.2% | 5.6% | no | inconclusive (the persona model has no reward response) |
| `chant-rope` | `tempo` | 22.2% | 5.6% | 5.6% | yes | needed |
| `clanking-chasers` | `level` | 6.7% | 0.0% | 0.0% | yes | not needed |
| `clanking-chasers` | `stars` | 6.7% | 6.7% | 0.0% | yes | not needed |
| `crossed-wires` | `stamps` | 16.7% | 16.7% | 16.7% | no | inconclusive (the persona model has no reward response) |
| `dawdle-parade` | `pond` | 16.7% | 25.0% | 25.0% | yes | not needed |
| `dip-shrink-sift` | `orders` | 20.0% | 20.0% | 20.0% | no | inconclusive (the persona model has no reward response) |
| `pass-the-glow` | `sweep` | 22.2% | 33.3% | 33.3% | yes | not needed |
| `pendulum-pen` | `guess` | 16.7% | 0.0% | 0.0% | yes | needed |
| `pendulum-pen` | `target` | 16.7% | 0.0% | 0.0% | yes | needed |
| `pushable-rules` | `stars` | 33.3% | 33.3% | 33.3% | no | inconclusive (the persona model has no reward response) |
| `sideways-rain-day` | `rainbow` | 0.0% | 0.0% | 0.0% | no | inconclusive (the persona model has no reward response) |
| `skipped-a-generation` | `wish` | 0.0% | 0.0% | 0.0% | no | inconclusive (the persona model has no reward response) |
| `sly-paws` | `match` | 66.7% | 25.0% | 16.7% | yes | needed |
| `sly-paws` | `crow` | 66.7% | 33.3% | 16.7% | yes | needed |
| `stones-that-breathe` | `bloom` | 13.3% | 13.3% | 13.3% | no | inconclusive (the persona model has no reward response) |
| `stones-that-breathe` | `widen` | 13.3% | 13.3% | 13.3% | yes | not needed |
| `sway-and-settle` | `next-mobile` | 11.1% | 11.1% | 11.1% | no | inconclusive (the persona model has no reward response) |
| `the-answering-can` | `stack-wakes` | 6.7% | 6.7% | 6.7% | yes | not needed |
| `the-sulking-lamp` | `warmer` | 50.0% | 33.3% | 33.3% | yes | needed |
| `tidy-ants` | `tidy` | 0.0% | 0.0% | 13.3% | no | inconclusive (the persona model has no reward response) |
| `tidy-ants` | `pink` | 0.0% | 13.3% | 13.3% | yes | not needed |
| `toes-in-clouds` | `flag` | 0.0% | 0.0% | 0.0% | no | inconclusive (the persona model has no reward response) |
| `toes-in-clouds` | `island` | 0.0% | 0.0% | 0.0% | no | inconclusive (the persona model has no reward response) |
| `under-the-cloth` | `score` | 40.0% | 40.0% | 40.0% | no | inconclusive (the persona model has no reward response) |
| `under-the-cloth` | `level` | 40.0% | 40.0% | 40.0% | no | inconclusive (the persona model has no reward response) |
| `what-the-owl-sees` | `dawn` | 16.7% | 16.7% | 16.7% | no | inconclusive (the persona model has no reward response) |
| `who-backs-off` | `stars` | 44.4% | 44.4% | 16.7% | no | inconclusive (the persona model has no reward response) |
| `who-backs-off` | `levels` | 44.4% | 16.7% | 16.7% | yes | needed |
| `wired-seasons` | `picture` | 33.3% | 16.7% | 16.7% | yes | needed |

Prototypes with no hooks (8): `last-place-seen`, `quarter-turn-table`, `scrapyard-toolbox`, `singing-plate`, `slump-castles`, `spot-or-stripe`, `stubborn-balloon`, `two-stone-pond`.

## Summary

32 hook rows across 22 prototypes: 8 needed, 8 not needed, 16 inconclusive, 0 n/a.
