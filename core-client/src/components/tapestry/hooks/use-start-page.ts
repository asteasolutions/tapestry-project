import { useSearchParams } from 'react-router'
import { Id, NullishInt } from 'tapestry-core/src/data-format/schemas/common'

export function useStartPage(id: Id) {
  const [searchParams] = useSearchParams()
  if (id !== searchParams.get('focus')) {
    return undefined
  }

  const page = NullishInt().safeParse(searchParams.get('page')).data

  return page ? page - 1 : page
}
