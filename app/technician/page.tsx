"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CloudStatusBadge } from '../components/CloudStatusBadge';

export default function GlobalTechnicianPage() {
  const router = useRouter();
  // Nutze userEmail und loading aus deinem useAuth Hook
  const { userEmail, userProfile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [groupedDefects, setGroupedDefects] = useState<Record<string, any[]>>({});
  
  const [selectedDefect, setSelectedDefect] = useState<any | null>(null);
  const [repairTime, setRepairTime] = useState('');
  const [repairMaterial, setRepairMaterial] = useState('');
  const [repairReport, setRepairReport] = useState('');
  const [repairImages, setRepairImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('defects')
      .select(`
        *,
        ferratas!defects_ferrata_id_fkey (
          name
        )
      `) // Das '!' löst den PGRST201 Fehler auf
      .eq('resolved', false);

    if (error) throw error;

      if (data) {
        const groups = data.reduce((acc: any, defect: any) => {
          const ferrataName = defect.ferratas?.name || "Unbekannte Anlage";
          if (!acc[ferrataName]) acc[ferrataName] = [];
          acc[ferrataName].push(defect);
          return acc;
        }, {});

        const priorityRank: any = { 'kritisch': 1, 'hoch': 2, 'mittel': 3, 'niedrig': 4 };
        
        Object.keys(groups).forEach(key => {
          groups[key].sort((a: any, b: any) => 
            (priorityRank[a.priority?.toLowerCase()] || 99) - (priorityRank[b.priority?.toLowerCase()] || 99)
          );
        });

        setGroupedDefects(groups);
      }
    } catch (err: any) {
      console.error("Fetch Error Details:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  // Auth-Check und Data Fetching
  useEffect(() => {
    if (!authLoading) {
      if (!userEmail) {
        router.push('/login');
      } else {
        fetchData();
      }
    }
  }, [authLoading, userEmail, router]);

  const handleRepairComplete = async () => {
    if (!selectedDefect || !repairReport) return;
    setUploading(true);
    
    try {
      const uploadedUrls: string[] = [];
      for (const file of repairImages) {
        const path = `repairs/${selectedDefect.ferrata_id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('reports').upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('reports').getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error: updateError } = await supabase.from('defects').update({
        repair_time: repairTime,
        repair_material: repairMaterial,
        repair_report: repairReport,
        repair_image_urls: uploadedUrls,
        resolved: true,
        resolved_at: new Date().toISOString()
      }).eq('id', selectedDefect.id);

      if (updateError) throw updateError;

      // Log-Eintrag erstellen
      await supabase.from('maintenance_logs').insert([{
        ferrata_id: selectedDefect.ferrata_id,
        // Hier sicherstellen, dass die Spaltennamen in der DB 'log_type' (oder 'type') entsprechen
        log_type: 'Reparatur', 
        description: `ERLEDIGT: ${selectedDefect.title}. Durch: ${userProfile?.full_name || userEmail}`,
        date: new Date().toISOString()
      }]);

      // State Reset
      setSelectedDefect(null);
      setRepairImages([]);
      setRepairReport('');
      setRepairTime('');
      setRepairMaterial('');
      
      fetchData();
      alert("Einsatz erfolgreich gespeichert!");
    } catch (err: any) {
      alert("Fehler beim Speichern: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#fafafa] pb-32">
      <div className="max-w-4xl mx-auto px-6 pt-12 space-y-12">
        
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Techniker-Dashboard</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mt-1">Anlagenübergreifende Mängelliste</p>
          </div>
          <CloudStatusBadge />
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-t-orange-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.keys(groupedDefects).length === 0 && (
              <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center italic text-slate-300 shadow-sm">
                Aktuell keine offenen Reparaturaufträge vorhanden.
              </div>
            )}

            {Object.entries(groupedDefects).map(([ferrataName, defects]) => (
              <section key={ferrataName} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-4 px-4">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{ferrataName}</h3>
                  <div className="h-[1px] w-full bg-slate-200"></div>
                  <span className="bg-orange-50 text-orange-500 text-[10px] font-black px-2 py-0.5 rounded-md border border-orange-100">{defects.length}</span>
                </div>

                <div className="grid gap-3">
                  {defects.map((d) => (
                    <div 
                      key={d.id} 
                      onClick={() => setSelectedDefect(d)} 
                      className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center gap-6 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
                    >
                      <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${d.priority?.toLowerCase() === 'kritisch' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-orange-400'}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{d.priority}</span>
                          <span className="text-[9px] text-slate-300">•</span>
                          <span className="text-[9px] font-bold text-blue-500 uppercase">{d.location || 'Keine Ortsangabe'}</span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">{d.title || d.type}</h4>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl text-slate-300 group-hover:text-orange-500 group-hover:bg-orange-50 transition-all text-xl">🔧</div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* REPARATUR LIGHTBOX */}
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
                       <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
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
    </main>
  );
}