# Ticket 001 — Filesystem persistence for diagrams (no DB)

## Goal
Persist a **library of diagrams** locally on disk for a **single-user** system, without requiring a database or manual file naming.

The user should be able to:
- See **all saved diagrams** in a dropdown selector (like the existing examples dropdown UX).
- **Rename/edit the description** of a diagram.
- Create a new diagram, switch between diagrams, and have changes saved (autosave is OK).

## Constraints / assumptions
- App runs via `npm run dev` / `next start` (i.e. **Node server available**).
- Persistence location is **project-relative**: `./data/diagrams/`.
- Storage format is JSON and should store:
  - `id`
  - `description`
  - `createdAt`, `updatedAt`
  - `nodes`, `edges` (ReactFlow / `StateNode[]` + `TransitionEdge[]`)
  - `schemaVersion` (for future migrations)
- No multi-user permissions, auth, or concurrency beyond “one user clicking around”.

## Proposed storage layout (Option A)
- Directory: `data/diagrams/`
- Per-diagram files: `data/diagrams/<id>.json`
- Index file for listing: `data/diagrams/index.json`
  - Contains an array of entries: `{ id, description, createdAt, updatedAt }`

### Write safety
- Use atomic-ish writes:
  - write to `*.tmp` then rename to final filename
- Keep index consistent with per-diagram writes.

## API design (Next.js route handlers)
Create route handlers under `src/app/api/diagrams/`:

- `GET /api/diagrams`
  - Returns list for dropdown from `index.json` (create it if missing).

- `POST /api/diagrams`
  - Creates new diagram with default description (e.g. "Untitled diagram")
  - Returns created entry + full diagram payload.

- `GET /api/diagrams/:id`
  - Loads a diagram JSON file by id.

- `PUT /api/diagrams/:id`
  - Updates a diagram (nodes/edges and/or description).
  - Updates index timestamps/description.

- `DELETE /api/diagrams/:id`
  - Deletes diagram file and removes from index.

## UI / UX changes
- Add a “Diagrams” dropdown to the top bar (or extend existing selector UX) with:
  - list of saved diagrams (description)
  - option to create new diagram
  - option to delete current diagram (with confirm)
- Add “Edit description” control (inline or inspector/topbar).
- Implement autosave with debounce (e.g. 500–1000ms) when nodes/edges/description changes.
- On startup:
  - load list
  - load “last opened diagram” if available (store last id in `localStorage`), else create/load a default.

## Data contract
Define shared types:
- `DiagramMeta` (id, description, createdAt, updatedAt)
- `DiagramDocument` (meta + nodes + edges + schemaVersion)

## Acceptance criteria
- Create diagram → appears in dropdown immediately.
- Switch between diagrams → correct graph loads.
- Edit description → persists and updates dropdown.
- Refresh page → diagrams still available; last-opened diagram reloads.
- No database required; all persistence is in `./data/diagrams/`.

## Test plan (manual)
- Create 3 diagrams, change descriptions, switch between them.
- Add nodes/edges to each, refresh, verify persistence.
- Delete a diagram, ensure it disappears and others remain intact.

