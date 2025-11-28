import { Prisma, PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { config } from '../config.js'

export async function setup() {
  const { user, password, host, port, name } = config.db

  if (!/test/i.test(name)) throw new Error('Tests must use a test DB!')

  const prismaConfig = new PrismaClient({
    datasourceUrl: `postgresql://${user}:${password}@${host}:${port}/postgres?schema=public`,
  })

  try {
    await prismaConfig.$executeRaw`CREATE DATABASE ${name};`
  } catch {
    console.log(`Database ${name} already exists.`)
  }

  await prismaConfig.$disconnect()

  execSync('npx prisma migrate deploy')
}

export async function teardown() {
  const { user, password, host, port, name } = config.db

  if (!/test/i.test(name)) throw new Error('Tests must use a test DB!')

  const prismaConfig = new PrismaClient({
    datasourceUrl: `postgresql://${user}:${password}@${host}:${port}/postgres?schema=public&connection_limit=1`,
  })

  await prismaConfig.$executeRaw(Prisma.raw(`DROP DATABASE ${name} WITH (FORCE)`))
  await prismaConfig.$disconnect()
}
