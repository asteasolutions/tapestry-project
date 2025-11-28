import { RTCSignalingMessage } from 'tapestry-shared/src/data-transfer/rtc-signaling/types'
import { IdMap, idMapToArray } from 'tapestry-core/src/utils'
import { config } from '../../../config'
import {
  TypedEventTarget,
  EventTypes,
  TypedEvent,
} from 'tapestry-core-client/src/lib/events/typed-events'
import { createEventRegistry } from 'tapestry-core-client/src/lib/events/event-registry'
import { keys } from 'lodash'

type SignallerConnectedEvent = TypedEvent<
  'signaller-connected',
  {
    assignedPeerId: string
  }
>
type SignallerMessageEvent = TypedEvent<'signaling-message', RTCSignalingMessage>
type SignallerDisconnectedEvent = TypedEvent<'signaller-disconnected', null>

export type RTCSignallerEvent =
  | SignallerConnectedEvent
  | SignallerMessageEvent
  | SignallerDisconnectedEvent

export interface RTCSignaller extends TypedEventTarget<RTCSignallerEvent> {
  sendSignallerMessage: (message: RTCSignalingMessage) => void
  activateSignaller: () => void
}

type EventTypesMap = {
  signaller: EventTypes<RTCSignaller>
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<EventTypesMap>()

export type DataChannelOpened = TypedEvent<
  'data-channel-opened',
  {
    peerId: string
  }
>
export type RTCMessageEvent<T> = TypedEvent<
  'rtc-message',
  {
    peerId: string
    data: T
  }
>
export type DataChannelClosed = TypedEvent<
  'data-channel-closed',
  {
    peerId: string
  }
>

type RTCManagerEvent<T> = DataChannelOpened | RTCMessageEvent<T> | DataChannelClosed

export class RTCManager<T> extends TypedEventTarget<RTCManagerEvent<T>> {
  private peers: IdMap<{ connection: RTCPeerConnection; channel?: RTCDataChannel }> = {}
  private peerId?: string

  constructor(private signaller: RTCSignaller) {
    super()

    attachListeners(this, 'signaller', this.signaller)
    this.signaller.activateSignaller()
  }

  @eventListener('signaller', 'signaller-connected')
  protected onSignallerConnceted(event: SignallerConnectedEvent) {
    this.peerId = event.detail.assignedPeerId
  }

  //  A request message a remote peer for initiating an RTC negotiation is recieved.
  //  Then starts the exchange of RTC negotiation protocol messages. First the current peer creates an offer
  //  and sends it to the remote peer. The remote peer receives the "negotiation" message and sends an answer to
  //  the current peer. The current peer recieves the second "negotiation" message and accepts the answer.
  //  Then the connection gets established after/if the ice candidates have been exchanged.
  @eventListener('signaller', 'signaling-message')
  protected async onSignallerMessage(event: SignallerMessageEvent) {
    const message = event.detail
    if (!this.peerId) {
      throw new Error('RTC client peerId missing')
    }
    if (message.type === 'request') {
      const connection = this.getOrCreatePeerConnection(message.senderId)
      this.initDataChannel(connection.createDataChannel('sendChannel'), message.senderId)
      await connection.setLocalDescription(await connection.createOffer())

      this.signaller.sendSignallerMessage({
        type: 'negotiation',
        senderId: this.peerId,
        receiverId: message.senderId,
        sessionDescription: connection.localDescription!,
      })
    } else if (message.type === 'negotiation') {
      const sessionDescription = message.sessionDescription
      if (sessionDescription.type === 'offer') {
        const connection = this.getOrCreatePeerConnection(message.senderId)
        connection.addEventListener('datachannel', (e) =>
          this.initDataChannel(e.channel, message.senderId),
        )

        await connection.setRemoteDescription({ ...sessionDescription, type: 'offer' })
        await connection.setLocalDescription(await connection.createAnswer())

        this.signaller.sendSignallerMessage({
          type: 'negotiation',
          senderId: this.peerId,
          receiverId: message.senderId,
          sessionDescription: connection.localDescription!,
        })
      } else if (sessionDescription.type === 'answer') {
        const connection = this.peers[message.senderId]?.connection
        if (!connection) {
          return
        }
        await connection.setRemoteDescription({ ...sessionDescription, type: 'answer' })
      }
    } else if (message.type === 'ice-candidate') {
      const connection = this.getOrCreatePeerConnection(message.senderId)
      await connection.addIceCandidate(message.iceCandidate)
    } else {
      this.disconnectPeer(message.senderId)
    }
  }

  private disconnectPeer(remotePeerId: string) {
    this.peers[remotePeerId]?.channel?.close()
    this.peers[remotePeerId]?.connection.close()
    delete this.peers[remotePeerId]
  }

  private getOrCreatePeerConnection(remotePeerId: string) {
    if (this.peers[remotePeerId]) {
      return this.peers[remotePeerId].connection
    }
    const connection = new RTCPeerConnection({
      iceServers: [
        {
          urls: config.stunServer,
        },
      ],
    })

    connection.addEventListener('icecandidate', (e) => {
      if (e.candidate && this.peerId) {
        this.signaller.sendSignallerMessage({
          type: 'ice-candidate',
          senderId: this.peerId,
          receiverId: remotePeerId,
          iceCandidate: e.candidate,
        })
      }
    })

    this.peers[remotePeerId] = { connection }
    return connection
  }

  sendMessage(remotePeerId: string, message: T) {
    this.peers[remotePeerId]?.channel?.send(JSON.stringify(message))
  }

  broadcastMessage(message: T) {
    const serialized = JSON.stringify(message)
    idMapToArray(this.peers).forEach((peer) => peer.channel?.send(serialized))
  }

  private initDataChannel(channel: RTCDataChannel, remotePeerId: string) {
    const remotePeer = this.peers[remotePeerId]
    if (!remotePeer) {
      return
    }
    channel.addEventListener('open', () => {
      remotePeer.channel = channel
      this.dispatchEvent('data-channel-opened', {
        peerId: remotePeerId,
      })
    })
    channel.addEventListener('message', (e) => {
      this.dispatchEvent('rtc-message', {
        peerId: remotePeerId,
        data: JSON.parse(e.data as string) as T,
      })
    })
    channel.addEventListener('close', () => {
      remotePeer.channel = undefined
      this.dispatchEvent('data-channel-closed', {
        peerId: remotePeerId,
      })
    })
  }

  @eventListener('signaller', 'signaller-disconnected')
  protected onSignallerDisconnected() {
    this.removeConnections()
  }

  private removeConnections() {
    keys(this.peers).forEach((remotePeerId) => this.disconnectPeer(remotePeerId))
  }

  disconnect() {
    this.removeConnections()
    if (this.peerId) {
      this.signaller.sendSignallerMessage({
        type: 'disconnect',
        senderId: this.peerId,
      })
    }
  }

  dispose() {
    this.disconnect()
    detachListeners(this, 'signaller', this.signaller)
  }
}
