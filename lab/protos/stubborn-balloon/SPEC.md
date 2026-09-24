# Stubborn Balloon

- **Verb:** pat
- **Depth engine:** mastery (secondary: mystery)
- **Age band:** 2 to 5
- **Lens:** physical-toy (balloon-keepy-uppy)
- **Hooks declared:** none

## Loop
A big slow balloon sinks through the field and the child pats it. Any pat lifts it (a two-year-old can ignore everything below), but WHERE on the balloon the finger lands is the hidden control: a pat under the middle sends it straight up, a pat off to one side spins it so it curls that way (a spoke pinwheel and a curved trail make the spin visible). Spin builds when pats repeat on one side and is taken away by a pat on the other or by a middle pat. A finger held beneath a sinking balloon catches it and it rests on the fingertip (slide the finger too fast and it slips off and curls away). A bear waits across the field; when the balloon floats over its paw it reaches up and bats it back the way it came, harder when the balloon crosses at the paw's sweet height, then ambles to a new spot, so every crossing is a fresh aiming problem (which side to pat, how far out). Pats are a little stubborn: spin, lift and drift carry a few percent of seeded noise, and a gentle wind wanders. Tapping the bear makes it wave.

## What should vary on repeat play
The child now pats beside the balloon on purpose to curl it across the field to the waiting bear, having found that off-centre pats spin it, where on play 1 every pat only sent it up.

How the sim produces it: straight pats never get the balloon across (they only lift it), so the bear is reached by luck at most; the only reliable way is the off-centre curl. A single pat's curl distance grows with the offset (about 80 px at 0.3 radii out, 200 at 0.5, 400 at 0.8), so the child learns to size the pat to the distance, and the bear walks to a new spot after each bat so the side and the size change every crossing. Repeated same-side pats stack the spin to cross the whole field; an opposite pat cancels it (a way to brake). The bat strength (the events `bat` and `bat-sweet`) depends on the height the balloon crosses at, a second axis to refine. Cradling is optional slack: it stops the sink so the child can line up. Feedback for discovery: `pat-straight`, `pat-curl-left`, `pat-curl-right`, `cradle`, `slip`, `bat`, `bat-sweet`, `landing`, `bear-wave`. With hints on, an idle ring points at the balloon, and after three straight pats with no curl a ghost pat shows the bear's side of it.

Signature: place (floor, cradle, high, low) x curl (straight, left, right, air only) x bear (waiting, reaching, batted), at most 24.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: kaia, tess, arch-3, arch-6 (12 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 1 of 12 runs (8%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 1, 0, 0 of 12.
- **Play 5 against play 1:** change 0.19 (0.19 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 16 adopted, 3 made progress. Tried: curlPats down, curlPats up, height up, landings down, nearBear down, nearBear up, pats down, pats up, rally down.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective bats up; outcome variety 0.00 bits (by policy: greedy 0.00, random 0.00, repeat-one 0.00). Dominant strategy: no (the objective never varied).
- **Hook flags:** none declared.
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 1 of 12 target-panel runs (8%) start session 3, 41.7 points short of the 50% line (5 more runs needed).
- Left first: `arch-3` and `kaia`, starting 1.0 of 5 sessions on average (the best in the target panel starts 2.0).
