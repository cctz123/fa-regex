# Finite Automata Visualizer (Browser Tool) — MVP Spec

## Goal
Create a simple, student-friendly web app that lets a learner **draw**, **edit**, and **simulate** finite automata (FA). The first version focuses on state diagrams and step-by-step simulation; later versions can add regex support and conversions (regex→NFA, NFA→DFA).

## Target users
- Students learning **regular expressions** and **finite automata** (DFA/NFA/ε-NFA).
- Parents/teachers who want a quick way to demonstrate concepts interactively.

## MVP feature set

### 1) Diagram editor (canvas/SVG)
Use a node/edge diagram editor that supports:
- **Add states** (nodes)
  - State has a human-readable label (default `q0`, `q1`, …).
  - Drag to reposition.
- **Mark start state**
  - Exactly one start state (MVP).
  - Visual: incoming arrow from “nowhere” (common FA convention).
- **Mark final/accepting states**
  - One or many accepting states.
  - Visual: double circle.
- **Draw transitions** (edges)
  - Directed edges between states.
  - Support **self-loops**.
  - Edge label is one or more symbols:
    - Single characters like `a`, `b`, `0`, `1`
    - Special symbol `ε` (epsilon) for ε-transitions (NFA/ε-NFA)
  - Optional: allow comma-separated label lists, e.g. `0,1` meaning either symbol.
  - Optional: allow multi-character tokens for later, but keep MVP simple.

**Ergonomics**
- Click “Add state” button.
- Click-and-drag to connect (edge creation).
- Select a node/edge to edit label/flags in a right-side panel.
- Delete selected node/edge with a button (and optionally the Delete key).

### 2) Simulation (step-through input)
Provide a simulation panel:
- Input string text box.
- Controls:
  - **Reset**
  - **Step**
  - **Run** (optional; can be MVP+)
- Shows:
  - Current step index
  - Remaining input
  - Current active state(s)
  - Final result: **Accepted** / **Rejected**

**Highlighting rules**
- DFA: highlight a single current state; on each step, highlight the used transition.
- NFA/ε-NFA: highlight a *set* of current states.
  - Use ε-closure before consuming a symbol (and after each symbol transition).
  - When stepping:
    - First compute ε-closure of current set.
    - Consume next character (if any) by taking all transitions labeled with that character.
    - Compute ε-closure again.
  - If the set becomes empty, the machine is stuck → reject (unless input is also complete and acceptance is met, depending on model; for standard FA, empty set means reject).

**Acceptance**
- Accept if **any** current state is accepting when input is fully consumed (after final ε-closure).

### 3) Built-in examples (3+)
Include at least 3 pre-built automata a student can load with one click. Suggested set:

1. **DFA: strings ending in `01`** (alphabet `{0,1}`)
2. **DFA: even number of `1`s** (alphabet `{0,1}`; `0` loops)
3. **NFA: contains substring `ab`** (alphabet `{a,b}`) *or* **ε-NFA for `a* b`**

Each example should include:
- Name
- Short description (“Accepts strings that …”)
- Alphabet
- Whether it’s DFA or NFA/ε-NFA
- A few sample inputs with expected results (e.g. `101` → reject/accept)

## Non-goals (MVP)
- Regex parsing and conversion.
- Minimization or equivalence checking.
- Large automata performance optimization.
- Export/import formats beyond a simple JSON file (optional MVP+).

## Recommended tech stack
Your proposed stack fits well:
- **Next.js** (App Router) for a simple, deployable web app.
- **TypeScript** for correctness and maintainability.
- **React Flow** for node/edge editing (dragging, connecting, selection).
- **Tailwind CSS** for simple UI styling.

**Why React Flow**
- Mature UX for node graphs.
- Easy to implement selection, drag, connect, and custom node rendering (start/accept visuals).

Alternative (only if React Flow feels heavy later):
- D3/SVG custom editor (more control, more work).

## Data model (proposed)
Keep an internal representation that is independent of React Flow’s view model.

### Automaton
- `states`: list of states `{ id, label, isAccepting }`
- `startStateId`: string
- `transitions`: list of transitions `{ from, to, symbols }`
  - `symbols`: array of strings, each either a single character or `"ε"`
- `alphabet`: derived or explicitly stored (optional)
- `type`: `"dfa" | "nfa"` (ε-transitions imply NFA)

### Simulation state
- `input`: string
- `index`: number (next character to consume)
- `currentStateIds`: set of state IDs
- `status`: `"ready" | "running" | "accepted" | "rejected" | "stuck"`
- `lastTransition`: optional `{ from, to, symbol }` (for highlighting)

## Simulation algorithm (high-level)

### ε-closure
Given a set of states \(S\):
- Start with \(closure = S\)
- DFS/BFS following ε-transitions until no new states are added

### Step
If `index == input.length`:
- Accept iff `closure(current)` intersects accepting states
Else:
- Let `c = input[index]`
- Compute `current = ε-closure(current)`
- Compute `next = move(current, c)` where `move` collects all destinations via `c` transitions
- Compute `next = ε-closure(next)`
- Set `current = next`, increment `index`
- If `current` is empty at any time → stuck → reject

### DFA fast path (optional)
If machine is a DFA (no ε, and at most one transition per symbol from any state), you can track a single state for simpler highlighting and faster stepping.

## UI layout (simple, student-friendly)
One screen with three regions:
- **Top bar**: app title + example selector + buttons (new, reset, export/import optional)
- **Main canvas**: diagram editor
- **Right panel**: tabs or sections
  - **State/Transition inspector** (edit label, start/accept flags, edge symbols)
  - **Simulation** (input, step controls, status)

Keep text large, controls obvious, minimal menus.

## Accessibility and usability
- Keyboard-friendly controls where reasonable (Delete to remove selected, Enter to apply edits).
- Color choices with sufficient contrast; don’t rely on color alone (use outlines/labels).
- Clear error messages for invalid machines (e.g., “No start state selected”).

## Validation rules (MVP)
- Must have exactly **one** start state.
- State labels should be unique (or auto-suffixed).
- Transition labels cannot be empty.
- If DFA mode is desired later, validate determinism (MVP can allow nondeterminism by default).

## Persistence (MVP+)
- Save/load automata as JSON (download/upload).
- Optionally store the last automaton in `localStorage`.

## Phased roadmap (beyond MVP)

### Phase 2: Regex support
- Regex input box with supported operators:
  - concatenation, union (`|`), kleene star (`*`), parentheses, and epsilon
- Convert regex → ε-NFA (Thompson construction)
- Show generated ε-NFA on the canvas

### Phase 3: NFA → DFA visualization
- Subset construction to build DFA
- Animate/step through subset construction (optional)
- Visual mapping from DFA states to NFA state-sets

### Phase 4: Extras
- DFA minimization visualization
- Equivalence checking between two DFAs
- Export to SVG/PNG

## Success criteria for MVP
- A student can build the “ending in 01” automaton in under 2 minutes.
- Stepping simulation clearly shows “where the machine is” at each character.
- Loading examples is instant and helps explain concepts without setup.

