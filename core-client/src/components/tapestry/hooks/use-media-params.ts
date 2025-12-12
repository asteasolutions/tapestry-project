import { useSearchParams } from 'react-router'
import { Id, NullishInt } from 'tapestry-core/src/data-format/schemas/common'

export interface MediaParams {
  startTime: number | undefined | null
  stopTime: number | undefined | null
  autoplay: boolean | undefined
}

export function useMediaParams(id: Id): MediaParams {
  const [searchParams] = useSearchParams()
  if (id !== searchParams.get('focus')) {
    return { startTime: undefined, stopTime: undefined, autoplay: undefined }
  }

  const autoplay = searchParams.get('autoplay')

  return {
    startTime: NullishInt().safeParse(searchParams.get('startTime')).data,
    stopTime: NullishInt().safeParse(searchParams.get('stopTime')).data,
    autoplay: autoplay === 'true' ? true : autoplay === 'false' ? false : undefined,
  }
}
