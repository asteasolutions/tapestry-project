import z from 'zod/v4'

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

export type HexColor = z.infer<typeof HexColorSchema>
export type Point = z.infer<typeof PointSchema>
export type Size = z.infer<typeof SizeSchema>
export type Rectangle = z.infer<typeof RectangleSchema>
export type Identifiable = z.infer<typeof IdentifiableSchema>
export type Id = Identifiable['id']
