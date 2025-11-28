import styles from './styles.module.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { useSession } from '../../layouts/session'
import { LazyListLoader } from '../../components/lazy-list/lazy-list-loader'
import { useTapestryImport } from '../../hooks/use-tapestry-import'
import { ImportTapestryDialog } from './import-tapestry-button/import-tapestry-dialog'
import { dataTransferToFiles } from '../../stage/data-transfer-handler'
import { TYPE } from 'tapestry-core/src/data-format/export'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { TapestryList, TapestryListItem } from './tapestry-list'
import { AcceptInvitationDialog } from '../../components/accept-invitation-dialog'
import { SnackbarData } from 'tapestry-core-client/src/view-model'
import { Snackbar } from 'tapestry-core-client/src/components/lib/snackbar/index'
import {
  ListParamsInputDto,
  SortDirection,
} from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import { userSettings } from '../../services/user-settings'
import { DragArea } from './drag-area'
import { Breakpoint, useResponsive } from '../../providers/responsive-provider'
import { DashboardHeader } from './header'
import { TapestryListControls } from './tapestry-list-controls'
import { useThemeCss } from 'tapestry-core-client/src/components/lib/hooks/use-theme-css'
import { dashboardPath } from '../../utils/paths'
import { CreateTapestryDialog } from '../../components/create-tapestry-dialog'

function useNavigateOnLogin() {
  const { user } = useSession()
  const navigate = useNavigate()

  const prevUser = useRef(user)

  useEffect(() => {
    if (user && !prevUser.current) {
      // TODO: Implementing this with <Navigate /> does not seem to work for some reason
      void navigate(dashboardPath('home'), { replace: true })
    }
    prevUser.current = user
  }, [navigate, user])
}

const SORT_BY = ['latest', 'title', 'lastSeen'] as const

export type SortBy = (typeof SORT_BY)[number]

export const GUEST_SORT_BY: SortBy[] = ['latest', 'title']

export type DashboardSection = 'home' | 'shared' | 'public' | 'bookmarks'

const CUSTOM_CRITERIA: Partial<Record<DashboardSection, Partial<Record<SortBy, string>>>> = {
  home: {
    latest: 'createdAt',
  },
  bookmarks: {
    latest: 'createdAt',
  },
  shared: {
    latest: 'firstSeen',
  },
  public: {
    latest: 'createdAt',
  },
}

function createTapestryFilter(
  section: DashboardSection,
  searchTerm: string,
  userId?: string | null,
) {
  const listFilter: ListParamsInputDto['filter'] = { 'title:icontains': searchTerm }
  if (section === 'public') {
    listFilter['visibility:eq'] = 'public'
  } else if (userId) {
    if (section === 'home') {
      listFilter['ownerId:eq'] = userId
    } else if (section === 'shared') {
      listFilter['sharedWith:eq'] = userId
    } else {
      listFilter['bookmarkedBy:eq'] = userId
    }
  }

  return listFilter
}

function getSavedSortCriterion(loggedIn: boolean): SortBy {
  return (
    (loggedIn ? SORT_BY : GUEST_SORT_BY).find(
      (sortBy) => sortBy === userSettings.currentSettings.sortBy,
    ) ?? GUEST_SORT_BY[0]
  )
}

export function Dashboard() {
  const { user } = useSession()
  const { section } = useParams<{ section: DashboardSection }>()
  const location = useLocation()

  useNavigateOnLogin()

  const [creatingTapestry, setCreatingTapestry] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [sortCriterion, setSortCriterion] = useState<SortBy>(getSavedSortCriterion(!!user))
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    userSettings.currentSettings.sortDirection,
  )

  const userIdRef = useRef(user?.id)

  if (userIdRef.current !== user?.id) {
    userIdRef.current = user?.id
    setSortCriterion(getSavedSortCriterion(!!user))
    setSortDirection(userSettings.currentSettings.sortDirection)
  }

  const [initialPrompt, setInitialPrompt] = useState(location.state as SnackbarData | undefined)

  const [prevSection, setPrevSection] = useState(section)
  if (section !== prevSection) {
    setPrevSection(section)
    setSearchTerm('')
  }

  const [tapestryLoader, setTapestryLoader] = useState<LazyListLoader<TapestryListItem> | null>(
    null,
  )
  const tapestryListState = useObservable(tapestryLoader)
  const tapestryFilter = useMemo(
    () => (section ? createTapestryFilter(section, searchTerm, user?.id) : {}),
    [section, searchTerm, user?.id],
  )

  useThemeCss('light')

  const {
    imports,
    importTapestries,
    reset: resetImports,
  } = useTapestryImport(() => tapestryLoader?.reload())

  const smOrLess = useResponsive() <= Breakpoint.SM

  if (
    section !== 'public' &&
    !(user && (section === 'home' || section === 'shared' || section === 'bookmarks'))
  ) {
    return (
      <Navigate
        to={{ pathname: dashboardPath(user ? 'home' : 'public'), search: location.search }}
        replace
      />
    )
  }

  const header = (
    <DashboardHeader
      onNewTapestry={() => setCreatingTapestry(true)}
      onImport={importTapestries}
      section={section}
    />
  )

  const tapestryListControls = (
    <TapestryListControls
      section={section}
      tapestryListState={tapestryListState}
      onSearchChanged={setSearchTerm}
      sortCriterion={sortCriterion}
      onSortCriterionChanged={setSortCriterion}
      sortDirection={sortDirection}
      onSortDirectionChanged={setSortDirection}
    />
  )

  return (
    <div className={styles.root}>
      <title>Tapestries</title>
      {!smOrLess && header}

      <DragArea
        allowDrop={(items) => items.some((i) => i.type === TYPE)}
        classes={{ root: styles.dragArea }}
        disabled={!user}
        onDrop={async (e) => {
          const zips = (await dataTransferToFiles(e.dataTransfer)).filter((f) => f.type === TYPE)
          if (zips.length === 0) {
            return
          }
          void importTapestries(zips)
        }}
        title="Import your tapestry file"
        subtitle="Drag and drop to upload"
      >
        {!smOrLess && tapestryListControls}
        <TapestryList
          filter={tapestryFilter}
          orderBy={`${sortDirection === 'desc' ? '-' : ''}${CUSTOM_CRITERIA[section]?.[sortCriterion] ?? sortCriterion}`}
          onLoaderInitialized={setTapestryLoader}
          onNewTapestry={() => setCreatingTapestry(true)}
          showNewTapestryButton={section === 'home' && searchTerm === ''}
          header={
            smOrLess && (
              <>
                {header}
                {tapestryListControls}
              </>
            )
          }
        />
      </DragArea>
      {creatingTapestry && <CreateTapestryDialog onCancel={() => setCreatingTapestry(false)} />}
      {imports && <ImportTapestryDialog imports={imports} onClose={resetImports} />}
      <AcceptInvitationDialog />
      <Snackbar value={initialPrompt} onChange={() => setInitialPrompt(undefined)} />
    </div>
  )
}
