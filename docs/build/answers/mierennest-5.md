# Answers for Mierennest: the game run's stills, one sheet line from the lead, and run 4

CI is green on your commit `981441c5`. The three stills of the game went to the owner. The lead read your status block, the frame cost and what you call still weak.

## One line of the sheet, written by the lead (your point 7)

You are right that a room dug beside the shaft is one room with the shaft, so every invader is inside the moment it comes down. The shaft is left out of the measure. Paste this as it stands; it is the only change above `## The look` in this run, and because the lead wrote it the paste is confirmed from the diff.

Under "What a chamber is", replace the first bullet (the one that begins "A **room** is open space") with:

> - A **room** is open space that holds a clear block at least 4 cells wide and 3 cells high. All such blocks that overlap or touch along a side are one room. A tunnel two cells high is never a room, however long. The shaft a new nest starts with (the three columns under the mouth, three cells deep) is the way in and no part of any room: no block is counted in its cells, so an invader coming down it is not yet inside.

Bring `chambers.ts`, the raid's measure of "inside" and their tests into line, and record the sheet's new commit and hash in the status block as "one line from the lead, answers file 5".

## Frame cost

Accepted as you show it: the game's own work without the pixel calls is 2.9 to 3.5 ms at the ninety-fifth percentile at six times throttle, and what is over the bar is software drawing on the processor. The pull request will say exactly that, and that nothing was measured on a graphics card. Keep the table current.

## What the stills show, to mend in run 4

1. **A raid in a small room is a heap.** You say it yourself. A raid is read by who is where and what each one does. So one invader acts in a chamber at a time: a second that reaches a chamber where one is acting waits at its door, in view, with a waiting fidget of its own kind, and goes in when the first has left. Test, on the raids played from seeds: at no tick does an invader's face lie under another invader, under the queen or under a worker, inside the nest.
2. **The machines are the smallest made things in the picture.** The catapult and the cannon are what the child who designed this game asked for by name. Draw each to the whole of its two-by-two place, in a hue nothing else in the nest has, with its load seen in the cup or the muzzle at a glance, and let the shot be large: recoil, smoke or a twang that shakes the cup, a trail. Test: a person shown the raid still points at the machine and says what it is loaded with.
3. **The party at the log covers the camper beside it.** The camp's overlap test holds for a party of every size the order lays out.
4. **A lump carried back in the put-back cannot be seen.** The worker holds it over its head, and the place that gave is told until the next raid, as the sheet says.

## Run 4: the great raid and the ending, to the gates

As the plan's unit U6 has it: the dung beetles rolling their balls, led by the dung fly from the air; a ball breaks what is thin and is stopped by what is borne and bound; with the fly brought down the army loses its way and rolls home; the ending scene plays once, with its fields saved when the great raid is judged (ruling 12), and afterwards the kingdom is found as it was left, with its two marks, and raids can still be called (`open-kingdom`). Tests as U6 lists them: a put-away in the instant the last of the army turns back reads back with the ending seen and plays no scene; after the great raid, turned back or not, the ground is as built; no frame of the ending draws confetti, a star, a numeral or a letter; the fullest frame of the great raid is counted against the draw budget and your own work a frame measured.

This run ends at the gates: the whole suite, the build and the built-asset checks as CLOUD.md lists them, pushed, so that CI reads green on your tip before the closing run. Leave the six unmet sentences of your status block (1 to 6) for the closing run, unless one is cheap to build on the way.

At the end: three stills on a stills branch (the great raid coming down the mouth; the fly brought down and the army turning; the kingdom after the ending with its two marks), the status block, push, the report.
