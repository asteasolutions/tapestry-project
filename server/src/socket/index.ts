import { Server } from 'socket.io'
import http from 'http'
import { verifySessionJWT } from '../auth/tokens.js'
import { InvalidAccessTokenError, InvalidCredentialsError } from '../errors/index.js'
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SOCKET_ID_HEADER,
  SOCKET_PATH,
  SubscriptionEvent,
  TapestryUpdate,
} from 'tapestry-shared/src/data-transfer/socket/types.js'
import {
  DBNotification,
  DBNotificationSchema,
  TapestryElementsRemovedNotification,
  TapestryUpdatedNotification,
} from './notifications.js'
import createSubscriber, { Subscriber } from 'pg-listen'
import { config } from '../config.js'
import { canEditTapestry } from '../resources/tapestries.js'
import { prisma } from '../db.js'
import { serialize } from '../transformers/index.js'
import { OnSubscribeFn, Socket, Subscription } from './types.js'
import { omit, partition } from 'lodash-es'
import { Request } from 'express'
import {
  RTCSignalingMessage,
  RTCSignalingMessageSchema,
} from 'tapestry-shared/src/data-transfer/rtc-signaling/types.js'

const DEFAULT_CHANNEL = 'default'

async function initSubscriber() {
  const subscriber = createSubscriber({
    connectionString: config.db.connectionString,
    ssl: config.db.useSsl ? { rejectUnauthorized: false } : false,
  })
  await subscriber.connect()
  await subscriber.listenTo(DEFAULT_CHANNEL)

  subscriber.events.on('error', (e) => {
    console.error('Subscription error', e)
  })

  return subscriber
}

export class Connection {
  constructor(
    public socket: Socket,
    public subscriptions: Subscription[] = [],
  ) {}
  get id() {
    return this.socket.id
  }

  get userId() {
    return this.socket.data.userId
  }
}

class SocketServer {
  private connections: Connection[] = []

  private dbSubscriber?: Subscriber

  async init(server: http.Server) {
    const io = new Server<ClientToServerEvents, ServerToClientEvents, never, { userId: string }>(
      server,
      { path: SOCKET_PATH, cors: { origin: config.server.viewerUrl } },
    )

    io.use((socket, next) => {
      const { token } = socket.handshake.auth
      if (typeof token !== 'string') {
        return next(new InvalidAccessTokenError())
      }
      try {
        const { userId } = verifySessionJWT(token)
        socket.data.userId = userId
        next()
      } catch (error) {
        next(error as InvalidCredentialsError)
      }
    })

    io.on('connection', (socket) => {
      const connection = new Connection(socket)
      this.connections.push(connection)

      socket.on('subscribe', (e: SubscriptionEvent, params: unknown, callback: unknown) => {
        // @ts-expect-error Hard to convince TS here
        this.onSubscribe[e](connection, params, callback)
      })

      socket.on('rtc-signaling-message', (e) =>
        this.notifyPeers(RTCSignalingMessageSchema.parse(e), e.tapestryId, socket.id),
      )

      socket.on('disconnect', () => {
        this.connections
          .find((c) => c.id === socket.id)
          ?.subscriptions.forEach((s) => {
            if (s.name === 'rtc-signaling-message') {
              this.notifyPeers(
                {
                  type: 'disconnect',
                  senderId: s.params.peerId,
                },
                s.params.tapestryId,
                socket.id,
              )
            }
          })
        this.connections = this.connections.filter((c) => c.id !== socket.id)
      })
    })

    this.dbSubscriber = await initSubscriber()
    this.dbSubscriber.notifications.on(DEFAULT_CHANNEL, async (payload) => {
      const notification = DBNotificationSchema.parse(payload)
      for (const c of this.connections) {
        if (c.id === notification.socketId) {
          continue
        }

        for (const s of c.subscriptions) {
          switch (notification.name) {
            case 'tapestry-elements-removed':
              if (
                s.name === 'tapestry-updated' &&
                s.params.tapestryId === notification.tapestryId
              ) {
                c.socket.emit('tapestry-updated', {
                  [notification.modelType]: {
                    destroyed: notification.ids,
                    created: [],
                    updated: [],
                  },
                })
                s.params.lastUpdate = new Date()
              }
              break
            case 'tapestry-updated':
              if (
                s.name === 'tapestry-updated' &&
                s.params.tapestryId === notification.tapestryId
              ) {
                const tapestry = await this.getTapestryAsOf(
                  notification.tapestryId,
                  s.params.lastUpdate as Date,
                  notification.deletedIds,
                )
                c.socket.emit('tapestry-updated', tapestry)
                s.params.lastUpdate = new Date()
              }
              break
            case 'rtc-signaling-message':
              if (
                s.name === 'rtc-signaling-message' &&
                s.params.tapestryId === notification.tapestryId
              ) {
                const message = notification.message
                // Request and disconnect messages are broadcast to all
                // rtc message subscribes for the same tapestry.
                // Negotiation and ice candidate messages are sent to a specific peer.
                if (
                  message.type === 'request' ||
                  message.type === 'disconnect' ||
                  message.receiverId === s.params.peerId
                ) {
                  c.socket.emit('rtc-signaling-message', message)
                }
              }
              break
          }
        }
      }
    })
  }

  async destroy() {
    await this.dbSubscriber?.close()
    this.dbSubscriber = undefined
  }

  private onSubscribe: OnSubscribeFn = {
    'tapestry-updated': async (connection, tapestryId, acknowledge) => {
      if (!(await canEditTapestry(connection.userId, tapestryId))) {
        return
      }
      connection.subscriptions.push({
        name: 'tapestry-updated',
        params: { lastUpdate: new Date(), tapestryId },
      })

      const tapestry = await this.getTapestryAsOf(tapestryId)
      acknowledge(tapestry)
    },
    'rtc-signaling-message': async (connection, tapestryId, acknowledge) => {
      if (!(await canEditTapestry(connection.userId, tapestryId))) {
        return
      }
      const peerId = crypto.randomUUID()
      connection.subscriptions.push({
        name: 'rtc-signaling-message',
        params: { tapestryId, peerId },
      })
      const request = {
        type: 'request',
        senderId: peerId,
      } as const
      acknowledge(request)
      this.notifyPeers(request, tapestryId, connection.id)
    },
  }

  private async getTapestryAsOf(
    id: string,
    asOf?: Date,
    deletedIds?: TapestryUpdatedNotification['deletedIds'],
  ): Promise<TapestryUpdate> {
    const where = { where: { updatedAt: { gte: asOf } } }
    const dbTapestry = await prisma.tapestry.findUniqueOrThrow({
      where: { id },
      include: { items: where, rels: where, groups: where },
    })
    const tapestry = await serialize('Tapestry', dbTapestry)

    const [createdItems, updatedItems] = partition(
      tapestry.items,
      (i) => i.createdAt.getTime() === i.updatedAt.getTime(),
    )
    const [createdRels, updatedRels] = partition(
      tapestry.rels,
      (r) => r.createdAt.getTime() === r.updatedAt.getTime(),
    )
    const [createdGroups, updatedGroups] = partition(
      tapestry.groups,
      (g) => g.createdAt.getTime() === g.updatedAt.getTime(),
    )

    const presentationSteps = await prisma.presentationStep.findMany({
      where: {
        AND: [where.where, { OR: [{ item: { tapestryId: id } }, { group: { tapestryId: id } }] }],
      },
    })

    const [createdDbPresentationSteps, updatedDbPresentationSteps] = partition(
      presentationSteps,
      (p) => p.createdAt.getTime() === p.updatedAt.getTime(),
    )

    return {
      tapestry:
        asOf && tapestry.updatedAt < asOf ? undefined : omit(tapestry, 'items', 'rels', 'groups'),
      items: { created: createdItems, updated: updatedItems, destroyed: deletedIds?.items ?? [] },
      rels: { created: createdRels, updated: updatedRels, destroyed: deletedIds?.rels ?? [] },
      groups: {
        created: createdGroups,
        updated: updatedGroups,
        destroyed: deletedIds?.groups ?? [],
      },
      presentationSteps: {
        created: await serialize('PresentationStep', createdDbPresentationSteps),
        updated: await serialize('PresentationStep', updatedDbPresentationSteps),
        destroyed: deletedIds?.presentationSteps ?? [],
      },
    }
  }

  notifyTapestryUpdate(tapestryId: string, socketId: string | undefined): void
  notifyTapestryUpdate(
    data: Pick<TapestryUpdatedNotification, 'deletedIds' | 'tapestryId'>,
    socketId: string | undefined,
  ): void
  notifyTapestryUpdate(
    dataOrTapestryId: Pick<TapestryUpdatedNotification, 'deletedIds' | 'tapestryId'> | string,
    socketId: string | undefined,
  ) {
    void this.notify({
      socketId,
      name: 'tapestry-updated',
      ...(typeof dataOrTapestryId === 'string'
        ? { tapestryId: dataOrTapestryId }
        : dataOrTapestryId),
    })
  }

  notifyTapestryElementsRemoved(
    data: Pick<TapestryElementsRemovedNotification, 'ids' | 'modelType' | 'tapestryId'>,
    socketId: string | undefined,
  ) {
    void this.notify({ ...data, name: 'tapestry-elements-removed', socketId })
  }

  private notifyPeers(message: RTCSignalingMessage, tapestryId: string, socketId: string) {
    void this.notify({ message, name: 'rtc-signaling-message', tapestryId, socketId })
  }

  private async notify(notification: DBNotification) {
    try {
      await this.dbSubscriber?.notify(DEFAULT_CHANNEL, notification)
    } catch (error) {
      console.warn('Error while notifying', error)
      // This is intentionally swallowed, since we don't want to crash the server
      // in case of some intermitent loss of connectivity for example
    }
  }
}

export const socketServer = new SocketServer()

export function socketIdFromRequest(request: Request) {
  return request.get(SOCKET_ID_HEADER)
}
