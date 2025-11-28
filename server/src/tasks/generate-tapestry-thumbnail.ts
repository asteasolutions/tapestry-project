import { URL } from 'url'
import { JobTypeMap } from './index.js'
import { config } from '../config.js'
import { s3Service, tapestryKey } from '../services/s3-service.js'
import { prisma } from '../db.js'
import { createJWT } from '../auth/tokens.js'
import { takeScreenshot } from './puppeteer.js'
import { REFRESH_TOKEN_COOKIE_NAME } from '../auth/index.js'

// 6 times the dimensions of the thumbnail as displayed in the UI
const WIDTH = 6 * 375
const HEIGHT = Math.floor(WIDTH * (10 / 21))

// Inset to clip toolbars near the edges of the tapestry viewer.
const INSET = 100

async function screenshot(url: string, userId: string) {
  return takeScreenshot(url, {
    width: WIDTH + 2 * INSET,
    height: HEIGHT + 2 * INSET,
    timeout: config.worker.tapestryThumbnailGenerationTimeout,
    clip: {
      x: INSET,
      y: INSET,
      width: WIDTH,
      height: HEIGHT,
    },
    setupContext: (context) =>
      context.setCookie({
        domain: new URL(config.server.externalUrl).host,
        name: REFRESH_TOKEN_COOKIE_NAME,
        value: createJWT({ userId }, '10m'),
        expires: -1, // Session cookie
        httpOnly: true,
        secure: true,
      }),
  })
}

export async function generateTapestryThumbnail({
  tapestryId,
}: JobTypeMap['generate-tapestry-thumbnail']) {
  const thumbnailKey = tapestryKey(tapestryId, 'thumbnail.jpeg')
  try {
    const tapestry = await prisma.tapestry.findUniqueOrThrow({
      where: { id: tapestryId },
    })
    const thumbnail = await screenshot(
      `${config.server.viewerUrl}/t/${tapestryId}`,
      tapestry.ownerId,
    )
    await s3Service.putObject(thumbnailKey, thumbnail, 'image/jpeg')

    await prisma.tapestry.update({
      where: { id: tapestryId },
      data: { thumbnail: thumbnailKey },
    })
  } catch (error) {
    console.error('Error while generating tapestry thumbnail', error)
  }
}
