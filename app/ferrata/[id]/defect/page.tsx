"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export default function InternalDefectReport() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [topoUrl, setTopoUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    location: '',
    coordinates: '',
    altitude: '',
    priority: '',
    topo_x: null as number | null,
    topo_y: null as number | null,
  });

  useEffect(() => {
    const fetchTopo = async () => {
      const { data } = await supabase.from('ferratas').select('topo_url').eq('id', id).single();
      if (data?.topo_url) setTopoUrl(data.topo_url);
    };
    fetchTopo();
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
    // Letzter Check der Pflichtfelder
    if (!files || files.length === 0 || !formData.type || !formData.priority || !formData.description || !formData.location || !formData.altitude || (topoUrl && !formData.topo_x)) {
      alert("Bitte füllen Sie alle Pflichtfelder aus und laden Sie mindestens ein Bild hoch.");
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `${id}/admin_${Date.now()}_${i}`;
        await supabase.storage.from('reports').upload(path, file);
        uploadedUrls.push(supabase.storage.from('reports').getPublicUrl(path).data.publicUrl);
      }

      await supabase.from('reports').insert([{
        ferrata_id: id,
        type: formData.type,
        description: formData.description,
        location: formData.location,
        coordinates: formData.coordinates,
        altitude: formData.altitude,
        image_urls: uploadedUrls,
        topo_x: formData.topo_x,
        topo_y: formData.topo_y,
        verified: true,
        priority: formData.priority,
        reporter_name: 'Wartungsteam (Intern)',
        resolved: false
      }]);
      
      router.push(`/ferrata/${id}/maintenance`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans pb-12">
      {/* Fortschrittsbalken */}
      <div className="fixed top-0 left-0 w-full h-1 bg-slate-100 z-50">
        <div className="h-full bg-blue-600 transition-all duration-700 ease-out" style={{ width: `${(step / 2) * 100}%` }}></div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-12">
        <header className="mb-8">
          <h2 className="text-lg font-semibold tracking-tight">
            {step === 1 ? "1. Lokalisierung (Intern)" : "2. Mangel-Details"}
          </h2>
          <p className="text-[10px] font-medium text-blue-500 uppercase tracking-wider mt-1">
            * Alle Felder außer GPS sind Pflichtfelder
          </p>
        </header>

        {/* STEP 1: ORTUNG */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {topoUrl && (
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-3 text-center border-b border-slate-50">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                    {formData.topo_x ? "✓ Punkt markiert" : "Tippe auf den Schadenspunkt"}
                  </p>
                </div>
                <div className="relative cursor-crosshair bg-slate-50" onClick={handleTopoClick}>
                  <img src={topoUrl} alt="Topo" className={`w-full h-auto transition-opacity duration-700 ${formData.topo_x ? 'opacity-100' : 'opacity-60'}`} />
                  {formData.topo_x && (
                    <div className="absolute w-5 h-5 bg-blue-600 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg animate-in zoom-in"
                         style={{ left: `${formData.topo_x}%`, top: `${formData.topo_y}%` }} />
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* GPS BUTTON: Zeigt Koordinaten direkt im Button an, wenn erfasst */}
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

              <div className="relative">
                <input type="text" placeholder="Höhe" className="w-full h-full bg-white border border-slate-100 p-4 rounded-2xl text-[11px] outline-none text-center" value={formData.altitude} onChange={e => setFormData({...formData, altitude: e.target.value})} />
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-300 uppercase">Höhe (m) *</span>
              </div>
            </div>

            <textarea 
              placeholder="Ortsbeschreibung (z.B. nach der Brücke)... *" 
              className="w-full bg-white border border-slate-100 p-4 rounded-2xl text-sm outline-none min-h-[80px] focus:border-blue-200 transition-colors" 
              value={formData.location} 
              onChange={e => setFormData({...formData, location: e.target.value})} 
            />

            <button 
              onClick={() => setStep(2)} 
              disabled={(!!topoUrl && !formData.topo_x) || !formData.location || !formData.altitude} 
              className={`w-full py-4 rounded-2xl font-medium text-sm tracking-wide transition-all ${((!!topoUrl && !formData.topo_x) || !formData.location || !formData.altitude) ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white shadow-xl shadow-slate-200'}`}
            >
              Details erfassen →
            </button>
          </div>
        )}

        {/* STEP 2: DETAILS & PRIO */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* TYPE SELECTION (Icons wie User-Form) */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'Anchor', icon: '🔩', label: 'Anker' },
                { id: 'Cable', icon: '🪢', label: 'Seil' },
                { id: 'Rock', icon: '🪨', label: 'Fels' },
                { id: 'Other', icon: '❓', label: 'Andere' }
              ].map(item => (
                <button key={item.id} onClick={() => setFormData({...formData, type: item.id})}
                  className={`p-5 rounded-2xl border transition-all flex flex-col items-center gap-2 ${formData.type === item.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[10px] font-semibold uppercase">{item.label}</span>
                </button>
              ))}
            </div>

            {/* PRIORITÄT (Integrierte Admin-Funktion) */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Interne Priorisierung *</p>
              <div className="grid grid-cols-4 gap-2">
                {['niedrig', 'mittel', 'hoch', 'kritisch'].map((prio) => (
                  <button 
                    key={prio} 
                    onClick={() => setFormData({...formData, priority: prio})}
                    className={`py-3 rounded-xl text-[9px] font-bold uppercase transition-all border ${formData.priority === prio ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    {prio}
                  </button>
                ))}
              </div>
            </div>

            <textarea 
              placeholder="Detaillierte Beschreibung des Mangels... *" 
              className="w-full bg-white border border-slate-100 p-4 rounded-2xl text-sm outline-none min-h-[120px] focus:border-blue-200 transition-colors" 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              value={formData.description} 
            />

            <div className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all ${files?.length ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
              <input type="file" multiple accept="image/*" onChange={e => setFiles(e.target.files)} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <p className={`text-sm font-medium ${files?.length ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {files?.length ? `✓ ${files.length} Bilder hinzugefügt` : "Fotos aufnehmen *"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Min. 1 Bild erforderlich</p>
              </label>
            </div>

            <div className="space-y-3 pt-4">
              <button 
                onClick={handleSubmit} 
                disabled={loading || !formData.type || !formData.priority || !formData.description || !files?.length} 
                className={`w-full py-4 rounded-2xl font-medium text-sm transition-all ${ (loading || !formData.type || !formData.priority || !formData.description || !files?.length) ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white shadow-xl shadow-slate-200 active:scale-[0.98]'}`}
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