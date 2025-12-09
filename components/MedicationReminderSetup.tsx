
import React, { useState, useEffect } from 'react';
import { Medication, MedicationReminder } from '../types';
import { parseMedicationSchedule } from '../services/medicationParser';
import { reminderService } from '../services/reminders';
import { Icons, Button, Card } from './ui';

interface Props {
    medications: Medication[];
    userId: string;
    onComplete: () => void;
    onCancel: () => void;
}

export default function MedicationReminderSetup({ medications, userId, onComplete, onCancel }: Props) {
    const [reminders, setReminders] = useState<MedicationReminder[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const generated = parseMedicationSchedule(medications, userId);
        setReminders(generated);
    }, [medications, userId]);

    const handleSave = async () => {
        // Request Permission
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }

        setSaving(true);
        try {
            for (const r of reminders) {
                // Save all, respecting enabled/disabled state
                await reminderService.saveReminder(r);
            }
            onComplete();
        } catch (e) {
            console.error(e);
            alert("Failed to save reminders.");
        } finally {
            setSaving(false);
        }
    };

    const toggleReminder = (index: number) => {
        const updated = [...reminders];
        updated[index].enabled = !updated[index].enabled;
        setReminders(updated);
    };

    const updateTime = (rIndex: number, sIndex: number, field: 'hour'|'minute', val: string) => {
        const updated = [...reminders];
        const num = parseInt(val);
        if (isNaN(num)) return;
        
        updated[rIndex].schedule[sIndex] = {
            ...updated[rIndex].schedule[sIndex],
            [field]: num
        };
        setReminders(updated);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                 <h2 className="text-2xl font-bold text-slate-900">Setup Reminders</h2>
                 <p className="text-slate-500">We've guessed the schedule based on your papers. Please verify.</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
                {reminders.map((rem, i) => (
                    <Card key={i} className={`p-4 border transition-all ${rem.enabled ? 'border-blue-200 shadow-sm' : 'border-slate-100 opacity-60 bg-slate-50'}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-slate-900">{rem.medicationName}</h3>
                                <p className="text-xs text-slate-500">{rem.dose}</p>
                            </div>
                            <button 
                                onClick={() => toggleReminder(i)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${rem.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${rem.enabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        {rem.enabled && (
                            <div className="space-y-2">
                                {rem.schedule.map((sched, j) => (
                                    <div key={j} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-lg">
                                        <span className="w-20 font-medium text-slate-600 flex items-center gap-2">
                                            <Icons.Clock className="w-4 h-4" />
                                            {sched.label}
                                        </span>
                                        <select 
                                            value={sched.hour} 
                                            onChange={(e) => updateTime(i, j, 'hour', e.target.value)}
                                            className="bg-white rounded p-1 border border-slate-200 font-mono focus:ring-2 focus:ring-blue-200 outline-none"
                                        >
                                            {[...Array(24)].map((_, h) => (
                                                <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                        :
                                        <select 
                                            value={sched.minute} 
                                            onChange={(e) => updateTime(i, j, 'minute', e.target.value)}
                                            className="bg-white rounded p-1 border border-slate-200 font-mono focus:ring-2 focus:ring-blue-200 outline-none"
                                        >
                                            {[0, 15, 30, 45].map(m => (
                                                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={onCancel} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? "Saving..." : "Save & Enable"}
                </Button>
            </div>
        </div>
    );
}
