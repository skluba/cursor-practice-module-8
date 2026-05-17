function createDomStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length(): number {
      return data.size
    },
    clear(): void {
      data.clear()
    },
    getItem(key: string): string | null {
      return data.has(key) ? String(data.get(key)) : null
    },
    key(index: number): string | null {
      const keys = [...data.keys()]
      return index >= 0 && index < keys.length ? keys[index] ?? null : null
    },
    removeItem(key: string): void {
      data.delete(String(key))
    },
    setItem(key: string, value: string): void {
      data.set(String(key), String(value))
    },
  }
}

const ls = createDomStorage()
const ss = createDomStorage()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: ls })
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: ss })

if (globalThis.window !== undefined) {
  try {
    Object.defineProperty(globalThis.window, 'localStorage', { configurable: true, value: ls })
    Object.defineProperty(globalThis.window, 'sessionStorage', { configurable: true, value: ss })
  } catch {
    /* non-configurable accessors */
  }
}
