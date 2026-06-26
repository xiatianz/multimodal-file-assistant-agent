# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the DocFlix UI to achieve a modern SaaS bento-grid experience with refined neumorphism accents, resolving light/dark contrast and hover bugs.

**Architecture:** We will adjust global CSS custom utility properties, refactor page-level class layouts to drop unnecessary scale classes, and refine text readability classes without changing core Next.js state or API handler bindings.

**Tech Stack:** Next.js, React, Tailwind CSS

---

### Task 1: Clean Up globals.css Theme Custom Tokens

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace neumorphic CSS helper variables**

Change the custom theme tokens in `app/globals.css` to use smoother colors:
```css
:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --card-bg: #ffffff;
  --border-color: #e2e8f0;
  --shadow-dark: rgba(15, 23, 42, 0.04);
  --shadow-light: rgba(15, 23, 42, 0.02);
}

.dark {
  --background: #07080c;
  --foreground: #f8fafc;
  --card-bg: #0f111a;
  --border-color: #1e293b;
  --shadow-dark: rgba(0, 0, 0, 0.5);
  --shadow-light: rgba(0, 0, 0, 0.25);
}
```

- [ ] **Step 2: Redesign .nm-flat, .nm-pressed, and .nm-button classes**

Update the shadow, scale, hover, active, and outline styles inside `app/globals.css` to make them clean and border-oriented. Let cards stand flat with crisp borders, using inset shadows only for well-designed input boxes or upload zones.

- [ ] **Step 3: Run dev server to check CSS compiles without errors**

Run: `bun run build` to verify there are no postcss/css compilation issues.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "style: refine theme tokens and flat card classes in globals.css"
```

---

### Task 2: Refactor page.tsx UI Details and Fix Contrast Issues

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Clean up shadow and card hover scaling**

Scan `app/page.tsx` and strip out `hover:scale-[1.01]` from cards (e.g. sample lists, main file card details, chat bubbles, suggested command boxes) to stabilize the layout. Instead, use background color shifts or border color highlights (`group-hover:border-blue-500/50`).

- [ ] **Step 2: Correct contrast bug in suggestion panels**

Fix the `dark:text-gray-205` typo to a valid color like `dark:text-gray-300`, and replace `dark:text-gray-450` with `dark:text-gray-400` to guarantee accessibility compliant contrast.

- [ ] **Step 3: Test build**

Verify the Next.js bundle compiles clean.
Run: `bun run build`
Expected: Successful static page export.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "style: fix suggestion cards contrast bug and strip layout scaling jitter"
```
