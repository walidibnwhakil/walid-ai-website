/* Results are stored locally in the visitor's browser; no image bytes leave the device. */
const DATABASE = 'walid-image-results-v1';
const STORE = 'jobs';
const MAX_AGE = 6 * 60 * 60 * 1000;
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('This browser cannot keep image results between pages.')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Browser storage is unavailable.'));
    request.onblocked = () => reject(new Error('Close other result tabs, then try again.'));
  });
}
export async function saveResult(job) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      // This is a temporary download buffer, not a library of user photos.
      const cutoff = Date.now() - MAX_AGE;
      const cursor = store.openCursor();
      cursor.onsuccess = () => { const row = cursor.result; if (row) { if (row.value?.created < cutoff) row.delete(); row.continue(); } };
      store.put(job);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save the edited image.'));
      tx.onabort = () => reject(tx.error || new Error('Not enough browser storage for the edited image.'));
    });
  } finally { db.close(); }
  return job.id;
}
export async function readResult(id) {
  if (!/^[0-9a-f-]{20,64}$/i.test(id || '')) return null;
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result && Date.now() - request.result.created < MAX_AGE ? request.result : null);
      request.onerror = () => reject(request.error || new Error('Cannot open the result.'));
    });
  } finally { db.close(); }
}
