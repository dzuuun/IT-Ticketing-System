import React from "react";
import { formatDistanceToNow, isPast } from "date-fns";

export default function SlaCountdown({
  targetDate,
  isCompleted,
  label = "SLA Target",
}) {
  if (!targetDate) return null;

  const date = new Date(targetDate);
  const overdue = isPast(date) && !isCompleted;

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
        <span className="material-symbols-outlined text-[14px]">
          check_circle
        </span>
        Met SLA
      </span>
    );
  }

  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 animate-pulse">
        <span className="material-symbols-outlined text-[14px]">timer_off</span>
        Overdue by {formatDistanceToNow(date)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
      <span className="material-symbols-outlined text-[14px]">schedule</span>
      {label}: {formatDistanceToNow(date, { addSuffix: true })}
    </span>
  );
}
