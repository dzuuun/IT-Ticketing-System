import React from "react";

export default function StatusBadge({ status }) {
  const getStatusConfig = (st) => {
    switch ((st || "").toLowerCase()) {
      case "new":
        return {
          label: "New",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-300",
          dot: "bg-emerald-500",
        };
      case "assigned":
        return {
          label: "Assigned",
          bg: "bg-blue-100 text-blue-800 border-blue-300",
          dot: "bg-blue-500",
        };
      case "in_progress":
        return {
          label: "In Progress",
          bg: "bg-amber-100 text-amber-800 border-amber-300",
          dot: "bg-amber-500",
        };
      case "pending_user":
        return {
          label: "Pending Requestor",
          bg: "bg-purple-100 text-purple-800 border-purple-300",
          dot: "bg-purple-500",
        };
      case "resolved":
        return {
          label: "Resolved",
          bg: "bg-teal-100 text-teal-800 border-teal-300",
          dot: "bg-teal-500",
        };
      case "closed":
        return {
          label: "Closed",
          bg: "bg-slate-100 text-slate-700 border-slate-300",
          dot: "bg-slate-400",
        };
      default:
        return {
          label: st || "Unknown",
          bg: "bg-slate-100 text-slate-700 border-slate-300",
          dot: "bg-slate-400",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {config.label}
    </span>
  );
}
