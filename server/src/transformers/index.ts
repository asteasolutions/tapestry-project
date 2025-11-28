import { Prisma } from '@prisma/client'
import { GetResult } from '@prisma/client/runtime/library'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry.js'
import {
  UserDto,
  PublicUserProfileDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/user.js'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item.js'
import { RelDto } from 'tapestry-shared/src/data-transfer/resources/dtos/rel.js'
import { CommentDto } from 'tapestry-shared/src/data-transfer/resources/dtos/comment.js'
import { TapestryAccessDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-access.js'
import { TapestryInvitationDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-invitation.js'
import { TapestryCreateJobDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-create-job.js'
import { userDbToDto } from './user.js'
import { tapestryDbToDto } from './tapestry.js'
import { get, identity, set, pick } from 'lodash-es'
import { itemDbToDto } from './item.js'
import { relDbToDto } from './rel.js'
import { commentDbToDto } from './comment.js'
import { TapestryInteractionDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-interaction.js'
import {
  AIChatDto,
  AIChatMessageAttachmentDto,
  AIChatMessageDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/ai-chat.js'
import { GroupDto } from 'tapestry-shared/src/data-transfer/resources/dtos/group.js'
import { PresentationStepDto } from 'tapestry-shared/src/data-transfer/resources/dtos/presentation-step.js'
import { presentationStepDbToDto } from './presentation-steps.js'
import { OneOrMore } from 'tapestry-core/src/utils.js'
import { UserSecretDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user-secret.js'
import { TapestryBookmarkDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-bookmark.js'
import { userToPublicProfileDto } from 'tapestry-shared/src/utils.js'

interface DtoMap {
  Tapestry: { default: TapestryDto }
  Item: { default: ItemDto }
  Rel: { default: RelDto }
  Comment: { default: CommentDto }
  User: {
    default: UserDto
    publicProfile: PublicUserProfileDto
  }
  TapestryAccess: { default: TapestryAccessDto }
  TapestryInvitation: { default: TapestryInvitationDto }
  TapestryCreateJob: { default: TapestryCreateJobDto }
  TapestryInteraction: { default: TapestryInteractionDto }
  AiChat: { default: AIChatDto }
  AiChatMessage: { default: AIChatMessageDto }
  AiChatMessageAttachment: { default: AIChatMessageAttachmentDto }
  Group: { default: GroupDto }
  PresentationStep: { default: PresentationStepDto }
  UserSecret: { default: UserSecretDto }
  TapestryBookmark: { default: TapestryBookmarkDto }
}

type ModelSerializer<M extends Prisma.ModelName, V extends keyof DtoMap[M]> = (
  model: GetResult<Prisma.TypeMap['model'][M]['payload'], null>,
) => Promise<DtoMap[M][V]>

type ViewSerializerMap<M extends Prisma.ModelName> = {
  [V in keyof DtoMap[M]]: ModelSerializer<M, V>
}

type ModelSerializersMap = {
  [M in Prisma.ModelName]: ViewSerializerMap<M>
}

const MODEL_SERIALIZERS: ModelSerializersMap = {
  User: {
    default: userDbToDto,
    publicProfile: (user) => Promise.resolve(userToPublicProfileDto(user)),
  },
  Tapestry: { default: tapestryDbToDto },
  TapestryAccess: { default: identity },
  TapestryInvitation: { default: identity },
  Item: { default: itemDbToDto },
  Rel: { default: relDbToDto },
  Comment: { default: commentDbToDto },
  TapestryCreateJob: { default: identity },
  TapestryInteraction: { default: identity },
  AiChat: { default: identity },
  AiChatMessage: { default: identity },
  AiChatMessageAttachment: {
    default: (attachment) => Promise.resolve(pick(attachment, ['type', 'itemId'])),
  },
  Group: { default: identity },
  PresentationStep: { default: presentationStepDbToDto },
  UserSecret: { default: identity },
  TapestryBookmark: { default: identity },
}

type RelationViews = {
  [M in Prisma.ModelName]?: Record<string, keyof DtoMap[M]>
}

const RELATION_VIEWS: RelationViews = {
  User: {
    CommentToUser: 'publicProfile',
    TapestryToUser: 'publicProfile',
    TapestryAccessToUser: 'publicProfile',
    AiChatToUser: 'publicProfile',
  },
}

export async function serialize<M extends Prisma.ModelName, V extends keyof DtoMap[M] = 'default'>(
  modelName: M,
  instances: Parameters<ModelSerializer<M, V>>[0][],
  view?: V,
): Promise<Awaited<ReturnType<ModelSerializer<M, V>>>[]>
export async function serialize<M extends Prisma.ModelName, V extends keyof DtoMap[M] = 'default'>(
  modelName: M,
  instance: Parameters<ModelSerializer<M, V>>[0],
  view?: V,
): ReturnType<ModelSerializer<M, V>>
export async function serialize<M extends Prisma.ModelName, V extends keyof DtoMap[M] = 'default'>(
  modelName: M,
  instance: OneOrMore<Parameters<ModelSerializer<M, V>>[0]>,
  view?: V,
) {
  if (Array.isArray(instance)) {
    return Promise.all(instance.map((i) => serialize(modelName, i, view)))
  }
  const serializer = MODEL_SERIALIZERS[modelName][view ?? 'default']
  const dto = (await serializer(instance)) as DtoMap[M][V]

  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName)!
  const relations = model.fields.filter((f) => f.kind === 'object' && f.type in MODEL_SERIALIZERS)
  // We operate under the assumption that relations in the database have the same
  // names as relations in DTOs. If this were not true, we would have to implement
  // some mapping between them.
  for (const relation of relations) {
    // It is difficult to obtain the static type of the relation at this point. Even if we passed
    // some generics along the way to specify the exact type of the `include` parameters in Prisma
    // so that we know which relations have been loaded, their actual input would come from an HTTP
    // request (in most cases) and it would not be possible to infer the generics from there.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const related = get(instance, relation.name)
    if (!related) continue

    let relatedDto: unknown
    const relatedModelName = relation.type as Prisma.ModelName
    const relatedView = get(RELATION_VIEWS[relatedModelName], relation.relationName ?? '')
    if (Array.isArray(related)) {
      relatedDto = await Promise.all(
        // @ts-expect-error The type of relatedView cannot be inferred properly here
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        related.map((r) => serialize(relatedModelName, r, relatedView)),
      )
    } else {
      // @ts-expect-error The type of relatedView cannot be inferred properly here
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      relatedDto = await serialize(relatedModelName, related, relatedView)
    }

    set(dto as object, relation.name, relatedDto)
  }

  return dto
}
