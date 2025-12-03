import { isString, sumBy } from 'lodash-es'
import { prisma } from '../db.js'
import { generateItemKey, s3Service, tapestryKey } from './s3-service.js'
import {
  ZipReader,
  Entry,
  ReadableReader,
  BlobWriter,
  HttpReader,
  TextWriter,
  FileEntry,
} from '@zip.js/zip.js'
import { BadRequestError } from '../errors/index.js'
import {
  ROOT_FILE,
  FILE_PREFIX,
  parseRootJson,
  CurrentExport,
} from 'tapestry-core/src/data-format/export/index.js'
import { Prisma, TapestryCreateJob } from '@prisma/client'
import { determineWebpageType } from 'tapestry-core/src/web-sources/index.js'
import { mapIds } from 'tapestry-core/src/utils.js'
import { fileTypeFromBuffer } from 'file-type'

type ExportItem = NonNullable<CurrentExport['items']>[number]

class ImportError extends BadRequestError {
  constructor(
    public type:
      | 'root-not-found'
      | 'bad-item-source'
      | 'item-source-not-found'
      | 'unrecognized-version',
    public message = '',
  ) {
    super(message)
  }
}

function getThumbnail(i: ExportItem) {
  if (i.type === 'video' || i.type === 'webpage') {
    return i.thumbnail
  }
}

function isMediaItem(i: ExportItem) {
  return (
    i.type === 'audio' ||
    i.type === 'book' ||
    i.type === 'image' ||
    i.type === 'pdf' ||
    i.type === 'video' ||
    i.type === 'webpage'
  )
}

function isPlayable(i: ExportItem) {
  return i.type === 'webpage' || i.type === 'video' || i.type === 'audio'
}

function* mediaItems(tapestry: CurrentExport) {
  for (const item of tapestry.items ?? []) {
    if (isMediaItem(item)) {
      yield item
    }
  }
}

export class TapestryImportService {
  private total!: number
  private progress = 0
  private entries!: Entry[]
  private s3Keys: string[] = []

  constructor(private job: TapestryCreateJob) {}

  async import() {
    const { s3Key, userId, id } = this.job
    await prisma.tapestryCreateJob.update({ where: { id }, data: { status: 'processing' } })
    let zipReader: ZipReader<ReadableReader> | undefined

    try {
      zipReader = new ZipReader(
        new HttpReader(await s3Service.getReadObjectUrl(s3Key!), { forceRangeRequests: true }),
      )

      this.entries = await zipReader.getEntries()

      const rootEntry = this.entries.find((e) => e.filename === ROOT_FILE) as FileEntry | undefined
      if (!rootEntry) {
        throw new ImportError('root-not-found', `File ${ROOT_FILE} not found`)
      }
      const rootJson: unknown = JSON.parse(await rootEntry.getData(new TextWriter()))

      const tapestry = parseRootJson(rootJson)
      if (!tapestry) {
        throw new ImportError('unrecognized-version')
      }
      const importedTapestryId = await this.importEntries(userId, tapestry)

      await prisma.tapestryCreateJob.update({
        where: { id },
        data: { status: 'complete', progress: 1, tapestryId: importedTapestryId },
      })

      return importedTapestryId
    } catch (error) {
      console.error('Error during tapestry import', error)
      await prisma.tapestryCreateJob.update({
        where: { id },
        data: { status: 'failed', progress: 1 },
      })
    } finally {
      await s3Service.tryDeleteObject(s3Key!)
      await zipReader?.close()
    }
  }

  private async importEntries(userId: string, tapestry: CurrentExport) {
    try {
      this.total =
        1 +
        sumBy(Array.from(mediaItems(tapestry)), ({ source }) =>
          isString(source) && source.startsWith(FILE_PREFIX) ? 1 : 0,
        )
      return await prisma.$transaction(
        async (tx) => {
          const tapestryId = crypto.randomUUID()
          await tx.tapestry.create({
            data: {
              id: tapestryId,
              slug: tapestryId,
              background: tapestry.background,
              theme: tapestry.theme,
              title: tapestry.title,
              description: tapestry.description,
              ownerId: userId,
              startViewHeight: tapestry.startView?.size.height,
              startViewWidth: tapestry.startView?.size.width,
              startViewX: tapestry.startView?.position.x,
              startViewY: tapestry.startView?.position.y,
            },
          })

          const tapestryThumbnail = tapestry.thumbnail
          if (tapestryThumbnail) {
            await tx.tapestry.update({
              where: { id: tapestryId },
              data: {
                thumbnail: await this.uploadSource(tapestryThumbnail, () =>
                  tapestryKey(tapestryId, 'thumbnail.jpeg'),
                ),
              },
            })
          }

          const groups = await tx.group.createManyAndReturn({
            data:
              tapestry.groups?.map<Prisma.GroupCreateManyInput>((group) => ({
                tapestryId,
                color: group.color,
                hasBackground: group.hasBackground,
                hasBorder: group.hasBorder,
              })) ?? [],
            select: { id: true },
          })

          const groupIdMap = mapIds(tapestry.groups ?? [], groups)

          for (const item of mediaItems(tapestry)) {
            if (item.source.startsWith(FILE_PREFIX)) {
              item.source = await this.uploadSource(item.source, (e, ext) => {
                // source file name is in the format "items/<id> (<file-name>)" and we want only the file-name
                let filename = /.*\((.*)\)/.exec(e.filename)![1]
                if (ext) {
                  filename = `${filename}.${ext}`
                }
                return generateItemKey(tapestryId, filename)
              })
            }

            const itemThumbnail = getThumbnail(item)
            if (itemThumbnail) {
              itemThumbnail.source = await this.uploadSource(itemThumbnail.source, () =>
                tapestryKey(tapestryId, `item-${item.id}-thumbnail.jpeg`),
              )
            }

            if (item.customThumbnail) {
              item.customThumbnail = await this.uploadSource(item.customThumbnail, (_, ext) =>
                tapestryKey(tapestryId, `item-${item.id}-custom-thumbnail.${ext}`),
              )
            }
          }

          const items = await tx.item.createManyAndReturn({
            data: await Promise.all(
              tapestry.items?.map<Promise<Prisma.ItemCreateManyInput>>(async (i) => {
                const thumbnail = getThumbnail(i)
                const isMedia = isMediaItem(i)
                const source = isMedia ? i.source : undefined

                return {
                  tapestryId,
                  height: i.size.height,
                  width: i.size.width,
                  positionX: i.position.x,
                  positionY: i.position.y,
                  notes: i.notes,
                  dropShadow: !!i.dropShadow,
                  groupId: groupIdMap[i.groupId ?? ''],
                  customThumbnail: i.customThumbnail,

                  backgroundColor: isMedia ? undefined : i.backgroundColor,
                  text: isMedia ? undefined : i.text,

                  ...(i.type === 'actionButton'
                    ? { action: i.action, actionType: i.actionType }
                    : {}),

                  source,
                  title: i.title,
                  type: i.type,
                  webpageType:
                    i.type === 'webpage'
                      ? (i.webpageType ?? (await determineWebpageType(i.source)))
                      : null,
                  ...(isPlayable(i) ? { startTime: i.startTime, stopTime: i.stopTime } : {}),

                  thumbnail: thumbnail?.source,
                  thumbnailHeight: thumbnail?.size.height,
                  thumbnailWidth: thumbnail?.size.width,
                  defaultPage: i.type === 'pdf' ? i.defaultPage : null,
                }
              }) ?? [],
            ),
            select: { id: true },
          })

          const itemIdMap = mapIds(tapestry.items ?? [], items)
          await tx.rel.createMany({
            data:
              tapestry.rels?.map<Prisma.RelCreateManyInput>((r) => ({
                tapestryId,
                color: r.color,
                fromAnchorX: r.from.anchor.x,
                fromAnchorY: r.from.anchor.y,
                fromItemId: itemIdMap[r.from.itemId],
                toAnchorX: r.to.anchor.x,
                toAnchorY: r.to.anchor.y,
                toItemId: itemIdMap[r.to.itemId],
                fromArrowhead: r.from.arrowhead,
                toArrowhead: r.to.arrowhead,
                weight: r.weight,
              })) ?? [],
          })

          const presentationSteps = await tx.presentationStep.createManyAndReturn({
            data:
              tapestry.presentation?.map<Prisma.PresentationStepCreateManyInput>((step) => ({
                ...(step.type === 'item'
                  ? { itemId: itemIdMap[step.itemId] }
                  : { groupId: groupIdMap[step.groupId] }),
              })) ?? [],
            select: { id: true },
          })

          const presentationStepIdMap = mapIds(tapestry.presentation ?? [], presentationSteps)
          for (const [ind, step] of presentationSteps.entries()) {
            const { prevStepId } = tapestry.presentation![ind]
            if (prevStepId) {
              await tx.presentationStep.update({
                data: { prevStepId: presentationStepIdMap[prevStepId] },
                where: step,
              })
            }
          }

          return tapestryId
        },
        {
          timeout: 10 * 60 * 60 * 1000,
        },
      )
    } catch (e) {
      this.s3Keys.forEach((key) => s3Service.deleteObject(key))
      throw e
    }
  }

  private async uploadSource(source: string, keyGenerator: (entry: Entry, ext?: string) => string) {
    const entryPath = source.slice(FILE_PREFIX.length)
    const entry = this.entries.find((e) => e.filename === entryPath) as FileEntry | undefined
    if (!entry) {
      throw new ImportError(
        'item-source-not-found',
        `Entry ${entryPath} referenced in root but not found.`,
      )
    }
    const blob = await entry.getData(new BlobWriter())
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const type = await fileTypeFromBuffer(buffer)

    const key = keyGenerator(entry, type?.ext)
    await s3Service.putObject(key, buffer, type?.mime)
    this.s3Keys.push(key)
    ++this.progress
    await prisma.tapestryCreateJob.update({
      where: { id: this.job.id },
      data: { progress: this.progress / this.total },
    })
    return key
  }
}
