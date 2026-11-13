import { useState } from 'react'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { itemUpload } from '../../../services/item-upload'
import { ProgressBar } from '..'

export function ItemUploadProgressBar() {
  const uploads = useObservable(itemUpload)
  const [batch, setBatch] = useState<string[]>([])
  const [dismissed, setDismissed] = useState(false)

  const active = uploads.filter((item) => item.state === 'pending' || item.state === 'uploading')

  const newUrls = active.map((item) => item.objectUrl).filter((url) => !batch.includes(url))
  if (newUrls.length > 0) {
    setBatch([...batch, ...newUrls])
    setDismissed(false)
  } else if (active.length === 0 && batch.length > 0) {
    setBatch([])
  }

  const batchUploads = uploads.filter((item) => batch.includes(item.objectUrl))
  if (active.length === 0 || batchUploads.length === 0 || dismissed) {
    return null
  }

  const finished = batchUploads.filter(
    (item) => item.state === 'completed' || item.state === 'failed',
  )

  const current = Math.min(finished.length + 1, batchUploads.length)
  const progress =
    batchUploads.reduce(
      (sum, item) =>
        sum + (item.state === 'completed' || item.state === 'failed' ? 1 : (item.progress ?? 0)),
      0,
    ) / batchUploads.length

  return (
    <ProgressBar
      label={`Importing file ${current} of ${batchUploads.length} |`}
      percent={progress * 100}
      onCancel={() => itemUpload.cancel()}
      onDismiss={() => setDismissed(true)}
      dismissLabel="Hide"
      dismissTooltip="Hide (upload continues)"
    />
  )
}
