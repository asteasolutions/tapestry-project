import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { MAX_FILE_SIZE } from '../../stage/data-transfer-handler'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'

export function LargeFileUploadDialog() {
  const files = useTapestryData('largeFiles')
  const dispatch = useDispatch()

  if (files.length === 0) {
    return null
  }

  const clearLargeFiles = () =>
    dispatch((store) => {
      store.largeFiles = []
    })

  return (
    <SimpleModal
      cancel={{ onClick: clearLargeFiles, text: 'OK', variant: 'primary' }}
      title="Upload limit exceeded"
    >
      <Text>The following files exceed the limit of {MAX_FILE_SIZE / (1000 * 1000)} MB:</Text>
      <ul>
        {files.map((f) => (
          <Text component="li" key={f.name}>
            {f.name}
          </Text>
        ))}
      </ul>
      <Text>
        Consider uploading them in a hosting platform and pasting the link in the tapestry.
      </Text>
    </SimpleModal>
  )
}
