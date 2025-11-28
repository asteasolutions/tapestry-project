import { ResourceName } from 'tapestry-shared/src/data-transfer/resources'
import {
  BatchMutationParams,
  ResourceLists,
  ResourceRepo,
  ResourceRepoOptions,
} from '../../../utils/resource-repo'
import {
  TapestryCreateDto,
  TapestryDto,
  TapestryUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import {
  ActionButtonItemDto,
  ActionButtonItemUpdateDto,
  ItemCreateDto,
  ItemDto,
  ItemUpdateDto,
  MediaItemDto,
  MediaItemUpdateDto,
  TextItemDto,
  TextItemUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import {
  RelCreateDto,
  RelDto,
  RelUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/rel'
import { idFilter, listAll, resource, RESTMethodOptions } from '../../../services/rest-resources'
import { isEmpty, isEqual } from 'lodash'
import {
  BaseResourceDto,
  BatchMutationDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import { isMediaItem, transferProperty } from 'tapestry-core/src/utils'
import {
  EDITABLE_ACTION_BUTTON_ITEM_PROPS,
  EDITABLE_GROUP_PROPS,
  EDITABLE_MEDIA_ITEM_PROPS,
  EDITABLE_PRESENTATION_STEP_PROPS,
  EDITABLE_REL_PROPS,
  EDITABLE_TAPESTRY_PROPS,
  EDITABLE_TEXT_ITEM_PROPS,
} from '../../../model/data/utils'
import { KeysOfUnion } from 'tapestry-core/src/type-utils'
import {
  GroupCreateDto,
  GroupDto,
  GroupUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/group'
import {
  PresentationStepCreateDto,
  PresentationStepDto,
  PresentationStepUpdateDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step'
import { SocketManager, TapestryUpdated } from './socket-manager'
import { EventTypes } from 'tapestry-core-client/src/lib/events/typed-events'
import { createEventRegistry } from 'tapestry-core-client/src/lib/events/event-registry'
import { SOCKET_ID_HEADER } from 'tapestry-shared/src/data-transfer/socket/types'
import { APIError } from '../../../errors'

const TAPESTRY_RESOURCES = [
  'tapestries',
  'items',
  'rels',
  'groups',
  'presentationSteps',
] as const satisfies ResourceName[]
export type TapestryResourceName = (typeof TAPESTRY_RESOURCES)[number]
type TypeMap = {
  tapestries: {
    resource: TapestryDto
    createParams: TapestryCreateDto
    updateParams: TapestryUpdateDto
  }
  items: {
    resource: ItemDto
    createParams: ItemCreateDto
    updateParams: ItemUpdateDto
  }
  rels: {
    resource: RelDto
    createParams: RelCreateDto
    updateParams: RelUpdateDto
  }
  groups: {
    resource: GroupDto
    createParams: GroupCreateDto
    updateParams: GroupUpdateDto
  }
  presentationSteps: {
    resource: PresentationStepDto
    createParams: PresentationStepCreateDto
    updateParams: PresentationStepUpdateDto
  }
}

const EMPTY_BATCH_RESPONSE: BatchMutationDto<never> = {
  created: [],
  updated: [],
  destroyed: [],
}

function createPatch<T extends BaseResourceDto, P extends object>(
  newValue: T,
  oldValue: T,
  editableProps: (KeysOfUnion<T> & KeysOfUnion<P>)[],
) {
  const patch = {} as P
  editableProps.forEach((k) => {
    if (!isEqual(newValue[k], oldValue[k])) {
      transferProperty(patch, newValue, k)
    }
  })
  return patch
}

function createItemPatch(newItem: ItemDto, oldItem: ItemDto) {
  if (isMediaItem(newItem) !== isMediaItem(oldItem)) {
    throw new Error('Cannot convert between media and text item')
  }

  const patch: ItemUpdateDto = isMediaItem(newItem)
    ? createPatch<MediaItemDto, MediaItemUpdateDto>(
        newItem,
        oldItem as MediaItemDto,
        EDITABLE_MEDIA_ITEM_PROPS,
      )
    : newItem.type === 'text'
      ? createPatch<TextItemDto, TextItemUpdateDto>(
          newItem,
          oldItem as TextItemDto,
          EDITABLE_TEXT_ITEM_PROPS,
        )
      : createPatch<ActionButtonItemDto, ActionButtonItemUpdateDto>(
          newItem,
          oldItem as ActionButtonItemDto,
          EDITABLE_ACTION_BUTTON_ITEM_PROPS,
        )

  return isEmpty(patch) ? undefined : { ...patch, type: newItem.type }
}

type EventTypesMap = {
  socketManager: EventTypes<SocketManager>
}

const { eventListener, attachListeners, detachListeners } = createEventRegistry<EventTypesMap>()

function createPresentationStepPatch(newStep: PresentationStepDto, oldStep: PresentationStepDto) {
  const patch = createPatch<PresentationStepDto, Partial<PresentationStepUpdateDto>>(
    newStep,
    oldStep,
    EDITABLE_PRESENTATION_STEP_PROPS,
  )
  if (!isEmpty(patch)) {
    patch.type = newStep.type
  }
  return patch as PresentationStepUpdateDto
}

export class TapestryResourcesRepo extends ResourceRepo<TapestryResourceName, TypeMap> {
  constructor(
    private tapestryId: string,
    private socketManager: SocketManager,
    options?: ResourceRepoOptions,
  ) {
    super(TAPESTRY_RESOURCES, options)
  }

  async init(signal?: AbortSignal) {
    const res = await super.init(signal)
    attachListeners(this, 'socketManager', this.socketManager)
    return res
  }

  dispose() {
    detachListeners(this, 'socketManager', this.socketManager)
  }

  protected async fetch<K extends TapestryResourceName>(
    ids?: Record<K, string[] | true> | null,
    signal?: AbortSignal,
  ) {
    const result: Partial<ResourceLists<TapestryResourceName, TypeMap>> = {}
    const { tapestries, items, rels, presentationSteps, groups } = (ids ?? {}) as Partial<
      Record<TapestryResourceName, string[] | true>
    >

    if (!ids || tapestries) {
      result.tapestries = [
        await resource('tapestries').read(
          { id: this.tapestryId },
          { include: ['owner'] },
          { signal },
        ),
      ]
    }
    if (!ids || items) {
      const itemIds = Array.isArray(items) ? items : undefined
      result.items = await listAll(
        resource('items'),
        { filter: { ...idFilter(itemIds), 'tapestryId:eq': this.tapestryId } },
        signal,
      )
    }
    if (!ids || rels) {
      const relIds = Array.isArray(rels) ? rels : undefined
      result.rels = await listAll(
        resource('rels'),
        { filter: { ...idFilter(relIds), 'tapestryId:eq': this.tapestryId } },
        signal,
      )
    }
    if (!ids || groups) {
      const groupIds = Array.isArray(groups) ? groups : undefined
      result.groups = await listAll(resource('groups'), {
        filter: { ...idFilter(groupIds), 'tapestryId:eq': this.tapestryId },
      })
    }
    if (!ids || presentationSteps) {
      const presentationStepIds = Array.isArray(presentationSteps) ? presentationSteps : undefined
      result.presentationSteps = await listAll(
        resource('presentationSteps'),
        { filter: { ...idFilter(presentationStepIds), 'tapestryId:eq': this.tapestryId } },
        signal,
      )
    }

    return result as ResourceLists<K, TypeMap>
  }

  protected createParams<K extends TapestryResourceName>(
    resourceName: K,
    resource: TypeMap[K]['resource'],
  ) {
    if (resourceName === 'tapestries') {
      throw new Error('Cannot create new tapestries!')
    }
    if (resourceName === 'items') {
      return resource as ItemCreateDto & { id: string }
    }
    if (resourceName === 'groups') {
      return resource as GroupCreateDto & { id: string }
    }
    if (resourceName === 'rels') {
      return resource as RelCreateDto & { id: string }
    }
    return resource as PresentationStepCreateDto & { id: string }
  }

  protected updateParams<K extends TapestryResourceName>(
    resourceName: K,
    cur: TypeMap[K]['resource'],
    prev: TypeMap[K]['resource'],
  ) {
    if (resourceName === 'tapestries') {
      return createPatch<TapestryDto, TapestryUpdateDto>(
        cur as TapestryDto,
        prev as TapestryDto,
        EDITABLE_TAPESTRY_PROPS,
      )
    }
    if (resourceName === 'items') {
      return createItemPatch(cur as ItemDto, prev as ItemDto)
    }
    if (resourceName === 'groups') {
      return createPatch<GroupDto, GroupUpdateDto>(
        cur as GroupDto,
        prev as GroupDto,
        EDITABLE_GROUP_PROPS,
      )
    }
    if (resourceName === 'rels') {
      return createPatch<RelDto, RelUpdateDto>(cur as RelDto, prev as RelDto, EDITABLE_REL_PROPS)
    }
    return createPresentationStepPatch(cur as PresentationStepDto, prev as PresentationStepDto)
  }

  protected async mutate(mutation: BatchMutationParams<TapestryResourceName, TypeMap>) {
    const tapestries: BatchMutationDto<TapestryDto> = {
      created: [],
      updated: [],
      destroyed: [],
    }

    const options: RESTMethodOptions = {
      headers: { [SOCKET_ID_HEADER]: this.socketManager.id },
    }

    if (mutation.tapestries.update) {
      // Only updates for the given tapestry ID are supported
      const tapestryUpdate = mutation.tapestries.update[this.tapestryId]

      // When updating only an item for example the `tapestries.update` object is empty and `tapestryUpdate` is undefined
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (tapestryUpdate) {
        try {
          const updated = await resource('tapestries').update(
            { id: this.tapestryId },
            tapestryUpdate,
            undefined,
            options,
          )
          tapestries.updated = [updated]
        } catch (error) {
          if (error instanceof APIError) {
            tapestries.updated = error.data
          } else {
            throw error
          }
        }
      }
    }

    // Items, rels and groups need to be updated in this order, so that if rels
    // are associated with new items, the items are created first, and if
    // items are assigned to groups, the groups are created first
    const groups = this.isDiffEmpty(mutation.groups)
      ? EMPTY_BATCH_RESPONSE
      : await resource('groupBatchMutations').create(mutation.groups, undefined, options)
    const items = this.isDiffEmpty(mutation.items)
      ? EMPTY_BATCH_RESPONSE
      : await resource('itemBatchMutations').create(mutation.items, undefined, options)
    const rels = this.isDiffEmpty(mutation.rels)
      ? EMPTY_BATCH_RESPONSE
      : await resource('relBatchMutations').create(mutation.rels, undefined, options)
    const presentationSteps = this.isDiffEmpty(mutation.presentationSteps)
      ? EMPTY_BATCH_RESPONSE
      : await resource('presentationStepBatchMutations').create(
          mutation.presentationSteps,
          undefined,
          options,
        )

    return { tapestries, items, rels, presentationSteps, groups }
  }

  @eventListener('socketManager', 'tapestry-updated')
  protected onRemoteUpdate({
    detail: { tapestry, items, rels, groups, presentationSteps },
  }: TapestryUpdated) {
    // This update doesn't actually update anything. Rather, it is used as a transaction, so that:
    // 1. Only one change event is thrown
    // 2. We don't need to worry about the order of invocation of `handleMutationResponse`, i.e.
    //    if we have deleted an item with a rel we should delete the rels first, so there are not exceptions
    this.update(() => {
      if (tapestry) {
        this.handleMutationResponse(
          'tapestries',
          {},
          { updated: [tapestry], created: [], destroyed: [] },
          Infinity,
        )
      }
      if (groups) {
        this.handleMutationResponse('groups', {}, groups, Infinity)
      }
      if (items) {
        this.handleMutationResponse('items', {}, items, Infinity)
      }
      if (rels) {
        this.handleMutationResponse('rels', {}, rels, Infinity)
      }
      if (presentationSteps) {
        this.handleMutationResponse('presentationSteps', {}, presentationSteps, Infinity)
      }
    })
  }
}
