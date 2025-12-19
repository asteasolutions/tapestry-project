import { flattenError, ZodType } from 'zod/v4'
import { ExportV0, ExportV0Schema } from './v0/index.js'
import { ExportV1, ExportV1Schema } from './v1/index.js'
import { ExportV2, ExportV2Schema } from './v2/index.js'
import { ExportV3, ExportV3Schema } from './v3/index.js'
import { ExportV4, ExportV4Schema } from './v4/index.js'
import { ExportV5, ExportV5Schema } from './v5/index.js'
import { ExportV6, ExportV6Schema } from './v6/index.js'
import z from 'zod/v4'

export const ROOT_FILE = 'root.json'
export const FILE_PREFIX = 'file:/'
export const TYPE = 'application/zip'

abstract class ExportParser<O, I extends ZodType = ZodType> {
  public abstract readonly schema: I
  public abstract get version(): number

  protected abstract parseInternal(data: z.infer<I>): O | null

  parse(data: unknown) {
    console.debug(`Attempting to parse import with parser V${this.version}`)
    const parsed = this.schema.safeParse(data)
    if (parsed.success) {
      return this.parseInternal(parsed.data)
    }
    console.debug(`Attempt failed with error:`, flattenError(parsed.error))
    return null
  }
}

class ParserV0 extends ExportParser<ExportV1> {
  public readonly schema = ExportV0Schema
  public readonly version = 0

  protected parseInternal(tapestry: ExportV0): ExportV1 {
    return {
      ...tapestry,
      version: 1,
      createdAt: new Date(),
      theme: tapestry.theme ?? 'light',
      rels: tapestry.rels.map((r) => ({
        ...r,
        tapestryId: tapestry.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      items: tapestry.items.map((i) => {
        const baseProps = {
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        if (i.type === 'wayback-page') {
          return {
            ...i,
            ...baseProps,
            type: 'waybackPage',
            source: i.source,
            internallyHosted: false,
          }
        }
        if (i.type === 'text') {
          return {
            ...i,
            ...baseProps,
            tapestryId: tapestry.id,
            dropShadow: false,
            source: undefined,
            internallyHosted: false,
          }
        }

        return {
          ...i,
          ...baseProps,
          source: i.source instanceof File ? '' : i.source,
          internallyHosted: false,
        }
      }),
    }
  }
}

class ParserV1 extends ExportParser<ExportV2> {
  public readonly schema = ExportV1Schema
  public readonly version = 1

  protected parseInternal(tapestry: ExportV1): ExportV2 {
    return {
      ...tapestry,
      version: 2,
      items: tapestry.items?.map((i) => ({ ...i, dropShadow: i.dropShadow ?? false })),
    }
  }
}

class ParserV2 extends ExportParser<ExportV3> {
  public readonly schema = ExportV2Schema
  public readonly version = 2

  protected parseInternal(tapestry: ExportV2): ExportV3 {
    return {
      ...tapestry,
      version: 3,
      items: tapestry.items?.map((i) => ({
        ...i,
        startTime:
          i.type === 'audio' || i.type === 'video' || i.type === 'webpage' ? i.skipSeconds : null,
      })),
    }
  }
}

class ParserV3 extends ExportParser<ExportV4> {
  public readonly schema = ExportV3Schema
  public readonly version = 3

  protected parseInternal(tapestry: ExportV3): ExportV4 {
    return {
      ...tapestry,
      version: 4,
      rels: tapestry.rels?.map((r) => ({ ...r, weight: 'light' })),
      items: tapestry.items?.map((i) =>
        i.type === 'waybackPage' ? { ...i, type: 'webpage', webpageType: 'iaWayback' } : i,
      ),
    }
  }
}

class ParserV4 extends ExportParser<ExportV5> {
  public readonly schema = ExportV4Schema
  public readonly version = 4

  protected parseInternal(tapestry: ExportV4): ExportV5 {
    return { ...tapestry, version: 5 }
  }
}

class ParserV5 extends ExportParser<ExportV6> {
  public readonly schema = ExportV5Schema
  public readonly version = 5

  protected parseInternal(tapestry: ExportV5): ExportV6 {
    return {
      ...tapestry,
      version: 6,
      items: tapestry.items?.map((item) => {
        if (item.type !== 'actionButton') return item

        try {
          const url = new URL(item.action ?? '')
          // At this point we don't have a better way of guessing whether the action
          // is an internal link than making some heuristic checks on the search params
          if (url.searchParams.has('focus')) {
            return {
              ...item,
              action: url.searchParams.toString(),
              actionType: 'internalLink',
            }
          }
        } catch (error) {
          console.warn('Error while parsing Tapestry', error)
        }

        return {
          ...item,
          actionType: 'externalLink',
        }
      }),
    }
  }
}

class ParserV6 extends ExportParser<ExportV6> {
  public readonly schema = ExportV6Schema
  public readonly version = 6

  protected parseInternal(tapestry: ExportV6): ExportV6 {
    return tapestry
  }
}

const PARSERS = [
  new ParserV0(),
  new ParserV1(),
  new ParserV2(),
  new ParserV3(),
  new ParserV4(),
  new ParserV5(),
  new ParserV6(),
] as const

type Last<Type extends readonly unknown[]> = Type extends readonly [...unknown[], infer R]
  ? R
  : never

type CurrentParser = Last<typeof PARSERS>
export const CurrentExportSchema = PARSERS.at(-1)!.schema as CurrentParser['schema']
export type CurrentExport = ReturnType<CurrentParser['parseInternal']>

export function parseRootJson(rootJson: unknown): CurrentExport | null {
  for (const [i, parser] of PARSERS.entries()) {
    let data = parser.parse(rootJson)
    if (data) {
      for (let j = i + 1; j < PARSERS.length; ++j) {
        data = PARSERS[j].parse(data)
      }
      return data as CurrentExport
    }
  }

  return null
}
