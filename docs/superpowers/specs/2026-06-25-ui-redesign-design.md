# DocFlix UI Redesign Spec

This spec defines the visual improvements for the DocFlix Multimodal Assistant workspace, focusing on moving away from heavy skeuomorphic/neumorphic effects toward a clean, professional, and accessible SaaS bento-grid dashboard in both light and dark mode.

## 1. Aesthetic Improvements

- **Neumorphism Retraction:** Soften all `.nm-flat`, `.nm-pressed`, and `.nm-button` shadows. Replace harsh double shadows with single fine shadows.
- **Color Transitions:** Use refined backgrounds. Light mode uses soft slate-50 (`#f8fafc`); dark mode uses high-contrast charcoal black (`#090a0f`) to avoid overly saturated blue glow.
- **Micro-interactivity:** Remove jarring `hover:scale-[1.01]` or scale-downs on static UI cards to prevent layout shifts. Apply them only to primary buttons.
- **Accessibility Fix:** Clean up dark mode contrast bugs (e.g. `dark:text-gray-205` typo in suggestion cards, wrong gray scale mappings).

## 2. Global Styles (app/globals.css)

- `--background`: Light `#f8fafc`, Dark `#07080c`
- `--card-bg`: Light `#ffffff`, Dark `#0f111a`
- `--border-color`: Light `#e2e8f0`, Dark `#1e293b`
- Reduce `.nm-flat` box-shadow to custom subtle shadows.
- Keep `.nm-pressed` as inset backgrounds but make them less muddy in light mode.

## 3. Main Workspace Layout (app/page.tsx)

- Update suggestion tiles structure: replace harsh borders, apply hover color transition instead of scale-up.
- Fix text visibility on files lists and processing steps: `dark:text-gray-450` replaced with `dark:text-gray-400`.
- Restore solid headers for both light and dark modes with proper semantic tags.
