import {
  ClientToServerEvents,
  OnSubscribe,
  ServerToClientEvents,
  SubscriptionEvent,
} from 'tapestry-shared/src/data-transfer/socket/types.js'
import { Socket as SocketIOSocket } from 'socket.io'
import { Connection } from './index.js'
import { PrependFunctionParameters } from 'tapestry-core/src/type-utils.js'

export type Socket = SocketIOSocket<
  ClientToServerEvents,
  ServerToClientEvents,
  never,
  { userId: string }
>

const _subscriptions = {
  'tapestry-updated': { lastUpdate: new Date(), tapestryId: '' as string },
  'rtc-signaling-message': { tapestryId: '' as string, peerId: '' as string },
} as const satisfies Record<SubscriptionEvent, unknown>
type SubscriptionsMap = typeof _subscriptions

type TransformSubscriptionsMap<T extends Record<SubscriptionEvent, unknown>> = {
  [K in keyof T]: { name: K; params: T[K] }
}[keyof T]

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> }

export type Subscription = DeepWriteable<TransformSubscriptionsMap<SubscriptionsMap>>

type PrependMapWithParameters<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, (...args: any) => any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Params extends [...args: any],
> = {
  [K in keyof T]: PrependFunctionParameters<T[K], Params>
}

export type OnSubscribeFn = PrependMapWithParameters<OnSubscribe, [Connection]>
