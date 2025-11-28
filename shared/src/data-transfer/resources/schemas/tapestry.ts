import z from 'zod/v4'
import { ItemCreateInTapestrySchema, ItemSchema } from './item.js'
import { RelCreateInTapestrySchema, RelSchema } from './rel.js'
import { BaseResourceSchema, trimString } from './common.js'
import { PublicUserProfileSchema } from './user.js'
import { baseResourcePropsMask } from '../types.js'
import { TapestryAccessSchema } from './tapestry-access.js'
import { GroupSchema } from './group.js'
import { TapestrySchema as BaseTapestrySchema } from 'tapestry-core/src/data-format/schemas/tapestry.js'

export const slugRegex = /^[a-zA-Z0-9_-]*$/g

export const TapestrySchema = z
  .object({
    ...BaseResourceSchema.shape,
    ...BaseTapestrySchema.omit({ items: true, rels: true, groups: true }).shape,
    ownerId: z.string().describe('The ID of the owner of this tapestry.'),
    owner: PublicUserProfileSchema.nullish().describe(
      'The public profile of the owner of this tapestry, if included.',
    ),
    items: ItemSchema.array().nullish().describe('The list of items in this tapestry.'),
    rels: RelSchema.array()
      .nullish()
      .describe('The list of rels, i.e. relations between items in the tapestry.'),
    groups: GroupSchema.array().nullish().describe('The list of item groups in the tapestry.'),
    visibility: z
      .enum(['private', 'link', 'public'])
      .describe(
        'The visibility of this tapestry. "private" means that only the owner and personally invited collaborators ' +
          'can see the tapestry. "link" means that anyone with the link can view it. "public" means that the tapestry ' +
          'will be publicly listed, searchable, and viewable by anyone. None of these visibility levels provides edit ' +
          'access to tapestry on its own. Edit access can be granted only via an invitation.',
      ),
    slug: z
      .preprocess(trimString, z.string().regex(slugRegex))
      .describe(
        'A string that serves as s user-friendly identifier for this tapestry. Typically used to form the tapestry URL.',
      ),
    parentId: z
      .string()
      .nullish()
      .describe(
        'The ID of the parent tapestry in case this tapestry was created by forking (cloning) another one.',
      ),
    userAccess: TapestryAccessSchema.omit({ tapestryId: true })
      .array()
      .nullish()
      .describe(
        'A list of personally invited users and their permissions to access this tapestry.',
      ),
    allowForking: z
      .boolean()
      .describe('Whether users with only view access can fork and export the tapestry'),
  })
  .describe(
    'A Tapestry is a digital format describing an endless canvas that hosts a variety of interconnected ' +
      'multimedia items. Authors can create tapestries on various topics and share them with other users to view and ' +
      'comment. The items that can be included in a tapestry can be HTML-formatted text frames, embedded webpages, ' +
      'images, audio, video, and others. Tapestry items can be connected with arrows, a.k.a. "rels".',
  )

export const TapestryCreateSchema = TapestrySchema.omit({
  ...baseResourcePropsMask,
  ownerId: true,
  owner: true,
  userAccess: true,
  allowForking: true,
})
  .extend({
    items: ItemCreateInTapestrySchema.array(),
    rels: RelCreateInTapestrySchema.array(),
    ...TapestrySchema.pick({ allowForking: true, slug: true }).partial().shape,
  })
  .describe(
    'Creation parameters for a tapestry. A tapestry can be created along with all its items and relations. ' +
      'Alternatively, items and rels arrays can be empty and can be added to the tapestry afterwards.',
  )

export const TapestryUpdateSchema = TapestrySchema.omit({
  ...baseResourcePropsMask,
  parentId: true,
  ownerId: true,
  owner: true,
  rels: true,
  items: true,
  groups: true,
  userAccess: true,
})
  .partial()
  .describe('Parameters used to modify an existing tapestry.')
