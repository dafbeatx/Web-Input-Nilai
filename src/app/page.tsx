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
    <>
      <DeploymentGuard />
      <div className="bg-grid absolute inset-0 opacity-20 pointer-events-none -z-10"></div>
      <GradeMaster />
    </>
  );
}
