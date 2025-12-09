
import React, { useEffect, useState } from 'react';
import { MedicationReminder } from '../types';
import { reminderService } from '../services/reminders';
import { Icons, Card, Button } from './ui';

interface Props {
    userId: string;
    onClose: () => void;
    onAddMore: () => void;
}

export default function RemindersManager({ userId, onClose, onAddMore }: Props) {
    const [reminders, setReminders] = useState<MedicationReminder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, [userId]);

    const load = async () => {
        setLoading(true);
        try {
            const data = await reminderService.getReminders(userId);
            setReminders(data);
        } catch (e) {
            console.error("Failed to load reminders", e);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this reminder?")) {
            await reminderService.deleteReminder(id);
            load();
        }
    };

    const handleToggle = async (rem: MedicationReminder) => {
        const updated = { ...rem, enabled: !rem.enabled };
        await reminderService.saveReminder(updated);
        load(); // Refresh list
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">My Reminders</h2>
                <Button onClick={onAddMore} variant="secondary" className="py-2 px-3 text-xs h-auto min-h-0">
                    <Icons.Refresh className="w-3 h-3" /> Re-scan Plan
                </Button>
            </div>

            {loading ? (
                <div className="py-12 text-center"><Icons.Spinner className="w-8 h-8 text-blue-500 mx-auto" /></div>
            ) : reminders.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Icons.Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No active reminders.</p>
                    <p className="text-xs text-slate-400 mt-1">Setup reminders from your care plan to see them here.</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
                    {reminders.map(rem => (
                        <div key={rem.id} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex items-center justify-between transition-colors hover:border-blue-100">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => handleToggle(rem)}
                                    className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${rem.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                    title={rem.enabled ? "Disable" : "Enable"}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${rem.enabled ? 'left-5' : 'left-1'}`} />
                                </button>
                                <div>
                                    <h3 className={`font-bold text-sm md:text-base ${rem.enabled ? 'text-slate-900' : 'text-slate-400'}`}>{rem.medicationName}</h3>
                                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                                        {rem.schedule.map((s, i) => (
                                            <span key={i} className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                                                <Icons.Clock className="w-3 h-3" />
                                                {s.hour.toString().padStart(2,'0')}:{s.minute.toString().padStart(2,'0')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(rem.id)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors">
                                <Icons.Trash className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="pt-4 border-t border-slate-100">
                <button onClick={onClose} className="w-full py-3 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Close</button>
            </div>
        </div>
    );
}
