import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

let libraryPromise;
function loadGoogleLibrary() {
  if (window.google?.accounts?.id)
    return Promise.resolve(window.google.accounts.id);
  if (!libraryPromise) {
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      const timeout = window.setTimeout(fail, 15000);
      function fail() {
        window.clearTimeout(timeout);
        script.remove();
        reject(new Error("Google sign-in could not load."));
      }
      script.onerror = fail;
      script.onload = () => {
        window.clearTimeout(timeout);
        if (window.google?.accounts?.id) resolve(window.google.accounts.id);
        else fail();
      };
      document.head.appendChild(script);
    }).catch((error) => {
      libraryPromise = null;
      throw error;
    });
  }
  return libraryPromise;
}

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let observer;
    const container = containerRef.current;
    const initialize = async () => {
      setStatus("loading");
      try {
        const { data } = await axios.get("/auth/google/config");
        if (cancelled) return;
        if (!data.enabled) {
          setStatus("unavailable");
          return;
        }
        const google = await loadGoogleLibrary();
        if (cancelled) return;
        google.initialize({
          client_id: data.client_id,
          nonce: data.nonce,
          auto_select: false,
          callback: async ({ credential }) => {
            if (cancelled) return;
            try {
              await callbackRef.current(credential);
            } catch {
              // A rejected attempt needs a fresh browser-bound nonce.
              if (!cancelled) setAttempt((current) => current + 1);
            }
          },
        });
        let previousWidth;
        const render = () => {
          const width = Math.min(400, Math.floor(container.clientWidth));
          if (!width || width === previousWidth) return;
          previousWidth = width;
          container.replaceChildren();
          google.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            width,
          });
        };
        render();
        observer = new ResizeObserver(render);
        observer.observe(container);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    initialize();
    return () => {
      cancelled = true;
      observer?.disconnect();
      container.replaceChildren();
    };
  }, [attempt]);

  return (
    <div aria-busy={status === "loading" || disabled}>
      <div
        ref={containerRef}
        className={`flex min-h-10 justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
      />
      {status !== "ready" && (
        <p role="status" className="text-center text-xs text-slate-500">
          {status === "loading"
            ? "Loading Google sign-in…"
            : status === "unavailable"
              ? "Google sign-in is currently unavailable."
              : "Google sign-in could not load. Please reload the page."}
        </p>
      )}
    </div>
  );
}
