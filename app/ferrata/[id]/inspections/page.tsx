"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '../../../../lib/supabase';
import { CloudStatusBadge } from '../../../components/CloudStatusBadge';
import { DefectReportForm } from '../../../components/InternaDefectReport';
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

  const [checks, setChecks] = useState({ anchors: false, cable: false, loadTest: false, corrosion: false, looseRock: false , normCheck: false });
  const [summaryReport, setSummaryReport] = useState('');
  const [isSafe, setIsSafe] = useState(true);
  const [isReleased, setIsReleased] = useState(true);

  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);

  const loadInspectionData = async () => {
    if (!ferrataId) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: oldData } = await supabase.from('defects').select('*').eq('ferrata_id', ferrataId).eq('resolved', false).lt('created_at', `${today}T00:00:00`);
    const { data: newData } = await supabase.from('defects').select('*').eq('ferrata_id', ferrataId).gte('created_at', `${today}T00:00:00`);
    if (oldData) setOpenDefects(oldData);
    if (newData) setNewDefects(newData);
    setLoading(false);
  };


// 1. Zuerst die States definieren (ganz oben bei den anderen States)
const [ferrataName, setFerrataName] = useState<string>('');
const [topoUrl, setTopoUrl] = useState<string | null>(null);

// 2. Der korrigierte useEffect
useEffect(() => {
  // Daten sofort laden
  loadInspectionData();

  // Basis-Daten (Name & Topo) laden
  const fetchBaseData = async () => {
    const { data } = await supabase
      .from('ferratas')
      .select('name, topo_url')
      .eq('id', ferrataId)
      .single();
    if (data) {
      setFerrataName(data.name);
      setTopoUrl(data.topo_url);
    }
  };
  fetchBaseData();

  // Intervall für Live-Updates der Mängel
  const interval = setInterval(loadInspectionData, 10000);

  // Cleanup: Intervall löschen, wenn Komponente verlassen wird
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

          // --- NEU: Markiere den Mangel als "Heute kontrolliert" ---
          setInspectedDefects(prev => ({ ...prev, [editingDefect.id]: 'still_open' }));

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Nicht authentifiziert");

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
          technician_id: user.id, // <--- Die ID für die RLS-Policy
          date: new Date().toISOString(),
          check_anchors: checks.anchors,
          check_cable: checks.cable,
          check_rock: checks.looseRock,
          check_load_test: checks.loadTest,
          check_corrosion: checks.corrosion, // Sicherstellen, dass das auch drin ist
          check_norm: checks.normCheck,     // NEU: Mapping auf die DB-Spalte          
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
            {ferrataName}
            </p>
        </div>
                
        <div className="flex-shrink-0">
          <CloudStatusBadge />
        </div>
      </div>
    </header>

    {/* --- CONTENT BEREICH --- */}
    <div className="max-w-2xl mx-auto p-4 md:p-8 pt-0 space-y-10">
      
      {/* BOX 1: NOCH ZU PRÜFEN (Die ToDo-Liste mit der detaillierten Anzeige) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-orange-500 rounded-full"></span> Noch zu kontrollieren (ToDo)
        </h3>
        
        {openDefects.filter(d => !inspectedDefects[d.id]).length === 0 ? (
          <div className="p-10 bg-emerald-50 border border-emerald-100 rounded-[2rem] text-center">
            <span className="text-2xl mb-2 block">✅</span>
            <p className="text-xs text-emerald-800 font-black uppercase tracking-widest">
              Alle Altschäden wurden für heute gesichtet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...openDefects]
              .filter(d => !inspectedDefects[d.id])
              .sort((a, b) => (parseFloat(a.altitude) || 0) - (parseFloat(b.altitude) || 0))
              .map(d => {
                const pStyle = priorityStyles[d.priority as PriorityType] || priorityStyles.niedrig;
                const typeIcons: Record<string, string> = { Anchor: '🔩', Cable: '🪢', Rock: '🪨', Other: '❓' };

                return (
                  <div 
                    key={d.id} 
                    onClick={() => setEditingDefect(d)}
                    className="bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 rounded-2xl p-5 flex items-center gap-5 transition-all cursor-pointer group shadow-sm"
                  >
                    {/* Farb-Indikator links */}
                    <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${pStyle.bg}`}></div>

                    <div className="flex-1 min-w-0">
                      {/* Zeile 1: Titel & Typ */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs">{typeIcons[d.type] || '⚠️'}</span>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                          {d.title || d.type}
                        </p>
                      </div>

                      {/* Zeile 2: Ort & Höhe (Blau für schnelle Orientierung) */}
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                        📍 {d.location || 'Ort unbekannt'} 
                        <span className="mx-1 text-slate-300">•</span> 
                        🏔️ {d.altitude ? `${d.altitude}m` : 'Höhe N/A'}
                      </p>

                      {/* Zeile 3: Beschreibung (Kursiv) */}
                      <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-1">
                        "{d.description}"
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[8px] font-black px-2 py-1 rounded uppercase border ${pStyle.badge}`}>
                        {d.priority}
                      </span>
                      <span className="text-blue-500 text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        Prüfen ✎
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* BOX 2: ZUSAMMENFASSUNG (Audit-Liste) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm border-l-4 border-l-blue-600">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            In den heutigen Bericht übernommen
          </h3>
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">
            {Object.keys(inspectedDefects).length + newDefects.length} Einträge
          </span>
        </div>

        <div className="space-y-3">
          {/* A) Bestätigte Altschäden (Kompakte Darstellung) */}
          {openDefects.filter(d => inspectedDefects[d.id]).map(d => (
            <div key={d.id} onClick={() => setEditingDefect(d)} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all border-l-4 border-l-emerald-500 shadow-sm">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Sichtprüfung OK</span>
                  <p className="text-xs font-black text-slate-800 truncate">{d.title || d.type}</p>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">📍 {d.location} ({d.altitude}m)</p>
              </div>
              <div className="text-emerald-500 font-black">✓</div>
            </div>
          ))}

          {/* B) Neue Mängel (Blaues Design) */}
          {newDefects.map(d => (
            <div key={d.id} onClick={() => setEditingDefect(d)} className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-all shadow-sm">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Neuaufnahme</span>
                  <p className="text-xs font-black text-blue-900 truncate">{d.title || d.type}</p>
                </div>
                <p className="text-[9px] text-blue-600 font-bold uppercase mt-1">📍 {d.location} ({d.altitude}m)</p>
              </div>
              {d.image_urls?.[0] ? <img src={d.image_urls[0]} className="w-10 h-10 rounded-xl object-cover border border-blue-100" /> : <span className="text-xs">📸</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 border-b pb-4">
            Standard-Prüfschritte & Norm-Check
          </h3>
          
          <div className="flex flex-col gap-3">
            {[
              { id: 'anchors', label: 'Sichtprüfung aller Teile', desc: 'Endanker, Mittelanker, Trittbügel, Leitern' },
              { id: 'cable', label: 'Sichtprüfung Drahtseil', desc: 'Kontrolle auf Drahtbrüche & Verformungen' },
              { id: 'loadTest', label: 'Belastungsprüfung aller Anker', desc: 'Verkehrslast (1 Person) erfolgreich geprüft' },
              { id: 'corrosion', label: 'Korrosions-Check', desc: 'Stichprobenartige Kontrolle der Seilklemmen' },
              { id: 'looseRock', label: 'Felsräumung durchgeführt', desc: 'Kein loses Gestein im unmittelbaren Bereich' },
              { id: 'normCheck', label: 'Normkonformität EN/UNI 16869:2018', desc: 'Bauweise entspricht der aktuellen Norm' }
            ].map(item => {
              const isChecked = checks[item.id as keyof typeof checks];
              
              return (
                <label 
                  key={item.id} 
                  className={`flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer group ${
                    isChecked 
                      ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                      : 'bg-slate-50/50 border-slate-100 hover:border-blue-200'
                  }`}
                >
                  {/* Custom Styled Checkbox Container */}
                  <div className="relative flex items-center mt-1">
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => setChecks({...checks, [item.id]: !isChecked})} 
                      className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-slate-200 bg-white transition-all checked:border-emerald-500 checked:bg-emerald-500 shadow-sm"
                    />
                    {/* Das Häkchen-Icon (SVG) erscheint nur wenn checked */}
                    <svg className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none left-1 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>

                  <div className="flex flex-col">
                    <span className={`text-xs font-black uppercase tracking-tight transition-colors ${isChecked ? 'text-emerald-900' : 'text-slate-700'}`}>
                      {item.label}
                    </span>
                    <p className={`text-[10px] leading-relaxed transition-colors ${isChecked ? 'text-emerald-600/70' : 'text-slate-400'}`}>
                      {item.desc}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-4">
          Abschlussbericht & Freigabe
        </h3>
        
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
            Gesamteindruck & Bemerkungen
          </label>
          <textarea 
            value={summaryReport} 
            onChange={(e) => setSummaryReport(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-sm min-h-[150px] focus:bg-white focus:border-blue-500 transition-all outline-none shadow-inner" 
            placeholder="Beschreibe hier den Gesamtzustand, besondere Vorkommnisse oder Empfehlungen für die nächste Wartung..." 
          />
        </div>

        <div className="flex flex-col gap-3 pt-2">
          {/* CHECKBOX: SICHERHEIT */}
          <label 
            className={`flex items-center gap-4 p-5 rounded-3xl border transition-all cursor-pointer ${
              isSafe 
                ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                : 'bg-slate-50/50 border-slate-100 hover:border-red-200'
            }`}
          >
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={isSafe} 
                onChange={() => setIsSafe(!isSafe)} 
                className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-slate-200 bg-white transition-all checked:border-emerald-500 checked:bg-emerald-500"
              />
              <svg className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none left-1 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-black uppercase tracking-tight ${isSafe ? 'text-emerald-900' : 'text-slate-700'}`}>
                Klettersteig ist betriebssicher
              </span>
              <p className="text-[10px] text-slate-400">Alle sicherheitsrelevanten Bauteile wurden ohne kritische Mängel geprüft.</p>
            </div>
          </label>

          {/* CHECKBOX: FREIGABE */}
          <label 
            className={`flex items-center gap-4 p-5 rounded-3xl border transition-all cursor-pointer ${
              isReleased 
                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                : 'bg-slate-50/50 border-slate-100 hover:border-slate-900'
            }`}
          >
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={isReleased} 
                onChange={() => setIsReleased(!isReleased)} 
                className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-slate-200 bg-white transition-all checked:border-blue-600 checked:bg-blue-600"
              />
              <svg className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none left-1 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-black uppercase tracking-tight ${isReleased ? 'text-blue-900' : 'text-slate-700'}`}>
                Für die öffentliche Nutzung freigegeben
              </span>
              <p className="text-[10px] text-slate-400">Der Steig wird offiziell für den Publikumsverkehr geöffnet.</p>
            </div>
          </label>
        </div>
      </section>

          {/* FINALIZE BUTTON */}
          <button onClick={handleFinalize} disabled={isSaving || loading} className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95 ${isSaving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-100'}`}>
            {isSaving ? "Wird gespeichert..." : "Inspektion finalisieren"}
          </button>

    </div>
      
      {/* --- LIGHTBOX EDITIEREN --- */}
      {editingDefect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border-2 border-blue-500/20">
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
   <button 
     onClick={() => setIsDefectModalOpen(true)} 
     className="w-16 h-16 bg-orange-500 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl border-4 border-white hover:scale-110 active:scale-95 transition-all shadow-orange-200"
   >
     <span className="mb-1">+</span>
   </button>
</div>        


      {/* --- MODAL FÜR NEUEN MANGEL --- */}
      {isDefectModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop mit Blur-Effekt */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setIsDefectModalOpen(false)} 
          />
          
          {/* Modal Box */}
          <div className="bg-[#fafafa] w-full max-w-xl rounded-2xl shadow-2xl z-[160] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Neuer Mangel - {ferrataName}</h3>
    //            <p className="text-sm font-bold text-slate-900">Inspektions-Aufnahme</p>
              </div>
              <button 
                onClick={() => setIsDefectModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Formular-Inhalt (Scrollbar) */}
            <div className="overflow-y-auto scrollbar-hide p-2">
              <DefectReportForm 
                ferrataId={ferrataId}
                ferrataName={ferrataName}
                topoUrl={topoUrl}
                onClose={() => setIsDefectModalOpen(false)}
                onSuccess={() => {
                  loadInspectionData(); // Dashboard im Hintergrund sofort aktualisieren
                  setIsDefectModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}