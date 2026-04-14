"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { report } from 'process';

// Die Übersetzungen bleiben identisch für die Funktionalität
const translations = {
  en: {
    introTitle: "Together for",
    introSub: "Your Safety",
    introText: "With this report, you help us keep the via ferrata in perfect condition.",
    thankYou: "Thank you for your help!",
    startBtn: "Start Report",
    step1Title: "1. Location",
    topoReq: "* Marking required",
    topoMarked: "Point marked",
    topoInstruction: "Tap on the damage point",
    noTopo: "No topo available – use GPS or description",
    gpsBtn: "GPS Location",
    gpsFixed: "Position fixed",
    altitude: "Altitude",
    altLabel: "Altitude (m)",
    locPlaceholder: "Location description (e.g., after the traverse)...",
    nextStepDescription: "Damage details",
    step2Title: "2. Details",
    requiredFields: "* Required fields",
    damageType: "Select type",
    detailsPlaceholder: "Describe the damage in detail...",
    photoBtn: "Take photos",
    photosAdded: "Photos added",
    photoReq: "Min. 1 photo required",
    backToLoc: "Back",
    nextToContact: "Contact details",
    step3Title: "3. Contact",
    emailPlaceholder: "Email address",
    phonePlaceholder: "Phone number",
    optIn: "Receive status updates via email",
    submitBtn: "Submit now",
    submitting: "Sending...",
    completeData: "Complete data",
    backToDetails: "Back",
    successTitle: "Thank you!",
    successText: "Your report helps us keep the via ferrata safe.",
    finish: "Finish",
    types: { Anchor: "Anchor", Cable: "Cable", Rock: "Rock", Other: "Other" }
  },
  de: {
    introTitle: "Gemeinsam für",
    introSub: "Ihre Sicherheit",
    introText: "Mit dieser Meldung helfen Sie uns, den Klettersteig in einwandfreiem Zustand zu halten.",
    thankYou: "Wir bedanken uns herzlich für Ihre Hilfe!",
    startBtn: "Meldung starten",
    step1Title: "1. Ortung",
    topoReq: "* Markierung erforderlich",
    topoMarked: "Punkt markiert",
    topoInstruction: "Tippe auf den Schadenspunkt",
    noTopo: "Kein Topo verfügbar – bitte GPS nutzen",
    gpsBtn: "GPS Ortung",
    gpsFixed: "Position fixiert",
    altitude: "Höhe",
    altLabel: "Höhe (m)",
    locPlaceholder: "Ortsbeschreibung (z.B. nach dem Quergang)...",
    nextStepDescription: "Details",
    step2Title: "2. Details",
    requiredFields: "* Pflichtfelder",
    damageType: "Art auswählen",
    detailsPlaceholder: "Beschreibe den Mangel genauer...",
    photoBtn: "Fotos aufnehmen",
    photosAdded: "Bilder hinzugefügt",
    photoReq: "Min. 1 Bild erforderlich",
    backToLoc: "Zurück",
    nextToContact: "Kontaktdaten",
    step3Title: "3. Kontakt",
    emailPlaceholder: "E-Mail Adresse",
    phonePlaceholder: "Telefonnummer",
    optIn: "Status-Updates per E-Mail erhalten",
    submitBtn: "Meldung abschicken",
    submitting: "Sende...",
    completeData: "Daten vervollständigen",
    backToDetails: "Zurück",
    successTitle: "Vielen Dank!",
    successText: "Deine Meldung hilft uns sehr.",
    finish: "Fertig",
    types: { Anchor: "Anker", Cable: "Seil", Rock: "Fels", Other: "Andere" }
  },
  // IT und FR entsprechend gekürzt für die Übersichtlichkeit der Design-Vorlage
};

export default function MobileUserReport() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [lang, setLang] = useState<keyof typeof translations>('de');
  const t = translations[lang] || translations.de;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [topoUrl, setTopoUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    location: '',
    coordinates: '',
    altitude: '',
    reporter_name: '',
    contact_email: '',
    contact_phone: '',
    email_opt_in: true,
    topo_x: null as number | null,
    topo_y: null as number | null,
  });

  useEffect(() => {
    const urlLang = searchParams.get('lang') as keyof typeof translations;
    if (urlLang && translations[urlLang]) setLang(urlLang);

    const fetchTopo = async () => {
      const { data } = await supabase.from('ferratas').select('topo_url').eq('id', id).single();
      if (data?.topo_url) setTopoUrl(data.topo_url);
    };
    fetchTopo();
  }, [id, searchParams]);

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setFormData(prev => ({
        ...prev, 
        coordinates: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
        altitude: pos.coords.altitude ? `${Math.round(pos.coords.altitude)} m` : prev.altitude
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
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `${id}/user_${Date.now()}_${i}`;
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
        reporter_name: formData.reporter_name,
        contact: formData.contact_email,
        reporter_phone: formData.contact_phone,
        email_opt_in: formData.email_opt_in,
        image_urls: uploadedUrls,
        topo_x: formData.topo_x,
        topo_y: formData.topo_y,
        verified: false,
        priority: 'yellow'
      }]);
      setStep(4);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-blue-100 pb-12">
      {/* Fortschrittsbalken – jetzt feiner */}
      <div className="fixed top-0 left-0 w-full h-1 bg-slate-100 z-50">
        <div className="h-full bg-blue-600 transition-all duration-700 ease-out" style={{ width: `${(step / 4) * 100}%` }}></div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-12">

        {/* STEP 0: WILLKOMMEN */}
        {step === 0 && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex justify-center gap-1.5">
              {['de', 'it', 'en', 'fr'].map((l) => (
                <button key={l} onClick={() => setLang(l as any)} className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-tighter border transition-all ${lang === l ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>
                  {l}
                </button>
              ))}
            </div>

            <div className="text-center py-8">
              <h2 className="text-3xl font-light tracking-tight text-slate-900 leading-tight">
                {t.introTitle} <br/> <span className="font-semibold">{t.introSub}</span>
              </h2>
              <p className="text-slate-400 text-sm mt-6 leading-relaxed font-light">
                {t.introText}
              </p>
            </div>

            <button onClick={() => setStep(1)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-medium text-sm tracking-wide shadow-xl shadow-slate-200 active:scale-[0.98] transition-all">
              {t.startBtn}
            </button>
          </div>
        )}

        {/* STEP 1: LOKALISIERUNG */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-semibold tracking-tight">{t.step1Title}</h2>
              <span className="text-[10px] font-medium text-blue-500 uppercase tracking-wider">{t.topoReq}</span>
            </header>
            
            {topoUrl && (
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-3 text-center border-b border-slate-50">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                    {formData.topo_x ? `✓ ${t.topoMarked}` : t.topoInstruction}
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
                <input type="text" placeholder={t.altitude} className="w-full h-full bg-white border border-slate-100 p-4 rounded-2xl text-[11px] outline-none text-center" value={formData.altitude} onChange={e => setFormData({...formData, altitude: e.target.value})} />
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-300 uppercase">{t.altLabel}</span>
              </div>
            </div>

            <textarea placeholder={t.locPlaceholder} className="w-full bg-white border border-slate-100 p-4 rounded-2xl text-sm outline-none min-h-[80px] focus:border-blue-200 transition-colors" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />

            <button onClick={() => setStep(2)} disabled={!!topoUrl && !formData.topo_x} className={`w-full py-4 rounded-2xl font-medium text-sm transition-all ${ (!!topoUrl && !formData.topo_x) ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white'}`}>
              {t.nextStepDescription}
            </button>
          </div>
        )}

        {/* STEP 2: DETAILS */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-semibold tracking-tight">{t.step2Title}</h2>
            </header>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'Anchor', icon: '🔩', label: t.types.Anchor },
                { id: 'Cable', icon: '🪢', label: t.types.Cable },
                { id: 'Rock', icon: '🪨', label: t.types.Rock },
                { id: 'Other', icon: '❓', label: t.types.Other }
              ].map(item => (
                <button key={item.id} onClick={() => setFormData({...formData, type: item.id})}
                  className={`p-5 rounded-2xl border transition-all flex flex-col items-center gap-2 ${formData.type === item.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[10px] font-semibold uppercase">{item.label}</span>
                </button>
              ))}
            </div>

            <textarea placeholder={t.detailsPlaceholder} className="w-full bg-white border border-slate-100 p-4 rounded-2xl text-sm outline-none min-h-[120px]" onChange={e => setFormData({...formData, description: e.target.value})} value={formData.description} />

            <div className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all ${files?.length ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
              <input type="file" multiple accept="image/*" onChange={e => setFiles(e.target.files)} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <p className={`text-sm font-medium ${files?.length ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {files?.length ? `✓ ${files.length} ${t.photosAdded}` : t.photoBtn}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight">{t.photoReq}</p>
              </label>
            </div>

            <div className="space-y-3 pt-4">
              <button onClick={() => setStep(3)} disabled={!formData.type || !files?.length} className={`w-full py-4 rounded-2xl font-medium text-sm transition-all ${(!formData.type || !files?.length) ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white'}`}>
                {t.nextToContact}
              </button>
              <button onClick={() => setStep(1)} className="w-full text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t.backToLoc}</button>
            </div>
          </div>
        )}

        {/* STEP 3: KONTAKT */}
        {step === 3 && (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <h2 className="text-lg font-semibold tracking-tight">{t.step3Title}</h2>
    
    <div className="space-y-3">
      {/* Name des Melders - Neu hinzugefügt & Obligatorisch */}
      <input 
        type="text" 
        required
        placeholder="Name des Melders *" 
        className="w-full bg-white border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm font-medium" 
        value={formData.reporter_name || ''} 
        onChange={e => setFormData({...formData, reporter_name: e.target.value})} 
      />

      <div className="pt-2 pb-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Kontaktdaten für Rückfragen</p>
      </div>

      <input 
        type="email" 
        placeholder={t.emailPlaceholder} 
        className="w-full bg-white border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm" 
        value={formData.contact_email} 
        onChange={e => setFormData({...formData, contact_email: e.target.value})} 
      />
      
      <input 
        type="tel" 
        placeholder={t.phonePlaceholder} 
        className="w-full bg-white border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm" 
        value={formData.contact_phone} 
        onChange={e => setFormData({...formData, contact_phone: e.target.value})} 
      />
    </div>

    <label className="flex items-center gap-3 cursor-pointer group">
      <input 
        type="checkbox" 
        checked={formData.email_opt_in} 
        onChange={e => setFormData({...formData, email_opt_in: e.target.checked})} 
        className="w-4 h-4 rounded accent-slate-900 border-slate-200" 
      />
      <span className="text-[11px] text-slate-500 font-medium group-hover:text-slate-700 transition-colors">{t.optIn}</span>
    </label>

    <div className="space-y-3 pt-4">
      <button 
        onClick={handleSubmit} 
//        {/* Button ist deaktiviert, wenn Name ODER Email fehlen */}
        disabled={loading || !formData.contact_email || !formData.reporter_name} 
        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-medium text-sm active:scale-95 transition-all disabled:bg-slate-100 disabled:text-slate-300"
      >
        {loading ? t.submitting : t.submitBtn}
      </button>
      <button 
        onClick={() => setStep(2)} 
        className="w-full text-[11px] font-medium text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
      >
        {t.backToDetails}
      </button>
    </div>
  </div>
)}

        {/* STEP 4: ERFOLG */}
        {step === 4 && (
          <div className="text-center py-20 space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
            <h2 className="text-2xl font-semibold tracking-tight">{t.successTitle}</h2>
            <p className="text-slate-400 text-sm font-light leading-relaxed">{t.successText}</p>
            <button onClick={() => router.push(`/ferrata/${id}`)} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-medium text-sm shadow-xl shadow-slate-200">
              {t.finish}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}