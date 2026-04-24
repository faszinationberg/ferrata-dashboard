"use client";
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 text-slate-900 font-sans selection:bg-blue-100">
      
      <div className="max-w-md w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* BRANDING */}
        <header className="space-y-3">
          <div className="inline-block px-4 py-1.5 bg-blue-50 rounded-full">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Safety First</span>
          </div>
          <h1 className="text-5xl font-light tracking-tight text-slate-900">
            ferrata<span className="font-semibold text-blue-600">.report</span>
          </h1>
          <p className="text-slate-400 text-sm tracking-wide font-light uppercase">
            Zentrales Mängelmanagement
          </p>
        </header>

        {/* HAUPT-AKTIONEN */}
        <div className="space-y-4">
          
          {/* FÜR WANDERER / MELDER */}
          <div className="group bg-white border border-slate-200/60 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/30 transition-all hover:shadow-2xl hover:shadow-blue-100/50 hover:-translate-y-1">
            <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">🏔️⚠️</div>
            <div className="space-y-2 mb-8">
              <h2 className="text-xl font-bold text-slate-800">Mangel entdeckt?</h2>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                Du hast eine Beschädigung am Steig bemerkt? Melde sie hier direkt an die zuständigen Techniker.
              </p>
            </div>
            <Link 
              href="/report" 
              className="block w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 ring-4 ring-transparent hover:ring-blue-50"
            >
              Klettersteig suchen & melden
            </Link>
          </div>

          {/* FÜR PROFIS / LOGIN */}
          <div className="pt-8 space-y-6">
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] w-12 bg-slate-200"></div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Interner Bereich</span>
              <div className="h-[1px] w-12 bg-slate-200"></div>
            </div>
            
            <Link 
              href="/login" 
              className="inline-flex items-center gap-3 px-8 py-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-blue-600 hover:border-blue-100 hover:shadow-sm font-bold text-xs transition-all"
            >
              <span className="opacity-50">🔐</span> Login für Betreiber & Techniker
            </Link>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="pt-12">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.25em]">
            Monitoring & Documentation <br/>
            <span className="font-light text-slate-400">G. Ausserhofer</span>
          </p>
        </footer>

      </div>
    </main>
  );
}