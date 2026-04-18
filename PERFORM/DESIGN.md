# Design Specification: Performance Analytics (PERFORM)

## 1. Domain Overview
The Performance module handles complex data visualization (Recharts), statistics (Mean, Standard Deviation), and long-term academic tracking. The goal is to make data look like a premium financial dashboard, not a basic spreadsheet.

## 2. Visualization Aesthetics
*   **Chart Palettes:** 
    *   Do not use default Recharts colors. 
    *   Primary Data Line: `primary` (#f9f9f9) with a drop shadow.
    *   Comparison/Secondary Data: `outline` or `surface_bright` with dashed strokes.
    *   Area Gradients: Under a line chart, use a gradient from `primary/20` to `transparent` at the bottom.
*   **Tooltip Design:** Overwrite default tooltips with `surface_container_highest`, `rounded-lg`, and `body-sm` typography. Remove borders.

## 3. Typography & Data Presentation
*   **Key Metrics:** Use `display-lg` for large focal numbers (e.g., Class Average). 
*   **Statistical Explanations:** Use `on_surface_variant` for small technical context (e.g., "σ = 1.2").

## 4. Components
*   **Stat Cards:** Use `surface_container` with a subtle 15-degree metallic gradient effect (`linear-gradient(to right bottom, ...)`) for the most important metrics.
*   **Data Scaffolding:** No hard grid lines on charts. Use only horizontal origin lines painted with `surface_bright`.