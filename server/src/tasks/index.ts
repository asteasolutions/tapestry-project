import { Queue, QueueBaseOptions } from 'bullmq'
import { config } from '../config.js'
import { redis } from '../services/redis.js'

export const QUEUE_NAME = 'tasks'

export const BULLMQ_REDIS_BASE_OPTIONS: QueueBaseOptions = {
  connection: redis,
  prefix: `{BULLMQ}`,
}

export interface JobTypeMap {
  'generate-tapestry-thumbnail': {
    tapestryId: string
  }
  'generate-item-thumbnail': {
    itemId: string
  }
  's3-cleanup': void
  'create-tapestry': {
    tapestryCreateJobId: string
  }
}

export type JobName = keyof JobTypeMap

export const queue = new Queue<JobTypeMap[JobName], void, JobName | 's3-cleanup-scheduler'>(
  QUEUE_NAME,
  BULLMQ_REDIS_BASE_OPTIONS,
)

export async function scheduleS3Cleaner() {
  return queue.upsertJobScheduler(
    's3-cleanup-scheduler',
    {
      pattern: config.worker.s3CleanupPattern,
    },
    {
      name: 's3-cleanup',
      opts: {
        removeOnFail: true,
        removeOnComplete: true,
      },
    },
  )
}
