import { database, type DB } from '../domain/model'
import { DomainError, empty } from '../domain/rules'
export const dbKey = 'vibe:db:v1'
export const changed = 'vibe-db-changed'
export const now = () => new Date().toISOString()
export function readDB(): { db: DB; recovered: boolean } {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(dbKey)
    if (raw === null) return { db: empty(now()), recovered: false }
    return { db: database.parse(JSON.parse(raw)), recovered: false }
  } catch {
    if (raw !== null) {
      try {
        localStorage.setItem('vibe:db:corrupt:' + now(), raw)
        localStorage.removeItem(dbKey)
      } catch {
        /* Preserve the original when backup fails. */
      }
    }
    return { db: empty(now()), recovered: true }
  }
}
export async function mutate(transform: (db: DB, timestamp: string) => DB) {
  const write = () => {
    const timestamp = now()
    const next = transform(readDB().db, timestamp)
    const db = database.parse({
      ...next,
      meta: { ...next.meta, updatedAt: timestamp },
    })
    try {
      localStorage.setItem(dbKey, JSON.stringify(db))
    } catch {
      throw new DomainError(
        'STORAGE_FULL',
        'Không thể lưu dữ liệu trên trình duyệt. Hãy kiểm tra dung lượng và quyền lưu trữ.',
      )
    }
    window.dispatchEvent(new Event(changed))
    return db
  }
  return navigator.locks?.request
    ? navigator.locks.request('vibe-db', write)
    : write()
}
