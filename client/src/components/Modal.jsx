import React, { useEffect } from "react";
import { createPortal } from "react-dom";

let openModalCount = 0;
let previousBodyOverflow = "";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
  allowOverflow = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      if (openModalCount === 0)
        previousBodyOverflow = document.body.style.overflow;
      openModalCount += 1;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      if (isOpen) {
        openModalCount = Math.max(0, openModalCount - 1);
        if (openModalCount === 0)
          document.body.style.overflow = previousBodyOverflow;
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="animate-ndmu-backdrop fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
      <div
        className={`animate-ndmu-modal relative my-auto flex w-full max-h-[calc(100dvh-2rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl ${maxWidth} ${allowOverflow ? "overflow-visible" : "overflow-hidden"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div
          className={`min-h-0 flex-1 p-6 ${allowOverflow ? "overflow-visible" : "overflow-y-auto"}`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
