import { Prisma, User } from '@prisma/client'
import { prisma } from '../db.js'
import { faker } from '@faker-js/faker'
import { camelCase, set, times } from 'lodash-es'

const PRIMITIVE_GENERATORS = new Map<string, (name: string) => unknown>([
  ['BigInt', () => faker.number.bigInt()],
  ['Boolean', () => faker.datatype.boolean()],
  ['DateTime', () => faker.date.recent()],
  ['Decimal', () => faker.number.float()],
  ['Float', () => faker.number.float()],
  ['Int', () => faker.number.int({ min: -1000, max: 1000 })],
  ['JSON', () => ({})],
  [
    'String',
    (name) =>
      /^(given|first)?name$/i.test(name)
        ? faker.person.firstName()
        : /^(family|last)?name$/i.test(name)
          ? faker.person.lastName()
          : /email/i.test(name)
            ? faker.internet.email()
            : faker.string.ulid(),
  ],
])

export function generate<M extends Prisma.ModelName>(
  modelName: M,
  overloads?: Partial<Prisma.TypeMap['model'][M]['operations']['create']['args']['data']>,
): Promise<ReturnType<(typeof prisma)[Uncapitalize<M>]['create']>> {
  const payload = { ...overloads }
  const model = Prisma.dmmf.datamodel.models.find((model) => model.name === modelName)

  if (!model) throw new Error(`Unknown model ${modelName}`)

  for (const field of model.fields) {
    if (field.isRequired && !field.isGenerated && !field.isId && !(field.name in payload)) {
      const generator = PRIMITIVE_GENERATORS.get(field.type)
      if (generator) {
        set(payload, field.name, generator(field.name))
      } else {
        const enumModel = Prisma.dmmf.datamodel.enums.find((e) => e.name === field.type)
        if (enumModel) {
          set(payload, field.name, faker.helpers.arrayElement(enumModel.values).name)
        }
      }
    }
  }

  const delegateName = camelCase(modelName) as Uncapitalize<M>
  // eslint-disable-next-line
  return (prisma[delegateName] as any).create({ data: payload })
}

export async function generateTapestry(owner?: User) {
  owner ??= await generate('User')
  const tapestry = await generate('Tapestry', { ownerId: owner.id })
  const items = await Promise.all(
    times(3, () =>
      generate('Item', {
        tapestryId: tapestry.id,
        type: 'image',
        source: `https://sample.com/${faker.string.alpha()}`,
      }),
    ),
  )
  const rels = await Promise.all(
    times(3, () => {
      const [from, to] = faker.helpers.arrayElements(items, 2)
      return generate('Rel', {
        fromItemId: from.id,
        toItemId: to.id,
        tapestryId: tapestry.id,
      })
    }),
  )

  return { owner, tapestry, items, rels }
}

export async function seedDb() {
  const { owner, tapestry, items, rels } = await generateTapestry()
  const author = await generate('User')
  await generate('TapestryAccess', {
    canEdit: true,
    tapestryId: tapestry.id,
    userId: author.id,
  })
  const viewer = await generate('User')
  return { owner, tapestry, items, rels, author, viewer }
}

export async function truncateDb() {
  await prisma.tapestryAccess.deleteMany()
  await prisma.tapestryInvitation.deleteMany()
  await prisma.rel.deleteMany()
  await prisma.item.deleteMany()
  await prisma.tapestry.deleteMany()
  await prisma.user.deleteMany()

  await prisma.$disconnect()
}
