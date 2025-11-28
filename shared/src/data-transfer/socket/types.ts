import z from 'zod/v4'
import { TapestrySchema } from '../resources/schemas/tapestry.js'
import { batchMutation } from '../resources/schemas/common.js'
import { ItemSchema } from '../resources/schemas/item.js'
import { RelSchema } from '../resources/schemas/rel.js'
import { GroupSchema } from '../resources/schemas/group.js'
import { PresentationStepSchema } from '../resources/schemas/presentation-step.js'
import { RTCSignalingMessage } from '../rtc-signaling/types.js'

export const SOCKET_PATH = '/subscribe'

export const SubscriptionEventSchema = z.enum(['tapestry-updated', 'rtc-signaling-message'])
export type SubscriptionEvent = z.infer<typeof SubscriptionEventSchema>

export const SOCKET_ID_HEADER = 'SocketID'

export const TapestryUpdatedSchema = z.object({
  tapestry: TapestrySchema.nullish(),
  items: batchMutation(ItemSchema).nullish(),
  rels: batchMutation(RelSchema).nullish(),
  groups: batchMutation(GroupSchema).nullish(),
  presentationSteps: batchMutation(PresentationStepSchema).nullish(),
})

export type TapestryUpdate = z.infer<typeof TapestryUpdatedSchema>

interface ServerEventDescriptor {
  params: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ack: (...args: any) => void
}

// This constant is only used to ensure type-safety
const _serverToClient = {
  'tapestry-updated': { params: '' as string, ack: (_payload: TapestryUpdate): void => undefined },
  'rtc-signaling-message': {
    params: '' as string,
    ack: (_payload: RTCSignalingMessage): void => undefined,
  },
} as const satisfies Record<SubscriptionEvent, ServerEventDescriptor>
export type SubscriptionEventDescriptors = typeof _serverToClient

type Subscribers<T extends Record<string, ServerEventDescriptor>> = {
  [K in keyof T]: (payload: Parameters<T[K]['ack']>[0]) => void
}
export type ServerToClientEvents = Subscribers<SubscriptionEventDescriptors>

type SubscribeEmitters<T extends Record<string, ServerEventDescriptor>> = {
  [K in keyof T]: (event: K, params: T[K]['params'], callback: T[K]['ack']) => void
}[keyof T]
type ClientSubscriptions = { subscribe: SubscribeEmitters<SubscriptionEventDescriptors> }

type OnSubscribeHelper<T extends Record<string, ServerEventDescriptor>> = {
  [K in keyof T]: (params: T[K]['params'], callback: T[K]['ack']) => void
}

export type OnSubscribe = OnSubscribeHelper<SubscriptionEventDescriptors>

export type ClientToServerEvents = ClientSubscriptions & {
  'rtc-signaling-message': (message: RTCSignalingMessage & { tapestryId: string }) => void
}
