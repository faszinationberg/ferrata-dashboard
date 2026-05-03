"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth'; 
import { useImageManager } from '../hooks/useImageManager';
import { ImageManager } from '../components/ImageManager';


interface DefectReportFormProps {
  ferrataId: string;
  ferrataName: string;
  topoUrl: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DefectReportForm({ ferrataId, ferrataName, topoUrl, onClose, onSuccess }: DefectReportFormProps) {
  const supabase = createClient();
  const { userEmail, userProfile } = useAuth();
  
  // 2. Erstelle einen Ref für den äußeren Container
  const formContainerRef = useRef<HTMLDivElement>(null);
    
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
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

  const { 
    newFiles, 
    isUploading, 
    handleImageSelect, 
    removeNewFile, 
    clearNewFiles, 
    uploadImages 
  } = useImageManager(ferrataId);

// 3. Dieser Effekt triggert bei jedem Step-Wechsel
  useEffect(() => {
      if (formContainerRef.current) {
        // Wir scrollen nicht nur das Div, sondern suchen den Modal-Body, 
        // falls das Div selbst kein Scrollbar hat.
        formContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Sicherheits-Variante: Da das Modal im MaintenanceCenter die Scrollbar hat,
        // erzwingen wir den Scroll auf das erste Element im Formular.
        formContainerRef.current.scrollIntoView({ block: 'start' });
      }
    }, [step]); // Abhängigkeit vom Step

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
    // 1. Validierung (Pflichtfelder + neue Bilder aus dem Hook)
    if (newFiles.length === 0 || !formData.title || !formData.type || !formData.priority || !formData.description) {
      alert("Bitte füllen Sie alle Pflichtfelder aus und machen Sie mindestens ein Foto.");
      return;
    }

    setLoading(true);
    try {
      // 2. Bilder über den ImageManager hochladen (ersetzt deinen manuellen Loop)
      // Der Hook kümmert sich um Pfade, Storage-Bucket und Error-Handling
      const uploadedUrls = await uploadImages('manual_report');

      // 3. Melder-Info zusammenbauen (Techniker-Identifikation)
      const reporterInfo = userProfile?.full_name 
        ? `${userProfile.full_name} (${userEmail}${userProfile.phone ? `, Tel: ${userProfile.phone}` : ''})`
        : `Techniker: ${userEmail}`;

      // 4. Eintrag in 'defects' erstellen
      const { error: dbError } = await supabase.from('defects').insert([{
        ferrata_id: ferrataId,
        title: formData.title,
        type: formData.type,
        description: formData.description,
        internal_comment: formData.internal_comment,
        location: formData.location,
        coordinates: formData.coordinates,
        altitude: formData.altitude,
        image_urls: uploadedUrls, // URLs vom ImageManager-Upload
        topo_x: formData.topo_x,
        topo_y: formData.topo_y,
        priority: formData.priority,
        reporter_name: reporterInfo, 
        verified_by_name: userEmail, 
        verified_at: new Date().toISOString(),
        resolved: false,
        created_at: new Date().toISOString() 
      }]);

      if (dbError) throw dbError;

      // 5. Erfolg & Cleanup
      clearNewFiles(); // Hook State leeren
      
      // Da wir jetzt in einem Modal arbeiten, triggern wir onSuccess (lädt die Liste im Hintergrund neu)
      // und onClose (schließt das Modal)
      onSuccess();
      onClose();

      // Feedback für den User
      alert("Mangel erfolgreich erfasst und verifiziert.");

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

  return (
    <div ref={formContainerRef} className="space-y-6 px-1 pb-6">
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
              <input type="text" value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-blue-500 outline-none transition-all" 
                placeholder="Bezeichnung...*" />
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

            {/* Der professionelle ImageManager */}
            <div className="bg-white border border-slate-100 rounded-3xl p-2">

              
              <ImageManager 
                existingUrls={[]} // Bei einer Neuerstellung gibt es noch keine existierenden URLs
                newFiles={newFiles}
                onRemoveExisting={() => {}} // Nicht benötigt
                onRemoveNew={removeNewFile}
                onSelect={handleImageSelect}
              />
              
              {isUploading && (
                <p className="text-[10px] text-blue-600 font-bold animate-pulse text-center pb-4">
                  Bilder werden verarbeitet...
                </p>
              )}
            </div>

            <div className="space-y-3 pt-4"> 
              <button onClick={handleSubmit} disabled={ loading || !formData.title || !formData.type || !formData.priority || !formData.description || newFiles.length === 0} 
                className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${(loading || !formData.title || !formData.type || !formData.priority || !formData.description || newFiles.length === 0) 
                    ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white shadow-xl shadow-slate-200 active:scale-[0.98]'}`} >
                {loading ? "Wird gespeichert..." : "Mangel offiziell speichern"}
              </button>
              
              <button type="button" onClick={() => setStep(1)} className="w-full text-[11px] font-bold text-sm text-slate-400 uppercase tracking-wider">
                Zurück zur Ortung
              </button>
            </div>
          </div>
        )}

    </div>
  );
}