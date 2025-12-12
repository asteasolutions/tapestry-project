import { useCallback, useState } from 'react'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useSession } from '../../layouts/session'
import { LoadingDots } from '../loading-dots'
import { LazyListLoader, LazyListRequestItems } from '../lazy-list/lazy-list-loader'
import {
  AIChatMessageDto,
  AIChatMessageState,
} from 'tapestry-shared/src/data-transfer/resources/dtos/ai-chat'
import { resource } from '../../services/rest-resources'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { LazyList } from '../lazy-list'
import { AIChatMessage } from './ai-chat-message'
import { ListParamsInputDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import DOMPurify from 'dompurify'
import { MessageInput } from '../message-input'
import { subSeconds } from 'date-fns'
import { LoadingLogoIcon } from '../loading-logo-icon'
import { APIError } from '../../errors'
import { Button, IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { ApiKeyDialog } from '../../pages/user-profile/api-key-dialog'
import { noop } from 'lodash-es'
import { Link } from 'react-router'
import { config } from '../../config'
import { useItemPicker } from '../item-picker/use-item-picker'
import clsx from 'clsx'
import { Tooltip } from 'tapestry-core-client/src/components/lib/tooltip/index'
import { userProfilePath } from '../../utils/paths'

export interface AIChatProps {
  tapestryId?: string
  canAttachItems?: boolean
  onPickingItems?: (isPicking: boolean, pickedCount?: number) => void
}

async function obtainActiveAIChat(userId: string, tapestryId?: string, signal?: AbortSignal) {
  const filter: ListParamsInputDto['filter'] = { 'userId:eq': userId }
  if (tapestryId) {
    filter['tapestryId:eq'] = tapestryId
  } else {
    filter['tapestryId:isnull'] = 'true'
  }

  const { data: activeChats } = await resource('aiChats').list(
    {
      filter: {
        ...filter,
        'lastMessageAt:gt': subSeconds(new Date(), config.aiChatExpiresIn).toISOString(),
      },
      orderBy: '-lastMessageAt',
      limit: 1,
    },
    { signal },
  )

  if (activeChats.length > 0) {
    return activeChats[0]
  }

  const { data: emptyChats } = await resource('aiChats').list(
    {
      filter: { ...filter, 'lastMessageAt:isnull': 'true' },
      orderBy: '-createdAt',
      limit: 1,
    },
    { signal },
  )

  if (emptyChats.length > 0) {
    return emptyChats[0]
  }

  return resource('aiChats').create({
    aiProvider: 'google',
    aiModel: 'gemini-2.0-flash',
    tapestryId,
  })
}

function AIChatError({
  error,
  onAddApiKey,
}: {
  error: NonNullable<unknown>
  onAddApiKey: (withGuide: boolean) => void
}) {
  return error instanceof APIError && error.data.name === 'ConflictError' ? (
    <div className={styles.missingApiKeyContainer}>
      <Icon icon="api" className={styles.apiIcon} />
      <Text variant="h6" className={styles.missingApiKeyMessage}>
        API Key required
      </Text>
      <Text variant="bodySm">
        You can find your Gemini API key
        <br />
        in Google AI studio.
      </Text>
      <Button icon="add" className={styles.addApiKeyButton} onClick={() => onAddApiKey(false)}>
        Add API Key
      </Button>
      <Button variant="link" onClick={() => onAddApiKey(true)}>
        Need help?
      </Button>
    </div>
  ) : (
    <Text component="p" variant="bodySm" className={styles.emptyPlaceholder}>
      Can't initiate chat. Please try again later.
    </Text>
  )
}

export function AIChat({ tapestryId, canAttachItems, onPickingItems }: AIChatProps) {
  const { user } = useSession()
  const [lastUserMessageState, setLastUserMessageState] = useState<AIChatMessageState | undefined>()
  const [isAddingApiKey, setIsAddingApiKey] = useState<'guide' | 'input'>()
  const [attachedItemIds, setAttachedItemIds] = useState<string[]>([])
  const itemPicker = useItemPicker({
    onItemsChanged: setAttachedItemIds,
    onClose: () => onPickingItems?.(false, attachedItemIds.length),
  })

  const {
    data: aiChat,
    loading,
    error,
    reload,
  } = useAsync(
    async ({ signal }) => user?.id && obtainActiveAIChat(user.id, tapestryId, signal),
    [tapestryId, user?.id],
  )

  const [messageLoader, setMessageLoader] = useState<LazyListLoader<AIChatMessageDto> | null>()
  const loadMessages = useCallback<LazyListRequestItems<AIChatMessageDto>>(
    async (skip, limit, signal) => {
      if (!aiChat) return { data: [], skip: 0, total: 0 }

      const messages = await resource('aiChatMessages').list(
        {
          filter: { 'chatId:eq': aiChat.id },
          orderBy: '-createdAt',
          skip,
          limit,
          include: ['attachments'],
        },
        { signal },
      )

      if (messages.skip === 0) {
        const lastUserMessage = messages.data.find((msg) => msg.role === 'user')
        setLastUserMessageState(lastUserMessage?.state)
      }

      return messages
    },
    [aiChat],
  )

  const submitPrompt = async (content: string) => {
    if (!aiChat) return

    await resource('aiChatMessages').create({
      chatId: aiChat.id,
      content,
      attachments: attachedItemIds.map((itemId) => ({ type: 'item', itemId })),
    })
    setAttachedItemIds([])
    void messageLoader?.reload()
  }

  return (
    <div className={clsx(styles.root, { [styles.hidden]: itemPicker.isOpen })}>
      {!!error && (
        <AIChatError
          error={error}
          onAddApiKey={(withGuide) => setIsAddingApiKey(withGuide ? 'guide' : 'input')}
        />
      )}
      {loading && <LoadingLogoIcon />}
      <div className={styles.chat}>
        {aiChat && user ? (
          <LazyList
            reversed
            key={aiChat.id}
            // TODO: WebSocket
            autoReload={2_000}
            onLoaderInitialized={setMessageLoader}
            requestItems={loadMessages}
            renderItem={(message) => <AIChatMessage message={message} user={user} />}
            emptyPlaceholder={
              <>
                <Text component="div" variant="h5" className={styles.greetingColored}>
                  Hello, {user.givenName}
                </Text>
                <Text component="div" variant="h5" className={styles.greeting}>
                  How can I help you today?
                </Text>
              </>
            }
            loadingIndicator={<LoadingLogoIcon className={styles.listLoadingIndicator} />}
          />
        ) : (
          <div />
        )}
        {lastUserMessageState === 'pending' && <LoadingDots />}
        {lastUserMessageState === 'error' && (
          <Text variant="bodyXs" className={styles.errorMessage}>
            Your message could not be processed. <br />
            Please make sure{' '}
            <Link to={userProfilePath('ai-assistants')} target="_blank">
              you have a valid API key
            </Link>{' '}
            and try again.
          </Text>
        )}
        <div className={styles.inputWrapper}>
          <MessageInput
            className={styles.input}
            disabled={!aiChat || lastUserMessageState === 'pending'}
            placeholder={lastUserMessageState === 'pending' ? 'Waiting for reply...' : 'Ask AI'}
            signInButtonText="Sign in to chat"
            onSubmit={submitPrompt}
            onPaste={(clipboardData) => {
              const html = clipboardData.getData('text/html')
              if (html) {
                return DOMPurify.sanitize(html, {
                  ALLOWED_TAGS: ['a', 'img', 'audio', 'video', 'source'],
                  ALLOWED_ATTR: ['href', 'src', 'alt'],
                })
              }
            }}
            startAdornment={
              attachedItemIds.length > 0 ? (
                <Text component="div" variant="bodySm" className={styles.attachedItemsIndicator}>
                  {attachedItemIds.length}
                  <Tooltip side="bottom">
                    <Text variant="bodyXs">
                      {attachedItemIds.length} item{attachedItemIds.length > 1 ? 's' : ''} attached
                    </Text>
                  </Tooltip>
                </Text>
              ) : null
            }
            endAdornment={
              canAttachItems && (
                <IconButton
                  icon="left_click"
                  aria-label="Attach items"
                  tooltip={{ side: 'bottom', children: 'Attach items' }}
                  onClick={() => {
                    itemPicker.open(attachedItemIds)
                    onPickingItems?.(true)
                  }}
                />
              )
            }
          />
        </div>
      </div>
      {user && isAddingApiKey && (
        <ApiKeyDialog
          user={user}
          onClose={() => setIsAddingApiKey(undefined)}
          onSubmitted={() => {
            setIsAddingApiKey(undefined)
            reload(noop)
          }}
          showGuide={isAddingApiKey === 'guide'}
        />
      )}
      {itemPicker.ui}
    </div>
  )
}
