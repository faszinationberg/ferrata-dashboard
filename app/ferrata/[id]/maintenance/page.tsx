"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';

export default function MaintenanceCenter() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [ferrata, setFerrata] = useState<any>(null);
  const [defects, setDefects] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'open': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'maintenance': return 'bg-orange-50 text-orange-600 border-orange-100';
    case 'winter': return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'closed': return 'bg-red-50 text-red-600 border-red-100';
    case 'unknown': return 'bg-white text-slate-400 border-slate-200';
    default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
};

  const fetchData = async () => {
    setLoading(true);
    const { data: ferrataData } = await supabase.from('ferratas').select('name, status').eq('id', id).single();
    const { data: reportsData } = await supabase.from('reports').select('*').eq('ferrata_id', id).eq('resolved', false).order('created_at', { ascending: false });
    const { data: historyData } = await supabase.from('maintenance_logs').select('*').eq('ferrata_id', id).order('date', { ascending: false });

    if (ferrataData) setFerrata(ferrataData);
    if (reportsData) {
      setDefects(reportsData.filter(r => r.verified === true));
      setUserReports(reportsData.filter(r => r.verified === false));
    }
    if (historyData) setHistory(historyData);
    setLoading(false);
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const verifyReport = async (reportId: string) => {
    const { error } = await supabase.from('reports').update({ verified: true, priority: 'orange' }).eq('id', reportId);
    if (!error) fetchData();
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm("Meldung wirklich löschen?")) return;
    const { error } = await supabase.from('reports').delete().eq('id', reportId);
    if (!error) fetchData();
  };

  const resolveDefect = async (defect: any) => {
    setLoading(true);
    try {
      await supabase.from('reports').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', defect.id);
      await supabase.from('maintenance_logs').insert([{
        ferrata_id: id,
        report_id: defect.id,
        type: 'Reparatur',
        description: `BEHOBEN: ${defect.type} - ${defect.description}`,
        date: new Date().toISOString().split('T')[0],
        performed_by: 'Wartungsteam'
      }]);
      fetchData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const updateField = async (field: string, value: any) => {
  const { error } = await supabase
    .from('ferratas')
    .update({ [field]: value })
    .eq('id', id);

  if (!error) {
    // Lokalen State aktualisieren, damit die UI sofort reagiert
    setFerrata((prev: any) => ({ ...prev, [field]: value }));
  } else {
    alert("Fehler beim Aktualisieren des Status.");
  }
};


  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-6 h-6 border-2 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div></div>;

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans pb-32">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        
        {/* COMPACT HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-8">
            <div>
                {/* Zurück zum Dashboard */}
                <button 
                onClick={() => router.push('/')} 
                className="text-slate-400 hover:text-slate-900 text-xs font-medium mb-4 block transition-all"
                >
                ← Zurück zum Dashboard
                </button>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{ferrata?.name}</h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500 mt-1 italic">Wartungs-Zentrale & Live-Feed - HIER MUSS NOCH VIEL GETAN WERDEN</p>
            </div>
            
            {/* Status-Badge: Hier immer editierbar ohne Stift */}
            <div className="flex items-center gap-2">
                <Badge 
                    label="Status" 
                    value={ferrata?.status} 
                    onEdit={(v: string) => updateField('status', v)} 
                    color={getStatusColor(ferrata?.status)} 
                />
                </div>
            </header>

        {/* 1. MÄNGEL (OFFIZIELL) */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Offizielle Mängelliste</h3>
            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">{defects.length} Offen</span>
          </div>
          
          <div className="grid gap-3">
            {defects.length === 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
                <p className="text-sm text-slate-300 italic font-light">Aktuell keine offiziellen Mängel dokumentiert.</p>
              </div>
            )}
            {defects.map((d) => (
              <div key={d.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-6 shadow-sm hover:border-blue-200 transition-all group">
                <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${d.priority === 'red' ? 'bg-red-500' : 'bg-orange-400'}`}></div>
                <div className="flex-1">
                  <div className="flex gap-2 text-[9px] font-bold uppercase tracking-tight text-slate-400 mb-1">
                    <span className="text-slate-900">{d.type}</span>
                    {d.location && <span>— 📍 {d.location}</span>}
                  </div>
                  <p className="text-sm font-medium text-slate-700 leading-snug">{d.description}</p>
                </div>
                <button 
                  onClick={() => resolveDefect(d)} 
                  className="px-5 py-2.5 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                  ERLEDIGT ✓
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 2. USER FEED (AKKORDEON) */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70 ml-1">Externer User-Feed ({userReports.length})</h3>
          <div className="grid gap-3">
            {userReports.map((r) => (
              <div key={r.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)} 
                  className="w-full p-5 flex justify-between items-center hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 uppercase tracking-tight leading-none mb-1">{r.type}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{new Date(r.created_at).toLocaleDateString()} — {r.location || 'Keine Ortsangabe'}</p>
                    </div>
                  </div>
                  <span className="text-slate-300 text-lg font-light">{expandedReport === r.id ? '−' : '+'}</span>
                </button>
                
                {expandedReport === r.id && (
                  <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-sm text-slate-600 leading-relaxed font-light italic">
                      "{r.description}"
                    </div>
                    <div className="flex justify-between items-center">
                      {r.image_url ? (
                        <a href={r.image_url} target="_blank" className="text-[10px] font-bold text-blue-500 hover:text-blue-700 underline flex items-center gap-1">
                          📸 Foto der Meldung
                        </a>
                      ) : <span />}
                      <div className="flex gap-2">
                        <button onClick={() => verifyReport(r.id)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-blue-600 transition-all">Übernehmen</button>
                        <button onClick={() => deleteReport(r.id)} className="px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-lg text-[10px] hover:text-red-500 hover:border-red-100 transition-all">✕</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 3. HISTORY */}
        <section className="space-y-6 pt-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Wartungshistorie</h3>
          </div>
          <div className="space-y-4">
            {history.map((log, i) => (
              <div key={i} className="bg-white border border-slate-50 rounded-2xl p-5 flex justify-between items-center group hover:bg-white transition-all shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <time className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">{new Date(log.date).toLocaleDateString()}</time>
                    <span className="text-[9px] font-bold text-slate-300 uppercase bg-slate-50 px-2 py-0.5 rounded">{log.type}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{log.description}</p>
                </div>
                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic group-hover:text-slate-400">
                  #{history.length - i}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}


function Badge({ label, value, color, onEdit }: any) {
  const [isEdit, setIsEdit] = useState(false);

  const statusOptions = [
    { label: 'Geöffnet', value: 'open' },
    { label: 'Gesperrt', value: 'closed' },
    { label: 'Gesperrt - Wartung', value: 'maintenance' },
    { label: 'Winterpause', value: 'winter' },
    { label: 'Unbekannt', value: 'unknown' }
  ];

  const getDisplayValue = (val: string) => {
    const option = statusOptions.find(o => o.value === (val?.toLowerCase() || 'unknown'));
    return option ? option.label : val;
  };

  return (
    <div className="relative inline-block"> {/* inline-block für exakte Ausrichtung im Header */}
      <div 
        onClick={() => setIsEdit(!isEdit)} 
        className={`px-5 py-3 rounded-2xl min-w-[180px] transition-all border shadow-sm flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 ${color}`}
      >
        {/* Label: explizit zentriert */}
        <p className="text-[8px] font-bold uppercase opacity-50 mb-1 tracking-[0.2em] text-center w-full block">
          {label}
        </p>
        
        {/* Wert-Container: Nutzt die volle Breite für die Zentrierung */}
        <div className="flex items-center justify-center w-full relative">
          <p className="text-sm font-bold tracking-tight leading-none uppercase text-center w-full">
            {getDisplayValue(value)}
          </p>
          {/* Pfeil absolut positioniert, damit er die Zentrierung des Textes nicht stört */}
          <span className="text-[10px] opacity-30 absolute right-0">▾</span>
        </div>
      </div>

      {/* DROP-DOWN MENÜ */}
      {isEdit && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsEdit(false)}></div>
          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                className={`w-full py-4 px-4 text-[11px] font-bold uppercase border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors text-center block
                  ${value === opt.value ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                onClick={() => {
                  onEdit(opt.value);
                  setIsEdit(false);
                }}
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