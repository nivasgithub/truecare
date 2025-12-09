
import { dbService } from "./db";
import { MedicationReminder } from "../types";

export const reminderService = {
    
    getReminders: async (userId: string): Promise<MedicationReminder[]> => {
        return await dbService.getReminders(userId);
    },

    saveReminder: async (reminder: MedicationReminder): Promise<void> => {
        await dbService.saveReminder(reminder);
    },

    deleteReminder: async (id: string): Promise<void> => {
        await dbService.deleteReminder(id);
    },

    toggleReminder: async (id: string, enabled: boolean): Promise<void> => {
        // Fetch specific reminder (currently using user collection scan for simplicity as DB service is simple)
        const db = await dbService.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(["reminders"], "readwrite");
            const store = tx.objectStore("reminders");
            const req = store.get(id);
            
            req.onsuccess = () => {
                const reminder = req.result as MedicationReminder;
                if (reminder) {
                    reminder.enabled = enabled;
                    const putReq = store.put(reminder);
                    putReq.onsuccess = () => resolve();
                    putReq.onerror = () => reject(putReq.error);
                } else {
                    resolve();
                }
            };
            req.onerror = () => reject(req.error);
        });
    }
};
