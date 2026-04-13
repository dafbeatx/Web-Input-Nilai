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
        "on-tertiary": "#006443",
        "surface-container-high": "#1f1f22",
        "error-container": "#a70138",
        "on-primary-fixed": "#434545",
        "surface-container-lowest": "#000000",
        "primary-container": "#a0a1a1",
        "on-primary": "#5e5f60",
        "inverse-on-surface": "#565457",
        "surface-dim": "#0e0e10",
        "inverse-primary": "#5e5f60",
        "on-surface": "#f9f5f8",
        "on-background": "#f9f5f8",
        "on-tertiary-container": "#005a3c",
        "inverse-surface": "#fcf8fb",
        "secondary-container": "#47464a",
        "on-secondary": "#525155",
        "on-primary-container": "#212323",
        "surface-container": "#19191c",
        "tertiary-fixed-dim": "#58e7ab",
        "surface-tint": "#f9f9f9",
        "on-tertiary-fixed-variant": "#006544",
        "surface-bright": "#2c2c2f",
        "surface": "#0e0e10",
        "on-tertiary-fixed": "#00452d",
        "on-surface-variant": "#adaaad",
        "primary-fixed": "#ebebeb",
        "primary-fixed-dim": "#dcdddd",
        "secondary-fixed-dim": "#d6d3d7",
        "background": "#0e0e10",
        "outline-variant": "#48474a",
        "on-error-container": "#ffb2b9",
        "on-secondary-container": "#d2cfd3",
        "tertiary-container": "#69f6b8",
        "on-error": "#490013",
        "surface-container-highest": "#262528",
        "on-secondary-fixed-variant": "#5c5b5e",
        "on-primary-fixed-variant": "#5f6161",
        "error": "#ff6e84",
        "primary": "#2dd4bf",
        "secondary-fixed": "#e4e1e5",
        "on-secondary-fixed": "#3f3f42",
        "tertiary-fixed": "#69f6b8",
        "surface-variant": "#262528",
        "surface-container-low": "#131315",
        "tertiary": "#9bffce",
        "secondary": "#e4e1e5",
        "outline": "#767577",
        "analysis-primary": "#0040e0",
        "analysis-surface": "#0f172a",
        "analysis-on-surface": "#f8fafc",
        "analysis-on-surface-variant": "#94a3b8",
        "analysis-surface-container-low": "#1e293b",
        "analysis-surface-container-highest": "#e0e3e5",
        "analysis-outline-variant": "rgba(148, 163, 184, 0.15)",
        "primary-dim": "#ebebeb",
        "error-dim": "#d73357",
        "secondary-dim": "#d6d3d7",
        "tertiary-dim": "#58e7ab"
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
  "plugins": [],
  "darkMode": "class"
};
