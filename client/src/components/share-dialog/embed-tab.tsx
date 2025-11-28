import clsx from 'clsx'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import { typographyClassName } from 'tapestry-core-client/src/theme/index'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { tapestryPath } from '../../utils/paths'

export interface EmbedTabProps {
  tapestry: TapestryDto
  onMessage: (message: string) => void
}

export function EmbedTab({ tapestry, onMessage }: EmbedTabProps) {
  const embedCode = `<iframe src="${window.origin}${tapestryPath(tapestry.owner!.username, tapestry.slug)}" width="1024" height="768" title="Tapestry ${tapestry.title}" frameborder="0"></iframe>`

  async function copyEmbedCode() {
    await navigator.clipboard.writeText(embedCode)
    onMessage('Embed code copied to clipboard')
  }

  return (
    <>
      <div className={styles.embedHeader}>
        <Text className={styles.embedTitle}>
          <Icon icon="code" /> Embed code
        </Text>
        <Button onClick={copyEmbedCode}>Copy embed code</Button>
      </div>
      <div
        className={clsx(typographyClassName('bodySm'), styles.embedCode)}
        style={{ marginTop: '32px', padding: '16px' }}
      >
        {embedCode}
      </div>
    </>
  )
}
