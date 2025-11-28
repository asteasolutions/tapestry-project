import { Context, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { isEqual } from 'lodash-es'
import { Objectish } from 'immer'
import { Path, PickFromOptional, ValueAtPath } from 'tapestry-core/src/type-utils.js'
import { Store, StoreAlias } from './index.js'
import { ContextHookInvocationError } from '../../errors.js'

export interface StoreProviderProps<T extends Objectish, Alias extends StoreAlias> {
  store: Store<T, Alias>
  children: ReactNode
}

type UseStore<T extends Objectish, Alias extends StoreAlias = never> = () => Store<T, Alias>

export function createUseStoreHook<T extends Objectish, Alias extends StoreAlias>(
  StoreContext: Context<Store<T, Alias> | null>,
): UseStore<T, Alias>
export function createUseStoreHook<
  T extends Objectish,
  Alias extends StoreAlias,
  K extends keyof Alias,
>(StoreContext: Context<Store<T, Alias> | null>, alias: K): UseStore<Alias[K], never>
export function createUseStoreHook<
  T extends Objectish,
  Alias extends StoreAlias,
  K extends keyof Alias,
>(StoreContext: Context<Store<T, Alias> | null>, alias?: K) {
  function useStore() {
    const store = useContext(StoreContext)
    if (!store) throw new ContextHookInvocationError('StoreProvider')

    return alias ? store.as(alias) : store
  }
  return useStore
}

export function createStoreHooks<T extends Objectish, Alias extends StoreAlias = never>(
  useStore: UseStore<T, Alias>,
) {
  function useStoreData(): T
  function useStoreData<P extends Path<T>>(path: P): ValueAtPath<T, P>
  function useStoreData<const K extends keyof T>(fields: K[]): Pick<T, K>
  function useStoreData<P extends Path<T>, const K extends keyof NonNullable<ValueAtPath<T, P>>>(
    path: P,
    fields: K[],
  ): PickFromOptional<ValueAtPath<T, P>, K>
  function useStoreData<P extends Path<T>, const K extends keyof ValueAtPath<T, P>>(
    arg0?: P | K[],
    arg1?: K[],
  ) {
    const store = useStore()
    const path = typeof arg0 === 'string' ? arg0 : undefined
    const fieldsInput = arg1 ?? (Array.isArray(arg0) ? arg0 : undefined)
    const [value, setValue] = useState(store.get(path, fieldsInput))

    // Convert fields to string so they don't trigger the useEffect on every render
    const fieldsStr = fieldsInput?.join(',')

    const [prevPath, setPrevPath] = useState(path)
    const [prevFields, setPrevFields] = useState(fieldsStr)

    if (prevPath !== path || prevFields !== fieldsStr) {
      setValue(store.get(path, fieldsInput))
      setPrevPath(path)
      setPrevFields(fieldsStr)
    }

    useEffect(() => {
      const onChange = (newValue: PickFromOptional<ValueAtPath<T, P>, K>) => {
        setValue(newValue)
      }

      const fields = fieldsStr?.split(',') as K[] | undefined

      const currentValue = store.get(path, fields)
      setValue((value) => (isEqual(currentValue, value) ? value : currentValue))

      store.subscribe(path, fields, onChange)

      return () => store.unsubscribe(onChange)
    }, [store, path, fieldsStr])

    // Can't make the type of this value compatible with all implementation signatures.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
    return value as any
  }

  function useDispatch() {
    const store = useStore()
    const dispatch = useMemo(() => store.dispatch.bind(store), [store])
    return dispatch
  }

  return { useStore, useStoreData, useDispatch }
}

export type StoreHooks<T extends Objectish, Alias extends StoreAlias = never> = ReturnType<
  typeof createStoreHooks<T, Alias>
>
