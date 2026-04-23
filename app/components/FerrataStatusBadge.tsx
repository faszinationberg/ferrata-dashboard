"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface FerrataStatusBadgeProps {
  ferrataId: string;
  initialStatus?: string;
  onUpdate?: () => void; // Callback, um die Elternseite zu refreshen
}

const statusOptions = [
  { label: 'Geöffnet', value: 'open', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { label: 'Gesperrt', value: 'closed', color: 'bg-red-50 text-red-600 border-red-100' },
  { label: 'Wartung', value: 'maintenance', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  { label: 'Winterpause', value: 'winter', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { label: 'Unbekannt', value: 'unknown', color: 'bg-slate-50 text-slate-400 border-slate-100' }
];

export function FerrataStatusBadge({ ferrataId, initialStatus, onUpdate }: FerrataStatusBadgeProps) {
  const [status, setStatus] = useState(initialStatus || 'unknown');
  const [isEdit, setIsEdit] = useState(false);
  const { userEmail } = useAuth();

  // Falls sich der initialStatus von außen ändert (z.B. nach einem Fetch der Elternseite)
  useEffect(() => {
    if (initialStatus) setStatus(initialStatus);
  }, [initialStatus]);

  const updateStatus = async (newStatus: string) => {
    if (newStatus === status) {
      setIsEdit(false);
      return;
    }

    try {
      // 1. Status in Ferrata-Tabelle ändern
      const { error: statusError } = await supabase
        .from('ferratas')
        .update({ status: newStatus })
        .eq('id', ferrataId);

      if (statusError) throw statusError;

      // 2. Automatisches Audit-Log schreiben
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('maintenance_logs').insert([{
        ferrata_id: ferrataId,
        user_id: user?.id,
        user_name: userEmail,
        date: new Date().toISOString(),
        log_type: 'status_change',
        description: `SYSTEM: Status geändert von [${status.toUpperCase()}] auf [${newStatus.toUpperCase()}]`
      }]);

      setStatus(newStatus);
      setIsEdit(false);
      
      // Falls die Elternseite ihre Daten neu laden muss
      if (onUpdate) onUpdate();

    } catch (err: any) {
      alert("Fehler beim Status-Update: " + err.message);
    }
  };

  const currentOption = statusOptions.find(o => o.value === status) || statusOptions[4];

  return (
    <div className="relative inline-block">
      <div 
        onClick={() => setIsEdit(!isEdit)} 
        className={`px-5 py-3 rounded-2xl min-w-[180px] transition-all border shadow-sm flex flex-col items-center cursor-pointer hover:border-blue-400 hover:shadow-md ${currentOption.color}`}
      >
        <p className="text-[8px] font-bold uppercase opacity-50 mb-1 tracking-[0.2em]">Klettersteig-Status</p>
        <div className="flex items-center justify-center w-full relative text-sm font-black uppercase tracking-tight">
          {currentOption.label}
          <span className="text-[10px] opacity-30 absolute right-0">▾</span>
        </div>
      </div>

      {isEdit && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsEdit(false)}></div>
          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {statusOptions.map((opt) => (
              <button 
                key={opt.value} 
                className={`w-full py-4 px-4 text-[10px] font-black uppercase border-b border-slate-50 last:border-0 hover:bg-blue-50 hover:text-blue-600 transition-colors text-center ${status === opt.value ? 'text-blue-600 bg-blue-50/50' : 'text-slate-600'}`} 
                onClick={() => updateStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}