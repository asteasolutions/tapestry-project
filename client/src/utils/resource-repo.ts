import {
  BaseResourceDto,
  BatchMutationCreateDto,
  BatchMutationDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import { cloneDeep, get, isEmpty, isEqual, mapValues, set } from 'lodash'
import { createDraft, Patch } from 'immer'
import { arrayToIdMap, IdMap, pickById } from 'tapestry-core/src/utils'
import { ResourceName } from 'tapestry-shared/src/data-transfer/resources'
import {
  ErrorResponseDto,
  isErrorResponse,
} from 'tapestry-shared/src/data-transfer/resources/dtos/errors'

const PUSH_THROTTLE_PERIOD = 1000

export interface CommitOptions {
  skipPush?: boolean
}

export type ResourceTypeMap<R extends ResourceName> = Record<
  R,
  {
    resource: BaseResourceDto
    createParams: object
    updateParams: object
  }
>

export interface ResourceRepoOptions {
  onRequestPush?: () => unknown
  onAfterPush?: (error?: unknown) => unknown
}

export type ResourceLists<
  R extends ResourceName,
  T extends ResourceTypeMap<R>,
  S extends keyof T[R] = 'resource',
> = {
  [K in R]: T[K][S][]
}

export type ResourceIdMaps<R extends ResourceName, T extends ResourceTypeMap<R>> = {
  [K in R]: IdMap<T[K]['resource']>
}

type ResourceVersions<R extends ResourceName> = Record<R, IdMap<number>>

export type BatchMutationParams<R extends ResourceName, T extends ResourceTypeMap<R>> = {
  [K in R]: BatchMutationCreateDto<T[K]['createParams'], T[K]['updateParams']>
}

export type BatchMutationResult<R extends ResourceName, T extends ResourceTypeMap<R>> = {
  [K in R]: BatchMutationDto<T[K]['resource']>
}

type BatchMutationWithoutErrors<T extends BaseResourceDto> = {
  [K in keyof BatchMutationDto<T>]: Exclude<BatchMutationDto<T>[K], ErrorResponseDto>
}

export abstract class ResourceRepo<
  R extends ResourceName,
  TypeMap extends ResourceTypeMap<R>,
> extends Observable<Readonly<ResourceIdMaps<R, TypeMap>>> {
  private head = 0
  private remote: ResourceIdMaps<R, TypeMap>
  private resourceVersions: ResourceVersions<R>

  private isDirty = false
  private pushTimeout: number | null = null
  private requestState: 'idle' | 'pushing' | 'pulling' = 'idle'
  private requestQueue = Promise.resolve()

  constructor(
    private resourceNames: R[],
    private options?: ResourceRepoOptions,
  ) {
    const workingCopy = Object.fromEntries(
      resourceNames.map((name) => [name, {}]),
    ) as ResourceIdMaps<R, TypeMap>
    super(workingCopy)

    this.remote = cloneDeep(workingCopy)
    this.resourceVersions = Object.fromEntries(
      resourceNames.map((name) => [name, {}]),
    ) as ResourceVersions<R>
  }

  async init(signal?: AbortSignal) {
    const resourceLists = await this.fetch(null, signal)
    this.remote = mapValues(resourceLists, arrayToIdMap) as ResourceIdMaps<R, TypeMap>
    this.commit(this.remote, { skipPush: true })
    this.head += 1
  }

  dispose() {
    //
  }

  /**
   * Replace the resources in the working copy of this repo with the given set of resources.
   * This operation will effectively delete from the repo all resources which are not in the given list.
   *
   * After committing the resources to the working copy, a 'push' to the remote will be scheduled automatically
   * so that the changes are propagated to the server as well, unless the `skipPush: true` commit option is passed.
   */
  commit(resources: ResourceIdMaps<R, TypeMap>, { skipPush }: CommitOptions = {}) {
    this.resourceVersions = mapValues(resources, (idMap) => mapValues(idMap, () => this.head))
    this.update(() => createDraft(cloneDeep(resources)), { silent: true })
    if (!skipPush) {
      this.requestPush()
    }
  }

  /**
   * Commit a set of patches to the working copy of this repo.
   *
   * After committing the patches to the working copy, a 'push' to the remote will be scheduled automatically
   * so that the changes are propagated to the server as well, unless the `skipPush: true` commit option is passed.
   */
  commitPatches(patches: Patch[], { skipPush }: CommitOptions = {}) {
    if (patches.length === 0) return

    this.updateWithPatches(patches, { silent: true })

    for (const { path, op } of patches) {
      if (op === 'remove' && path.length === 2) {
        // A resource has been removed
        delete this.resourceVersions[path[0] as R][path[1]]
      } else {
        // A resource has been modified
        set(this.resourceVersions, path.slice(0, 2), this.head)
      }
    }

    if (!skipPush) {
      this.requestPush()
    }
  }

  /**
   * Pull the latest data from the server. If no IDs are given, this method pulls the entire repository as
   * determined by the `listFilter` configuration, i.e. it performs a full reload, potentially deleting
   * resources that are no longer present on the server. Otherwise, if one or more IDs are given, only they
   * will be reloaded.
   */
  pull<K extends R = R>(ids?: Record<K, string[] | true> | null, signal?: AbortSignal) {
    return this.enqueueRequest(async () => {
      this.requestState = 'pulling'

      const resourceLists = await this.fetch(ids, signal)
      const response = mapValues(resourceLists, arrayToIdMap) as ResourceIdMaps<K, TypeMap>

      for (const resourceName of Object.keys(response) as K[]) {
        const requestedIds = Array.isArray(ids?.[resourceName])
          ? new Set(ids[resourceName])
          : undefined

        const { created, updated, destroyed } = this.diffRemoteData(
          resourceName,
          response[resourceName],
          requestedIds,
        )

        // Update the remote version of the data
        ;[...created, ...updated].forEach((resource) =>
          set(this.remote, [resourceName, resource.id], resource),
        )
        destroyed.forEach((id) => delete this.remote[resourceName][id])

        // Update the local version of the data and notify observers
        this.update((workingCopy) => {
          created.forEach((resource) => {
            const resourcePath = [resourceName, resource.id]
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            set(workingCopy, resourcePath, resource)
            set(this.resourceVersions, resourcePath, this.head - 1)
          })
          updated.forEach((resource) => {
            const resourcePath = [resourceName, resource.id]

            // Don't override local changes. Update the resource in the working copy
            // only if it hasn't been deleted or modified locally
            if (
              get(workingCopy, resourcePath) &&
              get(this.resourceVersions, resourcePath, 0) < this.head
            ) {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              set(workingCopy, resourcePath, resource)
            }
          })
          destroyed.forEach((id) => {
            // @ts-expect-error The fact that workingCopy is Draft confuses TypeScript here
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            delete workingCopy[resourceName][id]
            delete this.resourceVersions[resourceName][id]
          })
        })
      }

      this.requestState = 'idle'
    })
  }

  private enqueueRequest(action: () => Promise<void>) {
    this.requestQueue = this.requestQueue.then(async () => {
      try {
        await action()
      } catch (error) {
        console.error('Error while sending request from resource repo', error)
      }
    })
  }

  private requestPush() {
    this.isDirty = true
    if (!this.pushTimeout && this.requestState !== 'pushing') {
      this.options?.onRequestPush?.()
      this.pushTimeout = window.setTimeout(
        () => this.enqueueRequest(() => this.push()),
        PUSH_THROTTLE_PERIOD,
      )
    }
  }

  private onBeforePush() {
    this.isDirty = false
    this.pushTimeout = null
    this.requestState = 'pushing'
  }

  private onAfterPush(error?: unknown) {
    this.requestState = 'idle'
    this.options?.onAfterPush?.(error)
    if (this.isDirty) {
      this.requestPush()
    }
  }

  private async push() {
    this.onBeforePush()

    try {
      const diffs = this.diff()
      // TODO: In the mutate method of the child classes we are (or at least should be) checking
      // the diff for each particular resource in order not to send some empty requests.
      //
      // This means that the check below could potentially be redundant, however after removing it
      // it should be tested whether incrementing the head unnecessarily has any detrimental effects
      const areAllDiffsEmpty = Object.values<BatchMutationCreateDto<unknown, unknown>>(diffs).every(
        (diff) => this.isDiffEmpty(diff),
      )
      const errors: ErrorResponseDto[] = []
      if (!areAllDiffsEmpty) {
        const commitVersion = this.head
        this.head += 1

        const mutations = await this.mutate(diffs)

        for (const name of Object.keys(mutations) as R[]) {
          errors.push(
            ...this.handleMutationResponse(name, diffs[name], mutations[name], commitVersion),
          )
        }
      }
      this.onAfterPush(errors.length > 0 ? errors : undefined)
    } catch (error) {
      this.onAfterPush(error)
      throw error
    }
  }

  protected handleMutationResponse<K extends R>(
    resourceName: K,
    request: BatchMutationCreateDto<TypeMap[K]['createParams'], TypeMap[K]['updateParams']>,
    response: BatchMutationDto<TypeMap[K]['resource']>,
    commitVersion: number,
  ): ErrorResponseDto[] {
    const errors: ErrorResponseDto[] = []
    const toSetInWorkingCopy: TypeMap[K]['resource'][] = []
    const toRemoveFromWorkingCopy: string[] = []

    const updateRemoteCopy = (resource: TypeMap[K]['resource']) => {
      set(this.remote, [resourceName, resource.id], resource)
    }

    // TODO: When we encounter an error response, we need to figure out how to display a message to the user.
    if (isErrorResponse(response.created)) {
      // Creation has failed. Don't update the remote copy with any new data, just remove
      // from the working copy the resources which failed to create.
      toRemoveFromWorkingCopy.push(...request.create!.map(({ id }) => id))
      errors.push(response.created)
    } else {
      // Creation has succeeded. Update the remote copy and the working copy with the data returned by the server.
      toSetInWorkingCopy.push(...response.created)
      response.created.forEach(updateRemoteCopy)
    }

    if (isErrorResponse(response.updated)) {
      // Update has failed. Revert all working copy resources to their corresponding remote versions.
      toSetInWorkingCopy.push(
        ...Object.keys(request.update!).map((id) => cloneDeep(this.remote[resourceName][id]!)),
      )
      errors.push(response.updated)
    } else {
      // Update has succeeded. Update the remote copy and the working copy with the data returned by the server.
      toSetInWorkingCopy.push(...response.updated)
      response.updated.forEach(updateRemoteCopy)
    }

    if (isErrorResponse(response.destroyed)) {
      // Deletion has failed. Revert all unsuccessfully deleted resources in the working copy.
      toSetInWorkingCopy.push(...request.destroy!.map((id) => this.remote[resourceName][id]!))
      errors.push(response.destroyed)
    } else {
      // Deletion has succeeded, at least partially. If some record failed to delete, revert them.
      response.destroyed.forEach((id) => delete this.remote[resourceName][id])
      toRemoveFromWorkingCopy.push(...response.destroyed)
      for (const id of new Set(request.destroy).difference(new Set(response.destroyed))) {
        toSetInWorkingCopy.push(cloneDeep(this.remote[resourceName][id]!))
      }
    }

    // Update the local version of the data and notify observers
    this.update((workingCopy) => {
      toSetInWorkingCopy.forEach((resource) => {
        const resourcePath = [resourceName, resource.id]
        // Don't override local changes that may have happened since the push operation started
        if (get(this.resourceVersions, resourcePath, 0) <= commitVersion) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          set(workingCopy, resourcePath, resource)
        }
      })

      toRemoveFromWorkingCopy.forEach((id) => {
        delete (workingCopy as ResourceIdMaps<R, TypeMap>)[resourceName][id]
        delete this.resourceVersions[resourceName][id]
      })
    })

    return errors
  }

  private diffRemoteData<K extends R>(
    resourceName: K,
    serverResponse: IdMap<TypeMap[K]['resource']>,
    requestedIds?: Set<string> | null,
  ): BatchMutationWithoutErrors<TypeMap[K]['resource']> {
    const knownIds = new Set(Object.keys(this.remote[resourceName]))
    const latestIds = new Set(Object.keys(serverResponse))
    const requestedKnownIds = requestedIds ? requestedIds.intersection(knownIds) : knownIds

    return {
      created: pickById(serverResponse, latestIds.difference(knownIds)),
      updated: pickById(serverResponse, latestIds.intersection(knownIds)).filter(
        (resource) => !isEqual(resource, this.remote[resourceName][resource.id]),
      ),
      destroyed: [...requestedKnownIds.difference(latestIds)],
    }
  }

  private diff(): BatchMutationParams<R, TypeMap> {
    const params: Partial<BatchMutationParams<R, TypeMap>> = {}

    for (const name of this.resourceNames) {
      params[name] = this.resourceDiff(name)
    }

    return params as BatchMutationParams<R, TypeMap>
  }

  private resourceDiff<K extends R>(
    resourceName: K,
  ): BatchMutationCreateDto<TypeMap[K]['createParams'], TypeMap[K]['updateParams']> {
    const newIds = new Set(Object.keys(this.value[resourceName]))
    const oldIds = new Set(Object.keys(this.remote[resourceName]))

    const create = [...newIds.difference(oldIds)].map((k) =>
      this.createParams(resourceName, this.value[resourceName][k]!),
    )

    const update = Object.fromEntries(
      [...newIds.intersection(oldIds)]
        .map(
          (k) =>
            [
              k,
              this.updateParams(
                resourceName,
                this.value[resourceName][k]!,
                this.remote[resourceName][k]!,
              ),
            ] as const,
        )
        .filter(([_, patch]) => !isEmpty(patch)) as [string, TypeMap[K]['updateParams']][],
    )

    const destroy = [...oldIds.difference(newIds)]

    return { create, update, destroy }
  }

  protected isDiffEmpty(diff: BatchMutationCreateDto<unknown, unknown>) {
    return isEmpty(diff.create) && isEmpty(diff.update) && isEmpty(diff.destroy)
  }

  protected abstract fetch<K extends R = R>(
    ids?: Record<K, string[] | true> | null,
    signal?: AbortSignal,
  ): Promise<ResourceLists<K, TypeMap>>

  protected createParams<K extends R>(
    resourceName: K,
    _resource: TypeMap[K]['resource'],
  ): NonNullable<
    BatchMutationCreateDto<TypeMap[K]['createParams'], TypeMap[K]['updateParams']>['create']
  >[number] {
    throw new Error(`Cannot create ${resourceName}`)
  }

  protected updateParams<K extends R>(
    resourceName: K,
    _newValue: TypeMap[K]['resource'],
    _oldValue: TypeMap[K]['resource'],
  ):
    | NonNullable<
        BatchMutationCreateDto<TypeMap[K]['createParams'], TypeMap[K]['updateParams']>['update']
      >[string]
    | undefined {
    throw new Error(`Cannot update ${resourceName}`)
  }

  protected mutate(
    _mutation: BatchMutationParams<R, TypeMap>,
  ): Promise<BatchMutationResult<R, TypeMap>> {
    throw new Error('Repo configuration is read only!')
  }
}
