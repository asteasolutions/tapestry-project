import { openDB, DBSchema, IDBPDatabase, StoreNames, StoreValue } from 'idb'
import {
  TapestryRepoValue,
  TapestryResourcePatch,
} from '../pages/tapestry/view-model/tapestry-resources-repo'
import { set, thru } from 'lodash'
import { urlToBuffer } from 'tapestry-core-client/src/lib/file'
import { idMapToArray } from 'tapestry-core/src/utils'
import {
  ActionButtonItemDto,
  ItemDto,
  MediaItemDto,
  TextItemDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { RelDto } from 'tapestry-shared/src/data-transfer/resources/dtos/rel'
import { GroupDto } from 'tapestry-shared/src/data-transfer/resources/dtos/group'
import { PresentationStepDto } from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step'
import { asyncFlatMap } from 'tapestry-core/src/lib/promise'
import { isLocalMediaItem } from '../model/data/utils'

const version = 1

type TapestryItemDto = MediaItemDto | TextItemDto | ActionButtonItemDto

interface Schema extends DBSchema {
  tapestries: {
    key: string
    value: TapestryDto
  }
  items: {
    key: string
    value: TapestryItemDto
    indexes: { tapestryId: string }
  }
  rels: {
    key: string
    value: RelDto
    indexes: { tapestryId: string }
  }
  groups: {
    key: string
    value: GroupDto
    indexes: { tapestryId: string }
  }
  presentationSteps: {
    key: string
    value: PresentationStepDto
    indexes: { itemId: string; groupId: string }
  }
  blobs: {
    key: string
    value: {
      buffer: ArrayBuffer
    }
  }
}

type Store = StoreNames<Schema>
type StoreDto = StoreValue<Schema, Store>
type DBOperation = { store: Store } & (
  | { type: 'add'; value: StoreDto }
  | { type: 'delete'; id: string }
  | { type: 'update'; id: string; path: (string | number)[]; value: unknown }
)

const stores = Object.keys({
  items: null,
  rels: null,
  groups: null,
  tapestries: null,
  presentationSteps: null,
  blobs: null,
} satisfies Record<Store, null>) as Store[]

export class DB {
  private _db: IDBPDatabase<Schema> | null = null

  async connect() {
    this._db = await openDB<Schema>('tapestries', version, {
      upgrade(database) {
        database.createObjectStore('tapestries', { keyPath: 'id' })
        database
          .createObjectStore('items', { keyPath: 'id' })
          .createIndex('tapestryId', 'tapestryId')
        database
          .createObjectStore('rels', { keyPath: 'id' })
          .createIndex('tapestryId', 'tapestryId')
        database
          .createObjectStore('groups', { keyPath: 'id' })
          .createIndex('tapestryId', 'tapestryId')
        thru(database.createObjectStore('presentationSteps', { keyPath: 'id' }), (store) => {
          store.createIndex('groupId', 'groupId')
          store.createIndex('itemId', 'itemId')
        })
        database.createObjectStore('blobs', { keyPath: 'id' })
      },
    })
  }

  disconnect() {
    this._db?.close()
    this._db = null
  }

  get connected() {
    return !!this._db
  }

  async upsert({ tapestries, items, rels, groups, presentationSteps }: TapestryRepoValue) {
    const tx = this.db.transaction(stores, 'readwrite')

    await Promise.all([
      ...idMapToArray(tapestries).map((i) => tx.objectStore('tapestries').put(i)),
      ...idMapToArray(items).map((i) => tx.objectStore('items').put(i)),
      ...idMapToArray(rels).map((i) => tx.objectStore('rels').put(i)),
      ...idMapToArray(groups).map((i) => tx.objectStore('groups').put(i)),
      ...idMapToArray(presentationSteps).map((i) => tx.objectStore('presentationSteps').put(i)),
      tx.done,
    ])
  }

  async patch(patches: TapestryResourcePatch[]) {
    const operations = await this.toDbOperations(patches)

    // It is important not to put any asynchronous code aside from the one provided by the transaction
    // https://github.com/jakearchibald/idb?tab=readme-ov-file#transaction-lifetime
    const tx = this.db.transaction(stores, 'readwrite')
    await Promise.all([
      ...operations.map(async (op) => {
        if (op.type === 'add') {
          return tx.objectStore(op.store).put(op.value)
        }

        if (op.type === 'delete') {
          return tx.objectStore(op.store).delete(op.id)
        }

        const persistedObject = await tx.objectStore(op.store).get(op.id)
        if (!persistedObject) {
          throw new Error(`Object with id "${op.id}" was not found in store "${op.store}"`)
        }
        return tx.objectStore(op.store).put(set(persistedObject, op.path, op.value))
      }),
      tx.done,
    ])
  }

  async get(
    tapestryId: string,
  ): Promise<{ tapestry: TapestryDto; presentationSteps: PresentationStepDto[] } | undefined> {
    const model = await this.db.get('tapestries', tapestryId)
    if (!model) {
      return
    }

    const items = await Promise.all(
      (await this.db.getAllFromIndex('items', 'tapestryId', tapestryId)).map(this.fromLocalItem),
    )
    const rels = await this.db.getAllFromIndex('rels', 'tapestryId', tapestryId)
    const groups = await this.db.getAllFromIndex('groups', 'tapestryId', tapestryId)

    const presentationSteps = [
      ...(await asyncFlatMap(items, (i) =>
        this.db.getAllFromIndex('presentationSteps', 'itemId', i.id),
      )),
      ...(await asyncFlatMap(groups, (g) =>
        this.db.getAllFromIndex('presentationSteps', 'groupId', g.id),
      )),
    ]

    return {
      tapestry: {
        ...model,
        items,
        rels,
        groups,
      },
      presentationSteps,
    }
  }

  async delete(tapestryId: string) {
    // It is important not to put any asynchronous code aside from the one provided by the transaction
    // https://github.com/jakearchibald/idb?tab=readme-ov-file#transaction-lifetime
    const tx = this.db.transaction(stores, 'readwrite')
    const itemKeys = await tx.objectStore('items').index('tapestryId').getAllKeys(tapestryId)
    const groupKeys = await tx.objectStore('groups').index('tapestryId').getAllKeys(tapestryId)
    const relKeys = await tx.objectStore('rels').index('tapestryId').getAllKeys(tapestryId)
    const presenStepKeys = [
      ...(await asyncFlatMap(itemKeys, (key) =>
        tx.objectStore('presentationSteps').index('itemId').getAllKeys(key),
      )),
      ...(await asyncFlatMap(groupKeys, (key) =>
        tx.objectStore('presentationSteps').index('groupId').getAllKeys(key),
      )),
    ]

    await Promise.all([
      tx.objectStore('tapestries').delete(tapestryId),
      ...itemKeys.map((key) => tx.objectStore('items').delete(key)),
      ...itemKeys.map((key) => tx.objectStore('blobs').delete(key)),
      ...groupKeys.map((key) => tx.objectStore('groups').delete(key)),
      ...presenStepKeys.map((key) => tx.objectStore('presentationSteps').delete(key)),
      ...relKeys.map((key) => tx.objectStore('rels').delete(key)),
      tx.done,
    ])
  }

  private async toDbOperations(patches: TapestryResourcePatch[]): Promise<DBOperation[]> {
    return asyncFlatMap(patches, async ({ path: [store, id, ...rest], op, value }) => {
      const operations: DBOperation[] = []
      const isMediaBlob = isLocalMediaItem(value)
      if (op === 'add' && rest.length === 0) {
        operations.push({ store, type: 'add', value: value as StoreDto })

        if (isMediaBlob) {
          const buffer = await urlToBuffer(value.source)
          operations.push({ store: 'blobs', type: 'add', value: { id: value.id, buffer } })
        }
      } else if (op === 'remove') {
        operations.push({ store, type: 'delete', id })

        if (isMediaBlob) {
          operations.push({ store: 'blobs', type: 'delete', id })
        }
      } else {
        operations.push({ store, type: 'update', id, path: rest, value })
        // TODO: We are not currently changing the source of an item, but if we do
        // we will need to handle this here
      }

      return operations
    })
  }

  private get db() {
    if (!this._db) {
      throw new Error('Database not connected')
    }
    return this._db
  }

  private fromLocalItem = async (item: TapestryItemDto): Promise<ItemDto> => {
    if (isLocalMediaItem(item)) {
      const blob = (await this.db.get('blobs', item.id))?.buffer
      if (blob) {
        item.source = URL.createObjectURL(new Blob([blob]))
      }
    }
    return item
  }
}
