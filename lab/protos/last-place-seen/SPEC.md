# Last Place Seen

- **Verb:** filch
- **Depth engine:** other-minds
- **Age band:** 8 to 11
- **Lens:** other
- **Hooks declared:** none

## Loop
Six hollow logs sit in a ring; a treasure is hidden in one and one log wears a flag. The child lifts the treasure (tap its log) and puts it down in another log (tap that log, or drag it there); at the flag, tapping the treasure pockets it. Two guards each walk to the log where they LAST SAW the treasure, not where it is. A shift or pocket is watched only if a guard's gaze is on the source or destination log at that instant; the view shows each gaze as a wedge and each belief as a dashed line ending in a "?". A watched shift sends that guard straight to the new log; a pocket under a guard's eye is caught and the treasure is re-hidden (both guards watch it hidden). A clean pocket is a haul: the flag moves and a new treasure is hidden.

The guards recheck by fixed habits (the same every session):

- **Goose** stares at the log it believes for 3 s, glances one log clockwise for 1.2 s, and every second cycle leans in to peek for 0.8 s. An empty log makes it lose its belief and search the ring clockwise, one log at a time, leaning in at each. It learns only by seeing.
- **Hound** walks with its nose down (gaze nowhere), stares at its log for 2.4 s, looks away for 1.4 s, and at the end of that pause sniffs out any move it did not watch and walks to the truth.

## What should vary on repeat play
The child knows the goose only trusts its last sighting and the hound sniffs out a move after a pause, so they shift the treasure while the goose stares at the old log and the hound is still looking away.

The sim produces it: the habits are constant, so they can be learned, while the world is not (which log wears the flag, where the treasure starts, where the guards begin, and the goose's peek phase come from the seed; the flag moves after every haul). Play 1 is reactive (wait for a moment nobody looks, get seen, get caught). Later plays anticipate: hop the treasure to a log the goose's clockwise glance skips, leave the goose fooled at the old log, use the hound's blind pause, and place the treasure "behind" the goose so its clockwise search reaches it last.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-7, arch-8, arch-9, arch-11 (12 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 2 of 12 runs (17%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 2, 1, 1 of 12.
- **Play 5 against play 1:** change 1.14 (1.14 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 25 adopted, 7 made progress. Tried: caught down, fooled down, fooled up, hauls up, shifts up, spotted down.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective hauls up; outcome variety 1.15 bits (by policy: greedy 1.00, random 0.98, repeat-one 1.00). Dominant strategy: no (the objective never varied).
- **Hook flags:** none declared.
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 2 of 12 target-panel runs (17%) start session 3, 33.3 points short of the 50% line (4 more runs needed).
- Left first: `arch-9`, starting 1.0 of 5 sessions on average (the best in the target panel starts 2.3).
