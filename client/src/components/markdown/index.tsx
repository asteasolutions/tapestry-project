import { parse } from 'marked'
import DOMPurify from 'dompurify'
import { HTMLAttributes, useMemo } from 'react'

export interface MarkdownProps extends HTMLAttributes<HTMLDivElement> {
  children?: string
}

export function Markdown({ children, ...props }: MarkdownProps) {
  const html = useMemo(
    () =>
      DOMPurify.sanitize(
        parse(children?.replace(/^[\u200B-\u200F\uFEFF]/, '') ?? '', { async: false }),
      ),
    [children],
  )

  return <div {...props} dangerouslySetInnerHTML={{ __html: html }} />
}
