# Design Specification: Primary Student Card (card)

## 1. Domain Overview
The Student Card is the foundational UI component that represents an individual student's identity across the entire OS. It must be perfectly legible, dense yet breathable, and highly interactive.

## 2. Geometry & Spacing
*   **Border Radius:** Strictly `1.5rem` (`rounded-xl`) to maintain the "Native Mobile OS" DNA.
*   **Padding:** An asymmetrical approach—`p-5` on the container, but a tighter `gap-2` for internal flex layouts.
*   **Elevation:** Default to `surface_container`. On hover/active, transition smoothly to `surface_bright`. No structural borders unless using the 15% opacity "Ghost Border".

## 3. Typography
*   **Name:** `headline-sm` for authority. Let it wrap naturally on narrow screens.
*   **Meta (NISN/Class):** `label-sm` with `on_surface_variant` color and 0.05em letter spacing. uppercase.
*   **Leading Metrics:** If the card displays a primary grade, use `display-md` pinned to the trailing edge (right side).

## 4. Composition Rules
*   **Avatar Integration:** If using an avatar, let it assert its space. 
*   **Micro-interactions:** Tapping the card should reveal a `shadow-2xl` depth effect before routing to the detail sheet.
*   **Zero-Line Principle:** Never separate the left identity group from the right metrics group with a vertical line. Use flexible whitespace (`justify-between`).