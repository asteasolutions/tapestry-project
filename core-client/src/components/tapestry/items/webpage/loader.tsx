import { ReactNode, useEffect, useState } from 'react'
import { WebpageItem as WebpageItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { usePropRef } from '../../../lib/hooks/use-prop-ref'
import { WebpageLoadingSpinner } from './loading-spinner'
import { WebpagePlaceholder } from './placeholder'
import styles from './styles.module.css'

export interface WebpageLoaderProps {
  children: ReactNode
  item: WebpageItemDto
  displayPage: boolean | undefined
  pageLoading: boolean
  timeout?: number
}

export function WebpageLoader({
  children,
  item,
  displayPage,
  pageLoading,
  timeout = 3,
}: WebpageLoaderProps) {
  const [initialLoad, setInitialLoad] = useState(false)
  const timeoutRef = usePropRef(timeout)

  useEffect(() => {
    let timeoutId: number | undefined
    if (displayPage) {
      setInitialLoad(true)
      timeoutId = window.setTimeout(() => setInitialLoad(false), timeoutRef.current * 1000)
    }
    return () => clearTimeout(timeoutId)
  }, [displayPage, timeoutRef])

  const showSpinner = pageLoading && initialLoad

  return (
    <>
      <div className={styles.loader}>
        {displayPage ? children : <WebpagePlaceholder item={item} />}
      </div>
      {showSpinner && <WebpageLoadingSpinner itemId={item.id} />}
    </>
  )
}
