# Answers for Mierennest: the sheet's third round, the toy's stills, and the game run

## The sheet: PASSED round 3, confirmed from the diff

The lead compared the sheet part at `42676f5` (the text the second checker read) with the sheet part at `734513b`. Four lines changed, and each holds its replacement from `docs/build/answers/mierennest-3.md` word for word; nothing else above `## The look` differs. By the guide's rule for a round that is only pastes, no checker reads it again.

PASSED round 3. The sheet part's sha256 is `49a588ec48b43cfce6492461afa1db4a7e440ce46f4496f1c48f651e71cebebb`, at commit `734513b`. Write that into the status block and take `Open: sheet ready for check` out. From here a sentence above `## The look` changes only when the built game makes it untrue, and each such change is listed in the status block for the closing run.

## The toy's stills

The four points of the look are mended: the kingdom and the raiders are told apart at a glance, the child's ant is the one with the kerchief, and the camp keeps clear of the bell. They went to the owner with a link to play the toy; his answer, if he gives one, comes in a later file. One thing is left of the third point:

- **Mud in a tunnel.** You say it yourself: in a tunnel the mud's body is only a little lighter than the dark behind it. A patch of mud laid on a tunnel floor is the main use of mud in the game, so that is where it has to read best. Either lift and warm the dark of a dug cell a little (which would also set the creatures off better) or change the mud; yours to choose. Test: the palette test holds mud apart from the dark of a tunnel by at least the margin it holds sand apart from earth.

## What you listed for the owner, and what the lead answers in his place

- The bell the child taps calls the raid: yes, that is decision 2 of the brief.
- A raid went well when no invader finished its act in a chamber: yes, that is the line.
- The two small marks the ending leaves (glow-worms lit in the chambers, the dung fly's leaf on a stalk at the camp): keep them. They are a state of the world and no count or badge, and the sheet that passed has them. They go to the owner in the pull request as a default taken in his place.

## Run 3: the game

As your brief's run 3 and `docs/build/runs/game.md` say: raids on call, the three invader kinds with their habits and their own acts in a chamber, the catapult and the cannon (dragged to a place, loaded, fired by a tap, loaded again in a raid), the put-back by the workers with the place that gave still told, the designed order with its hidden position, the kingdom's growth, the first showings under ruling 12, and the save. Not the great raid and not the ending: they are run 4.

With it:

- **Rooms that look lived in**, from the second answers file: the workers' things on the back wall of a room.
- **The dig's slow frames.** Your own work a frame while a finger digs without pause is 13 to 17 ms at the ninety-fifth percentile under six times throttle, against a bar of 8. Bring it under the bar or show which part is the machine's and not the game's. Three places to look: a frame that settles the ground takes a bounded number of steps however long the frame before it was, so a slow frame cannot make the next one slower; voices and crumbs come from pools made at load, so a mouthful allocates nothing; and the audio context is made once at the first touch and kept. Measure the same run again and write the table again.
- **The fullest frame of a raid** with every kind on screen: its draws counted by a test, and your own work a frame measured as above.
- Tests that play whole raids from a seed, as the plan's unit U5 lists: the same nest and the same raid with no shot fired play the same way twice; a raid leaves the ground, cell for cell, as it was; every raid ends by itself at every place in the order; a put-away at any instant of a raid reads back with the invaders at the camp and the ground as built.

At the end: three stills on a stills branch (a raid with every kind inside; a wall that gave and the workers putting it back; a machine firing and what its shot did), the status block, push, the report.
