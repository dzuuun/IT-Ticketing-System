import React from "react";
import { Link } from "react-router-dom";
import { appPath } from "../services/api";

export default function Navbar({ onToggleSidebar, sidebarOpen }) {
  return (
    <header className="z-50 shrink-0 border-b border-ndmu-green-800 bg-ndmu-green-900 text-white shadow-md">
      <div className="flex h-[72px] items-center justify-between px-4 sm:px-6 min-[901px]:h-20 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
              title={sidebarOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
              className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-100/60 bg-ndmu-green-800 text-white shadow-sm transition-all duration-200 hover:bg-ndmu-green-700 hover:shadow-md active:scale-95"
            >
              <span className="relative block h-4 w-5" aria-hidden="true">
                <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-y-[7px] rotate-45" : ""}`} />
                <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${sidebarOpen ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"}`} />
                <span className={`absolute bottom-0 left-0 h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-in-out ${sidebarOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
              </span>
            </button>
            <Link to="/" className="group flex items-center gap-3">
              <img
                src={appPath("/images/ndmu-logo.png")}
                alt="NDMU seal"
                className="h-11 w-11 object-contain transition-transform group-hover:scale-105"
              />
              <div>
                <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  NDMU{" "}
                  <span className="text-ndmu-gold-400 font-medium">
                    ICT-MIS Service Desk
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100/70 font-medium">
                  Excellence through service
                </div>
              </div>
            </Link>
          </div>
      </div>
    </header>
  );
}
