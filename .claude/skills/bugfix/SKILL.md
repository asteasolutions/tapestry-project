---
name: bugfix
description: Fix a reported Tapestry bug end to end — triage the layer, build a repro, diagnose, fix, add a regression test where a seam exists, lint. Use when the user hands over a bug report, issue, or "X is broken".
disable-model-invocation: true
argument-hint: <bug description or issue link>
---

# Fix a bug: $ARGUMENTS

The method is the `diagnosing-bugs` skill: load it and follow its phases. This skill only adds what is specific to this repository: where each kind of bug lives, how to get a feedback loop for it, and how to finish.

## 1. Pin down the symptom

Restate the bug as: steps, expected behaviour, actual behaviour, and where it happens (editor, read-only view, `viewer` ZIP export, worker job). If any of these is missing and you can't get it from the code or the issue, ask before you go further. A fix for the wrong symptom is the most expensive mistake here.

## 2. Triage the layer

Decide which layer owns the symptom before you look for a cause. It decides your feedback loop.

| Symptom | Start in |
| --- | --- |
| Wrong status code, wrong or missing data in a response, permission bug | `server/src/resources/<name>.ts` (handler, `accessPolicy`), `server/src/transformers/` |
| Request rejected by validation, field lost between client and server | `shared/src/data-transfer/resources/` — schema and DTO out of sync |
| Thumbnail, import, PDF or S3 cleanup broken | `server/src/tasks/` (job in `worker.ts`, enqueue helper in `utils.ts`) |
| Login / OAuth | `server/src/auth/providers`, plus the notes in `CLAUDE.md` and `README.md` |
| Edit lost after reload, other clients don't see it, duplicated or reverted change | `client/src/pages/tapestry/view-model/tapestry-data-sync.ts`, `tapestry-resources-repo.ts`, `client/src/utils/resource-repo.ts`, `socket-manager.ts` |
| Undo/redo does the wrong thing | `client/src/pages/tapestry/view-model/undo-stack/` |
| Rendering, drag, resize, selection, zoom | `core-client/src/stage` (read-only controllers) or `client/src/stage` (editor controllers) |
| One item type renders wrong | `core-client/src/components/tapestry/items` |
| Only the exported viewer is broken | `viewer/` |

## 3. Build the feedback loop for that layer

Only `server` has a test runner. Pick the tightest loop the layer allows:

- **server API / transformer / access policy** — a vitest case in `server/src/__tests__/api/`, modelled on `tapestries.test.ts` (`setupTestSuite`, `loginUser(userId)`, then `request.get/post(...)`). Run one file with `cd server && npm test -- --run src/__tests__/api/<file>.test.ts`. It needs Postgres (`npm run db:start`) and a `server/.env.test` with a DB name containing `test`. If either is missing, ask the user; don't create or edit `.env` files.
- **server, quick check against a running API** — `curl` or the Postman CLI against `http://localhost:3000/api` while `cd server && npm start` runs.
- **worker job** — call the job's processing function directly from a throwaway script with a fixture input, rather than going through the queue.
- **shared schema / DTO** — a schema mismatch shows up in `npm run lint` (tsc) or as a validation error from the server test above.
- **client / core-client / viewer** — there is no test runner. Options, in order:
  1. Pull the logic out of the component into a pure function or store command, and check it with a throwaway `tsx` script.
  2. A throwaway Puppeteer script (Puppeteer is already a `server` dependency) against the Vite dev server (`cd client && npm start`, `http://localhost:5173`), asserting on the DOM, console errors, or network requests.
  3. If a human has to click (canvas gestures, OAuth), use `diagnosing-bugs`' `scripts/hitl-loop.template.sh` and have the user run it.

Keep throwaway scripts outside `src/` and delete them at the end.

## 4. Suspects worth checking early

When you rank hypotheses, these are the usual culprits in this codebase:

- A field was added to a schema but not to the matching DTO (or the reverse). They are maintained by hand; see `.claude/rules/api-contract.md`.
- A mutation handler doesn't call `socketServer.notifyTapestryUpdate` / `notifyTapestryElementsRemoved`, so other clients go stale.
- Editor state was written outside `items[id].dto` / `rels[id].dto`, so it never syncs; or local UI state was written into `dto` and gets persisted.
- A command dispatched with `{ source: 'server' }` for a local change (it skips undo), or a server update dispatched without it (it pollutes undo).
- Ordering or debouncing in the resource repo: a create and an update for the same element racing, or a delete arriving before its create.
- A missing `include` in `allowedIncludes`, or an `accessPolicy` check that treats anonymous users (`userId === null`) wrongly.
- Behaviour that differs between the editor (`client`) and the read-only path (`core-client`, `viewer`) because only one of them was fixed before.

## 5. Fix, verify, report

- Fix at the layer that owns the bug, not where the symptom shows. Keep the diff minimal: no drive-by refactors.
- Regression test: in `server`, turn the repro into a test under `src/__tests__/`. In client workspaces there is nowhere to put one; say so in the report instead of inventing a test setup.
- Re-run the original loop and see it go green. Remove every `[DEBUG-...]` log and throwaway script.
- Run `npm run lint` in every workspace you touched. Report the real result, including failures.
- Report: the root cause in one or two sentences (the hypothesis that turned out right), the files changed, how you verified it, and anything you couldn't verify. If the cause points at a design problem, say so, but don't fix it here.
- Don't create branches or commit. Leave the changes in the working tree.
