/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { prisma } from '../../db.js'
import { loginUser } from '../auth.js'
import { setupTestSuite, teardownTestSuite } from '../utils.js'
import { beforeAll, afterAll, test, expect } from 'vitest'

beforeAll(setupTestSuite)

afterAll(teardownTestSuite)

test('returns tapestries without includes', async () => {
  const tapestry = (await prisma.tapestry.findFirst())!
  const request = loginUser(tapestry.ownerId)
  const response = await request.get(`/api/tapestries/${tapestry.id}`)
  expect(response.statusCode).toBe(200)
  expect(response.body).toMatchObject({ id: tapestry.id })
  expect(response.body).not.toHaveProperty('owner')
  expect(response.body).not.toHaveProperty('items')
  expect(response.body).not.toHaveProperty('rels')
})

test('returns tapestries with includes', async () => {
  const tapestry = (await prisma.tapestry.findFirst({
    include: { owner: true, items: true, rels: true },
  }))!
  const request = loginUser(tapestry.ownerId)

  let response = await request.get(`/api/tapestries/${tapestry.id}?include[0]=owner`)
  expect(response.statusCode).toBe(200)
  expect(response.body).toMatchObject({ id: tapestry.id, owner: { id: tapestry.ownerId } })
  expect(response.body).not.toHaveProperty('items')
  expect(response.body).not.toHaveProperty('rels')

  response = await request.get(`/api/tapestries/${tapestry.id}?include[0]=items&include[1]=rels`)
  expect(response.statusCode).toBe(200)
  expect(response.body).toMatchObject({
    id: tapestry.id,
    items: new Array(tapestry.items.length).fill(expect.anything()),
    rels: new Array(tapestry.rels.length).fill(expect.anything()),
  })
  expect(response.body).not.toHaveProperty('owner')
})

test('returns tapestries with nested includes', async () => {
  const tapestry = (await prisma.tapestry.findFirst({
    include: { userAccess: true },
  }))!
  const request = loginUser(tapestry.ownerId)

  const response = await request.get(
    `/api/tapestries/${tapestry.id}?include[0]=owner&include[1]=userAccess`,
  )
  expect(response.statusCode).toBe(200)
  expect(response.body).toMatchObject({
    id: tapestry.id,
    owner: { id: tapestry.ownerId },
    userAccess: expect.arrayContaining([
      expect.objectContaining({
        userId: tapestry.userAccess[0].userId,
      }),
    ]),
  })
  expect(response.body).not.toHaveProperty('items')
  expect(response.body).not.toHaveProperty('rels')
})
