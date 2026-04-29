"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '../../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth'; 
import { CloudStatusBadge } from '../../../components/CloudStatusBadge';

export default function InternalDefectReport() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
//  const { userEmail, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [topoUrl, setTopoUrl] = useState<string | null>(null);
  const [ferrataName, setFerrataName] = useState<string>('');
  const [files, setFiles] = useState<FileList | null>(null);

  const { userEmail, userProfile, loading: authLoading } = useAuth(); // userProfile enthält Name & Telefon
  
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    description: '',
    internal_comment: '',
    location: '',
    coordinates: '',
    altitude: '',
    priority: '',
    topo_x: null as number | null,
    topo_y: null as number | null,
  });

  useEffect(() => {
    const fetchFerrataData = async () => {
      const { data } = await supabase
        .from('ferratas')
        .select('name, topo_url')
        .eq('id', id)
        .single();
      
      if (data) {
        setTopoUrl(data.topo_url);
        setFerrataName(data.name);
      }
    };
    fetchFerrataData();
  }, [id]);

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setFormData(prev => ({
        ...prev, 
        coordinates: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
        altitude: pos.coords.altitude ? `${Math.round(pos.coords.altitude)}` : prev.altitude
      }));
    });
  };

  const handleTopoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFormData(prev => ({
      ...prev,
      topo_x: ((e.clientX - rect.left) / rect.width) * 100,
      topo_y: ((e.clientY - rect.top) / rect.height) * 100
    }));
  };

const handleSubmit = async () => {
  // 0. URL Parameter prüfen
  const isInspection = searchParams.get('from_inspection') === 'true';

  // 1. Validierung
  if (!files || files.length === 0 || !formData.title || !formData.type || !formData.priority || !formData.description) {
    alert("Bitte füllen Sie alle Pflichtfelder aus.");
    return;
  }

  setLoading(true);
  try {
    // 2. Bilder Upload Prozess (bleibt gleich)
    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const path = `${id}/admin_manual_${Date.now()}_${i}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('reports').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('reports').getPublicUrl(path);
      uploadedUrls.push(urlData.publicUrl);
    }

    // 3. Melder-Info zusammenbauen
    const reporterInfo = userProfile?.full_name 
      ? `${userProfile.full_name} (${userEmail}${userProfile.phone ? `, Tel: ${userProfile.phone}` : ''})`
      : `Techniker: ${userEmail}`;

    // 4. Eintrag in 'defects'
    const { error: dbError } = await supabase.from('defects').insert([{
      ferrata_id: id,
      title: formData.title,
      type: formData.type,
      description: formData.description,
      internal_comment: formData.internal_comment,
      location: formData.location,
      coordinates: formData.coordinates,
      altitude: formData.altitude,
      image_urls: uploadedUrls,
      topo_x: formData.topo_x,
      topo_y: formData.topo_y,
      priority: formData.priority,
      reporter_name: reporterInfo, 
      verified_by_name: userEmail, 
      verified_at: new Date().toISOString(),
      resolved: false,
      
      // NEU: Kennzeichnung für den Wartungsbericht
      // Wir nutzen ein Feld wie 'is_inspection_report', oder prüfen später auf das Datum
      created_at: new Date().toISOString() 
    }]);

    if (dbError) throw dbError;

    // 5. Navigation nach Erfolg
    if (isInspection) {
      alert("Mangel für Wartungsbericht gespeichert!");
      window.close(); // Schließt den Tab und kehrt zur Inspektion zurück
    } else {
      router.push(`/ferrata/${id}/maintenance`);
    }
  } catch (err: any) {
    console.error("Speicherfehler:", err);
    alert("Fehler beim Speichern: " + err.message);
  } finally {
    setLoading(false);
  }
};
  const getPrioColor = (p: string) => {
    switch(p) {
      case 'niedrig': return formData.priority === p ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border-slate-100';
      case 'mittel': return formData.priority === p ? 'bg-yellow-400 border-yellow-500 text-yellow-900' : 'bg-white text-slate-400 border-slate-100';
      case 'hoch': return formData.priority === p ? 'bg-orange-500 border-orange-600 text-white' : 'bg-white text-slate-400 border-slate-100';
      case 'kritisch': return formData.priority === p ? 'bg-red-600 border-red-700 text-white animate-pulse' : 'bg-white text-slate-400 border-slate-100';
      default: return 'bg-white border-slate-100 text-slate-400';
    }
  };

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans pb-32">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-slate-100 z-50">
        <div className="h-full bg-blue-600 transition-all duration-700 ease-out" style={{ width: `${(step / 2) * 100}%` }}></div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-12 space-y-8">
        
        {/* HEADER MIT BADGE */}
        <header className="flex flex-col space-y-6">
          <div className="flex justify-between items-center w-full">
            <button 
              onClick={() => router.push(`/ferrata/${id}/maintenance`)} 
              className="text-slate-400 hover:text-slate-900 text-xs font-medium flex items-center gap-2"
            >
              ← Abbrechen
            </button>
            <CloudStatusBadge />
          </div>
          
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {step === 1 ? "1. Lokalisierung" : "2. Mangel-Details"}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
              Manuelle Erfassung: {ferrataName}
            </p>
          </div>
        </header>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {topoUrl && (
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="relative cursor-crosshair bg-slate-50" onClick={handleTopoClick}>
                  <img src={topoUrl} alt="Topo" className="w-full h-auto" />
                  {formData.topo_x && (
                    <div className="absolute w-5 h-5 bg-blue-600 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg"
                         style={{ left: `${formData.topo_x}%`, top: `${formData.topo_y}%` }} />
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
<button 
    type="button" 
    onClick={handleGPS} 
    className={`p-4 rounded-2xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
      formData.coordinates 
        ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'
    }`}
  >
    {formData.coordinates ? (
      <>
        <span className="text-[10px] font-mono tracking-tighter leading-none">
          {formData.coordinates.split(',')[0]}
        </span>
        <span className="text-[10px] font-mono tracking-tighter leading-none">
          {formData.coordinates.split(',')[1]}
        </span>
      </>
    ) : (
      <>
        <span className="text-sm">📍</span>
        <span>GPS ORTUNG</span>
      </>
    )}
  </button>
              <input type="text" placeholder="Höhe (m) *" className="bg-white border border-slate-100 p-4 rounded-2xl text-xs outline-none text-center" value={formData.altitude} onChange={e => setFormData({...formData, altitude: e.target.value})} />
            </div>

            <textarea placeholder="Ort (z.B. Seilbrücke) *" className="w-full bg-white border border-slate-100 p-4 rounded-2xl text-sm outline-none min-h-[80px]" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />

            <button onClick={() => setStep(2)} disabled={!formData.location} className={`w-full py-4 rounded-2xl font-bold text-sm ${!formData.location ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white shadow-xl'}`}>
              Details erfassen →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            <div>
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-4">Offizieller Titel *</label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-blue-500 outline-none transition-all" 
                placeholder="Bezeichnung..." 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[{id:'Anchor', i:'🔩', l:'Anker'}, {id:'Cable', i:'🪢', l:'Seil'}, {id:'Rock', i:'🪨', l:'Fels'}, {id:'Other', i:'❓', l:'Andere'}].map(item => (
                <button key={item.id} onClick={() => setFormData({...formData, type: item.id})} className={`p-5 rounded-2xl border transition-all flex flex-col items-center gap-2 ${formData.type === item.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-400'}`}>
                  <span className="text-xl">{item.i}</span>
                  <span className="text-[10px] font-bold uppercase">{item.l}</span>
                </button>
              ))}
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-3xl space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Priorisierung *</p>
              <div className="grid grid-cols-4 gap-2">
                {['niedrig', 'mittel', 'hoch', 'kritisch'].map((prio) => (
                  <button key={prio} onClick={() => setFormData({...formData, priority: prio})}
                    className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${getPrioColor(prio)}`}
                  >
                    {prio}
                  </button>
                ))}
              </div>
            </div>

            <textarea 
              placeholder="Schadensbeschreibung... *" 
              className="w-full bg-white border border-slate-100 p-4 rounded-2xl text-sm outline-none min-h-[100px] focus:border-blue-200" 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              value={formData.description}
            />

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Interne Anweisung</label>
              <textarea 
                value={formData.internal_comment} 
                onChange={e => setFormData({...formData, internal_comment: e.target.value})} 
                className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm min-h-[80px] focus:border-blue-500 outline-none" 
                placeholder="Was ist zu tun?" 
              />
            </div>

            <div className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all ${files?.length ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
              <input type="file" multiple accept="image/*" onChange={e => setFiles(e.target.files)} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <p className={`text-sm font-medium ${files?.length ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {files?.length ? `✓ ${files.length} Bilder hinzugefügt` : "Fotos aufnehmen *"}
                </p>
              </label>
            </div>

            <div className="space-y-3 pt-4">
              <button 
                onClick={handleSubmit} 
                disabled={loading || !formData.title || !formData.type || !formData.priority || !formData.description || !files?.length} 
                className={`w-full py-4 rounded-2xl font-medium text-sm transition-all ${ (loading || !formData.title || !formData.type || !formData.priority || !formData.description || !files?.length) ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white shadow-xl shadow-slate-200 active:scale-[0.98]'}`}
              >
                {loading ? "Wird gespeichert..." : "Mangel offiziell speichern"}
              </button>
              <button onClick={() => setStep(1)} className="w-full text-[11px] font-medium text-slate-400 uppercase tracking-wider">Zurück zur Ortung</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}