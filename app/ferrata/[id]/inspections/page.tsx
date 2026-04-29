"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '../../../../lib/supabase';

export default function InspectionDashboard() {
  const router = useRouter();
  const params = useParams();
  const ferrataId = params.id as string;
  const supabase = createClient();

  const [openDefects, setOpenDefects] = useState<any[]>([]); // Altschäden
  const [newDefects, setNewDefects] = useState<any[]>([]);   // Heute neu erfasste
  const [inspectedDefects, setInspectedDefects] = useState<Record<string, 'resolved' | 'still_open'>>({});
  const [loading, setLoading] = useState(true);

  // Checklisten- & Fazit-States
  const [checks, setChecks] = useState({ anchors: false, cable: false, loadTest: false, corrosion: false, looseRock: false });
  const [summaryReport, setSummaryReport] = useState('');
  const [isSafe, setIsSafe] = useState(true);
  const [isReleased, setIsReleased] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

const handleFinalize = async () => {
  if (!summaryReport.trim()) {
    alert("Bitte schreibe ein kurzes Fazit im Berichtstext.");
    return;
  }

  setIsSaving(true);
  try {
    // 1. Die Haupt-Inspektion anlegen
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
      .select()
      .single();

    if (inspectionError) throw inspectionError;

    // 2. Altschäden aktualisieren (die im Dashboard auf 'Behoben' gesetzt wurden)
    const resolvedIds = Object.keys(inspectedDefects).filter(id => inspectedDefects[id] === 'resolved');
    
    if (resolvedIds.length > 0) {
      const { error: updateError } = await supabase
        .from('defects')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString(),
          inspection_id: inspection.id // Verknüpfung zum Bericht
        })
        .in('id', resolvedIds);
      
      if (updateError) throw updateError;
    }

    // 3. Neue Mängel (von heute) mit dieser Inspektion verknüpfen
    // Das sorgt dafür, dass sie in der Historie fest zum Bericht gehören
    if (newDefects.length > 0) {
      const newDefectIds = newDefects.map(d => d.id);
      await supabase
        .from('defects')
        .update({ inspection_id: inspection.id })
        .in('id', newDefectIds);
    }

    // 4. Erfolg & Navigation
    alert("Inspektion erfolgreich gespeichert und in der Historie archiviert!");
    router.push(`/ferrata/${ferrataId}/maintenance`); // Zurück zum Wartungscenter

  } catch (error: any) {
    console.error("Speicherfehler:", error);
    alert("Fehler beim Speichern: " + error.message);
  } finally {
    setIsSaving(false);
  }
};



  // Funktion zum Laden aller Daten
  const loadInspectionData = async () => {
    if (!ferrataId) return;
    const today = new Date().toISOString().split('T')[0];

    // 1. Altschäden (vor heute erstellt)
    const { data: oldData } = await supabase
      .from('defects')
      .select('*')
      .eq('ferrata_id', ferrataId)
      .eq('resolved', false)
      .lt('created_at', `${today}T00:00:00`);

    // 2. Neu erfasste Mängel (heute erstellt)
    const { data: newData } = await supabase
      .from('defects')
      .select('*')
      .eq('ferrata_id', ferrataId)
      .gte('created_at', `${today}T00:00:00`);

    if (oldData) setOpenDefects(oldData);
    if (newData) setNewDefects(newData);
    setLoading(false);
  };

  useEffect(() => {
    loadInspectionData();
    // Optional: Alle 10 Sekunden prüfen, ob ein neuer Mangel im anderen Tab gespeichert wurde
    const interval = setInterval(loadInspectionData, 10000);
    return () => clearInterval(interval);
  }, [ferrataId]);

  return (
    <div className="min-h-screen bg-[#fafafa] pb-32 text-slate-900">
      {/* STICKY HEADER */}
      <div className="bg-white border-b border-slate-100 p-6 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-lg font-bold">Inspektion Dashboard</h1>
          <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Live-Sync aktiv</p>
        </div>
        <button onClick={() => router.back()} className="text-[10px] font-black text-slate-400 border border-slate-100 px-4 py-2 rounded-xl">BEENDEN</button>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* BOX 1: ALTSCHÄDEN (VORJAHRE) */}
        <section className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span> Offene Punkte aus Vorperioden
          </h3>
          {openDefects.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 text-center">Keine Altschäden vorhanden.</p>
          ) : (
            <div className="space-y-3">
              {openDefects.map(d => (
                <div key={d.id} className="bg-slate-50 rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-4 border border-slate-100">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">{d.title || d.type}</p>
                    <p className="text-[10px] text-slate-500 italic">"{d.description}"</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setInspectedDefects({...inspectedDefects, [d.id]: 'resolved'})} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${inspectedDefects[d.id] === 'resolved' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200'}`}>Behoben</button>
                    <button onClick={() => setInspectedDefects({...inspectedDefects, [d.id]: 'still_open'})} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${inspectedDefects[d.id] === 'still_open' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-400 border-slate-200'}`}>Offen</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BOX 2: NEU ERFASSTE MÄNGEL (HEUTE) */}
        <section className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Heute neu erfasst</h3>
            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">{newDefects.length}</span>
          </div>
          {newDefects.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 text-center">Noch keine neuen Mängel aufgenommen.</p>
          ) : (
            <div className="grid gap-2">
              {newDefects.map(d => (
                <div key={d.id} className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-blue-900">{d.title || d.type}</p>
                    <p className="text-[9px] text-blue-600 font-bold uppercase">{d.location}</p>
                  </div>
                  <span className="text-xs">📸</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BOX 3: TECHNISCHE CHECKBOXEN */}
        <section className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Standard-Prüfschritte</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { id: 'anchors', label: 'Ankerprüfung' }, { id: 'cable', label: 'Drahtseilprüfung' },
              { id: 'loadTest', label: 'Belastungstest' }, { id: 'corrosion', label: 'Korrosions-Check' },
              { id: 'looseRock', label: 'Felsräumung' }
            ].map(item => (
              <label key={item.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${checks[item.id as keyof typeof checks] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-500'}`}>
                <input type="checkbox" checked={checks[item.id as keyof typeof checks]} onChange={() => setChecks({...checks, [item.id]: !checks[item.id as keyof typeof checks]})} className="w-5 h-5 accent-emerald-600" />
                <span className="text-xs font-bold">{item.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* BOX 4: FAZIT & FREIGABE */}
        <section className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fazit & Protokoll</h3>
          <textarea 
            value={summaryReport}
            onChange={(e) => setSummaryReport(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm min-h-[120px] focus:bg-white transition-all outline-none"
            placeholder="Gesamteindruck des Klettersteigs beschreiben..."
          />
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setIsSafe(!isSafe)} className={`py-4 rounded-2xl text-[9px] font-black uppercase border transition-all ${isSafe ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500'}`}>
              {isSafe ? 'Sicher' : 'Gefährdet'}
            </button>
            <button onClick={() => setIsReleased(!isReleased)} className={`py-4 rounded-2xl text-[9px] font-black uppercase border transition-all ${isReleased ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-900 text-white border-slate-900'}`}>
              {isReleased ? 'Freigegeben' : 'Gesperrt'}
            </button>
          </div>
        </section>

        {/* ABSCHLUSS BUTTON */}
<button 
  onClick={handleFinalize}
  disabled={isSaving || loading}
  className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95 ${
    isSaving 
      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-100'
  }`}
>
  {isSaving ? "Wird gespeichert..." : "Inspektion finalisieren"}
</button>

      </div>

      {/* FLOATING ACTION BUTTON (Wie gehabt) */}
      <div className="fixed bottom-8 right-6 group">
         <button onClick={() => window.open(`/ferrata/${ferrataId}/defect?from_inspection=true`, '_blank')} className="w-16 h-16 bg-orange-500 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl border-4 border-white">
           +
         </button>
      </div>
    </div>
  );
}