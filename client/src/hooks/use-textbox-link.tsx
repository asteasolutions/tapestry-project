import { RefObject, useState } from 'react'
import { RichTextEditorApi } from 'tapestry-core-client/src/components/lib/rich-text-editor'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { extractAction } from '../components/assign-action-button'
import { LinkActionModal } from '../components/link-action-modal'
import { AddLinkModal } from '../components/add-link-modal'

interface LinkModalState {
  mode: 'action' | 'edit'
  initialText?: string
  initialLink?: string
}

interface UseTextboxLinkProps {
  editorAPI: RefObject<RichTextEditorApi | undefined>
  tapestryId: Id
  tapestryPath: string
  isEditable: boolean
  onLinkApplied?: () => void
}

export function useTextboxLink({
  editorAPI,
  tapestryId,
  tapestryPath,
  isEditable,
  onLinkApplied,
}: UseTextboxLinkProps) {
  const [linkModal, setLinkModal] = useState<LinkModalState>()

  function addLink() {
    const editor = editorAPI.current?.editor()
    if (linkModal || !editor || !isEditable) {
      return
    }

    const existingLink = editor.getAttributes('link').href as string | undefined
    const initialLink = existingLink?.startsWith('?')
      ? `${window.location.origin}${tapestryPath}${existingLink}`
      : existingLink

    const selectionText = editorAPI.current?.selectionText()
    const trimmedSelectionText = selectionText?.trim()

    setLinkModal({
      mode: existingLink ? 'action' : 'edit',
      initialText:
        trimmedSelectionText && trimmedSelectionText !== initialLink ? selectionText : undefined,
      initialLink,
    })
  }

  function close() {
    setLinkModal(undefined)
  }

  function applyLink(url: string, text?: string) {
    const editor = editorAPI.current?.editor()
    if (!editor) {
      return
    }

    const { action, actionType } = extractAction(url, tapestryPath, tapestryId)
    if (!action) {
      return
    }

    const href = actionType === 'internalLink' ? `?${action}` : url
    const linkTextFinal = text?.trim() || url
    const { from } = editor.state.selection

    editor
      .chain()
      .focus()
      .insertContent(linkTextFinal)
      .setTextSelection({ from, to: from + linkTextFinal.length })
      .command(({ commands }) => commands.setLink({ href }))
      .setTextSelection(from + linkTextFinal.length)
      .run()

    onLinkApplied?.()
    close()
  }

  const ui =
    linkModal?.mode === 'action' && linkModal.initialLink ? (
      <LinkActionModal
        link={linkModal.initialLink}
        onClose={close}
        onEdit={() => setLinkModal({ ...linkModal, mode: 'edit' })}
        onDelete={() => {
          editorAPI.current?.editor().commands.unsetLink()
          close()
        }}
      />
    ) : linkModal?.mode === 'edit' ? (
      <AddLinkModal
        initialText={linkModal.initialText}
        initialLink={linkModal.initialLink}
        showTextField
        onClose={close}
        onApply={applyLink}
      />
    ) : null

  return {
    addLink,
    closeLinkModal: close,
    addingLink: !!linkModal,
    ui,
  }
}
