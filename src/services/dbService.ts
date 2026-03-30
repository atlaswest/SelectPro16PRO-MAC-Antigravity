import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'SelectProDB';
const STORE_NAME = 'photos';
const PROXY_STORE = 'proxies';
const VERSION = 2;

// Platform detection
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
export const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(navigator.userAgent.toLowerCase());
export const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(navigator.userAgent);
export const isDesktop = !isMobile && !isTablet;

// Dynamic limits based on platform
export const CACHE_CONFIG = {
  maxPhotos: isMobile ? 50 : isTablet ? 150 : 1000,
  maxProxySize: isMobile ? 1024 * 1024 * 2 : isTablet ? 1024 * 1024 * 5 : 1024 * 1024 * 25, // 2MB, 5MB, 25MB
  storageStrategy: isMobile ? 'conservative' : isTablet ? 'balanced' : 'aggressive',
  preheatCount: isMobile ? 5 : isTablet ? 10 : 30
};

export interface CachedPhoto {
  id: string;
  blob: Blob;
  metadata: any;
  result?: any;
  rating: number;
  colorTag: string | null;
  tags: string[];
  manualRejected: boolean;
  renamedFilename?: string;
}

export interface CachedProxy {
  id: string;
  blob: Blob;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PROXY_STORE)) {
          db.createObjectStore(PROXY_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function savePhotoToCache(photo: CachedPhoto) {
  const db = await getDB();
  return db.put(STORE_NAME, photo);
}

export async function getPhotoFromCache(id: string): Promise<CachedPhoto | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function saveProxyToCache(id: string, blob: Blob) {
  const db = await getDB();
  return db.put(PROXY_STORE, { id, blob });
}

export async function getProxyFromCache(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  const result = await db.get(PROXY_STORE, id);
  return result?.blob;
}

export async function getAllPhotosFromCache(): Promise<CachedPhoto[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function getPhotosPaginated(offset: number, limit: number): Promise<CachedPhoto[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  let cursor = await store.openCursor();
  
  if (offset > 0) {
    await cursor?.advance(offset);
  }

  const results: CachedPhoto[] = [];
  while (cursor && results.length < limit) {
    results.push(cursor.value);
    cursor = await cursor.continue();
  }
  return results;
}

export async function deletePhotoFromCache(id: string) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
  await db.delete(PROXY_STORE, id);
}

export async function updatePhotoMetadata(id: string, updates: Partial<CachedPhoto>) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const existing = await store.get(id);
  if (existing) {
    await store.put({ ...existing, ...updates });
  }
  await tx.done;
}

export async function batchUpdatePhotoMetadata(ids: string[], updates: Partial<CachedPhoto>) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const id of ids) {
    const existing = await store.get(id);
    if (existing) {
      await store.put({ ...existing, ...updates });
    }
  }
  await tx.done;
}

export async function clearCache() {
  const db = await getDB();
  await db.clear(STORE_NAME);
  await db.clear(PROXY_STORE);
}
