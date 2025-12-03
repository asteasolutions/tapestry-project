import { compact } from 'lodash'
import { IdMap, idMapToArray, isMediaItem } from 'tapestry-core/src/utils'
import { MediaItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { Store, StoreMutationCommand } from 'tapestry-core-client/src/lib/store/index'
import {
  EditableTapestryViewModel,
  InteractionMode,
  TapestryEditorStore,
  TapestryWithOwner,
} from '.'
import {
  assignCommentThreads,
  EDITABLE_TAPESTRY_PROPS,
  fromTapestryDto,
  UserAccess,
} from '../../../model/data/utils'
import { EventTypes } from 'tapestry-core-client/src/lib/events/typed-events'
import { createEventRegistry } from 'tapestry-core-client/src/lib/events/event-registry'
import { ChangeEvent } from 'tapestry-core-client/src/lib/events/observable'
import { Patch, produce } from 'immer'
import { PeriodicAction } from '../../../lib/periodic-action'
import { itemUpload } from '../../../services/item-upload'
import { CommentThreadsDto } from 'tapestry-shared/src/data-transfer/resources/dtos/comment-threads'
import { TapestryResourceName, TapestryResourcesRepo } from './tapestry-resources-repo'
import { CommentThreadsRepo } from './comment-threads-repo'
import { TapestryUndoStack } from './undo-stack/tapestry-undo-stack'
import { PresentationOrderUndoStack } from './undo-stack/presentation-order-undo-stack'
import { deleteItems, insertItems, updateItem } from './store-commands/items'
import { addRels, deleteRels, updateRel } from './store-commands/rels'
import { createGroup, deleteGroups, updateGroup } from './store-commands/groups'
import {
  addCollaborator,
  removeCollaborator,
  setSnackbar,
  updateCollaboratorCursor,
  updateTapestry,
} from './store-commands/tapestry'
import {
  createPresentationStep,
  deletePresentationSteps,
  updatePresentationStep,
} from './store-commands/presentation-steps'
import { SocketManager } from './socket-manager'
import {
  DataChannelClosed,
  DataChannelOpened,
  RTCManager,
  RTCMessageEvent,
  RTCSignaller,
} from './rtc-manager'
import { auth } from '../../../auth'
import { ItemSchema } from 'tapestry-shared/src/data-transfer/resources/schemas/item'
import { RelSchema } from 'tapestry-shared/src/data-transfer/resources/schemas/rel'
import { GroupSchema } from 'tapestry-shared/src/data-transfer/resources/schemas/group'
import { TapestrySchema } from 'tapestry-shared/src/data-transfer/resources/schemas/tapestry'
import { PresentationStepSchema } from 'tapestry-shared/src/data-transfer/resources/schemas/presentation-step'
import { Point } from 'tapestry-core/src/data-format/schemas/common'
import { userToPublicProfileDto } from 'tapestry-shared/src/utils'
import { PublicUserProfileDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { APIError } from '../../../errors'

type TapestryRTCMessage =
  | {
      type: 'user-data'
      user: PublicUserProfileDto
    }
  | {
      type: 'cursor-position'
      position: Point
    }

type EventTypesMap = {
  tapestryRepo: EventTypes<TapestryResourcesRepo>
  commentThreadsRepo: EventTypes<CommentThreadsRepo>
  rtcManager: EventTypes<RTCManager<TapestryRTCMessage>>
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<EventTypesMap>()

export class TapestryDataSync {
  private tapestryRepo: TapestryResourcesRepo
  private commentThreadsRepo: CommentThreadsRepo
  private _store?: TapestryEditorStore
  private commentThreadPolling = new PeriodicAction(
    (signal) => this.commentThreadsRepo.pull(null, signal),
    {
      period: 10_000,
      pauseTimerWhileExecuting: true,
    },
  )
  private socketManager: SocketManager
  private rtcManager: RTCManager<TapestryRTCMessage>

  constructor(
    private tapestryId: string,
    private initialMode: InteractionMode,
    private userAccess: UserAccess,
  ) {
    this.socketManager = new SocketManager(tapestryId)
    // The conversion is made because TS forbids more generic add/remove event listener functions
    // to be assigned as properties of TypedEventTarget<SignallerEvent>.
    this.rtcManager = new RTCManager(this.socketManager as RTCSignaller)
    this.tapestryRepo = new TapestryResourcesRepo(tapestryId, this.socketManager, {
      onRequestPush: () => {
        this._store?.dispatch((model) => {
          ++model.pendingRequests
        })
      },
      onAfterPush: (error?: unknown) => {
        this._store?.dispatch(
          (model) => {
            --model.pendingRequests
          },
          !!error &&
            setSnackbar({
              variant: 'error',
              text:
                error instanceof APIError && error.data.name !== 'ServerError'
                  ? error.message
                  : 'Error during save',
            }),
        )
      },
    })
    this.commentThreadsRepo = new CommentThreadsRepo(tapestryId)
  }

  async init(signal?: AbortSignal) {
    // Initialize all repos and wait for them to pull their data from the server
    await Promise.all([this.tapestryRepo.init(signal), this.commentThreadsRepo.init(signal)])

    // Combine all repo data in a single TapestryDto
    const tapestry = produce(this.tapestryRepo.value.tapestries[this.tapestryId]!, (t) => {
      t.items = idMapToArray(this.tapestryRepo.value.items)
      t.rels = idMapToArray(this.tapestryRepo.value.rels)
      t.groups = idMapToArray(this.tapestryRepo.value.groups)
    })
    const commentThreads = this.commentThreadsRepo.value.commentThreads[this.tapestryId]!

    // Create a view model from the DTO and initialize the store
    const tapestryViewModel = fromTapestryDto(
      tapestry as TapestryWithOwner<TapestryDto>,
      this.initialMode,
      this.userAccess,
      commentThreads,
      idMapToArray(this.tapestryRepo.value.presentationSteps),
    )
    this._store = new Store(tapestryViewModel, [
      {
        UndoStackClass: TapestryUndoStack,
        isActive: (model) => model.interactionMode === 'edit' && !model.presentationOrderState,
      },
      {
        UndoStackClass: PresentationOrderUndoStack,
        isActive: (model) => model.interactionMode === 'edit' && !!model.presentationOrderState,
      },
    ])

    attachListeners(this, 'rtcManager', this.rtcManager)

    // Attach observers that will synchronize the store with the repos in both directions
    this.attachRepoListeners()
    this.attachStoreSubscriber()

    this.commentThreadPolling.start()
  }

  dispose() {
    this.commentThreadPolling.stop()

    detachListeners(this, 'rtcManager', this.rtcManager)
    this.detachRepoListeners()
    this.detachStoreSubscriber()
    this.tapestryRepo.dispose()
    this.socketManager.dispose()
    this.rtcManager.dispose()
  }

  get store() {
    return this._store!
  }

  reloadCommentThreads = () => this.commentThreadPolling.force(true)

  broadcastCursorPosition = (position: Point) =>
    this.rtcManager.broadcastMessage({ type: 'cursor-position', position })

  private attachRepoListeners() {
    attachListeners(this, 'tapestryRepo', this.tapestryRepo)
    attachListeners(this, 'commentThreadsRepo', this.commentThreadsRepo)
  }

  private detachRepoListeners() {
    detachListeners(this, 'tapestryRepo', this.tapestryRepo)
    detachListeners(this, 'commentThreadsRepo', this.commentThreadsRepo)
  }

  private attachStoreSubscriber() {
    this._store?.subscribe(this.onStoreChange)
  }

  private detachStoreSubscriber() {
    this._store?.unsubscribe(this.onStoreChange)
  }

  @eventListener('rtcManager', 'data-channel-opened')
  protected onDataChannelOpened(event: DataChannelOpened) {
    const user = auth.value.user
    if (user) {
      this.rtcManager.sendMessage(event.detail.peerId, {
        type: 'user-data',
        user: userToPublicProfileDto(user),
      })
    }
  }

  @eventListener('rtcManager', 'rtc-message')
  protected onRTCMessage(event: RTCMessageEvent<TapestryRTCMessage>) {
    const message = event.detail
    if (message.data.type === 'user-data') {
      this.store.dispatch(addCollaborator(message.peerId, message.data.user))
    } else {
      this.store.dispatch(updateCollaboratorCursor(message.peerId, message.data.position))
    }
  }

  @eventListener('rtcManager', 'data-channel-closed')
  protected onDataChannelClosed(event: DataChannelClosed) {
    this.store.dispatch(removeCollaborator(event.detail.peerId))
  }

  @eventListener('tapestryRepo', 'change')
  protected onTapestryRepoChange({ detail: { patches } }: ChangeEvent<unknown>) {
    this.detachStoreSubscriber()
    const storeCommands = this.convertRepoPatchesToStoreCommands(patches)
    this.store.dispatch(...storeCommands, { source: 'server' })
    this.attachStoreSubscriber()
  }

  @eventListener('commentThreadsRepo', 'change')
  protected onCommentThreadsRepoChange({
    detail: { value },
  }: ChangeEvent<{ commentThreads: IdMap<CommentThreadsDto> }>) {
    this.detachStoreSubscriber()
    this._store?.dispatch(
      (model) => {
        assignCommentThreads(model, value.commentThreads[this.tapestryId]!)
      },
      { source: 'server' },
    )
    this.attachStoreSubscriber()
  }

  private onStoreChange = (tapestry: EditableTapestryViewModel, patches: Patch[]) => {
    this.listenToRemoteEvents(tapestry.interactionMode === 'edit')
    // Handle the special case where the whole view model has been replaced
    // This can happen if someone invokes, for example, storeMutator.update(() => newValue)
    if (patches.length === 1 && patches[0].path.length === 0 && patches[0].op === 'replace') {
      this.tapestryRepo.commitPatches(this.createTapestryRepoPatches(tapestry))
    } else {
      const repoPatches = this.convertStorePatchesToRepo(patches)
      this.tapestryRepo.commitPatches(repoPatches)
      void this.handleNewMediaItems(repoPatches)
    }
  }

  private listenToRemoteEvents(listen: boolean) {
    const { connected } = this.socketManager
    if (listen && !connected) {
      this.socketManager.connect()
    } else if (!listen && connected) {
      this.socketManager.disconnect()
    }
  }

  private createTapestryRepoPatches(tapestry: EditableTapestryViewModel) {
    return [
      ...EDITABLE_TAPESTRY_PROPS.map(
        (prop): Patch => ({
          op: 'replace',
          path: ['tapestries', this.tapestryId, prop],
          value: tapestry[prop],
        }),
      ),
      ...Object.values(tapestry.items).map(
        (item): Patch => ({
          op: 'replace',
          path: ['items', item!.dto.id],
          value: item!.dto,
        }),
      ),
      ...Object.values(tapestry.rels).map(
        (rel): Patch => ({
          op: 'replace',
          path: ['rels', rel!.dto.id],
          value: rel!.dto,
        }),
      ),
      ...Object.values(tapestry.groups).map(
        (group): Patch => ({
          op: 'replace',
          path: ['groups', group!.dto.id],
          value: group!.dto,
        }),
      ),
      ...Object.values(tapestry.presentationSteps).map(
        (step): Patch => ({
          op: 'replace',
          path: ['presentationSteps', step!.dto.id],
          value: step!.dto,
        }),
      ),
    ]
  }

  private async handleNewMediaItems(repoPatches: Patch[]) {
    const items = repoPatches.reduce<MediaItemDto[]>((acc, { op, path, value }) => {
      if (op === 'add' && path[0] === 'items' && path.length === 2 && isNewMediaItem(value)) {
        acc.push(value)
      }
      return acc
    }, [])

    if (items.length === 0) return

    const patches = (
      await Promise.allSettled(items.map((item) => itemUpload.upload(item.source, this.tapestryId)))
    ).map<Patch>((result, index) =>
      result.status === 'fulfilled'
        ? {
            op: 'replace',
            path: ['items', items[index].id, 'source'],
            value: result.value,
          }
        : {
            op: 'remove',
            path: ['items', items[index].id],
          },
    )
    this.tapestryRepo.commitPatches(patches)
  }

  private convertStorePatchesToRepo(patches: Patch[]) {
    return compact(
      patches.map((patch): Patch | null => {
        if ((EDITABLE_TAPESTRY_PROPS as (string | number)[]).includes(patch.path[0])) {
          return { ...patch, path: ['tapestries', this.tapestryId, ...patch.path] }
        }

        if (!['items', 'rels', 'presentationSteps', 'groups'].includes(patch.path[0] as string))
          return null

        // Item patches in the store have paths ["items", <itemId>, "dto", ...<dtoPath>]. Rel patches
        // have the same path structure, but with "rels" instead of "items" at position 0.
        const [resourceName, id, ...rest] = patch.path

        if (rest.length === 0) {
          // This is a direct patch on a whole item, e.g. "add" /items/<itemId>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          return { op: patch.op, path: [resourceName, id], value: patch.value?.dto }
        }

        if (rest[0] === 'dto') {
          // This is a patch which changes the internal structure of the item or rel.
          // We are only interested in it if it modifies the DTO.
          return { ...patch, path: [resourceName, id, ...rest.slice(1)] }
        }

        return null
      }),
    )
  }

  private convertRepoPatchesToStoreCommands(patches: Patch[]) {
    return patches.flatMap((patch) => {
      const [resourceName, resourceId] = patch.path as [TapestryResourceName, ...string[]]
      return patchCommands[resourceName][patch.op](resourceId, patch.value)
    })
  }
}

type PatchCommand = Record<
  Patch['op'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (id: string, value?: any) => StoreMutationCommand<EditableTapestryViewModel>
>

const patchCommands: Record<TapestryResourceName, PatchCommand> = {
  items: {
    add: (_id, value) => insertItems({ dto: ItemSchema.parse(value) }),
    remove: (id) => deleteItems(id),
    replace: (id, value) => updateItem(id, { dto: ItemSchema.parse(value) }),
  },
  rels: {
    add: (_id, value) => addRels({ dto: RelSchema.parse(value) }),
    remove: (id) => deleteRels(id),
    replace: (id, value) => updateRel(id, { dto: RelSchema.parse(value) }),
  },
  groups: {
    add: (_id, value) => createGroup({ dto: GroupSchema.parse(value) }),
    remove: (id) => deleteGroups([id]),
    replace: (id, value) => updateGroup(id, { dto: GroupSchema.parse(value) }),
  },
  tapestries: {
    add: (_id, _value) => {
      throw new Error('Not implemented')
    },
    remove: (_id) => {
      throw new Error('Not implemented')
    },
    replace: (_id, value) => updateTapestry(TapestrySchema.parse(value)),
  },
  presentationSteps: {
    add: (_id, value) => createPresentationStep({ dto: PresentationStepSchema.parse(value) }),
    remove: (id) => deletePresentationSteps(id),
    replace: (id, value) =>
      updatePresentationStep(id, { dto: PresentationStepSchema.parse(value) }),
  },
}

function isNewMediaItem(value: unknown): value is MediaItemDto {
  return isMediaItem(value) && value.source.startsWith('blob:')
}
