"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase'; 

export default function FerrataDetails() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [showTopoModal, setShowTopoModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [ferrata, setFerrata] = useState<any>(null);
  const [defects, setDefects] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: ferrataData } = await supabase.from('ferratas').select('*').eq('id', id).single();
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
        performed_by: 'Technik-Team'
      }]);
      fetchData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const updateField = async (field: string, value: any) => {
    const { error } = await supabase.from('ferratas').update({ [field]: value }).eq('id', id);
    if (!error) fetchData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-6 h-6 border-2 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div></div>;
  if (!ferrata) return <div className="p-20 text-center">Anlage nicht gefunden.</div>;

  return (
  <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans pb-32">
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
      
      {/* 1. HEADER BOX */}
      <header className="space-y-6">
        <button onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-900 text-xs font-medium transition-all">← Dashboard</button>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <EditableField value={ferrata.region} onSave={(v:string) => updateField('region', v)} textClass="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600" />
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">{ferrata.name}</h1>
            <button onClick={() => setShowTopoModal(true)} className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-2">🗺️ Topo Karte öffnen</button>
          </div>
          <div className="flex gap-4">
            <Badge label="Difficulty" value={ferrata.difficulty} onEdit={(v:string) => updateField('difficulty', v)} color="bg-slate-50 border border-slate-100 text-slate-800" />
            <Badge label="Status" value={ferrata.status === 'open' ? 'Online' : 'Closed'} onEdit={(v:string) => updateField('status', v.toLowerCase() === 'online' ? 'open' : 'closed')} color={ferrata.status === 'open' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'} />
          </div>
        </div>
      </header>

      {/* 2. NEU POSITIONIERTE BOXEN: VERWALTUNG & GEO (DIREKT UNTER HEADER) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Verwaltung</h3>
          <div className="space-y-4">
            <EditableDataField label="Betreiber" value={ferrata.operator} onSave={(v:string) => updateField('operator', v)} />
            <EditableDataField label="Techniker" value={ferrata.technician} onSave={(v:string) => updateField('technician', v)} />
            <div className="flex justify-between items-center pt-2">
              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Wartungsvertrag</p>
              <button onClick={() => updateField('maintenance_contract', !ferrata.maintenance_contract)} className={`px-2 py-1 rounded text-[9px] font-bold transition-colors ${ferrata.maintenance_contract ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {ferrata.maintenance_contract ? "AKTIV" : "INAKTIV"}
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Geo-Daten</h3>
          <div className="space-y-4">
            <EditableDataField label="Höhenmeter" value={ferrata.vertical_meters} onSave={(v:string) => updateField('vertical_meters', v)} />
            <EditableDataField label="Start-GPS" value={ferrata.coord_start} onSave={(v:string) => updateField('coord_start', v)} />
          </div>
        </section>
      </div>

      {/* 3. HAUPTBEREICH: MÄNGEL, FEED & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-4">
        <div className="lg:col-span-2 space-y-12">
          
          {/* MÄNGEL-LISTE */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Offizielle Mängelliste</h3>
            <div className="grid gap-3">
              {defects.map((d) => (
                  <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
                    <div className={`w-1 h-8 rounded-full ${d.priority === 'red' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">{d.type} {d.location && `— 📍 ${d.location}`}</p>
                      <p className="text-sm font-medium">{d.description}</p>
                    </div>
                    <button onClick={() => resolveDefect(d)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Resolve</button>
                  </div>
                ))}
            </div>
          </section>

          {/* USER-FEED (AKKORDEON) */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600/70 ml-1">Externer User-Feed ({userReports.length})</h3>
            <div className="grid gap-2">
              {userReports.map((r) => (
                  <div key={r.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden transition-all">
                    <button onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)} className="w-full p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                        <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-tight">{r.type}</span>
                        <span className="text-[10px] text-slate-400 font-medium">— {new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className="text-slate-300 text-xs">{expandedReport === r.id ? '−' : '+'}</span>
                    </button>
                    {expandedReport === r.id && (
                      <div className="px-4 pb-4 pt-1 space-y-4 animate-in slide-in-from-top-2">
                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{r.description}</p>
                        <div className="flex justify-between items-center">
                          {r.image_url ? <a href={r.image_url} target="_blank" className="text-[10px] font-bold text-blue-500 underline">📸 Foto öffnen</a> : <span></span>}
                          <div className="flex gap-2">
                            <button onClick={() => verifyReport(r.id)} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase">Verifizieren</button>
                            <button onClick={() => deleteReport(r.id)} className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-[10px]">✕</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </section>

          {/* PRÜFBUCH / HISTORY */}
          <section className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 ml-1">Prüfbuch</h3>
            {history.map((log, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-xl p-5 flex justify-between items-start">
                    <div className="space-y-1">
                      <time className="text-[10px] font-bold text-blue-500 uppercase">{new Date(log.date).toLocaleDateString()}</time>
                      <p className="text-sm font-medium">{log.description}</p>
                    </div>
                    <span className="text-[9px] font-bold text-slate-300 uppercase bg-slate-50 px-2 py-1 rounded">{log.type}</span>
                  </div>
                ))}
          </section>
        </div>

        {/* SIDEBAR RECHTS */}
        <aside className="space-y-8">
          {/* TECHNIK BOX */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Technik</h3>
            <div className="space-y-4">
              <EditableDataField label="Baujahr" value={ferrata.construction_year} onSave={(v:string) => updateField('construction_year', v)} />
              <EditableDataField label="Seil Ø" value={ferrata.rope_diameter} onSave={(v:string) => updateField('rope_diameter', v)} />
              <EditableDataField label="Seillänge" value={ferrata.rope_length} onSave={(v:string) => updateField('rope_length', v)} />
              <EditableDataField label="Anker" value={ferrata.anchor_count} onSave={(v:string) => updateField('anchor_count', v)} />
            </div>
          </section>
          
          <Link href={`/ferrata/${id}/checkliste`} className="block w-full bg-slate-900 text-white p-5 rounded-xl text-center text-xs font-semibold hover:bg-blue-600 transition-all">Prüfung starten</Link>
          
          {/* ... (Bilder & Docs Boxen können hier folgen) */}
        </aside>
      </div>
    </div>
  </main>
);
}

// Hilfs-Komponenten (EditableField etc. bleiben gleich, nur optisch verfeinert)
function EditableField({ value, onSave, textClass }: any) {
  const [isEdit, setIsEdit] = useState(false);
  const [val, setVal] = useState(value);
  if (isEdit) return <input autoFocus className={`${textClass} bg-slate-100 rounded px-2 py-1 outline-none w-full border border-blue-200`} value={val} onChange={e => setVal(e.target.value)} onBlur={() => { onSave(val); setIsEdit(false); }} onKeyDown={e => e.key === 'Enter' && (e.target as any).blur()} />;
  return <div onClick={() => setIsEdit(true)} className={`${textClass} cursor-text hover:text-blue-600`}>{value || 'Bearbeiten'}</div>;
}

function EditableDataField({ label, value, onSave }: any) {
  return (
    <div className="border-b border-slate-50 pb-2 flex justify-between items-end">
      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{label}</p>
      <EditableField value={value} onSave={onSave} textClass="text-[11px] font-medium text-slate-700 text-right" />
    </div>
  );
}

function Badge({ label, value, color, onEdit }: any) {
  const [isEdit, setIsEdit] = useState(false);
  const [val, setVal] = useState(value);
  return (
    <div onClick={() => setIsEdit(true)} className={`px-5 py-3 rounded-xl min-w-[90px] text-center transition-all cursor-pointer ${color}`}>
      <p className="text-[8px] font-bold uppercase opacity-50 mb-0.5">{label}</p>
      {isEdit ? <input autoFocus className="bg-transparent border-b border-current outline-none w-full text-center text-lg font-bold" value={val} onChange={e => setVal(e.target.value)} onBlur={() => { onEdit?.(val); setIsEdit(false); }} /> : <p className="text-lg font-bold tracking-tight leading-none">{value}</p>}
    </div>
  );
}