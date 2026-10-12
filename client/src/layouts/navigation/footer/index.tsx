import { Text } from 'tapestry-core-client/src/components/lib/text'
import styles from './styles.module.css'
import LogoWhite from '../../../assets/icons/logo-large-white.svg?react'
import { Link } from 'react-router'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'

export function Footer() {
  return (
    <div className={styles.root}>
      <div className={styles.links}>
        <Link to={'/'} className={styles.logoLink}>
          <SvgIcon Icon={LogoWhite} height={25} />
        </Link>
        <Text component="div" variant="bodyXs">
          <Link to={'/about'}>About</Link>
        </Text>
        <Text
          component="a"
          variant="bodyXs"
          href="https://github.com/asteasolutions/tapestry-project"
          target="_blank"
        >
          GitHub
        </Text>
        <Text component="div" variant="bodyXs">
          Contact
        </Text>
      </div>
      <Text variant="bodyXs">
        Website content available as <strong>CC-BY-NC | Software License</strong>
      </Text>
    </div>
  )
}
