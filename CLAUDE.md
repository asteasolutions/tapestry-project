# CLAUDE.md

## Repository layout

NPM workspaces monorepo (Node ≥ 22, TypeScript, ESM). A _Tapestry_ is an endless canvas of interconnected multimedia items (items, rels, groups, presentation steps).

- `core` – the base Tapestry data format: Zod schemas (`src/data-format/schemas`), geometry, utilities. No React.
- `core-client` – reusable React + PixiJS building blocks for any Tapestry app: the `Store`, the canvas stage, item components, theme.
- `shared` – the REST API contract between `client` and `server`: endpoint definitions, Zod schemas and DTO types, socket event types.
- `server` – Express API and BullMQ worker (same codebase, two entrypoints), Prisma/PostgreSQL.
- `client` – the main web app (viewer + WYSIWYG editor), built with Vite.
- `viewer` – read-only viewer for Tapestry ZIP exports, published to npm as the static-only package `@asteasolutions/tapestry-viewer`.
- `open-tofu/`, `deployment/`, `Dockerfile.*`, `docker-compose*.yml` – infrastructure and deployment.

Workspaces import each other's **source** directly (for example `tapestry-core/src/utils.js` or `tapestry-shared/src/data-transfer/resources/dtos/rel.js`), so you never build a package before using it. In `server`, `core`, `shared` and `core-client`, relative imports use the `.js` extension; `client` imports use none (it is built by Vite).

## Commands

```sh
npm install                 # from the root; installs every workspace
npm run lint                # root: lints every workspace (this is what CI runs on PRs, via Dockerfile.ci)
cd <workspace> && npm run lint   # tsc --build + eslint (--max-warnings 0) + prettier --check (+ stylelint for client/core-client/viewer)
npx prettier ./src --write  # fix formatting (no semicolons, single quotes, trailing commas, width 100)
```

Local infrastructure (Docker, reads `server/.env`): `npm run db:start`, `npm run redis:start`, `npm run localstack:start` (S3; the free version has no persistence), `npm run vault:start` (optional, only needed for AI chat API keys). Each one has a matching `*:logs` script.

Server (`cd server`):

```sh
npm run prisma:generate                  # regenerate the client (a hook runs it when Claude edits schema.prisma)
npm run prisma:migrate                   # apply migrations (migrate deploy)
npm run prisma:create-migration <name>   # create a new migration (migrate dev)
npm start                                # API server via nodemon
npm run start:worker:dev                 # background worker; needs chromium, ffmpeg and imagemagick on the host (see Dockerfile.server)
```

Client / viewer: `npm start` (Vite dev server) and `npm run build`.

## Architecture

### API contract → server resources

1. `shared/src/data-transfer/resources/index.ts` declares every REST resource through `createRESTEndpoints`. Each resource uses Zod schemas from `schemas/` (built by extending `core` schemas) and DTO types from `dtos/`. Schemas and DTOs are kept in parallel by hand: when you change one, change the other.
2. On the server, each `server/src/resources/<name>.ts` exports a `RESTResourceImpl`, which has `handlers` (one per endpoint) and an `accessPolicy` (one `can<Endpoint>` per endpoint, plus `createListFilter` for list endpoints). `base-resource.ts` binds these to Express, validates input and output against the shared schemas, and checks which `include` parameters are allowed. Every resource is registered in `server/src/index.ts`.
3. `server/src/transformers/` convert between Prisma models and DTOs.
4. A mutation calls `socketServer.notifyTapestryUpdate` / `notifyTapestryElementsRemoved` (in `server/src/socket`) so that other clients viewing the same tapestry refresh. The originating socket id comes from the request, so the sender itself is not notified.
5. "Batch mutation" resources (`*-batch-mutations.ts`) apply bulk create, update and delete operations on items, rels, groups and presentation steps.

Background jobs (`server/src/tasks`) run on a single BullMQ queue: thumbnail generation (Puppeteer, ffmpeg, ImageMagick), tapestry import/creation, PDF conversion and S3 cleanup. Jobs are enqueued from the API through helpers in `tasks/utils.ts` and dispatched in `tasks/worker.ts`. Configuration for both API and worker is in `server/src/config.ts`. Auth providers (IA, Google, ORCID, Wikimedia) are in `server/src/auth/providers`; the OAuth flow shared by ORCID and Wikimedia is described in README.md.

### Client state model

- State lives in a `Store` (`core-client/src/lib/store`), an Immer-based store. You change it by dispatching **commands**: functions `(draft, { store }) => void` of type `StoreMutationCommand`. A command can dispatch further commands. Commands are grouped by domain under `view-model/store-commands/`. Generic viewport and tapestry commands live in `core-client`; editor-specific ones live in `client/src/pages/tapestry/view-model/store-commands`. React reaches the store through hooks created by `createStoreHooks`.
- The editor's view model (`EditableTapestryViewModel`) wraps each DTO in its own view model (`items[id].dto`, `rels[id].dto`, …). Changes under `dto` sync to the server; the other fields are local UI state.
- `client/src/pages/tapestry/view-model/tapestry-data-sync.ts` connects the store and the server in both directions. It turns Immer patches from the store into patches for `TapestryResourcesRepo` (`client/src/utils/resource-repo.ts`), which queues and debounces REST calls. Remote changes come back as repo patches and are turned into store commands. Socket.io (`socket-manager.ts`) delivers server update notifications. WebRTC (`rtc-manager.ts`, which uses the socket for signaling) shares collaborator cursors. Undo/redo is in `undo-stack/`; it ignores commands dispatched with `{ source: 'server' }`, so use that option only when applying server data.
- `client/src/services/rest-resources.ts` builds a typed REST client from the shared resource definitions.

### Canvas stage

The canvas is rendered with PixiJS. `core-client/src/stage` contains the renderer, the gesture/drag handling and the read-only controllers (viewport, item, global events). `client/src/stage` extends it with editor controllers (item/rel editing, resizing, presentation order), item factories and drag-and-drop/paste handling (`data-transfer-handler.ts`). Item types are React components in `core-client/src/components/tapestry/items`.

## Configuration notes

- Env vars: `server/.env` is read at runtime, `client/.env` (`VITE_*`) at build time. Start from the `.env.example` files. The full lists are in `server/src/config.ts` and `client/src/config.ts`.
- Changing a `VITE_*` value requires rebuilding the client, including the Docker image. Client secrets must never be put in `VITE_*` variables.
- `VITE_AUTH_PROVIDERS` is a comma-separated subset of `google,ia,orcid,wikimedia,bluesky`.
- ORCID doesn't accept `localhost` as a redirect URI, so use `http://127.0.0.1:<port>/`. Start and finish a login on the same origin.
- S3 works with LocalStack or MinIO through `AWS_ENDPOINT_URL`. Set `AWS_S3_FORCE_PATH_STYLE=true` for path-style URLs.
- Deployment: pushes to `main` deploy to dev (`docker compose`), pushes to `demo` deploy to AWS (`deployment/docker/*.sh`).

## Verifying changes

- After editing any workspace, run `npm run lint` in that workspace; it must pass with zero warnings.
- Client/core-client/viewer have no tests; `npm run lint` (which includes `tsc --build`) is the check.
- After changing `schema.prisma`, create a migration with `npm run prisma:create-migration <name>`.
