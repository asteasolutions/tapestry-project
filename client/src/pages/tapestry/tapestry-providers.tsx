import { createContext, ReactNode, useContext } from 'react'
import { createStoreHooks, createUseStoreHook } from 'tapestry-core-client/src/lib/store/provider'
import { EditableTapestryViewModel } from './view-model'
import { TapestryDataSync } from './view-model/tapestry-data-sync'
import { ContextHookInvocationError } from 'tapestry-core-client/src/errors'
import { TapestryViewModel } from 'tapestry-core-client/src/view-model'
import { Store } from 'tapestry-core-client/src/lib/store'

export const TapestryStoreContext = createContext<Store<
  EditableTapestryViewModel,
  { base: TapestryViewModel }
> | null>(null)

export const {
  useStore: useTapestryStore,
  useStoreData: useTapestryData,
  useDispatch,
} = createStoreHooks(createUseStoreHook(TapestryStoreContext))

export const TAPESTRY_DATA_SYNC_COMMANDS = [
  'reloadCommentThreads',
  'broadcastCursorPosition',
] as const satisfies (keyof TapestryDataSync)[]
export type TapestryDataSyncCommandKeys = (typeof TAPESTRY_DATA_SYNC_COMMANDS)[number]
export type TapestryDataSyncCommands = Pick<TapestryDataSync, TapestryDataSyncCommandKeys>

const TapestryDataSyncCommandsContext = createContext<TapestryDataSyncCommands | null>(null)

interface TapestryDataSyncProviderProps {
  commands: TapestryDataSyncCommands
  children: ReactNode
}

export function TapestryDataSyncCommandsProvider({
  commands,
  children,
}: TapestryDataSyncProviderProps) {
  return (
    <TapestryDataSyncCommandsContext value={commands}>{children}</TapestryDataSyncCommandsContext>
  )
}

export function useTapestryDataSyncCommands(): TapestryDataSyncCommands {
  const commands = useContext(TapestryDataSyncCommandsContext)
  if (!commands) throw new ContextHookInvocationError('TapestryDataSyncCommandsProvider')

  return commands
}
