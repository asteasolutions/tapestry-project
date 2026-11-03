import { Request, Response } from 'express'
import { escape } from 'lodash-es'
import sharp from 'sharp'
import { config } from './config.js'
import { prisma } from './db.js'
import { s3Service } from './services/s3-service.js'

type ShareRequest = Request<{ username: string; slug: string }>

// Link previews (Slack, Facebook, etc.) don't run JS, so this returns the tapestry's
// Open Graph tags and redirects real visitors to the tapestry itself.
export async function shareTapestry(req: ShareRequest, res: Response) {
  const path = `/u/${encodeURIComponent(req.params.username)}/${encodeURIComponent(req.params.slug)}`
  const url = `${config.server.viewerUrl}${path}`
  const tapestry = await findSharedTapestry(req)

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
}

// The tapestry thumbnail fitted into the 1200x630 size that link previews expect, so it isn't cropped.
export async function shareTapestryImage(req: ShareRequest, res: Response) {
  const tapestry = await findSharedTapestry(req)
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
}

function findSharedTapestry(req: ShareRequest) {
  return prisma.tapestry.findFirst({
    where: {
      slug: req.params.slug,
      owner: { username: req.params.username },
      visibility: { not: 'private' },
    },
  })
}
