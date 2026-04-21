import { useAuth } from '../hooks/useAuth';

export function CloudStatusBadge() {
  const { userEmail, userRole, loading } = useAuth();

  if (loading) return <div className="h-10 w-32 bg-slate-50 animate-pulse rounded-full" />;

  return (
            <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-100 rounded-full shadow-sm">
                      <div className="flex flex-col leading-none">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {userRole ? userRole : 'Rolle laden...'}
              </span>
              <span className="text-[10px] font-medium text-slate-600">
                {userEmail ? userEmail : 'Nicht angemeldet'}
              </span>
            </div>

            {/* Trennstrich */}
            <div className="h-4 w-[1px] bg-slate-100 mx-1"></div>
            
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              Cloud Live
            </span>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${userRole === 'developer' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
          </div>
        </div>
  );
}