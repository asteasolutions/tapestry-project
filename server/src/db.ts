import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '../prisma/generated/prisma/client'
import { config } from './config.js'
import { readFileSync } from 'fs'
import path from 'path'
import { getDMMF, GetDMMFError } from '@prisma/get-dmmf'
import { DMMF } from '@prisma/client/runtime/client'

const logLevel = config.db.logLevel
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.db.connectionString }),
  log: logLevel ? (logLevel.split(',') as Prisma.LogLevel[]) : undefined,
  errorFormat: 'pretty',
})

// This could be further extended to check the `meta` error field for the specific columns
// causing the error
export function isUniqueConstraintViolation(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

export function ensureTransaction<T>(
  tx: Prisma.TransactionClient | null | undefined,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (tx) return callback(tx)

  return prisma.$transaction((tx) => callback(tx))
}

function isDMMFDocument(obj: ReturnType<typeof getDMMF>): obj is DMMF.Document {
  return !(obj as GetDMMFError).error
}

let datamodel: DMMF.Document | null = null

export function getPrismaDatamodel() {
  if (datamodel) {
    return datamodel
  }
  const res = getDMMF({
    datamodel: readFileSync(path.join(import.meta.dirname, '..', 'prisma', 'schema.prisma'), {
      encoding: 'utf-8',
    }),
  })

  if (!isDMMFDocument(res)) {
    throw res.error
  }

  datamodel = res

  return datamodel
}
