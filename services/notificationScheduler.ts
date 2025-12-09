
import { reminderService } from "./reminders";
import { getCurrentUser } from "./firebase";
import { MedicationReminder } from "../types";

let intervalId: any = null;

// Track notifications sent this minute to avoid dupes if interval drifts
const sentNotifications = new Set<string>();

export const notificationScheduler = {
    
    start: () => {
        if (intervalId) return;
        
        // Request permission on start if not denied
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
             // We generally wait for user action, but we can check here
        }

        // Check every minute
        intervalId = setInterval(checkReminders, 60 * 1000);
        console.log("Notification Scheduler Started");
    },

    stop: () => {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
    }
};

async function checkReminders() {
    const user = getCurrentUser();
    if (!user || !user.uid) return;

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    try {
        const reminders = await reminderService.getReminders(user.uid);
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Clear sent cache if it's a new minute (simple logic)
        const timeKey = `${currentHour}:${currentMinute}`;
        
        reminders.forEach(reminder => {
            if (!reminder.enabled) return;

            reminder.schedule.forEach(sched => {
                // Check if current time matches scheduled time (within 1 minute margin)
                if (sched.hour === currentHour && Math.abs(sched.minute - currentMinute) <= 1) {
                    const key = `${reminder.id}-${timeKey}`;
                    if (!sentNotifications.has(key)) {
                        sendNotification(reminder, sched.label);
                        sentNotifications.add(key);
                        
                        // Cleanup old keys after 2 mins to keep memory low
                        setTimeout(() => sentNotifications.delete(key), 120000);
                    }
                }
            });
        });
    } catch (e) {
        console.error("Error in reminder check:", e);
    }
}

function sendNotification(reminder: MedicationReminder, label: string) {
    try {
        const notif = new Notification(`Time to take ${reminder.medicationName}`, {
            body: `${label}: ${reminder.dose}. Click to mark as taken.`,
            icon: '/favicon.ico', 
            requireInteraction: true
        });
        
        notif.onclick = () => {
            window.focus();
            notif.close();
        };
    } catch (e) {
        console.error("Notification failed", e);
    }
}
