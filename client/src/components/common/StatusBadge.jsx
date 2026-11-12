import React from 'react';
import { Clock, Play, CheckCircle2, FlaskConical, AlertCircle, ArrowLeftRight } from 'lucide-react';

export default function StatusBadge({ status }) {
  const s = (status || 'WAITING').toUpperCase();

  const config = {
    WAITING: {
      label: 'Waiting',
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: Clock,
    },
    CALLED: {
      label: 'Called',
      bg: 'bg-hospital-100 text-hospital-800 border-hospital-300 animate-pulse',
      icon: AlertCircle,
    },
    SERVING: {
      label: 'Serving',
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
      icon: Play,
    },
    REFERRED_TO_LAB: {
      label: 'In Laboratory',
      bg: 'bg-purple-100 text-purple-800 border-purple-300 font-medium',
      icon: FlaskConical,
    },
    LAB_COMPLETED: {
      label: 'Lab Ready (Return)',
      bg: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
      icon: ArrowLeftRight,
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-gray-100 text-gray-600 border-gray-200',
      icon: CheckCircle2,
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'bg-red-50 text-red-600 border-red-200',
      icon: AlertCircle,
    },
  };

  const item = config[s] || config.WAITING;
  const Icon = item.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${item.bg}`}>
      <Icon className="w-3 h-3" />
      {item.label}
    </span>
  );
}
