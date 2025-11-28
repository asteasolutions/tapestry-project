/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { prisma } from '../../db.js'
import { createTapestry } from '../../tasks/create-tapestry.js'
import { loginUser } from '../auth.js'
import { setupTestSuite, teardownTestSuite } from '../utils.js'
import { beforeAll, afterAll, test, expect } from 'vitest'

beforeAll(setupTestSuite)

afterAll(teardownTestSuite)

test('successfully creates a fork job', async () => {
  const tapestry = await prisma.tapestry.findFirstOrThrow({
    include: { items: true, rels: true },
  })
  const request = loginUser(tapestry.ownerId)

  const itemCount = await prisma.item.count()
  const relCount = await prisma.rel.count()

  const response = await request
    .post(`/api/tapestry-create-jobs`)
    .send({
      type: 'fork',
      parentId: tapestry.id,
    })
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')

  expect(response.statusCode).toBe(200)
  expect(response.body).toMatchObject({
    parentId: tapestry.id,
    userId: tapestry.ownerId,
    type: 'fork',
  })

  // Run the background job manually since we don't have workers here.
  await createTapestry({ tapestryCreateJobId: response.body.id })

  const newTapestry = await prisma.tapestry.findFirst({
    where: { parentId: tapestry.id },
    include: { items: true, rels: true, owner: true },
  })

  expect(newTapestry).toMatchObject({
    parentId: tapestry.id,
    owner: { id: tapestry.ownerId },
    items: new Array(tapestry.items.length).fill(expect.anything()),
    rels: new Array(tapestry.rels.length).fill(expect.anything()),
  })

  expect(itemCount + tapestry.items.length).toEqual(await prisma.item.count())
  expect(relCount + tapestry.rels.length).toEqual(await prisma.rel.count())
})
