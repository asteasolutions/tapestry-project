import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { resource } from '../../services/rest-resources'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import { Options } from 'react-select'
import { Select, SelectOption } from '../select'
import { useSession } from '../../layouts/session'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { tapestryPath } from '../../utils/paths'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import clsx from 'clsx'

type Option = SelectOption<TapestryDto['visibility']>

function VisibilityOption({ icon, text }: { icon: IconName; text: string }) {
  return (
    <>
      <Icon icon={icon} />{' '}
      <Text variant="bodySm" className={styles.visibilityOption}>
        {text}
      </Text>
    </>
  )
}

const VISIBILITY_OPTIONS: Options<Option> = [
  {
    value: 'private',
    label: <VisibilityOption icon="lock" text="Private" />,
  },
  {
    value: 'link',
    label: <VisibilityOption icon="link" text="Anyone with the link" />,
  },
]

const publicLabel = <VisibilityOption icon="public" text="Public" />

interface GeneralAccessProps {
  tapestry: TapestryDto
  onCopied: () => unknown
}

export function GeneralAccess({ tapestry, onCopied }: GeneralAccessProps) {
  const {
    perform: updateVisibility,
    data: lastUpdatedTapestry,
    loading: updatingVisibility,
  } = useAsyncAction(
    async ({ signal }, visibility: TapestryDto['visibility']) =>
      resource('tapestries').update({ id: tapestry.id }, { visibility }, {}, { signal }),
    { clearDataOnReload: false },
  )

  const isOwner = useSession().user?.id === tapestry.ownerId
  const visibility = lastUpdatedTapestry?.visibility ?? tapestry.visibility
  const tapestryLink = `${window.origin}${tapestryPath(tapestry.owner!.username, tapestry.slug)}`
  const isPrivate = visibility === 'private'

  async function copyTapestryLink() {
    await navigator.clipboard.writeText(tapestryLink)
    onCopied()
  }

  return (
    <>
      <div className={styles.generalAccessHeader}>
        <Text component="div" style={{ fontWeight: 600 }}>
          Who can view this tapestry
        </Text>
        <Select
          isDisabled={!isOwner || updatingVisibility}
          className={styles.visibilityDropdown}
          value={visibility}
          options={VISIBILITY_OPTIONS}
          placeholder={visibility === 'public' ? publicLabel : undefined}
          onChange={(opt) => {
            if (opt) {
              void updateVisibility(opt.value)
            }
          }}
          theme={{ colors: { primary: 'var(--theme-background-brand)' } }}
          styles={{
            menu: (styles) => ({
              ...styles,
              padding: '8px',
              border: '1px solid var(--theme-border-subtle)',
              boxShadow: 'none',
              right: 0,
            }),
            menuList: (styles) => ({
              ...styles,
              gap: '8px',
              padding: 0,
            }),
            singleValue: (styles) => ({
              ...styles,
              fontWeight: 600,
            }),
            option: (styles, { isSelected }) => ({
              ...styles,
              borderRadius: '8px',
              backgroundColor: isSelected
                ? 'var(--theme-background-brand)'
                : styles.backgroundColor,
              color: isSelected ? 'var(--theme-text-primary-inverse)' : styles.color,
            }),
            valueContainer: (styles) => ({
              ...styles,
              padding: '2px 5px',
            }),
            dropdownIndicator: (styles) => ({
              ...styles,
              padding: 0,
            }),
          }}
        />
      </div>
      <div className={clsx(styles.embedCode, styles.shareLink)}>
        <Text
          variant="bodySm"
          className={clsx({ [styles.disabled]: isPrivate })}
          style={{
            flex: 1,
            textAlign: isPrivate ? 'center' : 'left',
          }}
          lineClamp={2}
        >
          {isPrivate
            ? 'Only you and people with edit privileges can view this tapestry'
            : tapestryLink}
        </Text>
        {!isPrivate && (
          <IconButton
            aria-label="Copy tapestry link"
            tooltip={{
              side: 'bottom',
              children: 'Copy tapestry link',
              align: 'end',
              arrowFollowsAlignment: true,
            }}
            icon="content_copy"
            onClick={copyTapestryLink}
          />
        )}
      </div>
    </>
  )
}
