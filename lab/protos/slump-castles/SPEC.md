# Slump Castles

- **Verb:** heap
- **Depth engine:** expression
- **Age band:** 5 to 8
- **Lens:** physical-toy (sandpit)
- **Hooks declared:** none

## Loop
A flat sandpit seen from above, drawn as contour bands. With the shovel the child drags to scoop sand (up to a load), and stopping or lifting pours the load into a heap; a first touch scoops a little. With the bucket the child holds or drags to sprinkle water. Damp sand holds a steep wall; dry sand slumps to a gentle slope. Sand dries from the top down, and a thick dry skin slows the drying of the damp core beneath it, so a damp tower slowly slumps by itself into a ridge, a ring, or a saddle. Too much water turns the sand to soup that holds nothing, then drains.

## What should vary on repeat play
Given play 5: The child builds with the drying in mind, a wet core under a dry skin or a wet ring wall around a pit, so the slump finishes an even crater rim or a saddle between two peaks that hands alone could not push into place on play 1.

How the sim produces it: each column keeps a height and a dry-skin depth. Stability depends on how much of a column is damp (dry holds 1 band per cell, damp holds 4.5, soaked 0.6), so the same pile of sand ends up as different landforms depending on when and where it was wet. Evaporation thickens the skin by about the square root of time, so a thick wet core outlasts a thin wet strip, and each session's hidden weather (cloudy, mild, sunny) changes the drying pace, so a learned timing has to be re-read from the sand's colour. The observed signature is the landform (flat, pit, mound, ridge, saddle, scatter, ring) crossed with the sand's condition (settled, standing on damp sand, slumping, soupy). A closed rim is found by flood fill, so a ring exists only when its wall is complete, and a ring whose wall is too thin slumps inward, fills its own crater, and falls back to a mound.

Features: `peak` (up), `enclosed` (up), `damp`, `standing`.

## Findings
<!-- findings:start -->
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses
_Filled after the panel run._
