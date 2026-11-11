---
name: new-resource
description: Scaffold a new REST resource end to end (shared schema + DTO + endpoint, server resource with access policy, transformer, registration). Use when adding a new API resource or endpoint set.
disable-model-invocation: true
argument-hint: <resource-name> [short description]
---

# New REST resource: $ARGUMENTS

The layer checklist lives in `.claude/rules/api-contract.md`. Follow it; this skill only fixes the order and the decisions to make up front. Use `server/src/resources/comments.ts` and its shared schema/DTO as the model to copy from.

## 1. Settle the design with the user first

Before editing anything, propose and get confirmation on:
- **Name**: kebab-case URL name (`tapestry-bookmarks`) and camelCase key (`tapestryBookmarks`).
- **Endpoints** (`crudl` subset) and **`requireAuth`** letters.
- **Fields**: which are client-settable on create, which are editable on update, which are server-set.
- **Access rules** per endpoint, in one sentence each, including what an anonymous user (`userId === null`) gets. Say which existing check from `resources/tapestries.ts` each rule reuses.
- **List scoping**: does `list` need a `ListFilter` / `createListFilter`, or is `canList` enough?
- **Includes**: relations clients may request (`allowedIncludes`).
- **Realtime**: does it change tapestry contents, so that it needs `notifyTapestryUpdate`?
- **Persistence**: an existing Prisma model, or a new one?

## 2. Implement in this order

1. **Prisma** (new model only): edit `server/prisma/schema.prisma` (a hook regenerates the Prisma client). Ask the user to confirm the database is running before you run `npm run prisma:create-migration <name>`. Never edit an existing migration.
2. **shared**: schema → DTO → `createRESTEndpoints` entry in `resources/index.ts`. Then compare the schema and DTO files side by side.
3. **server**: transformer (and the `DtoMap` / `MODEL_SERIALIZERS` entries for a new model) → resource → `bindEndpoints` in `server/src/index.ts`.

The client needs no wiring for a new endpoint: `client/src/services/rest-resources.ts` builds the typed client from the shared definitions.

## 3. Verify and report

- `npm run lint` in `shared` and in `server`. Report the actual results, including failures.
- List the files you created and changed, and the access rule you implemented for each endpoint.
- Don't commit. Leave the changes in the working tree.
