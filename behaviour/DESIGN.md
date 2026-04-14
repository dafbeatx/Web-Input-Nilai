# Design System Specification: Editorial Mobile-First Excellence

## 1. Overview & Creative North Star
**The Creative North Star: "The Academic Sanctuary"**

This design system rejects the cluttered, "dashboard-heavy" aesthetic of traditional educational software. Instead, it embraces an **Editorial Sanctuary**—a high-end, mobile-first environment that feels like a premium native OS. We move beyond the "template" look by utilizing intentional asymmetry, deep tonal layering, and "breathing room" that allows data to feel curated rather than merely displayed. 

By leveraging a charcoal-heavy palette and sophisticated typography, we transform "grading" into a high-focus, meditative experience. The goal is to make the educator feel they are using a precision tool, not a spreadsheet.

---

## 2. Colors & Surface Philosophy

### The Tonal Hierarchy
We use a "True Dark" foundation. Our palette doesn't rely on lines to separate ideas; it relies on the physical properties of light and depth.

*   **Foundation:** `background` (#0e0e10) serves as the infinite canvas.
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. To separate content, use background shifts. Place a `surface_container_high` card on a `surface` background. If you need more distinction, use white space—never a line.
*   **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of obsidian glass.
    *   *Level 0:* `surface_container_lowest` (Pure black #000000) for recessed areas.
    *   *Level 1:* `surface` (#0e0e10) for main app backgrounds.
    *   *Level 2:* `surface_container` (#19191c) for primary content cards.
    *   *Level 3:* `surface_bright` (#2c2c2f) for interactive elements or floating action items.
*   **The "Glass & Gradient" Rule:** Main CTAs and student highlight cards should utilize a subtle linear gradient from `primary` (#f9f9f9) to `primary_container` (#a0a1a1) at a 15-degree angle to provide a metallic, premium "shimmer."

---

## 3. Typography: Editorial Authority
We pair **Manrope** (Display/Headlines) with **Inter** (Body/Labels) to create a "Technical Editorial" feel. Manrope provides a modern, geometric authority, while Inter ensures maximum legibility at small mobile scales.

*   **Display (Manrope):** Use `display-lg` for grade averages or "Big Wins." Use high-contrast sizing (e.g., a massive `display-md` next to a tiny `label-sm`) to create an intentional, non-template look.
*   **Headline (Manrope):** `headline-sm` (1.5rem) should be used for student names in detail sheets.
*   **Body (Inter):** `body-md` (0.875rem) is our workhorse. Use `on_surface_variant` (#adaaad) for secondary body text to maintain a soft hierarchy.
*   **Labels (Inter):** `label-md` must be used for all "metadata" (e.g., "Date Submitted"). It should be uppercase with a 0.05em letter spacing to feel "designed."

---

## 4. Elevation & Depth: The Layering Principle
Depth is conveyed through **Tonal Layering**, not structural shadows.

*   **Ambient Shadows:** For floating slide-up sheets (modals), use a "Long Shadow" approach: `shadow-2xl` with an opacity of 6% using the `on_surface` color. It should feel like an object casting a shadow in a dim room, not a digital drop shadow.
*   **The "Ghost Border" Fallback:** If accessibility requires a border (e.g., in high-glare environments), use the `outline_variant` token at **15% opacity**. This creates a "hairline" feel that disappears into the background.
*   **Glassmorphism:** Bottom navigation bars and Top App Bars must use `surface_container/80` with a `backdrop-blur-xl`. This allows student data to scroll behind the navigation, maintaining a sense of place and depth.

---

## 5. Components

### Buttons & Interaction
*   **Primary:** High-contrast `primary` background with `on_primary_container` text. Border radius must be `1rem` (`rounded-xl`).
*   **Tertiary (The "Ghost"):** No background. Use `primary` text. These are for low-emphasis actions like "Cancel."
*   **Chips:** Use `secondary_container` for inactive states and `tertiary` (#9bffce) for "Success/Passing" statuses. No borders; use `rounded-full`.

### Student Slide-Up Sheets (Modals)
*   **Styling:** Background should be `surface_container_highest`. 
*   **Handle:** A centered 32x4px bar in `outline` color with 50% opacity at the top.
*   **Radius:** Top-left and Top-right must be `1.5rem` (`rounded-t-xl`).

### Inputs & Fields
*   **The "Soft Box":** Inputs should use `surface_container_low`. When focused, they transition to `surface_bright` with a `ghost-border` of the `primary` color. 
*   **Labels:** Floating labels are discouraged. Use `label-md` pinned 8px above the input field for an editorial, clean-top look.

### Cards & Lists
*   **The Rule of Zero Dividers:** Never use a horizontal line between list items. Use 12px of vertical padding and a subtle `surface_container` background on alternating items, or simply rely on typography hierarchy to define where one record ends and the next begins.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use `tertiary` (#9bffce) sparingly for positive reinforcement (e.g., "On Track").
*   **Do** respect the safe areas. The bottom navigation must have a bottom padding of `env(safe-area-inset-bottom)` plus 12px.
*   **Do** use intentional asymmetry. A student's profile photo can "break" the container of a card to create visual interest.

### Don't:
*   **Don't** use pure #ffffff for body text. It causes "halation" (visual vibrating) on dark backgrounds. Use `on_surface` (#f9f5f8).
*   **Don't** use standard 4px or 8px corners. Every container must be `rounded-lg` (1rem) or `rounded-xl` (1.5rem) to maintain the "Native Mobile" DNA.
*   **Don't** use heavy "remedial red" for everything negative. Use `error` (#ff6e84) only for critical failures; use `warning_amber` for "Needs Attention."

---

## 7. Tailwind Configuration Reference