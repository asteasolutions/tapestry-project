import { Prisma } from '@prisma/client'
import { checkOpSupport, CustomFilters } from '../utils.js'
import { SharingLevel } from 'tapestry-shared/src/data-transfer/resources/dtos/admin.js'

const NOTHING: Prisma.TapestryWhereInput = { id: { in: [] } }

/** Looks up a filter by a value which comes from the request and may be invalid. */
function lookup<T>(filters: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(filters, key) ? filters[key] : undefined
}

const SHARING_LEVEL_FILTERS: Record<SharingLevel, Prisma.TapestryWhereInput> = {
  owner: { visibility: 'private', userAccess: { none: {} } },
  invited: { visibility: 'private', userAccess: { some: {} } },
  link: { visibility: 'link' },
}

export type TapestryCreationKind = 'new' | 'forked' | 'imported'

export const TAPESTRY_KIND_FILTERS: Record<TapestryCreationKind, Prisma.TapestryWhereInput> = {
  forked: { parentId: { not: null } },
  imported: { parentId: null, createJob: { is: { type: 'import' } } },
  new: {
    parentId: null,
    OR: [{ createJob: { is: null } }, { createJob: { is: { type: { not: 'import' } } } }],
  },
}

function ownerMatches(term: string): Prisma.UserWhereInput {
  return {
    OR: [
      { username: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ],
  }
}

type TapestryFilterProp = 'search' | 'sharingLevel' | 'featured' | 'owner' | 'kind' | 'multiEditor'

export const adminTapestryFilters: CustomFilters<TapestryFilterProp, Prisma.TapestryWhereInput> = {
  search: ({ op, value }) => {
    checkOpSupport({ op: 'icontains', valueType: 'string' }, op, value)
    return {
      OR: [
        { title: { contains: value, mode: 'insensitive' } },
        { slug: { contains: value, mode: 'insensitive' } },
        { owner: ownerMatches(value) },
      ],
    }
  },
  sharingLevel: ({ op, value }) => {
    checkOpSupport({ op: ['eq', 'in'], valueType: ['string', 'array'] }, op, value)
    const levels = Array.isArray(value) ? value : [value]
    return { OR: levels.map((level) => lookup(SHARING_LEVEL_FILTERS, level) ?? NOTHING) }
  },
  featured: ({ op, value }) => {
    checkOpSupport({ op: 'eq', valueType: 'string' }, op, value)
    return { featured: value === 'true' }
  },
  owner: ({ op, value }) => {
    checkOpSupport({ op: 'icontains', valueType: 'string' }, op, value)
    return { owner: ownerMatches(value) }
  },
  kind: ({ op, value }) => {
    checkOpSupport({ op: 'eq', valueType: 'string' }, op, value)
    return lookup(TAPESTRY_KIND_FILTERS, value) ?? NOTHING
  },
  multiEditor: ({ op, value }) => {
    checkOpSupport({ op: 'eq', valueType: 'string' }, op, value)
    const hasEditors: Prisma.TapestryWhereInput = { userAccess: { some: { canEdit: true } } }
    return value === 'true' ? hasEditors : { NOT: hasEditors }
  },
}

export const LOGIN_PROVIDERS = ['google', 'orcid', 'wikimedia', 'bluesky', 'ia'] as const

export type LoginProvider = (typeof LOGIN_PROVIDERS)[number]

export const LOGIN_PROVIDER_FILTERS: Record<LoginProvider, Prisma.UserWhereInput> = {
  google: { gsiUserId: { not: null } },
  orcid: { orcidId: { not: null } },
  wikimedia: { wikimediaId: { not: null } },
  bluesky: { blueskyDid: { not: null } },
  // Internet Archive accounts are identified by email only
  ia: {
    email: { not: null },
    gsiUserId: null,
    orcidId: null,
    wikimediaId: null,
    blueskyDid: null,
  },
}

type UserFilterProp = 'search' | 'provider'

export const adminUserFilters: CustomFilters<UserFilterProp, Prisma.UserWhereInput> = {
  search: ({ op, value }) => {
    checkOpSupport({ op: 'icontains', valueType: 'string' }, op, value)
    return {
      OR: [
        { username: { contains: value, mode: 'insensitive' } },
        { email: { contains: value, mode: 'insensitive' } },
        { givenName: { contains: value, mode: 'insensitive' } },
        { familyName: { contains: value, mode: 'insensitive' } },
      ],
    }
  },
  provider: ({ op, value }) => {
    checkOpSupport({ op: 'eq', valueType: 'string' }, op, value)
    return lookup(LOGIN_PROVIDER_FILTERS, value) ?? { id: { in: [] } }
  },
}
