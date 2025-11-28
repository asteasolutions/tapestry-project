import { prisma } from '../db.js'
import { socketServer } from '../socket/index.js'
import { queue } from '../tasks/index.js'
import { seedDb, truncateDb } from './seed.js'

export async function setupTestSuite() {
  await seedDb()
}

export async function teardownTestSuite() {
  await truncateDb()
  await queue.disconnect()
  await socketServer.destroy()
  await prisma.$disconnect()
}
