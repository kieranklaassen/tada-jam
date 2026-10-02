This pack governs how games in this jam are designed so that children want to come back to them for weeks because of depth and delight, and how a school skill is built into play.

It holds design rules only. Cartridge mechanics, the quality bar, the wordless rule and the ban on engagement mechanics are in `AGENTS.md`, `docs/art-direction.md` and `docs/solutions/`. Where a rule here touches one of those, it says what it adds: the reason, the similar thing that is fine, or a test. If a rule here and `AGENTS.md` ever disagree, `AGENTS.md` wins. The rules are written for jam games under `games/`. The lab (`lab/`) is exempt from the jam's rules and has its own (`lab/arcade/GENTLE.md`); these rules apply from the moment a lab demo is turned into a game.

The owner's bar, in his words: "Make sure the games that we build are fun. You want to come back to for weeks. It's not boring and it has depth." And of the arcade demos: "these are really fun, but also addictive... They should be for children and rooted in some Montessori Waldorf as well."

## The rules

Depth and delight, for every game:

- `toy-first.md`: the core touch is fun with no goal, and is built and judged first.
- `depth-from-combinations.md`: depth comes from parts that combine; the plan says what is new on day 15.
- `characters-with-opinions.md`: characters have fixed tastes, and their reactions are the feedback.
- `touch-answers-bigger-than-the-touch.md`: every touch is answered when the finger lands, and the answer is bigger than the touch.
- `liveliness-from-causing-and-comedy.md`: liveliness comes from the child causing things and from comedy, never from pressure; wrong uses work and are funny.
- `endings-and-short-scenes.md`: a cycle ends when the child ends it; short scenes are the twist or the ending.
- `hidden-never-counted.md`: things can be hidden, never counted or shown as missing.
- `the-world-keeps-and-waits.md`: the world keeps what the child made and is found as it was left.
- `no-rewards-for-playing.md`: what counts as a reward for playing, and what does not.
- `the-line-between-depth-and-manipulation.md`: three questions that separate depth from manipulative design.

Age bands:

- `ages-2-to-4.md`: taps, repetition, one loved action, objects used wrongly.
- `ages-4-to-6.md`: pretend play, reacting characters, tricks and wrong names.
- `ages-9-to-12.md`: real difficulty, real systems, more than one solution, nothing babyish.

Learning games:

- `the-mechanic-is-the-school-skill.md`: the child's action at the moment of decision is the school skill.
- `representation-before-game.md`: the representation is chosen first and matches the idea.
- `working-objects-stay-plain.md`: the pieces a child works with stay plain.
- `errors-show-as-consequences.md`: an error is a consequence that says where and why, never a verdict.
- `ordered-challenges-high-success.md`: an order that adds one thing at a time, high success, chosen challenge.
- `guided-discovery.md`: under ten, a character shows a new idea once; ages 9 to 12 may try first.
- `many-short-visits.md`: built for many short visits over weeks.
- `voice-never-instructs.md`: a voice never instructs; spoken words belong to objects.
- `fade-to-school-symbols.md`: object, then picture, then symbol; a bridge to the school form; no claims about attainment.

## Where the evidence is kept

- `research/depth-and-replay.md`: what makes children return to a game without hooks. Fifteen summary rules, six sections, a table of mechanisms, sources.
- `research/learning-games-that-work.md`: what makes a learning game both fun and effective. Fifteen summary rules, eight sections, a table from school skill to representation to mechanic, sources.
- `research/open-questions.md`: decisions that are the owner's to make and are therefore not rules, and the places where the evidence does not support the jam's hard constraints.
- The owner's ratings of the lab demos are in `lab/arcade/RATINGS.json`, and what each demo tested is in `lab/arcade/catalog.ts`.

Every claim in the research files has a mark: [V] read in the source, [S] taken from a secondary summary, [I] inference. Each rule ends with an "Evidence:" line that gives its strongest support, the mark, and the section to read.

## How strong the evidence is

- No study tracks long-term return to hook-free children's apps. That such games are played for weeks rests on designers' testimony, reviews and how long the products have sold. The rules on depth are built from mechanism, which is why something should keep working, more than from measured return.
- Large trials of learning games find small effects. Across studies, learning apps average about 0.3 to 0.4 standard deviations, and the figure shrinks as trials get larger and tests more independent: a large randomized trial with a standard test of a broad skill should expect about 0.07. So no game may claim to raise attainment. What can be said of a game is that it is built on representations and mechanics that have evidence behind them.
- The firmest findings used here: promised rewards lower children's later interest; feedback that shows why works better than cheering; a designed order of difficulty matters; young children left to discover a school idea alone mostly do not find it; the shape of a representation matters (a straight number path works, a circular one does not).
- The weakest: that building the skill into the mechanic improves learning (one small experiment, with results against it); the list of what ages 9 to 12 reject; the lengths given for scenes and cycles. These are marked in the rules.
- Many design details are inference from how well-regarded games work. They are proposals to test with children.

## Adding a rule

1. One rule per file, at the top level of this folder, as a `.md` file with `title` and `applies_when` in its frontmatter (`tags` helps matching). A file without them is skipped with a warning. Notes and evidence go under `research/`.
2. The title is one sentence that states what must always, or never, happen.
3. `applies_when` lists two to four situations in the words a request would use ("designing a game for children aged 9 to 12"), one per line.
4. The body gives the rule in plain sentences, "Do" and "Do not" in a few lines, the one exception, and an "Evidence:" line with the mark and where the detail is. It is short enough to quote whole. It describes the game and never addresses a reader.
5. A new rule does not prescribe what another rule here already prescribes. If it narrows one, the exception is written into the broader rule too.
6. The pack stays at 25 rule files or fewer, so that each one is read in full.
7. A question that is the owner's to decide goes in `research/open-questions.md` until it is decided.
