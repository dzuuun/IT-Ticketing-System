import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";

const ToastContext = createContext(null);

const styles = {
  success: {
    icon: "check_circle",
    iconClass: "bg-emerald-100 text-emerald-700",
    accent: "border-emerald-200",
  },
  error: {
    icon: "error",
    iconClass: "bg-rose-100 text-rose-700",
    accent: "border-rose-200",
  },
  info: {
    icon: "info",
    iconClass: "bg-blue-100 text-blue-700",
    accent: "border-blue-200",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const lastToast = useRef({ message: "", type: "", at: 0 });

  const dismiss = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message, type = "info", options = {}) => {
      const text = String(message || "Something went wrong.");
      const now = Date.now();
      if (
        lastToast.current.message === text &&
        lastToast.current.type === type &&
        now - lastToast.current.at < 800
      ) {
        return null;
      }
      lastToast.current = { message: text, type, at: now };
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((items) => [
        ...items.slice(-3),
        { id, message: text, type, title: options.title },
      ]);
      window.setTimeout(() => dismiss(id), options.duration ?? 4500);
      return id;
    },
    [dismiss],
  );

  const toast = {
    show,
    success: (message, options) => show(message, "success", options),
    error: (message, options) => show(message, "error", options),
    info: (message, options) => show(message, "info", options),
  };

  useEffect(() => {
    const onToast = (event) => {
      const detail = event.detail || {};
      show(detail.message, detail.type, { title: detail.title });
    };
    const nativeAlert = window.alert;
    window.addEventListener("ndmu:toast", onToast);
    window.alert = (message) => show(message, "error");
    return () => {
      window.removeEventListener("ndmu:toast", onToast);
      window.alert = nativeAlert;
    };
  }, [show]);

  useEffect(() => {
    const isAction = (method) =>
      ["post", "put", "patch", "delete"].includes(method?.toLowerCase());
    const responseId = axios.interceptors.response.use(
      (response) => {
        if (isAction(response.config?.method)) {
          show(
            response.data?.message || "Action completed successfully.",
            "success",
          );
        }
        return response;
      },
      (error) => {
        if (isAction(error.config?.method)) {
          show(
            error.response?.data?.message || "Unable to complete that action.",
            "error",
          );
        }
        return Promise.reject(error);
      },
    );
    return () => axios.interceptors.response.eject(responseId);
  }, [show]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((item) => (
          <Toast key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDismiss }) {
  const tone = styles[item.type] || styles.info;
  return (
    <div
      className={`animate-ndmu-toast pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3 shadow-lg shadow-slate-900/10 ${tone.accent}`}
      role={item.type === "error" ? "alert" : "status"}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone.iconClass}`}
      >
        <span className="material-symbols-outlined text-lg">{tone.icon}</span>
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        {item.title && (
          <p className="text-xs font-extrabold text-slate-900">{item.title}</p>
        )}
        <p className="text-xs font-medium leading-5 text-slate-700">
          {item.message}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Dismiss notification"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
