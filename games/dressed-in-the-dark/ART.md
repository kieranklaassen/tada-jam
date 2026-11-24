<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The look follows the sheet at the end of this file.

## The band and its age rule

Ages 3 to 7. The youngest age governs: the 3 to 4 row of the cue table. Its "Avoid" column holds in full: no text, numerals or icons to decode, no spoken instructions, no verdicts, one live activity, and no tool before it means something. The pack's rule for ages 2 to 4 governs the hand (a tap does everything, large separate targets, forgiving drags) and its rule for ages 4 to 6 governs the comedy (tricks, and a victim who overreacts and is never hurt). The band starts below 6, so nothing on the kid side is a word, letter, numeral or sign.

`ctx.childAge` sets one default: at 5 and older the wardrobe door starts open, and four more garments hang on the line from the first night. At 4 and younger it starts shut, and the child opens it with a touch whenever it likes. `null` starts shut. A saved door wins over the age.

The dark never frightens: the window, its moon and the clothes line stay lit all night, every bed keeps its gold outline, nothing in the dark is drawn as a threat, and the lamp cord works at every moment.

## The toy

The finger carries a garment off the lit line into the dark over a bed and lets it go. On the way it loses its colour and is a gold outline. Over a quilt, the quilt lifts its hem. Let go, it slides in: the quilt bulges and settles, the garment makes the sound it makes going on (a zip, a clang, a squelch), and the sleeper answers in its own voice with its own twitch. Nothing else is needed for that to be worth doing again: nine garments by five sleepers sound like forty-five different small disasters, and stacking three more on the same sleeper makes its quilt taller and its murmur more put out. A tap does the same without a drag: a tapped garment makes its sound and floats a little off its peg with a bright edge, and the next tap on a bed sends it there to slide in. A tap on another garment hangs the first back and lifts the other; a second tap on the same garment hangs it back. A tap on a quilt with no garment in hand or off its peg is the second toy: each sleeper answers differently. The cord is the third: one pull turns the whole room over.

## The object-by-action grid, and what is new on day 15

| | touched on the line | put on in the dark | worn and breathed in | worn and walked in | shown by the lamp |
| --- | --- | --- | --- | --- | --- |
| Bell cap | it swings and tinkles | tinkle, then one ping under the quilt | a small bell at every breath | a bell at every step | the bell swings before the sleeper's eyes, ding, dong, ding |
| Saucepan | it swings and bongs | clang over the ears | the snore comes back hollow | bong, bong at each step | the pan spins once on the head with a ringing whirl |
| Feather hat | a soft brush | brush, then a sneeze in the wearer's own voice | a tickle and a small sneeze every third breath | a swish at each step | a feather drifts down past the nose with a falling whistle |
| Nightgown | a rustle | a long rustle going down | a soft hush with the breath | a trailing rustle | the frill bounces with a starchy ruffle |
| Armour | a clank | four clanks, top to bottom | a creak with the breath | clank at each step | the visor plate drops a notch with one sharp clack |
| Tutu | a springy twang | a twang that wobbles out | a low wobbling hum with the breath | a twang at each step | the skirt pops out flat and quivers with a long boing |
| Rain boots | a rubber squeak | two squelches | a squeak as the toes curl | squelch at each step | the boots slap their toes |
| Slippers | a soft flap | flap, flap, and the sleeper gets up | the soles tap together | a shuffle at each step | the slippers' ears wag, pat-a-pat |
| Skates | the wheels whirr | click, click, whirr, and the sleeper rolls off | a wheel ticks round | one long rattle | the wheels spin with the legs still, a rising whizz |

The wrong use is the only use: a goat is not meant to wear a tutu. All nine may go on one sleeper at once. Hats stack on hats, each body garment makes the body rounder, each foot garment makes it stand taller.

On day 15: the child puts the bell cap on the goat so as to hear it, walks it with the slippers past the hen, rolls the hippo to the far end with the skates, dresses all five by sound alone, and knows before pulling the cord who will sit up as what. New things found by playing: which garment each sleeper loves, the three whole sets and the part each is acted in by each of five bodies, how to send any sleeper to any bed, and catching a sleepwalker on the open floor by pulling the cord.

## The representation

No school idea is represented. What is true throughout is place: five beds that stay, five sleepers that can move, and nothing that moves without being heard.

## The four mechanic questions

- **Swap.** The content could not be replaced: the child acts on what it heard and remembers, and the joke is only as good as that memory.
- **Attention.** At the moment of decision the child thinks about who lies where now, and what they already have on.
- **Fun.** Memory is used in the most enjoyable moment: letting go of the tutu over the bed where the crocodile ought to be.
- **Guess.** Random dressing always works and is always funny. Aiming is a power the child grows into, and nothing asks for it.

## The error as a consequence

There is no wrong garment and no wrong bed. A child who meant the goat and dressed the hen hears the hen cluck and sees her quick round hop under that quilt at once, so ear and eye both say where it went wrong before the lamp does. Nothing is lost: a drag out from that bed brings the last garment back with its sound played going off, a tap on an empty peg brings that peg's own garment home from whoever wears it with the same sound, and the child tries another bed. A drag survives a briefly lifted finger. A garment let go nearer to a bed than to the line slides into the nearest bed; one let go nearer to the line goes back to its peg.

## The designed order, and what is stored

There is no ladder: nothing gets harder unless the child makes it so. One new thing at a time comes from the world. A first visit starts by lamp light with nobody dressed. With the door shut, the line has five garments, none of which makes a sleeper walk: bell cap, saucepan, armour, tutu and rain boots. The wardrobe door stands not quite closed with the nightgown's sleeve sticking out, and behind it are the four others: feather hat, nightgown, slippers and skates. Opening it is the child's own act, and the four then hang on the line for good; where the default of 5 and older has it open, they hang there from the start.

The template's `position` and `finished` stay in the record and are never read by the rules.

Stored: which sleeper lies in which bed; what each sleeper wears, in order; whether the lamp is on; whether the door is open. A lamp found on is found with every reaction over. A walk is saved as finished at the touch that causes it: the garment worn and both sleepers' beds. A garment in the hand is saved where it came from, and one lifted off its peg by a tap is saved on its peg; a drag that is cancelled puts it back there.

## The characters and their fixed tastes

| Sleeper | Body and way of moving | Asleep | Awake and appalled | Loves | Never notices, then does |
| --- | --- | --- | --- | --- | --- |
| Goat | narrow, stiff, all from the beard; small sharp jerks | a trembling bleat | jumps straight up, stamps, beard points at the garment | saucepan | rain boots |
| Hippo | very wide, slow, everything follows late | a deep rumble with a pop at the end | sinks and hides its face in both hands, ears still out | tutu | slippers |
| Hen | round, quick, from the neck; freezes between moves | a rising string of small clucks | falls flat on its back with both feet in the air, gets up, falls again | rain boots | nightgown |
| Crocodile | long, vain, from the jaw; sways | a thin whistle and a snap of teeth | jaw drops to the chest, then snaps shut with the head turned away | feather hat | armour |
| Pig | soft, springy, from the belly | a snort in, a wheeze out | spins once to look at its own back and squeals | skates | bell cap |

The one want: by lamp light all five want sleep, yawning, and look at the cord. In the dark every sleeper with nothing on wants to be warm, with a bare foot out from its quilt, seen as a gold outline; only the one nearest the middle shivers, so one asks at a time. Once dressed it draws the foot in, is warm and stops, and the next nearest with nothing on begins. When all five have something on, they want to turn over, every quilt leans toward the cord, and its gold handle sways. Each sleeper also has a dream: touched, it shows for a moment a puff with the one garment it loves, which is how a child can learn the tastes and tell the sleepers apart with the sound off.

At the lamp a sleeper in what it loves strokes that garment and beams before it looks at the rest. One in what it never notices looks at the others first, and only then down, for a late and bigger start. Anything else gets its appalled reaction. With several garments on, one reaction is played: the loved one's if it wears that, and after it the appalled one if anything else is on; otherwise the late one if it wears what it never notices; otherwise the appalled one. The garment that does what it does by the lamp is the loved one, then the never-noticed one, then the one put on last. A sleeper in a whole set plays its part in place of its reaction. The pose it ends in is the part's, or that of the last reaction played. Reactions are about the garment and the body it is on. They are never about the child.

## The scenes

- **The lamp goes on** (the twist and the ending of a night). Caused by the cord. The lamp swings and the room turns red and gold; all five sit up with a gasp in five voices; each looks down at itself; then from the wardrobe to the lamp each who wears something does its own reaction, at most a second and a half apart, while the others look on and bare sleepers laugh. The three sets are saucepan, armour and rain boots (the knight); feather hat, nightgown and slippers (the grand lady); bell cap, tutu and skates (the circus rider). A sleeper wearing more than one set plays the one completed last, which the stored order gives. Whoever wears a whole set plays its part last: the knight salutes and clanks, the grand lady curtsies and fans itself, the circus rider turns on one toe with the bell going. It takes 4 to 10 seconds, filled in from who wears what. Any touch ends it with everyone in the pose they were going to and is answered as itself in the same frame, so a touch on the cord also puts the lamp out. They stay that way as long as the child likes. By lamp light everything still answers: a touched sleeper does its reaction again, a garment goes on or comes off as it does in the dark and the sleeper reacts to it at once, and nobody walks, since a sleeper who is awake put into slippers or skates only looks down and taps or rattles its feet. The pose found on load follows from what each one wears.
- **A walker caught.** If the cord is pulled while someone walks, it stands frozen on one leg in the light on the open floor, looks left and right, and scuttles to the bed it was going to. This is the first beat of the same scene.
- **The lamp goes out** (the beginning again). Caused by the cord and by nothing else. Each sleeper throws off what it does not love and those garments flap back to their pegs; what it loves it keeps on and hugs. Five yawns, five quilts, the window. It takes 4 to 6 seconds, filled in from who wears and loves what; any touch ends it with every garment at its place and everyone in bed, and is answered as itself in the same frame.
- **A sleepwalk.** Caused by slippers or skates going on. The quilt goes flat, steps are heard crossing the room from one side to the other with whatever the walker wears, its own small footprints come and go along the floor, the sleeper in the other bed mutters, gets up and goes back the other way. Slippers: one bed toward the wardrobe. Skates: to the last bed, by the lamp. With no bed left on that side it bumps its nose (a bonk, a murmur) and goes back to its own. A walk never holds up another touch: a garment let go over a bed goes on the sleeper seen lying in it, or, where the bed is empty, on the sleeper the running walk is bringing to it, wherever that sleeper is seen; a garment is taken off by the same rule; and slippers or skates put on during a walk start their own walk when that one is over. A cord pulled then ends the running walk and every waiting one, and everyone who is not in its saved bed scuttles to it. Every walk is worked out from the stored beds and saved at the touch that caused it. A walk lasts at most 5 seconds.

Everything a scene will save is saved when it starts. On load nothing plays: by night all are asleep in their beds, and by lamp light all sit in the pose they ended in.

Nothing starts by itself. In the dark the snoring sinks to almost nothing after a while untouched. World-time events are limited to ordinary sleep: turning over, a twitch, a sigh.

<!-- the look follows; it is not part of the sheet -->

## The look

Lacquer miniature: the first of the rows set aside for this game, kept after its first stills.

A painted box lid, in two lights that are two different pictures.

- **By night** the lid is mirror-black. Everything on it is only a fine gold line: five onion-arched beds, five equal domed quilts in fish scales, a wardrobe, a lamp, boughs. Set into it is the one lit thing, the window: a blue night, a gold moon with a face, and the clothes in their own colours on a line. A garment loses its colour as it is carried down past the sill and goes on as a gold line. One thing is warm in the dark: a bare foot.
- **By lamp light** the ground is cinnabar and everything is a jewel: ivory goat, lapis hippo, saffron hen, emerald crocodile, rose pig, each closed by the same gold line. The beds stay black, so the figures are the lightest things in the picture. A cloth belongs to each bed.

**The palette** is in `lacquer.ts` and nowhere else. Gold closes every shape and is never a fill larger than the cord's handle and the bell.

**The pen.** `Pen` fills flat and closes with gold; there is no shading, no shadow and no texture. Its `dark` slides a shape's fill to black and leaves the line.

**Ornament** is leaves, berries, scales and dots. Nothing in it can be read as a letter or a sign.

**The figures** are front-on, half the height of the picture, with large eyes and underpants of their own. What they share is only where a hat, a garment and a shoe can sit (`BUILD` in `figures.ts`). How each moves is in `motion.ts`: the goat jerks from the beard, the hippo follows late, the hen snaps from the neck, the crocodile sways from the jaw, the pig bounces from the belly. No act is shared and a test holds them apart.

**Painted once.** The two rooms are painted once for each size. Figures, garments and quilts are stamped from sprites keyed by their look, with expressions rounded to a few steps (`sprites.ts`); limbs, eyes of the moon, the cord and rings are live. A frame takes at most 80 stamps, fills and strokes.

**Tiers** change the pixel ratio, and at the last one the scales on the quilts are left out.
