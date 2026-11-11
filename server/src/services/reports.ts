import { Prisma } from '@prisma/client'
import {
  DrillTargetDto,
  ReportComparison,
  ReportDataDto,
  ReportDto,
  ReportFigureDto,
  ReportMetric,
  ReportTableDto,
  ReportTableRowDto,
  ReportUnit,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin.js'
import { ListFilterDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common.js'
import { prisma } from '../db.js'

/**
 * Admin reports. Admin activity is excluded from usage figures: records owned by (or created by)
 * admin users are not counted, except where a metric is explicitly about admin actions.
 */

interface Range {
  from: Date | null
  to: Date
}

interface MetricDefinition {
  title: string
  dataStatus: 'available' | 'partial'
  limitations: string | null
  /** Current-state metrics describe today's values and ignore the selected range. */
  isCurrentState: boolean
  compute: (range: Range) => Promise<Omit<ReportDataDto, 'from' | 'to'>>
}

// ---- Helpers ----

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_WEEKS = 520
const DAY_MS = 24 * 60 * 60 * 1000

function startOfWeekUTC(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // date_trunc('week') in PostgreSQL starts weeks on Monday
  const day = (d.getUTCDay() + 6) % 7
  return new Date(d.getTime() - day * DAY_MS)
}

function weekKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function iso(date: Date) {
  return date.toISOString()
}

/** SQL condition restricting a timestamp column to the range. */
function inRange(column: Prisma.Sql, { from, to }: Range) {
  return from
    ? Prisma.sql`${column} >= ${from} AND ${column} < ${to}`
    : Prisma.sql`${column} < ${to}`
}

function rangeFilter({ from, to }: Range, prop = 'createdAt'): ListFilterDto {
  return {
    ...(from ? { [`${prop}:gte`]: iso(from) } : {}),
    [`${prop}:lt`]: iso(to),
  }
}

function figure(
  key: string,
  label: string,
  value: number | null,
  unit: ReportUnit = 'count',
  drill: DrillTargetDto | null = null,
): ReportFigureDto {
  return { key, label, value, unit, drill }
}

function percent(part: number, total: number) {
  return total === 0 ? null : Math.round((part / total) * 1000) / 10
}

function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return Math.round(value * 10) / 10
}

interface WeeklyRow {
  week: Date
  [column: string]: Date | number
}

/**
 * Builds a "by week" table, including weeks without any records. The first column is expected to
 * hold the total for each week.
 */
function weeklyTable(
  key: string,
  title: string,
  range: Range,
  columns: { key: string; label: string }[],
  rows: WeeklyRow[],
  drillForWeek?: (weekStart: Date, weekEnd: Date, column: string) => DrillTargetDto | null,
): ReportTableDto {
  const byWeek = new Map(rows.map((row) => [weekKey(row.week), row]))
  const first = range.from ?? rows.at(0)?.week
  const tableRows: ReportTableRowDto[] = []

  if (first) {
    let week = startOfWeekUTC(first)
    // Show the most recent weeks if the range is too long
    const lastWeek = startOfWeekUTC(new Date(range.to.getTime() - 1))
    const minWeek = new Date(lastWeek.getTime() - (MAX_WEEKS - 1) * WEEK_MS)
    if (week < minWeek) week = minWeek

    for (; week < range.to; week = new Date(week.getTime() + WEEK_MS)) {
      const row = byWeek.get(weekKey(week))
      // Clamp the drill-through range to the selected range
      const start = range.from && range.from > week ? range.from : week
      const nextWeek = new Date(week.getTime() + WEEK_MS)
      const end = nextWeek > range.to ? range.to : nextWeek
      tableRows.push({
        key: weekKey(week),
        label: `Week of ${weekKey(week)}`,
        values: columns.map((c) => Number(row?.[c.key] ?? 0)),
        drill: drillForWeek ? columns.map((c) => drillForWeek(start, end, c.key)) : null,
      })
    }
  }

  return {
    key,
    title,
    columns: columns.map((c) => ({ ...c, unit: 'count' })),
    rows: tableRows,
  }
}

function bucketTable(
  key: string,
  title: string,
  buckets: { label: string; min: number; max: number }[],
  values: number[],
): ReportTableDto {
  return {
    key,
    title,
    columns: [
      { key: 'users', label: 'Users', unit: 'count' },
      { key: 'share', label: 'Share', unit: 'percent' },
    ],
    rows: buckets.map((bucket) => {
      const count = values.filter((v) => v >= bucket.min && v <= bucket.max).length
      return {
        key: bucket.label,
        label: bucket.label,
        values: [count, percent(count, values.length)],
        drill: null,
      }
    }),
  }
}

// ---- Providers ----

const PROVIDERS = [
  { key: 'google', label: 'Google', sql: Prisma.sql`"gsiUserId" IS NOT NULL` },
  { key: 'orcid', label: 'ORCID', sql: Prisma.sql`"orcidId" IS NOT NULL` },
  { key: 'wikimedia', label: 'Wikimedia', sql: Prisma.sql`"wikimediaId" IS NOT NULL` },
  { key: 'bluesky', label: 'Bluesky', sql: Prisma.sql`"blueskyDid" IS NOT NULL` },
  {
    key: 'ia',
    label: 'Internet Archive',
    sql: Prisma.sql`"email" IS NOT NULL AND "gsiUserId" IS NULL AND "orcidId" IS NULL AND "wikimediaId" IS NULL AND "blueskyDid" IS NULL`,
  },
] as const

const NON_ADMIN_USER = { 'role:eq': 'user' }
const NON_ADMIN_OWNER = { 'owner.role:eq': 'user' }

// ---- Item sources (M-06) ----

/**
 * The agreed list of domains per source. Items are classified by the host of their source URL;
 * IIIF items are classified by their type instead.
 */
export const ITEM_SOURCE_DOMAINS: Record<string, string[]> = {
  'Internet Archive': ['archive.org'],
  Wikimedia: [
    'wikimedia.org',
    'wikipedia.org',
    'wikidata.org',
    'wikisource.org',
    'wikibooks.org',
    'wikiquote.org',
    'wikiversity.org',
    'wikivoyage.org',
    'wiktionary.org',
    'wikinews.org',
  ],
  YouTube: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
}

function classifySource(type: string, host: string | null) {
  if (type === 'iiif') return 'IIIF'
  if (host) {
    const normalized = host.toLowerCase()
    for (const [source, domains] of Object.entries(ITEM_SOURCE_DOMAINS)) {
      if (domains.some((d) => normalized === d || normalized.endsWith(`.${d}`))) return source
    }
  }
  return 'Other'
}

// ---- Item types (M-05) ----

const ITEM_TYPES = [
  ['text', 'Text'],
  ['image', 'Image'],
  ['audio', 'Audio'],
  ['video', 'Video'],
  ['book', 'Book'],
  ['pdf', 'PDF'],
  ['iiif', 'IIIF'],
  ['webpage', 'Web page'],
  ['actionButton', 'Action button'],
] as const

const WEBPAGE_TYPES = [
  ['youtube', 'YouTube'],
  ['vimeo', 'Vimeo'],
  ['iaWayback', 'Wayback Machine'],
  ['iaAudio', 'Internet Archive audio'],
  ['iaVideo', 'Internet Archive video'],
  ['other', 'Other web page'],
] as const

const NON_MEDIA_TYPES = Prisma.sql`('text', 'actionButton')`

// ---- Metric definitions ----

const METRICS: Record<ReportMetric, MetricDefinition> = {
  'M-01': {
    title: 'Accounts created',
    dataStatus: 'available',
    limitations:
      'A user who has linked more than one login provider is counted under each of them. Internet Archive ' +
      'accounts are identified as accounts with an email and no other provider ID.',
    isCurrentState: false,
    compute: async (range) => {
      const rows = await prisma.$queryRaw<WeeklyRow[]>`
        SELECT date_trunc('week', "createdAt") AS week,
          count(*)::INTEGER AS total,
          ${Prisma.join(
            PROVIDERS.map(
              (p) =>
                Prisma.sql`(count(*) FILTER (WHERE ${p.sql}))::INTEGER AS ${Prisma.raw(`"${p.key}"`)}`,
            ),
          )}
        FROM "User"
        WHERE "role" = 'user' AND ${inRange(Prisma.sql`"createdAt"`, range)}
        GROUP BY 1 ORDER BY 1
      `
      const sum = (key: string) => rows.reduce((acc, row) => acc + Number(row[key]), 0)
      const drill = (from: Date | null, to: Date, provider?: string): DrillTargetDto => ({
        kind: 'users',
        filter: {
          ...NON_ADMIN_USER,
          ...rangeFilter({ from, to }),
          ...(provider && provider !== 'total' ? { 'provider:eq': provider } : {}),
        },
      })

      return {
        figures: [
          figure('total', 'Accounts created', sum('total'), 'count', drill(range.from, range.to)),
          ...PROVIDERS.map((p) =>
            figure(p.key, p.label, sum(p.key), 'count', drill(range.from, range.to, p.key)),
          ),
        ],
        tables: [
          weeklyTable(
            'byWeek',
            'Accounts created by week',
            range,
            [
              { key: 'total', label: 'Total' },
              ...PROVIDERS.map((p) => ({ key: p.key, label: p.label })),
            ],
            rows,
            (from, to, column) => drill(from, to, column),
          ),
        ],
      }
    },
  },

  'M-02': {
    title: 'Tapestries created',
    dataStatus: 'available',
    limitations: 'Counts only tapestries that have not been deleted.',
    isCurrentState: false,
    compute: async (range) => {
      const rows = await prisma.$queryRaw<WeeklyRow[]>`
        SELECT date_trunc('week', t."createdAt") AS week,
          count(*)::INTEGER AS total,
          (count(*) FILTER (WHERE t."parentId" IS NULL AND (j."type" IS NULL OR j."type" <> 'import')))::INTEGER AS new,
          (count(*) FILTER (WHERE t."parentId" IS NOT NULL))::INTEGER AS forked,
          (count(*) FILTER (WHERE t."parentId" IS NULL AND j."type" = 'import'))::INTEGER AS imported
        FROM "Tapestry" t
        JOIN "User" u ON u."id" = t."ownerId"
        LEFT JOIN "TapestryCreateJob" j ON j."tapestryId" = t."id"
        WHERE u."role" = 'user' AND ${inRange(Prisma.sql`t."createdAt"`, range)}
        GROUP BY 1 ORDER BY 1
      `
      const sum = (key: string) => rows.reduce((acc, row) => acc + Number(row[key]), 0)
      const drill = (from: Date | null, to: Date, kind?: string): DrillTargetDto => ({
        kind: 'tapestries',
        filter: {
          ...NON_ADMIN_OWNER,
          ...rangeFilter({ from, to }),
          ...(kind && kind !== 'total' ? { 'kind:eq': kind } : {}),
        },
      })
      const columns = [
        { key: 'total', label: 'Total' },
        { key: 'new', label: 'New' },
        { key: 'forked', label: 'Forked' },
        { key: 'imported', label: 'Imported' },
      ]

      return {
        figures: columns.map((c) =>
          figure(
            c.key,
            c.key === 'total' ? 'Tapestries created' : c.label,
            sum(c.key),
            'count',
            drill(range.from, range.to, c.key),
          ),
        ),
        tables: [weeklyTable('byWeek', 'Tapestries created by week', range, columns, rows, drill)],
      }
    },
  },

  'M-03': {
    title: 'New users reaching a first tapestry and first media item',
    dataStatus: 'available',
    limitations:
      'Counts surviving content only: users whose first tapestry or media item has been deleted are counted ' +
      'by their earliest remaining one. A media item is any item other than text and action buttons.',
    isCurrentState: false,
    compute: async (range) => {
      const users = await prisma.$queryRaw<
        { createdAt: Date; firstTapestry: Date | null; firstMedia: Date | null }[]
      >`
        SELECT u."createdAt",
          (SELECT min(t."createdAt") FROM "Tapestry" t WHERE t."ownerId" = u."id") AS "firstTapestry",
          (SELECT min(i."createdAt") FROM "Item" i JOIN "Tapestry" t ON t."id" = i."tapestryId"
            WHERE t."ownerId" = u."id" AND i."type"::TEXT NOT IN ${NON_MEDIA_TYPES}) AS "firstMedia"
        FROM "User" u
        WHERE u."role" = 'user' AND ${inRange(Prisma.sql`u."createdAt"`, range)}
      `
      const withTapestry = users.filter((u) => u.firstTapestry)
      const withMedia = users.filter((u) => u.firstMedia)
      const days = (from: Date, to: Date) => Math.max(0, (to.getTime() - from.getTime()) / DAY_MS)
      const drill: DrillTargetDto = {
        kind: 'users',
        filter: { ...NON_ADMIN_USER, ...rangeFilter(range) },
      }

      return {
        figures: [
          figure('newUsers', 'New users', users.length, 'count', drill),
          figure('withTapestry', 'Reached a first tapestry', withTapestry.length),
          figure(
            'withTapestryShare',
            'Share reaching a first tapestry',
            percent(withTapestry.length, users.length),
            'percent',
          ),
          figure(
            'medianDaysToTapestry',
            'Median time to first tapestry',
            median(withTapestry.map((u) => days(u.createdAt, u.firstTapestry!))),
            'days',
          ),
          figure('withMedia', 'Reached a first media item', withMedia.length),
          figure(
            'withMediaShare',
            'Share reaching a first media item',
            percent(withMedia.length, users.length),
            'percent',
          ),
          figure(
            'medianDaysToMedia',
            'Median time to first media item',
            median(withMedia.map((u) => days(u.createdAt, u.firstMedia!))),
            'days',
          ),
        ],
        tables: [],
      }
    },
  },

  'M-04': {
    title: 'Users by activity',
    dataStatus: 'available',
    limitations: null,
    isCurrentState: true,
    compute: async () => {
      const users = await prisma.$queryRaw<
        { tapestries: number; items: number; mediaTypes: number }[]
      >`
        SELECT
          (SELECT count(*) FROM "Tapestry" t WHERE t."ownerId" = u."id")::INTEGER AS tapestries,
          (SELECT count(*) FROM "Item" i JOIN "Tapestry" t ON t."id" = i."tapestryId"
            WHERE t."ownerId" = u."id")::INTEGER AS items,
          (SELECT count(DISTINCT i."type") FROM "Item" i JOIN "Tapestry" t ON t."id" = i."tapestryId"
            WHERE t."ownerId" = u."id" AND i."type"::TEXT NOT IN ${NON_MEDIA_TYPES})::INTEGER AS "mediaTypes"
        FROM "User" u
        WHERE u."role" = 'user'
      `
      const active = users.filter((u) => u.tapestries > 0).length
      const totalTapestries = users.reduce((acc, u) => acc + u.tapestries, 0)

      return {
        figures: [
          figure('users', 'Users', users.length, 'count', {
            kind: 'users',
            filter: NON_ADMIN_USER,
          }),
          figure('active', 'Users with at least one tapestry', active),
          figure(
            'activeShare',
            'Share with at least one tapestry',
            percent(active, users.length),
            'percent',
          ),
          figure(
            'avgTapestries',
            'Average tapestries per user',
            users.length ? Math.round((totalTapestries / users.length) * 10) / 10 : null,
          ),
        ],
        tables: [
          bucketTable(
            'byTapestries',
            'Users by number of tapestries',
            [
              { label: 'None yet', min: 0, max: 0 },
              { label: '1', min: 1, max: 1 },
              { label: '2–5', min: 2, max: 5 },
              { label: '6 or more', min: 6, max: Infinity },
            ],
            users.map((u) => u.tapestries),
          ),
          bucketTable(
            'byItems',
            'Users by number of items',
            [
              { label: '0', min: 0, max: 0 },
              { label: '1–10', min: 1, max: 10 },
              { label: '11–50', min: 11, max: 50 },
              { label: '51–200', min: 51, max: 200 },
              { label: '201+', min: 201, max: Infinity },
            ],
            users.map((u) => u.items),
          ),
          bucketTable(
            'byMediaTypes',
            'Users by number of media types used',
            [
              { label: '0', min: 0, max: 0 },
              { label: '1', min: 1, max: 1 },
              { label: '2', min: 2, max: 2 },
              { label: '3', min: 3, max: 3 },
              { label: '4+', min: 4, max: Infinity },
            ],
            users.map((u) => u.mediaTypes),
          ),
        ],
      }
    },
  },

  'M-05': {
    title: 'Items per tapestry by media type',
    dataStatus: 'available',
    limitations: null,
    isCurrentState: true,
    compute: async () => {
      const tapestryCount = await prisma.tapestry.count({ where: { owner: { role: 'user' } } })
      const rows = await prisma.$queryRaw<
        { type: string; webpageType: string | null; items: number; tapestries: number }[]
      >`
        SELECT i."type"::TEXT AS type, i."webpageType"::TEXT AS "webpageType",
          count(*)::INTEGER AS items, count(DISTINCT i."tapestryId")::INTEGER AS tapestries
        FROM "Item" i
        JOIN "Tapestry" t ON t."id" = i."tapestryId"
        JOIN "User" u ON u."id" = t."ownerId"
        WHERE u."role" = 'user'
        GROUP BY 1, 2
      `
      const totalItems = rows.reduce((acc, r) => acc + r.items, 0)
      const perTapestry = (items: number) =>
        tapestryCount ? Math.round((items / tapestryCount) * 100) / 100 : null

      const typeRow = (key: string, label: string, matching: typeof rows): ReportTableRowDto => {
        const items = matching.reduce((acc, r) => acc + r.items, 0)
        // A tapestry can be counted once per webpage type, so this is an upper bound for web pages
        const tapestries = matching.reduce((acc, r) => Math.max(acc, r.tapestries), 0)
        return {
          key,
          label,
          values: [items, perTapestry(items), percent(items, totalItems), tapestries],
          drill: null,
        }
      }

      const columns: ReportTableDto['columns'] = [
        { key: 'items', label: 'Items', unit: 'count' },
        { key: 'perTapestry', label: 'Per tapestry', unit: 'count' },
        { key: 'share', label: 'Share of items', unit: 'percent' },
        { key: 'tapestries', label: 'Tapestries using it', unit: 'count' },
      ]

      return {
        figures: [
          figure('tapestries', 'Tapestries', tapestryCount),
          figure('items', 'Items', totalItems),
          figure('perTapestry', 'Average items per tapestry', perTapestry(totalItems)),
        ],
        tables: [
          {
            key: 'byType',
            title: 'Items by media type',
            columns,
            rows: ITEM_TYPES.map(([type, label]) =>
              typeRow(
                type,
                label,
                rows.filter((r) => r.type === type),
              ),
            ),
          },
          {
            key: 'byWebpageType',
            title: 'Web page items by kind',
            columns: columns.filter((c) => c.key !== 'tapestries'),
            rows: WEBPAGE_TYPES.map(([webpageType, label]) => {
              const items = rows
                .filter(
                  (r) =>
                    r.type === 'webpage' &&
                    (webpageType === 'other' ? !r.webpageType : r.webpageType === webpageType),
                )
                .reduce((acc, r) => acc + r.items, 0)
              return {
                key: webpageType,
                label,
                values: [items, perTapestry(items), percent(items, totalItems)],
                drill: null,
              }
            }),
          },
        ],
      }
    },
  },

  'M-06': {
    title: 'Items by source',
    dataStatus: 'partial',
    limitations:
      'Derived from the web address of each item. IIIF items are classified by their type. Domains per source: ' +
      Object.entries(ITEM_SOURCE_DOMAINS)
        .map(([source, domains]) => `${source} (${domains.join(', ')})`)
        .join('; ') +
      '. Uploaded files and all other addresses count as "Other". Text and action button items are excluded.',
    isCurrentState: false,
    compute: async (range) => {
      const rows = await prisma.$queryRaw<{ type: string; host: string | null; items: number }[]>`
        SELECT i."type"::TEXT AS type,
          substring(i."source" from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:?#]+)') AS host,
          count(*)::INTEGER AS items
        FROM "Item" i
        JOIN "Tapestry" t ON t."id" = i."tapestryId"
        JOIN "User" u ON u."id" = t."ownerId"
        WHERE u."role" = 'user' AND i."type"::TEXT NOT IN ${NON_MEDIA_TYPES}
          AND ${inRange(Prisma.sql`i."createdAt"`, range)}
        GROUP BY 1, 2
      `
      const sources = ['Internet Archive', 'Wikimedia', 'YouTube', 'IIIF', 'Other']
      const counts = new Map(sources.map((s) => [s, 0]))
      for (const row of rows) {
        const source = classifySource(row.type, row.host)
        counts.set(source, (counts.get(source) ?? 0) + row.items)
      }
      const total = [...counts.values()].reduce((a, b) => a + b, 0)

      return {
        figures: [
          figure('total', 'Media items added', total),
          ...sources.map((s) => figure(s, s, counts.get(s) ?? 0)),
        ],
        tables: [
          {
            key: 'bySource',
            title: 'Media items added by source',
            columns: [
              { key: 'items', label: 'Items', unit: 'count' },
              { key: 'share', label: 'Share', unit: 'percent' },
            ],
            rows: sources.map((s) => ({
              key: s,
              label: s,
              values: [counts.get(s) ?? 0, percent(counts.get(s) ?? 0, total)],
              drill: null,
            })),
          },
        ],
      }
    },
  },

  'M-07': {
    title: 'Tapestries with more than one editor',
    dataStatus: 'available',
    limitations: null,
    isCurrentState: true,
    compute: async () => {
      const where: Prisma.TapestryWhereInput = { owner: { role: 'user' } }
      const [total, multiEditor] = await Promise.all([
        prisma.tapestry.count({ where }),
        prisma.tapestry.count({ where: { ...where, userAccess: { some: { canEdit: true } } } }),
      ])

      return {
        figures: [
          figure('multiEditor', 'Tapestries with more than one editor', multiEditor, 'count', {
            kind: 'tapestries',
            filter: { ...NON_ADMIN_OWNER, 'multiEditor:eq': 'true' },
          }),
          figure('share', 'Share of all tapestries', percent(multiEditor, total), 'percent'),
          figure('total', 'All tapestries', total, 'count', {
            kind: 'tapestries',
            filter: NON_ADMIN_OWNER,
          }),
        ],
        tables: [],
      }
    },
  },

  'M-08': {
    title: 'Invites sent',
    dataStatus: 'partial',
    limitations:
      'Only the current invitation link of each tapestry is stored: creating a new link replaces the previous ' +
      'one, so earlier invites are not counted. No inviter or invitee is stored.',
    isCurrentState: false,
    compute: async (range) => {
      const rows = await prisma.$queryRaw<WeeklyRow[]>`
        SELECT date_trunc('week', inv."createdAt") AS week,
          count(*)::INTEGER AS total,
          (count(*) FILTER (WHERE NOT inv."canEdit"))::INTEGER AS view,
          (count(*) FILTER (WHERE inv."canEdit"))::INTEGER AS edit
        FROM "TapestryInvitation" inv
        JOIN "Tapestry" t ON t."id" = inv."tapestryId"
        JOIN "User" u ON u."id" = t."ownerId"
        WHERE u."role" = 'user' AND ${inRange(Prisma.sql`inv."createdAt"`, range)}
        GROUP BY 1 ORDER BY 1
      `
      const sum = (key: string) => rows.reduce((acc, row) => acc + Number(row[key]), 0)
      const columns = [
        { key: 'total', label: 'Total' },
        { key: 'view', label: 'View' },
        { key: 'edit', label: 'Edit' },
      ]

      return {
        figures: columns.map((c) =>
          figure(c.key, c.key === 'total' ? 'Invites sent' : `${c.label} invites`, sum(c.key)),
        ),
        tables: [weeklyTable('byWeek', 'Invites sent by week', range, columns, rows)],
      }
    },
  },

  'M-09': {
    title: 'Tapestries by sharing level',
    dataStatus: 'available',
    limitations: null,
    isCurrentState: true,
    compute: async () => {
      const base: Prisma.TapestryWhereInput = { owner: { role: 'user' } }
      const [owner, invited, link, featured] = await Promise.all([
        prisma.tapestry.count({
          where: { ...base, visibility: 'private', userAccess: { none: {} } },
        }),
        prisma.tapestry.count({
          where: { ...base, visibility: 'private', userAccess: { some: {} } },
        }),
        prisma.tapestry.count({ where: { ...base, visibility: 'link' } }),
        prisma.tapestry.count({ where: { ...base, featured: true } }),
      ])
      const total = owner + invited + link
      const drill = (filter: ListFilterDto): DrillTargetDto => ({
        kind: 'tapestries',
        filter: { ...NON_ADMIN_OWNER, ...filter },
      })
      const levels = [
        { key: 'owner', label: 'Owner only', value: owner },
        { key: 'invited', label: 'Invited people', value: invited },
        { key: 'link', label: 'Anyone with the link', value: link },
      ]

      return {
        figures: [
          ...levels.map((l) =>
            figure(l.key, l.label, l.value, 'count', drill({ 'sharingLevel:eq': l.key })),
          ),
          figure(
            'featured',
            'Featured in the Gallery',
            featured,
            'count',
            drill({ 'featured:eq': 'true' }),
          ),
        ],
        tables: [
          {
            key: 'bySharingLevel',
            title: 'Tapestries by sharing level',
            columns: [
              { key: 'tapestries', label: 'Tapestries', unit: 'count' },
              { key: 'share', label: 'Share', unit: 'percent' },
            ],
            rows: levels.map((l) => ({
              key: l.key,
              label: l.label,
              values: [l.value, percent(l.value, total)],
              drill: [drill({ 'sharingLevel:eq': l.key }), null],
            })),
          },
        ],
      }
    },
  },

  'M-11': {
    title: 'Tapestries deleted',
    dataStatus: 'available',
    limitations: 'Deletions are recorded from the release of the admin panel onwards.',
    isCurrentState: false,
    compute: async (range) => {
      const rows = await prisma.$queryRaw<WeeklyRow[]>`
        SELECT date_trunc('week', "createdAt") AS week,
          count(*)::INTEGER AS total,
          (count(*) FILTER (WHERE NOT "byAdmin"))::INTEGER AS owner,
          (count(*) FILTER (WHERE "byAdmin"))::INTEGER AS admin
        FROM "TapestryDeletion"
        WHERE ${inRange(Prisma.sql`"createdAt"`, range)}
        GROUP BY 1 ORDER BY 1
      `
      const sum = (key: string) => rows.reduce((acc, row) => acc + Number(row[key]), 0)
      const columns = [
        { key: 'total', label: 'Total' },
        { key: 'owner', label: 'By owner' },
        { key: 'admin', label: 'By admin' },
      ]

      return {
        figures: columns.map((c) =>
          figure(c.key, c.key === 'total' ? 'Tapestries deleted' : c.label, sum(c.key)),
        ),
        tables: [weeklyTable('byWeek', 'Tapestries deleted by week', range, columns, rows)],
      }
    },
  },

  'M-12': {
    title: 'Exports',
    dataStatus: 'available',
    limitations: 'Exports are recorded from the release of the admin panel onwards.',
    isCurrentState: false,
    compute: async (range) => {
      const rows = await prisma.$queryRaw<WeeklyRow[]>`
        SELECT date_trunc('week', e."createdAt") AS week, count(*)::INTEGER AS total
        FROM "TapestryExport" e
        LEFT JOIN "User" u ON u."id" = e."userId"
        WHERE (u."role" IS NULL OR u."role" = 'user') AND ${inRange(Prisma.sql`e."createdAt"`, range)}
        GROUP BY 1 ORDER BY 1
      `
      const total = rows.reduce((acc, row) => acc + Number(row.total), 0)

      return {
        figures: [figure('total', 'Exports', total)],
        tables: [
          weeklyTable(
            'byWeek',
            'Exports by week',
            range,
            [{ key: 'total', label: 'Exports' }],
            rows,
          ),
        ],
      }
    },
  },
}

function comparisonRange({ from, to }: Range, compare: ReportComparison): Range | null {
  if (compare === 'none') return null

  if (compare === 'previous') {
    // "All time" has no previous period
    if (!from) return null
    const length = to.getTime() - from.getTime()
    return { from: new Date(from.getTime() - length), to: from }
  }

  const shift = (date: Date) => {
    const shifted = new Date(date)
    shifted.setUTCFullYear(shifted.getUTCFullYear() - 1)
    return shifted
  }
  return { from: from && shift(from), to: shift(to) }
}

export async function runReport(
  metric: ReportMetric,
  range: Range,
  compare: ReportComparison,
): Promise<ReportDto> {
  const definition = METRICS[metric]
  const now = new Date()

  const compute = async (r: Range): Promise<ReportDataDto> => ({
    ...r,
    ...(await definition.compute(r)),
  })

  const current = definition.isCurrentState
    ? await compute({ from: null, to: now })
    : await compute(range)

  const otherRange = definition.isCurrentState ? null : comparisonRange(range, compare)

  return {
    metric,
    title: definition.title,
    dataStatus: definition.dataStatus,
    limitations: definition.limitations,
    isCurrentState: definition.isCurrentState,
    current,
    comparison: otherRange && (await compute(otherRange)),
  }
}
