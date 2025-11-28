import { z } from 'zod/v4'

const BaseRTCSignalingMessageSchema = z.object({
  senderId: z.string(),
})

export const RTCSignalingMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('request'),
    ...BaseRTCSignalingMessageSchema.shape,
  }),
  z.object({
    type: z.literal('negotiation'),
    ...BaseRTCSignalingMessageSchema.shape,
    receiverId: z.string(),
    sessionDescription: z.object({
      sdp: z.string(),
      type: z.enum(['offer', 'answer', 'pranswer', 'rollback']).nullable(),
    }),
  }),
  z.object({
    type: z.literal('ice-candidate'),
    ...BaseRTCSignalingMessageSchema.shape,
    receiverId: z.string(),
    iceCandidate: z.object({
      candidate: z.string().optional(),
      sdpMLineIndex: z.number().nullish(),
      sdpMid: z.string().nullish(),
      usernameFragment: z.string().nullish(),
    }),
  }),
  z.object({
    type: z.literal('disconnect'),
    ...BaseRTCSignalingMessageSchema.shape,
  }),
])

export type RTCSignalingMessage = z.infer<typeof RTCSignalingMessageSchema>
