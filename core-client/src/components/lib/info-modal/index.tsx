import './styles.module.css'
import { Modal } from '../modal/index'
import { Text, TextProps } from '../text/index'
import { Fragment } from 'react/jsx-runtime'
import { PropsWithChildren } from 'react'

export interface InfoModalProps extends PropsWithChildren {
  info: Map<string, TextProps<'span'>>
  onClose: () => unknown
}

export function InfoModal({ onClose, info, children }: InfoModalProps) {
  return (
    <Modal title="Info" onClose={onClose}>
      <div className="info-modal-table">
        {[...info].map(([key, value]) => (
          <Fragment key={key}>
            <Text variant="bodySm" className="info-modal-key">
              {key}:
            </Text>
            <Text variant="bodySm" className="info-modal-value" {...value} />
          </Fragment>
        ))}
        {children}
      </div>
    </Modal>
  )
}
