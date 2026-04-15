/** @type {import('tailwindcss').Config} */
module.exports = {
  "content": [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  "theme": {
    "extend": {
      "colors": {
        "primary": "#2563eb",
        "on-primary": "#ffffff",
        "primary-container": "#dbeafe",
        "on-primary-container": "#1e3a8a",
        "primary-fixed": "#bfdbfe",
        "primary-fixed-dim": "#93c5fd",
        "on-primary-fixed": "#1e40af",
        "on-primary-fixed-variant": "#1d4ed8",
        "primary-dim": "#3b82f6",

        "secondary": "#475569",
        "on-secondary": "#ffffff",
        "secondary-container": "#f1f5f9",
        "on-secondary-container": "#0f172a",
        "secondary-fixed": "#e2e8f0",
        "secondary-fixed-dim": "#cbd5e1",
        "on-secondary-fixed": "#0f172a",
        "on-secondary-fixed-variant": "#334155",
        "secondary-dim": "#64748b",

        "tertiary": "#0ea5e9",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#e0f2fe",
        "on-tertiary-container": "#075985",
        "tertiary-fixed": "#bae6fd",
        "tertiary-fixed-dim": "#7dd3fc",
        "on-tertiary-fixed": "#082f49",
        "on-tertiary-fixed-variant": "#0369a1",
        "tertiary-dim": "#38bdf8",

        "background": "#f8fafc",
        "on-background": "#0f172a",
        "surface": "#ffffff",
        "surface-dim": "#f1f5f9",
        "surface-bright": "#ffffff",
        "surface-tint": "#f8fafc",
        "on-surface": "#0f172a",
        "on-surface-variant": "#475569",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f8fafc",
        "surface-container": "#ffffff",
        "surface-container-high": "#f1f5f9",
        "surface-container-highest": "#e2e8f0",
        "surface-variant": "#f1f5f9",

        "outline": "#cbd5e1",
        "outline-variant": "#e2e8f0",

        "error": "#ef4444",
        "on-error": "#ffffff",
        "error-container": "#fee2e2",
        "on-error-container": "#991b1b",
        "error-dim": "#dc2626",

        "inverse-surface": "#0f172a",
        "inverse-on-surface": "#f8fafc",
        "inverse-primary": "#60a5fa",

        "analysis-primary": "#2563eb",
        "analysis-surface": "#ffffff",
        "analysis-on-surface": "#0f172a",
        "analysis-on-surface-variant": "#475569",
        "analysis-surface-container-low": "#f8fafc",
        "analysis-surface-container-highest": "#e2e8f0",
        "analysis-outline-variant": "rgba(148, 163, 184, 0.15)"
      },
      "fontFamily": {
        "sans": [
          "var(--font-inter)",
          "sans-serif"
        ],
        "outfit": [
          "var(--font-outfit)",
          "sans-serif"
        ],
        "manrope": [
          "var(--font-manrope)",
          "sans-serif"
        ],
        "amiri": [
          "var(--font-amiri)",
          "serif"
        ],
        "headline": [
          "var(--font-manrope)",
          "sans-serif"
        ],
        "body": [
          "var(--font-inter)",
          "sans-serif"
        ],
        "label": [
          "var(--font-inter)",
          "sans-serif"
        ]
      },
      "backgroundImage": {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))"
      }
    }
  },
  "plugins": []
};
