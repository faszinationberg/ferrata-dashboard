"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

// 1. ÜBERSETZUNGEN
const translations = {
  en: {
    introTitle: "Together for",
    introSub: "Your Safety",
    introText: "With this report, you help us keep the via ferrata in perfect condition and ensure everyone's safety.",
    thankYou: "Thank you for your help!",
    startBtn: "Start Report →",
    step1Title: "1. Location",
    topoReq: "* Topo marking required",
    topoMarked: "✅ Point marked",
    topoInstruction: "📍 Tap on the damage point *",
    noTopo: "No topo available – please use GPS or description",
    gpsBtn: "🛰️ GPS Location",
    gpsFixed: "Position fixed 📍",
    altitude: "Altitude",
    altLabel: "Altitude (m)",
    locPlaceholder: "Location description (e.g., after the traverse)...",
    nextStepDescription: "-> Damage description",
    step2Title: "2. Damage Details",
    requiredFields: "* Required fields",
    damageType: "Select damage type *",
    detailsPlaceholder: "Describe the damage in detail...",
    photoBtn: "📷 Take photos *",
    photosAdded: "📸 Photos added",
    photoReq: "At least 1 photo required",
    backToLoc: "Back to location",
    nextToContact: "-> Contact details",
    step3Title: "3. Contact",
    emailPlaceholder: "Email address *",
    phonePlaceholder: "Phone number *",
    optIn: "I want to receive status updates via email",
    submitBtn: "Submit report now",
    submitting: "Sending...",
    completeData: "Complete data",
    backToDetails: "Back to details",
    successTitle: "Thank you!",
    successText: "Your report helps us keep the via ferrata safe. We will check the damage immediately.",
    finish: "Finish",
    types: { Anchor: "Anchor", Cable: "Cable", Rock: "Rock", Other: "Other" }
  },
  de: {
    introTitle: "Gemeinsam für",
    introSub: "Ihre Sicherheit",
    introText: "Mit dieser Meldung helfen Sie uns, den Klettersteig immer in einwandfreiem Zustand zu halten und die Sicherheit aller zu gewährleisten.",
    thankYou: "Wir bedanken uns herzlich für Ihre Hilfe!",
    startBtn: "Meldung starten →",
    step1Title: "1. Lokalisierung",
    topoReq: "* Topo-Markierung erforderlich",
    topoMarked: "✅ Punkt markiert",
    topoInstruction: "📍 Tippe auf den Schadenspunkt *",
    noTopo: "Kein Topo verfügbar – bitte GPS oder Beschreibung nutzen",
    gpsBtn: "🛰️ GPS Ortung",
    gpsFixed: "Position fixiert 📍",
    altitude: "Höhe",
    altLabel: "Höhe (m)",
    locPlaceholder: "Ortsbeschreibung (z.B. nach dem Quergang)...",
    nextStepDescription: "-> Schadensbeschreibung",
    step2Title: "2. Schadensdetails",
    requiredFields: "* Pflichtfelder",
    damageType: "Schadensart auswählen *",
    detailsPlaceholder: "Beschreibe den Mangel genauer...",
    photoBtn: "📷 Fotos aufnehmen *",
    photosAdded: "📸 Bilder hinzugefügt",
    photoReq: "Mindestens 1 Bild erforderlich",
    backToLoc: "Zurück zur Ortung",
    nextToContact: "-> Kontaktdaten",
    step3Title: "3. Kontakt",
    emailPlaceholder: "E-Mail Adresse *",
    phonePlaceholder: "Telefonnummer *",
    optIn: "Ich möchte Status-Updates per E-Mail erhalten",
    submitBtn: "Meldung jetzt abschicken",
    submitting: "Sende...",
    completeData: "Daten vervollständigen",
    backToDetails: "Zurück zu den Details",
    successTitle: "Vielen Dank!",
    successText: "Deine Meldung hilft uns, den Klettersteig sicher zu halten.",
    finish: "Fertig",
    types: { Anchor: "Anker", Cable: "Seil", Rock: "Fels", Other: "Andere" }
  },
  it: {
    introTitle: "Insieme per la",
    introSub: "Vostra Sicurezza",
    introText: "Con questa segnalazione ci aiutate a mantenere la via ferrata in perfette condizioni e a garantire la sicurezza di tutti.",
    thankYou: "Grazie di cuore per il vostro aiuto!",
    startBtn: "Inizia segnalazione →",
    step1Title: "1. Localizzazione",
    topoReq: "* Marcatura topo obbligatoria",
    topoMarked: "✅ Punto segnato",
    topoInstruction: "📍 Tocca il punto del danno *",
    noTopo: "Topo non disponibile – usa GPS o descrizione",
    gpsBtn: "🛰️ Localizzazione GPS",
    gpsFixed: "Posizione fissata 📍",
    altitude: "Altitudine",
    altLabel: "Altitudine (m)",
    locPlaceholder: "Descrizione del luogo (es. dopo il traverso)...",
    nextStepDescription: "-> Descrizione del danno",
    step2Title: "2. Dettagli del danno",
    requiredFields: "* Campi obbligatori",
    damageType: "Seleziona tipo di danno *",
    detailsPlaceholder: "Descrivi il problema in dettaglio...",
    photoBtn: "📷 Scatta foto *",
    photosAdded: "📸 Foto aggiunte",
    photoReq: "Almeno 1 foto richiesta",
    backToLoc: "Torna alla localizzazione",
    nextToContact: "-> Dati di contatto",
    step3Title: "3. Contatto",
    emailPlaceholder: "Indirizzo Email *",
    phonePlaceholder: "Numero di telefono *",
    optIn: "Desidero ricevere aggiornamenti via email",
    submitBtn: "Invia segnalazione ora",
    submitting: "Invio...",
    completeData: "Completa i dati",
    backToDetails: "Torna ai dettagli",
    successTitle: "Grazie mille!",
    successText: "La vostra segnalazione ci aiuta a mantenere la ferrata sicura.",
    finish: "Fine",
    types: { Anchor: "Ancoraggio", Cable: "Cavo", Rock: "Roccia", Other: "Altro" }
  },
  fr: {
    introTitle: "Ensemble pour",
    introSub: "Votre Sécurité",
    introText: "Avec ce rapport, vous nous aidez à maintenir la via ferrata en parfait état et à assurer la sécurité de tous.",
    thankYou: "Merci beaucoup pour votre aide !",
    startBtn: "Commencer le rapport →",
    step1Title: "1. Localisation",
    topoReq: "* Marquage topo requis",
    topoMarked: "✅ Point marqué",
    topoInstruction: "📍 Appuyez sur le point de dommage *",
    noTopo: "Pas de topo disponible – veuillez utiliser le GPS ou la description",
    gpsBtn: "🛰️ Localisation GPS",
    gpsFixed: "Position fixée 📍",
    altitude: "Altitude",
    altLabel: "Altitude (m)",
    locPlaceholder: "Description du lieu (ex. après la traversée)...",
    nextStepDescription: "-> Description des dommages",
    step2Title: "2. Détails des dommages",
    requiredFields: "* Champs obligatoires",
    damageType: "Type de dommage *",
    detailsPlaceholder: "Décrivez le dommage en détail...",
    photoBtn: "📷 Prendre des photos *",
    photosAdded: "📸 Photos ajoutées",
    photoReq: "Au moins 1 photo requise",
    backToLoc: "Retour à la localisation",
    nextToContact: "-> Coordonnées",
    step3Title: "3. Contact",
    emailPlaceholder: "Adresse e-mail *",
    phonePlaceholder: "Numéro de téléphone *",
    optIn: "Je souhaite recevoir des mises à jour par e-mail",
    submitBtn: "Envoyer le rapport",
    submitting: "Envoi...",
    completeData: "Compléter les données",
    backToDetails: "Retour aux détails",
    successTitle: "Merci beaucoup !",
    successText: "Votre rapport nous aide à maintenir la via ferrata en sécurité.",
    finish: "Terminer",
    types: { Anchor: "Ancrage", Cable: "Câble", Rock: "Rocher", Other: "Autre" }
  }
};

export default function MobileUserReport() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  // 2. SPRACH-LOGIK (Default EN, oder via URL ?lang=it)
  const [lang, setLang] = useState<keyof typeof translations>('en');
  const t = translations[lang];

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
    contact_email: '',
    contact_phone: '',
    email_opt_in: true,
    topo_x: null as number | null,
    topo_y: null as number | null,
  });

  useEffect(() => {
    // Sprache aus URL lesen falls vorhanden
    const urlLang = searchParams.get('lang') as keyof typeof translations;
    if (urlLang && translations[urlLang]) {
      setLang(urlLang);
    }

    const fetchTopo = async () => {
      const { data } = await supabase.from('ferratas').select('topo_url').eq('id', id).single();
      if (data?.topo_url) setTopoUrl(data.topo_url);
    };
    fetchTopo();
  }, [id, searchParams]);

  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert("GPS not supported");
      return;
    }
    const options = { enableHighAccuracy: true, timeout: 10000 };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev, 
          coordinates: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
          altitude: pos.coords.altitude ? `${Math.round(pos.coords.altitude)} m` : prev.altitude
        }));
      }, 
      () => alert("GPS failed"),
      options
    );
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
    if (!files || files.length === 0) return alert(t.photoReq);
    setLoading(true);

    try {
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `${id}/user_${Date.now()}_${i}`;
        const { error: sErr } = await supabase.storage.from('reports').upload(path, file);
        if (sErr) throw sErr;
        uploadedUrls.push(supabase.storage.from('reports').getPublicUrl(path).data.publicUrl);
      }

      const { error } = await supabase.from('reports').insert([{
        ferrata_id: id,
        type: formData.type,
        description: formData.description,
        location: formData.location,
        coordinates: formData.coordinates,
        altitude: formData.altitude,
        contact: formData.contact_email,
        reporter_phone: formData.contact_phone,
        email_opt_in: formData.email_opt_in,
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls,
        topo_x: formData.topo_x,
        topo_y: formData.topo_y,
        verified: false,
        priority: 'yellow'
      }]);

      if (error) throw error;
      setStep(4);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-10">
      <div className="w-full h-1 bg-slate-800">
        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
      </div>

      <div className="max-w-lg mx-auto p-6">

        {/* STEP 0: WILLKOMMEN & SPRACHAUSWAHL */}
        {step === 0 && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 py-4">
            {/* SPRACH-SWITCHER */}
            <div className="flex justify-center gap-2 mb-4">
              {['en', 'de', 'it', 'fr'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l as any)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${lang === l ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[2.5rem] text-center space-y-6">
              <div className="text-5xl animate-bounce">🏔️</div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic leading-tight text-white">
                  {t.introTitle} <br/> <span className="text-blue-500">{t.introSub}</span>
                </h2>
                <p className="text-slate-300 text-sm font-medium leading-relaxed px-2">
                  {t.introText}
                </p>
                <p className="text-blue-400 text-[11px] font-black uppercase tracking-widest pt-2">
                  {t.thankYou}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <button 
                onClick={() => setStep(1)} 
                className="w-full bg-white text-slate-900 p-6 rounded-2xl font-black uppercase italic tracking-widest shadow-2xl hover:bg-blue-600 hover:text-white transition-all active:scale-95"
              >
                {t.startBtn}
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: LOKALISIERUNG */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-end">
              <h2 className="text-2xl font-black uppercase italic text-white">{t.step1Title}</h2>
              {topoUrl && <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest pb-1">{t.topoReq}</span>}
            </div>
            
            {topoUrl ? (
              <div className={`bg-slate-800 p-2 rounded-3xl border-2 transition-all ${formData.topo_x ? 'border-emerald-500/50' : 'border-blue-500/30'}`}>
                <p className="text-[10px] font-black uppercase text-center py-2 text-white">
                  {formData.topo_x ? t.topoMarked : t.topoInstruction}
                </p>
                <div className="relative rounded-2xl overflow-hidden cursor-crosshair bg-slate-900" onClick={handleTopoClick}>
                  <img src={topoUrl} alt="Topo" className={`w-full h-auto transition-opacity duration-500 ${formData.topo_x ? 'opacity-100' : 'opacity-40'}`} />
                  {formData.topo_x && (
                    <div className="absolute w-6 h-6 bg-red-500 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-xl animate-pulse"
                         style={{ left: `${formData.topo_x}%`, top: `${formData.topo_y}%` }} />
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase italic">{t.noTopo}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {formData.coordinates ? (
                <div className="bg-emerald-500/10 border border-emerald-500/40 p-4 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-[8px] font-black uppercase text-emerald-400 mb-1">{t.gpsFixed}</span>
                  <span className="text-[9px] font-mono text-white truncate w-full text-center">{formData.coordinates}</span>
                </div>
              ) : (
                <button type="button" onClick={handleGPS} className="bg-slate-800 border border-slate-700 p-4 rounded-2xl font-black text-[10px] text-slate-300 uppercase flex items-center justify-center gap-2">
                  {t.gpsBtn}
                </button>
              )}
              <div className="relative">
                <input 
                  type="text" placeholder={t.altitude}
                  className="w-full h-full bg-slate-800 p-4 rounded-2xl font-bold outline-none text-center border border-slate-700 text-white"
                  value={formData.altitude} onChange={e => setFormData({...formData, altitude: e.target.value})}
                />
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[7px] font-black text-slate-500 uppercase">{t.altLabel}</span>
              </div>
            </div>

            <textarea 
              placeholder={t.locPlaceholder}
              className="w-full bg-slate-800 p-5 rounded-2xl font-bold outline-none min-h-[80px] border border-slate-700 text-sm"
              value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
            />

            <button 
              onClick={() => setStep(2)} 
              disabled={!!topoUrl && !formData.topo_x}
              className={`w-full p-5 rounded-2xl font-black uppercase italic shadow-xl transition-all ${
                (!!topoUrl && !formData.topo_x) ? 'bg-slate-800 text-slate-600 opacity-50' : 'bg-white text-slate-900 active:scale-95'
              }`}
            >
              {(!!topoUrl && !formData.topo_x) ? t.topoInstruction : t.nextStepDescription}
            </button>
          </div>
        )}

        {/* STEP 2: SCHADENSDETAILS */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-end">
              <h2 className="text-2xl font-black uppercase italic text-white">{t.step2Title}</h2>
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest pb-1">{t.requiredFields}</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2">{t.damageType}</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Anchor', icon: '🔩', key: 'Anchor' },
                  { id: 'Cable', icon: '🪢', key: 'Cable' },
                  { id: 'Rock', icon: '🪨', key: 'Rock' },
                  { id: 'Other', icon: '❓', key: 'Other' }
                ].map(item => (
                  <button 
                    key={item.id} type="button" onClick={() => setFormData({...formData, type: item.id})}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${formData.type === item.id ? 'border-blue-500 bg-blue-500/20' : 'border-slate-800 bg-slate-800'}`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className={`text-[8px] font-black uppercase ${formData.type === item.id ? 'text-blue-400' : 'text-slate-500'}`}>
                      {t.types[item.key as keyof typeof t.types]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <textarea 
              placeholder={t.detailsPlaceholder}
              className="w-full bg-slate-800 p-5 rounded-2xl font-bold outline-none min-h-[100px] border border-slate-700 text-sm text-white"
              onChange={e => setFormData({...formData, description: e.target.value})}
              value={formData.description}
            />

            <div className={`bg-slate-800 p-6 rounded-3xl border-2 border-dashed transition-all ${files && files.length > 0 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700'}`}>
              <div className="text-center space-y-3">
                <input type="file" multiple accept="image/*" onChange={e => setFiles(e.target.files)} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className={`inline-block px-6 py-3 rounded-full font-black uppercase text-[10px] cursor-pointer ${files && files.length > 0 ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                  {files && files.length > 0 ? t.photosAdded : t.photoBtn}
                </label>
                <p className="text-[9px] text-slate-500 uppercase font-bold">{files && files.length > 0 ? `${files.length} Files` : t.photoReq}</p>
              </div>
            </div>

            <div className="flex flex-col gap-6 pt-2">
              <button 
                type="button" onClick={() => setStep(3)} 
                disabled={!formData.type || !files || files.length === 0}
                className={`w-full p-5 rounded-2xl font-black uppercase italic shadow-xl transition-all ${(!formData.type || !files || files.length === 0) ? 'bg-slate-800 text-slate-600 opacity-50' : 'bg-white text-slate-900'}`}
              >
                {!formData.type ? t.damageType : (!files || files.length === 0) ? t.photoReq : t.nextToContact}
              </button>
              <button onClick={() => setStep(1)} className="w-full text-slate-500 font-bold uppercase text-[10px]">{t.backToLoc}</button>
            </div>
          </div>
        )}

        {/* STEP 3: KONTAKT */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-end">
              <h2 className="text-2xl font-black uppercase italic text-white">{t.step3Title}</h2>
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest pb-1">{t.requiredFields}</span>
            </div>
            
            <div className="space-y-4">
              <input 
                type="email" placeholder={t.emailPlaceholder}
                className={`w-full bg-slate-800 p-5 rounded-2xl font-bold outline-none border-2 transition-all ${formData.contact_email ? 'border-emerald-500/30' : 'border-slate-700'}`}
                value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})}
              />
              <input 
                type="tel" placeholder={t.phonePlaceholder}
                className={`w-full bg-slate-800 p-5 rounded-2xl font-bold outline-none border-2 transition-all ${formData.contact_phone ? 'border-emerald-500/30' : 'border-slate-700'}`}
                value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})}
              />
            </div>

            <label className="flex items-center gap-3 px-2 cursor-pointer group">
              <input type="checkbox" checked={formData.email_opt_in} onChange={e => setFormData({...formData, email_opt_in: e.target.checked})} className="w-4 h-4 rounded accent-blue-500" />
              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-tight">{t.optIn}</span>
            </label>

            <div className="flex flex-col gap-4 pt-4">
              <button 
                type="button" onClick={handleSubmit} 
                disabled={loading || !formData.contact_email || !formData.contact_phone}
                className={`w-full p-6 rounded-[2rem] font-black uppercase italic shadow-2xl transition-all ${(loading || !formData.contact_email || !formData.contact_phone) ? 'bg-slate-800 text-slate-600 opacity-50' : 'bg-white text-slate-900 active:scale-95'}`}
              >
                {loading ? t.submitting : !formData.contact_email || !formData.contact_phone ? t.completeData : t.submitBtn}
              </button>
              <button onClick={() => setStep(2)} className="w-full text-slate-500 font-bold uppercase text-[10px] py-2 text-center">{t.backToDetails}</button>
            </div>
          </div>
        )}

        {/* STEP 4: ERFOLG */}
        {step === 4 && (
          <div className="text-center py-20 space-y-6 animate-in zoom-in-95">
            <div className="text-6xl">🏔️</div>
            <h2 className="text-3xl font-black uppercase italic">{t.successTitle}</h2>
            <p className="text-slate-400 font-medium">{t.successText}</p>
            <button onClick={() => router.push(`/ferrata/${id}`)} className="bg-white text-slate-900 px-10 py-4 rounded-full font-black uppercase italic shadow-xl">{t.finish}</button>
          </div>
        )}
      </div>
    </main>
  );
}