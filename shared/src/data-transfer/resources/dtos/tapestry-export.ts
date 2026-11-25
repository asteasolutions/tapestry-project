import { Identifiable } from 'tapestry-core/src/data-format/schemas/common.js'

export interface TapestryExportDto extends Identifiable {
  createdAt: Date
  tapestryId: string | null
  userId: string | null
}

export interface TapestryExportCreateDto {
  tapestryId: string
}
