"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CloudStatusBadge } from '../components/CloudStatusBadge';
// PDF Importe
import { generateRepairPDF } from '../../lib/pdf-service';
import { generateMultiRepairPDF } from '../../lib/pdf-service';

export default function GlobalTechnicianPage() {
  const [selectedRepairs, setSelectedRepairs] = useState<string[]>([]);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { userEmail, userProfile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [groupedDefects, setGroupedDefects] = useState<Record<string, any[]>>({});
  const [historyGroups, setHistoryGroups] = useState<Record<string, any[]>>({}); 
  
  const [selectedDefect, setSelectedDefect] = useState<any | null>(null);
  const [viewingHistoryDefect, setViewingHistoryDefect] = useState<any | null>(null); // NEU: Detailansicht Historie
  
  const [repairTime, setRepairTime] = useState('');
  const [repairMaterial, setRepairMaterial] = useState('');
  const [repairReport, setRepairReport] = useState('');
  const [repairImages, setRepairImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Offene Mängel laden (unverändert)
    const { data: openData } = await supabase
      .from('defects')
      .select(`*, ferratas!defects_ferrata_id_fkey ( name )`)
      .eq('resolved', false);

    // 2. Erledigte Reparaturen laden (unverändert)
    const { data: historyData } = await supabase
      .from('defects')
      .select(`*, ferratas!defects_ferrata_id_fkey ( name )`)
      .eq('resolved', true)
      .eq('resolved_by', user.id)
      .order('resolved_at', { ascending: false });

    // 3. NEU: Inspektionen laden
    // Wir nehmen an, dass in 'inspections' ein Feld 'inspector_id' oder 'created_by' existiert
    // Falls die Spalte anders heißt, bitte anpassen (z.B. user_id)
    const { data: inspectionData } = await supabase
      .from('inspections')
      .select(`*, ferratas ( name )`)
      .order('date', { ascending: false }); 
      // Optional: .eq('inspector_id', user.id) falls nur eigene gewünscht

    // --- Verarbeitung Offene Mängel ---
    if (openData) {
      const groups = openData.reduce((acc: any, defect: any) => {
        const ferrataName = defect.ferratas?.name || "Unbekannte Anlage";
        if (!acc[ferrataName]) acc[ferrataName] = [];
        acc[ferrataName].push(defect);
        return acc;
      }, {});
      setGroupedDefects(groups);
    }

    // --- Verarbeitung Historie (Reparaturen + Inspektionen) ---
    // Wir führen hier beide Datenquellen zusammen
    const combinedHistory = [
      ...(historyData || []).map(d => ({ 
        ...d, 
        log_type: 'repair', 
        sort_date: d.resolved_at 
      })),
      ...(inspectionData || []).map(i => ({ 
        ...i, 
        log_type: 'inspection', 
        sort_date: i.date,
        title: 'Jahresinspektion', // Inspektionen haben oft keinen Titel-String in der DB
        resolved_at: i.date // Damit das Datum in deiner Liste angezeigt wird
      }))
    ];

    // Sortieren nach Datum (Absteigend)
    combinedHistory.sort((a, b) => new Date(b.sort_date).getTime() - new Date(a.sort_date).getTime());

    if (combinedHistory.length > 0) {
      const hGroups = combinedHistory.reduce((acc: any, item: any) => {
        const ferrataName = item.ferratas?.name || "Unbekannte Anlage";
        if (!acc[ferrataName]) acc[ferrataName] = [];
        acc[ferrataName].push(item);
        return acc;
      }, {});
      setHistoryGroups(hGroups);
    } else {
      setHistoryGroups({});
    }

  } catch (err: any) {
    console.error("Fetch Error:", err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (!authLoading) {
      if (!userEmail) router.push('/login');
      else fetchData();
    }
  }, [authLoading, userEmail]);

  const handleRepairComplete = async () => {
    if (!selectedDefect || !repairReport) return;
    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uploadedUrls: string[] = [];

      for (const file of repairImages) {
        const path = `repairs/${selectedDefect.ferrata_id}/${Date.now()}_${file.name}`;
        await supabase.storage.from('reports').upload(path, file);
        const { data: urlData } = supabase.storage.from('reports').getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error: updateError } = await supabase.from('defects').update({
        repair_time: repairTime,
        repair_material: repairMaterial,
        repair_report: repairReport,
        repair_image_urls: uploadedUrls,
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id 
      }).eq('id', selectedDefect.id);

      if (updateError) throw updateError;

      await supabase.from('maintenance_logs').insert([{
        ferrata_id: selectedDefect.ferrata_id,
        log_type: 'Reparatur', 
        description: `ERLEDIGT: ${selectedDefect.title}. Durch: ${userProfile?.full_name || userEmail}`,
        date: new Date().toISOString()
      }]);

      setSelectedDefect(null);
      setRepairImages([]);
      setRepairReport('');
      setRepairTime('');
      setRepairMaterial('');
      fetchData();
    } catch (err: any) {
      alert("Fehler beim Speichern: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-[#fafafa] pb-32">
      <div className="max-w-4xl mx-auto px-6 pt-12 space-y-16">
        
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Techniker-Dashboard</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mt-1">Einsatzplanung & Dokumentation</p>
          </div>
          <CloudStatusBadge />
        </header>

        {/* SEKTION 1: OFFENE AUFTRÄGE */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Offene Reparaturen</h2>
             <div className="h-px flex-1 bg-slate-100"></div>
          </div>
          
          {loading ? <div className="animate-pulse h-20 bg-white rounded-3xl" /> : (
            Object.entries(groupedDefects).map(([name, defects]) => (
              <div key={name} className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">{name}</p>
                <div className="grid gap-2">
                  {defects.map(d => (
                    <div key={d.id} onClick={() => setSelectedDefect(d)} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 hover:border-orange-400 cursor-pointer transition-all">
                      <div className={`w-1 h-8 rounded-full ${d.priority === 'Kritisch' ? 'bg-red-500' : 'bg-orange-400'}`} />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400">{d.location}</p>
                        <h4 className="text-sm font-bold text-slate-800">{d.title}</h4>
                      </div>
                      <span className="text-xs">🔧</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* SEKTION 2: EIGENE HISTORIE */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Meine erledigten Einsätze</h2>
             <div className="h-px flex-1 bg-slate-100"></div>
          </div>

          {Object.entries(historyGroups).length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-10">Noch keine abgeschlossenen Einsätze dokumentiert.</p>
          ) : (
            Object.entries(historyGroups).map(([name, defects]) => (
              <div key={name} className="space-y-3">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">{name}</p>
                <div className="grid gap-2">
{defects.map(d => {
  const isSelected = selectedRepairs.includes(d.id);
  const isInspection = d.log_type === 'inspection'; // Unterscheidung
  
  return (
    <div 
      key={d.id} 
      onClick={() => setViewingHistoryDefect(d)}
      className={`bg-white border rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all group ${
        isSelected ? 'border-blue-500 shadow-md shadow-blue-50' : 'border-slate-100 hover:border-blue-300'
      }`}
    >
      {/* CHECKBOX (Nur bei Mängeln sinnvoll, bei Inspektionen evtl. ausblenden) */}
      {!isInspection && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (isSelected) {
              setSelectedRepairs(selectedRepairs.filter(id => id !== d.id));
            } else {
              setSelectedRepairs([...selectedRepairs, d.id]);
            }
          }}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
            isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200 group-hover:border-blue-400'
          }`}
        >
          {isSelected && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      {/* FARBLICHER INDIKATOR: Orange für Reparatur, Blau/Grün für Inspektion */}
      <div className={`w-1 h-8 rounded-full ${isInspection ? 'bg-emerald-500' : (isSelected ? 'bg-blue-600' : 'bg-orange-400')}`} />
      
      <div className="flex-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase">
          {isInspection ? '🛡️ Sicherheits-Check' : '🔧 Reparatur abgeschlossen'}
        </p>
        <p className="text-[9px] font-medium text-slate-400">
          {new Date(d.date_for_sort).toLocaleDateString('de-DE')} {d.repair_time ? `— ${d.repair_time}` : ''}
        </p>
        <h4 className={`text-xs font-bold ${isInspection ? 'text-emerald-900' : (isSelected ? 'text-blue-900' : 'text-slate-600')}`}>
          {d.title}
        </h4>
      </div>
      
      <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-tighter">
        Bericht 📄
      </span>
    </div>
  );
})}
                </div>
              </div>
            ))
          )}
          
        </div>
      </div>


      {/* REPARATUR LIGHTBOX (Offene Mängel) */}
      {selectedDefect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Einsatz dokumentieren</h2>
                <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mt-1">
                  {selectedDefect.ferratas?.name} — {selectedDefect.title}
                </p>
              </div>
              <button onClick={() => setSelectedDefect(null)} className="text-3xl text-slate-300 hover:text-slate-900 transition-colors">×</button>
            </div>

            <div className="overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arbeitszeit</label>
                   <input type="text" placeholder="z.B. 2h" value={repairTime} onChange={e => setRepairTime(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white focus:border-orange-200 transition-all" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Material</label>
                   <input type="text" placeholder="z.B. Drahtseilklemme" value={repairMaterial} onChange={e => setRepairMaterial(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white focus:border-orange-200 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technischer Bericht *</label>
                <textarea value={repairReport} onChange={e => setRepairReport(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm min-h-[120px] outline-none focus:bg-white focus:border-orange-200 transition-all" placeholder="Beschreibe die durchgeführten Maßnahmen..." />
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ergebnis-Fotos</p>
                <div className="flex flex-wrap gap-4">
                   <label className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-orange-200 transition-all text-slate-300">
                     <span className="text-xl">📸</span>
                     <input type="file" multiple className="hidden" onChange={e => e.target.files && setRepairImages(Array.from(e.target.files))} />
                   </label>
                   {repairImages.map((f, i) => (
                     <div key={i} className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group">
                       <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="Preview" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button onClick={() => setRepairImages(prev => prev.filter((_, idx) => idx !== i))} className="text-white text-xs font-bold">Löschen</button>
                       </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-50 bg-slate-50 flex gap-4">
               <button onClick={() => setSelectedDefect(null)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Abbrechen</button>
               <button 
                 onClick={handleRepairComplete} 
                 disabled={uploading || !repairReport} 
                 className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-100 disabled:bg-slate-300 disabled:shadow-none active:scale-[0.98] transition-all"
               >
                 {uploading ? 'Wird gespeichert...' : 'Einsatz abschließen'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL LIGHTBOX (Historie) */}
      {viewingHistoryDefect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Reparatur-Details</h2>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Abgeschlossener Einsatz</p>
              </div>
              <button onClick={() => setViewingHistoryDefect(null)} className="text-2xl text-slate-300 hover:text-slate-900 transition-colors">×</button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Zeitaufwand</p>
                  <p className="text-sm font-bold text-slate-700">{viewingHistoryDefect.repair_time || 'k.A.'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Material</p>
                  <p className="text-sm font-bold text-slate-700">{viewingHistoryDefect.repair_material || 'Keines'}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Durchgeführte Arbeiten</p>
                <div className="bg-slate-50 rounded-2xl p-4 text-xs leading-relaxed text-slate-600 border border-slate-100 italic">
                  "{viewingHistoryDefect.repair_report}"
                </div>
              </div>

              {viewingHistoryDefect.repair_image_urls?.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Dokumentation</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {viewingHistoryDefect.repair_image_urls.map((url: string, i: number) => (
                      <img key={i} src={url} className="w-20 h-20 object-cover rounded-xl border border-slate-100 flex-shrink-0" alt="Repair" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 rounded-b-[2.5rem] flex gap-3">

              <button 
                onClick={async () => {
                  if (isPdfGenerating) return; // Doppelklicks verhindern
                  setIsPdfGenerating(true);
                  
                  const branding = {
                    logoUrl: "/logo_ferrata.jpg", // Hier später die URL einfügen
                    slogan: "Klettersteigbau - Sanierung - Wartung | Alpiner Wegebau - Festigkeitsprüfungen",
                    footerText: "ferrata.buid — Günther Ausserhofer | info@faszination-berg.com - +39 347 4138336 - Südtirol"
                  };

                  const pdfData = {
                    title: "Reparaturbericht",
                    ferrataName: viewingHistoryDefect.ferratas?.name,
                    technicianName: userProfile?.full_name || userEmail,
                    date: new Date(viewingHistoryDefect.resolved_at).toLocaleDateString('de-DE'),
                    content: {
                      report: viewingHistoryDefect.repair_report,
                      material: viewingHistoryDefect.repair_material,
                      time: viewingHistoryDefect.repair_time,
                      location: viewingHistoryDefect.location,
                      images: viewingHistoryDefect.repair_image_urls
                    }
                  };

                  try {
                    await generateRepairPDF(branding, pdfData);
                  } catch (error) {
                    console.error("Fehler beim PDF-Export", error);
                  } finally {
                    setIsPdfGenerating(false);
                  }
                }}
                disabled={isPdfGenerating}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 ${
                  isPdfGenerating 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-blue-200 cursor-pointer'
                }`}
              >
                {isPdfGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    Wird generiert...
                  </>
                ) : (
                  <>
                    <span>📥</span> PDF Protokoll generieren
                  </>
                )}
              </button>

            </div>
          </div>
        </div>
      )}
  
{/* DER FLOATING EXPORT BUTTON */}
{selectedRepairs.length > 0 && (
  <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50 animate-in slide-in-from-bottom-10 duration-500">
    <button
      onClick={async () => {
        if (isPdfGenerating) return;
        setIsPdfGenerating(true);
        try {
          const allDefects = Object.values(historyGroups).flat();
          const dataToExport = allDefects
            .filter(item => selectedRepairs.includes(item.id))
            .map((item: any) => ({
              title: "Reparaturbericht",
              ferrataName: item.ferratas?.name,
              technicianName: userProfile?.full_name || userEmail,
              date: new Date(item.resolved_at).toLocaleDateString('de-DE'),
              content: {
                report: item.repair_report,
                material: item.repair_material,
                time: item.repair_time,
                location: item.location,
                images: item.repair_image_urls
              }
            }));

          const branding = {
            logoUrl: "/logo_ferrata.jpg",
            slogan: "Klettersteigbau - Sanierung - Wartung | Alpiner Wegebau - Festigkeitsprüfungen",
            footerText: "ferrata.buid — Günther Ausserhofer | info@faszination-berg.com - +39 347 4138336 - Südtirol"
          };

          await generateMultiRepairPDF(branding, dataToExport);
          setSelectedRepairs([]); 
        } catch (err) {
          console.error("Multi PDF Error:", err);
        } finally {
          setIsPdfGenerating(false);
        }
      }}
      disabled={isPdfGenerating}
      className={`w-full py-5 rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 ${
        isPdfGenerating 
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
          : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-blue-200 cursor-pointer'
      }`}
    >
      {isPdfGenerating ? (
        <>
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span className="font-black text-[11px] uppercase tracking-[0.2em]">Generiere...</span>
        </>
      ) : (
        <>
          <span className="text-xl">📥</span>
          <span className="font-black text-[11px] uppercase tracking-[0.2em]">
            {selectedRepairs.length} {selectedRepairs.length === 1 ? 'Bericht' : 'Berichte'} exportieren
          </span>
        </>
      )}
    </button>
  </div>
)}

    </main>
  );
}