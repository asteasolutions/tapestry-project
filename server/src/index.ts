import express, { Router } from 'express'
import http from 'http'
import bodyParser from 'body-parser'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { config } from './config.js'
import { bindEndpoints } from './resources/base-resource.js'
import { resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { tapestries } from './resources/tapestries.js'
import { items } from './resources/items.js'
import { rels } from './resources/rels.js'
import { sessions } from './resources/sessions.js'
import { errorHandler } from './errors/index.js'
import { assetURLs } from './resources/asset-urls.js'
import { users } from './resources/users.js'
import { publicUserProfiles } from './resources/public-user-profiles.js'
import { tapestryInvitations } from './resources/tapestry-invitations.js'
import { comments } from './resources/comments.js'
import { proxy } from './resources/proxy.js'
import { scheduleS3Cleaner } from './tasks/index.js'
import { tapestryCreateJobs } from './resources/tapestry-create-jobs.js'
import { commentThreads } from './resources/comment-threads.js'
import { tapestryAccess } from './resources/taprestry-access.js'
import { initBullBoard } from './services/bull-board.js'
import path from 'path'
import { itemBatchMutations } from './resources/item-batch-mutations.js'
import { relBatchMutations } from './resources/rel-batch-mutations.js'
import { tapestryInteractions } from './resources/tapestry-interactions.js'
import { aiChats } from './resources/ai-chats.js'
import { aiChatMessages } from './resources/ai-chat-messages.js'
import { groups } from './resources/groups.js'
import { groupBatchMutations } from './resources/group-batch-mutations.js'
import { presentationSteps } from './resources/presentation-steps.js'
import { presentationStepBatchMutations } from './resources/presentation-step-batch-mutations.js'
import { socketServer } from './socket/index.js'
import { userSecrets } from './resources/user-secrets.js'
import { tapestryBookmarks } from './resources/tapestry-bookmarks.js'
import qs from 'qs'

export const app = express()

app.set('query parser', (query: string) =>
  qs.parse(query, {
    comma: true,
  }),
)

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      callback(null, origin)
    },
  }),
)
app.use(cookieParser())
app.use(bodyParser.json())

app.use(morgan('dev'))

app.use(
  '/api',
  bindEndpoints(resources.tapestries, tapestries),
  bindEndpoints(resources.items, items),
  bindEndpoints(resources.itemBatchMutations, itemBatchMutations),
  bindEndpoints(resources.rels, rels),
  bindEndpoints(resources.relBatchMutations, relBatchMutations),
  bindEndpoints(resources.comments, comments),
  bindEndpoints(resources.commentThreads, commentThreads),
  bindEndpoints(resources.sessions, sessions),
  bindEndpoints(resources.users, users),
  bindEndpoints(resources.publicUserProfiles, publicUserProfiles),
  bindEndpoints(resources.tapestryInvitations, tapestryInvitations),
  bindEndpoints(resources.tapestryAccess, tapestryAccess),
  bindEndpoints(resources.tapestryInteractions, tapestryInteractions),
  bindEndpoints(resources.assetURLs, assetURLs),
  bindEndpoints(resources.proxy, proxy),
  bindEndpoints(resources.tapestryCreateJob, tapestryCreateJobs),
  bindEndpoints(resources.aiChats, aiChats),
  bindEndpoints(resources.aiChatMessages, aiChatMessages),
  bindEndpoints(resources.groups, groups),
  bindEndpoints(resources.groupBatchMutations, groupBatchMutations),
  bindEndpoints(resources.presentationSteps, presentationSteps),
  bindEndpoints(resources.presentationStepBatchMutations, presentationStepBatchMutations),
  bindEndpoints(resources.userSecrets, userSecrets),
  bindEndpoints(resources.tapestryBookmarks, tapestryBookmarks),
  Router().head('/healthcheck', (_reques, response) => response.sendStatus(200)),
)
app.use(express.static(path.join(import.meta.dirname, 'assets')))

const httpServer = http.createServer(app)
void socketServer.init(httpServer)

app.use(errorHandler)

initBullBoard(app)

const { port, env } = config.server
if (env !== 'test') {
  httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`)
  })
}

void scheduleS3Cleaner()
