# Implementation Plan

1. **Update `app/layout.tsx`**
   - Change `h-screen overflow-hidden` to `h-[100dvh] overflow-hidden` on the `body` tag.

2. **Update `app/page.tsx`**
   - Replace `<div className="h-screen ...">` with `h-[100dvh]`.
   - Update File list close/delete buttons to have a minimum touch target (`min-w-[32px] min-h-[32px]` or `w-8 h-8`).
   - Add a fixed/sticky header or prominent close button to the top of the mobile Workspace drawer (when `workspaceOpen` is true).
   - Add `pb-[env(safe-area-inset-bottom)]` to the Input bar container.

3. **Update `app/globals.css`**
   - If necessary, tweak any custom scrollbar CSS so it's less intrusive on mobile.
