import React, { useEffect, useMemo, useRef, useState } from "react";

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Search and select…",
  required = false,
  disabled = false,
  className = "",
  onCreate,
  createLabel = "Add",
}) {
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const normalizedOptions = useMemo(
    () =>
      options.map((option) =>
        typeof option === "object"
          ? { value: String(option.value), label: option.label }
          : { value: String(option), label: String(option) },
      ),
    [options],
  );
  const selected = normalizedOptions.find((option) => option.value === String(value || ""));
  const visibleOptions = normalizedOptions.filter((option) =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const createValue = search.trim();
  const canCreate =
    Boolean(onCreate && createValue) &&
    !normalizedOptions.some(
      (option) => option.label.toLowerCase() === createValue.toLowerCase(),
    );

  const createOption = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(createValue);
      onChange(String(created?.value ?? created?.id ?? created?.name ?? createValue));
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);
  useEffect(() => {
    if (open) {
      setSearch("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input tabIndex={-1} aria-hidden="true" readOnly required={required} value={value || ""} className="pointer-events-none absolute h-px w-px opacity-0" />
      <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 text-left text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100 disabled:cursor-not-allowed disabled:bg-slate-50">
        <span className={selected ? "truncate text-slate-800" : "truncate text-slate-400"}>{selected?.label || placeholder}</span>
        <span className="material-symbols-outlined ml-2 text-lg text-slate-400">{open ? "expand_less" : "expand_more"}</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2"><div className="relative"><span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-slate-400">search</span><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search options…" className="h-9 w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-xs outline-none focus:border-ndmu-green-600" /></div></div>
          <div role="listbox" className="max-h-48 overflow-y-auto p-1.5">
            {visibleOptions.length ? visibleOptions.map((option) => (
              <button key={option.value} type="button" role="option" aria-selected={option.value === String(value || "")} onClick={() => { onChange(option.value); setOpen(false); }} className={`block w-full rounded-lg px-3 py-2 text-left text-xs transition ${option.value === String(value || "") ? "bg-ndmu-green-50 font-bold text-ndmu-green-800" : "text-slate-700 hover:bg-slate-50"}`}>{option.label}</button>
            )) : <p className="px-3 py-3 text-xs text-slate-400">No matching options.</p>}
            {canCreate && (
              <button type="button" onClick={createOption} disabled={creating} className="mt-1 block w-full rounded-lg border border-dashed border-ndmu-green-300 bg-ndmu-green-50 px-3 py-2 text-left text-xs font-bold text-ndmu-green-800 hover:bg-ndmu-green-100 disabled:opacity-60">
                {creating ? "Adding…" : `${createLabel} “${createValue}”`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
