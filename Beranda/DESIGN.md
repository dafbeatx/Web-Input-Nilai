# Design System Specification: High-End Editorial Education

## 1. Overview & Creative North Star
### The Creative North Star: "The Intellectual Sanctuary"
This design system rejects the "cluttered classroom" aesthetic of traditional education software. Instead, it adopts the persona of a **high-end digital gallery or an architectural studio**. It is designed to foster deep focus, clarity, and a sense of academic prestige.

To move beyond the "SaaS template" look, we employ **Intentional Asymmetry**. We break the rigid 12-column grid by using generous, "unbalanced" whitespace—for example, aligning hero text to the far left while leaving the right third of the screen entirely empty to allow the user’s mind to breathe. Elements should feel like they are floating on a limitless canvas rather than being boxed into a browser window.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a "Pure White" philosophy, using the Deep Navy (`primary`) not just as a color, but as an authoritative weight.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. Boundaries must be defined solely through:
1.  **Background Shifts:** Transitioning from `surface` (#f7f9fb) to `surface-container-low` (#f2f4f6).
2.  **Generous White Space:** Using a minimum of 64px–128px of vertical space to separate content blocks.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium cardstock. 
*   **The Foundation:** Use `surface_container_lowest` (#ffffff) for the main page background to maintain the "Bright" requirement.
*   **The Content Layer:** Use `surface_container_low` (#f2f4f6) for large section backgrounds to create a subtle recessed look.
*   **The Action Layer:** Floating cards or modals should use `surface` with a `surface_tint` at 2% to give them a slight "glow" against the white background.

### The "Glass & Gradient" Rule
To achieve "Linear-level" polish, use glassmorphism for navigation bars and floating action menus. 
*   **Token:** `surface` at 80% opacity with a `20px` backdrop blur.
*   **Signature Texture:** Use a subtle linear gradient on primary CTAs: `primary` (#0F172A) to `primary_container` (#131B2E) at a 135-degree angle. This prevents buttons from looking "flat" and adds a tactile, ink-like depth.

---

## 3. Typography: The Editorial Voice
We use **Inter** for its mathematical precision. The hierarchy is designed to feel like a modern academic journal.

*   **Display (lg/md):** Reserved for high-impact landing moments. Use `letter-spacing: -0.04em` and `font-weight: 600`. This creates a tight, "locked-in" professional look.
*   **Headlines:** Always in `on_primary_fixed` (#131B2E). The high contrast against the pure white background is the primary driver of the "High-End" feel.
*   **Body (md/lg):** Use `on_surface_variant` (#45464D) for long-form reading to reduce eye strain, while maintaining `body-lg` (1rem) as the default to ensure an accessible, premium feel.
*   **Labels:** Always uppercase with `+0.05em` tracking. This differentiates "data" from "content."

---

## 4. Elevation & Depth
Depth in this system is an atmospheric quality, not a structural one.

### The Layering Principle
Do not use shadows to define cards. Instead, place a `surface_container_lowest` card on top of a `surface_container` background. The slight shift in hex value is enough for the human eye to perceive a change in plane without the visual noise of a shadow.

### Ambient Shadows
Where floating elements (Modals, Popovers) are required:
*   **Blur:** 40px to 60px.
*   **Opacity:** 4%–6%.
*   **Color:** Use a tinted shadow (`#0F172A` at 5% opacity) rather than pure black. This makes the shadow feel like a natural reflection of the deep navy primary color.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in high-contrast modes):
*   Use `outline_variant` (#c6c6cd) at **15% opacity**.
*   It should be barely visible—a "suggestion" of a boundary rather than a hard stop.

---

## 5. Components

### Buttons: The Tactile Anchor
*   **Primary:** Deep Navy gradient. `border-radius: xl` (0.75rem). No border.
*   **Secondary:** `surface_container_high` background with `on_surface` text. This feels like it’s "etched" into the page.
*   **Tertiary:** Ghost style. Text only, shifting to `surface_container_low` on hover.

### Cards & Lists: No Dividers
*   **Rule:** Forbid the use of horizontal divider lines. 
*   **Implementation:** Use a `12px` gap between list items and give each item a very subtle `surface_container_low` background on hover. For static lists, use the Spacing Scale (24px+) to define rows.

### Input Fields: Minimalist Focus
*   **Static State:** No border. Background is `surface_container_high`.
*   **Focus State:** A 2px "Ghost Border" using `primary` at 20% opacity and a subtle 4px outer glow of the same color.

### Sophisticated Success/Warning States
*   **Success:** Use `secondary` (Emerald Teal) for typography and icons, but use `secondary_container` at 10% opacity for the background. It should feel like a "wash" of color, not a bright block.
*   **Warning:** Use `tertiary` (Amber) using the same "wash" principle.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins (e.g., 10% left margin, 20% right margin) to create an editorial layout.
*   **Do** use "Optical Sizing." If a headline is large, decrease the letter spacing.
*   **Do** embrace the "empty" space. If a page feels empty, it is likely working.

### Don’t
*   **Don’t** use `primary` (#0F172A) for large background blocks. It is too heavy. Use it only for text, CTAs, and small accents.
*   **Don’t** use 100% black (#000000). It breaks the "calming" aesthetic. Use the Deep Navy for all "dark" elements.
*   **Don’t** use standard 4px or 8px "Drop Shadows" from a UI kit. They look cheap. Stick to the Ambient Shadow spec.
*   **Don’t** use icons with varying line weights. All icons must be "Light" or "Thin" weight to match the Inter typography.

---

## 7. Designer's Note on Polish
The difference between "Standard" and "Apple-level" is in the transitions. When a user hovers over a card, do not just change the color—animate the `surface-container` shift over 300ms using a `cubic-bezier(0.4, 0, 0.2, 1)` easing. The UI should feel like it is reacting to the user's touch with fluid, organic grace.