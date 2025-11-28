import { useEffect, useState } from 'react'

export const blobUrlToFileMap = new Map<string, File>()

export function useMediaSource(source: Blob | string): string
export function useMediaSource(source: Blob | string | null): string | null
export function useMediaSource(source: Blob | string | null) {
  const [url, setUrl] = useState(() =>
    source instanceof Blob ? URL.createObjectURL(source) : source,
  )

  useEffect(() => {
    let blobUrl: string | null = null
    if (source instanceof Blob) {
      blobUrl = URL.createObjectURL(source)
      setUrl(blobUrl)
      if (source instanceof File) {
        blobUrlToFileMap.set(blobUrl, source)
      }
    } else {
      setUrl(source)
    }
    return () => {
      if (blobUrl) {
        blobUrlToFileMap.delete(blobUrl)
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [source])

  return url
}
