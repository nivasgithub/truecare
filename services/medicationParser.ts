
import { Medication, MedicationReminder } from "../types";

// Default Times based on user preferences (8am, 7pm)
const TIME_MORNING = { hour: 8, minute: 0, label: "Morning" }; 
const TIME_NOON = { hour: 12, minute: 0, label: "Noon" };
const TIME_EVENING = { hour: 19, minute: 0, label: "Evening" }; 
const TIME_BED = { hour: 21, minute: 0, label: "Bedtime" };

/**
 * Parses raw medication data into schedule candidates
 */
export function parseMedicationSchedule(
    medications: Medication[], 
    userId: string
): MedicationReminder[] {
    
    return medications.map(med => {
        const schedules: { hour: number; minute: number; label: string }[] = [];
        const freq = (med.frequency || "").toLowerCase();
        const timing = (med.timing_notes || "").toLowerCase();
        const combined = `${freq} ${timing}`;

        // Heuristic Parsing

        // 1. Specific Keywords
        if (combined.includes("morning") || combined.includes("breakfast") || combined.includes("am")) {
            schedules.push(TIME_MORNING);
        }
        if (combined.includes("noon") || combined.includes("lunch")) {
            schedules.push(TIME_NOON);
        }
        if (combined.includes("evening") || combined.includes("dinner") || combined.includes("pm") || combined.includes("supper")) {
            schedules.push(TIME_EVENING);
        }
        if (combined.includes("bed") || combined.includes("night") || combined.includes("sleep")) {
            schedules.push(TIME_BED);
        }

        // 2. Frequency patterns if no specific times found
        if (schedules.length === 0) {
            if (combined.includes("twice") || combined.includes("2 times") || combined.includes("bid")) {
                schedules.push(TIME_MORNING);
                schedules.push(TIME_EVENING);
            } else if (combined.includes("three") || combined.includes("3 times") || combined.includes("tid")) {
                schedules.push(TIME_MORNING);
                schedules.push(TIME_NOON);
                schedules.push(TIME_EVENING);
            } else if (combined.includes("four") || combined.includes("4 times") || combined.includes("qid")) {
                schedules.push(TIME_MORNING);
                schedules.push(TIME_NOON);
                schedules.push({ hour: 17, minute: 0, label: "Afternoon" });
                schedules.push(TIME_BED);
            } else if (combined.includes("daily") || combined.includes("once") || combined.includes("1 time") || combined.includes("qd")) {
                // Default daily to morning
                schedules.push(TIME_MORNING);
            }
        }

        // 3. Fallback for unknowns
        if (schedules.length === 0) {
             schedules.push(TIME_MORNING); // Default to morning if completely unknown
        }

        // Deduplicate times (e.g. if text says "morning and 8am")
        const uniqueSchedules = schedules.filter((v, i, a) => a.findIndex(t => t.hour === v.hour && t.minute === v.minute) === i);

        return {
            id: `rem-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            type: 'medication',
            medicationName: med.name,
            dose: med.dose,
            schedule: uniqueSchedules,
            startDate: med.start_date || new Date().toISOString(),
            endDate: med.end_date || null,
            enabled: true,
            createdAt: Date.now()
        };
    });
}
