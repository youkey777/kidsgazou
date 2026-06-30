import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type ChildKey = 'rui' | 'mio'

export interface ImageRecord {
  id: string
  child: ChildKey
  blob: Blob
  mime: string
  name: string
  createdAt: number
}

interface GalleryDB extends DBSchema {
  images: {
    key: string
    value: ImageRecord
    indexes: { 'by-child': ChildKey; 'by-created': number }
  }
}

const DB_NAME = 'kids-gallery'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<GalleryDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<GalleryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('images', { keyPath: 'id' })
        store.createIndex('by-child', 'child')
        store.createIndex('by-created', 'createdAt')
      },
    })
  }
  return dbPromise
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function addImages(child: ChildKey, files: File[]): Promise<ImageRecord[]> {
  const db = await getDB()
  const tx = db.transaction('images', 'readwrite')
  const now = Date.now()
  const records: ImageRecord[] = files.map((f, i) => ({
    id: uid() + i,
    child,
    blob: f,
    mime: f.type || 'image/png',
    name: f.name || 'image',
    createdAt: now + i,
  }))
  await Promise.all(records.map((r) => tx.store.add(r)))
  await tx.done
  return records
}

export async function listImages(child: ChildKey): Promise<ImageRecord[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('images', 'by-child', child)
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('images', id)
}

export async function countImages(child: ChildKey): Promise<number> {
  const db = await getDB()
  return db.countFromIndex('images', 'by-child', child)
}
