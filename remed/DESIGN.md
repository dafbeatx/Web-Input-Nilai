# Design Specification: Remedial Management (remed)

## 1. Domain Overview
The Remedial module handles the workflow for students who have not met the passing criteria (KKM). The UI must communicate "Action Required" without inducing panic, adhering to our "Academic Sanctuary" principles.

## 2. Surface & Color Implementation
*   **Status Indicators:** Use `warning_amber` and `error` (#ff6e84) strictly for critical failures that require immediate remediation. Once a remedial task is submitted, transition the state to `tertiary` (#9bffce) to signal progress.
*   **Remedial Action Card:** A `surface_container_high` card with an `outline_variant` border at 15% opacity. We do not use aggressive red borders.
*   **The "Recovery" Gradient:** When a student successfully improves their grade through remediation, use a micro-animation or a subtle `primary` to `tertiary` gradient on the grade label.

## 3. Typography
*   **Grade Deficit:** Use `display-sm` for the score, paired with a `label-md` "DEFICIT" explicitly stating the points needed to pass.
*   **Remedial Instructions:** Use `body-md` with `on_surface_variant` for guidelines. It must be highly legible and unambiguous.

## 4. Components & Interactions
*   **Remedy Slide-Up Sheet:** When a teacher taps a failing grade, open a `surface_container_highest` sheet with options to assign a remedial task or directly override the score.
*   **Progress Chips:**
    *   *Status: pending* -> `secondary_container`
    *   *Status: reviewed* -> `surface_bright`
    *   *Status: resolved* -> `tertiary` (no border, `rounded-full`)
