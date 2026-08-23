---
name: tatt-frontend-dev
description: >-
  Workflow guide for developing Next.js frontend pages and components in TATT Community Apps.
  Use when creating or modifying UI components, pages under src/app/dashboard/, styling, or connecting API calls.
---

# TATT Frontend Development Guide

Guide for developing Next.js App Router pages and UI components within `frontend/`.

## Core Principles

1. **UX & Cursor Standards**: Ensure all interactive elements (`<button>`, `<Link>`, click handlers, overlays, tabs) explicitly include `cursor-pointer` (or `disabled:cursor-not-allowed disabled:opacity-50` when disabled). Add smooth hover and active feedback (`active:scale-95`, `transition-all`).
2. **Modern Syntax & High Legibility**: Write modern TypeScript / React 19 / Next.js 16 code. Use up-to-date syntax (`?.`, `??`, modern React hooks, async/await). Keep logic clear and readable.
3. **Modularity & Composability**: Keep page components lean. Extract complex card layouts, modals, or filter UI into small sub-components inside `frontend/src/components/`.
4. **Check Before Creating**: Always search `frontend/src/components/` and `frontend/src/services/` to verify if a component, hook, or API helper already exists.
5. **No Unrequested Git Operations**: Never run `git commit` or `git push` unless specifically requested by the user.

## Styling & Design Tokens

Use Tailwind CSS classes styled after the TATT brand identity:

- `bg-tatt-black` / `text-white` - Main dark background / light text
- `bg-tatt-lime` / `text-tatt-black` - Accent buttons and highlighted badges
- `bg-surface` - Container background for cards and list items
- `border-border` - Standard subtle dark borders
- `text-tatt-gray` - Subtitles, metadata, muted descriptions

## Standard Component Patterns

1. **Icons**: Use icons from `lucide-react`.
2. **API Communication**: Import `api` from `@/services/api`.
3. **Empty States**: If data list is empty after loading finishes, hide the section container completely unless an explicit empty callout is required.
4. **Build Verification**: Run `pnpm build` in `frontend/` to verify layout and TypeScript correctness.
