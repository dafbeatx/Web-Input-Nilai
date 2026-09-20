"use client";

import React from "react";
import GradeMaster from "@/components/GradeMaster";

/**
 * GradeMaster OS - Simplified Root Entry point.
 * Removed launcher grid to prioritize GradeMaster application focus.
 */
export default function GradeMasterOS() {
  return (
    <>
      <div className="bg-grid absolute inset-0 opacity-20 pointer-events-none -z-10"></div>
      <GradeMaster />
    </>
  );
}

