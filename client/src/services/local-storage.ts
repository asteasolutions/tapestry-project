export class LocalStorage<T> {
  constructor(private key: string) {}

  save(data: T) {
    localStorage.setItem(this.key, JSON.stringify(data))
  }

  get current(): T | null {
    const dataStr = localStorage.getItem(this.key)
    return dataStr ? (JSON.parse(dataStr) as T) : null
  }

  delete() {
    localStorage.removeItem(this.key)
  }
}
