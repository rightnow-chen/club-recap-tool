const DB_NAME = 'clubrecap.images.v1';
const STORE = 'originals';
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开图片存储。'));
  });
}
export async function saveOriginal(key: string, file: File) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('原图保存失败。'));
  });
  db.close();
}
export async function deleteOriginal(key: string) {
  if (!key) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  }); db.close();
}
export async function getOriginalUrl(key: string) {
  if (!key) return null;
  const db = await openDb();
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  }); db.close();
  return file ? URL.createObjectURL(file) : null;
}
