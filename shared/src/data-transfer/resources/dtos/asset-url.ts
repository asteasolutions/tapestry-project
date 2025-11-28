export interface AssetURLDto {
  presignedURL: string
  key: string
}

export interface TapestryAssetUrlCreateDto {
  type: 'tapestry-asset'
  fileExtension: string
  mimeType: string
  tapestryId: string
}

export interface ImportAssetUrlCreateDto {
  type: 'import'
}

export type AssetURLCreateDto = TapestryAssetUrlCreateDto | ImportAssetUrlCreateDto
