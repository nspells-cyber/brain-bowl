---
name: brain-bowl
description: Build and expand a Brain Bowl / Quiz Bowl practice application following NAQT (National Academic Quiz Tournaments) standards. Use this skill whenever the user asks to create quiz bowl questions, add subjects to the brain bowl app, expand the question bank, generate NAQT-format tossups or bonuses, or work on any part of the Brain Bowl practice system. Also trigger when the user mentions NAQT, quiz bowl, brain bowl, tossup, bonus round, pyramidal questions, buzzer practice, or competition prep. This skill covers question writing standards, NAQT format compliance, subject distribution, accuracy verification, and the full project architecture.
---

# Brain Bowl NAQT Practice System

A private practice application for Marianna High School Brain Bowl competitors. MHS won the 2026 Florida state championship (10-0) and competes at NAQT nationals. The app provides NAQT-format tossup and bonus practice across all competition subjects.

## Context

- School: Marianna High School, Marianna, Florida
- Competition standard: NAQT (National Academic Quiz Tournaments)
- Level: High school (IS-series question sets)
- Coach: Christi Shelfer
- The app is private, for personal study use only
- Chipola College (also in Marianna) won the 2026 NAQT Community College Championship, so the local quiz bowl pipeline is strong

## NAQT Question Format Standards

Read `references/naqt-format.md` for the full specification. Key rules:

### Tossup Structure (CRITICAL — every tossup must follow this)

Tossups are **pyramidal**: clues arranged from hardest (lead-in) to easiest (giveaway).

1. **Lead-in clue (Power zone)**: Obscure fact only deep experts would know. Buzzing here = 15 points.
2. **Middle clues**: Progressively easier. Standard 10-point buzzes.
3. **Giveaway clue**: Ends with "For ten points, name/identify..." Most players should get this.

Constraints:
- High school tossups: 375-425 characters max (about 3-4 sentences)
- Format is STATEMENTS, not questions. They end with "For ten points, name..." not "What is..."
- Never start with the answer or a pronoun that gives it away
- Never use "this" in the first clue (it's the hardest clue — don't signal the answer type yet)
- Avoid "this [answer category]" until the giveaway

### Bonus Structure

Triggered only when a tossup is answered correctly. Three parts:
- **Easy part** (~90% conversion target): Standard textbook knowledge
- **Medium part** (~50% conversion target): Requires solid study
- **Hard part** (~15% conversion target): Deep knowledge, obscure facts

Each part worth 10 points. Always include a lead-in sentence connecting the bonus to the tossup topic.

### Scoring
- Power (buzz on first clue): **15 points**
- Regular correct buzz: **10 points**
- Incorrect buzz (neg): **-5 points**
- Bonus parts: **10 points each**
- Maximum per tossup-bonus cycle: **45 points**

## NAQT Subject Distribution

Read `references/subject-distribution.md` for detailed breakdowns. High-level for IS sets:

| Subject | % of Questions | Priority |
|---------|---------------|----------|
| History (American, European, World) | 18.5% | HIGH |
| Literature / Mythology | 18.5% | HIGH |
| Science (Bio, Chem, Phys, Math, CS, Earth) | 18.5% | HIGH |
| Current Events | 7.5% | MEDIUM |
| Popular Culture | 7.5% | MEDIUM |
| Fine Arts (Visual, Music, Film, Architecture) | 7.0% | MEDIUM |
| Geography | 7.0% | MEDIUM |
| General Knowledge | 5.5% | LOW |
| Sports | 4.0% | LOW |
| Social Science (Econ, Psych, PoliSci, Sociology) | 3.5% | LOW |
| Philosophy / Religion | 2.0% | LOW |
| Foreign Language | 0.5% | LOW |

A standard NAQT packet has 24 tossups and 24 bonuses per round, two 9-minute halves.

## Project Architecture

### Directory Structure (target state)

```
brain-bowl/
├── SKILL.md
├── references/
│   ├── naqt-format.md          # Detailed NAQT format specification
│   ├── subject-distribution.md # NAQT subject breakdown with sub-topics
│   └── frequency-topics.md     # High-frequency NAQT topics per subject
├── src/
│   ├── App.jsx                 # Main app shell, subject selector, routing
│   ├── components/
│   │   ├── TossupPlayer.jsx    # Pyramidal reveal, buzz, self-judge
│   │   ├── BonusPlayer.jsx     # 3-part bonus flow
│   │   ├── StudyMode.jsx       # Browse questions with answers visible
│   │   ├── ScoreTracker.jsx    # Session scoring
│   │   ├── PacketSimulator.jsx # Generate full 24-question packets
│   │   ├── HomeScreen.jsx      # Subject/era/tag selection
│   │   └── Reference.jsx       # NAQT format reference guide
│   ├── data/
│   │   ├── world-history.json
│   │   ├── american-history.json
│   │   ├── european-history.json
│   │   ├── literature.json
│   │   ├── mythology.json
│   │   ├── biology.json
│   │   ├── chemistry.json
│   │   ├── physics.json
│   │   ├── math.json
│   │   ├── geography.json
│   │   ├── fine-arts.json
│   │   ├── current-events.json
│   │   ├── social-science.json
│   │   ├── philosophy.json
│   │   ├── popular-culture.json
│   │   └── sports.json
│   └── utils/
│       ├── shuffle.js
│       ├── packetGenerator.js  # Builds packets matching NAQT distribution
│       └── progressTracker.js  # localStorage for session history
├── package.json
├── vite.config.js
└── index.html
```

### Question Data Schema

Each question file exports an array of question objects:

```json
{
  "id": "wh-t001",
  "subject": "world-history",
  "era": "era1",
  "chapter": "Ch.2",
  "tags": ["Mesopotamia", "law"],
  "clues": [
    "Lead-in clue (hardest, power zone)...",
    "Middle clue...",
    "Middle clue...",
    "For ten points, name this [giveaway]..."
  ],
  "answer": "Code of Hammurabi",
  "acceptableAnswers": ["Hammurabi's Code", "Laws of Hammurabi"],
  "bonus": {
    "leadin": "Context sentence connecting to tossup. For ten points each:",
    "parts": [
      {"q": "Easy question...", "a": "Answer", "accept": [], "difficulty": "easy"},
      {"q": "Medium question...", "a": "Answer", "accept": [], "difficulty": "medium"},
      {"q": "Hard question...", "a": "Answer", "accept": [], "difficulty": "hard"}
    ]
  }
}
```

The `id` prefix indicates subject: `wh-` world history, `lit-` literature, `sci-` science, etc.

## Question Writing Rules

### Accuracy Requirements (NON-NEGOTIABLE)

1. Every factual claim must be verifiable. No guessing on dates, names, or attributions.
2. Lead-in clues (the hardest, most obscure) are the highest-risk area. Use only facts rated 95%+ confidence.
3. When uncertain about a specific number, date, or attribution: search and verify before including.
4. Giveaway clues should use standard textbook-level facts.
5. Never fabricate a plausible-sounding obscure fact for a lead-in. Real obscure facts only.
6. For historical dates where sources disagree (e.g., Battle of Kadesh: 1274 vs 1275 BCE), use the most widely cited date and add alternative acceptable answers.

### Style Rules

- Active voice, declarative statements
- No first or second person
- Avoid "this person" or "this event" in the lead-in — the player shouldn't know the answer category from clue 1
- The giveaway clue should begin with a broad hint and narrow to "For ten points, name..."
- Tossup answers should be specific: "Genghis Khan" not "a Mongol leader"
- Bonus answers can accept reasonable variants (list in `acceptableAnswers` or `accept`)
- No trick questions. The pyramidal structure IS the difficulty mechanism.

### Clue Quality Hierarchy

Best lead-in clues (in order of preference):
1. A specific, verifiable detail about the answer that only experts would know
2. An unusual or lesser-known connection to another topic
3. A quote or specific textual reference from a primary source
4. A specific archaeological or historiographic detail

Worst lead-in clues (avoid):
1. Vague descriptions that could apply to multiple answers
2. Negative clues ("this was NOT the largest...")
3. Clues requiring process-of-elimination rather than knowledge
4. Anachronistic framing

## Build & Expansion Workflow

### Adding Questions to an Existing Subject

1. Identify gaps in topic coverage (check existing tags and topics)
2. Draft questions following the pyramidal format
3. Verify all factual claims (search when confidence < 95%)
4. Check for duplicate topics (don't write two tossups about the same answer)
5. Validate the JSON schema
6. Run the app and verify questions render correctly

### Adding a New Subject Module

1. Read `references/subject-distribution.md` for NAQT's sub-topic breakdown
2. Read `references/frequency-topics.md` for high-priority topics
3. Create the data file (e.g., `src/data/literature.json`)
4. Write 20-30 questions as an initial batch
5. Register the subject in the app's subject selector
6. Verify the app loads and displays the new subject
7. Expand to 100+ questions in subsequent batches

### Packet Simulation Mode

The PacketSimulator should generate practice packets matching NAQT distribution:
- 24 tossups per packet
- Distribution weighted per NAQT percentages
- Pull from all available subject banks
- No repeats within a packet
- Track which packets the user has seen

## Current State

### Completed
- World History: **130 tossups + 390 bonus parts = 520 questions**
  - 7 eras aligned to "Traditions and Encounters" AP Edition (Bentley & Ziegler)
  - 100+ unique topic tags
  - Practice mode with pyramidal reveal and buzzer simulation
  - Study mode for browsing with answers visible
  - Self-judging with NAQT scoring (powers, negs, bonus tracking)

### Build Queue (in priority order)
1. Literature / Mythology (130 questions target)
2. Science — Biology, Chemistry, Physics, Math (130 questions target)
3. Geography (80 questions target)
4. Fine Arts (80 questions target)
5. American History (100 questions target)
6. European History (100 questions target)
7. Current Events framework (50 questions + update mechanism)
8. Social Science (50 questions target)
9. Popular Culture (50 questions target)
10. Philosophy / Religion (30 questions target)
11. Sports (30 questions target)
12. Unified packet simulator with full NAQT distribution

### Deployment
- Target: Static site on GitHub Pages (free, private repo)
- Framework: Vite + React
- No backend needed (all data is static JSON, progress stored in localStorage)
- Must work on mobile (the user's son needs phone access)

## Reference Files

- `references/naqt-format.md` — Deep specification of NAQT question formatting, acceptable answer forms, pronunciation guides, and edge cases
- `references/subject-distribution.md` — Full NAQT subject and sub-topic distribution percentages
- `references/frequency-topics.md` — "You Gotta Know" high-frequency topics per subject area (the topics NAQT asks about most often)

Read the relevant reference file before writing questions for any subject.
