
import { HistoricalRecord, MedicationReminder } from "../types";

const DB_NAME = "CareTransiaDB";
const STORE_PLANS = "care_plans";
const STORE_REMINDERS = "reminders";
const VERSION = 3; // Incremented to ensure upgrade runs

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
        
        // Store: Care Plans
        if (!db.objectStoreNames.contains(STORE_PLANS)) {
          const store = db.createObjectStore(STORE_PLANS, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Store: Reminders
        if (!db.objectStoreNames.contains(STORE_REMINDERS)) {
            const store = db.createObjectStore(STORE_REMINDERS, { keyPath: "id" });
            store.createIndex("userId", "userId", { unique: false });
            store.createIndex("enabled", "enabled", { unique: false });
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

  // --- Care Plans ---

  savePlan: async (record: HistoricalRecord & { userId: string; createdAt: number }): Promise<string> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PLANS], "readwrite");
      const store = transaction.objectStore(STORE_PLANS);
      const request = store.put(record);

      request.onsuccess = () => resolve(record.id);
      request.onerror = () => reject(request.error);
    });
  },

  getUserPlans: async (userId: string): Promise<HistoricalRecord[]> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PLANS], "readonly");
      const store = transaction.objectStore(STORE_PLANS);
      const index = store.index("userId");
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const results = request.result as (HistoricalRecord & { createdAt: number })[];
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  },

  getPlanById: async (id: string): Promise<HistoricalRecord | undefined> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PLANS], "readonly");
      const store = transaction.objectStore(STORE_PLANS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  getAllPlans: async (): Promise<HistoricalRecord[]> => {
     const db = await dbService.open();
     return new Promise((resolve, reject) => {
       const transaction = db.transaction([STORE_PLANS], "readonly");
       const store = transaction.objectStore(STORE_PLANS);
       const request = store.getAll();
       request.onsuccess = () => resolve(request.result);
       request.onerror = () => reject(request.error);
     });
  },

  // --- Reminders ---

  saveReminder: async (reminder: MedicationReminder): Promise<string> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_REMINDERS], "readwrite");
        const store = tx.objectStore(STORE_REMINDERS);
        const req = store.put(reminder);
        req.onsuccess = () => resolve(reminder.id);
        req.onerror = () => reject(req.error);
    });
  },

  getReminders: async (userId: string): Promise<MedicationReminder[]> => {
    const db = await dbService.open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_REMINDERS], "readonly");
        const store = tx.objectStore(STORE_REMINDERS);
        const index = store.index("userId");
        const req = index.getAll(userId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
  },

  deleteReminder: async (id: string): Promise<void> => {
      const db = await dbService.open();
      return new Promise((resolve, reject) => {
          const tx = db.transaction([STORE_REMINDERS], "readwrite");
          const store = tx.objectStore(STORE_REMINDERS);
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
      });
  }
};
