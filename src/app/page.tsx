"use client";

import React from "react";
import GradeMaster from "@/components/GradeMaster";
import DeploymentGuard from "@/components/grademaster/DeploymentGuard";

/**
 * GradeMaster OS - Simplified Root Entry point.
 * Removed launcher grid to prioritize GradeMaster application focus.
 */
export default function GradeMasterOS() {
  return (
    <main className="relative min-h-screen bg-slate-50">
      <DeploymentGuard />
      <div className="bg-grid absolute inset-0 opacity-20 pointer-events-none"></div>
      
      {/* GradeMaster Component - Direct Interaction Layer */}
      <div className="relative z-10 animate-in fade-in duration-500">
        <GradeMaster />
      </div>
    </main>
  );
}
