const HEIC_CONVERT_QUALITY = 0.92

export async function convertHeicFile(file: File): Promise<File> {
  const { heicTo } = await import('heic-to')
  const jpegBlob = await heicTo({ blob: file, type: 'image/jpeg', quality: HEIC_CONVERT_QUALITY })

  return new File([jpegBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
}
