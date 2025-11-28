import { parse } from 'date-fns'
import { resource } from '../services/rest-resources'
import {
  ListWBMSnapshotsProxyDto,
  UserListResponse,
  WBMSnapshotDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/proxy'
import { iaAdvancedSearch, IAItem } from 'tapestry-core/src/internet-archive'

export interface WBMSnapshotWithDate extends WBMSnapshotDto {
  date: Date
}

export async function fetchWBMSnapshots(
  url: string | null | undefined,
  limit?: number,
  signal?: AbortSignal,
): Promise<WBMSnapshotWithDate[]> {
  if (!url) return []

  const { result: snapshots } = (await resource('proxy').create(
    { type: 'list-wbm-snapshots', url, limit },
    {},
    { signal },
  )) as ListWBMSnapshotsProxyDto

  return snapshots
    .filter((snapshot) => snapshot.mimetype === 'text/html')
    .map((snapshot) => ({
      ...snapshot,
      date: parse(snapshot.timestamp, 'yyyyMMddHHmmss', new Date()),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

export async function getUserListItems(url: string): Promise<IAItem[]> {
  const data = (
    await resource('proxy').create({
      type: 'ia-user-list',
      url,
    })
  ).result as UserListResponse

  if (!data.success) {
    console.warn('Could not fetch user list for', url)
    return []
  }

  const memberIds = data.value.members.map((m) => m.identifier)

  const membersResponse = await iaAdvancedSearch({
    q: `identifier:(${memberIds.join(' OR ')})`,
    fields: { identifier: true, mediatype: true },
  })

  return (
    membersResponse?.response.docs.map((doc) => ({
      id: doc.identifier,
      mediaType: doc.mediatype,
    })) ?? []
  )
}
