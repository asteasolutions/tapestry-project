import { iaAdvancedSearch } from 'tapestry-core/src/internet-archive'
import { ArchiveOracleSearchDoc } from '../../pages/tapestry/view-model'

export async function archiveOracleSearch(query: string, signal?: AbortSignal) {
  if (!query) return []

  const res = await iaAdvancedSearch(
    {
      q: query,
      fields: {
        identifier: true,
        mediatype: true,
        title: true,
        creator: true,
        publicdate: true,
        downloads: true,
      } as const,
      sort: ['downloads desc', 'publicdate desc'],
      pageSize: 6,
      page: 1,
    },
    signal,
  )

  return (res?.response.docs.map((d) => ({
    identifier: d.identifier,
    mediatype: d.mediatype,
    title: d.title,
    creator: d.creator,
    publicdate: d.publicdate,
    downloads: d.downloads,
  })) ?? []) satisfies ArchiveOracleSearchDoc[]
}
