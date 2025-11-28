export class LocalStorage<T> {
  constructor(private key: string) {}

  save(data: T) {
    localStorage.setItem(this.key, JSON.stringify(data))
  }

  get current(): T | undefined {
    const dataStr = localStorage.getItem(this.key)
    return dataStr ? (JSON.parse(dataStr) as T) : undefined
  }

  delete() {
    localStorage.removeItem(this.key)
  }
}
