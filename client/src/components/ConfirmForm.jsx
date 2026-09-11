import React, { useState } from "react";
import Modal from "./Modal";

/**
 * A form that preserves native browser validation, then asks for one explicit
 * confirmation before running its existing submit handler.
 */
export default function ConfirmForm({
  onConfirm,
  title = "Confirm changes?",
  description = "Please review the details before continuing.",
  confirmLabel = "Confirm",
  children,
  ...formProps
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requestConfirmation = (event) => {
    event.preventDefault();
    setOpen(true);
  };

  const confirm = async () => {
    setSubmitting(true);
    try {
      // Existing form handlers only require preventDefault(), allowing this
      // component to be adopted without duplicating mutation logic.
      await onConfirm({ preventDefault() {} });
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const submitConfirmation = (event) => {
    event.preventDefault();
    if (!submitting) confirm();
  };

  return (
    <>
      <form {...formProps} onSubmit={requestConfirmation}>
        {children}
      </form>
      <Modal
        isOpen={open}
        onClose={() => !submitting && setOpen(false)}
        title={title}
        maxWidth="max-w-md"
      >
        <form className="space-y-5 text-sm" onSubmit={submitConfirmation}>
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <span className="material-symbols-outlined mt-0.5 text-xl text-amber-600">
              help
            </span>
            <p className="leading-5">{description}</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setOpen(false)}
              className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
            >
              Go back
            </button>
            <button
              type="submit"
              autoFocus
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ndmu-green-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-ndmu-green-600 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                check_circle
              </span>
              {submitting ? "Saving..." : confirmLabel}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
