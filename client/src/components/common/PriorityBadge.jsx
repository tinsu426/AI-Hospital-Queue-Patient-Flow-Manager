import React from 'react';
import { AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function PriorityBadge({ priority, size = 'sm' }) {
  const p = (priority || 'NORMAL').toUpperCase();

  if (p === 'EMERGENCY') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-bold uppercase rounded-full tracking-wider animate-pulse bg-red-100 text-red-700 border border-red-300 ${size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'}`}>
        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
        Emergency
      </span>
    );
  }

  if (p === 'URGENT') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold uppercase rounded-full tracking-wide bg-amber-100 text-amber-800 border border-amber-300 ${size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        Urgent
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 font-medium uppercase rounded-full tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200 ${size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`}>
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
      Normal
    </span>
  );
}
