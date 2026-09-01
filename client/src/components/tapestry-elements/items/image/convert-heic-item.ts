import { getImageItemSize } from '../../../../lib/media'
import { uploadAsset } from '../../../../model/data/utils'
import { resource } from '../../../../services/rest-resources'

const HEIC_CONVERT_QUALITY = 0.92

async function loadHeicBlob(source: string, file: File | undefined): Promise<Blob> {
  if (file) return file

  const response = await fetch(source)
  if (!response.ok) throw new Error(`Failed to fetch HEIC source: ${response.status}`)
  return response.blob()
}

export async function convertHeicItem(
  itemId: string,
  tapestryId: string,
  source: string,
  file?: File,
) {
  const [{ heicTo }, heicBlob] = await Promise.all([import('heic-to'), loadHeicBlob(source, file)])

  const jpegBlob = await heicTo({
    blob: heicBlob,
    type: 'image/jpeg',
    quality: HEIC_CONVERT_QUALITY,
  })
  const jpegFile = new File([jpegBlob], 'converted.jpg', { type: 'image/jpeg' })

  const size = await getImageItemSize(jpegFile)
  const key = await uploadAsset(jpegFile, { type: 'tapestry-asset', tapestryId })

  await resource('items').update({ id: itemId }, { type: 'image', source: key, size })
}
