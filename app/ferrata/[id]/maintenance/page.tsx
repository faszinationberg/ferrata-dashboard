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
  
  // Oben bei den States hinzufügen:
const [adminComment, setAdminComment] = useState('');

const handleAction = async (action: 'verify' | 'discard') => {
  if (!selectedReport) return;

  if (action === 'discard') {
    if (!confirm("Meldung wirklich löschen?")) return;
    const { error } = await supabase.from('reports').delete().eq('id', selectedReport.id);
    if (!error) fetchData();
  } else {
    // Kommentar an Beschreibung hängen, falls vorhanden
    const finalDescription = adminComment 
      ? `${selectedReport.description} | INTERN: ${adminComment}` 
      : selectedReport.description;

    const { error } = await supabase.from('reports')
      .update({ 
        verified: true, 
        priority: tempPrio || 'orange',
        description: finalDescription // Hier wird die Beschreibung aktualisiert
      })
      .eq('id', selectedReport.id);

    if (!error) fetchData();
  }
  
  // Reset
  setSelectedReport(null);
  setTempPrio(null);
  setAdminComment('');
};

  // Lightbox-States
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [tempPrio, setTempPrio] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'maintenance': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'winter': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'closed': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: ferrataData } = await supabase.from('ferratas').select('name, status').eq('id', id).single();
    // Wir holen alle nicht erledigten Reports
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
    const { error } = await supabase.from('ferratas').update({ [field]: value }).eq('id', id);
    if (!error) setFerrata((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-6 h-6 border-2 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div></div>;

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans pb-32">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-8">
          <div>
            <button onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-900 text-xs font-medium mb-4 block">
              ← Dashboard
            </button>
            <h1 className="text-3xl font-semibold tracking-tight">{ferrata?.name}</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 mt-1">Wartungs-Zentrale</p>
          </div>
          <Badge 
              label="Klettersteig-Status" 
              value={ferrata?.status} 
              onEdit={(v: string) => updateField('status', v)} 
              color={getStatusColor(ferrata?.status)} 
          />
        </header>

        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
  
  {/* 1. MODUL: USER FEED (POSTEINGANG) */}
  <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
    <div className="flex justify-between items-center border-b border-slate-50 pb-6">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User-Feed & Meldungen</h3>
        <p className="text-[10px] text-orange-500 mt-1 font-bold uppercase tracking-wider">
          {userReports.length} Ungeprüfte Einträge
        </p>
      </div>
      <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black">NEU</div>
    </div>

    <div className="grid gap-3">
      {userReports.length === 0 && (
        <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <p className="text-xs text-slate-300 italic font-light">Keine neuen Meldungen im Eingang.</p>
        </div>
      )}
      {userReports.map((r) => (
        <div 
          key={r.id} 
          onClick={() => setSelectedReport(r)}
          className="bg-slate-50 border border-slate-100 p-5 rounded-3xl shadow-sm hover:border-blue-300 transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0 flex items-center justify-center">
              {r.image_urls?.[0] ? (
                <img src={r.image_urls[0]} className="w-full h-full object-cover" alt="Vorschau" />
              ) : (
                <span className="text-[10px] text-slate-300 font-bold uppercase">INFO</span>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-700">
                <span className="font-bold text-blue-600">{r.reporter_name || 'Anonym'}</span> 
                <span className="text-slate-400 mx-1">•</span>
                <span className="text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
              </p>
              <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">"{r.description}"</p>
            </div>
          </div>
          <div className="bg-white p-2 rounded-xl text-slate-300 group-hover:text-blue-500 group-hover:shadow-sm transition-all">
            <span className="text-sm">→</span>
          </div>
        </div>
      ))}
    </div>
  </section>

  {/* 2. MODUL: MÄNGEL (OFFIZIELL) */}
  <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
    <div className="flex justify-between items-center border-b border-slate-50 pb-6">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Offizielle Mängelliste</h3>
        <p className="text-[10px] text-red-500 mt-1 font-bold uppercase tracking-wider">
          {defects.length} Offene Mängel
        </p>
      </div>
      <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black">AKTIV</div>
    </div>
    
    <div className="grid gap-3">
      {defects.length === 0 && (
        <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <p className="text-xs text-slate-300 italic font-light">Aktuell keine offiziellen Mängel dokumentiert.</p>
        </div>
      )}
      {defects.map((d) => (
        <div key={d.id} className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex items-center gap-6 shadow-sm hover:border-blue-200 transition-all">
          <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${d.priority === 'kritisch' || d.priority === 'hoch' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'bg-orange-400'}`}></div>
          <div className="flex-1">
            <div className="flex gap-2 text-[9px] font-bold uppercase text-slate-400 mb-1">
              <span className="text-slate-900">{d.type}</span>
              {d.location && <span>📍 {d.location}</span>}
            </div>
            <p className="text-sm font-medium text-slate-700 leading-snug">{d.description}</p>
          </div>
          <button 
            onClick={() => resolveDefect(d)} 
            className="px-5 py-2.5 rounded-xl text-[10px] font-bold bg-white text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm uppercase tracking-wider"
          >
            Behoben ✓
          </button>
        </div>
      ))}
    </div>
  </section>

  {/* 3. MODUL: WARTUNGSHISTORIE */}
  <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
    <div className="border-b border-slate-50 pb-6">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Wartungshistorie</h3>
      <p className="text-[10px] text-blue-500 mt-1 font-bold uppercase tracking-wider">
        Archivierte Maßnahmen
      </p>
    </div>

    <div className="space-y-4 border-l-2 border-slate-100 ml-4 pl-8 relative">
      {history.length === 0 && <p className="text-xs text-slate-300 italic -ml-4">Noch keine Einträge vorhanden.</p>}
      {history.map((log, i) => (
        <div key={i} className="relative mb-8 last:mb-0">
          {/* Timeline Dot */}
          <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-white border-4 border-blue-500 shadow-sm"></div>
          
          <div className="bg-slate-50 border border-slate-50 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <time className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">
                {new Date(log.date).toLocaleDateString('de-DE')}
              </time>
              <span className="text-[9px] font-black text-slate-400 uppercase bg-white border border-slate-100 px-2 py-0.5 rounded-lg shadow-sm">
                {log.type}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">{log.description}</p>
            <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
              Techniker: {log.performed_by || 'Wartungsteam'}
            </p>
          </div>
        </div>
      ))}
    </div>
  </section>
</div>

      </div>

      {/* LIGHTBOX / REPORT MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 overflow-y-auto space-y-8">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">Meldung prüfen</h2>
                <button onClick={() => setSelectedReport(null)} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl">
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Melder</p>
                  <p className="text-sm font-bold text-slate-700">{selectedReport.reporter_name}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Kontakt</p>
                  <p className="text-sm text-slate-600">{selectedReport.reporter_email || selectedReport.reporter_phone || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Beschreibung</p>
                <p className="text-sm text-slate-600 italic leading-relaxed">"{selectedReport.description}"</p>
              </div>

              {selectedReport.image_urls?.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {selectedReport.image_urls.map((img: string, i: number) => (
                    <img key={i} src={img} className="h-40 w-64 object-cover rounded-3xl border border-slate-100" />
                  ))}
                </div>
              )}

              <div className="space-y-2">
  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
    Interner Kommentar / Anweisung
  </p>
  <textarea 
    placeholder="Zusätzliche Infos für das Wartungsteam..."
    value={adminComment}
    onChange={(e) => setAdminComment(e.target.value)}
    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs min-h-[80px] focus:border-blue-500 outline-none transition-all"
  />
</div>

              <div className="pt-8 border-t border-slate-100 space-y-6">
                <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">Aktion auswählen</p>
                <div className="grid grid-cols-4 gap-2">
                  {['niedrig', 'mittel', 'hoch', 'kritisch'].map((prio) => (
                    <button 
                      key={prio} 
                      onClick={() => setTempPrio(prio)}
                      className={`py-3 rounded-2xl text-[10px] font-bold uppercase transition-all border ${tempPrio === prio ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button onClick={() => handleAction('discard')} className="py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:text-red-500">Verwerfen</button>
                  <button onClick={() => handleAction('verify')} disabled={!tempPrio} className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-blue-100 disabled:bg-slate-100 transition-all">Übernehmen</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Badge Komponente bleibt gleich wie in deinem Entwurf (nur leicht gesäubert)
function Badge({ label, value, color, onEdit }: any) {
  const [isEdit, setIsEdit] = useState(false);
  const statusOptions = [
    { label: 'Geöffnet', value: 'open' },
    { label: 'Gesperrt', value: 'closed' },
    { label: 'Gesperrt - Wartung', value: 'maintenance' },
    { label: 'Winterpause', value: 'winter' },
    { label: 'Unbekannt', value: 'unknown' }
  ];
  return (
    <div className="relative inline-block">
      <div onClick={() => setIsEdit(!isEdit)} className={`px-5 py-3 rounded-2xl min-w-[180px] transition-all border shadow-sm flex flex-col items-center cursor-pointer hover:border-blue-400 ${color}`}>
        <p className="text-[8px] font-bold uppercase opacity-50 mb-1 tracking-[0.2em]">{label}</p>
        <div className="flex items-center justify-center w-full relative">
          <p className="text-sm font-bold uppercase tracking-tight leading-none">
            {statusOptions.find(o => o.value === value)?.label || value}
          </p>
          <span className="text-[10px] opacity-30 absolute right-0">▾</span>
        </div>
      </div>
      {isEdit && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsEdit(false)}></div>
          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {statusOptions.map((opt) => (
              <button key={opt.value} className={`w-full py-4 px-4 text-[11px] font-bold uppercase border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${value === opt.value ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                onClick={() => { onEdit(opt.value); setIsEdit(false); }}>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}