import { fileTypeFromBuffer } from 'file-type'

function isDir(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
  return entry.isDirectory
}

export function getFile(entry: FileSystemFileEntry) {
  return new Promise<File>((resolve, reject) => entry.file(resolve, reject))
}

function readDir(entry: FileSystemDirectoryEntry) {
  return new Promise<FileSystemEntry[]>((resolve, reject) =>
    entry.createReader().readEntries(resolve, reject),
  )
}

export async function scan<T>(
  entry: FileSystemEntry,
  cb: (file: FileSystemFileEntry) => Promise<T>,
): Promise<T[]> {
  if (isDir(entry)) {
    const result: T[] = []
    for (const e of await readDir(entry)) {
      result.push(...(await scan(e, cb)))
    }
    return result
  }
  return [await cb(entry as FileSystemFileEntry)]
}

export async function urlToBuffer(url: string) {
  return (await fetch(url)).arrayBuffer()
}

export async function urlToFile(url: string) {
  const buffer = await urlToBuffer(url)
  const type = await fileTypeFromBuffer(buffer)
  return new File([buffer], `localfile${type ? `.${type.ext}` : ''}`, { type: type?.mime })
}

export function download(url: string, title: string) {
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = title
  document.body.append(a)
  a.click()
  a.remove()
}

export async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
