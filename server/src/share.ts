import { Request, Response } from 'express'
import { escape } from 'lodash-es'
import { config } from './config.js'
import { prisma } from './db.js'
import { s3Service } from './services/s3-service.js'

// Link previews (Slack, Facebook, etc.) don't run JS, so this returns the tapestry's
// Open Graph tags and redirects real visitors to the tapestry itself.
export async function shareTapestry(req: Request<{ id: string }>, res: Response) {
  const url = `${config.server.viewerUrl}/t/${encodeURIComponent(req.params.id)}`
  const tapestry = await prisma.tapestry.findUnique({ where: { id: req.params.id } })

  if (!tapestry || tapestry.visibility === 'private') {
    res.redirect(url)
    return
  }

  const image = tapestry.thumbnail && (await s3Service.getReadObjectUrl(tapestry.thumbnail))

  res.send(`<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escape(tapestry.title)}</title>
  <meta property="og:title" content="${escape(tapestry.title)}" />
  <meta property="og:description" content="${escape(tapestry.description ?? '')}" />
  ${image ? `<meta property="og:image" content="${escape(image)}" />` : ''}
  <meta property="og:url" content="${escape(url)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0; url=${escape(url)}" />
</head>
</html>`)
}
