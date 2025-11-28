import { AIChatProvider } from 'tapestry-shared/src/data-transfer/resources/dtos/ai-chat.js'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import {
  ModelMessage,
  generateObject,
  generateText,
  LanguageModelUsage,
  tool,
  ToolSet,
  stepCountIs,
  GenerateTextResult,
  UserModelMessage,
} from 'ai'
import { config } from '../config.js'
import { prisma } from '../db.js'
import { Item, UserSecretType } from '@prisma/client'
import { capitalize, compact, sum } from 'lodash-es'
import z from 'zod/v4'
import { createTapestry } from '../resources/tapestries.js'
import { ItemCreateInTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item.js'
import { UserSecretService } from '../services/user-secret-service.js'
import { LanguageModelV2, LanguageModelV2Usage } from '@ai-sdk/provider'

export interface AIChatContext {
  userId: string
  userName: string
  tapestryId?: string | null
  history: ModelMessage[]
}

const APP_CONTEXT = `"Tapestry" is a new digital format representing an endless canvas containing various documents. The
  following types of documents are supported:
    • Text frames where the content can be formatted in rich-text format (RTF)
    • Images
    • Audio
    • Video
    • PDFs
    • EPUBs
    • Embedded webpages (iframes)
  The documents in the tapestry can be visually linked with one another via arrows, called "rels" internally.
  With its convenient layout, a Tapestry helps readers learn and understand more easily a complicated topic or concept.
  Tapestries also help content creators express themselves in a novel two-dimensional format which frees them from the
  linearity of printed media.`

const PERSONA_PROMPTS = {
  classifier: 'You are an expert in digital content creation.',
  guide: `You are a helpful digital assistant integrated into a Tapestry authoring and viewing tool. You help users
    interact with tapestries by:
      • Providing information about the Tapestry format and tools;
      • Obtaining factual information from the Internet on whatever topic the user is interested in.`,
  generalAssistant: `You are a helpful digital assistant integrated into a Tapestry authoring tool. You can perform the
    following actions on behalf of the user (instructions about each action included):
      • Create a tapestry from a list of links. Instructions:
        - Try to infer the title and description for the tapestry from the provided content. Ask the user for confirmation.
        - When the tapestry is created present a link to it to the user.`,
  inTapestryAssistant: `You are a helpful digital assistant integrated into a Tapestry authoring tool. Currently you
    cannot perform any actions on behalf of the user, only advise.`,
} as const

type Persona = keyof typeof PERSONA_PROMPTS

function generateAppContext(persona: Persona = 'guide'): ModelMessage[] {
  return [
    { role: 'system', content: APP_CONTEXT },
    { role: 'system', content: PERSONA_PROMPTS[persona] },
  ]
}

function atPosition(item: Item) {
  return `at position (${item.positionX}, ${item.positionY})`
}

async function generateTapestryContext(tapestryId: string): Promise<ModelMessage[]> {
  const { title, description, items, rels } = await prisma.tapestry.findUniqueOrThrow({
    where: { id: tapestryId },
    include: { items: true, rels: true },
  })
  const content = compact([
    'This conversation is in the context of the following tapestry:',
    `\t• Title: "${title}"\n`,
    description && `\t• Description: "${description}"`,
    '\t• Items:',
    ...items.map((item) =>
      item.type === 'text'
        ? `\t\t• Text frame ${atPosition(item)} with content: \n${item.text}`
        : item.type === 'webpage'
          ? `\t\t• Embedded webpage ${atPosition(item)} with source: "${item.source}"`
          : `\t\t• ${capitalize(item.type)} item ${atPosition(item)}`,
    ),
    '\t• Rels:',
    ...rels.map((rel) => {
      const hasFromArrow = rel.fromArrowhead !== 'none'
      const hasToArrow = rel.fromArrowhead !== 'none'
      const lineType =
        hasFromArrow && hasToArrow
          ? 'Bidirectional arrow'
          : !hasFromArrow && !hasToArrow
            ? 'Line'
            : 'Arrow'
      const isInReverse = hasFromArrow && !hasToArrow
      const fromItemId = isInReverse ? rel.toItemId : rel.fromItemId
      const toItemId = isInReverse ? rel.fromItemId : rel.toItemId
      const fromItem = items.find((item) => item.id === fromItemId)!
      const toItem = items.find((item) => item.id === toItemId)!

      return `\t\t• ${lineType} from the ${fromItem.type} item ${atPosition(fromItem)} to the ${toItem.type} item ${atPosition(toItem)}`
    }),
  ]).join('\n')

  return [{ role: 'system', content }]
}

async function getAPIKey(provider: AIChatProvider, userId: string) {
  let apiKey: string | undefined

  // Remove when we have other providers
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (provider === 'google') {
    try {
      apiKey = await new UserSecretService(userId).retrieve(UserSecretType.googleApiKey)
    } catch (error) {
      console.error(error)
    }
  }

  if (!apiKey) throw new Error(`No ${provider} API key found user ${userId}`)

  return apiKey
}

export function createLLM(provider: AIChatProvider, model: string, apiKey: string) {
  let llm: LanguageModelV2 | undefined = undefined
  // Remove when we have other providers
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (provider === 'google') {
    try {
      const google = createGoogleGenerativeAI({ apiKey })
      llm = google(model)
    } catch (error) {
      console.error(error)
    }
  }

  if (!llm) throw new Error(`Unsupported model ${provider}/${model}`)

  return llm
}

function createTapestryAssistantTools({ tapestryId, userId }: AIChatContext): ToolSet {
  if (tapestryId) {
    // TODO: Add in-tapestry tools
    return {}
  }

  return {
    createTapestryFromLinks: tool({
      description: 'Creates a new tapestry from a list of links',
      inputSchema: z.object({
        title: z.string(),
        description: z.string(),
        links: z.string().array(),
      }),
      execute: async ({ title, description, links }) => {
        try {
          const nCols = Math.ceil(Math.sqrt(links.length))
          const size = { width: 480, height: 640 }
          const margin = 40
          const items = links.map((link, index): ItemCreateInTapestryDto => {
            const row = Math.floor(index / nCols)
            const col = index % nCols
            return {
              id: crypto.randomUUID(),
              type: 'webpage',
              source: link,
              size,
              position: {
                x: col * (size.width + margin),
                y: row * (size.height + margin),
              },
              dropShadow: true,
            }
          })
          const tapestryId = await createTapestry(
            {
              background: '#ffffff',
              rels: [],
              items,
              title,
              description,
              visibility: 'private',
              theme: 'light',
            },
            userId,
          )
          return {
            success: true,
            tapestryLink: `${config.server.viewerUrl}/t/${tapestryId}/edit`,
          }
        } catch (error) {
          console.error(error)
          return {
            success: false,
            error: (error as Error).message,
          }
        }
      },
    }),
  }
}

export interface AIChatResponse {
  finalResponse: GenerateTextResult<ToolSet, never>
  usagePerStage: {
    stage: string
    usage: LanguageModelV2Usage
  }[]
}

export async function processChatMessage(
  message: string | UserModelMessage,
  model: LanguageModelV2,
  context: AIChatContext,
): Promise<AIChatResponse> {
  const userMessage: UserModelMessage =
    typeof message === 'string' ? { role: 'user', content: message } : message

  const classification = await generateObject({
    model,
    temperature: 0,
    schema: z.object({
      category: z.enum(['tapestry-action-intent', 'general-question']),
    }),
    messages: [
      ...generateAppContext('classifier'),
      ...context.history,
      {
        role: 'user',
        content: 'Analyze the following message',
      },
      userMessage,
      {
        role: 'user',
        content: `Determine the category in which it best fits:
          1. Intent to perform a tapestry action
          2. General question`,
      },
    ],
  })

  const persona: Persona =
    classification.object.category === 'tapestry-action-intent'
      ? context.tapestryId
        ? 'inTapestryAssistant'
        : 'generalAssistant'
      : 'guide'

  const tools =
    persona === 'guide'
      ? {} // TODO: Should we add any tools for general-purpose information extraction?
      : createTapestryAssistantTools(context)

  const messages: ModelMessage[] = [
    ...generateAppContext(persona),
    ...(context.tapestryId ? await generateTapestryContext(context.tapestryId) : []),
    { role: 'user', content: `Hi! My name is ${context.userName}.` },
    ...context.history,
    userMessage,
  ]

  const finalResponse = await generateText({
    model,
    temperature: 0,
    messages,
    tools,
    stopWhen: stepCountIs(3),
  })

  return {
    finalResponse,
    usagePerStage: [
      {
        stage: 'Classification',
        usage: classification.usage,
      },
      {
        stage: 'Response',
        usage: finalResponse.usage,
      },
    ],
  }
}

export async function generateChatMessage(
  provider: AIChatProvider,
  model: string,
  context: AIChatContext,
  message: UserModelMessage,
) {
  const apiKey = await getAPIKey(provider, context.userId)
  const llm = createLLM(provider, model, apiKey)
  const result = await processChatMessage(message, llm, context)

  function printTokens(usage: LanguageModelUsage) {
    return `${usage.inputTokens} input + ${usage.outputTokens} output = ${usage.totalTokens} total`
  }

  console.log(
    `LLM invocation:
    • Model: ${provider}/${model}
    • Tokens:\n${result.usagePerStage.map(({ stage, usage }) => `\t\t\t${stage}: ${printTokens(usage)}`).join('\n')}
      • Total: ${sum(result.usagePerStage.map(({ usage }) => usage.totalTokens ?? 0))}`,
  )

  return result.finalResponse.text
}
