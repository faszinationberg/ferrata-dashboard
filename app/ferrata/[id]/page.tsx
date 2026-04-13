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

// Meldung vom User-Feed in die offizielle Mängelliste verschieben
const verifyReport = async (reportId: string) => {
  const { error } = await supabase
    .from('reports')
    .update({ 
      verified: true,
      priority: 'orange' // Standardmäßig auf Wartung setzen
    })
    .eq('id', reportId);

  if (error) {
    alert("Fehler beim Verifizieren: " + error.message);
  } else {
    fetchData(); // UI aktualisieren
  }
};

// Meldung löschen (falls Spam oder ungültig)
const deleteReport = async (reportId: string) => {
  if (!confirm("Meldung wirklich löschen?")) return;
  
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId);

  if (error) {
    alert("Fehler beim Löschen: " + error.message);
  } else {
    fetchData(); // UI aktualisieren
  }
};

const resolveDefect = async (defect: any) => {
  setLoading(true);
  try {
    // 1. Mangel als erledigt markieren
    const { error: updateError } = await supabase
      .from('reports')
      .update({ 
        resolved: true,
        resolved_at: new Date().toISOString() 
      })
      .eq('id', defect.id);

    if (updateError) throw updateError;

    // 2. Eintrag in der Wartungshistorie (Maintenance Logs) erstellen
    const { error: logError } = await supabase
      .from('maintenance_logs')
      .insert([
        {
          ferrata_id: id,
          report_id: defect.id,
          type: 'Reparatur',
          description: `BEHOBEN: ${defect.type} - ${defect.description}`,
          date: new Date().toISOString().split('T')[0], // Nur das Datum YYYY-MM-DD
          performed_by: 'Wartungsteam' // Hier könnte später der User-Name stehen
        }
      ]);

    if (logError) throw logError;

    alert("Mangel behoben und in Historie archiviert!");
    fetchData(); // Liste neu laden

  } catch (err: any) {
    alert("Fehler beim Archivieren: " + err.message);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { if (id) fetchData(); }, [id]);

  const updateField = async (field: string, value: any) => {
    const { error } = await supabase.from('ferratas').update({ [field]: value }).eq('id', id);
    if (!error) fetchData();
  };

  const handleUpload = async (e: any, bucket: string, dbField: string) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `${id}/${Date.now()}_${file.name}`;
    const { data: storageData, error: storageError } = await supabase.storage.from(bucket).upload(filePath, file);

    if (storageError) {
      alert("Upload fehlgeschlagen: " + storageError.message);
      return;
    }

    if (storageData) {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const newItem = { url: urlData.publicUrl, title: file.name, date: new Date().toLocaleDateString() };
      const currentList = Array.isArray(ferrata[dbField]) ? ferrata[dbField] : [];
      const newList = [...currentList, newItem];
      
      const { error: dbError } = await supabase.from('ferratas').update({ [dbField]: newList }).eq('id', id);
      if (!dbError) fetchData();
    }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-blue-600 uppercase tracking-widest">Daten-Synchronisation...</div>;
  if (!ferrata) return <div className="p-20 text-center font-bold">Anlage nicht gefunden.</div>;

  const displayImages = (ferrata.images && ferrata.images.length > 0) ? ferrata.images : [{ url: ferrata.topo_url || '', title: "Übersicht" }];

  return (
    <main className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-slate-900 pb-32">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* HEADER */}
        <header>
          <button onClick={() => router.push('/')} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all">← Dashboard</button>
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <EditableField value={ferrata.region} onSave={(v:string) => updateField('region', v)} textClass="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2" />
              <h1 className="text-4xl font-black tracking-tighter italic leading-none">{ferrata.name}</h1>
              <button onClick={() => setShowTopoModal(true)} className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg">🗺️ Topo öffnen</button>
            </div>
            <div className="flex gap-4">
              <Badge label="Grad" value={ferrata.difficulty} onEdit={(v:string) => updateField('difficulty', v)} color="bg-slate-900 text-white" />
              <Badge label="Status" value={ferrata.status === 'open' ? 'AKTIV' : 'GESPERRT'} onEdit={(v:string) => updateField('status', v.toLowerCase() === 'aktiv' ? 'open' : 'closed')} color={ferrata.status === 'open' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'} />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* LINKER BEREICH (Volle Breite für Listen) */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* MÄNGEL */}
            {/* MÄNGEL-SEKTION */}
              <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-8">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">🛠️ Aktuelle Mängel</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Offizielle Wartungsliste</p>
                  </div>
                  <Link 
                    href={`/ferrata/${id}/defect`} 
                    className="bg-slate-900 text-white w-12 h-12 rounded-full flex items-center justify-center font-black shadow-lg hover:scale-110 hover:bg-blue-600 transition-all active:scale-95"
                  >
                    +
                  </Link>
                </div>

                <div className="space-y-4">
                  {defects.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-slate-50 rounded-[2rem]">
                      <p className="text-slate-300 text-sm italic">Keine offenen Mängel dokumentiert.</p>
                    </div>
                  )}
                  
                  {defects.map((d) => (
                    <div key={d.id} className="group flex flex-col md:flex-row md:items-center gap-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100">
                      
                      {/* Prioritäts-Indikator */}
                      <div className={`w-3 h-12 md:w-2 md:h-16 rounded-full flex-shrink-0 ${
                        d.priority === 'red' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 
                        d.priority === 'orange' ? 'bg-orange-400' : 'bg-yellow-400'
                      }`}></div>

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-3 py-1 bg-white rounded-full border border-slate-100 text-slate-500">
                            {d.type}
                          </span>
                          {d.location && (
                            <span className="text-[10px] font-black uppercase px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                              📍 {d.location}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-400 ml-auto">
                            {new Date(d.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="font-bold text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                          {d.description}
                        </p>

                        {/* Anzeige ob Foto vorhanden ist */}
                        {d.image_url && (
                          <div className="pt-2">
                            <a 
                              href={d.image_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[9px] font-black uppercase text-blue-500 hover:underline flex items-center gap-1"
                            >
                              📸 Foto ansehen
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {/* Ändere den Button in deiner Mängel-Liste wie folgt: */}
                      <button 
                        onClick={() => resolveDefect(d)} // Hier d (das ganze Objekt) übergeben
                        className="bg-green-50 text-green-700 border border-green-100 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-green-600 hover:text-white transition-all"
                      >
                        Erledigt ✓
                      </button>
                    </div>
                  ))}
                </div>
              </section>

            {/* USER FEED */}
            {/* USER FEED (DATENBANK-VERKNÜPFT) */}
<section className="bg-amber-50/50 p-10 rounded-[3rem] border-2 border-dashed border-amber-200">
  <div className="flex justify-between items-center mb-8">
    <div className="space-y-1">
      <h3 className="text-2xl font-black italic text-amber-700 uppercase tracking-tight leading-none">
        📩 Ungeprüfter Feed
      </h3>
      <p className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest">
        Meldungen von Externen (Wanderer/Kletterer)
      </p>
    </div>
    <div className="bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
       <span className="text-[10px] font-black text-amber-600 uppercase">Neu: {userReports.length}</span>
    </div>
  </div>

  <div className="space-y-4">
    {userReports.length === 0 && (
      <div className="text-center py-6">
        <p className="text-amber-600/40 text-sm italic">Derzeit keine neuen Meldungen im Feed.</p>
      </div>
    )}

    {userReports.map((r) => (
      <div key={r.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-transparent hover:border-amber-200 transition-all group">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-amber-500 uppercase bg-amber-50 px-2 py-0.5 rounded-full">
              {r.type}
            </span>
            <span className="text-[9px] font-bold text-slate-400">
              {new Date(r.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="font-bold text-slate-800 leading-tight">
            {r.description}
          </p>
          {r.location && (
            <p className="text-[10px] text-slate-400 font-medium italic">
              📍 Ort: {r.location}
            </p>
          )}
          {r.image_url && (
            <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="inline-block pt-1 text-[9px] font-black text-blue-500 hover:underline">
              📸 Foto der Meldung ansehen
            </a>
          )}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {/* Verifizieren Button */}
          <button 
            onClick={() => verifyReport(r.id)}
            className="flex-1 md:flex-none bg-amber-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all active:scale-95"
          >
            Übernehmen
          </button>
          
          {/* Löschen Button (falls es Spam ist) */}
          <button 
            onClick={() => deleteReport(r.id)}
            className="bg-slate-100 text-slate-400 p-3 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
            title="Meldung verwerfen"
          >
            ✕
          </button>
        </div>
      </div>
    ))}
  </div>
</section>

            {/* HISTORIE (Jetzt wieder volle Breite) */}
            {/* WARTUNGSHISTORIE TIMELINE */}
<section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
  <div className="flex justify-between items-center mb-10">
    <div className="space-y-1">
      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-400">📜 Prüfbuch & Historie</h3>
      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Lückenlose Dokumentation der Anlage</p>
    </div>
    <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
      <span className="text-[10px] font-black text-slate-400 uppercase">Einträge: {history.length}</span>
    </div>
  </div>

  <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-100 before:to-transparent">
    
    {history.length === 0 && (
      <p className="text-center text-slate-300 text-sm italic py-10">Noch keine historischen Daten vorhanden.</p>
    )}

    {history.map((log, i) => (
      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
        
        {/* Der Punkt auf der Timeline */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-900 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform group-hover:scale-110">
          <span className="text-[10px] font-black">{history.length - i}</span>
        </div>

        {/* Die Inhalts-Karte */}
        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100">
          <div className="flex items-center justify-between mb-2">
            <time className="font-black text-[10px] text-blue-600 uppercase tracking-widest">
              {new Date(log.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </time>
            <span className="px-3 py-1 bg-white rounded-full text-[8px] font-black uppercase text-slate-400 border border-slate-100">
              {log.type}
            </span>
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-slate-800 italic uppercase tracking-tight">{log.description}</h4>
            <div className="flex items-center gap-2 pt-2">
              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px]">👤</div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Prüfer: {log.performed_by || 'Technik-Team'}</p>
            </div>
            {log.result && (
              <p className="mt-2 text-[11px] text-slate-500 font-medium leading-relaxed bg-white/50 p-3 rounded-xl border border-slate-50">
                Ergebnis: {log.result}
              </p>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
</section>

            {/* VERWALTUNG & GEO (Zwei Spalten nebeneinander) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
                <h3 className="text-xl font-black mb-6 italic text-slate-400 uppercase">Verwaltung</h3>
                <div className="space-y-4">
                  <EditableDataField label="Betreiber" value={ferrata.operator} onSave={(v:string) => updateField('operator', v)} />
                  <EditableDataField label="Technik" value={ferrata.technician} onSave={(v:string) => updateField('technician', v)} />
                  <div className="flex justify-between items-center pt-2">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Wartungsvertrag</p>
                    <button onClick={() => updateField('maintenance_contract', !ferrata.maintenance_contract)} className={`px-3 py-1 rounded-lg text-[10px] font-black ${ferrata.maintenance_contract ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {ferrata.maintenance_contract ? "AKTIV" : "INAKTIV"}
                    </button>
                  </div>
                </div>
              </section>
              <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
                <h3 className="text-xl font-black mb-6 italic text-slate-400 uppercase">Geo-Daten</h3>
                <div className="space-y-4">
                  <EditableDataField label="Höhenmeter" value={ferrata.vertical_meters} onSave={(v:string) => updateField('vertical_meters', v)} />
                  <EditableDataField label="Start-GPS" value={ferrata.coord_start} onSave={(v:string) => updateField('coord_start', v)} />
                </div>
              </section>
            </div>
          </div>

          {/* SIDEBAR (RECHTS) */}
          <aside className="space-y-10">
            <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
              <h3 className="text-xl font-black mb-6 italic text-slate-400 uppercase tracking-tighter text-center">Technik</h3>
              <div className="space-y-4">
                <EditableDataField label="Baujahr" value={ferrata.construction_year} onSave={(v:string) => updateField('construction_year', v)} />
                <EditableDataField label="Seil-Ø (mm)" value={ferrata.rope_diameter} onSave={(v:string) => updateField('rope_diameter', v)} />
                <EditableDataField label="Seillänge (m)" value={ferrata.rope_length} onSave={(v:string) => updateField('rope_length', v)} />
                <EditableDataField label="Ankeranzahl" value={ferrata.anchor_count} onSave={(v:string) => updateField('anchor_count', v)} />
                <EditableDataField label="Felsqualität" value={ferrata.rock_quality} onSave={(v:string) => updateField('rock_quality', v)} />
              </div>
            </section>

            <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black italic text-slate-400 uppercase">Bilder</h3>
                <label htmlFor="gal-upload" className="cursor-pointer bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg">+</label>
                <input id="gal-upload" type="file" className="hidden" onChange={(e) => handleUpload(e, 'topos', 'images')} accept="image/*" />
              </div>
              <img src={displayImages[activeImgIndex]?.url} className="w-full aspect-video object-cover rounded-2xl mb-4 shadow-inner" alt="Gallery" />
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {displayImages.map((img: any, i: number) => (
                  <button key={i} onClick={() => setActiveImgIndex(i)} className={`h-12 w-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${activeImgIndex === i ? 'border-blue-600 scale-95 shadow-lg' : 'border-transparent opacity-40'}`}>
                    <img src={img.url} className="w-full h-full object-cover" alt="thumb" />
                  </button>
                ))}
              </div>
            </section>

            {/* DOKUMENTE (Wichtig: dbField muss 'docs' sein) */}
            <section className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black italic uppercase">Dokumente</h3>
                <label htmlFor="doc-upload" className="cursor-pointer bg-white/20 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-white/30 transition-all">+</label>
                <input id="doc-upload" type="file" className="hidden" onChange={(e) => handleUpload(e, 'docs', 'docs')} accept=".pdf,.doc,.docx" />
              </div>
              <div className="space-y-3">
                {Array.isArray(ferrata.docs) && ferrata.docs.length > 0 ? (
                  ferrata.docs.map((doc: any, i: number) => (
                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="block w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl flex justify-between items-center transition-all text-[10px] font-black uppercase tracking-widest leading-none">
                      <span className="truncate max-w-[150px]">{doc.title}</span> 📥
                    </a>
                  ))
                ) : (
                  <p className="text-xs text-white/40 italic">Keine Dokumente hinterlegt.</p>
                )}
              </div>
            </section>

            <Link href={`/ferrata/${id}/checkliste`} className="block bg-blue-600 text-white p-10 rounded-[3rem] shadow-2xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all text-center uppercase font-black italic leading-tight">Prüfung starten</Link>
          </aside>
        </div>

        {showTopoModal && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowTopoModal(false)}>
            <div className="bg-white p-4 rounded-[3rem] max-w-5xl relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowTopoModal(false)} className="absolute top-8 right-8 bg-slate-100 w-12 h-12 rounded-full font-black text-xl flex items-center justify-center shadow-lg">✕</button>
              <img src={ferrata.topo_url} className="max-h-[85vh] w-full object-contain rounded-2xl" alt="Full Topo" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// HELPER COMPONENTS
function EditableField({ value, onSave, textClass }: any) {
  const [isEdit, setIsEdit] = useState(false);
  const [val, setVal] = useState(value);
  if (isEdit) return <input autoFocus className={`${textClass} bg-slate-100 rounded p-1 w-full text-slate-900 outline-none`} value={val} onChange={e => setVal(e.target.value)} onBlur={() => { onSave(val); setIsEdit(false); }} onKeyDown={e => e.key === 'Enter' && (e.target as any).blur()} />;
  return <div onClick={() => setIsEdit(true)} className={`${textClass} cursor-text hover:bg-slate-100/50 rounded px-1 -ml-1`}>{value || '---'}</div>;
}

function EditableDataField({ label, value, onSave }: any) {
  return (
    <div className="border-b border-slate-50 pb-2">
      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">{label}</p>
      <EditableField value={value} onSave={onSave} textClass="font-black text-slate-800 text-xs" />
    </div>
  );
}

function Badge({ label, value, color, onEdit }: any) {
  const [isEdit, setIsEdit] = useState(false);
  const [val, setVal] = useState(value);
  return (
    <div onClick={() => setIsEdit(true)} className={`px-6 py-3 rounded-[1.5rem] text-center min-w-[100px] shadow-sm cursor-pointer ${color}`}>
      <p className="text-[8px] font-black uppercase opacity-60 leading-none mb-1">{label}</p>
      {isEdit ? <input autoFocus className="bg-white/20 rounded text-center w-full outline-none text-xl font-black uppercase" value={val} onChange={e => setVal(e.target.value)} onBlur={() => { onEdit?.(val); setIsEdit(false); }} /> : <p className="text-xl font-black tracking-tighter uppercase leading-none">{value}</p>}
    </div>
  );
}