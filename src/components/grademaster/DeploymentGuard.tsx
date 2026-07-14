"use client";

import { useEffect } from "react";

export default function DeploymentGuard() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message || "";
      const isChunkError =
        msg.includes("ChunkLoadError") ||
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed");

      if (isChunkError) {
        event.preventDefault();
        sessionStorage.setItem("gm_deployment_reload", Date.now().toString());
        window.location.reload();
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
        sessionStorage.setItem("gm_deployment_reload", Date.now().toString());
        window.location.reload();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    // On mount: if this was a deployment reload, clear the flag
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
    };
  }, []);

  return null;
}
