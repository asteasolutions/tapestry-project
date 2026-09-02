const HEIC_CONVERT_QUALITY = 0.92

export async function convertHeicFile(blob: Blob): Promise<File> {
  const { heicTo } = await import('heic-to')
  const jpegBlob = await heicTo({ blob, type: 'image/jpeg', quality: HEIC_CONVERT_QUALITY })

  return new File([jpegBlob], 'converted.jpg', { type: 'image/jpeg' })
}
