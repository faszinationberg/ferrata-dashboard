"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [lang, setLang] = useState<'de' | 'it' | 'en' | 'fr'>('de');

  const content = {
    de: {
      safety: "Sicherheit zuerst",
      subtitle: "Zentrales Mängelmanagement",
      introTitle: "Gemeinsam für",
      introSub: "Ihre Sicherheit",
      introText: "ferrata.report nutzt die Aufmerksamkeit der Community, um die Sicherheit an Klettersteigen zu erhöhen. Durch die direkte Vernetzung werden Mängel schneller erkannt.",
      cardTitle: "Mangel entdeckt?",
      cardDesc: "Helfen Sie uns, den Klettersteig in einwandfreiem Zustand zu halten. Melden Sie Schäden direkt hier.",
      cardBtn: "Meldung starten",
      internalArea: "Interner Bereich",
      owner: "Betreiber",
      tech: "Techniker",
      footer: "Monitoring & Documentation"
    },
    it: {
      safety: "La sicurezza prima",
      subtitle: "Gestione centralizzata difetti",
      introTitle: "Insieme per la",
      introSub: "vostra sicurezza",
      introText: "ferrata.report sfrutta l'attenzione della comunità per aumentare la sicurezza. Grazie al collegamento diretto, i difetti vengono rilevati più rapidamente.",
      cardTitle: "Notato un difetto?",
      cardDesc: "Aiutateci a mantenere la ferrata in perfette condizioni. Segnalate i danni direttamente qui.",
      cardBtn: "Inizia segnalazione",
      internalArea: "Area interna",
      owner: "Gestore",
      tech: "Tecnico",
      footer: "Monitoring & Documentation — G. Ausserhofer"
    },
    en: {
      safety: "Safety First",
      subtitle: "Centralized Defect Management",
      introTitle: "Together for",
      introSub: "Your Safety",
      introText: "ferrata.report uses community awareness to increase safety on via ferratas. Direct networking allows defects to be identified faster.",
      cardTitle: "Found a defect?",
      cardDesc: "Help us keep the via ferrata in perfect condition. Report damage directly here.",
      cardBtn: "Start Report",
      internalArea: "Internal Area",
      owner: "Owner",
      tech: "Technician",
      footer: "Monitoring & Documentation — G. Ausserhofer"
    },
    fr: {
      safety: "La sécurité d'abord",
      subtitle: "Gestion centralisée des défauts",
      introTitle: "Ensemble pour",
      introSub: "votre sécurité",
      introText: "ferrata.report utilise la vigilance de la communauté pour accroître la sécurité. Le réseautage direct permet d'identifier les défauts plus rapidement.",
      cardTitle: "Un défaut trouvé ?",
      cardDesc: "Aidez-nous à maintenir la via ferrata in parfait état. Signalez les dommages directement ici.",
      cardBtn: "Commencer le rapport",
      internalArea: "Espace interne",
      owner: "Exploitant",
      tech: "Technicien",
      footer: "Monitoring & Documentation — G. Ausserhofer"
    }
  };

  const t = content[lang];

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-blue-100 pb-20">
      
      {/* SPRACHAUSWAHL - Zentriert und frei wie auf der Report-Seite */}
      <nav className="pt-12 mb-16 flex justify-center gap-1.5">
        {(['de', 'it', 'en', 'fr'] as const).map((l) => (
          <button 
            key={l}
            onClick={() => setLang(l)} 
            className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all uppercase tracking-widest ${
              lang === l ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border border-slate-100'
            }`}
          >
            {l}
          </button>
        ))}
      </nav>

      <div className="max-w-md mx-auto px-6 text-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* BRANDING - Report-Style Hierarchie */}
        <header className="space-y-6">
          <div className="inline-block px-4 py-1.5 bg-blue-50 rounded-full">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
              {t.safety}
            </span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight text-slate-900 leading-tight">
              {t.introTitle} <br/> <span className="font-semibold">{t.introSub}</span>
            </h1>
            <p className="text-slate-400 text-xs tracking-[0.3em] font-light uppercase pt-2">
              ferrata<span className="font-semibold text-blue-600">.report</span>
            </p>
          </div>
        </header>

        {/* INFO BOX - Sanftes Blau (wie im neuen Report-Step 0) */}
        <section className="bg-blue-50/50 border border-blue-100/50 p-8 rounded-2xl shadow-sm">
          <p className="text-sm leading-relaxed font-medium text-blue-900/80">
            {t.introText}
          </p>
        </section>

        {/* HAUPT-AKTION - Große Karte mit viel White-Space */}
        <div className="bg-white border border-slate-200/60 p-10 rounded-2xl shadow-xl shadow-slate-200/20 transition-all hover:shadow-2xl">
          <div className="flex justify-center mb-8">
             <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
             </div>
          </div>
          
          <div className="space-y-3 mb-10">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t.cardTitle}</h2>
            <p className="text-slate-400 text-sm leading-relaxed px-4">
              {t.cardDesc}
            </p>
          </div>

          <Link 
            href="/report" 
            className="block w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-600 transition-all shadow-xl active:scale-95"
          >
            {t.cardBtn}
          </Link>
        </div>

        {/* INTERNER BEREICH - Buttons wie auf der Report Seite */}
        <div className="pt-8 space-y-8">
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.internalArea}</span>
            <div className="h-[1px] w-12 bg-slate-100"></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link 
              href="/dashboard" 
              className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              {t.owner}
            </Link>
            
            <Link 
              href="/technician" 
              className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-orange-600 hover:border-orange-200 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
              {t.tech}
            </Link>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="pt-12">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.25em] leading-relaxed">
            {t.footer}
          </p>
        </footer>

      </div>
    </main>
  );
}