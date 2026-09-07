import React from 'react';

export default function PriorityBadge({ priority }) {
  const getPriorityConfig = (p) => {
    switch ((p || '').toLowerCase()) {
      case 'critical':
        return { label: 'Critical', bg: 'bg-rose-100 text-rose-800 border-rose-300', icon: 'error' };
      case 'urgent':
        return { label: 'Urgent', bg: 'bg-orange-100 text-orange-800 border-orange-300', icon: 'warning' };
      case 'high':
        return { label: 'High', bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: 'arrow_upward' };
      case 'medium':
        return { label: 'Normal / Medium', bg: 'bg-blue-100 text-blue-800 border-blue-300', icon: 'remove' };
      case 'low':
        return { label: 'Low', bg: 'bg-slate-100 text-slate-700 border-slate-300', icon: 'arrow_downward' };
      default:
        return { label: p || 'Normal', bg: 'bg-slate-100 text-slate-700 border-slate-300', icon: 'remove' };
    }
  };

  const config = getPriorityConfig(priority);

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}>
      <span className="material-symbols-outlined text-[14px]">{config.icon}</span>
      {config.label}
    </span>
  );
}

