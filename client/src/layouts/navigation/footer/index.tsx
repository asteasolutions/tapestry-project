import { Text } from 'tapestry-core-client/src/components/lib/text'
import styles from './styles.module.css'
import LogoWhite from '../../../assets/icons/logo-large-white.svg?react'
import { Link } from 'react-router'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

export function Footer() {
  const breakpoint = useResponsive()
  const mdOrLess = breakpoint <= Breakpoint.MD
  const xsOrLess = breakpoint <= Breakpoint.XS

  return (
    <div className={styles.root}>
      <div className={styles.links}>
        {xsOrLess ? null : (
          <Link to={'/'} className={styles.logoLink}>
            <SvgIcon Icon={LogoWhite} height={25} />
          </Link>
        )}
        <Text component="div" variant="bodySm">
          <Link to={'/about'}>About</Link>
        </Text>
        <Text
          component="a"
          variant="bodySm"
          href="https://github.com/asteasolutions/tapestry-project"
          target="_blank"
        >
          GitHub
        </Text>
        <Text variant="bodySm" component="a" href="mailto:tapestries@awmt.org">
          Contact
        </Text>
      </div>
      {mdOrLess ? null : (
        <Text variant="bodySm">
          Website content available as <strong>CC-BY-NC | Software License</strong>
        </Text>
      )}
    </div>
  )
}
