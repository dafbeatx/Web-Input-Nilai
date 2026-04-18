# Design Specification: Behavioral Tracking (behaviour)

## 1. Domain Overview
The Behavior module tracks student conduct, merits, and demerits. It requires an interface that allows for rapid, frictionless point attribution (both positive and negative) during active class sessions.

## 2. Surface & Color Implementation
*   **Merit (Positive):** Use `tertiary` (#9bffce) for positive behavioral attributes. 
*   **Demerit (Negative):** Use a constrained `warning_amber` or a muted `error` for demerits. Avoid overwhelming the UI with red.
*   **Score Aggregation:** The total behavior score should sit elegantly on the student card without competing with the academic grade. 

## 3. Typography & Micro-copy
*   **Actionable Verbs:** Labels should use `label-md` and strong action verbs (e.g., "ADD MERIT", "RECORD DEMERIT").
*   **Event Log:** Use `body-sm` for historical logs to maintain a clean aesthetic, even when a student has many incidents. 

## 4. Components & Interactions
*   **Quick-Action Buttons:** High-contrast `surface_bright` chips that represent common behavioral tags (e.g., "Helpful", "Late", "Disruptive"). They should have active tap states.
*   **Behavior Detail Modal:** A `shadow-2xl` floating modal that lists chronological events. Use vertical padding (12px) without explicit horizontal line dividers between log entries.
