import { extname } from 'node:path'
import mime from 'mime'
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
import { ActionType, Prisma, TapestryCreateJob } from '@prisma/client'
import { determineWebpageType } from 'tapestry-core/src/web-sources/index.js'
import { IdMap, idMapToArray, mapIds } from 'tapestry-core/src/utils.js'
import { fileTypeFromBuffer, FileTypeResult } from 'file-type'
import { Item } from 'tapestry-core/src/data-format/schemas/item.js'
import { generateItemThumbnailRenditionName } from 'tapestry-shared/src/utils.js'
import { generateThumbnails } from '../tasks/utils.js'

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

function isMediaItem(i: Item) {
  return (
    i.type === 'audio' ||
    i.type === 'book' ||
    i.type === 'image' ||
    i.type === 'iiif' ||
    i.type === 'pdf' ||
    i.type === 'video' ||
    i.type === 'webpage'
  )
}

function hasStartStopTime(i: Item) {
  return i.type === 'video' || i.type === 'audio'
}

function* mediaItems(tapestry: CurrentExport) {
  for (const item of tapestry.items ?? []) {
    if (isMediaItem(item)) {
      yield item
    }
  }
}

export function actionMap(
  itemIdMap: IdMap<string>,
  groupIdMap: IdMap<string>,
  action?: string | null,
  actionType?: ActionType | null,
) {
  if (action && actionType === 'internalLink') {
    const params = new URLSearchParams(action)
    const focusValue = params.get('focus')
    if (focusValue) {
      const newFocusId = itemIdMap[focusValue] ?? groupIdMap[focusValue]
      if (newFocusId) {
        params.set('focus', newFocusId)
      }
    }
    action = params.toString()
  }
  return {
    action,
    actionType,
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
      await generateThumbnails({ tapestryId: importedTapestryId })

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
          }

          const itemThumbnailsMap: IdMap<Prisma.ImageAssetCreateManyInput> = {}
          const itemThumbnailRenditions: Prisma.ImageAssetRenditionCreateManyInput[] = []
          for (const item of tapestry.items ?? []) {
            if (!item.thumbnail?.renditions.length) continue

            const thumbnail = { id: crypto.randomUUID() }
            const renditions = await Promise.all(
              item.thumbnail.renditions.map(
                async (r): Promise<Prisma.ImageAssetRenditionCreateManyInput> => ({
                  assetId: thumbnail.id,
                  source: await this.uploadSource(r.source, (_, ext) =>
                    tapestryKey(
                      tapestryId,
                      `${generateItemThumbnailRenditionName(item.id, r)}.${ext}`,
                    ),
                  ),
                  format: r.format,
                  width: r.size.width,
                  height: r.size.height,
                  isPrimary: r.isPrimary,
                  isAutoGenerated: r.isAutoGenerated,
                }),
              ),
            )

            itemThumbnailsMap[item.id] = thumbnail
            itemThumbnailRenditions.push(...renditions)
          }

          const itemThumbnails = idMapToArray(itemThumbnailsMap)
          if (itemThumbnails.length > 0) {
            await tx.imageAsset.createMany({ data: itemThumbnails })
            await tx.imageAssetRendition.createMany({ data: itemThumbnailRenditions })
          }

          const itemIdMap = mapIds(
            tapestry.items ?? [],
            tapestry.items?.map(() => ({ id: crypto.randomUUID() })) ?? [],
          )
          await tx.item.createManyAndReturn({
            data: await Promise.all(
              tapestry.items?.map<Promise<Prisma.ItemCreateManyInput>>(async (i) => {
                const isMedia = isMediaItem(i)
                const source = isMedia ? i.source : undefined

                return {
                  id: itemIdMap[i.id],
                  tapestryId,
                  height: i.size.height,
                  width: i.size.width,
                  positionX: i.position.x,
                  positionY: i.position.y,
                  notes: i.notes,
                  dropShadow: !!i.dropShadow,
                  groupId: groupIdMap[i.groupId ?? ''],
                  thumbnailId: itemThumbnailsMap[i.id]?.id,
                  backgroundColor: isMediaItem(i) ? undefined : i.backgroundColor,
                  text: isMedia ? undefined : i.text,

                  ...(i.type === 'actionButton'
                    ? actionMap(itemIdMap, groupIdMap, i.action, i.actionType)
                    : {}),

                  source,
                  title: i.title,
                  type: i.type,
                  webpageType:
                    i.type === 'webpage'
                      ? (i.webpageType ?? (await determineWebpageType(i.source)))
                      : null,
                  imageService: i.type === 'iiif' ? i.imageService : null,
                  ...(hasStartStopTime(i) ? { startTime: i.startTime, stopTime: i.stopTime } : {}),
                  defaultPage: i.type === 'pdf' ? i.defaultPage : null,
                }
              }) ?? [],
            ),
            select: { id: true },
          })

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
    const type = await this.determineFileType(entryPath, buffer)

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

  private async determineFileType(
    fileName: string,
    fileContent: Uint8Array,
  ): Promise<FileTypeResult | undefined> {
    // Attempt to detect MIME type from file extension
    const ext = extname(fileName)
    const mimeType = mime.getType(ext)
    if (mimeType) return { ext, mime: mimeType }

    // If it doesn't work, attempt to detect type from file content
    const typeFromContent = await fileTypeFromBuffer(fileContent)
    return (
      typeFromContent && {
        // Preserve the original file extension, if any
        ext: ext || typeFromContent.ext,
        mime: typeFromContent.mime,
      }
    )
  }
}
