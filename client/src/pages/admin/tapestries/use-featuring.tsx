import { useState } from 'react'
import { AdminTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { resource } from '../../../services/rest-resources'
import { Notice, NoticeButton } from '../components/notice'
import { ErrorText } from '../components/error-text'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'

interface Outcome {
  text: string
  /** Reverts the change */
  undo?: { tapestry: AdminTapestryDto; featured: boolean }
}

/**
 * Features tapestries and removes them from the Gallery, reporting the outcome with an option to
 * undo it. Only link-shared tapestries can be featured; the server enforces this.
 */
export function useFeaturing(onUpdated: (tapestry: AdminTapestryDto) => unknown) {
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const { trigger, perform, error } = useAsyncAction(
    async (_, tapestry: AdminTapestryDto, featured: boolean, isUndo = false) => {
      try {
        const updated = await resource('adminTapestries').update({ id: tapestry.id }, { featured })
        onUpdated(updated)
        if (isUndo) {
          setOutcome({
            text: featured
              ? `Change undone. “${tapestry.title}” is back in the Gallery, at the top.`
              : 'Change undone.',
          })
        } else {
          setOutcome({
            text: featured
              ? `“${tapestry.title}” is now featured at the top of the Gallery.`
              : `“${tapestry.title}” was removed from the Gallery. It stays shared as “Anyone with the link”.`,
            undo: { tapestry: updated, featured: !featured },
          })
        }
      } catch (e) {
        setOutcome(null)
        throw e
      }
    },
  )

  const notice = error ? (
    <ErrorText error={error} />
  ) : (
    outcome && (
      <Notice
        tone="success"
        onDismiss={() => setOutcome(null)}
        actions={
          outcome.undo && (
            <NoticeButton
              onClick={() => trigger(outcome.undo!.tapestry, outcome.undo!.featured, true)}
            >
              Undo
            </NoticeButton>
          )
        }
      >
        {outcome.text}
      </Notice>
    )
  )

  return {
    feature: (tapestry: AdminTapestryDto) => perform(tapestry, true),
    unfeature: (tapestry: AdminTapestryDto) => perform(tapestry, false),
    notice,
  }
}
