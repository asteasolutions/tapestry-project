import { intlFormat } from 'date-fns'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import GeminiIcon from '../../../assets/icons/gemini.svg?react'
import clsx from 'clsx'
import { Avatar } from '../../avatar'
import styles from './styles.module.css'
import { typographyClassName } from 'tapestry-core-client/src/theme/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { AIChatMessageDto } from 'tapestry-shared/src/data-transfer/resources/dtos/ai-chat'
import { Tooltip } from 'tapestry-core-client/src/components/lib/tooltip/index'
import { Markdown } from '../../markdown'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'

interface AIChatMessageProps {
  message: AIChatMessageDto
  user: UserDto
}

export function AIChatMessage({ message, user }: AIChatMessageProps) {
  const content = (
    <Text component={Markdown} variant="bodySm" className={styles.messageText}>
      {message.content}
    </Text>
  )
  return (
    <div>
      <div className={clsx(styles.messageHeader, typographyClassName('bodyXs'))}>
        {message.role === 'user' ? (
          <Avatar size="small" user={user} />
        ) : (
          /** TODO: Icon should also be parametrized when we allow using AI models other than Gemini */
          <SvgIcon Icon={GeminiIcon} size={24} />
        )}
        <span className={styles.messageAuthor}>
          {message.role === 'user' ? `${user.givenName} ${user.familyName}` : 'Assistant'}
        </span>
        <span style={{ flex: 1 }} />
        {message.state === 'error' && (
          <div style={{ position: 'relative' }}>
            <Icon className={styles.errorIndicator} icon="error" />
            <Tooltip side="left" offset={8}>
              This message could not be processed
            </Tooltip>
          </div>
        )}
        <span className={styles.messageDate}>
          {intlFormat(message.createdAt, {
            hour: 'numeric',
            minute: 'numeric',
          })}
        </span>
      </div>
      {(message.attachments?.length ?? 0) > 0 ? (
        <div className={styles.messageWithAttachmentsWrapper}>
          <div className={styles.attachmentsWrapper}>
            <Icon icon="draft" className={styles.attachmentsIcon} />
            <Text variant="bodyXs">
              {message.attachments!.length}{' '}
              {message.attachments!.length > 1 ? 'items have' : 'item has'} been attached
            </Text>
          </div>
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  )
}
