// lib/priorityConfig.ts
export type PriorityType = 'niedrig' | 'mittel' | 'hoch' | 'kritisch';

export const priorityStyles: Record<PriorityType, { 
  bg: string; 
  border: string; 
  text: string; 
  badge: string; 
  rank: number; // <-- Das muss in den Typ
  animate?: string; 
}> = {
  niedrig: {
    bg: 'bg-slate-200',
    border: 'border-slate-200',
    text: 'text-slate-400',
    badge: 'bg-white text-slate-400 border-slate-200',
    rank: 4
  },
  mittel: {
    bg: 'bg-yellow-400',
    border: 'border-yellow-500',
    text: 'text-yellow-900',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    rank: 3
  },
  hoch: {
    bg: 'bg-orange-500',
    border: 'border-orange-600',
    text: 'text-white',
    badge: 'bg-orange-50 text-orange-600 border-orange-100',
    rank: 2
  },
  kritisch: {
    bg: 'bg-red-600',
    border: 'border-red-700',
    text: 'text-white',
    badge: 'bg-red-600 text-white border-red-700',
    rank: 1,
    animate: 'animate-pulse'
  }
};