import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import WikimediaLogo from '../../assets/icons/wikimedia-logo.svg?react'
import styles from './styles.module.css'
import { startWikimediaLogin } from './service'

export function WikimediaLoginButton() {
  return (
    <Button className={styles.wikimediaButton} variant="outline" onClick={startWikimediaLogin}>
      <SvgIcon Icon={WikimediaLogo} size={20} />
      <Text>Continue with Wikimedia</Text>
    </Button>
  )
}
