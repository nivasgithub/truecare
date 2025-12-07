import { HistoricalRecord } from "../types";

const DB_NAME = "CareTransiaDB";
const STORE_NAME = "care_plans";
const VERSION = 1;

/**
 * Promise-based wrapper for IndexedDB
 */
export const dbService = {
  
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB not supported"));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // Create object store with 'id' as key path and an index on 'userId'
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  savePlan: async (record: HistoricalRecord & { userId: string; createdAt: number }): Promise<string> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve(record.id);
      request.onerror = () => reject(request.error);
    });
  },

  getUserPlans: async (userId: string): Promise<HistoricalRecord[]> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("userId");
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const results = request.result as (HistoricalRecord & { createdAt: number })[];
        // Sort in memory (descending by time)
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  },

  getPlanById: async (id: string): Promise<HistoricalRecord | undefined> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  getAllPlans: async (): Promise<HistoricalRecord[]> => {
     const db = await dbService.open();
     return new Promise((resolve, reject) => {
       const transaction = db.transaction([STORE_NAME], "readonly");
       const store = transaction.objectStore(STORE_NAME);
       const request = store.getAll();
       request.onsuccess = () => resolve(request.result);
       request.onerror = () => reject(request.error);
     });
  }
};
