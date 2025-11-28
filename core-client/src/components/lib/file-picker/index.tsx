import { ReactNode, useCallback, useRef } from 'react'
import { ClickableContext } from '../buttons/clickable-context.js'

export type FilePickerProps = {
  accept: HTMLInputElement['accept']
  children: ReactNode
} & (
  | {
      multiple: true
      onChange: (file: File[]) => unknown
    }
  | {
      multiple?: false
      onChange: (file: File) => unknown
    }
)

export function FilePicker({ onChange, accept, multiple, children }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const click = useCallback(() => {
    if (inputRef.current) {
      // This input is used as an uncontrolled component - we only use it for the file dialog -
      // and we only care about the onChange event when a file is selected.
      // To ensure that onChange will fire every time, even when the same file has been selected
      // twice in a row, we clear the current value each time the dialog is opened.
      inputRef.current.value = ''
      inputRef.current.click()
    }
  }, [])

  return (
    <>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={(event) => {
          const files = event.target.files

          if (!files || files.length === 0) {
            return
          }

          if (multiple) {
            onChange(Array.from(files))
          } else {
            onChange(files[0])
          }
        }}
      />
      <ClickableContext value={{ click }}>{children}</ClickableContext>
    </>
  )
}
