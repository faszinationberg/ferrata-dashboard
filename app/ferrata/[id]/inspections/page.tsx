"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '../../../../lib/supabase';
import { CloudStatusBadge } from '../../../components/CloudStatusBadge';
import { useImageManager } from '../../../hooks/useImageManager'; 
import { ImageManager } from '../../../components/ImageManager';
import { priorityStyles, PriorityType } from '../../../../lib/priorityConfig';

export default function InspectionDashboard() {
  const router = useRouter();
  const params = useParams();
  const ferrataId = params.id as string;
  const supabase = createClient();

  const { newFiles, isUploading, handleImageSelect, removeNewFile, clearNewFiles, uploadImages } = useImageManager(ferrataId);

  const [openDefects, setOpenDefects] = useState<any[]>([]); 
  const [newDefects, setNewDefects] = useState<any[]>([]);   
  const [inspectedDefects, setInspectedDefects] = useState<Record<string, 'resolved' | 'still_open'>>({});
  const [loading, setLoading] = useState(true);
  const [editingDefect, setEditingDefect] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [checks, setChecks] = useState({ anchors: false, cable: false, loadTest: false, corrosion: false, looseRock: false });
  const [summaryReport, setSummaryReport] = useState('');
  const [isSafe, setIsSafe] = useState(true);
  const [isReleased, setIsReleased] = useState(true);

  const loadInspectionData = async () => {
    if (!ferrataId) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: oldData } = await supabase.from('defects').select('*').eq('ferrata_id', ferrataId).eq('resolved', false).lt('created_at', `${today}T00:00:00`);
    const { data: newData } = await supabase.from('defects').select('*').eq('ferrata_id', ferrataId).gte('created_at', `${today}T00:00:00`);
    if (oldData) setOpenDefects(oldData);
    if (newData) setNewDefects(newData);
    setLoading(false);
  };

  useEffect(() => {
    loadInspectionData();
    const interval = setInterval(loadInspectionData, 10000);
    return () => clearInterval(interval);
  }, [ferrataId]);

  const handleRemoveExistingImage = (url: string) => {
    setEditingDefect({ ...editingDefect, image_urls: editingDefect.image_urls.filter((u: string) => u !== url) });
  };

  const handleUpdateDefect = async () => {
    if (!editingDefect) return;
    setIsUpdating(true);
    try {
      const uploadedUrls = await uploadImages('insp_edit');
      const finalUrls = [...(editingDefect.image_urls || []), ...uploadedUrls];
      const { error } = await supabase.from('defects').update({
        title: editingDefect.title,
        description: editingDefect.description,
        priority: editingDefect.priority,
        location: editingDefect.location,
        image_urls: finalUrls
      }).eq('id', editingDefect.id);
      if (error) throw error;
      await loadInspectionData();
      setEditingDefect(null);
      clearNewFiles();
    } catch (e: any) {
      alert("Fehler: " + e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinalize = async () => {
    if (!summaryReport.trim()) {
      alert("Bitte schreibe ein kurzes Fazit im Berichtstext.");
      return;
    }
    setIsSaving(true);
    try {
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .insert([{
          ferrata_id: ferrataId,
          date: new Date().toISOString(),
          check_anchors: checks.anchors,
          check_cable: checks.cable,
          check_rock: checks.looseRock,
          check_load_test: checks.loadTest,
          summary_report: summaryReport,
          condition_rating: isSafe ? 'Gut / Sicher' : 'Mangelhaft',
          is_safe: isSafe,
          is_publicly_released: isReleased,
          next_inspection_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
        }])
        .select().single();

      if (inspectionError) throw inspectionError;

      const resolvedIds = Object.keys(inspectedDefects).filter(id => inspectedDefects[id] === 'resolved');
      if (resolvedIds.length > 0) {
        await supabase.from('defects').update({ resolved: true, resolved_at: new Date().toISOString(), inspection_id: inspection.id }).in('id', resolvedIds);
      }
      if (newDefects.length > 0) {
        const newDefectIds = newDefects.map(d => d.id);
        await supabase.from('defects').update({ inspection_id: inspection.id }).in('id', newDefectIds);
      }
      alert("Inspektion erfolgreich gespeichert!");
      router.push(`/ferrata/${ferrataId}/maintenance`);
    } catch (error: any) {
      alert("Fehler beim Speichern: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
  <div className="min-h-screen bg-[#fafafa] pb-32 text-slate-900">
    
    {/* --- ZENTRIERTER HEADER (Gleiche Breite wie Boxen) --- */}
    <header className="max-w-2xl mx-auto px-4 md:px-8 pt-12 pb-6 space-y-8">
      
      {/* Obere Reihe: Zurück-Link */}
      <div className="flex justify-between items-center w-full">
        <button 
          onClick={() => router.back()} 
          className="text-slate-400 hover:text-slate-900 text-xs font-medium flex items-center gap-2">
          ← Dashboard
        </button>
      </div>
      
      {/* Untere Reihe: Titel & Cloud Badge */}
      <div className="flex justify-between items-end w-full gap-4">
        <div className="flex-1">
            <h1 className="text-4xl font-extrabold tracking-tighter text-slate-950 leading-[0.8]">
            {/* Hier die Variable einfügen, z.B. {ferrataName} */}
            Inspektion
            </h1>
            <p className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] mt-4">
            WARTUNGS-DASHBOARD
            </p>
        </div>
                
        <div className="flex-shrink-0">
          <CloudStatusBadge />
        </div>
      </div>
    </header>

    {/* --- CONTENT BEREICH --- */}
    <div className="max-w-2xl mx-auto p-4 md:p-8 pt-0 space-y-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span> Offene Punkte aus Vorperioden
          </h3>
          {openDefects.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 text-center">Keine Altschäden vorhanden.</p>
          ) : (
            <div className="space-y-3">
              {openDefects.map(d => {
                const pStyle = priorityStyles[d.priority as PriorityType] || priorityStyles.niedrig;
                return (
                  <div key={d.id} className="bg-slate-50 rounded-2xl p-4 flex flex-col border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-3 cursor-pointer" onClick={() => setEditingDefect(d)}>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          {d.title || d.type} <span className="text-[10px] text-blue-500 font-normal">✎</span>
                        </p>
                        <p className="text-[10px] text-slate-500 italic">"{d.description}"</p>
                      </div>
                      <span className={`text-[8px] font-black px-2 py-1 rounded uppercase border ${pStyle.badge}`}>
                        {d.priority}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-slate-200/60">
                      <button onClick={() => setInspectedDefects({...inspectedDefects, [d.id]: 'resolved'})} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${inspectedDefects[d.id] === 'resolved' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200'}`}>Behoben</button>
                      <button onClick={() => setInspectedDefects({...inspectedDefects, [d.id]: 'still_open'})} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${inspectedDefects[d.id] === 'still_open' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-400 border-slate-200'}`}>Offen</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Heute neu erfasst</h3>
            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">{newDefects.length}</span>
          </div>
          {newDefects.map(d => (
            <div key={d.id} onClick={() => setEditingDefect(d)} className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-all mb-2">
              <div>
                <p className="text-xs font-black text-blue-900">{d.title || d.type} <span className="text-[9px] font-normal opacity-50 ml-1">✎</span></p>
                <p className="text-[9px] text-blue-600 font-bold uppercase">{d.location}</p>
              </div>
              {d.image_urls?.[0] ? <img src={d.image_urls[0]} className="w-8 h-8 rounded-lg object-cover" /> : <span className="text-xs">📸</span>}
            </div>
          ))}
        </section>

        {/* ... Prüfschritte & Fazit (unverändert) ... */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Standard-Prüfschritte</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[{ id: 'anchors', label: 'Ankerprüfung' }, { id: 'cable', label: 'Drahtseilprüfung' }, { id: 'loadTest', label: 'Belastungstest' }, { id: 'corrosion', label: 'Korrosions-Check' }, { id: 'looseRock', label: 'Felsräumung' }].map(item => (
              <label key={item.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${checks[item.id as keyof typeof checks] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-500'}`}>
                <input type="checkbox" checked={checks[item.id as keyof typeof checks]} onChange={() => setChecks({...checks, [item.id]: !checks[item.id as keyof typeof checks]})} className="w-5 h-5 accent-emerald-600" />
                <span className="text-xs font-bold">{item.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fazit & Protokoll</h3>
          <textarea value={summaryReport} onChange={(e) => setSummaryReport(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm min-h-[120px] focus:bg-white transition-all outline-none" placeholder="Gesamteindruck des Klettersteigs beschreiben..." />
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setIsSafe(!isSafe)} className={`py-4 rounded-2xl text-[9px] font-black uppercase border transition-all ${isSafe ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500'}`}>{isSafe ? 'Sicher' : 'Gefährdet'}</button>
            <button onClick={() => setIsReleased(!isReleased)} className={`py-4 rounded-2xl text-[9px] font-black uppercase border transition-all ${isReleased ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-900 text-white border-slate-900'}`}>{isReleased ? 'Freigegeben' : 'Gesperrt'}</button>
          </div>
        </section>

        <button onClick={handleFinalize} disabled={isSaving || loading} className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95 ${isSaving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-100'}`}>{isSaving ? "Wird gespeichert..." : "Inspektion finalisieren"}</button>
      </div>
      
      {/* --- LIGHTBOX EDITIEREN --- */}
      {editingDefect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border-2 border-blue-500/20">
            <div className="p-8 border-b border-blue-50 flex justify-between items-start bg-blue-50/30 text-slate-900">
              <div>
                <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2"><span>📝</span> Mangel bearbeiten</h2>
                <p className="text-[10px] text-blue-600 font-black uppercase mt-1 tracking-widest italic">Inspektions-Korrekturmodus</p>
              </div>
              <button onClick={() => { setEditingDefect(null); clearNewFiles(); }} className="text-3xl text-blue-300 hover:text-blue-600 transition-colors">×</button>
            </div>

            <div className="overflow-y-auto p-8 space-y-8 bg-white text-slate-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Titel / Bezeichnung *</label>
                    <input type="text" value={editingDefect.title || ""} onChange={(e) => setEditingDefect({...editingDefect, title: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 text-center block mb-2">Priorität *</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(priorityStyles) as PriorityType[]).map((p) => {
                        const style = priorityStyles[p];
                        const isActive = editingDefect.priority === p;
                        return (
                          <button 
                            key={p} 
                            onClick={() => setEditingDefect({...editingDefect, priority: p})} 
                            className={`py-3 rounded-xl text-[8px] font-black uppercase border transition-all ${
                              isActive 
                                ? `${style.bg} ${style.text} ${style.border} ${style.animate || ''} shadow-lg scale-105` 
                                : 'bg-white text-slate-300 border-slate-50 opacity-40 hover:opacity-100'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Schadensbeschreibung</label>
                  <textarea value={editingDefect.description || ""} onChange={(e) => setEditingDefect({...editingDefect, description: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold min-h-[160px] focus:border-blue-500 outline-none" />
                </div>
              </div>

              <ImageManager 
                existingUrls={editingDefect.image_urls}
                newFiles={newFiles}
                onRemoveExisting={handleRemoveExistingImage}
                onRemoveNew={removeNewFile}
                onSelect={handleImageSelect}
              />
            </div>

            <div className="p-8 border-t border-slate-50 bg-slate-50 flex gap-4">
              <button onClick={() => { setEditingDefect(null); clearNewFiles(); }} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Abbrechen</button>
              <button onClick={handleUpdateDefect} disabled={isUpdating} className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all ${isUpdating ? 'bg-slate-300 animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-100'}`}>
                {isUpdating ? 'Speichert...' : 'Änderungen übernehmen'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="fixed bottom-8 right-6 group z-40">
         <button onClick={() => window.open(`/ferrata/${ferrataId}/defect?from_inspection=true`, '_blank')} className="w-16 h-16 bg-orange-500 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl border-4 border-white hover:scale-110 active:scale-95 transition-all shadow-orange-200">
           <span className="mb-1">+</span>
         </button>
      </div>
    </div>
  );
}