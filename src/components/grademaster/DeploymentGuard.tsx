"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import { GradeMasterContext } from "@/context/GradeMasterContext";

/**
 * DeploymentGuard
 * 
 * Automatically detects developer updates and reloads the application:
 * 1. Catches Next.js ChunkLoadError / failed dynamic module imports and instantly reloads.
 * 2. Manages PWA Service Worker lifecycle (skipWaiting, controllerchange, periodic update).
 * 3. Heartbeat polling against /api/version to detect new Git commits or Vercel deployments.
 * 4. Defers reload safely if a student is actively taking an exam (layer === 'remedial').
 * 5. Built-in loop protection to prevent endless reload cascades.
 */
export default function DeploymentGuard() {
  const context = useContext(GradeMasterContext);
  const layer = context?.layer;

  const [updateStatus, setUpdateStatus] = useState<"idle" | "updating" | "deferred">("idle");
  const [deferredVersion, setDeferredVersion] = useState<string | null>(null);

  const isReloadingRef = useRef(false);
  const currentVersionRef = useRef<string | null>(
    process.env.NEXT_PUBLIC_APP_VERSION || null
  );

  const executeReload = async (newVersion?: string) => {
    if (isReloadingRef.current) return;
    isReloadingRef.current = true;
    setUpdateStatus("updating");

    if (newVersion) {
      sessionStorage.setItem("gm_reloaded_version", newVersion);
    }
    sessionStorage.setItem("gm_deployment_reload", Date.now().toString());

    // Trigger Service Worker updates before reload if available
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      } catch (err) {
        console.warn("[DeploymentGuard] SW update error during reload:", err);
      }
    }

    // Brief timeout so the user sees the friendly visual confirmation
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const layerRef = useRef(layer);
  useEffect(() => {
    layerRef.current = layer;
  }, [layer]);

  // Check remote version via /api/version
  const checkForUpdate = React.useCallback(async () => {
    if (isReloadingRef.current) return;

    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) return;

      const data: { version?: string; buildTime?: string } = await res.json();
      const remoteVersion = data.version;

      if (!remoteVersion) return;

      // If initial version was null, record the first response as current version
      if (!currentVersionRef.current) {
        currentVersionRef.current = remoteVersion;
        return;
      }

      // Check if developer has deployed a new build/commit
      if (remoteVersion !== currentVersionRef.current) {
        // Prevent infinite loop if already reloaded for this exact version
        const alreadyReloadedForThisVersion =
          sessionStorage.getItem("gm_reloaded_version") === remoteVersion;

        if (alreadyReloadedForThisVersion) {
          currentVersionRef.current = remoteVersion;
          return;
        }

        console.log(
          `[DeploymentGuard] Developer update detected: ${currentVersionRef.current} -> ${remoteVersion}`
        );

        // If currently in an active exam, defer reload until exam completes
        if (layerRef.current === "remedial") {
          console.log("[DeploymentGuard] Exam in progress. Deferring auto-reload.");
          setDeferredVersion(remoteVersion);
          setUpdateStatus("deferred");
        } else {
          executeReload(remoteVersion);
        }
      }
    } catch {
      // Ignore background network transient errors
    }
  }, []);

  // If update was deferred and user moves away from remedial layer, trigger reload
  useEffect(() => {
    if (updateStatus === "deferred" && layer !== "remedial" && deferredVersion) {
      console.log("[DeploymentGuard] Exam finished. Applying deferred update...");
      executeReload(deferredVersion);
    }
  }, [layer, updateStatus, deferredVersion]);

  useEffect(() => {
    // 1. Chunk load error & dynamic import failure handler
    const handleError = (event: ErrorEvent) => {
      const msg = event.message || "";
      const isChunkError =
        msg.includes("ChunkLoadError") ||
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed");

      if (isChunkError) {
        event.preventDefault();
        console.warn("[DeploymentGuard] Chunk load error detected. Reloading...");
        executeReload();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason) || "";
      const isChunkError =
        reason.includes("ChunkLoadError") ||
        reason.includes("Loading chunk") ||
        reason.includes("Failed to fetch dynamically imported module") ||
        reason.includes("Importing a module script failed");

      if (isChunkError) {
        event.preventDefault();
        console.warn("[DeploymentGuard] Unhandled chunk rejection. Reloading...");
        executeReload();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    // 2. Service Worker Lifecycle Listener
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // When a new Service Worker takes control, reload to serve new assets
      const handleControllerChange = () => {
        if (!isReloadingRef.current) {
          console.log("[DeploymentGuard] Service Worker controller changed. Reloading...");
          if (layer === "remedial") {
            setUpdateStatus("deferred");
          } else {
            executeReload();
          }
        }
      };

      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

      // Periodically trigger registration.update()
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.update().catch(() => {});

          reg.addEventListener("updatefound", () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener("statechange", () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  installingWorker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });
        })
        .catch(() => {});
    }

    // 3. Heartbeat polling for version updates (every 45 seconds)
    const intervalId = setInterval(checkForUpdate, 45000);

    // Initial check on mount after short grace period
    const initialTimer = setTimeout(checkForUpdate, 3000);

    // 4. Check on tab visibility / focus change (e.g. user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((reg) => reg.update()).catch(() => {});
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // 5. Cleanup reload timestamp
    const reloadTs = sessionStorage.getItem("gm_deployment_reload");
    if (reloadTs) {
      const elapsed = Date.now() - Number(reloadTs);
      if (elapsed < 10000) {
        localStorage.setItem("gm_deployment_reload_active", "true");
        setTimeout(() => localStorage.removeItem("gm_deployment_reload_active"), 5000);
      }
      sessionStorage.removeItem("gm_deployment_reload");
    }

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      clearInterval(intervalId);
      clearTimeout(initialTimer);
    };
  }, [layer, checkForUpdate]);

  if (updateStatus === "updating") {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] px-5 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-sky-400/40 text-white shadow-2xl flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="relative flex items-center justify-center w-5 h-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-wider text-sky-400 uppercase">
            Pembaruan Sistem
          </span>
          <span className="text-sm font-medium text-slate-100">
            Versi terbaru dari pengembang sedang dimuat ulang...
          </span>
        </div>
      </div>
    );
  }

  if (updateStatus === "deferred") {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] max-w-md w-[92vw] px-4 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-amber-400/40 text-white shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-amber-300">Pembaruan Tersedia</p>
            <p className="text-slate-300 text-[11px]">
              Sistem akan memuat ulang setelah Anda menyelesaikan ujian.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => executeReload(deferredVersion || undefined)}
          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition-all active:scale-95 shrink-0"
        >
          Perbarui
        </button>
      </div>
    );
  }

  return null;
}
