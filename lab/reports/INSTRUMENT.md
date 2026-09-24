# Instrument

The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. This file records how the panel was built, what it was checked against, and what it can and cannot say. Version `u2-panel-1`, master seed 1.

## Frozen thresholds

The thresholds were chosen against the five fixtures below, then frozen before any real prototype was scored. Changing one means bumping the version, rerunning the fixture check, and recording the new values. In plain words:

- **Depth gate:** a prototype passes when at least 50% of its target-panel runs start session 3. The target panel is the personas within 1 year of the age band, widened to the nearest 2 when fewer fall in.
- **Panel shape:** 8 personas, 3 noise seeds each, up to 5 sessions per run, each capped at 5455 ticks (3.0 sim-minutes at 33 ms a tick). Every session builds a fresh sim, so an unlock or level hook restarts each session.
- **Clarity:** read only for prototypes that pass the gate. The first ten seconds (304 ticks) are played cue-blind, ignoring the affordance list. It reads low when fewer than 25% of touches change the sim, or the first change comes later than tick 180.
- **Dominant strategy:** repeat-one or greedy beats random on the objective by more than 25% of its spread while its outcome variety falls to 60% of random's or less.
- **Hook verdict:** a hook is `needed` when removing it lowers the session-3 return share by more than 15 percentage points (2 sessions played per arm).

### Every constant

| Constant | Value |
| --- | --- |
| `AIM_ATTRIBUTION_LIFT` | `1.5` |
| `AIM_EXPLORE` | `0.35` |
| `AIM_GAIN` | `700` |
| `AIM_MAX_PER_SESSION` | `4` |
| `AIM_MAX_WINDOWS` | `5` |
| `AIM_MIN_TOUCHES` | `4` |
| `AIM_OBJECTIVE_BIAS` | `0.95` |
| `AIM_PATIENCE` | `2` |
| `AIM_SURPRISE_FULL` | `0.3` |
| `AIM_WINDOW_TICKS` | `240` |
| `BOREDOM_REROLL` | `180` |
| `BOREDOM_WINDOW` | `480` |
| `CLARITY_MAX_FIRST_TICK` | `180` |
| `CLARITY_MIN_SHARE` | `0.25` |
| `DEFAULT_MASTER_SEED` | `1` |
| `DOMINANT_COLLAPSE` | `0.6` |
| `DOMINANT_MARGIN` | `0.25` |
| `DRAG_DISTANCE_MAX` | `320` |
| `DRAG_DISTANCE_MIN` | `100` |
| `DRAG_MOVES_MAX` | `6` |
| `DRAG_MOVES_MIN` | `3` |
| `DRAG_TO_OTHER` | `0.6` |
| `DRAIN` | `1` |
| `FIELD_MARGIN` | `8` |
| `FINGERPRINT_STRIDE` | `6` |
| `FIRST_TEN_TICKS` | `304` |
| `FOLLOW_KIND` | `0.85` |
| `GATE_SESSION` | `3` |
| `GATE_SHARE` | `0.5` |
| `GREEDY_CANDIDATES` | `4` |
| `GREEDY_REPLAY_BUDGET` | `98400` |
| `HOLD_MAX_TICKS` | `40` |
| `HOLD_MIN_TICKS` | `12` |
| `HOOK_ARM_SESSIONS` | `2` |
| `HOOK_NEEDED_DROP` | `0.15` |
| `KEY_CELL` | `100` |
| `LEFT_FULL` | `0.7` |
| `LP_BASE` | `0.5` |
| `LP_GAIN` | `80` |
| `LP_WINDOW` | `20` |
| `LP_Z` | `2` |
| `MASTERY_PULL` | `2` |
| `MEANINGFUL_GAIN` | `12` |
| `NOISE_SEEDS` | `3` |
| `NOVELTY_BASE` | `0.5` |
| `NOVELTY_GAIN` | `300` |
| `NOVELTY_PULL` | `2` |
| `PANEL_MARGIN_YEARS` | `1` |
| `PANEL_MIN_PERSONAS` | `2` |
| `PULL_FULL` | `0.2` |
| `PULL_WINDOW` | `1200` |
| `REDISCOVERY` | `0.7` |
| `RETURN_FLOOR` | `0.03` |
| `SELFPLAY_DECISION_TICKS` | `15` |
| `SELFPLAY_EPISODE_TICKS` | `600` |
| `SESSIONS` | `5` |
| `SESSION_CAP_TICKS` | `5455` |
| `SETTLE_TICKS` | `6` |
| `THRESHOLDS_VERSION` | `u2-panel-1` |

## Personas

Kaia is the only documented child. The age of Tess is an assumption: the Pebble Table plan describes the trial cohort as 4 to 6 year olds and records no age, so 5 is a guess to correct in `personas.ts`. The other six are archetypes whose traits vary independently of age.

| Persona | Age | Touch jitter (px) | Attention (ticks) | Novelty | Mastery | Aim invention | Return propensity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `kaia` Kaia | 4 | 34 | 1500 | 0.6 | 0.4 | 0.4 | 0.97 |
| `tess` Tess | 5 | 30 | 1800 | 0.5 | 0.5 | 0.5 | 0.97 |
| `arch-3` Archetype 3, jittery and quick to tire | 3 | 46 | 1000 | 0.7 | 0.3 | 0.25 | 0.95 |
| `arch-6` Archetype 6, mastery seeker | 6 | 22 | 2600 | 0.3 | 0.7 | 0.6 | 0.95 |
| `arch-7` Archetype 7, patient novelty chaser | 7 | 30 | 3600 | 0.8 | 0.2 | 0.45 | 0.93 |
| `arch-8` Archetype 8, precise and driven | 8 | 16 | 2200 | 0.4 | 0.6 | 0.7 | 0.97 |
| `arch-9` Archetype 9, jittery novelty chaser | 9 | 26 | 1600 | 0.75 | 0.25 | 0.4 | 0.93 |
| `arch-11` Archetype 11, patient mastery seeker | 11 | 14 | 3200 | 0.25 | 0.75 | 0.8 | 0.97 |

Every parameter is labelled `research` when the age-band cue table supports it, `default` when an agent or owner chose the number:

| Parameter | Label | Note |
| --- | --- | --- |
| `age` | default | Kaia (4) is a documented child; Tess (5) is assumed. |
| `touchJitter` | default | Larger for younger children is the direction; the numbers are defaults. |
| `attention` | default | No attention spans are cited; shorter for younger children. |
| `draw` | default | Interest follows learning progress plus novelty (Kidd and Poli); the split between the two per persona is a default. |
| `aimInvention` | default | How readily a bored persona sets itself an aim. |
| `returnPropensity` | default | How readily the persona comes back after a session. |
| `gestureMix` | default | More taps and holds when young, more drags when older. |
| `tempo` | default | The gap between touches. |
| `focus` | research for kaia (4), arch-3 (3); default for tess (5), arch-6 (6), arch-7 (7), arch-8 (8), arch-9 (9), arch-11 (11) | How many affordances are weighed at once: "one or two clear functions" for the 3 to 4 row (Marsh et al. 2018); the 5 and up counts are defaults. |

## Instrument validation

The panel was played on five fixtures whose depth is known (master seed 1, computed when this file was written). Two must pass the gate, three must fail it, and both passing ones must outrank all three failing ones on the mean sub-signal rank. **The check holds.**

| Fixture | Expected | Gate | Runs starting session 3 | Share | Mean rank |
| --- | --- | --- | ---: | ---: | ---: |
| `emergent` | pass | pass | 14 of 18 | 77.8% | 4.67 |
| `ladder` | pass | pass | 16 of 18 | 88.9% | 4.33 |
| `noise` | fail | fail | 0 of 18 | 0.0% | 2.33 |
| `constant` | fail | fail | 0 of 18 | 0.0% | 1.83 |
| `score-only` | fail | fail | 0 of 18 | 0.0% | 1.83 |

Rank order, best first: `emergent`, `ladder`, `noise`, `constant`, `score-only`.

## Calibration

- The passing fixtures are engineered to hold a simulated child: they reach session 3 in 78% to 89% of target-panel runs. The 30 real prototypes in this run reach it in 0% to 67% (median 15%). Real prototypes sit well below the engineered fixtures.
- So absolute rates are not comparable to the fixtures, nor to any real child. The ranking among prototypes is the meaningful part.
- **What the gate is evidence of:** simulated children of the target ages, weighing new things against getting better at something, kept coming back to this loop for a third session at least half the time. A loop that keeps offering something new or learnable to that simple model passes.
- **What it is not evidence of:** that a real child comes back, enjoys the loop, or understands it. It does not measure fun, sessions restart the sim fresh so depth that builds up across visits is undercounted, and a fail may mean the personas did not find the depth rather than that none is there. Only real children can check any of it.
