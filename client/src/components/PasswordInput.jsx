import React, { useEffect, useId, useState } from "react";

export default function PasswordInput({
  id,
  className = "",
  visibilityLabel = "password",
  disabled = false,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);
  const toggleLabel = `${visible ? "Hide" : "Show"} ${visibilityLabel}`;

  useEffect(() => {
    if (!props.value) setVisible(false);
  }, [props.value]);

  return (
    <div className="relative">
      <input
        {...props}
        id={inputId}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        aria-label={toggleLabel}
        title={toggleLabel}
        aria-pressed={visible}
        aria-controls={inputId}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-slate-500 transition hover:text-ndmu-green-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ndmu-green-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-lg">
          {visible ? "visibility_off" : "visibility"}
        </span>
      </button>
    </div>
  );
}
