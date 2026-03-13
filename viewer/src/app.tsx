import { enableMapSet, enablePatches } from 'immer'
import 'pixi.js/math-extras'
import 'pixi.js/ktx2'
import { createContext, useState } from 'react'

import { useResponsiveClass } from 'tapestry-core-client/src/components/lib/hooks/use-responsive-class'
import { useThemeCss } from 'tapestry-core-client/src/components/lib/hooks/use-theme-css'
import { TapestryConfigProvider } from 'tapestry-core-client/src/components/tapestry'
import { Store } from 'tapestry-core-client/src/lib/store'
import { createStoreHooks, createUseStoreHook } from 'tapestry-core-client/src/lib/store/provider'
import type { TapestryViewModel } from 'tapestry-core-client/src/view-model'

import { useSearchParams } from 'react-router'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { LoadingSpinner } from 'tapestry-core-client/src/components/lib/loading-spinner'
import { Tapestry } from './components/tapestry'
import { TapestryImport } from './components/tapestry-import'
import { ImportService } from './services/import-service'
import './index.css'
import { db } from './services/db-service'

enableMapSet()
enablePatches()

const TapestryStoreContext = createContext<Store<TapestryViewModel> | null>(null)

export const {
  useStore: useTapestryStore,
  useStoreData: useTapestryData,
  useDispatch,
} = createStoreHooks(createUseStoreHook(TapestryStoreContext))

export function App() {
  const [store, setStore] = useState<Store<TapestryViewModel>>()
  const source = useSearchParams()[0].get('source')

  async function loadFile(blob: Blob) {
    const store = await new ImportService().parse(blob)
    if (!store) {
      return
    }

    setStore(store)
  }

  const { loading } = useAsync(
    async ({ signal }) => {
      const buffer = source
        ? await (await fetch(source, { signal })).arrayBuffer()
        : await db.get(signal)
      if (!buffer) {
        return
      }

      await loadFile(new Blob([buffer]))
    },
    [source],
  )

  useResponsiveClass()
  useThemeCss('light')

  return (
    <TapestryConfigProvider
      config={{ useDispatch, useStore: useTapestryStore, useStoreData: useTapestryData }}
    >
      {store ? (
        <TapestryStoreContext value={store}>
          <Tapestry
            onBack={() => {
              void db.clear()
              setStore(undefined)
            }}
          />
        </TapestryStoreContext>
      ) : loading ? (
        <LoadingSpinner
          size="150px"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ) : (
        <TapestryImport
          onImport={async (file) => {
            void db.save(file)
            await loadFile(file)
          }}
        />
      )}
    </TapestryConfigProvider>
  )
}
