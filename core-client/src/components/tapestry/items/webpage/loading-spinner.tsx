import clsx from 'clsx'
import React from 'react'
import { useTapestryConfig } from '../..'
import LoadingLogoSpinner from '../../../../assets/gifs/loading-logo-spinner.gif'
import { getItemOverlayScale } from '../../../../view-model/utils'
import styles from './styles.module.css'

interface WebpageLoadingSpinnerProps {
  itemId: string
  className?: string
}

export function WebpageLoadingSpinner({ itemId, className }: WebpageLoadingSpinnerProps) {
  const { useStoreData } = useTapestryConfig()
  const itemSize = useStoreData(`items.${itemId}.dto.size`)!
  const scale = getItemOverlayScale(itemSize)

  return (
    <div className={clsx(styles.loadingSpinner, className)}>
      <img
        className={styles.loading}
        src={LoadingLogoSpinner}
        style={{ '--scale': scale } as React.CSSProperties}
      />
    </div>
  )
}
