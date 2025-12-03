import {
  BlobReader,
  BlobWriter,
  TextWriter,
  ZipReader,
  type Entry,
  type FileEntry,
} from '@zip.js/zip.js'
import { Store } from 'tapestry-core-client/src/lib/store'
import { viewModelFromTapestry } from 'tapestry-core-client/src/view-model/utils'
import {
  CurrentExport,
  FILE_PREFIX,
  parseRootJson,
  ROOT_FILE,
} from 'tapestry-core/src/data-format/export'
import { HexColor } from 'tapestry-core/src/data-format/schemas/common'
import { hasThumbnail, isMediaItem } from 'tapestry-core/src/utils'

type ExportItem = NonNullable<CurrentExport['items']>[number]

export class ImportService {
  private entries!: Entry[]

  async parse(file: File | undefined) {
    if (!file) {
      return
    }
    const zipReader = new ZipReader(new BlobReader(file))
    this.entries = await zipReader.getEntries()

    const rootEntry = this.findEntry(ROOT_FILE)

    if (!rootEntry) {
      return
    }

    const rootJson: unknown = JSON.parse(await rootEntry.getData(new TextWriter()))
    const parsed = parseRootJson(rootJson)
    if (!parsed) {
      return
    }

    const viewModel = viewModelFromTapestry(
      {
        ...parsed,
        items: await Promise.all((parsed.items ?? []).map(this.parseItem)),
        rels: parsed.rels ?? [],
        groups: (parsed.groups ?? []).map((g) => ({ ...g, color: g.color as HexColor | null })),
        thumbnail: await this.toObjectUrl(parsed.thumbnail),
      },
      parsed.presentation ?? [],
    )

    return new Store(viewModel, [])
  }

  private findEntry = (name: string) =>
    this.entries.find((e) => e.filename === name) as FileEntry | undefined

  private parseItem = async (i: ExportItem) => {
    if (!isMediaItem(i)) {
      return i
    }

    return {
      ...i,
      source: (await this.toObjectUrl(i.source)) ?? i.source,
      thumbnail: hasThumbnail(i)
        ? {
            source: (await this.toObjectUrl(i.thumbnail.source))!,
            size: i.thumbnail.size,
          }
        : undefined,
      customThumbnail: await this.toObjectUrl(i.customThumbnail),
    }
  }

  private async toObjectUrl(url: string | undefined | null) {
    if (!url) {
      return
    }
    const path = url.startsWith(FILE_PREFIX) ? url.slice(FILE_PREFIX.length) : url
    const entry = this.findEntry(path)
    if (!entry) {
      return
    }
    return URL.createObjectURL(await entry.getData(new BlobWriter()))
  }
}
