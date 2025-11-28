import { ResourceRepo, ResourceRepoOptions } from '../../../utils/resource-repo'
import { resource } from '../../../services/rest-resources'
import { CommentThreadsDto } from 'tapestry-shared/src/data-transfer/resources/dtos/comment-threads'

export interface CommentThreadsRepoTypeMap {
  commentThreads: {
    resource: CommentThreadsDto
    createParams: never
    updateParams: never
  }
}

export class CommentThreadsRepo extends ResourceRepo<'commentThreads', CommentThreadsRepoTypeMap> {
  constructor(
    private tapestryId: string,
    options?: ResourceRepoOptions,
  ) {
    super(['commentThreads'], options)
  }

  protected async fetch(
    _ids?: Record<'commentThreads', string[] | true> | null,
    signal?: AbortSignal,
  ) {
    const threads = await resource('commentThreads').read({ id: this.tapestryId }, {}, { signal })

    return { commentThreads: [threads] }
  }
}
