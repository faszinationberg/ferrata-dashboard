// lib/priorityConfig.ts

export const priorityStyles = {
  niedrig: {
    bg: 'bg-slate-900',
    border: 'border-slate-900',
    text: 'text-white',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    animate: ''
  },
  mittel: {
    bg: 'bg-yellow-400',
    border: 'border-yellow-500',
    text: 'text-yellow-900',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    animate: ''
  },
  hoch: {
    bg: 'bg-orange-500',
    border: 'border-orange-600',
    text: 'text-white',
    badge: 'bg-orange-50 text-orange-600 border-orange-100',
    animate: ''
  },
  kritisch: {
    bg: 'bg-red-600',
    border: 'border-red-700',
    text: 'text-white',
    badge: 'bg-red-50 text-red-600 border-red-100',
    animate: 'animate-pulse'
  }
};

// DIESE ZEILE FEHLT WAHRSCHEINLICH ODER DAS "export" DAVOR:
export type PriorityType = keyof typeof priorityStyles;