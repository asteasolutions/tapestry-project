import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { AIChatContext, createLLM, processChatMessage } from '../../ai/index.js'
import { prisma } from '../../db.js'
import { setupTestSuite, teardownTestSuite } from '../utils.js'
import { generateObject } from 'ai'
import { z } from 'zod/v4'
import { generate } from '../seed.js'
import { serializeMessageForAi } from '../../resources/ai-chat-messages.js'
import { Prisma } from '@prisma/client'

beforeAll(setupTestSuite)

afterAll(teardownTestSuite)

const shouldRunAITests = process.env.AI_TESTS === 'true'

const llm = createLLM('google', 'gemini-2.0-flash', process.env.GEMINI_API_KEY!)

async function aiYesNoQuestion(question: string) {
  const response = await generateObject({
    model: llm,
    temperature: 0,
    schema: z.object({ answer: z.enum(['yes', 'no']) }),
    messages: [{ role: 'user', content: question }],
  })

  return response.object.answer === 'yes'
}

async function expectPromptToCreateTapestryFromLinks(prompt: string, expectedTitle = '') {
  const user = await prisma.user.findFirstOrThrow()
  const context: AIChatContext = {
    userId: user.id,
    userName: user.givenName,
    history: [],
  }

  let result = await processChatMessage(prompt, llm, context)
  console.log(`User: ${prompt}\n\nAI: ${result.finalResponse.text}`)
  const isAskingConfirmation = await aiYesNoQuestion(
    `Is the following message asking for confirmation to create a new tapestry:\n\n${result.finalResponse.text}`,
  )

  if (isAskingConfirmation) {
    context.history.push(
      { role: 'user', content: prompt },
      { role: 'assistant', content: result.finalResponse.text },
    )
    const confirmationPrompt =
      'Go ahead and create the tapestry with whatever title and description you decide!'
    result = await processChatMessage(confirmationPrompt, llm, context)

    console.log(`User: ${confirmationPrompt}\n\nAI: ${result.finalResponse.text}`)
  }

  const toolCallStep = result.finalResponse.steps.find((step) => step.finishReason === 'tool-calls')
  const createTapestryToolCall = toolCallStep?.toolCalls.find(
    (call) => call.toolName === 'createTapestryFromLinks',
  )
  expect(createTapestryToolCall).toBeTruthy()
  if (expectedTitle) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(createTapestryToolCall?.input.title).toBe(expectedTitle)
  }
}

async function expectCorrectItemSummary(
  itemInput: Partial<Omit<Prisma.ItemUncheckedCreateInput, 'tapestryId'>>,
  expectedDescription: string,
) {
  const user = await prisma.user.findFirstOrThrow()
  const tapestry = await generate('Tapestry', { ownerId: user.id })
  const item = await generate('Item', {
    tapestryId: tapestry.id,
    ...itemInput,
  })
  const chat = await generate('AiChat', {
    aiProvider: 'google',
    aiModel: 'gemini-2.0-flash',
    tapestryId: tapestry.id,
    userId: user.id,
  })
  const message = await generate('AiChatMessage', {
    chatId: chat.id,
    role: 'user',
    content: 'Summarize this item',
  })
  await generate('AiChatMessageAttachment', {
    messageId: message.id,
    type: 'item',
    itemId: item.id,
  })
  const prompt = await serializeMessageForAi(
    await prisma.aiChatMessage.findUniqueOrThrow({
      where: { id: message.id },
      include: { attachments: { include: { item: true } } },
    }),
  )
  const response = await processChatMessage(prompt, llm, {
    tapestryId: tapestry.id,
    userId: user.id,
    userName: user.givenName,
    history: [],
  })

  console.log(`Item: ${JSON.stringify(itemInput)}\n\nAI summary: ${response.finalResponse.text}`)

  const isCorrect = await aiYesNoQuestion(
    `Does the following message correctly summarize that ${expectedDescription}?\n\n${response.finalResponse.text}`,
  )

  expect(isCorrect).toBeTruthy()
}

describe.runIf(shouldRunAITests)('Test AI Prompts', () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('To run AI tests, GEMINI_API_KEY must be set in .env.test!')
  }

  test('should correctly answer trivial questions about the tapestry', async () => {
    const tapestry = await prisma.tapestry.findFirstOrThrow({
      include: { owner: true, items: true },
    })
    const context: AIChatContext = {
      userId: tapestry.owner.id,
      userName: tapestry.owner.givenName,
      tapestryId: tapestry.id,
      history: [],
    }
    let result = await processChatMessage('What is the title of this tapestry?', llm, context)
    expect(result.finalResponse.text).toContain(tapestry.title)

    result = await processChatMessage('How many items are in this tapestry?', llm, context)
    const isCorrect = await aiYesNoQuestion(
      `Does the following message correctly state that there are ${tapestry.items.length} items in the tapestry:\n\n${result.finalResponse.text}`,
    )
    expect(isCorrect).toBeTruthy()
  })

  test(
    'creates tapestry from links, case 1',
    () =>
      expectPromptToCreateTapestryFromLinks(
        `Create a tapestry with the following links:
        https://testcafe.io/
        https://fakerjs.dev/api/image#urlplaceholder`,
      ),
    10_000,
  )

  test(
    'creates tapestry from links, case 2',
    () =>
      expectPromptToCreateTapestryFromLinks(
        `Create a new tapestry with the following links:
        https://testcafe.io/
        https://fakerjs.dev/api/image#urlplaceholder
      Title "testing tapestry generation 1"`,
        'testing tapestry generation 1',
      ),
    10_000,
  )

  test(
    'creates tapestry from links, case 3',
    () =>
      expectPromptToCreateTapestryFromLinks(
        `Create me a tapestry with these videos:
        https://www.youtube.com/shorts/Mmf-qvyswd8
        https://www.youtube.com/shorts/TPF9XxvK07M`,
      ),
    10_000,
  )

  test(
    'creates tapestry from links, case 4',
    () =>
      expectPromptToCreateTapestryFromLinks(
        `Generate a ta[estry with the following links:
        https://www.youtube.com/shorts/Mmf-qvyswd8
        https://www.youtube.com/shorts/TPF9XxvK07M`,
      ),
    10_000,
  )

  test(
    'can summarize an image item',
    () =>
      expectCorrectItemSummary(
        { type: 'image', source: 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg' },
        'the given image is a sample image from Wikipedia',
      ),
    10_000,
  )

  test(
    'can summarize a text item',
    () =>
      expectCorrectItemSummary(
        {
          type: 'text',
          text: `Many B movies of the 1940s, 50s, and 60s utilized the "spinning newspaper" effect to narrate important
        plot points that occurred offscreen. The effect necessitated the appearance of a realistic front page, which
        consisted of a main headline relevant to the plot, and several smaller headlines used as filler. A large number
        of these spinning newspapers included stories titled "New Petitions Against Tax" and "Building Code Under Fire."`,
        },
        'the given text snippet is about filler text phrases used in movies',
      ),
    10_000,
  )

  test(
    'can summarize a pdf item',
    () =>
      expectCorrectItemSummary(
        {
          type: 'pdf',
          source: 'https://dn790000.ca.archive.org/0/items/the-raven-1865/The_Raven.pdf',
        },
        'the given pdf contains the poem "The Raven" by Edgar Allan Poe',
      ),
    30_000,
  )

  test(
    'can summarize a webpage item',
    () =>
      // XXX: The AI currently doesn't actually open the web page, it infers things only from its URL.
      expectCorrectItemSummary(
        {
          type: 'webpage',
          source: 'https://en.wikipedia.org/wiki/Chess',
        },
        'the given webpage is the Wikipedia article about chess',
      ),
    10_000,
  )
})
