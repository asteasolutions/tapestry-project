import { Job, Worker } from 'bullmq'
import { BULLMQ_REDIS_BASE_OPTIONS, JobName, JobTypeMap, QUEUE_NAME } from './index.js'
import { generateTapestryThumbnail } from './generate-tapestry-thumbnail.js'
import { s3Cleanup } from './s3-cleanup.js'
import { generateItemThumbnail } from './generate-item-thumbnail.js'
import { createTapestry } from './create-tapestry.js'

async function processTask(job: Job<JobTypeMap[JobName], void, JobName>) {
  switch (job.name) {
    case 'generate-tapestry-thumbnail':
      return generateTapestryThumbnail(job.data as JobTypeMap['generate-tapestry-thumbnail'])
    case 'generate-item-thumbnail':
      return generateItemThumbnail(job.data as JobTypeMap['generate-item-thumbnail'])
    case 's3-cleanup':
      return s3Cleanup()
    case 'create-tapestry':
      return createTapestry(job.data as JobTypeMap['create-tapestry'])
  }
}

const worker = new Worker(QUEUE_NAME, processTask, BULLMQ_REDIS_BASE_OPTIONS)

worker.on('ready', () => {
  console.info(`Worker ${worker.id} ready to accept jobs.`)
})

worker.on('active', (job) => {
  console.info(`Started job ${job.name} (${job.id}).`)
})

worker.on('failed', (job) => {
  console.error(`Job ${job?.name} (${job?.id}) failed.`)
  console.debug(JSON.stringify(job?.data, null, 2))
})

worker.on('completed', (job) => {
  console.info(`Job ${job.name} (${job.id}) completed.`)
})
