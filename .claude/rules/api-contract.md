---
paths:
  - "shared/src/data-transfer/**"
  - "server/src/resources/**"
  - "server/src/transformers/**"
---

# REST API contract (shared ↔ server)

A resource or field change spans several layers. Update all of them in the same change.
`server/src/resources/comments.ts` is a compact reference implementation.

## shared

1. **Schema** – `shared/src/data-transfer/resources/schemas/<name>.ts`, Zod from `zod/v4`,
   extending `BaseResourceSchema`. Create schemas `.omit()` `baseResourcePropsMask` plus any
   server-set fields (e.g. `authorId`); update schemas list only the editable fields.
2. **DTO** – `dtos/<name>.ts` must mirror the schema by hand: same fields, same optionality
   (`.nullish()` ↔ `?: T | null`), same omit list on the create/update types. Nothing checks
   this at compile time, so compare the two files side by side after editing either one.
3. **Endpoint** – register in `resources/index.ts` with `createRESTEndpoints<IO<Dto>, IO<CreateDto>, IO<UpdateDto>>()`.
   `endpoints` / `requireAuth` are letter sets from `crudl`. Any relation a client may request
   via `?include=` must be listed in `allowedIncludes`, or the request is rejected with 403.

## server

4. **Resource** – `server/src/resources/<name>.ts` exports `RESTResourceImpl<Resources['<name>'], ListFilter>`
   with one handler and one `can<Endpoint>` per endpoint letter (`canCreate`, `canRead`,
   `canUpdate`, `canDestroy`, `canList`). When `ListFilter` is not `never`, `createListFilter(userId)`
   is required and must scope the list to what that user may see.
5. **Authorization** – reuse the tapestry-level checks exported from `resources/tapestries.ts`
   (`canViewTapestry`, `canEditTapestry`, `canListTapestryElements`) rather than re-deriving
   access rules. Every check must handle `userId === null` (anonymous) explicitly.
6. **Includes and serialization** – load relations with `parseIncludes('<Model>', query.include)`
   and return `serialize('<Model>', dbRecord)`. A new Prisma model needs entries in `DtoMap` and
   `MODEL_SERIALIZERS` in `transformers/index.ts`; DTO → DB conversion lives in `transformers/<name>.ts`.
7. **Registration** – `bindEndpoints(resources.<name>, <name>)` in `server/src/index.ts`.
8. **Realtime** – mutations of tapestry contents (tapestry, items, rels, groups, presentation
   steps, including the `*-batch-mutations` resources) must call
   `socketServer.notifyTapestryUpdate(tapestryId, socketIdFromRequest(context.rawRequest))`, or
   `notifyTapestryElementsRemoved` for deletions, so other viewers refresh.
9. **Batch mutations** – they reuse the Item/Rel/Group/PresentationStep create and update schemas
   through `batchMutationCreateParams`, so a field added there also reaches the batch handlers.
   Check that those handlers deal with it.
