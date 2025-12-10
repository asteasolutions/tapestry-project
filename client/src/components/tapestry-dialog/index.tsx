import { useRef, useState } from 'react'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Textarea } from '../textarea'
import styles from './styles.module.css'
import { trim, uniqueId } from 'lodash-es'
import { getErrorMessage } from '../../errors'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { tapestryPath } from '../../utils/paths'
import { useSession } from '../../layouts/session'

export interface TapestryInfo {
  title: string
  slug?: string
  description?: string
}

interface TapestryDialogProps {
  title: string
  submitText: string
  cancelText?: string
  onClose?: () => unknown
  onCancel: () => unknown
  handleSubmit: (tapestryInfo: TapestryInfo) => Promise<void>
  error?: unknown
  tapestryInfo?: TapestryInfo
  hideSlug?: boolean
}

const DESCRIPTION_PLACEHOLDER = "What's this tapestry about? Mention the main theme or objective"

export function TapestryDialog({
  tapestryInfo: initialTapestryInfo,
  handleSubmit,
  error,
  submitText,
  cancelText = 'Cancel',
  onCancel,
  onClose = onCancel,
  title,
  hideSlug,
}: TapestryDialogProps) {
  const [form] = useState(() => uniqueId('form'))
  const slugManuallyChanged = useRef(!!initialTapestryInfo?.slug)
  const username = useSession().user?.username

  const [tapestryInfo, setTapestryInfo] = useState<Partial<TapestryInfo>>(initialTapestryInfo ?? {})
  const { slug } = tapestryInfo

  return (
    <SimpleModal
      classes={{ root: styles.modal }}
      title={title}
      cancel={{ text: cancelText, onClick: onCancel }}
      confirm={{ text: submitText, form }}
      onClose={onClose}
    >
      <form
        id={form}
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit({
            title: tapestryInfo.title ?? '',
            slug,
            description: tapestryInfo.description,
          })
        }}
      >
        <Input
          label={<Text className={styles.labelText}>Title *</Text>}
          value={tapestryInfo.title ?? ''}
          onChange={(e) => {
            setTapestryInfo((info) => ({
              ...info,
              title: e.target.value,
              slug: slugManuallyChanged.current
                ? info.slug
                : trim(e.target.value.replaceAll(/[^\w-]+/g, '-'), '-'),
            }))
          }}
          name="title"
          error={getErrorMessage(error, 'title')}
          className={styles.input}
          typography="body"
        />
        {!hideSlug && (
          <div>
            <Input
              label={<Text className={styles.labelText}>Slug</Text>}
              value={slug ?? ''}
              onChange={(e) => {
                slugManuallyChanged.current = true
                setTapestryInfo((info) => ({ ...info, slug: e.target.value }))
              }}
              name="slug"
              error={getErrorMessage(error, 'slug', {
                invalid: 'Slug can only include letters, digits, - and _',
              })}
              className={styles.input}
              typography="body"
            />
            {username && slug && (
              <Text
                variant="bodyXs"
                style={{ color: 'var(--theme-text-tertiary)' }}
              >{`Tapestry link: ${location.origin}${tapestryPath(username, slug)}`}</Text>
            )}
          </div>
        )}
        <Textarea
          label={
            <Text className={styles.labelText}>
              Description <span className={styles.optional}>(optional)</span>
            </Text>
          }
          placeholder={DESCRIPTION_PLACEHOLDER}
          value={tapestryInfo.description ?? ''}
          rows={4}
          onChange={(e) => setTapestryInfo((info) => ({ ...info, description: e.target.value }))}
          onSubmit={(e) => (e.target as HTMLTextAreaElement).form?.requestSubmit()}
          typography="body"
        />
        <input type="submit" hidden />
      </form>
    </SimpleModal>
  )
}
