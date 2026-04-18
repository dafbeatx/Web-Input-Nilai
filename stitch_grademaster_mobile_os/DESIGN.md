# Design Specification: Mobile-First Subsystem (stitch_grademaster_mobile_os)

## 1. Domain Overview
This domain defines the core "Native OS" wrapper. GradeMaster must operate, feel, and flow like an iOS/Android native app, packaged as an optimized PWA targeting mobile context first.

## 2. Navigational Architecture
*   **Bottom Navigation Bar (The Dock):**
    *   Must use glassmorphism: `surface_container/80` background, `backdrop-blur-xl`.
    *   Padding bottom must account for `env(safe-area-inset-bottom)` to avoid colliding with device home indicators.
*   **Top App Bar:**
    *   Clean, zero-border. Transitions to an opaque `surface` when scrolled.

## 3. Motion & Routing
*   **Transitions:** Route changes should utilize Next.js layout animations (Framer Motion recommended if expanded).
*   **Slide-Up Sheets:** Modals shouldn't pop; they should slide from the bottom up, with a 32x4px handle at the top (`rounded-t-xl`).

## 4. Global Layering
*   **Base:** `background` (#0e0e10).
*   **Overlays:** Any darkened backdrop behind a modal must use pure black at 40-60% opacity with a `backdrop-blur-sm` to draw intense focus to the modal (`surface_container_highest`).
*   **Touch Targets:** All interactive areas (buttons, cards) must be at least 44x44px. Do not design purely for cursor precision.