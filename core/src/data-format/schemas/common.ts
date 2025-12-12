import z, {
  ZodCoercedNumber,
  ZodDefault,
  ZodLiteral,
  ZodOptional,
  ZodPipe,
  ZodTransform,
  ZodUnion,
} from 'zod/v4'

export const HexColorSchema = z.custom<`#${string}`>(
  (val) => typeof val === 'string' && val.startsWith('#'),
)

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const SizeSchema = z.object({
  width: z.number(),
  height: z.number(),
})

export const RectangleSchema = z.object({
  position: PointSchema,
  size: SizeSchema,
})

export const IdentifiableSchema = z.object({
  id: z.string(),
})

type OptionalNumber = ZodOptional<
  ZodUnion<[ZodPipe<ZodLiteral<''>, ZodTransform<undefined, ''>>, ZodCoercedNumber<unknown>]>
>

type SchemaTransformer = (schema: ZodCoercedNumber<unknown>) => ZodCoercedNumber<unknown>
export function NullishInt(
  defaultValue: number,
  apply?: SchemaTransformer,
): ZodDefault<OptionalNumber>
export function NullishInt(defaultValue?: number, apply?: SchemaTransformer): OptionalNumber
export function NullishInt(
  defaultValue?: number,
  apply?: SchemaTransformer,
): ZodDefault<OptionalNumber> | OptionalNumber {
  const schema = z
    .literal('')
    .transform(() => undefined)
    .or(apply?.(z.coerce.number().int()) ?? z.coerce.number().int())
    .optional()
  if (typeof defaultValue === 'undefined') {
    return schema
  }
  return schema.default(defaultValue)
}

export const Port = (defaultPort: number) =>
  NullishInt(defaultPort, (schema) => schema.min(0).max(65535))

export type HexColor = z.infer<typeof HexColorSchema>
export type Point = z.infer<typeof PointSchema>
export type Size = z.infer<typeof SizeSchema>
export type Rectangle = z.infer<typeof RectangleSchema>
export type Identifiable = z.infer<typeof IdentifiableSchema>
export type Id = Identifiable['id']
