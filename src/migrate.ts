import { openDB } from 'idb'
import { addImages, type ChildKey } from './db'

const LEGACY_DB = 'kids-gallery'
const FLAG = 'gallery_migrated_v1'

interface LegacyRecord {
  id: string
  child: ChildKey
  blob: Blob
  mime: string
  name: string
  createdAt: number
}

export async function migrateFromIndexedDB(
  onProgress?: (done: number, total: number) => void
): Promise<{ migrated: number; skipped: boolean }> {
  if (localStorage.getItem(FLAG) === '1') return { migrated: 0, skipped: true }

  const databases = await indexedDB.databases?.()
  const has = databases?.some((d) => d.name === LEGACY_DB)
  if (!has) {
    localStorage.setItem(FLAG, '1')
    return { migrated: 0, skipped: true }
  }

  const db = await openDB(LEGACY_DB, 1)
  let records: LegacyRecord[] = []
  if (db.objectStoreNames.contains('images')) {
    records = (await db.getAll('images')) as LegacyRecord[]
  }
  db.close()

  if (records.length === 0) {
    localStorage.setItem(FLAG, '1')
    return { migrated: 0, skipped: true }
  }

  const byChild: Record<ChildKey, LegacyRecord[]> = { rui: [], mio: [] }
  for (const r of records) {
    if (r.child === 'rui' || r.child === 'mio') byChild[r.child].push(r)
  }

  let done = 0
  const total = records.length
  for (const child of ['rui', 'mio'] as ChildKey[]) {
    const rs = byChild[child].sort((a, b) => a.createdAt - b.createdAt)
    for (const r of rs) {
      const file = new File([r.blob], r.name || 'image', {
        type: r.mime || r.blob.type || 'image/png',
      })
      await addImages(child, [file])
      done++
      onProgress?.(done, total)
    }
  }

  await indexedDB.deleteDatabase(LEGACY_DB)
  localStorage.setItem(FLAG, '1')
  return { migrated: done, skipped: false }
}
