# Typeform Clone

A full-stack clone of [Typeform](https://www.typeform.com): build forms in a three-panel builder, publish them to a public link, collect answers through the one-question-at-a-time conversational flow, and analyse results.

**Live demo:** _frontend URL_ · **API docs:** _backend URL_/docs

> The API runs on Render's free plan: after 15 idle minutes it sleeps, so the first request can take up to a minute, and on wake-up the SQLite database is recreated with the seeded demo forms (forms created in between are not kept). `render.yaml` documents the one-step switch to a paid plan with a persistent disk.

## Features

**Builder.** Three-panel layout (pages, live canvas, settings) like Typeform's. Question title, description and choices are edited in place on the canvas, which uses the same components respondents see, so the preview can't drift. Drag-and-drop reordering (mouse and keyboard), duplicate, delete with an answer-count warning, switch type in place, per-type settings (required, multiple selection with limit, randomize, alphabetical order, min/max number, max characters, placeholder, rating steps and shape). Welcome and thank-you screens are editable. Autosaves, with a "Saving… / Saved" indicator.

**Question types.** Short text, long text, multiple choice, dropdown (searchable), email, number, yes/no, rating, and file upload (bonus). Picture choice, payment and others appear as "Soon" in the add-content dialog.

**Respondent flow.** One question at a time, full screen. Transitions were measured frame by frame on a live Typeform: the outgoing question rises and fades in about 250 ms, and the incoming one settles on a spring from a slight blur, title first, then answers. Keyboard: Enter / ⌘↵ / ↑↓, letter keys for choices, Y/N for yes/no, digits for rating, Shift+Enter for new lines. Single-tap answers auto-advance after a selection blink. Progress bar, client and server validation with inline errors (`role="alert"`), welcome and thank-you screens, answers kept across a page refresh, and a mobile layout with a sticky OK button.

**Form management.** Dashboard with list and grid views, search, sorting, draft/published status, response count and completion rate. Create, rename (modal), duplicate, delete (confirmation), publish/unpublish with a shareable random link, and copy link. Toasts for every action.

**Results.** Performance KPIs (views, starts, submissions, completion rate, average time to complete), a per-question summary (bars with a count/% toggle, averages, latest text answers), a paginated responses table with completed/partial/all filters, a full-response drawer, delete, CSV export, and "Generate test response".

**Bonus.** Logic jumps (Workflow tab), custom themes with a theme editor (fonts, colours, background image, corner radius) plus a gallery of 6 themes, CSV export, partial-response tracking and completion rate, file upload, and dark mode for the admin UI.

**Placeholders (Coming soon).** Integrations (Connect tab), team collaboration, response limits, close dates, notifications.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS 4, motion (animations), dnd-kit (drag and drop), sonner (toasts) |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2 |
| Database | SQLite (foreign keys enforced) |
| Tests | pytest + FastAPI TestClient (12 API tests) |
| Hosting | Vercel (frontend), Render (API + SQLite + uploads; free plan, persistent disk optional) |

## Run locally

```bash
# API: http://localhost:8000 (interactive docs at /docs)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Web app: http://localhost:3000
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev

# Tests
cd backend && pytest
```

The database is created and seeded on first start: 6 gallery themes, two published forms ("Café Feedback" at `/f/cafe-feedback` and "Tech Meetup RSVP" at `/f/tech-meetup`) with realistic responses and logic jumps, and one draft. To reseed, delete `backend/typeform.db`.

| Env var | Where | Default |
| --- | --- | --- |
| `DATABASE_URL` | API | `sqlite:///./typeform.db` |
| `UPLOAD_DIR` | API | `./uploads` |
| `CORS_ORIGINS` | API | `http://localhost:3000` (comma-separated) |
| `NEXT_PUBLIC_API_URL` | Web | `http://localhost:8000` |

## Architecture

```
frontend/src/
  app/                       routes: / (dashboard), /forms/[id]/edit, /forms/[id]/results, /f/[slug] (public)
  components/
    questions/               ONE renderer per question type, used by both the builder canvas and the public form
      registry.ts            type → label, icon, colour, auto-advance; adding a type = 1 entry + 1 body + 1 validator
    respondent/FormRunner    reducer state machine: welcome → question[i] → done
    builder/                 useFormEditor (all builder state + saves), PageList, Canvas, SettingsPanel, LogicEditor, …
    dashboard/, results/, ui.tsx (admin primitives), icons.tsx
  lib/                       api.ts (the only place that calls the API), types, logic.ts, validate.ts, theme.ts

backend/app/
  main.py                    app, CORS, create tables + seed on startup
  db.py                      engine, session, PRAGMA foreign_keys=ON
  models.py                  SQLAlchemy tables
  schemas.py                 Pydantic request/response shapes
  routers/                   HTTP only: parse, call a service, return a status code
  services/                  the logic: forms (publish, duplicate, option diffing, reorder), responses, stats, sample data
  validators.py              per-type answer validation registry
  logic.py                   logic-jump evaluation (mirrored in frontend/src/lib/logic.ts)
```

**Request flow for a submission.** The browser validates each answer as you go, for instant feedback. Each confirmed answer is autosaved to a partial response (`PUT …/answers/{qid}` with a secret token). On submit, the server replays the logic rules to work out which questions this respondent actually saw, re-validates only those (a required question hidden by a jump never blocks submission), and writes everything in one transaction. A 422 returns errors keyed by question id, and the form jumps back to the first failing question.

## Database schema

```
themes ──1:N── forms ──1:N── questions ──1:N── question_options
                 │               │  └──1:N── logic_rules (→ jump_to question, → option)
                 └──1:N── responses ──1:N── answers (→ question, → option)
```

| Table | Key columns | Notes |
| --- | --- | --- |
| `themes` | name, is_gallery, font, question/answer/button/button_text/background colours, background_image_url, corner_radius | Shared: editing a custom theme restyles every form using it |
| `forms` | title, slug (unique), status, theme_id → themes, settings JSON, view_count, timestamps | Welcome/thank-you text and display toggles live in `settings`; response counts are computed, never stored |
| `questions` | form_id → forms (cascade), type, title, description, required, position, config JSON, deleted_at | One table for every type; `config` holds type-specific settings. Index on (form_id, position) |
| `question_options` | question_id → questions, label, position, deleted_at | Answers reference option **ids**, so renaming a choice keeps old answers |
| `logic_rules` | question_id, operator (is / is_not / lt / gt / always), value, option_id, jump_to_question_id (null = end), position | First match wins; jumps are forward-only (validated) |
| `responses` | form_id → forms (cascade), token, status (in_progress / completed), started_at, completed_at | Envelope per respondent; status powers partial responses and completion rate |
| `answers` | response_id → responses (cascade), question_id, option_id, value TEXT | One row per answered question (one per selected option for multi-select). UNIQUE(response_id, question_id, option_id); index on question_id |

## API overview

Full interactive docs: `/docs` (OpenAPI).

| Method | Path | Purpose |
| --- | --- | --- |
| GET / POST | `/api/forms` | List forms (with response and start counts) / create |
| GET / PATCH / DELETE | `/api/forms/{id}` | Full form / rename, theme, settings / delete (cascades) |
| POST | `/api/forms/{id}/duplicate`, `/publish`, `/unpublish` | Copy (questions, options, remapped logic) / generate slug + go live / take offline |
| POST | `/api/forms/{id}/questions` | Add a question (optionally after another) |
| PUT | `/api/forms/{id}/questions/order` | Save drag-and-drop order (must list exactly the current questions, else 409) |
| PATCH / DELETE | `/api/questions/{id}` | Edit fields, config, options (diffed by id), logic rules / soft-delete if answered |
| GET / POST / PUT | `/api/themes`, `/api/themes/{id}` | Gallery + custom themes |
| GET | `/api/forms/{id}/summary` | KPIs + per-question stats |
| GET | `/api/forms/{id}/responses?status=&page=` | Paginated responses |
| GET / DELETE | `/api/forms/{id}/responses/{rid}` | One response |
| GET | `/api/forms/{id}/responses/export.csv` | CSV export |
| POST | `/api/forms/{id}/responses/generate` | Add a random valid test response |
| GET | `/api/public/forms/{slug}` | Published form only (drafts and missing forms both 404) |
| POST | `/api/public/forms/{slug}/view` | Count a view |
| POST | `/api/public/forms/{slug}/responses/start` | Begin a partial response → id + secret token |
| PUT | `/api/public/forms/{slug}/responses/{rid}/answers/{qid}` | Autosave one answer (token required) |
| POST | `/api/public/forms/{slug}/responses` | Submit (validated server-side along the logic path) |
| POST | `/api/public/forms/{slug}/uploads` · GET `/api/files/{key}` | File upload (10 MB) / download |

Status codes: 201 create, 204 no content, 400 business rule (e.g. publishing an empty form), 404 missing or unpublished, 409 conflict (stale reorder, response already submitted), 422 invalid answers `{"detail": {"errors": {"<question id>": "message"}}}`.

## Design decisions and assumptions

| Decision | Alternative | Why |
| --- | --- | --- |
| Relational core + JSON `config` per question | Table per question type / MongoDB | Typed relationships where data is shared or queried (options, answers); flexible JSON where it's type-specific. The brief fixes SQLite |
| One `answers` row per answer | One JSON blob per response | Real foreign keys, and per-question stats are a single `GROUP BY`. At Typeform's scale I'd consider a JSONB blob plus precomputed stats |
| Soft-delete questions and options that have answers | Hard delete / full form versioning | Old responses stay readable after edits. Per-publish snapshots (versioning) would be the production approach; out of scope for this time box |
| Options diffed by id on save | Replace all options | Renaming "Cold brew" doesn't detach its existing answers |
| Granular autosave endpoints + stale-response guard | One `PUT` of the whole form | A whole-form overwrite recreates rows and orphans answers; the guard stops a slow old save overwriting a newer edit |
| Shared question components for canvas and public form | Separate preview renderer | Live preview can never drift from the real form |
| Logic evaluated in both browser and server | Browser only | The server decides which questions were seen, so a hidden required question can't block submission, and answers to skipped questions are dropped |
| Random 8-character public slug | Numeric id | Forms can't be enumerated |
| Partial responses tied to a secret token | Response id only | Ids are guessable; a token proves the browser started that response |
| CSV cells starting with `= + - @` are escaped | Raw values | Prevents CSV formula injection |

**Assumptions.** A single default creator; authentication is out of scope, as the brief allows. Analytics count completed responses unless filtered. Editing a published form applies to future respondents, and the builder warns when a question already has answers. Times are stored in UTC.

**Measured rather than guessed.** The keyboard model, auto-advance timing (about 0.6 s), transition curves, progress bar, error-pill colours, admin design tokens and question-type colours were measured on live Typeform forms and the Typeform builder, then reproduced here.
