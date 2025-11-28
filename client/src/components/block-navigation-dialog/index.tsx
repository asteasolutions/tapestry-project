import { ReactNode } from 'react'
import { BlockerFn, useNavigationBlock } from '../../hooks/use-navigation-block'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'

interface BlockNavigationDialogProps {
  blockerFn: BlockerFn
  title?: string
  children?: ReactNode
  onLeave?: () => unknown
}

export function BlockNavigationDialog({
  blockerFn,
  title = 'Are you sure?',
  children = <Text>Unsaved changes will be lost.</Text>,
  onLeave,
}: BlockNavigationDialogProps) {
  const blocker = useNavigationBlock(blockerFn)

  return (
    blocker.state === 'blocked' && (
      <SimpleModal
        title={title}
        confirm={{
          onClick: () => {
            onLeave?.()
            blocker.proceed()
          },
        }}
        cancel={{ onClick: () => blocker.reset() }}
      >
        {children}
      </SimpleModal>
    )
  )
}
