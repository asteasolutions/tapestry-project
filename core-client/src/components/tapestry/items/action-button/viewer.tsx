import clsx from 'clsx'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { ActionButtonItem as ActionButtonItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { useTapestryConfig } from '../..'
import { TRANSPARENT } from '../../../../theme'
import { RichTextEditor, RichTextEditorProps } from '../../../lib/rich-text-editor'
import textItemEditorStyles from '../text/styles.module.css'
import styles from './styles.module.css'

export interface ActionButtonItemViewerProps extends Partial<RichTextEditorProps> {
  id: Id
}

export function ActionButtonItemViewer({
  id,
  style,
  className,
  ...rteProps
}: ActionButtonItemViewerProps) {
  const { useStoreData } = useTapestryConfig()
  const dto = useStoreData(`items.${id}.dto`) as ActionButtonItemDto
  const { interactiveElement } = useStoreData(['interactiveElement'])

  const isInteractiveElement = id === interactiveElement?.modelId

  const backgroundColor = dto.backgroundColor ?? TRANSPARENT

  return (
    <RichTextEditor
      value={dto.text}
      isEditable={false}
      style={{ backgroundColor, ...style }}
      className={clsx(textItemEditorStyles.editor, styles.root, className, {
        [textItemEditorStyles.interactive]: isInteractiveElement,
      })}
      {...rteProps}
    />
  )
}
