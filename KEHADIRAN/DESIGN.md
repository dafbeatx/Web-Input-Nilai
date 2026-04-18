# Design Specification: Attendance Tracking (KEHADIRAN)

## 1. Domain Overview
The Attendance module is designed for rapid, high-volume data entry at the start of a class. It must be zero-friction and support batch operations while adhering to our Editorial Mobile-First aesthetics.

## 2. Status Colors
We deviate slightly from the monochromatic theme to provide instant visual scanning for presence status:
*   **Hadir (Present):** Neutral. Relies on the default `surface_container_low` background with standard `on_surface` text.
*   **Izin / Sakit (Excused):** `warning_amber`. Soft and informative, never aggressive.
*   **Alpa (Absent):** A muted `error` accent (not full red background) to indicate missing without causing visual fatigue.

## 3. Typography
*   **Time & Date:** Use `label-md` prominently at the top of the session.
*   **Student Counts:** `display-sm` for the summary (e.g., "32/34 Present").

## 4. Components & Interactions
*   **The Zero-Divider Roster:** A vertical list of students where tapping cycles through statuses (Present -> Sick -> Absent) with Haptic Feedback.
*   **Batch Action Chips:** Use `secondary_container` chips for actions like "Mark All Present."
*   **Glassmorphism Sticky Summary:** The bottom bar showing the total attendance count must use `surface_container/80` with `backdrop-blur-xl` so the roster scrolls smoothly underneath.