import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { queue } from '../tasks/index.js'
import { Express, RequestHandler } from 'express'
import expressBasicAuth from 'express-basic-auth'
import { config } from '../config.js'

const BOARD_PATH = '/admin/queues'

export function initBullBoard(server: Express) {
  const { queueAdminName: user, queueAdminPassword: password } = config.worker

  if (!user || !password) {
    console.warn(`WARNING: User name and password not set - BullMQ UI will not be available!`)
    return
  }

  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath(BOARD_PATH)

  createBullBoard({
    queues: [new BullMQAdapter(queue)],
    serverAdapter,
    options: {
      uiConfig: {
        boardLogo: { path: '/bull-board.png', width: 30, height: 30 },
        boardTitle: 'Tapestries',
        favIcon: { default: '/bull-board.png', alternative: '/bull-board.png' },
      },
    },
  })

  server.use(
    BOARD_PATH,
    expressBasicAuth({
      users: { [`${user}`]: `${password}` },
      challenge: true,
    }),
    serverAdapter.getRouter() as RequestHandler,
  )
}
