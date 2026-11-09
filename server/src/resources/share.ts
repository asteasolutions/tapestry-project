import { Router } from 'express'
import { escape } from 'lodash-es'
import sharp from 'sharp'
import { config } from '../config.js'
import { prisma } from '../db.js'
import { s3Service } from '../services/s3-service.js'

export const shareRouter = Router()

// Link previews (Slack, Facebook, etc.) don't run JS, so this returns the tapestry's
// Open Graph tags and redirects real visitors to the tapestry itself.
shareRouter.get('/share/u/:username/:slug', async (req, res, next) => {
  try {
    const path = `/u/${encodeURIComponent(req.params.username)}/${encodeURIComponent(req.params.slug)}`
    const url = `${config.server.viewerUrl}${path}`
    const tapestry = await findSharedTapestry(req.params)

    if (!tapestry) {
      res.redirect(url)
      return
    }

    const image = tapestry.thumbnail
      ? new URL(`/api/share${path}/image`, config.server.externalUrl).href
      : `${config.server.viewerUrl}/open-graph-logo-orange.png`

    res.send(`<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escape(tapestry.title)}</title>
  <link rel="icon" type="image/png" href="${config.server.viewerUrl}/favicon.png" />
  <meta property="og:site_name" content="Tapestries" />
  <meta property="og:title" content="${escape(tapestry.title)}" />
  <meta property="og:description" content="${escape(tapestry.description ?? '')}" />
  <meta property="og:image" content="${escape(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escape(url)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0; url=${escape(url)}" />
</head>
</html>`)
  } catch (error) {
    next(error)
  }
})

// The tapestry thumbnail fitted into the 1200x630 size that link previews expect, so it isn't cropped.
shareRouter.get('/share/u/:username/:slug/image', async (req, res, next) => {
  try {
    const tapestry = await findSharedTapestry(req.params)
    if (!tapestry?.thumbnail) {
      res.sendStatus(404)
      return
    }

    const { Body } = await s3Service.readObject(tapestry.thumbnail)
    const image = await sharp(await Body!.transformToByteArray())
      .resize(1200, 630, { fit: 'contain', background: tapestry.background })
      .flatten({ background: tapestry.background })
      .jpeg({ quality: 85 })
      .toBuffer()

    res.type('jpeg').set('Cache-Control', 'public, max-age=3600').send(image)
  } catch (error) {
    next(error)
  }
})

function findSharedTapestry({ username, slug }: { username: string; slug: string }) {
  return prisma.tapestry.findFirst({
    where: {
      slug,
      owner: { username },
      visibility: { not: 'private' },
    },
  })
}
