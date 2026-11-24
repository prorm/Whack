// Learner media lives in IndexedDB (never uploaded anywhere).
const DB = 'scrollproof-media'
const STORE = 'blobs'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const r = fn(t.objectStore(STORE))
    t.oncomplete = () => { db.close(); resolve(r.result) }
    t.onerror = () => { db.close(); reject(t.error) }
  })
}

export const putBlob = (key: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, key))
export const getBlob = (key: string) => tx<Blob | undefined>('readonly', (s) => s.get(key))
export const deleteBlob = (key: string) => tx('readwrite', (s) => s.delete(key))
export const clearBlobs = () => tx('readwrite', (s) => s.clear())
