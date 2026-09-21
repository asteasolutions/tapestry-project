import { useState, Fragment } from 'react'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { AUTH_PROVIDERS } from '../../auth/providers-registry'
import styles from './styles.module.css'

export function LoginMenu() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setMenuOpen(true)}>Log in</Button>

      {menuOpen && (
        <SimpleModal
          title="Log in to Tapestries"
          cancel={{ onClick: () => setMenuOpen(false), text: 'Close' }}
        >
          <div className={styles.providerList}>
            {AUTH_PROVIDERS.map((provider, index) => {
              const ProviderComponent = provider.component

              return (
                <Fragment key={provider.id}>
                  {index > 0 && (
                    <div className={styles.divider}>
                      <span>OR</span>
                    </div>
                  )}
                  <div className={styles.providerRow}>
                    <ProviderComponent />
                  </div>
                </Fragment>
              )
            })}
          </div>
        </SimpleModal>
      )}
    </>
  )
}
