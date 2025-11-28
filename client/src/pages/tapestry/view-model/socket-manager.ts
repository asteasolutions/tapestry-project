import {
  ServerToClientEvents,
  ClientToServerEvents,
  SOCKET_PATH,
  TapestryUpdate,
  TapestryUpdatedSchema,
} from 'tapestry-shared/src/data-transfer/socket/types'
import { io, Socket } from 'socket.io-client'
import { auth } from '../../../auth'
import { config } from '../../../config'
import { RTCSignallerEvent } from './rtc-manager'
import {
  RTCSignalingMessage,
  RTCSignalingMessageSchema,
} from 'tapestry-shared/src/data-transfer/rtc-signaling/types'
import { TypedEvent, TypedEventTarget } from 'tapestry-core-client/src/lib/events/typed-events'

export type TapestryUpdated = TypedEvent<'tapestry-updated', TapestryUpdate>

export class SocketManager extends TypedEventTarget<TapestryUpdated | RTCSignallerEvent> {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    new URL(config.apiUrl).origin,
    { path: SOCKET_PATH, autoConnect: false, auth: (cb) => cb({ token: auth.token }) },
  )
  private isSignallerActivated = false

  constructor(private tapestryId: string) {
    super()
    this.socket.on('connect', () => {
      this.socket.emit(
        'subscribe',
        'tapestry-updated',
        this.tapestryId,
        (tapestry: TapestryUpdate) => {
          this.applyRemoteUpdate(tapestry)
          this.socket.on('tapestry-updated', (update) => this.applyRemoteUpdate(update))
        },
      )
      if (this.isSignallerActivated) {
        this.subscribeToSignalingService()
      }
    })
  }

  private subscribeToSignalingService() {
    this.socket.emit(
      'subscribe',
      'rtc-signaling-message',
      this.tapestryId,
      (request: RTCSignalingMessage) => {
        this.isSignallerActivated = true
        this.dispatchEvent('signaller-connected', { assignedPeerId: request.senderId })
        this.socket.on('rtc-signaling-message', (message) => this.onSignallerMessage(message))
      },
    )
  }

  connect() {
    this.socket.connect()
  }

  disconnect() {
    this.dispatchEvent('signaller-disconnected', null)
    this.socket.disconnect()
    this.socket.off('rtc-signaling-message')
    this.socket.off('tapestry-updated')
  }

  dispose() {
    this.socket.disconnect()
  }
  get connected() {
    return this.socket.connected
  }

  get id() {
    return this.socket.id
  }

  activateSignaller() {
    if (!this.isSignallerActivated) {
      this.subscribeToSignalingService()
    }
  }

  sendSignallerMessage(message: RTCSignalingMessage) {
    this.socket.emit('rtc-signaling-message', { ...message, tapestryId: this.tapestryId })
  }

  private onSignallerMessage = (update: RTCSignalingMessage) => {
    this.dispatchEvent('signaling-message', RTCSignalingMessageSchema.parse(update))
  }

  private applyRemoteUpdate = (update: TapestryUpdate) => {
    this.dispatchEvent('tapestry-updated', TapestryUpdatedSchema.parse(update))
  }
}
