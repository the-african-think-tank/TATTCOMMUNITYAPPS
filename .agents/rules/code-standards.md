# Code Standards & AI Guidelines for TATT Community Apps

## 1. Frontend UX & Cursor Feedback Standards
- Interactive elements (`<button>`, `<Link>`, clickable containers, tab switches, dropdown options, close icons, modal overlays) **MUST** have explicit pointer cursor styles: `cursor-pointer`.
- Disabled elements **MUST** style disabled states clearly: `disabled:cursor-not-allowed disabled:opacity-50`.
- Include active/pressed micro-interactions (`active:scale-95`), hover state transitions (`hover:... transition-all`), and focus outlines (`focus:outline-none focus:ring-2`).

## 2. Modern Syntax & Readability First
- Always use recent, modern TypeScript/JavaScript syntax (`?.`, `??`, modern array methods, async/await, modern React 19/Next 16 idioms).
- Code must be clean, modern, self-documenting, and easy to read. Avoid obsolete patterns or cryptic code structures.

## 3. Clean Code, Modularity & Composability
- Keep files lean and composable. Avoid monolithic files with excessive code.
- Decompose complex UI pages or services into smaller, single-responsibility sub-components, custom hooks, or helper modules.

## 4. Check Before Creating (Reuse First)
- Always search the codebase before creating new helpers, utilities, UI elements, or models to see if a suitable implementation already exists.
- Leverage pre-existing components in `frontend/src/components` and shared utility modules.

## 5. Git Operations Protocol
- Do **NOT** execute `git push` or `git commit` unless explicitly instructed to do so in the user request prompt.

## 6. Package Manager & CLI Tools
- Always use `pnpm` for installing packages and running scripts.
- Root Makefile commands provide shortcut aliases (`make dev`, `make install-all`, `make db-deploy`).

## 7. Frontend & Backend Quality
- **Frontend (Next.js)**: Use TATT brand tokens (`tatt-lime`, `tatt-black`, `tatt-gray`, `surface`, `border`). Clean empty/loading state handling.
- **Backend (NestJS)**: Standard NestJS modules, DTO validation with `class-validator`, clean error handling using NestJS HTTP exceptions.
- **Verification**: Run `pnpm build` or `pnpm test` in `frontend/` or `server/` after non-trivial modifications.
