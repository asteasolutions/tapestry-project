import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import ORCIDLogo from '../../assets/icons/orcid-logo-circle-green.svg?react'
import { startOrcidLogin } from './service'
import styles from './styles.module.css'

export function OrcidLoginButton() {
  return (
    <Button className={styles.orcidButton} variant="outline" onClick={startOrcidLogin}>
      <SvgIcon Icon={ORCIDLogo} size={20} />
      <Text>Continue with ORCID</Text>
    </Button>
  )
}
