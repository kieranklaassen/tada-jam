# Crossed Wires

- **Verb:** wire
- **Depth engine:** combination (secondary: emergence)
- **Age band:** 10 to 12
- **Lens:** other
- **Hooks declared:** stamps

## Loop

Three beetles trundle back and forth over pressure plates; a plate is on while a beetle stands on it. The child drags wires from a plate's dot (or a gate's output dot) to a lamp, the drawbridge, or a gate's input, and taps one of six grey sockets to seat a gate: not, both, either, a short delay, or a long delay. A tap on a beetle stops it (a beetle held on a plate is a steady signal); a tap on a plugged input takes the wire out. Every gate answers a few ticks late, so the courtyard answers each wiring in its own way: a not-gate wired back on itself flickers its lamp, a not through a delay blinks steadily, an either fed back on itself remembers. A traveler waits at the moat and crosses only if the wiring holds the bridge down long enough; then a new one arrives from the far bank.

## What should vary on repeat play

The given play-5 line: the child loops a not-gate through a delay to make a steady blinker on purpose, then wires two blinkers into a both-gate for a beat neither gives alone, constructions that only make sense after learning what each part does.

How the sim produces it: a loop's blink rate is the sum of the answer times around it (a bare not is a 3-tick buzz, a not plus a short delay blinks about twice a second, a not plus a long delay about once every three seconds). Two blinkers of different rates into a both-gate give an uneven beat; an either fed back on itself is a latch that a passing beetle sets. The traveler is the standing want: a plate wired straight to the bridge is never enough (the traveler slips), so it takes a held beetle, a latch, or a loop of three long delays. Parts only earn a place once the child knows what they do, so the same six sockets hold very different courtyards on play 5 than on play 1. Beetle speeds and start positions are seeded, which moves the natural rhythm the child builds on but not the parts.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-9, arch-11 (6 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 1 of 6 runs (17%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 1, 0, 0 of 6.
- **Play 5 against play 1:** change 0.23 (0.23 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 13 adopted, 4 made progress. Tried: blinking up, crossings up, kinds up, lit down, lit up, loops up, wires up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective blinking up; outcome variety 0.00 bits (by policy: greedy 0.00, random 0.00, repeat-one 0.00). Dominant strategy: no (the objective never varied).
- **Hook flags** (raw material for the guidelines; session 3 return 16.7% with every hook on, 16.7% with all off):
  - `stamps`: inconclusive (the persona model has no reward response); without it 16.7%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 1 of 6 target-panel runs (17%) start session 3, 33.3 points short of the 50% line (2 more runs needed).
- Hook ablation says little for `stamps`: removing it changed nothing the personas can register.
- Left first: `arch-9`, starting 1.0 of 5 sessions on average (the best in the target panel starts 2.0).
