import { prisma } from '../../src/db'

interface Options {
  invalidCharacterPlaceholder?: string
  dryRun?: boolean
}

export async function correctInvalidSlugs({
  invalidCharacterPlaceholder,
  dryRun = true,
}: Options = {}) {
  const invalidCharacterPattern = '[^a-zA-Z0-9_-]'
  let result: unknown = null

  return prisma
    .$transaction(async (tx) => {
      result = await tx.$queryRaw`
        UPDATE "Tapestry"
        SET slug = regexp_replace(slug, ${invalidCharacterPattern}, ${invalidCharacterPlaceholder ?? '_'}, 'g')
        WHERE slug SIMILAR TO ${`%${invalidCharacterPattern}%`}
        RETURNING id, title, slug;`

      if (dryRun) {
        throw new Error('The changes are rolled back, becase the dryRun option was chosen')
      }
      return result
    })
    .catch((err) => ({ error: err instanceof Error ? err.message : err, result }))
}
