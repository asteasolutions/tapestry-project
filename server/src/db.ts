import { Prisma, PrismaClient } from '@prisma/client'
import { config } from './config.js'

const logLevel = config.db.logLevel
export const prisma = new PrismaClient({
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

export type Tx = Prisma.TransactionClient

export function ensureTransaction<T>(
  tx: Tx | null | undefined,
  callback: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (tx) return callback(tx)

  return prisma.$transaction((tx) => callback(tx))
}
