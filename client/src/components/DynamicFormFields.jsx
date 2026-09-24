import React from "react";
import SearchableSelect from "./SearchableSelect";

export default function DynamicFormFields({ schema, values, onChange }) {
  if (!schema || !Array.isArray(schema) || schema.length === 0) {
    return null;
  }

  const handleFieldChange = (fieldId, val) => {
    onChange({
      ...values,
      [fieldId]: val,
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-ndmu-green-700 text-sm font-black text-white">
          2
        </span>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ndmu-green-700">
            Service details
          </p>
          <h2 className="text-base font-extrabold text-slate-900">
            Information for this service
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
        {schema.map((field) => {
          const val = values[field.id] || "";

          if (field.type === "info") {
            return (
              <div
                key={field.id}
                role="note"
                className="md:col-span-2 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-950"
              >
                <span className="material-symbols-outlined mt-0.5 text-xl text-blue-700">
                  info
                </span>
                <div>
                  <p className="text-sm font-bold">{field.label}</p>
                  {field.placeholder && (
                    <p className="mt-1 text-xs leading-5 text-blue-900/80">
                      {field.placeholder}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          if (field.type === "select") {
            return (
              <div
                key={field.id}
                className={field.fullWidth ? "md:col-span-2" : ""}
              >
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {field.label}{" "}
                  {field.required && <span className="text-rose-500">*</span>}
                </label>
                <SearchableSelect
                  required={field.required}
                  value={val}
                  onChange={(nextValue) =>
                    handleFieldChange(field.id, nextValue)
                  }
                  options={field.options || []}
                  placeholder="Search and select an option"
                />
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={field.id} className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {field.label}{" "}
                  {field.required && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  required={field.required}
                  rows={3}
                  value={val}
                  placeholder={field.placeholder || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100"
                />
              </div>
            );
          }

          return (
            <div
              key={field.id}
              className={field.fullWidth ? "md:col-span-2" : ""}
            >
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {field.label}{" "}
                {field.required && <span className="text-rose-500">*</span>}
              </label>
              <input
                type={field.type || "text"}
                required={field.required}
                value={val}
                placeholder={field.placeholder || ""}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
